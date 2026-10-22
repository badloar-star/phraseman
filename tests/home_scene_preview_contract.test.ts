import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  HOME_SCENE_PREVIEW_EPISODES_PER_LESSON, HOME_SCENE_PREVIEW_STATES, homeScenePreviewHeaderWords, homeScenePreviewPlace, homeScenePreviewSetup,
  isHomeScenePreviewState,
} from "../components/home/v2/scene/home_scene_preview_fixtures";
import { HOME_SCENE_STATES, pickHomeSceneState } from "../components/home/v2/scene/home_scene_state";
import type { Lang } from "../constants/i18n";

// зачем (координатор 22.10, «Сверка»: без подмены воспроизводятся только «Новичок» и «Продолжить»): dev-вход /dev_home_scene_preview даёт
// все десять героев «Сцены» Главной. Сторож: моки фактов через НАСТОЯЩУЮ pickHomeSceneState дают каждого героя (так проверяется и приоритет),
// у Plus «нет энергии» и «серия прервалась» честно уходят в «Продолжить», числа совпадают с эталоном home-scene-states.html, маршрут в релизе
// уводит на Главную, не ходит в сеть и не трогает полосу под часами Главной, боевая Главная превью не импортирует.
const read = (rel: string): string => readFileSync(rel, "utf8").replace(/\r\n/g, "\n");
const LANGS: readonly Lang[] = ["ru", "uk", "en", "es", "pt-BR", "vi", "id", "tr", "pl"];

