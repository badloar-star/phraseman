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

type AllowedFile = {
  filePath: string;
  action: 'guarded_edit_after_receipts';
  dirtyOverlap: boolean;
  requiresFreshRead: boolean;
};

type RequiredReceipt = {
  id: string;
  filePath: string;
  present: boolean;
  requiredBefore: 'p1b_write';
};

type Audit = {
  schemaVersion: 'gustav-p1b-narrow-write-transaction-contract-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1bPreflightAudit: string;
    p1bApprovalReceiptContractAudit: string;
    p1bUnlockPrerequisiteMatrixAudit: string;
    p1bFreshReadReceiptContractAudit: string;
    p1bSnapshotRefreshContractAudit: string;
  };
  summary: {
    allowedFiles: number;
    dirtyOverlapFiles: number;
    requiredReceipts: number;
    requiredReceiptsPresent: number;
    transactionStages: number;
    forbiddenScopes: number;
    rollbackRules: number;
    verificationCommands: number;
    blockers: number;
    warnings: number;
    contractReady: boolean;
    onlyNarrowP1BAllowed: boolean;
    allRequiredReceiptsPresent: boolean;
    dirtyOverlapRequiresFreshRead: boolean;
    routeSurfaceDeferred: boolean;
    storageCloudDeferred: boolean;
    frenchGenerationBlocked: boolean;
    canStartP1BNow: boolean;
    canApplyNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    productionFilesStillAbsent: boolean;
  };
  writeTransactionContract: {
    lockState: 'locked_until_p1b_receipts_and_refresh_complete';
    approvedSlice: 'P1B_DEV_TARGET_ISOLATION';
    allowedFiles: AllowedFile[];
    requiredReceipts: RequiredReceipt[];
    transactionStages: string[];
    forbiddenScopes: string[];
    rollbackRules: string[];
    verificationCommands: string[];
  };
  findings: Finding[];
  notes: string[];
};

const P1B_FILES = [
  'app/(tabs)/settings.tsx',
  'app/spanish_content_gate.ts',
  'app/study_target_lang_dev.ts',
  'components/StudyTargetContext.tsx',
];

