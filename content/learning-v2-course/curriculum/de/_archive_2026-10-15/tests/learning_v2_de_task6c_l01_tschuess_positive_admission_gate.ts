import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  inspectGermanTask6cL01TschuessPositiveAdmissionDeV1,
  type GermanTask6cL01TschuessPositiveAdmissionOptionsDeV1,
} from "../modules/learning-v2/curriculum/de/task6c_l01_tschuess_positive_admission_de_v1";

type JsonRecord = Record<string, any>;
const ROOT = process.cwd();
const PATHS = {
  task5V3: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v3.json",
  lexicalV3:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v3.json",
  task6V3:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v3.json",
  inventoryV3:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v3.json",
  task5V2: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
  inventoryV2:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
  priorHoldAdjudication:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c02_tschuess_admission_adjudication_hold_v1/adjudication.json",
  evidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_tschuess_positive_admission_v1/lexical_evidence.json",
  lexicalV4:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v4.json",
  task6V4:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v4.json",
  inventoryV4:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v4.json",
  manifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_tschuess_positive_admission_v1/manifest.json",
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_TSCHUESS_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
  defaultConsumer:
    "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts",
} as const;

const sha256 = (relativePath: string): string =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest("hex");
const immutablePaths = [
  PATHS.task5V3,
  PATHS.lexicalV3,
  PATHS.task6V3,
  PATHS.inventoryV3,
  PATHS.task5V2,
  PATHS.inventoryV2,
  PATHS.priorHoldAdjudication,
  PATHS.defaultConsumer,
] as const;
const IMMUTABLE_PRE = Object.fromEntries(
  immutablePaths.map((relativePath) => [relativePath, sha256(relativePath)]),
);
assert.deepEqual(IMMUTABLE_PRE, {
  [PATHS.task5V3]:
    "5934f3f94e87f8b50481096732047c6c5c8591c34ce97c30d413d14519ce21fe",
  [PATHS.lexicalV3]:
    "475caad2f4a56a576301836c2bb4590061dd4536cd40553b1638ce605bfdbcbb",
  [PATHS.task6V3]:
    "8f54a19fcaad578a374c06e3a4ecf5504ab761b1790a296056334aa35bf36862",
  [PATHS.inventoryV3]:
    "702a491699774d2f0cc90c19755bc8747a0b1663ddd2e94f272b68d40ddc1d88",
  [PATHS.task5V2]:
    "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
  [PATHS.inventoryV2]:
    "db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415",
  [PATHS.priorHoldAdjudication]:
    "f430908b804b5ffe325154b569a3630f4f10a6fb621b661ffdff22340de15051",
  [PATHS.defaultConsumer]:
    "e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59",
});

assert.deepEqual(inspectGermanTask6cL01TschuessPositiveAdmissionDeV1(), {
  status: "PASS",
  decision: "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION",
  admissionScope: "EXACT_TSCHUESS_SENSE_ONLY",
  sourcePlanId: "de_lex_plan_l01_c02_tschuess_v1",
  canonicalSenseId: "de_lex_l01_c02_tschuess_v1",
  checkpointPacketId: "de_l01_c02_s16",
  firstIntroductionPacketId: null,
  phraseAuthority: false,
  resolvedPlanIds: 8,
  unresolvedPlanIds: 280,
  packetIds: 1792,
  materializedPackets: 0,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
});

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "de-tschuss-admission-"),
);
const json = (key: keyof typeof PATHS): JsonRecord =>
  JSON.parse(fs.readFileSync(PATHS[key], "utf8")) as JsonRecord;
const writeHostile = (name: string, value: unknown): string => {
  const target = path.join(tempRoot, name);
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
  return target;
};
const hostile = (
  option: keyof GermanTask6cL01TschuessPositiveAdmissionOptionsDeV1,
  file: keyof typeof PATHS,
  name: string,
  mutate: (value: JsonRecord) => void,
  expected: RegExp,
): void => {
  const value = json(file);
  mutate(value);
  assert.throws(
    () =>
      inspectGermanTask6cL01TschuessPositiveAdmissionDeV1({
        [option]: writeHostile(name, value),
      }),
    expected,
  );
};

