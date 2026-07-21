"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFirestoreProgressEventStore = exports.progressAttemptDocumentId = exports.progressOperationDocumentId = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const episode_revision_resolver_1 = require("../content_studio/episode_revision_resolver");
const firestore_authoring_store_1 = require("../content_studio/firestore_authoring_store");
const season_revision_resolver_1 = require("../content_studio/season_revision_resolver");
const progress_event_1 = require("./progress_event");
const progress_event_evidence_1 = require("./progress_event_evidence");
const progress_event_projection_1 = require("./progress_event_projection");
const server_score_resolver_1 = require("./server_score_resolver");
const progress_event_transaction_plan_1 = require("./progress_event_transaction_plan");
const server_score_policy_evaluator_1 = require("./server_score_policy_evaluator");
const server_score_policy_catalog_1 = require("./server_score_policy_catalog");
const delayed_probe_ingestion_1 = require("./delayed_probe_ingestion");
const delayed_probe_1 = require("../../../modules/learning-v2/contracts/delayed_probe");
const delayed_receipts_1 = require("../../../modules/learning-v2/contracts/delayed_receipts");
const evidence_1 = require("../../../modules/learning-v2/contracts/evidence");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const safe = (value) => value.replace(/[^A-Za-z0-9._-]/g, "_");
const stableOwner = (stableUid) => {
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(stableUid) || stableUid === "." || stableUid === "..") {
        throw new Error("v2_progress_stable_owner_invalid");
    }
    return stableUid;
};
const progressOperationDocumentId = (scope, season, operation) => `opv1_${(0, decision_registry_1.hashCanonicalBody)([scope, season, operation])}`;
exports.progressOperationDocumentId = progressOperationDocumentId;
const progressAttemptDocumentId = (scope, season, episode, op) => `atv1_${(0, decision_registry_1.hashCanonicalBody)([scope, season, episode, op])}`;
exports.progressAttemptDocumentId = progressAttemptDocumentId;
const operationPath = (stableUid, scope, season, operation) => `users/${stableOwner(stableUid)}/v2_progress_ops/${(0, exports.progressOperationDocumentId)(scope, season, operation)}`;
const attemptPath = (stableUid, scope, season, episode, op) => `users/${stableOwner(stableUid)}/v2_progress_attempts/${(0, exports.progressAttemptDocumentId)(scope, season, episode, op)}`;
const progressScopeRoot = (stableUid, accountScopeHash) => `users/${stableOwner(stableUid)}/v2_progress/${safe(accountScopeHash)}`;
const evidencePath = (stableUid, accountScopeHash, season, episode, tupleKey) => `${progressScopeRoot(stableUid, accountScopeHash)}/seasons/${safe(season)}/episodes/${safe(episode)}/evidence/${safe(tupleKey)}`;
const projectionPath = (stableUid, accountScopeHash, season, episode, slot) => `${progressScopeRoot(stableUid, accountScopeHash)}/seasons/${safe(season)}/episodes/${safe(episode)}/slots/${safe(slot)}`;
const delayedTerminalPath = (stableUid, accountScopeHash, mutationId) => `users/${stableOwner(stableUid)}/v2_delayed_attempts/${accountScopeHash}__${safe(mutationId)}`;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const hasExactKeys = (value, keys) => Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const sameAttemptRef = (left, right) => left.schemaVersion === right.schemaVersion && left.opId === right.opId && left.attemptBodyHash === right.attemptBodyHash;
const sameProjectionIdentity = (left, right) => left.starSlotId === right.starSlotId && left.activityId === right.activityId && left.progressCompatibilityKey === right.progressCompatibilityKey;
const validateTrustedDelayedTerminal = (request, raw, serverScopeHash, accountGeneration) => {
    if (!isRecord(raw) || !hasExactKeys(raw, ["schemaVersion", "mutationId", "accountScopeHash", "accountGeneration", "receipt", "receiptHash", "terminalStatus"]) || raw.schemaVersion !== "v2-delayed-probe-terminal.v1")
        throw new Error("delayed_terminal_record_invalid");
    if (raw.accountScopeHash !== serverScopeHash || raw.accountGeneration !== accountGeneration)
        throw new Error("delayed_terminal_account_mismatch");
    if (raw.mutationId !== request.terminalRef?.mutationId)
        throw new Error("delayed_terminal_mutation_mismatch");
    if (typeof raw.receiptHash !== "string" || !/^[a-f0-9]{64}$/.test(raw.receiptHash) || (0, decision_registry_1.hashCanonicalBody)(raw.receipt) !== raw.receiptHash)
        throw new Error("delayed_terminal_record_invalid");
    if (!isRecord(raw.receipt) || !hasExactKeys(raw.receipt, ["kind", "body", "ref"]) || !isRecord(raw.receipt.body))
        throw new Error("delayed_terminal_record_invalid");
    const receiptAttemptRef = raw.receipt.body.attemptRef;
    if (!isRecord(receiptAttemptRef) || !sameAttemptRef(receiptAttemptRef, request.attemptRef))
        throw new Error("delayed_terminal_attempt_mismatch");
    if (request.attemptBody.attemptSurface.kind !== "scheduled_delayed_probe")
        throw new Error("delayed_terminal_attempt_invalid");
    const attemptBody = request.attemptBody;
    const candidate = { schemaVersion: "v2-delayed-attempt-candidate.v1", attemptBody, attemptRef: request.attemptRef };
    const expectedTupleKeys = attemptBody.delayedCandidates.map((entry) => (0, evidence_1.buildLearningEvidenceTupleKey)(entry.binding));
    let expectedResolutions = [];
    let expectedStatus;
    if (raw.receipt.kind === "timing") {
        const receipt = raw.receipt;
        const resolved = (0, delayed_probe_1.resolveDelayedTerminal)(candidate, receipt.body.assessmentTiming, expectedTupleKeys);
        if (!resolved.ok)
            throw new Error("delayed_terminal_record_invalid");
        expectedResolutions = resolved.resolutions.filter((resolution) => resolution.terminalDisposition !== "no_record");
        const materializedKeys = expectedResolutions.map((resolution) => resolution.tupleKey);
        if (!(0, delayed_receipts_1.validateTimingReceipt)(receipt.body, receipt.ref, materializedKeys, request.attemptRef).ok)
            throw new Error("delayed_terminal_record_invalid");
        if ((0, decision_registry_1.hashCanonicalBody)(receipt.body.terminalTupleResolutions) !== (0, decision_registry_1.hashCanonicalBody)(expectedResolutions))
            throw new Error("delayed_terminal_evidence_mismatch");
        expectedStatus = "timed_finalized";
    }
    else if (raw.receipt.kind === "failure") {
        const receipt = raw.receipt;
        if (!isRecord(receipt.body.decision))
            throw new Error("delayed_terminal_record_invalid");
        if (receipt.body.decision.kind === "system_non_assessment") {
            const resolved = (0, delayed_probe_1.resolveDelayedTerminal)(candidate, "system_failure", expectedTupleKeys);
            if (!resolved.ok)
                throw new Error("delayed_terminal_record_invalid");
            expectedResolutions = resolved.resolutions.filter((resolution) => resolution.terminalDisposition !== "no_record");
            const materializedKeys = expectedResolutions.map((resolution) => resolution.tupleKey);
            if (!(0, delayed_receipts_1.validateFailureReceipt)(receipt.body, receipt.ref, materializedKeys, request.attemptRef).ok)
                throw new Error("delayed_terminal_record_invalid");
            if ((0, decision_registry_1.hashCanonicalBody)(receipt.body.decision.terminalTupleResolutions) !== (0, decision_registry_1.hashCanonicalBody)(expectedResolutions))
                throw new Error("delayed_terminal_evidence_mismatch");
            expectedStatus = "system_non_assessment_finalized";
        }
        else {
            if (!(0, delayed_receipts_1.validateFailureReceipt)(receipt.body, receipt.ref, [], request.attemptRef).ok)
                throw new Error("delayed_terminal_record_invalid");
            expectedStatus = "protocol_rejected";
        }
    }
    else {
        throw new Error("delayed_terminal_record_invalid");
    }
    if (raw.terminalStatus !== expectedStatus)
        throw new Error("delayed_terminal_record_invalid");
    const terminal = raw;
    const bundle = (0, delayed_probe_ingestion_1.materializeDelayedTerminalEvidence)(attemptBody, terminal);
    const materialized = (0, progress_event_evidence_1.materializeProgressEvidenceBundle)(bundle);
    if (!sameAttemptRef(bundle.attemptRef, request.attemptRef) || materialized.refs.length !== expectedResolutions.length)
        throw new Error("delayed_terminal_evidence_mismatch");
    return bundle;
};
const transactionBindingPaths = (options) => ({
    authLink: `auth_links/${options.authUid}`,
    user: `users/${options.stableUid}`,
    tombstone: `account_deletion_tombstones/${options.stableUid}`,
});
const assertLiveTransactionBinding = async (options, transaction) => {
    const paths = transactionBindingPaths(options);
    const [authLinkSnapshot, userSnapshot, tombstoneSnapshot] = await Promise.all([
        transaction.get(options.db.doc(paths.authLink)),
        transaction.get(options.db.doc(paths.user)),
        transaction.get(options.db.doc(paths.tombstone)),
    ]);
    await options.testHooks?.afterBindingReads?.();
    if (!authLinkSnapshot.exists) {
        throw new https_1.HttpsError("failed-precondition", "progress_identity_anchor_missing");
    }
    const anchoredStableUid = String(authLinkSnapshot.data()?.stable_id ?? "").trim();
    if (!anchoredStableUid || anchoredStableUid !== options.stableUid) {
        throw new https_1.HttpsError("permission-denied", "stable_id_mismatch");
    }
    if (tombstoneSnapshot.exists) {
        throw new https_1.HttpsError("failed-precondition", "account_delete_pending");
    }
    const userData = userSnapshot.exists ? userSnapshot.data() ?? {} : {};
    const liveGeneration = Number(userData.accountGeneration ?? userData.generation);
    const expectedScopeHash = (0, progress_event_1.deriveProgressAccountScopeHash)(options.stableUid, options.accountGeneration);
    if (!Number.isSafeInteger(liveGeneration) ||
        liveGeneration < 1 ||
        liveGeneration !== options.accountGeneration ||
        options.accountScopeHash !== expectedScopeHash) {
        throw new https_1.HttpsError("failed-precondition", "account_generation_mismatch");
    }
};
const txStore = (options, transaction) => {
    const { db } = options;
    const serverScopeHash = (0, progress_event_1.deriveProgressAccountScopeHash)(options.stableUid, options.accountGeneration);
    let pinnedRequest;
    let preparedPlan;
    let projectionExists = false;
    let pinnedEpisode;
    const resolveServerScore = options.resolveServerScore;
    const scoringTemplates = options.scoringTemplates;
    // The executable catalog is code-owned. Callers may inject a reviewed
    // catalog for another release, but an omitted catalog must never silently
    // fall back to client descriptors or an ad-hoc formula.
    const scoringPolicies = options.scoringPolicies ?? server_score_policy_catalog_1.PILOT_SCORING_POLICY_CATALOG;
    const existingEvidenceKeys = new Set();
    const get = async (path) => transaction.get(db.doc(path));
    const readStoredProjection = (value, request) => {
        if (!isRecord(value) || !hasExactKeys(value, ["schemaVersion", "accountStableUid", "accountGeneration", "accountScopeHash", "seasonRevisionId", "episodeId", "projection"]) ||
            value.schemaVersion !== "v2-progress-projection.v1" || value.accountStableUid !== options.stableUid || value.accountGeneration !== options.accountGeneration ||
            value.accountScopeHash !== serverScopeHash || value.seasonRevisionId !== request.seasonRevisionId || value.episodeId !== request.episodeRevisionRef.episodeId || !(0, progress_event_1.isValidProgressProjection)(value.projection) ||
            !sameProjectionIdentity(value.projection, { ...value.projection, starSlotId: request.projection.starSlotId, activityId: request.projection.activityId, progressCompatibilityKey: request.projection.progressCompatibilityKey })) {
            throw new Error("v2_progress_projection_state_invalid");
        }
        return value.projection;
    };
    return {
        runTransaction: async (work) => work(txStore(options, transaction)),
        resolveDelayedEvidence: async (request) => {
            (0, progress_event_1.assertProgressAccountScope)(request.accountScopeHash, serverScopeHash);
            if (!request.terminalRef)
                throw new Error("delayed_terminal_reference_required");
            const snapshot = await get(delayedTerminalPath(options.stableUid, serverScopeHash, request.terminalRef.mutationId));
            if (!snapshot.exists)
                throw new Error("delayed_terminal_missing");
            return validateTrustedDelayedTerminal(request, snapshot.data(), serverScopeHash, options.accountGeneration);
        },
        validatePinnedScope: async (request) => {
            (0, progress_event_1.assertProgressAccountScope)(request.accountScopeHash, serverScopeHash);
            const season = await (0, season_revision_resolver_1.resolveImmutableSeasonRevision)({
                revisionPath: `content_season_revisions/${safe(request.seasonRevisionId)}`,
                lifecyclePath: `content_season_lifecycle/${safe(request.seasonRevisionId)}`,
                objectReader: options.seasonObjectReader ?? (0, season_revision_resolver_1.createStorageSeasonRevisionObjectReader)(admin.storage().bucket()),
                documentReader: { read: async (path) => { const snapshot = await get(path); return { exists: snapshot.exists, data: () => snapshot.data() }; } },
            });
            const resolver = options.episodeResolver ?? (0, firestore_authoring_store_1.createFirestoreEpisodeRevisionResolver)(db, undefined, (0, firestore_authoring_store_1.createFirestoreModeTemplateResolver)(db, undefined, { allowDeprecated: true }));
            const episode = await (0, episode_revision_resolver_1.assertExactImmutableEpisodeRevision)(resolver, request.episodeRevisionRef, { get: async (path) => { const snapshot = await get(path); return { exists: snapshot.exists, data: () => snapshot.data() }; } });
            (0, progress_event_1.assertResolvedProgressPins)(request, season, episode);
            pinnedEpisode = episode;
            pinnedRequest = request;
        },
        resolveServerProjection: (resolveServerScore || (scoringTemplates && scoringPolicies)) ? async (request, materialized) => {
            if (!pinnedRequest || !pinnedEpisode)
                throw new Error("progress_pin_validation_required");
            const projectionRef = db.doc(projectionPath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, request.projection.starSlotId));
            // The callback needs the current best, but must not be allowed to write
            // anything before the normal prepare/write phase.
            const existing = await transaction.get(projectionRef);
            const previousBestStars = existing.exists ? readStoredProjection(existing.data(), request).performanceStars : undefined;
            const resolution = resolveServerScore
                ? await resolveServerScore({ request, attemptBody: request.attemptBody, attemptRef: request.attemptRef, evidence: materialized, episodeRevision: pinnedEpisode, previousBestStars })
                : await (0, server_score_policy_evaluator_1.resolvePinnedServerScore)({ episodeRevision: pinnedEpisode, attemptRef: request.attemptRef, attemptBody: request.attemptBody, activityId: request.projection.activityId, starSlotId: request.projection.starSlotId, progressCompatibilityKey: request.projection.progressCompatibilityKey, evidenceComponentFingerprint: materialized.componentFingerprint, templates: scoringTemplates, policies: scoringPolicies });
            if (!resolution)
                return undefined;
            (0, server_score_resolver_1.assertServerScoreResolution)(resolution, { attemptRef: request.attemptRef, activityId: request.projection.activityId, starSlotId: request.projection.starSlotId, progressCompatibilityKey: request.projection.progressCompatibilityKey, scoringPolicyRef: resolution.scoringPolicyRef, evidenceComponentFingerprint: materialized.componentFingerprint });
            const projection = (0, progress_event_projection_1.deriveProgressProjectionFromServerScore)({ previousBestStars: previousBestStars ?? 0, resolution });
            return { projection, resolution };
        } : undefined,
        prepareTransactionPlan: async (request, materialized, projection, trustedScoreResolution) => {
            if (!pinnedRequest)
                throw new Error("progress_pin_validation_required");
            const projectionRef = db.doc(projectionPath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, projection.starSlotId));
            const projectionSnapshot = await transaction.get(projectionRef);
            projectionExists = projectionSnapshot.exists;
            const existingProjection = projectionSnapshot.exists ? readStoredProjection(projectionSnapshot.data(), request) : undefined;
            const existingIndex = {};
            for (const ref of materialized.refs) {
                const evidenceSnapshot = await transaction.get(db.doc(evidencePath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, ref.tupleKey)));
                if (evidenceSnapshot.exists) {
                    existingEvidenceKeys.add(ref.tupleKey);
                    existingIndex[ref.tupleKey] = evidenceSnapshot.data()?.ref;
                }
            }
            preparedPlan = (0, progress_event_transaction_plan_1.prepareProgressTransactionPlan)({ existingEvidenceIndex: existingIndex, existingBestStars: existingProjection?.performanceStars, materialized, projection, trustedScoreResolution });
        },
        writeEvidenceMaterialization: async (request, materialized) => {
            if (!pinnedRequest)
                throw new Error("progress_pin_validation_required");
            for (const ref of materialized.refs) {
                if (existingEvidenceKeys.has(ref.tupleKey))
                    continue;
                const tupleKey = ref.tupleKey;
                transaction.create(db.doc(evidencePath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, tupleKey)), { schemaVersion: "v2-progress-evidence-ref.v1", accountStableUid: options.stableUid, accountGeneration: options.accountGeneration, accountScopeHash: serverScopeHash, seasonRevisionId: request.seasonRevisionId, episodeId: request.episodeRevisionRef.episodeId, tupleKey, ref, componentFingerprint: materialized.componentFingerprint });
            }
        },
        writeProgressProjection: async (request, projection) => {
            if (!pinnedRequest)
                throw new Error("progress_pin_validation_required");
            if (!preparedPlan)
                throw new Error("progress_transaction_plan_required");
            if (!preparedPlan.applyProjection)
                return;
            const ref = db.doc(projectionPath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, projection.starSlotId));
            const value = { schemaVersion: "v2-progress-projection.v1", accountStableUid: options.stableUid, accountGeneration: options.accountGeneration, accountScopeHash: serverScopeHash, seasonRevisionId: request.seasonRevisionId, episodeId: request.episodeRevisionRef.episodeId, projection };
            if (projectionExists)
                transaction.set(ref, value, { merge: false });
            else
                transaction.create(ref, value);
        },
        readOperation: async (idempotencyKey, seasonRevisionId) => {
            if (!seasonRevisionId)
                throw new Error("progress_season_scope_required");
            const snapshot = await get(operationPath(options.stableUid, serverScopeHash, seasonRevisionId, idempotencyKey));
            return snapshot.exists ? snapshot.data() : undefined;
        },
        reconcileReplay: async (request, materialized, operation) => {
            if (!pinnedRequest)
                throw new Error("progress_pin_validation_required");
            if (!(0, progress_event_1.isValidProgressProjection)(operation.projection) || !sameProjectionIdentity(operation.projection, {
                ...operation.projection,
                starSlotId: request.projection.starSlotId,
                activityId: request.projection.activityId,
                progressCompatibilityKey: request.projection.progressCompatibilityKey,
            }) || operation.effectiveProjectionFingerprint !== (0, progress_event_1.deriveEffectiveProjectionFingerprint)(operation.attemptBodyHash, operation.componentFingerprint, operation.projection))
                throw new Error("v2_progress_replay_projection_conflict");
            const projectionRef = db.doc(projectionPath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, operation.projection.starSlotId));
            const projectionSnapshot = await transaction.get(projectionRef);
            const projectionEnvelope = projectionSnapshot.data();
            if (projectionSnapshot.exists && (!isRecord(projectionEnvelope) || !hasExactKeys(projectionEnvelope, ["schemaVersion", "accountStableUid", "accountGeneration", "accountScopeHash", "seasonRevisionId", "episodeId", "projection"]) ||
                projectionEnvelope.schemaVersion !== "v2-progress-projection.v1" || projectionEnvelope.accountStableUid !== options.stableUid || projectionEnvelope.accountGeneration !== options.accountGeneration ||
                projectionEnvelope.accountScopeHash !== serverScopeHash || projectionEnvelope.seasonRevisionId !== request.seasonRevisionId || projectionEnvelope.episodeId !== request.episodeRevisionRef.episodeId || !(0, progress_event_1.isValidProgressProjection)(projectionEnvelope.projection) ||
                !sameProjectionIdentity(projectionEnvelope.projection, operation.projection) || projectionEnvelope.projection.performanceStars < operation.projection.performanceStars)) {
                throw new Error("v2_progress_replay_projection_conflict");
            }
            const attemptRef = db.doc(attemptPath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, request.attemptRef.opId));
            const attemptSnapshot = await transaction.get(attemptRef);
            const expectedAttempt = {
                schemaVersion: "v2-progress-attempt.v2",
                attemptBodyHash: request.attemptRef.attemptBodyHash,
                componentFingerprint: materialized.componentFingerprint,
                effectiveProjectionFingerprint: operation.effectiveProjectionFingerprint,
                projection: operation.projection,
            };
            if (attemptSnapshot.exists) {
                const attempt = attemptSnapshot.data();
                if (!isRecord(attempt) || (0, decision_registry_1.hashCanonicalBody)(attempt) !== (0, decision_registry_1.hashCanonicalBody)(expectedAttempt))
                    throw new Error("v2_progress_replay_attempt_conflict");
            }
            const missingEvidence = [];
            for (const ref of materialized.refs) {
                const documentRef = db.doc(evidencePath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, ref.tupleKey));
                const snapshot = await transaction.get(documentRef);
                const value = { schemaVersion: "v2-progress-evidence-ref.v1", accountStableUid: options.stableUid, accountGeneration: options.accountGeneration, accountScopeHash: serverScopeHash, seasonRevisionId: request.seasonRevisionId, episodeId: request.episodeRevisionRef.episodeId, tupleKey: ref.tupleKey, ref, componentFingerprint: materialized.componentFingerprint };
                if (!snapshot.exists) {
                    missingEvidence.push({ ref: documentRef, value });
                    continue;
                }
                const existing = snapshot.data();
                if (!isRecord(existing) || !hasExactKeys(existing, ["schemaVersion", "accountStableUid", "accountGeneration", "accountScopeHash", "seasonRevisionId", "episodeId", "tupleKey", "ref", "componentFingerprint"]) ||
                    existing.schemaVersion !== value.schemaVersion || existing.accountStableUid !== value.accountStableUid || existing.accountGeneration !== value.accountGeneration || existing.accountScopeHash !== value.accountScopeHash ||
                    existing.seasonRevisionId !== value.seasonRevisionId || existing.episodeId !== value.episodeId || existing.tupleKey !== value.tupleKey || existing.componentFingerprint !== value.componentFingerprint ||
                    !isRecord(existing.ref) || (0, decision_registry_1.hashCanonicalBody)(existing.ref) !== (0, decision_registry_1.hashCanonicalBody)(value.ref))
                    throw new Error("v2_progress_replay_evidence_conflict");
            }
            if (!projectionSnapshot.exists) {
                transaction.create(projectionRef, {
                    schemaVersion: "v2-progress-projection.v1",
                    accountStableUid: options.stableUid,
                    accountGeneration: options.accountGeneration,
                    accountScopeHash: serverScopeHash,
                    seasonRevisionId: request.seasonRevisionId,
                    episodeId: request.episodeRevisionRef.episodeId,
                    projection: operation.projection,
                });
            }
            if (!attemptSnapshot.exists)
                transaction.create(attemptRef, expectedAttempt);
            for (const missing of missingEvidence)
                transaction.create(missing.ref, missing.value);
        },
        createOperation: async (idempotencyKey, operation) => {
            if (!pinnedRequest)
                throw new Error("progress_pin_validation_required");
            transaction.create(db.doc(operationPath(options.stableUid, serverScopeHash, pinnedRequest.seasonRevisionId, idempotencyKey)), operation);
        },
        readAttempt: async (scope, opId) => {
            if (!pinnedRequest)
                throw new Error("progress_pin_validation_required");
            (0, progress_event_1.assertProgressAccountScope)(scope, serverScopeHash);
            const snapshot = await get(attemptPath(options.stableUid, serverScopeHash, pinnedRequest.seasonRevisionId, pinnedRequest.episodeRevisionRef.episodeId, opId));
            return snapshot.exists ? snapshot.data() : undefined;
        },
        writeAttempt: async (scope, opId, attempt) => {
            if (!pinnedRequest)
                throw new Error("progress_pin_validation_required");
            (0, progress_event_1.assertProgressAccountScope)(scope, serverScopeHash);
            transaction.create(db.doc(attemptPath(options.stableUid, serverScopeHash, pinnedRequest.seasonRevisionId, pinnedRequest.episodeRevisionRef.episodeId, opId)), attempt);
        },
    };
};
const createFirestoreProgressEventStore = (options) => ({
    runTransaction: async (work) => options.db.runTransaction(async (transaction) => {
        await assertLiveTransactionBinding(options, transaction);
        return work(txStore(options, transaction));
    }),
    resolveDelayedEvidence: async () => { throw new Error("progress_transaction_required"); },
    validatePinnedScope: async () => { throw new Error("progress_transaction_required"); },
    reconcileReplay: async () => { throw new Error("progress_transaction_required"); },
    resolveServerProjection: undefined,
    prepareTransactionPlan: async () => { throw new Error("progress_transaction_required"); },
    writeEvidenceMaterialization: async () => { throw new Error("progress_transaction_required"); },
    writeProgressProjection: async () => { throw new Error("progress_transaction_required"); },
    readOperation: async () => { throw new Error("progress_transaction_required"); },
    createOperation: async () => { throw new Error("progress_transaction_required"); },
    readAttempt: async () => { throw new Error("progress_transaction_required"); },
    writeAttempt: async () => { throw new Error("progress_transaction_required"); },
});
exports.createFirestoreProgressEventStore = createFirestoreProgressEventStore;
