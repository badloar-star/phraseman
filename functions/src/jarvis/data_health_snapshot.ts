import { buildDecision, type Decision, type DecisionTrigger, type Evidence, type EvidenceState } from './decision';

export type DataHealthDegradedState = 'stale' | 'partial' | 'truncated' | 'error';

export interface DataHealthSnapshot {
  /** Unique source count only; source names and documents never leave this module. */
  readonly sourceCount: number;
  /** Latest observed timestamp across unique sources, or 0 when none were observed. */
  readonly latestObservedAtMs: number;
  /** Counts only the evidence states which make a source unsuitable for decisions. */
  readonly stateCounts: Readonly<Record<DataHealthDegradedState, number>>;
  /** An evidence-only, aggregate-only owner signal when a source is degraded. */
  readonly decision: Decision | null;
}

export interface BuildDataHealthSnapshotInput {
  readonly evidence: readonly Evidence[];
  readonly nowMs: number;
  readonly trigger: DecisionTrigger;
}

const DEGRADED_STATES: readonly DataHealthDegradedState[] = ['stale', 'partial', 'truncated', 'error'];

function worstState(left: EvidenceState, right: EvidenceState): EvidenceState {
  const rank: Record<EvidenceState, number> = { ready: 0, empty: 0, stale: 1, partial: 2, truncated: 3, error: 4 };
  return rank[right] > rank[left] ? right : left;
}

/**
 * Reduces already-normalized evidence into a privacy-safe health signal. It never
 * reads Firestore and deliberately drops source IDs, counts, digests, and rows.
 */
export function buildDataHealthSnapshot(input: BuildDataHealthSnapshotInput): DataHealthSnapshot {
  const sources = new Map<string, Pick<Evidence, 'state' | 'observedAtMs'>>();
  for (const item of input.evidence) {
    const current = sources.get(item.sourceId);
    sources.set(item.sourceId, current
      ? { state: worstState(current.state, item.state), observedAtMs: Math.max(current.observedAtMs, item.observedAtMs) }
      : { state: item.state, observedAtMs: item.observedAtMs });
  }

  const stateCounts: Record<DataHealthDegradedState, number> = { stale: 0, partial: 0, truncated: 0, error: 0 };
  let latestObservedAtMs = 0;
  for (const source of sources.values()) {
    latestObservedAtMs = Math.max(latestObservedAtMs, source.observedAtMs);
    if (DEGRADED_STATES.includes(source.state as DataHealthDegradedState)) {
      stateCounts[source.state as DataHealthDegradedState] += 1;
    }
  }

  const sourceCount = sources.size;
  const degradedCount = DEGRADED_STATES.reduce((total, state) => total + stateCounts[state], 0);
  const decision = degradedCount === 0 ? null : buildDecision({
    department: 'data_health',
    mode: 'observe',
    trigger: input.trigger,
    question: 'Can the current Jarvis evidence be trusted?',
    finding: `Data health: ${sourceCount} sources observed; ${stateCounts.stale} stale, ${stateCounts.partial} partial, ${stateCounts.truncated} truncated, ${stateCounts.error} error. Latest observation: ${latestObservedAtMs}.`,
    hypothesis: 'One or more aggregate sources need repair or a fresher observation before decisions can be trusted.',
    options: [
      { title: 'Inspect source health', cost: 0, risk: 'low' },
      { title: 'Wait for the next observation', cost: 0, risk: 'low' },
    ],
    recommendation: 'Do not act on degraded source data until it is fresh and complete.',
    risk: 'An incomplete source can make an otherwise valid decision misleading.',
    cost: 0,
    successMetric: 'All observed sources are ready or empty.',
    rollback: 'No automated change was made.',
    evidence: [{ sourceId: 'jarvis_data_health', state: 'partial', count: null, truncated: false, droppedCount: 0, observedAtMs: latestObservedAtMs }],
    actionability: 'evidence_only',
    nowMs: input.nowMs,
  });

  return Object.freeze({
    sourceCount,
    latestObservedAtMs,
    stateCounts: Object.freeze(stateCounts),
    decision,
  });
}
