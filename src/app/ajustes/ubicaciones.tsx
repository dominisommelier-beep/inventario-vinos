import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { Boton, Campo, Cargando, estilos, Pantalla, Tarjeta, Texto, Titulo } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { useCargar } from '../../hooks/useCargar';
import { cambiarUbicacionActiva, crearUbicacion, listarUbicaciones, renombrarUbicacion } from '../../logic/catalogos';
import { colores, letra } from '../../theme';
import { mensajeError } from '../../utils/formato';

export default function Ubicaciones() {
  const { db, cambio } = useApp();
  const { datos } = useCargar(async (d) => ({
    ubicaciones: await listarUbicaciones(d, true),
    totales: await d.all<{ ubicacion_id: number; n: number }>('SELECT ubicacion_id, SUM(cantidad) AS n FROM existencias GROUP BY ubicacion_id'),
  }));
  const [nueva, setNueva] = useState('');
  const [editando, setEditando] = useState<{ id: number; nombre: string } | null>(null);

  const hacer = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      cambio();
    } catch (e) {
      Alert.alert('No se pudo', mensajeError(e));
    }
  };

  if (!datos) return <Cargando />;
  return (
    <>
      <Stack.Screen options={{ title: 'Ubicaciones' }} />
      <Pantalla>
        <Texto suave>
          Los lugares donde guardas botellas. La existencia se lleva por ubicación y la app suma el total. Desactivar una ubicación la oculta (solo si está vacía).
        </Texto>
        <Titulo>Tus ubicaciones</Titulo>
        {datos.ubicaciones.map((u) => {
          const n = datos.totales.find((t) => t.ubicacion_id === u.id)?.n ?? 0;
          return (
            <Tarjeta key={u.id} style={{ opacity: u.activa ? 1 : 0.6 }}>
              {editando?.id === u.id ? (
                <View style={{ gap: 8 }}>
                  <TextInput value={editando.nombre} onChangeText={(t) => setEditando({ ...editando, nombre: t })} style={estilos.input} autoFocus />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Boton texto="Guardar" pequeno style={{ flex: 1 }} onPress={() => hacer(async () => { await renombrarUbicacion(db, u.id, editando.nombre); setEditando(null); })} />
                    <Boton texto="Cancelar" pequeno variante="secundario" style={{ flex: 1 }} onPress={() => setEditando(null)} />
                  </View>
                </View>
              ) : (
                <>
                  <Text style={{ fontSize: letra.grande - 1, fontWeight: '700', color: colores.texto }}>
                    {u.nombre}
                    {u.activa ? '' : ' (desactivada)'}
                  </Text>
                  <Texto suave>{n} unidad(es) guardadas aquí</Texto>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Boton texto="Renombrar" icono="pencil" pequeno variante="secundario" style={{ flex: 1 }} onPress={() => setEditando({ id: u.id, nombre: u.nombre })} />
                    <Boton
                      texto={u.activa ? 'Desactivar' : 'Activar'}
                      icono={u.activa ? 'eye-off' : 'eye'}
                      pequeno
                      variante="suave"
                      style={{ flex: 1 }}
                      onPress={() =>
                        u.activa
                          ? Alert.alert('¿Desactivar ubicación?', `"${u.nombre}" dejará de aparecer en los formularios. Puedes activarla de nuevo cuando quieras.`, [
                              { text: 'No', style: 'cancel' },
                              { text: 'Sí, desactivar', onPress: () => hacer(() => cambiarUbicacionActiva(db, u.id, false)) },
                            ])
                          : hacer(() => cambiarUbicacionActiva(db, u.id, true))
                      }
                    />
                  </View>
                </>
              )}
            </Tarjeta>
          );
        })}
        <Titulo>Agregar ubicación</Titulo>
        <Campo etiqueta="Nombre" valor={nueva} onCambio={setNueva} ejemplo="Ej.: Terraza o Salón de eventos" />
        <Boton texto="Agregar" icono="plus" onPress={() => hacer(async () => { await crearUbicacion(db, nueva); setNueva(''); })} />
      </Pantalla>
    </>
  );
}
