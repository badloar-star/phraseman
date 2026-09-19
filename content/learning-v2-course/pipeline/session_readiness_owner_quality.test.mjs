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

test("lesson 3 session 25 onward requires a fresh progression receipt bound to current source", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-"));
  try {
    const dir = path.join(root, "sessions/en/l03/s25");
    accepted(dir, true);
    const missing = sessionReadiness(dir);
    assert.equal(missing.ready, false);
    assert.match(missing.issues.join("\n"), /final\.judge_progression\.json/);

    const master = fs.readFileSync(path.join(dir, "final.ru.md"));
    fs.writeFileSync(path.join(dir, "final.judge_progression.json"), JSON.stringify({
      verdict: "PASS",
      sourceSha256: crypto.createHash("sha256").update(master).digest("hex"),
      comparedThrough: "en/l03/s24",
      newWords: ["phone"],
      sceneNovel: true,
      grammarProgression: "new_operation",
      introPracticeAligned: true,
      curriculumExactMatch: true,
      curriculumRow: "| 25 | новая | this | phone | мастерская |",
      curriculumEvidence: {
        grammar: "this",
        newWords: ["phone"],
        situation: "мастерская",
      },
    }));
    assert.deepEqual(sessionReadiness(dir), { ready: true, issues: [] });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("progression receipt blocks an intro that does not prepare current practice", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-"));
  try {
    const dir = path.join(root, "sessions/en/l03/s25");
    accepted(dir, true);
    const master = fs.readFileSync(path.join(dir, "final.ru.md"));
    fs.writeFileSync(path.join(dir, "final.judge_progression.json"), JSON.stringify({
      verdict: "PASS",
      sourceSha256: crypto.createHash("sha256").update(master).digest("hex"),
      comparedThrough: "en/l03/s24",
      newWords: ["phone"],
      sceneNovel: true,
      grammarProgression: "new_operation",
      introPracticeAligned: false,
      curriculumExactMatch: true,
      curriculumRow: "| 25 | новая | this | phone | мастерская |",
      curriculumEvidence: {
        grammar: "this",
        newWords: ["phone"],
        situation: "мастерская",
      },
    }));
    const result = sessionReadiness(dir);
    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /интро не готовят текущую практику/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("future progression receipts require three page-level intro to practice to final chains", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-"));
  try {
    const dir = path.join(root, "sessions/en/l03/s43");
    accepted(dir, true);
    const master = fs.readFileSync(path.join(dir, "final.ru.md"));
    const base = {
      verdict: "PASS",
      sourceSha256: crypto.createHash("sha256").update(master).digest("hex"),
      comparedThrough: "en/l03/s42",
      newWords: ["book", "magazine", "newspaper"],
      sceneNovel: true,
      grammarProgression: "new_operation",
      introPracticeAligned: true,
      curriculumExactMatch: true,
      curriculumRow: "| 43 | новая | plural/the | book, magazine, newspaper | общая стопка |",
      curriculumEvidence: {
        grammar: "plural/the",
        newWords: ["book", "magazine", "newspaper"],
        situation: "общая стопка",
      },
    };
    fs.writeFileSync(path.join(dir, "final.judge_progression.json"), JSON.stringify(base));
    const missing = sessionReadiness(dir);
    assert.equal(missing.ready, false);
    assert.match(missing.issues.join("\n"), /три постраничные цепочки introAlignment/);

    const introAlignment = ["book", "magazine", "newspaper"].map((word, index) => ({
      intro: index + 1,
      newWords: [word],
      sceneEvidence: "Текст",
      correctAnswer: "Текст",
      practiceTask: index + 1,
      practiceTarget: "Текст",
      finalEvidence: "Текст",
      sameOperation: true,
    }));
    fs.writeFileSync(path.join(dir, "final.judge_progression.json"), JSON.stringify({
      ...base,
      introAlignment,
      foreignIntroExamples: [],
    }));
    assert.deepEqual(sessionReadiness(dir), { ready: true, issues: [] });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("progression receipt cannot pass while the authored session misses its curriculum row", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-"));
  try {
    const dir = path.join(root, "sessions/en/l03/s43");
    accepted(dir, true);
    const master = fs.readFileSync(path.join(dir, "final.ru.md"));
    fs.writeFileSync(path.join(dir, "final.judge_progression.json"), JSON.stringify({
      verdict: "PASS",
      sourceSha256: crypto.createHash("sha256").update(master).digest("hex"),
      comparedThrough: "en/l03/s42",
      newWords: ["bedroom"],
      sceneNovel: true,
      grammarProgression: "new_operation",
      introPracticeAligned: true,
      curriculumExactMatch: false,
      curriculumRow: "| 43 | новая | plural/the | book, magazine, newspaper | общая стопка |",
      curriculumEvidence: {
        grammar: "plural/the",
        newWords: ["bedroom"],
        situation: "план квартиры",
      },
      introAlignment: [1, 2, 3].map((intro) => ({
        intro,
        newWords: ["bedroom"],
        sceneEvidence: "план квартиры",
        correctAnswer: "This is a bedroom.",
        practiceTask: intro,
        practiceTarget: "This is a bedroom.",
        finalEvidence: "This is a bedroom.",
        sameOperation: true,
      })),
      foreignIntroExamples: [],
    }));
    const result = sessionReadiness(dir);
    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /не подтверждено точное соответствие строке плана курса/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
