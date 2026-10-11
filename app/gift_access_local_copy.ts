/**
 * Проверенная локальная копия срока подарка лояльности (72 часа).
 *
 * зачем (владелец 11.10, журнал строка 16: «СДЕЛАТЬ ДО РЕЛИЗА»; план §CORE-0165): подарок жил только в облаке
 * (`users/{uid}.progress.loyalty_gift_until_ms`), и на холодном старте его получатель ждал первое чтение Firestore
 * (до 4,2 с) — а потолок этого ожидания без локальной копии превратил бы «нет ответа» в «нет доступа»: квоты
 * бесплатного списались бы у человека с подарком. Здесь — срок, который ОБЛАКО уже подтвердило, вместе с id аккаунта.
 *
 * Правила:
 *  - пишем только то, что подтвердило облако (успешное чтение или засев из восстановления);
 *  - читаем только для своего аккаунта и только срок в будущем, не дальше 30 дней (защита от мусора);
 *  - стираем, когда облако УСПЕШНО ответило «подарка нет»; ошибка сети копию не трогает.
 * Ключ входит в список данных аккаунта (`cloud_sync.ts`) — стирается при выходе и смене аккаунта.
 * Логи — префикс [GIFT-LOCAL].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCanonicalUserId } from './user_id_policy';

export const LOYALTY_GIFT_VERIFIED_COPY_KEY = 'loyalty_gift_verified_copy_v1';
/** Подарок длится 72 часа; всё, что дальше 30 дней, — мусор, а не подарок. */
const MAX_AHEAD_MS = 30 * 24 * 60 * 60 * 1000;

type StoredCopy = Readonly<{ v: 1; uid: string; untilMs: number; verifiedAtMs: number }>;

export type LoyaltyGiftCopyDecision =
  | Readonly<{ active: true; untilMs: number }>
  | Readonly<{ active: false; reason: 'missing' | 'corrupt' | 'other_account' | 'expired' | 'too_far' }>;

/** Чистая проверка копии — по ней решается доступ, поэтому каждое «нет» называет причину. */
export function decideLoyaltyGiftCopy(raw: string | null, uid: string, nowMs: number): LoyaltyGiftCopyDecision {
  if (!raw) return { active: false, reason: 'missing' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    // причина не глохнет: уходит наверх как reason 'corrupt', читатель пишет её в [GIFT-LOCAL]
    void error;
    return { active: false, reason: 'corrupt' };
  }
  const copy = parsed as Partial<StoredCopy> | null;
  if (!copy || copy.v !== 1 || typeof copy.uid !== 'string' || !Number.isSafeInteger(copy.untilMs)
    || !Number.isSafeInteger(copy.verifiedAtMs)) {
    return { active: false, reason: 'corrupt' };
  }
  if (copy.uid !== uid) return { active: false, reason: 'other_account' };
  const untilMs = copy.untilMs as number;
  if (untilMs <= nowMs) return { active: false, reason: 'expired' };
  if (untilMs - nowMs > MAX_AHEAD_MS) return { active: false, reason: 'too_far' };
  return { active: true, untilMs };
}

/** Срок подарка из копии своего аккаунта или null. */
export async function readVerifiedLoyaltyGiftUntilMs(
  nowMs: number = Date.now(),
  accountUid: string | null = null,
): Promise<number | null> {
  // зачем (ревью Opus): проверка доступа передаёт id своего поколения аккаунта — копия сверяется с ним же.
  const uid = accountUid ?? await getCanonicalUserId().catch((error: unknown) => {
    console.warn('[GIFT-LOCAL] read: нет id аккаунта', String((error as Error)?.message ?? error));
    return null;
  });
  if (!uid) return null;
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(LOYALTY_GIFT_VERIFIED_COPY_KEY);
  } catch (error) {
    console.warn('[GIFT-LOCAL] read: хранилище не прочиталось', String((error as Error)?.message ?? error));
    return null;
  }
  const decision = decideLoyaltyGiftCopy(raw, uid, nowMs);
  if (decision.active) {
    console.log('[GIFT-LOCAL] read: копия активна', JSON.stringify({ leftMin: Math.round((decision.untilMs - nowMs) / 60000) }));
    return decision.untilMs;
  }
  if (decision.reason !== 'missing') console.log('[GIFT-LOCAL] read: копия не годится', JSON.stringify({ reason: decision.reason }));
  return null;
}

/** Записать срок, который подтвердило облако. Истёкший или слишком далёкий срок не пишется. */
export async function rememberVerifiedLoyaltyGift(uid: string, untilMs: number, nowMs: number = Date.now()): Promise<void> {
  if (!uid || !Number.isSafeInteger(untilMs) || untilMs <= nowMs || untilMs - nowMs > MAX_AHEAD_MS) {
    console.log('[GIFT-LOCAL] remember: пропуск', JSON.stringify({ hasUid: !!uid, untilMs, nowMs }));
    return;
  }
  const copy: StoredCopy = { v: 1, uid, untilMs, verifiedAtMs: nowMs };
  try {
    await AsyncStorage.setItem(LOYALTY_GIFT_VERIFIED_COPY_KEY, JSON.stringify(copy));
    console.log('[GIFT-LOCAL] remember: копия сохранена', JSON.stringify({ leftMin: Math.round((untilMs - nowMs) / 60000) }));
  } catch (error) {
    console.warn('[GIFT-LOCAL] remember: запись не удалась', String((error as Error)?.message ?? error));
  }
}

/** Стереть копию (облако подтвердило, что подарка нет). */
export async function forgetVerifiedLoyaltyGift(reason: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(LOYALTY_GIFT_VERIFIED_COPY_KEY);
    console.log('[GIFT-LOCAL] forget: копия стёрта', JSON.stringify({ reason }));
  } catch (error) {
    console.warn('[GIFT-LOCAL] forget: не удалось стереть', JSON.stringify({ reason, error: String((error as Error)?.message ?? error) }));
  }
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __RouteShim() { return null; }
