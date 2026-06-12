/**
 * Сборка «памяти коуча» для режима companion ИИ-компаньона.
 *
 * Это сердце дифференциатора (стратегия §6.4): Тео «знает» ученика, потому что
 * мы кладём в промпт его профиль + слабые слова из УЖЕ существующей SRS-истории
 * ошибок. Конкурент копирует UI чата за выходные, но не вашу историю ошибок.
 *
 * В MVP-1 summary пустой (rolling-резюме прошлых бесед — fast-follow).
 */
import { getTrainerPremiumItems } from './trainer_store';
import type { RuntimeStudyTarget } from './target_storage_keys';
import type { DialogMemory } from './ai_dialog_client';

const WEAK_WORDS_LIMIT = 5;

const CEFR_GOAL_RU: Record<string, string> = {
  A1: 'делает первые шаги в языке',
  A2: 'учит базовый разговорный',
  B1: 'хочет говорить увереннее',
  B2: 'оттачивает беглость',
};

/**
 * Собирает память: профиль (уровень/родной язык) + top-K слабых слов из SRS.
 * Никогда не бросает — при пустой истории вернёт память без weakWords.
 */
export async function buildCompanionMemory(
  cefr: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<DialogMemory> {
  let weakWords: string[] | undefined;
  try {
    const items = await getTrainerPremiumItems('weak', WEAK_WORDS_LIMIT, studyTarget);
    const words = items.map((i) => i.key.trim()).filter((k) => k.length > 0);
    if (words.length > 0) weakWords = words;
  } catch {
    // SRS недоступна — продолжаем без слабых слов, это не критично.
  }

  const levelNote = CEFR_GOAL_RU[cefr] ?? 'учит английский';
  const profile = `Уровень ${cefr}, ${levelNote}. Родной язык — русский.`;

  return {
    profile,
    weakWords,
    // summary в MVP-1 пуст — rolling-резюме прошлых бесед добавим позже.
  };
}
