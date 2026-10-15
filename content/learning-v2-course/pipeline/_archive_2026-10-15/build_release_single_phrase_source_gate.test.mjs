import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

function addExplicitNoneDeclaration(file) {
  const source = fs.readFileSync(file, "utf8");
  fs.writeFileSync(file, source.replace(/^# Test\r?\n/u, "# Test\n\n**Новые слова:** —\n"));
}

function copyFixtureVisibleTextModule(root, here) {
  const source = path.resolve(here, "../../../modules/learning-v2/content/learner_visible_text_v1.js");
  const target = path.join(root, "modules/learning-v2/content/learner_visible_text_v1.js");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

test("every target-language master, including historical sessions, fails before preview when one interaction contains multiple phrases", (t) => {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, "learning-single-phrase-source-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.mkdirSync(path.join(root, "pipeline"));
  for (const name of [
    "build_release.mjs",
    "practice_explanations_v1.mjs",
    "single_phrase_release.mjs",
    "session_header.mjs",
    "session_readiness.mjs",
    "owner_quality.mjs",
    "progression_quality_gate.mjs", "audit_actor_clarity.mjs",
    "write_mockup_file.mjs",
  ]) fs.copyFileSync(path.join(here, name), path.join(root, "pipeline", name));
  copyFixtureVisibleTextModule(root, here);

  const directory = path.join(root, "sessions/en/l03/s51");
  fs.mkdirSync(directory, { recursive: true });
  const intro = [1, 2, 3].map((ordinal) => `## Интро ${ordinal}\n\n### Пример\n\nПояснение.\n\n**Выберите.**\n\n- ✅ **is**\n- ❌ are — *Другая форма.*\n- ❌ am — *Про себя.*\n\n---`).join("\n\n");
  fs.writeFileSync(path.join(directory, "final.ru.md"), `# Test\n\n${intro}\n\n## Практика\n\n**1 · Соберите фразу**\nПлитки: \`far\` \`Excuse me\` \`it\` \`Is\` → **Excuse me. Is it far?**\n\n**2 · Соберите фразу**\nПлитки: \`This\` \`is\` \`fine\` → **This is fine.**\n\n**3 · Соберите фразу**\nПлитки: \`She\` \`is\` \`ready\` → **She is ready.**\n\n**4 · Соберите фразу**\nПлитки: \`We\` \`are\` \`here\` → **We are here.**\n\nmodes: 1=phrase_builder, 2=phrase_builder, 3=phrase_builder, 4=phrase_builder\n`);

  addExplicitNoneDeclaration(path.join(directory, "final.ru.md"));
  const out = path.join(root, "preview");
  const result = spawnSync(process.execPath, [
    path.join(root, "pipeline/build_release.mjs"),
    "--session", "en/l03/s51",
    "--locales", "ru",
    "--out", out,
  ], { encoding: "utf8" });
  assert.notEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(`${result.stdout}\n${result.stderr}`, /single_phrase_source_hold:en:lesson-03:session-51:i01:targetPhrase/u);
  assert.equal(fs.existsSync(path.join(out, "en/l03/s51/learner.json")), false);

  const germanDirectory = path.join(root, "sessions/de/l03/s51");
  fs.mkdirSync(germanDirectory, { recursive: true });
  fs.copyFileSync(path.join(directory, "final.ru.md"), path.join(germanDirectory, "final.ru.md"));
  const german = spawnSync(process.execPath, [
    path.join(root, "pipeline/build_release.mjs"),
    "--session", "de/l03/s51",
    "--locales", "ru",
    "--out", out,
  ], { encoding: "utf8" });
  assert.notEqual(german.status, 0, german.stderr || german.stdout);
  assert.match(`${german.stdout}\n${german.stderr}`, /single_phrase_source_hold:de:lesson-03:session-51:i01:targetPhrase/u);

  fs.writeFileSync(path.join(directory, "practice.atomic.json"), JSON.stringify({
    schemaVersion: "learning_v2_atomic_practice_source_v1",
    courseSessionId: "en:lesson-03:session-51",
    interactionsByLocale: { ru: [] },
    answers: [],
  }));
  const parity = spawnSync(process.execPath, [
    path.join(root, "pipeline/build_release.mjs"),
    "--session", "en/l03/s51",
    "--locales", "ru",
    "--out", out,
  ], { encoding: "utf8" });
  assert.notEqual(parity.status, 0, parity.stderr || parity.stdout);
  assert.match(`${parity.stdout}\n${parity.stderr}`, /atomic_markdown_parity:en\/l03\/s51:ru:index=0/u);
});

test("release blocks when Markdown and atomic practice differ only in learner-facing target or choices", (t) => {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, "learning-atomic-target-parity-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.mkdirSync(path.join(root, "pipeline"));
  for (const name of [
    "build_release.mjs",
    "practice_explanations_v1.mjs",
    "single_phrase_release.mjs",
    "session_header.mjs",
    "session_readiness.mjs",
    "owner_quality.mjs",
    "progression_quality_gate.mjs", "audit_actor_clarity.mjs",
    "write_mockup_file.mjs",
  ]) fs.copyFileSync(path.join(here, name), path.join(root, "pipeline", name));
  copyFixtureVisibleTextModule(root, here);

  const directory = path.join(root, "sessions/en/l01/s01");
  fs.mkdirSync(directory, { recursive: true });
  const intro = [1, 2, 3].map((ordinal) => `## Интро ${ordinal}\n\n### Пример\n\nПояснение.\n\n**Выберите.**\n\n- ✅ **is**\n- ❌ are — *Другая форма.*\n\n---`).join("\n\n");
  const tasks = ["red", "blue", "green", "white"].map((word, index) => {
    const ordinal = index + 1;
    const id = `en:lesson-01:session-01:i${String(ordinal).padStart(2, "0")}`;
    return `**${ordinal} · Соберите фразу**\n<!-- interaction_id: ${id}; family: phrase_builder -->\nПлитки: \`This\` \`is\` \`${word}\` → **This is ${word}.**`;
  }).join("\n\n");
  fs.writeFileSync(path.join(directory, "final.ru.md"), `# Test\n\n${intro}\n\n## Практика\n\n${tasks}\n\nmodes: 1=phrase_builder, 2=phrase_builder, 3=phrase_builder, 4=phrase_builder\n`);

  addExplicitNoneDeclaration(path.join(directory, "final.ru.md"));
  const interactions = ["orange", "blue", "green", "white"].map((word, index) => {
    const ordinal = index + 1;
    const id = `en:lesson-01:session-01:i${String(ordinal).padStart(2, "0")}`;
    return {
      interactionId: id,
      ordinal: ordinal + 3,
      purpose: "supported_practice",
      family: "phrase_builder",
      inputMode: "ordered_tokens",
      prompt: "Соберите фразу",
      responseOptions: [],
      mediaIds: [],
      audioTargetIds: [],
      accessibilityLabel: "Соберите фразу",
      modePayload: {
        family: "phrase_builder",
        targetPhrase: `This is ${word}.`,
        localizedMeaning: { ru: "Соберите фразу" },
        orderedTokens: ["This", "is", word],
        authoredDistractorTokens: [],
        slotFeedback: [],
      },
      scriptedAlternate: null,
    };
  });
  fs.writeFileSync(path.join(directory, "practice.atomic.json"), JSON.stringify({
    schemaVersion: "learning_v2_atomic_practice_source_v1",
    courseSessionId: "en:lesson-01:session-01",
    interactionsByLocale: { ru: interactions },
    answers: interactions.map((item) => ({ interactionId: item.interactionId, correctText: item.modePayload.targetPhrase, correctResponseId: null })),
  }));

  const result = spawnSync(process.execPath, [
    path.join(root, "pipeline/build_release.mjs"),
    "--session", "en/l01/s01",
    "--locales", "ru",
    "--out", path.join(root, "preview"),
  ], { encoding: "utf8" });
  assert.notEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(`${result.stdout}\n${result.stderr}`, /atomic_markdown_learner_parity:en\/l01\/s01:ru:index=0:field=modePayload\.targetPhrase/u);

  interactions[0].modePayload.targetPhrase = "This is red.";
  interactions[0].modePayload.orderedTokens = ["This", "is", "red"];
  interactions[0].responseOptions = [{ responseId: `${interactions[0].interactionId}:r1`, text: "atomic-only" }];
  fs.writeFileSync(path.join(directory, "practice.atomic.json"), JSON.stringify({
    schemaVersion: "learning_v2_atomic_practice_source_v1",
    courseSessionId: "en:lesson-01:session-01",
    interactionsByLocale: { ru: interactions },
    answers: interactions.map((item) => ({ interactionId: item.interactionId, correctText: item.modePayload.targetPhrase, correctResponseId: null })),
  }));
  const atomicOnly = spawnSync(process.execPath, [
    path.join(root, "pipeline/build_release.mjs"),
    "--session", "en/l01/s01",
    "--locales", "ru",
    "--out", path.join(root, "preview-atomic-only"),
  ], { encoding: "utf8" });
  assert.notEqual(atomicOnly.status, 0, atomicOnly.stderr || atomicOnly.stdout);
  assert.match(`${atomicOnly.stdout}\n${atomicOnly.stderr}`, /atomic_markdown_learner_parity:en\/l01\/s01:ru:index=0:field=responseOptions/u);
});

test("release blocks an atomic-only localized meaning that the learner would see", (t) => {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, "learning-atomic-meaning-parity-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.mkdirSync(path.join(root, "pipeline"));
  for (const name of [
    "build_release.mjs",
    "practice_explanations_v1.mjs",
    "single_phrase_release.mjs",
    "session_header.mjs",
    "session_readiness.mjs",
    "owner_quality.mjs",
    "progression_quality_gate.mjs", "audit_actor_clarity.mjs",
    "write_mockup_file.mjs",
  ]) fs.copyFileSync(path.join(here, name), path.join(root, "pipeline", name));
  copyFixtureVisibleTextModule(root, here);

  const directory = path.join(root, "sessions/en/l01/s01");
  fs.mkdirSync(directory, { recursive: true });
  const intro = [1, 2, 3].map((ordinal) => `## Интро ${ordinal}\n\n### Пример\n\nПояснение.\n\n**Выберите.**\n\n- ✅ **is**\n- ❌ are — *Другая форма.*\n\n---`).join("\n\n");
  const tasks = ["red", "blue", "green", "white"].map((word, index) => {
    const ordinal = index + 1;
    const id = `en:lesson-01:session-01:i${String(ordinal).padStart(2, "0")}`;
    return `**${ordinal} · Послушайте и выберите**\n<!-- interaction_id: ${id}; family: listen_choose -->\n🔊 *${word}*\n\nЗначения вариантов: ${word} — ${word}-ru · other — другой\n\n→ **${word}** · other\n\n- other — *Другое слово.*`;
  }).join("\n\n");
  fs.writeFileSync(path.join(directory, "final.ru.md"), `# Test\n\n${intro}\n\n## Практика\n\n${tasks}\n\nmodes: 1=listen_choose, 2=listen_choose, 3=listen_choose, 4=listen_choose\n`);

  addExplicitNoneDeclaration(path.join(directory, "final.ru.md"));
  const interactions = ["red", "blue", "green", "white"].map((word, index) => {
    const ordinal = index + 1;
    const id = `en:lesson-01:session-01:i${String(ordinal).padStart(2, "0")}`;
    return {
      interactionId: id,
      ordinal: ordinal + 3,
      purpose: "supported_practice",
      family: "listen_choose",
      inputMode: "single_choice",
      prompt: "Послушайте и выберите",
      responseOptions: [
        { responseId: `${id}:r1`, text: word },
        { responseId: `${id}:r2`, text: "other" },
      ],
      mediaIds: [],
      audioTargetIds: [`${id}:audio`],
      accessibilityLabel: "Послушайте и выберите",
      modePayload: {
        family: "listen_choose",
        referenceAudio: { audioTargetId: `${id}:audio`, transcript: word },
        slowReferenceAudio: null,
        localizedMeaningChoices: [
          { responseId: `${id}:r1`, targetText: word, meaningByLocale: { ru: index === 0 ? "подменённое значение" : `${word}-ru` } },
          { responseId: `${id}:r2`, targetText: "other", meaningByLocale: { ru: "другой" } },
        ],
        transcriptRevealPolicy: "after_first_attempt",
        choiceFeedback: [],
        isWordCard: false,
        wordCard: null,
      },
      scriptedAlternate: null,
    };
  });
  fs.writeFileSync(path.join(directory, "practice.atomic.json"), JSON.stringify({
    schemaVersion: "learning_v2_atomic_practice_source_v1",
    courseSessionId: "en:lesson-01:session-01",
    interactionsByLocale: { ru: interactions },
    answers: interactions.map((item) => ({ interactionId: item.interactionId, correctText: item.responseOptions[0].text, correctResponseId: item.responseOptions[0].responseId })),
  }));

  const result = spawnSync(process.execPath, [
    path.join(root, "pipeline/build_release.mjs"),
    "--session", "en/l01/s01",
    "--locales", "ru",
    "--out", path.join(root, "preview"),
  ], { encoding: "utf8" });
  assert.notEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(`${result.stdout}\n${result.stderr}`, /atomic_markdown_learner_parity:en\/l01\/s01:ru:index=0:field=modePayload\.localizedMeaningChoices/u);
});

test("release blocks atomic-only speed-match pairs omitted from Markdown", (t) => {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, "learning-atomic-pairs-parity-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.mkdirSync(path.join(root, "pipeline"));
  for (const name of [
    "build_release.mjs",
    "practice_explanations_v1.mjs",
    "single_phrase_release.mjs",
    "session_header.mjs",
    "session_readiness.mjs",
    "owner_quality.mjs",
    "progression_quality_gate.mjs", "audit_actor_clarity.mjs",
    "write_mockup_file.mjs",
  ]) fs.copyFileSync(path.join(here, name), path.join(root, "pipeline", name));
  copyFixtureVisibleTextModule(root, here);

  const directory = path.join(root, "sessions/en/l01/s01");
  fs.mkdirSync(directory, { recursive: true });
  const intro = [1, 2, 3].map((ordinal) => `## Интро ${ordinal}\n\n### Пример\n\nПояснение.\n\n**Выберите.**\n\n- ✅ **is**\n- ❌ are — *Другая форма.*\n\n---`).join("\n\n");
  const tasks = [1, 2, 3, 4].map((ordinal) => {
    const id = `en:lesson-01:session-01:i${String(ordinal).padStart(2, "0")}`;
    return `**${ordinal} · Соедините пары**\n<!-- interaction_id: ${id}; family: speed_match -->\nПары находятся в atomic.`;
  }).join("\n\n");
  fs.writeFileSync(path.join(directory, "final.ru.md"), `# Test\n\n${intro}\n\n## Практика\n\n${tasks}\n\nmodes: 1=speed_match, 2=speed_match, 3=speed_match, 4=speed_match\n`);

  addExplicitNoneDeclaration(path.join(directory, "final.ru.md"));
  const interactions = [1, 2, 3, 4].map((ordinal) => {
    const id = `en:lesson-01:session-01:i${String(ordinal).padStart(2, "0")}`;
    const pairGrid = ["red", "blue", "green", "white"].map((word, index) => ({
      pairId: `${id}:p${index + 1}`,
      target: word,
      meaningByLocale: { ru: `${word}-ru` },
    }));
    return {
      interactionId: id,
      ordinal: ordinal + 3,
      purpose: "supported_practice",
      family: "speed_match",
      inputMode: "pair_grid",
      prompt: "Соедините пары",
      responseOptions: [],
      mediaIds: [],
      audioTargetIds: [],
      accessibilityLabel: "Соедините пары",
      modePayload: {
        family: "speed_match",
        pairGrid,
        leftColumn: pairGrid.map((item) => item.target),
        rightColumn: pairGrid.map((item) => item.meaningByLocale.ru),
        pairingKey: "pair_id",
        timerPolicy: { enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true },
        finishStats: ["speed", "accuracy", "personal_best"],
      },
      scriptedAlternate: null,
    };
  });
  fs.writeFileSync(path.join(directory, "practice.atomic.json"), JSON.stringify({
    schemaVersion: "learning_v2_atomic_practice_source_v1",
    courseSessionId: "en:lesson-01:session-01",
    interactionsByLocale: { ru: interactions },
    answers: interactions.map((item) => ({ interactionId: item.interactionId, correctText: null, correctResponseId: null })),
  }));

  const result = spawnSync(process.execPath, [
    path.join(root, "pipeline/build_release.mjs"),
    "--session", "en/l01/s01",
    "--locales", "ru",
    "--out", path.join(root, "preview"),
  ], { encoding: "utf8" });
  assert.notEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(`${result.stdout}\n${result.stderr}`, /atomic_markdown_learner_parity:en\/l01\/s01:ru:index=0:field=modePayload\.pairGrid/u);
});

test("release blocks a non-word-card listen choice without audio before creating output", (t) => {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, "learning-listen-choice-audio-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.mkdirSync(path.join(root, "pipeline"));
  for (const name of [
    "build_release.mjs",
    "practice_explanations_v1.mjs",
    "single_phrase_release.mjs",
    "session_header.mjs",
    "session_readiness.mjs",
    "owner_quality.mjs",
    "progression_quality_gate.mjs", "audit_actor_clarity.mjs",
    "write_mockup_file.mjs",
  ]) fs.copyFileSync(path.join(here, name), path.join(root, "pipeline", name));
  copyFixtureVisibleTextModule(root, here);

  const session = "en/l04/s04";
  const sourceDir = path.resolve(here, "..", "sessions", ...session.split("/"));
  const directory = path.join(root, "sessions", ...session.split("/"));
  fs.mkdirSync(directory, { recursive: true });

  const markdown = fs.readFileSync(path.join(sourceDir, "final.ru.md"), "utf8")
    .replace(/^🔊 \*There are libraries near the post office\.\*\r?\n/mu, "");
  fs.writeFileSync(path.join(directory, "final.ru.md"), markdown);
  const statusPath = path.join(directory, "status.json");
  const statusBefore = '{"sentinel":"unchanged"}\n';
  fs.writeFileSync(statusPath, statusBefore);

  const interactionId = "en:lesson-04:session-04:i05";
  const out = path.join(root, "preview");
  const result = spawnSync(process.execPath, [
    path.join(root, "pipeline/build_release.mjs"),
    "--session", session,
    "--locales", "ru",
    "--out", out,
  ], { encoding: "utf8" });
  assert.notEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    new RegExp(`single_phrase_source_hold:${interactionId}:referenceAudio\\.transcript:listen_choice_audio_transcript_missing`, "u"),
  );
  assert.equal(fs.existsSync(path.join(out, ...session.split("/"))), false);
  assert.equal(fs.readFileSync(statusPath, "utf8"), statusBefore);
});
