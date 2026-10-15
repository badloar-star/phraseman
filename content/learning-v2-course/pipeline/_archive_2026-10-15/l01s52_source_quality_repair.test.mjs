import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseIntro } from "./build_release.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = path.join(root, "sessions", "en", "l01", "s52");
const reviewed = path.join(root, "mockup", "reviewed-source", "en", "l01", "s52");
const id = "en:lesson-01:session-52";
const read = (file) => fs.readFileSync(file, "utf8");
const json = (file) => JSON.parse(read(file));
const interaction = (atomic, locale, suffix) => atomic.interactionsByLocale[locale]
  .find((entry) => entry.interactionId === `${id}:${suffix}`);

test("L01/S52 keeps the morning explanation in the authored window and projects its natural full-sentence gloss", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  const expectedCompletionFeedback = {
    ru: {
      i12: "Верно: `The days are busy.` — `days` означает несколько дней, поэтому нужна `are`.",
      i15: "Верно: `It is early in the morning.` — `It` требует `is`. Сейчас раннее утро.",
      i16: "Верно: `I am tired in the morning.` — после `I` нужна `am`; фраза говорит об утренней усталости.",
      i20: "Верно: `The days are busy.` — `days` означает несколько дней, поэтому нужна `are`.",
      i22: "Верно: `I am tired in the morning.` — после `I` нужна `am`; фраза говорит об утренней усталости.",
    },
    uk: {
      i12: "Правильно: `The days are busy.` — `days` означає кілька днів, тому потрібне `are`.",
      i15: "Правильно: `It is early in the morning.` — `It` потребує `is`. Зараз ще ранок.",
      i16: "Правильно: `I am tired in the morning.` — після `I` потрібне `am`; фраза каже про втому вранці.",
      i20: "Правильно: `The days are busy.` — `days` означає кілька днів, тому потрібне `are`.",
      i22: "Правильно: `I am tired in the morning.` — після `I` потрібне `am`; фраза каже про втому вранці.",
    },
  };

  for (const locale of ["ru", "uk"]) {
    const source = read(path.join(session, `final.${locale}.md`));
    const intro3 = parseIntro(source)[2];
    assert.ok(intro3.text.length >= 210 && intro3.text.length <= 320, `${locale}: intro 3 length uses the canonical authoring algorithm`);
    assert.doesNotMatch(source, /`hard`/u, `${locale}: no unintroduced hard adjective`);
    assert.doesNotMatch(source, /(?:не только|Не только|не лише|Не лише).*good morning/u, `${locale}: morning introduction is positive, not a corrective strawman`);
    assert.doesNotMatch(source, locale === "ru" ? /Мама оставила сообщение из новой квартиры/u : /Мама залишила повідомлення з нової квартири/u, `${locale}: mother is not placed in the learner's apartment`);
    assert.match(source, locale === "ru" ? /Вы звоните маме из новой квартиры/u : /Ви телефонуєте мамі з нової квартири/u, `${locale}: caller location is coherent`);
    assert.match(source, locale === "ru"
      ? /`It is early in the morning` — «Сейчас раннее утро»/u
      : /`It is early in the morning` — «Зараз ще ранок»/u);

    for (const [suffix, feedback] of Object.entries(expectedCompletionFeedback[locale])) {
      const item = interaction(atomic, locale, suffix);
      assert.ok(source.includes(`*${feedback}*`), `${locale}:${suffix}: completion feedback is authored in Markdown`);
      assert.equal(item.modePayload.completionFeedbackByLocale?.[locale], feedback, `${locale}:${suffix}: completion feedback is canonically projected`);
      assert.ok(item.modePayload.slotFeedback?.[0]?.feedbackByLocale?.[locale], `${locale}:${suffix}: excess-tile feedback remains available`);
    }
  }
});

