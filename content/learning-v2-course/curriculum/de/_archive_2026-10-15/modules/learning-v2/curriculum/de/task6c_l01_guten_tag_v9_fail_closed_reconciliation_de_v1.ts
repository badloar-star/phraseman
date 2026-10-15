import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";

import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../policies/decision_registry";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type RecordJson = { [key: string]: Json };

const ROOT = path.resolve(process.cwd());
const HASH = /^[a-f0-9]{64}$/u;

export const PATHS = {
  task5: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v3.json",
  task6V6:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v6.json",
  inventoryV6:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v6.json",
  closureV6:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_final_review_closure_v1/closure.json",
  evidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/lexical_evidence.json",
  lexicalV7:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v7.json",
  task6V7:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v7.json",
  inventoryV7:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v7.json",
  task6V8:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v8.json",
  inventoryV8:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v8.json",
  task6V9:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v9.json",
  inventoryV9:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v9.json",
  module:
    "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_v9_fail_closed_reconciliation_de_v1.ts",
  gate: "tests/learning_v2_de_task6c_l01_guten_tag_v9_fail_closed_reconciliation_gate.ts",
  capture:
    "scripts/capture_learning_v2_de_task6c_l01_guten_tag_v9_typescript_evidence.mjs",
  manifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/manifest.json",
  typescriptEvidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/typescript_evidence.json",
  focusedLog:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/logs/focused_tsc.log",
  repositoryLog:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/logs/repository_tsc_8192.log",
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_GUTEN_TAG_V9_FAIL_CLOSED_RECONCILIATION_RECEIPT_2026-10-13.md",
} as const;

export const PINNED_HASHES = {
  [PATHS.task5]:
    "5934f3f94e87f8b50481096732047c6c5c8591c34ce97c30d413d14519ce21fe",
  [PATHS.task6V6]:
    "63d65319b2f41dc6cb08e8e4e407fbf4a6ca71c061229da64a886c62ba9403bc",
  [PATHS.inventoryV6]:
    "e940b37e2ea29e479710dada185c8bc1466bb04b61176c8c839432eeaf392677",
  [PATHS.closureV6]:
    "7d12e8f92cc4f190a53cbd2a04463fbd04dde42d39063b704059400e8af0577c",
  [PATHS.evidence]:
    "132f65574f9e858a8c7ec22fc6269732a269c4e122fa6a2304caab8bcfd21ddc",
  [PATHS.lexicalV7]:
    "a52b925ee5e6d3adbd1de87749e7722424f6fc9c1fb5a50e3f306d2ad2fce5b1",
  [PATHS.task6V7]:
    "29e2c6b7e379acd2fa69431e28d25eb6c1e97466555bc7751eafe05693b33195",
  [PATHS.inventoryV7]:
    "d409e6cc0a909fdcf486c69308f8d2de84b2a6db688d7a90d31f933e14c0f69b",
  [PATHS.task6V8]:
    "f80c085f75f3c09bb84072ea56d4809ed11110248b6f5958365b6d0197019ff7",
  [PATHS.inventoryV8]:
    "b051f67de024c149f734167b25f18b88849d6c79502ea59a2d33bdee3b5af536",
} as const;

const DIGESTS = {
  task5: "b9d1f10fd35ce789a90055a6632af29550b0cfef349cd6b229a764336b0a271b",
  resolved: "f769b2a0ac46870f09a4f1c35bd0815ef97973b27cbfe711b56dcd717b37f400",
  unresolved:
    "fc3aa2befc24bd30c456fd69ebe53f62acb821d6eda683cada6b03565e92c605",
  packets: "32a2320cf26729d24efc5884e0fe3c6e993e9eeeac693886a49fd566771a6d3f",
} as const;

