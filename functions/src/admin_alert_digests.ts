import * as admin from 'firebase-admin';
import { Temporal } from '@js-temporal/polyfill';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { enqueueAdminAlert, type EnqueueAdminAlertInput } from './admin_alert_outbox';
import type { AdminAlertDigestMetric } from './admin_alert_privacy';

const REGION = 'europe-west1';
const IRELAND_TIME_ZONE = 'Europe/Dublin';

export interface DigestWindow {
  readonly key: string;
  readonly startMs: number;
  readonly endMs: number;
}

/** Latest completed Ireland-local 20:00 boundary and its preceding calendar day. */
export function irelandDailyWindow(nowMs: number): DigestWindow {
  if (!Number.isFinite(nowMs) || nowMs <= 0) throw new Error('invalid_digest_now');
  const now = Temporal.Instant.fromEpochMilliseconds(Math.floor(nowMs)).toZonedDateTimeISO(IRELAND_TIME_ZONE);
  let end = now.with({ hour: 20, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });
  if (Temporal.ZonedDateTime.compare(end, now) > 0) end = end.subtract({ days: 1 });
  const start = end.subtract({ days: 1 });
  return Object.freeze({
    key: end.toPlainDate().toString(),
    startMs: start.epochMilliseconds,
    endMs: end.epochMilliseconds,
  });
}

export interface DailyDigestCounts {
  readonly metrics: readonly AdminAlertDigestMetric[];
  readonly totalOwnerSignals: number;
}

export function buildDailyDigestAlert(window: DigestWindow, counts: DailyDigestCounts): EnqueueAdminAlertInput {
  return Object.freeze({
    eventType: 'ownerDailyDigest',
    source: 'digest.daily_ireland',
    sourceId: `${window.key}:ownerDailyDigest`,
    occurredAtMs: window.endMs - 1,
    payload: Object.freeze({
      count: counts.totalOwnerSignals,
      windowStartMs: window.startMs,
      windowEndMs: window.endMs,
      metrics: counts.metrics,
      route: '#alerts',
    }),
  });
}

export const adminAlertDailyDigestsCron = onSchedule(
  { schedule: '0 20 * * *', timeZone: IRELAND_TIME_ZONE, region: REGION, retryCount: 3 },
  async (event) => {
    const db = admin.firestore();
    const scheduledAtMs = Date.parse(event.scheduleTime);
    const nowMs = Date.now();
    // Scheduler RunJob may send the NEXT scheduled time. Never claim a future
    // day's idempotency key; delayed normal attempts still keep their old window.
    const window = irelandDailyWindow(Number.isFinite(scheduledAtMs) ? Math.min(scheduledAtMs, nowMs) : nowMs);
    // Persist the scheduled window first. Aggregation happens in the durable
    // dispatcher; exhausted Scheduler retries can no longer erase the report.
    await enqueueAdminAlert(db, buildDailyDigestAlert(window, {metrics: [], totalOwnerSignals: 0}));
  },
);
