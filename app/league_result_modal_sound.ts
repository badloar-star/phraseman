import { playExclusiveShortSfx } from './exclusive_short_sfx';

const LEAGUE_MOVEMENT_ASSET = require('../assets/sounds/league-movement-notification.mp3');

/** Звук при смене лиги (повышение / понижение) в LeagueResultModal, синхронно с блоком перехода. */
export async function playLeagueMovementModalSound(): Promise<void> {
  await playExclusiveShortSfx(LEAGUE_MOVEMENT_ASSET);
}
