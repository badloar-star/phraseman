import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('Gustav next-pass remote server verification priority contract', () => {
  const scriptPath = path.join(ROOT, 'scripts', 'gustav_next_pass_goal_contract_packet.ts');
  const source = fs.readFileSync(scriptPath, 'utf8');

  it('routes to remote server object verification before approval/hash-lock gates', () => {
    expect(source).toContain("id: 'NEXT-PASS-REMOTE-SERVER-OBJECT-VERIFY-V2'");
    expect(source).toContain('!productionServerManifestPublishGateReady');
    expect(source).toContain('!frenchServerPackUploadEvidenceReady');
    expect(source).toContain('!frenchServerPackUploadExecutionGateReady');
    expect(source).toContain('!frenchServerObjectRemoteVerifyReady');
    expect(source.indexOf('remoteServerObjectVerificationGoals();')).toBeLessThan(source.indexOf('p29Goals();'));
  });

  it('requires 36 remote objects and 36 hash checks with no upload execution', () => {
    expect(source).toContain('PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN or GOOGLE_APPLICATION_CREDENTIALS');
    expect(source).toContain('gustav_french_server_remote_credential_handoff_v2_packet.ts');
    expect(source).toContain('audits/french_server_remote_credential_handoff_v2_packet.json');
    expect(source).toContain('gustav_french_remote_verify_dry_run_readiness_v2_packet.ts');
    expect(source).toContain('audits/french_remote_verify_dry_run_readiness_v2_packet.json');
    expect(source).toContain('safeToRunLiveVerifyWhenCredentialPresent=true');
    expect(source).toContain('gustav_french_upload_remote_verify_parity_v2_packet.ts');
    expect(source).toContain('audits/french_upload_remote_verify_parity_v2_packet.json');
    expect(source).toContain('matchedServerPaths=36');
    expect(source).toContain('shaMatches=36');
    expect(source).toContain('byteMatches=36');
    expect(source).toContain('gustav_french_remote_verify_command_rehearsal_v2_packet.ts');
    expect(source).toContain('audits/french_remote_verify_command_rehearsal_v2_packet.json');
    expect(source).toContain('readyForLiveRemoteVerifyWhenCredentialPresent=true');
    expect(source).toContain('gustav_french_remote_verify_live_handoff_v2_packet.ts');
    expect(source).toContain('audits/french_remote_verify_live_handoff_v2_packet.json');
    expect(source).toContain('liveVerifyCommandReady=true');
    expect(source).toContain('postVerifyChainReady=true');
    expect(source).toContain('gustav_french_remote_verify_pass_completion_simulation_v2_packet.ts');
    expect(source).toContain('audits/french_remote_verify_pass_completion_simulation_v2_packet.json');
    expect(source).toContain('simulatedRequirementsMissing=0');
    expect(source).toContain('simulatedRequirementsProductionLocked=5');
    expect(source).toContain('simulatedNextGate=exact_approval_artifacts');
    expect(source).toContain('gustav_french_post_remote_verify_transition_v2_packet.ts');
    expect(source).toContain('audits/french_post_remote_verify_transition_v2_packet.json');
    expect(source).toContain('afterRemoteVerifyExpectedMissing=0');
    expect(source).toContain('afterRemoteVerifyNextGate=exact_approval_artifacts');
    expect(source).toContain('gustav_french_app_surface_parity_v2_packet.ts');
    expect(source).toContain('audits/french_app_surface_parity_v2_packet.json');
    expect(source).toContain('challenge/mistake-practice surfaces covered by navigation/state guards');
    expect(source).toContain('gustav_french_final_blocker_dependency_map_v2_packet.ts');
    expect(source).toContain('audits/french_final_blocker_dependency_map_v2_packet.json');
    expect(source).toContain('credentialSource=access_token_env or credentialSource=service_account_file');
    expect(source).toContain("n(frenchServerPackUploadEvidenceV2Summary, 'uploadObjects') === 36");
    expect(source).toContain('!frenchServerPackUploadExecutionGateV2DryRun');
    expect(source).toContain("n(frenchServerPackUploadExecutionGateV2Summary, 'uploadObjects') === 36");
    expect(source).toContain("n(frenchServerPackUploadExecutionGateV2Summary, 'uploadAttempts') > 0");
    expect(source).toContain('!frenchServerPackUploadExecutionGateV2UploadStarted');
    expect(source).toContain('plannedChecks=36');
    expect(source).toContain('scopedServerPaths=36');
    expect(source).toContain('matches=36/36');
    expect(source).toContain('expectedRemoteObjects=36');
    expect(source).toContain('expectedHashChecks=36');
    expect(source).toContain('foundObjects=36');
    expect(source).toContain('hashCheckedObjects=36');
    expect(source).toContain('frenchServerObjectRemoteVerifyV2FoundObjects === 36');
    expect(source).toContain('frenchServerObjectRemoteVerifyV2HashChecked === 36');
    expect(source).toContain('frenchServerObjectRemoteVerifyV2UnexpectedObjects === 0');
    expect(source).toContain("n(frenchServerObjectRemoteVerifyV2Summary, 'unverifiedObjects')");
    expect(source).toContain('French server object remote verification must prove 36/36 found and 36/36 hash-checked');
  });

  it('normalizes expected remote-verify HOLD reasons without hiding real warnings', () => {
    expect(source).toContain('EXPECTED_REMOTE_VERIFY_HOLD_CODES');
    expect(source).toContain("'french_server_object_remote_verify_v2_not_ready'");
    expect(source).toContain("'explicit_approval_receipt_creation_gate_v2_not_safe_hold_ready'");
    expect(source).toContain("'production_activation_hold_exact_approval_required_v2_not_ready'");
    expect(source).toContain("'approval_wait_safe_continuation_v2_not_ready'");
    expect(source).toContain("'exact_approval_p45_sequence_command_preflight_v2_not_ready'");
    expect(source).toContain("'ordered_approval_wait_refresh_v2_not_ready'");
    expect(source).toContain("goal.id === 'NEXT-PASS-REMOTE-SERVER-OBJECT-VERIFY-V2'");
    expect(source).toContain('frenchServerPackUploadExecutionGateV2DryRun');
    expect(source).toContain('!frenchServerPackUploadExecutionGateV2UploadStarted');
    expect(source).toContain('expectedHoldWarningsSuppressed');
    expect(source).toContain('expectedHoldReasonCodes');
    expect(source).toContain("severity: 'info'");
    expect(source).toContain("warnings > 0 || expectedHoldWarningsSuppressed > 0) ? 'HOLD'");
  });
});
