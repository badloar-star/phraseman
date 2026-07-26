import * as fs from "fs";
import * as path from "path";

import { recommendLegacyPlacement } from "../modules/learning-v2/migration/placement_policy";

type JsonRecord = Record<string, unknown>;

type ValidCase = {
  readonly caseId: string;
  readonly snapshot: unknown;
  readonly expected: unknown;
};

type InvalidCase = {
  readonly caseId: string;
  readonly snapshot: unknown;
  readonly expectedIssues: readonly {
    readonly code: string;
    readonly path: string;
  }[];
};

type FixtureCorpus = {
  readonly schemaVersion: string;
  readonly validCases: readonly ValidCase[];
  readonly invalidCases: readonly InvalidCase[];
  readonly invalidRecommendation: unknown;
};

const FIXTURE_PATH = path.join(
  __dirname,
  "fixtures",
  "learning-v2",
  "migration",
  "legacy-placement-policy.v1.json",
);

const corpus = JSON.parse(
  fs.readFileSync(FIXTURE_PATH, "utf8"),
) as FixtureCorpus;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("Learning V2 legacy placement recommendation policy", () => {
  it("keeps the normative boundary-neighbor and malformed corpus complete", () => {
    expect(corpus.validCases.map((testCase) => testCase.caseId)).toEqual([
      "empty",
      "legacy-1",
      "legacy-7",
      "legacy-8",
      "legacy-9",
      "legacy-17",
      "legacy-18",
      "legacy-19",
      "legacy-27",
      "legacy-28",
      "legacy-29",
      "legacy-31",
      "legacy-32",
    ]);
    expect(corpus.invalidCases.map((testCase) => testCase.caseId)).toEqual([
      "non-object",
      "array",
      "unknown-schema",
      "unknown-field",
      "multiple-unknown-fields",
      "missing-highest-completed-lesson",
      "lesson-zero",
      "lesson-negative",
      "lesson-numeric-string",
      "lesson-out-of-range",
      "lesson-not-integer",
    ]);
  });

  it("maps empty, L8, L18, L28 and L32 snapshots to conservative recommendations", () => {
    expect(corpus.schemaVersion).toBe("legacy-placement-policy-fixtures.v1");

    for (const testCase of corpus.validCases) {
      const snapshotBefore = clone(testCase.snapshot);
      const first = recommendLegacyPlacement(testCase.snapshot);
      const second = recommendLegacyPlacement(clone(testCase.snapshot));

      expect(first).toEqual(testCase.expected);
      expect(second).toEqual(first);
      expect(testCase.snapshot).toEqual(snapshotBefore);
    }
  });

  it("fails malformed snapshots closed to manual review", () => {
    for (const testCase of corpus.invalidCases) {
      const result = recommendLegacyPlacement(testCase.snapshot);

      expect(result).toEqual({
        ok: false,
        issues: testCase.expectedIssues,
        recommendation: corpus.invalidRecommendation,
      });
    }
  });

  it("never recommends a write, star, checkpoint or learning-evidence grant", () => {
    const snapshots = [
      ...corpus.validCases.map((testCase) => testCase.snapshot),
      ...corpus.invalidCases.map((testCase) => testCase.snapshot),
    ];

    for (const snapshot of snapshots) {
      const result = recommendLegacyPlacement(snapshot) as JsonRecord;
      const recommendation = result.recommendation as JsonRecord;
      expect(recommendation.effects).toEqual({
        writesLegacyProgress: false,
        writesV2Progress: false,
        grantsV2Stars: false,
        grantsV2Checkpoint: false,
        grantsV2LearningEvidence: false,
      });
    }
  });
});
