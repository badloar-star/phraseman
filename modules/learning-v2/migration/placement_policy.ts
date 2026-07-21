export const LEGACY_PLACEMENT_SNAPSHOT_SCHEMA =
  "legacy-placement-snapshot.v1" as const;

export const LEGACY_PLACEMENT_RECOMMENDATION_SCHEMA =
  "legacy-placement-recommendation.v1" as const;

export type LegacyPlacementBoundary = 0 | 8 | 18 | 28 | 32;

export type LegacyPlacementDiagnosticProfile =
  | "none"
  | "chapter_1"
  | "chapters_1_2_voice_transfer"
  | "through_chapter_3_scenario_transfer"
  | "full_can_do";

export type LegacyPlacementAction =
  | "start_episode_1"
  | "offer_placement_diagnostic"
  | "manual_review_snapshot";

export interface LegacyPlacementSnapshot {
  readonly schemaVersion: typeof LEGACY_PLACEMENT_SNAPSHOT_SCHEMA;
  readonly highestContiguousCompletedLesson: number | null;
}

export interface LegacyPlacementRecommendationEffects {
  readonly writesLegacyProgress: false;
  readonly writesV2Progress: false;
  readonly grantsV2Stars: false;
  readonly grantsV2Checkpoint: false;
  readonly grantsV2LearningEvidence: false;
}

export interface LegacyPlacementRecommendation {
  readonly schemaVersion: typeof LEGACY_PLACEMENT_RECOMMENDATION_SCHEMA;
  readonly action: LegacyPlacementAction;
  readonly recognizedLegacyBoundary: LegacyPlacementBoundary | null;
  readonly diagnosticProfile: LegacyPlacementDiagnosticProfile;
  readonly acknowledgesLegacyExperience: boolean;
  readonly effects: LegacyPlacementRecommendationEffects;
}

export type LegacyPlacementIssueCode =
  | "legacy_placement_snapshot_object_required"
  | "legacy_placement_snapshot_schema_invalid"
  | "legacy_placement_snapshot_field_unknown"
  | "legacy_placement_snapshot_lesson_invalid";

export interface LegacyPlacementIssue {
  readonly code: LegacyPlacementIssueCode;
  readonly path: string;
}

export type LegacyPlacementPolicyResult =
  | {
      readonly ok: true;
      readonly recommendation: LegacyPlacementRecommendation;
    }
  | {
      readonly ok: false;
      readonly issues: readonly LegacyPlacementIssue[];
      readonly recommendation: LegacyPlacementRecommendation;
    };

const SNAPSHOT_FIELDS = [
  "schemaVersion",
  "highestContiguousCompletedLesson",
] as const;

const recommendationEffects = (): LegacyPlacementRecommendationEffects => ({
  writesLegacyProgress: false,
  writesV2Progress: false,
  grantsV2Stars: false,
  grantsV2Checkpoint: false,
  grantsV2LearningEvidence: false,
});

const manualReviewRecommendation = (): LegacyPlacementRecommendation => ({
  schemaVersion: LEGACY_PLACEMENT_RECOMMENDATION_SCHEMA,
  action: "manual_review_snapshot",
  recognizedLegacyBoundary: null,
  diagnosticProfile: "none",
  acknowledgesLegacyExperience: false,
  effects: recommendationEffects(),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isValidCompletedLesson = (value: unknown): value is number | null =>
  value === null ||
  (Number.isInteger(value) &&
    typeof value === "number" &&
    value >= 1 &&
    value <= 32);

const validateSnapshot = (
  value: unknown,
):
  | { readonly ok: true; readonly snapshot: LegacyPlacementSnapshot }
  | { readonly ok: false; readonly issues: readonly LegacyPlacementIssue[] } => {
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [
        {
          code: "legacy_placement_snapshot_object_required",
          path: "$",
        },
      ],
    };
  }

  const issues: LegacyPlacementIssue[] = [];
  for (const field of Object.keys(value).sort()) {
    if (!(SNAPSHOT_FIELDS as readonly string[]).includes(field)) {
      issues.push({
        code: "legacy_placement_snapshot_field_unknown",
        path: `$.${field}`,
      });
    }
  }
  if (value.schemaVersion !== LEGACY_PLACEMENT_SNAPSHOT_SCHEMA) {
    issues.push({
      code: "legacy_placement_snapshot_schema_invalid",
      path: "$.schemaVersion",
    });
  }
  if (!isValidCompletedLesson(value.highestContiguousCompletedLesson)) {
    issues.push({
      code: "legacy_placement_snapshot_lesson_invalid",
      path: "$.highestContiguousCompletedLesson",
    });
  }

  issues.sort(
    (left, right) =>
      left.path.localeCompare(right.path) || left.code.localeCompare(right.code),
  );
  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    snapshot: value as unknown as LegacyPlacementSnapshot,
  };
};

const recognizedBoundary = (
  highestContiguousCompletedLesson: number | null,
): LegacyPlacementBoundary => {
  if (highestContiguousCompletedLesson === null) return 0;
  if (highestContiguousCompletedLesson >= 32) return 32;
  if (highestContiguousCompletedLesson >= 28) return 28;
  if (highestContiguousCompletedLesson >= 18) return 18;
  if (highestContiguousCompletedLesson >= 8) return 8;
  return 0;
};

const profileForBoundary = (
  boundary: LegacyPlacementBoundary,
): LegacyPlacementDiagnosticProfile => {
  switch (boundary) {
    case 8:
      return "chapter_1";
    case 18:
      return "chapters_1_2_voice_transfer";
    case 28:
      return "through_chapter_3_scenario_transfer";
    case 32:
      return "full_can_do";
    default:
      return "none";
  }
};

export const recommendLegacyPlacement = (
  input: unknown,
): LegacyPlacementPolicyResult => {
  const parsed = validateSnapshot(input);
  if (!parsed.ok) {
    return {
      ok: false,
      issues: parsed.issues,
      recommendation: manualReviewRecommendation(),
    };
  }

  const highestCompleted = parsed.snapshot.highestContiguousCompletedLesson;
  const boundary = recognizedBoundary(highestCompleted);
  return {
    ok: true,
    recommendation: {
      schemaVersion: LEGACY_PLACEMENT_RECOMMENDATION_SCHEMA,
      action:
        boundary === 0 ? "start_episode_1" : "offer_placement_diagnostic",
      recognizedLegacyBoundary: boundary,
      diagnosticProfile: profileForBoundary(boundary),
      acknowledgesLegacyExperience: highestCompleted !== null,
      effects: recommendationEffects(),
    },
  };
};
