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
exports.learningV2CourseActiveCatalogGetV1 = exports.V2_COURSE_ACTIVE_CATALOG_CALLABLE_OPTIONS_V1 = exports.V2_COURSE_ACTIVE_CATALOG_RESPONSE_SCHEMA_V1 = void 0;
exports.resolveV2CourseActiveCatalogFromAuthenticatedRepositoryV1 = resolveV2CourseActiveCatalogFromAuthenticatedRepositoryV1;
exports.createV2CourseActiveCatalogHandlerV1 = createV2CourseActiveCatalogHandlerV1;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const release_rollout_v1_1 = require("../../../modules/learning-v2/content/release_rollout_v1");
const language_tag_v1_1 = require("../../../modules/learning-v2/contracts/language_tag_v1");
const generator_course_contract_1 = require("../../../modules/learning-v2/content/generator_course_contract");
const course_active_catalog_v1_1 = require("../../../modules/learning-v2/runtime/course_active_catalog_v1");
const auth_identity_1 = require("../auth_identity");
const v2_course_active_catalog_adapter_v1_1 = require("./v2_course_active_catalog_adapter_v1");
const v2_course_released_session_callable_v2_1 = require("./v2_course_released_session_callable_v2");
const v2_unified_course_release_repository_v2_1 = require("./v2_unified_course_release_repository_v2");
exports.V2_COURSE_ACTIVE_CATALOG_RESPONSE_SCHEMA_V1 = "v2-course-active-catalog-response.v1";
exports.V2_COURSE_ACTIVE_CATALOG_CALLABLE_OPTIONS_V1 = Object.freeze({
    region: "us-central1",
    // зачем: App Check отключён по прямому решению владельца (2026-08-16) — та же
    // причина, что и у чтения сессии: без отладочного токена дев-сборка получала
    // 401, и опубликованный курс был недоступен. Авторизация пользователя
    // сохраняется. Вернуть вместе с настройкой токена в сборке.
    enforceAppCheck: false,
    timeoutSeconds: 30,
    memory: "512MiB",
    maxInstances: 40,
});
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:\-]{0,159}$/u;
const REQUEST_KEYS = Object.freeze([
    "environment",
    "interfaceLocale",
    "learnerSourceLocale",
    "seasonId",
    "studyTarget",
    "targetLanguage",
]);
function plain(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function invalid() {
    throw new https_1.HttpsError("invalid-argument", "course_catalog_request_invalid");
}
function parseRequest(value) {
    if (!plain(value))
        invalid();
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
        !generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.includes(value.interfaceLocale) ||
        typeof value.seasonId !== "string" ||
        !ID_RE.test(value.seasonId))
        invalid();
    return Object.freeze({
        environment: value.environment,
        targetLanguage: value.targetLanguage,
        studyTarget: value.studyTarget,
        learnerSourceLocale: value.learnerSourceLocale,
        interfaceLocale: value.interfaceLocale,
        seasonId: value.seasonId,
    });
}
async function resolveV2CourseActiveCatalogFromAuthenticatedRepositoryV1(input, stableAccountId) {
    if (input.environment !== (0, v2_course_released_session_callable_v2_1.resolveV2CourseReleasedServerEnvironmentV2)())
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
    const adapter = (0, v2_course_active_catalog_adapter_v1_1.createFirebaseAdminV2CourseActiveCatalogAdapterV1)();
    const handle = await adapter.load({
        activeHandle: active.activeHandle,
        interfaceLocale: input.interfaceLocale,
    });
    return (0, v2_course_active_catalog_adapter_v1_1.resolveV2CourseActiveCatalogLearnerRawV1)(handle);
}
function createV2CourseActiveCatalogHandlerV1(resolve = resolveV2CourseActiveCatalogFromAuthenticatedRepositoryV1, resolveStableAccountId = async (authUid) => (0, auth_identity_1.resolveStableUidForAuth)(admin.firestore(), authUid, undefined, {
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
        if (!ID_RE.test(stableAccountId))
            throw new https_1.HttpsError("failed-precondition", "stable_identity_unavailable");
        let raw;
        try {
            raw = await resolve(input, stableAccountId);
        }
        catch (error) {
            if (error instanceof https_1.HttpsError)
                throw error;
            // зачем: глухое «course_catalog_unavailable» скрывало настоящую причину и
            // заставляло искать вслепую (владелец 2026-08-16: «может ты начнёшь логи
            // читать, чтобы точно знать, в чём дело»). Текст ошибки безопасен: он не
            // содержит ни данных ученика, ни правильных ответов — только имя сбоя и
            // место в коде.
            const message = error instanceof Error ? error.message : String(error);
            const where = error instanceof Error && error.stack
                ? error.stack.split("\n").slice(1, 3).join(" | ")
                : "";
            throw new https_1.HttpsError("unavailable", `course_catalog_unavailable: ${message}${where ? ` @ ${where}` : ""}`);
        }
        let catalog;
        try {
            catalog = (0, course_active_catalog_v1_1.parseLearningV2ActiveCourseCatalogV1)(raw);
        }
        catch (error) {
            // зачем: та же причина, что у course_catalog_unavailable выше — глухой код
            // ошибки заставлял искать вслепую. Текст безопасен: имя сбоя и место, без
            // данных ученика и без правильных ответов.
            const message = error instanceof Error ? error.message : String(error);
            throw new https_1.HttpsError("data-loss", `course_catalog_projection_invalid: ${message}`);
        }
        if (catalog.environment !== input.environment ||
            catalog.targetLanguage !== input.targetLanguage ||
            catalog.studyTarget !== input.studyTarget ||
            catalog.learnerSourceLocale !== input.learnerSourceLocale ||
            catalog.interfaceLocale !== input.interfaceLocale ||
            catalog.seasonId !== input.seasonId)
            throw new https_1.HttpsError("data-loss", "course_catalog_scope_mismatch");
        return Object.freeze({
            schemaVersion: exports.V2_COURSE_ACTIVE_CATALOG_RESPONSE_SCHEMA_V1,
            canonicalCatalogRaw: raw,
            catalogFingerprint: catalog.catalogFingerprint,
            activeRootFingerprint: catalog.activeRootFingerprint,
            activeHeadFingerprint: catalog.activeHeadFingerprint,
            transportAuthority: "firebase_callable_auth_and_app_check_boundary",
            learnerProjection: catalog.learnerProjection,
            correctnessAuthority: catalog.correctnessAuthority,
            serverAnswerAuthority: catalog.serverAnswerAuthority,
            progressWriteAuthority: catalog.progressWriteAuthority,
            releaseAuthority: false,
        });
    };
}
exports.learningV2CourseActiveCatalogGetV1 = (0, https_1.onCall)(exports.V2_COURSE_ACTIVE_CATALOG_CALLABLE_OPTIONS_V1, createV2CourseActiveCatalogHandlerV1());
//# sourceMappingURL=v2_course_active_catalog_callable_v1.js.map