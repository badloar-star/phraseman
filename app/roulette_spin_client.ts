/**
 * Клиент рулетки Plus: claim прокрутов + идемпотентный спин.
 *
 * Идемпотентность: каждый спин получает spinRequestId (uuid) ДО вызова. При сетевой
 * ошибке повторяем вызов ТОЛЬКО с тем же spinRequestId — сервер вернёт уже выданный
 * приз вместо второго списания (см. functions/src/referral_spin.ts). Никогда не
 * генерируем свежий id для «того же» нажатия.
 *
 * Стиль — как app/referral_cloud.ts (callable + App Check + getReferralCallableErrorCode).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { captureAccountGeneration, type AccountGenerationToken } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import { getCanonicalUserId } from './user_id_policy';
import { isReferralCloudEnabled } from './referral_flags';
import { isReferralRouletteEmergencyStopped } from './remote_flags';
import { DebugLogger } from './debug-logger';
import { mergeLevelSpinServerStars } from './level_spin_star_grants';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const REGION = 'us-central1';
const SPIN_CREDITS_CACHE_KEY = 'referral_spin_credits_v1';
const SPIN_CREDITS_MEMORY_MAX_ENTRIES = 2;
const spinCreditsMemoryByScope = new Map<string, number>();
const spinCreditMutationEpochByScope = new Map<string, number>();
/** Сетевые повторы одного спина (с тем же spinRequestId!) — не более двух. */
const SPIN_NETWORK_RETRIES = 2;

function spinCreditsStorageKey(stableId: string): string {
  return `${SPIN_CREDITS_CACHE_KEY}:${encodeURIComponent(stableId)}`;
}

function activeSpinCreditsScope(stableId?: string): string | null {
  const token = captureAccountGeneration();
  if (stableId && token.stableId !== stableId) return null;
  return accountScopeKey(token);
}

function spinCreditScope(stableId: string): string {
  return activeSpinCreditsScope(stableId) ?? `stable:${stableId}`;
}

function beginSpinCreditMutation(stableId: string): number {
  const scope = spinCreditScope(stableId);
  const next = (spinCreditMutationEpochByScope.get(scope) ?? 0) + 1;
  spinCreditMutationEpochByScope.delete(scope);
  spinCreditMutationEpochByScope.set(scope, next);
  while (spinCreditMutationEpochByScope.size > SPIN_CREDITS_MEMORY_MAX_ENTRIES) {
    const oldest = spinCreditMutationEpochByScope.keys().next().value as string | undefined;
    if (!oldest) break;
    spinCreditMutationEpochByScope.delete(oldest);
  }
  return next;
}

function currentSpinCreditMutationEpoch(stableId: string): number {
  return spinCreditMutationEpochByScope.get(spinCreditScope(stableId)) ?? 0;
}

function rememberSpinCredits(stableId: string, rawValue: number): number {
  const value = Math.max(0, Math.floor(Number(rawValue) || 0));
  const scope = activeSpinCreditsScope(stableId);
  if (!scope) return value;
  spinCreditsMemoryByScope.delete(scope);
  spinCreditsMemoryByScope.set(scope, value);
  while (spinCreditsMemoryByScope.size > SPIN_CREDITS_MEMORY_MAX_ENTRIES) {
    const oldest = spinCreditsMemoryByScope.keys().next().value as string | undefined;
    if (!oldest) break;
    spinCreditsMemoryByScope.delete(oldest);
  }
  return value;
}

async function cacheSpinCredits(stableId: string, rawValue: number): Promise<number> {
  const value = rememberSpinCredits(stableId, rawValue);
  await AsyncStorage.setItem(spinCreditsStorageKey(stableId), String(value)).catch(noteSwallowedHandler('roulette_spin_client:promise_1'));
  return value;
}

/** An old claim response must never erase a newer spin cache. */
async function cacheClaimedSpinCredits(stableId: string, rawValue: number, requestEpoch: number): Promise<number> {
  if (currentSpinCreditMutationEpoch(stableId) !== requestEpoch) {
    return readCachedSpinCreditsForStableId(stableId);
  }
  // Без конкурирующей мутации ответ сервера авторитетен: он также снимает истёкшие ключи.
  return cacheSpinCredits(stableId, rawValue);
}

async function readCachedSpinCreditsForStableId(stableId: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(spinCreditsStorageKey(stableId));
    const persisted = Math.max(0, Math.floor(Number(raw) || 0));
    const inMemory = spinCreditsMemoryByScope.get(spinCreditScope(stableId)) ?? 0;
    return rememberSpinCredits(stableId, Math.max(persisted, inMemory));
  } catch {
    return spinCreditsMemoryByScope.get(spinCreditScope(stableId)) ?? 0;
  }
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), REGION), name);
}

// ── Типы ответов (зеркало functions/src/referral_spin.ts / referral_claim_spin.ts) ──

export type ClaimSpinResult = {
  ok?: boolean;
  claimed: number;
  spinsTotal: number;
  cappedThisMonth: boolean;
  cappedToday: boolean;
};

