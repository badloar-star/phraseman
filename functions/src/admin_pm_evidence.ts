import * as admin from 'firebase-admin';
import type { DigestWindow } from './admin_digest_contracts';
import {
  DIGEST_SOURCE_REGISTRY,
  readTargetForDigestSource,
  readPaginatedSource,
  type DigestPage,
  type DigestPageInput,
  type DigestPageReader,
  type DigestSourceDefinition,
  type SourceCoverage,
} from './admin_digest_sources';

const DAY_MS = 24 * 60 * 60 * 1000;

export type PmDomain =
  | 'growth_activation'
  | 'learning_engagement'
  | 'revenue'
  | 'quality_support'
  | 'safety_community'
  | 'operations';

export type PmEvidenceWindowKey = 'current' | 'previous' | 'context_7d' | 'context_28d';

export type PmSourceReaderRow = { id?: string; __digestId?: string; [key: string]: unknown };
export type PmSourceReader = DigestPageReader<PmSourceReaderRow>;
export type PmSourceReaderMap = Record<string, PmSourceReader>;

export interface PmContextWindow {
  days: 7 | 28;
  window: DigestWindow;
}

export interface PmEvidenceWindows {
  current: DigestWindow;
  previous: DigestWindow;
  context: PmContextWindow[];
}

export interface PmEvidenceMetric {
  metricId: string;
  sourceId: string;
  domain: PmDomain;
  current: number | null;
  previous: number | null;
  context: Record<'7d' | '28d', number | null>;
  caveats: string[];
}

export interface PmEvidenceItem {
  evidenceId: string;
  metricId: string;
  sourceId: string;
  domain: PmDomain;
  windowKey: PmEvidenceWindowKey;
  value: number;
  codexEntityIds: string[];
  coverageStatus: SourceCoverage['status'];
}

export interface PmEvidenceBundle {
  windows: PmEvidenceWindows;
  metrics: Record<string, PmEvidenceMetric>;
  evidence: PmEvidenceItem[];
  coverage: Record<string, Record<PmEvidenceWindowKey, SourceCoverage>>;
}

export interface CollectProductManagerEvidenceInput {
  window: DigestWindow;
  readers: PmSourceReaderMap;
  sourceIds?: string[];
  pageSize?: number;
  maxPages?: number;
}

function domainFor(source: DigestSourceDefinition): PmDomain {
  switch (source.domain) {
    case 'growth':
      return 'growth_activation';
    case 'learning':
      return 'learning_engagement';
    case 'revenue':
      return 'revenue';
    case 'quality':
    case 'support':
      return 'quality_support';
    case 'safety':
    case 'community':
      return 'safety_community';
    case 'operations':
    default:
      return 'operations';
  }
}

function metricIdFor(source: DigestSourceDefinition): string {
  return `${domainFor(source)}.${source.id}.events`;
}

export function buildPmEvidenceWindows(current: DigestWindow): PmEvidenceWindows {
  const durationMs = current.endMs - current.startMs;
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('PM evidence window must have a finite positive duration.');
  }
  return {
    current,
    previous: { startMs: current.startMs - durationMs, endMs: current.startMs },
    context: [
      { days: 7, window: { startMs: current.endMs - 7 * DAY_MS, endMs: current.endMs } },
      { days: 28, window: { startMs: current.endMs - 28 * DAY_MS, endMs: current.endMs } },
    ],
  };
}

function emptyCoverage(source: DigestSourceDefinition, window: DigestWindow, status: SourceCoverage['status'], errorCode?: string): SourceCoverage {
  return {
    sourceId: source.id,
    status,
    rowCount: 0,
    uniqueCount: 0,
    truncated: false,
    timestampField: source.timestampField || source.timestampType,
    window,
    errorCode,
  };
}

function isUtcDayBoundary(ms: number): boolean {
  return ms % DAY_MS === 0;
}

