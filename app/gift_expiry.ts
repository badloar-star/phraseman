/**
 * Срок жизни подарков: единый TTL 72 часа для всего полученного.
 *
 * зачем (2026-08-02, владелец): подарок с тикающим таймером — скрытый двигатель
 * возвратов («сгорит через 6 часов» — пуш про потерю своего добра, а не спам).
 * Каждый полученный подарок несёт индивидуальный таймер с момента получения
 * и исчезает из раздела «Подарки», когда срок вышел.
 *
 * Здесь же — карта «впервые увидели» для бонусов без собственного срока
 * (банк XP, скидка на пари, бесплатный буст лиги): их выдача живёт в
 * level_gift_system.ts (занят параллельной сессией), поэтому отсчёт стартует
 * при первом показе бонуса в разделе — для пользователя это неотличимо от
 * «сразу при получении», раньше он таймер увидеть не мог.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';

export const GIFT_TTL_MS = 72 * 60 * 60 * 1000;

/** Порог «скоро сгорит»: последние 6 часов таймер подсвечивается тёплым. */
export const GIFT_EXPIRY_WARN_MS = 6 * 60 * 60 * 1000;

/** Карта «вид бонуса → мс первого показа» для бонусов без собственного срока. */
export const GIFT_FIRST_SEEN_KEY = 'gift_first_seen_v1';

// зачем 2026-08-03 (владелец: «подарки применил, а в активных не появились»):
// добавлен golden_lesson. У «Золотого урока» нет собственного срока — это заряд
// на следующий урок, поэтому ему, как банку XP и скидке пари, отсчитывается 72ч
// от первого показа в разделе «Активные».
export type GiftFirstSeenKind = 'xp_bank' | 'wager_discount' | 'club_boost' | 'golden_lesson';

export type GiftFirstSeenMap = Partial<Record<GiftFirstSeenKind, number>>;

/** «чч:мм:сс» с ведущими нулями; часов может быть больше 24 (72-часовой TTL). */
export const giftCountdownLabel = (msLeft: number): string => {
  const totalSeconds = Math.floor(Math.max(0, msLeft) / 1000);
  const pad = (value: number): string => String(value).padStart(2, '0');
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/** Ближайшая локальная полночь (границы через части даты — DST-безопасно). */
export const nextLocalMidnightMs = (nowMs: number): number =>
  localMidnightAfterDaysMs(nowMs, 1);

/** Локальная полночь через `days` суток от nowMs. */
export const localMidnightAfterDaysMs = (nowMs: number, days: number): number => {
  const d = new Date(nowMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + Math.max(0, Math.floor(days))).getTime();
};

export const loadGiftFirstSeenMap = async (): Promise<GiftFirstSeenMap> => {
  try {
    const raw = await AsyncStorage.getItem(GIFT_FIRST_SEEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const map: GiftFirstSeenMap = {};
    for (const [kind, ms] of Object.entries(parsed as Record<string, unknown>)) {
      const value = Number(ms);
      if (Number.isFinite(value) && value > 0) map[kind as GiftFirstSeenKind] = value;
    }
    return map;
  } catch {
    return {};
  }
};

export const persistGiftFirstSeenMap = async (map: GiftFirstSeenMap): Promise<void> => {
  try {
    await AsyncStorage.setItem(GIFT_FIRST_SEEN_KEY, JSON.stringify(map));
  } catch (e) {
      // Best effort: без штампа отсчёт стартует при следующем показе.
      DebugLogger.error('gift_expiry:persistGiftFirstSeenMap', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
};

/* expo-router route shim */
export default function __RouteShim() { return null; }
