import { router } from 'expo-router';
import React from 'react';
import { tipoUI, TIPOS_UI } from '../../components/tiposUI';
import { Boton, BotonGrande, Pantalla, Texto, Titulo } from '../../components/ui';

export default function Movimientos() {
  return (
    <Pantalla>
      <Texto suave>Elige qué pasó. Cada movimiento queda guardado en el historial con fecha, hora y responsable.</Texto>
      <Titulo>¿Qué quieres registrar?</Titulo>
      {TIPOS_UI.map((t) => (
        <BotonGrande
          key={t.clave}
          texto={t.titulo}
          descripcion={t.descripcion}
          icono={t.icono}
          color={t.color}
          onPress={() => {
            if (t.clave === 'pedido') router.push('/pedidos/nuevo');
            else router.push(`/movimiento/${t.clave}`);
          }}
        />
      ))}
      <Titulo>Ver lo que ya se registró</Titulo>
      <Boton texto="Historial de movimientos" icono="history" variante="secundario" onPress={() => router.push('/historial')} />
      <Boton
        texto="Pedidos en tránsito"
        icono={tipoUI('pedido').icono}
        variante="secundario"
        style={{ marginTop: 10 }}
        onPress={() => router.push('/pedidos')}
      />
    </Pantalla>
  );
}
