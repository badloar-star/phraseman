import assert from "node:assert/strict";
import {
  __testOnlyCreateGermanTask6cFullAllocationAuthorityDeV1,
  __testOnlyReadGermanTask6cProductionAuthoritySummaryDeV1,
  __testOnlyValidateGermanTask6cFullAllocationDeV1,
  isGermanTask6cValidatedFullAllocationForTask7DryRunDeV1,
  loadGermanTask6cValidatedFullAllocationForTask7DryRunDeV1,
  parseGermanTask6cFullAllocationProposalDeV1,
} from "../modules/learning-v2/curriculum/de/task6c_full_allocation_authority_de_v1";

const productionAuthoritySummary =
  __testOnlyReadGermanTask6cProductionAuthoritySummaryDeV1();
assert.equal(
  __testOnlyReadGermanTask6cProductionAuthoritySummaryDeV1.length,
  0,
  "production_authority_summary_must_accept_no_caller_evidence",
);
assert.deepEqual(productionAuthoritySummary, {
  packetCount: 1792,
  task5Count: 288,
  admittedAdditiveCount: 2,
  admittedAdditiveInputs: [
    {
      sourcePlanId: "de_lex_plan_task6c_l01_c01_haus_v1",
      canonicalSenseId: "de_lex_task6c_l01_c01_haus_v1",
      firstIntroductionPacketId: "de_l01_c01_s03",
      scoredPacketId: "de_l01_c01_s05",
    },
    {
      sourcePlanId: "de_lex_plan_task6c_l01_c01_name_v1",
      canonicalSenseId: "de_lex_task6c_l01_c01_name_v1",
      firstIntroductionPacketId: "de_l01_c01_s04",
      scoredPacketId: "de_l01_c01_s06",
    },
  ],
  canonicalPromotion: false,
  task7Unlock: false,
  learnerFacingAuthority: false,
  releaseAuthority: false,
});
assert.ok(Object.isFrozen(productionAuthoritySummary));
assert.ok(Object.isFrozen(productionAuthoritySummary.admittedAdditiveInputs));
assert.ok(
  productionAuthoritySummary.admittedAdditiveInputs.every(Object.isFrozen),
);
assert.deepEqual(
  Object.getOwnPropertySymbols(productionAuthoritySummary),
  [],
  "production_summary_must_not_expose_private_brand",
);
assert.equal(
  "admittedAdditives" in productionAuthoritySummary,
  false,
  "production_summary_must_not_expose_internal_map",
);
const productionAuthoritySummaryAsJavaScript =
  __testOnlyReadGermanTask6cProductionAuthoritySummaryDeV1 as unknown as (
    ...args: unknown[]
  ) => typeof productionAuthoritySummary;
assert.deepEqual(
  productionAuthoritySummaryAsJavaScript({
    rowsAdmitted: 999,
    task7Unlock: true,
  }),
  productionAuthoritySummary,
  "caller_arguments_must_not_supply_authority",
);

const proposal = {
  authorityVersion: "learning-v2-german-task6c-packet-lexical-allocation.v1",
  allocationStatus: "PROPOSED_NOT_CANONICAL",
  canonicalRegistryStatus: "NOT_CANONICAL",
  task7Unlock: false,
  sourceIdentities: {
    task5ChapterBlueprints: {
      path: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
      canonicalSha256:
        "e70ef798e06dfa752e9faace47282300a4fd43f8acaf158b2f608a8225f8cf90",
    },
  },
  coverageRequirement: {
    packetCount: 1792,
    minimumNewSensesPerPacket: 1,
    maximumNewSensesPerPacket: 5,
  },
  allocations: [],
} as const;

assert.equal(
  loadGermanTask6cValidatedFullAllocationForTask7DryRunDeV1.length,
  0,
  "task6c_full_authority_loader_must_be_zero_arg",
);
assert.throws(
  () => loadGermanTask6cValidatedFullAllocationForTask7DryRunDeV1(),
  /TASK7_FULL_ALLOCATION_AUTHORITY_PARTIAL|TASK7_FULL_ALLOCATION_AUTHORITY_UNAVAILABLE/u,
  "current_unadmitted_full_registry_must_not_brand",
);

