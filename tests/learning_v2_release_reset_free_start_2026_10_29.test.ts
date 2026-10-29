// learning_v2_release_reset_free_start_2026_10_29.test.ts — [V2-RESUME-RESET]: старт без энергии после сброса «продолжить» новым выпуском.
// зачем (координатор 29.10): после пересборки курса «продолжить с N» сбрасывается (release_changed) — за повторный старт энергию не
// списываем, но один раз на занятие и выпуск: второй старт того же занятия в том же выпуске платный; отметку не прочитали или не
// записали — старт платный (дыру не открываем). Загрузка сообщает причину и старый отпечаток до удаления записи; плеер решает до
// показа первого задания — тогда сигнал «первое задание на экране» не уходит и гейт энергии не списывает.
const store = new Map<string, string>();
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    removeItem: jest.fn(async (key: string) => void store.delete(key)),
  },
}));
jest.mock("../app/account_owner_change", () => ({ onAccountOwnerChanged: () => undefined }));

/* eslint-disable import/first -- AsyncStorage mocked first */
import fs from "node:fs";
import path from "node:path";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  __resetLearningV2EpisodeResumeMemoryForTests,
  LEARNING_V2_EPISODE_RESUME_SCHEMA_V1,
  learningV2EpisodeResumeKeyV1,
  loadLearningV2EpisodeResumeV1,
  saveLearningV2EpisodeResumeV1,
  type LearningV2EpisodeResumeRecordV1,
} from "../app/learning_v2_episode_resume_v1";
import {
  claimLearningV2ReleaseResetFreeStartV1,
  learningV2ReleaseResetFreeStartKeyV1,
  learningV2ReleaseResetIsFreeV1,
} from "../app/learning_v2_release_reset_free_start_v1";
/* eslint-enable import/first */

const OLD = "a".repeat(64);
const NEW = "b".repeat(64);
const SESSION = "lesson-08:session:02";
const record = (): LearningV2EpisodeResumeRecordV1 => ({
  schemaVersion: LEARNING_V2_EPISODE_RESUME_SCHEMA_V1,
  courseSessionId: SESSION,
  childSetFingerprint: OLD,
  savedAtMs: 1_000_000,
  introDone: true,
  practiceIndex: 6,
  practiceTotal: 17,
  sessionRunes: 9,
  completions: [{ interactionId: "i01", disposition: "completed", learnerAttempts: 1, hintUsed: false }],
  answeredUi: [["i01", { selectedChoiceId: "r1", orderedIds: [], transcript: "" }]],
  deviceSkippedVoiceIds: [],
});
type Rejection = Readonly<{ reason: string; savedFingerprint: string | null; savedAtMs: number | null }>;
const load = (onRejected?: (rejection: Rejection) => void) =>
  loadLearningV2EpisodeResumeV1({ owner: "stable-1", courseSessionId: SESSION, childSetFingerprint: NEW, nowMs: 1_000_000 + 60_000, onRejected });
const claim = (over: Partial<Parameters<typeof claimLearningV2ReleaseResetFreeStartV1>[0]> = {}) =>
  claimLearningV2ReleaseResetFreeStartV1({ owner: "stable-1", courseSessionId: SESSION, targetLanguage: "en", newFingerprint: NEW, ...over });

