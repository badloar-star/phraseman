/**
 * Карточка «разбор после ответа» в упражнении урока (см. lesson1.tsx + lesson_locale_utils).
 * RU/UK обязательны; *Es добавлены для локали интерфейса es (генератор PROMPT-014 заполняет все три).
 */

export interface PhraseCard {
  correctRu: string;
  correctUk: string;
  wrongRu: string;
  wrongUk: string;
  secretRu: string;
  secretUk: string;
  correctEs?: string;
  wrongEs?: string;
  secretEs?: string;
}
