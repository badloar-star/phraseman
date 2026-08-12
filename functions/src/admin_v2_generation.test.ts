import { handleAdminCreateV2GenerationPlan } from './admin_v2_generation';

const hash = 'a'.repeat(64);
const data = {
  schemaVersion: 'v2-admin-generation-request.v1',
  seasonId: 'season-01', scope: 'vertical_slice', episodeIds: ['episode-01'],
  studyTarget: 'en', sourceLocale: 'ru', targetLocales: ['de'],
  templateBindings: [{ episodeId: 'episode-01', templateRefs: [{ templateId: 'phrase-builder', version: 1, contentHash: hash }] }],
  idempotencyKey: 'v2-generate-01',
  // зачем: с Task 6 языковой профиль — обязательное предусловие генерации.
  languageProfileRef: { profileId: 'english-general-a1', version: 1, contentHash: 'b'.repeat(64) },
};

type Doc = { exists: boolean; data: () => Record<string, unknown> | undefined };
function fakeDb() {
  const docs = new Map<string, Record<string, unknown>>();
  const ref = (path: string) => ({ path });
  const db = {
    collection(name: string) {
      return {
        doc(id: string) { return ref(`${name}/${id}`); },
      };
    },
    runTransaction: async (work: (tx: { get: (doc: { path: string }) => Promise<Doc>; create: (doc: { path: string }, value: Record<string, unknown>) => void }) => Promise<unknown>) => work({
      async get(document) {
        const value = docs.get(document.path);
        return { exists: Boolean(value), data: () => value };
      },
      create(document, value) {
        if (docs.has(document.path)) throw new Error('already-exists');
        docs.set(document.path, value);
      },
    }),
    docs,
  };
  return db;
}

const auth = { uid: 'admin-1', token: { admin: true, adminRole: 'content_editor' } };

describe('admin V2 generation callable seam', () => {
  it('requires content.draft.write and rejects stale template pins', async () => {
    const db = fakeDb();
    await expect(handleAdminCreateV2GenerationPlan({ auth: { uid: 'u', token: { admin: true, adminRole: 'content_reviewer' } }, data }, { db: db as never, resolveTemplate: async () => undefined })).rejects.toThrow('Role cannot edit V2 drafts');
    await expect(handleAdminCreateV2GenerationPlan({ auth, data }, { db: db as never, resolveTemplate: async () => undefined })).rejects.toThrow('v2_generation_template_pin_stale');
  });

  it('queues one deterministic plan and replays the same idempotency key', async () => {
    const db = fakeDb();
    const deps = { db: db as never, resolveTemplate: async (ref: unknown) => ref, now: () => '2026-07-17T00:00:00.000Z' };
    const first = await handleAdminCreateV2GenerationPlan({ auth, data }, deps);
    const replay = await handleAdminCreateV2GenerationPlan({ auth, data }, deps);
    expect(first).toMatchObject({ ok: true, jobId: 'v2-generate-01', state: 'queued', replayed: false });
    expect(replay).toMatchObject({ ok: true, jobId: 'v2-generate-01', state: 'queued', replayed: true, requestFingerprint: first.requestFingerprint });
    expect(db.docs.has('content_v2_generation_jobs/v2-generate-01')).toBe(true);
    expect([...db.docs.keys()].filter((key) => key.startsWith('content_v2_generation_stages/'))).toHaveLength(11);
    expect([...db.docs.keys()].filter((key) => key.startsWith('content_v2_generation_localizations/'))).toHaveLength(1);
    expect([...db.docs.keys()].filter((key) => key.startsWith('admin_log/'))).toHaveLength(1);
  });

  it('does not allow a second payload to reuse the idempotency key', async () => {
    const db = fakeDb();
    const deps = { db: db as never, resolveTemplate: async (ref: unknown) => ref };
    await handleAdminCreateV2GenerationPlan({ auth, data }, deps);
    await expect(handleAdminCreateV2GenerationPlan({ auth, data: { ...data, targetLocales: ['fr'] } }, deps)).rejects.toThrow('idempotencyKey belongs to another V2 generation plan');
  });
});
