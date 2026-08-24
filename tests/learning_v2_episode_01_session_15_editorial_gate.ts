import assert from "node:assert/strict";
import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { EDITORIAL_INTRO_BODIES_11_TO_15_V3 } from "../modules/learning-v2/content/source/episode_01_editorial_intro_bodies_11_15_v3";
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";

const LOCALES = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const source = AUTHORED_EPISODE_01_SESSIONS[14];
const plan = EPISODE_01_SESSION_MAP_V1[14];

assert.equal(source?.requiredSessionOrdinal, 15);
assert.equal(plan?.kind, "voice");
assert.deepEqual(plan?.teaches, [], "voice session 15 must introduce no new construct");
assert.deepEqual(plan?.builtOn, [11, 12, 13, 14]);
assert.deepEqual(plan?.recalls, [9, 11, 12, 13, 14]);

const EXPECTED_PHRASES = [
  "Are you ready?",
  "You’re ready.",
  "You’re in class.",
  "Am I ready?",
  "I am ready.",
  "Are you okay?",
  "I am okay.",
  "Am I okay?",
  "You’re okay.",
  "Are you at home?",
  "I am at home.",
  "Am I at home?",
  "You’re at home.",
  "Are you in class?",
  "I am in class.",
] as const;
assert.deepEqual(source.phrases.map((phrase) => phrase.english), EXPECTED_PHRASES);

assert.equal(
  EDITORIAL_INTRO_BODIES_11_TO_15_V3[15]?.length,
  3,
  "session 15 needs three explicit hand-authored intro bodies",
);
assert.deepEqual(source.introPages.map((page) => page.kind), ["concept", "formula", "trap"]);
for (const page of source.introPages) {
  for (const locale of LOCALES) {
    const body = page.body[locale];
    assert.ok(body.length >= 300, `${page.kind}.${locale} intro is too thin`);
    assert.ok(
      (body.match(/[.!?](?:\s|$)/gu) ?? []).length >= 4,
      `${page.kind}.${locale} must read as causal editorial prose`,
    );
    assert.doesNotMatch(
      body,
      /\bсесси\w*|\bзанятт\w*|\bsesión\b|\bsessão\b|\bsesi\b|\boturum\b|\bsesj\w*|\bурок\w*|\bкурс\w*/iu,
      `${page.kind}.${locale} must not mention course machinery`,
    );
    const correctChoice = page.question.choices[page.question.correctChoiceIndex][locale];
    assert.ok(
      body.includes(correctChoice),
      `${page.kind}.${locale} must explain its exact correct choice before asking`,
    );
  }
}

for (const locale of LOCALES) {
  const explanations = source.phrases.map(
    (phrase) => phrase.localizedDetails?.[locale]?.explanation ?? "",
  );
  assert.equal(new Set(explanations).size, 15, `phrase copy repeats for ${locale}`);
  assert.ok(explanations.every((text) => text.length >= 80), `thin phrase copy for ${locale}`);
}

const shard = buildSessionShardFromSource(source);
const children = buildSessionChildBodiesFromShard(
  shard,
  "ru",
  "lesson-01:session:15",
);
const practiceCards = shard.cards.filter((card) => card.taskSlot >= 4);
const interactions = children.learner.interactions;
assert.equal(children.learner.interactionProfile, "voice_heavy");
assert.equal(interactions.length, 9, "voice session needs nine practice contacts after three intro pages");
assert.deepEqual(
  interactions.map((entry) => entry.family),
  [
    "listen_choose",
    "sound_contrast",
    "scripted_repeat_compare",
    "scripted_repeat_compare",
    "listen_build_dictation",
    "scripted_repeat_compare",
    "sound_contrast",
    "scripted_repeat_compare",
    "listen_choose",
  ],
);
assert.deepEqual(
  practiceCards.map((card) => card.contentItem.target.text),
  EXPECTED_PHRASES.slice(3, 12),
);

const task = (target: string, family: string) => {
  const index = practiceCards.findIndex(
    (card) => card.family === family && card.contentItem.target.text === target,
  );
  assert.notEqual(index, -1, `missing ${family} for ${target}`);
  return interactions[index]!;
};

assert.deepEqual(
  task("Am I ready?", "listen_choose").responseOptions.map((option) => option.text),
  ["Я готов?", "Я готов.", "Ты готов?"],
);
assert.deepEqual(
  task("I am ready.", "sound_contrast").responseOptions.map((option) => option.text),
  ["I am ready.", "Am I ready?", "You’re ready."],
);
const amIOkayTiles = task("Am I okay?", "listen_build_dictation").responseOptions.map(
  (option) => option.text,
);
assert.deepEqual(amIOkayTiles.slice(0, 3), ["Am", "I", "okay"]);
assert.deepEqual([...amIOkayTiles.slice(3)].sort(), ["Are", "Is"]);
assert.deepEqual(
  task("Are you at home?", "sound_contrast").responseOptions.map((option) => option.text),
  ["Are you at home?", "Am I at home?", "Are you okay?"],
);
assert.deepEqual(
  task("Am I at home?", "listen_choose").responseOptions.map((option) => option.text),
  ["Я дома?", "Я дома.", "Ты дома?"],
);

const feedback = children.auxiliary.entries.flatMap((entry) =>
  Object.values(entry.responseFeedbackById ?? {}),
);
assert.equal(feedback.length, 10, "every visible wrong choice needs one exact explanation");
for (const locale of LOCALES) {
  const texts = feedback.map((localized) => localized[locale]);
  assert.ok(texts.every((text) => text.length >= 80), `thin trap feedback for ${locale}`);
  assert.equal(new Set(texts).size, 10, `task feedback repeats for ${locale}`);
  assert.ok(texts.every((text) => !/тема близкая|похожая тема|просто невер|не подходит$/iu.test(text)));
}

for (const card of practiceCards) {
  for (const locale of LOCALES) {
    const success = card.successMessageByLocale[locale];
    const target = card.contentItem.target.text;
    assert.equal(
      success.split(target).length - 1,
      1,
      `${card.cardId}.${locale} must show the correct target exactly once`,
    );
  }
}

for (const page of shard.intro.pages) {
  for (const locale of LOCALES) {
    const runs = page.bodyRunsByLocale?.[locale] ?? [];
    assert.equal(runs.map((run) => run.text).join(""), page.bodyByLocale[locale]);
    const targetText = runs
      .filter((run) => run.semantic === "targetCorrect" || run.semantic === "targetWrong")
      .map((run) => run.text)
      .join(" ");
    assert.ok(targetText.length > 0, `${page.kind}.${locale} needs explicit target-language styling`);
  }
}

console.log("Learning V2 session 15 editorial gate: PASS");
