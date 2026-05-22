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

type ProofProbe = {
  id: string;
  filePath: string;
  exists: boolean;
  source: 'real_candidate' | 'temp_fixture';
  parseableJson: boolean;
  schemaValid: boolean;
  runIdMatches: boolean;
  approvedSliceMatches: boolean;
  approvedFilesMatch: boolean;
  changedFilesSubset: boolean;
  changedFilesMatchDiff: boolean;
  prePostHashesPresent: boolean;
  receiptChainValid: boolean;
  verificationResultsPass: boolean;
  userDirtyPreserved: boolean;
  frenchGenerationBlocked: boolean;
  acceptedProofPath: boolean;
  wouldAcceptPostWriteProof: boolean;
  expectedAccept: boolean;
  rejectionReason: string;
};

type Audit = {
  schemaVersion: 'gustav-p1b-post-write-proof-firewall-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1bPostWriteProofContractAudit: string;
    p1bNarrowWriteTransactionContractAudit: string;
  };
  summary: {
    realProofCandidates: number;
    realProofsPresent: number;
    exactProofMatches: number;
    tempFixtures: number;
    rejectedTempFixtures: number;
    acceptedShapeFixtures: number;
    tempExactShapeBlockedByPath: number;
    outsideFileFixtures: number;
    outsideFileFixturesRejected: number;
    missingHashFixtures: number;
    missingHashFixturesRejected: number;
    missingReceiptFixtures: number;
    missingReceiptFixturesRejected: number;
    verificationFailureFixtures: number;
    verificationFailureFixturesRejected: number;
    frenchGenerationFixtures: number;
    frenchGenerationFixturesRejected: number;
    blockers: number;
    warnings: number;
    firewallPassed: boolean;
    requiresCanonicalProofPath: boolean;
    requiresChangedFilesSubset: boolean;
    requiresPrePostHashes: boolean;
    requiresReceiptChain: boolean;
    requiresVerificationPass: boolean;
    requiresUserDirtyPreservation: boolean;
    requiresFrenchGenerationBlocked: boolean;
    postWriteProofStillMissing: boolean;
    canStartP1BNow: boolean;
    canApplyNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    productionFilesStillAbsent: boolean;
  };
  proofFirewall: {
    canonicalProofPath: string;
    acceptedProofPaths: string[];
    approvedSlice: 'P1B_DEV_TARGET_ISOLATION';
    approvedFiles: string[];
    rejectionOrder: string[];
  };
  tempFixtureRoot: string;
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

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function sameStringArray(left: unknown, right: string[]): boolean {
  const values = arr<string>(left).filter((entry) => typeof entry === 'string');
  return values.length === right.length && values.every((entry, index) => entry === right[index]);
}

function isSubset(values: unknown, allowed: string[]): boolean {
  const entries = arr<string>(values).filter((entry) => typeof entry === 'string');
  return entries.length > 0 && entries.every((entry) => allowed.includes(entry));
}

function sameStringSet(left: unknown, right: unknown): boolean {
  const leftValues = arr<string>(left).filter((entry) => typeof entry === 'string').sort();
  const rightValues = arr<string>(right).filter((entry) => typeof entry === 'string').sort();
  return leftValues.length === rightValues.length && leftValues.every((entry, index) => entry === rightValues[index]);
}

function isSha256(value: unknown): boolean {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

function hashesFor(files: string[], seed: 'a' | 'b'): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const [index, filePath] of files.entries()) {
    hashes[filePath] = seed.repeat(63) + String(index);
  }
  return hashes;
}

