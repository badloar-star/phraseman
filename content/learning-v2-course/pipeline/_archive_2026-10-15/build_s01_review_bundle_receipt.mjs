#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertS01CanonicalWritableCandidate,
  collectS01NoDriftBoundary,
  createS01ReceiptFile,
  readS01RegularFile,
  S01_WRITABLE_CANDIDATE_NAME,
  verifyS01ContentReceipt,
  withS01ReceiptPublicationLock,
} from "./build_s01_candidate_receipt.mjs";

const PIPELINE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = path.resolve(PIPELINE, "../../..");
const DEFAULT_CANDIDATE = path.join(DEFAULT_REPO, "content/learning-v2-course/outputs/s01-source-projection-fixed-20261013");
const READER2_SUCCESSOR = path.join(DEFAULT_REPO, "content/learning-v2-course/outputs/s01-reader2-fixed-20261013");
const SUCCESSOR_HISTORICAL_V2 = "content/learning-v2-course/outputs/s01-reader2-fixed-20261013/review-bundle-receipt.json";
const COMBINED_SUCCESSOR_NAME = "s01-combined-review-fixed-20261013";
const I13_SUCCESSOR_NAME = "s01-i13-scene-fixed-20261013";
const LOCALE_SUCCESSOR_NAME = "s01-locale-fixed-20261013";
const CORRECT_FEEDBACK_SUCCESSOR_NAME = "s01-correct-feedback-fixed-20261013";
const CURRENT_FINAL_SUCCESSOR_NAME = "s01-feedback-locale-final-fixed-20261013";
const LOCALE_BATCH_SUCCESSOR_NAME = "s01-locale-batch-parity-fixed-20261014";
const FINAL_SUCCESSOR_NAME = S01_WRITABLE_CANDIDATE_NAME;
const READER2_STABLE_V3 = "content/learning-v2-course/outputs/s01-reader2-fixed-20261013/review-content-bundle-receipt.v3.json";
const COMBINED_STABLE_V3 = "content/learning-v2-course/outputs/s01-combined-review-fixed-20261013/review-content-bundle-receipt.v3.json";
const I13_STABLE_V3 = "content/learning-v2-course/outputs/s01-i13-scene-fixed-20261013/review-content-bundle-receipt.v3.json";
const LOCALE_STABLE_V3 = "content/learning-v2-course/outputs/s01-locale-fixed-20261013/review-content-bundle-receipt.v3.json";
const LOCALE_STABLE_V3_SHA256 = "a72a8611c2cd38ee17c529cdd37c6998fef7ef1241129b72258d521836cccc14";
const CORRECT_FEEDBACK_STABLE_V3 = "content/learning-v2-course/outputs/s01-correct-feedback-fixed-20261013/review-content-bundle-receipt.v3.json";
const CORRECT_FEEDBACK_STABLE_V3_SHA256 = "5a4c2bb59f531c34e205b00ac5840e7650534b3e828ed9ac568ce2263bab6909";
const CURRENT_FINAL_STABLE_V3 = "content/learning-v2-course/outputs/s01-feedback-locale-final-fixed-20261013/review-content-bundle-receipt.v3.json";
const CURRENT_FINAL_STABLE_V3_SHA256 = "0e093e65d0d1c90b0a7dd8202b1fe5875b246e10ac48f9e128ed389739a249c4";
const LOCALE_BATCH_STABLE_V3 = "content/learning-v2-course/outputs/s01-locale-batch-parity-fixed-20261014/review-content-bundle-receipt.v3.json";
const LOCALE_BATCH_STABLE_V3_SHA256 = "fab4d25424ba630d1250dd6b1724bee397cc94d9c099aaccc54cbeccf8549a86";
const NATURALNESS_STABLE_V3 = "content/learning-v2-course/outputs/s01-feedback-naturalness-fixed-20261014/review-content-bundle-receipt.v3.json";
const NATURALNESS_STABLE_V3_SHA256 = "6201b585f1ed65d7431bf18eb8da40289e29155c79b009eb3a0f0fbfbce9e01c";
export const S01_REVIEW_SUCCESSOR_PREDECESSOR = Object.freeze({
  candidateName: FINAL_SUCCESSOR_NAME,
  path: NATURALNESS_STABLE_V3,
  sha256: NATURALNESS_STABLE_V3_SHA256,
});
const LEGACY_RECEIPT = "hash-receipt.json";
const CONTENT_RECEIPT = "content-receipt.json";
const NO_DRIFT_BASELINE = "no-drift-baseline.json";
const STABLE_CONTENT_BUNDLE_RECEIPT = "review-content-bundle-receipt.v3.json";
const USAGE = `Usage: node build_s01_review_bundle_receipt.mjs [--candidate <registered-candidate-directory>]
       node build_s01_review_bundle_receipt.mjs --help`;
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
  const bytes = readS01RegularFile({ repoRoot, relativePath });
  return { path: relativePath, bytes: bytes.length, sha256: sha256(bytes) };
};

