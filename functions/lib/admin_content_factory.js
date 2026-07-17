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
exports.adminListContentFactoryJobs = exports.adminUpdateArenaConvergenceConfig = exports.adminCreateContentGenerationJob = exports.SUPPORTED_CONTENT_FACTORY_STUDY_TARGETS = void 0;
exports.parseContentFactoryJobRequest = parseContentFactoryJobRequest;
exports.assertContentFactorySourceCoverage = assertContentFactorySourceCoverage;
exports.storedGenerationPlanFingerprint = storedGenerationPlanFingerprint;
exports.buildContentFactoryJobPlan = buildContentFactoryJobPlan;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const roles_1 = require("./admin/roles");
const permissions_1 = require("./admin/permissions");
const contracts_1 = require("./content_factory/contracts");
const job_service_1 = require("./content_factory/job_service");
const source_registry_1 = require("./content_factory/source_registry");
const course_release_contract_1 = require("./content_factory/course_release_contract");
const generation_plan_1 = require("./content_factory/generation_plan");
const surface_convergence_policy_1 = require("./content_factory/surface_convergence_policy");
const surface_convergence_repository_1 = require("./content_factory/surface_convergence_repository");
const REGION = 'us-central1';
const SURFACES = ['lessons', 'vocabulary', 'drills', 'quizzes', 'cards', 'arena_questions'];
exports.SUPPORTED_CONTENT_FACTORY_STUDY_TARGETS = Object.freeze(['en', 'fr']);
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parseContentFactoryJobRequest(data) {
    if (!isRecord(data) || !Array.isArray(data.lessonIds) || !Array.isArray(data.surfaces)) {
        throw new https_1.HttpsError('invalid-argument', 'lessonIds and surfaces are required');
    }
    const lessonIds = data.lessonIds.map(Number);
    const surfaces = data.surfaces.map(String);
    if (!lessonIds.every(Number.isInteger) || lessonIds.length > 100 || lessonIds.some((id) => id < 1)) {
        throw new https_1.HttpsError('invalid-argument', 'lessonIds must contain 1..100 positive integers');
    }
    if (!surfaces.length || surfaces.some((surface) => !SURFACES.includes(surface))) {
        throw new https_1.HttpsError('invalid-argument', 'unsupported generation surface');
    }
    const result = {
        projectId: String(data.projectId ?? '').trim(),
        studyTarget: String(data.studyTarget ?? '').trim(),
        sourceLocale: String(data.sourceLocale ?? '').trim(),
        lessonIds,
        surfaces,
        idempotencyKey: String(data.idempotencyKey ?? '').trim(),
        blueprintVersion: String(data.blueprintVersion ?? '').trim(),
    };
    if (Object.values(result).some((value) => typeof value === 'string' && !value)) {
        throw new https_1.HttpsError('invalid-argument', 'project, language, locale, operation and blueprint are required');
    }
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(result.projectId) || !/^[A-Za-z0-9._-]{1,160}$/.test(result.idempotencyKey) || !exports.SUPPORTED_CONTENT_FACTORY_STUDY_TARGETS.includes(result.studyTarget) || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(result.sourceLocale) || new Set(lessonIds).size !== lessonIds.length) {
        throw new https_1.HttpsError('invalid-argument', 'invalid content factory identity or duplicate lesson');
    }
    try {
        (0, source_registry_1.parseSourceRegistryReference)(result.blueprintVersion);
    }
    catch {
        throw new https_1.HttpsError('invalid-argument', 'blueprintVersion must be blueprintId:version');
    }
    return Object.freeze({ ...result, lessonIds: Object.freeze([...lessonIds]), surfaces: Object.freeze([...surfaces]) });
}
function assertContentFactorySourceCoverage(registry, lessonIds) {
    const coverage = (0, source_registry_1.inspectSourceRegistryCoverage)(registry, lessonIds);
    if (!coverage.ok) {
        throw new https_1.HttpsError('failed-precondition', 'source_coverage', { missingLessonIds: coverage.missingLessonIds });
    }
}
function storedGenerationPlanFingerprint(value) {
    if (typeof value.planFingerprint === 'string' && value.planFingerprint)
        return value.planFingerprint;
    if (!Array.isArray(value.lessonIds) || !Array.isArray(value.surfaces))
        return '';
    return (0, generation_plan_1.generationPlanFingerprint)(value.lessonIds.map(Number), value.surfaces.map(String));
}
function buildContentFactoryJobPlan(input, actorUid, now = new Date().toISOString(), arenaRoutingForUnit) {
    const units = (0, job_service_1.splitGenerationJob)({ jobId: input.idempotencyKey, studyTarget: input.studyTarget, learnerSourceLocale: input.sourceLocale, lessonIds: input.lessonIds, surfaces: input.surfaces }).map((unit) => unit.surface === 'arena' && arenaRoutingForUnit ? Object.freeze({ ...unit, ...arenaRoutingForUnit(unit.unitId) }) : unit);
    const base = (0, contracts_1.createGenerationJob)({ ...input, requestedBy: actorUid, now });
    const plannedSurfaces = new Set(units.map((unit) => unit.surface));
    const releaseCandidate = course_release_contract_1.CANONICAL_RELEASE_SURFACES.every((surface) => plannedSurfaces.has(surface));
    const job = Object.freeze({ ...base, learnerSourceLocale: input.sourceLocale, releaseCandidate, progress: Object.freeze({ total: units.length, completed: 0, failed: 0 }) });
    return Object.freeze({ job, units: Object.freeze(units) });
}
function roleFromToken(token) {
    return (0, roles_1.hasAdminRole)(token.adminRole) ? token.adminRole : null;
}
exports.adminCreateContentGenerationJob = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token);
    if (!role)
        throw new https_1.HttpsError('permission-denied', 'adminRole claim required');
    if (!(0, permissions_1.hasPermission)(role, 'content.draft.write'))
        throw new https_1.HttpsError('permission-denied', 'Role cannot create content drafts');
    const actorUid = request.auth.uid;
    const input = parseContentFactoryJobRequest(request.data);
    const db = admin.firestore();
    const sourceReference = (0, source_registry_1.parseSourceRegistryReference)(input.blueprintVersion);
    const [registrySnap, convergenceConfigSnap] = await Promise.all([
        db.collection('content_factory_source_registry').doc((0, source_registry_1.sourceRegistryDocId)(sourceReference.blueprintId, sourceReference.version)).get(),
        db.collection('content_factory_config').doc('surface_convergence').get(),
    ]);
    if (!registrySnap.exists)
        throw new https_1.HttpsError('not-found', 'source_registry_not_found');
    const registry = registrySnap.data();
    const registryValidation = (0, source_registry_1.validateSourceRegistry)(registry);
    if (!registryValidation.ok)
        throw new https_1.HttpsError('failed-precondition', 'source_registry_invalid', { errors: registryValidation.errors });
    assertContentFactorySourceCoverage(registry, input.lessonIds);
    const plan = buildContentFactoryJobPlan(input, actorUid, new Date().toISOString(), (unitId) => {
        const resolved = (0, surface_convergence_policy_1.resolveArenaEnginePolicy)({ config: convergenceConfigSnap.exists ? convergenceConfigSnap.data() : undefined, unit: { id: unitId, isNew: true, engineRequested: convergenceConfigSnap.data()?.arena?.mode ?? 'legacy' } });
        return { engineRequested: resolved.engineRequested, engineResolved: resolved.engineResolved, configRevision: resolved.configRevision, comparatorVersion: resolved.comparatorVersion };
    });
    const job = plan.job;
    const jobRef = db.collection('content_factory_jobs').doc(job.idempotencyKey);
    return db.runTransaction(async (tx) => {
        const existing = await tx.get(jobRef);
        if (existing.exists) {
            const previous = existing.data() ?? {};
            if (previous.projectId !== job.projectId || previous.studyTarget !== job.studyTarget || previous.sourceLocale !== job.sourceLocale || previous.blueprintVersion !== job.blueprintVersion || storedGenerationPlanFingerprint(previous) !== job.planFingerprint) {
                throw new https_1.HttpsError('already-exists', 'idempotencyKey belongs to another job');
            }
            return { ok: true, jobId: job.idempotencyKey, state: previous.state ?? 'queued', replayed: true };
        }
        tx.create(jobRef, { ...job, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        plan.units.forEach((unit) => tx.create(db.collection('content_factory_job_units').doc(unit.unitId), unit));
        tx.create(db.collection('admin_log').doc(), {
            action: 'content_factory.job.create',
            actorUid,
            role,
            entity: { collection: 'content_factory_jobs', id: job.idempotencyKey },
            reason: 'Language Factory generation job created',
            requestId: String(request.data && isRecord(request.data) ? request.data.requestId ?? '' : ''),
            before: null,
            after: { state: job.state, plannedUnitCount: plan.units.length },
            timestamp: new Date().toISOString(),
            operationId: job.idempotencyKey,
        });
        return { ok: true, jobId: job.idempotencyKey, state: job.state, replayed: false };
    });
});
exports.adminUpdateArenaConvergenceConfig = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'content.publish'))
        throw new https_1.HttpsError('permission-denied', 'Role cannot change Arena routing');
    const mode = String(request.data?.mode ?? '');
    const expectedRevision = Number(request.data?.expectedRevision);
    const disabledReason = String(request.data?.disabledReason ?? '').trim();
    const requiredLocalePairs = Array.isArray(request.data?.requiredLocalePairs) ? request.data.requiredLocalePairs.map(String) : [];
    if (!['legacy', 'shadow'].includes(mode) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || (mode === 'legacy' && !disabledReason) || (mode === 'shadow' && requiredLocalePairs.length === 0))
        throw new https_1.HttpsError('invalid-argument', 'arena_convergence_update_invalid');
    try {
        return await (0, surface_convergence_repository_1.updateArenaConvergenceConfig)(admin.firestore(), { expectedRevision, mode: mode, actorUid: request.auth.uid, role, requiredLocalePairs: mode === 'shadow' ? requiredLocalePairs : undefined, disabledReason, requestId: String(request.data?.requestId ?? ''), nowIso: new Date().toISOString(), serverTimestamp: admin.firestore.FieldValue.serverTimestamp() });
    }
    catch (error) {
        throw new https_1.HttpsError('aborted', error instanceof Error ? error.message : 'surface_convergence_update_failed');
    }
});
exports.adminListContentFactoryJobs = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'content.read'))
        throw new https_1.HttpsError('permission-denied', 'Role cannot read content jobs');
    const requestedLimit = Number(request.data?.limit ?? 50);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, Math.floor(requestedLimit))) : 50;
    const studyTarget = String(request.data?.studyTarget ?? '').trim();
    const snapshot = await admin.firestore().collection('content_factory_jobs').limit(100).get();
    const jobs = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((job) => !studyTarget || job.studyTarget === studyTarget)
        .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
        .slice(0, limit);
    return { ok: true, jobs };
});
//# sourceMappingURL=admin_content_factory.js.map