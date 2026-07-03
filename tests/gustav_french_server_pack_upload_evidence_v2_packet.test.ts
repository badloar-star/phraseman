import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildFrenchServerPackUploadEvidence } from '../scripts/gustav_french_server_pack_upload_evidence_v2_packet';

const RUN_DIR = path.join(process.cwd(), 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const SOURCE = fs.readFileSync(
  path.join(process.cwd(), 'scripts/gustav_french_server_pack_upload_evidence_v2_packet.ts'),
  'utf8',
);

describe('Gustav French server pack upload evidence V2 packet', () => {
  it('is evidence-only and cannot upload, activate, or enable downloads', () => {
    expect(SOURCE).toContain('firebaseOrServerUploadStarted: false');
    expect(SOURCE).toContain('runtimeDownloadsEnabled: false');
    expect(SOURCE).toContain('activationApproved: false');
    expect(SOURCE).toContain('upload_evidence_only_no_upload');
  });

  it('builds a 36-object source-scoped upload evidence plan from the production manifest', () => {
    const report = buildFrenchServerPackUploadEvidence({
      repoRoot: process.cwd(),
      runDir: RUN_DIR,
      manifestPath: path.join(RUN_DIR, 'pack_candidates/fr/server_delivery_manifest_v2.json'),
      policyPath: path.join(RUN_DIR, 'audits/server_pack_upload_policy_v2_packet.json'),
    });

    expect(report.status).toBe('PASS');
    expect(report.summary.expectedObjects).toBe(36);
    expect(report.summary.uploadObjects).toBe(36);
    expect(report.summary.localPayloadsPresent).toBe(12);
    expect(report.summary.localPayloadShaMatches).toBe(12);
    expect(report.summary.localPayloadByteMatches).toBe(12);
    expect(report.summary.sourceScopedServerPaths).toBe(36);
    expect(report.summary.deniedUiLocaleRefs).toBe(0);
    expect(report.summary.deniedEnglishPathRefs).toBe(0);
    expect(report.summary.readyForRemoteObjectVerify).toBe(true);
    expect(report.safety.firebaseOrServerUploadStarted).toBe(false);
  });
});
