// зачем (решение владельца 21.10 ~22:45; находка «Сверки»: 6 голосовых заданий подряд в L01 s08 без пропуска):
// «Не могу говорить» включает на 15 минут пропуск голосовых заданий (без потери сердец, в звёзды не идут),
// кнопка есть на каждом голосовом задании и в шторке «голосовые впереди», отказ в микрофоне включает режим сам.
const store = new Map<string, string>();
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => void store.set(key, value)),
  },
}));

/* eslint-disable import/first -- AsyncStorage mocked first */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_V2_CANT_SPEAK_WINDOW_MS,
  __resetLearningV2CantSpeakForTests,
  activateLearningV2CantSpeakV1,
  hydrateLearningV2CantSpeakV1,
  isLearningV2CantSpeakActiveV1,
} from "../app/learning_v2_cant_speak_v1";
/* eslint-enable import/first */

const player = readFileSync(join(__dirname, "..", "app", "learning_v2_direct_session_player_v1.tsx"), "utf8");
const sheet = readFileSync(join(__dirname, "..", "components", "learning-v2", "LearningV2VoiceHeadsupSheet.tsx"), "utf8");

beforeEach(() => {
  store.clear();
  __resetLearningV2CantSpeakForTests();
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe("Learning V2 «can't speak now» (owner 21.10)", () => {
  test("activation lasts exactly 15 minutes", () => {
    const now = 1_000_000;
    expect(LEARNING_V2_CANT_SPEAK_WINDOW_MS).toBe(15 * 60 * 1000);
    activateLearningV2CantSpeakV1("button", now);
    expect(isLearningV2CantSpeakActiveV1(now + LEARNING_V2_CANT_SPEAK_WINDOW_MS - 1)).toBe(true);
    expect(isLearningV2CantSpeakActiveV1(now + LEARNING_V2_CANT_SPEAK_WINDOW_MS)).toBe(false);
  });

  test("survives an app restart inside the window", async () => {
    const now = Date.now();
    activateLearningV2CantSpeakV1("permission_denied", now);
    await Promise.resolve();
    __resetLearningV2CantSpeakForTests();
    expect(isLearningV2CantSpeakActiveV1(now + 1000)).toBe(false);
    await hydrateLearningV2CantSpeakV1(now + 1000);
    expect(isLearningV2CantSpeakActiveV1(now + 1000)).toBe(true);
  });

  test("the player wires the button, the mic-denial path, the auto-skip and the headsup sheet", () => {
    expect(player).toContain('testID="learning-v2-cant-speak"');
    expect(player).toContain('onPress={() => activateCantSpeak("button")}');
    expect(player).toContain('if (nextStatus === "permission_denied") activateCantSpeak("permission_denied");');
    expect(player).toContain('skipVoiceCantSpeak("timer");');
    expect(player).toContain('activateLearningV2CantSpeakV1("headsup_button")');
    expect(player).toContain("[V2-VOICE-SKIP] skipped");
    // пропуск без сердец и вне звёзд — тот же набор, что пропуск на устройстве
    expect(player).toContain("learningV2DeviceSkippedVoiceCompletionV1(practice.interactionId)");
    expect(sheet).toContain('testID="learning-v2-voice-headsup-cant-speak"');
    expect(sheet).toContain("onCantSpeak?: () => void;");
  });
});
