import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/(tabs)/lessons.tsx", "utf8");

assert.match(
  source,
  /import PressableHybrid from "\.\.\/\.\.\/components\/PressableHybrid"/,
  "the floating dictionary control must use the shared hybrid press primitive",
);
assert.doesNotMatch(
  source,
  /import\s*\{[^}]*\bPressable\b[^}]*\}\s*from\s*"react-native"/s,
  "the Learning V2 controls must not regress to a bare React Native Pressable",
);
assert.match(
  source,
  /LearningV2LessonDictionaryOverlayV1/,
  "the Learning V2 map must render the real lesson dictionary overlay",
);
assert.match(
  source,
  /useLearningV2CourseUnlockedWordsV1/,
  "the map dictionary must read the durable unlock registry for the whole course",
);
assert.match(
  source,
  /<PressableHybrid[\s\S]*?testID="learning-v2-map-dictionary-open"/,
  "the map needs an owner-visible dictionary control in the header",
);
assert.match(
  source,
  /words=\{learningV2DictionaryWords\}/,
  "the overlay must receive the unlocked words it was given",
);

// ── Правило владельца 2026-09-21: словарь НЕ привязан к раскрытому уроку ──
//
// Прежняя редакция этого сторожа требовала
// `page === "v2" && expandedLearningV2Lesson !== null` и называла это
// «scoped to one expanded Learning V2 lesson». После перехода 20.09 на
// сплошную карту раскрытых уроков не существует: при обычном входе в раздел
// `expandedLearningV2Lesson` остаётся null, и кнопка, шторка и скоуп слов
// молча умирали все втроём. Сторож при этом оставался зелёным — он охранял
// сломанное состояние (второй такой случай за месяц, ср. сторож пейвола
// 14.09). Правило отменено владельцем: «все открытые слова курса».
//
// Сработал этот блок — не ослабляй его. Он означает, что кто-то вернул
// привязку к раскрытому уроку и снова сделал словарь недостижимым.
assert.doesNotMatch(
  source,
  /learningV2DictionaryOpen\s*&&\s*expandedLearningV2Lesson/,
  "the dictionary overlay must not be gated on an expanded lesson: the continuous map never sets one",
);
assert.doesNotMatch(
  source,
  /expandedLearningV2Lesson[\s\S]{0,200}?testID="learning-v2-map-dictionary-open"/,
  "the dictionary button must not be gated on an expanded lesson",
);
assert.match(
  source,
  /lessonOrdinal=\{null\}/,
  "the course dictionary passes no single lesson: each list section names its own",
);
assert.match(
  source,
  /LEARNING_V2_COURSE_LESSON_ORDINALS/,
  "the dictionary scope must cover every course lesson, not one",
);

// Батч вместо N чтений: 32 урока — это 32 ключа AsyncStorage.
const wordsStore = readFileSync("app/learning_v2_unlocked_lesson_words_v1.ts", "utf8");
assert.match(
  wordsStore,
  /AsyncStorage\.multiGet/,
  "course-wide word loading must batch its keys instead of reading them one by one",
);

assert.match(
  wordsStore,
  /export function subscribeLearningV2CourseUnlockedWordsV1/,
  "a word unlocked in any lesson must reach an already-open course dictionary",
);

// ── Шторка: заголовки уроков и поиск (решение владельца 2026-09-21) ──
const overlay = readFileSync(
  "components/learning-v2/LearningV2LessonDictionaryOverlayV1.tsx",
  "utf8",
);
assert.match(
  overlay,
  /kind: "lesson"; lessonOrdinal: number; count: number/,
  "the course dictionary groups words under lesson headings: 32 lessons in one flat list read as a pile",
);
assert.match(
  overlay,
  /testID="learning-v2-map-dictionary-search"/,
  "hundreds of words need a search field",
);
assert.match(
  overlay,
  /renderItem=\{renderRow\}/,
  "renderItem must be a stable reference: the search box re-renders on every keystroke",
);

process.stdout.write("LEARNING V2 MAP DICTIONARY INTEGRATION V1 GATE: PASS\n");
