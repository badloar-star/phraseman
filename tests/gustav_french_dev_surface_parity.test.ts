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

  it('keeps mistake practice target-scoped and explicitly supports French', () => {
    const session = read('app/mistake_practice_session.tsx');
    const runtime = read('app/mistake_practice_session_runtime.ts');
    const contracts = read('modules/mistake-practice/contracts.ts');
    const store = read('app/mistake_practice_store.ts');

    // зачем: 133f50647 (22.09) заменил узкую проверку «en/fr» общим списком языков курса — смысл тот же:
    // французский пускается, язык вне курса — нет; журнал читается с языком в подготовке сессии.
    expect(contracts).toMatch(/MISTAKE_STUDY_TARGETS = \[[^\]]*'fr'/);
    expect(session).toContain('if (!isMistakeStudyTargetValue(studyTarget))');
    expect(runtime).toContain('await loadMistakeEventJournal(input)');
    // зачем: ключ журнала теперь (аккаунт, язык), события сверяются пачкой — язык по-прежнему разделяет журналы.
    expect(store).toMatch(/mistakePracticeEventsKey\([^)]*input\.studyTarget\)/);
    expect(store).toContain('event.studyTarget !== input.studyTarget');
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

    // зачем: 73aac3377 (30.09) добавил пилюлю остатка (quotaInHeader) — главная по-прежнему рисует общий хаб со слотом шапки.
    // зачем: с c6f517af4 (22.10) в хаб передаётся headerSlot — «Сцена» за флагом либо прежняя шапка (fallback); общий хаб всё так же один, шлюз французского в нём.
    expect(home).toMatch(/<DialogsTabContent headerSlot=\{headerSlot\}[^>]*\/>/);
    expect(home).not.toContain('aiDialogGateOpen ?');
    expect(home).not.toContain('frenchGateCopy.body');

    expect(dialogsTab).toContain('if (!aiDialogGateOpen)');
    expect(dialogsTab).toContain('showGlassAlert(frenchGateCopy.title, frenchGateCopy.body'); // зачем: стеклянное окно вместо нативного Alert (overlays-runtime)
    // зачем: вкладку «situations» убрал редизайн диалогов 5e4324d90 (23.08); сценарии рисуются тем же списком.
    expect(dialogsTab).toContain('getChallengeDialogScenarios().map');
    expect(dialogsTab).not.toContain('return (\n      <View style={{ flex: 1 }}>\n        {headerSlot}');

    for (const source of [session, companion, dialogsTab]) {
      expect(source).toContain('aiDialogContentAvailableForTarget(studyTarget)');
      expect(source).toContain('aiDialogTargetGateCopy(lang, studyTarget)');
    }

    // зачем: с 6c02e4088 (20.09) шлюз составной (dialogueRuntimeOpen / companionGateOpen = aiDialogGateOpen && …) —
    // телеметрия старта по-прежнему стоит за ним.
    expect(session).toContain('const dialogueRuntimeOpen = aiDialogGateOpen &&');
    expect(companion).toContain('const companionGateOpen = aiDialogGateOpen &&');
    for (const [source, gate] of [[session, 'dialogueRuntimeOpen'], [companion, 'companionGateOpen']] as const) {
      const startTelemetryIndex = source.indexOf("trackEvent('ai_dialog_started'");
      const gateReturnIndex = source.lastIndexOf(`if (!${gate}) return;`, startTelemetryIndex);
      expect(startTelemetryIndex).toBeGreaterThanOrEqual(0);
      expect(gateReturnIndex).toBeGreaterThanOrEqual(0);
      expect(gateReturnIndex).toBeLessThan(startTelemetryIndex);
    }

  });
});