function assertPinnedPredecessor(repoRoot, predecessorPath, expectedSha256) {
  const predecessor = hash(repoRoot, predecessorPath);
  if (predecessor.sha256 !== expectedSha256) {
    throw new Error(`predecessor_receipt_sha256_mismatch:${predecessorPath}:${expectedSha256}:${predecessor.sha256}`);
  }
  return predecessor;
}

function candidateBundle(repoRoot, candidateRoot) {
  const prefix = relative(repoRoot, candidateRoot);
  const files = BUNDLE_FILES.map((entry) => {
    const hashed = hash(repoRoot, `${prefix}/${entry}`);
    return { ...hashed, path: entry };
  });
  return { files, sha256: sha256(JSON.stringify(files.map(({ path: file, bytes, sha256: digest }) => ({ path: file, bytes, sha256: digest })))) };
}

function verifyCurrentNoDriftBaseline(repoRoot, candidateRoot, currentBoundary) {
  const baselinePath = path.join(candidateRoot, NO_DRIFT_BASELINE);
  if (!fs.existsSync(baselinePath)) throw new Error(`no_drift_baseline_missing:${relative(repoRoot, baselinePath)}`);
  const baseline = JSON.parse(readS01RegularFile({ repoRoot, absolutePath: baselinePath }).toString("utf8"));
  if (baseline.boundarySha256 !== currentBoundary.boundarySha256 || JSON.stringify(baseline.files) !== JSON.stringify(currentBoundary.files)) {
    throw new Error(`no_drift_boundary_changed:${baseline.boundarySha256}:${currentBoundary.boundarySha256}`);
  }
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
      : candidateName === LOCALE_SUCCESSOR_NAME
        ? {
            predecessorPath: I13_STABLE_V3,
            reason: "successor repairs independently confirmed S01 locale findings while preserving the exact prior immutable receipt head",
            frozenToolchain: null,
            requireCurrentNoDriftBaseline: true,
          }
      : candidateName === CORRECT_FEEDBACK_SUCCESSOR_NAME
        ? {
            predecessorPath: LOCALE_STABLE_V3,
            expectedPredecessorSha256: LOCALE_STABLE_V3_SHA256,
            reason: "successor repairs independently confirmed S01 feedback findings while preserving the exact prior immutable receipt head",
            frozenToolchain: null,
            requireCurrentNoDriftBaseline: true,
          }
      : candidateName === CURRENT_FINAL_SUCCESSOR_NAME
        ? {
            predecessorPath: CORRECT_FEEDBACK_STABLE_V3,
            expectedPredecessorSha256: CORRECT_FEEDBACK_STABLE_V3_SHA256,
            reason: "successor repairs independently confirmed S01 feedback and locale findings while preserving the exact prior immutable receipt head",
            frozenToolchain: null,
            requireCurrentNoDriftBaseline: true,
          }
      : candidateName === LOCALE_BATCH_SUCCESSOR_NAME
        ? {
            predecessorPath: CURRENT_FINAL_STABLE_V3,
            expectedPredecessorSha256: CURRENT_FINAL_STABLE_V3_SHA256,
            reason: "successor restores S01 locale-batch parity while preserving the exact current immutable receipt head",
            frozenToolchain: null,
            requireCurrentNoDriftBaseline: true,
          }
      : candidateName === FINAL_SUCCESSOR_NAME
        ? {
            predecessorPath: S01_REVIEW_SUCCESSOR_PREDECESSOR.path,
            expectedPredecessorSha256: S01_REVIEW_SUCCESSOR_PREDECESSOR.sha256,
            reason: "successor materializes the concise-feedback S01 source revision while preserving the exact prior immutable receipt head",
            frozenToolchain: null,
            requireCurrentNoDriftBaseline: true,
          }
      : null;
  if (stableSuccessor) {
    if (stableSuccessor.requireCurrentNoDriftBaseline) verifyCurrentNoDriftBaseline(repoRoot, candidateRoot, boundary);
    const predecessor = stableSuccessor.expectedPredecessorSha256
      ? assertPinnedPredecessor(repoRoot, stableSuccessor.predecessorPath, stableSuccessor.expectedPredecessorSha256)
      : hash(repoRoot, stableSuccessor.predecessorPath);
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
        sha256: sha256(readS01RegularFile({ repoRoot, absolutePath: path.join(candidateRoot, CONTENT_RECEIPT) })),
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
      sha256: sha256(readS01RegularFile({ repoRoot, absolutePath: path.join(candidateRoot, CONTENT_RECEIPT) })),
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

function parseCliArgs(args) {
  const options = { candidate: null, help: false };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--help") {
      if (seen.has(argument)) throw new Error(`duplicate argument: ${argument}`);
      seen.add(argument);
      options.help = true;
      continue;
    }
    if (argument === "--candidate") {
      if (seen.has(argument) || seen.has("positional-candidate")) throw new Error(`duplicate argument: ${argument}`);
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`missing value for ${argument}`);
      seen.add(argument);
      options.candidate = value;
      index++;
      continue;
    }
    if (argument.startsWith("--")) throw new Error(`unknown argument: ${argument}`);
    if (options.candidate !== null) throw new Error(`unexpected positional argument: ${argument}`);
    seen.add("positional-candidate");
    options.candidate = argument;
  }
  return options;
}

