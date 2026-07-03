import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Gustav master manifest server publication gate contract', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'scripts', 'gustav_french_reviewer_master_manifest.ts'),
    'utf8',
  );

  it('tracks production manifest publish and remote object verification gates as critical blockers', () => {
    expect(source).toContain('audits/production_server_manifest_publish_gate_v2_packet.json');
    expect(source).toContain('audits/french_server_pack_upload_evidence_v2_packet.json');
    expect(source).toContain('audits/french_server_pack_upload_execution_gate_v2_packet.json');
    expect(source).toContain('audits/french_server_object_remote_verify_v2_packet.json');
    expect(source).toContain("reportSummary(sourceReports, 'production_server_manifest_publish_gate_v2_packet.json')");
    expect(source).toContain("reportSummary(sourceReports, 'french_server_object_remote_verify_v2_packet.json')");
    expect(source).toContain('production_server_manifest_publish_gate_v2_not_ready_for_runtime_download_activation');
    expect(source).toContain('french_server_object_remote_verify_v2_missing_hash_checked_objects');
    expect(source).toContain('frenchServerObjectRemoteVerifyV2HashMismatches');
  });

  it('accepts safe promoted production manifests without looping back to P26', () => {
    const p26Source = fs.readFileSync(
      path.join(ROOT, 'scripts', 'gustav_server_delivery_publish_preflight_v2_packet.ts'),
      'utf8',
    );
    const nextSource = fs.readFileSync(
      path.join(ROOT, 'scripts', 'gustav_next_pass_goal_contract_packet.ts'),
      'utf8',
    );

    expect(p26Source).toContain('safe_production_manifest_promoted');
    expect(p26Source).toContain('productionManifestSafelyPromoted');
    expect(p26Source).toContain('safe_promoted_production_server_manifest_is_accepted');
    expect(p26Source).toContain('unsafe_production_server_manifest_is_rejected');
    expect(source).toContain('productionServerManifestPublishGateV2EvidenceMatchesCurrentDraft');
    expect(source).toContain("serverDeliveryPublishPreflightV2State === 'safe_production_manifest_promoted'");
    expect(nextSource).toContain('productionServerManifestPublishGateV2SafePromotedForP26');
    expect(nextSource).toContain("publishPreflightState') === 'safe_production_manifest_promoted'");
  });
});
