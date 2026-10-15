import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { firstMarkdownAtomicLearnerMismatch, parsePractice, projectSpeedMatchColumnsForLocale } from "./build_release.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-12";
const locales = ["ru", "uk"];
const data = () => JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s12/practice.atomic.json"), "utf8"));
const sessionDir = path.join(root, "sessions/en/l01/s12");
const markdown = (name) => fs.readFileSync(path.join(sessionDir, name), "utf8");

test("L01/S12 gives feedback only after incorrect choices", () => {
  const source = data();
  for (const locale of locales) {
    for (const interaction of source.interactionsByLocale[locale]) {
      for (const item of interaction.modePayload?.choiceFeedback ?? []) {
        if (item.correct) {
          assert.equal(item.feedbackByLocale, undefined, `${locale}:${item.responseId} correct answer must have no explanation`);
          continue;
        }
        assert.ok(item.feedbackByLocale?.ru?.trim(), `${locale}:${item.responseId} missing RU correction`);
        assert.ok(item.feedbackByLocale?.uk?.trim(), `${locale}:${item.responseId} missing UK correction`);
      }
    }
  }
});

test("L01/S12 gives localized feedback for every incorrect choice and tile", () => {
  const source = data();
  const requiredChoiceIds = ["i02:r2", "i02:r3", "i04:r2", "i04:r3", "i05:r2", "i05:r3", "i08:r2", "i09:r2", "i09:r3", "i10:r2", "i10:r3", "i15:r2", "i15:r3"];
  const requiredTileIds = ["i06:tile:d1", "i12:tile:d1", "i13:tile:d1", "i16:tile:d1", "i17:tile:d1"];
  for (const locale of locales) {
    const choices = source.interactionsByLocale[locale].flatMap((item) => item.modePayload?.choiceFeedback ?? []);
    const tiles = source.interactionsByLocale[locale].flatMap((item) => item.modePayload?.slotFeedback ?? []);
    for (const suffix of requiredChoiceIds) {
      const entry = choices.find((item) => item.responseId === `${session}:${suffix}`);
      assert.ok(entry, `${locale}:${suffix} missing`);
      assert.equal(entry.correct, false, `${locale}:${suffix} must be incorrect`);
      assert.ok(entry.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} missing RU correction`);
      assert.ok(entry.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} missing UK correction`);
    }
    for (const suffix of requiredTileIds) {
      const entry = tiles.find((item) => item.responseId === `${session}:${suffix}`);
      assert.ok(entry, `${locale}:${suffix} missing`);
      assert.equal(entry.correct, false, `${locale}:${suffix} must be incorrect`);
      assert.ok(entry.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} missing RU correction`);
      assert.ok(entry.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} missing UK correction`);
    }
  }
});

