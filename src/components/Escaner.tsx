import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colores, espacio, letra } from '../theme';
import { Boton } from './ui';

/** Ventana con la cámara para leer un código de barras. */
export function Escaner({ visible, onCodigo, onCerrar }: { visible: boolean; onCodigo: (codigo: string) => void; onCerrar: () => void }) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const leido = useRef(false);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCerrar}
      onShow={() => {
        leido.current = false;
      }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        {!permiso?.granted ? (
          <View style={{ flex: 1, justifyContent: 'center', padding: espacio, backgroundColor: colores.crema, gap: 16 }}>
            <Text style={{ fontSize: letra.grande, color: colores.texto, textAlign: 'center' }}>
              Para escanear códigos de barras, la app necesita usar la cámara.
            </Text>
            <Boton texto="Permitir la cámara" icono="camera" onPress={pedirPermiso} />
            <Boton texto="Cancelar" variante="secundario" onPress={onCerrar} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
              onBarcodeScanned={(r) => {
                if (leido.current || !r.data) return;
                leido.current = true;
                onCodigo(r.data.trim());
              }}
            />
            <View style={estilos.marco} pointerEvents="none" />
            <View style={estilos.abajo}>
              <Text style={estilos.texto}>Apunta al código de barras de la botella</Text>
              <Boton texto="Cancelar" icono="close" variante="secundario" onPress={onCerrar} />
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  marco: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    height: 160,
    borderWidth: 3,
    borderColor: colores.dorado,
    borderRadius: 16,
  },
  abajo: { position: 'absolute', bottom: 24, left: 16, right: 16, gap: 12 },
  texto: { color: '#fff', fontSize: letra.grande, textAlign: 'center', fontWeight: '700' },
});
