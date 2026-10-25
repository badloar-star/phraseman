// ЗАМОК ВЛАДЕЛЬЦА 25.10 (через координатора, 🔴 Ревизора по f305f6ed6): в шторке занятия Learning V2 нет плиток
// «≈ 5 минут» и «3 попытки» — ни пропсов, ни русских значений по умолчанию, ни рендера. Раньше экран перестал их
// передавать, а значения по умолчанию на русском всплывали во всех 9 языках. Ослабить — только новым словом владельца.
// Запуск: node --test tests/owner_locks_session_sheet_no_time_attempts_2026_10_25.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const sheet = read('components/LearningV2SessionOutcomeSheet.tsx');
const lessons = read('app/(tabs)/lessons.tsx');

test('шторка занятия: нет пропсов и плиток времени и попыток', () => {
  assert.doesNotMatch(sheet, /durationLabel|attemptsLabel/);
  assert.doesNotMatch(sheet, /learning-v2-session-modal-(duration|attempts)/);
  assert.doesNotMatch(sheet, /"time-outline"|"heart-outline"/);
});

test('шторка занятия: никаких русских значений по умолчанию у фактов', () => {
  // зачем: только строковые литералы — комментарии с историей решения («≈ 5 минут») сторож не трогает
  assert.doesNotMatch(sheet, /["'`][^"'`\n]*(минут|попытк|новых слова)[^"'`\n]*["'`]/);
  assert.match(sheet, /wordsLabel = "",/);
});

test('экран уроков не передаёт время и попытки в шторку', () => {
  assert.doesNotMatch(lessons, /durationLabel=|attemptsLabel=/);
});
