import { Temporal } from '@js-temporal/polyfill';

export const DECISION_PACK_FILE_NAMES = [
  'manifest.json',
  'metric_dictionary.csv',
  'executive_kpis.csv',
  'daily_timeseries.csv',
  'acquisition_activation.csv',
  'retention_cohorts.csv',
  'learning_outcomes.csv',
  'content_diagnostics.csv',
  'feature_adoption.csv',
  'paywall_funnels.csv',
  'subscriptions_revenue.csv',
  'experiments.csv',
  'notifications_referrals.csv',
  'social_features.csv',
  'reliability_releases.csv',
  'feedback_support.csv',
  'data_quality.csv',
  'notable_changes.json',
] as const;

export type DecisionPackFileName = typeof DECISION_PACK_FILE_NAMES[number];
export type DecisionPackSourceStatus = 'available' | 'unavailable' | 'partial' | 'truncated_not_decision_grade';

export interface MonthlyReportingWindow {
  timezone: string;
  month: string;
  preliminary: boolean;
  startMs: number;
  endExclusiveMs: number;
  asOfMs: number;
  baselineStartMs: number;
  baselineEndExclusiveMs: number;
  baselineMonths: string[];
}

export interface DecisionPackSource {
  id: string;
  status: DecisionPackSourceStatus;
  reason?: string;
  dataThroughMs?: number;
  analysisCutoffMs?: number;
  queryAsOfMs?: number;
  rowCount?: number;
  rowCap?: number;
}

type Cell = string | number | boolean | null | undefined;
type PackRow = Record<string, Cell>;

export interface DecisionPackInput {
  window: MonthlyReportingWindow;
  generatedAtMs: number;
  sources: DecisionPackSource[];
  sections?: Partial<Record<SectionId, PackRow[]>>;
  notableChanges?: { type: string; id: string; occurred_at: string }[];
}

type SectionId =
  | 'metric_dictionary' | 'executive_kpis' | 'daily_timeseries' | 'acquisition_activation'
  | 'retention_cohorts' | 'learning_outcomes' | 'content_diagnostics' | 'feature_adoption'
  | 'paywall_funnels' | 'subscriptions_revenue' | 'experiments' | 'notifications_referrals'
  | 'social_features' | 'reliability_releases' | 'feedback_support' | 'data_quality';

interface SectionSchema {
  file: Exclude<DecisionPackFileName, 'manifest.json' | 'notable_changes.json'>;
  source: string;
  columns: readonly string[];
}

const SECTION_SCHEMAS: Record<SectionId, SectionSchema> = {
  metric_dictionary: { file: 'metric_dictionary.csv', source: 'governed_contract', columns: ['metric_id', 'definition', 'entity', 'unit', 'coverage', 'decision_grade'] },
  executive_kpis: { file: 'executive_kpis.csv', source: 'firebase_analytics', columns: ['scope', 'metric_id', 'value', 'denominator', 'status'] },
  daily_timeseries: { file: 'daily_timeseries.csv', source: 'firebase_analytics', columns: ['scope', 'date', 'metric_id', 'value', 'denominator', 'status'] },
  acquisition_activation: { file: 'acquisition_activation.csv', source: 'firebase_analytics', columns: ['scope', 'channel', 'stage', 'app_instances', 'rate', 'denominator', 'status'] },
  retention_cohorts: { file: 'retention_cohorts.csv', source: 'firebase_analytics', columns: ['scope', 'cohort', 'day', 'eligible_instances', 'returned_instances', 'rate', 'denominator', 'status'] },
  learning_outcomes: { file: 'learning_outcomes.csv', source: 'firebase_analytics', columns: ['scope', 'metric_id', 'value', 'denominator', 'delay_bucket', 'status'] },
  content_diagnostics: { file: 'content_diagnostics.csv', source: 'firebase_analytics', columns: ['scope', 'diagnostic_group', 'answers', 'accuracy', 'denominator', 'status'] },
  feature_adoption: { file: 'feature_adoption.csv', source: 'firebase_analytics', columns: ['scope', 'feature', 'app_instances', 'sessions', 'rate', 'denominator', 'status'] },
  paywall_funnels: { file: 'paywall_funnels.csv', source: 'firebase_analytics', columns: ['scope', 'context', 'source', 'impressions', 'attempts', 'purchases', 'rate', 'denominator', 'status'] },
  subscriptions_revenue: { file: 'subscriptions_revenue.csv', source: 'revenuecat_webhooks', columns: ['scope', 'metric_id', 'unit', 'currency', 'value', 'value_micros', 'chains', 'denominator', 'coverage', 'status'] },
  experiments: { file: 'experiments.csv', source: 'firebase_analytics', columns: ['scope', 'experiment_id', 'definition_version', 'variant_id', 'exposures', 'app_instances', 'denominator', 'status'] },
  notifications_referrals: { file: 'notifications_referrals.csv', source: 'notifications_referrals', columns: ['scope', 'surface', 'metric_id', 'value', 'denominator', 'status'] },
  social_features: { file: 'social_features.csv', source: 'social_features', columns: ['scope', 'feature', 'metric_id', 'value', 'denominator', 'status'] },
  reliability_releases: { file: 'reliability_releases.csv', source: 'firebase_analytics', columns: ['scope', 'app_version', 'build_number', 'platform', 'metric_id', 'value', 'denominator', 'status'] },
  feedback_support: { file: 'feedback_support.csv', source: 'feedback_support', columns: ['scope', 'category', 'reports', 'resolved', 'denominator', 'status'] },
  data_quality: { file: 'data_quality.csv', source: 'firebase_analytics', columns: ['scope', 'source', 'metric_id', 'value', 'denominator', 'status'] },
};

