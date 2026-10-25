// Сторож распознавания общей кнопки в аудите «назад» (scripts/back_button_audit_detect.mjs).
// зачем (Макеты e9d51db21, координатор 26.10): сканер писал «НЕТ «назад»» у level_exam (ExamHeader → SafeTopBackButton) и
// combined_lesson_pick (SafeTopBackButton напрямую). Запуск: node --test tests/back_button_audit_detect.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHARED_BACK_EXPORTS, SHARED_CLOSE_EXPORTS, sharedBackTag, sharedCloseTag } from '../scripts/back_button_audit_detect.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('список вариантов совпадает с экспортами-кнопками модуля общей кнопки', () => {
  const src = read('components/v2/ScreenBackButton.tsx');
  const memoExports = [...src.matchAll(/export const (\w+) = memo\(function \1\(/g)].map((m) => m[1]);
  const defaultExport = /export default (\w+);/.exec(src)?.[1];
  const buttons = [...new Set([defaultExport, ...memoExports].filter(Boolean))].sort();
  assert.deepEqual(buttons, [...SHARED_BACK_EXPORTS, ...SHARED_CLOSE_EXPORTS].sort(),
    'у модуля появилась новая кнопка — добавь её в back_button_audit_detect.mjs (назад или закрыть)');
});

test('combined_lesson_pick: SafeTopBackButton напрямую — общая «назад»', () => {
  assert.equal(sharedBackTag(read('app/combined_lesson_pick.tsx')), 'SafeTopBackButton');
});

test('level_exam: «назад» рисует обёртка ExamHeader из ExamGlassParts через SafeTopBackButton', () => {
  const exam = read('app/level_exam.tsx');
  assert.match(exam, /from '\.\.\/components\/level-exam\/ExamGlassParts'/);
  assert.match(exam, /<ExamHeader\b[^>]*onBack=/);
  assert.equal(sharedBackTag(read('components/level-exam/ExamGlassParts.tsx')), 'SafeTopBackButton');
});

test('синтетика: прямой вызов, «закрыть», чужое одноимённое и сам модуль кнопки', () => {
  const imp = "import ScreenBackButton, { SafeTopBackButton, SafeTopCloseButton } from '../components/v2/ScreenBackButton';\n";
  assert.equal(sharedBackTag(`${imp}<ScreenBackButton onPress={x} />`), 'ScreenBackButton');
  assert.equal(sharedBackTag(`${imp}<SafeTopCloseButton onPress={x} />`), null);
  assert.equal(sharedCloseTag(`${imp}<SafeTopCloseButton onPress={x} />`), 'SafeTopCloseButton');
  // без импорта общего модуля одноимённый тег — не общая кнопка
  assert.equal(sharedBackTag("import { SafeTopBackButton } from './local';\n<SafeTopBackButton />"), null);
  assert.equal(sharedBackTag(read('components/v2/ScreenBackButton.tsx')), null);
});
