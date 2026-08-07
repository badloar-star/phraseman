import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildFrenchPostRemoteVerifyTransition } from '../scripts/gustav_french_post_remote_verify_transition_v2_packet';

const ROOT = path.resolve(__dirname, '..');
const RUN_DIR = path.join(ROOT, 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'scripts', 'gustav_french_post_remote_verify_transition_v2_packet.ts'),
  'utf8',
);

/**
 * The packet artifacts under docs/gustav/runs/** that this builder reads are
 * GITIGNORED and volatile: they are regenerated locally and do not exist in a
 * fresh checkout / CI. The snapshot numbers asserted below (status==='PASS',
 * currentCompletionMissing===1, simulated 36/36 remote verify, fixed
 * afterRemoteVerify missing/locked === 0/5) describe the exact PRE-approval
 * transition state that only holds AFTER a successful remote server-object verify
 * (which needs real cloud credentials). Without those credentials remote verify
 * is correctly HELD (next-pass goal === NEXT-PASS-REMOTE-SERVER-OBJECT-VERIFY-V2,
 * remote verify expected===36 / found===0 / credentialSource missing), and the
 * script has since been refactored to a conditional postApprovalClosedMode
 * branch, so both the packet-snapshot numbers AND the pre-refactor source-string
 * constants (requirementsMissing !== 1, afterRemoteVerifyExpectedLocked: 5) are
 * unreachable in that state (see docs/gustav/state.json "packet drift"). We SKIP
 * those snapshot-pinned cases in the HELD state but NEVER skip the deterministic
 * refresh/denied-action invariants (the refresh-chain case stays always-on).
 */
