import { createHash } from 'node:crypto';

import {
  isCompleteTournamentV11TargetBundleForPublication,
  isCompleteTournamentV11TargetBundleRoot,
  tournamentV11TargetBundleRootPath,
} from './tournament_pool_v11_bundle';
import { createOnlyPublicationPlanSha256 } from './tournament_bundle_publication';
import {
  TOURNAMENT_POOL_V11_VERSION,
  TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS,
  tournamentV11TargetTaskId,
} from './tournament_pool_v11_factory';

function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined).sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
}

function sha256(value: unknown): string {
  return createHash('sha256').update(canonical(value), 'utf8').digest('hex');
}

function completeRoot() {
  const hashes = {
    exposureLayoutHash: '3'.repeat(64), manifestSha256: '4'.repeat(64),
    bundleSha256: '5'.repeat(64), receiptLedgerSha256: '6'.repeat(64),
  };
  const auditBody = {
    kind: 'tournament_pool_v11_target_runtime_audit_v2' as const,
    publicationSchema: 'tournament-pool-v11-target-v2' as const,
    studyTarget: 'es' as const, factPackVersion: 'es-facts-v1', factPackSha256: '7'.repeat(64),
    poolVersion: TOURNAMENT_POOL_V11_VERSION, days: 730 as const, roomSeries: 2 as const,
    roomsSimulated: 1_460 as const, tasksPerRoom: 16 as const, taskCount: 4_000 as const,
    bucketCount: 102, maxAdjacentTaskOverlap: 0 as const, maxAdjacentProvenanceOverlap: 0 as const,
    provenanceCollisions: 0 as const, fullTaskCoverage: true as const, fullBucketCoverage: true as const,
    speedBoardsChecked: 1, speedBoardsWithSixProvenance: 1,
    taskIdsSha256: '8'.repeat(64), bucketIdsSha256: '9'.repeat(64), ...hashes,
  };
  const approvalBinding = {
    studyTarget: 'es' as const,
    bundleSha256: hashes.bundleSha256,
    manifestSha256: hashes.manifestSha256,
    factPackVersion: 'es-facts-v1',
    factPackSha256: '7'.repeat(64),
    taskIdsSha256: '8'.repeat(64),
    taskCount: 4_000 as const,
  };
  const roles = [
    'pedagogy', 'nonsense', 'distractors', 'target_isolation',
    'target_linguist', 'native_fact_approval', 'owner_approval',
  ] as const;
  const receipts = roles.map((role, index) => {
    const body = {
      schemaVersion: 'arena-target-publication-approval-receipt-v1' as const,
      role,
      verdict: 'PASS' as const,
      receiptId: `receipt_${role}_${index}`,
      reviewerId: `reviewer_${role}_${index}`,
      reviewRunId: `review_run_${role}_${index}`,
      issuedAt: '2026-09-20T00:00:00.000Z',
      reviewerContextSha256: `${index + 1}`.repeat(64).slice(0, 64),
      evidenceSha256: `${index + 2}`.repeat(64).slice(0, 64),
      checksSha256: `${index + 3}`.repeat(64).slice(0, 64),
      independence: { authorRunIdDifferent: true as const, freshContext: true as const, selfIssued: false as const },
      ...approvalBinding,
    };
    return { ...body, receiptSha256: sha256(body) };
  });
  const receiptLedgerSha256 = sha256([...receipts]
    .sort((left, right) => left.role.localeCompare(right.role))
    .map(({ role, receiptSha256 }) => ({ role, receiptSha256 })));
  const approvalBody = {
    schemaVersion: 'arena-target-publication-approvals-v1' as const,
    ...approvalBinding,
    receipts,
    receiptLedgerSha256,
  };
  return {
    kind: 'tournament_pool_v11_target_bundle_v2' as const,
    publicationSchema: 'tournament-pool-v11-target-v2' as const,
    factPack: { version: 'es-facts-v1', sha256: '7'.repeat(64) },
    poolVersion: TOURNAMENT_POOL_V11_VERSION,
    jobId: `tsj_${'1'.repeat(64)}`, queueSha256: '2'.repeat(64),
    reviewContractVersion: 'review-v1', promptSetSha256: 'a'.repeat(64),
    primaryModel: 'primary', adversarialModel: 'adversarial', studyTarget: 'es' as const,
    publicationPlanSha256: 'b'.repeat(64), publicationEntriesSha256: 'c'.repeat(64),
    taskCount: 4_000 as const, exposureBucketCounts: TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS,
    ...hashes,
    merkleRootSha256: 'f'.repeat(64),
    approvals: { ...approvalBody, approvalsSha256: sha256(approvalBody) },
    runtimeAudit: { ...auditBody, auditSha256: sha256(auditBody) },
  };
}

