import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const ARENA_LOBBY_PATH = path.join(ROOT, 'app', 'arena_lobby.tsx');

function readArenaLobbySource(): string {
  return fs.readFileSync(ARENA_LOBBY_PATH, 'utf8');
}

function extractStyleBlock(source: string, styleName: string): string {
  const marker = `    ${styleName}: {`;
  const start = source.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);

  const nextStyle = source.indexOf('\n    ', start + marker.length);
  const end = source.indexOf('\n    arenaLaunchTextWrap', start);
  if (styleName === 'arenaLaunchIconWrap') {
    expect(end).toBeGreaterThan(start);
    return source.slice(start, end);
  }

  const commandEnd = source.indexOf('\n    arenaCommandActionIcon', start);
  expect(commandEnd).toBeGreaterThan(start);
  return source.slice(start, commandEnd || nextStyle);
}

describe('arena lobby copy', () => {
  it('describes friend invite as a match instead of a fight', () => {
    const source = readArenaLobbySource();

    expect(source).toContain("ru: 'Матч по приглашению'");
    expect(source).not.toContain('Личный бой по приглашению');
  });

  it('does not show an info badge on the day throne card', () => {
    const source = readArenaLobbySource();

    expect(source).not.toContain("ru: 'Инфо'");
    expect(source).not.toContain('styles.arenaInfoBadge');
  });

  it('does not expose the English Ranked label in the lobby chrome', () => {
    const source = readArenaLobbySource();

    expect(source).not.toContain("ru: 'Ranked'");
    expect(source).not.toContain("uk: 'Ranked'");
    expect(source).not.toContain("es: 'Ranked'");
    expect(source).not.toContain('id: "Ranked"');
  });

  it('does not show a Premium unlimited cost badge under the arena CTA', () => {
    const source = readArenaLobbySource();

    expect(source).not.toContain('Premium без');
    expect(source).not.toContain('Premium ilimitado');
    expect(source).not.toContain('Premium sem limite');
    expect(source).not.toContain('Sınırsız Premium');
  });

  it('keeps arena action icon wrappers free of visual backplates', () => {
    const source = readArenaLobbySource();
    const launchIconWrap = extractStyleBlock(source, 'arenaLaunchIconWrap');
    const commandIconWrap = extractStyleBlock(source, 'arenaCommandIcon');

    for (const block of [launchIconWrap, commandIconWrap]) {
      expect(block).toContain("backgroundColor: 'transparent'");
      expect(block).toContain('borderWidth: 0');
      expect(block).toContain('shadowOpacity: 0');
      expect(block).toContain('shadowRadius: 0');
      expect(block).toContain('elevation: 0');
    }
  });
});
