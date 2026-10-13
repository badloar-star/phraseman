import { spawnSync } from "node:child_process";

import {
  getGermanTask6cL02RemoteGovernanceInputForbiddenDeV1,
  validateGermanTask6cL02RemoteGovernanceDeV1,
  type GermanTask6cL02RemoteGovernanceQuerySnapshotDeV1,
  type GermanTask6cL02RemoteGovernanceSnapshotsDeV1,
} from "../modules/learning-v2/curriculum/de/task6c_l02_remote_governance_de_v1";

const QUERY_TIMEOUT_MS = 9_000;
const TOTAL_TIMEOUT_MS = 60_000;
const startedAtMs = Date.now();

const ENDPOINTS = Object.freeze({
  repository: "/repos/badloar-star/phraseman",
  masterBranch: "/repos/badloar-star/phraseman/branches/master",
  classicBranchProtection:
    "/repos/badloar-star/phraseman/branches/master/protection",
  branchRules:
    "/repos/badloar-star/phraseman/rules/branches/master?per_page=100",
  environment:
    "/repos/badloar-star/phraseman/environments/learning-v2-de-l02-capture-attestation",
  deploymentBranchPolicies:
    "/repos/badloar-star/phraseman/environments/learning-v2-de-l02-capture-attestation/deployment-branch-policies?per_page=100",
});

const GH_API_ARGS = Object.freeze([
  "api",
  "--method",
  "GET",
  "--hostname",
  "github.com",
  "-H",
  "Accept: application/vnd.github+json",
  "-H",
  "X-GitHub-Api-Version: 2026-03-10",
]);
const PAGINATION_ARGS = Object.freeze(["--paginate", "--slurp"]);

function parseHttpStatus(stderr: string): number | null {
  const match = stderr.match(/\(HTTP ([1-5][0-9]{2})\)/u);
  return match ? Number(match[1]) : null;
}

function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function unavailableQuery(): GermanTask6cL02RemoteGovernanceQuerySnapshotDeV1 {
  return { status: null, complete: false, pages: [] };
}

function queryEndpoint(
  endpoint: string,
  paginated: boolean,
): GermanTask6cL02RemoteGovernanceQuerySnapshotDeV1 {
  const remainingMs = TOTAL_TIMEOUT_MS - (Date.now() - startedAtMs);
  if (remainingMs <= 0) return unavailableQuery();

  const result = spawnSync(
    "gh",
    [...GH_API_ARGS, endpoint, ...(paginated ? PAGINATION_ARGS : [])],
    {
      encoding: "utf8",
      timeout: Math.min(QUERY_TIMEOUT_MS, remainingMs),
      windowsHide: true,
    },
  );
  if (result.error) return unavailableQuery();

  const status = result.status === 0 ? 200 : parseHttpStatus(result.stderr);
  const parsed = parseJson(result.stdout.trim());
  if (status === null || parsed === null) return unavailableQuery();
  if (paginated) {
    if (!Array.isArray(parsed)) {
      return { status, complete: true, pages: [parsed] };
    }
    return { status, complete: true, pages: parsed };
  }
  return { status, complete: true, pages: [parsed] };
}

function writeOutcome(value: unknown): void {
  process.stderr.write(`${JSON.stringify(value)}\n`);
}

if (process.argv.slice(2).length !== 0) {
  writeOutcome(getGermanTask6cL02RemoteGovernanceInputForbiddenDeV1());
  process.exitCode = 2;
} else {
  const snapshots: GermanTask6cL02RemoteGovernanceSnapshotsDeV1 = {
    schemaVersion: "learning-v2-de-l02-remote-governance-snapshots.v1" as const,
    apiVersion: "2026-03-10" as const,
    repository: queryEndpoint(ENDPOINTS.repository, false),
    masterBranch: queryEndpoint(ENDPOINTS.masterBranch, false),
    classicBranchProtection: queryEndpoint(
      ENDPOINTS.classicBranchProtection,
      false,
    ),
    branchRules: queryEndpoint(ENDPOINTS.branchRules, true),
    environment: queryEndpoint(ENDPOINTS.environment, false),
    deploymentBranchPolicies: queryEndpoint(
      ENDPOINTS.deploymentBranchPolicies,
      true,
    ),
  };
  writeOutcome(validateGermanTask6cL02RemoteGovernanceDeV1(snapshots));
  process.exitCode = 1;
}
