import { DB, ErrorUsuario } from '../db/types';
import { ahoraLocal } from './fechas';
import { calcularReposicion, Estado, ResultadoReposicion } from './reposicion';

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  categoria_id: number;
  bodega: string | null;
  pais: string | null;
  region: string | null;
  anada: string | null;
  uva: string | null;
  tamano: string | null;
  proveedor_id: number | null;
  costo: number;
  precio: number;
  minimo: number;
  maximo: number | null;
  foto: string | null;
  notas: string | null;
  es_ejemplo: number;
  creado: string;
}

export interface ProductoResumen extends Producto, ResultadoReposicion {
  categoria: string;
  proveedor: string | null;
  total: number;
  transito: number;
}

export interface ProductoInput {
  id?: number | null;
  codigo: string;
  nombre: string;
  categoriaId: number | null;
  bodega?: string | null;
  pais?: string | null;
  region?: string | null;
  anada?: string | null;
  uva?: string | null;
  tamano?: string | null;
  proveedorId?: number | null;
  costo?: number | null;
  precio?: number | null;
  minimo: number | null;
  maximo?: number | null;
  foto?: string | null;
  notas?: string | null;
  esEjemplo?: boolean;
}

export interface ExistenciaUbicacion {
  ubicacion_id: number;
  nombre: string;
  activa: number;
  cantidad: number;
  minimo: number | null;
}

const txt = (v?: string | null) => (v && v.trim() ? v.trim() : null);

const esEnteroNoNegativo = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;