function applyWindowCaveats(source: DigestSourceDefinition, coverage: SourceCoverage): SourceCoverage {
  if (source.timestampType !== 'day_string') return coverage;
  if (isUtcDayBoundary(coverage.window.startMs) && isUtcDayBoundary(coverage.window.endMs)) return coverage;
  return {
    ...coverage,
    status: coverage.status === 'failed' ? 'failed' : 'partial',
    errorCode: coverage.errorCode || 'calendar_day_granularity_not_exact',
  };
}

function firestoreBound(source: DigestSourceDefinition, ms: number): number | string | admin.firestore.Timestamp {
  if (source.timestampType === 'firestore_timestamp') return admin.firestore.Timestamp.fromMillis(ms);
  if (source.timestampType === 'day_string') return new Date(ms).toISOString().slice(0, 10);
  return ms;
}

function projectPmRow(source: DigestSourceDefinition, doc: FirebaseFirestore.QueryDocumentSnapshot): PmSourceReaderRow {
  const data = doc.data();
  const base = { __digestId: doc.ref.path, id: doc.ref.path };
  if (source.id === 'users') return { ...base, created_at: data.created_at };
  if (source.id === 'progress_events') return { ...base, type: data.type };
  if (source.id === 'paywall_funnel') return { ...base, step: data.step, dev: data.dev === true };
  if (source.id === 'revenuecat_premium_events') return { ...base, eventType: data.eventType, periodType: data.periodType };
  if (source.id === 'app_errors') return { ...base, severity: data.severity };
  if (source.id === 'error_reports') return { ...base, status: data.status };
  return base;
}

export function createFirestorePmSourceReaders(db: admin.firestore.Firestore): PmSourceReaderMap {
  const readers: PmSourceReaderMap = {};
  for (const source of DIGEST_SOURCE_REGISTRY) {
    if (!source.included || source.mode !== 'event' || !source.timestampField) continue;
    const target = readTargetForDigestSource(source);
    const field = source.timestampField;
    if (source.id === 'users') {
      readers[source.id] = async (input: DigestPageInput): Promise<DigestPage<PmSourceReaderRow>> => {
        if (input.cursor) return { rows: [] };
        const variants: Array<[number | string | admin.firestore.Timestamp, number | string | admin.firestore.Timestamp]> = [
          [input.startMs, input.endMs],
          [admin.firestore.Timestamp.fromMillis(input.startMs), admin.firestore.Timestamp.fromMillis(input.endMs)],
          [String(input.startMs), String(input.endMs)],
          [new Date(input.startMs).toISOString(), new Date(input.endMs).toISOString()],
        ];
        const docs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
        for (const [start, end] of variants) {
          let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
          for (let page = 0; page < 100; page += 1) {
            let query = db.collection(target.path).where(field, '>=', start).where(field, '<', end).orderBy(field).limit(input.pageSize);
            if (last) query = query.startAfter(last);
            const snapshot = await query.get();
            snapshot.docs.forEach((doc) => docs.set(doc.ref.path, doc));
            if (snapshot.size < input.pageSize) break;
            last = snapshot.docs[snapshot.docs.length - 1];
            if (page === 99) throw Object.assign(new Error('users pagination limit reached'), { code: 'page_limit_reached' });
          }
        }
        return { rows: [...docs.values()].map((doc) => projectPmRow(source, doc)) };
      };
      continue;
    }
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    readers[source.id] = async (input: DigestPageInput): Promise<DigestPage<PmSourceReaderRow>> => {
      if (!input.cursor) lastDoc = undefined;
      const start = firestoreBound(source, input.startMs);
      const end = source.timestampType === 'day_string'
        ? firestoreBound(source, Math.max(input.startMs, input.endMs - 1))
        : firestoreBound(source, input.endMs);
      let query: FirebaseFirestore.Query = target.kind === 'collectionGroup'
        ? db.collectionGroup(target.path)
        : db.collection(target.path);
      query = source.timestampType === 'day_string'
        ? query.where(field, '>=', start).where(field, '<=', end)
        : query.where(field, '>=', start).where(field, '<', end);
      query = query.orderBy(field).limit(input.pageSize);
      if (lastDoc) query = query.startAfter(lastDoc);
      const snap = await query.get();
      lastDoc = snap.docs[snap.docs.length - 1];
      return {
        rows: snap.docs.map((doc) => projectPmRow(source, doc)),
        nextCursor: snap.size === input.pageSize ? 'next' : undefined,
      };
    };
  }
  return readers;
}

