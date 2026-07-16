import * as fs from "fs";
import * as path from "path";

import {
  V2_ACTIVITY_FAMILIES,
  type V2ActivityInstance,
} from "../modules/learning-v2/contracts/activity";
import type { V2NodeEvidenceDeclaration } from "../modules/learning-v2/contracts/episode";
import type { V2CurriculumProjection } from "../modules/learning-v2/contracts/curriculum";
import { parseSkillId } from "../modules/learning-v2/contracts/identities";
import {
  validateV2CheckpointContract,
  validateV2CurriculumProjection,
  validateV2LearningPackage,
} from "../modules/learning-v2/contracts/validation";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

type JsonRecord = Record<string, unknown>;
type Mutation = {
  readonly op: "set" | "delete";
  readonly path: readonly (string | number)[];
  readonly value?: unknown;
};
type ExpectedIssue = { readonly code: string; readonly path: string };
type InvalidCase = {
  readonly caseId: string;
  readonly mutations: readonly Mutation[];
  readonly expectedIssues: readonly ExpectedIssue[];
};
type SyntheticCase = {
  readonly caseId: string;
  readonly builder: string;
  readonly expectedCode: string;
  readonly expectedPath: string;
};
type InvalidCorpus = {
  readonly schemaVersion: string;
  readonly invalidCases: readonly InvalidCase[];
  readonly syntheticCases: readonly SyntheticCase[];
};

const readJson = <T>(...segments: readonly string[]): T =>
  JSON.parse(fs.readFileSync(path.join(__dirname, ...segments), "utf8")) as T;

const validFixture = readJson<JsonRecord>(
  "fixtures",
  "learning-v2",
  "episode-01.valid.json",
);
const invalidCorpus = readJson<InvalidCorpus>(
  "fixtures",
  "learning-v2",
  "episode.invalid.json",
);
const registryCorpus = readJson<{
  readonly baseline: unknown;
}>("fixtures", "learning-v2", "content-studio", "decision-registry.v1.json");

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const applyMutations = (
  target: unknown,
  mutations: readonly Mutation[],
): void => {
  for (const mutation of mutations) {
    let cursor = target as Record<string | number, unknown> | unknown[];
    const parents = mutation.path.slice(0, -1);
    for (let index = 0; index < parents.length; index += 1) {
      const segment = parents[index];
      const existing = (cursor as Record<string | number, unknown>)[segment];
      if (
        (existing === undefined || existing === null) &&
        mutation.op === "set"
      ) {
        const next =
          parents[index + 1] ?? mutation.path[mutation.path.length - 1];
        (cursor as Record<string | number, unknown>)[segment] =
          typeof next === "number" ? [] : {};
      }
      cursor = (cursor as Record<string | number, unknown>)[segment] as
        | Record<string | number, unknown>
        | unknown[];
    }
    const leaf = mutation.path[mutation.path.length - 1];
    if (mutation.op === "delete") {
      if (Array.isArray(cursor) && typeof leaf === "number")
        cursor.splice(leaf, 1);
      else delete (cursor as Record<string | number, unknown>)[leaf];
    } else {
      (cursor as Record<string | number, unknown>)[leaf] = clone(
        mutation.value,
      );
    }
  }
};

const issueSummary = (result: {
  readonly ok: boolean;
  readonly issues: readonly { readonly code: string; readonly path: string }[];
}): readonly ExpectedIssue[] =>
  result.issues.map(({ code, path }) => ({ code, path }));

const validationContext = {
  decisionRegistry: registryCorpus.baseline,
} as const;

const validatePackageOnceWithoutThrow = (
  candidate: unknown,
): ReturnType<typeof validateV2LearningPackage> => {
  let result: ReturnType<typeof validateV2LearningPackage> | undefined;
  expect(() => {
    result = validateV2LearningPackage(candidate, validationContext);
  }).not.toThrow();
  if (!result) throw new Error("Expected validation to return a result");
  return result;
};

const setEpisodeContentHash = (candidate: JsonRecord): void => {
  const episode = candidate.episode as JsonRecord;
  const curriculum = candidate.curriculum as JsonRecord;
  const matchingRef = (curriculum.episodeRefs as JsonRecord[]).find(
    (ref) => ref.episodeId === episode.episodeId,
  );
  if (!matchingRef) throw new Error("test_fixture_episode_ref_missing");
  matchingRef.contentHash = hashCanonicalBody(episode);
};

const repinTemplateAndCascade = (
  candidate: JsonRecord,
  templateIndex: number,
): void => {
  const dependencies = candidate.dependencies as JsonRecord;
  const template = (dependencies.templates as JsonRecord[])[templateIndex];
  const templateRef = template.templateRef as JsonRecord;
  templateRef.contentHash = hashCanonicalBody(template.body);

  const episode = candidate.episode as JsonRecord;
  for (const activity of episode.activities as JsonRecord[]) {
    const activityRef = activity.templateRef as JsonRecord;
    if (
      activityRef.templateId === templateRef.templateId &&
      activityRef.version === templateRef.version
    ) {
      activity.templateRef = clone(templateRef);
    }
  }

  for (const definition of episode.delayedProbeDefinitions as JsonRecord[]) {
    const body = definition.body as JsonRecord;
    const binding = body.activityBinding as JsonRecord;
    const bindingRef = binding.templateRef as JsonRecord;
    if (
      bindingRef.templateId !== templateRef.templateId ||
      bindingRef.version !== templateRef.version
    )
      continue;

    binding.templateRef = clone(templateRef);
    const definitionRef = definition.ref as JsonRecord;
    definitionRef.contentHash = hashCanonicalBody(body);
    const learningDesign = episode.learningDesign as JsonRecord;
    const delayedProbeRef = learningDesign.delayedProbeRef as JsonRecord;
    if (delayedProbeRef.probeId === definitionRef.probeId) {
      learningDesign.delayedProbeRef = clone(definitionRef);
    }
    for (const reviewLink of episode.reviewLinks as JsonRecord[]) {
      const reviewRef = reviewLink.probeRef as JsonRecord | undefined;
      if (reviewRef?.probeId === definitionRef.probeId) {
        reviewLink.probeRef = clone(definitionRef);
      }
    }
  }

  setEpisodeContentHash(candidate);
};

const repinPolicyAndCascade = (
  candidate: JsonRecord,
  policyIndex: number,
): void => {
  const dependencies = candidate.dependencies as JsonRecord;
  const policies = dependencies.policies as JsonRecord[];
  const policy = policies[policyIndex];
  const policyRef = policy.ref as JsonRecord;
  policyRef.contentHash = hashCanonicalBody(policy.body);

  const changedTemplateIndexes: number[] = [];
  const templates = dependencies.templates as JsonRecord[];
  for (
    let templateIndex = 0;
    templateIndex < templates.length;
    templateIndex += 1
  ) {
    const templatePolicies = (templates[templateIndex].body as JsonRecord)
      .policies as JsonRecord;
    const templatePolicyRef = templatePolicies[String(policyRef.kind)] as
      | JsonRecord
      | undefined;
    if (
      !templatePolicyRef ||
      templatePolicyRef.kind !== policyRef.kind ||
      templatePolicyRef.key !== policyRef.key ||
      templatePolicyRef.version !== policyRef.version
    )
      continue;
    templatePolicies[String(policyRef.kind)] = clone(policyRef);
    changedTemplateIndexes.push(templateIndex);
  }

  const episode = candidate.episode as JsonRecord;
  const mastery = episode.masteryContract as JsonRecord;
  const masteryPolicyRef = mastery.evidencePolicyRef as JsonRecord;
  if (
    masteryPolicyRef.kind === policyRef.kind &&
    masteryPolicyRef.key === policyRef.key &&
    masteryPolicyRef.version === policyRef.version
  ) {
    mastery.evidencePolicyRef = clone(policyRef);
  }

  for (const templateIndex of changedTemplateIndexes) {
    repinTemplateAndCascade(candidate, templateIndex);
  }
  setEpisodeContentHash(candidate);
};

const exactFamilies = [
  "visual_discovery",
  "listen_choose",
  "sound_contrast",
  "sound_syllable_lab",
  "scripted_repeat_compare",
  "phrase_builder",
  "listen_build_dictation",
  "context_gap_grammar",
  "quick_spoken_response",
  "shadowing_prosody",
  "describe_scene",
  "microstory_radio",
  "branching_scene",
  "scripted_dialogue",
  "speaking_club_mission",
  "personalized_review",
  "speed_match",
] as const;

const materialSet = (values: readonly string[] = []) => ({
  skillIds: [...values],
  phraseFrameIds: [] as string[],
  grammarDistinctionIds: [] as string[],
  semanticSlotIds: [] as string[],
  criticalConstraintIds: [] as string[],
});

const syntheticEpisodeRef = (
  ordinal: number,
  checkpointOrdinals: ReadonlySet<number>,
): JsonRecord => {
  const chapterOrdinal = Math.ceil(ordinal / 8);
  return {
    episodeId: `ep-${String(ordinal).padStart(2, "0")}`,
    ordinal,
    chapterId: `chapter-${String(chapterOrdinal).padStart(2, "0")}`,
    episodeKind: checkpointOrdinals.has(ordinal) ? "checkpoint" : "ordinary",
    contentHash: ordinal.toString(16).padStart(64, "0"),
    prerequisiteEpisodeIds:
      ordinal === 1 ? [] : [`ep-${String(ordinal - 1).padStart(2, "0")}`],
    introducedMaterial: materialSet(),
    requiredCheckpointMaterial: materialSet(),
  };
};

const buildCurriculum = (
  kind: "vertical_slice" | "chapter_internal" | "full_season",
): JsonRecord => {
  const base = clone(validFixture.curriculum as JsonRecord);
  const count =
    kind === "vertical_slice" ? 1 : kind === "chapter_internal" ? 8 : 32;
  const checkpointOrdinals =
    kind === "vertical_slice"
      ? []
      : kind === "chapter_internal"
        ? [8]
        : [8, 16, 24, 32];
  const checkpoints = new Set(checkpointOrdinals);
  const chapterCount = kind === "full_season" ? 4 : 1;
  base.scope = {
    kind,
    includedChapterOrdinals: Array.from(
      { length: chapterCount },
      (_, index) => index + 1,
    ),
    includedEpisodeOrdinals: Array.from(
      { length: count },
      (_, index) => index + 1,
    ),
  };
  base.environment =
    kind === "vertical_slice"
      ? "lab"
      : kind === "chapter_internal"
        ? "internal"
        : "production";
  base.episodeRefs = Array.from({ length: count }, (_, index) =>
    syntheticEpisodeRef(index + 1, checkpoints),
  );
  base.checkpointOrdinals = checkpointOrdinals;
  base.chapters = Array.from({ length: chapterCount }, (_, index) => {
    const first = index * 8 + 1;
    const last = Math.min(first + 7, count);
    const chapter: JsonRecord = {
      chapterId: `chapter-${String(index + 1).padStart(2, "0")}`,
      ordinal: index + 1,
      episodeIds: Array.from(
        { length: last - first + 1 },
        (__, offset) => `ep-${String(first + offset).padStart(2, "0")}`,
      ),
    };
    if (checkpoints.has(last))
      chapter.checkpointEpisodeId = `ep-${String(last).padStart(2, "0")}`;
    return chapter;
  });
  return base;
};

