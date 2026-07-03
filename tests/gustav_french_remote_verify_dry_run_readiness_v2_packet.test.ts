import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  buildFrenchRemoteVerifyDryRunReadiness,
} from '../scripts/gustav_french_remote_verify_dry_run_readiness_v2_packet';

const ROOT = path.resolve(__dirname, '..');
const RUN_DIR = path.join(ROOT, 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'scripts', 'gustav_french_remote_verify_dry_run_readiness_v2_packet.ts'),
  'utf8',
);

describe('Gustav French remote verify dry-run readiness V2 packet', () => {
  it('proves the exact 36 scoped French remote checks are ready before credentials', () => {
    const report = buildFrenchRemoteVerifyDryRunReadiness({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(report.status).toBe('PASS');
    expect(report.summary.productionManifestPresent).toBe(true);
    expect(report.summary.uploadEvidencePresent).toBe(true);
    expect(report.summary.plannedChecks).toBe(36);
    expect(report.summary.uniqueServerPaths).toBe(36);
    expect(report.summary.scopedServerPaths).toBe(36);
    expect(report.summary.payloadShaMatchesUploadEvidence).toBe(36);
    expect(report.summary.payloadByteMatchesUploadEvidence).toBe(36);
    expect(report.summary.payloadShaFilenameMatches).toBe(36);
    expect(report.summary.deniedEnglishPathRefs).toBe(0);
    expect(report.summary.deniedUiLocaleRefs).toBe(0);
    expect(report.summary.openEntryFlags).toBe(0);
    expect(report.summary.credentialRequiredForLiveVerify).toBe(true);
    expect(report.summary.credentialSourcePresent).toBe(false);
    expect(report.summary.safeToRunLiveVerifyWhenCredentialPresent).toBe(true);
    expect(report.plannedChecks.every((check) => check.serverPath.startsWith(`course-packs/fr/${check.sourceLocale}/${check.surface}/`))).toBe(true);
  });

  it('keeps the dry-run readiness check read-only and production-closed', () => {
    const report = buildFrenchRemoteVerifyDryRunReadiness({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(report.summary.firebaseOrServerUploadStarted).toBe(false);
    expect(report.summary.runtimeDownloadsEnabled).toBe(false);
    expect(report.summary.activationApproved).toBe(false);
    expect(report.summary.readyForApply).toBe(false);
    expect(report.safety.productionAppFilesModifiedByThisScript).toBe(false);
    expect(report.safety.firebaseOrServerUploadStarted).toBe(false);
    expect(report.safety.serverObjectsModifiedByThisScript).toBe(false);
    expect(report.safety.productionApplyApproved).toBe(false);
  });

  it('hard-codes no upload/runtime/apply behavior', () => {
    expect(SOURCE).toContain('firebaseOrServerUploadStarted: false');
    expect(SOURCE).toContain('serverObjectsModifiedByThisScript: false');
    expect(SOURCE).toContain('runtimeDownloadsEnabled: false');
    expect(SOURCE).toContain('activationApproved: false');
    expect(SOURCE).toContain('productionApplyApproved: false');
    expect(SOURCE).toContain('No upload, no runtime download enablement, no activation, no app apply.');
  });
});
