/**
 * retired_local_notifications.ts — разовая отмена уже запланированных локальных уведомлений
 * удалённых функций.
 *
 * зачем (PM-201; подарки удалены — D09/PM-048; владелец: «миграция отменяет уже запланированные
 * на устройстве, а не только прекращает новые»): до обновления на устройстве мог остаться
 * запланированный 'gift_expiring' (пуш «подарок ждёт ещё 6 часов») — он сработал бы уже без подарка
 * и без экрана назначения. Планировщик gift_expiring удалён; здесь разово гасим хвост.
 * Отмена не требует разрешения на уведомления.
 *
 * Флаг «сделано» ставится ТОЛЬКО после полной отмены: если уведомления недоступны или чтение
 * расписания упало, повторим при следующем старте (каждый ранний выход логируется).
 * Модуль намеренно лёгкий: загрузчик expo-notifications приходит параметром, чтобы миграцию можно
 * было проверять без тяжёлого app/notifications.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { reportSwallowed } from './debug-logger';
export const RETIRED_LOCAL_NOTIFICATION_TYPES: readonly string[] = ['gift_expiring'];
export const GIFT_EXPIRING_NOTIF_ID_KEY = 'gift_expiring_notif_id_v1';
export const RETIRED_LOCAL_NOTIFS_CANCELLED_KEY = 'retired_local_notifs_cancelled_v1';

type ScheduledRequest = { identifier?: string; content?: { data?: { type?: string } } };

export interface RetiredNotificationsApi {
  getAllScheduledNotificationsAsync?: () => Promise<ScheduledRequest[]>;
  cancelScheduledNotificationAsync: (identifier: string) => Promise<void>;
}

type LoadNotifications = () => Promise<RetiredNotificationsApi | null>;

const TAG = '[NOTIF-RETIRED]';
let inFlight: Promise<void> | null = null;

async function run(loadNotifications: LoadNotifications): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(RETIRED_LOCAL_NOTIFS_CANCELLED_KEY).catch((error: unknown) => {
      console.warn(TAG, 'flag_read_failed', String(error));
      return null;
    });
    if (done === '1') return;
    const N = await loadNotifications();
    if (!N?.getAllScheduledNotificationsAsync) {
      console.warn(TAG, 'skip:notifications_unavailable', JSON.stringify({ hasModule: !!N }));
      return;
    }
    const storedId = await AsyncStorage.getItem(GIFT_EXPIRING_NOTIF_ID_KEY).catch((error: unknown) => { reportSwallowed('retired_local_notifications:run', error); return null; });
    if (storedId) await N.cancelScheduledNotificationAsync(storedId);
    const scheduled = await N.getAllScheduledNotificationsAsync();
    let cancelled = 0;
    for (const request of scheduled || []) {
      const type = request?.content?.data?.type;
      const id = request?.identifier;
      if (!id || !type || !RETIRED_LOCAL_NOTIFICATION_TYPES.includes(type)) continue;
      await N.cancelScheduledNotificationAsync(id);
      cancelled += 1;
    }
    await AsyncStorage.removeItem(GIFT_EXPIRING_NOTIF_ID_KEY);
    await AsyncStorage.setItem(RETIRED_LOCAL_NOTIFS_CANCELLED_KEY, '1');
    console.log(TAG, 'done', JSON.stringify({ storedId: !!storedId, cancelled }));
  } catch (error: unknown) {
    console.warn(TAG, 'failed_will_retry_next_launch', String(error));
  }
}

/** Идемпотентно и без гонок: параллельные вызовы делят один прогон. */
export function cancelRetiredLocalNotificationsOnce(loadNotifications: LoadNotifications): Promise<void> {
  if (!inFlight) {
    inFlight = run(loadNotifications).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
