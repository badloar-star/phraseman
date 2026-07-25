"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shadow_judge_repository_1 = require("./shadow_judge_repository");
const review_fingerprint_1 = require("./review_fingerprint");
class Snap {
    constructor(value) {
        this.value = value;
    }
    get exists() { return Boolean(this.value); }
    data() { return this.value; }
}
class Ref {
    constructor(path, store) {
        this.path = path;
        this.store = store;
    }
    async get() { return new Snap(this.store.get(this.path)); }
}
class Db {
    constructor() {
        this.store = new Map();
    }
    collection(name) { return { doc: (id) => new Ref(`${name}/${id}`, this.store) }; }
    doc(path) { return new Ref(path, this.store); }
    async runTransaction(fn) { return fn({ get: (ref) => ref.get(), set: (ref, value) => ref.store.set(ref.path, { ...(ref.store.get(ref.path) ?? {}), ...value }), update: (ref, value) => ref.store.set(ref.path, { ...(ref.store.get(ref.path) ?? {}), ...value }), create: (ref, value) => { if (ref.store.has(ref.path))
            throw new Error('exists'); ref.store.set(ref.path, value); } }); }
}
describe('shadow judge repository', () => {
    it('is fail-closed unless explicitly enabled with a positive cap and allowed model', () => { expect((0, shadow_judge_repository_1.parseShadowJudgeConfig)(null)).toEqual({ enabled: false, model: 'gpt-4.1-mini', dailyCap: 0, configError: null }); expect((0, shadow_judge_repository_1.parseShadowJudgeConfig)({ enabled: true, dailyCap: 3, model: 'gpt-4.1' })).toEqual({ enabled: true, dailyCap: 3, model: 'gpt-4.1', configError: null }); expect((0, shadow_judge_repository_1.parseShadowJudgeConfig)({ enabled: true, dailyCap: 3, model: 'unknown-expensive-model' })).toMatchObject({ enabled: false, configError: 'shadow_judge_model_not_allowed' }); expect((0, shadow_judge_repository_1.parseShadowJudgeConfig)({ enabled: true, dailyCap: 0 })).toMatchObject({ enabled: false }); });
    it('reserves idempotently and enforces a separate daily cap', async () => { const db = new Db(); const now = Date.UTC(2026, 6, 13); expect(await (0, shadow_judge_repository_1.reserveShadowJudgeBudget)(db, 'stage-1:a:request:1', 1, now)).toEqual({ reserved: true, replayed: false }); expect(await (0, shadow_judge_repository_1.reserveShadowJudgeBudget)(db, 'stage-1:a:request:1', 1, now)).toEqual({ reserved: true, replayed: true }); expect(await (0, shadow_judge_repository_1.reserveShadowJudgeBudget)(db, 'stage-2:b:request:1', 1, now)).toEqual({ reserved: false, replayed: false }); expect((0, shadow_judge_repository_1.shadowJudgeReservationId)('stage-1:a:request:1', now)).toMatch(/^2026-07-13_[a-f0-9]{48}$/); });
    it('commits a receipt only to the same needs-review artifact revision and fingerprint', async () => { const db = new Db(); const stage = { state: 'needs_review', revision: 2, kind: 'arena_questions', contentHash: 'a'.repeat(64) }; db.store.set('content_factory_stages/stage-1', stage); const fingerprint = (0, review_fingerprint_1.contentStageReviewFingerprint)('stage-1', stage); const base = { stageId: 'stage-1', expectedRevision: 2, expectedReviewFingerprint: fingerprint, receipt: { status: 'human_review_required' }, updatedAt: 2 }; expect(await (0, shadow_judge_repository_1.commitShadowJudgeReceipt)(db, { ...base, contentHash: 'b'.repeat(64) })).toBe(false); expect(await (0, shadow_judge_repository_1.commitShadowJudgeReceipt)(db, { ...base, contentHash: 'a'.repeat(64), expectedRevision: 3 })).toBe(false); expect(await (0, shadow_judge_repository_1.commitShadowJudgeReceipt)(db, { ...base, contentHash: 'a'.repeat(64) })).toBe(true); expect(db.store.get('content_factory_stages/stage-1')).toMatchObject({ contentHash: 'a'.repeat(64), judgeReceipt: { status: 'human_review_required' } }); });
});
//# sourceMappingURL=shadow_judge_repository.test.js.map