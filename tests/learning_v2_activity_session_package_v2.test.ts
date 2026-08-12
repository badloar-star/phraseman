import {
  V2_ACTIVITY_SESSION_PACKAGE_AUTHORITY_V2,
  V2_ACTIVITY_SESSION_PACKAGE_SCHEMA_V2,
  V2_REQUIRED_SESSION_TASK_PURPOSES_V2,
  encodeV2ActivitySessionPackageV2,
  isV2ActivitySessionPackageV2,
  parseV2ActivitySessionPackageV2,
  v2ActivitySessionIdV2,
} from "../modules/learning-v2/contracts/activity_session_package_v2";
import { V2_REQUIRED_SESSION_FAMILIES_V2 } from "../modules/learning-v2/contracts/activity_catalog_v2";
import { canonicalJsonV1 } from "../modules/learning-v2/policies/decision_registry";

const buildPackage = () => ({
  schemaVersion: V2_ACTIVITY_SESSION_PACKAGE_SCHEMA_V2,
  packageId: "package:one",
  episodeId: "episode:one",
  requiredSessionCount: 12,
  requiredTasksPerSession: 12,
  requiredFamilies: [...V2_REQUIRED_SESSION_FAMILIES_V2],
  sessions: Array.from({ length: 12 }, (_, sessionIndex) => ({
    sessionId: v2ActivitySessionIdV2("episode:one", sessionIndex + 1),
    sessionOrdinal: sessionIndex + 1,
    zone: sessionIndex < 4 ? "understand" : sessionIndex < 8 ? "use" : "master",
    tasks: Array.from({ length: 12 }, (_, taskIndex) => {
      const ordinal = taskIndex + 1;
      const independent = ordinal === 10 || ordinal === 12;
      const sourceSessionOrdinal = sessionIndex === 0 ? 1 : sessionIndex;
      const reviewOfTaskId = `task:${sourceSessionOrdinal}:8`;
      const defaultObjectiveId = `objective:${sessionIndex + 1}:${ordinal}`;
      const objectiveId =
        ordinal === 10
          ? `objective:${sessionIndex + 1}:4`
          : ordinal === 12
            ? `objective:${sessionIndex + 1}:6`
            : ordinal === 11
              ? `objective:${sourceSessionOrdinal}:8`
              : defaultObjectiveId;
      const selectedFamily =
        V2_REQUIRED_SESSION_FAMILIES_V2[
          (sessionIndex * 3 + (taskIndex % 3)) % 7
        ];
      return {
        taskId: `task:${sessionIndex + 1}:${ordinal}`,
        taskOrdinal: ordinal,
        purpose: V2_REQUIRED_SESSION_TASK_PURPOSES_V2[taskIndex],
        activityId: `activity:${sessionIndex + 1}:${ordinal}`,
        contentItemId: `content:${sessionIndex + 1}:${Math.ceil(ordinal / 2)}`,
        objectiveId,
        family:
          independent && selectedFamily === "scripted_repeat_compare"
            ? "phrase_builder"
            : selectedFamily,
        learningFunction: `Learning function ${sessionIndex + 1}/${ordinal}`,
        support: independent ? "none" : "partial_cue",
        hintsAllowed: independent ? 0 : 1,
        answerExposure: "forbidden",
        promptId: `prompt:${sessionIndex + 1}:${ordinal}`,
        promptNovelty: independent ? "novel" : "trained",
        localEvaluatorCapsuleId: `capsule:${sessionIndex + 1}:${ordinal}`,
        introQuestionRef:
          ordinal <= 3
            ? {
                introArtifactFingerprint: "a".repeat(64),
                questionId: `intro-question:${sessionIndex + 1}:${ordinal}`,
                coveredConceptIds: [`concept:${sessionIndex + 1}:${ordinal}`],
              }
            : null,
        reviewSource:
          ordinal === 11
            ? {
                kind:
                  sessionIndex === 0
                    ? "same_session_bootstrap"
                    : "prior_session",
                reviewOfTaskId,
                sourceSessionOrdinal,
              }
            : null,
      };
    }),
  })),
  optionalClubCapstones: [
    {
      capstoneId: "club:one",
      activityId: "club-activity:one",
      family: "speaking_club_mission",
      requiredForProgress: false,
      canWriteMastery: false,
      requiredSessionStarEligible: false,
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
      completionAuthority: "none",
    },
  ],
  ...V2_ACTIVITY_SESSION_PACKAGE_AUTHORITY_V2,
});

