import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { checkStubs, runtimeExports, stubNamesFromMetroConfig } from '../scripts/store_release_stubs_gate.mjs';

// зачем (координатор 12.10, dd756cf9a): getDevDialogSend не попал в стор-заглушку — гейт release:precheck обязан краснеть
// на недостающем экспорте и брать список заглушек из конфига сборщика.

function makeRoot({ real, stub }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stubs-gate-'));
  fs.mkdirSync(path.join(root, 'app'));
  fs.mkdirSync(path.join(root, 'store_release_stubs', 'dev_state'), { recursive: true });
  fs.writeFileSync(path.join(root, 'metro.config.js'), "const storeReleaseDevStateStubs = new Map(\n  [\n    'dev_x_state',\n  ].map((name) => [name, name]),\n);\n");
  fs.writeFileSync(path.join(root, 'app', 'dev_x_state.ts'), real);
  fs.writeFileSync(path.join(root, 'store_release_stubs', 'dev_state', 'dev_x_state_stub.ts'), stub);
  return root;
}

test('список заглушек читается из metro.config.js', () => {
  const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'metro.config.js'), 'utf8');
  const names = stubNamesFromMetroConfig(src);
  assert.ok(names && names.includes('dev_dialog_state'));
});

test('экспорты: функции, константы, async, default', () => {
  assert.deepEqual(runtimeExports('export function a() {}\nexport const b = 1;\nexport async function c() {}\nexport default function D() {}\n'), ['a', 'b', 'c', 'default']);
});

test('недостающий экспорт в заглушке — отказ с именем', () => {
  const root = makeRoot({
    real: 'export function getDevDialogFail() { return null; }\nexport function getDevDialogSend() { return null; }\n',
    stub: 'export function getDevDialogFail() { return null; }\n',
  });
  const res = checkStubs(root);
  assert.equal(res.ok, false);
  assert.match(res.problems.join('\n'), /нет экспортов getDevDialogSend/);
});

test('совпадающие экспорты — ок; импорт в заглушке — отказ', () => {
  const ok = makeRoot({ real: 'export function a() {}\n', stub: 'export function a() {}\n' });
  assert.equal(checkStubs(ok).ok, true);
  const bad = makeRoot({ real: 'export function a() {}\n', stub: "import x from 'y';\nexport function a() {}\n" });
  assert.match(checkStubs(bad).problems.join('\n'), /импортирует/);
});

test('настоящий репозиторий: все заглушки совпадают', () => {
  assert.equal(checkStubs(path.join(import.meta.dirname, '..')).ok, true);
});
