// Рычаги ворот релиза (координатор 10.10 02:25): пропуск ворот Learning V2 в стор-сборке только при доказанном
// вырезании маршрутов и явный обход ворот паритета владельцем. Запуск: node --test tests/store_release_gate_levers.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { learningV2StoreSkipDecision } from '../scripts/store_release_surface.mjs';
import { parseParityWaiver } from '../scripts/visual_parity_gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sandbox(storeRegexSource) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'store-surface-'));
  fs.mkdirSync(path.join(dir, 'app', 'learning-v2', 'session'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'app', 'home.tsx'), 'export default 1;\n');
  fs.writeFileSync(path.join(dir, 'app', 'learning_v2_player.tsx'), 'export default 1;\n');
  fs.writeFileSync(path.join(dir, 'app', 'learning-v2', 'session', '[id].tsx'), 'export default 1;\n');
  fs.writeFileSync(path.join(dir, 'router.ctx.js'), [
    "export const ctx = process.env.EXPO_PUBLIC_STORE_RELEASE === '1'",
    '  ? require.context(',
    '      process.env.EXPO_ROUTER_APP_ROOT,',
    '      true,',
    `      ${storeRegexSource},`,
    '      process.env.EXPO_ROUTER_IMPORT_MODE,',
    '    )',
    '  : require.context(',
    '      process.env.EXPO_ROUTER_APP_ROOT,',
    '      true,',
    '      /^(?:\\.\\/).*\\.tsx$/,',
    '      process.env.EXPO_ROUTER_IMPORT_MODE,',
    '    );',
    '',
  ].join('\n'));
  return dir;
}

const EXCLUDING = '/^(?:\\.\\/)(?!(?:.*learning[_-]v2.*)\\.tsx?$).*\\.tsx$/';
const NOT_EXCLUDING = '/^(?:\\.\\/).*\\.tsx$/';

test('стор-сборка + все маршруты Learning V2 вырезаны → ворота V2 пропускаются', () => {
  const decision = learningV2StoreSkipDecision(sandbox(EXCLUDING), { EXPO_PUBLIC_STORE_RELEASE: '1' });
  assert.equal(decision.skip, true, JSON.stringify(decision));
  assert.equal(decision.routes, 2);
});

test('стор-сборка, но маршрут Learning V2 достижим → ворота строгие', () => {
  const decision = learningV2StoreSkipDecision(sandbox(NOT_EXCLUDING), { EXPO_PUBLIC_STORE_RELEASE: '1' });
  assert.equal(decision.skip, false);
  assert.equal(decision.reason, 'learning_v2_route_reachable_in_store');
  assert.ok(decision.reachable.length > 0);
});

test('не стор-сборка → ворота строгие', () => {
  const decision = learningV2StoreSkipDecision(sandbox(EXCLUDING), {});
  assert.equal(decision.skip, false);
  assert.equal(decision.reason, 'not_store_release');
});

test('нет router.ctx.js → пропуска нет (строго по умолчанию)', () => {
  const dir = sandbox(EXCLUDING);
  fs.rmSync(path.join(dir, 'router.ctx.js'));
  assert.equal(learningV2StoreSkipDecision(dir, { EXPO_PUBLIC_STORE_RELEASE: '1' }).skip, false);
});

test('настоящий проект: стор-режим вырезает весь Learning V2', () => {
  const decision = learningV2StoreSkipDecision(ROOT, { EXPO_PUBLIC_STORE_RELEASE: '1' });
  assert.equal(decision.skip, true, JSON.stringify(decision));
});

test('PARITY_GATE_WAIVER: формат owner-дата:причина, иначе отказ', () => {
  assert.equal(parseParityWaiver(undefined), null);
  assert.equal(parseParityWaiver(''), null);
  assert.deepEqual(parseParityWaiver('owner-2026-10-11:релиз до полной сверки'), {
    ok: true, date: '2026-10-11', reason: 'релиз до полной сверки',
  });
  assert.equal(parseParityWaiver('yes').ok, false);
  assert.equal(parseParityWaiver('owner-2026-13-45:причина есть').ok, false);
  assert.equal(parseParityWaiver('owner-2026-10-11:ok').ok, false);
});

test('ворота паритета: без обхода падают, с обходом владельца — громко сообщают и не падают', () => {
  const gate = path.join(ROOT, 'scripts', 'visual_parity_gate.mjs');
  const strict = spawnSync(process.execPath, [gate], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PARITY_GATE_WAIVER: '' } });
  assert.equal(strict.status, 1);
  const waived = spawnSync(process.execPath, [gate], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, PARITY_GATE_WAIVER: 'owner-2026-10-11:релиз 2.0.0 до полной сверки' },
  });
  if (/match=(\d+)/.exec(waived.stdout)?.[1] !== undefined && !/ОБОЙДЕНЫ ВЛАДЕЛЬЦЕМ/.test(waived.stderr)) {
    // Реестр уже полностью сверен — обходить нечего, ворота и так зелёные.
    assert.equal(waived.status, 0);
    return;
  }
  assert.equal(waived.status, 0, waived.stderr);
  assert.match(waived.stderr, /ВОРОТА ПАРИТЕТА ОБОЙДЕНЫ ВЛАДЕЛЬЦЕМ: строк не принято \d+ из \d+/);
  const malformed = spawnSync(process.execPath, [gate], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PARITY_GATE_WAIVER: 'yes' } });
  assert.equal(malformed.status, 1);
  assert.match(malformed.stderr, /PARITY_GATE_WAIVER задан неверно/);
});

test('нет реестра (архив EAS без docs/): без обхода — отказ, с обходом владельца — громкая строка и код 0', () => {
  const gate = path.join(ROOT, 'scripts', 'visual_parity_gate.mjs');
  const args = [gate, '--registry=docs/__missing_registry__.json'];
  const strict = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PARITY_GATE_WAIVER: '' } });
  assert.equal(strict.status, 1);
  const waived = spawnSync(process.execPath, args, {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, PARITY_GATE_WAIVER: 'owner-2026-10-11:релиз 2.0.0 до полной сверки' },
  });
  assert.equal(waived.status, 0, waived.stderr);
  assert.match(waived.stderr, /ВОРОТА ПАРИТЕТА ОБОЙДЕНЫ ВЛАДЕЛЬЦЕМ: реестра нет/);
});

test('.easignore пропускает в архив EAS каждый скрипт, который запускает eas-build-post-install', () => {
  const easignore = fs.readFileSync(path.join(ROOT, '.easignore'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const postInstall = String(pkg.scripts['eas-build-post-install']);
  const direct = [...postInstall.matchAll(/node scripts\/([\w.-]+\.mjs)/g)].map((m) => m[1]);
  assert.ok(direct.length > 0);
  // помощник, который импортируют ворота озвучки, тоже обязан быть в архиве
  for (const script of [...direct, 'store_release_surface.mjs']) {
    assert.ok(easignore.includes(`!scripts/${script}`), `${script} не разрешён в .easignore — на сервере EAS будет «модуль не найден»`);
  }
});

test('ворота паритета макетов не запускаются на сервере EAS, но строгие в release:precheck', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.ok(!String(pkg.scripts['eas-build-post-install']).includes('visual_parity_gate'),
    'post-install без docs/ не может пройти паритет честно — он проверяется локально в release:precheck');
  const precheck = fs.readFileSync(path.join(ROOT, 'scripts', 'release_precheck.mjs'), 'utf8');
  assert.ok(precheck.includes('scripts/visual_parity_gate.mjs'));
});
