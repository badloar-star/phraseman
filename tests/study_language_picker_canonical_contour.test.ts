import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
const root = resolve(__dirname, '..');
const read = (...path: string[]) => readFileSync(resolve(root, ...path), 'utf8');
const settings = read('app', '(tabs)', 'settings.tsx');
const picker = read('components', 'settings', 'StudyLanguagePicker.tsx');

assert.doesNotMatch(settings, /<StudyLanguagePicker/);
assert.doesNotMatch(settings, /Изучаемый язык/);
assert.doesNotMatch(settings, /Выбранный язык применяется ко всем учебным разделам/);
assert.match(picker, /studyTargetsForSourceLocale\(lang\)/);
assert.doesNotMatch(picker, /ENABLE_DEV_STUDY_TARGET_LANG/);

console.log('STUDY LANGUAGE PICKER CANONICAL CONTOUR: PASS');
}

if (typeof test === "function") {
  test("study_language_picker_canonical_contour", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
