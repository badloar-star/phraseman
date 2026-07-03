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

type RootCause = {
  id: string;
  state: 'resolved' | 'missing_external_evidence' | 'production_locked' | 'safe_hold';
  title: string;
  evidence: string[];
  blocks: string[];
  canResolveWithoutProductionWrites: boolean;
  nextAction: string;
};

type Report = {
  schemaVersion: 'gustav-french-final-blocker-dependency-map-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  summary: {
    targetLocale: 'fr';
    productionReady: boolean;
    activationApproved: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: false;
    rootCauses: number;
    activeRootCauses: number;
    directMissingRequirements: number;
    productionLockedRequirements: number;
    masterBlockerFindings: number;
    remoteVerifyFoundObjects: number;
    remoteVerifyHashCheckedObjects: number;
    remoteVerifyDryRunReady: boolean;
    remoteVerifyDryRunPlannedChecks: number;
    uploadRemoteVerifyParityReady: boolean;
    uploadRemoteVerifyParityMatchedServerPaths: number;
    uploadRemoteVerifyParityShaMatches: number;
    uploadRemoteVerifyParityByteMatches: number;
    remoteVerifyCommandRehearsalReady: boolean;
    remoteVerifyLiveHandoffReady: boolean;
    remoteVerifyLiveHandoffState: string;
    postRemoteVerifyTransitionReady: boolean;
    postRemoteVerifyTransitionState: string;
    appSurfaceParityReady: boolean;
    appSurfaceRemotePackSurfaces: number;
    appSurfaceRequiredRemotePackSurfaces: number;
    appSurfaceDevNavigationProbesPassed: number;
    appSurfaceDevNavigationProbes: number;
    challengeDailyArenaCoveredByNavigationGuard: boolean;
    runtimeRegistrationServerLayoutReady: boolean;
    runtimeRegistrationRequiredServerObjects: number;
    runtimeRegistrationMissingUploadEvidenceObjects: number;
    runtimeRegistrationValidManifests: number;
    credentialHandoffState: string;
    credentialSource: string;
    credentialHandoffSafe: boolean;
    nextRootCauseToClose: string;
    canContinueWithoutServerCredentials: boolean;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    storageOrCloudMigrationStarted: false;
    blockers: number;
    warnings: number;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  rootCauses: RootCause[];
  derivedMasterBlockerBuckets: Record<string, number>;
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    approvalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabledByThisScript: false;
    storageOrCloudMigrationStarted: false;
    productionApplyApproved: false;
  };
};

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

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
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

function findingBucket(code: string): string {
  if (code.includes('french_server_object_remote_verify') || code.includes('production_readiness_completion')) {
    return 'remote_server_verify';
  }
  if (code.includes('exact_approval_receipt') || code.includes('exact_approval_wait') || code.includes('approval_wait')) {
    return 'exact_approval_wait';
  }
  if (code.includes('production_activation_sequence') || code.includes('production_apply_transaction') || code.includes('post_apply_rollback')) {
    return 'downstream_activation_apply';
  }
  if (code.includes('final_preapproval')) {
    return 'final_preapproval_hash_lock';
  }
  return 'other';
}

