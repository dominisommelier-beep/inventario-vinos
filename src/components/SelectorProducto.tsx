import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../estado/AppContext';
import { listarResumen, ProductoResumen } from '../logic/productos';
import { colores, espacio, letra } from '../theme';
import { Escaner } from './Escaner';
import { Boton, estilos, EtiquetaEstado } from './ui';

/** Campo para elegir un producto: abre una lista con buscador y lector de código de barras. */
export function SelectorProducto({
  productoId,
  onCambio,
  etiqueta = 'Producto',
}: {
  productoId: number | null;
  onCambio: (p: ProductoResumen) => void;
  etiqueta?: string;
}) {
  const { db, version } = useApp();
  const [productos, setProductos] = useState<ProductoResumen[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [texto, setTexto] = useState('');

  useEffect(() => {
    listarResumen(db).then(setProductos).catch(() => undefined);
  }, [db, version]);

  const elegido = productos.find((p) => p.id === productoId);
  const filtrados = useMemo(() => {
    const t = texto.trim().toLowerCase();
    if (!t) return productos;
    return productos.filter((p) => p.nombre.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t));
  }, [productos, texto]);

  const elegir = (p: ProductoResumen) => {
    onCambio(p);
    setAbierto(false);
    setTexto('');
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={estilos.etiqueta}>
        {etiqueta}
        <Text style={{ color: colores.rojo }}> *</Text>
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Elegir producto"
        onPress={() => setAbierto(true)}
        style={[estilos.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
      >
        <View style={{ flex: 1 }}>
          {elegido ? (
            <>
              <Text style={{ fontSize: letra.normal, color: colores.texto, fontWeight: '600' }}>{elegido.nombre}</Text>
              <Text style={{ fontSize: letra.pequena, color: colores.textoSuave }}>
                {elegido.codigo} · Total: {elegido.total}
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: letra.normal, color: '#A69689' }}>Toca para elegir (ej.: Marqués de Riscal)</Text>
          )}
        </View>
        <MaterialCommunityIcons name="chevron-down" size={28} color={colores.vino} />
      </Pressable>

      <Modal visible={abierto} animationType="slide" onRequestClose={() => setAbierto(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colores.crema }}>
          <View style={{ padding: espacio, gap: 10 }}>
            <Text style={[estilos.titulo, { fontSize: letra.titulo }]}>Elige el producto</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={texto}
                onChangeText={setTexto}
                placeholder="Busca por nombre o código"
                placeholderTextColor="#A69689"
                autoFocus
                style={[estilos.input, { flex: 1 }]}
              />
              <Pressable
                accessibilityLabel="Escanear código de barras"
                onPress={() => setEscaneando(true)}
                style={{ backgroundColor: colores.vino, borderRadius: 10, width: 56, alignItems: 'center', justifyContent: 'center' }}
              >
                <MaterialCommunityIcons name="barcode-scan" size={28} color={colores.blanco} />
              </Pressable>
            </View>
          </View>
          <FlatList
            data={filtrados}
            keyExtractor={(p) => String(p.id)}
            contentContainerStyle={{ paddingHorizontal: espacio, paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={{ fontSize: letra.normal, color: colores.textoSuave, textAlign: 'center', marginTop: 30 }}>
                {productos.length === 0
                  ? 'Todavía no hay productos. Primero agrega uno en Inventario → Nuevo producto.'
                  : 'Ningún producto coincide con la búsqueda.'}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => elegir(item)}
                style={({ pressed }) => [estilos.tarjeta, { marginBottom: 8, padding: 12 }, pressed && { opacity: 0.6 }]}
              >
                <Text style={{ fontSize: letra.normal, fontWeight: '700', color: colores.texto }}>{item.nombre}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontSize: letra.pequena, color: colores.textoSuave }}>
                    {item.codigo} · Total: {item.total}
                  </Text>
                  <EtiquetaEstado estado={item.estado} />
                </View>
              </Pressable>
            )}
          />
          <View style={{ padding: espacio }}>
            <Boton texto="Cancelar" variante="secundario" onPress={() => setAbierto(false)} />
          </View>
        </SafeAreaView>
        <Escaner
          visible={escaneando}
          onCerrar={() => setEscaneando(false)}
          onCodigo={(codigo) => {
            setEscaneando(false);
            const p = productos.find((x) => x.codigo.toLowerCase() === codigo.toLowerCase());
            if (p) elegir(p);
            else {
              setTexto(codigo);
              Alert.alert('Código no encontrado', `No hay ningún producto con el código ${codigo}. Puedes agregarlo en Inventario → Nuevo producto.`);
            }
          }}
        />
      </Modal>
    </View>
  );
}
