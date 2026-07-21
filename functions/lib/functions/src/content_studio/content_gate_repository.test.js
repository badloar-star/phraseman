"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const content_gate_repository_1 = require("./content_gate_repository");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const subject = { entityType: "episode", entityId: "episode-1", entityRevision: 1, entityFingerprint: "a".repeat(64) };
class Store {
    constructor() {
        this.gates = [];
        this.receiptReader = { get: async (collection) => ({ receiptHash: collection.includes("validation") ? "b".repeat(64) : collection.includes("localization") ? "c".repeat(64) : "d".repeat(64), subject, status: collection.includes("validation") ? "passed" : "approved" }) };
    }
    async runTransaction(work) { return work(this); }
    async writeGate(_id, body) { this.gates.push(body); }
    async readOperation() { return this.operation; }
    async createOperation(_id, value) { this.operation = value; }
}
describe("Content gate receipt repository", () => {
    it("binds validation/localization/review hashes to an Episode subject and replays", async () => {
        const store = new Store();
        const repo = new content_gate_repository_1.ContentGateReceiptRepository(store, { actorId: "publisher-1" });
        const body = await repo.issue(subject, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r" }, "approve", "gate-1");
        expect(body.subject).toEqual(subject);
        expect(body.validationReceiptHash).toBe("b".repeat(64));
        await expect(repo.issue(subject, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r" }, "approve", "gate-1")).resolves.toEqual(body);
    });
    it("rejects a mismatched subject before writing a gate", async () => {
        const store = new Store();
        const repo = new content_gate_repository_1.ContentGateReceiptRepository(store, { actorId: "publisher-1" });
        await expect(repo.issue({ ...subject, entityFingerprint: "f".repeat(64) }, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r" }, "approve", "gate-2")).rejects.toThrow("content_gate_subject_mismatch");
        expect(store.gates).toHaveLength(0);
    });
    it("fails closed when the immutable object writer returns mismatched content hash", async () => {
        const store = new Store();
        store.objectWriter = { write: async () => ({ objectGeneration: "g1", byteSize: 10, contentHash: "f".repeat(64) }) };
        const repo = new content_gate_repository_1.ContentGateReceiptRepository(store, { actorId: "publisher-1" });
        await expect(repo.issue(subject, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r" }, "approve", "gate-3")).rejects.toThrow("content_gate_object_binding_invalid");
    });
    it("writes canonical bytes and verifies read-back hash/generation metadata", async () => {
        const store = new Store();
        const objects = new Map();
        store.objectWriter = {
            write: async (path, body) => {
                const bytes = new TextEncoder().encode((0, decision_registry_1.canonicalJsonV1)(body));
                objects.set(path, { bytes, generation: "g1" });
                return { objectGeneration: "g1", byteSize: bytes.byteLength, contentHash: (0, decision_registry_1.hashCanonicalBody)(body) };
            },
        };
        const repo = new content_gate_repository_1.ContentGateReceiptRepository(store, { actorId: "publisher-1" });
        const body = await repo.issue(subject, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r" }, "approve", "gate-storage");
        const object = objects.get("content-studio/gates/episode__episode-1__r1__" + subject.entityFingerprint + ".json");
        expect(object).toBeDefined();
        expect((0, decision_registry_1.hashCanonicalBody)(JSON.parse(new TextDecoder().decode(object.bytes)))).toBe((0, decision_registry_1.hashCanonicalBody)(body));
        expect(object.generation).toBe("g1");
    });
});
//# sourceMappingURL=content_gate_repository.test.js.map