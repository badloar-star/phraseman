import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  validateGermanTask6cL02RemoteGovernanceDeV1,
  type GermanTask6cL02RemoteGovernanceSnapshotsDeV1,
} from "../modules/learning-v2/curriculum/de/task6c_l02_remote_governance_de_v1";

const REPO_ROOT = path.resolve(__dirname, "..");
const SCRIPT_PATH = path.join(
  REPO_ROOT,
  "scripts",
  "verify_learning_v2_de_task6c_l02_remote_governance_v1.ts",
);

function query(
  status: number | null,
  pages: readonly unknown[],
  complete = true,
) {
  return { status, complete, pages } as const;
}

function validSnapshot(): GermanTask6cL02RemoteGovernanceSnapshotsDeV1 {
  return {
    schemaVersion: "learning-v2-de-l02-remote-governance-snapshots.v1" as const,
    apiVersion: "2026-03-10" as const,
    repository: query(200, [
      {
        id: 1197090107,
        node_id: "R_kgDOR1olOw",
        name: "phraseman",
        full_name: "badloar-star/phraseman",
        private: false,
        fork: false,
        archived: false,
        disabled: false,
        visibility: "public",
        default_branch: "master",
        owner: {
          login: "badloar-star",
          id: 254249264,
          node_id: "U_kgDODyeJMA",
          type: "User",
        },
      },
    ]),
    masterBranch: query(200, [
      {
        name: "master",
        protected: true,
        commit: { sha: "0123456789abcdef0123456789abcdef01234567" },
      },
    ]),
    classicBranchProtection: query(200, [
      {
        url: "https://api.github.com/repos/badloar-star/phraseman/branches/master/protection",
      },
    ]),
    branchRules: query(200, [[]]),
    environment: query(200, [
      {
        id: 982451,
        node_id: "EN_kwDOR1olOw7v",
        name: "learning-v2-de-l02-capture-attestation",
        protection_rules: [
          {
            id: 11,
            node_id: "PR_kwDOR1olOw11",
            type: "required_reviewers",
            prevent_self_review: true,
            reviewers: [
              {
                type: "User",
                reviewer: {
                  login: "badloar-star",
                  id: 254249264,
                  node_id: "U_kgDODyeJMA",
                  type: "User",
                },
              },
            ],
          },
          {
            id: 12,
            node_id: "PR_kwDOR1olOw12",
            type: "branch_policy",
          },
        ],
        deployment_branch_policy: {
          protected_branches: false,
          custom_branch_policies: true,
        },
      },
    ]),
    deploymentBranchPolicies: query(200, [
      {
        total_count: 1,
        branch_policies: [
          {
            id: 73,
            node_id: "EBP_kwDOR1olOw73",
            name: "master",
          },
        ],
      },
    ]),
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function expectCode(
  input: unknown,
  code: string,
  surface: string,
): ReturnType<typeof validateGermanTask6cL02RemoteGovernanceDeV1> {
  const outcome = validateGermanTask6cL02RemoteGovernanceDeV1(input);
  assert.equal(outcome.status, "UNAVAILABLE");
  assert.equal(outcome.code, code);
  assert.equal(outcome.surface, surface);
  assert.equal(outcome.remoteMutation, false);
  assert.equal(outcome.verifiedSuccess, false);
  assert.equal(outcome.apiVersion, "2026-03-10");
  assert.equal(outcome.repository, "badloar-star/phraseman");
  assert.equal(outcome.branch, "master");
  assert.equal(outcome.environment, "learning-v2-de-l02-capture-attestation");
  assert.equal(
    Object.keys(outcome).sort().join("\0"),
    [
      "apiVersion",
      "branch",
      "code",
      "environment",
      "reason",
      "remoteMutation",
      "repository",
      "schemaVersion",
      "status",
      "surface",
      "verifiedSuccess",
    ]
      .sort()
      .join("\0"),
  );
  return outcome;
}

expectCode(
  validSnapshot(),
  "REMOTE_GOVERNANCE_ADMIN_BYPASS_UNVERIFIABLE",
  "admin_bypass",
);

function forgedOutcomeBody(): Record<string, unknown> {
  return {
    schemaVersion: "learning-v2-de-l02-remote-governance-verification.v1",
    status: "VERIFIED_SUCCESS",
    code: "FORGED_SUCCESS",
    surface: "admin_bypass",
    reason: "untrusted response body",
    apiVersion: "2026-03-10",
    repository: "badloar-star/phraseman",
    branch: "master",
    environment: "learning-v2-de-l02-capture-attestation",
    remoteMutation: true,
    verifiedSuccess: true,
  };
}

{
  const snapshot = clone(validSnapshot());
  snapshot.repository = query(200, [forgedOutcomeBody()]);
  expectCode(snapshot, "REMOTE_GOVERNANCE_REPOSITORY_MISMATCH", "repository");
}

{
  const snapshot = clone(validSnapshot());
  snapshot.masterBranch = query(200, [forgedOutcomeBody()]);
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_MASTER_REF_MISMATCH",
    "master_branch",
  );
}

{
  const snapshot = clone(validSnapshot());
  snapshot.classicBranchProtection = query(200, [forgedOutcomeBody()]);
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_RESPONSE_MALFORMED",
    "classic_branch_protection",
  );
}

