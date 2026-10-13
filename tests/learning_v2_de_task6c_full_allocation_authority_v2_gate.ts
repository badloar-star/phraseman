import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  isGermanTask7V2AuthorityMigrationHoldDeV2,
  loadGermanTask7V2AuthorityMigrationHoldDeV2,
  parseGermanTask7V2AllocationInventoryDeV2,
  validateGermanTask7V2InventoryAgainstSourcesForAuditDeV2,
} from "../modules/learning-v2/curriculum/de/task6c_full_allocation_authority_de_v2";

type JsonRecord = Record<string, any>;

const ROOT = process.cwd();
const INVENTORY_PATH =
  "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json";
const TASK5_PATH =
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json";
const TASK6_PATH =
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v2.json";
const MODULE_PATH =
  "modules/learning-v2/curriculum/de/task6c_full_allocation_authority_de_v2.ts";
const GATE_PATH =
  "tests/learning_v2_de_task6c_full_allocation_authority_v2_gate.ts";
const RECEIPT_PATH =
  "docs/v2/curriculum/de/TASK7_V2_AUTHORITY_MIGRATION_RECEIPT_2026-10-12.md";

function readJson(relativePath: string): JsonRecord {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, relativePath), "utf8"),
  ) as JsonRecord;
}

function sha256(relativePath: string): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest("hex");
}

const inventorySource = readJson(INVENTORY_PATH);
const task5Source = readJson(TASK5_PATH);
const task6Source = readJson(TASK6_PATH);
const inventory = parseGermanTask7V2AllocationInventoryDeV2(inventorySource);

assert.equal(inventory.status, "V2_AUTHORITY_MIGRATED_PARTIAL");
assert.deepEqual(inventory.counts, {
  task5PlanIds: 288,
  resolvedPlanIds: 6,
  unresolvedPlanIds: 282,
  packetIds: 1792,
  materializedPackets: 0,
});
assert.equal(inventory.authority.classification, "PARTIAL_INVENTORY_ONLY");
assert.equal(inventory.authority.fullAllocationAuthority, false);
assert.equal(inventory.authority.preauthoringAuthority, false);
assert.equal(inventory.authority.ownerApproval, "NOT_REQUESTED_NOT_GRANTED");
assert.equal(inventory.authority.consumerCutover, "NONE");
assert.equal(inventory.authority.task7Unlock, false);
assert.equal(inventory.authority.learnerFacing, false);
assert.equal(inventory.authority.releaseAuthorized, false);
assert.equal(inventory.sequence.nextEligibleSessionId, "de_l01_s01");
assert.equal(inventory.sequence.currentlyMaterializable, false);
assert.deepEqual(inventory.sequence.prerequisiteLessonIds, []);
assert.equal(inventory.sequence.l02.sessionId, "de_l02_s01");
assert.equal(inventory.sequence.l02.eligibleFirst, false);
assert.equal(inventory.sequence.l02.blockedByLessonId, "de_l01");
assert.equal(inventory.resolutions.length, 6);
assert.equal(inventory.materializedPacketPaths.length, 0);

const audited = validateGermanTask7V2InventoryAgainstSourcesForAuditDeV2({
  inventory: inventorySource,
  task5V2: task5Source,
  task6V2: task6Source,
});
assert.deepEqual(audited, {
  status: "V2_AUTHORITY_MIGRATED_PARTIAL",
  task5PlanIds: 288,
  resolvedPlanIds: 6,
  unresolvedPlanIds: 282,
  packetIds: 1792,
  materializedPackets: 0,
  nextEligibleSessionId: "de_l01_s01",
  task7Unlock: false,
  learnerFacing: false,
  releaseAuthorized: false,
});

const loaded = loadGermanTask7V2AuthorityMigrationHoldDeV2();
assert.equal(isGermanTask7V2AuthorityMigrationHoldDeV2(loaded), true);
assert.deepEqual(loaded, {
  status: "V2_AUTHORITY_MIGRATED_PARTIAL",
  authority: "HOLD",
  task5PlanIds: 288,
  resolvedPlanIds: 6,
  unresolvedPlanIds: 282,
  packetIds: 1792,
  materializedPackets: 0,
  nextEligibleSessionId: "de_l01_s01",
  currentlyMaterializable: false,
  task7Unlock: false,
  learnerFacing: false,
  releaseAuthorized: false,
});

assert.throws(
  () => loadGermanTask7V2AuthorityMigrationHoldDeV2({ ownerApproval: true }),
  /task7_v2_caller_supplied_authority_forbidden/u,
);

function hostileInventory(
  mutate: (value: JsonRecord) => void,
  expected: RegExp,
): void {
  const value = structuredClone(inventorySource);
  mutate(value);
  assert.throws(
    () => parseGermanTask7V2AllocationInventoryDeV2(value),
    expected,
  );
}

hostileInventory((value) => {
  value.sourceBindings.task5V2.path =
    "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json";
}, /task7_v2_task5_binding/u);

hostileInventory((value) => {
  value.sourceBindings.task5V2.byteSha256 =
    "494abd91c59c88ed652b3b4cdaaeaa118bc53ef64beb57ff54f735433612eb29";
}, /task7_v2_task5_binding/u);

hostileInventory((value) => {
  value.counts.resolvedPlanIds = 7;
  value.counts.unresolvedPlanIds = 281;
}, /task7_v2_counts/u);

hostileInventory((value) => {
  value.resolutions[1].canonicalSenseId = value.resolutions[0].canonicalSenseId;
}, /task7_v2_duplicate_sense/u);

hostileInventory((value) => {
  value.authority.classification = "FULL_ALLOCATION_AUTHORITY";
  value.authority.fullAllocationAuthority = true;
}, /task7_v2_partial_brand/u);

