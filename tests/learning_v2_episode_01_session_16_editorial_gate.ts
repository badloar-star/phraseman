import assert from "node:assert/strict";
import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { EPISODE_01_SESSION_16_EDITORIAL_INTRO_V1 } from "../modules/learning-v2/content/source/episode_01_session_16_editorial_intro_v1";
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";
import { lesson1SessionChoreographyV1 } from "../modules/learning-v2/content/source/lesson1_session_choreography_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";

const LOCALES = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const source = AUTHORED_EPISODE_01_SESSIONS[15];
const plan = EPISODE_01_SESSION_MAP_V1[15];

assert.equal(source?.requiredSessionOrdinal, 16);
assert.equal(plan?.kind, "checkpoint");
assert.deepEqual(plan?.teaches, [], "checkpoint must introduce nothing");
assert.deepEqual(plan?.builtOn, [9, 10, 11, 12, 13, 14, 15]);
assert.deepEqual(plan?.recalls, [1, 9, 11, 13, 14]);

const EXPECTED_PHRASES = [
  "I am here.",
  "You are here.",
  "Are you here?",
  "Am I here?",
  "You’re here.",
  "I am not ready.",
  "You are not ready.",
  "Are you ready?",
  "Am I ready?",
  "You’re not ready.",
  "I am cold.",
  "I am warm.",
  "Are you on the bus?",
  "Am I okay?",
  "You’re all right.",
] as const;
assert.deepEqual(source.phrases.map((phrase) => phrase.english), EXPECTED_PHRASES);

assert.equal(EPISODE_01_SESSION_16_EDITORIAL_INTRO_V1.length, 3);
assert.deepEqual(source.introPages.map((page) => page.kind), ["concept", "formula", "trap"]);
for (const page of source.introPages) {
  for (const locale of LOCALES) {
    const body = page.body[locale];
    assert.ok(body.length >= 280, `${page.kind}.${locale} intro is too thin`);
    assert.ok((body.match(/[.!?](?:\s|$)/gu) ?? []).length >= 4);
    assert.doesNotMatch(
      body,
      /\bсесси\w*|\bзанятт\w*|\bsesión\b|\bsessão\b|\bsesi\b|\boturum\b|\bsesj\w*|\bурок\w*|\bкурс\w*/iu,
    );
    const correct = page.question.choices[page.question.correctChoiceIndex][locale];
    assert.ok(body.includes(correct), `${page.kind}.${locale} must ground the correct choice`);
  }
}

for (const locale of LOCALES) {
  const explanations = source.phrases.map(
    (phrase) => phrase.localizedDetails?.[locale]?.explanation ?? "",
  );
  assert.ok(explanations.every((text) => text.length >= 75), `thin phrase copy for ${locale}`);
  assert.equal(new Set(explanations).size, 15, `phrase copy repeats for ${locale}`);
}

const choreography = lesson1SessionChoreographyV1(16);
assert.equal(choreography.interactionProfile, "standard");
assert.equal(choreography.zone, "master");
assert.equal(choreography.support, "none");
assert.equal(choreography.promptNovelty, "novel");
assert.ok(
  choreography.steps.slice(3).every((step) => step.learningStage === "independent_assessment"),
  "every checkpoint task must be an independent assessment",
);

const shard = buildSessionShardFromSource(source);
const children = buildSessionChildBodiesFromShard(shard, "ru", "lesson-01:session:16");
const practiceCards = shard.cards.filter((card) => card.taskSlot >= 4);
const interactions = children.learner.interactions;
assert.equal(interactions.length, 12);
assert.deepEqual(
  interactions.map((entry) => entry.family),
  [
    "speed_match",
    "listen_build_dictation",
    "context_gap_grammar",
    "phrase_builder",
    "listen_build_dictation",
    "context_gap_grammar",
    "phrase_builder",
    "speed_match",
    "listen_build_dictation",
    "context_gap_grammar",
    "phrase_builder",
    "speed_match",
  ],
);
assert.deepEqual(
  practiceCards.map((card) => card.contentItem.target.text),
  EXPECTED_PHRASES.slice(3),
);

const task = (target: string) => {
  const index = practiceCards.findIndex((card) => card.contentItem.target.text === target);
  assert.notEqual(index, -1, `missing task for ${target}`);
  return interactions[index]!;
};
const optionTexts = (target: string) => task(target).responseOptions.map((option) => option.text);
assert.deepEqual(optionTexts("Am I here?"), ["Am I here?", "Are you here?", "I am here."]);
assert.deepEqual(optionTexts("You’re here."), ["You’re", "here", "Your", "You"]);
assert.deepEqual(optionTexts("I am not ready."), ["not", "very", "too"]);
assert.deepEqual(optionTexts("You are not ready."), ["You", "are", "not", "ready", "am", "is"]);
assert.deepEqual(optionTexts("Are you ready?"), ["Are", "you", "ready", "Is", "Do"]);
assert.deepEqual(optionTexts("Am I ready?"), ["Am", "Are", "Do"]);
assert.deepEqual(optionTexts("You’re not ready."), ["You’re", "not", "ready", "Your", "You"]);
assert.deepEqual(optionTexts("I am cold."), ["I am cold.", "I am calm.", "I am warm."]);
assert.deepEqual(optionTexts("I am warm."), ["I", "am", "warm", "are", "cold"]);
assert.deepEqual(optionTexts("Are you on the bus?"), ["on", "in", "at"]);
assert.deepEqual(optionTexts("Am I okay?"), ["Am", "I", "okay", "Are", "Is"]);
assert.deepEqual(optionTexts("You’re all right."), ["You’re all right.", "Are you all right?", "You’re not all right."]);

const feedback = children.auxiliary.entries.flatMap((entry) =>
  Object.values(entry.responseFeedbackById ?? {}),
);
assert.equal(feedback.length, 24, "every visible checkpoint trap needs exact feedback");
for (const locale of LOCALES) {
  const texts = feedback.map((localized) => localized[locale]);
  assert.ok(texts.every((text) => text.length >= 70), `thin feedback for ${locale}`);
  assert.equal(new Set(texts).size, 24, `checkpoint feedback repeats for ${locale}`);
  assert.ok(
    texts.every(
      (text) =>
        !/тема близкая|похожая тема|просто невер|не подходит$|это меняет точный смысл/iu.test(text),
    ),
  );
}

for (const card of practiceCards) {
  for (const locale of LOCALES) {
    const success = card.successMessageByLocale[locale];
    const target = card.contentItem.target.text;
    assert.equal(success.split(target).length - 1, 1);
  }
}

for (const page of shard.intro.pages) {
  for (const locale of LOCALES) {
    const runs = page.bodyRunsByLocale?.[locale] ?? [];
    assert.equal(runs.map((run) => run.text).join(""), page.bodyByLocale[locale]);
    assert.ok(
      runs.some((run) => run.semantic === "targetCorrect" || run.semantic === "targetWrong"),
      `${page.kind}.${locale} needs explicit target styling`,
    );
  }
}

console.log("Learning V2 session 16 editorial gate: PASS");
