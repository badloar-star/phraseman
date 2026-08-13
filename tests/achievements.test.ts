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
  loadAchievementStates,
  loadAchievementStatesForTarget,
  markAchievementsNotified,
} from '../app/achievements';
import { addShardsRaw } from '../app/shards_system';
import { ACHIEVEMENT_ES } from '../app/achievements_es_locale';
import { MAX_LEVEL } from '../constants/theme';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';
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
    __resetAccountGenerationForTests();
    beginAccountGeneration('achievements-test-account');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not let an omitted-token achievement event commit after account A switches to B', async () => {
    let release!: (value: string | null) => void;
    const statesRead = new Promise<string | null>((resolve) => { release = resolve; });
    (AsyncStorage.getItem as jest.Mock).mockReturnValueOnce(statesRead);
    beginAccountGeneration('account-a');

    const request = checkAchievements({ type: 'energy_refill' });
    for (let i = 0; i < 12 && (AsyncStorage.getItem as jest.Mock).mock.calls.length === 0; i += 1) {
      await Promise.resolve();
    }
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    beginAccountGeneration('account-b');
    release(null);

    await expect(request).resolves.toEqual([]);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('rejects exported achievement storage boundaries before identity initialization', async () => {
    __resetAccountGenerationForTests();

    await expect(loadAchievementStatesForTarget('en')).resolves.toEqual([]);
    await expect(loadAchievementStates()).resolves.toEqual([]);
    await expect(claimAchievementShardReward(ALL_ACHIEVEMENTS[0].id)).resolves.toBe(false);
    await expect(markAchievementsNotified([ALL_ACHIEVEMENTS[0].id])).resolves.toBeUndefined();

    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(addShardsRaw).not.toHaveBeenCalled();
  });

  it('discards an omitted-token exported read when account A switches to B', async () => {
    let release!: (value: string | null) => void;
    const readA = new Promise<string | null>((resolve) => { release = resolve; });
    (AsyncStorage.getItem as jest.Mock).mockReturnValueOnce(readA);
    beginAccountGeneration('account-a');

    const request = loadAchievementStatesForTarget('en');
    for (let i = 0; i < 12 && (AsyncStorage.getItem as jest.Mock).mock.calls.length === 0; i += 1) {
      await Promise.resolve();
    }
    beginAccountGeneration('account-b');
    release(null);

    await expect(request).resolves.toEqual([]);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('does not reserve or pay an achievement claim after account A switches to B', async () => {
    let release!: (value: string | null) => void;
    const statesRead = new Promise<string | null>((resolve) => { release = resolve; });
    const id = ALL_ACHIEVEMENTS[0].id;
    (AsyncStorage.getItem as jest.Mock).mockReturnValueOnce(statesRead);
    beginAccountGeneration('account-a');

    const claim = claimAchievementShardReward(id);
    for (let i = 0; i < 12 && (AsyncStorage.getItem as jest.Mock).mock.calls.length === 0; i += 1) {
      await Promise.resolve();
    }
    beginAccountGeneration('account-b');
    release(JSON.stringify([{ id, unlockedAt: '2026-05-18T12:00:00.000Z', notified: true, shardClaimed: false }]));

    await expect(claim).resolves.toBe(false);
    expect(addShardsRaw).not.toHaveBeenCalled();
  });

  it('does not mark account A notifications after a deferred read resolves under account B', async () => {
    let release!: (value: string | null) => void;
    const statesRead = new Promise<string | null>((resolve) => { release = resolve; });
    const id = ALL_ACHIEVEMENTS[0].id;
    (AsyncStorage.getItem as jest.Mock).mockReturnValueOnce(statesRead);
    beginAccountGeneration('account-a');

    const marking = markAchievementsNotified([id]);
    for (let i = 0; i < 12 && (AsyncStorage.getItem as jest.Mock).mock.calls.length === 0; i += 1) {
      await Promise.resolve();
    }
    beginAccountGeneration('account-b');
    release(JSON.stringify([{ id, unlockedAt: '2026-05-18T12:00:00.000Z', notified: false, shardClaimed: true }]));

    await marking;
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('has unique ids, Spanish copy and image entries for every achievement', () => {
    const ids = idsOf(ALL_ACHIEVEMENTS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(81);

    const activeIds = ALL_ACHIEVEMENTS.filter(achievement => !achievement.retired).map(achievement => achievement.id);
    const missingEs = activeIds.filter(id => !ACHIEVEMENT_ES[id]);
    expect(missingEs).toEqual([]);

    // зачем: арт больше не бандлится целиком — «ядро» лежит в require-реестре,
    // остальное стримится из Storage по сгенерированной карте URL. Требование
    // прежнее: у КАЖДОГО достижения должен быть источник картинки, иначе
    // пользователь увидит заглушку вместо награды.
    const imageBlock = fs.readFileSync(
      path.join(__dirname, '..', 'constants', 'achievementImageAssets.ts'), 'utf8');
    const urlMap = fs.readFileSync(
      path.join(__dirname, '..', 'constants', 'achievementImageUrlMap.generated.ts'), 'utf8');

    const bundledIds = new Set([...imageBlock.matchAll(/^\s*([a-z0-9_]+):\s*require/gm)].map(m => m[1]));
    const remoteIds = new Set([...urlMap.matchAll(/^\s{2}"([a-z0-9_]+)":\s*"https:/gm)].map(m => m[1]));

    const missingImages = activeIds.filter(id => !bundledIds.has(id) && !remoteIds.has(id));
    expect(missingImages).toEqual([]);
  });

  it('shares the generated image registry with compact achievement surfaces', () => {
    const statsSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'streak_stats.tsx'), 'utf8');
    const toastSource = fs.readFileSync(path.join(__dirname, '..', 'components', 'AchievementToast.tsx'), 'utf8');

    // зачем: цель контракта прежняя — компактные поверхности берут арт из общего
    // источника, а не заводят свою копию реестра. Изменился только вход: теперь
    // это achievementImageSource (бандл + URL) либо общий компонент AchievementArt.
    expect(statsSource).toContain("import AchievementArt from '../components/AchievementArt'");
    expect(toastSource).toContain("import { achievementImageSource } from '../constants/achievementImageAssets'");

    // Ни одна поверхность не должна require-ить арт напрямую в обход реестра.
    expect(statsSource).not.toMatch(/require\('\.\.\/assets\/images\/achievements\//);
    expect(toastSource).not.toMatch(/require\('\.\.\/assets\/images\/achievements\//);
  });

  it('renders generated achievement art immediately and keeps fallback only for image errors', () => {
    const screenPath = path.join(__dirname, '..', 'app', 'achievements_screen.tsx');
    const source = fs.readFileSync(screenPath, 'utf8');
    const achievementImageComponent = source.match(/function AchievementImageWithFallback\([\s\S]*?\r?\n}\r?\n\r?\nfunction CategoryIconImageWithFallback/)?.[0] ?? '';
    const categoryImageComponent = source.match(/function CategoryIconImageWithFallback\([\s\S]*?\r?\n}\r?\n\r?\nfunction BadgeShieldInner/)?.[0] ?? '';

    expect(source).toContain("import { Image as ExpoImage } from 'expo-image';");
    expect(achievementImageComponent).toContain('source && !imageFailed');
    expect(achievementImageComponent).toContain('onError={() => setImageFailed(true)}');

    // зачем: раньше здесь стоял запрет на onLoad — он имел смысл, пока весь арт
    // лежал в бандле и появлялся в первом же кадре. Теперь арт достижения может
    // приходить из сети, и заглушку нужно держать ИМЕННО до onLoad, иначе между
    // «источник появился» и «картинка отрисовалась» мелькнёт пустое место.
    expect(achievementImageComponent).toContain('onLoad={() => setImageLoaded(true)}');
    expect(achievementImageComponent).toContain('!imageLoaded');

    // Иконки категорий остаются бандлёнными — там ожидание onLoad не нужно.
    expect(categoryImageComponent).toContain('source && !imageFailed');
    expect(categoryImageComponent).not.toContain('onLoad={() => setLoaded(true)}');
    expect(categoryImageComponent).toContain('onError={() => setImageFailed(true)}');
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

  it('keeps the stats achievements counter on live unlocked count and hides the zero state', () => {
    // зачем: редизайн карточки («Все N») снял существительное после числа —
    // плюрализация ruAchievementRewardPhrase жила только в мёртвом {false && ...}
    // блоке и удалена вместе с ним. Контракт охраняет живое: счётчик — из
    // loadAchievementStates (unlocked, не общий тотал) и запрет «Все 0».
    const file = path.join(__dirname, '..', 'app', 'streak_stats.tsx');
    const source = fs.readFileSync(file, 'utf8');

    expect(source).toContain('Все ${achievementCount}');
    expect(source).toContain('Усі ${achievementCount}');
    expect(source).toContain('achievementCount > 0');
    expect(source).toContain('loadAchievementStates()');
    expect(source).not.toContain('ALL_ACHIEVEMENTS.length');
  });

  // зачем: владелец вернул награду за достижения — экран всё время обещал
  // «+1 жемчужина», а выплата была обнулена и кнопка «Получить» работала
  // впустую. Тест закрепляет, что обещание на экране совпадает с начислением.
  it('grants exactly +1 pearl per achievement and marks it claimed', async () => {
    const id = ALL_ACHIEVEMENTS[0].id;
    await AsyncStorage.setItem('achievements_v1', JSON.stringify([
      { id, unlockedAt: '2026-05-18T12:00:00.000Z', notified: true, shardClaimed: false },
    ]));

    await expect(claimAchievementShardReward(id)).resolves.toBe(true);

    expect(addShardsRaw).toHaveBeenCalledTimes(1);
    expect(addShardsRaw).toHaveBeenCalledWith(1, `achievement:${id}`, expect.objectContaining({
      showEarnModal: false,
      skipServerAwait: true,
      accountToken: expect.objectContaining({ stableId: 'achievements-test-account', phase: 'active' }),
    }));
    const stored = JSON.parse((await AsyncStorage.getItem('achievements_v1')) ?? '[]');
    expect(stored.find((s: { id: string }) => s.id === id)?.shardClaimed).toBe(true);
  });

  it('does not double-pay when the same achievement is claimed twice', async () => {
    const id = ALL_ACHIEVEMENTS[0].id;
    await AsyncStorage.setItem('achievements_v1', JSON.stringify([
      { id, unlockedAt: '2026-05-18T12:00:00.000Z', notified: true, shardClaimed: false },
    ]));

    await expect(claimAchievementShardReward(id)).resolves.toBe(true);
    await expect(claimAchievementShardReward(id)).resolves.toBe(false);
    expect(addShardsRaw).toHaveBeenCalledTimes(1);
  });

  it('keeps a durable pending payout and retries the same id after a switch before payout confirmation', async () => {
    const id = ALL_ACHIEVEMENTS[0].id;
    await AsyncStorage.setItem('achievements_v1', JSON.stringify([
      { id, unlockedAt: '2026-05-18T12:00:00.000Z', notified: true, shardClaimed: false },
    ]));
    let releasePayout!: (value: number) => void;
    (addShardsRaw as jest.Mock).mockReturnValueOnce(new Promise<number>((resolve) => { releasePayout = resolve; }));
    beginAccountGeneration('account-a');

    const first = claimAchievementShardReward(id);
    for (let i = 0; i < 30 && (addShardsRaw as jest.Mock).mock.calls.length === 0; i += 1) await Promise.resolve();
    expect(addShardsRaw).toHaveBeenCalledTimes(1);
    const firstOptions = (addShardsRaw as jest.Mock).mock.calls[0][2];
    expect(firstOptions.idempotencyKey).toMatch(/^achievement:/);
    const pendingKey = (await AsyncStorage.getAllKeys())
      .find((key) => key.startsWith('achievement_shard_payout_pending_v1:'));
    expect(pendingKey).toBeTruthy();

    beginAccountGeneration('account-b');
    releasePayout(1);
    await expect(first).resolves.toBe(false);
    const afterSwitch = JSON.parse((await AsyncStorage.getItem('achievements_v1')) ?? '[]');
    expect(afterSwitch.find((state: { id: string }) => state.id === id)?.shardClaimed).toBe(false);

    beginAccountGeneration('account-a');
    (addShardsRaw as jest.Mock).mockResolvedValueOnce(1);
    await expect(claimAchievementShardReward(id)).resolves.toBe(true);
    const retryOptions = (addShardsRaw as jest.Mock).mock.calls[1][2];
    expect(retryOptions.idempotencyKey).toBe(firstOptions.idempotencyKey);
    const afterRetry = JSON.parse((await AsyncStorage.getItem('achievements_v1')) ?? '[]');
    expect(afterRetry.find((state: { id: string }) => state.id === id)?.shardClaimed).toBe(true);
  });

  it('updates the achievement reward modal before the claim promise finishes', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'achievements_screen.tsx'), 'utf8');
    const modalStart = source.indexOf('function AchievementModal');
    const modalEnd = source.indexOf('function AchievementsScreen');
    const modalSource = source.slice(modalStart, modalEnd);
    const optimisticIndex = modalSource.indexOf('onShardClaimed(achievement.id);');
    const claimIndex = modalSource.indexOf('void claimAchievementShardReward(achievement.id)');
    expect(optimisticIndex).toBeGreaterThan(0);
    expect(claimIndex).toBeGreaterThan(optimisticIndex);
    expect(modalSource).not.toContain('await claimAchievementShardReward');
    expect(modalSource).not.toContain('disabled={claiming}');
  });

  it('renders achievements screen as earned-only by default with a dev-only all rewards toggle', () => {
    const screenPath = path.join(__dirname, '..', 'app', 'achievements_screen.tsx');
    const source = fs.readFileSync(screenPath, 'utf8');

    expect(source).toContain('const showAllAchievements = ENABLE_DEV_TOOLS && devShowAllAchievements;');
    expect(source).toContain('ALL_ACHIEVEMENTS.filter(isVisibleAchievement)');
    expect(source).toContain('return !a.retired;');
    expect(source).toContain('testID="achievements-dev-show-all-toggle"');
    expect(source).toContain('if (catAchs.length === 0) return [];');
    expect(source).not.toContain('unlockedCount} / {total}');
  });

  // зачем: секция «Ближайшие награды» удалена с экрана по запросу владельца —
  // тест обновлён, чтобы подтвердить отсутствие удалённого кода вместо его наличия.
  it('does not render the removed "nearest rewards" section on the achievements screen', () => {
    const screenPath = path.join(__dirname, '..', 'app', 'achievements_screen.tsx');
    const source = fs.readFileSync(screenPath, 'utf8');

    expect(source).not.toContain("import { getNearestLockedAchievements } from './achievement_nearest';");
    expect(source).not.toContain('const nearestAchievements = useMemo(() =>');
    expect(source).not.toContain('<NearestAchievementsBlock');
    expect(source).not.toContain('ListHeaderComponent={nearestAchievements.length > 0 ?');
  });

  it('wires card pack achievements into both official and community purchase flows', () => {
    const officialPurchasePath = path.join(__dirname, '..', 'app', 'flashcards', 'cardPackShardPurchase.ts');
    const communityPurchasePath = path.join(__dirname, '..', 'app', 'community_packs', 'purchaseCommunityPack.ts');
    const trackingPath = path.join(__dirname, '..', 'app', 'flashcards', 'packAchievementTracking.ts');
    const officialSource = fs.readFileSync(officialPurchasePath, 'utf8');
    const communitySource = fs.readFileSync(communityPurchasePath, 'utf8');
    const trackingSource = fs.readFileSync(trackingPath, 'utf8');

    expect(officialSource).toContain('trackCardPackAcquiredAchievement(studyTarget)');
    expect(communitySource).toContain('trackCardPackAcquiredAchievement(studyTarget)');
    expect(communitySource).toContain('trackExternalShardSpendAchievement(COMMUNITY_PACK_PRICE_SHARDS)');
    expect(trackingSource).toContain("import { storageStudyTarget, type RuntimeStudyTarget } from '../target_storage_keys'");
    expect(trackingSource).toContain('const target = storageStudyTarget(studyTarget)');
    expect(trackingSource).not.toContain("studyTarget === 'fr'");
  });

  it('keeps flashcard source achievement aligned with live save sources', () => {
    // зачем: экран квизов снят целиком (3eba05191, вместе с Ареной) — живые
    // source="..." сохранения остались только в уроках и карточке дня.
    const files = [
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

    expect(fs.readFileSync(acceptPath, 'utf8')).toContain("type: 'friend_added'");
    expect(fs.readFileSync(tabPath, 'utf8')).toContain("type: 'friend_added'");
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

    await checkAchievements({ type: 'combo', count: 500 });
    for (let i = 0; i < 100; i += 1) {
      await checkAchievements({ type: 'daily_phrase', action: 'read' });
      await checkAchievements({ type: 'daily_phrase', action: 'save' });
    }
    await checkAchievements({ type: 'friend_added', totalFriends: 50 });
    for (let i = 0; i < 100; i += 1) {
      await checkAchievements({ type: 'gift_sent' });
    }
    await checkAchievements({ type: 'achievement_liked', likeTotal: 100 });
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

    for (const level of ['A1', 'A2', 'B1', 'B2']) {
      await checkAchievements({ type: 'gem', level, gem: 'ruby' });
      await checkAchievements({ type: 'gem', level, gem: 'emerald' });
      await checkAchievements({ type: 'gem', level, gem: 'diamond' });
    }

    const unlocked = await unlockedIds();
    const missing = idsOf(ALL_ACHIEVEMENTS.filter(achievement => !achievement.retired)).filter(id => !unlocked.has(id));
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

  it('lets account B and the transition lock proceed when account A achievement storage never resolves', async () => {
    const never = new Promise<string | null>(() => {});
    (AsyncStorage.getItem as jest.Mock).mockReturnValueOnce(never);
    beginAccountGeneration('account-a');
    void checkAchievements({ type: 'energy_refill' });
    for (let i = 0; i < 12 && (AsyncStorage.getItem as jest.Mock).mock.calls.length === 0; i += 1) {
      await Promise.resolve();
    }

    beginAccountGeneration('account-b');
    const bResult = checkAchievements({ type: 'energy_refill' });
    const transition = withAccountTransitionLock(async () => 'transition-settled');
    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 100));

    await expect(Promise.race([bResult.then(() => 'b-settled' as const), timeout])).resolves.toBe('b-settled');
    await expect(Promise.race([transition, timeout])).resolves.toBe('transition-settled');
  });
});

describe('запись состояния достижений не затирает параллельные правки', () => {
  // зачем: _achievementLock (локальная цепочка промисов модуля) и withStorageLock
  // (глобальный мьютекс) — два НЕЗАВИСИМЫХ замка над одним хранилищем. Путь
  // checkAchievements писал вообще без второго, поэтому параллельный
  // claimAchievementShardReward терял свой shardClaimed, а уже показанный тост всплывал
  // повторно. Лечится слиянием: под замком перечитать свежий снимок и накатить только
  // свои разблокировки. Храповик держит эту форму записи.
  const source = fs.readFileSync(path.join(process.cwd(), 'app', 'achievements.ts'), 'utf8');

  it('пишет разблокировки через слияние со свежим снимком под общим мьютексом', () => {
    expect(source).toContain('return withStorageLock(async () => {');
    expect(source).toContain('const fresh = await loadAchievementStatesForTargetInternal(eventStudyTarget, operationToken, false);');
    expect(source).toContain('const saved = await saveStates(Array.from(freshById.values()), eventStudyTarget, operationToken);');
  });

  it('не пишет весь массив states напрямую в обход слияния', () => {
    // Прямой saveStates(states, eventStudyTarget) — ровно тот путь, который затирал
    // чужие поля. Слияние обязано идти через freshById.
    expect(source).not.toContain('await saveStates(states, eventStudyTarget);');
  });

  it('сохраняет более раннюю метку разблокировки при гонке', () => {
    expect(source).toContain('if (current.unlockedAt === null) current.unlockedAt = row.unlockedAt;');
  });
});
