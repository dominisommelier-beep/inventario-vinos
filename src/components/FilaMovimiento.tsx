import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Text, View } from 'react-native';
import { fechaBonita } from '../logic/fechas';
import { Movimiento } from '../logic/movimientos';
import { colores, letra } from '../theme';
import { dinero } from '../utils/formato';
import { tipoUI } from './tiposUI';

export function FilaMovimiento({ m, mostrarProducto = true }: { m: Movimiento; mostrarProducto?: boolean }) {
  const ui = tipoUI(m.tipo);
  const signo = m.tipo === 'entrada' ? '+' : m.tipo === 'transferencia' ? '' : m.tipo === 'ajuste' ? (m.cantidad >= 0 ? '+' : '') : '−';
  const donde =
    m.tipo === 'transferencia' ? `${m.ubicacion} → ${m.destino}` : m.ubicacion ?? '';
  const detalle = [
    m.tipo === 'ajuste' ? `Sistema ${m.existencia_sistema} → contado ${m.existencia_contada}` : null,
    m.cliente_evento ? `${m.cliente_evento}${m.fecha_evento ? ' (' + fechaBonita(m.fecha_evento) + ')' : ''}` : null,
    m.motivo,
    m.responsable ? `Por: ${m.responsable}` : null,
    m.nota,
  ].filter(Boolean);

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colores.cremaOscura,
        opacity: m.deshecho ? 0.45 : 1,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ui.color, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={ui.icono} size={22} color={colores.blanco} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: letra.normal - 1, fontWeight: '700', color: colores.texto, flex: 1 }}>
            {ui.titulo}
            {m.deshecho ? ' (deshecho)' : ''}
          </Text>
          <Text style={{ fontSize: letra.normal, fontWeight: '800', color: ui.color }}>
            {signo}
            {Math.abs(m.cantidad)}
          </Text>
        </View>
        {mostrarProducto ? <Text style={{ fontSize: letra.normal - 1, color: colores.texto }}>{m.producto}</Text> : null}
        <Text style={{ fontSize: letra.pequena, color: colores.textoSuave }}>
          {fechaBonita(m.fecha)} · {donde}
          {m.costo_unitario ? ` · ${dinero(Math.abs(m.cantidad) * m.costo_unitario)}` : ''}
        </Text>
        {detalle.length ? <Text style={{ fontSize: letra.pequena, color: colores.textoSuave }}>{detalle.join(' · ')}</Text> : null}
        {m.foto ? <Image source={{ uri: m.foto }} style={{ width: 90, height: 90, borderRadius: 8, marginTop: 6 }} /> : null}
      </View>
    </View>
  );
}
