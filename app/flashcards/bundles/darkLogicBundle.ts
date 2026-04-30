import type { CardItem } from '../types';
import type { VictoriaRow } from './victoriaBundleShared';
import { mapVictoriaRowsToCardItems } from './victoriaBundleShared';
import { OFFICIAL_DARK_LOGIC_EN_ID } from './packIds';
import { DARK_LOGIC_PART1 } from './dark_logic/dark_logic_part1';
import { DARK_LOGIC_PART2 } from './dark_logic/dark_logic_part2';
import { DARK_LOGIC_PART3 } from './dark_logic/dark_logic_part3';
import { DARK_LOGIC_PART4 } from './dark_logic/dark_logic_part4';

const ALL_CARDS: VictoriaRow[] = [
  ...DARK_LOGIC_PART1,
  ...DARK_LOGIC_PART2,
  ...DARK_LOGIC_PART3,
  ...DARK_LOGIC_PART4,
];

export function getDarkLogicBundleCards(): CardItem[] {
  return mapVictoriaRowsToCardItems(OFFICIAL_DARK_LOGIC_EN_ID, ALL_CARDS);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