function hasHashesFor(hashes: unknown, files: unknown): boolean {
  const hashObj = object(hashes);
  const changedFiles = arr<string>(files).filter((entry) => typeof entry === 'string');
  return changedFiles.length > 0 && changedFiles.every((filePath) => isSha256(hashObj[filePath]));
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function validateProof(
  id: string,
  filePath: string,
  source: 'real_candidate' | 'temp_fixture',
  acceptedProofPaths: string[],
  expectedRunId: string,
  expectedFiles: string[],
  expectedAccept: boolean,
): ProofProbe {
  const acceptedProofPath = acceptedProofPaths.includes(filePath);
  const exists = fs.existsSync(filePath);
  let parsedUnknown: unknown = null;
  let parseableJson = false;

  if (exists && filePath.endsWith('.json')) {
    try {
      parsedUnknown = readJson<unknown>(filePath);
      parseableJson = true;
    } catch {
      parsedUnknown = null;
    }
  }

  const parsed = object(parsedUnknown);
  const receiptChain = object(parsed.receiptChain);
  const verificationResults = arr<Record<string, unknown>>(parsed.verificationResults);
  const schemaValid = parsed.schemaVersion === 'gustav-p1b-post-write-proof-v0';
  const runIdMatches = parsed.runId === expectedRunId;
  const approvedSliceMatches = parsed.approvedSlice === 'P1B_DEV_TARGET_ISOLATION';
  const approvedFilesMatch = sameStringArray(parsed.approvedFiles, expectedFiles);
  const changedFilesSubset = isSubset(parsed.changedFiles, expectedFiles) && isSubset(parsed.gitDiffNameOnly, expectedFiles);
  const changedFilesMatchDiff = sameStringSet(parsed.changedFiles, parsed.gitDiffNameOnly);
  const prePostHashesPresent = hasHashesFor(parsed.preEditHashes, parsed.changedFiles) && hasHashesFor(parsed.postEditHashes, parsed.changedFiles);
  const receiptChainValid =
    typeof receiptChain.p1aApplyCompletionReceiptPath === 'string' &&
    receiptChain.p1aApplyCompletionReceiptPath.endsWith('p1a_apply_completion_receipt.json') &&
    typeof receiptChain.p1bApprovalReceiptPath === 'string' &&
    receiptChain.p1bApprovalReceiptPath.endsWith('p1b_dev_target_isolation_approval_receipt.json') &&
    typeof receiptChain.dirtyOverlapSnapshotRefreshAuditPath === 'string' &&
    receiptChain.dirtyOverlapSnapshotRefreshAuditPath.endsWith('p1b_dirty_overlap_snapshot_refresh_audit.json') &&
    typeof receiptChain.dirtyOverlapFreshReadReceiptPath === 'string' &&
    receiptChain.dirtyOverlapFreshReadReceiptPath.endsWith('p1b_dirty_overlap_fresh_read_receipt.json');
  const verificationResultsPass =
    verificationResults.length >= 5 &&
    verificationResults.every((result) => result.status === 'PASS' && typeof result.command === 'string' && result.command.length > 0);
  const userDirtyPreserved = parsed.userOwnedDirtyFilesPreserved === true;
  const frenchGenerationBlocked = parsed.frenchGenerationStarted === false;
  const wouldAcceptPostWriteProof =
    exists &&
    parseableJson &&
    schemaValid &&
    runIdMatches &&
    approvedSliceMatches &&
    approvedFilesMatch &&
    changedFilesSubset &&
    changedFilesMatchDiff &&
    prePostHashesPresent &&
    receiptChainValid &&
    verificationResultsPass &&
    userDirtyPreserved &&
    frenchGenerationBlocked &&
    acceptedProofPath;
  const rejectionReason = wouldAcceptPostWriteProof
    ? 'accepted'
    : !exists
      ? 'proof_absent'
      : !parseableJson
        ? 'not_parseable_json'
        : !schemaValid
          ? 'schema_mismatch'
          : !runIdMatches
            ? 'run_id_mismatch'
            : !approvedSliceMatches
              ? 'approved_slice_mismatch'
              : !approvedFilesMatch
                ? 'approved_files_mismatch'
                : !changedFilesSubset
                  ? 'changed_files_outside_p1b_slice'
                  : !changedFilesMatchDiff
                    ? 'changed_files_do_not_match_git_diff'
                    : !prePostHashesPresent
                      ? 'missing_pre_post_hash_chain'
                      : !receiptChainValid
                        ? 'receipt_chain_invalid'
                        : !verificationResultsPass
                          ? 'verification_results_not_pass'
                          : !userDirtyPreserved
                            ? 'user_dirty_not_preserved'
                            : !frenchGenerationBlocked
                              ? 'french_generation_started'
                              : !acceptedProofPath
                                ? 'proof_path_not_accepted'
                                : 'unknown';

  return {
    id,
    filePath,
    exists,
    source,
    parseableJson,
    schemaValid,
    runIdMatches,
    approvedSliceMatches,
    approvedFilesMatch,
    changedFilesSubset,
    changedFilesMatchDiff,
    prePostHashesPresent,
    receiptChainValid,
    verificationResultsPass,
    userDirtyPreserved,
    frenchGenerationBlocked,
    acceptedProofPath,
    wouldAcceptPostWriteProof,
    expectedAccept,
    rejectionReason,
  };
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1B Post-Write Proof Firewall Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Real proof candidates: ${audit.summary.realProofCandidates}`,
    `- Real proofs present: ${audit.summary.realProofsPresent}`,
    `- Exact proof matches: ${audit.summary.exactProofMatches}`,
    `- Temp fixtures: ${audit.summary.tempFixtures}`,
    `- Rejected temp fixtures: ${audit.summary.rejectedTempFixtures}`,
    `- Accepted shape fixtures: ${audit.summary.acceptedShapeFixtures}`,
    `- Temp exact shape blocked by path: ${audit.summary.tempExactShapeBlockedByPath}`,
    `- Outside-file fixtures rejected: ${audit.summary.outsideFileFixturesRejected}/${audit.summary.outsideFileFixtures}`,
    `- Missing-hash fixtures rejected: ${audit.summary.missingHashFixturesRejected}/${audit.summary.missingHashFixtures}`,
    `- Missing-receipt fixtures rejected: ${audit.summary.missingReceiptFixturesRejected}/${audit.summary.missingReceiptFixtures}`,
    `- Verification-failure fixtures rejected: ${audit.summary.verificationFailureFixturesRejected}/${audit.summary.verificationFailureFixtures}`,
    `- French-generation fixtures rejected: ${audit.summary.frenchGenerationFixturesRejected}/${audit.summary.frenchGenerationFixtures}`,
    `- Firewall passed: ${audit.summary.firewallPassed ? 'yes' : 'no'}`,
    `- Post-write proof still missing: ${audit.summary.postWriteProofStillMissing ? 'yes' : 'no'}`,
    `- Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Probe Results',
    '',
  ];

  for (const probe of audit.proofProbes) {
    lines.push(`- \`${probe.id}\`: accept=${probe.wouldAcceptPostWriteProof ? 'yes' : 'no'}, expected=${probe.expectedAccept ? 'yes' : 'no'}, reason=\`${probe.rejectionReason}\`, path=\`${probe.filePath}\``);
  }

  lines.push('', '## Rejection Order', '');
  for (const rule of audit.proofFirewall.rejectionOrder) lines.push(`- ${rule}`);

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
    console.error('Usage: npx tsx scripts/gustav_p1b_post_write_proof_firewall_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const contractPath = path.join(runDir, 'audits', 'p1b_post_write_proof_contract_audit.json');
  const transactionContractPath = path.join(runDir, 'audits', 'p1b_narrow_write_transaction_contract_audit.json');
  const contractAudit = readJson<Record<string, unknown>>(contractPath);
  const transactionContractAudit = readJson<Record<string, unknown>>(transactionContractPath);
  const findings: Finding[] = [];

  const contractSummary = object(contractAudit.summary);
  const proofContract = object(contractAudit.postWriteProofContract);
  const transactionSummary = object(transactionContractAudit.summary);
  const canonicalProofPath = typeof proofContract.canonicalProofPath === 'string'
    ? proofContract.canonicalProofPath
    : path.join('docs/gustav/runs', runId, 'apply_plan/p1b_post_write_proof.json');
  const acceptedProofPaths = [path.join(repoRoot, canonicalProofPath)];

  if (contractAudit.status !== 'PASS' || contractSummary.contractReady !== true || contractSummary.postWriteProofPresent !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_post_write_proof_contract_not_locked',
      message: 'P1B post-write proof firewall requires the proof contract to be PASS and pre-proof.',
      filePath: path.relative(repoRoot, contractPath),
    });
  }
  if (transactionContractAudit.status !== 'PASS' || transactionSummary.onlyNarrowP1BAllowed !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_narrow_transaction_contract_not_locked',
      message: 'P1B post-write proof firewall requires the narrow transaction contract to be PASS.',
      filePath: path.relative(repoRoot, transactionContractPath),
    });
  }

  const tempFixtureRoot = path.join('/private/tmp', `gustav-p1b-post-write-proof-firewall-${runId}`);
  fs.rmSync(tempFixtureRoot, { recursive: true, force: true });
  ensureDir(tempFixtureRoot);

  const verificationResults = [
    'git diff --name-only -- app/(tabs)/settings.tsx app/spanish_content_gate.ts app/study_target_lang_dev.ts components/StudyTargetContext.tsx',
    'git diff --name-only',
    'npx tsc --target es2018 --module commonjs --moduleResolution node --outDir /private/tmp/gustav-build <P1B touched modules/check scripts>',
    `node /private/tmp/gustav-build/gustav_readiness_gate.js --run docs/gustav/runs/${runId}`,
    `node /private/tmp/gustav-build/gustav_validate_run.js --run docs/gustav/runs/${runId}`,
  ].map((command) => ({ command, status: 'PASS' }));
  const exactProof = {
    schemaVersion: 'gustav-p1b-post-write-proof-v0',
    runId,
    approvedSlice: 'P1B_DEV_TARGET_ISOLATION',
    executedAt: new Date().toISOString(),
    approvedFiles: P1B_FILES,
    changedFiles: P1B_FILES,
    preEditHashes: hashesFor(P1B_FILES, 'a'),
    postEditHashes: hashesFor(P1B_FILES, 'b'),
    gitDiffNameOnly: P1B_FILES,
    receiptChain: {
      p1aApplyCompletionReceiptPath: path.join('docs/gustav/runs', runId, 'apply_plan/p1a_apply_completion_receipt.json'),
      p1bApprovalReceiptPath: path.join('docs/gustav/runs', runId, 'apply_plan/p1b_dev_target_isolation_approval_receipt.json'),
      dirtyOverlapSnapshotRefreshAuditPath: path.join('docs/gustav/runs', runId, 'audits/p1b_dirty_overlap_snapshot_refresh_audit.json'),
      dirtyOverlapFreshReadReceiptPath: path.join('docs/gustav/runs', runId, 'apply_plan/p1b_dirty_overlap_fresh_read_receipt.json'),
    },
    verificationCommands: verificationResults.map((result) => result.command),
    verificationResults,
    userOwnedDirtyFilesPreserved: true,
    frenchGenerationStarted: false,
  };

  const fixtureDefinitions: Array<{ id: string; fileName: string; body: unknown; expectedAccept: boolean }> = [
    {
      id: 'TMP-IMPLICIT-DALSHE',
      fileName: 'implicit_dalshe.json',
      body: 'дальше',
      expectedAccept: false,
    },
    {
      id: 'TMP-WRONG-RUN',
      fileName: 'wrong_run.json',
      body: { ...exactProof, runId: `${runId}_wrong` },
      expectedAccept: false,
    },
    {
      id: 'TMP-WRONG-SLICE',
      fileName: 'wrong_slice.json',
      body: { ...exactProof, approvedSlice: 'P1A_CORE_CONTRACTS' },
      expectedAccept: false,
    },
    {
      id: 'TMP-OUTSIDE-FILE',
      fileName: 'outside_file.json',
      body: { ...exactProof, changedFiles: [...P1B_FILES, 'app/cloud_sync.ts'], gitDiffNameOnly: [...P1B_FILES, 'app/cloud_sync.ts'] },
      expectedAccept: false,
    },
    {
      id: 'TMP-DIFF-MISMATCH',
      fileName: 'diff_mismatch.json',
      body: { ...exactProof, gitDiffNameOnly: ['app/(tabs)/settings.tsx'] },
      expectedAccept: false,
    },
    {
      id: 'TMP-MISSING-HASH',
      fileName: 'missing_hash.json',
      body: { ...exactProof, preEditHashes: { ...hashesFor(P1B_FILES.slice(0, 3), 'a') } },
      expectedAccept: false,
    },
    {
      id: 'TMP-MISSING-RECEIPT',
      fileName: 'missing_receipt.json',
      body: { ...exactProof, receiptChain: { p1bApprovalReceiptPath: exactProof.receiptChain.p1bApprovalReceiptPath } },
      expectedAccept: false,
    },
    {
      id: 'TMP-FAILED-VERIFY',
      fileName: 'failed_verify.json',
      body: { ...exactProof, verificationResults: [{ command: 'node /private/tmp/gustav-build/gustav_validate_run.js', status: 'FAIL' }] },
      expectedAccept: false,
    },
    {
      id: 'TMP-DIRTY-NOT-PRESERVED',
      fileName: 'dirty_not_preserved.json',
      body: { ...exactProof, userOwnedDirtyFilesPreserved: false },
      expectedAccept: false,
    },
    {
      id: 'TMP-FRENCH-STARTED',
      fileName: 'french_started.json',
      body: { ...exactProof, frenchGenerationStarted: true },
      expectedAccept: false,
    },
    {
      id: 'TMP-EXACT-SHAPE-WRONG-PATH',
      fileName: 'exact_shape_wrong_path.json',
      body: exactProof,
      expectedAccept: false,
    },
  ];

  const probes: ProofProbe[] = [
    validateProof(
      `REAL-${path.basename(canonicalProofPath).toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`,
      path.join(repoRoot, canonicalProofPath),
      'real_candidate',
      acceptedProofPaths,
      runId,
      P1B_FILES,
      false,
    ),
  ];

  for (const fixture of fixtureDefinitions) {
    const fixturePath = path.join(tempFixtureRoot, fixture.fileName);
    writeJson(fixturePath, fixture.body);
    probes.push(validateProof(
      fixture.id,
      fixturePath,
      'temp_fixture',
      acceptedProofPaths,
      runId,
      P1B_FILES,
      fixture.expectedAccept,
    ));
  }

  for (const probe of probes.filter((entry) => entry.wouldAcceptPostWriteProof !== entry.expectedAccept)) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_post_write_proof_firewall_expectation_mismatch',
      message: `${probe.id} accept result ${String(probe.wouldAcceptPostWriteProof)} did not match expected ${String(probe.expectedAccept)}.`,
      filePath: probe.filePath,
    });
  }

  const realProbes = probes.filter((probe) => probe.source === 'real_candidate');
  const tempProbes = probes.filter((probe) => probe.source === 'temp_fixture');
  const realProofsPresent = realProbes.filter((probe) => probe.exists).length;
  const exactProofMatches = realProbes.filter((probe) => probe.wouldAcceptPostWriteProof).length;
  const acceptedShapeFixtures = tempProbes.filter((probe) =>
    probe.schemaValid &&
    probe.runIdMatches &&
    probe.approvedSliceMatches &&
    probe.approvedFilesMatch &&
    probe.changedFilesSubset &&
    probe.changedFilesMatchDiff &&
    probe.prePostHashesPresent &&
    probe.receiptChainValid &&
    probe.verificationResultsPass &&
    probe.userDirtyPreserved &&
    probe.frenchGenerationBlocked
  ).length;
  const tempExactShapeBlockedByPath = tempProbes.filter((probe) =>
    probe.id === 'TMP-EXACT-SHAPE-WRONG-PATH' &&
    probe.rejectionReason === 'proof_path_not_accepted' &&
    probe.wouldAcceptPostWriteProof === false
  ).length;
  const outsideFileFixtures = tempProbes.filter((probe) => probe.id === 'TMP-OUTSIDE-FILE').length;
  const outsideFileFixturesRejected = tempProbes.filter((probe) => probe.id === 'TMP-OUTSIDE-FILE' && probe.wouldAcceptPostWriteProof === false).length;
  const missingHashFixtures = tempProbes.filter((probe) => probe.id === 'TMP-MISSING-HASH').length;
  const missingHashFixturesRejected = tempProbes.filter((probe) => probe.id === 'TMP-MISSING-HASH' && probe.wouldAcceptPostWriteProof === false).length;
  const missingReceiptFixtures = tempProbes.filter((probe) => probe.id === 'TMP-MISSING-RECEIPT').length;
  const missingReceiptFixturesRejected = tempProbes.filter((probe) => probe.id === 'TMP-MISSING-RECEIPT' && probe.wouldAcceptPostWriteProof === false).length;
  const verificationFailureFixtures = tempProbes.filter((probe) => probe.id === 'TMP-FAILED-VERIFY').length;
  const verificationFailureFixturesRejected = tempProbes.filter((probe) => probe.id === 'TMP-FAILED-VERIFY' && probe.wouldAcceptPostWriteProof === false).length;
  const frenchGenerationFixtures = tempProbes.filter((probe) => probe.id === 'TMP-FRENCH-STARTED').length;
  const frenchGenerationFixturesRejected = tempProbes.filter((probe) => probe.id === 'TMP-FRENCH-STARTED' && probe.wouldAcceptPostWriteProof === false).length;

  if (realProofsPresent > 0 || exactProofMatches > 0) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_real_post_write_proof_present',
      message: 'A real P1B post-write proof is present even though P1B has not been approved or executed.',
      filePath: canonicalProofPath,
    });
  }
  if (acceptedShapeFixtures !== 1 || tempExactShapeBlockedByPath !== 1) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_temp_exact_proof_not_path_blocked',
      message: 'The exact-shape temp P1B post-write proof must be valid by shape but blocked because it is outside accepted proof paths.',
    });
  }
  if (
    outsideFileFixturesRejected !== outsideFileFixtures ||
    missingHashFixturesRejected !== missingHashFixtures ||
    missingReceiptFixturesRejected !== missingReceiptFixtures ||
    verificationFailureFixturesRejected !== verificationFailureFixtures ||
    frenchGenerationFixturesRejected !== frenchGenerationFixtures
  ) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_post_write_bad_fixture_not_rejected',
      message: 'All malformed P1B post-write proof fixtures must be rejected.',
    });
  }

  const productionFilesStillAbsent = P1A_FILES.every((filePath) => !fs.existsSync(path.join(repoRoot, filePath)));
  if (!productionFilesStillAbsent) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_post_write_firewall_p1a_file_exists',
      message: 'A planned P1A production/test file exists before exact approval.',
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const firewallPassed =
    blockers === 0 &&
    realProbes.length === 1 &&
    realProofsPresent === 0 &&
    exactProofMatches === 0 &&
    tempProbes.length === 11 &&
    tempProbes.every((probe) => probe.wouldAcceptPostWriteProof === false) &&
    acceptedShapeFixtures === 1 &&
    tempExactShapeBlockedByPath === 1 &&
    outsideFileFixturesRejected === 1 &&
    missingHashFixturesRejected === 1 &&
    missingReceiptFixturesRejected === 1 &&
    verificationFailureFixturesRejected === 1 &&
    frenchGenerationFixturesRejected === 1 &&
    productionFilesStillAbsent;

  const audit: Audit = {
    schemaVersion: 'gustav-p1b-post-write-proof-firewall-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1bPostWriteProofContractAudit: path.relative(repoRoot, contractPath),
      p1bNarrowWriteTransactionContractAudit: path.relative(repoRoot, transactionContractPath),
    },
    summary: {
      realProofCandidates: realProbes.length,
      realProofsPresent,
      exactProofMatches,
      tempFixtures: tempProbes.length,
      rejectedTempFixtures: tempProbes.filter((probe) => probe.wouldAcceptPostWriteProof === false).length,
      acceptedShapeFixtures,
      tempExactShapeBlockedByPath,
      outsideFileFixtures,
      outsideFileFixturesRejected,
      missingHashFixtures,
      missingHashFixturesRejected,
      missingReceiptFixtures,
      missingReceiptFixturesRejected,
      verificationFailureFixtures,
      verificationFailureFixturesRejected,
      frenchGenerationFixtures,
      frenchGenerationFixturesRejected,
      blockers,
      warnings,
      firewallPassed,
      requiresCanonicalProofPath: true,
      requiresChangedFilesSubset: true,
      requiresPrePostHashes: true,
      requiresReceiptChain: true,
      requiresVerificationPass: true,
      requiresUserDirtyPreservation: true,
      requiresFrenchGenerationBlocked: true,
      postWriteProofStillMissing: realProofsPresent === 0,
      canStartP1BNow: false,
      canApplyNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      productionFilesStillAbsent,
    },
    proofFirewall: {
      canonicalProofPath,
      acceptedProofPaths,
      approvedSlice: 'P1B_DEV_TARGET_ISOLATION',
      approvedFiles: P1B_FILES,
      rejectionOrder: [
        'proof_absent',
        'not_parseable_json',
        'schema_mismatch',
        'run_id_mismatch',
        'approved_slice_mismatch',
        'approved_files_mismatch',
        'changed_files_outside_p1b_slice',
        'changed_files_do_not_match_git_diff',
        'missing_pre_post_hash_chain',
        'receipt_chain_invalid',
        'verification_results_not_pass',
        'user_dirty_not_preserved',
        'french_generation_started',
        'proof_path_not_accepted',
      ],
    },
    tempFixtureRoot,
    proofProbes: probes,
    findings,
    notes: [
      'This audit tests P1B post-write proof handling with temp fixtures only; it does not create a real proof.',
      'A syntactically exact P1B post-write proof in /private/tmp is rejected because only the configured run proof path can be accepted.',
      'Proofs touching files outside the four-file P1B slice, missing hashes, missing receipts, failed verification, dirty-work loss or French generation are rejected.',
      'French generation and broad production apply remain blocked.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1b_post_write_proof_firewall_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1b_post_write_proof_firewall_audit.md');
  const outReadme = path.join(runDir, 'audits', 'p1b_post_write_proof_firewall', 'README.md');
  ensureDir(path.dirname(outReadme));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(outReadme, renderMarkdown(audit));

  console.log(`GUSTAV P1B post-write proof firewall audit: ${audit.status}`);
  console.log(`Real proof candidates: ${audit.summary.realProofCandidates}`);
  console.log(`Real proofs present: ${audit.summary.realProofsPresent}`);
  console.log(`Exact proof matches: ${audit.summary.exactProofMatches}`);
  console.log(`Temp fixtures: ${audit.summary.tempFixtures}`);
  console.log(`Rejected temp fixtures: ${audit.summary.rejectedTempFixtures}`);
  console.log(`Temp exact shape blocked by path: ${audit.summary.tempExactShapeBlockedByPath}`);
  console.log(`Outside-file fixtures rejected: ${audit.summary.outsideFileFixturesRejected}`);
  console.log(`Missing-hash fixtures rejected: ${audit.summary.missingHashFixturesRejected}`);
  console.log(`French-generation fixtures rejected: ${audit.summary.frenchGenerationFixturesRejected}`);
  console.log(`Firewall passed: ${audit.summary.firewallPassed ? 'yes' : 'no'}`);
  console.log(`Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);

  if (audit.status === 'BLOCK') process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
