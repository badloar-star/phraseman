import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'components/SoftContextualUpsellCard.tsx'), 'utf8');

describe('soft contextual upsell presentation contract', () => {
  it('preserves the inline lesson card and adds an explicit global modal presentation', () => {
    expect(source).toContain("presentation?: 'inline' | 'modal'");
    expect(source).toContain("presentation = 'inline'");
    expect(source).toContain("presentation === 'inline'");
    expect(source).toContain('<TonalSurface');
    expect(source).toMatch(/\bModal\b/);
    expect(source).toContain('testID="soft-upsell-card"');
  });

  it('keeps responsive modal geometry and a single dominant dark-text gold CTA', () => {
    expect(source).toContain('useWindowDimensions');
    expect(source).toContain('useSafeAreaInsets');
    expect(source).toMatch(/maxWidth:\s*560/);
    expect(source).toContain('isTablet');
    expect(source).toMatch(/minHeight:\s*52/);
    expect(source).toMatch(/width:\s*'100%'/);
    expect(source).toContain("color: '#07110A'");
    expect(source).toContain('t.correctText');
  });

  it('uses finite reduced-motion-aware animation and idempotent modal actions', () => {
    expect(source).toContain('useReducedMotion');
    expect(source).toContain('withTiming');
    expect(source).toContain('withDelay');
    expect(source).not.toMatch(/withRepeat|Animated\.loop|setInterval/);
    expect(source).toContain('actionTakenRef');
    expect(source).toContain('onRequestClose');
  });

  it('keeps accessible actions, wrapping inline controls, and no emoji icons', () => {
    expect(source.match(/accessibilityRole="button"/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toMatch(/minHeight:\s*44/);
    expect(source).toMatch(/minWidth:\s*44/);
    expect(source).toMatch(/flexWrap:\s*'wrap'/);
    expect(source).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});
