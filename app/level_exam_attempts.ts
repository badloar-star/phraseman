import AsyncStorage from '@react-native-async-storage/async-storage';
import { levelExamKey, type RuntimeStudyTarget } from './target_storage_keys';
import {
  parseLevelExamAttemptSnapshot,
  type LevelExamAttemptSnapshot,
} from './level_exam_attempt_state';
import type { LevelExamLevel } from './level_exam_types';

const storageQueues = new Map<string, Promise<void>>();

function targetSegment(studyTarget: RuntimeStudyTarget): string {
  return studyTarget === 'fr' ? 'fr' : 'en';
}

function ownerSegment(ownerStableUid: string): string {
  const owner = ownerStableUid.trim();
  if (!owner) throw new Error('level_exam_attempt_owner_missing');
  return encodeURIComponent(owner);
}

function serializeStorageOperation<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = storageQueues.get(key) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(operation);
  const marker = result.then(() => undefined, () => undefined);
  storageQueues.set(key, marker);
  return result.finally(() => {
    if (storageQueues.get(key) === marker) storageQueues.delete(key);
  });
}

export function activeLevelExamAttemptKey(
  ownerStableUid: string,
  level: LevelExamLevel,
  studyTarget: RuntimeStudyTarget = 'en',
): string {
  return `level_exam_active_v2::${targetSegment(studyTarget)}::${ownerSegment(ownerStableUid)}::${level}`;
}

export function levelExamAttemptRecoveryKey(
  ownerStableUid: string,
  level: LevelExamLevel,
  studyTarget: RuntimeStudyTarget = 'en',
): string {
  return `${activeLevelExamAttemptKey(ownerStableUid, level, studyTarget)}::recovery`;
}

export async function loadActiveLevelExamAttempt(
  ownerStableUid: string,
  level: LevelExamLevel,
  studyTarget: RuntimeStudyTarget = 'en',
): Promise<LevelExamAttemptSnapshot | null> {
  const key = activeLevelExamAttemptKey(ownerStableUid, level, studyTarget);
  await (storageQueues.get(key) ?? Promise.resolve());
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && parsed.blueprintVersion === 2) {
      await AsyncStorage.setItem(levelExamAttemptRecoveryKey(ownerStableUid, level, studyTarget), raw);
    }
    const attempt = parseLevelExamAttemptSnapshot(parsed);
    if (!attempt
      || attempt.ownerStableUid !== ownerStableUid
      || attempt.level !== level
      || attempt.studyTarget !== targetSegment(studyTarget)) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return attempt;
  } catch {
    await AsyncStorage.removeItem(key);
    return null;
  }
}

export async function persistActiveLevelExamAttempt(
  attempt: LevelExamAttemptSnapshot,
): Promise<void> {
  const key = activeLevelExamAttemptKey(attempt.ownerStableUid, attempt.level, attempt.studyTarget);
  await serializeStorageOperation(key, () => AsyncStorage.setItem(key, JSON.stringify(attempt)));
}

export async function clearActiveLevelExamAttempt(
  ownerStableUid: string,
  level: LevelExamLevel,
  studyTarget: RuntimeStudyTarget = 'en',
): Promise<void> {
  const key = activeLevelExamAttemptKey(ownerStableUid, level, studyTarget);
  await serializeStorageOperation(key, () => AsyncStorage.removeItem(key));
}

export async function recordCompletedLevelExamAttemptOnce(
  ownerStableUid: string,
  level: LevelExamLevel,
  finishToken: string,
  studyTarget: RuntimeStudyTarget = 'en',
): Promise<number> {
  const token = finishToken.trim();
  if (!token) throw new Error('level_exam_finish_token_missing');
  const scope = `${targetSegment(studyTarget)}::${ownerSegment(ownerStableUid)}::${level}`;
  const queueKey = `level_exam_completion_queue_v2::${scope}`;
  const markerKey = `level_exam_finish_recorded_v2::${scope}::${encodeURIComponent(token)}`;
  return serializeStorageOperation(queueKey, async () => {
    const countKey = levelExamKey(level, 'attempt_count', studyTarget);
    const previous = normalizeLevelExamAttemptCount(await AsyncStorage.getItem(countKey));
    if (await AsyncStorage.getItem(markerKey)) return previous;
    const next = previous + 1;
    await AsyncStorage.multiSet([
      [countKey, String(next)],
      [markerKey, '1'],
    ]);
    return next;
  });
}

export function normalizeLevelExamAttemptCount(raw: unknown): number {
  const parsed = parseInt(String(raw ?? '0'), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function recordLevelExamAttempt(
  level: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<number> {
  try {
    const key = levelExamKey(level, 'attempt_count', studyTarget);
    const previous = normalizeLevelExamAttemptCount(await AsyncStorage.getItem(key));
    const next = previous + 1;
    await AsyncStorage.setItem(key, String(next));
    return next;
  } catch {
    return 1;
  }
}

export default function __LevelExamAttemptsRouteShim() {
  return null;
}
