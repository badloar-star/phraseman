/**
 * Сборка «памяти коуча» для режима companion ИИ-компаньона.
 *
 * Это сердце дифференциатора (стратегия §6.4): Тео «знает» ученика, потому что
 * мы кладём в промпт его профиль + слабые места из новой истории ошибок
 * ошибок. Конкурент копирует UI чата за выходные, но не вашу историю ошибок.
 *
 * В MVP-1 summary пустой (rolling-резюме прошлых бесед — fast-follow).
 */
import { loadMistakePracticeInsights } from './mistake_practice_insights';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import type { DialogMemory } from './ai_dialog_client';
import { DebugLogger } from './debug-logger';

const WEAK_WORDS_LIMIT = 5;

// Профиль уходит ВНУТРЬ англоязычного system-промпта собеседника, поэтому он на
// английском (а не на русском — иначе русский текст в промпте провоцировал срыв
// ответа на русский, и для украинца/поляка строка «Родной язык — русский» врала).
// Родной язык ученика серверу и так известен из interfaceLang ({LEARNER_LANG_NAME}
// в GLOBAL_RULES) — здесь его НЕ дублируем.
const CEFR_GOAL_EN: Record<string, string> = {
  A1: 'is taking first steps in the language',
  A2: 'is learning basic conversation',
  B1: 'wants to speak more confidently',
  B2: 'is polishing fluency',
};

/**
 * Собирает память: профиль (уровень/родной язык) + top-K активных ошибок.
 * Никогда не бросает — при пустой истории вернёт память без weakWords.
 */
export async function buildCompanionMemory(
  cefr: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<DialogMemory> {
  let weakWords: string[] | undefined;
  try {
    const insights = await loadMistakePracticeInsights(storageStudyTarget(studyTarget));
    const words = insights.topMistakes
      .slice(0, WEAK_WORDS_LIMIT)
      .map((item) => item.phrase.trim())
      .filter((key) => key.length > 0);
    if (words.length > 0) weakWords = words;
  } catch (e) {
      // История ошибок недоступна — продолжаем без слабых слов, это не критично.
      DebugLogger.error('ai_companion_memory:words', e instanceof Error ? e : new Error(String(e)), 'warning');
    }

  const levelNote = CEFR_GOAL_EN[cefr] ?? 'is learning English';
  const profile = `Level ${cefr}, ${levelNote}.`;

  return {
    profile,
    weakWords,
    // summary в MVP-1 пуст — rolling-резюме прошлых бесед добавим позже.
  };
}
