// зачем: владелец 17.10 — «ВСЕ 4 СЛОВА НЕ ДОЛЖНЫ ИДТИ СРАЗУ ПОДРЯД… каждое слово появляется прямо перед тем,
// как оно будет в задании использовано» (КОНСТИТУЦИЯ.md). Сторож положительной проверки места карточки слова
// (content/learning-v2-course/pipeline/single_phrase_release.mjs → wordCardPlacementIssues), которую
// build_release.mjs применяет к урокам 1–4. Старая раскладка «4 карточки подряд» обязана быть красной.
import assert from "node:assert/strict";
import test from "node:test";

import {
  wordCardPlacementApplies,
  wordCardPlacementIssues,
} from "../content/learning-v2-course/pipeline/single_phrase_release.mjs";

const card = (word) => ({
  interactionId: `en:lesson-03:session-25:word:${word}`,
  family: "listen_choose",
  modePayload: { isWordCard: true, wordCard: { word } },
});
const task = (id, phrase, family = "phrase_builder") => ({
  interactionId: `en:lesson-03:session-25:${id}`,
  family,
  modePayload: { targetText: phrase },
});
const grid = (id, words) => ({
  interactionId: `en:lesson-03:session-25:${id}`,
  family: "speed_match",
  modePayload: { pairGrid: words.map((target) => ({ target })) },
});

const WORDS = ["charger", "cable", "adapter", "socket"];

test("четыре карточки подряд — красная раскладка", () => {
  const interactions = [
    task("i01", "This is a lamp."),
    ...WORDS.map(card),
    grid("i02", WORDS),
    ...WORDS.map((word, index) => task(`i0${index + 3}`, `This is a ${word}.`)),
  ];
  const reasons = wordCardPlacementIssues(interactions).map((issue) => issue.reason);
  assert.ok(reasons.includes("word_card_adjacent"), `ожидали word_card_adjacent, получили ${reasons.join(",")}`);
  assert.ok(reasons.includes("word_card_not_before_use"));
});

test("каждая карточка прямо перед первым заданием со своим словом — зелёная раскладка", () => {
  const interactions = [task("i01", "This is a lamp."), grid("i02", WORDS)];
  WORDS.forEach((word, index) => {
    interactions.push(card(word), task(`i1${index}`, `This is a ${word}.`), task(`i2${index}`, "That is a box.", "listen_choose"));
  });
  assert.deepEqual(wordCardPlacementIssues(interactions), []);
});

test("слово встретилось в задании раньше своей карточки — красная раскладка", () => {
  const interactions = [
    task("i01", "Is it a cable?"),
    card("cable"),
    task("i02", "This is a cable."),
  ];
  assert.deepEqual(wordCardPlacementIssues(interactions).map((issue) => issue.reason), ["word_card_after_first_use"]);
});

test("общая таблица значений не считается первым использованием", () => {
  const interactions = [grid("i01", ["cable"]), card("cable"), task("i02", "This is a cable.")];
  assert.deepEqual(wordCardPlacementIssues(interactions), []);
});

test("два слова впервые в одном задании: вторая карточка перед следующим заданием со своим словом", () => {
  const interactions = [
    card("cable"),
    task("i01", "The cable and the socket are here."),
    task("i02", "That is a lamp."),
    card("socket"),
    task("i03", "This is a socket."),
  ];
  assert.deepEqual(wordCardPlacementIssues(interactions), []);
});

test("проверка действует на уроках 1–4 и только на них", () => {
  assert.equal(wordCardPlacementApplies("en/l01/s01"), true);
  assert.equal(wordCardPlacementApplies("en/l04/s56"), true);
  assert.equal(wordCardPlacementApplies("en:lesson-03:session-25"), true);
  assert.equal(wordCardPlacementApplies("en/l05/s01"), false);
});
