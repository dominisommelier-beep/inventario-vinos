import * as SecureStore from 'expo-secure-store';

// La clave de la API de Anthropic se guarda cifrada en el teléfono con
// expo-secure-store. Nunca va en el código ni en la copia de seguridad.
const CLAVE = 'anthropic_api_key';

export async function leerClaveAPI(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CLAVE);
  } catch {
    // Si el almacén seguro no está disponible, se comporta como si no hubiera clave.
    return null;
  }
}

export async function guardarClaveAPI(valor: string): Promise<void> {
  const limpio = valor.trim();
  if (!limpio) {
    await SecureStore.deleteItemAsync(CLAVE);
    return;
  }
  if (!limpio.startsWith('sk-ant-')) {
    throw new Error('La clave no parece válida: debe empezar con "sk-ant-". Cópiala completa desde console.anthropic.com.');
  }
  await SecureStore.setItemAsync(CLAVE, limpio);
}

export function borrarClaveAPI(): Promise<void> {
  return SecureStore.deleteItemAsync(CLAVE);
}

export function ocultarClave(clave: string): string {
  return clave.length > 14 ? `${clave.slice(0, 10)}…${clave.slice(-4)}` : '••••';
}
