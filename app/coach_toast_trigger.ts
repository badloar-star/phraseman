// ═══════════════════════════════════════════════════════════════════════════
// coach_toast_trigger.ts — Определяет нужно ли показать тост Problem Coach
//
// После сессии повторения передаём список неверно отвеченных фраз.
// Если топ-категория имеет >= MIN_SESSION_MISTAKES ошибок — показываем тост.
// ═══════════════════════════════════════════════════════════════════════════

import { getTopCategoryForPhrases, type WordCategory } from './phrase_analytics';

export interface CoachToastResult {
  show: true;
  category: WordCategory;
  labelRu: string;
  labelUk: string;
  labelEs: string;
  mistakeCount: number;
}

export interface CoachToastNoShow {
  show: false;
}

export type CoachToastDecision = CoachToastResult | CoachToastNoShow;

const MIN_SESSION_MISTAKES = 2;

const CATEGORY_LABELS: Record<WordCategory, { ru: string; uk: string; es: string }> = {
  verb:             { ru: 'Глаголы',            uk: 'Дієслова',            es: 'Verbos' },
  noun:             { ru: 'Существительные',     uk: 'Іменники',            es: 'Sustantivos' },
  pronoun:          { ru: 'Местоимения',         uk: 'Займенники',          es: 'Pronombres' },
  adjective:        { ru: 'Прилагательные',      uk: 'Прикметники',         es: 'Adjetivos' },
  adverb:           { ru: 'Наречия',             uk: 'Прислівники',         es: 'Adverbios' },
  preposition:      { ru: 'Предлоги',            uk: 'Прийменники',         es: 'Preposiciones' },
  article:          { ru: 'Артикли',             uk: 'Артиклі',             es: 'Artículos' },
  'to-be':          { ru: 'Глагол to be',        uk: 'Дієслово to be',      es: 'Verbo to be' },
  conjunction:      { ru: 'Союзы',               uk: 'Сполучники',          es: 'Conjunciones' },
  modal:            { ru: 'Модальные глаголы',   uk: 'Модальні дієслова',   es: 'Verbos modales' },
  phrasal_particle: { ru: 'Фразовые частицы',    uk: 'Фразові частки',      es: 'Partículas verbales' },
  other:            { ru: 'Другое',              uk: 'Інше',                es: 'Otro' },
};

/**
 * Анализирует фразы-ошибки сессии.
 * wrongPhrases — английские фразы, в которых пользователь ошибся.
 */
export function checkCoachToastNeeded(wrongPhrases: string[]): CoachToastDecision {
  if (wrongPhrases.length < MIN_SESSION_MISTAKES) return { show: false };

  try {
    const top = getTopCategoryForPhrases(wrongPhrases, MIN_SESSION_MISTAKES);
    if (!top) return { show: false };

    const label = CATEGORY_LABELS[top.category];
    return {
      show: true,
      category: top.category,
      labelRu: label.ru,
      labelUk: label.uk,
      labelEs: label.es,
      mistakeCount: top.count,
    };
  } catch {
    return { show: false };
  }
}
