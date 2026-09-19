import assert from "node:assert/strict";

import {
  GERMAN_OWNER_DECISIONS_CONTRACT_DE_V1,
  validateGermanOwnerDecisionsContractDeV1,
} from "../modules/learning-v2/curriculum/de/owner_decisions_contract_de_v1";

const contract = GERMAN_OWNER_DECISIONS_CONTRACT_DE_V1;

assert.equal(contract.blueprintApproval, "PENDING");
assert.deepEqual(contract.confirmed.production, {
  standard: "Standarddeutsch",
  baseline: "Germany Standard",
});
assert.deepEqual(contract.confirmed.interfaceLocales, ["ru", "uk"]);
assert.deepEqual(contract.confirmed.regionalVariants, {
  austria: "RECEPTIVE_LABELLED",
  switzerland: "RECEPTIVE_LABELLED",
  dialects: "EXCLUDED_FROM_PRODUCTION",
});
assert.deepEqual(contract.confirmed.curriculum, {
  blueprint: "NATIVE_GERMAN_GRAMMAR_FIRST",
  englishProgression: "NOT_CLONED",
});
assert.deepEqual(contract.confirmed.progression, {
  entry: "PRE_A1 / zero beginner",
  exit: "functional B1",
  certification: "NOT_PROMISED",
});
assert.deepEqual(contract.confirmed.judgeRecenter, {
  freshness: "EACH_SESSION",
  phases: ["PRE_AUTHOR", "POST_AUTHOR", "RELEASE_PROJECTION"],
});

assert.deepEqual(contract.pending, [
  {
    id: "DE-OWNER-PENDING-001",
    status: "PENDING",
    subject: "DACH receptive inventory",
  },
  {
    id: "DE-OWNER-PENDING-002",
    status: "PENDING",
    subject: "Goethe B1 cross-check",
  },
]);

assert.throws(
  () => validateGermanOwnerDecisionsContractDeV1({ ...contract, inventedApproval: "APPROVED" }),
  /unknown_key:inventedApproval/u,
);
assert.throws(
  () => validateGermanOwnerDecisionsContractDeV1({
    ...contract,
    confirmed: {
      ...contract.confirmed,
      regionalVariants: { ...contract.confirmed.regionalVariants, dialects: "ALLOWED" },
    },
  }),
  /confirmed_regional_variants_invalid/u,
);
assert.throws(
  () => validateGermanOwnerDecisionsContractDeV1({
    ...contract,
    confirmed: {
      ...contract.confirmed,
      curriculum: { ...contract.confirmed.curriculum, englishProgression: "CLONED" },
    },
  }),
  /confirmed_curriculum_invalid/u,
);
assert.throws(
  () => validateGermanOwnerDecisionsContractDeV1({
    ...contract,
    confirmed: {
      ...contract.confirmed,
      judgeRecenter: { freshness: "EACH_SESSION", phases: ["PRE_AUTHOR", "POST_AUTHOR"] },
    },
  }),
  /confirmed_judge_recenter_invalid/u,
);
assert.throws(
  () => validateGermanOwnerDecisionsContractDeV1({
    ...contract,
    pending: [
      { ...contract.pending[0], status: "OWNER_APPROVED" },
      contract.pending[1],
    ],
  }),
  /pending_status_invalid:DE-OWNER-PENDING-001/u,
);
assert.throws(
  () => validateGermanOwnerDecisionsContractDeV1({
    ...contract,
    confirmed: { ...contract.confirmed, approval: "APPROVED" },
  }),
  /unknown_key:approval/u,
);

const inheritedApproval = Object.assign(
  Object.create({ blueprintApproval: "PENDING" }),
  { confirmed: contract.confirmed, pending: contract.pending },
);
assert.throws(
  () => validateGermanOwnerDecisionsContractDeV1(inheritedApproval),
  /plain_record_required:root/u,
);

const localesWithApproval = [...contract.confirmed.interfaceLocales] as string[] & { approval?: string };
localesWithApproval.approval = "APPROVED";
assert.throws(
  () => validateGermanOwnerDecisionsContractDeV1({
    ...contract,
    confirmed: { ...contract.confirmed, interfaceLocales: localesWithApproval },
  }),
  /array_unknown_key:interfaceLocales:approval/u,
);

process.stdout.write("LEARNING V2 GERMAN OWNER DECISIONS GATE: PASS\n");
