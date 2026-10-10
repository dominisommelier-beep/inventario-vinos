import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface FotoTomada {
  /** Copia permanente dentro de la app. */
  uri: string;
  tipo: 'image/jpeg' | 'image/png' | 'image/webp';
}

function carpetaFotos(): Directory {
  const dir = new Directory(Paths.document, 'fotos');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function tipoDe(uri: string, mime?: string | null): FotoTomada['tipo'] {
  const m = (mime ?? '').toLowerCase();
  if (m.includes('png') || uri.toLowerCase().endsWith('.png')) return 'image/png';
  if (m.includes('webp') || uri.toLowerCase().endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/** Copia la foto a la carpeta de la app para que no se pierda si se borra la caché. */
function guardarCopia(uri: string, mime?: string | null): FotoTomada {
  const tipo = tipoDe(uri, mime);
  const ext = tipo === 'image/png' ? 'png' : tipo === 'image/webp' ? 'webp' : 'jpg';
  const destino = new File(carpetaFotos(), `foto-${Date.now()}.${ext}`);
  new File(uri).copySync(destino);
  return { uri: destino.uri, tipo };
}

/** Abre la cámara (origen 'camara') o la galería (origen 'galeria'). Devuelve null si se cancela. */
export async function obtenerFoto(origen: 'camara' | 'galeria'): Promise<FotoTomada | null> {
  if (origen === 'camara') {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) {
      Alert.alert('Falta permiso', 'Para tomar fotos, permite el uso de la cámara en los ajustes del teléfono.');
      return null;
    }
  }
  const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
  const r = origen === 'camara' ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  return guardarCopia(a.uri, a.mimeType);
}

/** Lado más largo (en píxeles) de la foto que se envía a la IA. */
const LADO_MAXIMO = 2000;

/**
 * Achica la foto (si hace falta) y la convierte a JPEG en base64 para enviarla a la IA.
 * Así nunca pasa del límite de tamaño de la API y cuesta menos.
 */
export async function prepararParaIA(uri: string): Promise<{ base64: string; tipo: 'image/jpeg' }> {
  const contexto = ImageManipulator.manipulate(uri);
  const original = await contexto.renderAsync();
  if (Math.max(original.width, original.height) > LADO_MAXIMO) {
    contexto.resize(original.width >= original.height ? { width: LADO_MAXIMO } : { height: LADO_MAXIMO });
  }
  const imagen = await contexto.renderAsync();
  const r = await imagen.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true });
  if (!r.base64) throw new Error('No se pudo preparar la foto.');
  return { base64: r.base64, tipo: 'image/jpeg' };
}
