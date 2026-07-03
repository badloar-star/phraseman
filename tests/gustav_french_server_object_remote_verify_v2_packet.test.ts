import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  buildFrenchServerObjectRemoteVerifyReport,
  resolveRemoteVerifyAccessToken,
} from '../scripts/gustav_french_server_object_remote_verify_v2_packet';

const ROOT = process.cwd();
const RUN_DIR = path.join(ROOT, 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const SCRIPT_SOURCE = fs.readFileSync(path.join(ROOT, 'scripts/gustav_french_server_object_remote_verify_v2_packet.ts'), 'utf8');

type FetchResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
};

function bufferResponse(buffer: Buffer): FetchResponse {
  return {
    ok: true,
    status: 200,
    text: async () => buffer.toString('utf8'),
    json: async () => JSON.parse(buffer.toString('utf8')),
    arrayBuffer: async () => Uint8Array.from(buffer).buffer as ArrayBuffer,
  };
}

function jsonResponse(value: unknown): FetchResponse {
  return bufferResponse(Buffer.from(JSON.stringify(value), 'utf8'));
}

function makeProductionManifest(): Record<string, any> {
  const draftPath = path.join(RUN_DIR, 'pack_candidates/fr/server_delivery_manifest_v2_draft.json');
  const manifest = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
  manifest.schemaVersion = 'gustav-server-delivery-manifest-v2';
  manifest.manifestMode = 'production_published_pre_activation';
  return manifest;
}

function writeManifestFixture(manifest: Record<string, any>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fr-remote-verify-'));
  const file = path.join(dir, 'server_delivery_manifest_v2.json');
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return file;
}

function makeUploadEvidenceFixture(manifest: Record<string, any>): { file: string; files: Record<string, Buffer> } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fr-upload-evidence-'));
  const file = path.join(dir, 'french_server_pack_upload_evidence_v2_packet.json');
  const files: Record<string, Buffer> = {};
  const uploadObjects = manifest.entries.flatMap((entry: any) => {
    const prefix = `course-packs/fr/${entry.sourceLocale}/${entry.surface}/${entry.contentVersion}`;
    return [
      { ...entry, objectRole: 'manifest', serverPath: `${prefix}/manifest.json` },
      { ...entry, objectRole: 'entry_index', serverPath: `${prefix}/index.json` },
      { ...entry, objectRole: 'payload', serverPath: entry.serverPath },
    ].map((objectEntry) => {
      const content = Buffer.from(`${objectEntry.serverPath}\n`, 'utf8');
      files[objectEntry.serverPath] = content;
      return {
        runtimeSliceId: entry.runtimeSliceId,
        studyTarget: 'fr',
        sourceLocale: entry.sourceLocale,
        surface: entry.surface,
        contentVersion: entry.contentVersion,
        objectRole: objectEntry.objectRole,
        localPayloadPath: entry.payloadShard,
        serverPath: objectEntry.serverPath,
        payloadBytes: content.byteLength,
        payloadSha256: crypto.createHash('sha256').update(content).digest('hex'),
        rollbackScope: `course-packs/fr/${entry.sourceLocale}/`,
      };
    });
  });
  fs.writeFileSync(file, JSON.stringify({
    schemaVersion: 'gustav-french-server-pack-upload-evidence-v2-packet-v0',
    status: 'PASS',
    summary: {
      uploadObjects: uploadObjects.length,
      deniedEnglishPathRefs: 0,
      deniedUiLocaleRefs: 0,
      activationApproved: false,
      runtimeDownloadsEnabled: false,
      readyForApply: false,
    },
    uploadObjects,
  }), 'utf8');
  return { file, files };
}

