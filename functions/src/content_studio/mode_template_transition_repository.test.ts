import { ModeTemplateLifecycleTransitionRepository, type ModeTemplateLifecycleStore } from "./mode_template_transition_repository";
import type { ModeTemplateLifecycleHead, PublishedModeTemplateRef } from "../../../modules/learning-v2/contracts/activity";
import type { ModeTemplateReceiptDocumentReader } from "./mode_template_transition_reader";

const hash = "a".repeat(64);
const ref: PublishedModeTemplateRef = { templateId: "template-1", version: 1, contentHash: hash };
const lifecycle = (): ModeTemplateLifecycleHead => ({
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
const receiptReader: ModeTemplateReceiptDocumentReader = {
  get: async (collection, id) => {
    const subject = { entityType: "mode_template", entityId: "template-1", entityRevision: 1, entityFingerprint: hash } as const;
    if (collection.endsWith("validation_receipts") && id === "v") return { receiptHash: "b".repeat(64), subject, status: "passed" };
    if (collection.endsWith("localization_receipts") && id === "l") return { receiptHash: "c".repeat(64), subject, status: "approved" };
    if (collection.endsWith("review_receipts") && id === "r") return { receiptHash: "d".repeat(64), subject, status: "approved" };
    if (collection.endsWith("gate_receipts") && id === "g") return {
      schemaVersion: "content-gate-receipt-body.v1", gateKind: "approval", subject,
      validationReceiptHash: "b".repeat(64), localizationReceiptSetHash: "c".repeat(64), reviewReceiptHash: "d".repeat(64), waiverSetHash: "e".repeat(64), evaluatedBy: "publisher-1", evaluatedAt: "2026-07-16T00:00:00.000Z",
    };
    return undefined;
  },
};

class MemoryStore implements ModeTemplateLifecycleStore {
  current = lifecycle();
  readonly lifecycles = new Map<string, ModeTemplateLifecycleHead>();
  readonly audits: unknown[] = [];
  readonly operations = new Map<string, { requestFingerprint: string; lifecycle: ModeTemplateLifecycleHead }>();
  readonly receiptReader = receiptReader;
  async runTransaction<T>(work: (tx: ModeTemplateLifecycleStore) => Promise<T>): Promise<T> { return work(this); }
  async readLifecycle(templateId: string, version: number): Promise<ModeTemplateLifecycleHead | undefined> {
    if (templateId === "template-1" && version === 1) return this.current;
    return this.lifecycles.get(`${templateId}__v${version}`);
  }
  async readTemplateVersion(templateId: string, version: number): Promise<PublishedModeTemplateRef | undefined> {
    return templateId === "template-2" && version === 1 ? { templateId, version, contentHash: "b".repeat(64) } : undefined;
  }
  async hasUnsealedEpisodeDraftForTemplate(): Promise<boolean> { return false; }
  async compareAndSetLifecycle(_templateId: string, _version: number, expected: number, next: ModeTemplateLifecycleHead): Promise<void> {
    if (this.current.lifecycleRevision !== expected) throw new Error("mode_template_lifecycle_stale");
    this.current = next;
  }
  async appendAudit(event: unknown): Promise<void> { this.audits.push(event); }
  async readOperation(operationId: string) { return this.operations.get(operationId); }
  async createOperation(operationId: string, value: { requestFingerprint: string; lifecycle: ModeTemplateLifecycleHead }): Promise<void> {
    if (this.operations.has(operationId)) throw new Error("idempotency_key_reused");
    this.operations.set(operationId, value);
  }
}

describe("ModeTemplate lifecycle transition repository", () => {
  it("publishes only after server-owned receipt gate and appends audit", async () => {
    const store = new MemoryStore();
    const repo = new ModeTemplateLifecycleTransitionRepository(store, { actorId: "publisher-1" });
    const next = await repo.publish(ref, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r", gateReceiptId: "g" }, 1, "publish", "op-publish-1");
    expect(next.status).toBe("published");
    expect(store.audits).toHaveLength(1);
  });

  it("rejects stale lifecycle revision and missing receipts", async () => {
    const store = new MemoryStore();
    const repo = new ModeTemplateLifecycleTransitionRepository(store, { actorId: "publisher-1" });
    await expect(repo.publish(ref, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "missing", gateReceiptId: "g" }, 1, "publish", "op-missing")).rejects.toThrow("mode_template_gate_receipt_missing");
    await expect(repo.publish(ref, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r", gateReceiptId: "g" }, 2, "publish", "op-stale")).rejects.toThrow("mode_template_lifecycle_stale");
  });

  it("replays the same idempotency key and rejects a changed request", async () => {
    const store = new MemoryStore();
    const repo = new ModeTemplateLifecycleTransitionRepository(store, { actorId: "publisher-1" });
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
    const repo = new ModeTemplateLifecycleTransitionRepository(store, { actorId: "publisher-1" });
    const replacement = { templateId: "template-2", version: 1, contentHash: "b".repeat(64) };
    store.lifecycles.set("template-2__v1", { schemaVersion: "v2-mode-template-lifecycle.v1", templateId: "template-2", version: 1, contentHash: replacement.contentHash, status: "published", reason: "ready", changedBy: "publisher-1", changedAt: "2026-07-16T00:00:00.000Z", lifecycleRevision: 1 });
    const next = await repo.deprecate(ref, 1, "replaced", replacement, "op-deprecate-1");
    expect(next.status).toBe("deprecated");
    expect(next.replacementRef).toEqual(replacement);
    const second = new MemoryStore();
    second.current = { ...second.current, status: "published" };
    const repo2 = new ModeTemplateLifecycleTransitionRepository(second, { actorId: "publisher-1" });
    await expect(repo2.deprecate(ref, 1, "replaced", { ...replacement, contentHash: "c".repeat(64) }, "op-deprecate-2")).rejects.toThrow("mode_template_replacement_unresolved");
  });

  it("archives only a deprecated template and replays idempotently", async () => {
    const store = new MemoryStore();
    store.current = { ...store.current, status: "deprecated", noReplacement: true };
    const repo = new ModeTemplateLifecycleTransitionRepository(store, { actorId: "reviewer-1" });
    const archived = await repo.archive(ref, 1, "retired", "op-archive-1");
    expect(archived.status).toBe("archived");
    await expect(repo.archive(ref, 1, "retired", "op-archive-1")).resolves.toMatchObject({ status: "archived" });
    const published = new MemoryStore();
    const publisherRepo = new ModeTemplateLifecycleTransitionRepository(published, { actorId: "reviewer-1" });
    await expect(publisherRepo.archive(ref, 1, "retired", "op-archive-2")).rejects.toThrow("mode_template_archive_status_invalid");
  });
});
