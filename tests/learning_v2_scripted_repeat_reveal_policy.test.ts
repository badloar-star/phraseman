import fs from "node:fs";
import path from "node:path";

import {
  LEARNING_V2_SCRIPTED_REPEAT_AFTER_FIRST_ATTEMPT_REVEAL_POLICY_V1,
  learningV2ScriptedRepeatAnswerBearingContentRevealedV1,
  validateLearningV2ModeNativePayloadV1,
} from "../modules/learning-v2/contracts/mode_native_payload_v1";

const guidedPayload = () => ({
  family: "scripted_repeat_compare",
  referenceAudio: {
    audioTargetId: "repeat-reference",
    transcript: "I am smart.",
  },
  slowReferenceAudio: null,
  targetPhrase: "I am smart.",
  recordControlPolicy: "hold_press_release_with_accessible_toggle",
  modelPlayback: "reference_and_slow",
  learnerPlayback: "available_after_capture",
  honestOutcomeStates: [
    "PASS_CONFIDENT",
    "NEEDS_WORK_CONFIDENT",
    "UNCERTAIN",
    "INVALID_AUDIO_OR_SYSTEM",
  ],
});

describe("Learning V2 scripted repeat reveal policy v1", () => {
  it("keeps guided legacy visible but fails closed until a strict attempt is submitted", () => {
    expect(
      learningV2ScriptedRepeatAnswerBearingContentRevealedV1(undefined, false),
    ).toBe(true);
    expect(
      learningV2ScriptedRepeatAnswerBearingContentRevealedV1(
        LEARNING_V2_SCRIPTED_REPEAT_AFTER_FIRST_ATTEMPT_REVEAL_POLICY_V1,
        false,
      ),
    ).toBe(false);
    expect(
      learningV2ScriptedRepeatAnswerBearingContentRevealedV1(
        LEARNING_V2_SCRIPTED_REPEAT_AFTER_FIRST_ATTEMPT_REVEAL_POLICY_V1,
        true,
      ),
    ).toBe(true);
    expect(
      learningV2ScriptedRepeatAnswerBearingContentRevealedV1(
        { answerExposedBeforeAttempt: true },
        true,
      ),
    ).toBe(false);
  });

  it("keeps legacy guided payloads valid without changing their visible behavior", () => {
    expect(
      validateLearningV2ModeNativePayloadV1(
        guidedPayload(),
        "scripted_repeat_compare",
      ),
    ).not.toHaveProperty("scriptedRepeatRevealPolicy");
  });

  it("accepts the exact after-first-attempt evidence policy", () => {
    expect(
      validateLearningV2ModeNativePayloadV1(
        {
          ...guidedPayload(),
          scriptedRepeatRevealPolicy:
            LEARNING_V2_SCRIPTED_REPEAT_AFTER_FIRST_ATTEMPT_REVEAL_POLICY_V1,
        },
        "scripted_repeat_compare",
      ),
    ).toMatchObject({
      scriptedRepeatRevealPolicy:
        LEARNING_V2_SCRIPTED_REPEAT_AFTER_FIRST_ATTEMPT_REVEAL_POLICY_V1,
    });
  });

  it.each([
    { answerExposedBeforeAttempt: true },
    { referenceAudioAvailableBeforeAttempt: true },
    { modelPlaybackAvailableBeforeAttempt: true },
    { targetPhraseVisibleBeforeAttempt: true },
    { revealAfter: "before_attempt" },
  ])("rejects malformed or pre-attempt evidence %j", (override) => {
    expect(() =>
      validateLearningV2ModeNativePayloadV1(
        {
          ...guidedPayload(),
          scriptedRepeatRevealPolicy: {
            ...LEARNING_V2_SCRIPTED_REPEAT_AFTER_FIRST_ATTEMPT_REVEAL_POLICY_V1,
            ...override,
          },
        },
        "scripted_repeat_compare",
      ),
    ).toThrow("learning_v2_scripted_repeat_reveal_policy_invalid");
  });

  it("keeps the shared speaking panel's interim target matching out of the host accessibility tree until a scored attempt", () => {
    const player = fs.readFileSync(
      path.resolve(
        __dirname,
        "../app/learning_v2_direct_session_player_v1.tsx",
      ),
      "utf8",
    );

    // SpeakingPanel turns an interim transcript such as `I` against
    // `I am smart` into the visible/audible token row `I __ _____`. The host
    // must keep that complete inline surface unmounted from the accessibility
    // tree until onScore has accepted a nonempty transcript.
    expect(player).toMatch(
      /renderInlineSurface=\{\s*practiceAnswerBearingContentRevealed\s*&&\s*!voiceAttemptResult\s*\}/u,
    );
    expect(player).toContain("if (!practice || !runSummary || !heard.trim()) return;");
    expect(player).toContain("setVoiceAttemptSubmitted(true);");
  });
});
