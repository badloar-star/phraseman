import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { actorClarityFindings, sourceQualityFindings } from "./sync_mockup_source_quality_findings.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

test("owner findings name the visible task number for a one-tile pseudo action", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-quality-card-"));
  try {
    const session = path.join(root, "sessions", "en", "l01", "s01");
    fs.mkdirSync(session, { recursive: true });
    fs.writeFileSync(path.join(session, "final.ru.md"), [
      "## Практика", "", "**7 · Соберите слово**",
      "<!-- interaction_id: en:lesson-01:session-01:i01; family: phrase_builder -->",
    ].join("\n"));
    fs.writeFileSync(path.join(session, "practice.atomic.json"), JSON.stringify({
      interactionsByLocale: { ru: [{
        interactionId: "en:lesson-01:session-01:i01",
        family: "phrase_builder",
        modePayload: { targetPhrase: "apple", orderedTokens: ["apple"] },
      }] },
    }));

    assert.deepEqual(sourceQualityFindings({ root, sessionKeys: new Set(["en/l01/s01"]) }), {
      "en/l01/s01": [{
        interactionId: "en:lesson-01:session-01:i01",
        taskNumber: 7,
        reason: "нельзя собирать одно слово из одной плитки",
      }],
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("lesson 2 session 3 does not retain the repeated I am worried gap at task 13", () => {
  const courseRoot = path.resolve(here, "..");
  const findings = sourceQualityFindings({ root: courseRoot, sessionKeys: new Set(["en/l02/s03"]) });
  assert.ok(!findings["en/l02/s03"]?.some((finding) =>
    finding.interactionId === "en:lesson-02:session-03:i13" &&
    finding.reason.includes("i am worried")
  ));
});

test("lesson 2 session 21 does not retain the repeated Where are the shops gap at task 14", () => {
  const courseRoot = path.resolve(here, "..");
  const findings = sourceQualityFindings({ root: courseRoot, sessionKeys: new Set(["en/l02/s21"]) });
  assert.ok(!findings["en/l02/s21"]?.some((finding) =>
    finding.interactionId === "en:lesson-02:session-21:i14" &&
    finding.reason.includes("where are the shops")
  ));
});

test("lesson 2 session 35 does not retain the repeated Whose is it gap at task 9", () => {
  const courseRoot = path.resolve(here, "..");
  const findings = sourceQualityFindings({ root: courseRoot, sessionKeys: new Set(["en/l02/s35"]) });
  assert.ok(!findings["en/l02/s35"]?.some((finding) =>
    finding.interactionId === "en:lesson-02:session-35:i09" &&
    finding.reason.includes("whose is it")
  ));
});

test("lesson 2 session 37 does not retain the repeated Whose is it gap at task 14", () => {
  const courseRoot = path.resolve(here, "..");
  const findings = sourceQualityFindings({ root: courseRoot, sessionKeys: new Set(["en/l02/s37"]) });
  assert.ok(!findings["en/l02/s37"]?.some((finding) =>
    finding.interactionId === "en:lesson-02:session-37:i14" &&
    finding.reason.includes("whose is it")
  ));
});

test("owner findings expose a lost source target on its visible task", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-preservation-card-"));
  try {
    const session = path.join(root, "sessions", "en", "l03", "s37");
    fs.mkdirSync(session, { recursive: true });
    fs.writeFileSync(path.join(session, "final.ru.md"), [
      "## Практика", "", "**5 · Вставьте слово**",
      "<!-- interaction_id: en:lesson-03:session-37:i04; family: context_gap_grammar -->",
    ].join("\n"));
    fs.writeFileSync(path.join(session, "practice.atomic.json"), JSON.stringify({
      courseSessionId: "en:lesson-03:session-37",
      interactionsByLocale: { ru: [{
        interactionId: "en:lesson-03:session-37:i04",
        family: "context_gap_grammar",
        modePayload: { gappedTargetPhrase: "___", gapOptions: [{ responseId: "r1", text: "entrance" }] },
      }] },
      answers: [{ interactionId: "en:lesson-03:session-37:i04", correctText: "entrance" }],
    }));

    const preservationEvidence = {
      before: { sessions: [{ snapshot: { courseSessionId: "en:lesson-03:session-37", interactionsByLocale: { ru: [{
        interactionId: "en:lesson-03:session-37:i04",
        family: "context_gap_grammar",
        modePayload: { gappedTargetPhrase: "entrance" },
      }] } } }] },
      ledger: { rows: [{ courseSessionId: "en:lesson-03:session-37", oldInteractionId: "en:lesson-03:session-37:i04", newInteractionIds: ["en:lesson-03:session-37:i04"] }], amendments: [] },
    };
    assert.deepEqual(sourceQualityFindings({ root, sessionKeys: new Set(["en/l03/s37"]), preservationEvidence }), {
      "en/l03/s37": [{
        interactionId: "en:lesson-03:session-37:i04",
        taskNumber: 5,
        reason: "в задании исчезла исходная проверяемая часть «entrance»",
      }],
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a repaired session is removed from the early-phrase owner finding", () => {
  const courseRoot = path.resolve(here, "..");
  const findings = sourceQualityFindings({ root: courseRoot, sessionKeys: new Set(["en/l03/s37"]) });
  assert.ok(!findings["en/l03/s37"]?.some((finding) =>
    finding.reason === "фраза со словом «building» появилась раньше трёх разных знакомств",
  ));
  assert.ok((findings["en/l03/s37"] ?? []).every((finding) => Number.isInteger(finding.taskNumber)));
});

test("does not mark a repeat when the checker cannot identify any target", () => {
  const courseRoot = path.resolve(here, "..");
  assert.deepEqual(sourceQualityFindings({ root: courseRoot, sessionKeys: new Set(["en/l04/s01"]) }), {});
});

test("owner findings reject a scene that assigns speech to an inanimate place", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-nonhuman-speaker-"));
  try {
    const session = path.join(root, "sessions", "en", "l01", "s01");
    fs.mkdirSync(session, { recursive: true });
    fs.writeFileSync(path.join(session, "final.ru.md"), [
      "## Практика", "", "**7 · Выберите фразу**",
      "<!-- interaction_id: en:lesson-01:session-01:i01; family: context_gap_grammar -->",
    ].join("\n"));
    fs.writeFileSync(path.join(session, "practice.atomic.json"), JSON.stringify({
      interactionsByLocale: { ru: [{
        interactionId: "en:lesson-01:session-01:i01",
        family: "context_gap_grammar",
        prompt: "У кулера спрашивают, как вы.",
        modePayload: { localizedScene: { ru: "У кулера спрашивают, как вы." } },
      }], uk: [] },
      answers: [],
    }));

    assert.deepEqual(sourceQualityFindings({ root, sessionKeys: new Set(["en/l01/s01"]) }), {
      "en/l01/s01": [{
        interactionId: "en:lesson-01:session-01:i01",
        taskNumber: 7,
        reason: "в сцене действие приписано месту, а не названному человеку",
      }],
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("owner findings reject choice feedback left inside a phrase builder", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-wrong-family-payload-"));
  try {
    const session = path.join(root, "sessions", "en", "l01", "s01");
    fs.mkdirSync(session, { recursive: true });
    fs.writeFileSync(path.join(session, "final.ru.md"), [
      "## Практика", "", "**6 · Соберите фразу**",
      "<!-- interaction_id: en:lesson-01:session-01:i06; family: phrase_builder -->",
    ].join("\n"));
    fs.writeFileSync(path.join(session, "practice.atomic.json"), JSON.stringify({
      interactionsByLocale: { ru: [{
        interactionId: "en:lesson-01:session-01:i06",
        family: "phrase_builder",
        modePayload: {
          targetPhrase: "They are ready.",
          orderedTokens: ["They", "are", "ready"],
          authoredDistractorTokens: ["is"],
          choiceFeedback: [{ responseId: "en:lesson-01:session-01:i06:r1" }],
        },
      }], uk: [] },
      answers: [],
    }));

    assert.deepEqual(sourceQualityFindings({ root, sessionKeys: new Set(["en/l01/s01"]) }), {
      "en/l01/s01": [{
        interactionId: "en:lesson-01:session-01:i06",
        taskNumber: 6,
        reason: "у задания остались поля от другого способа работы; пояснения могут относиться не к тем вариантам",
      }],
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("owner card turns yellow when Markdown no longer matches the checked task source", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-projection-card-"));
  try {
    const session = path.join(root, "sessions", "en", "l01", "s01");
    fs.mkdirSync(session, { recursive: true });
    for (const locale of ["ru", "uk"]) {
      fs.writeFileSync(path.join(session, `final.${locale}.md`), [
        "## Практика", "", "**1 · Выберите фразу**",
        "<!-- interaction_id: en:lesson-01:session-01:i01; family: context_gap_grammar -->",
        "", "modes: 1=context_gap_grammar",
      ].join("\n"));
    }
    fs.writeFileSync(path.join(session, "practice.atomic.json"), JSON.stringify({
      schemaVersion: "learning_v2_atomic_practice_source_v1",
      courseSessionId: "en:lesson-01:session-01",
      interactionsByLocale: { ru: [], uk: [] },
      answers: [],
    }));

    const findings = sourceQualityFindings({ root, sessionKeys: new Set(["en/l01/s01"]) });
    assert.deepEqual(findings, {
      "en/l01/s01": [{
        interactionId: "source_projection:0",
        taskNumber: 1,
        reason: "исходный текст задания не совпадает с проверенным вариантом",
      }],
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("actor-clarity evidence marks an unnamed questioner on the matching visible task", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-actor-card-"));
  try {
    const session = path.join(root, "sessions", "en", "l01", "s20");
    fs.mkdirSync(session, { recursive: true });
    fs.mkdirSync(path.join(root, "pipeline"), { recursive: true });
    fs.writeFileSync(path.join(root, "pipeline", "audit_actor_clarity.mjs"), "// fixture");
    fs.writeFileSync(path.join(session, "final.ru.md"), [
      "## Практика", "", "**4 · Выберите фразу**", "**У кулера спрашивают, что сказать.**",
    ].join("\n"));
    const auditLine = JSON.stringify({
      file: "sessions/en/l01/s20/final.ru.md", line: 4, rule: "ru_unnamed_questioner",
    });
    assert.deepEqual(actorClarityFindings({
      root,
      sessionKeys: new Set(["en/l01/s20"]),
      run: () => ({ status: 1, stdout: `[ACTOR-CLARITY][HOLD]\n${auditLine}\n` }),
    }), {
      "en/l01/s20": [{
        interactionId: "actor_clarity:ru_unnamed_questioner:4",
        taskNumber: 4,
        reason: "не назван человек, который говорит, спрашивает или является предметом фразы",
      }],
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("lesson 1 session 1 alternates learner actions instead of batching one mechanic", () => {
  const courseRoot = path.resolve(here, "..");
  const findings = sourceQualityFindings({ root: courseRoot, sessionKeys: new Set(["en/l01/s01"]) });
  assert.ok(!findings["en/l01/s01"]?.some((finding) =>
    finding.reason === "два соседних задания используют один и тот же способ работы",
  ));
});

test("lesson 1 session 2 does not retain the consecutive-gap finding after task 9 changes mechanic", () => {
  const courseRoot = path.resolve(here, "..");
  const findings = sourceQualityFindings({ root: courseRoot, sessionKeys: new Set(["en/l01/s02"]) });
  assert.ok(!findings["en/l01/s02"]?.some((finding) =>
    finding.interactionId === "en:lesson-01:session-02:i09"
      && finding.reason === "два соседних задания используют один и тот же способ работы",
  ));
});

test("lesson 1 session 2 does not retain the repeated I am gap at task 12", () => {
  const courseRoot = path.resolve(here, "..");
  const findings = sourceQualityFindings({ root: courseRoot, sessionKeys: new Set(["en/l01/s02"]) });
  assert.ok(!findings["en/l01/s02"]?.some((finding) =>
    finding.interactionId === "en:lesson-01:session-02:i12"
      && finding.reason === "слово «i am ___» повторяется тем же способом вместо новой тренировки",
  ));
});

test("lesson 1 session 2 does not retain the consecutive spoken-repeat finding at task 15", () => {
  const courseRoot = path.resolve(here, "..");
  const findings = sourceQualityFindings({ root: courseRoot, sessionKeys: new Set(["en/l01/s02"]) });
  assert.ok(!findings["en/l01/s02"]?.some((finding) =>
    finding.interactionId === "en:lesson-01:session-02:i14:s02"
      && finding.reason === "два соседних задания используют один и тот же способ работы",
  ));
});

test("lesson 1 session 2 does not retain the spoken-repeat run at tasks 19 through 21", () => {
  const courseRoot = path.resolve(here, "..");
  const findings = sourceQualityFindings({ root: courseRoot, sessionKeys: new Set(["en/l01/s02"]) });
  for (const interactionId of ["en:lesson-01:session-02:i17:s02", "en:lesson-01:session-02:i17:s03", "en:lesson-01:session-02:i17:s04"]) {
    assert.ok(!findings["en/l01/s02"]?.some((finding) =>
      finding.interactionId === interactionId
        && finding.reason === "два соседних задания используют один и тот же способ работы",
    ));
  }
});

test("lesson 1 session 20 does not repeat the He is target with the same learner action", () => {
  const courseRoot = path.resolve(here, "..");
  const findings = sourceQualityFindings({ root: courseRoot, sessionKeys: new Set(["en/l01/s20"]) });
  assert.ok(!findings["en/l01/s20"]?.some((finding) =>
    finding.interactionId === "en:lesson-01:session-20:i15"
      && finding.reason === "слово «he is ___» повторяется тем же способом вместо новой тренировки",
  ));
});

test("lesson 1 session 3 alternates practice instead of batching cards, gaps, builders, and repeats", () => {
  const courseRoot = path.resolve(here, "..");
  const findings = sourceQualityFindings({ root: courseRoot, sessionKeys: new Set(["en/l01/s03"]) });
  assert.ok(!findings["en/l01/s03"]?.some((finding) =>
    finding.reason === "два соседних задания используют один и тот же способ работы",
  ));
});

test("word-first findings start at lesson 3 session 25, not before", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-word-first-scope-"));
  try {
    for (const sessionId of ["s17", "s25"]) {
      const session = path.join(root, "sessions", "en", "l03", sessionId);
      fs.mkdirSync(session, { recursive: true });
      const runtime = `en:lesson-03:session-${sessionId.slice(1)}`;
      fs.writeFileSync(path.join(session, "final.ru.md"), [
        "# Английский · Урок 3", "", "**Новые слова:** apple", "", "## Практика", "",
        "**1 · Познакомьтесь со словом**", `<!-- interaction_id: ${runtime}:i01; family: listen_choose -->`, "",
        "**2 · Соберите фразу**", `<!-- interaction_id: ${runtime}:i02; family: phrase_builder -->`,
      ].join("\n"));
      const interactions = [{
        interactionId: `${runtime}:i01`, family: "listen_choose",
        modePayload: { isWordCard: true, referenceAudio: { transcript: "apple" } },
      }, {
        interactionId: `${runtime}:i02`, family: "phrase_builder",
        modePayload: { targetPhrase: "It is an apple.", orderedTokens: ["It", "is", "an", "apple"] },
      }];
      fs.writeFileSync(path.join(session, "practice.atomic.json"), JSON.stringify({
        interactionsByLocale: { ru: interactions, uk: interactions },
        answers: interactions.map((interaction) => ({
          interactionId: interaction.interactionId,
          correctText: interaction.modePayload.targetPhrase ?? interaction.modePayload.referenceAudio.transcript,
        })),
      }));
    }
    const findings = sourceQualityFindings({ root, sessionKeys: new Set(["en/l03/s17", "en/l03/s25"]) });
    assert.ok(!findings["en/l03/s17"]?.some((finding) =>
      finding.reason.includes("раньше трёх разных знакомств"),
    ));
    assert.ok(findings["en/l03/s25"]?.some((finding) =>
      finding.reason.includes("раньше трёх разных знакомств"),
    ));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("owner findings expose a repeated learning action on its visible task", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-repeat-card-"));
  try {
    const session = path.join(root, "sessions", "en", "l01", "s01");
    fs.mkdirSync(session, { recursive: true });
    fs.writeFileSync(path.join(session, "final.ru.md"), [
      "## Практика", "", "**1 · Послушайте слово**",
      "<!-- interaction_id: en:lesson-01:session-01:i01; family: listen_choose -->",
      "", "**2 · Послушайте слово ещё раз**",
      "<!-- interaction_id: en:lesson-01:session-01:i02; family: listen_choose -->",
    ].join("\n"));
    const interactions = [
      { interactionId: "en:lesson-01:session-01:i01", family: "listen_choose", modePayload: { referenceAudio: { transcript: "lamp" } } },
      { interactionId: "en:lesson-01:session-01:i02", family: "listen_choose", modePayload: { referenceAudio: { transcript: "lamp" } } },
    ];
    fs.writeFileSync(path.join(session, "practice.atomic.json"), JSON.stringify({
      interactionsByLocale: { ru: interactions, uk: interactions },
      answers: [
        { interactionId: "en:lesson-01:session-01:i01", correctText: "lamp" },
        { interactionId: "en:lesson-01:session-01:i02", correctText: "lamp" },
      ],
    }));

    assert.deepEqual(sourceQualityFindings({ root, sessionKeys: new Set(["en/l01/s01"]) }), {
      "en/l01/s01": [{
        interactionId: "en:lesson-01:session-01:i02",
        taskNumber: 2,
        reason: "два соседних задания используют один и тот же способ работы",
      }, {
        interactionId: "en:lesson-01:session-01:i02",
        taskNumber: 2,
        reason: "слово «lamp» повторяется тем же способом вместо новой тренировки",
      }],
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
