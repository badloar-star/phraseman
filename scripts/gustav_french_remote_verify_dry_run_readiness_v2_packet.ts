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

type PlannedCheck = {
  runtimeSliceId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  objectRole: string;
  serverPath: string;
  payloadSha256: string;
  payloadBytes: number;
  expectedListPrefix: string;
  expectedMediaObject: string;
};

type Report = {
  schemaVersion: 'gustav-french-remote-verify-dry-run-readiness-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  summary: {
    targetLocale: 'fr';
    studyTarget: 'fr';
    productionManifestPresent: boolean;
    uploadEvidencePresent: boolean;
    expectedObjects: 36;
    plannedChecks: number;
    uniqueServerPaths: number;
    sourceLocales: string[];
    surfaces: string[];
    scopedServerPaths: number;
    payloadShaMatchesUploadEvidence: number;
    payloadByteMatchesUploadEvidence: number;
    payloadShaFilenameMatches: number;
    deniedEnglishPathRefs: number;
    deniedUiLocaleRefs: number;
    openEntryFlags: number;
    credentialRequiredForLiveVerify: true;
    credentialSourcePresent: boolean;
    safeToRunLiveVerifyWhenCredentialPresent: boolean;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    blockers: number;
    warnings: number;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  plannedChecks: PlannedCheck[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    serverObjectsModifiedByThisScript: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    productionApplyApproved: false;
  };
};

const SOURCE_LOCALES = ['ru', 'uk'];
const SURFACES = ['lesson', 'lesson_intro', 'quiz', 'audio_metadata', 'flashcard', 'personal_practice'];
const EXPECTED_MANIFEST_ENTRIES = 12;
const EXPECTED_OBJECTS = 36;

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

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function entryScoped(entry: JsonObject): boolean {
  const sourceLocale = s(entry, 'sourceLocale');
  const surface = s(entry, 'surface');
  const serverPath = s(entry, 'serverPath');
  return s(entry, 'studyTarget') === 'fr' &&
    SOURCE_LOCALES.includes(sourceLocale) &&
    SURFACES.includes(surface) &&
    serverPath.startsWith(`course-packs/fr/${sourceLocale}/${surface}/`);
}

function entryFlagsOpen(entry: JsonObject): boolean {
  return b(entry, 'activationApproved') || b(entry, 'runtimeDownloadsEnabled') || b(entry, 'readyForApply');
}

function shaInFilename(entry: JsonObject): boolean {
  const serverPath = s(entry, 'serverPath');
  const payloadSha = s(entry, 'payloadSha256');
  const objectRole = s(entry, 'objectRole');
  if (objectRole === 'manifest') return serverPath.endsWith('/manifest.json');
  if (objectRole === 'entry_index') return serverPath.endsWith('/index.json');
  return payloadSha.length === 64 && serverPath.endsWith(`/${payloadSha}.json`);
}

function makeUploadEvidenceMap(uploadEvidence: JsonObject): Map<string, JsonObject> {
  return new Map(arr<JsonObject>(uploadEvidence.uploadObjects).map((item) => [s(item, 'serverPath'), item]));
}

function deniedEnglishPathRefs(entries: JsonObject[]): number {
  return entries.filter((entry) => /(^|\/)(en|english)(\/|$)/i.test(s(entry, 'serverPath'))).length;
}

function deniedUiLocaleRefs(entries: JsonObject[]): number {
  return entries.filter((entry) => /(^|\/)(ui|interface|locale)(\/|$)/i.test(s(entry, 'serverPath'))).length;
}

