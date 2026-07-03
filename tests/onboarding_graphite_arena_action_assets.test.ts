import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const ACTIONS = ['match', 'friend', 'throne'] as const;

describe('legacy onboarding graphite arena action assets', () => {
  test('arena action registry uses minimalDark assets and rejects onboarding-graphite leftovers', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app/arena_action_icons.ts'), 'utf8');

    expect(source).not.toContain('onboarding-graphite');
    for (const action of ACTIONS) {
      expect(source).toContain(
        `require('../assets/images/arena_actions/arena-action-${action}-minimalDark.webp')`,
      );
    }
  });
});
