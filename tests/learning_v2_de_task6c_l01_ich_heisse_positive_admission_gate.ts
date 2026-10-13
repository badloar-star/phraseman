import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type JsonRecord = Record<string, any>;

const ROOT = process.cwd();
const PATHS = Object.freeze({
  module:
    "modules/learning-v2/curriculum/de/task6c_l01_ich_heisse_positive_admission_de_v1.ts",
  task5V2: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
  task5V3: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v3.json",
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
  sourceHoldManifest:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_ich_heisse_source_hold_v1/manifest.json",
  sourceExtraction:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_ich_heisse_source_hold_v1/extraction_map.json",
  dwdsRaw:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_ich_heisse_source_hold_v1/raw/dwds_heissen.html",
  formulaicManifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_seven_formulaic_v1/manifest.json",
  formulaicExtraction:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_seven_formulaic_v1/extraction_map.json",
  goetheRaw:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_ich_heisse_source_hold_v1/raw/goethe_a1_redemittel.pdf",
  defaultConsumer:
    "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts",
  evidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_ich_heisse_positive_admission_v1/lexical_evidence.json",
  lexicalV5:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v5.json",
  task6V5:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v5.json",
  inventoryV5:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v5.json",
  manifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_ich_heisse_positive_admission_v1/manifest.json",
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_ICH_HEISSE_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
} as const);

const IMMUTABLE_HASHES = Object.freeze({
  [PATHS.task5V2]:
    "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
  [PATHS.task5V3]:
    "5934f3f94e87f8b50481096732047c6c5c8591c34ce97c30d413d14519ce21fe",
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
  [PATHS.sourceHoldManifest]:
    "b87974af6a1340eb34e9e69faf86a2df1081e75fc4cfa1677093447b5b4ffe23",
  [PATHS.sourceExtraction]:
    "8cb5f30fd298ddd1d5e058b0ff9a9984e0c79895e4a0fb9e339f4bc5e65b5b9c",
  [PATHS.dwdsRaw]:
    "ceb735ca72b691d06fd46f9521636bb650102ed14a19465ee71142f1a295fbf1",
  [PATHS.formulaicManifest]:
    "2c3bca21dc11dee134979bacf64520cca3ce1dce1d0bd58b16657d2f75955e98",
  [PATHS.formulaicExtraction]:
    "4cb9d040275870fe6857b222c9bad26fab46646094994a7704bb9d9f0c93c3a7",
  [PATHS.goetheRaw]:
    "5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085",
  [PATHS.defaultConsumer]:
    "e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59",
});
const RECEIPT_SHA256 =
  "926348a833d968d0245467761337a030535e44a90ed732bfa1a5fc0b9df5ad11";

const sha256 = (file: string): string =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.resolve(ROOT, file)))
    .digest("hex");

assert.deepEqual(
  Object.fromEntries(
    Object.keys(IMMUTABLE_HASHES).map((file) => [file, sha256(file)]),
  ),
  IMMUTABLE_HASHES,
  "ich_heisse_positive_live_input_drift",
);
assert.equal(
  sha256(PATHS.receipt),
  RECEIPT_SHA256,
  "ich_heisse_positive_receipt_drift",
);

if (!fs.existsSync(path.join(ROOT, PATHS.module))) {
  assert.fail(`ich_heisse_positive_missing:${PATHS.module}`);
}

const { inspectGermanTask6cL01IchHeissePositiveAdmissionDeV1 } = require(
  `../${PATHS.module}`,
) as {
  inspectGermanTask6cL01IchHeissePositiveAdmissionDeV1: (
    options?: Record<string, string>,
  ) => unknown;
};

