import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AvisoFlotante } from '../components/AvisoFlotante';
import { AppProvider, useApp } from '../estado/AppContext';
import { leerAjuste } from '../logic/catalogos';
import { procesarCola } from '../services/conteoFoto';
import { colores, letra } from '../theme';

function Arranque() {
  const { dbReal, db, cambio } = useApp();

  useEffect(() => {
    leerAjuste(dbReal, 'bienvenida_vista').then((v) => {
      if (v !== 'si') router.push('/bienvenida');
    });
    // Si quedaron fotos de conteo esperando internet, se procesan ahora.
    procesarCola(db)
      .then((n) => n > 0 && cambio())
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <View style={{ flex: 1, backgroundColor: colores.crema }}>
          <StatusBar style="light" />
          <Arranque />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colores.vino },
              headerTintColor: colores.blanco,
              headerTitleStyle: { fontSize: letra.grande, fontWeight: '700' },
              contentStyle: { backgroundColor: colores.crema },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="bienvenida" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          </Stack>
          <AvisoFlotante />
        </View>
      </AppProvider>
    </SafeAreaProvider>
  );
}
