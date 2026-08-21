export const FRENCH_CONTENT_SOURCE_GATE = Object.freeze({
  schemaVersion: 'gustav-french-content-source-gate-v1',
  researchRunId: '2026-05-19_fr_inventory_v0a1',
  draftSeedLessonLimit: 32,
  activeSeedLessonLimit: 32,
  nextBlockedLessonId: 0,
  approvedAppSeedLessonIds: Object.freeze(Array.from({ length: 32 }, (_, index) => index + 1)),
  approvedIntroLessonIds: Object.freeze(Array.from({ length: 32 }, (_, index) => index + 1)),
  policy: Object.freeze({
    sourceLocaleUi: Object.freeze(['ru', 'uk']),
    studyTarget: 'fr',
    assistantOnlyTranslationAllowed: false,
    frenchUiTranslationAllowed: false,
  }),
  requiredEvidenceBeforeActivation: Object.freeze([
    'english_base_phrase_inventory',
    'bilingual_dictionary_or_parallel_source',
    'french_grammar_reference',
    'ru_uk_meaning_review',
    'lesson_order_review',
    'rich_intro_source_notes',
    'french_exam_question_bank',
    'french_cefr_level_exam_review',
    'ru_uk_exam_prompt_review',
    'french_lesson_theory_bank',
    'french_rich_intro_theory_review',
    'ru_uk_theory_prompt_review',
    'french_lesson_hint_bank',
    'french_hint_contrast_review',
    'ru_uk_hint_prompt_review',
    'french_diagnostic_question_bank',
    'french_cefr_placement_review',
    'ru_uk_diagnostic_prompt_review',
    'french_personal_practice_training_bank',
    'french_personal_practice_mistake_taxonomy_review',
    'french_pos_workout_profile_review',
    'ru_uk_personal_practice_prompt_review',
    'french_quiz_question_bank',
    'french_quiz_distractor_review',
    'french_thematic_quiz_source_packet',
    'french_thematic_quiz_distractor_review',
    'ru_uk_quiz_prompt_review',
    'quiz_mistake_taxonomy_mapping_review',
    'french_mistake_practice_packet',
    'french_trainer_phrase_queue_review',
    'french_trainer_word_queue_review',
    'french_trainer_distractor_review',
    'french_daily_phrase_bank',
    'ru_uk_daily_phrase_prompt_review',
    'french_lesson_vocabulary_bank',
    'french_word_form_review',
    'ru_uk_vocabulary_prompt_review',
    'french_flashcard_system_bank',
    'french_flashcard_marketplace_pack_review',
    'french_flashcard_community_pack_policy',
    'ru_uk_flashcard_prompt_review',
    'french_audio_pronunciation_review',
    'french_verb_conjugation_bank',
    'french_irregular_verb_model_review',
    'ru_uk_verb_prompt_review',
    'french_preposition_drill_bank',
    'french_preposition_contrast_review',
    'ru_uk_preposition_prompt_review',
  ]),
  preferredReferenceFamilies: Object.freeze([
    'Cambridge Dictionary',
    'Oxford or Oxford-Hachette dictionary material where available',
    'Larousse',
    'CNRTL',
    'Academie francaise',
    'TV5MONDE or university-backed FLE grammar material',
  ]),
  hardBlocks: Object.freeze([
    'assistant_only_translation',
    'unsourced_phrase_activation',
    'legacy_text_only_intro_model',
    'english_grammar_calque_without_french_reference',
    'english_theory_reuse_without_french_source_gate',
    'english_hint_bank_reuse_without_french_source_gate',
    'english_exam_bank_reuse_without_french_source_gate',
    'english_diagnostic_bank_reuse_without_french_source_gate',
    'english_personal_training_reuse_without_french_source_gate',
    'english_pos_workout_profile_reuse_without_french_source_gate',
    'english_quiz_bank_reuse_without_french_source_gate',
    'english_thematic_quiz_pack_reuse_without_french_source_gate',
    'english_mistake_practice_reuse_without_french_source_gate',
    'english_trainer_queue_reuse_without_french_source_gate',
    'english_daily_phrase_reuse_without_french_source_gate',
    'english_vocabulary_bank_reuse_without_french_source_gate',
    'english_flashcard_system_bank_reuse_without_french_source_gate',
    'english_flashcard_marketplace_pack_reuse_without_french_source_gate',
    'english_flashcard_community_pack_reuse_without_french_source_gate',
    'english_irregular_verbs_reuse_without_french_source_gate',
    'english_preposition_drill_reuse_without_french_source_gate',
    'cross_target_progress_or_srs_key_reuse',
  ]),
});