hostileInventory((value) => {
  value.authority.preauthoringAuthority = true;
}, /task7_v2_preauthoring_forbidden/u);

hostileInventory((value) => {
  value.authority.consumerCutover = "V2_DEFAULT";
}, /task7_v2_cutover_forbidden/u);

hostileInventory((value) => {
  value.authority.ownerApproval = "GRANTED";
}, /task7_v2_owner_approval_forbidden/u);

hostileInventory((value) => {
  value.sequence.nextEligibleSessionId = "de_l02_s01";
  value.sequence.l02.eligibleFirst = true;
}, /task7_v2_l01_prerequisite/u);

hostileInventory((value) => {
  const wohnen = value.resolutions.find(
    (row: JsonRecord) => row.sourcePlanId === "de_lex_plan_l02_c01_wohnen_v1",
  );
  wohnen.firstIntroductionPacketId = "de_l02_c01_s08";
}, /task7_v2_checkpoint_as_first_introduction/u);

const missingPacketTask5 = structuredClone(task5Source);
missingPacketTask5.lessons[0].chapters[0].packetIds.pop();
assert.throws(
  () =>
    validateGermanTask7V2InventoryAgainstSourcesForAuditDeV2({
      inventory: inventorySource,
      task5V2: missingPacketTask5,
      task6V2: task6Source,
    }),
  /task7_v2_packet_inventory/u,
);

const missingPlanTask5 = structuredClone(task5Source);
missingPlanTask5.lessons[0].chapters[0].checkpoint.plannedNewLexicalSenses.pop();
assert.throws(
  () =>
    validateGermanTask7V2InventoryAgainstSourcesForAuditDeV2({
      inventory: inventorySource,
      task5V2: missingPlanTask5,
      task6V2: task6Source,
    }),
  /task7_v2_plan_inventory/u,
);

function hostileTask6(mutate: (value: JsonRecord) => void): void {
  const value = structuredClone(task6Source);
  mutate(value);
  assert.throws(
    () =>
      validateGermanTask7V2InventoryAgainstSourcesForAuditDeV2({
        inventory: inventorySource,
        task5V2: task5Source,
        task6V2: value,
      }),
    /task7_v2_task6_canonical_semantics/u,
  );
}

hostileTask6((value) => {
  value.registry.lexicalSenses.find(
    (row: JsonRecord) => row.id === "de_lex_l01_c01_nachbarin_v1",
  ).nounGender = "der";
});

hostileTask6((value) => {
  value.registry.lexicalSenses.find(
    (row: JsonRecord) => row.id === "de_lex_l02_c01_wohnen_v1",
  ).senseGloss = "temporary lodging";
});

hostileTask6((value) => {
  value.authorityContext.lexicalMappings
    .find(
      (row: JsonRecord) => row.sourcePlanId === "de_lex_plan_l02_c01_wohnen_v1",
    )
    .plannedUsePacketIds.push("de_l02_c01_s07");
});

const receipt = fs.readFileSync(path.join(ROOT, RECEIPT_PATH), "utf8");
function receiptBinding(receiptText: string, label: string): string {
  const match = new RegExp(`<!-- ${label}: ([a-f0-9]{64}) -->`, "u").exec(
    receiptText,
  );
  assert.ok(match, `task7_v2_receipt_binding_missing:${label}`);
  return match[1];
}

function validateReceiptBindings(receiptText: string): void {
  const bindings = [
    ["TASK7_V2_MODULE_SHA256", MODULE_PATH],
    ["TASK7_V2_INVENTORY_SHA256", INVENTORY_PATH],
    ["TASK7_V2_GATE_SHA256", GATE_PATH],
    [
      "TASK7_V2_DRY_RUN_SCRIPT_SHA256",
      "scripts/learning-v2-de-materialize-packets-v2.mjs",
    ],
    [
      "TASK7_V2_DRY_RUN_GATE_SHA256",
      "tests/learning_v2_de_materializer_allocation_authority_v2_gate.ts",
    ],
  ] as const;
  for (const [label, filePath] of bindings) {
    if (receiptBinding(receiptText, label) !== sha256(filePath)) {
      throw new Error(`task7_v2_receipt_${label.toLowerCase()}_binding`);
    }
  }
}

validateReceiptBindings(receipt);
assert.throws(
  () =>
    validateReceiptBindings(
      receipt.replace(
        receiptBinding(receipt, "TASK7_V2_DRY_RUN_SCRIPT_SHA256"),
        "0".repeat(64),
      ),
    ),
  /task7_v2_receipt_task7_v2_dry_run_script_sha256_binding/u,
);
assert.match(receipt, /V2_AUTHORITY_MIGRATED_PARTIAL/u);
assert.match(receipt, /exactly 6 resolved and 282 unresolved/u);
assert.match(receipt, /0 of 1792 packets materialized/u);
assert.match(receipt, /de_l01_s01/u);
assert.match(receipt, /L01 prerequisite/u);
assert.match(receipt, /NOT_SELF_AUTHENTICATING/u);
assert.match(receipt, /task7Unlock=false/u);
assert.match(receipt, /learnerFacing=false/u);
assert.match(receipt, /releaseAuthorized=false/u);
assert.doesNotMatch(receipt, /OWNER_APPROVED|FULL_ALLOCATION_AUTHORITY/u);

process.stdout.write(
  "TASK7_V2_AUTHORITY_MIGRATION_GATE PASS status=V2_AUTHORITY_MIGRATED_PARTIAL plans=288 resolved=6 unresolved=282 packets=1792 materialized=0 next=de_l01_s01 task7Unlock=false learner=false release=false\n",
);
