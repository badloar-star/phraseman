import type { CardItem } from '../types';
import type { VictoriaRow } from './victoriaBundleShared';
import { mapVictoriaRowsToCardItems } from './victoriaBundleShared';
import { OFFICIAL_PREP_IN_EN_ID } from './packIds';
import { PREP_IN_CARDS } from './prep_in/prep_in_cards';

const ALL_CARDS: VictoriaRow[] = [
  ...PREP_IN_CARDS,
];

export function getPrepInBundleCards(): CardItem[] {
  return mapVictoriaRowsToCardItems(OFFICIAL_PREP_IN_EN_ID, ALL_CARDS);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
