import type {
  PlanAttemptEvent,
  PlanRecoveryCandidate,
  PlanRecoveryCandidateTarget,
} from './personal_plan_engine_contracts';

export type PlanWeakSpotKind = 'grammar' | 'vocabulary' | 'mistake';

export type PlanWeakSpotSummaryInput = {
  attempts: PlanAttemptEvent[];
  recoveryCandidates: PlanRecoveryCandidate[];
};

export type PlanWeakSpotSummaryOptions = {
  planInstanceId?: string;
};

export type PlanWeakSpotDueSummary = {
  due: boolean;
  count: number;
};

export type PlanWeakSpotSignal = {
  id: string;
  kind: PlanWeakSpotKind;
  tag: string;
  wrongCount: number;
  mistakePracticeDueCount: number;
  planInstanceIds: string[];
  blockIds: string[];
  dayIndexes: number[];
  contentUnitIds: string[];
  latestAttemptAt?: string;
};

export type PlanWeakSpotSummary = {
  scope: {
    planInstanceId?: string;
  };
  totals: {
    attempts: number;
    correct: number;
    wrong: number;
    skipped: number;
    completed: number;
    recoveryCandidates: number;
  };
  due: {
    mistakePractice: PlanWeakSpotDueSummary;
  };
  weakSpots: PlanWeakSpotSignal[];
};

type MutablePlanWeakSpotSignal = PlanWeakSpotSignal & {
  planInstanceIdsSet: Set<string>;
  blockIdsSet: Set<string>;
  dayIndexesSet: Set<number>;
  contentUnitIdsSet: Set<string>;
};

