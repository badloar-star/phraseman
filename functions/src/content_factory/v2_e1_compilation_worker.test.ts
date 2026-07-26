// зачем: владелец решил «воркер строим» — без него job из админки висит queued навсегда.
// Тесты фиксируют весь путь: сид демо-банка E1 → генерация плана → выполнение компиляции
// (артефакт, статусы стадий, идемпотентный повтор) и fail-closed отказы (нет job,
// нет источника, подменённый профиль, чужая роль).
import { hashCanonicalBody } from '../../../modules/learning-v2/policies/decision_registry';
import { handleAdminCreateV2GenerationPlan } from '../admin_v2_generation';
import {
  handleAdminRunV2E1Compilation,
  handleAdminSeedV2E1DemoSource,
} from './v2_e1_compilation_worker';

const auth = { uid: 'admin-1', token: { admin: true, adminRole: 'content_editor' } };
const templateRef = { templateId: 'phrase-builder', version: 1, contentHash: 'a'.repeat(64) };

interface FakeTx {
  get(ref: { path: string }): Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
  create(ref: { path: string }, value: Record<string, unknown>): void;
  set(ref: { path: string }, value: Record<string, unknown>, options?: { merge?: boolean }): void;
  update(ref: { path: string }, value: Record<string, unknown>): void;
}

function fakeDb() {
  const docs = new Map<string, Record<string, unknown>>();
  const ref = (path: string) => ({
    path,
    async get() {
      const value = docs.get(path);
      return { exists: Boolean(value), data: () => value };
    },
    async set(value: Record<string, unknown>, options?: { merge?: boolean }) {
      const previous = options?.merge ? docs.get(path) ?? {} : {};
      docs.set(path, { ...previous, ...value });
    },
  });
  const db = {
    collection(name: string) {
      return { doc(id: string) { return ref(`${name}/${id}`); } };
    },
    runTransaction: async (work: (tx: FakeTx) => Promise<unknown>) => work({
      async get(document) {
        const value = docs.get(document.path);
        return { exists: Boolean(value), data: () => value };
      },
      create(document, value) {
        if (docs.has(document.path)) throw new Error('already-exists');
        docs.set(document.path, value);
      },
      set(document, value, options) {
        const previous = options?.merge ? docs.get(document.path) ?? {} : {};
        docs.set(document.path, { ...previous, ...value });
      },
      update(document, value) {
        const previous = docs.get(document.path);
        if (!previous) throw new Error('not-found');
        docs.set(document.path, { ...previous, ...value });
      },
    }),
    docs,
  };
  return db;
}

async function seedAndQueue(db: ReturnType<typeof fakeDb>) {
  const seeded = await handleAdminSeedV2E1DemoSource({ auth, data: {} }, { db: db as never, now: () => '2026-07-25T10:00:00.000Z' });
  const plan = await handleAdminCreateV2GenerationPlan({
    auth,
    data: {
      schemaVersion: 'v2-admin-generation-request.v1',
      seasonId: 'season-01',
      scope: 'vertical_slice',
      episodeIds: ['ep-01'],
      studyTarget: 'en',
      sourceLocale: 'ru',
      targetLocales: ['de'],
      templateBindings: [{ episodeId: 'ep-01', templateRefs: [templateRef] }],
      idempotencyKey: 'v2-e1-job-01',
      languageProfileRef: seeded.languageProfileRef,
    },
  }, { db: db as never, resolveTemplate: async (value: unknown) => value, now: () => '2026-07-25T10:00:01.000Z' });
  return { seeded, plan };
}

describe('V2 E1 compilation worker', () => {
  it('seeds the demo source with a real canonical profile hash', async () => {
    const db = fakeDb();
    const seeded = await handleAdminSeedV2E1DemoSource({ auth, data: {} }, { db: db as never, now: () => '2026-07-25T10:00:00.000Z' });
    const source = db.docs.get('content_v2_sources/ep-01') as Record<string, unknown>;
    expect(source).toBeDefined();
    expect(seeded.languageProfileRef.contentHash).toBe(hashCanonicalBody(source.languageProfile));
    expect(Array.isArray(source.contentItems)).toBe(true);
    expect((source.contentItems as unknown[]).length).toBeGreaterThanOrEqual(8);
  });

  it('compiles the queued job into an artifact, succeeds stages and replays idempotently', async () => {
    const db = fakeDb();
    const { plan } = await seedAndQueue(db);
    const first = await handleAdminRunV2E1Compilation(
      { auth, data: { jobId: plan.jobId } },
      { db: db as never, now: () => '2026-07-25T10:00:02.000Z' },
    );
    expect(first).toMatchObject({ ok: true, jobId: plan.jobId, replayed: false, qaOk: true, sessionCount: 12 });

    const artifact = db.docs.get('content_v2_compiled_units/ep-01') as Record<string, unknown>;
    expect(artifact).toBeDefined();
    expect(artifact.jobId).toBe(plan.jobId);
    const job = db.docs.get(`content_v2_generation_jobs/${plan.jobId}`) as Record<string, unknown>;
    expect(job.state).toBe('compiled');

    const stageStates = [...db.docs.entries()]
      .filter(([path]) => path.startsWith('content_v2_generation_stages/'))
      .map(([, value]) => value.state);
    expect(stageStates.length).toBeGreaterThan(0);
    expect(stageStates.every((state) => state === 'succeeded')).toBe(true);

    const replay = await handleAdminRunV2E1Compilation(
      { auth, data: { jobId: plan.jobId } },
      { db: db as never, now: () => '2026-07-25T10:00:03.000Z' },
    );
    expect(replay).toMatchObject({ ok: true, replayed: true });
  });

  it('fails closed on missing job, missing source and tampered profile', async () => {
    const db = fakeDb();
    await expect(handleAdminRunV2E1Compilation({ auth, data: { jobId: 'ghost' } }, { db: db as never }))
      .rejects.toThrow('v2_worker_job_not_found');

    const { plan } = await seedAndQueue(db);
    const source = db.docs.get('content_v2_sources/ep-01') as Record<string, unknown>;
    // Подмена тела профиля после утверждения — canonical hash перестаёт сходиться.
    db.docs.set('content_v2_sources/ep-01', {
      ...source,
      languageProfile: { ...(source.languageProfile as Record<string, unknown>), targetLanguage: 'de' },
    });
    await expect(handleAdminRunV2E1Compilation({ auth, data: { jobId: plan.jobId } }, { db: db as never }))
      .rejects.toThrow('language_profile_hash_mismatch');

    db.docs.delete('content_v2_sources/ep-01');
    await expect(handleAdminRunV2E1Compilation({ auth, data: { jobId: plan.jobId } }, { db: db as never }))
      .rejects.toThrow('v2_worker_source_missing');
  });

  it('rejects roles without content draft write access', async () => {
    const db = fakeDb();
    await expect(handleAdminSeedV2E1DemoSource(
      { auth: { uid: 'u', token: { admin: true, adminRole: 'content_reviewer' } }, data: {} },
      { db: db as never },
    )).rejects.toThrow('Role cannot edit V2 drafts');
    await expect(handleAdminRunV2E1Compilation(
      { auth: { uid: 'u', token: { admin: true, adminRole: 'content_reviewer' } }, data: { jobId: 'x' } },
      { db: db as never },
    )).rejects.toThrow('Role cannot edit V2 drafts');
  });
});