test("L01/S52 gives a present-time, learner-facing objective and removes the confirmed misleading explanations", () => {
  const ru = read(path.join(session, "final.ru.md"));
  const uk = read(path.join(session, "final.uk.md"));

  assert.match(ru, /\*\*Что вы освоите:\*\* Сказать, какая сейчас неделя, какие дни и ночи, и как вы чувствуете себя утром\./u);
  assert.match(uk, /\*\*Що ви опануєте:\*\* Сказати, який зараз тиждень, які дні та ночі, і як ви почуваєтеся вранці\./u);
  assert.ok(!ru.includes("как прошла ваша неделя"));
  assert.ok(!uk.includes("як минув ваш тиждень"));
  assert.ok(!ru.includes("английский пересчитывает вслух то, что мы держим в уме"));
  assert.ok(!uk.includes("англійська перелічує вголос те, що ми тримаємо в голові"));
  assert.ok(!ru.includes("конец уехал далеко"));
  assert.ok(!uk.includes("кінець поїхав далеко"));
  assert.match(ru, /`in the morning` — «утром»\. В этой фразе оно стоит в конце, а `I am` остаётся в начале\./u);
  assert.match(uk, /`in the morning` — «вранці»\. У цій фразі воно стоїть наприкінці, а `I am` лишається на початку\./u);
  assert.ok(!ru.includes("The morning is early."));
  assert.ok(!uk.includes("The morning is early."));
  assert.match(ru, /`It is early in the morning` — «Сейчас раннее утро»\./u);
  assert.match(uk, /`It is early in the morning` — «Зараз ще ранок»\./u);
  assert.doesNotMatch(ru, /«утром рано»/u);
  assert.doesNotMatch(uk, /«вранці рано»/u);
  assert.match(ru, /`Wick` — \/wɪk\/ с \/ɪ\/, а `week` — \/wiːk\/ с \/iː\//u);
  assert.match(uk, /`Wick` — \/wɪk\/ з \/ɪ\/, а `week` — \/wiːk\/ з \/iː\//u);
  assert.match(ru, /dear — \*`Dear` — «дорогой»:.*\/ɪə\/.*\/eɪ\//u);
  assert.match(uk, /dear — \*`Dear` — «дорогий»:.*\/ɪə\/.*\/eɪ\//u);
});

test("L01/S52 mirrors present-time i07 and makes i11 solvable from the quiet scene in both locales", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  for (const locale of ["ru", "uk"]) {
    const i07 = interaction(atomic, locale, "i07");
    const i11 = interaction(atomic, locale, "i11");
    assert.match(i07.prompt, locale === "ru" ? /как проходит ваша неделя/u : /як минає ваш тиждень/u);
    assert.equal(i07.prompt, i07.accessibilityLabel);
    assert.equal(i07.prompt, i07.modePayload.localizedScene[locale]);
    assert.match(i11.prompt, locale === "ru" ? /ни машин, ни голосов/u : /ні машин, ні голосів/u);
    assert.equal(i11.prompt, i11.accessibilityLabel);
    assert.equal(i11.prompt, i11.modePayload.localizedScene[locale]);
    assert.match(i11.modePayload.choiceFeedback.find((entry) => entry.responseId.endsWith(":r2")).feedbackByLocale[locale], locale === "ru" ? /busy.*занят|дел.*quiet/u : /busy.*зайнят|справ.*quiet/u);
    assert.match(i11.modePayload.choiceFeedback.find((entry) => entry.responseId.endsWith(":r3")).feedbackByLocale[locale], locale === "ru" ? /состояние человека/u : /стан людини/u);
    const i15 = interaction(atomic, locale, "i15");
    assert.equal(i15.modePayload.referenceAudio.transcript, "It is early in the morning.");
    assert.equal(i15.modePayload.hiddenTargetPhrase, "It is early in the morning.");
    assert.deepEqual(i15.modePayload.orderedTokens, ["It", "is", "early", "in", "the", "morning"]);
  }
});

test("L01/S52 reviewed-source projection exposes the same learning outcome and repaired learner fields", () => {
  const intro = json(path.join(reviewed, "intro.json"));
  const learner = json(path.join(reviewed, "learner.json"));
  const learnerUk = json(path.join(reviewed, "learner.uk.json"));
  assert.equal(intro.learningOutcomeByLocale.ru, "Сказать, какая сейчас неделя, какие дни и ночи, и как вы чувствуете себя утром.");
  assert.equal(intro.learningOutcomeByLocale.uk, "Сказати, який зараз тиждень, які дні та ночі, і як ви почуваєтеся вранці.");
  assert.match(intro.pages[1].bodyByLocale.ru, /После одной ночи — `night is`, после нескольких — `nights are`\./u);
  assert.match(intro.pages[2].bodyByLocale.uk, /`in the morning` — «вранці»/u);
  for (const [locale, child] of [["ru", learner], ["uk", learnerUk]]) {
    const i07 = child.interactions.find((entry) => entry.interactionId === `${id}:i07`);
    const i11 = child.interactions.find((entry) => entry.interactionId === `${id}:i11`);
    assert.match(i07.prompt, locale === "ru" ? /как проходит ваша неделя/u : /як минає ваш тиждень/u);
    assert.match(i11.prompt, locale === "ru" ? /ни машин, ни голосов/u : /ні машин, ні голосів/u);
    const i15 = child.interactions.find((entry) => entry.interactionId === `${id}:i15`);
    assert.equal(i15.modePayload.hiddenTargetPhrase, "It is early in the morning.");
  }
});

test("L01/S52 reviewed-source is rebuilt from the current 23-interaction source, not the stale release view", () => {
  const intro = json(path.join(reviewed, "intro.json"));
  const projectedByLocale = {
    ru: json(path.join(reviewed, "learner.json")),
    uk: json(path.join(reviewed, "learner.uk.json")),
  };

  for (const locale of ["ru", "uk"]) {
    const currentIntro = parseIntro(read(path.join(session, `final.${locale}.md`)));
    assert.deepEqual(
      intro.pages.map((page) => page.bodyByLocale[locale]),
      currentIntro.map((page) => page.text),
      `${locale}: every reviewed intro page is the current authored text`,
    );

    const ids = projectedByLocale[locale].interactions.map((entry) => entry.interactionId);
    assert.equal(ids.length, 23, `${locale}: reviewed projection has all 23 current interactions`);
    for (const suffix of ["i18:s01", "i18:s02", "i18:s03", "i18:s04", "i19", "i20", "i21", "i22"]) {
      assert.ok(ids.includes(`${id}:${suffix}`), `${locale}: current ${suffix} is visible in reviewed projection`);
    }
    for (const removed of ["i13", "i14"]) {
      assert.ok(!ids.includes(`${id}:${removed}`), `${locale}: removed ${removed} is absent from reviewed projection`);
    }
    assert.doesNotMatch(JSON.stringify(projectedByLocale[locale]), /The days are quiet\./u, `${locale}: stale quiet-days text is absent`);
  }
});

test("L01/S52 preserves the historical morning segment while recording the natural replacement", () => {
  const ledger = json(path.join(root, "migration", "single-phrase-2026-10-03", "preservation-ledger.json"));
  const row = ledger.rows.find((entry) => entry.courseSessionId === id && entry.oldInteractionId === `${id}:i15`);
  const amendment = ledger.amendments.find((entry) => entry.courseSessionId === id && entry.oldInteractionId === `${id}:i15`);
  assert.equal(row.sourceSegment, "The morning is early.");
  assert.equal(row.newTargetSegment, "It is early in the morning.");
  assert.equal(row.correctText, "It is early in the morning.");
  assert.equal(row.audioTranscript, "It is early in the morning.");
  assert.deepEqual({ from: amendment.from, to: amendment.to }, {
    from: "The morning is early.",
    to: "It is early in the morning.",
  });
});

test("L01/S52 records the reviewed busy-days correction without erasing the historical quiet-days source", () => {
  const ledger = json(path.join(root, "migration", "single-phrase-2026-10-03", "preservation-ledger.json"));
  const row = ledger.rows.find((entry) => entry.courseSessionId === id && entry.oldInteractionId === `${id}:i12`);
  const amendment = ledger.amendments.find((entry) => entry.courseSessionId === id && entry.oldInteractionId === `${id}:i12`);
  assert.equal(row.sourceSegment, "The days are quiet.");
  assert.equal(row.newTargetSegment, "The days are busy.");
  assert.equal(row.correctText, "The days are busy.");
  assert.equal(row.audioTranscript, null);
  assert.deepEqual({ from: amendment.from, to: amendment.to }, {
    from: "The days are quiet.",
    to: "The days are busy.",
  });
  assert.match(amendment.reason, /internal contradiction/u);
});

test("L01/S52 records why two off-topic historical drills are replaced by the coherent current practice", () => {
  const ledger = json(path.join(root, "migration", "single-phrase-2026-10-03", "preservation-ledger.json"));
  const retirements = ledger.amendments.filter((entry) => entry.courseSessionId === id && entry.action === "retire");
  assert.deepEqual(retirements.map((entry) => ({
    oldInteractionId: entry.oldInteractionId,
    segmentIndex: entry.segmentIndex,
    replacementInteractionId: entry.replacementInteractionId,
  })), [
    { oldInteractionId: `${id}:i13`, segmentIndex: 1, replacementInteractionId: `${id}:i17` },
    { oldInteractionId: `${id}:i14`, segmentIndex: 1, replacementInteractionId: `${id}:i07` },
  ]);
  for (const retirement of retirements) assert.match(retirement.reason, /out-of-scope/u);
});

test("L01/S52 records the concrete morning replacement for the old generic wellbeing phrase", () => {
  const ledger = json(path.join(root, "migration", "single-phrase-2026-10-03", "preservation-ledger.json"));
  const row = ledger.rows.find((entry) => entry.courseSessionId === id && entry.oldInteractionId === `${id}:i17`);
  const amendment = ledger.amendments.find((entry) => entry.courseSessionId === id && entry.oldInteractionId === `${id}:i17`);
  assert.equal(row.sourceSegment, "I am fine.");
  assert.equal(row.newTargetSegment, "I am ___ in the morning.");
  assert.equal(row.correctText, "tired");
  assert.deepEqual({ from: amendment.from, to: amendment.to }, {
    from: "I am fine.",
    to: "I am ___ in the morning.",
  });
  assert.match(amendment.reason, /concrete morning/u);
});

test("L01/S52 records the added independent checks for the four phone-call responses", () => {
  const ledger = json(path.join(root, "migration", "single-phrase-2026-10-03", "preservation-ledger.json"));
  const additions = ledger.amendments.filter((entry) => entry.courseSessionId === id && entry.action === "addition");
  assert.deepEqual(additions.map((entry) => entry.newInteractionId), [
    `${id}:i19`, `${id}:i20`, `${id}:i21`, `${id}:i22`,
  ]);
  assert.match(additions[0].reason, /independent listening/u);
  for (const addition of additions.slice(1)) assert.match(addition.reason, /independent check/u);
});

test("L01/S52 gives feedback for every choice and only for each excess builder tile", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  const choiceIds = ["i02", "i04", "i06", "i07", "i09", "i11", "i17", "i19", "i21"];
  const builderTiles = new Map([["i12", "is"], ["i15", "are"], ["i16", "is"], ["i20", "is"], ["i22", "is"]]);

  for (const locale of ["ru", "uk"]) {
    for (const suffix of choiceIds) {
      const item = interaction(atomic, locale, suffix);
      const feedback = item.modePayload.choiceFeedback;
      assert.deepEqual(feedback.map((entry) => entry.responseId).sort(), item.responseOptions.map((entry) => entry.responseId).sort());
      assert.equal(feedback.filter((entry) => entry.correct).length, 1);
      for (const entry of feedback) {
        assert.equal(typeof entry.feedbackByLocale.ru, "string");
        assert.equal(typeof entry.feedbackByLocale.uk, "string");
      }
    }
    for (const [suffix, tile] of builderTiles) {
      const item = interaction(atomic, locale, suffix);
      assert.deepEqual(item.modePayload.authoredDistractorTokens, [tile]);
      assert.deepEqual(item.modePayload.slotFeedback.map((entry) => entry.responseId), [`${id}:${suffix}:tile:d1`]);
      assert.equal(item.modePayload.slotFeedback[0].correct, false);
    }
  }
});

test("L01/S52 keeps the Sunday call coherent without leaking listening answers", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  const ru = read(path.join(session, "final.ru.md")).replace(/\r\n/g, "\n");
  const uk = read(path.join(session, "final.uk.md")).replace(/\r\n/g, "\n");

  assert.match(ru, /\*\*Ситуация\.\*\* В воскресенье вы звоните маме из новой квартиры\. Она спрашивает, как проходит ваша неделя, заняты ли дни, тихи ли ночи и как вы чувствуете себя утром\./u);
  assert.match(uk, /\*\*Ситуація\.\*\* У неділю ви телефонуєте мамі з нової квартири\. Вона питає, як минає ваш тиждень, чи зайняті дні, чи тихі ночі та як ви почуваєтеся вранці\./u);

  for (const [locale, source] of [["ru", ru], ["uk", uk]]) {
    const intro2 = source.match(/## Інтро 2\n\n[\s\S]*?(?=\n---\n\n## Інтро 3)/u)?.[0]
      ?? source.match(/## Интро 2\n\n[\s\S]*?(?=\n---\n\n## Интро 3)/u)?.[0];
    assert.ok(intro2, `${locale} intro 2 exists`);
  }

  for (const locale of ["ru", "uk"]) {
    const i11 = interaction(atomic, locale, "i11");
    const i12 = interaction(atomic, locale, "i12");
    const i15 = interaction(atomic, locale, "i15");
    const i17 = interaction(atomic, locale, "i17");

    assert.equal(i15.prompt, locale === "ru"
      ? "Вы звоните маме из новой квартиры. Послушайте запись и соберите услышанную фразу."
      : "Ви телефонуєте мамі з нової квартири. Послухайте запис і складіть почуту фразу.");
    assert.equal(i12.prompt, locale === "ru"
      ? "Мама спрашивает, как проходят дни после переезда. Соберите свой ответ маме."
      : "Мама питає, як минають дні після переїзду. Складіть свою відповідь мамі.");
    assert.doesNotMatch(i12.prompt, locale === "ru" ? /Соберите ответ/u : /Складіть відповідь/u);
    assert.doesNotMatch(i15.prompt, /раннее утро|рано вранці|early in the morning/u);
    assert.equal(i12.modePayload.targetPhrase, "The days are busy.");
    assert.deepEqual(i12.modePayload.orderedTokens, ["The", "days", "are", "busy"]);
    assert.equal(i12.accessibilityLabel, i12.prompt);
    assert.equal(i17.modePayload.gappedTargetPhrase, "I am ___ in the morning.");
    assert.match(i11.modePayload.choiceFeedback.find((entry) => entry.responseId.endsWith(":r2")).feedbackByLocale[locale], locale === "ru"
      ? /busy.*занят|дел.*quiet/u
      : /busy.*зайнят|справ.*quiet/u);
  }

  assert.match(ru, /ответ маме в воскресенье/u);
  assert.match(uk, /відповідь мамі в неділю/u);
});

test("L01/S52 keeps evaluator answers, localized gaps, and the quiet-night contrast aligned", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  const ru = read(path.join(session, "final.ru.md"));
  const uk = read(path.join(session, "final.uk.md"));
  const expectedBusyFeedback = {
    ru: "`Busy` — «занятые: у них много дел». Но здесь ночь `quiet`: за окном тихо, не слышно ни машин, ни голосов.",
    uk: "`Busy` — «зайняті: мають багато справ». Але тут ніч `quiet`: за вікном тихо, не чути ні машин, ні голосів.",
  };

  assert.equal(atomic.answers.find((entry) => entry.interactionId === `${id}:i12`).correctText, "The days are busy.");
  assert.equal(atomic.answers.find((entry) => entry.interactionId === `${id}:i17`).correctText, "tired");

  for (const locale of ["ru", "uk"]) {
    const i11 = interaction(atomic, locale, "i11");
    const i17 = interaction(atomic, locale, "i17");
    const busyFeedback = i11.modePayload.choiceFeedback.find((entry) => entry.responseId.endsWith(":r2"));

    assert.equal(busyFeedback.feedbackByLocale[locale], expectedBusyFeedback[locale]);
  }

  assert.ok(ru.includes(`- busy — *${expectedBusyFeedback.ru}*`));
  assert.ok(uk.includes(`- busy — *${expectedBusyFeedback.uk}*`));
});

test("L01/S52 gives every intro response a specific localized explanation", () => {
  const sources = [
    ["ru", read(path.join(session, "final.ru.md"))],
    ["uk", read(path.join(session, "final.uk.md"))],
  ];
  const expectedCorrectFeedback = {
    ru: [
      "Неделя одна, поэтому `is`; `busy` говорит, что неделя загруженная.",
      "Ночей несколько, поэтому `are`; `quiet` говорит, что ночью тихо.",
      "В этой фразе после `I` нужна `am`; `tired` говорит, что по утрам вы чувствуете усталость.",
    ],
    uk: [
      "Тиждень один, тому `is`; `busy` каже, що тиждень завантажений.",
      "Ночей кілька, тому `are`; `quiet` каже, що вночі тихо.",
      "У цій фразі після `I` потрібне `am`; `tired` каже, що вранці ви відчуваєте втому.",
    ],
  };

  for (const [locale, source] of sources) {
    const introBlocks = source.match(/## Інтро [1-3][\s\S]*?(?=\n---|\n## Завдання)/gu)
      ?? source.match(/## Интро [1-3][\s\S]*?(?=\n---|\n## Задания)/gu);
    assert.equal(introBlocks.length, 3);

    for (const [index, block] of introBlocks.entries()) {
      const responses = block.match(/^- [✅❌].+$/gmu) ?? [];
      assert.ok(responses.length > 0, `${locale} intro ${index + 1} has responses`);
      for (const response of responses) {
        assert.match(response, / — \*[^*]+\*$/u, `${locale} intro ${index + 1} response has specific feedback`);
      }
      assert.ok(block.includes(`- ✅ **${index === 0 ? "The week is busy." : index === 1 ? "The nights are quiet." : "I am tired in the morning."}** — *${expectedCorrectFeedback[locale][index]}*`));
    }
  }
});


test("L01/S52 turns the final Sunday-call repeats into guided context prompts", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  for (const locale of ["ru", "uk"]) {
    for (const suffix of ["i18:s01", "i18:s02", "i18:s03", "i18:s04"]) {
      const item = interaction(atomic, locale, suffix);
      assert.equal(item.family, "scripted_repeat_compare");
      assert.equal(item.purpose, "guided_practice");
      assert.equal(item.prompt, item.accessibilityLabel);
      assert.match(item.prompt, locale === "ru" ? /Мама|воскресенье/u : /Мама|неділю/u);
      assert.doesNotMatch(item.prompt, /одну фразу/u);
    }
  }
});

test("L01/S52 makes intro 2 a substantive, answer-free quiet-night check with localized feedback", () => {
  for (const file of ["final.ru.md", "final.uk.md"]) {
    const source = read(path.join(session, file));
    const intro2 = source.match(/## (?:Интро|Інтро) 2[\s\S]*?(?=\n---)/u)?.[0] ?? "";
    const [body, questionAndChoices] = intro2.split(/\n\*\*/u);
    assert.ok(body.length >= 210, `${file}: intro explanation must precede the question and explain the contrast`);
    assert.match(body, file === "final.ru.md" ? /одн.{0,30}ноч.{0,30}night.{0,30}is[\s\S]*нескольк.{0,30}nights.{0,30}are/u : /одн.{0,30}ніч.{0,30}night.{0,30}is[\s\S]*кільк.{0,30}nights.{0,30}are/u);
    assert.doesNotMatch(body, /The nights are quiet\./u, `${file}: explanation must not reveal the answer before the question`);
    assert.match(questionAndChoices, file === "final.ru.md" ? /несколько тихих ночей/u : /кілька тихих ночей/u);
    assert.match(questionAndChoices, /The nights are quiet\./u);
    assert.match(questionAndChoices, /The nights is quiet\./u);
    assert.match(questionAndChoices, /The night are quiet\./u);
    assert.equal((intro2.match(/^- [✅❌]/gmu) ?? []).length, 3);
    for (const response of intro2.match(/^- [✅❌].+$/gmu) ?? []) assert.match(response, / — \*[^*]+\*$/u);
  }
});

test("L01/S52 shares the detailed quiet scene", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  const expectedScene = {
    ru: "Вставьте слово — мама спрашивает про ночи: за окном не слышно ни машин, ни голосов",
    uk: "Вставте слово — мама питає про ночі: за вікном не чути ні машин, ні голосів",
  };
  for (const locale of ["ru", "uk"]) {
    const i11 = interaction(atomic, locale, "i11");
    assert.deepEqual(i11.modePayload.localizedScene, expectedScene);
  }
});

test("L01/S52 keeps its acoustic contrasts exact and UK-safe", () => {
  for (const file of ["final.ru.md", "final.uk.md"]) {
    const source = read(path.join(session, file));
    assert.match(source, /they[^\n]*\/ð\/[\s\S]*day[^\n]*\/d\//u);
    assert.match(source, /moving[^\n]*\/uːv\/[\s\S]*morning[^\n]*\/ɔːn\//u);
    assert.doesNotMatch(source, /morning[^\n]*(?:spoken|произнос|вимовля)[^\n]*\br\b/iu);
  }
});

test("L01/S52 keeps builders in the Sunday-call context and does not assess off-objective material", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  for (const locale of ["ru", "uk"]) {
    for (const suffix of ["i12", "i15"]) {
      const item = interaction(atomic, locale, suffix);
      assert.match(item.prompt, locale === "ru" ? /маме/u : /мамі/u);
      assert.equal(item.prompt, item.accessibilityLabel);
    }
    assert.equal(interaction(atomic, locale, "i16").purpose, "retrieval_practice");
    assert.equal(interaction(atomic, locale, "i13"), undefined);
    assert.equal(interaction(atomic, locale, "i14"), undefined);
  }
});

test("L01/S52 adds answer-blind independent listening and construction after guided repeats", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  const sourceByLocale = { ru: read(path.join(session, "final.ru.md")), uk: read(path.join(session, "final.uk.md")) };
  const expected = new Map([
    ["i19", { family: "listen_choose", target: "The week is busy.", cue: /как проходит ваша неделя|як минає ваш тиждень/u }],
    ["i20", { family: "phrase_builder", target: "The days are busy.", cue: /дни|дні/u }],
    ["i21", { family: "listen_choose", target: "The nights are quiet.", cue: /ноч[ьи]|ночі/u }],
    ["i22", { family: "phrase_builder", target: "I am tired in the morning.", cue: /утрам|вранці/u }],
  ]);

  for (const locale of ["ru", "uk"]) {
    const guidedLast = interaction(atomic, locale, "i18:s04");
    assert.equal(guidedLast.purpose, "guided_practice");
    for (const [suffix, requirement] of expected) {
      const item = interaction(atomic, locale, suffix);
      assert.ok(item, `${locale} ${suffix} exists after guided practice`);
      assert.equal(item.purpose, "independent_check");
      assert.equal(item.family, requirement.family);
      assert.match(item.prompt, requirement.cue);
      assert.equal(item.prompt, item.accessibilityLabel);
      assert.doesNotMatch(item.prompt, new RegExp(requirement.target.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
      const target = item.modePayload.targetPhrase ?? item.modePayload.referenceAudio?.transcript;
      assert.equal(target, requirement.target);
      assert.ok(item.ordinal > guidedLast.ordinal);
    }
    const markdown = sourceByLocale[locale];
    for (const suffix of expected.keys()) {
      const annotation = new RegExp(`interaction_id: ${id}:${suffix};[^>]*purpose: independent_check`, "u");
      assert.match(markdown, annotation);
    }
  }
});

test("L01/S52 source purpose annotations have exact RU/UK atomic parity and make no unsupported speech-evaluation claim", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  for (const [locale, file] of [["ru", "final.ru.md"], ["uk", "final.uk.md"]]) {
    const tasks = read(path.join(session, file)).matchAll(/<!--\s*interaction_id:\s*([^;]+);([^>]*)-->/gu);
    for (const match of tasks) {
      const purpose = /purpose:\s*([a-z_]+)/u.exec(match[2])?.[1];
      if (!purpose) continue;
      const item = atomic.interactionsByLocale[locale].find((entry) => entry.interactionId === match[1].trim());
      assert.ok(item, `${locale} ${match[1]} projected`);
      assert.equal(item.purpose, purpose, `${locale} ${match[1]} purpose parity`);
    }
    const source = read(path.join(session, file));
    assert.doesNotMatch(source, /(?:independent|самостоятельн|самостійн)[^\n]*(?:voice|acoustic|голос|акуст|вимов)/iu);
    assert.doesNotMatch(source, /(?:voice|acoustic|голос|акуст|вимов)[^\n]*(?:verify|check|провер|перевір)/iu);
  }
});

test("L01/S52 closes the removed-task numbering gap and records the matching modes", () => {
  const expectedHeadings = [
    ["i12", 12], ["i15", 13], ["i16", 14], ["i17", 15],
    ["i18:s01", 16], ["i18:s02", 17], ["i18:s03", 18], ["i18:s04", 19],
    ["i19", 20], ["i20", 21], ["i21", 22], ["i22", 23],
  ];
  const expectedModes = "1=word_card, 2=listen_choose, 3=word_card, 4=listen_choose, 5=word_card, 6=listen_choose, 7=context_gap_grammar, 8=word_card, 9=listen_choose, 10=speed_match, 11=context_gap_grammar, 12=phrase_builder, 13=listen_build_dictation, 14=phrase_builder, 15=context_gap_grammar, 16=scripted_repeat_compare, 17=scripted_repeat_compare, 18=scripted_repeat_compare, 19=scripted_repeat_compare, 20=listen_choose, 21=phrase_builder, 22=listen_choose, 23=phrase_builder";

  for (const file of ["final.ru.md", "final.uk.md"]) {
    const source = read(path.join(session, file));
    for (const [suffix, ordinal] of expectedHeadings) {
      const escaped = `${id}:${suffix}`.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
      assert.match(source, new RegExp(`\\*\\*${ordinal} ·[^\\n]*\\*\\*\\r?\\n<!-- interaction_id: ${escaped};`, "u"), `${file}:${suffix} heading`);
    }
    assert.match(source, new RegExp(`modes: ${expectedModes.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}`, "u"), `${file}: modes`);
    assert.doesNotMatch(source, /\*\*(?:24|25) ·/u, `${file}: no stale physical tasks`);
  }
});

test("L01/S52 projects each Markdown task ordinal into atomic data with the three intro pages", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));

  for (const [locale, file] of [["ru", "final.ru.md"], ["uk", "final.uk.md"]]) {
    const source = read(path.join(session, file));
    const tasks = [...source.matchAll(/\*\*(\d+) ·[^\n]*\*\*\r?\n<!-- interaction_id: ([^;]+);/gu)];
    assert.equal(tasks.length, 23, `${locale}: all physical tasks are present`);

    for (const [, ordinal, interactionId] of tasks) {
      const item = atomic.interactionsByLocale[locale]
        .find((entry) => entry.interactionId === interactionId.trim());
      assert.ok(item, `${locale}:${interactionId}: projected`);
      assert.equal(item.ordinal, Number(ordinal) + 3, `${locale}:${interactionId}: ordinal parity`);
    }
  }
});

test("L01/S52 gives every newly audited correct response and wrong builder tile an exact localized reason", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  const correctFeedback = {
    i11: {
      ru: "Верно: `quiet` значит «тихие»: ночью за окном не слышно ни машин, ни голосов.",
      uk: "Правильно: `quiet` означає «тихі»: уночі за вікном не чути ні машин, ні голосів.",
    },
    i19: {
      ru: "Верно: `week` — одна неделя, поэтому `is`; `busy` значит «занятая, загруженная».",
      uk: "Правильно: `week` — один тиждень, тому `is`; `busy` означає «зайнятий, завантажений».",
    },
    i21: {
      ru: "Верно: `nights` — несколько ночей, поэтому `are`; здесь речь о тихих ночах.",
      uk: "Правильно: `nights` — кілька ночей, тому `are`; тут ідеться про тихі ночі.",
    },
  };
  const tileFeedback = {
    i12: {
      ru: "в этой фразе `days` — несколько дней, поэтому нужна `are`: `The days are busy.`",
      uk: "у цій фразі `days` — кілька днів, тому потрібне `are`: `The days are busy`.",
    },
    i15: {
      ru: "в этой фразе после `It` нужна форма `is`: `It is early in the morning.`",
      uk: "у цій фразі після `It` потрібне `is`: `It is early in the morning`.",
    },
    i16: {
      ru: "в этой фразе после `I` нужна форма `am`: `I am tired in the morning.`",
      uk: "у цій фразі після `I` потрібне `am`: `I am tired in the morning`.",
    },
    i20: {
      ru: "в этой фразе `days` — несколько дней, поэтому нужна `are`: `The days are busy.`",
      uk: "у цій фразі `days` — кілька днів, тому потрібне `are`: `The days are busy`.",
    },
    i22: {
      ru: "в этой фразе после `I` нужна форма `am`: `I am tired in the morning.`",
      uk: "у цій фразі після `I` потрібне `am`: `I am tired in the morning`.",
    },
  };

  for (const locale of ["ru", "uk"]) {
    for (const [suffix, feedbackByLocale] of Object.entries(correctFeedback)) {
      const item = interaction(atomic, locale, suffix);
      const feedback = item.modePayload.choiceFeedback.find((entry) => entry.responseId === `${id}:${suffix}:r1`);
      assert.equal(feedback?.correct, true, `${locale}:${suffix}: correct feedback`);
      assert.equal(feedback?.feedbackByLocale?.[locale], feedbackByLocale[locale], `${locale}:${suffix}: explanation`);
    }
    for (const [suffix, feedbackByLocale] of Object.entries(tileFeedback)) {
      const item = interaction(atomic, locale, suffix);
      const feedback = item.modePayload.slotFeedback.find((entry) => entry.responseId === `${id}:${suffix}:tile:d1`);
      assert.equal(feedback?.correct, false, `${locale}:${suffix}: tile feedback`);
      assert.equal(feedback?.feedbackByLocale?.[locale], feedbackByLocale[locale], `${locale}:${suffix}: explanation`);
    }
  }
});

