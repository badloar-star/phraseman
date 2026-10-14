import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  isPulseLessonMapAvailable,
  isPulseLessonWorkInProgress,
} from '../components/learning-v2/learningV2PulseGeometry';
import { normalizeEol } from './helpers/read_source';

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
const read = (file: string) => normalizeEol(readFileSync(join(process.cwd(), file), 'utf8'));

assert.equal(isPulseLessonMapAvailable(1), true);
assert.equal(isPulseLessonMapAvailable(32), true);
assert.equal(isPulseLessonMapAvailable(0), false);
assert.equal(isPulseLessonMapAvailable(33), false);

const completeLesson = new Set(
  Array.from({ length: 56 }, (_, index) =>
    `lesson-01:session:${String(index + 1).padStart(2, '0')}`,
  ),
);
assert.equal(isPulseLessonWorkInProgress(1, completeLesson), false);
completeLesson.delete('lesson-01:session:56');
assert.equal(isPulseLessonWorkInProgress(1, completeLesson), true);
assert.equal(isPulseLessonWorkInProgress(32, new Set()), true);

const route = read('app/learning-v2/course.tsx');
const layout = read('app/_layout.tsx');
const lessons = read('app/(tabs)/lessons.tsx');

// зачем (план Б 16.10): маршрут курса не режется сборкой; уводит на Главную ТОЛЬКО рубильник «V2 скрыт» (решение владельца).
assert.doesNotMatch(route, /if \(!ENABLE_DEV_TOOLS\)/u);
assert.equal((route.match(/<Redirect/gu) ?? []).length, 1);
assert.match(route, /if \(isLearningV2Hidden\(\)\) \{\n[^\n]*logLearningV2Hidden[^\n]*\n\s*return <Redirect href=\{LEARNING_V2_HIDDEN_REDIRECT\} \/>;/u);
assert.doesNotMatch(layout, /isBlockedLearningV2RoutePath/u);
// зачем (владелец 11.10: «LEARNING V2 ПОПАДАЕТ», курс виден всем сразу): вырез 10.10 снят — вход в курс открыт во всех сборках.
// зачем (владелец 11.10: «ТАМ ДОЛЖНО ПОКАЗЫВАТЬСЯ СТОЛЬКО СКОЛЬКО ДОСТУПНО»): вход — только если есть выпущенные занятия.
assert.match(lessons, /const LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY = !LEARNING_V2_HIDDEN && \(LEARNING_V2_HAS_RELEASED_SESSIONS_V1 \|\| ENABLE_DEV_TOOLS\);/u);
assert.doesNotMatch(
  lessons,
  /\{ENABLE_DEV_TOOLS \? \(\s*<TabUnderlineButton\s*\n\s*label="V2"/u,
);

assert.match(
  lessons,
  /const learningV2DevUnlockControl = __DEV__ && ENABLE_DEV_TOOLS \? \(/u,
);
assert.match(
  lessons,
  /const learningV2DevUnlockAllActive =\s*__DEV__ && ENABLE_DEV_TOOLS/u,
);
assert.match(
  lessons,
  /page === "v2" && learningV2InProgress/u,
  'available lessons that are still in progress must use a distinct card shade',
);
assert.match(
  lessons,
  // зачем (b13f3f5b3): палитра уровня теперь берётся из токенов активной темы (levelInkGlass), а не из статичной книги
  /darkenHexCached\(bookPalette\(num, themeMode, levelInkGlass\), 0\.1\)/u,
  'the WIP shade should stay subtle and derive from the real lesson palette',
);

process.stdout.write('LEARNING V2 RELEASE ACCESS CONTRACT: PASS\n');
}

if (typeof test === "function") {
  test("learning_v2_release_access_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