export type SpinResult = {
  ok?: boolean;
  prizeIndex: number;
  prizeDays: number;
  /**
   * зачем: D100 (владелец, 2026-09-30) — Pro (lifetime) выигрывает МОНЕТЫ вместо
   * дней (раньше жемчуг, удалён D70). Монеты начисляет сервер в журнал кошелька.
   */
  prizeKind?: 'days' | 'coins';
  prizeCoins?: number;
  spinsLeft: number;
  vipUntil: number;
  idempotent?: boolean;
  /** Снапшот монетного кошелька после начисления (только для prizeKind='coins'). */
  stars?: number;
  starsEarnedTotal?: number;
  starsSeq?: number;
};

export type SpinOutcome =
  | {
    ok: true;
    prizeIndex: number;
    prizeDays: number;
    prizeKind: 'days' | 'coins';
    prizeCoins: number;
    spinsLeft: number;
    vipUntil: number;
    /** Идентификатор спина (идемпотентность повтора на сервере). */
    spinRequestId: string;
  }
  | { ok: false; reason: 'disabled' | 'no_user' | 'no_spins' | 'link_required' | 'error'; code?: string };

function callableErrorCode(e: unknown): string | null {
  if (e && typeof e === 'object' && 'code' in e) {
    return String((e as { code: string }).code ?? '');
  }
  return null;
}

