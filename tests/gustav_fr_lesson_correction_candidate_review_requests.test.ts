import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders', 'fr_lesson_correction_candidate_review_requests_audit_v1.json');
const MANIFEST_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders', 'fr_lesson_correction_candidate_review_requests_manifest_v1.json');
const REQUESTS_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders', 'fr_lesson_correction_candidate_review_requests_v1.jsonl');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_correction_candidate_review_requests.mjs');

function readJsonl(filePath: string) {
  return fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

describe('Gustav French correction candidate review requests', () => {
  it('builds isolated fresh LLM review requests for corrected lesson candidates', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const requests = readJsonl(REQUESTS_PATH);
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('FUTURE_DECISIONS_PATH');
    expect(script).toContain('correctionCandidateRequestOnly: true');
    expect(script).toContain('originalDecisionQueueModifiedByThisScript: false');
    expect(script).toContain('audioGeneratedByThisScript: false');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-correction-candidate-review-requests-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.studyTarget).toBe('fr');
    expect(audit.targetContentLang).toBe('fr');
    expect(audit.aiOutputLang).toBe('fr');
    expect(audit.sourceLocales).toEqual(['ru', 'uk']);
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary).toMatchObject({
      correctionCandidateRows: 290,
      reviewRequestRows: 290,
      plannedBatches: 12,
      batchSize: 25,
      blankResponseTemplateRows: 290,
      openedImportApplyActivationRows: 0,
      deepReasoningRows: 290,
      sourceLocaleSafeRows: 290,
      duplicateRequestIds: 0,
      duplicateCorrectionQueueIndexes: 0,
      candidateHashPreservedRows: 290,
      readyForExternalReview: true,
      readyForDecisionImport: false,
      readyForAudioManifestGate: false,
      readyForApply: false,
      estimatedCorrectionReviewCostUsd: 0.725,
    });
    expect(audit.blockers).toEqual([]);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'CORRECTION_CANDIDATE_LLM_REVIEW_NOT_EXECUTED',
      'CORRECTION_CANDIDATE_DECISIONS_NOT_IMPORTED',
      'NON_ACCEPTED_ROWS_REMAIN',
    ]));

    expect(manifest.schemaVersion).toBe('gustav-fr-lesson-correction-candidate-review-requests-manifest-v1');
    expect(manifest.status).toBe('HOLD_READY_FOR_CORRECTION_CANDIDATE_LLM_REVIEW');
    expect(manifest.requestRows).toBe(290);
    expect(manifest.batches).toHaveLength(12);
    expect(manifest.batches[0]).toMatchObject({
      batchNumber: 1,
      batchId: 'fr-correction-candidates-review-v1-batch-01',
      startCorrectionQueueIndex: 1,
      endCorrectionQueueIndex: 25,
      rows: 25,
    });
    expect(manifest.batches[11]).toMatchObject({
      batchNumber: 12,
      batchId: 'fr-correction-candidates-review-v1-batch-12',
      startCorrectionQueueIndex: 276,
      endCorrectionQueueIndex: 290,
      rows: 15,
    });
    expect(manifest.outputs.futureDecisionsJsonl).toBe('docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_review_decisions_v1.jsonl');

    expect(requests).toHaveLength(290);
    expect(requests[0]).toMatchObject({
      schemaVersion: 'gustav-fr-lesson-llm-official-source-review-request-v1',
      requestId: 'fr.lesson.01.row.02.correction_candidate_review_request.v1',
      reviewScope: 'lesson_row',
      sourceQueueIndex: 1,
      batchId: 'fr-correction-candidates-review-v1-batch-01',
      lessonId: 1,
      rowNumber: 2,
      phraseId: 'fr_lesson1_phrase_002',
      studyTarget: 'fr',
      targetContentLang: 'fr',
      aiOutputLang: 'fr',
      sourceLocaleCoverage: ['ru', 'uk'],
      reviewPriority: 'correction_candidate',
    });
    expect(requests[0].sourceIdentity).toMatchObject({
      originalRequestId: 'fr.lesson.01.row.02.llm_review_request.v1',
      originalSourceQueueIndex: 2,
      correctionQueueIndex: 1,
      correctionCandidateQueuePath: 'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_queue_v1.jsonl',
    });
    expect(requests[0].correctionReviewContext).toMatchObject({
      originalRequestId: 'fr.lesson.01.row.02.llm_review_request.v1',
      originalSourceQueueIndex: 2,
      originReviewerDecision: 'needs_llm_regeneration_review',
      appliedFields: ['quiz.distractors'],
      priorCandidateWasNotAccepted: true,
      previousCorrectionIsNotApproval: true,
      decisionsMustBeWrittenToSeparateFile: 'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_review_decisions_v1.jsonl',
    });
    expect(requests[0].candidate.quiz.distractors).toEqual([
      'Merci',
      'Au revoir',
      'Bonne journée',
    ]);
    expect(requests[0].instructions.task).toContain('Treat the prior correction only as a proposal');
    expect(requests[0].instructions.hardRules).toEqual(expect.arrayContaining([
      'Run every gate fresh against candidateAfterCorrection and trusted source evidence.',
      'Write decisions only for this correction-candidate request identity, not for the original 1600-row decision queue.',
    ]));
    expect(requests[0].outputJsonSchema.properties.requestId.const).toBe('fr.lesson.01.row.02.correction_candidate_review_request.v1');
    expect(requests[0].outputJsonSchema.properties.sourceQueueIndex.const).toBe(1);
    expect(requests[0].outputJsonSchema.properties.batchId.const).toBe('fr-correction-candidates-review-v1-batch-01');
    expect(requests[0].outputJsonSchema.properties.sourceLocaleCoverage.items.enum).toEqual(['ru', 'uk']);
    expect(requests[0].blankResponseTemplate).toMatchObject({
      requestId: 'fr.lesson.01.row.02.correction_candidate_review_request.v1',
      sourceQueueIndex: 1,
      batchId: 'fr-correction-candidates-review-v1-batch-01',
      reviewerDecision: '',
      reviewerImportAllowed: false,
      productionApplyAllowed: false,
      activationApproved: false,
    });

    for (const request of requests) {
      expect(request.safety).toMatchObject({
        requestOnly: true,
        correctionCandidateRequestOnly: true,
        llmDecisionAlreadyFilled: false,
        reviewerDecisionsImportedByThisRequest: false,
        originalDecisionQueueModifiedByThisRequest: false,
        appBundleModifiedByThisRequest: false,
        generatedFrenchLedgersModifiedByThisRequest: false,
        audioGeneratedByThisRequest: false,
        firebaseOrServerUploadStarted: false,
        runtimeDownloadsEnabled: false,
        activationApproved: false,
      });
      expect(request.instructions.reasoningLevel).toBe('deep');
      expect(request.trustedSourceContext.policy.officialOrTrustedEvidenceRequired).toBe(true);
      expect(request.blankResponseTemplate.reviewerDecision).toBe('');
      expect(request.blankResponseTemplate.activationApproved).toBe(false);
    }
  });
});
