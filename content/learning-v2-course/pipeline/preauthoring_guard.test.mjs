import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  PREAUTHORING_REQUIREMENT_IDS,
  PREAUTHORING_REQUIREMENT_SOURCES,
  preauthoringDocumentManifest,
  preauthoringReceiptIssues,
  priorLearnerFacingManifest,
} from "./preauthoring_guard.mjs";

const expected = {
  session: "en/l03/s44",
  curriculumRow: "Урок 3, сессия 44 · тип: голос/слух · грамматика: услышать новое или известное · новые слова: customer, seller, assistant · момент сцены: у кассы",
  previousSession: "en/l03/s43",
  expectedNewWords: ["customer", "seller", "assistant"],
  priorRangeReady: true,
  priorRangeIssues: [],
};

const fileForKey = (name) => name.startsWith("DesktopCodex/")
  ? `C:/Users/badlo/OneDrive/Desktop/Codex/${name.slice("DesktopCodex/".length)}`
  : name.startsWith("factory/")
    ? new URL(`../${name.slice("factory/".length)}`, import.meta.url)
    : new URL(`../../../${name.slice("repo/".length)}`, import.meta.url);

const evidenceFor = (manifest) => Object.fromEntries(Object.entries(manifest).map(([name, sha256]) => {
  const bytes = fs.readFileSync(fileForKey(name), "utf8");
  return [name, {
    sha256,
    quote: bytes.trimStart().slice(0, 80),
    applied: `Применено актуальное правило из документа ${name}`,
  }];
}));

const quoteForRule = (rule, id) => {
  const bytes = fs.readFileSync(fileForKey(rule.source), "utf8");
  if (id === "exact_curriculum_row") return bytes.split(/\r?\n/).find((line) => line.startsWith("| 44 |") && line.includes("customer"));
  const index = bytes.indexOf(rule.needle);
  return bytes.slice(Math.max(0, index - 20), index + rule.needle.length + 40);
};

const valid = () => {
  const documentHashes = preauthoringDocumentManifest();
  const documentReview = evidenceFor(documentHashes);
  return {
    verdict: "PASS",
    issuedAt: new Date(Date.now() + 60_000).toISOString(),
    guardian: "independent-preauthoring-guardian",
    authorMustNotSelfIssue: true,
    session: expected.session,
    curriculumRow: expected.curriculumRow,
    priorLearnerFacingScan: {
      through: expected.previousSession,
      evidence: "Выполнен полный поиск по всем learner-facing полям предыдущих сессий.",
      conflicts: [],
      hashes: priorLearnerFacingManifest(expected.previousSession),
    },
    newWords: ["customer", "seller", "assistant"],
    retrievalWords: ["magazine"],
    cambridgeEvidence: "Cambridge подтверждает применимую операцию и её точную грамматическую границу.",
    scene: "Разговор покупателя и продавца у кассы после выбора товаров.",
    introTargets: [1, 2, 3].map((intro) => ({ intro, target: `точная цель ${intro}`, practiceLink: `связана с заданием практики ${intro}` })),
    independentFinal: { target: "самостоятельный финал", independence: "Ответ не показан, все опоры сняты перед выполнением." },
    requirementsChecklist: PREAUTHORING_REQUIREMENT_IDS.map((id) => ({
      id,
      status: "PASS",
      evidence: `Требование ${id} отдельно сверено с планом и learner-facing материалом.`,
      source: PREAUTHORING_REQUIREMENT_SOURCES[id].source,
      sourceQuote: quoteForRule(PREAUTHORING_REQUIREMENT_SOURCES[id], id),
    })),
    documentHashes,
    documentReview,
    mustFix: [],
  };
};

test("fresh session-bound preauthoring receipt passes", () => {
  assert.deepEqual(preauthoringReceiptIssues(valid(), expected), []);
});

test("receipt becomes HOLD when any required instruction changes", () => {
  const receipt = valid();
  const first = Object.keys(receipt.documentHashes)[0];
  receipt.documentHashes[first] = "stale";
  assert.match(preauthoringReceiptIssues(receipt, expected).join("\n"), /документ не перечитан или изменился/);
});

test("receipt cannot be reused for another session or without a full scan", () => {
  const receipt = valid();
  receipt.session = "en/l03/s43";
  receipt.priorLearnerFacingScan.through = "en/l03/s42";
  receipt.priorLearnerFacingScan.hashes = {};
  const issues = preauthoringReceiptIssues(receipt, expected).join("\n");
  assert.match(issues, /другой сессии/);
  assert.match(issues, /learner-facing поиск/);
  assert.match(issues, /хэши предыдущего learner-facing диапазона/);
});

test("generic or duplicate checklist cannot imitate every requirement", () => {
  const receipt = valid();
  receipt.requirementsChecklist = [receipt.requirementsChecklist[0], receipt.requirementsChecklist[0]];
  const issues = preauthoringReceiptIssues(receipt, expected).join("\n");
  assert.match(issues, /дубликаты требований/);
  assert.match(issues, /пропущено требование exact_curriculum_row/);
});

test("a hash without a real quote and per-document evidence remains HOLD", () => {
  const receipt = valid();
  receipt.documentReview["DesktopCodex/НАЧНИ_ОТСЮДА.md"] = {
    sha256: receipt.documentHashes["DesktopCodex/НАЧНИ_ОТСЮДА.md"],
    quote: "x",
    applied: "x",
  };
  assert.match(preauthoringReceiptIssues(receipt, expected).join("\n"), /нет отдельного проверяемого доказательства чтения/);
});

test("author cannot forge PASS with malformed evidence, plan words, or future time", () => {
  const receipt = valid();
  receipt.guardian = "author";
  receipt.issuedAt = "2099-01-01T00:00:00.000Z";
  receipt.priorLearnerFacingScan.evidence = "x";
  receipt.priorLearnerFacingScan.conflicts = ["owner conflict exists"];
  receipt.newWords = ["foo"];
  receipt.retrievalWords = [null];
  delete receipt.introTargets;
  delete receipt.independentFinal;
  const issues = preauthoringReceiptIssues(receipt, expected).join("\n");
  assert.match(issues, /не независимым guardian/);
  assert.match(issues, /issuedAt находится в будущем/);
  assert.match(issues, /содержательного доказательства/);
  assert.match(issues, /содержит конфликт/);
  assert.match(issues, /newWords не совпадают/);
  assert.match(issues, /retrievalWords/);
  assert.match(issues, /intro→practice/);
  assert.match(issues, /independent final/);
});

test("a non-ready previous required range blocks authoring even with a perfect receipt", () => {
  const receipt = valid();
  const issues = preauthoringReceiptIssues(receipt, {
    ...expected,
    priorRangeReady: false,
    priorRangeIssues: ["en/l03/s43: stale receipts"],
  }).join("\n");
  assert.match(issues, /предыдущий обязательный диапазон не готов/);
});
