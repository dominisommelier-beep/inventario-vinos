import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AYUDA, guiaPorClave } from '../ayuda';
import { Estado, NOMBRE_ESTADO } from '../logic/reposicion';
import { colores, colorEstado, espacio, letra } from '../theme';

export type NombreIcono = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// ---------- Contenedores ----------

export function Pantalla({
  children,
  scroll = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  if (!scroll) return <View style={[estilos.pantalla, style]}>{children}</View>;
  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[{ padding: espacio, paddingBottom: 120 }, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Tarjeta({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [estilos.tarjeta, pressed && { opacity: 0.7 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[estilos.tarjeta, style]}>{children}</View>;
}

export function Titulo({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: espacio, marginBottom: 8 }, style]}>
      <Text style={estilos.titulo}>{children}</Text>
    </View>
  );
}

export function Texto({ children, suave, grande, negrita, color, centro }: {
  children: React.ReactNode;
  suave?: boolean;
  grande?: boolean;
  negrita?: boolean;
  color?: string;
  centro?: boolean;
}) {
  return (
    <Text
      style={{
        fontSize: grande ? letra.grande : suave ? letra.pequena : letra.normal,
        color: color ?? (suave ? colores.textoSuave : colores.texto),
        fontWeight: negrita ? '700' : '400',
        textAlign: centro ? 'center' : 'left',
        lineHeight: (grande ? letra.grande : suave ? letra.pequena : letra.normal) * 1.35,
      }}
    >
      {children}
    </Text>
  );
}

// ---------- Botones ----------

type Variante = 'primario' | 'secundario' | 'dorado' | 'peligro' | 'suave';

export function Boton({
  texto,
  icono,
  onPress,
  variante = 'primario',
  cargando,
  deshabilitado,
  style,
  pequeno,
}: {
  texto: string;
  icono?: NombreIcono;
  onPress: () => void;
  variante?: Variante;
  cargando?: boolean;
  deshabilitado?: boolean;
  style?: StyleProp<ViewStyle>;
  pequeno?: boolean;
}) {
  const fondo: Record<Variante, string> = {
    primario: colores.vino,
    secundario: colores.blanco,
    dorado: colores.dorado,
    peligro: colores.rojo,
    suave: colores.cremaOscura,
  };
  const colorTexto = variante === 'secundario' ? colores.vino : variante === 'suave' ? colores.texto : colores.blanco;
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      onPress={inactivo ? undefined : onPress}
      style={({ pressed }) => [
        estilos.boton,
        pequeno && { minHeight: 44, paddingVertical: 8 },
        { backgroundColor: fondo[variante] },
        variante === 'secundario' && { borderWidth: 2, borderColor: colores.vino },
        (pressed || inactivo) && { opacity: 0.6 },
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <>
          {icono && <MaterialCommunityIcons name={icono} size={pequeno ? 20 : 26} color={colorTexto} />}
          <Text style={[estilos.botonTexto, { color: colorTexto }, pequeno && { fontSize: letra.pequena + 1 }]}>{texto}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Botón grande cuadrado con ícono arriba (para accesos rápidos y tipos de movimiento). */
export function BotonGrande({
  texto,
  descripcion,
  icono,
  color = colores.vino,
  onPress,
  style,
}: {
  texto: string;
  descripcion?: string;
  icono: NombreIcono;
  color?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      onPress={onPress}
      style={({ pressed }) => [estilos.botonGrande, { borderLeftColor: color }, pressed && { opacity: 0.7 }, style]}
    >
      <View style={[estilos.iconoCirculo, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icono} size={30} color={colores.blanco} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={estilos.botonGrandeTexto}>{texto}</Text>
        {descripcion ? <Text style={estilos.botonGrandeDesc}>{descripcion}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={28} color={colores.textoSuave} />
    </Pressable>
  );
}

export function Atajo({ texto, icono, color, onPress }: { texto: string; icono: NombreIcono; color: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      onPress={onPress}
      style={({ pressed }) => [estilos.atajo, { backgroundColor: color }, pressed && { opacity: 0.75 }]}
    >
      <MaterialCommunityIcons name={icono} size={36} color={colores.blanco} />
      <Text style={estilos.atajoTexto}>{texto}</Text>
    </Pressable>
  );
}

// ---------- Formularios ----------

export function Campo({
  etiqueta,
  valor,
  onCambio,
  ejemplo,
  obligatorio,
  teclado,
  multilinea,
  ayuda,
  derecha,
  autoFocus,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (t: string) => void;
  ejemplo?: string;
  obligatorio?: boolean;
  teclado?: KeyboardTypeOptions;
  multilinea?: boolean;
  ayuda?: string;
  derecha?: React.ReactNode;
  autoFocus?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={estilos.etiqueta}>
        {etiqueta}
        {obligatorio ? <Text style={{ color: colores.rojo }}> *</Text> : null}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextInput
          value={valor}
          onChangeText={onCambio}
          placeholder={ejemplo}
          placeholderTextColor="#A69689"
          keyboardType={teclado}
          multiline={multilinea}
          autoFocus={autoFocus}
          accessibilityLabel={etiqueta}
          style={[estilos.input, multilinea && { minHeight: 90, textAlignVertical: 'top' }, { flex: 1 }]}
        />
        {derecha}
      </View>
      {ayuda ? <Text style={estilos.ayudaCampo}>{ayuda}</Text> : null}
    </View>
  );
}

export interface Opcion<T> {
  valor: T;
  texto: string;
}

/** Fila de "pastillas" para elegir una opción. */
export function Opciones<T>({
  etiqueta,
  opciones,
  valor,
  onCambio,
  obligatorio,
  permitirNinguno,
}: {
  etiqueta?: string;
  opciones: Opcion<T>[];
  valor: T | null;
  onCambio: (v: T | null) => void;
  obligatorio?: boolean;
  permitirNinguno?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      {etiqueta ? (
        <Text style={estilos.etiqueta}>
          {etiqueta}
          {obligatorio ? <Text style={{ color: colores.rojo }}> *</Text> : null}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {opciones.map((o) => {
          const activo = o.valor === valor;
          return (
            <Pressable
              key={String(o.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
              onPress={() => onCambio(activo && permitirNinguno ? null : o.valor)}
              style={[estilos.chip, activo && estilos.chipActivo]}
            >
              <Text style={[estilos.chipTexto, activo && { color: colores.blanco }]}>{o.texto}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------- Estados y mensajes ----------

export function EtiquetaEstado({ estado }: { estado: Estado }) {
  return (
    <View style={[estilos.estado, { backgroundColor: colorEstado[estado] }]}>
      <Text style={estilos.estadoTexto}>{NOMBRE_ESTADO[estado]}</Text>
    </View>
  );
}

export function Aviso({ texto, tipo = 'info' }: { texto: string; tipo?: 'info' | 'alerta' | 'error' | 'ok' }) {
  const c = { info: colores.azul, alerta: colores.naranja, error: colores.rojo, ok: colores.verde }[tipo];
  const icono: NombreIcono = { info: 'information', alerta: 'alert', error: 'alert-circle', ok: 'check-circle' }[tipo] as NombreIcono;
  return (
    <View style={[estilos.aviso, { borderLeftColor: c }]}>
      <MaterialCommunityIcons name={icono} size={24} color={c} />
      <Text style={{ flex: 1, fontSize: letra.normal - 1, color: colores.texto, lineHeight: 23 }}>{texto}</Text>
    </View>
  );
}

/** Lo que se muestra cuando una lista está vacía: explicación, ejemplo y botón para empezar. */
export function Vacio({
  icono,
  titulo,
  ejemplo,
  boton,
  onPress,
}: {
  icono: NombreIcono;
  titulo: string;
  ejemplo: string;
  boton?: string;
  onPress?: () => void;
}) {
  return (
    <View style={estilos.vacio}>
      <MaterialCommunityIcons name={icono} size={64} color={colores.dorado} />
      <Text style={[estilos.titulo, { textAlign: 'center', marginTop: 8 }]}>{titulo}</Text>
      <Text style={{ fontSize: letra.normal, color: colores.textoSuave, textAlign: 'center', marginVertical: 12, lineHeight: 25 }}>
        {ejemplo}
      </Text>
      {boton && onPress ? <Boton texto={boton} icono="plus" onPress={onPress} /> : null}
    </View>
  );
}

export function Cargando() {
  return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colores.vino} />
    </View>
  );
}

export function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string | number | null }) {
  if (valor === null || valor === undefined || valor === '') return null;
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colores.cremaOscura }}>
      <Text style={{ fontSize: letra.pequena + 1, color: colores.textoSuave, width: 130 }}>{etiqueta}</Text>
      <Text style={{ fontSize: letra.normal, color: colores.texto, flex: 1 }}>{String(valor)}</Text>
    </View>
  );
}

// ---------- Ayuda "?" ----------

export function BotonAyuda({ clave }: { clave: string }) {
  const [abierto, setAbierto] = useState(false);
  const info = AYUDA[clave];
  if (!info) return null;
  const guia = guiaPorClave(info.guia);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ayuda"
        onPress={() => setAbierto(true)}
        hitSlop={12}
        style={estilos.botonAyuda}
      >
        <Text style={{ color: colores.vino, fontSize: 22, fontWeight: '800' }}>?</Text>
      </Pressable>
      <Modal visible={abierto} animationType="slide" onRequestClose={() => setAbierto(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colores.crema }}>
          <ScrollView contentContainerStyle={{ padding: espacio, paddingBottom: 40 }}>
            <Text style={[estilos.titulo, { fontSize: letra.titulo }]}>Ayuda: {info.titulo}</Text>
            {info.texto ? <Text style={estilos.ayudaTexto}>{info.texto}</Text> : null}
            {guia ? <PasosGuia guia={guia} /> : null}
          </ScrollView>
          <View style={{ padding: espacio }}>
            <Boton texto="Entendido" icono="check" onPress={() => setAbierto(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

export function PasosGuia({ guia }: { guia: { titulo: string; ejemplo: string; pasos: string[] } }) {
  return (
    <View style={{ marginTop: 12 }}>
      {guia.titulo ? <Text style={[estilos.titulo, { fontSize: letra.grande }]}>{guia.titulo}</Text> : null}
      <View style={estilos.ejemplo}>
        <Text style={{ fontSize: letra.normal, color: colores.vinoOscuro, fontStyle: 'italic', lineHeight: 25 }}>
          Ejemplo: {guia.ejemplo}
        </Text>
      </View>
      {guia.pasos.map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 10, gap: 10 }}>
          <View style={estilos.numeroPaso}>
            <Text style={{ color: colores.blanco, fontWeight: '700', fontSize: letra.pequena }}>{i + 1}</Text>
          </View>
          <Text style={{ flex: 1, fontSize: letra.normal, color: colores.texto, lineHeight: 25 }}>{p}</Text>
        </View>
      ))}
    </View>
  );
}

export const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.crema },
  tarjeta: {
    backgroundColor: colores.blanco,
    borderRadius: 14,
    padding: espacio,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colores.cremaOscura,
  },
  titulo: { fontSize: letra.grande, fontWeight: '700', color: colores.vino },
  boton: {
    minHeight: 56,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  botonTexto: { fontSize: letra.normal, fontWeight: '700' },
  botonGrande: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colores.blanco,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 6,
    borderWidth: 1,
    borderColor: colores.cremaOscura,
  },
  iconoCirculo: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  botonGrandeTexto: { fontSize: letra.grande - 1, fontWeight: '700', color: colores.texto },
  botonGrandeDesc: { fontSize: letra.pequena, color: colores.textoSuave, marginTop: 2, lineHeight: 20 },
  atajo: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 110,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 6,
  },
  atajoTexto: { color: colores.blanco, fontSize: letra.normal, fontWeight: '700', textAlign: 'center' },
  etiqueta: { fontSize: letra.normal - 1, fontWeight: '600', color: colores.texto, marginBottom: 6 },
  input: {
    backgroundColor: colores.blanco,
    borderWidth: 1.5,
    borderColor: colores.borde,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: letra.normal,
    color: colores.texto,
    minHeight: 52,
  },
  ayudaCampo: { fontSize: letra.pequena, color: colores.textoSuave, marginTop: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colores.vino,
    backgroundColor: colores.blanco,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActivo: { backgroundColor: colores.vino },
  chipTexto: { fontSize: letra.pequena + 1, color: colores.vino, fontWeight: '600' },
  estado: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  estadoTexto: { color: colores.blanco, fontSize: letra.pequena - 1, fontWeight: '700' },
  aviso: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colores.blanco,
    borderLeftWidth: 5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  vacio: { alignItems: 'center', padding: 24, backgroundColor: colores.blanco, borderRadius: 16, marginTop: 12 },
  botonAyuda: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colores.dorado,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  ayudaTexto: { fontSize: letra.normal, color: colores.texto, lineHeight: 26, marginTop: 12 },
  ejemplo: { backgroundColor: colores.vinoClaro, borderRadius: 10, padding: 12, marginVertical: 12 },
  numeroPaso: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colores.vino,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
