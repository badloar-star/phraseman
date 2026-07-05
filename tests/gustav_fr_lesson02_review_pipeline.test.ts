import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const PACKET_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson02_review_draft_llm_packet_v1.json');
const DECISIONS_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson02_review_draft_llm_decisions_v1.jsonl');
const DECISION_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson02_review_draft_llm_decision_gate_audit_v1.json');
const RU_PACK_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson02', 'fr_lesson02_ru_pack_candidate_v1.json');
const UK_PACK_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson02', 'fr_lesson02_uk_pack_candidate_v1.json');
const PACK_CONTRACT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson02', 'fr_lesson02_pack_candidate_contract_v1.json');
const PACK_AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson02', 'fr_lesson02_pack_candidate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson02_review_pipeline.mjs');

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

describe('Gustav French lesson 2 review pipeline', () => {
  it('creates packet, accepted decisions, decision gate and RU/UK pack candidates without opening production', () => {
    const packet = JSON.parse(fs.readFileSync(PACKET_PATH, 'utf8'));
    const decisions = readJsonl(DECISIONS_PATH);
    const decisionGate = JSON.parse(fs.readFileSync(DECISION_GATE_PATH, 'utf8'));
    const ruPack = JSON.parse(fs.readFileSync(RU_PACK_PATH, 'utf8'));
    const ukPack = JSON.parse(fs.readFileSync(UK_PACK_PATH, 'utf8'));
    const contract = JSON.parse(fs.readFileSync(PACK_CONTRACT_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(PACK_AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('PASS_LESSON02_REVIEW_PIPELINE');
    expect(script).toContain('fr.lesson.02.review_draft.row.');
    expect(script).toContain('serverUploadAllowed: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('activationApproved: false');

    expect(packet.schemaVersion).toBe('gustav-fr-lesson02-review-draft-llm-packet-v1');
    expect(packet.status).toBe('HOLD_READY_FOR_LLM_REVIEW');
    expect(packet.studyTarget).toBe('fr');
    expect(packet.targetContentLang).toBe('fr');
    expect(packet.sourceLocaleCoverage).toEqual(['ru', 'uk']);
    expect(packet.sourceDraft).toMatchObject({
      path: 'docs/gustav/generated/fr/review/lesson02_full_review_draft.json',
      schemaVersion: 'gustav-fr-lesson02-full-review-draft-v1',
      status: 'REVIEW_DRAFT_HOLD',
    });
    expect(packet.rowRequests).toHaveLength(50);
    expect(packet.lessonLevelReviewRequest).toMatchObject({
      requestId: 'fr.lesson.02.review_draft.lesson_level.llm_source_review.v1',
      reasoningLevel: 'deep',
      reviewerImportAllowed: false,
      productionApplyAllowed: false,
      activationApproved: false,
    });

    for (const request of [packet.rowRequests[0], packet.rowRequests[20], packet.rowRequests[49]]) {
      expect(request.schemaVersion).toBe('gustav-fr-lesson02-review-draft-llm-row-request-v1');
      expect(request.lessonId).toBe(2);
      expect(request.studyTarget).toBe('fr');
      expect(request.instructions.requiredGateIds).toEqual(REQUIRED_GATES);
      expect(request.blankResponseTemplate.reviewerDecision).toBe('');
      expect(request.blankResponseTemplate.reviewerImportAllowed).toBe(false);
      expect(request.blankResponseTemplate.productionApplyAllowed).toBe(false);
      expect(request.blankResponseTemplate.activationApproved).toBe(false);
      expect(request.safety).toMatchObject({
        requestOnly: true,
        llmApiCalledByThisScript: false,
        reviewerImportAllowed: false,
        productionApplyAllowed: false,
        activationApproved: false,
      });
    }

    expect(decisions).toHaveLength(50);
    for (const decision of decisions) {
      expect(decision.schemaVersion).toBe('gustav-fr-lesson02-review-draft-llm-row-decision-v1');
      expect(decision.reviewerDecision).toBe('accept_review_draft');
      expect(Object.keys(decision.gateReviewerDecisions)).toEqual(REQUIRED_GATES);
      expect(new Set(Object.values(decision.gateReviewerDecisions))).toEqual(new Set(['pass']));
      expect(Object.keys(decision.gateEvidenceNotes)).toEqual(REQUIRED_GATES);
      expect(decision.reviewerImportAllowed).toBe(false);
      expect(decision.productionApplyAllowed).toBe(false);
      expect(decision.activationApproved).toBe(false);
    }

    expect(decisionGate.schemaVersion).toBe('gustav-fr-lesson02-review-draft-llm-decision-gate-audit-v1');
    expect(decisionGate.status).toBe('PASS_READY_FOR_MATERIALIZATION_CONTRACT');
    expect(decisionGate.decisionRows).toBe(50);
    expect(decisionGate.acceptedRows).toBe(50);
    expect(decisionGate.uniqueRequestIds).toBe(50);
    expect(decisionGate.openedImportApplyActivationRows).toBe(0);
    expect(decisionGate.rowsWithGateFailures).toBe(0);
    expect(decisionGate.rowsWithMissingGateNotes).toBe(0);
    expect(decisionGate.readyForMaterialization).toBe(true);
    expect(decisionGate.readyForApply).toBe(false);
    expect(decisionGate.activationApproved).toBe(false);

    for (const [sourceLocale, pack] of [['ru', ruPack], ['uk', ukPack]] as const) {
      expect(pack.schemaVersion).toBe('gustav-fr-lesson-pack-candidate-v1');
      expect(pack.status).toBe('PACK_CANDIDATE_HOLD');
      expect(pack.packId).toBe(`fr.${sourceLocale}.lesson02.review_draft_v1_pending`);
      expect(pack.studyTarget).toBe('fr');
      expect(pack.targetContentLang).toBe('fr');
      expect(pack.sourceLocale).toBe(sourceLocale);
      expect(pack.lessonId).toBe(2);
      expect(pack.rows).toHaveLength(50);
      expect(pack.counts).toMatchObject({
        rows: 50,
        wordsFrSlots: 188,
      });
      expect(pack.safety).toMatchObject({
        packCandidateOnly: true,
        appBundleModifiedByThisScript: false,
        serverUploadAllowed: false,
        firebaseUploadAllowed: false,
        runtimeDownloadsEnabled: false,
        productionApplyApproved: false,
        activationApproved: false,
      });
      expect(pack.rows[0].phraseFr).toBe('Je ne suis pas prêt.');
      expect(pack.rows[20].phraseFr).toBe('Est-ce que tu es prêt ?');
      expect(pack.rows[49].phraseFr).toBe("Est-ce que c'est ton ami ?");
      for (const row of [pack.rows[0], pack.rows[20], pack.rows[49]]) {
        expect(row.studyTarget).toBe('fr');
        expect(row.targetContentLang).toBe('fr');
        expect(row.sourceLocale).toBe(sourceLocale);
        expect(/[А-Яа-яЁёІіЇїЄєҐґ]/.test(row.phraseFr)).toBe(false);
        expect(/[�ÃÐÑÒ]/u.test(row.phraseFr + row.sourceMeaning)).toBe(false);
        expect(row.reviewDecisionRequestId).toMatch(/^fr\.lesson\.02\.review_draft\.row\.\d{2}\.llm_source_review\.v1$/);
      }
    }

    expect(ruPack.rows[0].sourceMeaning).toBe('Я не готов.');
    expect(ukPack.rows[0].sourceMeaning).toBe('Я не готовий.');

    expect(contract.schemaVersion).toBe('gustav-fr-lesson02-pack-candidate-contract-v1');
    expect(contract.status).toBe('PACK_CANDIDATE_READY_FOR_NEXT_GATES');
    expect(contract.decisionGate.status).toBe('PASS_READY_FOR_MATERIALIZATION_CONTRACT');
    expect(contract.nextRequiredGates).toEqual(expect.arrayContaining([
      'lesson02_theory_shape_materialization_gate',
      'lesson02_audio_tts_manifest_gate',
      'lesson02_integrity_gate',
      'lesson02_server_pack_manifest_gate',
      'lesson02_runtime_delivery_gate',
    ]));
    expect(audit.schemaVersion).toBe('gustav-fr-lesson02-pack-candidate-audit-v1');
    expect(audit.status).toBe('PASS_PACK_CANDIDATE_WRITTEN');
    expect(audit.blockers).toEqual([]);
    expect(audit.summary).toMatchObject({
      packCandidates: 2,
      rowsPerPack: 50,
      wordsFrSlotsPerPack: 188,
      readyForNextGates: true,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    });
  });
});
