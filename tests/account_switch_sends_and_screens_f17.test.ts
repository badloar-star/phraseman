/**
 * F17, аудит (владелец 11.11: «исправить сейчас», «править сейчас», «стирать»): действия, уходящие на сервер, и экраны,
 * которые не перемонтируются при смене аккаунта A → B.
 *   • дуэль: ход/вызов/отказ прошлого игрока не уходит от имени нового и остаётся в его очереди;
 *   • «позвать», недельная сводка, снимок «вместе», вкладка «Друзья», Пик, Главная, объявления — проводка сброса по владельцу;
 *   • отметка «веха серии показана» стирается при выходе и смене аккаунта.
 * Сработал — чини логику, а не сторожа.
 */
import * as fs from 'fs';
import * as path from 'path';

const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
const mockCalls: Array<{ name: string; payload: Record<string, unknown> }> = [];
const mockResponses: Record<string, Array<() => Promise<unknown>>> = {};
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: (_fns: unknown, name: string) => (payload: Record<string, unknown>) => {
    mockCalls.push({ name, payload });
    const next = mockResponses[name]?.shift();
    return next ? next() : Promise.reject(new Error('no response'));
  },
}));
// «аккаунт»: тест меняет его между тапом и отправкой
const mockAccount = { generation: 1, stableId: 'a' as string | null };
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: mockAccount.generation, stableId: mockAccount.stableId, phase: 'active' }),
}));
/** Сборка отправителя — момент, когда «успевает» смениться аккаунт. */
let mockOnPrepareSender: () => void = () => {};
jest.mock('../app/friends_together/sender_identity', () => ({
  prepareTogetherSender: () => { mockOnPrepareSender(); return Promise.resolve({ stableId: String(mockAccount.stableId), displayName: 'Имя' }); },
}));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: () => Promise.resolve(mockAccount.stableId) }));

import { isSameAccountOwner, markAccountOwner } from '../app/account_same_owner';
import { ACCOUNT_SWITCH_LEAK_KEYS } from '../app/account_switch_leak_keys';
import { flushPendingDuels, readPendingDuels, submitDuelChallenge, submitDuelDecline } from '../app/friends_together/duel_client';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const ok = (data: unknown) => () => Promise.resolve({ data });
const fail = (code: string) => () => Promise.reject(Object.assign(new Error(code), { code: `functions/${code}` }));
const ids = ['en:lesson-01:session-01:i02', 'en:lesson-01:session-01:i03', 'en:lesson-01:session-02:i01', 'en:lesson-01:session-02:i05', 'en:lesson-01:session-03:i04'];
const move = { results: [true, true, false, true, true], elapsedMs: 48_000 };
const switchToB = (): void => { mockAccount.generation += 1; mockAccount.stableId = 'b'; };

