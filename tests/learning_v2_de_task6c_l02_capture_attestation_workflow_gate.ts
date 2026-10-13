import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..");
const WORKFLOW_PATH = path.join(
  REPO_ROOT,
  ".github",
  "workflows",
  "learning-v2-de-l02-capture-attestation.yml",
);
const workflow = readFileSync(WORKFLOW_PATH, "utf8");

const EXPECTED_WORKFLOW = [
  "name: German Learning V2 L02 capture attestation contract",
  "",
  "on:",
  "  workflow_dispatch: {}",
  "",
  "permissions:",
  "  contents: read",
  "",
  "jobs:",
  "  fail-closed-contract:",
  "    runs-on: ubuntu-24.04",
  "    environment: learning-v2-de-l02-capture-attestation",
  "    timeout-minutes: 5",
  "    steps:",
  "      - name: Deny inadmissible dispatches",
  "        shell: bash",
  "        run: |",
  "          set -euo pipefail",
  "          deny() {",
  "            printf '%s\\n' 'CAPTURE_WORKFLOW_ADMISSION_DENIED' >&2",
  "            exit 1",
  "          }",
  '          test "${RUNNER_ENVIRONMENT-}" = "github-hosted" || deny',
  '          test "${GITHUB_REPOSITORY-}" = "badloar-star/phraseman" || deny',
  '          test "${GITHUB_EVENT_NAME-}" = "workflow_dispatch" || deny',
  '          test "${GITHUB_REF-}" = "refs/heads/master" || deny',
  '          test "${GITHUB_REF_PROTECTED-}" = "true" || deny',
  '          test "${GITHUB_WORKFLOW_REF-}" = "badloar-star/phraseman/.github/workflows/learning-v2-de-l02-capture-attestation.yml@refs/heads/master" || deny',
  '          [[ "${GITHUB_SHA-}" =~ ^[0-9a-f]{40}$ ]] || deny',
  '          test "${GITHUB_WORKFLOW_SHA-}" = "$GITHUB_SHA" || deny',
  "",
  "      - name: Check out the exact dispatch commit",
  "        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2",
  "        with:",
  "          ref: ${{ github.sha }}",
  "          persist-credentials: false",
  "          clean: true",
  "          fetch-depth: 1",
  "",
  "      - name: Verify the exact checked-out commit",
  "        shell: bash",
  "        run: |",
  "          set -euo pipefail",
  "          deny() {",
  "            printf '%s\\n' 'CAPTURE_WORKFLOW_ADMISSION_DENIED' >&2",
  "            exit 1",
  "          }",
  '          checkout_head="$(git rev-parse HEAD)" || deny',
  '          test "$checkout_head" = "$GITHUB_SHA" || deny',
  "",
  "      - name: Set up the future producer runtime",
  "        uses: actions/setup-node@1e60f620b9541d16bece96c5465dc8ee9832be0b # v4.0.3",
  "        with:",
  '          node-version: "22"',
  "",
  "      - name: Fail closed until capture producer and external governance exist",
  "        shell: bash",
  "        run: |",
  "          set -euo pipefail",
  "          printf '%s\\n' 'CAPTURE_PRODUCER_AND_EXTERNAL_GOVERNANCE_NOT_READY' >&2",
  "          exit 1",
  "",
].join("\n");

function assertWorkflowContract(candidate: string): void {
  assert.equal(
    candidate,
    EXPECTED_WORKFLOW,
    "WORKFLOW_BYTES_OUTSIDE_APPROVED_FAIL_CLOSED_SKELETON",
  );
}

assertWorkflowContract(workflow);

const soleJobOffset = EXPECTED_WORKFLOW.indexOf("  fail-closed-contract:");
assert.notEqual(soleJobOffset, -1, "sole job mapping fixture is missing");
const soleJobMapping = EXPECTED_WORKFLOW.slice(soleJobOffset);

