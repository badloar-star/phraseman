// зачем (смета Firebase 13.10, п. 5; координатор): профили друзей для ряда Шпиля живут в кэше 30 мин (вкладка «Друзья» — прежние 5), пустая запись от сбоя —
// по-прежнему 5 мин, ручное обновление (force) идёт мимо кэша, а лишнего чтения при повторном входе в Шпиль нет.
import fs from 'node:fs';
import path from 'node:path';

const mockProfilesCallable = jest.fn();

jest.mock('../app/referral_flags', () => ({ isReferralCloudEnabled: () => true }));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockProfilesCallable),
}));

import {
  countFreshFriendProfiles,
  fetchFriendProfilesBatch,
  FRIENDS_BATCH_LONG_TTL_MS,
  invalidateFriendsProfilesBatchCache,
} from '../app/friends_profiles_batch';

const MIN = 60 * 1000;
const rec = (uid: string) => ({ uid, displayName: uid, level: 1, avatar: '', frame: '', aura: '', profileCardLevel: 0, streak: null, isPremium: false, isVip: false, isLifetime: false });
const ok = async ({ uids }: { uids: string[] }) => ({ data: { profiles: Object.fromEntries(uids.map((u) => [u, rec(u)])) } });

describe('кэш профилей друзей: длинный срок для Шпиля', () => {
  let now = 1_700_000_000_000;
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateFriendsProfilesBatchCache();
    now = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    mockProfilesCallable.mockImplementation(ok);
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('через 20 минут: вкладка «Друзья» (5 мин) идёт в сеть, Шпиль (30 мин) берёт из кэша', async () => {
    await fetchFriendProfilesBatch(['a', 'b']);
    expect(mockProfilesCallable).toHaveBeenCalledTimes(1);
    now += 20 * MIN;
    await fetchFriendProfilesBatch(['a', 'b'], { maxAgeMs: FRIENDS_BATCH_LONG_TTL_MS });
    expect(mockProfilesCallable).toHaveBeenCalledTimes(1);
    expect(countFreshFriendProfiles(['a', 'b'], FRIENDS_BATCH_LONG_TTL_MS)).toBe(2);
    expect(countFreshFriendProfiles(['a', 'b'])).toBe(0);
    await fetchFriendProfilesBatch(['a', 'b']);
    expect(mockProfilesCallable).toHaveBeenCalledTimes(2);
  });

  it('старше 30 минут → сеть даже для Шпиля', async () => {
    await fetchFriendProfilesBatch(['a'], { maxAgeMs: FRIENDS_BATCH_LONG_TTL_MS });
    now += 31 * MIN;
    await fetchFriendProfilesBatch(['a'], { maxAgeMs: FRIENDS_BATCH_LONG_TTL_MS });
    expect(mockProfilesCallable).toHaveBeenCalledTimes(2);
  });

  it('сбой вызова кладёт пустую запись, и она живёт прежние 5 мин, а не 30', async () => {
    mockProfilesCallable.mockRejectedValueOnce(new Error('offline'));
    const first = await fetchFriendProfilesBatch(['a'], { maxAgeMs: FRIENDS_BATCH_LONG_TTL_MS });
    expect(first.a).toBeNull();
    now += 6 * MIN;
    const second = await fetchFriendProfilesBatch(['a'], { maxAgeMs: FRIENDS_BATCH_LONG_TTL_MS });
    expect(mockProfilesCallable).toHaveBeenCalledTimes(2);
    expect(second.a?.uid).toBe('a');
  });

  it('force идёт мимо кэша даже со свежей записью', async () => {
    await fetchFriendProfilesBatch(['a'], { maxAgeMs: FRIENDS_BATCH_LONG_TTL_MS });
    await fetchFriendProfilesBatch(['a'], { force: true, maxAgeMs: FRIENDS_BATCH_LONG_TTL_MS });
    expect(mockProfilesCallable).toHaveBeenCalledTimes(2);
  });
});

describe('Шпиль: ручное обновление друзей — контракт по строкам файлов', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
  const client = read('app/spire/spire_friends_client.ts');
  const hook = read('app/spire/use_spire_game.ts');
  const refresh = read('app/spire/use_spire_friends_refresh.ts');
  const screen = read('components/spire/SpireHomeScreen.tsx');

  it('клиент: срок 30 мин, force мимо кэша, сбой ручного обновления возвращает null (прежний ряд остаётся)', () => {
    expect(client).toMatch(/fetchFriendProfilesBatch\(uids, \{ force: options\.force === true, maxAgeMs: FRIENDS_BATCH_LONG_TTL_MS \}\)/);
    expect(client).toMatch(/if \(options\.force && resolved === 0\)/);
    expect(client).toMatch(/return options\.force \? null : \[\];/);
    expect(client).toContain('источник=');
  });

  it('хук: потягивание — один вызов за раз, ряд не стирается при сбое, ряд меняется плавно', () => {
    expect(refresh).toMatch(/if \(inFlightRef\.current\) \{/);
    expect(refresh).toMatch(/spireLoadFriendChips\(gate, \{ myUid: ids\.uid, lang \}, \{ force: true \}\)/);
    expect(refresh).toMatch(/if \(!chips\) return;/);
    expect(refresh).toMatch(/if \(chips\.length !== countRef\.current\) animateNextLayoutTransition\(\);\n\s*setFriends\(chips\);/);
    expect(refresh).toMatch(/inFlightRef\.current = false;/);
    expect(hook).toMatch(/useSpireFriendsRefresh\(\{ gate, ids, lang, friendsCount: friends\.length, setFriends \}\)/);
    // аудит «пропала сеть» 13.10: ранние выходы теперь с причиной в журнале; ряд по-прежнему ставится только при живом экране и данных
    expect(hook).toMatch(/if \(!alive\) \{ DebugLogger\.info\(LOG, 'game: друзья[^']*'\); return; \}\s*if \(!chips\) \{ DebugLogger\.info\(LOG, 'game: друзей[^']*'\); return; \}\s*setFriends\(chips\);/);
  });

  it('экран: RefreshControl на списке Шпиля вызывает refreshFriends', () => {
    expect(screen).toMatch(/refreshControl=\{<RefreshControl refreshing=\{friendsRefreshing\} onRefresh=\{onPullRefreshFriends\}/);
    expect(screen).toMatch(/void game\.refreshFriends\(\)\.finally\(\(\) => setFriendsRefreshing\(false\)\)/);
  });
});
