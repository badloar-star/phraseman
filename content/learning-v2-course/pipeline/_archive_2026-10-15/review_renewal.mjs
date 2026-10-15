import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CANONICAL_BINDING_SCHEMA_VERSION,
  currentCurriculumRow,
  judgeReceiptContractIssues,
  requiredJudgesForSession,
  sessionReadiness,
} from "./session_readiness.mjs";
import { strictProjectionContractIssues } from "./prejudge_choreography.mjs";
import { HARD_FACT_RE, machineFacts } from "./run.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const REVIEW_EXPORT_SCHEMA = "learning_v2_review_export_v1";
const REVIEW_RESULT_SCHEMA = "learning_v2_review_result_bundle_v1";
const LOCALE_RESULT_SCHEMA = "learning_v2_locale_review_bundle_v1";
const REVIEWER_IDENTITY_SCHEMA = "learning_v2_reviewer_identity_v1";
const CURRICULUM_BOUNDARY_SCHEMA = "learning_v2_curriculum_boundary_v1";
const VERDICTS = new Set(["PASS", "REVISE", "BLOCK"]);

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readRequired(file, label = path.basename(file)) {
  if (!fs.existsSync(file)) throw new Error(`REVIEW HOLD: missing ${label}`);
  return fs.readFileSync(file);
}

function normalizeLocales(locales) {
  const values = [...new Set((locales ?? []).map((value) => String(value).trim()).filter(Boolean))];
  if (values.some((locale) => !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(locale))) {
    throw new Error("REVIEW HOLD: malformed locale code");
  }
  return values;
}

function captureSnapshot({ sessionDir, locales }) {
  const localeList = normalizeLocales(locales);
  const files = {
    ru: path.join(sessionDir, "final.ru.md"),
    atomic: path.join(sessionDir, "practice.atomic.json"),
    ...Object.fromEntries(localeList.map((locale) => [locale, path.join(sessionDir, `final.${locale}.md`)])),
  };
  const bytes = Object.fromEntries(Object.entries(files).map(([name, file]) => [name, readRequired(file, path.basename(file))]));
  const hashes = Object.fromEntries(Object.entries(bytes).map(([name, value]) => [name, digest(value)]));
  const localeHashes = Object.fromEntries(localeList.map((locale) => [locale, hashes[locale]]));
  return {
    files,
    bytes,
    snapshot: {
      bindingSchemaVersion: CANONICAL_BINDING_SCHEMA_VERSION,
      sourceSha256: hashes.ru,
      exactRuSha256: hashes.ru,
      ...(hashes.uk ? { exactUkSha256: hashes.uk } : {}),
      practiceAtomicSha256: hashes.atomic,
      localeHashes: { ru: hashes.ru, ...localeHashes },
    },
  };
}

function canonicalSnapshot(value) {
  return JSON.stringify({
    bindingSchemaVersion: value?.bindingSchemaVersion,
    sourceSha256: value?.sourceSha256,
    exactRuSha256: value?.exactRuSha256,
    exactUkSha256: value?.exactUkSha256,
    practiceAtomicSha256: value?.practiceAtomicSha256,
    localeHashes: Object.fromEntries(Object.entries(value?.localeHashes ?? {}).sort(([a], [b]) => a.localeCompare(b))),
  });
}

function assertSnapshot(expected, actual) {
  if (canonicalSnapshot(expected) !== canonicalSnapshot(actual)) {
    throw new Error("REVIEW HOLD: stale or wrong snapshot hashes");
  }
}

function assertSnapshotLive(captured) {
  const current = captureSnapshot({
    sessionDir: path.dirname(captured.files.ru),
    locales: Object.keys(captured.snapshot.localeHashes).filter((locale) => locale !== "ru"),
  });
  assertSnapshot(captured.snapshot, current.snapshot);
}

function parseJsonFile(file, expectedSchema) {
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`REVIEW HOLD: malformed input JSON (${error.message})`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("REVIEW HOLD: input must be a JSON object");
  if (value.schemaVersion !== expectedSchema) throw new Error(`REVIEW HOLD: unsupported input schema ${value.schemaVersion ?? "missing"}`);
  return value;
}

function reviewerId(receipt) {
  const reviewer = receipt?.reviewer;
  if (!reviewer || typeof reviewer !== "object" || Array.isArray(reviewer)) return "";
  return String(reviewer.reviewerId ?? "").normalize("NFKC").trim().toLocaleLowerCase("und");
}

