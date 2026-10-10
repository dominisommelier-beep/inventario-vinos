import type { Estado } from './logic/reposicion';

export const colores = {
  vino: '#6B1F2A',
  vinoOscuro: '#4A1219',
  vinoClaro: '#F3E3E5',
  crema: '#F7F1E6',
  cremaOscura: '#EADFCB',
  dorado: '#C9A44C',
  doradoOscuro: '#8C6D24',
  blanco: '#FFFFFF',
  texto: '#2B1B17',
  textoSuave: '#6B5A52',
  borde: '#D9CBB4',
  rojo: '#C62828',
  naranja: '#E07B00',
  azul: '#1565C0',
  verde: '#2E7D32',
};

export const colorEstado: Record<Estado, string> = {
  agotado: colores.rojo,
  bajo: colores.naranja,
  en_camino: colores.azul,
  bien: colores.verde,
};

export const letra = {
  pequena: 15,
  normal: 18,
  grande: 21,
  titulo: 26,
  numero: 30,
};

export const espacio = 16;
