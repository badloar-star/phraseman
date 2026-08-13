import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

function expectBefore(source: string, earlier: string, later: string) {
  const earlierIndex = source.indexOf(earlier);
  expect(earlierIndex).toBeGreaterThanOrEqual(0);
  // «later» должен встретиться ПОСЛЕ «earlier», а не «первое вхождение в файле
  // упорядочено»: контрольный прогон в SpeakingPanel добавил более ранний
  // speech.start(uri), но контракт — про основной путь попытки.
  expect(source.indexOf(later, earlierIndex + earlier.length)).toBeGreaterThanOrEqual(0);
}

describe('speaking Android recognizer availability contract', () => {
  it('checks recognizer availability before starting lesson/trainer SpeakingPanel', () => {
    const source = read('components', 'SpeakingPanel.tsx');

    expect(source).toContain('isSpeechRecognitionAvailable,');
    expect(source).toContain("setStatus('unavailable')");
    expectBefore(source, 'if (!isSpeechRecognitionAvailable(speech))', 'requestSpeechPermissionForHold(speech)');
    expectBefore(source, 'if (!isSpeechRecognitionAvailable(speech))', 'speech.start(');
  });

  it('arms a watchdog so a silent Android recognizer cannot hang on «Готовимся слушать…»', () => {
    const source = read('components', 'SpeakingPanel.tsx');

    // A dedicated stalled status + its own timer that flips the panel out of the
    // requesting/listening spinner when the native engine never emits 'start'.
    expect(source).toContain("| 'stalled'");
    expect(source).toContain('watchdogRef');
    expect(source).toContain("setStatus('stalled')");
    // Watchdog must be armed at start() and cleared on any sign of engine life.
    expectBefore(source, 'const watchdog = setTimeout(', 'speech.start(');
    expect(source).toContain("speech.addListener('start'");
    // stalled offers a retry path (mic button is not blocked, retry link shown).
    expect(source).toContain("status === 'stalled'");
  });

  it('arms a watchdog so a silent recognizer cannot hang AI dialog voice input', () => {
    const source = read('app', 'ai_dialog_session.tsx');

    expect(source).toContain("| 'stalled'");
    expect(source).toContain('recognizerWatchdogRef');
    expect(source).toContain("setVoiceInputStatus('stalled')");
    expectBefore(source, 'recognizerWatchdogRef.current = setTimeout(', 'speechModule.start(');
    expect(source).toContain("speechModule.addListener('start'");
    // stalled renders a localized retry hint next to the mic button.
    expect(source).toContain("voiceInputStatus === 'stalled'");
  });

  it('checks recognizer availability before starting AI dialog voice input', () => {
    const source = read('app', 'ai_dialog_session.tsx');

    expect(source).toContain('isSpeechRecognitionAvailable,');
    expect(source).toContain('loadSpeechRecognitionModule,');
    expect(source).toContain("setVoiceInputStatus('unavailable')");
    expectBefore(source, 'if (!isSpeechRecognitionAvailable(speechModule))', 'requestSpeechPermissionForHold(speechModule)');
    expectBefore(source, 'if (!isSpeechRecognitionAvailable(speechModule))', 'speechModule.start(');
  });
});