beforeEach(() => {
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  mockCalls.length = 0;
  for (const key of Object.keys(mockResponses)) delete mockResponses[key];
  mockAccount.generation = 1;
  mockAccount.stableId = 'a';
  mockOnPrepareSender = () => {};
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('F17 · отметка аккаунта', () => {
  it('тот же аккаунт — да; сменился владелец или поколение — нет', () => {
    const mark = markAccountOwner();
    expect(isSameAccountOwner(mark)).toBe(true);
    mockAccount.generation += 1;
    expect(isSameAccountOwner(mark)).toBe(false);
    mockAccount.generation -= 1;
    mockAccount.stableId = 'b';
    expect(isSameAccountOwner(mark)).toBe(false);
  });
});

describe('F17 · дуэль не уходит от имени другого игрока', () => {
  it('аккаунт сменился между тапом и отправкой — запроса нет, ход остаётся в очереди прежнего игрока', async () => {
    mockOnPrepareSender = switchToB;
    mockResponses.friendsDuelChallenge = [ok({ duelId: 'd-1', expiresAtMs: 1 })];
    await expect(submitDuelChallenge({ friendUid: 'f-1', phraseIds: ids, move })).resolves.toEqual({ ok: false, reason: 'network' });
    expect(mockCalls).toHaveLength(0);
    expect(await readPendingDuels()).toEqual([]); // у B очередь пуста
    mockAccount.stableId = 'a';
    expect(await readPendingDuels()).toHaveLength(1); // у A ход на месте
  });

  it('досылка очереди: смена аккаунта посреди — остаток не отправляется и не стирается', async () => {
    mockResponses.friendsDuelChallenge = [fail('unavailable')];
    await submitDuelChallenge({ friendUid: 'f-1', phraseIds: ids, move });
    mockResponses.friendsDuelDecline = [fail('unavailable')];
    await submitDuelDecline('d-9');
    expect(await readPendingDuels()).toHaveLength(2);
    mockCalls.length = 0;
    // первая запись уходит нормально, во время неё аккаунт меняется
    mockResponses.friendsDuelChallenge = [() => { switchToB(); return Promise.resolve({ data: { duelId: 'd-2', expiresAtMs: 5 } }); }];
    mockResponses.friendsDuelDecline = [ok({})];
    const result = await flushPendingDuels();
    expect(mockCalls.map((c) => c.name)).toEqual(['friendsDuelChallenge']); // отказ от имени B не ушёл
    expect(result.sent).toBe(1);
    mockAccount.stableId = 'a';
    expect((await readPendingDuels()).some((p) => p.kind === 'decline')).toBe(true); // отказ A остался в его очереди
  });

  it('аккаунт не менялся — всё уходит как раньше', async () => {
    mockResponses.friendsDuelChallenge = [ok({ duelId: 'd-1', expiresAtMs: 123 })];
    await expect(submitDuelChallenge({ friendUid: 'f-1', phraseIds: ids, move })).resolves.toEqual({ ok: true, duelId: 'd-1', expiresAtMs: 123 });
    expect(mockCalls[0]?.payload).toMatchObject({ stableId: 'a', friendUid: 'f-1' });
  });
});

describe('F17 · проводка сброса по владельцу (по строкам файлов)', () => {
  it('«позвать»: отметка аккаунта в момент тапа, проверка после сборки отправителя', () => {
    const src = read('app/friends_together/nudge_client.ts');
    expect(src.indexOf('const tapOwner = markAccountOwner();')).toBeLessThan(src.indexOf('const owner = await ensureMemoryFresh();'));
    expect(src).toMatch(/if \(!isSameAccountOwner\(tapOwner\) \|\| \(owner && sender\.stableId !== owner\)\) \{[\s\S]{0,400}reason=account_changed[\s\S]{0,200}return \{ ok: false, reason: 'network' \};/);
    expect(src.indexOf('reason=account_changed')).toBeLessThan(src.indexOf('// 2) Optimistic: отмечаем ДО ответа сервера.'));
  });

  it('недельная сводка: при смене аккаунта не пишется на диск и не уходит в облако', () => {
    const src = read('app/friends_together/friend_week_store.ts');
    const guard = src.indexOf('if (!isSameAccountOwner(owner)) {');
    expect(guard).toBeGreaterThan(src.indexOf('const owner = markAccountOwner();'));
    expect(guard).toBeLessThan(src.indexOf('await AsyncStorage.setItem(FRIEND_WEEK_STORAGE_KEY, nextRaw);'));
    expect(guard).toBeLessThan(src.indexOf('void syncToCloud();'));
  });

  it('снимок «вместе»: память сбрасывается при смене владельца, поздний пересчёт прошлого не сохраняется', () => {
    const src = read('app/friends_together/together_store.ts');
    expect(src).toMatch(/onAccountOwnerChanged\('friends_together_snapshot', \(\) => \{[\s\S]{0,400}_memorySnapshot = null;\s+_memorySnapshotUid = null;/);
    expect(src.indexOf("reason: 'account_changed'")).toBeLessThan(src.indexOf('  _memorySnapshot = snapshot;'));
  });

  it('вкладка «Друзья»: список прошлого игрока сбрасывается и не пишется в кэш нового', () => {
    const src = read('app/(tabs)/friends.tsx');
    expect(src).toMatch(/else if \(canonical && friendsListOwnerRef\.current !== null && friendsListOwnerRef\.current !== canonical\) \{[\s\S]{0,1400}setFriends\(\[\]\);\s+setRequests\(\[\]\);\s+setProfiles\(\{\}\);\s+swrHadFriendsRef\.current = false;\s+setFriendsListSettled\(false\);\s+setTogetherSnapshot\(null\);/);
    expect(src).toContain('if (canonical) friendsListOwnerRef.current = canonical;');
    const skip = src.indexOf('if (friendsListOwnerRef.current !== uid) {');
    expect(skip).toBeGreaterThan(0);
    expect(skip).toBeLessThan(src.indexOf('FRIENDS_TAB_SWR_CACHE_KEY,\n            JSON.stringify({ canonicalUid: uid, friends, requests'));
  });

  it('Пик: неделя прошлого игрока убирается, чтение недели зависит от владельца, осиротевший старт снимает замок', () => {
    const screen = read('components/spire/SpireHomeScreen.tsx');
    expect(screen).toContain('const ownerEpoch = useSpireHomeWeekOwner(() => { setWeek(null); setSelected(null); setShowAll(false); });');
    expect(screen).toContain('}, [unlocked, spireLang, studyTarget, ownerEpoch]);');
    expect(screen.split('\n').length).toBeLessThanOrEqual(400);
    const week = read('components/spire/spire_home_week.ts');
    expect(week).toMatch(/export function useSpireHomeWeekOwner\(reset: \(\) => void\): number \{[\s\S]{0,700}if \(seenRef\.current === ownerEpoch\) return;[\s\S]{0,500}resetRef\.current\(\);/);
    const game = read('app/spire/use_spire_game.ts');
    expect(game).toContain('const resetKeyAtStart = prevLangRef.current;');
    expect(game).toMatch(/else if \(prepIdRef\.current === null && prevLangRef\.current !== resetKeyAtStart\) \{[^\n]*startingRef\.current = false; setStarting\(false\); \}/);
    expect(game).toMatch(/if \(prevLangRef\.current !== resetKeyAtStart\) \{[^\n]*startingRef\.current = false; setStarting\(false\); return; \} setRoomLoad\(/);
    // файл уже был длиннее сторожа «≤ 400 строк» (418 по счёту сторожа до F17) — правка F17 строк не добавляет
    expect(game.split('\n').length).toBeLessThanOrEqual(418);
  });

  it('Главная и объявления: поздравление и очередь окон прошлого игрока сбрасываются только при смене владельца', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toMatch(/if \(token\.stableId === lastOwner\) return;[\s\S]{0,500}celebrationQueuedRef\.current = false;\s+vipCelebrationQueuedMarkerRef\.current = null;\s+setCelebrationVisible\(false\);\s+setCelebrationMarker\(null\);\s+setVipCelebrationVisible\(false\);\s+setVipCelebrationMarker\(null\);/);
    const layout = read('app/_layout.tsx');
    expect(layout).toMatch(/if \(token\.stableId !== lastOwner\) \{\s+lastOwner = token\.stableId;\s+setAppMessageModalQueue\(\(current\) => \{/);
    const scene = read('components/home/v2/scene/HomeScene.tsx');
    expect(scene).toContain("onAccountOwnerChanged('home_scene_streak_lost_day', () => { streakLostShownDay = null; });");
    expect(scene).toContain('if (sceneOwnerRef.current !== sceneOwner) { sceneOwnerRef.current = sceneOwner; firstEntryToday.current = streakLostShownDay !== todayKey; }');
  });

  it('отметка «веха серии показана» стирается при выходе и смене аккаунта (решение владельца 11.11)', () => {
    expect(ACCOUNT_SWITCH_LEAK_KEYS).toContain('streak_milestone_shown_v1');
  });
});