const checkpointContext = {
  independentProbeNodeIds: [
    "cp.n01",
    "cp.n02",
    "cp.alt01",
    "cp.alt02",
    "cp.reassess01",
    "cp.reassess02",
  ],
  nodePhases: {
    "cp.n01": "independent_probe",
    "cp.n02": "independent_probe",
    "cp.alt01": "independent_probe",
    "cp.alt02": "independent_probe",
    "cp.repair01": "near_transfer",
    "cp.repair02": "near_transfer",
    "cp.reassess01": "independent_probe",
    "cp.reassess02": "independent_probe",
  },
  declarations: [
    {
      nodeId: "cp.n01",
      declaration: {
        objectiveId: "objective.introduce-self",
        skillId: "skill.origin",
        construct: "semantic",
        phase: "independent_probe",
        target: { targetKind: "semantic_slot", targetId: "slot.origin" },
      },
    },
    {
      nodeId: "cp.n02",
      declaration: {
        objectiveId: "objective.introduce-self",
        skillId: "skill.polite-close",
        construct: "interaction",
        phase: "independent_probe",
        target: {
          targetKind: "critical_constraint",
          targetId: "constraint.polite-close",
        },
      },
    },
  ],
  taughtScope: {
    skillIds: ["skill.origin", "skill.polite-close"],
    phraseFrameIds: ["pf.from", "pf.see-you"],
    grammarDistinctionIds: ["grammar.i-am"],
    semanticSlotIds: ["slot.origin"],
    criticalConstraintIds: ["constraint.polite-close"],
  },
  requiredCheckpointMaterial: {
    skillIds: ["skill.origin", "skill.polite-close"],
    phraseFrameIds: ["pf.from", "pf.see-you"],
    grammarDistinctionIds: ["grammar.i-am"],
    semanticSlotIds: ["slot.origin"],
    criticalConstraintIds: ["constraint.polite-close"],
  },
} as const;

const validCheckpoint = {
  contractKind: "chapter_assessment",
  coveredEpisodeIds: [
    "ep-01",
    "ep-02",
    "ep-03",
    "ep-04",
    "ep-05",
    "ep-06",
    "ep-07",
  ],
  assessedObjectiveIds: ["objective.introduce-self"],
  assessmentNodeIds: ["cp.n01", "cp.n02"],
  criticalSemanticSlotIds: ["slot.origin"],
  criticalConstraintIds: ["constraint.polite-close"],
  evidenceRequirements: [
    {
      assessmentNodeId: "cp.n01",
      objectiveId: "objective.introduce-self",
      skillId: parseSkillId("skill.origin"),
      construct: "semantic",
      phase: "independent_probe",
      target: { targetKind: "semantic_slot", targetId: "slot.origin" },
      requiredOutcome: "success",
    },
    {
      assessmentNodeId: "cp.n02",
      objectiveId: "objective.introduce-self",
      skillId: "skill.polite-close",
      construct: "interaction",
      phase: "independent_probe",
      target: {
        targetKind: "critical_constraint",
        targetId: "constraint.polite-close",
      },
      requiredOutcome: "success",
    },
  ],
  passPolicyKey: "checkpoint.independent.v1",
  deterministicAlternateRoutes: [
    {
      primaryNodeId: "cp.n01",
      alternateNodeId: "cp.alt01",
      assessedObjectiveIds: ["objective.introduce-self"],
      evidenceTupleKeys: ["letk1.synthetic-slot"],
      aiIndependent: true,
      voiceEvidenceEquivalent: false,
    },
    {
      primaryNodeId: "cp.n02",
      alternateNodeId: "cp.alt02",
      assessedObjectiveIds: ["objective.introduce-self"],
      evidenceTupleKeys: ["letk1.synthetic-constraint"],
      aiIndependent: true,
      voiceEvidenceEquivalent: false,
    },
  ],
  criticalRepairRoutes: [
    {
      target: { targetKind: "semantic_slot", targetId: "slot.origin" },
      repairNodeId: "cp.repair01",
      reassessmentNodeId: "cp.reassess01",
    },
    {
      target: {
        targetKind: "critical_constraint",
        targetId: "constraint.polite-close",
      },
      repairNodeId: "cp.repair02",
      reassessmentNodeId: "cp.reassess02",
    },
  ],
};