function assertIndependentReviewers(receipts, existingReceipts = []) {
  const seen = new Map();
  for (const receipt of [...existingReceipts, ...receipts]) {
    const id = reviewerId(receipt);
    if (!id) throw new Error(`REVIEW HOLD: missing reviewer identity for ${receipt?.role ?? "unknown role"}`);
    if (seen.has(id)) throw new Error(`REVIEW HOLD: duplicate reviewer identity ${id}: ${seen.get(id)} and ${receipt.role}`);
    seen.set(id, receipt.role);
  }
}

function boundReceipt(receipt, { sessionId, role, snapshot, curriculumBoundary }) {
  const reviewer = receipt?.reviewer;
  if (receipt?.sessionId !== sessionId || receipt?.role !== role) {
    throw new Error(`REVIEW HOLD: ${role} identity does not match session/role`);
  }
  if (!reviewer || typeof reviewer !== "object" || Array.isArray(reviewer)
    || reviewer.schemaVersion !== REVIEWER_IDENTITY_SCHEMA
    || !String(reviewer.reviewerId ?? "").trim()
    || reviewer.sessionId !== sessionId
    || reviewer.role !== role) {
    throw new Error(`REVIEW HOLD: malformed reviewer identity for ${role}`);
  }
  assertCurriculumBoundaryBinding(receipt?.curriculumBoundarySha256, curriculumBoundary);
  return {
    ...receipt,
    ...snapshot,
    curriculumBoundarySha256: curriculumBoundary.boundarySha256,
  };
}

function sourceTexts(captured) {
  return Object.fromEntries(Object.entries(captured.bytes)
    .filter(([name]) => name !== "atomic")
    .map(([name, bytes]) => [name, bytes.toString("utf8")]));
}

function assertCanonicalSourceContract(sessionId, sessionDir, captured) {
  const sources = sourceTexts(captured);
  let atomic;
  try { atomic = JSON.parse(captured.bytes.atomic.toString("utf8")); }
  catch (error) { throw new Error(`PREJUDGE HOLD: atomic_source_malformed:${error.message}`); }
  const result = strictProjectionContractIssues({
    sessionIdentity: sessionId,
    atomicSource: atomic,
    markdownByLocale: sources,
  });
  const missingLocales = Object.keys(sources).filter((locale) => !Array.isArray(atomic?.interactionsByLocale?.[locale]));
  const issues = [...result.issues, ...missingLocales.map((locale) => `atomic_locale_missing:${locale}`)];
  if (issues.length) {
    const details = issues.map((issue) => typeof issue === "string" ? issue : JSON.stringify(issue)).join(" | ");
    throw new Error(`PREJUDGE HOLD: ${details}`);
  }
  return { verdict: "PASS", atomic };
}

function sessionOrder(sessionId) {
  const match = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/u.exec(String(sessionId ?? ""));
  if (!match) throw new Error("REVIEW HOLD: invalid session identity");
  return { language: match[1], lesson: Number(match[2]), session: Number(match[3]) };
}

