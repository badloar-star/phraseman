// зачем (координатор 28.10, аудит по правилу владельца «каждый цвет — оттенок текущей темы»): храповик по ПОЛНОЙ переписи литералов цвета
// (app, components, modules; те же регулярки и исключения, что у scripts/color_literal_census.mjs — общий сканер scripts/color_literal_scan.mjs).
// В отличие от tests/theme_hardcoded_colors_ratchet (он пропускает Главную и Learning V2 по прежним запретам) считает ВСЁ, что видит человек.
// Число литералов в файле не растёт, новые файлы с литералами не появляются; снизили — обновите базу: node tests/color_literal_census_ratchet.test.mjs --update
// Нужен цвет — токен темы (g.text, g.opaqueCard, g.accentGraphic, g.scrim, themeRoleColors…); нужного токена нет — запросить у сессии «Темы»;
// настоящее исключение (арт, металл медали, цвет выбирает пользователь) — строка с «// theme-exempt: <причина>», а не рост базы.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { scanColorLiterals } from '../scripts/color_literal_scan.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASELINE = join(ROOT, 'config', 'color-literal-census-baseline.json');

const scan = scanColorLiterals(ROOT);
const current = {};
for (const row of scan.rows) current[row.file] = (current[row.file] ?? 0) + 1;
const total = scan.rows.length;

if (process.argv.includes('--update')) {
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE, `${JSON.stringify({ total, files: sorted }, null, 2)}\n`);
  console.log(`color literal census baseline updated: ${total} in ${Object.keys(current).length} files`);
}

test('color literals in screens and components never grow — a colour comes from the current theme tokens', () => {
  const base = JSON.parse(readFileSync(BASELINE, 'utf8').replace(/\r\n/g, '\n'));
  const grown = Object.entries(current).filter(([file, n]) => n > (base.files[file] ?? 0));
  assert.deepEqual(
    grown,
    [],
    `новые литералы цвета: ${JSON.stringify(grown)} — берите токены темы (g.text, g.opaqueCard, g.accentGraphic, g.scrim, themeRoleColors) или поставьте «// theme-exempt: <причина>» для арта; базу не поднимать`,
  );
  assert.ok(total <= base.total, `всего ${total} > базы ${base.total}`);
});
