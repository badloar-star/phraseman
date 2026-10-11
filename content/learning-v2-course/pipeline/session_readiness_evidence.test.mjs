import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { CANONICAL_BINDING_SCHEMA_VERSION, sessionReadiness } from "./session_readiness.mjs";

const ORDINARY_JUDGES = ["learner", "pedagogy", "nonsense", "reader"];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function reviewerIdentity(sessionId, role) {
  return `learning-v2-reviewer-v1|reviewerId=pipeline-${role}|sessionId=${sessionId}|role=${role}`;
}

function evidenceItem(locale, quote, coverage) {
  return {
    fieldPath: `final.${locale}.md`,
    quote,
    analysis: "Точная цитата подтверждает проверяемый аспект текущей сессии.",
    coverage: Array.isArray(coverage) ? coverage : [coverage],
  };
}

function acceptedSession(dir, {
  ru = "Текущая сцена: курьер принёс одну посылку.\n",
  uk = "Поточна сцена: кур'єр приніс одну посилку.\n",
} = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const atomic = "{}\n";
  const ruEvidence = ru.trim().split(/\r?\n/gu)[0];
  const ukEvidence = uk.trim().split(/\r?\n/gu)[0];
  const session = dir.replace(/\\/gu, "/").match(/\/sessions\/([a-z]{2}\/l\d{2}\/s\d{2})$/iu)?.[1];
  assert.ok(session, `fixture path must end with sessions/<lang>/lNN/sNN: ${dir}`);
  fs.writeFileSync(path.join(dir, "final.ru.md"), ru);
  fs.writeFileSync(path.join(dir, "final.uk.md"), uk);
  fs.writeFileSync(path.join(dir, "practice.atomic.json"), atomic);
  const bindings = {
    bindingSchemaVersion: CANONICAL_BINDING_SCHEMA_VERSION,
    sourceSha256: sha256(ru),
    exactRuSha256: sha256(ru),
    exactUkSha256: sha256(uk),
    practiceAtomicSha256: sha256(atomic),
  };
  for (const role of ORDINARY_JUDGES) {
    fs.writeFileSync(path.join(dir, `final.judge_${role}.json`), JSON.stringify({
      ...bindings,
      session,
      sessionId: session,
      role: `judge_${role}`,
      reviewer: reviewerIdentity(session, `judge_${role}`),
      verdict: "PASS",
      evidence: role === "learner"
        ? [evidenceItem("ru", ruEvidence, `judge_${role}`), evidenceItem("uk", ukEvidence, `judge_${role}`)]
        : [evidenceItem("ru", ruEvidence, `judge_${role}`)],
    }));
  }
  fs.writeFileSync(path.join(dir, "locales.judge.json"), JSON.stringify({
    ...bindings,
    session,
    sessionId: session,
    role: "judge_locales",
    reviewer: reviewerIdentity(session, "judge_locales"),
    evidence: [
      evidenceItem("ru", ruEvidence, ["judge_locales", "ru"]),
      evidenceItem("uk", ukEvidence, ["judge_locales", "uk"]),
    ],
    localeHashes: { ru: bindings.exactRuSha256, uk: bindings.exactUkSha256 },
    locales: { uk: { verdict: "PASS" } },
  }));
  fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify({
    ...bindings,
    localeHashes: { ru: bindings.exactRuSha256, uk: bindings.exactUkSha256 },
    converged: true,
    needsHumanReview: false,
  }));
}

