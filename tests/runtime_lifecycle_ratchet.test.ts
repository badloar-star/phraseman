import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

type MotionOwner =
  | 'explicit_focus_appstate'
  | 'owner_prop'
  | 'bounded'
  | 'unmounting_modal'
  | 'disabled'
  | 'dev_only'
  | 'migration_debt';

type MotionReview = {
  owner: MotionOwner;
  reason: string;
  requiredTokens?: string[];
};

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function walk(relativeDir: string): string[] {
  const absoluteDir = path.join(ROOT, relativeDir);
  const result: string[] = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) result.push(...walk(relativePath));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) result.push(relativePath);
  }
  return result;
}

function discoverRepeatingMotionFiles(): string[] {
  return ['app', 'components', 'hooks']
    .flatMap(walk)
    .filter((file) => {
      const source = read(file);
      return /Animated\.loop\s*\(/.test(source)
        || /withRepeat\([\s\S]{0,220}?,\s*-1/.test(source);
    })
    .sort();
}

const guarded = (reason: string): MotionReview => ({
  owner: 'explicit_focus_appstate',
  reason,
  requiredTokens: ['AppState', 'start'],
});
const debt = (reason: string): MotionReview => ({ owner: 'migration_debt', reason });
const modal = (reason: string): MotionReview => ({ owner: 'unmounting_modal', reason });
const ownerProp = (reason: string): MotionReview => ({ owner: 'owner_prop', reason });

const REVIEWED_MOTION_OWNERS: Record<string, MotionReview> = {
  'app/(tabs)/home.tsx': debt('Home tab motion must migrate with activeIdx ownership.'),
  'app/(tabs)/quizzes.tsx': guarded('Quiz card pulse already uses screen focus and AppState.'),
  'app/LeagueResultModal.tsx': modal('League result motion exists only while the result modal is mounted.'),
  'app/WeeklyReviewCard.tsx': debt('Card needs an explicit visibility prop from each owner.'),
  'app/_admin_celebration_lab.tsx': { owner: 'dev_only', reason: 'Administrator animation laboratory.' },
  'app/_anim_demo_lab.tsx': { owner: 'dev_only', reason: 'Development-only animation laboratory.' },
  'app/_layout.tsx': debt('Root-owned repeating motion requires an explicit global owner contract.'),
  'app/arena_game.tsx': debt('Arena game motion needs focused live-game ownership review.'),
  'app/arena_lobby.tsx': debt('Lobby motion migrates with the Arena visibility slice.'),
  'app/club_screen.tsx': { owner: 'disabled', reason: 'Reviewed motion flag is disabled in production.' },
  'app/components/RankChangeModal.tsx': modal('Rank change animation unmounts with its modal.'),
  'app/constellation_match.tsx': debt('Match motion needs focus and foreground ownership.'),
  'app/constellation_search.tsx': debt('Search motion has focus gating but still needs shared foreground ownership.'),
  'app/constellation_starfield.tsx': ownerProp('Starfield lifetime is controlled by its screen owner.'),
  'app/daily_tasks_screen.tsx': guarded('Daily Tasks loops use screen focus and AppState.'),
  'app/flashcards/CardPackShardPaywallModal.tsx': modal('Paywall animation unmounts with its modal.'),
  'app/flashcards/FlashcardListItem.tsx': guarded('Flashcard nudge uses screen focus and AppState.'),
  'app/flashcards/FlashcardsCategoryHub.tsx': ownerProp('Category hub motion is owned by the mounted hub surface.'),
  'app/flashcards_collection.tsx': debt('Collection hint loop needs explicit screen visibility ownership.'),
  'app/language_welcome.tsx': debt('Welcome screen loop needs foreground/focus ownership.'),
  'app/lesson1.tsx': debt('Lesson repeating effects migrate without changing one-shot feedback.'),
  'app/lesson_complete.tsx': debt('Completion screen repeating decoration needs screen ownership.'),
  'app/lesson_intro_screens.tsx': debt('Lesson intro repeating decoration needs screen ownership.'),
  'app/pack_opening.tsx': debt('Pack opening repeating decoration needs screen ownership.'),
  'app/review.tsx': debt('Review screen repeating motion needs screen ownership.'),
  'app/shards_shop.tsx': debt('Shop repeating motion needs focused-screen ownership.'),
  'app/voice_equalizer.tsx': ownerProp('Equalizer is controlled by its active playback owner.'),
  'components/AiTypingBubble.tsx': guarded('Typing bubble stops on AppState and unmount cleanup.'),
  'components/AppMessagesInbox.tsx': guarded('Inbox motion uses navigation focus and AppState.'),
  'components/ArenaLimitModal.tsx': modal('Limit animation unmounts with its modal.'),
  'components/AvatarAura.tsx': guarded('Reference implementation uses screen focus and AppState.'),
  'components/BoonActivatedModal.tsx': modal('Boon activation animation unmounts with its modal.'),
  'components/BoonChestModal.tsx': modal('Boon chest animation unmounts with its modal.'),
  'components/CleanOnboarding.tsx': guarded('Onboarding breathing loop uses screen focus and AppState.'),
  'components/CollectibleArtFrame.tsx': guarded('Collectible effects use screen focus and AppState.'),
  'components/HoloFoilCard.tsx': guarded('Holo idle motion uses screen focus and AppState.'),
  'components/HomeTheoAdvisorCard.tsx': guarded('Theo card float uses screen focus and AppState.'),
  'components/LeagueBonusAvailableModal.tsx': modal('League bonus animation unmounts with its modal.'),
  'components/LeagueChestOpenModal.tsx': modal('League chest animation unmounts with its modal.'),
  'components/LevelGiftDualModal.tsx': modal('Dual gift animation unmounts with its modal.'),
  'components/LevelGiftModal.tsx': modal('Gift animation unmounts with its modal.'),
  'components/LingmanVideosButton.tsx': guarded('Unread pulse uses navigation focus and AppState.'),
  'components/MatchFoundToast.tsx': modal('Match-found toast owns and unmounts its brief motion.'),
  'components/NoEnergyModal.tsx': modal('No-energy animation unmounts with its modal.'),
  'components/PlayerProfileModal.tsx': modal('Profile animation unmounts with its modal.'),
  'components/PremiumCelebrationModal.tsx': modal('Celebration animation unmounts with its modal.'),
  'components/PremiumGoldButton.tsx': ownerProp('Gold button animation is owned by its mounted premium surface.'),
  'components/ProfileCardMotionFx.tsx': ownerProp('Profile motion receives lifecycle from the card owner.'),
  'components/ReleaseNotesModal.tsx': modal('Release notes animation unmounts with its modal.'),
  'components/ScreenGradient.tsx': { owner: 'disabled', reason: 'Continuous gradient motion is disabled by its production flag.' },
  'components/ShineOverlay.tsx': ownerProp('Overlay lifetime is controlled by its visible owner.'),
  'components/SkeletonShimmer.tsx': ownerProp('Shimmer unmounts when its loading owner resolves.'),
  'components/WeeklyBoonDetailModal.tsx': modal('Boon detail animation unmounts with its modal.'),
  'components/onboarding_aha/SpeechBeat.tsx': guarded('Microphone pulse uses screen focus and AppState.'),
  'components/onboarding_aha/TypewriterText.tsx': guarded('Cursor loop uses screen focus and AppState.'),
  'components/premium_celebration/AuroraBackground.tsx': modal('Aurora exists only under the celebration modal.'),
  'components/reward_v2/RewardCardV2.tsx': modal('Reward card loop exists only during its reward presentation.'),
  'components/stats/AiBlockNote.tsx': ownerProp('AI note shimmer is owned by the visible stats block.'),
};

describe('runtime lifecycle ratchet', () => {
  it('keeps every repeating-motion file explicitly owned', () => {
    expect(discoverRepeatingMotionFiles()).toEqual(Object.keys(REVIEWED_MOTION_OWNERS).sort());
  });

  it('keeps reviewed ownership reasons and existing explicit guards intact', () => {
    for (const [file, review] of Object.entries(REVIEWED_MOTION_OWNERS)) {
      expect(review.reason.trim()).not.toHaveLength(0);
      for (const token of review.requiredTokens ?? []) {
        expect(read(file)).toContain(token);
      }
    }
  });
});
