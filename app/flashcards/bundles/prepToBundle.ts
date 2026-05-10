import type { CardItem } from '../types';
import type { VictoriaRow } from './victoriaBundleShared';
import { mapVictoriaRowsToCardItems } from './victoriaBundleShared';
import { OFFICIAL_PREP_TO_EN_ID } from './packIds';
import { PREP_TO_CARDS } from './prep_to/prep_to_cards';

const ALL_CARDS: VictoriaRow[] = [
  ...PREP_TO_CARDS,
];

export function getPrepToBundleCards(): CardItem[] {
  return mapVictoriaRowsToCardItems(OFFICIAL_PREP_TO_EN_ID, ALL_CARDS);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
