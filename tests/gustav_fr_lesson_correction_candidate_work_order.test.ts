import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders', 'fr_lesson_correction_candidate_work_order_audit_v1.json');
const QUEUE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders', 'fr_lesson_correction_candidate_queue_v1.jsonl');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_correction_candidate_work_order.mjs');

function readJsonl(filePath: string) {
  return fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

describe('Gustav French lesson correction candidate work order', () => {
  it('materializes reviewer correction payloads as isolated candidates that still require fresh review', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const queue = readJsonl(QUEUE_PATH);
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('mayImportOnlyAfterAcceptQualityGates: true');
    expect(script).toContain('reviewerImportAllowedNow: false');
    expect(script).toContain('appBundleModifiedByThisScript: false');
    expect(script).toContain('audioGeneratedByThisScript: false');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-correction-candidate-work-order-audit-v1');
    expect(audit.status).toBe('HOLD_CORRECTION_CANDIDATES_READY_FOR_REVIEW_REQUEST_BUILD');
    expect(audit.studyTarget).toBe('fr');
    expect(audit.sourceLocales).toEqual(['ru', 'uk']);
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary).toMatchObject({
      regenerationRows: 303,
      correctionPayloadRows: 290,
      correctionCandidateRows: 290,
      outputShapeSafeRows: 290,
      mojibakeSuspectRows: 0,
      readyForReviewRequestBuild: true,
      readyForImport: false,
      readyForAudioManifestGate: false,
      readyForApply: false,
    });
    expect(audit.summary.lessonsWithCorrectionCandidates).toBeGreaterThan(20);
    expect(audit.appliedFieldCounts['quiz.distractors']).toBeGreaterThan(200);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'CORRECTION_CANDIDATES_REQUIRE_FRESH_LLM_TRUSTED_SOURCE_REVIEW',
      'MISSING_DECISION_ROWS_REMAIN',
      'NON_ACCEPTED_ROWS_REMAIN',
      'AUDIO_BLOCKED_UNTIL_ALL_ROWS_ACCEPTED',
    ]));

    expect(queue).toHaveLength(290);
    expect(queue[0]).toMatchObject({
      schemaVersion: 'gustav-fr-lesson-correction-candidate-row-v1',
      requestId: 'fr.lesson.01.row.02.llm_review_request.v1',
      sourceQueueIndex: 2,
      lessonId: 1,
      rowNumber: 2,
      studyTarget: 'fr',
      originReviewerDecision: 'needs_llm_regeneration_review',
      action: 'apply_reviewer_correction_then_re_review',
      appliedFields: ['quiz.distractors'],
    });
    expect(queue[0].candidateAfterCorrection.quiz.distractors).toEqual([
      'Merci',
      'Au revoir',
      'Bonne journée',
    ]);
    expect(queue[0].validation).toMatchObject({
      hasAppliedCorrection: true,
      outputShapeSafe: true,
      mojibakeSuspect: false,
    });
    expect(queue[0].requiredNextReview).toMatchObject({
      mustRebuildReviewRequest: true,
      mustRunLlmTrustedSourceReview: true,
      mayImportOnlyAfterAcceptQualityGates: true,
      reviewerImportAllowedNow: false,
      productionApplyAllowedNow: false,
      activationApproved: false,
    });
    for (const row of queue) {
      expect(row.safety).toMatchObject({
        isolatedReviewerWorkAreaOnly: true,
        appBundleModified: false,
        generatedFrenchLedgersModified: false,
        audioGenerated: false,
        serverPackModified: false,
        runtimeDownloadsEnabled: false,
        activationApproved: false,
      });
      expect(row.validation.outputShapeSafe).toBe(true);
      expect(row.validation.mojibakeSuspect).toBe(false);
      expect(row.appliedFields.length).toBeGreaterThan(0);
    }

    expect(audit.safety).toMatchObject({
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      audioGeneratedByThisScript: false,
      serverPackManifestModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      firebaseOrServerUploadStarted: false,
      activationApproved: false,
    });
  });
});
