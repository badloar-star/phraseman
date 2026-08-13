import { createHash } from "node:crypto";
import {
  LEARNING_V2_INTERFACE_LOCALES,
  LEARNING_V2_REQUIRED_CONTENT_KINDS,
  type LearningV2InterfaceLocale,
} from "../../../modules/learning-v2/content/generator_course_contract";
import {
  learningV2EpisodeLocaleSessionAggregateFingerprint,
  type LearningV2EpisodeLocaleIndexV1,
} from "../../../modules/learning-v2/content/generator_course_manifest";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1 } from "./v2_firebase_repository_persistence_v1";
import {
  encodeV2EpisodeLocalizationReleaseIndexV1,
  isV2EpisodeLocalizationReleaseIndexV1,
  materializeV2EpisodeLocalizationReleaseIndexV1,
  parseV2EpisodeLocalizationReleaseIndexV1,
  v2EpisodeLocalizationReleaseIndexObjectPathV1,
  type V2EpisodeLocalizationReleaseMaterialV1,
} from "./v2_episode_localization_release_index_v1";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

function localeMaterial(
  locale: LearningV2InterfaceLocale,
  localeIndex: number,
): V2EpisodeLocalizationReleaseMaterialV1 {
  const sessionShards = Array.from({ length: 12 }, (_, index) => ({
    shardId: `episode-01:session-${String(index + 1).padStart(2, "0")}`,
    episodeOrdinal: 1,
    requiredSessionOrdinal: index + 1,
    generationInputFingerprint: hash(`generation-input:${locale}:${index + 1}`),
    object: {
      objectPath: `learning-v2/course-packages/english-course-v2/episodes/01/sessions/${String(index + 1).padStart(2, "0")}.json`,
      contentHash: hash(`session:${locale}:${index + 1}`),
      objectGeneration: String(localeIndex * 12 + index + 1),
      byteSize: 2_000 + index,
    },
  }));
  const body = Object.freeze({
    schemaVersion: "learning-v2-episode-locale-index.v1" as const,
    packageId: "english-course-v2",
    targetLanguage: "en",
    episodeOrdinal: 1,
    locale,
    requiredSessionCount: 12 as const,
    contentKinds: LEARNING_V2_REQUIRED_CONTENT_KINDS,
    sessionShards: Object.freeze(sessionShards),
  });
  const index: LearningV2EpisodeLocaleIndexV1 = Object.freeze({
    ...body,
    sessionAggregateFingerprint:
      learningV2EpisodeLocaleSessionAggregateFingerprint(body),
  });
  const raw = canonicalJsonV1(index);
  return Object.freeze({
    raw,
    object: Object.freeze({
      objectPath: `learning-v2/course-packages/english-course-v2/episodes/01/${locale}/content.json`,
      contentHash: hash(raw),
      objectGeneration: String(localeIndex + 1),
      byteSize: utf8ByteLengthV1(raw),
      contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
    }),
  });
}

function validInput() {
  return {
    planFingerprint: hash("plan"),
    courseContractFingerprint: hash("course"),
    stageId: "v2_activity_instances:episode-01",
    episodeId: "episode-01",
    episodeOrdinal: 1,
    packageId: "english-course-v2",
    targetLanguage: "en",
    activityAssemblyFingerprint: hash("assembly"),
    activityPackageFingerprint: hash("package"),
    localeIndexes: LEARNING_V2_INTERFACE_LOCALES.map(localeMaterial),
  };
}

