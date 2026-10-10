import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { FilaMovimiento } from '../components/FilaMovimiento';
import { Boton, BotonAyuda, Campo, Cargando, estilos, Opciones, Texto, Vacio } from '../components/ui';
import { useApp } from '../estado/AppContext';
import { useCargar } from '../hooks/useCargar';
import { listarUbicaciones } from '../logic/catalogos';
import { esDiaValido } from '../logic/fechas';
import { csvMovimientos } from '../logic/exportar';
import { FiltrosHistorial, listarMovimientos, listarResponsables, NOMBRE_TIPO, TIPOS } from '../logic/movimientos';
import { obtenerProducto } from '../logic/productos';
import { compartirArchivo, nombreConFecha } from '../services/archivos';
import { espacio } from '../theme';
import { mensajeError } from '../utils/formato';

export default function Historial() {
  const params = useLocalSearchParams<{ productoId?: string }>();
  const { db } = useApp();
  const [productoId, setProductoId] = useState<number | null>(params.productoId ? Number(params.productoId) : null);
  const [filtros, setFiltros] = useState<FiltrosHistorial>({});
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [verFiltros, setVerFiltros] = useState(false);

  const f: FiltrosHistorial = {
    ...filtros,
    productoId,
    desde: esDiaValido(desde.trim()) ? desde.trim() : null,
    hasta: esDiaValido(hasta.trim()) ? hasta.trim() : null,
  };
  const { datos } = useCargar(
    async (d) => ({
      movimientos: await listarMovimientos(d, f),
      ubicaciones: await listarUbicaciones(d, true),
      responsables: await listarResponsables(d),
      producto: productoId ? await obtenerProducto(d, productoId) : null,
    }),
    [JSON.stringify(f)],
  );

  const exportar = async () => {
    try {
      await compartirArchivo(nombreConFecha('movimientos', 'csv'), await csvMovimientos(db), 'text/csv');
    } catch (e) {
      Alert.alert('No se pudo exportar', mensajeError(e));
    }
  };

  const nFiltros = [filtros.tipo, filtros.ubicacionId, filtros.responsable, f.desde, f.hasta].filter(Boolean).length;

  return (
    <View style={estilos.pantalla}>
      <Stack.Screen options={{ title: 'Historial', headerRight: () => <BotonAyuda clave="historial" /> }} />
      <View style={{ padding: espacio, paddingBottom: 6, gap: 8 }}>
        {datos?.producto ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Texto negrita>Solo: {datos.producto.nombre}</Texto>
            </View>
            <Boton texto="Ver todos" pequeno variante="suave" onPress={() => setProductoId(null)} />
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Boton
            texto={nFiltros ? `Filtros (${nFiltros})` : 'Filtros'}
            icono="filter-variant"
            variante="secundario"
            pequeno
            style={{ flex: 1 }}
            onPress={() => setVerFiltros(!verFiltros)}
          />
          <Boton texto="Exportar CSV" icono="microsoft-excel" variante="secundario" pequeno style={{ flex: 1 }} onPress={exportar} />
        </View>
        {verFiltros && datos ? (
          <View style={[estilos.tarjeta, { marginBottom: 0 }]}>
            <Opciones
              etiqueta="Tipo"
              permitirNinguno
              valor={filtros.tipo ?? null}
              onCambio={(v) => setFiltros({ ...filtros, tipo: v })}
              opciones={TIPOS.map((t) => ({ valor: t, texto: NOMBRE_TIPO[t] }))}
            />
            <Opciones
              etiqueta="Ubicación"
              permitirNinguno
              valor={filtros.ubicacionId ?? null}
              onCambio={(v) => setFiltros({ ...filtros, ubicacionId: v })}
              opciones={datos.ubicaciones.map((u) => ({ valor: u.id, texto: u.nombre }))}
            />
            {datos.responsables.length ? (
              <Opciones
                etiqueta="Responsable"
                permitirNinguno
                valor={filtros.responsable ?? null}
                onCambio={(v) => setFiltros({ ...filtros, responsable: v })}
                opciones={datos.responsables.map((r) => ({ valor: r, texto: r }))}
              />
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Campo etiqueta="Desde" valor={desde} onCambio={setDesde} ejemplo="2026-10-01" teclado="numbers-and-punctuation" />
              </View>
              <View style={{ flex: 1 }}>
                <Campo etiqueta="Hasta" valor={hasta} onCambio={setHasta} ejemplo="2026-10-31" teclado="numbers-and-punctuation" />
              </View>
            </View>
            {nFiltros ? (
              <Boton
                texto="Quitar filtros"
                variante="suave"
                pequeno
                onPress={() => {
                  setFiltros({});
                  setDesde('');
                  setHasta('');
                }}
              />
            ) : null}
          </View>
        ) : null}
      </View>
      {!datos ? (
        <Cargando />
      ) : (
        <FlatList
          data={datos.movimientos}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ paddingHorizontal: espacio, paddingBottom: 100 }}
          renderItem={({ item }) => <FilaMovimiento m={item} />}
          ListEmptyComponent={
            <Vacio
              icono="history"
              titulo="No hay movimientos"
              ejemplo={
                nFiltros || productoId
                  ? 'Ningún movimiento coincide con los filtros. Prueba quitando alguno.'
                  : 'Aquí aparecerá cada entrada, salida, transferencia, decomiso, prueba y ajuste. Ejemplo: registra la compra de 12 botellas con "Entrada".'
              }
            />
          }
        />
      )}
    </View>
  );
}
