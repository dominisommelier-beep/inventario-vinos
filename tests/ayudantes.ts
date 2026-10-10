import { DB } from '../src/db/types';
import { listarUbicaciones } from '../src/logic/catalogos';
import { guardarProducto } from '../src/logic/productos';

export async function ubicaciones(db: DB) {
  const us = await listarUbicaciones(db);
  const id = (n: string) => us.find((u) => u.nombre === n)!.id;
  return { cava: id('Cava principal'), bar: id('Bar'), restaurante: id('Restaurante'), almacen: id('Almacén') };
}

export function crearProducto(db: DB, extra: Partial<Parameters<typeof guardarProducto>[1]> = {}) {
  return guardarProducto(db, {
    codigo: 'VT-001',
    nombre: 'Marqués de Riscal Reserva',
    categoriaId: 1,
    costo: 1000,
    precio: 1800,
    minimo: 6,
    maximo: 24,
    ...extra,
  });
}
