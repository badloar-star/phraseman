export type AccountGenerationToken = Readonly<{
  generation: number;
  stableId: string | null;
  phase: 'uninitialized' | 'active' | 'transitioning';
}>;

let generation = 0;
let stableId: string | null = null;
let phase: AccountGenerationToken['phase'] = 'uninitialized';

const normalizedStableId = (value: string | null): string | null => value?.trim() || null;

export function captureAccountGeneration(): AccountGenerationToken {
  return { generation, stableId, phase };
}

export function ensureAccountGeneration(nextStableId: string | null): AccountGenerationToken {
  const normalized = normalizedStableId(nextStableId);
  if (phase === 'active' && stableId === normalized) return captureAccountGeneration();
  generation += 1;
  stableId = normalized;
  phase = 'active';
  return captureAccountGeneration();
}

export function invalidateAccountGeneration(): AccountGenerationToken {
  generation += 1;
  stableId = null;
  phase = 'transitioning';
  return captureAccountGeneration();
}

export function isCurrentAccountGeneration(
  token: AccountGenerationToken,
  expectedStableId?: string | null,
): boolean {
  if (phase !== 'active') return false;
  if (token.generation !== generation || token.stableId !== stableId || token.phase !== 'active') return false;
  return expectedStableId === undefined || normalizedStableId(expectedStableId) === stableId;
}

export function __resetAccountGenerationForTests(): void {
  generation = 0;
  stableId = null;
  phase = 'uninitialized';
}
