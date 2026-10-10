import { router } from 'expo-router';
import React from 'react';
import { BotonGrande, Pantalla, Titulo } from '../../components/ui';
import { colores } from '../../theme';

export default function Mas() {
  return (
    <Pantalla>
      <Titulo>Inventario</Titulo>
      <BotonGrande texto="Pedidos en tránsito" descripcion="Lo que pediste y no ha llegado. Recibir o cancelar." icono="truck-delivery" color="#5E35B1" onPress={() => router.push('/pedidos')} />
      <BotonGrande texto="Conteo" descripcion="Conteo físico a mano o conteo por foto con IA." icono="clipboard-check" color="#00796B" onPress={() => router.push('/conteo')} />
      <BotonGrande texto="Historial" descripcion="Todos los movimientos con filtros." icono="history" color={colores.azul} onPress={() => router.push('/historial')} />
      <BotonGrande texto="Reportes" descripcion="Resumen del mes, pérdidas por decomiso, gasto en pruebas de boda." icono="chart-bar" color={colores.doradoOscuro} onPress={() => router.push('/reportes')} />

      <Titulo>Ayuda</Titulo>
      <BotonGrande texto="¿Cómo se hace?" descripcion="Guías paso a paso con ejemplos." icono="help-circle" color={colores.dorado} onPress={() => router.push('/ayuda')} />
      <BotonGrande texto="Ver el recorrido de bienvenida" descripcion="Las 5 pantallas que explican la app." icono="school" color={colores.dorado} onPress={() => router.push('/bienvenida')} />

      <Titulo>Configuración</Titulo>
      <BotonGrande texto="Ajustes" descripcion="Clave de API, alertas, modo práctica, copia de seguridad." icono="cog" color={colores.textoSuave} onPress={() => router.push('/ajustes')} />
      <BotonGrande texto="Ubicaciones" descripcion="Cava principal, Bar, Restaurante, Almacén…" icono="map-marker" color={colores.vino} onPress={() => router.push('/ajustes/ubicaciones')} />
      <BotonGrande texto="Categorías" descripcion="Tinto, Blanco, Espumoso… y las tuyas." icono="shape" color={colores.vino} onPress={() => router.push('/ajustes/categorias')} />
      <BotonGrande texto="Proveedores" descripcion="Nombre, teléfono/WhatsApp y correo." icono="account-tie" color={colores.vino} onPress={() => router.push('/ajustes/proveedores')} />
    </Pantalla>
  );
}
