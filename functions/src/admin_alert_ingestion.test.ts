import * as admin from 'firebase-admin';
import {adminAlertOnContentReport, adminAlertOnUserReport, adminAlertOnCriticalError, adminAlertOnAuthFailureSpike, adminAlertOnUgcRefund, adminAlertOnCronHeartbeat} from './admin_alerts';
import {adminAlertOnUserIdeaReport} from './user_idea_reports';

jest.mock('firebase-admin', () => ({firestore: Object.assign(jest.fn(), {FieldValue: {serverTimestamp: () => 1, increment: (value: number) => value}})}));
const NOW = Date.now();
function database() {
  const rows = new Map<string, Record<string, any>>([['admin_config/alerts', {enabled: true, chatId: '123', spikePerHour: 2}]]);
  let configFails = false;
  let queueFails = false;
  let transactionTail = Promise.resolve();
  const ref = (path: string) => ({path,
    get: async () => {if (configFails && path === 'admin_config/alerts') throw new Error('config_offline'); return {exists: rows.has(path), data: () => rows.get(path) || {}};},
    create: async (value: Record<string, any>) => {if (queueFails) throw new Error('queue_offline'); if (rows.has(path)) throw {code: 6}; rows.set(path, value);},
    set: async (value: Record<string, any>) => {rows.set(path, {...rows.get(path), ...value});},
  });
  const query = (name: string): any => ({doc: (id: string) => ref(`${name}/${id}`), where: () => query(name), count: () => ({get: async () => ({data: () => ({count: 2})})})});
  const db = {doc: ref, collection: query,
    runTransaction: async (fn: (tx: any) => Promise<any>) => {
      const previous = transactionTail;
      let release!: () => void;
      transactionTail = new Promise<void>(resolve => {release = resolve;});
      await previous;
      try {
      const writes: Array<() => void> = [];
      const result = await fn({get: (r: ReturnType<typeof ref>) => r.get(),
        create: (r: ReturnType<typeof ref>, value: any) => {if (queueFails && r.path.startsWith('admin_alert_events/')) throw new Error('queue_offline'); writes.push(() => rows.set(r.path, value));},
        set: (r: ReturnType<typeof ref>, value: any) => {writes.push(() => rows.set(r.path, {...rows.get(r.path), ...value}));},
      });
      writes.forEach(write => write()); return result;
      } finally {release();}
    },
  };
  return {rows, db, configFailure: () => {configFails = true;}, queueFailure: (value: boolean) => {queueFails = value;}};
}
function created(id: string, data: Record<string, unknown>) {return {params: {id, ideaId: 'i1', reportId: id}, time: new Date(NOW).toISOString(), data: {data: () => ({createdAtMs: NOW, ...data})}} as never;}

test.each([adminAlertOnContentReport, adminAlertOnUserReport, adminAlertOnCriticalError])('source queues facts even while delivery config cannot be read', async (trigger) => {
  const state = database(); state.configFailure(); (admin.firestore as unknown as jest.Mock).mockReturnValue(state.db);
  await trigger.run(created('r1', {severity: 'warning'}));
  expect([...state.rows.keys()].filter(key => key.startsWith('admin_alert_events/'))).toHaveLength(1);
});

test('simultaneous copies of one critical error context preserve the 30-minute quiet window', async () => {
  const state = database(); (admin.firestore as unknown as jest.Mock).mockReturnValue(state.db);
  await Promise.all(['c1', 'c2'].map(id => adminAlertOnCriticalError.run(created(id, {severity: 'critical', context: 'locked', uid: 'u1'}))));
  expect([...state.rows.values()].filter(row => row.eventType === 'criticalError')).toHaveLength(1);
});

test('idea reports propagate enqueue failures so the configured retry actually runs', async () => {
  const state = database(); state.queueFailure(true); (admin.firestore as unknown as jest.Mock).mockReturnValue(state.db);
  await expect(adminAlertOnUserIdeaReport.run(created('r1', {reason: 'spam'}))).rejects.toThrow('queue_offline');
});

