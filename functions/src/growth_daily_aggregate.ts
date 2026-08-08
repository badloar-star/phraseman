import * as admin from 'firebase-admin';

export const GROWTH_DAILY_COLLECTION = 'jarvis_growth_daily';
export const GROWTH_DAILY_SCHEMA_VERSION = 1 as const;
export const GROWTH_DAILY_SOURCE = 'authEnsureStableLink:first_auth_link' as const;

interface IncrementFactory<TIncrement = unknown> {
  readonly increment: (value: number) => TIncrement;
}

export function utcDayKey(nowMs: number): string {
  if (!Number.isFinite(nowMs)) throw new Error('growth_daily_invalid_time');
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function utcDayStartMs(nowMs: number): number {
  return Date.parse(`${utcDayKey(nowMs)}T00:00:00.000Z`);
}

export function buildGrowthDailyAggregateWrite<TIncrement>(
  nowMs: number,
  transforms: IncrementFactory<TIncrement>,
): Readonly<{
  dayKey: string;
  schemaVersion: typeof GROWTH_DAILY_SCHEMA_VERSION;
  newUsers: TIncrement;
  lastObservedAtMs: number;
  source: typeof GROWTH_DAILY_SOURCE;
}> {
  return Object.freeze({
    dayKey: utcDayKey(nowMs),
    schemaVersion: GROWTH_DAILY_SCHEMA_VERSION,
    newUsers: transforms.increment(1),
    lastObservedAtMs: nowMs,
    source: GROWTH_DAILY_SOURCE,
  });
}

/**
 * Adds aggregate writes to the same transaction that creates the first auth_link.
 * auth_links/{authUid} is the idempotency marker; callers must invoke this only
 * when the transaction read proved that auth link absent.
 */
export function writeFirstAuthLinkGrowthAggregate(
  db: admin.firestore.Firestore,
  transaction: admin.firestore.Transaction,
  nowMs: number,
): void {
  const dailyRef = db.collection(GROWTH_DAILY_COLLECTION).doc(utcDayKey(nowMs));
  transaction.set(
    dailyRef,
    buildGrowthDailyAggregateWrite(nowMs, admin.firestore.FieldValue),
    { merge: true },
  );
}
