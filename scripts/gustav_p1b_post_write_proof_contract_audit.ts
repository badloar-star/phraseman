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

type ContractField = {
  name: string;
  required: boolean;
  expected: string;
};

type ProofProbe = {
  id: string;
  description: string;
  proofPathAccepted: boolean;
  approvedSliceMatches: boolean;
  changedFilesSubset: boolean;
  prePostHashesForAllChangedFiles: boolean;
  receiptsLinked: boolean;
  verificationPassed: boolean;
  userDirtyPreserved: boolean;
  frenchGenerationStayedBlocked: boolean;
  wouldAcceptPostWriteProof: boolean;
  expectedAcceptPostWriteProof: boolean;
  rejectionReasons: string[];
};

type Audit = {
  schemaVersion: 'gustav-p1b-post-write-proof-contract-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1bNarrowWriteTransactionContractAudit: string;
    p1bApprovalReceiptContractAudit: string;
    p1bSnapshotRefreshContractAudit: string;
    p1bFreshReadReceiptContractAudit: string;
  };
  summary: {
    allowedFiles: number;
    requiredFields: number;
    rejectionRules: number;
    proofProbes: number;
    rejectedProofProbes: number;
    verificationCommands: number;
    blockers: number;
    warnings: number;
    contractReady: boolean;
    postWriteProofPresent: boolean;
    proofRequiresExactReceiptChain: boolean;
    proofRequiresChangedFilesSubset: boolean;
    proofRequiresPrePostHashes: boolean;
    proofRequiresUserDirtyPreservation: boolean;
    proofRequiresFrenchGenerationBlocked: boolean;
    proofAloneMayAuthorizeFrenchGeneration: boolean;
    proofRequiredBeforeP1BCompletion: boolean;
    canStartP1BNow: boolean;
    canApplyNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    productionFilesStillAbsent: boolean;
  };
  postWriteProofContract: {
    lockState: 'locked_until_p1b_transaction_executed_and_verified';
    canonicalProofPath: string;
    approvedSlice: 'P1B_DEV_TARGET_ISOLATION';
    allowedFiles: string[];
    requiredFields: ContractField[];
    acceptedProofShape: {
      schemaVersion: 'gustav-p1b-post-write-proof-v0';
      runId: string;
      approvedSlice: 'P1B_DEV_TARGET_ISOLATION';
      executedAt: 'ISO-8601 timestamp';
      approvedFiles: string[];
      changedFiles: string[];
      preEditHashes: Record<string, 'sha256'>;
      postEditHashes: Record<string, 'sha256'>;
      gitDiffNameOnly: string[];
      receiptChain: {
        p1aApplyCompletionReceiptPath: string;
        p1bApprovalReceiptPath: string;
        dirtyOverlapSnapshotRefreshAuditPath: string;
        dirtyOverlapFreshReadReceiptPath: string;
      };
      verificationCommands: string[];
      verificationResults: Array<{
        command: string;
        status: 'PASS';
      }>;
      userOwnedDirtyFilesPreserved: true;
      frenchGenerationStarted: false;
    };
    rejectionPolicy: string[];
    verificationCommands: string[];
  };
  proofProbes: ProofProbe[];
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

function placeholderHashes(files: string[]): Record<string, 'sha256'> {
  const hashes: Record<string, 'sha256'> = {};
  for (const filePath of files) hashes[filePath] = 'sha256';
  return hashes;
}

