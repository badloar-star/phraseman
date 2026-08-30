/**
 * Approval history for English Learning V2 curriculum blueprints.
 *
 * A historical fingerprint remains inspectable after supersession, but it can
 * no longer authorize learner-facing authoring for a replacement blueprint.
 */

export type LearningV2EnglishBlueprintApprovalStatusV2 =
  | "SUPERSEDED"
  | "PENDING"
  | "APPROVED";

export type LearningV2EnglishBlueprintApprovalRecordV2 = Readonly<{
  status: LearningV2EnglishBlueprintApprovalStatusV2;
  reason: string;
}>;

export const LEARNING_V2_ENGLISH_BLUEPRINT_APPROVAL_REGISTRY_V2: Readonly<
  Record<string, LearningV2EnglishBlueprintApprovalRecordV2>
> = Object.freeze({
  "013e742080c20d6a71fc731dc55ac26aaeb0e1fda2d3e6fd59712b65fdc1695a":
    Object.freeze({
      status: "SUPERSEDED" as const,
      reason:
        "OWNER_DECISION_FULL_B1_GRAMMAR_FIRST_REBUILD_2026_08_30" as const,
    }),
  "ce1163d02a965e843e56a17c306ff4f14d55033ba21e75d7fbb082557fb61c1a":
    Object.freeze({
      status: "SUPERSEDED" as const,
      reason:
        "COURSE_START_PREREQUISITE_AND_LEXICAL_GROUNDING_DEFECT_2026_08_30" as const,
    }),
  "3a4ca1422a6125bb317121c312c0166fdb595ee90111f297c480c8a82b7716e4":
    Object.freeze({
      status: "PENDING" as const,
      reason:
        "OWNER_REVIEW_REQUIRED_AFTER_COURSE_START_PREREQUISITE_AMENDMENT_2026_08_30" as const,
    }),
});
