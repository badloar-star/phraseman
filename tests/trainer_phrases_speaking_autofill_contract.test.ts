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
    // И очищаем банк, чтобы ручная сборка не конфликтовала с подставленным ответом.
    expect(onPassBody).toContain('setBank([])');
  });

  it('grades the phrase immediately so the user does not assemble by hand', () => {
    expect(onPassBody).toContain("setFeedback('correct')");
    expect(onPassBody).toContain('onResult(true)');
  });

  it('does not overwrite an already-graded card', () => {
    expect(onPassBody).toContain("if (feedback !== 'none') return");
  });
});
