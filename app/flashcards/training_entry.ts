import { deckRouteParam, normalizeDeckIds, type FcDeckId } from './deck_selection';
import { TRAINING_TARGET_PARAM } from './fc_lang_filter';

export type CardsTrainingMode = 'blitz' | 'speaking' | 'truefalse' | 'recall';

const CARDS_TRAINING_MODES: readonly CardsTrainingMode[] = [
  'blitz',
  'speaking',
  'truefalse',
  'recall',
];

export type CardsTrainingRoute = {
  pathname:
    | '/flashcards_blitz_session'
    | '/flashcards_speaking_session'
    | '/flashcards_truefalse_session'
    | '/flashcards_recall_session';
  params: Record<string, string>;
};

export function parseCardsTrainingMode(
  raw: string | readonly string[] | undefined,
): CardsTrainingMode | null {
  if (typeof raw !== 'string') return null;
  return CARDS_TRAINING_MODES.includes(raw as CardsTrainingMode)
    ? (raw as CardsTrainingMode)
    : null;
}

// зачем (владелец 2026-09-14, «удали навсегда»): раздел «Сегодня слабое» и весь
// механизм ежедневной практики удалены, поэтому маршрут больше не принимает и не
// проставляет параметр daily — режимы работают только по выбранным наборам.
export function buildCardsTrainingRoute(
  mode: CardsTrainingMode,
  selectedDeckIds: readonly FcDeckId[],
  /** Сколько карточек в сессии: число или 'all' (экран настройки, «Карточек 10 / 20 / Все»); без значения — все. */
  size?: string,
  /** зачем (ядро, 2026-10-04): блиц — `sec` 30|60|90; вспомни и напиши — `dir` to_target|to_source. */
  extra?: { sec?: string; dir?: string; target?: string },
): CardsTrainingRoute | null {
  const deck = deckRouteParam(normalizeDeckIds(selectedDeckIds));
  if (!deck) return null;
  // зачем (п.83, cards-027): язык выбранных наборов, если он не язык приложения; без параметра маршрут прежний.
  const targetParam = extra?.target ? { [TRAINING_TARGET_PARAM]: extra.target } : {};

  if (mode === 'blitz') {
    return { pathname: '/flashcards_blitz_session', params: { deck, sec: extra?.sec || '60', ...targetParam } };
  }
  if (mode === 'speaking') {
    return { pathname: '/flashcards_speaking_session', params: { deck, size: size || 'all', ...targetParam } };
  }
  if (mode === 'recall') {
    return { pathname: '/flashcards_recall_session', params: { deck, size: size || 'all', dir: extra?.dir || 'to_target', ...targetParam } };
  }
  return { pathname: '/flashcards_truefalse_session', params: { deck, quick: '1', size: size || 'all', ...targetParam } };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
