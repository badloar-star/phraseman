import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const lessons = readFileSync("app/(tabs)/lessons.tsx", "utf8");
const copy = readFileSync("app/feature_intro_sections_copy.ts", "utf8");
const requestedIntro = readFileSync(
  "hooks/use_requested_feature_intro.ts",
  "utf8",
);
const featureAssets = readFileSync("app/feature_intro_assets.ts", "utf8");
const pulseCourse = readFileSync(
  "components/learning-v2/LearningV2PulseCourse.tsx",
  "utf8",
);

assert.match(copy, /id: 'legacy_lessons_first_visit'/);
assert.match(copy, /family: 'orbit'/);
assert.match(copy, /art: 'legacy_lessons'/);
assert.match(copy, /ru: 'Открыть старые уроки'/);
assert.match(featureAssets, /FeatureIntroAssetKey[\s\S]*?'legacy_lessons'/);
const legacyLessonsArtHashes: string[] = [];
for (const theme of [
  "dark",
  "gold",
  "olive",
  "midnight",
  "ember",
  "aurora",
  "volt",
  "indigo",
  "sagePorcelain",
]) {
  const assetPath = `assets/images/feature_intros/${theme}/feature-intro-${theme}-legacy-lessons.webp`;
  assert.match(
    featureAssets,
    new RegExp(
      `legacy_lessons: require\\('../assets/images/feature_intros/${theme}/feature-intro-${theme}-legacy-lessons\\.webp'\\)`,
    ),
  );
  assert.equal(existsSync(assetPath), true, `missing ${assetPath}`);
  legacyLessonsArtHashes.push(
    createHash("sha256").update(readFileSync(assetPath)).digest("hex"),
  );
}
assert.equal(
  new Set(legacyLessonsArtHashes).size,
  legacyLessonsArtHashes.length,
  "legacy lessons intro art must be generated separately for every theme",
);

assert.match(lessons, /useRequestedFeatureIntro\(/);
assert.match(lessons, /["']legacy_lessons_first_visit["']/);
assert.match(lessons, /testIdPrefix="legacy-lessons-first-visit"/);
assert.match(lessons, /onLegacyLessons=\{requestLegacyLessons\}/);
assert.match(lessons, /onLater=\{legacyLessonsIntro\.cancel\}/);
assert.match(
  requestedIntro,
  /const cancel[\s\S]*?pending\.current = false;[\s\S]*?setVisible\(false\)/,
);

assert.match(
  lessons,
  /const \[legacySelectedLevel, setLegacySelectedLevel\]\s*=\s*useState<CourseLevel>/,
);
assert.match(lessons, /COURSE_LEVELS\.map/);
assert.match(lessons, /COURSE_LEVEL_RANGES\[legacySelectedLevel\]/);
assert.match(lessons, /testID="legacy-lessons-level-rail"/);
assert.match(lessons, /testID="legacy-lessons-level-rail"[\s\S]*?flex: 1,[\s\S]*?minWidth: 0/);
assert.match(lessons, /selected \? t\.correctText : t\.textSecond/);
assert.match(lessons, /testID="legacy-lessons-open-new-lessons"/);
assert.match(lessons, /ru: "Новые уроки"/);
assert.match(lessons, /data=\{legacyFilteredListData\}/);

const legacyBranch = lessons.slice(
  lessons.indexOf('testID="legacy-lessons-catalog"'),
  lessons.indexOf('data={legacyFilteredListData}') + 50,
);
assert.doesNotMatch(legacyBranch, /TabUnderlineButton|Диалоги|Маршрут|label="V2"/);
assert.doesNotMatch(legacyBranch, /t\.textSecondary/);
assert.doesNotMatch(pulseCourse, /testID="learning-v2-open-dialogs"/);
assert.doesNotMatch(pulseCourse, /dialogsLabel: string|onDialogs: \(\) => void/);
assert.doesNotMatch(lessons, /dialogsLabel=\{|onDialogs=\{openDialogs\}/);
assert.match(pulseCourse, /section: \{[\s\S]*?minWidth: 54,[\s\S]*?minHeight: 44/);
assert.match(pulseCourse, /accessibilityRole="tab"[\s\S]*?accessibilityState=\{\{ selected:/);
assert.match(pulseCourse, /utilitySectionText: \{ flexShrink: 1,[\s\S]*?fontSize: 14/);
assert.match(pulseCourse, /<PressableHybrid[\s\S]*?testID=\{`learning-v2-level-/);
assert.match(pulseCourse, /<PressableHybrid[\s\S]*?testID="learning-v2-open-legacy-lessons"/);
assert.match(
  pulseCourse,
  /testID="learning-v2-level-rail"[\s\S]*?<\/ScrollView>[\s\S]*?testID="learning-v2-open-legacy-lessons"/,
);
assert.match(pulseCourse, /utilitySection: \{[\s\S]*?maxWidth: 160/);
assert.match(
  legacyBranch,
  /minWidth: 52,[\s\S]*?minHeight: 44,[\s\S]*?paddingHorizontal: 12/,
);
assert.match(
  legacyBranch,
  /testID="legacy-lessons-level-rail"[\s\S]*?<\/ScrollView>[\s\S]*?testID="legacy-lessons-open-new-lessons"/,
);
assert.match(legacyBranch, /maxWidth: 150/);
assert.match(legacyBranch, /minWidth: 44,[\s\S]*?maxWidth: 150/);
assert.match(legacyBranch, /testID="legacy-lessons-open-new-lessons"[\s\S]*?fontSize: 13,/);
assert.match(legacyBranch, /testID="legacy-lessons-open-new-lessons"[\s\S]*?flexShrink: 1,[\s\S]*?textAlign: "center"/);
assert.match(legacyBranch, /<PressableHybrid[\s\S]*?testID=\{`legacy-lessons-level-/);
assert.match(legacyBranch, /<PressableHybrid[\s\S]*?testID="legacy-lessons-open-new-lessons"/);

process.stdout.write("LEARNING V2 LEGACY LESSONS ENTRY 2026-09-12: PASS\n");
