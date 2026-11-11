// §SPEECH-NA (владелец 04.10.2026): на устройстве без распознавателя речи все
// голосовые места заранее отключены, голосовой шаг не блокирует урок, а «Устно»
// не тратит энергию. Поведение итога занятия проверяется напрямую, проводка
// экранов — по исходнику (полный рендер этих экранов в jest слишком тяжёл).
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

function expectBefore(source: string, earlier: string, later: string) {
  const earlierIndex = source.indexOf(earlier);
  expect(earlierIndex).toBeGreaterThanOrEqual(0);
  expect(source.indexOf(later, earlierIndex + earlier.length)).toBeGreaterThanOrEqual(0);
}

describe('отключённое состояние на всех голосовых местах', () => {
  it('урок: «Устно» перечёркнуто, тап не тратит попытку и не ведёт на пейвол', () => {
    const source = read('app', 'lesson1.tsx');
    expectBefore(source, 'if (speechNa) {', 'if (!speakingGate.canStartAttempt()) return;');
    expect(source).toContain("name={speechNa ? 'mic-off-outline' : 'mic-outline'}");
    // Панель не открывается: на NA-устройстве startSpeakingHold выходит до setSpeakingOpen(true).
    expectBefore(source, 'if (speechNa) {', 'setSpeakingOpen(true);');
  });

  it('кнопка «Зажми и говори» (карточки) отключена и не трогает квоту', () => {
    const source = read('app', 'flashcards', 'SpeakHoldButton.tsx');
    expectBefore(source, 'if (speechNa) {', 'allowance.onSpentPress()');
    expect(source).toContain("speechNa ? 'mic-off-outline'");
    expect(source).toContain('const disabled = disabledProp || speechNa;');
  });

  it('«Мои ошибки»: голосовое задание превращается в печать', () => {
    const source = read('app', 'mistake_practice_session.tsx');
    // зачем (04.10): к недоступному распознавателю добавился ручной пропуск голоса (speechSkipped) — печать
    // включается в обоих случаях.
    expect(source).toMatch(/entry\?\.exercise\.renderer === 'speech' && \(speechNa(?: \|\| speechSkipped)?\) \? 'typing'|entry\?\.exercise\.renderer === 'speech' && speechNa \? 'typing'/);
    expect(source).toContain("renderer === 'speech' ? (");
    expect(source).not.toContain("entry.exercise.renderer === 'speech' ? (");
  });

  it('ИИ-диалог: микрофон перечёркнут, тап не открывает пейвол квоты', () => {
    const source = read('app', 'ai_dialog_session.tsx');
    // зачем (разбор красных 15.10): ebacc519e (R43) передаёт в canStartAttempt колбэк «запустить после Plus» — порядок проверок прежний
    expectBefore(source, 'if (speechNa) {', 'if (!voiceInputGate.canStartAttempt(');
    expect(source).toContain("name={speechNa ? 'mic-off-outline'");
  });

  it('диалоги 2.0: тап по недоступному микрофону даёт понятный отказ, а не тишину', () => {
    const hook = read('hooks', 'use_dialogue_v2_voice_message.ts');
    expect(hook).toContain("reportFailure('unavailable', unavailableOnDevice ? 'speech_unavailable_on_device' : 'module_missing');");
    expect(read('app', 'dialogue_v2_session.tsx')).toContain('voiceUnavailable={voice.unavailableOnDevice}');
    expect(read('app', 'dialogue_v2_freeform.tsx')).toContain('voiceUnavailable={voice.unavailableOnDevice}');
    expect(read('components', 'dialogs', 'DialogueV2SessionScreen.tsx')).toContain("voiceUnavailable ? 'mic-off-outline' : 'mic-outline'");
    expect(read('components', 'dialogs', 'DialogueV2FreeformScreen.tsx')).toContain("voiceUnavailable ? 'mic-off-outline' : 'mic-outline'");
  });

  it('карточки: пункт «Устно» в выборе тренировки отключён с сообщением', () => {
    const source = read('app', 'flashcards', 'FlashcardsTrainingModeSheet.tsx');
    expect(source).toContain('const speakingEnabled = !speechNa;');
    expect(source).toContain('speechUnavailableOnDeviceText(lang)');
  });

  it('карточки «Устно»: выход до старта сессии — энергия не списывается', () => {
    const source = read('app', 'flashcards_speaking_session.tsx');
    expectBefore(source, 'exit:speech_unavailable_on_device', 'await confirmSpeakEnergy(recordIntent)');
    expect(source).toContain('testID="fc-speak-speech-unavailable"');
  });

  it('онбординг: голосовой шаг сразу в неголосовом режиме', () => {
    const source = read('components', 'onboarding_aha', 'SpeechBeat.tsx');
    expect(source).toContain("if (!isSpeechUnavailableOnDevice()) return 'preprompt';");
    expect(source).toContain("return 'fallback';");
  });
});
