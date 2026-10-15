#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateSessionCandidateProjection,
  verifyAcceptedPreviousPredecessor,
  verifyFrozenAcceptedPredecessor,
  verifyFrozenRevisionPredecessor,
  verifyImmutablePrivateHead,
} from "./build_session_candidate_receipt.mjs";
import { rebuildAndVerifyV2Projection, runFrozenV2SemanticGate } from "./session_candidate_projection_parity.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = path.resolve(HERE, "../../..");
const SCHEMA = "learning_v2_session_candidate_content_receipt_v2";
const FINGERPRINT = "d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da";
const PACKET_SHA256 = "6686bac631ede28475f122b1992d6ac265aabf02ca26cc376ce9ba23fc4639c1";
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function readReceipt(repoRoot, relativePath) {
  if (typeof relativePath !== "string" || !relativePath || relativePath.includes("\\")) throw new Error("candidate_receipt_path_invalid");
  const lexical = path.resolve(repoRoot, ...relativePath.split("/"));
  const lexicalRelative = path.relative(path.resolve(repoRoot), lexical);
  if (!lexicalRelative || lexicalRelative === ".." || lexicalRelative.startsWith(`..${path.sep}`) || path.isAbsolute(lexicalRelative)) {
    throw new Error("candidate_receipt_path_outside_repo");
  }
  const realRepo = fs.realpathSync(path.resolve(repoRoot));
  const realReceipt = fs.realpathSync(lexical);
  const realRelative = path.relative(realRepo, realReceipt);
  if (!realRelative || realRelative === ".." || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
    throw new Error("candidate_receipt_path_outside_repo");
  }
  const bytes = fs.readFileSync(realReceipt);
  const receipt = JSON.parse(bytes.toString("utf8"));
  if (receipt.schemaVersion !== SCHEMA || receipt.courseSessionId !== "en:lesson-01:session-02"
    || receipt.releaseAuthority !== false || receipt.immutableContentOnly !== true
    || relativePath !== `${receipt.candidateRoot}/content-receipt.json`) {
    throw new Error("candidate_receipt_v2_invalid");
  }
  return { receipt, receiptSha256: sha256(bytes) };
}

function verifyProjection(repoRoot, receipt) {
  const authority = receipt.blueprintAuthority;
  if (authority?.blueprintFingerprint !== FINGERPRINT || authority?.sessionPacketSha256 !== PACKET_SHA256
    || authority?.introPlanItemCount !== 3 || authority?.activityPlanItemCount !== 17) {
    throw new Error("candidate_receipt_v2_authority_invalid");
  }
  const expected = ["answers.json", "auxiliary.json", "intro.json", "learner.json", "learner.uk.json"]
    .map((name) => `${receipt.candidateRoot}/en/l01/s02/${name}`).sort();
  const actual = receipt.files?.filter((entry) => entry.category === "candidate").map((entry) => entry.path).sort();
  if (!sameJson(actual, expected)) throw new Error("candidate_receipt_v2_projection_invalid");
  validateSessionCandidateProjection({
    candidateRoot: path.resolve(repoRoot, ...receipt.candidateRoot.split("/")),
    session: "en/l01/s02",
    courseSessionId: receipt.courseSessionId,
    blueprintAuthority: authority,
  });
  rebuildAndVerifyV2Projection({
    repoRoot,
    candidateRoot: receipt.candidateRoot,
    sourceSnapshotIndexPath: receipt.sourceSnapshot?.indexPath,
    sourceSnapshotIndexSha256: receipt.sourceSnapshot?.indexSha256,
  });
}

async function verifyHistory(repoRoot, candidateReceiptPath, receipt, receiptSha256) {
  if (!receipt.frozenPredecessor || !receipt.acceptedPredecessor || !receipt.frozenRevisionPredecessor) {
    throw new Error("candidate_receipt_v2_history_invalid");
  }
  const frozenPredecessor = verifyFrozenAcceptedPredecessor({
    repoRoot,
    receiptPath: receipt.frozenPredecessor.receiptPath,
    currentSession: "en/l01/s02",
  });
  const acceptedPredecessor = await verifyAcceptedPreviousPredecessor({
    repoRoot,
    acceptanceReceiptPath: receipt.acceptedPredecessor.acceptanceReceiptPath,
    frozenPredecessor,
    currentSession: "en/l01/s02",
  });
  const frozenRevisionPredecessor = verifyFrozenRevisionPredecessor({
    repoRoot,
    receiptPath: receipt.frozenRevisionPredecessor.receiptPath,
    expectedCourseSessionId: receipt.courseSessionId,
  });
  if (!sameJson(receipt.frozenPredecessor, frozenPredecessor)
    || !sameJson(receipt.acceptedPredecessor, acceptedPredecessor)
    || !sameJson(receipt.frozenRevisionPredecessor, frozenRevisionPredecessor)) {
    throw new Error("candidate_receipt_v2_history_invalid");
  }
  verifyImmutablePrivateHead({ repoRoot, receipt, candidateReceiptSha256: receiptSha256 });
}

export async function verifySessionCandidateReceiptV2({ repoRoot = DEFAULT_REPO, candidateReceiptPath, check }) {
  const { receipt, receiptSha256 } = readReceipt(repoRoot, candidateReceiptPath);
  if (["blueprint_authority", "s02_exact_packet", "feedback_locale_parity", "actor_clarity"].includes(check)) {
    await runFrozenV2SemanticGate({
      repoRoot,
      candidateRoot: receipt.candidateRoot,
      sourceSnapshotIndexPath: receipt.sourceSnapshot?.indexPath,
      sourceSnapshotIndexSha256: receipt.sourceSnapshot?.indexSha256,
      check,
    });
  } else if (check === "candidate_build_source_projection") verifyProjection(repoRoot, receipt);
  else if (check === "receipt_history") await verifyHistory(repoRoot, candidateReceiptPath, receipt, receiptSha256);
  else throw new Error(`candidate_receipt_v2_check_invalid:${check}`);
  return Object.freeze({ status: "PASS", check });
}

function parseCli(args) {
  const value = (name) => {
    const index = args.indexOf(name);
    return index === -1 ? null : args[index + 1];
  };
  return { candidateReceiptPath: value("--candidate-receipt"), check: value("--check") };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await verifySessionCandidateReceiptV2(parseCli(process.argv.slice(2)));
    process.stdout.write(`SESSION CANDIDATE V2 ${result.check}: PASS\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
