// learning_v2_chapter_exam_store_v1.ts — результаты экзаменов глав на устройстве (по аккаунту), без сети.
// зачем (решения владельца 21.10, №8/№10): карта экзамена показывает «Экзамен сдан · X из 12» и паузу «через N мин» сразу,
// без ожидания — поэтому результаты лежат в AsyncStorage одним ключом на аккаунт и держатся в памяти процесса для
// первого кадра (peek). Ни одного чтения Firebase: экзамен — клиентский, как и локальный прогресс курса.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAccountOwnerChanged } from './account_owner_change';
import type { ChapterExamRecordV1 } from '../modules/learning-v2/exam/chapter_exam_v1';
import {
  LEARNING_V2_CHAPTER_EXAM_SYNC_KEY_V1,
  mergeChapterExamRecordMapsV1,
  packChapterExamSyncV1,
  unpackChapterExamSyncV1,
} from '../modules/learning-v2/progress/progress_sync_v1';

const LOG = '[CHAPTER-EXAM]';
const KEY = (accountScopeHash: string) => `v2:chapter-exam:v1:${accountScopeHash}`;

type RecordsByKey = Readonly<Record<string, ChapterExamRecordV1>>;
const memory = new Map<string, RecordsByKey>();
onAccountOwnerChanged('learning_v2_chapter_exam_store', () => { memory.clear(); });

const isRecord = (value: unknown): value is ChapterExamRecordV1 => {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return typeof r.examKey === 'string' && (r.status === 'passed' || r.status === 'failed') &&
    typeof r.lastCorrect === 'number' && typeof r.attempts === 'number' && typeof r.lastFinishedAtMs === 'number' &&
    (r.passedCorrect === null || typeof r.passedCorrect === 'number') && (r.retryAtMs === null || typeof r.retryAtMs === 'number');
};

/** Синхронно из памяти — для первого кадра карты; null — ещё не читали с диска в этом запуске. */
export function peekLearningV2ChapterExamRecordsV1(accountScopeHash: string): RecordsByKey | null {
  return memory.get(accountScopeHash) ?? null;
}

export async function loadLearningV2ChapterExamRecordsV1(accountScopeHash: string): Promise<RecordsByKey> {
  const cached = memory.get(accountScopeHash);
  if (cached) return cached;
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(KEY(accountScopeHash));
  } catch (error) {
    console.warn(`${LOG} store:read_failed`, JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
    return Object.freeze({});
  }
  let parsed: RecordsByKey = Object.freeze({});
  if (raw) {
    try {
      const value = JSON.parse(raw) as Record<string, unknown>;
      parsed = Object.freeze(Object.fromEntries(Object.entries(value).filter(([, record]) => isRecord(record)))) as RecordsByKey;
    } catch (error) {
      console.warn(`${LOG} store:parse_failed`, JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
    }
  }
  // зачем (координатор 22.10, вариант А): облачная копия (learning_v2_chapter_exam_sync_v1) приходит вместе с документом
  // пользователя после переустановки или с другого телефона — сливаем: «сдан» побеждает, лучший счёт сохраняется.
  let synced: Readonly<Record<string, ChapterExamRecordV1>> = {};
  try {
    synced = unpackChapterExamSyncV1(await AsyncStorage.getItem(LEARNING_V2_CHAPTER_EXAM_SYNC_KEY_V1));
  } catch (error) {
    console.warn('[V2-PROGRESS-SYNC] exam:sync_read_failed', JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
  }
  const merged = Object.freeze(mergeChapterExamRecordMapsV1(parsed, synced)) as RecordsByKey;
  memory.set(accountScopeHash, merged);
  console.log(`${LOG} store:loaded`, JSON.stringify({ local: Object.keys(parsed).length, cloud: Object.keys(synced).length, merged: Object.keys(merged).length, source: raw ? 'disk+sync' : 'sync_only' })); // guard-ok: откуда пришло
  return merged;
}

/** Записать попытку: сначала память (карта обновляется мгновенно), затем диск; сбой диска не теряет результат в этом запуске. */
export async function saveLearningV2ChapterExamRecordV1(accountScopeHash: string, record: ChapterExamRecordV1): Promise<void> {
  const current = memory.get(accountScopeHash) ?? await loadLearningV2ChapterExamRecordsV1(accountScopeHash);
  const next = Object.freeze({ ...current, [record.examKey]: record });
  memory.set(accountScopeHash, next);
  try {
    // зачем (координатор 22.10, вариант А): облачная копия пишется одним multiSet вместе с локальной — едет той же пачкой синхронизации.
    await AsyncStorage.multiSet([
      [KEY(accountScopeHash), JSON.stringify(next)],
      [LEARNING_V2_CHAPTER_EXAM_SYNC_KEY_V1, packChapterExamSyncV1(next)],
    ]);
    console.log(`${LOG} store:saved`, JSON.stringify({ examKey: record.examKey, status: record.status, attempts: record.attempts })); // guard-ok: итог записи
    console.log('[V2-PROGRESS-SYNC] exam:mirrored', JSON.stringify({ exams: Object.keys(next).length })); // guard-ok: что ушло в облачную копию
  } catch (error) {
    console.warn(`${LOG} store:write_failed`, JSON.stringify({ examKey: record.examKey, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
  }
}

export function resetLearningV2ChapterExamStoreForTests(): void {
  memory.clear();
}

export default function __RouteShim() { return null; }
