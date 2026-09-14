import type { Decision, DecisionTrigger } from './decision';
import { evaluateMaxvoiceReliability } from './maxvoice_department';
import type { FetchMaxvoiceSourceResult } from './maxvoice_firestore_fetcher';
import { MAX_SECTION_SEALED_BY_OWNER_2026_09_04 } from '../max_section_seal';

export type MaxvoiceFetcher = () => Promise<FetchMaxvoiceSourceResult>;

export interface BuildMaxvoiceSnapshotInput {
  readonly fetchMaxvoice: MaxvoiceFetcher;
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
}

export interface MaxvoiceSnapshot {
  readonly generatedAtMs: number;
  readonly decisions: readonly Decision[];
}

function failClosed(observedAtMs: number): FetchMaxvoiceSourceResult {
  return Object.freeze({
    state: 'error' as const,
    sampledDays: 0,
    mintRejections: null,
    callsStarted: null,
    callsConnected: null,
    callsCompleted: null,
    reviewsReady: null,
    reconnectAttempts: null,
    reconnectRecovered: null,
    firstAudioGte8s: null,
    observedAtMs,
  });
}

async function buildUnsealedMaxvoiceSnapshot(input: BuildMaxvoiceSnapshotInput): Promise<MaxvoiceSnapshot> {
  let fetch: FetchMaxvoiceSourceResult;
  try {
    fetch = await input.fetchMaxvoice();
  } catch {
    fetch = failClosed(input.nowMs);
  }
  const { decisions } = evaluateMaxvoiceReliability({
    fetch,
    trigger: input.trigger,
    question: input.question,
    nowMs: input.nowMs,
  });
  return Object.freeze({ generatedAtMs: input.nowMs, decisions });
}

export async function buildMaxvoiceSnapshot(input: BuildMaxvoiceSnapshotInput): Promise<MaxvoiceSnapshot> {
  if (MAX_SECTION_SEALED_BY_OWNER_2026_09_04) {
    return Object.freeze({ generatedAtMs: input.nowMs, decisions: Object.freeze([]) });
  }
  return buildUnsealedMaxvoiceSnapshot(input);
}
