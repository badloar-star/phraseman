import { HttpsError } from 'firebase-functions/v2/https';
import {
  AGENT_OFFICE_SCHEMA_VERSION,
  AGENT_OFFICE_SCOPE,
  agentRecommendationContentHash,
  isRecord,
  isSafeOpaqueRef,
  parseAgentCase,
  parseAgentOfficeControl,
  parseAgentRecommendation,
  sha256,
  type AgentCase,
  type AgentRecommendation,
} from './contracts';
import type { AgentOfficeRepository } from './ledger';

const REQUIRED_SOURCES = ['firebase', 'revenuecat', 'store_console'] as const;
const MAX_SOURCE_AGE_MS = 15 * 60 * 1_000;
const MAX_FUTURE_SKEW_MS = 60 * 1_000;
const MIN_CONVERSION_DENOMINATOR = 20;
const CONVERSION_DROP_RATIO = 0.2;
const MIN_REFUND_DENOMINATOR = 20;
const REFUND_RATE_FLOOR = 0.1;
const REFUND_RATE_INCREASE = 0.05;
const CASE_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
const RECOMMENDATION_VALIDITY_MS = 24 * 60 * 60 * 1_000;

type SourceName = (typeof REQUIRED_SOURCES)[number];
type SignalName = 'paid_conversion_drop' | 'refund_rate_spike';

interface SourceHealth {
  readonly source: SourceName;
  readonly state: 'ready';
  readonly observedAtMs: number;
  readonly sourceRef: string;
}

interface Metrics {
  readonly firebase: { readonly currentTrials: number; readonly currentPaid: number; readonly previousTrials: number; readonly previousPaid: number };
  readonly revenuecat: { readonly currentActiveSubscribers: number; readonly previousActiveSubscribers: number };
  readonly storeConsole: { readonly currentPurchases: number; readonly currentRefunds: number; readonly previousPurchases: number; readonly previousRefunds: number };
}

export interface BusinessSignalCandidate {
  readonly signal: SignalName;
  readonly confidence: 0.9;
  readonly impact: Readonly<{ readonly previousRate: number; readonly currentRate: number; readonly absoluteChange: number }>;
  readonly rationale: string;
  readonly safeActionCategory: 'analysis_prepare';
  readonly provenance: readonly SourceHealth[];
}

export interface BusinessSignalEvaluation {
  readonly evaluatedAtMs: number;
  readonly outcome: 'candidates_ready' | 'no_anomaly' | 'insufficient_evidence';
  readonly reason: string;
  readonly candidates: readonly BusinessSignalCandidate[];
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  throw new HttpsError('invalid-argument', 'business signal content is not JSON');
}

function validInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function rate(numerator: number, denominator: number): number {
  return Number((numerator / denominator).toFixed(6));
}

function sourceHealth(input: Record<string, unknown>, nowMs: number): readonly SourceHealth[] | null {
  if (!Array.isArray(input.sourceHealth) || input.sourceHealth.length !== REQUIRED_SOURCES.length) return null;
  const byName = new Map<SourceName, SourceHealth>();
  for (const candidate of input.sourceHealth) {
    if (!isRecord(candidate) || Object.keys(candidate).length !== 4) return null;
    const source = candidate.source;
    if (typeof source !== 'string' || !(REQUIRED_SOURCES as readonly string[]).includes(source) || byName.has(source as SourceName)) return null;
    if (candidate.state !== 'ready' || !validInteger(candidate.observedAtMs) || !isSafeOpaqueRef(candidate.sourceRef)) return null;
    const ageMs = nowMs - candidate.observedAtMs;
    if (ageMs > MAX_SOURCE_AGE_MS || ageMs < -MAX_FUTURE_SKEW_MS) return null;
    byName.set(source as SourceName, Object.freeze({
      source: source as SourceName,
      state: 'ready',
      observedAtMs: candidate.observedAtMs,
      sourceRef: candidate.sourceRef,
    }));
  }
  return REQUIRED_SOURCES.every((source) => byName.has(source))
    ? Object.freeze(REQUIRED_SOURCES.map((source) => byName.get(source)!))
    : null;
}

function metrics(input: Record<string, unknown>): Metrics | null {
  const firebase = input.firebase;
  const revenuecat = input.revenuecat;
  const storeConsole = input.storeConsole;
  if (!isRecord(firebase) || !isRecord(revenuecat) || !isRecord(storeConsole)) return null;
  const firebaseKeys = ['currentTrials', 'currentPaid', 'previousTrials', 'previousPaid'];
  const revenuecatKeys = ['currentActiveSubscribers', 'previousActiveSubscribers'];
  const storeKeys = ['currentPurchases', 'currentRefunds', 'previousPurchases', 'previousRefunds'];
  if (Object.keys(firebase).length !== firebaseKeys.length || !firebaseKeys.every((key) => validInteger(firebase[key]))) return null;
  if (Object.keys(revenuecat).length !== revenuecatKeys.length || !revenuecatKeys.every((key) => validInteger(revenuecat[key]))) return null;
  if (Object.keys(storeConsole).length !== storeKeys.length || !storeKeys.every((key) => validInteger(storeConsole[key]))) return null;
  const firebaseMetrics = firebase as unknown as Metrics['firebase'];
  const revenuecatMetrics = revenuecat as unknown as Metrics['revenuecat'];
  const storeMetrics = storeConsole as unknown as Metrics['storeConsole'];
  if (firebaseMetrics.currentPaid > firebaseMetrics.currentTrials || firebaseMetrics.previousPaid > firebaseMetrics.previousTrials
    || storeMetrics.currentRefunds > storeMetrics.currentPurchases || storeMetrics.previousRefunds > storeMetrics.previousPurchases) return null;
  return Object.freeze({
    firebase: firebaseMetrics,
    revenuecat: revenuecatMetrics,
    storeConsole: storeMetrics,
  });
}

