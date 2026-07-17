import { isRecord, isSafeOpaqueRef } from './contracts';

export type ObservationSourceState = 'ready' | 'empty' | 'partial' | 'error' | 'truncated';

export interface ObservationSourceHealth {
  readonly source: string;
  readonly state: ObservationSourceState;
  readonly observedAtMs: number;
  readonly insufficientEvidence: boolean;
}

export interface ObservationCase {
  readonly signal: 'analytics_incomplete' | 'report_incident' | 'audit_error';
  readonly status: 'observed' | 'insufficient_data';
  readonly insufficientEvidence: boolean;
  readonly summary: string;
  readonly actionType: 'analysis_prepare';
}

export interface ReportIncident {
  readonly source: string;
  readonly category: string;
  readonly screen: string;
  readonly count: number;
  readonly evidence: readonly { readonly sourceRef: string; readonly summary: string }[];
  readonly truncated: boolean;
  readonly insufficientEvidence: boolean;
  readonly droppedEvidenceCount: number;
}

type RawSourceHealth = Readonly<{ state?: unknown; count?: unknown; truncated?: unknown; observedAtMs?: unknown }>;
type RawReport = Readonly<{ source?: unknown; sourceRef?: unknown; category?: unknown; screen?: unknown; summary?: unknown }>;
type RawObservationSourceHealth = RawSourceHealth & Readonly<{ source?: unknown }>;
type RawObservationRow = Readonly<{ source?: unknown; category?: unknown; screen?: unknown }>;

const MAX_REPORT_ROWS = 100;
const MAX_REPORT_GROUPS = 20;
const MAX_TOTAL_EVIDENCE = 20;
const SAFE_REPORT_SOURCES = new Set(['error_reports', 'user_reports', 'community_pack_reports', 'explain_report_entries', 'app_errors']);
const SAFE_REPORT_CATEGORIES = new Set(['audio', 'bug', 'content', 'crash', 'other', 'payment', 'safety', 'spam', 'typo', 'unknown']);
const SAFE_REPORT_SCREENS = new Set(['home', 'lesson', 'profile', 'quiz', 'settings', 'unknown_screen']);
const EXPECTED_OBSERVATION_SOURCES = ['analytics', 'reports', 'audit'] as const;

function text(value: unknown, fallback: string, max: number): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

function hasSufficientReceipt(input: RawSourceHealth): boolean {
  return (input.state === 'ready' || input.state === 'empty')
    && typeof input.count === 'number' && Number.isSafeInteger(input.count) && input.count >= 0
    && input.truncated === false
    && (input.state !== 'empty' || input.count === 0);
}

function sourceState(input: RawSourceHealth): ObservationSourceState {
  if (input.truncated === true || input.state === 'truncated') return 'truncated';
  if (!hasSufficientReceipt(input) && input.state !== 'partial' && input.state !== 'error' && input.state !== 'truncated') return 'error';
  if (input.state === 'ready' || input.state === 'empty' || input.state === 'partial' || input.state === 'error') return input.state;
  return 'error';
}

/** Converts existing callable health contracts without inferring zero from unavailable data. */
export function normalizeSourceHealth(source: string, input: RawSourceHealth, observedAtMs: number): ObservationSourceHealth {
  const state = sourceState(input);
  const sourceObservedAtMs = typeof input.observedAtMs === 'number'
    && Number.isSafeInteger(input.observedAtMs) && input.observedAtMs >= 0
    ? input.observedAtMs
    : observedAtMs;
  return Object.freeze({
    source: text(source, 'unknown_source', 80),
    state,
    observedAtMs: sourceObservedAtMs,
    insufficientEvidence: !hasSufficientReceipt(input),
  });
}

function safeMetadata(value: unknown, allowed: ReadonlySet<string>, fallback: string): string {
  return typeof value === 'string' && allowed.has(value) ? value : fallback;
}

