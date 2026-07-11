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
  requiredTokens: ['AppState.currentState', 'AppState.addEventListener'],
});
const debt = (reason: string): MotionReview => ({ owner: 'migration_debt', reason });

const REVIEWED_MOTION_OWNERS: Record<string, MotionReview> = {
  'app/(tabs)/home.tsx': debt('Home tab motion must migrate with activeIdx ownership.'),
  'app/(tabs)/quizzes.tsx': guarded('Quiz card pulse already uses screen focus and AppState.'),
  'app/LeagueResultModal.tsx': debt('League result modal still needs a testable visible/unmount owner contract.'),
  'app/WeeklyReviewCard.tsx': debt('Card needs an explicit visibility prop from each owner.'),
  'app/_admin_celebration_lab.tsx': { owner: 'dev_only', reason: 'Administrator animation laboratory.' },
  'app/_anim_demo_lab.tsx': { owner: 'dev_only', reason: 'Development-only animation laboratory.' },
  'app/_layout.tsx': debt('Root-owned repeating motion requires an explicit global owner contract.'),
  'app/arena_game.tsx': debt('Arena game motion needs focused live-game ownership review.'),
  'app/arena_lobby.tsx': debt('Lobby motion migrates with the Arena visibility slice.'),
  'app/club_screen.tsx': {
    owner: 'owner_prop',
    reason: 'League icon pulse requires its pulse prop and the production motion flag.',
    requiredTokens: ['if (!pulse || !CLUB_ENTRY_REPEATING_MOTION_ENABLED)', 'return () => anim.stop()'],
  },
  'app/components/RankChangeModal.tsx': debt('Rank modal still needs a testable visible/unmount owner contract.'),
  'app/constellation_match.tsx': debt('Match motion needs focus and foreground ownership.'),
  'app/constellation_search.tsx': debt('Search motion has focus gating but still needs shared foreground ownership.'),
  'app/constellation_starfield.tsx': debt('Starfield has focus ownership but still needs foreground ownership.'),
  'app/daily_tasks_screen.tsx': guarded('Daily Tasks loops use screen focus and AppState.'),
  'app/flashcards/CardPackShardPaywallModal.tsx': debt('Paywall modal still needs a testable visible/unmount owner contract.'),
  'app/flashcards/FlashcardListItem.tsx': guarded('Flashcard nudge uses screen focus and AppState.'),
  'app/flashcards/FlashcardsCategoryHub.tsx': guarded('Category hub CTA uses screen focus and AppState.'),
  'app/flashcards_collection.tsx': debt('Collection hint loop needs explicit screen visibility ownership.'),
  'app/language_welcome.tsx': debt('Welcome screen loop needs foreground/focus ownership.'),
  'app/lesson1.tsx': debt('Lesson repeating effects migrate without changing one-shot feedback.'),
  'app/lesson_complete.tsx': debt('Completion screen repeating decoration needs screen ownership.'),
  'app/lesson_intro_screens.tsx': debt('Lesson intro repeating decoration needs screen ownership.'),
  'app/pack_opening.tsx': debt('Pack opening repeating decoration needs screen ownership.'),
  'app/review.tsx': debt('Review screen repeating motion needs screen ownership.'),
  'app/shards_shop.tsx': debt('Shop repeating motion needs focused-screen ownership.'),
  'app/voice_equalizer.tsx': {
    owner: 'owner_prop',
    reason: 'Equalizer loop is controlled by its active recording prop.',
    requiredTokens: ['active: boolean', 'if (levelDriven || !active) return', 'return () => loops.forEach((loop) => loop.stop())'],
  },
  'components/AiTypingBubble.tsx': debt('Typing bubble has AppState cleanup but no navigation/owner visibility contract.'),
  'components/AppMessagesInbox.tsx': guarded('Inbox motion uses navigation focus and AppState.'),
  'components/ArenaLimitModal.tsx': debt('Limit modal still needs a testable visible/unmount owner contract.'),
  'components/AvatarAura.tsx': guarded('Reference implementation uses screen focus and AppState.'),
  'components/BoonActivatedModal.tsx': debt('Boon modal still needs a testable visible/unmount owner contract.'),
  'components/BoonChestModal.tsx': debt('Boon chest modal still needs a testable visible/unmount owner contract.'),
  'components/CleanOnboarding.tsx': guarded('Onboarding breathing loop uses screen focus and AppState.'),
  'components/CollectibleArtFrame.tsx': guarded('Collectible effects use screen focus and AppState.'),
  'components/HoloFoilCard.tsx': guarded('Holo idle motion uses screen focus and AppState.'),
  'components/HomeTheoAdvisorCard.tsx': guarded('Theo card float uses screen focus and AppState.'),
  'components/LeagueBonusAvailableModal.tsx': debt('League bonus modal needs a testable visibility owner contract.'),
  'components/LeagueChestOpenModal.tsx': debt('League chest modal needs a testable visibility owner contract.'),
  'components/LevelGiftDualModal.tsx': debt('Dual gift modal needs a testable visibility owner contract.'),
  'components/LevelGiftModal.tsx': debt('Gift modal needs a testable visibility owner contract.'),
  'components/LingmanVideosButton.tsx': guarded('Unread pulse uses navigation focus and AppState.'),
  'components/MatchFoundToast.tsx': debt('Match-found toast needs a testable mounted/visible owner contract.'),
  'components/NoEnergyModal.tsx': debt('No-energy modal needs a testable visibility owner contract.'),
  'components/PlayerProfileModal.tsx': debt('Profile modal needs a testable visibility owner contract.'),
  'components/PremiumCelebrationModal.tsx': debt('Celebration modal needs a testable visibility owner contract.'),
  'components/PremiumGoldButton.tsx': debt('Gold button starts an unconditional loop and has no visibility prop.'),
  'components/ProfileCardMotionFx.tsx': guarded('Profile card loops use screen focus and AppState.'),
  'components/ReleaseNotesModal.tsx': debt('Release notes modal needs a testable visibility owner contract.'),
  'components/ScreenGradient.tsx': {
    owner: 'disabled',
    reason: 'Continuous gradient motion is disabled by its production flag.',
    requiredTokens: ['const SCREEN_GRADIENT_MOTION_ENABLED = false', 'if (!SCREEN_GRADIENT_MOTION_ENABLED)'],
  },
  'components/ShineOverlay.tsx': guarded('Shine overlay uses screen focus and AppState.'),
  'components/SkeletonShimmer.tsx': guarded('Skeleton shimmer uses screen focus and AppState.'),
  'components/WeeklyBoonDetailModal.tsx': debt('Boon detail modal needs a testable visibility owner contract.'),
  'components/onboarding_aha/SpeechBeat.tsx': guarded('Microphone pulse uses screen focus and AppState.'),
  'components/onboarding_aha/TypewriterText.tsx': guarded('Cursor loop uses screen focus and AppState.'),
  'components/premium_celebration/AuroraBackground.tsx': debt('Aurora needs a testable parent visibility/unmount contract.'),
  'components/reward_v2/RewardCardV2.tsx': debt('Reward card needs a testable presentation visibility contract.'),
  'components/stats/AiBlockNote.tsx': guarded('AI note motion uses screen focus and AppState.'),
};

