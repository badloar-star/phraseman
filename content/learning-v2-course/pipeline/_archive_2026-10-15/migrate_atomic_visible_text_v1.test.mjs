import assert from "node:assert/strict";
import test from "node:test";

import { visibleTextRepairsForAtomic } from "./migrate_atomic_visible_text_v1.mjs";

test("replaces a legacy gap scene when Markdown has no separately authored learner scene", () => {
  const task = {
    family: "context_gap_grammar",
    title: "Вставьте слово — Мира спросила, устали ли вы",
    options: [{ text: "am", correct: true }],
  };
  const interaction = {
    prompt: task.title,
    accessibilityLabel: task.title,
    modePayload: { localizedScene: { ru: "Вставьте слово — вы не устали" } },
  };

  const repairs = visibleTextRepairsForAtomic(interaction, task, "ru");

  assert.equal(repairs, 1);
  assert.equal(interaction.modePayload.localizedScene.ru, "Вставьте слово — Мира спросила, устали ли вы");
});

test("keeps an explicitly authored learner scene", () => {
  const task = {
    family: "context_gap_grammar",
    title: "Вставьте слово — am",
    visibleGuidance: "Выберите форму после I в сообщении другу.",
    options: [{ text: "am", correct: true }],
  };
  const interaction = { modePayload: { localizedScene: { ru: task.visibleGuidance } } };

  assert.equal(visibleTextRepairsForAtomic(interaction, task, "ru"), 0);
  assert.equal(interaction.modePayload.localizedScene.ru, task.visibleGuidance);
});

test("restores the taught word in a legacy word-card prompt", () => {
  const task = {
    family: "listen_choose",
    title: "Карточка слова — week",
    card: { word: "week", definition: "«неделя»." },
    options: [],
  };
  const interaction = { prompt: "Карточка слова", accessibilityLabel: "Карточка слова", modePayload: { wordCard: { word: "week" } } };

  assert.equal(visibleTextRepairsForAtomic(interaction, task, "ru"), 2);
  assert.equal(interaction.prompt, "Карточка слова — week");
  assert.equal(interaction.accessibilityLabel, "Карточка слова — week");
});

test("restores the taught word when legacy Markdown denotes the card only by its title", () => {
  const task = {
    family: "listen_choose",
    title: "Карточка слова — awake",
    target: "awake",
    options: [],
  };
  const interaction = { prompt: "Карточка слова", accessibilityLabel: "Карточка слова", modePayload: { wordCard: { word: "awake" } } };

  assert.equal(visibleTextRepairsForAtomic(interaction, task, "ru"), 2);
  assert.equal(interaction.prompt, "Карточка слова — awake");
  assert.equal(interaction.accessibilityLabel, "Карточка слова — awake");
});
