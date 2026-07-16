import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { buildBulkStagePlan, parseBulkStagePlanRequest, type ApprovedBulkPrerequisite } from './content_factory/bulk_stage_plan';
import { stageCapability } from './content_factory/stage_capabilities';
import { type GenerationStageKind } from './content_factory/stage_contracts';

const REGION = 'us-central1';

function requireDraftRole(request: { auth?: { token?: Record<string, unknown> } }): AdminRole {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = request.auth.token.adminRole;
  if (!hasAdminRole(role) || !hasPermission(role, 'content.draft.write')) throw new HttpsError('permission-denied', 'Role cannot use content.draft.write');
  return role;
}

function sameUnit(current: Record<string, unknown>, unit: ReturnType<typeof buildBulkStagePlan>['units'][number]): boolean {
  const prerequisites = Array.isArray(current.prerequisiteArtifactIds) ? current.prerequisiteArtifactIds.map(String) : [];
  return current.requestId === unit.requestId && current.kind === unit.kind && current.studyTarget === unit.studyTarget && current.sourceLocale === unit.sourceLocale
    && current.scopeId === unit.scopeId && current.count === unit.count && current.revision === unit.revision
    && JSON.stringify(prerequisites) === JSON.stringify(unit.prerequisiteArtifactIds);
}

function liveProgress(units: ReturnType<typeof buildBulkStagePlan>['units'], snapshots: readonly admin.firestore.DocumentSnapshot[]) {
  let queued = 0; let completed = 0; let failed = 0;
  snapshots.forEach((snapshot) => {
    if (!snapshot.exists || ['queued', 'running', 'paused', 'needs_review'].includes(String(snapshot.data()?.state ?? 'queued'))) queued += 1;
    else if (snapshot.data()?.state === 'approved') completed += 1;
    else failed += 1;
  });
  return Object.freeze({ planned: units.length, queued, completed, failed });
}

export async function createContentStageBulkPlan(db: admin.firestore.Firestore, input: ReturnType<typeof parseBulkStagePlanRequest>, actorUid: string, role: AdminRole) {
  const planId = `bulk:${input.requestId}:${input.idempotencyKey}`;
  const planRef = db.collection('content_factory_bulk_plans').doc(planId);

  return db.runTransaction(async (tx) => {
    const planSnapshot = await tx.get(planRef);
    const prerequisiteKinds = [...new Set(input.kinds.flatMap((kind) => stageCapability(kind).prerequisiteKinds))];
    let approved: ApprovedBulkPrerequisite[] = [];
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
        return { stageId: doc.id, requestId: String(data.requestId), kind: String(data.kind) as GenerationStageKind, scopeId: String(data.scopeId), studyTarget: String(data.studyTarget), sourceLocale: String(data.sourceLocale), state: 'approved', artifactId: String(data.artifactId) };
      });
    }
    const plan = buildBulkStagePlan(input, approved);
    if (plan.conflicts.length > 0) throw new HttpsError('failed-precondition', 'bulk_stage_prerequisite_conflicts', { conflicts: plan.conflicts });
    const stageSnapshots = await Promise.all(plan.units.map((unit) => tx.get(db.collection('content_factory_stages').doc(unit.stageId))));
    const progress = liveProgress(plan.units, stageSnapshots);
    if (planSnapshot.exists) {
      const current = planSnapshot.data() ?? {};
      if (current.planFingerprint !== plan.planFingerprint) throw new HttpsError('already-exists', 'bulk_stage_idempotency_conflict');
      return { ok: true, planId, planFingerprint: plan.planFingerprint, stageIds: plan.units.map((unit) => unit.stageId), plannedCount: plan.units.length, conflicts: [], progress, replayed: true };
    }
    for (let index = 0; index < plan.units.length; index += 1) {
      const snapshot = stageSnapshots[index];
      if (snapshot.exists && !sameUnit(snapshot.data() ?? {}, plan.units[index])) throw new HttpsError('already-exists', 'bulk_stage_existing_stage_conflict', { stageId: plan.units[index].stageId });
    }

    tx.create(planRef, {
      planId, planFingerprint: plan.planFingerprint, requestId: input.requestId, idempotencyKey: input.idempotencyKey,
      studyTarget: input.studyTarget, sourceLocale: input.sourceLocale, cefr: input.cefr, objective: input.objective,
      kinds: input.kinds, scopes: input.scopes, dependencyPolicy: input.dependencyPolicy, stageIds: plan.units.map((unit) => unit.stageId),
      initialProgress: progress, progressSource: 'derive_from_stage_documents', createdBy: actorUid, createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    for (let index = 0; index < plan.units.length; index += 1) {
      const unit = plan.units[index];
      if (stageSnapshots[index].exists) continue;
      const capability = stageCapability(unit.kind);
      const stageRef = db.collection('content_factory_stages').doc(unit.stageId);
      tx.create(stageRef, {
        ...unit, cefr: input.cefr, objective: input.objective, prerequisiteStageIds: approved.filter((candidate) => unit.prerequisiteArtifactIds.includes(candidate.artifactId)).map((candidate) => candidate.stageId),
        publicationPolicy: capability.publicationPolicy, bulkPlanId: planId, bulkPlanFingerprint: plan.planFingerprint,
        createdBy: actorUid, createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const auditId = createHash('sha256').update(`${planId}:${unit.stageId}:create`).digest('hex');
      tx.create(db.collection('admin_log').doc(auditId), {
        action: 'content_factory.stage.bulk_create', actorUid, role, entity: { collection: 'content_factory_stages', id: unit.stageId },
        operationId: auditId, reason: 'Content generation stage created by bounded server bulk plan', before: null, after: { state: unit.state, artifactId: unit.artifactId, bulkPlanId: planId }, timestamp: new Date().toISOString(),
      });
    }
    return { ok: true, planId, planFingerprint: plan.planFingerprint, stageIds: plan.units.map((unit) => unit.stageId), plannedCount: plan.units.length, conflicts: [], progress, replayed: false };
  });
}

export const adminCreateContentStageBulkPlan = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const role = requireDraftRole(request as { auth?: { token?: Record<string, unknown> } });
  let input: ReturnType<typeof parseBulkStagePlanRequest>;
  try { input = parseBulkStagePlanRequest(request.data); } catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'bulk_stage_plan_invalid'); }
  return createContentStageBulkPlan(admin.firestore(), input, request.auth!.uid, role);
});
