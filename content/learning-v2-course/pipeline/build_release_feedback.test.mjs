import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));

test("release feedback keeps the selected option ID in every locale and answer position", () => {
  const tempParent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(tempParent, "learning-v2-feedback-"));
  try {
    fs.mkdirSync(path.join(root, "pipeline"));
    fs.copyFileSync(path.join(here, "build_release.mjs"), path.join(root, "pipeline/build_release.mjs"));
    const sessionDir = path.join(root, "sessions/en/l02/s33");
    fs.mkdirSync(sessionDir, { recursive: true });
    const labels = ["is", "are", "am"];
    for (const locale of ["ru", "uk"]) {
      const intro = [1, 2, 3].map((n) => `## Интро ${n}\n\n### Вопрос\n\nТекст.\n\n**Выберите.**\n\n- ✅ **is**\n- ❌ are — *${locale}-are*\n- ❌ am — *${locale}-am*\n\n---`).join("\n\n");
      const tasks = [0, 1, 2].map((correct, index) => `**${index + 1} · Вставьте слово — проверка**\n\n` + labels.map((label, i) => i === correct
        ? `- ✅ **${label}**`
        : `- ❌ ${label} — *${locale}-${label}*`).join("\n")).join("\n\n");
      const operationLabel = locale === "uk" ? "Операція" : "Операция";
      fs.writeFileSync(path.join(sessionDir, `final.${locale}.md`), `# Проверка\n\n**${operationLabel}:** ${locale}-operation\n\n${intro}\n\n## Практика\n\n${tasks}\n`);
    }
    const run = spawnSync(process.execPath, [path.join(root, "pipeline/build_release.mjs"), "--session", "en/l02/s33", "--locales", "ru,uk"], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const out = path.join(root, "release/en/l02/s33");
    const learner = JSON.parse(fs.readFileSync(path.join(out, "learner.json"), "utf8"));
    const answers = JSON.parse(fs.readFileSync(path.join(out, "answers.json"), "utf8"));
    const intro = JSON.parse(fs.readFileSync(path.join(out, "intro.json"), "utf8"));
    for (const locale of ["ru", "uk"]) assert.equal(intro.learningOutcomeByLocale[locale], `${locale}-operation`);
    assert.equal(learner.interactions.length, 3);
    for (const [index, interaction] of learner.interactions.entries()) {
      const feedback = interaction.modePayload?.choiceFeedback;
      assert.ok(Array.isArray(feedback), "built interaction must expose its feedback entries");
      assert.equal(feedback.length, 2);
      for (const item of feedback) {
        assert.notEqual(item.responseId, answers[index].correctResponseId, "wrong feedback must never attach to the correct option");
        const option = interaction.responseOptions.find((candidate) => candidate.responseId === item.responseId);
        assert.ok(option, "feedback must target a visible option");
        for (const locale of ["ru", "uk"]) assert.equal(item.feedbackByLocale[locale], `${locale}-${option.text}`);
      }
      const wrongIds = interaction.responseOptions.filter((option) => option.responseId !== answers[index].correctResponseId).map((option) => option.responseId);
      assert.deepEqual(feedback.map((item) => item.responseId), wrongIds);
    }
  } finally {
    assert.equal(path.dirname(root), tempParent);
    assert.ok(path.basename(root).startsWith("learning-v2-feedback-"));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
