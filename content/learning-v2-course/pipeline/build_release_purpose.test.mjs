import assert from "node:assert/strict";
import test from "node:test";
import { atomicMarkdownParityIssues, buildInteraction, parsePractice } from "./build_release.mjs";

test("build release preserves an allowed authored purpose and never classifies repeat-and-compare as independent", () => {
  const markdown = `## Задания

**1 · Произнесите одну фразу**
<!-- interaction_id: en:lesson-01:session-52:i18:s01; purpose: guided_practice -->
Скажите маме о воскресном звонке.

🎙 **The week is busy.**

modes: 1=scripted_repeat_compare
`;
  const task = parsePractice(markdown)[0];
  assert.equal(task.purpose, "guided_practice");
  const interaction = buildInteraction(task, {
    ru: { title: "Скажите маме о воскресном звонке." },
    uk: { title: "Скажіть мамі про недільний дзвінок." },
  }, "en:lesson-01:session-52", 99, 100);
  assert.equal(interaction.purpose, "guided_practice");
  assert.notEqual(interaction.purpose, "independent_check");
});

test("practice annotations accept purpose in either key order, retain it through interaction construction, and reject invalid purposes", () => {
  const markdown = `## Задания

**1 · Соберите фразу**
<!-- interaction_id: en:lesson-01:session-52:i19; purpose: independent_check; family: phrase_builder -->
Плитки: \`The\` \`week\` \`is\` \`busy\` → **The week is busy.**

**2 · Соберите фразу**
<!-- interaction_id: en:lesson-01:session-52:i20; family: phrase_builder; purpose: retrieval_practice -->
Плитки: \`The\` \`days\` \`are\` \`busy\` → **The days are busy.**

modes: 1=phrase_builder, 2=phrase_builder
`;
  const [independent, retrieval] = parsePractice(markdown);
  assert.equal(independent.purpose, "independent_check");
  assert.equal(retrieval.purpose, "retrieval_practice");
  assert.equal(buildInteraction(independent, { ru: {}, uk: {} }, "en:lesson-01:session-52", 1, 2).purpose, "independent_check");
  assert.equal(buildInteraction(retrieval, { ru: {}, uk: {} }, "en:lesson-01:session-52", 2, 2).purpose, "retrieval_practice");

  const invalid = markdown.replace("independent_check", "invented_purpose");
  assert.throws(() => parsePractice(invalid), /Unsupported authored purpose: invented_purpose/u);
});

test("word-card learner prompt keeps the taught word and rejects a divergent prompt", () => {
  const sessionId = "en:lesson-01:session-52";
  const task = {
    ordinal: 1,
    title: "Карточка слова — week",
    interactionId: `${sessionId}:i01`,
    family: "listen_choose",
    card: { word: "week", definition: "«неделя»." },
    options: [],
  };
  const interaction = buildInteraction(task, {
    ru: { card: { definition: "«неделя»." } },
    uk: { card: { definition: "«тиждень»." } },
  }, sessionId, 1, 1);
  const check = (candidate) => atomicMarkdownParityIssues({
    sessionIdentity: "en/l01/s52",
    sessionId,
    atomicSource: {
      schemaVersion: "learning_v2_atomic_practice_source_v1",
      courseSessionId: sessionId,
      interactionsByLocale: { ru: [candidate] },
      answers: [],
    },
    tasksByLocale: { ru: [task] },
  });

  assert.equal(interaction.prompt, "Карточка слова — week");
  assert.deepEqual(check(interaction), []);

  const divergent = structuredClone(interaction);
  divergent.prompt = "Другой заголовок";
  assert.match(check(divergent)[0] ?? "", /atomic_markdown_parity/u);
});

test("a gap task never exposes its answer through the fallback scene", () => {
  const sessionId = "en:lesson-01:session-52";
  const task = {
    ordinal: 1,
    title: "Вставьте слово — am",
    interactionId: `${sessionId}:i01`,
    family: "context_gap_grammar",
    body: "I ___ ready. → **am** · is · are",
    options: [
      { text: "am", correct: true, feedback: "После I здесь нужна форма am." },
      { text: "is", correct: false, feedback: "is бывает с he, she или it." },
      { text: "are", correct: false, feedback: "are бывает с you, we или they." },
    ],
  };
  const interaction = buildInteraction(task, {
    ru: { title: "Вставьте слово — am", options: task.options },
    uk: {
      title: "Вставте слово — am",
      options: [
        { text: "am", correct: true, feedback: "Після I тут потрібна форма am." },
        { text: "is", correct: false, feedback: "is буває з he, she або it." },
        { text: "are", correct: false, feedback: "are буває з you, we або they." },
      ],
    },
  }, sessionId, 1, 1);

  assert.equal(interaction.prompt, "Вставьте слово");
  assert.equal(interaction.accessibilityLabel, "Вставьте слово");
  assert.deepEqual(interaction.modePayload.localizedScene, {
    ru: "Вставьте слово",
    uk: "Вставте слово",
  });
});

test("an authored gap scene remains intact even when its title contains an answer tail", () => {
  const sessionId = "en:lesson-01:session-52";
  const task = {
    ordinal: 1,
    title: "Вставьте слово — am",
    visibleGuidance: "Выберите форму после I в коротком сообщении другу.",
    interactionId: `${sessionId}:i01`,
    family: "context_gap_grammar",
    body: "I ___ ready. → **am** · is · are",
    options: [{ text: "am", correct: true }, { text: "is", correct: false }, { text: "are", correct: false }],
  };
  const interaction = buildInteraction(task, {
    ru: { title: task.title, visibleGuidance: task.visibleGuidance, options: task.options },
    uk: { title: "Вставте слово — am", visibleGuidance: "Оберіть форму після I у короткому повідомленні другові.", options: task.options },
  }, sessionId, 1, 1);

  assert.deepEqual(interaction.modePayload.localizedScene, {
    ru: "Выберите форму после I в коротком сообщении другу.",
    uk: "Оберіть форму після I у короткому повідомленні другові.",
  });
});