test("L01/S12 cues make the intended addressee and meaning unambiguous in RU and UK", () => {
  const source = data();
  const get = (locale, suffix) => source.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:${suffix}`);
  for (const locale of locales) {
    const ids = source.interactionsByLocale[locale].map((item) => item.interactionId);
    assert.deepEqual(ids, source.interactionsByLocale.ru.map((item) => item.interactionId), `${locale} interaction order drift`);

    const braveCue = get(locale, "i05").prompt;
    assert.match(braveCue, /побоял|побоял|не реш|заперечити|боялися/i, `${locale} brave cue needs a reason this is brave`);
    assert.doesNotMatch(braveCue, /спокойно|спокійно/i, `${locale} brave cue must not point to calm`);

    assert.match(get(locale, "i17").prompt, /Скажите ему|Скажіть йому/i, `${locale} sure cue must identify Nikita as the addressee`);
    assert.match(get(locale, "i18").prompt, /говорите ему|кажете йому/i, `${locale} right cue must address Nikita directly`);
    assert.match(get(locale, "i20").prompt, /Скажите вслух Лине|Скажіть уголос Ліні/i, `${locale} final cue must address Lina directly`);

    for (const interaction of source.interactionsByLocale[locale]) {
      const responseIds = interaction.responseOptions.map((option) => option.responseId);
      const feedbackIds = (interaction.modePayload?.choiceFeedback ?? []).map((item) => item.responseId).sort();
      assert.deepEqual(feedbackIds, [...responseIds].sort(), `${locale}:${interaction.interactionId} choice feedback coverage drift`);

      const tileFeedback = interaction.modePayload?.slotFeedback ?? [];
      for (const [index] of (interaction.modePayload?.authoredDistractorTokens ?? []).entries()) {
        const responseId = `${interaction.interactionId}:tile:d${index + 1}`;
        const entry = tileFeedback.find((item) => item.responseId === responseId);
        assert.ok(entry && !entry.correct, `${locale}:${responseId} missing incorrect-tile feedback`);
        assert.ok(entry.feedbackByLocale?.ru?.trim(), `${locale}:${responseId} missing RU correction`);
        assert.ok(entry.feedbackByLocale?.uk?.trim(), `${locale}:${responseId} missing UK correction`);
      }

      const canonical = source.interactionsByLocale.ru.find((item) => item.interactionId === interaction.interactionId);
      assert.deepEqual(interaction.responseOptions.map(({ responseId, text }) => ({ responseId, text })), canonical.responseOptions.map(({ responseId, text }) => ({ responseId, text })), `${locale}:${interaction.interactionId} response order or text drift`);
      assert.equal(interaction.modePayload?.targetPhrase ?? interaction.modePayload?.hiddenTargetPhrase ?? interaction.modePayload?.referenceAudio?.transcript,
        canonical.modePayload?.targetPhrase ?? canonical.modePayload?.hiddenTargetPhrase ?? canonical.modePayload?.referenceAudio?.transcript,
        `${locale}:${interaction.interactionId} target drift`);
      assert.deepEqual(interaction.modePayload?.orderedTokens, canonical.modePayload?.orderedTokens, `${locale}:${interaction.interactionId} tile order drift`);
      assert.deepEqual(interaction.modePayload?.authoredDistractorTokens, canonical.modePayload?.authoredDistractorTokens, `${locale}:${interaction.interactionId} distractor tile drift`);
    }
  }
});

test("L01/S12 keeps correct tile answers free of learner-facing explanations", () => {
  for (const name of ["final.ru.md", "final.uk.md"]) {
    const text = markdown(name);
    assert.doesNotMatch(text, /^\*\(плитка .* зайва:.*\)$/m, `${name} explains unused tiles after the answer`);
    assert.doesNotMatch(text, /^\*\(плитка .* зайве:.*\)$/m, `${name} explains unused tiles after the answer`);
  }
});

test("L01/S12 i05 atomic feedback matches both learner locales", () => {
  const source = data();
  for (const locale of locales) {
    const finalText = markdown(locale === "ru" ? "final.ru.md" : "final.uk.md");
    const rows = source.interactionsByLocale[locale]
      .find((item) => item.interactionId === `${session}:i05`)
      .modePayload.choiceFeedback;
    for (const [suffix, label] of [["r2", "calm"], ["r3", "tired"]]) {
      const feedback = rows.find((item) => item.responseId === `${session}:i05:${suffix}`).feedbackByLocale[locale];
      assert.equal(feedback, finalText.match(new RegExp(`^- ${label} — \\*(.*?)\\*$`, "m"))?.[1], `${locale}:i05:${suffix} feedback drift`);
    }
  }
});

test("L01/S12 i15 feedback is limited to present-tense I am and intro2 names the colleague", () => {
  const source = data();
  const expected = {
    ru: "`are` — для `you`. В настоящем времени с `I` используйте `am`.",
    uk: "`are` — для `you`. У теперішньому часі з `I` вживайте `am`.",
  };
  for (const locale of locales) {
    const interaction = source.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:i15`);
    const feedback = interaction.modePayload.choiceFeedback.find((item) => item.responseId.endsWith(":r2")).feedbackByLocale[locale];
    assert.equal(feedback, expected[locale]);
    assert.doesNotMatch(feedback, /всегда `am`|завжди `am`/i);
    const finalText = markdown(locale === "ru" ? "final.ru.md" : "final.uk.md");
    assert.doesNotMatch(finalText, /Коллега один|Колега один/);
    assert.match(finalText, locale === "ru"
      ? /Ваш коллега сказал начальнику, что тот неправ\. Обратитесь к коллеге:/
      : /Ваш колега сказав начальнику, що той неправий\. Зверніться до колеги:/);
  }
});

