import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  filePath?: string;
};

type Projection = {
  checkId: string;
  title: string;
  currentStatus: 'PASS' | 'FAIL';
  projectedAfterP1A: 'PASS' | 'FAIL';
  blocks: string[];
  p1aCoverage: 'none' | 'primitive_only' | 'not_applicable';
  reason: string;
  requiredAfterP1A: string[];
};

type Audit = {
  schemaVersion: 'gustav-post-p1a-readiness-projection-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    readinessGate: string;
    p1aMinimalApplyPacket: string;
    p1aApplyTransactionAudit: string;
    p1aTransactionSimulationAudit: string;
    p1aApprovalReceiptFirewallAudit: string;
  };
  summary: {
    currentReadinessChecks: number;
    currentFailedChecks: number;
    currentGenerationBlockers: number;
    currentApplyBlockers: number;
    projectedFailedChecksAfterP1A: number;
    projectedGenerationBlockersAfterP1A: number;
    projectedApplyBlockersAfterP1A: number;
    checksResolvedByP1A: number;
    outOfScopeFailedChecks: number;
    p1aScopeFiles: number;
    blockers: number;
    warnings: number;
    projectionPassed: boolean;
    p1aDoesNotUnlockFrenchGeneration: boolean;
    p1aDoesNotUnlockBroadApply: boolean;
    canApplyNow: boolean;
    mayStartFrenchGenerationAfterP1A: boolean;
    mayModifyProductionAppFiles: boolean;
    productionFilesStillAbsent: boolean;
  };
  p1aScope: {
    files: string[];
    explicitlyNotCovered: string[];
  };
  projections: Projection[];
  findings: Finding[];
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

function n(value: Record<string, unknown>, key: string): number {
  return typeof value[key] === 'number' ? value[key] as number : 0;
}

