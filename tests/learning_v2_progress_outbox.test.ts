import { createProgressOutbox } from "../modules/learning-v2/progress/progress_outbox";
import { progressAccountKey, type ProgressStorage } from "../modules/learning-v2/progress/progress_store";

const makeStorage = (): ProgressStorage & { values: Map<string, string> } => { const values = new Map<string, string>(); return { values, getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async (key) => { values.delete(key); } }; };
const scope = { stableId: "account-A", accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", generation: 4 };

describe("V2 progress outbox", () => {
  it("deduplicates mutations and acknowledges one terminal delayed result", async () => {
    const outbox = createProgressOutbox(makeStorage(), () => true);
    const item = await outbox.enqueue(scope, "mutation-1", { kind: "scheduled_delayed_probe", candidate: true });
    const duplicate = await outbox.enqueue(scope, "mutation-1", { kind: "scheduled_delayed_probe", candidate: true });
    expect(duplicate.payload).toEqual({ kind: "scheduled_delayed_probe", candidate: true });
    await expect(outbox.enqueue(scope, "mutation-1", { changed: true })).rejects.toThrow("progress_mutation_id_reused");
    await expect(outbox.acknowledge(scope, item, "timed_finalized")).resolves.toBe("recorded");
    await expect(outbox.acknowledge(scope, item, "timed_finalized")).resolves.toBe("already_recorded");
    await expect(outbox.acknowledge(scope, item, "protocol_rejected")).rejects.toThrow("progress_ack_state_conflict");
    expect(await outbox.list(scope)).toEqual([expect.objectContaining({ status: "terminal", terminalStatus: "timed_finalized" })]);
  });
  it("does not replay pending mutations from a stale account generation", async () => {
    const storage = makeStorage(); let generation = 4; const outbox = createProgressOutbox(storage, candidate => candidate.generation === generation);
    await outbox.enqueue(scope, "mutation-2", { event: true });
    generation = 5;
    await expect(outbox.list(scope)).rejects.toThrow("progress_generation_stale");
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
    await expect(outbox.acknowledge(scope, { mutationId: "stale-1", payloadFingerprint: "a".repeat(64) }, "protocol_rejected")).rejects.toThrow("progress_generation_stale");
  });
  it("rejects unserializable payloads", async () => {
    const outbox = createProgressOutbox(makeStorage(), () => true);
    const circular: Record<string, unknown> = {}; circular.self = circular;
    await expect(outbox.enqueue(scope, "invalid-json", circular)).rejects.toThrow("progress_payload_invalid");
  });
  it("guards reads", async () => {
    const outbox = createProgressOutbox(makeStorage(), () => false);
    await expect(outbox.list(scope)).rejects.toThrow("progress_generation_stale");
  });

  it("never evicts an older pending item when capacity is exhausted", async () => {
    const storage = makeStorage(); const outbox = createProgressOutbox(storage, () => true);
    for (let index = 0; index < 128; index += 1) await outbox.enqueue(scope, `mutation-${index}`, { index });
    await expect(outbox.enqueue(scope, "mutation-overflow", { overflow: true })).rejects.toThrow("progress_outbox_capacity");
    const items = await outbox.list(scope);
    expect(items).toHaveLength(128);
    expect(items[0].mutationId).toBe("mutation-0");
  });

  it("serializes parallel enqueues for the same account key", async () => {
    const storage = makeStorage(); const outbox = createProgressOutbox(storage, () => true);
    await Promise.all([
      outbox.enqueue(scope, "parallel-1", { order: 1 }),
      outbox.enqueue(scope, "parallel-2", { order: 2 }),
    ]);
    expect((await outbox.list(scope)).map(item => item.mutationId).sort()).toEqual(["parallel-1", "parallel-2"]);
  });
  it("uses canonical payload identity and rejects non-JSON coercions", async () => {
    const outbox = createProgressOutbox(makeStorage(), () => true);
    const first = await outbox.enqueue(scope, "canonical-1", { beta: 2, alpha: { nested: [1, 2] } });
    const reordered = await outbox.enqueue(scope, "canonical-1", { alpha: { nested: [1, 2] }, beta: 2 });
    expect(Object.isFrozen(first.payload)).toBe(true);
    expect(Object.isFrozen((first.payload as { alpha: { nested: number[] } }).alpha)).toBe(true);
    expect(Object.isFrozen((first.payload as { alpha: { nested: number[] } }).alpha.nested)).toBe(true);
    expect(reordered.payloadFingerprint).toBe(first.payloadFingerprint);
    await expect(outbox.enqueue(scope, "canonical-1", { alpha: 1, beta: 2 })).rejects.toThrow("progress_mutation_id_reused");
    await expect(outbox.enqueue(scope, "nan", { value: Number.NaN })).rejects.toThrow("progress_payload_invalid");
    await expect(outbox.enqueue(scope, "date", { value: new Date(0) })).rejects.toThrow("progress_payload_invalid");
    await expect(outbox.enqueue(scope, "undefined", { value: undefined })).rejects.toThrow("progress_payload_invalid");
  });
  it("binds accepted and terminal acknowledgements to the exact payload fingerprint", async () => {
    const storage = makeStorage(); const outbox = createProgressOutbox(storage, () => true);
    const item = await outbox.enqueue(scope, "ack-1", { attempt: 1 });
    await expect(outbox.completeAccepted(scope, { ...item, payloadFingerprint: "f".repeat(64) })).rejects.toThrow("progress_mutation_payload_conflict");
    expect((await outbox.list(scope)).map(candidate => candidate.mutationId)).toEqual(["ack-1"]);
    await expect(outbox.completeAccepted(scope, item)).resolves.toBe("removed");
    await expect(outbox.completeAccepted(scope, item)).resolves.toBe("already_removed");
  });
  it("preserves an enqueue that races with accepted compaction", async () => {
    const storage = makeStorage(); const outbox = createProgressOutbox(storage, () => true);
    const first = await outbox.enqueue(scope, "race-ack", { order: 1 });
    await Promise.all([
      outbox.completeAccepted(scope, first),
      outbox.enqueue(scope, "race-suffix", { order: 2 }),
    ]);
    expect((await outbox.list(scope)).map(item => item.mutationId)).toEqual(["race-suffix"]);
  });
  it("shares serialization across two storage wrappers over one backend", async () => {
    const values = new Map<string, string>();
    const wrapper = (): ProgressStorage => ({
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async (key) => { values.delete(key); },
    });
    const first = createProgressOutbox(wrapper(), () => true);
    const second = createProgressOutbox(wrapper(), () => true);
    await Promise.all([
      first.enqueue(scope, "wrapper-1", { order: 1 }),
      second.enqueue(scope, "wrapper-2", { order: 2 }),
    ]);
    expect((await first.list(scope)).map(item => item.mutationId).sort()).toEqual(["wrapper-1", "wrapper-2"]);
  });
  it("migrates legacy pending entries and drops only old terminal markers without status", async () => {
    const storage = makeStorage();
    const accountKey = progressAccountKey(scope);
    const legacyKey = `v2:outbox:v1:${accountKey}`;
    storage.values.set(legacyKey, JSON.stringify([
      { mutationId: "legacy-terminal", accountKey, accountGeneration: scope.generation, payload: { done: true }, status: "terminal" },
      { mutationId: "legacy-pending", accountKey, accountGeneration: scope.generation, payload: { text: "😀".repeat(1000) }, status: "pending" },
    ]));
    const outbox = createProgressOutbox(storage, () => true);
    expect((await outbox.list(scope)).map(item => item.mutationId)).toEqual(["legacy-pending"]);
    await outbox.enqueue(scope, "new-after-migration", { current: true });
    expect(storage.values.has(legacyKey)).toBe(false);
    expect((await outbox.list(scope)).map(item => item.mutationId)).toEqual(["legacy-pending", "new-after-migration"]);
  });
  it("drains legacy payloads that exceed the new UTF-8 bound without creating unreadable v2", async () => {
    const storage = makeStorage(); const accountKey = progressAccountKey(scope);
    const legacyKey = `v2:outbox:v1:${accountKey}`;
    storage.values.set(legacyKey, JSON.stringify([{ mutationId: "large-legacy", accountKey, accountGeneration: scope.generation, payload: { text: "😀".repeat(20_000) }, status: "pending" }]));
    const outbox = createProgressOutbox(storage, () => true);
    const legacy = (await outbox.list(scope))[0];
    await outbox.enqueue(scope, "new-behind-large", { current: true });
    expect(storage.values.has(legacyKey)).toBe(true);
    expect((await outbox.list(scope)).map(item => item.mutationId)).toEqual(["large-legacy", "new-behind-large"]);
    await outbox.completeAccepted(scope, legacy);
    expect(storage.values.has(legacyKey)).toBe(false);
    expect((await outbox.list(scope)).map(item => item.mutationId)).toEqual(["new-behind-large"]);
  });
  it("keeps non-canonical legacy Unicode readable until it is drained", async () => {
    const storage = makeStorage(); const accountKey = progressAccountKey(scope);
    const legacyKey = `v2:outbox:v1:${accountKey}`;
    storage.values.set(legacyKey, JSON.stringify([{ mutationId: "unicode-legacy", accountKey, accountGeneration: scope.generation, payload: { text: "e\u0301" }, status: "pending" }]));
    const outbox = createProgressOutbox(storage, () => true);
    const legacy = (await outbox.list(scope))[0];
    await outbox.enqueue(scope, "new-behind-unicode", { current: true });
    expect((await outbox.list(scope)).map(item => item.mutationId)).toEqual(["unicode-legacy", "new-behind-unicode"]);
    await outbox.completeAccepted(scope, legacy);
    expect((await outbox.list(scope)).map(item => item.mutationId)).toEqual(["new-behind-unicode"]);
  });
  it("keeps v2 authoritative when both keys exist and cleanup of legacy fails", async () => {
    const storage = makeStorage(); const accountKey = progressAccountKey(scope);
    const legacyKey = `v2:outbox:v1:${accountKey}`;
    storage.values.set(legacyKey, JSON.stringify([{ mutationId: "legacy-only", accountKey, accountGeneration: scope.generation, payload: {}, status: "pending" }]));
    const cleanupFailing: ProgressStorage = { getItem: storage.getItem, setItem: storage.setItem, removeItem: async () => { throw new Error("cleanup_failed"); } };
    const repository = createProgressOutbox(cleanupFailing, () => true);
    await repository.enqueue(scope, "v2-wins", { current: true });
    expect(storage.values.has(legacyKey)).toBe(true);
    expect((await repository.list(scope)).map(item => item.mutationId)).toEqual(["legacy-only", "v2-wins"]);
  });
  it("preserves explicit legacy terminal status and rejects accepted-vs-terminal conflict", async () => {
    const storage = makeStorage(); const accountKey = progressAccountKey(scope);
    storage.values.set(`v2:outbox:v1:${accountKey}`, JSON.stringify([{ mutationId: "legacy-rejected", accountKey, accountGeneration: scope.generation, payload: {}, status: "terminal", terminalStatus: "protocol_rejected" }]));
    const repository = createProgressOutbox(storage, () => true);
    const terminal = (await repository.list(scope))[0];
    expect(terminal).toEqual(expect.objectContaining({ terminalStatus: "protocol_rejected" }));
    await expect(repository.completeAccepted(scope, terminal)).rejects.toThrow("progress_ack_state_conflict");
  });
  it("clears both legacy and v2 keys", async () => {
    const storage = makeStorage(); const accountKey = progressAccountKey(scope);
    storage.values.set(`v2:outbox:v1:${accountKey}`, JSON.stringify([]));
    const repository = createProgressOutbox(storage, () => true);
    await repository.enqueue(scope, "clear-current", { current: true });
    await repository.clear(scope);
    expect(storage.values.has(`v2:outbox:v1:${accountKey}`)).toBe(false);
    expect(storage.values.has(`v2:outbox:v2:${accountKey}`)).toBe(false);
  });
  it("bounds terminal diagnostics without ever evicting pending work", async () => {
    const repository = createProgressOutbox(makeStorage(), () => true);
    for (let index = 0; index < 33; index += 1) {
      const item = await repository.enqueue(scope, `terminal-${index}`, { index });
      await repository.acknowledge(scope, item, "protocol_rejected");
    }
    const terminal = await repository.list(scope);
    expect(terminal).toHaveLength(32);
    expect(terminal[0].mutationId).toBe("terminal-1");
    const pending = await repository.enqueue(scope, "pending-after-terminals", { current: true });
    expect((await repository.list(scope)).find(item => item.mutationId === pending.mutationId)?.status).toBe("pending");
  });
  it("compacts legacy terminal diagnostics first when an incompatible pending item keeps v1 active", async () => {
    const storage = makeStorage(); const accountKey = progressAccountKey(scope);
    const terminal = Array.from({ length: 127 }, (_, index) => ({ mutationId: `legacy-terminal-${index}`, accountKey, accountGeneration: scope.generation, payload: { index }, status: "terminal", terminalStatus: "protocol_rejected" }));
    storage.values.set(`v2:outbox:v1:${accountKey}`, JSON.stringify([...terminal, { mutationId: "legacy-large-pending", accountKey, accountGeneration: scope.generation, payload: { text: "😀".repeat(20_000) }, status: "pending" }]));
    const repository = createProgressOutbox(storage, () => true);
    await repository.enqueue(scope, "new-pending-after-legacy-cap", { current: true });
    const items = await repository.list(scope);
    expect(items).toHaveLength(128);
    expect(items.filter(item => item.status === "pending").map(item => item.mutationId)).toEqual(["legacy-large-pending", "new-pending-after-legacy-cap"]);
  });
  it("serializes enqueue before clear so a completed wipe cannot resurrect it", async () => {
    const backing = makeStorage();
    let releaseWrite: (() => void) | undefined;
    let writeStarted: (() => void) | undefined;
    const writeStartedPromise = new Promise<void>((resolve) => { writeStarted = resolve; });
    const gate = new Promise<void>((resolve) => { releaseWrite = resolve; });
    let writes = 0;
    const storage: ProgressStorage = {
      getItem: backing.getItem,
      setItem: async (key, value) => { writes += 1; if (writes === 1) { writeStarted?.(); await gate; } await backing.setItem(key, value); },
      removeItem: backing.removeItem,
    };
    const repository = createProgressOutbox(storage, () => true);
    const enqueue = repository.enqueue(scope, "before-clear", { old: true });
    await writeStartedPromise;
    const clear = repository.clear(scope);
    releaseWrite?.();
    await Promise.all([enqueue, clear]);
    expect(await repository.list(scope)).toEqual([]);
  });
  it("fails closed on corrupt v2 and never falls back to legacy", async () => {
    const storage = makeStorage(); const accountKey = progressAccountKey(scope);
    storage.values.set(`v2:outbox:v2:${accountKey}`, "not-json");
    storage.values.set(`v2:outbox:v1:${accountKey}`, JSON.stringify([{ mutationId: "must-not-replay", accountKey, accountGeneration: scope.generation, payload: {}, status: "pending" }]));
    await expect(createProgressOutbox(storage, () => true).list(scope)).rejects.toThrow("progress_outbox_corrupt");
  });
  it("releases the repository lock after a failed durable write", async () => {
    const backing = makeStorage(); let fail = true;
    const storage: ProgressStorage = {
      getItem: backing.getItem,
      removeItem: backing.removeItem,
      setItem: async (key, value) => { if (fail) { fail = false; throw new Error("disk_full"); } await backing.setItem(key, value); },
    };
    const outbox = createProgressOutbox(storage, () => true);
    await expect(outbox.enqueue(scope, "failed-write", { order: 1 })).rejects.toThrow("disk_full");
    await expect(outbox.enqueue(scope, "retry-write", { order: 2 })).resolves.toEqual(expect.objectContaining({ mutationId: "retry-write" }));
  });
  it("poisons an indeterminate storage key instead of holding its lock forever", async () => {
    const hungScope = { ...scope, accountScopeHash: "cccccccccccccccc", generation: 99 };
    const storage: ProgressStorage = {
      operationTimeoutMs: 20,
      getItem: async () => new Promise<string | null>(() => undefined),
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };
    const repository = createProgressOutbox(storage, () => true);
    await expect(repository.list(hungScope)).rejects.toThrow("progress_storage_indeterminate");
    await expect(repository.list(hungScope)).rejects.toThrow("progress_storage_indeterminate");
  });
  it("keeps a no-timeout storage lock leased until native I/O actually settles", async () => {
    let releaseRead: ((value: string | null) => void) | undefined;
    let reads = 0;
    const storage: ProgressStorage = {
      operationTimeoutMs: null,
      getItem: async () => {
        reads += 1;
        if (reads > 1) return null;
        return new Promise<string | null>((resolve) => { releaseRead = resolve; });
      },
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };
    const noTimeoutScope = { ...scope, accountScopeHash: "dddddddddddddddd", generation: 100 };
    let settled = false;
    const pending = createProgressOutbox(storage, () => true).list(noTimeoutScope)
      .finally(() => { settled = true; });
    await Promise.resolve();
    await Promise.resolve();
    expect(releaseRead).toBeDefined();
    expect(settled).toBe(false);
    releaseRead?.(null);
    await expect(pending).resolves.toEqual([]);
  });
});
