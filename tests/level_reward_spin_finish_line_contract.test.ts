import { readFileSync } from 'fs';
import { join } from 'path';

describe('Finish Line level spin screen contract', () => {
  const source = () => readFileSync(join(process.cwd(), 'app', 'level_reward_spin.tsx'), 'utf8');
  const presentation = () => readFileSync(join(process.cwd(), 'components', 'LevelSpinFinishLine.tsx'), 'utf8');
  const motion = () => readFileSync(join(process.cwd(), 'app', 'level_reward_spin_motion.ts'), 'utf8');

  test('uses one Reanimated offset, scheduleOnRN, reduced motion, and transform/opacity motion', () => {
    const code = presentation();
    expect(code).toContain('useSharedValue');
    expect(code).toContain('scheduleOnRN');
    expect(code).toContain('useReducedMotion');
    expect(code).toContain('translateY');
    expect(code).toContain('opacity');
    expect(code).not.toContain('runOnJS');
    expect(code).not.toMatch(/\b(top|height|marginTop)\s*:\s*(?:offset|reelOffset)\.value/);
  });

  test('recovers the local persisted request before allowing a new claim and uses a one-tap terminal action', () => {
    const code = `${source()}\n${presentation()}`;
    expect(code).toContain('recoverLocalLevelSpin');
    expect(code).toContain('claimLocalLevelSpin');
    expect(code).toContain('handleResultAction');
    expect(code).toContain("'level-spin-next'");
    expect(code).toContain("'level-spin-done'");
    expect(code).not.toContain('resetForNextSpin');
    expect(code).toContain('accessibilityElementsHidden');
  });

  test('rejects stale async UI results across account-generation changes', () => {
    const code = source();
    expect(code).toContain('captureAccountGeneration');
    expect(code).toContain('isCurrentAccountGeneration');
    expect(code).toContain('subscribeAccountGeneration');
    expect(code).toContain('if (!isCurrentAccountGeneration(accountToken)) return;');
  });

  test('renders the exact immutable server receipt without current-Plus substitution', () => {
    const code = source();
    expect(code).not.toContain('usePremium');
    expect(code).not.toContain('premiumSafeLevelGiftId');
    expect(code).not.toContain('displayReceipt');
    expect(code).toContain('receipt={receipt}');
  });

  test('keeps a 15-card existing reward image stream under a fixed selector', () => {
    const code = presentation();
    const ids = code.match(/'(?:energy_full|xp_100|xp_250|hint_1|xp_bank_150|xp_2x_24h|energy_plus2|chain_shield_1|hint_3|xp_bank_300|cosmetic_avatar_common|xp_2x_48h|energy_plus3|xp_bank_600|choice_3_level)'/g) ?? [];
    expect(new Set(ids).size).toBeGreaterThanOrEqual(15);
    expect(code).toContain('testID="level-spin-selector"');
  });

  test('loops on an exact row cycle and retargets receipt deceleration without a snap', () => {
    const code = presentation();
    expect(code).toContain('withRepeat(withTiming(accelerationTarget - loopDistance');
    const receiptEffect = code.slice(code.indexOf('if (!receipt) {'), code.indexOf('const ctaTestID'));
    expect(receiptEffect).not.toContain('reelOffset.value = -(REWARD_STREAM_IDS.length * ROW_HEIGHT)');
    expect(receiptEffect).toContain('createLevelSpinLandingPlan');
    expect(receiptEffect).toContain('pendingLandingRef.current');
  });

  test('lets the idle reel follow a finger and coast with bounded native inertia', () => {
    const code = presentation();
    const manualGesture = code.slice(
      code.indexOf('const manualReelGesture'),
      code.indexOf('const adjustManualReel'),
    );
    expect(code).toContain("import { Gesture, GestureDetector } from 'react-native-gesture-handler'");
    expect(code).toContain('withDecay');
    expect(manualGesture).toContain('Gesture.Pan()');
    expect(manualGesture).toContain('.enabled(manualReelEnabled)');
    expect(code).toContain('const manualReelEnabled = manualReelEligible && isFocused && appActive;');
    expect(code).toContain("phase !== 'spinning' && !manualReelEligible");
    expect(manualGesture).toContain('.activeOffsetY([-4, 4])');
    expect(manualGesture).not.toContain('.failOffsetX(');
    expect(manualGesture).toContain('manualDragStartOffset.value + event.translationY');
    expect(manualGesture).toContain('const velocity = Math.max(');
    expect(manualGesture).toContain('withDecay({\n        velocity,');
    expect(manualGesture).toContain('deceleration: MANUAL_REEL_DECELERATION');
    expect(manualGesture).toContain('clamp: [manualReelMinOffset, manualReelMaxOffset]');
    expect(manualGesture).toContain('nearestManualReelRowOffset');
    expect(manualGesture).toContain('if (reducedMotion)');
    expect(code).toContain('<GestureDetector gesture={manualReelGesture}>');
  });

  test('keeps manual reel play presentation-only and reserves claims for the Spin button', () => {
    const finishLine = presentation();
    const screen = source();
    const manualGesture = finishLine.slice(
      finishLine.indexOf('const manualReelGesture'),
      finishLine.indexOf('const adjustManualReel'),
    );
    const eligibility = finishLine.slice(
      finishLine.indexOf('const manualReelEligible'),
      finishLine.indexOf('const manualReelEnabled'),
    );
    expect(eligibility).toContain("phase !== 'spinning'");
    expect(eligibility).toContain("phase !== 'revealed'");
    expect(eligibility).not.toContain('balance');
    expect(manualGesture).not.toContain('onSpin');
    expect(manualGesture).not.toContain('claimLocalLevelSpin');
    expect(manualGesture).not.toContain('soundDirector');
    expect(manualGesture).not.toContain('haptic');
    expect(finishLine).toContain(': onSpin;');
    expect(finishLine).toContain('onPress={handleCtaPress}');
    expect(screen).toContain(': await claimLocalLevelSpin()');
  });

  test('explains the no-cost preview gesture to touch and accessibility users', () => {
    const code = presentation();
    expect(code).toContain('accessibilityRole="adjustable"');
    expect(code).toContain("{ name: 'increment' }");
    expect(code).toContain("{ name: 'decrement' }");
    expect(code).toContain('Крути пальцем для просмотра · спин запускает кнопка');
    expect(code).toContain('без расхода спина');
  });

  test('cancels motion off-screen and invalidates stale receipt callbacks', () => {
    const code = presentation();
    expect(code).toContain('useIsScreenFocused');
    expect(code).toContain('AppState.addEventListener');
    expect(code).toContain('cancelAnimation(reelOffset)');
    expect(code).toContain("phase === 'spinning'");
    expect(code).toContain('spinStartedAtRef.current = null');
    expect(code).toContain('activeReceiptRef.current !== requestId');
    expect(code).not.toContain('Easing.in(');
  });

  test('acknowledges only after the result has reached the revealed lifecycle', () => {
    const screen = source();
    const finishLine = presentation();
    expect(finishLine).toContain("'revealed'");
    expect(finishLine).toContain('onRevealed');
    expect(finishLine).toContain('onRevealed(receipt.requestId)');
    expect(screen).toContain('acknowledgeLocalLevelSpin');
    expect(screen).toContain("setPhase('revealed')");
    expect(screen).toContain('onRevealed={handleRevealed}');
  });

  test('keeps exactly one winner modal, then saves the reward to Gifts on claim', () => {
    const screen = source();
    const finishLine = presentation();
    expect(screen).toContain('localLevelSpinReceiptToInventory');
    expect(screen).not.toContain("import LevelGiftModal from '../components/LevelGiftModal'");
    expect(screen).not.toContain('markLevelSpinGiftOccurrenceClaimed');
    expect(screen).not.toContain('testID="level-spin-gift-modal-host"');
    expect(readFileSync(join(process.cwd(), 'components', 'LevelSpinRewardModal.tsx'), 'utf8')).toContain("soundDirector.request('pm.spin.reward_lock'");
    expect(screen).not.toContain("soundDirector.request('pm.spin.reel_start'");
    expect(screen).toContain('await acknowledgeLocalLevelSpin(requestId)');
    expect(screen).toContain("safeRouterBack(router, '/level_gifts_inventory' as never)");
    expect(screen).not.toContain('rewardLane');
    expect(finishLine).not.toContain('ПОДАРОК УЖЕ В ПУТИ');
    expect(finishLine).not.toContain('Подарок уже в пути');
    expect(finishLine).not.toContain('Повторить');
    expect(finishLine).not.toContain('ПОВТОРИТЬ');
  });

  test('hands the completed rollback directly to the reward modal instead of waiting for a fragile result-card effect', () => {
    const finishLine = presentation();
    expect(finishLine).toContain('const completeLanding = useCallback');
    expect(finishLine).toContain('onRevealed(requestId)');
    expect(finishLine).toContain('scheduleOnRN(startRevealSettle, receipt.requestId, SPIN_SETTLE_MS)');
    expect(finishLine).toContain('completeLanding(requestId);');
    expect(finishLine).not.toContain('const finishReveal = useCallback');
  });

  test('uses a dedicated animated spin reward modal and never depends on a display-card lookup to reveal it', () => {
    const screen = source();
    const finishLine = presentation();
    const rewardModal = readFileSync(join(process.cwd(), 'components', 'LevelSpinRewardModal.tsx'), 'utf8');
    expect(screen).toContain("import LevelSpinRewardModal from '../components/LevelSpinRewardModal'");
    expect(screen).toContain('setRewardPreviewVisible(true)');
    expect(screen).toContain('giftId={receipt?.baseGiftId ?? null}');
    expect(screen).toContain('onClaim={() => {');
    expect(rewardModal).toContain('testID="level-spin-reward-modal"');
    expect(rewardModal).toContain('if (!visible) return null;');
    expect(rewardModal).toContain("gift?.id ?? giftId ?? 'choice_3_level'");
    expect(rewardModal).toContain('Animated.spring');
    expect(rewardModal).toContain("'pm.spin.reward_win'");
    expect(finishLine).not.toContain('!resultGift ||');
  });

  test('uses the local balance after recovery without requesting remote status', () => {
    const code = source();
    const run = code.slice(code.indexOf('const run = useCallback'), code.indexOf('useEffect(() =>'));
    expect(run).toContain('await readLocalLevelSpinBalance()');
    expect(run).not.toContain('fetchLevelSpinStatus');
  });

  test('uses a title-free full-width responsive layout with a persistent compact Spin count', () => {
    const screen = source();
    const finishLine = presentation();
    expect(screen).not.toContain('level-spin-title');
    expect(screen).not.toContain('Финишная линия');
    expect(screen).toContain("ru: `Спины: ${balance}`");
    expect(screen).toContain("ru: 'Спины'");
    expect(screen).toContain('testID="level-spin-balance-count"');
    expect(screen).not.toContain('Вращения');
    expect(finishLine).toContain('useWindowDimensions');
    expect(finishLine).toContain('fontScale > 1.25');
    expect(finishLine).toContain('const selectorCenterY = (machineHeight ?? 0) / 2');
    expect(finishLine).toContain('top: selectorCenterY - cardHeight / 2');
    expect(finishLine).not.toContain('maxWidth: 390');
  });

  test('uses clear Spin actions and never exposes transport diagnostics in the user surface', () => {
    const screen = source();
    const finishLine = presentation();
    expect(finishLine).toContain("ru: 'КРУТИТЬ'");
    expect(finishLine.match(/ru: 'КРУТИТЬ'/g)?.length).toBeGreaterThanOrEqual(2);
    expect(finishLine).not.toContain("ru: 'Нажми «Повторить»'");
    expect(finishLine).not.toContain('{__DEV__ && errorText ?');
    expect(finishLine).not.toContain('app_check_unavailable');
    expect(screen).not.toContain('<Text>{errorText}</Text>');
    expect(screen).not.toContain('waitForVisibleSpin');
    expect(finishLine).not.toContain('Результат решает сервер');
    expect(finishLine).not.toContain('Ð ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚ Ñ€ÐµÑˆÐ°ÐµÑ‚ ÑÐµÑ€Ð²ÐµÑ€');
  });

  test('matches selected concept A reel-stage, capture, fades, toast, and footer hierarchy', () => {
    const code = presentation();
    expect(code).toContain('testID="level-spin-reel-stage"');
    expect(code).toContain('testID="level-spin-fade-top"');
    expect(code).toContain('testID="level-spin-fade-bottom"');
    expect(code).toContain('styles.rarityPill');
    expect(code).toContain('testID="level-spin-reward-gradient"');
    expect(code).toContain('testID="level-spin-result-gradient"');
    expect(code).toContain('styles.selectorPointerLeft');
    expect(code).toContain('styles.selectorPointerRight');
    expect(code).toContain('borderWidth: 2');
    expect(code).toContain('styles.resultToast');
    expect(code).toContain('styles.spinFooter');
    expect(code).toContain('styles.fineCopy');
    expect(code).not.toContain('styles.machine');
    expect(code).not.toContain('styles.resultCard');
    expect(code).not.toContain('styles.statusSlot');
  });

  test('keeps an early authoritative receipt on the 3-second acceleration/cruise/deceleration/settle timeline', () => {
    const code = presentation();
    const motionCode = motion();
    expect(motionCode).toContain('LEVEL_SPIN_ACCELERATION_MS = 350');
    expect(motionCode).toContain('LEVEL_SPIN_CRUISE_READY_MS = 1_600');
    expect(motionCode).toContain('LEVEL_SPIN_DECELERATION_MS = 1_200');
    expect(motionCode).toContain('LEVEL_SPIN_SETTLE_MS = 200');
    expect(motionCode).toContain('Math.max(0, LEVEL_SPIN_CRUISE_READY_MS');
    expect(code).toContain('scheduleOnRN(startRevealSettle');
    expect(code).toContain('duration = SPIN_SETTLE_MS');
    expect(code).not.toContain('runOnJS');
  });

  test('uses one deterministic result accessibility strategy and gates the reel on measured geometry', () => {
    const code = presentation();
    expect(code).not.toContain('announceForAccessibility');
    expect(code).not.toContain('accessibilityLiveRegion="polite"\n          accessibilityLabel={resultAccessibilityLabel}');
    expect(code).toContain('useState<number | null>(null)');
    expect(code).toContain('machineHeight !== null');
  });

  test('resets motion state before a different authoritative request starts', () => {
    const code = presentation();
    expect(code).toContain('motionReceiptRef.current !== receipt.requestId');
    expect(code).toContain('const activeSpinAlreadyRunning');
    expect(code).toContain('motionReceiptRef.current = receipt.requestId');
    expect(code).toContain('pendingLandingRef.current = null');
    expect(code).toContain('if (!activeSpinAlreadyRunning)');
  });

  test('uses rarity and value gradients on reward rows with no background glow behind them', () => {
    const finish = presentation();
    const screen = source();
    expect(finish).toContain('function rewardGradientForGift(gift: GiftDef)');
    expect(finish).toContain('rewardGradientForGift(gift)');
    expect(finish).toContain('colors={rewardGradient}');
    expect(finish).not.toContain('testID="level-spin-center-glow"');
    expect(finish).not.toContain('centerGlow:');
    expect(finish).not.toContain('minHeight: 400');
    expect(screen).toContain('resultActionBusyRef.current');
  });

  test('suppresses Android elevation on gradient reward rows so their shadows cannot render as rectangles', () => {
    const finish = presentation();
    expect(finish).toContain("import { noAndroidOutline } from '../constants/androidGlow'");
    expect(finish).toMatch(/shadowOffset: \{ width: 0, height: 8 \},\s*\.\.\.noAndroidOutline/);
  });
});
