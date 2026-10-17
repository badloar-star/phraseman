// зачем ([HOME-SETSTATE] 18.10, координатор): Главная не должна перерисовываться, когда писатель снимка пересобрал ту же секцию с новым штампом updatedAt.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');

function load(path) {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
  vm.runInNewContext(js, { module, exports: module.exports });
  return module.exports;
}
const { sameSnapshotSection } = load('app/home_snapshot_equal.ts');

test('тот же профиль с новым updatedAt равен', () => {
  const a = { source: 'live', updatedAt: 1, name: 'Ann', avatar: '3', frame: 'f1' };
  assert.equal(sameSnapshotSection(a, { ...a, updatedAt: 999 }), true);
});

test('изменилось видимое поле — не равно (серия, имя, источник, монеты)', () => {
  const a = { source: 'live', updatedAt: 1, streak: 5, stars: 10 };
  assert.equal(sameSnapshotSection(a, { ...a, streak: 6 }), false);
  assert.equal(sameSnapshotSection(a, { ...a, stars: undefined }), false, 'неизвестные монеты не равны известным');
  assert.equal(sameSnapshotSection(a, { ...a, source: 'storage' }), false);
});

test('добавилось или пропало поле — не равно; одна секция отсутствует — не равно', () => {
  const a = { source: 'live', updatedAt: 1, streak: 5 };
  assert.equal(sameSnapshotSection(a, { ...a, extra: 1 }), false);
  assert.equal(sameSnapshotSection(a, undefined), false);
  assert.equal(sameSnapshotSection(undefined, undefined), true);
});

test('вложенный объект сравнивается по ссылке: пересобранный вложенный — не равно (осторожная сторона)', () => {
  const a = { source: 'live', updatedAt: 1, aura: { id: 1 } };
  assert.equal(sameSnapshotSection(a, { ...a, aura: { id: 1 } }), false);
  assert.equal(sameSnapshotSection(a, { ...a, updatedAt: 2 }), true);
});

test('Главная подключает сравнение без updatedAt к снимку и не читает updatedAt снимка', () => {
  const src = fs.readFileSync('app/(tabs)/home.tsx', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(src.includes("import { sameSnapshotSection } from '../home_snapshot_equal';"));
  assert.ok(src.includes('(a, b) => sameSnapshotSection(a.profile, b.profile) && sameSnapshotSection(a.progress, b.progress)'));
  assert.ok(!/appSnapshot\.(profile|progress)\??\.updatedAt/.test(src), 'Главная не читает updatedAt снимка');
});
