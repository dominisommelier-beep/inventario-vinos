export function dinero(n: number | null | undefined): string {
  const v = Math.round((n ?? 0) * 100) / 100;
  const partes = v.toFixed(v % 1 === 0 ? 0 : 2).split('.');
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `RD$ ${partes.join('.')}`;
}

export function numero(n: number | null | undefined): string {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Convierte lo escrito en un campo a número entero (null si está vacío o no es válido). */
export function aEntero(texto: string): number | null {
  const t = texto.trim();
  if (!t) return null;
  if (!/^-?\d+$/.test(t)) return NaN;
  return Number(t);
}

/** Convierte lo escrito a número con decimales (acepta 1,450.50 o 1450.5). */
export function aDecimal(texto: string): number | null {
  const t = texto.trim().replace(/,/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export function mensajeError(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as Error).message);
  return String(e);
}

export const plural = (n: number, uno: string, varios: string) => `${numero(n)} ${n === 1 ? uno : varios}`;
