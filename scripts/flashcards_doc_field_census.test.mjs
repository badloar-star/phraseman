// Сторож Пакета 8H-2 (C): сухой подсчёт progress.flashcards_v1 в users/* — только count(), без записей.
// Запуск: node --test scripts/flashcards_doc_field_census.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import {
  ALL_COUNTED_KEYS, buildReport, countDocFields, parseArgs, resolveTarget,
} from './flashcards_doc_field_census.mjs';

const SCRIPT = 'scripts/flashcards_doc_field_census.mjs';
const run = (args, env = {}) => spawnSync(process.execPath, [SCRIPT, ...args], {
  encoding: 'utf8', env: { ...process.env, FIRESTORE_EMULATOR_HOST: '', GCLOUD_PROJECT: '', ...env },
});

test('без аргументов печатает только план и не трогает сеть (firebase-admin не грузится)', () => {
  const result = run([]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ПЛАН \(сеть не используется/);
  const source = readFileSync(SCRIPT, 'utf8');
  const staticImports = [...source.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]);
  assert.deepEqual(staticImports.filter((name) => !name.startsWith('node:')), []);
  // Разрешён только хэш команды владельца; любой set/update/delete/… — запись.
  const code = source.replace(/createHash\('sha256'\)\.update\(/g, '');
  assert.ok(!/\.(set|update|create|delete|add|batch|runTransaction|bulkWriter|recursiveDelete)\(/.test(code), 'в скрипте нет записей в Firestore');
  // Документы не выкачиваются: только агрегаты.
  assert.ok(!/\.get\(\)/.test(code.replace(/\.count\(\)\.get\(\)/g, '')), 'только count().get()');
});

test('прод только с --project и --owner-command; --write/--fix → код 2', () => {
  assert.equal(run(['--write']).status, 2);
  assert.equal(run(['--fix']).status, 2);
  assert.match(run(['--fix']).stderr, /только считает/);
  assert.equal(run(['--project=phraseman-ea0b3']).status, 2);
  assert.equal(run(['--owner-command=владелец сказал посчитать']).status, 2);
  assert.equal(run(['--emulator']).status, 2);
  assert.equal(run(['--project=phraseman-ea0b3', '--owner-command=владелец сказал посчитать'], { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }).status, 2);
  assert.equal(run(['--project=phraseman-ea0b3', '--owner-command=владелец сказал посчитать', '--write']).status, 2);
  assert.deepEqual(resolveTarget(parseArgs(['--project=phraseman-ea0b3', '--owner-command=владелец сказал посчитать']), {}),
    { mode: 'prod', projectId: 'phraseman-ea0b3' });
  assert.equal(resolveTarget(parseArgs(['--emulator']), { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }).mode, 'emulator');
});

test('подсчёт агрегатами: не null − пустые = непустые; в отчёте только числа и имена ключей', async () => {
  // В эмуляции «документы» существуют только внутри фейка; скрипт видит лишь count().
  const fake = {
    flashcards_v1: [JSON.stringify([{ id: 'secret-card' }]), '[]', '', JSON.stringify([{ id: 'x' }])],
    'flashcards_v2::fr::flashcards_v1': ['[]'],
    flashcards: [JSON.stringify([{ id: 'secret-ancient' }]), ''],
  };
  const queries = [];
  const db = {
    collection(name) {
      assert.equal(name, 'users');
      return {
        where(field, op, value) {
          queries.push({ field, op, value });
          const values = fake[field.key] ?? [];
          const count = op === '!=' ? values.filter((v) => v !== null).length : values.filter((v) => v === value).length;
          return { count: () => ({ get: async () => ({ data: () => ({ count }) }) }) };
        },
      };
    },
  };
  const logs = [];
  const keys = await countDocFields(db, (key) => ({ key }), (line) => logs.push(line));
  assert.deepEqual(keys, [
    { key: 'flashcards_v1', legacy: false, notNull: 4, empty: 2, nonEmpty: 2 },
    { key: 'flashcards_v2::fr::flashcards_v1', legacy: false, notNull: 1, empty: 1, nonEmpty: 0 },
    { key: 'flashcards', legacy: true, notNull: 2, empty: 1, nonEmpty: 1 },
  ]);
  assert.equal(queries.length, ALL_COUNTED_KEYS.length * 3);
  assert.ok(queries.every((q) => (q.op === '!=' && q.value === null) || q.op === '=='));
  const report = buildReport(keys, { mode: 'emulator' });
  assert.equal(report.totalNonEmpty, 2);
  assert.equal(report.legacyNonEmpty, 1);
  assert.ok(!/secret-card|secret-ancient/.test(JSON.stringify(report) + logs.join('\n')), 'значения карточек не печатаются');
});
