// Partes "puras" del conteo por foto: el mensaje que se envía a la IA y la
// lectura de su respuesta. La llamada por internet está en src/services/conteoFoto.ts.

export type Confianza = 'alto' | 'medio' | 'bajo';

export interface ProductoParaIA {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  descripcion: string;
}

export interface ItemContado {
  productoId: number | null;
  codigo: string;
  nombre: string;
  cantidad: number;
  confianza: Confianza;
  nota: string;
}

export interface ResultadoConteoIA {
  items: ItemContado[];
  notaGeneral: string;
}

export const AVISO_CONTEO_FOTO =
  'El conteo por foto es una ayuda y puede equivocarse. Revisa las cantidades antes de guardar.';

export const CONSEJOS_FOTO = [
  'Busca buena luz, sin reflejos fuertes ni sombras.',
  'Toma la foto de frente (estante) o desde arriba (caja abierta).',
  'Que se vean todas las botellas completas, sin cortar los bordes.',
  'Un solo producto o un solo estante por foto.',
  'Acércate lo suficiente para que se lean las etiquetas o tapas.',
];

/** Esquema JSON que la respuesta de la IA debe cumplir. */
export const ESQUEMA_RESPUESTA = {
  type: 'object',
  additionalProperties: false,
  required: ['productos', 'nota_general'],
  properties: {
    productos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['codigo', 'nombre', 'cantidad', 'confianza', 'nota'],
        properties: {
          codigo: { type: 'string', description: 'Código del producto de la lista, o "" si no está en la lista.' },
          nombre: { type: 'string' },
          cantidad: { type: 'integer', description: 'Unidades (botellas/latas) contadas en la foto.' },
          confianza: { type: 'string', enum: ['alto', 'medio', 'bajo'] },
          nota: { type: 'string', description: 'Qué no se ve bien, o "" si todo está claro.' },
        },
      },
    },
    nota_general: { type: 'string' },
  },
} as const;

export function describirProducto(p: {
  bodega?: string | null;
  uva?: string | null;
  anada?: string | null;
  tamano?: string | null;
  pais?: string | null;
}): string {
  return [p.bodega, p.uva, p.anada, p.tamano, p.pais].filter(Boolean).join(', ');
}

export function construirInstrucciones(productos: ProductoParaIA[], pista?: ProductoParaIA | null): string {
  const lista = productos
    .map((p) => `- ${p.codigo} | ${p.nombre} | ${p.categoria}${p.descripcion ? ' | ' + p.descripcion : ''}`)
    .join('\n');
  return [
    'Eres un asistente que cuenta botellas para el inventario de una cava de vinos y licores.',
    'Mira la foto (puede ser una caja abierta vista desde arriba o un estante visto de frente) y cuenta las unidades de cada producto que reconozcas.',
    '',
    'Reglas:',
    '- Usa SOLO códigos de la lista de productos de abajo. Si ves botellas que no corresponden a ningún producto de la lista, inclúyelas con codigo "" y describe lo que ves en "nombre".',
    '- Cuenta cada botella una sola vez. Si una botella está tapada o cortada y no estás seguro, inclúyela y explica en "nota".',
    '- confianza: "alto" si se ven claramente todas las unidades y las etiquetas; "medio" si hay dudas en algunas; "bajo" si la foto está oscura, borrosa o muchas unidades no se distinguen.',
    '- Escribe las notas en español sencillo.',
    '- Responde solo con el JSON pedido.',
    pista ? `\nLa persona indicó que la foto es del producto ${pista.codigo} (${pista.nombre}).` : '',
    '',
    'Lista de productos (código | nombre | categoría | descripción):',
    lista || '(no hay productos registrados)',
  ].join('\n');
}

/** Convierte la respuesta de la IA en una lista revisable, enlazando cada código con su producto. */
export function interpretarRespuesta(texto: string, productos: ProductoParaIA[]): ResultadoConteoIA {
  let datos: { productos?: unknown; nota_general?: unknown };
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error('La respuesta de la IA no se pudo leer. Intenta de nuevo con otra foto.');
  }
  const crudos = Array.isArray(datos.productos) ? datos.productos : [];
  const porCodigo = new Map(productos.map((p) => [p.codigo.toLowerCase(), p]));
  const items: ItemContado[] = [];
  for (const c of crudos as Record<string, unknown>[]) {
    const codigo = String(c.codigo ?? '').trim();
    const prod = porCodigo.get(codigo.toLowerCase()) ?? null;
    const cantidad = Math.max(0, Math.round(Number(c.cantidad) || 0));
    const confianza: Confianza = c.confianza === 'alto' || c.confianza === 'medio' ? c.confianza : 'bajo';
    const existente = prod ? items.find((i) => i.productoId === prod.id) : undefined;
    if (existente) {
      existente.cantidad += cantidad;
      continue;
    }
    items.push({
      productoId: prod?.id ?? null,
      codigo: prod?.codigo ?? codigo,
      nombre: prod?.nombre ?? String(c.nombre ?? 'Producto no identificado'),
      cantidad,
      confianza,
      nota: String(c.nota ?? ''),
    });
  }
  return { items, notaGeneral: String(datos.nota_general ?? '') };
}
