// зачем (координатор 12.10, EN_READINESS): сторож непереведённого текста признаёт tl(…)/showToast(…) переводом ТОЛЬКО при
// непустом английском строковом аргументе; пустой/нестроковый/отсутствующий en — по-прежнему находка (сторож не ослаблен).
// Плюс имя переводчика — только целое слово: 't(' больше не срабатывает внутри showToast(/alert(.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isNonEmptyEnglishLiteral,
  maskPositionalTranslatorCalls,
  splitCallArgs,
} from '../scripts/untranslated_ui_positional.mjs';

const hasCyrillic = (s) => /[а-яА-ЯёЁ]/.test(s);

test('tl с непустым en — маскируется (перевод есть)', () => {
  const src = "const a = tl('Текущий ранг', 'Поточний ранг', 'Current rank', 'Rango actual');";
  assert.equal(hasCyrillic(maskPositionalTranslatorCalls(src)), false);
});

test('tl с пустым en или без en — остаётся находкой', () => {
  for (const src of [
    "const a = tl('Текущий ранг', 'Поточний ранг', '', 'Rango actual');",
    "const a = tl('Текущий ранг', 'Поточний ранг', '   ', 'x');",
    "const a = tl('Текущий ранг', 'Поточний ранг');",
    "const a = tl('Текущий ранг', 'Поточний ранг', enVar, 'x');",
    "const a = tl('Текущий ранг', 'Поточний ранг', 'Текущий ранг', 'x');",
    "const a = tl('Ранг', 'Ранг', `rank ${n}`, 'x');",
  ]) {
    assert.equal(hasCyrillic(maskPositionalTranslatorCalls(src)), true, src);
  }
});

test('showToast: 3 и 4 аргумента с непустым en — маскируются; пустой en — находка', () => {
  assert.equal(hasCyrillic(maskPositionalTranslatorCalls("showToast('info', 'Ранг', 'Rank');")), false);
  assert.equal(hasCyrillic(maskPositionalTranslatorCalls("showToast('info', 'Ранг', 'Ранг укр', 'Rank');")), false);
  assert.equal(hasCyrillic(maskPositionalTranslatorCalls("showToast('info', 'Ранг', '');")), true);
  assert.equal(hasCyrillic(maskPositionalTranslatorCalls("showToast('info', 'Ранг');")), true);
});

test('имя только целиком: mytl(…) и fooshowToast(…) не помощники', () => {
  assert.equal(hasCyrillic(maskPositionalTranslatorCalls("mytl('Ранг', 'Ранг', 'Rank', 'x');")), true);
  assert.equal(hasCyrillic(maskPositionalTranslatorCalls("fooshowToast('i', 'Ранг', 'Rank');")), true);
});

test('разбор аргументов учитывает вложенные скобки и запятые в строках', () => {
  const src = "tl(fn('a, b'), 'x, y', 'Rank (top)', obj[1])";
  const parsed = splitCallArgs(src, src.indexOf('('));
  assert.deepEqual(parsed.args, ["fn('a, b')", "'x, y'", "'Rank (top)'", 'obj[1]']);
  assert.equal(isNonEmptyEnglishLiteral("'Rank (top)'"), true);
});

test('сторож: переводчик по целому имени, помощники подключены', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const scanner = fs.readFileSync(path.join(root, 'scripts/scan_untranslated_ui.mjs'), 'utf8');
  assert.match(scanner, /import \{ maskPositionalTranslatorCalls \} from '\.\/untranslated_ui_positional\.mjs';/);
  assert.match(scanner, /src = maskPositionalTranslatorCalls\(src\);/);
  assert.match(scanner, /\/\[A-Za-z0-9_\$\]\/\.test\(src\[found - 1\]\)/);
});
