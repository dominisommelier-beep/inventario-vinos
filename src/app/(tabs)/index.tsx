import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Atajo, Aviso, Cargando, NombreIcono, Pantalla, Titulo } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { useCargar } from '../../hooks/useCargar';
import { resumenInicio } from '../../logic/reportes';
import { colores, letra } from '../../theme';
import { dinero, numero } from '../../utils/formato';

function Cifra({
  titulo,
  valor,
  icono,
  color = colores.vino,
  onPress,
  ancho,
}: {
  titulo: string;
  valor: string;
  icono: NombreIcono;
  color?: string;
  onPress?: () => void;
  ancho?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexBasis: ancho ? '100%' : '47%',
        flexGrow: 1,
        backgroundColor: colores.blanco,
        borderRadius: 14,
        padding: 14,
        borderTopWidth: 5,
        borderTopColor: color,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <MaterialCommunityIcons name={icono} size={22} color={color} />
        <Text style={{ fontSize: letra.pequena, color: colores.textoSuave, flex: 1 }}>{titulo}</Text>
      </View>
      <Text style={{ fontSize: letra.numero, fontWeight: '800', color, marginTop: 4 }} adjustsFontSizeToFit numberOfLines={1}>
        {valor}
      </Text>
    </Pressable>
  );
}

export default function Inicio() {
  const { practica } = useApp();
  const { datos: r } = useCargar(resumenInicio);

  return (
    <Pantalla>
      {practica ? (
        <Aviso tipo="alerta" texto="Estás en MODO PRÁCTICA: nada de lo que hagas aquí toca tu inventario real. Desactívalo en Más → Ajustes." />
      ) : null}
      {!r ? (
        <Cargando />
      ) : (
        <>
          {r.pedidosAtrasados > 0 ? (
            <Pressable onPress={() => router.push('/pedidos')}>
              <Aviso
                tipo="error"
                texto={`${r.pedidosAtrasados} pedido${r.pedidosAtrasados === 1 ? '' : 's'} pasó su fecha de llegada sin recibirse. Toca aquí para verlo.`}
              />
            </Pressable>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Cifra
              titulo="Por reponer"
              valor={numero(r.porReponer)}
              icono="alert"
              color={r.porReponer > 0 ? colores.naranja : colores.verde}
              onPress={() => router.push('/reposicion')}
            />
            <Cifra
              titulo="Agotados"
              valor={numero(r.agotados)}
              icono="close-octagon"
              color={r.agotados > 0 ? colores.rojo : colores.verde}
              onPress={() => router.push({ pathname: '/inventario', params: { estado: 'agotado' } })}
            />
            <Cifra
              titulo="Pedidos en camino"
              valor={numero(r.pedidosEnTransito)}
              icono="truck-delivery"
              color={colores.azul}
              onPress={() => router.push('/pedidos')}
            />
            <Cifra titulo="Productos" valor={numero(r.productos)} icono="bottle-wine" onPress={() => router.push('/inventario')} />
            <Cifra titulo="Unidades en total" valor={numero(r.unidades)} icono="counter" />
            <Cifra titulo="Valor del inventario (a costo)" valor={dinero(r.valorCosto)} icono="cash" color={colores.doradoOscuro} ancho />
          </View>
        </>
      )}

      <Titulo>Accesos rápidos</Titulo>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Atajo texto="Entrada" icono="tray-arrow-down" color={colores.verde} onPress={() => router.push('/movimiento/entrada')} />
        <Atajo texto="Salida" icono="tray-arrow-up" color={colores.vino} onPress={() => router.push('/movimiento/salida')} />
        <Atajo texto="Transferencia" icono="swap-horizontal-bold" color={colores.azul} onPress={() => router.push('/movimiento/transferencia')} />
        <Atajo texto="Conteo por foto" icono="camera-iris" color={colores.doradoOscuro} onPress={() => router.push('/conteo/foto')} />
      </View>
    </Pantalla>
  );
}
