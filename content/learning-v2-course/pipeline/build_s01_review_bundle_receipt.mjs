#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { collectS01NoDriftBoundary, verifyS01ContentReceipt } from "./build_s01_candidate_receipt.mjs";
import { writeMockupFile } from "./write_mockup_file.mjs";

const PIPELINE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = path.resolve(PIPELINE, "../../..");
const DEFAULT_CANDIDATE = path.join(DEFAULT_REPO, "content/learning-v2-course/outputs/s01-source-projection-fixed-20261013");
const READER2_SUCCESSOR = path.join(DEFAULT_REPO, "content/learning-v2-course/outputs/s01-reader2-fixed-20261013");
const SUCCESSOR_HISTORICAL_V2 = "content/learning-v2-course/outputs/s01-reader2-fixed-20261013/review-bundle-receipt.json";
const COMBINED_SUCCESSOR_NAME = "s01-combined-review-fixed-20261013";
const I13_SUCCESSOR_NAME = "s01-i13-scene-fixed-20261013";
const READER2_STABLE_V3 = "content/learning-v2-course/outputs/s01-reader2-fixed-20261013/review-content-bundle-receipt.v3.json";
const COMBINED_STABLE_V3 = "content/learning-v2-course/outputs/s01-combined-review-fixed-20261013/review-content-bundle-receipt.v3.json";
const LEGACY_RECEIPT = "hash-receipt.json";
const CONTENT_RECEIPT = "content-receipt.json";
const STABLE_CONTENT_BUNDLE_RECEIPT = "review-content-bundle-receipt.v3.json";
const RAW_RECEIPTS = Object.freeze(["content/learning-v2-course/judgements/2026-10-13_l01_s01_learner_audit6_raw.md"]);
const TOOLCHAIN = Object.freeze([
  "content/learning-v2-course/pipeline/build_s01_candidate_receipt.mjs",
  "content/learning-v2-course/pipeline/build_s01_candidate_receipt.test.mjs",
  "content/learning-v2-course/pipeline/build_s01_review_bundle_receipt.mjs",
  "content/learning-v2-course/pipeline/build_s01_review_bundle_receipt.test.mjs",
  "content/learning-v2-course/pipeline/s01_review_evidence_manifest.test.mjs",
]);
// Review ledgers, their raw verdicts, receipt files, and their mutable tests are
// intentionally absent: appending a verdict must not invalidate the content proof.
const SUCCESSOR_STABLE_TOOLCHAIN = Object.freeze([
  "content/learning-v2-course/pipeline/build_s01_candidate_receipt.mjs",
  "content/learning-v2-course/pipeline/build_s01_review_bundle_receipt.mjs",
]);
const READER2_FROZEN_TOOLCHAIN = Object.freeze([
  Object.freeze({
    path: "content/learning-v2-course/pipeline/build_s01_candidate_receipt.mjs",
    bytes: 19506,
    sha256: "be11b83c7e1f2ff00b6172e20e1087e677655a916870b6bbbb0d66478efdb39e",
  }),
  Object.freeze({
    path: "content/learning-v2-course/pipeline/build_s01_review_bundle_receipt.mjs",
    bytes: 9263,
    sha256: "e0604d28deee2425339ca97f4d3e50b828972ade7b2bd215fd83387061294c58",
  }),
]);
const COMBINED_FROZEN_TOOLCHAIN = Object.freeze([
  Object.freeze({
    path: "content/learning-v2-course/pipeline/build_s01_candidate_receipt.mjs",
    bytes: 19544,
    sha256: "1a63cb3d041171b57df1865c9da755783e99610b6ad2b7b49d2f2da4c92b9ef1",
  }),
  Object.freeze({
    path: "content/learning-v2-course/pipeline/build_s01_review_bundle_receipt.mjs",
    bytes: 10465,
    sha256: "78eb654eb027020f2f27f62482d48fe15a23b655c36561a49abdc06d78b7f78d",
  }),
]);
const SOURCE_EVIDENCE = Object.freeze(["content/learning-v2-course/judgements/2026-10-13_l01_s01_source_evidence.md"]);
const BUNDLE_FILES = Object.freeze([
  "en/l01/s01/intro.json",
  "en/l01/s01/auxiliary.json",
  "en/l01/s01/learner.json",
  "en/l01/s01/learner.uk.json",
  "en/l01/s01/answers.json",
]);

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const relative = (repoRoot, absolute) => path.relative(repoRoot, absolute).split(path.sep).join("/");
const hash = (repoRoot, relativePath) => {
  const bytes = fs.readFileSync(path.join(repoRoot, ...relativePath.split("/")));
  return { path: relativePath, bytes: bytes.length, sha256: sha256(bytes) };
};

