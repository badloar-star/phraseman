import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const MODULE = new URL("./factory_intro_practice_gate.mjs", import.meta.url);

function introMarkdown(targets, locale = "ru") {
  const word = locale === "uk" ? "Вступ" : "Интро";
  return targets.map((target, index) => [
    `## ${word} ${index + 1}`,
    "",
    "**Выберите точную фразу.**",
    "",
    `- ✅ **${target}**`,
    "- ❌ wrong",
    "",
  ].join("\n")).join("\n---\n\n");
}

function interaction(sessionId, suffix, family, modePayload, purpose = "supported_practice") {
  return {
    interactionId: `${sessionId}:${suffix}`,
    ordinal: Number(suffix.slice(1)) + 3,
    purpose,
    family,
    responseOptions: [],
    modePayload: { family, ...modePayload },
  };
}

function fixtureSource(sessionId) {
  const interactions = [
    interaction(sessionId, "i01", "listen_choose", {
      referenceAudio: { transcript: "hello" },
      localizedMeaningChoices: [
        { responseId: `${sessionId}:i01:r1`, targetText: "привет" },
        { responseId: `${sessionId}:i01:r2`, targetText: "пока" },
      ],
    }),
    interaction(sessionId, "i02", "context_gap_grammar", {
      gappedTargetPhrase: "I am ___.",
      gapOptions: [{ responseId: `${sessionId}:i02:r1`, text: "busy" }],
    }),
    interaction(sessionId, "i03", "speed_match", {
      pairGrid: [
        { pairId: `${sessionId}:i03:p1`, target: "ready", meaning: "готов" },
        { pairId: `${sessionId}:i03:p2`, target: "fine", meaning: "нормально" },
      ],
    }),
    interaction(sessionId, "i04", "phrase_builder", { targetPhrase: "I am calm." }),
    interaction(sessionId, "i05", "listen_build_dictation", {
      hiddenTargetPhrase: "I am early.",
      referenceAudio: { transcript: "I am early." },
    }),
    interaction(sessionId, "i06", "scripted_repeat_compare", {
      targetPhrase: "I am happy.",
      referenceAudio: { transcript: "I am happy." },
    }),
    interaction(sessionId, "i07", "sound_contrast", {
      contrastA: "sure",
      contrastB: "shore",
      audioA: { transcript: "sure" },
      audioB: { transcript: "shore" },
    }),
    interaction(sessionId, "i17", "phrase_builder", { targetPhrase: "I am here." }, "retrieval_practice"),
    interaction(sessionId, "i18", "phrase_builder", { targetPhrase: "Do not count." }, "independent_final"),
  ];
  interactions[0].responseOptions = [
    { responseId: `${sessionId}:i01:r1`, text: "привет" },
    { responseId: `${sessionId}:i01:r2`, text: "пока" },
  ];
  interactions[1].responseOptions = structuredClone(interactions[1].modePayload.gapOptions);
  interactions[6].responseOptions = [
    { responseId: `${sessionId}:i07:r1`, text: "sure" },
    { responseId: `${sessionId}:i07:r2`, text: "shore" },
  ];
  const answers = [
    { interactionId: `${sessionId}:i01`, correctText: "привет", correctResponseId: `${sessionId}:i01:r1` },
    { interactionId: `${sessionId}:i02`, correctText: "busy", correctResponseId: `${sessionId}:i02:r1` },
    { interactionId: `${sessionId}:i03`, correctText: `${sessionId}:i03:p1=ready\n${sessionId}:i03:p2=fine` },
    { interactionId: `${sessionId}:i04`, correctText: "I am calm." },
    { interactionId: `${sessionId}:i05`, correctText: "I am early." },
    { interactionId: `${sessionId}:i06`, correctText: "I am happy." },
    { interactionId: `${sessionId}:i07`, correctText: "sure", correctResponseId: `${sessionId}:i07:r1` },
    { interactionId: `${sessionId}:i17`, correctText: "I am here." },
    { interactionId: `${sessionId}:i18`, correctText: "Do not count." },
  ];
  return {
    schemaVersion: "learning_v2_atomic_practice_source_v1",
    courseSessionId: sessionId,
    interactionsByLocale: {
      ru: structuredClone(interactions),
      uk: structuredClone(interactions),
    },
    answers,
  };
}

