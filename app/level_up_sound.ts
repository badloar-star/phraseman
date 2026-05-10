import { playExclusiveShortSfx } from './exclusive_short_sfx';

const LEVEL_UP_CHIMES_ASSET = require('../assets/sounds/level-up-lorenz-chimes.mp3');

/** Звук при глобальной модалке «Уровень N!» (GlobalLevelUpHandler). */
export async function playLevelUpModalSound(): Promise<void> {
  await playExclusiveShortSfx(LEVEL_UP_CHIMES_ASSET);
}