/** Pure, deterministic evaluator over pre-normalized adapter evidence. It never calls an external service. */
export function evaluateBusinessSignals(value: unknown): BusinessSignalEvaluation {
  const input = isRecord(value) ? value : {};
  if (Object.keys(input).length !== 5 || !validInteger(input.evaluatedAtMs)) {
    return Object.freeze({ evaluatedAtMs: 0, outcome: 'insufficient_evidence', reason: 'invalid_input', candidates: Object.freeze([]) });
  }
  const provenance = sourceHealth(input, input.evaluatedAtMs);
  const inputMetrics = metrics(input);
  if (!provenance || !inputMetrics) {
    return Object.freeze({ evaluatedAtMs: input.evaluatedAtMs, outcome: 'insufficient_evidence', reason: 'incomplete_stale_or_conflicting_evidence', candidates: Object.freeze([]) });
  }
  const candidates: BusinessSignalCandidate[] = [];
  const conversionCurrent = inputMetrics.firebase.currentTrials === 0 ? 0 : rate(inputMetrics.firebase.currentPaid, inputMetrics.firebase.currentTrials);
  const conversionPrevious = inputMetrics.firebase.previousTrials === 0 ? 0 : rate(inputMetrics.firebase.previousPaid, inputMetrics.firebase.previousTrials);
  if (inputMetrics.firebase.currentTrials >= MIN_CONVERSION_DENOMINATOR
    && inputMetrics.firebase.previousTrials >= MIN_CONVERSION_DENOMINATOR
    && conversionPrevious > 0
    && conversionCurrent <= conversionPrevious * (1 - CONVERSION_DROP_RATIO)) {
    candidates.push(Object.freeze({
      signal: 'paid_conversion_drop',
      confidence: 0.9,
      impact: Object.freeze({ previousRate: conversionPrevious, currentRate: conversionCurrent, absoluteChange: Number((conversionCurrent - conversionPrevious).toFixed(6)) }),
      rationale: `Paid conversion fell from ${conversionPrevious} to ${conversionCurrent}; the configured relative-drop threshold is ${CONVERSION_DROP_RATIO}.`,
      safeActionCategory: 'analysis_prepare',
      provenance,
    }));
  }
  const refundCurrent = inputMetrics.storeConsole.currentPurchases === 0 ? 0 : rate(inputMetrics.storeConsole.currentRefunds, inputMetrics.storeConsole.currentPurchases);
  const refundPrevious = inputMetrics.storeConsole.previousPurchases === 0 ? 0 : rate(inputMetrics.storeConsole.previousRefunds, inputMetrics.storeConsole.previousPurchases);
  if (inputMetrics.storeConsole.currentPurchases >= MIN_REFUND_DENOMINATOR
    && inputMetrics.storeConsole.previousPurchases >= MIN_REFUND_DENOMINATOR
    && refundCurrent >= REFUND_RATE_FLOOR
    && refundCurrent - refundPrevious >= REFUND_RATE_INCREASE) {
    candidates.push(Object.freeze({
      signal: 'refund_rate_spike',
      confidence: 0.9,
      impact: Object.freeze({ previousRate: refundPrevious, currentRate: refundCurrent, absoluteChange: Number((refundCurrent - refundPrevious).toFixed(6)) }),
      rationale: `Refund rate rose from ${refundPrevious} to ${refundCurrent}; the configured increase threshold is ${REFUND_RATE_INCREASE}.`,
      safeActionCategory: 'analysis_prepare',
      provenance,
    }));
  }
  return Object.freeze({
    evaluatedAtMs: input.evaluatedAtMs,
    outcome: candidates.length ? 'candidates_ready' : 'no_anomaly',
    reason: candidates.length ? 'thresholds_met' : 'thresholds_not_met',
    candidates: Object.freeze(candidates),
  });
}

function candidateIdentity(candidate: BusinessSignalCandidate): string {
  return sha256(canonicalJson({ signal: candidate.signal, impact: candidate.impact, provenance: candidate.provenance }));
}