const P1A_FILES = [
  'app/study_target.ts',
  'app/target_storage_keys.ts',
  'tests/gustav_surface_target_switch.test.ts',
  'tests/gustav_target_storage_keys.test.ts',
];

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

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function sameStringArray(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && expected.every((entry, index) => actual[index] === entry);
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1B Narrow Write Transaction Contract Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Allowed files: ${audit.summary.allowedFiles}`,
    `- Dirty overlap files: ${audit.summary.dirtyOverlapFiles}`,
    `- Required receipts: ${audit.summary.requiredReceipts}`,
    `- Required receipts present: ${audit.summary.requiredReceiptsPresent}`,
    `- Transaction stages: ${audit.summary.transactionStages}`,
    `- Forbidden scopes: ${audit.summary.forbiddenScopes}`,
    `- Rollback rules: ${audit.summary.rollbackRules}`,
    `- Verification commands: ${audit.summary.verificationCommands}`,
    `- Contract ready: ${audit.summary.contractReady ? 'yes' : 'no'}`,
    `- Only narrow P1B allowed: ${audit.summary.onlyNarrowP1BAllowed ? 'yes' : 'no'}`,
    `- Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Allowed Files',
    '',
  ];

  for (const file of audit.writeTransactionContract.allowedFiles) {
    lines.push(`- \`${file.filePath}\`: ${file.action}, dirtyOverlap=${file.dirtyOverlap ? 'yes' : 'no'}, freshRead=${file.requiresFreshRead ? 'yes' : 'no'}`);
  }

  lines.push('', '## Required Receipts', '');
  for (const receipt of audit.writeTransactionContract.requiredReceipts) {
    lines.push(`- \`${receipt.id}\`: present=${receipt.present ? 'yes' : 'no'}, path=\`${receipt.filePath}\``);
  }

  lines.push('', '## Transaction Stages', '');
  for (const stage of audit.writeTransactionContract.transactionStages) lines.push(`- ${stage}`);

  lines.push('', '## Forbidden Scopes', '');
  for (const scope of audit.writeTransactionContract.forbiddenScopes) lines.push(`- ${scope}`);

  lines.push('', '## Rollback Rules', '');
  for (const rule of audit.writeTransactionContract.rollbackRules) lines.push(`- ${rule}`);

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
    console.error('Usage: npx tsx scripts/gustav_p1b_narrow_write_transaction_contract_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const preflightPath = path.join(runDir, 'audits', 'p1b_preflight_audit.json');
  const approvalContractPath = path.join(runDir, 'audits', 'p1b_approval_receipt_contract_audit.json');
  const unlockMatrixPath = path.join(runDir, 'audits', 'p1b_unlock_prerequisite_matrix_audit.json');
  const freshReadContractPath = path.join(runDir, 'audits', 'p1b_fresh_read_receipt_contract_audit.json');
  const snapshotRefreshContractPath = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_refresh_contract_audit.json');
  const preflight = readJson<Record<string, unknown>>(preflightPath);
  const approvalContractAudit = readJson<Record<string, unknown>>(approvalContractPath);
  const unlockMatrix = readJson<Record<string, unknown>>(unlockMatrixPath);
  const freshReadContract = readJson<Record<string, unknown>>(freshReadContractPath);
  const snapshotRefreshContract = readJson<Record<string, unknown>>(snapshotRefreshContractPath);
  const findings: Finding[] = [];

  const preflightSummary = object(preflight.summary);
  const approvalSummary = object(approvalContractAudit.summary);
  const unlockSummary = object(unlockMatrix.summary);
  const freshSummary = object(freshReadContract.summary);
  const refreshSummary = object(snapshotRefreshContract.summary);
  const approvalContract = object(approvalContractAudit.approvalReceiptContract);
  const approvalUnlockScope = object(approvalContract.unlockScope);
  const freshContract = object(freshReadContract.freshReadReceiptContract);
  const refreshContract = object(snapshotRefreshContract.snapshotRefreshContract);
  const approvedFiles = arrayOfStrings(approvalUnlockScope.allowedFiles);

  if (preflight.status !== 'PASS' || preflightSummary.canStartP1BNow !== false || Number(preflightSummary.p1bFiles) !== 4) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_preflight_not_locked',
      message: 'P1B preflight must be PASS, four-file and locked before transaction contract is trusted.',
      filePath: path.relative(repoRoot, preflightPath),
    });
  }
  if (approvalContractAudit.status !== 'PASS' || !sameStringArray(approvedFiles, P1B_FILES) || approvalSummary.realReceiptPresent !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_approval_contract_not_narrow',
      message: 'P1B approval contract must be PASS, pre-approval and scoped to the exact four files.',
      filePath: path.relative(repoRoot, approvalContractPath),
    });
  }
  if (unlockMatrix.status !== 'PASS' || unlockSummary.canStartP1BNow !== false || unlockSummary.currentPrerequisitesComplete !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_unlock_matrix_not_locked',
      message: 'P1B unlock matrix must remain locked until all prerequisites exist.',
      filePath: path.relative(repoRoot, unlockMatrixPath),
    });
  }
  if (freshReadContract.status !== 'PASS' || freshSummary.freshReadReceiptPresent !== false || freshSummary.snapshotRefreshRequiredBeforeP1B !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_fresh_read_contract_not_locked',
      message: 'P1B fresh-read contract must require refresh and remain pre-receipt.',
      filePath: path.relative(repoRoot, freshReadContractPath),
    });
  }
  if (snapshotRefreshContract.status !== 'PASS' || refreshSummary.refreshAuditPresent !== false || refreshSummary.refreshAuditAloneMayAuthorizeP1B !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_snapshot_refresh_contract_not_locked',
      message: 'P1B snapshot refresh contract must be PASS and unable to authorize P1B alone.',
      filePath: path.relative(repoRoot, snapshotRefreshContractPath),
    });
  }

  const requiredReceiptSpecs: Array<Omit<RequiredReceipt, 'present'>> = [
    {
      id: 'p1a_apply_completion',
      filePath: path.join('docs/gustav/runs', runId, 'apply_plan/p1a_apply_completion_receipt.json'),
      requiredBefore: 'p1b_write',
    },
    {
      id: 'p1b_exact_approval',
      filePath: typeof approvalContract.canonicalReceiptPath === 'string'
        ? approvalContract.canonicalReceiptPath
        : path.join('docs/gustav/runs', runId, 'apply_plan/p1b_dev_target_isolation_approval_receipt.json'),
      requiredBefore: 'p1b_write',
    },
    {
      id: 'p1b_snapshot_refresh',
      filePath: typeof refreshContract.canonicalRefreshAuditPath === 'string'
        ? refreshContract.canonicalRefreshAuditPath
        : path.join('docs/gustav/runs', runId, 'audits/p1b_dirty_overlap_snapshot_refresh_audit.json'),
      requiredBefore: 'p1b_write',
    },
    {
      id: 'p1b_fresh_read',
      filePath: typeof freshContract.canonicalFreshReadReceiptPath === 'string'
        ? freshContract.canonicalFreshReadReceiptPath
        : path.join('docs/gustav/runs', runId, 'apply_plan/p1b_dirty_overlap_fresh_read_receipt.json'),
      requiredBefore: 'p1b_write',
    },
  ];
  const requiredReceipts: RequiredReceipt[] = requiredReceiptSpecs.map((receipt) => ({
    ...receipt,
    present: fs.existsSync(path.join(repoRoot, receipt.filePath)),
  }));

  for (const receipt of requiredReceipts.filter((entry) => entry.present)) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_required_receipt_present_before_approval',
      message: `P1B required receipt exists before the transaction is approved: ${receipt.id}`,
      filePath: receipt.filePath,
    });
  }
  for (const forbidden of P1A_FILES) {
    if (fs.existsSync(path.join(repoRoot, forbidden))) {
      findings.push({
        severity: 'blocker',
        code: 'p1a_production_file_exists_before_approval',
        message: `P1A planned production/test file exists before approval: ${forbidden}`,
        filePath: forbidden,
      });
    }
  }

  const allowedFiles: AllowedFile[] = P1B_FILES.map((filePath) => ({
    filePath,
    action: 'guarded_edit_after_receipts',
    dirtyOverlap: filePath === 'app/(tabs)/settings.tsx',
    requiresFreshRead: filePath === 'app/(tabs)/settings.tsx',
  }));
  const transactionStages = [
    'Verify P1A completion receipt.',
    'Verify exact P1B approval receipt and approved file list.',
    'Verify dirty-overlap snapshot refresh audit.',
    'Verify paired fresh-read receipt for app/(tabs)/settings.tsx.',
    'Re-read the four allowed P1B files immediately before editing.',
    'Apply only the P1B_DEV_TARGET_ISOLATION file changes.',
    'Run TypeScript compile for touched modules.',
    'Run focused target-isolation checks for dev target switching.',
    'Write post-transaction report without generating French content.',
  ];
  const forbiddenScopes = [
    'French content generation',
    'route surface integration',
    'storage key migration',
    'cloud sync migration',
    'personal practice content generation',
    'broad apply_plan/file_changes.json execution',
    'any file outside the four-file P1B slice',
  ];
  const rollbackRules = [
    'Capture pre-edit hashes for all four P1B files.',
    'Abort if settings.tsx hash changes after fresh-read and before edit.',
    'Revert only files modified by the P1B transaction.',
    'Never revert user-owned dirty work outside the P1B transaction.',
    'Keep rollback logs under docs/gustav run artifacts.',
    'Leave French generation blocked after rollback.',
  ];
  const verificationCommands = [
    'npx tsc --target es2018 --module commonjs --moduleResolution node --outDir /private/tmp/gustav-build <P1B check scripts>',
    'node /private/tmp/gustav-build/gustav_readiness_gate.js --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1',
    'node /private/tmp/gustav-build/gustav_validate_run.js --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1',
  ];

  const requiredReceiptsPresent = requiredReceipts.filter((receipt) => receipt.present).length;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const contractReady =
    blockers === 0 &&
    allowedFiles.length === 4 &&
    requiredReceipts.length === 4 &&
    requiredReceiptsPresent === 0 &&
    transactionStages.length === 9 &&
    forbiddenScopes.length === 7 &&
    rollbackRules.length === 6 &&
    verificationCommands.length === 3;

  const audit: Audit = {
    schemaVersion: 'gustav-p1b-narrow-write-transaction-contract-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1bPreflightAudit: path.relative(repoRoot, preflightPath),
      p1bApprovalReceiptContractAudit: path.relative(repoRoot, approvalContractPath),
      p1bUnlockPrerequisiteMatrixAudit: path.relative(repoRoot, unlockMatrixPath),
      p1bFreshReadReceiptContractAudit: path.relative(repoRoot, freshReadContractPath),
      p1bSnapshotRefreshContractAudit: path.relative(repoRoot, snapshotRefreshContractPath),
    },
    summary: {
      allowedFiles: allowedFiles.length,
      dirtyOverlapFiles: allowedFiles.filter((file) => file.dirtyOverlap).length,
      requiredReceipts: requiredReceipts.length,
      requiredReceiptsPresent,
      transactionStages: transactionStages.length,
      forbiddenScopes: forbiddenScopes.length,
      rollbackRules: rollbackRules.length,
      verificationCommands: verificationCommands.length,
      blockers,
      warnings,
      contractReady,
      onlyNarrowP1BAllowed: true,
      allRequiredReceiptsPresent: requiredReceiptsPresent === requiredReceipts.length,
      dirtyOverlapRequiresFreshRead: true,
      routeSurfaceDeferred: true,
      storageCloudDeferred: true,
      frenchGenerationBlocked: true,
      canStartP1BNow: false,
      canApplyNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      productionFilesStillAbsent: P1A_FILES.every((filePath) => !fs.existsSync(path.join(repoRoot, filePath))),
    },
    writeTransactionContract: {
      lockState: 'locked_until_p1b_receipts_and_refresh_complete',
      approvedSlice: 'P1B_DEV_TARGET_ISOLATION',
      allowedFiles,
      requiredReceipts,
      transactionStages,
      forbiddenScopes,
      rollbackRules,
      verificationCommands,
    },
    findings,
    notes: [
      'This audit defines the future narrow P1B write transaction contract; it does not edit production files.',
      'P1B remains locked because P1A completion, exact approval, snapshot refresh and fresh-read receipts are absent.',
      'The contract explicitly forbids French generation and broad architecture apply work.',
      'The dirty settings.tsx overlap remains user-owned and must be freshly re-read before any future approved edit.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1b_narrow_write_transaction_contract_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1b_narrow_write_transaction_contract_audit.md');
  const outReadme = path.join(runDir, 'audits', 'p1b_narrow_write_transaction_contract', 'README.md');
  ensureDir(path.dirname(outJson));
  ensureDir(path.dirname(outReadme));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(outReadme, renderMarkdown(audit));

  console.log(`GUSTAV P1B narrow write transaction contract audit: ${audit.status}`);
  console.log(`Allowed files: ${audit.summary.allowedFiles}`);
  console.log(`Required receipts: ${audit.summary.requiredReceipts}`);
  console.log(`Required receipts present: ${audit.summary.requiredReceiptsPresent}`);
  console.log(`Transaction stages: ${audit.summary.transactionStages}`);
  console.log(`Forbidden scopes: ${audit.summary.forbiddenScopes}`);
  console.log(`Rollback rules: ${audit.summary.rollbackRules}`);
  console.log(`Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);

  if (blockers > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
