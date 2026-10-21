import assert from "node:assert/strict";

import { SEASON_LESSON_HUE_STEP_DEG, oklchToHex, seasonArt, seasonArtCached, seasonCardShift, seasonChapterHue } from "../components/learning-v2/season/season_art";
import { SEASON_CHAPTER_EXAM_ENABLED } from "../components/learning-v2/season/season_flags";
import {
  SEASON_CAROUSEL, seasonCardLayout, seasonNearestIndex, seasonSnapTarget, seasonWindowIndexes,
} from "../components/learning-v2/season/season_carousel_layout";
import {
  buildSeasonDeck, seasonChapterOfIndex, seasonChapterProgress, seasonUnlockAfter, seasonCardState,
} from "../components/learning-v2/season/season_course_model";
import {
  learningV2CourseSessionIdV1, learningV2CourseSessionRoleV1,
} from "../modules/learning-v2/content/course_topology_v1";
import type { LearningV2CourseAccordionRowV1 } from "../modules/learning-v2/map/course_accordion_map_model_v1";

// зачем (владелец 21.10, эталон course-hybrid-1-4.html «Способ 2», фаза 1): чистые части экрана «Обучение» — цвета обложек глав, формулы карусели и колода карт из прогресса.
async function main(): Promise<void> {
  // ── цвета: OKLCH → hex ──
  assert.equal(oklchToHex(1, 0, 0), "#FFFFFF");
  assert.equal(oklchToHex(0, 0, 0), "#000000");
  const gray = oklchToHex(0.5, 0, 123);
  assert.match(gray, /^#([0-9A-F]{2})\1\1$/, "нулевая насыщенность — серый");
  const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [r, , b] = hexRgb(oklchToHex(0.53, 0.15, 258));
  assert.ok(b > r, "оттенок 258° — синий: канал B больше R");
  const [r2, g2] = hexRgb(oklchToHex(0.6, 0.15, 140));
  assert.ok(g2 > r2, "оттенок 140° — зелёный: канал G больше R");
  // за пределами sRGB цвет не рвётся: результат валидный hex
  assert.match(oklchToHex(0.7, 0.4, 30), /^#[0-9A-F]{6}$/);

  const light = seasonArt(258, 4, "light");
  const dark = seasonArt(258, 4, "dark");
  for (const art of [light, dark]) for (const c of [art.from, art.glow, art.to]) assert.match(c, /^#[0-9A-F]{6}$/);
  const lum = (hex: string) => hexRgb(hex).reduce((a, v) => a + v, 0);
  assert.ok(lum(light.from) > lum(light.to), "градиент светлой темы идёт от светлого к тёмному");
  assert.ok(lum(dark.from) < lum(light.from), "в тёмной теме обложка глубже");
  assert.equal(seasonArtCached(200, 8, "light"), seasonArtCached(200, 8, "light"), "мемо отдаёт тот же объект");

  // оттенки глав: урок 1 — таблица эталона, остальные — сдвиг на 37°
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((c) => seasonChapterHue(1, c)), [258, 200, 304, 168, 340, 228, 282]);
  assert.equal(seasonChapterHue(2, 1), (258 + 37) % 360);
  assert.equal(seasonCardShift(12), 16);
  assert.equal(seasonCardShift(16), 0);

  // ── карусель ──
  const c0 = seasonCardLayout(0);
  assert.deepEqual([c0.translateX, c0.scale, c0.rotateYDeg, c0.opacity, c0.zIndex], [0, 1, -0, 1, 10]);
  const p1 = seasonCardLayout(1);
  const m1 = seasonCardLayout(-1);
  assert.ok(Math.abs(p1.translateX + m1.translateX) < 1e-9, "симметрия по X");
  assert.equal(p1.rotateYDeg, -SEASON_CAROUSEL.rotateDeg);
  assert.equal(m1.rotateYDeg, SEASON_CAROUSEL.rotateDeg);
  assert.ok(Math.abs(p1.scale - 900 / 980) < 1e-9, "масштаб = перспективная проекция translateZ(−80)");
  assert.ok(Math.abs(p1.translateX - 116 * (900 / 980)) < 1e-9, "сдвиг умножается на проекцию");
  assert.equal(p1.opacity, 1);
  assert.equal(seasonCardLayout(2).opacity, SEASON_CAROUSEL.farOpacity);
  assert.equal(seasonCardLayout(3).opacity, SEASON_CAROUSEL.farOpacity);
  assert.ok(seasonCardLayout(1.5).opacity < 1 && seasonCardLayout(1.5).opacity > SEASON_CAROUSEL.farOpacity, "между 1 и 2 прозрачность плавно падает");
  assert.ok(seasonCardLayout(0.2).zIndex > seasonCardLayout(1.2).zIndex, "центр выше соседей по слоям");
  assert.ok(seasonCardLayout(2).scale < p1.scale, "дальняя карта мельче");

  assert.equal(seasonNearestIndex(2.4, 5), 2);
  assert.equal(seasonNearestIndex(2.6, 5), 3);
  assert.equal(seasonNearestIndex(-3, 5), 0);
  assert.equal(seasonNearestIndex(99, 5), 4);
  assert.equal(seasonNearestIndex(1, 0), 0);
  assert.deepEqual(seasonWindowIndexes(0, 10), [0, 1, 2]);
  assert.deepEqual(seasonWindowIndexes(5, 10), [3, 4, 5, 6, 7]);
  assert.deepEqual(seasonWindowIndexes(9, 10), [7, 8, 9]);
  assert.deepEqual(seasonWindowIndexes(4.5, 10), [2, 3, 4, 5, 6, 7], "дробная позиция — окно покрывает обе соседние карты");
  assert.deepEqual(seasonWindowIndexes(0, 1), [0]);
  // смахивание: влево — к следующей, вправо — к предыдущей, медленно — к ближайшей, края зажаты
  assert.equal(seasonSnapTarget(2.1, -900, 5), 3);
  assert.equal(seasonSnapTarget(2.1, 900, 5), 2);
  assert.equal(seasonSnapTarget(2.4, 0, 5), 2);
  assert.equal(seasonSnapTarget(2.6, 0, 5), 3);
  assert.equal(seasonSnapTarget(4, -900, 5), 4);
  assert.equal(seasonSnapTarget(0, 900, 5), 0);

  // ── колода карт: 8 эпизодов главы + отдельная 9-я карта «Экзамен главы» ──
  const rows: LearningV2CourseAccordionRowV1[] = [{ kind: "lesson", id: "lesson-01", lessonOrdinal: 1 }];
  const currentOrdinal = 12;
  for (let s = 1; s <= 24; s += 1) {
    rows.push({
      kind: "session", id: learningV2CourseSessionIdV1(1, s), lessonOrdinal: 1, sessionOrdinal: s,
      chapterOrdinal: Math.ceil(s / 8), positionInChapter: ((s - 1) % 8) + 1, role: learningV2CourseSessionRoleV1(s),
      state: s < currentOrdinal ? "completed" : s === currentOrdinal ? "current" : s === currentOrdinal + 1 ? "next" : "locked",
    });
  }
  // индекс карты-эпизода в колоде: после каждых 8 эпизодов вставлена карта экзамена
  const idx = (ordinal: number): number => (ordinal - 1) + Math.floor((ordinal - 1) / 8);
  const deck = buildSeasonDeck(rows);
  assert.equal(deck.cards.length, 27, "24 занятия + 3 карты экзамена");
  assert.equal(deck.currentIndex, idx(12), "текущий — эпизод 12 (экзамены не в счёт)");
  assert.equal(deck.cards[idx(12)].state, "current");
  assert.equal(deck.cards[idx(1)].state, "done");
  assert.equal(deck.cards[idx(13)].state, "locked", "«next» в приложении недоступно — на карте закрыто");
  assert.equal(seasonCardState("next"), "locked");
  // 8-е занятие («Проверка главы») — обычный эпизод; экзамен — отдельная карта после него
  assert.equal(deck.cards[idx(8)].kind, "episode");
  assert.equal(deck.cards[idx(8) + 1].kind, "exam");
  assert.deepEqual(deck.cards.map((c, i) => (c.kind === "exam" ? i : -1)).filter((i) => i >= 0), [8, 17, 26]);
  assert.deepEqual(deck.cards.filter((c) => c.kind === "exam").map((c) => c.chapterOrdinal), [1, 2, 3]);
  assert.match(deck.cards[8].id, /^exam:lesson-01:chapter-1$/);
  // состояние экзамена: все занятия главы пройдены — доступен (current), иначе закрыт; на «текущий эпизод» и счётчики не влияет
  assert.equal(deck.cards[8].state, "current", "глава 1 пройдена целиком — экзамен доступен");
  assert.equal(deck.cards[17].state, "locked", "в главе 2 не всё пройдено");
  assert.equal(deck.cards[26].state, "locked");
  // главы: три, границы включают карту экзамена, счётчик занятий без экзамена
  assert.deepEqual(deck.chapters.map((c) => [c.chapterOrdinal, c.firstIndex, c.lastIndex, c.total]), [[1, 0, 8, 8], [2, 9, 17, 8], [3, 18, 26, 8]]);
  assert.equal(seasonChapterOfIndex(deck, idx(12))?.chapterOrdinal, 2);
  assert.equal(seasonChapterOfIndex(deck, 17)?.chapterOrdinal, 2, "карта экзамена принадлежит своей главе");
  assert.equal(seasonChapterOfIndex(deck, 99), null);
  assert.deepEqual(seasonChapterProgress(deck, 2), { done: 3, total: 8 }, "в главе 2 пройдены 9, 10, 11 — три из восьми");
  assert.deepEqual(seasonChapterProgress(deck, 1), { done: 8, total: 8 });
  assert.deepEqual(seasonChapterProgress(deck, 9), { done: 0, total: 0 });
  // «Откроется после эпизода N»: у эпизода 14 ближайший непройденный предыдущий — 13, у 13 — текущий 12; карты экзамена в подсказке не участвуют
  assert.equal(seasonUnlockAfter(deck, idx(14)), 13);
  assert.equal(seasonUnlockAfter(deck, idx(13)), 12);
  assert.equal(seasonUnlockAfter(deck, idx(12)), null, "текущая карта не закрыта — подсказки нет");
  assert.equal(seasonUnlockAfter(deck, 17), 16, "экзамен главы 2 откроется после эпизода 16");
  assert.equal(seasonUnlockAfter(deck, idx(17)), 16, "эпизод 17 (глава 3) — после 16; закрытый экзамен главы 2 не считается");
  assert.equal(seasonUnlockAfter(deck, 8), null, "экзамен пройденной главы не закрыт");
  assert.equal(seasonUnlockAfter(deck, 0), null);
  assert.equal(seasonUnlockAfter(deck, 500), null);

  // крайние случаи: пустой урок, всё пройдено, строки вперемешку, нет текущего
  const empty = buildSeasonDeck([]);
  assert.deepEqual([empty.cards.length, empty.chapters.length, empty.currentIndex], [0, 0, 0]);
  const allDone = buildSeasonDeck(rows.map((r) => (r.kind === "session" ? { ...r, state: "completed" as const } : r)));
  assert.equal(allDone.currentIndex, idx(24), "всё пройдено — последний эпизод, а не карта экзамена");
  assert.ok(allDone.cards.filter((c) => c.kind === "exam").every((c) => c.state === "current"), "всё пройдено — все экзамены доступны");
  const shuffled = buildSeasonDeck([...rows].reverse());
  assert.deepEqual(shuffled.cards.map((c) => c.id), deck.cards.map((c) => c.id), "порядок карт не зависит от порядка строк");
  const noCurrent = buildSeasonDeck(rows.map((r) => (r.kind === "session" && r.state === "current" ? { ...r, state: "next" as const } : r)));
  assert.equal(noCurrent.currentIndex, idx(12), "нет текущей — первый закрытый эпизод");

  // сдвиг оттенка на урок — константа, а не число в формуле
  assert.equal(SEASON_LESSON_HUE_STEP_DEG, 37);
  assert.equal(seasonChapterHue(3, 2), (200 + 2 * SEASON_LESSON_HUE_STEP_DEG) % 360);
  // действия экзамена спрятаны за флагом: пока логики экзамена нет — выключен
  assert.equal(SEASON_CHAPTER_EXAM_ENABLED, false);

  console.log("SEASON PURE (phase 1): PASS");
}

if (typeof test === "function") {
  test("season_pure_phase1", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