function makeFixture({ lesson = "l04", session = "s18", ruTargets, ukTargets = ruTargets, mutate } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "factory-intro-practice-"));
  const sessionDir = path.join(root, lesson, session);
  fs.mkdirSync(sessionDir, { recursive: true });
  const lessonNo = lesson.slice(1);
  const sessionNo = session.slice(1);
  const sessionId = `en:lesson-${lessonNo}:session-${sessionNo}`;
  const source = fixtureSource(sessionId);
  mutate?.(source, { sessionId, sessionDir });
  fs.writeFileSync(path.join(sessionDir, "final.ru.md"), introMarkdown(ruTargets ?? ["ready", "sure", "I am here."], "ru"));
  fs.writeFileSync(path.join(sessionDir, "final.uk.md"), introMarkdown(ukTargets ?? ["ready", "sure", "I am here."], "uk"));
  fs.writeFileSync(path.join(sessionDir, "practice.atomic.json"), `${JSON.stringify(source, null, 2)}\n`);
  return { root, inventory: [{ lesson, session }], sessionDir };
}

async function audit(fixture) {
  const { auditFactoryIntroPractice } = await import(MODULE);
  return auditFactoryIntroPractice({ sessionsRoot: fixture.root, inventory: fixture.inventory });
}

test("default inventory is the explicit 186 English sessions and includes L04/S18", async () => {
  const { FACTORY_ENGLISH_SESSION_INVENTORY } = await import(MODULE);
  assert.equal(FACTORY_ENGLISH_SESSION_INVENTORY.length, 186);
  assert.deepEqual(FACTORY_ENGLISH_SESSION_INVENTORY.at(-1), { lesson: "l04", session: "s18" });
});

test("recognizes all seven target families and counts i17 retrieval practice by purpose, not suffix", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.verdict, "PASS", JSON.stringify(report.findings));
  assert.equal(report.perSession[0].introTargetCount, 3);
  assert.equal(report.perSession[0].practiceTargetCount, 9);
  assert.deepEqual(report.perSession[0].families, [
    "context_gap_grammar", "listen_build_dictation", "listen_choose", "phrase_builder",
    "scripted_repeat_compare", "sound_contrast", "speed_match",
  ]);
});

test("missing intro answer marker fails closed", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const file = path.join(fixture.sessionDir, "final.ru.md");
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("- ✅ **sure**", "- ❌ **sure**"));
  const report = await audit(fixture);
  assert.ok(report.findings.some((item) => item.code === "intro_answer_marker_count" && item.locale === "ru" && item.page === 2));
});