function makeFetch(files: Record<string, Buffer>) {
  return async (input: string | URL, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<FetchResponse> => {
    expect(init?.method ?? 'GET').toBe('GET');
    const url = new URL(String(input));
    if (url.pathname.endsWith('/o') && url.searchParams.get('prefix') === 'course-packs/fr/') {
      return jsonResponse({
        items: Object.entries(files).map(([name, content]) => ({
          name,
          size: String(content.byteLength),
        })),
      });
    }
    const encodedName = url.pathname.split('/o/')[1];
    const name = decodeURIComponent(encodedName ?? '');
    const content = files[name];
    if (!content) {
      return {
        ok: false,
        status: 404,
        text: async () => 'missing',
        json: async () => ({}),
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    }
    return bufferResponse(content);
  };
}

function makeFetchWithServiceAccountToken(files: Record<string, Buffer>) {
  const fetchCalls: { url: string; body?: string }[] = [];
  const fetchImpl = async (input: string | URL, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<FetchResponse> => {
    const url = new URL(String(input));
    fetchCalls.push({ url: String(input), body: init?.body });
    if (url.hostname === 'oauth2.googleapis.com') {
      return jsonResponse({ access_token: 'minted-read-only-token', token_type: 'Bearer', expires_in: 3600 });
    }
    return makeFetch(files)(input);
  };
  return { fetchImpl, fetchCalls };
}

function writeServiceAccountFixture(): { file: string; privateKey: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fr-remote-service-account-'));
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const file = path.join(dir, 'service-account.json');
  fs.writeFileSync(file, JSON.stringify({
    type: 'service_account',
    client_email: 'reader@example.iam.gserviceaccount.com',
    private_key: privateKeyPem,
  }), 'utf8');
  return { file, privateKey: privateKeyPem };
}

async function verify(productionManifestPath: string, uploadEvidencePath: string, files: Record<string, Buffer>, accessToken = 'token') {
  return buildFrenchServerObjectRemoteVerifyReport({
    repoRoot: ROOT,
    runDir: RUN_DIR,
    productionManifestPath,
    uploadEvidencePath,
    bucket: 'phraseman-ea0b3.firebasestorage.app',
    accessToken,
    generatedAt: '2026-06-29T00:00:00.000Z',
  }, makeFetch(files));
}

describe('Gustav French server object remote verify V2 packet', () => {
  it('is read-only and keeps production activation closed', () => {
    expect(SCRIPT_SOURCE).toContain('serverObjectsModifiedByThisScript: false');
    expect(SCRIPT_SOURCE).toContain('firebaseOrServerUploadStarted: false');
    expect(SCRIPT_SOURCE).toContain('runtimeDownloadsEnabled: false');
    expect(SCRIPT_SOURCE).toContain('activationApproved: false');
    expect(SCRIPT_SOURCE).not.toMatch(/writeFileSync\(input\.productionManifestPath/);
  });

  it('holds when the production manifest is absent', async () => {
    const manifest = makeProductionManifest();
    const uploadEvidence = makeUploadEvidenceFixture(manifest);
    const report = await verify(path.join(RUN_DIR, 'pack_candidates/fr/missing_server_delivery_manifest_v2.json'), uploadEvidence.file, {});
    expect(report.status).toBe('BLOCK');
    expect(report.summary.productionManifestPresent).toBe(false);
    expect(report.summary.unverifiedObjects).toBe(36);
    expect(report.summary.readyForRuntimeDownloadActivation).toBe(false);
    expect(report.findings.some((finding) => finding.code === 'production_server_manifest_missing')).toBe(true);
  });

  it('blocks when remote credentials are missing', async () => {
    const manifest = makeProductionManifest();
    const uploadEvidence = makeUploadEvidenceFixture(manifest);
    const report = await verify(writeManifestFixture(manifest), uploadEvidence.file, uploadEvidence.files, '');
    expect(report.status).toBe('BLOCK');
    expect(report.summary.accessTokenPresent).toBe(false);
    expect(report.summary.credentialSource).toBe('missing');
    expect(report.summary.unverifiedObjects).toBe(36);
    expect(report.summary.readyForRuntimeDownloadActivation).toBe(false);
    expect(report.findings.some((finding) => finding.code === 'remote_verify_credentials_missing')).toBe(true);
  });

  it('keeps the current run upload evidence aligned with the production manifest before credentialed verify', async () => {
    const report = await buildFrenchServerObjectRemoteVerifyReport({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      productionManifestPath: path.join(RUN_DIR, 'pack_candidates/fr/server_delivery_manifest_v2.json'),
      uploadEvidencePath: path.join(RUN_DIR, 'audits/french_server_pack_upload_evidence_v2_packet.json'),
      bucket: 'phraseman-ea0b3.firebasestorage.app',
      accessToken: '',
      generatedAt: '2026-06-29T00:00:00.000Z',
    }, jest.fn(async () => {
      throw new Error('remote fetch must not run without credentials');
    }));

    expect(report.status).toBe('BLOCK');
    expect(report.summary.expectedObjectCount).toBe(36);
    expect(report.summary.uploadEvidenceObjectCount).toBe(36);
    expect(report.summary.manifestDerivedObjectCount).toBe(36);
    expect(report.summary.manifestUploadPathMatches).toBe(36);
    expect(report.summary.uploadEvidenceOnlyPaths).toBe(0);
    expect(report.summary.manifestOnlyPaths).toBe(0);
    expect(report.summary.hashCheckedCount).toBe(0);
    expect(report.summary.unverifiedObjects).toBe(36);
    expect(report.findings.filter((finding) => finding.severity === 'blocker').map((finding) => finding.code)).toEqual([
      'remote_verify_credentials_missing',
    ]);
  });

  it('mints a read-only token from service-account credentials and verifies all remote objects', async () => {
    const manifest = makeProductionManifest();
    const uploadEvidence = makeUploadEvidenceFixture(manifest);
    const { file, privateKey } = writeServiceAccountFixture();
    const { fetchImpl, fetchCalls } = makeFetchWithServiceAccountToken(uploadEvidence.files);
    const report = await buildFrenchServerObjectRemoteVerifyReport({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      productionManifestPath: writeManifestFixture(manifest),
      uploadEvidencePath: uploadEvidence.file,
      bucket: 'phraseman-ea0b3.firebasestorage.app',
      accessToken: '',
      googleApplicationCredentials: file,
      generatedAt: '2026-06-29T00:00:00.000Z',
    }, fetchImpl);
    expect(report.status).toBe('PASS');
    expect(report.summary.accessTokenPresent).toBe(true);
    expect(report.summary.credentialSource).toBe('service_account_file');
    expect(report.summary.hashCheckedCount).toBe(36);
    expect(report.summary.unverifiedObjects).toBe(0);
    expect(JSON.stringify(report)).not.toContain(privateKey);
    expect(JSON.stringify(report)).not.toContain('minted-read-only-token');
    expect(fetchCalls.some((call) => call.url === 'https://oauth2.googleapis.com/token')).toBe(true);
    expect(fetchCalls.map((call) => call.body ?? '').join('\n')).not.toContain(privateKey);
  });

  it('rejects ambiguous remote verify when both credential sources are present', async () => {
    const { file } = writeServiceAccountFixture();
    await expect(resolveRemoteVerifyAccessToken({
      repoRoot: ROOT,
      accessToken: 'explicit-token',
      googleApplicationCredentials: file,
    }, async () => {
      throw new Error('service-account token mint should not run when explicit token exists');
    })).rejects.toThrow('Provide exactly one remote verify credential source');
  });

  it('blocks dual credential sources before remote fetch', async () => {
    const manifest = makeProductionManifest();
    const uploadEvidence = makeUploadEvidenceFixture(manifest);
    const { file } = writeServiceAccountFixture();
    const fetchImpl = jest.fn(makeFetch(uploadEvidence.files));
    const report = await buildFrenchServerObjectRemoteVerifyReport({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      productionManifestPath: writeManifestFixture(manifest),
      uploadEvidencePath: uploadEvidence.file,
      bucket: 'phraseman-ea0b3.firebasestorage.app',
      accessToken: 'explicit-token',
      googleApplicationCredentials: file,
      generatedAt: '2026-06-29T00:00:00.000Z',
    }, fetchImpl);
    expect(report.status).toBe('BLOCK');
    expect(report.summary.multipleCredentialSourcesPresent).toBe(true);
    expect(report.summary.accessTokenPresent).toBe(false);
    expect(report.summary.hashCheckedCount).toBe(0);
    expect(report.findings.some((finding) => finding.code === 'remote_verify_multiple_credential_sources')).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('passes when every scoped server object matches hash and byte size', async () => {
    const manifest = makeProductionManifest();
    const uploadEvidence = makeUploadEvidenceFixture(manifest);
    const report = await verify(writeManifestFixture(manifest), uploadEvidence.file, uploadEvidence.files);
    expect(report.status).toBe('PASS');
    expect(report.summary.expectedObjectCount).toBe(36);
    expect(report.summary.uploadEvidenceObjectCount).toBe(36);
    expect(report.summary.manifestDerivedObjectCount).toBe(36);
    expect(report.summary.manifestUploadPathMatches).toBe(36);
    expect(report.summary.duplicateUploadEvidencePaths).toBe(0);
    expect(report.summary.uploadEvidenceOnlyPaths).toBe(0);
    expect(report.summary.manifestOnlyPaths).toBe(0);
    expect(report.summary.invalidObjectRoles).toBe(0);
    expect(report.summary.invalidPayloadSha256Entries).toBe(0);
    expect(report.summary.invalidPayloadByteEntries).toBe(0);
    expect(report.summary.foundObjectCount).toBe(36);
    expect(report.summary.sizeCheckedCount).toBe(36);
    expect(report.summary.hashCheckedCount).toBe(36);
    expect(report.summary.unexpectedObjects).toBe(0);
    expect(report.summary.unverifiedObjects).toBe(0);
    expect(report.summary.readyForRuntimeDownloadActivation).toBe(true);
  });

  it('blocks unexpected remote objects under the French pack prefix', async () => {
    const manifest = makeProductionManifest();
    const uploadEvidence = makeUploadEvidenceFixture(manifest);
    uploadEvidence.files['course-packs/fr/ru/lesson/extra/rogue.json'] = Buffer.from('rogue', 'utf8');
    const report = await verify(writeManifestFixture(manifest), uploadEvidence.file, uploadEvidence.files);
    expect(report.status).toBe('BLOCK');
    expect(report.summary.foundObjectCount).toBe(36);
    expect(report.summary.unexpectedObjects).toBe(1);
    expect(report.unexpectedObjects).toContain('course-packs/fr/ru/lesson/extra/rogue.json');
    expect(report.findings.some((finding) => finding.code === 'remote_unexpected_objects')).toBe(true);
    expect(report.summary.readyForRuntimeDownloadActivation).toBe(false);
  });

  it('blocks wrong-scope upload evidence before remote fetch', async () => {
    const manifest = makeProductionManifest();
    const uploadEvidence = makeUploadEvidenceFixture(manifest);
    const packet = JSON.parse(fs.readFileSync(uploadEvidence.file, 'utf8'));
    packet.uploadObjects[0].serverPath = 'course-packs/en/ru/lesson/bad.json';
    fs.writeFileSync(uploadEvidence.file, JSON.stringify(packet), 'utf8');
    const report = await verify(writeManifestFixture(manifest), uploadEvidence.file, uploadEvidence.files);
    expect(report.status).toBe('BLOCK');
    expect(report.summary.wrongScopeEntries).toBe(1);
    expect(report.summary.hashCheckedCount).toBe(0);
    expect(report.findings.some((finding) => finding.code === 'production_manifest_scope_invalid')).toBe(true);
  });

  it('blocks upload evidence paths that are not derived from the production manifest', async () => {
    const manifest = makeProductionManifest();
    const uploadEvidence = makeUploadEvidenceFixture(manifest);
    const packet = JSON.parse(fs.readFileSync(uploadEvidence.file, 'utf8'));
    const originalPath = packet.uploadObjects[0].serverPath;
    packet.uploadObjects[0].serverPath = 'course-packs/fr/ru/lesson/rogue/manifest.json';
    uploadEvidence.files[packet.uploadObjects[0].serverPath] = uploadEvidence.files[originalPath];
    delete uploadEvidence.files[originalPath];
    fs.writeFileSync(uploadEvidence.file, JSON.stringify(packet), 'utf8');
    const fetchImpl = jest.fn(makeFetch(uploadEvidence.files));
    const report = await buildFrenchServerObjectRemoteVerifyReport({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      productionManifestPath: writeManifestFixture(manifest),
      uploadEvidencePath: uploadEvidence.file,
      bucket: 'phraseman-ea0b3.firebasestorage.app',
      accessToken: 'token',
      generatedAt: '2026-06-29T00:00:00.000Z',
    }, fetchImpl);
    expect(report.status).toBe('BLOCK');
    expect(report.summary.uploadEvidenceOnlyPaths).toBe(1);
    expect(report.summary.manifestOnlyPaths).toBe(1);
    expect(report.summary.hashCheckedCount).toBe(0);
    expect(report.findings.some((finding) => finding.code === 'upload_evidence_paths_not_in_manifest')).toBe(true);
    expect(report.findings.some((finding) => finding.code === 'production_manifest_paths_missing_upload_evidence')).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('blocks duplicate upload evidence server paths before remote fetch', async () => {
    const manifest = makeProductionManifest();
    const uploadEvidence = makeUploadEvidenceFixture(manifest);
    const packet = JSON.parse(fs.readFileSync(uploadEvidence.file, 'utf8'));
    packet.uploadObjects[1].serverPath = packet.uploadObjects[0].serverPath;
    fs.writeFileSync(uploadEvidence.file, JSON.stringify(packet), 'utf8');
    const fetchImpl = jest.fn(makeFetch(uploadEvidence.files));
    const report = await buildFrenchServerObjectRemoteVerifyReport({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      productionManifestPath: writeManifestFixture(manifest),
      uploadEvidencePath: uploadEvidence.file,
      bucket: 'phraseman-ea0b3.firebasestorage.app',
      accessToken: 'token',
      generatedAt: '2026-06-29T00:00:00.000Z',
    }, fetchImpl);
    expect(report.status).toBe('BLOCK');
    expect(report.summary.duplicateUploadEvidencePaths).toBe(1);
    expect(report.summary.manifestOnlyPaths).toBe(1);
    expect(report.summary.hashCheckedCount).toBe(0);
    expect(report.findings.some((finding) => finding.code === 'upload_evidence_duplicate_server_paths')).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('blocks invalid upload evidence role and payload metadata before remote fetch', async () => {
    const manifest = makeProductionManifest();
    const uploadEvidence = makeUploadEvidenceFixture(manifest);
    const packet = JSON.parse(fs.readFileSync(uploadEvidence.file, 'utf8'));
    packet.uploadObjects[0].objectRole = 'wrong_role';
    packet.uploadObjects[1].payloadSha256 = 'not-a-sha';
    packet.uploadObjects[2].payloadBytes = 0;
    fs.writeFileSync(uploadEvidence.file, JSON.stringify(packet), 'utf8');
    const fetchImpl = jest.fn(makeFetch(uploadEvidence.files));
    const report = await buildFrenchServerObjectRemoteVerifyReport({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      productionManifestPath: writeManifestFixture(manifest),
      uploadEvidencePath: uploadEvidence.file,
      bucket: 'phraseman-ea0b3.firebasestorage.app',
      accessToken: 'token',
      generatedAt: '2026-06-29T00:00:00.000Z',
    }, fetchImpl);
    expect(report.status).toBe('BLOCK');
    expect(report.summary.invalidObjectRoles).toBe(1);
    expect(report.summary.invalidPayloadSha256Entries).toBe(1);
    expect(report.summary.invalidPayloadByteEntries).toBe(1);
    expect(report.summary.hashCheckedCount).toBe(0);
    expect(report.findings.some((finding) => finding.code === 'upload_evidence_object_role_invalid')).toBe(true);
    expect(report.findings.some((finding) => finding.code === 'upload_evidence_payload_sha_invalid')).toBe(true);
    expect(report.findings.some((finding) => finding.code === 'upload_evidence_payload_bytes_invalid')).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('blocks open production flags before remote fetch', async () => {
    const manifest = makeProductionManifest();
    manifest.entries[0].runtimeDownloadsEnabled = true;
    const uploadEvidence = makeUploadEvidenceFixture(makeProductionManifest());
    const report = await verify(writeManifestFixture(manifest), uploadEvidence.file, uploadEvidence.files);
    expect(report.status).toBe('BLOCK');
    expect(report.summary.openEntryFlags).toBe(1);
    expect(report.summary.hashCheckedCount).toBe(0);
    expect(report.findings.some((finding) => finding.code === 'production_manifest_entry_flags_open')).toBe(true);
  });

  it('blocks when a server object is missing', async () => {
    const manifest = makeProductionManifest();
    const uploadEvidence = makeUploadEvidenceFixture(manifest);
    delete uploadEvidence.files[manifest.entries[0].serverPath];
    const report = await verify(writeManifestFixture(manifest), uploadEvidence.file, uploadEvidence.files);
    expect(report.status).toBe('BLOCK');
    expect(report.summary.unverifiedObjects).toBe(1);
    expect(report.summary.missingObjects).toBe(1);
    expect(report.findings.some((finding) => finding.code === 'remote_objects_missing')).toBe(true);
  });

  it('blocks when a server object hash does not match the manifest', async () => {
    const manifest = makeProductionManifest();
    const uploadEvidence = makeUploadEvidenceFixture(manifest);
    const original = uploadEvidence.files[manifest.entries[0].serverPath];
    uploadEvidence.files[manifest.entries[0].serverPath] = Buffer.from('x'.repeat(original.byteLength), 'utf8');
    const report = await verify(writeManifestFixture(manifest), uploadEvidence.file, uploadEvidence.files);
    expect(report.status).toBe('BLOCK');
    expect(report.summary.unverifiedObjects).toBe(0);
    expect(report.summary.hashMismatches).toBe(1);
    expect(report.findings.some((finding) => finding.code === 'remote_object_hash_mismatch')).toBe(true);
  });
});
