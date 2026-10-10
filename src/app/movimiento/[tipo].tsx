import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { FotoEvidencia } from '../../components/FotoEvidencia';
import { SelectorProducto } from '../../components/SelectorProducto';
import { tipoUI } from '../../components/tiposUI';
import { Aviso, Boton, BotonAyuda, Campo, estilos, Opciones, Pantalla, Texto } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { useCargar } from '../../hooks/useCargar';
import { listarUbicaciones } from '../../logic/catalogos';
import { deshacerMovimiento, MOTIVOS_DECOMISO, registrarMovimiento, TIPOS, TipoMovimiento } from '../../logic/movimientos';
import { existenciasDeProducto, obtenerProducto, ProductoResumen } from '../../logic/productos';
import { colores, letra } from '../../theme';
import { aEntero, mensajeError } from '../../utils/formato';

const MOTIVOS_SALIDA = ['Venta', 'Consumo del restaurante', 'Cortesía', 'Uso en cocina'];

const VERBO: Record<TipoMovimiento, string> = {
  entrada: 'recibir',
  salida: 'sacar',
  transferencia: 'transferir',
  decomiso: 'decomisar',
  prueba: 'usar',
  ajuste: 'ajustar',
};

export default function NuevoMovimiento() {
  const params = useLocalSearchParams<{ tipo: string; productoId?: string; ubicacionId?: string }>();
  const tipo = (TIPOS.includes(params.tipo as TipoMovimiento) ? params.tipo : 'entrada') as TipoMovimiento;
  const ui = tipoUI(tipo);
  const { db, cambio, mostrarAviso, responsable: responsableGuardado, guardarResponsable } = useApp();

  const [producto, setProducto] = useState<ProductoResumen | null>(null);
  const [productoId, setProductoId] = useState<number | null>(params.productoId ? Number(params.productoId) : null);
  const [ubicacionId, setUbicacionId] = useState<number | null>(params.ubicacionId ? Number(params.ubicacionId) : null);
  const [destinoId, setDestinoId] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [responsable, setResponsable] = useState(responsableGuardado);
  const [motivo, setMotivo] = useState(tipo === 'entrada' ? 'Compra' : '');
  const [nota, setNota] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [clienteEvento, setClienteEvento] = useState('');
  const [fechaEvento, setFechaEvento] = useState('');
  const [guardando, setGuardando] = useState(false);

  const { datos: ubicaciones } = useCargar((d) => listarUbicaciones(d));
  const { datos: existencias } = useCargar(
    async (d) => (productoId ? existenciasDeProducto(d, productoId) : []),
    [productoId],
  );

  useEffect(() => {
    if (!ubicacionId && ubicaciones?.length) setUbicacionId(ubicaciones[0].id);
  }, [ubicaciones, ubicacionId]);

  const disponible = existencias?.find((e) => e.ubicacion_id === ubicacionId)?.cantidad ?? 0;
  const nombreUbic = ubicaciones?.find((u) => u.id === ubicacionId)?.nombre ?? '';
  const n = aEntero(cantidad);
  const resta = tipo !== 'entrada' && tipo !== 'ajuste';

  const problema = useMemo(() => {
    if (n !== null && Number.isNaN(n)) return 'Escribe solo números enteros, sin puntos ni letras.';
    if (resta && n && n > disponible) return `No puedes ${VERBO[tipo]} ${n} si solo hay ${disponible} en ${nombreUbic}.`;
    if (tipo === 'transferencia' && destinoId && destinoId === ubicacionId) return 'El origen y el destino deben ser distintos.';
    return null;
  }, [n, disponible, nombreUbic, resta, tipo, destinoId, ubicacionId]);

  const guardar = async () => {
    if (!productoId) return Alert.alert('Falta el producto', 'Toca "Producto" y elige cuál es.');
    if (n === null) return Alert.alert('Falta la cantidad', tipo === 'ajuste' ? 'Escribe cuántas unidades contaste.' : 'Escribe cuántas unidades. Ej.: 6');
    setGuardando(true);
    try {
      const { id, alertas } = await registrarMovimiento(db, {
        tipo,
        productoId,
        cantidad: tipo === 'ajuste' ? undefined : (n as number),
        conteoReal: tipo === 'ajuste' ? (n as number) : undefined,
        ubicacionId: ubicacionId!,
        destinoId,
        responsable,
        motivo,
        nota,
        foto,
        clienteEvento,
        fechaEvento: fechaEvento.trim() || null,
      });
      guardarResponsable(responsable);
      cambio(alertas);
      const nombre = producto?.nombre ?? (await obtenerProducto(db, productoId))?.nombre ?? 'producto';
      const resumen =
        tipo === 'ajuste'
          ? `Ajuste guardado: ${nombre} en ${nombreUbic} ahora tiene ${n}.`
          : `${ui.titulo} guardada: ${n} × ${nombre}.`;
      mostrarAviso(resumen, () => deshacerMovimiento(db, id));
      router.back();
    } catch (e) {
      Alert.alert('No se pudo guardar', mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const opcionesUbic = (ubicaciones ?? []).map((u) => ({ valor: u.id, texto: u.nombre }));

  return (
    <>
      <Stack.Screen options={{ title: ui.titulo, headerRight: () => <BotonAyuda clave={tipo} /> }} />
      <Pantalla>
        <View style={[estilos.aviso, { borderLeftColor: ui.color }]}>
          <Text style={{ flex: 1, fontSize: letra.normal - 1, color: colores.texto, lineHeight: 23 }}>{ui.descripcion}</Text>
        </View>

        <SelectorProducto
          productoId={productoId}
          onCambio={(p) => {
            setProductoId(p.id);
            setProducto(p);
          }}
        />

        {existencias && productoId ? (
          <View style={{ marginTop: -6, marginBottom: 14 }}>
            <Texto suave>
              Hay ahora:{' '}
              {existencias.filter((e) => e.cantidad > 0).map((e) => `${e.nombre}: ${e.cantidad}`).join(' · ') || 'nada en ninguna ubicación'}
            </Texto>
          </View>
        ) : null}

        <Opciones
          etiqueta={tipo === 'transferencia' ? 'Origen (de dónde salen)' : tipo === 'entrada' ? 'Ubicación (dónde se guardan)' : 'Ubicación'}
          obligatorio
          valor={ubicacionId}
          onCambio={setUbicacionId}
          opciones={opcionesUbic}
        />

        {tipo === 'transferencia' ? (
          <Opciones
            etiqueta="Destino (a dónde van)"
            obligatorio
            valor={destinoId}
            onCambio={setDestinoId}
            opciones={opcionesUbic.filter((o) => o.valor !== ubicacionId)}
          />
        ) : null}

        <Campo
          etiqueta={tipo === 'ajuste' ? 'Cantidad que contaste' : 'Cantidad'}
          obligatorio
          valor={cantidad}
          onCambio={setCantidad}
          teclado="number-pad"
          ejemplo={tipo === 'ajuste' ? 'Ej.: 11' : 'Ej.: 6'}
          ayuda={
            productoId && ubicacionId
              ? tipo === 'ajuste'
                ? `La app dice que hay ${disponible} en ${nombreUbic}.`
                : resta
                  ? `Disponible en ${nombreUbic}: ${disponible}`
                  : undefined
              : undefined
          }
        />

        {tipo === 'ajuste' && n !== null && !Number.isNaN(n) && productoId ? (
          <Aviso
            tipo={n === disponible ? 'ok' : 'alerta'}
            texto={
              n === disponible
                ? 'Coincide con el sistema: no hay diferencia.'
                : n > disponible
                  ? `Sobrante: hay ${n - disponible} más de lo que dice la app.`
                  : `Faltante: hay ${disponible - n} menos de lo que dice la app.`
            }
          />
        ) : null}

        {problema ? <Aviso tipo="error" texto={problema} /> : null}

        {tipo === 'prueba' ? (
          <>
            <Campo etiqueta="Cliente o evento" obligatorio valor={clienteEvento} onCambio={setClienteEvento} ejemplo="Ej.: Boda Pérez-Gómez" />
            <Campo
              etiqueta="Fecha del evento"
              valor={fechaEvento}
              onCambio={setFechaEvento}
              ejemplo="Ej.: 2026-12-05 (año-mes-día)"
              teclado="numbers-and-punctuation"
            />
          </>
        ) : null}

        {tipo === 'salida' || tipo === 'decomiso' ? (
          <Opciones
            etiqueta={tipo === 'decomiso' ? 'Motivo del decomiso' : 'Motivo'}
            obligatorio={tipo === 'decomiso'}
            valor={(tipo === 'decomiso' ? MOTIVOS_DECOMISO : MOTIVOS_SALIDA).includes(motivo) ? motivo : null}
            onCambio={(v) => setMotivo(v ?? '')}
            opciones={(tipo === 'decomiso' ? MOTIVOS_DECOMISO : MOTIVOS_SALIDA).map((m) => ({ valor: m, texto: m }))}
          />
        ) : null}
        {tipo === 'decomiso' || tipo === 'entrada' || tipo === 'salida' ? (
          <Campo
            etiqueta={tipo === 'decomiso' ? 'Motivo (o escríbelo)' : 'Motivo (opcional)'}
            obligatorio={tipo === 'decomiso'}
            valor={motivo}
            onCambio={setMotivo}
            ejemplo={tipo === 'decomiso' ? 'Ej.: Botella rota' : tipo === 'entrada' ? 'Ej.: Compra, factura #123' : 'Ej.: Venta'}
          />
        ) : null}

        <Campo
          etiqueta="Responsable"
          obligatorio={tipo === 'prueba'}
          valor={responsable}
          onCambio={setResponsable}
          ejemplo="Ej.: Ana Martínez"
          ayuda="Se recuerda para la próxima vez."
        />
        <Campo etiqueta="Nota (opcional)" valor={nota} onCambio={setNota} ejemplo="Ej.: Se usaron para la cata del viernes" multilinea />
        <FotoEvidencia uri={foto} onCambio={setFoto} etiqueta={tipo === 'decomiso' ? 'Foto de evidencia (opcional)' : 'Foto (opcional)'} />

        <Boton texto="Guardar" icono="content-save" onPress={guardar} cargando={guardando} deshabilitado={!!problema} />
        <Boton texto="Cancelar" variante="secundario" style={{ marginTop: 10 }} onPress={() => router.back()} />
      </Pantalla>
    </>
  );
}
