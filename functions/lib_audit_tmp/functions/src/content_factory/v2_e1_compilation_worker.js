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
exports.adminRunV2E1Compilation = exports.adminSeedV2E1DemoSource = void 0;
exports.handleAdminSeedV2E1DemoSource = handleAdminSeedV2E1DemoSource;
exports.handleAdminRunV2E1Compilation = handleAdminRunV2E1Compilation;
// зачем: владелец: «воркер строим» — кнопка генерации в админке должна давать РЕЗУЛЬТАТ,
// а не вечное queued. Вертикальный срез E1: (1) сид демо-банка в ОДИН документ
// content_v2_sources/ep-01 (Firebase-экономия: весь банк одним чтением), (2) запуск
// компиляции по jobId — резолв профиля из источника с проверкой canonical hash,
// чистый компилятор + блокирующий QA (Task 7), артефакт в content_v2_compiled_units,
// стадии job'а -> succeeded, идемпотентный повтор. Никаких cron/onSnapshot — только
// явные вызовы из админки.
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("../callable_options");
const admin_content_studio_authoring_1 = require("../admin_content_studio_authoring");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const e1_demo_bank_1 = require("../../../modules/learning-v2/content/e1_demo_bank");
const content_item_1 = require("../../../modules/learning-v2/content/content_item");
const v2_content_compilation_1 = require("./v2_content_compilation");
const callableOptions = { region: "us-central1", enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK };
const JOBS = "content_v2_generation_jobs";
const STAGES = "content_v2_generation_stages";
const SOURCES = "content_v2_sources";
const COMPILED = "content_v2_compiled_units";
function safeError(error) {
    if (error instanceof https_1.HttpsError)
        return error;
    const message = error instanceof Error ? error.message : "";
    const known = /^(v2_worker_[a-z0-9_:.-]+|language_profile_[a-z_]+|session_[a-z_]+|compilation_[a-z_:.-]+|episode_content_qa_blocked)/.test(message);
    return new https_1.HttpsError("failed-precondition", known ? message : "V2 worker request rejected");
}
/** Кладёт демо-банк E1 в один источник-документ; hash профиля считается честно. */
async function handleAdminSeedV2E1DemoSource(request, dependencies) {
    const actor = (0, admin_content_studio_authoring_1.requireContentDraftWriter)(request.auth);
    const profile = (0, e1_demo_bank_1.buildE1DemoProfile)();
    const items = (0, e1_demo_bank_1.buildE1DemoItems)();
    const now = dependencies.now?.() ?? new Date().toISOString();
    const contentHash = (0, decision_registry_1.hashCanonicalBody)(profile);
    await dependencies.db.collection(SOURCES).doc(e1_demo_bank_1.E1_DEMO_EPISODE_ID).set({
        schemaVersion: "v2-content-source.v1",
        episodeId: e1_demo_bank_1.E1_DEMO_EPISODE_ID,
        canDoOutcomeId: e1_demo_bank_1.E1_DEMO_CAN_DO_OUTCOME_ID,
        languageProfile: profile,
        contentItems: items,
        updatedAt: now,
        updatedBy: actor.uid,
    });
    return {
        ok: true,
        episodeId: e1_demo_bank_1.E1_DEMO_EPISODE_ID,
        canDoOutcomeId: e1_demo_bank_1.E1_DEMO_CAN_DO_OUTCOME_ID,
        contentItemCount: items.length,
        languageProfileRef: { profileId: profile.profileId, version: profile.version, contentHash },
    };
}
function parseRunInput(data) {
    if (!data || typeof data !== "object" || Array.isArray(data))
        throw new Error("v2_worker_request_invalid");
    const record = data;
    if (record.direct === true)
        return { direct: true };
    const jobId = record.jobId;
    if (typeof jobId !== "string" || !jobId.trim())
        throw new Error("v2_worker_request_invalid");
    return { jobId: jobId.trim() };
}
const DIRECT_JOB_ID = "v2-e1-direct";
/** Выполняет компиляцию E1: exact-hash профиля, QA, артефакт.
 * Два пути: по jobId из очереди (полная дисциплина пинов) и прямой прогон
 * (direct: true) без очереди — для vertical slice, когда опубликованных шаблонов
 * режимов ещё нет; job-документ прямого прогона явно помечен mode:'direct_vertical_slice'. */
