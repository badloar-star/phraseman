import assert from "node:assert/strict";
import fs from "node:fs";

import {
  GERMAN_TASK6_V2_VERB_VALENCY_ADJUDICATIONS_DE_V1,
  parseGermanTask6V2VerbValencyAdjudicationsDeV1,
  validateGermanWohnenEvidenceSourceBindingDeV2,
} from "../modules/learning-v2/curriculum/de/lexical_item_evidence_de_v2";

type JsonRecord = Record<string, any>;

const ADJUDICATION_PATH =
  "modules/learning-v2/curriculum/de/evidence/task6_v2_verb_valency_adjudications_de_v1.json";
const WOHNEN_HTML_PATH =
  "modules/learning-v2/curriculum/de/evidence/learning-v2-de-task6c-l02-identity-capture-v4-live-20261012T085552906Z/decoded-representation/wohnen.html";

const diskAdjudications = JSON.parse(
  fs.readFileSync(ADJUDICATION_PATH, "utf8"),
) as unknown;
const parsed =
  parseGermanTask6V2VerbValencyAdjudicationsDeV1(diskAdjudications);
assert.deepEqual(parsed, GERMAN_TASK6_V2_VERB_VALENCY_ADJUDICATIONS_DE_V1);
assert.equal(parsed.length, 1);
assert.deepEqual(parsed[0], {
  schemaVersion: "learning-v2-german-verb-valency-adjudication.v1",
  id: "de_valency_l02_c01_wohnen_v1",
  sourcePlanId: "de_lex_plan_l02_c01_wohnen_v1",
  candidateCanonicalSenseId: "de_lex_l02_c01_wohnen_v1",
  task5CanonicalBodySha256:
    "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3",
  task5VerbPackageSha256:
    "8528c540c8028de3ea0740abbe128c9f62e6e9f002f2433250252a3cd762d2fc",
  captureManifestSha256:
    "e79b6c6016638ecc943ef633b814761ed5c95595a4e61171fb057da84273a535",
  source: {
    url: "https://www.dwds.de/wb/wohnen",
    anchor: "d-1-1",
    bodySha256:
      "1b2f4f0d0758994c9318e2dfd43feae66a3eaff35747ea439ccc7ad6440c85ce",
    senseSpanSha256:
      "cfe8f854857d65223619ea5c223c076592ff6424dbeb7a93f0b3526d0bebafb0",
    morphologySpanSha256:
      "71208e25cfa546245f0970b02ad201564630f5fff576acfc38d851daa520be72",
    definitionGerman:
      "seinen ständigen Aufenthalt an einem bestimmten Ort, seine Wohnung in einem bestimmten Haus haben",
    constructionPatternGerman: "⟨jmd. wohnt irgendwo⟩",
  },
  scope: {
    admittedSense: "RESIDENCE_CORE_ONLY",
    d1_2Admitted: false,
    metaphorAdmitted: false,
  },
  adjudication: {
    frame: "intransitive residence frame",
    separability: "INSEPARABLE",
    perfectAuxiliary: "haben",
    slots: ["subject", "residence-location complement"],
    complementObligatoriness: "UNCLAIMED",
    caseGovernment: "UNCLAIMED",
  },
  authority: {
    status: "HOLD_ADJUDICATION_ONLY",
    canonicalAdmission: "FORBIDDEN",
    rowsPromoted: 0,
    task7Unlock: false,
    learnerFacing: false,
    phraseClaims: false,
    releaseAuthorized: false,
  },
});

const html = fs.readFileSync(WOHNEN_HTML_PATH);
assert.deepEqual(
  validateGermanWohnenEvidenceSourceBindingDeV2(html, parsed[0]),
  {
    bodySha256:
      "1b2f4f0d0758994c9318e2dfd43feae66a3eaff35747ea439ccc7ad6440c85ce",
    senseSpanSha256:
      "cfe8f854857d65223619ea5c223c076592ff6424dbeb7a93f0b3526d0bebafb0",
    morphologySpanSha256:
      "71208e25cfa546245f0970b02ad201564630f5fff576acfc38d851daa520be72",
  },
);

const hostile = (
  mutate: (value: JsonRecord) => void,
  expected: RegExp,
): void => {
  const value = structuredClone(
    GERMAN_TASK6_V2_VERB_VALENCY_ADJUDICATIONS_DE_V1,
  ) as unknown as JsonRecord[];
  mutate(value[0]);
  assert.throws(
    () => parseGermanTask6V2VerbValencyAdjudicationsDeV1(value),
    expected,
  );
};

for (const [field, replacement] of [
  ["task5CanonicalBodySha256", "0".repeat(64)],
  ["task5VerbPackageSha256", "0".repeat(64)],
  ["captureManifestSha256", "0".repeat(64)],
] as const) {
  hostile((value) => {
    value[field] = replacement;
  }, /wohnen_valency_identity/u);
}

for (const [field, replacement] of [
  ["anchor", "d-1-2"],
  ["bodySha256", "0".repeat(64)],
  ["senseSpanSha256", "0".repeat(64)],
  ["morphologySpanSha256", "0".repeat(64)],
  ["definitionGerman", "vorübergehend eine Unterkunft haben"],
  ["constructionPatternGerman", "⟨etw. wohnt in jmdm.⟩"],
] as const) {
  hostile((value) => {
    value.source[field] = replacement;
  }, /wohnen_valency_identity/u);
}

hostile((value) => {
  value.scope.admittedSense = "D1_2_TEMPORARY_LODGING";
}, /wohnen_valency_scope/u);
hostile((value) => {
  value.scope.d1_2Admitted = true;
}, /wohnen_valency_scope/u);
hostile((value) => {
  value.scope.metaphorAdmitted = true;
}, /wohnen_valency_scope/u);

for (const [field, replacement] of [
  ["frame", "transitive object frame"],
  ["separability", "SEPARABLE"],
  ["perfectAuxiliary", "sein"],
  ["complementObligatoriness", "REQUIRED"],
  ["caseGovernment", "DATIVE"],
] as const) {
  hostile((value) => {
    value.adjudication[field] = replacement;
  }, /wohnen_valency_adjudication/u);
}

hostile((value) => {
  value.adjudication.slots = ["residence-location complement", "subject"];
}, /wohnen_valency_adjudication/u);
hostile((value) => {
  value.adjudication.slots.push("direct object");
}, /wohnen_valency_adjudication/u);

hostile((value) => {
  value.authority.rowsPromoted = 1;
}, /wohnen_valency_authority/u);
hostile((value) => {
  value.authority.phraseClaims = true;
}, /wohnen_valency_authority/u);

const d12Substitution = Buffer.from(
  html
    .toString("utf8")
    .replace('id="d-1-1"', 'id="d-1-x"')
    .replace('id="d-1-2"', 'id="d-1-1"'),
  "utf8",
);
assert.throws(
  () =>
    validateGermanWohnenEvidenceSourceBindingDeV2(d12Substitution, parsed[0]),
  /wohnen_source_(?:body|sense)_hash/u,
);

process.stdout.write(
  "WOHNEN_VALENCY_ADJUDICATION_GATE PASS anchor=d-1-1 frame=intransitive-residence slots=2 complementObligatoriness=UNCLAIMED caseGovernment=UNCLAIMED status=HOLD\n",
);
