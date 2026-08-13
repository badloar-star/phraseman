import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (relative: string) =>
  readFileSync(join(__dirname, "..", relative), "utf8");

describe("Learning V2 activity action session mobile mount", () => {
  it("uses the existing account-scoped card queue and revokes actions on account change", () => {
    const hook = source("app/use_learning_v2_activity_action_session_v1.ts");
    expect(hook).toContain("updateCustomCards((cards) =>");
    expect(hook).toContain("withAccountTransitionLock(async () =>");
    expect(hook).toContain("isCurrentAccountGeneration(generation)");
    expect(hook).toContain("subscribeAccountGeneration(() =>");
    expect(hook).toContain("void actionSession.dispose()");
    expect(hook).toContain("recording.cancel()");
    expect(hook).not.toMatch(/fetch\(|httpsCallable|firebase/u);
  });

  it("mounts only for the exact released task and exposes bounded compact controls", () => {
    const session = source("app/learning-v2/session/[id].tsx");
    expect(session).toContain("useLearningV2ActivityActionSessionV1({");
    expect(session).toContain("releasedPackageTask?.taskId ?? card?.cardId");
    expect(session).toContain(
      "releasedPackageTask?.activityId ?? card?.activityId",
    );
    expect(session).toContain("resolveWrongFeedback(errorOrdinal)");
    expect(session).toContain('result === "wrong" && wrongExplanation');
    const chooseBody = session.slice(
      session.indexOf("const choose = (answer: string) =>"),
      session.indexOf("const chooseTile ="),
    );
    expect(chooseBody).not.toMatch(/fetch\(|httpsCallable|firebase|await/u);
    expect(session).toContain("<ReportErrorButton");
    expect(session).toContain("saveReleasedPhrase()");
    expect(session).toContain('controlReleasedVoice("start", "hold")');
    expect(session).toContain('controlReleasedVoice("stop", "hold")');
  });
});
