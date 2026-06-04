import type { CardItem } from '../types';
import type { VictoriaRow } from './victoriaBundleShared';
import { mapVictoriaRowsToCardItems } from './victoriaBundleShared';
import { OFFICIAL_PHRASAL_VERBS_EN_ID } from './packIds';
import { PHRASAL_VERBS_CARDS } from './phrasal_verbs/phrasal_verbs_cards';

const ALL_CARDS: VictoriaRow[] = [
  ...PHRASAL_VERBS_CARDS,
];

export function getPhrasalVerbsBundleCards(): CardItem[] {
  return mapVictoriaRowsToCardItems(OFFICIAL_PHRASAL_VERBS_EN_ID, ALL_CARDS);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
