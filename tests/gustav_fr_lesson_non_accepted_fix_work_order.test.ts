import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const WORK_ORDER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders', 'fr_lesson_non_accepted_fix_work_order_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders', 'fr_lesson_non_accepted_fix_work_order_audit_v1.json');
const REGEN_QUEUE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders', 'fr_lesson_non_accepted_regeneration_queue_v1.jsonl');
const SOURCE_QUEUE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders', 'fr_lesson_non_accepted_source_recheck_queue_v1.jsonl');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_non_accepted_fix_work_order.mjs');

function readJsonl(filePath: string) {
  return fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

describe('Gustav French lesson non-accepted fix work order', () => {
  it('materializes isolated reviewer-only queues for known non-accepted rows', () => {
    const workOrder = JSON.parse(fs.readFileSync(WORK_ORDER_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const regenRows = readJsonl(REGEN_QUEUE_PATH);
    const sourceRows = readJsonl(SOURCE_QUEUE_PATH);
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('fixedFrenchRowsGeneratedByThisScript: false');
    expect(script).toContain('reviewerDecisionsImportedByThisScript: false');
    expect(script).toContain('audioGeneratedByThisScript: false');
    expect(script).toContain('activationApproved: false');

    expect(workOrder.schemaVersion).toBe('gustav-fr-lesson-non-accepted-fix-work-order-v1');
    expect(workOrder.status).toBe('HOLD_NON_ACCEPTED_FIX_WORK_ORDER_READY');
    expect(workOrder.studyTarget).toBe('fr');
    expect(workOrder.sourceLocales).toEqual(['ru', 'uk']);
    expect(workOrder.activationApproved).toBe(false);
    expect(workOrder.summary).toMatchObject({
      requestRows: 1600,
      decisionRows: 1263,
      nonAcceptedRows: 393,
      regenerationRows: 303,
      sourceRecheckRows: 90,
      correctionPayloadRows: 290,
      noCorrectionRegenerationRows: 13,
      regenerationBatches: 13,
      sourceRecheckBatches: 4,
      firstRegenerationSourceQueueIndex: 2,
      firstSourceRecheckSourceQueueIndex: 13,
      readyForAudioManifestGate: false,
      readyForApply: false,
    });
    expect(workOrder.decisionCounts).toMatchObject({
      needs_llm_regeneration_review: 290,
      needs_regeneration: 13,
      skip_for_later: 90,
    });
    expect(workOrder.failedGateCounts.quiz_one_correct_answer_gate).toBeGreaterThan(100);
    expect(workOrder.failedGateCounts.distractor_quality_gate).toBeGreaterThan(150);
    expect(workOrder.batches.regeneration).toHaveLength(13);
    expect(workOrder.batches.sourceRecheck).toHaveLength(4);
    expect(workOrder.batches.regeneration[0]).toMatchObject({
      batchNumber: 1,
      type: 'regeneration',
      startIndex: 2,
      rowCount: 25,
      outputQueue: 'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_non_accepted_regeneration_queue_v1.jsonl',
    });

    expect(regenRows).toHaveLength(303);
    expect(sourceRows).toHaveLength(90);
    expect(regenRows[0]).toMatchObject({
      schemaVersion: 'gustav-fr-lesson-non-accepted-fix-work-order-row-v1',
      queueType: 'regeneration',
      sourceQueueIndex: 2,
      lessonId: 1,
      rowNumber: 2,
      reviewerDecision: 'needs_llm_regeneration_review',
      action: 'apply_reviewer_correction_then_re_review',
    });
    expect(regenRows[0].failedGateIds).toEqual(expect.arrayContaining([
      'quiz_one_correct_answer_gate',
      'distractor_quality_gate',
    ]));
    expect(regenRows[0].correctionPayload.hasCorrectionPayload).toBe(true);
    expect(regenRows[0].safety).toMatchObject({
      requestOnly: true,
      appBundleModified: false,
      audioGenerated: false,
      serverPackModified: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    });
    expect(sourceRows[0]).toMatchObject({
      queueType: 'source_recheck',
      sourceQueueIndex: 13,
      lessonId: 1,
      reviewerDecision: 'skip_for_later',
      action: 'trusted_source_recheck_then_re_review',
    });
    expect(sourceRows[0].failedGateIds).toContain('official_source_evidence_gate');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-non-accepted-fix-work-order-audit-v1');
    expect(audit.status).toBe('HOLD_NON_ACCEPTED_FIX_WORK_ORDER_READY');
    expect(audit.summary).toMatchObject(workOrder.summary);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'FIX_WORK_ORDER_IS_NOT_FIXED_CONTENT',
      'MISSING_DECISION_ROWS_REMAIN',
      'FIXED_ROWS_REQUIRE_FRESH_LLM_TRUSTED_SOURCE_REVIEW',
      'AUDIO_BLOCKED_UNTIL_ALL_ROWS_ACCEPTED',
    ]));
    expect(audit.safety).toMatchObject({
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      fixedFrenchRowsGeneratedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      adminUiModifiedByThisScript: false,
      audioGeneratedByThisScript: false,
      serverPackManifestModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      firebaseOrServerUploadStarted: false,
      activationApproved: false,
    });
  });
});
