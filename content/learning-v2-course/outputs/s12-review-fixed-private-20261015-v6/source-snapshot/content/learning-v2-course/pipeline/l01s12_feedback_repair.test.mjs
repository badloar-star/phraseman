import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { firstMarkdownAtomicLearnerMismatch, parsePractice } from "./build_release.mjs";

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
    ["final.ru.md", "`I am` говорят о себе: «я смелый». Здесь вы обращаетесь к коллеге — `you are`."],
    ["final.uk.md", "`I am` кажуть про себе: «я сміливий». Тут ви звертаєтеся до колеги — `you are`."],
  ]) {
    assert.ok(markdown(file).includes(feedback), `${file} must explain I vs you without changing the actor`);
  }
  const uk = markdown("final.uk.md");
  assert.match(uk, /`right` — «маєш рацію»/);
  assert.match(uk, /right — маєш рацію/);
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
