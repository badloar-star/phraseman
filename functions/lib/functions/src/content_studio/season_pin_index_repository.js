"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSeasonPinIndexEntry = validateSeasonPinIndexEntry;
exports.applySeasonPinIndexProjection = applySeasonPinIndexProjection;
exports.buildApprovedSeasonPinIndexEntries = buildApprovedSeasonPinIndexEntries;
const season_pin_index_paths_1 = require("./season_pin_index_paths");
const exactKeys = (value, keys) => Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
function validateSeasonPinIndexEntry(value, expected) {
    if (typeof value !== "object" || value === null || Array.isArray(value))
        return false;
    const entry = value;
    return exactKeys(entry, ["schemaVersion", "documentPath", "seasonRevisionId", "seasonRevisionFingerprint", "episodeId", "revision", "revisionFingerprint", "contentHash", "status", "lifecycleRevision"]) &&
        entry.schemaVersion === "season-episode-pin-index.v1" &&
        typeof entry.documentPath === "string" && entry.documentPath === (0, season_pin_index_paths_1.seasonEpisodePinIndexDocumentPath)(expected) &&
        typeof entry.seasonRevisionId === "string" && entry.seasonRevisionId.length > 0 &&
        typeof entry.seasonRevisionFingerprint === "string" && /^[a-f0-9]{64}$/.test(entry.seasonRevisionFingerprint) &&
        entry.episodeId === expected.episodeId && entry.revision === expected.revision && entry.revisionFingerprint === expected.revisionFingerprint && entry.contentHash === expected.contentHash && entry.status === "approved" && Number.isSafeInteger(entry.lifecycleRevision) && Number(entry.lifecycleRevision) >= 1;
}
function applySeasonPinIndexProjection(input) {
    for (const path of input.previousDocumentPaths ?? [])
        input.transaction.delete(path);
    for (const entry of input.nextEntries)
        input.transaction.set(entry.documentPath, entry);
}
function buildApprovedSeasonPinIndexEntries(input) {
    if (input.status !== "approved")
        return [];
    if (!input.seasonRevisionId || !/^[a-f0-9]{64}$/.test(input.seasonRevisionFingerprint))
        throw new Error("season_pin_index_identity_invalid");
    return input.episodeRevisionRefs.map((ref) => ({
        schemaVersion: "season-episode-pin-index.v1",
        documentPath: (0, season_pin_index_paths_1.seasonEpisodePinIndexDocumentPath)(ref),
        seasonRevisionId: input.seasonRevisionId,
        seasonRevisionFingerprint: input.seasonRevisionFingerprint,
        episodeId: ref.episodeId,
        revision: ref.revision,
        revisionFingerprint: ref.revisionFingerprint,
        contentHash: ref.contentHash,
        status: "approved",
        lifecycleRevision: input.lifecycleRevision ?? 1,
    }));
}
//# sourceMappingURL=season_pin_index_repository.js.map