import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";
import { buildInteraction, introFeedbackContractIssues, parseIntro, slotFeedbackForTask, sourceReleaseSemanticParityIssues } from "./build_release.mjs";
import { projectSinglePhraseRelease } from "./single_phrase_release.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

test("release feedback preserves the complete authored tested dimension", () => {
  const title = "Выберите единственный вариант, который точно передаёт смысл в этой ситуации";
  const optionTask = {
    ordinal: 1,
    title,
    family: "listen_choose",
    options: [
      { text: "is", correct: true, feedback: "Верно." },
      { text: "are", correct: false, feedback: "Здесь не несколько предметов." },
    ],
  };
  const perLocale = {
    ru: { options: optionTask.options },
    uk: { options: optionTask.options },
  };
  const interaction = buildInteraction(optionTask, perLocale, "en/l99/s99", 0, 1);
  assert.deepEqual(
    interaction.modePayload.choiceFeedback.map((entry) => entry.testedDimension),
    [title, title],
  );

  const gap = buildInteraction({ ...optionTask, family: "context_gap_grammar", body: "I ___ ready." }, perLocale, "en/l99/s99", 0, 1);
  assert.equal(gap.modePayload.testedDimension, title);

  const contrast = buildInteraction({ ...optionTask, family: "sound_contrast" }, perLocale, "en/l99/s99", 0, 1);
  assert.equal(contrast.modePayload.testedPhoneticContrast, title);

  const slots = slotFeedbackForTask({
    ordinal: 2,
    title,
    tokens: ["I", "am", "ready", "late"],
  }, {
    ru: { body: "*(плитка `late` лишняя: Здесь говорят о готовности.)*" },
    uk: { body: "*(плитка `late` зайва: Тут говорять про готовність.)*" },
  }, "en/l99/s99", ["I", "am", "ready"]);
  assert.equal(slots[0].testedDimension, title);
});

test("source/release parity rejects changed feedback dimensions and direct gap dimensions", () => {
  const sessionId = "en:lesson-99:session-99";
  const title = "Выберите единственный вариант, который точно передаёт смысл в этой ситуации";
  const makeInteraction = (family) => buildInteraction({
    ordinal: 1,
    title,
    family,
    body: family === "context_gap_grammar" ? "I ___ ready." : "",
    audio: "I am ready.",
    options: [
      { text: "am", correct: true, feedback: "Верно." },
      { text: "are", correct: false, feedback: "Здесь говорят о себе." },
    ],
  }, {
    ru: { options: [
      { text: "am", correct: true, feedback: "Верно." },
      { text: "are", correct: false, feedback: "Здесь говорят о себе." },
    ] },
    uk: { options: [
      { text: "am", correct: true, feedback: "Правильно." },
      { text: "are", correct: false, feedback: "Тут говорять про себе." },
    ] },
  }, sessionId, 0, 1);
  const parityIssues = (sourceInteraction, mutateRelease) => {
    const sourceProjection = projectSinglePhraseRelease({
      interactions: [sourceInteraction],
      answers: [{ interactionId: sourceInteraction.interactionId, correctResponseId: `${sourceInteraction.interactionId}:r1`, correctText: "am" }],
      locale: "ru",
    });
    const releaseInteraction = structuredClone(sourceProjection.interactions[0]);
    mutateRelease(releaseInteraction);
    return sourceReleaseSemanticParityIssues({
      sessionIdentity: "en/l99/s99",
      sessionId,
      atomicSource: {
        schemaVersion: "learning_v2_atomic_practice_source_v1",
        courseSessionId: sessionId,
        interactionsByLocale: { ru: [sourceInteraction] },
        answers: [{ interactionId: sourceInteraction.interactionId, correctResponseId: `${sourceInteraction.interactionId}:r1`, correctText: "am" }],
      },
      sourceIntroByLocale: {},
      releaseIntro: { courseSessionId: sessionId, pages: [] },
      releaseLearnersByLocale: { ru: { courseSessionId: sessionId, interactions: [releaseInteraction] } },
      releaseAnswers: sourceProjection.answers,
      locales: ["ru"],
    });
  };

  const choiceIssues = parityIssues(makeInteraction("listen_choose"), (release) => {
    release.modePayload.choiceFeedback[1].testedDimension = title.slice(0, 40);
  });
  assert.ok(choiceIssues.some((issue) => issue.includes("modePayload.choiceFeedback")), choiceIssues.join("\n"));

  const gapIssues = parityIssues(makeInteraction("context_gap_grammar"), (release) => {
    release.modePayload.testedDimension = title.slice(0, 40);
  });
  assert.ok(gapIssues.some((issue) => issue.includes("modePayload.testedDimension")), gapIssues.join("\n"));
});

