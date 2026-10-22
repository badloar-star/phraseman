// Продолжение эпизода Learning V2 с места (№22, решение владельца 21.10).
//
// зачем: отзыв тестера — «выход или блокировка экрана — начинай сначала». Владелец: эпизод запоминается на телефоне
// (номер задания, ответы, отметки), при возврате — «Продолжить с задания N из M», повторный вход в ту же попытку энергию
// не тратит. Здесь только хранилище: запись на телефоне по аккаунту и эпизоду, проверка, что выпуск эпизода тот же
// (отпечаток набора детей), и срок годности. Сеть не трогаем — Firebase-нагрузки ноль.
// Журнал [V2-RESUME] на каждом решении и в каждом catch (правило «сперва логи»).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAccountOwnerChanged } from "./account_owner_change";
import type { LearningV2CourseSessionInteractionCompletionV1 } from "../modules/learning-v2/runtime/course_session_device_run_v1";

const LOG = "[V2-RESUME]";
const KEY_PREFIX = "learning_v2_episode_resume_v1";
export const LEARNING_V2_EPISODE_RESUME_SCHEMA_V1 = "learning-v2-episode-resume.v1" as const;
/** Сколько живёт сохранённый эпизод: дольше — начинаем заново (контент мог обновиться, человек всё забыл). */
export const LEARNING_V2_EPISODE_RESUME_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type LearningV2EpisodeAnsweredUiV1 = Readonly<{
  selectedChoiceId: string | null;
  orderedIds: readonly string[];
  transcript: string;
}>;

export type LearningV2EpisodeResumeRecordV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_EPISODE_RESUME_SCHEMA_V1;
  courseSessionId: string;
  childSetFingerprint: string;
  savedAtMs: number;
  introDone: boolean;
  practiceIndex: number;
  practiceTotal: number;
  sessionRunes: number;
  completions: readonly LearningV2CourseSessionInteractionCompletionV1[];
  answeredUi: readonly (readonly [string, LearningV2EpisodeAnsweredUiV1])[];
  deviceSkippedVoiceIds: readonly string[];
}>;

export function learningV2EpisodeResumeKeyV1(owner: string, courseSessionId: string): string {
  return `${KEY_PREFIX}:${owner}:${courseSessionId}`;
}

/**
 * Снимки в памяти процесса — раньше диска.
 * зачем (Learning V2 22.10, выход из эпизода без окна): снимок перед выходом ложится в память сразу, выход не ждёт AsyncStorage,
 * а быстрый повторный вход читает свежий снимок, даже если запись на диск ещё идёт или не удалась (тогда — до перезапуска).
 */
const memoryRecords = new Map<string, LearningV2EpisodeResumeRecordV1>();
// зачем (Learning V2 22.10): ключ по owner защищает чтение, но после выхода из аккаунта снимок прежнего человека не должен жить
// в памяти до перезапуска; диск стирает общий список префиксов аккаунта (learning_v2_episode_resume_v1: уже в нём)
onAccountOwnerChanged("learning_v2_episode_resume", () => { memoryRecords.clear(); });

/** Только для тестов: забыть снимки в памяти. */
export function __resetLearningV2EpisodeResumeMemoryForTests(): void {
  memoryRecords.clear();
}

function isRecord(value: unknown): value is LearningV2EpisodeResumeRecordV1 {
  const record = value as Partial<LearningV2EpisodeResumeRecordV1> | null;
  return Boolean(
    record &&
      record.schemaVersion === LEARNING_V2_EPISODE_RESUME_SCHEMA_V1 &&
      typeof record.courseSessionId === "string" &&
      typeof record.childSetFingerprint === "string" &&
      typeof record.savedAtMs === "number" &&
      typeof record.introDone === "boolean" &&
      Number.isSafeInteger(record.practiceIndex) &&
      Number.isSafeInteger(record.practiceTotal) &&
      Array.isArray(record.completions) &&
      Array.isArray(record.answeredUi) &&
      Array.isArray(record.deviceSkippedVoiceIds),
  );
}

/** Есть ли что продолжать: хоть одна отметка интро или задания. */
export function learningV2EpisodeHasProgressV1(record: Pick<LearningV2EpisodeResumeRecordV1, "completions">): boolean {
  return record.completions.length > 0;
}

