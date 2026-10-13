// D150: эталон урока 1 — встроенный релиз. Сторож фиксирует факт расхождения
// авторского урока 1 и то, что функция сравнения видит именно его признаки.
import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import {
  lesson1ReleaseParityMismatchesV1,
  releasedLesson1SessionSignatureV1,
} from "../modules/learning-v2/content/lesson1_release_parity_v1";

describe("lesson 1 release parity (D150)", () => {
  test("reads the bundled release signature of lesson 1 session 1", () => {
    expect(releasedLesson1SessionSignatureV1(1)).toEqual({
      sessionOrdinal: 1,
      newWords: ["fine", "happy", "here", "ready"],
      // Four bundled scripted-repeat interactions select the voice-heavy profile.
      interactionProfile: "voice_heavy",
    });
  });

  test("reports the authored lesson 1 divergence that blocks an English authored publish", () => {
    const mismatches = lesson1ReleaseParityMismatchesV1(AUTHORED_EPISODE_01_SESSIONS);
    // зачем: пока авторский урок 1 не приведён к релизу, расхождения обязаны
    // находиться — иначе сторож публикации молча пропустил бы подмену урока.
    expect(mismatches.length).toBeGreaterThan(0);
    expect(mismatches).toContainEqual({
      sessionOrdinal: 1,
      field: "newWords",
      release: "fine,happy,here,ready",
      authored: "am,here,i,ready",
    });
  });
});
