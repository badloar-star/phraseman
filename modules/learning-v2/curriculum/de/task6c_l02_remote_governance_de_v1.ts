type JsonRecord = Record<string, unknown>;

const API_VERSION = "2026-03-10" as const;
const REPOSITORY = "badloar-star/phraseman" as const;
const BRANCH = "master" as const;
const ENVIRONMENT = "learning-v2-de-l02-capture-attestation" as const;

export type GermanTask6cL02RemoteGovernanceCodeDeV1 =
  | "REMOTE_GOVERNANCE_INPUT_FORBIDDEN"
  | "REMOTE_GOVERNANCE_QUERY_UNAVAILABLE"
  | "REMOTE_GOVERNANCE_RESPONSE_MALFORMED"
  | "REMOTE_GOVERNANCE_REPOSITORY_MISMATCH"
  | "REMOTE_GOVERNANCE_MASTER_REF_MISMATCH"
  | "REMOTE_GOVERNANCE_MASTER_REF_UNPROTECTED"
  | "REMOTE_GOVERNANCE_MASTER_PROTECTION_EVIDENCE_UNAVAILABLE"
  | "REMOTE_GOVERNANCE_ENVIRONMENT_POLICY_MISMATCH"
  | "REMOTE_GOVERNANCE_DEPLOYMENT_POLICY_MISMATCH"
  | "REMOTE_GOVERNANCE_ADMIN_BYPASS_UNVERIFIABLE";

export type GermanTask6cL02RemoteGovernanceSurfaceDeV1 =
  | "github_cli"
  | "repository"
  | "master_branch"
  | "classic_branch_protection"
  | "branch_rules"
  | "environment"
  | "deployment_branch_policies"
  | "admin_bypass";

export type GermanTask6cL02RemoteGovernanceOutcomeDeV1 = Readonly<{
  schemaVersion: "learning-v2-de-l02-remote-governance-verification.v1";
  status: "UNAVAILABLE";
  code: GermanTask6cL02RemoteGovernanceCodeDeV1;
  surface: GermanTask6cL02RemoteGovernanceSurfaceDeV1;
  reason: string;
  apiVersion: typeof API_VERSION;
  repository: typeof REPOSITORY;
  branch: typeof BRANCH;
  environment: typeof ENVIRONMENT;
  remoteMutation: false;
  verifiedSuccess: false;
}>;

export type GermanTask6cL02RemoteGovernanceQuerySnapshotDeV1 = {
  status: number | null;
  complete: boolean;
  pages: readonly unknown[];
};

export type GermanTask6cL02RemoteGovernanceSnapshotsDeV1 = {
  schemaVersion: "learning-v2-de-l02-remote-governance-snapshots.v1";
  apiVersion: typeof API_VERSION;
  repository: GermanTask6cL02RemoteGovernanceQuerySnapshotDeV1;
  masterBranch: GermanTask6cL02RemoteGovernanceQuerySnapshotDeV1;
  classicBranchProtection: GermanTask6cL02RemoteGovernanceQuerySnapshotDeV1;
  branchRules: GermanTask6cL02RemoteGovernanceQuerySnapshotDeV1;
  environment: GermanTask6cL02RemoteGovernanceQuerySnapshotDeV1;
  deploymentBranchPolicies: GermanTask6cL02RemoteGovernanceQuerySnapshotDeV1;
};

const REASONS: Readonly<
  Record<GermanTask6cL02RemoteGovernanceCodeDeV1, string>