export function publishS01ReviewBundleReceipt({ repoRoot = DEFAULT_REPO, candidateRoot, beforeInputRead } = {}) {
  const canonicalCandidate = assertS01CanonicalWritableCandidate({ repoRoot, candidateRoot });
  return withS01ReceiptPublicationLock({ repoRoot, candidateRoot: canonicalCandidate }, (publicationLock) => {
    if (beforeInputRead !== undefined) {
      if (typeof beforeInputRead !== "function") throw new Error("receipt_before_input_read_callback_invalid");
      beforeInputRead();
    }
    const bundle = buildS01ReviewBundleReceipt({ repoRoot, candidateRoot: canonicalCandidate });
    const output = createS01ReceiptFile({
      repoRoot,
      candidateRoot: canonicalCandidate,
      receiptName: STABLE_CONTENT_BUNDLE_RECEIPT,
      contents: `${JSON.stringify(bundle, null, 2)}\n`,
      beforePublish: () => assertPinnedPredecessor(
        repoRoot,
        S01_REVIEW_SUCCESSOR_PREDECESSOR.path,
        S01_REVIEW_SUCCESSOR_PREDECESSOR.sha256,
      ),
      publicationLock,
    });
    return { bundle, output };
  });
}

async function main(args = process.argv.slice(2)) {
  let cli;
  try {
    cli = parseCliArgs(args);
  } catch (error) {
    console.error(`[S01_REVIEW_RECEIPT][ERROR] ${error.message}`);
    console.error(USAGE);
    return 2;
  }
  if (cli.help) {
    console.log(USAGE);
    return 0;
  }
  const candidateRoot = cli.candidate
    ? path.resolve(cli.candidate)
    : path.join(DEFAULT_REPO, "content/learning-v2-course/outputs", S01_WRITABLE_CANDIDATE_NAME);
  const result = publishS01ReviewBundleReceipt({ candidateRoot });
  console.log(JSON.stringify({ migration: null, bundle: result.bundle.candidateBundle.sha256, releaseAuthority: false }));
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();
