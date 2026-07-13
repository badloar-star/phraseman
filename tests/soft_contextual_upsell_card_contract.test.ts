import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'components/SoftContextualUpsellCard.tsx'), 'utf8');

describe('Quiet Premium soft upsell modal contract', () => {
  it('is one native modal with a responsive bottom-sheet/centered surface', () => {
    expect(source).toMatch(/\bModal\b/);
    expect(source).toContain('useWindowDimensions');
    expect(source).toContain('useSafeAreaInsets');
    expect(source).toMatch(/maxWidth:\s*560/);
    expect(source).toContain('isTablet');
    expect(source).not.toMatch(/topRight|close-circle|headerClose/);
  });

  it('uses one dominant full-width gold CTA and a text-only secondary dismissal', () => {
    expect(source).toMatch(/minHeight:\s*52/);
    expect(source).toMatch(/width:\s*'100%'/);
    expect(source).toContain("color: '#07110A'");
    expect(source).toMatch(/dismiss[\s\S]*minHeight:\s*44/);
    expect(source).toContain('Не сейчас');
  });

  it('uses a one-shot UI-thread shimmer and respects reduced motion', () => {
    expect(source).toContain('useReducedMotion');
    expect(source).toContain('withTiming');
    expect(source).toContain('withDelay');
    expect(source).not.toMatch(/withRepeat|Animated\.loop|setInterval/);
    expect(source).toMatch(/translateX|translateY/);
    expect(source).toContain('opacity');
  });

  it('uses consistent icons, accessible actions, and idempotent handlers', () => {
    expect(source).toContain('Ionicons');
    expect(source).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    expect(source.match(/accessibilityRole="button"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('actionTakenRef');
    expect(source).toContain('onRequestClose');
  });
});
