// зачем (координатор 23:30, класс дефекта 52d420253): кнопка «V2» в стор-сборке вела в маршрут, вырезанный
// регуляркой router.ctx.js. Сторож держит три вещи: в живом коде сейчас НЕТ безусловных переходов на вырезанные
// маршруты; новая такая ссылка без условия стор-режима роняет проверку; условие (IS_STORE_RELEASE и т. п.) и
// сравнения пути дырой не считаются.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit, excludedRoutes, routePrefix } from '../scripts/store_route_reachability.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sandbox(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'store-routes-'));
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'router.ctx.js'), path.join(dir, 'router.ctx.js'));
  fs.copyFileSync(path.join(ROOT, 'scripts', 'visual_parity_gate.mjs'), path.join(dir, 'scripts', 'visual_parity_gate.mjs'));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

test('боевой код: ни одного безусловного перехода на маршрут, вырезанный из стор-сборки', async () => {
  const result = await audit(ROOT);
  // зачем (владелец 11.10): курс V2 входит в стор-сборку — вырезаны только его дев-экраны.
  assert.ok(result.routes.includes('app/_learning_v2_authoring_preview.tsx'), 'регулярка стор-режима разобрана, дев-экраны V2 вырезаны');
  assert.ok(!result.routes.includes('app/learning-v2/session/[id].tsx'), 'занятие Learning V2 в стор-сборке есть');
  assert.deepEqual(
    result.holes.map((hole) => `${hole.file}:${hole.line} → ${hole.route}`),
    [],
    'новый переход на вырезанный маршрут — закрой условием стор-режима (как 52d420253) или обоснуй исключение в ALLOWED',
  );
});

test('префикс маршрута: группы и динамические сегменты', () => {
  assert.equal(routePrefix('app/learning-v2/session/[id].tsx'), '/learning-v2/session/');
  assert.equal(routePrefix('app/learning_v2_session_intro.tsx'), '/learning_v2_session_intro');
  assert.equal(routePrefix('app/(tabs)/foo/index.tsx'), '/foo');
});

test('новая безусловная ссылка на вырезанный маршрут — дыра; с условием стор-режима — нет', async () => {
  // зачем (11.10): занятие V2 теперь в стор-сборке — образец вырезанного маршрута берём из дев-экранов V2.
  const route = 'app/learning_v2_modes_showcase_run/[family].tsx';
  const open = sandbox({
    [route]: 'export default function S() { return null; }\n',
    'app/home_tile.tsx': "export function go(router) {\n  router.push('/learning_v2_modes_showcase_run/rhythm');\n}\n",
  });
  const holes = (await audit(open)).holes;
  assert.equal(holes.length, 1);
  assert.equal(holes[0].file, 'app/home_tile.tsx');
  assert.equal(holes[0].route, '/learning_v2_modes_showcase_run/');

  const guarded = sandbox({
    [route]: 'export default function S() { return null; }\n',
    'app/home_tile.tsx': "import { IS_STORE_RELEASE } from './config';\nexport function go(router) {\n  if (IS_STORE_RELEASE) return;\n  router.push('/learning_v2_modes_showcase_run/rhythm');\n}\n",
  });
  assert.deepEqual((await audit(guarded)).holes, []);
});

test('лог-блок if (__DEV__) — не условие, а сравнение пути — не переход', async () => {
  // зачем (11.10): занятие V2 теперь в стор-сборке — образец вырезанного маршрута берём из дев-экранов V2.
  const route = 'app/learning_v2_modes_showcase_run/[family].tsx';
  const dir = sandbox({
    [route]: 'export default function S() { return null; }\n',
    'app/screen.tsx': [
      'export function go(router, pathname) {',
      '  if (__DEV__) {',
      "    console.log('[TRACE] go');",
      '  }',
      "  if (pathname.startsWith('/learning_v2_modes_showcase_run/')) return 'lv2';",
      '  router.push({',
      "    pathname: '/learning_v2_modes_showcase_run/[family]',",
      '  });',
      '}',
    ].join('\n'),
  });
  const holes = (await audit(dir)).holes;
  assert.equal(holes.length, 1, 'сравнение не считается, переход без условия — считается, лог-блок не прикрывает');
  assert.equal(holes[0].line, 7);
});

test('excludedRoutes видит не только LV2: служебный экран аудита тоже вырезан', async () => {
  assert.ok((await excludedRoutes(ROOT)).includes('app/pos_analytics_audit.tsx'));
});
