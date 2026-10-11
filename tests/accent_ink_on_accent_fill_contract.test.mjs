// зачем (Сверка 11.10, светлая тема, каталог наборов: зелёный текст на чёрной заливке; координатор 11.10 «пройти все ~30 мест»):
// текст и значки на заливке акцента темы красятся токеном пары (t.textOnGold = accentInk темы), а не t.correctText —
// тот остаётся тёмно-зелёным из базовой темы и в светлой теме ложится на чёрный акцент. t.correctText допустим только на
// зелёной заливке t.correct. Проход идёт по всем файлам стор-сборки (граф импортов от маршрутов router.ctx.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectStoreSurfaceFiles } from './helpers/typography_store_surface.mjs';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// файлы, где `correctText` — имя локальной переменной/типа, а не поле темы
const NOT_THEME = [/^constants\/theme\.ts$/, /level_exam_blueprint/, /daily_phrase_quest/];

test('no t.correctText right after an accent/cta fill (use t.textOnGold)', () => {
  const bad = [];
  for (const file of collectStoreSurfaceFiles(ROOT)) {
    if (NOT_THEME.some((re) => re.test(file))) continue;
    const lines = normalizeEol(readFileSync(join(ROOT, file), 'utf8')).split('\n');
    lines.forEach((line, i) => {
      if (!/\.correctText/.test(line) || /^\s*(\/\/|\*)/.test(line)) return;
      for (let k = i; k >= Math.max(0, i - 12); k--) {
        if (!/backgroundColor/.test(lines[k])) continue;
        const fill = lines[k].replace(/\.correctText/g, '');
        if (/\.(accent|cta)\b|textSecond/.test(fill) && !/\.correct\b/.test(fill)) bad.push(`${file}:${i + 1}: ${line.trim().slice(0, 110)}`);
        break;
      }
    });
  }
  assert.deepEqual(bad, [], 'на акцентной заливке цвет текста — t.textOnGold (accentInk темы); t.correctText только на зелёной t.correct');
});

test('theme maps textOnGold to the accent ink of the glass tokens', () => {
  const src = normalizeEol(readFileSync(join(ROOT, 'constants', 'liquidGlassThemePalette.ts'), 'utf8'));
  assert.match(src, /textOnGold:\s*t\.accentInk/);
});