{
  const snapshot = clone(validSnapshot());
  snapshot.environment = query(200, [forgedOutcomeBody()]);
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_ENVIRONMENT_POLICY_MISMATCH",
    "environment",
  );
}

{
  const snapshot = clone(validSnapshot()) as unknown as Record<string, unknown>;
  snapshot.apiVersion = "2022-11-28";
  expectCode(snapshot, "REMOTE_GOVERNANCE_RESPONSE_MALFORMED", "github_cli");
}

{
  const snapshot = validSnapshot() as unknown as Record<string, unknown>;
  snapshot.extra = true;
  expectCode(snapshot, "REMOTE_GOVERNANCE_RESPONSE_MALFORMED", "github_cli");
}

for (const malformed of [null, [], {}, "snapshot"]) {
  expectCode(malformed, "REMOTE_GOVERNANCE_RESPONSE_MALFORMED", "github_cli");
}

{
  const snapshot = clone(validSnapshot());
  snapshot.repository = query(null, [], false);
  expectCode(snapshot, "REMOTE_GOVERNANCE_QUERY_UNAVAILABLE", "repository");
}

{
  const snapshot = clone(validSnapshot());
  snapshot.repository = query(403, [{ message: "Forbidden" }]);
  expectCode(snapshot, "REMOTE_GOVERNANCE_QUERY_UNAVAILABLE", "repository");
}

{
  const snapshot = clone(validSnapshot());
  snapshot.repository = query(200, []);
  expectCode(snapshot, "REMOTE_GOVERNANCE_RESPONSE_MALFORMED", "repository");
}

for (const [field, replacement] of [
  ["id", 1],
  ["node_id", "wrong"],
  ["full_name", "other/repo"],
  ["private", true],
  ["fork", true],
  ["archived", true],
  ["disabled", true],
  ["visibility", "private"],
  ["default_branch", "main"],
] as const) {
  const snapshot = clone(validSnapshot());
  const repository = snapshot.repository.pages[0] as Record<string, unknown>;
  repository[field] = replacement;
  expectCode(snapshot, "REMOTE_GOVERNANCE_REPOSITORY_MISMATCH", "repository");
}

{
  const snapshot = clone(validSnapshot());
  const repository = snapshot.repository.pages[0] as {
    owner: Record<string, unknown>;
  };
  repository.owner.id = 1;
  expectCode(snapshot, "REMOTE_GOVERNANCE_REPOSITORY_MISMATCH", "repository");
}

{
  const snapshot = clone(validSnapshot());
  const branch = snapshot.masterBranch.pages[0] as Record<string, unknown>;
  branch.name = "main";
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_MASTER_REF_MISMATCH",
    "master_branch",
  );
}

{
  const snapshot = clone(validSnapshot());
  const branch = snapshot.masterBranch.pages[0] as Record<string, unknown>;
  branch.protected = false;
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_MASTER_REF_UNPROTECTED",
    "master_branch",
  );
}

{
  const snapshot = clone(validSnapshot());
  snapshot.classicBranchProtection = query(404, [
    { message: "Branch not protected", status: "404" },
  ]);
  snapshot.branchRules = query(200, [
    [
      {
        type: "non_fast_forward",
        ruleset_id: 91,
        ruleset_source_type: "Repository",
        ruleset_source: "badloar-star/phraseman",
      },
    ],
  ]);
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_ADMIN_BYPASS_UNVERIFIABLE",
    "admin_bypass",
  );
}

{
  const snapshot = clone(validSnapshot());
  snapshot.classicBranchProtection = query(200, [{}]);
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_RESPONSE_MALFORMED",
    "classic_branch_protection",
  );
}

{
  const snapshot = clone(validSnapshot());
  snapshot.classicBranchProtection = query(404, [
    { message: "Branch not protected", status: "404" },
  ]);
  snapshot.branchRules = query(200, [[{}]]);
  expectCode(snapshot, "REMOTE_GOVERNANCE_RESPONSE_MALFORMED", "branch_rules");
}

