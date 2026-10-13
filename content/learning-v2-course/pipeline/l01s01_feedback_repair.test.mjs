import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import { parseIntro } from "./build_release.mjs";

const sessionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s01");
const atomic = () => JSON.parse(fs.readFileSync(path.join(sessionDir, "practice.atomic.json"), "utf8"));
const explanations = () => JSON.parse(fs.readFileSync(path.join(sessionDir, "practice.explanations.v1.json"), "utf8"));
const authoritativeInteractionIds = (locale) => Array.from(
  fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8")
    .matchAll(/<!-- interaction_id:\s*([^;\s]+);/gu),
  (match) => match[1],
);
const missingCorrectFeedback = ["i02", "i04", "i06", "i07:a01", "i13"];

test("L01/S01 explains fine precisely and uses one sentence-ending mark", () => {
  const byId = explanations().interactions;
  for (const interactionId of ["en:lesson-01:session-01:i10", "en:lesson-01:session-01:i17:s03"]) {
    assert.deepEqual(byId[interactionId].completionFeedbackByLocale, {
      ru: "Верно: I am fine. — «У меня всё хорошо».",
      uk: "Правильно: I am fine. — «У мене все добре».",
    });
    assert.deepEqual(byId[interactionId].phrase.explanationByLocale, {
      ru: "I называет говорящего, am связывает его со словом о состоянии, а fine означает, что у говорящего всё хорошо.",
      uk: "I називає мовця, am пов'язує його зі словом про стан, а fine означає, що в мовця все добре.",
    });
  }
});

test("L01/S01 i17:s03 ready tile explains the real competing phrase without inventing a scene", () => {
  const ready = explanations().interactions["en:lesson-01:session-01:i17:s03"].responses
    .find((entry) => entry.responseId.endsWith(":tile:d1"));
  assert.deepEqual(ready.whyTemptingByLocale, {
    ru: "`ready` образует правильную фразу `I am ready`, поэтому плитка выглядит правдоподобно. Но в задании нужно ответить на вопрос «как дела?», поэтому здесь выбирается `fine`.",
    uk: "`ready` утворює правильну фразу `I am ready`, тому плитка виглядає правдоподібно. Але в завданні треба відповісти на запитання «як справи?», тому тут обирається `fine`.",
  });
  assert.doesNotMatch(JSON.stringify(ready), /встреч|зустріч/u);
});

test("L01/S01 Ukrainian token analysis keeps Ukrainian lemmas", () => {
  const sidecar = JSON.parse(fs.readFileSync(path.join(sessionDir, "practice.explanations.v1.json"), "utf8"));
  const units = JSON.stringify(sidecar);
  assert.doesNotMatch(units, /"text":"все"[^}]*"lemma":"всё"/u);
  assert.match(units, /"text":"все"[^}]*"lemma":"все"/u);
});