describe("Learning V2 Task 1.2 — canonical activity and E1 contract", () => {
  test("exports the exact exhaustive 17-family taxonomy and no checkpoint family", () => {
    expect(V2_ACTIVITY_FAMILIES).toEqual(exactFamilies);
    expect(V2_ACTIVITY_FAMILIES).toHaveLength(17);
    expect(V2_ACTIVITY_FAMILIES).not.toContain("checkpoint");
    expect(Object.isFrozen(V2_ACTIVITY_FAMILIES)).toBe(true);
  });

  test("pins real canonical hashes and the exact E1 learning sequence", () => {
    const dependencies = validFixture.dependencies as JsonRecord;
    for (const template of dependencies.templates as JsonRecord[]) {
      const templateRef = template.templateRef as JsonRecord;
      const body = template.body as JsonRecord;
      expect(templateRef.contentHash).toBe(hashCanonicalBody(body));
      expect(templateRef.templateId).toBe(body.templateId);
      expect(templateRef.version).toBe(body.version);
    }
    for (const policy of dependencies.policies as JsonRecord[]) {
      const policyRef = policy.ref as JsonRecord;
      const body = policy.body as JsonRecord;
      expect(policyRef.contentHash).toBe(hashCanonicalBody(body));
      expect([policyRef.kind, policyRef.key, policyRef.version]).toEqual([
        body.kind,
        body.key,
        body.version,
      ]);
    }
    const episode = validFixture.episode as JsonRecord;
    const definitions = episode.delayedProbeDefinitions as JsonRecord[];
    const delayed = definitions[0];
    const delayedRef = delayed.ref as JsonRecord;
    expect(delayedRef.contentHash).toBe(hashCanonicalBody(delayed.body));
    expect((episode.learningDesign as JsonRecord).delayedProbeRef).toEqual(
      delayedRef,
    );
    expect((episode.reviewLinks as JsonRecord[])[0].probeRef).toEqual(
      delayedRef,
    );
    expect(
      ((validFixture.curriculum as JsonRecord).episodeRefs as JsonRecord[])[0]
        .contentHash,
    ).toBe(hashCanonicalBody(episode));

    const activitiesById = new Map(
      (episode.activities as JsonRecord[]).map((activity) => [
        activity.activityId,
        activity,
      ]),
    );
    const nodes = [
      ...((episode.graph as JsonRecord).nodes as JsonRecord[]),
    ].sort((left, right) => Number(left.position) - Number(right.position));
    const requiredRouteFamilies = nodes
      .slice(0, 8)
      .map((node) => activitiesById.get(node.activityId)?.family);
    expect(requiredRouteFamilies).toEqual([
      "visual_discovery",
      "listen_choose",
      "phrase_builder",
      "phrase_builder",
      "scripted_repeat_compare",
      "quick_spoken_response",
      "quick_spoken_response",
      "scripted_dialogue",
    ]);
    expect(episode.phraseFrames).toHaveLength(8);
    expect(episode.semanticSlots).toHaveLength(12);
    expect((episode.scenario as JsonRecord).title as unknown[]).toHaveLength(1);
    for (const slot of episode.semanticSlots as JsonRecord[]) {
      expect(Array.isArray(slot.role)).toBe(true);
      expect((slot.acceptedTargetValues as unknown[]).length).toBeGreaterThan(
        0,
      );
    }
    expect(episode.starSlots).toHaveLength(8);
    expect(episode.soundFocusIds).toHaveLength(1);
    for (const node of nodes) {
      for (const declaration of node.evidenceDeclarations as JsonRecord[]) {
        expect(declaration).not.toHaveProperty("nodeId");
      }
    }
  });

  test("uses only the exact ModeTemplateArtifactBody hash domain and a metadata-free resolved pair", () => {
    const templates = (validFixture.dependencies as JsonRecord)
      .templates as JsonRecord[];
    for (const template of templates) {
      expect(Object.keys(template).sort()).toEqual(["body", "templateRef"]);
      const body = template.body as JsonRecord;
      expect(body.schemaVersion).toBe("v2-mode-template-body.v1");
      expect(body).not.toHaveProperty("contentHash");
      expect(body).not.toHaveProperty("record");
      expect(body).not.toHaveProperty("lifecycle");
    }
  });

  test("rejects the retired reduced ModeTemplate body even when its exact body hash is pinned", () => {
    const candidate = clone(validFixture);
    const templates = (candidate.dependencies as JsonRecord)
      .templates as JsonRecord[];
    const template = templates[0];
    const sourceBody = template.body as JsonRecord;
    const kernel = (sourceBody.kernel ?? {}) as JsonRecord;
    const legacyBody = {
      schemaVersion: ["v2-resolved-mode-template-body", "v1"].join("."),
      templateId: sourceBody.templateId,
      version: sourceBody.version,
      family: sourceBody.family,
      activityTypeKey: kernel.activityTypeKey ?? sourceBody.activityTypeKey,
      kernelVersion: kernel.kernelVersion ?? sourceBody.kernelVersion,
      payloadSchemaVersion:
        kernel.payloadSchemaVersion ?? sourceBody.payloadSchemaVersion,
      capabilities: sourceBody.capabilityContract ?? sourceBody.capabilities,
      evidenceKinds: ["semantic"],
      policies: sourceBody.policies,
    };
    const templateRef = template.templateRef as JsonRecord;
    template.body = legacyBody;
    delete template.schemaVersion;
    templateRef.contentHash = hashCanonicalBody(legacyBody);
    for (const activity of (candidate.episode as JsonRecord)
      .activities as JsonRecord[]) {
      const activityRef = activity.templateRef as JsonRecord;
      if (activityRef.templateId === templateRef.templateId)
        activity.templateRef = clone(templateRef);
    }
    setEpisodeContentHash(candidate);

    expect(templateRef.contentHash).toBe(hashCanonicalBody(legacyBody));
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "field_value_invalid",
        path: "$.dependencies.templates[0].body.schemaVersion",
      },
    ]);
  });

  test("detects a humanName mutation against the pinned canonical template hash", () => {
    const candidate = clone(validFixture);
    const template = (
      (candidate.dependencies as JsonRecord).templates as JsonRecord[]
    )[0];
    (template.body as JsonRecord).humanName =
      "Mutated after the immutable ref was sealed";
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "template_content_hash_mismatch",
        path: "$.dependencies.templates[0].templateRef.contentHash",
      },
    ]);
  });

  test.each([
    [
      ["dependencies", "templates", 0, "body", "kernel"],
      {
        activityTypeKey: "visual.discovery.v1",
        kernelVersion: 1,
        rendererKey: "choice.visual-discovery.v1",
        rendererSchemaVersion: 1,
        payloadSchemaKey: "payload.visual-discovery.v1",
        payloadSchemaVersion: 1,
      },
      "field_missing",
      "$.dependencies.templates[0].body.kernel.payloadSchemaHash",
    ],
    [
      ["dependencies", "templates", 0, "body", "capabilityContract"],
      {
        microphone: "none",
        speechRecognition: "none",
        audioPlayback: false,
        network: "none",
        camera: "optional",
      },
      "field_unknown",
      "$.dependencies.templates[0].body.capabilityContract.camera",
    ],
  ] as const)(
    "fails closed on missing or unknown canonical ModeTemplate fields at %s",
    (mutationPath, value, expectedCode, expectedPath) => {
      const candidate = clone(validFixture);
      applyMutations(candidate, [{ op: "set", path: mutationPath, value }]);
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([{ code: expectedCode, path: expectedPath }]);
    },
  );

  test("accepts the exact E1 vertical slice with pinned DecisionRegistry v1", () => {
    const result = validateV2LearningPackage(validFixture, validationContext);
    expect(result).toEqual({ ok: true, issues: [], value: validFixture });
    if (result.ok) {
      expect(result.value.episode.schemaVersion).toBe("v2-episode-contract.v1");
    }
  });

  test("accepts an optional-review scheduler link without delayed materialization fields", () => {
    const candidate = clone(validFixture);
    const episode = candidate.episode as JsonRecord;
    (episode.reviewLinks as JsonRecord[]).push({
      scheduleKind: "optional_review",
      targetEpisodeId: "ep-01",
      delay: "next_episode",
      skillIds: ["skill.greet"],
    });
    (
      (candidate.curriculum as JsonRecord).episodeRefs as JsonRecord[]
    )[0].contentHash = hashCanonicalBody(episode);
    expect(validateV2LearningPackage(candidate, validationContext)).toEqual({
      ok: true,
      issues: [],
      value: candidate,
    });
  });

  test.each(invalidCorpus.invalidCases)(
    "rejects $caseId with stable ordered duplicate-preserving issues",
    (testCase) => {
      const candidate = clone(validFixture);
      applyMutations(candidate, testCase.mutations);
      const result = validateV2LearningPackage(candidate, validationContext);
      expect(result.ok).toBe(false);
      if (result.ok === true)
        throw new Error(`Expected ${testCase.caseId} to be rejected`);
      expect(issueSummary(result)).toEqual(testCase.expectedIssues);
      expect(
        result.issues.every(
          (issue) => issue.severity === "blocking" && issue.waivable === false,
        ),
      ).toBe(true);
    },
  );

  test.each([
    null,
    [],
    {},
    { schemaVersion: "learning-v2-contract-fixture.v1" },
  ])("fails closed without throwing for malformed package %#", (candidate) => {
    const result = validatePackageOnceWithoutThrow(candidate);
    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("Learning V2 Task 1.2 — post-GREEN adversarial contract boundary", () => {
  test("publishes typed prompt/media/input/fallback requirements and exact learning targets", () => {
    for (const activity of (validFixture.episode as JsonRecord)
      .activities as JsonRecord[]) {
      expect(activity.requirements).toEqual({
        prompt: expect.any(Array),
        media: expect.any(Array),
        input: expect.any(Array),
        fallback: {
          deterministicScripted: expect.any(Boolean),
          offline: expect.stringMatching(
            /^(full|cached_assets_only|not_supported)$/,
          ),
          nonVoiceCoreEquivalent: expect.any(Boolean),
        },
      });
      expect(activity.targets).toEqual({
        skillIds: expect.any(Array),
        phraseFrameIds: expect.any(Array),
        semanticSlotIds: expect.any(Array),
      });
    }
  });

  test.each([
    [
      "missing template identity",
      (_templates: JsonRecord[]): JsonRecord => ({
        templateId: "template.missing.fallback.v1",
        version: 1,
        contentHash:
          "7bda213c536b6efad8a4e980c5f4b728e82dd2c273be2f5883eb4c8b37c46ebd",
      }),
    ],
    [
      "existing templateId and version with the wrong valid contentHash",
      (templates: JsonRecord[]): JsonRecord => {
        const fallbackRef = clone(templates[0].templateRef as JsonRecord);
        fallbackRef.contentHash = (
          templates[1].templateRef as JsonRecord
        ).contentHash;
        return fallbackRef;
      },
    ],
    [
      "existing templateId with the wrong positive version",
      (templates: JsonRecord[]): JsonRecord => {
        const fallbackRef = clone(templates[0].templateRef as JsonRecord);
        fallbackRef.version = Number(fallbackRef.version) + 1;
        return fallbackRef;
      },
    ],
  ] as const)(
    "rejects a fully pinned fallbackTemplateRef that does not resolve byte-exactly: %s",
    (_label, buildFallbackRef) => {
      const candidate = clone(validFixture);
      const templates = (candidate.dependencies as JsonRecord)
        .templates as JsonRecord[];
      const templateIndex = templates.findIndex(
        (template) =>
          (template.templateRef as JsonRecord).templateId ===
          "template.quick.v1",
      );
      if (templateIndex < 0)
        throw new Error("test_fixture_quick_template_missing");
      const template = templates[templateIndex];
      const capabilityContract = (template.body as JsonRecord)
        .capabilityContract as JsonRecord;
      capabilityContract.fallbackTemplateRef = buildFallbackRef(templates);
      repinTemplateAndCascade(candidate, templateIndex);

      const templateRef = template.templateRef as JsonRecord;
      const episode = candidate.episode as JsonRecord;
      const delayed = (episode.delayedProbeDefinitions as JsonRecord[])[0];
      expect(templateRef.contentHash).toBe(hashCanonicalBody(template.body));
      expect(
        (episode.activities as JsonRecord[])
          .filter(
            (activity) =>
              (activity.templateRef as JsonRecord).templateId ===
              templateRef.templateId,
          )
          .every(
            (activity) =>
              JSON.stringify(activity.templateRef) ===
              JSON.stringify(templateRef),
          ),
      ).toBe(true);
      expect(
        ((delayed.body as JsonRecord).activityBinding as JsonRecord)
          .templateRef,
      ).toEqual(templateRef);
      expect((delayed.ref as JsonRecord).contentHash).toBe(
        hashCanonicalBody(delayed.body),
      );
      expect((episode.learningDesign as JsonRecord).delayedProbeRef).toEqual(
        delayed.ref,
      );
      expect((episode.reviewLinks as JsonRecord[])[0].probeRef).toEqual(
        delayed.ref,
      );
      expect(
        ((candidate.curriculum as JsonRecord).episodeRefs as JsonRecord[])[0]
          .contentHash,
      ).toBe(hashCanonicalBody(episode));
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([
        {
          code: "template_fallback_reference_missing",
          path: `$.dependencies.templates[${templateIndex}].body.capabilityContract.fallbackTemplateRef`,
        },
      ]);
    },
  );

  test("rejects an invalid pedagogicalPurpose primary skill identity after full repinning", () => {
    const candidate = clone(validFixture);
    const templates = (candidate.dependencies as JsonRecord)
      .templates as JsonRecord[];
    const templateIndex = 0;
    const template = templates[templateIndex];
    const purpose = (template.body as JsonRecord)
      .pedagogicalPurpose as JsonRecord;
    (purpose.primarySkillIds as unknown[])[0] = "bad skill";
    repinTemplateAndCascade(candidate, templateIndex);

    expect((template.templateRef as JsonRecord).contentHash).toBe(
      hashCanonicalBody(template.body),
    );
    expect(
      ((candidate.curriculum as JsonRecord).episodeRefs as JsonRecord[])[0]
        .contentHash,
    ).toBe(hashCanonicalBody(candidate.episode));
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "identity_invalid",
        path: "$.dependencies.templates[0].body.pedagogicalPurpose.primarySkillIds[0]",
      },
    ]);
  });

  test("resolves an exact policy version instead of the first policy with the same kind", () => {
    const candidate = clone(validFixture);
    const dependencies = candidate.dependencies as JsonRecord;
    const policies = dependencies.policies as JsonRecord[];
    const templates = dependencies.templates as JsonRecord[];
    const rewardV2 = clone(
      policies.find(
        (policy) => (policy.ref as JsonRecord).kind === "reward",
      ) as JsonRecord,
    );
    (rewardV2.body as JsonRecord).version = 2;
    (rewardV2.ref as JsonRecord).version = 2;
    (rewardV2.ref as JsonRecord).contentHash = hashCanonicalBody(rewardV2.body);
    policies.push(rewardV2);
    ((templates[0].body as JsonRecord).policies as JsonRecord).reward = clone(
      rewardV2.ref,
    );
    const templateRef = templates[0].templateRef as JsonRecord;
    templateRef.contentHash = hashCanonicalBody(templates[0].body);
    for (const activity of (candidate.episode as JsonRecord)
      .activities as JsonRecord[]) {
      if (
        (activity.templateRef as JsonRecord).templateId ===
        templateRef.templateId
      ) {
        activity.templateRef = clone(templateRef);
      }
    }
    setEpisodeContentHash(candidate);
    expect(validateV2LearningPackage(candidate, validationContext)).toEqual({
      ok: true,
      issues: [],
      value: candidate,
    });
  });

  test("rejects duplicate exact dependency policy identities deterministically", () => {
    const candidate = clone(validFixture);
    const policies = (candidate.dependencies as JsonRecord)
      .policies as JsonRecord[];
    policies.push(clone(policies[0]));
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "dependency_duplicate_id",
        path: `$.dependencies.policies[${policies.length - 1}]`,
      },
    ]);
  });

  test.each([
    [
      ["dependencies", "templates", 0, "implementationPath"],
      "$.dependencies.templates[0].implementationPath",
    ],
    [
      ["dependencies", "templates", 0, "templateRef", "latest"],
      "$.dependencies.templates[0].templateRef.latest",
    ],
    [
      ["dependencies", "templates", 0, "body", "capabilityContract", "camera"],
      "$.dependencies.templates[0].body.capabilityContract.camera",
    ],
    [
      [
        "dependencies",
        "templates",
        0,
        "body",
        "policies",
        "evidence",
        "implementationPath",
      ],
      "$.dependencies.templates[0].body.policies.evidence.implementationPath",
    ],
    [
      ["dependencies", "policies", 0, "implementationPath"],
      "$.dependencies.policies[0].implementationPath",
    ],
    [
      ["episode", "delayedProbeDefinitions", 0, "ref", "latest"],
      "$.episode.delayedProbeDefinitions[0].ref.latest",
    ],
    [
      ["episode", "delayedProbeDefinitions", 0, "body", "implementationPath"],
      "$.episode.delayedProbeDefinitions[0].body.implementationPath",
    ],
    [
      [
        "episode",
        "delayedProbeDefinitions",
        0,
        "body",
        "activityBinding",
        "latest",
      ],
      "$.episode.delayedProbeDefinitions[0].body.activityBinding.latest",
    ],
    [
      [
        "episode",
        "delayedProbeDefinitions",
        0,
        "body",
        "pedagogicalContextContract",
        "latest",
      ],
      "$.episode.delayedProbeDefinitions[0].body.pedagogicalContextContract.latest",
    ],
    [
      ["episode", "reviewLinks", 0, "latest"],
      "$.episode.reviewLinks[0].latest",
    ],
    [
      ["episode", "capstoneContract", "latest"],
      "$.episode.capstoneContract.latest",
    ],
    [
      ["episode", "learningDesign", "latest"],
      "$.episode.learningDesign.latest",
    ],
    [
      ["episode", "masteryContract", "latest"],
      "$.episode.masteryContract.latest",
    ],
    [
      ["episode", "accessibilityRoutes", 0, "latest"],
      "$.episode.accessibilityRoutes[0].latest",
    ],
    [["curriculum", "scope", "latest"], "$.curriculum.scope.latest"],
    [
      ["curriculum", "chapters", 0, "latest"],
      "$.curriculum.chapters[0].latest",
    ],
    [
      ["curriculum", "episodeRefs", 0, "latest"],
      "$.curriculum.episodeRefs[0].latest",
    ],
    [
      ["curriculum", "episodeRefs", 0, "introducedMaterial", "latest"],
      "$.curriculum.episodeRefs[0].introducedMaterial.latest",
    ],
    [
      ["curriculum", "episodeRefs", 0, "requiredCheckpointMaterial", "latest"],
      "$.curriculum.episodeRefs[0].requiredCheckpointMaterial.latest",
    ],
  ] as const)(
    "rejects unknown nested field at %s before any hash cascade",
    (mutationPath, expectedPath) => {
      const candidate = clone(validFixture);
      applyMutations(candidate, [
        { op: "set", path: mutationPath, value: true },
      ]);
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([{ code: "field_unknown", path: expectedPath }]);
    },
  );

  test.each([
    [
      ["episode", "activities", 0, "estimatedSeconds"],
      -10,
      "field_value_invalid",
      "$.episode.activities[0].estimatedSeconds",
    ],
    [
      ["episode", "activities", 0, "tags", "skillIds"],
      5,
      "field_type_invalid",
      "$.episode.activities[0].tags.skillIds",
    ],
    [
      ["episode", "graph", "edges", 0, "condition"],
      "teleport",
      "field_value_invalid",
      "$.episode.graph.edges[0].condition",
    ],
    [
      ["episode", "graph", "nodes", 0, "evidenceDeclarations", 0, "construct"],
      "fluency_magic",
      "field_value_invalid",
      "$.episode.graph.nodes[0].evidenceDeclarations[0].construct",
    ],
    [
      [
        "episode",
        "graph",
        "nodes",
        0,
        "evidenceDeclarations",
        0,
        "target",
        "targetKind",
      ],
      "phrase",
      "field_value_invalid",
      "$.episode.graph.nodes[0].evidenceDeclarations[0].target.targetKind",
    ],
    [
      ["episode", "ordinal"],
      999,
      "episode_identity_mismatch",
      "$.episode.ordinal",
    ],
    [
      ["episode", "seasonId"],
      "season-other",
      "episode_identity_mismatch",
      "$.episode.seasonId",
    ],
    [
      ["curriculum", "environment"],
      "preview",
      "curriculum_environment_invalid",
      "$.curriculum.environment",
    ],
  ] as const)(
    "rejects runtime type/discriminant drift at %s",
    (mutationPath, value, expectedCode, expectedPath) => {
      const candidate = clone(validFixture);
      applyMutations(candidate, [{ op: "set", path: mutationPath, value }]);
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([{ code: expectedCode, path: expectedPath }]);
    },
  );

  test.each([
    [
      "template",
      ["dependencies", "templates", 0, "body", "kernel", "kernelVersion"],
      2,
      "template_content_hash_mismatch",
      "$.dependencies.templates[0].templateRef.contentHash",
    ],
    [
      "policy",
      ["dependencies", "policies", 0, "body", "description"],
      "mutated after seal",
      "policy_content_hash_mismatch",
      "$.dependencies.policies[0].ref.contentHash",
    ],
  ] as const)(
    "recomputes the canonical %s body hash instead of trusting its ref",
    (_label, mutationPath, value, expectedCode, expectedPath) => {
      const candidate = clone(validFixture);
      applyMutations(candidate, [{ op: "set", path: mutationPath, value }]);
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([{ code: expectedCode, path: expectedPath }]);
    },
  );

  test.each([
    [
      [],
      "assessment_node_invalid",
      "$.episode.assessmentNodes.independentProbeNodeIds",
    ],
    [
      ["ep01.n01"],
      "assessment_node_invalid",
      "$.episode.assessmentNodes.independentProbeNodeIds[0]",
    ],
    [
      ["ep01.ghost"],
      "assessment_node_invalid",
      "$.episode.assessmentNodes.independentProbeNodeIds[0]",
    ],
  ] as const)(
    "derives independent assessment membership from graph phases: %j",
    (nodeIds, expectedCode, expectedPath) => {
      const candidate = clone(validFixture);
      (
        (candidate.episode as JsonRecord).assessmentNodes as JsonRecord
      ).independentProbeNodeIds = [...nodeIds];
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([{ code: expectedCode, path: expectedPath }]);
    },
  );

  test("requires the learning-design independent probe ref to resolve in the assessment set", () => {
    const candidate = clone(validFixture);
    (
      (candidate.episode as JsonRecord).learningDesign as JsonRecord
    ).independentProbeRef = "ep01.n01";
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "independent_probe_ref_invalid",
        path: "$.episode.learningDesign.independentProbeRef",
      },
    ]);
  });

  test("rejects optional-review membership that points to a non-optional graph node", () => {
    const candidate = clone(validFixture);
    (
      (candidate.episode as JsonRecord).assessmentNodes as JsonRecord
    ).optionalReviewNodeIds = ["ep01.n01"];
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "assessment_node_invalid",
        path: "$.episode.assessmentNodes.optionalReviewNodeIds[0]",
      },
    ]);
  });

  test.each([
    ["empty route", ["episode", "accessibilityRoutes", 0, "nodeIds"], []],
    [
      "route missing capstone",
      ["episode", "accessibilityRoutes", 0, "nodeIds"],
      [
        "ep01.n01",
        "ep01.n02",
        "ep01.n03",
        "ep01.n04",
        "ep01.n05",
        "ep01.n06",
        "ep01.n07",
      ],
    ],
  ] as const)(
    "derives accessibility reachability from actual graph nodes: %s",
    (_label, mutationPath, value) => {
      const candidate = clone(validFixture);
      applyMutations(candidate, [{ op: "set", path: mutationPath, value }]);
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([
        {
          code: "accessibility_route_unreachable",
          path: "$.episode.accessibilityRoutes[0]",
        },
      ]);
    },
  );

  test.each([
    [[], "$.episode.starSlots[0].acceptedNodeIds"],
    [["ep01.n02"], "$.episode.starSlots[0].acceptedNodeIds[0]"],
  ] as const)(
    "requires each star slot to bind exact graph nodes: %j",
    (acceptedNodeIds, expectedPath) => {
      const candidate = clone(validFixture);
      (
        (candidate.episode as JsonRecord).starSlots as JsonRecord[]
      )[0].acceptedNodeIds = [...acceptedNodeIds];
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([{ code: "star_slot_binding_invalid", path: expectedPath }]);
    },
  );

  test("forbids checkpointContract on an ordinary episode", () => {
    const candidate = clone(validFixture);
    (candidate.episode as JsonRecord).checkpointContract = { garbage: true };
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "checkpoint_contract_forbidden",
        path: "$.episode.checkpointContract",
      },
    ]);
  });

  test("requires checkpointContract only at exact chapter checkpoint ordinals", () => {
    const candidate = clone(validFixture);
    (candidate.episode as JsonRecord).episodeKind = "checkpoint";
    (candidate.episode as JsonRecord).ordinal = 8;
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "checkpoint_contract_missing",
        path: "$.episode.checkpointContract",
      },
    ]);
  });

  test("runs the embedded checkpoint contract through the full package validator", () => {
    const candidate = clone(validFixture);
    const episode = candidate.episode as JsonRecord;
    episode.episodeId = "ep-08";
    episode.episodeKind = "checkpoint";
    episode.ordinal = 8;
    const delayed = (episode.delayedProbeDefinitions as JsonRecord[])[0];
    (delayed.body as JsonRecord).targetEpisodeId = "ep-08";
    (delayed.ref as JsonRecord).contentHash = hashCanonicalBody(delayed.body);
    (episode.learningDesign as JsonRecord).delayedProbeRef = clone(delayed.ref);
    const delayedReview = (episode.reviewLinks as JsonRecord[])[0];
    delayedReview.targetEpisodeId = "ep-08";
    delayedReview.probeRef = clone(delayed.ref);
    episode.checkpointContract = {
      ...clone(validCheckpoint),
      contractKind: "daily_quiz",
    };
    candidate.curriculum = buildCurriculum("chapter_internal");
    setEpisodeContentHash(candidate);
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "field_value_invalid",
        path: "$.episode.checkpointContract.contractKind",
      },
    ]);
  });

  test.each([
    [
      [
        "episode",
        "graph",
        "nodes",
        0,
        "evidenceDeclarations",
        0,
        "objectiveId",
      ],
      "objective.missing",
      "declaration_reference_missing",
      "$.episode.graph.nodes[0].evidenceDeclarations[0].objectiveId",
    ],
    [
      ["episode", "graph", "nodes", 0, "evidenceDeclarations", 0, "skillId"],
      "skill.missing",
      "declaration_reference_missing",
      "$.episode.graph.nodes[0].evidenceDeclarations[0].skillId",
    ],
    [
      [
        "episode",
        "graph",
        "nodes",
        0,
        "evidenceDeclarations",
        0,
        "target",
        "targetId",
      ],
      "objective.other",
      "declaration_reference_missing",
      "$.episode.graph.nodes[0].evidenceDeclarations[0].target.targetId",
    ],
    [
      ["episode", "capstoneContract", "primaryNodeIds", 0],
      "ep01.ghost",
      "capstone_reference_missing",
      "$.episode.capstoneContract.primaryNodeIds[0]",
    ],
    [
      ["episode", "masteryContract", "requirements", 0, "objectiveId"],
      "objective.missing",
      "mastery_requirement_invalid",
      "$.episode.masteryContract.requirements[0]",
    ],
    [
      [
        "episode",
        "graph",
        "nodes",
        8,
        "pedagogicalContextContract",
        "maximumHints",
      ],
      1,
      "independent_context_invalid",
      "$.episode.graph.nodes[8].pedagogicalContextContract",
    ],
  ] as const)(
    "closes learning references and phase-specific context at %s",
    (mutationPath, value, expectedCode, expectedPath) => {
      const candidate = clone(validFixture);
      applyMutations(candidate, [{ op: "set", path: mutationPath, value }]);
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([{ code: expectedCode, path: expectedPath }]);
    },
  );

  test("requires mastery to pin the exact dependency evidence policy", () => {
    const candidate = clone(validFixture);
    (
      ((candidate.episode as JsonRecord).masteryContract as JsonRecord)
        .evidencePolicyRef as JsonRecord
    ).version = 2;
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "mastery_policy_mismatch",
        path: "$.episode.masteryContract.evidencePolicyRef",
      },
    ]);
  });

  test.each([
    [
      "independent model support",
      [
        "episode",
        "graph",
        "nodes",
        8,
        "pedagogicalContextContract",
        "allowedSupportLevels",
      ],
      ["model"],
      "independent_context_invalid",
      "$.episode.graph.nodes[8].pedagogicalContextContract",
    ],
    [
      "independent full-text support",
      [
        "episode",
        "graph",
        "nodes",
        8,
        "pedagogicalContextContract",
        "allowedSupportLevels",
      ],
      ["full_text"],
      "independent_context_invalid",
      "$.episode.graph.nodes[8].pedagogicalContextContract",
    ],
    [
      "independent empty support set",
      [
        "episode",
        "graph",
        "nodes",
        8,
        "pedagogicalContextContract",
        "allowedSupportLevels",
      ],
      [],
      "independent_context_invalid",
      "$.episode.graph.nodes[8].pedagogicalContextContract",
    ],
    [
      "independent duplicate support level",
      [
        "episode",
        "graph",
        "nodes",
        8,
        "pedagogicalContextContract",
        "allowedSupportLevels",
      ],
      ["visual_only", "visual_only"],
      "independent_context_invalid",
      "$.episode.graph.nodes[8].pedagogicalContextContract",
    ],
    [
      "delayed model support",
      [
        "episode",
        "delayedProbeDefinitions",
        0,
        "body",
        "pedagogicalContextContract",
        "allowedSupportLevels",
      ],
      ["model"],
      "delayed_probe_context_invalid",
      "$.episode.delayedProbeDefinitions[0].body.pedagogicalContextContract",
    ],
    [
      "delayed full-text support",
      [
        "episode",
        "delayedProbeDefinitions",
        0,
        "body",
        "pedagogicalContextContract",
        "allowedSupportLevels",
      ],
      ["full_text"],
      "delayed_probe_context_invalid",
      "$.episode.delayedProbeDefinitions[0].body.pedagogicalContextContract",
    ],
    [
      "delayed empty support set",
      [
        "episode",
        "delayedProbeDefinitions",
        0,
        "body",
        "pedagogicalContextContract",
        "allowedSupportLevels",
      ],
      [],
      "delayed_probe_context_invalid",
      "$.episode.delayedProbeDefinitions[0].body.pedagogicalContextContract",
    ],
    [
      "delayed duplicate support level",
      [
        "episode",
        "delayedProbeDefinitions",
        0,
        "body",
        "pedagogicalContextContract",
        "allowedSupportLevels",
      ],
      ["none", "none"],
      "delayed_probe_context_invalid",
      "$.episode.delayedProbeDefinitions[0].body.pedagogicalContextContract",
    ],
    [
      "delayed false new-surface declaration",
      [
        "episode",
        "delayedProbeDefinitions",
        0,
        "body",
        "pedagogicalContextContract",
        "context",
        "newSurfaceForm",
      ],
      false,
      "delayed_probe_context_invalid",
      "$.episode.delayedProbeDefinitions[0].body.pedagogicalContextContract",
    ],
  ] as const)(
    "enforces assessment-safe pedagogical context: %s",
    (_label, mutationPath, value, expectedCode, expectedPath) => {
      const candidate = clone(validFixture);
      applyMutations(candidate, [{ op: "set", path: mutationPath, value }]);
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([{ code: expectedCode, path: expectedPath }]);
    },
  );

  test.each([
    [
      "construct",
      "unsupported_construct",
      "mastery_requirement_invalid",
      "$.episode.masteryContract.requirements[0].construct",
    ],
    [
      "phase",
      "encounter_build",
      "mastery_requirement_invalid",
      "$.episode.masteryContract.requirements[0].phase",
    ],
    [
      "requiredValidity",
      "valid",
      "mastery_requirement_invalid",
      "$.episode.masteryContract.requirements[0].requiredValidity",
    ],
    [
      "requiredOutcome",
      "complete",
      "mastery_requirement_invalid",
      "$.episode.masteryContract.requirements[0].requiredOutcome",
    ],
    [
      "maximumSupport",
      "answer_key",
      "mastery_requirement_invalid",
      "$.episode.masteryContract.requirements[0].maximumSupport",
    ],
  ] as const)(
    "enforces the exact mastery requirement literal at %s",
    (field, value, expectedCode, expectedPath) => {
      const candidate = clone(validFixture);
      const requirement = (
        ((candidate.episode as JsonRecord).masteryContract as JsonRecord)
          .requirements as JsonRecord[]
      )[0];
      requirement[field] = value;
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([{ code: expectedCode, path: expectedPath }]);
    },
  );

  test.each([
    ["durableClaimRequiresDelayedProbe", false],
    ["accessibilityHandling", "accessibility_passes"],
    ["numericCutoffHypothesisRef", "HYP-V2-004"],
    ["performanceStarsAreLearningEvidence", true],
    ["confidentVoiceTurnCountAloneIsSufficient", true],
  ] as const)(
    "enforces the exact mastery contract literal at %s",
    (field, value) => {
      const candidate = clone(validFixture);
      ((candidate.episode as JsonRecord).masteryContract as JsonRecord)[field] =
        value;
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([
        {
          code: "mastery_contract_invalid",
          path: `$.episode.masteryContract.${field}`,
        },
      ]);
    },
  );

  test("requires a non-empty unique mastery requirement set", () => {
    const empty = clone(validFixture);
    ((empty.episode as JsonRecord).masteryContract as JsonRecord).requirements =
      [];
    expect(
      issueSummary(validateV2LearningPackage(empty, validationContext)),
    ).toEqual([
      {
        code: "mastery_requirement_invalid",
        path: "$.episode.masteryContract.requirements",
      },
    ]);

    const duplicate = clone(validFixture);
    const requirements = (
      (duplicate.episode as JsonRecord).masteryContract as JsonRecord
    ).requirements as JsonRecord[];
    requirements[1] = clone(requirements[0]);
    expect(
      issueSummary(validateV2LearningPackage(duplicate, validationContext)),
    ).toEqual([
      {
        code: "mastery_requirement_invalid",
        path: "$.episode.masteryContract.requirements[1]",
      },
    ]);
  });

  test.each([
    ["independent_probe", "independent"],
    ["delayed_probe", "delayed"],
  ] as const)(
    "requires a meaningful %s mastery requirement",
    (phase, _label) => {
      const candidate = clone(validFixture);
      const mastery = (candidate.episode as JsonRecord)
        .masteryContract as JsonRecord;
      mastery.requirements = (mastery.requirements as JsonRecord[]).filter(
        (requirement) => requirement.phase !== phase,
      );
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([
        {
          code: "mastery_requirement_invalid",
          path: "$.episode.masteryContract.requirements",
        },
      ]);
    },
  );

  test("requires the resolved evidence policy to publish every mastery construct after full repinning", () => {
    const candidate = clone(validFixture);
    const policies = (candidate.dependencies as JsonRecord)
      .policies as JsonRecord[];
    const evidencePolicyIndex = policies.findIndex(
      (policy) => (policy.ref as JsonRecord).kind === "evidence",
    );
    if (evidencePolicyIndex < 0)
      throw new Error("test_fixture_evidence_policy_missing");
    const body = policies[evidencePolicyIndex].body as JsonRecord;
    body.evidenceKinds = (body.evidenceKinds as string[]).filter(
      (kind) => kind !== "spoken",
    );
    repinPolicyAndCascade(candidate, evidencePolicyIndex);

    const policy = policies[evidencePolicyIndex];
    expect((policy.ref as JsonRecord).contentHash).toBe(
      hashCanonicalBody(policy.body),
    );
    const episode = candidate.episode as JsonRecord;
    expect((episode.masteryContract as JsonRecord).evidencePolicyRef).toEqual(
      policy.ref,
    );
    expect(
      ((candidate.curriculum as JsonRecord).episodeRefs as JsonRecord[])[0]
        .contentHash,
    ).toBe(hashCanonicalBody(episode));
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "mastery_policy_mismatch",
        path: "$.episode.masteryContract.requirements[1].construct",
      },
    ]);
  });

  test.each([
    ["family", "compatibleFamilies"],
    ["kernel", "compatibleKernelKeys"],
  ] as const)(
    "requires every resolved template policy to declare compatible %s after full repinning",
    (compatibilityKind, compatibilityField) => {
      const candidate = clone(validFixture);
      const dependencies = candidate.dependencies as JsonRecord;
      const templates = dependencies.templates as JsonRecord[];
      const templateIndex = 0;
      const templateBody = templates[templateIndex].body as JsonRecord;
      const rewardRef = (templateBody.policies as JsonRecord)
        .reward as JsonRecord;
      const policies = dependencies.policies as JsonRecord[];
      const policyIndex = policies.findIndex(
        (policy) => JSON.stringify(policy.ref) === JSON.stringify(rewardRef),
      );
      if (policyIndex < 0)
        throw new Error("test_fixture_reward_policy_missing");
      const policyBody = policies[policyIndex].body as JsonRecord;
      const incompatibleValue =
        compatibilityKind === "family"
          ? templateBody.family
          : (templateBody.kernel as JsonRecord).activityTypeKey;
      policyBody[compatibilityField] = (
        policyBody[compatibilityField] as string[]
      ).filter((value) => value !== incompatibleValue);
      repinPolicyAndCascade(candidate, policyIndex);

      const policy = policies[policyIndex];
      expect((policy.ref as JsonRecord).contentHash).toBe(
        hashCanonicalBody(policy.body),
      );
      expect(
        ((templates[templateIndex].body as JsonRecord).policies as JsonRecord)
          .reward,
      ).toEqual(policy.ref);
      expect(
        (templates[templateIndex].templateRef as JsonRecord).contentHash,
      ).toBe(hashCanonicalBody(templates[templateIndex].body));
      expect(
        ((candidate.curriculum as JsonRecord).episodeRefs as JsonRecord[])[0]
          .contentHash,
      ).toBe(hashCanonicalBody(candidate.episode));
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([
        {
          code: "policy_compatibility_mismatch",
          path: `$.dependencies.templates[${templateIndex}].body.policies.reward`,
        },
      ]);
    },
  );

  test.each([
    [
      ["dependencies", "templates", 0, "body", "templateId"],
      "$.dependencies.templates[0].body.templateId",
    ],
    [
      ["dependencies", "policies", 0, "ref", "key"],
      "$.dependencies.policies[0].ref.key",
    ],
    [["dependencies", "fadeRuleIds", 0], "$.dependencies.fadeRuleIds[0]"],
    [["episode", "episodeId"], "$.episode.episodeId"],
    [["episode", "seasonId"], "$.episode.seasonId"],
    [["episode", "scenario", "scenarioId"], "$.episode.scenario.scenarioId"],
    [
      ["episode", "phraseFrames", 0, "phraseFrameId"],
      "$.episode.phraseFrames[0].phraseFrameId",
    ],
    [
      ["episode", "semanticSlots", 0, "semanticSlotId"],
      "$.episode.semanticSlots[0].semanticSlotId",
    ],
    [
      ["episode", "graph", "nodes", 0, "nodeId"],
      "$.episode.graph.nodes[0].nodeId",
    ],
    [
      ["episode", "graph", "edges", 0, "edgeId"],
      "$.episode.graph.edges[0].edgeId",
    ],
    [["episode", "objectiveIds", 0], "$.episode.objectiveIds[0]"],
    [["episode", "skillIds", 0], "$.episode.skillIds[0]"],
    [
      [
        "episode",
        "graph",
        "nodes",
        0,
        "evidenceDeclarations",
        0,
        "target",
        "targetId",
      ],
      "$.episode.graph.nodes[0].evidenceDeclarations[0].target.targetId",
    ],
    [
      [
        "episode",
        "graph",
        "nodes",
        0,
        "pedagogicalContextContract",
        "context",
        "contextId",
      ],
      "$.episode.graph.nodes[0].pedagogicalContextContract.context.contextId",
    ],
    [
      [
        "episode",
        "graph",
        "nodes",
        0,
        "pedagogicalContextContract",
        "prompt",
        "promptId",
      ],
      "$.episode.graph.nodes[0].pedagogicalContextContract.prompt.promptId",
    ],
    [
      ["episode", "starSlots", 0, "starSlotId"],
      "$.episode.starSlots[0].starSlotId",
    ],
    [
      ["episode", "requiredLoops", "encounterBuildNodeIds", 0],
      "$.episode.requiredLoops.encounterBuildNodeIds[0]",
    ],
    [
      ["episode", "assessmentNodes", "independentProbeNodeIds", 0],
      "$.episode.assessmentNodes.independentProbeNodeIds[0]",
    ],
    [
      ["episode", "capstoneContract", "objectiveIds", 0],
      "$.episode.capstoneContract.objectiveIds[0]",
    ],
    [
      ["episode", "learningDesign", "supportPlan", 0, "fadeRuleId"],
      "$.episode.learningDesign.supportPlan[0].fadeRuleId",
    ],
    [
      ["episode", "learningDesign", "supportPlan", 0, "escalationRuleId"],
      "$.episode.learningDesign.supportPlan[0].escalationRuleId",
    ],
    [
      ["episode", "learningDesign", "delayedWindowPolicyId"],
      "$.episode.learningDesign.delayedWindowPolicyId",
    ],
    [
      ["episode", "delayedProbeDefinitions", 0, "body", "probeId"],
      "$.episode.delayedProbeDefinitions[0].body.probeId",
    ],
    [
      ["episode", "reviewLinks", 0, "targetEpisodeId"],
      "$.episode.reviewLinks[0].targetEpisodeId",
    ],
    [
      ["episode", "accessibilityRoutes", 0, "routeId"],
      "$.episode.accessibilityRoutes[0].routeId",
    ],
    [["curriculum", "curriculumId"], "$.curriculum.curriculumId"],
    [["curriculum", "seasonId"], "$.curriculum.seasonId"],
    [
      ["curriculum", "chapters", 0, "chapterId"],
      "$.curriculum.chapters[0].chapterId",
    ],
    [
      [
        "curriculum",
        "episodeRefs",
        0,
        "introducedMaterial",
        "phraseFrameIds",
        0,
      ],
      "$.curriculum.episodeRefs[0].introducedMaterial.phraseFrameIds[0]",
    ],
    [
      ["curriculum", "requiredCapabilityKeys", 0],
      "$.curriculum.requiredCapabilityKeys[0]",
    ],
  ] as const)(
    "applies the canonical identity grammar before semantic/hash cascades at %s",
    (mutationPath, expectedPath) => {
      const candidate = clone(validFixture);
      applyMutations(candidate, [
        { op: "set", path: mutationPath, value: "bad id" },
      ]);
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([{ code: "identity_invalid", path: expectedPath }]);
    },
  );

  test("rejects a multi-edge prerequisite cycle", () => {
    const candidate = clone(validFixture);
    const episode = candidate.episode as JsonRecord;
    (episode.objectiveIds as unknown[]).push("objective.follow-up");
    const design = episode.learningDesign as JsonRecord;
    (design.objectiveIds as unknown[]).push("objective.follow-up");
    (design.supportPlan as unknown[]).push({
      objectiveId: "objective.follow-up",
      initialSupport: "model",
      fadeRuleId: "fade.model-to-partial.v1",
      escalationRuleId: "escalate.targeted-repair.v1",
    });
    design.prerequisiteEdges = [
      {
        from: {
          kind: "objective",
          id: "objective.introduce-self",
          sourceEpisodeId: "ep-01",
        },
        toObjectiveId: "objective.follow-up",
        requiredState: "exposed",
      },
      {
        from: {
          kind: "objective",
          id: "objective.follow-up",
          sourceEpisodeId: "ep-01",
        },
        toObjectiveId: "objective.introduce-self",
        requiredState: "exposed",
      },
    ];
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "prerequisite_cycle",
        path: "$.episode.learningDesign.prerequisiteEdges",
      },
    ]);
  });

  test("rejects an outcome prerequisite whose source episode is unpublished", () => {
    const candidate = clone(validFixture);
    const design = (candidate.episode as JsonRecord)
      .learningDesign as JsonRecord;
    design.prerequisiteEdges = [
      {
        from: {
          kind: "outcome",
          id: "outcome.ghost",
          sourceEpisodeId: "ep-99",
        },
        toObjectiveId: "objective.introduce-self",
        requiredState: "exposed",
      },
    ];
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "prerequisite_reference_missing",
        path: "$.episode.learningDesign.prerequisiteEdges[0]",
      },
    ]);
  });

  test.each([
    [
      "kind",
      "magic",
      "$.episode.learningDesign.prerequisiteEdges[0].from.kind",
    ],
    [
      "requiredState",
      "mastered",
      "$.episode.learningDesign.prerequisiteEdges[0].requiredState",
    ],
  ] as const)(
    "rejects unsupported prerequisite %s",
    (field, value, expectedPath) => {
      const candidate = clone(validFixture);
      const edge = (
        (candidate.episode as JsonRecord).learningDesign as JsonRecord
      ).prerequisiteEdges as JsonRecord[];
      edge.push({
        from: {
          kind: field === "kind" ? value : "objective",
          id: "objective.introduce-self",
          sourceEpisodeId: "ep-00",
        },
        toObjectiveId: "objective.introduce-self",
        requiredState: field === "requiredState" ? value : "exposed",
      });
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([{ code: "field_value_invalid", path: expectedPath }]);
    },
  );

  test("rejects unsupported initial support modes", () => {
    const candidate = clone(validFixture);
    const support = (
      (candidate.episode as JsonRecord).learningDesign as JsonRecord
    ).supportPlan as JsonRecord[];
    support[0].initialSupport = "unlimited_answer_key";
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "field_value_invalid",
        path: "$.episode.learningDesign.supportPlan[0].initialSupport",
      },
    ]);
  });

  test("does not trust attacker-controlled support rule catalogs", () => {
    const candidate = clone(validFixture);
    const dependencies = candidate.dependencies as JsonRecord;
    (dependencies.fadeRuleIds as unknown[]).push("fade.attacker.v1");
    (dependencies.escalationRuleIds as unknown[]).push("escalate.attacker.v1");
    const support = (
      (candidate.episode as JsonRecord).learningDesign as JsonRecord
    ).supportPlan as JsonRecord[];
    support[0].fadeRuleId = "fade.attacker.v1";
    support[0].escalationRuleId = "escalate.attacker.v1";
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "support_rule_untrusted",
        path: "$.episode.learningDesign.supportPlan[0].fadeRuleId",
      },
    ]);
  });

  test("requires independent and delayed probes to cover the same objective and construct", () => {
    const candidate = clone(validFixture);
    const episode = candidate.episode as JsonRecord;
    const definition = (episode.delayedProbeDefinitions as JsonRecord[])[0];
    const body = definition.body as JsonRecord;
    (body.evidenceDeclarations as JsonRecord[])[0].construct = "interaction";
    (definition.ref as JsonRecord).contentHash = hashCanonicalBody(body);
    (episode.learningDesign as JsonRecord).delayedProbeRef = clone(
      definition.ref,
    );
    for (const link of episode.reviewLinks as JsonRecord[]) {
      if (link.scheduleKind === "delayed_probe")
        link.probeRef = clone(definition.ref);
    }
    setEpisodeContentHash(candidate);
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "probe_coverage_mismatch",
        path: "$.episode.delayedProbeDefinitions[0].body.evidenceDeclarations",
      },
    ]);
  });

  test("rejects delayed probe scheduler namespace collisions", () => {
    const candidate = clone(validFixture);
    const episode = candidate.episode as JsonRecord;
    const definitions = episode.delayedProbeDefinitions as JsonRecord[];
    const duplicate = clone(definitions[0]);
    const body = duplicate.body as JsonRecord;
    const ref = duplicate.ref as JsonRecord;
    ref.probeId = "probe.delayed.duplicate";
    body.probeId = "probe.delayed.duplicate";
    ref.contentHash = hashCanonicalBody(body);
    definitions.push(duplicate);
    setEpisodeContentHash(candidate);
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "delayed_probe_namespace_invalid",
        path: "$.episode.delayedProbeDefinitions[1].body.probeNodeId",
      },
    ]);
  });

  test.each([
    [
      "missing",
      (links: JsonRecord[]) => {
        links.length = 0;
      },
      "delayed_probe_schedule_missing",
      "$.episode.reviewLinks",
    ],
    [
      "duplicate",
      (links: JsonRecord[]) => {
        links.push(clone(links[0]));
      },
      "delayed_probe_schedule_ambiguous",
      "$.episode.reviewLinks[1]",
    ],
    [
      "wrong target",
      (links: JsonRecord[]) => {
        links[0].targetEpisodeId = "ep-99";
      },
      "review_link_invalid",
      "$.episode.reviewLinks[0].targetEpisodeId",
    ],
  ] as const)(
    "requires a complete delayed schedule: %s",
    (_label, mutate, code, expectedPath) => {
      const candidate = clone(validFixture);
      const links = (candidate.episode as JsonRecord)
        .reviewLinks as JsonRecord[];
      mutate(links);
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([{ code, path: expectedPath }]);
    },
  );

  test("fails closed on cyclic and hostile nested input without throwing", () => {
    const cyclic = clone(validFixture);
    const cyclicPolicy = (
      (cyclic.dependencies as JsonRecord).policies as JsonRecord[]
    )[0];
    cyclicPolicy.self = cyclicPolicy;
    const cyclicResult = validatePackageOnceWithoutThrow(cyclic);
    expect(issueSummary(cyclicResult)).toEqual([
      {
        code: "contract_input_invalid",
        path: "$.dependencies.policies[0].self",
      },
    ]);

    const hostile = clone(validFixture);
    ((hostile.dependencies as JsonRecord).policies as unknown[])[0] = new Proxy(
      {},
      {
        ownKeys: () => {
          throw new TypeError("hostile input");
        },
      },
    );
    const hostileResult = validatePackageOnceWithoutThrow(hostile);
    expect(issueSummary(hostileResult)).toEqual([
      { code: "contract_input_invalid", path: "$.dependencies.policies[0]" },
    ]);
  });

  test("validates a descriptor snapshot without invoking or returning an ordinary get Proxy", () => {
    const candidate = clone(validFixture);
    const originalDependencies = clone(candidate.dependencies);
    let getCount = 0;
    const dependenciesProxy = new Proxy(candidate.dependencies as JsonRecord, {
      get: () => {
        getCount += 1;
        throw new TypeError("ordinary get trap must not run");
      },
    });
    candidate.dependencies = dependenciesProxy;

    const result = validatePackageOnceWithoutThrow(candidate);

    expect(getCount).toBe(0);
    expect(result.ok).toBe(true);
    if (result.ok === false)
      throw new Error("Expected descriptor snapshot validation to succeed");
    expect(result.value.dependencies).not.toBe(dependenciesProxy);
    expect(result.value.dependencies).toEqual(originalDependencies);
  });

  test.each([
    [
      "an array proxy whose length trap throws",
      () =>
        new Proxy([], {
          get: (target, property, receiver) => {
            if (property === "length") throw new TypeError("hostile length");
            return Reflect.get(target, property, receiver);
          },
        }),
    ],
    [
      "a revoked array proxy",
      () => {
        const { proxy, revoke } = Proxy.revocable([], {});
        revoke();
        return proxy;
      },
    ],
  ])(
    "rejects %s at the closest stable path without throwing",
    (_label, createAssetIds) => {
      const candidate = clone(validFixture);
      (candidate.dependencies as JsonRecord).assetIds = createAssetIds();
      const result = validatePackageOnceWithoutThrow(candidate);
      expect(issueSummary(result)).toEqual([
        { code: "contract_input_invalid", path: "$.dependencies.assetIds" },
      ]);
    },
  );

  test.each([
    [
      "a non-enumerable own property",
      (dependencies: JsonRecord) => {
        Object.defineProperty(dependencies, "hidden", {
          value: true,
          enumerable: false,
        });
      },
    ],
    [
      "a symbol own property",
      (dependencies: JsonRecord) => {
        Object.defineProperty(dependencies, Symbol("hidden"), {
          value: true,
          enumerable: true,
        });
      },
    ],
  ])("rejects dependencies with %s", (_label, mutateDependencies) => {
    const candidate = clone(validFixture);
    mutateDependencies(candidate.dependencies as JsonRecord);
    const result = validatePackageOnceWithoutThrow(candidate);
    expect(issueSummary(result)).toEqual([
      { code: "contract_input_invalid", path: "$.dependencies" },
    ]);
  });

  test("rejects an accessor property without invoking it", () => {
    const candidate = clone(validFixture);
    const dependencies = candidate.dependencies as JsonRecord;
    let getterCalled = false;
    Object.defineProperty(dependencies, "assetIds", {
      enumerable: true,
      get: () => {
        getterCalled = true;
        throw new TypeError("accessor must not run");
      },
    });
    const result = validatePackageOnceWithoutThrow(candidate);
    expect(getterCalled).toBe(false);
    expect(issueSummary(result)).toEqual([
      { code: "contract_input_invalid", path: "$.dependencies.assetIds" },
    ]);
    expect(getterCalled).toBe(false);
  });

  test("rejects an oversized graph before traversal", () => {
    const candidate = clone(validFixture);
    const graph = (candidate.episode as JsonRecord).graph as JsonRecord;
    const firstNode = (graph.nodes as JsonRecord[])[0];
    graph.nodes = Array.from({ length: 513 }, (_, index) => ({
      ...clone(firstNode),
      nodeId: `oversized.n${index + 1}`,
    }));
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      { code: "collection_limit_exceeded", path: "$.episode.graph.nodes" },
    ]);
  });

  test.each([
    [
      ["episode", "phraseFrames", 0, "semanticSlotIds", 0],
      "slot.missing",
      "content_reference_missing",
      "$.episode.phraseFrames[0].semanticSlotIds[0]",
    ],
    [
      ["episode", "phraseFrames", 0, "skillIds", 0],
      "skill.missing",
      "content_reference_missing",
      "$.episode.phraseFrames[0].skillIds[0]",
    ],
    [
      ["episode", "semanticSlots", 0, "allowedContentUnitIds", 0],
      "cu.missing",
      "content_reference_missing",
      "$.episode.semanticSlots[0].allowedContentUnitIds[0]",
    ],
    [
      ["episode", "capstoneContract", "objectiveIds", 0],
      "objective.missing",
      "capstone_reference_missing",
      "$.episode.capstoneContract.objectiveIds[0]",
    ],
    [
      ["episode", "capstoneContract", "requiredSemanticSlotIds", 0],
      "slot.missing",
      "capstone_reference_missing",
      "$.episode.capstoneContract.requiredSemanticSlotIds[0]",
    ],
    [
      ["episode", "capstoneContract", "criticalConstraintIds", 0],
      "constraint.missing",
      "capstone_reference_missing",
      "$.episode.capstoneContract.criticalConstraintIds[0]",
    ],
  ] as const)(
    "closes episode content and capstone references at %s",
    (mutationPath, value, expectedCode, expectedPath) => {
      const candidate = clone(validFixture);
      applyMutations(candidate, [{ op: "set", path: mutationPath, value }]);
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([{ code: expectedCode, path: expectedPath }]);
    },
  );

  test.each([
    ["missing objective support", []],
    [
      "duplicate objective support",
      [
        {
          objectiveId: "objective.introduce-self",
          initialSupport: "model",
          fadeRuleId: "fade.model-to-partial.v1",
          escalationRuleId: "escalate.targeted-repair.v1",
        },
        {
          objectiveId: "objective.introduce-self",
          initialSupport: "partial_cue",
          fadeRuleId: "fade.model-to-partial.v1",
          escalationRuleId: "escalate.targeted-repair.v1",
        },
      ],
    ],
  ] as const)(
    "requires exact one-to-one support-plan objective coverage: %s",
    (_label, supportPlan) => {
      const candidate = clone(validFixture);
      (
        (candidate.episode as JsonRecord).learningDesign as JsonRecord
      ).supportPlan = clone(supportPlan);
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([
        {
          code: "support_plan_invalid",
          path: "$.episode.learningDesign.supportPlan",
        },
      ]);
    },
  );

  test("keeps the independent probe surface distinct from training", () => {
    const candidate = clone(validFixture);
    const nodes = ((candidate.episode as JsonRecord).graph as JsonRecord)
      .nodes as JsonRecord[];
    const training = nodes[0].pedagogicalContextContract as JsonRecord;
    const independent = nodes[8].pedagogicalContextContract as JsonRecord;
    independent.context = {
      ...(clone(training.context) as JsonRecord),
      novelty: "varied",
    };
    independent.prompt = {
      promptId: (training.prompt as JsonRecord).promptId,
      reusedFromTraining: false,
      separatePrompt: true,
    };
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "probe_surface_reused",
        path: "$.episode.graph.nodes[8].pedagogicalContextContract",
      },
    ]);
  });

  test("keeps the delayed probe surface distinct from independent and training surfaces", () => {
    const candidate = clone(validFixture);
    const episode = candidate.episode as JsonRecord;
    const nodes = (episode.graph as JsonRecord).nodes as JsonRecord[];
    const independent = nodes[8].pedagogicalContextContract as JsonRecord;
    const delayed = (
      (episode.delayedProbeDefinitions as JsonRecord[])[0].body as JsonRecord
    ).pedagogicalContextContract as JsonRecord;
    delayed.context = {
      ...(clone(independent.context) as JsonRecord),
      newSurfaceForm: true,
    };
    delayed.prompt = clone(independent.prompt);
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "probe_surface_reused",
        path: "$.episode.delayedProbeDefinitions[0].body.pedagogicalContextContract",
      },
    ]);
  });

  test.each([
    ["asset", "requiredAssetIds", "asset.missing", "curriculum_asset_missing"],
    [
      "capability",
      "requiredCapabilityKeys",
      "kernel.missing",
      "curriculum_capability_missing",
    ],
  ] as const)(
    "closes package curriculum %s requirements against dependencies",
    (_label, key, value, code) => {
      const candidate = clone(validFixture);
      ((candidate.curriculum as JsonRecord)[key] as unknown[]).push(value);
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([{ code, path: `$.curriculum.${key}` }]);
    },
  );

  test("requires the current episode ref to publish the exact material closure", () => {
    const candidate = clone(validFixture) as JsonRecord;
    const episode = candidate.episode as JsonRecord;
    const refs = (candidate.curriculum as JsonRecord)
      .episodeRefs as JsonRecord[];
    const currentRef = refs.find(
      (entry) => entry.episodeId === episode.episodeId,
    );
    if (!currentRef) throw new Error("test_fixture_episode_ref_missing");
    (currentRef.introducedMaterial as JsonRecord).skillIds = [];
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "curriculum_material_closure_invalid",
        path: "$.curriculum.episodeRefs[0].introducedMaterial.skillIds",
      },
    ]);
  });

  test("requires curriculum asset requirements to equal the episode asset closure", () => {
    const candidate = clone(validFixture) as JsonRecord;
    (candidate.curriculum as JsonRecord).requiredAssetIds = [];
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "curriculum_asset_closure_invalid",
        path: "$.curriculum.requiredAssetIds",
      },
    ]);
  });

  test("rejects non-finite JSON numbers before semantic validation", () => {
    const candidate = clone(validFixture);
    (
      (candidate.episode as JsonRecord).activities as JsonRecord[]
    )[0].estimatedSeconds = Number.NaN;
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "contract_input_invalid",
        path: "$.episode.activities[0].estimatedSeconds",
      },
    ]);
  });
});

