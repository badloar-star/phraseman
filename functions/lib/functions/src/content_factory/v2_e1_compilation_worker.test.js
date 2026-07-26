"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// зачем: владелец решил «воркер строим» — без него job из админки висит queued навсегда.
// Тесты фиксируют весь путь: сид демо-банка E1 → генерация плана → выполнение компиляции
// (артефакт, статусы стадий, идемпотентный повтор) и fail-closed отказы (нет job,
// нет источника, подменённый профиль, чужая роль).
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const admin_v2_generation_1 = require("../admin_v2_generation");
const v2_e1_compilation_worker_1 = require("./v2_e1_compilation_worker");
const auth = { uid: 'admin-1', token: { admin: true, adminRole: 'content_editor' } };
const templateRef = { templateId: 'phrase-builder', version: 1, contentHash: 'a'.repeat(64) };
function fakeDb() {
    const docs = new Map();
    const ref = (path) => ({
        path,
        async get() {
            const value = docs.get(path);
            return { exists: Boolean(value), data: () => value };
        },
        async set(value, options) {
            const previous = options?.merge ? docs.get(path) ?? {} : {};
            docs.set(path, { ...previous, ...value });
        },
    });
    const db = {
        collection(name) {
            return { doc(id) { return ref(`${name}/${id}`); } };
        },
        runTransaction: async (work) => work({
            async get(document) {
                const value = docs.get(document.path);
                return { exists: Boolean(value), data: () => value };
            },
            create(document, value) {
                if (docs.has(document.path))
                    throw new Error('already-exists');
                docs.set(document.path, value);
            },
            set(document, value, options) {
                const previous = options?.merge ? docs.get(document.path) ?? {} : {};
                docs.set(document.path, { ...previous, ...value });
            },
            update(document, value) {
                const previous = docs.get(document.path);
                if (!previous)
                    throw new Error('not-found');
                docs.set(document.path, { ...previous, ...value });
            },
        }),
        docs,
    };
    return db;
}
async function seedAndQueue(db) {
    const seeded = await (0, v2_e1_compilation_worker_1.handleAdminSeedV2E1DemoSource)({ auth, data: {} }, { db: db, now: () => '2026-07-25T10:00:00.000Z' });
    const plan = await (0, admin_v2_generation_1.handleAdminCreateV2GenerationPlan)({
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
    }, { db: db, resolveTemplate: async (value) => value, now: () => '2026-07-25T10:00:01.000Z' });
    return { seeded, plan };
}
describe('V2 E1 compilation worker', () => {
    it('seeds the demo source with a real canonical profile hash', async () => {
        const db = fakeDb();
        const seeded = await (0, v2_e1_compilation_worker_1.handleAdminSeedV2E1DemoSource)({ auth, data: {} }, { db: db, now: () => '2026-07-25T10:00:00.000Z' });
        const source = db.docs.get('content_v2_sources/ep-01');
        expect(source).toBeDefined();
        expect(seeded.languageProfileRef.contentHash).toBe((0, decision_registry_1.hashCanonicalBody)(source.languageProfile));
        expect(Array.isArray(source.contentItems)).toBe(true);
        expect(source.contentItems.length).toBeGreaterThanOrEqual(8);
    });
    it('compiles the queued job into an artifact, succeeds stages and replays idempotently', async () => {
        const db = fakeDb();
        const { plan } = await seedAndQueue(db);
        const first = await (0, v2_e1_compilation_worker_1.handleAdminRunV2E1Compilation)({ auth, data: { jobId: plan.jobId } }, { db: db, now: () => '2026-07-25T10:00:02.000Z' });
        expect(first).toMatchObject({ ok: true, jobId: plan.jobId, replayed: false, qaOk: true, sessionCount: 12 });
        const artifact = db.docs.get('content_v2_compiled_units/ep-01');
        expect(artifact).toBeDefined();
        expect(artifact.jobId).toBe(plan.jobId);
        const job = db.docs.get(`content_v2_generation_jobs/${plan.jobId}`);
        expect(job.state).toBe('compiled');
        const stageStates = [...db.docs.entries()]
            .filter(([path]) => path.startsWith('content_v2_generation_stages/'))
            .map(([, value]) => value.state);
        expect(stageStates.length).toBeGreaterThan(0);
        expect(stageStates.every((state) => state === 'succeeded')).toBe(true);
        const replay = await (0, v2_e1_compilation_worker_1.handleAdminRunV2E1Compilation)({ auth, data: { jobId: plan.jobId } }, { db: db, now: () => '2026-07-25T10:00:03.000Z' });
        expect(replay).toMatchObject({ ok: true, replayed: true });
    });
    it('fails closed on missing job, missing source and tampered profile', async () => {
        const db = fakeDb();
        await expect((0, v2_e1_compilation_worker_1.handleAdminRunV2E1Compilation)({ auth, data: { jobId: 'ghost' } }, { db: db }))
            .rejects.toThrow('v2_worker_job_not_found');
        const { plan } = await seedAndQueue(db);
        const source = db.docs.get('content_v2_sources/ep-01');
        // Подмена тела профиля после утверждения — canonical hash перестаёт сходиться.
        db.docs.set('content_v2_sources/ep-01', {
            ...source,
            languageProfile: { ...source.languageProfile, targetLanguage: 'de' },
        });
        await expect((0, v2_e1_compilation_worker_1.handleAdminRunV2E1Compilation)({ auth, data: { jobId: plan.jobId } }, { db: db }))
            .rejects.toThrow('language_profile_hash_mismatch');
        db.docs.delete('content_v2_sources/ep-01');
        await expect((0, v2_e1_compilation_worker_1.handleAdminRunV2E1Compilation)({ auth, data: { jobId: plan.jobId } }, { db: db }))
            .rejects.toThrow('v2_worker_source_missing');
    });
    it('runs a direct vertical-slice compilation without a queued job', async () => {
        const db = fakeDb();
        await (0, v2_e1_compilation_worker_1.handleAdminSeedV2E1DemoSource)({ auth, data: {} }, { db: db, now: () => '2026-07-25T11:00:00.000Z' });
        const result = await (0, v2_e1_compilation_worker_1.handleAdminRunV2E1Compilation)({ auth, data: { direct: true } }, { db: db, now: () => '2026-07-25T11:00:01.000Z' });
        expect(result).toMatchObject({ ok: true, jobId: 'v2-e1-direct', episodeId: 'ep-01', qaOk: true, sessionCount: 12 });
        const job = db.docs.get('content_v2_generation_jobs/v2-e1-direct');
        expect(job.mode).toBe('direct_vertical_slice');
        expect(job.state).toBe('compiled');
        expect(db.docs.get('content_v2_compiled_units/ep-01')).toBeDefined();
        // Повторный прямой прогон не падает и перекомпилирует детерминированный артефакт.
        const rerun = await (0, v2_e1_compilation_worker_1.handleAdminRunV2E1Compilation)({ auth, data: { direct: true } }, { db: db, now: () => '2026-07-25T11:00:02.000Z' });
        expect(rerun).toMatchObject({ ok: true, qaOk: true });
        // Прямой прогон без источника — честный отказ.
        db.docs.delete('content_v2_sources/ep-01');
        await expect((0, v2_e1_compilation_worker_1.handleAdminRunV2E1Compilation)({ auth, data: { direct: true } }, { db: db }))
            .rejects.toThrow('v2_worker_source_missing');
    });
    it('rejects roles without content draft write access', async () => {
        const db = fakeDb();
        await expect((0, v2_e1_compilation_worker_1.handleAdminSeedV2E1DemoSource)({ auth: { uid: 'u', token: { admin: true, adminRole: 'content_reviewer' } }, data: {} }, { db: db })).rejects.toThrow('Role cannot edit V2 drafts');
        await expect((0, v2_e1_compilation_worker_1.handleAdminRunV2E1Compilation)({ auth: { uid: 'u', token: { admin: true, adminRole: 'content_reviewer' } }, data: { jobId: 'x' } }, { db: db })).rejects.toThrow('Role cannot edit V2 drafts');
    });
});
//# sourceMappingURL=v2_e1_compilation_worker.test.js.map