/** Groups only allowlisted metadata and prevalidated W1 opaque references. */
export function deduplicateReportIncidents(reports: readonly RawReport[], maxEvidence = 3): Readonly<{
  incidents: readonly ReportIncident[];
  truncated: boolean;
  insufficientEvidence: boolean;
  droppedEvidenceCount: number;
}> {
  const groups = new Map<string, { source: string; category: string; screen: string; count: number; evidence: ReportIncident['evidence'][number][]; droppedEvidenceCount: number }>();
  const bounded = Math.max(0, Math.min(5, Math.floor(maxEvidence), MAX_TOTAL_EVIDENCE));
  let totalEvidence = 0;
  let truncated = reports.length > MAX_REPORT_ROWS;
  let droppedEvidenceCount = Math.max(0, reports.length - MAX_REPORT_ROWS);
  for (const row of reports.slice(0, MAX_REPORT_ROWS)) {
    if (!isSafeOpaqueRef(row.sourceRef)) {
      droppedEvidenceCount += 1;
      continue;
    }
    const source = safeMetadata(row.source, SAFE_REPORT_SOURCES, 'unknown_reports');
    const category = safeMetadata(row.category, SAFE_REPORT_CATEGORIES, 'other');
    const screen = safeMetadata(row.screen, SAFE_REPORT_SCREENS, 'unknown_screen');
    const key = `${source}\u0000${category}\u0000${screen}`;
    let group = groups.get(key);
    if (!group) {
      if (groups.size >= MAX_REPORT_GROUPS) {
        truncated = true;
        droppedEvidenceCount += 1;
        continue;
      }
      group = { source, category, screen, count: 0, evidence: [], droppedEvidenceCount: 0 };
    }
    group.count += 1;
    if (group.evidence.length < bounded && totalEvidence < MAX_TOTAL_EVIDENCE) {
      group.evidence.push(Object.freeze({
        sourceRef: row.sourceRef,
        // Never carry a report body into the Agent Office collection or digest.
        summary: 'Redacted report metadata sample.',
      }));
      totalEvidence += 1;
    } else {
      truncated = true;
      droppedEvidenceCount += 1;
      group.droppedEvidenceCount += 1;
    }
    groups.set(key, group);
  }
  const insufficientEvidence = droppedEvidenceCount > 0;
  const incidents = Object.freeze([...groups.values()]
    .sort((left, right) => right.count - left.count || left.source.localeCompare(right.source))
    .map((group) => Object.freeze({ ...group, evidence: Object.freeze(group.evidence), truncated, insufficientEvidence, droppedEvidenceCount: group.droppedEvidenceCount })));
  return Object.freeze({ incidents, truncated, insufficientEvidence, droppedEvidenceCount });
}

export function createObservationCases(input: Readonly<{
  observedAtMs: number;
  sourceHealth: readonly ObservationSourceHealth[];
  analytics: Readonly<{ state: string; qualityIncomplete: boolean; count?: unknown; truncated?: unknown }>;
  incidents: readonly ReportIncident[];
  audit: Readonly<{ state: string; count?: unknown; truncated?: unknown }>;
}>): readonly ObservationCase[] {
  const analyticsInsufficient = input.analytics.qualityIncomplete || !hasSufficientReceipt(input.analytics);
  const auditInsufficient = !hasSufficientReceipt(input.audit);
  const expectedReceiptsPresent = ['analytics', 'reports', 'audit'].every((source) => input.sourceHealth.some((health) => health.source === source && !health.insufficientEvidence));
  const incomplete = !expectedReceiptsPresent || analyticsInsufficient || auditInsufficient || input.sourceHealth.some((source) => source.insufficientEvidence) || input.incidents.some((incident) => incident.insufficientEvidence);
  const cases: ObservationCase[] = [];
  if (analyticsInsufficient) {
    cases.push(Object.freeze({ signal: 'analytics_incomplete', status: 'insufficient_data', insufficientEvidence: true, summary: 'Analytics source is incomplete; observe again before drawing a conclusion.', actionType: 'analysis_prepare' }));
  }
  for (const incident of input.incidents.filter((item) => item.count >= 2).slice(0, 3)) {
    cases.push(Object.freeze({
      signal: 'report_incident',
      status: incomplete ? 'insufficient_data' : 'observed',
      insufficientEvidence: incomplete,
      summary: `${incident.count} related reports: ${incident.category} on ${incident.screen}.`,
      actionType: 'analysis_prepare',
    }));
  }
  if (auditInsufficient) {
    cases.push(Object.freeze({ signal: 'audit_error', status: 'insufficient_data', insufficientEvidence: true, summary: 'Audit source is incomplete; no operational conclusion is available.', actionType: 'analysis_prepare' }));
  }
  return Object.freeze(cases);
}