describe("Learning V2 Task 1.2 — scope-dependent curriculum", () => {
  test.each(["vertical_slice", "chapter_internal", "full_season"] as const)(
    "accepts the exact %s projection and immutable registry pin",
    (kind) => {
      const result = validateV2CurriculumProjection(
        buildCurriculum(kind),
        validationContext,
      );
      expect(result.ok).toBe(true);
      expect(result.issues).toEqual([]);
    },
  );

  test.each(
    invalidCorpus.syntheticCases.filter(({ builder }) =>
      [
        "chapter_internal_invalid",
        "full_season_invalid",
        "partial_production",
        "chapter_checkpoint_wrong_ordinal",
        "chapter_membership_invalid",
        "curriculum_prerequisite_orphan",
      ].includes(builder),
    ),
  )("rejects $caseId", (testCase) => {
    const curriculum =
      testCase.builder === "full_season_invalid"
        ? buildCurriculum("full_season")
        : testCase.builder === "partial_production"
          ? buildCurriculum("vertical_slice")
          : buildCurriculum("chapter_internal");
    if (testCase.builder === "chapter_internal_invalid") {
      curriculum.checkpointOrdinals = [];
    } else if (testCase.builder === "full_season_invalid") {
      (curriculum.episodeRefs as unknown[]).pop();
    } else if (testCase.builder === "partial_production") {
      curriculum.environment = "production";
    } else if (testCase.builder === "chapter_checkpoint_wrong_ordinal") {
      curriculum.checkpointOrdinals = [7];
    } else if (testCase.builder === "chapter_membership_invalid") {
      ((curriculum.chapters as JsonRecord[])[0].episodeIds as unknown[]).pop();
    } else if (testCase.builder === "curriculum_prerequisite_orphan") {
      (
        (curriculum.episodeRefs as JsonRecord[])[0]
          .prerequisiteEpisodeIds as unknown[]
      ).push("ep-missing");
    }
    const result = validateV2CurriculumProjection(
      curriculum,
      validationContext,
    );
    expect(result.ok).toBe(false);
    expect(issueSummary(result)).toEqual([
      { code: testCase.expectedCode, path: testCase.expectedPath },
    ]);
  });

  test("requires exact eight-episode ordinal windows in every full-season chapter", () => {
    const curriculum = buildCurriculum("full_season");
    const chapters = curriculum.chapters as JsonRecord[];
    chapters[0].episodeIds = (curriculum.episodeRefs as JsonRecord[]).map(
      ({ episodeId }) => episodeId,
    );
    chapters[1].episodeIds = [];
    chapters[2].episodeIds = [];
    chapters[3].episodeIds = [];
    expect(
      issueSummary(
        validateV2CurriculumProjection(curriculum, validationContext),
      ),
    ).toEqual([
      { code: "curriculum_chapter_invalid", path: "$.curriculum.chapters[0]" },
    ]);
  });

  test("requires every curriculum episode ref to include both exact material sets", () => {
    const curriculum = buildCurriculum("chapter_internal");
    delete (curriculum.episodeRefs as JsonRecord[])[0].introducedMaterial;
    expect(
      issueSummary(
        validateV2CurriculumProjection(curriculum, validationContext),
      ),
    ).toEqual([
      {
        code: "field_missing",
        path: "$.curriculum.episodeRefs[0].introducedMaterial",
      },
    ]);
  });

  test("forbids checkpoint material that was not introduced earlier in curriculum order", () => {
    const curriculum = buildCurriculum("chapter_internal");
    const checkpoint = (curriculum.episodeRefs as JsonRecord[])[7];
    (checkpoint.requiredCheckpointMaterial as JsonRecord).skillIds = [
      "skill.new",
    ];
    expect(
      issueSummary(
        validateV2CurriculumProjection(curriculum, validationContext),
      ),
    ).toEqual([
      {
        code: "curriculum_checkpoint_material_invalid",
        path: "$.curriculum.episodeRefs[7].requiredCheckpointMaterial.skillIds[0]",
      },
    ]);
  });

  test("rejects an environment outside the selected scope union", () => {
    const curriculum = buildCurriculum("vertical_slice");
    curriculum.environment = "preview";
    expect(
      issueSummary(
        validateV2CurriculumProjection(curriculum, validationContext),
      ),
    ).toEqual([
      {
        code: "curriculum_environment_invalid",
        path: "$.curriculum.environment",
      },
    ]);
  });

  test.each([
    ["studyTarget", "", "field_value_invalid", "$.curriculum.studyTarget"],
    [
      "learnerSourceLocale",
      42,
      "field_type_invalid",
      "$.curriculum.learnerSourceLocale",
    ],
    [
      "requiredLocales",
      [],
      "curriculum_locale_closure_invalid",
      "$.curriculum.requiredLocales",
    ],
  ] as const)(
    "requires valid curriculum locale identity: %s",
    (field, value, code, expectedPath) => {
      const curriculum = buildCurriculum("chapter_internal");
      (curriculum as JsonRecord)[field] = value;
      expect(
        issueSummary(
          validateV2CurriculumProjection(curriculum, validationContext),
        ),
      ).toEqual([{ code, path: expectedPath }]);
    },
  );

  test("rejects empty required locale tags", () => {
    const curriculum = buildCurriculum("chapter_internal");
    (curriculum.requiredLocales as string[]).push("");
    expect(
      issueSummary(
        validateV2CurriculumProjection(curriculum, validationContext),
      ),
    ).toEqual([
      {
        code: "curriculum_locale_closure_invalid",
        path: "$.curriculum.requiredLocales",
      },
    ]);
  });

  test("rejects duplicate capability keys", () => {
    const curriculum = buildCurriculum("chapter_internal");
    const capabilityKeys = curriculum.requiredCapabilityKeys as string[];
    capabilityKeys.push(capabilityKeys[0]);
    expect(
      issueSummary(
        validateV2CurriculumProjection(curriculum, validationContext),
      ),
    ).toEqual([
      {
        code: "curriculum_capability_closure_invalid",
        path: "$.curriculum.requiredCapabilityKeys",
      },
    ]);
  });

  test("rejects duplicate chapter identities even when membership is rewritten consistently", () => {
    const curriculum = buildCurriculum("full_season");
    const chapters = curriculum.chapters as JsonRecord[];
    chapters[1].chapterId = chapters[0].chapterId;
    for (const ref of curriculum.episodeRefs as JsonRecord[]) {
      if (ref.chapterId === "chapter-02") ref.chapterId = "chapter-01";
    }
    expect(
      issueSummary(
        validateV2CurriculumProjection(curriculum, validationContext),
      ),
    ).toEqual([
      {
        code: "curriculum_chapter_invalid",
        path: "$.curriculum.chapters[1].chapterId",
      },
    ]);
  });

  test("rejects duplicate prerequisite episode identities", () => {
    const curriculum = buildCurriculum("chapter_internal");
    (curriculum.episodeRefs as JsonRecord[])[1].prerequisiteEpisodeIds = [
      "ep-01",
      "ep-01",
    ];
    expect(
      issueSummary(
        validateV2CurriculumProjection(curriculum, validationContext),
      ),
    ).toEqual([
      {
        code: "curriculum_prerequisite_invalid",
        path: "$.curriculum.episodeRefs[1].prerequisiteEpisodeIds[1]",
      },
    ]);
  });
});

