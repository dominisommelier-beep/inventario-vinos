import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { abrirDB, ARCHIVO_PRACTICA, ARCHIVO_REAL, borrarArchivoDB } from '../db/expo';
import { DB } from '../db/types';
import { guardarAjuste, leerAjuste } from '../logic/catalogos';
import { cargarEjemplos } from '../logic/ejemplos';
import { Alerta } from '../logic/movimientos';
import { avisarReposicion, prepararNotificaciones, reprogramarAlertas } from '../services/notificaciones';
import { colores, letra } from '../theme';

interface Aviso {
  id: number;
  texto: string;
  deshacer?: () => Promise<void>;
}

interface Ctx {
  /** Base de datos activa (la real, o la de práctica si el modo práctica está encendido). */
  db: DB;
  /** Siempre la base real: aquí viven los ajustes. */
  dbReal: DB;
  practica: boolean;
  cambiarPractica: (activar: boolean) => Promise<void>;
  reiniciarPractica: () => Promise<void>;
  /** Número que cambia cada vez que se guardan datos (para recargar pantallas). */
  version: number;
  /** Avisar que cambiaron datos: recarga pantallas y reprograma alertas. */
  cambio: (alertas?: Alerta[]) => void;
  aviso: Aviso | null;
  mostrarAviso: (texto: string, deshacer?: () => Promise<void>) => void;
  cerrarAviso: () => void;
  responsable: string;
  guardarResponsable: (nombre: string) => void;
}

const AppContext = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp fuera de AppProvider');
  return c;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [dbReal, setDbReal] = useState<DB | null>(null);
  const [dbPractica, setDbPractica] = useState<DB | null>(null);
  const [practica, setPractica] = useState(false);
  const [version, setVersion] = useState(0);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [responsable, setResponsable] = useState('');
  const [error, setError] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const real = await abrirDB(ARCHIVO_REAL);
        // La primera vez se cargan datos de ejemplo para aprender (se pueden borrar en Ajustes).
        if ((await leerAjuste(real, 'ejemplos_cargados')) !== 'si') {
          await cargarEjemplos(real);
          await guardarAjuste(real, 'ejemplos_cargados', 'si');
        }
        setResponsable((await leerAjuste(real, 'responsable')) ?? '');
        if ((await leerAjuste(real, 'modo_practica')) === 'si') {
          setDbPractica(await abrirDB(ARCHIVO_PRACTICA));
          setPractica(true);
        }
        setDbReal(real);
        if (await prepararNotificaciones()) await reprogramarAlertas(real);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, []);

  const cambio = useCallback(
    (alertas?: Alerta[]) => {
      setVersion((v) => v + 1);
      if (alertas?.length) avisarReposicion(alertas, practica).catch(() => undefined);
      if (dbReal) reprogramarAlertas(dbReal).catch(() => undefined);
    },
    [dbReal, practica],
  );

  const cambiarPractica = useCallback(
    async (activar: boolean) => {
      if (!dbReal) return;
      if (activar) {
        let p = dbPractica;
        if (!p) {
          p = await abrirDB(ARCHIVO_PRACTICA);
          await cargarEjemplos(p);
          setDbPractica(p);
        }
      }
      await guardarAjuste(dbReal, 'modo_practica', activar ? 'si' : 'no');
      setPractica(activar);
      setVersion((v) => v + 1);
    },
    [dbReal, dbPractica],
  );

  const reiniciarPractica = useCallback(async () => {
    setDbPractica(null);
    await borrarArchivoDB(ARCHIVO_PRACTICA);
    const p = await abrirDB(ARCHIVO_PRACTICA);
    await cargarEjemplos(p);
    setDbPractica(p);
    setVersion((v) => v + 1);
  }, []);

  const cerrarAviso = useCallback(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    setAviso(null);
  }, []);

  const mostrarAviso = useCallback((texto: string, deshacer?: () => Promise<void>) => {
    if (temporizador.current) clearTimeout(temporizador.current);
    setAviso({ id: Date.now(), texto, deshacer });
    temporizador.current = setTimeout(() => setAviso(null), deshacer ? 10000 : 4000);
  }, []);

  const guardarResponsable = useCallback(
    (nombre: string) => {
      const limpio = nombre.trim();
      if (!limpio || limpio === responsable || !dbReal) return;
      setResponsable(limpio);
      guardarAjuste(dbReal, 'responsable', limpio).catch(() => undefined);
    },
    [dbReal, responsable],
  );

  const valor = useMemo<Ctx | null>(() => {
    if (!dbReal) return null;
    const db = practica && dbPractica ? dbPractica : dbReal;
    return {
      db,
      dbReal,
      practica: practica && !!dbPractica,
      cambiarPractica,
      reiniciarPractica,
      version,
      cambio,
      aviso,
      mostrarAviso,
      cerrarAviso,
      responsable,
      guardarResponsable,
    };
  }, [dbReal, dbPractica, practica, cambiarPractica, reiniciarPractica, version, cambio, aviso, mostrarAviso, cerrarAviso, responsable, guardarResponsable]);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colores.crema }}>
        <Text style={{ fontSize: letra.grande, color: colores.rojo, marginBottom: 12 }}>No se pudo abrir la base de datos.</Text>
        <Text style={{ fontSize: letra.pequena, color: colores.texto }}>{error}</Text>
      </View>
    );
  }
  if (!valor) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colores.crema }}>
        <ActivityIndicator size="large" color={colores.vino} />
        <Text style={{ marginTop: 12, fontSize: letra.normal, color: colores.vino }}>Abriendo Mi Cava…</Text>
      </View>
    );
  }
  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>;
}
