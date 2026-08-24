import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("Learning V2 new-word encounter player wiring", () => {
  const player = read("app/learning_v2_direct_session_player_v1.tsx");

  test("starts the blocking encounter queue after intro and renders the real overlay", () => {
    expect(player).toContain("getLearningV2CourseSessionNewWordEncountersV1");
    expect(player).toContain(
      'dispatchNewWordEvent({ kind: "intro_completed" })',
    );
    expect(player).toContain("<LearningV2NewWordEncounterOverlay");
    expect(player).toContain('dispatchNewWordEvent({ kind: "continue" })');
  });

  test("keeps the underlying task and microphone inert until the queue is complete", () => {
    expect(player).toContain(
      'const practiceActivated = introDone && newWordFlow.kind === "completed"',
    );
    expect(player).toMatch(/enabled:\s*practiceActivated\s*&&/u);
    expect(player).toContain(
      'pointerEvents={practiceActivated ? "auto" : "none"}',
    );
    expect(player).toContain(
      'practiceActivated ? "auto" : "no-hide-descendants"',
    );
  });

  test("uses the word interaction audio and the shared cards store", () => {
    expect(player).toContain("resolveLearningV2CourseSessionFullPhraseAudioV1");
    expect(player).toContain("isLearningV2NewWordEncounterSavedV1");
    expect(player).toContain("saveLearningV2NewWordEncounterToCardsV1");
    expect(player).toContain("removeLearningV2NewWordEncounterFromCardsV1");
  });
});
