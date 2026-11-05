// energy_gift_client.ts — клиент «Подарка энергии» (отправить другу +1, забрать присланное в копилку). ВСЁ за флагом energy_gift_enabled (по умолчанию ВЫКЛ).
// зачем (владелец 05.11: «Подарок энергии — разрешить с лимитом»; docs/work/tasks/energy-gift-design-2026-11-05.md): сервер (functions/src/energy_gift.ts, Ядро) проверяет правила
// (друзья ≥ 24 ч, 1 в сутки отправителю, ≤ 3 в сутки получателю, не себе, не Plus-получателю) и ведёт квоты; телефон — Optimistic UI: «Забрать» зачисляет единицу в копилку СРАЗУ
// (app/energy_gift_pool.applyGiftLocal), вызов claim догоняет фоном, отказ сервера откатывает ТОЛЬКО неподтверждённое зачисление. Идемпотентность — по giftId (повтор не зачисляет дважды).
// Здесь только слой вызовов; экраны (кнопка «Подарить +1», входящая карточка «Забрать», значок «+N») подключаются отдельно.
import { captureAccountGeneration } from './account_generation';
import { getRemoteBool } from './remote_flags';
import { applyGiftLocal, confirmGift, pendingGiftIds, rollbackGift } from './energy_gift_pool';

const LOG = '[ENERGY-GIFT]';
const FUNCTIONS_REGION = 'us-central1';

export type EnergyGiftSendOutcome =
  | Readonly<{ ok: true; giftId: string; remainingToday: number }>
  | Readonly<{ ok: false; reason: string }>;
export type EnergyGiftClaimOutcome =
  | Readonly<{ ok: true; applied: boolean; status: 'applied' | 'duplicate' | 'full' | 'already' }>
  | Readonly<{ ok: false; reason: string }>;

export function isEnergyGiftEnabled(): boolean {
  return getRemoteBool('energy_gift_enabled');
}

function activeOwner(): string | null {
  const token = captureAccountGeneration();
  return token.phase === 'active' ? token.stableId?.trim() || null : null;
}

async function callable<TReq extends object, TRes>(name: string): Promise<(data: TReq) => Promise<{ data: TRes }>> {
  const { getApp } = await import('@react-native-firebase/app');
  const { getFunctions, httpsCallable } = await import('@react-native-firebase/functions');
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name) as unknown as (data: TReq) => Promise<{ data: TRes }>;
}

/** Причина отказа из ответа сервера: HttpsError.message = код правила (not_friends_24h / quota_sender / quota_receiver / plus_receiver / self / disabled), иначе network/unknown. */
export function energyGiftFailureReason(error: unknown): string {
  const e = error as { message?: unknown; code?: unknown } | null;
  const msg = typeof e?.message === 'string' ? e.message : '';
  const known = /(not_friends_24h|quota_sender|quota_receiver|plus_receiver|self|disabled|gift_not_found|invalid_to_uid|invalid_gift_id)/.exec(msg);
  if (known) return known[1]!;
  const code = typeof e?.code === 'string' ? e.code : '';
  if (/unavailable|deadline|network/.test(code)) return 'network';
  return 'unknown';
}

/** Отправить другу +1 энергии. Без аккаунта/флага — отказ с причиной (не молчим). Экран показывает «Отправлено» сразу и откатывает при { ok:false }. */
export async function sendEnergyGift(toUid: string): Promise<EnergyGiftSendOutcome> {
  const owner = activeOwner();
  console.log(LOG, 'send:enter', JSON.stringify({ toUid: toUid.slice(0, 6), hasOwner: owner !== null, enabled: isEnergyGiftEnabled() })); // guard-ok: вход
  if (!isEnergyGiftEnabled()) { console.log(LOG, 'send:skip disabled'); return { ok: false, reason: 'disabled' }; } // guard-ok: ранний выход называет причину
  if (!owner) { console.warn(LOG, 'send:skip no_active_account'); return { ok: false, reason: 'unknown' }; } // guard-ok: ранний выход
  const startedAt = Date.now();
  try {
    const fn = await callable<{ toUid: string; stableId: string }, { ok?: boolean; giftId?: string; remainingToday?: number }>('energyGiftSend');
    const res = (await fn({ toUid, stableId: owner })).data;
    if (res?.ok !== true || typeof res.giftId !== 'string') { console.warn(LOG, 'send:bad_response', JSON.stringify(res ?? null).slice(0, 160)); return { ok: false, reason: 'unknown' }; } // guard-ok: ответ не по форме
    console.log(LOG, 'send:done', JSON.stringify({ giftId: res.giftId.slice(0, 8), remainingToday: res.remainingToday ?? null, ms: Date.now() - startedAt })); // guard-ok: итог
    return { ok: true, giftId: res.giftId, remainingToday: Math.max(0, Number(res.remainingToday ?? 0)) };
  } catch (error: unknown) {
    const reason = energyGiftFailureReason(error);
    console.warn(LOG, 'send:failed', JSON.stringify({ reason, ms: Date.now() - startedAt, message: String((error as Error)?.message ?? error).slice(0, 120) })); // guard-ok: catch пишет причину
    return { ok: false, reason };
  }
}

