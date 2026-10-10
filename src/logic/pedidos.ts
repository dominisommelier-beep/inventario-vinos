import { DB, ErrorUsuario } from '../db/types';
import { ahoraLocal, diaLocal, esDiaValido } from './fechas';
import { actualizarEstadoPedido, Alerta, registrarMovimiento } from './movimientos';

export type EstadoPedido = 'en_camino' | 'parcial' | 'recibido' | 'cancelado';

export const NOMBRE_ESTADO_PEDIDO: Record<EstadoPedido, string> = {
  en_camino: 'En camino',
  parcial: 'Recibido en parte',
  recibido: 'Recibido',
  cancelado: 'Cancelado',
};

export interface LineaPedido {
  id: number;
  pedido_id: number;
  producto_id: number;
  producto: string;
  codigo: string;
  cantidad: number;
  recibida: number;
  costo_unitario: number;
}

export interface Pedido {
  id: number;
  proveedor_id: number | null;
  proveedor: string | null;
  proveedor_telefono: string | null;
  proveedor_correo: string | null;
  fecha_pedido: string;
  fecha_estimada: string | null;
  estado: EstadoPedido;
  ubicacion_id: number | null;
  ubicacion: string | null;
  responsable: string | null;
  nota: string | null;
  es_ejemplo: number;
  lineas: LineaPedido[];
  unidades: number;
  pendientes: number;
  costo: number;
  /** Pasó la fecha estimada y todavía falta mercancía. */
  atrasado: boolean;
}

export interface PedidoInput {
  proveedorId?: number | null;
  fechaPedido?: string;
  fechaEstimada?: string | null;
  ubicacionId?: number | null;
  responsable?: string | null;
  nota?: string | null;
  lineas: { productoId: number; cantidad: number; costoUnitario?: number | null }[];
  esEjemplo?: boolean;
}

export const estaAbierto = (estado: string) => estado === 'en_camino' || estado === 'parcial';

export async function crearPedido(db: DB, p: PedidoInput): Promise<number> {
  const lineas = p.lineas.filter((l) => l.cantidad !== 0);
  if (lineas.length === 0) throw new ErrorUsuario('Agrega al menos un producto con su cantidad.');
  for (const l of lineas) {
    if (!Number.isInteger(l.cantidad) || l.cantidad <= 0) {
      throw new ErrorUsuario('Cada cantidad debe ser un número entero mayor que 0.');
    }
  }
  if (p.fechaEstimada && !esDiaValido(p.fechaEstimada)) {
    throw new ErrorUsuario('La fecha estimada de llegada no es válida. Ej.: 2026-10-20');
  }
  return db.tx(async () => {
    const r = await db.run(
      `INSERT INTO pedidos (proveedor_id, fecha_pedido, fecha_estimada, estado, ubicacion_id, responsable, nota, es_ejemplo)
       VALUES (?, ?, ?, 'en_camino', ?, ?, ?, ?)`,
      [
        p.proveedorId ?? null,
        p.fechaPedido ?? diaLocal(),
        p.fechaEstimada || null,
        p.ubicacionId ?? null,
        p.responsable?.trim() || null,
        p.nota?.trim() || null,
        p.esEjemplo ? 1 : 0,
      ],
    );
    const pedidoId = r.lastInsertRowId;
    for (const l of lineas) {
      const prod = await db.first<{ costo: number }>('SELECT costo FROM productos WHERE id = ?', [l.productoId]);
      if (!prod) throw new ErrorUsuario('Uno de los productos del pedido ya no existe.');
      await db.run(
        'INSERT INTO pedido_lineas (pedido_id, producto_id, cantidad, costo_unitario) VALUES (?, ?, ?, ?)',
        [pedidoId, l.productoId, l.cantidad, l.costoUnitario ?? prod.costo],
      );
    }
    return pedidoId;
  });
}

async function cargarLineas(db: DB, pedidoIds: number[]): Promise<Map<number, LineaPedido[]>> {
  const mapa = new Map<number, LineaPedido[]>();
  if (pedidoIds.length === 0) return mapa;
  const filas = await db.all<LineaPedido>(
    `SELECT l.*, p.nombre AS producto, p.codigo FROM pedido_lineas l JOIN productos p ON p.id = l.producto_id
     WHERE l.pedido_id IN (${pedidoIds.map(() => '?').join(',')}) ORDER BY l.id`,
    pedidoIds,
  );
  for (const f of filas) {
    if (!mapa.has(f.pedido_id)) mapa.set(f.pedido_id, []);
    mapa.get(f.pedido_id)!.push(f);
  }
  return mapa;
}

export async function listarPedidos(db: DB, soloAbiertos = false, hoy = diaLocal()): Promise<Pedido[]> {
  const filas = await db.all<Omit<Pedido, 'lineas' | 'unidades' | 'pendientes' | 'costo' | 'atrasado'>>(
    `SELECT pe.*, pr.nombre AS proveedor, pr.telefono AS proveedor_telefono, pr.correo AS proveedor_correo,
       u.nombre AS ubicacion
     FROM pedidos pe
     LEFT JOIN proveedores pr ON pr.id = pe.proveedor_id
     LEFT JOIN ubicaciones u ON u.id = pe.ubicacion_id
     ${soloAbiertos ? "WHERE pe.estado IN ('en_camino', 'parcial')" : ''}
     ORDER BY CASE WHEN pe.estado IN ('en_camino','parcial') THEN 0 ELSE 1 END, pe.fecha_estimada, pe.id DESC`,
  );
  const lineas = await cargarLineas(db, filas.map((f) => f.id));
  return filas.map((f) => {
    const ls = lineas.get(f.id) ?? [];
    const pendientes = ls.reduce((s, l) => s + Math.max(l.cantidad - l.recibida, 0), 0);
    return {
      ...f,
      lineas: ls,
      unidades: ls.reduce((s, l) => s + l.cantidad, 0),
      pendientes,
      costo: ls.reduce((s, l) => s + l.cantidad * l.costo_unitario, 0),
      atrasado: estaAbierto(f.estado) && !!f.fecha_estimada && f.fecha_estimada < hoy && pendientes > 0,
    };
  });
}

