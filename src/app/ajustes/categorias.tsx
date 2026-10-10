import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Boton, Campo, Cargando, Pantalla, Tarjeta, Texto, Titulo } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { useCargar } from '../../hooks/useCargar';
import { crearCategoria, eliminarCategoria, listarCategorias } from '../../logic/catalogos';
import { colores, letra } from '../../theme';
import { mensajeError } from '../../utils/formato';

export default function Categorias() {
  const { db, cambio } = useApp();
  const { datos } = useCargar(listarCategorias);
  const [nueva, setNueva] = useState('');

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
      <Stack.Screen options={{ title: 'Categorías' }} />
      <Pantalla>
        <Texto suave>Sirven para organizar y filtrar el inventario. Puedes crear las que necesites.</Texto>
        <Titulo>Categorías</Titulo>
        <Tarjeta>
          {datos.map((c) => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colores.cremaOscura }}>
              <Text style={{ flex: 1, fontSize: letra.normal, color: colores.texto }}>{c.nombre}</Text>
              <Pressable
                hitSlop={10}
                onPress={() =>
                  Alert.alert('¿Borrar categoría?', `Se borrará "${c.nombre}". Solo se puede si ningún producto la usa.`, [
                    { text: 'No', style: 'cancel' },
                    { text: 'Sí, borrar', style: 'destructive', onPress: () => hacer(() => eliminarCategoria(db, c.id)) },
                  ])
                }
              >
                <Text style={{ color: colores.rojo, fontSize: letra.pequena + 1 }}>Borrar</Text>
              </Pressable>
            </View>
          ))}
        </Tarjeta>
        <Titulo>Nueva categoría</Titulo>
        <Campo etiqueta="Nombre" valor={nueva} onCambio={setNueva} ejemplo="Ej.: Sake o Vermut" />
        <Boton texto="Agregar" icono="plus" onPress={() => hacer(async () => { await crearCategoria(db, nueva); setNueva(''); })} />
      </Pantalla>
    </>
  );
}
