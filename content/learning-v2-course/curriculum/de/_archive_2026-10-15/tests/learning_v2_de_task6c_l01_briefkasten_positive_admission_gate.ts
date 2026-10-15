import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type JsonRecord = Record<string, any>;

const ROOT = process.cwd();
const PATHS = Object.freeze({
  module:
    "modules/learning-v2/curriculum/de/task6c_l01_briefkasten_positive_admission_de_v1.ts",
  task5V3: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v3.json",
  raw: "modules/learning-v2/curriculum/de/evidence/task6c_l01_six_noun_admission_v1/raw/de_lex_plan_l01_c03_briefkasten_v1.html",
  metadata:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_briefkasten_source_hold_v1/raw/dwds_briefkasten.http_metadata.txt",
  sourceExtraction:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_briefkasten_source_hold_v1/extraction_map.json",
  sourceHoldManifest:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_briefkasten_source_hold_v1/manifest.json",
  canonicalHoldManifest:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_briefkasten_canonical_admission_hold_v1/manifest.json",
  lexicalV2:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v2.json",
  task6V2:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v2.json",
  inventoryV2:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
  lexicalV3:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v3.json",
  task6V3:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v3.json",
  inventoryV3:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v3.json",
  lexicalV4:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v4.json",
  task6V4:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v4.json",
  inventoryV4:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v4.json",
  lexicalV5:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v5.json",
  task6V5:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v5.json",
  inventoryV5:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v5.json",
  v5Closure:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_ich_heisse_final_review_closure_v1/closure.json",
  defaultConsumer:
    "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts",
  evidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_positive_admission_v1/lexical_evidence.json",
  manifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_positive_admission_v1/manifest.json",
  lexicalV6:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v6.json",
  task6V6:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v6.json",
  inventoryV6:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v6.json",
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_BRIEFKASTEN_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
} as const);

const IMMUTABLE_HASHES = Object.freeze({
  [PATHS.task5V3]:
    "5934f3f94e87f8b50481096732047c6c5c8591c34ce97c30d413d14519ce21fe",
  [PATHS.raw]:
    "d6e63ca2942fb05841e2a89cd30a3c335228dc4d6ba296e4d010e9515bd18342",
  [PATHS.metadata]:
    "b9314f5e8b3f0b8c884b617ef967b531f06d80fdd8b83c07f89cb172706dfb50",
  [PATHS.sourceExtraction]:
    "f97ccbd4f4e95f0361f7fb607cae2f60c2cb4bdac18b89ec9fe34d3568e3cc89",
  [PATHS.sourceHoldManifest]:
    "1e8b97c051384f05d02675bc05de4d3c2c6bc27101bc4e07c951b4671de35d69",
  [PATHS.canonicalHoldManifest]:
    "d2e8906a0fbcb135bad438fdfc1b52ca836e5b5e382838492a415d506d235d38",
  [PATHS.lexicalV2]:
    "31934e35b5278c7a7e901d08e02da5398f3503825782acbb604d06de094726a5",
  [PATHS.task6V2]:
    "ba4ddc48ce99aeb97788ba767e2179c507c8740be24446cbf6b4f9abf591681f",
  [PATHS.inventoryV2]:
    "db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415",
  [PATHS.lexicalV3]:
    "475caad2f4a56a576301836c2bb4590061dd4536cd40553b1638ce605bfdbcbb",
  [PATHS.task6V3]:
    "8f54a19fcaad578a374c06e3a4ecf5504ab761b1790a296056334aa35bf36862",
  [PATHS.inventoryV3]:
    "702a491699774d2f0cc90c19755bc8747a0b1663ddd2e94f272b68d40ddc1d88",
  [PATHS.lexicalV4]:
    "aa08ccd483fb2bebb43a3f2388940a5672708cc70b29e41dfb05e0d4a39bd120",
  [PATHS.task6V4]:
    "65db4d567150c654c90c14d667811c8682136db753c602d12ed0f8b0808ee1c4",
  [PATHS.inventoryV4]:
    "3abf18ea54a4b84f0386a75788b86f6e0c693b7f54819284c8f44237a407d4b6",
  [PATHS.lexicalV5]:
    "4ed741cc0e457eff0c3500f98e6c8d62a33a951110d428ff1333075eca99a2c7",
  [PATHS.task6V5]:
    "9bbf41335e13dff8f97be3bbd05f21284c99e62c31d5fcb63f7b5f0ab324af91",
  [PATHS.inventoryV5]:
    "e1c01fa8ef727c23d128d07bbe5cf67f7c04c6539610817ba39b6e0b555fb3b4",
  [PATHS.v5Closure]:
    "c592bf535b160a846b5e2ddade1491d1aa5c4866d8083d007ab1abfe60641c4b",
  [PATHS.defaultConsumer]:
    "e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59",
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
  "briefkasten_positive_live_input_drift",
);

if (!fs.existsSync(path.join(ROOT, PATHS.module))) {
  assert.fail(`briefkasten_positive_missing:${PATHS.module}`);
}

const { inspectGermanTask6cL01BriefkastenPositiveAdmissionDeV1 } = require(
  `../${PATHS.module}`,
) as {
  inspectGermanTask6cL01BriefkastenPositiveAdmissionDeV1: (
    options?: Record<string, string>,
  ) => unknown;
};

assert.deepEqual(inspectGermanTask6cL01BriefkastenPositiveAdmissionDeV1(), {
  status: "PASS",
  decision: "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION",
  admissionScope: "EXACT_BRIEFKASTEN_RESIDENTIAL_MAILBOX_NOUN_ONLY",
  sourcePlanId: "de_lex_plan_l01_c03_briefkasten_v1",
  canonicalSenseId: "de_lex_l01_c03_briefkasten_v1",
  checkpointPacketId: "de_l01_c03_s24",
  firstIntroductionPacketId: null,
  phraseAuthority: false,
  resolvedPlanIds: 10,
  unresolvedPlanIds: 278,
  packetIds: 1792,
  materializedPackets: 0,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
});

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "de-briefkasten-v6-"));
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
      inspectGermanTask6cL01BriefkastenPositiveAdmissionDeV1({
        [option]: writeJson(name, value),
      }),
    expected,
  );
};

