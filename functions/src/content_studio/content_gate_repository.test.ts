import type { ContentGateReceiptBody, ContentReceiptSubject } from "../../../modules/learning-v2/contracts/content_studio";
import { ContentGateReceiptRepository, type ContentGateIssueStore, type ContentGateObjectWriter } from "./content_gate_repository";
import { canonicalJsonV1, hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

const subject: ContentReceiptSubject = { entityType: "episode", entityId: "episode-1", entityRevision: 1, entityFingerprint: "a".repeat(64) };
class Store implements ContentGateIssueStore {
  objectWriter?: ContentGateObjectWriter;
  gates: ContentGateReceiptBody[] = [];
  operation?: { requestFingerprint: string; body: ContentGateReceiptBody };
  receiptReader = { get: async (collection: string) => ({ receiptHash: collection.includes("validation") ? "b".repeat(64) : collection.includes("localization") ? "c".repeat(64) : "d".repeat(64), subject, status: collection.includes("validation") ? "passed" : "approved" }) };
  async runTransaction<T>(work: (tx: ContentGateIssueStore) => Promise<T>): Promise<T> { return work(this); }
  async writeGate(_id: string, body: ContentGateReceiptBody): Promise<void> { this.gates.push(body); }
  async readOperation(): Promise<{ requestFingerprint: string; body: ContentGateReceiptBody } | undefined> { return this.operation; }
  async createOperation(_id: string, value: { requestFingerprint: string; body: ContentGateReceiptBody }): Promise<void> { this.operation = value; }
}

describe("Content gate receipt repository", () => {
  it("binds validation/localization/review hashes to an Episode subject and replays", async () => {
    const store = new Store();
    const repo = new ContentGateReceiptRepository(store, { actorId: "publisher-1" });
    const body = await repo.issue(subject, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r" }, "approve", "gate-1");
    expect(body.subject).toEqual(subject);
    expect(body.validationReceiptHash).toBe("b".repeat(64));
    await expect(repo.issue(subject, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r" }, "approve", "gate-1")).resolves.toEqual(body);
  });

  it("rejects a mismatched subject before writing a gate", async () => {
    const store = new Store();
    const repo = new ContentGateReceiptRepository(store, { actorId: "publisher-1" });
    await expect(repo.issue({ ...subject, entityFingerprint: "f".repeat(64) }, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r" }, "approve", "gate-2")).rejects.toThrow("content_gate_subject_mismatch");
    expect(store.gates).toHaveLength(0);
  });

  it("fails closed when the immutable object writer returns mismatched content hash", async () => {
    const store = new Store();
    store.objectWriter = { write: async () => ({ objectGeneration: "g1", byteSize: 10, contentHash: "f".repeat(64) }) };
    const repo = new ContentGateReceiptRepository(store, { actorId: "publisher-1" });
    await expect(repo.issue(subject, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r" }, "approve", "gate-3")).rejects.toThrow("content_gate_object_binding_invalid");
  });

  it("writes canonical bytes and verifies read-back hash/generation metadata", async () => {
    const store = new Store();
    const objects = new Map<string, { bytes: Uint8Array; generation: string }>();
    store.objectWriter = {
      write: async (path, body) => {
        const bytes = new TextEncoder().encode(canonicalJsonV1(body));
        objects.set(path, { bytes, generation: "g1" });
        return { objectGeneration: "g1", byteSize: bytes.byteLength, contentHash: hashCanonicalBody(body) };
      },
    };
    const repo = new ContentGateReceiptRepository(store, { actorId: "publisher-1" });
    const body = await repo.issue(subject, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r" }, "approve", "gate-storage");
    const object = objects.get("content-studio/gates/episode__episode-1__r1__" + subject.entityFingerprint + ".json");
    expect(object).toBeDefined();
    expect(hashCanonicalBody(JSON.parse(new TextDecoder().decode(object!.bytes)))).toBe(hashCanonicalBody(body));
    expect(object!.generation).toBe("g1");
  });
});
