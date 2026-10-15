import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  buildInteraction,
  firstMarkdownAtomicLearnerMismatch,
  parseIntro,
  parsePractice,
  projectScriptedRepeatRevealPolicies,
} from "./build_release.mjs";
import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2 } from "../../../modules/learning-v2/curriculum/en/exact_session_packets_en_v2.ts";
import { LEARNING_V2_ENGLISH_OWNER_APPROVED_BLUEPRINT_FINGERPRINT_V2 } from "../../../modules/learning-v2/curriculum/en/course_blueprint_en_v2.ts";
import { LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2 } from "../../../modules/learning-v2/curriculum/en/lexical_progression_en_v2.ts";

const sessionDir = process.env.LEARNING_V2_FROZEN_SESSION_DIR
  ? path.resolve(process.env.LEARNING_V2_FROZEN_SESSION_DIR)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s02");
const source = (name) => fs.readFileSync(path.join(sessionDir, name), "utf8");
const atomic = () => JSON.parse(source("practice.atomic.json"));
const packet = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2.find(
  (entry) => entry.sessionId === "lesson-01:session:02",
);
const prohibitedForm = /\b(?:you|we|they|he|she|it)\s+(?:am|is|are)\b|\b(?:is|are)\s+(?:happy|sad|tired|here|ready|fine)\b|\b(?:don't|doesn't|isn't|aren't|am not)\b/iu;