export function buildFrenchRemoteVerifyDryRunReadiness(input: {
  repoRoot: string;
  runDir: string;
  productionManifestPath?: string;
  uploadEvidencePath?: string;
  accessToken?: string;
  googleApplicationCredentials?: string;
  generatedAt?: string;
}): Report {
  const auditsDir = path.join(input.runDir, 'audits');
  const productionManifestPath = input.productionManifestPath ?? path.join(input.runDir, 'pack_candidates/fr/server_delivery_manifest_v2.json');
  const uploadEvidencePath = input.uploadEvidencePath ?? path.join(auditsDir, 'french_server_pack_upload_evidence_v2_packet.json');
  const productionManifest = readJsonOrEmpty(productionManifestPath);
  const uploadEvidence = readJsonOrEmpty(uploadEvidencePath);
  const uploadEvidenceSummary = summaryOf(uploadEvidence);
  const entries = arr<JsonObject>(productionManifest.entries);
  const uploadObjects = arr<JsonObject>(uploadEvidence.uploadObjects);
  const uploadEvidenceByPath = makeUploadEvidenceMap(uploadEvidence);
  const findings: Finding[] = [];

  if (!fs.existsSync(productionManifestPath)) {
    addFinding(findings, 'blocker', 'production_manifest_missing', 'Remote verify dry-run readiness requires the production server manifest.', rel(input.repoRoot, productionManifestPath));
  }
  if (!fs.existsSync(uploadEvidencePath)) {
    addFinding(findings, 'blocker', 'upload_evidence_missing', 'Remote verify dry-run readiness requires upload evidence.', rel(input.repoRoot, uploadEvidencePath));
  }
  if (s(productionManifest, 'studyTarget') !== 'fr' || s(productionManifest, 'targetLocale') !== 'fr') {
    addFinding(findings, 'blocker', 'manifest_target_not_fr', 'Production manifest must be scoped to studyTarget=fr and targetLocale=fr.', rel(input.repoRoot, productionManifestPath));
  }
  if (entries.length !== EXPECTED_MANIFEST_ENTRIES) {
    addFinding(findings, 'blocker', 'manifest_entry_count_invalid', `Expected ${EXPECTED_MANIFEST_ENTRIES} manifest entries, got ${entries.length}.`, rel(input.repoRoot, productionManifestPath));
  }
  if (uploadObjects.length !== EXPECTED_OBJECTS) {
    addFinding(findings, 'blocker', 'planned_check_count_invalid', `Expected ${EXPECTED_OBJECTS} upload evidence objects, got ${uploadObjects.length}.`, rel(input.repoRoot, uploadEvidencePath));
  }

  const plannedChecks: PlannedCheck[] = uploadObjects.map((entry) => ({
    runtimeSliceId: s(entry, 'runtimeSliceId'),
    studyTarget: s(entry, 'studyTarget'),
    sourceLocale: s(entry, 'sourceLocale'),
    surface: s(entry, 'surface'),
    objectRole: s(entry, 'objectRole'),
    serverPath: s(entry, 'serverPath'),
    payloadSha256: s(entry, 'payloadSha256'),
    payloadBytes: n(entry, 'payloadBytes'),
    expectedListPrefix: 'course-packs/fr/',
    expectedMediaObject: s(entry, 'serverPath'),
  }));

  const scopedServerPaths = uploadObjects.filter(entryScoped).length;
  const uniqueServerPaths = new Set(plannedChecks.map((check) => check.serverPath)).size;
  const payloadShaMatchesUploadEvidence = uploadObjects.filter((entry) => {
    const upload = uploadEvidenceByPath.get(s(entry, 'serverPath'));
    return upload && s(upload, 'payloadSha256') === s(entry, 'payloadSha256');
  }).length;
  const payloadByteMatchesUploadEvidence = uploadObjects.filter((entry) => {
    const upload = uploadEvidenceByPath.get(s(entry, 'serverPath'));
    return upload && n(upload, 'payloadBytes') === n(entry, 'payloadBytes');
  }).length;
  const payloadShaFilenameMatches = uploadObjects.filter(shaInFilename).length;
  const englishRefs = n(uploadEvidenceSummary, 'deniedEnglishPathRefs') + deniedEnglishPathRefs(uploadObjects);
  const uiRefs = n(uploadEvidenceSummary, 'deniedUiLocaleRefs') + deniedUiLocaleRefs(uploadObjects);
  const openEntryFlags = entries.filter(entryFlagsOpen).length;

  if (scopedServerPaths !== EXPECTED_OBJECTS) addFinding(findings, 'blocker', 'server_paths_not_fully_scoped', `Expected ${EXPECTED_OBJECTS} scoped fr server paths, got ${scopedServerPaths}.`, rel(input.repoRoot, productionManifestPath));
  if (uniqueServerPaths !== EXPECTED_OBJECTS) addFinding(findings, 'blocker', 'server_paths_not_unique', `Expected ${EXPECTED_OBJECTS} unique server paths, got ${uniqueServerPaths}.`, rel(input.repoRoot, productionManifestPath));
  if (payloadShaMatchesUploadEvidence !== EXPECTED_OBJECTS) addFinding(findings, 'blocker', 'payload_sha_upload_evidence_mismatch', `Expected ${EXPECTED_OBJECTS} sha matches against upload evidence, got ${payloadShaMatchesUploadEvidence}.`, rel(input.repoRoot, uploadEvidencePath));
  if (payloadByteMatchesUploadEvidence !== EXPECTED_OBJECTS) addFinding(findings, 'blocker', 'payload_byte_upload_evidence_mismatch', `Expected ${EXPECTED_OBJECTS} byte-size matches against upload evidence, got ${payloadByteMatchesUploadEvidence}.`, rel(input.repoRoot, uploadEvidencePath));
  if (payloadShaFilenameMatches !== EXPECTED_OBJECTS) addFinding(findings, 'blocker', 'payload_sha_not_locked_in_filename', `Expected ${EXPECTED_OBJECTS} server paths ending in payload sha, got ${payloadShaFilenameMatches}.`, rel(input.repoRoot, productionManifestPath));
  if (englishRefs > 0) addFinding(findings, 'blocker', 'english_path_refs_denied', `${englishRefs} English path refs found in French remote verify dry-run plan.`, rel(input.repoRoot, productionManifestPath));
  if (uiRefs > 0) addFinding(findings, 'blocker', 'ui_locale_path_refs_denied', `${uiRefs} UI/interface locale refs found in French remote verify dry-run plan.`, rel(input.repoRoot, productionManifestPath));
  if (openEntryFlags > 0) addFinding(findings, 'blocker', 'manifest_entry_production_flags_open', `${openEntryFlags} manifest entries have activation/runtime/apply flags open.`, rel(input.repoRoot, productionManifestPath));

  const credentialSourcePresent = Boolean(input.accessToken) || Boolean(input.googleApplicationCredentials);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';

  return {
    schemaVersion: 'gustav-french-remote-verify-dry-run-readiness-v2-packet-v0',
    runId: path.basename(input.runDir),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status,
    summary: {
      targetLocale: 'fr',
      studyTarget: 'fr',
      productionManifestPresent: fs.existsSync(productionManifestPath),
      uploadEvidencePresent: fs.existsSync(uploadEvidencePath),
      expectedObjects: EXPECTED_OBJECTS,
      plannedChecks: plannedChecks.length,
      uniqueServerPaths,
      sourceLocales: SOURCE_LOCALES,
      surfaces: SURFACES,
      scopedServerPaths,
      payloadShaMatchesUploadEvidence,
      payloadByteMatchesUploadEvidence,
      payloadShaFilenameMatches,
      deniedEnglishPathRefs: englishRefs,
      deniedUiLocaleRefs: uiRefs,
      openEntryFlags,
      credentialRequiredForLiveVerify: true,
      credentialSourcePresent,
      safeToRunLiveVerifyWhenCredentialPresent: status === 'PASS',
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      blockers,
      warnings,
    },
    inputs: {
      productionServerManifest: rel(input.repoRoot, productionManifestPath),
      frenchServerPackUploadEvidenceV2Packet: rel(input.repoRoot, uploadEvidencePath),
    },
    outputs: {},
    plannedChecks,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
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
    '# Gustav French Remote Verify Dry-Run Readiness V2',
    '',
    `- Status: ${report.status}`,
    `- Planned checks: ${report.summary.plannedChecks}/${report.summary.expectedObjects}`,
    `- Scoped server paths: ${report.summary.scopedServerPaths}`,
    `- SHA/bytes vs upload evidence: ${report.summary.payloadShaMatchesUploadEvidence}/${report.summary.payloadByteMatchesUploadEvidence}`,
    `- SHA locked in filename: ${report.summary.payloadShaFilenameMatches}`,
    `- Safe to run live verify when credential present: ${report.summary.safeToRunLiveVerifyWhenCredentialPresent ? 'yes' : 'no'}`,
    '',
    '## Planned Checks',
    '',
  ];
  for (const check of report.plannedChecks) {
    lines.push(`- ${check.runtimeSliceId} ${check.objectRole}: \`${check.serverPath}\`, sha \`${check.payloadSha256}\`, bytes ${check.payloadBytes}`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push('', '## Safety', '', '- No upload, no runtime download enablement, no activation, no app apply.', '');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);
  const runDir = path.resolve(repoRoot, runArg);
  const outputJsonPath = path.join(runDir, 'audits', 'french_remote_verify_dry_run_readiness_v2_packet.json');
  const outputMdPath = path.join(runDir, 'audits', 'french_remote_verify_dry_run_readiness_v2_packet.md');
  const report = buildFrenchRemoteVerifyDryRunReadiness({
    repoRoot,
    runDir,
    accessToken: process.env.PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN ?? '',
    googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '',
  });
  report.outputs = {
    packet: rel(repoRoot, outputJsonPath),
    markdown: rel(repoRoot, outputMdPath),
  };
  ensureDir(path.dirname(outputJsonPath));
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV French remote verify dry-run readiness V2 packet: ${report.status}`);
  console.log(`Planned checks: ${report.summary.plannedChecks}/${report.summary.expectedObjects}`);
  console.log(`Safe to run live verify when credential present: ${report.summary.safeToRunLiveVerifyWhenCredentialPresent ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

if (require.main === module) {
  main();
}
