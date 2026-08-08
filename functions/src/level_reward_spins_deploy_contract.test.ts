import { readFileSync } from 'fs';
import { join } from 'path';

describe('level reward spin deploy manifest', () => {
  test('deploy:safe contains every exported spin callable', () => {
    const index = readFileSync(join(__dirname, 'index.ts'), 'utf8');
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const exported = [
      'levelRewardSpinStatus',
      'levelRewardSpinClaim',
      'levelRewardSpinAcknowledge',
      'levelRewardSpinDelivery',
      'levelRewardSpinEnrollV1',
      'levelSpinActivatePackGift',
    ];
    for (const callable of exported) {
      expect(index).toContain(callable);
      expect(pkg.scripts['deploy:safe']).toContain(`functions:${callable}`);
    }
  });
});
