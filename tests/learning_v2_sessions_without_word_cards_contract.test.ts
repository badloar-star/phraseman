// зачем (координатор 15.10 ночь, перед подъёмом потолка до 56): в новых текстах Codex у занятий s16–s56 урока 1 нет
// ни одной карточки слова (release learner.json: isWordCard=false везде). Пока Codex не ответил, задумано ли так,
// требование одно: занятие без карточек проходится от начала до итога — без пустого экрана карточки и без тупика.
// Доказательство по трём звеньям:
//  1) поток карточек (app/learning_v2_interleaved_new_word_flow_v1.ts): пустой список → состояние «ready», без показа;
//  2) плеер (app/learning_v2_direct_session_player_v1.tsx): оверлей карточки рисуется ТОЛЬКО при текущей карточке,
//     практика включается, когда поток не «presenting», кнопка «карман слов» неактивна при нуле слов;
//  3) реальный материал каждого s16–s56 собирается, очереди карточек пусты, а все задания — тех же семейств, что
//     плеер уже проходит в выпущенных s01–s15 (новое семейство без проверки = возможный тупик).
jest.mock("@react-native-firebase/app", () => ({ getApp: jest.fn(() => ({})) }));
jest.mock("@react-native-firebase/functions", () => ({ getFunctions: jest.fn(() => ({})), httpsCallable: jest.fn() }));
jest.mock("../app/cloud_sync", () => ({ ensureAnonUser: jest.fn(async () => "stable-1") }));
jest.mock("../app/stable_id", () => ({ peekStableId: jest.fn(() => "stable-1") }));
jest.mock("../app/learning_v2_course_session_audio_preload_v1", () => ({
  preloadLearningV2CourseSessionAudioV1: jest.fn(),
  isLearningV2CourseSessionAudioPreloadHandleV1: jest.fn(() => true),
  getLearningV2CourseSessionAudioPreloadSummaryV1: jest.fn(),
}));

/* eslint-disable import/first -- native/transport seams are mocked first */
import fs from "node:fs";
import path from "node:path";
import {
  createLearningV2InterleavedNewWordFlowV1,
  reduceLearningV2InterleavedNewWordFlowV1,
} from "../app/learning_v2_interleaved_new_word_flow_v1";
import { bundledLearningV2CourseSessionMaterialV3 } from "../app/learning_v2_course_released_session_client_v3";
/* eslint-enable import/first */

const material = (sessionOrdinal: number) => bundledLearningV2CourseSessionMaterialV3({
  environment: "production",
  targetLanguage: "en",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "learning-v2",
  lessonOrdinal: 1,
  sessionOrdinal,
  activeRootFingerprint: "0".repeat(64),
} as never);

const familyOf = (interaction: { modePayload?: unknown }) =>
  String((interaction.modePayload as { family?: string } | null)?.family ?? "none");

describe("Learning V2: a session with zero word cards plays through cleanly", () => {
  test("the word-card flow stays ready (no card screen) when the practice has no encounters", () => {
    const transition = reduceLearningV2InterleavedNewWordFlowV1(createLearningV2InterleavedNewWordFlowV1(), {
      kind: "practice_reached",
      encounterId: null,
      encounterIds: [],
    });
    expect(transition.state.kind).toBe("ready");
    expect(transition.effects).toEqual([]);
  });

  test("the player draws the card overlay only for a current card and never blocks practice without one", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "app", "learning_v2_direct_session_player_v1.tsx"), "utf8")
      .replace(/\r\n/g, "\n");
    expect(source).toMatch(/\{currentNewWordEncounter && newWordFlow\.kind === "presenting" \? \(\s*<LearningV2NewWordEncounterOverlay/u);
    expect(source).toMatch(/const practiceActivated = introDone && newWordFlow\.kind !== "presenting";/u);
    expect(source).toMatch(/disabled=\{unlockedWords\.length === 0\}/u);
  });

  test("every lesson 1 session s16–s56 builds and uses only families the player already plays (cards optional)", () => {
    const silence = jest.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const playedFamilies = new Set<string>();
      for (let sessionOrdinal = 1; sessionOrdinal <= 15; sessionOrdinal += 1) {
        material(sessionOrdinal)?.learnerChild.interactions.forEach((interaction) => playedFamilies.add(familyOf(interaction)));
      }
      const problems: string[] = [];
      for (let sessionOrdinal = 16; sessionOrdinal <= 56; sessionOrdinal += 1) {
        const where = `s${String(sessionOrdinal).padStart(2, "0")}`;
        const built = material(sessionOrdinal);
        if (!built) { problems.push(`${where}: материал не собирается`); continue; }
        const interactions = built.learnerChild.interactions;
        if (interactions.length === 0) problems.push(`${where}: нет заданий`);
        // зачем (17.10): после переписывания Codex у s16+ появились карточки слов — их число больше не проверяется,
        // проверка «0 карточек проходится чисто» — в первых двух тестах файла.
        for (const interaction of interactions) {
          const family = familyOf(interaction);
          if (!playedFamilies.has(family)) problems.push(`${where}: семейство «${family}» не встречалось в s01–s15`);
        }
      }
      expect(problems).toEqual([]);
    } finally {
      silence.mockRestore();
    }
  });
});
