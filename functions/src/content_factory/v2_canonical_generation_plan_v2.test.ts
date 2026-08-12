import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_ACTIVITY_FAMILIES } from "../../../modules/learning-v2/contracts/activity";
import {
  V2_ACTIVITY_FAMILIES_V2,
  V2_ACTIVITY_FAMILY_CATALOG_V2,
  V2_REQUIRED_SESSION_FAMILIES_V2,
  V2_REQUIRED_SESSION_FAMILY_POLICY_V2,
} from "../../../modules/learning-v2/contracts/activity_catalog_v2";
import {
  V2_AUDIO_PREFETCH_POLICY_V1,
  V2_FOUR_VOICE_PLAYBACK_POLICY_V1,
} from "../../../modules/learning-v2/contracts/voice_playback_policy_v1";
import {
  buildV2CanonicalSeasonPlan,
  parseV2CanonicalPlanRequest,
} from "./v2_canonical_generation_plan";
import {
  V2_CANONICAL_PLAN_V2_MAX_BYTES,
  buildV2CanonicalSeasonPlanV2,
  isV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
} from "./v2_canonical_generation_plan_v2";

const hash = (character: string) => character.repeat(64);

const input = (
  scope:
    | "vertical_slice"
    | "chapter_internal"
    | "full_season" = "vertical_slice",
  recipe: Readonly<{ dialogue?: boolean; speakingMission?: boolean }> = {
    dialogue: true,
    speakingMission: true,
  },
) => {
  const count =
    scope === "vertical_slice" ? 1 : scope === "chapter_internal" ? 8 : 32;
  const episodeIds = Array.from(
    { length: count },
    (_, index) => `episode-${index + 1}`,
  );
  return {
    schemaVersion: "v2-canonical-plan-request.v2" as const,
    workspaceId: "workspace-1",
    jobId: "job-1",
    authoringRevision: 7,
    seasonId: "season-1",
    scope,
    episodeIds,
    recipes: [{ episodeId: episodeIds[0], ...recipe }],
    languageProfileRef: {
      profileId: "english-general",
      targetLanguage: "en",
      version: 3,
      contentHash: hash("a"),
    },
    speechProfileRef: {
      profileId: "english-speech-general",
      targetLanguage: "en",
      speechLocale: "en-US",
      version: 2,
      contentHash: hash("c"),
    },
    voiceGenerationProfileRef: {
      profileId: "openai-tts-learning-v2",
      version: 1,
      contentHash: hash("d"),
    },
    decisionRegistryRef: {
      decisionId: "HYP-V2-007" as const,
      version: 1,
      contentHash: hash("7"),
    },
    templateBindings: episodeIds.map((episodeId) => ({
      episodeId,
      templateRefs: [
        { templateId: "phrase-builder", version: 2, contentHash: hash("b") },
      ],
    })),
  };
};

const trusted = (value = input()) =>
  parseV2CanonicalPlanRequestV2(canonicalJsonV1(value));

const stage = (
  plan: ReturnType<typeof buildV2CanonicalSeasonPlanV2>,
  kind: string,
  episodeId: string | null = "episode-1",
  locale: string | null = null,
) => {
  const result = plan.stages.find(
    (candidate) =>
      candidate.kind === kind &&
      candidate.episodeId === episodeId &&
      candidate.locale === locale,
  );
  if (!result) throw new Error(`missing_stage:${kind}:${episodeId}:${locale}`);
  return result;
};

const requirementsFor = (
  plan: ReturnType<typeof buildV2CanonicalSeasonPlanV2>,
  node: (typeof plan.stages)[number],
) =>
  node.externalRequirementIds.map((requirementId) => {
    const entry = plan.externalRequirementCatalog.find(
      (candidate) => candidate.requirementId === requirementId,
    );
    if (!entry) throw new Error(`missing_requirement:${requirementId}`);
    return entry.requirement;
  });