function candidateBundle(repoRoot, candidateRoot) {
  const prefix = relative(repoRoot, candidateRoot);
  const files = BUNDLE_FILES.map((entry) => {
    const hashed = hash(repoRoot, `${prefix}/${entry}`);
    return { ...hashed, path: entry };
  });
  return { files, sha256: sha256(JSON.stringify(files.map(({ path: file, bytes, sha256: digest }) => ({ path: file, bytes, sha256: digest })))) };
}

export function buildS01V2ToV3MigrationReceipt({ repoRoot = DEFAULT_REPO, candidateRoot = DEFAULT_CANDIDATE } = {}) {
  const content = verifyS01ContentReceipt({ repoRoot, candidateRoot });
  const legacyBytes = fs.readFileSync(path.join(candidateRoot, LEGACY_RECEIPT));
  const legacy = JSON.parse(legacyBytes.toString("utf8"));
  const legacyByPath = new Map((legacy.files ?? []).map((entry) => [entry.path, entry]));
  const subset = content.files.map((entry) => {
    const old = legacyByPath.get(entry.path);
    if (!old || old.bytes !== entry.bytes || old.sha256 !== entry.sha256) throw new Error(`legacy_subset_mismatch:${entry.path}`);
    return { path: entry.path, bytes: entry.bytes, sha256: entry.sha256 };
  });
  const boundary = collectS01NoDriftBoundary({ repoRoot });
  const bundle = candidateBundle(repoRoot, candidateRoot);
  return {
    schemaVersion: "learning_v2_s01_legacy_v2_to_content_v3_migration_v1",
    releaseAuthority: false,
    legacyReceipt: {
      path: `${relative(repoRoot, candidateRoot)}/${LEGACY_RECEIPT}`,
      sha256: sha256(legacyBytes),
      inventorySha256: legacy.inventorySha256,
    },
    v3Content: {
      path: `${relative(repoRoot, candidateRoot)}/${CONTENT_RECEIPT}`,
      inventorySha256: content.inventorySha256,
      fileCount: content.fileCount,
      allEntriesUnchangedLegacySubset: true,
      unchangedSubset: subset,
    },
    candidateBundle: bundle,
    protectedNoDriftBoundary: { fileCount: boundary.fileCount, sha256: boundary.boundarySha256 },
  };
}

