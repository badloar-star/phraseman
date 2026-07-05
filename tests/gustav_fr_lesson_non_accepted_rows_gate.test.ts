import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const CONTRACT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_non_accepted_rows_work_order_contract_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_non_accepted_rows_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_non_accepted_rows_gate.mjs');

describe('Gustav French lesson non-accepted rows gate', () => {
  it('blocks audio/server/runtime until every reviewed row is accepted and routes non-accepted rows to isolated work orders', () => {
    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('workOrdersWrittenByThisScript: false');
    expect(script).toContain('regenerationRowsGeneratedByThisScript: false');
    expect(script).toContain('audioGeneratedByThisScript: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');

    expect(contract.schemaVersion).toBe('gustav-fr-lesson-non-accepted-rows-work-order-contract-v1');
    expect(contract.studyTarget).toBe('fr');
    expect(contract.sourceLocales).toEqual(['ru', 'uk']);
    expect(contract.activationApproved).toBe(false);
    expect(contract.nonAcceptedDecisions).toEqual([
      'needs_regeneration',
      'needs_llm_regeneration_review',
      'reject_candidate',
      'skip_for_later',
    ]);
    expect(contract.outputRoot).toBe('docs/gustav/generated/fr/reviewer/');
    expect(contract.forbiddenOutputs).toEqual(expect.arrayContaining([
      'app/',
      'admin/',
      'functions/',
      'docs/gustav/generated/fr/audio/',
      'docs/gustav/generated/fr/server/',
      'docs/gustav/generated/fr/runtime/',
      'course-packs/',
    ]));
    expect(contract.workOrderMaterializationAllowed).toBe(false);
    expect(contract.routes).toHaveLength(5);
    expect(contract.routes.every((route: any) => route.blocksAudioServerRuntime)).toBe(true);
    expect(contract.routes.find((route: any) => route.reviewerDecision === 'missing_decision')).toMatchObject({
      rowCount: 337,
      requiresLlmTrustedSourceReview: true,
    });
    expect(contract.missingDecisionBatches[0]).toMatchObject({
      startIndex: 1264,
      limit: 25,
    });

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-non-accepted-rows-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.requestRows).toBe(1600);
    expect(audit.summary.decisionRows).toBe(1263);
    expect(audit.summary.acceptedRows).toBe(870);
    expect(audit.summary.missingDecisionRows).toBe(337);
    expect(audit.summary.nonAcceptedRows).toBe(393);
    expect(audit.summary.regenerationRows).toBe(303);
    expect(audit.summary.rejectedRows).toBe(0);
    expect(audit.summary.skippedRows).toBe(90);
    expect(audit.summary.decisionsComplete).toBe(false);
    expect(audit.summary.sourceLocaleCoverageRows).toBe(1600);
    expect(audit.summary.outcomeRoutingReady).toBe(false);
    expect(audit.summary.materializedIntegrityReady).toBe(false);
    expect(audit.summary.workOrderMaterializationAllowed).toBe(false);
    expect(audit.summary.audioBlockedByNonAcceptedRows).toBe(true);
    expect(audit.summary.readyForAudioManifestGate).toBe(false);
    expect(audit.summary.readyForServerPackManifestGate).toBe(false);
    expect(audit.summary.readyForRuntimeDeliveryGate).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'DECISIONS_NOT_COMPLETE',
      'MISSING_DECISION_ROWS_REMAIN',
      'OUTCOME_ROUTING_NOT_READY',
      'MATERIALIZED_INTEGRITY_NOT_READY',
      'AUDIO_BLOCKED_UNTIL_ALL_ROWS_ACCEPTED',
    ]));
    expect(audit.productionBlockers).not.toContain('DECISIONS_FILE_MISSING');
    expect(audit.firstBlockedLessons[0]).toMatchObject({
      lessonId: 1,
      requestRows: 50,
      decisionRows: 50,
      missingDecisionRows: 0,
    });
    expect(audit.missingDecisionBatches[0].executeCommand).toContain('--start-index 1264 --limit 25 --execute --validate-after');
    expect(audit.safety).toMatchObject({
      dryRunOnly: true,
      workOrdersWrittenByThisScript: false,
      regenerationRowsGeneratedByThisScript: false,
      rejectedRowsWrittenByThisScript: false,
      skippedRowsWrittenByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      adminUiModifiedByThisScript: false,
      functionsModifiedByThisScript: false,
      audioGeneratedByThisScript: false,
      serverPackManifestModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      firebaseOrServerUploadStarted: false,
      productionApplyApproved: false,
    });
  });
});
