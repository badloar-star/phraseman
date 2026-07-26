import type { EpisodeId, SeasonId, SkillId } from "./identities";
import type { VersionRef } from "../policies/decision_registry";

export type V2EpisodeOrdinals1To8 = readonly [1, 2, 3, 4, 5, 6, 7, 8];
export type V2EpisodeOrdinals1To32 = readonly [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  28,
  29,
  30,
  31,
  32,
];

export type V2CurriculumScope =
  | {
      readonly kind: "vertical_slice";
      readonly includedChapterOrdinals: readonly [1];
      readonly includedEpisodeOrdinals: readonly [1];
    }
  | {
      readonly kind: "chapter_internal";
      readonly includedChapterOrdinals: readonly [1];
      readonly includedEpisodeOrdinals: V2EpisodeOrdinals1To8;
    }
  | {
      readonly kind: "full_season";
      readonly includedChapterOrdinals: readonly [1, 2, 3, 4];
      readonly includedEpisodeOrdinals: V2EpisodeOrdinals1To32;
    };

export interface V2CurriculumMaterialSet {
  readonly skillIds: readonly SkillId[];
  readonly phraseFrameIds: readonly string[];
  readonly grammarDistinctionIds: readonly string[];
  readonly semanticSlotIds: readonly string[];
  readonly criticalConstraintIds: readonly string[];
}

export interface V2CurriculumChapter {
  readonly chapterId: string;
  readonly ordinal: number;
  readonly episodeIds: readonly EpisodeId[];
  readonly checkpointEpisodeId?: EpisodeId;
}

export interface V2CurriculumEpisodeRef {
  readonly episodeId: EpisodeId;
  readonly ordinal: number;
  readonly chapterId: string;
  readonly episodeKind: "ordinary" | "checkpoint";
  readonly contentHash: string;
  readonly prerequisiteEpisodeIds: readonly EpisodeId[];
  readonly introducedMaterial: V2CurriculumMaterialSet;
  readonly requiredCheckpointMaterial: V2CurriculumMaterialSet;
}

interface V2CurriculumProjectionBase {
  readonly schemaVersion: "v2-curriculum-contract.v1";
  readonly curriculumId: string;
  readonly seasonId: SeasonId;
  readonly decisionRegistryRef: VersionRef;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly requiredLocales: readonly string[];
  readonly chapters: readonly V2CurriculumChapter[];
  readonly episodeRefs: readonly V2CurriculumEpisodeRef[];
  readonly requiredAssetIds: readonly string[];
  readonly requiredCapabilityKeys: readonly string[];
}

export type V2CurriculumProjection = V2CurriculumProjectionBase &
  (
    | {
        readonly scope: Extract<
          V2CurriculumScope,
          { readonly kind: "vertical_slice" }
        >;
        readonly environment: "lab" | "staging";
        readonly checkpointOrdinals: readonly [];
      }
    | {
        readonly scope: Extract<
          V2CurriculumScope,
          { readonly kind: "chapter_internal" }
        >;
        readonly environment: "internal" | "staging";
        readonly checkpointOrdinals: readonly [8];
      }
    | {
        readonly scope: Extract<
          V2CurriculumScope,
          { readonly kind: "full_season" }
        >;
        readonly environment: "lab" | "staging" | "internal" | "production";
        readonly checkpointOrdinals: readonly [8, 16, 24, 32];
      }
  );
