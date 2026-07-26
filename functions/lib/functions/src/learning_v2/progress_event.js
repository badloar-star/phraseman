"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyProgressEvent = exports.buildPostReceiptProgressEventRequest = exports.parseProgressEventRequest = exports.assertResolvedProgressPins = exports.deriveProgressAccountScopeHash = exports.assertProgressAccountScope = exports.assertEpisodeRevisionPinnedToSeason = exports.deriveEffectiveProjectionFingerprint = exports.isValidProgressProjection = void 0;
const attempt_1 = require("../../../modules/learning-v2/contracts/attempt");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const progress_event_evidence_1 = require("./progress_event_evidence");
const progress_event_projection_1 = require("./progress_event_projection");
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (value, keys) => Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const isSafeId = (value) => typeof value === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(value);
const isValidProgressProjection = (value) => {
    if (!isRecord(value) || !exact(value, ["performanceStars", "performanceStarsDelta", "accessStarsEarnedDelta", "accessStarsPurchasedDelta", "starSlotId", "activityId", "progressCompatibilityKey"]))
        return false;
    return Number.isInteger(value.performanceStars) && Number(value.performanceStars) >= 0 && Number(value.performanceStars) <= 3 &&
        Number.isInteger(value.performanceStarsDelta) && Number(value.performanceStarsDelta) >= 0 && Number(value.performanceStarsDelta) <= 3 &&
        Number.isInteger(value.accessStarsEarnedDelta) && Number(value.accessStarsEarnedDelta) >= 0 && Number(value.accessStarsEarnedDelta) <= 3 &&
        value.performanceStarsDelta === value.accessStarsEarnedDelta && Number(value.performanceStarsDelta) <= Number(value.performanceStars) &&
        value.accessStarsPurchasedDelta === 0 && isSafeId(value.starSlotId) && isSafeId(value.activityId) &&
        typeof value.progressCompatibilityKey === "string" && value.progressCompatibilityKey.trim().length > 0;
};
exports.isValidProgressProjection = isValidProgressProjection;
const sameAttemptRef = (left, right) => left.schemaVersion === right.schemaVersion && left.opId === right.opId && left.attemptBodyHash === right.attemptBodyHash;
const sameProjectionIdentity = (left, right) => left.starSlotId === right.starSlotId &&
    left.activityId === right.activityId &&
    left.progressCompatibilityKey === right.progressCompatibilityKey;
