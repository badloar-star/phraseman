import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const PACKET_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson01_review_draft_llm_packet_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson01_review_draft_llm_packet_audit_v1.json');
const MD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson01_review_draft_llm_packet_v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_review_draft_llm_packet.mjs');

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

describe('Gustav French lesson 1 review-draft LLM packet', () => {
  it('creates a strict request-only official-source review packet for the new accented Lesson 1 draft', () => {
    const packet = JSON.parse(fs.readFileSync(PACKET_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('lesson 1 review draft must be v2 accented/native draft');
    expect(script).toContain('llmApiCalledByThisScript: false');
    expect(script).toContain('reviewerDecisionsImportedByThisScript: false');
    expect(script).toContain('activationApproved: false');

    expect(packet.schemaVersion).toBe('gustav-fr-lesson01-review-draft-llm-packet-v1');
    expect(packet.status).toBe('HOLD_READY_FOR_LLM_REVIEW');
    expect(packet.studyTarget).toBe('fr');
    expect(packet.targetContentLang).toBe('fr');
    expect(packet.sourceLocaleCoverage).toEqual(['ru', 'uk']);
    expect(packet.sourceDraft).toMatchObject({
      path: 'docs/gustav/generated/fr/review/lesson01_full_review_draft.json',
      schemaVersion: 'gustav-fr-lesson01-full-review-draft-v2',
      status: 'REVIEW_DRAFT_HOLD',
    });
    expect(packet.rowRequests).toHaveLength(50);
    expect(packet.lessonLevelReviewRequest).toMatchObject({
      requestId: 'fr.lesson.01.review_draft.lesson_level.llm_source_review.v1',
      reasoningLevel: 'deep',
      reviewerImportAllowed: false,
      productionApplyAllowed: false,
      activationApproved: false,
    });
    expect(packet.lessonLevelReviewRequest.requiredGateIds).toEqual([
      'lesson_sequence_fit_gate',
      'theory_shape_parity_gate',
      'vocabulary_surface_parity_gate',
      'orthography_and_register_gate',
      'source_evidence_sufficiency_gate',
    ]);
    expect(packet.safety).toMatchObject({
      requestOnly: true,
      llmApiCalledByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    for (const request of [packet.rowRequests[0], packet.rowRequests[7], packet.rowRequests[31], packet.rowRequests[49]]) {
      expect(request.schemaVersion).toBe('gustav-fr-lesson01-review-draft-llm-row-request-v1');
      expect(request.reviewScope).toBe('lesson01_review_draft_row');
      expect(request.studyTarget).toBe('fr');
      expect(request.targetContentLang).toBe('fr');
      expect(request.sourceLocaleCoverage).toEqual(['ru', 'uk']);
      expect(request.instructions.reasoningLevel).toBe('deep');
      expect(request.instructions.requiredGateIds).toEqual(REQUIRED_GATES);
      expect(request.instructions.hardRules).toEqual(expect.arrayContaining([
        'Do not auto-accept.',
        'Use only official/trusted sources named in sourceEvidenceContext for approval.',
        'Reject any language mixing, mojibake, placeholder text, missing French accents, or wrong elision.',
        'Keep reviewerImportAllowed=false, productionApplyAllowed=false, activationApproved=false.',
      ]));
      expect(request.outputJsonSchema.properties.reviewerDecision.enum).toEqual([
        'accept_review_draft',
        'needs_row_revision',
        'needs_source_check',
        'reject_row',
      ]);
      expect(Object.keys(request.outputJsonSchema.properties.gateReviewerDecisions.properties)).toEqual(REQUIRED_GATES);
      expect(request.blankResponseTemplate.reviewerDecision).toBe('');
      expect(new Set(Object.values(request.blankResponseTemplate.gateReviewerDecisions))).toEqual(new Set(['']));
      expect(request.blankResponseTemplate.reviewerImportAllowed).toBe(false);
      expect(request.blankResponseTemplate.productionApplyAllowed).toBe(false);
      expect(request.blankResponseTemplate.activationApproved).toBe(false);
      expect(request.safety.activationApproved).toBe(false);
    }

    expect(packet.rowRequests[7].candidate.french).toBe("S'il vous plaît.");
    expect(packet.rowRequests[14].candidate.french).toBe("Je m'appelle Marie.");
    expect(packet.rowRequests[31].candidate.french).toBe("J'habite à Lyon.");
    expect(packet.rowRequests[49].candidate.french).toBe('Je suis prêt.');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-review-draft-llm-packet-audit-v1');
    expect(audit.status).toBe('HOLD_READY_FOR_LLM_REVIEW');
    expect(audit.blockers).toEqual([]);
    expect(audit.rowRequests).toBe(50);
    expect(audit.requiredGateCount).toBe(11);
    expect(audit.lessonLevelGateCount).toBe(5);
    expect(audit.blankDecisionRows).toBe(50);
    expect(audit.openedImportApplyActivationRows).toBe(0);
    expect(audit.readyForLlmReview).toBe(true);
    expect(audit.readyForDecisionImport).toBe(false);
    expect(audit.readyForApply).toBe(false);
    expect(audit.activationApproved).toBe(false);
    expect(audit.nextRequiredArtifact).toBe('fr_lesson01_review_draft_llm_decisions_v1.jsonl');

    expect(markdown).toContain('# French Lesson 1 Review Draft LLM Packet');
    expect(markdown).toContain('Status: HOLD_READY_FOR_LLM_REVIEW');
    expect(markdown).toContain('This packet replaces human review');
  });
});
