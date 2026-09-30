import {
  __resetHomeScreenHydrationForTests,
  patchHomeScreenHydration,
  peekHomeScreenHydration,
  rememberHomeScreenHydration,
  resolveHomeProfileVisuals,
  type HomeScreenHydration,
} from '../app/home_screen_hydration';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  beginInitialAccountGeneration,
  invalidateAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';

const base: HomeScreenHydration = {
  userName: 'A', streak: 1, displayStreak: 1, weekDone: [], weekPoints: 0,
  shardsBalance: 0, lessonsCompleted: 0, freezeActive: false, premiumFreezeUsed: false,
  userAvatar: '', userAvatarAura: null, userFrame: '', lastLessonId: null,
  lastLessonProgress: 0, lastLessonScore: '0',
};

beforeEach(() => {
  __resetAccountGenerationForTests();
  __resetHomeScreenHydrationForTests();
});


it('keeps an uninitialized boot snapshot only until account adoption', () => {
  rememberHomeScreenHydration(base, 'en');
  expect(peekHomeScreenHydration('en')).toMatchObject({ userName: 'A' });

  expect(beginInitialAccountGeneration('account-a')).not.toBeNull();
  expect(peekHomeScreenHydration('en')).toBeNull();
});

it('rejects A cache and A patch after transitioning to B', () => {
  beginAccountGeneration('account-a');
  rememberHomeScreenHydration({ ...base, userName: 'Account A', lastLessonId: 7 }, 'en');
  expect(peekHomeScreenHydration('en')).toMatchObject({ userName: 'Account A', lastLessonId: 7 });

  invalidateAccountGeneration();
  expect(peekHomeScreenHydration('en')).toBeNull();
  beginAccountGeneration('account-b');
  patchHomeScreenHydration({ userName: 'Patched by B', lastLessonId: 9 }, 'en');
  expect(peekHomeScreenHydration('en')).toBeNull();

  rememberHomeScreenHydration({ ...base, userName: 'Account B', lastLessonId: 2 }, 'en');
  expect(peekHomeScreenHydration('en')).toMatchObject({ userName: 'Account B', lastLessonId: 2 });
});

it('rejects a snapshot after a new generation even for the same stable id', () => {
  beginAccountGeneration('account-a');
  rememberHomeScreenHydration(base, 'en');
  beginAccountGeneration('account-a');
  expect(peekHomeScreenHydration('en')).toBeNull();
});

it('rejects a late Home write captured before an account switch', () => {
  beginAccountGeneration('account-a');
  const accountAOperation = captureAccountGeneration();
  invalidateAccountGeneration();
  beginAccountGeneration('account-b');

  rememberHomeScreenHydration(
    { ...base, userName: 'Late Account A', lastLessonId: 12 },
    'en',
    accountAOperation,
  );
  expect(peekHomeScreenHydration('en')).toBeNull();
});

it('hydrates first-frame profile visuals from cached home state before async storage', () => {
  const visuals = resolveHomeProfileVisuals({
    hydration: { ...base, userAvatar: 'custom-avatar', userAvatarAura: 'aura-ember', userFrame: 'gold' },
    snapshot: { avatar: 'wrong-avatar', frame: 'wrong-frame', aura: 'aura-mint' },
  });
  // зачем: D108 — ауры удалены: Главная всегда получает «без ауры».
  expect(visuals).toMatchObject({ avatar: 'custom-avatar', frame: 'gold', aura: null });
});

it('hydrates first-frame profile visuals from app snapshot when home cache is absent', () => {
  const visuals = resolveHomeProfileVisuals({
    hydration: null,
    snapshot: { avatar: 'snapshot-avatar', frame: 'snapshot-frame', aura: 'aura-mint' },
  });
  expect(visuals).toMatchObject({ avatar: 'snapshot-avatar', frame: 'snapshot-frame', aura: null });
});

it('applies authoritative cloud stats after local Home hydration has already finished', () => {
  const { shouldApplyHomeSnapshotToStats } = require('../app/home_screen_hydration') as {
    shouldApplyHomeSnapshotToStats?: (loaded: boolean, profileSource?: string, progressSource?: string) => boolean;
  };
  expect(shouldApplyHomeSnapshotToStats).toEqual(expect.any(Function));
  expect(shouldApplyHomeSnapshotToStats!(true, 'live', 'live')).toBe(true);
  expect(shouldApplyHomeSnapshotToStats!(true, 'storage', 'storage')).toBe(false);
  expect(shouldApplyHomeSnapshotToStats!(true, 'local', 'storage')).toBe(true);
});

it('keeps delayed app snapshot hydration wired to home profile visuals', () => {
  const source = require('fs').readFileSync(require('path').join(__dirname, '..', 'app/(tabs)/home.tsx'), 'utf8');
  expect(source).toContain('shouldApplyHomeSnapshotToStats(homeStatsLoadedOnce, profile?.source, progress?.source)');
  expect(source).toContain("progress.source === 'live' || (streak === 0 && progress.streak > 0)");
  expect(source).toContain('const visuals = resolveHomeProfileVisuals({ snapshot: profile });');
  expect(source).toContain('setUserAvatar((current) => current === visuals.avatar ? current : visuals.avatar);');
  expect(source).toContain('setUserFrame((current) => current === visuals.frame ? current : visuals.frame);');
  expect(source).toContain('setUserAvatarAura((current) => current === visuals.aura ? current : visuals.aura);');
});
