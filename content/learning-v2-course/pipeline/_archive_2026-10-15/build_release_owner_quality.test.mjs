import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));

const master = `# Проверка\n\n**Операция:** короткий ответ\n**Новые слова:** —\n\n## Интро 1\n\n### Форма\n\nТекст.\n\n**Ответьте коротко.**\n\n- ✅ **Yes, I am.**\n- ❌ Yes, I are. — *После I нужно am.*\n- ❌ Yes, am I. — *Это порядок вопроса.*\n\n---\n\n## Интро 2\n\n### Порядок слов\n\nВ коротком ответе сначала идёт \`Yes\`, затем местоимение и форма \`am\`.\n\n**Выберите короткий ответ на вопрос \`Are you ready?\`**\n\n- ✅ **Yes, I am.**\n- ❌ Yes, I is. — *С I нужна форма am.*\n- ❌ Am I yes. — *Это порядок вопроса, а не ответа.*\n\n---\n\n## Интро 3\n\n### Одна форма\n\nПосле \`I\` в этой модели всегда остаётся \`am\`.\n\n**Закончите ответ: \`Yes, I ___ .\`**\n\n- ✅ **am**\n- ❌ are — *Are сочетается с you, а не с I.*\n- ❌ is — *Is сочетается с he, she или it, а не с I.*\n\n---\n\n## Практика\n\n**1 · Вставьте слово — ответьте коротко**\nYes, I ___ . → **am** · are · is\n- are — *После I нужно am.*\n- is — *После I нужно am.*\n\nmodes: 1=context_gap_grammar\n`;

const cleanMaster = master
  .replace("**Операция:**", "**Как сказать:**")
  .replaceAll("- ✅ **Yes, I am.**", "- ✅ **Yes, I am.** — *This short answer is formed correctly.*")
  .replace("- ✅ **am**", "- ✅ **am** — *After I, this pattern uses am.*")
  .replaceAll("*Это порядок вопроса.*", "*Неверный порядок вопроса.*")
  .replace("*Это порядок вопроса, а не ответа.*", "*Неверный порядок вопроса, а не ответа.*")
  .replace("Yes, I ___ . → **am** · are · is\n", "Yes, I ___ . → **am** · are · is\n- am — *After I, use am.*\n");

function exactBindings(dir) {
  const digest = (name) => crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, name))).digest("hex");
  const ru = digest("final.ru.md");
  const uk = digest("final.uk.md");
  return { sourceSha256: ru, exactRuSha256: ru, exactUkSha256: uk, localeSha256: uk, practiceAtomicSha256: digest("practice.atomic.json") };
}

function completeMaster(session) {
  const [language, lesson, sessionNumber] = session.split("/");
  const interactionId = `${language}:lesson-${lesson.slice(1)}:session-${sessionNumber.slice(1)}:i01`;
  return cleanMaster
    .replace("**Ответьте коротко.**", "**На вопрос `Are you ready?` ответьте коротко.**")
    .replace("**1 · Вставьте слово — ответьте коротко**", `**1 · Вставьте слово — ответьте коротко**\n<!-- interaction_id: ${interactionId}; family: context_gap_grammar -->`);
}

function evidenceItem(locale, coverage) {
  return {
    fieldPath: `final.${locale}.md`,
    quote: "Выберите короткий ответ на вопрос `Are you ready?`",
    analysis: "Точная цитата подтверждает проверяемую форму и вопрос текущей учебной карточки.",
    coverage: Array.isArray(coverage) ? coverage : [coverage],
  };
}

function validTaste(session, bindings = {}) {
  return {
    sourceSha256: crypto.createHash("sha256").update(cleanMaster).digest("hex"),
    pairwise: "equal",
    pairwise_reason: "Текст сравнили с эталоном по голосу и ясности; уровень сохранён.",
    voice: { score: 4, evidence: ["Выберите короткий ответ на вопрос `Are you ready?`"] },
    humor: { present: true, on_topic: true, examples: ["Выберите короткий ответ на вопрос `Are you ready?`"], misfires: [] },
    ai_text_or_nonsense: [], must_fix: [], verdict: "PASS",
    verdict_reason: "Отчёт подтверждает живой голос и уместный юмор.",
    ...bindings,
    sessionId: session,
    role: "judge_taste",
    reviewer: `learning-v2-reviewer-v1|reviewerId=pipeline-judge_taste|sessionId=${session}|role=judge_taste`,
    evidence: [evidenceItem("ru", "judge_taste")],
  };
}