test("builder tile explanations are bound to their physical distractor IDs from both localized texts", () => {
  const task = {
    ordinal: 9,
    title: "Соберите фразу",
    tokens: ["I", "am", "here", "ready", "ready"],
  };
  const feedback = slotFeedbackForTask(task, {
    ru: { body: "*(плитка `ready` лишняя: `ready` значит «готов», а здесь сообщают место.)*\n*(плитка `ready` лишняя: второй `ready` тоже не нужен.)*" },
    uk: { body: "*(плитка `ready` зайва: `ready` означає «готовий», а тут повідомляють місце.)*\n*(плитка `ready` зайва: друга `ready` теж не потрібна.)*" },
  }, "en/l01/s01", ["I", "am", "here"]);

  assert.deepEqual(feedback, [
    {
      responseId: "en/l01/s01:i09:tile:d1",
      correct: false,
      testedDimension: "Соберите фразу",
      feedbackByLocale: {
        ru: "`ready` значит «готов», а здесь сообщают место.",
        uk: "`ready` означає «готовий», а тут повідомляють місце.",
      },
    },
    {
      responseId: "en/l01/s01:i09:tile:d2",
      correct: false,
      testedDimension: "Соберите фразу",
      feedbackByLocale: {
        ru: "второй `ready` тоже не нужен.",
        uk: "друга `ready` теж не потрібна.",
      },
    },
  ]);
});

test("intro parser keeps a multiline localized explanation out of the English answer choice", () => {
  const parsePage = (feedback) => parseIntro([
    "## Интро 1",
    "### Проверка",
    "",
    "**Выберите фразу.**",
    "",
    "- ✅ **I am not tired.** — *Этот порядок слов передаёт отрицание правильно.*",
    `- ❌ I am tired not. — *${feedback.first}`,
    `  ${feedback.second}*`,
  ].join("\r\n"))[0];

  const ruPage = parsePage({ first: "Not стоит сразу", second: "после am." });
  const ukPage = parsePage({ first: "Not стоїть одразу", second: "після am." });
  const ru = ruPage.options[1];
  const uk = ukPage.options[1];
  assert.equal(ru.text, "I am tired not.");
  assert.equal(uk.text, "I am tired not.");
  assert.equal(ru.feedback, "Not стоит сразу после am.");
  assert.equal(uk.feedback, "Not стоїть одразу після am.");
  assert.deepEqual(introFeedbackContractIssues({ ru: { intro: [ruPage] }, uk: { intro: [ukPage] } }), []);
});

