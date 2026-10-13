import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type JsonRecord = Record<string, any>;

const ROOT = process.cwd();
const PATHS = Object.freeze({
  module:
    "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_positive_admission_de_v1.ts",
  task5: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v3.json",
  lexicalV6:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v6.json",
  task6V6:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v6.json",
  inventoryV6:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v6.json",
  evidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/lexical_evidence.json",
  extraction:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/extraction_map.json",
  manifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/manifest.json",
  lexicalV7:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v7.json",
  task6V7:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v7.json",
  inventoryV7:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v7.json",
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_GUTEN_TAG_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
} as const);

const IMMUTABLE_HASHES = Object.freeze({
  [PATHS.task5]:
    "5934f3f94e87f8b50481096732047c6c5c8591c34ce97c30d413d14519ce21fe",
  "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v2.json":
    "31934e35b5278c7a7e901d08e02da5398f3503825782acbb604d06de094726a5",
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v2.json":
    "ba4ddc48ce99aeb97788ba767e2179c507c8740be24446cbf6b4f9abf591681f",
  "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json":
    "db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415",
  "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v3.json":
    "475caad2f4a56a576301836c2bb4590061dd4536cd40553b1638ce605bfdbcbb",
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v3.json":
    "8f54a19fcaad578a374c06e3a4ecf5504ab761b1790a296056334aa35bf36862",
  "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v3.json":
    "702a491699774d2f0cc90c19755bc8747a0b1663ddd2e94f272b68d40ddc1d88",
  "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v4.json":
    "aa08ccd483fb2bebb43a3f2388940a5672708cc70b29e41dfb05e0d4a39bd120",
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v4.json":
    "65db4d567150c654c90c14d667811c8682136db753c602d12ed0f8b0808ee1c4",
  "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v4.json":
    "3abf18ea54a4b84f0386a75788b86f6e0c693b7f54819284c8f44237a407d4b6",
  "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v5.json":
    "4ed741cc0e457eff0c3500f98e6c8d62a33a951110d428ff1333075eca99a2c7",
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v5.json":
    "9bbf41335e13dff8f97be3bbd05f21284c99e62c31d5fcb63f7b5f0ab324af91",
  "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v5.json":
    "e1c01fa8ef727c23d128d07bbe5cf67f7c04c6539610817ba39b6e0b555fb3b4",
  [PATHS.lexicalV6]:
    "3d45077cba6f20e826ce3fa04732a91fec15d571ac9a0cb54923c8ec84c66e55",
  [PATHS.task6V6]:
    "63d65319b2f41dc6cb08e8e4e407fbf4a6ca71c061229da64a886c62ba9403bc",
  [PATHS.inventoryV6]:
    "e940b37e2ea29e479710dada185c8bc1466bb04b61176c8c839432eeaf392677",
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_final_review_closure_v1/closure.json":
    "7d12e8f92cc4f190a53cbd2a04463fbd04dde42d39063b704059400e8af0577c",
  "modules/learning-v2/curriculum/de/task7_v2_l01_c04_guten_tag_source_hold_de_v1.ts":
    "1804b07619e917f942e47f4518b4364a67150dfd16cdaf7e210aa2dfabaa68c0",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c04_guten_tag_source_hold_v1/manifest.json":
    "c253a9a16764f19804e320effefb5f4d9ff85e3ab1eb045f0f2aecb90dc8b7bb",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c04_guten_tag_source_hold_v1/extraction_map.json":
    "b72e8f7ef2e66170cdbba46f34fffe1efffcbe07bbcb93e410636b34bbac1db6",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c04_guten_tag_source_hold_v1/raw/goethe_a1_redemittel.pdf":
    "5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c04_guten_tag_source_hold_v1/raw/goethe_a1_redemittel.http_metadata.txt":
    "afa2a1f9de300071b9e885fb3ade745766b53d7f7bd5bee5732f188806db8f47",
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_seven_formulaic_v1/manifest.json":
    "2c3bca21dc11dee134979bacf64520cca3ce1dce1d0bd58b16657d2f75955e98",
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_seven_formulaic_v1/extraction_map.json":
    "4cb9d040275870fe6857b222c9bad26fab46646094994a7704bb9d9f0c93c3a7",
  "docs/v2/curriculum/de/task6c-l01-seven-formulaic-closure-v1/F.json":
    "48040a29b481c4c29f325f0f2529b95e6ef58e212196ac68298272a611c1e1be",
  "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts":
    "e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59",
  "modules/learning-v2/curriculum/en/course_blueprint_manifest_en_v2.ts":
    "bfcc82ba0300eba9f706bdd82e7b2a6a9d2b5a9ea18859bff2d451b39d7fe976",
});

