import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  buildFrenchUploadRemoteVerifyParity,
} from '../scripts/gustav_french_upload_remote_verify_parity_v2_packet';

const ROOT = path.resolve(__dirname, '..');
const RUN_DIR = path.join(ROOT, 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'scripts', 'gustav_french_upload_remote_verify_parity_v2_packet.ts'),
  'utf8',
);

function copyJsonFixture(source: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fr-upload-remote-parity-'));
  const target = path.join(dir, path.basename(source));
  fs.copyFileSync(source, target);
  return target;
}

describe('Gustav French upload remote verify parity V2 packet', () => {
  it('proves upload evidence and remote dry-run check the exact same 36 French objects', () => {
    const report = buildFrenchUploadRemoteVerifyParity({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(report.status).toBe('PASS');
    expect(report.summary.uploadEvidenceStatus).toBe('PASS');
    expect(report.summary.remoteDryRunStatus).toBe('PASS');
    expect(report.summary.uploadObjects).toBe(36);
    expect(report.summary.plannedChecks).toBe(36);
    expect(report.summary.matchedServerPaths).toBe(36);
    expect(report.summary.roleMatches).toBe(36);
    expect(report.summary.sourceLocaleMatches).toBe(36);
    expect(report.summary.surfaceMatches).toBe(36);
    expect(report.summary.shaMatches).toBe(36);
    expect(report.summary.byteMatches).toBe(36);
    expect(report.summary.rollbackScopeMatches).toBe(36);
    expect(report.summary.uploadOnlyPaths).toBe(0);
    expect(report.summary.dryRunOnlyPaths).toBe(0);
    expect(report.summary.duplicateUploadPaths).toBe(0);
    expect(report.summary.duplicateDryRunPaths).toBe(0);
    expect(report.summary.scopedFrenchPaths).toBe(36);
    expect(report.summary.deniedEnglishPathRefs).toBe(0);
    expect(report.summary.deniedUiLocaleRefs).toBe(0);
    expect(report.summary.readyForRemoteObjectVerify).toBe(true);
    expect(report.findings).toEqual([]);
  });

  it('blocks when the remote dry-run checks a different hash than upload evidence', () => {
    const dryRunPath = copyJsonFixture(path.join(RUN_DIR, 'audits/french_remote_verify_dry_run_readiness_v2_packet.json'));
    const dryRun = JSON.parse(fs.readFileSync(dryRunPath, 'utf8'));
    dryRun.plannedChecks[0].payloadSha256 = '0'.repeat(64);
    fs.writeFileSync(dryRunPath, JSON.stringify(dryRun), 'utf8');

    const report = buildFrenchUploadRemoteVerifyParity({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      dryRunPath,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(report.status).toBe('BLOCK');
    expect(report.summary.shaMatches).toBe(35);
    expect(report.mismatches).toContainEqual(expect.objectContaining({
      field: 'payloadSha256',
    }));
    expect(report.findings.some((finding) => finding.code === 'upload_remote_verify_field_mismatch')).toBe(true);
  });

  it('blocks when upload evidence contains a path that dry-run will not verify', () => {
    const uploadEvidencePath = copyJsonFixture(path.join(RUN_DIR, 'audits/french_server_pack_upload_evidence_v2_packet.json'));
    const uploadEvidence = JSON.parse(fs.readFileSync(uploadEvidencePath, 'utf8'));
    uploadEvidence.uploadObjects[0].serverPath = 'course-packs/fr/ru/lesson/unverified/object.json';
    fs.writeFileSync(uploadEvidencePath, JSON.stringify(uploadEvidence), 'utf8');

    const report = buildFrenchUploadRemoteVerifyParity({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      uploadEvidencePath,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(report.status).toBe('BLOCK');
    expect(report.summary.uploadOnlyPaths).toBe(1);
    expect(report.summary.dryRunOnlyPaths).toBe(1);
    expect(report.findings.some((finding) => finding.code === 'upload_paths_not_in_remote_dry_run')).toBe(true);
    expect(report.findings.some((finding) => finding.code === 'remote_dry_run_paths_not_in_upload')).toBe(true);
  });

  it('is read-only and production closed', () => {
    expect(SOURCE).toContain('firebaseOrServerUploadStarted: false');
    expect(SOURCE).toContain('serverObjectsModifiedByThisScript: false');
    expect(SOURCE).toContain('runtimeDownloadsEnabled: false');
    expect(SOURCE).toContain('activationApproved: false');
    expect(SOURCE).toContain('productionApplyApproved: false');
  });
});