async function readSourceWindow(
  source: DigestSourceDefinition,
  reader: PmSourceReader | undefined,
  window: DigestWindow,
  pageSize: number,
  maxPages: number,
): Promise<{ value?: number; rows: PmSourceReaderRow[]; coverage: SourceCoverage }> {
  if (!source.included) {
    return { rows: [], coverage: emptyCoverage(source, window, 'not_configured', source.exclusionReason || 'source_excluded') };
  }
  if (!reader || source.mode !== 'event' || !source.timestampField) {
    return { rows: [], coverage: emptyCoverage(source, window, 'failed', 'source_adapter_missing') };
  }

  const result = await readPaginatedSource<PmSourceReaderRow>({
    sourceId: source.id,
    timestampField: source.timestampField,
    window,
    pageSize,
    maxPages,
    readPage: (input: DigestPageInput): Promise<DigestPage<PmSourceReaderRow>> => reader(input),
    uniqueKey: (row) => String(row.id || row.__digestId || ''),
  });
  const coverage = applyWindowCaveats(source, result.coverage);
  return {
    rows: result.rows,
    value: coverage.status === 'ok' || coverage.status === 'partial' ? coverage.uniqueCount : undefined,
    coverage,
  };
}

type PmWindowReads = Record<PmEvidenceWindowKey, { value?: number; rows: PmSourceReaderRow[]; coverage: SourceCoverage }>;

