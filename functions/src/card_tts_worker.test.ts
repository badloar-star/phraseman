jest.mock('firebase-admin', () => ({ firestore: jest.fn(), storage: jest.fn() }));
jest.mock('firebase-functions/params', () => ({ defineSecret: () => ({ value: () => 'test-key' }) }));
jest.mock('firebase-functions/v2/firestore', () => ({ onDocumentWritten: (_opts: unknown, handler: unknown) => handler }));
jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class extends Error { constructor(public code: string, message: string) { super(message); } },
  onCall: (_opts: unknown, handler: unknown) => handler,
}));

import { cardTtsKey, cardTtsObjectPath, CARD_TTS_MAX_RUNS_PER_PACK_PER_DAY } from './card_tts_core';
import { enqueueCardTtsJob } from './card_tts_jobs';
import { runCardTtsJob, type CardTtsSpeechRequest, type CardTtsWorkerDeps } from './card_tts_worker';

type Doc = Record<string, unknown>;

function makeDb(store: Map<string, Doc>) {
  let autoId = 0;
  const snap = (path: string) => ({ exists: store.has(path), data: () => (store.has(path) ? { ...store.get(path) } : undefined) });
  const ref = (path: string) => ({
    path,
    async get() { return snap(path); },
    async set(data: Doc, opts?: { merge?: boolean }) {
      store.set(path, opts?.merge ? { ...(store.get(path) ?? {}), ...data } : { ...data });
    },
    async update(data: Doc) {
      if (!store.has(path)) throw new Error('not-found');
      store.set(path, { ...store.get(path), ...data });
    },
  });
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ref(`${name}/${id}`),
      add: async (data: Doc) => { autoId += 1; store.set(`${name}/auto${autoId}`, data); return ref(`${name}/auto${autoId}`); },
    }),
    runTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const tx = {
        get: async (r: { path: string }) => snap(r.path),
        set: (r: { path: string }, data: Doc, opts?: { merge?: boolean }) => {
          writes.push(() => store.set(r.path, opts?.merge ? { ...(store.get(r.path) ?? {}), ...data } : { ...data }));
        },
      };
      const out = await fn(tx);
      writes.forEach((w) => w());
      return out;
    },
  };
  return db as unknown as FirebaseFirestore.Firestore;
}

function setup(pack: Doc | null, existing: string[] = []) {
  const store = new Map<string, Doc>();
  if (pack) store.set('community_packs/p1', pack);
  const objects = new Set(existing);
  const calls: CardTtsSpeechRequest[] = [];
  let nowMs = Date.UTC(2026, 8, 30, 12);
  const deps: CardTtsWorkerDeps = {
    db: makeDb(store),
    bucket: {
      name: 'bucket-x',
      file: (path: string) => ({
        exists: async () => [objects.has(path)] as [boolean],
        save: async () => { objects.add(path); },
      }),
    },
    generateSpeech: async (request) => { calls.push(request); return Buffer.alloc(2000); },
    now: () => { nowMs += 1; return nowMs; },
  };
  return { store, objects, calls, deps };
}

const published = (cards: Doc[], extra: Doc = {}) => ({ listingStatus: 'published', packLanguage: 'es', cards, ...extra });