test("L01/S52 keeps the canonical Markdown and atomic feedback for the correct week choice identical", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  const expected = {
    ru: [
      "Верно: `week` — «неделя».",
      "`Wake` — «просыпаться»: /weɪk/ с /eɪ/, а `week` — /wiːk/ с долгим /iː/.",
      "`Wick` — /wɪk/ с /ɪ/, а `week` — /wiːk/ с /iː/.",
    ],
    uk: [
      "Правильно: `week` — «тиждень».",
      "`Wake` — «прокидатися»: /weɪk/ з /eɪ/, а `week` — /wiːk/ з довгим /iː/.",
      "`Wick` — /wɪk/ з /ɪ/, а `week` — /wiːk/ з /iː/.",
    ],
  };

  for (const [locale, file] of [["ru", "final.ru.md"], ["uk", "final.uk.md"]]) {
    const source = read(path.join(session, file));
    const item = interaction(atomic, locale, "i02");
    for (const [index, explanation] of expected[locale].entries()) {
      const responseId = `${id}:i02:r${index + 1}`;
      const feedback = item.modePayload.choiceFeedback.find((entry) => entry.responseId === responseId);
      assert.ok(source.includes(`- ${["week", "wake", "wick"][index]} — *${explanation}*`), `${locale}:${responseId}: canonical feedback`);
      assert.equal(feedback?.correct, index === 0, `${locale}:${responseId}: correctness`);
      assert.equal(feedback?.feedbackByLocale?.[locale], explanation, `${locale}:${responseId}: atomic feedback`);
    }
  }
});

