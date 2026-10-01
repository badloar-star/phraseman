// зачем (Q9, координатор 01.10; D07, PM-080-A3): видео не даёт ни монет, ни рун, ни
// ускорения энергии. Плеер обязан не импортировать модули награды за просмотр —
// после этого ядро удаляет оба файла.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const player = readFileSync(new URL('../components/youtube/YoutubeInlinePlayer.tsx', import.meta.url), 'utf8');

test('the inline YouTube player does not pull watch-reward modules', () => {
  assert.doesNotMatch(player, /from ['"][^'"]*use_video_watch_energy_boost['"]/);
  assert.doesNotMatch(player, /from ['"][^'"]*video_watch_runes_client['"]/);
  assert.doesNotMatch(player, /useVideoWatchEnergyBoost|reportPlaybackSample/);
});

test('the player still drives phrase highlight and seek, and logs early exits', () => {
  assert.match(player, /publishYoutubePosition\(videoId, positionMs \/ 1000\)/);
  assert.match(player, /seekController\.markReady\(\)/);
  assert.match(player, /\[VIDEO-PLAYER\] bridge: invalid position=/);
  assert.match(player, /\[VIDEO-PLAYER\] bridge: unparsable message=/);
  assert.match(player, /\[VIDEO-PLAYER\] player error/);
});
