import assert from "node:assert/strict";
import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { EPISODE_01_SESSION_18_EDITORIAL_INTRO_V1 } from "../modules/learning-v2/content/source/episode_01_session_18_editorial_intro_v1";
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";
import { lesson1SessionChoreographyV1 } from "../modules/learning-v2/content/source/lesson1_session_choreography_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";

const LOCALES = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const source = AUTHORED_EPISODE_01_SESSIONS[17];
const plan = EPISODE_01_SESSION_MAP_V1[17];

assert.equal(source?.requiredSessionOrdinal, 18);
assert.equal(plan?.kind, "phrases");
assert.deepEqual(plan?.teaches, []);
assert.deepEqual(plan?.builtOn, [17]);
assert.deepEqual(plan?.recalls, [2, 10, 17]);

const EXPECTED_PHRASES = [
  "He is not ready.", "She is not ready.", "He is not tired.", "She is not tired.",
  "He is not here.", "She is not here.", "He is not calm.", "She is not calm.",
  "He is not happy.", "She is not happy.", "He is not busy.", "She is not busy.",
  "He is not cold.", "She is not warm.", "She is not okay.",
] as const;
assert.deepEqual(source.phrases.map((phrase) => phrase.english), EXPECTED_PHRASES);

assert.equal(EPISODE_01_SESSION_18_EDITORIAL_INTRO_V1.length, 3);
assert.deepEqual(source.introPages.map((page) => page.kind), ["concept", "formula", "trap"]);
for (const page of source.introPages) {
  for (const locale of LOCALES) {
    const body = page.body[locale];
    assert.ok(body.length >= 300, `${page.kind}.${locale} intro is too thin`);
    assert.ok((body.match(/[.!?](?:\s|$)/gu) ?? []).length >= 4);
    assert.doesNotMatch(body, /\bсесси\w*|\bзанятт\w*|\bsesión\b|\bsessão\b|\bsesi\b|\boturum\b|\bsesj\w*|\bурок\w*|\bкурс\w*/iu);
    const correct = page.question.choices[page.question.correctChoiceIndex][locale];
    assert.ok(body.includes(correct), `${page.kind}.${locale} must ground the correct choice`);
  }
}

for (const locale of LOCALES) {
  const explanations = source.phrases.map((phrase) => phrase.localizedDetails?.[locale]?.explanation ?? "");
  assert.ok(explanations.every((text) => text.length >= 100), `thin phrase copy for ${locale}`);
  assert.equal(new Set(explanations).size, 15, `phrase copy repeats for ${locale}`);
}

const choreography = lesson1SessionChoreographyV1(18);
assert.equal(choreography.interactionProfile, "standard");
assert.equal(choreography.zone, "understand");
assert.equal(choreography.support, "full_text");
assert.equal(choreography.promptNovelty, "trained");

const shard = buildSessionShardFromSource(source);
const children = buildSessionChildBodiesFromShard(shard, "ru", "lesson-01:session:18");
const practiceCards = shard.cards.filter((card) => card.taskSlot >= 4);
const interactions = children.learner.interactions;
assert.equal(interactions.length, 12);
assert.deepEqual(interactions.map((entry) => entry.family), [
  "listen_choose", "phrase_builder", "context_gap_grammar", "listen_choose",
  "phrase_builder", "context_gap_grammar", "speed_match", "phrase_builder",
  "listen_build_dictation", "context_gap_grammar", "listen_build_dictation", "phrase_builder",
]);

const task = (target: string, family: string) => {
  const index = practiceCards.findIndex((card) => card.contentItem.target.text === target && card.family === family);
  assert.notEqual(index, -1, `missing ${family} task for ${target}`);
  return interactions[index]!;
};
const options = (target: string, family: string) => task(target, family).responseOptions.map((option) => option.text);

assert.deepEqual(options("She is not tired.", "listen_choose"), ["Она не устала.", "Её здесь нет.", "Она не спокойна."]);
assert.deepEqual(options("He is not calm.", "listen_choose"), ["Он не спокоен.", "Он не счастлив.", "Он не занят."]);
assert.deepEqual(options("She is not happy.", "speed_match"), ["She is not happy.", "He is not happy.", "She is happy."]);
for (const [target, pronoun] of [
  ["He is not here.", "She"], ["She is not calm.", "He"],
  ["He is not busy.", "She"], ["She is not busy.", "He"],
  ["She is not warm.", "He"], ["She is not okay.", "He"],
] as const) {
  assert.deepEqual(options(target, target.startsWith("She") && (target.includes("busy") || target.includes("warm")) ? "listen_build_dictation" : "phrase_builder"),
    [...target.replace(/[.]/gu, "").split(" "), pronoun, "are"]);
}
for (const target of ["She is not here.", "He is not happy.", "He is not cold."] as const) {
  assert.deepEqual(options(target, "context_gap_grammar"), ["is", "are", "am"]);
}

const feedback = children.auxiliary.entries.flatMap((entry) => Object.values(entry.responseFeedbackById ?? {}));
assert.equal(feedback.length, 24, "every visible trap needs exact feedback");
for (const locale of LOCALES) {
  const texts = feedback.map((localized) => localized[locale]);
  assert.ok(texts.every((text) => text.length >= 70), `thin feedback for ${locale}`);
  assert.equal(new Set(texts).size, 24, `each target/trap pair needs unique feedback for ${locale}`);
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
    assert.ok(runs.some((run) => run.semantic === "targetCorrect"));
    if (page.kind === "trap") assert.ok(runs.some((run) => run.semantic === "targetWrong"));
  }
}

console.log("Learning V2 session 18 editorial gate: PASS");
