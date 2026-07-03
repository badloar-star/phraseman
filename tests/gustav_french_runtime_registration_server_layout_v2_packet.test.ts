import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildFrenchRuntimeRegistrationServerLayout } from '../scripts/gustav_french_runtime_registration_server_layout_v2_packet';

const ROOT = path.resolve(__dirname, '..');
const RUN_DIR = path.join(ROOT, 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'scripts', 'gustav_french_runtime_registration_server_layout_v2_packet.ts'),
  'utf8',
);

describe('Gustav French runtime registration/server layout V2 packet', () => {
  it('passes when upload evidence covers every runtime-required manifest, index and payload object', () => {
    const report = buildFrenchRuntimeRegistrationServerLayout({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(report.status).toBe('PASS');
    expect(report.summary.plannedRuntimeSlices).toBe(12);
    expect(report.summary.runtimeRegistrationPrefixes).toBe(12);
    expect(report.summary.requiredServerObjects).toBe(36);
    expect(report.summary.uploadEvidenceObjects).toBe(36);
    expect(report.summary.requiredObjectsPresentInUploadEvidence).toBe(36);
    expect(report.summary.missingUploadEvidenceObjects).toBe(0);
    expect(report.summary.runtimeValidManifests).toBe(12);
    expect(report.summary.manifestsWithRelativeEntryIndex).toBe(12);
    expect(report.summary.remoteLoaderCachePathSanitized).toBe(true);
    expect(report.summary.activationApproved).toBe(false);
    expect(report.summary.runtimeDownloadsEnabled).toBe(false);
    expect(report.summary.readyForApply).toBe(false);
    expect(report.findings.map((finding) => finding.code)).not.toContain('upload_evidence_missing_runtime_required_objects');
  });

  it('maps the exact object roles that runtime registration will need', () => {
    const report = buildFrenchRuntimeRegistrationServerLayout({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });
    const roles = new Set(report.requiredObjects.map((objectRef) => objectRef.role));
    const missingRoles = new Set(
      report.requiredObjects
        .filter((objectRef) => !objectRef.presentInUploadEvidence)
        .map((objectRef) => objectRef.role),
    );

    expect(roles).toEqual(new Set(['manifest', 'entry_index', 'payload']));
    expect(missingRoles).toEqual(new Set());
    expect(report.requiredObjects.every((objectRef) => objectRef.presentLocally)).toBe(true);
    expect(report.requiredObjects.filter((objectRef) => objectRef.role === 'payload').every((objectRef) => objectRef.presentInUploadEvidence)).toBe(true);
  });

  it('keeps the gate tied to runtime registration and closed production flags', () => {
    expect(SOURCE).toContain('french_target_remote_registration.ts');
    expect(SOURCE).toContain('course_pack_remote_loader.ts');
    expect(SOURCE).toContain('remote_loader_cache_path_unsanitized');
    expect(SOURCE).toContain('remoteLoaderCachePathSanitized');
    expect(SOURCE).toContain('manifest.json');
    expect(SOURCE).toContain('index.json');
    expect(SOURCE).toContain('productionAppFilesModifiedByThisScript: false');
    expect(SOURCE).toContain('firebaseOrServerUploadStarted: false');
    expect(SOURCE).toContain('runtimeDownloadsEnabled: false');
    expect(SOURCE).toContain('productionApplyApproved: false');
  });
});