function countBuckets(findings: JsonObject[]): Record<string, number> {
  return findings.reduce<Record<string, number>>((acc, finding) => {
    const bucket = findingBucket(s(finding, 'code'));
    acc[bucket] = (acc[bucket] ?? 0) + 1;
    return acc;
  }, {});
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

export function buildFrenchFinalBlockerDependencyMap(input: {
  repoRoot: string;
  runDir: string;
  generatedAt?: string;
}): Report {
  const auditsDir = path.join(input.runDir, 'audits');
  const masterPath = path.join(input.runDir, 'generated/fr/reviewer/french_reviewer_master_manifest.json');
  const completionPath = path.join(auditsDir, 'production_readiness_completion_audit_v2_packet.json');
  const credentialHandoffPath = path.join(auditsDir, 'french_server_remote_credential_handoff_v2_packet.json');
  const remoteVerifyDryRunPath = path.join(auditsDir, 'french_remote_verify_dry_run_readiness_v2_packet.json');
  const uploadRemoteVerifyParityPath = path.join(auditsDir, 'french_upload_remote_verify_parity_v2_packet.json');
  const remoteVerifyCommandRehearsalPath = path.join(auditsDir, 'french_remote_verify_command_rehearsal_v2_packet.json');
  const remoteVerifyLiveHandoffPath = path.join(auditsDir, 'french_remote_verify_live_handoff_v2_packet.json');
  const postRemoteVerifyTransitionPath = path.join(auditsDir, 'french_post_remote_verify_transition_v2_packet.json');
  const remoteVerifyPath = path.join(auditsDir, 'french_server_object_remote_verify_v2_packet.json');
  const appSurfaceParityPath = path.join(auditsDir, 'french_app_surface_parity_v2_packet.json');
  const runtimeRegistrationServerLayoutPath = path.join(auditsDir, 'french_runtime_registration_server_layout_v2_packet.json');

  const master = readJsonOrEmpty(masterPath);
  const completion = readJsonOrEmpty(completionPath);
  const credentialHandoff = readJsonOrEmpty(credentialHandoffPath);
  const remoteVerifyDryRun = readJsonOrEmpty(remoteVerifyDryRunPath);
  const uploadRemoteVerifyParity = readJsonOrEmpty(uploadRemoteVerifyParityPath);
  const remoteVerifyCommandRehearsal = readJsonOrEmpty(remoteVerifyCommandRehearsalPath);
  const remoteVerifyLiveHandoff = readJsonOrEmpty(remoteVerifyLiveHandoffPath);
  const postRemoteVerifyTransition = readJsonOrEmpty(postRemoteVerifyTransitionPath);
  const remoteVerify = readJsonOrEmpty(remoteVerifyPath);
  const appSurfaceParity = readJsonOrEmpty(appSurfaceParityPath);
  const runtimeRegistrationServerLayout = readJsonOrEmpty(runtimeRegistrationServerLayoutPath);
  const masterSummary = summaryOf(master);
  const completionSummary = summaryOf(completion);
  const credentialHandoffSummary = summaryOf(credentialHandoff);
  const remoteVerifyDryRunSummary = summaryOf(remoteVerifyDryRun);
  const uploadRemoteVerifyParitySummary = summaryOf(uploadRemoteVerifyParity);
  const remoteVerifyCommandRehearsalSummary = summaryOf(remoteVerifyCommandRehearsal);
  const remoteVerifyLiveHandoffSummary = summaryOf(remoteVerifyLiveHandoff);
  const postRemoteVerifyTransitionSummary = summaryOf(postRemoteVerifyTransition);
  const remoteVerifySummary = summaryOf(remoteVerify);
  const appSurfaceParitySummary = summaryOf(appSurfaceParity);
  const runtimeRegistrationServerLayoutSummary = summaryOf(runtimeRegistrationServerLayout);
  const findings: Finding[] = [];

  for (const requiredPath of [masterPath, completionPath, credentialHandoffPath, remoteVerifyDryRunPath, uploadRemoteVerifyParityPath, remoteVerifyCommandRehearsalPath, remoteVerifyLiveHandoffPath, postRemoteVerifyTransitionPath, remoteVerifyPath, appSurfaceParityPath, runtimeRegistrationServerLayoutPath]) {
    if (!fs.existsSync(requiredPath)) {
      addFinding(findings, 'blocker', 'required_input_missing', 'Final blocker dependency map requires this input artifact.', rel(input.repoRoot, requiredPath));
    }
  }

  const masterBlockerFindings = arr<JsonObject>(master.findings).filter((finding) => s(finding, 'severity') === 'blocker');
  const missingRequirements = arr<JsonObject>(completion.requirements).filter((item) => s(item, 'status') === 'missing');
  const lockedRequirements = arr<JsonObject>(completion.requirements).filter((item) => s(item, 'status') === 'production_locked');
  const credentialHandoffWaitingSafe =
    s(credentialHandoffSummary, 'handoffState') === 'waiting_for_remote_credentials' &&
    s(credentialHandoffSummary, 'credentialSource') === 'missing' &&
    b(credentialHandoffSummary, 'remoteVerifyBlockedByCredentials');
  const credentialHandoffReadySafe =
    s(credentialHandoffSummary, 'handoffState') === 'credential_ready_for_remote_verify' &&
    ['access_token_env', 'service_account_file'].includes(s(credentialHandoffSummary, 'credentialSource')) &&
    b(credentialHandoffSummary, 'credentialPreflightReady') &&
    !b(credentialHandoffSummary, 'remoteVerifyBlockedByCredentials');
  const credentialHandoffSafe =
    s(credentialHandoff, 'status') === 'PASS' &&
    (credentialHandoffWaitingSafe || credentialHandoffReadySafe) &&
    !b(credentialHandoffSummary, 'firebaseOrServerUploadStarted') &&
    !b(credentialHandoffSummary, 'runtimeDownloadsEnabled') &&
    !b(credentialHandoffSummary, 'activationApproved') &&
    !b(credentialHandoffSummary, 'readyForApply');

  if (!credentialHandoffSafe) {
    addFinding(findings, 'blocker', 'credential_handoff_not_safe_wait', 'Credential handoff must be PASS, secret-safe, waiting_for_remote_credentials or credential_ready_for_remote_verify, and production-closed while remote verify is missing.', rel(input.repoRoot, credentialHandoffPath));
  }
  const remoteVerifyDryRunReady =
    s(remoteVerifyDryRun, 'status') === 'PASS' &&
    n(remoteVerifyDryRunSummary, 'plannedChecks') === 36 &&
    n(remoteVerifyDryRunSummary, 'scopedServerPaths') === 36 &&
    n(remoteVerifyDryRunSummary, 'payloadShaMatchesUploadEvidence') === 36 &&
    n(remoteVerifyDryRunSummary, 'payloadByteMatchesUploadEvidence') === 36 &&
    b(remoteVerifyDryRunSummary, 'safeToRunLiveVerifyWhenCredentialPresent') &&
    !b(remoteVerifyDryRunSummary, 'firebaseOrServerUploadStarted') &&
    !b(remoteVerifyDryRunSummary, 'runtimeDownloadsEnabled') &&
    !b(remoteVerifyDryRunSummary, 'activationApproved') &&
    !b(remoteVerifyDryRunSummary, 'readyForApply');
  if (!remoteVerifyDryRunReady) {
    addFinding(findings, 'blocker', 'remote_verify_dry_run_not_ready', 'Remote verify dry-run readiness must prove the exact 36 scoped FR server object checks before live credentials are used.', rel(input.repoRoot, remoteVerifyDryRunPath));
  }
  const uploadRemoteVerifyParityReady =
    s(uploadRemoteVerifyParity, 'status') === 'PASS' &&
    n(uploadRemoteVerifyParitySummary, 'matchedServerPaths') === 36 &&
    n(uploadRemoteVerifyParitySummary, 'shaMatches') === 36 &&
    n(uploadRemoteVerifyParitySummary, 'byteMatches') === 36 &&
    b(uploadRemoteVerifyParitySummary, 'readyForRemoteObjectVerify') &&
    !b(uploadRemoteVerifyParitySummary, 'firebaseOrServerUploadStarted') &&
    !b(uploadRemoteVerifyParitySummary, 'runtimeDownloadsEnabled') &&
    !b(uploadRemoteVerifyParitySummary, 'activationApproved') &&
    !b(uploadRemoteVerifyParitySummary, 'readyForApply');
  if (!uploadRemoteVerifyParityReady) {
    addFinding(findings, 'blocker', 'upload_remote_verify_parity_not_ready', 'Upload evidence and remote verify dry-run parity must prove the exact same 36 server objects before live credentials are used.', rel(input.repoRoot, uploadRemoteVerifyParityPath));
  }
  const remoteVerifyCommandRehearsalReady =
    s(remoteVerifyCommandRehearsal, 'status') === 'PASS' &&
    ['ready_waiting_for_read_only_credential', 'credential_present_ready_to_run'].includes(s(remoteVerifyCommandRehearsalSummary, 'rehearsalState')) &&
    b(remoteVerifyCommandRehearsalSummary, 'readyForLiveRemoteVerifyWhenCredentialPresent') &&
    !b(remoteVerifyCommandRehearsalSummary, 'credentialsPrintedByThisScript') &&
    !b(remoteVerifyCommandRehearsalSummary, 'firebaseOrServerUploadStarted') &&
    !b(remoteVerifyCommandRehearsalSummary, 'serverObjectsModifiedByThisScript') &&
    !b(remoteVerifyCommandRehearsalSummary, 'runtimeDownloadsEnabled') &&
    !b(remoteVerifyCommandRehearsalSummary, 'activationApproved') &&
    !b(remoteVerifyCommandRehearsalSummary, 'readyForApply');
  if (!remoteVerifyCommandRehearsalReady) {
    addFinding(findings, 'blocker', 'remote_verify_command_rehearsal_not_ready', 'Remote verify command rehearsal must prove the safe command sequence before live credentials are used.', rel(input.repoRoot, remoteVerifyCommandRehearsalPath));
  }
  const remoteVerifyLiveHandoffReady =
    s(remoteVerifyLiveHandoff, 'status') === 'PASS' &&
    b(remoteVerifyLiveHandoffSummary, 'liveVerifyCommandReady') &&
    b(remoteVerifyLiveHandoffSummary, 'postVerifyChainReady') &&
    n(remoteVerifyLiveHandoffSummary, 'expectedRemoteObjects') === 36 &&
    n(remoteVerifyLiveHandoffSummary, 'expectedHashChecks') === 36 &&
    !b(remoteVerifyLiveHandoffSummary, 'credentialsPrintedByThisScript') &&
    !b(remoteVerifyLiveHandoffSummary, 'firebaseOrServerUploadStarted') &&
    !b(remoteVerifyLiveHandoffSummary, 'serverObjectsModifiedByThisScript') &&
    !b(remoteVerifyLiveHandoffSummary, 'runtimeDownloadsEnabled') &&
    !b(remoteVerifyLiveHandoffSummary, 'activationApproved') &&
    !b(remoteVerifyLiveHandoffSummary, 'readyForApply');
  if (!remoteVerifyLiveHandoffReady) {
    addFinding(findings, 'blocker', 'remote_verify_live_handoff_not_ready', 'Remote verify live handoff must provide a safe read-only runbook for the credentialed live verify and post-verify refresh chain.', rel(input.repoRoot, remoteVerifyLiveHandoffPath));
  }
  const preApprovalPostRemoteVerifyTransitionReady =
    s(postRemoteVerifyTransition, 'status') === 'PASS' &&
    s(postRemoteVerifyTransitionSummary, 'transitionState') === 'ready_waiting_for_remote_verify_pass' &&
    n(postRemoteVerifyTransitionSummary, 'currentCompletionMissing') === 1 &&
    s(postRemoteVerifyTransitionSummary, 'currentDirectMissingRequirement') === 'REQ-13-FRENCH-SERVER-OBJECT-REMOTE-VERIFY' &&
    n(postRemoteVerifyTransitionSummary, 'afterRemoteVerifyExpectedMissing') === 0 &&
    n(postRemoteVerifyTransitionSummary, 'afterRemoteVerifyExpectedLocked') === 5 &&
    s(postRemoteVerifyTransitionSummary, 'afterRemoteVerifyNextGate') === 'exact_approval_artifacts' &&
    b(postRemoteVerifyTransitionSummary, 'activationMustRemainClosed') &&
    b(postRemoteVerifyTransitionSummary, 'runtimeDownloadsMustRemainClosed') &&
    b(postRemoteVerifyTransitionSummary, 'productionApplyMustRemainClosed');
  const postApprovalPostRemoteVerifyTransitionReady =
    s(postRemoteVerifyTransition, 'status') === 'PASS' &&
    s(postRemoteVerifyTransitionSummary, 'transitionState') === 'post_approval_remote_verify_complete_production_apply_locked' &&
    n(postRemoteVerifyTransitionSummary, 'currentCompletionMissing') === 0 &&
    s(postRemoteVerifyTransitionSummary, 'currentDirectMissingRequirement') === 'none' &&
    n(postRemoteVerifyTransitionSummary, 'afterRemoteVerifyExpectedMissing') === 0 &&
    n(postRemoteVerifyTransitionSummary, 'afterRemoteVerifyExpectedLocked') === 0 &&
    s(postRemoteVerifyTransitionSummary, 'afterRemoteVerifyNextGate') === 'production_apply_closed' &&
    b(postRemoteVerifyTransitionSummary, 'activationMustRemainClosed') &&
    b(postRemoteVerifyTransitionSummary, 'runtimeDownloadsMustRemainClosed') &&
    b(postRemoteVerifyTransitionSummary, 'productionApplyMustRemainClosed');
  const postRemoteVerifyTransitionReady =
    preApprovalPostRemoteVerifyTransitionReady || postApprovalPostRemoteVerifyTransitionReady;
  if (!postRemoteVerifyTransitionReady) {
    addFinding(findings, 'blocker', 'post_remote_verify_transition_not_ready', 'Post-remote-verify transition must prove 0 missing after remote verify while keeping exact approval/apply locks closed.', rel(input.repoRoot, postRemoteVerifyTransitionPath));
  }
  const appSurfaceParityReady =
    s(appSurfaceParity, 'status') === 'PASS' &&
    n(appSurfaceParitySummary, 'remotePackSurfaces') === 6 &&
    n(appSurfaceParitySummary, 'requiredRemotePackSurfaces') === 6 &&
    n(appSurfaceParitySummary, 'devNavigationProbesPassed') === n(appSurfaceParitySummary, 'devNavigationProbes') &&
    n(appSurfaceParitySummary, 'devNavigationProbes') >= 80 &&
    b(appSurfaceParitySummary, 'challengeDailyArenaCoveredByNavigationGuard') &&
    !b(appSurfaceParitySummary, 'challengeDailyArenaRequiresExtraPackSurface') &&
    !b(appSurfaceParitySummary, 'activationApproved') &&
    !b(appSurfaceParitySummary, 'readyForApply') &&
    !b(appSurfaceParitySummary, 'mayModifyProductionAppFiles');
  if (!appSurfaceParityReady) {
    addFinding(findings, 'blocker', 'app_surface_parity_not_ready', 'French app surface parity must prove challenges, daily tasks and arena-like surfaces are guarded by navigation/state gates and not missing from server-pack content.', rel(input.repoRoot, appSurfaceParityPath));
  }
  const runtimeRegistrationServerLayoutReady =
    s(runtimeRegistrationServerLayout, 'status') === 'PASS' &&
    n(runtimeRegistrationServerLayoutSummary, 'requiredServerObjects') === 36 &&
    n(runtimeRegistrationServerLayoutSummary, 'missingUploadEvidenceObjects') === 0 &&
    n(runtimeRegistrationServerLayoutSummary, 'runtimeValidManifests') === 12 &&
    !b(runtimeRegistrationServerLayoutSummary, 'activationApproved') &&
    !b(runtimeRegistrationServerLayoutSummary, 'runtimeDownloadsEnabled') &&
    !b(runtimeRegistrationServerLayoutSummary, 'readyForApply');
  if (!runtimeRegistrationServerLayoutReady) {
    addFinding(findings, 'blocker', 'runtime_registration_server_layout_not_ready', 'Runtime registration/server layout must prove manifest.json, index.json and payload objects are all covered by upload evidence before remote verify can be final.', rel(input.repoRoot, runtimeRegistrationServerLayoutPath));
  }

  const remoteVerifyFoundObjects = n(remoteVerifySummary, 'foundObjectCount');
  const remoteVerifyHashCheckedObjects = n(remoteVerifySummary, 'hashCheckedObjects') || n(remoteVerifySummary, 'hashCheckedCount');
  const remoteVerifyComplete =
    s(remoteVerify, 'status') === 'PASS' &&
    remoteVerifyFoundObjects === 36 &&
    remoteVerifyHashCheckedObjects === 36 &&
    n(remoteVerifySummary, 'missingObjects') === 0 &&
    n(remoteVerifySummary, 'unexpectedObjects') === 0 &&
    n(remoteVerifySummary, 'sizeMismatches') === 0 &&
    n(remoteVerifySummary, 'hashMismatches') === 0;
  const nextRootCauseToClose = !runtimeRegistrationServerLayoutReady
    ? 'ROOT-00-RUNTIME-REGISTRATION-SERVER-LAYOUT'
    : remoteVerifyComplete
      ? (lockedRequirements.length === 0 && b(completionSummary, 'activationApproved')
        ? 'NONE-PRODUCTION-ACTIVATED'
        : 'ROOT-02-EXACT-APPROVAL-LOCK')
      : 'ROOT-01-REMOTE-SERVER-VERIFY';

  const rootCauses: RootCause[] = [
    {
      id: 'ROOT-00-RUNTIME-REGISTRATION-SERVER-LAYOUT',
      state: runtimeRegistrationServerLayoutReady ? 'resolved' : 'safe_hold',
      title: runtimeRegistrationServerLayoutReady
        ? 'Runtime registration/server layout is covered for all required French server objects'
        : 'Runtime registration requires more server objects than upload evidence currently covers',
      evidence: [
        `layoutStatus=${s(runtimeRegistrationServerLayout, 'status')}`,
        `requiredServerObjects=${n(runtimeRegistrationServerLayoutSummary, 'requiredServerObjects')}`,
        `uploadEvidenceObjects=${n(runtimeRegistrationServerLayoutSummary, 'uploadEvidenceObjects')}`,
        `missingUploadEvidenceObjects=${n(runtimeRegistrationServerLayoutSummary, 'missingUploadEvidenceObjects')}`,
        `runtimeValidManifests=${n(runtimeRegistrationServerLayoutSummary, 'runtimeValidManifests')}`,
      ],
      blocks: [
        'remote object verify object list',
        'server upload evidence completeness',
        'runtime download activation',
        'final activation approval',
      ],
      canResolveWithoutProductionWrites: true,
      nextAction: runtimeRegistrationServerLayoutReady
        ? 'No action: server upload evidence and runtime registration now cover all 36 runtime-required objects.'
        : 'Expand server upload evidence/object verification plan from 12 payload objects to 36 runtime-required objects: manifest.json, index.json and payload per sourceLocale/surface.',
    },
    {
      id: 'ROOT-01-REMOTE-SERVER-VERIFY',
      state: remoteVerifyComplete ? 'resolved' : 'missing_external_evidence',
      title: remoteVerifyComplete
        ? 'French server objects are remotely verified'
        : 'French server objects are not remotely verified yet',
      evidence: [
        `credentialHandoff=${s(credentialHandoffSummary, 'handoffState')}/${s(credentialHandoffSummary, 'credentialSource')}`,
        `dryRunReady=${remoteVerifyDryRunReady}`,
        `dryRunChecks=${n(remoteVerifyDryRunSummary, 'plannedChecks')}`,
        `uploadRemoteVerifyParityReady=${uploadRemoteVerifyParityReady}`,
        `uploadRemoteVerifyParityMatches=${n(uploadRemoteVerifyParitySummary, 'matchedServerPaths')}/${n(uploadRemoteVerifyParitySummary, 'shaMatches')}/${n(uploadRemoteVerifyParitySummary, 'byteMatches')}`,
        `commandRehearsalReady=${remoteVerifyCommandRehearsalReady}`,
        `liveHandoffReady=${remoteVerifyLiveHandoffReady}`,
        `liveHandoffState=${s(remoteVerifyLiveHandoffSummary, 'handoffState')}`,
        `postRemoteVerifyTransitionReady=${postRemoteVerifyTransitionReady}`,
        `postRemoteVerifyTransitionState=${s(postRemoteVerifyTransitionSummary, 'transitionState')}`,
        `appSurfaceParityReady=${appSurfaceParityReady}`,
        `appSurfaceRemotePackSurfaces=${n(appSurfaceParitySummary, 'remotePackSurfaces')}/${n(appSurfaceParitySummary, 'requiredRemotePackSurfaces')}`,
        `challengeDailyArenaCovered=${b(appSurfaceParitySummary, 'challengeDailyArenaCoveredByNavigationGuard')}`,
        `remoteVerify=${s(remoteVerify, 'status')}`,
        `found/hash=${n(remoteVerifySummary, 'foundObjectCount')}/${n(remoteVerifySummary, 'hashCheckedObjects') || n(remoteVerifySummary, 'hashCheckedCount')}`,
      ],
      blocks: [
        'REQ-13-FRENCH-SERVER-OBJECT-REMOTE-VERIFY',
        'runtime downloads activation',
        'final activation approval',
      ],
      canResolveWithoutProductionWrites: true,
      nextAction: remoteVerifyComplete
        ? 'No action: server remote verify proved all 36 objects with matching hashes and no unexpected objects.'
        : 'Provide read-only server credential source and rerun credential preflight, remote object verify, completion audit and master.',
    },
    {
      id: 'ROOT-02-EXACT-APPROVAL-LOCK',
      state: lockedRequirements.length === 0 && b(completionSummary, 'activationApproved') ? 'resolved' : 'production_locked',
      title: lockedRequirements.length === 0 && b(completionSummary, 'activationApproved')
        ? 'Exact approval/apply/rollback/activation chain is resolved'
        : 'Exact approval artifacts are intentionally absent',
      evidence: [
        `lockedRequirements=${lockedRequirements.map((item) => s(item, 'id')).join(',')}`,
        `activationApproved=${b(completionSummary, 'activationApproved')}`,
        `readyForApply=${b(completionSummary, 'readyForApply')}`,
      ],
      blocks: [
        'REQ-17-EXACT-APPROVAL-ARTIFACTS',
        'REQ-18-PRODUCTION-ACTIVATION-SEQUENCE',
        'REQ-19-PRODUCTION-APPLY-TRANSACTION',
        'REQ-20-POST-APPLY-ROLLBACK-GUARD',
        'REQ-21-ACTIVATION-APPROVED',
      ],
      canResolveWithoutProductionWrites: false,
      nextAction: lockedRequirements.length === 0 && b(completionSummary, 'activationApproved')
        ? 'No action: activationApproved is true after exact approval, sequence, apply contract and rollback guard passed.'
        : 'Do not create approval artifacts until remote verify and closed production flags are proved.',
    },
    {
      id: 'ROOT-03-DERIVED-MASTER-BLOCKERS',
      state: 'safe_hold',
      title: 'Master blockers are derived from remote verify and approval/apply chain holds',
      evidence: [
        `masterStatus=${s(master, 'status')}`,
        `masterSummaryBlockers=${n(masterSummary, 'blockers')}`,
        `masterBlockerFindings=${masterBlockerFindings.length}`,
      ],
      blocks: [
        'master readyForApply',
        'approval/apply command handoffs',
      ],
      canResolveWithoutProductionWrites: true,
      nextAction: 'After remote verify passes, refresh P45-P49/P50-P65/P68-P69 and master to collapse derived blockers.',
    },
  ];

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';

  return {
    schemaVersion: 'gustav-french-final-blocker-dependency-map-v2-packet-v0',
    runId: path.basename(input.runDir),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status,
    summary: {
      targetLocale: 'fr',
      productionReady: b(completionSummary, 'activationApproved'),
      activationApproved: b(completionSummary, 'activationApproved'),
      readyForApply: b(completionSummary, 'readyForApply'),
      mayModifyProductionAppFiles: false,
    rootCauses: rootCauses.length,
    activeRootCauses: rootCauses.filter((cause) => cause.state !== 'resolved').length,
      directMissingRequirements: missingRequirements.length,
      productionLockedRequirements: lockedRequirements.length,
      masterBlockerFindings: masterBlockerFindings.length,
      remoteVerifyFoundObjects,
      remoteVerifyHashCheckedObjects,
      remoteVerifyDryRunReady,
      remoteVerifyDryRunPlannedChecks: n(remoteVerifyDryRunSummary, 'plannedChecks'),
      uploadRemoteVerifyParityReady,
      uploadRemoteVerifyParityMatchedServerPaths: n(uploadRemoteVerifyParitySummary, 'matchedServerPaths'),
      uploadRemoteVerifyParityShaMatches: n(uploadRemoteVerifyParitySummary, 'shaMatches'),
      uploadRemoteVerifyParityByteMatches: n(uploadRemoteVerifyParitySummary, 'byteMatches'),
      remoteVerifyCommandRehearsalReady,
      remoteVerifyLiveHandoffReady,
      remoteVerifyLiveHandoffState: s(remoteVerifyLiveHandoffSummary, 'handoffState'),
      postRemoteVerifyTransitionReady,
      postRemoteVerifyTransitionState: s(postRemoteVerifyTransitionSummary, 'transitionState'),
      appSurfaceParityReady,
      appSurfaceRemotePackSurfaces: n(appSurfaceParitySummary, 'remotePackSurfaces'),
      appSurfaceRequiredRemotePackSurfaces: n(appSurfaceParitySummary, 'requiredRemotePackSurfaces'),
      appSurfaceDevNavigationProbesPassed: n(appSurfaceParitySummary, 'devNavigationProbesPassed'),
      appSurfaceDevNavigationProbes: n(appSurfaceParitySummary, 'devNavigationProbes'),
      challengeDailyArenaCoveredByNavigationGuard: b(appSurfaceParitySummary, 'challengeDailyArenaCoveredByNavigationGuard'),
      runtimeRegistrationServerLayoutReady,
      runtimeRegistrationRequiredServerObjects: n(runtimeRegistrationServerLayoutSummary, 'requiredServerObjects'),
      runtimeRegistrationMissingUploadEvidenceObjects: n(runtimeRegistrationServerLayoutSummary, 'missingUploadEvidenceObjects'),
      runtimeRegistrationValidManifests: n(runtimeRegistrationServerLayoutSummary, 'runtimeValidManifests'),
      credentialHandoffState: s(credentialHandoffSummary, 'handoffState'),
      credentialSource: s(credentialHandoffSummary, 'credentialSource'),
      credentialHandoffSafe,
      nextRootCauseToClose,
      canContinueWithoutServerCredentials: true,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      storageOrCloudMigrationStarted: false,
      blockers,
      warnings,
    },
    inputs: {
      frenchReviewerMasterManifest: rel(input.repoRoot, masterPath),
      productionReadinessCompletionAuditV2Packet: rel(input.repoRoot, completionPath),
      frenchServerRemoteCredentialHandoffV2Packet: rel(input.repoRoot, credentialHandoffPath),
      frenchRemoteVerifyDryRunReadinessV2Packet: rel(input.repoRoot, remoteVerifyDryRunPath),
      frenchUploadRemoteVerifyParityV2Packet: rel(input.repoRoot, uploadRemoteVerifyParityPath),
      frenchRemoteVerifyCommandRehearsalV2Packet: rel(input.repoRoot, remoteVerifyCommandRehearsalPath),
      frenchRemoteVerifyLiveHandoffV2Packet: rel(input.repoRoot, remoteVerifyLiveHandoffPath),
      frenchPostRemoteVerifyTransitionV2Packet: rel(input.repoRoot, postRemoteVerifyTransitionPath),
      frenchServerObjectRemoteVerifyV2Packet: rel(input.repoRoot, remoteVerifyPath),
      frenchAppSurfaceParityV2Packet: rel(input.repoRoot, appSurfaceParityPath),
      frenchRuntimeRegistrationServerLayoutV2Packet: rel(input.repoRoot, runtimeRegistrationServerLayoutPath),
    },
    outputs: {},
    rootCauses,
    derivedMasterBlockerBuckets: countBuckets(masterBlockerFindings),
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      approvalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabledByThisScript: false,
      storageOrCloudMigrationStarted: false,
      productionApplyApproved: false,
    },
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav French Final Blocker Dependency Map V2',
    '',
    `- Status: ${report.status}`,
    `- Root causes: ${report.summary.rootCauses}`,
    `- Active root causes: ${report.summary.activeRootCauses}`,
    `- Direct missing requirements: ${report.summary.directMissingRequirements}`,
    `- Production locked requirements: ${report.summary.productionLockedRequirements}`,
    `- Credential handoff: ${report.summary.credentialHandoffState}/${report.summary.credentialSource}`,
    `- Remote dry-run ready/checks: ${report.summary.remoteVerifyDryRunReady ? 'yes' : 'no'}/${report.summary.remoteVerifyDryRunPlannedChecks}`,
    `- Upload/remote parity ready/matches: ${report.summary.uploadRemoteVerifyParityReady ? 'yes' : 'no'}/${report.summary.uploadRemoteVerifyParityMatchedServerPaths}/${report.summary.uploadRemoteVerifyParityShaMatches}/${report.summary.uploadRemoteVerifyParityByteMatches}`,
    `- Remote command rehearsal ready: ${report.summary.remoteVerifyCommandRehearsalReady ? 'yes' : 'no'}`,
    `- Remote live handoff ready: ${report.summary.remoteVerifyLiveHandoffReady ? 'yes' : 'no'} (${report.summary.remoteVerifyLiveHandoffState})`,
    `- Post remote verify transition ready: ${report.summary.postRemoteVerifyTransitionReady ? 'yes' : 'no'} (${report.summary.postRemoteVerifyTransitionState})`,
    `- App surface parity ready: ${report.summary.appSurfaceParityReady ? 'yes' : 'no'}`,
    `- App surface remote pack surfaces: ${report.summary.appSurfaceRemotePackSurfaces}/${report.summary.appSurfaceRequiredRemotePackSurfaces}`,
    `- Challenge/daily/arena navigation covered: ${report.summary.challengeDailyArenaCoveredByNavigationGuard ? 'yes' : 'no'}`,
    `- Runtime registration/server layout ready: ${report.summary.runtimeRegistrationServerLayoutReady ? 'yes' : 'no'}`,
    `- Runtime registration required server objects: ${report.summary.runtimeRegistrationRequiredServerObjects}`,
    `- Runtime registration missing upload evidence objects: ${report.summary.runtimeRegistrationMissingUploadEvidenceObjects}`,
    `- Runtime-valid manifests: ${report.summary.runtimeRegistrationValidManifests}`,
    `- Remote found/hash: ${report.summary.remoteVerifyFoundObjects}/${report.summary.remoteVerifyHashCheckedObjects}`,
    `- Next root cause: ${report.summary.nextRootCauseToClose}`,
    '',
    '## Root Causes',
    '',
  ];
  for (const cause of report.rootCauses) {
    lines.push(`### ${cause.id}`);
    lines.push('');
    lines.push(`- State: ${cause.state}`);
    lines.push(`- Title: ${cause.title}`);
    lines.push(`- Can resolve without production writes: ${cause.canResolveWithoutProductionWrites ? 'yes' : 'no'}`);
    lines.push(`- Next action: ${cause.nextAction}`);
    lines.push(`- Evidence: ${cause.evidence.join('; ')}`);
    lines.push(`- Blocks: ${cause.blocks.join(', ')}`);
    lines.push('');
  }
  lines.push('## Derived Master Blocker Buckets', '');
  for (const [bucket, count] of Object.entries(report.derivedMasterBlockerBuckets)) {
    lines.push(`- ${bucket}: ${count}`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push('', '## Safety', '', '- No app apply, no server upload, no runtime download enablement, no approval artifact creation.', '');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);
  const runDir = path.resolve(repoRoot, runArg);
  const outputJsonPath = path.join(runDir, 'audits', 'french_final_blocker_dependency_map_v2_packet.json');
  const outputMdPath = path.join(runDir, 'audits', 'french_final_blocker_dependency_map_v2_packet.md');
  const report = buildFrenchFinalBlockerDependencyMap({ repoRoot, runDir });
  report.outputs = {
    packet: rel(repoRoot, outputJsonPath),
    markdown: rel(repoRoot, outputMdPath),
  };
  ensureDir(path.dirname(outputJsonPath));
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV French final blocker dependency map V2 packet: ${report.status}`);
  console.log(`Root causes: ${report.summary.rootCauses}`);
  console.log(`Active root causes: ${report.summary.activeRootCauses}`);
  console.log(`Next root cause: ${report.summary.nextRootCauseToClose}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

if (require.main === module) {
  main();
}
