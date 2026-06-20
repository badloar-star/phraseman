import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';

type SourceArtifact = {
  path: string;
  status: string;
  summary: Record<string, unknown>;
};

type HoldReason = {
  id: string;
  sourceArtifact: string;
  detail: string;
};

type Packet = {
  schemaVersion: 'gustav-p1b-fresh-read-review-packet-v0';
  runId: string;
  generatedAt: string;
  status: 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: Record<string, SourceArtifact>;
  summary: {
    reviewPacketReady: boolean;
    p1aFilesPresent: number;
    p1aDriftedFiles: number;
    p1aApprovalReceiptExists: boolean;
    p1aActiveHashLockExists: boolean;
    p1aCanStartP1BNow: boolean;
    p1bPreflightPassed: boolean;
    p1bDirtyOverlapFiles: number;
    p1bDirtyOverlapFile: string;
    p1bFreshReadReceiptPresent: boolean;
    p1bApprovalReceiptPresent: boolean;
    p1bSnapshotHashDriftDetected: boolean;
    p1bSnapshotRefreshRequiredBeforeP1B: boolean;
    stalePreP1AAssumptionDetected: boolean;
    oldSnapshotMayAuthorizeP1B: boolean;
    requiresExactP1BApproval: boolean;
    requiresFreshReadAfterApproval: boolean;
    canStartP1BNow: boolean;
    canApplyNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    holdReasons: number;
  };
  dirtyOverlapPolicy: {
    filePath: 'app/(tabs)/settings.tsx';
    currentAllowedAction: 'review_only';
    mustNotDoNow: string[];
    futureRequiredEvidence: string[];
  };
  holdReasons: HoldReason[];
  safeWorkNow: string[];
  blockedActions: string[];
  recommendedNextOrder: string[];
  notes: string[];
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function n(summary: Record<string, unknown>, key: string): number {
  return typeof summary[key] === 'number' ? summary[key] as number : 0;
}

function b(summary: Record<string, unknown>, key: string): boolean {
  return summary[key] === true;
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function loadArtifact(repoRoot: string, filePath: string): SourceArtifact {
  const raw = readJson<Record<string, unknown>>(filePath);
  return {
    path: artifactPath(repoRoot, filePath),
    status: String(raw.status || raw.decision || ''),
    summary: object(raw.summary),
  };
}

function renderMarkdown(packet: Packet): string {
  const lines = [
    '# GUSTAV P1B Fresh-Read Review Packet',
    '',
    `Run: \`${packet.runId}\``,
    '',
    `Status: \`${packet.status}\``,
    '',
    `Generated at: ${packet.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Review packet ready: ${packet.summary.reviewPacketReady ? 'yes' : 'no'}`,
    `- P1A files present: ${packet.summary.p1aFilesPresent}`,
    `- P1A drifted files: ${packet.summary.p1aDriftedFiles}`,
    `- P1A approval receipt exists: ${packet.summary.p1aApprovalReceiptExists ? 'yes' : 'no'}`,
    `- P1A active hash-lock exists: ${packet.summary.p1aActiveHashLockExists ? 'yes' : 'no'}`,
    `- P1A can start P1B now: ${packet.summary.p1aCanStartP1BNow ? 'yes' : 'no'}`,
    `- P1B preflight passed: ${packet.summary.p1bPreflightPassed ? 'yes' : 'no'}`,
    `- P1B dirty overlap files: ${packet.summary.p1bDirtyOverlapFiles}`,
    `- P1B dirty overlap file: \`${packet.summary.p1bDirtyOverlapFile}\``,
    `- P1B fresh-read receipt present: ${packet.summary.p1bFreshReadReceiptPresent ? 'yes' : 'no'}`,
    `- P1B approval receipt present: ${packet.summary.p1bApprovalReceiptPresent ? 'yes' : 'no'}`,
    `- P1B snapshot hash drift detected: ${packet.summary.p1bSnapshotHashDriftDetected ? 'yes' : 'no'}`,
    `- P1B snapshot refresh required before P1B: ${packet.summary.p1bSnapshotRefreshRequiredBeforeP1B ? 'yes' : 'no'}`,
    `- Stale pre-P1A assumption detected: ${packet.summary.stalePreP1AAssumptionDetected ? 'yes' : 'no'}`,
    `- Old snapshot may authorize P1B: ${packet.summary.oldSnapshotMayAuthorizeP1B ? 'yes' : 'no'}`,
    `- Requires exact P1B approval: ${packet.summary.requiresExactP1BApproval ? 'yes' : 'no'}`,
    `- Requires fresh read after approval: ${packet.summary.requiresFreshReadAfterApproval ? 'yes' : 'no'}`,
    `- Can start P1B now: ${packet.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- Can apply now: ${packet.summary.canApplyNow ? 'yes' : 'no'}`,
    `- May start French generation: ${packet.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${packet.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Hold reasons: ${packet.summary.holdReasons}`,
    '',
    '## Hold Reasons',
    '',
  ];

  for (const reason of packet.holdReasons) {
    lines.push(`- \`${reason.id}\`: ${reason.detail}`);
    lines.push(`  - source: \`${reason.sourceArtifact}\``);
  }

  lines.push('', '## Dirty Overlap Policy', '');
  lines.push(`- File: \`${packet.dirtyOverlapPolicy.filePath}\``);
  lines.push(`- Current allowed action: \`${packet.dirtyOverlapPolicy.currentAllowedAction}\``);
  lines.push('- Must not do now:');
  for (const item of packet.dirtyOverlapPolicy.mustNotDoNow) lines.push(`  - ${item}`);
  lines.push('- Future required evidence:');
  for (const item of packet.dirtyOverlapPolicy.futureRequiredEvidence) lines.push(`  - ${item}`);

  lines.push('', '## Safe Work Now', '');
  for (const item of packet.safeWorkNow) lines.push(`- ${item}`);
  lines.push('', '## Blocked Actions', '');
  for (const item of packet.blockedActions) lines.push(`- ${item}`);
  lines.push('', '## Recommended Next Order', '');
  packet.recommendedNextOrder.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
  lines.push('', '## Notes', '');
  for (const note of packet.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_p1b_fresh_read_review_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditDir = path.join(runDir, 'audits');
  const artifactFiles = {
    p1aCurrentApplyState: path.join(auditDir, 'p1a_current_apply_state_audit.json'),
    p1aCurrentImplContract: path.join(auditDir, 'p1a_current_impl_contract_audit.json'),
    p1aAmendedBaselineCandidate: path.join(auditDir, 'p1a_amended_baseline_candidate.json'),
    p1aApprovalRequestPacket: path.join(auditDir, 'p1a_approval_request_packet.json'),
    postP1ANextSliceAudit: path.join(auditDir, 'post_p1a_next_slice_audit.json'),
    p1bPreflightAudit: path.join(auditDir, 'p1b_preflight_audit.json'),
    p1bDirtyOverlapSnapshotAudit: path.join(auditDir, 'p1b_dirty_overlap_snapshot_audit.json'),
    p1bFreshReadReceiptContractAudit: path.join(auditDir, 'p1b_fresh_read_receipt_contract_audit.json'),
    p1bDirtyOverlapDriftResponseAudit: path.join(auditDir, 'p1b_dirty_overlap_drift_response_audit.json'),
    p1bSnapshotRefreshContractAudit: path.join(auditDir, 'p1b_dirty_overlap_snapshot_refresh_contract_audit.json'),
    p1bApprovalReceiptContractAudit: path.join(auditDir, 'p1b_approval_receipt_contract_audit.json'),
    p1bUnlockPrerequisiteMatrixAudit: path.join(auditDir, 'p1b_unlock_prerequisite_matrix_audit.json'),
    readinessBlockerReductionPacket: path.join(auditDir, 'readiness_blocker_reduction_packet.json'),
  };

  const sourceArtifacts = Object.fromEntries(
    Object.entries(artifactFiles).map(([key, filePath]) => [key, loadArtifact(repoRoot, filePath)]),
  ) as Record<string, SourceArtifact>;

  const p1aApply = sourceArtifacts.p1aCurrentApplyState.summary;
  const p1aRequest = sourceArtifacts.p1aApprovalRequestPacket.summary;
  const p1bPreflight = sourceArtifacts.p1bPreflightAudit.summary;
  const p1bSnapshot = sourceArtifacts.p1bDirtyOverlapSnapshotAudit.summary;
  const p1bFreshRead = sourceArtifacts.p1bFreshReadReceiptContractAudit.summary;
  const p1bDrift = sourceArtifacts.p1bDirtyOverlapDriftResponseAudit.summary;
  const p1bRefresh = sourceArtifacts.p1bSnapshotRefreshContractAudit.summary;
  const p1bApproval = sourceArtifacts.p1bApprovalReceiptContractAudit.summary;
  const p1bUnlock = sourceArtifacts.p1bUnlockPrerequisiteMatrixAudit.summary;

  const p1aFilesPresent = n(p1aApply, 'presentFiles');
  const p1aDriftedFiles = n(p1aApply, 'driftedFiles');
  const p1aApprovalReceiptExists = b(p1aRequest, 'approvalReceiptExists');
  const p1aActiveHashLockExists = b(p1aRequest, 'activeHashLockExists');
  const p1aCanStartP1BNow = b(p1aApply, 'canStartP1BNow') || b(p1aRequest, 'canStartP1BNow');
  const p1bApprovalReceiptPresent = b(p1bApproval, 'realReceiptPresent');
  const p1bFreshReadReceiptPresent = b(p1bFreshRead, 'freshReadReceiptPresent');
  const stalePreP1AAssumptionDetected =
    p1aFilesPresent > 0 &&
    (b(p1bPreflight, 'productionFilesStillAbsent') || b(p1bSnapshot, 'productionFilesStillAbsent') || b(p1bFreshRead, 'productionFilesStillAbsent'));

  const holdReasons: HoldReason[] = [
    {
      id: 'P1A_NOT_HASH_LOCKED',
      sourceArtifact: sourceArtifacts.p1aApprovalRequestPacket.path,
      detail: 'P1A amended approval receipt and active hash-lock are absent.',
    },
    {
      id: 'P1A_CURRENT_STATE_HOLD',
      sourceArtifact: sourceArtifacts.p1aCurrentApplyState.path,
      detail: `P1A current apply state is HOLD with ${p1aFilesPresent} present files and ${p1aDriftedFiles} drifted files.`,
    },
    {
      id: 'P1B_APPROVAL_ABSENT',
      sourceArtifact: sourceArtifacts.p1bApprovalReceiptContractAudit.path,
      detail: 'No exact P1B approval receipt is present.',
    },
    {
      id: 'P1B_FRESH_READ_ABSENT',
      sourceArtifact: sourceArtifacts.p1bFreshReadReceiptContractAudit.path,
      detail: 'No P1B fresh-read receipt is present for app/(tabs)/settings.tsx.',
    },
    {
      id: 'P1B_SNAPSHOT_REFRESH_REQUIRED',
      sourceArtifact: sourceArtifacts.p1bSnapshotRefreshContractAudit.path,
      detail: 'Snapshot hash drift is detected and a refresh is required before P1B.',
    },
  ];
  if (stalePreP1AAssumptionDetected) {
    holdReasons.push({
      id: 'STALE_PRE_P1A_ASSUMPTION',
      sourceArtifact: sourceArtifacts.p1bPreflightAudit.path,
      detail: 'Some existing P1B audits still record productionFilesStillAbsent=true, while current P1A files are present; treat them as contracts, not unlocks.',
    });
  }

  const packet: Packet = {
    schemaVersion: 'gustav-p1b-fresh-read-review-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts,
    summary: {
      reviewPacketReady: true,
      p1aFilesPresent,
      p1aDriftedFiles,
      p1aApprovalReceiptExists,
      p1aActiveHashLockExists,
      p1aCanStartP1BNow,
      p1bPreflightPassed: sourceArtifacts.p1bPreflightAudit.status === 'PASS',
      p1bDirtyOverlapFiles: n(p1bSnapshot, 'dirtyOverlapFiles'),
      p1bDirtyOverlapFile: 'app/(tabs)/settings.tsx',
      p1bFreshReadReceiptPresent,
      p1bApprovalReceiptPresent,
      p1bSnapshotHashDriftDetected: b(p1bFreshRead, 'snapshotHashDriftDetected') || b(p1bRefresh, 'snapshotHashDriftDetected'),
      p1bSnapshotRefreshRequiredBeforeP1B: b(p1bFreshRead, 'snapshotRefreshRequiredBeforeP1B') || b(p1bDrift, 'snapshotRefreshRequiredBeforeP1B'),
      stalePreP1AAssumptionDetected,
      oldSnapshotMayAuthorizeP1B: b(p1bDrift, 'oldSnapshotMayAuthorizeP1B'),
      requiresExactP1BApproval: b(p1bApproval, 'requiresExactP1BApproval') || b(p1bUnlock, 'exactReceiptRequired'),
      requiresFreshReadAfterApproval: b(p1bFreshRead, 'requiresFreshReadAfterApproval') || b(p1bDrift, 'freshReadReceiptRequiredAfterApproval'),
      canStartP1BNow: false,
      canApplyNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      holdReasons: holdReasons.length,
    },
    dirtyOverlapPolicy: {
      filePath: 'app/(tabs)/settings.tsx',
      currentAllowedAction: 'review_only',
      mustNotDoNow: [
        'Do not edit app/(tabs)/settings.tsx.',
        'Do not create a P1B fresh-read receipt before exact P1B approval.',
        'Do not reuse the old dirty-overlap snapshot as fresh-read evidence.',
        'Do not treat existing P1B PASS contract audits as permission to start P1B.',
      ],
      futureRequiredEvidence: [
        'P1A amended approval receipt and active hash-lock.',
        'Exact P1B dev target isolation approval receipt.',
        'Post-approval dirty-overlap snapshot refresh when required.',
        'Post-approval fresh-read receipt for app/(tabs)/settings.tsx.',
        'Post-write proof after any future approved P1B write.',
      ],
    },
    holdReasons,
    safeWorkNow: [
      'Keep P1B work in review-only audit packets.',
      'Prepare the exact fresh-read receipt checklist without creating the receipt.',
      'After P1A hash-lock, rerun current-state audits before any P1B approval request.',
    ],
    blockedActions: [
      'P1B writes',
      'P1B fresh-read receipt creation',
      'P1B snapshot refresh receipt creation',
      'Production apply',
      'French generation',
      'Any edit to app/(tabs)/settings.tsx',
    ],
    recommendedNextOrder: [
      'Wait for exact P1A amendment approval text before creating the P1A receipt.',
      'Promote P1A active amended baseline hash-lock only after receipt firewalls pass.',
      'Rerun P1A current state, P1B preflight, dirty-overlap snapshot, and fresh-read contracts against the hash-locked P1A state.',
      'Ask for exact P1B approval only after the current-state refresh is clean.',
      'Create the P1B fresh-read evidence only after exact P1B approval and immediately before any approved P1B edit.',
    ],
    notes: [
      'This packet is a review artifact only.',
      'It intentionally keeps status HOLD because the prerequisites are absent.',
      'DALSHE does not satisfy P1A or P1B approval.',
      'French generation remains blocked.',
    ],
  };

  const outJson = path.join(auditDir, 'p1b_fresh_read_review_packet.json');
  const outMd = path.join(auditDir, 'p1b_fresh_read_review_packet.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(packet));

  console.log(`GUSTAV P1B fresh-read review packet: ${packet.status}`);
  console.log(`P1A files present: ${packet.summary.p1aFilesPresent}`);
  console.log(`P1A active hash-lock exists: ${packet.summary.p1aActiveHashLockExists ? 'yes' : 'no'}`);
  console.log(`P1B fresh-read receipt present: ${packet.summary.p1bFreshReadReceiptPresent ? 'yes' : 'no'}`);
  console.log(`Stale pre-P1A assumption detected: ${packet.summary.stalePreP1AAssumptionDetected ? 'yes' : 'no'}`);
  console.log(`Can start P1B now: ${packet.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${packet.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
