"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyProgressEvent = exports.buildPostReceiptProgressEventRequest = exports.parseProgressEventRequest = exports.assertResolvedProgressPins = exports.deriveProgressAccountScopeHash = exports.assertProgressAccountScope = exports.assertEpisodeRevisionPinnedToSeason = void 0;
const attempt_1 = require("../../../modules/learning-v2/contracts/attempt");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const progress_event_evidence_1 = require("./progress_event_evidence");
const progress_event_projection_1 = require("./progress_event_projection");
const delayed_probe_ingestion_1 = require("./delayed_probe_ingestion");
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (value, keys) => Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const isSafeId = (value) => typeof value === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(value);
const sameAttemptRef = (left, right) => left.schemaVersion === right.schemaVersion && left.opId === right.opId && left.attemptBodyHash === right.attemptBodyHash;
const MAX_ATTEMPT_BYTES = 64 * 1024;
const assertAttemptBounds = (value) => {
    let serialized;
    try {
        serialized = JSON.stringify(value);
    }
    catch {
        throw new Error("attempt_body_size_invalid");
    }
    if (serialized.length > MAX_ATTEMPT_BYTES)
        throw new Error("attempt_body_too_large");
    if (!isRecord(value))
        return;
    for (const key of ["learningTupleDispositions", "delayedCandidates"]) {
        const list = value[key];
        if (Array.isArray(list) && list.length > 256)
            throw new Error("attempt_body_cardinality_invalid");
    }
};
const isApprovedEpisodeRevision = (value) => {
    if (!isRecord(value) || !exact(value, ["draftId", "episodeId", "revision", "revisionFingerprint", "contentHash", "ordinal", "chapterId", "approvalStatus"]))
        return false;
    return isSafeId(value.draftId) && isSafeId(value.episodeId) && Number.isSafeInteger(value.revision) && Number(value.revision) >= 1 && typeof value.revisionFingerprint === "string" && /^[a-f0-9]{64}$/.test(value.revisionFingerprint) && typeof value.contentHash === "string" && /^[a-f0-9]{64}$/.test(value.contentHash) && Number.isSafeInteger(value.ordinal) && Number(value.ordinal) >= 1 && isSafeId(value.chapterId) && value.approvalStatus === "approved";
};
const assertEpisodeRevisionPinnedToSeason = (seasonEpisodeRevisionRefs, submitted) => {
    const match = seasonEpisodeRevisionRefs.find((ref) => ref.episodeId === submitted.episodeId && ref.revision === submitted.revision);
    if (!match || (0, decision_registry_1.hashCanonicalBody)(match) !== (0, decision_registry_1.hashCanonicalBody)(submitted))
        throw new Error("v2_progress_episode_not_pinned");
};
exports.assertEpisodeRevisionPinnedToSeason = assertEpisodeRevisionPinnedToSeason;
const assertProgressAccountScope = (requestScopeHash, serverScopeHash) => {
    if (!/^[a-f0-9]{16,128}$/.test(serverScopeHash) || requestScopeHash !== serverScopeHash)
        throw new Error("v2_progress_account_scope_mismatch");
};
exports.assertProgressAccountScope = assertProgressAccountScope;
const deriveProgressAccountScopeHash = (stableUid, generation) => {
    if (!stableUid.trim() || !Number.isSafeInteger(generation) || generation < 1)
        throw new Error("v2_progress_account_identity_invalid");
    return (0, decision_registry_1.hashCanonicalBody)({ schemaVersion: "v2-progress-account-scope.v1", stableUid, generation });
};
exports.deriveProgressAccountScopeHash = deriveProgressAccountScopeHash;
const assertResolvedProgressPins = (request, season, episode) => {
    if (season.lifecycle.status !== "approved" || season.record.seasonId !== request.seasonId)
        throw new Error("v2_progress_season_not_approved_or_stale");
    const refs = season.body.episodeRevisionRefs;
    if (!Array.isArray(refs))
        throw new Error("v2_progress_season_membership_invalid");
    (0, exports.assertEpisodeRevisionPinnedToSeason)(refs, request.episodeRevisionRef);
    if (episode.approvalStatus !== "approved" || episode.episodeId !== request.episodeRevisionRef.episodeId || episode.revision !== request.episodeRevisionRef.revision || episode.contentHash !== request.episodeRevisionRef.contentHash || episode.revisionFingerprint !== request.episodeRevisionRef.revisionFingerprint)
        throw new Error("v2_progress_episode_not_canonical");
};
exports.assertResolvedProgressPins = assertResolvedProgressPins;
const parseProgressEventRequest = (value) => {
    const requiredKeys = ["accountScopeHash", "seasonId", "studyTarget", "learnerSourceLocale", "seasonRevisionId", "episodeRevisionRef", "idempotencyKey", "attemptBody", "attemptRef", "evidenceBundle", "projection"];
    if (!isRecord(value) || requiredKeys.some((key) => !Object.prototype.hasOwnProperty.call(value, key)) || Object.keys(value).some((key) => ![...requiredKeys, "terminalReceipt"].includes(key)) || typeof value.accountScopeHash !== "string" || !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) || !isSafeId(value.seasonId) || typeof value.studyTarget !== "string" || !value.studyTarget.trim() || typeof value.learnerSourceLocale !== "string" || !value.learnerSourceLocale.trim() || !isSafeId(value.seasonRevisionId) || !isApprovedEpisodeRevision(value.episodeRevisionRef) || typeof value.idempotencyKey !== "string" || !/^[A-Za-z0-9._:-]{8,160}$/.test(value.idempotencyKey) || !isRecord(value.projection))
        throw new Error("v2_progress_event_request_invalid");
    assertAttemptBounds(value.attemptBody);
    const attemptBody = (0, attempt_1.sanitizeAttemptBody)(value.attemptBody);
    const attemptRef = value.attemptRef;
    if (!(0, attempt_1.validateCanonicalAttemptRef)(attemptBody, attemptRef).ok)
        throw new Error("v2_progress_attempt_ref_mismatch");
    const evidenceBundle = value.evidenceBundle;
    (0, progress_event_evidence_1.materializeProgressEvidenceBundle)(evidenceBundle);
    // A delayed probe is a two-phase protocol: the client may submit only the
    // hash-bound candidate first. Learning evidence/non-assessment materializes
    // from a server terminal receipt, never from the pre-receipt event payload.
    if (attemptBody.attemptSurface.kind === "scheduled_delayed_probe" &&
        (evidenceBundle.evidenceBodies.length > 0 || evidenceBundle.nonAssessmentBodies.length > 0) &&
        !value.terminalReceipt) {
        throw new Error("delayed_evidence_requires_terminal_receipt");
    }
    const terminalReceipt = value.terminalReceipt;
    if (attemptBody.attemptSurface.kind === "scheduled_delayed_probe" && terminalReceipt) {
        if ((0, decision_registry_1.hashCanonicalBody)(terminalReceipt.receipt) !== terminalReceipt.receiptHash ||
            terminalReceipt.receipt.body.attemptRef.opId !== attemptRef.opId ||
            terminalReceipt.receipt.body.attemptRef.attemptBodyHash !== attemptRef.attemptBodyHash) {
            throw new Error("delayed_terminal_receipt_mismatch");
        }
        const expected = (0, delayed_probe_ingestion_1.materializeDelayedTerminalEvidence)(attemptBody, terminalReceipt);
        if ((0, decision_registry_1.hashCanonicalBody)(expected) !== (0, decision_registry_1.hashCanonicalBody)(evidenceBundle))
            throw new Error("delayed_materialization_mismatch");
    }
    if (!sameAttemptRef(evidenceBundle.attemptRef, attemptRef))
        throw new Error("v2_progress_evidence_attempt_mismatch");
    const projection = value.projection;
    const derivedProjection = (0, progress_event_projection_1.deriveProgressProjection)(projection);
    void derivedProjection;
    return Object.freeze({ accountScopeHash: value.accountScopeHash, seasonId: value.seasonId, studyTarget: value.studyTarget, learnerSourceLocale: value.learnerSourceLocale, seasonRevisionId: value.seasonRevisionId, episodeRevisionRef: Object.freeze({ ...value.episodeRevisionRef }), idempotencyKey: value.idempotencyKey, attemptBody, attemptRef, evidenceBundle, projection: Object.freeze(projection), ...(terminalReceipt ? { terminalReceipt } : {}) });
};
exports.parseProgressEventRequest = parseProgressEventRequest;
/** Builds the only legal second phase request: receipt first, then evidence. */
const buildPostReceiptProgressEventRequest = (input) => {
    if (input.attemptBody.attemptSurface.kind !== "scheduled_delayed_probe")
        throw new Error("delayed_post_receipt_attempt_invalid");
    const evidenceBundle = (0, delayed_probe_ingestion_1.materializeDelayedTerminalEvidence)(input.attemptBody, input.terminalReceipt);
    return { ...input, evidenceBundle, terminalReceipt: input.terminalReceipt };
};
exports.buildPostReceiptProgressEventRequest = buildPostReceiptProgressEventRequest;
const isValidOperationEnvelope = (value) => {
    if (!isRecord(value) || !exact(value, ["schemaVersion", "requestFingerprint", "attemptBodyHash", "componentFingerprint", "projection", "result"]) || value.schemaVersion !== "v2-progress-event-operation.v1" || typeof value.requestFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(value.requestFingerprint) || typeof value.attemptBodyHash !== "string" || !/^[a-f0-9]{64}$/.test(value.attemptBodyHash) || typeof value.componentFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(value.componentFingerprint) || !isRecord(value.projection) || !isRecord(value.result) || !exact(value.result, ["accepted", "duplicate", "canonicalAttemptRef"]) || value.result.accepted !== true || typeof value.result.duplicate !== "boolean" || !isRecord(value.result.canonicalAttemptRef))
        return false;
    const ref = value.result.canonicalAttemptRef;
    return exact(ref, ["schemaVersion", "opId", "attemptBodyHash"]) && ref.schemaVersion === "v2-attempt-ref.v1" && typeof ref.opId === "string" && ref.opId.length > 0 && ref.attemptBodyHash === value.attemptBodyHash;
};
const applyProgressEvent = async (store, request) => store.runTransaction(async (tx) => {
    const canonical = (0, exports.parseProgressEventRequest)(request);
    const materialized = (0, progress_event_evidence_1.materializeProgressEvidenceBundle)(canonical.evidenceBundle);
    const projection = (0, progress_event_projection_1.deriveProgressProjection)(canonical.projection);
    const requestFingerprint = (0, decision_registry_1.hashCanonicalBody)({ accountScopeHash: canonical.accountScopeHash, seasonId: canonical.seasonId, studyTarget: canonical.studyTarget, learnerSourceLocale: canonical.learnerSourceLocale, seasonRevisionId: canonical.seasonRevisionId, episodeRevisionRef: canonical.episodeRevisionRef, idempotencyKey: canonical.idempotencyKey, attemptBodyHash: canonical.attemptRef.attemptBodyHash, componentFingerprint: materialized.componentFingerprint, projection });
    const replay = await tx.readOperation(canonical.idempotencyKey, canonical.seasonRevisionId);
    if (replay) {
        if (!isValidOperationEnvelope(replay))
            throw new Error("v2_progress_operation_invalid");
        if (replay.requestFingerprint !== requestFingerprint)
            throw new Error("v2_progress_idempotency_key_reused");
        return { ...replay.result, duplicate: true };
    }
    await tx.validatePinnedScope(canonical);
    const serverProjection = tx.resolveServerProjection ? await tx.resolveServerProjection(canonical, materialized) : undefined;
    const effectiveProjection = serverProjection?.projection ?? projection;
    const priorHash = await tx.readAttempt(canonical.accountScopeHash, canonical.attemptRef.opId);
    if (priorHash && priorHash !== canonical.attemptRef.attemptBodyHash)
        throw new Error("v2_progress_attempt_op_reused");
    if (priorHash === canonical.attemptRef.attemptBodyHash)
        return { accepted: true, duplicate: true, canonicalAttemptRef: canonical.attemptRef };
    await tx.prepareTransactionPlan(canonical, materialized, effectiveProjection, serverProjection?.resolution);
    await tx.writeProgressProjection(canonical, effectiveProjection);
    if (!priorHash)
        await tx.writeAttempt(canonical.accountScopeHash, canonical.attemptRef.opId, canonical.attemptRef.attemptBodyHash);
    await tx.writeEvidenceMaterialization(canonical, materialized);
    const result = { accepted: true, duplicate: false, canonicalAttemptRef: (0, attempt_1.buildCanonicalAttemptRef)(canonical.attemptBody) };
    await tx.createOperation(canonical.idempotencyKey, { schemaVersion: "v2-progress-event-operation.v1", requestFingerprint, attemptBodyHash: canonical.attemptRef.attemptBodyHash, componentFingerprint: materialized.componentFingerprint, projection: effectiveProjection, result });
    return result;
});
exports.applyProgressEvent = applyProgressEvent;
//# sourceMappingURL=progress_event.js.map