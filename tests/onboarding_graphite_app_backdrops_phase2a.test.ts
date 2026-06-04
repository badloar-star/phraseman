import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');

const PHASE_2A_BACKDROPS = [
  'home',
  'lessons',
  'lessonPractice',
  'quizzes',
  'arena',
  'settings',
] as const;

describe('Onboarding Graphite app backdrops Phase 2A', () => {
  test('key route backdrops exist as generated 1080x1920 WebP files', async () => {
    for (const name of PHASE_2A_BACKDROPS) {
      const file = path.join(
        ROOT,
        'assets/images/app_backdrops/onboarding-graphite',
        `${name}-onboarding-graphite.webp`,
      );
      expect(fs.existsSync(file)).toBe(true);
      const metadata = await sharp(file).metadata();
      expect(metadata.width).toBe(1080);
      expect(metadata.height).toBe(1920);
      expect(metadata.format).toBe('webp');
    }
  });

  test('minimalDark registry points key routes to generated onboarding-graphite backdrops', () => {
    const source = fs.readFileSync(
      path.join(ROOT, 'components/appArtBackdropRegistry.ts'),
      'utf8',
    );

    for (const name of PHASE_2A_BACKDROPS) {
      expect(source).toContain(
        `require('../assets/images/app_backdrops/onboarding-graphite/${name}-onboarding-graphite.webp')`,
      );
    }
    expect(source).toContain('withOnboardingGraphite(');
    expect(source).toContain('lessonPractice: LESSON_PRACTICE_BACKDROPS');
    expect(source).toContain(
      "minimalDark: require('../assets/images/app_backdrops/onboarding-graphite/home-onboarding-graphite.webp')",
    );
    expect(source).not.toContain(
      "minimalDark: require('../assets/images/theme_backdrops/theme-backdrop-minimal-dark.webp')",
    );
  });

  test('minimalDark app art backdrop scrims use quiet onboarding graphite chrome', () => {
    const source = fs.readFileSync(
      path.join(ROOT, 'components/AppArtBackdrop.tsx'),
      'utf8',
    );

    expect(source).toContain('minimalDark: 0.40');
    expect(source).toContain(
      "minimalDark: ['rgba(2,3,4,0.46)', 'rgba(8,8,7,0.26)', 'rgba(5,5,4,0.72)']",
    );
    expect(source).toContain(
      "minimalDark: ['rgba(2,3,4,0.50)', 'rgba(242,184,75,0.05)', 'rgba(242,184,75,0.04)', 'rgba(5,5,4,0.42)']",
    );
    expect(source).not.toContain(
      "minimalDark: ['rgba(0,0,0,0.52)', 'rgba(0,0,0,0.34)', 'rgba(0,0,0,0.78)']",
    );
  });
});
