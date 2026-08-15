import {
  encodeLearningV2ActivityErrorExplanationCatalogV1,
  encodeLearningV2ActivityErrorExplanationLearnerProjectionV1,
  isLearningV2ActivityErrorExplanationCatalogV1,
  LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_SCHEMA_V1,
  parseLearningV2ActivityErrorExplanationCatalogV1,
  parseLearningV2ActivityErrorExplanationLearnerProjectionV1,
  projectLearningV2ActivityErrorExplanationsForLearnerV1,
  resolveLearningV2ActivityErrorExplanationV1,
  type LearningV2ActivityErrorExplanationCatalogV1,
} from "../modules/learning-v2/content/activity_error_explanation_catalog_v1";
import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

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
      `${label} · ${locale}`,
    ]),
  ) as Record<(typeof LEARNING_V2_INTERFACE_LOCALES)[number], string>;

function body(): Omit<
  LearningV2ActivityErrorExplanationCatalogV1,
  "catalogFingerprint"
> {
  return {
    schemaVersion: LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_SCHEMA_V1,
    catalogId: "neutral-error-copy-e01",
    packageId: "neutral-package",
    targetLanguage: "en",
    episodeId: "episode-01",
    episodeOrdinal: 1,
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    entries: Array.from({ length: 144 }, (_, index) => {
      const sessionOrdinal = Math.floor(index / 12) + 1;
      const slot = (index % 12) + 1;
      const suffix = `${String(sessionOrdinal).padStart(2, "0")}-${String(slot).padStart(2, "0")}`;
      const selectedVariantId = `variant-${suffix}-selected`;
      return {
        explanationId: `explanation-${suffix}`,
        episodeId: "episode-01",
        sessionId: `session-episode-01-${String(sessionOrdinal).padStart(2, "0")}`,
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
            provenanceFingerprint: hashCanonicalBody({ suffix, kind: "owner" }),
            textByLocale: localized(`Neutral explanation ${suffix}`),
          },
          {
            variantId: `variant-${suffix}-candidate`,
            state: "candidate" as const,
            origin: "generator_candidate" as const,
            provenanceFingerprint: hashCanonicalBody({
              suffix,
              kind: "candidate",
            }),
            textByLocale: localized(`Neutral candidate ${suffix}`),
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

describe("Learning V2 activity error explanation catalog", () => {
  test("keeps all variants for admin filtering and projects only selected learner copy", () => {
    const raw = encodeLearningV2ActivityErrorExplanationCatalogV1(body());
    const catalog = parseLearningV2ActivityErrorExplanationCatalogV1(raw);
    expect(isLearningV2ActivityErrorExplanationCatalogV1(catalog)).toBe(true);
    expect(catalog.entries).toHaveLength(144);
    expect(catalog.entries[0].variants).toHaveLength(2);
    expect(catalog.filterDimensions).toEqual([
      "interface_locale",
      "family",
      "episode",
      "session",
      "task",
    ]);

    const projected =
      projectLearningV2ActivityErrorExplanationsForLearnerV1(catalog);
    const learner = parseLearningV2ActivityErrorExplanationLearnerProjectionV1(
      encodeLearningV2ActivityErrorExplanationLearnerProjectionV1(projected),
    );
    expect(learner.entries).toHaveLength(144);
    expect(JSON.stringify(learner)).not.toContain("provenanceFingerprint");
    expect(JSON.stringify(learner)).not.toContain("generator_candidate");
    expect(learner).toMatchObject({
      answerKeyAuthority: "none_structural_fields_only_semantic_qa_required",
      publicationAuthority: "none",
      releaseAuthority: false,
    });
    expect(Object.isFrozen(learner.entries[0].textByLocale)).toBe(true);
    expect(
      resolveLearningV2ActivityErrorExplanationV1(learner, {
        taskId: "task-01-01",
        activityId: "activity-01-01",
        interfaceLocale: "uk",
      }),
    ).toMatchObject({
      explanationRef: expect.stringMatching(/^error-explanation-[a-f0-9]{64}$/),
      localizedText: "Neutral explanation 01-01 · uk",
    });
  });

  test("rejects a second selected variant and incomplete 12 by 12 coverage", () => {
    const input = body();
    const first = input.entries[0];
    const badSelection = {
      ...input,
      entries: [
        {
          ...first,
          variants: first.variants.map((variant) => ({
            ...variant,
            state: "selected_for_preview" as const,
          })),
        },
        ...input.entries.slice(1),
      ],
    };
    expect(() =>
      parseLearningV2ActivityErrorExplanationCatalogV1(
        encodeLearningV2ActivityErrorExplanationCatalogV1(badSelection),
      ),
    ).toThrow("learning_v2_error_explanation_selection_invalid");

    const incomplete = { ...input, entries: input.entries.slice(0, 143) };
    expect(() =>
      parseLearningV2ActivityErrorExplanationCatalogV1(
        encodeLearningV2ActivityErrorExplanationCatalogV1(incomplete as never),
      ),
    ).toThrow("learning_v2_error_explanation_catalog_shape_invalid");
  });

  test("rejects reordered sessions, missing locales and forged handles", () => {
    const input = body();
    const reordered = {
      ...input,
      entries: [
        input.entries[12],
        ...input.entries.slice(1, 12),
        input.entries[0],
        ...input.entries.slice(13),
      ],
    };
    expect(() =>
      parseLearningV2ActivityErrorExplanationCatalogV1(
        encodeLearningV2ActivityErrorExplanationCatalogV1(reordered),
      ),
    ).toThrow("learning_v2_error_explanation_catalog_order_invalid");

    const first = input.entries[0];
    const { pl: _missing, ...missingLocale } = first.variants[0].textByLocale;
    const missing = {
      ...input,
      entries: [
        {
          ...first,
          variants: [
            { ...first.variants[0], textByLocale: missingLocale },
            ...first.variants.slice(1),
          ],
        },
        ...input.entries.slice(1),
      ],
    };
    expect(() =>
      parseLearningV2ActivityErrorExplanationCatalogV1(
        encodeLearningV2ActivityErrorExplanationCatalogV1(missing as never),
      ),
    ).toThrow("learning_v2_error_explanation_locales_invalid");

    const catalog = parseLearningV2ActivityErrorExplanationCatalogV1(
      encodeLearningV2ActivityErrorExplanationCatalogV1(input),
    );
    const learner =
      projectLearningV2ActivityErrorExplanationsForLearnerV1(catalog);
    expect(() =>
      resolveLearningV2ActivityErrorExplanationV1({ ...learner } as never, {
        taskId: "task-01-01",
        activityId: "activity-01-01",
        interfaceLocale: "ru",
      }),
    ).toThrow("learning_v2_error_explanation_projection_handle_invalid");
  });

  test("fails closed before canonicalization on hostile depth", () => {
    let nested = "leaf" as unknown;
    for (let index = 0; index < 24; index += 1) nested = { nested };
    expect(() =>
      parseLearningV2ActivityErrorExplanationCatalogV1(
        JSON.stringify({ nested }),
      ),
    ).toThrow("learning_v2_error_explanation_catalog_complexity_invalid");
  });
});
