import fs from 'fs';
import path from 'path';

describe('useCorrectSound', () => {
  test('routes the compatibility callback through the independent correct cue', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'hooks', 'use-correct-sound.ts'), 'utf8');

    expect(source).toContain("import { soundDirector } from '../modules/audio/sound_director';");
    expect(source).toContain("soundDirector.request('pm.learn.correct');");
  });
});
