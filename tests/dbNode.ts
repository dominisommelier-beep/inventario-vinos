// Base de datos en memoria para las pruebas (usa node:sqlite, incluido en Node 22).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite');
import { migrar } from '../src/db/schema';
import { crearTx, DB, limpiarParams, Param } from '../src/db/types';

export async function crearDBPrueba(): Promise<DB> {
  const raw = new DatabaseSync(':memory:');
  const exec = async (sql: string) => {
    raw.exec(sql);
  };
  const db: DB = {
    exec,
    run: async (sql: string, params?: Param[]) => {
      const r = raw.prepare(sql).run(...limpiarParams(params));
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    all: async <T,>(sql: string, params?: Param[]) => raw.prepare(sql).all(...limpiarParams(params)) as T[],
    first: async <T,>(sql: string, params?: Param[]) => (raw.prepare(sql).get(...limpiarParams(params)) as T) ?? null,
    tx: crearTx(exec),
  };
  await migrar(db);
  return db;
}
