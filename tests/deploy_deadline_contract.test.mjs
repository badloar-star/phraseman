// Сторож: выкладка Firebase не может висеть без предела времени.
// ЗАМОК ВЛАДЕЛЬЦА 11.11.2026: «да» на «выкладкам нужен предел ожидания» — после того как
// выкладка двух функций Пика зависла на запросе к облаку и 34 минуты держала слот светофора.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helper = path.join(root, 'scripts', 'run_with_deadline.sh').replace(/\\/g, '/');
const run = (args) => spawnSync('bash', [helper, ...args], { encoding: 'utf8', timeout: 120000 });

test('быстрая команда проходит со своим кодом возврата', () => {
  const ok = run(['30', 'быстрая', '--', 'bash', '-c', 'exit 0']);
  assert.equal(ok.status, 0, ok.stderr);
  const bad = run(['30', 'падает', '--', 'bash', '-c', 'exit 7']);
  assert.equal(bad.status, 7, bad.stderr);
  assert.match(bad.stderr, /код 7/);
});

test('зависшая команда прерывается с кодом 124 и названной причиной', () => {
  const started = Date.now();
  const r = run(['30', 'зависшая выкладка', '--', 'sleep', '90']);
  const tookSec = (Date.now() - started) / 1000;
  assert.equal(r.status, 124, r.stderr);
  assert.match(r.stderr, /ИСТЕКЛО ВРЕМЯ: «зависшая выкладка» не завершилась за 30 с/);
  assert.ok(tookSec < 75, `прервана за ${tookSec} с — предел не сработал`);
});

test('предел вне границ и неверный формат отклоняются до запуска', () => {
  for (const sec of ['0', '5', '99999', 'abc', '']) {
    const r = run([sec, 'x', '--', 'bash', '-c', 'echo НЕ_ДОЛЖНО_ЗАПУСТИТЬСЯ']);
    assert.equal(r.status, 2, `предел «${sec}»: ${r.stderr}`);
    assert.doesNotMatch(r.stdout, /НЕ_ДОЛЖНО_ЗАПУСТИТЬСЯ/);
  }
  assert.equal(run(['30', 'без разделителя', 'bash', '-c', 'exit 0']).status, 2);
});

test('оба вызова firebase в скрипте выкладки идут через предел времени', () => {
  const src = readFileSync(path.join(root, 'scripts', 'deploy_from_clean_head.sh'), 'utf8');
  const lines = src.split(/\r?\n/).filter((l) => !l.trim().startsWith('#') && !l.trim().startsWith('echo '));
  const calls = lines.filter((l) => l.includes('"${CMD[@]}"'));
  assert.equal(calls.length, 2, 'ожидались ровно два вызова firebase: сухой прогон и выкладка');
  for (const l of calls) assert.match(l, /run_with_deadline\.sh/, `вызов без предела времени: ${l.trim()}`);
  assert.match(src, /DEPLOY_DEADLINE="\$\{PHRASEMAN_DEPLOY_DEADLINE_SEC:-900\}"/);
  assert.match(src, /DRYRUN_DEADLINE="\$\{PHRASEMAN_DEPLOY_DRYRUN_DEADLINE_SEC:-300\}"/);
  // прерванная по времени выкладка не должна пропускать проверку права вызова
  assert.ok(src.indexOf('ВЫКЛАДКА ПРЕРВАНА ПО ВРЕМЕНИ') < src.indexOf('check_callable_invoker.mjs'));
});
