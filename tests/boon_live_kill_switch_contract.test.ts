import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function source(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Weekly Boons live kill-switch contract', () => {
  it.each([
    'components/BoonActivatedHost.tsx',
    'components/MysteryMondayHost.tsx',
    'components/PerfectWeekHost.tsx',
  ])('%s subscribes to Remote Config changes and evicts queued UI', (relativePath) => {
    const text = source(relativePath);
    expect(text).toContain("onAppEvent('remote_config_changed'");
    expect(text).toContain('setWantShow(false)');
  });

  it('re-checks mystery Monday at the claim boundary', () => {
    const text = source('components/MysteryMondayHost.tsx');
    const claim = text.slice(text.indexOf('const claim = async'), text.indexOf('if (!visible'));
    expect(claim).toContain("isPrimaryBoonActive('mystery_monday')");
  });

  it('re-checks perfect week at eligibility and grant boundaries', () => {
    const eligibility = source('app/boons/perfect_week.ts');
    const host = source('components/PerfectWeekHost.tsx');
    const claim = host.slice(host.indexOf('const claim = useCallback'), host.indexOf('const title'));
    expect(eligibility.match(/getTodaysBoons\(\)\.modifiers\.includes\('perfect_week'\)/g)).toHaveLength(2);
    expect(claim).toContain("isBoonModifierActive('perfect_week')");
  });

  it('re-checks every deferred bootstrap write before applying it', () => {
    const text = source('app/boons/boon_bootstrap.ts');
    expect(text).toContain('isPrimaryBoonActive(expectedPrimary, todayKey)');
    expect(text.match(/isCurrentPrimary\(/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });
});
