import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildFrenchServerPackUploadExecutionGate } from '../scripts/gustav_french_server_pack_upload_execution_gate_v2_packet';

const RUN_DIR = path.join(process.cwd(), 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const SOURCE = fs.readFileSync(
  path.join(process.cwd(), 'scripts/gustav_french_server_pack_upload_execution_gate_v2_packet.ts'),
  'utf8',
);

describe('Gustav French server pack upload execution gate V2 packet', () => {
  it('defaults to dry-run and keeps upload/download/activation closed', async () => {
    const fetchMock = jest.fn();
    const report = await buildFrenchServerPackUploadExecutionGate({
      repoRoot: process.cwd(),
      runDir: RUN_DIR,
      uploadEvidencePath: path.join(RUN_DIR, 'audits/french_server_pack_upload_evidence_v2_packet.json'),
      bucket: 'example-bucket',
      accessToken: '',
      execute: false,
      allowUploadEnv: '',
    }, fetchMock as any);

    expect(report.status).toBe('PASS');
    expect(report.summary.dryRun).toBe(true);
    expect(report.summary.plannedUploadObjects).toBe(36);
    expect(report.summary.uploadAttempts).toBe(0);
    expect(report.summary.uploadSucceeded).toBe(0);
    expect(report.safety.firebaseOrServerUploadStarted).toBe(false);
    expect(report.summary.runtimeDownloadsEnabled).toBe(false);
    expect(report.summary.activationApproved).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks execute mode without the exact upload sentinel', async () => {
    const fetchMock = jest.fn();
    const report = await buildFrenchServerPackUploadExecutionGate({
      repoRoot: process.cwd(),
      runDir: RUN_DIR,
      uploadEvidencePath: path.join(RUN_DIR, 'audits/french_server_pack_upload_evidence_v2_packet.json'),
      bucket: 'example-bucket',
      accessToken: 'token',
      execute: true,
      allowUploadEnv: '',
    }, fetchMock as any);

    expect(report.status).toBe('BLOCK');
    expect(report.safety.firebaseOrServerUploadStarted).toBe(false);
    expect(report.findings.some((finding) => finding.code === 'explicit_upload_env_missing')).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('contains the upload sentinel and no default execution flag', () => {
    expect(SOURCE).toContain('I_UNDERSTAND_THIS_UPLOADS_FRENCH_PACKS_ONLY');
    expect(SOURCE).toContain('--execute-upload');
    expect(SOURCE).toContain('firebaseOrServerUploadStarted: canExecute');
    expect(SOURCE).toContain('runtimeDownloadsEnabled: false');
    expect(SOURCE).toContain('activationApproved: false');
  });
});
