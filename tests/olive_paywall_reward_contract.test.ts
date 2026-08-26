import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Olive paywall and reward chrome', () => {
  it('uses matte Olive plan tiles without scale or closed borders', () => {
    const source = read('components/paywall/PaywallPlanTiles.tsx');
    expect(source).toContain('useTheme');
    expect(source).toContain("const isOlive = themeMode === 'olive'");
    // зачем (запрет владельца на обводки, 2026-08-26): рамка плиток убрана во
    // ВСЕХ темах, а не только в оливковой — прежняя строка
    // `borderWidth: isOlive ? 0 : undefined` больше не нужна. Требование
    // контракта усилено: borderWidth: 0 в стиле и ни одного borderColor.
    expect(source).toContain('borderWidth: 0');
    expect(source).not.toContain('borderColor');
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
