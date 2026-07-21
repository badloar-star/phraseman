"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const openai_jobs_config_1 = require("./openai_jobs_config");
// Минимальный фейковый Firestore: db.collection('admin_runtime_config').doc('openai_jobs').get()
function fakeDb(doc) {
    return {
        collection() {
            return {
                doc() {
                    return {
                        async get() {
                            return { exists: !!doc, data: () => doc };
                        },
                    };
                },
            };
        },
    };
}
describe('openai_jobs_config — weekly V2 configuration', () => {
    it('ships fail-closed with a positive global budget', () => {
        expect(openai_jobs_config_1.__openAiJobsConfigTestHooks.jobFromData('weekly', undefined)).toMatchObject({
            enabled: true,
            aiV2Enabled: false,
            rolloutPct: 0,
            globalDailyCap: 500,
        });
    });
    it('clamps rollout percentage to 0..100', () => {
        expect(openai_jobs_config_1.__openAiJobsConfigTestHooks.jobFromData('weekly', { weekly: { rolloutPct: -3 } }).rolloutPct).toBe(0);
        expect(openai_jobs_config_1.__openAiJobsConfigTestHooks.jobFromData('weekly', { weekly: { rolloutPct: 145 } }).rolloutPct).toBe(100);
    });
    it('keeps V2 fields during a partial admin update', () => {
        const previous = openai_jobs_config_1.__openAiJobsConfigTestHooks.jobFromData('weekly', {
            weekly: { aiV2Enabled: true, rolloutPct: 25, globalDailyCap: 400 },
        });
        expect(openai_jobs_config_1.__openAiJobsConfigTestHooks.mergeJobConfigForSet('weekly', previous, { model: 'gpt-4.1-mini' }))
            .toMatchObject({ aiV2Enabled: true, rolloutPct: 25, globalDailyCap: 400, model: 'gpt-4.1-mini' });
    });
    it('fails closed when configuration reading fails', async () => {
        const db = {
            collection: () => ({ doc: () => ({ get: async () => { throw new Error('offline'); } }) }),
        };
        await expect((0, openai_jobs_config_1.resolveJobConfig)(db, 'weekly')).resolves.toMatchObject({ aiV2Enabled: false, rolloutPct: 0 });
    });
    it('uses deterministic canonical stableUid buckets', () => {
        expect((0, openai_jobs_config_1.isWeeklyReviewRolloutEnabled)('stable-alpha', 87)).toBe(false);
        expect((0, openai_jobs_config_1.isWeeklyReviewRolloutEnabled)('stable-alpha', 88)).toBe(true);
        expect((0, openai_jobs_config_1.isWeeklyReviewRolloutEnabled)('stable-beta', 56)).toBe(true);
        expect((0, openai_jobs_config_1.isWeeklyReviewRolloutEnabled)('stable-gamma', 3)).toBe(true);
        expect((0, openai_jobs_config_1.isWeeklyReviewRolloutEnabled)('stable-gamma', 3)).toBe(true);
    });
});
describe('openai_jobs_config — resolveJobConfig', () => {
    it('no doc → defaults per job (enabled=true)', async () => {
        const db = fakeDb(undefined);
        const stats = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'stats');
        expect(stats).toEqual({ model: 'gpt-4o-mini', globalDailyCap: 5000, enabled: true, aiV2Enabled: false, rolloutPct: 0 });
        const weekly = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'weekly');
        expect(weekly).toEqual({ model: 'gpt-4o-mini', globalDailyCap: 500, enabled: true, aiV2Enabled: false, rolloutPct: 0 });
        const explain = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'explain');
        expect(explain).toEqual({ model: 'gpt-4o-mini', globalDailyCap: 3000, enabled: true, aiV2Enabled: false, rolloutPct: 0 });
        const helpBoard = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'help_board');
        expect(helpBoard).toEqual({ model: 'gpt-4.1-nano', globalDailyCap: 1000, enabled: true, aiV2Enabled: false, rolloutPct: 0 });
    });
    it('reads per-job overrides from doc', async () => {
        const db = fakeDb({ stats: { model: 'gpt-4.1-mini', globalDailyCap: 1000, enabled: true } });
        const stats = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'stats');
        expect(stats).toEqual({ model: 'gpt-4.1-mini', globalDailyCap: 1000, enabled: true, aiV2Enabled: false, rolloutPct: 0 });
    });
    it('enabled=false is honoured (kill-switch)', async () => {
        const db = fakeDb({ explain: { enabled: false } });
        const explain = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'explain');
        expect(explain.enabled).toBe(false);
        // другие поля падают в дефолт
        expect(explain.model).toBe('gpt-4o-mini');
        expect(explain.globalDailyCap).toBe(3000);
    });
    it('unknown model → falls back to job default', async () => {
        const db = fakeDb({ weekly: { model: 'gpt-5-imaginary' } });
        const weekly = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'weekly');
        expect(weekly.model).toBe('gpt-4o-mini');
    });
    it('supports content factory and image jobs without restoring removed features', async () => {
        expect(await (0, openai_jobs_config_1.resolveJobConfig)(fakeDb(undefined), 'content_factory')).toEqual({ model: 'gpt-4.1-mini', globalDailyCap: 500, enabled: true, aiV2Enabled: false, rolloutPct: 0 });
        expect(await (0, openai_jobs_config_1.resolveJobConfig)(fakeDb(undefined), 'image_assets')).toEqual({ model: 'gpt-image-1', globalDailyCap: 40, enabled: true, aiV2Enabled: false, rolloutPct: 0 });
    });
    it('cap clamps negatives to 0', async () => {
        const db = fakeDb({ stats: { globalDailyCap: -50 } });
        expect((await (0, openai_jobs_config_1.resolveJobConfig)(db, 'stats')).globalDailyCap).toBe(0);
    });
    it('keeps the weekly paid-work cap positive even when admin config is zero or negative', async () => {
        expect((await (0, openai_jobs_config_1.resolveJobConfig)(fakeDb({ weekly: { globalDailyCap: 0 } }), 'weekly')).globalDailyCap).toBe(1);
        expect((await (0, openai_jobs_config_1.resolveJobConfig)(fakeDb({ weekly: { globalDailyCap: -50 } }), 'weekly')).globalDailyCap).toBe(1);
    });
});
describe('openai_jobs_config — assertJobEnabled', () => {
    it('throws resource-exhausted when disabled', () => {
        expect(() => (0, openai_jobs_config_1.assertJobEnabled)({ model: 'gpt-4o-mini', globalDailyCap: 0, enabled: false, aiV2Enabled: false, rolloutPct: 0 }, 'weekly'))
            .toThrow(/weekly_disabled_by_admin/);
    });
    it('no-op when enabled', () => {
        expect(() => (0, openai_jobs_config_1.assertJobEnabled)({ model: 'gpt-4o-mini', globalDailyCap: 0, enabled: true, aiV2Enabled: false, rolloutPct: 0 }, 'weekly'))
            .not.toThrow();
    });
});
//# sourceMappingURL=openai_jobs_config.test.js.map