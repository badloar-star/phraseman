import fs from 'fs';
import path from 'path';

describe('current league icon content alignment', () => {
  it('centers the copper league heraldry by visible content, not by transparent asset bounds', () => {
    const screenSource = fs.readFileSync(path.join(process.cwd(), 'app', 'club_screen.tsx'), 'utf8');
    const engineSource = fs.readFileSync(path.join(process.cwd(), 'app', 'league_engine.ts'), 'utf8');

    expect(engineSource).toContain('lig-med-heraldry-transparent.png');
    expect(screenSource).toContain('LEAGUE_ICON_SOURCE_SIZE = 384');
    expect(screenSource).toContain('0: { x: -13, y: -14 }');
    expect(screenSource).toContain('getLeagueIconContentOffset(Number(league?.id), size)');
    expect(screenSource).toContain('translateX: contentOffset.x');
    expect(screenSource).toContain('translateY: contentOffset.y');
  });

  it('does not render vector fallback underneath transparent bundled heraldry images', () => {
    const screenSource = fs.readFileSync(path.join(process.cwd(), 'app', 'club_screen.tsx'), 'utf8');
    const componentStart = screenSource.indexOf('function LeagueIconImageWithFallback');
    const componentEnd = screenSource.indexOf('function LeagueBonusGiftImageWithFallback');
    const componentSource = screenSource.slice(componentStart, componentEnd);

    expect(componentSource).toContain('const [failed, setFailed] = useState(false)');
    expect(componentSource).toContain('(!source || failed)');
    expect(componentSource).not.toContain('!loaded || !source');
  });
});
