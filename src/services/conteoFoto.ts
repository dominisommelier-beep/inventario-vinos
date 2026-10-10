import Anthropic from '@anthropic-ai/sdk';
import * as Network from 'expo-network';
import { DB } from '../db/types';
import {
  construirInstrucciones,
  describirProducto,
  ESQUEMA_RESPUESTA,
  interpretarRespuesta,
  ProductoParaIA,
  ResultadoConteoIA,
} from '../logic/conteoIA';
import { ahoraLocal } from '../logic/fechas';
import { listarResumen } from '../logic/productos';
import { leerClaveAPI } from './clave';
import { FotoTomada, prepararParaIA } from './fotos';

export const MODELO = 'claude-opus-5-5';

/** Errores que significan "no hay internet": la foto se guarda en la cola. */
export class SinConexion extends Error {
  constructor() {
    super('No hay conexión a internet.');
    this.name = 'SinConexion';
  }
}

export async function hayInternet(): Promise<boolean> {
  try {
    const estado = await Network.getNetworkStateAsync();
    return !!estado.isConnected && estado.isInternetReachable !== false;
  } catch {
    return true; // si no se puede saber, se intenta igual
  }
}

export async function productosParaIA(db: DB): Promise<ProductoParaIA[]> {
  const productos = await listarResumen(db);
  return productos.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    categoria: p.categoria,
    descripcion: describirProducto(p),
  }));
}

/**
 * Envía la foto a la API de Claude junto con la lista de productos y devuelve
 * lo que contó. NO cambia el inventario: eso solo pasa cuando la persona confirma.
 */
export async function contarConIA(db: DB, foto: FotoTomada, pistaProductoId?: number | null): Promise<ResultadoConteoIA> {
  const apiKey = await leerClaveAPI();
  if (!apiKey) {
    throw new Error('Falta tu clave de API. Ve a Más → Ajustes → Clave de API para el conteo por foto.');
  }
  if (!(await hayInternet())) throw new SinConexion();

  const productos = await productosParaIA(db);
  const pista = productos.find((p) => p.id === pistaProductoId) ?? null;
  const imagen = await prepararParaIA(foto.uri);

  // La clave es de la propia persona y vive solo en su teléfono.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, timeout: 120_000, maxRetries: 1 });

  const pedir = (conRespaldo: boolean) =>
    client.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      // Si el modelo principal no puede responder, la API usa otro modelo automáticamente.
      ...(conRespaldo ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      output_config: { effort: 'high', format: { type: 'json_schema', schema: ESQUEMA_RESPUESTA } },
      system: construirInstrucciones(productos, pista),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: imagen.tipo, data: imagen.base64 } },
            { type: 'text', text: 'Cuenta las botellas de esta foto y responde con el JSON.' },
          ],
        },
      ],
    });

  let respuesta: Anthropic.Beta.BetaMessage;
  try {
    try {
      respuesta = await pedir(true);
    } catch (e) {
      // Si la API no acepta el modelo de respaldo, se intenta una vez sin él.
      if (e instanceof Anthropic.BadRequestError && /fallback/i.test(String(e.message))) respuesta = await pedir(false);
      else throw e;
    }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      throw new Error('La clave de API no es válida. Revísala en Ajustes (debe empezar con "sk-ant-").');
    }
    if (e instanceof Anthropic.PermissionDeniedError) {
      throw new Error('Tu cuenta de Anthropic no tiene permiso para usar este servicio. Revisa tu cuenta en console.anthropic.com.');
    }
    if (e instanceof Anthropic.RateLimitError) {
      throw new Error('Se hicieron demasiadas solicitudes seguidas. Espera un minuto e intenta de nuevo.');
    }
    if (e instanceof Anthropic.BadRequestError) {
      const msg = String(e.message ?? '');
      if (/credit|balance|billing/i.test(msg)) {
        throw new Error('Tu cuenta de Anthropic no tiene saldo. Agrega créditos en console.anthropic.com → Billing.');
      }
      throw new Error('La foto no se pudo procesar. Prueba con otra foto (JPG o PNG, no muy pesada).');
    }
    if (e instanceof Anthropic.APIConnectionError) throw new SinConexion();
    if (e instanceof Anthropic.APIError) {
      throw new Error(`El servicio de IA no respondió bien (error ${e.status}). Intenta de nuevo más tarde.`);
    }
    throw e;
  }

  if (respuesta.stop_reason === 'refusal') {
    throw new Error('La IA no pudo analizar esta foto. Intenta con otra foto o haz el conteo a mano.');
  }
  if (respuesta.stop_reason === 'max_tokens') {
    throw new Error('La respuesta de la IA quedó incompleta. Intenta con una foto de menos botellas.');
  }
  const texto = respuesta.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text ?? '';
  return interpretarRespuesta(texto, productos);
}