const hostileMutations = [
  [
    "unexpected push trigger",
    ["  workflow_dispatch: {}", "  workflow_dispatch: {}\n  push: {}"],
  ],
  [
    "unexpected pull-request trigger",
    ["  workflow_dispatch: {}", "  workflow_dispatch: {}\n  pull_request: {}"],
  ],
  [
    "reusable workflow trigger",
    ["  workflow_dispatch: {}", "  workflow_dispatch: {}\n  workflow_call: {}"],
  ],
  [
    "dispatch input",
    [
      "  workflow_dispatch: {}",
      "  workflow_dispatch:\n    inputs:\n      unsafe: {}",
    ],
  ],
  ["write permission", ["  contents: read", "  contents: write"]],
  [
    "job permission override",
    [
      "    runs-on: ubuntu-24.04",
      "    permissions:\n      contents: write\n    runs-on: ubuntu-24.04",
    ],
  ],
  [
    "job skip condition",
    [
      "    runs-on: ubuntu-24.04",
      "    if: github.ref_protected == true\n    runs-on: ubuntu-24.04",
    ],
  ],
  [
    "self-hosted runner",
    ["    runs-on: ubuntu-24.04", "    runs-on: self-hosted"],
  ],
  [
    "container",
    [
      "    timeout-minutes: 5",
      "    container: node:22\n    timeout-minutes: 5",
    ],
  ],
  [
    "services",
    [
      "    timeout-minutes: 5",
      "    services:\n      unsafe:\n        image: redis\n    timeout-minutes: 5",
    ],
  ],
  [
    "strategy",
    [
      "    timeout-minutes: 5",
      "    strategy:\n      matrix:\n        unsafe: [true]\n    timeout-minutes: 5",
    ],
  ],
  ["defaults", ["jobs:", "defaults:\n  run:\n    shell: pwsh\n\njobs:"]],
  [
    "unsafe environment variable",
    ["    steps:", "    env:\n      TOKEN: unsafe\n    steps:"],
  ],
  [
    "continue on error",
    [
      "        shell: bash",
      "        continue-on-error: true\n        shell: bash",
    ],
  ],
  [
    "secret reference",
    [
      "        shell: bash",
      "        env:\n          TOKEN: ${{ secrets.TOKEN }}\n        shell: bash",
    ],
  ],
  [
    "extra scalar step",
    [
      "      - name: Deny inadmissible dispatches",
      "      - run: echo unsafe\n\n      - name: Deny inadmissible dispatches",
    ],
  ],
  [
    "extra named run",
    [
      "      - name: Deny inadmissible dispatches",
      "      - name: Unsafe extra run\n        run: echo unsafe\n\n      - name: Deny inadmissible dispatches",
    ],
  ],
  [
    "job-level reusable workflow",
    [
      soleJobMapping,
      "  fail-closed-contract:\n    uses: ./.github/workflows/unsafe-reusable.yml\n",
    ],
  ],
  [
    "attestation action step",
    [
      "      - name: Fail closed until capture producer and external governance exist",
      "      - name: Unsafe attestation\n        uses: actions/attest@0123456789abcdef0123456789abcdef01234567\n\n      - name: Fail closed until capture producer and external governance exist",
    ],
  ],
  [
    "capture network invocation",
    [
      "          exit 1\n",
      "          curl https://example.invalid\n          exit 1\n",
    ],
  ],
  [
    "extra job",
    [
      "  fail-closed-contract:",
      "  unexpected-job:\n    runs-on: ubuntu-24.04\n    steps: []\n\n  fail-closed-contract:",
    ],
  ],
  [
    "duplicate top-level key",
    ["permissions:", "permissions:\n  contents: write\n\npermissions:"],
  ],
  [
    "checkout ref drift",
    ["          ref: ${{ github.sha }}", "          ref: refs/heads/master"],
  ],
  ["CRLF rewrite", ["\n", "\r\n"]],
] as const;

assert.equal(hostileMutations.length, 24, "hostile mutation count drifted");
assert.equal(
  new Set(hostileMutations.map(([name]) => name)).size,
  24,
  "hostile mutation names must be unique",
);

for (const [name, [needle, replacement]] of hostileMutations) {
  assert(
    EXPECTED_WORKFLOW.includes(needle),
    "mutation fixture is stale: " + name,
  );
  const mutated = EXPECTED_WORKFLOW.replace(needle, replacement);
  assert.notEqual(
    mutated,
    EXPECTED_WORKFLOW,
    "mutation did not change: " + name,
  );
  assert.throws(
    () => assertWorkflowContract(mutated),
    /WORKFLOW_BYTES_OUTSIDE_APPROVED_FAIL_CLOSED_SKELETON/u,
    name,
  );
}

const tsxCli = path.join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const structural = spawnSync(
  process.execPath,
  [tsxCli, "tests/learning_v2_de_task6c_l02_capture_transport_v2_gate.ts"],
  { cwd: REPO_ROOT, encoding: "utf8" },
);
assert.equal(
  structural.status,
  0,
  `existing L02 transport structural gate failed:\n${structural.stdout}${structural.stderr}`,
);
assert.match(
  structural.stdout,
  /LEARNING V2 GERMAN L02 CAPTURE TRANSPORT V2 STRUCTURAL GATE: PASS/u,
);

const production = spawnSync(
  process.execPath,
  [tsxCli, "scripts/verify_learning_v2_de_task6c_l02_capture_transport_v2.ts"],
  { cwd: REPO_ROOT, encoding: "utf8" },
);
assert.notEqual(production.status, 0);
assert.match(
  `${production.stdout}${production.stderr}`,
  /CAPTURE_EXTERNALLY_GOVERNED_ATTESTATION_UNAVAILABLE/u,
);

process.stdout.write(
  "LEARNING V2 GERMAN L02 CAPTURE ATTESTATION WORKFLOW STATIC GATE: PASS " +
    "(skeleton=fail-closed; producer=absent; attestation=absent)\n",
);
