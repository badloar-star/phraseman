import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { currentCurriculumRow, sessionReadiness } from "./session_readiness.mjs";

const ordinaryJudges = ["learner", "pedagogy", "nonsense", "reader"];
const hashFile = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const exactBindings = (dir) => ({
  sourceSha256: hashFile(path.join(dir, "final.ru.md")),
  exactRuSha256: hashFile(path.join(dir, "final.ru.md")),
  exactUkSha256: hashFile(path.join(dir, "final.uk.md")),
  practiceAtomicSha256: hashFile(path.join(dir, "practice.atomic.json")),
});
const receiptIdentity = (dir, role) => {
  const session = dir.replace(/\\/gu, "/").match(/\/sessions\/([a-z]{2}\/l\d{2}\/s\d{2})$/iu)?.[1];
  assert.ok(session, `fixture path must end with sessions/<lang>/lNN/sNN: ${dir}`);
  return {
    session,
    sessionId: session,
    role,
    reviewer: `learning-v2-reviewer-v1|reviewerId=pipeline-${role}|sessionId=${session}|role=${role}`,
  };
};
const evidenceFor = (role, locale, quote, extraCoverage = []) => ({
  fieldPath: `final.${locale}.md`,
  quote: String(quote).trim(),
  analysis: "Точная цитата подтверждает проверяемый аспект текущей сессии.",
  coverage: [role, ...extraCoverage],
});

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

function taste(master, bindings = {}) {
  return {
    sourceSha256: crypto.createHash("sha256").update(master).digest("hex"),
    evidence: [evidenceFor("judge_taste", "ru", String(master))],
    pairwise: "equal",
    pairwise_reason: "Текст сравнили с эталоном по голосу и ясности; уровень сохранён.",
    voice: { score: 4, evidence: ["«маленькая скрепка» — живой образ из правила"] },
    humor: { present: true, on_topic: true, examples: ["«маленькая скрепка» — образ помогает форме"], misfires: [] },
    ai_text_or_nonsense: [], must_fix: [], verdict: "PASS",
    verdict_reason: "Отчёт подтверждает живой голос и уместный юмор.",
    ...bindings,
  };
}

function accepted(dir, withTaste) {
  fs.mkdirSync(dir, { recursive: true });
  const master = "Текст с образом «маленькая скрепка».\n";
  const localized = "Поточна локалізація містить перевірюваний текст.\n";
  fs.writeFileSync(path.join(dir, "final.ru.md"), master);
  fs.writeFileSync(path.join(dir, "final.uk.md"), localized);
  fs.writeFileSync(path.join(dir, "practice.atomic.json"), "{}\n");
  const bindings = exactBindings(dir);
  for (const role of ordinaryJudges) fs.writeFileSync(path.join(dir, `final.judge_${role}.json`), JSON.stringify({ verdict: "PASS", evidence: [evidenceFor(`judge_${role}`, "ru", master)], ...bindings, ...receiptIdentity(dir, `judge_${role}`) }));
  if (withTaste) fs.writeFileSync(path.join(dir, "final.judge_taste.json"), JSON.stringify(taste(master, { ...bindings, ...receiptIdentity(dir, "judge_taste") })));
  fs.writeFileSync(path.join(dir, "locales.judge.json"), JSON.stringify({ ...bindings, ...receiptIdentity(dir, "judge_locales"), evidence: [evidenceFor("judge_locales", "ru", master, ["ru"]), evidenceFor("judge_locales", "uk", localized, ["uk"])], localeHashes: { ru: bindings.exactRuSha256, uk: bindings.exactUkSha256 }, locales: { uk: { verdict: "PASS" } } }));
  fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify({ ...bindings, localeHashes: { ru: bindings.exactRuSha256, uk: bindings.exactUkSha256 }, converged: true, needsHumanReview: false }));
}