describe('runtime lifecycle ratchet', () => {
  it('keeps every repeating-motion file explicitly owned', () => {
    expect(discoverRepeatingMotionFiles()).toEqual(Object.keys(REVIEWED_MOTION_OWNERS).sort());
  });

  it('keeps reviewed ownership reasons and existing explicit guards intact', () => {
    for (const [file, review] of Object.entries(REVIEWED_MOTION_OWNERS)) {
      expect(review.reason.trim()).not.toHaveLength(0);
      const source = read(file);
      for (const token of review.requiredTokens ?? []) {
        expect(source).toContain(token);
      }
      if (review.owner === 'explicit_focus_appstate') {
        expect(source).toMatch(/useIs(?:Screen)?Focused\s*\(/);
        const motionPattern = /Animated\.loop\s*\(|withRepeat\([\s\S]{0,220}?,\s*-1/g;
        const motionCalls = [...source.matchAll(motionPattern)];
        expect(motionCalls.length).toBeGreaterThan(0);
        for (const motionCall of motionCalls) {
          const callIndex = motionCall.index ?? 0;
          const effectWindow = source.slice(Math.max(0, callIndex - 1200), callIndex + 2500);
          if (!/AppState\.currentState/.test(effectWindow)) {
            throw new Error(`${file}:${callIndex}: repeating call is not locally gated by AppState`);
          }
          if (!/(?:\.stop\s*\(\s*\)|cancelAnimation\s*\()/.test(effectWindow)) {
            throw new Error(`${file}:${callIndex}: repeating call has no local cleanup`);
          }
        }
      }
    }
  });
});
