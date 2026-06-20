import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('Onboarding Graphite core chrome assets', () => {
  test('first lesson sheet no longer ships background images', () => {
    const firstLessonSource = fs.readFileSync(path.join(ROOT, 'components/firstLessonSheetAssets.ts'), 'utf8');

    expect(firstLessonSource).toContain('FIRST_LESSON_SHEET_IMAGES');
    expect(firstLessonSource).toContain('= []');
    expect(firstLessonSource).not.toContain('FIRST_LESSON_SHEET_BACKGROUNDS');
    expect(firstLessonSource).not.toContain('assets/images/first_lesson_sheet');
    expect(firstLessonSource).not.toContain('sheet-bg-');
  });

  test('onboarding keeps the graphite gradient background without full-screen art images', () => {
    const onboardingSource = fs.readFileSync(path.join(ROOT, 'components/onboarding.tsx'), 'utf8');

    for (const key of ['WELCOME', 'BETA', 'NAME', 'BUILDER', 'QUIZ', 'STREAK', 'AUTH']) {
      expect(onboardingSource).toContain(`const ONBOARDING_BG_${key} = null;`);
    }
    expect(onboardingSource).not.toContain('onboarding-professor-observatory.webp');
    expect(onboardingSource).not.toContain('onboarding-phrase-archive.webp');
    expect(onboardingSource).not.toContain('onboarding-sage-council.webp');
    expect(onboardingSource).toContain("accent: '#F2B84B'");
    expect(onboardingSource).not.toContain('ONBOARDING_THEME_BLUE');
    expect(onboardingSource).not.toContain('ONBOARDING_THEME_GREEN');
    expect(onboardingSource).not.toContain('AnimatedImage');
    expect(onboardingSource).toContain('onboardingBgImage');
    expect(onboardingSource).toContain('colors={[theme.bgBottom, theme.bgTop, theme.bgEdge]}');
    expect(onboardingSource).toContain("'rgba(0,0,0,0.99)'");
  });

  test('non-background chrome modules do not reference removed background groups', () => {
    const energySource = fs.readFileSync(path.join(ROOT, 'components/EnergyIcon.tsx'), 'utf8');
    const messagesSource = fs.readFileSync(path.join(ROOT, 'components/AppMessagesInbox.tsx'), 'utf8');
    const lingmanSource = fs.readFileSync(path.join(ROOT, 'components/LingmanVideosButton.tsx'), 'utf8');
    const combined = [energySource, messagesSource, lingmanSource].join('\n');

    expect(combined).not.toContain('assets/images/app_backdrops');
    expect(combined).not.toContain('assets/images/theme_backdrops');
    expect(combined).not.toContain('assets/images/screen_backdrops');
    expect(combined).not.toContain('assets/images/first_lesson_sheet');
  });
});