function curriculumBoundaryEvidence(
  sessionId,
  curriculumPlanPath = path.join(ROOT, "curriculum", sessionOrder(sessionId).language, "ПЛАН_КУРСА.md"),
) {
  const current = sessionOrder(sessionId);
  const planBytes = readRequired(curriculumPlanPath, "authoritative curriculum plan");
  const planText = planBytes.toString("utf8");
  const section = planText.split(/(?=^## Урок \d+(?:\s|$))/mu)
    .find((part) => new RegExp(`^## Урок ${current.lesson}(?:\\s|$)`, "mu").test(part)) ?? "";
  const rows = [...section.matchAll(/^\|\s*(\d+)\s*\|.*$/gmu)]
    .map((match) => ({ ordinal: Number(match[1]), row: match[0].trim() }))
    .filter(({ ordinal }) => Number.isInteger(ordinal) && ordinal >= 1 && ordinal <= 56);
  const currentRow = rows.find(({ ordinal }) => ordinal === current.session)?.row ?? null;
  if (!currentRow) throw new Error("REVIEW HOLD: curriculum boundary row is unavailable");
  const priorRows = rows
    .filter(({ ordinal }) => ordinal < current.session)
    .sort((left, right) => left.ordinal - right.ordinal)
    .map(({ row }) => row);
  if (current.lesson === 1 && current.session === 1 && priorRows.length !== 0) {
    throw new Error("REVIEW HOLD: curriculum course-start boundary is contradictory");
  }
  const relativePlan = path.relative(ROOT, curriculumPlanPath).replaceAll("\\", "/");
  const body = {
    schemaVersion: CURRICULUM_BOUNDARY_SCHEMA,
    sessionId,
    courseStart: current.lesson === 1 && current.session === 1,
    authority: {
      path: relativePlan.startsWith("../") ? path.basename(curriculumPlanPath) : relativePlan,
      sha256: digest(planBytes),
    },
    currentRow,
    currentRowSha256: digest(currentRow),
    priorRows,
  };
  return { ...body, boundarySha256: digest(JSON.stringify(body)) };
}

function assertCurriculumBoundaryBinding(declaredSha256, currentBoundary) {
  if (!/^[a-f0-9]{64}$/u.test(String(declaredSha256 ?? ""))) {
    throw new Error("REVIEW HOLD: missing or malformed curriculum boundary binding");
  }
  if (declaredSha256 !== currentBoundary.boundarySha256) {
    throw new Error("REVIEW HOLD: stale or forged curriculum boundary binding");
  }
}

function progressionEvidence({ sessionId, sessionDir, locales }) {
  const current = sessionOrder(sessionId);
  const sessionsRoot = path.resolve(sessionDir, "../../..");
  const languageRoot = path.join(sessionsRoot, current.language);
  const priorSessions = [];
  if (fs.existsSync(languageRoot)) {
    for (const lessonName of fs.readdirSync(languageRoot).filter((name) => /^l\d{2}$/u.test(name)).sort()) {
      const lesson = Number(lessonName.slice(1));
      if (lesson > current.lesson) continue;
      const lessonDir = path.join(languageRoot, lessonName);
      for (const sessionName of fs.readdirSync(lessonDir).filter((name) => /^s\d{2}$/u.test(name)).sort()) {
        const session = Number(sessionName.slice(1));
        if (lesson === current.lesson && session >= current.session) continue;
        const priorId = `${current.language}/${lessonName}/${sessionName}`;
        const priorDir = path.join(lessonDir, sessionName);
        const statusPath = path.join(priorDir, "status.json");
        let status;
        try { status = JSON.parse(fs.readFileSync(statusPath, "utf8")); } catch { continue; }
        if (status?.converged !== true || status?.needsHumanReview !== false) continue;
        const statusBytes = fs.readFileSync(statusPath);
        const captured = captureSnapshot({ sessionDir: priorDir, locales });
        assertCanonicalSourceContract(priorId, priorDir, captured);
        const readiness = sessionReadiness(priorDir, locales, { sessionId: priorId });
        if (!readiness.ready) {
          throw new Error(`REVIEW HOLD: progression prior not ready ${priorId}: ${readiness.issues.join(" | ")}`);
        }
        assertSnapshotLive(captured);
        if (digest(fs.readFileSync(statusPath)) !== digest(statusBytes)) {
          throw new Error(`REVIEW HOLD: progression prior status changed ${priorId}`);
        }
        priorSessions.push({
          sessionId: priorId,
          snapshot: captured.snapshot,
          statusSha256: digest(statusBytes),
          sources: {
            ru: captured.bytes.ru.toString("utf8"),
            atomic: captured.bytes.atomic.toString("utf8"),
            locales: Object.fromEntries(locales.map((locale) => [locale, captured.bytes[locale].toString("utf8")])),
          },
        });
      }
    }
  }
  const curriculumRow = currentCurriculumRow(sessionId);
  if (!curriculumRow) throw new Error("REVIEW HOLD: progression curriculum row is unavailable");
  if (!priorSessions.length) throw new Error("REVIEW HOLD: progression prior accepted-session evidence is unavailable");
  const manifest = {
    schemaVersion: "learning_v2_progression_evidence_manifest_v1",
    sessionId,
    curriculumRow,
    comparedThrough: priorSessions.at(-1).sessionId,
    priorSessions,
  };
  return { ...manifest, manifestSha256: digest(JSON.stringify(manifest)) };
}

function assertProgressionBinding({ sessionId, sessionDir, locales, receipt, declaredManifestSha256 = null }) {
  const evidence = progressionEvidence({ sessionId, sessionDir, locales });
  if (declaredManifestSha256 !== null && declaredManifestSha256 !== evidence.manifestSha256) {
    throw new Error("REVIEW HOLD: stale progression evidence manifest");
  }
  if (receipt?.progressionManifestSha256 !== evidence.manifestSha256) {
    throw new Error("REVIEW HOLD: judge_progression is not bound to the current progression evidence manifest");
  }
  return evidence;
}

function validateReceipt(receipt, { sessionId, role, captured, requiredEvidenceLocales = [] }) {
  if (!VERDICTS.has(receipt?.verdict)) throw new Error(`REVIEW HOLD: ${role} has invalid verdict`);
  const issues = judgeReceiptContractIssues(receipt, role, sourceTexts(captured), sessionId, role, { requiredEvidenceLocales });
  if (issues.length) throw new Error(`REVIEW HOLD: ${issues.join(" | ")}`);
}

function atomicJsonWrite(file, value, { exclusive = false } = {}) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  if (exclusive && fs.existsSync(file)) throw new Error(`REVIEW HOLD: output already exists: ${file}`);
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    if (exclusive) {
      fs.linkSync(temp, file);
      fs.unlinkSync(temp);
    }
    else {
      if (fs.existsSync(file)) fs.unlinkSync(file);
      fs.renameSync(temp, file);
    }
  } catch (error) {
    try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {}
    throw error;
  }
}