test("L01/S52 keeps the canonical Markdown and atomic feedback for the day choice identical", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  const expected = {
    ru: [
      "Верно: `day` — «день».",
      "`They` — «они»: начинается со звонкого межзубного /ð/, а `day` — с /d/.",
      "`Dear` — «дорогой»: /dɪə/ с /ɪə/, а `day` — /deɪ/ с /eɪ/.",
    ],
    uk: [
      "Правильно: `day` — «день».",
      "`They` — «вони»: починається з дзвінкого міжзубного /ð/, а `day` — з /d/.",
      "`Dear` — «дорогий»: /dɪə/ з /ɪə/, а `day` — /deɪ/ з /eɪ/.",
    ],
  };

  for (const [locale, file] of [["ru", "final.ru.md"], ["uk", "final.uk.md"]]) {
    const source = read(path.join(session, file));
    const item = interaction(atomic, locale, "i04");
    for (const [index, explanation] of expected[locale].entries()) {
      const responseId = `${id}:i04:r${index + 1}`;
      const feedback = item.modePayload.choiceFeedback.find((entry) => entry.responseId === responseId);
      assert.ok(source.includes(`- ${["day", "they", "dear"][index]} — *${explanation}*`), `${locale}:${responseId}: canonical feedback`);
      assert.equal(feedback?.correct, index === 0, `${locale}:${responseId}: correctness`);
      assert.equal(feedback?.feedbackByLocale?.[locale], explanation, `${locale}:${responseId}: atomic feedback`);
    }
  }
});

