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

type UploadPolicyContract = {
  schemaVersion: 'gustav-server-pack-upload-policy-v2';
  runId: string;
  studyTarget: 'fr';
  sourceLocales: ['ru', 'uk'];
  policyMode: 'policy_only_no_upload';
  allowedStoragePathPrefixes: string[];
  deniedStoragePathPrefixes: string[];
  requiredUploadGuards: string[];
  requiredAclGuards: string[];
  requiredChecksumGuards: string[];
  requiredRollbackGuards: string[];
  disallowedTransitionsNow: {
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    downloadablePacksPublished: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
  };
};

type Report = {
  schemaVersion: 'gustav-server-pack-upload-policy-v2-packet-v0';
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
    policyMode: 'policy_only_no_upload';
    serverPackUploadPolicyReady: boolean;
    serverManifestDraftPresent: boolean;
    manifestEntries: number;
    manifestStudyTargetFr: number;
    sourceScopedServerPaths: number;
    payloadShaEntries: number;
    payloadByteSizeEntries: number;
    gateReportRefsEntries: number;
    rollbackFromVersionEntries: number;
    forbiddenUiLocaleRefs: number;
    forbiddenOpenFlags: number;
    allowedStoragePathPrefixes: number;
    deniedStoragePathPrefixes: number;
    requiredUploadGuards: number;
    requiredAclGuards: number;
    requiredChecksumGuards: number;
    requiredRollbackGuards: number;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    downloadablePacksPublished: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    readyForAdminPackDeliverySurfaceRefresh: boolean;
    blockers: number;
    warnings: number;
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  artifactHashes: Record<string, string>;
  contract: UploadPolicyContract;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    storageOrCloudMigrationStarted: false;
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

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function countForbiddenOpenFlags(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const text = fs.readFileSync(filePath, 'utf8');
  return [
    '"serverUploadAllowed": true',
    '"firebaseUploadAllowed": true',
    '"downloadablePacksPublished": true',
    '"runtimeDownloadsEnabled": true',
    '"activationApproved": true',
    '"readyForApply": true',
    '"mayModifyProductionAppFiles": true',
  ].reduce((sum, pattern) => sum + (text.includes(pattern) ? 1 : 0), 0);
}

function countUiLocaleRefs(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  return (fs.readFileSync(filePath, 'utf8').match(/uiLocale/g) ?? []).length;
}

function buildContract(runId: string): UploadPolicyContract {
  return {
    schemaVersion: 'gustav-server-pack-upload-policy-v2',
    runId,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    policyMode: 'policy_only_no_upload',
    allowedStoragePathPrefixes: [
      'course-packs/fr/ru/',
      'course-packs/fr/uk/',
    ],
    deniedStoragePathPrefixes: [
      'course-packs/en/',
      'course-packs/fr/uiLocale/',
      'course-packs/fr/sourceLocale/',
      'course-packs/fr/*/../../',
    ],
    requiredUploadGuards: [
      'Upload requires active exact approval receipt and active hash-lock pair.',
      'Upload requires manifest entry studyTarget=fr and sourceLocale in ru|uk.',
      'Upload requires serverPath under course-packs/fr/<sourceLocale>/<surface>/<contentVersion>/<sha256>.json.',
      'Upload is denied while serverUploadAllowed=false or firebaseUploadAllowed=false.',
      'Upload may not publish downloadablePacksPublished or runtimeDownloadsEnabled.',
    ],
    requiredAclGuards: [
      'Firebase Storage write must be admin/service-account only.',
      'Runtime clients may read only published manifest entries after activation gate.',
      'No write/read policy may infer studyTarget from uiLocale.',
      'French uploads cannot overwrite English or global pack paths.',
    ],
    requiredChecksumGuards: [
      'payloadSha256 must be a concrete 64-hex sha256.',
      'payloadBytes must be greater than zero.',
      'entryIndexSha256 and sliceManifestSha256 must be concrete 64-hex sha256 values.',
      'checksumReport must exist before upload and match the manifest entry.',
    ],
    requiredRollbackGuards: [
      'Rollback must disable runtime downloads before removing any manifest references.',
      'Rollback deletes only course-packs/fr/<sourceLocale>/ scoped artifacts for this contentVersion.',
      'Rollback must preserve English packs and all non-French user state.',
      'Rollback evidence must include manifest revert, cache quarantine and checksum report references.',
    ],
    disallowedTransitionsNow: {
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
  };
}

function evaluate(contract: UploadPolicyContract, manifestPath: string): { findings: Finding[]; metrics: Report['summary'] } {
  const findings: Finding[] = [];
  const manifest = fs.existsSync(manifestPath) ? object(readJson<unknown>(manifestPath)) : {};
  const entries = array(manifest.entries).map(object);
  if (!fs.existsSync(manifestPath)) addFinding(findings, 'blocker', 'manifest_draft_missing', 'Server delivery manifest draft is missing.', manifestPath);
  if (contract.allowedStoragePathPrefixes.length !== 2) addFinding(findings, 'blocker', 'allowed_prefixes_invalid', 'Upload policy must allow only fr/ru and fr/uk prefixes.');
  if (contract.requiredUploadGuards.length < 5) addFinding(findings, 'blocker', 'upload_guards_incomplete', 'Upload guard coverage is incomplete.');
  if (contract.requiredAclGuards.length < 4) addFinding(findings, 'blocker', 'acl_guards_incomplete', 'ACL guard coverage is incomplete.');
  if (contract.requiredChecksumGuards.length < 4) addFinding(findings, 'blocker', 'checksum_guards_incomplete', 'Checksum guard coverage is incomplete.');
  if (contract.requiredRollbackGuards.length < 4) addFinding(findings, 'blocker', 'rollback_guards_incomplete', 'Rollback guard coverage is incomplete.');
  for (const [key, value] of Object.entries(contract.disallowedTransitionsNow)) {
    if (value !== false) addFinding(findings, 'blocker', 'dangerous_transition_opened', `Dangerous transition must stay false: ${key}.`);
  }
  if (entries.length !== 12) addFinding(findings, 'blocker', 'manifest_entry_count_invalid', `Expected 12 manifest entries, got ${entries.length}.`, manifestPath);

  const manifestStudyTargetFr = entries.filter((entry) => s(entry, 'studyTarget') === 'fr').length;
  const sourceScopedServerPaths = entries.filter((entry) => {
    const sourceLocale = s(entry, 'sourceLocale');
    const serverPath = s(entry, 'serverPath');
    return (sourceLocale === 'ru' || sourceLocale === 'uk') && serverPath.startsWith(`course-packs/fr/${sourceLocale}/`);
  }).length;
  const payloadShaEntries = entries.filter((entry) => /^[a-f0-9]{64}$/.test(s(entry, 'payloadSha256'))).length;
  const payloadByteSizeEntries = entries.filter((entry) => n(entry, 'payloadBytes') > 0).length;
  const gateReportRefsEntries = entries.filter((entry) => array(entry.gateReportRefs).length >= 1).length;
  const rollbackFromVersionEntries = entries.filter((entry) => s(entry, 'rollbackFromVersion') !== '').length;
  const forbiddenUiLocaleRefs = countUiLocaleRefs(manifestPath);
  const forbiddenOpenFlags = countForbiddenOpenFlags(manifestPath);
  if (manifestStudyTargetFr !== entries.length) addFinding(findings, 'blocker', 'manifest_target_mismatch', 'Every manifest entry must have studyTarget=fr.', manifestPath);
  if (sourceScopedServerPaths !== entries.length) addFinding(findings, 'blocker', 'server_paths_not_source_scoped', 'Every server path must be sourceLocale-scoped under course-packs/fr/ru|uk.', manifestPath);
  if (payloadShaEntries !== entries.length) addFinding(findings, 'blocker', 'payload_sha_missing', 'Every manifest entry must have concrete payloadSha256.', manifestPath);
  if (payloadByteSizeEntries !== entries.length) addFinding(findings, 'blocker', 'payload_bytes_missing', 'Every manifest entry must have payloadBytes > 0.', manifestPath);
  if (gateReportRefsEntries !== entries.length) addFinding(findings, 'blocker', 'gate_report_refs_missing', 'Every manifest entry must carry gateReportRefs.', manifestPath);
  if (rollbackFromVersionEntries !== entries.length) addFinding(findings, 'blocker', 'rollback_from_version_missing', 'Every manifest entry must carry rollbackFromVersion.', manifestPath);
  if (forbiddenUiLocaleRefs > 0) addFinding(findings, 'blocker', 'ui_locale_refs_forbidden', 'Upload policy forbids uiLocale dimensions in server manifest draft.', manifestPath);
  if (forbiddenOpenFlags > 0) addFinding(findings, 'blocker', 'open_flags_forbidden', 'Server manifest draft contains forbidden true production flags.', manifestPath);

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  return {
    findings,
    metrics: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      policyMode: 'policy_only_no_upload',
      serverPackUploadPolicyReady: blockers === 0,
      serverManifestDraftPresent: fs.existsSync(manifestPath),
      manifestEntries: entries.length,
      manifestStudyTargetFr,
      sourceScopedServerPaths,
      payloadShaEntries,
      payloadByteSizeEntries,
      gateReportRefsEntries,
      rollbackFromVersionEntries,
      forbiddenUiLocaleRefs,
      forbiddenOpenFlags,
      allowedStoragePathPrefixes: contract.allowedStoragePathPrefixes.length,
      deniedStoragePathPrefixes: contract.deniedStoragePathPrefixes.length,
      requiredUploadGuards: contract.requiredUploadGuards.length,
      requiredAclGuards: contract.requiredAclGuards.length,
      requiredChecksumGuards: contract.requiredChecksumGuards.length,
      requiredRollbackGuards: contract.requiredRollbackGuards.length,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      readyForAdminPackDeliverySurfaceRefresh: blockers === 0,
      blockers,
      warnings,
      fixtureProbesPassed: 0,
      fixtureProbes: 0,
    },
  };
}

function makeProbes(contract: UploadPolicyContract, manifestPath: string): Probe[] {
  const fixtures: { id: string; expectedAccept: boolean; mutate?: (draft: UploadPolicyContract) => void }[] = [
    { id: 'canonical_upload_policy_accepts', expectedAccept: true },
    { id: 'server_upload_open_rejected', expectedAccept: false, mutate: (draft) => { (draft.disallowedTransitionsNow as { serverUploadAllowed: boolean }).serverUploadAllowed = true; } },
    { id: 'runtime_download_open_rejected', expectedAccept: false, mutate: (draft) => { (draft.disallowedTransitionsNow as { runtimeDownloadsEnabled: boolean }).runtimeDownloadsEnabled = true; } },
    { id: 'missing_acl_guards_rejected', expectedAccept: false, mutate: (draft) => { draft.requiredAclGuards = []; } },
    { id: 'missing_checksum_guards_rejected', expectedAccept: false, mutate: (draft) => { draft.requiredChecksumGuards = []; } },
    { id: 'wrong_allowed_prefixes_rejected', expectedAccept: false, mutate: (draft) => { draft.allowedStoragePathPrefixes = ['course-packs/fr/']; } },
  ];
  return fixtures.map((fixture) => {
    const draft = JSON.parse(JSON.stringify(contract)) as UploadPolicyContract;
    fixture.mutate?.(draft);
    const blockers = evaluate(draft, manifestPath).findings.filter((finding) => finding.severity === 'blocker').length;
    const accepted = blockers === 0;
    return { id: fixture.id, expectedAccept: fixture.expectedAccept, accepted, blockers, passed: accepted === fixture.expectedAccept };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Server Pack Upload Policy V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Policy mode: ${report.summary.policyMode}`,
    `- Server pack upload policy ready: ${report.summary.serverPackUploadPolicyReady ? 'yes' : 'no'}`,
    `- Manifest entries: ${report.summary.manifestEntries}`,
    `- Source-scoped server paths: ${report.summary.sourceScopedServerPaths}`,
    `- Payload sha entries: ${report.summary.payloadShaEntries}`,
    `- Payload byte-size entries: ${report.summary.payloadByteSizeEntries}`,
    `- Upload/download/apply flags: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}/${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    '',
    '## Allowed Prefixes',
    '',
    ...report.contract.allowedStoragePathPrefixes.map((prefix) => `- \`${prefix}\``),
    '',
    '## Safety',
    '',
    '- This packet defines upload policy only.',
    '- It does not upload to Firebase/server.',
    '- It does not publish a production manifest.',
    '- It does not enable runtime downloads or activation.',
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
  if (!runArg) throw new Error('Usage: npx tsx scripts/gustav_server_pack_upload_policy_v2_packet.ts --run <run-dir> --target fr');
  if (target !== 'fr') throw new Error('Server pack upload policy V2 is currently scoped to --target fr.');

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const manifestPath = path.join(runDir, 'pack_candidates', 'fr', 'server_delivery_manifest_v2_draft.json');
  const outJson = path.join(auditsDir, 'server_pack_upload_policy_v2_packet.json');
  const outMd = path.join(auditsDir, 'server_pack_upload_policy_v2_packet.md');
  const contract = buildContract(runId);
  const result = evaluate(contract, manifestPath);
  const probes = makeProbes(contract, manifestPath);
  const findings = [...result.findings];
  for (const probe of probes.filter((candidate) => !candidate.passed)) {
    addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }
  addFinding(findings, 'info', 'policy_only_no_upload', 'Server pack upload policy is defined, but no upload/publish/download/activation was opened.');
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const summary = {
    ...result.metrics,
    serverPackUploadPolicyReady: blockers === 0,
    readyForAdminPackDeliverySurfaceRefresh: blockers === 0,
    blockers,
    warnings,
    fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
    fixtureProbes: probes.length,
  };
  const report: Report = {
    schemaVersion: 'gustav-server-pack-upload-policy-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: { argv: process.argv.slice(2), cwd: repoRoot, nodeVersion: process.version },
    inputs: { serverDeliveryManifestV2Draft: rel(repoRoot, manifestPath) },
    outputs: {
      serverPackUploadPolicyV2PacketJson: rel(repoRoot, outJson),
      serverPackUploadPolicyV2PacketMd: rel(repoRoot, outMd),
    },
    summary,
    artifactHashes: { serverDeliveryManifestV2Draft: sha256(manifestPath) },
    contract,
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };
  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV server pack upload policy V2 packet: ${report.status}`);
  console.log(`Server pack upload policy ready: ${report.summary.serverPackUploadPolicyReady ? 'yes' : 'no'}`);
  console.log(`Manifest entries: ${report.summary.manifestEntries}`);
  console.log(`Upload/download/apply: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}/${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);
  if (blockers > 0) process.exitCode = 1;
}

main();
