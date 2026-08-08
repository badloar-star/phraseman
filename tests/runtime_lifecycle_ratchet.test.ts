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
  | 'runtime_active'
  | 'transient_mount';

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
const owned = (reason: string, requiredTokens: string[]): MotionReview => ({ owner: 'owner_prop', reason, requiredTokens });
const runtime = (reason: string, requiredTokens: string[] = []): MotionReview => ({
  owner: 'runtime_active',
  reason,
  requiredTokens: ['useRuntimeActive', ...requiredTokens],
});

const REVIEWED_MOTION_OWNERS: Record<string, MotionReview> = {
  // зачем: пульс подарка/скелетона попал в релиз 21.07 БЕЗ гарда (регрессия нагрева,
  // аудит 2026-07-25) и мимо этого реестра. Фиксируем файл здесь, чтобы гард
  // useRuntimeActive нельзя было потерять снова незаметно.
  'app/(tabs)/friends.tsx': runtime('Gift pulse and search skeleton loops require focused foreground runtime.', ['if (active && runtimeActive)']),
  'app/(tabs)/home.tsx': runtime('Home motion is active only on the visible Home tab.', ['useRuntimeActive(isHomeOwner)', '!homeRuntimeActive']),
  // зачем 2026-07-27 (владелец: «приложение стало греть телефон»): пульс LiveDot
  // крутился без гварда видимости. Хаб турниров с 27.07 — push-экран (релиз без
  // турниров), поэтому фокус экрана здесь честный; требуем явную передачу этого
  // фокуса, чтобы возврат к голому useRuntimeActive() ронял тест.
  'app/(tabs)/tournaments.tsx': runtime('Live dot pulse is active only while the Tournaments screen is focused.', ['useRuntimeActive(screenFocused)', 'cancelAnimation(pulse)']),
  'app/LeagueResultModal.tsx': owned('Every result loop is owned by modal visibility, including child sparkles and halo.', ['active={visible}', 'if (!active) return', 'if (!visible) return']),
  'app/_admin_celebration_lab.tsx': { owner: 'dev_only', reason: 'Administrator animation laboratory.' },
  'app/_anim_demo_lab.tsx': { owner: 'dev_only', reason: 'Development-only animation laboratory.' },
  'app/_layout.tsx': owned('Root overlay motion runs only while its overlay is visible.', ['if (!visible) return', 'pulseLoop.stop()']),
  'app/club_screen.tsx': {
    owner: 'owner_prop',
    reason: 'League icon pulse requires its pulse prop and the production motion flag.',
    requiredTokens: ['if (!pulse || !CLUB_ENTRY_REPEATING_MOTION_ENABLED)', 'return () => anim.stop()'],
  },
  'app/daily_tasks_screen.tsx': guarded('Daily Tasks loops use screen focus and AppState.'),
  'app/flashcards/CardPackShardPaywallModal.tsx': owned('Paywall motion follows the visible prop and is stopped by effect cleanup.', ['if (visible) {', 'cancelAnimation(ctaPulse)']),
  'app/flashcards/FlashcardListItem.tsx': guarded('Flashcard nudge uses screen focus and AppState.'),
  'app/flashcards/FlashcardsCategoryHub.tsx': guarded('Category hub CTA uses screen focus and AppState.'),
  'app/flashcards_collection.tsx': runtime('Delete hint pulse requires focused foreground runtime.', ['!flashcardsRuntimeActive || !showDeleteHint', 'deleteHintPulseLoop.current?.stop()']),
  'app/language_welcome.tsx': { owner: 'disabled', reason: 'Only a documentation reference to Animated.loop remains; the final screen explicitly has no repeating motion.', requiredTokens: ['НИКАКИХ withRepeat(-1)/Animated.loop'] },
  'app/lesson1.tsx': runtime('Lesson cursor and hint loops require focused foreground runtime.', ['!lessonRuntimeActive || selectedWords.length > 0', 'lessonRuntimeActive && showToBeHint']),
  'app/lesson_complete.tsx': runtime('Completion decoration requires focused foreground runtime.', ['!lessonCompleteRuntimeActive || !seqDone', 'bounce.stop()']),
  'app/lesson_intro_screens.tsx': runtime('Intro hint and CTA loops require focused foreground runtime.', ['!lessonIntroRuntimeActive || allRevealed', '!lessonIntroRuntimeActive || !ctaReady']),
  'app/pack_opening.tsx': runtime('Card pulse receives runtime activity from the screen owner.', ['active={packOpeningRuntimeActive}', 'if (!active || flipped)', 'loop.stop()']),
  'app/review.tsx': { owner: 'transient_mount', reason: 'Particle and burn loops exist only inside bounded feedback components that unmount when the effect ends.', requiredTokens: ['i === index && burning &&', '<BurnCardEffect', 'cancelAnimation(rotate)'] },
  'app/shards_shop.tsx': guarded('Shop loops already use screen focus plus AppState and explicit cancellation.'),
  'app/voice_equalizer.tsx': {
    owner: 'owner_prop',
    reason: 'Equalizer loop is controlled by its active recording prop.',
    requiredTokens: ['active: boolean', 'if (levelDriven || !active) return', 'return () => loops.forEach((loop) => loop.stop())'],
  },
  'components/AiTypingBubble.tsx': runtime('Typing animation requires focused foreground runtime.', ['typingRuntimeActive && !reduceMotion', 'stop()']),
  'components/AppMessagesInbox.tsx': guarded('Inbox motion uses navigation focus and AppState.'),
  'components/AvatarAura.tsx': guarded('Reference implementation uses screen focus and AppState.'),
  'components/BoonActivatedModal.tsx': owned('Activated boon motion follows visibility and stops on cleanup.', ['if (!visible) {', '.stop()']),
  'components/BoonChestModal.tsx': owned('Boon chest unmounts when hidden and stops running motion.', ['if (!visible) return null', '.stop()']),
  'components/CleanOnboarding.tsx': guarded('Onboarding breathing loop uses screen focus and AppState.'),
  'components/CollectibleArtFrame.tsx': guarded('Collectible effects use screen focus and AppState.'),
  'components/HoloFoilCard.tsx': guarded('Holo idle motion uses screen focus and AppState.'),
  'components/HomeTheoAdvisorCard.tsx': guarded('Theo card float uses screen focus and AppState.'),
  'components/LeagueBonusAvailableModal.tsx': owned('League bonus modal unmounts while hidden.', ['if (!visible || !availability) return null', 'if (!visible) return']),
  'components/LeagueChestOpenModal.tsx': owned('League chest motion is visible-only and unmounts while hidden.', ['if (!visible) return null', 'if (!visible) return']),
  'components/LevelGiftDualModal.tsx': owned('Dual gift loops are guarded by visible phase and stopped on cleanup.', ['if (!visible', 'idleAll.current?.stop()']),
  'components/LevelGiftModal.tsx': owned('Gift loops are guarded by visibility and stopped whenever hidden.', ['if (!visible || !gift)', 'idleLoop.current?.stop()']),
  'components/LingmanVideosButton.tsx': owned('Unread pulse follows the explicit retained-tab runtime owner.', ['ownerActive?: boolean', '!ownerActive', 'stop()']),
  'components/SeasonAuraRing.tsx': guarded('Season aura layers run only on the focused foreground screen and respect Reduced Motion.'),
  'components/SeasonGiftModal.tsx': owned('Finale nickname shimmer is mounted only while the gift modal is visible and stops on cleanup.', ["visible && reward.kind === 'season_finale'", 'return () => loop.stop()']),
  // зачем 2026-08-02: интеграционные мержи (targeted graft + preserve-worktree)
  // привезли анимационные файлы мимо реестра, и ратчет честно упал. Гарды в самих
  // файлах уже настоящие (useRuntimeActive + cancel/stop) — здесь фиксируем их
  // дословными токенами, чтобы следующий мерж не потерял гард незаметно.
  // AuraRenderer пока не подключён ни одним экраном (графт aura-native-lab).
  'components/avatar-aura/AuraRenderer.tsx': runtime('Aura ambient loop runs only on focused foreground runtime granted by its owner and respects reduced motion; inactive auras freeze at their static phase.', ['useRuntimeActive(ownerVisible)', 'if (!ambientActive)', 'cancelAnimation(phase)']),
  // Волна переписана мержем (AudioWaveformBase): вместо старого if (!active) гард
  // стал строже — пауза/фон/чужой экран/reduce-motion глушат цикл, а active
  // владельца входит в useRuntimeActive(active). Токены обновлены, не ослаблены.
  'components/flashcards/AudioWaveform.tsx': runtime('Waveform bars run only while audio actually plays on focused foreground runtime with reduced motion off; every loop is stopped on cleanup.', ['if (!playing || !runtimeActive || reduceMotion)', 'loop.stop()']),
  'components/league/LeagueArenaScene.tsx': guarded('Arena beams, emblem float and confetti loops use screen focus and AppState.'),
  'components/league/LeagueMyPositionBar.tsx': guarded('My-position rank glow loop uses screen focus and AppState.'),
  'components/league/LeagueChestTeaserModal.tsx': owned('Chest teaser rays and bob run only while the modal is visible and stop on cleanup.', ['if (!visible) return null', 'if (!visible) return']),
  'components/league/LeagueHotHoursChip.tsx': guarded('Hot-hours chip pulse uses screen focus and AppState.'),
  // зачем 2026-08-02: плеер лабы Learning V2 приехал графтом и НЕ подключён к
  // LearningV2ModesLab (контракт lessons_v2_surface_contract подключение и
  // запрещает). Пульс микрофона всё равно пломбируем: живёт только в фазе
  // active при активном рантайме, вне её — loop.stop() и сброс масштаба.
  'components/learning-v2-lab/ModeDemoPlayer.tsx': runtime('Lab mic pulse runs only during the active phase on focused foreground runtime and resets on stop.', ["if (phase !== 'active' || !runtimeActive)", 'loop.stop()', 'pulse.setValue(1)']),
  'components/PlayerProfileModal.tsx': owned('Profile shimmer exists only while a player is present.', ['if (!player)', 'return () => loop.stop()']),
  'components/PremiumCelebrationModal.tsx': owned('Celebration motion is visible-only and cancels Reanimated values while hidden.', ['if (!visible)', 'cancelAnimation(ringSpin)']),
  'components/PremiumGoldButton.tsx': runtime('Gold CTA shine requires focused foreground runtime plus explicit owner visibility.', ['active: boolean', 'active && premiumButtonRuntimeActive', '!buttonAnimationActive', 'anim.stop()']),
  'components/ProfileCardMotionFx.tsx': guarded('Profile card loops use screen focus and AppState.'),
  'components/ReleaseNotesModal.tsx': owned('Release notes loops run only while visible and stop on cleanup.', ['if (!visible)', 'glowLoop.stop()']),
  'components/ScreenGradient.tsx': {
    owner: 'disabled',
    reason: 'Continuous gradient motion is disabled by its production flag.',
    requiredTokens: ['const SCREEN_GRADIENT_MOTION_ENABLED = false', 'if (!SCREEN_GRADIENT_MOTION_ENABLED)'],
  },
  'components/ShineOverlay.tsx': guarded('Shine overlay uses screen focus and AppState.'),
  'components/SkeletonShimmer.tsx': guarded('Skeleton shimmer uses screen focus and AppState.'),
  'components/WeeklyBoonDetailModal.tsx': owned('Boon detail float follows visibility and stops on cleanup.', ['if (!visible)', 'floatLoop.current?.stop()']),
  'components/onboarding_aha/SpeechBeat.tsx': guarded('Microphone pulse uses screen focus and AppState.'),
  'components/onboarding_aha/TypewriterText.tsx': guarded('Cursor loop uses screen focus and AppState.'),
  'components/paywall/PaywallMotion.tsx': guarded('Paywall motion loops use screen focus and AppState.'),
  'components/premium_celebration/AuroraBackground.tsx': owned('Aurora receives an explicit active owner prop and cancels both worklets.', ['if (!active)', 'cancelAnimation(drift)', 'cancelAnimation(breathe)']),
  'components/reward_v2/RewardCardV2.tsx': runtime('Reward halo requires focused foreground runtime without replaying its entrance.', ['!rewardRuntimeActive', 'entrancePlayedRef.current', 'haloLoop.stop()']),
  'components/stats/AiBlockNote.tsx': guarded('AI note motion uses screen focus and AppState.'),
  // зачем 2026-07-27: кнопка озвучки турнира (аудио-режимы) пришла с бесконечным
  // пульсом и не была внесена в реестр — рэтчет валился. Гард в файле уже есть:
  // пульс живёт только пока звук реально играет И экран в фокусе, а уход с
  // экрана глушит и анимацию, и сам плеер.
  // 2026-08-02: мерж переписал кнопку — фокус теперь свёрнут в сам isPlaying
  // (status?.playing && isFocused), а reduce-motion дополнительно глушит пульс.
  // Токены перепломбированы на новый гард, без ослабления.
  'components/tournament/TournamentAudioButton.tsx': runtime('Audio pulse runs only while the clip plays on a focused foreground screen with reduced motion off.', ['status?.playing === true && isFocused', 'if (!isPlaying || reducedMotion)', 'pulse.value = 1']),
  // зачем 2026-08-03: components/today/TodayAmbientCompass.tsx снят с учёта —
  // экран «Сегодня» удалён целиком вместе с его фоновой анимацией.
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
