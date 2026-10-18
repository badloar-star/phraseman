// зачем (вердикт Макетов 92b1349d8, learning-v2-007; решение координатора 18.10): V2 «Все уроки» — по эталону 1.6 (learning-v2.html, lessonsList/lrow):
// чипы уровней A1–B2 и справа «Классический курс» (значок albums), строки без стеклянных карточек старого каталога, в шапке только «назад» + «Все уроки».
// Меняется вид; нажатия, замки, прогресс и переход в урок — прежние функции.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const course = read('components/learning-v2/LearningV2ChaptersCourse.tsx');
const list = read('components/learning-v2/LearningV2AllLessonsList.tsx');
const blockStart = course.indexOf('if (allLessonsOpen) {');
const block = course.slice(blockStart, course.indexOf('\n    </View>;\n  }\n', blockStart));

test('экран «Все уроки» подключает список по эталону и не рисует карточки старого каталога', () => {
  assert.ok(course.includes('import LearningV2AllLessonsList, { type AllLessonsRow } from "./LearningV2AllLessonsList";'));
  assert.ok(block.includes('<LearningV2AllLessonsList'));
  assert.ok(!block.includes('props.renderLessonCard('), 'нет карточек `.lc` из lessons.tsx');
  assert.ok(!block.includes('fallbackLesson'));
  assert.ok(!block.includes('legacyButton'), 'нижней плашки «Классический курс» больше нет — она в ряду чипов');
  assert.ok(!block.includes('props.headerAccessory'), 'в шапке только «назад» и название — без значков монет и энергии');
});

test('нажатия те же: открытая строка → openLesson, закрытая → onLockedLessonPress; лог [ALL-LESSONS] tap', () => {
  assert.ok(block.includes('onOpenLesson={openLesson}'));
  assert.ok(block.includes('onLockedLesson={props.onLockedLessonPress}'));
  assert.ok(list.includes('"[ALL-LESSONS] tap"'));
  assert.ok(list.includes('JSON.stringify({ id: row.ordinal, locked, inProgress: row.isInProgress, decision })'));
  assert.ok(list.includes('if (locked) onLockedLesson(row.ordinal);\n    else onOpenLesson(row.ordinal);'), 'закрытая строка не открывается');
});

test('чипы уровней — фильтр, плашка «Классический курс» справа со значком albums', () => {
  assert.ok(list.includes('COURSE_LEVELS.map((code) =>'));
  assert.ok(list.includes('COURSE_LEVEL_RANGES[level]'));
  assert.match(list, /testID="learning-v2-all-lessons-classic"/);
  assert.ok(list.includes('name="albums-outline"'));
  assert.match(list, /classicChip: \{ marginLeft: "auto", flexShrink: 1, maxWidth: "100%" \}/);
  assert.match(list, /chips: \{ flexDirection: "row", flexWrap: "wrap"/, 'ряд переносится при крупном шрифте/длинных языках');
});

test('строка lrow: метка «A1 · 01 · Текущий», название, кольцо прогресса, замок, ключ; список — FlatList с мемоизированными строками', () => {
  assert.ok(list.includes('`${level} · ${String(row.ordinal).padStart(2, "0")}${row.isCurrent ? ` · ${currentWord}` : ""}`'));
  assert.ok(list.includes('const LessonRow = memo('));
  assert.ok(list.includes('<FlatList'));
  assert.ok(list.includes('name="lock-closed"') && list.includes('name="construct-outline"'));
  assert.ok(list.includes('const ProgressRing = memo('));
  assert.match(list, /rowMeta: \{ fontSize: 13, lineHeight: 17, fontWeight: "700", letterSpacing: 0\.4 \}/);
  assert.match(list, /rowTitle: \{ fontSize: 16, lineHeight: 21, fontWeight: "700"/);
});

test('подписи переносятся, не обрезаются; ужатия шрифта нет; метка «Текущий» есть на всех 9 языках', () => {
  assert.ok(!list.includes('adjustsFontSizeToFit'));
  assert.ok(!list.includes('numberOfLines'));
  const word = list.slice(list.indexOf('const CURRENT_WORD'), list.indexOf('};', list.indexOf('const CURRENT_WORD')));
  for (const lang of ['ru', 'uk', 'en', 'es', '"pt-BR"', 'vi', 'id', 'tr', 'pl']) assert.ok(new RegExp(`${lang}: "[^"]+"`).test(word), lang);
  assert.match(course, /allLessonsTitle: \{ flex: 1, minWidth: 0, fontSize: 34, lineHeight: 40, fontWeight: "700", letterSpacing: -0\.5 \}/);
});

test('классический каталог не тронут: мост renderLessonCard в lessons.tsx остаётся', () => {
  const lessons = read('app/(tabs)/lessons.tsx');
  assert.ok(lessons.includes('renderLessonCard={({ title, ordinal'));
});
