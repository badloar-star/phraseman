import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'),
  'utf8',
);
const rootLayout = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');

describe('CleanOnboarding native animation transition safety', () => {
  it('keeps the welcome entrance and breathing scales on separate native nodes', () => {
    const welcomeLogo = source.match(/function WelcomeLogo\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';

    expect(welcomeLogo).not.toContain('Animated.add(');
    expect(welcomeLogo).toContain('styles.logoEnterLayer');
    expect(welcomeLogo).toContain('styles.logoBreatheLayer');
  });

  it('keeps the startup splash entrance and pulse scales on separate native nodes', () => {
    const startupSplash = rootLayout.match(/function StartupSplashHold[\s\S]*?\n\}/)?.[0] ?? '';

    expect(startupSplash).not.toContain('Animated.add(');
    expect(startupSplash).toContain('startupSplashGlyphPulse');
  });

  it('keeps looping onboarding art scales off native arithmetic nodes', () => {
    const privacyVault = source.match(/function PrivacyVault\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    const improveArt = source.match(/function ImproveConstellation\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';

    expect(privacyVault).not.toContain('Animated.multiply(');
    expect(privacyVault).toContain('styles.vaultBreatheLayer');
    expect(improveArt).not.toContain('Animated.multiply(');
    expect(improveArt).toContain('styles.improveHeartBeatLayer');
  });
});
