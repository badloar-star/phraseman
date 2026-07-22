/**
 * Единый shared-промис/кэш инвайт-кода (замена ТРЁМ независимым ретрай-циклам:
 * friends.tsx ×2 + referrals.tsx ×1).
 *
 * Было: каждый экран сам крутил generateReferralCode() с бэкоффом — на холодном старте
 * до трёх параллельных циклов, каждый со своими ensure-auth-link + callable.
 * Стало: один inflight-промис на процесс + TTL-кэш 5 мин. Ретрай с бэкоффом живёт
 * ВНУТРИ синглтона — вызывающие просто await и получают код (или '').
 *
 * Поведение generateReferralCode не меняется: серверный код при облаке, локальный
 * при Expo Go; готовый код лежит в AsyncStorage (REFERRAL_KEY) и читается мгновенно.
 */
import { generateReferralCode, getReferralCode } from './referral_system';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';

const CODE_TTL_MS = 5 * 60 * 1000;
// Both the TTL cache and deduplicated request are generation-scoped. Different
// accounts never share an in-flight promise, even while the old one is settling.
/** Внутренний ретрай холодной гонки auth_links (как в старых циклах: ~5 попыток с бэкоффом). */
const MAX_ATTEMPTS = 5;

let cachedCode: { accountKey: string; code: string; expiresAt: number } | null = null;
let inFlight: { accountKey: string; promise: Promise<string> } | null = null;
let invalidationEpoch = 0;
let activeAccountKey: string | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveCodeWithRetry(nameForFallback: string): Promise<string> {
  // 1. Мгновенный путь: код уже на устройстве.
  const existing = await getReferralCode().catch(() => null);
  if (existing && existing.trim().length >= 4) return existing.trim().toUpperCase();

  // 2. Холодная гонка: auth_links готовится пару секунд — добиваем бэкоффом.
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await generateReferralCode(nameForFallback);
      const rc = await getReferralCode();
      if (rc && rc.trim().length >= 4) return rc.trim().toUpperCase();
    } catch { /* ещё не готово — повторим */ }
    if (attempt < MAX_ATTEMPTS) await sleep(1500 * attempt);
  }
  return '';
}

/**
 * Возвращает инвайт-код (или '' при неудаче). Параллельные вызовы делят один
 * сетевой проход; успешный результат кэшируется на 5 мин.
 */
export function ensureInviteCodeShared(nameForFallback = 'User'): Promise<string> {
  const accountToken = captureAccountGeneration();
  const currentAccountKey = accountScopeKey(accountToken);
  if (!currentAccountKey) return Promise.resolve('');
  if (activeAccountKey !== currentAccountKey) invalidateInviteCodeShared(currentAccountKey);
  const now = Date.now();
  if (
    cachedCode
    && cachedCode.accountKey === currentAccountKey
    && cachedCode.expiresAt > now
  ) {
    return Promise.resolve(cachedCode.code);
  }
  if (inFlight?.accountKey === currentAccountKey) return inFlight.promise;

  const requestEpoch = invalidationEpoch;
  let promise!: Promise<string>;
  promise = resolveCodeWithRetry(nameForFallback)
    .then((code) => {
      if (
        requestEpoch !== invalidationEpoch
        || accountScopeKey(accountToken) !== currentAccountKey
        || !isCurrentAccountGeneration(accountToken)
      ) return '';
      if (code) {
        cachedCode = {
          accountKey: currentAccountKey,
          code,
          expiresAt: Date.now() + CODE_TTL_MS,
        };
      }
      return code;
    })
    .finally(() => {
      if (inFlight?.promise === promise) inFlight = null;
    });
  inFlight = { accountKey: currentAccountKey, promise };
  return promise;
}

/** Сброс кэша (смена аккаунта / logout). Inflight-промис не отменяем — он добьёт и заполнит кэш. */
/** Current invariant: late work may finish, but the epoch prevents it from repopulating any cache. */
export function invalidateInviteCodeShared(nextAccountKey?: string | null): void {
  if (nextAccountKey !== undefined && activeAccountKey === nextAccountKey) return;
  invalidationEpoch += 1;
  cachedCode = null;
  inFlight = null;
  activeAccountKey = nextAccountKey ?? null;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
