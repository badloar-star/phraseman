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
exports.learningV2CourseReleasedSessionGetV3 = exports.V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V3 = exports.V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V3 = void 0;
exports.resolveV2CourseReleasedSessionFromAuthenticatedRepositoryV3 = resolveV2CourseReleasedSessionFromAuthenticatedRepositoryV3;
exports.createV2CourseReleasedSessionHandlerV3 = createV2CourseReleasedSessionHandlerV3;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const release_rollout_v1_1 = require("../../../modules/learning-v2/content/release_rollout_v1");
const course_session_client_children_v1_1 = require("../../../modules/learning-v2/runtime/course_session_client_children_v1");
const course_session_evaluator_capsule_child_v1_1 = require("../../../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1");
const course_session_audio_child_v1_1 = require("../../../modules/learning-v2/runtime/course_session_audio_child_v1");
const course_topology_v1_1 = require("../../../modules/learning-v2/content/course_topology_v1");
const auth_identity_1 = require("../auth_identity");
const v2_course_released_session_adapter_v3_1 = require("./v2_course_released_session_adapter_v3");
const v2_course_released_session_callable_v2_1 = require("./v2_course_released_session_callable_v2");
const v2_unified_course_release_repository_v3_1 = require("./v2_unified_course_release_repository_v3");
exports.V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V3 = "v2-course-released-session-response.v3";
exports.V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V3 = Object.freeze({
    region: "us-central1",
    // зачем: App Check отключён по прямому решению владельца (2026-08-16). В его
    // дев-сборке отладочный токен не настроен, приложение молча пропускало
    // инициализацию (.catch(() => false)) и получало 401, а экран переводил это
    // как «Сессия недоступна / NOT FOUND» — курс был опубликован и жив, но
    // прочитать его было нельзя.
    //
    // Что осталось: вызов по-прежнему требует авторизованного пользователя, а
    // ответы не содержат правильных ответов на задания. Ослабла проверка того,
    // что запрос пришёл именно из подлинного приложения. Вернуть, когда в сборке
    // появится отладочный токен или боевая аттестация.
    enforceAppCheck: false,
    timeoutSeconds: 30,
    memory: "512MiB",
    maxInstances: 40,
});
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
async function resolveV2CourseReleasedSessionFromAuthenticatedRepositoryV3(input, stableAccountId) {
    if (input.environment !== (0, v2_course_released_session_callable_v2_1.resolveV2CourseReleasedServerEnvironmentV2)())
        throw new https_1.HttpsError("failed-precondition", "release_environment_mismatch");
    const repository = (0, v2_unified_course_release_repository_v3_1.createFirebaseAdminV2UnifiedCourseReleaseRepositoryV3)();
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
    const adapter = (0, v2_course_released_session_adapter_v3_1.createFirebaseAdminV2CourseReleasedSessionAdapterV3)();
    const handle = await adapter.load({
        activeHandle: active.activeHandle,
        lessonOrdinal: input.lessonOrdinal,
        sessionOrdinal: input.sessionOrdinal,
    });
    const material = (0, v2_course_released_session_adapter_v3_1.resolveV2CourseReleasedSessionLearnerMaterialV3)(handle);
    return Object.freeze({
        summary: material.summary,
        canonicalIntroRaw: material.base.learner.introRaw,
        canonicalLearnerRaw: material.base.learner.learnerRaw,
        canonicalEvaluatorCapsuleRaw: material.base.learner.evaluatorCapsuleRaw,
        canonicalAuxiliaryRaw: material.base.learner.auxiliaryRaw,
        canonicalAudioChildRaw: material.canonicalAudioChildRaw,
    });
}
function exactResolved(input, resolved) {
    let intro;
    let learner;
    let evaluatorCapsule;
    let auxiliary;
    let audio;
    try {
        intro = (0, course_session_client_children_v1_1.parseLearningV2CourseSessionIntroChildV1)(resolved.canonicalIntroRaw);
        learner = (0, course_session_client_children_v1_1.parseLearningV2CourseSessionLearnerChildV1)(resolved.canonicalLearnerRaw);
        evaluatorCapsule = (0, course_session_evaluator_capsule_child_v1_1.parseLearningV2CourseSessionEvaluatorCapsuleChildV1)(resolved.canonicalEvaluatorCapsuleRaw);
        auxiliary = (0, course_session_client_children_v1_1.parseLearningV2CourseSessionAuxiliaryChildV1)(resolved.canonicalAuxiliaryRaw);
        audio = (0, course_session_audio_child_v1_1.parseLearningV2CourseSessionAudioChildV1)(resolved.canonicalAudioChildRaw, learner);
    }
    catch {
        throw new https_1.HttpsError("data-loss", "course_session_projection_invalid");
    }
    const summary = resolved.summary;
    const lessonId = (0, course_topology_v1_1.learningV2CourseLessonIdV1)(input.lessonOrdinal);
    const courseSessionId = (0, course_topology_v1_1.learningV2CourseSessionIdV1)(input.lessonOrdinal, input.sessionOrdinal);
    const hashes = [
        summary.activeRootFingerprint,
        summary.activeBaseRootFingerprint,
        summary.activeHeadFingerprint,
        summary.topologyFingerprint,
        summary.baseLessonIndexFingerprint,
        summary.audioLessonIndexFingerprint,
        summary.packageFingerprint,
        summary.childSetFingerprint,
        summary.audioExtensionFingerprint,
        summary.audioFingerprint,
    ];
    if (hashes.some((value) => !HASH_RE.test(value)) ||
        summary.lessonId !== lessonId ||
        summary.lessonOrdinal !== input.lessonOrdinal ||
        summary.courseSessionId !== courseSessionId ||
        summary.sessionOrdinal !== input.sessionOrdinal ||
        summary.learnerProjection !==
            "intro_learner_capsule_auxiliary_audio_child_only" ||
        summary.evaluatorIsolation !== "server_sidecar_not_exposed" ||
        summary.answerPayload !== "absent" ||
        summary.correctnessAuthority !== "local_device_only" ||
        summary.serverAnswerAuthority !==
            "none_answers_never_transported_or_rechecked" ||
        summary.serverRequestPerPlayback !== false ||
        (input.expectedActiveRootFingerprint !== null &&
            summary.activeRootFingerprint !== input.expectedActiveRootFingerprint) ||
        intro.courseSessionId !== courseSessionId ||
        learner.courseSessionId !== courseSessionId ||
        evaluatorCapsule.courseSessionId !== courseSessionId ||
        auxiliary.courseSessionId !== courseSessionId ||
        audio.courseSessionId !== courseSessionId ||
        audio.learnerFingerprint !== learner.learnerFingerprint ||
        audio.audioFingerprint !== summary.audioFingerprint)
        throw new https_1.HttpsError("data-loss", "course_session_projection_mismatch");
    return Object.freeze({
        summary,
        intro,
        learner,
        evaluatorCapsule,
        auxiliary,
        audio,
    });
}
function createV2CourseReleasedSessionHandlerV3(resolve = resolveV2CourseReleasedSessionFromAuthenticatedRepositoryV3, resolveStableAccountId = async (authUid) => (0, auth_identity_1.resolveStableUidForAuth)(admin.firestore(), authUid, undefined, {
    requireKnownIdentity: true,
    repairLinks: false,
})) {
    return async (request) => {
        if (typeof request.auth?.uid !== "string" ||
            request.auth.uid.length < 1 ||
            request.auth.uid.length > 128)
            throw new https_1.HttpsError("unauthenticated", "authentication_required");
        const input = (0, v2_course_released_session_callable_v2_1.parseV2CourseReleasedSessionRequestV2)(request.data);
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
            // зачем: та же причина, что у каталога — глухой код ошибки заставлял
            // искать вслепую. Текст безопасен: имя сбоя и место, без данных ученика
            // и без правильных ответов заданий.
            const message = error instanceof Error ? error.message : String(error);
            const where = error instanceof Error && error.stack
                ? error.stack.split("\n").slice(1, 3).join(" | ")
                : "";
            throw new https_1.HttpsError("unavailable", `course_session_unavailable: ${message}${where ? ` @ ${where}` : ""}`);
        }
        const checked = exactResolved(input, resolved);
        return Object.freeze({
            schemaVersion: exports.V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V3,
            releaseId: checked.summary.releaseId,
            activeRootFingerprint: checked.summary.activeRootFingerprint,
            activeBaseRootFingerprint: checked.summary.activeBaseRootFingerprint,
            activeHeadFingerprint: checked.summary.activeHeadFingerprint,
            topologyFingerprint: checked.summary.topologyFingerprint,
            lessonId: checked.summary.lessonId,
            lessonOrdinal: checked.summary.lessonOrdinal,
            baseLessonIndexFingerprint: checked.summary.baseLessonIndexFingerprint,
            audioLessonIndexFingerprint: checked.summary.audioLessonIndexFingerprint,
            courseSessionId: checked.summary.courseSessionId,
            sessionOrdinal: checked.summary.sessionOrdinal,
            packageFingerprint: checked.summary.packageFingerprint,
            childSetFingerprint: checked.summary.childSetFingerprint,
            introFingerprint: checked.intro.introFingerprint,
            learnerFingerprint: checked.learner.learnerFingerprint,
            auxiliaryFingerprint: checked.auxiliary.auxiliaryFingerprint,
            evaluatorCapsuleSetFingerprint: checked.evaluatorCapsule.capsuleSetFingerprint,
            audioExtensionFingerprint: checked.summary.audioExtensionFingerprint,
            audioFingerprint: checked.audio.audioFingerprint,
            canonicalIntroRaw: resolved.canonicalIntroRaw,
            canonicalLearnerRaw: resolved.canonicalLearnerRaw,
            canonicalEvaluatorCapsuleRaw: resolved.canonicalEvaluatorCapsuleRaw,
            canonicalAuxiliaryRaw: resolved.canonicalAuxiliaryRaw,
            canonicalAudioChildRaw: resolved.canonicalAudioChildRaw,
            transportAuthority: "firebase_callable_auth_and_app_check_boundary",
            repositoryOriginProjection: "active_v3_composite_text_audio_exact_session_join",
            learnerProjection: "intro_learner_capsule_auxiliary_audio_child_only",
            evaluatorIsolation: "server_sidecar_not_exposed",
            answerPayload: "absent",
            correctnessAuthority: "local_device_only",
            serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
            cacheAuthority: "none_client_lkg_is_availability_only",
            playbackPreparation: "client_generation_pinned_mp3_prefetch_required_before_session",
            serverRequestPerPlayback: false,
            walletAuthority: "none",
            masteryAuthority: "none",
            evidenceAuthority: "none",
            completionAuthority: "none",
            releaseAuthority: false,
        });
    };
}
exports.learningV2CourseReleasedSessionGetV3 = (0, https_1.onCall)(exports.V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V3, createV2CourseReleasedSessionHandlerV3());
//# sourceMappingURL=v2_course_released_session_callable_v3.js.map