const parsed = parseGermanTask6cFullAllocationProposalDeV1(proposal);
assert.ok(Object.isFrozen(parsed), "untrusted_proposal_is_immutable_snapshot");
assert.equal(parsed.task7Unlock, false);
assert.equal(
  isGermanTask6cValidatedFullAllocationForTask7DryRunDeV1({
    validationStatus: "VALIDATED_FOR_TASK7_DRY_RUN_ONLY",
    task7Unlock: false,
    releaseAuthority: false,
    learnerFacingAuthority: false,
    packetCount: 1792,
    allocationCount: 1792,
    allocation: parsed,
  }),
  false,
  "plain_object_cannot_forge_task7_dry_run_brand",
);
assert.throws(
  () =>
    parseGermanTask6cFullAllocationProposalDeV1({
      ...proposal,
      status: "READY",
    }),
  /task6c_full_allocation_unknown_field/u,
  "legacy_status_must_not_create_authority",
);
assert.throws(
  () =>
    parseGermanTask6cFullAllocationProposalDeV1({
      ...proposal,
      task7Unlock: true,
    }),
  /task6c_full_allocation_task7_unlock_forbidden/u,
  "unlock_must_be_rejected",
);
assert.throws(
  () =>
    parseGermanTask6cFullAllocationProposalDeV1({
      ...proposal,
      allocations: [
        {
          canonicalSenseId: "de_lex_fake_v1",
          firstIntroductionPacketId: "de_l01_c01_s01",
          sourceKind: "TASK5_CHECKPOINT",
          sourcePlanId: "de_lex_plan_fake_v1",
          evidenceStatus: "DIRECT_ADMITTED",
        },
      ],
    }),
  /task6c_full_allocation_row_unknown_field/u,
  "self_declared_evidence_must_be_rejected",
);

const testOnly = __testOnlyCreateGermanTask6cFullAllocationAuthorityDeV1();
const full = testOnly.proposal;
const validated = __testOnlyValidateGermanTask6cFullAllocationDeV1(
  full,
  testOnly.authority,
);
assert.equal(validated.packetCount, 1792, "test_only_full_topology_validates");
assert.equal(
  isGermanTask6cValidatedFullAllocationForTask7DryRunDeV1(validated),
  false,
  "test_only_validation_must_never_mint_production_brand",
);
const duplicateTask5 = structuredClone(full) as unknown as {
  allocations: { sourcePlanId: string }[];
};
duplicateTask5.allocations[1].sourcePlanId =
  duplicateTask5.allocations[0].sourcePlanId;
assert.throws(
  () =>
    __testOnlyValidateGermanTask6cFullAllocationDeV1(
      duplicateTask5,
      testOnly.authority,
    ),
  /TASK7_FULL_ALLOCATION_AUTHORITY_INVALID/u,
  "duplicate_task5_source_plan_rejected",
);
const additiveIndex = full.allocations.findIndex(
  (row) => row.sourceKind === "TASK6C_ADDITIVE",
);
const duplicateAdditive = structuredClone(full) as unknown as {
  allocations: { sourcePlanId: string }[];
};
duplicateAdditive.allocations[additiveIndex + 1].sourcePlanId =
  duplicateAdditive.allocations[additiveIndex].sourcePlanId;
assert.throws(
  () =>
    __testOnlyValidateGermanTask6cFullAllocationDeV1(
      duplicateAdditive,
      testOnly.authority,
    ),
  /TASK7_FULL_ALLOCATION_AUTHORITY_INVALID/u,
  "duplicate_additive_source_plan_rejected",
);
const crossKind = structuredClone(full) as unknown as {
  allocations: { sourcePlanId: string }[];
};
crossKind.allocations[additiveIndex].sourcePlanId =
  full.allocations[0].sourcePlanId;
assert.throws(
  () =>
    __testOnlyValidateGermanTask6cFullAllocationDeV1(
      crossKind,
      testOnly.authority,
    ),
  /TASK7_FULL_ALLOCATION_AUTHORITY_INVALID/u,
  "cross_kind_source_plan_collision_rejected",
);

process.stdout.write(
  "TASK6C_FULL_ALLOCATION_AUTHORITY zeroArg=true additiveInputs=2 partial=true forgedEvidence=REJECTED\n",
);
