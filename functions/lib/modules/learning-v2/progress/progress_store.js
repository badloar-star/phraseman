"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProgressStore = exports.progressStorageKey = exports.progressAccountKey = exports.PROGRESS_STORAGE_MAX_BYTES = exports.PROGRESS_STORAGE_SCHEMA = void 0;
const progress_reducer_1 = require("./progress_reducer");
const decision_registry_1 = require("../policies/decision_registry");
const progress_peek_cache_1 = require("./progress_peek_cache");
const progress_storage_lock_1 = require("./progress_storage_lock");
exports.PROGRESS_STORAGE_SCHEMA = "v2-progress-storage.v2";
const LEGACY_PROGRESS_STORAGE_SCHEMA = "v2-progress-storage.v1";
exports.PROGRESS_STORAGE_MAX_BYTES = 512 * 1024;
const progressAccountKey = (scope) => {
    const scopeHash = scope.accountScopeHash.trim();
    if (!/^[a-f0-9]{16,128}$/.test(scopeHash))
        throw new Error("progress_scope_hash_invalid");
    if (!Number.isSafeInteger(scope.generation) || scope.generation < 0)
        throw new Error("progress_generation_invalid");
    if (![scope.seasonId, scope.studyTarget, scope.learnerSourceLocale].every((value) => /^[A-Za-z0-9._-]{1,128}$/.test(value)))
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
const utf8ByteLength = (value) => {
    let bytes = 0;
    for (const character of value) {
        const codePoint = character.codePointAt(0) ?? 0;
        bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
    }
    return bytes;
};
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
const parseStored = (raw, scope, accountKey) => {
    if (utf8ByteLength(raw) > exports.PROGRESS_STORAGE_MAX_BYTES)
        throw new Error("progress_snapshot_corrupt");
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        throw new Error("progress_snapshot_corrupt");
    }
    if (!isRecord(parsed) ||
        (parsed.schemaVersion !== exports.PROGRESS_STORAGE_SCHEMA && parsed.schemaVersion !== LEGACY_PROGRESS_STORAGE_SCHEMA) ||
        parsed.accountKey !== accountKey ||
        !validSnapshot(parsed.snapshot) ||
        parsed.snapshot.accountScopeHash !== scope.accountScopeHash ||
        parsed.snapshot.seasonId !== scope.seasonId ||
        parsed.snapshot.studyTarget !== scope.studyTarget ||
        parsed.snapshot.learnerSourceLocale !== scope.learnerSourceLocale)
        throw new Error("progress_snapshot_corrupt");
    const revision = parsed.schemaVersion === LEGACY_PROGRESS_STORAGE_SCHEMA ? 0 : parsed.revision;
    if (!Number.isSafeInteger(revision) || Number(revision) < 0)
        throw new Error("progress_snapshot_corrupt");
    return Object.freeze({ snapshot: deepFreeze(parsed.snapshot), revision: Number(revision) });
};
const createProgressStore = (storage, isCurrentGeneration) => {
    const loadRecord = async (scope) => {
        if (!isCurrentGeneration(scope))
            return undefined;
        const key = (0, exports.progressAccountKey)(scope);
        const storageKey = (0, exports.progressStorageKey)(scope);
        return (0, progress_storage_lock_1.withProgressStorageLock)(`snapshot:${storageKey}`, async () => {
            const raw = await storage.getItem(storageKey);
            if (!isCurrentGeneration(scope))
                return undefined;
            if (!raw)
                return undefined;
            try {
                const record = parseStored(raw, scope, key);
                if (!isCurrentGeneration(scope))
                    return undefined;
                (0, progress_peek_cache_1.primeProgressPeek)(key, record.snapshot, record.revision);
                return record;
            }
            catch {
                return undefined;
            }
        }, storage.operationTimeoutMs);
    };
    return {
        async load(scope) {
            return (await loadRecord(scope))?.snapshot;
        },
        loadRecord,
        async save(scope, snapshot, expectedRevision) {
            if (!isCurrentGeneration(scope))
                throw new Error("progress_generation_stale");
            if (expectedRevision !== null && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0))
                throw new Error("progress_snapshot_revision_invalid");
            let detachedInput;
            try {
                detachedInput = deepFreeze(JSON.parse((0, decision_registry_1.canonicalJsonV1)(snapshot)));
            }
            catch {
                throw new Error("progress_snapshot_invalid");
            }
            if (!validSnapshot(detachedInput) || detachedInput.accountScopeHash !== scope.accountScopeHash || detachedInput.seasonId !== scope.seasonId || detachedInput.studyTarget !== scope.studyTarget || detachedInput.learnerSourceLocale !== scope.learnerSourceLocale)
                throw new Error("progress_snapshot_scope_mismatch");
            const key = (0, exports.progressAccountKey)(scope);
            const storageKey = (0, exports.progressStorageKey)(scope);
            return (0, progress_storage_lock_1.withProgressStorageLock)(`snapshot:${storageKey}`, async () => {
                if (!isCurrentGeneration(scope))
                    throw new Error("progress_generation_stale");
                const raw = await storage.getItem(storageKey);
                if (!isCurrentGeneration(scope))
                    throw new Error("progress_generation_stale");
                const currentRevision = raw === null ? null : parseStored(raw, scope, key).revision;
                if (currentRevision !== expectedRevision)
                    throw new Error("progress_snapshot_revision_conflict");
                const revision = (currentRevision ?? 0) + 1;
                const encoded = JSON.stringify({ schemaVersion: exports.PROGRESS_STORAGE_SCHEMA, accountKey: key, revision, snapshot: detachedInput });
                if (utf8ByteLength(encoded) > exports.PROGRESS_STORAGE_MAX_BYTES)
                    throw new Error("progress_snapshot_overflow");
                const detached = deepFreeze(JSON.parse(encoded).snapshot);
                await storage.setItem(storageKey, encoded);
                if (!isCurrentGeneration(scope))
                    throw new Error("progress_generation_stale");
                (0, progress_peek_cache_1.primeProgressPeek)(key, detached, revision);
                return revision;
            }, storage.operationTimeoutMs);
        },
        async clear(scope) {
            if (!isCurrentGeneration(scope))
                throw new Error("progress_generation_stale");
            if (!storage.removeItem)
                throw new Error("progress_storage_remove_unsupported");
            const storageKey = (0, exports.progressStorageKey)(scope);
            await (0, progress_storage_lock_1.withProgressStorageLock)(`snapshot:${storageKey}`, async () => {
                if (!isCurrentGeneration(scope))
                    throw new Error("progress_generation_stale");
                await storage.removeItem(storageKey);
                if (!isCurrentGeneration(scope))
                    throw new Error("progress_generation_stale");
                (0, progress_peek_cache_1.clearProgressPeek)((0, exports.progressAccountKey)(scope));
            }, storage.operationTimeoutMs);
        },
        peek: (scope) => isCurrentGeneration(scope) ? (0, progress_peek_cache_1.peekProgress)((0, exports.progressAccountKey)(scope)) : undefined,
        peekRecord: (scope) => isCurrentGeneration(scope) ? (0, progress_peek_cache_1.peekProgressRecord)((0, exports.progressAccountKey)(scope)) : undefined,
    };
};
exports.createProgressStore = createProgressStore;
//# sourceMappingURL=progress_store.js.map