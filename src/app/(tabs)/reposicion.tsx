import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Boton, Cargando, EtiquetaEstado, Pantalla, Tarjeta, Texto, Vacio } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { useCargar } from '../../hooks/useCargar';
import { leerAjuste } from '../../logic/catalogos';
import { csvReposicion } from '../../logic/exportar';
import { textoPedido } from '../../logic/pedidos';
import { GrupoReposicion, listarReposicion } from '../../logic/reportes';
import { compartirArchivo, compartirTexto, nombreConFecha } from '../../services/archivos';
import { colores, letra } from '../../theme';
import { dinero, mensajeError } from '../../utils/formato';

function Grupo({ g }: { g: GrupoReposicion }) {
  const { dbReal } = useApp();
  const porPedir = g.items.filter((i) => i.producto.sugerido > 0);

  const compartir = async () => {
    try {
      const negocio = (await leerAjuste(dbReal, 'negocio')) ?? undefined;
      await compartirTexto(
        `Pedido para ${g.proveedor}`,
        textoPedido({
          negocio,
          proveedor: g.proveedorId ? g.proveedor : null,
          lineas: porPedir.map((i) => ({ codigo: i.producto.codigo, nombre: i.producto.nombre, cantidad: i.producto.sugerido })),
        }),
      );
    } catch (e) {
      Alert.alert('No se pudo compartir', mensajeError(e));
    }
  };

  return (
    <Tarjeta>
      <Text style={{ fontSize: letra.grande, fontWeight: '700', color: colores.vino }}>{g.proveedor}</Text>
      {g.telefono || g.correo ? (
        <Texto suave>{[g.telefono, g.correo].filter(Boolean).join(' · ')}</Texto>
      ) : null}
      {g.items.map(({ producto: p, costoEstimado }) => (
        <Pressable
          key={p.id}
          onPress={() => router.push(`/producto/${p.id}`)}
          style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colores.cremaOscura }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: letra.normal, fontWeight: '700', color: colores.texto, flex: 1 }}>{p.nombre}</Text>
            <EtiquetaEstado estado={p.estado} />
          </View>
          <Text style={{ fontSize: letra.pequena, color: colores.textoSuave, marginTop: 4 }}>
            Hay {p.total} · Mínimo {p.minimo} · En tránsito {p.transito}
          </Text>
          {p.pedidoEnCamino ? (
            <Text style={{ fontSize: letra.normal, color: colores.azul, fontWeight: '700', marginTop: 4 }}>
              Pedido en camino: no hace falta pedir más
            </Text>
          ) : (
            <Text style={{ fontSize: letra.normal, color: colores.naranja, fontWeight: '700', marginTop: 4 }}>
              Pedir {p.sugerido} · aprox. {dinero(costoEstimado)}
            </Text>
          )}
        </Pressable>
      ))}
      {porPedir.length ? (
        <>
          <Text style={{ fontSize: letra.normal, fontWeight: '700', color: colores.texto, marginVertical: 10 }}>
            Total sugerido: {g.unidades} unidades · {dinero(g.costoEstimado)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Boton
              texto="Crear pedido"
              icono="truck-plus"
              pequeno
              style={{ flex: 1 }}
              onPress={() =>
                router.push({
                  pathname: '/pedidos/nuevo',
                  params: {
                    proveedorId: g.proveedorId ? String(g.proveedorId) : '',
                    lineas: JSON.stringify(porPedir.map((i) => ({ productoId: i.producto.id, cantidad: i.producto.sugerido }))),
                  },
                })
              }
            />
            <Boton texto="Compartir" icono="share-variant" variante="secundario" pequeno style={{ flex: 1 }} onPress={compartir} />
          </View>
        </>
      ) : null}
    </Tarjeta>
  );
}

export default function Reposicion() {
  const { db } = useApp();
  const { datos: grupos } = useCargar(listarReposicion);

  const exportar = async () => {
    try {
      await compartirArchivo(nombreConFecha('reposicion', 'csv'), await csvReposicion(db), 'text/csv');
    } catch (e) {
      Alert.alert('No se pudo exportar', mensajeError(e));
    }
  };

  if (!grupos) return <Cargando />;
  return (
    <Pantalla>
      {grupos.length === 0 ? (
        <Vacio
          icono="check-decagram"
          titulo="¡Todo en orden!"
          ejemplo={'Ningún producto está bajo su mínimo.\n\nEjemplo: si el Albariño tiene mínimo 4 y quedan 3, aparecerá aquí con la cantidad sugerida para pedir.'}
        />
      ) : (
        <>
          <Texto suave>
            Productos bajo su mínimo, agrupados por proveedor. Cantidad sugerida = máximo − (existencia + en tránsito).
          </Texto>
          <View style={{ height: 12 }} />
          {grupos.map((g) => (
            <Grupo key={String(g.proveedorId)} g={g} />
          ))}
          <Boton texto="Exportar a Excel (CSV)" icono="microsoft-excel" variante="secundario" onPress={exportar} />
        </>
      )}
    </Pantalla>
  );
}
