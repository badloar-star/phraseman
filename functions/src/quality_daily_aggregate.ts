import { createHash } from 'node:crypto';

export const QUALITY_DAILY_COLLECTION = 'jarvis_quality_daily';
export const QUALITY_DAILY_SCHEMA_VERSION = 1 as const;

export type QualityReportKind = 'user_report' | 'error_report' | 'app_error';
export type QualityReportSource = 'user_reports' | 'error_reports' | 'app_errors';
export type QualityAffectedUserBucket = '0' | '1' | '2-4' | '5-9' | '10-24' | '25-49' | '50+';

export interface QualityDailyDimensions {
  readonly build: string;
  readonly platform: string;
  readonly category: string;
  readonly screen: string;
}

export interface QualityMetricFields<TIncrement = unknown> {
  readonly increment: (value: number) => TIncrement;
  readonly serverTimestamp: () => unknown;
}

export interface PreparedQualityDailyAggregate<TIncrement = unknown> {
  readonly recorded: true;
  readonly aggregateRef: FirebaseFirestore.DocumentReference;
  readonly userMarkerRef: FirebaseFirestore.DocumentReference;
  readonly metaRef: FirebaseFirestore.DocumentReference;
  readonly aggregateWrite: Readonly<Record<string, unknown> & {
    readonly eventCount: TIncrement;
    readonly affectedUserCount: TIncrement;
  }>;
  readonly userMarkerWrite: Readonly<Record<string, unknown>>;
  readonly metaWrite: Readonly<Record<string, unknown>>;
  readonly createUserMarker: boolean;
  readonly createMeta: boolean;
}

export interface PrepareQualityDailyAggregateInput<TIncrement = unknown> {
  readonly db: FirebaseFirestore.Firestore;
  readonly tx: FirebaseFirestore.Transaction;
  readonly kind: QualityReportKind;
  readonly reportDoc: Readonly<Record<string, unknown>>;
  readonly stableUid: string;
  readonly nowMs: number;
  readonly fields: QualityMetricFields<TIncrement>;
}

const KIND_TO_SOURCE: Readonly<Record<QualityReportKind, QualityReportSource>> = Object.freeze({
  user_report: 'user_reports',
  error_report: 'error_reports',
  app_error: 'app_errors',
});

function safeDimension(value: unknown, fallback = 'unknown'): string {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^[a-z0-9][a-z0-9._:-]{0,59}$/.test(normalized) ? normalized : fallback;
}

function safePlatform(value: unknown): string {
  const normalized = safeDimension(value);
  return ['android', 'ios', 'web'].includes(normalized) ? normalized : 'unknown';
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function qualityUtcDayKey(nowMs: number): string {
  if (!Number.isFinite(nowMs)) throw new Error('quality_daily_invalid_time');
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function qualityUtcDayStartMs(nowMs: number): number {
  return Date.parse(`${qualityUtcDayKey(nowMs)}T00:00:00.000Z`);
}

export function qualityAffectedUserBucket(count: number): QualityAffectedUserBucket {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('quality_daily_invalid_user_count');
  if (count === 0) return '0';
  if (count === 1) return '1';
  if (count <= 4) return '2-4';
  if (count <= 9) return '5-9';
  if (count <= 24) return '10-24';
  if (count <= 49) return '25-49';
  return '50+';
}

export function buildQualityDailyDimensions(
  kind: QualityReportKind,
  reportDoc: Readonly<Record<string, unknown>>,
): QualityDailyDimensions {
  const categoryValue = kind === 'user_report'
    ? reportDoc.reason
    : kind === 'app_error'
      ? reportDoc.feature
      : reportDoc.category;
  return Object.freeze({
    build: safeDimension(reportDoc.buildNumber, safeDimension(reportDoc.appVersion)),
    platform: safePlatform(reportDoc.platform),
    category: safeDimension(categoryValue),
    screen: safeDimension(reportDoc.screen),
  });
}

export function isQualityReportKind(kind: string): kind is QualityReportKind {
  return Object.prototype.hasOwnProperty.call(KIND_TO_SOURCE, kind);
}

export async function prepareQualityDailyAggregate<TIncrement>(
  input: PrepareQualityDailyAggregateInput<TIncrement>,
): Promise<PreparedQualityDailyAggregate<TIncrement>> {
  const stableUid = input.stableUid.trim();
  if (!stableUid) throw new Error('quality_daily_uid_required');
  const dayKey = qualityUtcDayKey(input.nowMs);
  const sourceId = KIND_TO_SOURCE[input.kind];
  const dimensions = buildQualityDailyDimensions(input.kind, input.reportDoc);
  const bucketId = sha256(JSON.stringify([dayKey, sourceId, dimensions]));
  const dayRef = input.db.collection(QUALITY_DAILY_COLLECTION).doc(dayKey);
  const aggregateRef = dayRef.collection('sources').doc(sourceId).collection('buckets').doc(bucketId);
  const userMarkerId = sha256(`jarvis-quality-daily-user-v1\0${bucketId}\0${stableUid}`);
  const userMarkerRef = aggregateRef.collection('affected_users').doc(userMarkerId);
  const metaRef = input.db.collection(QUALITY_DAILY_COLLECTION).doc('_meta');
  const metaSnap = await input.tx.get(metaRef);
  const userMarkerSnap = await input.tx.get(userMarkerRef);
  const createUserMarker = !userMarkerSnap.exists;
  const timestamp = input.fields.serverTimestamp();

  return Object.freeze({
    recorded: true as const,
    aggregateRef,
    userMarkerRef,
    metaRef,
    aggregateWrite: Object.freeze({
      schemaVersion: QUALITY_DAILY_SCHEMA_VERSION,
      sourceId,
      dayKey,
      ...dimensions,
      eventCount: input.fields.increment(1),
      affectedUserCount: input.fields.increment(createUserMarker ? 1 : 0),
      lastObservedAtMs: input.nowMs,
      updatedAt: timestamp,
    }),
    userMarkerWrite: Object.freeze({
      schemaVersion: QUALITY_DAILY_SCHEMA_VERSION,
      dayKey,
      sourceId,
      createdAtMs: input.nowMs,
      createdAt: timestamp,
    }),
    metaWrite: Object.freeze({
      schemaVersion: QUALITY_DAILY_SCHEMA_VERSION,
      activatedAtMs: input.nowMs,
      activatedAt: timestamp,
    }),
    createUserMarker,
    createMeta: !metaSnap.exists,
  });
}

export function commitPreparedQualityDailyAggregate(
  tx: FirebaseFirestore.Transaction,
  prepared: PreparedQualityDailyAggregate,
): void {
  if (prepared.createMeta) tx.create(prepared.metaRef, prepared.metaWrite);
  if (prepared.createUserMarker) tx.create(prepared.userMarkerRef, prepared.userMarkerWrite);
  tx.set(prepared.aggregateRef, prepared.aggregateWrite, { merge: true });
}
