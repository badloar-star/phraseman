"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProgressStore = exports.progressStorageKey = exports.progressAccountKey = exports.PROGRESS_STORAGE_MAX_BYTES = exports.PROGRESS_STORAGE_SCHEMA = void 0;
const progress_reducer_1 = require("./progress_reducer");
const progress_peek_cache_1 = require("./progress_peek_cache");
exports.PROGRESS_STORAGE_SCHEMA = "v2-progress-storage.v1";
exports.PROGRESS_STORAGE_MAX_BYTES = 512 * 1024;
const progressAccountKey = (scope) => {
    const scopeHash = scope.accountScopeHash.trim();
    if (!/^[a-f0-9]{16,128}$/.test(scopeHash))
        throw new Error("progress_scope_hash_invalid");
    if (!Number.isSafeInteger(scope.generation) || scope.generation < 0)
        throw new Error("progress_generation_invalid");
    if (!scope.seasonId.trim() || !scope.studyTarget.trim() || !scope.learnerSourceLocale.trim())
        throw new Error("progress_scope_dimensions_invalid");
    return `v2:progress:v1:${scopeHash}:${scope.seasonId}:${scope.studyTarget}:${scope.learnerSourceLocale}:g${scope.generation}`;
};
exports.progressAccountKey = progressAccountKey;
const progressStorageKey = (scope) => `learning_v2_progress:${(0, exports.progressAccountKey)(scope)}`;
exports.progressStorageKey = progressStorageKey;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const validSnapshot = (value) => {
    if (!isRecord(value) || value.schemaVersion !== "v2-progress.v1")
        return false;
    try {
        (0, progress_reducer_1.assertProgressSnapshot)(value);
        return true;
    }
    catch {
        return false;
    }
};
const createProgressStore = (storage, isCurrentGeneration) => ({
    async load(scope) {
        if (!isCurrentGeneration(scope))
            return undefined;
        const key = (0, exports.progressAccountKey)(scope);
        const raw = await storage.getItem((0, exports.progressStorageKey)(scope));
        if (!raw || raw.length > exports.PROGRESS_STORAGE_MAX_BYTES)
            return undefined;
        try {
            const parsed = JSON.parse(raw);
            if (!isRecord(parsed) || parsed.schemaVersion !== exports.PROGRESS_STORAGE_SCHEMA || parsed.accountKey !== key || !validSnapshot(parsed.snapshot) || parsed.snapshot.accountScopeHash !== scope.accountScopeHash || parsed.snapshot.seasonId !== scope.seasonId || parsed.snapshot.studyTarget !== scope.studyTarget || parsed.snapshot.learnerSourceLocale !== scope.learnerSourceLocale)
                return undefined;
            (0, progress_peek_cache_1.primeProgressPeek)(key, parsed.snapshot);
            return parsed.snapshot;
        }
        catch {
            return undefined;
        }
    },
    async save(scope, snapshot) {
        if (!isCurrentGeneration(scope))
            throw new Error("progress_generation_stale");
        if (!validSnapshot(snapshot) || snapshot.accountScopeHash !== scope.accountScopeHash)
            throw new Error("progress_snapshot_scope_mismatch");
        const key = (0, exports.progressAccountKey)(scope);
        const encoded = JSON.stringify({ schemaVersion: exports.PROGRESS_STORAGE_SCHEMA, accountKey: key, snapshot });
        if (encoded.length > exports.PROGRESS_STORAGE_MAX_BYTES)
            throw new Error("progress_snapshot_overflow");
        await storage.setItem((0, exports.progressStorageKey)(scope), encoded);
        (0, progress_peek_cache_1.primeProgressPeek)(key, snapshot);
    },
    async clear(scope) {
        if (!isCurrentGeneration(scope))
            throw new Error("progress_generation_stale");
        if (storage.removeItem)
            await storage.removeItem((0, exports.progressStorageKey)(scope));
        (0, progress_peek_cache_1.clearProgressPeek)((0, exports.progressAccountKey)(scope));
    },
    peek: (scope) => isCurrentGeneration(scope) ? (0, progress_peek_cache_1.peekProgress)((0, exports.progressAccountKey)(scope)) : undefined,
});
exports.createProgressStore = createProgressStore;
//# sourceMappingURL=progress_store.js.map