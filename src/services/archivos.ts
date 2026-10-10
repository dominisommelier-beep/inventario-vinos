import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

/** Guarda un texto como archivo y abre el menú de compartir de Android (WhatsApp, correo, Drive…). */
export async function compartirArchivo(nombre: string, contenido: string, mime: string): Promise<void> {
  const archivo = new File(Paths.cache, nombre);
  if (archivo.exists) archivo.delete();
  archivo.create();
  archivo.write(contenido);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este teléfono no permite compartir archivos.');
  await Sharing.shareAsync(archivo.uri, { mimeType: mime, dialogTitle: `Compartir ${nombre}` });
}

/** Comparte un mensaje de texto (por ejemplo, un pedido) por WhatsApp, correo, SMS… */
export async function compartirTexto(titulo: string, mensaje: string): Promise<void> {
  await Share.share({ title: titulo, message: mensaje });
}

/** Deja elegir un archivo JSON (copia de seguridad) y devuelve su contenido, o null si se cancela. */
export async function elegirArchivoJSON(): Promise<string | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.length) return null;
  return new File(r.assets[0].uri).text();
}

export function nombreConFecha(base: string, ext: string): string {
  const d = new Date();
  const f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${base}-${f}.${ext}`;
}
