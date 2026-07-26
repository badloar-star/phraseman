"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mode_template_transition_repository_1 = require("./mode_template_transition_repository");
const hash = "a".repeat(64);
const ref = { templateId: "template-1", version: 1, contentHash: hash };
const lifecycle = () => ({
    schemaVersion: "v2-mode-template-lifecycle.v1",
    templateId: "template-1",
    version: 1,
    contentHash: hash,
    status: "approved",
    reason: "reviewed",
    changedBy: "reviewer-1",
    changedAt: "2026-07-16T00:00:00.000Z",
    lifecycleRevision: 1,
});
const receiptReader = {
    get: async (collection, id) => {
        const subject = { entityType: "mode_template", entityId: "template-1", entityRevision: 1, entityFingerprint: hash };
        if (collection.endsWith("validation_receipts") && id === "v")
            return { receiptHash: "b".repeat(64), subject, status: "passed" };
        if (collection.endsWith("localization_receipts") && id === "l")
            return { receiptHash: "c".repeat(64), subject, status: "approved" };
        if (collection.endsWith("review_receipts") && id === "r")
            return { receiptHash: "d".repeat(64), subject, status: "approved" };
        if (collection.endsWith("gate_receipts") && id === "g")
            return {
                schemaVersion: "content-gate-receipt-body.v1", gateKind: "approval", subject,
                validationReceiptHash: "b".repeat(64), localizationReceiptSetHash: "c".repeat(64), reviewReceiptHash: "d".repeat(64), waiverSetHash: "e".repeat(64), evaluatedBy: "publisher-1", evaluatedAt: "2026-07-16T00:00:00.000Z",
            };
        return undefined;
    },
};
class MemoryStore {
    constructor() {
        this.current = lifecycle();
        this.lifecycles = new Map();
        this.audits = [];
        this.operations = new Map();
        this.receiptReader = receiptReader;
    }
    async runTransaction(work) { return work(this); }
    async readLifecycle(templateId, version) {
        if (templateId === "template-1" && version === 1)
            return this.current;
        return this.lifecycles.get(`${templateId}__v${version}`);
    }
    async readTemplateVersion(templateId, version) {
        return templateId === "template-2" && version === 1 ? { templateId, version, contentHash: "b".repeat(64) } : undefined;
    }
    async hasUnsealedEpisodeDraftForTemplate() { return false; }
    async compareAndSetLifecycle(_templateId, _version, expected, next) {
        if (this.current.lifecycleRevision !== expected)
            throw new Error("mode_template_lifecycle_stale");
        this.current = next;
    }
    async appendAudit(event) { this.audits.push(event); }
    async readOperation(operationId) { return this.operations.get(operationId); }
    async createOperation(operationId, value) {
        if (this.operations.has(operationId))
            throw new Error("idempotency_key_reused");
        this.operations.set(operationId, value);
    }
}
describe("ModeTemplate lifecycle transition repository", () => {
    it("publishes only after server-owned receipt gate and appends audit", async () => {
        const store = new MemoryStore();
        const repo = new mode_template_transition_repository_1.ModeTemplateLifecycleTransitionRepository(store, { actorId: "publisher-1" });
        const next = await repo.publish(ref, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r", gateReceiptId: "g" }, 1, "publish", "op-publish-1");
        expect(next.status).toBe("published");
        expect(store.audits).toHaveLength(1);
    });
    it("rejects stale lifecycle revision and missing receipts", async () => {
        const store = new MemoryStore();
        const repo = new mode_template_transition_repository_1.ModeTemplateLifecycleTransitionRepository(store, { actorId: "publisher-1" });
        await expect(repo.publish(ref, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "missing", gateReceiptId: "g" }, 1, "publish", "op-missing")).rejects.toThrow("mode_template_gate_receipt_missing");
        await expect(repo.publish(ref, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r", gateReceiptId: "g" }, 2, "publish", "op-stale")).rejects.toThrow("mode_template_lifecycle_stale");
    });
    it("replays the same idempotency key and rejects a changed request", async () => {
        const store = new MemoryStore();
        const repo = new mode_template_transition_repository_1.ModeTemplateLifecycleTransitionRepository(store, { actorId: "publisher-1" });
        const input = { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r", gateReceiptId: "g" };
        await repo.publish(ref, input, 1, "publish", "op-replay");
        const replay = await repo.publish(ref, input, 1, "publish", "op-replay");
        expect(replay.lifecycleRevision).toBe(2);
        await expect(repo.publish(ref, { ...input, gateReceiptId: "different-gate" }, 1, "publish", "op-replay")).rejects.toThrow("idempotency_key_reused");
        await expect(repo.publish(ref, input, 1, "changed", "op-replay")).rejects.toThrow("idempotency_key_reused");
    });
    it("deprecates with a resolved published replacement and rejects unresolved target", async () => {
        const store = new MemoryStore();
        store.current = { ...store.current, status: "published" };
        const repo = new mode_template_transition_repository_1.ModeTemplateLifecycleTransitionRepository(store, { actorId: "publisher-1" });
        const replacement = { templateId: "template-2", version: 1, contentHash: "b".repeat(64) };
        store.lifecycles.set("template-2__v1", { schemaVersion: "v2-mode-template-lifecycle.v1", templateId: "template-2", version: 1, contentHash: replacement.contentHash, status: "published", reason: "ready", changedBy: "publisher-1", changedAt: "2026-07-16T00:00:00.000Z", lifecycleRevision: 1 });
        const next = await repo.deprecate(ref, 1, "replaced", replacement, "op-deprecate-1");
        expect(next.status).toBe("deprecated");
        expect(next.replacementRef).toEqual(replacement);
        const second = new MemoryStore();
        second.current = { ...second.current, status: "published" };
        const repo2 = new mode_template_transition_repository_1.ModeTemplateLifecycleTransitionRepository(second, { actorId: "publisher-1" });
        await expect(repo2.deprecate(ref, 1, "replaced", { ...replacement, contentHash: "c".repeat(64) }, "op-deprecate-2")).rejects.toThrow("mode_template_replacement_unresolved");
    });
    it("archives only a deprecated template and replays idempotently", async () => {
        const store = new MemoryStore();
        store.current = { ...store.current, status: "deprecated", noReplacement: true };
        const repo = new mode_template_transition_repository_1.ModeTemplateLifecycleTransitionRepository(store, { actorId: "reviewer-1" });
        const archived = await repo.archive(ref, 1, "retired", "op-archive-1");
        expect(archived.status).toBe("archived");
        await expect(repo.archive(ref, 1, "retired", "op-archive-1")).resolves.toMatchObject({ status: "archived" });
        const published = new MemoryStore();
        const publisherRepo = new mode_template_transition_repository_1.ModeTemplateLifecycleTransitionRepository(published, { actorId: "reviewer-1" });
        await expect(publisherRepo.archive(ref, 1, "retired", "op-archive-2")).rejects.toThrow("mode_template_archive_status_invalid");
    });
});
//# sourceMappingURL=mode_template_transition_repository.test.js.map