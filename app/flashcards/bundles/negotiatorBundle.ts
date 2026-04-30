import type { CardItem } from '../types';
import type { VictoriaRow } from './victoriaBundleShared';
import { mapVictoriaRowsToCardItems } from './victoriaBundleShared';
import { OFFICIAL_NEGOTIATOR_EN_ID } from './packIds';
import { NEGOTIATOR_PART1 } from './negotiator/negotiator_part1';
import { NEGOTIATOR_PART2 } from './negotiator/negotiator_part2';
import { NEGOTIATOR_PART3 } from './negotiator/negotiator_part3';

const ALL_CARDS: VictoriaRow[] = [
  ...NEGOTIATOR_PART1,
  ...NEGOTIATOR_PART2,
  ...NEGOTIATOR_PART3,
];

export function getNegotiatorBundleCards(): CardItem[] {
  return mapVictoriaRowsToCardItems(OFFICIAL_NEGOTIATOR_EN_ID, ALL_CARDS);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