export async function loadLearningV2EpisodeResumeV1(input: Readonly<{
  owner: string;
  courseSessionId: string;
  childSetFingerprint: string;
  nowMs?: number;
}>): Promise<LearningV2EpisodeResumeRecordV1 | null> {
  const key = learningV2EpisodeResumeKeyV1(input.owner, input.courseSessionId);
  const fromMemory = memoryRecords.get(key);
  let parsed: unknown = fromMemory;
  if (fromMemory === undefined) {
    let raw: string | null = null;
    try {
      raw = await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn(`${LOG} load_failed`, JSON.stringify({ courseSessionId: input.courseSessionId, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch с причиной
      return null;
    }
    if (!raw) {
      console.log(`${LOG} load_none`, JSON.stringify({ courseSessionId: input.courseSessionId })); // guard-ok: ранний выход
      return null;
    }
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.warn(`${LOG} load_corrupt`, JSON.stringify({ courseSessionId: input.courseSessionId, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch с причиной
      await clearLearningV2EpisodeResumeV1({ owner: input.owner, courseSessionId: input.courseSessionId, reason: "corrupt" });
      return null;
    }
  }
  const nowMs = input.nowMs ?? Date.now();
  const reject = async (reason: string, extra: Record<string, unknown> = {}) => {
    console.log(`${LOG} load_rejected`, JSON.stringify({ courseSessionId: input.courseSessionId, reason, ...extra })); // guard-ok: ранний выход с причиной
    await clearLearningV2EpisodeResumeV1({ owner: input.owner, courseSessionId: input.courseSessionId, reason });
    return null;
  };
  if (!isRecord(parsed)) return reject("invalid_shape");
  if (parsed.courseSessionId !== input.courseSessionId) return reject("other_session");
  if (parsed.childSetFingerprint !== input.childSetFingerprint) return reject("release_changed");
  if (nowMs - parsed.savedAtMs > LEARNING_V2_EPISODE_RESUME_TTL_MS) return reject("expired", { ageMs: nowMs - parsed.savedAtMs });
  if (!learningV2EpisodeHasProgressV1(parsed)) return reject("no_progress");
  console.log(`${LOG} load_ok`, JSON.stringify({
    source: fromMemory === undefined ? "disk" : "memory",
    courseSessionId: parsed.courseSessionId,
    practiceIndex: parsed.practiceIndex,
    practiceTotal: parsed.practiceTotal,
    completions: parsed.completions.length,
    ageMs: nowMs - parsed.savedAtMs,
  })); // guard-ok: итог загрузки
  return parsed;
}

export async function saveLearningV2EpisodeResumeV1(owner: string, record: LearningV2EpisodeResumeRecordV1): Promise<void> {
  const key = learningV2EpisodeResumeKeyV1(owner, record.courseSessionId);
  // зачем: память — синхронно, до первого await (выход по крестику не ждёт диска); диск — следом, сбой — в журнал
  memoryRecords.set(key, record);
  try {
    await AsyncStorage.setItem(key, JSON.stringify(record));
  } catch (error) {
    // Немая потеря недопустима: в памяти снимок жив до перезапуска, после — человек начнёт сначала; пусть это будет видно в журнале.
    console.warn(`${LOG} save_failed`, JSON.stringify({ courseSessionId: record.courseSessionId, practiceIndex: record.practiceIndex, keptInMemory: true, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch с причиной
  }
}

export async function clearLearningV2EpisodeResumeV1(input: Readonly<{ owner: string; courseSessionId: string; reason: string }>): Promise<void> {
  memoryRecords.delete(learningV2EpisodeResumeKeyV1(input.owner, input.courseSessionId));
  try {
    await AsyncStorage.removeItem(learningV2EpisodeResumeKeyV1(input.owner, input.courseSessionId));
    console.log(`${LOG} cleared`, JSON.stringify({ courseSessionId: input.courseSessionId, reason: input.reason })); // guard-ok: одна строка на очистку
  } catch (error) {
    console.warn(`${LOG} clear_failed`, JSON.stringify({ courseSessionId: input.courseSessionId, reason: input.reason, error: error instanceof Error ? error.message : String(error) })); // guard-ok: catch с причиной
  }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __LearningV2EpisodeResumeRouteShim() {
  return null;
}
