// Interfaz mínima de base de datos. En el teléfono la implementa expo-sqlite;
// en las pruebas automáticas la implementa node:sqlite. Así las reglas del
// negocio se prueban igual que como funcionan en la app.

export type Param = string | number | null;

export interface DB {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: Param[]): Promise<{ lastInsertRowId: number; changes: number }>;
  all<T>(sql: string, params?: Param[]): Promise<T[]>;
  first<T>(sql: string, params?: Param[]): Promise<T | null>;
  /** Ejecuta todo o nada: si algo falla, no se guarda ningún cambio. */
  tx<T>(fn: () => Promise<T>): Promise<T>;
}

/** Error con un mensaje pensado para mostrarse tal cual al usuario. */
export class ErrorUsuario extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorUsuario';
  }
}

/**
 * Crea la función tx(): las transacciones se ejecutan una a la vez, y una
 * transacción dentro de otra simplemente forma parte de la de afuera.
 */
export function crearTx(exec: (sql: string) => Promise<void>) {
  let cola: Promise<unknown> = Promise.resolve();
  let dentro = false;
  return function tx<T>(fn: () => Promise<T>): Promise<T> {
    if (dentro) return fn();
    const correr = async () => {
      dentro = true;
      await exec('BEGIN');
      try {
        const r = await fn();
        await exec('COMMIT');
        return r;
      } catch (e) {
        await exec('ROLLBACK');
        throw e;
      } finally {
        dentro = false;
      }
    };
    const siguiente = cola.then(correr, correr);
    cola = siguiente.catch(() => undefined);
    return siguiente;
  };
}

export function limpiarParams(params?: Param[]): Param[] {
  return (params ?? []).map((p) => (p === undefined ? null : p));
}
