import { readFileSync } from "node:fs";
import path from "node:path";
import {
  validateDecisionRegistryRecord,
} from "../../../modules/learning-v2/policies/decision_registry";

describe("DecisionRegistry body-only Firestore index envelope", () => {
  it("accepts the canonical record without body and rejects a valid record plus inline body", () => {
    const fixture = JSON.parse(
      readFileSync(
        path.resolve(
          __dirname,
          "../../../tests/fixtures/learning-v2/content-studio/decision-registry.v1.json",
        ),
        "utf8",
      ),
    ) as { baseline: { body: Record<string, unknown>; record: Record<string, unknown> } };
    expect(validateDecisionRegistryRecord(fixture.baseline.record).ok).toBe(true);
    expect(
      validateDecisionRegistryRecord({
        ...fixture.baseline.record,
        body: fixture.baseline.body,
      }).ok,
    ).toBe(false);
  });
});
