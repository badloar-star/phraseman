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

type SliceFile = {
  path: string;
  dirtyWorktreeOverlap: boolean;
  requiredFreshReadBeforeEdit: boolean;
  allowedAction: 'review_only_until_exact_approval';
};

type Audit = {
  schemaVersion: 'gustav-post-p1a-next-slice-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1ExecutionSliceAudit: string;
    postP1AReadinessProjectionAudit: string;
    p1aApprovalReceiptFirewallAudit: string;
    p1aMinimalApplyPacket: string;
  };
  summary: {
    nextSliceDeclared: boolean;
    nextSliceId: string;
    nextSliceFiles: number;
    dirtyOverlaps: number;
    deferredLaterPhaseAdapters: number;
    entryCriteria: number;
    exitCriteria: number;
    blockers: number;
    warnings: number;
    nextSliceConstrained: boolean;
    requiresP1ACompletion: boolean;
    requiresExactNextSliceApproval: boolean;
    requiresFreshReadForDirtyOverlaps: boolean;
    canStartNextSliceNow: boolean;
    broadApplyStillBlocked: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    productionFilesStillAbsent: boolean;
  };
  nextSlice: {
    id: string;
    title: string;
    mode: string;
    adapters: string[];
    files: SliceFile[];
    deferredLaterPhaseAdapters: string[];
    entryCriteria: string[];
    exitCriteria: string[];
    approvalPolicy: {
      requiredApprovalText: string;
      rejectedImplicitCommands: string[];
      acceptedReceiptPath: string;
    };
  };
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

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV Post-P1A Next Slice Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Next slice declared: ${audit.summary.nextSliceDeclared ? 'yes' : 'no'}`,
    `- Next slice id: \`${audit.summary.nextSliceId}\``,
    `- Next slice files: ${audit.summary.nextSliceFiles}`,
    `- Dirty overlaps: ${audit.summary.dirtyOverlaps}`,
    `- Deferred later-phase adapters: ${audit.summary.deferredLaterPhaseAdapters}`,
    `- Entry criteria: ${audit.summary.entryCriteria}`,
    `- Exit criteria: ${audit.summary.exitCriteria}`,
    `- Next slice constrained: ${audit.summary.nextSliceConstrained ? 'yes' : 'no'}`,
    `- Requires P1A completion: ${audit.summary.requiresP1ACompletion ? 'yes' : 'no'}`,
    `- Requires exact next-slice approval: ${audit.summary.requiresExactNextSliceApproval ? 'yes' : 'no'}`,
    `- Requires fresh read for dirty overlaps: ${audit.summary.requiresFreshReadForDirtyOverlaps ? 'yes' : 'no'}`,
    `- Can start next slice now: ${audit.summary.canStartNextSliceNow ? 'yes' : 'no'}`,
    `- Broad apply still blocked: ${audit.summary.broadApplyStillBlocked ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Production files still absent: ${audit.summary.productionFilesStillAbsent ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Next Slice Files',
    '',
  ];

  for (const file of audit.nextSlice.files) {
    lines.push(`- \`${file.path}\`: dirtyOverlap=${file.dirtyWorktreeOverlap ? 'yes' : 'no'}, freshRead=${file.requiredFreshReadBeforeEdit ? 'yes' : 'no'}, action=\`${file.allowedAction}\``);
  }

  lines.push('', '## Entry Criteria', '');
  for (const item of audit.nextSlice.entryCriteria) lines.push(`- ${item}`);
  lines.push('', '## Exit Criteria', '');
  for (const item of audit.nextSlice.exitCriteria) lines.push(`- ${item}`);

  lines.push('', '## Findings', '');
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
    console.error('Usage: npx tsx scripts/gustav_post_p1a_next_slice_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const p1SlicePath = path.join(runDir, 'audits', 'p1_execution_slice_audit.json');
  const projectionPath = path.join(runDir, 'audits', 'post_p1a_readiness_projection_audit.json');
  const firewallPath = path.join(runDir, 'audits', 'p1a_approval_receipt_firewall_audit.json');
  const packetPath = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  const p1Slice = readJson<Record<string, unknown>>(p1SlicePath);
  const projection = readJson<Record<string, unknown>>(projectionPath);
  const firewall = readJson<Record<string, unknown>>(firewallPath);
  const packet = readJson<Record<string, unknown>>(packetPath);
  const findings: Finding[] = [];

  const p1Summary = object(p1Slice.summary);
  const projectionSummary = object(projection.summary);
  const firewallSummary = object(firewall.summary);
  const packetSummary = object(packet.summary);
  if (p1Slice.status !== 'PASS' || p1Summary.canStartP1AfterApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1_execution_slice_not_ready',
      message: 'P1 execution slice audit must be PASS and ready after approval.',
      filePath: path.relative(repoRoot, p1SlicePath),
    });
  }
  if (projection.status !== 'PASS' || projectionSummary.p1aDoesNotUnlockFrenchGeneration !== true) {
    findings.push({
      severity: 'blocker',
      code: 'post_p1a_projection_not_ready',
      message: 'Post-P1A readiness projection must pass and keep French generation locked.',
      filePath: path.relative(repoRoot, projectionPath),
    });
  }
  if (firewall.status !== 'PASS' || firewallSummary.canApplyNow !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_firewall_not_locked',
      message: 'P1A approval receipt firewall must pass and keep canApplyNow=false.',
      filePath: path.relative(repoRoot, firewallPath),
    });
  }
  if (packet.status !== 'PASS' || n(packetSummary, 'files') !== 4 || packetSummary.mayModifyProductionAppFiles !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_packet_not_locked',
      message: 'P1A minimal apply packet must remain a locked four-file packet.',
      filePath: path.relative(repoRoot, packetPath),
    });
  }

  const slices = arr<Record<string, unknown>>(p1Slice.slices);
  const rawNextSlice = slices.find((slice) => slice.id === 'P1B_DEV_TARGET_ISOLATION');
  if (!rawNextSlice) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_slice_missing',
      message: 'P1B_DEV_TARGET_ISOLATION slice is missing from p1_execution_slice_audit.',
      filePath: path.relative(repoRoot, p1SlicePath),
    });
  }

  const requiredFiles = [
    'app/(tabs)/settings.tsx',
    'app/spanish_content_gate.ts',
    'app/study_target_lang_dev.ts',
    'components/StudyTargetContext.tsx',
  ];
  const sliceFiles = arr<string>(rawNextSlice?.files).filter((entry) => typeof entry === 'string');
  const dirtyOverlaps = arr<string>(rawNextSlice?.dirtyWorktreeOverlaps).filter((entry) => typeof entry === 'string');
  for (const requiredFile of requiredFiles) {
    if (!sliceFiles.includes(requiredFile)) {
      findings.push({
        severity: 'blocker',
        code: 'p1b_required_file_missing',
        message: `P1B next slice missing required file: ${requiredFile}`,
        filePath: path.relative(repoRoot, p1SlicePath),
      });
    }
  }
  if (dirtyOverlaps.length !== 1 || dirtyOverlaps[0] !== 'app/(tabs)/settings.tsx') {
    findings.push({
      severity: 'blocker',
      code: 'p1b_dirty_overlap_policy_mismatch',
      message: 'P1B must record exactly one dirty overlap: app/(tabs)/settings.tsx.',
      filePath: path.relative(repoRoot, p1SlicePath),
    });
  }
  const laterPhaseAdapters = arr<string>(rawNextSlice?.laterPhaseAdapters).filter((entry) => typeof entry === 'string');
  if (!laterPhaseAdapters.includes('route_surface_integration')) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_route_integration_defer_missing',
      message: 'P1B must keep route_surface_integration deferred.',
      filePath: path.relative(repoRoot, p1SlicePath),
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

  const files: SliceFile[] = sliceFiles.map((filePath) => ({
    path: filePath,
    dirtyWorktreeOverlap: dirtyOverlaps.includes(filePath),
    requiredFreshReadBeforeEdit: dirtyOverlaps.includes(filePath),
    allowedAction: 'review_only_until_exact_approval',
  }));
  const entryCriteria = arr<string>(rawNextSlice?.entryCriteria).filter((entry) => typeof entry === 'string');
  const exitCriteria = arr<string>(rawNextSlice?.exitCriteria).filter((entry) => typeof entry === 'string');
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const nextSliceConstrained =
    blockers === 0 &&
    rawNextSlice?.id === 'P1B_DEV_TARGET_ISOLATION' &&
    sliceFiles.length === 4 &&
    requiredFiles.every((filePath) => sliceFiles.includes(filePath)) &&
    dirtyOverlaps.length === 1 &&
    laterPhaseAdapters.includes('route_surface_integration') &&
    entryCriteria.length >= 2 &&
    exitCriteria.length >= 2 &&
    productionFilesStillAbsent;

  const audit: Audit = {
    schemaVersion: 'gustav-post-p1a-next-slice-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1ExecutionSliceAudit: path.relative(repoRoot, p1SlicePath),
      postP1AReadinessProjectionAudit: path.relative(repoRoot, projectionPath),
      p1aApprovalReceiptFirewallAudit: path.relative(repoRoot, firewallPath),
      p1aMinimalApplyPacket: path.relative(repoRoot, packetPath),
    },
    summary: {
      nextSliceDeclared: Boolean(rawNextSlice),
      nextSliceId: String(rawNextSlice?.id || ''),
      nextSliceFiles: sliceFiles.length,
      dirtyOverlaps: dirtyOverlaps.length,
      deferredLaterPhaseAdapters: laterPhaseAdapters.length,
      entryCriteria: entryCriteria.length,
      exitCriteria: exitCriteria.length,
      blockers,
      warnings,
      nextSliceConstrained,
      requiresP1ACompletion: true,
      requiresExactNextSliceApproval: true,
      requiresFreshReadForDirtyOverlaps: dirtyOverlaps.length > 0,
      canStartNextSliceNow: false,
      broadApplyStillBlocked: true,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      productionFilesStillAbsent,
    },
    nextSlice: {
      id: String(rawNextSlice?.id || ''),
      title: String(rawNextSlice?.title || ''),
      mode: String(rawNextSlice?.mode || ''),
      adapters: arr<string>(rawNextSlice?.adapters).filter((entry) => typeof entry === 'string'),
      files,
      deferredLaterPhaseAdapters: laterPhaseAdapters,
      entryCriteria,
      exitCriteria,
      approvalPolicy: {
        requiredApprovalText: `User approved P1B dev target isolation packet ${runId} after successful P1A completion. Approved file list: app/(tabs)/settings.tsx, app/spanish_content_gate.ts, app/study_target_lang_dev.ts, components/StudyTargetContext.tsx.`,
        rejectedImplicitCommands: ['дальше', 'давай', 'работа', 'approve', 'approved', 'go'],
        acceptedReceiptPath: path.relative(repoRoot, path.join(runDir, 'apply_plan', 'p1b_dev_target_isolation_approval_receipt.json')),
      },
    },
    findings,
    notes: [
      'This audit only constrains the next slice after future P1A; it does not apply P1A or P1B.',
      'P1B is blocked until P1A is completed and an exact P1B approval receipt exists.',
      'The dirty-overlap file app/(tabs)/settings.tsx must be re-read immediately before any future approved edit.',
      'French generation and broad apply remain blocked.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'post_p1a_next_slice_audit.json');
  const outMd = path.join(runDir, 'audits', 'post_p1a_next_slice_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV post-P1A next slice audit: ${audit.status}`);
  console.log(`Next slice: ${audit.summary.nextSliceId}`);
  console.log(`Next slice files: ${audit.summary.nextSliceFiles}`);
  console.log(`Dirty overlaps: ${audit.summary.dirtyOverlaps}`);
  console.log(`Next slice constrained: ${audit.summary.nextSliceConstrained ? 'yes' : 'no'}`);
  console.log(`Can start next slice now: ${audit.summary.canStartNextSliceNow ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
