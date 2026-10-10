import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DB } from '../db/types';
import { leerAjuste } from '../logic/catalogos';
import { Alerta } from '../logic/movimientos';
import { listarPedidos } from '../logic/pedidos';
import { resumenInicio } from '../logic/reportes';

const CANAL = 'alertas';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function prepararNotificaciones(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Alertas de inventario',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain) return false;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

/** 1. Aviso inmediato cuando un movimiento deja un producto bajo mínimo. */
export async function avisarReposicion(alertas: Alerta[], practica = false): Promise<void> {
  for (const a of alertas) {
    const donde = a.ubicacion ? ` en ${a.ubicacion}` : '';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${practica ? '[Práctica] ' : ''}Reponer: ${a.nombre}${donde}`,
        body: `Reponer: ${a.nombre}${donde} – quedan ${a.quedan}, mínimo ${a.minimo}`,
        data: { productoId: a.productoId },
      },
      trigger: { channelId: CANAL },
    });
  }
}

export async function leerHoraResumen(db: DB): Promise<{ hora: number; minuto: number }> {
  const v = await leerAjuste(db, 'hora_resumen');
  const [h, m] = (v ?? '9:00').split(':').map(Number);
  return { hora: Number.isFinite(h) ? h : 9, minuto: Number.isFinite(m) ? m : 0 };
}

/**
 * 2. Resumen diario y 3. avisos de pedidos atrasados.
 * Se reprograman cada vez que cambia el inventario, así el texto del resumen
 * siempre refleja la situación actual.
 */
export async function reprogramarAlertas(db: DB): Promise<void> {
  const permiso = await Notifications.getPermissionsAsync();
  if (!permiso.granted) return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const desactivado = (await leerAjuste(db, 'resumen_diario')) === 'no';
  if (!desactivado) {
    const { hora, minuto } = await leerHoraResumen(db);
    const r = await resumenInicio(db);
    const partes = [
      `${r.porReponer} por reponer`,
      `${r.agotados} agotado${r.agotados === 1 ? '' : 's'}`,
      `${r.pedidosEnTransito} pedido${r.pedidosEnTransito === 1 ? '' : 's'} en camino`,
    ];
    if (r.pedidosAtrasados > 0) partes.push(`${r.pedidosAtrasados} atrasado${r.pedidosAtrasados === 1 ? '' : 's'}`);
    await Notifications.scheduleNotificationAsync({
      identifier: 'resumen-diario',
      content: { title: 'Mi Cava – resumen del día', body: partes.join(' · ') },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: hora, minute: minuto, channelId: CANAL },
    });
  }

  const { hora, minuto } = await leerHoraResumen(db);
  const pedidos = await listarPedidos(db, true);
  for (const p of pedidos) {
    if (!p.fecha_estimada) continue;
    const [a, m, d] = p.fecha_estimada.split('-').map(Number);
    // El día siguiente a la fecha estimada, a la hora del resumen.
    const cuando = new Date(a, m - 1, d + 1, hora, minuto);
    if (cuando.getTime() <= Date.now()) continue; // ya atrasado: se ve en Inicio y en el resumen
    await Notifications.scheduleNotificationAsync({
      identifier: `pedido-${p.id}`,
      content: {
        title: 'Pedido atrasado',
        body: `El pedido #${p.id}${p.proveedor ? ' de ' + p.proveedor : ''} debía llegar el ${p.fecha_estimada} y no se ha recibido.`,
        data: { pedidoId: p.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: CANAL },
    });
  }
}
