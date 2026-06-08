/**
 * Отслеживание окончания реферального окна доступа — чтобы показать модал окончания
 * ровно один раз на каждое завершившееся окно (как intro_full_access_*_ended_seen).
 *
 * Логика «один раз на окно»: запоминаем последнее известное vip_until реферала. Когда оно
 * в прошлом и мы ещё не показывали модал для этого конкретного значения — пора показать.
 * Авторитет окна — облако (vip_until из progress); локально только маркеры «видели».
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_UNTIL_KEY = 'referral_access_last_until_ms_v1';
const ENDED_SEEN_FOR_KEY = 'referral_access_ended_seen_for_v1';

function parseMs(value: string | null): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Вызывать после получения актуального vip_until реферала (plan==='referral').
 * Возвращает true ровно один раз — когда окно только что закрылось и его ещё не «видели».
 *
 * @param referralVipUntilMs конец реферального окна (0 если реферального VIP нет)
 * @param nowMs текущее время
 */
export async function shouldShowReferralAccessEnded(
  referralVipUntilMs: number,
  nowMs: number = Date.now(),
): Promise<boolean> {
  const until = Math.max(0, Math.floor(referralVipUntilMs));

  // Активное окно: просто запоминаем его конец, ничего не показываем.
  if (until > nowMs) {
    await AsyncStorage.setItem(LAST_UNTIL_KEY, String(until));
    return false;
  }

  // Окна нет вовсе и раньше не было — нечего показывать.
  const lastUntil = parseMs(await AsyncStorage.getItem(LAST_UNTIL_KEY));
  if (until <= 0 && lastUntil <= 0) return false;

  // Эффективный конец окна, для которого решаем «показать ли»: то, что знаем как последнее.
  const windowEnd = until > 0 ? until : lastUntil;
  if (windowEnd <= 0 || windowEnd > nowMs) return false;

  const seenFor = parseMs(await AsyncStorage.getItem(ENDED_SEEN_FOR_KEY));
  if (seenFor === windowEnd) return false; // уже показывали для этого окна

  return true;
}

/** Пометить модал окончания показанным для текущего окна (вызывать при закрытии модала). */
export async function markReferralAccessEndedSeen(
  referralVipUntilMs: number,
): Promise<void> {
  const lastUntil = parseMs(await AsyncStorage.getItem(LAST_UNTIL_KEY));
  const windowEnd = referralVipUntilMs > 0 ? Math.floor(referralVipUntilMs) : lastUntil;
  if (windowEnd > 0) {
    await AsyncStorage.setItem(ENDED_SEEN_FOR_KEY, String(windowEnd));
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
