import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function source(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function executableSource(relativePath: string): string {
  return source(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

/**
 * Production rollout approved by the owner after the DEV Hub motion audit.
 *
 * Every surface in this list must use hybrid motion when the caller omits the
 * variant. Explicit `motionVariant="classic"` remains the rollback escape hatch.
 */
const HYBRID_DEFAULT_SURFACES = [
  'app/flashcards/DeckPickerSheet.tsx',
  'components/AchievementToast.tsx',
  'components/AiConsentSheetModal.tsx',
  'components/BoonActivatedModal.tsx',
  'components/BoonChestModal.tsx',
  'components/CertificateNameModal.tsx',
  'components/CollectibleDropModal.tsx',
  'components/DeleteAccountConfirmModal.tsx',
  'components/InGameToast.tsx',
  'components/IntroFullAccessModal.tsx',
  'components/LevelGiftDualModal.tsx',
  'components/LevelGiftModal.tsx',
  'components/MedalToast.tsx',
  'components/NotificationPermissionModal.tsx',
  'components/OfflineBanner.tsx',
  'components/OnboardingWelcomeSheet.tsx',
  'components/PromoBanner.tsx',
  'components/RankChangeBanner.tsx',
  'components/ReferralInviteBannerArt.tsx',
  'components/ReportUserModal.tsx',
  'components/ReviewPromptModal.tsx',
  'components/SaveProgressBanner.tsx',
  'components/SeasonGiftModal.tsx',
  'components/SeasonRewardInfoModal.tsx',
  'components/ThemedChoiceModal.tsx',
  'components/ThemedConfirmModal.tsx',
  'components/VipSurveyModal.tsx',
  'components/WeeklyBoonDetailModal.tsx',
  'components/account/NicknameEditModal.tsx',
] as const;

describe('approved hybrid motion rollout defaults', () => {
  test.each(HYBRID_DEFAULT_SURFACES)('%s defaults to hybrid and keeps classic as an explicit variant', (file) => {
    const text = executableSource(file);
    expect(text).toMatch(/motionVariant\s*=\s*'hybrid'/);
    expect(text).toMatch(/'classic'\s*\|\s*'hybrid'|'hybrid'\s*\|\s*'classic'|MotionVariant/);
  });

  it('ActionToast treats an omitted variant as hybrid and explicit classic as rollback', () => {
    const text = source('components/ActionToast.tsx');
    expect(text.match(/motionVariant\s*!==\s*'classic'/g)).toHaveLength(2);
    expect(text).not.toMatch(/motionVariant\s*===\s*'hybrid'/);
  });

  it('the real production tab bar starts in hybrid mode', () => {
    const text = source('hooks/dev_motion_variant.ts');
    expect(text).toMatch(/let tabBarVariant:\s*MotionVariant\s*=\s*'hybrid'/);
  });
});