test("L01/S12 i15 scene explicitly cues a first-person statement with the ticket detail", () => {
  const source = data();
  const expected = {
    ru: "Вставьте слово — вы проверили время отправления в билете и хотите сказать о себе: «Я уверен/уверена»",
    uk: "Вставте слово — ви перевірили час відправлення в квитку й хочете сказати про себе: «Я впевнений/впевнена»",
  };
  for (const locale of locales) {
    const interaction = source.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:i15`);
    const finalText = markdown(locale === "ru" ? "final.ru.md" : "final.uk.md");
    const title = parsePractice(finalText).find((task) => task.interactionId === `${session}:i15`).title;
    assert.equal(title, expected[locale]);
    assert.equal(interaction.prompt, expected[locale]);
    assert.equal(interaction.accessibilityLabel, expected[locale]);
    assert.equal(interaction.modePayload.localizedScene[locale], expected[locale]);
    assert.equal(interaction.modePayload.testedDimension, expected[locale]);
    for (const row of interaction.modePayload.choiceFeedback) assert.equal(row.testedDimension, expected[locale]);
    assert.match(expected[locale], /час відправлення в квитку|время отправления в билете/u);
    assert.match(expected[locale], /сказать о себе|сказати про себе/u);
    assert.doesNotMatch(expected[locale], /ви впевнені в ньому|вы уверены в нём/u);
  }
});

test("L01/S12 self-descriptions use paired genders for calm, brave, and i19 meanings", () => {
  const source = data();
  const expected = {
    ru: {
      i06: "Соберите фразу — «я спокоен/спокойна» (про себя)",
      i19: ["устал/устала", "уверен/уверена", "тихий/тихая", "Ты прав/права."],
      brave: "я смелый/смелая",
    },
    uk: {
      i06: "Складіть фразу — «я спокійний/спокійна» (про себе)",
      i19: ["втомлений/втомлена", "впевнений/впевнена", "тихий/тиха", "Ти маєш рацію."],
      brave: "я сміливий/смілива",
    },
  };
  for (const locale of locales) {
    const finalText = markdown(locale === "ru" ? "final.ru.md" : "final.uk.md");
    const task6 = parsePractice(finalText).find((task) => task.interactionId === `${session}:i06`);
    const task15 = parsePractice(finalText).find((task) => task.interactionId === `${session}:i15`);
    assert.equal(task6.title, expected[locale].i06);
    const atomic6 = source.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:i06`);
    assert.equal(atomic6.prompt, expected[locale].i06);
    assert.equal(atomic6.accessibilityLabel, expected[locale].i06);
    assert.equal(atomic6.modePayload.localizedMeaning[locale], expected[locale].i06);
    assert.equal(atomic6.modePayload.slotFeedback[0].testedDimension, expected[locale].i06);
    assert.ok(task15.title.includes(locale === "ru" ? "Я уверен/уверена" : "Я впевнений/впевнена"));
    const match = parsePractice(finalText).find((task) => task.interactionId === `${session}:i19`);
    assert.deepEqual(match.pairs.map((pair) => pair.meaning), expected[locale].i19);
    const atomic19 = source.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:i19`);
    assert.deepEqual(atomic19.modePayload.pairGrid.map((pair) => pair.meaningByLocale[locale]), expected[locale].i19);
    for (const item of expected[locale].i19.slice(0, 3)) assert.ok(item.includes("/"));
    assert.match(finalText, new RegExp(`«${expected[locale].brave}»`, "u"));
    assert.doesNotMatch(finalText, locale === "ru" ? /«я смелый»/u : /«я сміливий»/u);
  }
});

test("L01/S12 i19 maps the complete You are right phrase consistently", () => {
  const source = data();
  const expected = {
    ru: { prompt: "Соедините пары — слова и фразы, которые уже ваши", meaning: "Ты прав/права." },
    uk: { prompt: "З'єднайте пари — слова й фрази, які вже ваші", meaning: "Ти маєш рацію." },
  };
  for (const locale of locales) {
    const finalText = markdown(locale === "ru" ? "final.ru.md" : "final.uk.md");
    const parsed = parsePractice(finalText).find((task) => task.interactionId === `${session}:i19`);
    const interaction = source.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:i19`);
    const p4 = interaction.modePayload.pairGrid[3];
    assert.equal(parsed.title, expected[locale].prompt);
    assert.equal(interaction.prompt, expected[locale].prompt);
    assert.equal(interaction.accessibilityLabel, expected[locale].prompt);
    assert.equal(parsed.pairs[3].target, "You are right.");
    assert.equal(parsed.pairs[3].meaning, expected[locale].meaning);
    assert.equal(p4.target, "You are right.");
    assert.deepEqual(p4.meaningByLocale, { ru: "Ты прав/права.", uk: "Ти маєш рацію." });
    assert.equal(interaction.modePayload.leftColumn[3], "You are right.");
    assert.equal(interaction.modePayload.rightColumn[3], expected[locale].meaning);
    assert.doesNotMatch(finalText, /(?:^|\s)right\s*[—-]\s*маєш рацію/u);
    const answer = source.answers.find((item) => item.interactionId === `${session}:i19`).correctText;
    assert.match(answer, /p4=You are right\.$/u);
  }
});