describe("V2 episode localization release index", () => {
  test("binds eight ordered locale indexes and all twelve distinct session generation inputs per locale", () => {
    const input = validInput();
    const index = materializeV2EpisodeLocalizationReleaseIndexV1(input);

    expect(isV2EpisodeLocalizationReleaseIndexV1(index)).toBe(true);
    expect(index.locales.map((row) => row.locale)).toEqual(
      LEARNING_V2_INTERFACE_LOCALES,
    );
    expect(index.locales).toHaveLength(8);
    expect(new Set(index.locales.map((row) => row.rowFingerprint)).size).toBe(
      8,
    );
    expect(index.locales[0]?.generationInputAggregateFingerprint).toBe(
      hashCanonicalBody(
        Array.from({ length: 12 }, (_, index) => ({
          requiredSessionOrdinal: index + 1,
          generationInputFingerprint: hash(`generation-input:ru:${index + 1}`),
        })),
      ),
    );
    expect(index).toMatchObject({
      localeCount: 8,
      repositoryOriginAuthority: "none_server_readback_required",
      storageAuthority: "none_server_readback_required",
      linguisticApprovalAuthority: "none",
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
  });

  test("round-trips only with all exact nested locale-index bytes and rejects copied handles", () => {
    const input = validInput();
    const index = materializeV2EpisodeLocalizationReleaseIndexV1(input);
    const raw = encodeV2EpisodeLocalizationReleaseIndexV1(index);
    const parsed = parseV2EpisodeLocalizationReleaseIndexV1({
      raw,
      localeIndexRaws: input.localeIndexes.map((item) => item.raw),
    });

    expect(parsed).toEqual(index);
    expect(isV2EpisodeLocalizationReleaseIndexV1(parsed)).toBe(true);
    expect(
      isV2EpisodeLocalizationReleaseIndexV1(JSON.parse(JSON.stringify(parsed))),
    ).toBe(false);
    expect(() =>
      encodeV2EpisodeLocalizationReleaseIndexV1(
        JSON.parse(JSON.stringify(parsed)),
      ),
    ).toThrow("v2_episode_localization_release_index_handle_invalid");
  });

  test("fails closed on a missing, reordered, byte-drifted or path-substituted locale index", () => {
    const input = validInput();
    expect(() =>
      materializeV2EpisodeLocalizationReleaseIndexV1({
        ...input,
        localeIndexes: input.localeIndexes.slice(0, 7),
      }),
    ).toThrow("v2_episode_localization_release_index_input_invalid");
    expect(() =>
      materializeV2EpisodeLocalizationReleaseIndexV1({
        ...input,
        localeIndexes: [
          input.localeIndexes[1]!,
          input.localeIndexes[0]!,
          ...input.localeIndexes.slice(2),
        ],
      }),
    ).toThrow("v2_episode_localization_release_index_locale_subject_mismatch");
    expect(() =>
      materializeV2EpisodeLocalizationReleaseIndexV1({
        ...input,
        localeIndexes: input.localeIndexes.map((material, index) =>
          index === 0 ? { ...material, raw: `${material.raw} ` } : material,
        ),
      }),
    ).toThrow("v2_episode_localization_release_index_raw_invalid");
    expect(() =>
      materializeV2EpisodeLocalizationReleaseIndexV1({
        ...input,
        localeIndexes: input.localeIndexes.map((material, index) =>
          index === 0
            ? {
                ...material,
                object: {
                  ...material.object,
                  objectPath: "foreign/ru/content.json",
                },
              }
            : material,
        ),
      }),
    ).toThrow("v2_episode_localization_release_index_locale_subject_mismatch");
  });

  test("rejects a coordinated nested rewrite against the sealed outer index", () => {
    const input = validInput();
    const index = materializeV2EpisodeLocalizationReleaseIndexV1(input);
    const raw = encodeV2EpisodeLocalizationReleaseIndexV1(index);
    const changedDecoded = JSON.parse(input.localeIndexes[0]!.raw) as {
      sessionShards: {
        generationInputFingerprint: string;
      }[];
      sessionAggregateFingerprint: string;
    };
    changedDecoded.sessionShards[0]!.generationInputFingerprint = hash(
      "rewritten-generation-input",
    );
    changedDecoded.sessionAggregateFingerprint =
      learningV2EpisodeLocaleSessionAggregateFingerprint(
        changedDecoded as unknown as LearningV2EpisodeLocaleIndexV1,
      );
    const changedRaw = canonicalJsonV1(changedDecoded);

    expect(() =>
      parseV2EpisodeLocalizationReleaseIndexV1({
        raw,
        localeIndexRaws: [
          changedRaw,
          ...input.localeIndexes.slice(1).map((item) => item.raw),
        ],
      }),
    ).toThrow("v2_episode_localization_release_index_raw_invalid");
  });

  test("derives the outer immutable path without embedding raw episode identifiers", () => {
    const index = materializeV2EpisodeLocalizationReleaseIndexV1(validInput());
    const rawHash = hash(encodeV2EpisodeLocalizationReleaseIndexV1(index));
    const path = v2EpisodeLocalizationReleaseIndexObjectPathV1({
      planFingerprint: index.planFingerprint,
      episodeId: index.episodeId,
      indexFingerprint: index.indexFingerprint,
      rawHash,
    });

    expect(path).toBe(
      `learning-v2/episode-localization-release-index/${index.planFingerprint}/${hash(index.episodeId)}/${index.indexFingerprint}/${rawHash}.json`,
    );
    expect(path).not.toContain("episode-01");
  });
});
