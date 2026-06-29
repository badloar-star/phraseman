import fs from 'fs';
import path from 'path';
import {
  FRENCH_CONTENT_SOURCE_GATE,
  assertFrenchLessonAppSeedApproved,
  assertFrenchLessonIntroApproved,
  frenchLessonActivationState,
} from '../app/french_content_source_gate';
import { getLessonData, getLessonIntroScreens } from '../app/lesson_data_all';
import {
  FRENCH_DRAFT_INTRO_LESSON_IDS,
  FRENCH_INTRO_LESSON_IDS,
  validateFrenchIntroScreenShape,
} from '../app/lesson_intro_screens_fr';

const ROOT = path.join(__dirname, '..');

describe('Gustav French source gate', () => {
  it('blocks new French lesson activation beyond the sourced gate', () => {
    const seedSource = fs.readFileSync(path.join(ROOT, 'app', 'lesson_data_fr_seed.ts'), 'utf8');
    const activeSeedLessons = Array.from(seedSource.matchAll(/const LESSON_(\d+)_FRENCH_SEED/g))
      .map((match) => Number(match[1]));

    expect(activeSeedLessons).toEqual([]);
    expect(FRENCH_CONTENT_SOURCE_GATE.draftSeedLessonLimit).toBe(0);
    expect(activeSeedLessons).not.toContain(FRENCH_CONTENT_SOURCE_GATE.nextBlockedLessonId);
    expect(seedSource).not.toContain(`...LESSON_${FRENCH_CONTENT_SOURCE_GATE.nextBlockedLessonId}_FRENCH_SEED`);
    expect(FRENCH_DRAFT_INTRO_LESSON_IDS).toEqual([]);
    expect(FRENCH_CONTENT_SOURCE_GATE.activeSeedLessonLimit).toBe(0);
    expect(FRENCH_CONTENT_SOURCE_GATE.approvedAppSeedLessonIds).toEqual([]);
    expect(FRENCH_CONTENT_SOURCE_GATE.approvedIntroLessonIds).toEqual([]);
    expect(FRENCH_INTRO_LESSON_IDS).toEqual([]);

    const activation = frenchLessonActivationState(FRENCH_CONTENT_SOURCE_GATE.nextBlockedLessonId);
    expect(activation).toMatchObject({
      lessonId: FRENCH_CONTENT_SOURCE_GATE.nextBlockedLessonId,
      appSeedApproved: false,
      introApproved: false,
      appSeedRuntimeAllowed: false,
      introRuntimeAllowed: false,
    });
    expect(activation.blockReasons).toEqual(expect.arrayContaining([
      'app_seed_not_approved',
      'intro_not_approved',
      'assistant_only_translation_forbidden',
      'french_ui_translation_forbidden',
    ]));
    expect(() => assertFrenchLessonAppSeedApproved(1)).toThrow(/source gate/);
    expect(() => assertFrenchLessonIntroApproved(1)).toThrow(/source gate/);
  });

  it('does not activate draft French phrases or intros in runtime before approved evidence', () => {
    expect(getLessonData(1).some((phrase) => phrase.french || phrase.wordsFr?.length)).toBe(false);
    expect(getLessonIntroScreens(1, 'fr')).toEqual([]);
  });

  it('requires research evidence before any new French lesson becomes active', () => {
    expect(FRENCH_CONTENT_SOURCE_GATE.policy.assistantOnlyTranslationAllowed).toBe(false);
    expect(FRENCH_CONTENT_SOURCE_GATE.policy.frenchUiTranslationAllowed).toBe(false);
    expect(FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation).toEqual(expect.arrayContaining([
      'english_base_phrase_inventory',
      'bilingual_dictionary_or_parallel_source',
      'french_grammar_reference',
      'ru_uk_meaning_review',
      'lesson_order_review',
      'rich_intro_source_notes',
      'french_daily_phrase_bank',
      'french_pos_workout_profile_review',
      'ru_uk_daily_phrase_prompt_review',
    ]));
    expect(FRENCH_CONTENT_SOURCE_GATE.hardBlocks).toEqual(expect.arrayContaining([
      'assistant_only_translation',
      'unsourced_phrase_activation',
      'legacy_text_only_intro_model',
      'english_grammar_calque_without_french_reference',
      'english_daily_phrase_reuse_without_french_source_gate',
      'english_pos_workout_profile_reuse_without_french_source_gate',
      'cross_target_progress_or_srs_key_reuse',
    ]));
  });

  it('records the current research ledger while keeping the next lesson blocked', () => {
    const researchDir = path.join(ROOT, 'docs', 'gustav', 'runs', FRENCH_CONTENT_SOURCE_GATE.researchRunId, 'research');
    const ledger = JSON.parse(fs.readFileSync(path.join(researchDir, 'evidence_ledger.json'), 'utf8'));
    const lesson1Gate = fs.readFileSync(path.join(researchDir, 'lesson1_starter_source_gate.md'), 'utf8');
    const lesson1RowWorkOrder = fs.readFileSync(path.join(researchDir, 'lesson1_row_research_work_order.md'), 'utf8');
    const lesson1Batch1Review = JSON.parse(fs.readFileSync(path.join(researchDir, 'lesson1_batch1_row_review_packet.json'), 'utf8'));
    const lesson1Rows1To3LexicalEvidence = JSON.parse(fs.readFileSync(
      path.join(researchDir, 'lesson1_batch1_rows1_3_lexical_evidence_packet.json'),
      'utf8',
    ));
    const lesson1Rows4To10LexicalEvidence = JSON.parse(fs.readFileSync(
      path.join(researchDir, 'lesson1_batch1_rows4_10_lexical_evidence_packet.json'),
      'utf8',
    ));
    const lesson1Rows1To3AcceptanceWorkOrder = JSON.parse(fs.readFileSync(
      path.join(researchDir, 'lesson1_batch1_rows1_3_acceptance_work_order.json'),
      'utf8',
    ));
    const lesson1Rows4To10AcceptanceWorkOrder = JSON.parse(fs.readFileSync(
      path.join(researchDir, 'lesson1_batch1_rows4_10_acceptance_work_order.json'),
      'utf8',
    ));
    const lesson1Rows1To10GrammarFormReview = JSON.parse(fs.readFileSync(
      path.join(researchDir, 'lesson1_batch1_rows1_10_grammar_form_review_packet.json'),
      'utf8',
    ));
    const lesson1Rows1To10SourceLocaleMeaningReview = JSON.parse(fs.readFileSync(
      path.join(researchDir, 'lesson1_batch1_rows1_10_source_locale_meaning_review_packet.json'),
      'utf8',
    ));
    const lesson1Rows1To10CurriculumPlacement = JSON.parse(fs.readFileSync(
      path.join(researchDir, 'lesson1_batch1_rows1_10_curriculum_placement_packet.json'),
      'utf8',
    ));
    const lesson1Rows1To10ReviewerApprovalScaffold = JSON.parse(fs.readFileSync(
      path.join(researchDir, 'lesson1_batch1_rows1_10_reviewer_approval_record_scaffold.json'),
      'utf8',
    ));
    const lesson1Rows1To4DraftingGate = JSON.parse(fs.readFileSync(
      path.join(researchDir, 'lesson1_rows1_4_drafting_gate.json'),
      'utf8',
    ));
    const lesson1Rows1To4ReviewerApprovalTemplate = JSON.parse(fs.readFileSync(
      path.join(researchDir, 'lesson1_rows1_4_reviewer_approval_template.json'),
      'utf8',
    ));
    const lesson19Gate = fs.readFileSync(path.join(researchDir, 'lesson19_place_prepositions_source_gate.md'), 'utf8');
    const nextLessonRowLedger = JSON.parse(fs.readFileSync(
      path.join(researchDir, `lesson${FRENCH_CONTENT_SOURCE_GATE.nextBlockedLessonId}_row_ledger.json`),
      'utf8',
    ));
    const rowLedgerSchema = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'gustav', 'schemas', 'french_lesson_row_ledger.schema.json'), 'utf8'));
    const rowLedgerTemplate = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'gustav', 'templates', 'french_lesson_row_ledger.template.json'), 'utf8'));
    const sourceGateAudit = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'gustav', 'runs', FRENCH_CONTENT_SOURCE_GATE.researchRunId, 'audits', 'french_source_gate_audit.json'),
      'utf8',
    ));
    const researchJsonFirewallAudit = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'gustav', 'runs', FRENCH_CONTENT_SOURCE_GATE.researchRunId, 'audits', 'french_research_json_firewall_audit.json'),
      'utf8',
    ));

    expect(ledger.schemaVersion).toBe('gustav-evidence-ledger-v0');
    expect(ledger.studyTarget).toBe('fr');
    expect(ledger.sourceLocales).toEqual(['ru', 'uk']);
    expect(lesson1Gate).toContain('Status: research-only, not approved for app activation.');
    expect(lesson1Gate).toContain('Status: approved for lesson planning research; not approved for app activation.');
    expect(lesson1Gate).toContain('Do not re-add `LESSON_1_FRENCH_SEED`');
    expect(lesson1Gate).toContain('France Education international');
    expect(lesson1Gate).toContain('Larousse');
    expect(lesson1Gate).toContain('Cambridge English-French Dictionary');
    expect(lesson1Gate).toContain('https://www.larousse.fr/conjugaison/francais/%C3%AAtre/4440');
    expect(lesson1Gate).toContain('TV5MONDE Apprendre le français');
    expect(lesson1Gate).toContain('Grammar objective: beginner identity/introduction grammar');
    expect(lesson1Gate).toContain('Phrase candidates: remain empty');
    expect(lesson1Gate).toContain('Mistake taxonomy: draft categories may be');
    expect(lesson1RowWorkOrder).toContain('Status: research-only, not approved for app activation.');
    expect(lesson1RowWorkOrder).toContain('Connected row ledger: `lesson1_row_ledger.json`.');
    expect(lesson1RowWorkOrder).toContain('Batch 1: Rows 1-10');
    expect(lesson1RowWorkOrder).toContain('Batch 4: Rows 41-50');
    expect(lesson1RowWorkOrder).toContain('Do not add French target text.');
    expect(lesson1RowWorkOrder).toContain('The value `approved_for_apply` is forbidden in this work order.');
    expect(lesson1RowWorkOrder).toContain('Batch 1 row-review packet now lives at `lesson1_batch1_row_review_packet.json`.');
    expect(lesson1Batch1Review.schemaVersion).toBe('gustav-french-lesson-row-review-packet-v0');
    expect(lesson1Batch1Review.batchId).toBe('lesson1_rows_1_10');
    expect(lesson1Batch1Review.containsFrenchTargetText).toBe(false);
    expect(lesson1Batch1Review.containsWordsFr).toBe(false);
    expect(lesson1Batch1Review.mayWriteAppSeed).toBe(false);
    expect(lesson1Batch1Review.mayWriteIntroExamples).toBe(false);
    expect(lesson1Batch1Review.mayWriteQuizOrExam).toBe(false);
    expect(lesson1Batch1Review.rows).toHaveLength(10);
    expect(lesson1Batch1Review.rows.map((row: { phraseId: string }) => row.phraseId)).toEqual(
      Array.from({ length: 10 }, (_, index) => `lesson1_phrase_${index + 1}`),
    );
    expect(JSON.stringify(lesson1Batch1Review)).not.toContain('proposedFrench');
    expect(JSON.stringify(lesson1Batch1Review)).not.toContain('wordsFr');
    expect(lesson1Batch1Review.rows.every((row: { activationStatus: string; reviewerStatus: string }) => (
      row.activationStatus === 'blocked' && row.reviewerStatus === 'needs_more_sources'
    ))).toBe(true);
    expect(lesson1Batch1Review.rows.some((row: { phraseId: string; riskTags: string[] }) => (
      row.phraseId === 'lesson1_phrase_7' && row.riskTags.includes('impersonal_it')
    ))).toBe(true);
    expect(lesson1Batch1Review.rows.some((row: { phraseId: string; riskTags: string[] }) => (
      row.phraseId === 'lesson1_phrase_9' && row.riskTags.includes('tu_vous_policy')
    ))).toBe(true);
    expect(lesson1Rows1To3LexicalEvidence.schemaVersion).toBe('gustav-french-row-lexical-evidence-packet-v0');
    expect(lesson1Rows1To3LexicalEvidence.batchId).toBe('lesson1_rows_1_3_lexical_evidence');
    expect(lesson1Rows1To3LexicalEvidence.containsFrenchTargetText).toBe(false);
    expect(lesson1Rows1To3LexicalEvidence.containsWordsFr).toBe(false);
    expect(lesson1Rows1To3LexicalEvidence.mayWriteAppSeed).toBe(false);
    expect(lesson1Rows1To3LexicalEvidence.mayWriteIntroExamples).toBe(false);
    expect(lesson1Rows1To3LexicalEvidence.rows).toHaveLength(3);
    expect(lesson1Rows1To3LexicalEvidence.rows.map((row: { phraseId: string }) => row.phraseId)).toEqual([
      'lesson1_phrase_1',
      'lesson1_phrase_2',
      'lesson1_phrase_3',
    ]);
    expect(JSON.stringify(lesson1Rows1To3LexicalEvidence)).not.toContain('proposedFrench');
    expect(JSON.stringify(lesson1Rows1To3LexicalEvidence)).not.toContain('wordsFr');
    expect(lesson1Rows1To3LexicalEvidence.rows.every((row: { activationStatus: string; reviewerStatus: string }) => (
      row.activationStatus === 'blocked' && row.reviewerStatus === 'needs_review'
    ))).toBe(true);
    expect(lesson1Rows1To3LexicalEvidence.rows.flatMap((row: { sourceUrls: string[] }) => row.sourceUrls)).toEqual(
      expect.arrayContaining([
        'https://dictionary.cambridge.org/dictionary/english-french/here',
        'https://dictionary.cambridge.org/dictionary/english-french/ready',
        'https://dictionary.cambridge.org/dictionary/english-french/busy',
      ]),
    );
    expect(lesson1Rows4To10LexicalEvidence.schemaVersion).toBe('gustav-french-row-lexical-evidence-packet-v0');
    expect(lesson1Rows4To10LexicalEvidence.batchId).toBe('lesson1_rows_4_10_lexical_evidence');
    expect(lesson1Rows4To10LexicalEvidence.containsFrenchTargetText).toBe(false);
    expect(lesson1Rows4To10LexicalEvidence.containsWordsFr).toBe(false);
    expect(lesson1Rows4To10LexicalEvidence.mayWriteAppSeed).toBe(false);
    expect(lesson1Rows4To10LexicalEvidence.mayWriteIntroExamples).toBe(false);
    expect(lesson1Rows4To10LexicalEvidence.rows).toHaveLength(7);
    expect(lesson1Rows4To10LexicalEvidence.rows.map((row: { phraseId: string }) => row.phraseId)).toEqual(
      Array.from({ length: 7 }, (_, index) => `lesson1_phrase_${index + 4}`),
    );
    expect(JSON.stringify(lesson1Rows4To10LexicalEvidence)).not.toContain('proposedFrench');
    expect(JSON.stringify(lesson1Rows4To10LexicalEvidence)).not.toContain('wordsFr');
    expect(lesson1Rows4To10LexicalEvidence.rows.every((row: { activationStatus: string; reviewerStatus: string }) => (
      row.activationStatus === 'blocked' && row.reviewerStatus === 'needs_review'
    ))).toBe(true);
    expect(lesson1Rows4To10LexicalEvidence.rows.flatMap((row: { sourceUrls: string[] }) => row.sourceUrls)).toEqual(
      expect.arrayContaining([
        'https://dictionary.cambridge.org/us/dictionary/english-french/calm',
        'https://dictionary.cambridge.org/dictionary/english-french/together',
        'https://dictionary.cambridge.org/dictionary/english-french/happy',
        'https://dictionary.cambridge.org/dictionary/english-french/important',
        'https://dictionary.cambridge.org/us/dictionary/english-french/ok',
        'https://dictionary.cambridge.org/dictionary/english-french/right',
        'https://dictionary.cambridge.org/dictionary/english-french/safe',
      ]),
    );
    expect(lesson1Rows4To10LexicalEvidence.rows.some((row: { phraseId: string; remainingBeforeTargetText: string[] }) => (
      row.phraseId === 'lesson1_phrase_7' && row.remainingBeforeTargetText.includes('impersonal structure review')
    ))).toBe(true);
    expect(lesson1Rows4To10LexicalEvidence.rows.some((row: { phraseId: string; remainingBeforeTargetText: string[] }) => (
      row.phraseId === 'lesson1_phrase_9' && row.remainingBeforeTargetText.includes('tu/vous policy acceptance')
    ))).toBe(true);
    expect(lesson1Rows1To3AcceptanceWorkOrder.schemaVersion).toBe('gustav-french-row-acceptance-work-order-v0');
    expect(lesson1Rows1To3AcceptanceWorkOrder.batchId).toBe('lesson1_rows_1_3_acceptance_work_order');
    expect(lesson1Rows1To3AcceptanceWorkOrder.containsFrenchTargetText).toBe(false);
    expect(lesson1Rows1To3AcceptanceWorkOrder.containsWordsFr).toBe(false);
    expect(lesson1Rows1To3AcceptanceWorkOrder.mayWriteAppSeed).toBe(false);
    expect(lesson1Rows1To3AcceptanceWorkOrder.mayWriteIntroExamples).toBe(false);
    expect(lesson1Rows1To3AcceptanceWorkOrder.mayWriteQuizOrExam).toBe(false);
    expect(lesson1Rows1To3AcceptanceWorkOrder.approvalPolicy.targetTextAllowedOnlyAfter).toEqual(expect.arrayContaining([
      'grammar_form_review_accepted',
      'ru_meaning_review_accepted',
      'uk_meaning_review_accepted',
      'curriculum_placement_accepted',
      'reviewer_approval_record_written',
    ]));
    expect(lesson1Rows1To3AcceptanceWorkOrder.approvalPolicy.forbiddenUntilApproved).toEqual(expect.arrayContaining([
      'proposedFrench',
      'wordsFr',
      'introExamples',
      'quizPrompts',
      'examRows',
    ]));
    expect(lesson1Rows1To3AcceptanceWorkOrder.rows).toHaveLength(3);
    expect(lesson1Rows1To3AcceptanceWorkOrder.rows.map((row: { phraseId: string }) => row.phraseId)).toEqual([
      'lesson1_phrase_1',
      'lesson1_phrase_2',
      'lesson1_phrase_3',
    ]);
    expect(JSON.stringify(lesson1Rows1To3AcceptanceWorkOrder.rows)).not.toContain('proposedFrench');
    expect(JSON.stringify(lesson1Rows1To3AcceptanceWorkOrder.rows)).not.toContain('wordsFr');
    expect(lesson1Rows1To3AcceptanceWorkOrder.rows.every((row: { activationStatus: string; reviewerStatus: string }) => (
      row.activationStatus === 'blocked' && row.reviewerStatus === 'not_started'
    ))).toBe(true);
    expect(lesson1Rows1To3AcceptanceWorkOrder.rows.some((row: { phraseId: string; requiredAcceptance: string[] }) => (
      row.phraseId === 'lesson1_phrase_2' && row.requiredAcceptance.includes('tu_vous_policy_accepted')
    ))).toBe(true);
    expect(lesson1Rows1To3AcceptanceWorkOrder.rows.some((row: { phraseId: string; requiredAcceptance: string[] }) => (
      row.phraseId === 'lesson1_phrase_3' && row.requiredAcceptance.includes('personal_state_sense_accepted')
    ))).toBe(true);
    expect(lesson1Rows4To10AcceptanceWorkOrder.schemaVersion).toBe('gustav-french-row-acceptance-work-order-v0');
    expect(lesson1Rows4To10AcceptanceWorkOrder.batchId).toBe('lesson1_rows_4_10_acceptance_work_order');
    expect(lesson1Rows4To10AcceptanceWorkOrder.containsFrenchTargetText).toBe(false);
    expect(lesson1Rows4To10AcceptanceWorkOrder.containsWordsFr).toBe(false);
    expect(lesson1Rows4To10AcceptanceWorkOrder.mayWriteAppSeed).toBe(false);
    expect(lesson1Rows4To10AcceptanceWorkOrder.mayWriteIntroExamples).toBe(false);
    expect(lesson1Rows4To10AcceptanceWorkOrder.mayWriteQuizOrExam).toBe(false);
    expect(lesson1Rows4To10AcceptanceWorkOrder.approvalPolicy.targetTextAllowedOnlyAfter).toEqual(expect.arrayContaining([
      'grammar_form_review_accepted',
      'ru_meaning_review_accepted',
      'uk_meaning_review_accepted',
      'curriculum_placement_accepted',
      'reviewer_approval_record_written',
    ]));
    expect(lesson1Rows4To10AcceptanceWorkOrder.approvalPolicy.forbiddenUntilApproved).toEqual(expect.arrayContaining([
      'proposedFrench',
      'wordsFr',
      'introExamples',
      'quizPrompts',
      'examRows',
    ]));
    expect(lesson1Rows4To10AcceptanceWorkOrder.rows).toHaveLength(7);
    expect(lesson1Rows4To10AcceptanceWorkOrder.rows.map((row: { phraseId: string }) => row.phraseId)).toEqual(
      Array.from({ length: 7 }, (_, index) => `lesson1_phrase_${index + 4}`),
    );
    expect(JSON.stringify(lesson1Rows4To10AcceptanceWorkOrder.rows)).not.toContain('proposedFrench');
    expect(JSON.stringify(lesson1Rows4To10AcceptanceWorkOrder.rows)).not.toContain('wordsFr');
    expect(lesson1Rows4To10AcceptanceWorkOrder.rows.every((row: { activationStatus: string; reviewerStatus: string }) => (
      row.activationStatus === 'blocked' && row.reviewerStatus === 'not_started'
    ))).toBe(true);
    expect(lesson1Rows4To10AcceptanceWorkOrder.rows.some((row: { phraseId: string; requiredAcceptance: string[] }) => (
      row.phraseId === 'lesson1_phrase_7' && row.requiredAcceptance.includes('impersonal_structure_review_accepted')
    ))).toBe(true);
    expect(lesson1Rows4To10AcceptanceWorkOrder.rows.some((row: { phraseId: string; requiredAcceptance: string[] }) => (
      row.phraseId === 'lesson1_phrase_9' && row.requiredAcceptance.includes('tu_vous_policy_accepted')
    ))).toBe(true);
    expect(lesson1Rows4To10AcceptanceWorkOrder.rows.some((row: { phraseId: string; requiredAcceptance: string[] }) => (
      row.phraseId === 'lesson1_phrase_10' && row.requiredAcceptance.includes('safety_status_sense_accepted')
    ))).toBe(true);
    expect(lesson1Rows1To10GrammarFormReview.schemaVersion).toBe('gustav-french-row-grammar-form-review-packet-v0');
    expect(lesson1Rows1To10GrammarFormReview.batchId).toBe('lesson1_rows_1_10_grammar_form_review');
    expect(lesson1Rows1To10GrammarFormReview.containsFrenchTargetText).toBe(false);
    expect(lesson1Rows1To10GrammarFormReview.containsWordsFr).toBe(false);
    expect(lesson1Rows1To10GrammarFormReview.mayWriteAppSeed).toBe(false);
    expect(lesson1Rows1To10GrammarFormReview.mayWriteIntroExamples).toBe(false);
    expect(lesson1Rows1To10GrammarFormReview.mayWriteQuizOrExam).toBe(false);
    expect(lesson1Rows1To10GrammarFormReview.grammarEvidenceClaimIds).toEqual(expect.arrayContaining([
      'fr-l1-a1-communication-boundary-fei',
      'fr-l1-etre-sappeler-a1-tv5monde',
      'fr-l1-etre-conjugation-larousse',
    ]));
    expect(lesson1Rows1To10GrammarFormReview.formPolicy).toMatchObject({
      writeConjugatedTargetForms: false,
      subjectPronounPolicy: 'not_approved',
      tuVousPolicy: 'not_approved',
      adjectiveAgreementPolicy: 'not_approved',
      impersonalStructurePolicy: 'not_approved',
      pluralMixedGroupPolicy: 'not_approved',
    });
    expect(lesson1Rows1To10GrammarFormReview.rows).toHaveLength(10);
    expect(lesson1Rows1To10GrammarFormReview.rows.map((row: { phraseId: string }) => row.phraseId)).toEqual(
      Array.from({ length: 10 }, (_, index) => `lesson1_phrase_${index + 1}`),
    );
    expect(JSON.stringify(lesson1Rows1To10GrammarFormReview)).not.toContain('proposedFrench');
    expect(JSON.stringify(lesson1Rows1To10GrammarFormReview)).not.toContain('wordsFr');
    expect(lesson1Rows1To10GrammarFormReview.rows.every((row: { activationStatus: string; reviewerStatus: string }) => (
      row.activationStatus === 'blocked' && row.reviewerStatus === 'needs_review'
    ))).toBe(true);
    expect(lesson1Rows1To10GrammarFormReview.rows.some((row: { phraseId: string; grammarSlots: string[] }) => (
      row.phraseId === 'lesson1_phrase_7' && row.grammarSlots.includes('impersonal_evaluation_structure')
    ))).toBe(true);
    expect(lesson1Rows1To10GrammarFormReview.rows.some((row: { phraseId: string; requiredBeforeTargetText: string[] }) => (
      row.phraseId === 'lesson1_phrase_9' && row.requiredBeforeTargetText.includes('tu_vous_policy_review')
    ))).toBe(true);
    expect(lesson1Rows1To10GrammarFormReview.rows.some((row: { phraseId: string; requiredBeforeTargetText: string[] }) => (
      row.phraseId === 'lesson1_phrase_6' && row.requiredBeforeTargetText.includes('mixed_group_policy_review')
    ))).toBe(true);
    expect(lesson1Rows1To10SourceLocaleMeaningReview.schemaVersion).toBe(
      'gustav-french-source-locale-meaning-review-packet-v0',
    );
    expect(lesson1Rows1To10SourceLocaleMeaningReview.batchId).toBe('lesson1_rows_1_10_source_locale_meaning_review');
    expect(lesson1Rows1To10SourceLocaleMeaningReview.containsFrenchTargetText).toBe(false);
    expect(lesson1Rows1To10SourceLocaleMeaningReview.containsWordsFr).toBe(false);
    expect(lesson1Rows1To10SourceLocaleMeaningReview.mayWriteAppSeed).toBe(false);
    expect(lesson1Rows1To10SourceLocaleMeaningReview.mayWriteIntroExamples).toBe(false);
    expect(lesson1Rows1To10SourceLocaleMeaningReview.mayWriteQuizOrExam).toBe(false);
    expect(lesson1Rows1To10SourceLocaleMeaningReview.approvalPolicy.ruAndUkMustBeAcceptedSeparately).toBe(true);
    expect(lesson1Rows1To10SourceLocaleMeaningReview.approvalPolicy.sourceLocaleMayNotChooseStudyTargetRegister).toBe(true);
    expect(lesson1Rows1To10SourceLocaleMeaningReview.approvalPolicy.targetTextAllowedOnlyAfter).toEqual(expect.arrayContaining([
      'ru_meaning_review_accepted',
      'uk_meaning_review_accepted',
      'grammar_form_review_accepted',
      'curriculum_placement_accepted',
      'reviewer_approval_record_written',
    ]));
    expect(lesson1Rows1To10SourceLocaleMeaningReview.rows).toHaveLength(10);
    expect(lesson1Rows1To10SourceLocaleMeaningReview.rows.map((row: { phraseId: string }) => row.phraseId)).toEqual(
      Array.from({ length: 10 }, (_, index) => `lesson1_phrase_${index + 1}`),
    );
    expect(JSON.stringify(lesson1Rows1To10SourceLocaleMeaningReview)).not.toContain('proposedFrench');
    expect(JSON.stringify(lesson1Rows1To10SourceLocaleMeaningReview)).not.toContain('wordsFr');
    expect(lesson1Rows1To10SourceLocaleMeaningReview.rows.every((row: { activationStatus: string; reviewerStatus: string }) => (
      row.activationStatus === 'blocked' && row.reviewerStatus === 'needs_review'
    ))).toBe(true);
    expect(lesson1Rows1To10SourceLocaleMeaningReview.rows.some((row: { phraseId: string; sourceLocaleRiskTags: string[] }) => (
      row.phraseId === 'lesson1_phrase_2' && row.sourceLocaleRiskTags.includes('tu_vous_policy')
    ))).toBe(true);
    expect(lesson1Rows1To10SourceLocaleMeaningReview.rows.some((row: { phraseId: string; meaningFunction: string }) => (
      row.phraseId === 'lesson1_phrase_7' && row.meaningFunction === 'impersonal evaluation'
    ))).toBe(true);
    expect(lesson1Rows1To10SourceLocaleMeaningReview.rows.some((row: { phraseId: string; ruReviewFocus: string[]; ukReviewFocus: string[] }) => (
      row.phraseId === 'lesson1_phrase_9'
      && row.ruReviewFocus.includes('polite/plural вы may not decide target register')
      && row.ukReviewFocus.includes('polite/plural ви may not decide target register')
    ))).toBe(true);
    expect(lesson1Rows1To10CurriculumPlacement.schemaVersion).toBe('gustav-french-curriculum-placement-packet-v0');
    expect(lesson1Rows1To10CurriculumPlacement.batchId).toBe('lesson1_rows_1_10_curriculum_placement');
    expect(lesson1Rows1To10CurriculumPlacement.containsFrenchTargetText).toBe(false);
    expect(lesson1Rows1To10CurriculumPlacement.containsWordsFr).toBe(false);
    expect(lesson1Rows1To10CurriculumPlacement.mayWriteAppSeed).toBe(false);
    expect(lesson1Rows1To10CurriculumPlacement.mayWriteIntroExamples).toBe(false);
    expect(lesson1Rows1To10CurriculumPlacement.mayWriteQuizOrExam).toBe(false);
    expect(lesson1Rows1To10CurriculumPlacement.curriculumStatus).toBe('needs_reviewer_acceptance');
    expect(lesson1Rows1To10CurriculumPlacement.lessonObjectiveCandidate.orderingPolicy).toContain(
      'French may reorder',
    );
    expect(lesson1Rows1To10CurriculumPlacement.lessonObjectiveCandidate.mustNotDo).toEqual(expect.arrayContaining([
      'Do not copy English Lesson 1 order as French curriculum by default.',
      'Do not write French target text from this placement packet.',
    ]));
    expect(lesson1Rows1To10CurriculumPlacement.rows).toHaveLength(10);
    expect(lesson1Rows1To10CurriculumPlacement.rows.map((row: { phraseId: string }) => row.phraseId)).toEqual(
      Array.from({ length: 10 }, (_, index) => `lesson1_phrase_${index + 1}`),
    );
    expect(JSON.stringify(lesson1Rows1To10CurriculumPlacement)).not.toContain('proposedFrench');
    expect(JSON.stringify(lesson1Rows1To10CurriculumPlacement)).not.toContain('wordsFr');
    expect(lesson1Rows1To10CurriculumPlacement.rows.every((row: { activationStatus: string }) => (
      row.activationStatus === 'blocked'
    ))).toBe(true);
    expect(lesson1Rows1To10CurriculumPlacement.candidateLesson1KeepRows).toEqual([
      'lesson1_phrase_1',
      'lesson1_phrase_2',
      'lesson1_phrase_3',
      'lesson1_phrase_4',
    ]);
    expect(lesson1Rows1To10CurriculumPlacement.candidateDeferredRows).toEqual([
      'lesson1_phrase_5',
      'lesson1_phrase_6',
      'lesson1_phrase_7',
      'lesson1_phrase_8',
      'lesson1_phrase_9',
      'lesson1_phrase_10',
    ]);
    expect(lesson1Rows1To10CurriculumPlacement.rows.some((row: { phraseId: string; placementDecision: string }) => (
      row.phraseId === 'lesson1_phrase_7' && row.placementDecision === 'defer_candidate_impersonal_structure'
    ))).toBe(true);
    expect(lesson1Rows1To10CurriculumPlacement.rows.some((row: { phraseId: string; placementDecision: string }) => (
      row.phraseId === 'lesson1_phrase_9' && row.placementDecision === 'defer_candidate_until_register_policy'
    ))).toBe(true);
    expect(lesson1Rows1To10ReviewerApprovalScaffold.schemaVersion).toBe(
      'gustav-french-reviewer-approval-record-scaffold-v0',
    );
    expect(lesson1Rows1To10ReviewerApprovalScaffold.batchId).toBe('lesson1_rows_1_10_reviewer_approval_scaffold');
    expect(lesson1Rows1To10ReviewerApprovalScaffold.containsFrenchTargetText).toBe(false);
    expect(lesson1Rows1To10ReviewerApprovalScaffold.containsWordsFr).toBe(false);
    expect(lesson1Rows1To10ReviewerApprovalScaffold.mayWriteAppSeed).toBe(false);
    expect(lesson1Rows1To10ReviewerApprovalScaffold.mayWriteIntroExamples).toBe(false);
    expect(lesson1Rows1To10ReviewerApprovalScaffold.mayWriteQuizOrExam).toBe(false);
    expect(lesson1Rows1To10ReviewerApprovalScaffold.approvedForApply).toBe(false);
    expect(lesson1Rows1To10ReviewerApprovalScaffold.approvalRecordStatus).toBe('scaffold_only_not_approved');
    expect(lesson1Rows1To10ReviewerApprovalScaffold.requiredBeforeAnyFrenchTargetText).toEqual(expect.arrayContaining([
      'lexical_evidence_review_accepted',
      'grammar_form_review_accepted',
      'ru_meaning_review_accepted',
      'uk_meaning_review_accepted',
      'curriculum_placement_accepted',
      'reviewer_identity_recorded',
      'approval_timestamp_recorded',
    ]));
    expect(lesson1Rows1To10ReviewerApprovalScaffold.approvalFieldsToFillLater).toMatchObject({
      reviewerId: null,
      reviewerRole: null,
      reviewedAt: null,
      acceptedRows: [],
      deferredRows: [],
      approvalNotes: null,
    });
    expect(lesson1Rows1To10ReviewerApprovalScaffold.lessonLevelDecision.status).toBe('not_approved');
    expect(lesson1Rows1To10ReviewerApprovalScaffold.lessonLevelDecision.candidateKeepRows).toEqual([
      'lesson1_phrase_1',
      'lesson1_phrase_2',
      'lesson1_phrase_3',
      'lesson1_phrase_4',
    ]);
    expect(lesson1Rows1To10ReviewerApprovalScaffold.lessonLevelDecision.candidateDeferredRows).toEqual([
      'lesson1_phrase_5',
      'lesson1_phrase_6',
      'lesson1_phrase_7',
      'lesson1_phrase_8',
      'lesson1_phrase_9',
      'lesson1_phrase_10',
    ]);
    expect(lesson1Rows1To10ReviewerApprovalScaffold.rows).toHaveLength(10);
    expect(JSON.stringify(lesson1Rows1To10ReviewerApprovalScaffold)).not.toContain('proposedFrench');
    expect(JSON.stringify(lesson1Rows1To10ReviewerApprovalScaffold)).not.toContain('wordsFr');
    expect(lesson1Rows1To10ReviewerApprovalScaffold.rows.every((row: { activationStatus: string; approvedForApply: boolean }) => (
      row.activationStatus === 'blocked' && row.approvedForApply === false
    ))).toBe(true);
    expect(lesson1Rows1To10ReviewerApprovalScaffold.rows.some((row: { phraseId: string; missingAcceptances: string[] }) => (
      row.phraseId === 'lesson1_phrase_7' && row.missingAcceptances.includes('impersonal_structure_source_review_accepted')
    ))).toBe(true);
    expect(lesson1Rows1To10ReviewerApprovalScaffold.rows.some((row: { phraseId: string; missingAcceptances: string[] }) => (
      row.phraseId === 'lesson1_phrase_9' && row.missingAcceptances.includes('tu_vous_policy_accepted')
    ))).toBe(true);
    expect(lesson1Rows1To4DraftingGate.schemaVersion).toBe('gustav-french-drafting-gate-v0');
    expect(lesson1Rows1To4DraftingGate.gateId).toBe('lesson1_rows1_4_drafting_gate');
    expect(lesson1Rows1To4DraftingGate.containsFrenchTargetText).toBe(false);
    expect(lesson1Rows1To4DraftingGate.containsWordsFr).toBe(false);
    expect(lesson1Rows1To4DraftingGate.mayWriteAppSeed).toBe(false);
    expect(lesson1Rows1To4DraftingGate.mayWriteIntroExamples).toBe(false);
    expect(lesson1Rows1To4DraftingGate.mayWriteQuizOrExam).toBe(false);
    expect(lesson1Rows1To4DraftingGate.mayDraftTargetText).toBe(false);
    expect(lesson1Rows1To4DraftingGate.approvedForApply).toBe(false);
    expect(lesson1Rows1To4DraftingGate.requiredApprovalRecord.currentStatus).toBe('scaffold_only_not_approved');
    expect(lesson1Rows1To4DraftingGate.requiredApprovalRecord.requiredStatusBeforeDrafting).toBe('approved_by_reviewer');
    expect(lesson1Rows1To4DraftingGate.allowedNow).toEqual(expect.arrayContaining([
      'verify source coverage',
      'prepare drafting checklist',
      'define required reviewer decisions',
      'define forbidden output fields',
    ]));
    expect(lesson1Rows1To4DraftingGate.forbiddenNow).toEqual(expect.arrayContaining([
      'proposedFrench',
      'wordsFr',
      'introExamples',
      'app seed writes',
      'runtime activation',
    ]));
    expect(lesson1Rows1To4DraftingGate.rows).toHaveLength(4);
    expect(lesson1Rows1To4DraftingGate.rows.map((row: { phraseId: string }) => row.phraseId)).toEqual([
      'lesson1_phrase_1',
      'lesson1_phrase_2',
      'lesson1_phrase_3',
      'lesson1_phrase_4',
    ]);
    expect(JSON.stringify(lesson1Rows1To4DraftingGate)).not.toContain('proposedFrench":');
    expect(JSON.stringify(lesson1Rows1To4DraftingGate)).not.toContain('wordsFr":');
    expect(lesson1Rows1To4DraftingGate.rows.every((row: { activationStatus: string; draftingStatus: string }) => (
      row.activationStatus === 'blocked' && row.draftingStatus === 'blocked_until_reviewer_approval'
    ))).toBe(true);
    expect(lesson1Rows1To4DraftingGate.rows.some((row: { phraseId: string; draftingChecklist: string[] }) => (
      row.phraseId === 'lesson1_phrase_2' && row.draftingChecklist.includes('accept tu/vous policy')
    ))).toBe(true);
    expect(lesson1Rows1To4DraftingGate.rows.some((row: { phraseId: string; draftingChecklist: string[] }) => (
      row.phraseId === 'lesson1_phrase_4' && row.draftingChecklist.includes('accept feminine singular agreement')
    ))).toBe(true);
    expect(lesson1Rows1To4ReviewerApprovalTemplate.schemaVersion).toBe(
      'gustav-french-reviewer-approval-template-v0',
    );
    expect(lesson1Rows1To4ReviewerApprovalTemplate.templateId).toBe('lesson1_rows1_4_reviewer_approval_template');
    expect(lesson1Rows1To4ReviewerApprovalTemplate.containsFrenchTargetText).toBe(false);
    expect(lesson1Rows1To4ReviewerApprovalTemplate.containsWordsFr).toBe(false);
    expect(lesson1Rows1To4ReviewerApprovalTemplate.mayWriteAppSeed).toBe(false);
    expect(lesson1Rows1To4ReviewerApprovalTemplate.mayWriteIntroExamples).toBe(false);
    expect(lesson1Rows1To4ReviewerApprovalTemplate.mayWriteQuizOrExam).toBe(false);
    expect(lesson1Rows1To4ReviewerApprovalTemplate.mayDraftTargetText).toBe(false);
    expect(lesson1Rows1To4ReviewerApprovalTemplate.approvedByReviewer).toBe(false);
    expect(lesson1Rows1To4ReviewerApprovalTemplate.approvedForApply).toBe(false);
    expect(lesson1Rows1To4ReviewerApprovalTemplate.reviewer).toMatchObject({
      reviewerId: null,
      reviewerRole: null,
      reviewedAt: null,
    });
    expect(lesson1Rows1To4ReviewerApprovalTemplate.requiredReviewerActions).toEqual(expect.arrayContaining([
      'confirm lexical evidence for each row',
      'confirm grammar form policy for each row',
      'confirm RU meaning for each row',
      'confirm UK meaning for each row',
      'confirm curriculum placement for each row',
      'record accepted evidence claim ids',
      'record explicit approval timestamp',
    ]));
    expect(lesson1Rows1To4ReviewerApprovalTemplate.forbiddenWithoutApproval).toEqual(expect.arrayContaining([
      'French target text',
      'wordsFr',
      'intro examples',
      'app seed writes',
      'runtime activation',
    ]));
    expect(lesson1Rows1To4ReviewerApprovalTemplate.rows).toHaveLength(4);
    expect(lesson1Rows1To4ReviewerApprovalTemplate.rows.map((row: { phraseId: string }) => row.phraseId)).toEqual([
      'lesson1_phrase_1',
      'lesson1_phrase_2',
      'lesson1_phrase_3',
      'lesson1_phrase_4',
    ]);
    expect(JSON.stringify(lesson1Rows1To4ReviewerApprovalTemplate)).not.toContain('proposedFrench');
    expect(JSON.stringify(lesson1Rows1To4ReviewerApprovalTemplate)).not.toContain('wordsFr":');
    expect(lesson1Rows1To4ReviewerApprovalTemplate.rows.every((row: {
      activationStatus: string;
      approvalStatus: string;
      approvedForDrafting: boolean;
      approvedForApply: boolean;
      acceptedEvidenceClaimIds: string[];
      acceptedDecisions: string[];
    }) => (
      row.activationStatus === 'blocked'
      && row.approvalStatus === 'not_reviewed'
      && row.approvedForDrafting === false
      && row.approvedForApply === false
      && row.acceptedEvidenceClaimIds.length === 0
      && row.acceptedDecisions.length === 0
    ))).toBe(true);
    expect(ledger.claims).toEqual(expect.arrayContaining([
      expect.objectContaining({
        claimId: 'fr-l1-a1-communication-boundary-fei',
        sourceName: 'France Education international, Manuel du candidat DELF A1',
        reviewerStatus: 'needs_review',
      }),
      expect.objectContaining({
        claimId: 'fr-l1-etre-sappeler-a1-tv5monde',
        sourceName: 'TV5MONDE Apprendre le francais',
        reviewerStatus: 'needs_review',
      }),
      expect.objectContaining({
        claimId: 'fr-l1-etre-conjugation-larousse',
        sourceUrl: 'https://www.larousse.fr/conjugaison/francais/%C3%AAtre/4440',
        reviewerStatus: 'needs_review',
      }),
      expect.objectContaining({
        claimId: 'fr-l1-be-lexical-risk-cambridge',
        sourceName: 'Cambridge English-French Dictionary',
        reviewerStatus: 'needs_review',
      }),
      expect.objectContaining({
        claimId: 'fr-l1-row1-here-cambridge',
        sourceUrl: 'https://dictionary.cambridge.org/dictionary/english-french/here',
        reviewerStatus: 'needs_review',
      }),
      expect.objectContaining({
        claimId: 'fr-l1-row2-ready-cambridge',
        sourceUrl: 'https://dictionary.cambridge.org/dictionary/english-french/ready',
        reviewerStatus: 'needs_review',
      }),
      expect.objectContaining({
        claimId: 'fr-l1-row3-busy-cambridge',
        sourceUrl: 'https://dictionary.cambridge.org/dictionary/english-french/busy',
        reviewerStatus: 'needs_review',
      }),
      expect.objectContaining({
        claimId: 'fr-l1-row4-calm-cambridge',
        sourceUrl: 'https://dictionary.cambridge.org/us/dictionary/english-french/calm',
        reviewerStatus: 'needs_review',
      }),
      expect.objectContaining({
        claimId: 'fr-l1-row5-together-cambridge',
        sourceUrl: 'https://dictionary.cambridge.org/dictionary/english-french/together',
        reviewerStatus: 'needs_review',
      }),
      expect.objectContaining({
        claimId: 'fr-l1-row6-happy-cambridge',
        sourceUrl: 'https://dictionary.cambridge.org/dictionary/english-french/happy',
        reviewerStatus: 'needs_review',
      }),
      expect.objectContaining({
        claimId: 'fr-l1-row7-important-cambridge',
        sourceUrl: 'https://dictionary.cambridge.org/dictionary/english-french/important',
        reviewerStatus: 'needs_review',
      }),
      expect.objectContaining({
        claimId: 'fr-l1-row8-ok-cambridge',
        sourceUrl: 'https://dictionary.cambridge.org/us/dictionary/english-french/ok',
        reviewerStatus: 'needs_review',
      }),
      expect.objectContaining({
        claimId: 'fr-l1-row9-right-cambridge',
        sourceUrl: 'https://dictionary.cambridge.org/dictionary/english-french/right',
        reviewerStatus: 'needs_review',
      }),
      expect.objectContaining({
        claimId: 'fr-l1-row10-safe-cambridge',
        sourceUrl: 'https://dictionary.cambridge.org/dictionary/english-french/safe',
        reviewerStatus: 'needs_review',
      }),
    ]));
    expect(ledger.claims.some((claim: { claimId: string; reviewerStatus: string }) => (
      claim.claimId === 'fr-l1-app-activation-block' && claim.reviewerStatus === 'accepted'
    ))).toBe(true);
    expect(lesson19Gate).toContain('Status: research-only, not approved for app activation.');
    expect(lesson19Gate).toContain('Any row without accepted status stays out of `app/lesson_data_fr_seed.ts`.');
    expect(rowLedgerSchema.properties.schemaVersion.const).toBe('gustav-french-lesson-row-ledger-v0');
    expect(rowLedgerSchema.properties.activeAppSeedAllowed.description).toContain('false until');
    expect(rowLedgerTemplate.schemaVersion).toBe('gustav-french-lesson-row-ledger-v0');
    expect(rowLedgerTemplate.lessonId).toBe(1);
    expect(rowLedgerTemplate.sourceFile).toBe('app/lesson_data_1_8.ts');
    expect(rowLedgerTemplate.activeAppSeedAllowed).toBe(false);
    expect(nextLessonRowLedger.schemaVersion).toBe('gustav-french-lesson-row-ledger-v0');
    expect(nextLessonRowLedger.lessonId).toBe(FRENCH_CONTENT_SOURCE_GATE.nextBlockedLessonId);
    expect(nextLessonRowLedger.activeAppSeedAllowed).toBe(false);
    expect(nextLessonRowLedger.rows).toHaveLength(50);
    expect(nextLessonRowLedger.rows.every((row: { proposedFrench: unknown; wordsFr: unknown; activationStatus: string }) => (
      row.proposedFrench === null && row.wordsFr === null && row.activationStatus === 'blocked'
    ))).toBe(true);
    expect(sourceGateAudit.status).toBe('PASS');
    expect(sourceGateAudit.summary.rowLedgerRows).toBe(50);
    expect(sourceGateAudit.summary.rowLedgerProposedFrenchRows).toBe(0);
    expect(sourceGateAudit.summary.mayActivateNextLesson).toBe(false);
    expect(researchJsonFirewallAudit.schemaVersion).toBe('gustav-french-research-json-firewall-audit-v0');
    expect(researchJsonFirewallAudit.status).toBe('PASS');
    expect(researchJsonFirewallAudit.summary.scannedJsonFiles).toBeGreaterThanOrEqual(14);
    expect(researchJsonFirewallAudit.summary.forbiddenOutputFields).toBe(0);
    expect(researchJsonFirewallAudit.summary.forbiddenPermissionFlags).toBe(0);
    expect(researchJsonFirewallAudit.summary.falseApprovalFlags).toBe(0);
    expect(researchJsonFirewallAudit.summary.runtimeActivationFlags).toBe(0);
    expect(researchJsonFirewallAudit.summary.mayStartFrenchGeneration).toBe(false);
    expect(researchJsonFirewallAudit.summary.mayModifyProductionAppFiles).toBe(false);
    expect(researchJsonFirewallAudit.firewallPolicy.forbiddenOutputKeys).toEqual(expect.arrayContaining([
      'proposedFrench',
      'wordsFr',
      'french',
      'introExamples',
      'quizPrompts',
      'examRows',
    ]));
    const normalizedResearchScannedFiles = researchJsonFirewallAudit.scannedFiles.map((file: string) => file.replace(/\\/g, '/'));
    expect(normalizedResearchScannedFiles).toEqual(expect.arrayContaining([
      'docs/gustav/runs/2026-05-19_fr_inventory_v0a1/research/lesson1_rows1_4_reviewer_approval_template.json',
      'docs/gustav/runs/2026-05-19_fr_inventory_v0a1/research/lesson1_rows1_4_drafting_gate.json',
    ]));
  });

  it('keeps French seed and intro files behind runtime source-gate assertions', () => {
    const seedSource = fs.readFileSync(path.join(ROOT, 'app', 'lesson_data_fr_seed.ts'), 'utf8');
    const introSource = fs.readFileSync(path.join(ROOT, 'app', 'lesson_intro_screens_fr.ts'), 'utf8');

    expect(seedSource).toContain('APPROVED_FRENCH_LESSON_SEEDS');
    expect(seedSource).toContain('assertFrenchLessonAppSeedApproved(lessonId)');
    expect(seedSource).not.toContain('LESSON_1_FRENCH_SEED');
    expect(introSource).toContain('assertFrenchLessonIntroApproved(lessonId)');
    expect(introSource).toContain('assertFrenchIntroScreensRichShape(lessonId, screens)');
    expect(introSource).toContain('validateFrenchIntroScreenShape');
    expect(introSource).toContain('FRENCH_INTRO_SCREENS');
    expect(introSource).not.toContain('fr_lesson_1_intro_');
  });

  it('rejects legacy text-only French intro screen drafts', () => {
    const issues = validateFrenchIntroScreenShape({
      lessonId: 1,
      screenId: 'lesson_1_intro_1_concept',
      order: 1,
      kind: 'why',
      titleRU: 'Legacy title',
      titleUK: 'Legacy title',
      textRU: 'Legacy plain text',
      textUK: 'Legacy plain text',
      examples: [{ en: 'legacy target text', trRU: 'meaning', trUK: 'meaning' }],
    } as any, 1, 0);

    expect(issues).toEqual(expect.arrayContaining([
      expect.stringContaining('screenId'),
      expect.stringContaining('kind'),
      expect.stringContaining('linesRU'),
      expect.stringContaining('linesUK'),
      expect.stringContaining('examples[0].en'),
      expect.stringContaining('developerNotes'),
    ]));
  });

  it('accepts the connected RU/UK rich intro shape without activating French content', () => {
    const issues = validateFrenchIntroScreenShape({
      lessonId: 1,
      screenId: 'fr_lesson_1_intro_1_concept',
      order: 1,
      kind: 'concept',
      titleRU: 'Reviewed source title',
      titleUK: 'Reviewed source title',
      linesRU: [
        { type: 'text', parts: [{ text: 'Reviewed source explanation.' }] },
        { type: 'example', parts: [{ text: '[source-approved French target line]', tone: 'accent' }] },
      ],
      linesUK: [
        { type: 'text', parts: [{ text: 'Reviewed source explanation.' }] },
        { type: 'example', parts: [{ text: '[source-approved French target line]', tone: 'accent' }] },
      ],
      examples: [{
        en: [{ text: '[source-approved French target line]' }],
        ru: 'Reviewed Russian meaning',
        uk: 'Reviewed Ukrainian meaning',
      }],
      developerNotes: {
        screenGoal: 'Reviewed goal.',
        visualPriority: ['Reviewed priority.'],
        highlightRules: ['Reviewed highlight rule.'],
        forbiddenContent: ['Reviewed forbidden content.'],
        layoutRules: ['Reviewed layout rule.'],
      },
    } as any, 1, 0);

    expect(issues).toEqual([]);
    expect(FRENCH_INTRO_LESSON_IDS).toEqual([]);
  });
});