test("L01/S52 keeps the canonical Markdown and atomic feedback for the night choice acoustic-only", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  const expected = { ru: ["Верно: `night` — «ночь».", "`Light` начинается с /l/, а `night` — с /n/.", "`New` — /njuː/, а `night` начинается /naɪt/."], uk: ["Правильно: `night` — «ніч».", "`Light` починається з /l/, а `night` — з /n/.", "`New` — /njuː/, а `night` починається /naɪt/."] };
  for (const [locale, file] of [["ru", "final.ru.md"], ["uk", "final.uk.md"]]) {
    const source = read(path.join(session, file)); const item = interaction(atomic, locale, "i06");
    for (const [index, explanation] of expected[locale].entries()) {
      const feedback = item.modePayload.choiceFeedback.find((entry) => entry.responseId === `${id}:i06:r${index + 1}`);
      assert.ok(source.includes(`- ${["night", "light", "new"][index]} — *${explanation}*`), `${locale}:i06:r${index + 1}: source`);
      assert.equal(feedback?.feedbackByLocale?.[locale], explanation, `${locale}:i06:r${index + 1}: atomic`);
    }
  }
});

test("L01/S52 keeps the repaired learner wording identical in source and atomic data", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  const sources = {
    ru: read(path.join(session, "final.ru.md")),
    uk: read(path.join(session, "final.uk.md")),
  };
  const expected = {
    ru: {
      week: "Период из семи дней",
      i15: "Вы звоните маме из новой квартиры. Послушайте запись и соберите услышанную фразу.",
      i19: "Мама спрашивает, как проходит ваша неделя. Послушайте и выберите свой ответ.",
      "i18:s02": "Произнесите ответ маме в воскресенье: она спрашивает, заняты ли дни",
      "i18:s04": "Произнесите ответ маме в воскресенье: она спрашивает, чувствуете ли вы усталость по утрам",
      i20: "Мама спрашивает, заняты ли дни после переезда. Соберите ответ.",
      i21: "Мама спрашивает, тихие ли ночи в новой квартире. Послушайте и выберите ответ.",
      i22: "После долгой недели мама спрашивает, чувствуете ли вы усталость по утрам. Соберите ответ.",
      tired: "по утрам вы чувствуете усталость",
    },
    uk: {
      week: "Період із семи днів",
      i15: "Ви телефонуєте мамі з нової квартири. Послухайте запис і складіть почуту фразу.",
      i19: "Мама питає, як минає ваш тиждень. Послухайте і виберіть свою відповідь.",
      "i18:s02": "Промовте відповідь мамі в неділю: вона питає, чи зайняті дні",
      "i18:s04": "Промовте відповідь мамі в неділю: вона питає, чи відчуваєте ви втому вранці",
      i20: "Мама питає, чи зайняті дні після переїзду. Складіть відповідь.",
      i21: "Мама питає, чи тихі ночі в новій квартирі. Послухайте і виберіть відповідь.",
      i22: "Після довгого тижня мама питає, чи відчуваєте ви втому вранці. Складіть відповідь.",
      tired: "вранці ви відчуваєте втому",
    },
  };

  for (const locale of ["ru", "uk"]) {
    const source = sources[locale];
    assert.match(source, new RegExp(expected[locale].week, "u"), `${locale}: source uses the canonical week explanation`);
    assert.doesNotMatch(source, /Семь дней разом|Сім днів разом/u, `${locale}: source omits the stale week wording`);
    assert.match(source, new RegExp(expected[locale].tired, "u"), `${locale}: source uses gender-neutral tired wording`);
    assert.doesNotMatch(source, locale === "ru" ? /вы уставший|вы устали/u : /ви втомлений|ви втомилися/u, `${locale}: source omits gendered or event-only tired wording`);

    for (const suffix of ["i15", "i18:s02", "i18:s04", "i19", "i20", "i21", "i22"]) {
      const item = interaction(atomic, locale, suffix);
      assert.equal(item.prompt, expected[locale][suffix], `${locale}:${suffix}: atomic prompt`);
      assert.ok(source.includes(`**${item.ordinal - 3} · ${expected[locale][suffix]}**`), `${locale}:${suffix}: Markdown prompt`);
    }
    const atomicText = JSON.stringify(atomic.interactionsByLocale[locale]);
    assert.match(atomicText, new RegExp(expected[locale].week, "u"), `${locale}: atomic week wording`);
    assert.match(atomicText, new RegExp(expected[locale].tired, "u"), `${locale}: atomic tired wording`);
    assert.doesNotMatch(atomicText, locale === "ru" ? /Семь дней разом|вы уставший|вы устали/u : /Сім днів разом|ви втомлений|ви втомилися/u, `${locale}: atomic stale wording`);
  }

  assert.match(sources.uk, /`Moving` — «той, що рухається»/u);
  assert.doesNotMatch(sources.uk, /`Moving` — «рухається»/u);
  assert.match(JSON.stringify(atomic.interactionsByLocale.uk), /`Moving` — «той, що рухається»/u);
});

