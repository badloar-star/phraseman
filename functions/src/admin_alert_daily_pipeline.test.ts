import * as admin from 'firebase-admin';
import { adminAlertDailyDigestsCron } from './admin_alert_digests';
import { FirestoreAdminAlertDeliveryStore, dispatchAdminAlertEvent } from './admin_alert_dispatcher';
import { materializeDailyDigestPayload } from './admin_alert_daily_counts';

jest.mock('firebase-admin', () => ({ firestore: Object.assign(jest.fn(), { Timestamp: { fromMillis: (value: number) => value } }) }));

type Row = Record<string, unknown>;
function database() {
  const rows = new Map<string, Row>();
  const snap = (path: string) => ({ id: path.split('/').at(-1)!, exists: rows.has(path), data: () => rows.get(path) ?? {} });
  const doc = (path: string) => ({ path, get: async () => snap(path),
    create: async (data: Row) => { if (rows.has(path)) throw { code: 6 }; rows.set(path, data); },
    set: async (data: Row) => { rows.set(path, { ...rows.get(path), ...data }); },
  });
  const query = (name: string, filters: Array<[string, string, unknown]> = [], max = Infinity, cursor?: string, fields?: string[]): any => {
    const matched = () => [...rows].filter(([path, data]) => path.split('/').at(-2) === name
      && filters.every(([field, op, value]) => {
        const actual = data[field];
        if (actual === undefined || typeof actual !== typeof value) return false;
        if (op === '==') return actual === value;
        if (op === '>=') return (actual as number) >= (value as number);
        if (op === '<=') return (actual as number) <= (value as number);
        return (actual as number) < (value as number);
      })).map(([path]) => ({...snap(path), data: () => fields ? Object.fromEntries(fields.filter(key => key in (rows.get(path) || {})).map(key => [key, rows.get(path)?.[key]])) : rows.get(path) || {}}));
    return { doc: (id: string) => doc(`${name}/${id}`),
      where: (field: string, op: string, value: unknown) => query(name, [...filters, [field, op, value]], max, cursor, fields),
      limit: (value: number) => query(name, filters, value, cursor, fields),
      select: (...selected: string[]) => query(name, filters, max, cursor, selected),
      startAfter: (last: {id: string; data: () => Row}) => {
        for (const [field, op] of filters) if (op !== '==' && !(field in last.data())) throw new Error(`cursor_missing_${field}`);
        return query(name, filters, max, last.id, fields);
      },
      count: () => ({ get: async () => ({ data: () => ({count: matched().length}) }) }),
      get: async () => { const all = matched(); const start = cursor ? all.findIndex(row => row.id === cursor) + 1 : 0;
        const docs = all.slice(start, start + max); return {docs, size: docs.length, empty: docs.length === 0}; },
    };
  };
  return { rows, db: { doc, collection: (name: string) => query(name), collectionGroup: (name: string) => query(name),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({get: (ref: ReturnType<typeof doc>) => ref.get(), set: (ref: ReturnType<typeof doc>, data: Row) => ref.set(data)}),
  }};
}

test('daily pipeline includes lesson completions after more than 5000 other progress events', async () => {
  const {rows, db} = database();
  const end = Date.parse('2026-09-12T19:00:00Z');
  rows.set('admin_config/alerts', {enabled: true, chatId: '123456'});
  for (let index = 0; index < 5200; index++) rows.set(`users/u1/progress_events/e${index}`, {
    type: index < 5100 ? 'exercise_complete' : 'lesson_complete', createdAt: end - 1000,
  });
  (admin.firestore as unknown as jest.Mock).mockReturnValue(db);
  await adminAlertDailyDigestsCron.run({scheduleTime: '2026-09-12T19:00:00Z'});
  const messages: string[] = [];
  await dispatchAdminAlertEvent({eventId: 'digest.daily_ireland:2026-09-12:ownerDailyDigest', botToken: 'test',
    store: new FirestoreAdminAlertDeliveryStore(db as never), transport: async ({text}) => {
      messages.push(text); return {status: 200, body: {ok: true, result: {message_id: 12}}};
    },
  });
  expect(messages).toHaveLength(1);
  expect(messages[0]).toContain('Завершения уроков: <b>100</b>');
  expect(messages[0]).not.toContain('Всего событий:');
});

test('daily source paging retains Firestore cursor fields beyond 500 rows', async () => {
  const {rows, db} = database();
  const end = Date.parse('2026-09-12T19:00:00Z');
  for (let index = 0; index < 501; index++) {
    rows.set(`admin_alert_events/a${index}`, {eventType: 'newUser', occurredAtMs: end - 1000});
    rows.set(`app_errors/e${index}`, {severity: 'warning', createdAtMs: end - 1000});
    rows.set(`revenuecat_premium_events/r${index}`, {eventType: 'INITIAL_PURCHASE', periodType: 'NORMAL', eventTimestampMs: end - 1000});
    rows.set(`paywall_funnel/p${index}`, {dev: false, ts: end - 1000});
  }
  const payload = await materializeDailyDigestPayload(db as never, {windowStartMs: end - 86400000, windowEndMs: end});
  for (const eventType of ['newUser', 'appErrorDigest', 'revenueDigest', 'paywallDigest']) expect(payload.metrics?.find(metric => metric.eventType === eventType)?.count).toBe(501);
});

test('daily app-message metric preserves reads, polls and reactions as distinct engaged messages', async () => {
  const {rows, db} = database();
  const end = Date.parse('2026-09-12T19:00:00Z');
  rows.set('app_messages/read', {readCountUpdatedAtMs: end - 1000});
  rows.set('app_messages/poll', {pollCountUpdatedAtMs: end - 1000});
  rows.set('app_messages/mixed', {readCountUpdatedAtMs: end - 1000, reactionCountUpdatedAtMs: end - 1000});
  const payload = await materializeDailyDigestPayload(db as never, {windowStartMs: end - 86400000, windowEndMs: end});
  expect(payload.metrics?.find(metric => metric.eventType === 'appMessageDigest')?.count).toBe(3);
});

test('daily materialization lease covers the full 180-second function timeout', async () => {
  const {rows, db} = database();
  const now = Date.now();
  rows.set('admin_alert_events/digest1', {eventType: 'ownerDailyDigest', status: 'pending', occurredAtMs: now, payload: {}});
  await new FirestoreAdminAlertDeliveryStore(db as never).claim('digest1', now);
  expect(Number(rows.get('admin_alert_events/digest1')?.leaseUntilMs) - now).toBeGreaterThanOrEqual(180000);
});
