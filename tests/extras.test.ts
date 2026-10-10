import { construirInstrucciones, interpretarRespuesta } from '../src/logic/conteoIA';
import { borrarEjemplos, cargarEjemplos } from '../src/logic/ejemplos';
import { aCSV, crearRespaldo, csvInventario, restaurarRespaldo } from '../src/logic/exportar';
import { listarMovimientos, TIPOS } from '../src/logic/movimientos';
import { listarPedidos } from '../src/logic/pedidos';
import { existenciaTotal, listarResumen } from '../src/logic/productos';
import { pruebasPorMes, reporteMensual } from '../src/logic/reportes';
import { registrarMovimiento } from '../src/logic/movimientos';
import { crearDBPrueba } from './dbNode';
import { crearProducto, ubicaciones } from './ayudantes';

describe('Datos de ejemplo', () => {
  test('crea 10 productos y movimientos de todos los tipos, sin existencias negativas', async () => {
    const db = await crearDBPrueba();
    await cargarEjemplos(db);
    const productos = await listarResumen(db);
    expect(productos).toHaveLength(10);
    const tipos = new Set((await listarMovimientos(db)).map((m) => m.tipo));
    for (const t of TIPOS) expect(tipos.has(t)).toBe(true);
    const pedidos = await listarPedidos(db);
    expect(pedidos.map((p) => p.estado).sort()).toEqual(['en_camino', 'en_camino', 'parcial']);
    expect(pedidos.some((p) => p.atrasado)).toBe(true);
    const negativos = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM existencias WHERE cantidad < 0');
    expect(negativos?.n).toBe(0);
  });

  test('borrar los ejemplos deja la base vacía pero conserva lo real', async () => {
    const db = await crearDBPrueba();
    await cargarEjemplos(db);
    const u = await ubicaciones(db);
    const real = await crearProducto(db, { codigo: 'MIO-1' });
    await registrarMovimiento(db, { tipo: 'entrada', productoId: real, cantidad: 3, ubicacionId: u.cava });
    await borrarEjemplos(db);
    const productos = await listarResumen(db);
    expect(productos.map((p) => p.codigo)).toEqual(['MIO-1']);
    expect(await existenciaTotal(db, real)).toBe(3);
    expect(await listarPedidos(db)).toHaveLength(0);
  });
});

describe('Reportes', () => {
  test('reporte mensual en unidades y dinero a costo, y pruebas de boda por mes', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db, { costo: 1000 });
    const f = '2026-09-15T10:00:00';
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 10, ubicacionId: u.cava, fecha: f });
    await registrarMovimiento(db, { tipo: 'decomiso', productoId: p, cantidad: 2, ubicacionId: u.cava, motivo: 'Botella rota', fecha: f });
    await registrarMovimiento(db, { tipo: 'prueba', productoId: p, cantidad: 3, ubicacionId: u.cava, clienteEvento: 'Boda A', responsable: 'Ana', fecha: f });
    await registrarMovimiento(db, { tipo: 'ajuste', productoId: p, ubicacionId: u.cava, conteoReal: 4, fecha: f });

    const r = await reporteMensual(db, '2026-09');
    const fila = (c: string) => r.find((x) => x.clave === c)!;
    expect(fila('entrada')).toMatchObject({ unidades: 10, costo: 10000 });
    expect(fila('decomiso')).toMatchObject({ unidades: 2, costo: 2000 });
    expect(fila('prueba')).toMatchObject({ unidades: 3, costo: 3000 });
    expect(fila('faltante')).toMatchObject({ unidades: 1, costo: 1000 });
    expect(fila('sobrante').unidades).toBe(0);

    const pruebas = await pruebasPorMes(db, 2026);
    expect(pruebas).toHaveLength(12);
    expect(pruebas[8]).toMatchObject({ mes: '2026-09', unidades: 3, costo: 3000, eventos: 1 });
  });
});

describe('Exportar y copia de seguridad', () => {
  test('CSV escapa comas y comillas', () => {
    const csv = aCSV(['a', 'b'], [['x, y', 'dice "hola"']]);
    expect(csv).toBe('﻿a,b\r\n"x, y","dice ""hola"""');
  });

  test('el respaldo se restaura idéntico en otro teléfono', async () => {
    const origen = await crearDBPrueba();
    await cargarEjemplos(origen);
    const respaldo = JSON.parse(JSON.stringify(await crearRespaldo(origen)));

    const destino = await crearDBPrueba();
    await restaurarRespaldo(destino, respaldo);

    expect(await csvInventario(destino)).toBe(await csvInventario(origen));
    expect((await listarMovimientos(destino)).length).toBe((await listarMovimientos(origen)).length);
    expect(await listarPedidos(destino)).toEqual(await listarPedidos(origen));
  });

  test('rechaza archivos que no son respaldos y no toca los datos', async () => {
    const db = await crearDBPrueba();
    await crearProducto(db);
    await expect(restaurarRespaldo(db, { hola: 1 })).rejects.toThrow('no es una copia');
    expect(await listarResumen(db)).toHaveLength(1);
  });
});

describe('Conteo por foto (lectura de la respuesta de la IA)', () => {
  const productos = [
    { id: 1, codigo: 'VT-001', nombre: 'Marqués de Riscal', categoria: 'Tinto', descripcion: '' },
    { id: 2, codigo: 'ES-001', nombre: 'Moët', categoria: 'Espumoso', descripcion: '' },
  ];

  test('el mensaje incluye la lista de productos', () => {
    const t = construirInstrucciones(productos);
    expect(t).toContain('VT-001 | Marqués de Riscal | Tinto');
    expect(t).toContain('JSON');
  });

  test('enlaza códigos, suma repetidos y marca desconocidos', () => {
    const r = interpretarRespuesta(
      JSON.stringify({
        productos: [
          { codigo: 'vt-001', nombre: 'Riscal', cantidad: 5, confianza: 'alto', nota: '' },
          { codigo: 'VT-001', nombre: 'Riscal', cantidad: 2, confianza: 'medio', nota: '' },
          { codigo: '', nombre: 'Vino sin etiqueta', cantidad: 1, confianza: 'bajo', nota: 'No se lee la etiqueta' },
        ],
        nota_general: 'Foto algo oscura',
      }),
      productos,
    );
    expect(r.items[0]).toMatchObject({ productoId: 1, codigo: 'VT-001', cantidad: 7, confianza: 'alto' });
    expect(r.items[1]).toMatchObject({ productoId: null, nombre: 'Vino sin etiqueta', confianza: 'bajo' });
    expect(r.notaGeneral).toBe('Foto algo oscura');
  });

  test('una respuesta ilegible da un error claro', () => {
    expect(() => interpretarRespuesta('no es json', productos)).toThrow('no se pudo leer');
  });
});
