import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { DB } from '../db/types';
import { useApp } from '../estado/AppContext';

/**
 * Carga datos de la base cuando la pantalla aparece y cada vez que se guardan
 * cambios en cualquier parte de la app.
 */
export function useCargar<T>(cargar: (db: DB) => Promise<T>, deps: unknown[] = []) {
  const { db, version } = useApp();
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const turno = useRef(0);

  const recargar = useCallback(() => {
    const mio = ++turno.current;
    cargar(db)
      .then((d) => {
        if (mio === turno.current) {
          setDatos(d);
          setError(null);
        }
      })
      .catch((e) => mio === turno.current && setError(String(e?.message ?? e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version, ...deps]);

  useFocusEffect(recargar);

  return { datos, error, recargar };
}