function factory(session = "en/l02/s33") {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-release-quality-"));
  fs.mkdirSync(path.join(root, "pipeline"));
  for (const name of ["build_release.mjs", "single_phrase_release.mjs", "session_readiness.mjs", "session_header.mjs", "owner_quality.mjs", "progression_quality_gate.mjs", "audit_actor_clarity.mjs", "write_mockup_file.mjs", "practice_explanations_v1.mjs"]) fs.copyFileSync(path.join(here, name), path.join(root, "pipeline", name));
  // The isolated fixture tests readiness after the global course gate. The
  // real gate and its no-scope-bypass behavior run in the integration suite.
  fs.writeFileSync(path.join(root, "pipeline/factory_intro_practice_gate.mjs"), "export function auditFactoryIntroPractice(){return {schemaVersion:'test_fixture_only',verdict:'PASS',inventoryCount:186,auditedSessionCount:186,findingCount:0,perSession:[],findings:[]};}\n");
  const visibleTextModule = path.resolve(here, "../../../modules/learning-v2/content/learner_visible_text_v1.js");
  const fixtureVisibleTextModule = path.join(root, "modules/learning-v2/content/learner_visible_text_v1.js");
  fs.mkdirSync(path.dirname(fixtureVisibleTextModule), { recursive: true });
  fs.copyFileSync(visibleTextModule, fixtureVisibleTextModule);
  const dir = path.join(root, "sessions", session);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "final.ru.md"), completeMaster(session));
  fs.writeFileSync(path.join(dir, "final.uk.md"), completeMaster(session));
  const run = (...extra) => spawnSync(process.execPath, [path.join(root, "pipeline/build_release.mjs"), "--session", session, "--locales", "ru,uk", ...extra], { encoding: "utf8" });
  return { root, dir, run };
}

