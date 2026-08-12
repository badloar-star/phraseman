import {
  repeatRewardRateBasisPoints,
  type LearningV2RepeatQualityBand,
} from "./course_economy";

export interface LearningV2NormalSessionChannel {
  readonly completedRuns: number;
  readonly bestScore: number;
}

export interface LearningV2HardSessionChannel {
  readonly completedRuns: number;
  readonly timedOutRuns: number;
  readonly bestScore: number;
  readonly currentStreak: number;
  readonly firstPerfectMedalEarned: boolean;
}

export interface LearningV2SessionChannels {
  readonly schemaVersion: "learning-v2-session-channels.v1";
  readonly normal: LearningV2NormalSessionChannel;
  readonly hard: LearningV2HardSessionChannel;
}

export interface LearningV2SessionChannelResultInput {
  readonly channel: "normal" | "hard";
  readonly outcome: "completed" | "timed_out";
  /** Versioned timer/scoring policy owns the score formula. */
  readonly score: number;
  readonly containsVoiceActivity: boolean;
  readonly repeatQualityBand: LearningV2RepeatQualityBand;
  readonly mistakePhraseIds: readonly string[];
}

export interface LearningV2SessionChannelProjection {
  readonly state: LearningV2SessionChannels;
  readonly practiceCandidatePhraseIds: readonly string[];
  readonly normalLearningProgressChanged: boolean;
  readonly hardSessionEndedByTimeout: boolean;
  readonly repeatRewardRateBasisPoints: 0 | 500 | 1_200 | 2_000 | null;
}

const phraseIdPattern = /^[A-Za-z0-9._:-]{1,160}$/;

const freezeNormal = (
  channel: LearningV2NormalSessionChannel,
): LearningV2NormalSessionChannel => Object.freeze(channel);

const freezeHard = (
  channel: LearningV2HardSessionChannel,
): LearningV2HardSessionChannel => Object.freeze(channel);

const freezeState = (
  state: LearningV2SessionChannels,
): LearningV2SessionChannels => Object.freeze(state);

export const createInitialLearningV2SessionChannels =
  (): LearningV2SessionChannels =>
    freezeState({
      schemaVersion: "learning-v2-session-channels.v1",
      normal: freezeNormal({ completedRuns: 0, bestScore: 0 }),
      hard: freezeHard({
        completedRuns: 0,
        timedOutRuns: 0,
        bestScore: 0,
        currentStreak: 0,
        firstPerfectMedalEarned: false,
      }),
    });

const isBoundedCounter = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 0;

const assertState = (state: LearningV2SessionChannels): void => {
  if (
    state.schemaVersion !== "learning-v2-session-channels.v1" ||
    !isBoundedCounter(state.normal.completedRuns) ||
    !isBoundedCounter(state.normal.bestScore) ||
    !isBoundedCounter(state.hard.completedRuns) ||
    !isBoundedCounter(state.hard.timedOutRuns) ||
    !isBoundedCounter(state.hard.bestScore) ||
    !isBoundedCounter(state.hard.currentStreak) ||
    typeof state.hard.firstPerfectMedalEarned !== "boolean"
  ) {
    throw new Error("session_channels_state_invalid");
  }
};

const assertInput = (input: LearningV2SessionChannelResultInput): void => {
  if (
    (input.channel !== "normal" && input.channel !== "hard") ||
    (input.outcome !== "completed" && input.outcome !== "timed_out") ||
    !isBoundedCounter(input.score) ||
    typeof input.containsVoiceActivity !== "boolean" ||
    !Array.isArray(input.mistakePhraseIds) ||
    input.mistakePhraseIds.length > 12 ||
    input.mistakePhraseIds.some(
      (phraseId) => typeof phraseId !== "string" || !phraseIdPattern.test(phraseId),
    ) ||
    new Set(input.mistakePhraseIds).size !== input.mistakePhraseIds.length
  ) {
    throw new Error("session_channel_result_invalid");
  }
  repeatRewardRateBasisPoints(input.repeatQualityBand);
};

export const applyLearningV2SessionChannelResult = (
  state: LearningV2SessionChannels,
  input: LearningV2SessionChannelResultInput,
): LearningV2SessionChannelProjection => {
  assertState(state);
  assertInput(input);

  if (input.channel === "normal") {
    if (input.outcome === "timed_out") {
      throw new Error("normal_mode_timeout_invalid");
    }
    const normal = freezeNormal({
      completedRuns: state.normal.completedRuns + 1,
      bestScore: Math.max(state.normal.bestScore, input.score),
    });
    return Object.freeze({
      state: freezeState({ ...state, normal }),
      practiceCandidatePhraseIds: Object.freeze([...input.mistakePhraseIds]),
      normalLearningProgressChanged: true,
      hardSessionEndedByTimeout: false,
      repeatRewardRateBasisPoints: null,
    });
  }

  if (state.normal.completedRuns < 1) {
    throw new Error("hard_mode_locked");
  }
  if (input.containsVoiceActivity) {
    throw new Error("hard_mode_voice_forbidden");
  }

  const completed = input.outcome === "completed";
  const hard = freezeHard({
    completedRuns: state.hard.completedRuns + (completed ? 1 : 0),
    timedOutRuns: state.hard.timedOutRuns + (completed ? 0 : 1),
    bestScore: Math.max(state.hard.bestScore, input.score),
    currentStreak: completed ? state.hard.currentStreak + 1 : 0,
    firstPerfectMedalEarned:
      state.hard.firstPerfectMedalEarned ||
      (completed && input.repeatQualityBand === "perfect"),
  });
  return Object.freeze({
    state: freezeState({ ...state, hard }),
    practiceCandidatePhraseIds: Object.freeze([]),
    normalLearningProgressChanged: false,
    hardSessionEndedByTimeout: !completed,
    repeatRewardRateBasisPoints: repeatRewardRateBasisPoints(
      input.repeatQualityBand,
    ),
  });
};
