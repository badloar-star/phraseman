/**
 * Фаза 3 бонусов карточки: «Защита цепочки» для уровня карточки III+.
 *
 * Автоматическая заморозка стрика 1 раз в 7 календарных дней: при пропуске ровно
 * одного дня карточка сама спасает цепочку — логика и ключи-даты как у ручной
 * streak_freeze (локальная дата устройства, а не UTC, чтобы вечерний/утренний
 * юзер в UTC±N не терял стрик). Модуль сознательно зависит только от AsyncStorage
 * и local_date: уровень читается строковым ключом (зеркалит PROFILE_CARD_LEVEL_KEY
 * из app/profile_card_system.ts — её сюда НЕ импортируем, анти-цикл, тот же
 * паттерн, что readProfileCardXpMultiplier в xp_manager и Фаза 2 в shards_system).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addLocalDays, getLocalDayKey } from './local_date';

/** Локальный date-key последнего срабатывания щита (YYYY-MM-DD). */
export const CARD_STREAK_SHIELD_USED_AT_KEY = 'card_streak_shield_used_at';

/** Кулдаун щита: одно срабатывание в 7 календарных дней. */
export const CARD_STREAK_SHIELD_COOLDOWN_DAYS = 7;

/** Минимальный уровень карточки для щита (III). */
export const CARD_STREAK_SHIELD_MIN_LEVEL = 3;

const readCardLevel = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem('profile_card_level');
    const n = parseInt(raw || '0');
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

/** Разница b − a в календарных днях для ключей YYYY-MM-DD (как addLocalDays). */
const dayKeyDiff = (a: string, b: string): number => {
  const ma = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a);
  const mb = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b);
  if (!ma || !mb) return 0;
  const msA = Date.UTC(Number(ma[1]), Number(ma[2]) - 1, Number(ma[3]));
  const msB = Date.UTC(Number(mb[1]), Number(mb[2]) - 1, Number(mb[3]));
  return Math.round((msB - msA) / 86_400_000);
};

export type CardStreakShieldStatus = {
  /** Уровень карточки (0..5), как записан локально. */
  level: number;
  /** Щит доступен прямо сейчас: уровень III+ и кулдаун прошёл (или ещё не сгорал). */
  eligible: boolean;
  /** Щит уже сработал сегодня (цепочка спасена — повторно не расходуется). */
  usedToday: boolean;
  /** Дней до доступности (0, если щит активен/доступен). */
  cooldownDaysLeft: number;
};

export const getCardStreakShieldStatus = async (
  today: string = getLocalDayKey(),
): Promise<CardStreakShieldStatus> => {
  const level = await readCardLevel();
  let usedAt: string | null = null;
  try {
    usedAt = await AsyncStorage.getItem(CARD_STREAK_SHIELD_USED_AT_KEY);
  } catch {
    usedAt = null;
  }
  const usedToday = usedAt === today;
  // Доступна, когда used_at + 7 дней <= today (дата следующей готовности в прошлом/сегодня).
  const nextEligibleKey = usedAt ? addLocalDays(usedAt, CARD_STREAK_SHIELD_COOLDOWN_DAYS) : null;
  const eligible = level >= CARD_STREAK_SHIELD_MIN_LEVEL
    && (nextEligibleKey === null || nextEligibleKey <= today);
  const cooldownDaysLeft = eligible || nextEligibleKey === null
    ? 0
    : Math.max(0, dayKeyDiff(today, nextEligibleKey));
  return { level, eligible, usedToday, cooldownDaysLeft };
};

/**
 * Попытаться потратить щит (вызывается из updateStreakOnActivity при пропуске
 * ровно одного дня). true — щит доступен и списан (used_at = today); false —
 * недоступен. Идемпотентно в тот же день: повторный вызов видит usedToday →
 * eligible=false → false, двойного «спасения» цепочки не происходит.
 */
export const tryConsumeCardStreakShield = async (
  today: string = getLocalDayKey(),
): Promise<boolean> => {
  try {
    const status = await getCardStreakShieldStatus(today);
    if (!status.eligible) return false;
    await AsyncStorage.setItem(CARD_STREAK_SHIELD_USED_AT_KEY, today);
    return true;
  } catch {
    return false;
  }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
