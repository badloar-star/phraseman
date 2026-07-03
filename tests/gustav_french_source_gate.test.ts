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
  validateFrenchIntroScreenShape,
} from '../app/lesson_intro_screens_fr';

const ROOT = path.join(__dirname, '..');
const APPROVED_LESSON_IDS = Array.from({ length: 32 }, (_, index) => index + 1);

describe('Gustav French source gate', () => {
  it('opens all French lesson ids for runtime while keeping French content out of the app seed bundle', () => {
    const seedSource = fs.readFileSync(path.join(ROOT, 'app', 'lesson_data_fr_seed.ts'), 'utf8');
    const activeSeedLessons = Array.from(seedSource.matchAll(/const LESSON_(\d+)_FRENCH_SEED/g))
      .map((match) => Number(match[1]));

    expect(activeSeedLessons).toEqual([]);
    expect(FRENCH_CONTENT_SOURCE_GATE.draftSeedLessonLimit).toBe(32);
    expect(FRENCH_CONTENT_SOURCE_GATE.activeSeedLessonLimit).toBe(32);
    expect(FRENCH_CONTENT_SOURCE_GATE.nextBlockedLessonId).toBe(0);
    expect(FRENCH_CONTENT_SOURCE_GATE.approvedAppSeedLessonIds).toEqual(APPROVED_LESSON_IDS);
    expect(FRENCH_CONTENT_SOURCE_GATE.approvedIntroLessonIds).toEqual(APPROVED_LESSON_IDS);
    expect(FRENCH_DRAFT_INTRO_LESSON_IDS).toEqual([]);
    expect(seedSource).not.toContain('_FRENCH_SEED = [');

    const activation = frenchLessonActivationState(1);
    expect(activation).toMatchObject({
      lessonId: 1,
      appSeedApproved: true,
      introApproved: true,
      appSeedRuntimeAllowed: true,
      introRuntimeAllowed: true,
    });
    expect(activation.blockReasons).toEqual([]);
    expect(() => assertFrenchLessonAppSeedApproved(1)).not.toThrow();
    expect(() => assertFrenchLessonIntroApproved(1)).not.toThrow();
  });

  it('does not activate bundled draft French phrases even though the runtime server pack is approved', () => {
    expect(getLessonData(1).some((phrase) => phrase.french || phrase.wordsFr?.length)).toBe(false);
    expect(getLessonIntroScreens(1, 'fr').every((screen, index) => (
      validateFrenchIntroScreenShape(screen, 1, index).length === 0
    ))).toBe(true);
  });

  it('keeps research evidence and anti-mixing hard blocks as the activation contract', () => {
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
});
