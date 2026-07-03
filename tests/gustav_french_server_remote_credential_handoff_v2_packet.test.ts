import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  buildFrenchServerRemoteCredentialHandoff,
} from '../scripts/gustav_french_server_remote_credential_handoff_v2_packet';

const ROOT = path.resolve(__dirname, '..');
const RUN_DIR = path.join(ROOT, 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'scripts', 'gustav_french_server_remote_credential_handoff_v2_packet.ts'),
  'utf8',
);

function writeHandoffFixtureRun(preflightSummary: Record<string, unknown>): string {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fr-credential-handoff-'));
  const auditsDir = path.join(runDir, 'audits');
  fs.mkdirSync(auditsDir, { recursive: true });
  fs.writeFileSync(path.join(auditsDir, 'french_server_remote_credential_preflight_v2_packet.json'), JSON.stringify({
    status: 'BLOCK',
    summary: {
      credentialSource: 'access_token_env',
      readyForRemoteObjectVerifyCommand: false,
      serverUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      ...preflightSummary,
    },
  }), 'utf8');
  fs.writeFileSync(path.join(auditsDir, 'french_server_object_remote_verify_v2_packet.json'), JSON.stringify({
    status: 'BLOCK',
    summary: {
      credentialSource: 'missing',
      hashCheckedCount: 0,
    },
  }), 'utf8');
  return runDir;
}

describe('Gustav French server remote credential handoff V2 packet', () => {
  it('turns the current missing-credential remote verify blocker into a safe next command handoff', () => {
    const report = buildFrenchServerRemoteCredentialHandoff({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(report.status).toBe('PASS');
    expect(report.summary.handoffState).toBe('waiting_for_remote_credentials');
    expect(report.summary.credentialSource).toBe('missing');
    expect(report.summary.remoteVerifyBlockedByCredentials).toBe(true);
    expect(report.summary.acceptedCredentialOptions).toEqual([
      'PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN',
      'GOOGLE_APPLICATION_CREDENTIALS',
    ]);
    expect(report.summary.nextRequiredCommand).toContain('gustav_french_server_remote_credential_preflight_v2_packet.ts');
    expect(report.commands).toContainEqual(expect.stringContaining('gustav_french_server_object_remote_verify_v2_packet.ts'));
  });

  it('keeps credential handoff read-only and closed for production activation', () => {
    const report = buildFrenchServerRemoteCredentialHandoff({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(report.summary.credentialsPrintedByThisScript).toBe(false);
    expect(report.summary.firebaseOrServerUploadStarted).toBe(false);
    expect(report.summary.serverObjectsModifiedByThisScript).toBe(false);
    expect(report.summary.runtimeDownloadsEnabled).toBe(false);
    expect(report.summary.activationApproved).toBe(false);
    expect(report.summary.readyForApply).toBe(false);
    expect(report.safety.credentialsPrintedByThisScript).toBe(false);
    expect(report.safety.firebaseOrServerUploadStarted).toBe(false);
    expect(report.safety.serverObjectsModifiedByThisScript).toBe(false);
    expect(report.safety.productionApplyApproved).toBe(false);
  });

  it('blocks handoff when preflight detected multiple credential sources', () => {
    const runDir = writeHandoffFixtureRun({
      multipleCredentialSourcesPresent: true,
    });
    const report = buildFrenchServerRemoteCredentialHandoff({
      repoRoot: ROOT,
      runDir,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(report.status).toBe('BLOCK');
    expect(report.summary.handoffState).toBe('blocked_by_findings');
    expect(report.summary.multipleCredentialSourcesPresent).toBe(true);
    expect(report.findings.some((finding) => finding.code === 'credential_handoff_multiple_credential_sources')).toBe(true);
    expect(report.summary.firebaseOrServerUploadStarted).toBe(false);
    expect(report.summary.runtimeDownloadsEnabled).toBe(false);
    expect(report.summary.activationApproved).toBe(false);
    expect(report.summary.readyForApply).toBe(false);
  });

  it('hard-codes no-secret and no-production-write safety flags in source', () => {
    expect(SOURCE).toContain('credentialsPrintedByThisScript: false');
    expect(SOURCE).toContain('firebaseOrServerUploadStarted: false');
    expect(SOURCE).toContain('serverObjectsModifiedByThisScript: false');
    expect(SOURCE).toContain('runtimeDownloadsEnabled: false');
    expect(SOURCE).toContain('activationApproved: false');
    expect(SOURCE).toContain('readyForApply: false');
    expect(SOURCE).toContain('Do not paste token or private-key contents');
    expect(SOURCE).toContain('credential_handoff_multiple_credential_sources');
  });
});