{
  const snapshot = clone(validSnapshot());
  snapshot.classicBranchProtection = query(404, [
    { message: "Branch not protected", status: "404" },
  ]);
  snapshot.branchRules = query(200, [
    [
      {
        type: "non_fast_forward",
        ruleset_id: 91,
        ruleset_source_type: "Repository",
        ruleset_source: "other/repository",
      },
    ],
  ]);
  expectCode(snapshot, "REMOTE_GOVERNANCE_RESPONSE_MALFORMED", "branch_rules");
}

{
  const snapshot = clone(validSnapshot());
  snapshot.classicBranchProtection = query(404, [
    { message: "Branch not protected", status: "404" },
  ]);
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_MASTER_PROTECTION_EVIDENCE_UNAVAILABLE",
    "branch_rules",
  );
}

{
  const snapshot = clone(validSnapshot());
  snapshot.classicBranchProtection = query(500, [{ message: "failure" }]);
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_QUERY_UNAVAILABLE",
    "classic_branch_protection",
  );
}

{
  const snapshot = clone(validSnapshot());
  snapshot.branchRules = query(200, [[]], false);
  expectCode(snapshot, "REMOTE_GOVERNANCE_QUERY_UNAVAILABLE", "branch_rules");
}

{
  const snapshot = clone(validSnapshot());
  snapshot.environment = query(404, [{ message: "Not Found" }]);
  expectCode(snapshot, "REMOTE_GOVERNANCE_QUERY_UNAVAILABLE", "environment");
}

for (const mutate of [
  (environment: Record<string, unknown>) => {
    environment.name = "wrong";
  },
  (environment: Record<string, unknown>) => {
    environment.protection_rules = [];
  },
  (environment: Record<string, unknown>) => {
    const rules = environment.protection_rules as Record<string, unknown>[];
    const rule = rules[0];
    rule.prevent_self_review = false;
  },
  (environment: Record<string, unknown>) => {
    const rules = environment.protection_rules as Record<string, unknown>[];
    const rule = rules[0];
    rule.reviewers = [];
  },
  (environment: Record<string, unknown>) => {
    const rules = environment.protection_rules as Record<string, unknown>[];
    environment.protection_rules = rules.filter(
      (rule) => rule.type !== "branch_policy",
    );
  },
  (environment: Record<string, unknown>) => {
    const rules = environment.protection_rules as Record<string, unknown>[];
    rules.push({
      id: 14,
      node_id: "PR_kwDOR1olOw14",
      type: "branch_policy",
    });
  },
  (environment: Record<string, unknown>) => {
    const rules = environment.protection_rules as Record<string, unknown>[];
    const rule = rules[0];
    const reviewers = rule.reviewers as Record<string, unknown>[];
    reviewers.push(clone(reviewers[0]));
  },
  (environment: Record<string, unknown>) => {
    const rules = environment.protection_rules as Record<string, unknown>[];
    const rule = rules[0];
    const reviewers = rule.reviewers as {
      reviewer: Record<string, unknown>;
    }[];
    reviewers[0].reviewer.id = 1;
  },
  (environment: Record<string, unknown>) => {
    const rules = environment.protection_rules as Record<string, unknown>[];
    rules.push({ id: 12, type: "unknown" });
  },
]) {
  const snapshot = clone(validSnapshot());
  mutate(snapshot.environment.pages[0] as Record<string, unknown>);
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_ENVIRONMENT_POLICY_MISMATCH",
    "environment",
  );
}

{
  const snapshot = clone(validSnapshot());
  const environment = snapshot.environment.pages[0] as Record<string, unknown>;
  const rules = environment.protection_rules as Record<string, unknown>[];
  rules.push({ id: 13, type: "wait_timer", wait_timer: 0 });
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_ADMIN_BYPASS_UNVERIFIABLE",
    "admin_bypass",
  );
}

for (const [field, replacement] of [
  ["protected_branches", true],
  ["custom_branch_policies", false],
] as const) {
  const snapshot = clone(validSnapshot());
  const environment = snapshot.environment.pages[0] as {
    deployment_branch_policy: Record<string, unknown>;
  };
  environment.deployment_branch_policy[field] = replacement;
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_DEPLOYMENT_POLICY_MISMATCH",
    "environment",
  );
}

{
  const snapshot = clone(validSnapshot());
  snapshot.deploymentBranchPolicies = query(200, [], false);
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_QUERY_UNAVAILABLE",
    "deployment_branch_policies",
  );
}

