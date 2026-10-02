/**
 * Account V2, Пакет 8H-2 — очистка устаревшей копии карточек в документе users/{id}.
 *
 * зачем: после выноса карточек в подколлекцию flashcard_pages ключ
 * progress.flashcards_v1 (и французский двойник) просто выкидывался из патча
 * документа. Старое значение в документе жило вечно, а restore предпочитает поле
 * документа страницам — удалённая карточка «возвращалась» (диагноз 8H, c25df6472).
 * Решение координатора §67 (B): после УСПЕШНОЙ записи страниц ставим в том же
 * патче progress.<ключ> = null, один раз; повтор не шлём — помним в снимке
 * синхронизации маркер «поле уже обнулено».
 *
 * Маркер живёт в том же снимке (cloud_last_sync_snapshot_v1), поэтому сам
 * сбрасывается там, где документ мог снова получить список: restore и перенос
 * при смене устройства перезаписывают снимок целиком — после них null уйдёт
 * ещё раз при следующей записи страниц (одна лишняя запись поля, не больше).
 */

export const FLASHCARD_DOC_FIELD_CLEARED_MARKER_PREFIX = '__doc_field_cleared::';
export const FLASHCARD_DOC_FIELD_CLEARED_MARKER_VALUE = '1';

export function flashcardDocFieldClearedMarkerKey(key: string): string {
  return `${FLASHCARD_DOC_FIELD_CLEARED_MARKER_PREFIX}${key}`;
}

export function isFlashcardDocFieldMarkedCleared(
  previousSnapshot: Readonly<Record<string, string | null>>,
  key: string,
): boolean {
  return previousSnapshot[flashcardDocFieldClearedMarkerKey(key)] === FLASHCARD_DOC_FIELD_CLEARED_MARKER_VALUE;
}

export type FlashcardDocFieldDecision = 'clear' | 'already_cleared' | 'keep_in_doc';

/**
 * Что делать с полем документа для ключа, чьи страницы только что писались.
 * pagesWritten=false → страницы не записались: список едет в документ как раньше.
 */
export function decideFlashcardDocField(
  previousSnapshot: Readonly<Record<string, string | null>>,
  key: string,
  pagesWritten: boolean,
): FlashcardDocFieldDecision {
  if (!pagesWritten) return 'keep_in_doc';
  return isFlashcardDocFieldMarkedCleared(previousSnapshot, key) ? 'already_cleared' : 'clear';
}

/**
 * Маркеры для нового снимка после УСПЕШНОЙ записи документа.
 * - обнулили сейчас → маркер ставится;
 * - маркер был и список в документ НЕ уезжал → маркер переносится;
 * - список уехал в документ (сбой страниц) → маркер снимается: поле снова не null.
 */
export function buildFlashcardDocFieldMarkers(
  previousSnapshot: Readonly<Record<string, string | null>>,
  flashcardKeys: Iterable<string>,
  clearedNow: ReadonlySet<string>,
  sentToDoc: ReadonlySet<string>,
): Record<string, string> {
  const markers: Record<string, string> = {};
  for (const key of flashcardKeys) {
    if (sentToDoc.has(key)) continue;
    if (clearedNow.has(key) || isFlashcardDocFieldMarkedCleared(previousSnapshot, key)) {
      markers[flashcardDocFieldClearedMarkerKey(key)] = FLASHCARD_DOC_FIELD_CLEARED_MARKER_VALUE;
    }
  }
  return markers;
}

export default function __RouteShim() { return null; }