> = Object.freeze({
  REMOTE_GOVERNANCE_INPUT_FORBIDDEN:
    "caller arguments cannot select a repository, branch, environment, endpoint or method",
  REMOTE_GOVERNANCE_QUERY_UNAVAILABLE:
    "a required read-only GitHub API query did not complete with its admissible status",
  REMOTE_GOVERNANCE_RESPONSE_MALFORMED:
    "a required GitHub API response is missing or has an invalid JSON shape",
  REMOTE_GOVERNANCE_REPOSITORY_MISMATCH:
    "the repository identity or immutable repository properties do not match the fixed target",
  REMOTE_GOVERNANCE_MASTER_REF_MISMATCH:
    "the queried default branch does not match the fixed master ref contract",
  REMOTE_GOVERNANCE_MASTER_REF_UNPROTECTED:
    "the fixed master branch is not reported as protected",
  REMOTE_GOVERNANCE_MASTER_PROTECTION_EVIDENCE_UNAVAILABLE:
    "neither classic branch protection nor a nonempty applicable branch-rules response proves protection",
  REMOTE_GOVERNANCE_ENVIRONMENT_POLICY_MISMATCH:
    "the fixed environment does not have the exact required owner-review policy",
  REMOTE_GOVERNANCE_DEPLOYMENT_POLICY_MISMATCH:
    "the fixed environment does not allow exactly the master branch through a custom deployment policy",
  REMOTE_GOVERNANCE_ADMIN_BYPASS_UNVERIFIABLE:
    "the documented GitHub REST surfaces do not prove that repository administrators cannot bypass the environment approval",
});

function outcome(
  code: GermanTask6cL02RemoteGovernanceCodeDeV1,
  surface: GermanTask6cL02RemoteGovernanceSurfaceDeV1,
): GermanTask6cL02RemoteGovernanceOutcomeDeV1 {
  return Object.freeze({
    schemaVersion:
      "learning-v2-de-l02-remote-governance-verification.v1" as const,
    status: "UNAVAILABLE" as const,
    code,
    surface,
    reason: REASONS[code],
    apiVersion: API_VERSION,
    repository: REPOSITORY,
    branch: BRANCH,
    environment: ENVIRONMENT,
    remoteMutation: false as const,
    verifiedSuccess: false as const,
  });
}

export function getGermanTask6cL02RemoteGovernanceInputForbiddenDeV1(): GermanTask6cL02RemoteGovernanceOutcomeDeV1 {
  return outcome("REMOTE_GOVERNANCE_INPUT_FORBIDDEN", "github_cli");
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, expected: readonly string[]): boolean {
  return (
    Object.keys(value).sort().join("\0") === [...expected].sort().join("\0")
  );
}

type QueryRead =
  | Readonly<{
      ok: true;
      value: GermanTask6cL02RemoteGovernanceQuerySnapshotDeV1;
    }>
  | Readonly<{
      ok: false;
      failure: GermanTask6cL02RemoteGovernanceOutcomeDeV1;
    }>;

function readQuery(
  value: unknown,
  surface: GermanTask6cL02RemoteGovernanceSurfaceDeV1,
): QueryRead {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["status", "complete", "pages"]) ||
    (value.status !== null &&
      (!Number.isInteger(value.status) ||
        (value.status as number) < 100 ||
        (value.status as number) > 599)) ||
    typeof value.complete !== "boolean" ||
    !Array.isArray(value.pages)
  ) {
    return {
      ok: false,
      failure: outcome("REMOTE_GOVERNANCE_RESPONSE_MALFORMED", surface),
    };
  }
  const query = value as GermanTask6cL02RemoteGovernanceQuerySnapshotDeV1;
  if (query.status === null || !query.complete) {
    return {
      ok: false,
      failure: outcome("REMOTE_GOVERNANCE_QUERY_UNAVAILABLE", surface),
    };
  }
  return { ok: true, value: query };
}

type SingletonBodyRead =
  | Readonly<{ body: JsonRecord }>
  | Readonly<{ failure: GermanTask6cL02RemoteGovernanceOutcomeDeV1 }>;

function singletonBody(
  query: GermanTask6cL02RemoteGovernanceQuerySnapshotDeV1,
  surface: GermanTask6cL02RemoteGovernanceSurfaceDeV1,
): SingletonBodyRead {
  if (query.pages.length !== 1 || !isRecord(query.pages[0])) {
    return {
      failure: outcome("REMOTE_GOVERNANCE_RESPONSE_MALFORMED", surface),
    };
  }
  return { body: query.pages[0] };
}