test("L01/S02 source conforms to the exact d956 S02 packet", () => {
  assert.equal(LEARNING_V2_ENGLISH_OWNER_APPROVED_BLUEPRINT_FINGERPRINT_V2, "d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da");
  assert.ok(packet, "approved lesson-01:session:02 packet is present");
  assert.deepEqual(packet.grammarOperationIds, []);
  assert.deepEqual(packet.reviewOperationIds, ["en.grammar.present_be_affirmative.i_am"]);
  assert.deepEqual(packet.newLexicalSenseIds, ["en.sad.adjective.01", "en.tired.adjective.01"]);
  assert.deepEqual(packet.retrievalLexicalSenseIds, [
    "en.here.adverb.01", "en.ready.adjective.01", "en.fine.adjective.01", "en.happy.adjective.01",
  ]);
  assert.deepEqual(packet.activityPlan.map(({ slot, modeFamily, canonicalExample, support, independentEvidence, scored }) =>
    [slot, modeFamily, canonicalExample, support, independentEvidence, scored]), [
    [4, "phrase_builder", "I am happy.", "maximum", false, false],
    [5, "listen_choose", "I am sad.", "high", false, false],
    [6, "context_gap_grammar", "I am tired.", "high", false, false],
    [7, "speed_match", "I am here.", "medium", false, true],
    [8, "listen_build_dictation", "I am happy.", "medium", false, true],
    [9, "phrase_builder", "I am sad.", "medium", false, true],
    [10, "scripted_repeat_compare", "I am tired.", "medium", false, true],
    [11, "context_gap_grammar", "I am here.", "low", false, true],
    [12, "listen_choose", "I am happy.", "low", false, true],
    [13, "speed_match", "I am sad.", "low", false, true],
    [14, "listen_build_dictation", "I am tired.", "low", false, true],
    [15, "phrase_builder", "I am here.", "minimal", false, true],
    [16, "scripted_repeat_compare", "I am happy.", "minimal", false, true],
    [17, "context_gap_grammar", "I am sad.", "minimal", false, true],
    [18, "listen_choose", "I am tired.", "minimal", false, true],
    [19, "speed_match", "I am here.", "none", true, true],
    [20, "scripted_repeat_compare", "I am happy.", "none", true, true],
  ]);

  const intros = [source("final.ru.md"), source("final.uk.md")].map(parseIntro);
  for (const pages of intros) {
    assert.equal(pages.length, 3, "three packet intro slots are authored");
    for (const page of pages) {
      assert.equal(page.options.filter(({ correct }) => correct).length, 1, "each intro has one answer");
      assert.ok(page.options.filter(({ correct }) => correct).every(({ feedback }) => !feedback), "correct intro feedback stays runtime-owned");
    }
  }
  assert.deepEqual(packet.introPlan.map(({ slot, purpose }) => [slot, purpose]), [
    [1, "concept"], [2, "formula"], [3, "trap"],
  ]);

  const data = atomic();
  const expectedFamilies = packet.activityPlan.map(({ modeFamily }) => modeFamily);
  for (const locale of ["ru", "uk"]) {
    const interactions = data.interactionsByLocale[locale];
    assert.equal(interactions.length, 17, `${locale}: exact packet interaction count`);
    assert.deepEqual(interactions.map(({ family }) => family), expectedFamilies, `${locale}: packet family sequence`);
    assert.deepEqual(interactions.map(({ ordinal }) => ordinal), Array.from({ length: 17 }, (_, i) => i + 4));
    for (const [index, interaction] of interactions.entries()) {
      const plan = packet.activityPlan[index];
      assert.equal(interaction.interactionId, `en:lesson-01:session-02:i${String(index + 1).padStart(2, "0")}`);
      assert.equal(interaction.purpose, plan.independentEvidence
        ? "independent_check"
        : plan.modeFamily === "scripted_repeat_compare" ? "guided_practice"
        : plan.support === "maximum" || plan.support === "high" ? "supported_practice"
          : plan.support === "medium" ? "guided_practice"
            : plan.support === "low" || plan.support === "minimal" ? "retrieval_practice" : "independent_check");
      const answer = data.answers.find((entry) => entry.interactionId === interaction.interactionId);
      if (interaction.family === "speed_match") {
        assert.ok(interaction.modePayload.pairGrid.some(({ target }) => target === plan.canonicalExample), `${locale}: slot ${plan.slot} canonical example`);
      } else if (interaction.family === "context_gap_grammar") {
        assert.equal(interaction.modePayload.gappedTargetPhrase.replace("___", answer?.correctText).replace(/\s+\./gu, "."), plan.canonicalExample, `${locale}: slot ${plan.slot} canonical example`);
      } else assert.equal(answer?.correctText, plan.canonicalExample, `${locale}: slot ${plan.slot} canonical example`);
    }
  }

  const senses = new Map(LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2.map((sense) => [sense.id, sense]));
  const allowed = new Set([...packet.newLexicalSenseIds, ...packet.retrievalLexicalSenseIds].map((id) => senses.get(id)?.english));
  assert.deepEqual([...allowed].sort(), ["fine", "happy", "here", "ready", "sad", "tired"]);
  const text = [source("final.ru.md"), source("final.uk.md"), source("practice.atomic.json")].join("\n");
  assert.doesNotMatch(text, prohibitedForm, "no later be-person, question, negative, or article operation is introduced");
  for (const word of ["busy", "late", "sorry", "tide", "tie", "bus", "buzzy"]) {
    assert.doesNotMatch(text, new RegExp(`\\b${word}\\b`, "iu"), `unassigned lesson vocabulary ${word} is absent`);
  }

  for (const locale of ["ru", "uk"]) {
    for (const interaction of data.interactionsByLocale[locale]) {
      const feedback = interaction.modePayload?.choiceFeedback ?? [];
      assert.ok(feedback.every((entry) => entry.correct === false), `${locale}:${interaction.interactionId} only has wrong-choice corrections`);
      assert.ok((interaction.modePayload?.slotFeedback ?? []).length <= 1, `${locale}:${interaction.interactionId} has at most one extra-tile correction`);
      assert.equal(Object.hasOwn(interaction.modePayload ?? {}, "completionFeedbackByLocale"), false);
      if (interaction.family === "listen_choose" || interaction.family === "listen_build_dictation") {
        const answer = data.answers.find((entry) => entry.interactionId === interaction.interactionId)?.correctText;
        assert.ok(answer, `${locale}:${interaction.interactionId} has one answer key`);
        assert.equal(interaction.prompt.includes(answer), false, `${locale}:${interaction.interactionId} prompt does not reveal its recording`);
      }
      if (interaction.family === "listen_choose" || interaction.family === "context_gap_grammar") {
        assert.equal(interaction.responseOptions.filter(({ responseId }) =>
          data.answers.find((answer) => answer.interactionId === interaction.interactionId)?.correctResponseId === responseId).length, 1);
        assert.equal(new Set(interaction.responseOptions.map(({ text }) => text)).size, interaction.responseOptions.length);
      }
    }
  }
  for (const locale of ["ru", "uk"]) {
    const interactions = data.interactionsByLocale[locale];
    const markdownTasks = parsePractice(source(`final.${locale}.md`));
    for (const [index, task] of markdownTasks.entries()) {
      const interaction = interactions[index];
      const answer = data.answers.find((entry) => entry.interactionId === interaction.interactionId);
      assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, locale, answer), null,
        `${locale}:${interaction.interactionId} build_release learner projection matches atomic source`);
    }
    const phraseBuilder = interactions[5];
    assert.deepEqual(phraseBuilder.modePayload.localizedMeaning, {
      ru: "Том говорит, что ему грустно из-за отмены вечера.",
      uk: "Том каже, що йому сумно через скасування вечора.",
    }, "i06 localized meaning keeps Tom as the person who feels sad");

    const independentProbe = interactions[15];
    assert.deepEqual(independentProbe.modePayload.pairGrid.map(({ target }) => target), [
      "I am here.", "I am ready.", "I am fine.", "I am happy.",
    ], "i16 uses the four packet retrieval phrases");
    assert.match(independentProbe.prompt, /рина|рін[аі]|том/iu, "i16 names its actors");
    assert.match(independentProbe.prompt, /картк|клуб/iu, "i16 names its task purpose");
    assert.doesNotMatch(independentProbe.prompt, /паром|терминал|прибыл|прибыв|готов|готовий|втом|устал|happy|радий|рад|fine|here|тут|здесь/u,
      "i16 context does not privilege one of its four phrase pairs");
    const i16Answer = data.answers.find(({ interactionId }) => interactionId === independentProbe.interactionId);
    assert.equal(i16Answer.correctText, independentProbe.modePayload.pairGrid
      .map(({ pairId, target }) => `${pairId}=${target}`).join("\n"), "i16 answer key matches the four visible pair targets");

    for (const interaction of interactions) {
      if (interaction.family !== "listen_choose" && interaction.family !== "listen_build_dictation") continue;
      const transcript = interaction.modePayload.referenceAudio?.transcript;
      assert.ok(transcript, `${locale}:${interaction.interactionId} carries transcript metadata`);
      assert.equal(interaction.prompt.includes(transcript), false, `${locale}:${interaction.interactionId} learner prompt hides its transcript`);
      assert.equal(interaction.accessibilityLabel.includes(transcript), false, `${locale}:${interaction.interactionId} accessibility prompt hides its transcript`);
      if (interaction.family === "listen_choose") {
        assert.equal(interaction.modePayload.transcriptRevealPolicy, "after_first_attempt",
          `${locale}:${interaction.interactionId} reveals its transcript only after the first attempt`);
      } else {
        assert.equal(interaction.modePayload.hiddenTargetPhrase, transcript,
          `${locale}:${interaction.interactionId} keeps the transcript in the hidden target field`);
      }
    }
  }
  assert.equal(new Set(data.interactionsByLocale.ru.map(({ prompt }) => prompt)).size, 17, "RU task prompts are distinct");
  assert.equal(new Set(data.interactionsByLocale.uk.map(({ prompt }) => prompt)).size, 17, "UK task prompts are distinct");
  for (let index = 0; index < 17; index += 1) {
    const ru = data.interactionsByLocale.ru[index];
    const uk = data.interactionsByLocale.uk[index];
    assert.equal(ru.interactionId, uk.interactionId);
    assert.equal(ru.family, uk.family);
    assert.deepEqual(ru.responseOptions.map(({ text }) => text), uk.responseOptions.map(({ text }) => text));
    assert.deepEqual(ru.modePayload.referenceAudio?.transcript, uk.modePayload.referenceAudio?.transcript);
    assert.deepEqual(ru.modePayload.targetPhrase ?? ru.modePayload.hiddenTargetPhrase ?? ru.modePayload.gappedTargetPhrase,
      uk.modePayload.targetPhrase ?? uk.modePayload.hiddenTargetPhrase ?? uk.modePayload.gappedTargetPhrase);
    assert.deepEqual(ru.modePayload.pairGrid?.map(({ target }) => target), uk.modePayload.pairGrid?.map(({ target }) => target));
    assert.equal(data.answers[index].correctText, atomic().answers[index].correctText, "answer keys align across locales");
  }

  const last = data.interactionsByLocale.ru.at(-2);
  assert.equal(last.family, "speed_match", "slot 19 remains the packet's independent speed-match probe");
  assert.equal(last.purpose, "independent_check");
  assert.match(last.prompt, /картк|клуб/u, "the final independent probe uses a changed context");
  assert.doesNotMatch(last.prompt, /I am here|я здесь/u, "the probe prompt does not expose the answer");
  const heldRepeat = data.interactionsByLocale.ru.at(-1);
  assert.equal(heldRepeat.family, "scripted_repeat_compare", "slot 20 retains its packet family");
  assert.equal(heldRepeat.purpose, "independent_check", "slot 20 uses its packet independent purpose");
  const repeatPlan = packet.activityPlan.at(-1);
  assert.equal(repeatPlan.support, "none", "slot 20 has no instructional support");
  assert.equal(repeatPlan.independentEvidence, true, "slot 20 is an independent evidence slot");
  const expectedRevealPolicy = {
    schemaVersion: "learning-v2-scripted-repeat-reveal-policy.v1",
    revealAfter: "first_submitted_attempt",
    answerExposedBeforeAttempt: false,
    targetPhraseVisibleBeforeAttempt: false,
    referenceAudioAvailableBeforeAttempt: false,
    modelPlaybackAvailableBeforeAttempt: false,
  };
  for (const locale of ["ru", "uk"]) {
    const interactions = data.interactionsByLocale[locale];
    const repeat = interactions.at(-1);
    assert.equal(repeat.family, "scripted_repeat_compare", `${locale}: slot 20 retains its packet family`);
    assert.equal(repeat.purpose, "independent_check", `${locale}: slot 20 rejects guided fallback`);
    assert.match(repeat.prompt, /радио|радіо|микрофон|мікрофона/iu, `${locale}: slot 20 uses a changed radio-recording context`);
    assert.notEqual(repeat.prompt, interactions[6].prompt, `${locale}: slot 20 differs from guided scripted-repeat training`);
    assert.notEqual(repeat.prompt, interactions[15].prompt, `${locale}: slot 20 differs from slot-19 language-club context`);
    assert.doesNotMatch(repeat.prompt, /I am happy|happy|радий|счастлив/u, `${locale}: slot 20 prompt does not disclose its target`);

    const repeatTask = parsePractice(source(`final.${locale}.md`)).at(-1);
    const builtRepeat = buildInteraction(repeatTask, { ru: {}, uk: {} }, data.courseSessionId, 16, 17);
    const [releasedRepeat] = projectScriptedRepeatRevealPolicies([builtRepeat]);
    assert.equal(releasedRepeat.purpose, "independent_check", `${locale}: build/reveal projection preserves independent status`);
    assert.deepEqual(releasedRepeat.modePayload.scriptedRepeatRevealPolicy, expectedRevealPolicy,
      `${locale}: slot 20 has the strict after-first-attempt reveal contract`);
    assert.doesNotMatch(releasedRepeat.prompt, /I am happy|happy/u, `${locale}: build learner prompt hides the target before attempt`);
    assert.doesNotMatch(releasedRepeat.accessibilityLabel, /I am happy|happy/u,
      `${locale}: accessible learner prompt hides the target before attempt`);
  }
});

test("L01/S02 RU and UK packet activity copies have exact visible parity", () => {
  const ru = parsePractice(source("final.ru.md"));
  const uk = parsePractice(source("final.uk.md"));
  assert.equal(ru.length, 17);
  assert.equal(uk.length, 17);
  assert.deepEqual(ru.map(({ family }) => family), uk.map(({ family }) => family));
  assert.equal(source("locales_batch.md"), `===LOCALE: uk===\n${source("final.uk.md")}`);
});