function addCuratedProductMetrics(input: {
  metrics: Record<string, PmEvidenceMetric>;
  evidence: PmEvidenceItem[];
  sourceReads: Record<string, PmWindowReads>;
}): void {
  const keys: PmEvidenceWindowKey[] = ['current', 'previous', 'context_7d', 'context_28d'];
  const rows = (sourceId: string, key: PmEvidenceWindowKey) => input.sourceReads[sourceId]?.[key]?.rows || [];
  const ratio = (numerator: number, denominator: number, scale = 100): number | null => denominator > 0 ? (numerator / denominator) * scale : null;
  const learnerId = (row: PmSourceReaderRow) => String(row.id || '').split('/progress_events/')[0];
  const normalizeUserId = (value: string) => value.startsWith('users/') ? value.slice('users/'.length).split('/')[0] : value;
  const activeLearners = (key: PmEvidenceWindowKey) => new Set(rows('progress_events', key).map(learnerId).filter(Boolean)).size;
  const activatedNewUsers = (key: PmEvidenceWindowKey) => {
    const cohort = new Set(rows('users', key).map((row) => normalizeUserId(String(row.id || ''))).filter(Boolean));
    const activated = new Set(rows('progress_events', key).map((row) => normalizeUserId(learnerId(row))).filter((id) => cohort.has(id)));
    return activated.size;
  };

  const add = (definition: {
    metricId: string; sourceId: string; domain: PmDomain; dependencies: string[];
    calculate: (key: PmEvidenceWindowKey) => number | null;
  }) => {
    const available = definition.dependencies.every((sourceId) => !!input.sourceReads[sourceId]
      && input.sourceReads[sourceId].current.coverage.status !== 'failed'
      && input.sourceReads[sourceId].previous.coverage.status !== 'failed');
    if (!available) return;
    const values = Object.fromEntries(keys.map((key) => [key, definition.calculate(key)])) as Record<PmEvidenceWindowKey, number | null>;
    if (values.current === null || values.previous === null) return;
    const caveats = definition.dependencies.flatMap((sourceId) => keys.map((key) => input.sourceReads[sourceId]?.[key]?.coverage)
      .filter((item): item is SourceCoverage => !!item && (item.status !== 'ok' || !!item.errorCode))
      .map((item) => `${item.sourceId}:${item.status}${item.errorCode ? `:${item.errorCode}` : ''}`));
    input.metrics[definition.metricId] = {
      metricId: definition.metricId,
      sourceId: definition.sourceId,
      domain: definition.domain,
      current: values.current,
      previous: values.previous,
      context: { '7d': values.context_7d, '28d': values.context_28d },
      caveats: [...new Set(caveats)],
    };
    for (const key of keys) {
      if (values[key] === null) continue;
      const coverageStatus = definition.dependencies.some((sourceId) => input.sourceReads[sourceId]?.[key]?.coverage.status === 'partial') ? 'partial' : 'ok';
      input.evidence.push({
        evidenceId: `ev:${definition.metricId}.${key}`,
        metricId: definition.metricId,
        sourceId: definition.sourceId,
        domain: definition.domain,
        windowKey: key,
        value: values[key] as number,
        codexEntityIds: [`metric:${definition.metricId}`],
        coverageStatus,
      });
    }
  };

  add({ metricId: 'growth_activation.new_users', sourceId: 'users', domain: 'growth_activation', dependencies: ['users'], calculate: (key) => rows('users', key).length });
  add({ metricId: 'growth_activation.activated_new_users', sourceId: 'users', domain: 'growth_activation', dependencies: ['users', 'progress_events'], calculate: activatedNewUsers });
  add({ metricId: 'growth_activation.activation_rate', sourceId: 'users', domain: 'growth_activation', dependencies: ['users', 'progress_events'], calculate: (key) => ratio(activatedNewUsers(key), rows('users', key).length) });
  add({ metricId: 'learning_engagement.unique_learners', sourceId: 'progress_events', domain: 'learning_engagement', dependencies: ['progress_events'], calculate: activeLearners });
  add({ metricId: 'learning_engagement.lesson_completions', sourceId: 'progress_events', domain: 'learning_engagement', dependencies: ['progress_events'], calculate: (key) => rows('progress_events', key).filter((row) => String(row.type || '').toLowerCase() === 'lesson_complete').length });
  add({ metricId: 'revenue.paywall_shown', sourceId: 'paywall_funnel', domain: 'revenue', dependencies: ['paywall_funnel'], calculate: (key) => rows('paywall_funnel', key).filter((row) => row.dev !== true && row.step === 'shown').length });
  add({ metricId: 'revenue.paywall_cta_rate', sourceId: 'paywall_funnel', domain: 'revenue', dependencies: ['paywall_funnel'], calculate: (key) => ratio(rows('paywall_funnel', key).filter((row) => row.dev !== true && row.step === 'cta_click').length, rows('paywall_funnel', key).filter((row) => row.dev !== true && row.step === 'shown').length) });
  add({ metricId: 'revenue.paywall_purchase_rate', sourceId: 'paywall_funnel', domain: 'revenue', dependencies: ['paywall_funnel'], calculate: (key) => ratio(rows('paywall_funnel', key).filter((row) => row.dev !== true && row.step === 'purchase_completed').length, rows('paywall_funnel', key).filter((row) => row.dev !== true && row.step === 'shown').length) });
  add({ metricId: 'revenue.trial_starts', sourceId: 'revenuecat_premium_events', domain: 'revenue', dependencies: ['revenuecat_premium_events'], calculate: (key) => rows('revenuecat_premium_events', key).filter((row) => String(row.periodType || '').toUpperCase() === 'TRIAL').length });
  add({ metricId: 'revenue.initial_paid_purchases', sourceId: 'revenuecat_premium_events', domain: 'revenue', dependencies: ['revenuecat_premium_events'], calculate: (key) => rows('revenuecat_premium_events', key).filter((row) => ['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE'].includes(String(row.eventType || '').toUpperCase())).length });
  add({ metricId: 'revenue.renewals', sourceId: 'revenuecat_premium_events', domain: 'revenue', dependencies: ['revenuecat_premium_events'], calculate: (key) => rows('revenuecat_premium_events', key).filter((row) => String(row.eventType || '').toUpperCase() === 'RENEWAL').length });
  add({ metricId: 'revenue.refunds', sourceId: 'revenuecat_premium_events', domain: 'revenue', dependencies: ['revenuecat_premium_events'], calculate: (key) => rows('revenuecat_premium_events', key).filter((row) => String(row.eventType || '').toUpperCase() === 'REFUND').length });
  add({ metricId: 'quality_support.errors_per_100_learners', sourceId: 'app_errors', domain: 'quality_support', dependencies: ['app_errors', 'progress_events'], calculate: (key) => ratio(rows('app_errors', key).length, activeLearners(key), 100) });
  add({ metricId: 'quality_support.reports_per_100_learners', sourceId: 'error_reports', domain: 'quality_support', dependencies: ['error_reports', 'progress_events'], calculate: (key) => ratio(rows('error_reports', key).length, activeLearners(key), 100) });
}

