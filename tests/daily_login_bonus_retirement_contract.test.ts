import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const LAYOUT_SOURCE = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
const HOME_SOURCE = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

describe('daily login XP bonus retirement', () => {
  it('does not grant XP for opening the app', () => {
    expect(LAYOUT_SOURCE).not.toContain("'daily_login_bonus'");
    expect(LAYOUT_SOURCE).not.toContain('DAILY_LOGIN_BONUS_XP_BY_DAY');
  });

  it('does not hydrate or render the retired login bonus on Home', () => {
    expect(HOME_SOURCE).not.toContain('loginBonus');
    expect(HOME_SOURCE).not.toContain('login_bonus_pending');
  });
});