async function main(): Promise<void> {
  // ── состояния ──
  assert.deepEqual([...HOME_SCENE_PREVIEW_STATES], [...HOME_SCENE_STATES], "превью знает все десять героев таблицы");
  assert.ok(isHomeScenePreviewState("streak_lost"));
  assert.ok(!isHomeScenePreviewState("plus"));
  assert.ok(!isHomeScenePreviewState(undefined));

  // ── каждый герой — решением настоящей функции (Free) ──
  for (const state of HOME_SCENE_PREVIEW_STATES) {
    const setup = homeScenePreviewSetup(state, false);
    const decision = pickHomeSceneState(setup.input);
    assert.equal(decision.state, state, `${state}: функция решила ${decision.state} (${decision.reason})`);
    assert.equal(setup.input.hour, setup.now.getHours(), `${state}: час входа — из часов кадра`);
    assert.equal(decision.offlineLine, state === "offline", `${state}: строка «Нет сети» только у «Нет сети»`);
  }

  // ── Plus: энергии без лимита и заморозка серии — функция решает «Продолжить», остальные герои те же ──
  for (const state of HOME_SCENE_PREVIEW_STATES) {
    const decided = pickHomeSceneState(homeScenePreviewSetup(state, true).input).state;
    const expected = state === "no_energy" || state === "streak_lost" ? "continue" : state;
    assert.equal(decided, expected, `Plus/${state}: ждали ${expected}, решено ${decided}`);
  }

  // ── числа эталона ──
  const eve = homeScenePreviewSetup("streak_risk", false);
  assert.equal(eve.now.getHours(), 21);
  assert.equal(eve.minutesToMidnight, 140, "21:40 → «До полуночи 2 ч 20 мин»");
  assert.equal(eve.streakDays, 5);
  const lost = homeScenePreviewSetup("streak_lost", false);
  assert.equal(lost.daysAway, 2);
  assert.equal(lost.lostStreakDays, 5, "«Было 5 дней»");
  assert.equal(lost.streakDays, 0, "в шапке серия уже сброшена");
  assert.equal(homeScenePreviewSetup("streak_lost", true).lostStreakDays, null, "у Plus «Было N дней» нет");
  assert.equal(homeScenePreviewSetup("welcome_back", false).daysAway, 4, "«Тебя не было 4 дня»");
  assert.equal(homeScenePreviewSetup("no_energy", false).energyMinutes, 42, "«Энергия вернётся через 42 мин»");
  assert.equal(homeScenePreviewSetup("newbie", false).input.hasProgress, false);
  assert.equal(homeScenePreviewSetup("day_done", false).streakToday, "counted");
  assert.equal(homeScenePreviewSetup("continue", false).streakToday, "pending", "засчитанный день — это уже «День засчитан»");

  // ── место продолжения: как у Главной ──
  const titleOf = (lang: Lang, lesson: number, episode: number) => `${lang}:${lesson}:${episode}`;
  const cont = homeScenePreviewPlace("ru", homeScenePreviewSetup("continue", false), titleOf);
  assert.deepEqual({ ...cont }, { badge: "Урок 1", episode: 12, title: "ru:1:12", done: 6, total: 20, theoryLessonId: 1 });
  const all = homeScenePreviewSetup("all_done", false);
  assert.equal(all.lesson, 2);
  const allPlace = homeScenePreviewPlace("en", all, titleOf);
  assert.equal(allPlace.badge, "Lesson 2");
  assert.equal(allPlace.episode, null);
  assert.equal(allPlace.theoryLessonId, null, "всё пройдено — чипов урока нет");
  assert.equal(HOME_SCENE_PREVIEW_EPISODES_PER_LESSON, 24);

  // ── слова шапки: 9 языков, русские формы ──
  assert.equal(homeScenePreviewHeaderWords("ru", 5).days, "5 дней");
  assert.equal(homeScenePreviewHeaderWords("ru", 1).days, "1 день");
  assert.equal(homeScenePreviewHeaderWords("ru", 2).days, "2 дня");
  assert.equal(homeScenePreviewHeaderWords("ru", 11).days, "11 дней");
  assert.equal("pending" in homeScenePreviewHeaderWords("ru", 0), false, "слова «Сегодня ещё нет» больше нет (владелец 22.10)");
  for (const lang of LANGS) {
    const w = homeScenePreviewHeaderWords(lang, 5);
    for (const [key, text] of Object.entries(w)) assert.ok(text.trim().length > 0, `${lang}/${key}: пусто`);
  }

  // ── маршрут: релиз, сеть, полоса Главной, тема только в памяти ──
  const route = read("app/dev_home_scene_preview.tsx");
  assert.match(route, /if \(!ENABLE_DEV_TOOLS \|\| IS_STORE_RELEASE\) return <Redirect href="\/" \/>;/);
  assert.match(route, /import \{ ENABLE_DEV_TOOLS, IS_STORE_RELEASE \} from '\.\/config';/);
  assert.ok(!/fetch\(|httpsCallable|getDoc|firestore|AsyncStorage/i.test(route), "у превью нет сети и хранилища");
  assert.ok(!/NotificationCenterButton|StoryAvatarSlot/.test(route), "колокольчик и аватар — заглушки без входящих и историй");
  assert.match(route, /pickHomeSceneState\(setup\.input\)/, "герой — решение настоящей функции");
  assert.match(route, /statusTint=\{false\}/, "полосу под часами Главной превью не трогает");
  assert.match(route, /setDevThemeChoice\(before\)/, "тема возвращается на выходе");
  assert.match(route, /setDevAppearance\(before\)/, "оформление возвращается на выходе");
  const fixtures = read("components/home/v2/scene/home_scene_preview_fixtures.ts");
  assert.ok(!/fetch\(|httpsCallable|getDoc|firestore|AsyncStorage|from 'react'/i.test(fixtures), "моки — чистые данные");

  // ── Главная: тот же вид, превью не импортирует ──
  const scene = read("components/home/v2/scene/HomeScene.tsx");
  assert.match(scene, /export function HomeSceneView\(/);
  assert.match(scene, /<HomeSceneView[\s\S]*?statusTint\n/, "настоящая Главная красит полосу под часами");
  const home = read("app/(tabs)/home.tsx");
  assert.ok(!/dev_home_scene_preview|home_scene_preview_fixtures/.test(home), "боевая Главная не импортирует превью");
}

if (typeof test === "function") {
  test("home_scene_preview_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
