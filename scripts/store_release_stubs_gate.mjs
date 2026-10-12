#!/usr/bin/env node
/**
 * Гейт release:precheck: у каждой стор-заглушки dev-модуля те же runtime-экспорты, что у настоящего модуля.
 *
 * зачем (координатор 12.10, dd756cf9a): в стор-сборке сборщик подменяет dev-модули заглушками (metro.config.js,
 * storeReleaseDevStateStubs). 2387d2a88 добавил экспорт getDevDialogSend в app/dev_dialog_state.ts, а в заглушке его не
 * было — в стор-сборке каждый ход Диалога упал бы с «getDevDialogSend is not a function». Сторож-тест существовал, но в
 * precheck не входил. Здесь — та же проверка чистым Node (без запуска тестов: ни нехватки памяти, ни ложно-зелёного кода
 * выхода). Список заглушек берётся из конфига сборщика, поэтому новая заглушка не выпадет из проверки.
 *
 * Использование: node scripts/store_release_stubs_gate.mjs [--root <dir>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argRoot = process.argv.indexOf('--root');
const ROOT = argRoot > -1 ? path.resolve(process.argv[argRoot + 1]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '[STORE-STUBS-GATE]';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/** Имена заглушек из metro.config.js (блок storeReleaseDevStateStubs). */
export function stubNamesFromMetroConfig(source) {
  const block = /const storeReleaseDevStateStubs = new Map\(\s*\[([\s\S]*?)\]\s*\.map/.exec(source);
  if (!block) return null;
  return [...block[1].matchAll(/'([\w-]+)'/g)].map((m) => m[1]);
}

/** Runtime-экспорты (как в tests/store_release_dev_state_stubs.test.ts). */
export function runtimeExports(source) {
  const names = new Set();
  for (const m of source.matchAll(/^export (?:async )?(?:const|function) (\w+)/gm)) names.add(m[1]);
  if (/^export default /m.test(source)) names.add('default');
  return [...names].sort();
}

export function checkStubs(root = ROOT) {
  const problems = [];
  const metro = fs.readFileSync(path.join(root, 'metro.config.js'), 'utf8');
  const names = stubNamesFromMetroConfig(metro);
  if (!names || names.length === 0) {
    return { ok: false, names: [], problems: ['metro.config.js: не найден список storeReleaseDevStateStubs — сторож не может проверить заглушки'] };
  }
  for (const name of names) {
    const realRel = `app/${name}.ts`;
    const stubRel = `store_release_stubs/dev_state/${name}_stub.ts`;
    if (!fs.existsSync(path.join(root, stubRel))) { problems.push(`${name}: нет заглушки ${stubRel}`); continue; }
    if (!fs.existsSync(path.join(root, realRel))) { problems.push(`${name}: нет настоящего модуля ${realRel}`); continue; }
    const stub = fs.readFileSync(path.join(root, stubRel), 'utf8');
    const real = runtimeExports(fs.readFileSync(path.join(root, realRel), 'utf8'));
    const have = runtimeExports(stub);
    const missing = real.filter((n) => !have.includes(n));
    const extra = have.filter((n) => !real.includes(n));
    if (missing.length) problems.push(`${name}: в заглушке нет экспортов ${missing.join(', ')} — стор-сборка упадёт на обращении к ним`);
    if (extra.length) problems.push(`${name}: в заглушке лишние экспорты ${extra.join(', ')} (в настоящем модуле их нет)`);
    if (/^import /m.test(stub)) problems.push(`${name}: заглушка что-то импортирует — должна быть пустой`);
  }
  return { ok: problems.length === 0, names, problems };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const res = checkStubs(ROOT);
  if (!res.ok) {
    console.error(`${LOG} ОТКАЗ — заглушек проверено ${res.names.length}, проблем ${res.problems.length}:`);
    for (const p of res.problems) console.error(`  - ${p}`);
    console.error(`${LOG} Правило: новый экспорт в dev-модуле из списка заглушек → сразу такой же экспорт в его заглушке.`);
    process.exit(1);
  }
  console.log(`${LOG} OK — ${res.names.length} заглушек, экспорты совпадают с настоящими модулями: ${res.names.join(', ')}`);
}