describe("Learning V2 activity session package v2", () => {
  it("accepts only the canonical 12x12 package with seven required families", () => {
    const raw = encodeV2ActivitySessionPackageV2(buildPackage());
    const parsed = parseV2ActivitySessionPackageV2(raw);
    expect(isV2ActivitySessionPackageV2(parsed)).toBe(true);
    expect(parsed.sessions).toHaveLength(12);
    expect(
      parsed.sessions.every((session) => session.tasks.length === 12),
    ).toBe(true);
    expect(parsed.sessions[0].tasks[10].purpose).toBe("interleaved_review");
    expect(parsed.sessions[0].tasks[9]).toMatchObject({
      support: "none",
      hintsAllowed: 0,
      answerExposure: "forbidden",
    });
    expect(parsed.optionalClubCapstones[0]).toMatchObject({
      requiredForProgress: false,
      canWriteMastery: false,
    });
    expect(Object.isFrozen(parsed.sessions[0].tasks)).toBe(true);
  });

  it.each([
    [
      "wrong session count",
      (value: any) => {
        value.sessions.pop();
      },
    ],
    [
      "wrong task count",
      (value: any) => {
        value.sessions[0].tasks.pop();
      },
    ],
    [
      "delayed review in slot 11",
      (value: any) => {
        value.sessions[0].tasks[10].purpose = "delayed_review";
      },
    ],
    [
      "hinted independent slot",
      (value: any) => {
        value.sessions[0].tasks[9].hintsAllowed = 1;
      },
    ],
    [
      "intro questions from different artifacts",
      (value: any) => {
        value.sessions[0].tasks[1].introQuestionRef.introArtifactFingerprint =
          "b".repeat(64);
      },
    ],
    [
      "duplicate intro question ID",
      (value: any) => {
        value.sessions[0].tasks[1].introQuestionRef.questionId =
          value.sessions[0].tasks[0].introQuestionRef.questionId;
      },
    ],
    [
      "unbound independent objective",
      (value: any) => {
        value.sessions[0].tasks[9].objectiveId = "objective:not-taught";
      },
    ],
    [
      "scripted repeat as independent assessment",
      (value: any) => {
        value.sessions[0].tasks[9].family = "scripted_repeat_compare";
      },
    ],
    [
      "prior-session review pointing to a same-session task",
      (value: any) => {
        value.sessions[1].tasks[10].reviewSource.reviewOfTaskId =
          value.sessions[1].tasks[7].taskId;
        value.sessions[1].tasks[10].reviewSource.sourceSessionOrdinal = 2;
        value.sessions[1].tasks[10].objectiveId =
          value.sessions[1].tasks[7].objectiveId;
      },
    ],
    [
      "club inside required 144",
      (value: any) => {
        value.sessions[0].tasks[0].family = "speaking_club_mission";
      },
    ],
    [
      "authoritative wallet content",
      (value: any) => {
        value.walletAuthority = "server";
      },
    ],
    [
      "required club",
      (value: any) => {
        value.optionalClubCapstones[0].requiredForProgress = true;
      },
    ],
    [
      "club colliding with a required activity",
      (value: any) => {
        value.optionalClubCapstones[0].activityId =
          value.sessions[0].tasks[0].activityId;
      },
    ],
  ])("rejects %s", (_label, mutate) => {
    const value = buildPackage();
    mutate(value);
    expect(() =>
      parseV2ActivitySessionPackageV2(canonicalJsonV1(value)),
    ).toThrow();
  });

  it("rejects semantically valid but non-canonical JSON bytes", () => {
    expect(() =>
      parseV2ActivitySessionPackageV2(JSON.stringify(buildPackage(), null, 2)),
    ).toThrow(/canonical/);
  });
});
