import { DB, ErrorUsuario, Param } from '../db/types';
import { ahoraLocal, esDiaValido } from './fechas';
import { existenciaEn, existenciaTotal, obtenerProducto } from './productos';

export type TipoMovimiento = 'entrada' | 'salida' | 'transferencia' | 'decomiso' | 'prueba' | 'ajuste';

export const TIPOS: TipoMovimiento[] = ['entrada', 'salida', 'transferencia', 'decomiso', 'prueba', 'ajuste'];

export const NOMBRE_TIPO: Record<TipoMovimiento, string> = {
  entrada: 'Entrada por compra',
  salida: 'Salida por venta o consumo',
  transferencia: 'Transferencia',
  decomiso: 'Decomiso',
  prueba: 'Prueba de boda / degustación',
  ajuste: 'Ajuste por conteo físico',
};

export const MOTIVOS_DECOMISO = [
  'Botella rota',
  'Corcho dañado',
  'Vino oxidado',
  'Producto vencido',
  'Etiqueta o empaque dañado',
  'Retiro ordenado por la gerencia',
  'Retiro ordenado por las autoridades',
  'Otro',
];

export interface MovimientoInput {
  tipo: TipoMovimiento;
  productoId: number;
  /** Unidades a mover. En "ajuste" no se usa: se usa conteoReal. */
  cantidad?: number;
  /** Ubicación afectada (en transferencias: el origen). */
  ubicacionId: number;
  /** Solo transferencias. */
  destinoId?: number | null;
  /** Solo ajustes: cuántas unidades se contaron de verdad. */
  conteoReal?: number;
  responsable?: string | null;
  motivo?: string | null;
  nota?: string | null;
  foto?: string | null;
  clienteEvento?: string | null;
  fechaEvento?: string | null;
  fecha?: string;
  pedidoId?: number | null;
  pedidoLineaId?: number | null;
  esEjemplo?: boolean;
}

export interface Alerta {
  productoId: number;
  nombre: string;
  quedan: number;
  minimo: number;
  /** Si la alerta es por el mínimo de una ubicación concreta. */
  ubicacion?: string;
}

export interface Movimiento {
  id: number;
  tipo: TipoMovimiento;
  producto_id: number;
  producto: string;
  codigo: string;
  cantidad: number;
  ubicacion_id: number | null;
  ubicacion: string | null;
  destino_id: number | null;
  destino: string | null;
  fecha: string;
  responsable: string | null;
  motivo: string | null;
  nota: string | null;
  foto: string | null;
  cliente_evento: string | null;
  fecha_evento: string | null;
  pedido_id: number | null;
  pedido_linea_id: number | null;
  costo_unitario: number;
  existencia_sistema: number | null;
  existencia_contada: number | null;
  deshecho: number;
  es_ejemplo: number;
}

const txt = (v?: string | null) => (v && v.trim() ? v.trim() : null);

async function nombreUbicacion(db: DB, id: number): Promise<string> {
  const u = await db.first<{ nombre: string }>('SELECT nombre FROM ubicaciones WHERE id = ?', [id]);
  return u?.nombre ?? 'esa ubicación';
}

/** Suma o resta unidades en una ubicación. Nunca deja la existencia en negativo. */
export async function cambiarExistencia(db: DB, productoId: number, ubicacionId: number, delta: number): Promise<void> {
  const actual = await existenciaEn(db, productoId, ubicacionId);
  const nueva = actual + delta;
  if (nueva < 0) {
    throw new ErrorUsuario(
      `No hay suficientes unidades: solo hay ${actual} en ${await nombreUbicacion(db, ubicacionId)}.`,
    );
  }
  await db.run(
    `INSERT INTO existencias (producto_id, ubicacion_id, cantidad) VALUES (?, ?, ?)
     ON CONFLICT(producto_id, ubicacion_id) DO UPDATE SET cantidad = excluded.cantidad`,
    [productoId, ubicacionId, nueva],
  );
}

