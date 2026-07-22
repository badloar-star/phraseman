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
import { getCanonicalUserId } from './user_id_policy';
import { isReferralCloudEnabled } from './referral_flags';
import { isReferralRouletteEnabled } from './remote_flags';

const REGION = 'us-central1';
const SPIN_CREDITS_CACHE_KEY = 'referral_spin_credits_v1';
/** Сетевые повторы одного спина (с тем же spinRequestId!) — не более двух. */
const SPIN_NETWORK_RETRIES = 2;

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
  spinsLeft: number;
  vipUntil: number;
  idempotent?: boolean;
};

export type SpinOutcome =
  | { ok: true; prizeIndex: number; prizeDays: number; spinsLeft: number; vipUntil: number }
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
  // Мастер-флаг «рулетка+рефералка» (админка → remote_config): выкл → не ходим в сеть.
  if (!isReferralRouletteEnabled()) return null;
  if (!isReferralCloudEnabled()) return null;
  const stableId = await getCanonicalUserId();
  if (!stableId) return null;
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<{ referrerStableId: string }, ClaimSpinResult>('referralClaimSpin');
  const res = await fn({ referrerStableId: stableId });
  if (typeof res.data?.spinsTotal === 'number') {
    await AsyncStorage.setItem(SPIN_CREDITS_CACHE_KEY, String(res.data.spinsTotal)).catch(() => {});
  }
  return res.data;
}

/** Локальный кэш счётчика прокрутов (мгновенный первый кадр; сеть обновит). */
export async function readCachedSpinCredits(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(SPIN_CREDITS_CACHE_KEY);
    const n = Math.floor(Number(raw));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
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
  // Мастер-флаг «рулетка+рефералка» (админка → remote_config): выкл → disabled.
  if (!isReferralRouletteEnabled()) return { ok: false, reason: 'disabled' };
  if (!isReferralCloudEnabled()) return { ok: false, reason: 'disabled' };
  const stableId = await getCanonicalUserId();
  if (!stableId) return { ok: false, reason: 'no_user' };

  const spinRequestId = await newSpinRequestId();
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= SPIN_NETWORK_RETRIES; attempt += 1) {
    try {
      const data = await callReferralSpinOnce(stableId, spinRequestId);
      const outcome = {
        ok: true as const,
        prizeIndex: Math.max(0, Math.floor(data.prizeIndex ?? 0)),
        prizeDays: Math.max(0, Math.floor(data.prizeDays ?? 0)),
        spinsLeft: Math.max(0, Math.floor(data.spinsLeft ?? 0)),
        vipUntil: Math.max(0, Math.floor(data.vipUntil ?? 0)),
      };
      await AsyncStorage.setItem(SPIN_CREDITS_CACHE_KEY, String(outcome.spinsLeft)).catch(() => {});
      return outcome;
    } catch (e) {
      const code = callableErrorCode(e);
      if (code === 'failed-precondition') {
        // Флаг мог выключиться уже после открытия экрана: это отдельное состояние,
        // не «закончились прокруты». Остальные бизнес-ошибки различаем по message.
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : '';
        if (msg.includes('REFERRAL_ROULETTE_DISABLED')) return { ok: false, reason: 'disabled', code };
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

// ── DEV: +1 прокрут (кнопка видна только в dev-сборке; гейт/лимит — на сервере) ──

export type DevGrantOutcome =
  | { ok: true; spinsTotal: number }
  | { ok: false; reason: 'disabled' | 'daily_limit' | 'no_user' | 'error'; code?: string };

/**
 * DEV-выдача +1 спин-кредита (functions/src/referral_dev_grant.ts).
 * Серверный гейт remote_config/app.numbers.referral_dev_grant_enabled и лимит 10/сутки.
 */
export async function devGrantReferralSpin(): Promise<DevGrantOutcome> {
  if (!isReferralCloudEnabled()) return { ok: false, reason: 'error', code: 'cloud_disabled' };
  const stableId = await getCanonicalUserId();
  if (!stableId) return { ok: false, reason: 'no_user' };
  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = callable<{ stableId: string }, { ok?: boolean; spinsTotal: number }>('referralDevGrantSpin');
    const res = await fn({ stableId });
    const spinsTotal = Math.max(0, Math.floor(Number(res.data?.spinsTotal ?? 0)));
    await AsyncStorage.setItem(SPIN_CREDITS_CACHE_KEY, String(spinsTotal)).catch(() => {});
    return { ok: true, spinsTotal };
  } catch (e) {
    const code = callableErrorCode(e);
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : '';
    if (code === 'failed-precondition') {
      if (msg.includes('DEV_GRANT_DAILY_LIMIT')) return { ok: false, reason: 'daily_limit', code };
      if (msg.includes('DEV_GRANT_DISABLED')) return { ok: false, reason: 'disabled', code };
    }
    return { ok: false, reason: 'error', code: code ?? 'unknown' };
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
