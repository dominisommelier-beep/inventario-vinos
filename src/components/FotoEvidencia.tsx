import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { obtenerFoto } from '../services/fotos';
import { colores, letra } from '../theme';
import { Boton, estilos } from './ui';

/** Foto opcional (de un producto o como evidencia de un movimiento). */
export function FotoEvidencia({
  uri,
  onCambio,
  etiqueta = 'Foto (opcional)',
}: {
  uri: string | null;
  onCambio: (uri: string | null) => void;
  etiqueta?: string;
}) {
  const tomar = async (origen: 'camara' | 'galeria') => {
    const f = await obtenerFoto(origen);
    if (f) onCambio(f.uri);
  };
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      {uri ? (
        <View style={{ gap: 8 }}>
          <Image source={{ uri }} style={{ width: '100%', height: 200, borderRadius: 12, backgroundColor: colores.cremaOscura }} resizeMode="cover" />
          <Pressable onPress={() => onCambio(null)}>
            <Text style={{ color: colores.rojo, fontSize: letra.normal, fontWeight: '600' }}>Quitar foto</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Boton texto="Tomar foto" icono="camera" variante="secundario" pequeno style={{ flex: 1 }} onPress={() => tomar('camara')} />
          <Boton texto="Galería" icono="image" variante="secundario" pequeno style={{ flex: 1 }} onPress={() => tomar('galeria')} />
        </View>
      )}
    </View>
  );
}
