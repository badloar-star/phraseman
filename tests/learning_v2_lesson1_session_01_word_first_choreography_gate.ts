import assert from "node:assert/strict";
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";
import { lesson1SessionChoreographyV1 } from "../modules/learning-v2/content/source/lesson1_session_choreography_v1";

const plan = EPISODE_01_SESSION_MAP_V1[0];
assert.equal(plan?.sessionOrdinal, 1);
assert.equal(
  plan?.kind,
  "words_then_phrases",
  "Session 1 introduces I/am/here/ready and therefore cannot remain a phrases-only session",
);

const choreography = lesson1SessionChoreographyV1(
  1,
  "words_then_phrases",
  4,
  2,
);

assert.equal(choreography.interactionProfile, "rapid");
assert.equal(
  choreography.steps.length,
  20,
  "Three intro checks must precede 12 standalone contacts and five phrase applications",
);

const vocabularyStages = ["recognize", "retrieve_meaning", "build_form"] as const;
const vocabularyFamilies = ["listen_choose", "speed_match", "context_gap_grammar"] as const;
for (let vocabularyIndex = 0; vocabularyIndex < 4; vocabularyIndex += 1) {
  const contacts = choreography.steps.filter(
    (step) =>
      step.targetKind === "vocabulary" &&
      step.sourceVocabularyIndex === vocabularyIndex,
  );
  assert.deepEqual(
    contacts.map((step) => step.learningStage),
    vocabularyStages,
    `Vocabulary item ${vocabularyIndex} must receive all three standalone stages in order`,
  );
  assert.deepEqual(
    contacts.map((step) => step.family),
    vocabularyFamilies,
    `Vocabulary item ${vocabularyIndex} must use three publishable core task families`,
  );
}

const firstPhraseApplicationIndex = choreography.steps.findIndex(
  (step) => step.learningStage === "apply_in_phrase",
);
const lastVocabularyIndex = choreography.steps.reduce(
  (last, step, index) =>
    step.targetKind === "vocabulary" ? index : last,
  -1,
);
assert.ok(firstPhraseApplicationIndex > lastVocabularyIndex);
assert.deepEqual(
  choreography.steps.slice(0, 3).map((step) => step.targetKind),
  ["phrase", "phrase", "phrase"],
  "Slots 1-3 are real intro questions and cannot consume standalone vocabulary contacts",
);
assert.ok(
  choreography.steps.slice(firstPhraseApplicationIndex).every(
    (step) =>
      step.targetKind === "phrase" &&
      step.learningStage === "apply_in_phrase",
  ),
);

const phraseSessionWithNewLexicon = lesson1SessionChoreographyV1(
  2,
  "phrases",
  1,
  3,
);
assert.equal(
  phraseSessionWithNewLexicon.interactionProfile,
  "rapid",
  "Any ordinary session that introduces lexicon needs the rapid word-first budget",
);
assert.deepEqual(
  phraseSessionWithNewLexicon.steps.slice(3, 6).map((step) => [
    step.targetKind,
    step.learningStage,
  ]),
  [
    ["vocabulary", "recognize"],
    ["vocabulary", "retrieve_meaning"],
    ["vocabulary", "build_form"],
  ],
  "A phrases-labelled session cannot hide a new word inside its first phrase",
);
assert.ok(
  phraseSessionWithNewLexicon.steps.slice(6).every(
    (step) => step.targetKind === "phrase",
  ),
);

process.stdout.write("LESSON 1 SESSION 01 WORD-FIRST CHOREOGRAPHY GATE: PASS\n");
