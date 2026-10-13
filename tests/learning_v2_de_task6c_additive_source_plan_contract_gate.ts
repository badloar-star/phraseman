import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  parseGermanTask6cAdditiveAllocationContactRegistryDeV1,
  TASK6C_L01_C01_ADDITIVE_ALLOCATION_CONTACTS_DE_V1,
} from "../modules/learning-v2/curriculum/de/task6c_additive_source_plan_contract_de_v1";

type MutableContact = {
  id: string;
  sourcePlanId: string;
  canonicalSenseId: string;
  sourceChapterId: string;
  situationContextSignature: string;
  firstIntroductionPacketId: string;
  scoredContactId: string;
  scoredPacketId: string;
  contactStatus: string;
};
type MutableRegistry = {
  schemaVersion: string;
  status: string;
  task7Unlock: boolean;
  canonicalPromotion: boolean;
  learnerFacingAuthority: boolean;
  targetBinding: {
    lessonId: string;
    sourceChapterId: string;
    bindingStatus: string;
  };
  contacts: MutableContact[];
};

const registry = {
  schemaVersion: "learning-v2-german-task6c-additive-allocation-contacts.v1",
  status: "ADMITTED_FOR_TASK6C_ALLOCATION_ONLY",
  task7Unlock: false,
  canonicalPromotion: false,
  learnerFacingAuthority: false,
  targetBinding: {
    lessonId: "de_l01",
    sourceChapterId: "de_l01_c01",
    bindingStatus: "PLANNED_MAPPING_ONLY",
  },
  contacts: TASK6C_L01_C01_ADDITIVE_ALLOCATION_CONTACTS_DE_V1,
} as const;

const parsed = parseGermanTask6cAdditiveAllocationContactRegistryDeV1(registry);
assert.equal(parsed.status, "ADMITTED_FOR_TASK6C_ALLOCATION_ONLY");
assert.equal(parsed.task7Unlock, false);
assert.equal(parsed.canonicalPromotion, false);
assert.equal(parsed.learnerFacingAuthority, false);
assert.deepEqual(
  parsed.contacts.map((contact) => contact.sourcePlanId),
  ["de_lex_plan_task6c_l01_c01_haus_v1", "de_lex_plan_task6c_l01_c01_name_v1"],
);
assert.deepEqual(
  parsed.contacts.map((contact) => [
    contact.firstIntroductionPacketId,
    contact.scoredPacketId,
  ]),
  [
    ["de_l01_c01_s03", "de_l01_c01_s05"],
    ["de_l01_c01_s04", "de_l01_c01_s06"],
  ],
);

function rejects(
  mutate: (candidate: MutableRegistry) => void,
  expected: RegExp,
): void {
  const candidate: MutableRegistry = {
    schemaVersion: registry.schemaVersion,
    status: registry.status,
    task7Unlock: registry.task7Unlock,
    canonicalPromotion: registry.canonicalPromotion,
    learnerFacingAuthority: registry.learnerFacingAuthority,
    targetBinding: { ...registry.targetBinding },
    contacts: registry.contacts.map((contact) => ({ ...contact })),
  };
  mutate(candidate);
  assert.throws(
    () => parseGermanTask6cAdditiveAllocationContactRegistryDeV1(candidate),
    expected,
  );
}

