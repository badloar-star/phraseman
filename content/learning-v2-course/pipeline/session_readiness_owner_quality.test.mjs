import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { sessionReadiness } from "./session_readiness.mjs";

const ordinaryJudges = ["learner", "pedagogy", "nonsense", "reader"];

test("localized short-answer defects block readiness despite PASS receipts", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s49");
    accepted(dir, true);
    fs.writeFileSync(path.join(dir, "final.uk.md"), "## Інтро 1\n\n### Відповідь\n\nДайте коротку відповідь.\n\n- ✅ **Yes, I am.**\n- ❌ Yes, she is. — *Інша особа.*\n- ❌ No, I am not. — *Заперечення.*\n\n## Практика\n");
    fs.writeFileSync(path.join(dir, "locales.judge.json"), JSON.stringify({ locales: { uk: { verdict: "PASS" } } }));
    const result = sessionReadiness(dir, ["uk"]);
    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /uk.*КОРОТКИЙ ОТВЕТ БЕЗ ОШИБКИ КОНСТРУКЦИИ/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function taste(master) {
  return {
    sourceSha256: crypto.createHash("sha256").update(master).digest("hex"),
    pairwise: "equal",
    pairwise_reason: "Текст сравнили с эталоном по голосу и ясности; уровень сохранён.",
    voice: { score: 4, evidence: ["«маленькая скрепка» — живой образ из правила"] },
    humor: { present: true, on_topic: true, examples: ["«маленькая скрепка» — образ помогает форме"], misfires: [] },
    ai_text_or_nonsense: [], must_fix: [], verdict: "PASS",
    verdict_reason: "Отчёт подтверждает живой голос и уместный юмор.",
  };
}

function accepted(dir, withTaste) {
  fs.mkdirSync(dir, { recursive: true });
  const master = "Текст с образом «маленькая скрепка».\n";
  fs.writeFileSync(path.join(dir, "final.ru.md"), master);
  fs.writeFileSync(path.join(dir, "final.uk.md"), "Локалізація");
  for (const role of ordinaryJudges) fs.writeFileSync(path.join(dir, `final.judge_${role}.json`), JSON.stringify({ verdict: "PASS" }));
  if (withTaste) fs.writeFileSync(path.join(dir, "final.judge_taste.json"), JSON.stringify(taste(master)));
  fs.writeFileSync(path.join(dir, "locales.judge.json"), JSON.stringify({ locales: { uk: { verdict: "PASS" } } }));
  fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify({ converged: true, needsHumanReview: false }));
}

test("readiness requires the current taste receipt in the owner-scoped series", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s33");
    accepted(dir, false);
    const missing = sessionReadiness(dir);
    assert.equal(missing.ready, false);
    assert.match(missing.issues.join("\n"), /final\.judge_taste\.json/);

    fs.writeFileSync(path.join(dir, "final.judge_taste.json"), JSON.stringify(taste(fs.readFileSync(path.join(dir, "final.ru.md")))));
    assert.deepEqual(sessionReadiness(dir), { ready: true, issues: [] });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("frozen sessions retain the four ordinary judge readiness contract", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    accepted(dir, false);
    assert.deepEqual(sessionReadiness(dir), { ready: true, issues: [] });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