function projectionFor(check: Record<string, unknown>): Projection {
  const id = String(check.id || '');
  const title = String(check.title || '');
  const blocks = arr<string>(check.blocks).filter((entry) => typeof entry === 'string');
  const requiredBeforeWork = arr<string>(check.requiredBeforeWork).filter((entry) => typeof entry === 'string');

  const base = {
    checkId: id,
    title,
    currentStatus: 'FAIL' as const,
    projectedAfterP1A: 'FAIL' as const,
    blocks,
    requiredAfterP1A: requiredBeforeWork.length > 0 ? requiredBeforeWork : ['Resolve the underlying readiness blocker after P1A.'],
  };

  if (id === 'RDY-050') {
    return {
      ...base,
      p1aCoverage: 'primitive_only',
      reason: 'P1A adds the production StudyTarget and target key primitives, but it does not migrate the 348 raw target-sensitive storage records or wire the primitives into consumers.',
    };
  }

  const reasons: Record<string, { p1aCoverage: Projection['p1aCoverage']; reason: string }> = {
    'RDY-002': {
      p1aCoverage: 'not_applicable',
      reason: 'The run verdict remains HOLD until every generation/apply blocker is cleared; P1A alone does not change the run verdict to PASS.',
    },
    'RDY-010': {
      p1aCoverage: 'none',
      reason: 'P1A does not migrate lesson, quiz, trainer, flashcard, achievement or stats storage keys; target-sensitive and unknown-scope storage records remain.',
    },
    'RDY-020': {
      p1aCoverage: 'none',
      reason: 'P1A does not change cloud restore/merge paths or move target-sensitive progress under progress/targets/{studyTarget}.',
    },
    'RDY-021': {
      p1aCoverage: 'none',
      reason: 'P1A does not split mixed cloud payload fields for achievements_state, daily_stats, user_stats_v1 or stats_daily_breakdown_v1.',
    },
    'RDY-030': {
      p1aCoverage: 'none',
      reason: 'P1A does not migrate achievement state or resolve mixed/global/target achievement policy decisions.',
    },
    'RDY-040': {
      p1aCoverage: 'none',
      reason: 'P1A does not implement local/cloud sync decisions for the target-sensitive local keys missing from cloud mapping.',
    },
    'RDY-060': {
      p1aCoverage: 'none',
      reason: 'P1A does not modify user-facing routes, lesson runtimes, trainer, flashcards, achievements, progress or My Practice surfaces.',
    },
    'RDY-080': {
      p1aCoverage: 'not_applicable',
      reason: 'P1A is an architecture primitive slice only; it does not generate or audit French content.',
    },
    'RDY-090': {
      p1aCoverage: 'not_applicable',
      reason: 'P1A exact approval would authorize only the four-file minimal packet, not the broad 83-file apply plan.',
    },
  };

  const mapped = reasons[id] || {
    p1aCoverage: 'none' as const,
    reason: 'This readiness blocker is outside the four-file P1A scope.',
  };

  return {
    ...base,
    p1aCoverage: mapped.p1aCoverage,
    reason: mapped.reason,
  };
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV Post-P1A Readiness Projection Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Current readiness checks: ${audit.summary.currentReadinessChecks}`,
    `- Current failed checks: ${audit.summary.currentFailedChecks}`,
    `- Current generation blockers: ${audit.summary.currentGenerationBlockers}`,
    `- Current apply blockers: ${audit.summary.currentApplyBlockers}`,
    `- Projected failed checks after P1A: ${audit.summary.projectedFailedChecksAfterP1A}`,
    `- Projected generation blockers after P1A: ${audit.summary.projectedGenerationBlockersAfterP1A}`,
    `- Projected apply blockers after P1A: ${audit.summary.projectedApplyBlockersAfterP1A}`,
    `- Checks resolved by P1A: ${audit.summary.checksResolvedByP1A}`,
    `- Out-of-scope failed checks: ${audit.summary.outOfScopeFailedChecks}`,
    `- P1A scope files: ${audit.summary.p1aScopeFiles}`,
    `- Projection passed: ${audit.summary.projectionPassed ? 'yes' : 'no'}`,
    `- P1A does not unlock French generation: ${audit.summary.p1aDoesNotUnlockFrenchGeneration ? 'yes' : 'no'}`,
    `- P1A does not unlock broad apply: ${audit.summary.p1aDoesNotUnlockBroadApply ? 'yes' : 'no'}`,
    `- Can apply now: ${audit.summary.canApplyNow ? 'yes' : 'no'}`,
    `- May start French generation after P1A: ${audit.summary.mayStartFrenchGenerationAfterP1A ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Production files still absent: ${audit.summary.productionFilesStillAbsent ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Projected Failed Checks',
    '',
  ];

  for (const projection of audit.projections) {
    lines.push(`### ${projection.checkId}: ${projection.title}`);
    lines.push('');
    lines.push(`- Projected after P1A: \`${projection.projectedAfterP1A}\``);
    lines.push(`- P1A coverage: \`${projection.p1aCoverage}\``);
    lines.push(`- Blocks: ${projection.blocks.map((block) => `\`${block}\``).join(', ')}`);
    lines.push(`- Reason: ${projection.reason}`);
    lines.push('- Required after P1A:');
    for (const item of projection.requiredAfterP1A) lines.push(`  - ${item}`);
    lines.push('');
  }

  lines.push('## Findings', '');
  if (audit.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
      if (finding.filePath) lines.push(`  - file: \`${finding.filePath}\``);
    }
  }

  lines.push('', '## Notes', '');
  for (const note of audit.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_post_p1a_readiness_projection_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const readinessPath = path.join(runDir, 'audits', 'gustav_readiness_gate.json');
  const packetPath = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  const transactionPath = path.join(runDir, 'audits', 'p1a_apply_transaction_audit.json');
  const simulationPath = path.join(runDir, 'audits', 'p1a_transaction_simulation_audit.json');
  const firewallPath = path.join(runDir, 'audits', 'p1a_approval_receipt_firewall_audit.json');
  const readiness = readJson<Record<string, unknown>>(readinessPath);
  const packet = readJson<Record<string, unknown>>(packetPath);
  const transaction = readJson<Record<string, unknown>>(transactionPath);
  const simulation = readJson<Record<string, unknown>>(simulationPath);
  const firewall = readJson<Record<string, unknown>>(firewallPath);
  const findings: Finding[] = [];

  const readinessSummary = object(readiness.summary);
  const packetSummary = object(packet.summary);
  const transactionSummary = object(transaction.summary);
  const simulationSummary = object(simulation.summary);
  const firewallSummary = object(firewall.summary);

  if (readiness.decision !== 'HOLD') {
    findings.push({
      severity: 'blocker',
      code: 'readiness_not_hold',
      message: 'Post-P1A projection expects the current readiness gate to remain HOLD.',
      filePath: path.relative(repoRoot, readinessPath),
    });
  }
  if (packet.status !== 'PASS' || n(packetSummary, 'files') !== 4 || packetSummary.mayModifyProductionAppFiles !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_packet_not_locked',
      message: 'P1A minimal apply packet must be PASS, four files only and production writes locked.',
      filePath: path.relative(repoRoot, packetPath),
    });
  }
  if (transaction.status !== 'PASS' || transactionSummary.canApplyNow !== false || transactionSummary.dryRunOnly !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_transaction_not_locked',
      message: 'P1A apply transaction must remain dry-run locked for projection.',
      filePath: path.relative(repoRoot, transactionPath),
    });
  }
  if (simulation.status !== 'PASS' || simulationSummary.transactionSimulationPassed !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_simulation_not_passed',
      message: 'P1A transaction simulation must pass before post-P1A projection.',
      filePath: path.relative(repoRoot, simulationPath),
    });
  }
  if (firewall.status !== 'PASS' || firewallSummary.firewallPassed !== true || firewallSummary.canApplyNow !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_firewall_not_passed',
      message: 'P1A approval receipt firewall must pass and keep canApplyNow=false before post-P1A projection.',
      filePath: path.relative(repoRoot, firewallPath),
    });
  }

  const failedChecks = arr<Record<string, unknown>>(readiness.checks).filter((check) => check.status === 'FAIL');
  const projections = failedChecks.map(projectionFor);
  const projectedFailedChecksAfterP1A = projections.filter((projection) => projection.projectedAfterP1A === 'FAIL').length;
  const projectedGenerationBlockersAfterP1A = projections.filter((projection) =>
    projection.projectedAfterP1A === 'FAIL' && projection.blocks.includes('generation')
  ).length;
  const projectedApplyBlockersAfterP1A = projections.filter((projection) =>
    projection.projectedAfterP1A === 'FAIL' && projection.blocks.includes('apply')
  ).length;
  const checksResolvedByP1A = projections.filter((projection) => projection.projectedAfterP1A === 'PASS').length;
  const outOfScopeFailedChecks = projections.filter((projection) => projection.p1aCoverage !== 'primitive_only').length;

  const expectedFailed = n(readinessSummary, 'failed');
  if (failedChecks.length !== expectedFailed || projectedFailedChecksAfterP1A !== expectedFailed) {
    findings.push({
      severity: 'blocker',
      code: 'projection_failed_count_mismatch',
      message: 'Post-P1A projection must account for every currently failed readiness check and keep unresolved blockers explicit.',
      filePath: path.relative(repoRoot, readinessPath),
    });
  }
  if (checksResolvedByP1A !== 0 || projectedGenerationBlockersAfterP1A !== n(readinessSummary, 'generationBlockers')) {
    findings.push({
      severity: 'blocker',
      code: 'projection_unlocked_generation',
      message: 'P1A must not be projected to unlock French generation.',
      filePath: path.relative(repoRoot, readinessPath),
    });
  }
  if (!projections.some((projection) => projection.checkId === 'RDY-050' && projection.p1aCoverage === 'primitive_only')) {
    findings.push({
      severity: 'blocker',
      code: 'primitive_only_target_key_not_recorded',
      message: 'Projection must mark RDY-050 as primitive_only rather than fully resolved by P1A.',
      filePath: path.relative(repoRoot, readinessPath),
    });
  }

  const productionFilesStillAbsent = [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ].every((filePath) => !fs.existsSync(path.join(repoRoot, filePath)));
  if (!productionFilesStillAbsent) {
    findings.push({
      severity: 'blocker',
      code: 'planned_p1a_file_exists',
      message: 'A planned P1A production/test file exists before exact approval.',
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const projectionPassed =
    blockers === 0 &&
    n(readinessSummary, 'checks') >= 39 &&
    failedChecks.length === 10 &&
    projectedFailedChecksAfterP1A === 10 &&
    projectedGenerationBlockersAfterP1A === 8 &&
    projectedApplyBlockersAfterP1A === 10 &&
    checksResolvedByP1A === 0 &&
    outOfScopeFailedChecks === 9 &&
    n(packetSummary, 'files') === 4 &&
    productionFilesStillAbsent;

  const audit: Audit = {
    schemaVersion: 'gustav-post-p1a-readiness-projection-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      readinessGate: path.relative(repoRoot, readinessPath),
      p1aMinimalApplyPacket: path.relative(repoRoot, packetPath),
      p1aApplyTransactionAudit: path.relative(repoRoot, transactionPath),
      p1aTransactionSimulationAudit: path.relative(repoRoot, simulationPath),
      p1aApprovalReceiptFirewallAudit: path.relative(repoRoot, firewallPath),
    },
    summary: {
      currentReadinessChecks: n(readinessSummary, 'checks'),
      currentFailedChecks: failedChecks.length,
      currentGenerationBlockers: n(readinessSummary, 'generationBlockers'),
      currentApplyBlockers: n(readinessSummary, 'applyBlockers'),
      projectedFailedChecksAfterP1A,
      projectedGenerationBlockersAfterP1A,
      projectedApplyBlockersAfterP1A,
      checksResolvedByP1A,
      outOfScopeFailedChecks,
      p1aScopeFiles: n(packetSummary, 'files'),
      blockers,
      warnings,
      projectionPassed,
      p1aDoesNotUnlockFrenchGeneration: projectedGenerationBlockersAfterP1A > 0,
      p1aDoesNotUnlockBroadApply: projectedApplyBlockersAfterP1A > 0,
      canApplyNow: false,
      mayStartFrenchGenerationAfterP1A: false,
      mayModifyProductionAppFiles: false,
      productionFilesStillAbsent,
    },
    p1aScope: {
      files: arr<Record<string, unknown>>(packet.files).map((file) => String(file.path || '')).filter(Boolean),
      explicitlyNotCovered: [
        'target-sensitive storage migrations',
        'cloud sync target buckets',
        'mixed cloud payload field splits',
        'achievement state migration',
        'local/cloud decision implementation',
        'user-facing route and surface integration',
        'French content generation',
        'generated content audit',
        'broad 83-file apply plan approval',
      ],
    },
    projections,
    findings,
    notes: [
      'This audit is a projection only; it does not apply P1A and does not write production app/test files.',
      'P1A is useful as a first target-isolation primitive, but it is not a French generation unlock.',
      'RDY-050 is intentionally classified as primitive_only after P1A because raw target-sensitive storage consumers still need migration.',
      'French generation remains blocked after projected P1A.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'post_p1a_readiness_projection_audit.json');
  const outMd = path.join(runDir, 'audits', 'post_p1a_readiness_projection_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV post-P1A readiness projection audit: ${audit.status}`);
  console.log(`Current failed checks: ${audit.summary.currentFailedChecks}`);
  console.log(`Projected failed checks after P1A: ${audit.summary.projectedFailedChecksAfterP1A}`);
  console.log(`Projected generation blockers after P1A: ${audit.summary.projectedGenerationBlockersAfterP1A}`);
  console.log(`Projected apply blockers after P1A: ${audit.summary.projectedApplyBlockersAfterP1A}`);
  console.log(`Checks resolved by P1A: ${audit.summary.checksResolvedByP1A}`);
  console.log(`P1A does not unlock French generation: ${audit.summary.p1aDoesNotUnlockFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Can apply now: ${audit.summary.canApplyNow ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
