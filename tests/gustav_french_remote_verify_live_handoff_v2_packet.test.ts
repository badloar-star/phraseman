import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildFrenchRemoteVerifyLiveHandoff } from '../scripts/gustav_french_remote_verify_live_handoff_v2_packet';

const ROOT = path.resolve(__dirname, '..');
const RUN_DIR = path.join(ROOT, 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'scripts', 'gustav_french_remote_verify_live_handoff_v2_packet.ts'),
  'utf8',
);

describe('Gustav French remote verify live handoff V2 packet', () => {
  it('prepares a read-only live runbook while waiting for credentials', () => {
    const report = buildFrenchRemoteVerifyLiveHandoff({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
      credentialSource: 'missing',
    });

    expect(report.status).toBe('PASS');
    expect(report.summary.handoffState).toBe('ready_waiting_for_read_only_credential');
    expect(report.summary.credentialSource).toBe('missing');
    expect(report.summary.acceptedCredentialOptions).toEqual([
      'PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN',
      'GOOGLE_APPLICATION_CREDENTIALS',
    ]);
    expect(report.summary.uploadEvidenceReady).toBe(true);
    expect(report.summary.dryRunReady).toBe(true);
    expect(report.summary.uploadRemoteVerifyParityReady).toBe(true);
    expect(report.summary.commandRehearsalReady).toBe(true);
    expect(report.summary.expectedRemoteObjects).toBe(36);
    expect(report.summary.expectedHashChecks).toBe(36);
    expect(report.summary.liveVerifyCommandReady).toBe(true);
    expect(report.summary.postVerifyChainReady).toBe(true);
    expect(report.summary.activationApproved).toBe(false);
    expect(report.summary.runtimeDownloadsEnabled).toBe(false);
    expect(report.summary.readyForApply).toBe(false);
    expect(report.findings).toEqual([]);
  });

  it('switches to ready-to-run when an accepted credential source is present', () => {
    const report = buildFrenchRemoteVerifyLiveHandoff({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
      credentialSource: 'service_account_file',
    });

    expect(report.status).toBe('PASS');
    expect(report.summary.handoffState).toBe('credential_present_ready_to_run');
    expect(report.summary.credentialSource).toBe('service_account_file');
    expect(report.liveRunbook.remoteObjectVerify).toContain('gustav_french_server_object_remote_verify_v2_packet.ts');
    expect(report.liveRunbook.passCompletionSimulation).toContain('gustav_french_remote_verify_pass_completion_simulation_v2_packet.ts');
    expect(report.liveRunbook.completionAudit).toContain('gustav_production_readiness_completion_audit_v2_packet.ts');
    expect(report.liveRunbook.postRemoteVerifyTransition).toContain('gustav_french_post_remote_verify_transition_v2_packet.ts');
    expect(report.liveRunbook.finalBlockerMap).toContain('gustav_french_final_blocker_dependency_map_v2_packet.ts');
    expect(report.liveRunbook.finalPreapprovalHashLock).toContain('gustav_final_preapproval_evidence_hash_lock_v2_packet.ts');
    expect(report.liveRunbook.activationSequencePreflight).toContain('gustav_production_activation_sequence_preflight_v2_packet.ts');
    expect(report.liveRunbook.applyTransactionContract).toContain('gustav_production_apply_transaction_contract_v2_packet.ts');
    expect(report.liveRunbook.postApplyRollbackGuard).toContain('gustav_post_apply_rollback_guard_contract_v2_packet.ts');
    expect(report.liveRunbook.exactApprovalApplyRehearsal).toContain('gustav_exact_approval_apply_rehearsal_v2_packet.ts');
    expect(report.liveRunbook.exactApprovalWaitState).toContain('gustav_exact_approval_wait_state_v2_packet.ts');
    expect(report.liveRunbook.masterNextPassConsistency).toContain('gustav_master_next_pass_consistency_refresh_v2_packet.ts');
    expect(report.liveRunbook.nextPassContract).toContain('gustav_next_pass_goal_contract_packet.ts');
  });

  it('blocks ambiguous live handoff when both credential sources are present', () => {
    const report = buildFrenchRemoteVerifyLiveHandoff({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
      credentialSource: 'missing',
      multipleCredentialSourcesPresent: true,
    });

    expect(report.status).toBe('BLOCK');
    expect(report.summary.handoffState).toBe('blocked_by_findings');
    expect(report.summary.credentialSource).toBe('missing');
    expect(report.summary.multipleCredentialSourcesPresent).toBe(true);
    expect(report.findings.some((finding) => finding.code === 'remote_verify_multiple_credential_sources')).toBe(true);
    expect(report.summary.activationApproved).toBe(false);
    expect(report.summary.runtimeDownloadsEnabled).toBe(false);
    expect(report.summary.readyForApply).toBe(false);
  });

  it('keeps secrets and production writes out of the handoff source', () => {
    expect(SOURCE).toContain('credentialsPrintedByThisScript: false');
    expect(SOURCE).toContain('firebaseOrServerUploadStarted: false');
    expect(SOURCE).toContain('serverObjectsModifiedByThisScript: false');
    expect(SOURCE).toContain('runtimeDownloadsEnabledByThisScript: false');
    expect(SOURCE).toContain('productionApplyApproved: false');
    expect(SOURCE).toContain('Do not print token/private-key contents.');
    expect(SOURCE).toContain('Do not run upload execution with real write sentinel.');
    expect(SOURCE).toContain('multipleCredentialSourcesPresent');
    expect(SOURCE).toContain('remote_verify_multiple_credential_sources');
    expect(SOURCE).toContain('remoteObjectVerify.unexpectedObjects=0');
    expect(SOURCE).toContain('P45/P46/P47/P51/P65 rehearsal packets are rebuilt after remote verify before any exact approval/apply');
    expect(SOURCE).not.toContain('PHRASEMAN_FRENCH_SERVER_PACK_ACCESS_TOKEN}');
  });
});
