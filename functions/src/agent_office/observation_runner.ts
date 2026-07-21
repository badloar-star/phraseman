import { HttpsError } from 'firebase-functions/v2/https';
import {
  AGENT_OFFICE_SCHEMA_VERSION,
  AGENT_OFFICE_SCOPE,
  isRecord,
  parseAgentOfficeControl,
  sha256,
} from './contracts';
import type { AgentOfficeDocument, AgentOfficeRepository } from './ledger';
import { observeAgentOffice } from './observation';

type ControlState = Readonly<{
  state: 'disabled' | 'enabled' | 'missing' | 'invalid';
  revision: number | null;
}>;

type ReceiptReason =
  | 'sufficient_evidence'
  | 'insufficient_evidence'
  | 'no_observation'
  | 'control_enabled'
  | 'control_missing'
  | 'control_invalid';

export interface AgentObservationReceipt {
  readonly schemaVersion: 1;
  readonly receiptId: string;
  readonly receiptType: 'observation';
  readonly outcome: 'draft_prepared' | 'no_action';
  readonly reason: ReceiptReason;
  readonly scope: 'prepare_only';
  readonly piiClass: 'none';
  readonly externalEffect: 'none';
  readonly controlRevision: number | null;
  readonly observedAtMs: number;
  readonly createdAtMs: number;
  readonly sourceHealth: readonly {
    readonly source: string;
    readonly state: 'ready' | 'empty' | 'partial' | 'error' | 'truncated';
    readonly count: number | null;
    readonly truncated: boolean | null;
    readonly observedAtMs: number;
  }[];
  readonly draft: Readonly<{
    signal: 'analytics_incomplete' | 'report_incident' | 'audit_error';
    summary: string;
    actionType: 'analysis_prepare';
    scope: 'prepare_only';
    cost: Readonly<{ currency: 'EUR'; estimatedMinor: 0; summary: string }>;
  }> | null;
  readonly contentHash: string;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  throw new HttpsError('invalid-argument', 'observation receipt contains a non-JSON value');
}

function controlState(document: AgentOfficeDocument | null): ControlState {
  if (!document) return Object.freeze({ state: 'missing', revision: null });
  try {
    const control = parseAgentOfficeControl(document.data);
    return Object.freeze({ state: control.killSwitchEnabled ? 'enabled' : 'disabled', revision: control.revision });
  } catch {
    return Object.freeze({ state: 'invalid', revision: null });
  }
}

function safeNow(now: () => number): number {
  const value = now();
  if (!Number.isSafeInteger(value) || value < 0) throw new HttpsError('internal', 'observation clock is invalid');
  return value;
}

/**
 * Trusted server-only runner. It consumes sanitized inputs and has no live-read or
 * external-effect dependency; the repository transaction is its only persistence seam.
 */
export async function runAgentOfficeObservation(
  repository: AgentOfficeRepository,
  input: unknown,
  now: () => number = Date.now,
): Promise<Readonly<{ receipt: AgentObservationReceipt; idempotent: boolean }>> {
  const observation = observeAgentOffice(input);
  const observationHash = sha256(canonicalJson(observation));

  return repository.runTransaction(async (transaction) => {
    // The control is deliberately re-read inside every transaction attempt.
    const control = controlState(await transaction.get('agent_office_control/global'));
    const recommendation = observation.digest.recommendation;
    const draftAllowed = control.state === 'disabled'
      && observation.evidenceSufficient
      && recommendation !== null;
    const reason: ReceiptReason = control.state !== 'disabled'
      ? `control_${control.state}` as ReceiptReason
      : !observation.evidenceSufficient
        ? 'insufficient_evidence'
        : recommendation === null
          ? 'no_observation'
          : 'sufficient_evidence';
    const identity = Object.freeze({
      schemaVersion: AGENT_OFFICE_SCHEMA_VERSION,
      receiptType: 'observation' as const,
      outcome: draftAllowed ? 'draft_prepared' as const : 'no_action' as const,
      reason,
      scope: AGENT_OFFICE_SCOPE,
      piiClass: 'none' as const,
      externalEffect: 'none' as const,
      controlRevision: control.revision,
      observedAtMs: observation.observedAtMs,
      sourceHealth: Object.freeze(observation.sourceHealth.map((source) => Object.freeze({
        source: source.source,
        state: source.state,
        count: source.count,
        truncated: source.truncated,
        observedAtMs: source.observedAtMs,
      }))),
      draft: draftAllowed && recommendation ? Object.freeze({
        signal: recommendation.signal,
        summary: recommendation.summary,
        actionType: recommendation.actionType,
        scope: AGENT_OFFICE_SCOPE,
        cost: observation.digest.cost,
      }) : null,
    });
    const contentHash = sha256(canonicalJson(identity));
    const receiptId = `observation_${sha256(canonicalJson({ observationHash, controlState: control.state, controlRevision: control.revision, contentHash }))}`;
    const path = `agent_observation_receipts/${receiptId}`;
    const existing = await transaction.get(path);
    if (existing) {
      const existingCreatedAtMs = existing.data.createdAtMs;
      if (typeof existingCreatedAtMs !== 'number' || !Number.isSafeInteger(existingCreatedAtMs) || existingCreatedAtMs < 0) {
        throw new HttpsError('data-loss', 'immutable observation receipt timestamp is invalid');
      }
      const receipt: AgentObservationReceipt = Object.freeze({
        ...identity,
        receiptId,
        createdAtMs: existingCreatedAtMs,
        contentHash,
      });
      if (canonicalJson(existing.data) !== canonicalJson(receipt)) {
        throw new HttpsError('data-loss', 'immutable observation receipt mismatch');
      }
      return Object.freeze({ receipt, idempotent: true });
    }
    const receipt: AgentObservationReceipt = Object.freeze({
      ...identity,
      receiptId,
      createdAtMs: safeNow(now),
      contentHash,
    });
    transaction.create(path, receipt as unknown as Record<string, unknown>);
    return Object.freeze({ receipt, idempotent: false });
  });
}
