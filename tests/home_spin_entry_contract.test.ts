import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const homeSource = readFileSync(join(process.cwd(), 'app', '(tabs)', 'home.tsx'), 'utf8');

describe('Home Spin retirement', () => {
  test('does not expose the retired level-spin route or home entry', () => {
    expect(existsSync(join(process.cwd(), 'app', 'level_reward_spin.tsx'))).toBe(false);
    expect(existsSync(join(process.cwd(), 'app', 'level_reward_spin'))).toBe(false);
    expect(homeSource).not.toContain('home-spin-fab');
    expect(homeSource).not.toContain('home-spin-fab-button');
    expect(homeSource).not.toContain('home-spin-fab-count');
  });

  test('keeps current home independent of retired spin state', () => {
    expect(homeSource).toContain('export default');
    expect(homeSource).not.toContain('homeSpinBalance');
    expect(homeSource).not.toContain('level_reward_spin');
  });
});
