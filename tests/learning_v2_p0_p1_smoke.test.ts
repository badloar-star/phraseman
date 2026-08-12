import { qaV2EpisodeContent } from "../functions/src/content_factory/v2_episode_content_qa";
import {
  projectRequiredSessionUnlock,
  projectRequiredTaskStars,
  sumRequiredSessionStars,
} from "../modules/learning-v2/contracts/course_economy";
import {
  applyLearningV2SessionChannelResult,
  createInitialLearningV2SessionChannels,
} from "../modules/learning-v2/contracts/hard_mode";
import { projectLegacyCourseRecognition } from "../modules/learning-v2/contracts/migration_policy";
import { buildLesson1LegacyV2SourcePayload } from "../modules/learning-v2/content/legacy_lesson_payload";
import { validateV2LanguageProfile } from "../modules/learning-v2/content/language_profile";
import { compileV2RequiredSessions } from "../modules/learning-v2/content/session_compiler";
import { buildActivityBindingsForContentItems, buildEnglishProfile } from "./support/learning_v2_content_builders";

describe("Learning V2 mandatory stage smoke", () => {
  it("P0 smoke: economy, hard isolation and migration policy execute together", () => {
    const perfectTask = projectRequiredTaskStars({
      disposition: "completed",
      learnerAttempts: 1,
      hintUsed: false,
    });
    expect(sumRequiredSessionStars(new Array(12).fill(perfectTask.stars))).toBe(36);
    expect(
      projectRequiredSessionUnlock({
        requiredSessionOrdinal: 2,
        alreadyUnlocked: false,
        currentBalance: 45,
      }),
    ).toMatchObject({ allowed: true, chargedStars: 45, nextBalance: 0 });

    const normal = applyLearningV2SessionChannelResult(
      createInitialLearningV2SessionChannels(),
      {
        channel: "normal",
        outcome: "completed",
        score: 36,
        containsVoiceActivity: false,
        repeatQualityBand: "perfect",
        mistakePhraseIds: [],
      },
    ).state;
    const hard = applyLearningV2SessionChannelResult(normal, {
      channel: "hard",
      outcome: "completed",
      score: 100,
      containsVoiceActivity: false,
      repeatQualityBand: "perfect",
      mistakePhraseIds: [],
    });
    expect(hard.state.normal).toBe(normal.normal);
    expect(hard.normalLearningProgressChanged).toBe(false);
    expect(projectLegacyCourseRecognition({ highestCompletedLesson: 8 })).toMatchObject({
      nextAction: "offer_placement",
      grantedV2PerformanceStars: 0,
      grantedV2LearningEvidence: 0,
    });
  });

  it("P1 smoke: real Lesson 1 compiles to one QA-approved 12×12 artifact", () => {
    const profile = validateV2LanguageProfile(buildEnglishProfile());
    if (!profile.ok) throw new Error(`smoke_profile_invalid:${profile.issues.join(",")}`);
    const payload = buildLesson1LegacyV2SourcePayload();
    const compiled = compileV2RequiredSessions({
      episodeId: payload.episodeId,
      canDoOutcomeId: "obj-lesson-01-to-be-statements",
      profile: profile.value,
      items: payload.contentItems,
      activityBindings: buildActivityBindingsForContentItems(payload.contentItems),
    });

    expect(payload.contentItems).toHaveLength(50);
    expect(payload.introScreens.length).toBeGreaterThan(0);
    expect(payload.theory.sections.length).toBeGreaterThan(0);
    expect(payload.vocabulary.length).toBeGreaterThan(0);
    expect(compiled.sessions).toHaveLength(12);
    expect(compiled.sessions.every((session) => session.cards.length === 12)).toBe(true);
    expect(qaV2EpisodeContent(
      compiled,
      payload.contentItems,
      profile.value,
      buildActivityBindingsForContentItems(payload.contentItems),
    )).toMatchObject({
      ok: true,
    });
  });
});
