/**
 * Раз в сутки отправить серию телефона на сервер (§59 координатора, баг серии 01.10).
 *
 * зачем: сервер узнавал серию телефона только вместе с событием занятия, и день, прожитый
 * без занятия (журнал телефона его помнит), оставлял облако позади — на другом устройстве
 * и после переустановки серия откатывалась. Сервер принимает присланное только если оно
 * правдоподобно (functions/src/progress_events.ts: streakEvidencePlausibility — не больше
 * дней подряд в списке активных дней и не больше возраста аккаунта), иначе оставляет своё.
 *
 * Стоимость: не больше одного вызова в сутки на человека и только при серии ≥ 2
 * (серию 1 сервер считает сам). Отметка «отправлено сегодня» — в AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getLocalDayKey } from './local_date';

const SENT_DAY_KEY = 'streak_server_sync_day_v1';
const MAX_ACTIVE_DAYS = 120;
const LOG = '[STREAK-SYNC]';

export type StreakServerSyncOutcome =
  | 'sent'
  | 'already_sent_today'
  | 'streak_too_small'
  | 'no_last_active'
  | 'failed';

export async function syncStreakToServerOncePerDay(streak: number): Promise<StreakServerSyncOutcome> {
  const day = getLocalDayKey();
  try {
    if ((await AsyncStorage.getItem(SENT_DAY_KEY)) === day) {
      console.log(`${LOG} skip reason=already_sent_today day=${day}`);
      return 'already_sent_today';
    }
    if (!Number.isFinite(streak) || streak < 2) {
      console.log(`${LOG} skip reason=streak_too_small streak=${streak}`);
      return 'streak_too_small';
    }
    const lastActive = await AsyncStorage.getItem('last_active_date');
    if (!lastActive) {
      console.log(`${LOG} skip reason=no_last_active`);
      return 'no_last_active';
    }
    const [{ getForegroundDailyMsMap }, { MIN_ACTIVE_MS }, { submitProgressEvent }] = await Promise.all([
      import('./foreground_usage_ms'),
      import('../modules/stats_activity_rows'),
      import('./progress_events_client'),
    ]);
    const msByDate = await getForegroundDailyMsMap();
    const activeDays = Object.keys(msByDate)
      .filter((key) => (Number(msByDate[key]) || 0) >= MIN_ACTIVE_MS)
      .sort()
      .slice(-MAX_ACTIVE_DAYS);
    const started = Date.now();
    const result = await submitProgressEvent({
      eventId: `streak_sync:${day}`,
      type: 'streak_sync',
      payload: {
        clientStreakCount: String(streak),
        clientLastActiveDate: lastActive,
        activeDays,
      },
    });
    await AsyncStorage.setItem(SENT_DAY_KEY, day);
    console.log(`${LOG} sent day=${day} streak=${streak} activeDays=${activeDays.length} server=${result.streakCount} duplicate=${result.duplicate} ms=${Date.now() - started}`);
    return 'sent';
  } catch (error) {
    // Отметку не ставим — повторим при следующем касании дня.
    console.warn(`${LOG} failed day=${day}`, error instanceof Error ? error.message : String(error));
    return 'failed';
  }
}

/* expo-router: keep this utility from being treated as a screen */
export default function __StreakServerSyncRouteShim() {
  return null;
}
