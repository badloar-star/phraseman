#!/usr/bin/env npx tsx
import * as fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import * as admin from 'firebase-admin';
import {
  buildProjectionAuditRow,
  buildProjectionPreflightPlan,
  buildProjectionRepairPatch,
  executeProjectionApplyPlan,
  projectionArtifactHash,
  projectionRepairMarkerState,
  resolveProjectionAuditProjectId,
  validateProjectionPreflightPlan,
  type ProjectionApplySummary,
  type ProjectionPlanEntry,
  type ProjectionPreflightPlan,
  type ProjectionRepairScope,
} from './public_profile_projection_audit_core';
import {
  readProjectionReceipts,
  writeJsonAtomically,
  writeProjectionReceiptAtomically,
} from './public_profile_projection_receipt_store';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const scopeArg = args.find((arg) => arg.startsWith('--scope='))?.slice('--scope='.length);
const scope: ProjectionRepairScope = scopeArg === 'server-truth' ? 'server-truth' : 'cosmetic';
const confirmProject = args.find((arg) => arg.startsWith('--confirm-project='))?.slice('--confirm-project='.length) ?? '';
const outArg = args.find((arg) => arg.startsWith('--out='))?.slice('--out='.length);
const planArg = args.find((arg) => arg.startsWith('--plan='))?.slice('--plan='.length);
const planOutArg = args.find((arg) => arg.startsWith('--plan-out='))?.slice('--plan-out='.length);
const checkpointArg = args.find((arg) => arg.startsWith('--checkpoint='))?.slice('--checkpoint='.length);
const serviceAccountPath = args.find((arg) => arg.startsWith('--service-account='))?.slice('--service-account='.length);
const outputPath = path.resolve(outArg ?? path.join(
  '.codex-tmp',
  'public-profile-projection-audit',
  `audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
));
const allowedOutputRoots = [path.resolve('.codex-tmp'), path.resolve('docs', 'reports')];

function assertAllowedArtifactPath(targetPath: string): void {
  if (!allowedOutputRoots.some((root) => targetPath === root || targetPath.startsWith(`${root}${path.sep}`))) {
    throw new Error('artifact_must_be_in_ignored_temp_or_reports');
  }
}

let db: FirebaseFirestore.Firestore;

async function readCollection(name: string): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const documents: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    let query: FirebaseFirestore.Query = db.collection(name)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(500);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    documents.push(...snapshot.docs);
    process.stderr.write(`${JSON.stringify({ phase: 'read', collection: name, documents: documents.length })}\n`);
    if (snapshot.size < 500) return documents;
    cursor = snapshot.docs[snapshot.docs.length - 1];
  }
}

function initializeFirestore(): string {
  let explicitServiceAccountProjectId = '';
  if (admin.apps.length === 0) {
    const serviceAccount = serviceAccountPath
      ? JSON.parse(readFileSync(path.resolve(serviceAccountPath), 'utf8')) as { project_id?: unknown }
      : null;
    explicitServiceAccountProjectId = String(serviceAccount?.project_id ?? '').trim();
    const credential = serviceAccount
      ? admin.credential.cert(serviceAccount as admin.ServiceAccount)
      : admin.credential.applicationDefault();
    admin.initializeApp({
      credential,
      ...(explicitServiceAccountProjectId ? { projectId: explicitServiceAccountProjectId } : {}),
    });
  }
  db = admin.firestore();
  db.settings({ preferRest: true });
  return resolveProjectionAuditProjectId({
    configuredProjectId: admin.app().options.projectId,
    serviceAccountProjectId: explicitServiceAccountProjectId,
    environmentProjectId: process.env.GCLOUD_PROJECT,
  });
}

async function applyPlanEntry(
  plan: ProjectionPreflightPlan,
  entry: ProjectionPlanEntry,
): Promise<'applied' | 'reconciled'> {
  return db.runTransaction(async (transaction) => {
    const userRef = db.collection('users').doc(entry.stableUid);
    const profileRef = db.collection('public_profiles').doc(entry.stableUid);
    const [freshUser, freshProfile] = await Promise.all([
      transaction.get(userRef),
      transaction.get(profileRef),
    ]);
    if (!freshUser.exists || !freshUser.updateTime || freshUser.data()?.identityHidden === true) {
      throw new Error('user_precondition_failed');
    }
    const markerState = projectionRepairMarkerState(freshProfile.data() ?? {}, plan, entry);
    if (markerState === 'exact') return 'reconciled';
    if (markerState === 'conflict') throw new Error('projection_repair_marker_conflict');
    if (String(freshUser.updateTime.toMillis()) !== entry.expectedUserUpdateTime) {
      throw new Error('user_update_time_changed');
    }
    if (entry.expectedProfileUpdateTime === '__missing__') {
      if (freshProfile.exists) throw new Error('profile_created_since_preflight');
    } else if (!freshProfile.exists || !freshProfile.updateTime
      || String(freshProfile.updateTime.toMillis()) !== entry.expectedProfileUpdateTime) {
      throw new Error('profile_update_time_changed');
    }
    const linked = await transaction.get(
      db.collection('auth_links').where('stable_id', '==', entry.stableUid).limit(1),
    );
    if (linked.empty) throw new Error('auth_link_precondition_failed');
    const [tombstone, activeJob, ...authDeletionMarkers] = await Promise.all([
      transaction.get(db.collection('account_deletion_tombstones').doc(entry.stableUid)),
      transaction.get(db.collection('account_deletion_jobs').where('stableUid', '==', entry.stableUid).limit(1)),
      ...linked.docs.map((link) => (
        transaction.get(db.collection('account_deletion_auth_markers').doc(link.id))
      )),
    ]);
    if (tombstone.exists || !activeJob.empty || authDeletionMarkers.some((marker) => marker.exists)) {
      throw new Error('deletion_precondition_failed');
    }
    const freshRow = buildProjectionAuditRow({
      stableUid: entry.stableUid,
      user: freshUser.data() ?? {},
      publicProfile: freshProfile.data(),
      authLinkStableIds: [entry.stableUid],
      deletionPending: false,
      userUpdateTime: entry.expectedUserUpdateTime,
      profileUpdateTime: entry.expectedProfileUpdateTime,
    });
    const freshRepairPatch = buildProjectionRepairPatch(freshRow, { apply: true, scope: plan.scope });
    if (!freshRepairPatch) throw new Error('projection_precondition_failed');
    const {
      expectedUserUpdateTime: _expectedUserUpdateTime,
      expectedProfileUpdateTime: _expectedProfileUpdateTime,
      ...freshPatch
    } = freshRepairPatch;
    if (projectionArtifactHash(freshPatch) !== entry.patchHash) throw new Error('projection_patch_changed');
    transaction.set(profileRef, {
      ...entry.patch,
      uid: entry.stableUid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedReason: 'projection_audit_repair',
      projectionRepairPlanId: plan.planId,
      projectionRepairEntryHash: entry.entryHash,
      projectionRepairPatchHash: entry.patchHash,
      projectionRepairAppliedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return 'applied';
  });
}

async function runApply(): Promise<void> {
  if (!planArg) throw new Error('apply_requires_--plan');
  if (scopeArg !== 'cosmetic' && scopeArg !== 'server-truth') throw new Error('apply_requires_explicit_--scope');
  if (!confirmProject) throw new Error('apply_requires_exact_--confirm-project');
  const planPath = path.resolve(planArg);
  assertAllowedArtifactPath(planPath);
  const plan = validateProjectionPreflightPlan(JSON.parse(await fs.readFile(planPath, 'utf8')) as unknown);
  if (plan.scope !== scopeArg) throw new Error('apply_scope_does_not_match_plan');
  const checkpointDirectory = path.resolve(checkpointArg ?? path.join(
    '.codex-tmp',
    'public-profile-projection-audit',
    'checkpoints',
    plan.planId,
  ));
  assertAllowedArtifactPath(checkpointDirectory);
  const actualProject = initializeFirestore();
  if (!actualProject || confirmProject !== actualProject || plan.projectId !== actualProject) {
    throw new Error('apply_project_does_not_match_plan_and_credentials');
  }
  const existingReceipts = await readProjectionReceipts(checkpointDirectory);
  let summary: ProjectionApplySummary | null = null;
  let fatalError: string | null = null;
  try {
    summary = await executeProjectionApplyPlan({
      plan,
      existingReceipts,
      attemptedAt: () => new Date().toISOString(),
      applyOne: (entry) => applyPlanEntry(plan, entry),
      writeReceipt: (receipt) => writeProjectionReceiptAtomically(checkpointDirectory, receipt).then(() => undefined),
    });
  } catch (error) {
    fatalError = error instanceof Error ? error.message : String(error);
  } finally {
    const finalSummary = summary ?? {
      version: 1 as const,
      planId: plan.planId,
      projectId: plan.projectId,
      scope: plan.scope,
      plannedCount: plan.entries.length,
      appliedCount: 0,
      reconciledCount: 0,
      failedCount: 0,
      skippedCount: 0,
      failures: [],
    };
    await writeJsonAtomically(path.join(checkpointDirectory, 'summary.json'), {
      ...finalSummary,
      completedAt: new Date().toISOString(),
      fatalError,
    });
    process.stdout.write(`${JSON.stringify({
      mode: 'apply',
      checkpointDirectory,
      ...finalSummary,
      fatalError,
    })}\n`);
  }
  if (fatalError) throw new Error(fatalError);
  if (summary && summary.failedCount > 0) process.exitCode = 2;
}

async function runDryRun(): Promise<void> {
  assertAllowedArtifactPath(outputPath);
  const actualProject = initializeFirestore();
  if (!actualProject) throw new Error('dry_run_project_unavailable');
  const users = await readCollection('users');
  const profiles = await readCollection('public_profiles');
  const authLinks = await readCollection('auth_links');
  const tombstones = await readCollection('account_deletion_tombstones');
  const jobs = await readCollection('account_deletion_jobs');
  const authMarkers = await readCollection('account_deletion_auth_markers');

  const profilesById = new Map(profiles.map((snapshot) => [snapshot.id, snapshot]));
  const authLinksByStableId = new Map<string, string[]>();
  for (const snapshot of authLinks) {
    const stableUid = String(snapshot.data().stable_id ?? '').trim();
    if (!stableUid) continue;
    authLinksByStableId.set(stableUid, [...(authLinksByStableId.get(stableUid) ?? []), snapshot.id]);
  }
  const deletingStableIds = new Set<string>(tombstones.map((snapshot) => snapshot.id));
  for (const snapshot of jobs) {
    const stableUid = String(snapshot.data().stableUid ?? '').trim();
    if (stableUid) deletingStableIds.add(stableUid);
  }
  for (const snapshot of authMarkers) {
    const stableUid = String(authLinks.find((link) => link.id === snapshot.id)?.data().stable_id ?? '').trim();
    if (stableUid) deletingStableIds.add(stableUid);
  }

  const rows = users
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((userSnapshot) => {
      const profileSnapshot = profilesById.get(userSnapshot.id);
      return buildProjectionAuditRow({
        stableUid: userSnapshot.id,
        user: userSnapshot.data(),
        publicProfile: profileSnapshot?.data(),
        authLinkStableIds: authLinksByStableId.has(userSnapshot.id) ? [userSnapshot.id] : [],
        deletionPending: deletingStableIds.has(userSnapshot.id),
        userUpdateTime: String(userSnapshot.updateTime.toMillis()),
        profileUpdateTime: profileSnapshot ? String(profileSnapshot.updateTime.toMillis()) : '__missing__',
      });
    });
  const generatedAt = new Date().toISOString();
  const plan = buildProjectionPreflightPlan({ projectId: actualProject, scope, generatedAt, rows });
  const planPath = path.resolve(planOutArg ?? outputPath.replace(/\.json$/i, '.plan.json'));
  assertAllowedArtifactPath(planPath);
  const counts = rows.reduce<Record<string, number>>((result, row) => {
    result[row.classification] = (result[row.classification] ?? 0) + 1;
    return result;
  }, {});
  await writeJsonAtomically(planPath, plan);
  await writeJsonAtomically(outputPath, {
    mode: 'dry-run',
    scope,
    projectId: actualProject,
    generatedAt,
    counts,
    appliedCount: 0,
    planId: plan.planId,
    planPath,
    plannedCount: plan.entries.length,
    rows,
  });
  process.stdout.write(`${JSON.stringify({
    mode: 'dry-run',
    scope,
    counts,
    appliedCount: 0,
    plannedCount: plan.entries.length,
    planId: plan.planId,
    planPath,
    outputPath,
  })}\n`);
}

async function main(): Promise<void> {
  if (args.includes('--help')) {
    process.stdout.write('Usage: audit_public_profile_projection.ts [--scope=cosmetic|server-truth] [--out=.codex-tmp/...json] [--plan-out=.codex-tmp/...plan.json] [--service-account=path] | --apply --plan=.codex-tmp/...plan.json --scope=cosmetic|server-truth --confirm-project=PROJECT_ID [--checkpoint=.codex-tmp/...]\n');
    return;
  }
  if (apply) await runApply();
  else await runDryRun();
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  process.exitCode = 1;
});
