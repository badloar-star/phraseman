import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Report = {
  schemaVersion: 'gustav-french-remote-verify-command-rehearsal-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  summary: {
    targetLocale: 'fr';
    rehearsalState: 'ready_waiting_for_read_only_credential' | 'credential_present_ready_to_run' | 'blocked_by_findings';
    acceptedCredentialOptions: string[];
    credentialPreflightStatus: string;
    credentialSource: string;
    dryRunReadinessStatus: string;
    dryRunPlannedChecks: number;
    dryRunSafeToRunLiveVerify: boolean;
    liveRemoteVerifyStatus: string;
    liveRemoteVerifyFoundObjects: number;
    liveRemoteVerifyHashCheckedObjects: number;
    commandSequenceSteps: number;
    nextCommandWhenCredentialPresent: string;
    credentialsPrintedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    serverObjectsModifiedByThisScript: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    readyForLiveRemoteVerifyWhenCredentialPresent: boolean;
    blockers: number;
    warnings: number;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  commandSequence: string[];
  requiredEnvContract: string[];
  forbiddenActions: string[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    credentialsPrintedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    serverObjectsModifiedByThisScript: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    productionApplyApproved: false;
  };
};

const ACCEPTED_CREDENTIAL_OPTIONS = [
  'PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN',
  'GOOGLE_APPLICATION_CREDENTIALS',
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function readJsonOrEmpty(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonObject;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

function b(value: JsonObject, key: string): boolean {
  return value[key] === true;
}

function summaryOf(report: JsonObject): JsonObject {
  return object(report.summary);
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

export function buildFrenchRemoteVerifyCommandRehearsal(input: {
  repoRoot: string;
  runDir: string;
  generatedAt?: string;
}): Report {
  const auditsDir = path.join(input.runDir, 'audits');
  const credentialPreflightPath = path.join(auditsDir, 'french_server_remote_credential_preflight_v2_packet.json');
  const credentialHandoffPath = path.join(auditsDir, 'french_server_remote_credential_handoff_v2_packet.json');
  const dryRunPath = path.join(auditsDir, 'french_remote_verify_dry_run_readiness_v2_packet.json');
  const parityPath = path.join(auditsDir, 'french_upload_remote_verify_parity_v2_packet.json');
  const liveVerifyPath = path.join(auditsDir, 'french_server_object_remote_verify_v2_packet.json');
  const completionPath = path.join(auditsDir, 'production_readiness_completion_audit_v2_packet.json');
  const masterPath = path.join(input.runDir, 'generated/fr/reviewer/french_reviewer_master_manifest.json');

  const credentialPreflight = readJsonOrEmpty(credentialPreflightPath);
  const credentialHandoff = readJsonOrEmpty(credentialHandoffPath);
  const dryRun = readJsonOrEmpty(dryRunPath);
  const parity = readJsonOrEmpty(parityPath);
  const liveVerify = readJsonOrEmpty(liveVerifyPath);
  const credentialPreflightSummary = summaryOf(credentialPreflight);
  const credentialHandoffSummary = summaryOf(credentialHandoff);
  const dryRunSummary = summaryOf(dryRun);
  const paritySummary = summaryOf(parity);
  const liveVerifySummary = summaryOf(liveVerify);
  const findings: Finding[] = [];

  for (const requiredPath of [credentialPreflightPath, credentialHandoffPath, dryRunPath, parityPath, liveVerifyPath, completionPath, masterPath]) {
    if (!fs.existsSync(requiredPath)) {
      addFinding(findings, 'blocker', 'required_input_missing', 'Remote verify command rehearsal requires this input artifact.', rel(input.repoRoot, requiredPath));
    }
  }

  const credentialMissingButExpected =
    s(credentialPreflight, 'status') === 'BLOCK' &&
    s(credentialPreflightSummary, 'credentialSource') === 'missing' &&
    !b(credentialPreflightSummary, 'readyForRemoteObjectVerifyCommand');
  const credentialReady =
    s(credentialPreflight, 'status') === 'PASS' &&
    ['access_token_env', 'service_account_file'].includes(s(credentialPreflightSummary, 'credentialSource')) &&
    b(credentialPreflightSummary, 'readyForRemoteObjectVerifyCommand') &&
    !b(credentialPreflightSummary, 'serverUploadAllowed') &&
    !b(credentialPreflightSummary, 'runtimeDownloadsEnabled') &&
    !b(credentialPreflightSummary, 'activationApproved') &&
    !b(credentialPreflightSummary, 'readyForApply');
  const handoffWaitingSafe =
    s(credentialHandoff, 'status') === 'PASS' &&
    s(credentialHandoffSummary, 'handoffState') === 'waiting_for_remote_credentials' &&
    s(credentialHandoffSummary, 'credentialSource') === 'missing' &&
    b(credentialHandoffSummary, 'remoteVerifyBlockedByCredentials') &&
    !b(credentialHandoffSummary, 'firebaseOrServerUploadStarted') &&
    !b(credentialHandoffSummary, 'runtimeDownloadsEnabled') &&
    !b(credentialHandoffSummary, 'activationApproved') &&
    !b(credentialHandoffSummary, 'readyForApply');
  const handoffCredentialReadySafe =
    s(credentialHandoff, 'status') === 'PASS' &&
    s(credentialHandoffSummary, 'handoffState') === 'credential_ready_for_remote_verify' &&
    ['access_token_env', 'service_account_file'].includes(s(credentialHandoffSummary, 'credentialSource')) &&
    b(credentialHandoffSummary, 'credentialPreflightReady') &&
    !b(credentialHandoffSummary, 'remoteVerifyBlockedByCredentials') &&
    !b(credentialHandoffSummary, 'firebaseOrServerUploadStarted') &&
    !b(credentialHandoffSummary, 'runtimeDownloadsEnabled') &&
    !b(credentialHandoffSummary, 'activationApproved') &&
    !b(credentialHandoffSummary, 'readyForApply');
  const credentialStateSafe = credentialMissingButExpected || credentialReady;
  const handoffSafe = handoffWaitingSafe || handoffCredentialReadySafe;
  const dryRunReady =
    s(dryRun, 'status') === 'PASS' &&
    n(dryRunSummary, 'plannedChecks') === 36 &&
    n(dryRunSummary, 'scopedServerPaths') === 36 &&
    n(dryRunSummary, 'payloadShaMatchesUploadEvidence') === 36 &&
    n(dryRunSummary, 'payloadByteMatchesUploadEvidence') === 36 &&
    b(dryRunSummary, 'safeToRunLiveVerifyWhenCredentialPresent') &&
    !b(dryRunSummary, 'firebaseOrServerUploadStarted') &&
    !b(dryRunSummary, 'runtimeDownloadsEnabled') &&
    !b(dryRunSummary, 'activationApproved') &&
    !b(dryRunSummary, 'readyForApply');

  if (!credentialStateSafe) {
    addFinding(findings, 'blocker', 'credential_preflight_unexpected_state', 'Credential preflight should be either missing-credential BLOCK or credential-ready PASS with production flags closed.', rel(input.repoRoot, credentialPreflightPath));
  }
  if (!handoffSafe) {
    addFinding(findings, 'blocker', 'credential_handoff_not_safe', 'Credential handoff must be PASS and safe waiting_for_remote_credentials or credential_ready_for_remote_verify.', rel(input.repoRoot, credentialHandoffPath));
  }
  if (!dryRunReady) {
    addFinding(findings, 'blocker', 'remote_verify_dry_run_not_ready', 'Dry-run readiness must prove 36 scoped checks and safe live verify before credential use.', rel(input.repoRoot, dryRunPath));
  }
  const parityReady =
    s(parity, 'status') === 'PASS' &&
    n(paritySummary, 'matchedServerPaths') === 36 &&
    n(paritySummary, 'shaMatches') === 36 &&
    n(paritySummary, 'byteMatches') === 36 &&
    b(paritySummary, 'readyForRemoteObjectVerify') &&
    !b(paritySummary, 'firebaseOrServerUploadStarted') &&
    !b(paritySummary, 'runtimeDownloadsEnabled') &&
    !b(paritySummary, 'activationApproved') &&
    !b(paritySummary, 'readyForApply');
  if (!parityReady) {
    addFinding(findings, 'blocker', 'upload_remote_verify_parity_not_ready', 'Upload evidence and remote verify dry-run must match 36/36 paths, sha and bytes before live verify.', rel(input.repoRoot, parityPath));
  }

  const commandSequence = [
    'npx tsx scripts\\gustav_french_server_remote_credential_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_french_remote_verify_dry_run_readiness_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_french_upload_remote_verify_parity_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_french_server_object_remote_verify_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_french_remote_verify_pass_completion_simulation_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_production_readiness_completion_audit_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_french_post_remote_verify_transition_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_french_final_blocker_dependency_map_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_final_preapproval_evidence_hash_lock_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_production_activation_sequence_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_production_apply_transaction_contract_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_post_apply_rollback_guard_contract_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_exact_approval_apply_rehearsal_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_exact_approval_wait_state_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_master_next_pass_consistency_refresh_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
  ];

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const readyForLiveRemoteVerifyWhenCredentialPresent = blockers === 0;
  const rehearsalState =
    blockers > 0 ? 'blocked_by_findings' : credentialReady ? 'credential_present_ready_to_run' : 'ready_waiting_for_read_only_credential';

  return {
    schemaVersion: 'gustav-french-remote-verify-command-rehearsal-v2-packet-v0',
    runId: path.basename(input.runDir),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    summary: {
      targetLocale: 'fr',
      rehearsalState,
      acceptedCredentialOptions: [...ACCEPTED_CREDENTIAL_OPTIONS],
      credentialPreflightStatus: s(credentialPreflight, 'status'),
      credentialSource: s(credentialPreflightSummary, 'credentialSource'),
      dryRunReadinessStatus: s(dryRun, 'status'),
      dryRunPlannedChecks: n(dryRunSummary, 'plannedChecks'),
      dryRunSafeToRunLiveVerify: b(dryRunSummary, 'safeToRunLiveVerifyWhenCredentialPresent'),
      liveRemoteVerifyStatus: s(liveVerify, 'status'),
      liveRemoteVerifyFoundObjects: n(liveVerifySummary, 'foundObjectCount'),
      liveRemoteVerifyHashCheckedObjects: n(liveVerifySummary, 'hashCheckedObjects') || n(liveVerifySummary, 'hashCheckedCount'),
      commandSequenceSteps: commandSequence.length,
      nextCommandWhenCredentialPresent: commandSequence[0],
      credentialsPrintedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      serverObjectsModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      readyForLiveRemoteVerifyWhenCredentialPresent,
      blockers,
      warnings,
    },
    inputs: {
      frenchServerRemoteCredentialPreflightV2Packet: rel(input.repoRoot, credentialPreflightPath),
      frenchServerRemoteCredentialHandoffV2Packet: rel(input.repoRoot, credentialHandoffPath),
      frenchRemoteVerifyDryRunReadinessV2Packet: rel(input.repoRoot, dryRunPath),
      frenchUploadRemoteVerifyParityV2Packet: rel(input.repoRoot, parityPath),
      frenchServerObjectRemoteVerifyV2Packet: rel(input.repoRoot, liveVerifyPath),
      productionReadinessCompletionAuditV2Packet: rel(input.repoRoot, completionPath),
      frenchReviewerMasterManifest: rel(input.repoRoot, masterPath),
    },
    outputs: {},
    commandSequence,
    requiredEnvContract: [
      'Provide exactly one read-only credential source: PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN or GOOGLE_APPLICATION_CREDENTIALS.',
      'Do not print, paste, commit or write token/private-key/client-email values into reports, prompts, logs or markdown.',
      'After credential preflight becomes PASS, run live remote verify before any activation/apply/runtime-download gate.',
      'After remote verify PASS, rebuild P49/P50/P45-P48/P51/P65/master/next evidence before any exact approval/apply step.',
    ],
    forbiddenActions: [
      'No Firebase/server upload from this rehearsal.',
      'No app apply or production file mutation.',
      'No runtime download enablement.',
      'No activationApproved or readyForApply flag changes.',
      'No storage/cloud migration.',
    ],
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      credentialsPrintedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      serverObjectsModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      productionApplyApproved: false,
    },
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav French Remote Verify Command Rehearsal V2',
    '',
    `- Status: ${report.status}`,
    `- Rehearsal state: ${report.summary.rehearsalState}`,
    `- Credential source: ${report.summary.credentialSource}`,
    `- Dry-run checks/safe: ${report.summary.dryRunPlannedChecks}/${report.summary.dryRunSafeToRunLiveVerify ? 'yes' : 'no'}`,
    `- Live found/hash: ${report.summary.liveRemoteVerifyFoundObjects}/${report.summary.liveRemoteVerifyHashCheckedObjects}`,
    `- Ready for live verify when credential present: ${report.summary.readyForLiveRemoteVerifyWhenCredentialPresent ? 'yes' : 'no'}`,
    '',
    '## Command Sequence',
    '',
    ...report.commandSequence.map((command, index) => `${index + 1}. \`${command}\``),
    '',
    '## Required Env Contract',
    '',
    ...report.requiredEnvContract.map((rule) => `- ${rule}`),
    '',
    '## Forbidden Actions',
    '',
    ...report.forbiddenActions.map((rule) => `- ${rule}`),
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);
  const runDir = path.resolve(repoRoot, runArg);
  const outputJsonPath = path.join(runDir, 'audits', 'french_remote_verify_command_rehearsal_v2_packet.json');
  const outputMdPath = path.join(runDir, 'audits', 'french_remote_verify_command_rehearsal_v2_packet.md');
  const report = buildFrenchRemoteVerifyCommandRehearsal({ repoRoot, runDir });
  report.outputs = {
    packet: rel(repoRoot, outputJsonPath),
    markdown: rel(repoRoot, outputMdPath),
  };
  ensureDir(path.dirname(outputJsonPath));
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV French remote verify command rehearsal V2 packet: ${report.status}`);
  console.log(`Rehearsal state: ${report.summary.rehearsalState}`);
  console.log(`Ready when credential present: ${report.summary.readyForLiveRemoteVerifyWhenCredentialPresent ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

if (require.main === module) {
  main();
}