function transactionalReceiptWrite(entries, captured) {
  const originals = new Map(entries.map(({ file }) => [file, fs.existsSync(file) ? fs.readFileSync(file) : null]));
  const staged = [];
  try {
    for (let index = 0; index < entries.length; index += 1) {
      const { file, value } = entries[index];
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const temp = `${file}.tmp-${process.pid}-${Date.now()}-${index}`;
      fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
      staged.push({ file, temp });
    }
    assertSnapshotLive(captured);
    for (const { file, temp } of staged) {
      assertSnapshotLive(captured);
      if (fs.existsSync(file)) fs.unlinkSync(file);
      fs.renameSync(temp, file);
    }
    assertSnapshotLive(captured);
  } catch (error) {
    for (const { temp } of staged) try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {}
    for (const [file, original] of originals) {
      try {
        if (original === null) {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        } else {
          fs.writeFileSync(file, original);
        }
      } catch {}
    }
    throw error;
  }
}

function promptContract(file) {
  const bytes = readRequired(file, path.basename(file));
  return { file: path.basename(file), sha256: digest(bytes), content: bytes.toString("utf8") };
}

export function exportReviewPacket({
  sessionId,
  sessionDir,
  locales = ["uk"],
  outPath = null,
  promptDir = path.join(HERE, "prompts"),
  mainRequirementPath = path.join(ROOT, "ГЛАВНОЕ_ТРЕБОВАНИЕ.md"),
  cambridgeDigestPath = path.join(ROOT, "СВОД_ГРАММАТИКИ_КЕМБРИДЖ.md"),
  curriculumPlanPath = null,
} = {}) {
  if (!sessionId || !sessionDir) throw new Error("REVIEW HOLD: sessionId and sessionDir are required");
  const localeList = normalizeLocales(locales);
  const captured = captureSnapshot({ sessionDir, locales: localeList });
  const requiredRoles = requiredJudgesForSession(sessionId);
  const curriculumBoundary = curriculumBoundaryEvidence(
    sessionId,
    curriculumPlanPath ?? path.join(ROOT, "curriculum", sessionOrder(sessionId).language, "ПЛАН_КУРСА.md"),
  );
  assertCanonicalSourceContract(sessionId, sessionDir, captured);
  const progression = requiredRoles.includes("judge_progression")
    ? progressionEvidence({ sessionId, sessionDir, locales: localeList })
    : null;
  const packet = {
    schemaVersion: REVIEW_EXPORT_SCHEMA,
    sessionId,
    requestedLocales: localeList,
    requiredRoles,
    snapshot: captured.snapshot,
    curriculumBoundary,
    ...(progression ? { progressionEvidence: progression } : {}),
    sources: {
      ru: { path: "final.ru.md", sha256: captured.snapshot.sourceSha256, content: captured.bytes.ru.toString("utf8") },
      atomic: { path: "practice.atomic.json", sha256: captured.snapshot.practiceAtomicSha256, content: captured.bytes.atomic.toString("utf8") },
      locales: Object.fromEntries(localeList.map((locale) => [locale, {
        path: `final.${locale}.md`,
        sha256: captured.snapshot.localeHashes[locale],
        content: captured.bytes[locale].toString("utf8"),
      }])),
    },
    promptContracts: {
      mainRequirement: promptContract(mainRequirementPath),
      cambridgeDigest: promptContract(cambridgeDigestPath),
      evidenceContract: {
        schemaVersion: "learning_v2_structured_review_evidence_v1",
        requiredFields: ["fieldPath", "quote", "analysis", "coverage"],
        verdicts: [...VERDICTS],
        reviewerIdentitySchemaVersion: REVIEWER_IDENTITY_SCHEMA,
      },
      roles: Object.fromEntries(requiredRoles.map((role) => [role, promptContract(path.join(promptDir, `${role}.md`))])),
      locale: promptContract(path.join(promptDir, "judge_locale_batch.md")),
    },
  };
  if (outPath) atomicJsonWrite(path.resolve(outPath), packet, { exclusive: true });
  return packet;
}

