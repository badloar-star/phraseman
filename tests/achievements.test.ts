/* eslint-disable import/first */
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
  claimAchievementShardReward,
  devSeedAchievementsSmoke,
  loadAchievementStates,
} from '../app/achievements';
import { addShardsRaw } from '../app/shards_system';
import { ACHIEVEMENT_ES } from '../app/achievements_es_locale';
import { MAX_LEVEL } from '../constants/theme';
import {
  achievementLessonPerfectPassesKey,
  flashcardsSavedKey,
  lessonPassCountKey,
  lessonProgressKey,
} from '../app/target_storage_keys';

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

  it('does not define level achievements above the real level cap', () => {
    const impossibleLevelIds = ALL_ACHIEVEMENTS
      .map(a => ({ id: a.id, match: a.id.match(/^level_(\d+)$/) }))
      .filter(({ match }) => match && Number(match[1]) > MAX_LEVEL)
      .map(({ id }) => id);

    expect(impossibleLevelIds).toEqual([]);
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

  it('claims achievement shards through the local-first path without a blocking global shard modal', async () => {
    const id = ALL_ACHIEVEMENTS[0].id;
    await AsyncStorage.setItem('achievements_v1', JSON.stringify([
      { id, unlockedAt: '2026-05-18T12:00:00.000Z', notified: true, shardClaimed: false },
    ]));

    await expect(claimAchievementShardReward(id)).resolves.toBe(true);

    expect(addShardsRaw).toHaveBeenCalledWith(1, `achievement:${id}`, {
      showEarnModal: false,
      skipServerAwait: true,
    });
  });

  it('renders achievements screen as earned-only by default with a dev-only all rewards toggle', () => {
    const screenPath = path.join(__dirname, '..', 'app', 'achievements_screen.tsx');
    const source = fs.readFileSync(screenPath, 'utf8');

    expect(source).toContain('const showAllAchievements = ENABLE_DEV_TOOLS && devShowAllAchievements;');
    expect(source).toContain('showAllAchievements || !!stateMap.get(a.id)?.unlockedAt');
    expect(source).toContain('testID="achievements-dev-show-all-toggle"');
    expect(source).toContain('if (catAchs.length === 0) return [];');
    expect(source).not.toContain('unlockedCount} / {total}');
  });

  it('wires card pack achievements into both official and community purchase flows', () => {
    const officialPurchasePath = path.join(__dirname, '..', 'app', 'flashcards', 'cardPackShardPurchase.ts');
    const communityPurchasePath = path.join(__dirname, '..', 'app', 'community_packs', 'purchaseCommunityPack.ts');
    const officialSource = fs.readFileSync(officialPurchasePath, 'utf8');
    const communitySource = fs.readFileSync(communityPurchasePath, 'utf8');

    expect(officialSource).toContain('trackCardPackAcquiredAchievement(studyTarget)');
    expect(communitySource).toContain('trackCardPackAcquiredAchievement(studyTarget)');
    expect(communitySource).toContain('trackExternalShardSpendAchievement(pack.priceShards)');
  });

  it('keeps flashcard source achievement aligned with live save sources', () => {
    const files = [
      path.join(__dirname, '..', 'app', '(tabs)', 'quizzes.tsx'),
      path.join(__dirname, '..', 'app', 'quizzes.tsx'),
      path.join(__dirname, '..', 'app', 'lesson1.tsx'),
      path.join(__dirname, '..', 'app', 'lesson_words.tsx'),
      path.join(__dirname, '..', 'app', 'lesson_irregular_verbs.tsx'),
      path.join(__dirname, '..', 'components', 'DailyPhraseCard.tsx'),
    ];
    const sources = new Set<string>();
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/source="(lesson|word|verb|dialog|daily_phrase)"/g)) {
        sources.add(match[1]);
      }
    }

    expect(sources).toEqual(new Set(['lesson', 'word', 'verb', 'daily_phrase']));
    expect(ALL_ACHIEVEMENTS.some(a => a.id === `flashcards_sources_${sources.size}`)).toBe(true);
  });

  it('wires friend count achievements for both accepted and observed friendships', () => {
    const acceptPath = path.join(__dirname, '..', 'app', 'firestore_friend_requests.ts');
    const tabPath = path.join(__dirname, '..', 'app', '(tabs)', 'friends.tsx');
    const rootPath = path.join(__dirname, '..', 'app', 'friends_screen.tsx');

    expect(fs.readFileSync(acceptPath, 'utf8')).toContain("type: 'friend_added'");
    expect(fs.readFileSync(tabPath, 'utf8')).toContain("type: 'friend_added'");
    expect(fs.readFileSync(rootPath, 'utf8')).toContain("type: 'friend_added'");
  });

  it('can unlock every achievement through its public event contract', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 4, 1, 12, 0, 0));
    for (let i = 0; i < 31; i += 1) {
      jest.setSystemTime(new Date(2026, 4, 1 + i, 12, 0, 0));
      await checkAchievements({ type: 'streak', streak: 1000 });
    }
    jest.useRealTimers();
    await checkAchievements({ type: 'streak_repair' });
    await checkAchievements({ type: 'perfect_week' });

    await AsyncStorage.setItem('week_points', '10000');
    await checkAchievements({ type: 'xp', totalXP: 2000000 });
    await checkAchievements({ type: 'wager_win' });
    await checkAchievements({ type: 'personal_best' });
    await checkAchievements({ type: 'level_reached', level: 100 });

    await checkAchievements({
      type: 'lesson_complete',
      lessonCount: 32,
      wasPerfect: true,
      perfectCount: 32,
    });
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 1, 12, 0, 0));
    for (let lessonId = 1; lessonId <= 10; lessonId += 1) {
      await checkAchievements({ type: 'lesson_complete', lessonCount: 32, wasPerfect: true, perfectCount: 32, lessonId });
    }
    jest.useRealTimers();
    await AsyncStorage.multiSet([
      ...Array.from({ length: 32 }, (_, i) => [`lesson${i + 1}_pass_count`, '10'] as [string, string]),
      ...Array.from({ length: 32 }, (_, i) => [`achievement_lesson_${i + 1}_perfect_passes_v1`, JSON.stringify([1, 2])] as [string, string]),
      ...Array.from({ length: 4 }, (_, i) => [`lesson${29 + i}_progress`, JSON.stringify(Array.from({ length: 45 }, () => 'correct'))] as [string, string]),
    ]);
    await checkAchievements({ type: 'backfill' });

    await checkAchievements({ type: 'quiz', level: 'easy', perfect: true });
    await checkAchievements({ type: 'quiz', level: 'medium', perfect: true });
    for (let i = 0; i < 25; i += 1) {
      await checkAchievements({ type: 'quiz', level: 'hard', perfect: true });
    }
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 1, 12, 0, 0));
    for (let i = 0; i < 7; i += 1) {
      jest.setSystemTime(new Date(2026, 6, 1 + i, 12, 0, 0));
      await checkAchievements({ type: 'quiz', level: 'easy', perfect: true });
    }
    jest.useRealTimers();

    await checkAchievements({ type: 'combo', count: 500 });
    jest.useFakeTimers().setSystemTime(new Date('2026-05-01T12:00:00'));
    for (let i = 0; i < 30; i += 1) {
      jest.setSystemTime(new Date(2026, 4, 1 + i, 12, 0, 0));
      await checkAchievements({ type: 'daily_task', allDone: true, noReroll: true });
    }
    jest.useRealTimers();
    for (let i = 0; i < 100; i += 1) {
      await checkAchievements({ type: 'daily_phrase', action: 'read' });
      await checkAchievements({ type: 'daily_phrase', action: 'save' });
    }
    await checkAchievements({ type: 'friend_added', totalFriends: 50 });
    for (let i = 0; i < 100; i += 1) {
      await checkAchievements({ type: 'gift_sent' });
    }
    await checkAchievements({ type: 'achievement_liked', likeTotal: 100 });
    for (let i = 0; i < 100; i += 1) {
      await checkAchievements({ type: 'league_chat_message' });
    }
    for (let i = 0; i < 10; i += 1) {
      await checkAchievements({ type: 'achievement_shared' });
    }

    await checkAchievements({ type: 'login', consecutiveDays: 365 });
    await checkAchievements({ type: 'comeback' });
    await checkAchievements({ type: 'diagnosis' });

    jest.useFakeTimers().setSystemTime(new Date('2026-05-12T23:30:00'));
    for (let i = 0; i < 7; i += 1) {
      jest.setSystemTime(new Date(2026, 4, 12 + i, 23, 30, 0));
      await checkAchievements({ type: 'time_of_day' });
    }
    for (let i = 0; i < 7; i += 1) {
      jest.setSystemTime(new Date(2026, 5, 1 + i, 5, 30, 0));
      await checkAchievements({ type: 'time_of_day' });
    }
    jest.useRealTimers();

    for (let i = 0; i < 10; i += 1) {
      await checkAchievements({ type: 'exam', pct: 95 });
    }
    await checkAchievements({ type: 'flashcards_session' });
    await checkAchievements({ type: 'flashcard_saved', count: 250, source: 'lesson' });
    for (const source of ['word', 'verb', 'daily_phrase']) {
      await checkAchievements({ type: 'flashcard_saved', source });
    }
    await checkAchievements({ type: 'flashcard_flipped', count: 1000 });
    jest.useFakeTimers().setSystemTime(new Date('2026-05-01T12:00:00'));
    for (let i = 0; i < 30; i += 1) {
      jest.setSystemTime(new Date(2026, 4, 1 + i, 12, 0, 0));
      await checkAchievements({ type: 'flashcard_viewed', count: 1 });
    }
    jest.useRealTimers();
    await checkAchievements({ type: 'active_recall', correct: 50 });

    for (let i = 0; i < 100; i += 1) {
      await checkAchievements({ type: 'arena_win' });
    }
    await checkAchievements({ type: 'arena_win_streak', streak: 25 });
    await checkAchievements({ type: 'arena_duel_friend_win' });
    for (let i = 0; i < 25; i += 1) {
      await checkAchievements({ type: 'arena_wager_win', count: i + 1 });
    }
    await checkAchievements({ type: 'wager_win_streak', count: 10 });
    await checkAchievements({ type: 'streak_freeze_used' });
    await checkAchievements({ type: 'shards', balance: 1000 });
    await checkAchievements({ type: 'shards_spent', amount: 1000 });
    for (let i = 0; i < 25; i += 1) {
      await checkAchievements({ type: 'energy_refill' });
    }
    jest.useFakeTimers().setSystemTime(new Date(2026, 7, 3, 12, 0, 0));
    for (let i = 0; i < 10; i += 1) {
      jest.setSystemTime(new Date(2026, 7, 3 + i * 7, 12, 0, 0));
      await checkAchievements({ type: 'league_result', myRank: 1, totalInGroup: 10, promoted: true, newLeagueId: 8 });
    }
    jest.useRealTimers();
    for (let i = 0; i < 4; i += 1) {
      await checkAchievements({ type: 'league_boost', multiplier: 2 });
    }
    await checkAchievements({ type: 'league_boost', multiplier: 3 });
    jest.useFakeTimers().setSystemTime(new Date('2026-05-01T12:00:00'));
    for (let i = 0; i < 7; i += 1) {
      jest.setSystemTime(new Date(2026, 4, 1 + i, 12, 0, 0));
      await checkAchievements({ type: 'trainer_correct', correct: 1 });
    }
    jest.useRealTimers();
    await checkAchievements({ type: 'trainer_correct', correct: 9993 });
    for (let i = 0; i < 50; i += 1) {
      await checkAchievements({ type: 'trainer_session_result', correct: 5, wrong: 0, total: 5 });
    }
    await checkAchievements({ type: 'avatar_custom_set' });
    await checkAchievements({ type: 'profile_theme_set' });
    await checkAchievements({ type: 'pack_purchased', totalPacks: 25 });
    await checkAchievements({ type: 'quiz_session_count', count: 100 });

    for (const level of ['A1', 'A2', 'B1', 'B2']) {
      await checkAchievements({ type: 'gem', level, gem: 'ruby' });
      await checkAchievements({ type: 'gem', level, gem: 'emerald' });
      await checkAchievements({ type: 'gem', level, gem: 'diamond' });
    }

    const unlocked = await unlockedIds();
    const missing = idsOf(ALL_ACHIEVEMENTS).filter(id => !unlocked.has(id));
    expect(missing).toEqual([]);
  });

  it('unlocks recall milestones from the live trainer_correct event', async () => {
    await checkAchievements({ type: 'trainer_correct', correct: 50 });

    const unlocked = await unlockedIds();
    expect(unlocked.has('recall_first')).toBe(true);
    expect(unlocked.has('recall_50')).toBe(true);
    expect(unlocked.has('trainer_session')).toBe(false);

    await checkAchievements({ type: 'trainer_session_result', correct: 3, wrong: 2, total: 5 });
    const afterSession = await unlockedIds();
    expect(afterSession.has('trainer_session')).toBe(true);
  });

  it('backfills newly added progress achievements from existing local state', async () => {
    await AsyncStorage.multiSet([
      ['flashcards_v1', JSON.stringify([
        ...Array.from({ length: 47 }, (_, i) => ({ id: `l${i}`, en: `lesson ${i}`, source: 'lesson' })),
        { id: 'w1', en: 'word', source: 'word' },
        { id: 'v1', en: 'verb', source: 'verb' },
        { id: 'dp1', en: 'daily phrase', source: 'daily_phrase' },
      ])],
      ['flashcards_owned_packs_v1', JSON.stringify(['official_1', 'official_2', 'official_3'])],
      ['community_owned_pack_ids_v1', JSON.stringify(['community_1', 'community_2'])],
      ['shards_lifetime_spent_v1', '125'],
      ['achievement_trainer_correct_count', '100'],
    ]);

    await checkAchievements({ type: 'backfill' });

    const unlocked = await unlockedIds();
    expect(unlocked.has('flashcards_save_25')).toBe(true);
    expect(unlocked.has('flashcards_save_50')).toBe(true);
    expect(unlocked.has('flashcards_sources_4')).toBe(true);
    expect(unlocked.has('pack_purchased')).toBe(true);
    expect(unlocked.has('pack_5_purchased')).toBe(true);
    expect(unlocked.has('shards_spent_100')).toBe(true);
    expect(unlocked.has('recall_50')).toBe(true);
    expect(unlocked.has('trainer_100_correct')).toBe(true);
  });

  it('backfills common achievements from isolated French target stores', async () => {
    const frCards = Array.from({ length: 50 }, (_, i) => ({
      id: `fr-${i}`,
      en: `carte ${i}`,
      source: ['lesson', 'word', 'verb', 'daily_phrase'][i % 4],
    }));
    const perfectProgress = JSON.stringify(new Array(50).fill('correct'));
    await AsyncStorage.multiSet([
      [flashcardsSavedKey('fr'), JSON.stringify(frCards)],
      ...Array.from({ length: 32 }, (_, i): [string, string] => [
        lessonPassCountKey(i + 1, 'fr'),
        '2',
      ]),
      ...Array.from({ length: 4 }, (_, i): [string, string] => [
        lessonProgressKey(29 + i, 'fr'),
        perfectProgress,
      ]),
    ]);

    await checkAchievements({ type: 'backfill' });

    const unlocked = await unlockedIds();
    expect(unlocked.has('flashcards_save_50')).toBe(true);
    expect(unlocked.has('flashcards_sources_4')).toBe(true);
    expect(unlocked.has('lesson_all_2x')).toBe(true);
    expect(unlocked.has('lesson_b2_perfect')).toBe(true);
  });

  it('aggregates live lesson achievement events across English and French stores after backfill', async () => {
    const perfectProgress = JSON.stringify(new Array(45).fill('correct'));
    await AsyncStorage.multiSet([
      ['achievements_progress_backfill_v3', '1'],
      [lessonPassCountKey(1, 'en'), '1'],
      [lessonPassCountKey(2, 'en'), '1'],
      [lessonPassCountKey(3, 'fr'), '1'],
      [lessonProgressKey(1, 'en'), perfectProgress],
      [lessonProgressKey(2, 'en'), perfectProgress],
      [lessonProgressKey(3, 'fr'), perfectProgress],
    ]);

    await checkAchievements({
      type: 'lesson_complete',
      lessonCount: 1,
      wasPerfect: true,
      perfectCount: 1,
      lessonId: 3,
      studyTarget: 'fr',
    });

    const unlocked = await unlockedIds();
    expect(unlocked.has('lesson_3')).toBe(true);
    expect(unlocked.has('lesson_perfect3')).toBe(true);
  });

  it('keeps French perfect-pass achievement evidence isolated while unlocking the shared achievement', async () => {
    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      await checkAchievements({ type: 'lesson_perfect_pass', lessonId, passCount: 1, studyTarget: 'fr' });
      await checkAchievements({ type: 'lesson_perfect_pass', lessonId, passCount: 2, studyTarget: 'fr' });
    }

    const unlocked = await unlockedIds();
    expect(unlocked.has('lesson_all_perfect_2x')).toBe(true);
    await expect(AsyncStorage.getItem('achievement_lesson_1_perfect_passes_v1')).resolves.toBeNull();
    await expect(AsyncStorage.getItem(achievementLessonPerfectPassesKey(1, 'fr'))).resolves.toBe(JSON.stringify([1, 2]));
  });

  it('shows common achievement progress from English and French lesson stores', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'achievements_screen.tsx'), 'utf8');
    const achievementSource = fs.readFileSync(path.join(process.cwd(), 'app', 'achievements.ts'), 'utf8');

    expect(source).toContain("const ACHIEVEMENT_PROGRESS_TARGETS: readonly RuntimeStudyTarget[] = ['en', 'fr']");
    expect(source).toContain('ACHIEVEMENT_PROGRESS_TARGETS.map((studyTarget) => lessonProgressKey(lessonId, studyTarget))');
    expect(source).toContain('lessonPassCountKey(lessonId, studyTarget)');
    expect(source).toContain('achievementLessonPerfectPassesKey(lessonId, studyTarget)');
    expect(achievementSource).toContain('achievementLessonPerfectPassesKey(lessonId, event.studyTarget)');
    expect(achievementSource).toContain('ACHIEVEMENT_PROGRESS_TARGETS.map(studyTarget =>');
    expect(source).not.toContain('`lesson${i + 1}_progress`');
    expect(source).not.toContain('`lesson${i + 1}_pass_count`');
    expect(source).not.toContain('`achievement_lesson_${i + 1}_perfect_passes_v1`');
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
