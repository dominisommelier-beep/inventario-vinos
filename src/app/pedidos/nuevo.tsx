import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SelectorProducto } from '../../components/SelectorProducto';
import { Boton, BotonAyuda, Campo, estilos, Opciones, Pantalla, Tarjeta, Texto, Titulo } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { useCargar } from '../../hooks/useCargar';
import { listarProveedores, listarUbicaciones } from '../../logic/catalogos';
import { diaLocal, sumarDias } from '../../logic/fechas';
import { crearPedido } from '../../logic/pedidos';
import { listarResumen } from '../../logic/productos';
import { colores, letra } from '../../theme';
import { aEntero, dinero, mensajeError } from '../../utils/formato';

interface Linea {
  productoId: number;
  cantidad: string;
}

export default function NuevoPedido() {
  const params = useLocalSearchParams<{ proveedorId?: string; lineas?: string }>();
  const { db, cambio, mostrarAviso, responsable: respGuardado, guardarResponsable } = useApp();
  const [proveedorId, setProveedorId] = useState<number | null>(params.proveedorId ? Number(params.proveedorId) : null);
  const [lineas, setLineas] = useState<Linea[]>(() => {
    try {
      const l = JSON.parse(params.lineas ?? '[]') as { productoId: number; cantidad: number }[];
      return l.map((x) => ({ productoId: x.productoId, cantidad: String(x.cantidad) }));
    } catch {
      return [];
    }
  });
  const [fechaEstimada, setFechaEstimada] = useState(sumarDias(diaLocal(), 7));
  const [ubicacionId, setUbicacionId] = useState<number | null>(null);
  const [responsable, setResponsable] = useState(respGuardado);
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  const { datos } = useCargar(async (d) => ({
    proveedores: await listarProveedores(d),
    ubicaciones: await listarUbicaciones(d),
    productos: await listarResumen(d),
  }));

  useEffect(() => {
    if (!ubicacionId && datos?.ubicaciones.length) setUbicacionId(datos.ubicaciones[0].id);
  }, [datos, ubicacionId]);

  const producto = (id: number) => datos?.productos.find((p) => p.id === id);
  const costoTotal = lineas.reduce((s, l) => s + (aEntero(l.cantidad) || 0) * (producto(l.productoId)?.costo ?? 0), 0);

  const guardar = async () => {
    const convertidas = lineas.map((l) => ({ productoId: l.productoId, cantidad: aEntero(l.cantidad) ?? 0 }));
    if (convertidas.some((l) => Number.isNaN(l.cantidad) || l.cantidad <= 0)) {
      return Alert.alert('Revisa las cantidades', 'Cada producto necesita una cantidad mayor que 0 (número entero).');
    }
    setGuardando(true);
    try {
      const id = await crearPedido(db, {
        proveedorId,
        fechaEstimada: fechaEstimada.trim() || null,
        ubicacionId,
        responsable,
        nota,
        lineas: convertidas,
      });
      guardarResponsable(responsable);
      cambio();
      mostrarAviso(`Pedido #${id} guardado. No suma a la existencia hasta que lo recibas.`);
      router.replace(`/pedidos/${id}`);
    } catch (e) {
      Alert.alert('No se pudo guardar', mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Nuevo pedido', headerRight: () => <BotonAyuda clave="nuevoPedido" /> }} />
      <Pantalla>
        <Texto suave>Un pedido en tránsito es lo que le pediste al proveedor y todavía no llega. No suma a la existencia hasta que toques "Recibir pedido".</Texto>
        {datos?.proveedores.length ? (
          <>
            <View style={{ height: 12 }} />
            <Opciones
              etiqueta="Proveedor"
              permitirNinguno
              valor={proveedorId}
              onCambio={setProveedorId}
              opciones={datos.proveedores.map((p) => ({ valor: p.id, texto: p.nombre }))}
            />
          </>
        ) : (
          <Texto suave>(Puedes registrar proveedores en Más → Proveedores.)</Texto>
        )}

        <Titulo>Productos del pedido</Titulo>
        {lineas.map((l, i) => {
          const p = producto(l.productoId);
          return (
            <Tarjeta key={`${l.productoId}-${i}`} style={{ padding: 12 }}>
              <Text style={{ fontSize: letra.normal, fontWeight: '700', color: colores.texto }}>{p?.nombre ?? '…'}</Text>
              <Text style={{ fontSize: letra.pequena, color: colores.textoSuave }}>
                Hay {p?.total ?? 0} · Mínimo {p?.minimo ?? 0} · Costo {dinero(p?.costo)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <Text style={{ fontSize: letra.normal }}>Cantidad:</Text>
                <TextInput
                  value={l.cantidad}
                  onChangeText={(t) => setLineas(lineas.map((x, j) => (j === i ? { ...x, cantidad: t } : x)))}
                  keyboardType="number-pad"
                  placeholder="Ej.: 12"
                  placeholderTextColor="#A69689"
                  style={[estilos.input, { flex: 1, minHeight: 44, paddingVertical: 6 }]}
                />
                <Pressable onPress={() => setLineas(lineas.filter((_, j) => j !== i))} hitSlop={10}>
                  <Text style={{ color: colores.rojo, fontSize: letra.normal, fontWeight: '700' }}>Quitar</Text>
                </Pressable>
              </View>
            </Tarjeta>
          );
        })}
        <SelectorProducto
          etiqueta={lineas.length ? 'Agregar otro producto' : 'Agregar producto'}
          productoId={null}
          onCambio={(p) => {
            if (lineas.some((l) => l.productoId === p.id)) return Alert.alert('Ya está en el pedido', 'Cambia su cantidad arriba.');
            setLineas([...lineas, { productoId: p.id, cantidad: p.sugerido > 0 ? String(p.sugerido) : '' }]);
          }}
        />
        {lineas.length ? <Texto negrita>Costo estimado: {dinero(costoTotal)}</Texto> : null}

        <Titulo>Detalles</Titulo>
        <Campo
          etiqueta="Fecha estimada de llegada"
          valor={fechaEstimada}
          onCambio={setFechaEstimada}
          ejemplo="Ej.: 2026-10-20 (año-mes-día)"
          teclado="numbers-and-punctuation"
          ayuda="Si pasa esta fecha y no lo has recibido, la app te avisa."
        />
        {datos ? (
          <Opciones
            etiqueta="¿Dónde se guardará al llegar?"
            valor={ubicacionId}
            onCambio={setUbicacionId}
            opciones={datos.ubicaciones.map((u) => ({ valor: u.id, texto: u.nombre }))}
          />
        ) : null}
        <Campo etiqueta="Responsable" valor={responsable} onCambio={setResponsable} ejemplo="Ej.: Ana Martínez" />
        <Campo etiqueta="Nota (opcional)" valor={nota} onCambio={setNota} ejemplo="Ej.: Pedido por WhatsApp a Juan" multilinea />

        <Boton texto="Guardar pedido" icono="content-save" onPress={guardar} cargando={guardando} deshabilitado={lineas.length === 0} />
        <Boton texto="Cancelar" variante="secundario" style={{ marginTop: 10 }} onPress={() => router.back()} />
      </Pantalla>
    </>
  );
}
