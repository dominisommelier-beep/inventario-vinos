// Textos de ayuda: el botón "?" de cada pantalla y la sección "¿Cómo se hace?".

export interface Guia {
  clave: string;
  titulo: string;
  ejemplo: string;
  pasos: string[];
}

export const GUIAS: Guia[] = [
  {
    clave: 'producto',
    titulo: 'Agregar un producto',
    ejemplo: 'Compraste un vino nuevo: Marqués de Riscal Reserva, código VT-001, mínimo 6 botellas.',
    pasos: [
      'Toca Inventario (abajo).',
      'Toca el botón "Nuevo producto".',
      'Código: VT-001 (o toca el ícono de cámara para escanear el código de barras).',
      'Nombre: Marqués de Riscal Reserva. Categoría: Tinto.',
      'Existencia mínima: 6. Si quieres, escribe la máxima (ej.: 24), el costo y el proveedor.',
      'Toca Guardar. El producto empieza con 0 botellas: registra una Entrada para sumarlas.',
    ],
  },
  {
    clave: 'entrada',
    titulo: 'Registrar una entrada (compra o recepción)',
    ejemplo: 'Llegaron 12 botellas de Catena Malbec y las guardaste en la Cava principal.',
    pasos: [
      'Toca Movimientos → Entrada (o el botón Entrada en Inicio).',
      'Elige el producto: Catena Malbec.',
      'Ubicación: Cava principal. Cantidad: 12.',
      'Escribe tu nombre como responsable y toca Guardar.',
      'Si te equivocaste, toca "Deshacer" en el aviso que aparece abajo.',
    ],
  },
  {
    clave: 'salida',
    titulo: 'Registrar una venta o consumo',
    ejemplo: 'En el Bar se vendieron 3 botellas de Ron Barceló Imperial.',
    pasos: [
      'Toca Movimientos → Salida.',
      'Elige el producto: Ron Barceló Imperial.',
      'Ubicación: Bar. Cantidad: 3. Motivo: Venta.',
      'Toca Guardar. Si el producto queda bajo su mínimo, te llegará un aviso para reponer.',
    ],
  },
  {
    clave: 'transferencia',
    titulo: 'Hacer una transferencia',
    ejemplo: 'Pasaste 6 botellas de Marqués de Riscal de la Cava principal al Bar.',
    pasos: [
      'Toca Movimientos → Transferencia.',
      'Elige el producto: Marqués de Riscal.',
      'Origen: Cava principal. Destino: Bar.',
      'Cantidad: 6.',
      'Toca Guardar. El total no cambia; solo cambia dónde están las botellas.',
    ],
  },
  {
    clave: 'pedido',
    titulo: 'Crear un pedido en tránsito',
    ejemplo: 'Le pediste 24 Cervezas Presidente a Distribuidora del Caribe; llegan el viernes.',
    pasos: [
      'Toca Movimientos → Pedido en tránsito (o en Reposición toca "Crear pedido").',
      'Elige el proveedor y agrega los productos con su cantidad: Cerveza Presidente, 24.',
      'Escribe la fecha estimada de llegada.',
      'Toca Guardar. El pedido NO suma a la existencia hasta que lo recibas.',
      'Puedes tocar "Compartir" para enviarlo por WhatsApp o correo.',
    ],
  },
  {
    clave: 'recibir',
    titulo: 'Recibir un pedido (completo o en parte)',
    ejemplo: 'Del pedido de 24 Presidente solo llegaron 18.',
    pasos: [
      'Toca Más → Pedidos en tránsito y abre el pedido.',
      'Toca "Recibir pedido".',
      'Elige dónde se guarda (ej.: Almacén).',
      'Cambia la cantidad recibida a 18 (viene escrito lo que falta).',
      'Si las otras 6 llegarán después, deja el pedido abierto. Si no llegarán, marca "No llegará más".',
      'Toca Guardar recepción. Las 18 se suman como Entrada.',
    ],
  },
  {
    clave: 'decomiso',
    titulo: 'Registrar un decomiso',
    ejemplo: 'Se rompió 1 botella de Moët & Chandon en la Cava principal.',
    pasos: [
      'Toca Movimientos → Decomiso.',
      'Elige el producto: Moët & Chandon.',
      'Ubicación: Cava principal. Cantidad: 1.',
      'Motivo: Botella rota (es obligatorio).',
      'Si quieres, toma una foto como evidencia.',
      'Toca Guardar. En Reportes verás cuánto dinero se perdió en decomisos cada mes.',
    ],
  },
  {
    clave: 'prueba',
    titulo: 'Registrar una prueba de boda o degustación',
    ejemplo: 'La pareja Pérez-Gómez probó 1 Moët y 1 Whispering Angel para su boda del 5 de diciembre.',
    pasos: [
      'Toca Movimientos → Prueba de boda.',
      'Elige el producto: Moët & Chandon. Cantidad: 1.',
      'Cliente o evento: Boda Pérez-Gómez. Fecha del evento: 2026-12-05.',
      'Responsable: quien atendió la prueba.',
      'Toca Guardar, y repite con el Whispering Angel.',
      'En Reportes → Pruebas de boda verás cuánto se gastó cada mes.',
    ],
  },
  {
    clave: 'conteo',
    titulo: 'Hacer un conteo físico',
    ejemplo: 'Contaste el Bar y hay 4 Catena Malbec, pero la app dice 5.',
    pasos: [
      'Toca Más → Conteo → Conteo físico.',
      'Elige la ubicación: Bar.',
      'Junto a cada producto escribe lo que contaste: Catena Malbec → 4.',
      'La app muestra la diferencia (faltan 1).',
      'Toca Guardar ajustes. Queda registrado un "Ajuste por conteo" con el faltante.',
    ],
  },
  {
    clave: 'foto',
    titulo: 'Contar con una foto',
    ejemplo: 'Tomas una foto desde arriba a una caja abierta de Casillero del Diablo.',
    pasos: [
      'Toca Conteo por foto (en Inicio) o Más → Conteo → Conteo por foto.',
      'Elige la ubicación que estás contando.',
      'Toca "Tomar foto" (o "Elegir de la galería"). Sigue los consejos: buena luz, de frente o desde arriba, que se vean todas las botellas.',
      'Espera unos segundos mientras la IA cuenta.',
      'Revisa cada número: puedes corregirlo a mano.',
      'Toca "Aceptar y guardar". Se crea un Ajuste por conteo con la foto como evidencia.',
      'Sin internet, la foto se guarda en una cola y se procesa cuando vuelva la conexión.',
    ],
  },
];

