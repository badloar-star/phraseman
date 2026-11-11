/**
 * Реестр банков заданий по языкам обучения. Владелец 11.11.2026: «оно должно работать на всех языках».
 *
 * зачем: язык связывается с заданиями в ОДНОМ месте. Чтобы игра заработала для нового языка, достаточно положить
 * файл банка рядом и добавить одну запись сюда — подбор заданий, разминка и экраны игр не меняются.
 * Игра, для которой у языка нет заданий, в разминку этого языка не попадает (человек не получает чужой язык).
 * Ключ записи — номер урока; для уроков старше берётся ближайший предыдущий.
 */
import { ORDER_SEED_TASKS, type HuntTask, type OrderTask } from '../dialogue_core';
import type { OddWordTask } from '../odd_word_core';
import type { QuizRound } from '../quiz_core';
import type { SortDeck } from '../sort_core';
import { EXACT_BANK_EN } from './exact_en';
import { FORMS_BANK_EN } from './forms_en';
import { HUNT_BANK_EN } from './hunt_en';
import { LISTEN_BANK_EN } from './listen_en';
import { MEMORY_BANK_EN } from './memory_en';
import { ODD_WORD_BANK_EN } from './odd_word_en';
import { ORDER_BANK_EN } from './order_en';
import { SORT_BANK_EN } from './sort_en';
// испанский и итальянский: «Трёх форм» нет — это английская особенность
import { EXACT_BANK_ES } from './exact_es';
import { HUNT_BANK_ES } from './hunt_es';
import { LISTEN_BANK_ES } from './listen_es';
import { MEMORY_BANK_ES } from './memory_es';
import { ODD_WORD_BANK_ES } from './odd_word_es';
import { ORDER_BANK_ES } from './order_es';
import { SORT_BANK_ES } from './sort_es';
import { EXACT_BANK_IT } from './exact_it';
import { HUNT_BANK_IT } from './hunt_it';
import { LISTEN_BANK_IT } from './listen_it';
import { MEMORY_BANK_IT } from './memory_it';
import { ODD_WORD_BANK_IT } from './odd_word_it';
import { ORDER_BANK_IT } from './order_it';
import { SORT_BANK_IT } from './sort_it';
// немецкий и французский: «Три формы» есть только у немецкого (gehen — ging — gegangen)
import { EXACT_BANK_DE } from './exact_de';
import { FORMS_BANK_DE } from './forms_de';
import { HUNT_BANK_DE } from './hunt_de';
import { LISTEN_BANK_DE } from './listen_de';
import { MEMORY_BANK_DE } from './memory_de';
import { ODD_WORD_BANK_DE } from './odd_word_de';
import { ORDER_BANK_DE } from './order_de';
import { SORT_BANK_DE } from './sort_de';
import { EXACT_BANK_FR } from './exact_fr';
import { HUNT_BANK_FR } from './hunt_fr';
import { LISTEN_BANK_FR } from './listen_fr';
import { MEMORY_BANK_FR } from './memory_fr';
import { ODD_WORD_BANK_FR } from './odd_word_fr';
import { ORDER_BANK_FR } from './order_fr';
import { SORT_BANK_FR } from './sort_fr';

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
    listen: LISTEN_BANK_EN,
    memory: MEMORY_BANK_EN,
    hunt: HUNT_BANK_EN,
    // зачем: в уроке 1 одни утверждения — диалог с однозначным порядком из его слов собрать нельзя, поэтому на уроке 1
    // остаётся утверждённый владельцем пример из макета; с урока 2 идут диалоги банка (решение по уроку 1 — за владельцем)
    order: { 1: ORDER_SEED_TASKS, ...ORDER_BANK_EN },
  },
  es: {
    oddWord: ODD_WORD_BANK_ES,
    sort: SORT_BANK_ES,
    exact: EXACT_BANK_ES,
    listen: LISTEN_BANK_ES,
    memory: MEMORY_BANK_ES,
    hunt: HUNT_BANK_ES,
    order: ORDER_BANK_ES,
  },
  it: {
    oddWord: ODD_WORD_BANK_IT,
    sort: SORT_BANK_IT,
    exact: EXACT_BANK_IT,
    listen: LISTEN_BANK_IT,
    memory: MEMORY_BANK_IT,
    hunt: HUNT_BANK_IT,
    order: ORDER_BANK_IT,
  },
  // зачем: «Собери диалог» у немецкого идёт с урока 4, у французского — с урока 3: в более ранних уроках одни
  // утверждения, однозначный порядок реплик из их слов не собрать (английский пример из макета сюда не ставим — чужой язык)
  de: {
    oddWord: ODD_WORD_BANK_DE,
    sort: SORT_BANK_DE,
    exact: EXACT_BANK_DE,
    forms: FORMS_BANK_DE,
    listen: LISTEN_BANK_DE,
    memory: MEMORY_BANK_DE,
    hunt: HUNT_BANK_DE,
    order: ORDER_BANK_DE,
  },
  fr: {
    oddWord: ODD_WORD_BANK_FR,
    sort: SORT_BANK_FR,
    exact: EXACT_BANK_FR,
    listen: LISTEN_BANK_FR,
    memory: MEMORY_BANK_FR,
    hunt: HUNT_BANK_FR,
    order: ORDER_BANK_FR,
  },
};

export function gameBankFor(studyTarget: string): GameBank | null {
  return Object.prototype.hasOwnProperty.call(GAME_BANKS, studyTarget) ? GAME_BANKS[studyTarget] : null;
}