export function buildDailyObservationDigest(input: Readonly<{
  generatedAtMs: number;
  sourceHealth: readonly ObservationSourceHealth[];
  cases: readonly ObservationCase[];
}>): Readonly<{
  generatedAtMs: number;
  freshness: readonly { readonly source: string; readonly state: ObservationSourceState; readonly ageMs: number }[];
  cost: { readonly currency: 'EUR'; readonly estimatedMinor: 0; readonly summary: string };
  recommendation: ObservationCase | null;
}> {
  const recommendation = input.cases.find((item) => !item.insufficientEvidence) ?? null;
  return Object.freeze({
    generatedAtMs: input.generatedAtMs,
    freshness: Object.freeze(input.sourceHealth.map((source) => Object.freeze({
      source: source.source, state: source.state, ageMs: Math.max(0, input.generatedAtMs - source.observedAtMs),
    }))),
    cost: Object.freeze({ currency: 'EUR', estimatedMinor: 0, summary: 'No model or external calls.' }),
    recommendation,
  });
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function sanitizedIncidents(value: unknown): Readonly<{
  incidents: readonly ReportIncident[];
  valid: boolean;
  rowCount: number;
}> {
  if (!Array.isArray(value) || value.length > MAX_REPORT_ROWS) {
    return Object.freeze({ incidents: Object.freeze([]), valid: false, rowCount: Array.isArray(value) ? value.length : 0 });
  }
  const groups = new Map<string, { source: string; category: string; screen: string; count: number }>();
  let valid = true;
  for (const candidate of value) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, ['source', 'category', 'screen'])) {
      valid = false;
      continue;
    }
    const row = candidate as RawObservationRow;
    if (typeof row.source !== 'string' || !SAFE_REPORT_SOURCES.has(row.source)
      || typeof row.category !== 'string' || !SAFE_REPORT_CATEGORIES.has(row.category)
      || typeof row.screen !== 'string' || !SAFE_REPORT_SCREENS.has(row.screen)) {
      valid = false;
      continue;
    }
    const key = `${row.source}\u0000${row.category}\u0000${row.screen}`;
    const current = groups.get(key);
    if (!current && groups.size >= MAX_REPORT_GROUPS) {
      valid = false;
      continue;
    }
    groups.set(key, current
      ? { ...current, count: current.count + 1 }
      : { source: row.source, category: row.category, screen: row.screen, count: 1 });
  }
  const incidents = Object.freeze([...groups.values()]
    .sort((left, right) => right.count - left.count || left.source.localeCompare(right.source))
    .map((group) => Object.freeze({
      ...group,
      evidence: Object.freeze([]),
      truncated: !valid,
      insufficientEvidence: !valid,
      droppedEvidenceCount: valid ? 0 : 1,
    })));
  return Object.freeze({ incidents, valid, rowCount: value.length });
}

/** Pure boundary over sanitized server-provided receipts and metadata-only report rows. */
export function observeAgentOffice(value: unknown): Readonly<{
  observedAtMs: number;
  sourceHealth: readonly ObservationSourceHealth[];
  cases: readonly ObservationCase[];
  digest: ReturnType<typeof buildDailyObservationDigest>;
  evidenceSufficient: boolean;
}> {
  const input = isRecord(value) ? value : {};
  const observedAtValid = typeof input.observedAtMs === 'number'
    && Number.isSafeInteger(input.observedAtMs) && input.observedAtMs >= 0;
  const observedAtMs = observedAtValid ? input.observedAtMs as number : 0;
  const rawHealth = Array.isArray(input.sourceHealth) ? input.sourceHealth : [];
  const inputKeysValid = hasExactKeys(input, ['observedAtMs', 'sourceHealth', 'rows']);
  const receiptsValid = rawHealth.length === EXPECTED_OBSERVATION_SOURCES.length
    && rawHealth.every((candidate) => isRecord(candidate)
      && hasExactKeys(candidate, ['source', 'state', 'count', 'truncated', 'observedAtMs'])
      && typeof candidate.observedAtMs === 'number'
      && Number.isSafeInteger(candidate.observedAtMs)
      && candidate.observedAtMs >= 0);
  const sourceHealth = Object.freeze(EXPECTED_OBSERVATION_SOURCES.map((source) => {
    const matches = rawHealth.filter((candidate): candidate is RawObservationSourceHealth =>
      isRecord(candidate) && candidate.source === source);
    const receipt = matches.length === 1 ? matches[0] : { state: 'error', count: 0, truncated: false };
    return normalizeSourceHealth(source, receipt, observedAtMs);
  }));
  const rows = sanitizedIncidents(input.rows);
  const reportsReceipt = rawHealth.find((candidate): candidate is RawObservationSourceHealth =>
    isRecord(candidate) && candidate.source === 'reports');
  const reportsCountMatches = reportsReceipt?.count === rows.rowCount;
  const shapeValid = inputKeysValid && observedAtValid && receiptsValid && rows.valid && reportsCountMatches;
  const analytics = sourceHealth.find((source) => source.source === 'analytics');
  const audit = sourceHealth.find((source) => source.source === 'audit');
  const initialCases = createObservationCases({
    observedAtMs,
    sourceHealth,
    analytics: {
      state: analytics?.state ?? 'error',
      qualityIncomplete: !analytics || analytics.insufficientEvidence,
      count: rawHealth.find((candidate) => isRecord(candidate) && candidate.source === 'analytics')?.count,
      truncated: rawHealth.find((candidate) => isRecord(candidate) && candidate.source === 'analytics')?.truncated,
    },
    incidents: rows.incidents,
    audit: {
      state: audit?.state ?? 'error',
      count: rawHealth.find((candidate) => isRecord(candidate) && candidate.source === 'audit')?.count,
      truncated: rawHealth.find((candidate) => isRecord(candidate) && candidate.source === 'audit')?.truncated,
    },
  });
  const cases = shapeValid ? initialCases : Object.freeze(initialCases.map((item) => Object.freeze({
    ...item,
    status: 'insufficient_data' as const,
    insufficientEvidence: true,
  })));
  const evidenceSufficient = shapeValid && sourceHealth.every((source) => !source.insufficientEvidence);
  const digest = buildDailyObservationDigest({ generatedAtMs: observedAtMs, sourceHealth, cases });
  return Object.freeze({ observedAtMs, sourceHealth, cases, digest, evidenceSufficient });
}
