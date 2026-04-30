import type { Lang } from '../constants/i18n';
import {
  ENERGY_MESSAGES_ES,
  ENERGY_MESSAGES_RU,
  ENERGY_MESSAGES_UK,
} from './lesson1_energy';

/** Тексты подсказок до уроков 20/21 (артикли / some-any): три локали. */
export type GrammarHintTrilingual = { textRu: string; textUk: string; textEs: string };

export function grammarHintLine(lang: Lang, hint: GrammarHintTrilingual): string {
  if (lang === 'uk') return hint.textUk;
  if (lang === 'es') return hint.textEs;
  return hint.textRu;
}

/** Минимальные поля карточки «разбор после ответа» для выбора языка. */
export type PhraseCardFaceFields = {
  correctRu: string;
  correctUk: string;
  wrongRu: string;
  wrongUk: string;
  secretRu: string;
  secretUk: string;
  correctEs?: string;
  wrongEs?: string;
  secretEs?: string;
};

/**
 * Текст основной карточки и «секрета» после проверки.
 * ES: при отсутствии *Es — запасной вариант RU (до массового перевода контента).
 */
export function phraseCardFace(
  lang: Lang,
  card: PhraseCardFaceFields,
  wasWrong: boolean,
): { main: string; secret: string } {
  if (lang === 'uk') {
    return {
      main: wasWrong ? (card.wrongUk || card.wrongRu) : (card.correctUk || card.correctRu),
      secret: card.secretUk || card.secretRu,
    };
  }
  if (lang === 'es') {
    return {
      main: wasWrong ? (card.wrongEs ?? card.wrongRu) : (card.correctEs ?? card.correctRu),
      secret: card.secretEs ?? card.secretRu,
    };
  }
  return {
    main: wasWrong ? card.wrongRu : card.correctRu,
    secret: card.secretRu,
  };
}

/** Случайное сообщение модалки нулевой энергии выбирается из этого массива. */
export function lessonEnergyMessages(lang: Lang): readonly string[] {
  if (lang === 'uk') return ENERGY_MESSAGES_UK;
  if (lang === 'es') return ENERGY_MESSAGES_ES;
  return ENERGY_MESSAGES_RU;
}