test("L01/S01 gives every visible intro answer its own localized explanation", () => {
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    const pages = parseIntro(source);
    assert.equal(pages.length, 3, `${locale}: exactly three intro pages`);
    for (const [pageIndex, page] of pages.entries()) {
      assert.equal(page.options.length, 3, `${locale}:intro${pageIndex + 1} has three visible answers`);
      assert.equal(page.options.filter((option) => option.correct).length, 1, `${locale}:intro${pageIndex + 1} has exactly one correct answer`);
      for (const [optionIndex, option] of page.options.entries()) {
        assert.ok(option.feedback.trim(), `${locale}:intro${pageIndex + 1}:r${optionIndex + 1} needs authored feedback`);
        assert.match(option.feedback, /`[^`]+`/u, `${locale}:intro${pageIndex + 1}:r${optionIndex + 1} explains marked-up English`);
      }
    }
  }
});

test("L01/S01 explains every correct response that a learner can select", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    for (const suffix of missingCorrectFeedback) {
      const interactionId = `en:lesson-01:session-01:${suffix}`;
      const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === interactionId);
      const answer = data.answers.find((entry) => entry.interactionId === interactionId);
      const feedback = interaction?.modePayload?.choiceFeedback?.find((entry) => entry.responseId === answer?.correctResponseId);
      assert.equal(feedback?.correct, true, `${locale}:${suffix} needs feedback for the correct choice`);
      assert.ok(feedback?.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} needs Russian correct-choice feedback`);
      assert.ok(feedback?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs Ukrainian correct-choice feedback`);
    }
  }
});

test("L01/S01 explains every authored extra tile", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    for (const suffix of ["i09", "i10", "i11", "i12", "i15", "i16"]) {
      const interactionId = `en:lesson-01:session-01:${suffix}`;
      const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === interactionId);
      const feedback = interaction?.modePayload?.slotFeedback;
      const distractors = interaction?.modePayload?.authoredDistractorTokens ?? [];
      assert.equal(feedback?.length, distractors.length, `${locale}:${suffix} needs one explanation per authored extra tile`);
      for (const [index, item] of feedback.entries()) {
        assert.equal(item?.correct, false, `${locale}:${suffix} extra tile ${index + 1} must be marked wrong`);
        assert.equal(item?.responseId, `${interactionId}:tile:d${index + 1}`, `${locale}:${suffix} feedback must identify the physical extra tile`);
        assert.ok(item?.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} tile ${index + 1} needs Russian feedback`);
        assert.ok(item?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} tile ${index + 1} needs Ukrainian feedback`);
      }
    }
  }
});

test("L01/S01 avoids false universal claims and unsupported sound descriptions", () => {
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    for (const forbidden of [
      "Дальше подставляйте что хотите",
      "Далі підставляйте що завгодно",
      "оно всегда в конце такой фразы",
      "воно завжди в кінці такої фрази",
      "на слог длиннее",
      "на склад довше",
      "мягкое «н»",
      "м'яке «н»",
      "два звука /p/",
    ]) assert.equal(source.includes(forbidden), false, `${locale} retains unsupported claim: ${forbidden}`);
  }
});

test("L01/S01 atomic feedback does not preserve the replaced sound claims", () => {
  const data = atomic();
  const serialized = JSON.stringify(data.interactionsByLocale);
  for (const obsolete of ["here тянется", "на слог длиннее", "мягкое «н»", "два звука /p/"]) {
    assert.equal(serialized.includes(obsolete), false, `atomic learner data preserves obsolete claim: ${obsolete}`);
  }
});

test("L01/S01 uses contextual gaps for the repaired here and happy checks", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const interactions = data.interactionsByLocale[locale];
    assert.deepEqual(
      interactions.map((interaction) => interaction.interactionId),
      authoritativeInteractionIds(locale),
      `${locale} atomic inventory must exactly match the current reviewed source`,
    );
    for (const [suffix, choices, correctText, sceneNeedle] of [
      ["i02", ["here", "ready", "fine"], "here", locale === "ru" ? "добрались ли вы до офиса" : "дісталися офісу"],
      ["i07:a01", ["happy", "fine", "ready"], "happy", locale === "ru" ? "хорошую новость" : "хорошу новину"],
    ]) {
      const interaction = interactions.find((entry) => entry.interactionId.endsWith(`:${suffix}`));
      assert.equal(interaction?.family, "context_gap_grammar", `${locale}:${suffix} must be a context gap`);
      assert.deepEqual(interaction?.audioTargetIds, [], `${locale}:${suffix} must not retain audio target IDs`);
      assert.equal(Object.hasOwn(interaction?.modePayload ?? {}, "referenceAudio"), false, `${locale}:${suffix} must not retain reference audio`);
      assert.equal(interaction?.modePayload?.gappedTargetPhrase, "I am ___.");
      assert.deepEqual(interaction?.responseOptions?.map((option) => option.text), choices);
      assert.equal(data.answers.find((answer) => answer.interactionId === interaction?.interactionId)?.correctText, correctText);
      assert.match(interaction?.modePayload?.localizedScene?.[locale] ?? "", new RegExp(sceneNeedle, "u"));
    }
  }
});

test("L01/S01 preserves historical IDs when adding the happy listening check", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const interactions = data.interactionsByLocale[locale];
    assert.deepEqual(interactions.slice(6, 10).map((entry) => entry.interactionId), [
      "en:lesson-01:session-01:i07",
      "en:lesson-01:session-01:i07:a01",
      "en:lesson-01:session-01:i08",
      "en:lesson-01:session-01:i09",
    ]);
  }
});

test("L01/S01 answer ledger matches the i14 reference and i16 hidden targets", () => {
  const data = atomic();
  for (const [suffix, targetField, expected] of [
    ["i14", "targetPhrase", "I am here."],
    ["i16", "hiddenTargetPhrase", "I am happy."],
  ]) {
    const interactionId = `en:lesson-01:session-01:${suffix}`;
    const answer = data.answers.find((entry) => entry.interactionId === interactionId);
    assert.equal(answer?.correctText, expected, `${suffix} ledger answer must match its target`);
    assert.equal(answer?.correctResponseId, null, `${suffix} must not invent a choice response ID`);
    for (const locale of ["ru", "uk"]) {
      const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === interactionId);
      assert.equal(interaction?.modePayload?.[targetField], expected, `${locale}:${suffix} target must retain the canonical text`);
      assert.equal(interaction?.modePayload?.referenceAudio?.transcript, expected, `${locale}:${suffix} reference transcript must retain the canonical text`);
    }
  }
});

test("L01/S01 i16 asks learners to build Mira's own neutral words", () => {
  const data = atomic();
  for (const [locale, expected] of [
    ["ru", "Послушайте реплику Миры и соберите её"],
    ["uk", "Послухайте репліку Міри та складіть її"],
  ]) {
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === "en:lesson-01:session-01:i16");
    assert.equal(interaction?.prompt, expected);
    assert.equal(interaction?.accessibilityLabel, expected);
    assert.equal(interaction?.prompt.includes("рада"), false, `${locale}:i16 prompt must not disclose the answer`);
    const finalSource = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    assert.match(finalSource, new RegExp(expected, "u"));
  }
});

test("L01/S01 applies the confirmed reader and locale repair packet without removing linguistic analysis", () => {
  const data = atomic();
  const sidecar = explanations();
  const expectedI06 = {
    "i06:r2": {
      ru: "Here означает «здесь»: это о месте, а не о самочувствии. В этой ситуации нужно сказать: I am fine.",
      uk: "Here означає «тут»: це про місце, а не про самопочуття. У цій ситуації потрібно сказати: I am fine.",
    },
    "i06:r3": {
      ru: "Ready означает «готов / готова»: это о готовности, а не о самочувствии. В этой ситуации нужно сказать: I am fine.",
      uk: "Ready означає «готовий / готова»: це про готовність, а не про самопочуття. У цій ситуації потрібно сказати: I am fine.",
    },
  };
  for (const locale of ["ru", "uk"]) {
    const rows = data.interactionsByLocale[locale];
    const i06 = rows.find((entry) => entry.interactionId.endsWith(":i06"));
    for (const [suffix, feedbackByLocale] of Object.entries(expectedI06)) {
      assert.deepEqual(i06.modePayload.choiceFeedback.find((entry) => entry.responseId.endsWith(`:${suffix.split(":")[1]}`)).feedbackByLocale, feedbackByLocale);
      assert.deepEqual(sidecar.interactions["en:lesson-01:session-01:i06"].responses.find((entry) => entry.responseId.endsWith(`:${suffix.split(":")[1]}`)).whyWrongHereByLocale, feedbackByLocale);
    }
    const i17 = rows.find((entry) => entry.interactionId.endsWith(":i17:s03"));
    assert.equal(i17.modePayload.localizedMeaning.uk, "На запитання про самопочуття: «У мене все добре».");
  }

  assert.deepEqual(sidecar.interactions["en:lesson-01:session-01:i13"].responses.find((entry) => entry.responseId.endsWith(":r2")).whyTemptingByLocale, {
    ru: "Фраза «Я готов / готова» уже знакома, поэтому её можно выбрать, не различив услышанное here.",
    uk: "Фраза «Я готовий / готова» вже знайома, тому її можна обрати, не розрізнивши почуте here.",
  });
  assert.deepEqual(sidecar.interactions["en:lesson-01:session-01:i17:s03"].responses.find((entry) => entry.responseId.endsWith(":tile:d2")).whyTemptingByLocale, {
    ru: "here образует знакомую правильную фразу и может показаться подходящим вариантом, если не различить тему реплики.",
    uk: "here утворює знайому правильну фразу й може здатися доречним варіантом, якщо не розрізнити тему репліки.",
  });

  const i16 = sidecar.interactions["en:lesson-01:session-01:i16"];
  const fine = i16.responses.find((entry) => entry.responseId.endsWith(":tile:d1"));
  assert.deepEqual(fine.whyWrongHereByLocale, {
    ru: "happy означает «рад / рада» и говорит о радости; fine изменило бы смысл на «у меня всё хорошо».",
    uk: "happy означає «радий / рада» й говорить про радість; fine змінило б зміст на «у мене все добре».",
  });
  assert.deepEqual(fine.minimalContrastByLocale, {
    ru: "I am fine — со мной всё хорошо; I am happy — я чувствую радость.",
    uk: "I am fine — зі мною все добре; I am happy — я відчуваю радість.",
  });
  assert.deepEqual(fine.acceptabilityBoundaryByLocale, {
    ru: "fine уместно как нейтральный ответ о делах; happy прямо сообщает, что Мира рада, поэтому в услышанной реплике нужен happy.",
    uk: "fine доречне як нейтральна відповідь про справи; happy прямо повідомляє, що Міра рада, тому в почутій репліці потрібне happy.",
  });
  assert.doesNotMatch(JSON.stringify(i16), /хорошей новости|хорошій новині|первого дня|першого дня/u);

  for (const interactionId of ["i06", "i13", "i16", "i17:s03"]) {
    const interaction = sidecar.interactions[`en:lesson-01:session-01:${interactionId}`];
    const units = [];
    const collectUnits = (value) => {
      if (Array.isArray(value)) return value.forEach(collectUnits);
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value.units)) units.push(...value.units);
      Object.values(value).forEach(collectUnits);
    };
    collectUnits(interaction);
    assert.ok(units.length > 0, `${interactionId} keeps typed units`);
    for (const unit of units) {
      assert.ok(unit.partOfSpeech, `${interactionId}:${unit.text} keeps part of speech`);
      assert.ok(unit.functionByLocale.ru && unit.functionByLocale.uk, `${interactionId}:${unit.text} keeps RU/UK functions`);
    }
  }
});

test("L01/S01 i13 keeps the listening prompt neutral while feedback explains the meaning", () => {
  const data = atomic();
  const expected = {
    ru: "Послушайте реплику и выберите её смысл",
    uk: "Послухайте репліку та виберіть її зміст",
  };
  for (const locale of ["ru", "uk"]) {
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === "en:lesson-01:session-01:i13");
    assert.equal(interaction?.prompt, expected[locale]);
    assert.equal(interaction?.accessibilityLabel, expected[locale]);
    assert.equal(interaction?.family, "listen_choose");
    assert.equal(interaction?.modePayload?.referenceAudio?.transcript, "I am here.");
    assert.equal(interaction?.responseOptions?.[0]?.text, locale === "ru" ? "Я здесь." : "Я тут.");
    assert.ok(interaction?.modePayload?.choiceFeedback?.every((choice) => choice.feedbackByLocale?.ru && choice.feedbackByLocale?.uk));
    assert.ok(interaction?.modePayload?.choiceFeedback?.every((choice) => choice.testedDimension === expected[locale]));
    assert.equal(data.answers.find((entry) => entry.interactionId === interaction?.interactionId)?.correctText, "Я здесь.");
    const finalSource = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    assert.match(finalSource, new RegExp(expected[locale], "u"));
  }
});

test("L01/S01 i13 feedback stays speaker-neutral and the four later listening scenes avoid invented claims", () => {
  const data = atomic();
  const sidecar = explanations();
  const expectedCorrect = {
    ru: "Верно: `I am here` означает «я здесь»: here сообщает о месте.",
    uk: "Правильно: `I am here` означає «я тут»: here повідомляє про місце.",
  };
  const expectedReadyBoundary = {
    ru: "`I am ready` означает «я готов / готова»; в записи звучит here, поэтому реплика сообщает о месте.",
    uk: "`I am ready` означає «я готовий / готова»; у записі звучить here, тому репліка повідомляє про місце.",
  };
  const i13Sidecar = sidecar.interactions["en:lesson-01:session-01:i13"];
  const correct = i13Sidecar.responses.find((entry) => entry.responseId.endsWith(":r1"));
  const ready = i13Sidecar.responses.find((entry) => entry.responseId.endsWith(":r2"));
  for (const analysis of Object.values(correct.analysisByLocale)) {
    assert.deepEqual(analysis.explanationByLocale, expectedCorrect);
  }
  assert.deepEqual(ready.acceptabilityBoundaryByLocale, expectedReadyBoundary);

  const unsupportedCurrentSceneClaims = (value) => {
    const text = JSON.stringify(value);
    return [
      /Мир[ае].{0,60}у входа/iu,
      /Мір[іи].{0,60}біля входу/iu,
      /первого рабочего дня|першого робочого дня/iu,
      /хорошей новости|хорошої новини/iu,
    ].filter((pattern) => pattern.test(text));
  };
  assert.equal(unsupportedCurrentSceneClaims("Так вы отвечаете Мире у входа.").length, 1, "known old clause must be detected");

  for (const locale of ["ru", "uk"]) {
    const byId = new Map(data.interactionsByLocale[locale].map((entry) => [entry.interactionId, entry]));
    for (const suffix of ["i12", "i13", "i16", "i17:s03"]) {
      const interaction = byId.get(`en:lesson-01:session-01:${suffix}`);
      const currentSceneFields = {
        prompt: interaction.prompt,
        accessibilityLabel: interaction.accessibilityLabel,
        localizedScene: interaction.modePayload.localizedScene,
        localizedMeaning: interaction.modePayload.localizedMeaning,
        choiceFeedback: interaction.modePayload.choiceFeedback,
        slotFeedback: interaction.modePayload.slotFeedback,
      };
      assert.deepEqual(unsupportedCurrentSceneClaims(currentSceneFields), [], `${locale}:${suffix} invents an unsupported current-scene claim`);
    }
    const i13 = byId.get("en:lesson-01:session-01:i13");
    assert.deepEqual(i13.modePayload.choiceFeedback.find((entry) => entry.correct).feedbackByLocale, expectedCorrect);
  }
});

test("L01/S01 final fine check uses listening and construction with tile feedback", () => {
  const data = atomic();
  const interactionId = "en:lesson-01:session-01:i17:s03";
  for (const locale of ["ru", "uk"]) {
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === interactionId);
    assert.equal(interaction?.family, "listen_build_dictation");
    assert.equal(interaction?.inputMode, "ordered_tokens");
    assert.equal(interaction?.modePayload?.referenceAudio?.transcript, "I am fine.");
    assert.equal(interaction?.modePayload?.hiddenTargetPhrase, "I am fine.");
    assert.deepEqual(interaction?.modePayload?.orderedTokens, ["I", "am", "fine"]);
    assert.deepEqual(interaction?.modePayload?.authoredDistractorTokens, ["ready", "here"]);
    assert.equal(interaction?.modePayload?.slotFeedback?.length, 2);
    assert.ok(interaction?.modePayload?.slotFeedback?.every((feedback) => feedback.feedbackByLocale?.ru && feedback.feedbackByLocale?.uk));
  }
  assert.deepEqual(data.answers.find((answer) => answer.interactionId === interactionId), {
    interactionId,
    correctText: "I am fine.",
    correctResponseId: null,
  });
});

test("L01/S01 grounds new words, and replaces unverifiable audio and duplicate happy retrieval", () => {
  const data = atomic();
  const i04 = "en:lesson-01:session-01:i04";
  const i17s01 = "en:lesson-01:session-01:i17:s01";
  const expected = {
    ru: {
      i04: "Вставьте слово — Антон спрашивает, готовы ли вы начать; скажите, что готовы",
      i17s01: "Соедините фразы с подходящими ситуациями",
      ready: "«готов / готова». Шнурки завязаны, куртка надета, можно выходить.",
    },
    uk: {
      i04: "Вставте слово — Антон питає, чи ви готові почати; скажіть, що готові",
      i17s01: "З'єднайте фрази з відповідними ситуаціями",
      ready: "«готовий / готова». Шнурки зав'язані, куртка вже на вас, можна виходити.",
    },
  };
  for (const locale of ["ru", "uk"]) {
    const byId = new Map(data.interactionsByLocale[locale].map((interaction) => [interaction.interactionId, interaction]));
    const readyCard = byId.get("en:lesson-01:session-01:i03");
    assert.equal(readyCard?.modePayload?.wordCard?.definitionByLocale?.[locale], expected[locale].ready);
    const contrast = byId.get(i04);
    assert.equal(contrast?.family, "context_gap_grammar");
    assert.equal(contrast?.prompt, expected[locale].i04);
    assert.deepEqual(contrast?.audioTargetIds, []);
    assert.equal(Object.hasOwn(contrast?.modePayload ?? {}, "referenceAudio"), false);
    assert.deepEqual(contrast?.responseOptions?.map((option) => option.text), ["ready", "fine", "happy"]);
    assert.equal(byId.get(i17s01)?.family, "speed_match");
    assert.equal(byId.get(i17s01)?.prompt, expected[locale].i17s01);
    assert.equal(byId.get(i17s01)?.modePayload?.pairGrid?.length, 4);
    assert.deepEqual(byId.get(i17s01)?.modePayload?.pairGrid?.map((pair) => pair.target), ["I am here.", "I am ready.", "I am fine.", "I am happy."]);
    assert.match(data.answers.find((answer) => answer.interactionId === i17s01)?.correctText ?? "", /p1=I am here\./u);

    const source = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    const hereDefinition = locale === "ru" ? "`here` — «здесь, тут»" : "`here` — «тут»";
    const happyDefinition = locale === "ru" ? "`happy` — «рад" : "`happy` — «рад";
    assert.ok(source.indexOf(hereDefinition) < source.indexOf("## Практика"), `${locale}: here must be defined before practice begins`);
    assert.ok(source.indexOf(happyDefinition) < source.indexOf("`I happy`"), `${locale}: happy must be defined before its first English example`);
    assert.doesNotMatch(source, /another short syllable|ще один короткий склад|ещё один короткий слог/u);
  }
});

test("L01/S01 i16 authored distractor feedback explains order and meaning without claiming audio proof", () => {
  const data = atomic();
  const expected = {
    ru: "happy означает «рад / рада» и говорит о радости; fine изменило бы смысл на «у меня всё хорошо».",
    uk: "happy означає «радий / рада» й говорить про радість; fine змінило б зміст на «у мене все добре».",
  };
  for (const locale of ["ru", "uk"]) {
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === "en:lesson-01:session-01:i16");
    assert.deepEqual(interaction?.modePayload?.slotFeedback?.[0]?.feedbackByLocale, expected);
  }
});

test("L01/S01 keeps the preserved speed match while repairing the remaining meaning checks and scenes", () => {
  const data = atomic();
  const snapshot = "656c688a59344bd0c9d11f89fe4f8bec05ccd83eadff4b7a6c9d342769369d14";
  assert.equal(data.sourceSnapshotSha256, snapshot, "the source snapshot is preservation evidence");

  const expected = {
    ru: {
      i13: "Послушайте реплику и выберите её смысл",
      i15: "Соберите фразу — Мира говорит, что ваше рабочее место готово; вы рады",
      i17s01: "Соедините фразы с подходящими ситуациями",
    },
    uk: {
      i13: "Послухайте репліку та виберіть її зміст",
      i15: "Складіть фразу — Міра каже, що ваше робоче місце готове; ви раді",
      i17s01: "З'єднайте фрази з відповідними ситуаціями",
    },
  };

  for (const locale of ["ru", "uk"]) {
    const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId, item]));
    const answerById = new Map(data.answers.map((item) => [item.interactionId, item]));
    const i06 = byId.get("en:lesson-01:session-01:i06");
    assert.deepEqual(i06?.responseOptions.map((item) => item.text), ["fine", "here", "ready"]);
    assert.equal(i06?.modePayload?.choiceFeedback?.length, 3);
    assert.ok(i06?.modePayload?.choiceFeedback?.every((item) => item.feedbackByLocale?.ru && item.feedbackByLocale?.uk));

    const i08 = byId.get("en:lesson-01:session-01:i08");
    assert.equal(i08?.family, "speed_match");
    assert.deepEqual(i08?.modePayload?.pairGrid.map((item) => item.pairId), [
      "en:lesson-01:session-01:i08:p1",
      "en:lesson-01:session-01:i08:p2",
      "en:lesson-01:session-01:i08:p3",
      "en:lesson-01:session-01:i08:p4",
    ]);

    const i11 = byId.get("en:lesson-01:session-01:i11");
    assert.equal(i11?.family, "phrase_builder");
    assert.deepEqual(i11?.modePayload?.authoredDistractorTokens, ["happy"]);
    assert.match(i11?.modePayload?.slotFeedback?.[0]?.feedbackByLocale?.[locale] ?? "", /ready/u);

    const i13 = byId.get("en:lesson-01:session-01:i13");
    assert.equal(i13?.family, "listen_choose");
    assert.equal(i13?.modePayload?.referenceAudio?.transcript, "I am here.");
    assert.equal(i13?.responseOptions?.[0]?.text, locale === "ru" ? "Я здесь." : "Я тут.");
    assert.equal(answerById.get(i13?.interactionId)?.correctText, "Я здесь.");
    assert.equal(i13?.prompt, expected[locale].i13);

    const i10 = byId.get("en:lesson-01:session-01:i10");
    assert.equal(i10?.family, "phrase_builder");
    assert.equal(i10?.modePayload?.targetPhrase, "I am fine.");

    const i15 = byId.get("en:lesson-01:session-01:i15");
    assert.equal(i15?.prompt, expected[locale].i15);
    assert.deepEqual(i15?.modePayload?.authoredDistractorTokens, ["ready"]);
    assert.match(i15?.modePayload?.slotFeedback?.[0]?.feedbackByLocale?.[locale] ?? "", /happy/u);

    const i17s01 = byId.get("en:lesson-01:session-01:i17:s01");
    assert.equal(i17s01?.family, "speed_match");
    assert.equal(i17s01?.prompt, expected[locale].i17s01);
    assert.equal(i17s01?.accessibilityLabel, expected[locale].i17s01);
    assert.equal(i17s01?.modePayload?.pairGrid?.length, 4);
    assert.match(answerById.get(i17s01?.interactionId)?.correctText ?? "", /p1=I am here\./u);

    const i17s03 = byId.get("en:lesson-01:session-01:i17:s03");
    assert.equal(i17s03?.family, "listen_build_dictation");
    assert.equal(i17s03?.modePayload?.hiddenTargetPhrase, "I am fine.");
    assert.equal(answerById.get(i17s03?.interactionId)?.correctText, "I am fine.");

    const source = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    assert.match(source, new RegExp(expected[locale].i15, "u"));
    assert.match(source, new RegExp(expected[locale].i17s01, "u"));
    assert.match(source, /i17:s01; family: speed_match/u);
    assert.match(source, /Пары|Пари/u);
    assert.doesNotMatch(source, /I is fine/u);
    assert.match(source, /I am happy/u);
  }
});

test("L01/S01 records content substitutions as keyed preservation-ledger amendments", () => {
  const ledgerPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migration/single-phrase-2026-10-03/preservation-ledger.json");
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  const sessionRows = ledger.rows.filter((item) => item.courseSessionId === "en:lesson-01:session-01");
  const amendments = ledger.amendments.filter((item) => item.courseSessionId === "en:lesson-01:session-01");

  const i10 = sessionRows.find((item) => item.oldInteractionId === "en:lesson-01:session-01:i10" && item.segmentIndex === 1);
  assert.equal(i10?.sourceSegment, "I am ___ .", "i10 keeps the immutable source segment");
  assert.equal(i10?.newTargetSegment, "I am fine.", "i10 records the current phrase-builder target");
  assert.equal(i10?.correctText, "I am fine.");
  assert.equal(i10?.audioTranscript, null);

  const i10Amendments = amendments.filter(
    (item) => item.oldInteractionId === "en:lesson-01:session-01:i10" && item.segmentIndex === 1,
  );
  assert.equal(i10Amendments.length, 1, "i10 target replacement must have exactly one keyed amendment");
  assert.equal(i10Amendments[0]?.from, "I am ___ .");
  assert.equal(i10Amendments[0]?.to, "I am fine.");
  assert.equal(
    i10Amendments[0]?.reason,
    "The current i10 is a phrase-builder whose target and checked answer are `I am fine.`; this records the actual replacement of the legacy gap target, rather than incorrectly describing it as punctuation-only (2026-10-12).",
  );

  const i17s01 = sessionRows.find((item) => item.oldInteractionId === "en:lesson-01:session-01:i17" && item.segmentIndex === 1);
  assert.equal(i17s01?.sourceSegment, "I am here.", "i17 segment 1 keeps the immutable source segment");
  const i17s01CurrentTarget = [
    "en:lesson-01:session-01:i17:s01:p1=I am here.",
    "en:lesson-01:session-01:i17:s01:p2=I am ready.",
    "en:lesson-01:session-01:i17:s01:p3=I am fine.",
    "en:lesson-01:session-01:i17:s01:p4=I am happy.",
  ].join("\n");
  assert.equal(i17s01?.newTargetSegment, i17s01CurrentTarget, "i17 segment 1 records the current phrase-to-situation matching target");
  assert.equal(i17s01?.correctText, i17s01CurrentTarget);
  assert.equal(i17s01?.audioTranscript, null);

  for (const [oldInteractionId, segmentIndex] of [
    ["en:lesson-01:session-01:i02", 1],
    ["en:lesson-01:session-01:i04", 1],
    ["en:lesson-01:session-01:i06", 1],
    ["en:lesson-01:session-01:i14", 1],
    ["en:lesson-01:session-01:i16", 1],
  ]) {
    const amendment = amendments.find((item) => item.oldInteractionId === oldInteractionId && item.segmentIndex === segmentIndex);
    assert.deepEqual(Object.keys(amendment ?? {}).filter((key) => ["oldInteractionId", "segmentIndex", "from", "to"].includes(key)).sort(), ["from", "oldInteractionId", "segmentIndex", "to"]);
    assert.ok(amendment.from.trim());
    assert.ok(amendment.to.trim());
  }
  const i17s01Amendment = amendments.find((item) => item.oldInteractionId === "en:lesson-01:session-01:i17" && item.segmentIndex === 1);
  assert.equal(i17s01Amendment?.from, "I am here.");
  assert.equal(i17s01Amendment?.to, i17s01CurrentTarget);
  assert.equal(
    i17s01Amendment?.reason,
    "The current i17:s01 is a phrase-to-situation matching set. It retains the legacy first phrase `I am here.` and adds the three explicitly displayed alternatives; this records the observed change of task representation (2026-10-12).",
  );

  const i17s03 = sessionRows.find((item) => item.oldInteractionId === "en:lesson-01:session-01:i17" && item.segmentIndex === 3);
  assert.equal(i17s03?.sourceSegment, "I am fine.");
  assert.equal(i17s03?.newTargetSegment, "I am fine.");
  assert.equal(i17s03?.correctText, "I am fine.");
  assert.equal(
    amendments.some((item) => item.oldInteractionId === "en:lesson-01:session-01:i17" && item.segmentIndex === 3),
    false,
    "i17 segment 3 retains its current source target and needs no fictional amendment",
  );
});

test("L01/S01 keeps its first-form explanation, word cards, and happy correction within the taught scope", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    assert.doesNotMatch(source, /I['’]m/u, `${locale}: learner text must not introduce a future contraction`);
    assert.doesNotMatch(source, /\bI is\b/u, `${locale}: learner text must not use is as a distractor`);
    assert.match(
      source,
      locale === "ru" ? /первая английская фраза этого\s+курса/u : /перша англійська фраза цього\s+курсу/u,
      `${locale}: the first-sentence claim must be scoped to this course`,
    );
    assert.match(source, /here.*ready.*fine.*happy/u, `${locale}: the explanation must bind the pattern to its four taught phrases`);

    for (const suffix of ["i01", "i03", "i05", "i07"]) {
      const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(`:${suffix}`));
      const word = interaction?.modePayload?.wordCard?.word;
      assert.ok(word, `${locale}:${suffix} must retain its word card`);
      assert.doesNotMatch(interaction?.prompt ?? "", new RegExp(word, "u"), `${locale}:${suffix} prompt must not reveal its English word`);
      assert.doesNotMatch(interaction?.accessibilityLabel ?? "", new RegExp(word, "u"), `${locale}:${suffix} accessibility label must not reveal its English word`);
    }

    const readyCard = data.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(":i03"));
    assert.equal(
      readyCard?.modePayload?.wordCard?.definitionByLocale?.uk,
      "«готовий / готова». Шнурки зав'язані, куртка вже на вас, можна виходити.",
      `${locale}: ready's Ukrainian definition must use the approved wording`,
    );

    const happyIntro = source.match(/- ❌ I happy\. — \*([^*]+)\*/u)?.[1] ?? "";
    assert.match(happyIntro, /I am happy/u, `${locale}: the happy error must be corrected to the requested phrase`);
    assert.doesNotMatch(happyIntro, /I am fine/u, `${locale}: the happy error must not receive fine feedback`);
  }
});

