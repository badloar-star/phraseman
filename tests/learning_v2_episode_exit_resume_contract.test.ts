// зачем (№22б + багрепорт тестера 21.10 17:27 «из урока можно выйти без предупреждения»): сторож проводки в плеере —
// выход через подтверждение на всех путях (крестик, вступление, Android «назад», жест), эпизод сохраняется и
// продолжается с места, продолжение не тратит энергию, финал и «начать заново» стирают сохранение.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const player = readFileSync(join(__dirname, "..", "app", "learning_v2_direct_session_player_v1.tsx"), "utf8");
const strings = readFileSync(join(__dirname, "..", "components", "lesson_exit", "lesson_exit_strings.ts"), "utf8");

describe("Learning V2 episode exit confirmation and resume (№22б)", () => {
  test("every user exit goes through requestEpisodeExit with a [V2-EXIT] trail", () => {
    expect(player).toContain('onPress={() => requestEpisodeExit("close_button")}');
    expect(player).toContain('onBack={() => requestEpisodeExit("intro_back")}');
    expect(player).toContain('requestEpisodeExit("hardware_back")');
    expect(player).toContain('requestEpisodeExit("gesture_back")');
    expect(player).toContain('BackHandler.addEventListener("hardwareBackPress"');
    expect(player).toContain('navigation.addListener("beforeRemove"');
    for (const tag of ["[V2-EXIT] request", "[V2-EXIT] leave", "[V2-EXIT] stay", "[V2-EXIT] before_remove_allowed"]) {
      expect(player).toContain(tag);
    }
    expect(player).toContain('variant="episode"');
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

  test("the exit sheet has the episode wording in all 9 languages", () => {
    for (const key of ["titleEpisode", "bodyEpisode", "stay"]) {
      const line = strings.split("\n").find((row) => row.trim().startsWith(`${key}:`)) ?? "";
      expect(line.match(/'[^']+'/gu)?.length).toBe(9);
    }
    expect(strings).toContain("Прогресс сохранится — продолжишь с этого места.");
  });
});