function candidateDocuments(candidate: BusinessSignalCandidate, evaluatedAtMs: number): Readonly<{ caseDocument: AgentCase; recommendation: AgentRecommendation; casePath: string; recommendationPath: string }> {
  const identity = candidateIdentity(candidate);
  const caseId = `business_${identity}`;
  const recommendationId = `recommendation_${identity}`;
  const evidence = candidate.provenance.map((source) => Object.freeze({
    summary: `${candidate.signal}: ${source.source} evidence observed at ${source.observedAtMs}.`,
    sourceRef: source.sourceRef,
    observedAtMs: source.observedAtMs,
  }));
  const withoutHash = {
    schemaVersion: AGENT_OFFICE_SCHEMA_VERSION,
    recommendationId,
    caseId,
    revision: 1,
    evidence,
    risk: { level: 'low' as const, summary: `Read-only analysis candidate. ${candidate.rationale}` },
    cost: { currency: 'EUR' as const, estimatedMinor: 0, summary: 'No external call, user message, or financial action.' },
    rollback: { possible: true, plan: 'No execution exists; dismiss or decline the recommendation.' },
    actionType: candidate.safeActionCategory,
    scope: AGENT_OFFICE_SCOPE,
    validUntilMs: evaluatedAtMs + RECOMMENDATION_VALIDITY_MS,
    createdAtMs: evaluatedAtMs,
  };
  const recommendation = parseAgentRecommendation({ ...withoutHash, contentHash: sha256(canonicalJson(withoutHash)) });
  const caseDocument = parseAgentCase({
    schemaVersion: AGENT_OFFICE_SCHEMA_VERSION,
    caseId,
    revision: 1,
    status: 'awaiting_decision',
    summary: `${candidate.signal}: impact ${candidate.impact.absoluteChange}; ${candidate.rationale}`,
    sourceHealth: candidate.provenance.map((source) => ({ source: source.source, state: source.state, observedAtMs: source.observedAtMs })),
    confidence: { score: candidate.confidence, basis: 'Complete, fresh, internally consistent, source-bound deterministic evidence.', insufficientEvidence: false },
    sourceRefs: candidate.provenance.map((source) => ({ source: source.source, ref: source.sourceRef })),
    currentRecommendation: { recommendationId, revision: 1, contentHash: agentRecommendationContentHash(recommendation) },
    createdAtMs: evaluatedAtMs,
    updatedAtMs: evaluatedAtMs,
    retentionUntilMs: evaluatedAtMs + CASE_RETENTION_MS,
  });
  return Object.freeze({
    caseDocument,
    recommendation,
    casePath: `agent_cases/${caseId}`,
    recommendationPath: `agent_recommendations/${caseId}__r1`,
  });
}

/** Create-only bridge into the W1 ledger. Missing, invalid, stale or disabled control always does nothing. */
export async function persistBusinessSignalEvaluation(
  repository: AgentOfficeRepository,
  value: unknown,
  now: () => number = Date.now,
): Promise<Readonly<{ outcome: 'candidates_persisted' | 'no_action'; reason: string; idempotent: boolean; externalEffect: 'none'; caseIds: readonly string[] }>> {
  const evaluation = evaluateBusinessSignals(value);
  if (evaluation.outcome !== 'candidates_ready') {
    return Object.freeze({ outcome: 'no_action', reason: evaluation.reason, idempotent: true, externalEffect: 'none', caseIds: Object.freeze([]) });
  }
  const nowMs = now();
  if (!validInteger(nowMs)) {
    return Object.freeze({ outcome: 'no_action', reason: 'invalid_clock', idempotent: true, externalEffect: 'none', caseIds: Object.freeze([]) });
  }
  return repository.runTransaction(async (transaction) => {
    const controlDocument = await transaction.get('agent_office_control/global');
    let control;
    try {
      control = controlDocument ? parseAgentOfficeControl(controlDocument.data) : null;
    } catch {
      control = null;
    }
    if (!control || control.killSwitchEnabled) {
      return Object.freeze({ outcome: 'no_action' as const, reason: control ? 'control_enabled' : 'control_missing_or_invalid', idempotent: true, externalEffect: 'none' as const, caseIds: Object.freeze([]) });
    }
    let idempotent = true;
    const caseIds: string[] = [];
    for (const candidate of evaluation.candidates) {
      const documents = candidateDocuments(candidate, evaluation.evaluatedAtMs);
      const existingCase = await transaction.get(documents.casePath);
      const existingRecommendation = await transaction.get(documents.recommendationPath);
      if (existingCase || existingRecommendation) {
        if (!existingCase || !existingRecommendation
          || canonicalJson(parseAgentCase(existingCase.data)) !== canonicalJson(documents.caseDocument)
          || canonicalJson(parseAgentRecommendation(existingRecommendation.data)) !== canonicalJson(documents.recommendation)) {
          throw new HttpsError('data-loss', 'business signal ledger binding mismatch');
        }
      } else {
        transaction.create(documents.casePath, documents.caseDocument as unknown as Record<string, unknown>);
        transaction.create(documents.recommendationPath, documents.recommendation as unknown as Record<string, unknown>);
        idempotent = false;
      }
      caseIds.push(documents.caseDocument.caseId);
    }
    return Object.freeze({ outcome: 'candidates_persisted' as const, reason: 'thresholds_met', idempotent, externalEffect: 'none' as const, caseIds: Object.freeze(caseIds) });
  });
}
