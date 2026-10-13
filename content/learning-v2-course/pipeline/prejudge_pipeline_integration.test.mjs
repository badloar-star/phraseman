import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { atomicMarkdownParityIssues, parsePractice } from "./build_release.mjs";
import { sessionReadiness } from "./session_readiness.mjs";
import { machineFacts } from "./run.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COURSE_ROOT = path.resolve(HERE, "..");
const SESSION = "en/l01/s01";
const SOURCE_DIR = path.join(COURSE_ROOT, "sessions", ...SESSION.split("/"));

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-prejudge-"));
  for (const name of ["final.ru.md", "final.uk.md", "practice.atomic.json"]) {
    fs.copyFileSync(path.join(SOURCE_DIR, name), path.join(dir, name));
  }
  const atomic = JSON.parse(fs.readFileSync(path.join(dir, "practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) {
    const file = path.join(dir, `final.${locale}.md`);
    const chunks = fs.readFileSync(file, "utf8").split(/(?=^\*\*\d+ · )/mu);
    const interactions = atomic.interactionsByLocale[locale];
    for (const [index, interaction] of interactions.entries()) {
      const chunkIndex = chunks.findIndex((chunk) => chunk.startsWith(`**${index + 1} · `));
      if (chunkIndex < 0) continue;
      let chunk = chunks[chunkIndex];
      const feedback = interaction.modePayload?.choiceFeedback ?? [];
      if (feedback.length && !/^\s*-\s+.+—\s+\*/mu.test(chunk)) {
        const lines = feedback.map((entry) => {
          const responseIndex = Number(/:r(\d+)$/u.exec(entry.responseId)?.[1]) - 1;
          const option = interaction.responseOptions?.[responseIndex]?.text ?? "";
          return `- ${option} — *${entry.feedbackByLocale?.[locale] ?? ""}*`;
        }).join("\n");
        chunk = chunk.replace(/^(Варианты|Варіанти):[^\r\n]+/mu, (line) => `${line}\n${lines}`);
      }
      if (new Set(["phrase_builder", "listen_build_dictation"]).has(interaction.family) && !/^(?:Плитки|Плитки):/mu.test(chunk)) {
        const payload = interaction.modePayload ?? {};
        const tokens = [...(payload.orderedTokens ?? []), ...(payload.authoredDistractorTokens ?? [])];
        if (tokens.length) chunk = chunk.replace(/^(Цель|Ціль):[^\r\n]+/mu, (line) => `${line}\nПлитки: ${tokens.map((token) => `\`${token}\``).join(" · ")}`);
      }
      chunks[chunkIndex] = chunk;
    }
    const modes = interactions.map((interaction, index) => `${index + 1}=${interaction.family}`).join(", ");
    fs.writeFileSync(file, `${chunks.join("").trimEnd()}\n\nmodes: ${modes}\n`);
  }
  return dir;
}

function runJudge(dir, file = "final.ru.md") {
  return spawnSync(process.execPath, [path.join(HERE, "run.mjs"), "judge", "--session", SESSION, "--file", file, "--backend", "mock"], {
    cwd: COURSE_ROOT,
    encoding: "utf8",
    env: { ...process.env, FACTORY_SESSION_DIR: dir },
  });
}

function runJudgeWithEnv(dir, extraEnv, file = "final.ru.md") {
  return spawnSync(process.execPath, [path.join(HERE, "run.mjs"), "judge", "--session", SESSION, "--file", file, "--backend", "mock"], {
    cwd: COURSE_ROOT,
    encoding: "utf8",
    env: { ...process.env, FACTORY_SESSION_DIR: dir, ...extraEnv },
  });
}

function runFull(session, dir) {
  return spawnSync(process.execPath, [path.join(HERE, "run.mjs"), "full", "--session", session, "--backend", "mock"], {
    cwd: COURSE_ROOT,
    encoding: "utf8",
    env: { ...process.env, FACTORY_SESSION_DIR: dir },
  });
}

function runLocalize(dir, extraEnv = {}, locales = "uk") {
  return spawnSync(process.execPath, [path.join(HERE, "run.mjs"), "localize", "--session", SESSION, "--file", "final.ru.md", "--locales", locales, "--backend", "mock"], {
    cwd: COURSE_ROOT,
    encoding: "utf8",
    env: { ...process.env, FACTORY_SESSION_DIR: dir, ...extraEnv },
  });
}

function sourceBindings(dir) {
  const digest = (name) => crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, name))).digest("hex");
  const ru = digest("final.ru.md");
  const uk = digest("final.uk.md");
  return {
    sourceSha256: ru,
    exactRuSha256: ru,
    exactUkSha256: uk,
    practiceAtomicSha256: digest("practice.atomic.json"),
    localeHashes: { ru, uk },
  };
}

function sourceEvidence(dir, locale = "ru") {
  return fs.readFileSync(path.join(dir, `final.${locale}.md`), "utf8")
    .split(/\r?\n/gu)
    .map((line) => ({ value: line.replace(/[`*_#]/gu, "").trim(), heading: /^\s{0,3}#{1,6}\s+\S/u.test(line) }))
    .find(({ value, heading }) => !heading && value.length >= 12 && (value.match(/[\p{L}\p{N}]+/gu) ?? []).length >= 2)?.value;
}

function structuredEvidence(dir, locale, coverage) {
  return {
    fieldPath: `final.${locale}.md`,
    quote: sourceEvidence(dir, locale),
    analysis: "Точная цитата подтверждает проверяемый аспект текущей сессии.",
    coverage: Array.isArray(coverage) ? coverage : [coverage],
  };
}

test("canonical parity helper covers identity, count, order, IDs, families, and prompts", async (t) => {
  const dir = fixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const atomic = JSON.parse(fs.readFileSync(path.join(dir, "practice.atomic.json"), "utf8"));
  const tasksByLocale = Object.fromEntries(["ru", "uk"].map((locale) => [
    locale,
    parsePractice(fs.readFileSync(path.join(dir, `final.${locale}.md`), "utf8")),
  ]));
  const check = (source) => atomicMarkdownParityIssues({
    sessionIdentity: SESSION,
    sessionId: "en:lesson-01:session-01",
    atomicSource: source,
    tasksByLocale,
  });
  assert.deepEqual(check(structuredClone(atomic)), []);

  const cases = [
    ["schemaVersion", (copy) => { copy.schemaVersion = "stale"; }, /atomic_source_contract/u],
    ["courseSessionId", (copy) => { copy.courseSessionId = "en:lesson-01:session-99"; }, /atomic_source_contract/u],
    ["count", (copy) => { copy.interactionsByLocale.ru.pop(); }, /atomic_markdown_parity:.+:ru:index=0/u],
    ["order", (copy) => { [copy.interactionsByLocale.ru[0], copy.interactionsByLocale.ru[1]] = [copy.interactionsByLocale.ru[1], copy.interactionsByLocale.ru[0]]; }, /atomic_markdown_parity:.+:ru:index=0/u],
    ["interactionId", (copy) => { copy.interactionsByLocale.ru[0].interactionId += ":stale"; }, /atomic_markdown_parity:.+:ru:index=0/u],
    ["family", (copy) => { copy.interactionsByLocale.ru[0].family = "phrase_builder"; }, /atomic_markdown_parity:.+:ru:index=0/u],
    ["prompt", (copy) => { copy.interactionsByLocale.ru[0].prompt = "STALE"; }, /atomic_markdown_parity:.+:ru:index=0/u],
  ];
  for (const [name, mutate, expected] of cases) {
    await t.test(name, () => {
      const copy = structuredClone(atomic);
      mutate(copy);
      assert.match(check(copy)[0] ?? "", expected);
    });
  }

  const buildRelease = fs.readFileSync(path.join(HERE, "build_release.mjs"), "utf8");
  assert.match(buildRelease, /atomicMarkdownParityIssues\(\{/u);
});

test("judge runs the pre-judge gate before its first mocked model call", () => {
  const dir = fixture();
  try {
    const result = runJudge(dir);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = `${result.stdout}\n${result.stderr}`;
    const gateIndex = output.indexOf("PREJUDGE PASS");
    const modelIndex = output.indexOf("backend=mock");
    assert.ok(gateIndex >= 0, output);
    assert.ok(modelIndex > gateIndex, output);
    const receipts = fs.readdirSync(dir).filter((name) => /^final\.judge_.+\.json$/u.test(name));
    assert.ok(receipts.length > 0);
    const expectedSha256 = crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, "final.ru.md"))).digest("hex");
    assert.deepEqual([...new Set(receipts.map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")).sourceSha256))], [expectedSha256]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a PASS judge response without exact source evidence is rejected before any receipt write", () => {
  const dir = fixture();
  try {
    const result = runJudgeWithEnv(dir, { FACTORY_MOCK_JUDGE_OMIT_EVIDENCE: "1" });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, output);
    assert.match(output, /JUDGE RECEIPT HOLD.*нет evidence/su);
    assert.equal(fs.readdirSync(dir).filter((name) => /^final\.judge_.+\.json$/u.test(name)).length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("judge HOLD makes no model call and writes no judge receipt", () => {
  const dir = fixture();
  try {
    const atomicPath = path.join(dir, "practice.atomic.json");
    const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
    atomic.courseSessionId = "en:lesson-01:session-99";
    fs.writeFileSync(atomicPath, JSON.stringify(atomic, null, 2));

    const result = runJudge(dir);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, output);
    assert.match(output, /PREJUDGE HOLD.*atomic_source_contract/su);
    assert.doesNotMatch(output, /backend=mock/u);
    assert.equal(fs.readdirSync(dir).filter((name) => /^final\.judge_.+\.json$/u.test(name)).length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("judge binds a draft to its own exact bytes instead of substituting final content", () => {
  const dir = fixture();
  try {
    const draft = fs.readFileSync(path.join(dir, "final.ru.md"), "utf8")
      .replace(/^#\s+.+$/mu, "# CANDIDATE BYTE MARKER");
    fs.writeFileSync(path.join(dir, "draft_A.ru.md"), draft);
    const result = runJudge(dir, "draft_A.ru.md");
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 0, output);
    assert.match(output, /backend=mock/u);
    const receipts = fs.readdirSync(dir).filter((name) => /^draft_A\.judge_.+\.json$/u.test(name));
    assert.ok(receipts.length > 0, output);
    const candidateSha256 = crypto.createHash("sha256").update(draft).digest("hex");
    const finalSha256 = crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, "final.ru.md"))).digest("hex");
    assert.notEqual(candidateSha256, finalSha256);
    for (const name of receipts) {
      const receipt = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
      assert.equal(receipt.sourceKind, "candidate");
      assert.equal(receipt.sourceSha256, candidateSha256);
      assert.equal(receipt.exactRuSha256, candidateSha256);
      assert.match(receipt.learnerProjectionSha256, /^[a-f0-9]{64}$/u);
      assert.deepEqual(receipt.sourcePaths, ["draft_A.ru.md"]);
      assert.equal(Object.prototype.hasOwnProperty.call(receipt, "exactUkSha256"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(receipt, "practiceAtomicSha256"), false);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("mutation during a mock judge call yields HOLD and writes zero receipts", () => {
  const dir = fixture();
  try {
    const candidate = path.join(dir, "final.ru.md");
    const before = fs.readFileSync(candidate, "utf8");
    const result = runJudgeWithEnv(dir, { FACTORY_MOCK_MUTATE_FILE_ON_CALL: candidate });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, output);
    assert.match(output, /JUDGE SOURCE HOLD.*source_digest_changed/su);
    assert.doesNotMatch(output, /записан .*\.judge_/u);
    assert.equal(fs.readdirSync(dir).filter((name) => /^final\.judge_.+\.json$/u.test(name)).length, 0);
    assert.notEqual(fs.readFileSync(candidate, "utf8"), before);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("candidate mutation during a mock judge call invalidates its exact-byte projection binding", () => {
  const dir = fixture();
  try {
    const candidate = path.join(dir, "draft_A.ru.md");
    fs.copyFileSync(path.join(dir, "final.ru.md"), candidate);
    const result = runJudgeWithEnv(dir, { FACTORY_MOCK_MUTATE_FILE_ON_CALL: candidate }, "draft_A.ru.md");
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, output);
    assert.match(output, /JUDGE SOURCE HOLD.*source_digest_changed:ru/su);
    assert.equal(fs.readdirSync(dir).filter((name) => /^draft_A\.judge_.+\.json$/u.test(name)).length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

for (const sourceName of ["final.uk.md", "practice.atomic.json"]) {
  test(`mutation of ${sourceName} during the first judge call yields HOLD and zero receipts`, () => {
    const dir = fixture();
    try {
      const target = path.join(dir, sourceName);
      const result = runJudgeWithEnv(dir, { FACTORY_MOCK_MUTATE_FILE_ON_CALL: target });
      const output = `${result.stdout}\n${result.stderr}`;
      assert.notEqual(result.status, 0, output);
      assert.match(output, /JUDGE SOURCE HOLD.*source_digest_changed/su);
      assert.equal(fs.readdirSync(dir).filter((name) => /^final\.judge_.+\.json$/u.test(name)).length, 0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("successful judge receipts carry the canonical source set and can satisfy readiness", () => {
  const dir = fixture();
  try {
    const result = runJudge(dir);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const bindings = sourceBindings(dir);
    const receipts = fs.readdirSync(dir).filter((name) => /^final\.judge_.+\.json$/u.test(name));
    assert.ok(receipts.length >= 4);
    for (const name of receipts) {
      const receipt = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
      assert.equal(receipt.exactRuSha256, bindings.exactRuSha256, name);
      assert.equal(receipt.exactUkSha256, bindings.exactUkSha256, name);
      assert.equal(receipt.practiceAtomicSha256, bindings.practiceAtomicSha256, name);
      assert.equal(receipt.sessionId, SESSION, name);
      assert.equal(receipt.reviewer?.sessionId, SESSION, name);
      assert.equal(receipt.reviewer?.role, receipt.role, name);
      assert.ok(receipt.evidence.every((item) => item?.fieldPath && item?.quote && item?.analysis && item?.coverage?.length), name);
    }
    fs.writeFileSync(path.join(dir, "locales.judge.json"), JSON.stringify({
      verdict: "PASS",
      ...bindings,
      session: SESSION,
      sessionId: SESSION,
      role: "judge_locales",
      reviewer: "learning-v2-reviewer-v1|reviewerId=pipeline-judge_locales|sessionId=en/l01/s01|role=judge_locales",
      evidence: [
        structuredEvidence(dir, "ru", ["judge_locales", "ru"]),
        structuredEvidence(dir, "uk", ["judge_locales", "uk"]),
      ],
      locales: { uk: { verdict: "PASS" } },
    }));
    fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify({
      ...bindings,
      converged: true,
      needsHumanReview: false,
    }));
    assert.deepEqual(sessionReadiness(dir, ["uk"], { sessionId: SESSION }), { ready: true, issues: [] });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("locale receipt carries the same canonical RU, UK, and atomic digests", () => {
  const dir = fixture();
  try {
    const result = runLocalize(dir);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const bindings = sourceBindings(dir);
    const receipt = JSON.parse(fs.readFileSync(path.join(dir, "locales.judge.json"), "utf8"));
    assert.equal(receipt.exactRuSha256, bindings.exactRuSha256);
    assert.equal(receipt.exactUkSha256, bindings.exactUkSha256);
    assert.equal(receipt.practiceAtomicSha256, bindings.practiceAtomicSha256);
    assert.deepEqual(receipt.evidence.map((item) => item.fieldPath).sort(), ["final.ru.md", "final.uk.md"]);
    assert.equal(receipt.reviewer.sessionId, SESSION);
    assert.equal(receipt.reviewer.role, "judge_locales");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("locale generation binds every requested BCP-47 locale", () => {
  const dir = fixture();
  try {
    const uk = fs.readFileSync(path.join(dir, "final.uk.md"), "utf8");
    fs.writeFileSync(path.join(dir, "locales_batch.md"), `===LOCALE: uk===\n${uk.trim()}\n\n===LOCALE: pt-BR===\n${uk.trim()}\n`);
    const result = runLocalize(dir, {}, "uk,pt-BR");
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const receipt = JSON.parse(fs.readFileSync(path.join(dir, "locales.judge.json"), "utf8"));
    const digest = (locale) => crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, `final.${locale}.md`))).digest("hex");
    assert.deepEqual(receipt.localeHashes, { ru: digest("ru"), uk: digest("uk"), "pt-BR": digest("pt-BR") });
    assert.deepEqual(receipt.evidence.map((item) => item.fieldPath).sort(), ["final.pt-BR.md", "final.ru.md", "final.uk.md"]);
    assert.deepEqual(receipt.locales, { uk: { verdict: "PASS" }, "pt-BR": { verdict: "PASS" } });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a PASS locale response without exact source evidence is rejected before locale receipt write", () => {
  const dir = fixture();
  try {
    const result = runLocalize(dir, { FACTORY_MOCK_LOCALE_JUDGE_OMIT_EVIDENCE: "1" });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, output);
    assert.match(output, /JUDGE RECEIPT HOLD.*нет evidence/su);
    assert.equal(fs.existsSync(path.join(dir, "locales.judge.json")), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("RU mutation during the first locale model call is detected against the pre-call snapshot", () => {
  const dir = fixture();
  try {
    const result = runLocalize(dir, { FACTORY_MOCK_MUTATE_FILE_ON_CALL: path.join(dir, "final.ru.md") });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, output);
    assert.match(output, /JUDGE SOURCE HOLD:source_digest_changed:ru/su);
    assert.equal(fs.existsSync(path.join(dir, "locales.judge.json")), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("locale commit rolls back the exact prior batch and locale set when authority changes before commit", () => {
  const dir = fixture();
  try {
    const batchPath = path.join(dir, "locales_batch.md");
    const ukPath = path.join(dir, "final.uk.md");
    const batchBefore = "existing batch sentinel\n";
    const ukBefore = fs.readFileSync(ukPath);
    fs.writeFileSync(batchPath, batchBefore);
    const existingNames = new Set(fs.readdirSync(dir));
    const result = runLocalize(dir, {
      FACTORY_MOCK_MUTATE_FILE_BEFORE_LOCALE_COMMIT: path.join(dir, "practice.atomic.json"),
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, output);
    assert.match(output, /JUDGE SOURCE HOLD:source_digest_changed:atomic/su);
    assert.equal(fs.readFileSync(batchPath, "utf8"), batchBefore);
    assert.deepEqual(fs.readFileSync(ukPath), ukBefore);
    assert.deepEqual(new Set(fs.readdirSync(dir)), existingNames);
    assert.equal(fs.existsSync(path.join(dir, "locales.judge.json")), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function correctionFixture(dir) {
  const ukPath = path.join(dir, "final.uk.md");
  const batchPath = path.join(dir, "locales_batch.md");
  const receiptPath = path.join(dir, "locales.judge.json");
  const originalUk = fs.readFileSync(ukPath, "utf8").trim();
  fs.writeFileSync(ukPath, originalUk);
  const originalBatch = `===LOCALE: uk===\n${originalUk}`;
  fs.writeFileSync(batchPath, originalBatch);
  const originalReceipt = "previous locale receipt sentinel\n";
  fs.writeFileSync(receiptPath, originalReceipt);
  const correctedPath = path.join(dir, "corrected.uk.fixture.md");
  const correctedUk = `${originalUk}\n\n<!-- corrected locale -->`;
  fs.writeFileSync(correctedPath, correctedUk);
  return { ukPath, batchPath, receiptPath, correctedPath, correctedUk, originalUk, originalBatch, originalReceipt };
}

test("correction commit HOLD restores prior batch, locale, and receipt byte-for-byte without temp leaks", () => {
  const dir = fixture();
  try {
    const prior = correctionFixture(dir);
    const existingNames = new Set(fs.readdirSync(dir));
    const result = runLocalize(dir, {
      FACTORY_MOCK_LOCALE_JUDGE_SEQUENCE: "REVISE,PASS",
      FACTORY_MOCK_LOCALE_CORRECTION_FILE: prior.correctedPath,
      FACTORY_MOCK_MUTATE_FILE_BEFORE_LOCALE_CORRECTION_COMMIT: path.join(dir, "practice.atomic.json"),
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, output);
    assert.match(output, /JUDGE SOURCE HOLD:source_digest_changed:atomic/su);
    assert.equal(fs.readFileSync(prior.ukPath, "utf8"), prior.originalUk);
    assert.equal(fs.readFileSync(prior.batchPath, "utf8"), prior.originalBatch);
    assert.equal(fs.readFileSync(prior.receiptPath, "utf8"), prior.originalReceipt);
    assert.deepEqual(new Set(fs.readdirSync(dir)), existingNames);
    assert.equal(fs.readdirSync(dir).some((name) => name.includes(".tmp-")), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("successful locale correction is re-judged and receipt binds the corrected UK bytes", () => {
  const dir = fixture();
  try {
    const prior = correctionFixture(dir);
    const result = runLocalize(dir, {
      FACTORY_MOCK_LOCALE_JUDGE_SEQUENCE: "REVISE,PASS",
      FACTORY_MOCK_LOCALE_CORRECTION_FILE: prior.correctedPath,
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 0, output);
    assert.equal(fs.readFileSync(prior.ukPath, "utf8"), prior.correctedUk);
    assert.match(fs.readFileSync(prior.batchPath, "utf8"), /corrected locale/u);
    const receipt = JSON.parse(fs.readFileSync(prior.receiptPath, "utf8"));
    assert.equal(receipt.verdict, "PASS");
    assert.equal(receipt.locales.uk.verdict, "PASS");
    assert.equal(receipt.exactUkSha256, sourceBindings(dir).exactUkSha256);
    assert.equal((output.match(/→ судья локалей ×1/g) || []).length, 2, output);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("machineFacts uses captured atomic text after the live sidecar changes", () => {
  const source = path.join(COURSE_ROOT, "sessions", "en", "l04", "s03");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-machine-facts-snapshot-"));
  try {
    for (const name of ["final.ru.md", "practice.atomic.json"]) fs.copyFileSync(path.join(source, name), path.join(dir, name));
    const finalPath = path.join(dir, "final.ru.md");
    const markdown = fs.readFileSync(finalPath, "utf8");
    const atomicSource = JSON.parse(fs.readFileSync(path.join(dir, "practice.atomic.json"), "utf8"));
    const target = atomicSource.interactionsByLocale.ru.find((interaction) =>
      ["listen_choose", "context_gap_grammar"].includes(interaction.family)
      && interaction.modePayload?.isWordCard !== true);
    atomicSource.answers.find((answer) => answer.interactionId === target.interactionId).correctResponseId = "missing-response";
    const atomic = JSON.stringify(atomicSource);
    const before = machineFacts(finalPath, "en/l04/s03", markdown, atomic);
    assert.match(before, /ATOMIC ANSWER НЕ ПРИВЯЗАН/u);
    fs.writeFileSync(path.join(dir, "practice.atomic.json"), "{}\n");
    const after = machineFacts(finalPath, "en/l04/s03", markdown, atomic);
    assert.equal(after, before);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a digest change during the second unstable verdict preserves the durable receipt byte-for-byte", () => {
  const dir = fixture();
  try {
    const bindings = sourceBindings(dir);
    const receiptPath = path.join(dir, "final.judge_taste.json");
    const durable = `${JSON.stringify({ verdict: "REVISE", verdict_reason: "durable", ...bindings }, null, 2)}\n`;
    fs.writeFileSync(receiptPath, durable);
    const result = runJudgeWithEnv(dir, {
      FACTORY_MOCK_MUTATE_FILE_ON_CALL: path.join(dir, "practice.atomic.json"),
      FACTORY_MOCK_MUTATE_ON_CALL_NUMBER: "5",
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, output);
    assert.match(output, /второй прогон для: judge_taste/u);
    assert.match(output, /JUDGE SOURCE HOLD.*source_digest_changed/su);
    assert.equal(fs.readFileSync(receiptPath, "utf8"), durable);
    assert.equal(fs.existsSync(path.join(dir, "final.judge_taste.run1.json")), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a canonical mutation before the merged receipt write cannot replace the durable receipt", () => {
  const dir = fixture();
  try {
    const bindings = sourceBindings(dir);
    const receiptPath = path.join(dir, "final.judge_taste.json");
    const durable = `${JSON.stringify({ verdict: "REVISE", verdict_reason: "durable", ...bindings }, null, 2)}\n`;
    fs.writeFileSync(receiptPath, durable);
    const result = runJudgeWithEnv(dir, {
      FACTORY_MOCK_MUTATE_FILE_BEFORE_RECEIPT_WRITE: path.join(dir, "final.uk.md"),
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, output);
    assert.match(output, /JUDGE SOURCE HOLD.*source_digest_changed/su);
    assert.equal(fs.readFileSync(receiptPath, "utf8"), durable);
    assert.equal(fs.existsSync(path.join(dir, "final.judge_taste.run1.json")), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

for (const locale of ["ru", "uk"]) {
  test(`stale final.${locale}.md blocks before any judge model call`, () => {
    const dir = fixture();
    try {
      const file = path.join(dir, `final.${locale}.md`);
      const markdown = fs.readFileSync(file, "utf8");
      fs.writeFileSync(file, markdown.replace(/^(\*\*1 · )([^*]+)/mu, "$1STALE PROMPT"));
      const result = runJudge(dir);
      const output = `${result.stdout}\n${result.stderr}`;
      assert.notEqual(result.status, 0, output);
      assert.match(output, new RegExp(`atomic_markdown_parity:${SESSION}:${locale}`));
      assert.doesNotMatch(output, /backend=mock/u);
      assert.equal(fs.readdirSync(dir).filter((name) => /^final\.judge_.+\.json$/u.test(name)).length, 0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("malformed atomic source blocks before any judge model call", () => {
  const dir = fixture();
  try {
    fs.writeFileSync(path.join(dir, "practice.atomic.json"), "{not-json");
    const result = runJudge(dir);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, output);
    assert.match(output, /atomic_source_malformed/u);
    assert.doesNotMatch(output, /backend=mock/u);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("full does not let an old final authorize a newly generated draft", () => {
  const session = "en/l04/s03";
  const source = path.join(COURSE_ROOT, "sessions", ...session.split("/"));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-prejudge-full-"));
  try {
    for (const name of ["final.ru.md", "final.uk.md", "practice.atomic.json", "preauthoring.json"]) {
      fs.copyFileSync(path.join(source, name), path.join(dir, name));
    }
    const result = runFull(session, dir);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, output);
    assert.match(output, /PREAUTHORING HOLD|автор A: backend=mock/u);
    if (/автор A: backend=mock/u.test(output)) assert.match(output, /PREJUDGE HOLD.*candidate_source_not_canonical/su);
    assert.doesNotMatch(output, /→ judge_/u);
    assert.equal(fs.readdirSync(dir).filter((name) => /\.judge_.+\.json$/u.test(name)).length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("session identity keeps lesson-four gates active under a temp override", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-scope-"));
  try {
    const blocks = Array.from({ length: 17 }, (_, index) => index === 0
      ? `**1 · Соедините пары**\na — один · b — два · c — три · d — четыре`
      : `**${index + 1} · Вставьте слово**\nShe ___ ready. → **is** · am · are`);
    const modes = Array.from({ length: 17 }, (_, index) => `${index + 1}=${index === 0 ? "speed_match" : "context_gap_grammar"}`);
    const file = path.join(dir, "final.ru.md");
    fs.writeFileSync(file, `# Test\n\n**Новые слова:** —\n\n## Практика\n\n${blocks.join("\n\n")}\n\n## Для сборщика\n\nmodes: ${modes.join(", ")}\n`);
    const result = spawnSync(process.execPath, [path.join(HERE, "run.mjs"), "facts", "--session", "en/l04/s03", "--file", "final.ru.md", "--backend", "mock"], {
      cwd: COURSE_ROOT,
      encoding: "utf8",
      env: { ...process.env, FACTORY_SESSION_DIR: dir },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /МАЛО СБОРКИ ФРАЗЫ/u);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("FACTORY_SESSION_DIR is rejected outside an explicit mock or test run", () => {
  const dir = fixture();
  try {
    const result = spawnSync(process.execPath, [path.join(HERE, "run.mjs"), "facts", "--session", SESSION, "--file", "final.ru.md", "--backend", "claude"], {
      cwd: COURSE_ROOT,
      encoding: "utf8",
      env: { ...process.env, FACTORY_SESSION_DIR: dir },
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, output);
    assert.match(output, /FACTORY_SESSION_DIR.*mock\/test/u);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
