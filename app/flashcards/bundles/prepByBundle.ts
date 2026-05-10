import type { CardItem } from '../types';
import type { VictoriaRow } from './victoriaBundleShared';
import { mapVictoriaRowsToCardItems } from './victoriaBundleShared';
import { OFFICIAL_PREP_BY_EN_ID } from './packIds';
import { PREP_BY_CARDS } from './prep_by/prep_by_cards';

const ALL_CARDS: VictoriaRow[] = [
  ...PREP_BY_CARDS,
];

export function getPrepByBundleCards(): CardItem[] {
  return mapVictoriaRowsToCardItems(OFFICIAL_PREP_BY_EN_ID, ALL_CARDS);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
