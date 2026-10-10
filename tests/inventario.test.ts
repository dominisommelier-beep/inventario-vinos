import { ErrorUsuario } from '../src/db/types';
import { deshacerMovimiento, listarMovimientos, registrarMovimiento } from '../src/logic/movimientos';
import {
  existenciaEn,
  existenciasDeProducto,
  existenciaTotal,
  guardarMinimoUbicacion,
  guardarProducto,
  obtenerResumen,
} from '../src/logic/productos';
import { crearDBPrueba } from './dbNode';
import { crearProducto, ubicaciones } from './ayudantes';

describe('Existencias por ubicación', () => {
  test('cada ubicación guarda su propia existencia y el total las suma', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db);

    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 12, ubicacionId: u.cava });
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 5, ubicacionId: u.bar });

    expect(await existenciaEn(db, p, u.cava)).toBe(12);
    expect(await existenciaEn(db, p, u.bar)).toBe(5);
    expect(await existenciaEn(db, p, u.restaurante)).toBe(0);
    expect(await existenciaTotal(db, p)).toBe(17);

    const porUbic = await existenciasDeProducto(db, p);
    expect(porUbic.find((x) => x.ubicacion_id === u.cava)?.cantidad).toBe(12);
    expect(porUbic).toHaveLength(4);
  });

  test('una salida resta solo en su ubicación', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db);
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 10, ubicacionId: u.cava });
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 4, ubicacionId: u.bar });
    await registrarMovimiento(db, { tipo: 'salida', productoId: p, cantidad: 3, ubicacionId: u.bar });
    expect(await existenciaEn(db, p, u.bar)).toBe(1);
    expect(await existenciaEn(db, p, u.cava)).toBe(10);
    expect(await existenciaTotal(db, p)).toBe(11);
  });

  test('ningún movimiento deja existencias negativas', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db);
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 4, ubicacionId: u.bar });

    for (const tipo of ['salida', 'decomiso', 'prueba', 'transferencia'] as const) {
      await expect(
        registrarMovimiento(db, {
          tipo,
          productoId: p,
          cantidad: 5,
          ubicacionId: u.bar,
          destinoId: u.cava,
          motivo: 'Botella rota',
          clienteEvento: 'Boda Pérez',
          responsable: 'Ana',
        }),
      ).rejects.toThrow('si solo hay 4 en Bar');
    }
    expect(await existenciaEn(db, p, u.bar)).toBe(4);
    // Nada quedó registrado de los intentos fallidos
    expect(await listarMovimientos(db)).toHaveLength(1);
  });

  test('cantidades inválidas se rechazan con un mensaje claro', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db);
    await expect(registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 0, ubicacionId: u.cava })).rejects.toThrow(
      ErrorUsuario,
    );
    await expect(registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 2.5, ubicacionId: u.cava })).rejects.toThrow(
      'número entero',
    );
  });

  test('decomiso exige motivo y prueba de boda exige cliente y responsable', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db);
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 10, ubicacionId: u.cava });
    await expect(registrarMovimiento(db, { tipo: 'decomiso', productoId: p, cantidad: 1, ubicacionId: u.cava })).rejects.toThrow(
      'motivo',
    );
    await expect(
      registrarMovimiento(db, { tipo: 'prueba', productoId: p, cantidad: 1, ubicacionId: u.cava, responsable: 'Ana' }),
    ).rejects.toThrow('cliente');
    await registrarMovimiento(db, {
      tipo: 'prueba',
      productoId: p,
      cantidad: 2,
      ubicacionId: u.cava,
      responsable: 'Ana',
      clienteEvento: 'Boda Pérez-Gómez',
      fechaEvento: '2026-12-05',
    });
    expect(await existenciaTotal(db, p)).toBe(8);
  });

  test('el código del producto es único y los campos obligatorios se validan', async () => {
    const db = await crearDBPrueba();
    await crearProducto(db);
    await expect(crearProducto(db, { nombre: 'Otro vino' })).rejects.toThrow('ya lo usa');
    await expect(guardarProducto(db, { codigo: '', nombre: 'X', categoriaId: 1, minimo: 1 })).rejects.toThrow('código');
    await expect(guardarProducto(db, { codigo: 'A', nombre: 'X', categoriaId: 1, minimo: null })).rejects.toThrow('mínima');
    await expect(guardarProducto(db, { codigo: 'A', nombre: 'X', categoriaId: 1, minimo: 10, maximo: 5 })).rejects.toThrow(
      'no puede ser menor',
    );
  });
});

describe('Transferencias', () => {
  test('mueve unidades entre ubicaciones sin cambiar el total', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db);
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 12, ubicacionId: u.cava });

    await registrarMovimiento(db, { tipo: 'transferencia', productoId: p, cantidad: 6, ubicacionId: u.cava, destinoId: u.bar });

    expect(await existenciaEn(db, p, u.cava)).toBe(6);
    expect(await existenciaEn(db, p, u.bar)).toBe(6);
    expect(await existenciaTotal(db, p)).toBe(12);
  });

  test('no permite transferir más de lo que hay en el origen', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db);
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 4, ubicacionId: u.bar });
    await expect(
      registrarMovimiento(db, { tipo: 'transferencia', productoId: p, cantidad: 10, ubicacionId: u.bar, destinoId: u.cava }),
    ).rejects.toThrow('No puedes transferir 10 si solo hay 4 en Bar.');
    expect(await existenciaEn(db, p, u.bar)).toBe(4);
    expect(await existenciaEn(db, p, u.cava)).toBe(0);
  });

  test('origen y destino deben ser distintos', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db);
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 4, ubicacionId: u.bar });
    await expect(
      registrarMovimiento(db, { tipo: 'transferencia', productoId: p, cantidad: 1, ubicacionId: u.bar, destinoId: u.bar }),
    ).rejects.toThrow('distintos');
  });
});

