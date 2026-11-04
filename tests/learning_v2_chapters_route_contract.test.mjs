import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lessons = readFileSync("app/(tabs)/lessons.tsx", "utf8");
const v2BranchStart = lessons.indexOf('{page === "v2" ? (');
const legacyBranchStart = lessons.indexOf('testID="legacy-lessons-catalog"', v2BranchStart);
assert.notEqual(v2BranchStart, -1, "V2 lessons branch must exist");
assert.notEqual(legacyBranchStart, -1, "legacy lessons branch must exist");

const v2Branch = lessons.slice(v2BranchStart, legacyBranchStart);
// зачем (владелец 04.11, Android-лаги): карта глав подключается лениво через app/learning_v2_lessons_lazy.ts
const lazySurface = readFileSync("app/learning_v2_lessons_lazy.ts", "utf8");
assert.match(lazySurface, /import\('\.\.\/components\/learning-v2\/LearningV2ChaptersCourse'\)/);
// зачем (перепин 28.10): с 22.10 (cf21076f9, Ф4) ветка V2 рисует LessonsCourseSurface — Сезон или карта глав по флагу SEASON_SCENE_V2_ENABLED
assert.match(lazySurface, /SEASON_SCENE_V2_ENABLED\s*\?\s*import\('\.\.\/components\/learning-v2\/season\/SeasonCourseConnected'\)\s*:\s*import\('\.\.\/components\/learning-v2\/LearningV2ChaptersCourse'\)/);
assert.match(v2Branch, /<LessonsCourseSurface/);
assert.doesNotMatch(
  v2Branch,
  /<LearningV2PulseCourse/,
  "the active V2 mount must no longer reach the pulse map",
);

process.stdout.write("LEARNING V2 CHAPTERS ROUTE CONTRACT: PASS\n");