export const TRANSACTION_PATHS = [
  PATHS.task6V9,
  PATHS.inventoryV9,
  PATHS.module,
  PATHS.gate,
  PATHS.capture,
  PATHS.manifest,
  PATHS.typescriptEvidence,
  PATHS.focusedLog,
  PATHS.repositoryLog,
  PATHS.receipt,
] as const;

const CLOSED_AUTHORITY = {
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  currentlyMaterializable: false,
  materializedPackets: 0,
  consumerCutover: "NONE",
  defaultConsumerChanged: false,
  ownerApproval: "NOT_REQUESTED_NOT_GRANTED",
} as const;

const sha = (bytes: Buffer | string): string =>
  crypto.createHash("sha256").update(bytes).digest("hex");
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const fail = (code: string): never => {
  throw new Error(code);
};
const abs = (relative: string): string => path.join(ROOT, relative);
const bytes = (relative: string): Buffer => fs.readFileSync(abs(relative));
const json = (relative: string): RecordJson =>
  JSON.parse(bytes(relative).toString("utf8")) as RecordJson;
const exact = (actual: unknown, expected: unknown, code: string): void => {
  if (canonicalJsonV1(actual) !== canonicalJsonV1(expected)) fail(code);
};
const exactKeys = (
  value: unknown,
  keys: readonly string[],
  code: string,
): RecordJson => {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return fail(code);
  const record = value as RecordJson;
  const actual = Object.keys(record).sort();
  if (canonicalJsonV1(actual) !== canonicalJsonV1([...keys].sort())) fail(code);
  return record;
};

const binding = (relative: string, schemaVersion?: string): RecordJson => ({
  path: relative,
  ...(schemaVersion === undefined ? {} : { schemaVersion }),
  byteSha256: PINNED_HASHES[relative as keyof typeof PINNED_HASHES],
});

const rejectedAudits = (): RecordJson => ({
  status: "REJECTED_NOT_AUTHORITY",
  reason: "V7_V8_AUDITS_REJECTED_FAIL_CLOSED_RECONCILIATION_REQUIRED",
  task6V7: { path: PATHS.task6V7, byteSha256: PINNED_HASHES[PATHS.task6V7] },
  inventoryV7: {
    path: PATHS.inventoryV7,
    byteSha256: PINNED_HASHES[PATHS.inventoryV7],
  },
  task6V8: { path: PATHS.task6V8, byteSha256: PINNED_HASHES[PATHS.task6V8] },
  inventoryV8: {
    path: PATHS.inventoryV8,
    byteSha256: PINNED_HASHES[PATHS.inventoryV8],
  },
});

function verifyPinned(): void {
  for (const [relative, expected] of Object.entries(PINNED_HASHES)) {
    if (sha(bytes(relative)) !== expected)
      fail("guten_tag_v9_frozen_input_drift");
  }
}

