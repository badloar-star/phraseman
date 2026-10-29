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
exports.learningV2CourseReleasedSessionGetV4 = exports.V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V4 = exports.V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V4 = void 0;
exports.createV2CourseReleasedSessionHandlerV4 = createV2CourseReleasedSessionHandlerV4;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const course_session_learner_transport_projection_v1_1 = require("../../../modules/learning-v2/runtime/course_session_learner_transport_projection_v1");
const auth_identity_1 = require("../auth_identity");
const v2_course_released_session_callable_v2_1 = require("./v2_course_released_session_callable_v2");
const v2_course_released_session_callable_v3_1 = require("./v2_course_released_session_callable_v3");
exports.V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V4 = "v2-course-released-session-response.v4";
exports.V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V4 = v2_course_released_session_callable_v3_1.V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V3;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
function createV2CourseReleasedSessionHandlerV4(resolve = v2_course_released_session_callable_v3_1.resolveV2CourseReleasedSessionFromAuthenticatedRepositoryV3, resolveStableAccountId = async (authUid) => (0, auth_identity_1.resolveStableUidForAuth)(admin.firestore(), authUid, undefined, {
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
            throw new https_1.HttpsError("unavailable", "course_session_unavailable");
        }
        const checked = (0, v2_course_released_session_callable_v3_1.exactV2CourseReleasedSessionResolvedV3)(input, resolved);
        let projection;
        try {
            projection = (0, course_session_learner_transport_projection_v1_1.projectLearningV2CourseSessionTransportV2)({
                canonicalIntroSourceRaw: resolved.canonicalIntroRaw,
                canonicalLearnerSourceRaw: resolved.canonicalLearnerRaw,
                canonicalEvaluatorCapsuleRaw: resolved.canonicalEvaluatorCapsuleRaw,
                canonicalAuxiliarySourceRaw: resolved.canonicalAuxiliaryRaw,
            });
        }
        catch {
            throw new https_1.HttpsError("data-loss", "learner_transport_projection_invalid");
        }
        if (projection.sourceLearnerFingerprint !== checked.learner.learnerFingerprint ||
            projection.sourceAuxiliaryFingerprint !== checked.auxiliary.auxiliaryFingerprint)
            throw new https_1.HttpsError("data-loss", "transport_projection_mismatch");
        return Object.freeze({
            schemaVersion: exports.V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V4,
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
            sourceLearnerFingerprint: projection.sourceLearnerFingerprint,
            learnerProjectionFingerprint: projection.learnerProjectionFingerprint,
            sourceAuxiliaryFingerprint: projection.sourceAuxiliaryFingerprint,
            auxiliaryProjectionFingerprint: projection.auxiliaryProjectionFingerprint,
            evaluatorCapsuleSetFingerprint: checked.evaluatorCapsule.capsuleSetFingerprint,
            audioExtensionFingerprint: checked.summary.audioExtensionFingerprint,
            audioFingerprint: checked.audio.audioFingerprint,
            canonicalIntroRaw: resolved.canonicalIntroRaw,
            canonicalLearnerProjectionRaw: projection.canonicalLearnerProjectionRaw,
            canonicalEvaluatorCapsuleRaw: resolved.canonicalEvaluatorCapsuleRaw,
            canonicalAuxiliaryProjectionRaw: projection.canonicalAuxiliaryProjectionRaw,
            canonicalAudioChildRaw: resolved.canonicalAudioChildRaw,
            transportAuthority: "authenticated_callable_only",
            repositoryOriginProjection: "active_v3_composite_text_audio_exact_session_join",
            learnerProjection: "canonical_learner_and_auxiliary_wire_projection_v2",
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
exports.learningV2CourseReleasedSessionGetV4 = (0, https_1.onCall)(exports.V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V4, createV2CourseReleasedSessionHandlerV4());
//# sourceMappingURL=v2_course_released_session_callable_v4.js.map