function isFixedOwner(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.login === "badloar-star" &&
    value.id === 254249264 &&
    value.node_id === "U_kgDODyeJMA" &&
    value.type === "User"
  );
}

function validateRepository(
  body: JsonRecord,
): GermanTask6cL02RemoteGovernanceOutcomeDeV1 | null {
  if (
    body.id !== 1197090107 ||
    body.node_id !== "R_kgDOR1olOw" ||
    body.name !== "phraseman" ||
    body.full_name !== REPOSITORY ||
    body.private !== false ||
    body.fork !== false ||
    body.archived !== false ||
    body.disabled !== false ||
    body.visibility !== "public" ||
    body.default_branch !== BRANCH ||
    !isFixedOwner(body.owner)
  ) {
    return outcome("REMOTE_GOVERNANCE_REPOSITORY_MISMATCH", "repository");
  }
  return null;
}

function validateMasterBranch(
  body: JsonRecord,
): GermanTask6cL02RemoteGovernanceOutcomeDeV1 | null {
  if (
    body.name !== BRANCH ||
    !isRecord(body.commit) ||
    typeof body.commit.sha !== "string" ||
    !/^[0-9a-f]{40}$/u.test(body.commit.sha)
  ) {
    return outcome("REMOTE_GOVERNANCE_MASTER_REF_MISMATCH", "master_branch");
  }
  if (body.protected !== true) {
    return outcome("REMOTE_GOVERNANCE_MASTER_REF_UNPROTECTED", "master_branch");
  }
  return null;
}

function readBranchRules(
  query: GermanTask6cL02RemoteGovernanceQuerySnapshotDeV1,
): readonly JsonRecord[] | GermanTask6cL02RemoteGovernanceOutcomeDeV1 {
  if (query.status !== 200) {
    return outcome("REMOTE_GOVERNANCE_QUERY_UNAVAILABLE", "branch_rules");
  }
  if (
    query.pages.length === 0 ||
    query.pages.some((page) => !Array.isArray(page))
  ) {
    return outcome("REMOTE_GOVERNANCE_RESPONSE_MALFORMED", "branch_rules");
  }
  const rules = query.pages.flatMap((page) => page as readonly unknown[]);
  if (
    rules.some(
      (rule) =>
        !isRecord(rule) ||
        typeof rule.type !== "string" ||
        rule.type.length === 0 ||
        !Number.isInteger(rule.ruleset_id) ||
        (rule.ruleset_id as number) <= 0 ||
        rule.ruleset_source_type !== "Repository" ||
        rule.ruleset_source !== REPOSITORY ||
        (rule.parameters !== undefined && !isRecord(rule.parameters)),
    )
  ) {
    return outcome("REMOTE_GOVERNANCE_RESPONSE_MALFORMED", "branch_rules");
  }
  return rules as readonly JsonRecord[];
}

