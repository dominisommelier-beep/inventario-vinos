import { DB } from '../db/types';
import { diaLocal } from './fechas';
import { TipoMovimiento } from './movimientos';
import { listarPedidos } from './pedidos';
import { listarResumen, ProductoResumen } from './productos';

// ---------- Inicio ----------

export interface ResumenInicio {
  productos: number;
  unidades: number;
  valorCosto: number;
  porReponer: number;
  agotados: number;
  pedidosEnTransito: number;
  pedidosAtrasados: number;
}

/** Está bajo mínimo y hace falta pedir (no lo cubre un pedido en camino). */
export const necesitaPedido = (p: ProductoResumen) => p.bajoMinimo && p.sugerido > 0;

export async function resumenInicio(db: DB, hoy = diaLocal()): Promise<ResumenInicio> {
  const productos = await listarResumen(db);
  const pedidos = await listarPedidos(db, true, hoy);
  return {
    productos: productos.length,
    unidades: productos.reduce((s, p) => s + p.total, 0),
    valorCosto: productos.reduce((s, p) => s + p.total * p.costo, 0),
    porReponer: productos.filter(necesitaPedido).length,
    agotados: productos.filter((p) => p.total <= 0).length,
    pedidosEnTransito: pedidos.length,
    pedidosAtrasados: pedidos.filter((p) => p.atrasado).length,
  };
}

// ---------- Reposición ----------

export interface ItemReposicion {
  producto: ProductoResumen;
  costoEstimado: number;
}

export interface GrupoReposicion {
  proveedorId: number | null;
  proveedor: string;
  telefono: string | null;
  correo: string | null;
  items: ItemReposicion[];
  unidades: number;
  costoEstimado: number;
}

export async function listarReposicion(db: DB): Promise<GrupoReposicion[]> {
  const productos = (await listarResumen(db)).filter((p) => p.bajoMinimo && (p.sugerido > 0 || p.pedidoEnCamino));
  const proveedores = await db.all<{ id: number; nombre: string; telefono: string | null; correo: string | null }>(
    'SELECT id, nombre, telefono, correo FROM proveedores',
  );
  const grupos = new Map<number | null, GrupoReposicion>();
  for (const p of productos) {
    const clave = p.proveedor_id ?? null;
    if (!grupos.has(clave)) {
      const pr = proveedores.find((x) => x.id === clave);
      grupos.set(clave, {
        proveedorId: clave,
        proveedor: pr?.nombre ?? 'Sin proveedor asignado',
        telefono: pr?.telefono ?? null,
        correo: pr?.correo ?? null,
        items: [],
        unidades: 0,
        costoEstimado: 0,
      });
    }
    const g = grupos.get(clave)!;
    const costoEstimado = p.sugerido * p.costo;
    g.items.push({ producto: p, costoEstimado });
    g.unidades += p.sugerido;
    g.costoEstimado += costoEstimado;
  }
  return [...grupos.values()].sort((a, b) => {
    if (a.proveedorId === null) return 1;
    if (b.proveedorId === null) return -1;
    return a.proveedor.localeCompare(b.proveedor);
  });
}

// ---------- Reporte mensual ----------

export interface FilaReporte {
  clave: string;
  titulo: string;
  movimientos: number;
  unidades: number;
  costo: number;
}

/** Totales del mes (AAAA-MM) por tipo de movimiento, en unidades y en dinero a costo. */
export async function reporteMensual(db: DB, mes: string): Promise<FilaReporte[]> {
  const filas = await db.all<{ tipo: TipoMovimiento; signo: number; n: number; unidades: number; costo: number }>(
    `SELECT tipo, CASE WHEN cantidad < 0 THEN -1 ELSE 1 END AS signo, COUNT(*) AS n,
       SUM(ABS(cantidad)) AS unidades, SUM(ABS(cantidad) * costo_unitario) AS costo
     FROM movimientos
     WHERE deshecho = 0 AND substr(fecha, 1, 7) = ?
     GROUP BY tipo, signo`,
    [mes],
  );
  const definicion: { clave: string; titulo: string; tipo: TipoMovimiento; signo?: number }[] = [
    { clave: 'entrada', titulo: 'Entradas (compras)', tipo: 'entrada' },
    { clave: 'salida', titulo: 'Salidas (ventas y consumo)', tipo: 'salida' },
    { clave: 'transferencia', titulo: 'Transferencias', tipo: 'transferencia' },
    { clave: 'decomiso', titulo: 'Decomisos (pérdidas)', tipo: 'decomiso' },
    { clave: 'prueba', titulo: 'Pruebas de boda y degustaciones', tipo: 'prueba' },
    { clave: 'faltante', titulo: 'Conteo: faltantes', tipo: 'ajuste', signo: -1 },
    { clave: 'sobrante', titulo: 'Conteo: sobrantes', tipo: 'ajuste', signo: 1 },
  ];
  return definicion.map((d) => {
    const coinciden = filas.filter(
      (f) => f.tipo === d.tipo && (d.signo === undefined || f.signo === d.signo) && (d.tipo !== 'ajuste' || f.unidades > 0),
    );
    return {
      clave: d.clave,
      titulo: d.titulo,
      movimientos: coinciden.reduce((s, f) => s + f.n, 0),
      unidades: coinciden.reduce((s, f) => s + (f.unidades ?? 0), 0),
      costo: coinciden.reduce((s, f) => s + (f.costo ?? 0), 0),
    };
  });
}

export interface PruebaMes {
  mes: string;
  eventos: number;
  unidades: number;
  costo: number;
}

/** Cuánto se gastó en pruebas de boda / degustaciones cada mes del año. */
export async function pruebasPorMes(db: DB, anio: number): Promise<PruebaMes[]> {
  const filas = await db.all<PruebaMes>(
    `SELECT substr(fecha, 1, 7) AS mes, COUNT(DISTINCT COALESCE(cliente_evento, id)) AS eventos,
       SUM(cantidad) AS unidades, SUM(cantidad * costo_unitario) AS costo
     FROM movimientos
     WHERE tipo = 'prueba' AND deshecho = 0 AND substr(fecha, 1, 4) = ?
     GROUP BY mes ORDER BY mes`,
    [String(anio)],
  );
  return Array.from({ length: 12 }, (_, i) => {
    const mes = `${anio}-${String(i + 1).padStart(2, '0')}`;
    return filas.find((f) => f.mes === mes) ?? { mes, eventos: 0, unidades: 0, costo: 0 };
  });
}

export interface DetallePrueba {
  cliente_evento: string;
  fecha_evento: string | null;
  responsable: string | null;
  unidades: number;
  costo: number;
}

export function detallePruebas(db: DB, mes: string): Promise<DetallePrueba[]> {
  return db.all<DetallePrueba>(
    `SELECT cliente_evento, MAX(fecha_evento) AS fecha_evento, MAX(responsable) AS responsable,
       SUM(cantidad) AS unidades, SUM(cantidad * costo_unitario) AS costo
     FROM movimientos
     WHERE tipo = 'prueba' AND deshecho = 0 AND substr(fecha, 1, 7) = ?
     GROUP BY cliente_evento ORDER BY costo DESC`,
    [mes],
  );
}
