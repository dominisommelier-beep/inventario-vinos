import * as SQLite from 'expo-sqlite';
import { migrar } from './schema';
import { crearTx, DB, limpiarParams, Param } from './types';

export const ARCHIVO_REAL = 'micava.db';
export const ARCHIVO_PRACTICA = 'micava-practica.db';

/** Abre (o crea) la base de datos guardada en el teléfono. */
export async function abrirDB(archivo: string): Promise<DB> {
  const raw = await SQLite.openDatabaseAsync(archivo);
  const exec = (sql: string) => raw.execAsync(sql);
  const db: DB = {
    exec,
    run: async (sql: string, params?: Param[]) => {
      const r = await raw.runAsync(sql, limpiarParams(params));
      return { lastInsertRowId: r.lastInsertRowId, changes: r.changes };
    },
    all: <T,>(sql: string, params?: Param[]) => raw.getAllAsync<T>(sql, limpiarParams(params)),
    first: <T,>(sql: string, params?: Param[]) => raw.getFirstAsync<T>(sql, limpiarParams(params)),
    tx: crearTx(exec),
  };
  await db.exec('PRAGMA journal_mode = WAL;');
  await migrar(db);
  return db;
}

export async function borrarArchivoDB(archivo: string): Promise<void> {
  try {
    await SQLite.deleteDatabaseAsync(archivo);
  } catch {
    // Si no existía, no pasa nada.
  }
}
