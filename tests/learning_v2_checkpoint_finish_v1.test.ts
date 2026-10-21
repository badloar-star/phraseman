// зачем (№46, прод 2.0.0, решение владельца 21.10): «Проверка главы» и итоговый экзамен урока падали в finish()
// с learning_v2_direct_session_incomplete — экран входа вёл сразу в практику, отметки трёх интро не создавались.
// Сторож держит три вещи: (1) вход в проверку больше не пропускает вступление; (2) недостающие ТОЛЬКО интро
// досоздаются как skipped и занятие засчитывается; (3) недостающее задание практики по-прежнему не засчитывается.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveLearningV2FinishCompletionsV1 } from "../app/learning_v2_finish_completions_v1";
import type { LearningV2CourseSessionInteractionCompletionV1 } from "../modules/learning-v2/runtime/course_session_device_run_v1";

const done = (interactionId: string): LearningV2CourseSessionInteractionCompletionV1 => ({
  interactionId,
  disposition: "completed",
  learnerAttempts: 1,
  hintUsed: false,
});

const intro = ["l01:s08:intro:1:q", "l01:s08:intro:2:q", "l01:s08:intro:3:q"];
const practice = Array.from({ length: 17 }, (_, index) => `l01:s08:i${String(index + 1).padStart(2, "0")}`);

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe("Learning V2 checkpoint / final exam finish (№46)", () => {
  test.each([
    ["chapter_checkpoint", 8],
    ["final_exam", 56],
  ] as const)("%s completes after the intro pages were answered", (role, session) => {
    const completions = new Map([...intro, ...practice].map((id) => [id, done(id)] as const));
    const result = resolveLearningV2FinishCompletionsV1({
      introInteractionIds: intro,
      practiceInteractionIds: practice,
      completions,
      context: { lesson: 1, session, role },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.repairedIntroIds).toEqual([]);
    expect(result.interactionCompletions.map((entry) => entry.interactionId)).toEqual([...intro, ...practice]);
  });

  test.each(["chapter_checkpoint", "final_exam"] as const)(
    "%s with all practice done but no intro marks is still counted (intro repaired as skipped)",
    (role) => {
      const completions = new Map(practice.map((id) => [id, done(id)] as const));
      const result = resolveLearningV2FinishCompletionsV1({
        introInteractionIds: intro,
        practiceInteractionIds: practice,
        completions,
        context: { lesson: 1, session: role === "final_exam" ? 56 : 8, role },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.repairedIntroIds).toEqual(intro);
      expect(result.interactionCompletions.slice(0, 3)).toEqual(
        intro.map((interactionId) => ({ interactionId, disposition: "skipped", learnerAttempts: 0, hintUsed: false })),
      );
      expect(console.warn).toHaveBeenCalledWith("[V2-FINISH] intro_repaired_as_skipped", expect.any(String));
    },
  );

  test("a missing practice task is never counted", () => {
    const completions = new Map([...intro, ...practice.slice(0, -1)].map((id) => [id, done(id)] as const));
    const result = resolveLearningV2FinishCompletionsV1({
      introInteractionIds: intro,
      practiceInteractionIds: practice,
      completions,
      context: { lesson: 1, session: 8, role: "chapter_checkpoint" },
    });
    expect(result).toEqual({ ok: false, missingIntroIds: [], missingPracticeIds: [practice[16]] });
    expect(console.warn).toHaveBeenCalledWith("[V2-FINISH] incomplete_practice", expect.any(String));
  });

  test("the checkpoint entry button leads into the intro pages, not straight into practice", () => {
    const player = readFileSync(join(__dirname, "..", "app", "learning_v2_direct_session_player_v1.tsx"), "utf8");
    const entryStart = player.indexOf("if (isCheckpoint && !checkpointEntryDone) {");
    const introStart = player.indexOf("if (!introDone) {");
    expect(entryStart).toBeGreaterThan(0);
    expect(introStart).toBeGreaterThan(entryStart);
    const entryBlock = player.slice(entryStart, introStart);
    expect(entryBlock).toContain("setCheckpointEntryDone(true)");
    expect(entryBlock).toContain("[V2-CHECKPOINT] entry_start");
    expect(entryBlock).not.toMatch(/setIntroDone\(true\)/u);
    expect(player).toContain("resolveLearningV2FinishCompletionsV1(");
  });
});
