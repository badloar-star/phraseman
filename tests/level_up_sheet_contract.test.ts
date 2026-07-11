import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('global level-up sheet contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');

  it('uses the centered level badge modal instead of the full-screen level-up sheet', () => {
    expect(source).toContain('testID="level-up-modal"');
    expect(source).toContain('<LevelBadge level={currentLevel}');
    expect(source).toContain('USE_ELITE_LEVEL_UP_MODAL');
    expect(source).not.toContain('testID="level-up-sheet"');
    expect(source).not.toContain('AvatarView avatar={levelUpDisplayAvatar}');
    expect(source).not.toContain("const LEVEL_UP_FALLBACK_AVATAR = 'custom:custom-gen-04:royal:white'");
  });

  it('keeps the old centered modal spring animation', () => {
    expect(source).toContain('levelUpTranslateY.setValue(40)');
    expect(source).toContain('Animated.spring(levelUpOpacity');
    expect(source).toContain('Animated.spring(levelUpTranslateY');
    expect(source).toContain('levelUpModalScale');
  });

  it('keeps the dev preview URL wired through the real pending queue', () => {
    expect(source).toContain('globalParams.levelUpPreview');
    expect(source).toContain("AsyncStorage.setItem('pending_level_up_queue', JSON.stringify([level]))");
    expect(source).toContain('.then(flushQueue)');
  });

  it('acknowledges a pending level only after the native modal is actually shown', () => {
    expect(source).toContain('onShow={acknowledgeNativeLevelUpShown}');
    expect(source).toContain('canAcknowledgeLevelUpForAccount');
    expect(source).toContain('await acknowledgePendingLevelUpShown(shownLevel)');
    expect(source).not.toContain('removeShownLevelFromPersistentQueue');
  });

  it('drops stale account work and resets the visible chain on every generation change', () => {
    expect(source).toContain('subscribeAccountGeneration');
    expect(source).toContain('resetLevelUpChainForAccountChange');
    expect(source).toContain('withAccountTransitionLock');
    expect(source).toContain('isLevelUpAccountTokenCurrent(flushToken)');
    expect(source).toContain('queuedAccountTokenRef.current = flushToken');
    expect(source).toContain('modalAccountTokenRef.current = accountToken');
    expect(source).toContain('if (!finished || !canAcknowledgeLevelUpForAccount');
  });

  it('repairs rewards before reading the queue and retries when the app returns active', () => {
    expect(source).toContain('retryPendingLevelUpRewards({ premium: !!hasPremiumAccess, studyTarget })');
    expect(source).toContain('repairPendingLevelUpRewards({ premium: !!hasPremiumAccess, studyTarget })');
    expect(source).toMatch(/AppState\.addEventListener\('change', \(state\) => \{\s*if \(state === 'active'\) void flushQueue\(\);/);
  });

  it('uses the exact durable gift shape, including a legacy single remainder', () => {
    expect(source).toContain('loadUnclaimedDualGifts()');
    expect(source).toContain('const savedPair = dualMap[lvl]');
    expect(source).toContain('const savedGift = singleMap[lvl]');
    expect(source).toContain('setGiftPreRolledPair(savedPair ?? undefined)');
    expect(source).toContain('setGiftPreRolled(savedPair ? undefined : savedGift ?? undefined)');
    expect(source).toContain('setLevelGiftDualMode(!!savedPair)');
    expect(source).toContain('preRolledPair={giftPreRolledPair}');
    expect(source).not.toContain('setLevelGiftDualMode(!!hasPremiumAccess)');
  });

  it('labels catch-up level rewards without exposing account reconciliation details', () => {
    expect(source).toContain("AsyncStorage.multiGet(['user_name', 'user_total_xp'])");
    expect(source).toContain('const [currentAccountLevel, setCurrentAccountLevel] = useState(0)');
    expect(source).toContain('const isCatchUpLevelReward = currentAccountLevel > currentLevel');
    expect(source).toContain('levelUpKickerText');
    expect(source).toContain('levelUpMessageText');
    expect(source).toContain('Это твоя награда за уровень ${currentLevel}. Забирай подарок.');
    expect(source).not.toContain('Сейчас у тебя уровень ${currentAccountLevel}');
    expect(source).not.toContain('Now you have level');
  });
});
