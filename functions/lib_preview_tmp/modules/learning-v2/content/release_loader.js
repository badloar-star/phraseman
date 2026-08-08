"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadV2ReleaseWithLkg = loadV2ReleaseWithLkg;
const release_manifest_1 = require("./release_manifest");
async function loadV2ReleaseWithLkg(input) {
    try {
        const candidate = await input.fetchView();
        const validation = (0, release_manifest_1.validatePublishedV2SeasonManifest)(candidate);
        if (!validation.ok)
            throw new Error(`v2_release_invalid:${validation.errors.join(',')}`);
        const view = candidate;
        await input.cache.set(input.key, view);
        return { source: 'network', view };
    }
    catch (error) {
        const cached = await input.cache.get(input.key);
        if (cached)
            return { source: 'lkg', view: cached };
        throw error;
    }
}
//# sourceMappingURL=release_loader.js.map