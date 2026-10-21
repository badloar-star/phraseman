// зачем (№25, решение владельца 21.10; отзыв тестера «сердечки тратятся на голосовых из-за плохого распознавания»):
// ошибка голосового задания Learning V2 не снимает сердечко; после 2 неудач — «Пропустить» без штрафа
// (тот же путь, что пропуск на устройстве без распознавания: disposition skipped, в звёзды не идёт).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createSessionAttemptsState, reduceSessionAttempts } from "../app/session_attempts/session_attempts_domain";

const player = readFileSync(join(__dirname, "..", "app", "learning_v2_direct_session_player_v1.tsx"), "utf8");

describe("Learning V2 voice tasks never spend hearts (№25)", () => {
  test("the wrong-answer branch registers technical_error for voice practice", () => {
    expect(player).toContain('verdict: voicePractice ? "technical_error" : "pedagogical_wrong"');
    expect(player).toContain("const voicePractice = learningV2ShowsVoiceFooterV1(practice);");
    expect(player).toContain("[V2-VOICE-NO-HEART] voice_wrong_no_heart");
  });

  test("skip appears after two voice failures and reuses the no-penalty skip path", () => {
    expect(player).toContain("export const LEARNING_V2_VOICE_SKIP_AFTER_FAILURES = 2;");
    expect(player).toMatch(/\(speechNa \|\| voiceFailuresHere >= LEARNING_V2_VOICE_SKIP_AFTER_FAILURES\)/u);
    expect(player).toContain("onPress={voiceSkipOnDevice ? skipVoicePracticeOnDevice : advance}");
    expect(player).toMatch(/voiceSkipOnDevice\s*\?\s*copy\.skip/u);
    // пропуск исключается из звёзд тем же набором, что и пропуск на устройстве
    expect(player).toContain("deviceSkippedVoiceIdsRef.current.add(practice.interactionId);");
  });

  test("technical_error keeps all hearts in the attempts domain", () => {
    const initial = createSessionAttemptsState({ sessionId: "learning-v2:test", questionId: "q1" });
    const next = reduceSessionAttempts(initial, {
      type: "verdict",
      answerAttemptId: "a1",
      verdict: "technical_error",
    });
    expect(next.state.remainingAttempts).toBe(initial.remainingAttempts);
  });
});