export interface AyudaPantalla {
  titulo: string;
  texto: string;
  guia?: string;
}

export const AYUDA: Record<string, AyudaPantalla> = {
  inicio: {
    titulo: 'Inicio',
    texto:
      'Aquí ves el resumen de tu cava: cuántos productos y botellas tienes, cuánto vale tu inventario a costo, cuántos productos hay que reponer, cuántos están agotados y cuántos pedidos vienen en camino.\n\nEjemplo: si ves "Por reponer: 3", toca esa tarjeta para ir a Reposición y ver qué pedir.\n\nLos botones grandes de abajo son atajos para lo que más se usa.',
  },
  inventario: {
    titulo: 'Inventario',
    texto:
      'La lista de todos tus productos con su existencia total y su color de estado:\n🔴 Agotado · 🟠 Bajo mínimo · 🔵 Pedido en camino · 🟢 Bien\n\nEjemplo: escribe "riscal" en el buscador para encontrar el Marqués de Riscal, o toca el ícono de cámara para buscar escaneando el código de barras. Usa los filtros para ver, por ejemplo, solo los Tintos que están en el Bar.',
    guia: 'producto',
  },
  producto: {
    titulo: 'Detalle del producto',
    texto:
      'Aquí ves todo sobre un producto: sus datos, cuántas unidades hay en cada ubicación, y sus últimos movimientos. Los botones de abajo registran movimientos de este producto directamente.\n\nEjemplo: en el Marqués de Riscal ves "Cava principal: 11 · Bar: 2". Toca Transferencia para pasar más botellas al Bar.\n\nTambién puedes poner un mínimo solo para una ubicación (ej.: que el Bar nunca tenga menos de 2).',
  },
  editar: {
    titulo: 'Agregar o editar producto',
    texto:
      'Solo 4 datos son obligatorios: código, nombre, categoría y existencia mínima. Todo lo demás es opcional.\n\nEjemplo: Código VT-001 · Nombre Marqués de Riscal Reserva · Categoría Tinto · Mínimo 6 · Máximo 24.\n\nEl mínimo es el número con el que la app te avisa que hay que reponer. El máximo es la cantidad ideal; se usa para calcular cuánto pedir.',
    guia: 'producto',
  },
  movimientos: {
    titulo: 'Movimientos',
    texto:
      'La existencia solo cambia registrando un movimiento, así siempre sabes qué pasó, cuándo y quién lo hizo. Elige el tipo de movimiento con las tarjetas.\n\nEjemplo: se vendieron 3 botellas en el Bar → toca "Salida".\n\nAbajo puedes abrir el Historial para ver todos los movimientos con filtros.',
  },
  entrada: { titulo: 'Entrada por compra', texto: '', guia: 'entrada' },
  salida: { titulo: 'Salida por venta o consumo', texto: '', guia: 'salida' },
  transferencia: { titulo: 'Transferencia', texto: '', guia: 'transferencia' },
  decomiso: { titulo: 'Decomiso', texto: '', guia: 'decomiso' },
  prueba: { titulo: 'Prueba de boda o degustación', texto: '', guia: 'prueba' },
  ajuste: { titulo: 'Ajuste por conteo físico', texto: '', guia: 'conteo' },
  historial: {
    titulo: 'Historial',
    texto:
      'Todos los movimientos, del más reciente al más antiguo. Usa los filtros para buscar por tipo, ubicación, responsable o fechas.\n\nEjemplo: para ver qué se sacó del Bar esta semana, elige Tipo: Salida y Ubicación: Bar, y pon la fecha "Desde".',
  },
  pedidos: {
    titulo: 'Pedidos en tránsito',
    texto:
      'Los pedidos que hiciste a tus proveedores y que todavía no llegan. No suman a la existencia hasta que tocas "Recibir pedido".\n\nEjemplo: el pedido de 24 Presidente aparece "En camino". Cuando llegue, ábrelo y toca Recibir pedido. Si pasa la fecha estimada y no ha llegado, se marca como atrasado y te llega un aviso.',
    guia: 'recibir',
  },
  nuevoPedido: { titulo: 'Nuevo pedido en tránsito', texto: '', guia: 'pedido' },
  reposicion: {
    titulo: 'Reposición',
    texto:
      'Los productos bajo su mínimo, agrupados por proveedor, con la cantidad que conviene pedir.\n\nCantidad sugerida = máximo − (existencia + lo que viene en camino). Si no pusiste máximo, se usa 2 × mínimo.\n\nEjemplo: Albariño con mínimo 4, máximo 12, quedan 2 y nada en camino → sugerido 10.\n\nToca "Crear pedido" para convertir la sugerencia en un pedido en tránsito, o "Compartir" para enviarla al proveedor por WhatsApp o correo.',
    guia: 'pedido',
  },
  conteo: {
    titulo: 'Conteo',
    texto:
      'Compara lo que dice la app con lo que hay de verdad, y corrige las diferencias.\n\n• Conteo físico: cuentas a mano y escribes los números.\n• Conteo por foto: tomas una foto y la inteligencia artificial cuenta por ti (necesita internet y tu clave de API).\n\nEn los dos casos, nada cambia hasta que tú confirmas.',
    guia: 'conteo',
  },
  conteoFoto: { titulo: 'Conteo por foto', texto: '', guia: 'foto' },
  reportes: {
    titulo: 'Reportes',
    texto:
      'Resumen de cada mes por tipo de movimiento, en unidades y en dinero (a costo).\n\nEjemplo: en septiembre ves "Decomisos: 3 unidades · RD$ 5,200" y "Pruebas de boda: 6 unidades · RD$ 14,300".\n\nAbajo está el gasto en pruebas de boda mes por mes, y botones para exportar a Excel (CSV).',
  },
  ajustes: {
    titulo: 'Ajustes',
    texto:
      'Configura la app: tu clave de API para el conteo por foto, la hora del resumen diario, las ubicaciones, categorías y proveedores, el modo práctica, la copia de seguridad y los datos de ejemplo.',
  },
};

export function guiaPorClave(clave?: string): Guia | undefined {
  return GUIAS.find((g) => g.clave === clave);
}
