// Reglas de reposición (funciones puras, sin base de datos).

export type Estado = 'agotado' | 'bajo' | 'en_camino' | 'bien';

export interface DatosReposicion {
  total: number;
  minimo: number;
  maximo: number | null;
  transito: number;
}

export interface ResultadoReposicion {
  /** Existencia ideal: el máximo, o 2 × mínimo si no hay máximo. */
  tope: number;
  /** Unidades sugeridas a pedir (nunca menos de 0). */
  sugerido: number;
  /** Existencia total menor o igual al mínimo. */
  bajoMinimo: boolean;
  /** Está bajo mínimo pero lo que viene en camino ya cubre la necesidad. */
  pedidoEnCamino: boolean;
  estado: Estado;
}

export function calcularReposicion({ total, minimo, maximo, transito }: DatosReposicion): ResultadoReposicion {
  const tope = maximo != null && maximo > 0 ? maximo : 2 * minimo;
  const sugerido = Math.max(0, tope - (total + transito));
  const bajoMinimo = total <= minimo;
  const pedidoEnCamino = bajoMinimo && transito > 0 && sugerido === 0;

  let estado: Estado = 'bien';
  if (total <= 0) estado = 'agotado';
  else if (pedidoEnCamino) estado = 'en_camino';
  else if (bajoMinimo) estado = 'bajo';

  return { tope, sugerido, bajoMinimo, pedidoEnCamino, estado };
}

export const NOMBRE_ESTADO: Record<Estado, string> = {
  agotado: 'Agotado',
  bajo: 'Bajo mínimo',
  en_camino: 'Pedido en camino',
  bien: 'Bien',
};