test("readiness requires the current taste receipt in the owner-scoped series", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s33");
    accepted(dir, false);
    const missing = sessionReadiness(dir);
    assert.equal(missing.ready, false);
    assert.match(missing.issues.join("\n"), /final\.judge_taste\.json/);

    fs.writeFileSync(path.join(dir, "final.judge_taste.json"), JSON.stringify(taste(fs.readFileSync(path.join(dir, "final.ru.md")), { ...exactBindings(dir), ...receiptIdentity(dir, "judge_taste") })));
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

function convertAcceptedFixtureToLegacy(dir) {
  for (const name of [
    ...ordinaryJudges.map((role) => `final.judge_${role}.json`),
    "locales.judge.json",
    "status.json",
  ]) {
    const file = path.join(dir, name);
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    delete value.bindingSchemaVersion;
    delete value.exactRuSha256;
    delete value.exactUkSha256;
    fs.writeFileSync(file, JSON.stringify(value));
  }
}

function legacyLedgerFixture(root, sessionId, sourceDir, { includeEntry = true } = {}) {
  const match = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/u.exec(sessionId);
  const releaseRoot = path.join(root, "release");
  const releaseDir = path.join(releaseRoot, match[1], `l${match[2]}`, `s${match[3]}`);
  fs.mkdirSync(releaseDir, { recursive: true });
  const released = new Date("2026-09-01T00:00:00.000Z");
  const sourceTime = new Date("2026-09-02T00:00:00.000Z");
  for (const name of ["final.ru.md", "final.uk.md", "practice.atomic.json"]) fs.utimesSync(path.join(sourceDir, name), sourceTime, sourceTime);
  for (const name of ["intro.json", "learner.json", "learner.uk.json", "answers.json"]) {
    const file = path.join(releaseDir, name);
    const value = name === "answers.json"
      ? []
      : {
          schemaVersion: name === "intro.json" ? "learning_v2_course_session_intro_child_v1" : "learning_v2_course_session_learner_child_v1",
          courseSessionId: `${match[1]}:lesson-${match[2]}:session-${match[3]}`,
        };
    fs.writeFileSync(file, JSON.stringify(value));
    fs.utimesSync(file, released, released);
  }
  const receiptNames = [...ordinaryJudges.map((role) => `final.judge_${role}.json`), "locales.judge.json", "status.json"];
  const sourceNames = ["final.ru.md", "final.uk.md", "practice.atomic.json"];
  const releaseNames = ["intro.json", "learner.json", "learner.uk.json", "answers.json"];
  const courseSessionId = `${match[1]}:lesson-${match[2]}:session-${match[3]}`;
  const entry = {
    sessionId,
    courseSessionId,
    sourceDigests: Object.fromEntries(sourceNames.map((name) => [name, hashFile(path.join(sourceDir, name))])),
    evidenceDigests: Object.fromEntries(receiptNames.map((name) => [name, hashFile(path.join(sourceDir, name))])),
    releaseChildren: Object.fromEntries(releaseNames.map((name) => {
      const value = JSON.parse(fs.readFileSync(path.join(releaseDir, name), "utf8"));
      return [name, {
        sha256: hashFile(path.join(releaseDir, name)),
        schemaVersion: value.schemaVersion ?? "json_array_v1",
        courseSessionId: value.courseSessionId ?? courseSessionId,
      }];
    })),
  };
  const ledgerPath = path.join(root, "migration/canonical-binding-v1/legacy-admission-ledger.json");
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.writeFileSync(ledgerPath, `${JSON.stringify({
    schemaVersion: "learning_v2_legacy_binding_ledger_v1",
    generatedAt: "2026-10-04T00:00:00.000Z",
    admissionPolicy: "exact_pre_v1_source_evidence_and_release_bytes",
    entries: includeEntry ? { [sessionId]: entry } : {},
  }, null, 2)}\n`);
  return { releaseRoot, ledgerPath, releaseDir };
}

test("an exact ledger legacy session remains ready even when markers are deleted and mtimes are reset", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-legacy-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    accepted(dir, false);
    convertAcceptedFixtureToLegacy(dir);
    const { releaseRoot, ledgerPath } = legacyLedgerFixture(root, "en/l02/s32", dir);
    assert.deepEqual(sessionReadiness(dir, ["uk"], { releaseRoot, legacyLedgerPath: ledgerPath }), { ready: true, issues: [] });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a versioned new receipt missing triple binding is HOLD", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-versioned-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    accepted(dir, false);
    const file = path.join(dir, "final.judge_learner.json");
    const receipt = JSON.parse(fs.readFileSync(file, "utf8"));
    receipt.bindingSchemaVersion = "learning_v2_canonical_source_binding_v1";
    delete receipt.exactUkSha256;
    fs.writeFileSync(file, JSON.stringify(receipt));
    const result = sessionReadiness(dir, ["uk"]);
    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /judge_learner: нет exactUkSha256/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

for (const sourceName of ["final.ru.md", "final.uk.md", "practice.atomic.json"]) {
  test(`modified legacy source ${sourceName} cannot use ledger admission`, () => {
    const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-legacy-modified-"));
    try {
      const dir = path.join(root, "sessions/en/l02/s32");
      accepted(dir, false);
      convertAcceptedFixtureToLegacy(dir);
      const { releaseRoot, ledgerPath } = legacyLedgerFixture(root, "en/l02/s32", dir);
      fs.appendFileSync(path.join(dir, sourceName), "изменено\n");
      const result = sessionReadiness(dir, ["uk"], { releaseRoot, legacyLedgerPath: ledgerPath });
      assert.equal(result.ready, false);
      assert.match(result.issues.join("\n"), new RegExp(`legacy ledger.*${sourceName}.*digest|sourceSha256`, "iu"));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}

test("removing triple fields from one record cannot downgrade a versioned session", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-downgrade-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    accepted(dir, false);
    for (const name of [...ordinaryJudges.map((role) => `final.judge_${role}.json`), "locales.judge.json", "status.json"]) {
      const file = path.join(dir, name);
      const record = JSON.parse(fs.readFileSync(file, "utf8"));
      record.bindingSchemaVersion = "learning_v2_canonical_source_binding_v1";
      fs.writeFileSync(file, JSON.stringify(record));
    }
    const learner = path.join(dir, "final.judge_learner.json");
    const downgraded = JSON.parse(fs.readFileSync(learner, "utf8"));
    delete downgraded.bindingSchemaVersion;
    delete downgraded.exactRuSha256;
    delete downgraded.exactUkSha256;
    fs.writeFileSync(learner, JSON.stringify(downgraded));
    const result = sessionReadiness(dir, ["uk"]);
    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /downgrade|judge_learner: нет exact/iu);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("an unknown session cannot self-enroll as legacy by deleting every marker", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-release-downgrade-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    accepted(dir, false);
    convertAcceptedFixtureToLegacy(dir);
    const { releaseRoot, ledgerPath } = legacyLedgerFixture(root, "en/l02/s32", dir, { includeEntry: false });
    const result = sessionReadiness(dir, ["uk"], { releaseRoot, legacyLedgerPath: ledgerPath });
    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /legacy ledger.*not allowlisted|нет exactRuSha256/iu);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

for (const child of ["intro.json", "learner.json", "learner.uk.json", "answers.json"]) {
  test(`mutating legacy release child ${child} invalidates ledger admission`, () => {
    const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-ledger-release-"));
    try {
      const dir = path.join(root, "sessions/en/l02/s32");
      accepted(dir, false);
      convertAcceptedFixtureToLegacy(dir);
      const { releaseRoot, ledgerPath, releaseDir } = legacyLedgerFixture(root, "en/l02/s32", dir);
      fs.appendFileSync(path.join(releaseDir, child), "\n");
      const result = sessionReadiness(dir, ["uk"], { releaseRoot, legacyLedgerPath: ledgerPath });
      assert.equal(result.ready, false);
      assert.match(result.issues.join("\n"), new RegExp(`legacy ledger.*${child}.*digest`, "iu"));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}

test("touching stale receipts cannot hide a changed Ukrainian source", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    fs.mkdirSync(dir, { recursive: true });
    const ru = "Текст с образом «маленькая скрепка».\n";
    const uk = "Локалізація\n";
    const atomic = "{}\n";
    fs.writeFileSync(path.join(dir, "final.ru.md"), ru);
    fs.writeFileSync(path.join(dir, "final.uk.md"), uk);
    fs.writeFileSync(path.join(dir, "practice.atomic.json"), atomic);
    const hashes = {
      sourceSha256: crypto.createHash("sha256").update(ru).digest("hex"),
      exactRuSha256: crypto.createHash("sha256").update(ru).digest("hex"),
      exactUkSha256: crypto.createHash("sha256").update(uk).digest("hex"),
      practiceAtomicSha256: crypto.createHash("sha256").update(atomic).digest("hex"),
    };
    for (const role of ordinaryJudges) fs.writeFileSync(path.join(dir, `final.judge_${role}.json`), JSON.stringify({ verdict: "PASS", role: `judge_${role}`, evidence: [ru.trim()], ...hashes }));
    fs.writeFileSync(path.join(dir, "locales.judge.json"), JSON.stringify({ ...hashes, verdict: "PASS", localeHashes: { ru: hashes.exactRuSha256, uk: hashes.exactUkSha256 }, locales: { uk: { verdict: "PASS" } } }));
    fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify({ ...hashes, converged: true, needsHumanReview: false, localeHashes: { ru: hashes.exactRuSha256, uk: hashes.exactUkSha256 } }));

    fs.writeFileSync(path.join(dir, "final.uk.md"), "Змінена локалізація\n");
    for (const name of [...ordinaryJudges.map((role) => `final.judge_${role}.json`), "locales.judge.json", "status.json"]) {
      const file = path.join(dir, name);
      fs.writeFileSync(file, fs.readFileSync(file));
    }

    const result = sessionReadiness(dir, ["uk"]);
    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /exactUkSha256|localeHashes\.uk/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("contradictory duplicate hash fields fail closed", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    accepted(dir, false);
    const file = path.join(dir, "final.judge_learner.json");
    const receipt = JSON.parse(fs.readFileSync(file, "utf8"));
    receipt.sourceSha256 = receipt.exactRuSha256;
    receipt.exactRuSha256 = "0".repeat(64);
    receipt.exactUkSha256 = hashFile(path.join(dir, "final.uk.md"));
    fs.writeFileSync(file, JSON.stringify(receipt));
    const result = sessionReadiness(dir, ["uk"]);
    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /judge_learner: exactRuSha256/u);
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
      ...exactBindings(dir),
      ...receiptIdentity(dir, "judge_progression"),
      verdict: "PASS",
      sourceSha256: crypto.createHash("sha256").update(master).digest("hex"),
      evidence: [evidenceFor("judge_progression", "ru", String(master))],
      comparedThrough: "en/l03/s24",
      newWords: ["phone"],
      sceneNovel: true,
      grammarProgression: "new_operation",
      introPracticeAligned: true,
      curriculumExactMatch: true,
      curriculumRow: currentCurriculumRow("en/l03/s25"),
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
      ...exactBindings(dir),
      ...receiptIdentity(dir, "judge_progression"),
      verdict: "PASS",
      sourceSha256: crypto.createHash("sha256").update(master).digest("hex"),
      evidence: [evidenceFor("judge_progression", "ru", String(master))],
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
      ...exactBindings(dir),
      ...receiptIdentity(dir, "judge_progression"),
      verdict: "PASS",
      sourceSha256: crypto.createHash("sha256").update(master).digest("hex"),
      evidence: [evidenceFor("judge_progression", "ru", String(master))],
      comparedThrough: "en/l03/s42",
      newWords: ["book", "magazine", "newspaper"],
      sceneNovel: true,
      grammarProgression: "new_operation",
      introPracticeAligned: true,
      curriculumExactMatch: true,
      curriculumRow: currentCurriculumRow("en/l03/s43"),
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
      ...exactBindings(dir),
      ...receiptIdentity(dir, "judge_progression"),
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

test("a PASS flag cannot override a progression receipt bound to the wrong curriculum row", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-"));
  try {
    const dir = path.join(root, "sessions/en/l03/s43");
    accepted(dir, true);
    fs.writeFileSync(path.join(dir, "final.judge_progression.json"), JSON.stringify({
      ...exactBindings(dir),
      ...receiptIdentity(dir, "judge_progression"),
      verdict: "PASS",
      comparedThrough: "en/l03/s42",
      newWords: ["book", "magazine", "newspaper"],
      sceneNovel: true,
      grammarProgression: "new_operation",
      introPracticeAligned: true,
      curriculumExactMatch: true,
      curriculumRow: "| 43 | новая | подменённая строка | book, magazine, newspaper | чужая сцена |",
      curriculumEvidence: { grammar: "plural/the", newWords: ["book", "magazine", "newspaper"], situation: "общая стопка" },
      introAlignment: ["book", "magazine", "newspaper"].map((word, index) => ({
        intro: index + 1,
        newWords: [word],
        sceneEvidence: "общая стопка",
        correctAnswer: "Books are fine.",
        practiceTask: index + 1,
        practiceTarget: "Books are fine.",
        finalEvidence: "Books are fine.",
        sameOperation: true,
      })),
      foreignIntroExamples: [],
    }));

    const result = sessionReadiness(dir);
    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /строка плана.*текущ/iu);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a progression receipt cannot quote a stale intro correct answer", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-readiness-intro-answer-"));
  try {
    const dir = path.join(root, "sessions/en/l03/s43");
    accepted(dir, true);
    const intros = ["There are books.", "There are magazines.", "There are newspapers."]
      .map((answer, index) => `## Интро ${index + 1}\n\nТекущая форма разобрана.\n\n**Выберите ответ.**\n\n- ✅ **${answer}**\n- ❌ There is one. — *Нужна форма для нескольких предметов.*`)
      .join("\n\n");
    fs.writeFileSync(path.join(dir, "final.ru.md"), `# Проверка\n\n${intros}\n\n## Практика\n`);
    fs.writeFileSync(path.join(dir, "final.uk.md"), "Локалізація після актуального майстра.\n");
    const bindings = exactBindings(dir);
    for (const name of [
      ...ordinaryJudges.map((role) => `final.judge_${role}.json`),
      "final.judge_taste.json",
      "locales.judge.json",
      "status.json",
    ]) {
      const file = path.join(dir, name);
      const value = JSON.parse(fs.readFileSync(file, "utf8"));
      Object.assign(value, bindings);
      if (name === "locales.judge.json" || name === "status.json") value.localeHashes = { ru: bindings.exactRuSha256, uk: bindings.exactUkSha256 };
      fs.writeFileSync(file, JSON.stringify(value));
    }
    fs.writeFileSync(path.join(dir, "final.judge_progression.json"), JSON.stringify({
      ...bindings,
      ...receiptIdentity(dir, "judge_progression"),
      verdict: "PASS",
      comparedThrough: "en/l03/s42",
      newWords: ["book", "magazine", "newspaper"],
      sceneNovel: true,
      grammarProgression: "new_operation",
      introPracticeAligned: true,
      curriculumExactMatch: true,
      curriculumRow: currentCurriculumRow("en/l03/s43"),
      curriculumEvidence: { grammar: "plural/the", newWords: ["book", "magazine", "newspaper"], situation: "общая стопка" },
      introAlignment: ["book", "magazine", "newspaper"].map((word, index) => ({
        intro: index + 1,
        newWords: [word],
        sceneEvidence: "общая стопка",
        correctAnswer: index === 1 ? "There are old magazines." : ["There are books.", "There are magazines.", "There are newspapers."][index],
        practiceTask: index + 1,
        practiceTarget: "There are several items.",
        finalEvidence: "Финал проверяет ту же операцию.",
        sameOperation: true,
      })),
      foreignIntroExamples: [],
    }));

    const result = sessionReadiness(dir);
    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /интро 2: correctAnswer не совпадает/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