beforeEach(() => {
  store.clear();
  __resetLearningV2EpisodeResumeMemoryForTests();
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe("[V2-RESUME-RESET] загрузка сообщает причину сброса до удаления записи", () => {
  test("новый выпуск: причина release_changed, отпечаток и время сохранения записи; запись удалена", async () => {
    await saveLearningV2EpisodeResumeV1("stable-1", record());
    const seen: Rejection[] = [];
    await expect(load((rejection) => seen.push(rejection))).resolves.toBeNull();
    expect(seen).toEqual([{ reason: "release_changed", savedFingerprint: OLD, savedAtMs: 1_000_000 }]);
    expect(store.has(learningV2EpisodeResumeKeyV1("stable-1", SESSION))).toBe(false);
  });

  test("ошибка колбэка загрузку не ломает; без колбэка — как раньше", async () => {
    await saveLearningV2EpisodeResumeV1("stable-1", record());
    await expect(load(() => { throw new Error("сбой плеера"); })).resolves.toBeNull();
    expect(console.warn).toHaveBeenCalledWith("[V2-RESUME] on_rejected_failed", expect.stringContaining("release_changed"));
    await saveLearningV2EpisodeResumeV1("stable-1", record());
    await expect(load()).resolves.toBeNull();
  });
});

describe("[V2-RESUME-RESET] один бесплатный старт на занятие и выпуск", () => {
  test("чистое решение: бесплатно, пока за этот выпуск бесплатного старта не было", () => {
    expect(learningV2ReleaseResetIsFreeV1(null, NEW)).toBe(true);
    expect(learningV2ReleaseResetIsFreeV1(OLD, NEW)).toBe(true);
    expect(learningV2ReleaseResetIsFreeV1(NEW, NEW)).toBe(false);
  });

  test("первый старт — бесплатный и пишет отметку; второй в том же выпуске — платный; новый выпуск — снова бесплатный", async () => {
    await expect(claim()).resolves.toEqual({ free: true, reason: "free_start" });
    expect(store.get(learningV2ReleaseResetFreeStartKeyV1("stable-1", SESSION, "en"))).toBe(NEW);
    await expect(claim()).resolves.toEqual({ free: false, reason: "already_used" });
    await expect(claim({ newFingerprint: "c".repeat(64) })).resolves.toEqual({ free: true, reason: "free_start" });
  });

  test("отметка своя у аккаунта, занятия и языка курса", async () => {
    await expect(claim()).resolves.toMatchObject({ free: true });
    await expect(claim({ owner: "stable-2" })).resolves.toMatchObject({ free: true });
    await expect(claim({ courseSessionId: "lesson-08:session:03" })).resolves.toMatchObject({ free: true });
    await expect(claim({ targetLanguage: "es" })).resolves.toMatchObject({ free: true });
  });

  test("отметку не прочитали или не записали — старт платный, причина в журнале", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(async () => { throw new Error("disk"); });
    await expect(claim()).resolves.toEqual({ free: false, reason: "mark_read_failed" });
    (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(async () => { throw new Error("disk full"); });
    await expect(claim()).resolves.toEqual({ free: false, reason: "mark_write_failed" });
    expect(console.warn).toHaveBeenCalledWith("[V2-RESUME-RESET]", expect.stringContaining("mark_read_failed"), expect.any(String));
    expect(console.warn).toHaveBeenCalledWith("[V2-RESUME-RESET]", expect.stringContaining("mark_write_failed"), expect.any(String));
  });
});

describe("[V2-RESUME-RESET] плеер решает до показа первого задания", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "app", "learning_v2_direct_session_player_v1.tsx"), "utf8");

  test("загрузка получает колбэк; бесплатно только при release_changed и только пока первого задания нет", () => {
    expect(src).toContain("targetLanguage: progressTargetLanguage, onRejected })");
    expect(src).toContain('if (rejection.reason !== "release_changed") return;');
    // запись и так истекла (старше срока «продолжить») — потерю принёс не выпуск: старт платный
    expect(src).toContain("if (ageMs === null || ageMs > LEARNING_V2_EPISODE_RESUME_TTL_MS) {");
    expect(src).toContain('reason: "resume_expired_anyway"');
    expect(src).toContain('if (sessionStageRef.current !== "intro") {');
    expect(src).toContain("if (claim.free && inTime) resumedWithoutChargeRef.current = true;");
    // сигнал «первое задание на экране» — тот же путь, что у «продолжить»: нет сигнала — гейт энергии не списывает
    expect(src).toContain("{resumedWithoutChargeRef.current ? null : <LearningV2FirstQuestionShownReporter />}");
  });

  test("журнал решения: урок, занятие, эпизод, старый и новый отпечаток, энергия и причина", () => {
    expect(src).toContain("lesson: lessonOrdinal, session: sessionOrdinal, courseSessionId: resumeCourseSessionId, oldFingerprint: rejection.savedFingerprint, newFingerprint: resumeFingerprint");
    expect(src).toContain('energy: claim.free && inTime ? "free" : "charged", reason');
    expect(src).toContain('energy: "charged", reason: `too_late:${sessionStageRef.current}`');
  });
});
