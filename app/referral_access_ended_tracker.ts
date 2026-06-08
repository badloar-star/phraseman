/**
 * Отслеживание окончания реферального окна доступа — показать модал окончания
 * ровно один раз на каждое завершившееся окно (как intro_full_access_*_ended_seen).
 *
 * Почему трекер сам определяет «реферальность» окна:
 *   cloud_sync при истечении VIP зануляет vip_plan='' и vip_until='0'. Если бы вызывающий
 *   гейтил по текущему vip_plan==='referral', модал НИКОГДА бы не сработал (плана уже нет
 *   в момент окончания). Поэтому факт «последнее окно было реферальным» мы запоминаем
 *   стикки-маркером, пока окно активно, и опираемся на него после зануления.
 *
 * Авторитет окна — облако (vip_until из progress); локально только маркеры состояния.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_UNTIL_KEY = 'referral_access_last_until_ms_v1';
const ENDED_SEEN_FOR_KEY = 'referral_access_ended_seen_for_v1';

function parseMs(value: string | null): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Конец реферального окна, известный трекеру (стикки: переживает зануление vip_plan).
 * Используется вызывающим, чтобы пометить ровно то окно, для которого показали модал.
 */
export async function getTrackedReferralWindowEnd(): Promise<number> {
  return parseMs(await AsyncStorage.getItem(LAST_UNTIL_KEY));
}

/**
 * Решает, пора ли показать модал окончания. Принимает текущее состояние VIP из стораджа:
 *   @param vipPlan   текущий vip_plan ('' если VIP истёк/занулён)
 *   @param vipUntilMs текущий vip_until (0 если занулён)
 *
 * Логика:
 *   - окно активно И реферальное → запоминаем его конец (стикки), ничего не показываем;
 *   - окно закрылось → если знаем реферальный конец и ещё не показывали для него → true.
 * Нереферальные окна (admin/telegram VIP) игнорируем: их конец не пишем в LAST_UNTIL_KEY.
 */
export async function shouldShowReferralAccessEnded(
  vipPlan: string,
  vipUntilMs: number,
  nowMs: number = Date.now(),
): Promise<boolean> {
  const plan = String(vipPlan ?? '').trim().toLowerCase();
  const until = Math.max(0, Math.floor(vipUntilMs));

  // Активное реферальное окно: запоминаем конец (стикки) и ждём его завершения.
  if (plan === 'referral' && until > nowMs) {
    await AsyncStorage.setItem(LAST_UNTIL_KEY, String(until));
    return false;
  }

  // Активное окно ДРУГОГО плана (admin/telegram) — не наш модал.
  if (until > nowMs && plan !== 'referral') return false;

  // Окно закрылось/занулилось. Опираемся на стикки-конец последнего реферального окна.
  const trackedEnd = parseMs(await AsyncStorage.getItem(LAST_UNTIL_KEY));
  if (trackedEnd <= 0 || trackedEnd > nowMs) return false;

  const seenFor = parseMs(await AsyncStorage.getItem(ENDED_SEEN_FOR_KEY));
  if (seenFor === trackedEnd) return false; // уже показывали для этого окна

  return true;
}

/**
 * Пометить модал окончания показанным для конкретного окна. Вызывать при закрытии модала,
 * передавая результат getTrackedReferralWindowEnd() (точный конец показанного окна).
 */
export async function markReferralAccessEndedSeen(windowEndMs: number): Promise<void> {
  const windowEnd = Math.max(0, Math.floor(windowEndMs));
  if (windowEnd > 0) {
    await AsyncStorage.setItem(ENDED_SEEN_FOR_KEY, String(windowEnd));
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
