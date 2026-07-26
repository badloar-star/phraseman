"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistProgressMutation = exports.persistProgressFirst = exports.hydrateProgress = void 0;
const progress_store_1 = require("./progress_store");
const progress_outbox_1 = require("./progress_outbox");
const hydrateProgress = async (scope, storage, isCurrentGeneration) => {
    if (!isCurrentGeneration(scope))
        throw new Error("progress_generation_stale");
    const store = (0, progress_store_1.createProgressStore)(storage, isCurrentGeneration);
    const outbox = (0, progress_outbox_1.createProgressOutbox)(storage, isCurrentGeneration);
    const snapshot = await store.load(scope);
    const pendingMutations = (await outbox.list(scope)).filter((item) => item.status === "pending" && item.accountGeneration === scope.generation);
    return { snapshot, pendingMutations };
};
exports.hydrateProgress = hydrateProgress;
const persistProgressFirst = async (scope, snapshot, storage, isCurrentGeneration) => {
    await (0, progress_store_1.createProgressStore)(storage, isCurrentGeneration).save(scope, snapshot);
};
exports.persistProgressFirst = persistProgressFirst;
const persistProgressMutation = async (scope, snapshot, mutationId, payload, storage, isCurrentGeneration) => {
    const outbox = (0, progress_outbox_1.createProgressOutbox)(storage, isCurrentGeneration);
    await outbox.enqueue(scope, mutationId, payload);
    await (0, progress_store_1.createProgressStore)(storage, isCurrentGeneration).save(scope, snapshot);
};
exports.persistProgressMutation = persistProgressMutation;
//# sourceMappingURL=progress_hydration.js.map