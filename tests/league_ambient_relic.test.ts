import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

describe('League ambient knowledge relic', () => {
  const componentPath = path.join(ROOT, 'components', 'league', 'LeagueAmbientRelic.tsx');

  it('uses one quiet transform-only UI-thread loop with lifecycle guards', () => {
    expect(fs.existsSync(componentPath)).toBe(true);
    const source = fs.readFileSync(componentPath, 'utf8');

    expect(source).toContain('pointerEvents="none"');
    expect(source).toContain('accessible={false}');
    expect(source).toContain('AMBIENT_RELIC_OPACITY = 0.07');
    expect(source).toContain('AMBIENT_RELIC_WIDTH_RATIO = 1.2');
    expect(source).toContain('withRepeat(');
    expect(source).toContain('withSequence(');
    expect(source).toContain('withTiming(');
    expect(source).toContain('cancelAnimation(motion)');
    expect(source).toMatch(/!active\s*\|\|\s*reduceMotion/);
    expect(source).toContain('translateY: -8 * motion.value');
    expect(source).toContain('scale: 1 + 0.015 * motion.value');
    expect(source).not.toContain('rotate');
    expect(source).not.toContain('setInterval');
    expect(source).not.toContain('setTimeout');
  });

  it('is wired behind the League screen and nowhere in Arena', () => {
    const leagueScreen = fs.readFileSync(path.join(ROOT, 'app', 'club_screen.tsx'), 'utf8');
    expect(leagueScreen).toContain("import { LeagueAmbientRelic } from '../components/league/LeagueAmbientRelic';");
    expect(leagueScreen).toContain('<LeagueAmbientRelic');
    expect(leagueScreen).toContain('source={myLeague.imageUri}');
    expect(leagueScreen).toContain('active={runtimeActive}');
    expect(leagueScreen).toContain('reduceMotion={reduceMotion}');
    expect(leagueScreen).toContain('viewportWidth={viewportWidth}');

    const arenaFiles = [
      path.join(ROOT, 'app', 'arena.tsx'),
      path.join(ROOT, 'app', 'arena_match.tsx'),
      path.join(ROOT, 'app', 'arena_matchmaking.tsx'),
    ].filter(fs.existsSync);
    for (const arenaFile of arenaFiles) {
      expect(fs.readFileSync(arenaFile, 'utf8')).not.toContain('LeagueAmbientRelic');
    }
  });
});
