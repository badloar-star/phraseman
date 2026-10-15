import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseIntro } from "./build_release.mjs";

const sessionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s03");
const atomic = () => JSON.parse(fs.readFileSync(path.join(sessionDir, "practice.atomic.json"), "utf8"));
const choiceIds = ["i02", "i04", "i05", "i09", "i12", "i14", "i17:s02"];
const tileIds = ["i10", "i11", "i13", "i15:s02", "i17:s04"];
const expectedWrongChoiceFeedback = {
  i02: {
    r2: { ru: "В начале hungry слышен легкий выдох h; в angry его нет.", uk: "`angry` починається з голосного звука, а `hungry` — з видиху `h`." },
    r3: { ru: "В `hungry` в середине слышен носовой звук `/ŋ/`, как в `sing`, а за ним отчётливо слышно `/g/`.", uk: "У `hungry` посередині чути носовий звук `/ŋ/`, як у `sing`, а за ним чітко чути `/g/`." },
  },
  i04: {
    r2: { ru: "shirt звучит вторым. Первым было sure.", uk: "shirt звучить другим. Першим було sure." },
    r3: { ru: "`sugar` не звучало первым: первым было sure.", uk: "`sugar` не звучало першим: першим було sure." },
  },
  i05: {
    r2: { ru: "«Рубашка». В конце слышно t, а у sure этого звука нет.", uk: "shirt — «сорочка». Наприкінці чути t, а в sure цього звука немає." },
    r3: { ru: "«Сахар». Слишком длинно — два слога вместо одного.", uk: "«Цукор». Задовге — два склади замість одного." },
  },
  i09: {
    r2: { ru: "No — ответ одним словом. Внутри фразы — not.", uk: "No — відповідь одним словом. Усередині фрази — not." },
    r3: { ru: "Am уже стоит. Второе не нужно, нужно not.", uk: "Am уже стоїть. Другого не треба, треба not." },
  },
  i12: {
    r2: { ru: "С `I` нужно `am`, затем `not`: `I am not tired`.", uk: "З `I` потрібне `am`, потім `not`: `I am not tired`." },
    r3: { ru: "С I нужна форма am: I am not tired.", uk: "Для `I` потрібна форма `am`: `I am not tired`." },
  },
  i14: {
    r2: { ru: "В аудио после am слышно not. Ответ означает «я не занят», а не «я занят».", uk: "В аудіо після am чути not. Відповідь означає «я не зайнятий», а не «я зайнятий»." },
    r3: { ru: "В аудио последнее слово busy, не late: речь о занятости, не об опоздании.", uk: "В аудіо останнє слово busy, не late: йдеться про зайнятість, а не про запізнення." },
  },
  "i17:s02": {
    r2: { ru: "В аудио после am слышно not. Это «я не голоден», не «я голоден».", uk: "В аудіо після am чути not. Це «я не голодний», а не «я голодний»." },
    r3: { ru: "Последнее слово hungry, не cold: речь о еде, а не о температуре.", uk: "Останнє слово hungry, не cold: йдеться про їжу, а не про температуру." },
  },
};
const expectedTileFeedback = {
  i10: { ru: "«уверен», но здесь вы сообщаете: «я не один»", uk: "«впевнений», але тут ви повідомляєте: «я не сам»" },
  i11: { ru: "это отдельный ответ, а внутри фразы нужно not", uk: "це окрема відповідь, а всередині фрази потрібне not" },
  i13: { ru: "она дала бы `I am not late` — «я не опоздал». Здесь нужно признать, что вы опоздали.", uk: "вона змінила б зміст на «я не запізнився». Тут треба визнати, що ви запізнилися." },
  "i15:s02": { ru: "здесь «у меня всё хорошо», без отрицания", uk: "тут «у мене все добре», без заперечення" },
  "i17:s04": { ru: "здесь вы говорите «я готов»", uk: "тут ви кажете «я готовий»" },
};
test("L01/S03 gives each intro correct r1 prompt-specific localized feedback", () => {
  for (const locale of ["ru", "uk"]) {
    const markdown = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    const pages = parseIntro(markdown);
    assert.equal(pages.length, 3, `${locale}: expected three intro pages`);
    pages.forEach((page, index) => {
      assert.equal(page.options[0]?.correct, true, `${locale}:intro${index + 1}: r1 remains correct`);
      assert.ok(!page.options[0]?.feedback, `${locale}:intro${index + 1}: correct verdict is runtime-owned`);
    });
  }
});

