// ═══════════════════════════════════════════════════════════════════════════
// paywall_m_workshop_preview.ts — что лежит в Мастерской фраз закрытого урока: фраза, плитки слов и примеры из банка.
//
// зачем (Макеты 25.10, 🟡4): без блока «что внутри» панель Мастерской — просто текст и кнопка, а ради показа содержимого она и делалась. Данные — только
// банк фраз урока, уже лежащий на телефоне (peekLearningV2LessonBankV1); нет банка или перевода на язык интерфейса — блока нет, ничего не выдумываем.
// ═══════════════════════════════════════════════════════════════════════════
import type { LearningV2LessonBankPhraseV1 } from '../../../app/learning_v2_lesson_phrase_bank_core_v1';

export type PaywallMWorkshopPreview = Readonly<{
  /** Фраза на языке интерфейса — то, что человек собирает. */
  meaning: string;
  /** Слова ответа по порядку; первые `selected` показываются как уже выбранные. */
  tokens: readonly string[];
  selected: number;
  /** Две-три фразы урока целиком для строки примеров. */
  samples: readonly string[];
  /** Сколько фраз банка не поместилось в строку примеров («+47»). */
  more: number;
}>;

const MAX_TOKENS = 6;
const MAX_SAMPLES = 2;

export function paywallMWorkshopPreview(
  bank: readonly LearningV2LessonBankPhraseV1[] | null,
  lang: string,
  totalPhrases: number,
): PaywallMWorkshopPreview | null {
  if (!bank || bank.length < 1) return null;
  const first = bank.find((p) => typeof p.meaning?.[lang] === 'string' && p.meaning[lang].trim() !== '' && p.tokens.length >= 2);
  if (!first) return null;
  const samples = bank.map((p) => p.targetPhrase).filter((s) => typeof s === 'string' && s.trim() !== '').slice(0, MAX_SAMPLES);
  const total = Number.isFinite(totalPhrases) && totalPhrases > 0 ? Math.floor(totalPhrases) : bank.length;
  return {
    meaning: first.meaning[lang].trim(),
    tokens: first.tokens.slice(0, MAX_TOKENS),
    selected: Math.min(2, first.tokens.length - 1),
    samples,
    more: Math.max(0, total - samples.length),
  };
}