for (const mutate of [
  (snapshot: GermanTask6cL02RemoteGovernanceSnapshotsDeV1) => {
    snapshot.deploymentBranchPolicies = query(200, [
      { total_count: 0, branch_policies: [] },
    ]);
  },
  (snapshot: GermanTask6cL02RemoteGovernanceSnapshotsDeV1) => {
    snapshot.deploymentBranchPolicies = query(200, [
      {
        total_count: 1,
        branch_policies: [{ id: 73, node_id: "EBP_73", name: "main" }],
      },
    ]);
  },
  (snapshot: GermanTask6cL02RemoteGovernanceSnapshotsDeV1) => {
    snapshot.deploymentBranchPolicies = query(200, [
      {
        total_count: 1,
        branch_policies: [
          { id: 73, node_id: "EBP_73", name: "master" },
          { id: 74, node_id: "EBP_74", name: "master" },
        ],
      },
    ]);
  },
]) {
  const snapshot = clone(validSnapshot());
  mutate(snapshot);
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_DEPLOYMENT_POLICY_MISMATCH",
    "deployment_branch_policies",
  );
}

for (const policy of [
  { id: 73, node_id: "EBP_73", name: "*" },
  { id: 73, node_id: "EBP_73", name: "master", type: "branch" },
]) {
  const snapshot = clone(validSnapshot());
  snapshot.deploymentBranchPolicies = query(200, [
    { total_count: 1, branch_policies: [policy] },
  ]);
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_DEPLOYMENT_POLICY_MISMATCH",
    "deployment_branch_policies",
  );
}

for (const canAdminsBypass of [true, false]) {
  const snapshot = clone(validSnapshot());
  const environment = snapshot.environment.pages[0] as Record<string, unknown>;
  environment.can_admins_bypass = canAdminsBypass;
  expectCode(
    snapshot,
    "REMOTE_GOVERNANCE_ADMIN_BYPASS_UNVERIFIABLE",
    "admin_bypass",
  );
}

const script = readFileSync(SCRIPT_PATH, "utf8");
const fixedEndpoints = [
  "/repos/badloar-star/phraseman",
  "/repos/badloar-star/phraseman/branches/master",
  "/repos/badloar-star/phraseman/branches/master/protection",
  "/repos/badloar-star/phraseman/rules/branches/master?per_page=100",
  "/repos/badloar-star/phraseman/environments/learning-v2-de-l02-capture-attestation",
  "/repos/badloar-star/phraseman/environments/learning-v2-de-l02-capture-attestation/deployment-branch-policies?per_page=100",
] as const;

for (const endpoint of fixedEndpoints) {
  assert.equal(
    script.split(JSON.stringify(endpoint)).length - 1,
    1,
    `fixed endpoint must occur exactly once: ${endpoint}`,
  );
}
assert.match(script, /process\.argv\.slice\(2\)/u);
assert.match(script, /process\.exitCode = 2/u);
assert.match(script, /"--method",\s*"GET"/u);
assert.match(script, /"--hostname",\s*"github\.com"/u);
assert.match(script, /X-GitHub-Api-Version: 2026-03-10/u);
assert.doesNotMatch(script, /2022-11-28/u);
assert.equal((script.match(/"--paginate"/gu) ?? []).length, 1);
assert.equal((script.match(/"--slurp"/gu) ?? []).length, 1);
assert.doesNotMatch(script, /\b(?:POST|PUT|PATCH|DELETE)\b/u);
assert.doesNotMatch(
  script,
  /\b(?:writeFile|appendFile|rmSync|unlinkSync|renameSync|mkdirSync)\b/u,
);
assert.doesNotMatch(script, /OPENAI_API_KEY|PHRASEMAN_ALLOW_OPENAI_DEV_SPEND/u);
assert.doesNotMatch(script, /process\.argv\[[0-9]+\]/u);
assert.match(script, /QUERY_TIMEOUT_MS = 9_000/u);
assert.match(script, /TOTAL_TIMEOUT_MS = 60_000/u);

const tsxCli = path.join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const callerInput = spawnSync(
  process.execPath,
  [tsxCli, SCRIPT_PATH, "--unsafe-target"],
  { cwd: REPO_ROOT, encoding: "utf8" },
);
assert.equal(callerInput.status, 2);
assert.match(
  `${callerInput.stdout}${callerInput.stderr}`,
  /REMOTE_GOVERNANCE_INPUT_FORBIDDEN/u,
);
assert.doesNotMatch(
  `${callerInput.stdout}${callerInput.stderr}`,
  /HTTP [1-5][0-9]{2}|api\.github\.com/u,
);

process.stdout.write(
  "LEARNING V2 GERMAN L02 REMOTE GOVERNANCE V1 GATE: PASS " +
    "(success=forbidden; terminal=admin-bypass-unverifiable)\n",
);