assert.deepEqual(inspectGermanTask6cL01IchHeissePositiveAdmissionDeV1(), {
  status: "PASS",
  decision: "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION",
  admissionScope: "EXACT_ICH_HEISSE_FIXED_EXPRESSION_ONLY",
  sourcePlanId: "de_lex_plan_l01_c03_ich_heisse_v1",
  canonicalSenseId: "de_lex_l01_c03_ich_heisse_v1",
  checkpointPacketId: "de_l01_c03_s24",
  firstIntroductionPacketId: null,
  phraseAuthority: false,
  resolvedPlanIds: 9,
  unresolvedPlanIds: 279,
  packetIds: 1792,
  materializedPackets: 0,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
});

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "de-ich-heisse-admission-"),
);
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
      inspectGermanTask6cL01IchHeissePositiveAdmissionDeV1({
        [option]: writeJson(name, value),
      }),
    expected,
  );
};

try {
  hostile(
    "lexicalV5PathForTest",
    "lexicalV5",
    "productive.json",
    (value) => {
      value.find(
        (row: JsonRecord) => row.id === "de_lex_l01_c03_ich_heisse_v1",
      ).productionPolicy = "productive";
    },
    /ich_heisse_positive_lexical_scope/u,
  );
  hostile(
    "lexicalV5PathForTest",
    "lexicalV5",
    "paradigm.json",
    (value) => {
      value.find(
        (row: JsonRecord) => row.id === "de_lex_l01_c03_ich_heisse_v1",
      ).verbParadigm = ["ich heiße", "du heißt"];
    },
    /ich_heisse_positive_lexical_scope/u,
  );
  hostile(
    "evidencePathForTest",
    "evidence",
    "register.json",
    (value) => {
      value.register = "neutral";
    },
    /ich_heisse_positive_register/u,
  );
  hostile(
    "evidencePathForTest",
    "evidence",
    "general-frame-evidence.json",
    (value) => {
      value.admittedExpression = "Ich heiße {Name}";
    },
    /ich_heisse_positive_evidence_identity/u,
  );
  hostile(
    "task6V5PathForTest",
    "task6V5",
    "general-frame.json",
    (value) => {
      value.registry.phraseFrames.push({
        id: "de_pf_l01_c03_ich_heisse_name_v1",
        frame: "Ich heiße {Name}",
        lexicalSenseIds: ["de_lex_l01_c03_ich_heisse_v1"],
      });
    },
    /ich_heisse_positive_phrase_forbidden/u,
  );
  hostile(
    "task6V5PathForTest",
    "task6V5",
    "literal-frame.json",
    (value) => {
      value.registry.phraseFrames.push({
        id: "de_pf_l01_c03_ich_heisse_max_v1",
        frame: "Ich heiße Max.",
        lexicalSenseIds: ["de_lex_l01_c03_ich_heisse_v1"],
      });
    },
    /ich_heisse_positive_phrase_forbidden/u,
  );
  hostile(
    "task6V5PathForTest",
    "task6V5",
    "phrase-link.json",
    (value) => {
      value.registry.phraseFrames[0].lexicalSenseIds.push(
        "de_lex_l01_c03_ich_heisse_v1",
      );
    },
    /ich_heisse_positive_phrase_forbidden/u,
  );
  hostile(
    "task6V5PathForTest",
    "task6V5",
    "early-intro.json",
    (value) => {
      value.authorityContext.lexicalMappings.find(
        (row: JsonRecord) =>
          row.sourcePlanId === "de_lex_plan_l01_c03_ich_heisse_v1",
      ).firstIntroductionPacketId = "de_l01_c03_s17";
    },
    /ich_heisse_positive_plan_sense_mapping/u,
  );
  hostile(
    "task6V5PathForTest",
    "task6V5",
    "scored-timing.json",
    (value) => {
      value.authorityContext.lexicalMappings.find(
        (row: JsonRecord) =>
          row.sourcePlanId === "de_lex_plan_l01_c03_ich_heisse_v1",
      ).firstScoredUsePacketId = "de_l01_c03_s24";
    },
    /ich_heisse_positive_plan_sense_mapping/u,
  );
  hostile(
    "task6V5PathForTest",
    "task6V5",
    "phrase-authority.json",
    (value) => {
      value.materialization.l01IchHeisseLexicalMapping.phraseAuthority = true;
    },
    /ich_heisse_positive_materialization/u,
  );

  for (const [option, file, field, value] of [
    ["task6V5PathForTest", "task6V5", "task7Unlock", true],
    ["task6V5PathForTest", "task6V5", "preauthoringAuthority", true],
    ["task6V5PathForTest", "task6V5", "learnerFacing", true],
    ["task6V5PathForTest", "task6V5", "releaseAuthorized", true],
    ["task6V5PathForTest", "task6V5", "consumerCutover", "DEFAULT"],
    ["task6V5PathForTest", "task6V5", "defaultConsumerChanged", true],
  ] as const) {
    hostile(
      option,
      file,
      `task6-${field}.json`,
      (candidate) => {
        candidate.authority[field] = value;
      },
      /ich_heisse_positive_authority_boundary/u,
    );
  }
  for (const [field, value] of [
    ["task7Unlock", true],
    ["preauthoringAuthority", true],
    ["learnerFacing", true],
    ["releaseAuthorized", true],
    ["consumerCutover", "DEFAULT"],
    ["defaultConsumerChanged", true],
    ["ownerApproval", "GRANTED"],
  ] as const) {
    hostile(
      "inventoryV5PathForTest",
      "inventoryV5",
      `inventory-${field}.json`,
      (candidate) => {
        candidate.authority[field] = value;
      },
      /ich_heisse_positive_authority_boundary/u,
    );
  }
  hostile(
    "inventoryV5PathForTest",
    "inventoryV5",
    "currently-materializable.json",
    (value) => {
      value.sequence.currentlyMaterializable = true;
    },
    /ich_heisse_positive_authority_boundary/u,
  );
  hostile(
    "inventoryV5PathForTest",
    "inventoryV5",
    "wrong-counts.json",
    (value) => {
      value.counts.resolvedPlanIds = 10;
      value.counts.unresolvedPlanIds = 278;
    },
    /ich_heisse_positive_inventory/u,
  );
  hostile(
    "inventoryV5PathForTest",
    "inventoryV5",
    "wrong-digest.json",
    (value) => {
      value.inventoryDigests.resolvedPlanIdsCanonicalSha256 = "0".repeat(64);
    },
    /ich_heisse_positive_inventory_digest/u,
  );
  hostile(
    "task6V5PathForTest",
    "task6V5",
    "extra-authority.json",
    (value) => {
      value.authority.hiddenUnlock = true;
    },
    /ich_heisse_positive_task6_authority/u,
  );
  hostile(
    "task6V5PathForTest",
    "task6V5",
    "extra-materialization.json",
    (value) => {
      value.materialization.l01IchHeisseLexicalMapping.generalFrameAuthority = true;
    },
    /ich_heisse_positive_materialization/u,
  );
  hostile(
    "inventoryV5PathForTest",
    "inventoryV5",
    "extra-inventory-authority.json",
    (value) => {
      value.authority.hiddenUnlock = true;
    },
    /ich_heisse_positive_authority_boundary/u,
  );
  hostile(
    "manifestPathForTest",
    "manifest",
    "manifest-phrase.json",
    (value) => {
      value.authority.phraseAuthority = true;
    },
    /ich_heisse_positive_manifest/u,
  );

  const receipt = fs.readFileSync(path.join(ROOT, PATHS.receipt), "utf8");
  const observedTypeScriptEvidence =
    "Observed reviewed-run exit: `2`; diagnostics: `14`; diagnostics in the eight transaction\npaths: `0`.";
  assert.equal(
    receipt.includes(observedTypeScriptEvidence),
    true,
    "ich_heisse_positive_receipt_tsc_fixture_missing",
  );
  const fakeGreenReceiptPath = path.join(tempRoot, "fake-green-receipt.md");
  fs.writeFileSync(
    fakeGreenReceiptPath,
    receipt.replace(
      observedTypeScriptEvidence,
      "Observed exit: `0`; diagnostics: `0`; diagnostics in this transaction's new\nfiles: `0`.",
    ),
    "utf8",
  );
  assert.throws(
    () =>
      inspectGermanTask6cL01IchHeissePositiveAdmissionDeV1({
        receiptPathForTest: fakeGreenReceiptPath,
      }),
    /ich_heisse_positive_receipt_typescript/u,
  );

  const driftCases = [
    ["task5V2PathForTest", PATHS.task5V2],
    ["task5V3PathForTest", PATHS.task5V3],
    ["lexicalV2PathForTest", PATHS.lexicalV2],
    ["task6V2PathForTest", PATHS.task6V2],
    ["inventoryV2PathForTest", PATHS.inventoryV2],
    ["lexicalV3PathForTest", PATHS.lexicalV3],
    ["task6V3PathForTest", PATHS.task6V3],
    ["inventoryV3PathForTest", PATHS.inventoryV3],
    ["lexicalV4PathForTest", PATHS.lexicalV4],
    ["task6V4PathForTest", PATHS.task6V4],
    ["inventoryV4PathForTest", PATHS.inventoryV4],
    ["sourceHoldManifestPathForTest", PATHS.sourceHoldManifest],
    ["sourceExtractionPathForTest", PATHS.sourceExtraction],
    ["dwdsRawPathForTest", PATHS.dwdsRaw],
    ["formulaicManifestPathForTest", PATHS.formulaicManifest],
    ["formulaicExtractionPathForTest", PATHS.formulaicExtraction],
    ["goetheRawPathForTest", PATHS.goetheRaw],
    ["defaultConsumerPathForTest", PATHS.defaultConsumer],
  ] as const;
  for (const [option, source] of driftCases) {
    const target = path.join(tempRoot, path.basename(source));
    fs.copyFileSync(path.join(ROOT, source), target);
    fs.appendFileSync(target, "\n", "utf8");
    assert.throws(
      () =>
        inspectGermanTask6cL01IchHeissePositiveAdmissionDeV1({
          [option]: target,
        }),
      /ich_heisse_positive_predecessor_drift/u,
    );
  }

  const reboundTask5 = readJson("task5V3");
  reboundTask5.selfConsistentRebindAttack = true;
  const reboundTask5Path = writeJson("rebound-task5-v3.json", reboundTask5);
  const reboundHash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(reboundTask5Path))
    .digest("hex");
  const reboundTask6 = readJson("task6V5");
  reboundTask6.sourceBindings.task5V3.byteSha256 = reboundHash;
  assert.throws(
    () =>
      inspectGermanTask6cL01IchHeissePositiveAdmissionDeV1({
        task5V3PathForTest: reboundTask5Path,
        task6V5PathForTest: writeJson("rebound-task6-v5.json", reboundTask6),
      }),
    /ich_heisse_positive_predecessor_drift/u,
  );
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

assert.deepEqual(
  Object.fromEntries(
    Object.keys(IMMUTABLE_HASHES).map((file) => [file, sha256(file)]),
  ),
  IMMUTABLE_HASHES,
  "ich_heisse_positive_historical_bytes_changed",
);

process.stdout.write(
  "TASK6C_L01_ICH_HEISSE_POSITIVE_ADMISSION_GATE PASS scope=EXACT_ICH_HEISSE_FIXED_EXPRESSION_ONLY sourcePlan=de_lex_plan_l01_c03_ich_heisse_v1 sense=de_lex_l01_c03_ich_heisse_v1 checkpoint=de_l01_c03_s24 introduction=null scoredTiming=none phraseAuthority=false register=unspecified resolved=9 unresolved=279 packets=1792 materialized=0 task7=false preauthoring=false learner=false release=false cutover=NONE defaultConsumer=false\n",
);
