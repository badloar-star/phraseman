import type { CardItem } from '../types';
import type { VictoriaRow } from './victoriaBundleShared';
import { mapVictoriaRowsToCardItems } from './victoriaBundleShared';
import { OFFICIAL_PREP_AT_EN_ID } from './packIds';
import { PREP_AT_CARDS } from './prep_at/prep_at_cards';

const ALL_CARDS: VictoriaRow[] = [
  ...PREP_AT_CARDS,
];

export function getPrepAtBundleCards(): CardItem[] {
  return mapVictoriaRowsToCardItems(OFFICIAL_PREP_AT_EN_ID, ALL_CARDS);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
