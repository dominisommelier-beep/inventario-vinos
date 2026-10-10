import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Escaner } from '../../components/Escaner';
import { Boton, Cargando, estilos, EtiquetaEstado, Opciones, Vacio } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { useCargar } from '../../hooks/useCargar';
import { listarCategorias, listarProveedores, listarUbicaciones } from '../../logic/catalogos';
import { buscarInventario, buscarPorCodigo, FiltrosInventario } from '../../logic/productos';
import { Estado, NOMBRE_ESTADO } from '../../logic/reposicion';
import { colores, colorEstado, espacio, letra } from '../../theme';

export default function Inventario() {
  const { db } = useApp();
  const params = useLocalSearchParams<{ estado?: string }>();
  const [texto, setTexto] = useState('');
  const [filtros, setFiltros] = useState<FiltrosInventario>({});
  const [verFiltros, setVerFiltros] = useState(false);
  const [escaneando, setEscaneando] = useState(false);

  useEffect(() => {
    if (params.estado) setFiltros((f) => ({ ...f, estado: params.estado as Estado }));
  }, [params.estado]);

  const { datos: productos } = useCargar((d) => buscarInventario(d, { ...filtros, texto }), [filtros, texto]);
  const { datos: catalogos } = useCargar(async (d) => ({
    categorias: await listarCategorias(d),
    ubicaciones: await listarUbicaciones(d),
    proveedores: await listarProveedores(d),
  }));

  const nFiltros = [filtros.categoriaId, filtros.ubicacionId, filtros.proveedorId, filtros.estado].filter(Boolean).length;

  const alEscanear = async (codigo: string) => {
    setEscaneando(false);
    const p = await buscarPorCodigo(db, codigo);
    if (p) router.push(`/producto/${p.id}`);
    else {
      Alert.alert('Código nuevo', `No hay ningún producto con el código ${codigo}. ¿Quieres agregarlo?`, [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, agregar', onPress: () => router.push({ pathname: '/producto/editar', params: { codigo } }) },
      ]);
    }
  };

  return (
    <View style={estilos.pantalla}>
      <View style={{ padding: espacio, paddingBottom: 8, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Buscar por código o nombre"
            placeholderTextColor="#A69689"
            style={[estilos.input, { flex: 1 }]}
            accessibilityLabel="Buscar"
          />
          <Pressable
            accessibilityLabel="Escanear código de barras"
            onPress={() => setEscaneando(true)}
            style={{ backgroundColor: colores.vino, borderRadius: 10, width: 56, alignItems: 'center', justifyContent: 'center' }}
          >
            <MaterialCommunityIcons name="barcode-scan" size={28} color={colores.blanco} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Boton
            texto={nFiltros ? `Filtros (${nFiltros})` : 'Filtros'}
            icono="filter-variant"
            variante="secundario"
            pequeno
            style={{ flex: 1 }}
            onPress={() => setVerFiltros(!verFiltros)}
          />
          <Boton texto="Nuevo producto" icono="plus" pequeno style={{ flex: 1 }} onPress={() => router.push('/producto/editar')} />
        </View>
        {verFiltros && catalogos ? (
          <View style={[estilos.tarjeta, { marginBottom: 0 }]}>
            <Opciones
              etiqueta="Estado"
              permitirNinguno
              valor={filtros.estado ?? null}
              onCambio={(v) => setFiltros({ ...filtros, estado: v })}
              opciones={(['agotado', 'bajo', 'en_camino', 'bien'] as Estado[]).map((e) => ({ valor: e, texto: NOMBRE_ESTADO[e] }))}
            />
            <Opciones
              etiqueta="Categoría"
              permitirNinguno
              valor={filtros.categoriaId ?? null}
              onCambio={(v) => setFiltros({ ...filtros, categoriaId: v })}
              opciones={catalogos.categorias.map((c) => ({ valor: c.id, texto: c.nombre }))}
            />
            <Opciones
              etiqueta="Ubicación"
              permitirNinguno
              valor={filtros.ubicacionId ?? null}
              onCambio={(v) => setFiltros({ ...filtros, ubicacionId: v })}
              opciones={catalogos.ubicaciones.map((u) => ({ valor: u.id, texto: u.nombre }))}
            />
            {catalogos.proveedores.length ? (
              <Opciones
                etiqueta="Proveedor"
                permitirNinguno
                valor={filtros.proveedorId ?? null}
                onCambio={(v) => setFiltros({ ...filtros, proveedorId: v })}
                opciones={catalogos.proveedores.map((p) => ({ valor: p.id, texto: p.nombre }))}
              />
            ) : null}
            {nFiltros ? <Boton texto="Quitar filtros" variante="suave" pequeno onPress={() => setFiltros({})} /> : null}
          </View>
        ) : null}
      </View>

      {!productos ? (
        <Cargando />
      ) : (
        <FlatList
          data={productos}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ paddingHorizontal: espacio, paddingBottom: 100 }}
          ListEmptyComponent={
            texto || nFiltros ? (
              <Vacio icono="magnify" titulo="No se encontró nada" ejemplo="Prueba con otra palabra o quita los filtros." />
            ) : (
              <Vacio
                icono="bottle-wine-outline"
                titulo="Tu inventario está vacío"
                ejemplo={'Empieza agregando tu primer vino. Por ejemplo:\nCódigo VT-001 · Marqués de Riscal Reserva · Tinto · mínimo 6.'}
                boton="Agregar mi primer producto"
                onPress={() => router.push('/producto/editar')}
              />
            )
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/producto/${item.id}`)}
              style={({ pressed }) => [
                estilos.tarjeta,
                { borderLeftWidth: 6, borderLeftColor: colorEstado[item.estado], padding: 12 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: letra.normal, fontWeight: '700', color: colores.texto }}>{item.nombre}</Text>
                  <Text style={{ fontSize: letra.pequena, color: colores.textoSuave, marginTop: 2 }}>
                    {item.codigo} · {item.categoria}
                    {item.tamano ? ` · ${item.tamano}` : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                    <EtiquetaEstado estado={item.estado} />
                    {item.transito > 0 ? (
                      <Text style={{ fontSize: letra.pequena, color: colores.azul }}>+{item.transito} en camino</Text>
                    ) : null}
                  </View>
                </View>
                <View style={{ alignItems: 'center', minWidth: 64 }}>
                  <Text style={{ fontSize: letra.numero, fontWeight: '800', color: colorEstado[item.estado] }}>{item.total}</Text>
                  <Text style={{ fontSize: 13, color: colores.textoSuave }}>mín. {item.minimo}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
      <Escaner visible={escaneando} onCerrar={() => setEscaneando(false)} onCodigo={alEscanear} />
    </View>
  );
}