test("duplicate interaction and answer ids fail instead of Map-last authority", async (t) => {
  const fixture = makeFixture({ mutate(source) {
    source.interactionsByLocale.ru.push(structuredClone(source.interactionsByLocale.ru[0]));
    source.answers.push({ ...source.answers[0], correctText: "different" });
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.ok(report.findings.some((item) => item.code === "duplicate_interaction_id"));
  assert.ok(report.findings.some((item) => item.code === "duplicate_answer_id"));
});

test("independent_final is excluded from intro-to-practice evidence", async (t) => {
  const fixture = makeFixture({ ruTargets: ["Do not count.", "sure", "I am here."] });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.ok(report.findings.some((item) => item.code === "intro_target_not_practiced" && item.target === "Do not count."));
});

test("retrieval after the independent boundary cannot satisfy pre-final intro coverage", async (t) => {
  const fixture = makeFixture({ ruTargets: ["After final.", "sure", "I am here."], mutate(source, { sessionId }) {
    const afterFinal = interaction(sessionId, "i19", "phrase_builder", { targetPhrase: "After final." }, "retrieval_practice");
    source.interactionsByLocale.ru.push(structuredClone(afterFinal));
    source.interactionsByLocale.uk.push(structuredClone(afterFinal));
    source.answers.push({ interactionId: `${sessionId}:i19`, correctText: "After final." });
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.ok(report.findings.some((item) => item.code === "intro_target_not_practiced" && item.target === "After final."));
  assert.ok(report.findings.some((item) => item.code === "practice_after_independent_boundary" && item.interactionId.endsWith(":i19")));
});

test("missing independent boundary fails closed in each locale", async (t) => {
  const fixture = makeFixture({ mutate(source) {
    for (const locale of ["ru", "uk"]) {
      source.interactionsByLocale[locale] = source.interactionsByLocale[locale]
        .filter((item) => item.purpose !== "independent_final" && item.purpose !== "independent_check");
    }
    source.answers = source.answers.filter((answer) => !answer.interactionId.endsWith(":i18"));
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.findings.filter((item) => item.code === "independent_boundary_missing").length, 2);
});

test("an empty-id independent boundary is invalid and cannot establish the boundary", async (t) => {
  const fixture = makeFixture({ mutate(source) {
    for (const locale of ["ru", "uk"]) {
      const boundary = source.interactionsByLocale[locale].find((item) => item.purpose === "independent_final");
      boundary.interactionId = "";
    }
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.findings.filter((item) => item.code === "invalid_independent_boundary" && item.reason === "missing_interaction_id").length, 2);
  assert.equal(report.findings.filter((item) => item.code === "independent_boundary_missing").length, 2);
});

test("duplicate independent boundary ids are invalid and cannot establish the boundary", async (t) => {
  const fixture = makeFixture({ mutate(source) {
    for (const locale of ["ru", "uk"]) {
      const boundary = source.interactionsByLocale[locale].find((item) => item.purpose === "independent_final");
      source.interactionsByLocale[locale].push(structuredClone(boundary));
    }
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.findings.filter((item) => item.code === "duplicate_interaction_id").length, 2);
  assert.equal(report.findings.filter((item) => item.code === "invalid_independent_boundary" && item.reason === "duplicate_interaction_id").length, 4);
  assert.equal(report.findings.filter((item) => item.code === "independent_boundary_missing").length, 2);
});

test("an independent boundary without exactly one answer is invalid and cannot establish the boundary", async (t) => {
  const fixture = makeFixture({ mutate(source) {
    const boundaryAnswer = source.answers.find((answer) => answer.interactionId.endsWith(":i18"));
    source.answers.push(structuredClone(boundaryAnswer));
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.findings.filter((item) => item.code === "answer_authority_count" && item.interactionId.endsWith(":i18") && item.actual === 2).length, 2);
  assert.equal(report.findings.filter((item) => item.code === "invalid_independent_boundary" && item.reason === "answer_authority_count").length, 2);
  assert.equal(report.findings.filter((item) => item.code === "independent_boundary_missing").length, 2);
});

test("a whitespace-padded boundary id is not a runtime-valid raw interaction id", async (t) => {
  const fixture = makeFixture({ mutate(source) {
    for (const locale of ["ru", "uk"]) {
      const boundary = source.interactionsByLocale[locale].find((item) => item.purpose === "independent_final");
      boundary.interactionId = ` ${boundary.interactionId} `;
    }
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.findings.filter((item) => item.code === "invalid_independent_boundary" && item.reason === "invalid_raw_interaction_id").length, 2);
  assert.equal(report.findings.filter((item) => item.code === "independent_boundary_missing").length, 2);
});

test("a documented additive :aNN interaction id is runtime-valid at the independent boundary", async (t) => {
  const fixture = makeFixture({ mutate(source) {
    const answer = source.answers.find((item) => item.interactionId.endsWith(":i18"));
    answer.interactionId = `${answer.interactionId}:a01`;
    for (const locale of ["ru", "uk"]) {
      const boundary = source.interactionsByLocale[locale].find((item) => item.purpose === "independent_final");
      boundary.interactionId = `${boundary.interactionId}:a01`;
    }
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.verdict, "PASS", JSON.stringify(report.findings));
});

test("a boundary answer needs concrete correctText", async (t) => {
  const fixture = makeFixture({ mutate(source) {
    source.answers.find((answer) => answer.interactionId.endsWith(":i18")).correctText = "";
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.findings.filter((item) => item.code === "invalid_independent_boundary" && item.reason === "missing_correct_text").length, 2);
  assert.equal(report.findings.filter((item) => item.code === "independent_boundary_missing").length, 2);
});

test("a boundary answer must resolve through its family-native authority", async (t) => {
  const fixture = makeFixture({ mutate(source) {
    source.answers.find((answer) => answer.interactionId.endsWith(":i18")).correctText = "Wrong final.";
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.findings.filter((item) => item.code === "invalid_independent_boundary" && item.reason === "family_native_authority").length, 2);
  assert.equal(report.findings.filter((item) => item.code === "independent_boundary_missing").length, 2);
});

test("a boundary with a family that cannot resolve its payload is invalid", async (t) => {
  const fixture = makeFixture({ mutate(source) {
    for (const locale of ["ru", "uk"]) {
      const boundary = source.interactionsByLocale[locale].find((item) => item.purpose === "independent_final");
      boundary.family = "listen_build_dictation";
      boundary.modePayload.family = "listen_build_dictation";
    }
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.findings.filter((item) => item.code === "invalid_independent_boundary" && item.reason === "family_native_authority").length, 2);
  assert.equal(report.findings.filter((item) => item.code === "independent_boundary_missing").length, 2);
});

test("a boundary requires the same family at the same RU and UK row", async (t) => {
  const fixture = makeFixture({ mutate(source) {
    const ukBoundary = source.interactionsByLocale.uk.find((item) => item.purpose === "independent_final");
    ukBoundary.family = "listen_build_dictation";
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.findings.filter((item) => item.code === "invalid_independent_boundary" && item.reason === "locale_alignment").length, 2);
  assert.equal(report.findings.filter((item) => item.code === "independent_boundary_missing").length, 2);
});

test("a boundary requires the same row index in RU and UK", async (t) => {
  const fixture = makeFixture({ mutate(source) {
    const ukItems = source.interactionsByLocale.uk;
    [ukItems[ukItems.length - 2], ukItems[ukItems.length - 1]] = [ukItems[ukItems.length - 1], ukItems[ukItems.length - 2]];
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.findings.filter((item) => item.code === "invalid_independent_boundary" && item.reason === "locale_alignment").length, 2);
  assert.equal(report.findings.filter((item) => item.code === "independent_boundary_missing").length, 2);
});

test("a later valid final cannot replace an invalid earliest independent cutoff", async (t) => {
  const fixture = makeFixture({ mutate(source, { sessionId }) {
    for (const locale of ["ru", "uk"]) {
      const boundary = source.interactionsByLocale[locale].find((item) => item.purpose === "independent_final");
      boundary.interactionId = ` ${boundary.interactionId} `;
      source.interactionsByLocale[locale].push(interaction(sessionId, "i19", "phrase_builder", { targetPhrase: "Second final." }, "independent_check"));
    }
    source.answers.push({ interactionId: `${sessionId}:i19`, correctText: "Second final." });
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.findings.filter((item) => item.code === "invalid_independent_boundary" && item.reason === "invalid_raw_interaction_id").length, 2);
  assert.equal(report.findings.filter((item) => item.code === "independent_boundary_missing").length, 2);
});

test("multiple valid finals are allowed while the first exact independent purpose remains the cutoff", async (t) => {
  const fixture = makeFixture({ mutate(source, { sessionId }) {
    for (const locale of ["ru", "uk"]) {
      source.interactionsByLocale[locale].push(interaction(sessionId, "i19", "phrase_builder", { targetPhrase: "Second final." }, "independent_check"));
    }
    source.answers.push({ interactionId: `${sessionId}:i19`, correctText: "Second final." });
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.verdict, "PASS", JSON.stringify(report.findings));
});

test("an interaction without an id after the independent boundary still fails ordering", async (t) => {
  const fixture = makeFixture({ mutate(source, { sessionId }) {
    for (const locale of ["ru", "uk"]) {
      source.interactionsByLocale[locale].push(interaction(sessionId, "i19", "phrase_builder", { targetPhrase: "After final." }, "retrieval_practice"));
      source.interactionsByLocale[locale].at(-1).interactionId = "";
    }
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.findings.filter((item) => item.code === "practice_after_independent_boundary" && item.interactionId === null).length, 2);
});

test("purpose is an exact allowlist and whitespace variants cannot count as practice", async (t) => {
  const fixture = makeFixture({ ruTargets: ["Invalid purpose.", "sure", "I am here."], mutate(source) {
    for (const locale of ["ru", "uk"]) {
      const item = source.interactionsByLocale[locale].find((candidate) => candidate.interactionId.endsWith(":i04"));
      item.purpose = "independent_check ";
      item.modePayload.targetPhrase = "Invalid purpose.";
    }
    source.answers.find((answer) => answer.interactionId.endsWith(":i04")).correctText = "Invalid purpose.";
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.findings.filter((item) => item.code === "invalid_practice_purpose" && item.purpose === "independent_check ").length, 2);
  assert.ok(report.findings.some((item) => item.code === "intro_target_not_practiced" && item.target === "Invalid purpose."));
});

test("excluded final purposes cannot satisfy intro coverage and still report duplicate or missing authority", async (t) => {
  const fixture = makeFixture({ ruTargets: ["ready", "sure", "Only final."], mutate(source, { sessionId }) {
    const item = interaction(sessionId, "i19", "phrase_builder", { targetPhrase: "Only final." }, "independent_check");
    const missing = interaction(sessionId, "i20", "phrase_builder", { targetPhrase: "Missing final." }, "independent_final");
    source.interactionsByLocale.ru.push(structuredClone(item));
    source.interactionsByLocale.uk.push(structuredClone(item));
    source.interactionsByLocale.ru.push(structuredClone(missing));
    source.interactionsByLocale.uk.push(structuredClone(missing));
    source.answers.push({ interactionId: `${sessionId}:i19`, correctText: "Only final." });
    source.answers.push({ interactionId: `${sessionId}:i19`, correctText: "Only final." });
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.ok(report.findings.some((item) => item.code === "intro_target_not_practiced" && item.target === "Only final."));
  assert.ok(report.findings.some((item) => item.code === "answer_authority_count" && item.interactionId.endsWith(":i19") && item.actual === 2));
  assert.ok(report.findings.some((item) => item.code === "answer_authority_count" && item.interactionId.endsWith(":i20") && item.actual === 0));
});

test("RU and UK intro answers must match exactly", async (t) => {
  const fixture = makeFixture({ ukTargets: ["ready", "certain", "I am here."] });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.ok(report.findings.some((item) => item.code === "intro_answer_locale_mismatch" && item.page === 2));
});

test("sound contrast uses the uniquely selected contrast B when B is authoritative", async (t) => {
  const fixture = makeFixture({ ruTargets: ["ready", "shore", "I am here."], mutate(source, { sessionId }) {
    const answer = source.answers.find((item) => item.interactionId === `${sessionId}:i07`);
    answer.correctResponseId = `${sessionId}:i07:r2`;
    answer.correctText = "shore";
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.verdict, "PASS", JSON.stringify(report.findings));
});

test("localized listen choice binds by response id while global correctText may match the RU row", async (t) => {
  const fixture = makeFixture({ mutate(source, { sessionId }) {
    source.interactionsByLocale.uk[0].responseOptions[0].text = "вітаю";
    source.interactionsByLocale.uk[0].modePayload.localizedMeaningChoices[0].targetText = "вітаю";
    source.answers.find((item) => item.interactionId === `${sessionId}:i01`).correctText = "привет";
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.verdict, "PASS", JSON.stringify(report.findings));
});

test("localized listen choice rejects correctText that matches neither locale", async (t) => {
  const fixture = makeFixture({ mutate(source, { sessionId }) {
    source.interactionsByLocale.uk[0].responseOptions[0].text = "вітаю";
    source.interactionsByLocale.uk[0].modePayload.localizedMeaningChoices[0].targetText = "вітаю";
    source.answers.find((item) => item.interactionId === `${sessionId}:i01`).correctText = "not a selected row";
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.ok(report.findings.some((item) => item.code === "localized_answer_text_mismatch"));
});

test("localized listen choice targetText must match its selected localized response row", async (t) => {
  const fixture = makeFixture({ mutate(source) {
    source.interactionsByLocale.ru[0].modePayload.localizedMeaningChoices[0].targetText = "not hello";
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.ok(report.findings.some((item) => item.code === "listen_choice_target_mismatch"));
});

test("word-card authority supports an id without responseOptions and a legacy empty answer", async (t) => {
  const fixture = makeFixture({ mutate(source, { sessionId }) {
    for (const locale of ["ru", "uk"]) {
      const item = source.interactionsByLocale[locale][0];
      item.responseOptions = [];
      item.modePayload.isWordCard = true;
      item.modePayload.wordCard = { word: "hello" };
      item.modePayload.localizedMeaningChoices = [{ responseId: `${sessionId}:i01:r1`, targetText: "hello" }];
    }
    const answer = source.answers.find((item) => item.interactionId === `${sessionId}:i01`);
    answer.correctText = "";
    answer.correctResponseId = null;
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.verdict, "PASS", JSON.stringify(report.findings));
});

test("sound contrast selected audio transcript must match the selected contrast", async (t) => {
  const fixture = makeFixture({ mutate(source) {
    source.interactionsByLocale.ru[6].modePayload.audioA.transcript = "wrong audio";
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.ok(report.findings.some((item) => item.code === "sound_contrast_audio_mismatch"));
});

test("context gap correct id must resolve once in both response and gap options with the same text", async (t) => {
  const fixture = makeFixture({ mutate(source, { sessionId }) {
    source.interactionsByLocale.ru[1].responseOptions = [{ responseId: `${sessionId}:i02:r1`, text: "different" }];
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.ok(report.findings.some((item) => item.code === "context_gap_response_authority_mismatch"));
});

test("duplicate response and gap-option ids fail closed", async (t) => {
  const fixture = makeFixture({ mutate(source, { sessionId }) {
    source.interactionsByLocale.ru[0].responseOptions[1].responseId = `${sessionId}:i01:r1`;
    source.interactionsByLocale.ru[1].modePayload.gapOptions.push({ responseId: `${sessionId}:i02:r1`, text: "ready" });
  } });
  const blank = makeFixture({ mutate(source) {
    source.interactionsByLocale.ru[0].responseOptions[0].responseId = "";
    source.interactionsByLocale.ru[1].modePayload.gapOptions[0].responseId = "";
  } });
  t.after(() => {
    fs.rmSync(fixture.root, { recursive: true, force: true });
    fs.rmSync(blank.root, { recursive: true, force: true });
  });
  const report = await audit(fixture);
  const blankReport = await audit(blank);
  assert.ok(report.findings.some((item) => item.code === "duplicate_response_id"));
  assert.ok(report.findings.some((item) => item.code === "duplicate_gap_option_id"));
  assert.ok(blankReport.findings.some((item) => item.code === "missing_response_id"));
  assert.ok(blankReport.findings.some((item) => item.code === "missing_gap_option_id"));
});

test("legacy speed match may derive canonical authority from pairGrid when correctText is empty", async (t) => {
  const fixture = makeFixture({ mutate(source, { sessionId }) {
    source.answers.find((item) => item.interactionId === `${sessionId}:i03`).correctText = "";
  } });
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const report = await audit(fixture);
  assert.equal(report.verdict, "PASS", JSON.stringify(report.findings));
});

test("malformed or duplicate speed-match pair authority fails closed", async (t) => {
  const malformed = makeFixture({ mutate(source, { sessionId }) {
    source.answers.find((item) => item.interactionId === `${sessionId}:i03`).correctText = "malformed";
  } });
  const duplicate = makeFixture({ mutate(source) {
    source.interactionsByLocale.ru[2].modePayload.pairGrid[1].pairId = source.interactionsByLocale.ru[2].modePayload.pairGrid[0].pairId;
  } });
  t.after(() => {
    fs.rmSync(malformed.root, { recursive: true, force: true });
    fs.rmSync(duplicate.root, { recursive: true, force: true });
  });
  const malformedReport = await audit(malformed);
  const duplicateReport = await audit(duplicate);
  assert.ok(malformedReport.findings.some((item) => item.code === "ambiguous_speed_match_authority"));
  assert.ok(duplicateReport.findings.some((item) => item.code === "duplicate_pair_id"));
});

test("corpus report is untruncated and has per-session counts for every finding", async (t) => {
  const first = makeFixture({ lesson: "l01", session: "s01", ruTargets: ["missing one", "sure", "I am here."] });
  const second = makeFixture({ lesson: "l04", session: "s18", ruTargets: ["ready", "missing two", "I am here."] });
  t.after(() => {
    fs.rmSync(first.root, { recursive: true, force: true });
    fs.rmSync(second.root, { recursive: true, force: true });
  });
  fs.cpSync(path.join(second.root, "l04"), path.join(first.root, "l04"), { recursive: true });
  const { auditFactoryIntroPractice } = await import(MODULE);
  const report = auditFactoryIntroPractice({ sessionsRoot: first.root, inventory: [...first.inventory, ...second.inventory] });
  assert.equal(report.perSession.length, 2);
  assert.ok(report.findings.some((item) => item.sessionIdentity === "en/l01/s01" && item.target === "missing one"));
  assert.ok(report.findings.some((item) => item.sessionIdentity === "en/l04/s18" && item.target === "missing two"));
  assert.equal(report.findingCount, report.findings.length);
  assert.ok(report.perSession.every((item) => Number.isInteger(item.findingCount)));
});
