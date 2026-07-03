import fs from 'fs';
import path from 'path';
import { dailyPhraseContentAvailableForTarget } from '../app/daily_phrase_target_gate';
import { diagnosticContentAvailableForTarget } from '../app/diagnostic_target_gate';
import { quizContentAvailableForTarget } from '../app/quiz_target_gate';
import {
  getAvailableThematicQuizCategories,
  getThematicQuizPhrases,
} from '../app/quiz_thematic_registry';

const ROOT = path.join(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('Gustav French dev surface parity', () => {
  it('keeps Gustav source-of-truth docs on LLM official-source review instead of human review blockers', () => {
    const brain = read('docs/gustav/GUSTAV_BRAIN.md');
    const architecture = read('docs/gustav/GUSTAV_TARGET_LANGUAGE_ARCHITECTURE.md');

    for (const source of [brain, architecture]) {
      expect(source).toContain('human review is not a production gate');
      expect(source).toContain('LLM official-source coverage V2 supersedes the old human reviewer hold');
      expect(source).toContain('1600');
      expect(source).toContain('164');
      expect(source).toContain('activationApproved=false');
      expect(source).not.toContain('reviewer approval `0/546`');
      expect(source).not.toContain('locale gates `0/546`');
    }
  });

  it('keeps the English app shape visible for French dev while source-gating missing French content', () => {
    const home = read('app/(tabs)/home.tsx');
    const quizzes = read('app/(tabs)/quizzes.tsx');
    const dailyPhrase = read('components/DailyPhraseCard.tsx');
    const diagnostic = read('app/diagnostic_test.tsx');
    const lessonMenu = read('app/lesson_menu.tsx');

    expect(quizContentAvailableForTarget('fr')).toBe(true);
    expect(diagnosticContentAvailableForTarget('fr')).toBe(true);
    expect(dailyPhraseContentAvailableForTarget('fr')).toBe(true);

    expect(home).toContain("testID: 'home-quick-quizzes'");
    expect(home).toContain("key: 'daily'");
    expect(home).toContain("key: 'attest'");
    expect(home).toContain('const visibleQuickItems = quickItems');
    expect(home).toContain('const visibleActivityQuickItems = activityQuickItems');
    expect(home).not.toContain("quickItems.filter((item) => item.key !== 'quizzes')");
    expect(home).not.toContain("activityQuickItems.filter((item) => item.key !== 'attest')");
    expect(home).not.toContain("studyTarget !== 'fr' && <DailyPhraseCard");

    const quizRoot = quizzes.slice(quizzes.indexOf('export default function QuizzesScreen'));
    expect(quizRoot).toContain(': <LevelSelect sourceGated={frenchQuizBlocked}');
    expect(quizRoot).not.toContain('return <FrenchQuizUnavailable />;');
    expect(quizzes).toContain('const lockedBySourceGate = sourceGated');
    expect(quizzes).toContain('const quizCardsLocked = lockedBySourceGate || lockedByDailyLimit');
    expect(quizzes).toContain('() => getAvailableThematicQuizCategories(studyTarget)');
    expect(quizzes).not.toContain('sourceGated ? [] : getAvailableThematicQuizCategories(studyTarget)');

    expect(dailyPhrase).toContain('const dailyPhraseGateOpen = dailyPhraseContentAvailableForTarget(studyTarget)');
    expect(dailyPhrase).toContain('getTodayPhraseForTarget(studyTarget, lang)');
    expect(dailyPhrase).not.toContain("if (studyTarget === 'fr')");

    expect(diagnostic).toContain('const frenchDiagnosticBlocked = !diagnosticContentAvailableForTarget(studyTarget)');
    expect(diagnostic).toContain('loadFrenchRemoteDiagnosticQuestions(diagnosticSourceLocale, 20)');

    expect(lessonMenu).toContain("const frenchAuxiliarySourceGated = storageStudyTarget(studyTarget) === 'fr'");
    expect(lessonMenu).toContain('unavailable: frenchAuxiliarySourceGated');
    expect(lessonMenu).not.toContain('hideEnglishOnlyAuxiliary');
  });

  it('keeps thematic challenge sections visible for French dev without exposing English question banks', () => {
    const englishCategories = getAvailableThematicQuizCategories('en');
    const frenchCategories = getAvailableThematicQuizCategories('fr');

    expect(englishCategories.length).toBeGreaterThan(0);
    expect(frenchCategories.map((category) => category.id)).toEqual(
      englishCategories.map((category) => category.id),
    );
    expect(frenchCategories.every((category) => category.target === 'en')).toBe(true);

    for (const category of frenchCategories) {
      expect(getThematicQuizPhrases(category.id, { studyTarget: 'fr', sourceLocale: 'ru' })).toEqual([]);
    }
  });

  it('blocks French dev actions before global navigation keys or English loaders can open stale content', () => {
    const quizzes = read('app/(tabs)/quizzes.tsx');
    const dailyTasks = read('app/daily_tasks_screen.tsx');

    expect(quizzes).toContain('if (frenchQuizBlocked) {');
    expect(quizzes).toContain('await AsyncStorage.removeItem(QUIZ_E2E_OPEN_RESULTS_KEY)');
    expect(quizzes).toContain('if (frenchQuizBlocked) return;');
    expect(quizzes).toContain('getQuizPhrasesLoaded(quizLevel, 10, lang, studyTarget)');

    const dailyTaskQuizSlice = dailyTasks.slice(
      dailyTasks.indexOf("const openQuizOrFrenchGate = async (level: 'easy' | 'medium' | 'hard')"),
      dailyTasks.indexOf('const openDiagnosticOrFrenchGate'),
    );
    expect(dailyTaskQuizSlice).toContain('if (!quizContentAvailableForTarget(studyTarget))');
    expect(dailyTaskQuizSlice.indexOf('if (!quizContentAvailableForTarget(studyTarget))')).toBeLessThan(
      dailyTaskQuizSlice.indexOf('await AsyncStorage.setItem(quizNavLevelKey(studyTarget), level)'),
    );
  });

  it('keeps French daily-task sections visible but source-gates non-French task destinations before navigation', () => {
    const dailyTasks = read('app/daily_tasks_screen.tsx');
    const dailyTaskNavigation = read('app/daily_task_navigation.ts');

    for (const source of [dailyTasks, dailyTaskNavigation]) {
      expect(source).toContain('openVocabularyOrFrenchGate');
      expect(source).toContain("vocabularyContentAvailableForTarget(studyTarget, surface)");
      expect(source).toContain("openVocabularyOrFrenchGate('lesson_words'");
      expect(source).toContain("openVocabularyOrFrenchGate('irregular_verbs'");

      expect(source).toContain('openTrainerOrFrenchGate');
      expect(source).toContain('trainerSessionContentAvailableForTarget(studyTarget)');
      expect(source).toContain("openTrainerOrFrenchGate('/trainer')");
      expect(source).toContain("openTrainerOrFrenchGate('/trainer_words_session')");
      expect(source).toContain("openTrainerOrFrenchGate('/trainer_phrases_session')");
      expect(source).toContain("openTrainerOrFrenchGate('/trainer_arena_session')");

      expect(source).toContain('openFlashcardsOrFrenchGate');
      expect(source).toContain("flashcardsSourceGatedContentAvailableForTarget(storageStudyTarget(studyTarget), 'system_cards')");
      expect(source).toContain('openDailyPhraseOrFrenchGate');
      expect(source).toContain('dailyPhraseContentAvailableForTarget(studyTarget)');
      expect(source).toContain("lessonSupportContentAvailableForTarget(studyTarget, 'lesson_theory', lessonId)");
    }

    expect(dailyTasks).not.toContain("case 'words_learned':\n                router.push({ pathname: '/lesson_words'");
    expect(dailyTasks).not.toContain("case 'recall_session':\n            case 'recall_answers':\n            case 'recall_perfect':\n                router.push('/trainer')");
    expect(dailyTaskNavigation).not.toContain("case 'words_learned':\n      router.push({ pathname: '/lesson_words'");
    expect(dailyTaskNavigation).not.toContain("case 'recall_session':\n    case 'recall_answers':\n    case 'recall_perfect':\n      router.push('/trainer')");
  });

  it('source-gates Compass deep links before French can reach unfinished practice surfaces', () => {
    const compassHost = read('app/compass/compass_briefing_host.tsx');

    expect(compassHost).toContain('const { studyTarget } = useStudyTarget()');
    expect(compassHost).toContain('resolveSourceGatedRoute');
    expect(compassHost).toContain("flashcardsSourceGatedContentAvailableForTarget(studyTarget, 'system_cards')");
    expect(compassHost).toContain('trainerSessionContentAvailableForTarget(studyTarget)');
    expect(compassHost).toContain('diagnosticContentAvailableForTarget(studyTarget)');
    expect(compassHost).toContain('route = resolveSourceGatedRoute(route);');
    expect(compassHost).toContain('resolveSourceGatedRoute(compassInductionRoute(feature))');
  });

  it('source-gates Personal Plan trainer redirect before French can enter unfinished trainer sessions', () => {
    const trainerPlanSession = read('app/trainer_plan_session.tsx');

    expect(trainerPlanSession).toContain('trainerSessionContentAvailableForTarget(studyTarget)');
    expect(trainerPlanSession).toContain('frenchTrainerGateCopy(lang)');
    expect(trainerPlanSession).toContain("router.replace('/(tabs)/lessons' as any)");
    expect(trainerPlanSession.indexOf('trainerSessionContentAvailableForTarget(studyTarget)')).toBeLessThan(
      trainerPlanSession.indexOf('readTrainerPlanTaskContext({'),
    );
  });

  it('keeps every direct trainer session screen behind the French trainer source gate', () => {
    const trainerSessionFiles = [
      read('app/trainer_words_session.tsx'),
      read('app/trainer_phrases_session.tsx'),
      read('app/trainer_arena_session.tsx'),
    ];

    for (const source of trainerSessionFiles) {
      expect(source).toContain('trainerSessionContentAvailableForTarget(studyTarget)');
      expect(source).toContain('frenchTrainerGateCopy(lang)');
      expect(source).toContain('if (!trainerGateOpen)');
      expect(source).toContain("router.replace('/trainer' as any)");
    }
  });

  it('source-gates admin trainer QA shortcuts before they can deep-link into French trainer sessions', () => {
    const adminSettings = read('app/_admin_settings_testers.tsx');

    expect(adminSettings).toContain('trainerQaRouteGateOpen = trainerSessionContentAvailableForTarget(studyTarget)');
    expect(adminSettings).toContain('emitFrenchTrainerQaBlockedToast');
    expect(adminSettings).toContain('const openTrainerQaRoute =');
    expect(adminSettings).toContain("openTrainerQaRoute('/trainer_words_session')");
    expect(adminSettings).toContain("openTrainerQaRoute('/trainer_phrases_session')");
    expect(adminSettings).toContain("openTrainerQaRoute('/trainer_arena_session')");
    expect(adminSettings).not.toContain("onPress={() => router.push('/trainer_words_session' as any)}");
    expect(adminSettings).not.toContain("onPress={() => router.push('/trainer_phrases_session' as any)}");
    expect(adminSettings).not.toContain("onPress={() => router.push('/trainer_arena_session' as any)}");
  });

  it('source-gates AI dialog routes before French can use English scenarios or prompts', () => {
    const targetGate = read('app/ai_dialog_target_gate.ts');
    const home = read('app/ai_dialog_home.tsx');
    const session = read('app/ai_dialog_session.tsx');
    const companion = read('app/ai_companion_session.tsx');
    const dialogsTab = read('components/DialogsTabContent.tsx');
    const compassHost = read('app/compass/compass_briefing_host.tsx');
    const adminSettings = read('app/_admin_settings_testers.tsx');

    expect(targetGate).toContain("blockedRoutes: ['/ai_dialog_home', '/ai_dialog_session', '/ai_companion_session']");
    expect(targetGate).toContain('french_ai_dialog_source_gate');
    expect(targetGate).toContain('french_ai_dialog_prompt_contract');

    expect(home).toContain('<DialogsTabContent headerSlot={header} />');
    expect(home).not.toContain('aiDialogGateOpen ?');
    expect(home).not.toContain('frenchGateCopy.body');

    expect(dialogsTab).toContain('if (!aiDialogGateOpen)');
    expect(dialogsTab).toContain('Alert.alert(frenchGateCopy.title, frenchGateCopy.body');
    expect(dialogsTab).toContain("{ key: 'situations' as const");
    expect(dialogsTab).toContain('getChallengeDialogScenarios().map');
    expect(dialogsTab).not.toContain('return (\n      <View style={{ flex: 1 }}>\n        {headerSlot}');

    for (const source of [session, companion, dialogsTab]) {
      expect(source).toContain('aiDialogContentAvailableForTarget(studyTarget)');
      expect(source).toContain('frenchAiDialogGateCopy(lang)');
    }

    for (const source of [session, companion]) {
      const startTelemetryIndex = source.indexOf("trackEvent('ai_dialog_started'");
      const gateReturnIndex = source.lastIndexOf('if (!aiDialogGateOpen) return;', startTelemetryIndex);
      expect(startTelemetryIndex).toBeGreaterThanOrEqual(0);
      expect(gateReturnIndex).toBeGreaterThanOrEqual(0);
      expect(gateReturnIndex).toBeLessThan(startTelemetryIndex);
    }

    expect(compassHost).toContain("route.pathname === '/ai_dialog_home'");
    expect(compassHost).toContain('aiDialogContentAvailableForTarget(studyTarget)');

    expect(adminSettings).toContain('const openAiDialogQaRoute =');
    expect(adminSettings).toContain('aiDialogContentAvailableForTarget(studyTarget)');
    expect(adminSettings).toContain('onPress={openAiDialogQaRoute}');
    expect(adminSettings).not.toContain("onPress={() => router.push('/ai_dialog_home' as any)}");
  });
});
