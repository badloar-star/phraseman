import type { ProgressSnapshot } from "./progress_types";
import type { ProgressAccountScope, ProgressGenerationGuard } from "./progress_store";
import { createProgressStore, type ProgressStorage } from "./progress_store";
import { createProgressOutbox } from "./progress_outbox";

export const hydrateProgress = async (scope: ProgressAccountScope, storage: ProgressStorage, isCurrentGeneration: ProgressGenerationGuard): Promise<{ readonly snapshot?: ProgressSnapshot; readonly pendingMutations: readonly unknown[] }> => {
  if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
  const store = createProgressStore(storage, isCurrentGeneration);
  const outbox = createProgressOutbox(storage, isCurrentGeneration);
  const snapshot = await store.load(scope);
  const pendingMutations = (await outbox.list(scope)).filter((item) => item.status === "pending" && item.accountGeneration === scope.generation);
  return { snapshot, pendingMutations };
};

export const persistProgressFirst = async (scope: ProgressAccountScope, snapshot: ProgressSnapshot, storage: ProgressStorage, isCurrentGeneration: ProgressGenerationGuard): Promise<void> => {
  await createProgressStore(storage, isCurrentGeneration).save(scope, snapshot);
};

export const persistProgressMutation = async (scope: ProgressAccountScope, snapshot: ProgressSnapshot, mutationId: string, payload: unknown, storage: ProgressStorage, isCurrentGeneration: ProgressGenerationGuard): Promise<void> => {
  const outbox = createProgressOutbox(storage, isCurrentGeneration);
  await outbox.enqueue(scope, mutationId, payload);
  await createProgressStore(storage, isCurrentGeneration).save(scope, snapshot);
};
