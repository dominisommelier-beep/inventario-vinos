import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { Boton, BotonAyuda, BotonGrande, Pantalla, Tarjeta, Texto, Titulo } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { useCargar } from '../../hooks/useCargar';
import { fechaBonita } from '../../logic/fechas';
import { listarCola, procesarCola, quitarDeCola } from '../../services/conteoFoto';
import { colores, letra } from '../../theme';
import { mensajeError } from '../../utils/formato';

export default function Conteo() {
  const { db, cambio } = useApp();
  const { datos: cola } = useCargar(listarCola);
  const [procesando, setProcesando] = useState(false);

  const reintentar = async () => {
    setProcesando(true);
    try {
      await db.run("UPDATE cola_fotos SET estado = 'pendiente', error = NULL WHERE estado = 'error'");
      const n = await procesarCola(db);
      cambio();
      if (n === 0) Alert.alert('Sin cambios', 'No se pudo procesar ninguna foto. Revisa tu conexión a internet y tu clave de API en Ajustes.');
    } catch (e) {
      Alert.alert('Error', mensajeError(e));
    } finally {
      setProcesando(false);
    }
  };

  const borrar = (id: number) =>
    Alert.alert('¿Borrar esta foto de la cola?', 'No se cambiará nada en el inventario.', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, borrar', style: 'destructive', onPress: async () => { await quitarDeCola(db, id); cambio(); } },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: 'Conteo', headerRight: () => <BotonAyuda clave="conteo" /> }} />
      <Pantalla>
        <Texto suave>Compara lo que dice la app con lo que hay de verdad. Nada cambia hasta que tú confirmas.</Texto>
        <View style={{ height: 12 }} />
        <BotonGrande
          texto="Conteo físico"
          descripcion="Cuentas a mano por ubicación y escribes los números. La app registra los sobrantes y faltantes."
          icono="clipboard-list"
          color="#00796B"
          onPress={() => router.push('/conteo/fisico')}
        />
        <BotonGrande
          texto="Conteo por foto (IA)"
          descripcion="Tomas una foto de una caja o un estante y la inteligencia artificial cuenta. Tú revisas antes de guardar."
          icono="camera-iris"
          color={colores.doradoOscuro}
          onPress={() => router.push('/conteo/foto')}
        />

        {cola && cola.length > 0 ? (
          <>
            <Titulo>Fotos de conteo guardadas</Titulo>
            {cola.map((f) => (
              <Tarjeta key={f.id} style={{ flexDirection: 'row', gap: 12 }}>
                <Image source={{ uri: f.uri }} style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: colores.cremaOscura }} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontSize: letra.pequena, color: colores.textoSuave }}>{fechaBonita(f.creada)}</Text>
                  {f.estado === 'pendiente' ? (
                    <Text style={{ fontSize: letra.normal - 1, color: colores.azul }}>Esperando internet para contar…</Text>
                  ) : f.estado === 'lista' ? (
                    <Text style={{ fontSize: letra.normal - 1, color: colores.verde, fontWeight: '700' }}>Lista para revisar</Text>
                  ) : (
                    <Text style={{ fontSize: letra.pequena, color: colores.rojo }}>{f.error}</Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {f.estado === 'lista' ? (
                      <Boton texto="Revisar" pequeno style={{ flex: 1 }} onPress={() => router.push({ pathname: '/conteo/revision', params: { colaId: String(f.id) } })} />
                    ) : null}
                    <Boton texto="Borrar" pequeno variante="suave" style={{ flex: 1 }} onPress={() => borrar(f.id)} />
                  </View>
                </View>
              </Tarjeta>
            ))}
            {cola.some((f) => f.estado !== 'lista') ? (
              <Boton texto="Procesar fotos pendientes ahora" icono="refresh" variante="secundario" cargando={procesando} onPress={reintentar} />
            ) : null}
          </>
        ) : null}
      </Pantalla>
    </>
  );
}