const sha256 = (file: string): string =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, file)))
    .digest("hex");

assert.deepEqual(
  Object.fromEntries(
    Object.keys(IMMUTABLE_HASHES).map((file) => [file, sha256(file)]),
  ),
  IMMUTABLE_HASHES,
  "guten_tag_positive_live_input_drift",
);

if (!fs.existsSync(path.join(ROOT, PATHS.module))) {
  assert.fail(`guten_tag_positive_missing:${PATHS.module}`);
}

const { inspectGermanTask6cL01GutenTagPositiveAdmissionDeV1 } = require(
  `../${PATHS.module}`,
) as {
  inspectGermanTask6cL01GutenTagPositiveAdmissionDeV1: (
    options?: Record<string, string>,
  ) => unknown;
};

const missingMachineReceiptRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "de-guten-tag-v7-receipt-red-"),
);
try {
  const missingMachineReceipt = path.join(
    missingMachineReceiptRoot,
    "receipt-missing-machine-readable-tsc.md",
  );
  fs.writeFileSync(
    missingMachineReceipt,
    fs
      .readFileSync(path.join(ROOT, PATHS.receipt), "utf8")
      .replace(
        /\n<!-- guten-tag-positive-typescript-evidence-v1[\s\S]*?guten-tag-positive-typescript-evidence-v1 -->\n/u,
        "\n",
      ),
    "utf8",
  );
  assert.throws(
    () =>
      inspectGermanTask6cL01GutenTagPositiveAdmissionDeV1({
        receiptPathForTest: missingMachineReceipt,
      }),
    /guten_tag_positive_receipt_typescript/u,
  );
} finally {
  fs.rmSync(missingMachineReceiptRoot, { recursive: true, force: true });
}

assert.deepEqual(inspectGermanTask6cL01GutenTagPositiveAdmissionDeV1(), {
  status: "PASS",
  decision: "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION",
  admissionScope: "DWDS_D_1_1_GREETING_HALF_LEXICAL_ONLY",
  sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1",
  canonicalSenseId: "de_lex_l01_c04_guten_tag_v1",
  checkpointPacketId: "de_l01_c04_s32",
  firstIntroductionPacketId: null,
  phraseAuthority: false,
  resolvedPlanIds: 11,
  unresolvedPlanIds: 277,
  packetIds: 1792,
  materializedPackets: 0,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
});

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "de-guten-tag-v7-"));
const readJson = (key: keyof typeof PATHS): JsonRecord =>
  JSON.parse(
    fs.readFileSync(path.join(ROOT, PATHS[key]), "utf8"),
  ) as JsonRecord;
const writeJson = (name: string, value: unknown): string => {
  const target = path.join(tempRoot, name);
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return target;
};
const hostile = (
  option: string,
  file: keyof typeof PATHS,
  name: string,
  mutate: (value: JsonRecord) => void,
  expected: RegExp,
): void => {
  const value = readJson(file);
  mutate(value);
  assert.throws(
    () =>
      inspectGermanTask6cL01GutenTagPositiveAdmissionDeV1({
        [option]: writeJson(name, value),
      }),
    expected,
  );
};

