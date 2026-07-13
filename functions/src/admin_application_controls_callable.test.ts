export {};

type Row = Record<string, any>;
type Store = Record<string, Record<string, Row | undefined>>;
let currentDb: ReturnType<typeof makeDb>['db'] | null = null;

jest.mock('firebase-admin', () => ({
  apps: [{}], initializeApp: jest.fn(),
  firestore: Object.assign(() => currentDb, {
    FieldValue: {
      serverTimestamp: () => ({ __serverTimestamp: true }),
      delete: () => ({ __delete: true }),
    },
    FieldPath: { documentId: () => '__name__' },
  }),
}));

jest.mock('./admin_alerts', () => ({
  ADMIN_ALERT_BOT_TOKEN: { value: () => 'test-token' },
  dispatchTelegramAlert: jest.fn(),
}));

const { adminPreviewVipSurveyCampaign, adminApplyVipSurveyCampaign } = require('./admin_vip_survey_control');
const { adminPreviewAlertsConfig, adminApplyAlertsConfig, adminPreviewAlertTest, adminQueueAlertTest } = require('./admin_alerts_control');
const { adminPreviewManualAccess, adminApplyManualAccess } = require('./admin_manual_access');
const { adminGetPlusControlWorkspace, adminPreviewLegacyPlusMigration, adminApplyLegacyPlusMigration } = require('./admin_plus_control');
const { adminPreviewVoiceResearchMutation, adminApplyVoiceResearchMutation } = require('./admin_voice_research');
const { dispatchTelegramAlert } = require('./admin_alerts');

