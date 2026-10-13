import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { atomicMarkdownParityIssues, parseIntro, parsePractice } from "./build_release.mjs";
import { applyPracticeExplanationsV1, validatePracticeExplanationsV1 } from "./practice_explanations_v1.mjs";

const sessionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s02");
const atomic = () => JSON.parse(fs.readFileSync(path.join(sessionDir, "practice.atomic.json"), "utf8"));
const explanations = () => JSON.parse(fs.readFileSync(path.join(sessionDir, "practice.explanations.v1.json"), "utf8"));
const correctChoiceIds = ["i02", "i04", "i08", "i09", "i14:s02", "i17:s03"];
const extraTileIds = ["i10", "i11", "i13", "i15", "i17:s02", "i17:s04"];
const introCorrectFeedback = {
  ru: [
    "Верно: I am tired — «я устал»: am связывает I с состоянием tired, как требуется в ответе на How are you?",
    "Верно: I am late — «я опоздал»: late точно объясняет, что вы пришли позже назначенного времени, а после I нужен am.",
    "Верно: I am sorry — «мне жаль, извините»: полная фраза прямо извиняется за опоздание, и после I стоит am.",
  ],
  uk: [
    "Правильно: I am tired — «я втомився»: am поєднує I зі станом tired, як і потрібно у відповіді на How are you?",
    "Правильно: I am late — «я запізнився»: late точно пояснює, що ви прийшли пізніше за домовлений час, а після I потрібне am.",
    "Правильно: I am sorry — «мені шкода, вибачте»: повна фраза прямо перепрошує за запізнення, і після I стоїть am.",
  ],
};

test("L01/S02 gives each intro correct r1 prompt-specific localized feedback", () => {
  for (const locale of ["ru", "uk"]) {
    const markdown = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    const pages = parseIntro(markdown);
    assert.equal(pages.length, 3, `${locale}: expected three intro pages`);
    pages.forEach((page, index) => {
      assert.equal(page.options[0]?.correct, true, `${locale}:intro${index + 1}: r1 remains correct`);
      assert.equal(
        page.options[0]?.feedback,
        introCorrectFeedback[locale][index],
        `${locale}:intro${index + 1}: correct r1 needs its authored explanation`,
      );
    });
    assert.equal(new Set(introCorrectFeedback[locale]).size, 3, `${locale}: feedback is not mass-templated`);
  }
});

test("L01/S02 candidate source and atomic practice stay learner-visible-text equivalent", () => {
  const data = atomic();
  const tasksByLocale = Object.fromEntries(["ru", "uk"].map((locale) => [
    locale,
    parsePractice(fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8")),
  ]));
  assert.deepEqual(atomicMarkdownParityIssues({
    sessionIdentity: "en/l01/s02",
    sessionId: "en:lesson-01:session-02",
    atomicSource: data,
    tasksByLocale,
  }), []);
});

test("L01/S02 explains every learner-selectable answer", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) for (const suffix of correctChoiceIds) {
    const interactionId = `en:lesson-01:session-02:${suffix}`;
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === interactionId);
    const answer = data.answers.find((entry) => entry.interactionId === interactionId);
    const feedback = interaction?.modePayload?.choiceFeedback?.find((entry) => entry.responseId === answer?.correctResponseId);
    assert.equal(feedback?.correct, true, `${locale}:${suffix} needs correct-choice feedback`);
    assert.ok(feedback?.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} needs Russian feedback`);
    assert.ok(feedback?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs Ukrainian feedback`);
  }
});

test("L01/S02 explains every authored extra tile", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) for (const suffix of extraTileIds) {
    const interactionId = `en:lesson-01:session-02:${suffix}`;
    const feedback = data.interactionsByLocale[locale].find((entry) => entry.interactionId === interactionId)?.modePayload?.slotFeedback;
    assert.equal(feedback?.length, 1, `${locale}:${suffix} needs one extra-tile explanation`);
    assert.equal(feedback?.[0]?.responseId, `${interactionId}:tile:d1`, `${locale}:${suffix} must identify the physical extra tile`);
    assert.equal(feedback?.[0]?.correct, false, `${locale}:${suffix} extra tile must be marked wrong`);
    assert.ok(feedback?.[0]?.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} needs Russian tile feedback`);
    assert.ok(feedback?.[0]?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs Ukrainian tile feedback`);
  }
});