function expectedTask6(): RecordJson {
  const base = clone(json(PATHS.task6V6));
  const v7 = json(PATHS.task6V7);
  base.schemaVersion = "learning-v2-german-task6-canonical-registry.v9";
  base.authority = {
    status: "TASK6_V9_CANONICAL_PARTIAL",
    upstreamCandidateCanonicalAdmission:
      "ADMITTED_EXACT_HALLO_TSCHUESS_ICH_HEISSE_BRIEFKASTEN_AND_GUTEN_TAG_SENSES_ONLY",
    phaseBMaterialization: "ADMITTED_FOR_TASK6_V9_REGISTRY_ONLY",
    rowsMaterialized: 11,
    newRowsMaterialized: 9,
    legacyRowsPreserved: 2,
    rowsPromoted: 5,
    task7Status: "TASK7_HOLD_GLOBAL_ALLOCATION_INCOMPLETE",
    task7Unlock: false,
    preauthoringAuthority: false,
    learnerFacing: false,
    phraseClaims: "HALLO_EXACT_ONLY",
    releaseAuthorized: false,
    currentlyMaterializable: false,
    materializedPackets: 0,
    consumerCutover: "NONE",
    defaultConsumerChanged: false,
    ownerApproval: "NOT_REQUESTED_NOT_GRANTED",
  };
  const sourceBindings = base.sourceBindings as RecordJson;
  sourceBindings.task6V6 = binding(
    PATHS.task6V6,
    "learning-v2-german-task6-canonical-registry.v6",
  );
  sourceBindings.inventoryV6 = binding(
    PATHS.inventoryV6,
    "learning-v2-german-task7-allocation-inventory.v6",
  );
  sourceBindings.v6Closure = binding(PATHS.closureV6);
  sourceBindings.gutenTagLexicalEvidence = binding(PATHS.evidence);
  sourceBindings.lexicalRegistryV7 = binding(PATHS.lexicalV7);
  base.rejectedAudits = rejectedAudits();
  const materialization = base.materialization as RecordJson;
  materialization.l01GutenTagLexicalMapping = {
    sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1",
    canonicalLexicalSenseId: "de_lex_l01_c04_guten_tag_v1",
    evidenceId: "DE-LEX-ITEM-L01-C04-GUTEN-TAG-D11-GREETING-001",
    materializationRole:
      "TASK6_V9_CANONICAL_POSITIVE_ADMISSION_EXACT_D11_GREETING_FIXED_EXPRESSION_ONLY",
    phraseAuthority: false,
  };
  const context = base.authorityContext as RecordJson;
  const v7Context = v7.authorityContext as RecordJson;
  context.schemaVersion = "learning-v2-german-task6-registry-authority.v9";
  context.lexicalMappings = [
    ...(context.lexicalMappings as Json[]),
    (v7Context.lexicalMappings as Json[]).at(-1) as Json,
  ];
  const registry = base.registry as RecordJson;
  const v7Registry = v7.registry as RecordJson;
  registry.lexicalSenses = [
    ...(registry.lexicalSenses as Json[]),
    (v7Registry.lexicalSenses as Json[]).at(-1) as Json,
  ];
  return base;
}

function task5Ids(): { plans: string[]; packets: string[] } {
  const task5 = json(PATHS.task5);
  const plans: string[] = [];
  const packets: string[] = [];
  for (const lesson of task5.lessons as RecordJson[]) {
    for (const chapter of lesson.chapters as RecordJson[]) {
      for (const packet of chapter.packetIds as string[]) packets.push(packet);
      const checkpoint = chapter.checkpoint as RecordJson;
      for (const plan of checkpoint.plannedNewLexicalSenses as RecordJson[]) {
        plans.push(plan.id as string);
      }
    }
  }
  return { plans, packets };
}

function expectedInventory(task6V9Sha256: string): RecordJson {
  const base = clone(json(PATHS.inventoryV6));
  base.schemaVersion = "learning-v2-german-task7-allocation-inventory.v9";
  base.status = "GUTEN_TAG_LEXICAL_SENSE_CANONICAL_ADMITTED_PARTIAL";
  const bindings = base.sourceBindings as RecordJson;
  bindings.task6V6 = binding(
    PATHS.task6V6,
    "learning-v2-german-task6-canonical-registry.v6",
  );
  bindings.inventoryV6 = binding(
    PATHS.inventoryV6,
    "learning-v2-german-task7-allocation-inventory.v6",
  );
  bindings.v6Closure = binding(PATHS.closureV6);
  bindings.gutenTagLexicalEvidence = binding(PATHS.evidence);
  bindings.lexicalRegistryV7 = binding(PATHS.lexicalV7);
  bindings.task6V9 = {
    path: PATHS.task6V9,
    schemaVersion: "learning-v2-german-task6-canonical-registry.v9",
    byteSha256: task6V9Sha256,
  };
  base.rejectedAudits = rejectedAudits();
  base.counts = {
    task5PlanIds: 288,
    resolvedPlanIds: 11,
    unresolvedPlanIds: 277,
    packetIds: 1792,
    materializedPackets: 0,
  };
  base.inventoryDigests = {
    task5PlanIdsCanonicalSha256: DIGESTS.task5,
    resolvedPlanIdsCanonicalSha256: DIGESTS.resolved,
    unresolvedPlanIdsCanonicalSha256: DIGESTS.unresolved,
    packetIdsCanonicalSha256: DIGESTS.packets,
  };
  base.resolutions = [
    ...(base.resolutions as Json[]),
    {
      sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1",
      checkpointPacketId: "de_l01_c04_s32",
      canonicalSenseId: "de_lex_l01_c04_guten_tag_v1",
      firstIntroductionPacketId: null,
      firstScoredUsePacketId: null,
    },
  ];
  const sequence = base.sequence as RecordJson;
  sequence.eligibilityKind =
    "NEXT_ORDERED_SESSION_AFTER_REMAINING_277_ALLOCATIONS_AND_SEPARATE_TASK7_UNLOCK";
  return base;
}

