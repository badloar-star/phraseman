// зачем (координатор 11.10): флаг «чистые кадры» не должен просочиться в релиз. Модуль единственный зовёт ignoreAllLogs, корневой layout
// подключает его только под __DEV__ (Metro в релизе подставляет false и вырезает ветку), флага нет в eas.json и .env* (там живёт окружение сборок).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (...p) => normalizeEol(readFileSync(join(ROOT, ...p), 'utf8'));
const FLAG = 'EXPO_PUBLIC_SNAPSHOT_CLEAN';

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p, out); continue; }
    if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

test('the dev module guards on __DEV__ and the flag before touching LogBox', () => {
  const src = read('app', 'dev_snapshot_clean.ts');
  assert.match(src, /typeof __DEV__ === 'undefined' \|\| !__DEV__/);
  assert.match(src, /process\.env\.EXPO_PUBLIC_SNAPSHOT_CLEAN !== '1'/);
  assert.ok(src.indexOf('LogBox.ignoreAllLogs') > src.indexOf("EXPO_PUBLIC_SNAPSHOT_CLEAN !== '1'"), 'вызов только после проверок');
});

test('ignoreAllLogs and the flag live only in the dev module (no release path)', () => {
  const offenders = [];
  for (const dir of ['app', 'components', 'hooks', 'constants', 'modules', 'lib']) {
    if (!existsSync(join(ROOT, dir))) continue;
    for (const f of walk(join(ROOT, dir), [])) {
      const rel = relative(ROOT, f).split(sep).join('/');
      if (rel === 'app/dev_snapshot_clean.ts' || rel === 'app/_layout.tsx') continue;
      const src = normalizeEol(readFileSync(f, 'utf8'));
      if (src.includes('ignoreAllLogs') || src.includes(FLAG) || src.includes('dev_snapshot_clean')) offenders.push(rel);
    }
  }
  assert.deepEqual(offenders, []);
});

test('root layout loads the module only behind the __DEV__ guard', () => {
  const src = read('app', '_layout.tsx');
  assert.match(src, /if \(typeof __DEV__ !== 'undefined' && __DEV__\) require\('\.\/dev_snapshot_clean'\);/);
  assert.equal(src.split("require('./dev_snapshot_clean')").length - 1, 1, 'подключение ровно одно');
});

test('the flag is not part of build environments', () => {
  for (const file of ['eas.json', '.env', '.env.production', '.env.local', '.env.example']) {
    if (!existsSync(join(ROOT, file))) continue;
    assert.ok(!read(file).includes(FLAG), `${file} не должен содержать ${FLAG}`);
  }
});
