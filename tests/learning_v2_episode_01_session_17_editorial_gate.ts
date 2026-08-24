import assert from "node:assert/strict";
import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { EPISODE_01_SESSION_17_EDITORIAL_INTRO_V1 } from "../modules/learning-v2/content/source/episode_01_session_17_editorial_intro_v1";
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";
import { lesson1SessionChoreographyV1 } from "../modules/learning-v2/content/source/lesson1_session_choreography_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";

const LOCALES = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const source = AUTHORED_EPISODE_01_SESSIONS[16];
const plan = EPISODE_01_SESSION_MAP_V1[16];

assert.equal(source?.requiredSessionOrdinal, 17);
assert.equal(plan?.kind, "words_then_phrases");
assert.deepEqual(plan?.teaches, ["third_person_pronoun", "third_person_singular"]);
assert.deepEqual(plan?.builtOn, [9]);
assert.deepEqual(plan?.recalls, [3]);

const EXPECTED_PHRASES = [
  "He is ready.", "She is ready.", "He is tired.", "She is tired.",
  "He is here.", "She is here.", "He is calm.", "She is calm.",
  "He is happy.", "She is happy.", "He is busy.", "She is busy.",
  "He is cold.", "She is warm.", "She is okay.",
] as const;
assert.deepEqual(source.phrases.map((phrase) => phrase.english), EXPECTED_PHRASES);

assert.equal(EPISODE_01_SESSION_17_EDITORIAL_INTRO_V1.length, 3);
assert.deepEqual(source.introPages.map((page) => page.kind), ["concept", "formula", "trap"]);
for (const page of source.introPages) {
  for (const locale of LOCALES) {
    const body = page.body[locale];
    assert.ok(body.length >= 300, `${page.kind}.${locale} intro is too thin`);
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
  assert.ok(explanations.every((text) => text.length >= 100), `thin phrase copy for ${locale}`);
  assert.equal(new Set(explanations).size, 15, `phrase copy repeats for ${locale}`);
}

const choreography = lesson1SessionChoreographyV1(17);
assert.equal(choreography.interactionProfile, "rapid");
assert.equal(choreography.zone, "understand");
assert.equal(choreography.support, "model");
assert.equal(choreography.promptNovelty, "trained");
assert.deepEqual(
  choreography.steps.slice(3).map((step) => step.learningStage),
  [
    ...Array(4).fill("recognize"),
    ...Array(4).fill("retrieve_meaning"),
    ...Array(4).fill("build_form"),
    ...Array(4).fill("apply_in_phrase"),
    "independent_assessment",
  ],
);

const shard = buildSessionShardFromSource(source);
const children = buildSessionChildBodiesFromShard(shard, "ru", "lesson-01:session:17");
const practiceCards = shard.cards.filter((card) => card.taskSlot >= 4);
const interactions = children.learner.interactions;
assert.equal(interactions.length, 17);
assert.deepEqual(
  interactions.map((entry) => entry.family),
  [
    ...Array(4).fill("listen_choose"),
    ...Array(4).fill("speed_match"),
    ...Array(4).fill("phrase_builder"),
    ...Array(4).fill("context_gap_grammar"),
    "phrase_builder",
  ],
);
assert.deepEqual(
  practiceCards.map((card) => card.contentItem.target.text),
  [...EXPECTED_PHRASES.slice(0, 4), ...EXPECTED_PHRASES.slice(0, 4), ...EXPECTED_PHRASES.slice(0, 4), ...EXPECTED_PHRASES.slice(0, 4), EXPECTED_PHRASES[4]],
);

const task = (target: string, family: string) => {
  const index = practiceCards.findIndex(
    (card) => card.contentItem.target.text === target && card.family === family,
  );
  assert.notEqual(index, -1, `missing ${family} task for ${target}`);
  return interactions[index]!;
};
const options = (target: string, family: string) =>
  task(target, family).responseOptions.map((option) => option.text);

assert.deepEqual(options("He is ready.", "listen_choose"), ["Он готов.", "Она готова.", "Он устал."]);
assert.deepEqual(options("She is ready.", "listen_choose"), ["Она готова.", "Он готов.", "Она устала."]);
assert.deepEqual(options("He is tired.", "listen_choose"), ["Он устал.", "Она устала.", "Он готов."]);
assert.deepEqual(options("She is tired.", "listen_choose"), ["Она устала.", "Он устал.", "Она готова."]);
for (const [target, gender, state] of [
  ["He is ready.", "She is ready.", "He is tired."],
  ["She is ready.", "He is ready.", "She is tired."],
  ["He is tired.", "She is tired.", "He is ready."],
  ["She is tired.", "He is tired.", "She is ready."],
] as const) assert.deepEqual(options(target, "speed_match"), [target, gender, state]);
for (const [target, pronoun] of [
  ["He is ready.", "She"], ["She is ready.", "He"],
  ["He is tired.", "She"], ["She is tired.", "He"],
] as const) {
  assert.deepEqual(options(target, "phrase_builder"), target.startsWith("He")
    ? ["He", "is", target.includes("ready") ? "ready" : "tired", pronoun, "are"]
    : ["She", "is", target.includes("ready") ? "ready" : "tired", pronoun, "are"]);
  assert.deepEqual(options(target, "context_gap_grammar"), ["is", "are", "am"]);
}
assert.deepEqual(options("He is here.", "phrase_builder"), ["He", "is", "here", "She", "are"]);

const feedback = children.auxiliary.entries.flatMap((entry) =>
  Object.values(entry.responseFeedbackById ?? {}),
);
assert.equal(feedback.length, 34, "every visible trap needs exact feedback");
for (const locale of LOCALES) {
  const texts = feedback.map((localized) => localized[locale]);
  assert.ok(texts.every((text) => text.length >= 70), `thin feedback for ${locale}`);
  assert.equal(
    new Set(texts).size,
    22,
    `only an identical target/trap pair may reuse feedback for ${locale}`,
  );
  assert.ok(texts.every((text) => !/тема близкая|похожая тема|просто невер|не подходит$|это меняет точный смысл/iu.test(text)));
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
    assert.ok(runs.some((run) => run.semantic === "targetCorrect" || run.semantic === "targetWrong"));
  }
}

console.log("Learning V2 session 17 editorial gate: PASS");
