import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const CONTRACT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin', 'fr_admin_activation_rollback_gate_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin', 'fr_admin_activation_rollback_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_admin_activation_rollback_gate.mjs');

describe('Gustav French admin activation/rollback gate', () => {
  it('keeps activation blocked and rollback sourceLocale-scoped until every upstream gate and approval artifact exists', () => {
    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('validateApprovalCandidate');
    expect(script).toContain('active explicit approval receipt is missing');
    expect(script).toContain('course-packs/fr/uiLocale/');
    expect(script).toContain('card_packs');
    expect(script).toContain('community_packs');

    expect(contract.schemaVersion).toBe('gustav-fr-admin-activation-rollback-gate-v1');
    expect(contract.studyTarget).toBe('fr');
    expect(contract.targetLocale).toBe('fr');
    expect(contract.sourceLocales).toEqual(['ru', 'uk']);
    expect(contract.activationMode).toBe('blocked_until_all_gates_pass_and_explicit_receipt_exists');
    expect(contract.requiredApprovalFields).toEqual(expect.arrayContaining([
      'approvalRequestId',
      'studyTarget',
      'sourceLocales',
      'serverManifestSha256',
      'reviewerImportDryRunSha256',
      'audioManifestGateSha256',
      'serverUploadEvidenceGateSha256',
      'runtimeDeliveryGateSha256',
      'storageCloudIsolationGateSha256',
      'adminSourceLocaleWriteContractSha256',
      'rollbackScope',
      'activationApproved',
    ]));
    expect(contract.rollbackPolicy.rollbackScopes).toEqual(['course-packs/fr/ru/', 'course-packs/fr/uk/']);
    expect(contract.rollbackPolicy.deniedRollbackScopes).toEqual(expect.arrayContaining([
      'course-packs/fr/',
      'course-packs/fr/uiLocale/',
      'course-packs/fr/sourceLocale/',
      'course-packs/en/',
      'card_packs',
      'community_packs',
    ]));
    expect(contract.rollbackPolicy.cardPacksAreMarketplaceOnly).toBe(true);
    expect(contract.rollbackPolicy.communityPacksAreUgcOnly).toBe(true);
    expect(Object.values(contract.disallowedTransitionsNow).every((value) => value === false)).toBe(true);

    expect(contract.upstreamGateReadiness).toMatchObject({
      reviewerImportDryRunReady: false,
      audioReady: false,
      serverUploadReady: false,
      serverUploadEvidenceReady: false,
      runtimeDeliveryReady: false,
      runtimeUploadEvidenceReady: false,
      storageCloudReady: false,
      adminSourceLocaleContractReady: true,
      adminWritePathReady: true,
      adminEquivalenceReady: true,
    });

    expect(audit.schemaVersion).toBe('gustav-fr-admin-activation-rollback-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.rollbackScopes).toBe(2);
    expect(audit.summary.requiredApprovalFields).toBeGreaterThanOrEqual(14);
    expect(audit.summary.activeApprovalReceiptExists).toBe(false);
    expect(audit.summary.activeHashLockManifestExists).toBe(false);
    expect(audit.summary.allUpstreamReady).toBe(false);
    expect(audit.summary.upstreamReadyCount).toBe(3);
    expect(audit.summary.upstreamGateCount).toBe(10);
    expect(audit.summary.fixtureProbesPassed).toBe(8);
    expect(audit.summary.fixtureProbes).toBe(8);
    expect(audit.summary.activationApproved).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.serverUploadAllowed).toBe(false);
    expect(audit.summary.runtimeDownloadsEnabled).toBe(false);
    expect(audit.summary.adminOfficialWriteAllowed).toBe(false);
    expect(audit.summary.checksPassed).toBe(audit.summary.checksTotal);
    expect(audit.summary.blockers).toBe(0);

    for (const id of [
      'current_hold_candidate_rejected_without_receipt_hashlocks_and_upstream_pass',
      'wrong_target_rejected',
      'missing_source_locales_rejected',
      'ui_locale_rollback_scope_rejected',
      'broad_fr_rollback_scope_rejected',
      'english_rollback_scope_rejected',
      'activation_true_rejected',
      'hash_mismatch_rejected',
    ]) {
      expect(audit.probes.find((probe: { id: string }) => probe.id === id)).toMatchObject({
        accepted: false,
        passed: true,
      });
    }

    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'active_explicit_approval_receipt_missing',
      'active_hash_lock_manifest_missing',
      'llm_review_decisions_not_imported',
      'audio_tts_and_checksum_not_ready',
      'server_upload_not_ready',
      'server_upload_evidence_not_ready',
      'runtime_delivery_not_ready',
    ]));
    expect(audit.safety).toMatchObject({
      productionAppFilesModifiedByThisScript: false,
      adminUiModifiedByThisScript: false,
      adminStateModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
