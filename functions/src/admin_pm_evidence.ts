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
  current: number;
  previous: number;
  context: Record<'7d' | '28d', number>;
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

export function createFirestorePmSourceReaders(db: admin.firestore.Firestore): PmSourceReaderMap {
  const readers: PmSourceReaderMap = {};
  for (const source of DIGEST_SOURCE_REGISTRY) {
    if (!source.included || source.mode !== 'event' || !source.timestampField) continue;
    const target = readTargetForDigestSource(source);
    const field = source.timestampField;
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
        rows: snap.docs.map((doc) => ({ __digestId: doc.ref.path, id: doc.ref.path })),
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
): Promise<{ value?: number; coverage: SourceCoverage }> {
  if (!source.included) {
    return { coverage: emptyCoverage(source, window, 'not_configured', source.exclusionReason || 'source_excluded') };
  }
  if (!reader || source.mode !== 'event' || !source.timestampField) {
    return { coverage: emptyCoverage(source, window, 'failed', 'source_adapter_missing') };
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
    value: coverage.status === 'ok' || coverage.status === 'partial' ? coverage.uniqueCount : undefined,
    coverage,
  };
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

  return { windows, metrics, evidence, coverage };
}
