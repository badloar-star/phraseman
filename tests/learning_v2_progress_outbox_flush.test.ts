import {
  createProgressOutboxFlusher,
  type ProgressOutboxSubmitDisposition,
} from "../modules/learning-v2/progress/progress_outbox_flush";
import { createProgressOutbox, type ProgressOutboxItem } from "../modules/learning-v2/progress/progress_outbox";
import type { ProgressStorage } from "../modules/learning-v2/progress/progress_store";

const makeStorage = (): ProgressStorage & { values: Map<string, string> } => {
  const values = new Map<string, string>();
  return {
    values,
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
};

const scope = {
  stableId: "account-A",
  accountScopeHash: "aaaaaaaaaaaaaaaa",
  seasonId: "season-1",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  generation: 2,
};

const accepted = (
  item: { mutationId: string; payloadFingerprint: string },
  duplicate = false,
): ProgressOutboxSubmitDisposition => ({
  kind: "accepted",
  mutationId: item.mutationId,
  payloadFingerprint: item.payloadFingerprint,
  duplicate,
  receipt: {
    schemaVersion: "v2-progress-outbox-server-receipt.v1",
    receiptId: `receipt:${item.mutationId}`,
    receiptFingerprint: "a".repeat(64),
  },
});
const persistAck = async (): Promise<void> => undefined;

describe("Learning V2 progress outbox flush", () => {
  it("keeps the oldest pending mutation when offline and stops in FIFO order", async () => {
    const storage = makeStorage();
    const repository = createProgressOutbox(storage, () => true);
    await repository.enqueue(scope, "mutation-1", { order: 1 });
    await repository.enqueue(scope, "mutation-2", { order: 2 });
    const submitted: string[] = [];
    const flusher = createProgressOutboxFlusher({
      scope,
      repository,
      isCurrentGeneration: () => true,
      submit: async (item) => { submitted.push(item.mutationId); throw new Error("offline"); },
      classifyError: () => ({ kind: "retryable" }),
      persistAcknowledgementIdempotently: persistAck,
    });

    await expect(flusher.flush()).resolves.toMatchObject({
      accepted: 0,
      duplicates: 0,
      terminalRejected: 0,
      remainingPending: 2,
      stoppedBy: "retryable_failure",
    });
    expect(submitted).toEqual(["mutation-1"]);
    expect((await repository.list(scope)).map((item) => item.mutationId)).toEqual(["mutation-1", "mutation-2"]);
  });

  it("compacts exact accepted and duplicate acknowledgements", async () => {
    const repository = createProgressOutbox(makeStorage(), () => true);
    await repository.enqueue(scope, "mutation-1", { order: 1 });
    await repository.enqueue(scope, "mutation-2", { order: 2 });
    const flusher = createProgressOutboxFlusher({
      scope,
      repository,
      isCurrentGeneration: () => true,
      submit: async (item) => accepted(item, item.mutationId === "mutation-2"),
      classifyError: () => ({ kind: "retryable" }),
      persistAcknowledgementIdempotently: persistAck,
    });

    await expect(flusher.flush()).resolves.toMatchObject({ accepted: 2, duplicates: 1, remainingPending: 0, stoppedBy: "empty" });
    expect(await repository.list(scope)).toEqual([]);
  });

  it("preserves pending on malformed or mismatched acknowledgement", async () => {
    const repository = createProgressOutbox(makeStorage(), () => true);
    await repository.enqueue(scope, "mutation-1", { order: 1 });
    const flusher = createProgressOutboxFlusher({
      scope,
      repository,
      isCurrentGeneration: () => true,
      submit: async (item) => ({ ...accepted(item), payloadFingerprint: "f".repeat(64) }),
      classifyError: () => ({ kind: "retryable" }),
      persistAcknowledgementIdempotently: persistAck,
    });

    await expect(flusher.flush()).resolves.toMatchObject({ remainingPending: 1, stoppedBy: "retryable_failure" });
    expect((await repository.list(scope))[0]).toEqual(expect.objectContaining({ mutationId: "mutation-1", status: "pending" }));
  });

  it("records only an explicitly proven mutation-local protocol rejection and continues", async () => {
    const repository = createProgressOutbox(makeStorage(), () => true);
    await repository.enqueue(scope, "mutation-1", { order: 1 });
    await repository.enqueue(scope, "mutation-2", { order: 2 });
    const flusher = createProgressOutboxFlusher({
      scope,
      repository,
      isCurrentGeneration: () => true,
      submit: async (item) => { if (item.mutationId === "mutation-1") throw new Error("server_proven_local_rejection"); return accepted(item); },
      classifyError: (error, item) => error instanceof Error && error.message === "server_proven_local_rejection"
        ? { kind: "mutation_local_protocol_rejected", acknowledgement: { kind: "protocol_rejected", mutationId: item.mutationId, payloadFingerprint: item.payloadFingerprint, receipt: { schemaVersion: "v2-progress-outbox-server-receipt.v1", receiptId: `rejection:${item.mutationId}`, receiptFingerprint: "b".repeat(64) } } }
        : { kind: "retryable" },
      persistAcknowledgementIdempotently: persistAck,
    });

    await expect(flusher.flush()).resolves.toMatchObject({ accepted: 1, terminalRejected: 1, remainingPending: 0, stoppedBy: "empty" });
    expect(await repository.list(scope)).toEqual([expect.objectContaining({ mutationId: "mutation-1", status: "terminal", terminalStatus: "protocol_rejected" })]);
  });

  it("coalesces concurrent flush calls into one network submission", async () => {
    const repository = createProgressOutbox(makeStorage(), () => true);
    await repository.enqueue(scope, "single-flight", { order: 1 });
    let submits = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const flusher = createProgressOutboxFlusher({
      scope,
      repository,
      isCurrentGeneration: () => true,
      submit: async (item) => { submits += 1; await gate; return accepted(item); },
      classifyError: () => ({ kind: "retryable" }),
      persistAcknowledgementIdempotently: persistAck,
    });
    const first = flusher.flush();
    const second = flusher.flush();
    release?.();
    await Promise.all([first, second]);
    expect(submits).toBe(1);
  });
  it("coalesces two repository instances for the same durable account queue", async () => {
    const storage = makeStorage();
    const firstRepository = createProgressOutbox(storage, () => true);
    const secondRepository = createProgressOutbox(storage, () => true);
    await firstRepository.enqueue(scope, "cross-repository-flight", { order: 1 });
    let submits = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const options = (repository: ReturnType<typeof createProgressOutbox>) => ({
      scope,
      repository,
      isCurrentGeneration: () => true,
      submit: async (item: ProgressOutboxItem) => { submits += 1; await gate; return accepted(item); },
      classifyError: () => ({ kind: "retryable" as const }),
      persistAcknowledgementIdempotently: persistAck,
    });
    const first = createProgressOutboxFlusher(options(firstRepository)).flush();
    const second = createProgressOutboxFlusher(options(secondRepository)).flush();
    release?.();
    await Promise.all([first, second]);
    expect(submits).toBe(1);
  });

  it("preserves work enqueued while a network request is in flight", async () => {
    const repository = createProgressOutbox(makeStorage(), () => true);
    await repository.enqueue(scope, "head", { order: 1 });
    let release: (() => void) | undefined;
    let started: (() => void) | undefined;
    const startedPromise = new Promise<void>((resolve) => { started = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const flusher = createProgressOutboxFlusher({
      scope,
      repository,
      isCurrentGeneration: () => true,
      maxItems: 1,
      submit: async (item) => { started?.(); await gate; return accepted(item); },
      classifyError: () => ({ kind: "retryable" }),
      persistAcknowledgementIdempotently: persistAck,
    });
    const flushing = flusher.flush();
    await startedPromise;
    await repository.enqueue(scope, "suffix", { order: 2 });
    release?.();
    await expect(flushing).resolves.toMatchObject({ stoppedBy: "limit", remainingPending: 1 });
    expect((await repository.list(scope)).map((item) => item.mutationId)).toEqual(["suffix"]);
  });

  it("fails closed after a generation switch during submit and keeps the old pending item", async () => {
    const storage = makeStorage(); let current = true;
    const repository = createProgressOutbox(storage, () => true);
    await repository.enqueue(scope, "stale-submit", { order: 1 });
    const flusher = createProgressOutboxFlusher({
      scope,
      repository,
      isCurrentGeneration: () => current,
      submit: async (item) => { current = false; return accepted(item); },
      classifyError: () => ({ kind: "retryable" }),
      persistAcknowledgementIdempotently: persistAck,
    });
    await expect(flusher.flush()).rejects.toThrow("progress_generation_stale");
    expect((await createProgressOutbox(storage, () => true).list(scope)).map((item) => item.mutationId)).toEqual(["stale-submit"]);
  });

  it("replays safely as a duplicate when local compaction fails after server accept", async () => {
    const backing = makeStorage(); let failNextWrite = false;
    const storage: ProgressStorage = {
      getItem: backing.getItem,
      removeItem: backing.removeItem,
      setItem: async (key, value) => { if (failNextWrite) { failNextWrite = false; throw new Error("disk_full_after_accept"); } await backing.setItem(key, value); },
    };
    const repository = createProgressOutbox(storage, () => true);
    await repository.enqueue(scope, "crash-window", { order: 1 });
    let calls = 0;
    let persistCalls = 0;
    const durableEffects = new Set<string>();
    const flusher = createProgressOutboxFlusher({
      scope,
      repository,
      isCurrentGeneration: () => true,
      submit: async (item) => { calls += 1; failNextWrite = calls === 1; return accepted(item, calls > 1); },
      classifyError: () => ({ kind: "retryable" }),
      persistAcknowledgementIdempotently: async (identity) => {
        persistCalls += 1;
        durableEffects.add(`${identity.mutationId}:${identity.payloadFingerprint}`);
      },
    });
    await expect(flusher.flush()).resolves.toMatchObject({ stoppedBy: "retryable_failure", remainingPending: 1 });
    await expect(flusher.flush()).resolves.toMatchObject({ accepted: 1, duplicates: 1, remainingPending: 0, stoppedBy: "empty" });
    expect(persistCalls).toBe(2);
    expect(durableEffects.size).toBe(1);
  });

  it("times out a hung submit and releases single-flight for retry", async () => {
    const repository = createProgressOutbox(makeStorage(), () => true);
    await repository.enqueue(scope, "timeout-retry", { order: 1 });
    let hung = true;
    const flusher = createProgressOutboxFlusher({
      scope,
      repository,
      isCurrentGeneration: () => true,
      operationTimeoutMs: 20,
      submit: async (item) => hung ? new Promise<ProgressOutboxSubmitDisposition>(() => undefined) : accepted(item),
      classifyError: () => ({ kind: "retryable" }),
      persistAcknowledgementIdempotently: persistAck,
    });
    await expect(flusher.flush()).resolves.toMatchObject({ stoppedBy: "retryable_failure", remainingPending: 1 });
    hung = false;
    await expect(flusher.flush()).resolves.toMatchObject({ accepted: 1, remainingPending: 0, stoppedBy: "empty" });
  });

  it("routes delayed probes to the receipt-aware flusher without submitting them", async () => {
    const repository = createProgressOutbox(makeStorage(), () => true);
    await repository.enqueue(scope, "delayed-receipt", { kind: "scheduled_delayed_probe", candidate: true });
    let submitted = false;
    const flusher = createProgressOutboxFlusher({
      scope,
      repository,
      isCurrentGeneration: () => true,
      submit: async (item) => { submitted = true; return accepted(item); },
      classifyError: () => ({ kind: "retryable" }),
      persistAcknowledgementIdempotently: persistAck,
    });
    await expect(flusher.flush()).resolves.toMatchObject({ stoppedBy: "receipt_required", remainingPending: 1 });
    expect(submitted).toBe(false);
  });
});
