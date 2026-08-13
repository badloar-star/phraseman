import { createHash } from "node:crypto";
import {
  LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_SCHEMA_V1,
  encodeLearningV2ActivityErrorExplanationCatalogV1,
  encodeLearningV2ActivityErrorExplanationLearnerProjectionV1,
  parseLearningV2ActivityErrorExplanationCatalogV1,
  projectLearningV2ActivityErrorExplanationsForLearnerV1,
  type LearningV2ActivityErrorExplanationCatalogV1,
} from "../../../modules/learning-v2/content/activity_error_explanation_catalog_v1";
import { LEARNING_V2_INTERFACE_LOCALES } from "../../../modules/learning-v2/content/generator_course_contract";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  encodeV2EpisodeErrorGuidanceReleaseIndexV1,
  isV2EpisodeErrorGuidanceReleaseIndexV1,
  materializeV2EpisodeErrorGuidanceReleaseIndexV1,
  parseV2EpisodeErrorGuidanceReleaseIndexV1,
  v2EpisodeErrorGuidanceCatalogObjectPathV1,
  v2EpisodeErrorGuidanceLearnerProjectionObjectPathV1,
  v2EpisodeErrorGuidanceReleaseIndexObjectPathV1,
} from "./v2_episode_error_guidance_release_index_v1";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const families = [
  "phrase_builder",
  "listen_choose",
  "sound_contrast",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
] as const;
const localized = (label: string) =>
  Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
      locale,
      `${label} ${locale}`,
    ]),
  ) as Record<(typeof LEARNING_V2_INTERFACE_LOCALES)[number], string>;

function catalogBody(): Omit<
  LearningV2ActivityErrorExplanationCatalogV1,
  "catalogFingerprint"
> {
  return {
    schemaVersion: LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_SCHEMA_V1,
    catalogId: "neutral-errors-e01",
    packageId: "neutral-package",
    targetLanguage: "en",
    episodeId: "episode-01",
    episodeOrdinal: 1,
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    entries: Array.from({ length: 144 }, (_, index) => {
      const sessionOrdinal = Math.floor(index / 12) + 1;
      const slot = (index % 12) + 1;
      const suffix = `${String(sessionOrdinal).padStart(2, "0")}-${String(slot).padStart(2, "0")}`;
      const selectedVariantId = `selected-${suffix}`;
      return {
        explanationId: `explanation-${suffix}`,
        episodeId: "episode-01",
        sessionId: `session-${sessionOrdinal}`,
        sessionOrdinal,
        taskId: `task-${suffix}`,
        activityId: `activity-${suffix}`,
        family: families[index % families.length],
        errorKind: "generic_wrong_answer" as const,
        selectedVariantId,
        variants: [
          {
            variantId: selectedVariantId,
            state: "selected_for_preview" as const,
            origin: "owner_authored" as const,
            provenanceFingerprint: hashCanonicalBody({ suffix, version: 1 }),
            textByLocale: localized(`Selected ${suffix}`),
          },
          {
            variantId: `candidate-${suffix}`,
            state: "candidate" as const,
            origin: "generator_candidate" as const,
            provenanceFingerprint: hashCanonicalBody({ suffix, version: 2 }),
            textByLocale: localized(`Candidate ${suffix}`),
          },
        ],
      };
    }),
    entryCount: 144,
    filterDimensions: [
      "interface_locale",
      "family",
      "episode",
      "session",
      "task",
    ],
    contentOriginAuthority: "unverified_owner_or_generator_claim",
    selectionAuthority: "preview_only_no_release_authority",
    runtimeAuthority: "none",
    publicationAuthority: "none",
    releaseAuthority: false,
  };
}

function fixture() {
  const catalogRaw =
    encodeLearningV2ActivityErrorExplanationCatalogV1(catalogBody());
  const catalog = parseLearningV2ActivityErrorExplanationCatalogV1(catalogRaw);
  const projection =
    projectLearningV2ActivityErrorExplanationsForLearnerV1(catalog);
  const learnerProjectionRaw =
    encodeLearningV2ActivityErrorExplanationLearnerProjectionV1(projection);
  const planFingerprint = hash("plan");
  const catalogObject = Object.freeze({
    objectPath: v2EpisodeErrorGuidanceCatalogObjectPathV1({
      planFingerprint,
      episodeId: catalog.episodeId,
      catalogFingerprint: catalog.catalogFingerprint,
      rawHash: hash(catalogRaw),
    }),
    contentHash: hash(catalogRaw),
    objectGeneration: "7",
    byteSize: Buffer.byteLength(catalogRaw, "utf8"),
    contentType: "application/json; charset=utf-8" as const,
  });
  const learnerProjectionObject = Object.freeze({
    objectPath: v2EpisodeErrorGuidanceLearnerProjectionObjectPathV1({
      planFingerprint,
      episodeId: catalog.episodeId,
      projectionFingerprint: projection.projectionFingerprint,
      rawHash: hash(learnerProjectionRaw),
    }),
    contentHash: hash(learnerProjectionRaw),
    objectGeneration: "8",
    byteSize: Buffer.byteLength(learnerProjectionRaw, "utf8"),
    contentType: "application/json; charset=utf-8" as const,
  });
  return {
    planFingerprint,
    courseContractFingerprint: hash("course"),
    stageId: "activity-stage",
    episodeId: "episode-01",
    episodeOrdinal: 1,
    activityAssemblyFingerprint: hash("assembly"),
    activityPackageFingerprint: hash("package"),
    catalogRaw,
    catalogObject,
    learnerProjectionRaw,
    learnerProjectionObject,
  };
}

