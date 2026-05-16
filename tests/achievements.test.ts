import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/xp_manager', () => ({
  registerXP: jest.fn(async () => ({ finalDelta: 0 })),
}));

jest.mock('../app/events', () => ({
  emitAppEvent: jest.fn(),
}));

jest.mock('../app/storage_mutex', () => ({
  withStorageLock: jest.fn(async (fn: () => unknown) => fn()),
}));

jest.mock('../app/firestore_friend_activity', () => ({
  writeFriendEvent: jest.fn(async () => {}),
}));

jest.mock('../app/shards_system', () => ({
  addShardsRaw: jest.fn(async (amount: number) => amount),
  getShardsBalance: jest.fn(async () => 0),
}));

import {
  ALL_ACHIEVEMENTS,
  checkAchievements,
  devSeedAchievementsSmoke,
  loadAchievementStates,
} from '../app/achievements';
import { ACHIEVEMENT_ES } from '../app/achievements_es_locale';

const idsOf = (items: { id: string }[]) => items.map(x => x.id);

async function unlockedIds(): Promise<Set<string>> {
  const states = await loadAchievementStates();
  return new Set(states.filter(s => s.unlockedAt !== null).map(s => s.id));
}

describe('achievements', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('has unique ids, Spanish copy and image entries for every achievement', () => {
    const ids = idsOf(ALL_ACHIEVEMENTS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(81);

    const missingEs = ids.filter(id => !ACHIEVEMENT_ES[id]);
    expect(missingEs).toEqual([]);

    const screenPath = path.join(__dirname, '..', 'app', 'achievements_screen.tsx');
    const screenSource = fs.readFileSync(screenPath, 'utf8');
    const imageBlock = screenSource.match(/export const ACHIEVEMENT_IMAGE:[\s\S]*?};/)?.[0] ?? '';
    const imageIds = new Set([...imageBlock.matchAll(/^\s*([a-z0-9_]+):\s*require/gm)].map(m => m[1]));
    const missingImages = ids.filter(id => !imageIds.has(id));
    expect(missingImages).toEqual([]);
  });

  it('does not leave the achievements promo count hard-coded to the old total', () => {
    const files = [
      path.join(__dirname, '..', 'app', 'streak_stats.tsx'),
      path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'),
      path.join(__dirname, '..', 'app', 'achievements_screen.tsx'),
    ];
    const offenders = files.flatMap(file => {
      const source = fs.readFileSync(file, 'utf8');
      return [
        ...source.matchAll(/(?:все|усі|las)\s+35\s+(?:наград|нагород|recompensas)/gi),
      ].map(match => `${path.relative(path.join(__dirname, '..'), file)}:${match[0]}`);
    });

    expect(offenders).toEqual([]);
  });

  it('uses pluralized RU/UK copy for the received achievements count', () => {
    const file = path.join(__dirname, '..', 'app', 'streak_stats.tsx');
    const source = fs.readFileSync(file, 'utf8');

    expect(source).toContain('ruAchievementRewardPhrase(achievementCount)');
    expect(source).toContain('ukAchievementRewardPhrase(achievementCount)');
    expect(source).toContain('loadAchievementStates()');
    expect(source).not.toContain('ALL_ACHIEVEMENTS.length');
    expect(source).not.toContain('`${ALL_ACHIEVEMENTS.length} наград`');
    expect(source).not.toContain('`${ALL_ACHIEVEMENTS.length} нагород`');
  });

  it('renders achievements screen as earned-only collection', () => {
    const screenPath = path.join(__dirname, '..', 'app', 'achievements_screen.tsx');
    const source = fs.readFileSync(screenPath, 'utf8');

    expect(source).toContain("a.category === cat && !!stateMap.get(a.id)?.unlockedAt");
    expect(source).toContain('if (catAchs.length === 0) return [];');
    expect(source).not.toContain('unlockedCount} / {total}');
  });

  it('can unlock every achievement through its public event contract', async () => {
    await checkAchievements({ type: 'streak', streak: 500 });
    await checkAchievements({ type: 'streak_repair' });
    await checkAchievements({ type: 'perfect_week' });

    await checkAchievements({ type: 'xp', totalXP: 100000 });
    await checkAchievements({ type: 'wager_win' });
    await checkAchievements({ type: 'personal_best' });
    await checkAchievements({ type: 'level_reached', level: 50 });

    await checkAchievements({
      type: 'lesson_complete',
      lessonCount: 32,
      wasPerfect: true,
      perfectCount: 32,
    });

    await checkAchievements({ type: 'quiz', level: 'easy', perfect: true });
    await checkAchievements({ type: 'quiz', level: 'medium', perfect: true });
    for (let i = 0; i < 5; i += 1) {
      await checkAchievements({ type: 'quiz', level: 'hard', perfect: true });
    }

    await checkAchievements({ type: 'combo', count: 100 });
    await checkAchievements({ type: 'daily_task', allDone: true });
    await checkAchievements({ type: 'daily_phrase', action: 'read' });
    await checkAchievements({ type: 'daily_phrase', action: 'save' });
    await checkAchievements({ type: 'friend_added', totalFriends: 10 });
    for (let i = 0; i < 5; i += 1) {
      await checkAchievements({ type: 'gift_sent' });
    }
    await checkAchievements({ type: 'achievement_liked' });
    await checkAchievements({ type: 'achievement_shared' });

    await checkAchievements({ type: 'login', consecutiveDays: 365 });
    await checkAchievements({ type: 'comeback' });
    await checkAchievements({ type: 'diagnosis' });

    jest.useFakeTimers().setSystemTime(new Date('2026-05-12T23:30:00'));
    await checkAchievements({ type: 'time_of_day' });
    jest.setSystemTime(new Date('2026-05-12T05:30:00'));
    await checkAchievements({ type: 'time_of_day' });
    jest.useRealTimers();

    await checkAchievements({ type: 'exam', pct: 95 });
    await checkAchievements({ type: 'flashcards_session' });
    await checkAchievements({ type: 'active_recall', correct: 50 });

    for (let i = 0; i < 10; i += 1) {
      await checkAchievements({ type: 'arena_win' });
    }
    await checkAchievements({ type: 'arena_win_streak', streak: 10 });
    await checkAchievements({ type: 'arena_duel_friend_win' });
    for (let i = 0; i < 5; i += 1) {
      await checkAchievements({ type: 'arena_wager_win' });
    }
    await checkAchievements({ type: 'wager_win_streak', count: 3 });
    await checkAchievements({ type: 'streak_freeze_used' });
    await checkAchievements({ type: 'shards', balance: 100 });
    await checkAchievements({ type: 'trainer_correct', correct: 100 });
    await checkAchievements({ type: 'avatar_custom_set' });
    await checkAchievements({ type: 'profile_theme_set' });
    await checkAchievements({ type: 'pack_purchased', totalPacks: 5 });
    await checkAchievements({ type: 'quiz_session_count', count: 10 });

    for (const level of ['A1', 'A2', 'B1', 'B2']) {
      await checkAchievements({ type: 'gem', level, gem: 'ruby' });
      await checkAchievements({ type: 'gem', level, gem: 'emerald' });
      await checkAchievements({ type: 'gem', level, gem: 'diamond' });
    }

    const unlocked = await unlockedIds();
    const missing = idsOf(ALL_ACHIEVEMENTS).filter(id => !unlocked.has(id));
    expect(missing).toEqual([]);
  });

  it('dev smoke seed opens all achievements and fills progress counters', async () => {
    const report = await devSeedAchievementsSmoke();
    const total = ALL_ACHIEVEMENTS.length;

    expect(report).toEqual({
      total,
      unlocked: total,
      missing: [],
    });
    expect(await AsyncStorage.getItem('streak_count')).toBe('500');
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('100000');
    expect(await AsyncStorage.getItem('achievement_active_recall_correct_count')).toBe('50');
    expect(await AsyncStorage.getItem('achievement_arena_win_count')).toBe('10');
    expect(await AsyncStorage.getItem('shards_balance')).toBe('100');

    const loginRaw = await AsyncStorage.getItem('login_bonus_v1');
    expect(JSON.parse(loginRaw ?? '{}').consecutiveDays).toBe(365);

    const lessonProgress = await AsyncStorage.getItem('lesson32_progress');
    expect(JSON.parse(lessonProgress ?? '[]').filter((x: string) => x === 'correct')).toHaveLength(50);
  });
});