function verifyInventoryPartition(inventory: RecordJson): void {
  const { plans, packets } = task5Ids();
  const resolutions = inventory.resolutions as RecordJson[];
  const resolved = resolutions.map((row) => row.sourcePlanId as string);
  const planSet = new Set(plans);
  if (plans.length !== 288 || new Set(plans).size !== 288)
    fail("guten_tag_v9_task5_partition");
  if (packets.length !== 1792 || new Set(packets).size !== 1792)
    fail("guten_tag_v9_packet_partition");
  if (resolved.length !== 11 || new Set(resolved).size !== 11)
    fail("guten_tag_v9_resolution_partition");
  if (resolved.some((id) => !planSet.has(id)))
    fail("guten_tag_v9_resolution_unknown");
  const resolvedSet = new Set(resolved);
  const unresolved = plans.filter((id) => !resolvedSet.has(id));
  if (unresolved.length !== 277) fail("guten_tag_v9_resolution_partition");
  const actual = inventory.inventoryDigests as RecordJson;
  exact(
    actual,
    {
      task5PlanIdsCanonicalSha256: hashCanonicalBody(plans),
      resolvedPlanIdsCanonicalSha256: hashCanonicalBody(resolved),
      unresolvedPlanIdsCanonicalSha256: hashCanonicalBody(unresolved),
      packetIdsCanonicalSha256: hashCanonicalBody(packets),
    },
    "guten_tag_v9_inventory_digests",
  );
  exact(
    actual,
    {
      task5PlanIdsCanonicalSha256: DIGESTS.task5,
      resolvedPlanIdsCanonicalSha256: DIGESTS.resolved,
      unresolvedPlanIdsCanonicalSha256: DIGESTS.unresolved,
      packetIdsCanonicalSha256: DIGESTS.packets,
    },
    "guten_tag_v9_inventory_digests",
  );
}

const safeRelative = (relative: unknown, code: string): string => {
  if (typeof relative !== "string") return fail(code);
  const value: string = relative;
  if (
    value.length === 0 ||
    path.isAbsolute(value) ||
    value.includes("\\") ||
    value.split("/").includes("..") ||
    /^[a-zA-Z]:/u.test(value)
  )
    fail(code);
  const resolved = path.resolve(ROOT, value);
  const prefix = `${ROOT}${path.sep}`;
  if (!resolved.startsWith(prefix)) fail(code);
  let cursor = resolved;
  while (cursor.startsWith(prefix) && cursor !== ROOT) {
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink())
      fail(code);
    cursor = path.dirname(cursor);
  }
  return value;
};

const decodeStrict = (buffer: Buffer, code: string): string => {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return fail(code);
  }
  if (text.includes("\u0000") || /\u001b\[[0-9;]*[A-Za-z]/u.test(text))
    fail(code);
  return text;
};

