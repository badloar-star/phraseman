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

  test('в релизной ветке testID не задаётся', () => {
    const idx = source.indexOf("testID={__DEV__ ? (isCorrectOption ? 'lesson1-word-option-correct'");
    const line = source.slice(idx, source.indexOf('\n', idx));
    expect(line.trimEnd().endsWith(': undefined}')).toBe(true);
  });
});
