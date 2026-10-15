import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const course = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const marker = "ОДНО ВЗАИМОДЕЙСТВИЕ — ОДНА ФРАЗА ЦЕЛЕВОГО ЯЗЫКА";
const delimiterRule = "В assessed target/audio/voice строке, любом видимом responseOption и selectable localized meaning один вариант может содержать ровно одно слово, одну фразу или одно значение";
const judgePrompts = fs.readdirSync(path.join(course, "pipeline/prompts"))
  .filter((name) => /^judge_.*\.md$/u.test(name))
  .map((name) => `pipeline/prompts/${name}`);
const required = [
  "КОНСТИТУЦИЯ.md",
  "pipeline/КОНСТИТУЦИЯ_ДЛЯ_СУДЕЙ.md",
  "pipeline/prompts/author.md",
  ...judgePrompts,
  "pipeline/prompts/localize.md",
  "pipeline/prompts/localize_batch.md",
];

test("owner single-phrase rule is present in every author, locale and judge authority", () => {
  for (const relative of required) {
    const text = fs.readFileSync(path.join(course, relative), "utf8");
    assert.ok(text.includes(marker), `${relative} must contain the current owner rule`);
    assert.doesNotMatch(text, /ОДНА АНГЛИЙСКАЯ ФРАЗА/u, `${relative} is shared across target languages`);
    assert.match(text, /audio|аудио|озвуч/iu, `${relative} must apply the rule to audio`);
    assert.match(text, /ровно один `___`/u, `${relative} must require one visible gap`);
    assert.match(text, /без точек с запятой/iu, `${relative} must forbid composite gap packets`);
    assert.ok(text.includes(delimiterRule), `${relative} must forbid every packet delimiter in assessed strings`);
    assert.match(text, /один вариант может содержать ровно одно слово, одну фразу или одно значение/u, `${relative} must forbid bundled selectable answers`);
    assert.match(text, /переносы строк, маркеры списка, повторные пары/u, `${relative} must forbid delimiter-free visible packets`);
    assert.match(text, /Markdown и atomic source обязаны совпадать/u, `${relative} must bind reviewed Markdown to runtime source`);
    assert.match(text, /любому целевому языку/u, `${relative} must apply across target languages`);
    assert.match(text, /non-selectable word-card/u, `${relative} must scope explanations to a non-selectable card`);
    assert.match(text, /correctText/u, `${relative} must require a concrete answer contract`);
    assert.match(text, /диктант[^\n]*(?:совпад|точн)/iu, `${relative} must bind dictation target to audio transcript`);
  }
  const judgments = fs.readdirSync(path.join(course, "judgements/owner"));
  assert.ok(judgments.includes("2026-10-03_single_phrase_per_interaction.md"));
});

test("owner judgment and handover state the absolute assessed delimiter boundary", () => {
  const owner = fs.readFileSync(
    path.join(course, "judgements/owner/2026-10-03_single_phrase_per_interaction.md"),
    "utf8",
  );
  assert.match(owner, /В target\/audio\/voice, во всех видимых `responseOptions` и в selectable[\s\S]*localized meaning любой разделитель `;`, `；` или `\|` даёт BLOCK/u);
  assert.match(owner, /информационной карточки слова, которая не является вариантом ответа/u);
  assert.match(owner, /каждый английский мастер[^\n]*обязан/iu);
  assert.doesNotMatch(owner, /Начиная с английской L3\/S51/u);
  assert.doesNotMatch(owner, /Уже выпущенные сессии разрешено исправить[^\n]*release-проекц/iu);

  const handover = fs.readFileSync(path.resolve(course, "../..", "docs/v2/HANDOVER.md"), "utf8");
  assert.match(handover, /Every `;`, `；`, or `\|` delimiter in an assessed target\/audio\/voice string,[\s\S]*learner-visible `responseOption`, or selectable localized meaning is a[\s\S]*violation regardless of grammar recognition/u);
  assert.match(handover, /non-selectable word card/u);
});
