// зачем (координатор 13.10, инцидент ~15:4x): комментарий «// зачем…» встал в одну строку с кодом и съел хвост выражения
// «: null),» — SyntaxError ушёл в коммит, красный экран Шпиля. Сторож syntax_check ловит это до коммита и до пачки кадров.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { checkSource, parserPluginsFor } from '../scripts/syntax_check.mjs';

const ROOT = path.join(import.meta.dirname, '..');

const EATEN_TAIL = [
  "import { useMemo } from 'react';",
  'export function useLabel(ready: boolean, value: string) {',
  "  return useMemo(() => (ready ? value // зачем (координатор): подпись берём из значения : null), [ready, value]);",
  '}',
].join('\n');

test('комментарий съел хвост выражения — ошибка с номером строки', () => {
  const err = checkSource('components/spire/SpireHomeScreen.tsx', EATEN_TAIL);
  assert.ok(err, 'ошибка не поймана');
  assert.ok(err.line >= 3, `строка ${err.line}`);
});

test('тот же код с комментарием на своей строке — чисто', () => {
  const ok = EATEN_TAIL.replace(
    'ready ? value // зачем (координатор): подпись берём из значения : null)',
    'ready ? value : null) // зачем (координатор): подпись берём из значения\n    ',
  );
  assert.equal(checkSource('components/spire/SpireHomeScreen.tsx', ok), null);
});

test('.ts: приведение <T>x — не JSX; .tsx: JSX разбирается', () => {
  assert.deepEqual(parserPluginsFor('a.ts'), ['typescript']);
  assert.equal(checkSource('a.ts', 'const n = <number>JSON.parse("1");\nexport default n;\n'), null);
  assert.equal(checkSource('a.tsx', 'export const A = () => <View testID="a">{1}</View>;\n'), null);
  assert.equal(checkSource('a.mjs', 'import x from "y";\nexport default x;\n'), null);
});

test('CLI --files: отказ с «файл:строка», выход 1; чистый файл — выход 0', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'syntax-check-'));
  try {
    const bad = path.join(dir, 'bad.tsx');
    const good = path.join(dir, 'good.ts');
    fs.writeFileSync(bad, EATEN_TAIL);
    fs.writeFileSync(good, 'export const a = 1;\n');
    const r1 = spawnSync(process.execPath, ['scripts/syntax_check.mjs', '--files', bad], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r1.status, 1, r1.stdout + r1.stderr);
    assert.match(r1.stderr, /\[SYNTAX\] .*bad\.tsx:\d+:\d+ /);
    const r2 = spawnSync(process.execPath, ['scripts/syntax_check.mjs', '--files', good], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r2.status, 0, r2.stdout + r2.stderr);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('pre-commit ставит сторож на staged-файлы', () => {
  const installer = fs.readFileSync(path.join(ROOT, 'scripts', 'install-git-hooks.mjs'), 'utf8');
  assert.match(installer, /node scripts\/syntax_check\.mjs --staged/);
});
