import type { CardItem } from '../types';
import type { VictoriaRow } from './victoriaBundleShared';
import { mapVictoriaRowsToCardItems } from './victoriaBundleShared';
import { OFFICIAL_ROYAL_TEA_EN_ID } from './packIds';
import { ROYAL_TEA_PART1 } from './royal_tea/royal_tea_part1';
import { ROYAL_TEA_PART2 } from './royal_tea/royal_tea_part2';
import { ROYAL_TEA_PART3 } from './royal_tea/royal_tea_part3';
import { ROYAL_TEA_PART4 } from './royal_tea/royal_tea_part4';

const ALL_CARDS: VictoriaRow[] = [
  ...ROYAL_TEA_PART1,
  ...ROYAL_TEA_PART2,
  ...ROYAL_TEA_PART3,
  ...ROYAL_TEA_PART4,
];

export function getRoyalTeaBundleCards(): CardItem[] {
  return mapVictoriaRowsToCardItems(OFFICIAL_ROYAL_TEA_EN_ID, ALL_CARDS);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