describe("V2 episode error-guidance release index", () => {
  test("binds the full admin catalog to the exact selected learner projection", () => {
    const input = fixture();
    const index = materializeV2EpisodeErrorGuidanceReleaseIndexV1(input);

    expect(isV2EpisodeErrorGuidanceReleaseIndexV1(index)).toBe(true);
    expect(index).toMatchObject({
      episodeId: "episode-01",
      entryCount: 144,
      filterDimensions: [
        "interface_locale",
        "family",
        "episode",
        "session",
        "task",
      ],
      learnerProjectionBindingEvidence:
        "code_derived_exact_selected_variant_projection",
      contentOriginAuthority: "none_owner_or_generator_claim_only",
      selectionAuthority: "none_owner_confirmation_required",
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(input.learnerProjectionRaw).not.toContain("generator_candidate");
    expect(input.learnerProjectionRaw).not.toContain("provenanceFingerprint");
  });

  test("round-trips with both exact immutable children and rejects clones", () => {
    const input = fixture();
    const index = materializeV2EpisodeErrorGuidanceReleaseIndexV1(input);
    const raw = encodeV2EpisodeErrorGuidanceReleaseIndexV1(index);
    const parsed = parseV2EpisodeErrorGuidanceReleaseIndexV1({
      raw,
      catalogRaw: input.catalogRaw,
      learnerProjectionRaw: input.learnerProjectionRaw,
    });

    expect(parsed).toEqual(index);
    expect(isV2EpisodeErrorGuidanceReleaseIndexV1(JSON.parse(raw))).toBe(false);
    expect(() =>
      encodeV2EpisodeErrorGuidanceReleaseIndexV1(JSON.parse(raw)),
    ).toThrow("v2_episode_error_guidance_release_index_handle_invalid");
  });

  test("rejects learner text drift, object path drift and wrong Activity assembly", () => {
    const input = fixture();
    const changedProjectionRaw = input.learnerProjectionRaw.replace(
      "Selected 01-01 ru",
      "Changed 01-01 ru",
    );
    expect(() =>
      materializeV2EpisodeErrorGuidanceReleaseIndexV1({
        ...input,
        learnerProjectionRaw: changedProjectionRaw,
      }),
    ).toThrow();
    expect(() =>
      materializeV2EpisodeErrorGuidanceReleaseIndexV1({
        ...input,
        catalogObject: {
          ...input.catalogObject,
          objectPath: `${input.catalogObject.objectPath}.changed`,
        },
      }),
    ).toThrow("v2_episode_error_guidance_release_index_pin_invalid");

    const index = materializeV2EpisodeErrorGuidanceReleaseIndexV1(input);
    const raw = encodeV2EpisodeErrorGuidanceReleaseIndexV1(index);
    const changed = JSON.parse(raw);
    changed.activityAssemblyFingerprint = hash("other-assembly");
    expect(() =>
      parseV2EpisodeErrorGuidanceReleaseIndexV1({
        raw: JSON.stringify(changed),
        catalogRaw: input.catalogRaw,
        learnerProjectionRaw: input.learnerProjectionRaw,
      }),
    ).toThrow();
  });

  test("uses content-addressed paths without exposing the raw episode id", () => {
    const index = materializeV2EpisodeErrorGuidanceReleaseIndexV1(fixture());
    const raw = encodeV2EpisodeErrorGuidanceReleaseIndexV1(index);
    const path = v2EpisodeErrorGuidanceReleaseIndexObjectPathV1({
      planFingerprint: index.planFingerprint,
      episodeId: index.episodeId,
      indexFingerprint: index.indexFingerprint,
      rawHash: hash(raw),
    });
    expect(path).toContain(hash(index.episodeId));
    expect(path).not.toContain(index.episodeId);
  });
});
