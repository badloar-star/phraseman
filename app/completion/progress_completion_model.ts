export type ProgressCompletionLevel = 'quiet' | 'milestone' | 'major';
export type ProgressCompletionOutcome = 'success' | 'defeat' | 'neutral';

export type ProgressCompletionAction = {
  id: string;
  label: string;
};

export type ConfirmedCompletionFlags = Partial<{
  perfect: boolean;
  record: boolean;
  streak: boolean;
  levelUp: boolean;
  routeComplete: boolean;
  majorUnlock: boolean;
}>;

export type ProgressCompletionInput = {
  fact: string;
  accumulated: string;
  nextStep: string;
  primaryAction: ProgressCompletionAction;
  secondaryAction?: ProgressCompletionAction;
  confirmed?: ConfirmedCompletionFlags;
  outcome?: ProgressCompletionOutcome;
};

export type ProgressCompletionModel = ProgressCompletionInput & {
  level: ProgressCompletionLevel;
};

const requireProofLine = (name: 'fact' | 'accumulated' | 'nextStep', value: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`Progress completion ${name} is required`);
  return normalized;
};

export function buildProgressCompletionModel(input: ProgressCompletionInput): ProgressCompletionModel {
  const confirmed = input.confirmed ?? {};
  const major = Boolean(confirmed.levelUp || confirmed.routeComplete || confirmed.majorUnlock);
  const milestone = Boolean(confirmed.perfect || confirmed.record || confirmed.streak);
  const level: ProgressCompletionLevel = input.outcome === 'defeat'
    ? 'quiet'
    : major
      ? 'major'
      : milestone
        ? 'milestone'
        : 'quiet';

  return {
    ...input,
    fact: requireProofLine('fact', input.fact),
    accumulated: requireProofLine('accumulated', input.accumulated),
    nextStep: requireProofLine('nextStep', input.nextStep),
    level,
  };
}
