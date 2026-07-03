import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const REPORT_PATH = path.join(
  ROOT,
  'docs',
  'gustav',
  'runs',
  '2026-05-19_fr_inventory_v0a1',
  'audits',
  'runtime_download_activation_gate_v2.json',
);
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_runtime_download_activation_gate_v2_packet.ts');

describe('Gustav runtime download activation gate V2 packet', () => {
  it('accepts the approved French production target transition while keeping legacy runtime downloads closed', () => {
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
    const scriptSource = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(report.summary.productionStudyTargetFrEnabled).toBe(true);
    expect(report.summary.productionServerManifestExists).toBe(true);
    expect(report.summary.productionManifestSafelyPromoted).toBe(true);
    expect(report.summary.runtimeDownloadsEnabled).toBe(false);
    expect(report.summary.activationApproved).toBe(false);
    expect(report.summary.readyForApply).toBe(false);
    expect(report.summary.runtimeDownloadActivationGateReady).toBe(true);
    expect(report.summary.blockers).toBe(0);
    expect(report.findings.some((finding: any) => finding.code === 'production_server_manifest_exists_without_publish_gate')).toBe(false);
    expect(report.findings.some((finding: any) => finding.code === 'production_study_target_fr_opened_without_approval')).toBe(false);
    expect(scriptSource).toContain('production_study_target_stale_fr_repair_test_missing');
    expect(scriptSource).toContain('productionStudyTargetFrenchPersistTested');
    expect(scriptSource).toContain('production_server_manifest_exists_without_publish_gate');
    expect(scriptSource).toContain('AsyncStorage\\.setItem\\(STUDY_TARGET_STORAGE_KEY');
  });
});
