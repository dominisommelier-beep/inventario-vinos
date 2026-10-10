import { deshacerMovimiento, registrarMovimiento } from '../src/logic/movimientos';
import { cancelarPedido, crearPedido, listarPedidos, obtenerPedido, recibirPedido } from '../src/logic/pedidos';
import { existenciaEn, existenciaTotal, obtenerResumen } from '../src/logic/productos';
import { listarReposicion, resumenInicio } from '../src/logic/reportes';
import { crearDBPrueba } from './dbNode';
import { crearProducto, ubicaciones } from './ayudantes';

async function preparar() {
  const db = await crearDBPrueba();
  const u = await ubicaciones(db);
  const p = await crearProducto(db, { minimo: 6, maximo: 24 });
  await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 4, ubicacionId: u.cava });
  return { db, u, p };
}

describe('Pedidos en tránsito', () => {
  test('un pedido en tránsito NO suma a la existencia, pero sí cuenta como "en tránsito"', async () => {
    const { db, u, p } = await preparar();
    await crearPedido(db, { lineas: [{ productoId: p, cantidad: 12 }], ubicacionId: u.cava, fechaEstimada: '2026-10-20' });
    expect(await existenciaTotal(db, p)).toBe(4);
    const r = await obtenerResumen(db, p);
    expect(r?.transito).toBe(12);
    expect(r?.sugerido).toBe(24 - (4 + 12));
  });

  test('recepción completa: suma todo como entrada y cierra el pedido', async () => {
    const { db, u, p } = await preparar();
    const id = await crearPedido(db, { lineas: [{ productoId: p, cantidad: 12 }] });
    const pedido = await obtenerPedido(db, id);
    await recibirPedido(db, id, {
      ubicacionId: u.cava,
      recepciones: [{ lineaId: pedido!.lineas[0].id, cantidad: 12 }],
    });
    expect(await existenciaEn(db, p, u.cava)).toBe(16);
    const despues = await obtenerPedido(db, id);
    expect(despues?.estado).toBe('recibido');
    expect((await obtenerResumen(db, p))?.transito).toBe(0);
  });

  test('recepción parcial: suma lo que llegó y el resto sigue en tránsito', async () => {
    const { db, u, p } = await preparar();
    const id = await crearPedido(db, { lineas: [{ productoId: p, cantidad: 12 }] });
    const linea = (await obtenerPedido(db, id))!.lineas[0].id;

    await recibirPedido(db, id, { ubicacionId: u.bar, recepciones: [{ lineaId: linea, cantidad: 8 }] });

    expect(await existenciaEn(db, p, u.bar)).toBe(8);
    expect(await existenciaTotal(db, p)).toBe(12);
    let pedido = await obtenerPedido(db, id);
    expect(pedido?.estado).toBe('parcial');
    expect(pedido?.pendientes).toBe(4);
    expect((await obtenerResumen(db, p))?.transito).toBe(4);

    // No se puede recibir más de lo que falta
    await expect(recibirPedido(db, id, { ubicacionId: u.bar, recepciones: [{ lineaId: linea, cantidad: 5 }] })).rejects.toThrow(
      'solo faltan 4',
    );

    // Llega el resto
    await recibirPedido(db, id, { ubicacionId: u.bar, recepciones: [{ lineaId: linea, cantidad: 4 }] });
    pedido = await obtenerPedido(db, id);
    expect(pedido?.estado).toBe('recibido');
    expect(await existenciaTotal(db, p)).toBe(16);
  });

  test('recepción parcial cerrando el pedido: lo que falta ya no cuenta en tránsito', async () => {
    const { db, u, p } = await preparar();
    const id = await crearPedido(db, { lineas: [{ productoId: p, cantidad: 12 }] });
    const linea = (await obtenerPedido(db, id))!.lineas[0].id;
    await recibirPedido(db, id, { ubicacionId: u.cava, recepciones: [{ lineaId: linea, cantidad: 10 }], cerrarResto: true });
    expect((await obtenerPedido(db, id))?.estado).toBe('recibido');
    expect((await obtenerResumen(db, p))?.transito).toBe(0);
    expect(await existenciaTotal(db, p)).toBe(14);
  });

  test('deshacer una recepción la devuelve a "en tránsito"', async () => {
    const { db, u, p } = await preparar();
    const id = await crearPedido(db, { lineas: [{ productoId: p, cantidad: 6 }] });
    const linea = (await obtenerPedido(db, id))!.lineas[0].id;
    const { movimientos } = await recibirPedido(db, id, { ubicacionId: u.cava, recepciones: [{ lineaId: linea, cantidad: 6 }] });
    await deshacerMovimiento(db, movimientos[0]);
    expect((await obtenerPedido(db, id))?.estado).toBe('en_camino');
    expect((await obtenerResumen(db, p))?.transito).toBe(6);
    expect(await existenciaTotal(db, p)).toBe(4);
  });

  test('cancelar un pedido lo saca del tránsito sin tocar la existencia', async () => {
    const { db, p } = await preparar();
    const id = await crearPedido(db, { lineas: [{ productoId: p, cantidad: 12 }] });
    await cancelarPedido(db, id);
    expect((await obtenerPedido(db, id))?.estado).toBe('cancelado');
    expect((await obtenerResumen(db, p))?.transito).toBe(0);
    expect(await existenciaTotal(db, p)).toBe(4);
    await expect(cancelarPedido(db, id)).rejects.toThrow('Solo se pueden cancelar');
  });

  test('marca como atrasado un pedido que pasó su fecha estimada sin recibirse', async () => {
    const { db, p } = await preparar();
    await crearPedido(db, { lineas: [{ productoId: p, cantidad: 2 }], fechaEstimada: '2026-10-01' });
    await crearPedido(db, { lineas: [{ productoId: p, cantidad: 2 }], fechaEstimada: '2026-10-30' });
    const pedidos = await listarPedidos(db, true, '2026-10-10');
    expect(pedidos.filter((x) => x.atrasado)).toHaveLength(1);
    const r = await resumenInicio(db, '2026-10-10');
    expect(r.pedidosEnTransito).toBe(2);
    expect(r.pedidosAtrasados).toBe(1);
  });
});

describe('Pantalla de Reposición', () => {
  test('agrupa por proveedor y muestra "pedido en camino" cuando ya está cubierto', async () => {
    const { db, u, p } = await preparar();
    const p2 = await crearProducto(db, { codigo: 'BL-001', nombre: 'Albariño', minimo: 3, maximo: null, costo: 500 });
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p2, cantidad: 2, ubicacionId: u.bar });

    let grupos = await listarReposicion(db);
    const items = grupos.flatMap((g) => g.items);
    expect(items.map((i) => i.producto.codigo).sort()).toEqual(['BL-001', 'VT-001']);
    const albarino = items.find((i) => i.producto.codigo === 'BL-001')!;
    expect(albarino.producto.sugerido).toBe(4); // 2×3 − 2
    expect(albarino.costoEstimado).toBe(2000);

    // Un pedido que cubre la necesidad del Marqués
    await crearPedido(db, { lineas: [{ productoId: p, cantidad: 20 }] });
    grupos = await listarReposicion(db);
    const marques = grupos.flatMap((g) => g.items).find((i) => i.producto.id === p)!;
    expect(marques.producto.pedidoEnCamino).toBe(true);
    expect(marques.producto.sugerido).toBe(0);
    expect((await resumenInicio(db)).porReponer).toBe(1);
  });
});