// ---------- Cola de fotos sin conexión ----------

export interface FotoEnCola {
  id: number;
  uri: string;
  producto_id: number | null;
  ubicacion_id: number | null;
  creada: string;
  estado: 'pendiente' | 'lista' | 'error';
  resultado: string | null;
  error: string | null;
}

export async function encolarFoto(db: DB, foto: FotoTomada, ubicacionId: number, productoId?: number | null): Promise<number> {
  const r = await db.run('INSERT INTO cola_fotos (uri, producto_id, ubicacion_id, creada) VALUES (?, ?, ?, ?)', [
    foto.uri,
    productoId ?? null,
    ubicacionId,
    ahoraLocal(),
  ]);
  return r.lastInsertRowId;
}

export function listarCola(db: DB): Promise<FotoEnCola[]> {
  return db.all<FotoEnCola>('SELECT * FROM cola_fotos ORDER BY id DESC');
}

export async function quitarDeCola(db: DB, id: number): Promise<void> {
  await db.run('DELETE FROM cola_fotos WHERE id = ?', [id]);
}

/** Procesa las fotos pendientes si hay internet. Devuelve cuántas quedaron listas para revisar. */
export async function procesarCola(db: DB): Promise<number> {
  if (!(await hayInternet()) || !(await leerClaveAPI())) return 0;
  const pendientes = await db.all<FotoEnCola>("SELECT * FROM cola_fotos WHERE estado = 'pendiente' ORDER BY id");
  let listas = 0;
  for (const f of pendientes) {
    try {
      const tipo = f.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      const r = await contarConIA(db, { uri: f.uri, tipo }, f.producto_id);
      await db.run("UPDATE cola_fotos SET estado = 'lista', resultado = ?, error = NULL WHERE id = ?", [JSON.stringify(r), f.id]);
      listas++;
    } catch (e) {
      if (e instanceof SinConexion) break;
      await db.run("UPDATE cola_fotos SET estado = 'error', error = ? WHERE id = ?", [String((e as Error).message ?? e), f.id]);
    }
  }
  return listas;
}

/**
 * Guarda la foto en la cola y trata de contarla enseguida.
 * - 'lista': la IA respondió; falta que la persona revise y confirme.
 * - 'pendiente': no hay internet; se procesará cuando vuelva la conexión.
 * Si la IA da otro error, la foto se quita de la cola y se lanza el error.
 */
export async function contarFotoNueva(
  db: DB,
  foto: FotoTomada,
  ubicacionId: number,
  productoId?: number | null,
): Promise<{ colaId: number; estado: 'lista' | 'pendiente' }> {
  const colaId = await encolarFoto(db, foto, ubicacionId, productoId);
  try {
    const r = await contarConIA(db, foto, productoId);
    await db.run("UPDATE cola_fotos SET estado = 'lista', resultado = ? WHERE id = ?", [JSON.stringify(r), colaId]);
    return { colaId, estado: 'lista' };
  } catch (e) {
    if (e instanceof SinConexion) return { colaId, estado: 'pendiente' };
    await quitarDeCola(db, colaId);
    throw e;
  }
}