test("L01/S02 does not teach universal I/am, collapse tire to one sense, or invent facts about the learner", () => {
  const ru = fs.readFileSync(path.join(sessionDir, "final.ru.md"), "utf8");
  const uk = fs.readFileSync(path.join(sessionDir, "final.uk.md"), "utf8");
  assert.match(ru, /Когда `I` сообщает, кто находится в названном состоянии, нужна/u);
  assert.match(uk, /Коли `I` повідомляє, хто перебуває в названому стані, потрібна/u);
  for (const [source, forbidden] of [
    [ru, "После I всегда нужно am"],
    [uk, "Після I завжди потрібне am"],
    [ru, "Tire без -d означает «шина»"],
    [uk, "Tire без -d означає «шина»"],
    [ru, "«Я устал» — правда"],
    [uk, "«Я втомився» — правда"],
    [ru, "вы никуда не идёте"],
    [uk, "ви нікуди не йдете"],
    [ru, "Tired — два слога: TAI-ed"],
    [uk, "Tired — два склади: ТАЙ-ед"],
    [ru, "Busy — «би-зи»"],
    [uk, "Busy — «бі-зі»"],
  ]) assert.equal(source.includes(forbidden), false, `obsolete or unsupported claim remains: ${forbidden}`);
  assert.match(ru, /как существительное это «шина», а как глагол — «утомлять\(ся\)»/u);
  assert.match(uk, /як іменник це «шина», а як дієслово — «втомлювати\(ся\)»/u);
});

test("L01/S02 prompts state the requested communicative intent and use no production terminology", () => {
  const ru = fs.readFileSync(path.join(sessionDir, "final.ru.md"), "utf8");
  const uk = fs.readFileSync(path.join(sessionDir, "final.uk.md"), "utf8");
  assert.match(ru, /сообщить, что вы опоздали/u);
  assert.match(uk, /сказати, що ви запізнилися/u);
  assert.match(ru, /скажите, что заняты/u);
  assert.match(uk, /скажіть, що зайняті/u);
  assert.equal(ru.includes("целевое слово"), false);
  assert.equal(uk.includes("цільове слово"), false);
});

test("L01/S02 preserves the three deliberate vocabulary cards and keeps the locale batch current", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) for (const suffix of ["i01", "i03", "i05"]) {
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(`:${suffix}`));
    assert.equal(interaction?.family, "listen_choose", `${locale}:${suffix} keeps the vocabulary-card runtime family`);
    assert.equal(interaction?.modePayload?.isWordCard, true, `${locale}:${suffix} remains a non-graded vocabulary card`);
    assert.equal(interaction?.modePayload?.localizedMeaningChoices?.length, 1, `${locale}:${suffix} keeps one displayed vocabulary item`);
  }
  const ukrainian = fs.readFileSync(path.join(sessionDir, "final.uk.md"), "utf8");
  assert.equal(fs.readFileSync(path.join(sessionDir, "locales_batch.md"), "utf8"), `===LOCALE: uk===\n${ukrainian}`);
});

test("L01/S02 repair preserves the existing 21-step choreography and graded answer keys", () => {
  const data = atomic();
  const expectedPurposes = [
    ...Array(6).fill("supported_practice"),
    ...Array(5).fill("guided_practice"),
    ...Array(4).fill("retrieval_practice"),
    ...Array(6).fill("independent_check"),
  ];
  for (const locale of ["ru", "uk"]) {
    const interactions = data.interactionsByLocale[locale];
    assert.deepEqual(interactions.map((entry) => entry.ordinal), Array.from({ length: 21 }, (_, index) => index + 1));
    assert.deepEqual(interactions.map((entry) => entry.purpose), expectedPurposes);
    for (const suffix of ["i07", "i16"]) {
      const speed = interactions.find((entry) => entry.interactionId.endsWith(`:${suffix}`));
      assert.equal(Object.hasOwn(speed.modePayload, "localizedScene"), false, `${locale}:${suffix} must not acquire a new scene contract`);
    }
    for (const interaction of interactions.filter((entry) => ["phrase_builder", "listen_build_dictation"].includes(entry.family))) {
      assert.equal(Object.hasOwn(interaction.modePayload, "completionFeedbackByLocale"), false, `${locale}:${interaction.interactionId} keeps completion feedback in the sidecar`);
    }
  }
  for (const suffix of ["i07", "i16"]) {
    const answer = data.answers.find((entry) => entry.interactionId.endsWith(`:${suffix}`));
    assert.ok(answer?.correctText?.includes("=tired") || answer?.correctText?.includes("=here"), `${suffix} speed-match answer key must remain populated`);
  }
});

