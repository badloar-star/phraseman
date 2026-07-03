import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const RUN_DIR = path.join(ROOT, 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const REPORT_PATH = path.join(RUN_DIR, 'audits/french_runtime_content_integrity_audit.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts/gustav_french_runtime_content_integrity_audit.ts');
const MASTER_SCRIPT_PATH = path.join(ROOT, 'scripts/gustav_french_reviewer_master_manifest.ts');
const MASTER_PATH = path.join(RUN_DIR, 'generated/fr/reviewer/french_reviewer_master_manifest.json');

describe('Gustav French runtime content integrity audit', () => {
  it('blocks placeholders and mojibake from French runtime/reviewer content without opening production', () => {
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
    const source = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(report.status).toBe('PASS');
    expect(report.summary.runtimePayloadFiles).toBe(12);
    expect(report.summary.filesScanned).toBeGreaterThanOrEqual(12);
    expect(report.summary.textFieldsScanned).toBeGreaterThan(0);
    expect(report.summary.placeholderTextFields).toBe(0);
    expect(report.summary.mojibakeFields).toBe(0);
    expect(report.summary.replacementCharFields).toBe(0);
    expect(report.summary.runtimePayloadMojibakeFields).toBe(0);
    expect(report.summary.blockers).toBe(0);
    expect(report.summary.activationApproved).toBe(false);
    expect(report.summary.readyForApply).toBe(false);
    expect(report.summary.mayModifyProductionAppFiles).toBe(false);
    expect(report.safety.productionAppFilesModifiedByThisScript).toBe(false);
    expect(report.safety.serverManifestPublishedByThisScript).toBe(false);
    expect(report.safety.firebaseOrServerUploadStarted).toBe(false);
    expect(report.safety.runtimeDownloadsEnabled).toBe(false);

    expect(source).toContain('MOJIBAKE_RE');
    expect(source).toContain('PLACEHOLDER_TEXT_RE');
    expect(source).toContain('runtime_payload');
    expect(source).toContain('placeholder_text_field');
    expect(source).toContain('mojibake_text_field');
  });

  it('is wired into the master manifest as a required readiness blocker', () => {
    const masterSource = fs.readFileSync(MASTER_SCRIPT_PATH, 'utf8');
    const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));

    expect(masterSource).toContain('french_runtime_content_integrity_audit.json');
    expect(masterSource).toContain('runtime_content_integrity_blockers');
    expect(masterSource).toContain('runtime_content_integrity_placeholder_text_fields');
    expect(masterSource).toContain('runtime_content_integrity_mojibake_fields');
    expect(masterSource).toContain('runtime_content_integrity_missing_runtime_payload_files');
    expect(master.summary.runtimeContentIntegrityBlockers).toBe(0);
    expect(master.summary.runtimeContentIntegrityPlaceholderTextFields).toBe(0);
    expect(master.summary.runtimeContentIntegrityMojibakeFields).toBe(0);
    expect(master.summary.runtimeContentIntegrityReplacementCharFields).toBe(0);
    expect(master.summary.runtimeContentIntegrityRuntimePayloadFiles).toBe(12);
  });
});
