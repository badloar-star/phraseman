// зачем (Ревизор 26.10): сводка app_errors уходит из боевой базы людям — личных полей в ней быть не должно, запрос — только чтение и с limit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { redactText, summarizeAppErrors, MAX_LIMIT } from '../scripts/read_app_errors_since.mjs';

const row = (over = {}) => ({
  uid: 'u_1234567890abcdefghijXYZ', authUid: 'auth_abcdefghijklmnopqrstu', deviceName: 'Pat iPhone', stack: 'at x (file.js:1)',
  severity: 'warning', context: 'nav:push_tap', feature: 'nav', screen: 'lessons', errorName: 'Error',
  message: 'failed for pat@example.com token AbCdEfGhIjKlMnOpQrStUvWx', appVersion: '2.0.2', buildNumber: '144', platform: 'ios', createdAtMs: 1_000, ...over,
});

test('в сводке нет uid, authUid, deviceName, stack, e-mail и длинных id', () => {
  const out = JSON.stringify(summarizeAppErrors([row(), row({ createdAtMs: 2_000 }), row({ severity: 'critical', message: 'boom' })]));
  for (const banned of ['u_1234567890abcdefghijXYZ', 'auth_abcdefghijklmnopqrstu', 'Pat iPhone', 'file.js', 'pat@example.com', 'AbCdEfGhIjKlMnOpQrStUvWx', '"uid"', '"authUid"', '"stack"', '"deviceName"']) {
    assert.equal(out.includes(banned), false, `в выводе есть ${banned}`);
  }
});

test('группировка: одинаковые ошибки — одна строка со счётом; critical — первыми; фильтр версии', () => {
  const s = summarizeAppErrors([row(), row({ createdAtMs: 2_000 }), row({ severity: 'critical', message: 'boom' }), row({ appVersion: '2.0.3', buildNumber: '145' })], { appVersion: '2.0.2' });
  assert.equal(s.read, 4);
  assert.equal(s.kept, 3);
  assert.equal(s.critical, 1);
  assert.equal(s.groups[0].severity, 'critical');
  assert.equal(s.groups[1].count, 2);
  assert.deepEqual(s.byVersion, { '2.0.2 (144) ios': 3 });
});

test('redactText прячет e-mail, длинные id и номера', () => {
  assert.equal(redactText('mail a.b@c.io id ABCDEFGHIJKLMNOPQRSTUV tel +49 170 1234567'), 'mail <email> id <id> tel <num>');
});

test('скрипт только читает: один запрос с where + orderBy + limit, без записи', () => {
  const src = readFileSync(new URL('../scripts/read_app_errors_since.mjs', import.meta.url), 'utf8');
  assert.match(src, /\.where\('createdAtMs', '>=', sinceMs\)\.orderBy\('createdAtMs', 'desc'\)\.limit\(args\.limit\)\.get\(\)/);
  assert.doesNotMatch(src, /\.(update|add|create|batch|runTransaction|bulkWriter|recursiveDelete)\(/);
  // .set( / .delete( допустимы только у Map сводки (groups.set) — у Firestore их нет
  assert.deepEqual([...src.matchAll(/(\w+)\.(set|delete)\(/g)].map((m) => m[1]).filter((name) => name !== 'groups'), []);
  assert.ok(MAX_LIMIT <= 2000);
});
