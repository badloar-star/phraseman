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


  it('source-gates AI dialog routes before French can use English scenarios or prompts', () => {
    const targetGate = read('app/ai_dialog_target_gate.ts');
    const home = read('app/ai_dialog_home.tsx');
    const session = read('app/ai_dialog_session.tsx');
    const companion = read('app/ai_companion_session.tsx');
    const dialogsTab = read('components/DialogsTabContent.tsx');

    expect(targetGate).toContain("blockedRoutes: ['/ai_dialog_home', '/ai_dialog_briefing', '/ai_dialog_session', '/ai_companion_session']");
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

  });
});
