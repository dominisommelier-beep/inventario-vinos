import type { DB } from './types';

export const VERSION_ESQUEMA = 1;

export const CATEGORIAS_BASE = [
  'Tinto',
  'Blanco',
  'Rosado',
  'Espumoso',
  'Dulce/Fortificado',
  'Destilado',
  'Cerveza',
  'Otro',
];

export const UBICACIONES_BASE = ['Cava principal', 'Bar', 'Restaurante', 'Almacén'];

const ESQUEMA_V1 = `
CREATE TABLE IF NOT EXISTS ajustes (
  clave TEXT PRIMARY KEY,
  valor TEXT
);

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS ubicaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE COLLATE NOCASE,
  activa INTEGER NOT NULL DEFAULT 1,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS proveedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  telefono TEXT,
  correo TEXT,
  es_ejemplo INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nombre TEXT NOT NULL,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  bodega TEXT,
  pais TEXT,
  region TEXT,
  anada TEXT,
  uva TEXT,
  tamano TEXT,
  proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
  costo REAL NOT NULL DEFAULT 0,
  precio REAL NOT NULL DEFAULT 0,
  minimo INTEGER NOT NULL DEFAULT 0,
  maximo INTEGER,
  foto TEXT,
  notas TEXT,
  es_ejemplo INTEGER NOT NULL DEFAULT 0,
  creado TEXT NOT NULL
);

-- Existencia de cada producto en cada ubicación. Nunca puede ser negativa.
CREATE TABLE IF NOT EXISTS existencias (
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  ubicacion_id INTEGER NOT NULL REFERENCES ubicaciones(id),
  cantidad INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  minimo INTEGER,
  PRIMARY KEY (producto_id, ubicacion_id)
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
  fecha_pedido TEXT NOT NULL,
  fecha_estimada TEXT,
  estado TEXT NOT NULL DEFAULT 'en_camino',
  ubicacion_id INTEGER REFERENCES ubicaciones(id),
  responsable TEXT,
  nota TEXT,
  es_ejemplo INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pedido_lineas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  recibida INTEGER NOT NULL DEFAULT 0 CHECK (recibida >= 0),
  costo_unitario REAL NOT NULL DEFAULT 0
);

-- Historial: cada cambio de existencia queda registrado aquí.
-- cantidad: unidades del movimiento (en ajustes es la diferencia, con signo).
CREATE TABLE IF NOT EXISTS movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL,
  ubicacion_id INTEGER REFERENCES ubicaciones(id),
  destino_id INTEGER REFERENCES ubicaciones(id),
  fecha TEXT NOT NULL,
  responsable TEXT,
  motivo TEXT,
  nota TEXT,
  foto TEXT,
  cliente_evento TEXT,
  fecha_evento TEXT,
  pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
  pedido_linea_id INTEGER,
  costo_unitario REAL NOT NULL DEFAULT 0,
  existencia_sistema INTEGER,
  existencia_contada INTEGER,
  deshecho INTEGER NOT NULL DEFAULT 0,
  es_ejemplo INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_mov_producto ON movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_mov_fecha ON movimientos(fecha);

-- Fotos de conteo que esperan internet para enviarse a la IA.
CREATE TABLE IF NOT EXISTS cola_fotos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uri TEXT NOT NULL,
  producto_id INTEGER,
  ubicacion_id INTEGER,
  creada TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  resultado TEXT,
  error TEXT
);
`;

export async function migrar(db: DB): Promise<void> {
  await db.exec('PRAGMA foreign_keys = ON;');
  const fila = await db.first<{ user_version: number }>('PRAGMA user_version');
  const version = fila?.user_version ?? 0;
  if (version < 1) {
    await db.exec(ESQUEMA_V1);
    await db.tx(async () => {
      for (const nombre of CATEGORIAS_BASE) {
        await db.run('INSERT OR IGNORE INTO categorias (nombre) VALUES (?)', [nombre]);
      }
      let orden = 0;
      for (const nombre of UBICACIONES_BASE) {
        await db.run('INSERT OR IGNORE INTO ubicaciones (nombre, orden) VALUES (?, ?)', [nombre, orden++]);
      }
    });
    await db.exec(`PRAGMA user_version = ${VERSION_ESQUEMA}`);
  }
}
