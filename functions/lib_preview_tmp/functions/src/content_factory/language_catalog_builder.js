"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildActiveLanguageCatalogEntries = buildActiveLanguageCatalogEntries;
const course_release_contract_1 = require("./course_release_contract");
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function buildActiveLanguageCatalogEntries(catalogs, releasesById) {
    const entries = [];
    for (const catalogDoc of catalogs) {
        const active = catalogDoc.data.activeRelease;
        if (!isRecord(active) || typeof active.releaseId !== 'string')
            continue;
        let release;
        try {
            release = (0, course_release_contract_1.assertCourseRelease)(releasesById.get(active.releaseId));
        }
        catch {
            continue;
        }
        if (active.studyTarget !== release.studyTarget || active.learnerSourceLocale !== release.learnerSourceLocale || catalogDoc.id !== `${release.studyTarget}:${release.learnerSourceLocale}`)
            continue;
        const revision = Number(catalogDoc.data.revision ?? 0);
        if (!Number.isSafeInteger(revision) || revision < 1)
            continue;
        for (const surface of course_release_contract_1.CANONICAL_RELEASE_SURFACES) {
            entries.push(Object.freeze({ surface, studyTarget: release.studyTarget, packId: release.releaseId, revision, contentHash: release.artifacts[surface].contentHash, sourceLocale: release.learnerSourceLocale, canonicalRelease: true }));
        }
    }
    return entries;
}
//# sourceMappingURL=language_catalog_builder.js.map