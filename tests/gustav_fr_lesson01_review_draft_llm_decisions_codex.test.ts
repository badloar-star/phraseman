import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const DECISIONS_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson01_review_draft_llm_decisions_v1.jsonl');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson01_review_draft_llm_decisions_codex_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson01_review_draft_llm_decisions_codex.mjs');

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

function readJsonl(filePath: string): any[] {
  return fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
}

describe('Gustav French lesson 1 Codex LLM-style official-source decisions', () => {
  it('writes 50 accepted review-draft decisions without opening import, apply, or activation', () => {
    const decisions = readJsonl(DECISIONS_PATH);
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('codex_llm_official_source_review');
    expect(script).toContain('llmApiCalledByThisScript: false');
    expect(script).toContain('reviewerDecisionsImportedByThisScript: false');
    expect(script).toContain('activationApproved: false');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson01-review-draft-llm-decisions-codex-audit-v1');
    expect(audit.status).toBe('PASS_DECISIONS_WRITTEN_FOR_GATE');
    expect(audit.decisionRows).toBe(50);
    expect(audit.acceptedRows).toBe(50);
    expect(audit.revisionRows).toBe(0);
    expect(audit.readyForMaterializationGate).toBe(true);
    expect(audit.readyForApply).toBe(false);
    expect(audit.activationApproved).toBe(false);
    expect(audit.sourceAccessNotes.coe_cefr_a1_global_scale).toContain('Browser-verified');
    expect(audit.sourceAccessNotes.le_robert_etre_present).toContain('Browser-verified');

    expect(decisions).toHaveLength(50);
    for (const decision of decisions) {
      expect(Object.keys(decision).sort()).toEqual([
        'activationApproved',
        'correctedFrench',
        'correctedRussian',
        'correctedUkrainian',
        'correctedWordsFr',
        'gateEvidenceNotes',
        'gateReviewerDecisions',
        'productionApplyAllowed',
        'requestId',
        'reviewerDecision',
        'reviewerImportAllowed',
        'reviewerNotes',
        'schemaVersion',
      ].sort());
      expect(decision.schemaVersion).toBe('gustav-fr-lesson01-review-draft-llm-row-decision-v1');
      expect(decision.reviewerDecision).toBe('accept_review_draft');
      expect(Object.keys(decision.gateReviewerDecisions)).toEqual(REQUIRED_GATES);
      expect(new Set(Object.values(decision.gateReviewerDecisions))).toEqual(new Set(['pass']));
      expect(Object.keys(decision.gateEvidenceNotes)).toEqual(REQUIRED_GATES);
      for (const note of Object.values(decision.gateEvidenceNotes)) {
        expect(String(note).length).toBeGreaterThan(10);
      }
      expect(decision.correctedFrench).toBe('');
      expect(decision.correctedRussian).toBe('');
      expect(decision.correctedUkrainian).toBe('');
      expect(decision.correctedWordsFr).toEqual([]);
      expect(decision.reviewerImportAllowed).toBe(false);
      expect(decision.productionApplyAllowed).toBe(false);
      expect(decision.activationApproved).toBe(false);
    }
  });
});
