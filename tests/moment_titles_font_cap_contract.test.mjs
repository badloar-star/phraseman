import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// зачем (Макеты, прогон длинных текстов 360 pt x1.15, координатор 15.10): заголовки окон моментов не должны разрастаться от системного шрифта (m17: 3-4 строки на всех языках).
// Потолок — MOMENT_TITLE_MAX_FONT_SCALE (1.1), кегль и текст эталона не трогаем; adjustsFontSizeToFit запрещён владельцем. Сторож: каждый accessibilityRole="header" в окнах моментов
// несёт maxFontSizeMultiplier, а потолок и его запрет на сжатие шрифта живут в одном месте.
const root = process.cwd();
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8').replace(/\r\n/g, '\n');
const DIRS = ['components/spire/moments', 'components/coin_rank_moments', 'components/dialog_moments', 'components/lesson_exit', 'components/lesson_moments', 'components/moments'];

const files = DIRS.flatMap((dir) => readdirSync(join(root, dir)).filter((f) => f.endsWith('.tsx')).map((f) => `${dir}/${f}`));

test('every moment window title (accessibilityRole="header") is capped by MOMENT_TITLE_MAX_FONT_SCALE', () => {
  const bad = [];
  let titles = 0;
  for (const file of files) {
    const lines = read(...file.split('/')).split('\n');
    lines.forEach((line, i) => {
      if (!line.includes('accessibilityRole="header"')) return;
      titles += 1;
      if (!line.includes('maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE}')) bad.push(`${file}:${i + 1}`);
    });
  }
  assert.ok(titles >= 12, `ожидалось не меньше 12 заголовков, найдено ${titles}`);
  assert.deepEqual(bad, []);
});

test('the cap lives in one place and is 1.1; no shrink-to-fit in moment windows', () => {
  assert.match(read('components', 'moments', 'title_scale.ts'), /export const MOMENT_TITLE_MAX_FONT_SCALE = 1\.1;/);
  for (const file of files) assert.doesNotMatch(read(...file.split('/')), /adjustsFontSizeToFit/, file);
});
