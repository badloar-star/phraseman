// Сторож (UX-волна 2, 04.11, владелец одобрил): в печатном задании «Отработки ошибок» Enter проверяет ответ, фокус сразу в поле.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/mistake_practice_session.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('Отработка ошибок: клавиатура', () => {
  it('Enter проверяет ответ только когда кнопка «Проверить» активна, клавиатура не прячется', () => {
    expect(src).toContain('returnKeyType="done"');
    expect(src).toContain('blurOnSubmit={false}');
    const at = src.indexOf('onSubmitEditing={() => {');
    expect(at).toBeGreaterThan(0);
    const block = src.slice(at, at + 260);
    expect(block).toContain('if (!canCheck) return;');
    expect(block).toContain('submitVerdict(matchesMistakePracticeAnswer(answerValue, entry.exercise.correctAnswer, studyTarget))');
  });
  it('фокус сразу в поле только в печатном задании (в аудировании клавиатура не закрывает озвучку)', () => {
    expect(src).toContain("autoFocus={renderer === 'typing'}");
  });
});
