// Exportar a CSV (se abre en Excel) y copia de seguridad completa en JSON.

import { DB, ErrorUsuario } from '../db/types';
import { ahoraLocal } from './fechas';
import { listarMovimientos, NOMBRE_TIPO } from './movimientos';
import { listarResumen } from './productos';
import { NOMBRE_ESTADO } from './reposicion';
import { listarReposicion } from './reportes';
import { VERSION_ESQUEMA } from '../db/schema';

// ---------- CSV ----------

function celda(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV con BOM para que Excel muestre bien los acentos. */
export function aCSV(encabezados: string[], filas: unknown[][]): string {
  const lineas = [encabezados, ...filas].map((f) => f.map(celda).join(','));
  return '﻿' + lineas.join('\r\n');
}

export async function csvInventario(db: DB): Promise<string> {
  const productos = await listarResumen(db);
  const porUbic = await db.all<{ producto_id: number; nombre: string; cantidad: number }>(
    `SELECT e.producto_id, u.nombre, e.cantidad FROM existencias e JOIN ubicaciones u ON u.id = e.ubicacion_id
     WHERE e.cantidad > 0 ORDER BY u.orden`,
  );
  return aCSV(
    ['Código', 'Nombre', 'Categoría', 'Bodega', 'País', 'Región', 'Añada', 'Uva', 'Tamaño', 'Proveedor',
      'Costo', 'Precio', 'Existencia total', 'Por ubicación', 'Mínimo', 'Máximo', 'En tránsito', 'Estado', 'Valor a costo'],
    productos.map((p) => [
      p.codigo, p.nombre, p.categoria, p.bodega, p.pais, p.region, p.anada, p.uva, p.tamano, p.proveedor,
      p.costo, p.precio, p.total,
      porUbic.filter((x) => x.producto_id === p.id).map((x) => `${x.nombre}: ${x.cantidad}`).join(' | '),
      p.minimo, p.maximo ?? '', p.transito, NOMBRE_ESTADO[p.estado], p.total * p.costo,
    ]),
  );
}

export async function csvMovimientos(db: DB): Promise<string> {
  const movs = await listarMovimientos(db, { limite: 100000 });
  return aCSV(
    ['Fecha', 'Tipo', 'Código', 'Producto', 'Cantidad', 'Ubicación', 'Destino', 'Responsable', 'Motivo',
      'Cliente o evento', 'Fecha del evento', 'Existencia sistema', 'Existencia contada', 'Costo unitario', 'Costo total', 'Nota', 'Deshecho'],
    movs.map((m) => [
      m.fecha.replace('T', ' '), NOMBRE_TIPO[m.tipo], m.codigo, m.producto, m.cantidad, m.ubicacion, m.destino,
      m.responsable, m.motivo, m.cliente_evento, m.fecha_evento, m.existencia_sistema, m.existencia_contada,
      m.costo_unitario, Math.abs(m.cantidad) * m.costo_unitario, m.nota, m.deshecho ? 'Sí' : '',
    ]),
  );
}

export async function csvReposicion(db: DB): Promise<string> {
  const grupos = await listarReposicion(db);
  const filas: unknown[][] = [];
  for (const g of grupos) {
    for (const { producto: p, costoEstimado } of g.items) {
      filas.push([g.proveedor, g.telefono, g.correo, p.codigo, p.nombre, p.total, p.minimo, p.transito,
        p.pedidoEnCamino ? 'Pedido en camino' : p.sugerido, p.costo, costoEstimado]);
    }
  }
  return aCSV(
    ['Proveedor', 'Teléfono', 'Correo', 'Código', 'Producto', 'Existencia', 'Mínimo', 'En tránsito', 'Sugerido', 'Costo unitario', 'Costo estimado'],
    filas,
  );
}

// ---------- Copia de seguridad (JSON) ----------

const TABLAS = [
  'ajustes', 'categorias', 'ubicaciones', 'proveedores', 'productos', 'existencias',
  'pedidos', 'pedido_lineas', 'movimientos',
] as const;

export interface Respaldo {
  app: 'Mi Cava';
  version: number;
  creado: string;
  tablas: Record<string, Record<string, unknown>[]>;
}

export async function crearRespaldo(db: DB): Promise<Respaldo> {
  const tablas: Respaldo['tablas'] = {};
  for (const t of TABLAS) {
    tablas[t] = await db.all<Record<string, unknown>>(`SELECT * FROM ${t}`);
  }
  // La clave de la API nunca se guarda en la base de datos, así que no viaja en el respaldo.
  return { app: 'Mi Cava', version: VERSION_ESQUEMA, creado: ahoraLocal(), tablas };
}

/** Reemplaza TODOS los datos por los del respaldo. Si algo falla no cambia nada. */
export async function restaurarRespaldo(db: DB, datos: unknown): Promise<void> {
  const r = datos as Respaldo;
  if (!r || r.app !== 'Mi Cava' || typeof r.tablas !== 'object') {
    throw new ErrorUsuario('Este archivo no es una copia de seguridad de Mi Cava.');
  }
  if (r.version > VERSION_ESQUEMA) {
    throw new ErrorUsuario('Esta copia viene de una versión más nueva de la app. Actualiza Mi Cava primero.');
  }
  for (const t of ['categorias', 'ubicaciones', 'productos'] as const) {
    if (!Array.isArray(r.tablas[t])) throw new ErrorUsuario('La copia de seguridad está incompleta o dañada.');
  }
  await db.exec('PRAGMA foreign_keys = OFF;');
  try {
    await db.tx(async () => {
      for (const t of [...TABLAS].reverse()) await db.run(`DELETE FROM ${t}`);
      await db.run('DELETE FROM cola_fotos');
      for (const t of TABLAS) {
        const filas = r.tablas[t] ?? [];
        const columnas = (await db.all<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name);
        for (const fila of filas) {
          const cols = columnas.filter((c) => c in fila);
          if (cols.length === 0) continue;
          await db.run(
            `INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
            cols.map((c) => {
              const v = fila[c];
              return typeof v === 'number' || typeof v === 'string' ? v : v == null ? null : String(v);
            }),
          );
        }
      }
    });
  } finally {
    await db.exec('PRAGMA foreign_keys = ON;');
  }
}
