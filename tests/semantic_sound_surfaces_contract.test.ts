import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('semantic sound surface wiring', () => {
  test('no-energy modal emits the dedicated cue only when it becomes visible', () => {
    const source = read('components/NoEnergyModal.tsx');
    expect(source).toContain("soundDirector.request('pm.energy.empty'");
    expect(source).toContain("scope: 'no-energy-modal'");
  });

  test('league result uses outcome-specific cues and keeps the neutral result silent', () => {
    const source = read('app/LeagueResultModal.tsx');
    expect(source).toContain("isPromo ? 'pm.league.promoted' : 'pm.league.demoted'");
    expect(source).toContain('if (isPromo || isDemo)');
  });

  test('purchase celebration has distinct open and finale cues', () => {
    const source = read('components/PremiumCelebrationModal.tsx');
    expect(source).toContain("variant === 'vip' ? 'pm.reward.vip_open' : 'pm.reward.premium_open'");
    expect(source).toContain("variant === 'vip' ? 'pm.reward.vip_finale' : 'pm.reward.premium_finale'");
  });
});
