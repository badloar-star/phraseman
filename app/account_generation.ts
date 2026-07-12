export type AccountGenerationToken = Readonly<{
  generation: number;
  stableId: string | null;
  phase: 'uninitialized' | 'active' | 'transitioning';
}>;

let currentGeneration = 0;
let currentStableId: string | null = null;
let currentPhase: AccountGenerationToken['phase'] = 'uninitialized';
let restoreLockTail: Promise<void> = Promise.resolve();
let accountTransitionLockTail: Promise<void> = Promise.resolve();
const generationListeners = new Set<(token: AccountGenerationToken) => void>();

const normalizedStableId = (value: string | null): string | null => value?.trim() || null;

const notifyAccountGeneration = (): void => {
  const token = captureAccountGeneration();
  generationListeners.forEach((listener) => {
    try { listener(token); } catch { /* account transitions must not be interrupted by UI listeners */ }
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

export function captureAccountGeneration(): AccountGenerationToken {
  return { generation: currentGeneration, stableId: currentStableId, phase: currentPhase };
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
export async function withAccountTransitionLock<T>(work: () => Promise<T>): Promise<T> {
  const previous = accountTransitionLockTail;
  let release!: () => void;
  accountTransitionLockTail = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await work();
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
  generationListeners.clear();
}