test("L01/S52 anchors every audited atomic feedback message in its matching canonical Markdown", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  const cited = {
    choice: ["i07", "i11", "i17", "i19", "i21"],
    tile: ["i12", "i15", "i16", "i20", "i22"],
  };

  for (const [locale, file] of [["ru", "final.ru.md"], ["uk", "final.uk.md"]]) {
    const source = read(path.join(session, file));
    for (const suffix of cited.choice) {
      const item = interaction(atomic, locale, suffix);
      const feedback = item.modePayload.choiceFeedback.find((entry) => entry.responseId === `${id}:${suffix}:r1`);
      assert.ok(feedback?.feedbackByLocale?.[locale], `${locale}:${suffix}: correct feedback exists`);
      assert.ok(source.includes(`*${feedback.feedbackByLocale[locale]}*`), `${locale}:${suffix}: correct feedback is canonical`);
    }
    for (const suffix of cited.tile) {
      const item = interaction(atomic, locale, suffix);
      const feedback = item.modePayload.slotFeedback.find((entry) => entry.responseId === `${id}:${suffix}:tile:d1`);
      assert.ok(feedback?.feedbackByLocale?.[locale], `${locale}:${suffix}: tile feedback exists`);
      assert.ok(source.includes(feedback.feedbackByLocale[locale]), `${locale}:${suffix}: tile feedback is canonical`);
    }
  }
});

