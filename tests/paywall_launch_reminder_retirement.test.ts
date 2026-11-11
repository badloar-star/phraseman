import fs from 'node:fs';
import path from 'node:path';
import { PAYWALL_SOURCE_VALUES } from '../app/paywall_entry_contract';

const root = path.join(__dirname, '..');

it('accepts legacy links to the shared paywall while the launch reminder is retired', () => {
  expect(PAYWALL_SOURCE_VALUES).toContain('plus_launch_splash');
  expect(fs.existsSync(path.join(root, 'components/plus-splash/PlusLaunchSplashHost.tsx'))).toBe(false);
  const arbiter = fs.readFileSync(path.join(root, 'components/overlay_arbiter_core.ts'), 'utf8');
  expect(arbiter).not.toContain('plusSplash');
});