test("L01/S02 has a source-bound complete explanation sidecar for all three intros and all 21 tasks", () => {
  const source = atomic();
  const sidecar = explanations();
  assert.deepEqual(validatePracticeExplanationsV1({ sidecar, atomicSource: source, sessionDir }), []);
  assert.equal(sidecar.introResponses.length, 9);
  assert.equal(Object.keys(sidecar.interactions).length, 21);

  const projected = applyPracticeExplanationsV1({ atomicSource: source, sidecar });
  for (const locale of ["ru", "uk"]) {
    assert.equal(projected.interactionsByLocale[locale].length, 21);
    for (const interaction of projected.interactionsByLocale[locale]) {
      const payload = interaction.modePayload;
      for (const item of payload.choiceFeedback ?? []) {
        assert.ok(item.analysisV1?.units?.length, `${locale}:${interaction.interactionId}:${item.responseId} lacks per-word analysis`);
      }
      for (const item of payload.slotFeedback ?? []) {
        assert.ok(item.analysisV1?.units?.length, `${locale}:${interaction.interactionId}:${item.responseId} lacks extra-tile analysis`);
      }
      if (["phrase_builder", "listen_build_dictation", "scripted_repeat_compare"].includes(interaction.family)) {
        assert.ok(payload.explanationV1?.phrase?.units?.length, `${locale}:${interaction.interactionId} lacks phrase analysis`);
      }
      if (interaction.family === "speed_match") {
        assert.ok(payload.pairGrid.every((pair) => pair.analysisV1?.phrase?.units?.length), `${locale}:${interaction.interactionId} lacks pair analysis`);
      }
    }
  }
});

test("L01/S02 diagnostics name the exact temptation and keep grammar boundaries separate from meaning", () => {
  const sidecar = explanations();
  const responses = Object.values(sidecar.interactions).flatMap((entry) => entry.responses ?? []);
  for (const response of responses) {
    assert.equal(response.whyTemptingByLocale?.ru?.includes("близкий по написанию или знакомый вариант") ?? false, false, response.responseId);
    assert.equal(response.whyTemptingByLocale?.ru?.includes("содержит знакомое слово или фразу") ?? false, false, response.responseId);
    assert.equal(response.whyTemptingByLocale?.uk?.includes("близький за написанням або знайомий варіант") ?? false, false, response.responseId);
    assert.equal(response.whyTemptingByLocale?.uk?.includes("містить знайоме слово або фразу") ?? false, false, response.responseId);
    if (response.acceptabilityBoundaryByLocale?.uk?.includes("коли")) assert.match(response.acceptabilityBoundaryByLocale.uk, /доречн(?:е|а|ий), коли/u, response.responseId);
  }
  const isTile = sidecar.interactions["en:lesson-01:session-02:i11"].responses[0];
  assert.equal(isTile.acceptabilityBoundaryByLocale.ru, "is используется с he, she или it; с I в этой фразе нужна форма am.");
  assert.equal(isTile.acceptabilityBoundaryByLocale.uk, "is уживається з he, she або it; з I в цій фразі потрібна форма am.");
  assert.match(sidecar.interactions["en:lesson-01:session-02:i09"].responses.find((response) => !response.correct).whyTemptingByLocale.ru, /Все варианты начинаются с I am/u);
  assert.match(sidecar.interactions["en:lesson-01:session-02:i08"].responses.find((response) => response.responseId.endsWith(":r2")).whyTemptingByLocale.ru, /может описывать реальное состояние/u);
});

