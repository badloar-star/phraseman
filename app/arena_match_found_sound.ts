import { playExclusiveShortSfx } from './exclusive_short_sfx';

const ARENA_MATCH_FOUND_ASSET = require('../assets/sounds/arena-match-found.mp3');

/** Короткий звук при найденном матче (арена). Безопасно глотает ошибки (нет динамика / фон). */
export async function playArenaMatchFoundSound(): Promise<void> {
  await playExclusiveShortSfx(ARENA_MATCH_FOUND_ASSET);
}