test("L01/S12 UK i19 uses natural втомлений spelling in the learner projection", () => {
  const source = data();
  const finalText = markdown("final.uk.md");
  const projected = projectSpeedMatchColumnsForLocale(structuredClone(source.interactionsByLocale.uk), "uk")
    .find((item) => item.interactionId === `${session}:i19`);
  assert.equal(source.interactionsByLocale.uk.find((item) => item.interactionId === `${session}:i19`).modePayload.pairGrid[0].meaningByLocale.uk, "втомлений/втомлена");
  assert.equal(projected.modePayload.rightColumn[0], "втомлений/втомлена");
  assert.match(finalText, /tired — втомлений\/втомлена/u);
  assert.doesNotMatch(finalText, /утомлений\/утомлена/u);
  assert.doesNotMatch(projected.modePayload.rightColumn.join(" "), /утомлений\/утомлена/u);
});

test("L01/S12 i09 and i12 address Nina directly in RU and UK", () => {
  const source = data();
  const expected = {
    ru: {
      i09: "Вставьте слово — Нина прямо сказала клиенту, что сроки сорваны; обратитесь к Нине напрямую: «ты честная»",
      i12: "Соберите фразу — Нина прямо сказала клиенту, что сроки сорваны; обратитесь к Нине напрямую: «ты честная»",
    },
    uk: {
      i09: "Вставте слово — Ніна прямо сказала клієнту, що команда не вклалася у встановлений строк; зверніться до Ніни напряму: «ти чесна»",
      i12: "Складіть фразу — Ніна прямо сказала клієнту, що команда не вклалася у встановлений строк; зверніться до Ніни напряму: «ти чесна»",
    },
  };
  for (const locale of locales) {
    const finalText = markdown(locale === "ru" ? "final.ru.md" : "final.uk.md");
    const tasks = parsePractice(finalText);
    for (const suffix of ["i09", "i12"]) {
      const interaction = source.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:${suffix}`);
      const title = expected[locale][suffix];
      assert.equal(tasks.find((task) => task.interactionId === `${session}:${suffix}`).title, title);
      assert.equal(interaction.prompt, title);
      assert.equal(interaction.accessibilityLabel, title);
      assert.doesNotMatch(title, /что она честная|що вона чесна/u);
      if (suffix === "i09") assert.equal(interaction.modePayload.localizedScene[locale], title);
      if (suffix === "i12") assert.equal(interaction.modePayload.localizedMeaning[locale], title);
    }
  }
});

test("L01/S12 UK learner projection keeps task metadata Ukrainian and preserves ticket context", () => {
  const source = data();
  const atomicProjection = structuredClone(source.interactionsByLocale.uk);
  const buildProjection = projectSpeedMatchColumnsForLocale(structuredClone(source.interactionsByLocale.uk), "uk");
  const noRussian = (value, label) => assert.doesNotMatch(value, /(?:Нина|Послушайте|Соберите|Выберите|Здесь говорят|Оберіть потрібне слово для фразы)/u, label);
  const expected = {
    i08: ["choiceFeedback", "Порівняйте початки слів `smart` і `start`."],
    i09: ["choiceFeedback", "Вставте слово — Ніна прямо сказала клієнту, що команда не вклалася у встановлений строк; зверніться до Ніни напряму: «ти чесна»"],
    i10: ["choiceFeedback", "Послухайте і виберіть — smart"],
    i12: ["slotFeedback", "Складіть фразу — Ніна прямо сказала клієнту, що команда не вклалася у встановлений строк; зверніться до Ніни напряму: «ти чесна»"],
    i13: ["slotFeedback", "Послухайте й складіть — Микита знайшов рішення; скажіть йому: «ти розумний»"],
    i15: ["choiceFeedback", "Вставте слово — ви перевірили час відправлення в квитку й хочете сказати про себе: «Я впевнений/впевнена»"],
    i16: ["slotFeedback", "Послухайте й складіть — у бібліотеці Ліна говорить упівголоса; скажіть: «ти тиха»"],
  };
  for (const [projectionName, items] of [["atomic", atomicProjection], ["build", buildProjection]]) {
    const interaction = (suffix) => items.find((item) => item.interactionId === `${session}:${suffix}`);
    const dimension = (suffix, field) => interaction(suffix).modePayload[field][0].testedDimension;
    for (const [suffix, [field, expectedText]] of Object.entries(expected)) {
      assert.equal(dimension(suffix, field), expectedText, `${projectionName}:uk:${suffix}:testedDimension`);
      const item = interaction(suffix);
      noRussian(item.prompt, `${projectionName}:uk:${suffix}:prompt`);
      noRussian(item.modePayload.testedDimension ?? "", `${projectionName}:uk:${suffix}:testedDimension`);
      for (const row of [...(item.modePayload.choiceFeedback ?? []), ...(item.modePayload.slotFeedback ?? [])]) {
        noRussian(row.testedDimension ?? "", `${projectionName}:uk:${suffix}:feedback testedDimension`);
      }
    }
    assert.equal(interaction("i15").modePayload.testedDimension, "Вставте слово — ви перевірили час відправлення в квитку й хочете сказати про себе: «Я впевнений/впевнена»");
    const scene = interaction("i15").modePayload.localizedScene;
    assert.match(scene.uk ?? scene, /час відправлення в квитку/u, `${projectionName}:i15 must retain ticket context`);
  }
  const ruExpected = {
    i08: ["choiceFeedback", "smart или start"],
    i09: ["choiceFeedback", "Вставьте слово — Нина прямо сказала клиенту, что сроки сорваны; обратитесь к Нине напрямую: «ты честная»"],
    i10: ["choiceFeedback", "Послушайте и выберите — smart"],
    i12: ["slotFeedback", "Соберите фразу — Нина прямо сказала клиенту, что сроки сорваны; обратитесь к Нине напрямую: «ты честная»"],
    i13: ["slotFeedback", "Послушайте и соберите — Никита нашёл решение; скажите ему: «ты умный»"],
    i15: ["choiceFeedback", "Вставьте слово — вы проверили время отправления в билете и хотите сказать о себе: «Я уверен/уверена»"],
    i16: ["slotFeedback", "Послушайте и соберите — в библиотеке Лина говорит вполголоса; скажите: «ты тихая»"],
  };
  for (const [suffix, [field, expectedText]] of Object.entries(ruExpected)) {
    const item = source.interactionsByLocale.ru.find((entry) => entry.interactionId === `${session}:${suffix}`);
    assert.equal(item.modePayload[field][0].testedDimension, expectedText, `ru:${suffix}:testedDimension`);
  }
});

test("L01/S12 i04 ordered options retain their own error-specific feedback", () => {
  const source = data();
  const expected = [
    ["brain", {
      ru: "Слова `brain` и `brave` начинаются одинаково; слушайте конец: n или v.",
      uk: "Слова `brain` і `brave` починаються однаково; слухайте кінець: n чи v.",
    }],
    ["grave", {
      ru: "Слушайте первый звук: `brave` начинается с b, `grave` — с g.",
      uk: "Слухайте перший звук: `brave` починається з b, `grave` — з g.",
    }],
  ];
  for (const locale of locales) {
    const interaction = source.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:i04`);
    const mapped = interaction.responseOptions.slice(1).map((option) => [
      option.text,
      interaction.modePayload.choiceFeedback.find((item) => item.responseId === option.responseId).feedbackByLocale[locale],
    ]);
    assert.deepEqual(mapped, expected.map(([option, feedback]) => [option, feedback[locale]]), `${locale}: i04 option/feedback mapping drift`);
  }
});

