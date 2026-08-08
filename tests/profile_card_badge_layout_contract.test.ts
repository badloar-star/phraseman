import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function read(...parts: string[]) {
  return fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
}

describe('profile card badge compact list layout', () => {
  const compactRows = [
    {
      name: 'top helpers',
      source: read('app', 'top_helpers.tsx'),
      expectedBadge: '<ProfileCardBadge level={item.profileCardLevel} theme={item.profileCardTheme} style={{ marginTop: 3 }} />',
    },
    {
      name: 'friends',
      source: read('app', '(tabs)', 'friends.tsx'),
      expectedBadge: '<ProfileCardBadge level={profile.profileCardLevel} theme={profile.profileCardTheme} style={{ marginTop: 3 }} />',
    },
    {
      name: 'club leaderboard',
      source: read('app', 'club_screen.tsx'),
      expectedBadge: '<ProfileCardBadge level={p.profileCardLevel} theme={p.profileCardTheme} style={{ marginTop: 3 }} />',
    },
  ];

  it('does not retain the retired Arena leaderboard surface', () => {
    expect(fs.existsSync(path.join(ROOT, 'app', 'arena_leaderboard.tsx'))).toBe(false);
  });

  test.each(compactRows)('$name stacks profile card badge below a clipped name', ({ source, expectedBadge }) => {
    expect(source).toMatch(/style=\{\{ minWidth: 0,(?: maxWidth: '100%',)? overflow: 'hidden' \}\}/);
    expect(source).toContain("style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden' }}");
    expect(
      source.includes(expectedBadge)
        || source.includes(expectedBadge.replace(' }} />', ", maxWidth: '100%' }} />")),
    ).toBe(true);
  });
});
