import type { CardItem } from '../types';
import type { VictoriaRow } from './victoriaBundleShared';
import { mapVictoriaRowsToCardItems } from './victoriaBundleShared';
import { OFFICIAL_PREP_ON_EN_ID } from './packIds';
import { PREP_ON_CARDS } from './prep_on/prep_on_cards';

const ALL_CARDS: VictoriaRow[] = [
  ...PREP_ON_CARDS,
];

export function getPrepOnBundleCards(): CardItem[] {
  return mapVictoriaRowsToCardItems(OFFICIAL_PREP_ON_EN_ID, ALL_CARDS);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