function makeReady(dir, root) {
  const source = fs.readFileSync(path.join(dir, "final.ru.md"));
  const seedRoot = path.join(root, ".atomic-seed");
  const session = dir.replace(/^.*[\\/]sessions[\\/]/u, "").replaceAll("\\", "/");
  const seeded = spawnSync(process.execPath, [path.join(root, "pipeline/build_release.mjs"), "--session", session, "--locales", "ru,uk", "--out", seedRoot, "--migration-composite-source"], { encoding: "utf8" });
  assert.equal(seeded.status, 0, seeded.stderr + seeded.stdout);
  const snapshot = JSON.parse(fs.readFileSync(path.join(seedRoot, ...session.split("/"), "source.snapshot.json"), "utf8"));
  snapshot.schemaVersion = "learning_v2_atomic_practice_source_v1";
  fs.writeFileSync(path.join(dir, "practice.atomic.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
  const ru = crypto.createHash("sha256").update(source).digest("hex");
  const uk = crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, "final.uk.md"))).digest("hex");
  const atomic = crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, "practice.atomic.json"))).digest("hex");
  const bindings = { sourceSha256: ru, exactRuSha256: ru, exactUkSha256: uk, localeSha256: uk, practiceAtomicSha256: atomic };
  const sessionId = session;
  const ruQuote = "Послушайте и выберите — is";
  const ukQuote = "Послухайте й виберіть — is";
  const receipt = (role, reviewerId, evidence = [{ fieldPath: "final.ru.md", quote: ruQuote, analysis: `Тестовая квитанция ${sessionId} связывает проверку с конкретной фразой текущего исходника.`, coverage: [role] }]) => ({
    verdict: "PASS", sessionId, role, reviewer: { schemaVersion: "learning_v2_reviewer_identity_v1", reviewerId, sessionId, role }, evidence, ...bindings,
  });
  for (const role of ["learner", "pedagogy", "nonsense", "reader"]) {
    const expectedRole = `judge_${role}`;
    fs.writeFileSync(path.join(dir, `final.${expectedRole}.json`), JSON.stringify(receipt(expectedRole, `test-${role}`)));
  }
  fs.writeFileSync(path.join(dir, "final.judge_taste.json"), JSON.stringify({
    ...receipt("judge_taste", "test-taste"),
    pairwise: "equal",
    pairwise_reason: "Материал сравнили с эталоном по ясности, голосу и учебной ценности.",
    voice: { score: 4, evidence: [ruQuote] },
    humor: { present: true, on_topic: true, examples: [ruQuote], misfires: [] },
    ai_text_or_nonsense: [], must_fix: [], verdict: "PASS",
    verdict_reason: "Полная независимая проверка тестового материала завершена.",
  }));
  fs.writeFileSync(path.join(dir, "locales.judge.json"), JSON.stringify({
    ...receipt("judge_locales", "test-locales", [
      { fieldPath: "final.ru.md", quote: ruQuote, analysis: `Русский текст ${sessionId} привязан к текущему исходнику.`, coverage: ["judge_locales", "ru"] },
      { fieldPath: "final.uk.md", quote: ukQuote, analysis: `Украинский текст ${sessionId} привязан к текущему исходнику.`, coverage: ["judge_locales", "uk"] },
    ]),
    localeHashes: { ru, uk }, locales: { uk: { verdict: "PASS" } },
  }));
  fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify({ sourceSha256: ru, exactRuSha256: ru, exactUkSha256: uk, localeHashes: { ru, uk }, practiceAtomicSha256: atomic, converged: true, needsHumanReview: false }));
}