export function buildS01ReviewBundleReceipt({ repoRoot = DEFAULT_REPO, candidateRoot = DEFAULT_CANDIDATE, migration = null } = {}) {
  const content = verifyS01ContentReceipt({ repoRoot, candidateRoot });
  const boundary = collectS01NoDriftBoundary({ repoRoot });
  const candidateName = path.basename(path.resolve(candidateRoot));
  const stableSuccessor = candidateName === path.basename(READER2_SUCCESSOR)
    ? {
        predecessorPath: SUCCESSOR_HISTORICAL_V2,
        reason: "v2 included a mutable ledger assertion; v3 binds immutable content and stable verifier code only",
        frozenToolchain: READER2_FROZEN_TOOLCHAIN,
      }
    : candidateName === COMBINED_SUCCESSOR_NAME
      ? {
          predecessorPath: READER2_STABLE_V3,
          reason: "successor repairs independently confirmed S01 content findings while preserving the prior immutable receipt head",
          frozenToolchain: COMBINED_FROZEN_TOOLCHAIN,
        }
      : candidateName === I13_SUCCESSOR_NAME
        ? {
            predecessorPath: COMBINED_STABLE_V3,
            reason: "successor removes the independently confirmed unsupported i13 scene claim while preserving the prior immutable receipt head",
            frozenToolchain: null,
          }
      : null;
  if (stableSuccessor) {
    const predecessor = hash(repoRoot, stableSuccessor.predecessorPath);
    const stableToolchain = stableSuccessor.frozenToolchain
      ? stableSuccessor.frozenToolchain.map((entry) => ({ ...entry }))
      : SUCCESSOR_STABLE_TOOLCHAIN.map((entry) => hash(repoRoot, entry));
    const sourceEvidence = SOURCE_EVIDENCE.map((entry) => hash(repoRoot, entry));
    return {
      schemaVersion: "learning_v2_s01_review_content_bundle_receipt_v3",
      courseSessionId: "en:lesson-01:session-01",
      releaseAuthority: false,
      appendOnly: true,
      receiptChain: {
        kind: "stable_content_bundle_successor",
        supersedes: {
          path: stableSuccessor.predecessorPath,
          sha256: predecessor.sha256,
          reason: stableSuccessor.reason,
        },
      },
      contentReceipt: {
        path: `${relative(repoRoot, candidateRoot)}/${CONTENT_RECEIPT}`,
        sha256: sha256(fs.readFileSync(path.join(candidateRoot, CONTENT_RECEIPT))),
        inventorySha256: content.inventorySha256,
        fileCount: content.fileCount,
      },
      candidateBundle: candidateBundle(repoRoot, candidateRoot),
      protectedNoDriftBoundary: { fileCount: boundary.fileCount, sha256: boundary.boundarySha256 },
      toolchain: stableToolchain,
      sourceEvidence,
      files: [
        ...content.files.map(({ path: file, bytes, sha256: digest }) => ({ path: file, bytes, sha256: digest })),
        ...stableToolchain,
        ...sourceEvidence,
      ],
    };
  }
  const verifiedMigration = migration ?? buildS01V2ToV3MigrationReceipt({ repoRoot, candidateRoot });
  return {
    schemaVersion: "learning_v2_s01_review_bundle_receipt_v1",
    courseSessionId: "en:lesson-01:session-01",
    releaseAuthority: false,
    appendOnly: true,
    contentReceipt: {
      path: `${relative(repoRoot, candidateRoot)}/${CONTENT_RECEIPT}`,
      sha256: sha256(fs.readFileSync(path.join(candidateRoot, CONTENT_RECEIPT))),
      inventorySha256: content.inventorySha256,
      fileCount: content.fileCount,
    },
    migrationReceipt: verifiedMigration,
    candidateBundle: candidateBundle(repoRoot, candidateRoot),
    protectedNoDriftBoundary: { fileCount: boundary.fileCount, sha256: boundary.boundarySha256 },
    toolchain: TOOLCHAIN.map((entry) => hash(repoRoot, entry)),
    sourceEvidence: SOURCE_EVIDENCE.map((entry) => hash(repoRoot, entry)),
    priorRawReceipts: RAW_RECEIPTS.map((entry) => hash(repoRoot, entry)),
    // The chain must not hash mutable manifest/status files or itself.
    files: [...content.files.map(({ path: file, bytes, sha256: digest }) => ({ path: file, bytes, sha256: digest })), ...TOOLCHAIN.map((entry) => hash(repoRoot, entry))],
  };
}

export function verifyS01ReviewContentBundleReceipt({ repoRoot = DEFAULT_REPO, candidateRoot = READER2_SUCCESSOR, receiptPath, storedReceipt } = {}) {
  const expected = buildS01ReviewBundleReceipt({ repoRoot, candidateRoot });
  const storedPath = receiptPath ?? path.join(candidateRoot, STABLE_CONTENT_BUNDLE_RECEIPT);
  const stored = storedReceipt ?? JSON.parse(fs.readFileSync(storedPath, "utf8"));
  if (JSON.stringify(stored) !== JSON.stringify(expected)) {
    throw new Error(`review_content_bundle_receipt_mismatch:${relative(repoRoot, storedPath)}`);
  }
  return expected;
}

async function main() {
  const candidateRoot = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_CANDIDATE;
  const successor = [path.basename(READER2_SUCCESSOR), COMBINED_SUCCESSOR_NAME, I13_SUCCESSOR_NAME].includes(path.basename(candidateRoot));
  const migration = successor ? null : buildS01V2ToV3MigrationReceipt({ candidateRoot });
  const bundle = buildS01ReviewBundleReceipt({ candidateRoot, migration });
  if (migration) await writeMockupFile(path.join(candidateRoot, "legacy-v2-to-content-v3-migration.json"), `${JSON.stringify(migration, null, 2)}\n`);
  const output = successor ? STABLE_CONTENT_BUNDLE_RECEIPT : "review-bundle-receipt.json";
  await writeMockupFile(path.join(candidateRoot, output), `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(JSON.stringify({ migration: migration?.v3Content.inventorySha256 ?? null, bundle: bundle.candidateBundle.sha256, releaseAuthority: false }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();