function evaluateProbe(input: Omit<ProofProbe, 'wouldAcceptPostWriteProof' | 'rejectionReasons'>): ProofProbe {
  const rejectionReasons: string[] = [];
  if (!input.proofPathAccepted) rejectionReasons.push('proof_path_not_accepted');
  if (!input.approvedSliceMatches) rejectionReasons.push('approved_slice_mismatch');
  if (!input.changedFilesSubset) rejectionReasons.push('changed_files_outside_p1b_slice');
  if (!input.prePostHashesForAllChangedFiles) rejectionReasons.push('missing_pre_post_hash_chain');
  if (!input.receiptsLinked) rejectionReasons.push('required_receipt_chain_missing');
  if (!input.verificationPassed) rejectionReasons.push('verification_commands_missing_or_failed');
  if (!input.userDirtyPreserved) rejectionReasons.push('user_owned_dirty_work_not_preserved');
  if (!input.frenchGenerationStayedBlocked) rejectionReasons.push('french_generation_started_or_unblocked');
  return {
    ...input,
    wouldAcceptPostWriteProof: rejectionReasons.length === 0,
    rejectionReasons,
  };
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1B Post-Write Proof Contract Audit',
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
    `- Required fields: ${audit.summary.requiredFields}`,
    `- Rejection rules: ${audit.summary.rejectionRules}`,
    `- Proof probes: ${audit.summary.proofProbes}`,
    `- Rejected proof probes: ${audit.summary.rejectedProofProbes}`,
    `- Verification commands: ${audit.summary.verificationCommands}`,
    `- Contract ready: ${audit.summary.contractReady ? 'yes' : 'no'}`,
    `- Post-write proof present: ${audit.summary.postWriteProofPresent ? 'yes' : 'no'}`,
    `- Proof alone may authorize French generation: ${audit.summary.proofAloneMayAuthorizeFrenchGeneration ? 'yes' : 'no'}`,
    `- Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Allowed Files',
    '',
  ];

  for (const file of audit.postWriteProofContract.allowedFiles) {
    lines.push(`- \`${file}\``);
  }

  lines.push('', '## Required Fields', '');
  for (const field of audit.postWriteProofContract.requiredFields) {
    lines.push(`- \`${field.name}\`: ${field.expected}`);
  }

  lines.push('', '## Rejection Policy', '');
  for (const rule of audit.postWriteProofContract.rejectionPolicy) lines.push(`- ${rule}`);

  lines.push('', '## Proof Probes', '');
  for (const probe of audit.proofProbes) {
    lines.push(`- \`${probe.id}\`: accept=${probe.wouldAcceptPostWriteProof ? 'yes' : 'no'}, expected=${probe.expectedAcceptPostWriteProof ? 'yes' : 'no'}, reasons=${probe.rejectionReasons.length ? probe.rejectionReasons.map((reason) => `\`${reason}\``).join(', ') : '`none`'}`);
  }

  lines.push('', '## Verification Commands', '');
  for (const command of audit.postWriteProofContract.verificationCommands) {
    lines.push(`- \`${command}\``);
  }

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
    console.error('Usage: npx tsx scripts/gustav_p1b_post_write_proof_contract_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const transactionContractPath = path.join(runDir, 'audits', 'p1b_narrow_write_transaction_contract_audit.json');
  const approvalContractPath = path.join(runDir, 'audits', 'p1b_approval_receipt_contract_audit.json');
  const snapshotRefreshContractPath = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_refresh_contract_audit.json');
  const freshReadContractPath = path.join(runDir, 'audits', 'p1b_fresh_read_receipt_contract_audit.json');
  const proofPath = path.join('docs/gustav/runs', runId, 'apply_plan/p1b_post_write_proof.json');
  const findings: Finding[] = [];

  const transactionContractAudit = readJson<Record<string, unknown>>(transactionContractPath);
  const approvalContractAudit = readJson<Record<string, unknown>>(approvalContractPath);
  const snapshotRefreshContractAudit = readJson<Record<string, unknown>>(snapshotRefreshContractPath);
  const freshReadContractAudit = readJson<Record<string, unknown>>(freshReadContractPath);

  const transactionSummary = object(transactionContractAudit.summary);
  const transactionContract = object(transactionContractAudit.writeTransactionContract);
  const allowedFiles = arrayOfStrings((transactionContract.allowedFiles as Array<Record<string, unknown>> | undefined)?.map((entry) => entry.filePath));
  const postWriteProofPresent = fs.existsSync(path.join(repoRoot, proofPath));

  if (
    transactionContractAudit.status !== 'PASS' ||
    transactionSummary.contractReady !== true ||
    transactionSummary.onlyNarrowP1BAllowed !== true ||
    !sameStringArray(allowedFiles, P1B_FILES)
  ) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_transaction_contract_not_trusted',
      message: 'P1B post-write proof contract requires the narrow write transaction contract to be PASS and scoped to the exact four files.',
      filePath: path.relative(repoRoot, transactionContractPath),
    });
  }

  if (approvalContractAudit.status !== 'PASS') {
    findings.push({
      severity: 'blocker',
      code: 'p1b_approval_contract_not_pass',
      message: 'P1B post-write proof contract requires the approval receipt contract to be PASS.',
      filePath: path.relative(repoRoot, approvalContractPath),
    });
  }

  if (snapshotRefreshContractAudit.status !== 'PASS') {
    findings.push({
      severity: 'blocker',
      code: 'p1b_snapshot_refresh_contract_not_pass',
      message: 'P1B post-write proof contract requires the snapshot refresh contract to be PASS.',
      filePath: path.relative(repoRoot, snapshotRefreshContractPath),
    });
  }

  if (freshReadContractAudit.status !== 'PASS') {
    findings.push({
      severity: 'blocker',
      code: 'p1b_fresh_read_contract_not_pass',
      message: 'P1B post-write proof contract requires the fresh-read receipt contract to be PASS.',
      filePath: path.relative(repoRoot, freshReadContractPath),
    });
  }

  if (postWriteProofPresent) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_post_write_proof_exists_before_transaction',
      message: 'A P1B post-write proof already exists even though the P1B write transaction has not been approved or executed.',
      filePath: proofPath,
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

  const requiredFields: ContractField[] = [
    { name: 'schemaVersion', required: true, expected: 'gustav-p1b-post-write-proof-v0' },
    { name: 'runId', required: true, expected: runId },
    { name: 'approvedSlice', required: true, expected: 'P1B_DEV_TARGET_ISOLATION' },
    { name: 'executedAt', required: true, expected: 'ISO-8601 timestamp after exact approval and fresh-read' },
    { name: 'approvedFiles', required: true, expected: 'exact four P1B files' },
    { name: 'changedFiles', required: true, expected: 'subset of approvedFiles only' },
    { name: 'preEditHashes', required: true, expected: 'SHA-256 for every changed file before edit' },
    { name: 'postEditHashes', required: true, expected: 'SHA-256 for every changed file after edit' },
    { name: 'gitDiffNameOnly', required: true, expected: 'git diff path set, no file outside P1B slice' },
    { name: 'receiptChain', required: true, expected: 'P1A completion, P1B approval, snapshot refresh and fresh-read receipts' },
    { name: 'dirtyOverlapFreshReadReceiptPath', required: true, expected: 'docs/gustav run apply_plan fresh-read receipt' },
    { name: 'dirtyOverlapSnapshotRefreshAuditPath', required: true, expected: 'docs/gustav run snapshot refresh audit' },
    { name: 'p1bApprovalReceiptPath', required: true, expected: 'docs/gustav run exact P1B approval receipt' },
    { name: 'p1aApplyCompletionReceiptPath', required: true, expected: 'docs/gustav run P1A completion receipt' },
    { name: 'verificationCommands', required: true, expected: 'commands run after the write transaction' },
    { name: 'verificationResults', required: true, expected: 'all required commands PASS' },
    { name: 'userOwnedDirtyFilesPreserved', required: true, expected: 'true' },
    { name: 'frenchGenerationStarted', required: true, expected: 'false' },
  ];

  const rejectionPolicy = [
    'Reject proof outside the canonical p1b_post_write_proof.json path.',
    'Reject proof with approvedSlice other than P1B_DEV_TARGET_ISOLATION.',
    'Reject any changed file outside the four-file P1B slice.',
    'Reject missing pre-edit or post-edit SHA-256 for any changed file.',
    'Reject missing P1A completion, exact P1B approval, snapshot refresh or fresh-read receipt links.',
    'Reject failed or missing TypeScript, readiness or run-validator verification results.',
    'Reject proof that does not prove app/(tabs)/settings.tsx user-owned dirty work was preserved.',
    'Reject proof that starts or unblocks French generation.',
    'Reject proof that attempts to authorize broad apply, route integration, storage migration or cloud sync migration.',
  ];

  const verificationCommands = [
    'git diff --name-only -- app/(tabs)/settings.tsx app/spanish_content_gate.ts app/study_target_lang_dev.ts components/StudyTargetContext.tsx',
    'git diff --name-only',
    'npx tsc --target es2018 --module commonjs --moduleResolution node --outDir /private/tmp/gustav-build <P1B touched modules/check scripts>',
    'node /private/tmp/gustav-build/gustav_readiness_gate.js --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1',
    'node /private/tmp/gustav-build/gustav_validate_run.js --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1',
  ];

  const proofProbes = [
    evaluateProbe({
      id: 'missing_proof',
      description: 'No post-write proof exists yet.',
      proofPathAccepted: false,
      approvedSliceMatches: false,
      changedFilesSubset: false,
      prePostHashesForAllChangedFiles: false,
      receiptsLinked: false,
      verificationPassed: false,
      userDirtyPreserved: false,
      frenchGenerationStayedBlocked: true,
      expectedAcceptPostWriteProof: false,
    }),
    evaluateProbe({
      id: 'extra_file_touched',
      description: 'Proof claims a file outside the four-file P1B slice changed.',
      proofPathAccepted: true,
      approvedSliceMatches: true,
      changedFilesSubset: false,
      prePostHashesForAllChangedFiles: true,
      receiptsLinked: true,
      verificationPassed: true,
      userDirtyPreserved: true,
      frenchGenerationStayedBlocked: true,
      expectedAcceptPostWriteProof: false,
    }),
    evaluateProbe({
      id: 'missing_hash_chain',
      description: 'Proof omits pre/post SHA-256 for at least one changed file.',
      proofPathAccepted: true,
      approvedSliceMatches: true,
      changedFilesSubset: true,
      prePostHashesForAllChangedFiles: false,
      receiptsLinked: true,
      verificationPassed: true,
      userDirtyPreserved: true,
      frenchGenerationStayedBlocked: true,
      expectedAcceptPostWriteProof: false,
    }),
    evaluateProbe({
      id: 'missing_receipt_chain',
      description: 'Proof omits one or more prerequisite receipts.',
      proofPathAccepted: true,
      approvedSliceMatches: true,
      changedFilesSubset: true,
      prePostHashesForAllChangedFiles: true,
      receiptsLinked: false,
      verificationPassed: true,
      userDirtyPreserved: true,
      frenchGenerationStayedBlocked: true,
      expectedAcceptPostWriteProof: false,
    }),
    evaluateProbe({
      id: 'verification_not_passed',
      description: 'Proof is structurally plausible but verification commands did not all pass.',
      proofPathAccepted: true,
      approvedSliceMatches: true,
      changedFilesSubset: true,
      prePostHashesForAllChangedFiles: true,
      receiptsLinked: true,
      verificationPassed: false,
      userDirtyPreserved: true,
      frenchGenerationStayedBlocked: true,
      expectedAcceptPostWriteProof: false,
    }),
    evaluateProbe({
      id: 'french_generation_started',
      description: 'Proof indicates French generation started during or after P1B.',
      proofPathAccepted: true,
      approvedSliceMatches: true,
      changedFilesSubset: true,
      prePostHashesForAllChangedFiles: true,
      receiptsLinked: true,
      verificationPassed: true,
      userDirtyPreserved: true,
      frenchGenerationStayedBlocked: false,
      expectedAcceptPostWriteProof: false,
    }),
    evaluateProbe({
      id: 'valid_post_write_proof',
      description: 'Canonical proof with exact slice, hashes, receipts, verification PASS, dirty-work preservation and French generation blocked.',
      proofPathAccepted: true,
      approvedSliceMatches: true,
      changedFilesSubset: true,
      prePostHashesForAllChangedFiles: true,
      receiptsLinked: true,
      verificationPassed: true,
      userDirtyPreserved: true,
      frenchGenerationStayedBlocked: true,
      expectedAcceptPostWriteProof: true,
    }),
  ];

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const rejectedProofProbes = proofProbes.filter((probe) => !probe.wouldAcceptPostWriteProof).length;
  const contractReady =
    blockers === 0 &&
    requiredFields.length === 18 &&
    rejectionPolicy.length === 9 &&
    proofProbes.length === 7 &&
    rejectedProofProbes === 6 &&
    verificationCommands.length === 5 &&
    !postWriteProofPresent;

  const acceptedProofShape: Audit['postWriteProofContract']['acceptedProofShape'] = {
    schemaVersion: 'gustav-p1b-post-write-proof-v0',
    runId,
    approvedSlice: 'P1B_DEV_TARGET_ISOLATION',
    executedAt: 'ISO-8601 timestamp',
    approvedFiles: P1B_FILES,
    changedFiles: ['subset of approvedFiles only'],
    preEditHashes: placeholderHashes(P1B_FILES),
    postEditHashes: placeholderHashes(P1B_FILES),
    gitDiffNameOnly: ['subset of approvedFiles only'],
    receiptChain: {
      p1aApplyCompletionReceiptPath: path.join('docs/gustav/runs', runId, 'apply_plan/p1a_apply_completion_receipt.json'),
      p1bApprovalReceiptPath: path.join('docs/gustav/runs', runId, 'apply_plan/p1b_dev_target_isolation_approval_receipt.json'),
      dirtyOverlapSnapshotRefreshAuditPath: path.join('docs/gustav/runs', runId, 'audits/p1b_dirty_overlap_snapshot_refresh_audit.json'),
      dirtyOverlapFreshReadReceiptPath: path.join('docs/gustav/runs', runId, 'apply_plan/p1b_dirty_overlap_fresh_read_receipt.json'),
    },
    verificationCommands,
    verificationResults: verificationCommands.map((command) => ({ command, status: 'PASS' })),
    userOwnedDirtyFilesPreserved: true,
    frenchGenerationStarted: false,
  };

  const audit: Audit = {
    schemaVersion: 'gustav-p1b-post-write-proof-contract-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1bNarrowWriteTransactionContractAudit: path.relative(repoRoot, transactionContractPath),
      p1bApprovalReceiptContractAudit: path.relative(repoRoot, approvalContractPath),
      p1bSnapshotRefreshContractAudit: path.relative(repoRoot, snapshotRefreshContractPath),
      p1bFreshReadReceiptContractAudit: path.relative(repoRoot, freshReadContractPath),
    },
    summary: {
      allowedFiles: P1B_FILES.length,
      requiredFields: requiredFields.length,
      rejectionRules: rejectionPolicy.length,
      proofProbes: proofProbes.length,
      rejectedProofProbes,
      verificationCommands: verificationCommands.length,
      blockers,
      warnings,
      contractReady,
      postWriteProofPresent,
      proofRequiresExactReceiptChain: true,
      proofRequiresChangedFilesSubset: true,
      proofRequiresPrePostHashes: true,
      proofRequiresUserDirtyPreservation: true,
      proofRequiresFrenchGenerationBlocked: true,
      proofAloneMayAuthorizeFrenchGeneration: false,
      proofRequiredBeforeP1BCompletion: true,
      canStartP1BNow: false,
      canApplyNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      productionFilesStillAbsent: P1A_FILES.every((filePath) => !fs.existsSync(path.join(repoRoot, filePath))),
    },
    postWriteProofContract: {
      lockState: 'locked_until_p1b_transaction_executed_and_verified',
      canonicalProofPath: proofPath,
      approvedSlice: 'P1B_DEV_TARGET_ISOLATION',
      allowedFiles: P1B_FILES,
      requiredFields,
      acceptedProofShape,
      rejectionPolicy,
      verificationCommands,
    },
    proofProbes,
    findings,
    notes: [
      'This audit defines the future post-write proof contract; it does not execute P1B and does not edit production files.',
      'A P1B transaction cannot be considered complete without canonical proof that changed files stayed inside the four-file slice.',
      'The proof must preserve the user-owned settings.tsx dirty overlap and record pre/post hashes for every changed file.',
      'Even a valid P1B post-write proof does not authorize French generation or broad production apply.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1b_post_write_proof_contract_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1b_post_write_proof_contract_audit.md');
  const outReadme = path.join(runDir, 'audits', 'p1b_post_write_proof_contract', 'README.md');
  ensureDir(path.dirname(outJson));
  ensureDir(path.dirname(outReadme));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(outReadme, renderMarkdown(audit));

  console.log(`GUSTAV P1B post-write proof contract audit: ${audit.status}`);
  console.log(`Allowed files: ${audit.summary.allowedFiles}`);
  console.log(`Required fields: ${audit.summary.requiredFields}`);
  console.log(`Rejection rules: ${audit.summary.rejectionRules}`);
  console.log(`Proof probes: ${audit.summary.proofProbes}`);
  console.log(`Rejected proof probes: ${audit.summary.rejectedProofProbes}`);
  console.log(`Verification commands: ${audit.summary.verificationCommands}`);
  console.log(`Post-write proof present: ${audit.summary.postWriteProofPresent ? 'yes' : 'no'}`);
  console.log(`Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);

  if (blockers > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
