"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_asset_studio_1 = require("./admin_asset_studio");
function fakeDoc(data = {}) {
    return {
        id: 'fake-doc',
        data,
        async get() { return { exists: true, id: this.id, data: () => this.data }; },
        set(next, options) {
            const applied = { ...next };
            for (const [key, value] of Object.entries(applied)) {
                if (value && typeof value === 'object' && 'operand' in value)
                    applied[key] = Number(this.data[key] || 0) + Number(value.operand || 0);
            }
            this.data = options?.merge ? { ...this.data, ...applied } : applied;
        },
    };
}
function fakeDb() {
    const docs = new Map();
    const getDoc = (path) => {
        if (!docs.has(path))
            docs.set(path, fakeDoc());
        return docs.get(path);
    };
    return {
        docs,
        collection: (name) => ({ doc: (id) => getDoc(`${name}/${id}`) }),
        runTransaction: async (fn) => fn({
            get: async (ref) => ref.get(),
            set: (ref, data, options) => ref.set(data, options),
        }),
    };
}
describe('admin asset studio contract', () => {
    test('normalizes a safe DALL-E asset job draft with bounded fields and count', () => {
        expect((0, admin_asset_studio_1.normalizeAssetJobInput)({
            kind: 'quiz_level_card',
            title: '  Cinema quiz card  ',
            prompt: `Premium Phraseman level card, no text, app quality. ${'x'.repeat(5000)}`,
            targetPath: 'assets/images/quizzes/level_cards/quiz-card-easy-cinema.webp',
            slotKey: 'quiz-card-easy-cinema',
            count: 99,
            size: '1024x1024',
            quality: 'medium',
        })).toMatchObject({
            kind: 'quiz_level_card',
            title: 'Cinema quiz card',
            prompt: expect.stringContaining('Premium Phraseman level card'),
            targetPath: 'assets/images/quizzes/level_cards/quiz-card-easy-cinema.webp',
            slotKey: 'quiz-card-easy-cinema',
            count: 4,
            size: '1024x1024',
            quality: 'medium',
        });
    });
    test('rejects unsafe target paths and empty prompts before spending on image generation', () => {
        expect(() => (0, admin_asset_studio_1.normalizeAssetJobInput)({ prompt: '', targetPath: 'assets/images/x.webp' })).toThrow('prompt_required');
        expect(() => (0, admin_asset_studio_1.normalizeAssetJobInput)({ prompt: 'valid prompt', targetPath: '../secrets.txt' })).toThrow('target_path_invalid');
        expect(() => (0, admin_asset_studio_1.normalizeAssetJobInput)({ prompt: 'valid prompt', targetPath: 'functions/.env' })).toThrow('target_path_invalid');
    });
    test('builds a server-side OpenAI image request without exposing browser secrets', () => {
        const job = (0, admin_asset_studio_1.normalizeAssetJobInput)({
            prompt: 'Generate a small app icon, no text',
            size: '1024x1024',
            quality: 'low',
            count: 2,
        });
        expect((0, admin_asset_studio_1.buildOpenAiImageRequest)(job)).toEqual({
            model: 'gpt-image-1',
            prompt: 'Generate a small app icon, no text',
            size: '1024x1024',
            quality: 'low',
            output_format: 'png',
        });
    });
    test('uses the real image model in generated OpenAI requests', () => {
        const job = (0, admin_asset_studio_1.normalizeAssetJobInput)({ prompt: 'Generate an app asset' });
        expect((0, admin_asset_studio_1.buildOpenAiImageRequest)(job).model).toBe('gpt-image-1');
    });
    test('allows a stale running lease to be reclaimed but blocks a fresh running lease', () => {
        expect((0, admin_asset_studio_1.canClaimAssetRun)({ status: 'draft' }, 1000)).toBe(true);
        expect((0, admin_asset_studio_1.canClaimAssetRun)({ status: 'failed' }, 1000)).toBe(true);
        expect((0, admin_asset_studio_1.canClaimAssetRun)({ status: 'running', runLeaseExpiresAtMs: 900 }, 1000)).toBe(true);
        expect((0, admin_asset_studio_1.canClaimAssetRun)({ status: 'running', runLeaseExpiresAtMs: 1200 }, 1000)).toBe(false);
        expect((0, admin_asset_studio_1.canClaimAssetRun)({ status: 'generated' }, 1000)).toBe(false);
    });
    test('transactional claim allows exactly one fresh runner', async () => {
        const db = fakeDb();
        const ref = db.collection('admin_asset_jobs').doc('job-1');
        ref.data = { status: 'draft', prompt: 'Generate an app icon' };
        await (0, admin_asset_studio_1.claimAssetRun)(db, ref, 'attempt-1', { email: 'owner@example.com', actorUid: 'owner' }, 1000);
        await expect((0, admin_asset_studio_1.claimAssetRun)(db, ref, 'attempt-2', { email: 'owner@example.com', actorUid: 'owner' }, 1100)).rejects.toThrow('asset_job_not_runnable');
        expect(ref.data.runAttemptId).toBe('attempt-1');
    });
    test('transactional image budget reservation cannot exceed the configured daily cap', async () => {
        const db = fakeDb();
        await (0, admin_asset_studio_1.reserveImageBudget)(db, 2, 2, Date.parse('2033-05-18T12:00:00Z'));
        await expect((0, admin_asset_studio_1.reserveImageBudget)(db, 1, 2, Date.parse('2033-05-18T12:01:00Z'))).rejects.toThrow('image_assets_daily_cap_exceeded');
    });
    test('resumes only missing image slots after partial progress', () => {
        expect((0, admin_asset_studio_1.missingAssetSlots)(4, [{ slot: 1, gsPath: 'a' }, { slot: 3, gsPath: 'c' }])).toEqual([2, 4]);
    });
    test('sanitizes provider errors before storage or browser return', () => {
        const sanitized = (0, admin_asset_studio_1.sanitizeProviderError)(new Error('image_api_400: {"error":{"message":"secret provider body"}}'));
        expect(sanitized.publicMessage).toBe('image_provider_failed');
        expect(sanitized.diagnostic).toContain('image_api_400');
        expect(sanitized.diagnostic).not.toContain('secret provider body');
    });
    test('projects job documents without leaking raw OpenAI payloads', () => {
        const projected = (0, admin_asset_studio_1.projectAssetJob)('job-1', {
            title: 'Card',
            prompt: 'Prompt',
            rawResponse: { secret: 'hidden' },
            results: [{ gsPath: 'admin-asset-studio/job-1/generated-1.png' }],
            createdBy: 'owner@example.com',
        });
        expect(projected).toMatchObject({
            id: 'job-1',
            title: 'Card',
            prompt: 'Prompt',
            results: [{ gsPath: 'admin-asset-studio/job-1/generated-1.png', previewUrl: '' }],
            createdBy: 'owner@example.com',
        });
        expect(JSON.stringify(projected)).not.toContain('rawResponse');
        expect(JSON.stringify(projected)).not.toContain('hidden');
    });
});
//# sourceMappingURL=admin_asset_studio.test.js.map