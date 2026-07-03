import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Report = {
  schemaVersion: 'gustav-french-remote-verify-live-handoff-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  summary: {
    targetLocale: 'fr';
    handoffState: 'ready_waiting_for_read_only_credential' | 'credential_present_ready_to_run' | 'blocked_by_findings';
    acceptedCredentialOptions: string[];
    credentialSource: 'access_token_env' | 'service_account_file' | 'missing';
    multipleCredentialSourcesPresent: boolean;
    dryRunReady: boolean;
    uploadRemoteVerifyParityReady: boolean;
    commandRehearsalReady: boolean;
    uploadEvidenceReady: boolean;
    expectedRemoteObjects: number;
    expectedHashChecks: number;
    currentRemoteVerifyStatus: string;
    currentRemoteFoundObjects: number;
    currentRemoteHashChecks: number;
    liveVerifyCommandReady: boolean;
    postVerifyChainReady: boolean;
    credentialsPrintedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    serverObjectsModifiedByThisScript: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    blockers: number;
    warnings: number;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  liveRunbook: {
    credentialPreflight: string;
    remoteObjectVerify: string;
    passCompletionSimulation: string;
    completionAudit: string;
    postRemoteVerifyTransition: string;
    finalBlockerMap: string;
    finalPreapprovalHashLock: string;
    activationSequencePreflight: string;
    applyTransactionContract: string;
    postApplyRollbackGuard: string;
    exactApprovalApplyRehearsal: string;
    exactApprovalWaitState: string;
    masterNextPassConsistency: string;
    masterManifest: string;
    nextPassContract: string;
  };
  expectedPassCriteria: string[];
  deniedActions: string[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    approvalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    serverObjectsModifiedByThisScript: false;
    credentialsPrintedByThisScript: false;
    runtimeDownloadsEnabledByThisScript: false;
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

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
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

function credentialStateFromEnv(): Pick<Report['summary'], 'credentialSource' | 'multipleCredentialSourcesPresent'> {
  const accessTokenPresent = Boolean(process.env.PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN);
  const serviceAccountPresent = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (accessTokenPresent && serviceAccountPresent) {
    return { credentialSource: 'missing', multipleCredentialSourcesPresent: true };
  }
  if (accessTokenPresent) return { credentialSource: 'access_token_env', multipleCredentialSourcesPresent: false };
  if (serviceAccountPresent) return { credentialSource: 'service_account_file', multipleCredentialSourcesPresent: false };
  return { credentialSource: 'missing', multipleCredentialSourcesPresent: false };
}

export function buildFrenchRemoteVerifyLiveHandoff(input: {
  repoRoot: string;
  runDir: string;
  generatedAt?: string;
  credentialSource?: Report['summary']['credentialSource'];
  multipleCredentialSourcesPresent?: boolean;
}): Report {
  const auditsDir = path.join(input.runDir, 'audits');
  const uploadEvidencePath = path.join(auditsDir, 'french_server_pack_upload_evidence_v2_packet.json');
  const dryRunPath = path.join(auditsDir, 'french_remote_verify_dry_run_readiness_v2_packet.json');
  const parityPath = path.join(auditsDir, 'french_upload_remote_verify_parity_v2_packet.json');
  const commandRehearsalPath = path.join(auditsDir, 'french_remote_verify_command_rehearsal_v2_packet.json');
  const credentialPreflightPath = path.join(auditsDir, 'french_server_remote_credential_preflight_v2_packet.json');
  const remoteVerifyPath = path.join(auditsDir, 'french_server_object_remote_verify_v2_packet.json');
  const uploadEvidence = readJsonOrEmpty(uploadEvidencePath);
  const dryRun = readJsonOrEmpty(dryRunPath);
  const parity = readJsonOrEmpty(parityPath);
  const commandRehearsal = readJsonOrEmpty(commandRehearsalPath);
  const credentialPreflight = readJsonOrEmpty(credentialPreflightPath);
  const remoteVerify = readJsonOrEmpty(remoteVerifyPath);
  const uploadEvidenceSummary = summaryOf(uploadEvidence);
  const dryRunSummary = summaryOf(dryRun);
  const paritySummary = summaryOf(parity);
  const commandRehearsalSummary = summaryOf(commandRehearsal);
  const credentialPreflightSummary = summaryOf(credentialPreflight);
  const remoteVerifySummary = summaryOf(remoteVerify);
  const findings: Finding[] = [];

  for (const requiredPath of [uploadEvidencePath, dryRunPath, parityPath, commandRehearsalPath, credentialPreflightPath, remoteVerifyPath]) {
    if (!fs.existsSync(requiredPath)) {
      addFinding(findings, 'blocker', 'required_input_missing', 'Live remote verify handoff requires this input artifact.', rel(input.repoRoot, requiredPath));
    }
  }

  const uploadEvidenceReady =
    s(uploadEvidence, 'status') === 'PASS' &&
    n(uploadEvidenceSummary, 'uploadObjects') === 36 &&
    n(uploadEvidenceSummary, 'localPayloadShaMatches') === 12 &&
    n(uploadEvidenceSummary, 'localPayloadByteMatches') === 12 &&
    b(uploadEvidenceSummary, 'readyForRemoteObjectVerify');
  if (!uploadEvidenceReady) {
    addFinding(findings, 'blocker', 'upload_evidence_not_ready', 'Upload evidence must prove all 36 planned French objects before live remote verify handoff.', rel(input.repoRoot, uploadEvidencePath));
  }

  const dryRunReady =
    s(dryRun, 'status') === 'PASS' &&
    n(dryRunSummary, 'plannedChecks') === 36 &&
    n(dryRunSummary, 'scopedServerPaths') === 36 &&
    n(dryRunSummary, 'payloadShaMatchesUploadEvidence') === 36 &&
    n(dryRunSummary, 'payloadByteMatchesUploadEvidence') === 36 &&
    b(dryRunSummary, 'safeToRunLiveVerifyWhenCredentialPresent') &&
    !b(dryRunSummary, 'runtimeDownloadsEnabled') &&
    !b(dryRunSummary, 'activationApproved') &&
    !b(dryRunSummary, 'readyForApply');
  if (!dryRunReady) {
    addFinding(findings, 'blocker', 'dry_run_not_ready', 'Dry-run readiness must prove the exact 36 read-only remote object checks.', rel(input.repoRoot, dryRunPath));
  }
  const uploadRemoteVerifyParityReady =
    s(parity, 'status') === 'PASS' &&
    n(paritySummary, 'matchedServerPaths') === 36 &&
    n(paritySummary, 'shaMatches') === 36 &&
    n(paritySummary, 'byteMatches') === 36 &&
    b(paritySummary, 'readyForRemoteObjectVerify') &&
    !b(paritySummary, 'firebaseOrServerUploadStarted') &&
    !b(paritySummary, 'runtimeDownloadsEnabled') &&
    !b(paritySummary, 'activationApproved') &&
    !b(paritySummary, 'readyForApply');
  if (!uploadRemoteVerifyParityReady) {
    addFinding(findings, 'blocker', 'upload_remote_verify_parity_not_ready', 'Upload evidence and remote dry-run parity must be PASS before live remote verify.', rel(input.repoRoot, parityPath));
  }

  const commandRehearsalReady =
    s(commandRehearsal, 'status') === 'PASS' &&
    b(commandRehearsalSummary, 'readyForLiveRemoteVerifyWhenCredentialPresent') &&
    !b(commandRehearsalSummary, 'credentialsPrintedByThisScript') &&
    !b(commandRehearsalSummary, 'firebaseOrServerUploadStarted') &&
    !b(commandRehearsalSummary, 'serverObjectsModifiedByThisScript') &&
    !b(commandRehearsalSummary, 'runtimeDownloadsEnabled') &&
    !b(commandRehearsalSummary, 'activationApproved') &&
    !b(commandRehearsalSummary, 'readyForApply');
  if (!commandRehearsalReady) {
    addFinding(findings, 'blocker', 'command_rehearsal_not_ready', 'Command rehearsal must be PASS and keep all production mutation flags closed.', rel(input.repoRoot, commandRehearsalPath));
  }

  const envCredentialState = credentialStateFromEnv();
  const credentialSource = input.credentialSource ?? envCredentialState.credentialSource;
  const multipleCredentialSourcesPresent = input.multipleCredentialSourcesPresent ?? envCredentialState.multipleCredentialSourcesPresent;
  const credentialPresent = !multipleCredentialSourcesPresent && (credentialSource === 'access_token_env' || credentialSource === 'service_account_file');
  if (multipleCredentialSourcesPresent) {
    addFinding(findings, 'blocker', 'remote_verify_multiple_credential_sources', 'Live remote verify handoff requires exactly one credential source: PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN or GOOGLE_APPLICATION_CREDENTIALS, not both.');
  }
  const credentialPreflightClosed =
    !b(credentialPreflightSummary, 'serverUploadAllowed') &&
    !b(credentialPreflightSummary, 'runtimeDownloadsEnabled') &&
    !b(credentialPreflightSummary, 'activationApproved') &&
    !b(credentialPreflightSummary, 'readyForApply');
  if (!credentialPreflightClosed) {
    addFinding(findings, 'blocker', 'credential_preflight_opened_production_flag', 'Credential preflight artifact must not open upload/runtime/activation/apply flags.', rel(input.repoRoot, credentialPreflightPath));
  }

  const currentRemoteVerifyStatus = s(remoteVerify, 'status');
  const currentRemoteFoundObjects = n(remoteVerifySummary, 'foundObjectCount');
  const currentRemoteHashChecks = n(remoteVerifySummary, 'hashCheckedObjects') || n(remoteVerifySummary, 'hashCheckedCount');
  const liveVerifyCommandReady = uploadEvidenceReady && dryRunReady && uploadRemoteVerifyParityReady && commandRehearsalReady && credentialPreflightClosed;
  const postVerifyScripts = [
    'gustav_french_server_remote_credential_preflight_v2_packet.ts',
    'gustav_french_server_object_remote_verify_v2_packet.ts',
    'gustav_french_remote_verify_pass_completion_simulation_v2_packet.ts',
    'gustav_production_readiness_completion_audit_v2_packet.ts',
    'gustav_french_post_remote_verify_transition_v2_packet.ts',
    'gustav_french_final_blocker_dependency_map_v2_packet.ts',
    'gustav_final_preapproval_evidence_hash_lock_v2_packet.ts',
    'gustav_production_activation_sequence_preflight_v2_packet.ts',
    'gustav_production_apply_transaction_contract_v2_packet.ts',
    'gustav_post_apply_rollback_guard_contract_v2_packet.ts',
    'gustav_exact_approval_apply_rehearsal_v2_packet.ts',
    'gustav_exact_approval_wait_state_v2_packet.ts',
    'gustav_master_next_pass_consistency_refresh_v2_packet.ts',
    'gustav_french_reviewer_master_manifest.ts',
    'gustav_next_pass_goal_contract_packet.ts',
  ];
  const postVerifyChainReady = liveVerifyCommandReady && postVerifyScripts.length === 15;

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const handoffState: Report['summary']['handoffState'] =
    blockers > 0
      ? 'blocked_by_findings'
      : credentialPresent
        ? 'credential_present_ready_to_run'
        : 'ready_waiting_for_read_only_credential';

  const runArg = 'docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1';
  const targetArg = '--target fr';
  const liveRunbook = {
    credentialPreflight: `npx tsx scripts\\gustav_french_server_remote_credential_preflight_v2_packet.ts --run ${runArg} ${targetArg}`,
    remoteObjectVerify: `npx tsx scripts\\gustav_french_server_object_remote_verify_v2_packet.ts --run ${runArg} ${targetArg}`,
    passCompletionSimulation: `npx tsx scripts\\gustav_french_remote_verify_pass_completion_simulation_v2_packet.ts --run ${runArg} ${targetArg}`,
    completionAudit: `npx tsx scripts\\gustav_production_readiness_completion_audit_v2_packet.ts --run ${runArg} ${targetArg}`,
    postRemoteVerifyTransition: `npx tsx scripts\\gustav_french_post_remote_verify_transition_v2_packet.ts --run ${runArg} ${targetArg}`,
    finalBlockerMap: `npx tsx scripts\\gustav_french_final_blocker_dependency_map_v2_packet.ts --run ${runArg} ${targetArg}`,
    finalPreapprovalHashLock: `npx tsx scripts\\gustav_final_preapproval_evidence_hash_lock_v2_packet.ts --run ${runArg} ${targetArg}`,
    activationSequencePreflight: `npx tsx scripts\\gustav_production_activation_sequence_preflight_v2_packet.ts --run ${runArg} ${targetArg}`,
    applyTransactionContract: `npx tsx scripts\\gustav_production_apply_transaction_contract_v2_packet.ts --run ${runArg} ${targetArg}`,
    postApplyRollbackGuard: `npx tsx scripts\\gustav_post_apply_rollback_guard_contract_v2_packet.ts --run ${runArg} ${targetArg}`,
    exactApprovalApplyRehearsal: `npx tsx scripts\\gustav_exact_approval_apply_rehearsal_v2_packet.ts --run ${runArg} ${targetArg}`,
    exactApprovalWaitState: `npx tsx scripts\\gustav_exact_approval_wait_state_v2_packet.ts --run ${runArg} ${targetArg}`,
    masterNextPassConsistency: `npx tsx scripts\\gustav_master_next_pass_consistency_refresh_v2_packet.ts --run ${runArg} ${targetArg}`,
    masterManifest: `npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run ${runArg} ${targetArg}`,
    nextPassContract: `npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run ${runArg} ${targetArg}`,
  };

  return {
    schemaVersion: 'gustav-french-remote-verify-live-handoff-v2-packet-v0',
    runId: path.basename(input.runDir),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    summary: {
      targetLocale: 'fr',
      handoffState,
      acceptedCredentialOptions: [...ACCEPTED_CREDENTIAL_OPTIONS],
      credentialSource,
      multipleCredentialSourcesPresent,
      dryRunReady,
      uploadRemoteVerifyParityReady,
      commandRehearsalReady,
      uploadEvidenceReady,
      expectedRemoteObjects: 36,
      expectedHashChecks: 36,
      currentRemoteVerifyStatus,
      currentRemoteFoundObjects,
      currentRemoteHashChecks,
      liveVerifyCommandReady,
      postVerifyChainReady,
      credentialsPrintedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      serverObjectsModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      blockers,
      warnings,
    },
    inputs: {
      frenchServerPackUploadEvidenceV2Packet: rel(input.repoRoot, uploadEvidencePath),
      frenchRemoteVerifyDryRunReadinessV2Packet: rel(input.repoRoot, dryRunPath),
      frenchUploadRemoteVerifyParityV2Packet: rel(input.repoRoot, parityPath),
      frenchRemoteVerifyCommandRehearsalV2Packet: rel(input.repoRoot, commandRehearsalPath),
      frenchServerRemoteCredentialPreflightV2Packet: rel(input.repoRoot, credentialPreflightPath),
      frenchServerObjectRemoteVerifyV2Packet: rel(input.repoRoot, remoteVerifyPath),
    },
    outputs: {},
    liveRunbook,
    expectedPassCriteria: [
      'credentialPreflight.status=PASS with credentialSource access_token_env or service_account_file',
      'remoteObjectVerify.status=PASS',
      'remoteObjectVerify.foundObjectCount=36',
      'remoteObjectVerify.hashCheckedCount=36',
      'remoteObjectVerify.unexpectedObjects=0',
      'remoteObjectVerify.missingObjects=0',
      'remoteObjectVerify.sizeMismatches=0',
      'remoteObjectVerify.hashMismatches=0',
      'completionAudit.requirementsMissing=0 before exact approval locks are handled',
      'finalPreapprovalHashLock refreshes after completionAudit before activation sequence preflight',
      'P45/P46/P47/P51/P65 rehearsal packets are rebuilt after remote verify before any exact approval/apply',
    ],
    deniedActions: [
      'Do not print token/private-key contents.',
      'Do not run upload execution with real write sentinel.',
      'Do not enable runtime downloads.',
      'Do not create approval receipt/hash lock.',
      'Do not run production apply.',
      'Do not change storage/cloud migration flags.',
    ],
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      approvalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      serverObjectsModifiedByThisScript: false,
      credentialsPrintedByThisScript: false,
      runtimeDownloadsEnabledByThisScript: false,
      productionApplyApproved: false,
    },
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav French Remote Verify Live Handoff V2',
    '',
    `- Status: ${report.status}`,
    `- Handoff state: ${report.summary.handoffState}`,
    `- Credential source: ${report.summary.credentialSource}`,
    `- Dry-run ready: ${report.summary.dryRunReady ? 'yes' : 'no'}`,
    `- Upload/remote parity ready: ${report.summary.uploadRemoteVerifyParityReady ? 'yes' : 'no'}`,
    `- Command rehearsal ready: ${report.summary.commandRehearsalReady ? 'yes' : 'no'}`,
    `- Upload evidence ready: ${report.summary.uploadEvidenceReady ? 'yes' : 'no'}`,
    `- Live verify command ready: ${report.summary.liveVerifyCommandReady ? 'yes' : 'no'}`,
    `- Current remote found/hash: ${report.summary.currentRemoteFoundObjects}/${report.summary.currentRemoteHashChecks}`,
    '',
    '## Live Runbook',
    '',
  ];
  for (const command of Object.values(report.liveRunbook)) lines.push(`- \`${command}\``);
  lines.push('', '## Expected Pass Criteria', '');
  for (const item of report.expectedPassCriteria) lines.push(`- ${item}`);
  lines.push('', '## Denied Actions', '');
  for (const item of report.deniedActions) lines.push(`- ${item}`);
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push('', '## Safety', '', '- Read-only handoff only: no upload, no server mutation, no runtime download activation, no approval/apply.', '');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);
  const runDir = path.resolve(repoRoot, runArg);
  const outputJsonPath = path.join(runDir, 'audits', 'french_remote_verify_live_handoff_v2_packet.json');
  const outputMdPath = path.join(runDir, 'audits', 'french_remote_verify_live_handoff_v2_packet.md');
  const report = buildFrenchRemoteVerifyLiveHandoff({ repoRoot, runDir });
  report.outputs = {
    packet: rel(repoRoot, outputJsonPath),
    markdown: rel(repoRoot, outputMdPath),
  };
  ensureDir(path.dirname(outputJsonPath));
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV French remote verify live handoff V2 packet: ${report.status}`);
  console.log(`Handoff state: ${report.summary.handoffState}`);
  console.log(`Live verify command ready: ${report.summary.liveVerifyCommandReady ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

if (require.main === module) {
  main();
}