function compactStrings(values: Iterable<string | undefined>): string[] {
  return [...new Set([...values].map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function compactNumbers(values: Iterable<number>): number[] {
  return [...new Set([...values])].sort((a, b) => a - b);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
}

function isCurrentInstance(
  planInstanceId: string,
  options: PlanWeakSpotSummaryOptions | undefined,
): boolean {
  const current = options?.planInstanceId?.trim();
  return !current || current === planInstanceId;
}

function createSignal(kind: PlanWeakSpotKind, tag: string): MutablePlanWeakSpotSignal {
  return {
    id: `${kind}:${slug(tag)}`,
    kind,
    tag,
    wrongCount: 0,
    mistakePracticeDueCount: 0,
    planInstanceIds: [],
    blockIds: [],
    dayIndexes: [],
    contentUnitIds: [],
    planInstanceIdsSet: new Set<string>(),
    blockIdsSet: new Set<string>(),
    dayIndexesSet: new Set<number>(),
    contentUnitIdsSet: new Set<string>(),
  };
}

function signalFor(
  signals: Map<string, MutablePlanWeakSpotSignal>,
  kind: PlanWeakSpotKind,
  tag: string,
): MutablePlanWeakSpotSignal {
  const id = `${kind}:${slug(tag)}`;
  const existing = signals.get(id);
  if (existing) return existing;
  const created = createSignal(kind, tag);
  signals.set(id, created);
  return created;
}

function addAttemptToSignal(signal: MutablePlanWeakSpotSignal, attempt: PlanAttemptEvent): void {
  signal.wrongCount += 1;
  signal.planInstanceIdsSet.add(attempt.planInstanceId);
  signal.blockIdsSet.add(attempt.blockId);
  signal.dayIndexesSet.add(attempt.dayIndex);
  if (attempt.contentUnitId) signal.contentUnitIdsSet.add(attempt.contentUnitId);
  if (!signal.latestAttemptAt || attempt.occurredAt > signal.latestAttemptAt) {
    signal.latestAttemptAt = attempt.occurredAt;
  }
}

function addRecoveryToSignal(signal: MutablePlanWeakSpotSignal, candidate: PlanRecoveryCandidate): void {
  signal.mistakePracticeDueCount += 1;
  signal.planInstanceIdsSet.add(candidate.planInstanceId);
  signal.blockIdsSet.add(candidate.blockId);
  signal.dayIndexesSet.add(candidate.dayIndex);
  if (candidate.contentUnitId) signal.contentUnitIdsSet.add(candidate.contentUnitId);
}

function addAttemptTags(
  signals: Map<string, MutablePlanWeakSpotSignal>,
  attempt: PlanAttemptEvent,
): void {
  for (const tag of compactStrings(attempt.grammarTags)) {
    addAttemptToSignal(signalFor(signals, 'grammar', tag), attempt);
  }
  for (const tag of compactStrings(attempt.vocabularyTags)) {
    addAttemptToSignal(signalFor(signals, 'vocabulary', tag), attempt);
  }
  for (const tag of compactStrings(attempt.mistakeTags)) {
    addAttemptToSignal(signalFor(signals, 'mistake', tag), attempt);
  }
}

function addRecoveryTags(
  signals: Map<string, MutablePlanWeakSpotSignal>,
  candidate: PlanRecoveryCandidate,
): void {
  for (const tag of compactStrings(candidate.grammarTags)) {
    addRecoveryToSignal(signalFor(signals, 'grammar', tag), candidate);
  }
  for (const tag of compactStrings(candidate.vocabularyTags)) {
    addRecoveryToSignal(signalFor(signals, 'vocabulary', tag), candidate);
  }
  for (const tag of compactStrings(candidate.mistakeTags)) {
    addRecoveryToSignal(signalFor(signals, 'mistake', tag), candidate);
  }
}

function finalizeSignal(signal: MutablePlanWeakSpotSignal): PlanWeakSpotSignal {
  return {
    id: signal.id,
    kind: signal.kind,
    tag: signal.tag,
    wrongCount: signal.wrongCount,
    mistakePracticeDueCount: signal.mistakePracticeDueCount,
    planInstanceIds: compactStrings(signal.planInstanceIdsSet),
    blockIds: compactStrings(signal.blockIdsSet),
    dayIndexes: compactNumbers(signal.dayIndexesSet),
    contentUnitIds: compactStrings(signal.contentUnitIdsSet),
    latestAttemptAt: signal.latestAttemptAt,
  };
}

function dueFor(candidates: PlanRecoveryCandidate[], target: PlanRecoveryCandidateTarget): PlanWeakSpotDueSummary {
  const count = candidates.filter((candidate) => candidate.target === target).length;
  return {
    due: count > 0,
    count,
  };
}

export function buildPlanWeakSpotSummary(
  input: PlanWeakSpotSummaryInput,
  options?: PlanWeakSpotSummaryOptions,
): PlanWeakSpotSummary {
  const attempts = input.attempts.filter((attempt) =>
    isCurrentInstance(attempt.planInstanceId, options),
  );
  const recoveryCandidates = input.recoveryCandidates.filter((candidate) =>
    isCurrentInstance(candidate.planInstanceId, options),
  );
  const signals = new Map<string, MutablePlanWeakSpotSignal>();

  for (const attempt of attempts) {
    if (attempt.result !== 'wrong' && attempt.result !== 'skipped') continue;
    addAttemptTags(signals, attempt);
  }

  for (const candidate of recoveryCandidates) {
    addRecoveryTags(signals, candidate);
  }

  const weakSpots = [...signals.values()]
    .map(finalizeSignal)
    .filter((signal) =>
      signal.wrongCount > 0 ||
      signal.mistakePracticeDueCount > 0,
    )
    .sort((a, b) =>
      b.wrongCount - a.wrongCount ||
      b.mistakePracticeDueCount - a.mistakePracticeDueCount ||
      a.kind.localeCompare(b.kind) ||
      a.tag.localeCompare(b.tag),
    );

  return {
    scope: {
      planInstanceId: options?.planInstanceId?.trim() || undefined,
    },
    totals: {
      attempts: attempts.length,
      correct: attempts.filter((attempt) => attempt.result === 'correct').length,
      wrong: attempts.filter((attempt) => attempt.result === 'wrong').length,
      skipped: attempts.filter((attempt) => attempt.result === 'skipped').length,
      completed: attempts.filter((attempt) => attempt.result === 'completed').length,
      recoveryCandidates: recoveryCandidates.length,
    },
    due: {
      mistakePractice: dueFor(recoveryCandidates, 'mistake_practice'),
    },
    weakSpots,
  };
}