test("L01/S12 actor and UK glosses stay consistent with their scenes", () => {
  for (const [file, feedback] of [
    ["final.ru.md", "`I am` говорят о себе: «я смелый/смелая». Здесь вы обращаетесь к коллеге — `you are`."],
    ["final.uk.md", "`I am` кажуть про себе: «я сміливий/смілива». Тут ви звертаєтеся до колеги — `you are`."],
  ]) {
    assert.ok(markdown(file).includes(feedback), `${file} must explain I vs you without changing the actor`);
  }
  const uk = markdown("final.uk.md");
  assert.match(uk, /`right` — «маєш рацію»/);
  assert.match(uk, /You are right\. — Ти маєш рацію\./);
  assert.doesNotMatch(uk, /right — правий|`right` — «правий»/);
  assert.doesNotMatch(uk, /про неголосний голос/);
});

test("L01/S12 brave describes the person and i05 feedback matches the stated scene", () => {
  for (const file of ["final.ru.md", "final.uk.md"]) {
    const source = markdown(file);
    const card = source.match(/interaction_id: en:lesson-01:session-12:i03;[\s\S]*?(?=\r?\n\r?\n\*\*4)/)?.[0] ?? "";
    assert.doesNotMatch(card, /не про характер|а не про характер/iu, `${file}: brave must not be framed as act-only`);
    assert.match(card, /смел(?:ый|ый)|смілив(?:ий|ий)/iu);
    const i05 = source.match(/interaction_id: en:lesson-01:session-12:i05;[\s\S]*?(?=\r?\n\r?\n\*\*6)/)?.[0] ?? "";
    assert.doesNotMatch(i05, /возраз|запереч/iu, `${file}: do not invent an objection`);
  }
});

