import {
  buildProjectionAuditRow,
  buildProjectionRepairPatch,
  buildProjectionPreflightPlan,
  executeProjectionApplyPlan,
  projectionArtifactHash,
  projectionRepairMarkerState,
  resolveProjectionAuditProjectId,
  shouldSkipProjectionPlanEntry,
  validateProjectionPreflightPlan,
  type ProjectionApplyReceipt,
} from '../scripts/public_profile_projection_audit_core';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  readProjectionReceipts,
  writeProjectionReceiptAtomically,
} from '../scripts/public_profile_projection_receipt_store';

describe('public profile projection audit/repair planning', () => {
  it('hashes undefined deterministically without colliding with the sentinel text', () => {
    expect(projectionArtifactHash(undefined)).toBe(projectionArtifactHash(undefined));
    expect(projectionArtifactHash(undefined)).not.toBe(projectionArtifactHash('__undefined__'));
  });

  const user = {
    identityHidden: false,
    progressServerAuthoritative: true,
    progressServerState: { totalXp: 120, weekPoints: 9, streakCount: 3 },
    progress: { user_total_xp: '9000', user_name: 'Learner' },
  };

  it('classifies legacy XP debt separately from ordinary cosmetic drift', () => {
    const row = buildProjectionAuditRow({
      stableUid: 'stable-a',
      user,
      publicProfile: { totalXp: 9000, name: 'Old' },
      authLinkStableIds: ['stable-a'],
      deletionPending: false,
      userUpdateTime: 'u1',
      profileUpdateTime: 'p1',
    });

    expect(row.classification).toBe('legacy_xp_debt');
    expect(row.legacyXp).toEqual({ usersProgress: 9000, publicProfile: 9000, serverTruth: 120 });
  });

  it('fails closed for hidden, deleting, or unanchored identities', () => {
    for (const input of [
      { user: { ...user, identityHidden: true }, authLinkStableIds: ['stable-a'], deletionPending: false },
      { user, authLinkStableIds: ['stable-a'], deletionPending: true },
      { user, authLinkStableIds: [], deletionPending: false },
    ]) {
      const row = buildProjectionAuditRow({
        stableUid: 'stable-a',
        publicProfile: {},
        userUpdateTime: 'u1',
        profileUpdateTime: 'p1',
        ...input,
      });
      expect(row.safeToApply).toBe(false);
    }
  });

  it('requires explicit apply and update-time preconditions before XP changes', () => {
    const row = buildProjectionAuditRow({
      stableUid: 'stable-a',
      user,
      publicProfile: { totalXp: 9000, name: 'Old' },
      authLinkStableIds: ['stable-a'],
      deletionPending: false,
      userUpdateTime: 'u1',
      profileUpdateTime: 'p1',
    });

    expect(buildProjectionRepairPatch(row, { apply: false, scope: 'server-truth' })).toBeNull();
    expect(buildProjectionRepairPatch(row, { apply: true, scope: 'cosmetic' })).not.toHaveProperty('totalXp');
    expect(buildProjectionRepairPatch(row, { apply: true, scope: 'server-truth' })).toMatchObject({
      totalXp: 120,
      weekPoints: 9,
      streak: 3,
      expectedUserUpdateTime: 'u1',
      expectedProfileUpdateTime: 'p1',
    });
  });

  it('loads as an executable CLI without credentials or production access', () => {
    const result = spawnSync(process.execPath, [
      require.resolve('tsx/cli'),
      path.join(process.cwd(), 'scripts', 'audit_public_profile_projection.ts'),
      '--help',
    ], { encoding: 'utf8', timeout: 30_000 });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: audit_public_profile_projection.ts');
    expect(result.stderr).toBe('');
  });

  it('builds an immutable preflight plan and rejects a tampered patch', () => {
    const row = buildProjectionAuditRow({
      stableUid: 'stable-a',
      user,
      publicProfile: { totalXp: 9000, name: 'Old' },
      authLinkStableIds: ['stable-a'],
      deletionPending: false,
      userUpdateTime: 'u1',
      profileUpdateTime: 'p1',
    });
    const plan = buildProjectionPreflightPlan({
      projectId: 'project-a',
      scope: 'server-truth',
      generatedAt: '2026-08-12T12:00:00.000Z',
      rows: [row],
    });

    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]).toMatchObject({
      stableUid: 'stable-a',
      expectedUserUpdateTime: 'u1',
      expectedProfileUpdateTime: 'p1',
      patch: expect.objectContaining({ totalXp: 120 }),
    });
    expect(validateProjectionPreflightPlan(plan)).toBe(plan);

    const tampered = JSON.parse(JSON.stringify(plan));
    tampered.entries[0].patch.totalXp = 999;
    expect(() => validateProjectionPreflightPlan(tampered)).toThrow('plan_entry_hash_mismatch');
  });

  it('plans only rows that actually drift for the selected repair scope', () => {
    const inSync = buildProjectionAuditRow({
      stableUid: 'stable-clean',
      user,
      publicProfile: {
        name: 'Learner',
        nameLower: 'learner',
        totalXp: 120,
        level: 1,
        weekPoints: 9,
        streak: 3,
        progressAuthority: 'server',
      },
      authLinkStableIds: ['stable-clean'],
      deletionPending: false,
      userUpdateTime: 'u-clean',
      profileUpdateTime: 'p-clean',
    });
    const cosmeticOnly = buildProjectionAuditRow({
      stableUid: 'stable-cosmetic',
      user: {
        ...user,
        progress: { user_total_xp: '120', user_name: 'Learner' },
      },
      publicProfile: {
        name: 'Old',
        nameLower: 'old',
        totalXp: 120,
        level: 1,
        weekPoints: 9,
        streak: 3,
        progressAuthority: 'server',
      },
      authLinkStableIds: ['stable-cosmetic'],
      deletionPending: false,
      userUpdateTime: 'u-cosmetic',
      profileUpdateTime: 'p-cosmetic',
    });

    const plan = buildProjectionPreflightPlan({
      projectId: 'project-a',
      scope: 'cosmetic',
      generatedAt: '2026-08-12T12:00:00.000Z',
      rows: [inSync, cosmeticOnly],
    });

    expect(plan.entries.map((entry) => entry.stableUid)).toEqual(['stable-cosmetic']);
  });

  it('resumes only an applied receipt matching plan, entry, patch and preconditions', () => {
    const row = buildProjectionAuditRow({
      stableUid: 'stable-a',
      user,
      publicProfile: { totalXp: 9000, name: 'Old' },
      authLinkStableIds: ['stable-a'],
      deletionPending: false,
      userUpdateTime: 'u1',
      profileUpdateTime: 'p1',
    });
    const plan = buildProjectionPreflightPlan({
      projectId: 'project-a',
      scope: 'server-truth',
      generatedAt: '2026-08-12T12:00:00.000Z',
      rows: [row],
    });
    const entry = plan.entries[0];
    const matching: ProjectionApplyReceipt = {
      version: 1,
      planId: plan.planId,
      stableUid: entry.stableUid,
      entryHash: entry.entryHash,
      patchHash: entry.patchHash,
      expectedUserUpdateTime: entry.expectedUserUpdateTime,
      expectedProfileUpdateTime: entry.expectedProfileUpdateTime,
      status: 'applied',
      attemptedAt: '2026-08-12T12:01:00.000Z',
    };

    expect(shouldSkipProjectionPlanEntry(plan, entry, [matching])).toBe(true);
    expect(shouldSkipProjectionPlanEntry(plan, entry, [{ ...matching, status: 'failed' }])).toBe(false);
    expect(shouldSkipProjectionPlanEntry(plan, entry, [{ ...matching, patchHash: 'different' }])).toBe(false);
    expect(shouldSkipProjectionPlanEntry(plan, entry, [{ ...matching, expectedUserUpdateTime: 'u2' }])).toBe(false);
  });

  it('records every row outcome, continues after failures, and always returns a final summary', async () => {
    const rows = ['stable-a', 'stable-b'].map((stableUid) => buildProjectionAuditRow({
      stableUid,
      user,
      publicProfile: { totalXp: 9000, name: 'Old' },
      authLinkStableIds: [stableUid],
      deletionPending: false,
      userUpdateTime: `u-${stableUid}`,
      profileUpdateTime: `p-${stableUid}`,
    }));
    const plan = buildProjectionPreflightPlan({
      projectId: 'project-a',
      scope: 'server-truth',
      generatedAt: '2026-08-12T12:00:00.000Z',
      rows,
    });
    const receipts: ProjectionApplyReceipt[] = [];
    const attempted: string[] = [];

    const summary = await executeProjectionApplyPlan({
      plan,
      existingReceipts: [],
      attemptedAt: () => '2026-08-12T12:01:00.000Z',
      applyOne: async (entry) => {
        attempted.push(entry.stableUid);
        if (entry.stableUid === 'stable-a') throw new Error('precondition_failed');
      },
      writeReceipt: async (receipt) => { receipts.push(receipt); },
    });

    expect(attempted).toEqual(['stable-a', 'stable-b']);
    expect(receipts.map((receipt) => receipt.status)).toEqual(['failed', 'applied']);
    expect(summary).toMatchObject({ plannedCount: 2, appliedCount: 1, failedCount: 1, skippedCount: 0 });
    expect(summary.failures).toEqual([{ stableUid: 'stable-a', error: 'precondition_failed' }]);
  });

  it('recognizes only an exact transactional marker whose profile still matches the planned patch', () => {
    const row = buildProjectionAuditRow({
      stableUid: 'stable-a',
      user,
      publicProfile: { totalXp: 9000, name: 'Old' },
      authLinkStableIds: ['stable-a'],
      deletionPending: false,
      userUpdateTime: 'u1',
      profileUpdateTime: 'p1',
    });
    const plan = buildProjectionPreflightPlan({
      projectId: 'project-a',
      scope: 'server-truth',
      generatedAt: '2026-08-12T12:00:00.000Z',
      rows: [row],
    });
    const entry = plan.entries[0];
    const exactProfile = {
      ...entry.patch,
      projectionRepairPlanId: plan.planId,
      projectionRepairEntryHash: entry.entryHash,
      projectionRepairPatchHash: entry.patchHash,
      projectionRepairAppliedAt: 'server-time',
    };

    expect(projectionRepairMarkerState({}, plan, entry)).toBe('none');
    expect(projectionRepairMarkerState(exactProfile, plan, entry)).toBe('exact');
    expect(projectionRepairMarkerState({ ...exactProfile, totalXp: 999 }, plan, entry)).toBe('conflict');
    expect(projectionRepairMarkerState({
      ...exactProfile,
      projectionRepairEntryHash: 'different',
    }, plan, entry)).toBe('conflict');
  });

  it('reconciles a committed marker after local receipt failure without a second mutation', async () => {
    const row = buildProjectionAuditRow({
      stableUid: 'stable-a',
      user,
      publicProfile: { totalXp: 9000, name: 'Old' },
      authLinkStableIds: ['stable-a'],
      deletionPending: false,
      userUpdateTime: 'u1',
      profileUpdateTime: 'p1',
    });
    const plan = buildProjectionPreflightPlan({
      projectId: 'project-a',
      scope: 'server-truth',
      generatedAt: '2026-08-12T12:00:00.000Z',
      rows: [row],
    });
    let markerCommitted = false;
    let mutationCount = 0;
    const applyOne = async () => {
      if (markerCommitted) return 'reconciled' as const;
      markerCommitted = true;
      mutationCount += 1;
      return 'applied' as const;
    };

    await expect(executeProjectionApplyPlan({
      plan,
      existingReceipts: [],
      attemptedAt: () => '2026-08-12T12:01:00.000Z',
      applyOne,
      writeReceipt: async () => { throw new Error('receipt_disk_crash'); },
    })).rejects.toThrow('receipt_disk_crash');

    const repairedReceipts: ProjectionApplyReceipt[] = [];
    const summary = await executeProjectionApplyPlan({
      plan,
      existingReceipts: [],
      attemptedAt: () => '2026-08-12T12:02:00.000Z',
      applyOne,
      writeReceipt: async (receipt) => { repairedReceipts.push(receipt); },
    });

    expect(mutationCount).toBe(1);
    expect(summary).toMatchObject({ appliedCount: 0, reconciledCount: 1, failedCount: 0 });
    expect(repairedReceipts).toEqual([
      expect.objectContaining({ status: 'applied', source: 'marker_reconciliation' }),
    ]);
  });

  it('allows a complete prior-plan marker to be superseded once by a fresh plan', async () => {
    const row1 = buildProjectionAuditRow({
      stableUid: 'stable-a',
      user,
      publicProfile: { totalXp: 9000, name: 'Old' },
      authLinkStableIds: ['stable-a'],
      deletionPending: false,
      userUpdateTime: 'u1',
      profileUpdateTime: 'p1',
    });
    const plan1 = buildProjectionPreflightPlan({
      projectId: 'project-a',
      scope: 'server-truth',
      generatedAt: '2026-08-12T12:00:00.000Z',
      rows: [row1],
    });
    const entry1 = plan1.entries[0];
    let profile: Record<string, unknown> = {
      ...entry1.patch,
      projectionRepairPlanId: plan1.planId,
      projectionRepairEntryHash: entry1.entryHash,
      projectionRepairPatchHash: entry1.patchHash,
      projectionRepairAppliedAt: 'server-time-1',
    };
    const row2 = buildProjectionAuditRow({
      stableUid: 'stable-a',
      user: {
        ...user,
        progressServerState: { totalXp: 240, weekPoints: 12, streakCount: 4 },
      },
      publicProfile: profile,
      authLinkStableIds: ['stable-a'],
      deletionPending: false,
      userUpdateTime: 'u2',
      profileUpdateTime: 'p2',
    });
    const plan2 = buildProjectionPreflightPlan({
      projectId: 'project-a',
      scope: 'server-truth',
      generatedAt: '2026-08-12T13:00:00.000Z',
      rows: [row2],
    });
    const entry2 = plan2.entries[0];
    let mutationCount = 0;
    const applyPlan2 = async () => {
      const state = projectionRepairMarkerState(profile, plan2, entry2);
      if (state === 'exact') return 'reconciled' as const;
      if (state === 'conflict') throw new Error('projection_repair_marker_conflict');
      mutationCount += 1;
      profile = {
        ...profile,
        ...entry2.patch,
        projectionRepairPlanId: plan2.planId,
        projectionRepairEntryHash: entry2.entryHash,
        projectionRepairPatchHash: entry2.patchHash,
        projectionRepairAppliedAt: 'server-time-2',
      };
      return 'applied' as const;
    };

    expect(projectionRepairMarkerState(profile, plan2, entry2)).toBe('prior_complete');
    await expect(applyPlan2()).resolves.toBe('applied');
    await expect(applyPlan2()).resolves.toBe('reconciled');
    expect(mutationCount).toBe(1);
  });

  it('fails closed for partial prior-plan and partial current-plan markers', () => {
    const row = buildProjectionAuditRow({
      stableUid: 'stable-a',
      user,
      publicProfile: { totalXp: 9000, name: 'Old' },
      authLinkStableIds: ['stable-a'],
      deletionPending: false,
      userUpdateTime: 'u1',
      profileUpdateTime: 'p1',
    });
    const plan = buildProjectionPreflightPlan({
      projectId: 'project-a',
      scope: 'server-truth',
      generatedAt: '2026-08-12T12:00:00.000Z',
      rows: [row],
    });
    const entry = plan.entries[0];

    expect(projectionRepairMarkerState({
      projectionRepairPlanId: 'prior-plan',
      projectionRepairEntryHash: 'prior-entry',
      projectionRepairPatchHash: 'prior-patch',
    }, plan, entry)).toBe('conflict');
    expect(projectionRepairMarkerState({
      projectionRepairPlanId: plan.planId,
      projectionRepairPatchHash: entry.patchHash,
      projectionRepairAppliedAt: 'server-time',
    }, plan, entry)).toBe('conflict');
  });

  it('requires an explicit preflight plan and scope before apply, without loading credentials', () => {
    const result = spawnSync(process.execPath, [
      require.resolve('tsx/cli'),
      path.join(process.cwd(), 'scripts', 'audit_public_profile_projection.ts'),
      '--apply',
      '--confirm-project=project-a',
    ], { encoding: 'utf8', timeout: 30_000 });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('apply_requires_--plan');
  });

  it('persists append-only per-attempt receipts with atomic final filenames', async () => {
    const checkpoint = path.join(
      process.cwd(),
      '.codex-tmp',
      'public-profile-projection-audit-tests',
      `${process.pid}-${Date.now()}`,
    );
    await mkdir(checkpoint, { recursive: true });
    const base: ProjectionApplyReceipt = {
      version: 1,
      planId: 'plan-a',
      stableUid: 'stable-a',
      entryHash: 'entry-a',
      patchHash: 'patch-a',
      expectedUserUpdateTime: 'u1',
      expectedProfileUpdateTime: 'p1',
      status: 'failed',
      attemptedAt: '2026-08-12T12:01:00.000Z',
      error: 'precondition_failed',
    };

    await writeProjectionReceiptAtomically(checkpoint, base);
    await writeProjectionReceiptAtomically(checkpoint, {
      ...base,
      status: 'applied',
      attemptedAt: '2026-08-12T12:02:00.000Z',
      error: undefined,
    });

    const receipts = await readProjectionReceipts(checkpoint);
    const files = await readdir(path.join(checkpoint, 'receipts'));
    expect(receipts.map((receipt) => receipt.status).sort()).toEqual(['applied', 'failed']);
    expect(files).toHaveLength(2);
    expect(files.every((file) => file.endsWith('.json') && !file.includes('.tmp-'))).toBe(true);
  });

  it('documents the mandatory Functions then app then Rules rollout order', () => {
    const doc = readFileSync(path.join(
      process.cwd(),
      'docs',
      'security',
      'public-profile-projection-rollout.md',
    ), 'utf8');
    const functions = doc.indexOf('1. Functions');
    const app = doc.indexOf('2. App adoption');
    const rules = doc.indexOf('3. Firestore Rules');

    expect(functions).toBeGreaterThanOrEqual(0);
    expect(app).toBeGreaterThan(functions);
    expect(rules).toBeGreaterThan(app);
    expect(doc).toContain('Do not deploy Rules before app adoption');
  });

  it('resolves the project from an explicit service-account credential', () => {
    expect(resolveProjectionAuditProjectId({
      configuredProjectId: '',
      serviceAccountProjectId: 'phraseman-ea0b3',
      environmentProjectId: '',
    })).toBe('phraseman-ea0b3');
  });
});
