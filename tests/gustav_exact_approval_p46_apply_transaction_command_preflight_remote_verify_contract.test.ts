import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Gustav exact approval P46 apply transaction command preflight remote verify contract', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'scripts', 'gustav_exact_approval_p46_apply_transaction_command_preflight_v2_packet.ts'),
    'utf8',
  );

  it('requires P46 publish/upload/remote verification before apply transaction command can be allowed', () => {
    expect(source).toContain('p46ProductionServerManifestPublishGateReady: boolean');
    expect(source).toContain('p46FrenchServerPackUploadEvidenceReady: boolean');
    expect(source).toContain('p46FrenchServerPackUploadExecutionGateReady: boolean');
    expect(source).toContain('p46FrenchServerObjectRemoteVerifyHashChecked: number');
    expect(source).toContain('input.p46FrenchServerObjectRemoteVerifyFound === 36');
    expect(source).toContain('input.p46FrenchServerObjectRemoteVerifyHashChecked === 36');
    expect(source).toContain('P46 must prove 12 server entries, payload/index/manifest hashes, upload evidence, remote object verification');
  });

  it('keeps probes for P46 remote verify and upload execution regressions', () => {
    expect(source).toContain('makeProbeDependenciesReady');
    expect(source).toContain('p46_remote_verify_hash_gap_rejected');
    expect(source).toContain('p46_upload_execution_started_rejected');
    expect(source).toContain('p46FrenchServerObjectRemoteVerifyHashChecked = 35');
    expect(source).toContain('p46FrenchServerPackUploadExecutionStarted = true');
  });
});
