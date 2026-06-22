/**
 * Чистая логика лимита переводов реплик собеседника в ИИ-диалоге.
 *
 * Правила (согласованы с пользователем 2026-06-21):
 *  • Лимит TRANSLATE_LIMIT_PER_DIALOG переводов СУММАРНО на весь диалог.
 *  • Первый показ перевода НОВОЙ реплики тратит 1 (нужен серверный вызов).
 *  • Повторный флип уже открытой реплики туда-обратно — бесплатно (из кэша).
 *  • Когда лимит исчерпан, кнопка перевода прячется только у реплик, перевод
 *    которых ещё не загружали (уже открытую можно сворачивать/разворачивать).
 *
 * Состояние компонента (translations/flipped/used) держит экран; здесь — только
 * детерминированные решения по этому состоянию, чтобы их можно было покрыть
 * unit-тестами без рендера React Native.
 */

/** Сколько раз за один диалог можно открыть перевод новой реплики. */
export const TRANSLATE_LIMIT_PER_DIALOG = 3;

/** Что делать по тапу на кнопку перевода у конкретной реплики. */
export type TranslateAction =
  /** Скрыть уже показанный перевод (флип назад). Лимит не тратится. */
  | 'hide'
  /** Показать ранее загруженный перевод из кэша. Лимит не тратится. */
  | 'show_cached'
  /** Загрузить перевод с сервера (новая реплика). Тратит 1 из лимита при успехе. */
  | 'fetch'
  /** Ничего: лимит исчерпан или уже идёт загрузка. */
  | 'noop';

export interface TranslateState {
  /** Загружен ли перевод этой реплики (есть в кэше translations). */
  hasTranslation: boolean;
  /** Показан ли сейчас перевод (флип в состоянии «перевод»). */
  isFlipped: boolean;
  /** Сколько переводов уже потрачено за диалог. */
  used: number;
  /** Идёт ли прямо сейчас загрузка какого-либо перевода. */
  isBusy: boolean;
  /** Лимит на диалог (по умолчанию TRANSLATE_LIMIT_PER_DIALOG). */
  limit?: number;
}

/** Остаток переводов (никогда не отрицательный). */
export function translateRemaining(used: number, limit: number = TRANSLATE_LIMIT_PER_DIALOG): number {
  return Math.max(0, limit - used);
}

/**
 * Решение по тапу на кнопку перевода реплики. Порядок проверок важен: сначала
 * бесплатные пути (скрыть / показать из кэша), потом гейт лимита для платного
 * запроса.
 */
export function decideTranslateAction(state: TranslateState): TranslateAction {
  const limit = state.limit ?? TRANSLATE_LIMIT_PER_DIALOG;
  // Уже показан перевод → сворачиваем (бесплатно).
  if (state.isFlipped) return 'hide';
  // Перевод уже загружен → показываем из кэша (бесплатно), даже если лимит исчерпан.
  if (state.hasTranslation) return 'show_cached';
  // Новая реплика: нужен серверный вызов. Блокируем при занятости или нуле лимита.
  if (state.isBusy) return 'noop';
  if (translateRemaining(state.used, limit) <= 0) return 'noop';
  return 'fetch';
}

/**
 * Показывать ли кнопку перевода под репликой. Прячем только у реплик БЕЗ
 * загруженного перевода, когда лимит исчерпан — уже открытую реплику всегда
 * можно свернуть/развернуть.
 */
export function shouldShowTranslateButton(
  hasTranslation: boolean,
  used: number,
  limit: number = TRANSLATE_LIMIT_PER_DIALOG,
): boolean {
  if (hasTranslation) return true;
  return translateRemaining(used, limit) > 0;
}
