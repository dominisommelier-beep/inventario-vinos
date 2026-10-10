import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Boton, BotonAyuda, Cargando, Pantalla, Tarjeta, Texto, Titulo } from '../components/ui';
import { useApp } from '../estado/AppContext';
import { useCargar } from '../hooks/useCargar';
import { diaLocal, fechaBonita, nombreMes } from '../logic/fechas';
import { csvInventario, csvMovimientos, csvReposicion } from '../logic/exportar';
import { detallePruebas, pruebasPorMes, reporteMensual } from '../logic/reportes';
import { compartirArchivo, nombreConFecha } from '../services/archivos';
import { colores, letra } from '../theme';
import { dinero, mensajeError, plural } from '../utils/formato';

function moverMes(mes: string, delta: number): string {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const COLOR_FILA: Record<string, string> = {
  entrada: colores.verde,
  salida: colores.vino,
  transferencia: colores.azul,
  decomiso: colores.rojo,
  prueba: colores.doradoOscuro,
  faltante: colores.rojo,
  sobrante: colores.azul,
};

export default function Reportes() {
  const { db } = useApp();
  const [mes, setMes] = useState(diaLocal().slice(0, 7));
  const anio = Number(mes.slice(0, 4));
  const { datos } = useCargar(
    async (d) => ({
      filas: await reporteMensual(d, mes),
      pruebas: await pruebasPorMes(d, anio),
      detalle: await detallePruebas(d, mes),
    }),
    [mes],
  );

  const exportar = async (que: 'inventario' | 'movimientos' | 'reposicion') => {
    try {
      const csv = que === 'inventario' ? await csvInventario(db) : que === 'movimientos' ? await csvMovimientos(db) : await csvReposicion(db);
      await compartirArchivo(nombreConFecha(que, 'csv'), csv, 'text/csv');
    } catch (e) {
      Alert.alert('No se pudo exportar', mensajeError(e));
    }
  };

  const totalPruebasAnio = datos?.pruebas.reduce((s, p) => s + p.costo, 0) ?? 0;
  const maxPrueba = Math.max(1, ...(datos?.pruebas.map((p) => p.costo) ?? [1]));

  return (
    <>
      <Stack.Screen options={{ title: 'Reportes', headerRight: () => <BotonAyuda clave="reportes" /> }} />
      <Pantalla>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Boton texto="◀" pequeno variante="secundario" onPress={() => setMes(moverMes(mes, -1))} />
          <Text style={{ flex: 1, textAlign: 'center', fontSize: letra.grande, fontWeight: '700', color: colores.vino, textTransform: 'capitalize' }}>
            {nombreMes(mes)}
          </Text>
          <Boton texto="▶" pequeno variante="secundario" onPress={() => setMes(moverMes(mes, 1))} />
        </View>

        {!datos ? (
          <Cargando />
        ) : (
          <>
            <Titulo>Resumen del mes (a costo)</Titulo>
            <Tarjeta>
              {datos.filas.map((f) => (
                <View
                  key={f.clave}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colores.cremaOscura, gap: 8 }}
                >
                  <View style={{ width: 10, height: 36, borderRadius: 5, backgroundColor: COLOR_FILA[f.clave] }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: letra.normal - 1, color: colores.texto, fontWeight: '600' }}>{f.titulo}</Text>
                    <Text style={{ fontSize: letra.pequena, color: colores.textoSuave }}>
                      {plural(f.unidades, 'unidad', 'unidades')} · {plural(f.movimientos, 'movimiento', 'movimientos')}
                    </Text>
                  </View>
                  <Text style={{ fontSize: letra.normal, fontWeight: '800', color: COLOR_FILA[f.clave] }}>{dinero(f.costo)}</Text>
                </View>
              ))}
            </Tarjeta>

            <Titulo>Pruebas de boda y degustaciones · {anio}</Titulo>
            <Tarjeta>
              <Texto negrita>Total del año: {dinero(totalPruebasAnio)}</Texto>
              <View style={{ height: 8 }} />
              {datos.pruebas.map((p) => (
                <View key={p.mes} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Text style={{ width: 44, fontSize: letra.pequena, color: colores.textoSuave, textTransform: 'capitalize' }}>
                    {nombreMes(p.mes).slice(0, 3)}
                  </Text>
                  <View style={{ flex: 1, height: 18, backgroundColor: colores.crema, borderRadius: 9, overflow: 'hidden' }}>
                    <View style={{ width: `${(p.costo / maxPrueba) * 100}%`, height: '100%', backgroundColor: colores.dorado }} />
                  </View>
                  <Text style={{ width: 110, textAlign: 'right', fontSize: letra.pequena, color: colores.texto }}>{dinero(p.costo)}</Text>
                </View>
              ))}
            </Tarjeta>

            {datos.detalle.length ? (
              <>
                <Titulo>Pruebas de {nombreMes(mes)}</Titulo>
                <Tarjeta>
                  {datos.detalle.map((d) => (
                    <View key={d.cliente_evento} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colores.cremaOscura }}>
                      <Text style={{ fontSize: letra.normal - 1, fontWeight: '700', color: colores.texto }}>{d.cliente_evento}</Text>
                      <Text style={{ fontSize: letra.pequena, color: colores.textoSuave }}>
                        {d.unidades} botella(s) · {dinero(d.costo)}
                        {d.fecha_evento ? ` · Evento: ${fechaBonita(d.fecha_evento)}` : ''}
                        {d.responsable ? ` · ${d.responsable}` : ''}
                      </Text>
                    </View>
                  ))}
                </Tarjeta>
              </>
            ) : null}
          </>
        )}

        <Titulo>Exportar a Excel (CSV)</Titulo>
        <Texto suave>Se abre el menú de compartir: puedes enviarlo por correo, WhatsApp o guardarlo en Drive. Excel lo abre directamente.</Texto>
        <View style={{ gap: 10, marginTop: 10 }}>
          <Boton texto="Inventario" icono="microsoft-excel" variante="secundario" onPress={() => exportar('inventario')} />
          <Boton texto="Movimientos" icono="microsoft-excel" variante="secundario" onPress={() => exportar('movimientos')} />
          <Boton texto="Reposición" icono="microsoft-excel" variante="secundario" onPress={() => exportar('reposicion')} />
        </View>
      </Pantalla>
    </>
  );
}