test("L01/S03 explains every learner-selectable answer", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    for (const interaction of data.interactionsByLocale[locale]) {
      for (const row of interaction.modePayload?.choiceFeedback ?? []) {
        const suffix = interaction.interactionId.split(":session-03:")[1];
        assert.equal(row.correct, false, `${locale}:${suffix}:${row.responseId}: authored choice feedback must be wrong-only`);
        const responseSuffix = row.responseId.split(":").at(-1);
        assert.deepEqual(row.feedbackByLocale, expectedWrongChoiceFeedback[suffix]?.[responseSuffix], `${locale}:${suffix}:${responseSuffix} must have its exact RU/UK correction`);
      }
    }
    for (const suffix of choiceIds) {
      const id = `en:lesson-01:session-03:${suffix}`;
      const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
      const answer = data.answers.find((entry) => entry.interactionId === id);
      const feedbackRows = interaction?.modePayload?.choiceFeedback ?? [];
      assert.equal(feedbackRows.some((row) => row.responseId === answer?.correctResponseId), false, `${locale}:${suffix} must not author correct-choice feedback`);
      assert.deepEqual(
        feedbackRows.map((item) => item.responseId).sort(),
        interaction.responseOptions.map((item) => item.responseId).filter((responseId) => responseId !== answer?.correctResponseId).sort(),
        `${locale}:${suffix} must cover every wrong choice exactly once`,
      );
    }
  }
});

test("L01/S03 explains every authored extra tile including Ukrainian not", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) for (const suffix of tileIds) {
    const id = `en:lesson-01:session-03:${suffix}`;
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    const row = interaction?.modePayload?.slotFeedback?.[0];
    assert.equal(row?.responseId, `${id}:tile:d1`, `${locale}:${suffix} needs its physical tile feedback`);
    assert.equal(row?.correct, false, `${locale}:${suffix} tile must be wrong`);
    assert.ok(row?.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} needs Russian tile feedback`);
    assert.ok(row?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs Ukrainian tile feedback`);
    assert.deepEqual(row.feedbackByLocale, expectedTileFeedback[suffix], `${locale}:${suffix} must have exact RU/UK tile feedback`);
  }
  const ukI13 = data.interactionsByLocale.uk.find((entry) => entry.interactionId.endsWith(":i13"));
  assert.deepEqual(ukI13?.modePayload?.authoredDistractorTokens, ["not"]);
});

