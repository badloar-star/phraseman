import { createInitialProgressState } from "../modules/learning-v2/progress/progress_reducer";
import { createProgressStore, type ProgressStorage } from "../modules/learning-v2/progress/progress_store";
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
    await createProgressStore(storage, () => true).save(scope, snapshot);
    __resetProgressPeekForTests();
    const store = createProgressStore(storage, () => true);
    expect(store.peek(scope)).toBeUndefined();
    await expect(store.load(scope)).resolves.toEqual(snapshot);
    expect(store.peek(scope)).toEqual(snapshot);
  });
  it("fails closed for corrupt/unknown records and isolates accounts", async () => {
    const storage = makeStorage(); const store = createProgressStore(storage, () => true);
    await storage.setItem("v2:progress:v1:aaaaaaaaaaaaaaaa:season-1:en:ru:g1", "not-json");
    await expect(store.load(scope)).resolves.toBeUndefined();
    await expect(store.load({ stableId: "account-B", accountScopeHash: "bbbbbbbbbbbbbbbb", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", generation: 1 })).resolves.toBeUndefined();
  });
  it("hydrates the real snapshot and only pending outbox entries", async () => {
    const storage = makeStorage(); const snapshot = createInitialProgressState({ accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" });
    await createProgressStore(storage, () => true).save(scope, snapshot);
    const result = await hydrateProgress(scope, storage, () => true);
    expect(result.snapshot).toEqual(snapshot);
    expect(result.pendingMutations).toEqual([]);
  });
  it("clears only the selected account on account switch/wipe", async () => {
    const storage = makeStorage(); const store = createProgressStore(storage, () => true); const other = { stableId: "account-B", accountScopeHash: "bbbbbbbbbbbbbbbb", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", generation: 1 };
    await store.save(scope, createInitialProgressState({ accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" }));
    await store.save(other, createInitialProgressState({ accountScopeHash: "bbbbbbbbbbbbbbbb", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" }));
    await store.clear(scope);
    expect(await store.load(scope)).toBeUndefined();
    expect(await store.load(other)).toEqual(expect.objectContaining({ accountScopeHash: "bbbbbbbbbbbbbbbb" }));
  });
  it("rejects stale generation writes and never hydrates the previous generation", async () => {
    const storage = makeStorage(); const current = { value: 1 }; const store = createProgressStore(storage, (candidate) => candidate.generation === current.value);
    await store.save(scope, createInitialProgressState({ accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" }));
    current.value = 2;
    expect(await store.load(scope)).toBeUndefined();
    await expect(store.save(scope, createInitialProgressState({ accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" }))).rejects.toThrow("progress_generation_stale");
  });
  it("rejects a snapshot whose body belongs to another account scope", async () => {
    const storage = makeStorage(); const store = createProgressStore(storage, () => true);
    await storage.setItem("v2:progress:v1:aaaaaaaaaaaaaaaa:season-1:en:ru:g1", JSON.stringify({ schemaVersion: "v2-progress-storage.v1", accountKey: "v2:progress:v1:aaaaaaaaaaaaaaaa:season-1:en:ru:g1", snapshot: createInitialProgressState({ accountScopeHash: "bbbbbbbbbbbbbbbb" }) }));
    await expect(store.load(scope)).resolves.toBeUndefined();
  });
  it("journals the mutation before snapshot persistence", async () => {
    const storage = makeStorage(); const snapshot = createInitialProgressState({ accountScopeHash: "aaaaaaaaaaaaaaaa", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru" });
    await persistProgressMutation(scope, snapshot, "mutation-atomic", { kind: "graph_attempt", attemptBodyHash: "a".repeat(64) }, storage, () => true);
    expect((await hydrateProgress(scope, storage, () => true)).pendingMutations).toEqual([expect.objectContaining({ mutationId: "mutation-atomic" })]);
  });
  it("guards peek and hydration reads", async () => {
    const storage = makeStorage(); const store = createProgressStore(storage, () => false);
    expect(store.peek(scope)).toBeUndefined();
    await expect(hydrateProgress(scope, storage, () => false)).rejects.toThrow("progress_generation_stale");
  });
});