test("L01/S01 keeps self-descriptions, feedback, punctuation, and final retrieval learner-safe", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    const happyIntro = source.match(/- ❌ I happy\. — \*([^*]+)\*/u)?.[1] ?? "";
    assert.doesNotMatch(happyIntro, locale === "ru" ? /в порядке/u : /все гаразд/u);
    assert.match(happyIntro, locale === "ru" ? /рад/u : /рад/u);
    assert.doesNotMatch(source, /I am ___ \./u, `${locale}: learner text must not show a space before a period`);
    if (locale === "uk") {
      assert.match(
        source,
        /Ready означає «готовий \/ готова»\. Після доброї новини ви раді, тому тут happy: I am happy\./u,
        "uk: i07:a01 ready feedback must match the canonical atomic text",
      );
    }
    const interactions = data.interactionsByLocale[locale];
    const i17s01 = interactions.find((entry) => entry.interactionId.endsWith(":i17:s01"));
    const i17s02 = interactions.find((entry) => entry.interactionId.endsWith(":i17:s02"));
    const i17s03 = interactions.find((entry) => entry.interactionId.endsWith(":i17:s03"));
    const signatures = new Set([i17s01, i17s02, i17s03].map((interaction) =>
      `${interaction?.family}:${interaction?.modePayload?.targetPhrase ?? interaction?.modePayload?.gappedTargetPhrase ?? ""}`,
    ));
    assert.ok(signatures.size >= 2, `${locale}: the final retrieval must use at least two distinct actions`);
  }
});

