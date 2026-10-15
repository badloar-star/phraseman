import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s07");
const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");
const data = () => JSON.parse(read("practice.atomic.json"));
const locales = ["ru", "uk"];
const block = (source, interaction) => source.split(`<!-- interaction_id: en:lesson-01:session-07:${interaction};`)[1]?.split(/\r?\n\*\*\d+ ·/u)[0] ?? "";
const localeProjection = (value, locale) => Array.isArray(value) ? value.map((item) => localeProjection(item, locale)) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).flatMap(([key, item]) => key.endsWith("ByLocale") ? [[key, item?.[locale] ?? null]] : [[key, localeProjection(item, locale)]])) : value;

test("L01/S07 retains exactly 18 ordered interactions in both locales", () => {
  const snapshot = data();
  for (const locale of locales) {
    const source = read(`final.${locale}.md`);
    const ids = [...source.matchAll(/<!-- interaction_id: en:lesson-01:session-07:i(\d\d);/gu)].map((match) => Number(match[1]));
    assert.deepEqual(ids, Array.from({ length: 18 }, (_, index) => index + 1), `${locale}: source interaction inventory`);
    assert.equal(snapshot.interactionsByLocale[locale].length, 18, `${locale}: atomic interaction inventory`);
  }
});

test("L01/S07 Ukrainian intros use Ukrainian, neutral learner-facing copy", () => {
  const source = read("final.uk.md");
  const intro1 = source.split("## Інтро 1")[1].split("## Інтро 2")[0];
  const intro2 = source.split("## Інтро 2")[1].split("## Інтро 3")[0];
  const intro3 = source.split("## Інтро 3")[1].split("## Практика")[0];
  assert.match(intro1, /мені приємно/u, "intro 1 glosses glad without gender");
  assert.match(intro1, /Керівник питає/u, "intro 1 scenario is Ukrainian and neutral");
  assert.match(intro2, /більше не хочеться їсти/u, "intro 2 avoids masculine fullness wording");
  assert.match(intro3, /вам не страшно/u, "intro 3 uses Ukrainian neutral phrasing");
  assert.doesNotMatch(`${intro1}\n${intro2}\n${intro3}`, /радий|задоволений|прийшов|наївся|я ще не наївся/u,
    "intros do not assume a masculine learner");
});

