import fs from 'fs';
import path from 'path';

// Регрессия: в «Моя практика → Фразы» (режим word_bank) верный устный ответ
// должен САМ раскладывать слова по ячейкам и засчитывать фразу — как в уроке
// (lesson1.tsx → handleSpeakingFillAnswer). Раньше onPass только писал аналитику,
// и юзеру приходилось после «Готово» собирать слова вручную.
describe('trainer phrases speaking auto-fill contract', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../app/trainer_phrases_session.tsx'),
    'utf8',
  );

  // Изолируем тело onPass у SpeakingButton, чтобы проверки не цеплялись за чужой код.
  const onPassBody = (() => {
    const marker = 'onPass={({ score }) => {';
    const start = source.indexOf(marker);
    expect(start).toBeGreaterThan(-1);
    // Закрытие колбэка — следующая строка «}}» с тем же отступом перед «/>».
    const close = source.indexOf('}}', start);
    expect(close).toBeGreaterThan(start);
    return source.slice(start, close);
  })();

  it('keeps the speaking analytics event', () => {
    expect(onPassBody).toContain("trackEvent('speaking_attempt_passed'");
  });

  it('fills the assembled answer from the canonical tokens on a correct voice answer', () => {
    // Раскладываем правильные слова по ячейкам (аналог setSelectedWords в уроке).
    expect(onPassBody).toContain(
      'setSelected(correctTokens.map((text, slot) => ({ slot, text })))',
    );
    // Ручная сборка не конфликтует с подставленным ответом: слоты selected совпадают
    // со слотами банка, поэтому все плитки гаснут (opacity .18) и отключаются,
    // а банк не стирается — редизайн word_bank (использованные плитки видны).
    expect(source).toContain("disabled={used || feedback !== 'none'}");
    expect(source).toContain('opacity: used ? 0.18 : 1');
  });

  it('grades the phrase immediately but leaves its completion under learner control', () => {
    expect(onPassBody).toContain("setFeedback('correct')");
    expect(onPassBody).toContain('recordResult(true)');
    expect(onPassBody).not.toContain('waitForPhraseAnswerFeedback');
  });

  it('does not overwrite an already-graded card', () => {
    expect(onPassBody).toContain("if (feedback !== 'none') return");
  });
});