describe('Ajuste por conteo físico', () => {
  test('corrige la existencia y registra el faltante', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db);
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 12, ubicacionId: u.cava });

    const { id } = await registrarMovimiento(db, { tipo: 'ajuste', productoId: p, ubicacionId: u.cava, conteoReal: 10 });

    expect(await existenciaEn(db, p, u.cava)).toBe(10);
    const [m] = await listarMovimientos(db, { tipo: 'ajuste' });
    expect(m.id).toBe(id);
    expect(m.cantidad).toBe(-2);
    expect(m.existencia_sistema).toBe(12);
    expect(m.existencia_contada).toBe(10);
  });

  test('registra el sobrante cuando hay más de lo esperado', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db);
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 3, ubicacionId: u.bar });
    await registrarMovimiento(db, { tipo: 'ajuste', productoId: p, ubicacionId: u.bar, conteoReal: 5 });
    expect(await existenciaEn(db, p, u.bar)).toBe(5);
    const [m] = await listarMovimientos(db, { tipo: 'ajuste' });
    expect(m.cantidad).toBe(2);
  });

  test('no acepta conteos negativos', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db);
    await expect(registrarMovimiento(db, { tipo: 'ajuste', productoId: p, ubicacionId: u.bar, conteoReal: -1 })).rejects.toThrow(
      'contaste',
    );
  });
});

describe('Deshacer', () => {
  test('deshacer una transferencia devuelve todo como estaba', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db);
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 12, ubicacionId: u.cava });
    const { id } = await registrarMovimiento(db, {
      tipo: 'transferencia',
      productoId: p,
      cantidad: 6,
      ubicacionId: u.cava,
      destinoId: u.bar,
    });
    await deshacerMovimiento(db, id);
    expect(await existenciaEn(db, p, u.cava)).toBe(12);
    expect(await existenciaEn(db, p, u.bar)).toBe(0);
    await expect(deshacerMovimiento(db, id)).rejects.toThrow('ya fue deshecho');
  });

  test('no deja deshacer una entrada si esas unidades ya salieron', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db);
    const { id } = await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 5, ubicacionId: u.bar });
    await registrarMovimiento(db, { tipo: 'salida', productoId: p, cantidad: 4, ubicacionId: u.bar });
    await expect(deshacerMovimiento(db, id)).rejects.toThrow('No se puede deshacer');
    expect(await existenciaEn(db, p, u.bar)).toBe(1);
  });

  test('deshacer un ajuste restaura la existencia del sistema', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db);
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 12, ubicacionId: u.cava });
    const { id } = await registrarMovimiento(db, { tipo: 'ajuste', productoId: p, ubicacionId: u.cava, conteoReal: 9 });
    await deshacerMovimiento(db, id);
    expect(await existenciaEn(db, p, u.cava)).toBe(12);
  });
});

describe('Alertas de reposición', () => {
  test('avisa cuando un movimiento deja el producto bajo mínimo', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db, { minimo: 6 });
    const r1 = await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 8, ubicacionId: u.cava });
    expect(r1.alertas).toHaveLength(0);
    const r2 = await registrarMovimiento(db, { tipo: 'salida', productoId: p, cantidad: 1, ubicacionId: u.cava });
    expect(r2.alertas).toHaveLength(0); // quedan 7
    const r3 = await registrarMovimiento(db, { tipo: 'salida', productoId: p, cantidad: 2, ubicacionId: u.cava });
    expect(r3.alertas).toEqual([{ productoId: p, nombre: 'Marqués de Riscal Reserva', quedan: 5, minimo: 6 }]);
  });

  test('una transferencia no dispara la alerta del total, pero sí la del mínimo por ubicación', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db, { minimo: 2 });
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 10, ubicacionId: u.bar });
    await guardarMinimoUbicacion(db, p, u.bar, 4);
    const r = await registrarMovimiento(db, { tipo: 'transferencia', productoId: p, cantidad: 7, ubicacionId: u.bar, destinoId: u.cava });
    expect(r.alertas).toEqual([{ productoId: p, nombre: 'Marqués de Riscal Reserva', quedan: 3, minimo: 4, ubicacion: 'Bar' }]);
  });

  test('el estado del producto cambia a agotado / bajo mínimo / bien', async () => {
    const db = await crearDBPrueba();
    const u = await ubicaciones(db);
    const p = await crearProducto(db, { minimo: 6 });
    expect((await obtenerResumen(db, p))?.estado).toBe('agotado');
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 6, ubicacionId: u.cava });
    expect((await obtenerResumen(db, p))?.estado).toBe('bajo');
    await registrarMovimiento(db, { tipo: 'entrada', productoId: p, cantidad: 1, ubicacionId: u.cava });
    expect((await obtenerResumen(db, p))?.estado).toBe('bien');
  });
});
