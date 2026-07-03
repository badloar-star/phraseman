import fs from 'fs';
import path from 'path';
import { FRENCH_CONTENT_SOURCE_GATE } from '../app/french_content_source_gate';
import {
  frenchVocabularyGateCopy,
  vocabularyContentAvailableForTarget,
  vocabularyContentGateForTarget,
} from '../app/vocabulary_target_gate';

const ROOT = path.join(__dirname, '..');

describe('Gustav French vocabulary target gate', () => {
  it('opens French lesson words from the server pack while blocking unsourced English verb/preposition banks', () => {
    const gateSource = fs.readFileSync(path.join(ROOT, 'app', 'vocabulary_target_gate.ts'), 'utf8');

    expect(gateSource).toContain("import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys'");
    expect(gateSource).toContain("storageStudyTarget(studyTarget) !== 'fr'");
    expect(vocabularyContentAvailableForTarget('en', 'lesson_words')).toBe(true);
    expect(vocabularyContentAvailableForTarget('es', 'lesson_words')).toBe(true);
    expect(vocabularyContentAvailableForTarget('fr', 'lesson_words')).toBe(true);
    expect(vocabularyContentAvailableForTarget('fr', 'irregular_verbs')).toBe(false);
    expect(vocabularyContentAvailableForTarget('fr', 'preposition_drill')).toBe(false);

    expect(vocabularyContentGateForTarget('fr', 'lesson_words')).toMatchObject({
      enabled: true,
      studyTarget: 'fr',
      reason: 'french_lesson_vocabulary_server_pack_available',
      blockedRoutes: [],
      requiredEvidence: [
        'french_lesson_remote_server_pack',
        'french_lesson_words_remote_runtime',
        'target_scoped_lesson_words_progress',
        'no_english_vocabulary_bank_fallback',
      ],
    });
    expect(vocabularyContentGateForTarget('fr', 'irregular_verbs')).toMatchObject({
      enabled: false,
      studyTarget: 'fr',
      reason: 'french_irregular_verbs_source_gate',
      blockedRoutes: ['/lesson_irregular_verbs'],
    });
    expect(vocabularyContentGateForTarget('fr', 'preposition_drill')).toMatchObject({
      enabled: false,
      studyTarget: 'fr',
      reason: 'french_preposition_drill_source_gate',
      blockedRoutes: ['/preposition_drill'],
    });
  });

  it('uses only Russian/Ukrainian source UI copy for French vocabulary gates', () => {
    expect(frenchVocabularyGateCopy('lesson_words', 'ru').title).toBe('Французский словарь ещё на проверке');
    expect(frenchVocabularyGateCopy('lesson_words', 'uk').title).toBe('Французький словник ще на перевірці');
    expect(frenchVocabularyGateCopy('irregular_verbs', 'ru').body).toContain('Английский раздел неправильных глаголов скрыт');
    expect(frenchVocabularyGateCopy('irregular_verbs', 'uk').body).toContain('Англійський розділ неправильних дієслів приховано');
    expect(frenchVocabularyGateCopy('preposition_drill', 'ru').body).toContain('Английский тренажер предлогов скрыт');
    expect(frenchVocabularyGateCopy('preposition_drill', 'uk').body).toContain('Англійський тренажер прийменників приховано');
    expect(JSON.stringify(frenchVocabularyGateCopy('lesson_words', 'ru'))).not.toMatch(/Français|Commencer|Vocabulaire/);
    expect(JSON.stringify(frenchVocabularyGateCopy('preposition_drill', 'ru'))).not.toMatch(/Français|Commencer|Prépositions/);
  });

  it('routes lesson_words through scoped progress and French remote runtime before English words can render', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_words.tsx'), 'utf8');
    const runtimeSource = fs.readFileSync(path.join(ROOT, 'app', 'french_lesson_words_remote_runtime.ts'), 'utf8');

    expect(source).toContain("vocabularyContentAvailableForTarget(studyTarget, 'lesson_words')");
    expect(source).toContain('FrenchVocabularyUnavailable');
    expect(source).toContain('loadFrenchRemoteLessonWordBank(lessonId, frenchSourceLocale)');
    expect(source).toContain('frenchRemoteWordsLoading');
    expect(source).toContain("storageStudyTarget(studyTarget) === 'fr'");
    expect(source).toContain('if (isFrenchLessonWords) return prioritizeQaFocusWords(frenchRemoteWords ?? [], qaFocusWords)');
    expect(source).toContain('lessonWordsKey(lessonId, studyTarget)');
    expect(source).toContain('lessonWordsShardsGrantedKey(lessonId, studyTarget)');
    expect(source).toContain('shouldBlockLessonAccess(lessonId, studyTarget)');
    expect(source).toContain("logMistake(current.word.en, lessonId, 'lesson_words', 'wrong_pick', mistakeMeta, studyTarget)");
    expect(source).toContain('recordWordMistake(wKey, current.word.ru, current.word.uk, lessonId, current.word.pos, current.word.es, studyTarget)');
    expect(source).not.toContain("storageKey + '_words'");
    expect(runtimeSource).toContain("import { loadFrenchRemoteLessonRows } from './french_lesson_remote_runtime'");
    expect(runtimeSource).toContain('loadFrenchRemoteLessonRows(lessonId, sourceLocale)');
    expect(runtimeSource).toContain("pos: 'phrases'");
    expect(runtimeSource).not.toContain('lessonWordBank');
  });

  it('routes irregular verbs through scoped progress and the French source gate before English verb banks can render', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_irregular_verbs.tsx'), 'utf8');
    const menuSource = fs.readFileSync(path.join(ROOT, 'app', 'lesson_menu.tsx'), 'utf8');
    const dailySource = fs.readFileSync(path.join(ROOT, 'app', 'daily_tasks.ts'), 'utf8');

    expect(source).toContain("vocabularyContentAvailableForTarget(studyTarget, 'irregular_verbs')");
    expect(source).toContain('FrenchIrregularVerbsUnavailable');
    expect(source).toContain('irregularVerbsGlobalKey(studyTarget)');
    expect(source).toContain('lessonIrregularShardsGrantedKey(lessonId ?? 0, studyTarget)');
    expect(source).toContain('shouldBlockLessonAccess(lessonId, studyTarget)');
    expect(source).toContain("logMistake(vKey, lessonId ?? 0, 'lesson_words', 'wrong_pick', {");
    expect(source).toContain('}, studyTarget)');
    expect(source).not.toContain("AsyncStorage.getItem('irregular_verbs_global')");
    expect(source).not.toContain("AsyncStorage.setItem('irregular_verbs_global'");
    expect(source).not.toContain('`lesson${lessonId ?? 0}_irregular_shards_granted`');
    expect(menuSource).toContain('const irregularKey = irregularVerbsGlobalKey(studyTarget)');
    expect(dailySource).toContain('AsyncStorage.getItem(irregularVerbsGlobalKey(studyTarget))');
  });

  it('routes preposition drill through scoped progress and the French source gate before English preposition banks can render', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'preposition_drill.tsx'), 'utf8');

    expect(source).toContain("vocabularyContentAvailableForTarget(studyTarget, 'preposition_drill')");
    expect(source).toContain('FrenchPrepositionDrillUnavailable');
    expect(source).toContain('lessonPrepositionProgressKey(lessonId, studyTarget)');
    expect(source).toContain('prepositionDrillPerfectKey(lessonId, studyTarget)');
    expect(source).toContain('shouldBlockLessonAccess(lessonId, studyTarget)');
    expect(source).toContain('getLessonPrepositionPack(lessonId, studyTarget)');
    expect(source).toContain('preposition-drill-french-source-gate-back');
    expect(source).not.toContain("getLessonPrepositionPack(lessonId)");
    expect(source).not.toContain('preposition_drill_perfect_lesson');
  });

  it('extends the global French source gate with vocabulary, verb and preposition evidence blockers', () => {
    expect(FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation).toEqual(expect.arrayContaining([
      'french_lesson_vocabulary_bank',
      'french_word_form_review',
      'ru_uk_vocabulary_prompt_review',
      'french_verb_conjugation_bank',
      'french_irregular_verb_model_review',
      'ru_uk_verb_prompt_review',
      'french_preposition_drill_bank',
      'french_preposition_contrast_review',
      'ru_uk_preposition_prompt_review',
    ]));
    expect(FRENCH_CONTENT_SOURCE_GATE.hardBlocks).toEqual(expect.arrayContaining([
      'english_vocabulary_bank_reuse_without_french_source_gate',
      'english_irregular_verbs_reuse_without_french_source_gate',
      'english_preposition_drill_reuse_without_french_source_gate',
    ]));
  });
});
