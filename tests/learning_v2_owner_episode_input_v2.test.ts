import path from "node:path";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../modules/learning-v2/policies/decision_registry";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
} from "../functions/src/content_factory/v2_canonical_generation_plan_v2";
import {
  getV2OwnerAuthoredEpisodeInputSummaryV2,
  isV2OwnerAuthoredEpisodeInputHandleV2,
  materializeV2OwnerAuthoredEpisodeDraftV2,
  parseV2OwnerAuthoredEpisodeInputV2,
  resolveV2OwnerAuthoredEpisodeInputMaterialV2,
} from "../functions/src/content_factory/v2_owner_authored_episode_input_v2";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const editor = require(
  path.join(__dirname, "..", "admin", "learning_v2_owner_episode_editor.js"),
);

const hash = (character: string) => character.repeat(64);
const plan = () =>
  buildV2CanonicalSeasonPlanV2(
    parseV2CanonicalPlanRequestV2(
      canonicalJsonV1({
        schemaVersion: "v2-canonical-plan-request.v2",
        workspaceId: "neutral-fixture-workspace",
        jobId: "neutral-fixture-job",
        authoringRevision: 1,
        seasonId: "neutral-fixture-season",
        scope: "vertical_slice",
        episodeIds: ["neutral-test-episode-never-release"],
        recipes: [
          {
            episodeId: "neutral-test-episode-never-release",
            dialogue: true,
            speakingMission: true,
          },
        ],
        languageProfileRef: {
          profileId: "neutral-language",
          targetLanguage: "en",
          version: 1,
          contentHash: hash("a"),
        },
        speechProfileRef: {
          profileId: "neutral-speech",
          targetLanguage: "en",
          speechLocale: "en-US",
          version: 1,
          contentHash: hash("b"),
        },
        voiceGenerationProfileRef: {
          profileId: "neutral-voice",
          version: 1,
          contentHash: hash("c"),
        },
        decisionRegistryRef: {
          decisionId: "HYP-V2-007",
          version: 1,
          contentHash: hash("7"),
        },
        templateBindings: [
          {
            episodeId: "neutral-test-episode-never-release",
            templateRefs: [
              {
                templateId: "neutral-template",
                version: 1,
                contentHash: hash("d"),
              },
            ],
          },
        ],
      }),
    ),
  );

const fixture = () =>
  editor.createNeutralTestFixture({
    episodeId: "neutral-test-episode-never-release",
    targetLanguage: "en",
  });

const intros = (sessionSources: any[]) =>
  sessionSources.map((source) => {
    const concepts = Array.from(
      new Set<string>(
        source.session.tasks
          .slice(0, 3)
          .flatMap((task: any) =>
            task.introQuestionRef.coveredConceptIds.map(String),
          ),
      ),
    );
    return {
      contentClass: "neutral_test_fixture" as const,
      introId: `neutral-test-intro-s${source.session.ordinal}-never-release`,
      title: `Neutral test intro ${source.session.ordinal}`,
      paragraphs: [
        `Neutral explanation for session ${source.session.ordinal}.`,
      ],
      concepts: concepts.map((conceptId) => ({
        conceptId,
        heading: `Neutral heading ${conceptId}`,
        explanation: `Neutral explanation ${conceptId}`,
      })),
    };
  });

