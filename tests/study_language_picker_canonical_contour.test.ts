import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