test("L01/S52 uses full morning meaning, contrastive audio distractors, and neutral cold/quiet feedback", () => {
  const atomic = json(path.join(session, "practice.atomic.json"));
  const expectedAudioFeedback = {
    ru: {
      week: "`Wick` — /wɪk/ с /ɪ/, а `week` — /wiːk/ с /iː/.",
      night: "`Light` начинается с /l/, а `night` — с /n/.",
    },
    uk: {
      week: "`Wick` — /wɪk/ з /ɪ/, а `week` — /wiːk/ з /iː/.",
      night: "`Light` починається з /l/, а `night` — з /n/.",
    },
  };
  const expectedQuietFeedback = {
    ru: "Верно: `nights` — несколько ночей, поэтому `are`; здесь речь о тихих ночах.",
    uk: "Правильно: `nights` — кілька ночей, тому `are`; тут ідеться про тихі ночі.",
  };

  for (const [locale, file] of [["ru", "final.ru.md"], ["uk", "final.uk.md"]]) {
    const source = read(path.join(session, file));
    const i02 = interaction(atomic, locale, "i02");
    const i06 = interaction(atomic, locale, "i06");
    const i17 = interaction(atomic, locale, "i17");
    const i21 = interaction(atomic, locale, "i21");

    assert.deepEqual(i02.responseOptions.map((entry) => entry.text), ["week", "wake", "wick"]);
    assert.deepEqual(i06.responseOptions.map((entry) => entry.text), ["night", "light", "new"]);
    assert.ok(source.includes(expectedAudioFeedback[locale].week));
    assert.ok(source.includes(expectedAudioFeedback[locale].night));
    assert.equal(i02.modePayload.choiceFeedback.find((entry) => entry.responseId.endsWith(":r3")).feedbackByLocale[locale], expectedAudioFeedback[locale].week);
    assert.equal(i06.modePayload.choiceFeedback.find((entry) => entry.responseId.endsWith(":r2")).feedbackByLocale[locale], expectedAudioFeedback[locale].night);
    assert.doesNotMatch(JSON.stringify(i02.modePayload.choiceFeedback), /фитиль|гніт/u);
    assert.doesNotMatch(JSON.stringify(i06.modePayload.choiceFeedback), /«свет»|«світло»/u);
    assert.doesNotMatch(source, /нет финального|немає фінального|На конце|На кінці/u);

    assert.equal(i17.modePayload.gappedTargetPhrase, "I am ___ in the morning.");
    assert.equal(atomic.answers.find((entry) => entry.interactionId === `${id}:i17`).correctText, "tired");
    assert.ok(source.includes("I am ___ in the morning."));
    const cold = i17.modePayload.choiceFeedback.find((entry) => entry.responseId.endsWith(":r3"));
    assert.match(cold.feedbackByLocale[locale], /вам холодно/u);
    assert.doesNotMatch(cold.feedbackByLocale[locale], /замёрз|змерз/u);

    const quiet = i21.modePayload.choiceFeedback.find((entry) => entry.responseId.endsWith(":r1"));
    assert.equal(quiet.feedbackByLocale[locale], expectedQuietFeedback[locale]);
    assert.ok(source.includes(`*${expectedQuietFeedback[locale]}*`));
  }
});
