import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const QUEUE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_review_queue_v1.json');
const QUEUE_JSONL_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_review_queue_v1.jsonl');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_review_queue_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_review_queue.mjs');

const REQUIRED_GATES = [
  'language_field_isolation_gate',
  'source_locale_coverage_gate',
  'official_source_evidence_gate',
  'target_sequence_fit_gate',
  'anti_calque_gate',
  'grammar_cluster_gate',
  'naturalness_register_gate',
  'source_meaning_parity_gate',
  'quiz_one_correct_answer_gate',
  'distractor_quality_gate',
  'no_mojibake_or_placeholder_gate',
];

describe('Gustav French lesson review queue', () => {
  it('queues all rebuilt French lesson rows for LLM/source review without auto-accepting or activating them', () => {
    const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const jsonlRows = fs.readFileSync(QUEUE_JSONL_PATH, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('ALLOWED_REVIEWER_DECISIONS');
    expect(script).toContain('acceptedRowsMayNotActivateProduction');
    expect(script).toContain('reviewerDecisionsImportedByThisScript: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');

    expect(queue.schemaVersion).toBe('gustav-fr-lesson-review-queue-v1');
    expect(queue.status).toBe('HOLD_READY_FOR_LLM_SOURCE_REVIEW');
    expect(queue.studyTarget).toBe('fr');
    expect(queue.targetContentLang).toBe('fr');
    expect(queue.sourceLocales).toEqual(['ru', 'uk']);
    expect(queue.activationApproved).toBe(false);
    expect(queue.readyForLlmOfficialSourceReviewV2).toBe(true);
    expect(queue.readyForDecisionImportV2).toBe(false);
    expect(queue.readyForGenerationV2).toBe(false);
    expect(queue.readyForApply).toBe(false);
    expect(queue.mayModifyProductionAppFiles).toBe(false);
    expect(queue.requiredGateIds).toEqual(REQUIRED_GATES);
    expect(queue.batches).toHaveLength(32);
    expect(queue.rows).toHaveLength(1600);
    expect(jsonlRows).toHaveLength(1600);

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-review-queue-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.lessonLedgers).toBe(32);
    expect(audit.reviewRows).toBe(1600);
    expect(audit.batches).toBe(32);
    expect(audit.requiredGateCount).toBe(11);
    expect(audit.deterministicPrefilter).toEqual({ passRows: 1600, blockRows: 0 });
    expect(audit.reviewerDecisionState.blankReviewerDecisions).toBe(1600);
    expect(audit.reviewerDecisionState.unreviewedGateDecisionRows).toBe(1600);
    expect(audit.reviewerDecisionState.importAllowedRows).toBe(0);
    expect(audit.reviewerDecisionState.productionApplyAllowedRows).toBe(0);
    expect(audit.reviewerDecisionState.activationApprovedRows).toBe(0);
    expect(audit.nextRequiredGates).toEqual(
      expect.arrayContaining([
        'llm_official_source_row_review_gate',
        'review_decision_import_dry_run_gate',
        'audio_manifest_gate',
        'server_pack_manifest_gate',
        'runtime_delivery_gate',
        'admin_parity_gate',
        'storage_cloud_isolation_gate',
        'rollback_gate',
        'explicit_activation_approval_gate',
      ]),
    );

    const sampledRows = [queue.rows[0], queue.rows[799], queue.rows[1599]];
    for (const row of sampledRows) {
      expect(row.reviewScope).toBe('lesson_row');
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.aiOutputLang).toBe('fr');
      expect(row.sourceLocaleCoverage).toEqual(['ru', 'uk']);
      expect(row.requiredGateIds).toEqual(REQUIRED_GATES);
      expect(Object.keys(row.gateReviewerDecisions)).toEqual(REQUIRED_GATES);
      expect(new Set(Object.values(row.gateReviewerDecisions))).toEqual(new Set(['unreviewed']));
      expect(row.reviewerDecision).toBe('');
      expect(row.currentReviewerStatus).toBe('needs_quality_review');
      expect(row.currentActivationStatus).toBe('blocked');
      expect(row.reviewerImportAllowed).toBe(false);
      expect(row.productionApplyAllowed).toBe(false);
      expect(row.activationApproved).toBe(false);
      expect(row.deterministicPrefilter.status).toBe('PASS');
      expect(row.candidateTargetText).toBeTruthy();
      expect(row.candidateQuiz.distractors).toHaveLength(3);
      expect(row.candidateQuiz.distractors).not.toContain(row.candidateQuiz.correct);
      expect(row.researchEvidenceIds.length).toBeGreaterThanOrEqual(2);
    }

    expect(queue.rows[0].lessonId).toBe(1);
    expect(queue.rows[0].sourceQueueIndex).toBe(1);
    expect(queue.rows[1599].lessonId).toBe(32);
    expect(queue.rows[1599].sourceQueueIndex).toBe(1600);
  });
});
