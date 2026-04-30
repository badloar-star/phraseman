import type { CardItem } from '../types';
import type { VictoriaPackFile } from './victoriaBundleShared';
import { mapVictoriaRowsToCardItems } from './victoriaBundleShared';
import { OFFICIAL_PEAKY_BLINDERS_EN_ID } from './packIds';

function getJson(): VictoriaPackFile {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./official_peaky_blinders_en.json') as VictoriaPackFile;
}

export function getPeakyBlindersBundleCards(): CardItem[] {
  return mapVictoriaRowsToCardItems(OFFICIAL_PEAKY_BLINDERS_EN_ID, getJson().cards);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
