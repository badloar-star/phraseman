import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';

type FailedCheck = {
  id: string;
  title: string;
  blocks: string[];
  sourceArtifact: string;
  detail: string;
};

type BlockerGroup = {
  id: string;
  status: 'HOLD';
  title: string;
  sourceArtifacts: string[];
  blockedWork: string[];
  blockerCount: number;
  keyMetrics: Record<string, unknown>;
  allowedWorkNow: string[];
  blockedUntil: string[];
};

type RecommendedStep = {
  order: number;
  id: string;
  mode: 'approval' | 'architecture' | 'verification' | 'apply-after-approval';
  title: string;
  canDoNow: boolean;
  requiresExactApproval: boolean;
  notes: string[];
};

type Packet = {
  schemaVersion: 'gustav-readiness-blocker-reduction-packet-v0';
  runId: string;
  generatedAt: string;
  status: 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    readinessGate: string;
    achievementTaxonomy: string;
    localCloudDecisionTable: string;
    targetKeyIntegrationPlan: string;
    surfaceRouteInventory: string;
    applyPlan: string;
    postP1ANextSliceAudit: string;
    phaseDependencyAudit: string;
    p1aApprovalRequestPacket: string;
  };
  summary: {
    readinessDecision: string;
    readinessFailedChecks: number;
    generationBlockers: number;
    applyBlockers: number;
    achievementBlockers: number;
    localCloudBlockers: number;
    targetKeyBlockers: number;
    surfaceBlockers: number;
    applyPlanBlockers: number;
    dirtyWorktreeOverlaps: number;
    p1aExactApprovalReadyToRequest: boolean;
    p1aApprovalReceiptExists: boolean;
    p1aActiveHashLockExists: boolean;
    p1bCanStartNow: boolean;
    canStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    canContinueArchitectureWork: boolean;
    nextRecommendedMode: string;
  };
  failedReadinessChecks: FailedCheck[];
  blockerGroups: BlockerGroup[];
  recommendedOrder: RecommendedStep[];
  exactP1AApprovalTextRequired: string;
  acceptedP1AReceiptPath: string;
  activeP1AHashLockPath: string;
  forbiddenActions: string[];
  safeWorkNow: string[];
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

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function n(summary: Record<string, unknown>, key: string): number {
  return typeof summary[key] === 'number' ? summary[key] as number : 0;
}

function b(summary: Record<string, unknown>, key: string): boolean {
  return summary[key] === true;
}

function s(summary: Record<string, unknown>, key: string): string {
  return typeof summary[key] === 'string' ? summary[key] as string : '';
}

function stringArray(value: unknown): string[] {
  return arr<unknown>(value).filter((entry): entry is string => typeof entry === 'string');
}

