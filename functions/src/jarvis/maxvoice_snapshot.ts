import type { Decision, DecisionTrigger } from './decision';
import { runMaxvoiceDepartment } from './maxvoice_department';
import type { FetchMaxvoiceSourceResult } from './maxvoice_firestore_fetcher';

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

export async function buildMaxvoiceSnapshot(input: BuildMaxvoiceSnapshotInput): Promise<MaxvoiceSnapshot> {
  let fetch: FetchMaxvoiceSourceResult;
  try {
    fetch = await input.fetchMaxvoice();
  } catch {
    fetch = failClosed(input.nowMs);
  }
  const { decisions } = runMaxvoiceDepartment({
    fetch,
    trigger: input.trigger,
    question: input.question,
    nowMs: input.nowMs,
  });
  return Object.freeze({ generatedAtMs: input.nowMs, decisions });
}
