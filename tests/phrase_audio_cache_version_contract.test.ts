import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const playerSource = fs.readFileSync(path.join(ROOT, 'hooks', 'phrase_audio_player.ts'), 'utf8');
test('phrase audio disk and in-flight caches include the resolved asset URL', () => {
  expect(playerSource).toContain(
    'function phraseAudioCacheIdentity(textKey: string, url: string): string',
  );
  expect(playerSource).toContain('const key = phraseAudioCacheIdentity(textKey, url);');
  expect(playerSource).toContain('const file = cacheFileFor(key);');
  expect(playerSource).toContain('inFlightDownloads.get(key)');
});
