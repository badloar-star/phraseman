// зачем (Ревизор 3.44, координатор 18.10): общий гейт диагностических проб — dev и не стор-релиз; без импортов; выражение стор-режима то же, что у IS_STORE_RELEASE в app/config.ts;
// все четыре пробы берут ENABLED из него.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
function gate({ dev, storeEnv }) {
  const module = { exports: {} };
  const js = ts.transpileModule(read('app/dev_diag_gate.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
  const context = { module, exports: module.exports, process: { env: storeEnv === undefined ? {} : { EXPO_PUBLIC_STORE_RELEASE: storeEnv } } };
  if (dev !== undefined) context.__DEV__ = dev;
  vm.runInNewContext(js, context);
  return module.exports.DIAG_ENABLED;
}

test('включён только в dev без стор-релиза; без __DEV__ (тесты с подменой react-native) — выключен, без падения', () => {
  assert.equal(gate({ dev: true }), true);
  assert.equal(gate({ dev: true, storeEnv: '0' }), true);
  assert.equal(gate({ dev: true, storeEnv: '1' }), false, 'стор-релиз выключает');
  assert.equal(gate({ dev: false }), false);
  assert.equal(gate({ dev: undefined }), false, 'нет __DEV__ — выключен, не ReferenceError');
});

test('модуль без импортов и стор-выражение совпадает с app/config.ts', () => {
  const src = read('app/dev_diag_gate.ts');
  assert.ok(!/^import /m.test(src), 'нет импортов (иначе в тесты потянется app/config → Platform)');
  const config = read('app/config.ts');
  assert.ok(config.includes("export const IS_STORE_RELEASE = process.env.EXPO_PUBLIC_STORE_RELEASE === '1';"), 'выражение config.ts прежнее');
  assert.ok(src.includes("process.env.EXPO_PUBLIC_STORE_RELEASE !== '1'"), 'гейт — отрицание того же выражения');
});

test('четыре пробы берут ENABLED из общего гейта и не тянут app/config', () => {
  for (const file of ['app/back_tap_probe.ts', 'app/scroll_restore_probe.ts', 'app/home_focus_cost_probe.ts', 'app/mem_home_probe.ts']) {
    const src = read(file);
    assert.ok(src.includes("import { DIAG_ENABLED } from './dev_diag_gate';"), file);
    assert.ok(/const ENABLED = DIAG_ENABLED;/.test(src), file);
    assert.ok(!src.includes("from './config'"), `${file}: без app/config`);
  }
});
