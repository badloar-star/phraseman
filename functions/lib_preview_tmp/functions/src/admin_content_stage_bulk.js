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
exports.adminCreateContentStageBulkPlan = void 0;
exports.createContentStageBulkPlan = createContentStageBulkPlan;
const admin = __importStar(require("firebase-admin"));
const node_crypto_1 = require("node:crypto");
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const bulk_stage_plan_1 = require("./content_factory/bulk_stage_plan");
const stage_capabilities_1 = require("./content_factory/stage_capabilities");
const REGION = 'us-central1';
function requireDraftRole(request) {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = request.auth.token.adminRole;
    if (!(0, roles_1.hasAdminRole)(role) || !(0, permissions_1.hasPermission)(role, 'content.draft.write'))
        throw new https_1.HttpsError('permission-denied', 'Role cannot use content.draft.write');
    return role;
}
function sameUnit(current, unit) {
    const prerequisites = Array.isArray(current.prerequisiteArtifactIds) ? current.prerequisiteArtifactIds.map(String) : [];
    return current.requestId === unit.requestId && current.kind === unit.kind && current.studyTarget === unit.studyTarget && current.sourceLocale === unit.sourceLocale
        && current.scopeId === unit.scopeId && current.count === unit.count && current.revision === unit.revision
        && JSON.stringify(prerequisites) === JSON.stringify(unit.prerequisiteArtifactIds);
}
function liveProgress(units, snapshots) {
    let queued = 0;
    let completed = 0;
    let failed = 0;
    snapshots.forEach((snapshot) => {
        if (!snapshot.exists || ['queued', 'running', 'paused', 'needs_review'].includes(String(snapshot.data()?.state ?? 'queued')))
            queued += 1;
        else if (snapshot.data()?.state === 'approved')
            completed += 1;
        else
            failed += 1;
    });
    return Object.freeze({ planned: units.length, queued, completed, failed });
}
async function createContentStageBulkPlan(db, input, actorUid, role) {
    const planId = `bulk:${input.requestId}:${input.idempotencyKey}`;
    const planRef = db.collection('content_factory_bulk_plans').doc(planId);
    return db.runTransaction(async (tx) => {
        const planSnapshot = await tx.get(planRef);
        const prerequisiteKinds = [...new Set(input.kinds.flatMap((kind) => (0, stage_capabilities_1.stageCapability)(kind).prerequisiteKinds))];
        let approved = [];
        if (prerequisiteKinds.length > 0) {
            const query = db.collection('content_factory_stages')
                .where('requestId', '==', input.requestId)
                .where('studyTarget', '==', input.studyTarget)
                .where('sourceLocale', '==', input.sourceLocale)
                .where('state', '==', 'approved')
                .where('kind', 'in', prerequisiteKinds);
            const snapshot = await tx.get(query);
            approved = snapshot.docs.map((doc) => {
                const data = doc.data();
                return { stageId: doc.id, requestId: String(data.requestId), kind: String(data.kind), scopeId: String(data.scopeId), studyTarget: String(data.studyTarget), sourceLocale: String(data.sourceLocale), state: 'approved', artifactId: String(data.artifactId) };
            });
        }
        const plan = (0, bulk_stage_plan_1.buildBulkStagePlan)(input, approved);
        if (plan.conflicts.length > 0)
            throw new https_1.HttpsError('failed-precondition', 'bulk_stage_prerequisite_conflicts', { conflicts: plan.conflicts });
        const stageSnapshots = await Promise.all(plan.units.map((unit) => tx.get(db.collection('content_factory_stages').doc(unit.stageId))));
        const progress = liveProgress(plan.units, stageSnapshots);
        if (planSnapshot.exists) {
            const current = planSnapshot.data() ?? {};
            if (current.planFingerprint !== plan.planFingerprint)
                throw new https_1.HttpsError('already-exists', 'bulk_stage_idempotency_conflict');
            return { ok: true, planId, planFingerprint: plan.planFingerprint, stageIds: plan.units.map((unit) => unit.stageId), plannedCount: plan.units.length, conflicts: [], progress, replayed: true };
        }
        for (let index = 0; index < plan.units.length; index += 1) {
            const snapshot = stageSnapshots[index];
            if (snapshot.exists && !sameUnit(snapshot.data() ?? {}, plan.units[index]))
                throw new https_1.HttpsError('already-exists', 'bulk_stage_existing_stage_conflict', { stageId: plan.units[index].stageId });
        }
        tx.create(planRef, {
            planId, planFingerprint: plan.planFingerprint, requestId: input.requestId, idempotencyKey: input.idempotencyKey,
            studyTarget: input.studyTarget, sourceLocale: input.sourceLocale, cefr: input.cefr, objective: input.objective,
            kinds: input.kinds, scopes: input.scopes, dependencyPolicy: input.dependencyPolicy, stageIds: plan.units.map((unit) => unit.stageId),
            initialProgress: progress, progressSource: 'derive_from_stage_documents', createdBy: actorUid, createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        for (let index = 0; index < plan.units.length; index += 1) {
            const unit = plan.units[index];
            if (stageSnapshots[index].exists)
                continue;
            const capability = (0, stage_capabilities_1.stageCapability)(unit.kind);
            const stageRef = db.collection('content_factory_stages').doc(unit.stageId);
            tx.create(stageRef, {
                ...unit, cefr: input.cefr, objective: input.objective, prerequisiteStageIds: approved.filter((candidate) => unit.prerequisiteArtifactIds.includes(candidate.artifactId)).map((candidate) => candidate.stageId),
                publicationPolicy: capability.publicationPolicy, bulkPlanId: planId, bulkPlanFingerprint: plan.planFingerprint,
                createdBy: actorUid, createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            const auditId = (0, node_crypto_1.createHash)('sha256').update(`${planId}:${unit.stageId}:create`).digest('hex');
            tx.create(db.collection('admin_log').doc(auditId), {
                action: 'content_factory.stage.bulk_create', actorUid, role, entity: { collection: 'content_factory_stages', id: unit.stageId },
                operationId: auditId, reason: 'Content generation stage created by bounded server bulk plan', before: null, after: { state: unit.state, artifactId: unit.artifactId, bulkPlanId: planId }, timestamp: new Date().toISOString(),
            });
        }
        return { ok: true, planId, planFingerprint: plan.planFingerprint, stageIds: plan.units.map((unit) => unit.stageId), plannedCount: plan.units.length, conflicts: [], progress, replayed: false };
    });
}
exports.adminCreateContentStageBulkPlan = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const role = requireDraftRole(request);
    let input;
    try {
        input = (0, bulk_stage_plan_1.parseBulkStagePlanRequest)(request.data);
    }
    catch (error) {
        throw new https_1.HttpsError('invalid-argument', error instanceof Error ? error.message : 'bulk_stage_plan_invalid');
    }
    return createContentStageBulkPlan(admin.firestore(), input, request.auth.uid, role);
});
//# sourceMappingURL=admin_content_stage_bulk.js.map