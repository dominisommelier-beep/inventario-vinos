import { router, Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { Boton, BotonAyuda, Cargando, estilos, Opciones, Pantalla, Tarjeta, Texto } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { useCargar } from '../../hooks/useCargar';
import { listarUbicaciones } from '../../logic/catalogos';
import { deshacerMovimiento, registrarMovimiento } from '../../logic/movimientos';
import { listarResumen } from '../../logic/productos';
import { colores, letra } from '../../theme';
import { aEntero, mensajeError } from '../../utils/formato';

export default function ConteoFisico() {
  const { db, cambio, mostrarAviso, responsable: respGuardado, guardarResponsable } = useApp();
  const [ubicacionId, setUbicacionId] = useState<number | null>(null);
  const [contado, setContado] = useState<Record<number, string>>({});
  const [buscar, setBuscar] = useState('');
  const [responsable, setResponsable] = useState(respGuardado);
  const [guardando, setGuardando] = useState(false);

  const { datos } = useCargar(
    async (d) => {
      const ubicaciones = await listarUbicaciones(d);
      const productos = await listarResumen(d);
      const ex = ubicacionId
        ? await d.all<{ producto_id: number; cantidad: number }>('SELECT producto_id, cantidad FROM existencias WHERE ubicacion_id = ?', [ubicacionId])
        : [];
      return { ubicaciones, productos, enUbic: new Map(ex.map((e) => [e.producto_id, e.cantidad])) };
    },
    [ubicacionId],
  );

  useEffect(() => {
    if (!ubicacionId && datos?.ubicaciones.length) setUbicacionId(datos.ubicaciones[0].id);
  }, [datos, ubicacionId]);

  const lista = useMemo(() => {
    if (!datos) return [];
    const t = buscar.trim().toLowerCase();
    return datos.productos
      .filter((p) => !t || p.nombre.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t))
      .sort((a, b) => (datos.enUbic.get(b.id) ?? 0) - (datos.enUbic.get(a.id) ?? 0));
  }, [datos, buscar]);

  if (!datos) return <Cargando />;
  const nombreUbic = datos.ubicaciones.find((u) => u.id === ubicacionId)?.nombre ?? '';
  const llenos = Object.entries(contado).filter(([, v]) => v.trim() !== '');

  const guardar = async () => {
    const ajustes = llenos.map(([id, v]) => ({ productoId: Number(id), real: aEntero(v) }));
    if (ajustes.some((a) => a.real === null || Number.isNaN(a.real) || (a.real as number) < 0)) {
      return Alert.alert('Revisa los números', 'Escribe solo números enteros (0 o más).');
    }
    Alert.alert('¿Guardar el conteo?', `Se registrarán ${ajustes.length} ajuste(s) en ${nombreUbic}.`, [
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
                  productoId: a.productoId,
                  ubicacionId: ubicacionId!,
                  conteoReal: a.real as number,
                  responsable,
                  nota: 'Conteo físico',
                });
                ids.push(r.id);
              }
            });
            guardarResponsable(responsable);
            cambio();
            mostrarAviso(`Conteo guardado: ${ids.length} ajuste(s) en ${nombreUbic}.`, async () => {
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
      <Stack.Screen options={{ title: 'Conteo físico', headerRight: () => <BotonAyuda clave="conteo" /> }} />
      <Pantalla>
        <Texto suave>Elige la ubicación, cuenta las botellas y escribe el número junto a cada producto. Deja vacío lo que no contaste.</Texto>
        <View style={{ height: 12 }} />
        <Opciones
          etiqueta="¿Qué ubicación estás contando?"
          obligatorio
          valor={ubicacionId}
          onCambio={(v) => {
            setUbicacionId(v);
            setContado({});
          }}
          opciones={datos.ubicaciones.map((u) => ({ valor: u.id, texto: u.nombre }))}
        />
        <TextInput
          value={buscar}
          onChangeText={setBuscar}
          placeholder="Buscar producto"
          placeholderTextColor="#A69689"
          style={[estilos.input, { marginBottom: 12 }]}
        />
        {lista.length === 0 ? <Texto suave>No hay productos. Agrégalos primero en Inventario.</Texto> : null}
        {lista.map((p) => {
          const sistema = datos.enUbic.get(p.id) ?? 0;
          const v = aEntero(contado[p.id] ?? '');
          const dif = v !== null && !Number.isNaN(v) ? v - sistema : null;
          return (
            <Tarjeta key={p.id} style={{ padding: 12 }}>
              <Text style={{ fontSize: letra.normal, fontWeight: '700', color: colores.texto }}>{p.nombre}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <Text style={{ fontSize: letra.pequena + 1, color: colores.textoSuave, flex: 1 }}>Sistema: {sistema}</Text>
                <TextInput
                  value={contado[p.id] ?? ''}
                  onChangeText={(t) => setContado({ ...contado, [p.id]: t })}
                  keyboardType="number-pad"
                  placeholder="Contado"
                  placeholderTextColor="#A69689"
                  style={[estilos.input, { width: 110, minHeight: 44, paddingVertical: 6, textAlign: 'center' }]}
                />
              </View>
              {dif !== null ? (
                <Text style={{ fontSize: letra.pequena + 1, marginTop: 4, fontWeight: '700', color: dif === 0 ? colores.verde : dif > 0 ? colores.azul : colores.rojo }}>
                  {dif === 0 ? 'Coincide' : dif > 0 ? `Sobran ${dif}` : `Faltan ${-dif}`}
                </Text>
              ) : null}
            </Tarjeta>
          );
        })}
        <Texto suave>Responsable</Texto>
        <TextInput value={responsable} onChangeText={setResponsable} placeholder="Ej.: Ana Martínez" placeholderTextColor="#A69689" style={[estilos.input, { marginBottom: 12 }]} />
        <Boton texto={`Guardar ajustes (${llenos.length})`} icono="content-save" onPress={guardar} cargando={guardando} deshabilitado={llenos.length === 0} />
      </Pantalla>
    </>
  );
}