const SMALL_CELL_THRESHOLD = 10;
export const DECISION_PACK_TOTAL_ROW_CAP = 50_000;
const FORBIDDEN_KEY = /(^|_)(email|phone|name|uid|user_id|device_id|advertising_id|raw|text|message|answer|phrase|transaction_id)($|_)/i;
const EMAIL_LIKE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_LIKE = /(?:^|\s)\+?\d[\d ()-]{7,}\d(?:$|\s)/;

function yearMonth(value: Temporal.PlainYearMonth): string {
  return `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}`;
}

function monthStartInstantMs(month: Temporal.PlainYearMonth, timezone: string): number {
  return month.toPlainDate({ day: 1 }).toZonedDateTime({ timeZone: timezone, plainTime: Temporal.PlainTime.from('00:00') }).toInstant().epochMilliseconds;
}

export function resolveMonthlyReportingWindow(input: { timezone: string; month?: string; asOfMs?: number }): MonthlyReportingWindow {
  const timezone = String(input.timezone || '').trim();
  if (!timezone) throw new Error('timezone_required');
  try { Temporal.Now.zonedDateTimeISO(timezone); } catch { throw new Error('invalid_timezone'); }
  const asOfMs = input.asOfMs ?? Date.now();
  const asOf = Temporal.Instant.fromEpochMilliseconds(asOfMs).toZonedDateTimeISO(timezone);
  const current = Temporal.PlainYearMonth.from({ year: asOf.year, month: asOf.month });
  let selected: Temporal.PlainYearMonth;
  if (input.month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)) throw new Error('invalid_month');
    selected = Temporal.PlainYearMonth.from(input.month);
  } else {
    selected = current.subtract({ months: 1 });
  }
  if (Temporal.PlainYearMonth.compare(selected, current) > 0) throw new Error('future_month');
  const preliminary = Temporal.PlainYearMonth.compare(selected, current) === 0;
  const startMs = monthStartInstantMs(selected, timezone);
  const endExclusiveMs = preliminary ? asOfMs : monthStartInstantMs(selected.add({ months: 1 }), timezone);
  const baselineStart = selected.subtract({ months: 12 });
  const baselineMonths = Array.from({ length: 12 }, (_, index) => yearMonth(baselineStart.add({ months: index })));
  return {
    timezone,
    month: yearMonth(selected),
    preliminary,
    startMs,
    endExclusiveMs,
    asOfMs,
    baselineStartMs: monthStartInstantMs(baselineStart, timezone),
    baselineEndExclusiveMs: startMs,
    baselineMonths,
  };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, canonical(child)]));
  }
  return value;
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(canonical(value), null, 2)}\n`;
}

function assertSafeValue(key: string, value: Cell): void {
  if (FORBIDDEN_KEY.test(key) || (typeof value === 'string' && (EMAIL_LIKE.test(value) || PHONE_LIKE.test(value) || value.length > 240 || /[\r\n]/.test(value)))) {
    throw new Error('pii_or_free_text_detected');
  }
}

function csvCell(value: Cell): string {
  if (value == null) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function normalizeRows(rows: PackRow[], columns: readonly string[]): PackRow[] {
  return rows.map((row) => {
    for (const [key, value] of Object.entries(row)) assertSafeValue(key, value);
    const denominator = Number(row.denominator);
    const suppressed = Number.isFinite(denominator) && denominator >= 0 && denominator < SMALL_CELL_THRESHOLD;
    return Object.fromEntries(columns.map((column) => {
      if (column === 'status' && suppressed) return [column, 'suppressed_small_sample'];
      if (suppressed && typeof row[column] === 'number') return [column, null];
      return [column, row[column] ?? (column === 'status' ? 'available' : null)];
    }));
  }).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function csv(columns: readonly string[], rows: PackRow[]): string {
  return `${[columns.join(','), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))].join('\n')}\n`;
}

function sourceMap(sources: DecisionPackSource[]): Record<string, DecisionPackSource> {
  return Object.fromEntries([...sources].sort((a, b) => a.id.localeCompare(b.id)).map((source) => [source.id, source]));
}

function unavailableRow(columns: readonly string[], source?: DecisionPackSource): PackRow {
  return Object.fromEntries(columns.map((column) => {
    if (column === 'scope') return [column, 'reporting_month'];
    if (column === 'source') return [column, source?.id ?? 'not_configured'];
    if (column === 'status') return [column, source?.status ?? 'unavailable'];
    if (column === 'metric_id') return [column, source?.reason ?? 'source_unavailable'];
    return [column, null];
  }));
}

export function buildMonthlyDecisionPackFiles(input: DecisionPackInput): Record<DecisionPackFileName, string> {
  const sources = sourceMap(input.sources);
  const sections = input.sections ?? {};
  const totalRows = Object.values(sections).reduce((sum, rows) => sum + (rows?.length ?? 0), 0);
  if (totalRows > DECISION_PACK_TOTAL_ROW_CAP) throw new Error('decision_pack_row_limit');
  for (const rows of Object.values(sections)) {
    for (const row of rows ?? []) for (const [key, value] of Object.entries(row)) assertSafeValue(key, value);
  }
  for (const change of input.notableChanges ?? []) {
    for (const [key, value] of Object.entries(change)) assertSafeValue(key, value);
  }
  const files = {} as Record<DecisionPackFileName, string>;
  const releaseContext = [...new Set((sections.reliability_releases ?? []).map((row) => `${String(row.app_version ?? 'unknown')}:${String(row.build_number ?? 'unknown')}`))].sort();
  const experimentContext = [...new Set((sections.experiments ?? []).map((row) => String(row.experiment_id ?? '')).filter(Boolean))].sort();
  const manifest = {
    schema_version: 1,
    generated_at: new Date(input.generatedAtMs).toISOString(),
    reporting_window: {
      timezone: input.window.timezone,
      month: input.window.month,
      preliminary: input.window.preliminary,
      start: new Date(input.window.startMs).toISOString(),
      end_exclusive: new Date(input.window.endExclusiveMs).toISOString(),
      as_of: new Date(input.window.asOfMs).toISOString(),
    },
    baseline: {
      definition: 'twelve_complete_calendar_months_before_reporting_month',
      months: input.window.baselineMonths,
      start: new Date(input.window.baselineStartMs).toISOString(),
      end_exclusive: new Date(input.window.baselineEndExclusiveMs).toISOString(),
    },
    privacy: { aggregate_only: true, small_cell_threshold: SMALL_CELL_THRESHOLD, raw_events_included: false, free_text_included: false },
    suppression: { policy: 'counts_and_dependent_rates_hidden_when_denominator_below_threshold', threshold: SMALL_CELL_THRESHOLD },
    truncation: { any_source_not_decision_grade: input.sources.some((source) => source.status === 'truncated_not_decision_grade') },
    context: {
      schema_changes: [{ schema: 'monthly_decision_pack', version: 1 }],
      releases_observed: releaseContext,
      experiments_observed: experimentContext,
      campaigns: { status: 'unavailable_no_governed_campaign_registry' },
    },
    missing_sources_are_zero: false,
    sources,
    files: DECISION_PACK_FILE_NAMES,
  };
  files['manifest.json'] = stableJson(manifest);
  for (const [sectionId, schema] of Object.entries(SECTION_SCHEMAS) as [SectionId, SectionSchema][]) {
    const source = sources[schema.source];
    const supplied = sections[sectionId] ?? [];
    const decisionGrade = !source || source.status === 'unavailable' || source.status === 'truncated_not_decision_grade'
      ? [unavailableRow(schema.columns, source)]
      : supplied.length ? normalizeRows(supplied, schema.columns) : [unavailableRow(schema.columns, { ...source, status: 'partial', reason: 'no_rows' })];
    files[schema.file] = csv(schema.columns, decisionGrade);
  }
  files['notable_changes.json'] = stableJson({
    changes: input.notableChanges ?? [],
    status: input.notableChanges == null
      ? 'unavailable_no_governed_change_registry'
      : input.notableChanges.length > 0 ? 'available' : 'none_recorded',
  });
  return Object.fromEntries(DECISION_PACK_FILE_NAMES.map((name) => [name, files[name]])) as Record<DecisionPackFileName, string>;
}