test("release feedback keeps the selected option ID in every locale and answer position", () => {
  const tempParent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(tempParent, "learning-v2-feedback-"));
  try {
    fs.mkdirSync(path.join(root, "pipeline"));
    fs.mkdirSync(path.join(root, "modules/learning-v2/content"), { recursive: true });
    fs.copyFileSync(
      path.resolve(here, "../../../modules/learning-v2/content/learner_visible_text_v1.js"),
      path.join(root, "modules/learning-v2/content/learner_visible_text_v1.js"),
    );
    for (const name of ["build_release.mjs", "practice_explanations_v1.mjs", "single_phrase_release.mjs", "session_header.mjs", "session_readiness.mjs", "owner_quality.mjs", "progression_quality_gate.mjs", "audit_actor_clarity.mjs", "prejudge_choreography.mjs", "write_mockup_file.mjs", "sync_mockup_readiness.mjs", "sync_mockup_source_release_findings.mjs", "sync_mockup_source_quality_findings.mjs"]) fs.copyFileSync(path.join(here, name), path.join(root, "pipeline", name));
    fs.copyFileSync(path.join(here, "build_mockup.mjs"), path.join(root, "pipeline/build_mockup.mjs"));
    fs.copyFileSync(path.join(here, "write_mockup_file.mjs"), path.join(root, "pipeline/write_mockup_file.mjs"));
    const sessionDir = path.join(root, "sessions/en/l02/s33");
    fs.mkdirSync(sessionDir, { recursive: true });
    const labelsByLocale = {
      ru: ["is", "are", "am"],
      uk: ["is", "are", "am"],
    };
    for (const locale of ["ru", "uk"]) {
      const labels = labelsByLocale[locale];
      const introLabels = ["is", "are", "am"];
      const audioByCorrect = ["This is ready.", "They are ready.", "I am ready."];
      const intro = [1, 2, 3].map((n) => `## Интро ${n}\n\n### Вопрос\n\nТекст.\n\n**Выберите.**\n\n- ✅ **${introLabels[0]}** — *${locale}-${introLabels[0]}*\n- ❌ ${introLabels[1]} — *${locale}-${introLabels[1]}*\n- ❌ ${introLabels[2]} — *${locale}-${introLabels[2]}*\n\n---`).join("\n\n");
      const instruction = locale === "uk" ? "Послухайте й виберіть" : "Послушайте и выберите";
      const tasks = [0, 1, 2].map((correct, index) => `**${index + 1} · ${instruction} — ${labels[correct]}**\n<!-- interaction_id: en:lesson-02:session-33:i${String(index + 1).padStart(2, "0")}; family: listen_choose -->\n\n🔊 *${audioByCorrect[correct]}*\n\n` + labels.map((label, i) => i === correct
        ? `- ✅ **${label}** — *${locale}-${label}*`
        : `- ❌ ${label} — *${locale}-${label}*`).join("\n")
        + `\nЗначения вариантов: ${labels.map((label) => `${label} — ${locale}-meaning-${label}`).join(index === 0 ? "; " : " · ")}`
      ).join("\n\n");
      const speedTitle = locale === "uk" ? "З’єднайте пари (Speed Match, 4 пари)" : "Соедините пары (Speed Match, 4 пары)";
      const speed = `**4 · ${speedTitle}**\n<!-- interaction_id: en:lesson-02:session-33:i04; family: speed_match -->\n\none — ${locale}-один · two — ${locale}-два · three — ${locale}-три · four — ${locale}-четыре`;
      const outcomeByLocale = {
        ru: "Научитесь выбирать `is`, `are` или `am` по тому, о ком или о чём говорится.",
        uk: "Навчитеся вибирати `is`, `are` або `am` залежно від того, про кого або про що йдеться.",
      };
      const todayLabel = locale === "uk" ? "Сьогодні" : "Сегодня";
      const newWordsLabel = locale === "uk" ? "Нові слова" : "Новые слова";
      fs.writeFileSync(path.join(sessionDir, `final.${locale}.md`), `# Проверка\n\n**${todayLabel}.** ${outcomeByLocale[locale]}\n**${newWordsLabel}:** —\n\n${intro}\n\n## Практика\n\n${tasks}\n\n${speed}\n\nmodes: 1=listen_choose, 2=listen_choose, 3=listen_choose, 4=speed_match\n`);
    }
    makeReady(sessionDir, root);
    const run = spawnSync(process.execPath, [path.join(root, "pipeline/build_release.mjs"), "--session", "en/l02/s33", "--locales", "ru,uk"], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const out = path.join(root, "release/en/l02/s33");
    const learner = JSON.parse(fs.readFileSync(path.join(out, "learner.json"), "utf8"));
    const learnerUk = JSON.parse(fs.readFileSync(path.join(out, "learner.uk.json"), "utf8"));
    const answers = JSON.parse(fs.readFileSync(path.join(out, "answers.json"), "utf8"));
    const intro = JSON.parse(fs.readFileSync(path.join(out, "intro.json"), "utf8"));
    const auxiliary = JSON.parse(fs.readFileSync(path.join(out, "auxiliary.json"), "utf8"));
    for (const locale of ["ru", "uk"]) {
      const expected = locale === "uk"
        ? "Навчитеся вибирати `is`, `are` або `am` залежно від того, про кого або про що йдеться."
        : "Научитесь выбирать `is`, `are` или `am` по тому, о ком или о чём говорится.";
      assert.equal(intro.learningOutcomeByLocale[locale], expected);
    }
    for (const page of intro.pages) {
      for (const locale of ["ru", "uk"]) {
        for (const choice of page.question.choicesByLocale[locale]) {
          assert.deepEqual(Object.keys(choice).sort(), ["responseId", "text"], "intro option wire keys stay sealed");
        }
      }
      const entry = auxiliary.entries.find((candidate) => candidate.interactionId === page.question.interactionId);
      assert.ok(entry, "intro feedback must travel in the auxiliary channel");
      // Feedback is response-specific learner guidance, not an answer key:
      // every sealed visible response ID must project its authored explanation.
      const optionIds = page.question.choicesByLocale.ru
        .map((choice) => choice.responseId);
      assert.deepEqual(Object.keys(entry.responseFeedbackById), optionIds);
      for (const responseId of optionIds) {
        const index = page.question.choicesByLocale.ru.findIndex((choice) => choice.responseId === responseId);
        assert.deepEqual(entry.responseFeedbackById[responseId], {
          ru: `ru-${page.question.choicesByLocale.ru[index].text}`,
          uk: `uk-${page.question.choicesByLocale.uk[index].text}`,
        });
      }
    }
    assert.equal(learner.interactions.length, 4);
    assert.deepEqual(Object.keys(learnerUk).sort(), Object.keys(learner).sort(), "locale sibling must keep the strict learner child schema");
    for (const [index, interaction] of learner.interactions.slice(0, 3).entries()) {
      const feedback = interaction.modePayload?.choiceFeedback;
      assert.ok(Array.isArray(feedback), "built interaction must expose its feedback entries");
      assert.equal(feedback.length, 3);
      for (const item of feedback) {
        const option = interaction.responseOptions.find((candidate) => candidate.responseId === item.responseId);
        assert.ok(option, "feedback must target a visible option");
        const optionIndex = interaction.responseOptions.findIndex((candidate) => candidate.responseId === item.responseId);
        assert.equal(item.correct, item.responseId === answers[index].correctResponseId, "feedback contract must match the visible option");
        for (const locale of ["ru", "uk"]) assert.equal(item.feedbackByLocale[locale], `${locale}-${labelsByLocale[locale][optionIndex]}`);
      }
      const optionIds = interaction.responseOptions.map((option) => option.responseId);
      assert.deepEqual(feedback.map((item) => item.responseId), optionIds);
      for (const [choiceIndex, choice] of interaction.modePayload.localizedMeaningChoices.entries()) {
        assert.equal(choice.meaningByLocale.ru, `ru-meaning-${labelsByLocale.ru[choiceIndex]}`);
        assert.equal(choice.meaningByLocale.uk, `uk-meaning-${labelsByLocale.uk[choiceIndex]}`);
      }
    }
    assert.deepEqual(learner.interactions.map((interaction) => interaction.prompt), [
      "Послушайте и выберите", "Послушайте и выберите", "Послушайте и выберите", "Соедините пары",
    ]);
    assert.deepEqual(learnerUk.interactions.map((interaction) => interaction.prompt), [
      "Послухайте й виберіть", "Послухайте й виберіть", "Послухайте й виберіть", "З’єднайте пари",
    ]);
    for (const [index, baseInteraction] of learner.interactions.entries()) {
      const localizedInteraction = learnerUk.interactions[index];
      assert.deepEqual(Object.keys(localizedInteraction).sort(), Object.keys(baseInteraction).sort(), "locale interaction must not add wire fields");
      assert.equal(localizedInteraction.interactionId, baseInteraction.interactionId);
      assert.equal(localizedInteraction.family, baseInteraction.family);
      if (index < 3) {
        assert.deepEqual(localizedInteraction.responseOptions.map((option) => option.text), labelsByLocale.uk);
        assert.deepEqual(baseInteraction.responseOptions.map((option) => option.text), labelsByLocale.ru);
        assert.deepEqual(localizedInteraction.modePayload.localizedMeaningChoices.map((choice) => choice.targetText), labelsByLocale.uk);
      }
      assert.equal(baseInteraction.accessibilityLabel, baseInteraction.prompt);
      assert.equal(localizedInteraction.accessibilityLabel, localizedInteraction.prompt);
    }
    const fingerprint = (interactions) => crypto.createHash("sha256").update(JSON.stringify(interactions)).digest("hex");
    assert.equal(learner.learnerFingerprint, fingerprint(learner.interactions));
    assert.equal(learnerUk.learnerFingerprint, fingerprint(learnerUk.interactions));
    assert.notEqual(learnerUk.learnerFingerprint, learner.learnerFingerprint);

    const ukFile = path.join(sessionDir, "final.uk.md");
    const validUk = fs.readFileSync(ukFile, "utf8");
    const rejectedIntroCases = [
      {
        name: "missing-correct-feedback",
        reason: /intro_feedback_contract_hold:.+:page=1:reason=feedback_missing:locale=uk:index=0/u,
        mutate: (source) => source.replace("- ✅ **is** — *uk-is*", "- ✅ **is**"),
      },
      {
        name: "missing-feedback",
        reason: /intro_feedback_contract_hold:.+:page=1:reason=feedback_missing:locale=uk:index=1/u,
        mutate: (source) => source.replace("- ❌ are — *uk-are*", "- ❌ are"),
      },
      {
        name: "option-count",
        reason: /intro_feedback_contract_hold:.+:page=1:reason=option_count/u,
        mutate: (source) => source.replace("\n- ❌ am — *uk-am*", ""),
      },
      {
        name: "correct-index",
        reason: /intro_feedback_contract_hold:.+:page=1:reason=correct_index/u,
        mutate: (source) => source
          .replace("- ✅ **is**", "- ❌ is — *uk-is*")
          .replace("- ❌ are — *uk-are*", "- ✅ **are**"),
      },
      {
        name: "reordered-options",
        reason: /intro_feedback_contract_hold:.+:page=1:reason=option_order:index=1/u,
        mutate: (source) => source
          .replace("- ❌ are — *uk-are*", "- ❌ __TEMP__ — *uk-am*")
          .replace("- ❌ am — *uk-am*", "- ❌ are — *uk-are*")
          .replace("- ❌ __TEMP__ — *uk-am*", "- ❌ am — *uk-am*"),
      },
    ];
    for (const candidate of rejectedIntroCases) {
      const rejectedRoot = path.join(root, `rejected-${candidate.name}`);
      fs.writeFileSync(ukFile, candidate.mutate(validUk));
      const rejected = spawnSync(process.execPath, [path.join(root, "pipeline/build_release.mjs"), "--session", "en/l02/s33", "--locales", "ru,uk", "--out", rejectedRoot], { encoding: "utf8" });
      assert.equal(rejected.status, 1, rejected.stderr || rejected.stdout);
      assert.match(`${rejected.stdout}\n${rejected.stderr}`, candidate.reason);
      assert.equal(fs.existsSync(path.join(rejectedRoot, "en/l02/s33")), false, "HOLD must precede output directory creation");
    }
    fs.writeFileSync(ukFile, validUk);
    const missingLocaleRoot = path.join(root, "rejected-missing-locale");
    fs.unlinkSync(ukFile);
    const missingLocale = spawnSync(process.execPath, [path.join(root, "pipeline/build_release.mjs"), "--session", "en/l02/s33", "--locales", "ru,uk", "--out", missingLocaleRoot], { encoding: "utf8" });
    assert.equal(missingLocale.status, 1, missingLocale.stderr || missingLocale.stdout);
    assert.match(`${missingLocale.stdout}\n${missingLocale.stderr}`, /intro_question_missing:en\/l02\/s33:uk:page=1/u);
    assert.equal(fs.existsSync(path.join(missingLocaleRoot, "en/l02/s33")), false);
    fs.writeFileSync(ukFile, validUk);

    // Private review artifacts may still exercise the missing-locale fallback;
    // every canonical release requires RU+UK and current readiness.
    const fallbackDir = path.join(root, "sessions/en/l02/s32");
    fs.mkdirSync(fallbackDir, { recursive: true });
    for (const locale of ["ru", "uk"]) {
      const copied = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8").replaceAll("session-33", "session-32");
      fs.writeFileSync(path.join(fallbackDir, `final.${locale}.md`), copied);
    }
    makeReady(fallbackDir, root);
    fs.unlinkSync(path.join(fallbackDir, "final.uk.md"));
    const fallbackReviewRoot = path.join(root, "fallback-review");
    const fallbackRun = spawnSync(process.execPath, [
      path.join(root, "pipeline/build_release.mjs"),
      "--session", "en/l02/s32",
      "--locales", "ru",
      "--out", fallbackReviewRoot,
    ], { encoding: "utf8" });
    assert.equal(fallbackRun.status, 0, fallbackRun.stderr || fallbackRun.stdout);
    fs.cpSync(
      path.join(fallbackReviewRoot, "en/l02/s32"),
      path.join(root, "release/en/l02/s32"),
      { recursive: true },
    );
    const preview = spawnSync(process.execPath, [path.join(root, "pipeline/build_mockup.mjs")], { encoding: "utf8" });
    assert.equal(preview.status, 0, preview.stderr || preview.stdout);
    const previewHtml = fs.readFileSync(path.join(root, "mockup/index.html"), "utf8");
    const previewData = JSON.parse(/<script id="data"[^>]*>([\s\S]*?)<\/script>/.exec(previewHtml)[1]);
    const localizedSession = previewData.find((session) => session.session === "s33");
    const externalData = fs.readFileSync(path.join(root, "mockup/data.js"), "utf8");
    assert.deepEqual(JSON.parse(externalData.slice('window.__DATA__ = '.length, -1)), previewData);
    const externalHtml = fs.readFileSync(path.join(root, "mockup/external.html"), "utf8");
    assert.ok(externalHtml.includes('<script src="data.js"></script>'));
    assert.ok(externalHtml.includes('<script src="app.js"></script>'));
    const fallbackSession = previewData.find((session) => session.session === "s32");
    assert.deepEqual(localizedSession.learnerByLocale.uk, learnerUk, "mockup wrapper must collect the Ukrainian strict child");
    assert.deepEqual(localizedSession.auxiliary, auxiliary, "mockup wrapper must carry the separate auxiliary feedback channel");
    assert.equal(fallbackSession.learnerByLocale.uk, undefined, "missing locale child must stay missing in the wrapper");
    const appJs = fs.readFileSync(path.join(root, "mockup/app.js"), "utf8");
    assert.match(appJs, /S\.picked = c\.responseId/u, "intro selection must retain the stable response ID after shuffle");
    assert.match(appJs, /responseFeedbackById\?\.\[S\.picked\]/u, "intro option feedback must resolve by stable response ID");
    assert.match(appJs, /nextRow\(S\.answered && Boolean\(selectedFeedback\)\)/u, "intro navigation must remain fail-closed until the selected answer has feedback");
    const selector = /^const learnerForSession = .+;$/m.exec(appJs)?.[0];
    assert.ok(selector, "mockup must expose one locale-child selector used by every render");
    const select = (session, locale) => {
      const context = { session, locale, result: null };
      vm.runInNewContext(`${selector}\nresult = learnerForSession(session, locale);`, context);
      return context.result;
    };
    assert.equal(select(localizedSession, "uk").interactions[0].prompt, "Послухайте й виберіть");
    assert.equal(select(fallbackSession, "uk").interactions[0].prompt, "Послушайте и выберите");
    assert.equal(/s\.learner\.interactions/.test(appJs), false, "renderers must not bypass locale-child selection");

    const canonicalBeforeRejectedBuild = fs.readFileSync(path.join(out, "learner.json"), "utf8");
    const atomicRu = structuredClone(learner.interactions);
    const divergentUk = structuredClone(learnerUk.interactions);
    divergentUk[0].modePayload.choiceFeedback[0].feedbackByLocale.ru = "расходящийся feedback";
    fs.writeFileSync(path.join(sessionDir, "practice.atomic.json"), JSON.stringify({
      schemaVersion: "learning_v2_atomic_practice_source_v1",
      courseSessionId: "en:lesson-02:session-33",
      interactionsByLocale: { ru: atomicRu, uk: divergentUk },
      answers,
    }));
    const divergentAtomicSha = crypto.createHash("sha256").update(fs.readFileSync(path.join(sessionDir, "practice.atomic.json"))).digest("hex");
    for (const name of ["final.judge_learner.json", "final.judge_pedagogy.json", "final.judge_nonsense.json", "final.judge_reader.json", "final.judge_taste.json", "locales.judge.json", "status.json"]) {
      const file = path.join(sessionDir, name);
      const receipt = JSON.parse(fs.readFileSync(file, "utf8"));
      receipt.practiceAtomicSha256 = divergentAtomicSha;
      fs.writeFileSync(file, JSON.stringify(receipt));
    }
    const divergentBuild = spawnSync(process.execPath, [path.join(root, "pipeline/build_release.mjs"), "--session", "en/l02/s33", "--locales", "ru,uk"], { encoding: "utf8" });
    assert.equal(divergentBuild.status, 1, divergentBuild.stderr || divergentBuild.stdout);
    assert.match(`${divergentBuild.stdout}\n${divergentBuild.stderr}`, /feedback_locale_parity_hold/u);
    assert.equal(fs.readFileSync(path.join(out, "learner.json"), "utf8"), canonicalBeforeRejectedBuild,
      "a rejected cross-locale build must not touch canonical release bytes");

    fs.writeFileSync(path.join(out, "learner.uk.json"), JSON.stringify({ ...learnerUk, interactions: divergentUk }, null, 2));
    const divergentMockup = spawnSync(process.execPath, [path.join(root, "pipeline/build_mockup.mjs")], { encoding: "utf8" });
    assert.equal(divergentMockup.status, 0, divergentMockup.stderr || divergentMockup.stdout);
    assert.match(`${divergentMockup.stdout}\n${divergentMockup.stderr}`, /choice_feedback_locale_map_mismatch/u);
  } finally {
    assert.equal(path.dirname(root), tempParent);
    assert.ok(path.basename(root).startsWith("learning-v2-feedback-"));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