/**
 * Забрать присланный подарок: единица зачисляется в копилку СРАЗУ (до ответа сервера), затем claim догоняет фоном.
 * Отказ сервера → откат ТОЛЬКО этого неподтверждённого зачисления (поздний отказ не трогает уже подтверждённое). Повтор того же giftId — 'duplicate' без второго зачисления.
 */
export async function claimEnergyGift(giftId: string): Promise<EnergyGiftClaimOutcome> {
  const owner = activeOwner();
  console.log(LOG, 'claim:enter', JSON.stringify({ giftId: giftId.slice(0, 8), hasOwner: owner !== null, enabled: isEnergyGiftEnabled() })); // guard-ok: вход
  if (!isEnergyGiftEnabled()) return { ok: false, reason: 'disabled' }; // guard-ok: ранний выход называет причину
  if (!owner) { console.warn(LOG, 'claim:skip no_active_account'); return { ok: false, reason: 'unknown' }; } // guard-ok: ранний выход
  const local = applyGiftLocal(owner, giftId);
  if (local === 'full') { console.log(LOG, 'claim:skip pool_full → подарок ждёт на сервере', giftId.slice(0, 8)); return { ok: true, applied: false, status: 'full' }; } // guard-ok: копилка полна
  if (local === 'duplicate') { console.log(LOG, 'claim:skip duplicate', giftId.slice(0, 8)); return { ok: true, applied: false, status: 'duplicate' }; } // guard-ok: повтор
  const startedAt = Date.now();
  try {
    const fn = await callable<{ giftId: string; stableId: string }, { ok?: boolean; bank?: number; applied?: boolean }>('energyGiftClaim');
    const res = (await fn({ giftId, stableId: owner })).data;
    if (res?.ok !== true) throw new Error('claim_bad_response');
    if (res.applied === true) {
      confirmGift(owner, giftId);
      console.log(LOG, 'claim:done', JSON.stringify({ giftId: giftId.slice(0, 8), applied: true, ms: Date.now() - startedAt })); // guard-ok: итог
      return { ok: true, applied: true, status: 'applied' };
    }
    // сервер: уже забран / недействителен (void) — локальное зачисление было ошибочным, откатываем
    rollbackGift(owner, giftId);
    console.log(LOG, 'claim:done not_applied → откат локального зачисления', JSON.stringify({ giftId: giftId.slice(0, 8), ms: Date.now() - startedAt })); // guard-ok: итог
    return { ok: true, applied: false, status: 'already' };
  } catch (error: unknown) {
    const reason = energyGiftFailureReason(error);
    // сеть — подарок остаётся «в ожидании подтверждения» (pending): повторим claim при запуске (claim идемпотентен); правило сервера — откат
    if (reason === 'network') {
      console.warn(LOG, 'claim:network → оставляем pending, повтор позже', JSON.stringify({ giftId: giftId.slice(0, 8), pending: pendingGiftIds(owner).length })); // guard-ok: catch пишет причину
      return { ok: false, reason };
    }
    rollbackGift(owner, giftId);
    console.warn(LOG, 'claim:failed → откат', JSON.stringify({ giftId: giftId.slice(0, 8), reason, ms: Date.now() - startedAt })); // guard-ok: catch пишет причину
    return { ok: false, reason };
  }
}

/** Повторить claim для подарков, зачисленных локально, но не подтверждённых сервером (после падения/сети). Вызывать при запуске/входе, не чаще раза в сессию. */
export async function retryPendingEnergyGiftClaims(): Promise<number> {
  const owner = activeOwner();
  if (!owner || !isEnergyGiftEnabled()) return 0;
  const ids = [...pendingGiftIds(owner)];
  let done = 0;
  for (const id of ids) {
    try {
      const fn = await callable<{ giftId: string; stableId: string }, { ok?: boolean; applied?: boolean }>('energyGiftClaim');
      const res = (await fn({ giftId: id, stableId: owner })).data;
      if (res?.ok === true) { if (res.applied === true) confirmGift(owner, id); else rollbackGift(owner, id); done += 1; }
    } catch (error: unknown) {
      console.warn(LOG, 'retry:failed', JSON.stringify({ giftId: id.slice(0, 8), reason: energyGiftFailureReason(error) })); // guard-ok: catch пишет причину
    }
  }
  console.log(LOG, 'retry:done', JSON.stringify({ tried: ids.length, done })); // guard-ok: итог
  return done;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
