import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import React, { useEffect, useState } from 'react';
import { ColorValue, Text, View } from 'react-native';
import { BotonAyuda, NombreIcono } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { resumenInicio } from '../../logic/reportes';
import { colores, letra } from '../../theme';

const icono = (nombre: NombreIcono) =>
  function Icono({ color, size }: { color: ColorValue; size: number }) {
    return <MaterialCommunityIcons name={nombre} color={color as string} size={size + 2} />;
  };

function TituloConModo({ titulo }: { titulo: string }) {
  const { practica } = useApp();
  return (
    <View>
      <Text style={{ color: colores.blanco, fontSize: letra.grande, fontWeight: '700' }}>{titulo}</Text>
      {practica ? <Text style={{ color: colores.dorado, fontSize: 13, fontWeight: '700' }}>MODO PRÁCTICA</Text> : null}
    </View>
  );
}

export default function TabsLayout() {
  const { db, version } = useApp();
  const [porReponer, setPorReponer] = useState(0);

  useEffect(() => {
    resumenInicio(db)
      .then((r) => setPorReponer(r.porReponer))
      .catch(() => undefined);
  }, [db, version]);

  const opciones = (titulo: string, ayuda: string, ic: NombreIcono) => ({
    title: titulo,
    headerTitle: () => <TituloConModo titulo={titulo === 'Inicio' ? 'Mi Cava' : titulo} />,
    headerRight: () => <BotonAyuda clave={ayuda} />,
    tabBarIcon: icono(ic),
  });

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colores.vino },
        headerTintColor: colores.blanco,
        tabBarActiveTintColor: colores.vino,
        tabBarInactiveTintColor: colores.textoSuave,
        tabBarStyle: { backgroundColor: colores.blanco, height: 68, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: '600' },
        sceneStyle: { backgroundColor: colores.crema },
      }}
    >
      <Tabs.Screen name="index" options={opciones('Inicio', 'inicio', 'home')} />
      <Tabs.Screen name="inventario" options={opciones('Inventario', 'inventario', 'bottle-wine')} />
      <Tabs.Screen name="movimientos" options={opciones('Movimientos', 'movimientos', 'swap-horizontal-bold')} />
      <Tabs.Screen
        name="reposicion"
        options={{
          ...opciones('Reposición', 'reposicion', 'cart-arrow-down'),
          tabBarBadge: porReponer > 0 ? porReponer : undefined,
          tabBarBadgeStyle: { backgroundColor: colores.naranja },
        }}
      />
      <Tabs.Screen name="mas" options={opciones('Más', 'ajustes', 'menu')} />
    </Tabs>
  );
}
