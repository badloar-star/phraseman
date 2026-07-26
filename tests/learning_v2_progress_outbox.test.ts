import { createProgressOutbox } from "../modules/learning-v2/progress/progress_outbox";
import type { ProgressStorage } from "../modules/learning-v2/progress/progress_store";

const makeStorage = (): ProgressStorage => { const values = new Map<string, string>(); return { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async (key) => { values.delete(key); } }; };
const scope = { stableId: "account-A", accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", generation: 4 };

describe("V2 progress outbox", () => {
  it("deduplicates mutations and acknowledges one terminal delayed result", async () => {
    const outbox = createProgressOutbox(makeStorage(), () => true);
    await outbox.enqueue(scope, "mutation-1", { kind: "scheduled_delayed_probe", candidate: true });
    const duplicate = await outbox.enqueue(scope, "mutation-1", { changed: true });
    expect(duplicate.payload).toEqual({ kind: "scheduled_delayed_probe", candidate: true });
    await outbox.acknowledge(scope, "mutation-1", "timed_finalized");
    await outbox.acknowledge(scope, "mutation-1", "protocol_rejected");
    expect(await outbox.list(scope)).toEqual([expect.objectContaining({ status: "terminal", terminalStatus: "timed_finalized" })]);
  });
  it("does not replay pending mutations from a stale account generation", async () => {
    const storage = makeStorage(); const outbox = createProgressOutbox(storage, () => true);
    await outbox.enqueue(scope, "mutation-2", { event: true });
    await outbox.purgeStaleGeneration({ stableId: "account-A", accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", generation: 5 });
    expect(await outbox.list({ stableId: "account-A", accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", generation: 5 })).toEqual([]);
  });
  it("keeps account B mutations separate from account A", async () => {
    const storage = makeStorage(); const outbox = createProgressOutbox(storage, () => true);
    await outbox.enqueue(scope, "a-1", { account: "A" });
    await outbox.enqueue({ stableId: "account-B", accountScopeHash: "bbbbbbbbbbbbbbbb", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", generation: 1 }, "b-1", { account: "B" });
    expect((await outbox.list(scope)).map((item) => item.mutationId)).toEqual(["a-1"]);
    expect((await outbox.list({ stableId: "account-B", accountScopeHash: "bbbbbbbbbbbbbbbb", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", generation: 1 })).map((item) => item.mutationId)).toEqual(["b-1"]);
  });
  it("keeps delayed candidates free of learning refs until terminal acknowledgement", async () => {
    const outbox = createProgressOutbox(makeStorage(), () => true);
    await expect(outbox.enqueue(scope, "delayed-1", { kind: "scheduled_delayed_probe", candidate: { nested: { learningEvidence: "forbidden" } } })).rejects.toThrow("delayed_candidate_learning_ref_forbidden");
  });
  it("requires the current-generation guard for every mutation", async () => {
    const storage = makeStorage(); const outbox = createProgressOutbox(storage, () => false);
    await expect(outbox.enqueue(scope, "stale-1", { event: true })).rejects.toThrow("progress_generation_stale");
    await expect(outbox.acknowledge(scope, "stale-1", "protocol_rejected")).rejects.toThrow("progress_generation_stale");
  });
  it("rejects unserializable payloads", async () => {
    const outbox = createProgressOutbox(makeStorage(), () => true);
    const circular: Record<string, unknown> = {}; circular.self = circular;
    await expect(outbox.enqueue(scope, "invalid-json", circular)).rejects.toThrow("progress_payload_invalid");
  });
  it("guards reads and purge operations", async () => {
    const outbox = createProgressOutbox(makeStorage(), () => false);
    await expect(outbox.list(scope)).rejects.toThrow("progress_generation_stale");
    await expect(outbox.purgeStaleGeneration(scope)).rejects.toThrow("progress_generation_stale");
  });
});
