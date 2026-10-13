import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type JsonRecord = Record<string, any>;

const ROOT = process.cwd();
const PATHS = Object.freeze({
  module:
    "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_registry_binding_reconciliation_de_v1.ts",
  task6V8:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v8.json",
  inventoryV8:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v8.json",
  manifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_registry_binding_reconciliation_v1/manifest.json",
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_GUTEN_TAG_REGISTRY_BINDING_RECONCILIATION_RECEIPT_2026-10-13.md",
} as const);

const FROZEN = Object.freeze({
  "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_positive_admission_de_v1.ts":
    "5a8498096f3e501d0e5c98ae775aa5ee333db3ffbeebe55b7401ed197650c9d8",
  "tests/learning_v2_de_task6c_l01_guten_tag_positive_admission_gate.ts":
    "5f1facd6506ed3e198cf72ed35f4f9cf2fbe860e1b04c01afec46c653d6cb038",
  "docs/v2/curriculum/de/TASK6C_L01_GUTEN_TAG_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md":
    "7a018a3bad0755a0b918def7a240e5f9955743b27d709eff662ecc0d5677d855",
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v7.json":
    "29e2c6b7e379acd2fa69431e28d25eb6c1e97466555bc7751eafe05693b33195",
  "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v7.json":
    "d409e6cc0a909fdcf486c69308f8d2de84b2a6db688d7a90d31f933e14c0f69b",
  "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v7.json":
    "a52b925ee5e6d3adbd1de87749e7722424f6fc9c1fb5a50e3f306d2ad2fce5b1",
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/lexical_evidence.json":
    "132f65574f9e858a8c7ec22fc6269732a269c4e122fa6a2304caab8bcfd21ddc",
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/manifest.json":
    "23c83a69e545957a8a5314894d27707a2a63991c68dbaeebd50d8592dcb8a0be",
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v6.json":
    "63d65319b2f41dc6cb08e8e4e407fbf4a6ca71c061229da64a886c62ba9403bc",
  "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v6.json":
    "e940b37e2ea29e479710dada185c8bc1466bb04b61176c8c839432eeaf392677",
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_final_review_closure_v1/closure.json":
    "7d12e8f92cc4f190a53cbd2a04463fbd04dde42d39063b704059400e8af0577c",
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v3.json":
    "5934f3f94e87f8b50481096732047c6c5c8591c34ce97c30d413d14519ce21fe",
});

const sha256 = (bytes: Buffer): string =>
  crypto.createHash("sha256").update(bytes).digest("hex");
const hash = (file: string): string =>
  sha256(fs.readFileSync(path.join(ROOT, file)));

assert.deepEqual(
  Object.fromEntries(Object.keys(FROZEN).map((file) => [file, hash(file)])),
  FROZEN,
  "guten_tag_v8_frozen_input_drift",
);

if (!fs.existsSync(path.join(ROOT, PATHS.module))) {
  assert.fail(`guten_tag_v8_missing:${PATHS.module}`);
}

const { inspectGermanTask6cL01GutenTagRegistryBindingReconciliationDeV1 } =
  require(`../${PATHS.module}`) as {
    inspectGermanTask6cL01GutenTagRegistryBindingReconciliationDeV1: (
      options?: Record<string, string>,
    ) => unknown;
  };

assert.deepEqual(
  inspectGermanTask6cL01GutenTagRegistryBindingReconciliationDeV1(),
  {
    status: "PASS",
    decision: "GUTEN_TAG_REGISTRY_BINDING_RECONCILIATION",
    sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1",
    canonicalSenseId: "de_lex_l01_c04_guten_tag_v1",
    rowsPromoted: 5,
    resolvedPlanIds: 11,
    unresolvedPlanIds: 277,
    packetIds: 1792,
    materializedPackets: 0,
    task7Unlock: false,
    preauthoringAuthority: false,
    learnerFacing: false,
    releaseAuthorized: false,
    consumerCutover: "NONE",
  },
);

const readJson = (file: keyof typeof PATHS): JsonRecord =>
  JSON.parse(
    fs.readFileSync(path.join(ROOT, PATHS[file]), "utf8"),
  ) as JsonRecord;
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "de-guten-tag-v8-"));
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
      inspectGermanTask6cL01GutenTagRegistryBindingReconciliationDeV1({
        [option]: writeJson(name, value),
      }),
    expected,
  );
};

