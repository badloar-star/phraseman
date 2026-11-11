/**
 * Реестр банков заданий по языкам обучения. Владелец 11.11.2026: «оно должно работать на всех языках».
 *
 * зачем: язык связывается с заданиями в ОДНОМ месте. Чтобы игра заработала для нового языка, достаточно положить
 * файл банка рядом и добавить одну запись сюда — подбор заданий, разминка и экраны игр не меняются.
 * Игра, для которой у языка нет заданий, в разминку этого языка не попадает (человек не получает чужой язык).
 * Ключ записи — номер урока; для уроков старше берётся ближайший предыдущий.
 */
import { HUNT_SEED_TASKS, ORDER_SEED_TASKS, type HuntTask, type OrderTask } from '../dialogue_core';
import type { OddWordTask } from '../odd_word_core';
import { QUIZ_SEED_DECKS, type QuizRound } from '../quiz_core';
import type { SortDeck } from '../sort_core';
import { EXACT_BANK_EN } from './exact_en';
import { FORMS_BANK_EN } from './forms_en';
import { ODD_WORD_BANK_EN } from './odd_word_en';
import { SORT_BANK_EN } from './sort_en';

type ByLesson<T> = Readonly<Record<number, T>>;

export interface GameBank {
  readonly oddWord?: ByLesson<readonly OddWordTask[]>;
  readonly sort?: ByLesson<SortDeck>;
  readonly exact?: ByLesson<readonly QuizRound[]>;
  /** Формы глагола не привязаны к уроку: один список на язык. Нет у языка такой игры — поле не задаётся. */
  readonly forms?: readonly QuizRound[];
  readonly listen?: ByLesson<readonly QuizRound[]>;
  readonly memory?: ByLesson<readonly QuizRound[]>;
  readonly hunt?: ByLesson<readonly HuntTask[]>;
  readonly order?: ByLesson<readonly OrderTask[]>;
}

export const GAME_BANKS: Readonly<Record<string, GameBank>> = {
  en: {
    oddWord: ODD_WORD_BANK_EN,
    sort: SORT_BANK_EN,
    exact: EXACT_BANK_EN,
    forms: FORMS_BANK_EN,
    // «На слух», «Память», «Охота на ошибку», «Собери диалог» — пока примеры из макета, с первого урока
    listen: { 1: QUIZ_SEED_DECKS.listen.rounds },
    memory: { 1: QUIZ_SEED_DECKS.memory.rounds },
    hunt: { 1: HUNT_SEED_TASKS },
    order: { 1: ORDER_SEED_TASKS },
  },
};

export function gameBankFor(studyTarget: string): GameBank | null {
  return Object.prototype.hasOwnProperty.call(GAME_BANKS, studyTarget) ? GAME_BANKS[studyTarget] : null;
}
