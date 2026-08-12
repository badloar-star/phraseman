import {
  buildV2AdminGenerationPlan,
  parseV2AdminGenerationRequest,
} from "./v2_admin_generation_contract";

const ref = (templateId: string) => ({
  templateId,
  version: 1,
  contentHash: "a".repeat(64),
});

// зачем: владелец зафиксировал — генерация без утверждённого языкового профиля запрещена.
const languageProfileRef = {
  profileId: "english-general-a1",
  version: 1,
  contentHash: "b".repeat(64),
};

describe("V2 admin generation contract", () => {
  it("can independently plan a complete owner-triggered generation graph for every E1-E32 episode", () => {
    for (let episodeOrdinal = 1; episodeOrdinal <= 32; episodeOrdinal += 1) {
      const episodeId = `episode-${String(episodeOrdinal).padStart(2, "0")}`;
      const request = parseV2AdminGenerationRequest({
        schemaVersion: "v2-admin-generation-request.v1",
        seasonId: "season-01",
        scope: "vertical_slice",
        episodeIds: [episodeId],
        studyTarget: "en",
        sourceLocale: "ru",
        targetLocales: ["uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
        templateBindings: [
          { episodeId, templateRefs: [ref("phrase-builder")] },
        ],
        idempotencyKey: `owner-generate-${episodeId}`,
        languageProfileRef,
      });

      const plan = buildV2AdminGenerationPlan(request);
      const episodeStages = plan.stages.filter(
        (stage) => stage.episodeId === episodeId,
      );
      expect(episodeStages.map((stage) => stage.kind)).toEqual([
        "v2_episode_outline",
        "v2_scene_set",
        "v2_voice_targets",
        "v2_activity_instances",
        "v2_activity_graph",
        "v2_asset_manifest",
        "v2_localization",
        "v2_preview_receipt",
        "v2_episode_bundle",
      ]);
      expect(plan.localizationTasks).toHaveLength(7);
      expect(
        plan.localizationTasks.every((task) => task.episodeId === episodeId),
      ).toBe(true);
      expect(plan.templateBindings).toHaveLength(1);
      expect(plan.templateBindings[0].activityInstancesStageId).toBe(
        `v2_activity_instances:season-01:${episodeId}`,
      );
    }
  });

  it("builds deterministic template bindings and per-locale localization tasks", () => {
    const request = parseV2AdminGenerationRequest({
      schemaVersion: "v2-admin-generation-request.v1",
      seasonId: "season-01",
      scope: "vertical_slice",
      episodeIds: ["episode-01"],
      studyTarget: "en",
      sourceLocale: "ru",
      targetLocales: ["de", "fr"],
      templateBindings: [
        { episodeId: "episode-01", templateRefs: [ref("phrase-builder")] },
      ],
      idempotencyKey: "generate-01",
      languageProfileRef,
    });

    const plan = buildV2AdminGenerationPlan(request);
    expect(plan.stages.at(-1)?.kind).toBe("v2_season_qa");
    expect(plan.localizationTasks.map((task) => task.id)).toEqual([
      "v2_localization:season-01:episode-01:de",
      "v2_localization:season-01:episode-01:fr",
    ]);
    expect(plan.templateBindings).toEqual([
      {
        episodeId: "episode-01",
        activityInstancesStageId: "v2_activity_instances:season-01:episode-01",
        templateRefs: [ref("phrase-builder")],
      },
    ]);
    expect(plan.requestFingerprint).toMatch(
      /^v2-admin-generation-request\.v1:[0-9a-f]{64}$/,
    );
  });

  it("rejects unknown fields, duplicate locales, missing episode bindings, and malformed template refs", () => {
    const base = {
      schemaVersion: "v2-admin-generation-request.v1",
      seasonId: "season-01",
      scope: "vertical_slice",
      episodeIds: ["episode-01"],
      studyTarget: "en",
      sourceLocale: "ru",
      targetLocales: ["de"],
      templateBindings: [
        { episodeId: "episode-01", templateRefs: [ref("phrase-builder")] },
      ],
      idempotencyKey: "generate-01",
      languageProfileRef,
    };
    expect(() =>
      parseV2AdminGenerationRequest({ ...base, extra: true }),
    ).toThrow("v2_generation_unknown_field");
    expect(() =>
      parseV2AdminGenerationRequest({ ...base, targetLocales: ["de", "de"] }),
    ).toThrow("v2_generation_locales_unique");
    expect(() =>
      parseV2AdminGenerationRequest({ ...base, templateBindings: [] }),
    ).toThrow("v2_generation_template_binding_missing");
    expect(() =>
      parseV2AdminGenerationRequest({
        ...base,
        templateBindings: [
          { episodeId: "episode-01", templateRefs: [ref("bad id")] },
        ],
      }),
    ).toThrow("v2_generation_template_ref_invalid");
  });

  it("keeps the optional dialogue recipe flag in the generated DAG", () => {
    const request = parseV2AdminGenerationRequest({
      schemaVersion: "v2-admin-generation-request.v1",
      seasonId: "season-01",
      scope: "vertical_slice",
      episodeIds: ["episode-01"],
      recipes: [{ episodeId: "episode-01", dialogue: true }],
      studyTarget: "en",
      sourceLocale: "ru",
      targetLocales: ["de"],
      templateBindings: [
        { episodeId: "episode-01", templateRefs: [ref("phrase-builder")] },
      ],
      idempotencyKey: "generate-02",
      languageProfileRef,
    });
    const kinds = buildV2AdminGenerationPlan(request).stages.map(
      (stage) => stage.kind,
    );
    expect(kinds).toEqual(expect.arrayContaining(["v2_dialogue_script"]));
    expect(kinds).not.toEqual(expect.arrayContaining(["v2_speaking_mission"]));
  });

  it("requires an exact immutable language profile ref and fingerprints it", () => {
    const validRequest = {
      schemaVersion: "v2-admin-generation-request.v1",
      seasonId: "season-01",
      scope: "vertical_slice",
      episodeIds: ["episode-01"],
      studyTarget: "en",
      sourceLocale: "ru",
      targetLocales: ["de"],
      templateBindings: [
        { episodeId: "episode-01", templateRefs: [ref("phrase-builder")] },
      ],
      idempotencyKey: "generate-03",
      languageProfileRef,
    };
    expect(() =>
      parseV2AdminGenerationRequest({
        ...validRequest,
        languageProfileRef: undefined,
      }),
    ).toThrow("v2_generation_language_profile_required");
    expect(() =>
      parseV2AdminGenerationRequest({
        ...validRequest,
        languageProfileRef: { ...languageProfileRef, contentHash: "abc" },
      }),
    ).toThrow("v2_generation_language_profile_invalid");
    expect(() =>
      parseV2AdminGenerationRequest({
        ...validRequest,
        languageProfileRef: { ...languageProfileRef, hidden: 1 },
      }),
    ).toThrow("v2_generation_language_profile_invalid");
    expect(() =>
      parseV2AdminGenerationRequest({
        ...validRequest,
        languageProfileRef: { ...languageProfileRef, version: 0 },
      }),
    ).toThrow("v2_generation_language_profile_invalid");

    const first = buildV2AdminGenerationPlan(
      parseV2AdminGenerationRequest(validRequest),
    );
    const changed = buildV2AdminGenerationPlan(
      parseV2AdminGenerationRequest({
        ...validRequest,
        languageProfileRef: { ...languageProfileRef, version: 2 },
      }),
    );
    expect(changed.requestFingerprint).not.toBe(first.requestFingerprint);
    expect(changed.stages.map((stage) => stage.kind)).toEqual(
      first.stages.map((stage) => stage.kind),
    );
  });
});
