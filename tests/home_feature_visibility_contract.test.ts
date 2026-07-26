import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('home feature visibility', () => {
  it('keeps the league row in Today for every resolved league state', () => {
    const source = read('app/(tabs)/home.tsx');

    expect(source).toContain('const nextHomeLeagueChest = buildHomeLeagueChest(');
    expect(source).not.toContain('shouldShowLeagueRace');
    expect(source).toContain('homeLeagueChest ?? peekHomeScreenHydration(studyTarget)?.homeLeagueChest ?? null');
  });

  it('keeps the video icon visible by default and avoids badge loading when disabled', () => {
    const source = read('components/LingmanVideosButton.tsx');

    expect(source).toContain('return { enabled: isVideoButtonEnabled() };');
    expect(source).toContain('if (!isFocused || !enabled) return;');
    expect(source).toContain('if (!enabled) return null;');
  });
});