async function existenciasMapa(db: DB, productoId: number): Promise<Map<number, { cantidad: number; minimo: number | null; nombre: string }>> {
  const filas = await db.all<{ ubicacion_id: number; cantidad: number; minimo: number | null; nombre: string }>(
    `SELECT e.ubicacion_id, e.cantidad, e.minimo, u.nombre FROM existencias e
     JOIN ubicaciones u ON u.id = e.ubicacion_id WHERE e.producto_id = ?`,
    [productoId],
  );
  return new Map(filas.map((f) => [f.ubicacion_id, f]));
}

/** Compara antes y después de un movimiento y devuelve las alertas de reposición nuevas. */
async function calcularAlertas(
  db: DB,
  productoId: number,
  totalAntes: number,
  antes: Map<number, { cantidad: number }>,
): Promise<Alerta[]> {
  const p = await obtenerProducto(db, productoId);
  if (!p) return [];
  const alertas: Alerta[] = [];
  const total = await existenciaTotal(db, productoId);
  if (total < totalAntes && total <= p.minimo) {
    alertas.push({ productoId, nombre: p.nombre, quedan: total, minimo: p.minimo });
  }
  const despues = await existenciasMapa(db, productoId);
  for (const [ubicId, d] of despues) {
    const a = antes.get(ubicId)?.cantidad ?? 0;
    if (d.minimo != null && d.cantidad < a && d.cantidad <= d.minimo) {
      alertas.push({ productoId, nombre: p.nombre, quedan: d.cantidad, minimo: d.minimo, ubicacion: d.nombre });
    }
  }
  return alertas;
}

const VERBO: Record<TipoMovimiento, string> = {
  entrada: 'recibir',
  salida: 'sacar',
  transferencia: 'transferir',
  decomiso: 'decomisar',
  prueba: 'usar',
  ajuste: 'ajustar',
};

async function validarUbicacion(db: DB, id: number | null | undefined, que: string): Promise<void> {
  if (!id) throw new ErrorUsuario(`Elige ${que}.`);
  const u = await db.first<{ activa: number }>('SELECT activa FROM ubicaciones WHERE id = ?', [id]);
  if (!u) throw new ErrorUsuario(`La ubicación elegida ya no existe.`);
  if (!u.activa) throw new ErrorUsuario('Esa ubicación está desactivada. Actívala en Ajustes → Ubicaciones.');
}

/**
 * Registra un movimiento y actualiza la existencia, todo en una sola operación.
 * Si algo no es válido no se guarda nada y se lanza un ErrorUsuario con un mensaje claro.
 */