test('auth spike retries count each source event once and commit the alert atomically', async () => {
  const state = database(); (admin.firestore as unknown as jest.Mock).mockReturnValue(state.db);
  await adminAlertOnAuthFailureSpike.run(created('r1', {feature: 'auth', tags: {stage: 'google'}}));
  await adminAlertOnAuthFailureSpike.run(created('r1', {feature: 'auth', tags: {stage: 'google'}}));
  expect(state.rows.get('admin_config/alerts')?.authFailureWindow.count).toBe(1);
  state.queueFailure(true);
  await expect(adminAlertOnAuthFailureSpike.run(created('r2', {feature: 'auth'}))).rejects.toThrow('queue_offline');
  expect(state.rows.get('admin_config/alerts')?.authFailureWindow.count).toBe(1);
  state.queueFailure(false);
  await adminAlertOnAuthFailureSpike.run(created('r2', {feature: 'auth'}));
  expect(state.rows.get('admin_config/alerts')?.authFailureWindow.count).toBe(2);
  expect([...state.rows.values()].filter(row => row.eventType === 'authFailureSpike')).toHaveLength(1);
});

test('serial-refund alerts identify each refund receipt, while replaying one receipt is idempotent', async () => {
  const state = database(); (admin.firestore as unknown as jest.Mock).mockReturnValue(state.db);
  const event = (id: string) => ({params: {id}, time: new Date(NOW).toISOString(), data: {
    before: {data: () => ({status: 'completed'})}, after: {data: () => ({status: 'refunded', buyerStableId: 'buyer1', refundedAtMs: NOW})},
  }}) as never;
  for (const id of ['p1', 'p1', 'p2']) await adminAlertOnUgcRefund.run(event(id));
  expect([...state.rows.values()].filter(row => row.source === 'legacy.serial_refunder_receipt')).toHaveLength(2);
});

test('cron heartbeat delivery uses retry policy', () => {
  expect(adminAlertOnCronHeartbeat.__endpoint.eventTrigger?.retry).toBe(true);
});

test('cron heartbeat missing persisted timestamp uses stable CloudEvent time across retries', async () => {
  const state = database(); (admin.firestore as unknown as jest.Mock).mockReturnValue(state.db);
  const event = {params: {cronName: 'daily'}, time: new Date(NOW).toISOString(), data: {
    before: {exists: true, data: () => ({ok: true})}, after: {exists: true, data: () => ({ok: false})},
  }} as never;
  const time = jest.spyOn(Date, 'now').mockReturnValue(NOW + 1000);
  try {
    await adminAlertOnCronHeartbeat.run(event);
    time.mockReturnValue(NOW + 9000);
    await adminAlertOnCronHeartbeat.run(event);
    expect([...state.rows.values()].filter(row => row.eventType === 'cronHealth')).toHaveLength(1);
  } finally {time.mockRestore();}
});

test('idea parent read failures propagate instead of freezing false moderation metadata', async () => {
  const state = database();
  const originalCollection = state.db.collection;
  state.db.collection = name => name === 'user_ideas' ? {doc: () => ({get: async () => {throw new Error('idea_offline');}})} : originalCollection(name);
  (admin.firestore as unknown as jest.Mock).mockReturnValue(state.db);
  await expect(adminAlertOnUserIdeaReport.run(created('i1', {reason: 'spam'}))).rejects.toThrow('idea_offline');
});

test('next critical notification includes the suppressed repeat count before resetting it', async () => {
  const state = database(); (admin.firestore as unknown as jest.Mock).mockReturnValue(state.db);
  const time = jest.spyOn(Date, 'now').mockReturnValue(NOW);
  try {
    await adminAlertOnCriticalError.run(created('c1', {severity: 'critical', context: 'locked', uid: 'u1'}));
    await adminAlertOnCriticalError.run(created('c2', {severity: 'critical', context: 'locked', uid: 'u1'}));
    await adminAlertOnCriticalError.run(created('c2', {severity: 'critical', context: 'locked', uid: 'u1'}));
    time.mockReturnValue(NOW + 1800001);
    await adminAlertOnCriticalError.run(created('c3', {severity: 'critical', context: 'locked', uid: 'u1'}));
    expect(state.rows.get('admin_alert_events/legacy.critical_error:c3')?.payload.details).toContainEqual({label: 'Повторов', value: '1'});
  } finally {time.mockRestore();}
});