test("L01/S03 i13 names the extra not tile in both Markdown sources", () => {
  const expected = {
    ru: "плитка `not` лишняя: она дала бы `I am not late` — «я не опоздал». Здесь нужно признать, что вы опоздали",
    uk: "плитка `not` зайва: вона змінила б зміст на «я не запізнився». Тут треба визнати, що ви запізнилися",
  };
  for (const locale of ["ru", "uk"]) {
    const markdown = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    const block = markdown.split(locale === "ru" ? "**13 ·" : "**13 ·")[1].split("**14 ·")[0];
    assert.match(block, new RegExp(expected[locale].replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
});

test("L01/S03 i03 names Mira explicitly in both source locales and atomic projections", () => {
  const expected = {
    ru: "«холодно, замёрз». Мира включила кондиционер слишком сильно.",
    uk: "«холодно, змерз». Міра ввімкнула кондиціонер надто сильно.",
  };
  for (const locale of ["ru", "uk"]) {
    const markdown = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    assert.match(markdown, new RegExp(expected[locale].replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
    const card = markdown.split("**3 ·")[1]?.split("**4 ·")[0] ?? "";
    assert.doesNotMatch(card, /(?:кто-то|кем-то|хтось)/iu, `${locale}: i03 must not use an unspecified actor`);
  }

  const data = atomic();
  for (const projectionLocale of ["ru", "uk"]) {
    const interaction = data.interactionsByLocale[projectionLocale]
      .find((entry) => entry.interactionId === "en:lesson-01:session-03:i03");
    assert.deepEqual(interaction?.modePayload?.localizedMeaningChoices?.[0]?.meaningByLocale, expected);
    assert.deepEqual(interaction?.modePayload?.wordCard?.definitionByLocale, expected);
  }
});

test("L01/S03 intro 2 presents a situation that calls for I am not cold", () => {
  const ru = fs.readFileSync(path.join(sessionDir, "final.ru.md"), "utf8");
  const uk = fs.readFileSync(path.join(sessionDir, "final.uk.md"), "utf8");
  const ruIntro2 = ru.split("## Интро 2")[1].split("## Интро 3")[0];
  const ukIntro2 = uk.split("## Інтро 2")[1].split("## Інтро 3")[0];
  const batchIntro2 = fs.readFileSync(path.join(sessionDir, "locales_batch.md"), "utf8")
    .split("## Інтро 2")[1].split("## Інтро 3")[0];
  assert.match(ruIntro2, /вам холодно|вы мёрзнете|вы мерзнете/iu);
  assert.doesNotMatch(ruIntro2, /ещё кофе/iu);
  assert.match(ukIntro2, /ви мерзнете/iu);
  assert.match(batchIntro2, /ви мерзнете/iu);
});

test("L01/S03 intro 1 scopes not placement to the I am + state pattern", () => {
  const expected = {
    ru: /`I am` \+ слово о состоянии: здесь `not` ставится сразу после `am`/u,
    uk: /`I am` \+ слово про стан: тут `not` ставиться одразу після `am`/u,
  };
  const universalClaims = /(?:у `not` место одно|ніколи не змінюється)/iu;
  for (const locale of ["ru", "uk"]) {
    const markdown = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    const intro1 = markdown.split(/## (?:Интро|Інтро) 1/u)[1].split(/## (?:Интро|Інтро) 2/u)[0];
    assert.match(intro1, expected[locale], `${locale}: explain placement only in the taught pattern`);
    assert.doesNotMatch(intro1, universalClaims, `${locale}: avoid a universal claim about not`);
  }
  const batch = fs.readFileSync(path.join(sessionDir, "locales_batch.md"), "utf8");
  const batchIntro1 = batch.split("## Інтро 1")[1].split("## Інтро 2")[0];
  const finalUk = fs.readFileSync(path.join(sessionDir, "final.uk.md"), "utf8");
  assert.equal(batch, `===LOCALE: uk===\n${finalUk.trim()}\n`, "uk batch must be an exact byte-for-byte source projection, including line endings");
  assert.match(batchIntro1, expected.uk, "uk batch: preserve scoped rule wording");
  assert.doesNotMatch(batchIntro1, universalClaims, "uk batch: avoid a universal claim about not");
});

test("L01/S03 sure distractor remains distinct without an unstated accent", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const contrast = data.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(":i04"));
    const listen = data.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(":i05"));
    assert.equal(contrast?.modePayload?.contrastB, "shirt");
    assert.equal(contrast?.modePayload?.audioB?.transcript, "shirt");
    assert.deepEqual(contrast?.audioTargetIds, [
      "en:lesson-01:session-03:i04:audioA",
      "en:lesson-01:session-03:i04:audioB",
    ]);
    assert.equal(contrast?.modePayload?.audioA?.transcript, "sure");
    const expectedFirstWordPrompt = locale === "ru"
      ? "Послушайте две записи. Какое слово звучит в первой?"
      : "Прослухайте два записи. Яке слово ви чуєте в першому?";
    assert.equal(contrast?.prompt, expectedFirstWordPrompt);
    assert.equal(contrast?.accessibilityLabel, expectedFirstWordPrompt);
    assert.equal(contrast?.modePayload?.testedPhoneticContrast, expectedFirstWordPrompt);
    assert.ok(contrast?.modePayload?.choiceFeedback?.every((row) => row.testedDimension === expectedFirstWordPrompt), `${locale}: wrong-answer feedback must remain bound to this localized prompt`);
    const markdown = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    const taskBlock = markdown.match(/\*\*4 · ([^\n]+)\*\*[\s\S]*?<!-- interaction_id: en:lesson-01:session-03:i04;[^>]* -->\s*\n([^\n]+)/u);
    assert.equal(taskBlock?.[1]?.replace(/\r$/u, ""), expectedFirstWordPrompt, `${locale}: i04 Markdown title must state the exact first-word question`);
    assert.equal(taskBlock?.[2]?.replace(/\r$/u, ""), expectedFirstWordPrompt, `${locale}: i04 Markdown prompt must match the atomic question`);
    if (locale === "uk") {
      const batch = fs.readFileSync(path.join(sessionDir, "locales_batch.md"), "utf8");
      const batchBlock = batch.match(/\*\*4 · ([^\n]+)\*\*[\s\S]*?<!-- interaction_id: en:lesson-01:session-03:i04;[^>]* -->\s*\n([^\n]+)/u);
      assert.equal(batchBlock?.[1]?.replace(/\r$/u, ""), expectedFirstWordPrompt, "uk batch: i04 title must match the atomic question");
      assert.equal(batchBlock?.[2]?.replace(/\r$/u, ""), expectedFirstWordPrompt, "uk batch: i04 prompt must match the atomic question");
    }
    assert.deepEqual(contrast?.responseOptions?.map((row) => row.text), ["sure", "shirt", "sugar"]);
    assert.deepEqual(contrast?.responseOptions?.map((row) => row.responseId), [
      "en:lesson-01:session-03:i04:r1",
      "en:lesson-01:session-03:i04:r2",
      "en:lesson-01:session-03:i04:r3",
    ]);
    assert.equal(data.answers.find((row) => row.interactionId === contrast.interactionId)?.correctResponseId, `${contrast.interactionId}:r1`);
    assert.deepEqual(listen?.responseOptions?.map((row) => row.text), ["sure", "shirt", "sugar"]);
    assert.equal(listen?.modePayload?.referenceAudio?.transcript, "sure");
    assert.equal(listen?.modePayload?.referenceAudio?.audioTargetId, `${listen?.interactionId}:audio`);
    assert.equal(data.answers.find((row) => row.interactionId === listen?.interactionId)?.correctResponseId, `${listen?.interactionId}:r1`);
    assert.equal(listen?.modePayload?.localizedMeaningChoices?.[1]?.targetText, "shirt");
    const expectedWrongFeedback = {
      ru: "«Рубашка». В конце слышно t, а у sure этого звука нет.",
      uk: "shirt — «сорочка». Наприкінці чути t, а в sure цього звука немає.",
    };
    assert.deepEqual(listen?.modePayload?.choiceFeedback?.find((row) => row.responseId.endsWith(":r2"))?.feedbackByLocale, expectedWrongFeedback);
    assert.deepEqual(contrast?.modePayload?.choiceFeedback?.find((row) => row.responseId.endsWith(":r2"))?.feedbackByLocale, expectedWrongChoiceFeedback.i04.r2);
    assert.deepEqual(contrast?.modePayload?.choiceFeedback?.find((row) => row.responseId.endsWith(":r3"))?.feedbackByLocale, expectedWrongChoiceFeedback.i04.r3);
  }
  for (const locale of ["ru", "uk"]) {
    const markdown = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    assert.doesNotMatch(markdown.match(/\*\*4 · ([^\n]+)\*\*/u)?.[1] ?? "", /sure|shirt/iu);
    assert.doesNotMatch(markdown, /sure и shore|sure і shore/iu);
  }
  assert.doesNotMatch(fs.readFileSync(path.join(sessionDir, "locales_batch.md"), "utf8"), /shore/iu);
  const manifest = JSON.parse(fs.readFileSync(path.resolve(sessionDir, "../../../../../../assets/audio/learning-v2/factory-production-v1/manifest.json"), "utf8"));
  assert.doesNotMatch(JSON.stringify(data), /shore/iu);
  for (const transcript of ["sure", "shirt"]) {
    const matches = manifest.entries.filter((entry) => entry.transcript === transcript);
    assert.equal(matches.length, 4, `${transcript} must resolve all bundled production voices`);
    assert.ok(matches.every((entry) => fs.existsSync(path.resolve(sessionDir, `../../../../../../${entry.assetPath}`))), `${transcript} bundled audio assets must exist`);
  }
  assert.equal(manifest.entries.some((entry) => entry.transcript === "shore"), false);
});

test("L01/S03 keeps all 21 tasks and intro 3 claims coherent across authored locales", () => {
  const sources = [
    fs.readFileSync(path.join(sessionDir, "final.ru.md"), "utf8"),
    fs.readFileSync(path.join(sessionDir, "final.uk.md"), "utf8"),
  ];
  for (const source of sources) {
    assert.equal((source.match(/^\*\*\d+ ·/gmu) ?? []).length, 21);
    const intro3 = source.split(/## (?:Интро|Інтро) 3/u)[1].split("## Практика")[0];
    assert.doesNotMatch(intro3, /по десять раз|десять разів на день/iu);
    assert.doesNotMatch(intro3, /отказываться|відмовлятися/iu);
  }
  const batch = fs.readFileSync(path.join(sessionDir, "locales_batch.md"), "utf8");
  const intro3 = batch.split("## Інтро 3")[1].split("## Практика")[0];
  assert.doesNotMatch(intro3, /десять разів на день|відмовлятися/iu);
  const data = atomic();
  assert.equal(data.interactionsByLocale.ru.length, 21);
  assert.equal(data.interactionsByLocale.uk.length, 21);
});

test("L01/S03 UK locale batch matches every authored interaction and atomic feedback projection", () => {
  const finalUk = fs.readFileSync(path.join(sessionDir, "final.uk.md"), "utf8");
  const batch = fs.readFileSync(path.join(sessionDir, "locales_batch.md"), "utf8");
  const taskBlocks = (markdown) => markdown.replaceAll("\r\n", "\n")
    .split(/(?=^\*\*\d+ ·)/mu)
    .filter((block) => /^\*\*\d+ ·/mu.test(block))
    .map((block) => block.trim());
  const includesLearnerText = (block, text) => block
    .replace(/(?:^|\n)>\s?/gu, " ")
    .replace(/\s+/gu, " ")
    .includes(text.replace(/\s+/gu, " ").trim());
  const sourceBlocks = taskBlocks(finalUk);
  const batchBlocks = taskBlocks(batch);
  assert.equal(sourceBlocks.length, 21, "UK authored source needs all 21 interactions");
  assert.equal(batchBlocks.length, 21, "UK locale batch needs all 21 interactions");
  for (let index = 0; index < 21; index += 1) {
    const sourceId = sourceBlocks[index].match(/interaction_id: ([^;]+)/u)?.[1];
    const batchId = batchBlocks[index].match(/interaction_id: ([^;]+)/u)?.[1];
    assert.ok(sourceId, `final.uk.md task ${index + 1} must identify its interaction`);
    assert.equal(batchId, sourceId, `locale batch task ${index + 1} must preserve interaction identity`);
    assert.equal(batchBlocks[index], sourceBlocks[index], `${sourceId}: locale batch must exactly match current UK authored learner text and feedback`);

    const atomicInteraction = atomic().interactionsByLocale.uk.find((entry) => entry.interactionId === sourceId);
    assert.ok(atomicInteraction, `${sourceId}: current UK atomic projection must exist`);
    const payload = atomicInteraction.modePayload ?? {};
    const learnerVisible = [
      atomicInteraction.prompt,
      ...(atomicInteraction.responseOptions ?? []).map((row) => row.text),
      ...(payload.gapOptions ?? []).map((row) => row.text),
      payload.targetPhrase,
      payload.hiddenTargetPhrase,
      payload.gappedTargetPhrase,
      payload.localizedScene,
      payload.localizedScene?.uk,
      payload.localizedMeaning?.uk,
      payload.referenceAudio?.transcript,
      payload.audioA?.transcript,
      payload.audioB?.transcript,
      payload.wordCard?.definitionByLocale?.uk,
      ...(payload.localizedMeaningChoices ?? []).flatMap((row) => [row.targetText, row.meaningByLocale?.uk]),
      ...(payload.pairGrid ?? []).flatMap((row) => [row.target, row.meaningByLocale?.uk]),
      ...(payload.orderedTokens ?? []),
      ...(payload.authoredDistractorTokens ?? []),
    ].filter((value) => typeof value === "string" && value.trim());
    for (const text of new Set(learnerVisible)) {
      assert.ok(includesLearnerText(sourceBlocks[index], text), `${sourceId}: UK source must render atomic learner-visible text ${JSON.stringify(text)}`);
      assert.ok(includesLearnerText(batchBlocks[index], text), `${sourceId}: UK batch must render atomic learner-visible text ${JSON.stringify(text)}`);
    }
    for (const row of [
      ...(atomicInteraction.modePayload?.choiceFeedback ?? []),
      ...(atomicInteraction.modePayload?.slotFeedback ?? []),
    ]) {
      const feedback = row.feedbackByLocale?.uk;
      if (feedback) {
        assert.ok(includesLearnerText(sourceBlocks[index], feedback), `${sourceId}:${row.responseId}: UK source must contain exact atomic feedback`);
        assert.ok(includesLearnerText(batchBlocks[index], feedback), `${sourceId}:${row.responseId}: UK batch must contain exact atomic feedback`);
      }
    }
  }
  const finalIntro = finalUk.replaceAll("\r\n", "\n").split("## Інтро 2")[1].split("## Інтро 3")[0].trim();
  const batchIntro = batch.replaceAll("\r\n", "\n").split("## Інтро 2")[1].split("## Інтро 3")[0].trim();
  assert.equal(batchIntro, finalIntro, "UK locale batch intro 2 must exactly match authored source");
});

test("L01/S03 Intro 2 teaches full-sentence practice without calling No inherently rude", () => {
  for (const [locale, introHeading, nextHeading, expected, forbidden] of [
    ["ru", "## Интро 2", "## Интро 3", /полное предложение/iu, /как дверь, захлопнутая перед носом|дверь, захлопнутую перед носом/iu],
    ["uk", "## Інтро 2", "## Інтро 3", /повне речення/iu, /двері, зачинені перед носом|зачинені перед носом/iu],
  ]) {
    const source = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    const intro = source.split(introHeading)[1].split(nextHeading)[0];
    assert.match(intro, expected, `${locale}: explain the full-sentence form being practised`);
    assert.doesNotMatch(intro, forbidden, `${locale}: do not characterize a short No as inherently rude`);
  }
});

test("L01/S03 i04 asks for the first recording without naming its answer", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(":i04"));
    const answer = data.answers.find((entry) => entry.interactionId === interaction?.interactionId);
    assert.doesNotMatch(interaction?.prompt ?? "", /sure|shirt/iu, `${locale}: prompt must not disclose either word's order`);
    assert.doesNotMatch(interaction?.accessibilityLabel ?? "", /sure|shirt/iu, `${locale}: accessible prompt must not disclose either word's order`);
    assert.equal(interaction?.modePayload?.audioA?.transcript, "sure");
    assert.equal(interaction?.modePayload?.audioB?.transcript, "shirt");
    assert.deepEqual(interaction?.audioTargetIds, [
      "en:lesson-01:session-03:i04:audioA",
      "en:lesson-01:session-03:i04:audioB",
    ]);
    assert.equal(answer?.correctResponseId, "en:lesson-01:session-03:i04:r1");
    const source = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    const block = source.match(/\*\*4 · ([^\n]+)\*\*[\s\S]*?<!-- interaction_id: en:lesson-01:session-03:i04;[^>]* -->\s*\n([^\n]+)/u);
    assert.ok(block, `${locale}: i04 heading and prompt must be present`);
    assert.doesNotMatch(`${block[1]} ${block[2]}`, /sure|shirt/iu, `${locale}: source prompt must not disclose either word's order`);
    if (locale === "uk") {
      const batch = fs.readFileSync(path.join(sessionDir, "locales_batch.md"), "utf8");
      const batchBlock = batch.match(/\*\*4 · ([^\n]+)\*\*[\s\S]*?<!-- interaction_id: en:lesson-01:session-03:i04;[^>]* -->\s*\n([^\n]+)/u);
      assert.ok(batchBlock, "uk batch: i04 heading and prompt must be present");
      assert.doesNotMatch(`${batchBlock[1]} ${batchBlock[2]}`, /sure|shirt/iu, "uk batch: prompt must not disclose either word's order");
    }
  }
});