export function importReviewBundle({ sessionId, sessionDir, locales = ["uk"], inPath, curriculumPlanPath = null } = {}) {
  if (!inPath) throw new Error("REVIEW HOLD: --in is required");
  const bundle = parseJsonFile(inPath, REVIEW_RESULT_SCHEMA);
  if (bundle.sessionId !== sessionId) throw new Error("REVIEW HOLD: wrong sessionId");
  const captured = captureSnapshot({ sessionDir, locales });
  assertSnapshot(bundle.snapshot, captured.snapshot);
  const curriculumBoundary = curriculumBoundaryEvidence(
    sessionId,
    curriculumPlanPath ?? path.join(ROOT, "curriculum", sessionOrder(sessionId).language, "ПЛАН_КУРСА.md"),
  );
  assertCurriculumBoundaryBinding(bundle.curriculumBoundarySha256, curriculumBoundary);
  assertCanonicalSourceContract(sessionId, sessionDir, captured);
  const roles = requiredJudgesForSession(sessionId);
  if (!Array.isArray(bundle.reviews)) throw new Error("REVIEW HOLD: reviews must be an array");
  const byRole = new Map();
  for (const item of bundle.reviews) {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("REVIEW HOLD: malformed review");
    if (!roles.includes(item.role)) throw new Error(`REVIEW HOLD: unexpected role ${item.role ?? "missing"}`);
    if (byRole.has(item.role)) throw new Error(`REVIEW HOLD: duplicate role ${item.role}`);
    byRole.set(item.role, item);
  }
  const missing = roles.filter((role) => !byRole.has(role));
  if (missing.length) throw new Error(`REVIEW HOLD: missing required roles: ${missing.join(", ")}`);
  const receipts = roles.map((role) => boundReceipt(byRole.get(role), {
    sessionId,
    role,
    snapshot: captured.snapshot,
    curriculumBoundary,
  }));
  if (roles.includes("judge_progression")) {
    assertProgressionBinding({
      sessionId,
      sessionDir,
      locales: normalizeLocales(locales),
      receipt: receipts.find((receipt) => receipt.role === "judge_progression"),
      declaredManifestSha256: bundle.progressionManifestSha256,
    });
  }
  const localeReceiptPath = path.join(sessionDir, "locales.judge.json");
  let existingLocaleReceipt = [];
  if (fs.existsSync(localeReceiptPath)) {
    try { existingLocaleReceipt = [JSON.parse(fs.readFileSync(localeReceiptPath, "utf8"))]; }
    catch { throw new Error("REVIEW HOLD: existing locales.judge.json is malformed"); }
  }
  assertIndependentReviewers(receipts, existingLocaleReceipt);
  for (const receipt of receipts) validateReceipt(receipt, { sessionId, role: receipt.role, captured });
  transactionalReceiptWrite(receipts.map((value) => ({ file: path.join(sessionDir, `final.${value.role}.json`), value })), captured);
  return receipts;
}