const deriveEffectiveProjectionFingerprint = (attemptBodyHash, componentFingerprint, projection) => (0, decision_registry_1.hashCanonicalBody)({
    schemaVersion: "v2-effective-progress-projection.v1",
    attemptBodyHash,
    componentFingerprint,
    projection,
});
exports.deriveEffectiveProjectionFingerprint = deriveEffectiveProjectionFingerprint;
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
const isDelayedTerminalReference = (value) => isRecord(value) &&
    exact(value, ["schemaVersion", "mutationId"]) &&
    value.schemaVersion === "v2-delayed-terminal-ref.v1" &&
    typeof value.mutationId === "string" &&
    /^[A-Za-z0-9._:-]{8,160}$/.test(value.mutationId);
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
    if (!isRecord(value) || requiredKeys.some((key) => !Object.prototype.hasOwnProperty.call(value, key)) || Object.keys(value).some((key) => ![...requiredKeys, "terminalRef"].includes(key)) || typeof value.accountScopeHash !== "string" || !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) || !isSafeId(value.seasonId) || typeof value.studyTarget !== "string" || !value.studyTarget.trim() || typeof value.learnerSourceLocale !== "string" || !value.learnerSourceLocale.trim() || !isSafeId(value.seasonRevisionId) || !isApprovedEpisodeRevision(value.episodeRevisionRef) || typeof value.idempotencyKey !== "string" || !/^[A-Za-z0-9._:-]{8,160}$/.test(value.idempotencyKey) || !isRecord(value.projection))
        throw new Error("v2_progress_event_request_invalid");
    assertAttemptBounds(value.attemptBody);
    const attemptBody = (0, attempt_1.sanitizeAttemptBody)(value.attemptBody);
    const attemptRef = value.attemptRef;
    if (!(0, attempt_1.validateCanonicalAttemptRef)(attemptBody, attemptRef).ok)
        throw new Error("v2_progress_attempt_ref_mismatch");
    const evidenceBundle = value.evidenceBundle;
    (0, progress_event_evidence_1.materializeProgressEvidenceBundle)(evidenceBundle);
    if (!sameAttemptRef(evidenceBundle.attemptRef, attemptRef))
        throw new Error("v2_progress_evidence_attempt_mismatch");
    const delayed = attemptBody.attemptSurface.kind === "scheduled_delayed_probe";
    const terminalRef = value.terminalRef;
    if (delayed && terminalRef === undefined)
        throw new Error("delayed_terminal_reference_required");
    if (delayed && !isDelayedTerminalReference(terminalRef))
        throw new Error("delayed_terminal_reference_invalid");
    if (!delayed && terminalRef !== undefined)
        throw new Error("delayed_terminal_reference_unexpected");
    if (delayed && (evidenceBundle.evidenceBodies.length > 0 || evidenceBundle.nonAssessmentBodies.length > 0))
        throw new Error("delayed_client_evidence_forbidden");
    const parsedTerminalRef = terminalRef;
    const projection = value.projection;
    const derivedProjection = (0, progress_event_projection_1.deriveProgressProjection)(projection);
    void derivedProjection;
    return Object.freeze({ accountScopeHash: value.accountScopeHash, seasonId: value.seasonId, studyTarget: value.studyTarget, learnerSourceLocale: value.learnerSourceLocale, seasonRevisionId: value.seasonRevisionId, episodeRevisionRef: Object.freeze({ ...value.episodeRevisionRef }), idempotencyKey: value.idempotencyKey, attemptBody, attemptRef, evidenceBundle, projection: Object.freeze(projection), ...(parsedTerminalRef ? { terminalRef: Object.freeze({ ...parsedTerminalRef }) } : {}) });
};
exports.parseProgressEventRequest = parseProgressEventRequest;
/** Builds the only legal second phase request: immutable reference, no client evidence. */
const buildPostReceiptProgressEventRequest = (input) => {
    if (input.attemptBody.attemptSurface.kind !== "scheduled_delayed_probe")
        throw new Error("delayed_post_receipt_attempt_invalid");
    if (!isDelayedTerminalReference(input.terminalRef))
        throw new Error("delayed_terminal_reference_invalid");
    const evidenceBundle = { schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef: input.attemptRef, evidenceBodies: [], nonAssessmentBodies: [] };
    return { ...input, evidenceBundle };
};
exports.buildPostReceiptProgressEventRequest = buildPostReceiptProgressEventRequest;
const isValidOperationEnvelope = (value) => {
    if (!isRecord(value) || !exact(value, ["schemaVersion", "requestFingerprint", "attemptBodyHash", "componentFingerprint", "effectiveProjectionFingerprint", "projection", "result"]) || value.schemaVersion !== "v2-progress-event-operation.v1" || typeof value.requestFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(value.requestFingerprint) || typeof value.attemptBodyHash !== "string" || !/^[a-f0-9]{64}$/.test(value.attemptBodyHash) || typeof value.componentFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(value.componentFingerprint) || typeof value.effectiveProjectionFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(value.effectiveProjectionFingerprint) || !(0, exports.isValidProgressProjection)(value.projection) || value.effectiveProjectionFingerprint !== (0, exports.deriveEffectiveProjectionFingerprint)(value.attemptBodyHash, value.componentFingerprint, value.projection) || !isRecord(value.result) || !exact(value.result, ["accepted", "duplicate", "canonicalAttemptRef"]) || value.result.accepted !== true || typeof value.result.duplicate !== "boolean" || !isRecord(value.result.canonicalAttemptRef))
        return false;
    const ref = value.result.canonicalAttemptRef;
    return exact(ref, ["schemaVersion", "opId", "attemptBodyHash"]) && ref.schemaVersion === "v2-attempt-ref.v1" && typeof ref.opId === "string" && ref.opId.length > 0 && ref.attemptBodyHash === value.attemptBodyHash;
};
const applyProgressEvent = async (store, request) => store.runTransaction(async (tx) => {
    const canonical = (0, exports.parseProgressEventRequest)(request);
    const isDelayed = canonical.attemptBody.attemptSurface.kind === "scheduled_delayed_probe";
    const delayedEvidence = isDelayed
        ? await tx.resolveDelayedEvidence(canonical)
        : undefined;
    if (isDelayed && !delayedEvidence)
        throw new Error("delayed_terminal_resolution_required");
    const effectiveEvidenceBundle = delayedEvidence ?? canonical.evidenceBundle;
    const materialized = (0, progress_event_evidence_1.materializeProgressEvidenceBundle)(effectiveEvidenceBundle);
    const projection = (0, progress_event_projection_1.deriveProgressProjection)(canonical.projection);
    const requestFingerprint = (0, decision_registry_1.hashCanonicalBody)({ accountScopeHash: canonical.accountScopeHash, seasonId: canonical.seasonId, studyTarget: canonical.studyTarget, learnerSourceLocale: canonical.learnerSourceLocale, seasonRevisionId: canonical.seasonRevisionId, episodeRevisionRef: canonical.episodeRevisionRef, idempotencyKey: canonical.idempotencyKey, attemptBodyHash: canonical.attemptRef.attemptBodyHash, componentFingerprint: materialized.componentFingerprint, projection, ...(canonical.terminalRef ? { terminalRef: canonical.terminalRef } : {}) });
    await tx.validatePinnedScope(canonical);
    const replay = await tx.readOperation(canonical.idempotencyKey, canonical.seasonRevisionId);
    if (replay) {
        if (!isValidOperationEnvelope(replay))
            throw new Error("v2_progress_operation_invalid");
        if (replay.requestFingerprint !== requestFingerprint)
            throw new Error("v2_progress_idempotency_key_reused");
        if (replay.attemptBodyHash !== canonical.attemptRef.attemptBodyHash || replay.componentFingerprint !== materialized.componentFingerprint || !sameAttemptRef(replay.result.canonicalAttemptRef, canonical.attemptRef))
            throw new Error("v2_progress_operation_invalid");
        await tx.reconcileReplay(canonical, materialized, replay);
        return { ...replay.result, duplicate: true };
    }
    const priorAttempt = await tx.readAttempt(canonical.accountScopeHash, canonical.attemptRef.opId);
    if (priorAttempt) {
        if (priorAttempt.schemaVersion !== "v2-progress-attempt.v2" ||
            priorAttempt.attemptBodyHash !== canonical.attemptRef.attemptBodyHash ||
            priorAttempt.componentFingerprint !== materialized.componentFingerprint ||
            !(0, exports.isValidProgressProjection)(priorAttempt.projection) ||
            priorAttempt.effectiveProjectionFingerprint !== (0, exports.deriveEffectiveProjectionFingerprint)(priorAttempt.attemptBodyHash, priorAttempt.componentFingerprint, priorAttempt.projection) ||
            !sameProjectionIdentity(priorAttempt.projection, projection)) {
            throw new Error(priorAttempt.attemptBodyHash !== canonical.attemptRef.attemptBodyHash
                ? "v2_progress_attempt_op_reused"
                : "v2_progress_attempt_projection_conflict");
        }
        const result = { accepted: true, duplicate: true, canonicalAttemptRef: (0, attempt_1.buildCanonicalAttemptRef)(canonical.attemptBody) };
        const operation = {
            schemaVersion: "v2-progress-event-operation.v1",
            requestFingerprint,
            attemptBodyHash: canonical.attemptRef.attemptBodyHash,
            componentFingerprint: materialized.componentFingerprint,
            effectiveProjectionFingerprint: priorAttempt.effectiveProjectionFingerprint,
            projection: priorAttempt.projection,
            result,
        };
        await tx.reconcileReplay(canonical, materialized, operation);
        await tx.createOperation(canonical.idempotencyKey, operation);
        return result;
    }
    const serverProjection = tx.resolveServerProjection ? await tx.resolveServerProjection(canonical, materialized) : undefined;
    const effectiveProjection = serverProjection?.projection ?? projection;
    const effectiveProjectionFingerprint = (0, exports.deriveEffectiveProjectionFingerprint)(canonical.attemptRef.attemptBodyHash, materialized.componentFingerprint, effectiveProjection);
    await tx.prepareTransactionPlan(canonical, materialized, effectiveProjection, serverProjection?.resolution);
    await tx.writeProgressProjection(canonical, effectiveProjection);
    await tx.writeAttempt(canonical.accountScopeHash, canonical.attemptRef.opId, {
        schemaVersion: "v2-progress-attempt.v2",
        attemptBodyHash: canonical.attemptRef.attemptBodyHash,
        componentFingerprint: materialized.componentFingerprint,
        effectiveProjectionFingerprint,
        projection: effectiveProjection,
    });
    await tx.writeEvidenceMaterialization(canonical, materialized);
    const result = { accepted: true, duplicate: false, canonicalAttemptRef: (0, attempt_1.buildCanonicalAttemptRef)(canonical.attemptBody) };
    await tx.createOperation(canonical.idempotencyKey, { schemaVersion: "v2-progress-event-operation.v1", requestFingerprint, attemptBodyHash: canonical.attemptRef.attemptBodyHash, componentFingerprint: materialized.componentFingerprint, effectiveProjectionFingerprint, projection: effectiveProjection, result });
    return result;
});
exports.applyProgressEvent = applyProgressEvent;
//# sourceMappingURL=progress_event.js.map