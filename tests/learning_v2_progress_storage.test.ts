import { createInitialProgressState } from "../modules/learning-v2/progress/progress_reducer";
import { createProgressStore, progressStorageKey, type ProgressStorage } from "../modules/learning-v2/progress/progress_store";
import { __resetProgressPeekForTests } from "../modules/learning-v2/progress/progress_peek_cache";
import { hydrateProgress, persistProgressMutation } from "../modules/learning-v2/progress/progress_hydration";

const makeStorage = (): ProgressStorage & { values: Map<string, string> } => {
  const values = new Map<string, string>();
  return { values, getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async (key) => { values.delete(key); } };
};
const scope = { stableId: "account-A", accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", generation: 1 };

describe("V2 progress local store", () => {
  beforeEach(() => __resetProgressPeekForTests());
  it("survives restart and provides synchronous peek after hydration", async () => {
    const storage = makeStorage(); const snapshot = createInitialProgressState({ accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" });
    await createProgressStore(storage, () => true).save(scope, snapshot, null);
    __resetProgressPeekForTests();
    const store = createProgressStore(storage, () => true);
    expect(store.peek(scope)).toBeUndefined();
    await expect(store.load(scope)).resolves.toEqual(snapshot);
    expect(store.peek(scope)).toEqual(snapshot);
  });
  it("fails closed for corrupt/unknown records and isolates accounts", async () => {
    const storage = makeStorage(); const store = createProgressStore(storage, () => true);
    await storage.setItem(progressStorageKey(scope), "not-json");
    await expect(store.load(scope)).resolves.toBeUndefined();
    expect(store.peek(scope)).toBeUndefined();
    await expect(store.load({ stableId: "account-B", accountScopeHash: "bbbbbbbbbbbbbbbb", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", generation: 1 })).resolves.toBeUndefined();
  });
  it("hydrates the real snapshot and only pending outbox entries", async () => {
    const storage = makeStorage(); const snapshot = createInitialProgressState({ accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" });
    await createProgressStore(storage, () => true).save(scope, snapshot, null);
    const result = await hydrateProgress(scope, storage, () => true);
    expect(result.snapshot).toEqual(snapshot);
    expect(result.pendingMutations).toEqual([]);
  });
  it("clears only the selected account on account switch/wipe", async () => {
    const storage = makeStorage(); const store = createProgressStore(storage, () => true); const other = { stableId: "account-B", accountScopeHash: "bbbbbbbbbbbbbbbb", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", generation: 1 };
    await store.save(scope, createInitialProgressState({ accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" }), null);
    await store.save(other, createInitialProgressState({ accountScopeHash: "bbbbbbbbbbbbbbbb", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" }), null);
    await store.clear(scope);
    expect(await store.load(scope)).toBeUndefined();
    expect(await store.load(other)).toEqual(expect.objectContaining({ accountScopeHash: "bbbbbbbbbbbbbbbb" }));
  });
  it("rejects stale generation writes and never hydrates the previous generation", async () => {
    const storage = makeStorage(); const current = { value: 1 }; const store = createProgressStore(storage, (candidate) => candidate.generation === current.value);
    await store.save(scope, createInitialProgressState({ accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" }), null);
    current.value = 2;
    expect(await store.load(scope)).toBeUndefined();
    await expect(store.save(scope, createInitialProgressState({ accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" }), 1)).rejects.toThrow("progress_generation_stale");
  });
  it("rejects a snapshot whose body belongs to another account scope", async () => {
    const storage = makeStorage(); const store = createProgressStore(storage, () => true);
    await storage.setItem(progressStorageKey(scope), JSON.stringify({ schemaVersion: "v2-progress-storage.v1", accountKey: "v2:progress:v1:aaaaaaaaaaaaaaaa:season-1:en:ru:g1", snapshot: createInitialProgressState({ accountScopeHash: "bbbbbbbbbbbbbbbb" }) }));
    await expect(store.load(scope)).resolves.toBeUndefined();
  });
  it("rejects snapshots whose season or language dimensions do not match the scope", async () => {
    const storage = makeStorage(); const store = createProgressStore(storage, () => true);
    const base = createInitialProgressState({ accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" });
    await expect(store.save(scope, { ...base, seasonId: "season-2" }, null)).rejects.toThrow("progress_snapshot_scope_mismatch");
    await expect(store.save(scope, { ...base, studyTarget: "es" }, null)).rejects.toThrow("progress_snapshot_scope_mismatch");
    await expect(store.save(scope, { ...base, learnerSourceLocale: "uk" }, null)).rejects.toThrow("progress_snapshot_scope_mismatch");
  });
  it("journals the mutation before snapshot persistence", async () => {
    const storage = makeStorage(); const snapshot = createInitialProgressState({ accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" });
    await persistProgressMutation(scope, snapshot, "mutation-atomic", { kind: "graph_attempt", attemptBodyHash: "a".repeat(64) }, storage, () => true, null);
    expect((await hydrateProgress(scope, storage, () => true)).pendingMutations).toEqual([expect.objectContaining({ mutationId: "mutation-atomic" })]);
  });
  it("recovers the pending mutation when restart happens between outbox and snapshot writes", async () => {
    const backing = makeStorage();
    const interruptedStorage: ProgressStorage = {
      getItem: backing.getItem,
      removeItem: backing.removeItem,
      setItem: async (key, value) => {
        if (key.startsWith("learning_v2_progress:")) {
          throw new Error("simulated_restart_before_snapshot");
        }
        await backing.setItem(key, value);
      },
    };
    const snapshot = createInitialProgressState({ accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" });

    await expect(
      persistProgressMutation(
        scope,
        snapshot,
        "mutation-interrupted",
        { kind: "graph_attempt", attemptBodyHash: "b".repeat(64) },
        interruptedStorage,
        () => true,
        null,
      ),
    ).rejects.toThrow("simulated_restart_before_snapshot");

    const restarted = await hydrateProgress(scope, backing, () => true);
    expect(restarted.snapshot).toBeUndefined();
    expect(restarted.pendingMutations).toEqual([
      expect.objectContaining({
        mutationId: "mutation-interrupted",
        status: "pending",
      }),
    ]);
  });
  it("guards peek and hydration reads", async () => {
    const storage = makeStorage(); const store = createProgressStore(storage, () => false);
    expect(store.peek(scope)).toBeUndefined();
    await expect(hydrateProgress(scope, storage, () => false)).rejects.toThrow("progress_generation_stale");
  });
  it("rechecks account generation immediately before returning a hydrated packet", async () => {
    const storage = makeStorage();
    const snapshot = createInitialProgressState({ accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" });
    await createProgressStore(storage, () => true).save(scope, snapshot, null);
    let checks = 0;
    const currentUntilHydrationIsReady = () => {
      checks += 1;
      return checks <= 7;
    };

    await expect(
      hydrateProgress(scope, storage, currentUntilHydrationIsReady),
    ).rejects.toThrow("progress_generation_stale");
  });
  it("rejects a second snapshot derived from the same missing base revision", async () => {
    const values = new Map<string, string>();
    let releaseFirst: (() => void) | undefined;
    let firstStarted: (() => void) | undefined;
    const firstStartedPromise = new Promise<void>((resolve) => { firstStarted = resolve; });
    const releaseFirstPromise = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let writes = 0;
    const storage: ProgressStorage = {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => {
        writes += 1;
        if (writes === 1) {
          firstStarted?.();
          await releaseFirstPromise;
        }
        values.set(key, value);
      },
      removeItem: async (key) => { values.delete(key); },
    };
    const store = createProgressStore(storage, () => true);
    const older = { ...createInitialProgressState({ accountScopeHash: scope.accountScopeHash, seasonId: scope.seasonId, studyTarget: scope.studyTarget, learnerSourceLocale: scope.learnerSourceLocale }), updatedAt: "2026-08-09T00:00:00.000Z" };
    const newer = { ...older, updatedAt: "2026-08-09T00:01:00.000Z" };
    const first = store.save(scope, older, null);
    await firstStartedPromise;
    const second = store.save(scope, newer, null);
    releaseFirst?.();
    await expect(first).resolves.toBe(1);
    await expect(second).rejects.toThrow("progress_snapshot_revision_conflict");
    await expect(store.load(scope)).resolves.toEqual(expect.objectContaining({ updatedAt: older.updatedAt }));
  });
  it("uses compare-and-set revisions so two reductions from one base cannot silently overwrite", async () => {
    const storage = makeStorage(); const store = createProgressStore(storage, () => true);
    const base = createInitialProgressState({ accountScopeHash: scope.accountScopeHash, seasonId: scope.seasonId, studyTarget: scope.studyTarget, learnerSourceLocale: scope.learnerSourceLocale });
    await expect(store.save(scope, base, null)).resolves.toBe(1);
    const loaded = await store.loadRecord(scope);
    expect(loaded?.revision).toBe(1);
    const branchA = { ...loaded!.snapshot, updatedAt: "2026-08-09T01:00:00.000Z" };
    const branchB = { ...loaded!.snapshot, updatedAt: "2026-08-09T02:00:00.000Z" };
    await expect(store.save(scope, branchA, loaded!.revision)).resolves.toBe(2);
    await expect(store.save(scope, branchB, loaded!.revision)).rejects.toThrow("progress_snapshot_revision_conflict");
    await expect(store.load(scope)).resolves.toEqual(expect.objectContaining({ updatedAt: branchA.updatedAt }));
  });
  it("keeps a losing CAS mutation journaled for explicit reload and replay", async () => {
    const storage = makeStorage(); const store = createProgressStore(storage, () => true);
    const base = createInitialProgressState({ accountScopeHash: scope.accountScopeHash, seasonId: scope.seasonId, studyTarget: scope.studyTarget, learnerSourceLocale: scope.learnerSourceLocale });
    await store.save(scope, base, null);
    const losingBranch = { ...base, updatedAt: "2026-08-09T04:00:00.000Z" };
    await expect(persistProgressMutation(scope, losingBranch, "cas-loser", { kind: "graph_attempt", attemptBodyHash: "c".repeat(64) }, storage, () => true, 0)).rejects.toThrow("progress_snapshot_revision_conflict");
    const restarted = await hydrateProgress(scope, storage, () => true);
    expect(restarted.snapshotRevision).toBe(1);
    expect(restarted.snapshot?.updatedAt).toBe(base.updatedAt);
    expect(restarted.pendingMutations).toEqual([expect.objectContaining({ mutationId: "cas-loser", status: "pending" })]);
  });
  it("loads the previous v1 envelope as revision zero for explicit migration", async () => {
    const storage = makeStorage(); const store = createProgressStore(storage, () => true);
    const snapshot = createInitialProgressState({ accountScopeHash: scope.accountScopeHash, seasonId: scope.seasonId, studyTarget: scope.studyTarget, learnerSourceLocale: scope.learnerSourceLocale });
    storage.values.set(progressStorageKey(scope), JSON.stringify({ schemaVersion: "v2-progress-storage.v1", accountKey: "v2:progress:v1:aaaaaaaaaaaaaaaa:season-1:en:ru:g1", snapshot }));
    await expect(store.loadRecord(scope)).resolves.toEqual(expect.objectContaining({ revision: 0, snapshot }));
    await expect(store.save(scope, { ...snapshot, updatedAt: "2026-08-09T03:00:00.000Z" }, 0)).resolves.toBe(1);
    await expect(store.loadRecord(scope)).resolves.toEqual(expect.objectContaining({ revision: 1 }));
  });
  it("serializes save and clear so a completed wipe cannot resurrect an older write", async () => {
    const values = new Map<string, string>();
    let releaseWrite: (() => void) | undefined;
    let writeStarted: (() => void) | undefined;
    const writeStartedPromise = new Promise<void>((resolve) => { writeStarted = resolve; });
    const releaseWritePromise = new Promise<void>((resolve) => { releaseWrite = resolve; });
    const storage: ProgressStorage = {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { writeStarted?.(); await releaseWritePromise; values.set(key, value); },
      removeItem: async (key) => { values.delete(key); },
    };
    const store = createProgressStore(storage, () => true);
    const save = store.save(scope, createInitialProgressState({ accountScopeHash: scope.accountScopeHash, seasonId: scope.seasonId, studyTarget: scope.studyTarget, learnerSourceLocale: scope.learnerSourceLocale }), null);
    await writeStartedPromise;
    const clear = store.clear(scope);
    releaseWrite?.();
    await Promise.all([save, clear]);
    await expect(store.load(scope)).resolves.toBeUndefined();
  });
  it("fails explicitly when durable removal is unsupported", async () => {
    const storage: ProgressStorage = { getItem: async () => null, setItem: async () => undefined };
    await expect(createProgressStore(storage, () => true).clear(scope)).rejects.toThrow("progress_storage_remove_unsupported");
  });
  it("keeps the peek cache detached from the caller snapshot", async () => {
    const storage = makeStorage();
    const mutable = { ...createInitialProgressState({ accountScopeHash: scope.accountScopeHash, seasonId: scope.seasonId, studyTarget: scope.studyTarget, learnerSourceLocale: scope.learnerSourceLocale }) };
    await createProgressStore(storage, () => true).save(scope, mutable, null);
    mutable.updatedAt = "2026-08-09T12:00:00.000Z";
    expect(createProgressStore(storage, () => true).peek(scope)?.updatedAt).toBe(new Date(0).toISOString());
    expect(createProgressStore(storage, () => true).peekRecord(scope)?.revision).toBe(1);
  });
  it("detaches and validates the exact snapshot before entering the async storage lock", async () => {
    const storage = makeStorage(); const store = createProgressStore(storage, () => true);
    const mutable = { ...createInitialProgressState({ accountScopeHash: scope.accountScopeHash, seasonId: scope.seasonId, studyTarget: scope.studyTarget, learnerSourceLocale: scope.learnerSourceLocale, legacy: { nested: { value: 1 } } }) } as unknown as { seasonId: string; legacy: { nested: { value: number } } };
    const saving = store.save(scope, mutable as never, null);
    mutable.seasonId = "season-mutated";
    mutable.legacy.nested.value = 2;
    await expect(saving).resolves.toBe(1);
    await expect(store.load(scope)).resolves.toEqual(expect.objectContaining({ seasonId: scope.seasonId, legacy: { nested: { value: 1 } } }));
  });
});
