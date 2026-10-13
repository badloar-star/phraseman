import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectGermanTask7V2L01C02TschuessAdmissionAdjudicationHoldDeV1 } from "../modules/learning-v2/curriculum/de/task7_v2_l01_c02_tschuess_admission_adjudication_hold_de_v1";

const repo = path.resolve(__dirname, "..");
const source = path.join(
  repo,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c02_tschuess_admission_adjudication_hold_v1/adjudication.json",
);
const result =
  inspectGermanTask7V2L01C02TschuessAdmissionAdjudicationHoldDeV1();
assert.deepEqual(result, {
  status: "HOLD",
  decision: "CANONICAL_ADMISSION_WITHHELD_MISSING_REQUIRED_AUTHORITIES",
  canonicalAdmission: false,
  inventoryResolutionApplied: false,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
  inventory: {
    resolvedPlanIds: 6,
    unresolvedPlanIds: 282,
    packetIds: 1792,
    materializedPackets: 0,
  },
});
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "tschuss-admission-"));
try {
  const hostile = (
    mutate: (value: Record<string, unknown>) => void,
    expected: string,
  ) => {
    const value = JSON.parse(fs.readFileSync(source, "utf8")) as Record<
      string,
      unknown
    >;
    mutate(value);
    const file = path.join(temp, `${expected}.json`);
    fs.writeFileSync(file, JSON.stringify(value));
    assert.throws(
      () =>
        inspectGermanTask7V2L01C02TschuessAdmissionAdjudicationHoldDeV1({
          adjudicationPathForTest: file,
        }),
      new RegExp(expected),
    );
  };
  hostile((value) => {
    (value.sourceFindings as Record<string, unknown>).register =
      "NEUTRAL_SUPPORTED";
  }, "tschuss_admission_findings");
  hostile((value) => {
    (value.sourceFindings as Record<string, unknown>).lemma = "Tschüs";
  }, "tschuss_admission_findings");
  hostile((value) => {
    (value.scope as Record<string, unknown>).sourcePlanId =
      "de_lex_plan_l01_c02_tschuess_v0";
  }, "tschuss_admission_scope");
  hostile((value) => {
    (value.authority as Record<string, unknown>).canonicalAdmission = true;
  }, "tschuss_admission_boundary");
  hostile((value) => {
    (value.authority as Record<string, unknown>).consumerCutover = "DIRECT";
  }, "tschuss_admission_boundary");
  hostile((value) => {
    value.packetOutputPath =
      "content/learning-v2-course/curriculum/de/packets/l01/s02.json";
  }, "tschuss_admission_output_forbidden");
  console.log("learning_v2_de_task7_v2_l01_c02_tschuess_admission_gate: PASS");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
