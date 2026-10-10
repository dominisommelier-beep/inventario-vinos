import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Text, TextInput, View } from 'react-native';
import { Aviso, Boton, BotonAyuda, Campo, estilos, Opciones, Pantalla, Tarjeta, Texto, Titulo } from '../../components/ui';
import { useApp } from '../../estado/AppContext';
import { guardarAjuste, leerAjuste } from '../../logic/catalogos';
import { borrarEjemplos, cargarEjemplos, hayEjemplos } from '../../logic/ejemplos';
import { crearRespaldo, restaurarRespaldo } from '../../logic/exportar';
import { horaBonita } from '../../logic/fechas';
import { compartirArchivo, elegirArchivoJSON, nombreConFecha } from '../../services/archivos';
import { borrarClaveAPI, guardarClaveAPI, leerClaveAPI, ocultarClave } from '../../services/clave';
import { leerHoraResumen, prepararNotificaciones, reprogramarAlertas } from '../../services/notificaciones';
import { colores, letra } from '../../theme';
import { mensajeError } from '../../utils/formato';

const HORAS = ['7:00', '8:00', '9:00', '10:00', '12:00', '17:00', '20:00'];

export default function Ajustes() {
  const { db, dbReal, practica, cambiarPractica, reiniciarPractica, cambio } = useApp();
  const [negocio, setNegocio] = useState('');
  const [clave, setClave] = useState<string | null>(null);
  const [nuevaClave, setNuevaClave] = useState('');
  const [hora, setHora] = useState('9:00');
  const [horaLibre, setHoraLibre] = useState('');
  const [resumenActivo, setResumenActivo] = useState(true);
  const [permiso, setPermiso] = useState<boolean | null>(null);
  const [ejemplos, setEjemplos] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setNegocio((await leerAjuste(dbReal, 'negocio')) ?? '');
      setClave(await leerClaveAPI());
      const h = await leerHoraResumen(dbReal);
      setHora(`${h.hora}:${String(h.minuto).padStart(2, '0')}`);
      setResumenActivo((await leerAjuste(dbReal, 'resumen_diario')) !== 'no');
      setPermiso((await Notifications.getPermissionsAsync()).granted);
    })();
  }, [dbReal]);

  useEffect(() => {
    hayEjemplos(db).then(setEjemplos);
  }, [db]);

  const trabajar = async (que: string, fn: () => Promise<void>) => {
    setOcupado(que);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Algo salió mal', mensajeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const guardarHora = (texto: string) =>
    trabajar('hora', async () => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(texto.trim());
      if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new Error('Escribe la hora en formato 24 h, por ejemplo 9:00 o 18:30.');
      await guardarAjuste(dbReal, 'hora_resumen', `${Number(m[1])}:${m[2]}`);
      setHora(`${Number(m[1])}:${m[2]}`);
      setHoraLibre('');
      await reprogramarAlertas(dbReal);
    });

  const [hh, mm] = hora.split(':').map(Number);

  return (
    <>
      <Stack.Screen options={{ title: 'Ajustes', headerRight: () => <BotonAyuda clave="ajustes" /> }} />
      <Pantalla>
        <Titulo>Tu negocio</Titulo>
        <Campo
          etiqueta="Nombre del negocio"
          valor={negocio}
          onCambio={setNegocio}
          ejemplo="Ej.: Restaurante La Viña"
          ayuda="Aparece en los pedidos que compartes con tus proveedores."
        />
        <Boton texto="Guardar nombre" pequeno variante="secundario" onPress={() => trabajar('negocio', async () => {
          await guardarAjuste(dbReal, 'negocio', negocio.trim() || null);
          Alert.alert('Listo', 'Nombre guardado.');
        })} />

        <Titulo>Clave de API para el conteo por foto</Titulo>
        <Tarjeta>
          {clave ? (
            <Aviso tipo="ok" texto={`Clave guardada de forma segura: ${ocultarClave(clave)}`} />
          ) : (
            <Aviso tipo="alerta" texto="Todavía no hay clave. Sin ella, todo funciona menos el conteo por foto." />
          )}
          <Text style={estilos.etiqueta}>{clave ? 'Cambiar la clave' : 'Pega aquí tu clave'}</Text>
          <TextInput
            value={nuevaClave}
            onChangeText={setNuevaClave}
            placeholder="sk-ant-api03-…"
            placeholderTextColor="#A69689"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={[estilos.input, { marginBottom: 10 }]}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Boton
              texto="Guardar clave"
              pequeno
              style={{ flex: 1 }}
              cargando={ocupado === 'clave'}
              onPress={() =>
                trabajar('clave', async () => {
                  await guardarClaveAPI(nuevaClave);
                  setClave(await leerClaveAPI());
                  setNuevaClave('');
                  Alert.alert('Listo', 'La clave quedó guardada de forma segura en este teléfono.');
                })
              }
            />
            {clave ? (
              <Boton
                texto="Borrar clave"
                pequeno
                variante="peligro"
                style={{ flex: 1 }}
                onPress={() =>
                  Alert.alert('¿Borrar la clave?', 'El conteo por foto dejará de funcionar hasta que pongas otra.', [
                    { text: 'No', style: 'cancel' },
                    { text: 'Sí, borrar', style: 'destructive', onPress: async () => { await borrarClaveAPI(); setClave(null); } },
                  ])
                }
              />
            ) : null}
          </View>
          <Text style={[estilos.titulo, { fontSize: letra.normal, marginTop: 16 }]}>¿Cómo obtengo mi clave?</Text>
          {[
            'Entra a console.anthropic.com desde el navegador y crea una cuenta (o inicia sesión).',
            'Ve a "Billing" (Facturación) y agrega un método de pago y algo de crédito (por ejemplo, US$5).',
            'Ve a "API Keys" y toca "Create Key". Ponle un nombre, como "Mi Cava".',
            'Copia la clave (empieza con "sk-ant-"). Solo se muestra una vez.',
            'Vuelve aquí, pégala en el campo de arriba y toca "Guardar clave".',
          ].map((p, i) => (
            <Text key={i} style={{ fontSize: letra.normal - 1, color: colores.texto, marginTop: 6, lineHeight: 23 }}>
              {i + 1}. {p}
            </Text>
          ))}
          <Text style={{ fontSize: letra.pequena + 1, color: colores.textoSuave, marginTop: 10, lineHeight: 22 }}>
            Costo aproximado: entre US$0.05 y US$0.15 por foto (unos RD$3 a RD$9), según el tamaño de la foto y cuántos productos tengas. Con US$5 alcanza para unas 50 a 100 fotos. Solo pagas las fotos que envías.
          </Text>
          <Boton texto="Abrir console.anthropic.com" icono="open-in-new" pequeno variante="suave" style={{ marginTop: 10 }} onPress={() => Linking.openURL('https://console.anthropic.com')} />
        </Tarjeta>

        <Titulo>Alertas</Titulo>
        <Tarjeta>
          {permiso === false ? (
            <>
              <Aviso tipo="error" texto="Las notificaciones están desactivadas para Mi Cava. Sin ellas no te llegan las alertas." />
              <Boton
                texto="Activar notificaciones"
                icono="bell-ring"
                pequeno
                onPress={async () => {
                  const ok = await prepararNotificaciones();
                  setPermiso(ok);
                  if (ok) await reprogramarAlertas(dbReal);
                  else Linking.openSettings();
                }}
              />
            </>
          ) : null}
          <Opciones
            etiqueta="Resumen diario"
            valor={resumenActivo}
            onCambio={(v) =>
              trabajar('resumen', async () => {
                await guardarAjuste(dbReal, 'resumen_diario', v ? 'si' : 'no');
                setResumenActivo(!!v);
                await reprogramarAlertas(dbReal);
              })
            }
            opciones={[
              { valor: true, texto: 'Activado' },
              { valor: false, texto: 'Desactivado' },
            ]}
          />
          {resumenActivo ? (
            <>
              <Texto>Hora del resumen: {Number.isFinite(hh) ? horaBonita(hh, mm) : hora}</Texto>
              <View style={{ height: 8 }} />
              <Opciones valor={hora} onCambio={(v) => v && guardarHora(v)} opciones={HORAS.map((h) => ({ valor: h, texto: horaBonita(Number(h.split(':')[0]), 0) }))} />
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Campo etiqueta="Otra hora (24 h)" valor={horaLibre} onCambio={setHoraLibre} ejemplo="Ej.: 18:30" teclado="numbers-and-punctuation" />
                </View>
                <Boton texto="OK" pequeno style={{ marginBottom: 14 }} onPress={() => guardarHora(horaLibre)} />
              </View>
            </>
          ) : null}
          <Texto suave>
            También recibes un aviso enseguida cuando un movimiento deja un producto bajo su mínimo, y otro cuando un pedido pasa su fecha de llegada sin recibirse.
          </Texto>
          <Boton
            texto="Probar una notificación"
            icono="bell"
            pequeno
            variante="suave"
            style={{ marginTop: 10 }}
            onPress={() =>
              trabajar('prueba', async () => {
                if (!(await prepararNotificaciones())) throw new Error('Primero activa las notificaciones.');
                await Notifications.scheduleNotificationAsync({
                  content: { title: 'Mi Cava', body: 'Reponer: Marqués de Riscal – quedan 4, mínimo 6 (esto es una prueba)' },
                  trigger: { channelId: 'alertas' },
                });
              })
            }
          />
        </Tarjeta>

        <Titulo>Modo práctica</Titulo>
        <Tarjeta>
          <Texto>
            Usa una copia con datos de ejemplo para aprender sin tocar tu inventario real. Puedes hacer lo que quieras: nada afecta tus datos de verdad.
          </Texto>
          <View style={{ height: 10 }} />
          <Opciones
            valor={practica}
            onCambio={(v) => trabajar('practica', () => cambiarPractica(!!v))}
            opciones={[
              { valor: false, texto: 'Desactivado (inventario real)' },
              { valor: true, texto: 'Activado (práctica)' },
            ]}
          />
          {practica ? (
            <Boton
              texto="Empezar la práctica de cero"
              icono="restart"
              pequeno
              variante="suave"
              cargando={ocupado === 'reiniciar'}
              onPress={() => trabajar('reiniciar', reiniciarPractica)}
            />
          ) : null}
        </Tarjeta>

        <Titulo>Datos de ejemplo</Titulo>
        <Tarjeta>
          <Texto>
            {ejemplos
              ? `${practica ? 'La práctica' : 'Tu inventario'} tiene los 10 productos de ejemplo (marcados con "(ejemplo)" en sus proveedores). Bórralos cuando quieras empezar con tus datos reales.`
              : 'No hay datos de ejemplo cargados.'}
          </Texto>
          <View style={{ height: 10 }} />
          {ejemplos ? (
            <Boton
              texto="Borrar datos de ejemplo"
              icono="delete-sweep"
              variante="peligro"
              pequeno
              cargando={ocupado === 'ejemplos'}
              onPress={() =>
                Alert.alert(
                  '¿Borrar los datos de ejemplo?',
                  'Se borrarán los 10 productos de ejemplo con todos sus movimientos y pedidos. Lo que tú agregaste se queda.',
                  [
                    { text: 'No', style: 'cancel' },
                    {
                      text: 'Sí, borrar',
                      style: 'destructive',
                      onPress: () =>
                        trabajar('ejemplos', async () => {
                          await borrarEjemplos(db);
                          setEjemplos(false);
                          cambio();
                        }),
                    },
                  ],
                )
              }
            />
          ) : (
            <Boton
              texto="Cargar datos de ejemplo"
              icono="database-plus"
              variante="suave"
              pequeno
              cargando={ocupado === 'ejemplos'}
              onPress={() =>
                trabajar('ejemplos', async () => {
                  await cargarEjemplos(db);
                  setEjemplos(true);
                  cambio();
                })
              }
            />
          )}
        </Tarjeta>

        <Titulo>Copia de seguridad</Titulo>
        <Tarjeta>
          <Texto>
            Guarda todo tu inventario en un archivo para pasarlo a otro teléfono o por si pierdes este. Envíatelo por correo o guárdalo en Google Drive.
          </Texto>
          <Texto suave>Las fotos y la clave de API no se incluyen.</Texto>
          {practica ? <Aviso tipo="alerta" texto="Desactiva el modo práctica para hacer o restaurar copias de tu inventario real." /> : null}
          <View style={{ gap: 10, marginTop: 10 }}>
            <Boton
              texto="Exportar copia de seguridad"
              icono="cloud-upload"
              deshabilitado={practica}
              cargando={ocupado === 'respaldo'}
              onPress={() =>
                trabajar('respaldo', async () => {
                  const r = await crearRespaldo(dbReal);
                  await compartirArchivo(nombreConFecha('mi-cava-respaldo', 'json'), JSON.stringify(r), 'application/json');
                })
              }
            />
            <Boton
              texto="Restaurar desde un archivo"
              icono="cloud-download"
              variante="secundario"
              deshabilitado={practica}
              cargando={ocupado === 'restaurar'}
              onPress={() =>
                trabajar('restaurar', async () => {
                  const texto = await elegirArchivoJSON();
                  if (!texto) return;
                  let datos: unknown;
                  try {
                    datos = JSON.parse(texto);
                  } catch {
                    throw new Error('Este archivo no es una copia de seguridad de Mi Cava.');
                  }
                  Alert.alert(
                    '¿Reemplazar todo?',
                    'Todos los datos actuales de este teléfono se reemplazarán por los de la copia. Esto no se puede deshacer.',
                    [
                      { text: 'No', style: 'cancel' },
                      {
                        text: 'Sí, restaurar',
                        style: 'destructive',
                        onPress: () =>
                          trabajar('restaurar', async () => {
                            await restaurarRespaldo(dbReal, datos);
                            cambio();
                            Alert.alert('Listo', 'Tu inventario se restauró correctamente.');
                          }),
                      },
                    ],
                  );
                })
              }
            />
          </View>
        </Tarjeta>

        <Titulo>Listas</Titulo>
        <View style={{ gap: 10 }}>
          <Boton texto="Ubicaciones" icono="map-marker" variante="secundario" onPress={() => router.push('/ajustes/ubicaciones')} />
          <Boton texto="Categorías" icono="shape" variante="secundario" onPress={() => router.push('/ajustes/categorias')} />
          <Boton texto="Proveedores" icono="account-tie" variante="secundario" onPress={() => router.push('/ajustes/proveedores')} />
        </View>
      </Pantalla>
    </>
  );
}
