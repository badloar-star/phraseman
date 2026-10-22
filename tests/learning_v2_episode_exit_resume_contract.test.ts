// зачем (№22б; владелец 22.10 через координатора: «УБРАТЬ ОКНО СОВСЕМ»): сторож проводки в плеере — выход на всех путях (крестик,
// вступление, Android «назад», жест) сразу, без окна, но перед выходом эпизод сохраняется и потом продолжается с места; продолжение
// не тратит энергию; финал и «начать заново» стирают сохранение. Багрепорт тестера 21.10 «выйти без предупреждения» снят решением
// владельца 22.10: предупреждать не о чем — прогресс не теряется.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const player = readFileSync(join(__dirname, "..", "app", "learning_v2_direct_session_player_v1.tsx"), "utf8");
const strings = readFileSync(join(__dirname, "..", "components", "lesson_exit", "lesson_exit_strings.ts"), "utf8");

describe("Learning V2 episode exit and resume (№22б)", () => {
  test("every user exit goes through requestEpisodeExit with a [LESSON-EXIT] trail", () => {
    expect(player).toContain('onPress={() => requestEpisodeExit("close_button")}');
    expect(player).toContain('onBack={() => requestEpisodeExit("intro_back")}');
    expect(player).toContain('requestEpisodeExit("hardware_back")');
    expect(player).toContain('requestEpisodeExit("gesture_back")');
    expect(player).toContain('BackHandler.addEventListener("hardwareBackPress"');
    expect(player).toContain('navigation.addListener("beforeRemove"');
    for (const tag of ["[LESSON-EXIT] v2_episode", "[V2-EXIT] before_remove_allowed"]) {
      expect(player).toContain(tag);
    }
  });

  test("exit is immediate — no exit sheet — and the fresh snapshot is saved before leaving", () => {
    expect(player).not.toContain("LessonExitSheet");
    expect(player).not.toContain("setExitSheetOpen");
    const at = player.indexOf("const requestEpisodeExit = useCallback((source: string) => {");
    expect(at).toBeGreaterThan(-1);
    const body = player.slice(at, player.indexOf("}, [exitLearningV2Session,", at));
    expect(body).toContain("const snapshot = hasProgress ? snapshotResume() : null;");
    expect(body.indexOf("saveLearningV2EpisodeResumeV1(resumeOwner, snapshot)")).toBeGreaterThan(-1);
    expect(body.indexOf("saveLearningV2EpisodeResumeV1(resumeOwner, snapshot)")).toBeLessThan(body.indexOf("exitLearningV2Session();"));
  });

  test("the episode is saved, offered back and cleared at the right moments", () => {
    expect(player).toContain("saveLearningV2EpisodeResumeV1(resumeOwner, snapshot)");
    expect(player).toContain("loadLearningV2EpisodeResumeV1({ owner: resumeOwner");
    expect(player).toContain('void clearResumeRef.current("finished");');
    expect(player).toContain('void clearResumeRef.current("restart_run");');
    expect(player).toContain('void clearResumeRef.current("start_over");');
    expect(player).toContain("[V2-RESUME] continue");
    expect(player).toContain("offerInMemoryResumeRef.current()");
  });

  test("continuing the same attempt does not signal the energy gate", () => {
    expect(player).toContain("{resumedWithoutChargeRef.current ? null : <LearningV2FirstQuestionShownReporter />}");
    expect(player).toContain("resumedWithoutChargeRef.current = true;");
  });

  test("the resume card wording exists in all 9 languages; the removed exit sheet texts are gone", () => {
    const line = strings.split("\n").find((row) => row.trim().startsWith("resumeFrom:")) ?? "";
    expect(line.match(/'[^']+'/gu)?.length).toBe(9);
    for (const removed of ["titleEpisode", "bodyEpisode", "Попытка не сохранится"]) expect(strings).not.toContain(removed);
  });
});
