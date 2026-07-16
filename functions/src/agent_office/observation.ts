import { sha256 } from './contracts';

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
}

type RawSourceHealth = Readonly<{ state?: unknown; count?: unknown; truncated?: unknown }>;
type RawReport = Readonly<{ source?: unknown; reportId?: unknown; category?: unknown; screen?: unknown; summary?: unknown }>;

function text(value: unknown, fallback: string, max: number): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

function sourceState(input: RawSourceHealth): ObservationSourceState {
  if (input.truncated === true || input.state === 'truncated') return 'truncated';
  if (input.state === 'ready' || input.state === 'empty' || input.state === 'partial' || input.state === 'error') return input.state;
  return 'error';
}

/** Converts existing callable health contracts without inferring zero from unavailable data. */
export function normalizeSourceHealth(source: string, input: RawSourceHealth, observedAtMs: number): ObservationSourceHealth {
  const state = sourceState(input);
  return Object.freeze({
    source: text(source, 'unknown_source', 80),
    state,
    observedAtMs,
    insufficientEvidence: state === 'partial' || state === 'error' || state === 'truncated',
  });
}

/** Groups only report metadata and a bounded, redacted evidence sample. */
export function deduplicateReportIncidents(reports: readonly RawReport[], maxEvidence = 3): readonly ReportIncident[] {
  const groups = new Map<string, { source: string; category: string; screen: string; count: number; evidence: ReportIncident['evidence'][number][] }>();
  const bounded = Math.max(0, Math.min(5, Math.floor(maxEvidence)));
  for (const row of reports) {
    const source = text(row.source, 'unknown_reports', 80);
    const category = text(row.category, 'unknown_category', 80);
    const screen = text(row.screen, 'unknown_screen', 100);
    const key = `${source}\u0000${category}\u0000${screen}`;
    const group = groups.get(key) ?? { source, category, screen, count: 0, evidence: [] };
    group.count += 1;
    if (group.evidence.length < bounded) {
      const id = text(row.reportId, 'unknown', 160);
      group.evidence.push(Object.freeze({
        sourceRef: `${source.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 32)}:sha256:${sha256(id)}`,
        // Never carry a report body into the Agent Office collection or digest.
        summary: 'Redacted report metadata sample.',
      }));
    }
    groups.set(key, group);
  }
  return Object.freeze([...groups.values()]
    .sort((left, right) => right.count - left.count || left.source.localeCompare(right.source))
    .map((group) => Object.freeze({ ...group, evidence: Object.freeze(group.evidence) })));
}

export function createObservationCases(input: Readonly<{
  observedAtMs: number;
  sourceHealth: readonly ObservationSourceHealth[];
  analytics: Readonly<{ state: string; qualityIncomplete: boolean }>;
  incidents: readonly Pick<ReportIncident, 'source' | 'category' | 'screen' | 'count' | 'evidence'>[];
  audit: Readonly<{ state: string }>;
}>): readonly ObservationCase[] {
  const incomplete = input.sourceHealth.some((source) => source.insufficientEvidence);
  const cases: ObservationCase[] = [];
  if (input.analytics.qualityIncomplete || input.analytics.state === 'partial' || input.analytics.state === 'error' || input.analytics.state === 'truncated') {
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
  if (input.audit.state === 'error' || input.audit.state === 'truncated') {
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
