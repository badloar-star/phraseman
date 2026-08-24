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

jest.mock('../app/shards_system', () => ({
  addShardsRaw: jest.fn(async (amount: number) => amount),
  commitShardCreditOperation: jest.fn(async () => ({ status: 'applied', balanceAfter: 0 })),
  getShardsBalance: jest.fn(async () => 0),
}));

import {
  ALL_ACHIEVEMENTS,
  achievementDescForLang,
  achievementNameForLang,
  checkAchievements,
  claimAchievementShardReward,
  loadAchievementStates,
  loadAchievementStatesForTarget,
  markAchievementsNotified,
} from '../app/achievements';
import { commitShardCreditOperation } from '../app/shards_system';
import { MAX_LEVEL } from '../constants/theme';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';

const idsOf = (items: { id: string }[]) => items.map(x => x.id);

async function unlockedIds(): Promise<Set<string>> {
  const states = await loadAchievementStates();
  return new Set(states.filter(s => s.unlockedAt !== null).map(s => s.id));
}

describe('achievements', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
    (commitShardCreditOperation as jest.Mock).mockImplementation(async (input: {
      localWrites?: readonly (readonly [string, string])[];
    }) => {
      if (input.localWrites?.length) {
        await AsyncStorage.multiSet(input.localWrites.map(([key, value]) => [key, value]));
      }
      return { status: 'applied', balanceAfter: 1 };
    });
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

    const request = checkAchievements({ type: 'comeback' });
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
    expect(commitShardCreditOperation).not.toHaveBeenCalled();
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

  it('keeps the retired achievement pearl claim API fail-closed', async () => {
    const id = ALL_ACHIEVEMENTS[0].id;

    await expect(claimAchievementShardReward(id)).resolves.toBe(false);
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(commitShardCreditOperation).not.toHaveBeenCalled();
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

  it('has the approved unique catalog and safe locale fallback for every active achievement', () => {
    const ids = idsOf(ALL_ACHIEVEMENTS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(79);

    const activeIds = ALL_ACHIEVEMENTS.filter(achievement => !achievement.retired).map(achievement => achievement.id);
    for (const achievement of ALL_ACHIEVEMENTS.filter(row => !row.retired)) {
      expect(achievementNameForLang(achievement, 'es')).toBeTruthy();
      expect(achievementDescForLang(achievement, 'es')).toBeTruthy();
    }
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

  it('does not grant a pearl for a historical unclaimed achievement', async () => {
    const id = ALL_ACHIEVEMENTS[0].id;
    await AsyncStorage.setItem('achievements_v1', JSON.stringify([
      { id, unlockedAt: '2026-05-18T12:00:00.000Z', notified: true, shardClaimed: false },
    ]));

    await expect(claimAchievementShardReward(id)).resolves.toBe(false);
    expect(commitShardCreditOperation).not.toHaveBeenCalled();
    const stored = JSON.parse((await AsyncStorage.getItem('achievements_v1')) ?? '[]');
    expect(stored.find((s: { id: string }) => s.id === id)?.shardClaimed).toBe(false);
  });

  it('does not render an achievement pearl claim action', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'achievements_screen.tsx'), 'utf8');
    const modalStart = source.indexOf('function AchievementModal');
    const modalEnd = source.indexOf('function AchievementsScreen');
    const modalSource = source.slice(modalStart, modalEnd);
    expect(modalSource).not.toContain('claimAchievementShardReward');
    expect(modalSource).not.toContain('onShardClaimed');
    expect(modalSource).not.toContain('+1 жемчужина');
  });

  it('shows no achievement before unlock and keeps a dev-only catalog reveal', () => {
    const screenPath = path.join(__dirname, '..', 'app', 'achievements_screen.tsx');
    const source = fs.readFileSync(screenPath, 'utf8');

    expect(source).toContain('const showAllAchievements = ENABLE_DEV_TOOLS && devShowAllAchievements;');
    expect(source).toContain('ALL_ACHIEVEMENTS.filter(isVisibleAchievement)');
    expect(source).toContain('return !a.retired;');
    expect(source).toContain('const earnedAchievements = useMemo(');
    expect(source).toContain('showAllAchievements || !!stateMap.get(achievement.id)?.unlockedAt');
    expect(source).toContain("shelfCategory === 'all'\n      ? earnedAchievements");
    expect(source).toContain('const visibleCountLabel = achievementCountPairLabel(unlockedCount, totalCount, lang);');
    expect(source).not.toContain('const collectionAchievements = useMemo(');
    expect(source).not.toContain('!achievement.secret || showAllAchievements');
    expect(source).toContain('const fallbackStates = await loadAchievementStates().catch(() => []);');
    expect(source).toContain('shelfCategoryOptions.length > 2 && (');
    expect(source).toContain('testID="achievements-back"');
    expect(source).toContain('accessibilityState={{ selected: showAllAchievements }}');
    expect(source).toContain('achievementConditionForLang');
    expect(source).toContain('testID="achievement-gallery-condition"');
    expect(source).toContain('testID="achievement-dossier-condition"');
    expect(source).toContain('testID="achievements-dev-show-all-toggle"');
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

  it('unlocks the retained streak, XP and balance foundations', async () => {
    await checkAchievements({ type: 'streak', streak: 1000 });
    await checkAchievements({ type: 'xp', totalXP: 2000000 });
    await checkAchievements({ type: 'shards', balance: 1000 });

    const unlocked = await unlockedIds();
    for (const id of ['streak_1000', 'xp_2000000', 'shards_1000']) {
      expect(unlocked.has(id)).toBe(true);
    }
  });

  it('does not create orphan state for deleted achievement events', async () => {
    await checkAchievements({ type: 'diagnosis' });
    await checkAchievements({
      type: 'mistake_practice_progress',
      corrected: 50,
      voiceCorrected: 1,
      independentDays: 7,
      perfectSession: true,
    });
    await checkAchievements({
      type: 'lesson_complete',
      lessonCount: 32,
      wasPerfect: true,
      perfectCount: 32,
    });

    const raw = await AsyncStorage.getItem('achievements_v1');
    for (const id of ['diagnosis', 'mistake_corrected_50', 'lesson_all']) {
      expect(raw ?? '').not.toContain(`"id":"${id}"`);
    }
  });

  it('lets account B and the transition lock proceed when account A achievement storage never resolves', async () => {
    const never = new Promise<string | null>(() => {});
    (AsyncStorage.getItem as jest.Mock).mockReturnValueOnce(never);
    beginAccountGeneration('account-a');
    void checkAchievements({ type: 'comeback' });
    for (let i = 0; i < 12 && (AsyncStorage.getItem as jest.Mock).mock.calls.length === 0; i += 1) {
      await Promise.resolve();
    }

    beginAccountGeneration('account-b');
    const bResult = checkAchievements({ type: 'comeback' });
    const transition = withAccountTransitionLock(async () => 'transition-settled');
    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 100));

    await expect(Promise.race([bResult.then(() => 'b-settled' as const), timeout])).resolves.toBe('b-settled');
    await expect(Promise.race([transition, timeout])).resolves.toBe('transition-settled');
  });
});

describe('запись состояния достижений не затирает параллельные правки', () => {
  // зачем: _achievementLock (локальная цепочка промисов модуля) и withStorageLock
  // (глобальный мьютекс) — два НЕЗАВИСИМЫХ замка над одним хранилищем. Путь
  // checkAchievements писал вообще без второго, поэтому параллельная запись notification
  // state терялась, а уже показанный тост всплывал повторно. Лечится слиянием:
  // под замком перечитать свежий снимок и накатить только
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