test("L01/S07 avoids gendered glosses, condescension, male stereotypes, and unsupported pronunciation", () => {
  const forbidden = {
    ru: /доволен|пришёл|наелся|голоден|устал(?!и)|закончил(?!и)|сытый|сыт,|не сыт/u,
    uk: /радий|задоволений|прийшов|наївся|ситий|голодний|втомився|закінчив/u,
  };
  const unsupportedSpeech = /в записи звучит|звучит `|слышно|чути|чує|«(?:оул|глэд|глед|скерд)»/u;
  const snapshot = data();
  for (const locale of locales) {
    const source = read(`final.${locale}.md`);
    assert.doesNotMatch(source, forbidden[locale], `${locale}: no single-gender learner glosses`);
    assert.doesNotMatch(source, /пещерных людей|печерних людей|англичанин|англієць/u,
      `${locale}: no condescending or male-stereotype copy`);
    assert.doesNotMatch(source, unsupportedSpeech, `${locale}: no unsupported pronunciation/audio claim`);
    assert.doesNotMatch(JSON.stringify(localeProjection(snapshot.interactionsByLocale[locale], locale)), forbidden[locale], `${locale}: atomic glosses are neutral`);
  }
});

test("L01/S07 selectable feedback never explains correct answers", () => {
  const snapshot = data();
  const answers = new Map(snapshot.answers.map((answer) => [answer.interactionId, answer.correctResponseId]));
  for (const locale of locales) for (const interaction of snapshot.interactionsByLocale[locale]) {
    const correctResponseId = answers.get(interaction.interactionId);
    for (const feedback of interaction.modePayload?.choiceFeedback ?? []) {
      assert.notEqual(feedback.correct, true, `${locale}:${interaction.interactionId}: no correct feedback row`);
      assert.notEqual(feedback.responseId, correctResponseId, `${locale}:${interaction.interactionId}: no feedback for correct response`);
    }
  }
  for (const [suffix, correctOption] of [["i02", "glad"], ["i06", "scared"], ["i08", "bored"], ["i10", "lost"], ["i13", "am"]]) {
    for (const locale of locales) assert.doesNotMatch(block(read(`final.${locale}.md`), suffix), new RegExp(`^- ${correctOption} — \\*`, "mu"),
      `${locale}:${suffix}: correct answer has no source explanation`);
  }
});

test("L01/S07 i10 scene makes lost uniquely true without invented distractor feedback", () => {
  const snapshot = data();
  for (const locale of locales) {
    const source = read(`final.${locale}.md`);
    const expected = locale === "ru"
      ? "коллега спрашивает, нужны ли вам подсказки, как найти кабинет 4B. Вы устали после рабочего дня и уже закончили работу, но стоите у правильной двери кабинета 4B."
      : "колега питає, чи потрібні вам підказки, як знайти кабінет 4B. Ви втомилися після робочого дня й уже завершили роботу, але стоїте біля правильних дверей кабінету 4B.";
    assert.match(block(source, "i10"), /^ family: context_gap_grammar -->\r?\nI am not ___ \. → \*\*lost\*\* · tired · done\r?\n/u, `${locale}: i10 keeps target and distractors`);
    assert.ok(source.includes(expected), `${locale}: scene establishes tired and done but not lost`);
    const i10 = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(":i10"));
    const feedback = i10.modePayload.choiceFeedback;
    assert.equal(feedback.length, 2, `${locale}: i10 has only wrong-answer corrections`);
    assert.ok(feedback.some((entry) => /устали после рабочего дня|втомилися після робочого дня/u.test(entry.feedbackByLocale[locale])), `${locale}: tired correction uses established scene fact`);
    assert.ok(feedback.some((entry) => locale === "ru"
      ? /уже закончили работу/u.test(entry.feedbackByLocale[locale])
      : /вже завершили роботу/u.test(entry.feedbackByLocale[locale])), `${locale}: done correction uses established scene fact`);
  }
});

test("L01/S07 i09 explicitly means not bored", () => {
  const snapshot = data();
  const answer = snapshot.answers.find((entry) => entry.interactionId.endsWith(":i09"));
  assert.equal(answer.correctText, "I am not bored.");
  for (const locale of locales) {
    const source = read(`final.${locale}.md`);
    const title = locale === "ru" ? "мне не скучно" : "мені не нудно";
    assert.ok(source.includes(`**9 · ${locale === "ru" ? "Послушайте и соберите" : "Послухайте і складіть"} — «${title}»**`), `${locale}: exact negated bored meaning`);
  }
});

test("L01/S07 i02, i06, i08, i10 and i13 feedback makes no unheard sound claims", () => {
  const snapshot = data();
  const soundClaim = /в записи|у записі|звучит|звучить|слышно|чути|короткое «|коротка й відкрита|ends? (?:on|with)|закінчується на/u;
  for (const locale of locales) for (const suffix of ["i02", "i06", "i08", "i10", "i13"]) {
    const interaction = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(`:${suffix}`));
    for (const row of interaction.modePayload.choiceFeedback ?? []) {
      assert.doesNotMatch(row.feedbackByLocale[locale] ?? "", soundClaim, `${locale}:${suffix}: feedback avoids unheard phonetic claims`);
    }
  }
});

test("L01/S07 every learner-facing atomic field matches its final Markdown projection", async () => {
  const { parsePractice, firstMarkdownAtomicLearnerMismatch } = await import("./build_release.mjs");
  const snapshot = data();
  for (const locale of locales) {
    const tasks = parsePractice(read(`final.${locale}.md`));
    assert.equal(tasks.length, 18, `${locale}: parsed task count`);
    for (const [index, task] of tasks.entries()) {
      const interaction = snapshot.interactionsByLocale[locale][index];
      const answer = snapshot.answers.find((entry) => entry.interactionId === interaction.interactionId);
      assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, locale, answer), null,
        `${locale}:${interaction.interactionId}: exact learner projection`);
    }
  }
});

test("L01/S07 i04, i16 and i18 atomic prompts match their localized Markdown titles", () => {
  const snapshot = data();
  for (const locale of locales) {
    const source = read(`final.${locale}.md`);
    for (const suffix of ["i04", "i16", "i18"]) {
      const ordinal = Number(suffix.slice(1));
      const title = source.match(new RegExp(`^\\*\\*${ordinal} · ([^*]+)\\*\\*$`, "mu"))?.[1];
      const interaction = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(`:${suffix}`));
      assert.ok(title, `${locale}: source ${suffix} title exists`);
      assert.equal(interaction.prompt, title, `${locale}:${suffix}: atomic prompt matches source title`);
      assert.equal(interaction.accessibilityLabel, title, `${locale}:${suffix}: atomic accessibility label matches source title`);
    }
  }
});

test("L01/S07 raw atomic feedback maps are locale-consistent", async () => {
  const { feedbackLocaleParityIssues } = await import("./single_phrase_release.mjs");
  const snapshot = data();
  assert.deepEqual(feedbackLocaleParityIssues(snapshot.interactionsByLocale, { answers: snapshot.answers }), []);
});

test("L01/S07 word-card, match, and i10 nested locale maps are complete and identical", () => {
  const snapshot = data();
  const ukSource = read("final.uk.md");
  assert.match(ukSource, /^## Для збирача$/mu, "UK internal authoring heading is localized");
  assert.match(ukSource, /офіціант пропонує ще порцію/u, "UK café scene uses a natural food phrase");
  assert.match(ukSource, /Робота триває/u, "UK bored gloss uses natural Ukrainian wording");
  const get = (locale, suffix) => snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(`:${suffix}`));
  const i03 = { ru: get("ru", "i03"), uk: get("uk", "i03") };
  const expectedFull = { ru: "еды уже достаточно, больше не хочется.", uk: "їжі вже достатньо, більше не хочеться." };
  for (const projection of Object.values(i03)) {
    assert.deepEqual(projection.modePayload.wordCard.definitionByLocale, expectedFull);
    assert.deepEqual(projection.modePayload.localizedMeaningChoices[0].meaningByLocale, expectedFull);
  }
  const expectedPairs = {
    i12: [
      { ru: "мне приятно", uk: "мені приємно" },
      { ru: "больше не хочется есть", uk: "більше не хочеться їсти" },
      { ru: "мне страшно", uk: "мені страшно" },
      { ru: "мне скучно", uk: "мені нудно" },
    ],
    i17: [
      { ru: "хочется есть", uk: "хочеться їсти" },
      { ru: "нужен отдых", uk: "потрібен відпочинок" },
      { ru: "работа завершена", uk: "роботу завершено" },
      { ru: "всё хорошо", uk: "усе гаразд" },
    ],
  };
  for (const [suffix, expected] of Object.entries(expectedPairs)) {
    for (const locale of locales) {
      const projection = get(locale, suffix);
      assert.deepEqual(projection.modePayload.pairGrid.map((pair) => pair.meaningByLocale), expected, `${locale}:${suffix}: complete bilingual map`);
      assert.deepEqual(projection.modePayload.rightColumn, expected.map((pair) => pair[locale]), `${locale}:${suffix}: localized right column`);
    }
  }
  const expectedScene = {
    ru: "Вставьте слово — коллега спрашивает, нужны ли вам подсказки, как найти кабинет 4B. Вы устали после рабочего дня и уже закончили работу, но стоите у правильной двери кабинета 4B.",
    uk: "Вставте слово — колега питає, чи потрібні вам підказки, як знайти кабінет 4B. Ви втомилися після робочого дня й уже завершили роботу, але стоїте біля правильних дверей кабінету 4B.",
  };
  for (const locale of locales) for (const projection of [get("ru", "i10"), get("uk", "i10")]) {
    assert.deepEqual(projection.modePayload.localizedScene, expectedScene, `${locale}:i10: exact complete locale scene map`);
  }
  const expectedGapScenes = {
    i08: {
      ru: "Вставьте слово — третий час повторяют одни и те же слайды о принтерах; вы смотрите на часы",
      uk: "Вставте слово — третю годину повторюють ті самі слайди про принтери; ви дивитеся на годинник",
    },
    i13: { ru: "Вставьте слово — еды уже достаточно", uk: "Вставте слово — їжі вже достатньо" },
  };
  for (const [suffix, expected] of Object.entries(expectedGapScenes)) for (const locale of locales) {
    for (const projection of [get("ru", suffix), get("uk", suffix)]) {
      assert.deepEqual(projection.modePayload.localizedScene, expected, `${locale}:${suffix}: exact nested scenario map`);
    }
  }
});

test("L01/S07 flat match columns and tested dimensions use each projection's active locale", async () => {
  const { parsePractice } = await import("./build_release.mjs");
  const snapshot = data();
  for (const locale of locales) {
    const source = read(`final.${locale}.md`);
    assert.ok(source.includes(locale === "ru" ? "done — работа завершена" : "done — роботу завершено"), `${locale}: done means completed work`);
    const tasks = parsePractice(source);
    for (const [index, task] of tasks.entries()) {
      const interaction = snapshot.interactionsByLocale[locale][index];
      const payload = interaction.modePayload;
      if (payload.pairGrid) assert.deepEqual(payload.rightColumn, payload.pairGrid.map((pair) => pair.meaningByLocale?.[locale]), `${locale}:${interaction.interactionId}: active-locale right column`);
      if (payload.testedDimension !== undefined) assert.equal(payload.testedDimension, task.title, `${locale}:${interaction.interactionId}: active-locale tested dimension`);
      for (const row of [...(payload.choiceFeedback ?? []), ...(payload.slotFeedback ?? [])]) {
        assert.equal(row.testedDimension, task.title, `${locale}:${interaction.interactionId}:${row.responseId}: active-locale feedback dimension`);
      }
    }
  }
});