try {
  for (const binding of [
    "task6V6",
    "inventoryV6",
    "v6Closure",
    "gutenTagLexicalEvidence",
    "lexicalRegistryV7",
  ]) {
    hostile(
      "task6V8PathForTest",
      "task6V8",
      `task6-binding-${binding}.json`,
      (value) => {
        delete value.sourceBindings[binding];
      },
      /guten_tag_v8_task6_bindings/u,
    );
    hostile(
      "task6V8PathForTest",
      "task6V8",
      `task6-wrong-binding-${binding}.json`,
      (value) => {
        value.sourceBindings[binding].byteSha256 = "0".repeat(64);
      },
      /guten_tag_v8_task6_bindings/u,
    );
  }
  hostile(
    "task6V8PathForTest",
    "task6V8",
    "task6-missing-materialization.json",
    (value) => {
      delete value.materialization.l01GutenTagLexicalMapping;
    },
    /guten_tag_v8_task6_materialization/u,
  );
  hostile(
    "task6V8PathForTest",
    "task6V8",
    "task6-wrong-materialization.json",
    (value) => {
      value.materialization.l01GutenTagLexicalMapping.phraseAuthority = true;
    },
    /guten_tag_v8_task6_materialization/u,
  );
  hostile(
    "task6V8PathForTest",
    "task6V8",
    "task6-rows-promoted.json",
    (value) => {
      value.authority.rowsPromoted = 6;
    },
    /guten_tag_v8_task6_authority/u,
  );
  hostile(
    "task6V8PathForTest",
    "task6V8",
    "task6-lexical-row-drift.json",
    (value) => {
      value.registry.lexicalSenses.at(-1).register = "formal";
    },
    /guten_tag_v8_task6_registry/u,
  );
  hostile(
    "task6V8PathForTest",
    "task6V8",
    "task6-pronunciation-drift.json",
    (value) => {
      value.registry.pronunciationTargets[0].id = "forbidden";
    },
    /guten_tag_v8_task6_registry/u,
  );
  hostile(
    "task6V8PathForTest",
    "task6V8",
    "task6-authority-mapping-drift.json",
    (value) => {
      value.authorityContext.lexicalMappings.at(-1).canonicalId = "forbidden";
    },
    /guten_tag_v8_task6_authority_mapping/u,
  );
  hostile(
    "task6V8PathForTest",
    "task6V8",
    "task6-phrase-drift.json",
    (value) => {
      value.registry.phraseFrames.push({ id: "forbidden" });
    },
    /guten_tag_v8_task6_registry/u,
  );

  for (const binding of [
    "inventoryV6",
    "v6Closure",
    "gutenTagLexicalEvidence",
    "lexicalRegistryV7",
    "task6V8",
  ]) {
    hostile(
      "inventoryV8PathForTest",
      "inventoryV8",
      `inventory-binding-${binding}.json`,
      (value) => {
        delete value.sourceBindings[binding];
      },
      /guten_tag_v8_inventory_bindings/u,
    );
    hostile(
      "inventoryV8PathForTest",
      "inventoryV8",
      `inventory-wrong-binding-${binding}.json`,
      (value) => {
        value.sourceBindings[binding].byteSha256 = "0".repeat(64);
      },
      /guten_tag_v8_inventory_bindings/u,
    );
  }
  hostile(
    "inventoryV8PathForTest",
    "inventoryV8",
    "inventory-stale-status.json",
    (value) => {
      value.status = "BRIEFKASTEN_LEXICAL_SENSE_CANONICAL_ADMITTED_PARTIAL";
    },
    /guten_tag_v8_inventory_status/u,
  );
  for (const mutate of [
    (value: JsonRecord) => {
      value.counts.resolvedPlanIds = 12;
    },
    (value: JsonRecord) => {
      value.inventoryDigests.resolvedPlanIdsCanonicalSha256 = "0".repeat(64);
    },
    (value: JsonRecord) => {
      value.resolutions.reverse();
    },
    (value: JsonRecord) => {
      value.sequence.currentlyMaterializable = true;
    },
    (value: JsonRecord) => {
      value.authority.task7Unlock = true;
    },
  ]) {
    hostile(
      "inventoryV8PathForTest",
      "inventoryV8",
      `inventory-drift-${Math.random()}.json`,
      mutate,
      /guten_tag_v8_inventory_(?:body|authority)/u,
    );
  }

  hostile(
    "manifestPathForTest",
    "manifest",
    "manifest-fake-closure.json",
    (value) => {
      value.authority.closure = "PASS";
    },
    /guten_tag_v8_manifest/u,
  );

  const receipt = fs.readFileSync(path.join(ROOT, PATHS.receipt), "utf8");
  for (const [name, needle, replacement] of [
    [
      "green",
      '"result": "PASS_EXIT_0_WRITER_VERIFICATION_ONLY"',
      '"result": "PASS_INDEPENDENT_REVIEW"',
    ],
    ["review", '"independentReview": "PENDING"', '"independentReview": "PASS"'],
    ["closure", '"closure": "NOT_CREATED"', '"closure": "CLOSED"'],
    ["authority", '"task7Unlock": false', '"task7Unlock": true'],
  ] as const) {
    const target = path.join(tempRoot, `receipt-fake-${name}.md`);
    fs.writeFileSync(target, receipt.replace(needle, replacement), "utf8");
    assert.throws(
      () =>
        inspectGermanTask6cL01GutenTagRegistryBindingReconciliationDeV1({
          receiptPathForTest: target,
        }),
      /guten_tag_v8_receipt/u,
    );
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

assert.deepEqual(
  Object.fromEntries(Object.keys(FROZEN).map((file) => [file, hash(file)])),
  FROZEN,
  "guten_tag_v8_frozen_input_changed",
);

process.stdout.write(
  "TASK6C_L01_GUTEN_TAG_REGISTRY_BINDING_RECONCILIATION_GATE PASS status=PENDING_INDEPENDENT_REVIEW rowsPromoted=5 resolved=11 unresolved=277 packets=1792 materialized=0 task7=false preauthoring=false learner=false release=false cutover=NONE\n",
);
