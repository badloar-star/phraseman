import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const adminSource = fs.readFileSync(path.join(ROOT, 'app', '_admin_settings_testers.tsx'), 'utf8');
const homeSource = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');
const eventsSource = fs.readFileSync(path.join(ROOT, 'app', 'events.ts'), 'utf8');

describe('admin random streak seed', () => {
  it('offers a one-tap random 1–100 day streak seed in account settings', () => {
    expect(adminSource).toContain('testers-seed-random-streak');
    expect(adminSource).toContain('const randomStreakDays = Math.floor(Math.random() * 100) + 1;');
    expect(adminSource).toContain("AsyncStorage.setItem('streak_count', String(randomStreakDays))");
    expect(adminSource).toContain("emitAppEvent('streak_seeded', { days: randomStreakDays })");
  });

  it('refreshes the home streak card immediately after the seed', () => {
    expect(eventsSource).toContain('streak_seeded: { days: number };');
    expect(homeSource).toContain("onAppEvent('streak_seeded', () => { loadData(); })");
  });
});