export async function guardarProducto(db: DB, p: ProductoInput): Promise<number> {
  const codigo = (p.codigo ?? '').trim();
  const nombre = (p.nombre ?? '').trim();
  if (!codigo) throw new ErrorUsuario('Falta el código del producto. Ej.: VT-001 (o escanea el código de barras).');
  if (!nombre) throw new ErrorUsuario('Falta el nombre del producto. Ej.: Marqués de Riscal Reserva');
  if (!p.categoriaId) throw new ErrorUsuario('Elige una categoría. Ej.: Tinto');
  if (!esEnteroNoNegativo(p.minimo)) {
    throw new ErrorUsuario('Escribe la existencia mínima (un número entero, 0 o más). Ej.: 6');
  }
  if (p.maximo != null && !esEnteroNoNegativo(p.maximo)) {
    throw new ErrorUsuario('La existencia máxima debe ser un número entero. Ej.: 24');
  }
  if (p.maximo != null && p.maximo > 0 && p.maximo < p.minimo) {
    throw new ErrorUsuario(`La existencia máxima (${p.maximo}) no puede ser menor que la mínima (${p.minimo}).`);
  }
  if ((p.costo ?? 0) < 0 || (p.precio ?? 0) < 0) throw new ErrorUsuario('El costo y el precio no pueden ser negativos.');

  const repetido = await db.first<{ nombre: string }>('SELECT nombre FROM productos WHERE codigo = ? AND id <> ?', [
    codigo,
    p.id ?? 0,
  ]);
  if (repetido) throw new ErrorUsuario(`El código ${codigo} ya lo usa "${repetido.nombre}". Cada producto necesita un código distinto.`);

  const valores = [
    codigo,
    nombre,
    p.categoriaId,
    txt(p.bodega),
    txt(p.pais),
    txt(p.region),
    txt(p.anada),
    txt(p.uva),
    txt(p.tamano),
    p.proveedorId ?? null,
    p.costo ?? 0,
    p.precio ?? 0,
    p.minimo,
    p.maximo && p.maximo > 0 ? p.maximo : null,
    txt(p.foto),
    txt(p.notas),
  ];

  if (p.id) {
    await db.run(
      `UPDATE productos SET codigo=?, nombre=?, categoria_id=?, bodega=?, pais=?, region=?, anada=?, uva=?, tamano=?,
       proveedor_id=?, costo=?, precio=?, minimo=?, maximo=?, foto=?, notas=? WHERE id=?`,
      [...valores, p.id],
    );
    return p.id;
  }
  const r = await db.run(
    `INSERT INTO productos (codigo, nombre, categoria_id, bodega, pais, region, anada, uva, tamano,
     proveedor_id, costo, precio, minimo, maximo, foto, notas, es_ejemplo, creado)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [...valores, p.esEjemplo ? 1 : 0, ahoraLocal()],
  );
  return r.lastInsertRowId;
}

export async function eliminarProducto(db: DB, id: number): Promise<void> {
  await db.tx(async () => {
    await db.run('DELETE FROM movimientos WHERE producto_id = ?', [id]);
    await db.run('DELETE FROM pedido_lineas WHERE producto_id = ?', [id]);
    await db.run('DELETE FROM existencias WHERE producto_id = ?', [id]);
    await db.run('DELETE FROM productos WHERE id = ?', [id]);
    // Pedidos que quedaron sin líneas
    await db.run('DELETE FROM pedidos WHERE id NOT IN (SELECT DISTINCT pedido_id FROM pedido_lineas)');
  });
}

export function obtenerProducto(db: DB, id: number): Promise<Producto | null> {
  return db.first<Producto>('SELECT * FROM productos WHERE id = ?', [id]);
}

export function buscarPorCodigo(db: DB, codigo: string): Promise<Producto | null> {
  return db.first<Producto>('SELECT * FROM productos WHERE codigo = ?', [codigo.trim()]);
}

/** Unidades pedidas que todavía no han llegado (pedidos en camino o recibidos en parte). */
export const SQL_TRANSITO = `
  SELECT l.producto_id, SUM(l.cantidad - l.recibida) AS transito
  FROM pedido_lineas l JOIN pedidos pe ON pe.id = l.pedido_id
  WHERE pe.estado IN ('en_camino', 'parcial') AND l.cantidad > l.recibida
  GROUP BY l.producto_id`;

export async function listarResumen(db: DB, productoId?: number): Promise<ProductoResumen[]> {
  const filas = await db.all<Producto & { categoria: string; proveedor: string | null; total: number; transito: number }>(
    `SELECT p.*, c.nombre AS categoria, pr.nombre AS proveedor,
       COALESCE(e.total, 0) AS total, COALESCE(t.transito, 0) AS transito
     FROM productos p
     JOIN categorias c ON c.id = p.categoria_id
     LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
     LEFT JOIN (SELECT producto_id, SUM(cantidad) AS total FROM existencias GROUP BY producto_id) e ON e.producto_id = p.id
     LEFT JOIN (${SQL_TRANSITO}) t ON t.producto_id = p.id
     ${productoId ? 'WHERE p.id = ?' : ''}
     ORDER BY p.nombre COLLATE NOCASE`,
    productoId ? [productoId] : [],
  );
  return filas.map((f) => ({
    ...f,
    ...calcularReposicion({ total: f.total, minimo: f.minimo, maximo: f.maximo, transito: f.transito }),
  }));
}

export async function obtenerResumen(db: DB, id: number): Promise<ProductoResumen | null> {
  const [r] = await listarResumen(db, id);
  return r ?? null;
}

export interface FiltrosInventario {
  texto?: string;
  categoriaId?: number | null;
  ubicacionId?: number | null;
  proveedorId?: number | null;
  estado?: Estado | null;
}

export async function buscarInventario(db: DB, f: FiltrosInventario): Promise<ProductoResumen[]> {
  let lista = await listarResumen(db);
  const t = f.texto?.trim().toLowerCase();
  if (t) {
    lista = lista.filter(
      (p) =>
        p.codigo.toLowerCase().includes(t) ||
        p.nombre.toLowerCase().includes(t) ||
        (p.bodega ?? '').toLowerCase().includes(t),
    );
  }
  if (f.categoriaId) lista = lista.filter((p) => p.categoria_id === f.categoriaId);
  if (f.proveedorId) lista = lista.filter((p) => p.proveedor_id === f.proveedorId);
  if (f.estado) lista = lista.filter((p) => p.estado === f.estado);
  if (f.ubicacionId) {
    const ids = await db.all<{ producto_id: number }>(
      'SELECT producto_id FROM existencias WHERE ubicacion_id = ? AND cantidad > 0',
      [f.ubicacionId],
    );
    const set = new Set(ids.map((i) => i.producto_id));
    lista = lista.filter((p) => set.has(p.id));
  }
  return lista;
}

/** Existencia por ubicación (ubicaciones activas, más las inactivas que aún tengan unidades). */
export function existenciasDeProducto(db: DB, productoId: number): Promise<ExistenciaUbicacion[]> {
  return db.all<ExistenciaUbicacion>(
    `SELECT u.id AS ubicacion_id, u.nombre, u.activa, COALESCE(e.cantidad, 0) AS cantidad, e.minimo
     FROM ubicaciones u
     LEFT JOIN existencias e ON e.ubicacion_id = u.id AND e.producto_id = ?
     WHERE u.activa = 1 OR COALESCE(e.cantidad, 0) > 0
     ORDER BY u.orden, u.id`,
    [productoId],
  );
}

export async function existenciaEn(db: DB, productoId: number, ubicacionId: number): Promise<number> {
  const f = await db.first<{ cantidad: number }>(
    'SELECT cantidad FROM existencias WHERE producto_id = ? AND ubicacion_id = ?',
    [productoId, ubicacionId],
  );
  return f?.cantidad ?? 0;
}

export async function existenciaTotal(db: DB, productoId: number): Promise<number> {
  const f = await db.first<{ t: number | null }>('SELECT SUM(cantidad) AS t FROM existencias WHERE producto_id = ?', [
    productoId,
  ]);
  return f?.t ?? 0;
}

/** Mínimo opcional para una ubicación concreta (null = sin mínimo). */
export async function guardarMinimoUbicacion(
  db: DB,
  productoId: number,
  ubicacionId: number,
  minimo: number | null,
): Promise<void> {
  if (minimo != null && !esEnteroNoNegativo(minimo)) throw new ErrorUsuario('El mínimo debe ser un número entero.');
  await db.run(
    `INSERT INTO existencias (producto_id, ubicacion_id, cantidad, minimo) VALUES (?, ?, 0, ?)
     ON CONFLICT(producto_id, ubicacion_id) DO UPDATE SET minimo = excluded.minimo`,
    [productoId, ubicacionId, minimo],
  );
}
