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
exports.learningV2ActivityReleasedSessionGetV1 = exports.V2_ACTIVITY_RELEASED_SESSION_CALLABLE_OPTIONS_V1 = exports.V2_ACTIVITY_RELEASED_SESSION_RESPONSE_SCHEMA_V1 = void 0;
exports.assertV2UnifiedActivityReleaseJoinV1 = assertV2UnifiedActivityReleaseJoinV1;
exports.loadV2ActivityReleaseHandlesFromUnifiedRootV1 = loadV2ActivityReleaseHandlesFromUnifiedRootV1;
exports.resolveV2ActivityReleasedServerEnvironmentV1 = resolveV2ActivityReleasedServerEnvironmentV1;
exports.resolveV2ActivityReleasedSessionFromAuthenticatedRepositoryV1 = resolveV2ActivityReleasedSessionFromAuthenticatedRepositoryV1;
exports.createV2ActivityReleasedSessionHandlerV1 = createV2ActivityReleasedSessionHandlerV1;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const release_rollout_v1_1 = require("../../../modules/learning-v2/content/release_rollout_v1");
const activity_released_session_package_v1_1 = require("../../../modules/learning-v2/runtime/activity_released_session_package_v1");
const activity_auxiliary_client_descriptor_v1_1 = require("../../../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1");
const auth_identity_1 = require("../auth_identity");
const v2_firebase_activity_auxiliary_release_adapter_v1_1 = require("./v2_firebase_activity_auxiliary_release_adapter_v1");
const v2_firebase_activity_learner_core_release_adapter_v1_1 = require("./v2_firebase_activity_learner_core_release_adapter_v1");
const v2_firebase_activity_server_evaluator_release_adapter_v1_1 = require("./v2_firebase_activity_server_evaluator_release_adapter_v1");
const v2_unified_course_release_repository_v1_1 = require("./v2_unified_course_release_repository_v1");
exports.V2_ACTIVITY_RELEASED_SESSION_RESPONSE_SCHEMA_V1 = "v2-activity-released-session-response.v1";
exports.V2_ACTIVITY_RELEASED_SESSION_CALLABLE_OPTIONS_V1 = Object.freeze({
    region: "us-central1",
    // зачем: App Check запломбирован владельцем 2026-08-17 («убрать отовсюду и
    // больше никогда не вспоминать»). Раньше здесь энфорс отключался только в
    // демо-эмуляторе, а на проде требовался — из-за чего дев-сборка получала 401
    // и опубликованный курс был нечитаем. Авторизация пользователя и запрет на
    // транспорт правильных ответов сохранены. Полный запрет: CLAUDE.md.
    enforceAppCheck: false,
    timeoutSeconds: 30,
    memory: "512MiB",
    maxInstances: 40,
});
function assertV2UnifiedActivityReleaseJoinV1(input) {
    const { learnerCore, evaluator, auxiliary, unifiedEpisode } = input;
    if (auxiliary.environment !== learnerCore.environment ||
        auxiliary.releaseId !== learnerCore.releaseId ||
        auxiliary.activeManifestHash !== learnerCore.activeManifestHash ||
        auxiliary.seasonId !== learnerCore.seasonId ||
        auxiliary.episodeId !== learnerCore.episodeId ||
        auxiliary.stageId !== learnerCore.stageId ||
        auxiliary.activityPackageFingerprint !==
            learnerCore.activityPackageFingerprint ||
        evaluator.environment !== learnerCore.environment ||
        evaluator.releaseId !== learnerCore.releaseId ||
        evaluator.activeManifestHash !== learnerCore.activeManifestHash ||
        evaluator.seasonId !== learnerCore.seasonId ||
        evaluator.episodeId !== learnerCore.episodeId ||
        evaluator.stageId !== learnerCore.stageId ||
        evaluator.activityPackageFingerprint !==
            learnerCore.activityPackageFingerprint ||
        input.unifiedReleaseId !== learnerCore.releaseId ||
        unifiedEpisode.episodeId !== learnerCore.episodeId ||
        unifiedEpisode.stageId !== learnerCore.stageId ||
        unifiedEpisode.activityPackageFingerprint !==
            learnerCore.activityPackageFingerprint ||
        unifiedEpisode.learnerCoreIndexFingerprint !==
            learnerCore.indexFingerprint ||
        unifiedEpisode.serverEvaluatorIndexFingerprint !==
            evaluator.indexFingerprint ||
        unifiedEpisode.auxiliaryIndexFingerprint !== auxiliary.indexFingerprint)
        throw new https_1.HttpsError("data-loss", "activity_release_join_mismatch");
}
async function loadV2ActivityReleaseHandlesFromUnifiedRootV1(input) {
    const [auxiliaryHandle, learnerCoreHandle, evaluatorHandle] = await Promise.all([
        input.auxiliary.loadPinned(input.activeHandle, input.episodeId),
        input.learnerCore.loadPinned(input.activeHandle, input.episodeId),
        input.evaluator.loadPinned(input.activeHandle, input.episodeId),
    ]);
    return Object.freeze({ auxiliaryHandle, learnerCoreHandle, evaluatorHandle });
}
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const CODE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/u;
function invalidArgument() {
    throw new https_1.HttpsError("invalid-argument", "activity_session_request_invalid");
}
function parseRequest(value) {
    if (typeof value !== "object" ||
        value === null ||
        Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Object.prototype)
        invalidArgument();
    const row = value;
    if (Object.keys(row).sort().join("|") !==
        "environment|episodeId|expectedActiveManifestHash|learnerSourceLocale|seasonId|sessionOrdinal|studyTarget" ||
        !["lab", "staging", "production"].includes(String(row.environment)) ||
        typeof row.studyTarget !== "string" ||
        !CODE_RE.test(row.studyTarget) ||
        typeof row.learnerSourceLocale !== "string" ||
        !CODE_RE.test(row.learnerSourceLocale) ||
        typeof row.seasonId !== "string" ||
        !ID_RE.test(row.seasonId) ||
        typeof row.episodeId !== "string" ||
        !ID_RE.test(row.episodeId) ||
        !(row.expectedActiveManifestHash === null ||
            (typeof row.expectedActiveManifestHash === "string" &&
                HASH_RE.test(row.expectedActiveManifestHash))) ||
        !Number.isSafeInteger(row.sessionOrdinal) ||
        Number(row.sessionOrdinal) < 1 ||
        Number(row.sessionOrdinal) > 12)
        invalidArgument();
    return Object.freeze({
        environment: row.environment,
        studyTarget: row.studyTarget,
        learnerSourceLocale: row.learnerSourceLocale,
        seasonId: row.seasonId,
        expectedActiveManifestHash: row.expectedActiveManifestHash,
        episodeId: row.episodeId,
        sessionOrdinal: Number(row.sessionOrdinal),
    });
}
function resolveV2ActivityReleasedServerEnvironmentV1() {
    const projectId = String(process.env.GCLOUD_PROJECT ?? "");
    if (process.env.FUNCTIONS_EMULATOR === "true" &&
        projectId.startsWith("demo-"))
        return "lab";
    if (projectId === "phraseman-ea0b3")
        return "production";
    throw new https_1.HttpsError("failed-precondition", "release_environment_unavailable");
}
async function resolveV2ActivityReleasedSessionFromAuthenticatedRepositoryV1(input, stableAccountId) {
    if (input.environment !== resolveV2ActivityReleasedServerEnvironmentV1()) {
        throw new https_1.HttpsError("failed-precondition", "release_environment_mismatch");
    }
    const unifiedRepository = (0, v2_unified_course_release_repository_v1_1.createFirebaseAdminV2UnifiedCourseReleaseRepositoryV1)();
    const unified = await unifiedRepository.readActive({
        environment: input.environment,
        seasonId: input.seasonId,
        studyTarget: input.studyTarget,
        learnerSourceLocale: input.learnerSourceLocale,
    });
    const unifiedEpisode = unified.root.episodes.find((episode) => episode.episodeId === input.episodeId);
    if (!unifiedEpisode)
        throw new https_1.HttpsError("not-found", "activity_release_episode_missing");
    const auxiliaryAdapter = (0, v2_firebase_activity_auxiliary_release_adapter_v1_1.createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1)();
    const learnerCoreAdapter = (0, v2_firebase_activity_learner_core_release_adapter_v1_1.createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1)();
    const evaluatorAdapter = (0, v2_firebase_activity_server_evaluator_release_adapter_v1_1.createFirebaseAdminV2ActivityServerEvaluatorReleaseAdapterV1)();
    const { auxiliaryHandle, learnerCoreHandle, evaluatorHandle } = await loadV2ActivityReleaseHandlesFromUnifiedRootV1({
        activeHandle: unified.activeHandle,
        episodeId: input.episodeId,
        auxiliary: auxiliaryAdapter,
        learnerCore: learnerCoreAdapter,
        evaluator: evaluatorAdapter,
    });
    const auxiliarySummary = (0, v2_firebase_activity_auxiliary_release_adapter_v1_1.getV2FirebaseActivityAuxiliaryReleaseSummaryV1)(auxiliaryHandle);
    const learnerCoreSummary = (0, v2_firebase_activity_learner_core_release_adapter_v1_1.getV2FirebaseActivityLearnerCoreReleaseSummaryV1)(learnerCoreHandle);
    const evaluatorSummary = (0, v2_firebase_activity_server_evaluator_release_adapter_v1_1.getV2FirebaseActivityServerEvaluatorReleaseSummaryV1)(evaluatorHandle);
    assertV2UnifiedActivityReleaseJoinV1({
        unifiedReleaseId: unified.root.releaseId,
        unifiedEpisode,
        learnerCore: learnerCoreSummary,
        evaluator: evaluatorSummary,
        auxiliary: auxiliarySummary,
    });
    const rollout = (0, release_rollout_v1_1.resolveLearningV2ReleaseRolloutV1)({
        pointer: {
            rollout: unified.root.rollout,
        },
        stableAccountId,
    });
    if (!rollout.eligible) {
        throw new https_1.HttpsError("permission-denied", "release_cohort_ineligible");
    }
    if (input.expectedActiveManifestHash !== null &&
        auxiliarySummary.activeManifestHash !== input.expectedActiveManifestHash) {
        throw new https_1.HttpsError("failed-precondition", "active_release_changed");
    }
    const [canonicalDescriptorRaw, learnerCoreSession] = await Promise.all([
        auxiliaryAdapter.projectSessionDescriptor(auxiliaryHandle, input.sessionOrdinal),
        learnerCoreAdapter.resolveSession(learnerCoreHandle, input.sessionOrdinal),
    ]);
    const descriptor = (0, activity_auxiliary_client_descriptor_v1_1.parseLearningV2ActivityAuxiliaryClientDescriptorV1)(canonicalDescriptorRaw);
    if (descriptor.environment !== input.environment ||
        descriptor.studyTarget !== input.studyTarget ||
        descriptor.learnerSourceLocale !== input.learnerSourceLocale ||
        descriptor.seasonId !== input.seasonId ||
        descriptor.activeManifestHash !== auxiliarySummary.activeManifestHash ||
        descriptor.episodeId !== input.episodeId ||
        descriptor.sessionId !== learnerCoreSession.sessionId ||
        descriptor.sessionOrdinal !== input.sessionOrdinal ||
        descriptor.activityPackageFingerprint !==
            learnerCoreSession.activityPackageFingerprint ||
        descriptor.activityPackageFingerprint !==
            auxiliarySummary.activityPackageFingerprint ||
        descriptor.auxiliaryIndexFingerprint !==
            auxiliarySummary.indexFingerprint ||
        descriptor.sourceFingerprint !== learnerCoreSession.sourceFingerprint ||
        descriptor.renderFingerprint !== learnerCoreSession.renderFingerprint)
        throw new https_1.HttpsError("data-loss", "activity_release_session_mismatch");
    const canonicalPackageRaw = (0, activity_released_session_package_v1_1.materializeLearningV2ActivityReleasedSessionPackageV1)({
        descriptor,
        renderRaw: learnerCoreSession.renderRaw,
        capsuleEnvelopeRaw: learnerCoreSession.capsuleEnvelopeRaw,
    });
    return Object.freeze({
        activeManifestHash: auxiliarySummary.activeManifestHash,
        unifiedReleaseId: unified.root.releaseId,
        unifiedRootFingerprint: unified.root.rootFingerprint,
        auxiliaryIndexFingerprint: auxiliarySummary.indexFingerprint,
        canonicalPackageRaw,
    });
}
function exactResolved(input, resolved) {
    let handle;
    let descriptor;
    try {
        handle = (0, activity_released_session_package_v1_1.parseLearningV2ActivityReleasedSessionPackageV1)(resolved.canonicalPackageRaw);
        const packageBody = JSON.parse(resolved.canonicalPackageRaw);
        if (typeof packageBody.auxiliaryDescriptorRaw !== "string")
            throw new Error("descriptor_missing");
        descriptor = (0, activity_auxiliary_client_descriptor_v1_1.parseLearningV2ActivityAuxiliaryClientDescriptorV1)(packageBody.auxiliaryDescriptorRaw);
    }
    catch {
        throw new https_1.HttpsError("data-loss", "activity_released_package_invalid");
    }
    const summary = (0, activity_released_session_package_v1_1.getLearningV2ActivityReleasedSessionPackageSummaryV1)(handle);
    if (!HASH_RE.test(resolved.activeManifestHash) ||
        !ID_RE.test(resolved.unifiedReleaseId) ||
        !HASH_RE.test(resolved.unifiedRootFingerprint) ||
        !HASH_RE.test(resolved.auxiliaryIndexFingerprint) ||
        (input.expectedActiveManifestHash !== null &&
            resolved.activeManifestHash !== input.expectedActiveManifestHash) ||
        descriptor.environment !== input.environment ||
        descriptor.studyTarget !== input.studyTarget ||
        descriptor.learnerSourceLocale !== input.learnerSourceLocale ||
        descriptor.seasonId !== input.seasonId ||
        descriptor.activeManifestHash !== resolved.activeManifestHash ||
        descriptor.episodeId !== input.episodeId ||
        descriptor.sessionOrdinal !== input.sessionOrdinal ||
        descriptor.auxiliaryIndexFingerprint !==
            resolved.auxiliaryIndexFingerprint ||
        summary.episodeId !== input.episodeId ||
        summary.sessionOrdinal !== input.sessionOrdinal ||
        summary.auxiliaryDescriptorFingerprint !==
            descriptor.descriptorFingerprint ||
        !HASH_RE.test(summary.auxiliaryDescriptorFingerprint))
        throw new https_1.HttpsError("data-loss", "activity_released_package_mismatch");
    return summary;
}
function createV2ActivityReleasedSessionHandlerV1(resolve = resolveV2ActivityReleasedSessionFromAuthenticatedRepositoryV1, resolveStableAccountId = async (authUid) => (0, auth_identity_1.resolveStableUidForAuth)(admin.firestore(), authUid, undefined, {
    requireKnownIdentity: true,
    repairLinks: false,
})) {
    return async (request) => {
        if (typeof request.auth?.uid !== "string" ||
            request.auth.uid.length < 1 ||
            request.auth.uid.length > 128)
            throw new https_1.HttpsError("unauthenticated", "authentication_required");
        const input = parseRequest(request.data);
        let stableAccountId;
        try {
            stableAccountId = await resolveStableAccountId(request.auth.uid);
        }
        catch (error) {
            if (error instanceof https_1.HttpsError)
                throw error;
            throw new https_1.HttpsError("failed-precondition", "stable_identity_unavailable");
        }
        if (!ID_RE.test(stableAccountId)) {
            throw new https_1.HttpsError("failed-precondition", "stable_identity_unavailable");
        }
        let resolved;
        try {
            resolved = await resolve(input, stableAccountId);
        }
        catch (error) {
            if (error instanceof https_1.HttpsError)
                throw error;
            throw new https_1.HttpsError("unavailable", "activity_session_unavailable");
        }
        const summary = exactResolved(input, resolved);
        return Object.freeze({
            schemaVersion: exports.V2_ACTIVITY_RELEASED_SESSION_RESPONSE_SCHEMA_V1,
            activeManifestHash: resolved.activeManifestHash,
            unifiedReleaseId: resolved.unifiedReleaseId,
            unifiedRootFingerprint: resolved.unifiedRootFingerprint,
            episodeId: summary.episodeId,
            sessionId: summary.sessionId,
            sessionOrdinal: summary.sessionOrdinal,
            activityPackageFingerprint: summary.activityPackageFingerprint,
            auxiliaryIndexFingerprint: resolved.auxiliaryIndexFingerprint,
            descriptorFingerprint: summary.auxiliaryDescriptorFingerprint,
            sourceFingerprint: summary.sourceFingerprint,
            renderFingerprint: summary.renderFingerprint,
            capsuleEnvelopeFingerprint: summary.capsuleEnvelopeFingerprint,
            packageFingerprint: summary.packageFingerprint,
            canonicalPackageRaw: resolved.canonicalPackageRaw,
            transportAuthority: "firebase_callable_auth_and_app_check_boundary",
            repositoryOriginProjection: "joined_unified_active_release_learner_evaluator_auxiliary",
            localFeedbackAuthority: "local_provisional_only",
            walletAuthority: "none",
            masteryAuthority: "none",
            evidenceAuthority: "none",
            completionAuthority: "none",
            releaseAuthority: false,
        });
    };
}
exports.learningV2ActivityReleasedSessionGetV1 = (0, https_1.onCall)(exports.V2_ACTIVITY_RELEASED_SESSION_CALLABLE_OPTIONS_V1, createV2ActivityReleasedSessionHandlerV1());
//# sourceMappingURL=v2_activity_released_session_callable_v1.js.map