describe("Learning V2 Task 1.2 — independent-only checkpoint declaration", () => {
  test("accepts an exact declared checkpoint without adding new material", () => {
    expect(
      validateV2CheckpointContract(validCheckpoint, checkpointContext),
    ).toEqual({
      ok: true,
      issues: [],
      value: validCheckpoint,
    });
  });

  test.each(
    invalidCorpus.syntheticCases.filter(({ builder }) =>
      builder.startsWith("checkpoint_"),
    ),
  )("rejects $caseId", (testCase) => {
    const checkpoint = clone(validCheckpoint) as JsonRecord;
    const context = clone(checkpointContext) as unknown as JsonRecord;
    if (testCase.builder === "checkpoint_set_mismatch") {
      (checkpoint.assessmentNodeIds as unknown[]).pop();
    } else if (testCase.builder === "checkpoint_requirement_mismatch") {
      (checkpoint.evidenceRequirements as JsonRecord[])[0].skillId =
        "skill.unknown";
    } else if (testCase.builder === "checkpoint_critical_coverage") {
      (checkpoint.criticalRepairRoutes as unknown[]).pop();
    } else if (testCase.builder === "checkpoint_new_material") {
      (
        (context.requiredCheckpointMaterial as JsonRecord).skillIds as unknown[]
      ).push("skill.new");
    } else if (testCase.builder === "checkpoint_objective_set") {
      (checkpoint.assessedObjectiveIds as unknown[]).pop();
    } else if (testCase.builder === "checkpoint_alternate_phase") {
      (context.nodePhases as JsonRecord)["cp.alt01"] = "near_transfer";
    } else if (testCase.builder === "checkpoint_reassessment_phase") {
      (context.nodePhases as JsonRecord)["cp.reassess01"] = "near_transfer";
    } else if (testCase.builder === "checkpoint_delayed_requirement") {
      (checkpoint.evidenceRequirements as JsonRecord[])[0].phase =
        "delayed_probe";
    }
    const result = validateV2CheckpointContract(checkpoint, context);
    expect(result.ok).toBe(false);
    expect(issueSummary(result)).toEqual([
      { code: testCase.expectedCode, path: testCase.expectedPath },
    ]);
  });

  test.each([
    [
      ["contractKind"],
      "daily_quiz",
      "field_value_invalid",
      "$.checkpoint.contractKind",
    ],
    [
      ["passPolicyKey"],
      "",
      "field_value_invalid",
      "$.checkpoint.passPolicyKey",
    ],
    [
      ["evidenceRequirements", 0, "latest"],
      true,
      "field_unknown",
      "$.checkpoint.evidenceRequirements[0].latest",
    ],
    [
      ["deterministicAlternateRoutes", 0, "latest"],
      true,
      "field_unknown",
      "$.checkpoint.deterministicAlternateRoutes[0].latest",
    ],
    [
      ["criticalRepairRoutes", 0, "latest"],
      true,
      "field_unknown",
      "$.checkpoint.criticalRepairRoutes[0].latest",
    ],
    [
      ["deterministicAlternateRoutes", 0, "aiIndependent"],
      false,
      "field_value_invalid",
      "$.checkpoint.deterministicAlternateRoutes[0].aiIndependent",
    ],
    [
      ["deterministicAlternateRoutes", 0, "voiceEvidenceEquivalent"],
      true,
      "field_value_invalid",
      "$.checkpoint.deterministicAlternateRoutes[0].voiceEvidenceEquivalent",
    ],
    [
      ["deterministicAlternateRoutes", 0, "primaryNodeId"],
      "cp.alt01",
      "checkpoint_alternate_invalid",
      "$.checkpoint.deterministicAlternateRoutes[0].primaryNodeId",
    ],
    [
      ["deterministicAlternateRoutes", 0, "evidenceTupleKeys"],
      [],
      "checkpoint_alternate_invalid",
      "$.checkpoint.deterministicAlternateRoutes[0].evidenceTupleKeys",
    ],
    [
      ["deterministicAlternateRoutes", 0, "assessedObjectiveIds"],
      [],
      "checkpoint_alternate_invalid",
      "$.checkpoint.deterministicAlternateRoutes[0].assessedObjectiveIds",
    ],
  ] as const)(
    "rejects malformed checkpoint alternate contract at %s",
    (mutationPath, value, expectedCode, expectedPath) => {
      const checkpoint = clone(validCheckpoint) as JsonRecord;
      applyMutations(checkpoint, [{ op: "set", path: mutationPath, value }]);
      expect(
        issueSummary(
          validateV2CheckpointContract(checkpoint, checkpointContext),
        ),
      ).toEqual([{ code: expectedCode, path: expectedPath }]);
    },
  );

  test("rejects duplicate critical targets", () => {
    const checkpoint = clone(validCheckpoint) as JsonRecord;
    (checkpoint.criticalSemanticSlotIds as unknown[]).push("slot.origin");
    expect(
      issueSummary(validateV2CheckpointContract(checkpoint, checkpointContext)),
    ).toEqual([
      {
        code: "checkpoint_critical_coverage_invalid",
        path: "$.checkpoint.criticalSemanticSlotIds[1]",
      },
    ]);
  });

  test("requires alternate and reassessment nodes to be published as independent probes", () => {
    const checkpoint = clone(validCheckpoint) as JsonRecord;
    const context = clone(checkpointContext) as JsonRecord;
    (context.independentProbeNodeIds as unknown[]).splice(
      (context.independentProbeNodeIds as unknown[]).indexOf("cp.alt01"),
      1,
    );
    expect(
      issueSummary(validateV2CheckpointContract(checkpoint, context)),
    ).toEqual([
      {
        code: "checkpoint_alternate_invalid",
        path: "$.checkpoint.deterministicAlternateRoutes[0].alternateNodeId",
      },
    ]);
  });

  test("rejects an alternate route that aliases its primary node", () => {
    const checkpoint = clone(validCheckpoint) as JsonRecord;
    const route = (checkpoint.deterministicAlternateRoutes as JsonRecord[])[0];
    route.alternateNodeId = route.primaryNodeId;
    expect(
      issueSummary(validateV2CheckpointContract(checkpoint, checkpointContext)),
    ).toEqual([
      {
        code: "checkpoint_alternate_invalid",
        path: "$.checkpoint.deterministicAlternateRoutes[0].alternateNodeId",
      },
    ]);
  });

  test("rejects duplicate deterministic alternate nodes", () => {
    const checkpoint = clone(validCheckpoint) as JsonRecord;
    const routes = checkpoint.deterministicAlternateRoutes as JsonRecord[];
    routes[1].alternateNodeId = routes[0].alternateNodeId;
    expect(
      issueSummary(validateV2CheckpointContract(checkpoint, checkpointContext)),
    ).toEqual([
      {
        code: "checkpoint_alternate_invalid",
        path: "$.checkpoint.deterministicAlternateRoutes",
      },
    ]);
  });

  test("requires at least one accessibility route with the offline core path", () => {
    const candidate = clone(validFixture);
    (candidate.episode as JsonRecord).accessibilityRoutes = [];
    expect(
      issueSummary(validateV2LearningPackage(candidate, validationContext)),
    ).toEqual([
      {
        code: "accessibility_route_missing",
        path: "$.episode.accessibilityRoutes",
      },
    ]);
  });

  test.each([
    [
      "requiredSemanticSlotIds",
      [],
      "$.episode.capstoneContract.requiredSemanticSlotIds",
    ],
    [
      "primaryNodeIds",
      ["ep01.n07"],
      "$.episode.capstoneContract.primaryNodeIds",
    ],
  ] as const)(
    "requires exact capstone closure for %s",
    (field, value, expectedPath) => {
      const candidate = clone(validFixture);
      ((candidate.episode as JsonRecord).capstoneContract as JsonRecord)[
        field
      ] = value;
      expect(
        issueSummary(validateV2LearningPackage(candidate, validationContext)),
      ).toEqual([{ code: "capstone_reference_invalid", path: expectedPath }]);
    },
  );
});

