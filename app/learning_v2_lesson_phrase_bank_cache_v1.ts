// зачем (владелец 25.10, «Мастерская фраз»; правило проекта «раздел открывается мгновенно»): банк фраз урока читается из
// AsyncStorage, а экран режима должен показать первый вопрос без ожидания. Список «Все уроки» уже читает банк, чтобы решить
// состояние кнопки, — кладём прочитанное сюда, а экран режима берёт синхронно (peek) и только при промахе читает сам.
// Кэш в памяти процесса: при смене аккаунта чистится (ключ включает язык и урок, а банк — аккаунтный), поэтому хранится
// вместе с «владельцем» — хэшем аккаунта из ключа хранилища не доступен, значит чистим по событию смены владельца.
import type { LearningV2LessonBankPhraseV1 } from './learning_v2_lesson_phrase_bank_core_v1';
import { onAccountOwnerChanged } from './account_owner_change';

const cache = new Map<string, readonly LearningV2LessonBankPhraseV1[]>();
const keyOf = (targetLanguage: string, lessonOrdinal: number) => `${targetLanguage}:${lessonOrdinal}`;

export function peekLearningV2LessonBankV1(targetLanguage: string, lessonOrdinal: number): readonly LearningV2LessonBankPhraseV1[] | null {
  return cache.get(keyOf(targetLanguage, lessonOrdinal)) ?? null;
}

export function rememberLearningV2LessonBankV1(targetLanguage: string, lessonOrdinal: number, phrases: readonly LearningV2LessonBankPhraseV1[]): void {
  cache.set(keyOf(targetLanguage, lessonOrdinal), phrases);
}

onAccountOwnerChanged('lesson_phrase_bank_cache', () => {
  cache.clear();
});
