import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));

const master = `# Проверка\n\n**Операция:** короткий ответ\n**Новые слова:** —\n\n## Интро 1\n\n### Форма\n\nТекст.\n\n**Ответьте коротко.**\n\n- ✅ **Yes, I am.**\n- ❌ Yes, I are. — *После I нужно am.*\n- ❌ Yes, am I. — *Это порядок вопроса.*\n\n---\n\n## Практика\n\n**1 · Вставьте слово — ответьте коротко**\nYes, I ___ . → **am** · are · is\n- are — *После I нужно am.*\n- is — *После I нужно am.*\n\nmodes: 1=context_gap_grammar\n`;

function validTaste() {
  return {
    sourceSha256: crypto.createHash("sha256").update(master).digest("hex"),
    pairwise: "equal",
    pairwise_reason: "Текст сравнили с эталоном по голосу и ясности; уровень сохранён.",
    voice: { score: 4, evidence: ["«маленькая скрепка» — живой образ из правила"] },
    humor: { present: true, on_topic: true, examples: ["«Ответьте коротко» — образ помогает форме"], misfires: [] },
    ai_text_or_nonsense: [], must_fix: [], verdict: "PASS",
    verdict_reason: "Отчёт подтверждает живой голос и уместный юмор.",
  };
}

function factory(session = "en/l02/s33") {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-release-quality-"));
  fs.mkdirSync(path.join(root, "pipeline"));
  for (const name of ["build_release.mjs", "session_readiness.mjs", "owner_quality.mjs", "progression_quality_gate.mjs"]) fs.copyFileSync(path.join(here, name), path.join(root, "pipeline", name));
  const dir = path.join(root, "sessions", session);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "final.ru.md"), master);
  fs.writeFileSync(path.join(dir, "final.uk.md"), master);
  const run = (...extra) => spawnSync(process.execPath, [path.join(root, "pipeline/build_release.mjs"), "--session", session, "--locales", "ru,uk", ...extra], { encoding: "utf8" });
  return { root, dir, run };
}

function makeReady(dir) {
  for (const role of ["learner", "pedagogy", "nonsense", "reader"]) fs.writeFileSync(path.join(dir, `final.judge_${role}.json`), JSON.stringify({ verdict: "PASS" }));
  fs.writeFileSync(path.join(dir, "final.judge_taste.json"), JSON.stringify(validTaste()));
  fs.writeFileSync(path.join(dir, "locales.judge.json"), JSON.stringify({ locales: { uk: { verdict: "PASS" } } }));
  fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify({ converged: true, needsHumanReview: false }));
}

test("default release blocks before writing when current taste evidence is missing", () => {
  const { root, run } = factory();
  try {
    const existing = path.join(root, "release/en/l02/s33/learner.json");
    fs.mkdirSync(path.dirname(existing), { recursive: true });
    fs.writeFileSync(existing, "published-sentinel");
    const result = run();
    assert.equal(result.status, 1, result.stderr + result.stdout);
    assert.match(result.stderr + result.stdout, /final\.judge_taste\.json/);
    assert.equal(fs.readFileSync(existing, "utf8"), "published-sentinel");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("an explicit --out equal to default release cannot bypass quality readiness", () => {
  const { root, run } = factory();
  try {
    const result = run("--out", path.join(root, "release"));
    assert.equal(result.status, 1, result.stderr + result.stdout);
    assert.equal(fs.existsSync(path.join(root, "release/en/l02/s33/learner.json")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("private review output remains buildable before judges", () => {
  const { root, run } = factory();
  try {
    const review = path.join(root, "private-review");
    const result = run("--out", review);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal(fs.existsSync(path.join(review, "en/l02/s33/learner.json")), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("complete current receipts allow a new default release build", () => {
  const { root, dir, run } = factory();
  try {
    makeReady(dir);
    const result = run();
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal(fs.existsSync(path.join(root, "release/en/l02/s33/learner.json")), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("canonical release cannot omit Ukrainian via --locales ru", () => {
  const { root, dir } = factory();
  try {
    makeReady(dir);
    fs.unlinkSync(path.join(dir, "final.uk.md"));
    fs.unlinkSync(path.join(dir, "locales.judge.json"));
    const result = spawnSync(process.execPath, [path.join(root, "pipeline/build_release.mjs"), "--session", "en/l02/s33", "--locales", "ru"], { encoding: "utf8" });
    assert.equal(result.status, 1, result.stderr + result.stdout);
    assert.match(result.stderr + result.stdout, /ru.*uk/);
    assert.equal(fs.existsSync(path.join(root, "release/en/l02/s33/learner.json")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("L3 default release rechecks each locale before writing despite ready receipts", () => {
  const { root, dir, run } = factory("en/l03/s01");
  try {
    makeReady(dir);
    const existing = path.join(root, "release/en/l03/s01/learner.json");
    fs.mkdirSync(path.dirname(existing), { recursive: true });
    fs.writeFileSync(existing, "published-sentinel");
    const checker = path.join(root, "pipeline/run.mjs");
    fs.writeFileSync(checker, `if(process.argv.includes('final.uk.md')) console.log('ДИСТРАКТОРЫ НИЖЕ СТУПЕНИ: uk');`);
    const blocked = run();
    assert.equal(blocked.status, 1, blocked.stderr + blocked.stdout);
    assert.match(blocked.stderr + blocked.stdout, /ДИСТРАКТОРЫ НИЖЕ СТУПЕНИ/);
    assert.equal(fs.readFileSync(existing, "utf8"), "published-sentinel");
    fs.writeFileSync(checker, "process.exit(2);");
    assert.equal(run().status, 1, "failed checker must fail closed");
    assert.equal(fs.readFileSync(existing, "utf8"), "published-sentinel");
    fs.writeFileSync(checker, "// no hard facts\n");
    assert.equal(run().status, 0, "clear checks allow release");
  } finally {
    const parent = fs.realpathSync(os.tmpdir());
    assert.equal(path.dirname(root), parent);
    assert.ok(path.basename(root).startsWith("learning-v2-release-quality-"));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
