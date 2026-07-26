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
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { captureAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import { getCanonicalUserId } from './user_id_policy';
import { isReferralCloudEnabled } from './referral_flags';
import { isReferralRouletteEmergencyStopped } from './remote_flags';

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
  await AsyncStorage.setItem(spinCreditsStorageKey(stableId), String(value)).catch(() => {});
  return value;
}

/** An old claim response must never erase a newer DEV grant/spin cache. */
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
  /** зачем: владелец (2026-07-26) — Pro (lifetime) выигрывает жемчужины вместо дней. */
  prizeKind?: 'days' | 'pearls';
  prizePearls?: number;
  spinsLeft: number;
  vipUntil: number;
  idempotent?: boolean;
};

export type SpinOutcome =
  | {
    ok: true;
    prizeIndex: number;
    prizeDays: number;
    prizeKind: 'days' | 'pearls';
    prizePearls: number;
    spinsLeft: number;
    vipUntil: number;
    /** Идентификатор спина — им же идемпотентно начисляются жемчужины Pro. */
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
  } catch { /* fallback ниже */ }
  const bytes = new Uint8Array(16);
  Crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ── Claim: qualified-приглашения → прокруты ──────────────────────────────────

/** Конвертирует все qualified-приглашения в прокруты (капы 30/мес, 3/день — на сервере). */
export async function claimReferralSpins(): Promise<ClaimSpinResult | null> {
  if (isReferralRouletteEmergencyStopped()) return null;
  if (!isReferralCloudEnabled()) return null;
  const stableId = await getCanonicalUserId();
  if (!stableId) return null;
  const requestEpoch = currentSpinCreditMutationEpoch(stableId);
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<{ referrerStableId: string }, ClaimSpinResult>('referralClaimSpin');
  const res = await fn({ referrerStableId: stableId });
  if (typeof res.data?.spinsTotal === 'number') {
    await cacheClaimedSpinCredits(stableId, res.data.spinsTotal, requestEpoch);
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
  await initFirebaseAppCheckIfAvailable().catch(() => {});
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

  const spinRequestId = await newSpinRequestId();
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= SPIN_NETWORK_RETRIES; attempt += 1) {
    try {
      const data = await callReferralSpinOnce(stableId, spinRequestId);
      const outcome = {
        ok: true as const,
        prizeIndex: Math.max(0, Math.floor(data.prizeIndex ?? 0)),
        prizeDays: Math.max(0, Math.floor(data.prizeDays ?? 0)),
        prizeKind: data.prizeKind === 'pearls' ? 'pearls' as const : 'days' as const,
        prizePearls: Math.max(0, Math.floor(data.prizePearls ?? 0)),
        spinsLeft: Math.max(0, Math.floor(data.spinsLeft ?? 0)),
        vipUntil: Math.max(0, Math.floor(data.vipUntil ?? 0)),
        spinRequestId,
      };
      await cacheSpinCredits(stableId, outcome.spinsLeft);
      return outcome;
    } catch (e) {
      const code = callableErrorCode(e);
      if (code === 'failed-precondition') {
        // Флаг мог выключиться уже после открытия экрана: это отдельное состояние,
        // не «закончились прокруты». Остальные бизнес-ошибки различаем по message.
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : '';
        if (msg.includes('REFERRAL_ROULETTE_EMERGENCY_STOP')) return { ok: false, reason: 'disabled', code };
        return { ok: false, reason: msg.includes('LINK_ACCOUNT_REQUIRED') ? 'link_required' : 'no_spins', code };
      }
      if (code === 'unauthenticated' || code === 'permission-denied' || code === 'invalid-argument') {
        return { ok: false, reason: 'error', code: code ?? 'unknown' };
      }
      // Сетевая/неизвестная — повтор с ТЕМ ЖЕ spinRequestId.
      lastError = e;
    }
  }

  return { ok: false, reason: 'error', code: callableErrorCode(lastError) ?? 'network' };
}

// ── DEV: +1 прокрут (кнопка видна только в dev-сборке; гейт — на сервере) ──

export type DevGrantOutcome =
  | { ok: true; spinsTotal: number }
  | { ok: false; reason: 'disabled' | 'no_user' | 'error'; code?: string };

/**
 * DEV-выдача +1 спин-кредита (functions/src/referral_dev_grant.ts).
 * Серверный гейт remote_config/app.numbers.referral_dev_grant_enabled.
 */
export async function devGrantReferralSpin(): Promise<DevGrantOutcome> {
  if (!isReferralCloudEnabled()) return { ok: false, reason: 'error', code: 'cloud_disabled' };
  const stableId = await getCanonicalUserId();
  if (!stableId) return { ok: false, reason: 'no_user' };
  beginSpinCreditMutation(stableId);
  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = callable<{ stableId: string }, { ok?: boolean; spinsTotal: number }>('referralDevGrantSpin');
    const res = await fn({ stableId });
    const spinsTotal = Math.max(0, Math.floor(Number(res.data?.spinsTotal ?? 0)));
    await cacheSpinCredits(stableId, spinsTotal);
    return { ok: true, spinsTotal };
  } catch (e) {
    const code = callableErrorCode(e);
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : '';
    if (code === 'failed-precondition') {
      if (msg.includes('DEV_GRANT_DISABLED')) return { ok: false, reason: 'disabled', code };
    }
    return { ok: false, reason: 'error', code: code ?? 'unknown' };
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
