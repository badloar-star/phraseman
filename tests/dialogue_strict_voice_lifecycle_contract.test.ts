import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Dialogue strict voice lifecycle contract', () => {
  const scenario = read('app/ai_dialog_session.tsx');

  it('checks exact inventory before permission/start and commits only on native start', () => {
    expect(scenario).toContain('readSpeechRecognitionLocaleInventory(speechModule)');
    expect(scenario).toContain('resolveDialogueAsrCapability');
    expect(scenario.indexOf('voiceInputGate.canStartAttempt()')).toBeLessThan(scenario.indexOf('speechModule.start('));
    expect(scenario.indexOf('voiceInputGate.commitStartedAttempt()')).toBeGreaterThan(scenario.indexOf("addListener('start'"));
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

  it('keeps companion and tutor playback-only', () => {
    for (const path of ['app/ai_companion_session.tsx', 'app/ai_dialog_tutor_session.tsx']) {
      const source = read(path);
      expect(source).not.toContain('loadSpeechRecognitionModule');
      expect(source).not.toContain('speechModule.start');
    }
  });

  it('exposes rather than hides unavailable strict playback on every dialogue surface', () => {
    expect(read('components/dialogs/DialogBubbleActions.tsx')).toContain('speakUnavailable');
    expect(read('components/dialogs/TutorBoard.tsx')).toContain('speakUnavailable');
    for (const path of ['app/ai_dialog_session.tsx', 'app/ai_companion_session.tsx', 'app/ai_dialog_tutor_session.tsx']) {
      expect(read(path)).toContain('strictPlaybackUnavailable');
    }
  });
});