describe('card_tts_worker (D128)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('voices only missing unique cards in the pack language and records billing + pack summary', async () => {
    const already = cardTtsObjectPath('es', cardTtsKey('es', 'Gracias'));
    const { store, calls, deps } = setup(published([
      { id: 'a', en: 'Hola' }, { id: 'b', en: 'Gracias' }, { id: 'c', targetText: 'Hola' },
    ]), [already]);
    await enqueueCardTtsJob(deps.db, 'p1', 'moderation_approve');
    const result = await runCardTtsJob('p1', deps);
    expect(result).toMatchObject({ status: 'done', synthesized: 1, reused: 1, failed: 0, characters: 4 });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ text: 'Hola', language: 'es', voice: 'marin', model: 'gpt-4o-mini-tts' });
    // privacy: в запрос уходит только текст, язык и параметры голоса
    expect(Object.keys(calls[0]!).sort()).toEqual(['instructions', 'language', 'model', 'speed', 'text', 'voice']);
    const billing = [...store.entries()].filter(([k]) => k.startsWith('card_tts_billing/')).map(([, v]) => v);
    expect(billing).toHaveLength(1);
    expect(billing[0]).toMatchObject({ operation: 'card_tts', language: 'es', characters: 4, requests: 1 });
    expect(billing[0]).not.toHaveProperty('uid');
    expect((store.get('community_packs/p1') as Doc).cardTts).toMatchObject({ status: 'done', voicedCount: 2, language: 'es' });
    expect(store.get('card_tts_jobs/p1')).toMatchObject({ status: 'done' });
    expect(store.get('card_tts_daily_budget/2026-09-30')).toMatchObject({ chars: 4 });
  });

  it('second run on the same revision pays nothing', async () => {
    const { calls, deps } = setup(published([{ id: 'a', en: 'Hola' }]));
    await enqueueCardTtsJob(deps.db, 'p1', 'moderation_approve');
    await runCardTtsJob('p1', deps);
    await enqueueCardTtsJob(deps.db, 'p1', 'author_edit_published');
    const again = await runCardTtsJob('p1', deps);
    expect(again).toMatchObject({ status: 'done', reason: 'revision_already_voiced' });
    expect(calls).toHaveLength(1);
  });

  it('never voices packs without language or unpublished packs', async () => {
    for (const pack of [published([{ id: 'a', en: 'Paris' }], { packLanguage: 'none' }), { ...published([{ id: 'a', en: 'x' }]), listingStatus: 'pending' }]) {
      const { calls, deps } = setup(pack);
      await enqueueCardTtsJob(deps.db, 'p1', 'moderation_approve');
      const result = await runCardTtsJob('p1', deps);
      expect(result.status).toBe('skipped');
      expect(calls).toHaveLength(0);
    }
  });

  it('does not run when the job is not queued', async () => {
    const { calls, deps } = setup(published([{ id: 'a', en: 'Hola' }]));
    const result = await runCardTtsJob('p1', deps);
    expect(result).toMatchObject({ status: 'not_claimed', reason: 'job_missing' });
    expect(calls).toHaveLength(0);
  });

  it('marks partial when a provider call fails and keeps the job retryable', async () => {
    const { store, deps } = setup(published([{ id: 'a', en: 'Hola' }, { id: 'b', en: 'Adiós' }]));
    const failing: CardTtsWorkerDeps = {
      ...deps,
      generateSpeech: async (req) => { if (req.text === 'Adiós') throw new Error('boom'); return Buffer.alloc(2000); },
    };
    await enqueueCardTtsJob(deps.db, 'p1', 'moderation_approve');
    const result = await runCardTtsJob('p1', failing);
    expect(result).toMatchObject({ status: 'partial', synthesized: 1, failed: 1 });
    expect(store.get('card_tts_jobs/p1')).toMatchObject({ status: 'partial' });
    await enqueueCardTtsJob(deps.db, 'p1', 'admin_requeue');
    const retry = await runCardTtsJob('p1', deps);
    expect(retry).toMatchObject({ status: 'done', synthesized: 1, reused: 1 });
  });

  it('defers when the global daily char budget is exhausted', async () => {
    const { store, calls, deps } = setup(published([{ id: 'a', en: 'Hola' }]));
    store.set('card_tts_daily_budget/2026-09-30', { chars: 300_000 });
    await enqueueCardTtsJob(deps.db, 'p1', 'moderation_approve');
    const result = await runCardTtsJob('p1', deps);
    expect(result).toMatchObject({ status: 'deferred_budget' });
    expect(calls).toHaveLength(0);
  });

  // PM-224: глобальный рубильник ИИ «Пульта» останавливает платный TTS до вызова OpenAI.
  it('defers without paying when the global AI kill switch is on', async () => {
    const { store, calls, deps } = setup(published([{ id: 'a', en: 'Hola' }]));
    store.set('remote_config/app', { bools: { ai_global_disable: true } });
    await enqueueCardTtsJob(deps.db, 'p1', 'moderation_approve');
    const result = await runCardTtsJob('p1', deps);
    expect(result).toMatchObject({ status: 'deferred_budget', reason: 'ai_globally_disabled' });
    expect(calls).toHaveLength(0);
    expect(store.has('card_tts_daily_budget/2026-09-30')).toBe(false);
  });

  it('kill switch does not block free reuse of already voiced clips', async () => {
    const already = cardTtsObjectPath('es', cardTtsKey('es', 'Hola'));
    const { store, calls, deps } = setup(published([{ id: 'a', en: 'Hola' }]), [already]);
    store.set('remote_config/app', { bools: { ai_global_disable: true } });
    await enqueueCardTtsJob(deps.db, 'p1', 'moderation_approve');
    const result = await runCardTtsJob('p1', deps);
    expect(result).toMatchObject({ status: 'done', reused: 1, synthesized: 0 });
    expect(calls).toHaveLength(0);
  });

  it('caps runs per pack per day', async () => {
    const { store, deps } = setup(published([{ id: 'a', en: 'Hola' }]));
    await enqueueCardTtsJob(deps.db, 'p1', 'moderation_approve');
    store.set('card_tts_jobs/p1', { ...store.get('card_tts_jobs/p1'), runDay: '2026-09-30', runsToday: CARD_TTS_MAX_RUNS_PER_PACK_PER_DAY });
    const result = await runCardTtsJob('p1', deps);
    expect(result.status).toBe('deferred_daily_cap');
  });

  it('requeues when the pack was enqueued again during the run', async () => {
    const { store, deps } = setup(published([{ id: 'a', en: 'Hola' }]));
    await enqueueCardTtsJob(deps.db, 'p1', 'moderation_approve', 1);
    const racing: CardTtsWorkerDeps = {
      ...deps,
      generateSpeech: async () => {
        await enqueueCardTtsJob(deps.db, 'p1', 'author_edit_published', Date.UTC(2027, 0, 1));
        return Buffer.alloc(2000);
      },
    };
    await runCardTtsJob('p1', racing);
    expect(store.get('card_tts_jobs/p1')).toMatchObject({ status: 'queued' });
  });

  it('enqueue rejects invalid pack ids without throwing', async () => {
    const { deps } = setup(null);
    await expect(enqueueCardTtsJob(deps.db, '../x', 'moderation_approve')).resolves.toBe(false);
  });
});

