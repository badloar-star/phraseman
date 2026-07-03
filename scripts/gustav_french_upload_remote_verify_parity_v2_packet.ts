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
  schemaVersion: 'gustav-french-upload-remote-verify-parity-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  summary: {
    targetLocale: 'fr';
    uploadEvidenceStatus: string;
    remoteDryRunStatus: string;
    uploadObjects: number;
    plannedChecks: number;
    matchedServerPaths: number;
    roleMatches: number;
    sourceLocaleMatches: number;
    surfaceMatches: number;
    shaMatches: number;
    byteMatches: number;
    rollbackScopeMatches: number;
    uploadOnlyPaths: number;
    dryRunOnlyPaths: number;
    duplicateUploadPaths: number;
    duplicateDryRunPaths: number;
    scopedFrenchPaths: number;
    deniedEnglishPathRefs: number;
    deniedUiLocaleRefs: number;
    readyForRemoteObjectVerify: boolean;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    blockers: number;
    warnings: number;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  mismatches: Array<{
    serverPath: string;
    field: string;
    uploadValue: unknown;
    dryRunValue: unknown;
  }>;
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    serverObjectsModifiedByThisScript: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    productionApplyApproved: false;
  };
};

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

function byServerPath(items: JsonObject[]): Map<string, JsonObject> {
  return new Map(items.map((item) => [s(item, 'serverPath'), item]));
}

function duplicatePathCount(items: JsonObject[]): number {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const item of items) {
    const key = s(item, 'serverPath');
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  }
  return duplicates;
}

function scopedFrenchPath(item: JsonObject): boolean {
  const sourceLocale = s(item, 'sourceLocale');
  const surface = s(item, 'surface');
  return s(item, 'studyTarget') === 'fr' &&
    /^(ru|uk)$/.test(sourceLocale) &&
    /^(lesson|lesson_intro|quiz|audio_metadata|flashcard|personal_practice)$/.test(surface) &&
    s(item, 'serverPath').startsWith(`course-packs/fr/${sourceLocale}/${surface}/`) &&
    !s(item, 'serverPath').includes('/../');
}

function rollbackScopeFor(item: JsonObject): string {
  return `course-packs/fr/${s(item, 'sourceLocale')}/`;
}

