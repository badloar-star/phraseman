// Сторож немых catch (координатор 25.10): ловит только ДОБАВЛЕННЫЕ строки, пропускает catch с логом.
// Запуск: node --test tests/guard_silent_catch.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { findSilentCatchesInDiff } from '../scripts/guard_silent_catch.mjs';

const diffOf = (file, addedLines, contextBefore = []) => [
  `diff --git a/${file} b/${file}`,
  `--- a/${file}`,
  `+++ b/${file}`,
  `@@ -1,${contextBefore.length} +1,${contextBefore.length + addedLines.length} @@`,
  ...contextBefore.map((l) => ` ${l}`),
  ...addedLines.map((l) => `+${l}`),
].join('\n');

test('silent block catch in added lines is reported with file and line', () => {
  const hits = findSilentCatchesInDiff(diffOf('app/a.ts', ['try {', '  run();', '} catch {', '}'], ['// head']));
  assert.equal(hits.length, 1);
  assert.equal(hits[0].file, 'app/a.ts');
  assert.equal(hits[0].line, 4);
});

test('catch with a logger call passes', () => {
  assert.deepEqual(findSilentCatchesInDiff(diffOf('app/b.ts', ['try {', '  run();', '} catch (error) {', "  console.warn('[X] failed', error);", '}'])), []);
  assert.deepEqual(findSilentCatchesInDiff(diffOf('app/b.ts', ["void p.catch((e) => DebugLogger.warn('[X]', String(e)));"])), []);
});

test('catch with only a comment is still silent', () => {
  const hits = findSilentCatchesInDiff(diffOf('app/c.ts', ['try {', '  run();', '} catch {', '  /* corrupt cache is reset */', '}']));
  assert.equal(hits.length, 1);
});

test('arrow .catch without logging is silent, in any form', () => {
  assert.equal(findSilentCatchesInDiff(diffOf('app/d.tsx', ['void load().catch(() => {});'])).length, 1);
  assert.equal(findSilentCatchesInDiff(diffOf('app/d.tsx', ['void load().catch(() => undefined);'])).length, 1);
  assert.equal(findSilentCatchesInDiff(diffOf('app/d.tsx', ['}).catch(() => { if (alive) setData(null); });'])).length, 1);
});

test('old code, tests and generated files are not checked', () => {
  const contextOnly = ['diff --git a/app/e.ts b/app/e.ts', '--- a/app/e.ts', '+++ b/app/e.ts', '@@ -1,3 +1,4 @@', ' try {', ' } catch {', ' }', '+const x = 1;'].join('\n');
  assert.deepEqual(findSilentCatchesInDiff(contextOnly), []);
  assert.deepEqual(findSilentCatchesInDiff(diffOf('tests/x.test.ts', ['} catch {', '}'])), []);
  assert.deepEqual(findSilentCatchesInDiff(diffOf('modules/x.generated.ts', ['} catch {', '}'])), []);
});