export function importExistingLocaleReview({ sessionId, sessionDir, locales = ["uk"], inPath, curriculumPlanPath = null } = {}) {
  if (!inPath) throw new Error("REVIEW HOLD: --in is required");
  const localeList = normalizeLocales(locales);
  const bundle = parseJsonFile(inPath, LOCALE_RESULT_SCHEMA);
  if (bundle.sessionId !== sessionId) throw new Error("REVIEW HOLD: wrong sessionId");
  const captured = captureSnapshot({ sessionDir, locales: localeList });
  assertSnapshot(bundle.snapshot, captured.snapshot);
  const curriculumBoundary = curriculumBoundaryEvidence(
    sessionId,
    curriculumPlanPath ?? path.join(ROOT, "curriculum", sessionOrder(sessionId).language, "ПЛАН_КУРСА.md"),
  );
  assertCurriculumBoundaryBinding(bundle.curriculumBoundarySha256, curriculumBoundary);
  assertCanonicalSourceContract(sessionId, sessionDir, captured);
  const value = boundReceipt(bundle.review, {
    sessionId,
    role: "judge_locales",
    snapshot: captured.snapshot,
    curriculumBoundary,
  });
  if (!value.locales || typeof value.locales !== "object" || localeList.some((locale) => !VERDICTS.has(value.locales?.[locale]?.verdict))) {
    throw new Error("REVIEW HOLD: missing or malformed locale verdicts");
  }
  const existing = requiredJudgesForSession(sessionId).flatMap((role) => {
    const file = path.join(sessionDir, `final.${role}.json`);
    try { return fs.existsSync(file) ? [JSON.parse(fs.readFileSync(file, "utf8"))] : []; } catch { return []; }
  });
  assertIndependentReviewers([value], existing);
  validateReceipt(value, { sessionId, role: "judge_locales", captured, requiredEvidenceLocales: ["ru", ...localeList] });
  transactionalReceiptWrite([{ file: path.join(sessionDir, "locales.judge.json"), value }], captured);
  return value;
}

export function finalizeReviewedStatus({ sessionId, sessionDir, locales = ["uk"], curriculumPlanPath = null } = {}) {
  const localeList = normalizeLocales(locales);
  const captured = captureSnapshot({ sessionDir, locales: localeList });
  const curriculumBoundary = curriculumBoundaryEvidence(
    sessionId,
    curriculumPlanPath ?? path.join(ROOT, "curriculum", sessionOrder(sessionId).language, "ПЛАН_КУРСА.md"),
  );
  assertCanonicalSourceContract(sessionId, sessionDir, captured);
  const deterministicIssues = machineFacts(
    captured.files.ru,
    sessionId,
    captured.bytes.ru.toString("utf8"),
    captured.bytes.atomic.toString("utf8"),
  ).split("\n").filter((line) => HARD_FACT_RE.test(line));
  if (deterministicIssues.length) throw new Error(`FINALIZE HOLD: ${deterministicIssues.join(" | ")}`);
  if (requiredJudgesForSession(sessionId).includes("judge_progression")) {
    let receipt;
    try { receipt = JSON.parse(fs.readFileSync(path.join(sessionDir, "final.judge_progression.json"), "utf8")); }
    catch { throw new Error("FINALIZE HOLD: judge_progression receipt is unavailable"); }
    assertProgressionBinding({ sessionId, sessionDir, locales: localeList, receipt });
  }
  for (const [role, receiptName] of [
    ...requiredJudgesForSession(sessionId).map((role) => [role, `final.${role}.json`]),
    ["judge_locales", "locales.judge.json"],
  ]) {
    let receipt;
    try { receipt = JSON.parse(fs.readFileSync(path.join(sessionDir, receiptName), "utf8")); }
    catch { throw new Error(`FINALIZE HOLD: ${role} receipt is unavailable`); }
    try { assertCurriculumBoundaryBinding(receipt.curriculumBoundarySha256, curriculumBoundary); }
    catch (error) { throw new Error(`FINALIZE HOLD: ${error.message}`); }
  }
  const readiness = sessionReadiness(sessionDir, localeList, { sessionId, statusRequired: false });
  if (!readiness.ready) throw new Error(`FINALIZE HOLD: session not ready: ${readiness.issues.join(" | ")}`);
  assertSnapshotLive(captured);
  const status = {
    session: sessionId,
    converged: true,
    needsHumanReview: false,
    blocked: [],
    brokenTasks: [],
    buildProblems: [],
    locales: Object.fromEntries(localeList.map((locale) => [locale, "PASS"])),
    at: new Date().toISOString(),
    curriculumBoundarySha256: curriculumBoundary.boundarySha256,
    ...captured.snapshot,
  };
  transactionalReceiptWrite([{ file: path.join(sessionDir, "status.json"), value: status }], captured);
  return status;
}
