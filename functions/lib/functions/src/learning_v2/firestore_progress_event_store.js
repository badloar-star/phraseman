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
exports.createFirestoreProgressEventStore = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const episode_revision_resolver_1 = require("../content_studio/episode_revision_resolver");
const firestore_authoring_store_1 = require("../content_studio/firestore_authoring_store");
const season_revision_resolver_1 = require("../content_studio/season_revision_resolver");
const progress_event_1 = require("./progress_event");
const progress_event_projection_1 = require("./progress_event_projection");
const server_score_resolver_1 = require("./server_score_resolver");
const progress_event_transaction_plan_1 = require("./progress_event_transaction_plan");
const server_score_policy_evaluator_1 = require("./server_score_policy_evaluator");
const server_score_policy_catalog_1 = require("./server_score_policy_catalog");
const safe = (value) => value.replace(/[^A-Za-z0-9._-]/g, "_");
const operationPath = (scope, season, operation) => `learning_v2_progress_operations/${safe(scope)}__${safe(season)}__${safe(operation)}`;
const attemptPath = (scope, season, episode, op) => `learning_v2_progress_attempts/${safe(scope)}__${safe(season)}__${safe(episode)}__${safe(op)}`;
// Use the canonical account-scope hash rather than a sanitized UID. Sanitizing
// alone would make identities such as `a/b` and `a_b` address the same path.
const evidencePath = (accountScopeHash, season, episode, tupleKey) => `users/${safe(accountScopeHash)}/v2_progress/${safe(season)}/episodes/${safe(episode)}/evidence/${safe(tupleKey)}`;
const projectionPath = (accountScopeHash, season, episode, slot) => `users/${safe(accountScopeHash)}/v2_progress/${safe(season)}/episodes/${safe(episode)}/slots/${safe(slot)}`;
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
    return {
        runTransaction: async (work) => work(txStore(options, transaction)),
        validatePinnedScope: async (request) => {
            (0, progress_event_1.assertProgressAccountScope)(request.accountScopeHash, serverScopeHash);
            const season = await (0, season_revision_resolver_1.resolveImmutableSeasonRevision)({
                revisionPath: `content_season_revisions/${safe(request.seasonRevisionId)}`,
                lifecyclePath: `content_season_lifecycle/${safe(request.seasonRevisionId)}`,
                objectReader: options.seasonObjectReader ?? (0, season_revision_resolver_1.createStorageSeasonRevisionObjectReader)(admin.storage().bucket()),
                documentReader: { read: async (path) => { const snapshot = await get(path); return { exists: snapshot.exists, data: () => snapshot.data() }; } },
            });
            const resolver = options.episodeResolver ?? (0, firestore_authoring_store_1.createFirestoreEpisodeRevisionResolver)(db);
            const episode = await (0, episode_revision_resolver_1.assertExactImmutableEpisodeRevision)(resolver, request.episodeRevisionRef, { get: async (path) => { const snapshot = await get(path); return { exists: snapshot.exists, data: () => snapshot.data() }; } });
            (0, progress_event_1.assertResolvedProgressPins)(request, season, episode);
            pinnedEpisode = episode;
            pinnedRequest = request;
        },
        resolveServerProjection: (resolveServerScore || (scoringTemplates && scoringPolicies)) ? async (request, materialized) => {
            if (!pinnedRequest || !pinnedEpisode)
                throw new Error("progress_pin_validation_required");
            const projectionRef = db.doc(projectionPath(serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, request.projection.starSlotId));
            // The callback needs the current best, but must not be allowed to write
            // anything before the normal prepare/write phase.
            const existing = await transaction.get(projectionRef);
            const previousBestStars = existing.exists ? Number(existing.data()?.projection?.performanceStars ?? 0) : undefined;
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
            const projectionRef = db.doc(projectionPath(serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, projection.starSlotId));
            const projectionSnapshot = await transaction.get(projectionRef);
            projectionExists = projectionSnapshot.exists;
            const existingIndex = {};
            for (const ref of materialized.refs) {
                const evidenceSnapshot = await transaction.get(db.doc(evidencePath(serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, ref.tupleKey)));
                if (evidenceSnapshot.exists) {
                    existingEvidenceKeys.add(ref.tupleKey);
                    existingIndex[ref.tupleKey] = evidenceSnapshot.data()?.ref;
                }
            }
            preparedPlan = (0, progress_event_transaction_plan_1.prepareProgressTransactionPlan)({ existingEvidenceIndex: existingIndex, existingBestStars: projectionSnapshot.exists ? projectionSnapshot.data()?.projection?.performanceStars : undefined, materialized, projection, trustedScoreResolution });
        },
        writeEvidenceMaterialization: async (request, materialized) => {
            if (!pinnedRequest)
                throw new Error("progress_pin_validation_required");
            for (const ref of materialized.refs) {
                if (existingEvidenceKeys.has(ref.tupleKey))
                    continue;
                const tupleKey = ref.tupleKey;
                transaction.create(db.doc(evidencePath(serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, tupleKey)), { schemaVersion: "v2-progress-evidence-ref.v1", accountStableUid: options.stableUid, accountGeneration: options.accountGeneration, accountScopeHash: serverScopeHash, seasonRevisionId: request.seasonRevisionId, episodeId: request.episodeRevisionRef.episodeId, tupleKey, ref, componentFingerprint: materialized.componentFingerprint });
            }
        },
        writeProgressProjection: async (request, projection) => {
            if (!pinnedRequest)
                throw new Error("progress_pin_validation_required");
            if (!preparedPlan)
                throw new Error("progress_transaction_plan_required");
            if (!preparedPlan.applyProjection)
                return;
            const ref = db.doc(projectionPath(serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, projection.starSlotId));
            const value = { schemaVersion: "v2-progress-projection.v1", accountStableUid: options.stableUid, accountGeneration: options.accountGeneration, seasonRevisionId: request.seasonRevisionId, episodeId: request.episodeRevisionRef.episodeId, projection };
            if (projectionExists)
                transaction.set(ref, value, { merge: false });
            else
                transaction.create(ref, value);
        },
        readOperation: async (idempotencyKey, seasonRevisionId) => {
            if (!seasonRevisionId)
                throw new Error("progress_season_scope_required");
            const snapshot = await get(operationPath(serverScopeHash, seasonRevisionId, idempotencyKey));
            return snapshot.exists ? snapshot.data() : undefined;
        },
        createOperation: async (idempotencyKey, operation) => {
            if (!pinnedRequest)
                throw new Error("progress_pin_validation_required");
            transaction.create(db.doc(operationPath(serverScopeHash, pinnedRequest.seasonRevisionId, idempotencyKey)), operation);
        },
        readAttempt: async (scope, opId) => {
            if (!pinnedRequest)
                throw new Error("progress_pin_validation_required");
            const snapshot = await get(attemptPath(scope, pinnedRequest.seasonRevisionId, pinnedRequest.episodeRevisionRef.episodeId, opId));
            return snapshot.exists ? String(snapshot.data().attemptBodyHash ?? "") : undefined;
        },
        writeAttempt: async (scope, opId, attemptBodyHash) => {
            if (!pinnedRequest)
                throw new Error("progress_pin_validation_required");
            transaction.create(db.doc(attemptPath(scope, pinnedRequest.seasonRevisionId, pinnedRequest.episodeRevisionRef.episodeId, opId)), { schemaVersion: "v2-progress-attempt.v1", attemptBodyHash });
        },
    };
};
const createFirestoreProgressEventStore = (options) => ({
    runTransaction: async (work) => options.db.runTransaction(async (transaction) => {
        await assertLiveTransactionBinding(options, transaction);
        return work(txStore(options, transaction));
    }),
    validatePinnedScope: async () => { throw new Error("progress_transaction_required"); },
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
//# sourceMappingURL=firestore_progress_event_store.js.map