import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("Learning V2 new-word encounter player wiring", () => {
  const player = read("app/learning_v2_direct_session_player_v1.tsx");

  // зачем (05.10): блокирующая очередь ВСЕХ новых слов сразу после интро (событие intro_completed) заменена
  // перемежающимся потоком (createLearningV2InterleavedNewWordFlowV1, с 50eea79a4): карточка слова встаёт в момент
  // задания, где слово встречается (событие practice_reached). Правило сторожа то же: пока карточка показана,
  // задание под ней и микрофон неактивны.
  test("shows a new word right before the task that uses it and renders the real overlay", () => {
    expect(player).toContain("getLearningV2CourseSessionNewWordEncountersV1");
    expect(player).toContain("createLearningV2InterleavedNewWordFlowV1");
    expect(player).toMatch(/dispatchNewWordEvent\(\{\s*kind: "practice_reached"/u);
    expect(player).toContain("<LearningV2NewWordEncounterOverlay");
    expect(player).toContain('dispatchNewWordEvent({ kind: "continue" })');
  });

  test("keeps the underlying task and microphone inert while a word card is presenting", () => {
    expect(player).toContain(
      'const practiceActivated = introDone && newWordFlow.kind !== "presenting"',
    );
    expect(player).toMatch(/const voiceFooterDisabled =\s*!practiceActivated \|\|/u);
    expect(player).toMatch(
      /pointerEvents=\{\s*practiceActivated &&[^}]*\?\s*"auto"\s*:\s*"none"\s*\}/u,
    );
    expect(player).toMatch(
      /importantForAccessibility=\{\s*practiceActivated &&[^}]*\?\s*"auto"\s*:\s*"no-hide-descendants"\s*\}/u,
    );
  });

  test("speaks the word with the phone voice and uses the shared cards store", () => {
    // зачем (слово владельца 22.10, 72f72a94e): карточка слова звучит голосом телефона, записи mp3 не играются
    expect(player).toContain("`new-word:${encounterId}`");
    expect(player).not.toContain("resolveLearningV2CourseSessionFullPhraseAudioV1");
    expect(player).toContain("isLearningV2NewWordEncounterSavedV1");
    expect(player).toContain("saveLearningV2NewWordEncounterToCardsV1");
    expect(player).toContain("removeLearningV2NewWordEncounterFromCardsV1");
  });
});
