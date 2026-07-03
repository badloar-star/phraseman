import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('Gustav master remote verify mapping contract', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'scripts', 'gustav_french_reviewer_master_manifest.ts'),
    'utf8',
  );

  it('reads current remote verify v2 count fields into master summary', () => {
    expect(source).toContain("n(frenchServerObjectRemoteVerifyV2, 'foundObjectCount')");
    expect(source).toContain("n(frenchServerObjectRemoteVerifyV2, 'hashCheckedCount')");
    expect(source).toContain("n(frenchServerObjectRemoteVerifyV2, 'unverifiedObjects')");
    expect(source).toContain('frenchServerObjectRemoteVerifyV2FoundObjects');
    expect(source).toContain('frenchServerObjectRemoteVerifyV2UnverifiedObjects');
  });

  it('treats blocker-only remote verify reports as present evidence', () => {
    expect(source).toContain("n(frenchServerObjectRemoteVerifyV2, 'expectedObjectCount') > 0");
    expect(source).toContain('frenchServerObjectRemoteVerifyV2Blockers > 0');
    expect(source).toContain('frenchServerObjectRemoteVerifyV2Warnings > 0');
  });

  it('maps upload/remote verify parity as a first-class master blocker surface', () => {
    expect(source).toContain("reportSummary(sourceReports, 'french_upload_remote_verify_parity_v2_packet.json')");
    expect(source).toContain("'audits/french_upload_remote_verify_parity_v2_packet.json'");
    expect(source).toContain('frenchUploadRemoteVerifyParityV2ReadyForRemoteObjectVerify');
    expect(source).toContain('frenchUploadRemoteVerifyParityV2MatchedServerPaths');
    expect(source).toContain('frenchUploadRemoteVerifyParityV2ShaMatches');
    expect(source).toContain('frenchUploadRemoteVerifyParityV2ByteMatches');
    expect(source).toContain('french_upload_remote_verify_parity_v2_missing_matched_server_paths');
    expect(source).toContain('french_upload_remote_verify_parity_v2_missing_sha_matches');
    expect(source).toContain('french_upload_remote_verify_parity_v2_missing_byte_matches');
  });

  it('keeps decision import and apply directly blocked until remote verify passes', () => {
    expect(source).toContain('frenchServerObjectRemoteVerifyV2PassedForDecisionImportAndApply');
    expect(source).toContain('remoteVerifyBlocksDecisionImportAndApply');
    expect(source).toContain('frenchServerObjectRemoteVerifyV2FoundObjects === 36');
    expect(source).toContain('frenchServerObjectRemoteVerifyV2HashCheckedObjects === 36');
    expect(source).toContain('frenchServerObjectRemoteVerifyV2MissingObjects === 0');
    expect(source).toContain('frenchServerObjectRemoteVerifyV2HashMismatches === 0');
    expect(source).toContain('frenchServerObjectRemoteVerifyV2FreshAfterProductionManifestGate');
    expect(source).toContain('readyForDecisionImportV2 =');
    expect(source).toContain('frenchServerObjectRemoteVerifyV2PassedForDecisionImportAndApply &&');
  });
});
