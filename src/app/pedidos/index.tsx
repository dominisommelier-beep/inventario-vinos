import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Boton, BotonAyuda, Cargando, Opciones, Pantalla, Tarjeta, Vacio } from '../../components/ui';
import { useCargar } from '../../hooks/useCargar';
import { fechaBonita } from '../../logic/fechas';
import { estaAbierto, listarPedidos, NOMBRE_ESTADO_PEDIDO } from '../../logic/pedidos';
import { colores, letra } from '../../theme';
import { dinero } from '../../utils/formato';

const COLOR_ESTADO: Record<string, string> = {
  en_camino: colores.azul,
  parcial: colores.naranja,
  recibido: colores.verde,
  cancelado: colores.textoSuave,
};

export default function Pedidos() {
  const [ver, setVer] = useState<'abiertos' | 'todos'>('abiertos');
  const { datos: pedidos } = useCargar((d) => listarPedidos(d, ver === 'abiertos'), [ver]);

  return (
    <>
      <Stack.Screen options={{ title: 'Pedidos en tránsito', headerRight: () => <BotonAyuda clave="pedidos" /> }} />
      <Pantalla>
        <Boton texto="Nuevo pedido" icono="truck-plus" onPress={() => router.push('/pedidos/nuevo')} />
        <View style={{ height: 12 }} />
        <Opciones
          valor={ver}
          onCambio={(v) => v && setVer(v)}
          opciones={[
            { valor: 'abiertos' as const, texto: 'En camino' },
            { valor: 'todos' as const, texto: 'Todos (incluye recibidos)' },
          ]}
        />
        {!pedidos ? (
          <Cargando />
        ) : pedidos.length === 0 ? (
          <Vacio
            icono="truck-outline"
            titulo={ver === 'abiertos' ? 'No hay pedidos en camino' : 'Todavía no hay pedidos'}
            ejemplo={'Cuando le pidas mercancía a un proveedor, regístrala aquí para saber qué viene en camino.\n\nEjemplo: 24 Cervezas Presidente a Distribuidora del Caribe, llegan el viernes.'}
            boton="Crear un pedido"
            onPress={() => router.push('/pedidos/nuevo')}
          />
        ) : (
          pedidos.map((p) => (
            <Pressable key={p.id} onPress={() => router.push(`/pedidos/${p.id}`)}>
              <Tarjeta style={{ borderLeftWidth: 6, borderLeftColor: p.atrasado ? colores.rojo : COLOR_ESTADO[p.estado] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: letra.normal, fontWeight: '700', color: colores.texto, flex: 1 }}>
                    Pedido #{p.id} · {p.proveedor ?? 'Sin proveedor'}
                  </Text>
                  <Text style={{ fontSize: letra.pequena, fontWeight: '700', color: p.atrasado ? colores.rojo : COLOR_ESTADO[p.estado] }}>
                    {p.atrasado ? 'ATRASADO' : NOMBRE_ESTADO_PEDIDO[p.estado].toUpperCase()}
                  </Text>
                </View>
                <Text style={{ fontSize: letra.pequena, color: colores.textoSuave, marginTop: 4 }}>
                  Pedido el {fechaBonita(p.fecha_pedido)}
                  {p.fecha_estimada ? ` · Llega el ${fechaBonita(p.fecha_estimada)}` : ''}
                </Text>
                <Text style={{ fontSize: letra.normal - 1, color: colores.texto, marginTop: 6 }}>
                  {p.lineas.map((l) => `${l.cantidad} × ${l.producto}`).join('\n')}
                </Text>
                <Text style={{ fontSize: letra.pequena, color: colores.textoSuave, marginTop: 6 }}>
                  {estaAbierto(p.estado) ? `Faltan por llegar: ${p.pendientes} · ` : ''}
                  {dinero(p.costo)}
                </Text>
              </Tarjeta>
            </Pressable>
          ))
        )}
      </Pantalla>
    </>
  );
}
