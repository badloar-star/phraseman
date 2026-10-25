// зачем (владелец 25.10, «классический режим» после урока V2; координатор): хранилище банка фраз урока.
// Копится при показе задания «Сборка фразы» (плеер Learning V2), читается будущим режимом после урока.
// 0 чтений сети/Firestore; по образцу learning_v2_unlocked_lesson_words_v1.ts: ключ с хэшем аккаунта,
// запись под блокировкой перехода аккаунта, устаревшая смена аккаунта ничего не пишет. Журнал [CLASSIC-BANK].
import AsyncStorage from '@react-native-async-storage/async-storage';

import { captureAccountGeneration, isCurrentAccountGeneration, withAccountTransitionLock } from './account_generation';
import { deriveLocalOfflineProgressAccountScopeHash } from '../modules/learning-v2/progress/progress_account_scope';
import {
  learningV2LessonBankKeyV1,
  mergeLearningV2LessonBankPhraseV1,
  parseLearningV2LessonBankV1,
  projectLearningV2LessonBankPhraseV1,
  type LearningV2LessonBankPhraseV1,
} from './learning_v2_lesson_phrase_bank_core_v1';

const LOG = '[CLASSIC-BANK]';

type AccountScope = Readonly<{ accountScopeHash: string; accountGeneration: number }>;

function currentAccountScope(): AccountScope | null {
  const token = captureAccountGeneration();
  if (token.phase !== 'active' || !token.stableId || !isCurrentAccountGeneration(token, token.stableId)) return null;
  return { accountScopeHash: deriveLocalOfflineProgressAccountScopeHash(token.stableId), accountGeneration: token.generation };
}

function isStillCurrent(scope: AccountScope): boolean {
  const token = captureAccountGeneration();
  if (token.phase !== 'active' || !token.stableId || token.generation !== scope.accountGeneration
    || !isCurrentAccountGeneration(token, token.stableId)) return false;
  return deriveLocalOfflineProgressAccountScopeHash(token.stableId) === scope.accountScopeHash;
}

export type LearningV2LessonBankRecordResultV1 =
  | 'added' | 'duplicate' | 'full' | 'skipped_not_builder' | 'skipped_invalid' | 'no_account' | 'account_changed';

/**
 * Кладёт в банк урока фразу из задания «Сборка фразы». Вызывать при ПОКАЗЕ задания.
 * Не бросает: любой сбой — в журнал, занятие продолжается как раньше.
 */
export async function recordLearningV2LessonBankPhraseV1(input: Readonly<{
  targetLanguage: string;
  lessonOrdinal: number;
  sessionOrdinal: number;
  modePayload: unknown;
}>): Promise<LearningV2LessonBankRecordResultV1> {
  const projection = projectLearningV2LessonBankPhraseV1(input.modePayload, input.sessionOrdinal);
  if (!projection.ok) {
    const result = projection.reason.startsWith('family_') || projection.reason === 'no_payload' ? 'skipped_not_builder' : 'skipped_invalid';
    if (result === 'skipped_invalid') {
      console.warn(`${LOG} skip`, JSON.stringify({ result, reason: projection.reason, lesson: input.lessonOrdinal, session: input.sessionOrdinal }));
    }
    return result;
  }
  const account = currentAccountScope();
  if (!account) {
    console.warn(`${LOG} no_account`, JSON.stringify({ lesson: input.lessonOrdinal, session: input.sessionOrdinal }));
    return 'no_account';
  }
  try {
    const key = learningV2LessonBankKeyV1(account.accountScopeHash, input.targetLanguage, input.lessonOrdinal);
    return await withAccountTransitionLock(async (): Promise<LearningV2LessonBankRecordResultV1> => {
      if (!isStillCurrent(account)) return 'account_changed';
      const current = parseLearningV2LessonBankV1(await AsyncStorage.getItem(key));
      if (!isStillCurrent(account)) return 'account_changed';
      const merged = mergeLearningV2LessonBankPhraseV1(current, projection.phrase);
      if (merged.result === 'added') await AsyncStorage.setItem(key, JSON.stringify(merged.phrases));
      console.log(`${LOG} ${merged.result}`, JSON.stringify({ lesson: input.lessonOrdinal, session: input.sessionOrdinal, total: merged.phrases.length, tokens: projection.phrase.tokens.length }));
      return merged.result;
    });
  } catch (error: unknown) {
    console.warn(`${LOG} record_failed`, JSON.stringify({ reason: error instanceof Error ? error.message : String(error), lesson: input.lessonOrdinal, session: input.sessionOrdinal }));
    return 'skipped_invalid';
  }
}

/** Банк фраз урока для будущего режима. Пустой массив — банка нет/другой аккаунт (причина в журнале). */
export async function loadLearningV2LessonBankV1(
  targetLanguage: string,
  lessonOrdinal: number,
): Promise<readonly LearningV2LessonBankPhraseV1[]> {
  const account = currentAccountScope();
  if (!account) {
    console.warn(`${LOG} load:no_account`, JSON.stringify({ lesson: lessonOrdinal }));
    return [];
  }
  try {
    const key = learningV2LessonBankKeyV1(account.accountScopeHash, targetLanguage, lessonOrdinal);
    const rows = parseLearningV2LessonBankV1(await AsyncStorage.getItem(key));
    if (!isStillCurrent(account)) return [];
    console.log(`${LOG} load`, JSON.stringify({ lesson: lessonOrdinal, total: rows.length }));
    return rows;
  } catch (error: unknown) {
    console.warn(`${LOG} load_failed`, JSON.stringify({ reason: error instanceof Error ? error.message : String(error), lesson: lessonOrdinal }));
    return [];
  }
}