/** uuid для spinRequestId; expo-crypto randomUUID доступен в Expo 54, fallback — manual v4. */
async function newSpinRequestId(): Promise<string> {
  try {
    const uuid = await Crypto.randomUUID();
    if (uuid) return uuid;
  } catch (e) {
      // fallback ниже
      DebugLogger.error('roulette_spin_client:uuid', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  const bytes = new Uint8Array(16);
  Crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const SPIN_LOG = '[REFERRAL-SPIN]';

function spinTrace(event: string, data: Record<string, unknown>): void {
  DebugLogger.info(SPIN_LOG, `${event} ${JSON.stringify(data)}`);
}

/**
 * D100: вливает серверный снапшот монетного кошелька (stars/starsSeq из ответа
 * referralSpin) в локальный кошелёк телефона. Канал — тот же, что у видео-рун и
 * наград «Вместе»: применяется только более новый starsSeq, поэтому повтор
 * ответа не удвоит монеты. Не бросает: сбой лишь откладывает показ до следующего
 * снапшота (PhoneState pull), монеты на сервере уже начислены.
 */
async function mergeReferralSpinCoins(token: AccountGenerationToken, data: SpinResult): Promise<void> {
  const stars = Number(data.stars);
  const earned = Number(data.starsEarnedTotal);
  const seq = Number(data.starsSeq);
  if (!Number.isSafeInteger(seq) || seq < 0) {
    spinTrace('coins_merge_skipped', { reason: 'no_stars_seq', starsSeq: data.starsSeq ?? null });
    return;
  }
  try {
    const visible = await mergeLevelSpinServerStars(token, {
      ...(Number.isFinite(stars) ? { stars: Math.max(0, Math.trunc(stars)) } : {}),
      ...(Number.isFinite(earned) ? { starsEarnedTotal: Math.max(0, Math.trunc(earned)) } : {}),
      starsSeq: seq,
      // зачем (Q-COIN a): при неподтверждённой локальной базе приз не должен
      // раствориться в «большем из двух» — кошелёк прибавит его к локальной базе.
      serverCreditedDelta: Number(data.prizeCoins ?? 0),
    });
    spinTrace('coins_merged', { prizeCoins: data.prizeCoins ?? 0, serverSeq: seq, visibleBalance: visible.balance });
  } catch (e) {
    spinTrace('coins_merge_failed', { reason: e instanceof Error ? e.message : String(e), serverSeq: seq });
  }
}

// ── Claim: qualified-приглашения → прокруты ──────────────────────────────────

/**
 * R38 (Ревизор 15.10): кэш состояния приглашений (referral_vip, TTL 15 мин) после получения прокрутов и выигрыша жил
 * старым — экран показывал «можно получить» и прежние кредиты. Сбрасываем точечно, только для этого владельца.
 */
function invalidateReferralStateAfter(stableId: string, reason: string): void {
  void import('./referral_vip')
    .then(({ invalidateClaimableReferralStateCache }) => {
      invalidateClaimableReferralStateCache(stableId);
      spinTrace('referral_state_invalidated', { reason });
    })
    .catch(noteSwallowedHandler('roulette_spin_client:invalidateReferralStateAfter'));
}

/** Конвертирует все qualified-приглашения в прокруты (капы 30/мес, 3/день — на сервере). */
export async function claimReferralSpins(): Promise<ClaimSpinResult | null> {
  if (isReferralRouletteEmergencyStopped()) return null;
  if (!isReferralCloudEnabled()) return null;
  const stableId = await getCanonicalUserId();
  if (!stableId) return null;
  const requestEpoch = currentSpinCreditMutationEpoch(stableId);
  const fn = callable<{ referrerStableId: string }, ClaimSpinResult>('referralClaimSpin');
  const res = await fn({ referrerStableId: stableId });
  if (typeof res.data?.spinsTotal === 'number') {
    await cacheClaimedSpinCredits(stableId, res.data.spinsTotal, requestEpoch);
    invalidateReferralStateAfter(stableId, 'claim');
  }
  return res.data;
}

/** Локальный кэш счётчика прокрутов (мгновенный первый кадр; сеть обновит). */
export async function readCachedSpinCredits(): Promise<number> {
  const stableId = await getCanonicalUserId();
  if (!stableId) return 0;
  return readCachedSpinCreditsForStableId(stableId);
}

export function peekCachedSpinCredits(): number {
  const scope = activeSpinCreditsScope();
  return scope ? spinCreditsMemoryByScope.get(scope) ?? 0 : 0;
}

// ── Спин ─────────────────────────────────────────────────────────────────────

async function callReferralSpinOnce(stableId: string, spinRequestId: string): Promise<SpinResult> {
  const fn = callable<{ stableId: string; spinRequestId: string }, SpinResult>('referralSpin');
  const res = await fn({ stableId, spinRequestId });
  return res.data;
}

/**
 * Один спин. Сетевые ошибки повторяются с ТЕМ ЖЕ spinRequestId (идемпотентность);
 * бизнес-ошибки (no_spins / link_required) не ретраятся.
 */
export async function spinReferralRoulette(): Promise<SpinOutcome> {
  if (isReferralRouletteEmergencyStopped()) return { ok: false, reason: 'disabled' };
  if (!isReferralCloudEnabled()) return { ok: false, reason: 'disabled' };
  const stableId = await getCanonicalUserId();
  if (!stableId) return { ok: false, reason: 'no_user' };
  beginSpinCreditMutation(stableId);
  const spinAccount = captureAccountGeneration();

  const spinRequestId = await newSpinRequestId();
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= SPIN_NETWORK_RETRIES; attempt += 1) {
    try {
      const data = await callReferralSpinOnce(stableId, spinRequestId);
      const outcome = {
        ok: true as const,
        prizeIndex: Math.max(0, Math.floor(data.prizeIndex ?? 0)),
        prizeDays: Math.max(0, Math.floor(data.prizeDays ?? 0)),
        prizeKind: data.prizeKind === 'coins' ? 'coins' as const : 'days' as const,
        prizeCoins: Math.max(0, Math.floor(data.prizeCoins ?? 0)),
        spinsLeft: Math.max(0, Math.floor(data.spinsLeft ?? 0)),
        vipUntil: Math.max(0, Math.floor(data.vipUntil ?? 0)),
        spinRequestId,
      };
      spinTrace('spin_ok', {
        attempt,
        prizeIndex: outcome.prizeIndex,
        prizeKind: outcome.prizeKind,
        prizeCoins: outcome.prizeCoins,
        spinsLeft: outcome.spinsLeft,
        idempotent: data.idempotent === true,
        starsSeq: data.starsSeq ?? null,
      });
      await cacheSpinCredits(stableId, outcome.spinsLeft);
      invalidateReferralStateAfter(stableId, 'spin_win');
      if (outcome.prizeKind === 'coins') {
        // Монеты уже в серверном журнале; вливаем снапшот в кошелёк телефона фоном —
        // экран не ждёт, счётчик монет обновится сам (publishProjection).
        void mergeReferralSpinCoins(spinAccount, data);
      }
      return outcome;
    } catch (e) {
      const code = callableErrorCode(e);
      if (code === 'failed-precondition') {
        // Флаг мог выключиться уже после открытия экрана: это отдельное состояние,
        // не «закончились прокруты». Остальные бизнес-ошибки различаем по message.
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : '';
        spinTrace('spin_failed_precondition', { attempt, message: msg });
        if (msg.includes('REFERRAL_ROULETTE_EMERGENCY_STOP')) return { ok: false, reason: 'disabled', code };
        return { ok: false, reason: msg.includes('LINK_ACCOUNT_REQUIRED') ? 'link_required' : 'no_spins', code };
      }
      if (code === 'unauthenticated' || code === 'permission-denied' || code === 'invalid-argument') {
        spinTrace('spin_rejected', { attempt, code });
        return { ok: false, reason: 'error', code: code ?? 'unknown' };
      }
      // Сетевая/неизвестная — повтор с ТЕМ ЖЕ spinRequestId.
      spinTrace('spin_retryable_error', { attempt, code });
      lastError = e;
    }
  }

  return { ok: false, reason: 'error', code: callableErrorCode(lastError) ?? 'network' };
}

// зачем: D78/D81 (владелец, 2026-09-30) — DEV-выдача ключа («+1 прокрут») удалена
// навсегда и НЕ возвращается вместе с рулеткой (D99).

/* expo-router route shim */
export default function __RouteShim() { return null; }