test("L01/S01 keeps independent final coverage and inclusive locale projections", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const interactions = data.interactionsByLocale[locale];
    const i17s01 = interactions.find((entry) => entry.interactionId.endsWith(":i17:s01"));
    assert.equal(i17s01?.purpose, "independent_check");
    assert.equal(i17s01?.family, "speed_match");
    assert.deepEqual(i17s01?.modePayload?.pairGrid?.map((pair) => pair.target), ["I am here.", "I am ready.", "I am fine.", "I am happy."]);

    const slotRows = interactions.flatMap((interaction) => (interaction.modePayload?.slotFeedback ?? [])
      .map((row) => ({ interaction, row })));
    const authoredDistractorCount = interactions.reduce(
      (count, interaction) => count + (interaction.modePayload?.authoredDistractorTokens?.length ?? 0),
      0,
    );
    assert.equal(slotRows.length, authoredDistractorCount, `${locale}: every authored distractor row must remain covered`);
    for (const { interaction, row } of slotRows) {
      assert.equal(
        row.testedDimension,
        interaction.prompt,
        `${locale}:${interaction.interactionId}: slot feedback must bind to its own locale prompt`,
      );
    }

    const source = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    assert.match(source, locale === "ru" ? /готов \/ готова/u : /готовий \/ готова/u);
    assert.match(source, locale === "ru" ? /рад \/ рада/u : /радий \/ рада/u);
    const readyCard = interactions.find((entry) => entry.interactionId.endsWith(":i03"));
    const happyCard = interactions.find((entry) => entry.interactionId.endsWith(":i07"));
    assert.match(readyCard?.modePayload?.wordCard?.definitionByLocale?.[locale] ?? "", locale === "ru" ? /готов \/ готова/u : /готовий \/ готова/u);
    assert.match(happyCard?.modePayload?.wordCard?.definitionByLocale?.[locale] ?? "", locale === "ru" ? /рад \/ рада/u : /радий \/ рада/u);
  }

  const independentTargets = data.interactionsByLocale.ru
    .filter((interaction) => interaction.purpose === "independent_check")
    .flatMap((interaction) => {
      if (interaction.family === "speed_match") return interaction.modePayload?.pairGrid?.map((pair) => pair.target.replace(/^I am\s+|\.$/gu, "")) ?? [];
      const exact = interaction.modePayload?.targetPhrase ?? interaction.modePayload?.hiddenTargetPhrase;
      if (exact) return exact.replace(/^I am\s+|\.$/gu, "");
      return data.answers.find((answer) => answer.interactionId === interaction.interactionId)?.correctText;
    })
    .filter((target) => ["happy", "here", "ready", "fine"].includes(target));
  assert.deepEqual(
    Object.fromEntries(["happy", "here", "ready", "fine"].map((word) => [word, independentTargets.filter((target) => target === word).length])),
    { happy: 3, here: 1, ready: 2, fine: 2 },
  );
});