test("L01/S12 UK missed-deadline wording is idiomatic and fully synchronized", () => {
  const uk = markdown("final.uk.md");
  assert.match(uk, /не вклалася у встановлений строк/);
  assert.doesNotMatch(uk, /термін зірвано|терміни зірвані/);
  const source = data();
  for (const locale of locales) {
    const i05 = source.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:i05`);
    for (const entry of i05.modePayload.choiceFeedback.filter((item) => item.correct === false)) {
      assert.doesNotMatch(entry.feedbackByLocale[locale], /возраз|запереч/iu, `${locale}:i05 invented objection`);
    }
  }
  const ukInteractions = source.interactionsByLocale.uk;
  assert.ok(ukInteractions.find((item) => item.interactionId === `${session}:i05`).prompt.includes("не вклалася у встановлений строк"));
  assert.ok(ukInteractions.find((item) => item.interactionId === `${session}:i09`).prompt.includes("не вклалася у встановлений строк"));
  assert.ok(ukInteractions.find((item) => item.interactionId === `${session}:i12`).prompt.includes("не вклалася у встановлений строк"));
});

test("L01/S12 listening distractor feedback addresses the relevant sound contrast", () => {
  const source = data();
  const expected = {
    i02: {
      r2: ["В `come` другая гласная, чем в `calm`; слушайте гласную.", "У `come` інша голосна, ніж у `calm`; слухайте голосну."],
      r3: ["В `calm` на конце слышен m; у `car` этого звука нет. Слушайте конец слова.", "У `calm` наприкінці чути m; у `car` цього звука немає. Слухайте кінець слова."],
    },
    i04: {
      r2: ["Слова `brain` и `brave` начинаются одинаково; слушайте конец: n или v.", "Слова `brain` і `brave` починаються однаково; слухайте кінець: n чи v."],
      r3: ["Слушайте первый звук: `brave` начинается с b, `grave` — с g.", "Слухайте перший звук: `brave` починається з b, `grave` — з g."],
    },
  };
  for (const locale of locales) {
    for (const [interactionId, options] of Object.entries(expected)) {
      const interaction = source.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:${interactionId}`);
      for (const [suffix, byLocale] of Object.entries(options)) {
        const option = interaction.responseOptions.find((item) => item.responseId.endsWith(`:${suffix}`));
        const entry = interaction.modePayload.choiceFeedback.find((item) => item.responseId === option.responseId);
        assert.equal(entry.feedbackByLocale[locale], byLocale[locale === "ru" ? 0 : 1], `${locale}:${interactionId}:${suffix}`);
      }
    }
  }
});

