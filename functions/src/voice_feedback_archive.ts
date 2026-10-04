/**
 * Архив отзывов о голосовом звонке (бывший MAX).
 *
 * зачем (владелец 04.10, «вычистить весь MAX»): код звонка удалён, но отзывы в коллекции остаются (данные не
 * стираем без отдельного решения) и учитываются в общей статистике отзывов админки. Здесь — только то, что нужно
 * для чтения архива: имя коллекции и нормализация оценки.
 */
export const VOICE_FEEDBACK_COLLECTION = 'max_voice_feedback';

/** Оценка 1..5; всё остальное — 0 («нет оценки»). */
export function sanitizeVoiceFeedbackRating(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > 5) return 0;
  return n;
}
