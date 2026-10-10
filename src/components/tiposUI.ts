import { TipoMovimiento } from '../logic/movimientos';
import { colores } from '../theme';
import type { NombreIcono } from './ui';

export interface TipoUI {
  clave: TipoMovimiento | 'pedido';
  titulo: string;
  descripcion: string;
  icono: NombreIcono;
  color: string;
}

export const TIPOS_UI: TipoUI[] = [
  { clave: 'entrada', titulo: 'Entrada', descripcion: 'Compraste o recibiste botellas. Suma a la ubicación que elijas.', icono: 'tray-arrow-down', color: colores.verde },
  { clave: 'salida', titulo: 'Salida', descripcion: 'Se vendieron o consumieron. Resta de la ubicación.', icono: 'tray-arrow-up', color: colores.vino },
  { clave: 'transferencia', titulo: 'Transferencia', descripcion: 'Mover botellas de un lugar a otro (ej.: de la Cava al Bar). El total no cambia.', icono: 'swap-horizontal-bold', color: colores.azul },
  { clave: 'pedido', titulo: 'Pedido en tránsito', descripcion: 'Le pediste mercancía a un proveedor y todavía no llega. No suma hasta que la recibas.', icono: 'truck-delivery', color: '#5E35B1' },
  { clave: 'decomiso', titulo: 'Decomiso', descripcion: 'Botella rota, corcho dañado, vino oxidado o vencido, o retiro ordenado. Resta.', icono: 'delete-alert', color: colores.rojo },
  { clave: 'prueba', titulo: 'Prueba de boda / degustación', descripcion: 'Botellas abiertas para que un cliente pruebe antes de su evento. Resta.', icono: 'glass-wine', color: colores.doradoOscuro },
  { clave: 'ajuste', titulo: 'Ajuste por conteo físico', descripcion: 'Contaste y hay más o menos de lo que dice la app. Corrige y deja registrada la diferencia.', icono: 'clipboard-check', color: '#00796B' },
];

export const tipoUI = (clave: string) => TIPOS_UI.find((t) => t.clave === clave) ?? TIPOS_UI[0];
