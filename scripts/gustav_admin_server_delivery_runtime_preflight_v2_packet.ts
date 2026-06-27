import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type PreflightState =
  | 'blocked_by_findings'
  | 'closed_missing_server_manifest_draft'
  | 'admin_server_runtime_preflight_ready';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  expectedState: PreflightState;
  accepted: boolean;
  preflightState: PreflightState;
  blockers: number;
  passed: boolean;
};

type JsonObject = Record<string, unknown>;

type EvaluationInput = {
  p26Ready: boolean;
  p26State: string;
  p26Blockers: number;
  manifestDraftPresent: boolean;
  manifestEntries: JsonObject[];
  adminReady: boolean;
  adminMentionsStudyTarget: boolean;
  adminMentionsSourceLocale: boolean;
  adminRequiredApprovalFields: number;
  adminRequiredAdminGates: number;
  runtimeReady: boolean;
  runtimeDownloadsEnabled: boolean;
  runtimeCacheWritesOpened: boolean;
  runtimeReadyCacheStateOpened: boolean;
  storageReady: boolean;
  storageMigrationAllowed: boolean;
  cloudSyncMigrationAllowed: boolean;
  manifestForbiddenUiLocaleRefs: number;
  manifestForbiddenOpenFlags: number;
  productionServerManifestExists: boolean;
};