function diagnosticFacts(text: string): {
  total: number;
  transaction: number;
  codes: number[];
} {
  const headers: { file: string | null; code: number }[] = [];
  for (const line of text.split(/\r?\n/u)) {
    if (!line.includes("error TS")) continue;
    const file = /^(.+)\((\d+),(\d+)\): error TS(\d+):/u.exec(line);
    const global = /^error TS(\d+):/u.exec(line);
    if (file !== null)
      headers.push({
        file: file[1].replaceAll("\\", "/"),
        code: Number(file[4]),
      });
    else if (global !== null)
      headers.push({ file: null, code: Number(global[1]) });
    else fail("guten_tag_v9_typescript_ambiguous_diagnostic");
  }
  const transaction = headers.filter(
    (item) =>
      item.file !== null &&
      TRANSACTION_PATHS.includes(
        item.file as (typeof TRANSACTION_PATHS)[number],
      ),
  ).length;
  return {
    total: headers.length,
    transaction,
    codes: [...new Set(headers.map((item) => item.code))].sort((a, b) => a - b),
  };
}

function validateRun(
  value: unknown,
  kind: "focused" | "repository",
  overrides: GateOverrides,
): void {
  const run = exactKeys(
    value,
    [
      "executable",
      "argv",
      "cwdRelative",
      "env",
      "exitCode",
      "outcome",
      "log",
      "diagnostics",
    ],
    "guten_tag_v9_typescript_schema",
  );
  if (run.executable !== "node" || run.cwdRelative !== ".")
    fail("guten_tag_v9_typescript_command");
  const expectedArgv =
    kind === "focused"
      ? [
          "node_modules/typescript/bin/tsc",
          "--noEmit",
          "--pretty",
          "false",
          "--skipLibCheck",
          "--esModuleInterop",
          "--module",
          "commonjs",
          "--target",
          "es2022",
          "--moduleResolution",
          "node",
          PATHS.module,
          PATHS.gate,
        ]
      : ["node_modules/typescript/bin/tsc", "--noEmit", "--pretty", "false"];
  exact(run.argv, expectedArgv, "guten_tag_v9_typescript_command");
  exact(
    run.env,
    kind === "focused" ? {} : { NODE_OPTIONS: "--max-old-space-size=8192" },
    "guten_tag_v9_typescript_command",
  );
  const log = exactKeys(
    run.log,
    ["path", "sha256", "bytes"],
    "guten_tag_v9_typescript_schema",
  );
  const expectedPath =
    kind === "focused" ? PATHS.focusedLog : PATHS.repositoryLog;
  if (
    safeRelative(log.path, "guten_tag_v9_typescript_log_path") !== expectedPath
  )
    fail("guten_tag_v9_typescript_log_path");
  const overrideKey = kind === "focused" ? "focusedLog" : "repositoryLog";
  const raw =
    overrides[overrideKey] === undefined
      ? bytes(expectedPath)
      : fs.readFileSync(overrides[overrideKey] as string);
  if (
    sha(raw) !== log.sha256 ||
    raw.length !== log.bytes ||
    !HASH.test(String(log.sha256))
  ) {
    fail("guten_tag_v9_typescript_log_integrity");
  }
  const facts = diagnosticFacts(
    decodeStrict(raw, "guten_tag_v9_typescript_log_utf8"),
  );
  const diagnostics = exactKeys(
    run.diagnostics,
    ["total", "transaction", "codes"],
    "guten_tag_v9_typescript_schema",
  );
  exact(diagnostics, facts, "guten_tag_v9_typescript_diagnostics");
  if (facts.transaction !== 0)
    fail("guten_tag_v9_typescript_transaction_diagnostic");
  if (kind === "focused") {
    if (run.exitCode !== 0 || run.outcome !== "PASS" || facts.total !== 0)
      fail("guten_tag_v9_typescript_focused");
  } else if (
    (run.exitCode === 0 && (run.outcome !== "PASS" || facts.total !== 0)) ||
    (run.exitCode !== 0 &&
      (run.outcome !== "BASELINE_DIAGNOSTICS_OUTSIDE_TRANSACTION" ||
        facts.total === 0))
  )
    fail("guten_tag_v9_typescript_repository");
}

