import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

// personal_plan_exercise.tsx хранит русские строки как \uXXXX-эскейпы — приводим
// исходник к читаемому виду, чтобы контракт сверял человеческий текст.
const decodeUnicodeEscapes = (source: string) =>
  source.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

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

    expect(source).toContain("import { isSpeechRecognitionAvailable } from '../app/personal_plan_speech_module'");
    expect(source).toContain("setStatus('unavailable')");
    expectBefore(source, 'if (!isSpeechRecognitionAvailable(speech))', 'const permission = await speech.requestPermissionsAsync()');
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
    expectBefore(source, 'watchdogRef.current = setTimeout(', 'speech.start(');
    expect(source).toContain("speech.addListener('start'");
    // stalled offers a retry path (mic button is not blocked, retry link shown).
    expect(source).toContain("status === 'stalled'");
  });

  it('arms a watchdog so a silent recognizer cannot hang personal-plan pronunciation', () => {
    const source = read('app', 'personal_plan_exercise.tsx');

    // Same failure mode as SpeakingPanel: Android accepts start() but never emits
    // start/result/error — without a timer «Слушаю — говори» would spin forever.
    expect(source).toContain('recognizerWatchdogRef');
    expect(source).toContain('setPronunciationStalled(true)');
    // Watchdog must be armed at start() and cleared on any sign of engine life.
    expectBefore(source, 'recognizerWatchdogRef.current = setTimeout(', 'speechModule.start(');
    expect(source).toContain("speechModule.addListener('start'");
    // stalled shows a retry hint; the mic button stays enabled for another attempt.
    expect(decodeUnicodeEscapes(source)).toContain('Не удалось запустить микрофон');
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

  it('checks recognizer availability before starting personal-plan pronunciation', () => {
    const source = read('app', 'personal_plan_exercise.tsx');

    expect(source).toContain('isSpeechRecognitionAvailable, loadPlanSpeechModule');
    expect(source).toContain("setBlocked('unavailable')");
    expectBefore(source, 'if (!isSpeechRecognitionAvailable(speechModule))', 'const permission = await speechModule.requestPermissionsAsync()');
    expectBefore(source, 'if (!isSpeechRecognitionAvailable(speechModule))', 'speechModule.start(');
  });

  it('checks recognizer availability before starting AI dialog voice input', () => {
    const source = read('app', 'ai_dialog_session.tsx');

    expect(source).toContain('isSpeechRecognitionAvailable, loadPlanSpeechModule');
    expect(source).toContain("setVoiceInputStatus('unavailable')");
    expectBefore(source, 'if (!isSpeechRecognitionAvailable(speechModule))', 'const permission = await speechModule.requestPermissionsAsync()');
    expectBefore(source, 'if (!isSpeechRecognitionAvailable(speechModule))', 'speechModule.start(');
  });
});
