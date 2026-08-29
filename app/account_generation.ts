import { materializePhoneStateLineage } from '../modules/phone-state/account_secret';
import { DebugLogger } from './debug-logger';

export type AccountGenerationToken = Readonly<{
  generation: number;
  stableId: string | null;
  phase: 'uninitialized' | 'active' | 'transitioning';
}>;

export type PhoneStateAccountContext = Readonly<{
  stableUid: string;
  lineage: number;
  runtimeToken: AccountGenerationToken;
}>;

declare const ACCOUNT_TRANSITION_LOCK_LEASE: unique symbol;
export type AccountTransitionLockLease = Readonly<{
  [ACCOUNT_TRANSITION_LOCK_LEASE]: true;
}>;

let currentGeneration = 0;
let currentStableId: string | null = null;
let currentPhase: AccountGenerationToken['phase'] = 'uninitialized';
let restoreLockTail: Promise<void> = Promise.resolve();
let accountTransitionLockTail: Promise<void> = Promise.resolve();
let activeAccountTransitionLockLeases = new WeakSet<object>();
const generationListeners = new Set<(token: AccountGenerationToken) => void>();
const capturedAccountGenerationTokens = new WeakSet<object>();

const normalizedStableId = (value: string | null): string | null => value?.trim() || null;

const notifyAccountGeneration = (): void => {
  const token = captureAccountGeneration();
  generationListeners.forEach((listener) => {
    try { listener(token); } catch (e) {
      // account transitions must not be interrupted by UI listeners
      DebugLogger.error('account_generation:token', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  });
};

export function beginAccountGeneration(stableId: string | null): AccountGenerationToken {
  currentGeneration += 1;
  currentStableId = normalizedStableId(stableId);
  currentPhase = 'active';
  const token = captureAccountGeneration();
  notifyAccountGeneration();
  return token;
}

/** Keep repeated identity reads idempotent while still activating boot/test identities. */
export function ensureAccountGeneration(stableId: string | null): AccountGenerationToken {
  const normalized = normalizedStableId(stableId);
  if (currentPhase === 'active' && currentStableId === normalized) return captureAccountGeneration();
  return beginAccountGeneration(normalized);
}

/** Adopt the boot-resolved anonymous id exactly once; transitions cannot be adopted implicitly. */
export function beginInitialAccountGeneration(stableId: string | null): AccountGenerationToken | null {
  if (currentPhase !== 'uninitialized') return null;
  return beginAccountGeneration(stableId);
}

export function invalidateAccountGeneration(): AccountGenerationToken {
  currentGeneration += 1;
  currentStableId = null;
  currentPhase = 'transitioning';
  const token = captureAccountGeneration();
  notifyAccountGeneration();
  return token;
}

export function subscribeAccountGeneration(
  listener: (token: AccountGenerationToken) => void,
): { remove: () => void } {
  generationListeners.add(listener);
  return { remove: () => generationListeners.delete(listener) };
}

/**
 * Дождаться активной генерации аккаунта.
 *
 * зачем (владелец 2026-08-26, инцидент «спин всегда 20 жемчужин»): начисление
 * приза уходило в очередь в момент, когда аккаунт был ещё `transitioning`
 * (или `uninitialized`) — сразу после входа на экран. accountScopeKey в такой
 * фазе даёт null, и вся операция МОЛЧА возвращала staleValue, не выполнив
 * начисления: приз показан, счёт не изменился, ошибки нет. Чек оставался
 * неподтверждённым, поэтому следующий спин возвращал ТОТ ЖЕ чек — тот же приз
 * и без списания кредита. Ждать активации честнее, чем терять награду.
 *
 * Возвращает активный токен либо null, если за timeoutMs активации не было.
 */
export function waitForActiveAccountGeneration(
  timeoutMs = 10_000,
): Promise<AccountGenerationToken | null> {
  if (currentPhase === 'active') return Promise.resolve(captureAccountGeneration());
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: AccountGenerationToken | null): void => {
      if (settled) return;
      settled = true;
      subscription.remove();
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), Math.max(0, timeoutMs));
    (timer as unknown as { unref?: () => void })?.unref?.();
    const subscription = subscribeAccountGeneration((token) => {
      if (token.phase === 'active') finish(token);
    });
    if (currentPhase === 'active') finish(captureAccountGeneration());
  });
}

export function captureAccountGeneration(): AccountGenerationToken {
  const token = Object.freeze({
    generation: currentGeneration,
    stableId: currentStableId,
    phase: currentPhase,
  });
  capturedAccountGenerationTokens.add(token);
  return token;
}

