import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Gustav exact approval P47 rollback guard command preflight remote verify contract', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'scripts', 'gustav_exact_approval_p47_rollback_guard_command_preflight_v2_packet.ts'),
    'utf8',
  );

  it('requires P47 publish/upload/remote verification before rollback guard command can be allowed', () => {
    expect(source).toContain('p47ProductionServerManifestPublishGateReady: boolean');
    expect(source).toContain('p47FrenchServerPackUploadEvidenceReady: boolean');
    expect(source).toContain('p47FrenchServerPackUploadExecutionGateReady: boolean');
    expect(source).toContain('p47FrenchServerObjectRemoteVerifyHashChecked: number');
    expect(source).toContain('input.p47FrenchServerObjectRemoteVerifyFound === 36');
    expect(source).toContain('input.p47FrenchServerObjectRemoteVerifyHashChecked === 36');
    expect(source).toContain('P47 must prove runtime cache rollback, server manifest, upload evidence, remote object verification');
  });

  it('keeps probes for P47 remote verify and upload execution regressions', () => {
    expect(source).toContain('makeProbeDependenciesReady');
    expect(source).toContain('p47_remote_verify_hash_gap_rejected');
    expect(source).toContain('p47_upload_execution_started_rejected');
    expect(source).toContain('p47FrenchServerObjectRemoteVerifyHashChecked = 35');
    expect(source).toContain('p47FrenchServerPackUploadExecutionStarted = true');
  });
});
