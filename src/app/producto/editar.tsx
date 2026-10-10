import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Escaner } from '../../components/Escaner';
import { FotoEvidencia } from '../../components/FotoEvidencia';
import { Boton, BotonAyuda, Campo, Opciones, Pantalla, Tarjeta, Texto, Titulo } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { useCargar } from '../../hooks/useCargar';
import { crearCategoria, guardarProveedor, listarCategorias, listarProveedores } from '../../logic/catalogos';
import { guardarProducto, obtenerProducto } from '../../logic/productos';
import { colores, letra } from '../../theme';
import { aDecimal, aEntero, mensajeError } from '../../utils/formato';

const TAMANOS = ['375 ml', '750 ml', '1.5 L'];

export default function EditarProducto() {
  const params = useLocalSearchParams<{ id?: string; codigo?: string }>();
  const editandoId = params.id ? Number(params.id) : null;
  const { db, cambio, mostrarAviso } = useApp();

  const [f, setF] = useState({
    codigo: params.codigo ?? '',
    nombre: '',
    categoriaId: null as number | null,
    bodega: '',
    pais: '',
    region: '',
    anada: '',
    uva: '',
    tamano: '750 ml',
    proveedorId: null as number | null,
    costo: '',
    precio: '',
    minimo: '',
    maximo: '',
    foto: null as string | null,
    notas: '',
  });
  const set = (k: keyof typeof f) => (v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const [masDatos, setMasDatos] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nuevaCat, setNuevaCat] = useState<string | null>(null);
  const [nuevoProv, setNuevoProv] = useState<{ nombre: string; telefono: string; correo: string } | null>(null);

  const { datos: cat, recargar } = useCargar(async (d) => ({
    categorias: await listarCategorias(d),
    proveedores: await listarProveedores(d),
  }));

  useEffect(() => {
    if (!editandoId) return;
    obtenerProducto(db, editandoId).then((p) => {
      if (!p) return;
      setF({
        codigo: p.codigo,
        nombre: p.nombre,
        categoriaId: p.categoria_id,
        bodega: p.bodega ?? '',
        pais: p.pais ?? '',
        region: p.region ?? '',
        anada: p.anada ?? '',
        uva: p.uva ?? '',
        tamano: p.tamano ?? '',
        proveedorId: p.proveedor_id,
        costo: p.costo ? String(p.costo) : '',
        precio: p.precio ? String(p.precio) : '',
        minimo: String(p.minimo),
        maximo: p.maximo ? String(p.maximo) : '',
        foto: p.foto,
        notas: p.notas ?? '',
      });
      setMasDatos(true);
    });
  }, [db, editandoId]);

  const guardar = async () => {
    const minimo = aEntero(f.minimo);
    const maximo = aEntero(f.maximo);
    const costo = aDecimal(f.costo);
    const precio = aDecimal(f.precio);
    if (Number.isNaN(costo) || Number.isNaN(precio)) {
      return Alert.alert('Revisa el costo y el precio', 'Escribe solo números. Ej.: 1450 o 1,450.50');
    }
    setGuardando(true);
    try {
      const id = await guardarProducto(db, {
        id: editandoId,
        codigo: f.codigo,
        nombre: f.nombre,
        categoriaId: f.categoriaId,
        bodega: f.bodega,
        pais: f.pais,
        region: f.region,
        anada: f.anada,
        uva: f.uva,
        tamano: f.tamano,
        proveedorId: f.proveedorId,
        costo,
        precio,
        minimo: minimo === null || Number.isNaN(minimo) ? null : minimo,
        maximo: maximo === null || Number.isNaN(maximo) ? null : maximo,
        foto: f.foto,
        notas: f.notas,
      });
      cambio();
      mostrarAviso(editandoId ? 'Producto actualizado.' : `Producto "${f.nombre.trim()}" agregado. Registra una Entrada para sumar sus botellas.`);
      if (editandoId) router.back();
      else router.replace(`/producto/${id}`);
    } catch (e) {
      Alert.alert('Falta algo', mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const agregarCategoria = async () => {
    try {
      const id = await crearCategoria(db, nuevaCat ?? '');
      setNuevaCat(null);
      recargar();
      set('categoriaId')(id);
    } catch (e) {
      Alert.alert('No se pudo crear', mensajeError(e));
    }
  };

  const agregarProveedor = async () => {
    if (!nuevoProv) return;
    try {
      const id = await guardarProveedor(db, nuevoProv);
      setNuevoProv(null);
      recargar();
      set('proveedorId')(id);
    } catch (e) {
      Alert.alert('No se pudo crear', mensajeError(e));
    }
  };

  const tamanoEsOtro = !!f.tamano && !TAMANOS.includes(f.tamano);

  return (
    <>
      <Stack.Screen options={{ title: editandoId ? 'Editar producto' : 'Nuevo producto', headerRight: () => <BotonAyuda clave="editar" /> }} />
      <Pantalla>
        <Texto suave>Los campos con * son obligatorios. Todo lo demás puedes llenarlo después.</Texto>
        <Titulo>Lo básico</Titulo>
        <Campo
          etiqueta="Código del producto"
          obligatorio
          valor={f.codigo}
          onCambio={set('codigo')}
          ejemplo="Ej.: VT-001"
          ayuda="Escríbelo o toca la cámara para escanear el código de barras."
          derecha={
            <Pressable
              accessibilityLabel="Escanear código de barras"
              onPress={() => setEscaneando(true)}
              style={{ backgroundColor: colores.vino, borderRadius: 10, width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name="barcode-scan" size={26} color={colores.blanco} />
            </Pressable>
          }
        />
        <Campo etiqueta="Nombre del producto" obligatorio valor={f.nombre} onCambio={set('nombre')} ejemplo="Ej.: Marqués de Riscal Reserva" />
        {cat ? (
          <Opciones
            etiqueta="Categoría"
            obligatorio
            valor={f.categoriaId}
            onCambio={set('categoriaId')}
            opciones={cat.categorias.map((c) => ({ valor: c.id, texto: c.nombre }))}
          />
        ) : null}
        {nuevaCat === null ? (
          <Pressable onPress={() => setNuevaCat('')} style={{ marginTop: -6, marginBottom: 14 }}>
            <Text style={{ color: colores.azul, fontSize: letra.normal - 1 }}>+ Crear una categoría nueva</Text>
          </Pressable>
        ) : (
          <Tarjeta>
            <Campo etiqueta="Nombre de la categoría nueva" valor={nuevaCat} onCambio={setNuevaCat} ejemplo="Ej.: Sake" autoFocus />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Boton texto="Crear" pequeno style={{ flex: 1 }} onPress={agregarCategoria} />
              <Boton texto="Cancelar" pequeno variante="secundario" style={{ flex: 1 }} onPress={() => setNuevaCat(null)} />
            </View>
          </Tarjeta>
        )}
        <Campo
          etiqueta="Existencia mínima"
          obligatorio
          valor={f.minimo}
          onCambio={set('minimo')}
          teclado="number-pad"
          ejemplo="Ej.: 6"
          ayuda="Cuando el total llegue a este número o menos, la app te avisa que hay que reponer."
        />

        <Pressable onPress={() => setMasDatos(!masDatos)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 10 }}>
          <MaterialCommunityIcons name={masDatos ? 'chevron-up' : 'chevron-down'} size={28} color={colores.vino} />
          <Text style={{ fontSize: letra.grande, fontWeight: '700', color: colores.vino }}>Más datos (opcional)</Text>
        </Pressable>

        {masDatos ? (
          <>
            <Campo
              etiqueta="Existencia máxima (ideal)"
              valor={f.maximo}
              onCambio={set('maximo')}
              teclado="number-pad"
              ejemplo="Ej.: 24"
              ayuda="Se usa para calcular cuánto pedir. Si lo dejas vacío, se usa 2 × mínimo."
            />
            <Campo etiqueta="Costo por unidad (RD$)" valor={f.costo} onCambio={set('costo')} teclado="decimal-pad" ejemplo="Ej.: 1450" />
            <Campo etiqueta="Precio de venta (RD$)" valor={f.precio} onCambio={set('precio')} teclado="decimal-pad" ejemplo="Ej.: 2600" />
            <Campo etiqueta="Bodega o productor" valor={f.bodega} onCambio={set('bodega')} ejemplo="Ej.: Marqués de Riscal" />
            <Campo etiqueta="País" valor={f.pais} onCambio={set('pais')} ejemplo="Ej.: España" />
            <Campo etiqueta="Región" valor={f.region} onCambio={set('region')} ejemplo="Ej.: Rioja" />
            <Campo etiqueta="Añada" valor={f.anada} onCambio={set('anada')} teclado="number-pad" ejemplo="Ej.: 2019" />
            <Campo etiqueta="Uva o variedad" valor={f.uva} onCambio={set('uva')} ejemplo="Ej.: Tempranillo" />
            <Opciones
              etiqueta="Tamaño de botella"
              valor={tamanoEsOtro ? 'otro' : f.tamano || null}
              onCambio={(v) => set('tamano')(v === 'otro' ? ' ' : v ?? '')}
              opciones={[...TAMANOS.map((t) => ({ valor: t, texto: t })), { valor: 'otro', texto: 'Otro' }]}
            />
            {tamanoEsOtro ? (
              <Campo etiqueta="Otro tamaño" valor={f.tamano.trim()} onCambio={set('tamano')} ejemplo="Ej.: 3 L o 650 ml" />
            ) : null}

            {cat ? (
              <Opciones
                etiqueta="Proveedor"
                permitirNinguno
                valor={f.proveedorId}
                onCambio={set('proveedorId')}
                opciones={cat.proveedores.map((p) => ({ valor: p.id, texto: p.nombre }))}
              />
            ) : null}
            {nuevoProv === null ? (
              <Pressable onPress={() => setNuevoProv({ nombre: '', telefono: '', correo: '' })} style={{ marginTop: -6, marginBottom: 14 }}>
                <Text style={{ color: colores.azul, fontSize: letra.normal - 1 }}>+ Agregar un proveedor nuevo</Text>
              </Pressable>
            ) : (
              <Tarjeta>
                <Campo etiqueta="Nombre del proveedor" obligatorio valor={nuevoProv.nombre} onCambio={(v) => setNuevoProv({ ...nuevoProv, nombre: v })} ejemplo="Ej.: Distribuidora del Caribe" />
                <Campo etiqueta="Teléfono / WhatsApp" valor={nuevoProv.telefono} onCambio={(v) => setNuevoProv({ ...nuevoProv, telefono: v })} teclado="phone-pad" ejemplo="Ej.: 809-555-0101" />
                <Campo etiqueta="Correo" valor={nuevoProv.correo} onCambio={(v) => setNuevoProv({ ...nuevoProv, correo: v })} teclado="email-address" ejemplo="Ej.: ventas@proveedor.com" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Boton texto="Agregar" pequeno style={{ flex: 1 }} onPress={agregarProveedor} />
                  <Boton texto="Cancelar" pequeno variante="secundario" style={{ flex: 1 }} onPress={() => setNuevoProv(null)} />
                </View>
              </Tarjeta>
            )}

            <FotoEvidencia uri={f.foto} onCambio={set('foto')} etiqueta="Foto del producto (opcional)" />
            <Campo etiqueta="Notas" valor={f.notas} onCambio={set('notas')} ejemplo="Ej.: Servir a 16 °C. Muy pedido los viernes." multilinea />
          </>
        ) : null}

        <Boton texto="Guardar" icono="content-save" onPress={guardar} cargando={guardando} style={{ marginTop: 8 }} />
        <Boton texto="Cancelar" variante="secundario" style={{ marginTop: 10 }} onPress={() => router.back()} />
      </Pantalla>
      <Escaner
        visible={escaneando}
        onCerrar={() => setEscaneando(false)}
        onCodigo={(c) => {
          setEscaneando(false);
          set('codigo')(c);
        }}
      />
    </>
  );
}