type Evaluation = {
  targetLocale: 'fr';
  manifestDraftPresent: boolean;
  manifestEntries: number;
  manifestEntriesStudyTargetFr: number;
  manifestEntriesSourceScoped: number;
  manifestEntriesWithActualSha256: number;
  manifestEntriesWithActualByteSize: number;
  adminReady: boolean;
  adminMentionsStudyTarget: boolean;
  adminMentionsSourceLocale: boolean;
  adminRequiredApprovalFields: number;
  adminRequiredAdminGates: number;
  runtimeReady: boolean;
  runtimeDownloadsEnabled: false;
  runtimeCacheWritesOpened: false;
  runtimeReadyCacheStateOpened: false;
  storageReady: boolean;
  storageMigrationAllowed: false;
  cloudSyncMigrationAllowed: false;
  manifestForbiddenUiLocaleRefs: number;
  manifestForbiddenOpenFlags: number;
  productionServerManifestExists: boolean;
  adminImportUploadAllowed: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  downloadablePacksPublished: false;
  activationApproved: false;
  readyForRuntimeDownloadActivation: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  readyForRuntimeActivationBlockerPlanningV2: boolean;
  preflightState: PreflightState;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-admin-server-delivery-runtime-preflight-v2-packet-v0';
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
  summary: Evaluation & {
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  artifactHashes: Record<string, string>;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    adminStateModifiedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function summaryOf(report: JsonObject): JsonObject {
  return object(report.summary);
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  return false;
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function countForbiddenOpenFlags(filePath: string): number {
  const text = fs.readFileSync(filePath, 'utf8');
  return [
    '"serverUploadAllowed": true',
    '"firebaseUploadAllowed": true',
    '"downloadablePacksPublished": true',
    '"runtimeDownloadsEnabled": true',
    '"activationApproved": true',
    '"readyForRuntimeDownloadActivation": true',
    '"readyForApply": true',
    '"mayModifyProductionAppFiles": true',
  ].reduce((sum, pattern) => sum + (text.includes(pattern) ? 1 : 0), 0);
}

function countUiLocaleRefs(filePath: string): number {
  const text = fs.readFileSync(filePath, 'utf8');
  return (text.match(/uiLocale/g) ?? []).length;
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  if (!input.p26Ready) addFinding(findings, 'blocker', 'P26_NOT_READY', `P26 must be ready before P27, got state=${input.p26State}.`);
  if (input.p26Blockers > 0) addFinding(findings, 'blocker', 'P26_BLOCKERS', `P26 has ${input.p26Blockers} blocker(s).`);
  if (!input.manifestDraftPresent) addFinding(findings, 'blocker', 'MANIFEST_DRAFT_MISSING', 'P27 requires server_delivery_manifest_v2_draft.json.');
  if (input.manifestEntries.length !== 12) addFinding(findings, 'blocker', 'MANIFEST_ENTRY_COUNT_INVALID', `Expected 12 manifest entries, got ${input.manifestEntries.length}.`);
  if (!input.adminReady) addFinding(findings, 'blocker', 'ADMIN_SURFACE_NOT_READY', 'Admin pack delivery surface V2 is not ready.');
  if (!input.adminMentionsStudyTarget || !input.adminMentionsSourceLocale) addFinding(findings, 'blocker', 'ADMIN_IDENTITY_DIMENSIONS_MISSING', 'Admin surface must mention studyTarget and sourceLocale.');
  if (input.adminRequiredApprovalFields < 16 || input.adminRequiredAdminGates < 6) addFinding(findings, 'blocker', 'ADMIN_GATE_COVERAGE_INSUFFICIENT', 'Admin surface approval/gate coverage is below contract.');
  if (!input.runtimeReady) addFinding(findings, 'blocker', 'RUNTIME_CACHE_CONTRACT_NOT_READY', 'Runtime cache integrity contract is not ready.');
  if (input.runtimeDownloadsEnabled || input.runtimeCacheWritesOpened || input.runtimeReadyCacheStateOpened) addFinding(findings, 'blocker', 'RUNTIME_OPENED_TOO_EARLY', 'Runtime downloads/cache writes/ready state must remain closed.');
  if (!input.storageReady) addFinding(findings, 'blocker', 'STORAGE_CLOUD_MAP_NOT_READY', 'Storage/cloud target map is not ready.');
  if (input.storageMigrationAllowed || input.cloudSyncMigrationAllowed) addFinding(findings, 'blocker', 'STORAGE_CLOUD_MIGRATION_OPENED', 'Storage/cloud migration must remain closed.');
  if (input.manifestForbiddenUiLocaleRefs > 0) addFinding(findings, 'blocker', 'MANIFEST_UI_LOCALE_REFS', `${input.manifestForbiddenUiLocaleRefs} uiLocale reference(s) in manifest draft.`);
  if (input.manifestForbiddenOpenFlags > 0) addFinding(findings, 'blocker', 'MANIFEST_OPEN_FLAGS', `${input.manifestForbiddenOpenFlags} forbidden true flag(s) in manifest draft.`);
  if (input.productionServerManifestExists) addFinding(findings, 'blocker', 'PRODUCTION_SERVER_MANIFEST_EXISTS', 'Production server manifest must not exist before upload gate.');

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const manifestEntriesStudyTargetFr = input.manifestEntries.filter((entry) => s(entry, 'studyTarget') === 'fr').length;
  const manifestEntriesSourceScoped = input.manifestEntries.filter((entry) => {
    const sourceLocale = s(entry, 'sourceLocale');
    const serverPath = s(entry, 'serverPath');
    const cacheKey = s(entry, 'cacheKey');
    return (sourceLocale === 'ru' || sourceLocale === 'uk') && serverPath.includes(`/fr/${sourceLocale}/`) && cacheKey.includes(`fr/${sourceLocale}/`);
  }).length;
  const accepted = blockers === 0;
  return {
    findings,
    evaluation: {
      targetLocale: 'fr',
      manifestDraftPresent: input.manifestDraftPresent,
      manifestEntries: input.manifestEntries.length,
      manifestEntriesStudyTargetFr,
      manifestEntriesSourceScoped,
      manifestEntriesWithActualSha256: input.manifestEntries.filter((entry) => /^[a-f0-9]{64}$/.test(s(entry, 'payloadSha256'))).length,
      manifestEntriesWithActualByteSize: input.manifestEntries.filter((entry) => n(entry, 'payloadBytes') > 0).length,
      adminReady: input.adminReady,
      adminMentionsStudyTarget: input.adminMentionsStudyTarget,
      adminMentionsSourceLocale: input.adminMentionsSourceLocale,
      adminRequiredApprovalFields: input.adminRequiredApprovalFields,
      adminRequiredAdminGates: input.adminRequiredAdminGates,
      runtimeReady: input.runtimeReady,
      runtimeDownloadsEnabled: false,
      runtimeCacheWritesOpened: false,
      runtimeReadyCacheStateOpened: false,
      storageReady: input.storageReady,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      manifestForbiddenUiLocaleRefs: input.manifestForbiddenUiLocaleRefs,
      manifestForbiddenOpenFlags: input.manifestForbiddenOpenFlags,
      productionServerManifestExists: input.productionServerManifestExists,
      adminImportUploadAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      activationApproved: false,
      readyForRuntimeDownloadActivation: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      readyForRuntimeActivationBlockerPlanningV2: accepted,
      preflightState: blockers > 0 ? 'blocked_by_findings' : input.manifestDraftPresent ? 'admin_server_runtime_preflight_ready' : 'closed_missing_server_manifest_draft',
      blockers,
      warnings,
    },
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{
    id: string;
    expectedAccept: boolean;
    expectedState: PreflightState;
    mutate: (input: EvaluationInput) => void;
  }> = [
    { id: 'canonical_admin_runtime_preflight_is_accepted', expectedAccept: true, expectedState: 'admin_server_runtime_preflight_ready', mutate: () => undefined },
    { id: 'missing_manifest_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.manifestDraftPresent = false; } },
    { id: 'admin_identity_missing_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.adminMentionsSourceLocale = false; } },
    { id: 'runtime_download_open_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'storage_migration_open_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.storageMigrationAllowed = true; } },
    { id: 'manifest_open_flag_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.manifestForbiddenOpenFlags = 1; } },
  ];
  return cases.map((testCase) => {
    const fixture = clone(base);
    testCase.mutate(fixture);
    const result = evaluate(fixture).evaluation;
    const accepted = result.readyForRuntimeActivationBlockerPlanningV2;
    return {
      id: testCase.id,
      expectedAccept: testCase.expectedAccept,
      expectedState: testCase.expectedState,
      accepted,
      preflightState: result.preflightState,
      blockers: result.blockers,
      passed: accepted === testCase.expectedAccept && result.preflightState === testCase.expectedState,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Admin Server Delivery Runtime Preflight V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Preflight state: ${report.summary.preflightState}`,
    `- Manifest entries: ${report.summary.manifestEntries}`,
    `- Admin ready: ${report.summary.adminReady ? 'yes' : 'no'}`,
    `- Runtime ready: ${report.summary.runtimeReady ? 'yes' : 'no'}`,
    `- Storage ready: ${report.summary.storageReady ? 'yes' : 'no'}`,
    `- Ready for runtime activation blocker planning V2: ${report.summary.readyForRuntimeActivationBlockerPlanningV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Closed Transitions',
    '',
    `- Admin import/upload allowed: ${report.summary.adminImportUploadAllowed}`,
    `- Server upload allowed: ${report.summary.serverUploadAllowed}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled}`,
    `- Activation approved: ${report.summary.activationApproved}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);

  const runDir = path.resolve(repoRoot, runArg);
  const auditsDir = path.join(runDir, 'audits');
  const packDir = path.join(runDir, 'pack_candidates', 'fr');
  const p26Path = path.join(auditsDir, 'server_delivery_publish_preflight_v2_packet.json');
  const adminPath = path.join(auditsDir, 'admin_pack_delivery_surface_v2_packet.json');
  const runtimePath = path.join(auditsDir, 'runtime_cache_integrity_rollback_v2_packet.json');
  const storagePath = path.join(auditsDir, 'storage_cloud_target_map_v2_packet.json');
  const manifestDraftPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const productionServerManifestPath = path.join(packDir, 'server_delivery_manifest_v2.json');
  const outputJsonPath = path.join(auditsDir, 'admin_server_delivery_runtime_preflight_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'admin_server_delivery_runtime_preflight_v2_packet.md');

  const p26 = readJson<JsonObject>(p26Path);
  const admin = readJson<JsonObject>(adminPath);
  const runtime = readJson<JsonObject>(runtimePath);
  const storage = readJson<JsonObject>(storagePath);
  const p26Summary = summaryOf(p26);
  const adminSummary = summaryOf(admin);
  const runtimeSummary = summaryOf(runtime);
  const storageSummary = summaryOf(storage);
  const manifestDraft = fs.existsSync(manifestDraftPath) ? readJson<JsonObject>(manifestDraftPath) : {};
  const manifestEntriesRaw = manifestDraft.entries;
  const manifestEntries = (Array.isArray(manifestEntriesRaw) ? manifestEntriesRaw : []).map(object);

  const input: EvaluationInput = {
    p26Ready:
      n(p26Summary, 'blockers') === 0 &&
      b(p26Summary, 'readyForAdminServerDeliveryReviewV2') &&
      s(p26Summary, 'publishPreflightState') === 'local_server_manifest_draft_ready',
    p26State: s(p26Summary, 'publishPreflightState'),
    p26Blockers: n(p26Summary, 'blockers'),
    manifestDraftPresent: fs.existsSync(manifestDraftPath),
    manifestEntries,
    adminReady: n(adminSummary, 'blockers') === 0 && b(adminSummary, 'readyForReviewerDecisionImportV2DryRun'),
    adminMentionsStudyTarget: b(adminSummary, 'adminMentionsStudyTarget'),
    adminMentionsSourceLocale: b(adminSummary, 'adminMentionsSourceLocale'),
    adminRequiredApprovalFields: n(adminSummary, 'requiredApprovalFields'),
    adminRequiredAdminGates: n(adminSummary, 'requiredAdminGates'),
    runtimeReady: n(runtimeSummary, 'blockers') === 0 && b(runtimeSummary, 'readyForReviewerDecisionImportOpeningGate'),
    runtimeDownloadsEnabled: b(runtimeSummary, 'runtimeDownloadsEnabled'),
    runtimeCacheWritesOpened: b(runtimeSummary, 'cacheWritesOpened'),
    runtimeReadyCacheStateOpened: b(runtimeSummary, 'readyCacheStateOpened'),
    storageReady: n(storageSummary, 'blockers') === 0 && b(storageSummary, 'readyForAdminPackDeliverySurfaceV2'),
    storageMigrationAllowed: b(storageSummary, 'storageMigrationAllowed'),
    cloudSyncMigrationAllowed: b(storageSummary, 'cloudSyncMigrationAllowed'),
    manifestForbiddenUiLocaleRefs: fs.existsSync(manifestDraftPath) ? countUiLocaleRefs(manifestDraftPath) : 0,
    manifestForbiddenOpenFlags: fs.existsSync(manifestDraftPath) ? countForbiddenOpenFlags(manifestDraftPath) : 0,
    productionServerManifestExists: fs.existsSync(productionServerManifestPath),
  };

  const { evaluation, findings } = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) {
    addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
    evaluation.blockers += 1;
    evaluation.preflightState = 'blocked_by_findings';
    evaluation.readyForRuntimeActivationBlockerPlanningV2 = false;
  }
  const status: Status = evaluation.blockers > 0 ? 'BLOCK' : evaluation.readyForRuntimeActivationBlockerPlanningV2 ? 'PASS' : 'HOLD';
  const report: Report = {
    schemaVersion: 'gustav-admin-server-delivery-runtime-preflight-v2-packet-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status,
    command: { argv: process.argv.slice(2), cwd: repoRoot, nodeVersion: process.version },
    inputs: {
      serverDeliveryPublishPreflightV2Packet: rel(repoRoot, p26Path),
      adminPackDeliverySurfaceV2Packet: rel(repoRoot, adminPath),
      runtimeCacheIntegrityRollbackV2Packet: rel(repoRoot, runtimePath),
      storageCloudTargetMapV2Packet: rel(repoRoot, storagePath),
      serverDeliveryManifestV2Draft: rel(repoRoot, manifestDraftPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      ...evaluation,
      blockers: findings.filter((finding) => finding.severity === 'blocker').length,
      warnings: findings.filter((finding) => finding.severity === 'warning').length,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    artifactHashes: {
      serverDeliveryPublishPreflightV2Packet: sha256(p26Path),
      adminPackDeliverySurfaceV2Packet: sha256(adminPath),
      runtimeCacheIntegrityRollbackV2Packet: sha256(runtimePath),
      storageCloudTargetMapV2Packet: sha256(storagePath),
      serverDeliveryManifestV2Draft: fs.existsSync(manifestDraftPath) ? sha256(manifestDraftPath) : '',
    },
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      adminStateModifiedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };
  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV admin/server delivery runtime preflight V2 packet: ${report.status}`);
  console.log(`Preflight state: ${report.summary.preflightState}`);
  console.log(`Manifest entries: ${report.summary.manifestEntries}`);
  console.log(`Ready for runtime activation blocker planning V2: ${report.summary.readyForRuntimeActivationBlockerPlanningV2 ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
}

main();
