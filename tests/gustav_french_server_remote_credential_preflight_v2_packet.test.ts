import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  buildFrenchServerRemoteCredentialPreflight,
} from '../scripts/gustav_french_server_remote_credential_preflight_v2_packet';

const ROOT = path.resolve(__dirname, '..');
const RUN_DIR = path.join(ROOT, 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'scripts', 'gustav_french_server_remote_credential_preflight_v2_packet.ts'),
  'utf8',
);

function build(accessToken: string) {
  return buildFrenchServerRemoteCredentialPreflight({
    repoRoot: ROOT,
    runDir: RUN_DIR,
    bucket: 'phraseman-ea0b3.firebasestorage.app',
    accessToken,
    googleApplicationCredentials: '',
    firebaseToken: '',
  });
}

function writeServiceAccountFixture(): { file: string; privateKey: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fr-credential-preflight-'));
  const privateKey = '-----BEGIN PRIVATE KEY-----\\nsecret-private-key\\n-----END PRIVATE KEY-----\\n';
  const file = path.join(dir, 'service-account.json');
  fs.writeFileSync(file, JSON.stringify({
    type: 'service_account',
    client_email: 'reader@example.iam.gserviceaccount.com',
    private_key: privateKey,
  }), 'utf8');
  return { file, privateKey };
}

describe('Gustav French server remote credential preflight V2 packet', () => {
  it('blocks remote verify when the read-only access token env is absent', () => {
    const report = build('');
    expect(report.status).toBe('BLOCK');
    expect(report.summary.accessTokenEnvPresent).toBe(false);
    expect(report.summary.readyForRemoteObjectVerifyCommand).toBe(false);
    expect(report.summary.credentialSource).toBe('missing');
    expect(report.findings.some((finding) => finding.code === 'remote_verify_credentials_missing')).toBe(true);
  });

  it('passes when the remote verify access token env is present without printing it', () => {
    const report = build('secret-token-value');
    expect(report.status).toBe('PASS');
    expect(report.summary.accessTokenEnvPresent).toBe(true);
    expect(report.summary.accessTokenLength).toBe('secret-token-value'.length);
    expect(report.summary.credentialSource).toBe('access_token_env');
    expect(report.summary.readyForRemoteObjectVerifyCommand).toBe(true);
    expect(JSON.stringify(report)).not.toContain('secret-token-value');
  });

  it('passes with a usable service-account credential file without printing private key material', () => {
    const { file, privateKey } = writeServiceAccountFixture();
    const report = buildFrenchServerRemoteCredentialPreflight({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      bucket: 'phraseman-ea0b3.firebasestorage.app',
      accessToken: '',
      googleApplicationCredentials: file,
      firebaseToken: '',
    });
    expect(report.status).toBe('PASS');
    expect(report.summary.accessTokenEnvPresent).toBe(false);
    expect(report.summary.googleApplicationCredentialsFileExists).toBe(true);
    expect(report.summary.googleApplicationCredentialsServiceAccountUsable).toBe(true);
    expect(report.summary.credentialSource).toBe('service_account_file');
    expect(report.summary.readyForRemoteObjectVerifyCommand).toBe(true);
    expect(JSON.stringify(report)).not.toContain(privateKey);
    expect(JSON.stringify(report)).not.toContain('reader@example.iam.gserviceaccount.com');
  });

  it('blocks ambiguous remote verify when both accepted credential sources are present', () => {
    const { file, privateKey } = writeServiceAccountFixture();
    const report = buildFrenchServerRemoteCredentialPreflight({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      bucket: 'phraseman-ea0b3.firebasestorage.app',
      accessToken: 'secret-token-value',
      googleApplicationCredentials: file,
      firebaseToken: '',
    });
    expect(report.status).toBe('BLOCK');
    expect(report.summary.multipleCredentialSourcesPresent).toBe(true);
    expect(report.summary.acceptedForRemoteVerifyNow).toBe(false);
    expect(report.summary.readyForRemoteObjectVerifyCommand).toBe(false);
    expect(report.findings.some((finding) => finding.code === 'remote_verify_multiple_credential_sources')).toBe(true);
    expect(JSON.stringify(report)).not.toContain('secret-token-value');
    expect(JSON.stringify(report)).not.toContain(privateKey);
  });

  it('blocks ambiguous remote verify when GOOGLE_APPLICATION_CREDENTIALS is set even if the file is unusable', () => {
    const report = buildFrenchServerRemoteCredentialPreflight({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      bucket: 'phraseman-ea0b3.firebasestorage.app',
      accessToken: 'secret-token-value',
      googleApplicationCredentials: path.join(os.tmpdir(), 'missing-fr-service-account.json'),
      firebaseToken: '',
    });

    expect(report.status).toBe('BLOCK');
    expect(report.summary.accessTokenEnvPresent).toBe(true);
    expect(report.summary.googleApplicationCredentialsEnvPresent).toBe(true);
    expect(report.summary.googleApplicationCredentialsFileExists).toBe(false);
    expect(report.summary.multipleCredentialSourcesPresent).toBe(true);
    expect(report.summary.acceptedForRemoteVerifyNow).toBe(false);
    expect(report.summary.readyForRemoteObjectVerifyCommand).toBe(false);
    expect(report.findings.some((finding) => finding.code === 'remote_verify_multiple_credential_sources')).toBe(true);
    expect(JSON.stringify(report)).not.toContain('secret-token-value');
  });

  it('keeps the credential preflight read-only and closed for production', () => {
    expect(SOURCE).toContain('credentialsPrintedByThisScript: false');
    expect(SOURCE).toContain('multipleCredentialSourcesPresent');
    expect(SOURCE).toContain('remote_verify_multiple_credential_sources');
    expect(SOURCE).toContain('firebaseOrServerUploadStarted: false');
    expect(SOURCE).toContain('serverObjectsModifiedByThisScript: false');
    expect(SOURCE).toContain('runtimeDownloadsEnabled: false');
    expect(SOURCE).toContain('activationApproved: false');
    expect(SOURCE).toContain('readyForApply: false');
  });
});