test("L01/S01 keeps every learner self-reference inclusive and feedback dimensions complete", () => {
  const data = atomic();
  const expected = {
    ru: {
      happyFeedback: "Верно: happy означает «рад / рада». После хорошей новости I am happy прямо сообщает о вашей радости.",
      i10Prompt: "Соберите фразу — коллега спросил, как у вас дела; ответьте, что всё хорошо",
      i08Meanings: ["здесь", "готов / готова", "хорошо", "рад / рада"],
    },
    uk: {
      happyFeedback: "Правильно: happy означає «радий / рада». Після хорошої новини I am happy прямо повідомляє про вашу радість.",
      i10Prompt: "Складіть фразу — колега запитав, як ваші справи; скажіть, що все добре",
      i08Meanings: ["тут", "готовий / готова", "добре", "радий / рада"],
    },
  };

  for (const locale of ["ru", "uk"]) {
    const byId = new Map(data.interactionsByLocale[locale].map((interaction) => [interaction.interactionId, interaction]));
    const happy = byId.get("en:lesson-01:session-01:i07:a01");
    const happyCorrect = happy?.modePayload?.choiceFeedback?.find((entry) => entry.correct === true);
    assert.equal(happyCorrect?.feedbackByLocale?.[locale], expected[locale].happyFeedback);

    const i08 = byId.get("en:lesson-01:session-01:i08");
    const pairMeanings = i08?.modePayload?.pairGrid?.map((pair) => pair.meaningByLocale?.[locale]);
    assert.deepEqual(pairMeanings, expected[locale].i08Meanings);
    assert.deepEqual(i08?.modePayload?.rightColumn, pairMeanings, `${locale}: i08 right column must be derived from its localized pair meanings`);

    const i10 = byId.get("en:lesson-01:session-01:i10");
    assert.equal(i10?.prompt, expected[locale].i10Prompt);
    assert.equal(i10?.modePayload?.targetPhrase, "I am fine.");
    assert.ok(i10?.modePayload?.slotFeedback?.length > 0);
    for (const feedback of i10.modePayload.slotFeedback) {
      assert.equal(feedback.testedDimension, expected[locale].i10Prompt, `${locale}:${feedback.responseId} must retain the full prompt`);
    }
  }

  const sourceExpectations = {
    ru: [
      "Ответьте: «Я готов / готова».",
      "ready — готов / готова · fine — хорошо · happy — рад / рада",
      "ready означает «готов / готова»",
      "«Я готов / готова»",
    ],
    uk: [
      "ready — готовий / готова · fine — добре · happy — радий / рада",
      "ready означає «готовий / готова»",
      "«Я готовий / готова»",
    ],
  };
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    for (const phrase of sourceExpectations[locale]) assert.match(source, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
});

test("L01/S01 keeps the first explanation within the authored intro target", () => {
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    const intro = source
      .split(/^## [ИІ]нтро \d+/mu)[1]
      .split("\n**")[0]
      .split("\n")
      .filter((line) => !line.trim().startsWith("###"))
      .join("\n")
      .trim();
    assert.ok(intro.length >= 240 && intro.length <= 290, `${locale}: first explanation must stay in the 240–290 character authoring target; got ${intro.length}`);
  }
});

test("L01/S01 candidate preview keeps operational labels out of the learner-facing copy", () => {
  for (const previewName of ["app.js", "index.html"]) {
    const preview = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), `../mockup/staging-s01/${previewName}`), "utf8");
    for (const forbidden of [
      "Это черновой просмотр",
      "канонический выпуск",
      "ЧЕРНОВИК · НЕ ПРОВЕРЕНО · НЕ ВЫПУСК",
      "Проверенный разбор для этого ответа отсутствует.",
      "сборщик не нашёл",
      "полного авторского объяснения",
    ]) assert.equal(preview.includes(forbidden), false, `${previewName} leaks operational text: ${forbidden}`);
  }
});