test("L01/S02 intro diagnostics describe each malformed literal form instead of licensing it", () => {
  const byText = new Map(explanations().introResponses.map((response) => [response.textByLocale.ru, response]));
  const expected = {
    "I tired.": {
      temptingRu: /в русском утверждении связка в настоящем времени не видна/iu,
      contrastRu: /I tired\. пропускает am; I am tired\. — полная форма/u,
      boundaryRu: /в значении «я устал \/ устала» I tired\. не подходит/iu,
      boundaryUk: /у значенні «я втомився \/ втомилася» I tired\. не підходить/iu,
    },
    "I am tire.": {
      temptingRu: /tire похоже на tired/u,
      contrastRu: /tire — существительное или глагол; tired — прилагательное/u,
      boundaryRu: /I am tire\. не выражает состояние «я устал \/ устала»/u,
      boundaryUk: /I am tire\. не виражає стану «я втомився \/ втомилася»/u,
    },
    "I late.": {
      temptingRu: /в русском утверждении связка в настоящем времени не видна/iu,
      contrastRu: /I late\. пропускает am; I am late\. — полная форма/u,
      boundaryRu: /I late\. — неправильная полная фраза/u,
      boundaryUk: /I late\. — неправильна повна фраза/u,
    },
    "I sorry.": {
      temptingRu: /слово sorry может звучать как самостоятельное извинение/iu,
      contrastRu: /Sorry\. может быть самостоятельным извинением; после I нужна форма I am sorry\./u,
      boundaryRu: /I sorry\. — неправильная полная фраза/u,
      boundaryUk: /I sorry\. — неправильна повна фраза/u,
    },
    "I am sorry am.": {
      temptingRu: /am уже знакомо как форма be с I/iu,
      contrastRu: /в I am sorry\. связка am стоит один раз/iu,
      boundaryRu: /I am sorry am\. — неправильная фраза с повтором am/u,
      boundaryUk: /I am sorry am\. — неправильна фраза з повтором am/u,
    },
  };
  for (const [text, checks] of Object.entries(expected)) {
    const response = byText.get(text);
    assert.ok(response, `missing intro diagnostic for ${text}`);
    assert.match(response.whyTemptingByLocale.ru, checks.temptingRu, `${text}: exact misconception`);
    assert.match(response.minimalContrastByLocale.ru, checks.contrastRu, `${text}: literal contrast`);
    assert.match(response.acceptabilityBoundaryByLocale.ru, checks.boundaryRu, `${text}: RU boundary`);
    assert.match(response.acceptabilityBoundaryByLocale.uk, checks.boundaryUk, `${text}: UK boundary`);
  }
});

test("L01/S02 analysis explains the displayed occurrence, including missing or repeated am", () => {
  const sidecar = explanations();
  const introByText = new Map(sidecar.introResponses.map((response) => [response.textByLocale.ru, response]));
  assert.match(introByText.get("I tired.").analysisByLocale.ru.units[1].functionByLocale.ru, /Без am/u);
  assert.match(introByText.get("I late.").analysisByLocale.ru.units[1].functionByLocale.ru, /Без am/u);
  assert.match(introByText.get("I sorry.").analysisByLocale.ru.units[1].functionByLocale.ru, /Без am/u);
  assert.match(introByText.get("I am sorry am.").analysisByLocale.ru.units[3].functionByLocale.ru, /ошибочно повторяет/u);
  assert.match(sidecar.interactions["en:lesson-01:session-02:i06"].phrase.units[0].functionByLocale.ru, /самостоятельн.*извинени/iu);

  const standaloneAnalyses = [];
  for (const entry of Object.values(sidecar.interactions)) {
    if (entry.phrase?.units?.length === 1) standaloneAnalyses.push(entry.phrase);
    for (const pair of entry.pairs ?? []) if (pair.analysisV1?.phrase?.units?.length === 1) standaloneAnalyses.push(pair.analysisV1.phrase);
    for (const response of entry.responses ?? []) {
      const analysis = response.analysisByLocale?.ru;
      if (analysis?.units?.length === 1) standaloneAnalyses.push(analysis);
    }
  }
  assert.ok(standaloneAnalyses.length > 0);
  for (const item of standaloneAnalyses) {
    assert.doesNotMatch(item.units[0].functionByLocale.ru, /^После I am/u, item.text);
    assert.doesNotMatch(item.units[0].functionByLocale.uk, /^Після I am/u, item.text);
  }
});

test("L01/S02 classifies complete listening alternatives as lexical mismatches", () => {
  const sidecar = explanations();
  for (const id of ["en:lesson-01:session-02:i09", "en:lesson-01:session-02:i17:s03"]) {
    const response = sidecar.interactions[id].responses.find((item) => item.textByLocale.ru === "I am tired.");
    assert.equal(response?.correct, false, `${id}: fixture remains a wrong listening option`);
    assert.equal(response?.errorType, "listening_lexical_confusion", `${id}: complete phrase is not malformed`);
  }
});
