import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GUIAS } from '../ayuda';
import { Pantalla, PasosGuia, Tarjeta, Texto } from '../components/ui';
import { colores, letra } from '../theme';

export default function ComoSeHace() {
  const [abierta, setAbierta] = useState<string | null>(null);
  return (
    <>
      <Stack.Screen options={{ title: '¿Cómo se hace?' }} />
      <Pantalla>
        <Texto suave>Toca una tarea para ver los pasos con un ejemplo real.</Texto>
        <View style={{ height: 12 }} />
        {GUIAS.map((g) => (
          <Tarjeta key={g.clave}>
            <Pressable
              onPress={() => setAbierta(abierta === g.clave ? null : g.clave)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              accessibilityRole="button"
            >
              <Text style={{ flex: 1, fontSize: letra.grande - 1, fontWeight: '700', color: colores.vino }}>{g.titulo}</Text>
              <MaterialCommunityIcons name={abierta === g.clave ? 'chevron-up' : 'chevron-down'} size={28} color={colores.vino} />
            </Pressable>
            {abierta === g.clave ? <PasosGuia guia={{ ...g, titulo: '' }} /> : null}
          </Tarjeta>
        ))}
      </Pantalla>
    </>
  );
}