export async function obtenerPedido(db: DB, id: number): Promise<Pedido | null> {
  const todos = await listarPedidos(db);
  return todos.find((p) => p.id === id) ?? null;
}

export interface RecepcionInput {
  ubicacionId: number;
  responsable?: string | null;
  nota?: string | null;
  /** Unidades que llegaron de cada línea. */
  recepciones: { lineaId: number; cantidad: number }[];
  /** Marcar el pedido como terminado aunque falten unidades (no llegarán más). */
  cerrarResto?: boolean;
  fecha?: string;
  esEjemplo?: boolean;
}

/** Recibe un pedido completo o en parte. Lo recibido entra como "Entrada por compra". */
export async function recibirPedido(db: DB, pedidoId: number, r: RecepcionInput): Promise<{ movimientos: number[]; alertas: Alerta[] }> {
  return db.tx(async () => {
    const pe = await db.first<{ estado: string }>('SELECT estado FROM pedidos WHERE id = ?', [pedidoId]);
    if (!pe) throw new ErrorUsuario('Ese pedido ya no existe.');
    if (!estaAbierto(pe.estado)) throw new ErrorUsuario('Este pedido ya está cerrado (recibido o cancelado).');
    const lineas = (await cargarLineas(db, [pedidoId])).get(pedidoId) ?? [];
    const movimientos: number[] = [];
    let total = 0;
    for (const rec of r.recepciones) {
      if (!rec.cantidad) continue;
      const l = lineas.find((x) => x.id === rec.lineaId);
      if (!l) throw new ErrorUsuario('Una línea del pedido no existe.');
      if (!Number.isInteger(rec.cantidad) || rec.cantidad < 0) {
        throw new ErrorUsuario('Las cantidades recibidas deben ser números enteros.');
      }
      const falta = l.cantidad - l.recibida;
      if (rec.cantidad > falta) {
        throw new ErrorUsuario(`De "${l.producto}" solo faltan ${falta} por recibir; escribiste ${rec.cantidad}.`);
      }
      const { id } = await registrarMovimiento(db, {
        tipo: 'entrada',
        productoId: l.producto_id,
        cantidad: rec.cantidad,
        ubicacionId: r.ubicacionId,
        responsable: r.responsable,
        motivo: `Recepción del pedido #${pedidoId}`,
        nota: r.nota,
        pedidoId,
        pedidoLineaId: l.id,
        fecha: r.fecha ?? ahoraLocal(),
        esEjemplo: r.esEjemplo,
      });
      await db.run('UPDATE pedido_lineas SET recibida = recibida + ? WHERE id = ?', [rec.cantidad, l.id]);
      movimientos.push(id);
      total += rec.cantidad;
    }
    if (total === 0 && !r.cerrarResto) throw new ErrorUsuario('Escribe cuántas unidades llegaron de al menos un producto.');
    await actualizarEstadoPedido(db, pedidoId, r.cerrarResto);
    return { movimientos, alertas: [] };
  });
}

export async function cancelarPedido(db: DB, pedidoId: number): Promise<void> {
  const pe = await db.first<{ estado: string }>('SELECT estado FROM pedidos WHERE id = ?', [pedidoId]);
  if (!pe) throw new ErrorUsuario('Ese pedido ya no existe.');
  if (!estaAbierto(pe.estado)) throw new ErrorUsuario('Solo se pueden cancelar pedidos que siguen en camino.');
  await db.run("UPDATE pedidos SET estado = 'cancelado' WHERE id = ?", [pedidoId]);
}

export async function eliminarPedido(db: DB, pedidoId: number): Promise<void> {
  const recibidos = await db.first<{ n: number }>(
    'SELECT COUNT(*) AS n FROM movimientos WHERE pedido_id = ? AND deshecho = 0',
    [pedidoId],
  );
  if (recibidos && recibidos.n > 0) {
    throw new ErrorUsuario('Este pedido ya tiene mercancía recibida; no se puede borrar. Puedes cancelarlo.');
  }
  await db.run('DELETE FROM pedidos WHERE id = ?', [pedidoId]);
}

/** Texto listo para enviar al proveedor por WhatsApp o correo. */
export function textoPedido(opts: {
  negocio?: string;
  proveedor?: string | null;
  fechaEstimada?: string | null;
  lineas: { codigo: string; nombre: string; cantidad: number }[];
}): string {
  const partes = [
    `Hola${opts.proveedor ? ' ' + opts.proveedor : ''}, le saludamos${opts.negocio ? ' de ' + opts.negocio : ''}.`,
    'Quisiéramos hacer el siguiente pedido:',
    '',
    ...opts.lineas.map((l) => `• ${l.cantidad} × ${l.nombre} (${l.codigo})`),
    '',
    `Total: ${opts.lineas.reduce((s, l) => s + l.cantidad, 0)} unidades.`,
  ];
  if (opts.fechaEstimada) partes.push(`¿Nos confirma si puede entregarlo para el ${opts.fechaEstimada}?`);
  partes.push('Muchas gracias.');
  return partes.join('\n');
}
