import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Gustav production readiness completion audit contract', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'scripts', 'gustav_production_readiness_completion_audit_v2_packet.ts'),
    'utf8',
  );

  it('classifies a sole exact-approval master blocker as production-locked, not missing technical work', () => {
    expect(source).toContain('const exactApprovalOnlyMasterLock =');
    expect(source).toContain('input.masterBlockers === 1');
    expect(source).toContain('input.masterApplyBlockers === 1');
    expect(source).toContain('!input.p44ActiveApprovalReceiptExists');
    expect(source).toContain('!input.p44ActiveHashLockExists');
    expect(source).toContain('exactApprovalOnlyMasterLock');
    expect(source).toContain('closedHoldExplainedByFinalBlockerMap');
    expect(source).toContain('finalBlockerMapActiveRootCauses');
    expect(source).toContain('input.finalBlockerMapRootCauses >= 3');
    expect(source).toContain('input.finalBlockerMapActiveRootCauses === 3');
    expect(source).toContain('finalBlockerMapNextRootCauseToClose');
    expect(source).toContain('ROOT-01-REMOTE-SERVER-VERIFY');
    expect(source).toContain('finalBlockerMapAppSurfaceParityReady');
    expect(source).toContain('french_final_blocker_dependency_map_v2_packet.json');
    expect(source).toContain('Need master zero non-approval blockers or a PASS final blocker map');
  });

  it('requires the post exact approval apply runbook before closed-mode completion can be claimed', () => {
    expect(source).toContain('postApprovalRunbookStatus: string');
    expect(source).toContain('REQ-16-POST-EXACT-APPROVAL-RUNBOOK');
    expect(source).toContain('postExactApprovalApplyRunbookReady');
    expect(source).toContain('POST_EXACT_APPROVAL_APPLY_RUNBOOK_NOT_READY');
    expect(source).toContain('post_exact_approval_runbook_ready_waiting_for_canonical_source');
    expect(source).toContain('post_exact_approval_apply_runbook_v2_packet.json');
    expect(source).toContain('post_exact_approval_runbook_missing_rejected');
  });

  it('requires production server manifest publishing and remote object verification before completion', () => {
    expect(source).toContain('onboardingServerPrefetchStatus: string');
    expect(source).toContain('productionServerManifestPublishGateStatus: string');
    expect(source).toContain('frenchServerPackUploadEvidenceStatus: string');
    expect(source).toContain('frenchServerPackUploadExecutionGateDryRun: boolean');
    expect(source).toContain('frenchServerPackUploadExecutionGatePlannedUploadObjects: number');
    expect(source).toContain('frenchServerRemoteCredentialHandoffStatus: string');
    expect(source).toContain('frenchServerRemoteCredentialHandoffState: string');
    expect(source).toContain('frenchServerRemoteCredentialHandoffCredentialSource: string');
    expect(source).toContain('frenchServerObjectRemoteVerifyHashChecked: number');
    expect(source).toContain('frenchServerObjectRemoteVerifyUnexpectedObjects: number');
    expect(source).toContain('REQ-09-ONBOARDING-SERVER-PREFETCH-CONTRACT');
    expect(source).toContain('REQ-10-PRODUCTION-SERVER-MANIFEST-PUBLISH-GATE');
    expect(source).toContain('REQ-11-FRENCH-SERVER-PACK-UPLOAD-EVIDENCE');
    expect(source).toContain('REQ-12-FRENCH-SERVER-PACK-UPLOAD-EXECUTION-GATE');
    expect(source).toContain('REQ-12A-FRENCH-SERVER-REMOTE-CREDENTIAL-HANDOFF');
    expect(source).toContain('REQ-13-FRENCH-SERVER-OBJECT-REMOTE-VERIFY');
    expect(source).toContain('onboarding_server_prefetch_contract_v2_packet.json');
    expect(source).toContain('onboarding_server_prefetch_contract_gap_rejected');
    expect(source).toContain('french_server_pack_upload_execution_planned_gap_rejected');
    expect(source).toContain('french_server_pack_upload_execution_real_attempt_rejected');
    expect(source).toContain('input.frenchServerPackUploadExecutionGatePlannedUploadObjects === 36');
    expect(source).toContain('input.frenchServerPackUploadExecutionGateUploadAttempts === 36');
    expect(source).toContain('PRODUCTION_SERVER_MANIFEST_PUBLISH_GATE_NOT_READY');
    expect(source).toContain('FRENCH_SERVER_PACK_UPLOAD_EVIDENCE_NOT_READY');
    expect(source).toContain('FRENCH_SERVER_PACK_UPLOAD_EXECUTION_GATE_NOT_READY');
    expect(source).toContain('FRENCH_SERVER_OBJECT_REMOTE_VERIFY_NOT_READY');
    expect(source).toContain('production_server_manifest_publish_gate_v2_packet.json');
    expect(source).toContain('french_server_pack_upload_evidence_v2_packet.json');
    expect(source).toContain('french_server_pack_upload_execution_gate_v2_packet.json');
    expect(source).toContain('french_server_remote_credential_handoff_v2_packet.json');
    expect(source).toContain('french_server_object_remote_verify_v2_packet.json');
    expect(source).toContain('production_server_manifest_publish_gate_hold_rejected');
    expect(source).toContain('french_server_pack_upload_evidence_gap_rejected');
    expect(source).toContain('french_server_pack_upload_execution_incomplete_upload_rejected');
    expect(source).toContain('french_server_remote_credential_handoff_missing_rejected');
    expect(source).toContain('french_server_remote_credential_handoff_upload_open_rejected');
    expect(source).toContain('FRENCH_SERVER_REMOTE_CREDENTIAL_HANDOFF_NOT_READY');
    expect(source).toContain('french_server_object_remote_verify_hash_gap_rejected');
    expect(source).toContain('french_server_object_remote_verify_unexpected_objects_rejected');
    expect(source).toContain('input.frenchServerObjectRemoteVerifyUnexpectedObjects === 0');
    expect(source).toContain('makeRemoteVerifyPassedWithoutApproval');
    expect(source).toContain('remote_verify_pass_without_exact_approval_stays_production_locked');
    expect(source).toContain('closed_mode_evidence_complete_production_locked');
  });

  it('uses the current AI decision coverage instead of a stale hard-coded count', () => {
    expect(source).toContain('const expectedAiDecisionRows = Math.max');
    expect(source).toContain('input.officialSourceAcceptedAi === expectedAiDecisionRows');
    expect(source).toContain('input.llmReviewedAi === expectedAiDecisionRows');
    expect(source).toContain('input.llmAcceptedAi === expectedAiDecisionRows');
    expect(source).toContain('officialSource.ai=${input.officialSourceAcceptedAi}/${expectedAiDecisionRows}');
    expect(source).toContain('llmAi=${input.llmReviewedAi}/${input.llmAcceptedAi}/${expectedAiDecisionRows}');
  });

  it('accepts the post-P44 exact approval phase without reopening production mutation flags', () => {
    expect(source).toContain('postApprovalSourceValidatedReady');
    expect(source).toContain('preApprovalSourceAbsentTerminalWaitReady || postApprovalSourceValidatedReady');
    expect(source).toContain("input.finalGapRequirementsReady >= 9");
    expect(source).toContain("input.finalGapRequirementsBlocked <= 2");
    expect(source).toContain("input.p44ActiveApprovalReceiptExists");
    expect(source).toContain("input.p44ActiveHashLockExists");
    expect(source).toContain("input.p45ReadyForProductionActivationSequence");
    expect(source).toContain("input.p46ReadyForProductionApplyTransaction");
    expect(source).toContain("input.p47ReadyForPostApplyRollbackGuard");
    expect(source).toContain("!input.targetReadyForApply");
    expect(source).toContain("!input.masterReadyForApply");
    expect(source).toContain("!input.runtimeDownloadsEnabled");
    expect(source).toContain("exactApprovalHandoffFixtureFailures");
    expect(source).toContain("exact_approval_source_present_ready_for_p31_only");
    expect(source).toContain("exact_approval_source_present_route_to_p31");
    expect(source).toContain("input.p44ActiveApprovalReceiptExists = false");
  });

  it('does not classify approval-only manifests as production activated', () => {
    expect(source).toContain('productionApplyActivatedReady');
    expect(source).toContain('input.targetActivationApproved &&');
    expect(source).toContain('input.targetProductionReady &&');
    expect(source).toContain('input.targetReadyForApply &&');
    expect(source).toContain('input.masterReadyForApply &&');
    expect(source).toContain('input.finalGapCanStartProductionApply &&');
    expect(source).toContain('input.finalGapCanStartProductionApply = true');
    expect(source).toContain('input.targetReadyForApply = true');
    expect(source).toContain('input.masterReadyForApply = true');
    expect(source).toContain('preApprovalSourceAbsentTerminalWaitReady || postApprovalSourceValidatedReady || productionApplyActivatedReady');
  });
});