export async function collectProductManagerEvidence(input: CollectProductManagerEvidenceInput): Promise<PmEvidenceBundle> {
  const windows = buildPmEvidenceWindows(input.window);
  const wanted = new Set(input.sourceIds || DIGEST_SOURCE_REGISTRY.filter((source) => source.included).map((source) => source.id));
  const sources = DIGEST_SOURCE_REGISTRY.filter((source) => wanted.has(source.id));
  const pageSize = Math.min(Math.max(input.pageSize ?? 500, 1), 1000);
  const maxPages = input.maxPages ?? 20;
  const metrics: Record<string, PmEvidenceMetric> = {};
  const evidence: PmEvidenceItem[] = [];
  const coverage: PmEvidenceBundle['coverage'] = {};
  const sourceReads: Record<string, Record<PmEvidenceWindowKey, { value?: number; rows: PmSourceReaderRow[]; coverage: SourceCoverage }>> = {};

  for (const source of sources) {
    const domain = domainFor(source);
    const metricId = metricIdFor(source);
    const reader = input.readers[source.id];
    const reads = {
      current: await readSourceWindow(source, reader, windows.current, pageSize, maxPages),
      previous: await readSourceWindow(source, reader, windows.previous, pageSize, maxPages),
      context_7d: await readSourceWindow(source, reader, windows.context[0].window, pageSize, maxPages),
      context_28d: await readSourceWindow(source, reader, windows.context[1].window, pageSize, maxPages),
    } satisfies Record<PmEvidenceWindowKey, Awaited<ReturnType<typeof readSourceWindow>>>;
    sourceReads[source.id] = reads;

    coverage[source.id] = {
      current: reads.current.coverage,
      previous: reads.previous.coverage,
      context_7d: reads.context_7d.coverage,
      context_28d: reads.context_28d.coverage,
    };

    for (const [windowKey, read] of Object.entries(reads) as Array<[PmEvidenceWindowKey, typeof reads[PmEvidenceWindowKey]]>) {
      if (typeof read.value !== 'number') continue;
      evidence.push({
        evidenceId: `ev:${metricId}.${windowKey}`,
        metricId,
        sourceId: source.id,
        domain,
        windowKey,
        value: read.value,
        codexEntityIds: [`metric:${metricId}`],
        coverageStatus: read.coverage.status,
      });
    }

    if (reads.current.coverage.status === 'failed' || reads.previous.coverage.status === 'failed') continue;
    if (typeof reads.current.value !== 'number' || typeof reads.previous.value !== 'number') continue;
    metrics[metricId] = {
      metricId,
      sourceId: source.id,
      domain,
      current: reads.current.value,
      previous: reads.previous.value,
      context: {
        '7d': reads.context_7d.value ?? 0,
        '28d': reads.context_28d.value ?? 0,
      },
      caveats: [reads.current.coverage, reads.previous.coverage, reads.context_7d.coverage, reads.context_28d.coverage]
        .filter((item) => item.status !== 'ok' || item.errorCode)
        .map((item) => `${item.sourceId}:${item.status}${item.errorCode ? `:${item.errorCode}` : ''}`),
    };
  }

  addCuratedProductMetrics({ metrics, evidence, sourceReads });

  return { windows, metrics, evidence, coverage };
}
