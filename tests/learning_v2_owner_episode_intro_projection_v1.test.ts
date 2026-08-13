import path from "node:path";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
} from "../functions/src/content_factory/v2_canonical_generation_plan_v2";
import {
  getV2OwnerAuthoredEpisodeInputSummaryV2,
  materializeV2OwnerAuthoredEpisodeDraftV2,
  parseV2OwnerAuthoredEpisodeInputV2,
  resolveV2OwnerAuthoredEpisodeInputMaterialV2,
} from "../functions/src/content_factory/v2_owner_authored_episode_input_v2";
import { projectV2OwnerEpisodeSessionIntrosV1 } from "../functions/src/content_factory/v2_owner_episode_intro_projection_v1";
import { canonicalJsonV1 } from "../modules/learning-v2/policies/decision_registry";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const editor = require(
  path.join(__dirname, "..", "admin", "learning_v2_owner_episode_editor.js"),
);
const h = (c: string) => c.repeat(64);

function fixture() {
  const request = {
    schemaVersion: "v2-canonical-plan-request.v2" as const,
    workspaceId: "workspace-1",
    jobId: "job-1",
    authoringRevision: 1,
    seasonId: "season-1",
    scope: "vertical_slice" as const,
    episodeIds: ["episode-1"],
    languageProfileRef: {
      profileId: "english",
      targetLanguage: "en",
      version: 1,
      contentHash: h("a"),
    },
    speechProfileRef: {
      profileId: "speech",
      targetLanguage: "en",
      speechLocale: "en-US",
      version: 1,
      contentHash: h("b"),
    },
    voiceGenerationProfileRef: {
      profileId: "voice",
      version: 1,
      contentHash: h("c"),
    },
    decisionRegistryRef: {
      decisionId: "HYP-V2-007" as const,
      version: 1,
      contentHash: h("d"),
    },
    templateBindings: [
      {
        episodeId: "episode-1",
        templateRefs: [
          { templateId: "phrase-builder", version: 1, contentHash: h("e") },
        ],
      },
    ],
  };
  const plan = buildV2CanonicalSeasonPlanV2(
    parseV2CanonicalPlanRequestV2(canonicalJsonV1(request)),
  );
  const stage = plan.stages.find(
    (candidate) => candidate.kind === "v2_activity_instances",
  )!;
  const reference = editor.createNeutralTestFixture({
    episodeId: "episode-1",
    targetLanguage: "en",
  });
  const material = materializeV2OwnerAuthoredEpisodeDraftV2(
    {
      contentClass: "neutral_test_fixture",
      ownerInputId: "episode-1-r1",
      claimedAuthorId: "owner.reference",
      stageId: stage.stageId,
      sessionSources: reference.sessionSources,
      sessionIntros: reference.sessionIntros,
    },
    plan,
  );
  const handle = parseV2OwnerAuthoredEpisodeInputV2(
    material.raw,
    plan,
    stage.stageId,
  );
  return { plan, stage, handle };
}

describe("Learning V2 owner episode intro projection bridge", () => {
  it("projects exactly 12 learner-safe intros and 36 question surfaces from the private v2 handle", () => {
    const { handle } = fixture();
    const projected = projectV2OwnerEpisodeSessionIntrosV1(handle);
    expect(projected).toMatchObject({
      sessionCount: 12,
      questionCount: 36,
      learnerProjectionAuthority:
        "exact_private_owner_input_v2_allowlist_projection",
      answerDataPolicy: "none",
      evaluatorDataPolicy: "none",
      serverSidecarPolicy: "none",
      repositoryAuthority: "none",
      storageAuthority: "none",
      releaseAuthority: false,
    });
    expect(projected.projections).toHaveLength(12);
    expect(projected.projectionRaws).toHaveLength(12);
    expect(projected.projections[0].title).toBe(
      "Hello, I’m… — первое знакомство",
    );
    expect(projected.projections[11].title).toBe("Самостоятельное знакомство");
    expect(
      projected.projections.every((intro) => intro.questions.length === 3),
    ).toBe(true);
    const joined = projected.projectionRaws.join("");
    expect(joined).not.toContain("correctResponse");
    expect(joined).not.toContain("acceptedResponses");
    expect(joined).not.toContain("salt");
  });

  it("rejects cloned handles and binds the aggregate to the exact owner input v2 fingerprint", () => {
    const { handle, plan, stage } = fixture();
    const projected = projectV2OwnerEpisodeSessionIntrosV1(handle);
    const summary = getV2OwnerAuthoredEpisodeInputSummaryV2(handle);
    expect(projected.ownerInputFingerprint).toBe(summary.inputFingerprint);
    expect(projected.introAggregateFingerprint).toBe(
      summary.introAggregateFingerprint,
    );
    expect(() =>
      projectV2OwnerEpisodeSessionIntrosV1({ ...handle } as never),
    ).toThrow("v2_owner_episode_intro_projection_invalid");
    const material = resolveV2OwnerAuthoredEpisodeInputMaterialV2(handle);
    const separatelyParsedHandle = parseV2OwnerAuthoredEpisodeInputV2(
      material.raw,
      plan,
      stage.stageId,
    );
    expect(
      projectV2OwnerEpisodeSessionIntrosV1(separatelyParsedHandle)
        .projectionSetFingerprint,
    ).toBe(projected.projectionSetFingerprint);
  });
});
