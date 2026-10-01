// Сторож Пакета 8A: прод-сверка корневых полей users/* — только чтение, только имена и количества.
// Запуск: node --test scripts/accounts_v2_root_fields_census.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import {
  MAX_PAGE_SIZE, buildReport, createRootFieldCounter, loadClassifier, parseArgs, reportableFieldName, resolveTarget, scanUsers,
} from './accounts_v2_root_fields_census.mjs';

const SCRIPT = 'scripts/accounts_v2_root_fields_census.mjs';
const run = (args, env = {}) => spawnSync(process.execPath, [SCRIPT, ...args], {
  encoding: 'utf8', env: { ...process.env, FIRESTORE_EMULATOR_HOST: '', GCLOUD_PROJECT: '', ...env },
});

test('без цели печатает только план и не трогает сеть (firebase-admin не грузится)', () => {
  const result = run([]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ПЛАН \(сеть не используется/);
  const source = readFileSync(SCRIPT, 'utf8');
  // Статические импорты — только node:*; firebase-admin подтягивается лишь внутри openFirestore().
  const staticImports = [...source.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]);
  assert.deepEqual(staticImports.filter((name) => !name.startsWith('node:')), []);
  // Разрешены только счётчик в памяти и хэш имени; любой другой set/update/… — запись.
  const code = source.replace(/counts\.set\(/g, '').replace(/counter\.add\(/g, '').replace(/createHash\('sha256'\)\.update\(/g, '');
  assert.ok(!/\.(set|update|create|delete|add|batch|runTransaction|bulkWriter|recursiveDelete)\(/.test(code), 'в скрипте нет записей в Firestore');
});

test('прод только с --project и --owner-command; запись и смешение с эмулятором — отказ', () => {
  assert.equal(run(['--project=phraseman-ea0b3']).status, 2);
  assert.equal(run(['--owner-command=владелец сказал посчитать']).status, 2);
  assert.equal(run(['--emulator']).status, 2);
  assert.equal(run(['--emulator', '--project=phraseman-ea0b3'], { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }).status, 2);
  assert.equal(run(['--project=phraseman-ea0b3', '--owner-command=владелец сказал посчитать'], { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }).status, 2);
  assert.match(run(['--execute']).stderr, /только читает/);
  assert.match(run([`--page-size=${MAX_PAGE_SIZE + 1}`]).stderr, /page-size/);
  assert.deepEqual(resolveTarget(parseArgs(['--project=phraseman-ea0b3', '--owner-command=владелец сказал посчитать']), {}),
    { mode: 'prod', projectId: 'phraseman-ea0b3', pageSize: MAX_PAGE_SIZE, maxDocs: 100_000 });
  assert.equal(resolveTarget(parseArgs(['--emulator']), { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }).mode, 'emulator');
});

test('имена, похожие на почту или uid, маскируются; имена полей кода — нет', () => {
  assert.match(reportableFieldName('someone@example.com'), /^<masked:[0-9a-f]{8}>$/);
  assert.match(reportableFieldName('aB3dE5fG7hJ9kL1mN2pQ4rS6tU8'), /^<masked:[0-9a-f]{8}>$/);
  const requireFn = createRequire(import.meta.url);
  const { buildRootFieldCensus } = requireFn('./accounts_v2_root_fields_code_census.cjs');
  const codeFields = Object.keys(buildRootFieldCensus().fields);
  assert.ok(codeFields.length >= 60);
  assert.deepEqual(codeFields.filter((name) => reportableFieldName(name) !== name), []);
});

test('постраничное чтение с курсором и лимитом; в отчёте нет значений и id', async () => {
  const docs = Array.from({ length: 7 }, (_, i) => ({
    id: `uid-secret-${i}`,
    data: { progress: { x: '1' }, updatedAt: i, ...(i % 2 ? { brandNewLegacyField: 'secret-value' } : {}), [`person${i}@mail.com`]: 1 },
  }));
  const calls = [];
  const db = {
    collection(name) {
      assert.equal(name, 'users');
      const state = { limit: 0, after: null };
      const query = {
        orderBy() { return query; },
        limit(n) { state.limit = n; return query; },
        startAfter(doc) { state.after = doc; return query; },
        async get() {
          const start = state.after ? docs.findIndex((d) => d.id === state.after.id) + 1 : 0;
          const page = docs.slice(start, start + state.limit).map((d) => ({ id: d.id, data: () => d.data }));
          calls.push({ start, limit: state.limit });
          return { empty: page.length === 0, size: page.length, docs: page };
        },
      };
      return query;
    },
  };
  const counter = createRootFieldCounter();
  const { truncated } = await scanUsers(db, '__name__', { pageSize: 3, maxDocs: 5 }, counter, () => {});
  assert.equal(truncated, true);
  assert.deepEqual(calls, [{ start: 0, limit: 3 }, { start: 3, limit: 2 }]);
  const report = buildReport(counter.result(), loadClassifier(), { mode: 'emulator', truncated });
  const text = JSON.stringify(report);
  assert.ok(!/uid-secret|secret-value|@mail\.com/.test(text), 'ни id, ни значений, ни почты');
  assert.equal(report.docsScanned, 5);
  const byName = Object.fromEntries(report.fields.map((field) => [field.name, field]));
  assert.equal(byName.updatedAt.docs, 5);
  assert.equal(byName.brandNewLegacyField.disposition, 'hold');
  assert.deepEqual(report.blockingFields.map((field) => field.name).filter((name) => !name.startsWith('<masked:')), ['brandNewLegacyField']);
  assert.equal(byName.progress.disposition, 'scanned_by_progress_rules');
});
