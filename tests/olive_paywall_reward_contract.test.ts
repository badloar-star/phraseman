import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Olive paywall and reward chrome', () => {
  it('uses matte Olive plan tiles without scale or closed borders', () => {
    const source = read('components/paywall/PaywallPlanTiles.tsx');
    expect(source).toContain('useTheme');
    expect(source).toContain("const isOlive = themeMode === 'olive'");
    expect(source).toContain('borderWidth: isOlive ? 0 : undefined');
    expect(source).toContain('sel && !isOlive && S.tileSelected');
    expect(source).toContain('oliveShadow');
    expect(source).toContain("isOlive && sel ? OLIVE_RICH.ivory : sel ? tc.urgencyCurrentPriceText : textPrimary");
    expect(source).toContain("backgroundColor: sel ? chrome.cardBgStrong : cardBg");
  });

  it('suppresses all reward glass and borders for Olive, even priority borders', () => {
    const source = read('components/RewardModalBackdrop.tsx');
    expect(source).toContain("if (themeMode === 'olive') return null");
    expect(source).toContain("case 'olive':");
    expect(source).toContain("return 'transparent';");
    expect(source).toContain('OLIVE_GRADIENTS.quietPanel');
    expect(source).toContain('OLIVE_GRADIENTS.primaryButton');
  });
});
