/**
 * Настроение собеседника (0..100) → смайлик для шапки ИИ-диалога.
 *
 * Юзер выбрал «смайлик в шапке без цифр» — новичка не пугаем числами.
 * Сервер ведёт скрытый mood-счётчик и отдаёт его каждый ход; клиент показывает
 * только лицо. Границы фиксированы тестами (33 и 66).
 *
 * Чистая функция без зависимостей — легко тестировать.
 */

export type MoodFace = '😊' | '😐' | '😠';

/** Стартовое настроение по умолчанию, когда сервер не прислал mood (нейтрально). */
export const DEFAULT_MOOD = 70;

/**
 * Зоны:
 *   mood >= 66  → 😊 доволен
 *   33..65      → 😐 нейтрально/насторожен
 *   < 33        → 😠 раздражён
 * Значение клампится в 0..100, нечисловой вход → нейтральное лицо.
 */
export function moodToFace(mood: number): MoodFace {
  if (!Number.isFinite(mood)) return '😐';
  const m = Math.max(0, Math.min(100, mood));
  if (m >= 66) return '😊';
  if (m >= 33) return '😐';
  return '😠';
}

/**
 * Кламп настроения в 0..100 (нечисло/пусто → DEFAULT_MOOD).
 * Важно: `Number(null)` и `Number('')` дают 0, а это «нет значения», не «mood 0» —
 * поэтому null/undefined/'' отсекаем до приведения к числу.
 */
export function clampMood(mood: unknown): number {
  if (mood == null || mood === '') return DEFAULT_MOOD;
  const n = Number(mood);
  if (!Number.isFinite(n)) return DEFAULT_MOOD;
  return Math.max(0, Math.min(100, Math.round(n)));
}
