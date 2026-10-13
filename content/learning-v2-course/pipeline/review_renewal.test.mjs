import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  exportReviewPacket,
  finalizeReviewedStatus,
  importExistingLocaleReview,
  importReviewBundle,
} from "./review_renewal.mjs";
import { CANONICAL_BINDING_SCHEMA_VERSION, sessionReadiness } from "./session_readiness.mjs";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1"));
const courseRoot = path.resolve(here, "..");
function canonicalSources(sessionId) {
  if (sessionId !== "en/l01/s01" && /^en\/l03\/s(?:24|25)$/u.test(sessionId)) {
    const match = /^en\/l(\d{2})\/s(\d{2})$/u.exec(sessionId);
    const target = `en:lesson-${match[1]}:session-${match[2]}`;
    return {
      ru: L01.ru.replaceAll("en:lesson-01:session-01", target),
      uk: L01.uk.replaceAll("en:lesson-01:session-01", target),
      atomic: L01.atomic.replaceAll("en:lesson-01:session-01", target),
    };
  }
  const dir = path.join(courseRoot, "sessions", ...sessionId.split("/"));
  return {
    ru: fs.readFileSync(path.join(dir, "final.ru.md"), "utf8"),
    uk: fs.readFileSync(path.join(dir, "final.uk.md"), "utf8"),
    atomic: fs.readFileSync(path.join(dir, "practice.atomic.json"), "utf8"),
  };
}
const L01 = canonicalSources("en/l01/s01");
const RU = L01.ru;
const UK = L01.uk;
const ATOMIC = L01.atomic;
const REQUIRED_L01 = ["judge_learner", "judge_pedagogy", "judge_nonsense", "judge_reader"];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fixture(sessionId = "en/l01/s01") {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-review-renewal-"));
  const sessionDir = path.join(root, "sessions", ...sessionId.split("/"));
  fs.mkdirSync(sessionDir, { recursive: true });
  const source = canonicalSources(sessionId);
  fs.writeFileSync(path.join(sessionDir, "final.ru.md"), source.ru);
  fs.writeFileSync(path.join(sessionDir, "practice.atomic.json"), source.atomic);
  fs.writeFileSync(path.join(sessionDir, "final.uk.md"), source.uk);
  return { root, sessionDir, sessionId, ...source };
}

