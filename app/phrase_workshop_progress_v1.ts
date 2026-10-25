// ═══════════════════════════════════════════════════════════════════════════
// phrase_workshop_progress_v1.ts — локальное состояние «Мастерской фраз», не относящееся к прогрессу старого курса.
//
// зачем (владелец 25.10: монеты и серия «как за практику», прогресс не меняется; координатор: песочница):
//  • счётчик проходов мастерской по уроку — номер прохода идёт в расписку монет (сервер идемпотентен по номеру), у старого
//    курса его роль играет число проходов медали, которую мастерская НЕ трогает;
//  • смена ключей прогресса при новом входе: каждый вход получает свой id хранилища (seed), ключи прошлого входа стираем,
//    чтобы они не копились и не «воскресали» на другой выборке фраз.
// Ключи привязаны к хэшу аккаунта (как банк фраз): чужой аккаунт не видит чужие числа. Сеть и Firestore не используются.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { deriveLocalOfflineProgressAccountScopeHash } from '../modules/learning-v2/progress/progress_account_scope';
import { lessonProgressKey, lessonSessionKey, type RuntimeStudyTarget } from './target_storage_keys';

const LOG = '[PHRASE-WORKSHOP]';

function accountHash(): string | null {
  const token = captureAccountGeneration();
  if (token.phase !== 'active' || !token.stableId || !isCurrentAccountGeneration(token, token.stableId)) return null;
  return deriveLocalOfflineProgressAccountScopeHash(token.stableId);
}

const passKey = (hash: string, target: string, lessonId: number) => `learning-v2:phrase-workshop:v1:${hash}:${target}:lesson:${lessonId}:passes`;
const roundKey = (hash: string, target: string, lessonId: number) => `learning-v2:phrase-workshop:v1:${hash}:${target}:lesson:${lessonId}:round`;

/** Сколько проходов мастерской этого урока уже засчитано (0 — первый заход). */
export async function readPhraseWorkshopPassCount(lessonId: number, studyTarget: RuntimeStudyTarget): Promise<number> {
  const hash = accountHash();
  if (!hash) {
    console.warn(`${LOG} passes:no_account`, JSON.stringify({ lessonId }));
    return 0;
  }
  const raw = await AsyncStorage.getItem(passKey(hash, String(studyTarget), lessonId));
  const value = Number.parseInt(raw ?? '0', 10);
  const count = Number.isSafeInteger(value) && value > 0 ? value : 0;
  console.log(`${LOG} passes:read`, JSON.stringify({ lessonId, count, raw }));
  return count;
}

/** +1 к числу проходов (вызывается при завершении прохода). Возвращает новое значение. */
export async function bumpPhraseWorkshopPassCount(lessonId: number, studyTarget: RuntimeStudyTarget): Promise<number> {
  const hash = accountHash();
  if (!hash) {
    console.warn(`${LOG} passes:bump_no_account`, JSON.stringify({ lessonId }));
    return 0;
  }
  const key = passKey(hash, String(studyTarget), lessonId);
  const next = (await readPhraseWorkshopPassCount(lessonId, studyTarget)) + 1;
  await AsyncStorage.setItem(key, String(next));
  console.log(`${LOG} passes:bumped`, JSON.stringify({ lessonId, next }));
  return next;
}

/** Все ключи прогресса прохода, которые создаёт экран урока для данного id хранилища. */
export function phraseWorkshopRoundKeys(storageId: string, studyTarget: RuntimeStudyTarget): string[] {
  return [
    lessonProgressKey(storageId, studyTarget),
    lessonSessionKey(storageId, 'cellIndex', studyTarget),
    lessonSessionKey(storageId, 'phraseOrder', studyTarget),
    lessonSessionKey(storageId, 'contentSignature', studyTarget),
    lessonSessionKey(storageId, 'errorReplayQueue', studyTarget),
    lessonSessionKey(storageId, 'errorReplaySince', studyTarget),
    lessonSessionKey(storageId, 'errorReplayOverride', studyTarget),
    lessonSessionKey(storageId, 'serverAttemptId', studyTarget),
  ];
}

/**
 * Новый вход в мастерскую: стираем ключи прохода прошлого входа этого урока и запоминаем текущий id хранилища.
 * Ошибка — в журнал (вход не падает: лишние ключи безвредны).
 */
export async function swapPhraseWorkshopRound(lessonId: number, studyTarget: RuntimeStudyTarget, storageId: string): Promise<void> {
  const hash = accountHash();
  if (!hash) {
    console.warn(`${LOG} round:swap_no_account`, JSON.stringify({ lessonId, storageId }));
    return;
  }
  const key = roundKey(hash, String(studyTarget), lessonId);
  const previous = await AsyncStorage.getItem(key);
  if (previous && previous !== storageId) {
    const keys = phraseWorkshopRoundKeys(previous, studyTarget);
    await AsyncStorage.multiRemove(keys);
    console.log(`${LOG} round:cleared`, JSON.stringify({ lessonId, previous, keys: keys.length }));
  }
  await AsyncStorage.setItem(key, storageId);
  console.log(`${LOG} round:started`, JSON.stringify({ lessonId, storageId, hadPrevious: previous !== null }));
}
