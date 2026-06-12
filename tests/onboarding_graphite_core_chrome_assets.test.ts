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

  test('onboarding uses a programmatic gradient instead of bg image assets', () => {
    const onboardingSource = fs.readFileSync(path.join(ROOT, 'components/onboarding.tsx'), 'utf8');

    expect(onboardingSource).toContain('const ONBOARDING_BG_WELCOME = null');
    expect(onboardingSource).toContain("colors={['#101319', '#07090D', '#020304']}");
    expect(onboardingSource).not.toContain('onboarding-bg-');
    expect(onboardingSource).not.toContain('AnimatedImage');
    expect(onboardingSource).not.toContain('onboardingBgImage');
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