test("L01/S03 i12 gives the same negative answer intent in Russian and Ukrainian", () => {
  const data = atomic();
  const expected = {
    ru: /Мира спросила, устали ли вы[.!?;—, ]+(?:и )?скажите, что нет/iu,
    uk: /Міра спитала, чи ви втомилися[.!?;—, ]+(?:і )?скажіть, що ні/iu,
  };
  for (const locale of ["ru", "uk"]) {
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(":i12"));
    assert.match(interaction?.prompt ?? "", expected[locale], `${locale}: state that the learner answers no to Mira's question`);
    assert.match(interaction?.accessibilityLabel ?? "", expected[locale], `${locale}: accessible prompt must preserve the same intent`);
    assert.equal(interaction?.modePayload?.gappedTargetPhrase, "I ___ not tired.");
    assert.equal(data.answers.find((row) => row.interactionId === interaction?.interactionId)?.correctResponseId, `${interaction?.interactionId}:r1`);
    const source = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    const task = source.match(/\*\*12 · ([^\n]+)\*\*[\s\S]*?<!-- interaction_id: en:lesson-01:session-03:i12;[^>]* -->\s*\n([^\n]+)/u);
    assert.ok(task, `${locale}: i12 prompt must be present`);
    assert.match(`${task[1]} ${task[2]}`, expected[locale], `${locale}: source must preserve the negative answer intent`);
    assert.equal(task[1], interaction?.prompt, `${locale}: Markdown title and atomic prompt must match`);
  }
});