export function buildFrenchUploadRemoteVerifyParity(input: {
  repoRoot: string;
  runDir: string;
  uploadEvidencePath?: string;
  dryRunPath?: string;
  generatedAt?: string;
}): Report {
  const auditsDir = path.join(input.runDir, 'audits');
  const uploadEvidencePath = input.uploadEvidencePath ?? path.join(auditsDir, 'french_server_pack_upload_evidence_v2_packet.json');
  const dryRunPath = input.dryRunPath ?? path.join(auditsDir, 'french_remote_verify_dry_run_readiness_v2_packet.json');
  const uploadEvidence = readJsonOrEmpty(uploadEvidencePath);
  const dryRun = readJsonOrEmpty(dryRunPath);
  const uploadSummary = summaryOf(uploadEvidence);
  const dryRunSummary = summaryOf(dryRun);
  const uploadObjects = arr<JsonObject>(uploadEvidence.uploadObjects);
  const plannedChecks = arr<JsonObject>(dryRun.plannedChecks);
  const uploadByPath = byServerPath(uploadObjects);
  const dryRunByPath = byServerPath(plannedChecks);
  const findings: Finding[] = [];
  const mismatches: Report['mismatches'] = [];

  if (!fs.existsSync(uploadEvidencePath)) addFinding(findings, 'blocker', 'upload_evidence_missing', 'Upload evidence packet is required.', rel(input.repoRoot, uploadEvidencePath));
  if (!fs.existsSync(dryRunPath)) addFinding(findings, 'blocker', 'remote_dry_run_missing', 'Remote verify dry-run packet is required.', rel(input.repoRoot, dryRunPath));
  if (s(uploadEvidence, 'status') !== 'PASS' || !b(uploadSummary, 'readyForRemoteObjectVerify')) {
    addFinding(findings, 'blocker', 'upload_evidence_not_ready', 'Upload evidence must be PASS and readyForRemoteObjectVerify.', rel(input.repoRoot, uploadEvidencePath));
  }
  if (s(dryRun, 'status') !== 'PASS' || !b(dryRunSummary, 'safeToRunLiveVerifyWhenCredentialPresent')) {
    addFinding(findings, 'blocker', 'remote_dry_run_not_ready', 'Remote verify dry-run must be PASS and safeToRunLiveVerifyWhenCredentialPresent.', rel(input.repoRoot, dryRunPath));
  }
  if (uploadObjects.length !== EXPECTED_OBJECTS) addFinding(findings, 'blocker', 'upload_object_count_invalid', `Expected ${EXPECTED_OBJECTS} upload objects.`, rel(input.repoRoot, uploadEvidencePath));
  if (plannedChecks.length !== EXPECTED_OBJECTS) addFinding(findings, 'blocker', 'planned_check_count_invalid', `Expected ${EXPECTED_OBJECTS} dry-run planned checks.`, rel(input.repoRoot, dryRunPath));

  const uploadOnlyPaths = [...uploadByPath.keys()].filter((key) => !dryRunByPath.has(key));
  const dryRunOnlyPaths = [...dryRunByPath.keys()].filter((key) => !uploadByPath.has(key));
  const duplicateUploadPaths = duplicatePathCount(uploadObjects);
  const duplicateDryRunPaths = duplicatePathCount(plannedChecks);
  const matchedPaths = [...uploadByPath.keys()].filter((key) => dryRunByPath.has(key)).sort();

  let roleMatches = 0;
  let sourceLocaleMatches = 0;
  let surfaceMatches = 0;
  let shaMatches = 0;
  let byteMatches = 0;
  let rollbackScopeMatches = 0;
  let scopedFrenchPaths = 0;
  for (const serverPath of matchedPaths) {
    const upload = uploadByPath.get(serverPath) as JsonObject;
    const planned = dryRunByPath.get(serverPath) as JsonObject;
    const pairs: Array<[string, unknown, unknown]> = [
      ['objectRole', s(upload, 'objectRole'), s(planned, 'objectRole')],
      ['sourceLocale', s(upload, 'sourceLocale'), s(planned, 'sourceLocale')],
      ['surface', s(upload, 'surface'), s(planned, 'surface')],
      ['payloadSha256', s(upload, 'payloadSha256'), s(planned, 'payloadSha256')],
      ['payloadBytes', n(upload, 'payloadBytes'), n(planned, 'payloadBytes')],
      ['rollbackScope', s(upload, 'rollbackScope'), rollbackScopeFor(planned)],
    ];
    for (const [field, uploadValue, dryRunValue] of pairs) {
      if (uploadValue !== dryRunValue) mismatches.push({ serverPath, field, uploadValue, dryRunValue });
    }
    if (s(upload, 'objectRole') === s(planned, 'objectRole')) roleMatches += 1;
    if (s(upload, 'sourceLocale') === s(planned, 'sourceLocale')) sourceLocaleMatches += 1;
    if (s(upload, 'surface') === s(planned, 'surface')) surfaceMatches += 1;
    if (s(upload, 'payloadSha256') === s(planned, 'payloadSha256')) shaMatches += 1;
    if (n(upload, 'payloadBytes') === n(planned, 'payloadBytes')) byteMatches += 1;
    if (s(upload, 'rollbackScope') === rollbackScopeFor(planned)) rollbackScopeMatches += 1;
    if (scopedFrenchPath(upload) && scopedFrenchPath(planned)) scopedFrenchPaths += 1;
  }

  const deniedEnglishPathRefs = uploadObjects.concat(plannedChecks).filter((item) => /(^|\/)(en|english)(\/|$)/i.test(s(item, 'serverPath'))).length;
  const deniedUiLocaleRefs = uploadObjects.concat(plannedChecks).filter((item) => /uiLocale|interfaceLocale|uiLanguage|interfaceLanguage|\/ui\/|\/interface\//i.test(JSON.stringify(item))).length;

  if (uploadOnlyPaths.length > 0) addFinding(findings, 'blocker', 'upload_paths_not_in_remote_dry_run', `${uploadOnlyPaths.length} upload path(s) are not planned for remote verification.`, rel(input.repoRoot, uploadEvidencePath));
  if (dryRunOnlyPaths.length > 0) addFinding(findings, 'blocker', 'remote_dry_run_paths_not_in_upload', `${dryRunOnlyPaths.length} remote dry-run path(s) are not in upload evidence.`, rel(input.repoRoot, dryRunPath));
  if (duplicateUploadPaths > 0 || duplicateDryRunPaths > 0) addFinding(findings, 'blocker', 'duplicate_server_paths', 'Upload evidence and remote dry-run must use unique server paths.');
  if (mismatches.length > 0) addFinding(findings, 'blocker', 'upload_remote_verify_field_mismatch', `${mismatches.length} upload/remote verify field mismatch(es).`);
  if (scopedFrenchPaths !== EXPECTED_OBJECTS) addFinding(findings, 'blocker', 'parity_paths_not_fully_french_scoped', `Expected ${EXPECTED_OBJECTS} fully French-scoped parity paths, got ${scopedFrenchPaths}.`);
  if (deniedEnglishPathRefs > 0 || deniedUiLocaleRefs > 0) addFinding(findings, 'blocker', 'forbidden_parity_scope_reference', 'Parity must not include English or UI/interface locale references.');

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;

  return {
    schemaVersion: 'gustav-french-upload-remote-verify-parity-v2-packet-v0',
    runId: path.basename(input.runDir),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    summary: {
      targetLocale: 'fr',
      uploadEvidenceStatus: s(uploadEvidence, 'status'),
      remoteDryRunStatus: s(dryRun, 'status'),
      uploadObjects: uploadObjects.length,
      plannedChecks: plannedChecks.length,
      matchedServerPaths: matchedPaths.length,
      roleMatches,
      sourceLocaleMatches,
      surfaceMatches,
      shaMatches,
      byteMatches,
      rollbackScopeMatches,
      uploadOnlyPaths: uploadOnlyPaths.length,
      dryRunOnlyPaths: dryRunOnlyPaths.length,
      duplicateUploadPaths,
      duplicateDryRunPaths,
      scopedFrenchPaths,
      deniedEnglishPathRefs,
      deniedUiLocaleRefs,
      readyForRemoteObjectVerify: blockers === 0,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      blockers,
      warnings,
    },
    inputs: {
      frenchServerPackUploadEvidenceV2Packet: rel(input.repoRoot, uploadEvidencePath),
      frenchRemoteVerifyDryRunReadinessV2Packet: rel(input.repoRoot, dryRunPath),
    },
    outputs: {},
    mismatches,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
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
    '# Gustav French Upload Remote Verify Parity V2',
    '',
    `- Status: ${report.status}`,
    `- Upload/planned/matched: ${report.summary.uploadObjects}/${report.summary.plannedChecks}/${report.summary.matchedServerPaths}`,
    `- Role/source/surface matches: ${report.summary.roleMatches}/${report.summary.sourceLocaleMatches}/${report.summary.surfaceMatches}`,
    `- Sha/byte matches: ${report.summary.shaMatches}/${report.summary.byteMatches}`,
    `- Scoped French paths: ${report.summary.scopedFrenchPaths}`,
    `- Ready for remote object verify: ${report.summary.readyForRemoteObjectVerify ? 'yes' : 'no'}`,
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
  const outputJsonPath = path.join(runDir, 'audits', 'french_upload_remote_verify_parity_v2_packet.json');
  const outputMdPath = path.join(runDir, 'audits', 'french_upload_remote_verify_parity_v2_packet.md');
  const report = buildFrenchUploadRemoteVerifyParity({ repoRoot, runDir });
  report.outputs = {
    packet: rel(repoRoot, outputJsonPath),
    markdown: rel(repoRoot, outputMdPath),
  };
  ensureDir(path.dirname(outputJsonPath));
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV French upload remote verify parity V2 packet: ${report.status}`);
  console.log(`Upload/planned/matched: ${report.summary.uploadObjects}/${report.summary.plannedChecks}/${report.summary.matchedServerPaths}`);
  console.log(`Ready for remote verify: ${report.summary.readyForRemoteObjectVerify ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

if (require.main === module) {
  main();
}
