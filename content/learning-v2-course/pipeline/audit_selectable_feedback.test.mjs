import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = new URL("./audit_selectable_feedback.mjs", import.meta.url);
const scriptPath = fileURLToPath(script);
const courseRoot = path.dirname(path.dirname(scriptPath));

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

test("corpus audit CLI runs when its script path enters through a directory junction", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-feedback-junction-"));
  try {
    const alias = path.join(temp, "course-alias");
    fs.symlinkSync(courseRoot, alias, process.platform === "win32" ? "junction" : "dir");
    const emptyRoot = path.join(temp, "empty-root");
    fs.mkdirSync(emptyRoot);
    const aliasedScript = path.join(alias, "pipeline", "audit_selectable_feedback.mjs");
    const run = spawnSync(process.execPath, [aliasedScript, "--root", emptyRoot, "--json"], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.deepEqual(JSON.parse(run.stdout), {
      scope: "all",
      countsByCategory: { source: 0, release: 0, mockup: 0 },
      issueCount: 0,
      issues: [],
    });
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("corpus audit reports missing correct feedback separately for source, release, and mockup projections", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-feedback-audit-"));
  try {
    const sid = "en:lesson-01:session-36";
    const session = path.join(root, "sessions/en/l01/s36");
    fs.mkdirSync(session, { recursive: true });
    const intro = "## Интро 1\n\n### Проверка\n\nТекст.\n\n**Выберите.**\n\n- ✅ **We are colleagues.**\n- ❌ We colleagues. — *Нужен are.*\n- ❌ We is colleagues. — *С we нужен are.*\n";
    fs.writeFileSync(path.join(session, "final.ru.md"), intro);
    fs.writeFileSync(path.join(session, "final.uk.md"), intro.replace("Нужен", "Потрібен").replace("нужен", "потрібен"));
    writeJson(path.join(session, "practice.atomic.json"), { interactionsByLocale: { ru: [], uk: [] }, answers: [] });
    const releaseDir = path.join(root, "release/en/l01/s36");
    const introChild = { courseSessionId: sid, pages: [{ question: { interactionId: `${sid}:intro1:q`, choicesByLocale: { ru: [
      { responseId: `${sid}:intro1:r1`, text: "We are colleagues." },
      { responseId: `${sid}:intro1:r2`, text: "We colleagues." },
      { responseId: `${sid}:intro1:r3`, text: "We is colleagues." },
    ] } } }] };
    const auxiliary = { entries: [{ interactionId: `${sid}:intro1:q`, responseFeedbackById: {
      [`${sid}:intro1:r2`]: { ru: "Нужен are.", uk: "Потрібен are." },
      [`${sid}:intro1:r3`]: { ru: "С we нужен are.", uk: "З we потрібен are." },
    } }] };
    writeJson(path.join(releaseDir, "intro.json"), introChild);
    writeJson(path.join(releaseDir, "auxiliary.json"), auxiliary);
    writeJson(path.join(root, "mockup/reviewed-source/en/l01/s36/intro.json"), introChild);
    writeJson(path.join(root, "mockup/reviewed-source/en/l01/s36/auxiliary.json"), auxiliary);

    const run = spawnSync(process.execPath, [scriptPath, "--root", root, "--scope", "en/l01/s36", "--json"], { encoding: "utf8" });
    assert.equal(run.status, 1, run.stderr || run.stdout);
    const report = JSON.parse(run.stdout);
    assert.deepEqual(report.countsByCategory, { source: 2, release: 1, mockup: 1 });
    assert.deepEqual(report.issues.map(({ category, path: issuePath, responseId, reason }) => ({ category, path: issuePath, responseId, reason })), [
      { category: "source", path: "sessions/en/l01/s36/final.ru.md", responseId: `${sid}:intro1:r1`, reason: "feedback_missing" },
      { category: "source", path: "sessions/en/l01/s36/final.uk.md", responseId: `${sid}:intro1:r1`, reason: "feedback_missing" },
      { category: "release", path: "release/en/l01/s36/auxiliary.json", responseId: `${sid}:intro1:r1`, reason: "feedback_missing" },
      { category: "mockup", path: "mockup/reviewed-source/en/l01/s36/auxiliary.json", responseId: `${sid}:intro1:r1`, reason: "feedback_missing" },
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("corpus audit keeps a stale release and mockup on HOLD after source correct feedback is repaired", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-feedback-stale-"));
  try {
    const sid = "en:lesson-01:session-36";
    const session = path.join(root, "sessions/en/l01/s36");
    fs.mkdirSync(session, { recursive: true });
    for (const locale of ["ru", "uk"]) fs.writeFileSync(path.join(session, `final.${locale}.md`), [
      "## Интро 1", "", "### Проверка", "", "Текст.", "", "**Выберите.**", "",
      `- ✅ **We are colleagues.** — *${locale}-correct*`,
      `- ❌ We colleagues. — *${locale}-wrong-1*`,
      `- ❌ We is colleagues. — *${locale}-wrong-2*`, "",
    ].join("\n"));
    writeJson(path.join(session, "practice.atomic.json"), { interactionsByLocale: { ru: [], uk: [] }, answers: [] });
    const intro = { courseSessionId: sid, pages: [{ question: { interactionId: `${sid}:intro1:q`, choicesByLocale: { ru: [
      { responseId: `${sid}:intro1:r1`, text: "We are colleagues." },
      { responseId: `${sid}:intro1:r2`, text: "We colleagues." },
      { responseId: `${sid}:intro1:r3`, text: "We is colleagues." },
    ] } } }] };
    const staleAuxiliary = { entries: [{ interactionId: `${sid}:intro1:q`, responseFeedbackById: {
      [`${sid}:intro1:r2`]: { ru: "ru-wrong-1", uk: "uk-wrong-1" },
      [`${sid}:intro1:r3`]: { ru: "ru-wrong-2", uk: "uk-wrong-2" },
    } }] };
    for (const base of ["release/en/l01/s36", "mockup/reviewed-source/en/l01/s36"]) {
      writeJson(path.join(root, base, "intro.json"), intro);
      writeJson(path.join(root, base, "auxiliary.json"), staleAuxiliary);
    }
    const run = spawnSync(process.execPath, [scriptPath, "--root", root, "--scope", "en/l01/s36", "--json"], { encoding: "utf8" });
    assert.equal(run.status, 1, run.stderr || run.stdout);
    const report = JSON.parse(run.stdout);
    assert.deepEqual(report.countsByCategory, { source: 0, release: 1, mockup: 1 });
    assert.deepEqual(report.issues.map((row) => [row.category, row.responseId, row.reason]), [
      ["release", `${sid}:intro1:r1`, "feedback_missing"],
      ["mockup", `${sid}:intro1:r1`, "feedback_missing"],
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
