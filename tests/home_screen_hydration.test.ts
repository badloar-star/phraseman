import {
  patchHomeScreenHydration,
  peekHomeScreenHydration,
  rememberHomeScreenHydration,
  resolveHomeProfileVisuals,
  type HomeScreenHydration,
} from '../app/home_screen_hydration';

const base: HomeScreenHydration = {
  userName: 'A', totalXP: 1, streak: 1, displayStreak: 1, weekDone: [], weekPoints: 0,
  shardsBalance: 0, lessonsCompleted: 0, freezeActive: false, premiumFreezeUsed: false,
  totalXPMulti: 1, userAvatar: '', userAvatarAura: null, userFrame: '', lastLessonId: null,
  lastLessonProgress: 0, lastLessonScore: '0', homeLeagueChest: null,
};

it('patches the cached home league snapshot after async league refresh', () => {
  rememberHomeScreenHydration(base, 'en');
  patchHomeScreenHydration({ homeLeagueChest: { leagueName: 'Silver', progress: 215_000, goal: 220_000, myContribution: 1, leaderName: 'A', leaderPoints: 1 } }, 'en');
  expect(peekHomeScreenHydration('en')?.homeLeagueChest?.progress).toBe(215_000);
});

it('hydrates first-frame profile visuals from cached home state before async storage', () => {
  const visuals = resolveHomeProfileVisuals({
    hydration: { ...base, totalXP: 50_000, userAvatar: 'custom-avatar', userAvatarAura: 'aura-ember', userFrame: 'gold' },
    snapshot: { totalXp: 1, avatar: 'wrong-avatar', frame: 'wrong-frame', aura: 'aura-violet' },
  });
  expect(visuals).toMatchObject({ avatar: 'custom-avatar', frame: 'gold', aura: 'aura-ember' });
});

it('hydrates first-frame profile visuals from app snapshot when home cache is absent', () => {
  const visuals = resolveHomeProfileVisuals({
    hydration: null,
    snapshot: { totalXp: 50_000, avatar: 'snapshot-avatar', frame: 'snapshot-frame', aura: 'aura-violet' },
  });
  expect(visuals).toMatchObject({ avatar: 'snapshot-avatar', frame: 'snapshot-frame', aura: 'aura-violet' });
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
