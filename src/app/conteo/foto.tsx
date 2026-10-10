import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, View } from 'react-native';
import { Aviso, Boton, BotonAyuda, Opciones, Pantalla, Tarjeta, Texto, Titulo } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { useCargar } from '../../hooks/useCargar';
import { listarUbicaciones } from '../../logic/catalogos';
import { AVISO_CONTEO_FOTO, CONSEJOS_FOTO } from '../../logic/conteoIA';
import { obtenerProducto } from '../../logic/productos';
import { leerClaveAPI } from '../../services/clave';
import { contarFotoNueva } from '../../services/conteoFoto';
import { FotoTomada, obtenerFoto } from '../../services/fotos';
import { colores, letra } from '../../theme';
import { mensajeError } from '../../utils/formato';

export default function ConteoFoto() {
  const params = useLocalSearchParams<{ productoId?: string }>();
  const productoId = params.productoId ? Number(params.productoId) : null;
  const { db, cambio } = useApp();
  const [ubicacionId, setUbicacionId] = useState<number | null>(null);
  const [foto, setFoto] = useState<FotoTomada | null>(null);
  const [contando, setContando] = useState(false);
  const [tieneClave, setTieneClave] = useState<boolean | null>(null);

  const { datos } = useCargar(
    async (d) => ({ ubicaciones: await listarUbicaciones(d), producto: productoId ? await obtenerProducto(d, productoId) : null }),
    [productoId],
  );

  useEffect(() => {
    leerClaveAPI().then((k) => setTieneClave(!!k));
  }, []);
  useEffect(() => {
    if (!ubicacionId && datos?.ubicaciones.length) setUbicacionId(datos.ubicaciones[0].id);
  }, [datos, ubicacionId]);

  const elegir = async (origen: 'camara' | 'galeria') => {
    try {
      const f = await obtenerFoto(origen);
      if (f) setFoto(f);
    } catch (e) {
      Alert.alert('No se pudo obtener la foto', mensajeError(e));
    }
  };

  const contar = async () => {
    if (!foto || !ubicacionId) return;
    setContando(true);
    try {
      const r = await contarFotoNueva(db, foto, ubicacionId, productoId);
      cambio();
      if (r.estado === 'pendiente') {
        Alert.alert(
          'Sin internet',
          'La foto quedó guardada. Se contará automáticamente cuando vuelva la conexión (o desde Conteo → "Procesar fotos pendientes"). Nada cambió en el inventario.',
          [{ text: 'Entendido', onPress: () => router.replace('/conteo') }],
        );
      } else {
        router.replace({ pathname: '/conteo/revision', params: { colaId: String(r.colaId) } });
      }
    } catch (e) {
      Alert.alert('No se pudo contar', mensajeError(e));
    } finally {
      setContando(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Conteo por foto', headerRight: () => <BotonAyuda clave="conteoFoto" /> }} />
      <Pantalla>
        <Aviso tipo="alerta" texto={AVISO_CONTEO_FOTO} />
        {tieneClave === false ? (
          <Aviso
            tipo="error"
            texto="Para usar el conteo por foto necesitas tu clave de API de Anthropic. Ve a Más → Ajustes → Clave de API (allí se explica cómo obtenerla)."
          />
        ) : null}
        {tieneClave === false ? <Boton texto="Ir a Ajustes" icono="cog" variante="secundario" onPress={() => router.push('/ajustes')} /> : null}

        {datos?.producto ? <Texto negrita>Producto: {datos.producto.nombre}</Texto> : null}

        <Titulo>Consejos para una buena foto</Titulo>
        <Tarjeta>
          {CONSEJOS_FOTO.map((c) => (
            <Text key={c} style={{ fontSize: letra.normal, color: colores.texto, marginBottom: 6, lineHeight: 24 }}>
              • {c}
            </Text>
          ))}
        </Tarjeta>

        {datos ? (
          <Opciones
            etiqueta="¿Qué ubicación estás contando?"
            obligatorio
            valor={ubicacionId}
            onCambio={setUbicacionId}
            opciones={datos.ubicaciones.map((u) => ({ valor: u.id, texto: u.nombre }))}
          />
        ) : null}

        {foto ? (
          <View style={{ gap: 10 }}>
            <Image source={{ uri: foto.uri }} style={{ width: '100%', height: 280, borderRadius: 12 }} resizeMode="contain" />
            {contando ? (
              <View style={{ alignItems: 'center', padding: 16, gap: 8 }}>
                <ActivityIndicator size="large" color={colores.vino} />
                <Texto centro>Contando botellas… puede tardar hasta un minuto.</Texto>
              </View>
            ) : (
              <>
                <Boton texto="Contar con IA" icono="robot" onPress={contar} deshabilitado={!tieneClave} />
                <Boton texto="Tomar otra foto" icono="camera-retake" variante="secundario" onPress={() => setFoto(null)} />
              </>
            )}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Boton texto="Tomar foto" icono="camera" onPress={() => elegir('camara')} />
            <Boton texto="Elegir de la galería" icono="image" variante="secundario" onPress={() => elegir('galeria')} />
          </View>
        )}
      </Pantalla>
    </>
  );
}