function evidence(locale, role, sources = { ru: RU, uk: UK }) {
  const source = sources[locale];
  const quote = source.split(/\r?\n/gu)
    .map((line) => ({ text: line.replace(/[`*_#]/gu, "").trim(), heading: /^\s{0,3}#{1,6}\s+\S/u.test(line) }))
    .find(({ text, heading }) => !heading && text.length >= 12 && (text.match(/[\p{L}\p{N}]+/gu) ?? []).length >= 2)?.text;
  assert.ok(quote);
  return {
    fieldPath: `final.${locale}.md`,
    quote,
    analysis: "Точная цитата подтверждает проверяемый аспект текущего занятия.",
    coverage: role === "judge_locales" ? [role, locale] : [role],
  };
}

function review(role, sessionId, verdict = "PASS", reviewerId = `independent-${role}`) {
  return {
    verdict,
    verdict_reason: verdict === "PASS" ? "Проверка завершена без открытых дефектов." : "Нужна содержательная доработка текста.",
    sessionId,
    role,
    reviewer: {
      schemaVersion: "learning_v2_reviewer_identity_v1",
      reviewerId,
      sessionId,
      role,
    },
    evidence: [evidence("ru", role)],
  };
}

function reviewBundle(packet, verdicts = {}) {
  return {
    schemaVersion: "learning_v2_review_result_bundle_v1",
    sessionId: packet.sessionId,
    snapshot: packet.snapshot,
    curriculumBoundarySha256: packet.curriculumBoundary.boundarySha256,
    reviews: packet.requiredRoles.map((role) => ({
      ...review(role, packet.sessionId, verdicts[role] ?? "PASS"),
      curriculumBoundarySha256: packet.curriculumBoundary.boundarySha256,
      evidence: [evidence("ru", role, { ru: packet.sources.ru.content, uk: packet.sources.locales.uk?.content ?? UK })],
    })),
  };
}

function localeBundle(packet, reviewerId = "independent-judge-locales") {
  const role = "judge_locales";
  return {
    schemaVersion: "learning_v2_locale_review_bundle_v1",
    sessionId: packet.sessionId,
    snapshot: packet.snapshot,
    curriculumBoundarySha256: packet.curriculumBoundary.boundarySha256,
    review: {
      verdict: "PASS",
      verdict_reason: "Русский оригинал и украинская локализация сверены построчно.",
      sessionId: packet.sessionId,
      role,
      curriculumBoundarySha256: packet.curriculumBoundary.boundarySha256,
      reviewer: {
        schemaVersion: "learning_v2_reviewer_identity_v1",
        reviewerId,
        sessionId: packet.sessionId,
        role,
      },
      evidence: [
        evidence("ru", role, { ru: packet.sources.ru.content, uk: packet.sources.locales.uk.content }),
        evidence("uk", role, { ru: packet.sources.ru.content, uk: packet.sources.locales.uk.content }),
      ],
      locales: { uk: { verdict: "PASS" } },
    },
  };
}

test("review export binds exact sources and includes progression in required roles", () => {
  const fx = fixture("en/l03/s25");
  try {
    const priorId = "en/l01/s01";
    const priorDir = path.join(fx.root, "sessions", ...priorId.split("/"));
    const prior = canonicalSources(priorId);
    fs.mkdirSync(priorDir, { recursive: true });
    fs.writeFileSync(path.join(priorDir, "final.ru.md"), prior.ru);
    fs.writeFileSync(path.join(priorDir, "final.uk.md"), prior.uk);
    fs.writeFileSync(path.join(priorDir, "practice.atomic.json"), prior.atomic);
    const priorPacket = exportReviewPacket({ sessionId: priorId, sessionDir: priorDir, locales: ["uk"] });
    const priorReviewInput = path.join(fx.root, "prior-review.json");
    const priorLocaleInput = path.join(fx.root, "prior-locale.json");
    fs.writeFileSync(priorReviewInput, JSON.stringify(reviewBundle(priorPacket)));
    fs.writeFileSync(priorLocaleInput, JSON.stringify(localeBundle(priorPacket)));
    importReviewBundle({ sessionId: priorId, sessionDir: priorDir, locales: ["uk"], inPath: priorReviewInput });
    importExistingLocaleReview({ sessionId: priorId, sessionDir: priorDir, locales: ["uk"], inPath: priorLocaleInput });
    finalizeReviewedStatus({ sessionId: priorId, sessionDir: priorDir, locales: ["uk"] });
    const outPath = path.join(fx.root, "review.packet.json");
    const packet = exportReviewPacket({
      sessionId: fx.sessionId,
      sessionDir: fx.sessionDir,
      locales: ["uk"],
      outPath,
      promptDir: path.join(here, "prompts"),
      mainRequirementPath: path.join(here, "..", "ГЛАВНОЕ_ТРЕБОВАНИЕ.md"),
      cambridgeDigestPath: path.join(here, "..", "СВОД_ГРАММАТИКИ_КЕМБРИДЖ.md"),
    });

    assert.equal(packet.snapshot.bindingSchemaVersion, CANONICAL_BINDING_SCHEMA_VERSION);
    assert.equal(packet.snapshot.sourceSha256, sha256(fx.ru));
    assert.equal(packet.snapshot.practiceAtomicSha256, sha256(fx.atomic));
    assert.equal(packet.snapshot.localeHashes.uk, sha256(fx.uk));
    assert.equal(packet.sources.ru.content, fx.ru);
    assert.equal(packet.sources.locales.uk.content, fx.uk);
    assert.equal(packet.curriculumBoundary.courseStart, false);
    assert.match(packet.curriculumBoundary.currentRow, /^\|\s*25\s*\|/u);
    assert.match(packet.curriculumBoundary.authority.sha256, /^[a-f0-9]{64}$/u);
    assert.match(packet.curriculumBoundary.boundarySha256, /^[a-f0-9]{64}$/u);
    assert.ok(packet.requiredRoles.includes("judge_progression"));
    assert.match(packet.promptContracts.roles.judge_progression.content, /progress/iu);
    assert.match(packet.progressionEvidence.curriculumRow, /^\|\s*25\s*\|/u);
    assert.equal(packet.progressionEvidence.comparedThrough, priorId);
    assert.equal(packet.progressionEvidence.priorSessions[0].sessionId, priorId);
    assert.equal(packet.progressionEvidence.priorSessions[0].snapshot.sourceSha256, sha256(prior.ru));
    assert.match(packet.progressionEvidence.manifestSha256, /^[a-f0-9]{64}$/u);
    assert.deepEqual(JSON.parse(fs.readFileSync(outPath, "utf8")), packet);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("S01 export proves the exact authoritative course-start boundary", () => {
  const fx = fixture();
  try {
    const packet = exportReviewPacket({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"] });
    assert.equal(packet.curriculumBoundary.schemaVersion, "learning_v2_curriculum_boundary_v1");
    assert.equal(packet.curriculumBoundary.sessionId, "en/l01/s01");
    assert.equal(packet.curriculumBoundary.courseStart, true);
    assert.deepEqual(packet.curriculumBoundary.priorRows, []);
    assert.match(packet.curriculumBoundary.currentRow, /^\|\s*1\s*\|\s*новая\s*\|\s*I am \+ слово\s*\|/u);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("review import rejects missing and forged curriculum boundary bindings before receipts", () => {
  for (const mutation of [
    (bundle) => { delete bundle.curriculumBoundarySha256; },
    (bundle) => { bundle.curriculumBoundarySha256 = "0".repeat(64); },
  ]) {
    const fx = fixture();
    try {
      const packet = exportReviewPacket({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"] });
      const bundle = reviewBundle(packet);
      mutation(bundle);
      const input = path.join(fx.root, "review.result.json");
      fs.writeFileSync(input, JSON.stringify(bundle));
      assert.throws(
        () => importReviewBundle({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"], inPath: input }),
        /curriculum boundary/iu,
      );
      for (const role of REQUIRED_L01) assert.equal(fs.existsSync(path.join(fx.sessionDir, `final.${role}.json`)), false);
    } finally {
      fs.rmSync(fx.root, { recursive: true, force: true });
    }
  }
});

test("review import rejects a boundary made stale by an authoritative plan change", () => {
  const fx = fixture();
  try {
    const curriculumPlanPath = path.join(fx.root, "ПЛАН_КУРСА.md");
    fs.copyFileSync(path.join(courseRoot, "curriculum/en/ПЛАН_КУРСА.md"), curriculumPlanPath);
    const packet = exportReviewPacket({
      sessionId: fx.sessionId,
      sessionDir: fx.sessionDir,
      locales: ["uk"],
      curriculumPlanPath,
    });
    const input = path.join(fx.root, "review.result.json");
    fs.writeFileSync(input, JSON.stringify(reviewBundle(packet)));
    fs.appendFileSync(curriculumPlanPath, "\n<!-- authoritative change -->\n");
    assert.throws(() => importReviewBundle({
      sessionId: fx.sessionId,
      sessionDir: fx.sessionDir,
      locales: ["uk"],
      inPath: input,
      curriculumPlanPath,
    }), /curriculum boundary/iu);
    for (const role of REQUIRED_L01) assert.equal(fs.existsSync(path.join(fx.sessionDir, `final.${role}.json`)), false);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("progression export rejects a green-looking prior status that is not currently ready", () => {
  const fx = fixture("en/l03/s25");
  try {
    const priorId = "en/l01/s01";
    const priorDir = path.join(fx.root, "sessions", ...priorId.split("/"));
    const prior = canonicalSources(priorId);
    fs.mkdirSync(priorDir, { recursive: true });
    fs.writeFileSync(path.join(priorDir, "final.ru.md"), prior.ru);
    fs.writeFileSync(path.join(priorDir, "final.uk.md"), prior.uk);
    fs.writeFileSync(path.join(priorDir, "practice.atomic.json"), prior.atomic);
    fs.writeFileSync(path.join(priorDir, "status.json"), JSON.stringify({
      converged: true,
      needsHumanReview: false,
      sourceSha256: "0".repeat(64),
    }));

    assert.throws(() => exportReviewPacket({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"] }), /prior.*not ready|status\.json|judge_learner/iu);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("run.mjs exposes provider-neutral review-export without loading authoring stages", () => {
  const fx = fixture();
  try {
    const outPath = path.join(fx.root, "cli-review.packet.json");
    const result = spawnSync(process.execPath, [
      path.join(here, "run.mjs"),
      "review-export",
      "--session", fx.sessionId,
      "--locales", "uk",
      "--out", outPath,
      "--backend", "mock",
    ], {
      encoding: "utf8",
      env: { ...process.env, FACTORY_SESSION_DIR: fx.sessionDir },
    });

    assert.equal(result.status, 0, result.stderr + result.stdout);
    const packet = JSON.parse(fs.readFileSync(outPath, "utf8"));
    assert.equal(packet.snapshot.sourceSha256, sha256(RU));
    assert.deepEqual(packet.requiredRoles, REQUIRED_L01);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("review export rejects malformed atomic source before writing a packet", () => {
  const fx = fixture();
  try {
    const outPath = path.join(fx.root, "bad.packet.json");
    fs.writeFileSync(path.join(fx.sessionDir, "practice.atomic.json"), "{broken json\n");

    assert.throws(() => exportReviewPacket({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"], outPath }), /atomic|PREJUDGE|malformed/iu);
    assert.equal(fs.existsSync(outPath), false);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("stale review import is rejected before any receipt is written", () => {
  const fx = fixture();
  try {
    const packet = exportReviewPacket({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"] });
    const input = path.join(fx.root, "review.result.json");
    fs.writeFileSync(input, JSON.stringify(reviewBundle(packet)));
    fs.appendFileSync(path.join(fx.sessionDir, "final.ru.md"), "Источник изменён после экспорта.\n");

    assert.throws(() => importReviewBundle({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"], inPath: input }), /stale|snapshot|hash/iu);
    for (const role of REQUIRED_L01) assert.equal(fs.existsSync(path.join(fx.sessionDir, `final.${role}.json`)), false);
    assert.equal(fs.existsSync(path.join(fx.sessionDir, "status.json")), false);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("review import preserves REVISE and never writes status", () => {
  const fx = fixture();
  try {
    const packet = exportReviewPacket({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"] });
    const input = path.join(fx.root, "review.result.json");
    fs.writeFileSync(input, JSON.stringify(reviewBundle(packet, { judge_reader: "REVISE" })));

    importReviewBundle({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"], inPath: input });

    const reader = JSON.parse(fs.readFileSync(path.join(fx.sessionDir, "final.judge_reader.json"), "utf8"));
    assert.equal(reader.verdict, "REVISE");
    assert.equal(reader.sourceSha256, sha256(RU));
    assert.equal(fs.existsSync(path.join(fx.sessionDir, "status.json")), false);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("review import rejects duplicate reviewer identities without partial writes", () => {
  const fx = fixture();
  try {
    const packet = exportReviewPacket({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"] });
    const bundle = reviewBundle(packet);
    for (const item of bundle.reviews) item.reviewer.reviewerId = "same-reviewer";
    const input = path.join(fx.root, "review.result.json");
    fs.writeFileSync(input, JSON.stringify(bundle));

    assert.throws(() => importReviewBundle({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"], inPath: input }), /duplicate|повтор|identity/iu);
    for (const role of REQUIRED_L01) assert.equal(fs.existsSync(path.join(fx.sessionDir, `final.${role}.json`)), false);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("existing-locale review writes only its receipt and never rewrites source", () => {
  const fx = fixture();
  try {
    const packet = exportReviewPacket({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"] });
    const input = path.join(fx.root, "locale.result.json");
    fs.writeFileSync(input, JSON.stringify(localeBundle(packet)));
    const before = Object.fromEntries(["final.ru.md", "final.uk.md", "practice.atomic.json"].map((name) => [name, fs.readFileSync(path.join(fx.sessionDir, name))]));

    importExistingLocaleReview({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"], inPath: input });

    for (const [name, bytes] of Object.entries(before)) assert.deepEqual(fs.readFileSync(path.join(fx.sessionDir, name)), bytes);
    assert.equal(fs.existsSync(path.join(fx.sessionDir, "locales.judge.json")), true);
    assert.equal(fs.existsSync(path.join(fx.sessionDir, "status.json")), false);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("failed finalization leaves an existing status byte-for-byte unchanged", () => {
  const fx = fixture();
  try {
    const statusPath = path.join(fx.sessionDir, "status.json");
    fs.writeFileSync(statusPath, "published-status-sentinel");
    const before = fs.readFileSync(statusPath);

    assert.throws(() => finalizeReviewedStatus({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"] }), /not ready|HOLD|готов/iu);
    assert.deepEqual(fs.readFileSync(statusPath), before);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("finalization rejects a forged receipt curriculum boundary and writes no status", () => {
  const fx = fixture();
  try {
    const packet = exportReviewPacket({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"] });
    const reviewInput = path.join(fx.root, "review.result.json");
    const localeInput = path.join(fx.root, "locale.result.json");
    fs.writeFileSync(reviewInput, JSON.stringify(reviewBundle(packet)));
    fs.writeFileSync(localeInput, JSON.stringify(localeBundle(packet)));
    importReviewBundle({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"], inPath: reviewInput });
    importExistingLocaleReview({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"], inPath: localeInput });
    const readerPath = path.join(fx.sessionDir, "final.judge_reader.json");
    const reader = JSON.parse(fs.readFileSync(readerPath, "utf8"));
    reader.curriculumBoundarySha256 = "0".repeat(64);
    fs.writeFileSync(readerPath, JSON.stringify(reader));

    assert.throws(
      () => finalizeReviewedStatus({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"] }),
      /curriculum boundary/iu,
    );
    assert.equal(fs.existsSync(path.join(fx.sessionDir, "status.json")), false);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("successful finalization writes a current bound status accepted by readiness", () => {
  const fx = fixture();
  try {
    const packet = exportReviewPacket({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"] });
    const reviewInput = path.join(fx.root, "review.result.json");
    const localeInput = path.join(fx.root, "locale.result.json");
    fs.writeFileSync(reviewInput, JSON.stringify(reviewBundle(packet)));
    fs.writeFileSync(localeInput, JSON.stringify(localeBundle(packet)));
    importReviewBundle({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"], inPath: reviewInput });
    importExistingLocaleReview({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"], inPath: localeInput });

    const status = finalizeReviewedStatus({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"] });

    assert.equal(status.converged, true);
    assert.equal(status.needsHumanReview, false);
    assert.equal(status.sourceSha256, sha256(RU));
    assert.equal(status.practiceAtomicSha256, sha256(ATOMIC));
    assert.equal(status.localeHashes.uk, sha256(UK));
    assert.deepEqual(sessionReadiness(fx.sessionDir, ["uk"], { sessionId: fx.sessionId }), { ready: true, issues: [] });
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("finalization recomputes deterministic hard gates from its captured source", () => {
  const fx = fixture();
  try {
    const ruPath = path.join(fx.sessionDir, "final.ru.md");
    fs.writeFileSync(ruPath, fs.readFileSync(ruPath, "utf8").replace("`I` — это «я».", "вы уже выучили `I`."));
    fs.writeFileSync(path.join(fx.sessionDir, "final.uk.md"), fx.uk);
    const packet = exportReviewPacket({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"] });
    const reviewInput = path.join(fx.root, "review.result.json");
    const localeInput = path.join(fx.root, "locale.result.json");
    fs.writeFileSync(reviewInput, JSON.stringify(reviewBundle(packet)));
    fs.writeFileSync(localeInput, JSON.stringify(localeBundle(packet)));
    importReviewBundle({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"], inPath: reviewInput });
    importExistingLocaleReview({ sessionId: fx.sessionId, sessionDir: fx.sessionDir, locales: ["uk"], inPath: localeInput });
    const statusPath = path.join(fx.sessionDir, "status.json");
    fs.writeFileSync(statusPath, "existing-status");

    assert.throws(() => finalizeReviewedStatus({
      sessionId: fx.sessionId,
      sessionDir: fx.sessionDir,
      locales: ["uk"],
    }), /ОТСЫЛКА К ПРОШЛОМУ/iu);
    assert.equal(fs.readFileSync(statusPath, "utf8"), "existing-status");
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});
