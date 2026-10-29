// Жалоба №4, решение координатора 25.10 (вариант 3): «не расслышал» говорит причину, а не всегда «скажи громче» — громкость
// вообще не измеряется. short — отпустил кнопку раньше 0,25 с; long — судья не уложился в 6 с; loading — модель не готова;
// empty — слова не разобраны (тут «ближе к телефону» уместно).
import fs from 'node:fs';
import path from 'node:path';

jest.mock('../constants/i18n', () => ({ triLang: (lang: string, map: Record<string, string>) => map[lang] ?? map.ru }));

import { isSpeakingTapHold, SPEAKING_NO_SPEECH_COPY, SPEAKING_TAP_MAX_HOLD_MS, speakingNoSpeechKindOf, speakingNoSpeechText } from '../components/speaking_no_speech_copy';

describe('честная подпись «не расслышал»', () => {
  it('причина исхода → вид подписи', () => {
    expect(speakingNoSpeechKindOf('no_wav')).toBe('short');
    // таймаут: «длинная фраза» только от 6 слов, иначе нейтрально (медленный телефон — не вина человека)
    expect(speakingNoSpeechKindOf('timeout', 6)).toBe('long');
    expect(speakingNoSpeechKindOf('timeout', 3)).toBe('retry');
    expect(speakingNoSpeechKindOf('timeout')).toBe('retry');
    for (const reason of ['threw', 'score_null']) expect(speakingNoSpeechKindOf(reason, 8)).toBe('retry');
    expect(speakingNoSpeechKindOf('ctx_unavailable')).toBe('loading');
    for (const reason of ['empty_transcript', 'no_verdict', 'anything']) expect(speakingNoSpeechKindOf(reason)).toBe('empty');
  });

  it('у каждой причины своя подпись на ru/uk; «громче» нет ни в одной; все 9 языков заполнены и короткие', () => {
    const ru = (['short', 'long', 'retry', 'loading', 'empty'] as const).map((k) => speakingNoSpeechText('ru', k));
    expect(new Set(ru).size).toBe(5);
    expect(speakingNoSpeechText('ru', 'short')).toMatch(/Удерживайте, пока говорите/); // 29.10: короткий тап — подсказка «держите», на «вы»
    expect(speakingNoSpeechText('ru', 'long')).toMatch(/Длинная фраза/);
    expect(speakingNoSpeechText('ru', 'loading')).toMatch(/Распознавание/);
    expect(speakingNoSpeechText('uk', 'empty')).toMatch(/ближче/);
    for (const row of Object.values(SPEAKING_NO_SPEECH_COPY)) {
      expect(row).toHaveLength(9);
      for (const text of row) { expect(text.trim().length).toBeGreaterThan(0); expect(text.length).toBeLessThanOrEqual(64); }
    }
    // «громче» — только там, где слов не разобрано (empty): в остальных причинах громкость ни при чём
    expect(ru.filter((_, i) => i !== 4).join(' ')).not.toMatch(/громче/);
  });

  it('панель: исход пути удержания ставит причину, подпись «не расслышал» берётся по причине', () => {
    const panel = fs.readFileSync(path.join(__dirname, '..', 'components/SpeakingPanel.tsx'), 'utf8').replace(/\r\n/g, '\n');
    expect(panel).toContain("setNoSpeechKind(reportHoldNoSpeech('no_wav'");
    expect(panel).toContain('setNoSpeechKind(reportHoldNoSpeech(judgeReason');
    expect(panel).toMatch(/case 'no_speech':[\s\S]{0,200}return speakingNoSpeechText\(lang, noSpeechKind\);/);
    expect(panel).not.toContain("ru: 'Не расслышал. Скажи чуть громче'");
  });
});

// зачем (Ревизор → координатор 29.10): короткий тап по микрофону — мягкая подсказка без звука и вибрации ошибки
describe('короткий тап по микрофону', () => {
  it('порог тапа: короткое или неизвестное удержание — тап, долгое — нет', () => {
    expect(isSpeakingTapHold(null)).toBe(true);
    expect(isSpeakingTapHold(200)).toBe(true);
    expect(isSpeakingTapHold(SPEAKING_TAP_MAX_HOLD_MS - 1)).toBe(true);
    expect(isSpeakingTapHold(SPEAKING_TAP_MAX_HOLD_MS)).toBe(false);
    expect(isSpeakingTapHold(2500)).toBe(false);
  });

  it('панель: на тапе — лёгкий хаптик без звука ошибки; настоящий сбой записи — прежний звук; журнал [SPEAK-TAP]', () => {
    const panel = fs.readFileSync(path.join(__dirname, '..', 'components/SpeakingPanel.tsx'), 'utf8').replace(/\r\n/g, '\n');
    const branch = panel.slice(panel.indexOf("reportHoldNoSpeech('no_wav'"), panel.indexOf('const judgeAt = Date.now();'));
    expect(branch).toContain("console.log('[SPEAK-TAP]'");
    expect(branch).toMatch(/if \(tapOnly\) \{\s*void hapticLightImpact\(\);\s*\} else \{\s*setNoSpeechKind\('retry'\);\s*playNoSpeech\(\);\s*hapticError\(\);/);
    // на тапе звука и вибрации ошибки нет: playNoSpeech/hapticError только в ветке «else»
    const tapBranch = branch.slice(branch.indexOf('if (tapOnly)'), branch.indexOf('} else {'));
    expect(tapBranch).not.toMatch(/playNoSpeech|hapticError/);
  });
});
