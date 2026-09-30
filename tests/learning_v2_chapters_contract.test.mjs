import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "components/learning-v2/LearningV2ChaptersCourse.tsx",
  "utf8",
);

assert.match(
  source,
  /buildLearningV2CourseAccordionMapFromPreparedProgressV1/,
  "chapters course must derive rows from the canonical prepared-progress model",
);
assert.doesNotMatch(
  source,
  /pulseMapOffsetX/,
  "chapters course must not restore pulse-map geometry",
);
assert.match(source, /testID="learning-v2-chapters-course"/);
assert.match(source, /testID="learning-v2-all-lessons"/);
assert.match(source, /chapterRows\.map\(/);
assert.match(
  source,
  /onSessionPress\(row\.lessonOrdinal, row\.sessionOrdinal, row\.state\)/,
  "every session must preserve the canonical session callback and state",
);
assert.match(source, /row\.role === "chapter_checkpoint"/);
assert.match(source, /row\.role === "final_exam"/);
assert.match(
  source,
  /const \[selectedLessonOrdinal, setSelectedLessonOrdinal\] = useState\(canonicalCurrentLessonOrdinal\)/,
  "the active chapter view must retain a locally selected lesson",
);
assert.match(
  source,
  /expandedLessonOrdinal: selectedLessonOrdinal/,
  "the canonical rows must be projected for the selected lesson",
);
assert.match(
  source,
  /setSelectedLessonOrdinal\(ordinal\);[\s\S]*?props\.onExpandedLesson\(ordinal\);[\s\S]*?setAllLessonsOpen\(false\);/,
  "selecting any lesson must make it the active chapter view and notify the parent",
);
assert.match(
  source,
  /const cardProps = \{ title, ordinal, completedSessionCount, isCurrent: ordinal === selectedLessonOrdinal, isAvailable: true, isInProgress: false, onPress: \(\) => openLesson\(ordinal\) \}/,
  "all canonical lessons, including future locked lessons, must remain inspectable",
);
assert.doesNotMatch(
  source,
  /if \(!available\)[\s\S]*?onLockedLessonPress/,
  "lesson selection must not gate inspection by session state",
);
assert.doesNotMatch(
  source,
  /numberOfLines=/,
  "lesson titles must wrap rather than truncate",
);
assert.doesNotMatch(
  source,
  /setExpandedChapter\(\(previous\) => \{[\s\S]*?props\.on(?:ExpandedLesson|VisibleSessionsSettled)/,
  "chapter state setters must not fire parent callbacks from their updater",
);
assert.match(
  source,
  /onPress=\{hasMaterial \? \(\) => onSessionPress\(row\.lessonOrdinal, row\.sessionOrdinal, row\.state\) : undefined\}/,
  "a session without material must not expose an actionable press handler while marked disabled",
);
assert.match(
  source,
  /accessibilityState=\{\{ disabled: !hasMaterial \}\} disabled=\{!hasMaterial\}/,
  "the pressable primitive must receive the same disabled state exposed to assistive technology",
);

process.stdout.write("LEARNING V2 CHAPTERS CONTRACT: PASS\n");
