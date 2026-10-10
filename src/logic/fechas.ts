// Las fechas se guardan en hora local del teléfono, como texto:
// fecha y hora "2026-10-10T14:30:00" y día "2026-10-10".

const dos = (n: number) => String(n).padStart(2, '0');

export function ahoraLocal(d: Date = new Date()): string {
  return `${diaLocal(d)}T${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}

export function diaLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

export function sumarDias(dia: string, dias: number): string {
  const [a, m, d] = dia.split('-').map(Number);
  return diaLocal(new Date(a, m - 1, d + dias));
}

export function esDiaValido(dia: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  const [a, m, d] = dia.split('-').map(Number);
  const f = new Date(a, m - 1, d);
  return f.getFullYear() === a && f.getMonth() === m - 1 && f.getDate() === d;
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function nombreMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return `${MESES[m - 1]} ${a}`;
}

/** "10/10/2026 2:30 p. m." */
export function fechaBonita(valor: string | null | undefined): string {
  if (!valor) return '';
  const [dia, hora] = valor.split('T');
  const [a, m, d] = dia.split('-');
  if (!hora) return `${d}/${m}/${a}`;
  const [hh, mm] = hora.split(':').map(Number);
  const sufijo = hh < 12 ? 'a. m.' : 'p. m.';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${d}/${m}/${a} ${h12}:${dos(mm)} ${sufijo}`;
}

export function horaBonita(hora: number, minuto: number): string {
  const sufijo = hora < 12 ? 'a. m.' : 'p. m.';
  const h12 = hora % 12 === 0 ? 12 : hora % 12;
  return `${h12}:${dos(minuto)} ${sufijo}`;
}