function renderMarkdown(packet: Packet): string {
  const lines = [
    '# GUSTAV Readiness Blocker Reduction Packet',
    '',
    `Run: \`${packet.runId}\``,
    '',
    `Status: \`${packet.status}\``,
    '',
    `Generated at: ${packet.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Readiness decision: \`${packet.summary.readinessDecision}\``,
    `- Failed readiness checks: ${packet.summary.readinessFailedChecks}`,
    `- Generation blockers: ${packet.summary.generationBlockers}`,
    `- Apply blockers: ${packet.summary.applyBlockers}`,
    `- Achievement blockers: ${packet.summary.achievementBlockers}`,
    `- Local/cloud blockers: ${packet.summary.localCloudBlockers}`,
    `- Target key blockers: ${packet.summary.targetKeyBlockers}`,
    `- Surface blockers: ${packet.summary.surfaceBlockers}`,
    `- Apply plan blockers: ${packet.summary.applyPlanBlockers}`,
    `- Dirty worktree overlaps: ${packet.summary.dirtyWorktreeOverlaps}`,
    `- P1A exact approval ready to request: ${packet.summary.p1aExactApprovalReadyToRequest ? 'yes' : 'no'}`,
    `- P1A approval receipt exists: ${packet.summary.p1aApprovalReceiptExists ? 'yes' : 'no'}`,
    `- P1A active hash-lock exists: ${packet.summary.p1aActiveHashLockExists ? 'yes' : 'no'}`,
    `- P1B can start now: ${packet.summary.p1bCanStartNow ? 'yes' : 'no'}`,
    `- Can start French generation: ${packet.summary.canStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${packet.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Can continue architecture work: ${packet.summary.canContinueArchitectureWork ? 'yes' : 'no'}`,
    `- Next recommended mode: \`${packet.summary.nextRecommendedMode}\``,
    '',
    '## Failed Readiness Checks',
    '',
  ];

  for (const check of packet.failedReadinessChecks) {
    lines.push(`- \`${check.id}\` ${check.title}: blocks ${check.blocks.join(', ')}`);
  }

  lines.push('', '## Blocker Groups', '');
  for (const group of packet.blockerGroups) {
    lines.push(`### ${group.id}`);
    lines.push('');
    lines.push(`- Status: \`${group.status}\``);
    lines.push(`- Title: ${group.title}`);
    lines.push(`- Blocker count: ${group.blockerCount}`);
    lines.push(`- Blocked work: ${group.blockedWork.join(', ')}`);
    lines.push(`- Allowed work now: ${group.allowedWorkNow.join('; ')}`);
    lines.push(`- Blocked until: ${group.blockedUntil.join('; ')}`);
    lines.push('');
  }

  lines.push('## Recommended Order', '');
  for (const step of packet.recommendedOrder) {
    lines.push(`${step.order}. \`${step.id}\` ${step.title}`);
    lines.push(`   - Mode: \`${step.mode}\``);
    lines.push(`   - Can do now: ${step.canDoNow ? 'yes' : 'no'}`);
    lines.push(`   - Requires exact approval: ${step.requiresExactApproval ? 'yes' : 'no'}`);
    for (const note of step.notes) lines.push(`   - ${note}`);
  }

  lines.push(
    '',
    '## Exact P1A Approval Text Required',
    '',
    '```text',
    packet.exactP1AApprovalTextRequired,
    '```',
    '',
    '## Forbidden Actions',
    '',
    ...packet.forbiddenActions.map((action) => `- ${action}`),
    '',
    '## Safe Work Now',
    '',
    ...packet.safeWorkNow.map((action) => `- ${action}`),
    '',
    '## Notes',
    '',
    ...packet.notes.map((note) => `- ${note}`),
    '',
  );

  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_readiness_blocker_reduction_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditDir = path.join(runDir, 'audits');
  const readinessPath = path.join(auditDir, 'gustav_readiness_gate.json');
  const achievementPath = path.join(auditDir, 'achievement_taxonomy.json');
  const localCloudPath = path.join(auditDir, 'local_cloud_decision_table.json');
  const targetKeysPath = path.join(auditDir, 'target_key_integration_plan.json');
  const surfacesPath = path.join(auditDir, 'surface_route_inventory.json');
  const applyPlanPath = path.join(runDir, 'apply_plan', 'file_changes.json');
  const postP1APath = path.join(auditDir, 'post_p1a_next_slice_audit.json');
  const phaseDependencyPath = path.join(auditDir, 'phase_dependency_audit.json');
  const p1aApprovalRequestPath = path.join(auditDir, 'p1a_approval_request_packet.json');

  const readiness = readJson<Record<string, unknown>>(readinessPath);
  const achievements = readJson<Record<string, unknown>>(achievementPath);
  const localCloud = readJson<Record<string, unknown>>(localCloudPath);
  const targetKeys = readJson<Record<string, unknown>>(targetKeysPath);
  const surfaces = readJson<Record<string, unknown>>(surfacesPath);
  const applyPlan = readJson<Record<string, unknown>>(applyPlanPath);
  const postP1A = readJson<Record<string, unknown>>(postP1APath);
  const phaseDependency = readJson<Record<string, unknown>>(phaseDependencyPath);
  const p1aApprovalRequest = readJson<Record<string, unknown>>(p1aApprovalRequestPath);

  const readinessSummary = object(readiness.summary);
  const readinessState = object(readiness.readiness);
  const achievementSummary = object(achievements.summary);
  const localCloudSummary = object(localCloud.summary);
  const targetKeysSummary = object(targetKeys.summary);
  const surfacesSummary = object(surfaces.summary);
  const applyPlanSummary = object(applyPlan.summary);
  const postP1ASummary = object(postP1A.summary);
  const phaseDependencySummary = object(phaseDependency.summary);
  const p1aSummary = object(p1aApprovalRequest.summary);

  const failedReadinessChecks: FailedCheck[] = arr<Record<string, unknown>>(readiness.checks)
    .filter((check) => check.status === 'FAIL')
    .map((check) => ({
      id: String(check.id || ''),
      title: String(check.title || ''),
      blocks: stringArray(check.blocks),
      sourceArtifact: String(check.sourceArtifact || ''),
      detail: String(check.detail || ''),
    }));

  const exactP1AApprovalTextRequired = String(p1aApprovalRequest.exactApprovalTextRequired || '');
  const acceptedP1AReceiptPath = String(p1aApprovalRequest.acceptedReceiptPath || '');
  const activeP1AHashLockPath = String(p1aApprovalRequest.activeHashLockPath || '');

  const blockerGroups: BlockerGroup[] = [
    {
      id: 'P1A_APPROVAL_GATE',
      status: 'HOLD',
      title: 'P1A amended contract approval and active hash-lock are absent.',
      sourceArtifacts: [artifactPath(repoRoot, p1aApprovalRequestPath)],
      blockedWork: ['P1B', 'production apply', 'French generation'],
      blockerCount: b(p1aSummary, 'approvalReceiptExists') && b(p1aSummary, 'activeHashLockExists') ? 0 : 2,
      keyMetrics: {
        readyToAskUserForExactApproval: b(p1aSummary, 'readyToAskUserForExactApproval'),
        approvalReceiptExists: b(p1aSummary, 'approvalReceiptExists'),
        activeHashLockExists: b(p1aSummary, 'activeHashLockExists'),
      },
      allowedWorkNow: ['Ask for the exact P1A amendment approval text', 'Continue architecture-only audits'],
      blockedUntil: ['Exact approval receipt exists', 'P1A active amended baseline hash-lock exists'],
    },
    {
      id: 'P1B_DEV_TARGET_ISOLATION',
      status: 'HOLD',
      title: 'Next implementation slice is identified but locked behind P1A completion.',
      sourceArtifacts: [artifactPath(repoRoot, postP1APath)],
      blockedWork: ['P1B file writes'],
      blockerCount: b(postP1ASummary, 'canStartNextSliceNow') ? 0 : 1,
      keyMetrics: {
        nextSliceId: s(postP1ASummary, 'nextSliceId'),
        files: n(postP1ASummary, 'nextSliceFiles'),
        dirtyOverlaps: n(postP1ASummary, 'dirtyOverlaps'),
        requiresFreshReadForDirtyOverlaps: b(postP1ASummary, 'requiresFreshReadForDirtyOverlaps'),
      },
      allowedWorkNow: ['Review-only packet work', 'Fresh-read contract design'],
      blockedUntil: ['P1A completion', 'Exact P1B approval receipt', 'Fresh read for dirty overlap'],
    },
    {
      id: 'ACHIEVEMENTS_TARGET_SPLIT',
      status: 'HOLD',
      title: 'Mixed achievements need global/target separation.',
      sourceArtifacts: [artifactPath(repoRoot, achievementPath)],
      blockedWork: ['generation', 'apply'],
      blockerCount: n(achievementSummary, 'blockers'),
      keyMetrics: {
        total: n(achievementSummary, 'total'),
        studyTarget: n(achievementSummary, 'studyTarget'),
        mixed: n(achievementSummary, 'mixed'),
      },
      allowedWorkNow: ['Design target/global achievement split', 'Prepare test expectations'],
      blockedUntil: ['Mixed achievements are classified and covered'],
    },
    {
      id: 'LOCAL_CLOUD_TARGET_DECISIONS',
      status: 'HOLD',
      title: 'Local-only and cloud-synced target key decisions are incomplete.',
      sourceArtifacts: [artifactPath(repoRoot, localCloudPath)],
      blockedWork: ['generation', 'apply'],
      blockerCount: n(localCloudSummary, 'blockers'),
      keyMetrics: {
        entries: n(localCloudSummary, 'entries'),
        syncUnderTarget: n(localCloudSummary, 'syncUnderTarget'),
        keepLocalTargetScoped: n(localCloudSummary, 'keepLocalTargetScoped'),
        highRisks: n(localCloudSummary, 'highRisks'),
      },
      allowedWorkNow: ['Resolve decision table entries', 'Narrow high-risk cloud sync cases'],
      blockedUntil: ['Decision table has zero blockers'],
    },
    {
      id: 'TARGET_KEY_ARCHITECTURE',
      status: 'HOLD',
      title: 'Production target key architecture still has raw target-sensitive storage.',
      sourceArtifacts: [artifactPath(repoRoot, targetKeysPath)],
      blockedWork: ['generation', 'apply'],
      blockerCount: n(targetKeysSummary, 'blockers'),
      keyMetrics: {
        domains: n(targetKeysSummary, 'domains'),
        blockerDomains: n(targetKeysSummary, 'blockerDomains'),
        rawTargetStorageRecords: n(targetKeysSummary, 'rawTargetStorageRecords'),
        files: n(targetKeysSummary, 'files'),
      },
      allowedWorkNow: ['Prepare adapter contracts', 'Map target key domains to narrow slices'],
      blockedUntil: ['Target key plan has zero blocker domains'],
    },
    {
      id: 'SURFACE_TARGET_SAFETY',
      status: 'HOLD',
      title: 'User-facing target-sensitive surfaces are not yet target-safe.',
      sourceArtifacts: [artifactPath(repoRoot, surfacesPath)],
      blockedWork: ['generation', 'apply'],
      blockerCount: n(surfacesSummary, 'blockers'),
      keyMetrics: {
        surfaces: n(surfacesSummary, 'surfaces'),
        targetSensitiveSurfaces: n(surfacesSummary, 'targetSensitiveSurfaces'),
        userFacingTargetSurfaces: n(surfacesSummary, 'userFacingTargetSurfaces'),
        blockerSurfaces: n(surfacesSummary, 'blockerSurfaces'),
      },
      allowedWorkNow: ['Inventory surface ownership', 'Prepare route-safe target surface slices'],
      blockedUntil: ['Target-sensitive surfaces are migrated or explicitly scoped'],
    },
    {
      id: 'GENERATION_AND_APPLY_LOCKS',
      status: 'HOLD',
      title: 'French generation and production apply remain locked.',
      sourceArtifacts: [artifactPath(repoRoot, readinessPath), artifactPath(repoRoot, applyPlanPath)],
      blockedWork: ['French generation', 'production apply', 'broad apply plan execution'],
      blockerCount: n(readinessSummary, 'failed'),
      keyMetrics: {
        readinessDecision: String(readiness.decision || ''),
        generationBlockers: n(readinessSummary, 'generationBlockers'),
        applyBlockers: n(readinessSummary, 'applyBlockers'),
        applyPlanStatus: String(applyPlan.status || ''),
        approvalStatus: String(applyPlan.approvalStatus || ''),
        dirtyWorktreeOverlaps: n(applyPlanSummary, 'dirtyWorktreeOverlaps'),
        phases: n(phaseDependencySummary, 'phases'),
        nextExecutablePhase: s(phaseDependencySummary, 'nextExecutablePhase'),
      },
      allowedWorkNow: ['Architecture audits', 'Narrow apply packets', 'Verification report generation'],
      blockedUntil: ['Readiness decision is GO', 'Generated content audit exists after generation', 'Apply plan is explicitly approved'],
    },
  ];

  const recommendedOrder: RecommendedStep[] = [
    {
      order: 1,
      id: 'P1A_EXACT_APPROVAL',
      mode: 'approval',
      title: 'Ask for the exact P1A contract amendment approval text.',
      canDoNow: true,
      requiresExactApproval: true,
      notes: ['No receipt can be created from DALSHE or any short continuation command.'],
    },
    {
      order: 2,
      id: 'P1A_HASH_LOCK_PROMOTION',
      mode: 'verification',
      title: 'After exact approval only, validate receipt firewalls and promote active hash-lock.',
      canDoNow: false,
      requiresExactApproval: true,
      notes: ['This still must not approve P1B, production apply, or French generation.'],
    },
    {
      order: 3,
      id: 'P1B_FRESH_READ_PACKET',
      mode: 'architecture',
      title: 'Prepare the P1B fresh-read packet for app/(tabs)/settings.tsx.',
      canDoNow: true,
      requiresExactApproval: false,
      notes: ['Review-only work is allowed; file writes remain blocked.'],
    },
    {
      order: 4,
      id: 'P1B_DEV_TARGET_ISOLATION',
      mode: 'apply-after-approval',
      title: 'Implement the four-file P1B dev target isolation slice.',
      canDoNow: false,
      requiresExactApproval: true,
      notes: ['Requires completed P1A, exact P1B approval, and fresh dirty-overlap read.'],
    },
    {
      order: 5,
      id: 'READINESS_ARCHITECTURE_SLICES',
      mode: 'architecture',
      title: 'Split remaining readiness blockers into target keys, achievements, local/cloud, and surfaces.',
      canDoNow: true,
      requiresExactApproval: false,
      notes: ['Keep these as audit/planning packets until a narrow approved implementation slice exists.'],
    },
  ];

  const packet: Packet = {
    schemaVersion: 'gustav-readiness-blocker-reduction-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      readinessGate: artifactPath(repoRoot, readinessPath),
      achievementTaxonomy: artifactPath(repoRoot, achievementPath),
      localCloudDecisionTable: artifactPath(repoRoot, localCloudPath),
      targetKeyIntegrationPlan: artifactPath(repoRoot, targetKeysPath),
      surfaceRouteInventory: artifactPath(repoRoot, surfacesPath),
      applyPlan: artifactPath(repoRoot, applyPlanPath),
      postP1ANextSliceAudit: artifactPath(repoRoot, postP1APath),
      phaseDependencyAudit: artifactPath(repoRoot, phaseDependencyPath),
      p1aApprovalRequestPacket: artifactPath(repoRoot, p1aApprovalRequestPath),
    },
    summary: {
      readinessDecision: String(readiness.decision || ''),
      readinessFailedChecks: n(readinessSummary, 'failed'),
      generationBlockers: n(readinessSummary, 'generationBlockers'),
      applyBlockers: n(readinessSummary, 'applyBlockers'),
      achievementBlockers: n(achievementSummary, 'blockers'),
      localCloudBlockers: n(localCloudSummary, 'blockers'),
      targetKeyBlockers: n(targetKeysSummary, 'blockers'),
      surfaceBlockers: n(surfacesSummary, 'blockers'),
      applyPlanBlockers: n(applyPlanSummary, 'blockers'),
      dirtyWorktreeOverlaps: n(applyPlanSummary, 'dirtyWorktreeOverlaps'),
      p1aExactApprovalReadyToRequest: b(p1aSummary, 'readyToAskUserForExactApproval'),
      p1aApprovalReceiptExists: b(p1aSummary, 'approvalReceiptExists'),
      p1aActiveHashLockExists: b(p1aSummary, 'activeHashLockExists'),
      p1bCanStartNow: b(postP1ASummary, 'canStartNextSliceNow'),
      canStartFrenchGeneration: b(readinessState, 'canStartFrenchGeneration'),
      mayModifyProductionAppFiles: b(applyPlan, 'mayModifyProductionAppFiles') || b(p1aSummary, 'mayModifyProductionAppFiles'),
      canContinueArchitectureWork: b(readinessState, 'canContinueArchitectureWork'),
      nextRecommendedMode: s(readinessState, 'nextRecommendedMode') || 'architecture',
    },
    failedReadinessChecks,
    blockerGroups,
    recommendedOrder,
    exactP1AApprovalTextRequired,
    acceptedP1AReceiptPath,
    activeP1AHashLockPath,
    forbiddenActions: [
      'Do not treat DALSHE, prodolzhai, davai, ok, approve, or approved as approval.',
      'Do not create p1a_contract_amendment_approval_receipt.json without exact approval text.',
      'Do not create p1a_active_amended_baseline_hash_lock.json without a validated real receipt.',
      'Do not start P1B or edit P1B files now.',
      'Do not execute broad apply_plan/file_changes.json.',
      'Do not modify production app files.',
      'Do not start French generation.',
    ],
    safeWorkNow: [
      'Generate audit/report artifacts under docs/gustav/runs/<run>/audits.',
      'Prepare review-only P1B fresh-read and dirty-overlap contracts.',
      'Prepare architecture-only target-key, achievement, local/cloud, and surface blocker packets.',
      'Run validators and readiness gates.',
    ],
    notes: [
      'This packet reduces ambiguity; it does not unlock any writes.',
      'The validator can pass while readiness remains HOLD.',
      'P1A amendment approval, P1B approval, production apply approval, and French generation approval are separate gates.',
    ],
  };

  const outJson = path.join(auditDir, 'readiness_blocker_reduction_packet.json');
  const outMd = path.join(auditDir, 'readiness_blocker_reduction_packet.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(packet));

  console.log(`GUSTAV readiness blocker reduction packet: ${packet.status}`);
  console.log(`Readiness failed checks: ${packet.summary.readinessFailedChecks}`);
  console.log(`Generation blockers: ${packet.summary.generationBlockers}`);
  console.log(`Apply blockers: ${packet.summary.applyBlockers}`);
  console.log(`Can continue architecture work: ${packet.summary.canContinueArchitectureWork ? 'yes' : 'no'}`);
  console.log(`Can start French generation: ${packet.summary.canStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${packet.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
