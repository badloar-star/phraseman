export type AccountGenerationToken = Readonly<{
  generation: number;
  stableId: string | null;
  phase: 'uninitialized' | 'active' | 'transitioning';
}>;

let currentGeneration = 0;
let currentStableId: string | null = null;
let currentPhase: AccountGenerationToken['phase'] = 'uninitialized';
let restoreLockTail: Promise<void> = Promise.resolve();

export function beginAccountGeneration(stableId: string | null): AccountGenerationToken {
  currentGeneration += 1;
  currentStableId = stableId?.trim() || null;
  currentPhase = 'active';
  return captureAccountGeneration();
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
  return captureAccountGeneration();
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