function makeDb(initial: Store = {}) {
  const store: Store = Object.fromEntries(Object.entries(initial).map(([collection, docs]) => [collection, { ...docs }]));
  let reads = 0;
  let autoId = 0;

  const snapshot = (collection: string, id: string) => {
    const value = store[collection]?.[id];
    const ref = document(collection, id);
    return { id, ref, exists: value !== undefined, data: () => value === undefined ? undefined : { ...value } };
  };

  const collectionApi = (name: string): any => Object.assign(query(name), {
    doc: (id?: string) => document(name, id || `auto-${++autoId}`),
    add: async (value: Row) => { const ref = document(name, `auto-${++autoId}`); await ref.create(value); return ref; },
  });

  const document = (collection: string, id: string): any => ({
    _collection: collection, id, path: `${collection}/${id}`,
    collection: (name: string) => collectionApi(`${collection}/${id}/${name}`),
    get: async () => { reads += 1; return snapshot(collection, id); },
    create: async (value: Row) => {
      store[collection] ||= {};
      if (store[collection][id] !== undefined) throw new Error('already-exists');
      store[collection][id] = { ...value };
    },
    set: async (value: Row, options?: { merge?: boolean }) => {
      store[collection] ||= {};
      store[collection][id] = options?.merge ? { ...(store[collection][id] || {}), ...value } : { ...value };
    },
  });

  function query(collection: string, filters: [string, string, unknown][] = [], order: [string, string] | null = null, max = Infinity, afterId = ''): any {
    const api: any = {
      where: (field: string, op: string, value: unknown) => {
        if (!['==', '<='].includes(op)) throw new Error(`unexpected query operator ${op}`);
        return query(collection, [...filters, [field, op, value]], order, max, afterId);
      },
      orderBy: (field: string, direction = 'asc') => query(collection, filters, [field, direction], max, afterId),
      select: () => query(collection, filters, order, max, afterId),
      startAfter: (cursor: { id?: string } | string) => query(collection, filters, order, max, typeof cursor === 'string' ? cursor : String(cursor?.id || '')),
      limit: (value: number) => query(collection, filters, order, value, afterId),
      get: async () => {
        reads += 1;
        let rows = Object.entries(store[collection] || {}).filter(([, value]) => value !== undefined) as [string, Row][];
        rows = rows.filter(([, value]) => filters.every(([field, op, expected]) => op === '<=' ? Number(value[field]) <= Number(expected) : value[field] === expected));
        if (order?.[0] === '__name__') rows.sort((left, right) => left[0].localeCompare(right[0]) * (order[1] === 'desc' ? -1 : 1));
        else if (order) rows.sort((left, right) => (Number(left[1][order[0]] || 0) - Number(right[1][order[0]] || 0)) * (order[1] === 'desc' ? -1 : 1));
        if (afterId) rows = rows.filter(([id]) => id.localeCompare(afterId) > 0);
        const docs = rows.slice(0, max).map(([id]) => snapshot(collection, id));
        return { docs, size: docs.length, empty: docs.length === 0 };
      },
    };
    return api;
  }

  const write = (mode: 'create' | 'set' | 'update', ref: any, value: Row, options?: { merge?: boolean }) => {
    store[ref._collection] ||= {};
    if (mode === 'create' && store[ref._collection][ref.id] !== undefined) throw new Error('already-exists');
    if (mode === 'update' && store[ref._collection][ref.id] === undefined) throw new Error('not-found');
    const base = mode === 'set' && !options?.merge ? {} : (store[ref._collection][ref.id] || {});
    const next = { ...base };
    Object.entries(value).forEach(([key, item]) => {
      if (!key.includes('.')) { next[key] = item; return; }
      const parts = key.split('.'); let cursor = next;
      parts.forEach((part, index) => {
        if (index === parts.length - 1) cursor[part] = item;
        else cursor = cursor[part] = { ...(cursor[part] || {}) };
      });
    });
    store[ref._collection][ref.id] = next;
  };

  const db: any = {
    doc: (path: string) => { const [collection, id] = path.split('/'); return document(collection, id); },
    collection: collectionApi,
    getAll: async (...refs: any[]) => Promise.all(refs.map((ref) => ref.get())),
    recursiveDelete: async (ref: any) => {
      delete store[ref._collection]?.[ref.id];
      const prefix = `${ref._collection}/${ref.id}/`;
      Object.keys(store).filter((name) => name.startsWith(prefix)).forEach((name) => { delete store[name]; });
    },
    batch: () => {
      const writes: (() => void)[] = [];
      return {
        create: (ref: any, value: Row) => { writes.push(() => write('create', ref, value)); },
        set: (ref: any, value: Row, options?: { merge?: boolean }) => { writes.push(() => write('set', ref, value, options)); },
        commit: async () => { writes.forEach((apply) => apply()); },
      };
    },
    runTransaction: async (worker: (tx: any) => Promise<unknown>) => worker({
      get: async (ref: any) => { reads += 1; return ref.id ? snapshot(ref._collection, ref.id) : ref.get(); },
      create: (ref: any, value: Row) => write('create', ref, value),
      set: (ref: any, value: Row, options?: { merge?: boolean }) => write('set', ref, value, options),
      update: (ref: any, value: Row) => write('update', ref, value),
      delete: (ref: any) => { delete store[ref._collection]?.[ref.id]; },
    }),
  };
  currentDb = db;
  return { db, store, get reads() { return reads; } };
}

function request(data: Row, role = 'owner', uid = 'admin-a') {
  return { auth: { uid, token: { admin: true, adminRole: role, email: `${uid}@example.com` } }, data, rawRequest: { headers: {} }, app: {} };
}

function run(fn: any, req: ReturnType<typeof request>) { return typeof fn.run === 'function' ? fn.run(req) : fn(req); }

const translations = Object.fromEntries(['ru', 'uk', 'es', 'ptBr', 'vi', 'id', 'tr', 'pl'].map((lang) => [lang, { title: `${lang} title`, body: `${lang} body` }]));

