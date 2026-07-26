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
exports.adminQueueV2GenerationPlan = exports.adminCreateV2GenerationPlan = void 0;
exports.assertV2TemplatePins = assertV2TemplatePins;
exports.handleAdminCreateV2GenerationPlan = handleAdminCreateV2GenerationPlan;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const admin_content_studio_authoring_1 = require("./admin_content_studio_authoring");
const v2_admin_generation_contract_1 = require("./content_factory/v2_admin_generation_contract");
const firestore_authoring_store_1 = require("./content_studio/firestore_authoring_store");
const callableOptions = { region: "us-central1", enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK };
const JOBS = "content_v2_generation_jobs";
const STAGES = "content_v2_generation_stages";
const LOCALIZATIONS = "content_v2_generation_localizations";
const OPERATIONS = "content_v2_generation_operations";
function exactRef(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    const item = value;
    return typeof item.templateId === "string"
        && Number.isSafeInteger(item.version)
        && typeof item.contentHash === "string"
        && /^[a-f0-9]{64}$/.test(item.contentHash);
}
/** Resolve every pinned template from the immutable published catalog.
 * A request must never silently follow "latest" or a deprecated replacement.
 */
async function assertV2TemplatePins(request, resolveTemplate) {
    for (const binding of request.templateBindings) {
        for (const ref of binding.templateRefs) {
            const resolved = await resolveTemplate(ref);
            const resolvedRecord = resolved && typeof resolved === "object" && !Array.isArray(resolved)
                ? resolved
                : undefined;
            const resolvedRef = exactRef(resolved) ? resolved
                : (resolvedRecord && exactRef(resolvedRecord.templateRef) ? resolvedRecord.templateRef : undefined);
            if (!resolvedRef
                || resolvedRef.templateId !== ref.templateId
                || resolvedRef.version !== ref.version
                || resolvedRef.contentHash !== ref.contentHash) {
                throw new Error("v2_generation_template_pin_stale");
            }
        }
    }
}
function planStageBody(plan, request, actor, now) {
    return plan.stages.map((stage) => ({
        schemaVersion: "v2-generation-stage.v1",
        stageId: stage.id,
        jobId: request.idempotencyKey,
        kind: stage.kind,
        ...(stage.episodeId ? { episodeId: stage.episodeId } : {}),
        dependsOn: [...stage.dependsOn],
        state: "queued",
        attempts: 0,
        maxAttempts: 3,
        requestedBy: actor.uid,
        createdAt: now,
    }));
}
function safeError(error) {
    if (error instanceof https_1.HttpsError)
        return error;
    const message = error instanceof Error ? error.message : "";
    const known = /^(v2_generation_[a-z0-9_]+|generation_[a-z0-9_]+)$/.test(message);
    return new https_1.HttpsError("failed-precondition", known ? message : "V2 generation request rejected");
}
async function handleAdminCreateV2GenerationPlan(request, dependencies) {
    const actor = (0, admin_content_studio_authoring_1.requireContentDraftWriter)(request.auth);
    const input = (0, v2_admin_generation_contract_1.parseV2AdminGenerationRequest)(request.data);
    await assertV2TemplatePins(input, dependencies.resolveTemplate);
    const plan = (0, v2_admin_generation_contract_1.buildV2AdminGenerationPlan)(input);
    const now = dependencies.now?.() ?? new Date().toISOString();
    const db = dependencies.db;
    const jobRef = db.collection(JOBS).doc(input.idempotencyKey);
    const operationRef = db.collection(OPERATIONS).doc(input.idempotencyKey);
    const stageBodies = planStageBody(plan, input, actor, now);
    const localizationBodies = plan.localizationTasks.map((task) => ({
        schemaVersion: "v2-generation-localization.v1",
        id: task.id,
        jobId: input.idempotencyKey,
        episodeId: task.episodeId,
        sourceLocale: task.sourceLocale,
        targetLocale: task.targetLocale,
        dependsOn: [...task.dependsOn],
        state: "queued",
        requestedBy: actor.uid,
        createdAt: now,
    }));
    return db.runTransaction(async (tx) => {
        const operation = await tx.get(operationRef);
        if (operation.exists) {
            const previous = operation.data();
            if (previous.requestFingerprint !== plan.requestFingerprint || previous.jobId !== input.idempotencyKey) {
                throw new https_1.HttpsError("already-exists", "idempotencyKey belongs to another V2 generation plan");
            }
            return { ok: true, jobId: input.idempotencyKey, state: "queued", requestFingerprint: plan.requestFingerprint, replayed: true };
        }
        tx.create(jobRef, {
            schemaVersion: "v2-generation-job.v1",
            jobId: input.idempotencyKey,
            requestFingerprint: plan.requestFingerprint,
            request: input,
            plan,
            state: "queued",
            requestedBy: actor.uid,
            role: actor.role,
            createdAt: now,
        });
        for (const stage of stageBodies)
            tx.create(db.collection(STAGES).doc(stage.stageId), stage);
        for (const localization of localizationBodies)
            tx.create(db.collection(LOCALIZATIONS).doc(localization.id), localization);
        tx.create(operationRef, {
            schemaVersion: "v2-generation-operation.v1",
            operationId: input.idempotencyKey,
            jobId: input.idempotencyKey,
            requestFingerprint: plan.requestFingerprint,
            createdBy: actor.uid,
            createdAt: now,
            result: { state: "queued" },
        });
        tx.create(db.collection("admin_log").doc(), {
            schemaVersion: "admin-audit.v1",
            action: "content_v2.generation.queue",
            actorUid: actor.uid,
            role: actor.role,
            entity: { collection: JOBS, id: input.idempotencyKey },
            operationId: input.idempotencyKey,
            requestFingerprint: plan.requestFingerprint,
            timestamp: now,
        });
        return { ok: true, jobId: input.idempotencyKey, state: "queued", requestFingerprint: plan.requestFingerprint, replayed: false };
    });
}
exports.adminCreateV2GenerationPlan = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const db = admin.firestore();
        const resolver = (0, firestore_authoring_store_1.createFirestoreModeTemplateResolver)(db);
        return await handleAdminCreateV2GenerationPlan(request, { db, resolveTemplate: (ref) => resolver(ref) });
    }
    catch (error) {
        throw safeError(error);
    }
});
// Explicit queue alias for Admin clients; both names share one server-owned implementation.
exports.adminQueueV2GenerationPlan = exports.adminCreateV2GenerationPlan;
//# sourceMappingURL=admin_v2_generation.js.map