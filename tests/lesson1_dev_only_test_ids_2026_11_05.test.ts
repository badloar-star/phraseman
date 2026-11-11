// Governance-ID: TG-599187487F25
import fs from 'node:fs';
import path from 'node:path';

// зачем (координатор 05.11, Maestro-проход урока до итога): плитка верного варианта помечена testID для робота ТОЛЬКО в dev. В релизной
// сборке плитки без testID, чтобы ничто не подсказывало верный ответ (владелец: «в релизе — ничего»).

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');
// зачем (аудит микрофризов, владелец 11.11): сетка плиток вынесена в components/LessonWordTiles.tsx — пометки плиток проверяются там.
const tilesSource = fs.readFileSync(path.join(__dirname, '..', 'components', 'LessonWordTiles.tsx'), 'utf8');

describe('lesson1: тестовые id плиток только в dev', () => {
  test('верная плитка помечена только при __DEV__', () => {
    expect(tilesSource).toContain("testID={__DEV__ ? (isCorrectOption ? 'lesson1-word-option-correct'");
  });

  test('нет безусловной пометки верной плитки', () => {
    expect(tilesSource).not.toMatch(/testID=\{isCorrectOption \? 'lesson1-word-option-correct'/);
    expect(source).not.toContain('lesson1-word-option-');
    // Все упоминания пометок плиток — только в ветке __DEV__ одной строки.
    expect(tilesSource.match(/'lesson1-word-option-correct'/g)).toHaveLength(1);
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
    const idx = tilesSource.indexOf("testID={__DEV__ ? (isCorrectOption ? 'lesson1-word-option-correct'");
    expect(idx).toBeGreaterThan(0);
    const line = tilesSource.slice(idx, tilesSource.indexOf('\n', idx));
    expect(line.trimEnd().endsWith(': undefined}')).toBe(true);
  });
});
