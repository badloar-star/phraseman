import * as admin from 'firebase-admin';
import { ADMIN_ALERT_IDS, isAdminAlertType, type AdminAlertType } from './admin_alert_catalog';
import { irelandDailyWindow, type DigestWindow } from './admin_alert_digests';
import { revenueAlertFromReceipt } from './admin_alert_sources_revenue';
import type { AdminAlertSafePayload } from './admin_alert_privacy';

const PAGE_SIZE = 500;

/** Page through only selected fields; never retain complete reports or user rows. */
async function visitRows(query: FirebaseFirestore.Query, fields: readonly string[], visit: (row: FirebaseFirestore.DocumentData, id: string) => void): Promise<void> {
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let page = query.select(...fields).limit(PAGE_SIZE);
    if (cursor) page = page.startAfter(cursor);
    const snapshot = await page.get();
    snapshot.docs.forEach((doc) => visit(doc.data(), doc.id));
    if (snapshot.size < PAGE_SIZE) return;
    cursor = snapshot.docs[snapshot.docs.length - 1];
  }
}

function validateWindow(payload: AdminAlertSafePayload): DigestWindow {
  const startMs = Number(payload.windowStartMs);
  const endMs = Number(payload.windowEndMs);
  if (!Number.isSafeInteger(startMs) || !Number.isSafeInteger(endMs) || startMs <= 0 || endMs <= startMs) throw new Error('invalid_daily_digest_window');
  const expected = irelandDailyWindow(endMs);
  if (startMs !== expected.startMs || endMs !== expected.endMs) throw new Error('invalid_daily_digest_window');
  return expected;
}

/** Materialized inside durable delivery: a failed read remains retryable. No AI calls. */
export async function materializeDailyDigestPayload(db: FirebaseFirestore.Firestore, payload: AdminAlertSafePayload): Promise<AdminAlertSafePayload> {
  const window = validateWindow(payload);
  const range = (collection: string, field: string) => db.collection(collection)
    .where(field, '>=', window.startMs).where(field, '<', window.endMs);
  const count = async (query: FirebaseFirestore.Query) => Number((await query.count().get()).data().count);
  const counts = new Map<AdminAlertType, number>(ADMIN_ALERT_IDS.map((id) => [id, 0]));
  const setAtLeast = (type: AdminAlertType, value: number) => counts.set(type, Math.max(counts.get(type) ?? 0, value));
  let ownerSignals = 0;
  await visitRows(range('admin_alert_events', 'occurredAtMs'), ['eventType', 'occurredAtMs'], (row) => {
    if (isAdminAlertType(row.eventType) && row.eventType !== 'ownerDailyDigest') {
      counts.set(row.eventType, (counts.get(row.eventType) ?? 0) + 1);
      ownerSignals++;
    }
  });

  let ordinaryErrors = 0;
  let criticalErrors = 0;
  let revenueEvents = 0;
  let paywallEvents = 0;
  const revenueTypes = new Set<AdminAlertType>(['trialStart', 'premiumPurchase', 'renewal', 'refund']);
  const engagedMessages = new Set<string>();
  const [newUsers, lessonCompletions, activeUsers, surveyResponses] = await Promise.all([
    count(range('users', 'created_at')),
    count(db.collectionGroup('progress_events').where('type', '==', 'lesson_complete')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(window.startMs))
      .where('createdAt', '<', admin.firestore.Timestamp.fromMillis(window.endMs))),
    count(range('users', 'last_active_at')),
    count(range('vip_survey_responses', 'updatedAtMs')),
    Promise.all(['reactionCountUpdatedAtMs', 'readCountUpdatedAtMs', 'pollCountUpdatedAtMs'].map(field =>
      visitRows(range('app_messages', field), [field], (_row, id) => { engagedMessages.add(id); }))),
    visitRows(range('app_errors', 'createdAtMs'), ['severity', 'createdAtMs'], (row) => {
      if (String(row.severity ?? '').trim().toLowerCase() === 'critical') criticalErrors++;
      else ordinaryErrors++;
    }),
    visitRows(range('revenuecat_premium_events', 'eventTimestampMs'), ['eventType', 'periodType', 'eventTimestampMs'], (row, id) => {
      const event = revenueAlertFromReceipt({receiptId: id, data: row, nowMs: window.endMs});
      if (event && revenueTypes.has(event.eventType)) revenueEvents++;
    }),
    visitRows(range('paywall_funnel', 'ts'), ['dev', 'ts'], (row) => { if (row.dev !== true) paywallEvents++; }),
  ]);
  setAtLeast('newUser', newUsers);
  setAtLeast('lessonCompletionDigest', lessonCompletions);
  setAtLeast('activityDigest', activeUsers);
  setAtLeast('surveyDigest', surveyResponses);
  setAtLeast('appMessageDigest', engagedMessages.size);
  setAtLeast('appErrorDigest', ordinaryErrors);
  setAtLeast('criticalError', criticalErrors);
  setAtLeast('paywallDigest', paywallEvents);
  setAtLeast('revenueDigest', Math.max(revenueEvents, [...revenueTypes].reduce((sum, type) => sum + (counts.get(type) ?? 0), 0)));

  return {
    ...payload, count: ownerSignals,
    metrics: ADMIN_ALERT_IDS.filter((type) => type !== 'ownerDailyDigest').map((eventType) => ({
      eventType, count: counts.get(eventType) ?? 0,
      // Official Card Pack saves/purchases are local-only, not Community Pack sales.
      // Do not claim a true zero by counting an unrelated collection.
      ...(eventType === 'cardPackDigest' ? {available: false} : {}),
    })),
  };
}
