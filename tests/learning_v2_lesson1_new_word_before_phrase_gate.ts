import assert from "node:assert/strict";
import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";
import { lesson1SessionChoreographyV1 } from "../modules/learning-v2/content/source/lesson1_session_choreography_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";
import { LESSON1_AUTHORING_REGISTRY_V1 } from "../modules/learning-v2/content/source/lesson1_authoring_registry_v1";

const normalized = (value: string) => value
  .normalize("NFKC")
  .replace(/[’]/gu, "'")
  .replace(/^[^\p{L}']+|[^\p{L}']+$/gu, "")
  .toLocaleLowerCase("en-US");

const seen = new Set<string>();
const kindViolations: string[] = [];
const contactViolations: string[] = [];
const declarationViolations: string[] = [];

const firstUnlocked = LESSON1_AUTHORING_REGISTRY_V1.find(
  (entry) => entry.status !== "LOCKED",
);
const scopeThrough = firstUnlocked?.sessionOrdinal ?? 56;

for (const [index, source] of AUTHORED_EPISODE_01_SESSIONS.slice(0, scopeThrough).entries()) {
  const plan = EPISODE_01_SESSION_MAP_V1[index]!;
  const novelLexical = new Set<string>();
  const novelForWordSession = new Set<string>();

  for (const phrase of source.phrases) {
    for (const word of phrase.words) {
      const token = normalized(word.correct);
      if (!token || seen.has(token)) continue;
      if (word.category === "lexical") novelLexical.add(token);
      novelForWordSession.add(token);
    }
  }

  if (novelLexical.size > 0 && plan.kind === "phrases") {
    kindViolations.push(
      `S${plan.sessionOrdinal}:phrases-introduces=${[...novelLexical].join(",")}`,
    );
  }

  if (plan.kind === "words_then_phrases" && novelForWordSession.size > 0) {
    const declaredVocabulary = new Set(
      (source.newVocabulary ?? []).map((item) => normalized(item.target)),
    );
    const undeclared = [...novelForWordSession].filter(
      (token) => !declaredVocabulary.has(token),
    );
    if (undeclared.length > 0) {
      declarationViolations.push(
        `S${plan.sessionOrdinal}:new-words-not-declared=${undeclared.join(",")}`,
      );
    }
    const shard = buildSessionShardFromSource(source);
    const choreography = lesson1SessionChoreographyV1(
      plan.sessionOrdinal,
      plan.kind,
      source.newVocabulary?.length ?? 0,
      source.phrases.length,
    );
    const wordContactStages = new Set(["recognize", "retrieve_meaning", "build_form"]);
    const standaloneContacts = new Set(
      choreography.steps.flatMap((step, stepIndex) => {
        if (!wordContactStages.has(step.learningStage)) return [];
        const card = shard.cards[stepIndex];
        if (!card) return [];
        const target = normalized(card.contentItem.target.text);
        return target && !/\s/u.test(card.contentItem.target.text.trim()) ? [target] : [];
      }),
    );
    const missing = [...novelForWordSession].filter(
      (token) => !standaloneContacts.has(token),
    );
    if (missing.length > 0) {
      contactViolations.push(
        `S${plan.sessionOrdinal}:new-words-without-standalone-multitouch=${missing.join(",")}`,
      );
    }

    const learner = buildSessionChildBodiesFromShard(
      shard,
      "ru",
      `lesson-01:session:${String(plan.sessionOrdinal).padStart(2, "0")}`,
    ).learner;
    const learnerIds = new Set(
      learner.interactions.map((interaction) => interaction.interactionId),
    );
    const wordSteps = choreography.steps
      .map((step, stepIndex) => ({ step, card: shard.cards[stepIndex] }))
      .filter(({ step }) => wordContactStages.has(step.learningStage));
    const hiddenContacts = wordSteps.filter(
      ({ card }) => !card || card.taskSlot < 4 || !learnerIds.has(card.cardId),
    );
    const firstPhraseApplication = choreography.steps.findIndex(
      (step) => step.learningStage === "apply_in_phrase",
    );
    const lastWordContact = choreography.steps.reduce(
      (last, step, stepIndex) => wordContactStages.has(step.learningStage) ? stepIndex : last,
      -1,
    );
    if (
      hiddenContacts.length > 0 ||
      firstPhraseApplication < 0 ||
      firstPhraseApplication <= lastWordContact
    ) {
      contactViolations.push(
        `S${plan.sessionOrdinal}:standalone-contacts-hidden-by-intro-or-after-phrase`,
      );
    }
  }

  for (const phrase of source.phrases) {
    for (const word of phrase.words) {
      const token = normalized(word.correct);
      if (token) seen.add(token);
    }
  }
}

const violations = [
  ...kindViolations.map((entry) => `kind:${entry}`),
  ...declarationViolations.map((entry) => `declaration:${entry}`),
  ...contactViolations.map((entry) => `contacts:${entry}`),
];
assert.deepEqual(
  violations,
  [],
  `New words must receive standalone multi-touch before phrase use:\n${violations.join("\n")}`,
);

console.log("Learning V2 new-word-before-phrase gate: PASS");
