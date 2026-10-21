// зачем (№22, решение владельца 21.10): эпизод запоминается на телефоне и восстанавливается только «свой»:
// тот же аккаунт и эпизод, тот же выпуск (отпечаток набора детей), не старше срока и с прогрессом.
const store = new Map<string, string>();
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    removeItem: jest.fn(async (key: string) => void store.delete(key)),
  },
}));

/* eslint-disable import/first -- AsyncStorage mocked first */
import {
  LEARNING_V2_EPISODE_RESUME_SCHEMA_V1,
  LEARNING_V2_EPISODE_RESUME_TTL_MS,
  clearLearningV2EpisodeResumeV1,
  learningV2EpisodeResumeKeyV1,
  loadLearningV2EpisodeResumeV1,
  saveLearningV2EpisodeResumeV1,
  type LearningV2EpisodeResumeRecordV1,
} from "../app/learning_v2_episode_resume_v1";
/* eslint-enable import/first */

const record = (over: Partial<LearningV2EpisodeResumeRecordV1> = {}): LearningV2EpisodeResumeRecordV1 => ({
  schemaVersion: LEARNING_V2_EPISODE_RESUME_SCHEMA_V1,
  courseSessionId: "lesson-01:session:05",
  childSetFingerprint: "f".repeat(64),
  savedAtMs: 1_000_000,
  introDone: true,
  practiceIndex: 6,
  practiceTotal: 17,
  sessionRunes: 9,
  completions: [{ interactionId: "i01", disposition: "completed", learnerAttempts: 1, hintUsed: false }],
  answeredUi: [["i01", { selectedChoiceId: "r1", orderedIds: [], transcript: "" }]],
  deviceSkippedVoiceIds: [],
  ...over,
});

beforeEach(() => {
  store.clear();
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

const load = (over: Partial<Parameters<typeof loadLearningV2EpisodeResumeV1>[0]> = {}) =>
  loadLearningV2EpisodeResumeV1({
    owner: "stable-1",
    courseSessionId: "lesson-01:session:05",
    childSetFingerprint: "f".repeat(64),
    nowMs: 1_000_000 + 60_000,
    ...over,
  });

describe("Learning V2 episode resume store (№22)", () => {
  test("round-trips the saved episode for the same account, episode and release", async () => {
    await saveLearningV2EpisodeResumeV1("stable-1", record());
    await expect(load()).resolves.toEqual(record());
  });

  test("is isolated per account", async () => {
    await saveLearningV2EpisodeResumeV1("stable-1", record());
    await expect(load({ owner: "stable-2" })).resolves.toBeNull();
  });

  test.each([
    ["release changed", { childSetFingerprint: "e".repeat(64) }],
    ["expired", { nowMs: 1_000_000 + LEARNING_V2_EPISODE_RESUME_TTL_MS + 1 }],
  ])("rejects and clears when %s", async (_label, over) => {
    await saveLearningV2EpisodeResumeV1("stable-1", record());
    await expect(load(over)).resolves.toBeNull();
    expect(store.has(learningV2EpisodeResumeKeyV1("stable-1", "lesson-01:session:05"))).toBe(false);
  });

  test("rejects a record without progress and corrupt json", async () => {
    await saveLearningV2EpisodeResumeV1("stable-1", record({ completions: [] }));
    await expect(load()).resolves.toBeNull();
    store.set(learningV2EpisodeResumeKeyV1("stable-1", "lesson-01:session:05"), "{not json");
    await expect(load()).resolves.toBeNull();
  });

  test("clear removes the saved episode", async () => {
    await saveLearningV2EpisodeResumeV1("stable-1", record());
    await clearLearningV2EpisodeResumeV1({ owner: "stable-1", courseSessionId: "lesson-01:session:05", reason: "finished" });
    await expect(load()).resolves.toBeNull();
  });
});
