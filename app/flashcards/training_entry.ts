import { deckRouteParam, normalizeDeckIds, type FcDeckId } from './deck_selection';

export type CardsTrainingMode = 'blitz' | 'speaking' | 'truefalse' | 'listening';

const CARDS_TRAINING_MODES: readonly CardsTrainingMode[] = [
  'blitz',
  'speaking',
  'truefalse',
  'listening',
];

export type CardsTrainingRoute = {
  pathname: '/flashcards_blitz_session' | '/flashcards_speaking_session' | '/flashcards_swipe' | '/flashcards_listening_session';
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

export function buildCardsTrainingRoute(
  mode: CardsTrainingMode,
  selectedDeckIds: readonly FcDeckId[],
): CardsTrainingRoute | null {
  const deck = deckRouteParam(normalizeDeckIds(selectedDeckIds));
  if (!deck) return null;

  if (mode === 'blitz') {
    return { pathname: '/flashcards_blitz_session', params: { deck } };
  }
  if (mode === 'speaking') {
    return {
      pathname: '/flashcards_speaking_session',
      params: { deck, size: 'all' },
    };
  }
  if (mode === 'listening') {
    return {
      pathname: '/flashcards_listening_session',
      params: { deck, size: 'all' },
    };
  }
  return {
    pathname: '/flashcards_swipe',
    params: { deck, quick: '1' },
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
