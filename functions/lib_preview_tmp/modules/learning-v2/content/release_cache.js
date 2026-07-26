"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createV2ReleaseCache = createV2ReleaseCache;
function createV2ReleaseCache(options) {
    if (!Number.isSafeInteger(options.maxEntries) || options.maxEntries < 1 || !Number.isFinite(options.ttlMs) || options.ttlMs <= 0)
        throw new Error('v2_release_cache_options_invalid');
    const now = options.now ?? (() => Date.now());
    const entries = new Map();
    return {
        async get(key) {
            const entry = entries.get(key);
            if (!entry)
                return undefined;
            if (entry.expiresAt <= now()) {
                entries.delete(key);
                return undefined;
            }
            entries.delete(key);
            entries.set(key, entry);
            return entry.view;
        },
        async set(key, view) {
            entries.delete(key);
            entries.set(key, { view, expiresAt: now() + options.ttlMs });
            while (entries.size > options.maxEntries)
                entries.delete(entries.keys().next().value);
        },
        async clear() { entries.clear(); },
    };
}
//# sourceMappingURL=release_cache.js.map