// зачем (координатор 12.10, п.60(8)): даже случайный полный деплой функций не шлёт текст карточек в OpenAI —
// без remote_config/app.bools.card_tts_enabled триггер и перепостановка выходят, ничего не вызывая.
describe('card TTS server gate (12.10)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const admin = require('firebase-admin') as { firestore: jest.Mock; storage: jest.Mock };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const worker = require('./card_tts_worker') as typeof import('./card_tts_worker');
  const makeDb = (bools: Record<string, unknown> | undefined) => {
    const touched: string[] = [];
    const get = jest.fn(async () => ({ data: () => (bools === undefined ? undefined : { bools }) }));
    const db = {
      collection: (name: string) => {
        touched.push(name);
        return { doc: () => ({ get }) };
      },
    };
    return { db, touched, get };
  };
  const queuedEvent = { params: { packId: 'p1' }, data: { after: { exists: true, data: () => ({ status: 'queued' }) } } };

  beforeEach(() => {
    worker.__resetCardTtsGateForTests();
    admin.firestore.mockReset();
    admin.storage.mockReset();
  });

  it('is off by default (no flag, no document)', async () => {
    const { db } = makeDb(undefined);
    await expect(worker.isCardTtsEnabled(db as never)).resolves.toBe(false);
  });

  it('trigger exits before claiming the job when the gate is off', async () => {
    const { db, touched } = makeDb({});
    admin.firestore.mockReturnValue(db);
    await (worker.cardTtsPackWorker as unknown as (event: unknown) => Promise<void>)(queuedEvent);
    expect(touched).toEqual(['remote_config']);
    expect(admin.storage).not.toHaveBeenCalled();
  });

  it('admin requeue is refused while the gate is off', async () => {
    const { db } = makeDb({ card_tts_enabled: false });
    admin.firestore.mockReturnValue(db);
    const requeue = worker.adminCardTtsRequeuePack as unknown as (request: unknown) => Promise<unknown>;
    await expect(requeue({ auth: { token: { admin: true } }, data: { packId: 'p1' } })).rejects.toThrow('card_tts_disabled');
  });

  it('reads the flag once per 10 minutes', async () => {
    const { db, get } = makeDb({ card_tts_enabled: true });
    await expect(worker.isCardTtsEnabled(db as never, 1_000)).resolves.toBe(true);
    await expect(worker.isCardTtsEnabled(db as never, 1_000 + 9 * 60 * 1000)).resolves.toBe(true);
    expect(get).toHaveBeenCalledTimes(1);
    await worker.isCardTtsEnabled(db as never, 1_000 + 11 * 60 * 1000);
    expect(get).toHaveBeenCalledTimes(2);
  });
});