test("L01/S12 smart/start/small feedback names the sound segment being tested", () => {
  const source = data();
  const expected = {
    i08: { r2: [
      "После начального s в `smart` идет m, а в `start` — t; слушайте начало слова.",
      "Після початкового s у `smart` далі m, а у `start` — t; слухайте початок слова.",
    ] },
    i10: {
      r2: [
        "После начального s в `smart` идет m, а в `start` — t; слушайте начало слова.",
        "Після початкового s у `smart` далі m, а у `start` — t; слухайте початок слова.",
      ],
      r3: [
        "На слух различайте окончания: `smart` заканчивается на t, а `small` — на l.",
        "На слух розрізняйте закінчення: `smart` закінчується на t, а `small` — на l.",
      ],
    },
  };
  for (const locale of locales) {
    for (const [suffix, responses] of Object.entries(expected)) {
      const interaction = source.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:${suffix}`);
      for (const [responseSuffix, texts] of Object.entries(responses)) {
        const option = interaction.responseOptions.find((item) => item.responseId.endsWith(`:${responseSuffix}`));
        const entry = interaction.modePayload.choiceFeedback.find((item) => item.responseId === option.responseId);
        assert.equal(entry.feedbackByLocale[locale], texts[locale === "ru" ? 0 : 1], `${locale}:${suffix}:${responseSuffix}`);
      }
    }
  }
});

test("L01/S12 i08 prompt tests the audible initial contrast, not word meaning", () => {
  const source = data();
  const expected = {
    ru: "Послушайте начало слов: в каком после s слышится m?",
    uk: "Прослухайте початок слів: у якому після s чути m?",
  };
  for (const locale of locales) {
    const interaction = source.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:i08`);
    assert.equal(interaction.prompt, expected[locale]);
    assert.equal(interaction.modePayload.testedPhoneticContrast, expected[locale]);
    assert.doesNotMatch(interaction.prompt, /умн|розумн|means|означає|означает/i);
    const task = parsePractice(markdown(`final.${locale}.md`)).find((item) => item.interactionId === `${session}:i08`);
    assert.equal(task.title, expected[locale]);
  }
});

test("L01/S12 all RU/UK learner fields match the build-release projection", () => {
  const source = data();
  const answers = new Map(source.answers.map((answer) => [answer.interactionId, answer]));
  for (const locale of locales) {
    const tasks = parsePractice(markdown(`final.${locale}.md`));
    const interactions = source.interactionsByLocale[locale];
    assert.equal(tasks.length, 20, `${locale}: expected 20 parsed practice interactions`);
    assert.equal(interactions.length, tasks.length, `${locale}: parsed/atomic interaction count drift`);
    tasks.forEach((task, index) => {
      const interaction = interactions[index];
      const mismatch = firstMarkdownAtomicLearnerMismatch(task, interaction, locale, answers.get(interaction.interactionId));
      assert.equal(mismatch, null, `${locale}:${interaction.interactionId} learner parity mismatch: ${mismatch}`);
    });
  }
});

test("L01/S12 locale batch is byte-for-byte synchronized with final.uk", () => {
  assert.equal(markdown("locales_batch.md"), `===LOCALE: uk===\n${markdown("final.uk.md").trim()}\n`);
});

test("L01/S12 UK tile prompts use Ukrainian wording", () => {
  const uk = markdown("final.uk.md");
  assert.doesNotMatch(uk, /Слова для фразы/);
  for (const suffix of ["i13", "i16", "i17"]) {
    const interaction = uk.match(new RegExp(`interaction_id: en:lesson-01:session-12:${suffix};[\\s\\S]*?(?=\\r?\\n\\r?\\n\\*\\*\\d+|\\r?\\n---)`))?.[0];
    assert.ok(interaction, `final.uk.md missing ${suffix}`);
    assert.match(interaction, /Слова для фрази/);
  }
});

test("L01/S12 selected word and sound tasks avoid unsupported pronunciation claims", () => {
  const source = data();
  const selected = ["i01", "i02", "i04", "i07", "i08", "i10"];
  const pronunciationClaim = /каам|брейв|гласн\w*\s+(?:длинн|довг)|(?:буква|літера)\s+.{0,30}(?:не произнос|не вимовля|молчит|німа)|(?:звучит|звучить|читается|кажуть)\s+[«“]/i;
  for (const locale of locales) {
    for (const suffix of selected) {
      const interaction = source.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:${suffix}`);
      const learnerText = [
        interaction.modePayload.wordCard?.definitionByLocale?.[locale],
        ...(interaction.modePayload.localizedMeaningChoices ?? []).map((choice) => choice.meaningByLocale?.[locale]),
        ...(interaction.modePayload.choiceFeedback ?? []).map((choice) => choice.feedbackByLocale?.[locale]),
      ].filter(Boolean).join(" ");
      assert.doesNotMatch(learnerText, pronunciationClaim, `${locale}:${suffix} contains unsupported pronunciation guidance`);
    }
  }
});
