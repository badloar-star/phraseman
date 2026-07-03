import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Gustav production activation sequence preflight contract', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'scripts', 'gustav_production_activation_sequence_preflight_v2_packet.ts'),
    'utf8',
  );

  it('requires publish and remote object gates before P45 can sequence French activation', () => {
    expect(source).toContain('productionServerManifestPublishGateStatus: string');
    expect(source).toContain('frenchServerPackUploadEvidenceStatus: string');
    expect(source).toContain('frenchServerPackUploadExecutionGateDryRun: boolean');
    expect(source).toContain('frenchServerObjectRemoteVerifyHashChecked: number');
    expect(source).toContain('PRODUCTION_SERVER_MANIFEST_PUBLISH_GATE_NOT_READY');
    expect(source).toContain('FRENCH_SERVER_PACK_UPLOAD_EVIDENCE_NOT_READY');
    expect(source).toContain('FRENCH_SERVER_PACK_UPLOAD_EXECUTION_GATE_NOT_READY');
    expect(source).toContain('FRENCH_SERVER_OBJECT_REMOTE_VERIFY_NOT_READY');
    expect(source).toContain('production_server_manifest_publish_gate_v2_packet.json');
    expect(source).toContain('french_server_pack_upload_evidence_v2_packet.json');
    expect(source).toContain('french_server_pack_upload_execution_gate_v2_packet.json');
    expect(source).toContain('french_server_object_remote_verify_v2_packet.json');
    expect(source).toContain('Production server manifest publish gate must PASS');
    expect(source).toContain('French upload evidence and guarded upload execution gate must PASS');
    expect(source).toContain('French server object remote verify must PASS with 36/36');
    expect(source).toContain('production_server_manifest_publish_gate_hold_rejected');
    expect(source).toContain('french_server_pack_upload_evidence_gap_rejected');
    expect(source).toContain('french_server_pack_upload_execution_started_rejected');
    expect(source).toContain('french_server_object_remote_verify_missing_hash_rejected');
  });
});