describe("Learning V2 Task 1.2 — compile and purity boundaries", () => {
  test("rejects duplicate delayed probe definitions for one probe ref", () => {
    const candidate = clone(validFixture) as JsonRecord;
    const episode = candidate.episode as JsonRecord;
    const definitions = episode.delayedProbeDefinitions as JsonRecord[];
    definitions.push(clone(definitions[0]));
    setEpisodeContentHash(candidate);
    expect(issueSummary(validatePackageOnceWithoutThrow(candidate))).toEqual([
      {
        code: "delayed_probe_ref_ambiguous",
        path: "$.episode.delayedProbeDefinitions[1].ref.probeId",
      },
    ]);
  });

  test("keeps nodeId contextual rather than serializing it in a declaration", () => {
    const declaration: V2NodeEvidenceDeclaration = {
      objectiveId: "objective.introduce-self",
      skillId: parseSkillId("skill.origin"),
      construct: "spoken",
      phase: "independent_probe",
      target: { targetKind: "objective", targetId: "objective.introduce-self" },
    };
    if (false) {
      const forbiddenDeclaration: V2NodeEvidenceDeclaration = {
        ...declaration,
        // @ts-expect-error nodeId belongs to the containing graph/probe/checkpoint context.
        nodeId: "ep01.n09",
      };
      const forbiddenActivity: V2ActivityInstance = {
        // @ts-expect-error graph phase never belongs to content-only ActivityInstance.
        phase: "encounter_build",
      };
      const lifecycleCurriculum: V2CurriculumProjection = {
        // @ts-expect-error activation lifecycle is not part of the curriculum body.
        activationStatus: "active",
      };
      void forbiddenDeclaration;
      void forbiddenActivity;
      void lifecycleCurriculum;
    }
    expect(declaration).not.toHaveProperty("nodeId");
  });

  test("keeps all four pure modules free of UI, Firebase, Admin and Functions imports", () => {
    const contractDirectory = path.join(
      __dirname,
      "..",
      "modules",
      "learning-v2",
      "contracts",
    );
    const source = [
      "activity.ts",
      "episode.ts",
      "curriculum.ts",
      "validation.ts",
    ]
      .map((fileName) =>
        fs.readFileSync(path.join(contractDirectory, fileName), "utf8"),
      )
      .join("\n");
    expect(source).not.toMatch(
      /(?:from|require\s*\()\s*['"](?:react|react-native|expo|firebase|firebase-admin|@firebase|@react-native-firebase|admin\/|functions\/)/,
    );
  });
});
