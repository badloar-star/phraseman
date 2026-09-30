import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Olive paywall and reward chrome', () => {
  // Плитки тарифов (PaywallPlanTiles) удалены 2026-09-30 вместе с пейволами A–G.
  it('suppresses all reward glass and borders for Olive, even priority borders', () => {
    const source = read('components/RewardModalBackdrop.tsx');
    expect(source).toContain("if (themeMode === 'olive') return null");
    expect(source).toContain("case 'olive':");
    expect(source).toContain("return 'transparent';");
    expect(source).toContain('OLIVE_GRADIENTS.quietPanel');
    expect(source).toContain('OLIVE_GRADIENTS.primaryButton');
  });
});