rejects((candidate) => {
  candidate.schemaVersion = "learning-v2-german-task6c-additive-contacts.v0";
}, /task6c_additive_schema_version_invalid/u);
rejects((candidate) => {
  candidate.status = "ADMITTED_FOR_TASK6C_ALLOCATION";
}, /task6c_additive_status_invalid/u);
rejects((candidate) => {
  candidate.contacts[0].contactStatus = "ADMITTED";
}, /task6c_additive_contact_status_invalid/u);
const extraTopLevelKeyForgery: unknown = {
  ...registry,
  unauthorizedTopLevel: true,
};
assert.throws(
  () =>
    parseGermanTask6cAdditiveAllocationContactRegistryDeV1(
      extraTopLevelKeyForgery,
    ),
  /task6c_additive_closed_schema_invalid/u,
);
const extraTargetBindingKeyForgery: unknown = {
  ...registry,
  targetBinding: { ...registry.targetBinding, unauthorizedBinding: true },
};
assert.throws(
  () =>
    parseGermanTask6cAdditiveAllocationContactRegistryDeV1(
      extraTargetBindingKeyForgery,
    ),
  /task6c_additive_closed_schema_invalid/u,
);
rejects((candidate) => {
  candidate.targetBinding.sourceChapterId = "de_l01_c02";
}, /task6c_additive_target_chapter_mismatch/u);
rejects((candidate) => {
  candidate.contacts[0].sourceChapterId = "de_l01_c02";
}, /task6c_additive_contact_chapter_mismatch/u);
rejects((candidate) => {
  candidate.contacts[0].situationContextSignature =
    "arrival-departure-shared-stairwell";
}, /task6c_additive_contact_situation_mismatch/u);
rejects((candidate) => {
  candidate.contacts[0].firstIntroductionPacketId = "de_l01_c01_s06";
}, /task6c_additive_contact_not_before_scored/u);
rejects((candidate) => {
  candidate.contacts[0].scoredPacketId = "de_l01_c01_s03";
}, /task6c_additive_contact_same_packet_forbidden/u);
rejects((candidate) => {
  candidate.contacts[0].scoredPacketId = "de_l01_c01_s08";
}, /task6c_additive_contact_checkpoint_packet_forbidden/u);
rejects((candidate) => {
  candidate.contacts[0].scoredPacketId = "de_l01_c02_s09";
}, /task6c_additive_contact_packet_not_owned_by_chapter/u);
rejects((candidate) => {
  candidate.contacts[0].scoredContactId = "de_lex_plan_l01_c01_hallo_v1";
}, /task6c_additive_contact_must_be_additive_owned/u);
rejects((candidate) => {
  candidate.contacts[0].sourcePlanId = "de_lex_plan_l01_c01_hallo_v1";
}, /task6c_additive_contact_task5_collision/u);
rejects((candidate) => {
  candidate.task7Unlock = true;
}, /task6c_additive_task7_unlock_forbidden/u);
rejects((candidate) => {
  candidate.canonicalPromotion = true;
}, /task6c_additive_canonical_promotion_forbidden/u);
rejects((candidate) => {
  candidate.learnerFacingAuthority = true;
}, /task6c_additive_learner_authority_forbidden/u);
const learnerFieldForgery: unknown = {
  ...registry,
  contacts: [
    { ...registry.contacts[0], learnerPromptRu: "forged" },
    registry.contacts[1],
  ],
};
assert.throws(
  () =>
    parseGermanTask6cAdditiveAllocationContactRegistryDeV1(learnerFieldForgery),
  /task6c_additive_closed_schema_invalid/u,
);
rejects((candidate) => {
  candidate.contacts[1].sourcePlanId = candidate.contacts[0].sourcePlanId;
}, /task6c_additive_contact_duplicate_source_plan/u);
rejects((candidate) => {
  candidate.contacts[1].canonicalSenseId =
    candidate.contacts[0].canonicalSenseId;
}, /task6c_additive_contact_duplicate_canonical_sense/u);
rejects((candidate) => {
  candidate.contacts[1].id = candidate.contacts[0].id;
}, /task6c_additive_contact_duplicate_id/u);

const childCwd = fs.mkdtempSync(path.join(os.tmpdir(), "task6c-cwd-hostile-"));
const repoRoot = path.resolve(__dirname, "..");
const contractUrl = pathToFileURL(
  path.join(
    repoRoot,
    "modules/learning-v2/curriculum/de/task6c_additive_source_plan_contract_de_v1.ts",
  ),
).href;
const tsxImportUrl = pathToFileURL(
  path.join(repoRoot, "node_modules/tsx/dist/loader.mjs"),
).href;
const child = spawnSync(
  process.execPath,
  [
    "--import",
    tsxImportUrl,
    "--input-type=module",
    "--eval",
    `const namespace = await import(${JSON.stringify(contractUrl)});
     const contract = namespace.default ?? namespace;
     const parse = contract.parseGermanTask6cAdditiveAllocationContactRegistryDeV1;
     const contacts = contract.TASK6C_L01_C01_ADDITIVE_ALLOCATION_CONTACTS_DE_V1;
     const parsed = parse({ schemaVersion: "learning-v2-german-task6c-additive-allocation-contacts.v1", status: "ADMITTED_FOR_TASK6C_ALLOCATION_ONLY", task7Unlock: false, canonicalPromotion: false, learnerFacingAuthority: false, targetBinding: { lessonId: "de_l01", sourceChapterId: "de_l01_c01", bindingStatus: "PLANNED_MAPPING_ONLY" }, contacts });
     process.stdout.write(JSON.stringify(parsed.contacts.map((contact) => contact.id)));`,
  ],
  { cwd: childCwd, encoding: "utf8" },
);
fs.rmSync(childCwd, { recursive: true, force: true });
assert.equal(child.status, 0, `non-root CWD import failed: ${child.stderr}`);
assert.deepEqual(JSON.parse(child.stdout), [
  "de_task6c_contact_l01_c01_haus_s05_v1",
  "de_task6c_contact_l01_c01_name_s06_v1",
]);

process.stdout.write(
  "TASK6C_ADDITIVE_CONTACT_TRANSPORT status=ALLOCATION_ONLY task7=false canonical=false learner=false hostile=PASS\n",
);
