import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const playerSource = fs.readFileSync(path.join(ROOT, 'hooks', 'phrase_audio_player.ts'), 'utf8');
const regenSource = fs.readFileSync(
  path.join(ROOT, 'scripts', 'regen_phrase_audio_storage.mjs'),
  'utf8',
);

test('phrase audio disk and in-flight caches include the resolved asset URL', () => {
  expect(playerSource).toContain(
    'function phraseAudioCacheIdentity(textKey: string, url: string): string',
  );
  expect(playerSource).toContain('const key = phraseAudioCacheIdentity(textKey, url);');
  expect(playerSource).toContain('const file = cacheFileFor(key);');
  expect(playerSource).toContain('inFlightDownloads.get(key)');
});

test('regenerated phrase audio publishes a deterministic cache-busting URL version', () => {
  expect(regenSource).toContain("import crypto from 'node:crypto';");
  expect(regenSource).toContain('function versionedPublicUrl(objName, text)');
  expect(regenSource).toContain("crypto.createHash('sha256').update(text).digest('hex').slice(0, 12)");
  expect(regenSource).toContain('url: versionedPublicUrl(objName, p.newText)');
});