describe("Learning V2 owner-authored episode input v2", () => {
  test("atomically binds 12 intros, 36 questions and 144 tasks", () => {
    const currentPlan = plan();
    const stage = currentPlan.stages.find(
      (candidate) => candidate.kind === "v2_activity_instances",
    );
    expect(stage).toBeDefined();
    const neutral = fixture();
    const material = materializeV2OwnerAuthoredEpisodeDraftV2(
      {
        contentClass: "neutral_test_fixture",
        ownerInputId: "neutral-test-episode-input-v2",
        claimedAuthorId: "fixture.system",
        stageId: stage!.stageId,
        sessionSources: neutral.sessionSources,
        sessionIntros: intros(neutral.sessionSources),
      },
      currentPlan,
    );
    expect(material.summary).toMatchObject({
      sessionCount: 12,
      taskCount: 144,
      introCount: 12,
      introQuestionCount: 36,
      introContentAuthority: "unverified_owner_input_claim",
      languageAccuracyAuthority: "none",
      curriculumAuthority: "none",
      repositoryAuthority: "none",
      humanApprovalAuthority: "none",
      releaseAuthority: false,
    });
    expect(material.intros).toHaveLength(12);
    expect(material.summary.introFingerprints).toHaveLength(12);
    expect(material.sources).toHaveLength(12);
    expect(material.assembly.taskCount).toBe(144);
    expect(JSON.parse(material.raw).sessionIntroRaws).toHaveLength(12);
  });

  test("rehydrates a private handle and rejects cloned authority", () => {
    const currentPlan = plan();
    const stage = currentPlan.stages.find(
      (candidate) => candidate.kind === "v2_activity_instances",
    )!;
    const neutral = fixture();
    const material = materializeV2OwnerAuthoredEpisodeDraftV2(
      {
        contentClass: "neutral_test_fixture",
        ownerInputId: "neutral-test-episode-input-v2",
        claimedAuthorId: "fixture.system",
        stageId: stage.stageId,
        sessionSources: neutral.sessionSources,
        sessionIntros: intros(neutral.sessionSources),
      },
      currentPlan,
    );
    const handle = parseV2OwnerAuthoredEpisodeInputV2(
      material.raw,
      currentPlan,
      stage.stageId,
    );
    expect(isV2OwnerAuthoredEpisodeInputHandleV2(handle)).toBe(true);
    expect(getV2OwnerAuthoredEpisodeInputSummaryV2(handle)).toEqual(
      material.summary,
    );
    expect(resolveV2OwnerAuthoredEpisodeInputMaterialV2(handle).raw).toBe(
      material.raw,
    );
    expect(isV2OwnerAuthoredEpisodeInputHandleV2({ ...handle })).toBe(false);
  });

  test("rejects changed intro, missing intro, cross-session swap and relabeling", () => {
    const currentPlan = plan();
    const stage = currentPlan.stages.find(
      (candidate) => candidate.kind === "v2_activity_instances",
    )!;
    const neutral = fixture();
    const material = materializeV2OwnerAuthoredEpisodeDraftV2(
      {
        contentClass: "neutral_test_fixture",
        ownerInputId: "neutral-test-episode-input-v2",
        claimedAuthorId: "fixture.system",
        stageId: stage.stageId,
        sessionSources: neutral.sessionSources,
        sessionIntros: intros(neutral.sessionSources),
      },
      currentPlan,
    );
    const changed = JSON.parse(material.raw);
    const firstIntro = JSON.parse(changed.sessionIntroRaws[0]);
    firstIntro.paragraphs[0] = "Changed after package fingerprint";
    changed.sessionIntroRaws[0] = canonicalJsonV1(firstIntro);
    const { inputFingerprint: _old, ...changedBody } = changed;
    changed.inputFingerprint = hashCanonicalBody(changedBody);
    expect(() =>
      parseV2OwnerAuthoredEpisodeInputV2(
        canonicalJsonV1(changed),
        currentPlan,
        stage.stageId,
      ),
    ).toThrow("v2_owner_session_intro_fingerprint_invalid");

    const missing = JSON.parse(material.raw);
    missing.sessionIntroRaws.pop();
    expect(() =>
      parseV2OwnerAuthoredEpisodeInputV2(
        canonicalJsonV1(missing),
        currentPlan,
        stage.stageId,
      ),
    ).toThrow("v2_owner_episode_input_v2_value_invalid");

    const swapped = JSON.parse(material.raw);
    [swapped.sessionIntroRaws[0], swapped.sessionIntroRaws[1]] = [
      swapped.sessionIntroRaws[1],
      swapped.sessionIntroRaws[0],
    ];
    const { inputFingerprint: _prior, ...swappedBody } = swapped;
    swapped.inputFingerprint = hashCanonicalBody(swappedBody);
    expect(() =>
      parseV2OwnerAuthoredEpisodeInputV2(
        canonicalJsonV1(swapped),
        currentPlan,
        stage.stageId,
      ),
    ).toThrow("v2_owner_session_intro_value_invalid");

    const relabeled = JSON.parse(material.raw);
    relabeled.contentClass = "production_candidate";
    relabeled.ownerInputOrigin = "owner_authored_import";
    const { inputFingerprint: _fixture, ...relabeledBody } = relabeled;
    relabeled.inputFingerprint = hashCanonicalBody(relabeledBody);
    expect(() =>
      parseV2OwnerAuthoredEpisodeInputV2(
        canonicalJsonV1(relabeled),
        currentPlan,
        stage.stageId,
      ),
    ).toThrow("v2_owner_episode_input_v2_intro_binding_invalid");
  });
});