function makeReady(dir, run) {
  const seedRoot = path.join(path.dirname(path.dirname(path.dirname(path.dirname(dir)))), ".atomic-seed");
  const seeded = run("--out", seedRoot, "--migration-composite-source");
  assert.equal(seeded.status, 0, seeded.stderr + seeded.stdout);
  const session = dir.replace(/^.*[\\/]sessions[\\/]/u, "").replaceAll("\\", "/");
  const snapshotFile = path.join(seedRoot, ...session.split("/"), "source.snapshot.json");
  const snapshot = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
  snapshot.schemaVersion = "learning_v2_atomic_practice_source_v1";
  fs.writeFileSync(path.join(dir, "practice.atomic.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
  const bindings = exactBindings(dir);
  for (const role of ["learner", "pedagogy", "nonsense", "reader"]) {
    const judgeRole = `judge_${role}`;
    const evidence = [evidenceItem("ru", judgeRole)];
    if (role === "learner") evidence.push(evidenceItem("uk", judgeRole));
    fs.writeFileSync(path.join(dir, `final.${judgeRole}.json`), JSON.stringify({
      verdict: "PASS", ...bindings, sessionId: session, role: judgeRole,
      reviewer: `learning-v2-reviewer-v1|reviewerId=pipeline-${judgeRole}|sessionId=${session}|role=${judgeRole}`,
      evidence,
    }));
  }
  fs.writeFileSync(path.join(dir, "final.judge_taste.json"), JSON.stringify(validTaste(session, bindings)));
  fs.writeFileSync(path.join(dir, "locales.judge.json"), JSON.stringify({
    ...bindings, sessionId: session, role: "judge_locales",
    reviewer: `learning-v2-reviewer-v1|reviewerId=pipeline-judge_locales|sessionId=${session}|role=judge_locales`,
    evidence: [evidenceItem("ru", ["judge_locales", "ru"]), evidenceItem("uk", ["judge_locales", "uk"])],
    localeHashes: { ru: bindings.exactRuSha256, uk: bindings.exactUkSha256 }, locales: { uk: { verdict: "PASS" } },
  }));
  fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify({ ...bindings, localeHashes: { ru: bindings.exactRuSha256, uk: bindings.exactUkSha256 }, converged: true, needsHumanReview: false }));
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

test("candidate preview never rewrites a source status even when a stale block is removable", () => {
  const { root, dir, run } = factory();
  try {
    const statusPath = path.join(dir, "status.json");
    const before = JSON.stringify({ blocked: ["judge_learner"], note: "source status must remain untouched by preview" }, null, 2);
    fs.writeFileSync(statusPath, before);
    fs.writeFileSync(path.join(dir, "final.judge_learner.json"), JSON.stringify({ verdict: "PASS" }));
    const result = run("--out", path.join(root, "candidate"), "--candidate-preview");
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal(fs.readFileSync(statusPath, "utf8"), before);
    assert.equal(fs.existsSync(path.join(root, "release/en/l02/s33/learner.json")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a repository-root output path that would create a second nested course tree", () => {
  const { root, run } = factory();
  try {
    // This test owns only output-path validation; the fixture is intentionally
    // minimal and is not an actor-clarity specimen.
    fs.writeFileSync(path.join(root, "pipeline/audit_actor_clarity.mjs"), "process.exit(0);\n");
    const result = run("--out", "content/learning-v2-course/mockup/reviewed-source", "--migration-composite-source");
    assert.notEqual(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stderr + result.stdout, /nested_course_output_path/);
    assert.equal(fs.existsSync(path.join(root, "content/learning-v2-course/mockup/reviewed-source")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("release builds never rewrite the repository legacy admission ledger", () => {
  const { root, run } = factory();
  try {
    const ledgerPath = path.join(root, "migration/canonical-binding-v1/legacy-admission-ledger.json");
    fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
    const ledger = `${JSON.stringify({
      schemaVersion: "learning_v2_legacy_binding_ledger_v1",
      admissionPolicy: "exact_pre_v1_source_evidence_and_release_bytes",
      entries: {},
    }, null, 2)}\n`;
    fs.writeFileSync(ledgerPath, ledger);
    const before = crypto.createHash("sha256").update(fs.readFileSync(ledgerPath)).digest("hex");
    const result = run("--out", path.join(root, "private-review"));
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal(crypto.createHash("sha256").update(fs.readFileSync(ledgerPath)).digest("hex"), before);
    assert.equal(fs.readFileSync(ledgerPath, "utf8"), ledger);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("complete current receipts allow a new default release build", () => {
  const { root, dir, run } = factory();
  try {
    makeReady(dir, run);
    const result = run();
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const learner = JSON.parse(fs.readFileSync(path.join(root, "release/en/l02/s33/learner.json"), "utf8"));
    assert.equal(learner.sourceBindingSchemaVersion, undefined);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a versioned status makes the release retain the canonical binding boundary", () => {
  const { root, dir, run } = factory();
  try {
    makeReady(dir, run);
    const statusPath = path.join(dir, "status.json");
    const status = JSON.parse(fs.readFileSync(statusPath, "utf8"));
    status.bindingSchemaVersion = "learning_v2_canonical_source_binding_v1";
    fs.writeFileSync(statusPath, JSON.stringify(status));
    const result = run();
    assert.equal(result.status, 0, result.stderr + result.stdout);
    for (const name of ["intro.json", "learner.json", "learner.uk.json"]) {
      const child = JSON.parse(fs.readFileSync(path.join(root, "release/en/l02/s33", name), "utf8"));
      assert.equal(child.sourceBindingSchemaVersion, "learning_v2_canonical_source_binding_v1", name);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("canonical release cannot omit Ukrainian via --locales ru", () => {
  const { root, dir, run } = factory();
  try {
    makeReady(dir, run);
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
    makeReady(dir, run);
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
