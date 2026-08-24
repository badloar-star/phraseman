import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const cutoverUiFiles = [
  'app/(tabs)/home.tsx',
  'app/(tabs)/lessons.tsx',
  'app/(tabs)/settings.tsx',
  'app/achievements.ts',
  'app/achievements_screen.tsx',
  'components/EnergyContext.tsx',
  'components/DialogsTabContent.tsx',
  'app/public_profile_snapshot.ts',
];

test('cutover UI modules do not read core progress directly from AsyncStorage', () => {
  const violations: string[] = [];
  for (const file of cutoverUiFiles) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const key of ['user_total_xp', 'streak_count']) {
      const directGet = new RegExp(`AsyncStorage\\.getItem\\(\\s*['\"]${key}['\"]`).test(source);
      const directMultiGet = [...source.matchAll(/AsyncStorage\.multiGet\(\s*\[([\s\S]{0,500}?)\]\s*\)/g)]
        .some((match) => new RegExp(`['\"]${key}['\"]`).test(match[1]));
      if (directGet || directMultiGet) {
        violations.push(`${file}:${key}`);
      }
    }
  }
  expect(violations).toEqual([]);
});