function validateEnvironment(
  body: JsonRecord,
): GermanTask6cL02RemoteGovernanceOutcomeDeV1 | null {
  if (
    body.name !== ENVIRONMENT ||
    !Number.isInteger(body.id) ||
    (body.id as number) <= 0 ||
    typeof body.node_id !== "string" ||
    body.node_id.length === 0 ||
    !Array.isArray(body.protection_rules) ||
    !isRecord(body.deployment_branch_policy)
  ) {
    return outcome(
      "REMOTE_GOVERNANCE_ENVIRONMENT_POLICY_MISMATCH",
      "environment",
    );
  }

  const rules = body.protection_rules;
  if (rules.some((rule) => !isRecord(rule))) {
    return outcome(
      "REMOTE_GOVERNANCE_ENVIRONMENT_POLICY_MISMATCH",
      "environment",
    );
  }
  const requiredReviewers = rules.filter(
    (rule) => (rule as JsonRecord).type === "required_reviewers",
  ) as JsonRecord[];
  const waitTimers = rules.filter(
    (rule) => (rule as JsonRecord).type === "wait_timer",
  ) as JsonRecord[];
  const branchPolicies = rules.filter(
    (rule) => (rule as JsonRecord).type === "branch_policy",
  ) as JsonRecord[];
  const unknownRules = rules.filter(
    (rule) =>
      (rule as JsonRecord).type !== "required_reviewers" &&
      (rule as JsonRecord).type !== "wait_timer" &&
      (rule as JsonRecord).type !== "branch_policy",
  );
  if (
    requiredReviewers.length !== 1 ||
    branchPolicies.length !== 1 ||
    waitTimers.length > 1 ||
    unknownRules.length !== 0 ||
    !hasExactKeys(branchPolicies[0], ["id", "node_id", "type"]) ||
    !Number.isInteger(branchPolicies[0].id) ||
    (branchPolicies[0].id as number) <= 0 ||
    typeof branchPolicies[0].node_id !== "string" ||
    branchPolicies[0].node_id.length === 0 ||
    (waitTimers.length === 1 &&
      (!Number.isInteger(waitTimers[0].wait_timer) ||
        (waitTimers[0].wait_timer as number) < 0))
  ) {
    return outcome(
      "REMOTE_GOVERNANCE_ENVIRONMENT_POLICY_MISMATCH",
      "environment",
    );
  }

  const required = requiredReviewers[0];
  if (
    required.prevent_self_review !== true ||
    !Array.isArray(required.reviewers) ||
    required.reviewers.length !== 1 ||
    !isRecord(required.reviewers[0]) ||
    required.reviewers[0].type !== "User" ||
    !isFixedOwner(required.reviewers[0].reviewer)
  ) {
    return outcome(
      "REMOTE_GOVERNANCE_ENVIRONMENT_POLICY_MISMATCH",
      "environment",
    );
  }

  if (
    body.deployment_branch_policy.protected_branches !== false ||
    body.deployment_branch_policy.custom_branch_policies !== true
  ) {
    return outcome(
      "REMOTE_GOVERNANCE_DEPLOYMENT_POLICY_MISMATCH",
      "environment",
    );
  }
  return null;
}

function validateDeploymentBranchPolicies(
  query: GermanTask6cL02RemoteGovernanceQuerySnapshotDeV1,
): GermanTask6cL02RemoteGovernanceOutcomeDeV1 | null {
  if (query.status !== 200) {
    return outcome(
      "REMOTE_GOVERNANCE_QUERY_UNAVAILABLE",
      "deployment_branch_policies",
    );
  }
  if (query.pages.length === 0 || query.pages.some((page) => !isRecord(page))) {
    return outcome(
      "REMOTE_GOVERNANCE_RESPONSE_MALFORMED",
      "deployment_branch_policies",
    );
  }

  const policies: unknown[] = [];
  for (const page of query.pages as readonly JsonRecord[]) {
    if (page.total_count !== 1 || !Array.isArray(page.branch_policies)) {
      return outcome(
        "REMOTE_GOVERNANCE_DEPLOYMENT_POLICY_MISMATCH",
        "deployment_branch_policies",
      );
    }
    policies.push(...page.branch_policies);
  }
  if (policies.length !== 1 || !isRecord(policies[0])) {
    return outcome(
      "REMOTE_GOVERNANCE_DEPLOYMENT_POLICY_MISMATCH",
      "deployment_branch_policies",
    );
  }
  const policy = policies[0];
  if (
    !hasExactKeys(policy, ["id", "node_id", "name"]) ||
    policy.name !== BRANCH ||
    !Number.isInteger(policy.id) ||
    (policy.id as number) <= 0 ||
    typeof policy.node_id !== "string" ||
    policy.node_id.length === 0
  ) {
    return outcome(
      "REMOTE_GOVERNANCE_DEPLOYMENT_POLICY_MISMATCH",
      "deployment_branch_policies",
    );
  }
  return null;
}

