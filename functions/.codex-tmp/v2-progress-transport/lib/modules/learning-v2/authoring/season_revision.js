"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seasonRevisionObjectPath = exports.seasonRevisionFingerprint = void 0;
exports.validateSeasonLifecycleHead = validateSeasonLifecycleHead;
exports.validateSeasonRevisionEnvelope = validateSeasonRevisionEnvelope;
exports.assertSeasonRevisionEnvelope = assertSeasonRevisionEnvelope;
const decision_registry_1 = require("../policies/decision_registry");
const HASH = /^[a-f0-9]{64}$/;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (value, keys) => Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
function validateSeasonLifecycleHead(value) {
    if (!isRecord(value))
        return false;
    return exact(value, ["schemaVersion", "draftId", "seasonId", "revision", "revisionFingerprint", "status", "changedBy", "changedAt", "lifecycleRevision"]) &&
        value.schemaVersion === "season-lifecycle.v1" && typeof value.draftId === "string" && value.draftId.length > 0 &&
        typeof value.seasonId === "string" && value.seasonId.length > 0 && Number.isSafeInteger(value.revision) && Number(value.revision) >= 1 &&
        typeof value.revisionFingerprint === "string" && HASH.test(value.revisionFingerprint) &&
        ["needs_review", "changes_requested", "approved", "archived"].includes(String(value.status)) &&
        typeof value.changedBy === "string" && value.changedBy.length > 0 && typeof value.changedAt === "string" && value.changedAt.length > 0 &&
        Number.isSafeInteger(value.lifecycleRevision) && Number(value.lifecycleRevision) >= 1;
}
const seasonRevisionFingerprint = (draftId, revision, contentHash) => (0, decision_registry_1.hashCanonicalBody)({ draftId, revision, contentHash });
exports.seasonRevisionFingerprint = seasonRevisionFingerprint;
const seasonRevisionObjectPath = (draftId, revision, contentHash) => `content-studio/seasons/${(0, decision_registry_1.sha256Utf8)(draftId)}/r${revision}/${contentHash}.json`;
exports.seasonRevisionObjectPath = seasonRevisionObjectPath;
function validateSeasonRevisionEnvelope(value) {
    try {
        if (!isRecord(value) || !exact(value, ["body", "record", "lifecycle"]) || !isRecord(value.body) || !isRecord(value.record) || !isRecord(value.lifecycle))
            return false;
        const body = value.body;
        const record = value.record;
        const lifecycle = value.lifecycle;
        if (typeof body.schemaVersion !== "string" || body.schemaVersion !== "season-authoring-body.v1")
            return false;
        const scope = body.releaseScope;
        const episodeRefs = body.episodeRevisionRefs;
        const decisionRef = body.decisionRegistryRef;
        if (!isRecord(scope) || !["vertical_slice", "chapter_internal", "full_season"].includes(String(scope.kind)) || !Array.isArray(scope.includedChapterOrdinals) || !Array.isArray(scope.includedEpisodeOrdinals) || !Array.isArray(episodeRefs) || !Array.isArray(body.chapters) || !Array.isArray(body.gates) || typeof body.gatePolicyVersion !== "string" || !isRecord(decisionRef) || typeof decisionRef.id !== "string" || !Number.isSafeInteger(decisionRef.version) || typeof decisionRef.contentHash !== "string" || !HASH.test(decisionRef.contentHash))
            return false;
        const expectedCount = scope.kind === "vertical_slice" ? 1 : scope.kind === "chapter_internal" ? 8 : 32;
        if (episodeRefs.length !== expectedCount || new Set(episodeRefs.map((item) => isRecord(item) ? item.episodeId : undefined)).size !== expectedCount)
            return false;
        if (!episodeRefs.every((item) => isRecord(item) && typeof item.draftId === "string" && typeof item.episodeId === "string" && Number.isSafeInteger(item.revision) && Number(item.revision) >= 1 && typeof item.revisionFingerprint === "string" && HASH.test(item.revisionFingerprint) && typeof item.contentHash === "string" && HASH.test(item.contentHash) && Number.isSafeInteger(item.ordinal) && Number(item.ordinal) >= 1 && typeof item.chapterId === "string" && item.approvalStatus === "approved"))
            return false;
        if (!exact(record, ["schemaVersion", "draftId", "seasonId", "revision", "contentHash", "revisionFingerprint", "object", "provenance", "createdAt"]))
            return false;
        if (record.schemaVersion !== "season-authoring-record.v1" || typeof record.draftId !== "string" || typeof record.seasonId !== "string" || !Number.isSafeInteger(record.revision) || Number(record.revision) < 1 || typeof record.contentHash !== "string" || !HASH.test(record.contentHash) || record.contentHash !== (0, decision_registry_1.hashCanonicalBody)(body) || typeof record.revisionFingerprint !== "string" || record.revisionFingerprint !== (0, exports.seasonRevisionFingerprint)(record.draftId, Number(record.revision), record.contentHash) || !isRecord(record.object) || !isRecord(record.provenance) || typeof record.createdAt !== "string" || record.createdAt.length === 0)
            return false;
        const object = record.object;
        if (!exact(object, ["objectPath", "contentHash", "objectGeneration", "byteSize"]) || typeof object.objectPath !== "string" || object.objectPath !== (0, exports.seasonRevisionObjectPath)(record.draftId, Number(record.revision), record.contentHash) || typeof object.contentHash !== "string" || object.contentHash !== record.contentHash || typeof object.objectGeneration !== "string" || object.objectGeneration.length === 0 || !Number.isSafeInteger(object.byteSize) || Number(object.byteSize) < 1)
            return false;
        if (!validateSeasonLifecycleHead(lifecycle) || lifecycle.draftId !== record.draftId || lifecycle.seasonId !== record.seasonId || lifecycle.revision !== record.revision || lifecycle.revisionFingerprint !== record.revisionFingerprint)
            return false;
        return true;
    }
    catch {
        return false;
    }
}
function assertSeasonRevisionEnvelope(value) {
    if (!validateSeasonRevisionEnvelope(value))
        throw new Error("season_revision_envelope_invalid");
}
