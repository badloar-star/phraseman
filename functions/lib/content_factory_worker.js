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
exports.adminRunContentGenerationUnit = exports.CONTENT_FACTORY_OPENAI_API_KEY = void 0;
exports.parseGenerationUnitRequest = parseGenerationUnitRequest;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const callable_options_1 = require("./callable_options");
const roles_1 = require("./admin/roles");
const permissions_1 = require("./admin/permissions");
const openai_jobs_config_1 = require("./openai_jobs_config");
const generation_provider_1 = require("./content_factory/generation_provider");
const source_registry_1 = require("./content_factory/source_registry");
const artifact_storage_1 = require("./content_factory/artifact_storage");
const generation_checkpoint_1 = require("./content_factory/generation_checkpoint");
const content_factory_budget_1 = require("./content_factory/content_factory_budget");
const job_progress_1 = require("./content_factory/job_progress");
const generation_errors_1 = require("./content_factory/generation_errors");
const REGION = 'us-central1';
exports.CONTENT_FACTORY_OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
const SURFACES = ['lesson', 'quiz', 'flashcard', 'arena'];
const GENERATION_LEASE_MS = 10 * 60 * 1000;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parseGenerationUnitRequest(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'generation unit required');
    const jobId = String(data.jobId ?? '').trim();
    const surface = String(data.surface ?? '');
    const lessonId = Number(data.lessonId);
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(jobId) || !SURFACES.includes(surface) || !Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100) {
        throw new https_1.HttpsError('invalid-argument', 'invalid generation unit');
    }
    return Object.freeze({ jobId, surface, lessonId });
}
function roleFromToken(token) {
    return (0, roles_1.hasAdminRole)(token.adminRole) ? token.adminRole : null;
}
function releaseIdForJob(jobId, studyTarget, learnerSourceLocale) {
    const result = `draft-${studyTarget}-${learnerSourceLocale}-${jobId}`;
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(result))
        throw new https_1.HttpsError('failed-precondition', 'release_identity_invalid');
    return result;
}
function readBlueprintLesson(registry, lessonId) {
    const lesson = registry.lessons[String(lessonId)];
    if (!lesson)
        throw new https_1.HttpsError('not-found', 'blueprint_lesson_not_found');
    return lesson;
}
function readJobProgress(data) {
    const value = isRecord(data.progress) ? data.progress : {};
    return { total: Number(value.total), completed: Number(value.completed), failed: Number(value.failed) };
}
exports.adminRunContentGenerationUnit = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, secrets: [exports.CONTENT_FACTORY_OPENAI_API_KEY], timeoutSeconds: 300, memory: '1GiB' }, async (request) => {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'content.draft.write'))
        throw new https_1.HttpsError('permission-denied', 'Role cannot generate content');
    const input = parseGenerationUnitRequest(request.data);
    const db = admin.firestore();
    const jobRef = db.collection('content_factory_jobs').doc(input.jobId);
    const unitId = `${input.jobId}:${input.surface}:${input.lessonId}`;
    const unitRef = db.collection('content_factory_job_units').doc(unitId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists)
        throw new https_1.HttpsError('not-found', 'generation_job_not_found');
    const job = jobSnap.data() ?? {};
    const studyTarget = String(job.studyTarget ?? '').trim();
    const learnerSourceLocale = String(job.learnerSourceLocale ?? job.sourceLocale ?? '').trim();
    const blueprintVersion = String(job.blueprintVersion ?? '').trim();
    if (!studyTarget || !learnerSourceLocale || !blueprintVersion)
        throw new https_1.HttpsError('failed-precondition', 'generation_job_identity_missing');
    const nowMs = Date.now();
    const checkpoint = await db.runTransaction(async (tx) => {
        const current = await tx.get(unitRef);
        const currentData = current.data() ?? {};
        if (current.exists) {
            try {
                (0, generation_checkpoint_1.assertGenerationCheckpointIdentity)(currentData, { unitId, jobId: input.jobId, studyTarget, learnerSourceLocale, surface: input.surface, lessonId: input.lessonId });
            }
            catch {
                throw new https_1.HttpsError('failed-precondition', 'generation_checkpoint_identity_mismatch');
            }
        }
        const action = (0, generation_checkpoint_1.chooseGenerationCheckpointAction)(currentData, nowMs);
        if (action.action === 'replay' || action.action === 'resume')
            return { ...action, attempt: Number(currentData.attempts ?? 0) };
        if (action.action === 'busy')
            throw new https_1.HttpsError('aborted', 'generation_unit_already_running');
        const attempt = Number(currentData.attempts ?? 0) + 1;
        tx.set(unitRef, { unitId, jobId: input.jobId, studyTarget, learnerSourceLocale, surface: input.surface, lessonId: input.lessonId, state: 'running', attempts: attempt, startedAt: admin.firestore.FieldValue.serverTimestamp(), startedAtMs: nowMs, leaseExpiresAtMs: nowMs + GENERATION_LEASE_MS }, { merge: true });
        return { action: 'generate', attempt };
    });
    if (checkpoint.action === 'replay')
        return { ok: true, unitId, state: 'succeeded', replayed: true };
    let checkpointWritten = checkpoint.action === 'resume';
    try {
        let sourceReference;
        try {
            sourceReference = (0, source_registry_1.parseSourceRegistryReference)(blueprintVersion);
        }
        catch {
            throw new https_1.HttpsError('failed-precondition', 'blueprint_reference_invalid');
        }
        const registrySnap = await db.collection('content_factory_source_registry').doc((0, source_registry_1.sourceRegistryDocId)(sourceReference.blueprintId, sourceReference.version)).get();
        if (!registrySnap.exists)
            throw new https_1.HttpsError('not-found', 'source_registry_not_found');
        const registry = registrySnap.data();
        const registryCheck = (0, source_registry_1.validateSourceRegistry)(registry);
        if (!registryCheck.ok)
            throw new https_1.HttpsError('failed-precondition', `source_registry_invalid:${registryCheck.errors.join(',')}`);
        const blueprintLesson = readBlueprintLesson(registry, input.lessonId);
        const releaseId = releaseIdForJob(input.jobId, studyTarget, learnerSourceLocale);
        let payload = checkpoint.action === 'resume' ? checkpoint.payload : undefined;
        let qaReceipt = checkpoint.action === 'resume' ? checkpoint.qaReceipt : { status: 'passed', sourceEvidenceIds: registry.evidence.map((item) => item.evidenceId), blueprintHash: registry.blueprintHash };
        if (checkpoint.action === 'generate') {
            const config = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'content_factory');
            (0, openai_jobs_config_1.assertJobEnabled)(config, 'content_factory');
            const apiKey = String(exports.CONTENT_FACTORY_OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
            if (!apiKey)
                throw new https_1.HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
            await (0, content_factory_budget_1.reserveContentFactoryBudget)(db, `${unitId}:attempt:${checkpoint.attempt}`, config.globalDailyCap);
            const provider = (0, generation_provider_1.createOpenAiGenerationProvider)(apiKey);
            if (input.surface === 'lesson') {
                const generated = await (0, generation_provider_1.generateLessonUnit)({ provider, model: config.model, studyTarget, sourceLocale: learnerSourceLocale, blueprintVersion: registry.version, blueprintHash: registry.blueprintHash, topic: blueprintLesson.topic, sourcePhrases: blueprintLesson.sourcePhrases, vocabularyFocus: blueprintLesson.vocabularyFocus, drills: blueprintLesson.drills, sourceEvidence: registry.evidence, lessonId: input.lessonId });
                payload = generated.artifact;
                qaReceipt = generated.qa;
            }
            else {
                payload = await (0, generation_provider_1.generateSurfaceUnit)({ provider, model: config.model, surface: input.surface, studyTarget, sourceLocale: learnerSourceLocale, lessonId: input.lessonId, topic: blueprintLesson.topic, sourcePhrases: blueprintLesson.sourcePhrases });
            }
            await unitRef.set({ state: 'generated', generatedPayload: payload, qaReceipt, generatedAt: admin.firestore.FieldValue.serverTimestamp(), leaseExpiresAtMs: admin.firestore.FieldValue.delete() }, { merge: true });
            checkpointWritten = true;
        }
        const bucket = admin.storage().bucket();
        const receipt = await (0, artifact_storage_1.writeImmutableArtifact)(bucket, { releaseId, surface: input.surface, lessonId: input.lessonId, payload });
        await db.runTransaction(async (tx) => {
            const [currentUnitSnap, currentJobSnap] = await Promise.all([tx.get(unitRef), tx.get(jobRef)]);
            if (!currentJobSnap.exists)
                throw new https_1.HttpsError('data-loss', 'generation_job_missing_during_completion');
            const currentUnit = currentUnitSnap.data() ?? {};
            const currentJob = currentJobSnap.data() ?? {};
            let transition;
            try {
                transition = (0, job_progress_1.applyUnitProgressTransition)(readJobProgress(currentJob), { next: 'succeeded', wasSucceeded: currentUnit.state === 'succeeded', failureCounted: currentUnit.failureCounted === true });
            }
            catch {
                throw new https_1.HttpsError('data-loss', 'content_factory_progress_invalid');
            }
            tx.set(unitRef, { unitId, state: 'succeeded', releaseId, objectPath: receipt.objectPath, contentHash: receipt.contentHash, objectGeneration: receipt.objectGeneration, byteSize: receipt.byteSize, qaReceipt, failureCounted: transition.failureCounted, generatedPayload: admin.firestore.FieldValue.delete(), leaseExpiresAtMs: admin.firestore.FieldValue.delete(), completedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            const nextJobState = transition.jobState === 'needs_review' && currentJob.releaseCandidate !== true ? 'partial' : transition.jobState;
            tx.set(jobRef, { state: nextJobState, progress: transition.progress, lastUnitId: unitId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        });
        return { ok: true, unitId, state: 'succeeded', objectPath: receipt.objectPath, contentHash: receipt.contentHash };
    }
    catch (error) {
        const failure = (0, generation_errors_1.buildGenerationFailureRecord)(error, checkpoint.attempt);
        await db.runTransaction(async (tx) => {
            const [currentUnitSnap, currentJobSnap] = await Promise.all([tx.get(unitRef), tx.get(jobRef)]);
            const currentUnit = currentUnitSnap.data() ?? {};
            const currentJob = currentJobSnap.data() ?? {};
            const transition = (0, job_progress_1.applyUnitProgressTransition)(readJobProgress(currentJob), { next: 'failed', wasSucceeded: currentUnit.state === 'succeeded', failureCounted: currentUnit.failureCounted === true });
            tx.set(unitRef, { unitId, state: checkpointWritten ? 'generated' : 'failed', failureCounted: transition.failureCounted, errorCode: failure.code, errorMessage: failure.message, retryable: failure.retryable, attemptHistory: admin.firestore.FieldValue.arrayUnion(failure), leaseExpiresAtMs: admin.firestore.FieldValue.delete(), failedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            tx.set(jobRef, { state: transition.jobState, progress: transition.progress, lastUnitId: unitId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }).catch((progressError) => console.error('content factory failure progress update failed', unitId, progressError));
        throw error instanceof https_1.HttpsError ? error : new https_1.HttpsError('unavailable', 'content_generation_failed');
    }
});
//# sourceMappingURL=content_factory_worker.js.map