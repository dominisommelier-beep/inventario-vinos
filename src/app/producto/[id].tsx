import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import { FilaMovimiento } from '../../components/FilaMovimiento';
import { TIPOS_UI } from '../../components/tiposUI';
import { Boton, BotonAyuda, Cargando, Dato, estilos, EtiquetaEstado, Pantalla, Tarjeta, Texto, Titulo } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { useCargar } from '../../hooks/useCargar';
import { listarMovimientos } from '../../logic/movimientos';
import { eliminarProducto, existenciasDeProducto, guardarMinimoUbicacion, obtenerResumen } from '../../logic/productos';
import { colores, colorEstado, letra } from '../../theme';
import { aEntero, dinero, mensajeError } from '../../utils/formato';

export default function DetalleProducto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productoId = Number(id);
  const { db, cambio } = useApp();
  const [editandoMin, setEditandoMin] = useState<number | null>(null);
  const [textoMin, setTextoMin] = useState('');

  const { datos } = useCargar(
    async (d) => ({
      p: await obtenerResumen(d, productoId),
      existencias: await existenciasDeProducto(d, productoId),
      movimientos: await listarMovimientos(d, { productoId, limite: 15 }),
    }),
    [productoId],
  );

  if (!datos) return <Cargando />;
  const { p, existencias, movimientos } = datos;
  if (!p) {
    return (
      <Pantalla>
        <Texto>Este producto ya no existe.</Texto>
      </Pantalla>
    );
  }

  const borrar = () => {
    Alert.alert(
      '¿Borrar este producto?',
      `Se borrará "${p.nombre}" junto con TODO su historial de movimientos. Esto no se puede deshacer.`,
      [
        { text: 'No, cancelar', style: 'cancel' },
        {
          text: 'Sí, borrar',
          style: 'destructive',
          onPress: async () => {
            await eliminarProducto(db, p.id);
            cambio();
            router.back();
          },
        },
      ],
    );
  };

  const guardarMin = async (ubicacionId: number) => {
    const v = aEntero(textoMin);
    if (v !== null && (Number.isNaN(v) || v < 0)) return Alert.alert('Número no válido', 'Escribe un número entero, o déjalo vacío para quitar el mínimo.');
    try {
      await guardarMinimoUbicacion(db, p.id, ubicacionId, v);
      setEditandoMin(null);
      cambio();
    } catch (e) {
      Alert.alert('No se pudo guardar', mensajeError(e));
    }
  };

  const ir = (clave: string) => {
    if (clave === 'pedido') {
      router.push({
        pathname: '/pedidos/nuevo',
        params: { proveedorId: p.proveedor_id ? String(p.proveedor_id) : '', lineas: JSON.stringify([{ productoId: p.id, cantidad: p.sugerido || 1 }]) },
      });
    } else router.push({ pathname: '/movimiento/[tipo]', params: { tipo: clave, productoId: String(p.id) } });
  };

  return (
    <>
      <Stack.Screen options={{ title: p.codigo, headerRight: () => <BotonAyuda clave="producto" /> }} />
      <Pantalla>
        <Tarjeta style={{ borderTopWidth: 6, borderTopColor: colorEstado[p.estado] }}>
          {p.foto ? <Image source={{ uri: p.foto }} style={{ width: '100%', height: 200, borderRadius: 10, marginBottom: 10 }} resizeMode="cover" /> : null}
          <Text style={{ fontSize: letra.titulo, fontWeight: '800', color: colores.vino }}>{p.nombre}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <EtiquetaEstado estado={p.estado} />
            <Text style={{ fontSize: letra.pequena, color: colores.textoSuave }}>{p.categoria}</Text>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 14, gap: 8 }}>
            {[
              ['Total', p.total, colorEstado[p.estado]],
              ['Mínimo', p.minimo, colores.texto],
              ['En camino', p.transito, colores.azul],
              ['Sugerido', p.bajoMinimo ? p.sugerido : 0, colores.naranja],
            ].map(([t, v, c]) => (
              <View key={String(t)} style={{ flex: 1, alignItems: 'center', backgroundColor: colores.crema, borderRadius: 10, paddingVertical: 8 }}>
                <Text style={{ fontSize: letra.numero - 4, fontWeight: '800', color: String(c) }}>{String(v)}</Text>
                <Text style={{ fontSize: 13, color: colores.textoSuave }}>{String(t)}</Text>
              </View>
            ))}
          </View>
          {p.pedidoEnCamino ? <Texto color={colores.azul}>Pedido en camino: cubre lo que hace falta.</Texto> : null}
        </Tarjeta>

        <Titulo>Existencia por ubicación</Titulo>
        <Tarjeta>
          {existencias.map((e) => (
            <View key={e.ubicacion_id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colores.cremaOscura }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontSize: letra.normal, color: colores.texto }}>
                  {e.nombre}
                  {!e.activa ? ' (desactivada)' : ''}
                </Text>
                <Text
                  style={{
                    fontSize: letra.grande,
                    fontWeight: '800',
                    color: e.minimo != null && e.cantidad <= e.minimo ? colores.naranja : colores.texto,
                  }}
                >
                  {e.cantidad}
                </Text>
              </View>
              {editandoMin === e.ubicacion_id ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <TextInput
                    value={textoMin}
                    onChangeText={setTextoMin}
                    keyboardType="number-pad"
                    placeholder="Ej.: 2 (vacío = sin mínimo)"
                    placeholderTextColor="#A69689"
                    style={[estilos.input, { flex: 1, minHeight: 44, paddingVertical: 6 }]}
                    autoFocus
                  />
                  <Boton texto="OK" pequeno onPress={() => guardarMin(e.ubicacion_id)} />
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    setEditandoMin(e.ubicacion_id);
                    setTextoMin(e.minimo != null ? String(e.minimo) : '');
                  }}
                >
                  <Text style={{ fontSize: letra.pequena, color: colores.azul, marginTop: 2 }}>
                    {e.minimo != null ? `Mínimo aquí: ${e.minimo} (cambiar)` : '+ Poner un mínimo para esta ubicación'}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </Tarjeta>

        <Titulo>Registrar movimiento</Titulo>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TIPOS_UI.map((t) => (
            <Boton
              key={t.clave}
              texto={t.titulo.replace(' / degustación', '').replace(' por conteo físico', '')}
              icono={t.icono}
              pequeno
              style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: t.color }}
              onPress={() => ir(t.clave)}
            />
          ))}
          <Boton
            texto="Conteo por foto"
            icono="camera-iris"
            pequeno
            variante="dorado"
            style={{ flexBasis: '47%', flexGrow: 1 }}
            onPress={() => router.push({ pathname: '/conteo/foto', params: { productoId: String(p.id) } })}
          />
        </View>

        <Titulo>Datos</Titulo>
        <Tarjeta>
          <Dato etiqueta="Código" valor={p.codigo} />
          <Dato etiqueta="Bodega" valor={p.bodega} />
          <Dato etiqueta="País / región" valor={[p.pais, p.region].filter(Boolean).join(', ')} />
          <Dato etiqueta="Añada" valor={p.anada} />
          <Dato etiqueta="Uva / variedad" valor={p.uva} />
          <Dato etiqueta="Tamaño" valor={p.tamano} />
          <Dato etiqueta="Proveedor" valor={p.proveedor} />
          <Dato etiqueta="Costo" valor={dinero(p.costo)} />
          <Dato etiqueta="Precio de venta" valor={dinero(p.precio)} />
          <Dato etiqueta="Máximo ideal" valor={p.maximo ?? `${p.minimo * 2} (2 × mínimo)`} />
          <Dato etiqueta="Valor a costo" valor={dinero(p.total * p.costo)} />
          <Dato etiqueta="Notas" valor={p.notas} />
        </Tarjeta>

        <Titulo>Últimos movimientos</Titulo>
        <Tarjeta>
          {movimientos.length === 0 ? (
            <Texto suave>Todavía no hay movimientos. Ejemplo: registra una Entrada para sumar las botellas que compraste.</Texto>
          ) : (
            movimientos.map((m) => <FilaMovimiento key={m.id} m={m} mostrarProducto={false} />)
          )}
          <Boton
            texto="Ver todo el historial"
            icono="history"
            variante="suave"
            pequeno
            style={{ marginTop: 10 }}
            onPress={() => router.push({ pathname: '/historial', params: { productoId: String(p.id) } })}
          />
        </Tarjeta>

        <Boton texto="Editar producto" icono="pencil" variante="secundario" onPress={() => router.push({ pathname: '/producto/editar', params: { id: String(p.id) } })} />
        <Boton texto="Borrar producto" icono="delete" variante="peligro" style={{ marginTop: 10 }} onPress={borrar} />
      </Pantalla>
    </>
  );
}
