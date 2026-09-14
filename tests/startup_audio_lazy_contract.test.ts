import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'hooks', 'use-audio.ts'), 'utf8');

test('the home startup graph does not statically evaluate the phrase audio corpus', () => {
  expect(source).not.toMatch(/import\s+\{[^}]*hasPhraseAudio[^}]*\}\s+from\s+['"]\.\/phrase_audio_player['"]/s);
  expect(source).toContain("import('./phrase_audio_player')");
  expect(source).toContain('const canUseClip = isEnglish && !requestedVoice;');
  expect(source).toContain('hasPhraseAudio(normalized)');
});
