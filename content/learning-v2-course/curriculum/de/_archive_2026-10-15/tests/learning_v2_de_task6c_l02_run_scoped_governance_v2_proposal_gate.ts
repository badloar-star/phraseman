import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..");
const PROPOSAL_DIR = path.join(
  REPO_ROOT,
  "docs",
  "v2",
  "curriculum",
  "de",
  "task6c-l02-run-scoped-governance-v2",
);
const README_PATH = path.join(PROPOSAL_DIR, "README.md");
const GATE_PATH = path.join(
  REPO_ROOT,
  "tests",
  "learning_v2_de_task6c_l02_run_scoped_governance_v2_proposal_gate.ts",
);

const proposalFiles = readdirSync(PROPOSAL_DIR, { withFileTypes: true });
assert.deepEqual(
  proposalFiles.map((entry) => [entry.name, entry.isFile()]),
  [["README.md", true]],
  "PROPOSAL_DIRECTORY_MUST_CONTAIN_EXACTLY_ONE_MARKDOWN_FILE",
);

const readmeBytes = readFileSync(README_PATH);
const readme = readmeBytes.toString("utf8");
assert.equal(
  Buffer.from(readme, "utf8").equals(readmeBytes),
  true,
  "README_MUST_BE_VALID_UTF8",
);
assert.equal(readme.includes("\r"), false, "README_MUST_USE_LF_ONLY");
assert.equal(readme.endsWith("\n"), true, "README_MUST_END_WITH_LF");

const EXPECTED_README_SHA256 =
  "8aaeeeb45975d73ad9c6a00945adcac5905a356f80992b819529b5b69afa9023";
assert.equal(
  createHash("sha256").update(readmeBytes).digest("hex"),
  EXPECTED_README_SHA256,
  "PROPOSAL_BYTES_CHANGED_WITHOUT_REVIEW",
);

const requiredExactStrings = [
  "**Status:** `PROPOSAL_PENDING_OWNER_ACCEPTANCE`",
  "**Normative status:** `NON_NORMATIVE`",
  "**Execution status:** `INERT`",
  "`ownerAcceptanceRecorded: false`",
  "`activationAuthorized: false`",
  "`canonicalAdmission: FORBIDDEN`",
  "`rowsPromoted: 0`",
  "`task7Unlock: false`",
  "`learnerFacing: false`",
  "`releaseAuthorized: false`",
  "The remote `master` branch is currently unprotected.",
  "is currently absent.",
  "`REMOTE_GOVERNANCE_ADMIN_BYPASS_UNVERIFIABLE`",
  "This proposal does not prove that administrator bypass is impossible.",
  "`prevent_self_review: true`",
  "`capture-and-attest-v3`",
  "exactly one applicable approval",
  "same identified non-owner user",
  "mandatory. A non-owner must dispatch it; the exact",
  "A successful sacrificial observation is evidence for API",
  "semantics only; it is not governance acceptance or release authority.",
  "`sha256:{lowercase_hex}`",
  "`learning-v2-de-task6c-l02-capture-v3-run-{run_id}-attempt-{run_attempt}-{head_sha}`",
  "`learning-v2-de-task6c-l02-capture-v3.tar`",
  "`learning-v2-de-task6c-l02-capture-v3.predicate.json`",
  "`HOLD_CAPTURE_ONLY`",
] as const;

const normalizedProse = readme.replace(/\s+/gu, " ");
for (const value of requiredExactStrings) {
  assert.equal(
    normalizedProse.split(value).length - 1,
    1,
    `REQUIRED_EXACT_PROPOSAL_TEXT_MISSING_OR_DUPLICATED:${value}`,
  );
}

