import fs from 'fs';
import path from 'path';
import {
  PAYWALL_THEME_CONFIG,
  type ThemePaywallConfig,
} from '../components/paywallThemeConfig';

const ROOT = path.join(__dirname, '..');
const THEME_MODES = [
  'dark',
  'gold',
  'minimalDark',
  'business',
  'businessLight',
  'midnight',
  'ember',
  'aurora',
  'volt',
] as const;

function alphaOf(rgba: string): number {
  const match = rgba.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\s*\)/i);
  if (!match) return Number.NaN;
  return Number(match[1]);
}

describe('paywall tonal surfaces contract', () => {
  it('defines visible borderless panel tones for every theme', () => {
    for (const themeMode of THEME_MODES) {
      const config = PAYWALL_THEME_CONFIG[themeMode] as ThemePaywallConfig & {
        panelBg?: string;
        panelBgStrong?: string;
      };

      expect(config.panelBg).toMatch(/^rgba\(/);
      expect(config.panelBgStrong).toMatch(/^rgba\(/);
      expect(alphaOf(config.panelBg ?? '')).toBeGreaterThanOrEqual(0.12);
      expect(alphaOf(config.panelBgStrong ?? '')).toBeGreaterThanOrEqual(alphaOf(config.panelBg ?? ''));
    }
  });

  it('routes shared paywall cards through theme panel tones instead of weak universal glass', () => {
    const shared = fs.readFileSync(path.join(ROOT, 'components', 'paywall', 'paywallShared.tsx'), 'utf8');

    expect(shared).toContain('cardBg: tc.panelBg');
    expect(shared).toContain('cardBgStrong: tc.panelBgStrong');
    expect(shared).not.toContain("cardBg: 'rgba(255,255,255,0.035)'");
    expect(shared).not.toContain('BlurView');
    expect(shared).not.toContain('backdropFilter');
  });

  it('keeps proof and plan cards borderless while using the shared tonal surface', () => {
    const proof = fs.readFileSync(path.join(ROOT, 'components', 'paywall', 'PaywallProofCards.tsx'), 'utf8');
    const plans = fs.readFileSync(path.join(ROOT, 'components', 'paywall', 'PaywallPlanCards.tsx'), 'utf8');
    const urgency = fs.readFileSync(path.join(ROOT, 'components', 'paywall', 'PaywallPriceUrgency.tsx'), 'utf8');

    expect(proof).toContain('backgroundColor: chrome.cardBg');
    expect(proof).toContain('borderWidth: 0');
    expect(plans).toContain('backgroundColor: sel ? chrome.cardBgStrong : cardBg');
    expect(plans).toContain('borderWidth: 0');
    expect(urgency).toContain('backgroundColor: chrome.cardBgStrong');
    expect(urgency).toContain('compactActiveWrap: { borderRadius: 18, borderWidth: 0');
  });
});