try {
  hostile(
    "lexicalEvidencePathForTest",
    "evidence",
    "neutral.json",
    (value) => {
      value.register = "neutral";
    },
    /tschuss_positive_register/u,
  );
  hostile(
    "lexicalEvidencePathForTest",
    "evidence",
    "standard.json",
    (value) => {
      value.unqualifiedStandardGermanClaim = true;
    },
    /tschuss_positive_register/u,
  );
  hostile(
    "lexicalEvidencePathForTest",
    "evidence",
    "regional.json",
    (value) => {
      value.sourceRegisterMarkers = ["umgangssprachlich"];
    },
    /tschuss_positive_register/u,
  );
  hostile(
    "task6V4PathForTest",
    "task6V4",
    "phrase-link.json",
    (value) => {
      value.registry.phraseFrames
        .find(
          (row: JsonRecord) => row.id === "de_pf_l01_c02_tschuess_aufzug_v1",
        )
        .lexicalSenseIds.push("de_lex_l01_c02_tschuess_v1");
    },
    /tschuss_positive_phrase_forbidden/u,
  );
  hostile(
    "task6V4PathForTest",
    "task6V4",
    "exact-frame.json",
    (value) => {
      value.registry.phraseFrames.push({
        id: "de_pf_l01_c02_tschuess_v1",
        frame: "Tschüss!",
        lexicalSenseIds: ["de_lex_l01_c02_tschuess_v1"],
      });
    },
    /tschuss_positive_phrase_forbidden/u,
  );
  hostile(
    "task6V4PathForTest",
    "task6V4",
    "intro.json",
    (value) => {
      value.authorityContext.lexicalMappings.find(
        (row: JsonRecord) =>
          row.sourcePlanId === "de_lex_plan_l01_c02_tschuess_v1",
      ).firstIntroductionPacketId = "de_l01_c02_s09";
    },
    /tschuss_positive_plan_sense_mapping/u,
  );
  hostile(
    "task6V4PathForTest",
    "task6V4",
    "scored.json",
    (value) => {
      value.authorityContext.lexicalMappings.find(
        (row: JsonRecord) =>
          row.sourcePlanId === "de_lex_plan_l01_c02_tschuess_v1",
      ).firstScoredUsePacketId = "de_l01_c02_s16";
    },
    /tschuss_positive_plan_sense_mapping/u,
  );
  hostile(
    "task6V4PathForTest",
    "task6V4",
    "task7.json",
    (value) => {
      value.authority.task7Unlock = true;
    },
    /tschuss_positive_authority_boundary/u,
  );
  hostile(
    "task6V4PathForTest",
    "task6V4",
    "materialization-phrase-authority.json",
    (value) => {
      value.materialization.l01TschuessLexicalMapping.phraseAuthority = true;
    },
    /tschuss_positive_phrase_forbidden/u,
  );
  hostile(
    "task6V4PathForTest",
    "task6V4",
    "task6-preauthoring.json",
    (value) => {
      value.authority.preauthoringAuthority = true;
    },
    /tschuss_positive_authority_boundary/u,
  );
  hostile(
    "inventoryV4PathForTest",
    "inventoryV4",
    "preauthoring.json",
    (value) => {
      value.authority.preauthoringAuthority = true;
    },
    /tschuss_positive_authority_boundary/u,
  );
  hostile(
    "manifestPathForTest",
    "manifest",
    "release.json",
    (value) => {
      value.authority.releaseAuthorized = true;
    },
    /tschuss_positive_authority_boundary/u,
  );
  hostile(
    "manifestPathForTest",
    "manifest",
    "cutover.json",
    (value) => {
      value.authority.consumerCutover = "DEFAULT";
    },
    /tschuss_positive_authority_boundary/u,
  );
  hostile(
    "manifestPathForTest",
    "manifest",
    "default.json",
    (value) => {
      value.sourceBindings.defaultConsumer.v4Selected = true;
    },
    /tschuss_positive_consumer_cutover/u,
  );
  hostile(
    "inventoryV4PathForTest",
    "inventoryV4",
    "counts.json",
    (value) => {
      value.counts.resolvedPlanIds = 7;
      value.counts.unresolvedPlanIds = 281;
    },
    /tschuss_positive_inventory/u,
  );

  for (const [option, source, name] of [
    ["task5V2PathForTest", PATHS.task5V2, "task5-v2.json"],
    ["inventoryV2PathForTest", PATHS.inventoryV2, "inventory-v2.json"],
    ["task6V3PathForTest", PATHS.task6V3, "task6-v3.json"],
    [
      "priorHoldAdjudicationPathForTest",
      PATHS.priorHoldAdjudication,
      "hold.json",
    ],
  ] as const) {
    const target = path.join(tempRoot, name);
    fs.copyFileSync(source, target);
    fs.appendFileSync(target, " \n");
    assert.throws(
      () =>
        inspectGermanTask6cL01TschuessPositiveAdmissionDeV1({
          [option]: target,
        }),
      /tschuss_positive_predecessor_drift/u,
    );
  }
  const driftedTask6 = path.join(tempRoot, "drifted-task6-v4.json");
  fs.copyFileSync(PATHS.task6V4, driftedTask6);
  fs.appendFileSync(driftedTask6, " \n");
  assert.throws(
    () =>
      inspectGermanTask6cL01TschuessPositiveAdmissionDeV1({
        task6V4PathForTest: driftedTask6,
      }),
    /tschuss_positive_artifact_drift/u,
  );

  const receipt = fs.readFileSync(PATHS.receipt, "utf8");
  for (const [from, to, name] of [
    ["Phrase authority: `false`", "Phrase authority: `true`", "phrase.md"],
    ["Task 7 unlock: `false`", "Task 7 unlock: `true`", "task7.md"],
    [
      "Preauthoring authority: `false`",
      "Preauthoring authority: `true`",
      "pre.md",
    ],
    [
      "Learner-facing authority: `false`",
      "Learner-facing authority: `true`",
      "learner.md",
    ],
    [
      "Release authorization: `false`",
      "Release authorization: `true`",
      "release.md",
    ],
    ["Consumer cutover: `NONE`", "Consumer cutover: `DEFAULT`", "cutover.md"],
    [
      "Default consumer changed: `false`",
      "Default consumer changed: `true`",
      "default.md",
    ],
  ] as const) {
    assert.equal(receipt.includes(from), true, `missing receipt claim:${from}`);
    const target = path.join(tempRoot, name);
    fs.writeFileSync(target, receipt.replace(from, to));
    assert.throws(
      () =>
        inspectGermanTask6cL01TschuessPositiveAdmissionDeV1({
          receiptPathForTest: target,
        }),
      /tschuss_positive_receipt_boundary/u,
    );
  }

  for (const [from, to, name, expected] of [
    [
      "<!-- TYPESCRIPT_POSTREPAIR_EXIT: 2 -->",
      "<!-- TYPESCRIPT_POSTREPAIR_EXIT: 1 -->",
      "typescript-postrepair-exit.md",
      /tschuss_positive_receipt_typescript_evidence/u,
    ],
    [
      "<!-- TYPESCRIPT_CLOSURE_DIAGNOSTICS: 14 -->",
      "<!-- TYPESCRIPT_CLOSURE_DIAGNOSTICS: 17 -->",
      "typescript-closure-count.md",
      /tschuss_positive_receipt_typescript_evidence/u,
    ],
    [
      "<!-- TYPESCRIPT_CLOSURE_TARGET_DIAGNOSTICS: 0 -->",
      "<!-- TYPESCRIPT_CLOSURE_TARGET_DIAGNOSTICS: 1 -->",
      "typescript-closure-target.md",
      /tschuss_positive_receipt_typescript_evidence/u,
    ],
    [
      "No byte-preservation claim is made for any unlisted V2, V3, or Tschüss HOLD path.",
      "All V2, V3, and Tschüss HOLD paths are byte-preserved.",
      "byte-scope.md",
      /tschuss_positive_receipt_byte_scope/u,
    ],
    [
      '"taskIdentity": "/root/de_tschuess_spec_review"',
      '"taskIdentity": "/root/invented_review"',
      "initial-review-identity.md",
      /tschuss_positive_receipt_review_history/u,
    ],
    [
      '"taskIdentity": "/root/de_tschuess_postrepair_spec_review"',
      '"taskIdentity": "/root/invented_postrepair_review"',
      "postrepair-review-identity.md",
      /tschuss_positive_receipt_review_history/u,
    ],
    [
      '"taskIdentity": "/root/de_tschuess_adversarial_review"',
      '"taskIdentity": "/root/invented_adversarial_review"',
      "adversarial-review-identity.md",
      /tschuss_positive_receipt_review_history/u,
    ],
    [
      '"rawSidecarPath": "unavailable"',
      '"rawSidecarPath": "invented/reviewer-output.json"',
      "invented-review-sidecar.md",
      /tschuss_positive_receipt_review_history/u,
    ],
    [
      '"freshFinalReviewsRequired": 2',
      '"freshFinalReviewsRequired": 0',
      "premature-review-closure.md",
      /tschuss_positive_receipt_review_history/u,
    ],
  ] as const) {
    assert.equal(receipt.includes(from), true, `missing receipt proof:${from}`);
    const target = path.join(tempRoot, name);
    fs.writeFileSync(target, receipt.replace(from, to));
    assert.throws(
      () =>
        inspectGermanTask6cL01TschuessPositiveAdmissionDeV1({
          receiptPathForTest: target,
        }),
      expected,
    );
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

assert.deepEqual(
  Object.fromEntries(
    immutablePaths.map((relativePath) => [relativePath, sha256(relativePath)]),
  ),
  IMMUTABLE_PRE,
  "tschuss_positive_predecessor_bytes_changed",
);
process.stdout.write(
  "TASK6C_L01_TSCHUESS_POSITIVE_ADMISSION_GATE PASS scope=EXACT_TSCHUESS_SENSE_ONLY sourcePlan=de_lex_plan_l01_c02_tschuess_v1 sense=de_lex_l01_c02_tschuess_v1 register=landschaftlich+umgangssprachlich pedagogical=colloquial/informal checkpoint=de_l01_c02_s16 introduction=null phraseAuthority=false resolved=8 unresolved=280 packets=1792 materialized=0 task7Unlock=false preauthoring=false learner=false release=false cutover=NONE defaultConsumerChanged=false\n",
);
