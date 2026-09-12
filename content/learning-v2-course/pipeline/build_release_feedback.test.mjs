import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));

function makeReady(dir) {
  const source = fs.readFileSync(path.join(dir, "final.ru.md"));
  for (const role of ["learner", "pedagogy", "nonsense", "reader"]) fs.writeFileSync(path.join(dir, `final.judge_${role}.json`), JSON.stringify({ verdict: "PASS" }));
  fs.writeFileSync(path.join(dir, "final.judge_taste.json"), JSON.stringify({
    sourceSha256: crypto.createHash("sha256").update(source).digest("hex"),
    pairwise: "equal",
    pairwise_reason: "Материал сравнили с эталоном по ясности, голосу и учебной ценности.",
    voice: { score: 4, evidence: ["Формулировки сохраняют ясный и узнаваемый учебный голос."] },
    humor: { present: true, on_topic: true, examples: ["«Проверка» — цитата из текущего исходника теста."], misfires: [] },
    ai_text_or_nonsense: [], must_fix: [], verdict: "PASS",
    verdict_reason: "Полная независимая проверка тестового материала завершена.",
  }));
  fs.writeFileSync(path.join(dir, "locales.judge.json"), JSON.stringify({ locales: { uk: { verdict: "PASS" } } }));
  fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify({ converged: true, needsHumanReview: false }));
}

test("release feedback keeps the selected option ID in every locale and answer position", () => {
  const tempParent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(tempParent, "learning-v2-feedback-"));
  try {
    fs.mkdirSync(path.join(root, "pipeline"));
    for (const name of ["build_release.mjs", "session_readiness.mjs", "owner_quality.mjs"]) fs.copyFileSync(path.join(here, name), path.join(root, "pipeline", name));
    fs.copyFileSync(path.join(here, "build_mockup.mjs"), path.join(root, "pipeline/build_mockup.mjs"));
    fs.copyFileSync(path.join(here, "write_mockup_file.mjs"), path.join(root, "pipeline/write_mockup_file.mjs"));
    const sessionDir = path.join(root, "sessions/en/l02/s33");
    fs.mkdirSync(sessionDir, { recursive: true });
    const labels = ["is", "are", "am"];
    for (const locale of ["ru", "uk"]) {
      const intro = [1, 2, 3].map((n) => `## Интро ${n}\n\n### Вопрос\n\nТекст.\n\n**Выберите.**\n\n- ✅ **is**\n- ❌ are — *${locale}-are*\n- ❌ am — *${locale}-am*\n\n---`).join("\n\n");
      const instruction = locale === "uk" ? "Послухайте й виберіть" : "Послушайте и выберите";
      const tasks = [0, 1, 2].map((correct, index) => `**${index + 1} · ${instruction} — ${labels[correct]}**\n\n` + labels.map((label, i) => i === correct
        ? `- ✅ **${label}**`
        : `- ❌ ${label} — *${locale}-${label}*`).join("\n")).join("\n\n");
      const speedTitle = locale === "uk" ? "З’єднайте пари (Speed Match, 4 пари)" : "Соедините пары (Speed Match, 4 пары)";
      const speed = `**4 · ${speedTitle}**\n\none — ${locale}-один · two — ${locale}-два · three — ${locale}-три · four — ${locale}-четыре`;
      const operationLabel = locale === "uk" ? "Операція" : "Операция";
      fs.writeFileSync(path.join(sessionDir, `final.${locale}.md`), `# Проверка\n\n**${operationLabel}:** ${locale}-operation\n\n${intro}\n\n## Практика\n\n${tasks}\n\n${speed}\n\nmodes: 1=listen_choose, 2=listen_choose, 3=listen_choose, 4=speed_match\n`);
    }
    makeReady(sessionDir);
    const run = spawnSync(process.execPath, [path.join(root, "pipeline/build_release.mjs"), "--session", "en/l02/s33", "--locales", "ru,uk"], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const out = path.join(root, "release/en/l02/s33");
    const learner = JSON.parse(fs.readFileSync(path.join(out, "learner.json"), "utf8"));
    const learnerUk = JSON.parse(fs.readFileSync(path.join(out, "learner.uk.json"), "utf8"));
    const answers = JSON.parse(fs.readFileSync(path.join(out, "answers.json"), "utf8"));
    const intro = JSON.parse(fs.readFileSync(path.join(out, "intro.json"), "utf8"));
    for (const locale of ["ru", "uk"]) assert.equal(intro.learningOutcomeByLocale[locale], `${locale}-operation`);
    assert.equal(learner.interactions.length, 4);
    assert.deepEqual(Object.keys(learnerUk).sort(), Object.keys(learner).sort(), "locale sibling must keep the strict learner child schema");
    for (const [index, interaction] of learner.interactions.slice(0, 3).entries()) {
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
      assert.deepEqual(localizedInteraction.modePayload, baseInteraction.modePayload);
      assert.deepEqual(localizedInteraction.responseOptions, baseInteraction.responseOptions);
      assert.equal(baseInteraction.accessibilityLabel, baseInteraction.prompt);
      assert.equal(localizedInteraction.accessibilityLabel, localizedInteraction.prompt);
    }
    const fingerprint = (interactions) => crypto.createHash("sha256").update(JSON.stringify(interactions)).digest("hex");
    assert.equal(learner.learnerFingerprint, fingerprint(learner.interactions));
    assert.equal(learnerUk.learnerFingerprint, fingerprint(learnerUk.interactions));
    assert.notEqual(learnerUk.learnerFingerprint, learner.learnerFingerprint);

    // Older frozen releases retain the locale fallback; new scoped releases require RU+UK.
    const fallbackDir = path.join(root, "sessions/en/l02/s32");
    fs.mkdirSync(fallbackDir, { recursive: true });
    fs.copyFileSync(path.join(sessionDir, "final.ru.md"), path.join(fallbackDir, "final.ru.md"));
    makeReady(fallbackDir);
    const fallbackRun = spawnSync(process.execPath, [path.join(root, "pipeline/build_release.mjs"), "--session", "en/l02/s32", "--locales", "ru"], { encoding: "utf8" });
    assert.equal(fallbackRun.status, 0, fallbackRun.stderr || fallbackRun.stdout);
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
    assert.equal(fallbackSession.learnerByLocale.uk, undefined, "missing locale child must stay missing in the wrapper");
    const appJs = fs.readFileSync(path.join(root, "mockup/app.js"), "utf8");
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
  } finally {
    assert.equal(path.dirname(root), tempParent);
    assert.ok(path.basename(root).startsWith("learning-v2-feedback-"));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