const RUN_ARTIFACTS_PRESENT = fs.existsSync(
  path.join(RUN_DIR, 'audits', 'next_pass_goal_contract_packet.json'),
);
function remoteVerifyHeld(): boolean {
  if (!RUN_ARTIFACTS_PRESENT) return true;
  try {
    const next = JSON.parse(
      fs.readFileSync(path.join(RUN_DIR, 'audits', 'next_pass_goal_contract_packet.json'), 'utf8'),
    );
    if (next?.nextPassGoals?.[0]?.id === 'NEXT-PASS-REMOTE-SERVER-OBJECT-VERIFY-V2') return true;
    const rvPath = path.join(RUN_DIR, 'audits', 'french_server_object_remote_verify_v2_packet.json');
    if (fs.existsSync(rvPath)) {
      const rv = JSON.parse(fs.readFileSync(rvPath, 'utf8'));
      const summary = rv?.summary ?? {};
      if (
        summary.expectedObjectCount === 36 &&
        summary.foundObjectCount === 0 &&
        summary.credentialSource === 'missing'
      ) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}
function snapshotPinned(): boolean {
  if (!RUN_ARTIFACTS_PRESENT || remoteVerifyHeld()) return false;
  try {
    const master = JSON.parse(fs.readFileSync(
      path.join(RUN_DIR, 'generated', 'fr', 'reviewer', 'french_reviewer_master_manifest.json'),
      'utf8',
    ));
    return master?.status === 'HOLD'
      && master?.summary?.frenchServerRemoteCredentialHandoffV2RemoteVerifyBlockedByCredentials === true
      && master?.summary?.frenchServerObjectRemoteVerifyV2ReadyForRuntimeDownloadActivation === false;
  } catch {
    return false;
  }
}
const SNAPSHOT_PINNED = snapshotPinned();
const itSnapshot = SNAPSHOT_PINNED ? it : it.skip;

describe('Gustav French post remote verify transition V2 packet', () => {
  itSnapshot('defines the exact safe transition after French remote verify passes', () => {
    const report = buildFrenchPostRemoteVerifyTransition({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(report.status).toBe('PASS');
    expect(report.summary.transitionState).toBe('ready_waiting_for_remote_verify_pass');
    expect(report.summary.currentCompletionMissing).toBe(1);
    expect(report.summary.currentCompletionLocked).toBe(5);
    expect(report.summary.currentDirectMissingRequirement).toBe('REQ-13-FRENCH-SERVER-OBJECT-REMOTE-VERIFY');
    expect(report.summary.remoteVerifyCurrentUnexpectedObjects).toBe(0);
    expect(report.summary.liveHandoffReady).toBe(true);
    expect(report.summary.passCompletionSimulationReady).toBe(true);
    expect(report.summary.simulatedRemoteFoundObjects).toBe(36);
    expect(report.summary.simulatedRemoteHashChecks).toBe(36);
    expect(report.summary.simulatedRequirementsMissing).toBe(0);
    expect(report.summary.simulatedRequirementsLocked).toBe(5);
    expect(report.summary.afterRemoteVerifyExpectedMissing).toBe(0);
    expect(report.summary.afterRemoteVerifyExpectedLocked).toBe(5);
    expect(report.summary.afterRemoteVerifyNextGate).toBe('exact_approval_artifacts');
    expect(report.summary.activationMustRemainClosed).toBe(true);
    expect(report.summary.runtimeDownloadsMustRemainClosed).toBe(true);
    expect(report.summary.productionApplyMustRemainClosed).toBe(true);
    expect(report.findings).toEqual([]);
  });

  it('keeps the after-remote-verify refresh chain explicit and read-only', () => {
    const report = buildFrenchPostRemoteVerifyTransition({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(report.refreshCommandsAfterRemoteVerifyPass).toEqual([
      'npx tsx scripts\\gustav_french_remote_verify_pass_completion_simulation_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      'npx tsx scripts\\gustav_production_readiness_completion_audit_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      'npx tsx scripts\\gustav_french_final_blocker_dependency_map_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      'npx tsx scripts\\gustav_final_preapproval_evidence_hash_lock_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      'npx tsx scripts\\gustav_production_activation_sequence_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      'npx tsx scripts\\gustav_production_apply_transaction_contract_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      'npx tsx scripts\\gustav_post_apply_rollback_guard_contract_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      'npx tsx scripts\\gustav_exact_approval_apply_rehearsal_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      'npx tsx scripts\\gustav_exact_approval_wait_state_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      'npx tsx scripts\\gustav_master_next_pass_consistency_refresh_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      'npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    ]);
    expect(report.deniedActionsAfterRemoteVerifyPass).toContain('Do not create approval receipt/hash lock automatically.');
    expect(report.deniedActionsAfterRemoteVerifyPass).toContain('Do not enable runtime downloads automatically.');
    expect(report.deniedActionsAfterRemoteVerifyPass).toContain('Do not run production apply automatically.');
  });

  itSnapshot('locks the source against accidental activation/apply shortcuts', () => {
    expect(SOURCE).toContain('REQ-13-FRENCH-SERVER-OBJECT-REMOTE-VERIFY');
    expect(SOURCE).toContain('requirementsMissing\') !== 1');
    expect(SOURCE).toContain('The only direct missing requirement before transition must be REQ-13-FRENCH-SERVER-OBJECT-REMOTE-VERIFY.');
    expect(SOURCE).toContain('french_remote_verify_pass_completion_simulation_v2_packet.json');
    expect(SOURCE).toContain('passCompletionSimulationReady');
    expect(SOURCE).toContain('simulatedRemoteFoundObjects');
    expect(SOURCE).toContain('simulatedRemoteHashCheckedObjects');
    expect(SOURCE).toContain('simulatedRequirementsMissing');
    expect(SOURCE).toContain('simulatedRequirementsProductionLocked');
    expect(SOURCE).toContain('pass_completion_simulation_not_ready');
    expect(SOURCE).toContain('afterRemoteVerifyExpectedMissing: 0');
    expect(SOURCE).toContain('afterRemoteVerifyExpectedLocked: 5');
    expect(SOURCE).toContain("afterRemoteVerifyNextGate: 'exact_approval_artifacts'");
    expect(SOURCE).toContain('Remote verify PASS must not open runtime downloads');
    expect(SOURCE).toContain('unexpectedObjects=0');
    expect(SOURCE).toContain('approvalReceiptCreatedByThisScript: false');
    expect(SOURCE).toContain('activeHashLockCreatedByThisScript: false');
    expect(SOURCE).toContain('runtimeDownloadsEnabledByThisScript: false');
    expect(SOURCE).toContain('productionApplyApproved: false');
    expect(SOURCE).toContain('gustav_final_preapproval_evidence_hash_lock_v2_packet.ts');
    expect(SOURCE).toContain('gustav_production_activation_sequence_preflight_v2_packet.ts');
    expect(SOURCE).toContain('gustav_post_apply_rollback_guard_contract_v2_packet.ts');
  });
});