const fixedGetPaths = [
  "/repos/badloar-star/phraseman",
  "/repos/badloar-star/phraseman/branches/master",
  "/repos/badloar-star/phraseman/branches/master/protection",
  "/repos/badloar-star/phraseman/rulesets?includes_parents=true&per_page=100",
  "/repos/badloar-star/phraseman/rulesets/{derived_ruleset_id}?includes_parents=true",
  "/repos/badloar-star/phraseman/environments/learning-v2-de-l02-capture-attestation",
  "/repos/badloar-star/phraseman/environments/learning-v2-de-l02-capture-attestation/deployment-branch-policies?per_page=100",
  "/repos/badloar-star/phraseman/actions/workflows/learning-v2-de-l02-capture-attestation.yml",
  "/repos/badloar-star/phraseman/contents/.github/workflows/learning-v2-de-l02-capture-attestation.yml?ref={derived_head_sha}",
  "/repos/badloar-star/phraseman/actions/runs/{run_id}",
  "/repos/badloar-star/phraseman/actions/runs/{run_id}/jobs?filter=all&per_page=100",
  "/repos/badloar-star/phraseman/actions/runs/{run_id}/approvals",
  "/repos/badloar-star/phraseman/actions/runs/{run_id}/artifacts?per_page=100",
  "/repos/badloar-star/phraseman/actions/artifacts/{derived_artifact_id}/zip",
  "/repos/badloar-star/phraseman/attestations/{derived_subject_digest}",
] as const;

const endpointRows = readme
  .split("\n")
  .filter((line) => /^\|\s*\d+\s*\|\s*GET\s*\|/u.test(line));
assert.deepEqual(
  endpointRows.map((line) => {
    const match = line.match(/`([^`]+)`/u);
    assert(match, `FIXED_GET_ROW_HAS_NO_PATH:${line}`);
    return match[1];
  }),
  [...fixedGetPaths],
  "FIXED_GET_ROSTER_MISMATCH",
);

const forbiddenAuthorityClaims = [
  /\bADMIN_BYPASS_(?:PROVEN|VERIFIED)\b/u,
  /\badmin(?:istrator)?[- ]bypass\s+(?:is\s+)?(?:proven|verified)\b/iu,
  /\bproves?\s+(?:that\s+)?administrator bypass is impossible\b/iu,
  /\b(?:Status|Authority):\s*`?(?:PASS|ACCEPTED|APPROVED|ACTIVE|RELEASED)\b/iu,
  /\bownerAcceptanceRecorded:\s*true\b/u,
  /\bactivationAuthorized:\s*true\b/u,
  /\bcanonicalAdmission:\s*(?!FORBIDDEN\b)[A-Z_]+\b/u,
  /\btask7Unlock:\s*true\b/u,
  /\blearnerFacing:\s*true\b/u,
  /\breleaseAuthorized:\s*true\b/u,
] as const;

const authorityClaimScan = normalizedProse.replace(
  "This proposal does not prove that administrator bypass is impossible.",
  "",
);
for (const claim of forbiddenAuthorityClaims) {
  assert.doesNotMatch(
    authorityClaimScan,
    claim,
    `FORBIDDEN_AUTHORITY_CLAIM:${claim}`,
  );
}

assert.doesNotMatch(readme, /```/u, "EXECUTABLE_CODE_BLOCK_FORBIDDEN");
assert.doesNotMatch(
  readme,
  /\b(?:gh\s+api|curl|wget|Invoke-WebRequest|Invoke-RestMethod)\b/iu,
  "EXECUTABLE_NETWORK_COMMAND_FORBIDDEN",
);
assert.doesNotMatch(
  readme,
  /\b(?:workflow_dispatch|repository_dispatch)\s*\(/u,
  "EXECUTABLE_WORKFLOW_CALL_FORBIDDEN",
);

const gateSource = readFileSync(GATE_PATH, "utf8");
const actualImports = gateSource.match(/^import .*;$/gmu) ?? [];
assert.deepEqual(actualImports, [
  'import assert from "node:assert/strict";',
  'import { createHash } from "node:crypto";',
  'import { readFileSync, readdirSync } from "node:fs";',
  'import path from "node:path";',
]);

process.stdout.write(
  "LEARNING V2 GERMAN L02 RUN-SCOPED GOVERNANCE V2 PROPOSAL STATIC GATE: PASS " +
    "(proposal=inert; authority=none; activation=none)\n",
);
