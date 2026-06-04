import type { CardItem } from '../types';
import type { VictoriaRow } from './victoriaBundleShared';
import { mapVictoriaRowsToCardItems } from './victoriaBundleShared';
import { OFFICIAL_MOVIE_SERIES_EN_ID } from './packIds';
import { MOVIE_SERIES_CARDS } from './movie_series/movie_series_cards';

const ALL_CARDS: VictoriaRow[] = [
  ...MOVIE_SERIES_CARDS,
];

export function getMovieSeriesBundleCards(): CardItem[] {
  return mapVictoriaRowsToCardItems(OFFICIAL_MOVIE_SERIES_EN_ID, ALL_CARDS);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
