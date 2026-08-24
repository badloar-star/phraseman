import {
  __resetHomeScreenHydrationForTests,
  patchHomeScreenHydration,
  peekHomeScreenHydration,
  rememberHomeScreenHydration,
  resolveHomeStorageStats,
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

it('uses authoritative in-memory stats when SQLite values are absent or stale', () => {
  expect(resolveHomeStorageStats({
    storedTotalXp: null,
    storedStreak: null,
    profile: { source: 'live', totalXp: 564776 },
    progress: { source: 'live', streak: 93 },
  })).toEqual({ totalXp: 564776, streak: 93 });

  expect(resolveHomeStorageStats({
    storedTotalXp: '0',
    storedStreak: '0',
    profile: { source: 'live', totalXp: 564776 },
    progress: { source: 'live', streak: 93 },
  })).toEqual({ totalXp: 564776, streak: 93 });
});

const base: HomeScreenHydration = {
  userName: 'A', totalXP: 1, streak: 1, displayStreak: 1, weekDone: [], weekPoints: 0,
  shardsBalance: 0, lessonsCompleted: 0, freezeActive: false, premiumFreezeUsed: false,
  totalXPMulti: 1, userAvatar: '', userAvatarAura: null, userFrame: '', lastLessonId: null,
  lastLessonProgress: 0, lastLessonScore: '0', homeLeagueChest: null,
};

beforeEach(() => {
  __resetAccountGenerationForTests();
  __resetHomeScreenHydrationForTests();
});

it('patches the cached home league snapshot after async league refresh', () => {
  rememberHomeScreenHydration(base, 'en');
  patchHomeScreenHydration({ homeLeagueChest: { leagueName: 'Silver', progress: 215_000, goal: 220_000, myContribution: 1, leaderName: 'A', leaderPoints: 1 } }, 'en');
  expect(peekHomeScreenHydration('en')?.homeLeagueChest?.progress).toBe(215_000);
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
    hydration: { ...base, totalXP: 50_000, userAvatar: 'custom-avatar', userAvatarAura: 'aura-ember', userFrame: 'gold' },
    snapshot: { totalXp: 1, avatar: 'wrong-avatar', frame: 'wrong-frame', aura: 'aura-mint' },
  });
  expect(visuals).toMatchObject({ avatar: 'custom-avatar', frame: 'gold', aura: 'aura-ember' });
});

it('hydrates first-frame profile visuals from app snapshot when home cache is absent', () => {
  const visuals = resolveHomeProfileVisuals({
    hydration: null,
    snapshot: { totalXp: 50_000, avatar: 'snapshot-avatar', frame: 'snapshot-frame', aura: 'aura-mint' },
  });
  expect(visuals).toMatchObject({ avatar: 'snapshot-avatar', frame: 'snapshot-frame', aura: 'aura-mint' });
});

it('does not treat bootstrap avatar 1 as a real first-frame profile choice for high XP', () => {
  const visuals = resolveHomeProfileVisuals({
    hydration: null,
    snapshot: { totalXp: 50_000, avatar: '1', frame: '' },
  });
  expect(visuals.avatar).not.toBe('1');
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
  expect(source).toContain("profile.source === 'live' || (totalXP === 0 && profile.totalXp > 0)");
  expect(source).toContain("progress.source === 'live' || (streak === 0 && progress.streak > 0)");
  expect(source).toContain('const visuals = resolveHomeProfileVisuals({ snapshot: profile });');
  expect(source).toContain('setUserAvatar((current) => current === visuals.avatar ? current : visuals.avatar);');
  expect(source).toContain('setUserFrame((current) => current === visuals.frame ? current : visuals.frame);');
  expect(source).toContain('setUserAvatarAura((current) => current === visuals.aura ? current : visuals.aura);');
});