export function validateGermanTask6cL02RemoteGovernanceDeV1(
  input: unknown,
): GermanTask6cL02RemoteGovernanceOutcomeDeV1 {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, [
      "schemaVersion",
      "apiVersion",
      "repository",
      "masterBranch",
      "classicBranchProtection",
      "branchRules",
      "environment",
      "deploymentBranchPolicies",
    ]) ||
    input.schemaVersion !==
      "learning-v2-de-l02-remote-governance-snapshots.v1" ||
    input.apiVersion !== API_VERSION
  ) {
    return outcome("REMOTE_GOVERNANCE_RESPONSE_MALFORMED", "github_cli");
  }

  const repositoryQuery = readQuery(input.repository, "repository");
  if ("failure" in repositoryQuery) return repositoryQuery.failure;
  if (repositoryQuery.value.status !== 200)
    return outcome("REMOTE_GOVERNANCE_QUERY_UNAVAILABLE", "repository");
  const repository = singletonBody(repositoryQuery.value, "repository");
  if ("failure" in repository) return repository.failure;
  const repositoryFailure = validateRepository(repository.body);
  if (repositoryFailure) return repositoryFailure;

  const branchQuery = readQuery(input.masterBranch, "master_branch");
  if ("failure" in branchQuery) return branchQuery.failure;
  if (branchQuery.value.status !== 200)
    return outcome("REMOTE_GOVERNANCE_QUERY_UNAVAILABLE", "master_branch");
  const branch = singletonBody(branchQuery.value, "master_branch");
  if ("failure" in branch) return branch.failure;
  const branchFailure = validateMasterBranch(branch.body);
  if (branchFailure) return branchFailure;

  const classicQuery = readQuery(
    input.classicBranchProtection,
    "classic_branch_protection",
  );
  if ("failure" in classicQuery) return classicQuery.failure;
  if (classicQuery.value.status !== 200 && classicQuery.value.status !== 404) {
    return outcome(
      "REMOTE_GOVERNANCE_QUERY_UNAVAILABLE",
      "classic_branch_protection",
    );
  }
  const classicBody = singletonBody(
    classicQuery.value,
    "classic_branch_protection",
  );
  if ("failure" in classicBody) return classicBody.failure;
  if (
    classicQuery.value.status === 200 &&
    classicBody.body.url !==
      "https://api.github.com/repos/badloar-star/phraseman/branches/master/protection"
  ) {
    return outcome(
      "REMOTE_GOVERNANCE_RESPONSE_MALFORMED",
      "classic_branch_protection",
    );
  }

  const rulesQuery = readQuery(input.branchRules, "branch_rules");
  if ("failure" in rulesQuery) return rulesQuery.failure;
  const rules = readBranchRules(rulesQuery.value);
  if ("code" in rules) return rules;
  if (classicQuery.value.status === 404 && rules.length === 0) {
    return outcome(
      "REMOTE_GOVERNANCE_MASTER_PROTECTION_EVIDENCE_UNAVAILABLE",
      "branch_rules",
    );
  }

  const environmentQuery = readQuery(input.environment, "environment");
  if ("failure" in environmentQuery) return environmentQuery.failure;
  if (environmentQuery.value.status !== 200)
    return outcome("REMOTE_GOVERNANCE_QUERY_UNAVAILABLE", "environment");
  const environment = singletonBody(environmentQuery.value, "environment");
  if ("failure" in environment) return environment.failure;
  const environmentFailure = validateEnvironment(environment.body);
  if (environmentFailure) return environmentFailure;

  const policiesQuery = readQuery(
    input.deploymentBranchPolicies,
    "deployment_branch_policies",
  );
  if ("failure" in policiesQuery) return policiesQuery.failure;
  const policiesFailure = validateDeploymentBranchPolicies(policiesQuery.value);
  if (policiesFailure) return policiesFailure;

  // GitHub's documented environment response does not establish that an
  // administrator cannot bypass approval. Undocumented fields are ignored.
  return outcome("REMOTE_GOVERNANCE_ADMIN_BYPASS_UNVERIFIABLE", "admin_bypass");
}
