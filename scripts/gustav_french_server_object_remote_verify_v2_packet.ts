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

type FetchLikeResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type FetchLike = (url: string | URL, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<FetchLikeResponse>;

type ManifestEntry = {
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  objectRole?: string;
  serverPath?: string;
  payloadSha256?: string;
  payloadBytes?: number;
  activationApproved?: boolean;
  runtimeDownloadsEnabled?: boolean;
  readyForApply?: boolean;
};

type GcsListPage = {
  items?: { name?: string; size?: string | number }[];
  nextPageToken?: string;
};

export type FrenchServerObjectRemoteVerifyInput = {
  repoRoot: string;
  runDir: string;
  productionManifestPath: string;
  uploadEvidencePath?: string;
  bucket: string | null;
  accessToken: string;
  googleApplicationCredentials?: string;
  generatedAt?: string;
};

export type FrenchServerObjectRemoteVerifyReport = {
  schemaVersion: 'gustav-french-server-object-remote-verify-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  summary: {
    studyTarget: 'fr';
    productionManifestPresent: boolean;
    bucket: string | null;
    accessTokenPresent: boolean;
    multipleCredentialSourcesPresent: boolean;
    credentialSource: 'access_token_env' | 'service_account_file' | 'missing';
    expectedObjectCount: number;
    uploadEvidenceObjectCount: number;
    manifestDerivedObjectCount: number;
    manifestUploadPathMatches: number;
    duplicateUploadEvidencePaths: number;
    uploadEvidenceOnlyPaths: number;
    manifestOnlyPaths: number;
    invalidObjectRoles: number;
    invalidPayloadSha256Entries: number;
    invalidPayloadByteEntries: number;
    foundObjectCount: number;
    sizeCheckedCount: number;
    hashCheckedCount: number;
    unexpectedObjects: number;
    unverifiedObjects: number;
    missingObjects: number;
    sizeMismatches: number;
    hashMismatches: number;
    wrongScopeEntries: number;
    openEntryFlags: number;
    activationApproved: false;
    runtimeDownloadsEnabled: false;
    readyForApply: false;
    readyForRuntimeDownloadActivation: boolean;
    blockers: number;
    warnings: number;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  missingObjects: string[];
  unexpectedObjects: string[];
  sizeMismatches: string[];
  hashMismatches: string[];
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

const EXPECTED_MANIFEST_ENTRIES = 12;
const EXPECTED_OBJECTS = 36;
const STORAGE_BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const GCS_READ_ONLY_SCOPE = 'https://www.googleapis.com/auth/devstorage.read_only';
const SOURCE_LOCALES = ['ru', 'uk'];
const SURFACES = ['lesson', 'lesson_intro', 'quiz', 'audio_metadata', 'flashcard', 'personal_practice'];
const OBJECT_ROLES = ['manifest', 'entry_index', 'payload'];

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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function readServiceAccountCredential(filePath: string): { clientEmail: string; privateKey: string } | null {
  try {
    const parsed = readJson<JsonObject>(filePath);
    const clientEmail = parsed.client_email;
    const privateKey = parsed.private_key;
    if (parsed.type !== 'service_account' || typeof clientEmail !== 'string' || typeof privateKey !== 'string') return null;
    if (!clientEmail.includes('@') || !privateKey.includes('BEGIN PRIVATE KEY')) return null;
    return { clientEmail, privateKey };
  } catch {
    return null;
  }
}

async function mintServiceAccountAccessToken(credentialFile: string, fetchImpl: FetchLike): Promise<string> {
  const credential = readServiceAccountCredential(credentialFile);
  if (!credential) throw new Error('GOOGLE_APPLICATION_CREDENTIALS is not a usable service-account JSON.');
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(JSON.stringify({
    iss: credential.clientEmail,
    scope: GCS_READ_ONLY_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));
  const unsignedJwt = `${header}.${claim}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsignedJwt).sign(credential.privateKey);
  const assertion = `${unsignedJwt}.${base64Url(signature)}`;
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  }).toString();
  const response = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`service-account token mint failed with HTTP ${response.status}`);
  const tokenResponse = object(await response.json());
  const accessToken = tokenResponse.access_token;
  if (typeof accessToken !== 'string' || accessToken.length === 0) throw new Error('service-account token response did not include access_token.');
  return accessToken;
}

export async function resolveRemoteVerifyAccessToken(input: {
  repoRoot: string;
  accessToken: string;
  googleApplicationCredentials?: string;
}, fetchImpl: FetchLike = fetch as FetchLike): Promise<{ accessToken: string; credentialSource: 'access_token_env' | 'service_account_file' | 'missing' }> {
  if (input.accessToken && input.googleApplicationCredentials) {
    throw new Error('Provide exactly one remote verify credential source: PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN or GOOGLE_APPLICATION_CREDENTIALS, not both.');
  }
  if (input.accessToken) return { accessToken: input.accessToken, credentialSource: 'access_token_env' };
  if (!input.googleApplicationCredentials) return { accessToken: '', credentialSource: 'missing' };
  const credentialFile = path.resolve(input.repoRoot, input.googleApplicationCredentials);
  if (!fs.existsSync(credentialFile)) return { accessToken: '', credentialSource: 'missing' };
  return {
    accessToken: await mintServiceAccountAccessToken(credentialFile, fetchImpl),
    credentialSource: 'service_account_file',
  };
}

function entryScopeOk(entry: ManifestEntry): boolean {
  return entry.studyTarget === 'fr' &&
    SOURCE_LOCALES.includes(entry.sourceLocale ?? '') &&
    SURFACES.includes(entry.surface ?? '') &&
    typeof entry.serverPath === 'string' &&
    entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/`);
}

function entryFlagsClosed(entry: ManifestEntry): boolean {
  return entry.activationApproved !== true &&
    entry.runtimeDownloadsEnabled !== true &&
    entry.readyForApply !== true;
}

function manifestDerivedObjectPaths(entries: ManifestEntry[]): Set<string> {
  const paths = new Set<string>();
  for (const entry of entries) {
    if (!entryScopeOk({ ...entry, objectRole: 'payload' })) continue;
    const prefix = `course-packs/fr/${entry.sourceLocale}/${entry.surface}/${entry.contentVersion}`;
    paths.add(`${prefix}/manifest.json`);
    paths.add(`${prefix}/index.json`);
    if (typeof entry.serverPath === 'string') paths.add(entry.serverPath);
  }
  return paths;
}

function validSha256(value: unknown): boolean {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function validPayloadBytes(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

async function listObjects(bucket: string, accessToken: string, fetchImpl: FetchLike): Promise<Map<string, number>> {
  const found = new Map<string, number>();
  let pageToken = '';
  do {
    const url = new URL(`https://storage.googleapis.com/storage/v1/b/${bucket}/o`);
    url.searchParams.set('prefix', 'course-packs/fr/');
    url.searchParams.set('fields', 'items(name,size),nextPageToken');
    url.searchParams.set('maxResults', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`list objects failed with HTTP ${response.status}`);
    const page = object(await response.json()) as GcsListPage;
    for (const item of page.items ?? []) {
      if (item.name) found.set(item.name, Number(item.size ?? 0));
    }
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);
  return found;
}

async function readObject(bucket: string, accessToken: string, objectPath: string, fetchImpl: FetchLike): Promise<Buffer> {
  const url = new URL(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(objectPath)}`);
  url.searchParams.set('alt', 'media');
  const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`read object ${objectPath} failed with HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

export async function buildFrenchServerObjectRemoteVerifyReport(
  input: FrenchServerObjectRemoteVerifyInput,
  fetchImpl: FetchLike = fetch as FetchLike,
): Promise<FrenchServerObjectRemoteVerifyReport> {
  const findings: Finding[] = [];
  let resolvedAccessToken = input.accessToken;
  let credentialSource: 'access_token_env' | 'service_account_file' | 'missing' = input.accessToken ? 'access_token_env' : 'missing';
  const multipleCredentialSourcesPresent = Boolean(input.accessToken && input.googleApplicationCredentials);
  if (multipleCredentialSourcesPresent) {
    resolvedAccessToken = '';
    credentialSource = 'missing';
    addFinding(findings, 'blocker', 'remote_verify_multiple_credential_sources', 'Provide exactly one remote verify credential source: PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN or GOOGLE_APPLICATION_CREDENTIALS, not both.');
  }
  if (!resolvedAccessToken && input.googleApplicationCredentials && !multipleCredentialSourcesPresent) {
    try {
      const resolved = await resolveRemoteVerifyAccessToken({
        repoRoot: input.repoRoot,
        accessToken: input.accessToken,
        googleApplicationCredentials: input.googleApplicationCredentials,
      }, fetchImpl);
      resolvedAccessToken = resolved.accessToken;
      credentialSource = resolved.credentialSource;
    } catch (error) {
      addFinding(findings, 'blocker', 'remote_verify_service_account_token_mint_failed', error instanceof Error ? error.message : String(error));
    }
  }
  const productionManifestPresent = fs.existsSync(input.productionManifestPath);
  const uploadEvidencePath = input.uploadEvidencePath ?? path.join(input.runDir, 'audits', 'french_server_pack_upload_evidence_v2_packet.json');
  const uploadEvidencePresent = fs.existsSync(uploadEvidencePath);
  const manifest = productionManifestPresent ? readJson<JsonObject>(input.productionManifestPath) : {};
  const uploadEvidence = uploadEvidencePresent ? readJson<JsonObject>(uploadEvidencePath) : {};
  const entries = array(manifest.entries).map((entry) => object(entry) as ManifestEntry);
  const uploadObjects = array(uploadEvidence.uploadObjects).map((entry) => object(entry) as ManifestEntry);
  const expectedEntries = uploadObjects.filter((entry) => entryScopeOk(entry));
  const uploadEvidencePaths = uploadObjects.map((entry) => entry.serverPath).filter((serverPath): serverPath is string => typeof serverPath === 'string');
  const uploadEvidencePathSet = new Set(uploadEvidencePaths);
  const manifestObjectPathSet = manifestDerivedObjectPaths(entries);
  const duplicateUploadEvidencePaths = uploadEvidencePaths.length - uploadEvidencePathSet.size;
  const uploadEvidenceOnlyPaths = Array.from(uploadEvidencePathSet).filter((serverPath) => !manifestObjectPathSet.has(serverPath)).length;
  const manifestOnlyPaths = Array.from(manifestObjectPathSet).filter((serverPath) => !uploadEvidencePathSet.has(serverPath)).length;
  const manifestUploadPathMatches = Array.from(uploadEvidencePathSet).filter((serverPath) => manifestObjectPathSet.has(serverPath)).length;
  const invalidObjectRoles = uploadObjects.filter((entry) => !OBJECT_ROLES.includes(entry.objectRole ?? '')).length;
  const invalidPayloadSha256Entries = uploadObjects.filter((entry) => !validSha256(entry.payloadSha256)).length;
  const invalidPayloadByteEntries = uploadObjects.filter((entry) => !validPayloadBytes(entry.payloadBytes)).length;
  const openEntryFlags = entries.filter((entry) => !entryFlagsClosed(entry)).length;
  const wrongScopeEntries = uploadObjects.length - expectedEntries.length;
  const missingObjects: string[] = [];
  const unexpectedObjects: string[] = [];
  const sizeMismatches: string[] = [];
  const hashMismatches: string[] = [];
  let foundObjectCount = 0;
  let sizeCheckedCount = 0;
  let hashCheckedCount = 0;

  if (!productionManifestPresent) {
    addFinding(findings, 'blocker', 'production_server_manifest_missing', 'Production server manifest is not published yet.', input.productionManifestPath);
  }
  if (!uploadEvidencePresent) {
    addFinding(findings, 'blocker', 'upload_evidence_missing', 'Remote object verify requires upload evidence with the full manifest/index/payload object list.', uploadEvidencePath);
  }
  if (productionManifestPresent && entries.length !== EXPECTED_MANIFEST_ENTRIES) {
    addFinding(findings, 'blocker', 'production_manifest_entry_count_invalid', `Expected ${EXPECTED_MANIFEST_ENTRIES} manifest entries, got ${entries.length}.`, input.productionManifestPath);
  }
  if (uploadEvidencePresent && uploadObjects.length !== EXPECTED_OBJECTS) {
    addFinding(findings, 'blocker', 'upload_evidence_object_count_invalid', `Expected ${EXPECTED_OBJECTS} upload evidence objects, got ${uploadObjects.length}.`, uploadEvidencePath);
  }
  if (productionManifestPresent && uploadEvidencePresent && manifestObjectPathSet.size !== EXPECTED_OBJECTS) {
    addFinding(findings, 'blocker', 'production_manifest_derived_object_count_invalid', `Expected production manifest to derive ${EXPECTED_OBJECTS} server object paths, got ${manifestObjectPathSet.size}.`, input.productionManifestPath);
  }
  if (duplicateUploadEvidencePaths > 0) {
    addFinding(findings, 'blocker', 'upload_evidence_duplicate_server_paths', `${duplicateUploadEvidencePaths} duplicate upload evidence server path(s).`, uploadEvidencePath);
  }
  if (uploadEvidenceOnlyPaths > 0) {
    addFinding(findings, 'blocker', 'upload_evidence_paths_not_in_manifest', `${uploadEvidenceOnlyPaths} upload evidence server path(s) are not derived from the production manifest.`, uploadEvidencePath);
  }
  if (manifestOnlyPaths > 0) {
    addFinding(findings, 'blocker', 'production_manifest_paths_missing_upload_evidence', `${manifestOnlyPaths} production manifest-derived server path(s) are missing from upload evidence.`, input.productionManifestPath);
  }
  if (invalidObjectRoles > 0) {
    addFinding(findings, 'blocker', 'upload_evidence_object_role_invalid', `${invalidObjectRoles} upload evidence object role(s) are invalid.`, uploadEvidencePath);
  }
  if (invalidPayloadSha256Entries > 0) {
    addFinding(findings, 'blocker', 'upload_evidence_payload_sha_invalid', `${invalidPayloadSha256Entries} upload evidence object(s) have invalid sha256 metadata.`, uploadEvidencePath);
  }
  if (invalidPayloadByteEntries > 0) {
    addFinding(findings, 'blocker', 'upload_evidence_payload_bytes_invalid', `${invalidPayloadByteEntries} upload evidence object(s) have invalid byte-size metadata.`, uploadEvidencePath);
  }
  if (wrongScopeEntries > 0) {
    addFinding(findings, 'blocker', 'production_manifest_scope_invalid', `${wrongScopeEntries} production entries are outside fr/ru|uk runtime scope.`, input.productionManifestPath);
  }
  if (openEntryFlags > 0) {
    addFinding(findings, 'blocker', 'production_manifest_entry_flags_open', `${openEntryFlags} production entries have open activation/runtime/apply flags.`, input.productionManifestPath);
  }
  if (!input.bucket) {
    addFinding(findings, 'blocker', 'remote_verify_bucket_missing', 'Remote verify bucket is required.');
  }
  if (!resolvedAccessToken && !multipleCredentialSourcesPresent) {
    addFinding(findings, 'blocker', 'remote_verify_credentials_missing', 'Remote verify requires PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN or GOOGLE_APPLICATION_CREDENTIALS service-account JSON.');
  }

  const canFetch = productionManifestPresent &&
    uploadEvidencePresent &&
    input.bucket &&
    resolvedAccessToken &&
    wrongScopeEntries === 0 &&
    openEntryFlags === 0 &&
    uploadObjects.length === EXPECTED_OBJECTS &&
    manifestObjectPathSet.size === EXPECTED_OBJECTS &&
    duplicateUploadEvidencePaths === 0 &&
    uploadEvidenceOnlyPaths === 0 &&
    manifestOnlyPaths === 0 &&
    invalidObjectRoles === 0 &&
    invalidPayloadSha256Entries === 0 &&
    invalidPayloadByteEntries === 0;
  if (canFetch) {
    try {
      const found = await listObjects(input.bucket as string, resolvedAccessToken, fetchImpl);
      const expectedPaths = new Set(expectedEntries.map((entry) => entry.serverPath as string));
      unexpectedObjects.push(...Array.from(found.keys()).filter((objectPath) => !expectedPaths.has(objectPath)).sort());
      for (const entry of expectedEntries) {
        const objectPath = entry.serverPath as string;
        if (!found.has(objectPath)) {
          missingObjects.push(objectPath);
          continue;
        }
        foundObjectCount += 1;
        sizeCheckedCount += 1;
        if (found.get(objectPath) !== entry.payloadBytes) {
          sizeMismatches.push(objectPath);
          continue;
        }
        const body = await readObject(input.bucket as string, resolvedAccessToken, objectPath, fetchImpl);
        const sha = crypto.createHash('sha256').update(body).digest('hex');
        hashCheckedCount += 1;
        if (sha !== entry.payloadSha256) hashMismatches.push(objectPath);
      }
    } catch (error) {
      addFinding(findings, 'blocker', 'remote_verify_request_failed', error instanceof Error ? error.message : String(error));
    }
  }

  if (missingObjects.length > 0) addFinding(findings, 'blocker', 'remote_objects_missing', `${missingObjects.length} expected server object(s) are missing.`);
  if (unexpectedObjects.length > 0) addFinding(findings, 'blocker', 'remote_unexpected_objects', `${unexpectedObjects.length} unexpected server object(s) were found under course-packs/fr/.`);
  if (sizeMismatches.length > 0) addFinding(findings, 'blocker', 'remote_object_size_mismatch', `${sizeMismatches.length} server object size mismatch(es).`);
  if (hashMismatches.length > 0) addFinding(findings, 'blocker', 'remote_object_hash_mismatch', `${hashMismatches.length} server object hash mismatch(es).`);

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const unverifiedObjects = Math.max(0, expectedEntries.length - hashCheckedCount);
  return {
    schemaVersion: 'gustav-french-server-object-remote-verify-v2-packet-v0',
    runId: path.basename(input.runDir),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    summary: {
      studyTarget: 'fr',
      productionManifestPresent,
      bucket: input.bucket,
      accessTokenPresent: Boolean(resolvedAccessToken),
      multipleCredentialSourcesPresent,
      credentialSource,
      expectedObjectCount: uploadEvidencePresent ? uploadObjects.length : 0,
      uploadEvidenceObjectCount: uploadEvidencePresent ? uploadObjects.length : 0,
      manifestDerivedObjectCount: manifestObjectPathSet.size,
      manifestUploadPathMatches,
      duplicateUploadEvidencePaths,
      uploadEvidenceOnlyPaths,
      manifestOnlyPaths,
      invalidObjectRoles,
      invalidPayloadSha256Entries,
      invalidPayloadByteEntries,
      foundObjectCount,
      sizeCheckedCount,
      hashCheckedCount,
      unexpectedObjects: unexpectedObjects.length,
      unverifiedObjects,
      missingObjects: missingObjects.length,
      sizeMismatches: sizeMismatches.length,
      hashMismatches: hashMismatches.length,
      wrongScopeEntries,
      openEntryFlags,
      activationApproved: false,
      runtimeDownloadsEnabled: false,
      readyForApply: false,
      readyForRuntimeDownloadActivation: blockers === 0 && warnings === 0,
      blockers,
      warnings,
    },
    inputs: {
      productionServerDeliveryManifestV2: rel(input.repoRoot, input.productionManifestPath),
      frenchServerPackUploadEvidenceV2Packet: rel(input.repoRoot, uploadEvidencePath),
    },
    outputs: {},
    missingObjects,
    unexpectedObjects,
    sizeMismatches,
    hashMismatches,
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

function renderMarkdown(report: FrenchServerObjectRemoteVerifyReport): string {
  const lines = [
    '# Gustav French Server Object Remote Verify V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Production manifest present: ${report.summary.productionManifestPresent ? 'yes' : 'no'}`,
    `- Credential source: ${report.summary.credentialSource}`,
    `- Expected/found objects: ${report.summary.expectedObjectCount}/${report.summary.foundObjectCount}`,
    `- Size/hash checked: ${report.summary.sizeCheckedCount}/${report.summary.hashCheckedCount}`,
    `- Unexpected objects: ${report.summary.unexpectedObjects}`,
    `- Unverified objects: ${report.summary.unverifiedObjects}`,
    `- Missing/size/hash mismatches: ${report.summary.missingObjects}/${report.summary.sizeMismatches}/${report.summary.hashMismatches}`,
    `- Ready for runtime download activation gate: ${report.summary.readyForRuntimeDownloadActivation ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push('', '## Safety', '', '- This verifier reads server objects only.', '- It does not upload, mutate app files, enable runtime downloads, approve activation or apply.', '');
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);
  const runDir = path.resolve(repoRoot, runArg);
  const outputJsonPath = path.join(runDir, 'audits', 'french_server_object_remote_verify_v2_packet.json');
  const outputMdPath = path.join(runDir, 'audits', 'french_server_object_remote_verify_v2_packet.md');
  const report = await buildFrenchServerObjectRemoteVerifyReport({
    repoRoot,
    runDir,
    productionManifestPath: path.join(runDir, 'pack_candidates', 'fr', 'server_delivery_manifest_v2.json'),
    bucket: process.env.PHRASEMAN_FRENCH_SERVER_PACK_BUCKET || STORAGE_BUCKET,
    accessToken: process.env.PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN || '',
    googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  });
  report.outputs = {
    packet: rel(repoRoot, outputJsonPath),
    markdown: rel(repoRoot, outputMdPath),
  };
  ensureDir(path.dirname(outputJsonPath));
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV French server object remote verify V2 packet: ${report.status}`);
  console.log(`Production manifest present: ${report.summary.productionManifestPresent ? 'yes' : 'no'}`);
  console.log(`Credential source: ${report.summary.credentialSource}`);
  console.log(`Objects expected/found: ${report.summary.expectedObjectCount}/${report.summary.foundObjectCount}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

if (require.main === module) {
  void main();
}
