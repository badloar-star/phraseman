import fs from 'fs';
import path from 'path';
import { FRENCH_LESSON_CURRICULUM } from '../app/french_lesson_curriculum';
import { FRENCH_CONTENT_SOURCE_GATE } from '../app/french_content_source_gate';
import { getLessonIntroScreens } from '../app/lesson_data_all';
import { FRENCH_DRAFT_INTRO_LESSON_IDS, FRENCH_INTRO_LESSON_IDS } from '../app/lesson_intro_screens_fr';
import {
  frenchLessonSupportGateCopy,
  lessonSupportContentAvailableForTarget,
  lessonSupportContentGateForTarget,
} from '../app/lesson_support_target_gate';
import {
  lessonCefrLabelForStudyTarget,
  lessonNameForStudyTarget,
  lessonNamesForStudyTarget,
} from '../app/lesson_titles_for_study_target';
import { lessonNamesForLang } from '../constants/lessons';

describe('Gustav French curriculum contract', () => {
  const HEISENBERG_LANGS = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

  it('keeps French on the existing 32-lesson rail', () => {
    expect(FRENCH_LESSON_CURRICULUM).toHaveLength(32);
    expect(FRENCH_LESSON_CURRICULUM.map((entry) => entry.id)).toEqual(
      Array.from({ length: 32 }, (_, i) => i + 1),
    );
  });

  it('maps the 32 slots to A1-A2 French stages', () => {
    expect(FRENCH_LESSON_CURRICULUM.slice(0, 8).every((entry) => entry.cefrStage === 'A1.1')).toBe(true);
    expect(FRENCH_LESSON_CURRICULUM.slice(8, 16).every((entry) => entry.cefrStage === 'A1.2')).toBe(true);
    expect(FRENCH_LESSON_CURRICULUM.slice(16, 24).every((entry) => entry.cefrStage === 'A2.1')).toBe(true);
    expect(FRENCH_LESSON_CURRICULUM.slice(24, 32).every((entry) => entry.cefrStage === 'A2.2')).toBe(true);
  });

  it('replaces English-only grammar slots instead of pretending they transfer directly', () => {
    const replaced = FRENCH_LESSON_CURRICULUM
      .filter((entry) => entry.englishBasePolicy === 'replace_english_only_slot')
      .map((entry) => entry.id);
    expect(replaced).toEqual(expect.arrayContaining([16, 17, 22, 24, 25, 28, 29, 31]));
  });

  it('serves French lesson names only for RU/UK source UI and studyTarget=fr', () => {
    expect(lessonNamesForStudyTarget('ru', 'fr')).toHaveLength(32);
    expect(lessonNamesForStudyTarget('uk', 'fr')).toHaveLength(32);
    expect(lessonNameForStudyTarget('ru', 'fr', 1)).toMatch(/être|avoir|c’est/i);
    expect(lessonNameForStudyTarget('uk', 'fr', 28)).toMatch(/COD \/ COI/);

    expect(lessonNamesForStudyTarget('es', 'fr')).toBe(lessonNamesForLang('es'));
    expect(lessonNamesForStudyTarget('ru', 'es')).toBe(lessonNamesForLang('ru'));
  });

  it('serves French lesson names for planned Heisenberg UI languages without RU/UK fallback', () => {
    for (const lang of HEISENBERG_LANGS) {
      const names = lessonNamesForStudyTarget(lang, 'fr');
      expect(names).toHaveLength(32);
      expect(names).not.toBe(lessonNamesForLang(lang));
      expect(lessonNameForStudyTarget(lang, 'fr', 1)).toBeTruthy();
      for (const name of names) {
        expect(name.trim().length).toBeGreaterThan(0);
        expect(name).not.toMatch(/[\u0400-\u04FF]/);
      }
    }
  });

  it('keeps the original English-course CEFR labels outside French target', () => {
    expect(lessonCefrLabelForStudyTarget(29, 'en')).toBe('B2');
    expect(lessonCefrLabelForStudyTarget(29, 'es')).toBe('B2');
    expect(lessonCefrLabelForStudyTarget(29, 'fr')).toBe('A2.2');
  });

  it('normalizes French lesson curriculum branches through storageStudyTarget', () => {
    const lessonDataSource = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_data_all.ts'), 'utf8');
    const titleSource = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_titles_for_study_target.ts'), 'utf8');
    const smartOptionsSource = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson1_smart_options.ts'), 'utf8');
    const targetGateSource = fs.readFileSync(path.join(process.cwd(), 'app', 'spanish_content_gate.ts'), 'utf8');

    for (const source of [lessonDataSource, titleSource, smartOptionsSource]) {
      expect(source).toContain("import { storageStudyTarget } from './target_storage_keys'");
    }
    expect(targetGateSource).toContain("import { storageStudyTarget } from './target_storage_keys'");
    expect(targetGateSource).toContain("storageStudyTarget(studyTarget) === 'fr'");
    expect(lessonDataSource).toContain("storageStudyTarget(studyTarget) === 'fr'");
    expect(titleSource).toContain("storageStudyTarget(studyTarget) === 'fr'");
    expect(smartOptionsSource).toContain('const normalizedStudyTarget = storageStudyTarget(studyTarget)');
    expect(smartOptionsSource).toContain("normalizedStudyTarget === 'fr'");
    expect(lessonDataSource).not.toContain("studyTarget === 'fr'");
    expect(titleSource).not.toContain("studyTarget === 'fr'");
    expect(smartOptionsSource).not.toContain("studyTarget === 'fr'");
    expect(targetGateSource).not.toContain("studyTarget === 'fr'");
  });

  it('keeps draft French intro screens out of runtime until source approval', () => {
    expect(FRENCH_DRAFT_INTRO_LESSON_IDS).toEqual([]);
    expect(FRENCH_INTRO_LESSON_IDS).toEqual([]);

    for (const lessonId of FRENCH_DRAFT_INTRO_LESSON_IDS) {
      expect(getLessonIntroScreens(lessonId, 'fr')).toHaveLength(0);
    }

    expect(getLessonIntroScreens(18, 'en').some((screen) => screen.screenId?.startsWith('fr_lesson_18_intro_'))).toBe(false);
    expect(getLessonIntroScreens(18, 'es').some((screen) => screen.screenId?.startsWith('fr_lesson_18_intro_'))).toBe(false);
    expect(getLessonIntroScreens(19, 'fr')).toHaveLength(0);
  });

  it('routes the theory screen through French target content and scoped theory rewards', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_help.tsx'), 'utf8');

    expect(source).toContain('getFrenchLessonIntroScreens');
    expect(source).toContain('frenchStudyActive(studyTarget)');
    expect(source).toContain('shouldBlockLessonAccess(lessonId, studyTarget)');
    expect(source).toContain("lessonSupportContentAvailableForTarget(studyTarget, 'lesson_theory', lessonId)");
    expect(source).toContain("frenchLessonSupportGateCopy('lesson_theory', lang, lessonId)");
    expect(source).toContain('const frenchTheoryScreens = isFrenchTarget && frenchTheoryAllowed ? getFrenchLessonIntroScreens(lessonId) : undefined');
    expect(source).toContain('renderFrenchTheoryFromIntroScreens(frenchTheoryScreens, t, lang, f)');
    expect(source).toContain('const plannedTheoryScreens = plannedLocale && !isFrenchTarget ? getLessonIntroScreens(lessonId, studyTarget) : undefined');
    expect(source).toContain('renderFrenchTheoryFromIntroScreens(plannedTheoryScreens, t, lang, f)');
    expect(source).toContain('key="french-theory-source-gate"');
    expect(source).toContain('text={frenchTheoryGateCopy.body}');
    expect(source).toContain('lessonTheoryXpClaimedKey(lessonId, studyTarget)');
    expect(source).toContain('const canClaimTheoryXp = !isFrenchTarget || Boolean(frenchTheoryScreens?.length)');
    expect(source).toContain('if (canClaimTheoryXp) {');
    expect(source).toContain("updateTaskProgress('open_theory', 1, studyTarget)");
    expect(source).toContain('if (claimInFlightRef.current || xpClaimed || !xpClaimHydrated || !canClaimTheoryXp) return');
    expect(source).toContain('{canClaimTheoryXp ? (');
    expect(source).not.toContain('`theory_xp_claimed_${lessonId}`');
  });

  it('opens sourced French lesson theory while keeping hint support gated from English fallback', () => {
    const gateSource = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_support_target_gate.ts'), 'utf8');

    expect(gateSource).toContain("import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys'");
    expect(gateSource).toContain("storageStudyTarget(studyTarget) !== 'fr'");
    expect(lessonSupportContentAvailableForTarget('en', 'lesson_theory', 1)).toBe(true);
    expect(lessonSupportContentAvailableForTarget('fr', 'lesson_theory', 1)).toBe(true);
    expect(lessonSupportContentAvailableForTarget('fr', 'lesson_hint', 1)).toBe(false);

    expect(lessonSupportContentGateForTarget('fr', 'lesson_theory', 1)).toMatchObject({
      enabled: true,
      studyTarget: 'fr',
      surface: 'lesson_theory',
      lessonId: 1,
      reason: 'french_lesson_theory_source_gate',
      blockedRoutes: ['/lesson_help'],
    });
    expect(lessonSupportContentGateForTarget('fr', 'lesson_hint', 1)).toMatchObject({
      enabled: false,
      studyTarget: 'fr',
      surface: 'lesson_hint',
      lessonId: 1,
      reason: 'french_lesson_hint_source_gate',
      blockedRoutes: ['/hint'],
    });

    expect(frenchLessonSupportGateCopy('lesson_theory', 'ru', 1).body).toContain('Английская теория урока 1 скрыта');
    expect(frenchLessonSupportGateCopy('lesson_hint', 'uk', 1).body).toContain('Англійську шпаргалку уроку 1 приховано');
    expect(JSON.stringify(frenchLessonSupportGateCopy('lesson_hint', 'ru', 1))).not.toMatch(/Français|Commencer|Astuce/);
  });

  it('keeps the standalone hint route behind the French support source gate', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'hint.tsx'), 'utf8');

    expect(source).toContain('useStudyTarget');
    expect(source).toContain("lessonSupportContentAvailableForTarget(studyTarget, 'lesson_hint', lessonId)");
    expect(source).toContain("frenchLessonSupportGateCopy('lesson_hint', lang, lessonId)");
    expect(source).toContain('const frenchHintCopy = frenchHintBlocked ?');
    expect(source).toContain('frenchHintCopy ? (');
    expect(source).toContain('TonalSurface');
    expect(source).toContain(': hint.render(t, lang, f)');
  });

  it('extends the global French source gate with theory and hint evidence blockers', () => {
    expect(FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation).toEqual(expect.arrayContaining([
      'french_lesson_theory_bank',
      'french_rich_intro_theory_review',
      'ru_uk_theory_prompt_review',
      'french_lesson_hint_bank',
      'french_hint_contrast_review',
      'ru_uk_hint_prompt_review',
    ]));
    expect(FRENCH_CONTENT_SOURCE_GATE.hardBlocks).toEqual(expect.arrayContaining([
      'english_theory_reuse_without_french_source_gate',
      'english_hint_bank_reuse_without_french_source_gate',
    ]));
  });

  it('keeps planned UI languages out of RU/UK/ES theory runtime branches', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_help.tsx'), 'utf8');
    const legacyRuntimePattern = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

    expect(source).not.toMatch(legacyRuntimePattern);
    expect(source).not.toMatch(/Record<['"]ru['"]\s*\|\s*['"]uk['"]\s*\|\s*['"]es['"]/);
    expect(source).not.toMatch(/\{\s*ru:\s*(?:theory|screen|example)/);
    expect(source).not.toMatch(/uk:\s*(?:theory|screen|example)/);
    expect(source).not.toMatch(/es:\s*(?:spanishBackup|screen|example)/);
  });

  it('loads French lesson rows from server pack instead of showing the old review placeholder', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson1.tsx'), 'utf8');

    expect(source).toContain("import { loadFrenchRemoteLessonRows } from './french_lesson_remote_runtime'");
    expect(source).toContain('loadFrenchRemoteLessonRows(lessonId, frenchRemoteSourceLocale)');
    expect(source).toContain('remoteFrenchLessonRows ?? getLessonData(lessonId)');
    expect(source).not.toContain('Французский материал ещё на проверке');
    expect(source).not.toContain('не будет открывать английские фразы или интро как замену');
    expect(source).toContain('const hasPlayableLessonRows = effectiveTotal > 0');
    expect(source).toContain('if (!hasPlayableLessonRows) {');
    expect(source).toContain('if (!p || !phraseHasStudyTargetContent(p, studyTarget)) return');
  });

  it('does not let direct French lesson_complete routes mint progress without sourced lesson rows', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_complete.tsx'), 'utf8');

    expect(source).toContain('canApplyCompletionRewards');
    expect(source).toContain('frenchStudyActive(studyTarget)');
    expect(source).toContain('phraseHasStudyTargetContent(phrase, studyTarget)');
    expect(source).toContain('lessonProgressKey(lessonId, studyTarget)');
    expect(source).toContain("router.replace('/lessons_list' as any)");
    expect(source.indexOf('const canApply = await canApplyCompletionRewards()')).toBeLessThan(
      source.indexOf('grantBonus()'),
    );
    expect(source.indexOf('const canApply = await canApplyCompletionRewards()')).toBeLessThan(
      source.indexOf('markLessonFinishedOnce(lessonId, studyTarget)'),
    );
  });
});
