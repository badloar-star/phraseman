import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('Gustav master manifest remote credential handoff source contract', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'scripts', 'gustav_french_reviewer_master_manifest.ts'),
    'utf8',
  );

  it('keeps the remote credential handoff in the critical report chain before remote object verify', () => {
    const handoff = "'audits/french_server_remote_credential_handoff_v2_packet.json'";
    const remoteVerify = "'audits/french_server_object_remote_verify_v2_packet.json'";
    expect(source).toContain(handoff);
    expect(source.indexOf(handoff)).toBeLessThan(source.indexOf(remoteVerify));
    expect(source).toContain("'audits/french_remote_verify_dry_run_readiness_v2_packet.json'");
    expect(source).toContain("'audits/french_remote_verify_command_rehearsal_v2_packet.json'");
    expect(source).toContain("'audits/french_remote_verify_live_handoff_v2_packet.json'");
    expect(source.indexOf("'audits/french_remote_verify_live_handoff_v2_packet.json'")).toBeLessThan(source.indexOf(remoteVerify));
    expect(source).toContain("'audits/french_post_remote_verify_transition_v2_packet.json'");
    expect(source.indexOf("'audits/french_post_remote_verify_transition_v2_packet.json'")).toBeLessThan(source.indexOf(remoteVerify));
    expect(source).toContain("'audits/french_app_surface_parity_v2_packet.json'");
    expect(source).toContain("'audits/french_final_blocker_dependency_map_v2_packet.json'");
  });

  it('surfaces remote credential handoff state in the master summary', () => {
    expect(source).toContain('frenchServerRemoteCredentialHandoffV2Present');
    expect(source).toContain('frenchServerRemoteCredentialHandoffV2Status');
    expect(source).toContain('frenchServerRemoteCredentialHandoffV2State');
    expect(source).toContain('frenchServerRemoteCredentialHandoffV2CredentialSource');
    expect(source).toContain('frenchServerRemoteCredentialHandoffV2RemoteVerifyBlockedByCredentials');
    expect(source).toContain('frenchServerRemoteCredentialHandoffV2CredentialsPrinted');
    expect(source).toContain('frenchServerRemoteCredentialHandoffV2UploadStarted');
    expect(source).toContain('frenchServerRemoteCredentialHandoffV2ActivationApproved');
    expect(source).toContain('frenchServerRemoteCredentialHandoffV2ReadyForApply');
  });
});
