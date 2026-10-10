// Datos de ejemplo: 10 productos y movimientos de todos los tipos,
// para aprender a usar la app. Se pueden borrar desde Ajustes.

import { DB } from '../db/types';
import { guardarProveedor, listarCategorias, listarUbicaciones } from './catalogos';
import { ahoraLocal, diaLocal, sumarDias } from './fechas';
import { registrarMovimiento } from './movimientos';
import { crearPedido, obtenerPedido, recibirPedido } from './pedidos';
import { guardarMinimoUbicacion, guardarProducto } from './productos';

function haceDias(dias: number, hora = 11): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, 15, 0, 0);
  return ahoraLocal(d);
}

export async function hayEjemplos(db: DB): Promise<boolean> {
  const f = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM productos WHERE es_ejemplo = 1');
  return (f?.n ?? 0) > 0;
}

export async function cargarEjemplos(db: DB): Promise<void> {
  if (await hayEjemplos(db)) return;
  const cats = await listarCategorias(db);
  const cat = (n: string) => cats.find((c) => c.nombre === n)!.id;
  const us = await listarUbicaciones(db);
  const u = (n: string) => us.find((x) => x.nombre === n)?.id ?? us[0].id;
  const cava = u('Cava principal');
  const bar = u('Bar');
  const resto = u('Restaurante');
  const almacen = u('Almacén');

  await db.tx(async () => {
    const caribe = await guardarProveedor(db, {
      nombre: 'Distribuidora del Caribe (ejemplo)',
      telefono: '809-555-0101',
      correo: 'ventas@ejemplo-caribe.com',
      esEjemplo: true,
    });
    const vinosSur = await guardarProveedor(db, {
      nombre: 'Vinos del Sur (ejemplo)',
      telefono: '829-555-0202',
      correo: 'pedidos@ejemplo-vinosdelsur.com',
      esEjemplo: true,
    });
    const licores = await guardarProveedor(db, {
      nombre: 'Licores Premium (ejemplo)',
      telefono: '849-555-0303',
      correo: null,
      esEjemplo: true,
    });

    const base = { esEjemplo: true, tamano: '750 ml' };
    const P = {
      riscal: await guardarProducto(db, { ...base, codigo: 'VT-001', nombre: 'Marqués de Riscal Reserva', categoriaId: cat('Tinto'), bodega: 'Marqués de Riscal', pais: 'España', region: 'Rioja', anada: '2019', uva: 'Tempranillo', proveedorId: caribe, costo: 1450, precio: 2600, minimo: 6, maximo: 24 }),
      catena: await guardarProducto(db, { ...base, codigo: 'VT-002', nombre: 'Catena Malbec', categoriaId: cat('Tinto'), bodega: 'Catena Zapata', pais: 'Argentina', region: 'Mendoza', anada: '2021', uva: 'Malbec', proveedorId: vinosSur, costo: 1100, precio: 1950, minimo: 6, maximo: 18 }),
      casillero: await guardarProducto(db, { ...base, codigo: 'VT-003', nombre: 'Casillero del Diablo Cabernet', categoriaId: cat('Tinto'), bodega: 'Concha y Toro', pais: 'Chile', region: 'Valle Central', anada: '2022', uva: 'Cabernet Sauvignon', proveedorId: vinosSur, costo: 650, precio: 1200, minimo: 12, maximo: 36 }),
      albarino: await guardarProducto(db, { ...base, codigo: 'VB-001', nombre: 'Martín Códax Albariño', categoriaId: cat('Blanco'), bodega: 'Martín Códax', pais: 'España', region: 'Rías Baixas', anada: '2023', uva: 'Albariño', proveedorId: caribe, costo: 1250, precio: 2200, minimo: 4, maximo: 12 }),
      sauvignon: await guardarProducto(db, { ...base, codigo: 'VB-002', nombre: 'Santa Rita 120 Sauvignon Blanc', categoriaId: cat('Blanco'), bodega: 'Santa Rita', pais: 'Chile', uva: 'Sauvignon Blanc', proveedorId: vinosSur, costo: 520, precio: 950, minimo: 6 }),
      rosado: await guardarProducto(db, { ...base, codigo: 'VR-001', nombre: 'Whispering Angel Rosé', categoriaId: cat('Rosado'), bodega: "Château d'Esclans", pais: 'Francia', region: 'Provenza', anada: '2023', uva: 'Garnacha', proveedorId: caribe, costo: 1900, precio: 3400, minimo: 3, maximo: 12 }),
      moet: await guardarProducto(db, { ...base, codigo: 'ES-001', nombre: 'Moët & Chandon Brut Impérial', categoriaId: cat('Espumoso'), bodega: 'Moët & Chandon', pais: 'Francia', region: 'Champagne', proveedorId: licores, costo: 3800, precio: 6500, minimo: 4, maximo: 12 }),
      oporto: await guardarProducto(db, { ...base, codigo: 'DF-001', nombre: "Taylor's Oporto 10 años", categoriaId: cat('Dulce/Fortificado'), bodega: "Taylor's", pais: 'Portugal', region: 'Douro', proveedorId: licores, costo: 2100, precio: 3900, minimo: 2, maximo: 6 }),
      ron: await guardarProducto(db, { ...base, codigo: 'DS-001', nombre: 'Ron Barceló Imperial', categoriaId: cat('Destilado'), bodega: 'Ron Barceló', pais: 'República Dominicana', proveedorId: licores, costo: 1350, precio: 2500, minimo: 6, maximo: 18, notas: 'Muy pedido en el bar los fines de semana.' }),
      presidente: await guardarProducto(db, { ...base, codigo: 'CE-001', nombre: 'Cerveza Presidente', categoriaId: cat('Cerveza'), bodega: 'Cervecería Nacional Dominicana', pais: 'República Dominicana', tamano: '650 ml', proveedorId: caribe, costo: 95, precio: 250, minimo: 24, maximo: 96 }),
    };

    const resp = 'Ana (ejemplo)';
    const mov = (m: Parameters<typeof registrarMovimiento>[1]) =>
      registrarMovimiento(db, { responsable: resp, esEjemplo: true, ...m });

    // 1. Entradas por compra (hace 3 semanas)
    const entradas: [number, number, number][] = [
      [P.riscal, 18, cava], [P.catena, 12, cava], [P.casillero, 24, almacen], [P.albarino, 8, cava],
      [P.sauvignon, 12, almacen], [P.rosado, 6, cava], [P.moet, 8, cava], [P.oporto, 4, cava],
      [P.ron, 12, almacen], [P.presidente, 72, almacen],
    ];
    for (const [productoId, cantidad, ubicacionId] of entradas) {
      await mov({ tipo: 'entrada', productoId, cantidad, ubicacionId, motivo: 'Compra inicial', fecha: haceDias(21, 10) });
    }

    // 2. Transferencias al Bar y al Restaurante
    await mov({ tipo: 'transferencia', productoId: P.riscal, cantidad: 6, ubicacionId: cava, destinoId: bar, fecha: haceDias(18) });
    await mov({ tipo: 'transferencia', productoId: P.presidente, cantidad: 48, ubicacionId: almacen, destinoId: bar, fecha: haceDias(18) });
    await mov({ tipo: 'transferencia', productoId: P.ron, cantidad: 8, ubicacionId: almacen, destinoId: bar, fecha: haceDias(17) });
    await mov({ tipo: 'transferencia', productoId: P.casillero, cantidad: 12, ubicacionId: almacen, destinoId: resto, fecha: haceDias(17) });
    await mov({ tipo: 'transferencia', productoId: P.sauvignon, cantidad: 6, ubicacionId: almacen, destinoId: resto, fecha: haceDias(16) });
    await guardarMinimoUbicacion(db, P.presidente, bar, 24);

    // 3. Ventas y consumo
    await mov({ tipo: 'salida', productoId: P.riscal, cantidad: 4, ubicacionId: bar, motivo: 'Venta', fecha: haceDias(12, 21) });
    await mov({ tipo: 'salida', productoId: P.presidente, cantidad: 30, ubicacionId: bar, motivo: 'Venta', fecha: haceDias(9, 22) });
    await mov({ tipo: 'salida', productoId: P.ron, cantidad: 3, ubicacionId: bar, motivo: 'Venta', fecha: haceDias(8, 23) });
    await mov({ tipo: 'salida', productoId: P.casillero, cantidad: 8, ubicacionId: resto, motivo: 'Venta', fecha: haceDias(6, 20) });
    await mov({ tipo: 'salida', productoId: P.albarino, cantidad: 5, ubicacionId: cava, motivo: 'Venta', fecha: haceDias(5, 20) });
    await mov({ tipo: 'salida', productoId: P.catena, cantidad: 7, ubicacionId: cava, motivo: 'Consumo del restaurante', fecha: haceDias(4, 19) });

    // 4. Decomiso
    await mov({ tipo: 'decomiso', productoId: P.moet, cantidad: 1, ubicacionId: cava, motivo: 'Botella rota', nota: 'Se cayó al reorganizar el estante.', fecha: haceDias(10) });
    await mov({ tipo: 'decomiso', productoId: P.riscal, cantidad: 1, ubicacionId: cava, motivo: 'Corcho dañado', fecha: haceDias(3) });

    // 5. Pruebas de boda / degustación
    await mov({ tipo: 'prueba', productoId: P.moet, cantidad: 1, ubicacionId: cava, clienteEvento: 'Boda Pérez-Gómez', fechaEvento: sumarDias(diaLocal(), 45), responsable: 'Carlos (ejemplo)', fecha: haceDias(7, 16) });
    await mov({ tipo: 'prueba', productoId: P.rosado, cantidad: 1, ubicacionId: cava, clienteEvento: 'Boda Pérez-Gómez', fechaEvento: sumarDias(diaLocal(), 45), responsable: 'Carlos (ejemplo)', fecha: haceDias(7, 16) });
    await mov({ tipo: 'prueba', productoId: P.albarino, cantidad: 1, ubicacionId: cava, clienteEvento: 'Cena de empresa Banco Ejemplo', fechaEvento: sumarDias(diaLocal(), 20), responsable: resp, fecha: haceDias(2, 15) });

    // 6. Ajuste por conteo físico (faltó 1 botella de Catena en la cava)
    await mov({ tipo: 'ajuste', productoId: P.catena, ubicacionId: cava, conteoReal: 4, nota: 'Conteo mensual', fecha: haceDias(1, 9) });

    // 7. Pedidos en tránsito: uno atrasado, uno recibido en parte, uno al día
    await crearPedido(db, { proveedorId: vinosSur, fechaPedido: sumarDias(diaLocal(), -10), fechaEstimada: sumarDias(diaLocal(), -2), ubicacionId: cava, responsable: resp, lineas: [{ productoId: P.catena, cantidad: 12 }], esEjemplo: true });
    const parcial = await crearPedido(db, { proveedorId: licores, fechaPedido: sumarDias(diaLocal(), -6), fechaEstimada: sumarDias(diaLocal(), 2), ubicacionId: cava, responsable: resp, lineas: [{ productoId: P.moet, cantidad: 6 }, { productoId: P.oporto, cantidad: 2 }], esEjemplo: true });
    const lp = (await obtenerPedido(db, parcial))!.lineas;
    await recibirPedido(db, parcial, { ubicacionId: cava, responsable: resp, recepciones: [{ lineaId: lp[0].id, cantidad: 4 }], fecha: haceDias(1, 14), esEjemplo: true });
    await crearPedido(db, { proveedorId: caribe, fechaPedido: diaLocal(), fechaEstimada: sumarDias(diaLocal(), 5), ubicacionId: almacen, responsable: resp, lineas: [{ productoId: P.presidente, cantidad: 48 }], esEjemplo: true });
  });
}

/** Borra todo lo marcado como ejemplo (productos, movimientos, pedidos y proveedores de ejemplo). */
export async function borrarEjemplos(db: DB): Promise<void> {
  await db.tx(async () => {
    const ids = '(SELECT id FROM productos WHERE es_ejemplo = 1)';
    await db.run(`DELETE FROM movimientos WHERE es_ejemplo = 1 OR producto_id IN ${ids}`);
    await db.run(`DELETE FROM pedido_lineas WHERE producto_id IN ${ids}`);
    await db.run('DELETE FROM pedidos WHERE es_ejemplo = 1 OR id NOT IN (SELECT DISTINCT pedido_id FROM pedido_lineas)');
    await db.run(`DELETE FROM existencias WHERE producto_id IN ${ids}`);
    await db.run('DELETE FROM productos WHERE es_ejemplo = 1');
    await db.run(
      'DELETE FROM proveedores WHERE es_ejemplo = 1 AND id NOT IN (SELECT proveedor_id FROM productos WHERE proveedor_id IS NOT NULL)',
    );
  });
}
