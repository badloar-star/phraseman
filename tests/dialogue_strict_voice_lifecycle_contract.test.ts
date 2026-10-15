import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Dialogue strict voice lifecycle contract', () => {
  const scenario = read('app/ai_dialog_session.tsx');

  it('checks exact inventory before permission/start and commits only on native start', () => {
    expect(scenario).toContain('readSpeechRecognitionLocaleInventory(speechModule, asrPlatform)');
    expect(scenario).toContain('resolveDialogueAsrCapability');
    expect(scenario.indexOf('voiceInputGate.canStartAttempt()')).toBeLessThan(scenario.indexOf('speechModule.start('));
    // R25 (координатор 15.10, после aa62db9b6): списание вынесено в commitAttemptOnce (одна попытка на сессию захвата) —
    // он вызывается ТОЛЬКО внутри слушателя 'start' и первого result при удержании; прямого списания больше нигде нет.
    expect(scenario.match(/voiceInputGate\.commitStartedAttempt\(\)/g)).toHaveLength(1);
    expect(scenario.match(/commitAttemptOnce\('(start|result)'\)/g)).toEqual(["commitAttemptOnce('start')", "commitAttemptOnce('result')"]);
    expect(scenario.indexOf("commitAttemptOnce('start')")).toBeGreaterThan(scenario.indexOf("addListener('start'"));
    expect(scenario.indexOf("commitAttemptOnce('result')")).toBeGreaterThan(scenario.indexOf("addListener('result'"));
  });

  it('settles a released recognizer, removes listeners and ignores late callbacks', () => {
    expect(scenario).toContain('scheduleSpeechStopSettlement(voiceStopSettlementRef, settleVoiceInput)');
    expect(scenario).toContain('voiceInputSessionRef.current += 1;');
    expect(scenario).toContain('cleanupVoiceInputListeners();');
  });

  it('keeps transcript as an editable draft and never auto-sends or scores voice text', () => {
    expect(scenario).toContain('setInput(next);');
    expect(scenario).not.toContain('send(next)');
    expect(scenario).not.toContain('scoreSpeechPronunciationTranscript');
  });

  it('keeps companion playback-only', () => {
    for (const path of ['app/ai_companion_session.tsx'] /* тьютор удалён в efe19ae9d */) {
      const source = read(path);
      expect(source).not.toContain('loadSpeechRecognitionModule');
      expect(source).not.toContain('speechModule.start');
    }
  });

  it('exposes rather than hides unavailable strict playback on every dialogue surface', () => {
    expect(read('components/dialogs/DialogBubbleActions.tsx')).toContain('speakUnavailable');
    for (const path of ['app/ai_dialog_session.tsx', 'app/ai_companion_session.tsx']) {
      expect(read(path)).toContain('strictPlaybackUnavailable');
    }
  });
});