try {
  hostile(
    "evidencePathForTest",
    "evidence",
    "d-1-2.json",
    (value) => {
      value.admittedSourceSenseAnchor = "d-1-2";
    },
    /guten_tag_positive_source_scope/u,
  );
  hostile(
    "evidencePathForTest",
    "evidence",
    "farewell.json",
    (value) => {
      value.exclusions.occasionalFarewellTailExcluded = false;
    },
    /guten_tag_positive_source_scope/u,
  );
  hostile(
    "evidencePathForTest",
    "evidence",
    "angry.json",
    (value) => {
      value.exclusions.rareAngryDismissalD12Excluded = false;
    },
    /guten_tag_positive_source_scope/u,
  );

  for (const field of [
    "neutralRegisterClaim",
    "formalRegisterClaim",
    "unqualifiedFormalAddressClaim",
  ] as const) {
    hostile(
      "evidencePathForTest",
      "evidence",
      `${field}.json`,
      (value) => {
        value.claimBoundaries[field] = true;
      },
      /guten_tag_positive_register/u,
    );
  }
  hostile(
    "evidencePathForTest",
    "evidence",
    "invent-register.json",
    (value) => {
      value.register = "neutral";
    },
    /guten_tag_positive_register/u,
  );
  hostile(
    "lexicalV7PathForTest",
    "lexicalV7",
    "lexical-register.json",
    (value) => {
      value.find(
        (row: JsonRecord) => row.id === "de_lex_l01_c04_guten_tag_v1",
      ).register = "formal";
    },
    /guten_tag_positive_lexical_scope/u,
  );

  for (const forbidden of [
    "morning",
    "evening",
    "night",
    "unrestricted_all_day",
  ]) {
    hostile(
      "evidencePathForTest",
      "evidence",
      `time-${forbidden}.json`,
      (value) => {
        value.timeOfDayScope.push(forbidden);
      },
      /guten_tag_positive_time_scope/u,
    );
  }

  hostile(
    "task6V7PathForTest",
    "task6V7",
    "phrase-frame.json",
    (value) => {
      value.registry.phraseFrames.push({
        id: "de_pf_l01_c04_guten_tag_v1",
        frame: "Guten Tag!",
        lexicalSenseIds: ["de_lex_l01_c04_guten_tag_v1"],
      });
    },
    /guten_tag_positive_phrase_forbidden/u,
  );
  hostile(
    "task6V7PathForTest",
    "task6V7",
    "phrase-link.json",
    (value) => {
      value.registry.phraseFrames[0].lexicalSenseIds.push(
        "de_lex_l01_c04_guten_tag_v1",
      );
    },
    /guten_tag_positive_phrase_forbidden/u,
  );
  hostile(
    "evidencePathForTest",
    "evidence",
    "addressee.json",
    (value) => {
      value.claimBoundaries.addresseeCompositionClaim = true;
    },
    /guten_tag_positive_phrase_forbidden/u,
  );

  hostile(
    "task6V7PathForTest",
    "task6V7",
    "intro.json",
    (value) => {
      value.authorityContext.lexicalMappings.at(-1).firstIntroductionPacketId =
        "de_l01_c04_s25";
    },
    /guten_tag_positive_plan_mapping/u,
  );
  hostile(
    "task6V7PathForTest",
    "task6V7",
    "scored.json",
    (value) => {
      value.authorityContext.lexicalMappings.at(-1).firstScoredUsePacketId =
        "de_l01_c04_s32";
    },
    /guten_tag_positive_plan_mapping/u,
  );
  hostile(
    "task6V7PathForTest",
    "task6V7",
    "outside.json",
    (value) => {
      value.authorityContext.lexicalMappings.at(-1).plannedUsePacketIds = [
        "de_l01_c04_s31",
        "de_l01_c04_s32",
      ];
    },
    /guten_tag_positive_plan_mapping/u,
  );

  for (const [file, option, target] of [
    ["task6V7", "task6V7PathForTest", "authority"],
    ["inventoryV7", "inventoryV7PathForTest", "authority"],
    ["manifest", "manifestPathForTest", "authority"],
    ["evidence", "evidencePathForTest", "authority"],
  ] as const) {
    for (const [field, replacement] of [
      ["task7Unlock", true],
      ["preauthoringAuthority", true],
      ["learnerFacing", true],
      ["releaseAuthorized", true],
      ["currentlyMaterializable", true],
      ["materializedPackets", 1],
      ["consumerCutover", "DEFAULT"],
      ["defaultConsumerChanged", true],
      ["ownerApproval", "GRANTED"],
    ] as const) {
      hostile(
        option,
        file,
        `${file}-${field}.json`,
        (value) => {
          value[target][field] = replacement;
        },
        /guten_tag_positive_(?:authority_boundary|manifest|evidence_scope)/u,
      );
    }
  }

  hostile(
    "inventoryV7PathForTest",
    "inventoryV7",
    "counts.json",
    (value) => {
      value.counts.resolvedPlanIds = 12;
    },
    /guten_tag_positive_inventory/u,
  );
  hostile(
    "extractionPathForTest",
    "extraction",
    "definition-hash.json",
    (value) => {
      value.dwds.extractions.d11Definition.sha256 = "0".repeat(64);
    },
    /guten_tag_positive_extraction/u,
  );
  hostile(
    "manifestPathForTest",
    "manifest",
    "source-binding.json",
    (value) => {
      value.sourceBindings.dwdsRaw.sha256 = "0".repeat(64);
    },
    /guten_tag_positive_manifest/u,
  );
  hostile(
    "manifestPathForTest",
    "manifest",
    "predecessor-binding.json",
    (value) => {
      value.predecessorBindings.lexicalV6.sha256 = "0".repeat(64);
    },
    /guten_tag_positive_manifest/u,
  );

  const receipt = fs.readFileSync(path.join(ROOT, PATHS.receipt), "utf8");
  const fakeGreen = path.join(tempRoot, "fake-green-receipt.md");
  fs.writeFileSync(
    fakeGreen,
    receipt.replace("Status: `PENDING_INDEPENDENT_REVIEW`", "Status: `PASS`"),
    "utf8",
  );
  assert.throws(
    () =>
      inspectGermanTask6cL01GutenTagPositiveAdmissionDeV1({
        receiptPathForTest: fakeGreen,
      }),
    /guten_tag_positive_receipt_boundary/u,
  );

  const machineFakeGreen = path.join(tempRoot, "machine-fake-green-receipt.md");
  fs.writeFileSync(
    machineFakeGreen,
    receipt.replace('"repositoryGreen": false', '"repositoryGreen": true'),
    "utf8",
  );
  assert.throws(
    () =>
      inspectGermanTask6cL01GutenTagPositiveAdmissionDeV1({
        receiptPathForTest: machineFakeGreen,
      }),
    /guten_tag_positive_receipt_typescript_repository_green/u,
  );

  const missingHeap = path.join(tempRoot, "missing-heap-receipt.md");
  fs.writeFileSync(
    missingHeap,
    receipt.replace('    "heapMb": 8192,\n', ""),
    "utf8",
  );
  assert.throws(
    () =>
      inspectGermanTask6cL01GutenTagPositiveAdmissionDeV1({
        receiptPathForTest: missingHeap,
      }),
    /guten_tag_positive_receipt_typescript_repository_reviewed_heap/u,
  );

  const wrongCommand = path.join(tempRoot, "wrong-command-receipt.md");
  fs.writeFileSync(
    wrongCommand,
    receipt.replace(
      '"command": "npx tsc --noEmit --pretty false"',
      '"command": "npx tsc --noEmit"',
    ),
    "utf8",
  );
  assert.throws(
    () =>
      inspectGermanTask6cL01GutenTagPositiveAdmissionDeV1({
        receiptPathForTest: wrongCommand,
      }),
    /guten_tag_positive_receipt_typescript_repository_reviewed_command/u,
  );

  const fakeOomSuccess = path.join(tempRoot, "fake-oom-success-receipt.md");
  fs.writeFileSync(
    fakeOomSuccess,
    receipt.replace('    "outcome": "OOM",', '    "outcome": "PASS",'),
    "utf8",
  );
  assert.throws(
    () =>
      inspectGermanTask6cL01GutenTagPositiveAdmissionDeV1({
        receiptPathForTest: fakeOomSuccess,
      }),
    /guten_tag_positive_receipt_typescript_oom_result/u,
  );
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

for (const command of [
  "node --import tsx tests/learning_v2_de_task6c_l01_briefkasten_positive_admission_gate.ts",
  "node --import tsx tests/learning_v2_de_task6c_l01_briefkasten_final_review_closure_gate.ts",
  "node --import tsx tests/learning_v2_de_task7_v2_l01_c04_guten_tag_source_hold_gate.ts",
  "node --import tsx tests/learning_v2_de_task6c_l01_seven_formulaic_gate.ts",
  "node --import tsx tests/learning_v2_de_task6c_l01_seven_formulaic_receipt_closure_gate.ts",
]) {
  const result = require("node:child_process").spawnSync(
    process.execPath,
    command.split(" ").slice(1),
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.equal(
    result.status,
    0,
    `${command}\n${result.stdout}\n${result.stderr}`,
  );
}

assert.equal(sha256(PATHS.lexicalV6), IMMUTABLE_HASHES[PATHS.lexicalV6]);
assert.equal(sha256(PATHS.task6V6), IMMUTABLE_HASHES[PATHS.task6V6]);
assert.equal(sha256(PATHS.inventoryV6), IMMUTABLE_HASHES[PATHS.inventoryV6]);

process.stdout.write(
  "TASK6C_L01_GUTEN_TAG_POSITIVE_ADMISSION_GATE PASS scope=DWDS_D_1_1_GREETING_HALF_LEXICAL_ONLY sourcePlan=de_lex_plan_l01_c04_guten_tag_v1 sense=de_lex_l01_c04_guten_tag_v1 checkpoint=de_l01_c04_s32 introduction=null scoredTiming=none phraseAuthority=false register=unspecified time=daytime-only resolved=11 unresolved=277 packets=1792 materialized=0 task7=false preauthoring=false learner=false release=false cutover=NONE defaultConsumer=false receipt=PENDING_INDEPENDENT_REVIEW\n",
);
