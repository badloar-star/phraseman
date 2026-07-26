import * as fs from "fs";
import * as path from "path";

import {
  FUNCTIONS_V2_CONTRACT_MANIFEST,
  buildCanonicalAttemptRef,
  buildLearningEvidenceRef,
  hashCanonicalBody,
  validateV2LearningPackage,
} from "./contracts";

type JsonRecord = Record<string, unknown>;
type Mutation = {
  readonly op: "set" | "delete";
  readonly path: readonly (string | number)[];
  readonly value?: unknown;
};
type InvalidCase = {
  readonly caseId: string;
  readonly mutations: readonly Mutation[];
  readonly expectedIssues: readonly { readonly code: string; readonly path: string }[];
};

const readJson = <T>(...segments: readonly string[]): T =>
  JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../../tests", ...segments), "utf8"),
  ) as T;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const applyMutations = (target: unknown, mutations: readonly Mutation[]): void => {
  for (const mutation of mutations) {
    let cursor = target as Record<string | number, unknown> | unknown[];
    for (const segment of mutation.path.slice(0, -1)) {
      cursor = (cursor as Record<string | number, unknown>)[segment] as
        | Record<string | number, unknown>
        | unknown[];
    }
    const leaf = mutation.path[mutation.path.length - 1];
    if (mutation.op === "delete") {
      if (Array.isArray(cursor) && typeof leaf === "number") cursor.splice(leaf, 1);
      else delete (cursor as Record<string | number, unknown>)[leaf];
    } else {
      (cursor as Record<string | number, unknown>)[leaf] = clone(mutation.value);
    }
  }
};

const issueSummary = (result: {
  readonly issues: readonly { readonly code: string; readonly path: string }[];
}): readonly { readonly code: string; readonly path: string }[] =>
  result.issues.map(({ code, path: issuePath }) => ({ code, path: issuePath }));

const withBoundDelayedAccessibilityAlternate = (input: JsonRecord): JsonRecord => {
  const candidate = clone(input);
  const episode = candidate.episode as JsonRecord;
  const definition = (episode.delayedProbeDefinitions as JsonRecord[])[0];
  const body = definition.body as JsonRecord;
  body.accessibilityAlternateActivityId = "ep01.a09";
  (definition.ref as JsonRecord).contentHash = hashCanonicalBody(body);
  (episode.learningDesign as JsonRecord).delayedProbeRef = clone(definition.ref);
  (episode.reviewLinks as JsonRecord[])[0].probeRef = clone(definition.ref);
  const episodeRef = (
    (candidate.curriculum as JsonRecord).episodeRefs as JsonRecord[]
  ).find((ref) => ref.episodeId === episode.episodeId);
  if (!episodeRef) throw new Error("test_fixture_episode_ref_missing");
  episodeRef.contentHash = hashCanonicalBody(episode);
  return candidate;
};

const fixture = withBoundDelayedAccessibilityAlternate(
  readJson<JsonRecord>("fixtures", "learning-v2", "episode-01.valid.json"),
);
const registry = readJson<{ readonly baseline: unknown }>(
  "fixtures",
  "learning-v2",
  "content-studio",
  "decision-registry.v1.json",
);
const invalidCorpus = readJson<{ readonly invalidCases: readonly InvalidCase[] }>(
  "fixtures",
  "learning-v2",
  "episode.invalid.json",
);

describe("Learning V2 Functions conformance mirror", () => {
  test("publishes one canonical schema/hash manifest", () => {
    expect(FUNCTIONS_V2_CONTRACT_MANIFEST).toEqual({
      packageSchemaVersion: "learning-v2-contract-fixture.v1",
      episodeSchemaVersion: "v2-episode-contract.v1",
      curriculumSchemaVersion: "v2-curriculum-contract.v1",
      attemptBodySchemaVersion: "v2-attempt-body.v1",
      evidenceBodySchemaVersion: "learning-evidence-body.v1",
      nonAssessmentBodySchemaVersion: "learning-non-assessment-body.v1",
      canonicalJsonVersion: "canonical-json.v1",
      hashAlgorithm: "sha256-utf8",
    });
  });

  test("accepts the checked-in valid package and all canonical hashes are stable", () => {
    const result = validateV2LearningPackage(fixture, {
      decisionRegistry: registry.baseline,
    });
    expect(result.ok).toBe(true);

    const body = {
      schemaVersion: "v2-attempt-body.v1",
      opId: "mirror.attempt.1",
      attemptSurface: { kind: "episode_graph_node" },
      outcome: { resultCode: "CORRECT" },
      evidence: { hintsUsed: 0 },
      provenance: { phase: "near_transfer" },
      inputBinding: { source: "keyboard" },
      learningTupleDispositions: [],
    } as const;
    const ref = buildCanonicalAttemptRef(body);
    expect(ref.attemptBodyHash).toBe(hashCanonicalBody(body));
    expect(ref.attemptBodyHash).toMatch(/^[a-f0-9]{64}$/);

    const evidenceBody = {
      schemaVersion: "learning-evidence-body.v1",
      observationId: "mirror.observation.1",
      nodeId: "ep01.n01",
      objectiveId: "obj.1",
      skillId: "skill.1",
      construct: "semantic",
      phase: "near_transfer",
      targetKind: "objective",
      targetId: "obj.1",
      assessmentStatus: "assessed",
      outcome: "success",
      sourceAttempt: ref,
      policyId: "policy.evidence.v1",
      policyVersion: 1,
      provenance: {
        phase: "near_transfer",
        support: { hintsUsed: 0 },
        context: { contextId: "ctx.1" },
        prompt: { promptId: "prompt.1" },
      },
      route: {
        kind: "non_voice",
        input: {
          source: "keyboard",
          runtimeEvidenceRef: {
            runtimeEvidenceHash: "a".repeat(64),
            sourceAttempt: ref,
          },
        },
      },
      timing: { occurredAt: "2026-01-01T00:00:00.000Z" },
    } as const;
    const evidenceRef = buildLearningEvidenceRef(evidenceBody);
    expect(evidenceRef.evidenceBodyHash).toBe(hashCanonicalBody(evidenceBody));
  });

  test.each(invalidCorpus.invalidCases)(
    "rejects corpus case $caseId with the normative issue manifest",
    (invalidCase) => {
      const candidate = clone(fixture);
      applyMutations(candidate, invalidCase.mutations);
      const result = validateV2LearningPackage(candidate, {
        decisionRegistry: registry.baseline,
      });
      expect(result.ok).toBe(false);
      expect(issueSummary(result as { readonly issues: readonly { readonly code: string; readonly path: string }[] })).toEqual(
        invalidCase.expectedIssues,
      );
    },
  );
});
