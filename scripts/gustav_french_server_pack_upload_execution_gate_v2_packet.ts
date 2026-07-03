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
  objectRole?: 'manifest' | 'entry_index' | 'payload';
  localPayloadPath: string;
  serverPath: string;
  payloadSha256: string;
  payloadBytes: number;
  rollbackScope: string;
};

type FetchLikeResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
};

type FetchLike = (url: string | URL, init?: { method?: string; headers?: Record<string, string>; body?: Buffer }) => Promise<FetchLikeResponse>;

type ExecutionInput = {
  repoRoot: string;
  runDir: string;
  uploadEvidencePath: string;
  bucket: string | null;
  accessToken: string;
  execute: boolean;
  allowUploadEnv: string;
};

type UploadAttempt = {
  runtimeSliceId: string;
  serverPath: string;
  localPayloadPath: string;
  payloadSha256: string;
  payloadBytes: number;
  executed: boolean;
  httpStatus: number | null;
};

type Report = {
  schemaVersion: 'gustav-french-server-pack-upload-execution-gate-v2-packet-v0';
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
    plannedUploadObjects: number;
    dryRun: boolean;
    executeRequested: boolean;
    allowUploadEnvAccepted: boolean;
    bucketPresent: boolean;
    accessTokenPresent: boolean;
    localPayloadShaMatches: number;
    sourceScopedServerPaths: number;
    uploadAttempts: number;
    uploadSucceeded: number;
    readyForRemoteObjectVerify: boolean;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    downloadablePacksPublished: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    blockers: number;
    warnings: number;
  };
  uploadAttempts: UploadAttempt[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    firebaseOrServerUploadStarted: boolean;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    productionApplyApproved: false;
  };
};

const EXPECTED_OBJECTS = 36;
const STORAGE_BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const ALLOW_UPLOAD_SENTINEL = 'I_UNDERSTAND_THIS_UPLOADS_FRENCH_PACKS_ONLY';

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