describe('admin application control callables', () => {
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(10_000_000));
  afterEach(() => jest.restoreAllMocks());

  test('finds an active Plus survey after more than one hundred inactive survey documents', async () => {
    const archived = Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`archive-${index.toString().padStart(3, '0')}`, { kind: 'vip_survey', active: false, updatedAtMs: index }]));
    makeDb({ admin_vip_survey_state: { current: { revision: 0 } }, app_messages: { ...archived, live: { kind: 'vip_survey', active: true, updatedAtMs: 999, expiresAtMs: 20_000_000 } } });
    const preview = await run(adminPreviewVipSurveyCampaign, request({ action: 'deactivate', expectedRevision: 0, reason: 'stop campaign', requestId: 'preview-many' }));
    expect(preview.activeSet).toEqual([{ id: 'live', updatedAtMs: 999, expiresAtMs: 20_000_000 }]);
  });

  test('atomically replaces the active Plus survey and safely replays the command', async () => {
    const state = makeDb({
      admin_vip_survey_state: { current: { revision: 0 } },
      app_messages: { old: { kind: 'vip_survey', active: true, updatedAtMs: 10, expiresAtMs: 20 } },
    });
    const preview = await run(adminPreviewVipSurveyCampaign, request({
      action: 'activate', expectedRevision: 0, reason: 'new verified campaign', requestId: 'preview-1',
      campaign: { campaignId: 'vip-feedback-july-2026', allVersions: true, priority: 30, ttlDays: 7, translations },
    }));
    const command = { previewId: preview.previewId, confirmation: preview.confirmation, reason: 'new verified campaign', requestId: 'apply-1', idempotencyKey: 'vip-op-1' };
    await expect(run(adminApplyVipSurveyCampaign, request(command))).resolves.toMatchObject({ ok: true, revision: 1, campaignId: 'vip-feedback-july-2026', replayed: false });
    expect(state.store.app_messages.old).toMatchObject({ active: false, deactivatedBy: 'admin-a' });
    expect(state.store.app_messages['vip-feedback-july-2026']).toMatchObject({ active: true, kind: 'vip_survey', audience: 'free', vipSurvey: { surveyId: 'vip_feedback_v2', rewardDays: 30 } });
    await expect(run(adminApplyVipSurveyCampaign, request(command))).resolves.toMatchObject({ replayed: true, revision: 1 });
    expect(Object.values(state.store.admin_log || {})).toHaveLength(1);
  });

  test('binds alerts apply to revision and preserves operational counters', async () => {
    const state = makeDb({ admin_config: { alerts: { configRevision: 3, enabled: true, chatId: '123456789', spikePerHour: 5, pendingContentReports: 9 } } });
    const preview = await run(adminPreviewAlertsConfig, request({ expectedRevision: 3, patch: { enabled: false, chatId: '987654321', spikePerHour: 8, types: { criticalError: false } }, reason: 'maintenance window', requestId: 'preview-2' }));
    const command = { previewId: preview.previewId, confirmation: preview.confirmation, reason: 'maintenance window', requestId: 'apply-2', idempotencyKey: 'alerts-op-1' };
    await expect(run(adminApplyAlertsConfig, request(command))).resolves.toMatchObject({ ok: true, configRevision: 4, replayed: false });
    expect(state.store.admin_config.alerts).toMatchObject({ configRevision: 4, enabled: false, chatId: '987654321', spikePerHour: 8, pendingContentReports: 9 });
    const history = Object.values(state.store.admin_alerts_history || {})[0];
    expect(history?.projection.before.chatId).toBe('123…789');
    expect(history?.projection.after.chatId).toBe('987…321');
    await expect(run(adminApplyAlertsConfig, request(command))).resolves.toMatchObject({ replayed: true, configRevision: 4 });
  });

  test.each(['accepted_by_provider', 'rejected', 'delivery_uncertain'])('dispatches an isolated alert test with truthful %s status and no config mutation', async (status) => {
    const state = makeDb({ admin_config: { alerts: { configRevision: 7, enabled: false, chatId: '111111111', pendingContentReports: 4 } } });
    dispatchTelegramAlert.mockResolvedValueOnce({ status });
    const preview = await run(adminPreviewAlertTest, request({ chatId: '987654321', reason: 'connectivity check', requestId: `test-preview-${status}` }));
    const command = { previewId: preview.previewId, confirmation: preview.confirmation, reason: 'connectivity check', requestId: `test-send-${status}`, idempotencyKey: `test-op-${status}` };
    await expect(run(adminQueueAlertTest, request(command))).resolves.toMatchObject({ ok: true, status, replayed: false });
    expect(state.store.admin_config.alerts).toEqual({ configRevision: 7, enabled: false, chatId: '111111111', pendingContentReports: 4 });
    expect(dispatchTelegramAlert).toHaveBeenLastCalledWith('test-token', expect.any(String), { enabled: true, chatId: '987654321' });
    await expect(run(adminQueueAlertTest, request(command))).resolves.toMatchObject({ status, replayed: true });
  });

  test('previews and applies a bounded Plus grant, then revokes only the admin VIP override', async () => {
    const state = makeDb({ users: { 'stable-1': { progress: { vip_active: 'false', vip_until: '0', premium_plan: 'yearly' } } } });
    const grantPreview = await run(adminPreviewManualAccess, request({ uid: 'stable-1', action: 'grant_months', months: 3, reason: 'support resolution', requestId: 'manual-preview-1' }));
    await run(adminApplyManualAccess, request({ previewId: grantPreview.previewId, confirmation: grantPreview.confirmation, reason: 'support resolution', requestId: 'manual-apply-1', idempotencyKey: 'manual-op-1' }));
    expect(state.store.users['stable-1']?.progress).toMatchObject({ vip_active: 'true', vip_plan: 'admin_vip', vip_admin_override: 'true' });
    expect(Number(state.store.users['stable-1']?.progress.vip_until)).toBeGreaterThan(Date.now());
    const revokePreview = await run(adminPreviewManualAccess, request({ uid: 'stable-1', action: 'revoke', reason: 'grant withdrawn', requestId: 'manual-preview-2' }));
    await run(adminApplyManualAccess, request({ previewId: revokePreview.previewId, confirmation: revokePreview.confirmation, reason: 'grant withdrawn', requestId: 'manual-apply-2', idempotencyKey: 'manual-op-2' }));
    expect(state.store.users['stable-1']?.progress).toMatchObject({ vip_active: 'false', vip_admin_override: 'false', premium_plan: 'yearly' });
  });

  test('paginates a complete immutable Plus snapshot across source pages and source mutations', async () => {
    const users = Object.fromEntries(Array.from({ length: 1001 }, (_, index) => {
      const uid = `user-${String(index).padStart(5, '0')}`;
      return [uid, { name: uid, progress: { premium_active: 'true', premium_plan: 'monthly' } }];
    }));
    const state = makeDb({ users });
    const first = await run(adminGetPlusControlWorkspace, request({ view: 'accounts', filter: 'all', pageSize: 10 }));
    expect(first).toMatchObject({ totalMatched: 1001, source: { state: 'ready', count: 1001, truncated: false } });
    expect(first.nextCursor).toBeTruthy();
    state.store.users['user-00010']!.name = 'AAA changed after first page';
    const second = await run(adminGetPlusControlWorkspace, request({ view: 'accounts', filter: 'all', pageSize: 10, cursor: first.nextCursor }));
    expect(second.items[0]).toMatchObject({ uid: 'user-00010', name: 'user-00010' });
    expect(second.generatedAtMs).toBe(first.generatedAtMs);
    const exported = await run(adminGetPlusControlWorkspace, request({ view: 'accounts', filter: 'all', pageSize: 10, cursor: first.snapshotCursor, exportCsv: true }));
    expect(exported.csv).toContain('"user-00010","user-00010"');
    expect(exported.csv).not.toContain('AAA changed after first page');
    expect(exported.generatedAtMs).toBe(first.generatedAtMs);
  });

  test('uses auth_links as the authoritative manual-access target instead of the requested local UID', async () => {
    const state = makeDb({
      users: {
        local: { firebaseAuthUid: 'provider-1', progress: { vip_active: 'false' } },
        canonical: { firebaseAuthUid: 'provider-1', progress: { vip_active: 'false' } },
      },
      auth_links: { 'provider-1': { stable_id: 'canonical' } },
    });
    const preview = await run(adminPreviewManualAccess, request({ uid: 'local', action: 'grant_forever', reason: 'identity linked grant', requestId: 'identity-preview-1' }));
    expect(preview).toMatchObject({ requestedUid: 'local', uid: 'canonical', identityReason: 'auth_link' });
    await run(adminApplyManualAccess, request({ previewId: preview.previewId, confirmation: preview.confirmation, reason: 'identity linked grant', requestId: 'identity-apply-1', idempotencyKey: 'identity-op-1' }));
    expect(state.store.users.local?.progress.vip_active).toBe('false');
    expect(state.store.users.canonical?.progress.vip_active).toBe('true');
  });

  test('blocks manual access when the auth_links canonical target changes after preview', async () => {
    const state = makeDb({
      users: {
        local: { firebaseAuthUid: 'provider-2', progress: { vip_active: 'false' } },
        'canonical-a': { firebaseAuthUid: 'provider-2', progress: { vip_active: 'false' } },
        'canonical-b': { firebaseAuthUid: 'provider-2', progress: { vip_active: 'false' } },
      },
      auth_links: { 'provider-2': { stable_id: 'canonical-a' } },
    });
    const preview = await run(adminPreviewManualAccess, request({ uid: 'local', action: 'grant_forever', reason: 'identity race check', requestId: 'identity-preview-2' }));
    state.store.auth_links['provider-2'] = { stable_id: 'canonical-b' };
    await expect(run(adminApplyManualAccess, request({ previewId: preview.previewId, confirmation: preview.confirmation, reason: 'identity race check', requestId: 'identity-apply-2', idempotencyKey: 'identity-op-2' })))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'manual_access_identity_changed' });
    expect(state.store.users['canonical-a']?.progress.vip_active).toBe('false');
    expect(state.store.users['canonical-b']?.progress.vip_active).toBe('false');
  });

  test('migrates a checked legacy admin_grant atomically, preserves Store fields and safely replays', async () => {
    const state = makeDb({ users: {
      legacy: { progress: { premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: '0', premium_admin_grant_at: '9000', premium_rc_product_id: 'must-stay' } },
      already: { progress: { premium_plan: 'admin_grant', admin_premium_override: 'true', vip_active: 'true', vip_plan: 'admin_vip' } },
    } });
    const preview = await run(adminPreviewLegacyPlusMigration, request({ reason: 'safe legacy migration', requestId: 'legacy-preview-1' }));
    expect(preview).toMatchObject({ candidateCount: 1, remainingCandidates: 0 });
    const command = { previewId: preview.previewId, confirmation: preview.confirmation, reason: 'safe legacy migration', requestId: 'legacy-apply-1', idempotencyKey: 'legacy-op-1' };
    await expect(run(adminApplyLegacyPlusMigration, request(command))).resolves.toMatchObject({ migrated: 1, replayed: false });
    expect(state.store.users.legacy?.progress).toMatchObject({ vip_active: 'true', vip_plan: 'admin_vip', vip_from: '9000', vip_until: '0', premium_rc_product_id: 'must-stay' });
    expect(state.store.users.already?.progress.vip_active).toBe('true');
    await expect(run(adminApplyLegacyPlusMigration, request(command))).resolves.toMatchObject({ migrated: 1, replayed: true });
    expect(Object.values(state.store.admin_log || {}).filter((row) => row?.action === 'manual_access.migrate_legacy_admin_grant')).toHaveLength(1);
  });

  test('rejects the whole legacy migration batch when any candidate changed after preview', async () => {
    const state = makeDb({ users: {
      one: { progress: { premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: '0' } },
      two: { progress: { premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: '0' } },
    } });
    const preview = await run(adminPreviewLegacyPlusMigration, request({ reason: 'stale batch check', requestId: 'legacy-preview-2' }));
    state.store.users.two!.progress.premium_expiry = '12345';
    await expect(run(adminApplyLegacyPlusMigration, request({ previewId: preview.previewId, confirmation: preview.confirmation, reason: 'stale batch check', requestId: 'legacy-apply-2', idempotencyKey: 'legacy-op-2' })))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'plus_migration_candidate_changed' });
    expect(state.store.users.one?.progress.vip_active).toBeUndefined();
    expect(state.store.users.two?.progress.vip_active).toBeUndefined();
  });

  test('approves an idea atomically without shortening stronger VIP and replays once', async () => {
    const strongerUntil = Date.now() + 500 * 86_400_000;
    const state = makeDb({
      user_ideas: { idea1: { uid: 'u1', status: 'pending', title: 'Offline lessons' } },
      users: { u1: { progress: { vip_active: 'true', vip_plan: 'admin_vip', vip_until: String(strongerUntil), premium_rc_product_id: 'store-stays' } } },
    });
    const preview = await run(adminPreviewVoiceResearchMutation, request({ action: 'idea_decide', targetId: 'idea1', payload: { decision: 'approve', messageRu: 'Спасибо' }, reason: 'accepted roadmap item', requestId: 'voice-preview-1' }));
    const command = { previewId: preview.previewId, confirmation: preview.confirmation, reason: 'accepted roadmap item', requestId: 'voice-apply-1', idempotencyKey: 'voice-op-1' };
    await expect(run(adminApplyVoiceResearchMutation, request(command))).resolves.toMatchObject({ ok: true, action: 'idea_decide', replayed: false });
    expect(state.store.user_ideas.idea1).toMatchObject({ status: 'approved', premiumGranted: true });
    expect(state.store.users.u1?.progress).toMatchObject({ vip_until: String(strongerUntil), premium_rc_product_id: 'store-stays' });
    expect(Object.values(state.store['users/u1/idea_inbox'] || {})).toHaveLength(1);
    expect(Object.values(state.store.admin_log || {}).filter((row) => row?.action === 'voice_research.idea_decide')).toHaveLength(1);
    await expect(run(adminApplyVoiceResearchMutation, request(command))).resolves.toMatchObject({ replayed: true });
    expect(Object.values(state.store['users/u1/idea_inbox'] || {})).toHaveLength(1);
  });

  test('deletes only a survey config while retaining responses and stats', async () => {
    const survey = { surveyId: 'study', enabled: true, title: { ru: 'Учёба' }, subtitle: { ru: 'Расскажите' }, rewardShards: 3, minDaysBetweenSurveys: 7, audience: { tier: 'any', minLessons: null, maxLessons: null, platforms: [] }, questions: [{ id: 'q1', type: 'text', text: { ru: 'Почему?' }, options: [] }], accentColor: '#22c55e', finalScreen: { title: { ru: 'Спасибо' }, subtitle: { ru: 'Готово' } }, createdAtMs: 1, updatedAtMs: 2, updatedBy: 'old' };
    const state = makeDb({ shard_surveys: { study: survey }, shard_survey_stats: { study: { totalResponses: 5 } }, shard_survey_responses: { r1: { surveyId: 'study', uid: 'u1' } } });
    const preview = await run(adminPreviewVoiceResearchMutation, request({ action: 'survey_delete', targetId: 'study', payload: {}, reason: 'archive completed survey', requestId: 'voice-preview-2' }));
    await run(adminApplyVoiceResearchMutation, request({ previewId: preview.previewId, confirmation: preview.confirmation, reason: 'archive completed survey', requestId: 'voice-apply-2', idempotencyKey: 'voice-op-2' }));
    expect(state.store.shard_surveys.study).toBeUndefined();
    expect(state.store.shard_survey_stats.study).toEqual({ totalResponses: 5 });
    expect(state.store.shard_survey_responses.r1).toEqual({ surveyId: 'study', uid: 'u1' });
    expect(Object.values(state.store.admin_voice_research_history || {})).toHaveLength(1);
  });
});
