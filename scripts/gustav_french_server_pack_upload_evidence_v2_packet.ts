import * as crypto from 'node:crypto';
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

type UploadObject = {
  runtimeSliceId: string;
  studyTarget: 'fr';
  sourceLocale: string;
  surface: string;
  contentVersion: string;
  objectRole: 'manifest' | 'entry_index' | 'payload';
  localPayloadPath: string;
  serverPath: string;
  payloadSha256: string;
  payloadBytes: number;
  rollbackScope: string;
};

type Report = {
  schemaVersion: 'gustav-french-server-pack-upload-evidence-v2-packet-v0';
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
    expectedObjects: 36;
    uploadObjects: number;
    localPayloadsPresent: number;
    localPayloadShaMatches: number;
    localPayloadByteMatches: number;
    sourceScopedServerPaths: number;
    deniedUiLocaleRefs: number;
    deniedEnglishPathRefs: number;
    rollbackScopes: number;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    downloadablePacksPublished: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    readyForRemoteObjectVerify: boolean;
    blockers: number;
    warnings: number;
  };
  uploadObjects: UploadObject[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    productionApplyApproved: false;
  };
};

const EXPECTED_PAYLOAD_OBJECTS = 12;
const EXPECTED_OBJECTS = 36 as const;
const SOURCE_LOCALES = new Set(['ru', 'uk']);
const SURFACES = new Set(['lesson', 'lesson_intro', 'quiz', 'audio_metadata', 'flashcard', 'personal_practice']);

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

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function arr(value: JsonObject, key: string): JsonObject[] {
  const raw = value[key];
  return Array.isArray(raw) ? raw.map(object) : [];
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

function sha256(filePath: string): string {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function blockedTopLevelFlags(manifest: JsonObject): boolean {
  return b(manifest, 'serverUploadAllowed') ||
    b(manifest, 'firebaseUploadAllowed') ||
    b(manifest, 'downloadablePacksPublished') ||
    b(manifest, 'runtimeDownloadsEnabled') ||
    b(manifest, 'activationApproved') ||
    b(manifest, 'readyForApply') ||
    b(manifest, 'mayModifyProductionAppFiles');
}

export function buildFrenchServerPackUploadEvidence(input: {
  repoRoot: string;
  runDir: string;
  manifestPath: string;
  policyPath: string;
}): Report {
  const findings: Finding[] = [];
  const runId = path.basename(input.runDir);
  const manifest = fs.existsSync(input.manifestPath) ? readJson<JsonObject>(input.manifestPath) : {};
  const policy = fs.existsSync(input.policyPath) ? readJson<JsonObject>(input.policyPath) : {};
  const entries = arr(manifest, 'entries');
  const uploadObjects: UploadObject[] = [];

  if (!fs.existsSync(input.manifestPath)) {
    addFinding(findings, 'blocker', 'production_manifest_missing', 'server_delivery_manifest_v2.json is required before upload evidence can be built.', input.manifestPath);
  }
  if (!fs.existsSync(input.policyPath) || s(policy, 'status') !== 'PASS') {
    addFinding(findings, 'blocker', 'upload_policy_not_pass', 'server_pack_upload_policy_v2_packet.json must be PASS before upload evidence is trusted.', input.policyPath);
  }
  if (s(manifest, 'studyTarget') !== 'fr' || s(manifest, 'targetLocale') !== 'fr') {
    addFinding(findings, 'blocker', 'manifest_target_drift', 'Upload evidence requires studyTarget=fr and targetLocale=fr.', input.manifestPath);
  }
  if (entries.length !== EXPECTED_PAYLOAD_OBJECTS) {
    addFinding(findings, 'blocker', 'manifest_entry_count_invalid', `Expected ${EXPECTED_PAYLOAD_OBJECTS} manifest entries, got ${entries.length}.`, input.manifestPath);
  }
  if (blockedTopLevelFlags(manifest)) {
    addFinding(findings, 'blocker', 'manifest_top_level_flags_open', 'Upload evidence cannot be built from a manifest with upload/download/activation/apply flags open.', input.manifestPath);
  }

  let localPayloadsPresent = 0;
  let localPayloadShaMatches = 0;
  let localPayloadByteMatches = 0;
  let sourceScopedServerPaths = 0;
  let deniedUiLocaleRefs = 0;
  let deniedEnglishPathRefs = 0;
  const rollbackScopes = new Set<string>();

  for (const entry of entries) {
    const sourceLocale = s(entry, 'sourceLocale');
    const surface = s(entry, 'surface');
    const contentVersion = s(entry, 'contentVersion');
    const prefix = `course-packs/fr/${sourceLocale}/${surface}/${contentVersion}`;
    const serverPath = s(entry, 'serverPath');
    const localManifestPath = path.resolve(input.repoRoot, s(entry, 'sliceManifest'));
    const localIndexPath = path.resolve(input.repoRoot, s(entry, 'entryIndex'));
    const localPayloadPath = path.resolve(input.repoRoot, s(entry, 'payloadShard'));
    const payloadSha256 = s(entry, 'payloadSha256');
    const payloadBytes = n(entry, 'payloadBytes');
    const rollbackScope = `course-packs/fr/${sourceLocale}/`;
    const localPresent = fs.existsSync(localPayloadPath);
    const localSha = sha256(localPayloadPath);
    const localBytes = localPresent ? fs.statSync(localPayloadPath).size : 0;

    if (localPresent) localPayloadsPresent += 1;
    if (localSha === payloadSha256) localPayloadShaMatches += 1;
    if (localBytes === payloadBytes) localPayloadByteMatches += 1;
    if (/uiLocale|interfaceLocale|uiLanguage|interfaceLanguage/.test(JSON.stringify(entry))) deniedUiLocaleRefs += 1;
    rollbackScopes.add(rollbackScope);

    const objectSpecs: {
      objectRole: UploadObject['objectRole'];
      localPath: string;
      serverPath: string;
      sha256: string;
      bytes: number;
    }[] = [
      {
        objectRole: 'manifest',
        localPath: localManifestPath,
        serverPath: `${prefix}/manifest.json`,
        sha256: sha256(localManifestPath),
        bytes: fs.existsSync(localManifestPath) ? fs.statSync(localManifestPath).size : 0,
      },
      {
        objectRole: 'entry_index',
        localPath: localIndexPath,
        serverPath: `${prefix}/index.json`,
        sha256: sha256(localIndexPath),
        bytes: fs.existsSync(localIndexPath) ? fs.statSync(localIndexPath).size : 0,
      },
      {
        objectRole: 'payload',
        localPath: localPayloadPath,
        serverPath,
        sha256: payloadSha256,
        bytes: payloadBytes,
      },
    ];
    for (const spec of objectSpecs) {
      if (SOURCE_LOCALES.has(sourceLocale) && SURFACES.has(surface) && spec.serverPath.startsWith(`course-packs/fr/${sourceLocale}/${surface}/`)) {
        sourceScopedServerPaths += 1;
      }
      if (spec.serverPath.startsWith('course-packs/en/') || spec.serverPath.includes('/../')) deniedEnglishPathRefs += 1;
      uploadObjects.push({
        runtimeSliceId: s(entry, 'runtimeSliceId'),
        studyTarget: 'fr',
        sourceLocale,
        surface,
        contentVersion,
        objectRole: spec.objectRole,
        localPayloadPath: rel(input.repoRoot, spec.localPath),
        serverPath: spec.serverPath,
        payloadSha256: spec.sha256,
        payloadBytes: spec.bytes,
        rollbackScope,
      });
    }
  }

  if (uploadObjects.length !== EXPECTED_OBJECTS) {
    addFinding(findings, 'blocker', 'upload_object_count_invalid', `Expected ${EXPECTED_OBJECTS} upload evidence objects, got ${uploadObjects.length}.`);
  }
  if (localPayloadsPresent !== EXPECTED_PAYLOAD_OBJECTS) {
    addFinding(findings, 'blocker', 'local_payloads_missing', `Expected ${EXPECTED_PAYLOAD_OBJECTS} local payloads, got ${localPayloadsPresent}.`);
  }
  if (localPayloadShaMatches !== EXPECTED_PAYLOAD_OBJECTS || localPayloadByteMatches !== EXPECTED_PAYLOAD_OBJECTS) {
    addFinding(findings, 'blocker', 'local_payload_checksum_drift', 'Every local payload must match manifest payloadSha256 and payloadBytes.');
  }
  if (sourceScopedServerPaths !== EXPECTED_OBJECTS) {
    addFinding(findings, 'blocker', 'server_paths_not_source_scoped', 'Every upload path must stay under course-packs/fr/<sourceLocale>/<surface>/.');
  }
  if (deniedUiLocaleRefs > 0 || deniedEnglishPathRefs > 0) {
    addFinding(findings, 'blocker', 'forbidden_upload_scope_reference', 'Upload evidence must not reference uiLocale/interface locale or English pack paths.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';

  if (status === 'PASS') {
    addFinding(findings, 'info', 'upload_evidence_only_no_upload', 'Upload evidence is complete, but this packet did not upload to Firebase/server.');
  }

  return {
    schemaVersion: 'gustav-french-server-pack-upload-evidence-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: input.repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      productionServerManifest: rel(input.repoRoot, input.manifestPath),
      serverPackUploadPolicyV2Packet: rel(input.repoRoot, input.policyPath),
    },
    outputs: {},
    summary: {
      targetLocale: 'fr',
      expectedObjects: EXPECTED_OBJECTS,
      uploadObjects: uploadObjects.length,
      localPayloadsPresent,
      localPayloadShaMatches,
      localPayloadByteMatches,
      sourceScopedServerPaths,
      deniedUiLocaleRefs,
      deniedEnglishPathRefs,
      rollbackScopes: rollbackScopes.size,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      readyForRemoteObjectVerify: status === 'PASS',
      blockers,
      warnings,
    },
    uploadObjects,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      productionApplyApproved: false,
    },
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Server Pack Upload Evidence V2',
    '',
    `- Status: ${report.status}`,
    `- Upload objects: ${report.summary.uploadObjects}/${report.summary.expectedObjects}`,
    `- Local payload hash/byte matches: ${report.summary.localPayloadShaMatches}/${report.summary.localPayloadByteMatches}`,
    `- Source-scoped server paths: ${report.summary.sourceScopedServerPaths}`,
    `- Ready for remote object verify: ${report.summary.readyForRemoteObjectVerify ? 'yes' : 'no'}`,
    `- Firebase/server upload started: ${report.safety.firebaseOrServerUploadStarted ? 'yes' : 'no'}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`,
    `- Activation approved: ${report.summary.activationApproved ? 'yes' : 'no'}`,
    '',
    '## Upload Objects',
  ];
  for (const item of report.uploadObjects) {
    lines.push(`- \`${item.runtimeSliceId}\`: \`${item.localPayloadPath}\` -> \`${item.serverPath}\` (${item.payloadBytes} bytes, ${item.payloadSha256})`);
  }
  if (report.findings.length > 0) {
    lines.push('', '## Findings');
    for (const finding of report.findings) {
      lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);
  const runDir = path.resolve(repoRoot, runArg);
  const manifestPath = path.join(runDir, 'pack_candidates/fr/server_delivery_manifest_v2.json');
  const policyPath = path.join(runDir, 'audits/server_pack_upload_policy_v2_packet.json');
  const outputJsonPath = path.join(runDir, 'audits/french_server_pack_upload_evidence_v2_packet.json');
  const outputMdPath = path.join(runDir, 'audits/french_server_pack_upload_evidence_v2_packet.md');
  const report = buildFrenchServerPackUploadEvidence({ repoRoot, runDir, manifestPath, policyPath });
  report.outputs = {
    packet: rel(repoRoot, outputJsonPath),
    markdown: rel(repoRoot, outputMdPath),
  };
  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV French server pack upload evidence V2 packet: ${report.status}`);
  console.log(`Upload objects: ${report.summary.uploadObjects}/${report.summary.expectedObjects}`);
  console.log(`Ready for remote verify: ${report.summary.readyForRemoteObjectVerify ? 'yes' : 'no'}`);
  console.log(`Firebase/server upload started: ${report.safety.firebaseOrServerUploadStarted ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

if (require.main === module) {
  main();
}
