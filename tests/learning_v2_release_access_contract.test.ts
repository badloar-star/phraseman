import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  isPulseLessonMapAvailable,
  isPulseLessonWorkInProgress,
} from '../components/learning-v2/learningV2PulseGeometry';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

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

assert.doesNotMatch(route, /if \(!ENABLE_DEV_TOOLS\)|<Redirect/u);
assert.doesNotMatch(layout, /isBlockedLearningV2RoutePath/u);
assert.match(lessons, /const LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY = true/u);
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
  /darkenHexCached\(bookPalette\(num, themeMode\), 0\.1\)/u,
  'the WIP shade should stay subtle and derive from the real lesson palette',
);

process.stdout.write('LEARNING V2 RELEASE ACCESS CONTRACT: PASS\n');
