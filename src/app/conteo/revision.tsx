import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Text, TextInput, View } from 'react-native';
import { Aviso, Boton, BotonAyuda, Cargando, estilos, Opciones, Pantalla, Tarjeta, Texto, Titulo } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { useCargar } from '../../hooks/useCargar';
import { listarUbicaciones } from '../../logic/catalogos';
import { AVISO_CONTEO_FOTO, Confianza, ResultadoConteoIA } from '../../logic/conteoIA';
import { deshacerMovimiento, registrarMovimiento } from '../../logic/movimientos';
import { FotoEnCola, quitarDeCola } from '../../services/conteoFoto';
import { colores, letra } from '../../theme';
import { aEntero, mensajeError } from '../../utils/formato';

const COLOR_CONFIANZA: Record<Confianza, string> = { alto: colores.verde, medio: colores.naranja, bajo: colores.rojo };

/**
 * Pantalla de revisión del conteo por foto: muestra lo que contó la IA, lo que
 * dice el sistema y la diferencia. Nada se guarda hasta tocar "Aceptar y guardar".
 */
export default function RevisionConteo() {
  const { colaId } = useLocalSearchParams<{ colaId: string }>();
  const { db, cambio, mostrarAviso, responsable: respGuardado, guardarResponsable } = useApp();
  const [ubicacionId, setUbicacionId] = useState<number | null>(null);
  const [valores, setValores] = useState<Record<number, string>>({});
  const [responsable, setResponsable] = useState(respGuardado);
  const [guardando, setGuardando] = useState(false);

  const { datos } = useCargar(
    async (d) => {
      const f = await d.first<FotoEnCola>('SELECT * FROM cola_fotos WHERE id = ?', [Number(colaId)]);
      const ubicaciones = await listarUbicaciones(d);
      const ex = await d.all<{ producto_id: number; ubicacion_id: number; cantidad: number }>('SELECT producto_id, ubicacion_id, cantidad FROM existencias');
      return { f, resultado: f?.resultado ? (JSON.parse(f.resultado) as ResultadoConteoIA) : null, ubicaciones, ex };
    },
    [colaId],
  );

  useEffect(() => {
    if (!datos?.f || !datos.resultado) return;
    setUbicacionId((u) => u ?? datos.f!.ubicacion_id ?? datos.ubicaciones[0]?.id ?? null);
    setValores((v) => {
      if (Object.keys(v).length) return v;
      const ini: Record<number, string> = {};
      for (const it of datos.resultado!.items) if (it.productoId) ini[it.productoId] = String(it.cantidad);
      return ini;
    });
  }, [datos]);

  if (!datos) return <Cargando />;
  if (!datos.f || !datos.resultado) {
    return (
      <Pantalla>
        <Texto>Este conteo ya no está disponible.</Texto>
      </Pantalla>
    );
  }
  const { f, resultado } = datos;
  const sistema = (productoId: number) =>
    datos.ex.find((e) => e.producto_id === productoId && e.ubicacion_id === ubicacionId)?.cantidad ?? 0;
  const conocidos = resultado.items.filter((i) => i.productoId);
  const desconocidos = resultado.items.filter((i) => !i.productoId);
  const nombreUbic = datos.ubicaciones.find((u) => u.id === ubicacionId)?.nombre ?? '';

  const aceptar = () => {
    const ajustes = conocidos
      .map((i) => ({ item: i, real: aEntero(valores[i.productoId!] ?? '') }))
      .filter((a) => a.real !== null);
    if (ajustes.some((a) => Number.isNaN(a.real) || (a.real as number) < 0)) {
      return Alert.alert('Revisa los números', 'Escribe solo números enteros (0 o más). Deja vacío lo que no quieras ajustar.');
    }
    if (ajustes.length === 0) return Alert.alert('Nada que guardar', 'No hay cantidades para ajustar.');
    const resumen = ajustes
      .map((a) => {
        const s = sistema(a.item.productoId!);
        const d = (a.real as number) - s;
        return `• ${a.item.nombre}: ${s} → ${a.real}${d === 0 ? '' : d > 0 ? ` (+${d})` : ` (${d})`}`;
      })
      .join('\n');
    Alert.alert('¿Confirmas estas cantidades?', `Ubicación: ${nombreUbic}\n\n${resumen}\n\n${AVISO_CONTEO_FOTO}`, [
      { text: 'Revisar otra vez', style: 'cancel' },
      {
        text: 'Sí, guardar',
        onPress: async () => {
          setGuardando(true);
          try {
            const ids: number[] = [];
            await db.tx(async () => {
              for (const a of ajustes) {
                const r = await registrarMovimiento(db, {
                  tipo: 'ajuste',
                  productoId: a.item.productoId!,
                  ubicacionId: ubicacionId!,
                  conteoReal: a.real as number,
                  responsable,
                  foto: f.uri,
                  nota: `Conteo por foto (IA: ${a.item.cantidad}, confianza ${a.item.confianza})`,
                });
                ids.push(r.id);
              }
              await quitarDeCola(db, f.id);
            });
            guardarResponsable(responsable);
            cambio();
            mostrarAviso(`Conteo por foto guardado: ${ids.length} ajuste(s).`, async () => {
              await db.tx(async () => {
                for (const id of [...ids].reverse()) await deshacerMovimiento(db, id);
              });
            });
            router.back();
          } catch (e) {
            Alert.alert('No se pudo guardar', mensajeError(e));
          } finally {
            setGuardando(false);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Revisar conteo', headerRight: () => <BotonAyuda clave="conteoFoto" /> }} />
      <Pantalla>
        <Aviso tipo="alerta" texto={AVISO_CONTEO_FOTO} />
        <Image source={{ uri: f.uri }} style={{ width: '100%', height: 220, borderRadius: 12, marginBottom: 12 }} resizeMode="contain" />
        {resultado.notaGeneral ? <Aviso tipo="info" texto={`La IA dice: ${resultado.notaGeneral}`} /> : null}

        <Opciones
          etiqueta="Ubicación contada"
          obligatorio
          valor={ubicacionId}
          onCambio={setUbicacionId}
          opciones={datos.ubicaciones.map((u) => ({ valor: u.id, texto: u.nombre }))}
        />

        <Titulo>Cantidades</Titulo>
        {conocidos.length === 0 ? (
          <Texto suave>La IA no reconoció ninguno de tus productos en esta foto.</Texto>
        ) : null}
        {conocidos.map((i) => {
          const s = sistema(i.productoId!);
          const v = aEntero(valores[i.productoId!] ?? '');
          const dif = v !== null && !Number.isNaN(v) ? v - s : null;
          return (
            <Tarjeta key={i.productoId} style={{ padding: 12 }}>
              <Text style={{ fontSize: letra.normal, fontWeight: '700', color: colores.texto }}>{i.nombre}</Text>
              <Text style={{ fontSize: letra.pequena, fontWeight: '700', color: COLOR_CONFIANZA[i.confianza], marginTop: 2 }}>
                Confianza {i.confianza}
              </Text>
              {i.nota ? <Text style={{ fontSize: letra.pequena, color: colores.textoSuave }}>{i.nota}</Text> : null}
              <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colores.textoSuave }}>Contó la IA</Text>
                  <Text style={{ fontSize: letra.grande, fontWeight: '800', color: colores.doradoOscuro }}>{i.cantidad}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colores.textoSuave }}>Sistema</Text>
                  <Text style={{ fontSize: letra.grande, fontWeight: '800', color: colores.texto }}>{s}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colores.textoSuave }}>Diferencia</Text>
                  <Text
                    style={{
                      fontSize: letra.grande,
                      fontWeight: '800',
                      color: dif === null || dif === 0 ? colores.verde : dif > 0 ? colores.azul : colores.rojo,
                    }}
                  >
                    {dif === null ? '—' : dif > 0 ? `+${dif}` : dif}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <Text style={{ fontSize: letra.normal - 1, flex: 1 }}>Cantidad a guardar (corrígela si hace falta):</Text>
                <TextInput
                  value={valores[i.productoId!] ?? ''}
                  onChangeText={(t) => setValores({ ...valores, [i.productoId!]: t })}
                  keyboardType="number-pad"
                  placeholder="—"
                  style={[estilos.input, { width: 90, minHeight: 44, paddingVertical: 6, textAlign: 'center' }]}
                />
              </View>
            </Tarjeta>
          );
        })}

        {desconocidos.length ? (
          <>
            <Titulo>No están en tu inventario</Titulo>
            <Tarjeta>
              {desconocidos.map((i, k) => (
                <Text key={k} style={{ fontSize: letra.normal - 1, color: colores.texto, marginBottom: 6 }}>
                  • {i.cantidad} × {i.nombre}
                  {i.nota ? ` — ${i.nota}` : ''}
                </Text>
              ))}
              <Texto suave>Estos no se ajustan. Si son productos tuyos, agrégalos en Inventario y repite el conteo.</Texto>
            </Tarjeta>
          </>
        ) : null}

        <Texto suave>Responsable</Texto>
        <TextInput value={responsable} onChangeText={setResponsable} placeholder="Ej.: Ana Martínez" placeholderTextColor="#A69689" style={[estilos.input, { marginBottom: 12 }]} />

        <Boton texto="Aceptar y guardar" icono="check-bold" onPress={aceptar} cargando={guardando} deshabilitado={conocidos.length === 0} />
        <Boton texto="Descartar (no guardar nada)" variante="secundario" style={{ marginTop: 10 }} onPress={() => router.back()} />
      </Pantalla>
    </>
  );
}
