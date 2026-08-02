"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRuntimePack = resolveRuntimePack;
/** Selects only a published pack for the requested target; never falls back to another target. */
function resolveRuntimePack(input) {
    const language = input.catalog.find((entry) => entry.studyTarget === input.requestedTarget && entry.active);
    if (!language)
        return null;
    const packId = language.activePackIds[input.requestedSurface];
    if (!packId)
        return null;
    const pointer = input.pointers.find((candidate) => candidate.studyTarget === input.requestedTarget && candidate.packId === packId);
    if (!pointer)
        return null;
    if (pointer.revision !== language.activePackRevisions[input.requestedSurface] || pointer.contentHash !== language.activePackHashes[input.requestedSurface] || pointer.studyTarget !== input.requestedTarget || pointer.contentHash.trim() === '')
        return null;
    return Object.freeze({ studyTarget: pointer.studyTarget, packId: pointer.packId, revision: pointer.revision, sourceLocale: language.sourceLocale });
}
//# sourceMappingURL=runtime_contract.js.map