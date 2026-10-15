import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  PROJECTION_RECEIPT_FILE,
  REQUIRED_PROJECTION_FILES,
  REQUIRED_SOURCE_FILES,
  buildReviewedProjectionReceipt,
  reviewedProjectionFreshness,
} from "./reviewed_projection_freshness.mjs";
import { reviewedCardEligible } from "./reviewed_card_evidence.mjs";

const SESSION_KEY = "en/l01/s01";

function fixture() {
  const courseRoot = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-reviewed-projection-"));
  const sessionRoot = path.join(courseRoot, "sessions", ...SESSION_KEY.split("/"));
  const reviewedDir = path.join(courseRoot, "mockup", "reviewed-source", ...SESSION_KEY.split("/"));
  fs.mkdirSync(sessionRoot, { recursive: true });
  fs.mkdirSync(reviewedDir, { recursive: true });
  for (const file of REQUIRED_SOURCE_FILES) fs.writeFileSync(path.join(sessionRoot, file), `source:${file}\n`, "utf8");
  for (const file of REQUIRED_PROJECTION_FILES) fs.writeFileSync(path.join(reviewedDir, file), `projection:${file}\n`, "utf8");
  const receipt = buildReviewedProjectionReceipt({ courseRoot, sessionKey: SESSION_KEY, reviewedDir });
  fs.writeFileSync(path.join(reviewedDir, PROJECTION_RECEIPT_FILE), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  return { courseRoot, sessionRoot, reviewedDir };
}

test("a reviewed projection is fresh only when its receipt binds every current source and projection byte", () => {
  const { courseRoot, reviewedDir } = fixture();
  assert.deepEqual(reviewedProjectionFreshness({ courseRoot, sessionKey: SESSION_KEY, reviewedDir }), {
    available: true,
    fresh: true,
    reason: null,
  });
});

for (const file of REQUIRED_SOURCE_FILES) {
  test(`changing current source ${file} makes the reviewed projection stale`, () => {
    const { courseRoot, sessionRoot, reviewedDir } = fixture();
    fs.appendFileSync(path.join(sessionRoot, file), "changed\n", "utf8");
    const result = reviewedProjectionFreshness({ courseRoot, sessionKey: SESSION_KEY, reviewedDir });
    assert.equal(result.fresh, false);
    assert.equal(result.reason, `source_hash_mismatch:${file}`);
  });
}

for (const file of REQUIRED_PROJECTION_FILES) {
  test(`changing projected ${file} invalidates its receipt`, () => {
    const { courseRoot, reviewedDir } = fixture();
    fs.appendFileSync(path.join(reviewedDir, file), "changed\n", "utf8");
    const result = reviewedProjectionFreshness({ courseRoot, sessionKey: SESSION_KEY, reviewedDir });
    assert.equal(result.fresh, false);
    assert.equal(result.reason, `projection_hash_mismatch:${file}`);
  });

  test(`missing projected ${file} cannot be green`, () => {
    const { courseRoot, reviewedDir } = fixture();
    fs.unlinkSync(path.join(reviewedDir, file));
    const result = reviewedProjectionFreshness({ courseRoot, sessionKey: SESSION_KEY, reviewedDir });
    assert.equal(result.fresh, false);
    assert.equal(result.reason, `projection_missing:${file}`);
  });
}

test("a reviewed projection without an immutable binding receipt cannot be green", () => {
  const { courseRoot, reviewedDir } = fixture();
  fs.unlinkSync(path.join(reviewedDir, PROJECTION_RECEIPT_FILE));
  assert.deepEqual(reviewedProjectionFreshness({ courseRoot, sessionKey: SESSION_KEY, reviewedDir }), {
    available: true,
    fresh: false,
    reason: "receipt_missing",
  });
});

test("green eligibility requires fresh projection, ready session, zero quality errors, and zero release mismatch", () => {
  const baseline = {
    candidate: false,
    viewSource: "reviewed_source",
    projectionFresh: true,
    readiness: { ready: true },
    sourceQualityFindings: [],
    sourceReleaseFindings: [],
  };
  assert.equal(reviewedCardEligible(baseline), true);
  assert.equal(reviewedCardEligible({ ...baseline, projectionFresh: false }), false);
  assert.equal(reviewedCardEligible({ ...baseline, readiness: { ready: false } }), false);
  assert.equal(reviewedCardEligible({ ...baseline, sourceQualityFindings: [{ reason: "bad" }] }), false);
  assert.equal(reviewedCardEligible({ ...baseline, sourceReleaseFindings: ["mismatch"] }), false);
  assert.equal(reviewedCardEligible({ ...baseline, candidate: true }), false);
  assert.equal(reviewedCardEligible({ ...baseline, viewSource: "release" }), false);
});
