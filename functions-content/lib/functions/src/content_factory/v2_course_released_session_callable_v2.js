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
exports.learningV2CourseReleasedSessionGetV2 = exports.V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V2 = exports.V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V2 = void 0;
exports.parseV2CourseReleasedSessionRequestV2 = parseV2CourseReleasedSessionRequestV2;
exports.resolveV2CourseReleasedServerEnvironmentV2 = resolveV2CourseReleasedServerEnvironmentV2;
exports.resolveV2CourseReleasedSessionFromAuthenticatedRepositoryV2 = resolveV2CourseReleasedSessionFromAuthenticatedRepositoryV2;
exports.createV2CourseReleasedSessionHandlerV2 = createV2CourseReleasedSessionHandlerV2;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const release_rollout_v1_1 = require("../../../modules/learning-v2/content/release_rollout_v1");
const language_tag_v1_1 = require("../../../modules/learning-v2/contracts/language_tag_v1");
const course_session_client_children_v1_1 = require("../../../modules/learning-v2/runtime/course_session_client_children_v1");
const course_session_evaluator_capsule_child_v1_1 = require("../../../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1");
const course_topology_v1_1 = require("../../../modules/learning-v2/content/course_topology_v1");
const auth_identity_1 = require("../auth_identity");
const v2_course_released_session_adapter_v2_1 = require("./v2_course_released_session_adapter_v2");
const v2_unified_course_release_repository_v2_1 = require("./v2_unified_course_release_repository_v2");
exports.V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V2 = "v2-course-released-session-response.v2";
exports.V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V2 = Object.freeze({
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
const REQUEST_KEYS = Object.freeze([
    "environment",
    "expectedActiveRootFingerprint",
    "learnerSourceLocale",
    "lessonOrdinal",
    "seasonId",
    "sessionOrdinal",
    "studyTarget",
    "targetLanguage",
]);
function exactPlainRecord(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function invalidArgument() {
    throw new https_1.HttpsError("invalid-argument", "course_session_request_invalid");
}
function parseV2CourseReleasedSessionRequestV2(value) {
    if (!exactPlainRecord(value))
        invalidArgument();
    const keys = Object.keys(value).sort();
    const expected = [...REQUEST_KEYS].sort();
    if (keys.length !== expected.length ||
        keys.some((key, index) => key !== expected[index]) ||
        !["lab", "staging", "production"].includes(String(value.environment)) ||
        typeof value.targetLanguage !== "string" ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(value.targetLanguage) === null ||
        typeof value.studyTarget !== "string" ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(value.studyTarget) === null ||
        typeof value.learnerSourceLocale !== "string" ||
        (0, language_tag_v1_1.parseV2ExactLanguageTagV1)(value.learnerSourceLocale) === null ||
        typeof value.seasonId !== "string" ||
        !ID_RE.test(value.seasonId) ||
        !(value.expectedActiveRootFingerprint === null ||
            (typeof value.expectedActiveRootFingerprint === "string" &&
                HASH_RE.test(value.expectedActiveRootFingerprint))) ||
        !Number.isSafeInteger(value.lessonOrdinal) ||
        Number(value.lessonOrdinal) < 1 ||
        Number(value.lessonOrdinal) > course_topology_v1_1.LEARNING_V2_COURSE_LESSON_COUNT_V1 ||
        !Number.isSafeInteger(value.sessionOrdinal) ||
        Number(value.sessionOrdinal) < 1 ||
        Number(value.sessionOrdinal) > course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1)
        invalidArgument();
    return Object.freeze({
        environment: value.environment,
        targetLanguage: value.targetLanguage,
        studyTarget: value.studyTarget,
        learnerSourceLocale: value.learnerSourceLocale,
        seasonId: value.seasonId,
        expectedActiveRootFingerprint: value.expectedActiveRootFingerprint,
        lessonOrdinal: Number(value.lessonOrdinal),
        sessionOrdinal: Number(value.sessionOrdinal),
    });
}
function resolveV2CourseReleasedServerEnvironmentV2() {
    const projectId = String(process.env.GCLOUD_PROJECT ?? "");
    if (process.env.FUNCTIONS_EMULATOR === "true" &&
        projectId.startsWith("demo-"))
        return "lab";
    if (projectId === "phraseman-ea0b3")
        return "production";
    throw new https_1.HttpsError("failed-precondition", "release_environment_unavailable");
}
async function resolveV2CourseReleasedSessionFromAuthenticatedRepositoryV2(input, stableAccountId) {
    if (input.environment !== resolveV2CourseReleasedServerEnvironmentV2())
        throw new https_1.HttpsError("failed-precondition", "release_environment_mismatch");
    const repository = (0, v2_unified_course_release_repository_v2_1.createFirebaseAdminV2UnifiedCourseReleaseRepositoryV2)();
    const active = await repository.readActive({
        environment: input.environment,
        seasonId: input.seasonId,
        targetLanguage: input.targetLanguage,
        studyTarget: input.studyTarget,
        learnerSourceLocale: input.learnerSourceLocale,
    });
    const rollout = (0, release_rollout_v1_1.resolveLearningV2ReleaseRolloutV1)({
        pointer: { rollout: active.root.rollout },
        stableAccountId,
    });
    if (!rollout.eligible)
        throw new https_1.HttpsError("permission-denied", "release_cohort_ineligible");
    if (input.expectedActiveRootFingerprint !== null &&
        input.expectedActiveRootFingerprint !== active.root.rootFingerprint)
        throw new https_1.HttpsError("failed-precondition", "active_release_changed");
    const adapter = (0, v2_course_released_session_adapter_v2_1.createFirebaseAdminV2CourseReleasedSessionAdapterV2)();
    const handle = await adapter.load({
        activeHandle: active.activeHandle,
        lessonOrdinal: input.lessonOrdinal,
        sessionOrdinal: input.sessionOrdinal,
    });
    const material = (0, v2_course_released_session_adapter_v2_1.resolveV2CourseReleasedSessionLearnerMaterialV2)(handle);
    return Object.freeze({
        summary: material.summary,
        canonicalIntroRaw: material.learner.introRaw,
        canonicalLearnerRaw: material.learner.learnerRaw,
        canonicalEvaluatorCapsuleRaw: material.learner.evaluatorCapsuleRaw,
        canonicalAuxiliaryRaw: material.learner.auxiliaryRaw,
    });
}
function exactResolved(input, resolved) {
    let intro;
    let learner;
    let evaluatorCapsule;
    let auxiliary;
    try {
        intro = (0, course_session_client_children_v1_1.parseLearningV2CourseSessionIntroChildV1)(resolved.canonicalIntroRaw);
        learner = (0, course_session_client_children_v1_1.parseLearningV2CourseSessionLearnerChildV1)(resolved.canonicalLearnerRaw);
        evaluatorCapsule = (0, course_session_evaluator_capsule_child_v1_1.parseLearningV2CourseSessionEvaluatorCapsuleChildV1)(resolved.canonicalEvaluatorCapsuleRaw);
        auxiliary = (0, course_session_client_children_v1_1.parseLearningV2CourseSessionAuxiliaryChildV1)(resolved.canonicalAuxiliaryRaw);
    }
    catch {
        throw new https_1.HttpsError("data-loss", "course_session_projection_invalid");
    }
    const summary = resolved.summary;
    const lessonId = (0, course_topology_v1_1.learningV2CourseLessonIdV1)(input.lessonOrdinal);
    const courseSessionId = (0, course_topology_v1_1.learningV2CourseSessionIdV1)(input.lessonOrdinal, input.sessionOrdinal);
    if (!HASH_RE.test(summary.activeRootFingerprint) ||
        !HASH_RE.test(summary.activeHeadFingerprint) ||
        !HASH_RE.test(summary.topologyFingerprint) ||
        !HASH_RE.test(summary.lessonIndexFingerprint) ||
        !HASH_RE.test(summary.packageFingerprint) ||
        !HASH_RE.test(summary.childSetFingerprint) ||
        summary.lessonId !== lessonId ||
        summary.lessonOrdinal !== input.lessonOrdinal ||
        summary.courseSessionId !== courseSessionId ||
        summary.sessionOrdinal !== input.sessionOrdinal ||
        summary.learnerProjection !== "intro_learner_capsule_auxiliary_only" ||
        summary.evaluatorIsolation !== "server_sidecar_not_exposed" ||
        (input.expectedActiveRootFingerprint !== null &&
            summary.activeRootFingerprint !== input.expectedActiveRootFingerprint) ||
        intro.courseSessionId !== courseSessionId ||
        learner.courseSessionId !== courseSessionId ||
        evaluatorCapsule.courseSessionId !== courseSessionId ||
        auxiliary.courseSessionId !== courseSessionId)
        throw new https_1.HttpsError("data-loss", "course_session_projection_mismatch");
    return Object.freeze({
        summary,
        intro,
        learner,
        evaluatorCapsule,
        auxiliary,
    });
}
function createV2CourseReleasedSessionHandlerV2(resolve = resolveV2CourseReleasedSessionFromAuthenticatedRepositoryV2, resolveStableAccountId = async (authUid) => (0, auth_identity_1.resolveStableUidForAuth)(admin.firestore(), authUid, undefined, {
    requireKnownIdentity: true,
    repairLinks: false,
})) {
    return async (request) => {
        if (typeof request.auth?.uid !== "string" ||
            request.auth.uid.length < 1 ||
            request.auth.uid.length > 128)
            throw new https_1.HttpsError("unauthenticated", "authentication_required");
        const input = parseV2CourseReleasedSessionRequestV2(request.data);
        let stableAccountId;
        try {
            stableAccountId = await resolveStableAccountId(request.auth.uid);
        }
        catch (error) {
            if (error instanceof https_1.HttpsError)
                throw error;
            throw new https_1.HttpsError("failed-precondition", "stable_identity_unavailable");
        }
        if (!ID_RE.test(stableAccountId))
            throw new https_1.HttpsError("failed-precondition", "stable_identity_unavailable");
        let resolved;
        try {
            resolved = await resolve(input, stableAccountId);
        }
        catch (error) {
            if (error instanceof https_1.HttpsError)
                throw error;
            // зачем: глухой код ошибки заставлял искать причину вслепую (владелец
            // 2026-08-16: «может ты начнёшь логи читать»). Текст безопасен: имя сбоя
            // и место, без данных ученика и без правильных ответов заданий.
            const message = error instanceof Error ? error.message : String(error);
            const where = error instanceof Error && error.stack
                ? error.stack.split("\n").slice(1, 3).join(" | ")
                : "";
            throw new https_1.HttpsError("unavailable", `course_session_unavailable: ${message}${where ? ` @ ${where}` : ""}`);
        }
        const checked = exactResolved(input, resolved);
        return Object.freeze({
            schemaVersion: exports.V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V2,
            releaseId: checked.summary.releaseId,
            activeRootFingerprint: checked.summary.activeRootFingerprint,
            activeHeadFingerprint: checked.summary.activeHeadFingerprint,
            topologyFingerprint: checked.summary.topologyFingerprint,
            lessonId: checked.summary.lessonId,
            lessonOrdinal: checked.summary.lessonOrdinal,
            lessonIndexFingerprint: checked.summary.lessonIndexFingerprint,
            courseSessionId: checked.summary.courseSessionId,
            sessionOrdinal: checked.summary.sessionOrdinal,
            packageFingerprint: checked.summary.packageFingerprint,
            childSetFingerprint: checked.summary.childSetFingerprint,
            introFingerprint: checked.intro.introFingerprint,
            learnerFingerprint: checked.learner.learnerFingerprint,
            auxiliaryFingerprint: checked.auxiliary.auxiliaryFingerprint,
            evaluatorCapsuleSetFingerprint: checked.evaluatorCapsule.capsuleSetFingerprint,
            canonicalIntroRaw: resolved.canonicalIntroRaw,
            canonicalLearnerRaw: resolved.canonicalLearnerRaw,
            canonicalEvaluatorCapsuleRaw: resolved.canonicalEvaluatorCapsuleRaw,
            canonicalAuxiliaryRaw: resolved.canonicalAuxiliaryRaw,
            transportAuthority: "firebase_callable_auth_and_app_check_boundary",
            repositoryOriginProjection: "active_v2_32x56_release_exact_session_join",
            learnerProjection: "intro_learner_capsule_auxiliary_only",
            evaluatorIsolation: "server_sidecar_not_exposed",
            cacheAuthority: "none_client_lkg_is_availability_only",
            walletAuthority: "none",
            masteryAuthority: "none",
            evidenceAuthority: "none",
            completionAuthority: "none",
            releaseAuthority: false,
        });
    };
}
exports.learningV2CourseReleasedSessionGetV2 = (0, https_1.onCall)(exports.V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V2, createV2CourseReleasedSessionHandlerV2());
//# sourceMappingURL=v2_course_released_session_callable_v2.js.map