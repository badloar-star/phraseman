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
exports.learningV2ActivityAuxiliarySessionGetV1 = exports.V2_ACTIVITY_AUXILIARY_SESSION_CALLABLE_OPTIONS_V1 = exports.V2_ACTIVITY_AUXILIARY_SESSION_RESPONSE_SCHEMA_V1 = void 0;
exports.createV2ActivityAuxiliarySessionHandlerV1 = createV2ActivityAuxiliarySessionHandlerV1;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const release_rollout_v1_1 = require("../../../modules/learning-v2/content/release_rollout_v1");
const auth_identity_1 = require("../auth_identity");
const activity_auxiliary_client_descriptor_v1_1 = require("../../../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1");
const v2_firebase_activity_auxiliary_release_adapter_v1_1 = require("./v2_firebase_activity_auxiliary_release_adapter_v1");
exports.V2_ACTIVITY_AUXILIARY_SESSION_RESPONSE_SCHEMA_V1 = "v2-activity-auxiliary-session-response.v1";
exports.V2_ACTIVITY_AUXILIARY_SESSION_CALLABLE_OPTIONS_V1 = Object.freeze({
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
async function resolveFromAuthenticatedRepository(input, stableAccountId) {
    const projectId = String(process.env.GCLOUD_PROJECT ?? "");
    const serverEnvironment = process.env.FUNCTIONS_EMULATOR === "true" && projectId.startsWith("demo-")
        ? "lab"
        : projectId === "phraseman-ea0b3"
            ? "production"
            : (() => {
                throw new https_1.HttpsError("failed-precondition", "release_environment_unavailable");
            })();
    if (input.environment !== serverEnvironment) {
        throw new https_1.HttpsError("failed-precondition", "release_environment_mismatch");
    }
    const adapter = (0, v2_firebase_activity_auxiliary_release_adapter_v1_1.createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1)();
    const handle = await adapter.load({
        environment: input.environment,
        studyTarget: input.studyTarget,
        learnerSourceLocale: input.learnerSourceLocale,
        seasonId: input.seasonId,
        episodeId: input.episodeId,
    });
    const summary = (0, v2_firebase_activity_auxiliary_release_adapter_v1_1.getV2FirebaseActivityAuxiliaryReleaseSummaryV1)(handle);
    const rollout = (0, release_rollout_v1_1.resolveLearningV2ReleaseRolloutV1)({
        pointer: (0, v2_firebase_activity_auxiliary_release_adapter_v1_1.resolveV2FirebaseActivityAuxiliaryReleaseMaterialV1)(handle).seasonPointer,
        stableAccountId,
    });
    if (!rollout.eligible) {
        throw new https_1.HttpsError("permission-denied", "release_cohort_ineligible");
    }
    if (input.expectedActiveManifestHash !== null &&
        summary.activeManifestHash !== input.expectedActiveManifestHash) {
        throw new https_1.HttpsError("failed-precondition", "active_release_changed");
    }
    return Object.freeze({
        activeManifestHash: summary.activeManifestHash,
        activityPackageFingerprint: summary.activityPackageFingerprint,
        auxiliaryIndexFingerprint: summary.indexFingerprint,
        canonicalDescriptorRaw: await adapter.projectSessionDescriptor(handle, input.sessionOrdinal),
    });
}
function exactDescriptor(raw, request, resolved) {
    let descriptor;
    try {
        descriptor = (0, activity_auxiliary_client_descriptor_v1_1.parseLearningV2ActivityAuxiliaryClientDescriptorV1)(raw);
    }
    catch {
        throw new https_1.HttpsError("data-loss", "activity_session_descriptor_invalid");
    }
    if (descriptor.environment !== request.environment ||
        descriptor.studyTarget !== request.studyTarget ||
        descriptor.learnerSourceLocale !== request.learnerSourceLocale ||
        descriptor.seasonId !== request.seasonId ||
        (request.expectedActiveManifestHash !== null &&
            descriptor.activeManifestHash !== request.expectedActiveManifestHash) ||
        descriptor.activeManifestHash !== resolved.activeManifestHash ||
        descriptor.episodeId !== request.episodeId ||
        descriptor.sessionOrdinal !== request.sessionOrdinal ||
        descriptor.activityPackageFingerprint !==
            resolved.activityPackageFingerprint ||
        descriptor.auxiliaryIndexFingerprint !== resolved.auxiliaryIndexFingerprint)
        throw new https_1.HttpsError("data-loss", "activity_session_descriptor_mismatch");
    return descriptor;
}
function createV2ActivityAuxiliarySessionHandlerV1(resolve = resolveFromAuthenticatedRepository, resolveStableAccountId = async (authUid) => (0, auth_identity_1.resolveStableUidForAuth)(admin.firestore(), authUid, undefined, {
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
        if (input.expectedActiveManifestHash !== null &&
            resolved.activeManifestHash !== input.expectedActiveManifestHash) {
            throw new https_1.HttpsError("failed-precondition", "active_release_changed");
        }
        const descriptor = exactDescriptor(resolved.canonicalDescriptorRaw, input, resolved);
        return Object.freeze({
            schemaVersion: exports.V2_ACTIVITY_AUXILIARY_SESSION_RESPONSE_SCHEMA_V1,
            activeManifestHash: descriptor.activeManifestHash,
            episodeId: descriptor.episodeId,
            sessionId: descriptor.sessionId,
            sessionOrdinal: descriptor.sessionOrdinal,
            activityPackageFingerprint: descriptor.activityPackageFingerprint,
            auxiliaryIndexFingerprint: descriptor.auxiliaryIndexFingerprint,
            descriptorFingerprint: descriptor.descriptorFingerprint,
            canonicalDescriptorRaw: resolved.canonicalDescriptorRaw,
            transportAuthority: "firebase_callable_auth_and_app_check_boundary",
            repositoryOriginProjection: "server_private_release_handle_projection",
            walletAuthority: "none",
            masteryAuthority: "none",
            evidenceAuthority: "none",
            releaseAuthority: false,
        });
    };
}
exports.learningV2ActivityAuxiliarySessionGetV1 = (0, https_1.onCall)(exports.V2_ACTIVITY_AUXILIARY_SESSION_CALLABLE_OPTIONS_V1, createV2ActivityAuxiliarySessionHandlerV1());
//# sourceMappingURL=v2_activity_auxiliary_session_callable_v1.js.map