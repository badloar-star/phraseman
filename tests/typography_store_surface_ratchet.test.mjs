// зачем (координатор 11.10, решение владельца D145 «шрифты 16/13 главнее макета»): сторож типографики по экранам СТОР-сборки.
// Поверхность считается по графу импортов от маршрутов стор-ветки router.ctx.js (tests/helpers/typography_store_surface.mjs).
//   • ломаный межстрочный (< 1.25× у текста до 18 pt) и adjustsFontSizeToFit (запрещён владельцем) — ЖЁСТКИЙ ноль;
//   • шрифт < 13, вне шкалы (14/15/17/18) и рамки толще 1 pt — храповик: число по файлу не растёт (база только уменьшается);
//     оставшиеся — чужие файлы в работе (системные окна), декор-формы (кольца, кружки, стрелки) и места по макету с `guard-ok`.
// Обновить базу после чистки: node scripts/audit_typography_store_surface.mjs --update
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditStoreSurface, CATEGORIES } from './helpers/typography_store_surface.mjs';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const audit = auditStoreSurface(ROOT);
const base = JSON.parse(normalizeEol(readFileSync(join(ROOT, 'config', 'typography-store-surface-baseline.json'), 'utf8')));

test('store surface: no broken line-height and no adjustsFontSizeToFit', () => {
  const bad = [];
  for (const [file, found] of Object.entries(audit)) {
    for (const category of ['lineHeight', 'fit']) for (const x of found[category]) bad.push(`${category} ${file}:${x.line} ${x.text}`);
  }
  assert.deepEqual(bad, [], 'межстрочный < 1.25× (у текста до 18 pt) или adjustsFontSizeToFit — по шкале V2_TYPE: 16/21 и 13/17');
});

test('store surface: tiny text, off-scale sizes and thick borders never grow per file', () => {
  const grown = [];
  for (const [file, found] of Object.entries(audit)) {
    for (const category of CATEGORIES.filter((c) => c !== 'lineHeight' && c !== 'fit')) {
      const now = found[category].length;
      const was = base.files[file]?.[category] ?? 0;
      if (now > was) grown.push(`${file} ${category}: ${now} > ${was}`);
    }
  }
  assert.deepEqual(grown, [], `новые отступления от шкалы 16/13 или рамки толще hairline: ${grown.join('; ')} — используй 13/16 и рамку 1 pt (D145)`);
});
