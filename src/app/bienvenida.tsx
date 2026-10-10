import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton, NombreIcono } from '../components/ui';
import { useApp } from '../estado/AppContext';
import { guardarAjuste } from '../logic/catalogos';
import { colores, espacio, letra } from '../theme';

const PASOS: { icono: NombreIcono; titulo: string; texto: string; ejemplo: string }[] = [
  {
    icono: 'glass-wine',
    titulo: 'Bienvenido a Mi Cava',
    texto: 'Lleva el inventario de tus vinos y licores desde el teléfono, sin internet. Todo se guarda en este teléfono.',
    ejemplo: 'Ya cargamos 10 productos de ejemplo para que veas cómo funciona. Puedes borrarlos cuando quieras en Más → Ajustes.',
  },
  {
    icono: 'bottle-wine',
    titulo: 'Inventario',
    texto: 'Todos tus productos con su existencia total y por ubicación (Cava principal, Bar, Restaurante, Almacén). Los colores te dicen cómo va cada uno.',
    ejemplo: '🔴 Agotado · 🟠 Bajo mínimo · 🔵 Pedido en camino · 🟢 Bien\n\nEjemplo: "Marqués de Riscal – 13 – mín. 6" en verde: todo bien.',
  },
  {
    icono: 'swap-horizontal-bold',
    titulo: 'Movimientos',
    texto: 'La existencia solo cambia registrando lo que pasó: entradas, salidas, transferencias, decomisos, pruebas de boda y ajustes por conteo. Todo queda en el historial.',
    ejemplo: 'Ejemplo: pasaste 6 botellas de la Cava al Bar → Movimientos → Transferencia → Origen: Cava principal → Destino: Bar → 6 → Guardar.\n\n¿Te equivocaste? Toca "Deshacer" justo después.',
  },
  {
    icono: 'cart-arrow-down',
    titulo: 'Reposición y alertas',
    texto: 'La app te avisa cuando un producto llega a su mínimo y te dice cuánto pedir. Puedes crear el pedido y enviarlo al proveedor por WhatsApp o correo.',
    ejemplo: 'Ejemplo: quedan 3 Albariño (mínimo 4, máximo 12) → te sugiere pedir 9. Cada día a las 9:00 a. m. recibes un resumen (puedes cambiar la hora).',
  },
  {
    icono: 'camera-iris',
    titulo: 'Conteo y ayuda',
    texto: 'Cuenta a mano o con una foto (la inteligencia artificial cuenta por ti y tú confirmas). En cada pantalla, el botón "?" te explica qué hacer.',
    ejemplo: 'En Más → "¿Cómo se hace?" están todas las guías paso a paso.\n\nPara practicar sin miedo, activa el Modo práctica en Ajustes.',
  },
];

export default function Bienvenida() {
  const { dbReal } = useApp();
  const [i, setI] = useState(0);
  const paso = PASOS[i];
  const ultimo = i === PASOS.length - 1;

  const terminar = async () => {
    await guardarAjuste(dbReal, 'bienvenida_vista', 'si');
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colores.vino }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: espacio }}>
        {!ultimo ? (
          <Pressable onPress={terminar} hitSlop={12}>
            <Text style={{ color: colores.dorado, fontSize: letra.normal, fontWeight: '700' }}>Saltar</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={{ padding: espacio, alignItems: 'center', flexGrow: 1, justifyContent: 'center' }}>
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: colores.dorado, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name={paso.icono} size={70} color={colores.vinoOscuro} />
        </View>
        <Text style={{ color: colores.blanco, fontSize: letra.titulo + 4, fontWeight: '800', textAlign: 'center', marginTop: 24 }}>{paso.titulo}</Text>
        <Text style={{ color: colores.crema, fontSize: letra.grande, textAlign: 'center', marginTop: 16, lineHeight: 30 }}>{paso.texto}</Text>
        <View style={{ backgroundColor: colores.vinoOscuro, borderRadius: 14, padding: espacio, marginTop: 24, alignSelf: 'stretch' }}>
          <Text style={{ color: colores.cremaOscura, fontSize: letra.normal, lineHeight: 26 }}>{paso.ejemplo}</Text>
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
        {PASOS.map((_, k) => (
          <View key={k} style={{ width: k === i ? 28 : 10, height: 10, borderRadius: 5, backgroundColor: k === i ? colores.dorado : colores.vinoClaro }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, padding: espacio, paddingTop: 0 }}>
        {i > 0 ? <Boton texto="Atrás" variante="secundario" style={{ flex: 1 }} onPress={() => setI(i - 1)} /> : null}
        <Boton
          texto={ultimo ? '¡Empezar!' : `Siguiente (${i + 1}/${PASOS.length})`}
          variante="dorado"
          style={{ flex: 2 }}
          onPress={() => (ultimo ? terminar() : setI(i + 1))}
        />
      </View>
    </SafeAreaView>
  );
}
