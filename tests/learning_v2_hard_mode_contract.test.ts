import {
  applyLearningV2SessionChannelResult,
  createInitialLearningV2SessionChannels,
} from "../modules/learning-v2/contracts/hard_mode";

describe("Learning V2 Hard Mode isolation contract", () => {
  it("keeps the hard channel locked until one normal completion", () => {
    const initial = createInitialLearningV2SessionChannels();
    expect(() =>
      applyLearningV2SessionChannelResult(initial, {
        channel: "hard",
        outcome: "completed",
        score: 120,
        containsVoiceActivity: false,
        repeatQualityBand: "perfect",
        mistakePhraseIds: ["phrase-1"],
      }),
    ).toThrow("hard_mode_locked");
  });

  it("updates a normal result without mutating the hard channel", () => {
    const initial = createInitialLearningV2SessionChannels();
    const projected = applyLearningV2SessionChannelResult(initial, {
      channel: "normal",
      outcome: "completed",
      score: 31,
      containsVoiceActivity: true,
      repeatQualityBand: "good",
      mistakePhraseIds: ["phrase-1", "phrase-2"],
    });

    expect(projected.state.normal).toEqual({ completedRuns: 1, bestScore: 31 });
    expect(projected.state.hard).toBe(initial.hard);
    expect(projected.practiceCandidatePhraseIds).toEqual(["phrase-1", "phrase-2"]);
    expect(projected.normalLearningProgressChanged).toBe(true);
  });

  it("updates only the hard channel and never emits normal learning evidence", () => {
    const normalCompleted = applyLearningV2SessionChannelResult(
      createInitialLearningV2SessionChannels(),
      {
        channel: "normal",
        outcome: "completed",
        score: 30,
        containsVoiceActivity: false,
        repeatQualityBand: "with_errors",
        mistakePhraseIds: ["normal-mistake"],
      },
    ).state;
    const projected = applyLearningV2SessionChannelResult(normalCompleted, {
      channel: "hard",
      outcome: "completed",
      score: 150,
      containsVoiceActivity: false,
      repeatQualityBand: "perfect",
      mistakePhraseIds: ["hard-mistake"],
    });

    expect(projected.state.normal).toBe(normalCompleted.normal);
    expect(projected.state.hard).toEqual({
      completedRuns: 1,
      timedOutRuns: 0,
      bestScore: 150,
      currentStreak: 1,
      firstPerfectMedalEarned: true,
    });
    expect(projected.practiceCandidatePhraseIds).toEqual([]);
    expect(projected.normalLearningProgressChanged).toBe(false);
    expect(projected.repeatRewardRateBasisPoints).toBe(2_000);
  });

  it("ends a hard run on timeout without changing the normal result", () => {
    const normalCompleted = applyLearningV2SessionChannelResult(
      createInitialLearningV2SessionChannels(),
      {
        channel: "normal",
        outcome: "completed",
        score: 28,
        containsVoiceActivity: false,
        repeatQualityBand: "good",
        mistakePhraseIds: [],
      },
    ).state;
    const projected = applyLearningV2SessionChannelResult(normalCompleted, {
      channel: "hard",
      outcome: "timed_out",
      score: 44,
      containsVoiceActivity: false,
      repeatQualityBand: "with_errors",
      mistakePhraseIds: ["hard-timeout-mistake"],
    });

    expect(projected.state.normal).toBe(normalCompleted.normal);
    expect(projected.state.hard).toEqual({
      completedRuns: 0,
      timedOutRuns: 1,
      bestScore: 44,
      currentStreak: 0,
      firstPerfectMedalEarned: false,
    });
    expect(projected.hardSessionEndedByTimeout).toBe(true);
    expect(projected.practiceCandidatePhraseIds).toEqual([]);
  });

  it("rejects voice activities and timed-out normal runs", () => {
    const normalCompleted = applyLearningV2SessionChannelResult(
      createInitialLearningV2SessionChannels(),
      {
        channel: "normal",
        outcome: "completed",
        score: 25,
        containsVoiceActivity: false,
        repeatQualityBand: "good",
        mistakePhraseIds: [],
      },
    ).state;

    expect(() =>
      applyLearningV2SessionChannelResult(normalCompleted, {
        channel: "hard",
        outcome: "completed",
        score: 90,
        containsVoiceActivity: true,
        repeatQualityBand: "good",
        mistakePhraseIds: [],
      }),
    ).toThrow("hard_mode_voice_forbidden");
    expect(() =>
      applyLearningV2SessionChannelResult(normalCompleted, {
        channel: "normal",
        outcome: "timed_out",
        score: 0,
        containsVoiceActivity: false,
        repeatQualityBand: "skipped",
        mistakePhraseIds: [],
      }),
    ).toThrow("normal_mode_timeout_invalid");
  });
});
