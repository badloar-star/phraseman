import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { SEASON_CARD_COPY, seasonTasksLabel } from "../components/learning-v2/season/season_copy_card";
import { SEASON_CHAPTER_EXAM_ENABLED } from "../components/learning-v2/season/season_flags";
import {
  SEASON_PREVIEW_STATES, isSeasonPreviewState, seasonPreviewChapterInfo, seasonPreviewEpisodeIndex, seasonPreviewExamIndex,
  seasonPreviewRows, seasonPreviewSetup,
} from "../components/learning-v2/season/season_preview_fixtures";
import { buildSeasonDeck } from "../components/learning-v2/season/season_course_model";

// зачем (координатор 21.10, Сверка): dev-вход /dev_season_preview даёт состояния экрана «Обучение» на моках, не подменяя боевую вкладку «Уроки». Сторож:
// состояния и моки согласованы с колодой, маршрут в релизе уводит на Главную и не ходит в сеть, боевой код маршрут/моки не импортирует, действия экзамена
// закрыты флагом, тексты раскрытой карты — на 9 языках.
const read = (rel: string): string => readFileSync(rel, "utf8").replace(/\r\n/g, "\n");

async function main(): Promise<void> {
  // ── состояния ──
  assert.deepEqual([...SEASON_PREVIEW_STATES], ["cover", "newcomer", "carousel", "locked_open", "chapter_picker", "exam_card", "exam_open"]);
  assert.ok(isSeasonPreviewState("exam_card"));
  assert.ok(!isSeasonPreviewState("lobby"));
  assert.ok(!isSeasonPreviewState(undefined));

  for (const state of SEASON_PREVIEW_STATES) {
    const { deck, initialState } = seasonPreviewSetup(state);
    // зачем (Сверка 22.10): карта «Экзамен главы» есть в колоде, только когда экзамен включён флагом
    assert.equal(deck.cards.length, SEASON_CHAPTER_EXAM_ENABLED ? 27 : 24, `${state}: 24 занятия${SEASON_CHAPTER_EXAM_ENABLED ? ' + 3 карты экзамена' : ', карты экзамена нет (флаг выключен)'}`);
    assert.equal(deck.cards.some((c) => c.kind === 'exam'), SEASON_CHAPTER_EXAM_ENABLED, `${state}: карта экзамена видна только при включённом экзамене`);
    assert.ok(deck.cards[initialState.selectedIndex], `${state}: стартовая карта есть в колоде`);
    if (initialState.expandedIndex !== null) assert.ok(deck.cards[initialState.expandedIndex], `${state}: раскрытая карта есть в колоде`);
  }

  const cover = seasonPreviewSetup("cover");
  assert.equal(cover.newcomer, false);
  assert.equal(cover.deck.cards[cover.deck.currentIndex].sessionOrdinal, 12, "в процессе: текущий эпизод 12");
  assert.equal(cover.initialState.selectedIndex, seasonPreviewEpisodeIndex(12));

  const newcomer = seasonPreviewSetup("newcomer");
  assert.equal(newcomer.newcomer, true);
  assert.equal(newcomer.deck.currentIndex, 0, "новичок: текущий — эпизод 1");
  assert.equal(newcomer.deck.cards[0].state, "current");
  assert.ok(newcomer.deck.cards.slice(1).every((c) => c.state !== "done"), "новичок: ничего не пройдено");

  const carousel = seasonPreviewSetup("carousel");
  assert.equal(carousel.deck.cards[carousel.initialState.selectedIndex].state, "locked", "карусель стоит на закрытом эпизоде 14");
  assert.equal(carousel.deck.cards[carousel.initialState.selectedIndex].sessionOrdinal, 14);
  assert.equal(carousel.initialState.expandedIndex, null);
  const lockedOpen = seasonPreviewSetup("locked_open");
  assert.equal(lockedOpen.initialState.expandedIndex, lockedOpen.initialState.selectedIndex, "закрытая карта раскрыта");

  const fan = seasonPreviewSetup("chapter_picker");
  assert.equal(fan.initialState.fanChapter, 2, "«Вся глава»: глава 2");
  assert.equal(fan.initialState.expandedIndex, null);

  const exam = seasonPreviewSetup("exam_card");
  const examCard = exam.deck.cards[exam.initialState.selectedIndex];
  // экзамен выключен: состояние встаёт на последний эпизод главы 2 — закрытый (как «🔒 16» эталона: пройдены 1–11, «3 из 8»)
  assert.equal(examCard.kind, SEASON_CHAPTER_EXAM_ENABLED ? "exam" : "episode");
  assert.equal(examCard.chapterOrdinal, 2);
  assert.equal(examCard.state, "locked", "в эталоне глава 2 пройдена на 3 из 8: эпизод 16 закрыт (🔒), а не ✓");
  if (!SEASON_CHAPTER_EXAM_ENABLED) assert.equal((examCard as { sessionOrdinal: number }).sessionOrdinal, 16);
  assert.equal(exam.initialState.selectedIndex, seasonPreviewExamIndex(2));
  assert.equal(seasonPreviewSetup("exam_open").initialState.expandedIndex, seasonPreviewExamIndex(2));
  assert.equal(typeof SEASON_CHAPTER_EXAM_ENABLED, "boolean", "флаг экзамена главы — dev-условие (в выпуске выкл), кнопки прохождения не передаются, пока нет экрана");

  // индексы помощников совпадают с колодой
  const rows = seasonPreviewRows(11);
  const deck = buildSeasonDeck(rows, { includeExam: SEASON_CHAPTER_EXAM_ENABLED });
  assert.equal(deck.cards[seasonPreviewEpisodeIndex(9)].sessionOrdinal, 9);
  assert.equal(deck.cards[seasonPreviewExamIndex(1)].kind, SEASON_CHAPTER_EXAM_ENABLED ? "exam" : "episode");
  // колода без экзамена: ни одной карты экзамена, три главы по 8
  const noExam = buildSeasonDeck(rows, { includeExam: false });
  assert.equal(noExam.cards.length, 24);
  assert.ok(noExam.cards.every((c) => c.kind === "episode"));
  assert.deepEqual(noExam.chapters.map((c) => [c.chapterOrdinal, c.firstIndex, c.lastIndex, c.total]), [[1, 0, 7, 8], [2, 8, 15, 8], [3, 16, 23, 8]]);
  assert.equal(seasonPreviewChapterInfo(2).scene, "Кофе с коллегой");
  assert.equal(seasonPreviewChapterInfo(99).scene, "Воскресный звонок домой", "номер вне диапазона не падает");

  // ── маршрут: релиз, сеть, вход ──
  const route = read("app/dev_season_preview.tsx");
  assert.match(route, /if \(!ENABLE_DEV_TOOLS \|\| IS_STORE_RELEASE\) return <Redirect href="\/" \/>;/);
  assert.match(route, /import \{ ENABLE_DEV_TOOLS, IS_STORE_RELEASE \} from '\.\/config';/);
  assert.ok(!/fetch\(|httpsCallable|getDoc|firestore|AsyncStorage/i.test(route), "у превью нет сети и хранилища");
  assert.ok(!/\(tabs\)\/lessons/.test(route), "боевая вкладка «Уроки» не подменяется");
  assert.match(route, /setDevAppearance\(wanted\)/, "тема ссылкой — только в памяти");
  const fixtures = read("components/learning-v2/season/season_preview_fixtures.ts");
  assert.ok(!/fetch\(|httpsCallable|getDoc|firestore|AsyncStorage/i.test(fixtures), "моки не ходят в сеть");

  // боевая вкладка не знает про превью
  const lessons = read("app/(tabs)/lessons.tsx");
  assert.ok(!/dev_season_preview|season_preview_fixtures/.test(lessons), "боевой экран не импортирует превью");

  // ── экзамен за флагом ──
  const course = read("components/learning-v2/season/SeasonCourse.tsx");
  assert.match(course, /const examActions = SEASON_CHAPTER_EXAM_ENABLED;/);
  assert.match(course, /examActions && !locked && props\.onStartExam/, "«Сдать экзамен» только при включённом флаге");
  assert.match(course, /locked && examActions && props\.onOpenByExam/, "«Открыть экзаменом главы» только при включённом флаге");

  // ── тексты раскрытой карты: 9 языков, одинаковые подстановки ──
  const placeholders = (s: string) => [...s.matchAll(/\{[a-z]+\}/g)].map((m) => m[0]).sort().join(",");
  for (const [key, nine] of Object.entries(SEASON_CARD_COPY)) {
    assert.equal(nine.length, 9, `${key}: 9 языков`);
    for (const text of nine) {
      assert.ok(text.trim().length > 0, `${key}: пустой текст`);
      assert.equal(placeholders(text), placeholders(nine[0]), `${key}: подстановки одинаковы`);
    }
  }
  assert.equal(seasonTasksLabel("ru", 1), "1 задание");
  assert.equal(seasonTasksLabel("ru", 3), "3 задания");
  assert.equal(seasonTasksLabel("ru", 11), "11 заданий");
  assert.equal(seasonTasksLabel("ru", 20), "20 заданий");
  assert.equal(seasonTasksLabel("en", 20), "20 tasks");
}

if (typeof test === "function") {
  test("season_dev_preview_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
