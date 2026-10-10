import { DB, ErrorUsuario } from '../db/types';

export interface Categoria {
  id: number;
  nombre: string;
}

export interface Ubicacion {
  id: number;
  nombre: string;
  activa: number;
  orden: number;
}

export interface Proveedor {
  id: number;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  es_ejemplo?: number;
}

// ---------- Ajustes (clave / valor) ----------

export async function leerAjuste(db: DB, clave: string): Promise<string | null> {
  const fila = await db.first<{ valor: string | null }>('SELECT valor FROM ajustes WHERE clave = ?', [clave]);
  return fila?.valor ?? null;
}

export async function guardarAjuste(db: DB, clave: string, valor: string | null): Promise<void> {
  await db.run(
    'INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor',
    [clave, valor],
  );
}

// ---------- Categorías ----------

export function listarCategorias(db: DB): Promise<Categoria[]> {
  return db.all<Categoria>('SELECT id, nombre FROM categorias ORDER BY id');
}

export async function crearCategoria(db: DB, nombre: string): Promise<number> {
  const limpio = nombre.trim();
  if (!limpio) throw new ErrorUsuario('Escribe el nombre de la categoría. Ej.: Sake');
  const existe = await db.first('SELECT id FROM categorias WHERE nombre = ?', [limpio]);
  if (existe) throw new ErrorUsuario(`Ya existe la categoría "${limpio}".`);
  const r = await db.run('INSERT INTO categorias (nombre) VALUES (?)', [limpio]);
  return r.lastInsertRowId;
}

export async function eliminarCategoria(db: DB, id: number): Promise<void> {
  const uso = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM productos WHERE categoria_id = ?', [id]);
  if (uso && uso.n > 0) {
    throw new ErrorUsuario(`No se puede borrar: hay ${uso.n} producto(s) en esta categoría. Cámbialos de categoría primero.`);
  }
  await db.run('DELETE FROM categorias WHERE id = ?', [id]);
}

// ---------- Ubicaciones ----------

export function listarUbicaciones(db: DB, incluirInactivas = false): Promise<Ubicacion[]> {
  return db.all<Ubicacion>(
    `SELECT id, nombre, activa, orden FROM ubicaciones ${incluirInactivas ? '' : 'WHERE activa = 1'} ORDER BY orden, id`,
  );
}

export async function crearUbicacion(db: DB, nombre: string): Promise<number> {
  const limpio = nombre.trim();
  if (!limpio) throw new ErrorUsuario('Escribe el nombre de la ubicación. Ej.: Terraza');
  const existe = await db.first('SELECT id FROM ubicaciones WHERE nombre = ?', [limpio]);
  if (existe) throw new ErrorUsuario(`Ya existe una ubicación llamada "${limpio}".`);
  const orden = await db.first<{ m: number | null }>('SELECT MAX(orden) AS m FROM ubicaciones');
  const r = await db.run('INSERT INTO ubicaciones (nombre, orden) VALUES (?, ?)', [limpio, (orden?.m ?? 0) + 1]);
  return r.lastInsertRowId;
}

export async function renombrarUbicacion(db: DB, id: number, nombre: string): Promise<void> {
  const limpio = nombre.trim();
  if (!limpio) throw new ErrorUsuario('El nombre no puede quedar vacío.');
  const existe = await db.first('SELECT id FROM ubicaciones WHERE nombre = ? AND id <> ?', [limpio, id]);
  if (existe) throw new ErrorUsuario(`Ya existe una ubicación llamada "${limpio}".`);
  await db.run('UPDATE ubicaciones SET nombre = ? WHERE id = ?', [limpio, id]);
}

export async function cambiarUbicacionActiva(db: DB, id: number, activa: boolean): Promise<void> {
  if (!activa) {
    const stock = await db.first<{ n: number | null }>(
      'SELECT SUM(cantidad) AS n FROM existencias WHERE ubicacion_id = ?',
      [id],
    );
    if ((stock?.n ?? 0) > 0) {
      throw new ErrorUsuario(
        `Esta ubicación todavía tiene ${stock?.n} unidad(es). Primero transfiérelas a otra ubicación.`,
      );
    }
    const activas = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM ubicaciones WHERE activa = 1 AND id <> ?', [id]);
    if (!activas || activas.n === 0) throw new ErrorUsuario('Debe quedar al menos una ubicación activa.');
  }
  await db.run('UPDATE ubicaciones SET activa = ? WHERE id = ?', [activa ? 1 : 0, id]);
}

// ---------- Proveedores ----------

export function listarProveedores(db: DB): Promise<Proveedor[]> {
  return db.all<Proveedor>('SELECT * FROM proveedores ORDER BY nombre COLLATE NOCASE');
}

export function obtenerProveedor(db: DB, id: number): Promise<Proveedor | null> {
  return db.first<Proveedor>('SELECT * FROM proveedores WHERE id = ?', [id]);
}

export interface ProveedorInput {
  id?: number | null;
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
  esEjemplo?: boolean;
}

export async function guardarProveedor(db: DB, p: ProveedorInput): Promise<number> {
  const nombre = p.nombre.trim();
  if (!nombre) throw new ErrorUsuario('Escribe el nombre del proveedor. Ej.: Distribuidora del Caribe');
  const correo = p.correo?.trim() || null;
  if (correo && !/^\S+@\S+\.\S+$/.test(correo)) {
    throw new ErrorUsuario('El correo no parece válido. Ej.: ventas@proveedor.com');
  }
  const telefono = p.telefono?.trim() || null;
  if (p.id) {
    await db.run('UPDATE proveedores SET nombre = ?, telefono = ?, correo = ? WHERE id = ?', [nombre, telefono, correo, p.id]);
    return p.id;
  }
  const r = await db.run('INSERT INTO proveedores (nombre, telefono, correo, es_ejemplo) VALUES (?, ?, ?, ?)', [
    nombre,
    telefono,
    correo,
    p.esEjemplo ? 1 : 0,
  ]);
  return r.lastInsertRowId;
}

export async function eliminarProveedor(db: DB, id: number): Promise<void> {
  await db.run('DELETE FROM proveedores WHERE id = ?', [id]);
}
