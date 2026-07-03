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

  test('onboarding keeps the midnight liquid background without full-screen art images', () => {
    const onboardingSource = fs.readFileSync(path.join(ROOT, 'components/CleanOnboarding.tsx'), 'utf8');

    expect(onboardingSource).toContain('function Background()');
    expect(onboardingSource).toContain("colors={['#050711', '#080914', '#02030A']}");
    expect(onboardingSource).toContain('liquidBlobOne');
    expect(onboardingSource).toContain('liquidBlobTwo');
    expect(onboardingSource).not.toContain('onboarding-professor-observatory.webp');
    expect(onboardingSource).not.toContain('onboarding-phrase-archive.webp');
    expect(onboardingSource).not.toContain('onboarding-sage-council.webp');
    expect(onboardingSource).not.toContain("require('../assets/images/onboarding");
    expect(onboardingSource).not.toContain('ONBOARDING_THEME_BLUE');
    expect(onboardingSource).not.toContain('ONBOARDING_THEME_GREEN');
    expect(onboardingSource).not.toContain('AnimatedImage');
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
