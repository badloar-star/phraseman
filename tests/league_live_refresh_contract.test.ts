import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('league participant progress refresh', () => {
  it('forces a fresh group read whenever the league screen regains focus', () => {
    const source = read('app/club_screen.tsx');
    expect(source).toContain('useFocusEffect(');
    expect(source).toContain('void loadData({ forceRemote: true });');
  });

  it('materializes synthetic participant progress hourly', () => {
    expect(read('functions/src/league_residents_cron.ts')).toContain("schedule: 'every 1 hours'");
    expect(read('functions/src/synthetic_residents.ts')).toContain('export const RESIDENT_TICK_MS = 60 * 60 * 1000;');
    expect(read('constants/synthetic_residents.ts')).toContain('export const RESIDENT_TICK_MS = 60 * 60 * 1000;');
  });
});