export async function registrarMovimiento(db: DB, m: MovimientoInput): Promise<{ id: number; alertas: Alerta[] }> {
  return db.tx(async () => {
    const p = await obtenerProducto(db, m.productoId);
    if (!p) throw new ErrorUsuario('Elige un producto.');
    await validarUbicacion(db, m.ubicacionId, m.tipo === 'transferencia' ? 'la ubicación de origen' : 'la ubicación');

    const totalAntes = await existenciaTotal(db, m.productoId);
    const antes = await existenciasMapa(db, m.productoId);
    const disponible = antes.get(m.ubicacionId)?.cantidad ?? 0;
    const nombreUbic = await nombreUbicacion(db, m.ubicacionId);

    let cantidad = m.cantidad ?? 0;
    let existenciaSistema: number | null = null;
    let existenciaContada: number | null = null;

    if (m.tipo === 'ajuste') {
      const real = m.conteoReal;
      if (real == null || !Number.isInteger(real) || real < 0) {
        throw new ErrorUsuario('Escribe cuántas unidades contaste (0 o más). Ej.: 11');
      }
      existenciaSistema = disponible;
      existenciaContada = real;
      cantidad = real - disponible;
    } else if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new ErrorUsuario('La cantidad debe ser un número entero mayor que 0. Ej.: 6');
    }

    if (m.tipo === 'transferencia') {
      await validarUbicacion(db, m.destinoId, 'la ubicación de destino');
      if (m.destinoId === m.ubicacionId) throw new ErrorUsuario('El origen y el destino deben ser distintos.');
    }
    if (m.tipo === 'decomiso' && !txt(m.motivo)) {
      throw new ErrorUsuario('Escribe o elige el motivo del decomiso. Ej.: Botella rota');
    }
    if (m.tipo === 'prueba') {
      if (!txt(m.clienteEvento)) throw new ErrorUsuario('Escribe el nombre del cliente o del evento. Ej.: Boda Pérez-Gómez');
      if (!txt(m.responsable)) throw new ErrorUsuario('Escribe quién es el responsable de la prueba.');
    }
    if (m.fechaEvento && !esDiaValido(m.fechaEvento)) {
      throw new ErrorUsuario('La fecha del evento no es válida. Usa el formato AAAA-MM-DD. Ej.: 2026-12-05');
    }

    const resta = m.tipo === 'salida' || m.tipo === 'decomiso' || m.tipo === 'prueba' || m.tipo === 'transferencia';
    if (resta && cantidad > disponible) {
      throw new ErrorUsuario(`No puedes ${VERBO[m.tipo]} ${cantidad} si solo hay ${disponible} en ${nombreUbic}.`);
    }

    switch (m.tipo) {
      case 'entrada':
        await cambiarExistencia(db, m.productoId, m.ubicacionId, cantidad);
        break;
      case 'salida':
      case 'decomiso':
      case 'prueba':
        await cambiarExistencia(db, m.productoId, m.ubicacionId, -cantidad);
        break;
      case 'transferencia':
        await cambiarExistencia(db, m.productoId, m.ubicacionId, -cantidad);
        await cambiarExistencia(db, m.productoId, m.destinoId!, cantidad);
        break;
      case 'ajuste':
        await cambiarExistencia(db, m.productoId, m.ubicacionId, cantidad);
        break;
    }

    const r = await db.run(
      `INSERT INTO movimientos (tipo, producto_id, cantidad, ubicacion_id, destino_id, fecha, responsable, motivo, nota,
        foto, cliente_evento, fecha_evento, pedido_id, pedido_linea_id, costo_unitario, existencia_sistema,
        existencia_contada, es_ejemplo)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        m.tipo,
        m.productoId,
        cantidad,
        m.ubicacionId,
        m.tipo === 'transferencia' ? m.destinoId ?? null : null,
        m.fecha ?? ahoraLocal(),
        txt(m.responsable),
        txt(m.motivo),
        txt(m.nota),
        txt(m.foto),
        txt(m.clienteEvento),
        txt(m.fechaEvento),
        m.pedidoId ?? null,
        m.pedidoLineaId ?? null,
        p.costo,
        existenciaSistema,
        existenciaContada,
        m.esEjemplo ? 1 : 0,
      ],
    );

    const alertas = await calcularAlertas(db, m.productoId, totalAntes, antes);
    return { id: r.lastInsertRowId, alertas };
  });
}

/** Recalcula el estado de un pedido según lo recibido. */
export async function actualizarEstadoPedido(db: DB, pedidoId: number, cerrar = false): Promise<void> {
  const pe = await db.first<{ estado: string }>('SELECT estado FROM pedidos WHERE id = ?', [pedidoId]);
  if (!pe || pe.estado === 'cancelado') return;
  const r = await db.first<{ pendiente: number; recibida: number }>(
    `SELECT SUM(MAX(cantidad - recibida, 0)) AS pendiente, SUM(recibida) AS recibida FROM pedido_lineas WHERE pedido_id = ?`,
    [pedidoId],
  );
  const pendiente = r?.pendiente ?? 0;
  const recibida = r?.recibida ?? 0;
  let estado = 'en_camino';
  if (cerrar || pendiente <= 0) estado = 'recibido';
  else if (recibida > 0) estado = 'parcial';
  await db.run('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, pedidoId]);
}

/**
 * "Deshacer": anula un movimiento recién guardado y devuelve la existencia a como estaba.
 * El registro queda marcado como deshecho (no se borra).
 */
export async function deshacerMovimiento(db: DB, id: number): Promise<void> {
  await db.tx(async () => {
    const m = await db.first<Movimiento>('SELECT * FROM movimientos WHERE id = ?', [id]);
    if (!m) throw new ErrorUsuario('Ese movimiento ya no existe.');
    if (m.deshecho) throw new ErrorUsuario('Ese movimiento ya fue deshecho.');
    const u = m.ubicacion_id!;
    try {
      switch (m.tipo) {
        case 'entrada':
        case 'ajuste':
          await cambiarExistencia(db, m.producto_id, u, -m.cantidad);
          break;
        case 'salida':
        case 'decomiso':
        case 'prueba':
          await cambiarExistencia(db, m.producto_id, u, m.cantidad);
          break;
        case 'transferencia':
          await cambiarExistencia(db, m.producto_id, m.destino_id!, -m.cantidad);
          await cambiarExistencia(db, m.producto_id, u, m.cantidad);
          break;
      }
    } catch (e) {
      if (e instanceof ErrorUsuario) {
        throw new ErrorUsuario(`No se puede deshacer porque esas unidades ya se movieron. ${e.message}`);
      }
      throw e;
    }
    if (m.pedido_linea_id) {
      await db.run('UPDATE pedido_lineas SET recibida = MAX(recibida - ?, 0) WHERE id = ?', [m.cantidad, m.pedido_linea_id]);
      if (m.pedido_id) await actualizarEstadoPedido(db, m.pedido_id);
    }
    await db.run('UPDATE movimientos SET deshecho = 1 WHERE id = ?', [id]);
  });
}

export interface FiltrosHistorial {
  productoId?: number | null;
  tipo?: TipoMovimiento | null;
  ubicacionId?: number | null;
  responsable?: string | null;
  desde?: string | null; // AAAA-MM-DD
  hasta?: string | null; // AAAA-MM-DD
  limite?: number;
}

export function listarMovimientos(db: DB, f: FiltrosHistorial = {}): Promise<Movimiento[]> {
  const cond: string[] = [];
  const params: Param[] = [];
  if (f.productoId) {
    cond.push('m.producto_id = ?');
    params.push(f.productoId);
  }
  if (f.tipo) {
    cond.push('m.tipo = ?');
    params.push(f.tipo);
  }
  if (f.ubicacionId) {
    cond.push('(m.ubicacion_id = ? OR m.destino_id = ?)');
    params.push(f.ubicacionId, f.ubicacionId);
  }
  if (f.responsable) {
    cond.push('m.responsable = ?');
    params.push(f.responsable);
  }
  if (f.desde) {
    cond.push('substr(m.fecha, 1, 10) >= ?');
    params.push(f.desde);
  }
  if (f.hasta) {
    cond.push('substr(m.fecha, 1, 10) <= ?');
    params.push(f.hasta);
  }
  params.push(f.limite ?? 300);
  return db.all<Movimiento>(
    `SELECT m.*, p.nombre AS producto, p.codigo, u.nombre AS ubicacion, d.nombre AS destino
     FROM movimientos m
     JOIN productos p ON p.id = m.producto_id
     LEFT JOIN ubicaciones u ON u.id = m.ubicacion_id
     LEFT JOIN ubicaciones d ON d.id = m.destino_id
     ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''}
     ORDER BY m.fecha DESC, m.id DESC
     LIMIT ?`,
    params,
  );
}

export async function listarResponsables(db: DB): Promise<string[]> {
  const filas = await db.all<{ responsable: string }>(
    `SELECT DISTINCT responsable FROM movimientos WHERE responsable IS NOT NULL ORDER BY responsable COLLATE NOCASE`,
  );
  return filas.map((f) => f.responsable);
}