describe("Learning V2 canonical owner-current plan v2", () => {
  it("keeps the legacy 16-family tuple and publishes separate exact 17/7 contracts", () => {
    expect(V2_ACTIVITY_FAMILIES).toHaveLength(16);
    expect(V2_ACTIVITY_FAMILIES).not.toContain("speaking_club_mission");
    expect(V2_ACTIVITY_FAMILIES_V2).toEqual([
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
    ]);
    expect(V2_REQUIRED_SESSION_FAMILIES_V2).toEqual([
      "phrase_builder",
      "listen_choose",
      "sound_contrast",
      "listen_build_dictation",
      "context_gap_grammar",
      "speed_match",
      "scripted_repeat_compare",
    ]);
    expect(V2_ACTIVITY_FAMILY_CATALOG_V2.contentHash).toBe(
      hashCanonicalBody(V2_ACTIVITY_FAMILY_CATALOG_V2.body),
    );
    expect(V2_REQUIRED_SESSION_FAMILY_POLICY_V2.contentHash).toBe(
      hashCanonicalBody(V2_REQUIRED_SESSION_FAMILY_POLICY_V2.body),
    );
    expect(Object.isFrozen(V2_ACTIVITY_FAMILIES_V2)).toBe(true);
    expect(Object.isFrozen(V2_REQUIRED_SESSION_FAMILIES_V2)).toBe(true);
  });

  it("uses disjoint parser handles, compiler namespace and stage coordinates", () => {
    const v2Request = trusted();
    const v2Plan = buildV2CanonicalSeasonPlanV2(v2Request);
    const v1Value = {
      ...input(),
      schemaVersion: "v2-canonical-plan-request.v1" as const,
      speechProfileRef: undefined,
      voiceGenerationProfileRef: undefined,
    } as Record<string, unknown>;
    delete v1Value.speechProfileRef;
    delete v1Value.voiceGenerationProfileRef;
    const v1Request = parseV2CanonicalPlanRequest(canonicalJsonV1(v1Value));
    const v1Plan = buildV2CanonicalSeasonPlan(v1Request);

    expect(() => buildV2CanonicalSeasonPlanV2(v1Request as never)).toThrow(
      "v2_canonical_plan_v2_request_untrusted",
    );
    expect(() => buildV2CanonicalSeasonPlan(v2Request as never)).toThrow(
      "v2_canonical_plan_request_untrusted",
    );
    expect(v1Plan.stages.every((node) => node.stageId.startsWith("v2s:"))).toBe(
      true,
    );
    expect(
      v2Plan.stages.every((node) => node.stageId.startsWith("v2s2:")),
    ).toBe(true);
    expect(new Set(v1Plan.stages.map((node) => node.stageId))).not.toContain(
      v2Plan.stages[0]?.stageId,
    );
    expect(v2Plan.schemaVersion).toBe("v2-canonical-season-plan.v2");
    expect(v2Plan.compilerVersion).toBe("v2-canonical-plan-compiler.v2");
    expect(isV2CanonicalSeasonPlanV2(v2Plan)).toBe(true);
    expect(isV2CanonicalSeasonPlanV2(v1Plan)).toBe(false);
    expect(v2Plan.planFingerprint).toBe(
      "fd2f2647305011184b4016998ff2be5b88ce1f6be10ab51643303d083db3e120",
    );
    expect(v2Plan.courseContract.courseContractFingerprint).toBe(
      "1f0dccd9db7cfdac2c4684e97973005e79198082eb29bd353aa6e713f4e387ec",
    );
    expect(
      hashCanonicalBody(
        v2Plan.stages.map((node) => ({
          stageId: node.stageId,
          kind: node.kind,
          dependsOn: node.dependsOn,
          externalRequirementIds: node.externalRequirementIds,
        })),
      ),
    ).toBe("c0408c2d4a520a4c3fae6c5e6232dc79d757833b776e937e399babc29044fe81");
    expect(v1Plan.planFingerprint).toBe(
      "685fb92a9bf106a154f57239e120c3af6418ea0881343e1f3206d2a131a39140",
    );
    expect(
      hashCanonicalBody(
        v1Plan.stages.map((node) => ({
          stageId: node.stageId,
          kind: node.kind,
          dependsOn: node.dependsOn,
        })),
      ),
    ).toBe("8e0c18305f2314e3911cbe5e1fbb1375ff02a35700f8facb4b03824d070b8c12");
  });

  it("pins the owner-current 32x12x12 shape, server stars and zero authority", () => {
    const plan = buildV2CanonicalSeasonPlanV2(trusted());
    expect(plan.courseContract).toMatchObject({
      schemaVersion: "v2-owner-current-course-contract.v1",
      artifactModel: "episode-v2-session-set-v2",
      requiredEpisodesPerCourse: 32,
      requiredSessionsPerEpisode: 12,
      requiredTasksPerSession: 12,
      maxProvisionalPerformanceStarsPerSession: 36,
      performanceAuthority: "server_derived_policy_only",
      contentMayAward: false,
      masteryAuthority: "none",
      evidenceAuthority: "none",
      walletMutationAuthority: "none",
      legacyEpisodeGraphStarAuthority: false,
      mapConnectorLinePolicy: "forbidden",
      courseMapNodeUnit: "required_session",
      taskNodesVisibleOnCourseMap: false,
      requiredVoiceIds: ["ash", "onyx", "nova", "coral"],
      voiceVariantsPerApprovedTarget: 4,
      voicePlaybackPolicyRef: V2_FOUR_VOICE_PLAYBACK_POLICY_V1.ref,
      audioPrefetchPolicyRef: V2_AUDIO_PREFETCH_POLICY_V1.ref,
      audioDeliveryImplementationStatus: "contract_only_runtime_open",
      requiredInterfaceLocales: [
        "ru",
        "uk",
        "es",
        "pt-BR",
        "vi",
        "id",
        "tr",
        "pl",
      ],
      interfaceLocalesAreTtsDuplicationAxis: false,
      voiceTargetByteAuthority: "none",
      languageAndSpeechProfileResolutionAuthority: "unverified_external_refs",
      voiceSourceHashInvalidationAuthority: "future_voice_targets_validator",
      familyCatalogApplicability:
        "canonical_activity_instances_and_optional_capstones",
      requiredSessionCardsUseExactSevenFamilyPolicyOnly: true,
      requiredSessionFamilyPolicyRef: V2_REQUIRED_SESSION_FAMILY_POLICY_V2.ref,
      familyCatalogRef: V2_ACTIVITY_FAMILY_CATALOG_V2.ref,
      activityInstancesSchema: "v2-activity-instances-package-root.v2",
      activitySessionShardSchema: "v2-activity-session-source-shard.v2",
    });
    expect(plan.courseContract.provisionalTaskStars).toEqual({
      firstCorrectNoHint: 3,
      secondCorrectNoHint: 2,
      hintedOrLaterCorrect: 1,
      skipped: 0,
      technicalInvalid: "neutral_retry",
    });
    const { courseContractFingerprint, ...courseContractBody } =
      plan.courseContract;
    expect(courseContractFingerprint).toBe(
      hashCanonicalBody(courseContractBody),
    );
    expect(V2_FOUR_VOICE_PLAYBACK_POLICY_V1.contentHash).toBe(
      hashCanonicalBody(V2_FOUR_VOICE_PLAYBACK_POLICY_V1.body),
    );
    expect(V2_FOUR_VOICE_PLAYBACK_POLICY_V1.body).toMatchObject({
      voices: ["ash", "onyx", "nova", "coral"],
      variantsPerApprovedTarget: 4,
      selection: "local_shuffled_round_robin",
      exhaustAllVoicesBeforeRepeat: true,
      avoidImmediateRepeatAcrossCycleBoundary: true,
      serverRequestPerPlayback: false,
      remoteTtsFallbackDuringSession: false,
    });
    expect(V2_AUDIO_PREFETCH_POLICY_V1.body).toMatchObject({
      initialRequiredSessionOrdinals: [1, 2],
      afterCompletionPrefetchOrdinalOffset: 2,
      cacheIdentity: "immutable_content_hash",
      wholeEpisodePrefetch: false,
      serverRequestPerPlayback: false,
      runtimeImplementationAuthority: "external_pending",
    });
    expect(plan).toMatchObject({
      executionAuthority: "none",
      storageAuthority: "none",
      humanReviewAuthority: "none",
      specialistEvidenceAuthority: "none",
      deviceEvidenceAuthority: "none",
      listeningEvidenceAuthority: "none",
      publicationPolicy: "draft_only_no_consumer",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
  });

  it.each([
    [{}, 18],
    [{ dialogue: true }, 19],
    [{ speakingMission: true }, 19],
    [{ dialogue: true, speakingMission: true }, 20],
  ] as const)(
    "builds the exact acyclic v2 DAG for recipe %j",
    (recipe, count) => {
      const plan = buildV2CanonicalSeasonPlanV2(
        trusted(input("vertical_slice", recipe)),
      );
      expect(plan.stages).toHaveLength(count);
      const outline = stage(plan, "v2_episode_outline");
      const scene = stage(plan, "v2_scene_set");
      const instances = stage(plan, "v2_activity_instances");
      const voice = stage(plan, "v2_voice_targets");
      const graph = stage(plan, "v2_activity_graph");
      const assets = stage(plan, "v2_asset_manifest");
      const dialogue = plan.stages.find(
        (node) => node.kind === "v2_dialogue_script",
      );
      const mission = plan.stages.find(
        (node) => node.kind === "v2_speaking_mission",
      );
      const expectedSources = [outline.stageId, scene.stageId];
      const expectedVoiceSources = [scene.stageId];
      if (dialogue) {
        expectedSources.push(dialogue.stageId);
        expectedVoiceSources.push(dialogue.stageId);
      }
      if (mission) {
        expectedSources.push(mission.stageId);
        expectedVoiceSources.push(mission.stageId);
      }
      expect(instances.dependsOn).toEqual(expectedSources);
      expect(instances.dependsOn).not.toContain(voice.stageId);
      expect(voice.dependsOn).toEqual([
        ...expectedVoiceSources,
        instances.stageId,
      ]);
      expect(graph.dependsOn).toEqual([instances.stageId]);
      expect(assets.dependsOn).toEqual([graph.stageId, voice.stageId]);
      for (const locale of [
        "ru",
        "uk",
        "es",
        "pt-BR",
        "vi",
        "id",
        "tr",
        "pl",
      ]) {
        expect(
          stage(plan, "v2_localization", "episode-1", locale).dependsOn,
        ).toEqual([instances.stageId, graph.stageId]);
      }
      const positions = new Map(
        plan.stages.map((node, index) => [node.stageId, index]),
      );
      for (const node of plan.stages) {
        for (const dependency of node.dependsOn) {
          expect(positions.get(dependency)).toBeLessThan(
            positions.get(node.stageId)!,
          );
        }
        expect(
          node.dependsOn.length + node.externalRequirementIds.length,
        ).toBeLessThanOrEqual(32);
      }
    },
  );

  it("isolates mixed optional recipes per episode", () => {
    const value = input("chapter_internal", {});
    value.recipes = [
      { episodeId: "episode-1", dialogue: true },
      { episodeId: "episode-2", speakingMission: true },
      {
        episodeId: "episode-3",
        dialogue: true,
        speakingMission: true,
      },
    ];
    const plan = buildV2CanonicalSeasonPlanV2(trusted(value));
    const kinds = (episodeId: string) =>
      plan.stages
        .filter((node) => node.episodeId === episodeId)
        .map((node) => node.kind);
    expect(kinds("episode-1")).toContain("v2_dialogue_script");
    expect(kinds("episode-1")).not.toContain("v2_speaking_mission");
    expect(kinds("episode-2")).not.toContain("v2_dialogue_script");
    expect(kinds("episode-2")).toContain("v2_speaking_mission");
    expect(kinds("episode-3")).toEqual(
      expect.arrayContaining(["v2_dialogue_script", "v2_speaking_mission"]),
    );
    expect(kinds("episode-4")).not.toEqual(
      expect.arrayContaining(["v2_dialogue_script", "v2_speaking_mission"]),
    );
  });

  it.each([
    ["vertical_slice", 20],
    ["chapter_internal", 146],
    ["full_season", 578],
  ] as const)("keeps %s bounded and compact", (scope, count) => {
    const value = input(scope);
    value.recipes = value.episodeIds.map((episodeId) => ({
      episodeId,
      dialogue: true,
      speakingMission: true,
    }));
    const plan = buildV2CanonicalSeasonPlanV2(trusted(value));
    expect(plan.stages).toHaveLength(count);
    expect(utf8ByteLengthV1(canonicalJsonV1(plan))).toBeLessThanOrEqual(
      V2_CANONICAL_PLAN_V2_MAX_BYTES,
    );
  });

  it("normalizes semantic aliases but invalidates profile changes", () => {
    const omitted = input("vertical_slice", { speakingMission: true });
    const explicitFalse = {
      ...omitted,
      recipes: [
        { episodeId: "episode-1", dialogue: false, speakingMission: true },
      ],
    };
    const first = buildV2CanonicalSeasonPlanV2(trusted(omitted));
    const second = buildV2CanonicalSeasonPlanV2(trusted(explicitFalse));
    expect(first.planFingerprint).toBe(second.planFingerprint);
    expect(first.stages.map((node) => node.stageId)).toEqual(
      second.stages.map((node) => node.stageId),
    );

    const changed = input("vertical_slice", { speakingMission: true });
    changed.voiceGenerationProfileRef.contentHash = hash("e");
    const third = buildV2CanonicalSeasonPlanV2(trusted(changed));
    expect(third.planFingerprint).not.toBe(first.planFingerprint);
    expect(stage(third, "v2_voice_targets").stageId).not.toBe(
      stage(first, "v2_voice_targets").stageId,
    );
    for (const kind of [
      "v2_season_outline",
      "v2_episode_outline",
      "v2_scene_set",
      "v2_dialogue_script",
      "v2_speaking_mission",
      "v2_activity_instances",
      "v2_activity_graph",
      "v2_localization",
    ]) {
      expect(
        third.stages
          .filter((node) => node.kind === kind)
          .map((node) => node.stageId),
      ).toEqual(
        first.stages
          .filter((node) => node.kind === kind)
          .map((node) => node.stageId),
      );
    }
    for (const kind of [
      "v2_voice_targets",
      "v2_asset_manifest",
      "v2_preview_receipt",
      "v2_episode_bundle",
      "v2_season_qa",
    ]) {
      expect(
        third.stages
          .filter((node) => node.kind === kind)
          .map((node) => node.stageId),
      ).not.toEqual(
        first.stages
          .filter((node) => node.kind === kind)
          .map((node) => node.stageId),
      );
    }

    const withoutRecipes = input("vertical_slice", {});
    delete (withoutRecipes as { recipes?: unknown }).recipes;
    const explicitEmpty = input("vertical_slice", {});
    explicitEmpty.recipes = [];
    expect(
      buildV2CanonicalSeasonPlanV2(trusted(withoutRecipes)).planFingerprint,
    ).toBe(
      buildV2CanonicalSeasonPlanV2(trusted(explicitEmpty)).planFingerprint,
    );
  });

  it.each([
    [
      "speech profile content",
      (value: ReturnType<typeof input>) => {
        value.speechProfileRef.contentHash = hash("e");
      },
    ],
    [
      "speech locale",
      (value: ReturnType<typeof input>) => {
        value.speechProfileRef.speechLocale = "en-GB";
      },
    ],
    [
      "voice generation profile identity",
      (value: ReturnType<typeof input>) => {
        value.voiceGenerationProfileRef.profileId =
          "openai-tts-learning-v2-next";
      },
    ],
    [
      "voice generation profile version",
      (value: ReturnType<typeof input>) => {
        value.voiceGenerationProfileRef.version = 2;
      },
    ],
  ])(
    "keeps structural coordinates stable when %s changes",
    (_label, mutate) => {
      const baseline = buildV2CanonicalSeasonPlanV2(
        trusted(input("vertical_slice", { speakingMission: true })),
      );
      const changedInput = input("vertical_slice", { speakingMission: true });
      mutate(changedInput);
      const changed = buildV2CanonicalSeasonPlanV2(trusted(changedInput));

      for (const kind of [
        "v2_season_outline",
        "v2_episode_outline",
        "v2_scene_set",
        "v2_dialogue_script",
        "v2_speaking_mission",
        "v2_activity_instances",
        "v2_activity_graph",
        "v2_localization",
      ]) {
        expect(
          changed.stages
            .filter((node) => node.kind === kind)
            .map((node) => node.stageId),
        ).toEqual(
          baseline.stages
            .filter((node) => node.kind === kind)
            .map((node) => node.stageId),
        );
      }
      for (const kind of [
        "v2_voice_targets",
        "v2_asset_manifest",
        "v2_preview_receipt",
        "v2_episode_bundle",
        "v2_season_qa",
      ]) {
        expect(
          changed.stages
            .filter((node) => node.kind === kind)
            .map((node) => node.stageId),
        ).not.toEqual(
          baseline.stages
            .filter((node) => node.kind === kind)
            .map((node) => node.stageId),
        );
      }
    },
  );

  it("keeps the 28-template activity closure at 32 and rejects the 29th", () => {
    const value = input();
    value.templateBindings[0] = {
      episodeId: "episode-1",
      templateRefs: Array.from({ length: 28 }, (_, index) => ({
        templateId: `template-${index + 1}`,
        version: 1,
        contentHash: hash(((index % 6) + 1).toString()),
      })),
    };
    const plan = buildV2CanonicalSeasonPlanV2(trusted(value));
    const instances = stage(plan, "v2_activity_instances");
    expect(instances.dependsOn).toHaveLength(4);
    expect(instances.externalRequirementIds).toHaveLength(28);
    expect(
      instances.dependsOn.length + instances.externalRequirementIds.length,
    ).toBe(32);

    value.templateBindings[0] = {
      episodeId: "episode-1",
      templateRefs: Array.from({ length: 29 }, (_, index) => ({
        templateId: `template-${index + 1}`,
        version: 1,
        contentHash: hash(((index % 6) + 1).toString()),
      })),
    };
    expect(() => trusted(value)).toThrow(
      "v2_canonical_plan_v2_request_invalid",
    );
  });

  it("binds exact language, speech and generation profiles to voice planning", () => {
    const plan = buildV2CanonicalSeasonPlanV2(trusted());
    expect(requirementsFor(plan, stage(plan, "v2_voice_targets"))).toEqual([
      {
        dependencyType: "language_profile",
        profileId: "english-general",
        version: 3,
        contentHash: hash("a"),
      },
      {
        dependencyType: "speech_profile",
        profileId: "english-speech-general",
        version: 2,
        contentHash: hash("c"),
      },
      {
        dependencyType: "voice_generation_profile",
        profileId: "openai-tts-learning-v2",
        version: 1,
        contentHash: hash("d"),
      },
    ]);
    const mismatch = input();
    mismatch.speechProfileRef.targetLanguage = "es";
    expect(() => trusted(mismatch)).toThrow(
      "v2_canonical_plan_v2_request_invalid",
    );
    const localeMismatch = input();
    localeMismatch.speechProfileRef.speechLocale = "fr-FR";
    expect(() => trusted(localeMismatch)).toThrow(
      "v2_canonical_plan_v2_request_invalid",
    );
    const brazilianPortuguese = input();
    brazilianPortuguese.languageProfileRef.targetLanguage = "pt-BR";
    brazilianPortuguese.speechProfileRef.targetLanguage = "pt-BR";
    brazilianPortuguese.speechProfileRef.speechLocale = "pt-BR";
    expect(() =>
      buildV2CanonicalSeasonPlanV2(trusted(brazilianPortuguese)),
    ).not.toThrow();
    const latinAmericanSpanish = input();
    latinAmericanSpanish.languageProfileRef.targetLanguage = "es-419";
    latinAmericanSpanish.speechProfileRef.targetLanguage = "es-419";
    latinAmericanSpanish.speechProfileRef.speechLocale = "es-419";
    expect(() => trusted(latinAmericanSpanish)).not.toThrow();
    const latinAmericanRegionMismatch = input();
    latinAmericanRegionMismatch.languageProfileRef.targetLanguage = "es-419";
    latinAmericanRegionMismatch.speechProfileRef.targetLanguage = "es-419";
    latinAmericanRegionMismatch.speechProfileRef.speechLocale = "es-ES";
    expect(() => trusted(latinAmericanRegionMismatch)).toThrow(
      "v2_canonical_plan_v2_request_invalid",
    );
    const scriptMismatch = input();
    scriptMismatch.languageProfileRef.targetLanguage = "sr-Latn";
    scriptMismatch.speechProfileRef.targetLanguage = "sr-Latn";
    scriptMismatch.speechProfileRef.speechLocale = "sr-Cyrl";
    expect(() => trusted(scriptMismatch)).toThrow(
      "v2_canonical_plan_v2_request_invalid",
    );
    const missingScript = input();
    missingScript.languageProfileRef.targetLanguage = "zh-Hant";
    missingScript.speechProfileRef.targetLanguage = "zh-Hant";
    missingScript.speechProfileRef.speechLocale = "zh-CN";
    expect(() => trusted(missingScript)).toThrow(
      "v2_canonical_plan_v2_request_invalid",
    );
    const oversizedTag = input();
    oversizedTag.languageProfileRef.targetLanguage = `en${"-AA".repeat(100)}`;
    oversizedTag.speechProfileRef.targetLanguage =
      oversizedTag.languageProfileRef.targetLanguage;
    oversizedTag.speechProfileRef.speechLocale =
      oversizedTag.languageProfileRef.targetLanguage;
    expect(() => trusted(oversizedTag)).toThrow(
      "v2_canonical_plan_v2_request_invalid",
    );
    const tooManySubtags = input();
    tooManySubtags.languageProfileRef.targetLanguage = `en${"-AA".repeat(16)}`;
    tooManySubtags.speechProfileRef.targetLanguage =
      tooManySubtags.languageProfileRef.targetLanguage;
    tooManySubtags.speechProfileRef.speechLocale =
      tooManySubtags.languageProfileRef.targetLanguage;
    expect(
      tooManySubtags.languageProfileRef.targetLanguage.length,
    ).toBeLessThan(255);
    expect(() => trusted(tooManySubtags)).toThrow(
      "v2_canonical_plan_v2_request_invalid",
    );
  });

  it("keeps the worst supported full-season template plan under 512 KiB", () => {
    const value = input("full_season");
    const maxToken = (prefix: string, suffix = "") =>
      `${prefix}${suffix}${"x".repeat(128 - prefix.length - suffix.length)}`;
    value.workspaceId = maxToken("w");
    value.jobId = maxToken("j");
    value.seasonId = maxToken("s");
    value.languageProfileRef.profileId = maxToken("l");
    value.speechProfileRef.profileId = maxToken("p");
    value.voiceGenerationProfileRef.profileId = maxToken("v");
    value.episodeIds = Array.from({ length: 32 }, (_, index) =>
      maxToken("e", String(index + 1).padStart(2, "0")),
    );
    value.recipes = value.episodeIds.map((episodeId) => ({
      episodeId,
      dialogue: true,
      speakingMission: true,
    }));
    const refs = Array.from({ length: 28 }, (_, index) => ({
      templateId: maxToken("t", String(index + 1).padStart(2, "0")),
      version: 1,
      contentHash: hash(((index % 6) + 1).toString()),
    }));
    value.templateBindings = value.episodeIds.map((episodeId) => ({
      episodeId,
      templateRefs: refs,
    }));
    const plan = buildV2CanonicalSeasonPlanV2(trusted(value));
    expect(plan.stages).toHaveLength(578);
    expect(plan.externalRequirementCatalog).toHaveLength(31);
    expect(
      plan.externalRequirementCatalog.map((entry) => entry.requirementId),
    ).toEqual(
      [...plan.externalRequirementCatalog]
        .map((entry) => entry.requirementId)
        .sort(),
    );
    const knownRequirementIds = new Set(
      plan.externalRequirementCatalog.map((entry) => entry.requirementId),
    );
    for (const node of plan.stages) {
      expect(
        node.externalRequirementIds.every((requirementId) =>
          knownRequirementIds.has(requirementId),
        ),
      ).toBe(true);
    }
    expect(utf8ByteLengthV1(canonicalJsonV1(plan))).toBeLessThanOrEqual(
      V2_CANONICAL_PLAN_V2_MAX_BYTES - 64 * 1024,
    );
  });

  it("rejects legacy, noncanonical, extra and oversized v2 requests", () => {
    const legacy = {
      ...input(),
      schemaVersion: "v2-canonical-plan-request.v1",
    };
    expect(() =>
      parseV2CanonicalPlanRequestV2(canonicalJsonV1(legacy)),
    ).toThrow("v2_canonical_plan_v2_request_invalid");
    expect(() =>
      parseV2CanonicalPlanRequestV2(JSON.stringify(input())),
    ).toThrow("v2_canonical_plan_v2_request_noncanonical");
    expect(() =>
      parseV2CanonicalPlanRequestV2(
        canonicalJsonV1({ ...input(), approved: true }),
      ),
    ).toThrow("v2_canonical_plan_v2_request_invalid");
    const canonical = canonicalJsonV1(input());
    const duplicateKey = `{"schemaVersion":"v2-canonical-plan-request.v2",${canonical.slice(1)}`;
    expect(() => parseV2CanonicalPlanRequestV2(duplicateKey)).toThrow(
      "v2_canonical_plan_v2_request_noncanonical",
    );
    expect(() =>
      parseV2CanonicalPlanRequestV2(" ".repeat(1024 * 1024 + 1)),
    ).toThrow("v2_canonical_plan_v2_request_invalid");
  });
});