test("L01/S01 candidate removes the six flagged repeated retrievals with distinct learner actions", () => {
  const candidateRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../mockup/staging-s01");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(candidateRoot, "data.js"), "utf8"), context);
  const learner = context.window.__DATA__[0].learner;
  const byId = new Map(learner.interactions.map((item) => [item.interactionId, item]));
  const expectInteraction = (suffix, family, target) => {
    const item = byId.get(`en:lesson-01:session-01:${suffix}`);
    assert.equal(item?.family, family, `${suffix} must use its distinct practice action`);
      assert.equal(item?.modePayload?.targetPhrase ?? item?.modePayload?.hiddenTargetPhrase ?? item?.modePayload?.referenceAudio?.transcript, target, `${suffix} must retain its exact target`);
  };

  expectInteraction("i10", "phrase_builder", "I am fine.");
  expectInteraction("i13", "listen_choose", "I am here.");
  assert.equal(byId.get("en:lesson-01:session-01:i17:s01")?.family, "speed_match");
  expectInteraction("i17:s02", "scripted_repeat_compare", "I am ready.");
  expectInteraction("i17:s03", "listen_build_dictation", "I am fine.");

  for (const suffix of ["i10", "i17:s02", "i17:s03"]) {
    const explanation = byId.get(`en:lesson-01:session-01:${suffix}`)?.modePayload?.explanationV1;
    assert.equal(explanation?.phrase?.units?.length, 4, `${suffix} needs a learner-visible word-by-word explanation`);
  }

  const forbiddenFinding = "слово «i am fine» повторяется тем же способом вместо новой тренировки";
  for (const previewName of ["index.html", "external.html"]) {
    const preview = fs.readFileSync(path.join(candidateRoot, previewName), "utf8");
    assert.equal(preview.includes(forbiddenFinding), false, `${previewName} retains a closed repetition finding`);
  }
});

