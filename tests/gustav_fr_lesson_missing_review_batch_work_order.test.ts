import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const WORK_ORDER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_missing_review_batch_work_order_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_missing_review_batch_work_order_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_missing_review_batch_work_order.mjs');

describe('Gustav French missing LLM review batch work order', () => {
  it('materializes the remaining review batches without calling OpenAI or opening production gates', () => {
    const workOrder = JSON.parse(fs.readFileSync(WORK_ORDER_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('openAiCallsMadeByThisScript: false');
    expect(script).toContain('reviewerDecisionsWrittenByThisScript: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');

    expect(workOrder.schemaVersion).toBe('gustav-fr-lesson-missing-review-batch-work-order-v1');
    expect(workOrder.studyTarget).toBe('fr');
    expect(workOrder.sourceLocales).toEqual(['ru', 'uk']);
    expect(workOrder.targetContentLang).toBe('fr');
    expect(workOrder.aiOutputLang).toBe('fr');
    expect(workOrder.activationApproved).toBe(false);
    expect(workOrder.maxBatchRows).toBe(25);
    expect(workOrder.batches).toHaveLength(14);
    expect(workOrder.batches[0]).toMatchObject({
      batchId: 'fr-missing-review-batch-001',
      startIndex: 1264,
      rowCount: 25,
      artifact: 'docs/gustav/generated/fr/reviewer/missing_review_batches/fr-missing-review-batch-001.json',
    });
    expect(workOrder.batches.at(-1)).toMatchObject({
      endIndex: 1600,
      rowCount: 12,
    });
    expect(workOrder.missingByLesson[0]).toMatchObject({
      lessonId: 26,
      firstSourceQueueIndex: 1264,
    });
    expect(workOrder.nextRequiredWork[0]).toContain('--start-index 1264 --limit 25 --execute --validate-after');

    for (const batch of workOrder.batches) {
      const batchPath = path.join(ROOT, batch.artifact);
      expect(fs.existsSync(batchPath)).toBe(true);
      const artifact = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
      expect(artifact.schemaVersion).toBe('gustav-fr-lesson-missing-review-batch-v1');
      expect(artifact.studyTarget).toBe('fr');
      expect(artifact.sourceLocales).toEqual(['ru', 'uk']);
      expect(artifact.activationApproved).toBe(false);
      expect(artifact.rowCount).toBeLessThanOrEqual(25);
      expect(artifact.requests).toHaveLength(artifact.rowCount);
      expect(artifact.safety).toMatchObject({
        requestOnly: true,
        openAiCallsMadeByThisScript: false,
        reviewerDecisionsWrittenByThisScript: false,
        reviewerDecisionsImportedByThisScript: false,
        appBundleModifiedByThisScript: false,
        firebaseOrServerUploadStarted: false,
        runtimeDownloadsEnabled: false,
        activationApproved: false,
      });
    }

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-missing-review-batch-work-order-audit-v1');
    expect(audit.status).toBe('HOLD_MISSING_REVIEW_BATCH_WORK_ORDER_READY');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary).toMatchObject({
      requestRows: 1600,
      decisionRows: 1263,
      missingReviewRows: 337,
      batchArtifacts: 14,
      maxBatchRows: 25,
      firstBatchStartIndex: 1264,
      firstBatchLimit: 25,
      lastBatchEndIndex: 1600,
      missingLessons: 7,
      estimatedMissingReviewCostUsd: 0.8425,
      readyForApply: false,
    });
    expect(audit.summary.blockers).toEqual([]);
    expect(audit.safety).toMatchObject({
      workOrderOnly: true,
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
