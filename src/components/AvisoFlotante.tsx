import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../estado/AppContext';
import { colores, letra } from '../theme';
import { mensajeError } from '../utils/formato';

/** Aviso que aparece abajo después de guardar, con el botón "Deshacer". */
export function AvisoFlotante() {
  const { aviso, cerrarAviso, cambio } = useApp();
  const [ocupado, setOcupado] = useState(false);
  const insets = useSafeAreaInsets();
  if (!aviso) return null;

  const deshacer = async () => {
    if (!aviso.deshacer || ocupado) return;
    setOcupado(true);
    try {
      await aviso.deshacer();
      cerrarAviso();
      cambio();
      Alert.alert('Listo', 'El movimiento se deshizo y la existencia volvió a como estaba.');
    } catch (e) {
      Alert.alert('No se pudo deshacer', mensajeError(e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <View
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: insets.bottom + 76,
        backgroundColor: colores.vinoOscuro,
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        elevation: 8,
      }}
    >
      <Text style={{ flex: 1, color: colores.blanco, fontSize: letra.normal - 1 }}>{aviso.texto}</Text>
      {aviso.deshacer ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Deshacer"
          onPress={deshacer}
          style={{ backgroundColor: colores.dorado, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <Text style={{ color: colores.vinoOscuro, fontWeight: '800', fontSize: letra.normal - 1 }}>{ocupado ? '…' : 'DESHACER'}</Text>
        </Pressable>
      ) : (
        <Pressable onPress={cerrarAviso} hitSlop={10}>
          <Text style={{ color: colores.dorado, fontWeight: '700', fontSize: letra.normal - 1 }}>OK</Text>
        </Pressable>
      )}
    </View>
  );
}
