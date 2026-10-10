import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { Boton, Campo, Cargando, Pantalla, Tarjeta, Texto, Titulo, Vacio } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { useCargar } from '../../hooks/useCargar';
import { eliminarProveedor, guardarProveedor, listarProveedores, ProveedorInput } from '../../logic/catalogos';
import { colores, letra } from '../../theme';
import { mensajeError } from '../../utils/formato';

const VACIO: ProveedorInput = { id: null, nombre: '', telefono: '', correo: '' };

export default function Proveedores() {
  const { db, cambio } = useApp();
  const { datos } = useCargar(listarProveedores);
  const [form, setForm] = useState<ProveedorInput | null>(null);

  const guardar = async () => {
    if (!form) return;
    try {
      await guardarProveedor(db, form);
      setForm(null);
      cambio();
    } catch (e) {
      Alert.alert('Falta algo', mensajeError(e));
    }
  };

  const whatsapp = (tel: string) => Linking.openURL(`https://wa.me/${tel.replace(/\D/g, '').replace(/^(8[024]9)/, '1$1')}`);

  if (!datos) return <Cargando />;
  return (
    <>
      <Stack.Screen options={{ title: 'Proveedores' }} />
      <Pantalla>
        {form ? (
          <Tarjeta>
            <Titulo>{form.id ? 'Editar proveedor' : 'Nuevo proveedor'}</Titulo>
            <Campo etiqueta="Nombre" obligatorio valor={form.nombre} onCambio={(v) => setForm({ ...form, nombre: v })} ejemplo="Ej.: Distribuidora del Caribe" />
            <Campo etiqueta="Teléfono / WhatsApp" valor={form.telefono ?? ''} onCambio={(v) => setForm({ ...form, telefono: v })} teclado="phone-pad" ejemplo="Ej.: 809-555-0101" />
            <Campo etiqueta="Correo" valor={form.correo ?? ''} onCambio={(v) => setForm({ ...form, correo: v })} teclado="email-address" ejemplo="Ej.: ventas@proveedor.com" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Boton texto="Guardar" style={{ flex: 1 }} onPress={guardar} />
              <Boton texto="Cancelar" variante="secundario" style={{ flex: 1 }} onPress={() => setForm(null)} />
            </View>
          </Tarjeta>
        ) : (
          <Boton texto="Nuevo proveedor" icono="plus" onPress={() => setForm({ ...VACIO })} />
        )}

        {datos.length === 0 && !form ? (
          <Vacio
            icono="account-tie"
            titulo="Sin proveedores todavía"
            ejemplo={'Agrega a quien te vende los vinos para poder enviarle pedidos por WhatsApp o correo.\n\nEjemplo: Distribuidora del Caribe · 809-555-0101 · ventas@caribe.com'}
            boton="Agregar proveedor"
            onPress={() => setForm({ ...VACIO })}
          />
        ) : null}

        <View style={{ height: 12 }} />
        {datos.map((p) => (
          <Tarjeta key={p.id}>
            <Text style={{ fontSize: letra.grande - 1, fontWeight: '700', color: colores.texto }}>{p.nombre}</Text>
            {p.telefono ? <Texto suave>📞 {p.telefono}</Texto> : null}
            {p.correo ? <Texto suave>✉️ {p.correo}</Texto> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <Boton texto="Editar" icono="pencil" pequeno variante="secundario" onPress={() => setForm({ id: p.id, nombre: p.nombre, telefono: p.telefono, correo: p.correo })} />
              {p.telefono ? <Boton texto="WhatsApp" icono="whatsapp" pequeno variante="suave" onPress={() => whatsapp(p.telefono!)} /> : null}
              {p.correo ? <Boton texto="Correo" icono="email" pequeno variante="suave" onPress={() => Linking.openURL(`mailto:${p.correo}`)} /> : null}
              <Boton
                texto="Borrar"
                icono="delete"
                pequeno
                variante="peligro"
                onPress={() =>
                  Alert.alert('¿Borrar proveedor?', `Se borrará "${p.nombre}". Los productos que lo tenían quedarán sin proveedor.`, [
                    { text: 'No', style: 'cancel' },
                    { text: 'Sí, borrar', style: 'destructive', onPress: async () => { await eliminarProveedor(db, p.id); cambio(); } },
                  ])
                }
              />
            </View>
          </Tarjeta>
        ))}
      </Pantalla>
    </>
  );
}