async function handleAdminRunV2E1Compilation(request, dependencies) {
    const actor = (0, admin_content_studio_authoring_1.requireContentDraftWriter)(request.auth);
    const input = parseRunInput(request.data);
    const db = dependencies.db;
    const now = dependencies.now?.() ?? new Date().toISOString();
    const directMode = "direct" in input;
    let jobId;
    let episodeId;
    let generationRequest;
    let stageIds = [];
    if (directMode) {
        jobId = DIRECT_JOB_ID;
        episodeId = e1_demo_bank_1.E1_DEMO_EPISODE_ID;
    }
    else {
        jobId = input.jobId;
        const jobSnapshot = await db.collection(JOBS).doc(jobId).get();
        if (!jobSnapshot.exists)
            throw new Error("v2_worker_job_not_found");
        const job = jobSnapshot.data();
        const storedRequest = job.request;
        if (!storedRequest || !Array.isArray(storedRequest.episodeIds) || storedRequest.episodeIds.length < 1) {
            throw new Error("v2_worker_job_invalid");
        }
        episodeId = storedRequest.episodeIds[0];
        if (job.state === "compiled") {
            return { ok: true, jobId, episodeId, replayed: true, qaOk: true, sessionCount: 12 };
        }
        generationRequest = storedRequest;
        stageIds = Array.isArray(job.plan?.stages)
            ? (job.plan.stages
                .map((stage) => (typeof stage.id === "string" ? stage.id : ""))
                .filter(Boolean))
            : [];
    }
    const sourceSnapshot = await db.collection(SOURCES).doc(episodeId).get();
    if (!sourceSnapshot.exists)
        throw new Error("v2_worker_source_missing");
    const source = sourceSnapshot.data();
    const canDoOutcomeId = typeof source.canDoOutcomeId === "string" ? source.canDoOutcomeId : "";
    if (!canDoOutcomeId)
        throw new Error("v2_worker_source_invalid");
    if (directMode) {
        // Прямой прогон компилирует ровно текущий источник: пин профиля выводится из его
        // же честного canonical hash (совпадение проверит compileV2EpisodeContent).
        const profile = source.languageProfile;
        if (!profile || typeof profile !== "object")
            throw new Error("v2_worker_source_invalid");
        generationRequest = {
            episodeIds: [episodeId],
            languageProfileRef: {
                profileId: profile.profileId,
                version: profile.version,
                contentHash: (0, decision_registry_1.hashCanonicalBody)(profile),
            },
        };
    }
    // Fail-closed: каждый айтем источника перепроверяется настоящим валидатором —
    // Firestore-документу не доверяем так же, как и клиенту.
    const rawItems = Array.isArray(source.contentItems) ? source.contentItems : [];
    const contentItems = rawItems.map((raw) => {
        const validated = (0, content_item_1.validateV2ContentItem)(raw);
        if (!validated.ok)
            throw new Error(`v2_worker_source_invalid:${validated.issues[0] ?? "item"}`);
        return validated.value;
    });
    if (!generationRequest)
        throw new Error("v2_worker_request_invalid");
    const pinnedRequest = generationRequest;
    // Профиль резолвится из источника; compileV2EpisodeContent сам сверит canonical
    // hash тела с закреплённым в запросе ref — подмена после утверждения невозможна.
    const compiled = await (0, v2_content_compilation_1.compileV2EpisodeContent)({
        request: pinnedRequest,
        episodeId,
        canDoOutcomeId,
        contentItems,
        resolveLanguageProfile: async () => ({
            ref: pinnedRequest.languageProfileRef,
            body: source.languageProfile,
        }),
    });
    await db.runTransaction(async (tx) => {
        const freshJob = await tx.get(db.collection(JOBS).doc(jobId));
        const freshState = freshJob.data()?.state;
        // Гонка двух кликов по job из очереди — второй становится no-op; прямой прогон
        // осознанно перекомпилирует текущий источник (результат детерминирован).
        if (!directMode && freshState === "compiled")
            return;
        tx.set(db.collection(COMPILED).doc(episodeId), {
            schemaVersion: "v2-compiled-unit-artifact.v1",
            episodeId,
            jobId,
            artifact: compiled,
            compiledAt: now,
            compiledBy: actor.uid,
        });
        if (directMode) {
            tx.set(db.collection(JOBS).doc(jobId), {
                schemaVersion: "v2-generation-job.v1",
                jobId,
                mode: "direct_vertical_slice",
                request: pinnedRequest,
                state: "compiled",
                compiledAt: now,
                compiledBy: actor.uid,
                artifactPath: `${COMPILED}/${episodeId}`,
            }, { merge: true });
        }
        else {
            tx.update(db.collection(JOBS).doc(jobId), {
                state: "compiled",
                compiledAt: now,
                compiledBy: actor.uid,
                artifactPath: `${COMPILED}/${episodeId}`,
            });
        }
        // Вертикальный срез: артефакт закрывает контентный путь эпизода — стадии job'а
        // помечаются succeeded одним махом; будущие пакеты разнесут это по видам стадий.
        for (const stageId of stageIds) {
            tx.set(db.collection(STAGES).doc(stageId), {
                state: "succeeded",
                finishedAt: now,
                resultKind: "e1_vertical_slice_compilation",
            }, { merge: true });
        }
        // Аудит: set (не create) — повторный прямой прогон обновляет запись, а не падает.
        tx.set(db.collection("admin_log").doc(`${jobId}:compiled:${now}`), {
            schemaVersion: "admin-audit.v1",
            action: "content_v2.generation.compile",
            actorUid: actor.uid,
            role: actor.role,
            entity: { collection: COMPILED, id: episodeId },
            operationId: jobId,
            directMode,
            timestamp: now,
        });
    });
    return {
        ok: true,
        jobId,
        episodeId,
        replayed: false,
        qaOk: compiled.qualityReport.ok,
        sessionCount: compiled.sessions.length,
    };
}
exports.adminSeedV2E1DemoSource = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        return await handleAdminSeedV2E1DemoSource(request, { db: admin.firestore() });
    }
    catch (error) {
        throw safeError(error);
    }
});
exports.adminRunV2E1Compilation = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        return await handleAdminRunV2E1Compilation(request, { db: admin.firestore() });
    }
    catch (error) {
        throw safeError(error);
    }
});
//# sourceMappingURL=v2_e1_compilation_worker.js.map