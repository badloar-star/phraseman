// зачем (владелец 11.10: «ТАМ ДОЛЖНО ПОКАЗЫВАТЬСЯ СТОЛЬКО СКОЛЬКО ДОСТУПНО»): игрок видит только занятия V2, которые реально
// открываются. Сторож держит одно правило во всех звеньях: артефакт → слой доступности → экран уроков → карта → ворота.
// Сработал — чинить звено, а не снимать проверку.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

test('артефакт: целые неотрицательные числа, префикс не длиннее манифеста', () => {
  const artifact = read('app/learning_v2_bundle_availability_v1.generated.ts');
  const value = (name) => Number(new RegExp(`export const ${name} = (\\d+);`).exec(artifact)?.[1]);
  const ceiling = value('LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1');
  const buildable = value('LEARNING_V2_BUNDLE_BUILDABLE_TOTAL_V1');
  const manifest = value('LEARNING_V2_BUNDLE_MANIFEST_TOTAL_V1');
  for (const n of [ceiling, buildable, manifest]) assert.ok(Number.isInteger(n) && n >= 0, artifact);
  assert.ok(ceiling <= buildable || manifest === 0, 'префикс не может быть длиннее числа собирающихся');
  assert.ok(buildable <= manifest || manifest === 0, 'собирающихся не больше строк манифеста');
});

test('экран уроков: вход и множество занятий — по выпущенному префиксу', () => {
  const lessons = read('app/(tabs)/lessons.tsx');
  assert.match(lessons, /const LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY = !LEARNING_V2_HIDDEN && \(LEARNING_V2_HAS_RELEASED_SESSIONS_V1 \|\| ENABLE_DEV_TOOLS\);/);
  assert.match(lessons, /authored\.filter\(\(session\) => isLearningV2SessionReleasedV1\(session\.lessonOrdinal, session\.sessionOrdinal\)\)/);
  // вход в занятие, прогрев и карта пользуются одним множеством
  assert.ok((lessons.match(/learningV2FactoryNativeSessionIds\.has\(/g) ?? []).length >= 4);
});

test('карта: недоступные занятия, пустые главы и уроки не рисуются', () => {
  const map = read('components/learning-v2/LearningV2ChaptersCourse.tsx');
  assert.match(map, /row\.kind === "session" && isSessionVisible\(row\.lessonOrdinal, row\.sessionOrdinal\)/);
  assert.match(map, /if \(chapterSessions\.length === 0\) return null;/);
  // перепин 18.10: «Все уроки» вынесен в LearningV2AllLessonsList; невыпущенные уроки по-прежнему не рисуются — строки строятся только из visibleLessonOrdinals
  assert.match(map, /return visibleLessonOrdinals\.map\(\(ordinal\) => \(\{/);
  assert.doesNotMatch(map, /props\.titles\.map\(\(title, index\) =>[\s\S]{0,200}renderLessonCard/);
});

test('ворота «Озвучка встроенных занятий V2» проверяют выпущенное множество', () => {
  const gate = read('scripts/learning_v2_audio_coverage_gate.mjs');
  assert.match(gate, /const TEST = 'tests\/learning_v2_bundle_availability\.test\.ts';/);
  assert.ok(fs.existsSync(path.join(ROOT, 'tests/learning_v2_bundle_availability.test.ts')));
});
