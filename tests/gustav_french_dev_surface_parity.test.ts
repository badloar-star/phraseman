import fs from 'fs';
import path from 'path';
import { dailyPhraseContentAvailableForTarget } from '../app/daily_phrase_target_gate';
import { diagnosticContentAvailableForTarget } from '../app/diagnostic_target_gate';

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

  it('keeps active English surfaces visible for French dev while source-gating missing French content', () => {
    const dailyPhrase = read('components/DailyPhraseCard.tsx');
    const diagnostic = read('app/diagnostic_test.tsx');
    const lessonMenu = read('app/lesson_menu.tsx');

    expect(diagnosticContentAvailableForTarget('fr')).toBe(true);
    expect(dailyPhraseContentAvailableForTarget('fr')).toBe(true);

    expect(dailyPhrase).toContain('const dailyPhraseGateOpen = dailyPhraseContentAvailableForTarget(studyTarget)');
    expect(dailyPhrase).toContain('getTodayPhraseForTarget(studyTarget, lang)');
    expect(dailyPhrase).not.toContain("if (studyTarget === 'fr')");

    expect(diagnostic).toContain('const frenchDiagnosticBlocked = !diagnosticContentAvailableForTarget(studyTarget)');
    expect(diagnostic).toContain('loadFrenchRemoteDiagnosticQuestions(diagnosticSourceLocale, 20)');

    expect(lessonMenu).toContain("const frenchAuxiliarySourceGated = storageStudyTarget(studyTarget) === 'fr'");
    expect(lessonMenu).toContain('unavailable: frenchAuxiliarySourceGated');
    expect(lessonMenu).not.toContain('hideEnglishOnlyAuxiliary');
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

    expect(adminSettings).toContain('const openAiDialogQaRoute =');
    expect(adminSettings).toContain('aiDialogContentAvailableForTarget(studyTarget)');
    expect(adminSettings).toContain('onPress={openAiDialogQaRoute}');
    expect(adminSettings).not.toContain("onPress={() => router.push('/ai_dialog_home' as any)}");
  });
});
