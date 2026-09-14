import fs from 'node:fs';
import path from 'node:path';

const layout = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
const tapHandler = fs.readFileSync(path.join(__dirname, '..', 'app', 'notification_tap_handler.ts'), 'utf8');
const energy = fs.readFileSync(path.join(__dirname, '..', 'components', 'EnergyContext.tsx'), 'utf8');
const intro = fs.readFileSync(path.join(__dirname, '..', 'app', 'intro_full_access.ts'), 'utf8');
const xp = fs.readFileSync(path.join(__dirname, '..', 'app', 'xp_manager.ts'), 'utf8');
const hallOfFame = fs.readFileSync(path.join(__dirname, '..', 'app', 'hall_of_fame_utils.ts'), 'utf8');

test('boot keeps push taps available without statically evaluating the scheduling catalog', () => {
  expect(layout).not.toMatch(/from\s+['"]\.\/notifications['"]/);
  expect(layout).toContain("from './notification_tap_handler'");
  expect(layout).toContain("import('./notifications')");
  expect(tapHandler).toContain("import('expo-notifications')");
  expect(tapHandler).toContain('addNotificationResponseReceivedListener');
});

test('secondary notification callers load the catalog on demand', () => {
  expect(energy).not.toMatch(/from\s+['"]\.\.\/app\/notifications['"]/);
  expect(intro).not.toMatch(/from\s+['"]\.\/notifications['"]/);
  expect(xp).not.toMatch(/from\s+['"]\.\/notifications['"]/);
  expect(hallOfFame).not.toMatch(/from\s+['"]\.\/notifications['"]/);
  expect(energy).toContain("import('../app/notifications')");
  expect(intro).toContain("import('./notifications')");
  expect(xp).toContain("import('./notifications')");
  expect(hallOfFame).toContain("import('./notifications')");
});
