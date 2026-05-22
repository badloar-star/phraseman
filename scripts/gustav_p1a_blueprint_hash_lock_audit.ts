import * as crypto from 'node:crypto';
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

type LockedFile = {
  targetPath: string;
  blueprintPath: string;
  role: 'planned_production_file' | 'planned_test_file';
  action: 'add';
  hashAlgorithm: 'sha256';
  sha256: string;
  bytes: number;
  lineCount: number;
  targetExistsNow: boolean;
  exactCopyRequired: boolean;
};

type Audit = {
  schemaVersion: 'gustav-p1a-blueprint-hash-lock-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1aMinimalApplyPacket: string;
    p1aImplementationBlueprintAudit: string;
    p1aApprovalLockAudit: string;
  };
  summary: {
    lockedFiles: number;
    lockedProductionFiles: number;
    lockedTestFiles: number;
    targetFilesAbsent: number;
    targetFilesPresent: number;
    hashAlgorithmCount: number;
    uniqueHashes: number;
    exactCopyRules: number;
    blockers: number;
    warnings: number;
    hashLockReadyAfterExactApproval: boolean;
    driftDetected: boolean;
    productionFilesStillAbsent: boolean;
    productionTestsStillAbsent: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  lockedFiles: LockedFile[];
  futureApplyRules: string[];
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

function arr<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Blueprint Hash Lock Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Locked files: ${audit.summary.lockedFiles}`,
    `- Locked production files: ${audit.summary.lockedProductionFiles}`,
    `- Locked test files: ${audit.summary.lockedTestFiles}`,
    `- Target files absent: ${audit.summary.targetFilesAbsent}`,
    `- Target files present: ${audit.summary.targetFilesPresent}`,
    `- Hash algorithm count: ${audit.summary.hashAlgorithmCount}`,
    `- Unique hashes: ${audit.summary.uniqueHashes}`,
    `- Exact copy rules: ${audit.summary.exactCopyRules}`,
    `- Drift detected: ${audit.summary.driftDetected ? 'yes' : 'no'}`,
    `- Production files still absent: ${audit.summary.productionFilesStillAbsent ? 'yes' : 'no'}`,
    `- Production tests still absent: ${audit.summary.productionTestsStillAbsent ? 'yes' : 'no'}`,
    `- Hash lock ready after exact approval: ${audit.summary.hashLockReadyAfterExactApproval ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Locked Files',
    '',
  ];

  for (const file of audit.lockedFiles) {
    lines.push(`### ${file.targetPath}`);
    lines.push('');
    lines.push(`- Blueprint: \`${file.blueprintPath}\``);
    lines.push(`- Role: \`${file.role}\``);
    lines.push(`- Action: \`${file.action}\``);
    lines.push(`- SHA-256: \`${file.sha256}\``);
    lines.push(`- Bytes: ${file.bytes}`);
    lines.push(`- Lines: ${file.lineCount}`);
    lines.push(`- Target exists now: ${file.targetExistsNow ? 'yes' : 'no'}`);
    lines.push(`- Exact copy required: ${file.exactCopyRequired ? 'yes' : 'no'}`);
    lines.push('');
  }

  lines.push('## Future Apply Rules', '');
  for (const rule of audit.futureApplyRules) lines.push(`- ${rule}`);

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
    console.error('Usage: npx tsx scripts/gustav_p1a_blueprint_hash_lock_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const packetPath = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  const blueprintAuditPath = path.join(runDir, 'audits', 'p1a_implementation_blueprint_audit.json');
  const approvalLockPath = path.join(runDir, 'audits', 'p1a_approval_lock_audit.json');
  const packet = readJson<Record<string, unknown>>(packetPath);
  const blueprintAudit = readJson<Record<string, unknown>>(blueprintAuditPath);
  const approvalLock = readJson<Record<string, unknown>>(approvalLockPath);
  const findings: Finding[] = [];

  const packetSummary = object(packet.summary);
  const blueprintSummary = object(blueprintAudit.summary);
  const approvalSummary = object(approvalLock.summary);
  if (packet.status !== 'PASS' || packetSummary.readyForApproval !== true || packetSummary.mayModifyProductionAppFiles !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_packet_not_ready',
      message: 'P1A minimal apply packet must be ready and still locked before blueprint hash lock.',
      filePath: path.relative(repoRoot, packetPath),
    });
  }
  if (blueprintAudit.status !== 'PASS' || blueprintSummary.blueprintReadyAfterExactApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_blueprint_not_ready',
      message: 'P1A implementation blueprint must pass before hash lock.',
      filePath: path.relative(repoRoot, blueprintAuditPath),
    });
  }
  if (approvalLock.status !== 'PASS' || approvalSummary.accidentalApplyBlocked !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_approval_lock_not_ready',
      message: 'P1A approval lock must pass before hash lock.',
      filePath: path.relative(repoRoot, approvalLockPath),
    });
  }

  const packetFiles = arr<Record<string, unknown>>(packet.files)
    .map((entry) => str(entry.path))
    .filter(Boolean);
  const blueprintFiles = arr<Record<string, unknown>>(blueprintAudit.blueprintFiles);
  const lockedFiles: LockedFile[] = [];
  for (const targetPath of packetFiles) {
    const blueprint = blueprintFiles.find((entry) => str(entry.filePath).endsWith(targetPath));
    if (!blueprint) {
      findings.push({
        severity: 'blocker',
        code: 'blueprint_file_for_target_missing',
        message: `No blueprint file found for target ${targetPath}.`,
        filePath: path.relative(repoRoot, blueprintAuditPath),
      });
      continue;
    }
    const blueprintPath = str(blueprint.filePath);
    const absoluteBlueprint = path.resolve(repoRoot, blueprintPath);
    if (!fs.existsSync(absoluteBlueprint)) {
      findings.push({
        severity: 'blocker',
        code: 'blueprint_file_missing_on_disk',
        message: `Blueprint file is missing on disk for target ${targetPath}.`,
        filePath: blueprintPath,
      });
      continue;
    }
    const buffer = fs.readFileSync(absoluteBlueprint);
    const role = str(blueprint.role) === 'planned_test_file' ? 'planned_test_file' : 'planned_production_file';
    lockedFiles.push({
      targetPath,
      blueprintPath,
      role,
      action: 'add',
      hashAlgorithm: 'sha256',
      sha256: sha256(buffer),
      bytes: buffer.length,
      lineCount: buffer.toString('utf8').split('\n').length,
      targetExistsNow: fs.existsSync(path.join(repoRoot, targetPath)),
      exactCopyRequired: true,
    });
  }

  for (const required of [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ]) {
    if (!lockedFiles.some((file) => file.targetPath === required)) {
      findings.push({
        severity: 'blocker',
        code: 'locked_file_missing',
        message: `P1A hash lock missing required file ${required}.`,
      });
    }
  }

  const targetFilesPresent = lockedFiles.filter((file) => file.targetExistsNow).length;
  if (targetFilesPresent > 0) {
    findings.push({
      severity: 'blocker',
      code: 'target_file_exists_before_approval',
      message: `${targetFilesPresent} P1A target file(s) already exist before exact approval.`,
    });
  }

  const productionFilesStillAbsent = lockedFiles
    .filter((file) => file.role === 'planned_production_file')
    .every((file) => !file.targetExistsNow);
  const productionTestsStillAbsent = lockedFiles
    .filter((file) => file.role === 'planned_test_file')
    .every((file) => !file.targetExistsNow);
  const uniqueHashes = new Set(lockedFiles.map((file) => file.sha256)).size;
  const driftDetected = targetFilesPresent > 0;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const hashLockReadyAfterExactApproval =
    blockers === 0 &&
    lockedFiles.length === 4 &&
    uniqueHashes === 4 &&
    targetFilesPresent === 0 &&
    productionFilesStillAbsent &&
    productionTestsStillAbsent &&
    lockedFiles.every((file) => file.exactCopyRequired && file.hashAlgorithm === 'sha256');

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-blueprint-hash-lock-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1aMinimalApplyPacket: path.relative(repoRoot, packetPath),
      p1aImplementationBlueprintAudit: path.relative(repoRoot, blueprintAuditPath),
      p1aApprovalLockAudit: path.relative(repoRoot, approvalLockPath),
    },
    summary: {
      lockedFiles: lockedFiles.length,
      lockedProductionFiles: lockedFiles.filter((file) => file.role === 'planned_production_file').length,
      lockedTestFiles: lockedFiles.filter((file) => file.role === 'planned_test_file').length,
      targetFilesAbsent: lockedFiles.filter((file) => !file.targetExistsNow).length,
      targetFilesPresent,
      hashAlgorithmCount: new Set(lockedFiles.map((file) => file.hashAlgorithm)).size,
      uniqueHashes,
      exactCopyRules: lockedFiles.filter((file) => file.exactCopyRequired).length,
      blockers,
      warnings,
      hashLockReadyAfterExactApproval,
      driftDetected,
      productionFilesStillAbsent,
      productionTestsStillAbsent,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    lockedFiles,
    futureApplyRules: [
      'After exact P1A approval, each target file must be copied byte-for-byte from the locked blueprint path.',
      'If any blueprint file changes, rerun P1A implementation blueprint audit, hash lock audit, readiness gate and run validator before apply.',
      'If a target file already exists before approval, stop and perform manual review instead of overwriting it.',
      'No broad 83-file apply plan is approved by this lock.',
      'French generation remains blocked after P1A hash lock; this only prepares the first target-isolation slice.',
    ],
    findings,
    notes: [
      'This audit records a hash lock only; it does not write app or test files.',
      'The locked files are the four P1A files from the minimal apply packet, not the dry-run runtime helper.',
      'The future apply must match these SHA-256 hashes or the blueprint must be regenerated and revalidated.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_blueprint_hash_lock_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1a_blueprint_hash_lock_audit.md');
  const applyMd = path.join(runDir, 'apply_plan', 'P1A_BLUEPRINT_HASH_LOCK.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(applyMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A blueprint hash lock audit: ${audit.status}`);
  console.log(`Locked files: ${audit.summary.lockedFiles}`);
  console.log(`Unique hashes: ${audit.summary.uniqueHashes}`);
  console.log(`Target files absent: ${audit.summary.targetFilesAbsent}`);
  console.log(`Drift detected: ${audit.summary.driftDetected ? 'yes' : 'no'}`);
  console.log(`Hash lock ready after exact approval: ${audit.summary.hashLockReadyAfterExactApproval ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
