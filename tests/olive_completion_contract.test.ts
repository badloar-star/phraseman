import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('Olive completion surfaces', () => {

  it('keeps the remaining Olive shells explicit and matte', () => {
    for (const file of [
      'app/lingman_youtube_chrome.ts',
      'app/level_exam.tsx',
    ]) expect(read(file)).toContain("themeMode === 'olive'");
  });
});