test("a hash-fresh judge receipt cannot reuse evidence quoted from another session", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-evidence-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    acceptedSession(dir);
    const receiptPath = path.join(dir, "final.judge_learner.json");
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    receipt.evidence = [evidenceItem("ru", "Чужая сцена: на вокзале появились дополнительные платформы.", "judge_learner")];
    fs.writeFileSync(receiptPath, JSON.stringify(receipt));

    const result = sessionReadiness(dir, ["uk"]);

    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /judge_learner.*evidence\[0\].*не найден/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a quoted one-letter fragment is not meaningful evidence", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-evidence-short-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    acceptedSession(dir);
    const receiptPath = path.join(dir, "final.judge_learner.json");
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    receipt.evidence = [evidenceItem("ru", "а", "judge_learner")];
    fs.writeFileSync(receiptPath, JSON.stringify(receipt));

    const result = sessionReadiness(dir, ["uk"]);

    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /evidence\[0\]\.quote слишком короток/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

for (const [name, mutate, expected] of [
  ["sessionId", (receipt) => { receipt.sessionId = "en/l02/s31"; }, /judge_learner.*sessionId.*en\/l02\/s32/iu],
  ["role", (receipt) => { receipt.role = "judge_reader"; }, /judge_learner.*role/iu],
  ["reviewer", (receipt) => { receipt.reviewer = "independent s32"; }, /judge_learner.*reviewer.*identity/iu],
]) {
  test(`judge receipt ${name} must be bound to the current session and required role`, () => {
    const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), `learning-v2-evidence-${name}-`));
    try {
      const dir = path.join(root, "sessions/en/l02/s32");
      acceptedSession(dir);
      const receiptPath = path.join(dir, "final.judge_learner.json");
      const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
      mutate(receipt);
      fs.writeFileSync(receiptPath, JSON.stringify(receipt));

      const result = sessionReadiness(dir, ["uk"]);

      assert.equal(result.ready, false);
      assert.match(result.issues.join("\n"), expected);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}

test("locale PASS evidence must resolve in this session source", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-locale-evidence-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    acceptedSession(dir);
    const receiptPath = path.join(dir, "locales.judge.json");
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    receipt.evidence = [
      evidenceItem("ru", "Текущая сцена: курьер принёс одну посылку.", ["judge_locales", "ru"]),
      evidenceItem("uk", "Чужа локалізація: пасажир чекає на іншій платформі.", ["judge_locales", "uk"]),
    ];
    fs.writeFileSync(receiptPath, JSON.stringify(receipt));

    const result = sessionReadiness(dir, ["uk"]);

    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /locales\.judge\.json.*evidence\[1\].*не найден/iu);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("locale PASS requires separate exact evidence for RU and every required locale", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-locale-coverage-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    acceptedSession(dir);
    const receiptPath = path.join(dir, "locales.judge.json");
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    receipt.evidence = [evidenceItem("ru", "Текущая сцена: курьер принёс одну посылку.", ["judge_locales", "ru", "uk"])];
    fs.writeFileSync(receiptPath, JSON.stringify(receipt));

    const result = sessionReadiness(dir, ["uk"]);

    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /locales\.judge\.json.*нет evidence для final\.uk\.md/iu);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("evidence quote must resolve in the source named by fieldPath", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-evidence-path-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    acceptedSession(dir);
    const receiptPath = path.join(dir, "final.judge_learner.json");
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    receipt.evidence = [evidenceItem("uk", "Текущая сцена: курьер принёс одну посылку.", "judge_learner")];
    fs.writeFileSync(receiptPath, JSON.stringify(receipt));

    const result = sessionReadiness(dir, ["uk"]);

    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /judge_learner.*fieldPath.*final\.uk\.md.*не найден/iu);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fieldPath uses the exact canonical source filename", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-evidence-canonical-path-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    acceptedSession(dir);
    const receiptPath = path.join(dir, "final.judge_learner.json");
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    receipt.evidence[0].fieldPath = "FINAL.RU.MD";
    fs.writeFileSync(receiptPath, JSON.stringify(receipt));

    const result = sessionReadiness(dir, ["uk"]);

    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /fieldPath должен указывать на текущий final\.<locale>\.md/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

for (const [name, mutate, expected] of [
  ["legacy string", (receipt) => { receipt.evidence = ["Текущая сцена: курьер принёс одну посылку."]; }, /evidence\[0\].*объект.*fieldPath.*quote.*analysis.*coverage/iu],
  ["missing fieldPath", (receipt) => { delete receipt.evidence[0].fieldPath; }, /evidence\[0\].*fieldPath/iu],
  ["missing analysis", (receipt) => { delete receipt.evidence[0].analysis; }, /evidence\[0\].*analysis/iu],
  ["missing coverage", (receipt) => { delete receipt.evidence[0].coverage; }, /evidence\[0\].*coverage/iu],
]) {
  test(`release readiness rejects ${name} evidence`, () => {
    const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), `learning-v2-structured-${name.replace(/\s+/gu, "-")}-`));
    try {
      const dir = path.join(root, "sessions/en/l02/s32");
      acceptedSession(dir);
      const receiptPath = path.join(dir, "final.judge_learner.json");
      const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
      mutate(receipt);
      fs.writeFileSync(receiptPath, JSON.stringify(receipt));

      const result = sessionReadiness(dir, ["uk"]);

      assert.equal(result.ready, false);
      assert.match(result.issues.join("\n"), expected);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}

test("duplicated evidence from a distinct session hash is rejected when the other source does not support it", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-duplicate-evidence-"));
  try {
    const currentDir = path.join(root, "sessions/en/l02/s32");
    const otherDir = path.join(root, "sessions/en/l02/s31");
    acceptedSession(currentDir);
    acceptedSession(otherDir, {
      ru: "Другая сцена: диспетчер проверяет расписание автобусов.\n",
      uk: "Інша сцена: диспетчер перевіряє розклад автобусів.\n",
    });
    const otherReceiptPath = path.join(otherDir, "final.judge_learner.json");
    const otherReceipt = JSON.parse(fs.readFileSync(otherReceiptPath, "utf8"));
    const duplicatedSet = JSON.parse(fs.readFileSync(path.join(currentDir, "final.judge_learner.json"), "utf8")).evidence;
    otherReceipt.evidence = duplicatedSet;
    fs.writeFileSync(otherReceiptPath, JSON.stringify(otherReceipt));

    const result = sessionReadiness(currentDir, ["uk"]);

    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /judge_learner.*полный набор evidence.*en\/l02\/s31/iu);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a generic full evidence set duplicated across distinct source hashes is HOLD even when both sources contain the quote", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-shared-evidence-"));
  try {
    const currentDir = path.join(root, "sessions/en/l02/s32");
    const otherDir = path.join(root, "sessions/en/l02/s31");
    const shared = "Важная часть";
    acceptedSession(currentDir, {
      ru: `${shared}\nТекущая сцена: курьер принёс одну посылку.\n`,
      uk: "Поточна сцена: кур'єр приніс одну посилку.\n",
    });
    acceptedSession(otherDir, {
      ru: `${shared}\nДругая сцена: диспетчер проверяет расписание автобусов.\n`,
      uk: "Інша сцена: диспетчер перевіряє розклад автобусів.\n",
    });
    for (const dir of [currentDir, otherDir]) {
      const receiptPath = path.join(dir, "final.judge_learner.json");
      const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
      receipt.evidence = [evidenceItem("ru", shared, "judge_learner")];
      fs.writeFileSync(receiptPath, JSON.stringify(receipt));
    }

    const result = sessionReadiness(currentDir, ["uk"]);

    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /judge_learner.*полный набор evidence.*en\/l02\/s31/iu);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("duplicate evidence is HOLD when RU hashes match but another canonical source hash differs", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-duplicate-source-set-"));
  try {
    const currentDir = path.join(root, "sessions/en/l02/s32");
    const otherDir = path.join(root, "sessions/en/l02/s31");
    const sharedRu = "Одинаковая русская сцена содержит проверяемую подробность.\n";
    acceptedSession(currentDir, { ru: sharedRu, uk: "Поточна українська сцена має перший точний варіант.\n" });
    acceptedSession(otherDir, { ru: sharedRu, uk: "Поточна українська сцена має інший точний варіант.\n" });
    for (const dir of [currentDir, otherDir]) {
      const receiptPath = path.join(dir, "final.judge_learner.json");
      const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
      receipt.evidence = [evidenceItem("ru", sharedRu.trim(), "judge_learner")];
      fs.writeFileSync(receiptPath, JSON.stringify(receipt));
    }

    const result = sessionReadiness(currentDir, ["uk"]);

    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /полный набор evidence.*en\/l02\/s31/iu);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("duplicate evidence comparison normalizes case and whitespace", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-normalized-duplicate-"));
  try {
    const currentDir = path.join(root, "sessions/en/l02/s32");
    const otherDir = path.join(root, "sessions/en/l02/s31");
    acceptedSession(currentDir, { ru: "Важная часть содержит достаточно слов для проверки.\n" });
    acceptedSession(otherDir, { ru: "важная часть содержит достаточно слов для проверки.\n" });
    const currentPath = path.join(currentDir, "final.judge_learner.json");
    const otherPath = path.join(otherDir, "final.judge_learner.json");
    const current = JSON.parse(fs.readFileSync(currentPath, "utf8"));
    const other = JSON.parse(fs.readFileSync(otherPath, "utf8"));
    current.evidence = [evidenceItem("ru", "Важная часть содержит достаточно слов для проверки.", "judge_learner")];
    other.evidence = [evidenceItem("ru", "важная часть содержит достаточно слов для проверки.", "judge_learner")];
    other.evidence[0].analysis = `  ${other.evidence[0].analysis.toUpperCase()}  `;
    fs.writeFileSync(currentPath, JSON.stringify(current));
    fs.writeFileSync(otherPath, JSON.stringify(other));

    const result = sessionReadiness(currentDir, ["uk"]);

    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /полный набор evidence.*en\/l02\/s31/iu);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a judge receipt with empty evidence fails closed", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-evidence-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    acceptedSession(dir);
    const receiptPath = path.join(dir, "final.judge_learner.json");
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    receipt.evidence = [];
    fs.writeFileSync(receiptPath, JSON.stringify(receipt));

    const result = sessionReadiness(dir, ["uk"]);

    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /judge_learner.*нет evidence/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("nested evidence quotes must also resolve in this session source", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-evidence-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    acceptedSession(dir);
    const receiptPath = path.join(dir, "final.judge_learner.json");
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    receipt.voice = {
      score: 4,
      evidence: ["Чужая фраза: короткий ответ вовремя останавливается."],
    };
    fs.writeFileSync(receiptPath, JSON.stringify(receipt));

    const result = sessionReadiness(dir, ["uk"]);

    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /judge_learner.*voice\.evidence\[0\].*не найден/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a single reviewer identity cannot stand in for independent required reviews", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-shared-reviewer-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    acceptedSession(dir);
    const sessionId = "en/l02/s32";
    for (const role of [...ORDINARY_JUDGES.map((name) => `judge_${name}`), "judge_locales"]) {
      const name = role === "judge_locales" ? "locales.judge.json" : `final.${role}.json`;
      const receiptPath = path.join(dir, name);
      const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
      receipt.reviewer = {
        schemaVersion: "learning_v2_reviewer_identity_v1",
        reviewerId: "shared-spoofed-reviewer",
        sessionId,
        role,
      };
      fs.writeFileSync(receiptPath, JSON.stringify(receipt));
    }

    const result = sessionReadiness(dir, ["uk"]);

    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /reviewerId.*повторяется/iu);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a document heading cannot substitute for role-specific evidence", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-generic-heading-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    const heading = "Английский курс, урок и сессия.";
    acceptedSession(dir, { ru: `# ${heading}\n\nТекущая сцена: курьер принёс одну посылку.\n` });
    for (const role of ORDINARY_JUDGES) {
      const receiptPath = path.join(dir, `final.judge_${role}.json`);
      const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
      receipt.evidence = [evidenceItem("ru", heading, `judge_${role}`)];
      fs.writeFileSync(receiptPath, JSON.stringify(receipt));
    }

    const result = sessionReadiness(dir, ["uk"]);

    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /quote.*заголовка|role-specific/iu);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a BCP-47 locale has its own source hash and evidence path", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-pt-br-"));
  try {
    const dir = path.join(root, "sessions/en/l02/s32");
    const ptBr = "Cena atual: o mensageiro trouxe uma encomenda.\n";
    acceptedSession(dir);
    fs.writeFileSync(path.join(dir, "final.pt-BR.md"), ptBr);
    const localeHashes = {
      ru: sha256(fs.readFileSync(path.join(dir, "final.ru.md"))),
      uk: sha256(fs.readFileSync(path.join(dir, "final.uk.md"))),
      "pt-BR": sha256(ptBr),
    };
    for (const name of [...ORDINARY_JUDGES.map((role) => `final.judge_${role}.json`), "locales.judge.json", "status.json"]) {
      const receiptPath = path.join(dir, name);
      const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
      receipt.localeHashes = localeHashes;
      if (name === "locales.judge.json") {
        receipt.locales["pt-BR"] = { verdict: "PASS" };
        receipt.evidence.push(evidenceItem("pt-BR", ptBr.trim(), ["judge_locales", "pt-BR"]));
      }
      fs.writeFileSync(receiptPath, JSON.stringify(receipt));
    }

    const result = sessionReadiness(dir, ["uk", "pt-BR"]);

    assert.equal(result.ready, true, result.issues.join("\n"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