test("L01/S03 i02 wrong feedback describes /ŋ/ followed by audible g, without respelling hungry", () => {
  const data = atomic();
  const expected = {
    ru: /носовой звук `?\/ŋ\/?`?[\s\S]*sing[\s\S]*(?:слышно|слышится|произносится) `?\/?g\/?`?/iu,
    uk: /носовий звук `?\/ŋ\/?`?[\s\S]*sing[\s\S]*(?:чути|вимовляється) `?\/?g\/?`?/iu,
  };
  for (const locale of ["ru", "uk"]) {
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(":i02"));
    const feedback = interaction?.modePayload?.choiceFeedback?.find((row) => row.responseId.endsWith(":r3"))?.feedbackByLocale;
    assert.equal(feedback?.ru.includes("хан-гри"), false, `${locale}: do not teach an inaccurate respelling`);
    assert.equal(feedback?.uk.includes("хан-гри"), false, `${locale}: do not teach an inaccurate respelling`);
    assert.match(feedback?.ru ?? "", expected.ru, `${locale}: Russian cue must describe /ŋ/ followed by g`);
    assert.match(feedback?.uk ?? "", expected.uk, `${locale}: Ukrainian cue must describe /ŋ/ followed by g`);
    const source = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    const task = source.match(/\*\*2 · ([^\n]+)\*\*[\s\S]*?<!-- interaction_id: en:lesson-01:session-03:i02;[^>]* -->([\s\S]*?)\n\*\*3 ·/u)?.[1];
    assert.ok(task !== undefined, `${locale}: i02 must have a source block`);
    assert.doesNotMatch(source, /хан-гри/iu, `${locale}: source must not respell hungry inaccurately`);
    assert.match(source, /носовой звук `?\/ŋ\/|носовий звук `?\/ŋ\//iu, `${locale}: source must explain the nasal sound`);
    assert.match(source, /как в `?sing|як у `?sing/iu, `${locale}: source must provide a useful sound comparison`);
  }
});
