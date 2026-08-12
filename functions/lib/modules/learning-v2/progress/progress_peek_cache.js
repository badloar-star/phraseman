"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__resetProgressPeekForTests = exports.clearProgressPeek = exports.primeProgressPeek = exports.peekProgressRecord = exports.peekProgress = void 0;
const MAX_ENTRIES = 8;
const TTL_MS = 5 * 60 * 1000;
const cache = new Map();
const prune = (now) => {
    for (const [key, value] of cache)
        if (now - value.storedAt > TTL_MS)
            cache.delete(key);
    while (cache.size > MAX_ENTRIES)
        cache.delete(cache.keys().next().value);
};
const peekProgress = (accountKey, now = Date.now()) => {
    prune(now);
    const entry = cache.get(accountKey);
    return entry ? entry.snapshot : undefined;
};
exports.peekProgress = peekProgress;
const peekProgressRecord = (accountKey, now = Date.now()) => {
    prune(now);
    const entry = cache.get(accountKey);
    return entry ? { snapshot: entry.snapshot, revision: entry.revision } : undefined;
};
exports.peekProgressRecord = peekProgressRecord;
const primeProgressPeek = (accountKey, snapshot, revision, now = Date.now()) => {
    cache.set(accountKey, { snapshot, revision, storedAt: now });
    prune(now);
};
exports.primeProgressPeek = primeProgressPeek;
const clearProgressPeek = (accountKey) => {
    if (accountKey)
        cache.delete(accountKey);
    else
        cache.clear();
};
exports.clearProgressPeek = clearProgressPeek;
exports.__resetProgressPeekForTests = exports.clearProgressPeek;
//# sourceMappingURL=progress_peek_cache.js.map