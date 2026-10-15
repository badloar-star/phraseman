import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const REVIEWED_PROJECTION_RECEIPT_SCHEMA = "learning-v2-reviewed-projection-receipt-v1";
export const PROJECTION_RECEIPT_FILE = "projection-receipt.v1.json";
export const REQUIRED_SOURCE_FILES = Object.freeze([
  "final.ru.md",
  "final.uk.md",
  "practice.atomic.json",
  "practice.explanations.v1.json",
]);
export const REQUIRED_PROJECTION_FILES = Object.freeze([
  "intro.json",
  "learner.json",
  "learner.uk.json",
  "answers.json",
  "auxiliary.json",
]);

function validateSessionKey(sessionKey) {
  const parts = String(sessionKey).split("/");
  if (parts.length !== 3 || !/^[a-z]{2}$/u.test(parts[0]) || !/^l\d{2}$/u.test(parts[1]) || !/^s\d{2}$/u.test(parts[2])) {
    throw new Error(`invalid reviewed projection session key: ${sessionKey}`);
  }
  return parts;
}

function sha256File(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function hashesFor(directory, names) {
  return Object.fromEntries(names.map((name) => [name, sha256File(path.join(directory, name))]));
}

function exactKeys(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === [...expected].sort()[index]);
}

/**
 * Build the byte-binding payload used by the reviewed projection publisher.
 * This is provenance only: it grants no authoring, review, release, or approval authority.
 */
export function buildReviewedProjectionReceipt({ courseRoot, sessionKey, reviewedDir }) {
  const parts = validateSessionKey(sessionKey);
  const sessionRoot = path.join(courseRoot, "sessions", ...parts);
  for (const name of REQUIRED_SOURCE_FILES) {
    if (!fs.existsSync(path.join(sessionRoot, name))) throw new Error(`source_missing:${name}`);
  }
  for (const name of REQUIRED_PROJECTION_FILES) {
    if (!fs.existsSync(path.join(reviewedDir, name))) throw new Error(`projection_missing:${name}`);
  }
  return {
    schemaVersion: REVIEWED_PROJECTION_RECEIPT_SCHEMA,
    sessionKey,
    sourceSha256ByFile: hashesFor(sessionRoot, REQUIRED_SOURCE_FILES),
    projectionSha256ByFile: hashesFor(reviewedDir, REQUIRED_PROJECTION_FILES),
  };
}

export function reviewedProjectionFreshness({ courseRoot, sessionKey, reviewedDir }) {
  const parts = validateSessionKey(sessionKey);
  const sessionRoot = path.join(courseRoot, "sessions", ...parts);
  const available = fs.existsSync(path.join(reviewedDir, "intro.json")) && fs.existsSync(path.join(reviewedDir, "learner.json"));

  for (const name of REQUIRED_PROJECTION_FILES) {
    if (!fs.existsSync(path.join(reviewedDir, name))) return { available, fresh: false, reason: `projection_missing:${name}` };
  }
  for (const name of REQUIRED_SOURCE_FILES) {
    if (!fs.existsSync(path.join(sessionRoot, name))) return { available, fresh: false, reason: `source_missing:${name}` };
  }

  const receiptPath = path.join(reviewedDir, PROJECTION_RECEIPT_FILE);
  if (!fs.existsSync(receiptPath)) return { available, fresh: false, reason: "receipt_missing" };

  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  } catch {
    return { available, fresh: false, reason: "receipt_invalid_json" };
  }
  if (receipt?.schemaVersion !== REVIEWED_PROJECTION_RECEIPT_SCHEMA) return { available, fresh: false, reason: "receipt_schema_invalid" };
  if (receipt?.sessionKey !== sessionKey) return { available, fresh: false, reason: "receipt_session_mismatch" };
  if (!exactKeys(receipt.sourceSha256ByFile, REQUIRED_SOURCE_FILES)) return { available, fresh: false, reason: "receipt_source_set_invalid" };
  if (!exactKeys(receipt.projectionSha256ByFile, REQUIRED_PROJECTION_FILES)) return { available, fresh: false, reason: "receipt_projection_set_invalid" };

  for (const name of REQUIRED_SOURCE_FILES) {
    if (receipt.sourceSha256ByFile[name] !== sha256File(path.join(sessionRoot, name))) {
      return { available, fresh: false, reason: `source_hash_mismatch:${name}` };
    }
  }
  for (const name of REQUIRED_PROJECTION_FILES) {
    if (receipt.projectionSha256ByFile[name] !== sha256File(path.join(reviewedDir, name))) {
      return { available, fresh: false, reason: `projection_hash_mismatch:${name}` };
    }
  }
  return { available, fresh: true, reason: null };
}
