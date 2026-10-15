import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s09");
const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");
const data = () => JSON.parse(read("practice.atomic.json"));

test("L01/S09 stays within the approved he/she/it grammar, senses, and activity plan", async () => {
  const { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2 } = await import("../../../modules/learning-v2/curriculum/en/course_blueprint_en_v2.ts");
  const packet = LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2.sessionPackets.find(
    (candidate) => candidate.sessionId === "lesson-01:session:09",
  );
  assert.ok(packet, "approved S09 packet exists");
  assert.deepEqual(packet.grammarOperationIds, ["en.grammar.present_be_affirmative.he_she_it_is"]);
  assert.deepEqual(packet.newLexicalSenseIds, ["en.tall.adjective.01", "en.short.adjective.01", "en.young.adjective.01"]);
  assert.deepEqual(packet.retrievalLexicalSenseIds, [
    "en.angry.adjective.01", "en.scared.adjective.01", "en.calm.adjective.01", "en.here.adverb.01",
    "en.ready.adjective.01", "en.fine.adjective.01", "en.happy.adjective.01",
  ]);
  assert.deepEqual(packet.introPlan.map((intro) => intro.purpose), ["concept", "formula", "trap"]);
  assert.equal(packet.activityPlan.length, 17);

  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    const source = read(`final.${locale}.md`);
    assert.equal((source.match(/^## (?:Интро|Інтро) \d+$/gmu) ?? []).length, 3, `${locale}: three intros`);
    const entries = snapshot.interactionsByLocale[locale];
    assert.equal(entries.length, packet.activityPlan.length, `${locale}: exactly the planned interactions`);
    assert.deepEqual(entries.map((entry) => entry.family), packet.activityPlan.map((activity) => activity.modeFamily), `${locale}: packet activity shape`);
    assert.deepEqual(entries.map((entry) => entry.interactionId.split(":").at(-1)),
      Array.from({ length: 17 }, (_, index) => `i${String(index + 1).padStart(2, "0")}`), `${locale}: packet order`);
    const answers = new Map(snapshot.answers.map((answer) => [answer.interactionId, answer]));
    for (const entry of entries) {
      const targets = [
        entry.modePayload.targetPhrase,
        entry.modePayload.hiddenTargetPhrase,
        entry.modePayload.referenceAudio?.transcript,
        entry.modePayload.gappedTargetPhrase?.replace("___", answers.get(entry.interactionId)?.correctText ?? ""),
      ].filter((value) => typeof value === "string" && value.trim());
      for (const target of targets) {
        assert.match(target.replace(/\s+([.!?])/gu, "$1"), /^(?:He|She|It) is (?:tall|short|young|angry|scared|calm|here|ready|fine|happy)\.$/u,
          `${locale}:${entry.interactionId}: target stays within packet grammar and senses`);
      }
      assert.doesNotMatch(entry.prompt, /\b(?:You|We|They) are\b/u, `${locale}:${entry.interactionId}: forbidden are operation absent`);
    }
  }
});

test("L01/S09 has wrong-only concise feedback and keeps RU/UK projections in parity", async () => {
  const { parsePractice, atomicMarkdownParityIssues } = await import("./build_release.mjs");
  const snapshot = data();
  const tasksByLocale = {};
  for (const locale of ["ru", "uk"]) {
    tasksByLocale[locale] = parsePractice(read(`final.${locale}.md`));
    for (const entry of snapshot.interactionsByLocale[locale]) {
      const feedback = entry.modePayload.choiceFeedback ?? [];
      assert.equal(feedback.some((row) => row.correct), false, `${locale}:${entry.interactionId}: no correct-answer feedback`);
      for (const row of feedback) {
        for (const copy of Object.values(row.feedbackByLocale ?? {})) {
          assert.ok(copy.length <= 120, `${locale}:${entry.interactionId}: concise correction`);
        }
      }
    }
  }
  assert.deepEqual(atomicMarkdownParityIssues({
    sessionIdentity: "en/l01/s09",
    sessionId: "en:lesson-01:session-09",
    atomicSource: snapshot,
    tasksByLocale,
  }), []);
  const batch = read("locales_batch.md");
  assert.match(batch, /^===LOCALE: uk===\r?\n/u);
  assert.equal(batch.slice(batch.indexOf("\n") + 1).trimEnd(), read("final.uk.md").trimEnd());
});

test("L01/S09 i15 distinguishes scared from calm and i16 preserves fine's well-being sense", () => {
  const snapshot = data();
  const i15 = snapshot.interactionsByLocale.ru.find((entry) => entry.interactionId.endsWith(":i15"));
  const calmDistractor = i15.modePayload.choiceFeedback.find((row) => row.responseId.endsWith(":r3"));
  assert.match(calmDistractor.feedbackByLocale.ru, /scared/u);
  assert.match(calmDistractor.feedbackByLocale.ru, /calm/u);
  assert.doesNotMatch(calmDistractor.feedbackByLocale.ru, /перв(?:ое|ым) выступлен/u);
  assert.match(calmDistractor.feedbackByLocale.uk, /scared/u);
  assert.match(calmDistractor.feedbackByLocale.uk, /calm/u);
  assert.doesNotMatch(calmDistractor.feedbackByLocale.uk, /перш(?:ий|им) виступ/u);

  const fine = snapshot.interactionsByLocale.ru
    .find((entry) => entry.interactionId.endsWith(":i16"))
    .modePayload.pairGrid.find((pair) => pair.target === "fine");
  assert.equal(fine.meaningByLocale.ru, "«чувствует себя хорошо»");
  assert.equal(fine.meaningByLocale.uk, "«почувається добре»");
});

test("L01/S09 listening prompts identify only the speaker and requested response", () => {
  const snapshot = data();
  const clueById = {
    i05: /\b(?:tall|height|high)\b|высок|зрост|зріст|найвищ/iu,
    i09: /\b(?:angry|anger|argument)\b|спор|супереч|сердит|роздрат|злост/iu,
    i15: /\b(?:scared|fear|stage)\b|держит.{0,30}рук|тримає.{0,30}рук|страх|сцен|виступ|налякан/iu,
  };
  for (const locale of ["ru", "uk"]) {
    for (const [id, clue] of Object.entries(clueById)) {
      const entry = snapshot.interactionsByLocale[locale].find((item) => item.interactionId.endsWith(`:${id}`));
      assert.doesNotMatch(entry.prompt, /\bHe is (?:tall|angry|scared)\b/iu, `${locale}:${id}: no English answer in prompt`);
      assert.doesNotMatch(entry.prompt, clue, `${locale}:${id}: no semantic answer clue before listening`);
    }
  }
});

test("L01/S09 slot 19 and slot 20 carry packet-bound independent evidence", async () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    const entries = snapshot.interactionsByLocale[locale];
    const probe = entries.find((entry) => entry.interactionId === "en:lesson-01:session-09:i16");
    const followUp = entries.find((entry) => entry.interactionId === "en:lesson-01:session-09:i17");
    assert.equal(probe.family, "speed_match");
    assert.equal(probe.purpose, "independent_check");
    assert.match(probe.prompt, /Мила|Міла/u, `${locale}: independent probe names a new actor`);
    assert.doesNotMatch(probe.prompt, /here|ready|fine|happy|здесь|готов|порядке|счастлив|тут|щаслив/iu,
      `${locale}: independent prompt does not reveal an answer`);
    assert.doesNotMatch(entries.slice(0, -2).map((entry) => entry.prompt).join(" "), /Мила|Міла|ботаническ|ботанічн/u,
      `${locale}: independent probe uses a changed context`);
    assert.equal(followUp.family, "scripted_repeat_compare");
    assert.equal(followUp.purpose, "independent_check", `${locale}: slot 20 matches packet evidence purpose`);
    assert.match(followUp.prompt, /Вера|Віра/u, `${locale}: slot 20 names the changed-context speaker`);
    assert.doesNotMatch(followUp.prompt, /She is angry|angry|сердит|зл|розбил|розбила|кулак|кулац/iu,
      `${locale}: slot 20 learner prompt does not expose or hint at target`);
    assert.match(followUp.prompt, /аудиотек|аудіотек/u, `${locale}: slot 20 has a distinct audio-library purpose`);
    assert.doesNotMatch(entries.slice(0, -2).map((entry) => entry.prompt).join(" "), /аудиотек|аудіотек/u,
      `${locale}: slot 20 context is novel relative to training and slot 19`);
  }
  const { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2 } = await import("../../../modules/learning-v2/curriculum/en/course_blueprint_en_v2.ts");
  const packet = LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2.sessionPackets.find(
    (candidate) => candidate.sessionId === "lesson-01:session:09",
  );
  assert.equal(packet.independentProbe.changedContextRequired, true);
  assert.equal(packet.independentProbe.copiedTrainingPromptForbidden, true);
  const slot19 = packet.activityPlan.find((slot) => slot.slot === 19);
  const slot20 = packet.activityPlan.find((slot) => slot.slot === 20);
  assert.equal(slot19.modeFamily, "speed_match");
  assert.equal(slot19.independentEvidence, true);
  assert.equal(slot20.modeFamily, "scripted_repeat_compare");
  assert.equal(slot20.independentEvidence, true);
  assert.equal(slot20.support, "none");

  const { buildInteraction, parsePractice } = await import("./build_release.mjs");
  for (const locale of ["ru", "uk"]) {
    const task = parsePractice(read(`final.${locale}.md`)).find((item) => item.interactionId.endsWith(":i17"));
    assert.equal(task.purpose, "independent_check", `${locale}: source explicitly rejects guided fallback`);
    const projected = buildInteraction(task, { ru: {}, uk: {} }, "en:lesson-01:session-09", 14, 17);
    assert.equal(projected.purpose, "independent_check");
    assert.deepEqual(projected.modePayload.scriptedRepeatRevealPolicy, {
      schemaVersion: "learning-v2-scripted-repeat-reveal-policy.v1",
      revealAfter: "first_submitted_attempt",
      answerExposedBeforeAttempt: false,
      targetPhraseVisibleBeforeAttempt: false,
      referenceAudioAvailableBeforeAttempt: false,
      modelPlaybackAvailableBeforeAttempt: false,
    });
    assert.doesNotMatch(projected.prompt, /She is angry|angry|сердит|зл/iu, `${locale}: projected learner prompt is answer-free`);
  }
});