test("L01/S01 source keeps the six repaired retrievals as distinct learner actions", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId, item]));
    const expectInteraction = (suffix, family, target) => {
      const item = byId.get(`en:lesson-01:session-01:${suffix}`);
      assert.equal(item?.family, family, `${locale}:${suffix} must use its distinct practice action`);
      assert.equal(item?.modePayload?.targetPhrase ?? item?.modePayload?.hiddenTargetPhrase ?? item?.modePayload?.referenceAudio?.transcript, target, `${locale}:${suffix} must retain its exact target`);
    };

    expectInteraction("i10", "phrase_builder", "I am fine.");
    expectInteraction("i13", "listen_choose", "I am here.");
    assert.equal(byId.get("en:lesson-01:session-01:i17:s01")?.family, "speed_match");
    expectInteraction("i17:s02", "scripted_repeat_compare", "I am ready.");
    expectInteraction("i17:s03", "listen_build_dictation", "I am fine.");
  }
});

test("L01/S01 gives its spoken here and ready phrases complete, typed learner explanations", () => {
  const data = atomic();
  const expected = {
    ru: {
      here: {
        meaning: "Я здесь.",
        explanation: "I называет говорящего, am обязательно после I, а here сообщает, где вы находитесь.",
        partOfSpeech: "наречие места",
        function: "Сообщает, где находится говорящий.",
      },
      ready: {
        partOfSpeech: "прилагательное",
        function: "Описывает состояние готовности говорящего после am.",
      },
    },
    uk: {
      here: {
        meaning: "Я тут.",
        explanation: "I називає мовця, am обов'язкове після I, а here повідомляє, де ви перебуваєте.",
        partOfSpeech: "прислівник місця",
        function: "Повідомляє, де перебуває мовець.",
      },
      ready: {
        partOfSpeech: "прикметник",
        function: "Описує стан готовності мовця після am.",
      },
    },
  };

  for (const locale of ["ru", "uk"]) {
    const interactions = new Map(data.interactionsByLocale[locale].map((entry) => [entry.interactionId, entry]));
    const here = interactions.get("en:lesson-01:session-01:i14")?.modePayload?.explanationV1?.phrase;
    assert.equal(here?.text, "I am here.");
    assert.equal(here?.meaningByLocale?.[locale], expected[locale].here.meaning);
    assert.equal(here?.explanationByLocale?.[locale], expected[locale].here.explanation);
    const hereUnit = here?.units?.find((unit) => unit.text === "here");
    assert.equal(hereUnit?.partOfSpeechLabelByLocale?.[locale], expected[locale].here.partOfSpeech);
    assert.equal(hereUnit?.functionByLocale?.[locale], expected[locale].here.function);

    const ready = interactions.get("en:lesson-01:session-01:i17:s02")?.modePayload?.explanationV1?.phrase?.units?.find((unit) => unit.text === "ready");
    assert.equal(ready?.partOfSpeechLabelByLocale?.[locale], expected[locale].ready.partOfSpeech);
    assert.equal(ready?.functionByLocale?.[locale], expected[locale].ready.function);
  }
});

