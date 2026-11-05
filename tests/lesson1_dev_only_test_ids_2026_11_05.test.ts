// Governance-ID: TG-599187487F25
import fs from 'node:fs';
import path from 'node:path';

// зачем (координатор 05.11, Maestro-проход урока до итога): плитка верного варианта помечена testID для робота ТОЛЬКО в dev. В релизной
// сборке плитки без testID, чтобы ничто не подсказывало верный ответ (владелец: «в релизе — ничего»).

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');

describe('lesson1: тестовые id плиток только в dev', () => {
  test('верная плитка помечена только при __DEV__', () => {
    expect(source).toContain("testID={__DEV__ ? (isCorrectOption ? 'lesson1-word-option-correct'");
  });

  test('нет безусловной пометки верной плитки', () => {
    expect(source).not.toMatch(/testID=\{isCorrectOption \? 'lesson1-word-option-correct'/);
  });

  test('скрытый эталон ответа для Maestro существует только при __DEV__', () => {
    const idx = source.indexOf('testID="lesson1-expected-answer"');
    expect(idx).toBeGreaterThan(0);
    const before = source.slice(Math.max(0, idx - 200), idx);
    expect(before).toContain('{__DEV__ && phrase ? (');
    expect(source.slice(idx, idx + 400)).toContain('phraseCanonicalAnswer(phrase, studyTarget)');
    expect(source.match(/lesson1-expected-answer/g)).toHaveLength(1);
  });

  test('в релизной ветке testID не задаётся', () => {
    const idx = source.indexOf("testID={__DEV__ ? (isCorrectOption ? 'lesson1-word-option-correct'");
    const line = source.slice(idx, source.indexOf('\n', idx));
    expect(line.trimEnd().endsWith(': undefined}')).toBe(true);
  });
});
