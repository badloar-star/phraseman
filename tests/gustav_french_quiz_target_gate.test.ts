import fs from 'fs';
import path from 'path';
import { getQuizPhrases } from '../app/quiz_data';
import {
  getAvailableThematicQuizCategories,
  getThematicQuizCategory,
  getThematicQuizPhrases,
} from '../app/quiz_thematic_registry';
import {
  frenchQuizGateCopy,
  quizContentAvailableForTarget,
  quizContentGateForTarget,
} from '../app/quiz_target_gate';
import { FRENCH_CONTENT_SOURCE_GATE } from '../app/french_content_source_gate';

const ROOT = path.join(__dirname, '..');

describe('Gustav French quiz target gate', () => {
  it('blocks the English quiz bank for French while preserving English and Spanish dev behavior', () => {
    expect(quizContentAvailableForTarget('en')).toBe(true);
    expect(quizContentAvailableForTarget('es')).toBe(true);
    expect(quizContentAvailableForTarget('fr')).toBe(false);
    expect(getQuizPhrases('easy', 10, 'ru', 'en').length).toBeGreaterThan(0);
    expect(getQuizPhrases('easy', 10, 'ru', 'fr')).toEqual([]);
    expect(quizContentGateForTarget('fr')).toMatchObject({
      enabled: false,
      studyTarget: 'fr',
      reason: 'french_quiz_source_gate',
      blockedRoutes: ['/quizzes', '/(tabs)/quizzes', '/quizzes_screen'],
    });
    expect(quizContentGateForTarget('fr').requiredEvidence).toEqual(expect.arrayContaining([
      'french_quiz_question_bank',
      'french_quiz_distractor_review',
      'french_thematic_quiz_source_packet',
      'french_thematic_quiz_distractor_review',
      'ru_uk_quiz_prompt_review',
      'quiz_mistake_taxonomy_mapping_review',
    ]));
  });

  it('keeps the home quiz entry visible for French while the quiz runtime remains source-gated', () => {
    const home = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

    expect(home).toContain("testID: 'home-quick-quizzes'");
    expect(home).toContain('const visibleQuickItems = quickItems');
    expect(home).not.toContain("quickItems.filter((item) => item.key !== 'quizzes')");
    expect(quizContentAvailableForTarget('fr')).toBe(false);
    expect(getQuizPhrases('easy', 10, 'ru', 'fr')).toEqual([]);
  });

  it('keeps the tabs quiz runtime behind the French quiz source gate before English questions can render', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'quizzes.tsx'), 'utf8');

    expect(source).toContain('quizContentAvailableForTarget(studyTarget)');
    expect(source).toContain('const frenchQuizBlocked = !quizContentAvailableForTarget(studyTarget)');
    expect(source).toContain('const quizBankAvailable = useMemo(');
    expect(source).toContain('() => quizContentAvailableForTarget(studyTarget)');
    expect(source).toContain('function LevelSelect({ onSelect, sourceGated = false }');
    expect(source).toContain('const lockedBySourceGate = sourceGated');
    expect(source).toContain('const quizCardsLocked = lockedBySourceGate || lockedByDailyLimit');
    expect(source).toContain('onLockedPress={onQuizCardsLockedPress}');
    expect(source).toContain('FrenchQuizUnavailable');
    expect(source).toContain('frenchQuizGateCopy(lang)');

    const phraseSlice = source.slice(
      source.indexOf('const phrases = useMemo((): Phrase[] => {'),
      source.indexOf('const planQuizTaskCopy = useMemo'),
    );
    expect(phraseSlice).toContain('if (!quizBankAvailable)');
    expect(phraseSlice.indexOf('if (!quizBankAvailable)')).toBeLessThan(
      phraseSlice.indexOf('getQuizPhrasesLoaded(quizLevel, 10, lang, studyTarget)'),
    );
    expect(source.indexOf('if (frenchQuizBlocked)')).toBeLessThan(
      source.indexOf('? <QuizGame'),
    );
    expect(source).toContain('getQuizPhrasesLoaded(quizLevel, 10, lang, studyTarget)');
    expect(source).toContain('const navKey = quizNavLevelKey(studyTarget)');
    expect(source).toContain('await AsyncStorage.removeItem(navKey)');
    expect(source).toContain('useFocusEffect(useCallback(() => {');
    expect(source).toContain('setGameKey(k => k + 1)');
    expect(source).not.toContain("AsyncStorage.getItem('quiz_nav_level')");
    expect(source).not.toContain("AsyncStorage.removeItem('quiz_nav_level')");

    const rootSlice = source.slice(source.indexOf('export default function QuizzesScreen'));
    expect(rootSlice).toContain(': <LevelSelect sourceGated={frenchQuizBlocked}');
    expect(rootSlice).not.toContain('return <FrenchQuizUnavailable />;');
  });

  it.each([
    ['quizzes_screen route alias', 'app/quizzes_screen.tsx', "import QuizzesScreen from './(tabs)/quizzes'"],
    ['standalone quiz route alias', 'app/quizzes.tsx', "import QuizzesScreen from './(tabs)/quizzes'"],
  ])('keeps the %s inside the same gated tabs runtime', (_label, relativePath, importLine) => {
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

    expect(quizContentGateForTarget('fr').blockedRoutes).toContain('/quizzes_screen');
    expect(source).toContain(importLine);
    expect(source).toContain('<QuizzesScreen />');
    expect(source).not.toContain('getQuizPhrasesLoaded(');
    expect(source).not.toContain('getQuizPhrases(');
  });

  it('keeps tab quiz completion wired to perfect daily tasks', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'quizzes.tsx'), 'utf8');
    const doneEffectIndex = source.indexOf('// [ACHIEVEMENT + QUIZ_SCORE]');
    const doneUpdatesIndex = source.indexOf('const doneUpdates: Parameters<typeof updateMultipleTaskProgress>[0] = []', doneEffectIndex);
    const scoreIndex = source.indexOf("doneUpdates.push({ type: 'quiz_score', increment: score })", doneUpdatesIndex);
    const perfectIndex = source.indexOf("doneUpdates.push({ type: 'quiz_perfect', increment: 1 })", doneUpdatesIndex);
    const hardPerfectIndex = source.indexOf("doneUpdates.push({ type: 'quiz_hard_perfect', increment: 1 })", doneUpdatesIndex);

    expect(doneEffectIndex).toBeGreaterThanOrEqual(0);
    expect(doneUpdatesIndex).toBeGreaterThan(doneEffectIndex);
    expect(scoreIndex).toBeGreaterThan(doneUpdatesIndex);
    expect(perfectIndex).toBeGreaterThan(scoreIndex);
    expect(hardPerfectIndex).toBeGreaterThan(perfectIndex);
    expect(source.indexOf('if (!thematicCategoryId && perfect)', doneUpdatesIndex)).toBeLessThan(perfectIndex);
    expect(source.indexOf('updateMultipleTaskProgress(doneUpdates, { studyTarget })', hardPerfectIndex)).toBeGreaterThan(hardPerfectIndex);
  });

  it('keeps typed wrong-answer explanations from showing the correct-answer praise in the tabs quiz runtime', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'quizzes.tsx'), 'utf8');

    expect(source).toContain('function quizExplanationIndexForAnswer');
    expect(source).toContain('if (typedOk === true) return quizPrimaryCorrectIndex(phrase.correct)');
    expect(source).toContain('!isQuizChoiceCorrect(idx, phrase.correct)');
    expect(source).toContain('quizExplanationIndexForAnswer(current, chosen, typedOk)');
  });

  it('blocks stale French daily-task quiz navigation before writing quiz nav keys', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'daily_tasks_screen.tsx'), 'utf8');

    expect(source).toContain("import { frenchQuizGateCopy, quizContentAvailableForTarget } from './quiz_target_gate'");
    expect(source).toContain("const openQuizOrFrenchGate = async (level: 'easy' | 'medium' | 'hard')");
    expect(source).toContain('if (!quizContentAvailableForTarget(studyTarget))');
    expect(source).toContain('const copy = frenchQuizGateCopy(lang)');
    expect(source).toContain('messageRu: copy.title');
    expect(source).toContain('await AsyncStorage.setItem(quizNavLevelKey(studyTarget), level)');
    expect(source).toContain("case 'quiz_hard':");
    expect(source).toContain("await openQuizOrFrenchGate('hard')");
    expect(source).toContain("await openQuizOrFrenchGate('medium')");
    expect(source).toContain("await openQuizOrFrenchGate('easy')");
  });

  it('keeps the twice-perfect daily task wired to the quizzes entry point', () => {
    const tasksSource = fs.readFileSync(path.join(ROOT, 'app', 'daily_tasks.ts'), 'utf8');
    const screenSource = fs.readFileSync(path.join(ROOT, 'app', 'daily_tasks_screen.tsx'), 'utf8');
    const qp2Index = tasksSource.indexOf("{ id:'qp2', type:'quiz_perfect'");
    const qp2TitleIndex = tasksSource.indexOf("titleRU:'Дважды идеально'", qp2Index);
    const navCaseIndex = screenSource.indexOf("case 'quiz_perfect':");
    const navEasyIndex = screenSource.indexOf("await openQuizOrFrenchGate('easy')", navCaseIndex);
    const navWriteIndex = screenSource.indexOf('await AsyncStorage.setItem(quizNavLevelKey(studyTarget), level)');
    const navRouteIndex = screenSource.indexOf("router.replace('/quizzes_screen')", navWriteIndex);

    expect(qp2Index).toBeGreaterThanOrEqual(0);
    expect(qp2TitleIndex).toBeGreaterThan(qp2Index);
    expect(navCaseIndex).toBeGreaterThanOrEqual(0);
    expect(navEasyIndex).toBeGreaterThan(navCaseIndex);
    expect(navWriteIndex).toBeGreaterThanOrEqual(0);
    expect(navRouteIndex).toBeGreaterThan(navWriteIndex);
  });

  it('blocks dev quiz result preview before writing the global E2E result flag', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '_admin_settings_testers.tsx'), 'utf8');

    expect(source).toContain("import { frenchQuizGateCopy, quizContentAvailableForTarget } from './quiz_target_gate'");
    const guardIndex = source.indexOf('if (!quizContentAvailableForTarget(studyTarget))');
    const seedIndex = source.indexOf("AsyncStorage.setItem(QUIZ_E2E_OPEN_RESULTS_KEY, '1')");
    expect(guardIndex).toBeGreaterThanOrEqual(0);
    expect(seedIndex).toBeGreaterThan(guardIndex);
    expect(source).toContain("const ruCopy = frenchQuizGateCopy('ru')");
    expect(source).toContain("const ukCopy = frenchQuizGateCopy('uk')");
    expect(source).toContain('French quiz preview is blocked until approved quiz sources exist.');
  });

  it('clears stale global E2E result flags before French can render quiz results', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'quizzes.tsx'), 'utf8');
    const frenchBlockIndex = source.indexOf('if (frenchQuizBlocked) {');
    const clearInBlockIndex = source.indexOf('AsyncStorage.removeItem(QUIZ_E2E_OPEN_RESULTS_KEY)', frenchBlockIndex);
    const e2eReadIndex = source.indexOf('AsyncStorage.getItem(QUIZ_E2E_OPEN_RESULTS_KEY)');
    const e2eRemoveIndex = source.indexOf('AsyncStorage.removeItem(QUIZ_E2E_OPEN_RESULTS_KEY)', e2eReadIndex);
    const e2eInjectIndex = source.indexOf('setE2eInjectResults(true)');

    expect(frenchBlockIndex).toBeGreaterThanOrEqual(0);
    expect(clearInBlockIndex).toBeGreaterThan(frenchBlockIndex);
    expect(e2eReadIndex).toBeGreaterThanOrEqual(0);
    expect(e2eRemoveIndex).toBeGreaterThan(e2eReadIndex);
    expect(e2eInjectIndex).toBeGreaterThan(e2eRemoveIndex);
    expect(source.indexOf('if (frenchQuizBlocked) return;', e2eRemoveIndex)).toBeLessThan(e2eInjectIndex);
  });

  it('keeps the bundled quiz loader target-aware so French cannot receive English fallback rows', () => {
    const dataSource = fs.readFileSync(path.join(ROOT, 'app', 'quiz_data.ts'), 'utf8');
    const loaderSource = fs.readFileSync(path.join(ROOT, 'app', 'quiz_phrases_loader.ts'), 'utf8');
    const directAppCallers = fs
      .readdirSync(path.join(ROOT, 'app'), { recursive: true })
      .map(String)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => file !== 'quiz_data.ts' && file !== 'quiz_phrases_loader.ts')
      .filter((file) => fs.readFileSync(path.join(ROOT, 'app', file), 'utf8').includes('getQuizPhrases('));

    expect(dataSource).toContain("export type QuizStudyTargetLang = 'en' | 'es' | 'fr'");
    expect(dataSource).toContain("import { storageStudyTarget } from './target_storage_keys'");
    expect(dataSource).toContain("if (storageStudyTarget(studyTarget) === 'fr')");
    expect(dataSource).toContain('return [];');
    expect(loaderSource).toContain("import { storageStudyTarget } from './target_storage_keys'");
    expect(loaderSource).toContain('studyTarget: QuizStudyTargetLang =');
    expect(loaderSource).toContain("if (storageStudyTarget(studyTarget) === 'fr') return []");
    expect(loaderSource).toContain('return getQuizPhrases(difficulty, count, lang, studyTarget)');
    expect(directAppCallers).toEqual([]);
  });

  it('reloads tabs quiz rows when the active study target changes', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'quizzes.tsx'), 'utf8');
    const dependencyLists = source.match(/\}, \[[^\]]*studyTarget[^\]]*\]\);/g) ?? [];

    expect(dependencyLists.length).toBeGreaterThan(0);
    expect(source).toContain('getQuizPhrasesLoaded(quizLevel, 10, lang, studyTarget)');
  });

  it('keeps thematic English quiz banks source-gated for French while preserving dev surface parity', () => {
    const englishCategoryIds = getAvailableThematicQuizCategories('en').map(category => category.id);
    const frenchCategoryIds = getAvailableThematicQuizCategories('fr').map(category => category.id);

    expect(englishCategoryIds).toContain('kitchen-and-cooking');
    expect(frenchCategoryIds).toEqual(englishCategoryIds);
    expect(getThematicQuizCategory('kitchen-and-cooking', 'fr')).toBeTruthy();
    expect(getThematicQuizPhrases('kitchen-and-cooking', { sourceLocale: 'ru', studyTarget: 'fr' })).toEqual([]);
    expect(getThematicQuizPhrases('kitchen-and-cooking', { sourceLocale: 'ru', studyTarget: 'en' }).length).toBeGreaterThan(0);
  });

  it('extends the global French source gate to require verified French quiz materials', () => {
    expect(FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation).toEqual(expect.arrayContaining([
      'french_quiz_question_bank',
      'french_quiz_distractor_review',
      'french_thematic_quiz_source_packet',
      'french_thematic_quiz_distractor_review',
      'ru_uk_quiz_prompt_review',
    ]));
    expect(FRENCH_CONTENT_SOURCE_GATE.hardBlocks).toEqual(expect.arrayContaining([
      'english_quiz_bank_reuse_without_french_source_gate',
      'english_thematic_quiz_pack_reuse_without_french_source_gate',
    ]));
  });

  it('uses only Russian/Ukrainian source UI copy for the French quiz gate', () => {
    expect(frenchQuizGateCopy('ru').title).toBe('Французские вызовы ещё готовятся');
    expect(frenchQuizGateCopy('uk').title).toBe('Французькі виклики ще готуються');
    expect(frenchQuizGateCopy('ru').body).toContain('Английский банк вызовов скрыт');
    expect(frenchQuizGateCopy('uk').body).toContain('Англійський банк викликів приховано');
    expect(JSON.stringify(frenchQuizGateCopy('ru'))).not.toMatch(/Commencer|Quiz français|French quizzes are being prepared/);
  });
});
