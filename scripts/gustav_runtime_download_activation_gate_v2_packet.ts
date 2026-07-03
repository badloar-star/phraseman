import * as crypto from 'node:crypto';
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

type Probe = {
  id: string;
  expectedAccept: boolean;
  accepted: boolean;
  blockers: number;
  passed: boolean;
};

type RuntimeActivationContract = {
  schemaVersion: 'gustav-runtime-download-activation-gate-v2';
  runId: string;
  studyTarget: 'fr';
  sourceLocales: ['ru', 'uk'];
  gateMode: 'activation_contract_only_no_runtime_enable';
  requiredFutureGates: string[];
  requiredCodeTransitions: string[];
  requiredManifestTransitions: string[];
  requiredRollbackGuards: string[];
  disallowedTransitionsNow: {
    productionStudyTargetFrEnabled: boolean;
    coursePackRemoteLoadingEnabled: false;
    frenchEmbeddedIndexEntryEnabled: false;
    productionServerManifestPublished: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
  };
};

type Report = {
  schemaVersion: 'gustav-runtime-download-activation-gate-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  summary: {
    targetLocale: 'fr';
    sourceLocales: ['ru', 'uk'];
    gateMode: 'activation_contract_only_no_runtime_enable';
    runtimeDownloadActivationGateReady: boolean;
    runtimeActivationPreconditionsContracted: boolean;
    noActiveApprovalArtifacts: boolean;
    coursePackRemoteLoadingEnabled: false;
    planContentRemoteEnabled: boolean;
    productionStudyTargetFrEnabled: boolean;
    frenchEmbeddedIndexEntries: number;
    embeddedIndexActivationApprovedFalse: number;
    serverManifestDraftEntries: number;
    manifestStudyTargetFr: number;
    manifestRuntimeDownloadsEnabledFalse: number;
    manifestActivationApprovedFalse: number;
    manifestReadyForApplyFalse: number;
    productionServerManifestExists: boolean;
    productionManifestSafelyPromoted: boolean;
    p1aApprovalReceiptExists: boolean;
    p1aActiveHashLockExists: boolean;
    productionStudyTargetStaleFrenchRepairTested: boolean;
    requiredFutureGates: number;
    requiredCodeTransitions: number;
    requiredManifestTransitions: number;
    requiredRollbackGuards: number;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    blockers: number;
    warnings: number;
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  artifactHashes: Record<string, string>;
  contract: RuntimeActivationContract;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    productionStudyTargetEnabledByThisScript: false;
    coursePackRemoteLoadingEnabledByThisScript: false;
    serverManifestPublishedByThisScript: false;
    runtimeDownloadsEnabledByThisScript: false;
    activationApprovedByThisScript: false;
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

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  return false;
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function buildContract(runId: string): RuntimeActivationContract {
  return {
    schemaVersion: 'gustav-runtime-download-activation-gate-v2',
    runId,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    gateMode: 'activation_contract_only_no_runtime_enable',
    requiredFutureGates: [
      'production_study_target_activation_gate_v2',
      'course_pack_remote_loading_activation_gate_v2',
      'course_pack_index_fr_entry_gate_v2',
      'server_delivery_manifest_publish_gate_v2',
      'storage_cloud_fr_namespace_migration_gate_v2',
      'post_apply_rollback_guard_contract_v2',
    ],
    requiredCodeTransitions: [
      'ProductionStudyTarget may include fr only inside the approved apply transaction.',
      'STUDY_TARGETS may include fr only after exact approval receipt and hash-lock validation.',
      'COURSE_PACK_REMOTE_LOADING_ENABLED may flip true only with published French manifest and rollback checkpoint.',
      'Embedded/downloadable index may add studyTarget=fr entries only with sourceLocale-scoped manifests.',
    ],
    requiredManifestTransitions: [
      'Production server manifest must contain exactly 12 fr/ru|uk entries before runtime downloads can open.',
      'Every downloadable manifest entry must retain studyTarget=fr and sourceLocale in ru|uk.',
      'activationApproved and runtimeDownloadsEnabled may flip only after upload verification.',
      'readyForApply remains false until exact approval and apply transaction gates pass.',
    ],
    requiredRollbackGuards: [
      'Rollback must disable runtime downloads before changing any manifest or index entries.',
      'Rollback must remove only course-packs/fr/<sourceLocale>/ scoped references for this contentVersion.',
      'Rollback must preserve English bundled compatibility entries and user state.',
      'Rollback must quarantine only French ready-cache keys derived from the manifest sha.',
    ],
    disallowedTransitionsNow: {
      productionStudyTargetFrEnabled: false,
      coursePackRemoteLoadingEnabled: false,
      frenchEmbeddedIndexEntryEnabled: false,
      productionServerManifestPublished: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
  };
}

function countOccurrences(source: string, pattern: RegExp): number {
  return (source.match(pattern) ?? []).length;
}

function evaluate(input: {
  contract: RuntimeActivationContract;
  manifestDraftPath: string;
  productionManifestPath: string;
  productionManifestPublishGatePath: string;
  activeApprovalReceiptPath: string;
  activeHashLockManifestPath: string;
  loaderPath: string;
  indexPath: string;
  studyTargetPath: string;
  studyTargetSurfaceTestPath: string;
}): { findings: Finding[]; summary: Report['summary'] } {
  const findings: Finding[] = [];
  const manifestDraft = fs.existsSync(input.manifestDraftPath) ? object(readJson<unknown>(input.manifestDraftPath)) : {};
  const entries = array(manifestDraft.entries).map(object);
  const loaderSource = fs.existsSync(input.loaderPath) ? readText(input.loaderPath) : '';
  const indexSource = fs.existsSync(input.indexPath) ? readText(input.indexPath) : '';
  const studyTargetSource = fs.existsSync(input.studyTargetPath) ? readText(input.studyTargetPath) : '';
  const studyTargetSurfaceTestSource = fs.existsSync(input.studyTargetSurfaceTestPath) ? readText(input.studyTargetSurfaceTestPath) : '';
  const productionManifestPublishGate = fs.existsSync(input.productionManifestPublishGatePath)
    ? object(object(readJson<unknown>(input.productionManifestPublishGatePath)).summary)
    : {};

  const runtimeActivationPreconditionsContracted =
    input.contract.requiredFutureGates.length >= 6 &&
    input.contract.requiredCodeTransitions.length >= 4 &&
    input.contract.requiredManifestTransitions.length >= 4 &&
    input.contract.requiredRollbackGuards.length >= 4;
  const coursePackRemoteLoadingEnabled = /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*true/.test(loaderSource);
  const planContentRemoteEnabled = /PLAN_CONTENT_REMOTE_ENABLED[^=]*=\s*true/.test(loaderSource);
  const productionStudyTargetFrEnabled =
    /export\s+type\s+ProductionStudyTarget\s*=\s*['"]en['"]\s*\|\s*['"]fr['"]/.test(studyTargetSource) ||
    /export\s+const\s+STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource);
  const frenchEmbeddedIndexEntries = countOccurrences(indexSource, /studyTarget:\s*['"]fr['"]/g);
  const embeddedIndexActivationApprovedFalse = countOccurrences(indexSource, /activationApproved:\s*false/g);
  const manifestStudyTargetFr = entries.filter((entry) => s(entry, 'studyTarget') === 'fr').length;
  const manifestRuntimeDownloadsEnabledFalse = entries.filter((entry) => b(entry, 'runtimeDownloadsEnabled') === false).length;
  const manifestActivationApprovedFalse = entries.filter((entry) => b(entry, 'activationApproved') === false).length;
  const manifestReadyForApplyFalse = entries.filter((entry) => b(entry, 'readyForApply') === false).length;
  const productionServerManifestExists = fs.existsSync(input.productionManifestPath);
  const productionManifestSafelyPromoted =
    s(productionManifestPublishGate, 'publishGateState') === 'production_server_manifest_ready_for_activation_gate' &&
    b(productionManifestPublishGate, 'productionManifestPresent') &&
    b(productionManifestPublishGate, 'readyForRuntimeDownloadActivation') &&
    b(productionManifestPublishGate, 'activationApproved') === false &&
    b(productionManifestPublishGate, 'runtimeDownloadsEnabled') === false &&
    b(productionManifestPublishGate, 'readyForApply') === false;
  const p1aApprovalReceiptExists = fs.existsSync(input.activeApprovalReceiptPath);
  const p1aActiveHashLockExists = fs.existsSync(input.activeHashLockManifestPath);
  const noActiveApprovalArtifacts = !p1aApprovalReceiptExists && !p1aActiveHashLockExists;
  const productionStudyTargetStaleFrenchRepairTested =
    /repairs a stale French production study target value back to English/.test(studyTargetSurfaceTestSource) &&
    /AsyncStorage\.setItem\(STUDY_TARGET_STORAGE_KEY,\s*['"]fr['"]\)/.test(studyTargetSurfaceTestSource) &&
    /getStoredStudyTarget\(['"]ru['"]\)/.test(studyTargetSurfaceTestSource) &&
    /AsyncStorage\.getItem\(STUDY_TARGET_STORAGE_KEY\)\)\.resolves\.toBe\(['"]en['"]\)/.test(studyTargetSurfaceTestSource);
  const productionStudyTargetFrenchPersistTested =
    /persists French as a production study target for supported source locales/.test(studyTargetSurfaceTestSource) &&
    /setStoredStudyTarget\(['"]fr['"],\s*['"]ru['"]\)/.test(studyTargetSurfaceTestSource) &&
    /getStoredStudyTarget\(['"]ru['"]\)\)\.resolves\.toBe\(['"]fr['"]\)/.test(studyTargetSurfaceTestSource);
  const frenchProductionTargetTransitionAllowed =
    productionStudyTargetFrEnabled && !noActiveApprovalArtifacts && productionStudyTargetFrenchPersistTested;

  if (!runtimeActivationPreconditionsContracted) addFinding(findings, 'blocker', 'runtime_activation_preconditions_incomplete', 'Runtime activation preconditions are not fully contracted.');
  if (coursePackRemoteLoadingEnabled) addFinding(findings, 'blocker', 'remote_loader_opened_now', 'Legacy course pack remote loader must remain disabled before approved apply.', input.loaderPath);
  if (productionStudyTargetFrEnabled && !frenchProductionTargetTransitionAllowed) addFinding(findings, 'blocker', 'production_study_target_fr_opened_without_approval', 'ProductionStudyTarget/STUDY_TARGETS may include fr only after exact approval artifacts and French persistence tests.', input.studyTargetPath);
  if (!productionStudyTargetFrEnabled && !productionStudyTargetStaleFrenchRepairTested) addFinding(findings, 'blocker', 'production_study_target_stale_fr_repair_test_missing', 'Production study target gate must prove stale study_target_v1=fr repairs back to en before activation.', input.studyTargetSurfaceTestPath);
  if (frenchEmbeddedIndexEntries !== 0) addFinding(findings, 'blocker', 'french_index_entry_opened_now', 'Embedded/downloadable index must not contain fr entries before approved apply.', input.indexPath);
  if (entries.length !== 12) addFinding(findings, 'blocker', 'manifest_entry_count_invalid', `Expected 12 manifest draft entries, got ${entries.length}.`, input.manifestDraftPath);
  if (manifestStudyTargetFr !== 12) addFinding(findings, 'blocker', 'manifest_target_mismatch', 'All manifest draft entries must be studyTarget=fr.', input.manifestDraftPath);
  if (manifestRuntimeDownloadsEnabledFalse !== 12) addFinding(findings, 'blocker', 'manifest_runtime_downloads_opened', 'All manifest draft entries must keep runtimeDownloadsEnabled=false.', input.manifestDraftPath);
  if (manifestActivationApprovedFalse !== 12) addFinding(findings, 'blocker', 'manifest_activation_opened', 'All manifest draft entries must keep activationApproved=false.', input.manifestDraftPath);
  if (manifestReadyForApplyFalse !== 12) addFinding(findings, 'blocker', 'manifest_ready_for_apply_opened', 'All manifest draft entries must keep readyForApply=false.', input.manifestDraftPath);
  if (productionServerManifestExists && !productionManifestSafelyPromoted) addFinding(findings, 'blocker', 'production_server_manifest_exists_without_publish_gate', 'Local server_delivery_manifest_v2.json must be validated by production_server_manifest_publish_gate_v2 before activation can proceed.', input.productionManifestPath);
  if (!noActiveApprovalArtifacts && !productionStudyTargetFrEnabled) addFinding(findings, 'blocker', 'approval_artifacts_opened_before_target_activation', 'Exact approval receipt/hash-lock must be followed by the French production target transition.');
  if (input.contract.requiredFutureGates.length < 6) addFinding(findings, 'blocker', 'future_gate_coverage_too_small', 'Runtime activation gate must name all required future gates.');
  if (input.contract.requiredCodeTransitions.length < 4) addFinding(findings, 'blocker', 'code_transition_coverage_too_small', 'Runtime activation gate must name code transitions.');
  if (input.contract.requiredManifestTransitions.length < 4) addFinding(findings, 'blocker', 'manifest_transition_coverage_too_small', 'Runtime activation gate must name manifest transitions.');
  if (input.contract.requiredRollbackGuards.length < 4) addFinding(findings, 'blocker', 'rollback_guard_coverage_too_small', 'Runtime activation gate must name rollback guards.');
  for (const [key, value] of Object.entries(input.contract.disallowedTransitionsNow)) {
    if (value !== false) addFinding(findings, 'blocker', 'dangerous_transition_opened', `Dangerous transition must remain false now: ${key}.`);
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  return {
    findings,
    summary: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      gateMode: 'activation_contract_only_no_runtime_enable',
      runtimeDownloadActivationGateReady: blockers === 0,
      runtimeActivationPreconditionsContracted,
      noActiveApprovalArtifacts,
      coursePackRemoteLoadingEnabled: false,
      planContentRemoteEnabled,
      productionStudyTargetFrEnabled,
      frenchEmbeddedIndexEntries,
      embeddedIndexActivationApprovedFalse,
      serverManifestDraftEntries: entries.length,
      manifestStudyTargetFr,
      manifestRuntimeDownloadsEnabledFalse,
      manifestActivationApprovedFalse,
      manifestReadyForApplyFalse,
      productionServerManifestExists,
      productionManifestSafelyPromoted,
      p1aApprovalReceiptExists,
      p1aActiveHashLockExists,
      productionStudyTargetStaleFrenchRepairTested,
      requiredFutureGates: input.contract.requiredFutureGates.length,
      requiredCodeTransitions: input.contract.requiredCodeTransitions.length,
      requiredManifestTransitions: input.contract.requiredManifestTransitions.length,
      requiredRollbackGuards: input.contract.requiredRollbackGuards.length,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
      fixtureProbesPassed: 0,
      fixtureProbes: 0,
    },
  };
}

function makeProbes(contract: RuntimeActivationContract, input: Omit<Parameters<typeof evaluate>[0], 'contract'>): Probe[] {
  const fixtures: { id: string; expectedAccept: boolean; mutate?: (draft: RuntimeActivationContract) => void }[] = [
    { id: 'canonical_runtime_download_activation_gate_accepts', expectedAccept: true },
    { id: 'runtime_downloads_open_rejected', expectedAccept: false, mutate: (draft) => { (draft.disallowedTransitionsNow as { runtimeDownloadsEnabled: boolean }).runtimeDownloadsEnabled = true; } },
    { id: 'production_fr_open_rejected', expectedAccept: false, mutate: (draft) => { (draft.disallowedTransitionsNow as { productionStudyTargetFrEnabled: boolean }).productionStudyTargetFrEnabled = true; } },
    { id: 'remote_loader_open_rejected', expectedAccept: false, mutate: (draft) => { (draft.disallowedTransitionsNow as { coursePackRemoteLoadingEnabled: boolean }).coursePackRemoteLoadingEnabled = true; } },
    { id: 'missing_future_gates_rejected', expectedAccept: false, mutate: (draft) => { draft.requiredFutureGates = []; } },
    { id: 'missing_rollback_guards_rejected', expectedAccept: false, mutate: (draft) => { draft.requiredRollbackGuards = []; } },
  ];
  return fixtures.map((fixture) => {
    const draft = JSON.parse(JSON.stringify(contract)) as RuntimeActivationContract;
    fixture.mutate?.(draft);
    const blockers = evaluate({ ...input, contract: draft }).findings.filter((finding) => finding.severity === 'blocker').length;
    const accepted = blockers === 0;
    return { id: fixture.id, expectedAccept: fixture.expectedAccept, accepted, blockers, passed: accepted === fixture.expectedAccept };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Runtime Download Activation Gate V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Runtime download activation gate ready: ${report.summary.runtimeDownloadActivationGateReady ? 'yes' : 'no'}`,
    `- Runtime downloads enabled now: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`,
    `- Production studyTarget fr enabled now: ${report.summary.productionStudyTargetFrEnabled ? 'yes' : 'no'}`,
    `- Stale production study_target_v1=fr repair tested: ${report.summary.productionStudyTargetStaleFrenchRepairTested ? 'yes' : 'no'}`,
    `- French embedded index entries now: ${report.summary.frenchEmbeddedIndexEntries}`,
    `- Manifest draft entries: ${report.summary.serverManifestDraftEntries}`,
    `- Production server manifest exists: ${report.summary.productionServerManifestExists ? 'yes' : 'no'}`,
    `- Production manifest safely promoted by publish gate: ${report.summary.productionManifestSafelyPromoted ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    '',
    '## Safety',
    '',
    '- This packet does not enable runtime downloads.',
    '- It does not add French to production study target selection.',
    '- It does not publish a server manifest.',
    '- It does not approve activation or apply.',
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- None.');
  else for (const finding of report.findings) lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) throw new Error('Usage: npx tsx scripts/gustav_runtime_download_activation_gate_v2_packet.ts --run <run-dir> --target fr');
  if (target !== 'fr') throw new Error('Runtime download activation gate V2 is currently scoped to --target fr.');

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const outJson = path.join(auditsDir, 'runtime_download_activation_gate_v2.json');
  const outMd = path.join(auditsDir, 'runtime_download_activation_gate_v2.md');
  const contract = buildContract(runId);
  const input = {
    manifestDraftPath: path.join(runDir, 'pack_candidates', 'fr', 'server_delivery_manifest_v2_draft.json'),
    productionManifestPath: path.join(runDir, 'pack_candidates', 'fr', 'server_delivery_manifest_v2.json'),
    productionManifestPublishGatePath: path.join(auditsDir, 'production_server_manifest_publish_gate_v2_packet.json'),
    activeApprovalReceiptPath: path.join(runDir, 'apply_plan', 'explicit_approval_receipt_v2.json'),
    activeHashLockManifestPath: path.join(runDir, 'apply_plan', 'hash_lock_manifest_v2.json'),
    loaderPath: path.join(repoRoot, 'app', 'course_pack_loader.ts'),
    indexPath: path.join(repoRoot, 'app', 'course_pack_index.ts'),
    studyTargetPath: path.join(repoRoot, 'app', 'study_target.ts'),
    studyTargetSurfaceTestPath: path.join(repoRoot, 'tests', 'gustav_surface_target_switch.test.ts'),
  };
  const result = evaluate({ ...input, contract });
  const probes = makeProbes(contract, input);
  const findings = [...result.findings];
  for (const probe of probes.filter((candidate) => !candidate.passed)) {
    addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }
  addFinding(findings, 'info', 'contract_only_no_enable', 'Runtime download activation contract is ready, but runtime downloads remain disabled until exact approval/apply.');
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const summary = {
    ...result.summary,
    runtimeDownloadActivationGateReady: blockers === 0,
    blockers,
    warnings,
    fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
    fixtureProbes: probes.length,
  };
  const report: Report = {
    schemaVersion: 'gustav-runtime-download-activation-gate-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: { argv: process.argv.slice(2), cwd: repoRoot, nodeVersion: process.version },
    inputs: Object.fromEntries(Object.entries(input).map(([key, value]) => [key, rel(repoRoot, value)])),
    outputs: {
      runtimeDownloadActivationGateV2PacketJson: rel(repoRoot, outJson),
      runtimeDownloadActivationGateV2PacketMd: rel(repoRoot, outMd),
    },
    summary,
    artifactHashes: Object.fromEntries(Object.entries(input).map(([key, value]) => [key, sha256(value)])),
    contract,
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      productionStudyTargetEnabledByThisScript: false,
      coursePackRemoteLoadingEnabledByThisScript: false,
      serverManifestPublishedByThisScript: false,
      runtimeDownloadsEnabledByThisScript: false,
      activationApprovedByThisScript: false,
    },
  };
  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV runtime download activation gate V2 packet: ${report.status}`);
  console.log(`Runtime download activation gate ready: ${report.summary.runtimeDownloadActivationGateReady ? 'yes' : 'no'}`);
  console.log(`Runtime downloads enabled now: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`);
  console.log(`French production target/index: ${report.summary.productionStudyTargetFrEnabled ? 'yes' : 'no'}/${report.summary.frenchEmbeddedIndexEntries}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);
  if (blockers > 0) process.exitCode = 1;
}

main();
