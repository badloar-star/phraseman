"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withProgressStorageLock = void 0;
const progressStorageLocks = new Map();
const indeterminateProgressStorageKeys = new Set();
/**
 * Serializes every read-modify-write operation for one logical progress key.
 * The lock is keyed by the durable key rather than the JavaScript storage
 * wrapper, so two adapters over the same backend cannot bypass it.
 */
const withProgressStorageLock = async (key, task, timeoutMs = 15000) => {
    if (indeterminateProgressStorageKeys.has(key))
        throw new Error("progress_storage_indeterminate");
    if (timeoutMs !== null && (!Number.isSafeInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 60000)) {
        throw new Error("progress_storage_timeout_invalid");
    }
    const prior = progressStorageLocks.get(key) ?? Promise.resolve();
    let release;
    const current = new Promise((resolve) => {
        release = resolve;
    });
    const chain = prior.then(() => current);
    progressStorageLocks.set(key, chain);
    await prior;
    let timer;
    try {
        if (indeterminateProgressStorageKeys.has(key))
            throw new Error("progress_storage_indeterminate");
        if (timeoutMs === null)
            return await task();
        return await Promise.race([
            task(),
            new Promise((_, reject) => {
                timer = setTimeout(() => {
                    indeterminateProgressStorageKeys.add(key);
                    reject(new Error("progress_storage_indeterminate"));
                }, timeoutMs);
            }),
        ]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
        release?.();
        if (progressStorageLocks.get(key) === chain)
            progressStorageLocks.delete(key);
    }
};
exports.withProgressStorageLock = withProgressStorageLock;
//# sourceMappingURL=progress_storage_lock.js.map