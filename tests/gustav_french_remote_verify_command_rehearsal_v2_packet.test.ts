import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  buildFrenchRemoteVerifyCommandRehearsal,
} from '../scripts/gustav_french_remote_verify_command_rehearsal_v2_packet';

const ROOT = path.resolve(__dirname, '..');
const RUN_DIR = path.join(ROOT, 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'scripts', 'gustav_french_remote_verify_command_rehearsal_v2_packet.ts'),
  'utf8',
);

describe('Gustav French remote verify command rehearsal V2 packet', () => {
  it('is ready to run live verify as soon as a read-only credential is present', () => {
    const report = buildFrenchRemoteVerifyCommandRehearsal({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(report.status).toBe('PASS');
    expect(['ready_waiting_for_read_only_credential', 'credential_present_ready_to_run']).toContain(report.summary.rehearsalState);
    expect(['missing', 'access_token_env', 'service_account_file']).toContain(report.summary.credentialSource);
    expect(report.summary.dryRunReadinessStatus).toBe('PASS');
    expect(report.summary.dryRunPlannedChecks).toBe(36);
    expect(report.summary.dryRunSafeToRunLiveVerify).toBe(true);
    expect(report.summary.readyForLiveRemoteVerifyWhenCredentialPresent).toBe(true);
    expect(report.summary.commandSequenceSteps).toBe(17);
    expect(report.summary.acceptedCredentialOptions).toEqual([
      'PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN',
      'GOOGLE_APPLICATION_CREDENTIALS',
    ]);
    expect(report.commandSequence).toContainEqual(expect.stringContaining('gustav_french_server_object_remote_verify_v2_packet.ts'));
    expect(report.commandSequence).toContainEqual(expect.stringContaining('gustav_french_upload_remote_verify_parity_v2_packet.ts'));
    expect(report.commandSequence).toContainEqual(expect.stringContaining('gustav_french_remote_verify_pass_completion_simulation_v2_packet.ts'));
    expect(report.commandSequence).toContainEqual(expect.stringContaining('gustav_french_post_remote_verify_transition_v2_packet.ts'));
    expect(report.commandSequence).toContainEqual(expect.stringContaining('gustav_final_preapproval_evidence_hash_lock_v2_packet.ts'));
    expect(report.commandSequence).toContainEqual(expect.stringContaining('gustav_production_activation_sequence_preflight_v2_packet.ts'));
    expect(report.commandSequence).toContainEqual(expect.stringContaining('gustav_production_apply_transaction_contract_v2_packet.ts'));
    expect(report.commandSequence).toContainEqual(expect.stringContaining('gustav_post_apply_rollback_guard_contract_v2_packet.ts'));
    expect(report.commandSequence).toContainEqual(expect.stringContaining('gustav_exact_approval_apply_rehearsal_v2_packet.ts'));
    expect(report.commandSequence).toContainEqual(expect.stringContaining('gustav_exact_approval_wait_state_v2_packet.ts'));
    expect(report.commandSequence).toContainEqual(expect.stringContaining('gustav_master_next_pass_consistency_refresh_v2_packet.ts'));
    expect(report.commandSequence).toContainEqual(expect.stringContaining('gustav_next_pass_goal_contract_packet.ts'));
  });

  it('keeps rehearsal secret-safe and production-closed', () => {
    const report = buildFrenchRemoteVerifyCommandRehearsal({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(report.summary.credentialsPrintedByThisScript).toBe(false);
    expect(report.summary.firebaseOrServerUploadStarted).toBe(false);
    expect(report.summary.serverObjectsModifiedByThisScript).toBe(false);
    expect(report.summary.runtimeDownloadsEnabled).toBe(false);
    expect(report.summary.activationApproved).toBe(false);
    expect(report.summary.readyForApply).toBe(false);
    expect(report.safety.productionAppFilesModifiedByThisScript).toBe(false);
    expect(report.safety.firebaseOrServerUploadStarted).toBe(false);
    expect(report.safety.productionApplyApproved).toBe(false);
  });

  it('hard-codes no-secret and no-production-write rules', () => {
    expect(SOURCE).toContain('Do not print, paste, commit or write token/private-key/client-email values');
    expect(SOURCE).toContain('After remote verify PASS, rebuild P49/P50/P45-P48/P51/P65/master/next evidence');
    expect(SOURCE).toContain('No Firebase/server upload from this rehearsal.');
    expect(SOURCE).toContain('No app apply or production file mutation.');
    expect(SOURCE).toContain('credentialsPrintedByThisScript: false');
    expect(SOURCE).toContain('credential_present_ready_to_run');
    expect(SOURCE).toContain('credential_ready_for_remote_verify');
    expect(SOURCE).toContain('firebaseOrServerUploadStarted: false');
    expect(SOURCE).toContain('serverObjectsModifiedByThisScript: false');
    expect(SOURCE).toContain('activationApproved: false');
    expect(SOURCE).toContain('productionApplyApproved: false');
  });
});
