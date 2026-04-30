import type { CardItem } from '../types';
import type { VictoriaRow } from './victoriaBundleShared';
import { mapVictoriaRowsToCardItems } from './victoriaBundleShared';
import { OFFICIAL_WILD_WEST_EN_ID } from './packIds';
import { WILD_WEST_PART1 } from './wild_west/wild_west_part1';
import { WILD_WEST_PART2 } from './wild_west/wild_west_part2';
import { WILD_WEST_PART3 } from './wild_west/wild_west_part3';
import { WILD_WEST_PART4 } from './wild_west/wild_west_part4';
import { WILD_WEST_PART5 } from './wild_west/wild_west_part5';

const ALL_CARDS: VictoriaRow[] = [
  ...WILD_WEST_PART1,
  ...WILD_WEST_PART2,
  ...WILD_WEST_PART3,
  ...WILD_WEST_PART4,
  ...WILD_WEST_PART5,
];

export function getWildWestBundleCards(): CardItem[] {
  return mapVictoriaRowsToCardItems(OFFICIAL_WILD_WEST_EN_ID, ALL_CARDS);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