function sha256(filePath: string): string {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function sourceScoped(objectPath: string): boolean {
  return /^course-packs\/fr\/(ru|uk)\/(lesson|lesson_intro|quiz|audio_metadata|flashcard|personal_practice)\//.test(objectPath) &&
    !objectPath.includes('/../') &&
    !objectPath.startsWith('course-packs/en/');
}

async function uploadObject(bucket: string, accessToken: string, objectPath: string, body: Buffer, fetchImpl: FetchLike): Promise<number> {
  const url = new URL(`https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o`);
  url.searchParams.set('uploadType', 'media');
  url.searchParams.set('name', objectPath);
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'public,max-age=31536000,immutable',
    },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`upload ${objectPath} failed with HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  return response.status;
}

export async function buildFrenchServerPackUploadExecutionGate(
  input: ExecutionInput,
  fetchImpl: FetchLike = fetch as FetchLike,
): Promise<Report> {
  const findings: Finding[] = [];
  const evidence = fs.existsSync(input.uploadEvidencePath) ? readJson<JsonObject>(input.uploadEvidencePath) : {};
  const uploadObjects = arr(evidence, 'uploadObjects') as UploadObject[];
  const evidenceSummary = object(evidence.summary);
  const executeAllowed = input.allowUploadEnv === ALLOW_UPLOAD_SENTINEL;
  const dryRun = !input.execute;
  const uploadAttempts: UploadAttempt[] = [];

  if (!fs.existsSync(input.uploadEvidencePath)) {
    addFinding(findings, 'blocker', 'upload_evidence_missing', 'Upload execution requires french_server_pack_upload_evidence_v2_packet.json.', input.uploadEvidencePath);
  }
  if (s(evidence, 'status') !== 'PASS' || evidenceSummary.readyForRemoteObjectVerify !== true) {
    addFinding(findings, 'blocker', 'upload_evidence_not_ready', 'Upload evidence must be PASS and readyForRemoteObjectVerify=true.', input.uploadEvidencePath);
  }
  if (uploadObjects.length !== EXPECTED_OBJECTS) {
    addFinding(findings, 'blocker', 'upload_object_count_invalid', `Expected ${EXPECTED_OBJECTS} upload objects, got ${uploadObjects.length}.`, input.uploadEvidencePath);
  }
  if (input.execute && !executeAllowed) {
    addFinding(findings, 'blocker', 'explicit_upload_env_missing', `Set PHRASEMAN_ALLOW_FRENCH_SERVER_PACK_UPLOAD=${ALLOW_UPLOAD_SENTINEL} to execute upload.`);
  }
  if (input.execute && (!input.bucket || !input.accessToken)) {
    addFinding(findings, 'blocker', 'remote_upload_credentials_missing', 'Bucket and access token are required only for real upload execution.');
  }

  let localPayloadShaMatches = 0;
  let sourceScopedServerPaths = 0;
  for (const item of uploadObjects) {
    const localPath = path.resolve(input.repoRoot, item.localPayloadPath);
    if (sha256(localPath) === item.payloadSha256) localPayloadShaMatches += 1;
    if (sourceScoped(item.serverPath)) sourceScopedServerPaths += 1;
    if (!sourceScoped(item.serverPath)) {
      addFinding(findings, 'blocker', 'upload_object_scope_invalid', `Upload path is outside French source-scoped pack paths: ${item.serverPath}`);
    }
  }
  if (localPayloadShaMatches !== EXPECTED_OBJECTS) {
    addFinding(findings, 'blocker', 'upload_payload_hash_drift', 'Every upload payload must still match upload evidence sha256.');
  }

  let uploadSucceeded = 0;
  const canExecute = input.execute &&
    executeAllowed &&
    Boolean(input.bucket) &&
    Boolean(input.accessToken) &&
    findings.every((finding) => finding.severity !== 'blocker');

  if (canExecute) {
    for (const item of uploadObjects) {
      const localPath = path.resolve(input.repoRoot, item.localPayloadPath);
      const body = fs.readFileSync(localPath);
      const attempt: UploadAttempt = {
        runtimeSliceId: item.runtimeSliceId,
        serverPath: item.serverPath,
        localPayloadPath: item.localPayloadPath,
        payloadSha256: item.payloadSha256,
        payloadBytes: item.payloadBytes,
        executed: true,
        httpStatus: null,
      };
      try {
        attempt.httpStatus = await uploadObject(input.bucket as string, input.accessToken, item.serverPath, body, fetchImpl);
        uploadSucceeded += 1;
      } catch (error) {
        addFinding(findings, 'blocker', 'upload_request_failed', error instanceof Error ? error.message : String(error));
      }
      uploadAttempts.push(attempt);
    }
  } else {
    for (const item of uploadObjects) {
      uploadAttempts.push({
        runtimeSliceId: item.runtimeSliceId,
        serverPath: item.serverPath,
        localPayloadPath: item.localPayloadPath,
        payloadSha256: item.payloadSha256,
        payloadBytes: item.payloadBytes,
        executed: false,
        httpStatus: null,
      });
    }
    addFinding(findings, 'info', 'upload_execution_dry_run_only', 'Upload execution gate is dry-run; no Firebase/server write was started.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';
  return {
    schemaVersion: 'gustav-french-server-pack-upload-execution-gate-v2-packet-v0',
    runId: path.basename(input.runDir),
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: input.repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      frenchServerPackUploadEvidenceV2Packet: rel(input.repoRoot, input.uploadEvidencePath),
    },
    outputs: {},
    summary: {
      targetLocale: 'fr',
      expectedObjects: EXPECTED_OBJECTS,
      uploadObjects: uploadObjects.length,
      plannedUploadObjects: uploadAttempts.length,
      dryRun,
      executeRequested: input.execute,
      allowUploadEnvAccepted: executeAllowed,
      bucketPresent: Boolean(input.bucket),
      accessTokenPresent: Boolean(input.accessToken),
      localPayloadShaMatches,
      sourceScopedServerPaths,
      uploadAttempts: uploadAttempts.filter((attempt) => attempt.executed).length,
      uploadSucceeded,
      readyForRemoteObjectVerify: status === 'PASS' && (dryRun || uploadSucceeded === EXPECTED_OBJECTS),
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      blockers,
      warnings,
    },
    uploadAttempts,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      firebaseOrServerUploadStarted: canExecute,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      productionApplyApproved: false,
    },
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Server Pack Upload Execution Gate V2',
    '',
    `- Status: ${report.status}`,
    `- Dry-run: ${report.summary.dryRun ? 'yes' : 'no'}`,
    `- Execute requested: ${report.summary.executeRequested ? 'yes' : 'no'}`,
    `- Planned/attempted/succeeded uploads: ${report.summary.plannedUploadObjects}/${report.summary.uploadAttempts}/${report.summary.uploadSucceeded}`,
    `- Firebase/server upload started: ${report.safety.firebaseOrServerUploadStarted ? 'yes' : 'no'}`,
    `- Ready for remote verify: ${report.summary.readyForRemoteObjectVerify ? 'yes' : 'no'}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`,
    `- Activation approved: ${report.summary.activationApproved ? 'yes' : 'no'}`,
  ];
  if (report.findings.length > 0) {
    lines.push('', '## Findings');
    for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  }
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  void (async () => {
    const repoRoot = process.cwd();
    const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
    const target = argValue('--target') ?? 'fr';
    if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);
    const runDir = path.resolve(repoRoot, runArg);
    const uploadEvidencePath = path.join(runDir, 'audits/french_server_pack_upload_evidence_v2_packet.json');
    const outputJsonPath = path.join(runDir, 'audits/french_server_pack_upload_execution_gate_v2_packet.json');
    const outputMdPath = path.join(runDir, 'audits/french_server_pack_upload_execution_gate_v2_packet.md');
    const report = await buildFrenchServerPackUploadExecutionGate({
      repoRoot,
      runDir,
      uploadEvidencePath,
      bucket: process.env.PHRASEMAN_FRENCH_SERVER_PACK_BUCKET || STORAGE_BUCKET,
      accessToken: process.env.PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN || '',
      execute: process.argv.includes('--execute-upload'),
      allowUploadEnv: process.env.PHRASEMAN_ALLOW_FRENCH_SERVER_PACK_UPLOAD || '',
    });
    report.outputs = {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    };
    writeJson(outputJsonPath, report);
    fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
    console.log(`GUSTAV French server pack upload execution gate V2 packet: ${report.status}`);
    console.log(`Dry-run: ${report.summary.dryRun ? 'yes' : 'no'}`);
    console.log(`Planned/attempted/succeeded uploads: ${report.summary.plannedUploadObjects}/${report.summary.uploadAttempts}/${report.summary.uploadSucceeded}`);
    console.log(`Firebase/server upload started: ${report.safety.firebaseOrServerUploadStarted ? 'yes' : 'no'}`);
    console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
    if (report.status === 'BLOCK') process.exitCode = 1;
  })();
}

if (require.main === module) {
  main();
}
