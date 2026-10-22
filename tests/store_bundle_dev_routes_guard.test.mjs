// зачем (Ревизор 3.157 через координатора 22.10): dev-превью «Сцены» Главной, «Диалогов», «Сегодня» и «Обучения» уводили на Главную только
// во время работы, а сами экраны и их моки уезжали в стор-бандл: стор-ветка router.ctx.js их не вырезала. Сторож: любой dev-экран
// (app/**/dev_*.tsx, app/**/_dev_*.tsx и витрины без приставки из списка ниже) вырезан из стор-сборки, а в дев-сборке доступен; обычные
// маршруты в стор-сборке остаются. Новый dev-экран без строчки в router.ctx.js роняет проверку.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'app');
const router = fs.readFileSync(path.join(ROOT, 'router.ctx.js'), 'utf8').replace(/\r\n/g, '\n');
const storeBranch = router.split(': require.context(')[0] ?? '';
const devBranch = router.split(': require.context(')[1] ?? '';
const literal = /\n\s*\/(\^[\s\S]*?)\/,\s*\n/.exec(storeBranch)?.[1];
const devLiteral = /\n\s*\/(\^[\s\S]*?)\/,\s*\n/.exec(devBranch)?.[1];

/** Dev-витрины без приставки dev_: только для разработки, в стор не нужны. */
const DEV_ONLY_WITHOUT_PREFIX = ['v2_kit_preview.tsx'];
/**
 * Тонкие «ворота» с тем же именем без подчёркивания: в стор-сборке уводят на Главную, а настоящий dev-модуль (_имя) вырезан
 * (router.ctx.js) и подменён заглушкой сборщика. Ворота в стор-сборке остаются — по ним приложение знает маршрут.
 */
const GATES = ['learning_v2_authoring_preview.tsx', 'learning_v2_modes_showcase.tsx', 'motion_showcase.tsx'];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}
const key = (full) => `./${path.relative(APP, full).split(path.sep).join('/')}`;

test('стор-ветка router.ctx.js вырезает каждый dev-экран', () => {
  assert.ok(literal, 'регулярка стор-ветки router.ctx.js найдена');
  const store = new RegExp(literal);
  const devScreens = walk(APP).filter((full) => /^_?dev_/.test(path.basename(full)) || DEV_ONLY_WITHOUT_PREFIX.includes(path.basename(full)));
  for (const name of ['dev_home_scene_preview.tsx', 'dev_dialogs_scene_preview.tsx', 'dev_today_scene_preview.tsx', 'dev_season_preview.tsx']) {
    assert.ok(devScreens.some((full) => path.basename(full) === name), `${name} найден среди dev-экранов`);
  }
  const leaked = devScreens.map(key).filter((k) => store.test(k));
  assert.deepEqual(leaked, [], `dev-экраны уезжают в стор-бандл — добавь имена в стор-ветку router.ctx.js: ${leaked.join(', ')}`);
});

test('ворота dev-витрин и обычные маршруты остаются в стор-сборке', () => {
  const store = new RegExp(literal);
  for (const gate of GATES) assert.equal(store.test(`./${gate}`), true, `${gate} — ворота, в стор-сборке остаются`);
  for (const route of ['./_layout.tsx', './index.tsx', './(tabs)/home.tsx', './(tabs)/community.tsx']) {
    assert.equal(store.test(route), true, `${route} в стор-сборке есть`);
  }
});

test('в дев-сборке dev-экраны доступны', () => {
  assert.ok(devLiteral, 'регулярка дев-ветки router.ctx.js найдена');
  const dev = new RegExp(devLiteral);
  for (const route of ['./dev_home_scene_preview.tsx', './dev_dialogs_scene_preview.tsx', './dev_today_scene_preview.tsx', './dev_season_preview.tsx', './_dev_cancel_flow_preview.tsx', './v2_kit_preview.tsx']) {
    assert.equal(dev.test(route), true, `${route} в дев-сборке есть`);
  }
});
