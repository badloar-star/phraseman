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
  appStateGateToken?: string;
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

const guarded = (reason: string, appStateGateToken?: string): MotionReview => ({
  owner: 'explicit_focus_appstate',
  reason,
  requiredTokens: ['AppState.currentState', 'AppState.addEventListener'],
  appStateGateToken,
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
  'app/(tabs)/home.tsx': runtime('Home motion is active only on the visible Home tab after onboarding.', ['useRuntimeActive(isHomeOwner && homeOnboardingDone)', '!homeRuntimeActive']),
  // зачем 2026-07-27 (владелец: «приложение стало греть телефон»): пульс LiveDot
  // крутился без гварда видимости. Хаб турниров с 27.07 — push-экран (релиз без
  // турниров), поэтому фокус экрана здесь честный; требуем явную передачу этого
  // фокуса, чтобы возврат к голому useRuntimeActive() ронял тест.
  'app/(tabs)/tournaments.tsx': runtime('Live dot pulse is active only while the Tournaments screen is focused.', ['useRuntimeActive(screenFocused)', 'cancelAnimation(pulse)']),
  // зачем 2026-08-13: летящие частицы (шарды и искры) из модалки удалены по
  // решению владельца — остался только цикл хало, плюс два ОГРАНИЧЕННЫХ цикла
  // (подсветка моей строки и блик кнопки) с iterations: 3. Токены не ослаблены:
  // хало по-прежнему принадлежит видимости модалки и дополнительно замирает при
  // системном «уменьшить движение».
  'app/LeagueResultModal.tsx': owned('Every result loop is owned by modal visibility: the club halo freezes when hidden or on reduced motion, and the row/CTA highlights are bounded to three iterations.', ['active={visible}', 'if (!active) return', 'if (!visible) return']),
  'app/_layout.tsx': owned('Root overlay motion runs only while its overlay is visible.', ['if (!visible) return', 'pulseLoop.stop()']),
  'app/club_screen.tsx': {
    owner: 'owner_prop',
    reason: 'League icon pulse requires its pulse prop and the production motion flag.',
    requiredTokens: ['if (!pulse || !CLUB_ENTRY_REPEATING_MOTION_ENABLED)', 'return () => anim.stop()'],
  },
  'app/flashcards/CardPackShardPaywallModal.tsx': owned('Paywall motion follows the visible prop and is stopped by effect cleanup.', ['if (visible) {', 'cancelAnimation(ctaPulse)']),
  // зачем 2026-08-22: подсказка-шеврон переписана (E2) — вечный цикл заменён на
  // ОГРАНИЧЕННЫЙ Animated.loop с iterations: 2, только первая карточка списка и
  // одноразовый флаг fc_hint_flags_v1. Гард AppState стал не нужен: цикл не
  // может пережить фокус — он заканчивается сам и глушится в cleanup эффекта.
  'app/flashcards/FlashcardListItem.tsx': {
    owner: 'bounded',
    reason: 'Chevron nudge is a bounded two-iteration loop on the first card only, sealed by the one-shot chevron_nudge hint flag and stopped in effect cleanup.',
    requiredTokens: ['{ iterations: 2 }', 'itemIdx !== 0', "setHintFlag('chevron_nudge')", 'hintLoopRef.current.stop()'],
  },
  // Cards 2.1 §1–§5: хаб-CTA с бесконечным пульсом удалён вместе с hero/сундуками,
  // а пульс подсказки удаления переехал из контейнера коллекции в CollectionListView.
  'app/flashcards/CollectionListView.tsx': owned(
    'Delete hint pulse lives only while showDeleteHint is set: auto-dismiss через 5s и stop() в cleanup эффекта.',
    ['if (!showDeleteHint) return;', 'deleteHintPulseLoop.current.stop()', 'dismissDeleteHint(), 5000'],
  ),
  'app/flashcards/ListeningEqualizer.tsx': owned(
    'Полосы эквалайзера повторяются только пока playing=true; пауза/reduce motion/low power переводят их в статичный режим.',
    ['playing: boolean', 'equalizerMotionMode({ playing', 'cancelAnimation('],
  ),
  'app/language_welcome.tsx': { owner: 'disabled', reason: 'Only a documentation reference to Animated.loop remains; the final screen explicitly has no repeating motion.', requiredTokens: ['НИКАКИХ withRepeat(-1)/Animated.loop'] },
  'app/lesson1.tsx': runtime('Lesson cursor and hint loops require focused foreground runtime.', ['!lessonRuntimeActive || selectedWords.length > 0', 'lessonRuntimeActive && showToBeHint']),
  'app/lesson_complete.tsx': runtime('Completion decoration requires focused foreground runtime.', ['!lessonCompleteRuntimeActive || !seqDone', 'bounce.stop()']),
  'app/lesson_intro_screens.tsx': runtime('Intro hint and CTA loops require focused foreground runtime.', ['!lessonIntroRuntimeActive || allRevealed', '!lessonIntroRuntimeActive || !ctaReady']),
  'app/level_gifts_inventory.tsx': guarded('Spin pulse runs only on the focused foreground inventory and cancels on blur.'),
  'app/pack_opening.tsx': runtime('Card pulse receives runtime activity from the screen owner.', ['active={packOpeningRuntimeActive}', 'if (!active || flipped)', 'loop.stop()']),
  'app/shards_shop.tsx': guarded('Shop loops already use screen focus plus AppState and explicit cancellation.'),
  'app/streak_stats.tsx': runtime('Stats spin pulse runs only while the stats screen is focused in the foreground.', ['statsRuntimeActive && spinBalance > 0', 'cancelAnimation(spinButtonPulse)']),
  // зачем 2026-08-22: эквалайзер переписан под императивный setSample-путь —
  // idle-луп стал управляемым ресурсом (startIdle/stopIdle на ref'ах). Гард не
  // ослаб: луп включается только при active и без rawSample-пропа, а cleanup
  // эффекта зовёт stopIdle, который останавливает каждый Animated.loop.
  'app/voice_equalizer.tsx': {
    owner: 'owner_prop',
    reason: 'Equalizer idle loop is controlled by its active recording prop: it starts only in the active non-prop-driven effect and effect cleanup calls stopIdle which stops every loop.',
    requiredTokens: ['active: boolean', 'if (levelDriven || !active) return', 'loops.forEach((loop) => loop.stop())', 'stopIdle();'],
  },
  'components/AiTypingBubble.tsx': runtime('Typing animation requires focused foreground runtime.', ['typingRuntimeActive && !reduceMotion', 'stop()']),
  'components/AppMessagesInbox.tsx': guarded('Inbox motion uses navigation focus and AppState.'),
  'components/AvatarAura.tsx': guarded('Reference implementation uses screen focus and AppState.'),
  // зачем 2026-08-22: у классик-варианта модалки лупы теперь стартуют только при
  // visible И isClassic (гибридный вариант лупов не держит) — гард стал строже.
  'components/BoonActivatedModal.tsx': owned('Activated boon classic loops follow visibility plus the classic variant and stop on cleanup.', ['if (!visible || !isClassic)', 'floatLoop.current?.stop()', 'shimmerLoop.current?.stop()']),
  'components/BoonChestModal.tsx': owned('Boon chest unmounts when hidden and stops running motion.', ['if (!visible) return null', '.stop()']),
  'components/CleanOnboarding.tsx': guarded('Onboarding breathing loop uses screen focus and AppState.'),
  'components/CollectibleArtFrame.tsx': guarded('Collectible effects use screen focus and AppState.'),
  'components/HoloFoilCard.tsx': guarded('Holo idle motion uses screen focus and AppState.'),
  // зачем (2026-08-17, «Вместе»): покачивание готового сундука недели — только пока вкладка
  // Друзья видима и приложение активно (useRuntimeActive(ownerVisible)), иначе гасится.
  'components/friends_together/FriendsChestCard.tsx': runtime('Weekly friends chest idle rock runs only while the Friends tab owns the runtime.', ['useRuntimeActive(ownerVisible)', 'cancelAnimation(rock)']),
  'components/HomeTheoAdvisorCard.tsx': guarded('Theo card float uses screen focus and AppState.'),
  // зачем 2026-08-22: glow-луп остался только у классик-варианта (гибрид без него) —
  // гард строже прежнего: visible И isClassic, плюс stop() в cleanup.
  'components/LeagueBonusAvailableModal.tsx': owned('League bonus modal unmounts while hidden; the classic glow loop additionally requires the classic variant and stops on cleanup.', ['if (!visible || !availability) return null', 'if (!visible || !isClassic) return', 'glowLoop.stop()']),
  'components/LeagueChestOpenModal.tsx': owned('League chest motion is visible-only and unmounts while hidden.', ['if (!visible) return null', 'if (!visible) return']),
  'components/LevelGiftDualModal.tsx': owned('Dual gift loops are guarded by visible phase and stopped on cleanup.', ['if (!visible', 'idleAll.current?.stop()']),
  'components/LevelGiftModal.tsx': owned('Gift loops are guarded by visibility and stopped whenever hidden.', ['if (!visible || !gift)', 'idleLoop.current?.stop()']),
  'components/LevelSpinFinishLine.tsx': guarded(
    'Spin reel runs only during the focused foreground spin phase and cancels on every exit.',
    'appActive',
  ),
  'components/LevelSpinRewardModal.tsx': owned('Reward glow exists only while the visible modal is mounted and stops on cleanup.', ['if (!visible || !requestId) return', 'glowLoopRef.current?.stop()']),
  'components/LingmanVideosButton.tsx': owned('Unread pulse follows the explicit retained-tab runtime owner.', ['ownerActive?: boolean', '!ownerActive', 'stop()']),
  'components/SeasonAuraRing.tsx': guarded('Season aura layers run only on the focused foreground screen and respect Reduced Motion.'),
  'components/SeasonGiftModal.tsx': owned('Finale nickname shimmer is mounted only while the gift modal is visible and stops on cleanup.', ["visible && reward.kind === 'season_finale'", 'return () => loop.stop()']),
  // зачем 2026-08-02: интеграционные мержи (targeted graft + preserve-worktree)
  // привезли анимационные файлы мимо реестра, и ратчет честно упал. Гарды в самих
  // файлах уже настоящие (useRuntimeActive + cancel/stop) — здесь фиксируем их
  // дословными токенами, чтобы следующий мерж не потерял гард незаметно.
  // AuraRenderer пока не подключён ни одним экраном (графт aura-native-lab).
  // зачем 2026-08-22 (та же логика, что legacyAllowlist в perf_freeze_contract):
  // ArenaComboMeter и ArenaTimerRing живут ТОЛЬКО в app/arena_match.tsx — push-экране,
  // который размонтируется целиком при выходе (не premount-таб), поэтому withRepeat(-1)
  // не может пережить фокус; гейт useIsScreenFocused/AppState здесь избыточен, а не забыт.
  // ArenaTimerRing — боевой таймер ответа: замирает только по paused-пропу владельца.
  'components/arena/ArenaComboMeter.tsx': {
    owner: 'transient_mount',
    reason: 'Combo breathe lives only inside the fully-unmounting arena_match screen, starts only while the bonus is active and is cancelled on every effect re-run.',
    requiredTokens: ['if (!active || reduceMotion) return', 'cancelAnimation(breathe)'],
  },
  // ArenaSearchPulse живёт только на экране поиска соперника (arena_matchmaking) —
  // тоже push-экран, размонтируется при выходе; каждая клетка гасит свой цикл в cleanup.
  'components/arena/ArenaSearchPulse.tsx': {
    owner: 'transient_mount',
    reason: 'Search-wave cells exist only while the matchmaking search screen is mounted; every cell cancels its shared value on unmount and reduced motion renders a still grid.',
    requiredTokens: ['still={reduceMotion}', 'return () => cancelAnimation(value)'],
  },
  'components/arena/ArenaTimerRing.tsx': {
    owner: 'transient_mount',
    reason: 'Alarm pulse lives only inside the fully-unmounting arena_match screen, is owned by the paused prop and cancelled together with its timer in effect cleanup.',
    requiredTokens: ['if (paused || reduceMotion) return', 'clearTimeout(timer); cancelAnimation(alarm);'],
  },
  'components/avatar-aura/AuraRenderer.tsx': runtime('Aura ambient loop runs only on focused foreground runtime granted by its owner and respects reduced motion; inactive auras freeze at their static phase.', ['useRuntimeActive(ownerVisible)', 'if (!ambientActive)', 'cancelAnimation(phase)']),
  'components/collectibles/CollectiblesEmptyStateMotion.tsx': runtime('Empty-collection drift sleeps off-screen/background and cancels every shared value.', ['if (reduceMotion || !runtimeActive)', 'values.forEach((value) => cancelAnimation(value))']),
  // Волна переписана мержем (AudioWaveformBase): вместо старого if (!active) гард
  // стал строже — пауза/фон/чужой экран/reduce-motion глушат цикл, а active
  // владельца входит в useRuntimeActive(active). Токены обновлены, не ослаблены.
  'components/flashcards/AudioWaveform.tsx': runtime('Waveform bars run only while audio actually plays on focused foreground runtime with reduced motion off; every loop is stopped on cleanup.', ['if (!playing || !runtimeActive || reduceMotion)', 'loop.stop()']),
  // зачем 2026-08-22: гибридный орб MAX (Главная и пре-экран звонка). Все три
  // слоя дышат только при useRuntimeActive(ownerVisible) и выключенном reduce
  // motion; иначе фазы прибиты к статичному кадру, и каждый проход эффекта
  // начинается с cancelAnimation всех shared values.
  'components/home/MaxHomeOrb.tsx': runtime(
    'Orb layers breathe only while the owner grants visibility on focused foreground runtime with reduced motion off; inactive phases are pinned to the static frame and every shared value is cancelled.',
    ['useRuntimeActive(ownerVisible)', 'if (!runtimeActive || reduceMotion)', 'cancelAnimation(shellPhase)'],
  ),
  'components/league/LeagueCompetitionScene.tsx': guarded('League beams, emblem float and confetti loops use screen focus and AppState.'),
  'components/league/LeagueMyPositionBar.tsx': guarded('My-position rank glow loop uses screen focus and AppState.'),
  'components/league/LeagueChestTeaserModal.tsx': owned('Chest teaser rays and bob run only while the modal is visible and stop on cleanup.', ['if (!visible) return null', 'if (!visible) return']),
  'components/league/LeagueHotHoursChip.tsx': guarded('Hot-hours chip pulse uses screen focus and AppState.'),
  // зачем 2026-08-02: плеер лабы Learning V2 приехал графтом и НЕ подключён к
  // LearningV2ModesLab (контракт lessons_v2_surface_contract подключение и
  // запрещает). Пульс микрофона всё равно пломбируем: живёт только в фазе
  // active при активном рантайме, вне её — loop.stop() и сброс масштаба.
  'components/learning-v2-lab/ModeDemoPlayer.tsx': runtime('Lab mic pulse runs only during the active phase on focused foreground runtime and resets on stop.', ["if (phase !== 'active' || !runtimeActive)", 'loop.stop()', 'pulse.setValue(1)']),
  // зачем 2026-08-22: дыхание текущего узла карты Learning V2 (spec mock 08,
  // владелец утвердил в каталоге движения). Гало живёт только при active-пропе,
  // который lessons.tsx собирает из useRuntimeActive(ownerVisible) — честный
  // сигнал видимости таба; reduce motion держит статичный кадр.
  'components/LearningV2MapNode.tsx': owned('Map node halo breathes only while the Lessons tab owns the runtime (active prop from useRuntimeActive) with reduced motion off; otherwise the value is cancelled and pinned static.', ['if (!active || reduceMotion)', 'cancelAnimation(halo)']),
  'components/PlayerProfileModal.tsx': owned('Profile shimmer exists only while a player is present.', ['if (!player)', 'return () => loop.stop()']),
  'components/PremiumCelebrationModal.tsx': owned('Celebration motion is visible-only and cancels Reanimated values while hidden.', ['if (!visible)', 'cancelAnimation(ringSpin)']),
  'components/PremiumGoldButton.tsx': runtime('Gold CTA shine requires focused foreground runtime plus explicit owner visibility.', ['active: boolean', 'active && premiumButtonRuntimeActive', '!buttonAnimationActive', 'anim.stop()']),
  'components/ProfileCardMotionFx.tsx': guarded('Profile card loops use screen focus and AppState.'),
  'components/ReleaseNotesModal.tsx': owned('Release notes loops run only while visible and stop on cleanup.', ['if (!visible)', 'glowLoop.stop()']),
  // зачем 2026-08-22: пульс-приглашение кнопки «в карточки» (владелец, 2026-08-17).
  // Живёт только до первого сохранения (pulse-проп владельца) и только на видимом
  // сфокусированном экране: экраны в табах не размонтируются, поэтому без
  // useIsScreenFocused цикл крутился бы в фоне.
  'components/SaveToCardsButton.tsx': owned(
    'Invite glow runs only while the owner pulse prop asks for it on a focused screen with reduced motion off, and is cancelled both when inactive and in effect cleanup.',
    ['const focused = useIsScreenFocused()', 'pulse && !saved && !disabled && !reduceMotion && focused', 'return () => cancelAnimation(glow)'],
  ),
  'components/ScreenGradient.tsx': {
    owner: 'disabled',
    reason: 'Continuous gradient motion is disabled by its production flag.',
    requiredTokens: ['const SCREEN_GRADIENT_MOTION_ENABLED = false', 'if (!SCREEN_GRADIENT_MOTION_ENABLED)'],
  },
  'components/ShineOverlay.tsx': guarded('Shine overlay uses screen focus and AppState.'),
  'components/SkeletonShimmer.tsx': guarded('Skeleton shimmer uses screen focus and AppState.'),
  // зачем 2026-08-22: float-луп остался только у классик-варианта (гибрид без него) —
  // гард строже прежнего: visible И isClassic, stop() и при выключении, и в cleanup.
  'components/WeeklyBoonDetailModal.tsx': owned('Boon detail classic float follows visibility plus the classic variant and stops on cleanup.', ['if (!visible || !isClassic)', 'floatLoop.current?.stop()']),
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
  'components/tournament/TournamentBackdrop.tsx': guarded('Tournament backdrop breathing runs only on a focused foreground screen and respects reduced motion.'),
  // Старый TodayAmbientCompass не возвращается: новый Compass использует
  // отдельную поверхность с явным владельцем активности выше.
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
        // Both supported navigation-focus ownership patterns are valid:
        // a boolean focus hook consumed by an effect, or an effect that is
        // itself mounted only while the screen is focused.
        expect(source).toMatch(/(?:useIs(?:Screen)?Focused|useFocusEffect)\s*\(/);
        const motionPattern = /Animated\.loop\s*\(|withRepeat\([\s\S]{0,220}?,\s*-1/g;
        const motionCalls = [...source.matchAll(motionPattern)];
        expect(motionCalls.length).toBeGreaterThan(0);
        for (const motionCall of motionCalls) {
          const callIndex = motionCall.index ?? 0;
          const effectWindow = source.slice(Math.max(0, callIndex - 1200), callIndex + 2500);
          const hasLocalAppStateGate = /AppState\.currentState/.test(effectWindow)
            || (!!review.appStateGateToken && effectWindow.includes(review.appStateGateToken));
          if (!hasLocalAppStateGate) {
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
