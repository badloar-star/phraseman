import fs from 'fs';
import path from 'path';

function read(...parts: string[]): string {
  return fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');
}

describe('tester_no_limits precedence and production fuse', () => {
  const premiumGuard = read('app', 'premium_guard.ts');
  const premiumContext = read('components', 'PremiumContext.tsx');
  const lessonsTabState = read('app', 'lessons_tab_state.ts');

  test('central helper makes tester_no_premium win and rejects store releases', () => {
    expect(premiumGuard).toContain('export async function isTesterNoLimitsActive');
    expect(premiumGuard).toContain("AsyncStorage.multiGet(['tester_no_premium', 'tester_no_limits'])");
    expect(premiumGuard).toContain("noPremiumRaw !== 'true'");
    expect(premiumGuard).toContain("noLimitsRaw === 'true'");
    expect(premiumGuard).toContain('!IS_STORE_RELEASE');

    expect(premiumContext).toContain("AsyncStorage.multiGet(['tester_no_premium', 'tester_no_limits'])");
    expect(premiumContext).toContain('!noPremiumTester');
    expect(premiumContext).toContain('!IS_STORE_RELEASE');
  });

  test('lesson snapshot applies the same precedence before exposing noLimits', () => {
    expect(lessonsTabState).toContain("'tester_no_premium'");
    expect(lessonsTabState).toContain("map.tester_no_premium !== 'true'");
    expect(lessonsTabState).toContain("map.tester_no_limits === 'true'");
    expect(lessonsTabState).toContain('!IS_STORE_RELEASE');
  });

  test.each([
    ['app', 'lesson_premium_gate.ts'],
    ['app', 'lesson_menu.tsx'],
    ['app', 'level_exam.tsx'],
    ['app', 'lesson1.tsx'],
    ['components', 'EnergyContext.tsx'],
  ])('%s/%s uses the central active override instead of a raw flag', (...parts) => {
    const source = read(...parts);
    expect(source).toContain('isTesterNoLimitsActive');
    expect(source).not.toContain("getItem('tester_no_limits')");
  });
});