try {
  hostile(
    "evidencePathForTest",
    "evidence",
    "public-sense.json",
    (value) => {
      value.sourceSenseAnchor = "d-1-1";
    },
    /briefkasten_positive_sense/u,
  );
  hostile(
    "evidencePathForTest",
    "evidence",
    "register.json",
    (value) => {
      value.register = "neutral";
    },
    /briefkasten_positive_register/u,
  );
  hostile(
    "lexicalV6PathForTest",
    "lexicalV6",
    "broader-morphology.json",
    (value) => {
      value.find(
        (row: JsonRecord) => row.id === "de_lex_l01_c03_briefkasten_v1",
      ).nounCases = ["Briefkastens"];
    },
    /briefkasten_positive_lexical_scope/u,
  );
  hostile(
    "task6V6PathForTest",
    "task6V6",
    "phrase-frame.json",
    (value) => {
      value.registry.phraseFrames.push({
        id: "de_pf_l01_c03_briefkasten_v1",
        frame: "Hallo am Briefkasten!",
        lexicalSenseIds: ["de_lex_l01_c03_briefkasten_v1"],
      });
    },
    /briefkasten_positive_phrase_forbidden/u,
  );
  hostile(
    "task6V6PathForTest",
    "task6V6",
    "phrase-link.json",
    (value) => {
      value.registry.phraseFrames[0].lexicalSenseIds.push(
        "de_lex_l01_c03_briefkasten_v1",
      );
    },
    /briefkasten_positive_phrase_forbidden/u,
  );
  hostile(
    "evidencePathForTest",
    "evidence",
    "example-authority.json",
    (value) => {
      value.examples = ["Hallo am Briefkasten!"];
    },
    /briefkasten_positive_phrase_forbidden/u,
  );
  hostile(
    "task6V6PathForTest",
    "task6V6",
    "s18-intro.json",
    (value) => {
      value.authorityContext.lexicalMappings.find(
        (row: JsonRecord) =>
          row.sourcePlanId === "de_lex_plan_l01_c03_briefkasten_v1",
      ).firstIntroductionPacketId = "de_l01_c03_s18";
    },
    /briefkasten_positive_plan_sense_mapping/u,
  );
  hostile(
    "task6V6PathForTest",
    "task6V6",
    "outside-s24.json",
    (value) => {
      value.authorityContext.lexicalMappings.find(
        (row: JsonRecord) =>
          row.sourcePlanId === "de_lex_plan_l01_c03_briefkasten_v1",
      ).plannedUsePacketIds = ["de_l01_c03_s23", "de_l01_c03_s24"];
    },
    /briefkasten_positive_plan_sense_mapping/u,
  );
  hostile(
    "task6V6PathForTest",
    "task6V6",
    "scored-timing.json",
    (value) => {
      value.authorityContext.lexicalMappings.find(
        (row: JsonRecord) =>
          row.sourcePlanId === "de_lex_plan_l01_c03_briefkasten_v1",
      ).firstScoredUsePacketId = "de_l01_c03_s24";
    },
    /briefkasten_positive_plan_sense_mapping/u,
  );

  for (const [file, option, target] of [
    ["task6V6", "task6V6PathForTest", "authority"],
    ["inventoryV6", "inventoryV6PathForTest", "authority"],
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
        /briefkasten_positive_(?:authority_boundary|manifest|evidence_scope)/u,
      );
    }
  }
  hostile(
    "inventoryV6PathForTest",
    "inventoryV6",
    "materializable.json",
    (value) => {
      value.sequence.currentlyMaterializable = true;
    },
    /briefkasten_positive_authority_boundary/u,
  );
  hostile(
    "inventoryV6PathForTest",
    "inventoryV6",
    "wrong-counts.json",
    (value) => {
      value.counts.resolvedPlanIds = 11;
      value.counts.unresolvedPlanIds = 277;
    },
    /briefkasten_positive_inventory/u,
  );
  hostile(
    "inventoryV6PathForTest",
    "inventoryV6",
    "wrong-digest.json",
    (value) => {
      value.inventoryDigests.resolvedPlanIdsCanonicalSha256 = "0".repeat(64);
    },
    /briefkasten_positive_inventory_digest/u,
  );

  const receipt = fs.readFileSync(path.join(ROOT, PATHS.receipt), "utf8");
  const reviewedEvidence =
    "Observed reviewed-run exit: `2`; diagnostics: `16`; diagnostics in the eight transaction\npaths: `0`.";
  assert.equal(
    receipt.includes(reviewedEvidence),
    true,
    "briefkasten_positive_receipt_fixture_missing",
  );
  const fakeGreen = path.join(tempRoot, "fake-green.md");
  fs.writeFileSync(
    fakeGreen,
    receipt.replace(
      reviewedEvidence,
      "Observed reviewed-run exit: `0`; diagnostics: `0`; diagnostics in the eight transaction\npaths: `0`.",
    ),
    "utf8",
  );
  assert.throws(
    () =>
      inspectGermanTask6cL01BriefkastenPositiveAdmissionDeV1({
        receiptPathForTest: fakeGreen,
      }),
    /briefkasten_positive_receipt_typescript/u,
  );

  for (const [option, source] of [
    ["task5V3PathForTest", PATHS.task5V3],
    ["rawPathForTest", PATHS.raw],
    ["metadataPathForTest", PATHS.metadata],
    ["sourceExtractionPathForTest", PATHS.sourceExtraction],
    ["sourceHoldManifestPathForTest", PATHS.sourceHoldManifest],
    ["canonicalHoldManifestPathForTest", PATHS.canonicalHoldManifest],
    ["lexicalV2PathForTest", PATHS.lexicalV2],
    ["task6V2PathForTest", PATHS.task6V2],
    ["inventoryV2PathForTest", PATHS.inventoryV2],
    ["lexicalV3PathForTest", PATHS.lexicalV3],
    ["task6V3PathForTest", PATHS.task6V3],
    ["inventoryV3PathForTest", PATHS.inventoryV3],
    ["lexicalV4PathForTest", PATHS.lexicalV4],
    ["task6V4PathForTest", PATHS.task6V4],
    ["inventoryV4PathForTest", PATHS.inventoryV4],
    ["lexicalV5PathForTest", PATHS.lexicalV5],
    ["task6V5PathForTest", PATHS.task6V5],
    ["inventoryV5PathForTest", PATHS.inventoryV5],
    ["v5ClosurePathForTest", PATHS.v5Closure],
    ["defaultConsumerPathForTest", PATHS.defaultConsumer],
  ] as const) {
    const drifted = path.join(tempRoot, `drift-${path.basename(source)}`);
    fs.copyFileSync(path.join(ROOT, source), drifted);
    fs.appendFileSync(drifted, "\n", "utf8");
    assert.throws(
      () =>
        inspectGermanTask6cL01BriefkastenPositiveAdmissionDeV1({
          [option]: drifted,
        }),
      /briefkasten_positive_predecessor_drift/u,
    );
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

assert.deepEqual(
  Object.fromEntries(
    Object.keys(IMMUTABLE_HASHES).map((file) => [file, sha256(file)]),
  ),
  IMMUTABLE_HASHES,
  "briefkasten_positive_historical_bytes_changed",
);

process.stdout.write(
  "TASK6C_L01_BRIEFKASTEN_POSITIVE_ADMISSION_GATE PASS scope=EXACT_BRIEFKASTEN_RESIDENTIAL_MAILBOX_NOUN_ONLY sourcePlan=de_lex_plan_l01_c03_briefkasten_v1 sense=de_lex_l01_c03_briefkasten_v1 checkpoint=de_l01_c03_s24 introduction=null scoredTiming=none phraseAuthority=false register=unspecified resolved=10 unresolved=278 packets=1792 materialized=0 task7=false preauthoring=false learner=false release=false cutover=NONE defaultConsumer=false\n",
);