export function isCapturedAccountGenerationToken(
  value: unknown,
): value is AccountGenerationToken {
  return typeof value === 'object' && value !== null &&
    capturedAccountGenerationTokens.has(value);
}

export function isCurrentAccountGeneration(
  token: AccountGenerationToken,
  expectedStableId?: string | null,
): boolean {
  if (token.generation !== currentGeneration || token.stableId !== currentStableId) return false;
  if (currentPhase !== 'active') return false;
  if (expectedStableId !== undefined && (expectedStableId?.trim() || null) !== currentStableId) return false;
  return true;
}

export async function resolvePhoneStateAccountContext(
  stableUid: string,
  runtimeToken: AccountGenerationToken,
  readLineage: (stableUid: string) => Promise<number> = materializePhoneStateLineage,
): Promise<PhoneStateAccountContext> {
  const normalized = normalizedStableId(stableUid);
  if (!normalized || !isCurrentAccountGeneration(runtimeToken, normalized)) {
    throw new Error('phone_state_generation_stale');
  }
  const lineage = await readLineage(normalized);
  if (!isCurrentAccountGeneration(runtimeToken, normalized)) {
    throw new Error('phone_state_generation_stale');
  }
  if (!Number.isSafeInteger(lineage) || lineage < 1) {
    throw new Error('phone_state_lineage_invalid');
  }
  return Object.freeze({ stableUid: normalized, lineage, runtimeToken });
}

export async function withRestoreApplicationLock<T>(work: () => Promise<T>): Promise<T> {
  const previous = restoreLockTail;
  let release!: () => void;
  restoreLockTail = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await work();
  } finally {
    release();
  }
}

/** Serializes account-level storage commits with wipe/hydration boundaries. */
export async function withAccountTransitionLock<T>(
  work: (lease: AccountTransitionLockLease) => Promise<T>,
  inheritedLease?: AccountTransitionLockLease,
): Promise<T> {
  if (inheritedLease && activeAccountTransitionLockLeases.has(inheritedLease)) {
    return work(inheritedLease);
  }
  const previous = accountTransitionLockTail;
  let release!: () => void;
  accountTransitionLockTail = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  const lease = Object.freeze({}) as AccountTransitionLockLease;
  activeAccountTransitionLockLeases.add(lease);
  try {
    return await work(lease);
  } finally {
    activeAccountTransitionLockLeases.delete(lease);
    release();
  }
}

export type AccountTransitionDeadlineResult<T> =
  | { completed: true; value: T }
  | { completed: false };

/**
 * A deadline-capable lock acquisition for native calls that cannot be
 * cancelled. Timeout cancels only work that has not started. Once acquired,
 * work retains exclusivity through completion/rollback.
 */
export async function withAccountTransitionLockWithDeadline<T>(
  work: () => Promise<T>,
  timeoutMs: number,
): Promise<AccountTransitionDeadlineResult<T>> {
  const previous = accountTransitionLockTail;
  let release!: () => void;
  accountTransitionLockTail = new Promise<void>((resolve) => { release = resolve; });
  let timer: ReturnType<typeof setTimeout> | null = null;
  const acquired = await Promise.race([
    previous.then(() => true),
    new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), Math.max(0, timeoutMs));
    }),
  ]);
  if (timer) clearTimeout(timer);
  if (!acquired) {
    // Cancel this queued slot without bypassing the still-active predecessor.
    // Future callers remain blocked by this slot until the predecessor settles.
    void previous.then(release, release);
    return { completed: false };
  }
  try {
    // The deadline governs acquisition only. Once work starts, the caller owns
    // it through completion/rollback and cannot abandon a half-transition.
    return { completed: true, value: await work() };
  } finally {
    release();
  }
}

export async function waitForRestoreApplicationIdle(): Promise<void> {
  await restoreLockTail;
}

export async function waitForRestoreApplicationIdleWithDeadline(timeoutMs: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      waitForRestoreApplicationIdle().then(() => true),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), Math.max(0, timeoutMs));
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function __resetAccountGenerationForTests(): void {
  currentGeneration = 0;
  currentStableId = null;
  currentPhase = 'uninitialized';
  restoreLockTail = Promise.resolve();
  accountTransitionLockTail = Promise.resolve();
  activeAccountTransitionLockLeases = new WeakSet<object>();
  generationListeners.clear();
}