function validateTypeScriptEvidence(
  value: unknown,
  overrides: GateOverrides,
): void {
  const evidence = exactKeys(
    value,
    [
      "schemaVersion",
      "status",
      "provenance",
      "sourceSnapshot",
      "transactionPaths",
      "focusedRun",
      "repositoryRun",
    ],
    "guten_tag_v9_typescript_schema",
  );
  if (
    evidence.schemaVersion !==
      "learning-v2-de-guten-tag-v9-typescript-evidence.v1" ||
    evidence.status !== "PENDING_INDEPENDENT_REVIEW" ||
    evidence.provenance !== "LOCAL_CAPTURE_NOT_IMMUTABLE_EXTERNAL_RUNNER"
  )
    fail("guten_tag_v9_typescript_schema");
  exact(
    evidence.transactionPaths,
    TRANSACTION_PATHS,
    "guten_tag_v9_typescript_transaction_paths",
  );
  const snapshot = exactKeys(
    evidence.sourceSnapshot,
    ["rootRelative", "files"],
    "guten_tag_v9_typescript_schema",
  );
  if (snapshot.rootRelative !== ".") fail("guten_tag_v9_typescript_schema");
  const expectedFiles = [
    PATHS.task6V9,
    PATHS.inventoryV9,
    PATHS.module,
    PATHS.gate,
    PATHS.capture,
    PATHS.manifest,
  ].map((relative) => ({ path: relative, sha256: sha(bytes(relative)) }));
  exact(
    snapshot.files,
    expectedFiles,
    "guten_tag_v9_typescript_source_snapshot",
  );
  validateRun(evidence.focusedRun, "focused", overrides);
  validateRun(evidence.repositoryRun, "repository", overrides);
}

function expectedManifest(): RecordJson {
  const inputs = Object.entries(PINNED_HASHES).map(([relative, sha256]) => ({
    path: relative,
    sha256,
  }));
  const outputs = [
    PATHS.task6V9,
    PATHS.inventoryV9,
    PATHS.module,
    PATHS.gate,
    PATHS.capture,
  ].map((relative) => ({ path: relative, sha256: sha(bytes(relative)) }));
  return {
    schemaVersion:
      "learning-v2-de-guten-tag-v9-fail-closed-reconciliation-manifest.v1",
    status: "PENDING_INDEPENDENT_REVIEW",
    provenance: "LOCAL_WORKTREE_NOT_IMMUTABLE_EXTERNAL_RUNNER",
    inputs,
    outputs,
    rejectedAudits: rejectedAudits(),
    authority: CLOSED_AUTHORITY,
  };
}

export function receiptRecord(): RecordJson {
  const evidence = json(PATHS.typescriptEvidence);
  return {
    schemaVersion:
      "learning-v2-de-guten-tag-v9-fail-closed-reconciliation-receipt.v1",
    status: "PENDING_INDEPENDENT_REVIEW",
    provenance: "LOCAL_WORKTREE_NOT_IMMUTABLE_EXTERNAL_RUNNER",
    independentReview: "PENDING",
    adversarialReview: "PENDING",
    closure: "NOT_CREATED",
    authority: CLOSED_AUTHORITY,
    inventory: {
      task5PlanIds: 288,
      resolvedPlanIds: 11,
      unresolvedPlanIds: 277,
      packetIds: 1792,
      materializedPackets: 0,
    },
    digests: DIGESTS,
    artifacts: [
      PATHS.task6V9,
      PATHS.inventoryV9,
      PATHS.module,
      PATHS.gate,
      PATHS.capture,
      PATHS.manifest,
      PATHS.typescriptEvidence,
      PATHS.focusedLog,
      PATHS.repositoryLog,
    ].map((relative) => ({ path: relative, sha256: sha(bytes(relative)) })),
    rejectedAudits: rejectedAudits(),
    typescript: {
      focused: evidence.focusedRun,
      repository: evidence.repositoryRun,
    },
  };
}

