import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('global level-up sheet contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
  // зачем 2026-08-16: гибрид «Световод + Чекан» стал единственной реализацией
  // (project_motion_program.md). components/LevelUpThresholdModal.tsx осталась
  // точкой входа (тонкая обёртка); хореография/testID'ы живут в Hybrid.
  const entrySource = fs.readFileSync(path.join(ROOT, 'components', 'LevelUpThresholdModal.tsx'), 'utf8');
  const modalSource = fs.readFileSync(path.join(ROOT, 'components', 'LevelUpThresholdModalHybrid.tsx'), 'utf8');
  const devSheetSource = fs.readFileSync(path.join(ROOT, 'components', 'dev', 'DevHubSheet.tsx'), 'utf8');

  it('uses the centered level badge modal instead of the full-screen level-up sheet', () => {
    expect(source).toContain('<LevelUpThresholdModal');
    expect(entrySource).toContain('<LevelUpThresholdModalHybrid');
    expect(modalSource).toContain('testID="level-up-modal-hybrid"');
    expect(modalSource).toContain('<LevelBadge level={level}');
    expect(source).not.toContain('testID="level-up-sheet"');
    expect(source).not.toContain('AvatarView avatar={levelUpDisplayAvatar}');
    expect(source).not.toContain("const LEVEL_UP_FALLBACK_AVATAR = 'custom:custom-gen-04:royal:white'");
  });

  it('keeps the exit-timing gate wired into the extracted surface without dead Animated.Value drivers', () => {
    // зачем 2026-08-16: Hybrid ведёт вход/выход своим reanimated-движком —
    // родителю (app/_layout.tsx) больше не нужны Animated.Value-драйверы
    // (opacity/translateY/glow). Тот же порядок и тайминг переходов
    // (220мс спин-финализация) сохранён через setTimeout вместо
    // Animated.timing(...).start(callback). Отдельного gift-dismiss больше нет.
    expect(source).not.toContain('levelUpOpacity');
    expect(source).not.toContain('levelUpTranslateY');
    expect(source).not.toContain('levelUpGlow');
    expect(source).not.toContain('USE_ELITE_LEVEL_UP_MODAL');
    expect(source).toContain('const exitTimer = setTimeout(() => {');
    expect(source).toMatch(/}, 220\);/);
  });

  it('keeps DEV previews isolated from the real pending queue', () => {
    expect(source).not.toContain('globalParams.levelUpPreview');
    expect(devSheetSource).toContain('<LevelUpThresholdModal');
    expect(devSheetSource).toContain('spinReward={true}');
    expect(devSheetSource).not.toContain('pending_level_up_queue');
    expect(devSheetSource).not.toContain('flushQueue');
  });

  it('acknowledges the Spin receipt only through the explicit completion action', () => {
    expect(source).toContain('onShow={() => {');
    expect(source).toContain('onContinue={finalizeSpinLevelUp}');
    expect(source).toContain('await acknowledgePendingLevelSpinLevelUp(level)');
    expect(source).toContain('canAcknowledgeLevelUpForAccount');
    expect(source).not.toContain('acknowledgeNativeLevelUpShown');
    expect(source).not.toContain('removeShownLevelFromPersistentQueue');
  });

  it('drops stale account work and resets the visible chain on every generation change', () => {
    expect(source).toContain('subscribeAccountGeneration');
    expect(source).toContain('resetLevelUpChainForAccountChange');
    expect(source).toContain('withAccountTransitionLock');
    expect(source).toContain('isLevelUpAccountTokenCurrent(flushToken)');
    expect(source).toContain('queuedAccountTokenRef.current = flushToken');
    expect(source).toContain('modalAccountTokenRef.current = accountToken');
    // зачем 2026-08-16: Animated.timing(...).start(({finished}) => ...) ушёл
    // вместе с levelUpOpacity — тот же гвард «дропнуть устаревший переход»
    // теперь стоит первой строкой внутри setTimeout-колбэка exitTimer.
    expect(source).toContain('if (!canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) {');
  });

  it('repairs rewards before reading the queue and retries when the app returns active', () => {
    expect(source).toContain('retryPendingLevelUpRewards({ premium: !!hasPremiumAccess, studyTarget })');
    expect(source).toContain('repairPendingLevelUpRewards({ premium: !!hasPremiumAccess, studyTarget })');
    expect(source).toContain("const sub = AppState.addEventListener('change', (state) => {");
    expect(source).toContain("if (state !== 'active') return;");
    expect(source).toContain("scheduleCoalescedForegroundTask('root_level_up_queue_flush'");
    expect(source).toContain('await drainLevelUpBonusOutbox();');
    expect(source).toContain('await flushQueue();');
  });

  it('keeps the automatic level-up presentation Spin-only', () => {
    expect(source).toContain('loadPendingLevelSpinLevelUps()');
    expect(source).not.toContain('<LevelGiftModal');
    expect(source).not.toContain('<LevelGiftDualModal');
    expect(source).not.toContain('preRolledPair={giftPreRolledPair}');
  });

  it('labels catch-up levels without reserving gift-copy space', () => {
    expect(source).toContain("AsyncStorage.multiGet(['user_name', 'user_total_xp'])");
    expect(source).toContain('const [currentAccountLevel, setCurrentAccountLevel] = useState(0)');
    expect(source).toContain('const isCatchUpLevelReward = currentAccountLevel > currentLevel');
    expect(source).toContain('levelUpKickerText');
    expect(source).toContain("message={''}");
    expect(source).not.toContain('Сейчас у тебя уровень ${currentAccountLevel}');
    expect(source).not.toContain('Now you have level');
  });
});