export type FrenchContentSourceGate = typeof FRENCH_CONTENT_SOURCE_GATE;
export type FrenchActivationBlockReason =
  | 'app_seed_not_approved'
  | 'intro_not_approved'
  | 'assistant_only_translation_forbidden'
  | 'french_ui_translation_forbidden';

export type FrenchLessonActivationState = {
  lessonId: number;
  appSeedApproved: boolean;
  introApproved: boolean;
  appSeedRuntimeAllowed: boolean;
  introRuntimeAllowed: boolean;
  requiredEvidence: readonly string[];
  hardBlocks: readonly string[];
  blockReasons: readonly FrenchActivationBlockReason[];
};

function sortedUniqueReasons(reasons: FrenchActivationBlockReason[]): readonly FrenchActivationBlockReason[] {
  return Object.freeze([...new Set(reasons)].sort());
}

export function isFrenchLessonAppSeedApproved(lessonId: number): boolean {
  return FRENCH_CONTENT_SOURCE_GATE.approvedAppSeedLessonIds.includes(lessonId);
}

export function isFrenchLessonIntroApproved(lessonId: number): boolean {
  return FRENCH_CONTENT_SOURCE_GATE.approvedIntroLessonIds.includes(lessonId);
}

export function frenchLessonActivationState(lessonId: number): FrenchLessonActivationState {
  const appSeedApproved = isFrenchLessonAppSeedApproved(lessonId);
  const introApproved = isFrenchLessonIntroApproved(lessonId);
  const reasons: FrenchActivationBlockReason[] = [];
  if (!appSeedApproved) reasons.push('app_seed_not_approved');
  if (!introApproved) reasons.push('intro_not_approved');
  if (!FRENCH_CONTENT_SOURCE_GATE.policy.assistantOnlyTranslationAllowed) {
    if (!appSeedApproved) reasons.push('assistant_only_translation_forbidden');
  }
  if (!FRENCH_CONTENT_SOURCE_GATE.policy.frenchUiTranslationAllowed) {
    if (!introApproved) reasons.push('french_ui_translation_forbidden');
  }
  return {
    lessonId,
    appSeedApproved,
    introApproved,
    appSeedRuntimeAllowed: appSeedApproved,
    introRuntimeAllowed: introApproved,
    requiredEvidence: FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation,
    hardBlocks: FRENCH_CONTENT_SOURCE_GATE.hardBlocks,
    blockReasons: sortedUniqueReasons(reasons),
  };
}

export function assertFrenchLessonAppSeedApproved(lessonId: number): void {
  if (!isFrenchLessonAppSeedApproved(lessonId)) {
    throw new Error(`French lesson ${lessonId} app seed is blocked by source gate`);
  }
}

export function assertFrenchLessonIntroApproved(lessonId: number): void {
  if (!isFrenchLessonIntroApproved(lessonId)) {
    throw new Error(`French lesson ${lessonId} intro is blocked by source gate`);
  }
}

export function frenchLessonRuntimeAvailableForTarget(
  studyTarget: string | null | undefined,
  lessonId: number,
): boolean {
  if (studyTarget !== 'fr') return true;
  return frenchLessonActivationState(lessonId).appSeedRuntimeAllowed;
}

export default function __FrenchContentSourceGateRouteShim() {
  return null;
}