export function renderReceipt(): string {
  const machine = JSON.stringify(receiptRecord(), null, 2).replace(
    /"codes": \[\n((?:\s+\d+,?\n)+)\s+\]/gu,
    (_match, rows: string) =>
      `"codes": [${[...rows.matchAll(/\d+/gu)].map((item) => item[0]).join(", ")}]`,
  );
  return [
    "# German Learning V2 — Guten Tag V9 fail-closed reconciliation",
    "",
    "Status: `PENDING_INDEPENDENT_REVIEW`.",
    "",
    "This local receipt records a fail-closed V9 reconciliation from the closed V6 authority. It grants no Task 7, preauthoring, learner-facing, release, phrase, cutover, default-consumer, or owner authority.",
    "",
    "```json",
    machine,
    "```",
    "",
  ].join("\n");
}

function validateReceipt(raw: string): void {
  const matches = [...raw.matchAll(/```json\n([\s\S]*?)\n```/gu)];
  if (matches.length !== 1) fail("guten_tag_v9_receipt_machine_block");
  let parsed: unknown;
  try {
    parsed = JSON.parse(matches[0][1]);
  } catch {
    fail("guten_tag_v9_receipt_machine_block");
  }
  exact(parsed, receiptRecord(), "guten_tag_v9_receipt_record");
  if (raw !== renderReceipt()) fail("guten_tag_v9_receipt_bytes");
  const prose = raw.replace(matches[0][0], "");
  if (/\b(?:PASS|CLOSED|APPROVED|AUTHORIZED)\b/u.test(prose)) {
    fail("guten_tag_v9_receipt_authority_word");
  }
}

export type GateOverrides = Partial<
  Record<
    | "task6V9"
    | "inventoryV9"
    | "manifest"
    | "typescriptEvidence"
    | "focusedLog"
    | "repositoryLog"
    | "receipt",
    string
  >
>;

const readOverride = (
  key: keyof GateOverrides,
  overrides: GateOverrides,
): Buffer =>
  overrides[key] === undefined
    ? bytes(PATHS[key])
    : fs.readFileSync(overrides[key] as string);
const jsonOverride = (
  key: keyof GateOverrides,
  overrides: GateOverrides,
): RecordJson =>
  JSON.parse(readOverride(key, overrides).toString("utf8")) as RecordJson;

export function validateGutenTagV9(overrides: GateOverrides = {}): void {
  verifyPinned();
  const task6Raw = readOverride("task6V9", overrides);
  const task6 = JSON.parse(task6Raw.toString("utf8")) as RecordJson;
  exact(task6, expectedTask6(), "guten_tag_v9_task6_body");
  const inventory = jsonOverride("inventoryV9", overrides);
  exact(
    inventory,
    expectedInventory(sha(task6Raw)),
    "guten_tag_v9_inventory_body",
  );
  verifyInventoryPartition(inventory);
  exact(
    jsonOverride("manifest", overrides),
    expectedManifest(),
    "guten_tag_v9_manifest",
  );
  validateTypeScriptEvidence(
    jsonOverride("typescriptEvidence", overrides),
    overrides,
  );
  validateReceipt(readOverride("receipt", overrides).toString("utf8"));
  verifyPinned();
}

if (
  process.argv[1] !== undefined &&
  path.basename(process.argv[1]) ===
    "task6c_l01_guten_tag_v9_fail_closed_reconciliation_de_v1.ts"
) {
  try {
    validateGutenTagV9();
    console.log("guten_tag_v9_fail_closed_reconciliation: PASS");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
