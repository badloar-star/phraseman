import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Gustav production apply transaction contract V2 packet', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'scripts', 'gustav_production_apply_transaction_contract_v2_packet.ts'),
    'utf8',
  );

  it('requires server publish, upload evidence, upload execution dry-run and remote verify before P46 can become apply-ready', () => {
    expect(source).toContain('serverManifestPublishGateStatus: string');
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
  });

  it('keeps fixture probes for accidental upload and missing remote hash verification', () => {
    expect(source).toContain('makeProbeDependenciesReady');
    expect(source).toContain('server_manifest_publish_gate_gap_rejected');
    expect(source).toContain('upload_evidence_gap_rejected');
    expect(source).toContain('upload_execution_started_rejected');
    expect(source).toContain('remote_verify_hash_gap_rejected');
    expect(source).toContain('frenchServerPackUploadExecutionStarted = true');
    expect(source).toContain('frenchServerObjectRemoteVerifyHashChecked = 35');
  });
});
