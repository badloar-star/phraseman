import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('arena season-result modal removal', () => {
  it('keeps the SeasonResultModal component and its overlay key deleted', () => {
    expect(fs.existsSync(path.join(ROOT, 'components', 'SeasonResultModal.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'app', 'components', 'SeasonResultModal.tsx'))).toBe(false);

    const arbiter = fs.readFileSync(path.join(ROOT, 'components', 'overlay_arbiter_core.ts'), 'utf8');
    expect(arbiter).not.toContain('arenaSeasonResult');

    const layout = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
    expect(layout).not.toContain('SeasonResultModal');
  });

  it('keeps the RankChangeModal component deleted (RankChangeBanner stays)', () => {
    expect(fs.existsSync(path.join(ROOT, 'components', 'RankChangeModal.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'app', 'components', 'RankChangeModal.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'components', 'RankChangeBanner.tsx'))).toBe(true);
  });

  it('keeps arena lobby/results season-modal state out of the codebase', () => {
    const appDir = path.join(ROOT, 'app');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (/\.tsx?$/.test(entry.name)) {
          const source = fs.readFileSync(full, 'utf8');
          if (
            source.includes('SeasonResultModal') ||
            source.includes('seasonEndedModal') ||
            source.includes('seasonResultVisible')
          ) {
            offenders.push(path.relative(ROOT, full));
          }
        }
      }
    };
    walk(appDir);
    expect(offenders).toEqual([]);
  });
});