test("L01/S01 explains bare I am as insufficient here without teaching it as universally wrong", () => {
  const response = explanations().introResponses.find((entry) => entry.responseId.endsWith(":intro3:r3"));
  assert.ok(response, "intro3 bare I am response must remain authored");
  assert.deepEqual(response.whyWrongHereByLocale, {
    ru: "`I am` здесь недостаточно: фраза не говорит, что вы рады. Нужно `I am happy`.",
    uk: "`I am` тут недостатньо: фраза не говорить, що ви раді. Потрібне `I am happy`.",
  });
  assert.deepEqual(response.whyTemptingByLocale, {
    ru: "Фраза начинается правильно, поэтому легко остановиться слишком рано.",
    uk: "Фраза починається правильно, тому легко зупинитися надто рано.",
  });
  assert.deepEqual(response.acceptabilityBoundaryByLocale, {
    ru: "`I am` может быть полным ответом, когда нужный смысл уже задан вопросом. Здесь нужно назвать состояние, поэтому требуется `happy`.",
    uk: "`I am` може бути повною відповіддю, коли потрібний зміст уже заданий запитанням. Тут потрібно назвати стан, тому потрібне `happy`.",
  });
  for (const analysis of Object.values(response.analysisByLocale)) {
    const am = analysis.units.find((unit) => unit.text === "am");
    assert.deepEqual(am.functionByLocale, {
      ru: "Связывает I с состоянием; без happy состояние не названо.",
      uk: "Пов'язує I зі станом; без happy стан не названо.",
    });
  }
  assert.doesNotMatch(JSON.stringify(response), /кратк|коротк/iu);

  const ru = fs.readFileSync(path.join(sessionDir, "final.ru.md"), "utf8");
  const uk = fs.readFileSync(path.join(sessionDir, "final.uk.md"), "utf8");
  assert.match(ru, /В полной фразе не хватает `am`: `I am here`\./u);
  assert.match(ru, /В полной фразе между `I` и `ready` не хватает `am`: I am ready\./u);
  assert.match(uk, /У повній фразі бракує `am`: `I am here`\./u);
  assert.match(uk, /У повній фразі між `I` та `ready` бракує `am`: I am ready\./u);
  assert.doesNotMatch(`${ru}\n${uk}`, /полной форме этого урока|повній формі цього уроку/iu);
});