function completeCheckpoint(root: ReturnType<typeof completeRoot>) {
  const rootPath = tournamentV11TargetBundleRootPath(root.studyTarget, root.bundleSha256);
  const binding = {
    publicationSchema: root.publicationSchema,
    studyTarget: root.studyTarget,
    factPackVersion: root.factPack.version,
    factPackSha256: root.factPack.sha256,
    jobId: root.jobId,
    queueSha256: root.queueSha256,
    reviewContractVersion: root.reviewContractVersion,
    promptSetSha256: root.promptSetSha256,
    primaryModel: root.primaryModel,
    adversarialModel: root.adversarialModel,
    exposureLayoutHash: root.exposureLayoutHash,
    manifestSha256: root.manifestSha256,
    bundleSha256: root.bundleSha256,
    receiptLedgerSha256: root.receiptLedgerSha256,
    runtimeAuditSha256: root.runtimeAudit.auditSha256,
    publicationPlanSha256: root.publicationPlanSha256,
    publicationEntriesSha256: root.publicationEntriesSha256,
  };
  const publicationId = `tv11_target_${root.studyTarget}_${root.publicationPlanSha256}`;
  return {
    kind: 'create_only_publication_checkpoint_v1',
    publicationId,
    planSha256: createOnlyPublicationPlanSha256({
      publicationId,
      checkpointPath: `${rootPath}/internal/publication_checkpoint`,
      entriesSha256: root.publicationEntriesSha256,
      root: { path: rootPath, value: root },
      binding,
    }),
    binding,
    revision: 12,
    phase: 'ready',
    writeCursor: 4_000,
    verifyCursor: 4_000,
  };
}

describe('target-scoped v11 publication identity', () => {
  it('uses disjoint target task and bundle identities', () => {
    const content = 'd'.repeat(64);
    const facts = 'e'.repeat(64);
    expect(tournamentV11TargetTaskId('es', TOURNAMENT_POOL_V11_VERSION, content, facts))
      .not.toBe(tournamentV11TargetTaskId('fr', TOURNAMENT_POOL_V11_VERSION, content, facts));
    expect(tournamentV11TargetBundleRootPath('es', content))
      .toBe(`tournament_pool_v11_target_bundles/es/${TOURNAMENT_POOL_V11_VERSION}/${content}`);
  });

  it('requires exact root and runtime-audit shapes including auditSha256', () => {
    const root = completeRoot();
    expect(isCompleteTournamentV11TargetBundleRoot(root)).toBe(true);
    const { auditSha256: _removed, ...missingHash } = root.runtimeAudit;
    expect(isCompleteTournamentV11TargetBundleRoot({ ...root, runtimeAudit: missingHash })).toBe(false);
    expect(isCompleteTournamentV11TargetBundleRoot({ ...root, extra: true })).toBe(false);
    expect(isCompleteTournamentV11TargetBundleRoot({
      ...root,
      runtimeAudit: { ...root.runtimeAudit, speedBoardsWithSixProvenance: 0 },
    })).toBe(false);
  });

  it('requires the exact source checkpoint to have completed all 4,000 writes and readbacks', () => {
    const root = completeRoot();
    const checkpoint = completeCheckpoint(root);
    expect(isCompleteTournamentV11TargetBundleForPublication(root, checkpoint)).toBe(true);
    expect(isCompleteTournamentV11TargetBundleForPublication(root, {
      ...checkpoint, phase: 'verifying', verifyCursor: 3_999,
    })).toBe(false);
    expect(isCompleteTournamentV11TargetBundleForPublication(root, {
      ...checkpoint, planSha256: '0'.repeat(64),
    })).toBe(false);
  });

  it('fails closed unless every target, native, owner and four quality approvals are exact PASS receipts', () => {
    const root = completeRoot();
    expect(isCompleteTournamentV11TargetBundleRoot({ ...root, approvals: undefined })).toBe(false);
    expect(isCompleteTournamentV11TargetBundleRoot({
      ...root,
      approvals: {
        ...root.approvals,
        receipts: root.approvals.receipts.filter((receipt) => receipt.role !== 'owner_approval'),
      },
    })).toBe(false);
    expect(isCompleteTournamentV11TargetBundleRoot({
      ...root,
      approvals: {
        ...root.approvals,
        receipts: root.approvals.receipts.map((receipt) => receipt.role === 'nonsense'
          ? { ...receipt, verdict: 'BLOCK' as const }
          : receipt),
      },
    })).toBe(false);
  });
});
