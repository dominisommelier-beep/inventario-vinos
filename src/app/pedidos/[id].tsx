import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Aviso, Boton, BotonAyuda, Cargando, Campo, Dato, estilos, Opciones, Pantalla, Tarjeta, Texto, Titulo } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { useCargar } from '../../hooks/useCargar';
import { leerAjuste, listarUbicaciones } from '../../logic/catalogos';
import { fechaBonita } from '../../logic/fechas';
import {
  cancelarPedido,
  eliminarPedido,
  estaAbierto,
  NOMBRE_ESTADO_PEDIDO,
  obtenerPedido,
  recibirPedido,
  textoPedido,
} from '../../logic/pedidos';
import { compartirTexto } from '../../services/archivos';
import { colores, letra } from '../../theme';
import { aEntero, dinero, mensajeError } from '../../utils/formato';

export default function DetallePedido() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pedidoId = Number(id);
  const { db, dbReal, cambio, mostrarAviso, responsable: respGuardado, guardarResponsable } = useApp();
  const [recibiendo, setRecibiendo] = useState(false);
  const [cantidades, setCantidades] = useState<Record<number, string>>({});
  const [ubicacionId, setUbicacionId] = useState<number | null>(null);
  const [cerrarResto, setCerrarResto] = useState(false);
  const [responsable, setResponsable] = useState(respGuardado);
  const [guardando, setGuardando] = useState(false);

  const { datos } = useCargar(
    async (d) => ({ pedido: await obtenerPedido(d, pedidoId), ubicaciones: await listarUbicaciones(d) }),
    [pedidoId],
  );
  const p = datos?.pedido;

  useEffect(() => {
    if (!p) return;
    setUbicacionId((u) => u ?? p.ubicacion_id ?? datos?.ubicaciones[0]?.id ?? null);
  }, [p, datos]);

  if (!datos) return <Cargando />;
  if (!p) return <Pantalla><Texto>Este pedido ya no existe.</Texto></Pantalla>;

  const empezarRecepcion = () => {
    const c: Record<number, string> = {};
    for (const l of p.lineas) c[l.id] = String(Math.max(l.cantidad - l.recibida, 0));
    setCantidades(c);
    setCerrarResto(false);
    setRecibiendo(true);
  };

  const guardarRecepcion = async () => {
    const recepciones = p.lineas.map((l) => ({ lineaId: l.id, cantidad: aEntero(cantidades[l.id] ?? '') ?? 0 }));
    if (recepciones.some((r) => Number.isNaN(r.cantidad) || r.cantidad < 0)) {
      return Alert.alert('Revisa las cantidades', 'Escribe números enteros (0 si no llegó nada de ese producto).');
    }
    if (!ubicacionId) return Alert.alert('Falta la ubicación', '¿Dónde vas a guardar lo que llegó?');
    setGuardando(true);
    try {
      await recibirPedido(db, p.id, { ubicacionId, responsable, recepciones, cerrarResto });
      guardarResponsable(responsable);
      cambio();
      const total = recepciones.reduce((s, r) => s + r.cantidad, 0);
      mostrarAviso(`Recepción guardada: ${total} unidades sumadas como entrada.`);
      setRecibiendo(false);
    } catch (e) {
      Alert.alert('No se pudo guardar', mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = () =>
    Alert.alert('¿Cancelar este pedido?', 'Lo que falta por llegar dejará de contar como "en tránsito". Lo que ya recibiste se queda en el inventario.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar pedido',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelarPedido(db, p.id);
            cambio();
          } catch (e) {
            Alert.alert('No se pudo cancelar', mensajeError(e));
          }
        },
      },
    ]);

  const borrar = () =>
    Alert.alert('¿Borrar este pedido?', 'Se borrará por completo. Esto no se puede deshacer.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminarPedido(db, p.id);
            cambio();
            router.back();
          } catch (e) {
            Alert.alert('No se pudo borrar', mensajeError(e));
          }
        },
      },
    ]);

  const compartir = async () => {
    const negocio = (await leerAjuste(dbReal, 'negocio')) ?? undefined;
    await compartirTexto(
      `Pedido #${p.id}`,
      textoPedido({
        negocio,
        proveedor: p.proveedor,
        fechaEstimada: p.fecha_estimada ? fechaBonita(p.fecha_estimada) : null,
        lineas: p.lineas
          .map((l) => ({ codigo: l.codigo, nombre: l.producto, cantidad: estaAbierto(p.estado) ? l.cantidad - l.recibida : l.cantidad }))
          .filter((l) => l.cantidad > 0),
      }),
    );
  };

  const abierto = estaAbierto(p.estado);

  return (
    <>
      <Stack.Screen options={{ title: `Pedido #${p.id}`, headerRight: () => <BotonAyuda clave="pedidos" /> }} />
      <Pantalla>
        {p.atrasado ? <Aviso tipo="error" texto={`Este pedido debía llegar el ${fechaBonita(p.fecha_estimada)} y todavía falta mercancía.`} /> : null}
        <Tarjeta>
          <Dato etiqueta="Estado" valor={NOMBRE_ESTADO_PEDIDO[p.estado]} />
          <Dato etiqueta="Proveedor" valor={p.proveedor ?? 'Sin proveedor'} />
          <Dato etiqueta="Teléfono" valor={p.proveedor_telefono} />
          <Dato etiqueta="Correo" valor={p.proveedor_correo} />
          <Dato etiqueta="Fecha del pedido" valor={fechaBonita(p.fecha_pedido)} />
          <Dato etiqueta="Llegada estimada" valor={fechaBonita(p.fecha_estimada)} />
          <Dato etiqueta="Se guarda en" valor={p.ubicacion} />
          <Dato etiqueta="Responsable" valor={p.responsable} />
          <Dato etiqueta="Costo estimado" valor={dinero(p.costo)} />
          <Dato etiqueta="Nota" valor={p.nota} />
        </Tarjeta>

        <Titulo>Productos</Titulo>
        <Tarjeta>
          {p.lineas.map((l) => (
            <View key={l.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colores.cremaOscura }}>
              <Pressable onPress={() => router.push(`/producto/${l.producto_id}`)}>
                <Text style={{ fontSize: letra.normal, fontWeight: '700', color: colores.texto }}>{l.producto}</Text>
              </Pressable>
              <Text style={{ fontSize: letra.pequena, color: colores.textoSuave }}>
                Pedidas {l.cantidad} · Recibidas {l.recibida}
                {abierto && l.cantidad > l.recibida ? ` · Faltan ${l.cantidad - l.recibida}` : ''}
              </Text>
              {recibiendo && l.cantidad > l.recibida ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <Text style={{ fontSize: letra.normal }}>Llegaron:</Text>
                  <TextInput
                    value={cantidades[l.id] ?? ''}
                    onChangeText={(t) => setCantidades({ ...cantidades, [l.id]: t })}
                    keyboardType="number-pad"
                    style={[estilos.input, { flex: 1, minHeight: 44, paddingVertical: 6 }]}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </Tarjeta>

        {recibiendo ? (
          <Tarjeta>
            <Texto negrita>Recibir pedido</Texto>
            <Texto suave>Viene escrito lo que falta. Si llegó menos, cambia el número.</Texto>
            <View style={{ height: 10 }} />
            <Opciones
              etiqueta="¿Dónde se guarda lo que llegó?"
              obligatorio
              valor={ubicacionId}
              onCambio={setUbicacionId}
              opciones={datos.ubicaciones.map((u) => ({ valor: u.id, texto: u.nombre }))}
            />
            <Campo etiqueta="Responsable" valor={responsable} onCambio={setResponsable} ejemplo="Ej.: Ana Martínez" />
            <Opciones
              etiqueta="Si llegó menos de lo pedido…"
              valor={cerrarResto}
              onCambio={(v) => setCerrarResto(!!v)}
              opciones={[
                { valor: false, texto: 'El resto llegará después' },
                { valor: true, texto: 'No llegará más (cerrar pedido)' },
              ]}
            />
            <Boton texto="Guardar recepción" icono="check" onPress={guardarRecepcion} cargando={guardando} />
            <Boton texto="Cancelar" variante="secundario" style={{ marginTop: 10 }} onPress={() => setRecibiendo(false)} />
          </Tarjeta>
        ) : abierto ? (
          <>
            <Boton texto="Recibir pedido" icono="package-down" onPress={empezarRecepcion} />
            <Boton texto="Compartir (WhatsApp / correo)" icono="share-variant" variante="secundario" style={{ marginTop: 10 }} onPress={compartir} />
            <Boton texto="Cancelar pedido" icono="cancel" variante="peligro" style={{ marginTop: 10 }} onPress={cancelar} />
          </>
        ) : (
          <>
            <Boton texto="Compartir" icono="share-variant" variante="secundario" onPress={compartir} />
            {p.estado === 'cancelado' ? (
              <Boton texto="Borrar pedido" icono="delete" variante="peligro" style={{ marginTop: 10 }} onPress={borrar} />
            ) : null}
          </>
        )}
      </Pantalla>
    </>
  );
}
