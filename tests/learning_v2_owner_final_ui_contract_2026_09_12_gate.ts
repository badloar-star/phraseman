import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lessons = readFileSync("app/(tabs)/lessons.tsx", "utf8");
const pulse = readFileSync("components/learning-v2/LearningV2PulseCourse.tsx", "utf8");
const modal = readFileSync("components/LearningV2SessionOutcomeSheet.tsx", "utf8");
const energyBar = readFileSync("components/EnergyBar.tsx", "utf8");
const pocket = readFileSync("components/learning-v2/LearningV2WordPocketOverlayV1.tsx", "utf8");

// зачем: 2026-09-13 владелец закрыл курс Learning V2 от людей до его готовности —
// вход в уроки обязан открывать СТАРЫЕ уроки. Прежняя проверка требовала
// обратного (`initialPage = "v2"`) и сторожила ОТМЕНЁННОЕ правило. Актуальный
// сторож входа: tests/lessons_entry_opens_legacy_guard.test.ts.
assert.match(
  lessons,
  /initialPage\s*=\s*"lessons"/,
  "lesson entry must open the legacy course while Learning V2 is unfinished",
);
assert.doesNotMatch(lessons, /learning-v2-toggle-fullscreen/, "Learning V2 must not need an expand-screen control");
assert.match(lessons, /renderLessonCard=\{/);
assert.match(lessons, /learning-v2-lesson-progress-ring-/);
assert.match(lessons, /page === "v2" && studyTarget === "en"\) return LEARNING_V2_OWNER_EN_TITLES_RU/);
assert.doesNotMatch(lessons, /studyTarget === "en" && lang === "ru"/);
const lessonNameOffset = lessons.indexOf("{name}");
const lessonNameBlock = lessons.slice(
  lessons.lastIndexOf("<Text", lessonNameOffset),
  lessons.indexOf("</Text>", lessonNameOffset),
);
assert.doesNotMatch(lessonNameBlock, /numberOfLines|maxFontSizeMultiplier/);
assert.match(lessons, /<RuneBalanceChip/);
assert.match(lessons, /<EnergyBar[\s\S]*?compact/);
assert.match(energyBar, /testID="energy-numeric-pill"/);
assert.match(energyBar, /maxWidth/);
assert.match(energyBar, /const ENERGY_PILL_WIDTH = 60/);
assert.doesNotMatch(energyBar, /showWhenPremium/);
assert.match(energyBar, /if \(hasPremiumAccess\) return null/);
assert.match(lessons, /Сразу к практике/u);
assert.match(lessons, /skipIntro:\s*skipIntro \? "1"/);
assert.match(lessons, /onUnavailableLessonPress=\{/);
assert.match(lessons, /Урок ещё в работе/u);
assert.match(lessons, /!learningV2Available[\s\S]{0,120}"#B5BABD"\s*:\s*"#555960"/u);
assert.match(pulse, /props\.renderLessonCard/);
assert.match(pulse, /isPulseLessonAvailable/);
assert.match(pulse, /devReady/);
assert.match(pulse, /isSessionMaterialAvailable/);
assert.match(pulse, /const available = hasMaterial && \(ready \|\| devReady\)/);
assert.match(pulse, /!hasMaterial \? 'construct-outline'/);
assert.match(pulse, /row\.state === 'completed'[\s\S]{0,120}c\.complete/);
assert.match(pulse, /construct-outline/);
assert.match(pulse, /learning-v2-open-legacy-lessons/);
assert.match(pulse, /<PressableHybrid[\s\S]*?learning-v2-open-legacy-lessons/);
assert.doesNotMatch(
  pulse,
  /learning-v2-open-dialogs/,
  "the level rail must not contain the Dialogs utility action",
);
assert.match(
  lessons,
  /onPress=\{openDialogs\}/,
  "removing Dialogs from the level rail must preserve the existing Dialogs feature",
);
assert.match(pulse, /learning-v2-pulse-map-entry/);
assert.match(pulse, /styles\.mapHeaderTitle/);
assert.match(modal, /testID="learning-v2-session-modal-close"/);
assert.match(modal, /accessibilityLabel=\{closeLabel\}/);
assert.match(modal, /testID="learning-v2-session-modal-kicker"/);
assert.match(modal, /testID="learning-v2-session-skip-intro"/);
assert.doesNotMatch(modal, /orbPlate|borderBottomWidth:\s*5/);
assert.match(modal, /learning-v2-session-modal-duration/);
assert.match(modal, /learning-v2-session-modal-words/);
assert.match(modal, /learning-v2-session-modal-attempts/);
assert.doesNotMatch(modal, /styles\.grabber|GestureDetector/);
assert.match(lessons, /factoryNativeLearningV2NewWordCountV1/);
assert.doesNotMatch(lessons, /wordsLabel=\{triLang\(lang, \{ ru: "4 новых слова"/u);
assert.match(pocket, /BackHandler\.addEventListener\("hardwareBackPress", handleBack\)/);
assert.match(pocket, /accessibilityLabel=\{copy\.speak\(card\.en\)\}/);
assert.doesNotMatch(lessons, /count=\{1\}[\s\S]{0,100}clearLearningV2RuneFlight/,
  "the map must not fabricate a one-rune flight after a completed transition");

process.stdout.write("LEARNING V2 OWNER FINAL UI CONTRACT 2026-09-12: PASS\n");
