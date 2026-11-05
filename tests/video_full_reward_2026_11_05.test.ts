// зачем (владелец 05.11: «+500 монет за полный просмотр видео — 70 %, повторный просмотр не даёт, без дневного предела, без ×2»; Ядро: requestId
// videofull_<40 hex> = sha1(uid|videoId), giftId stars_500): сторож детектора 70 % и награды «один раз навсегда на (uid, videoId)».
import { createHash } from 'node:crypto';

const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
  },
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA1: 'SHA-1' },
  digestStringAsync: jest.fn(async (_alg: string, data: string) => createHash('sha1').update(data).digest('hex')),
}));
let account: { phase: string; stableId: string | null } = { phase: 'active', stableId: 'uid-1' };
let accountListener: (() => void) | null = null;
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ ...account, generation: 1 }),
  subscribeAccountGeneration: (l: () => void) => { accountListener = l; return () => undefined; },
}));
const enqueue = jest.fn(async (_input: unknown, _opts: unknown) => undefined);
const syncPending = jest.fn(async () => ({ synced: 1, pending: 0 }));
jest.mock('../app/level_spin_star_grants', () => ({ enqueueLevelSpinStarGrant: (i: unknown, o: unknown) => enqueue(i, o), syncPendingLevelSpinStarGrants: () => syncPending() }));

import {
  VIDEO_FULL_MAX_STEP_SEC, VIDEO_FULL_MIN_DURATION_SEC, VIDEO_FULL_WATCH_RATIO, createVideoFullState, feedVideoFullTick, videoFullEligibility, videoFullTarget,
  type VideoFullState,
} from '../app/video_full_watch';
import {
  VIDEO_FULL_GIFT_ID, VIDEO_FULL_REWARD_COINS, __resetVideoFullRewardForTests, grantVideoFullReward, peekVideoFullRewarded, readVideoFullRewarded,
  subscribeVideoFullRewardEvents, videoFullRequestId, videoFullRewardedKey,
} from '../app/video_full_reward';

/** Играет n секунд подряд обычным ходом: тик раз в секунду (позиция и настенные часы растут вместе). */
function play(state: VideoFullState, fromSec: number, seconds: number, startMs: number): { state: VideoFullState; reachedAtSec: number | null; nowMs: number } {
  let s = state;
  let now = startMs;
  let reachedAtSec: number | null = null;
  for (let i = 0; i <= seconds; i += 1) {
    const t = feedVideoFullTick(s, fromSec + i, now);
    s = t.state;
    if (t.justReached && reachedAtSec === null) reachedAtSec = i;
    now += 1000;
  }
  return { state: s, reachedAtSec, nowMs: now };
}

beforeEach(() => {
  __resetVideoFullRewardForTests();
  for (const k of Object.keys(store)) delete store[k];
  account = { phase: 'active', stableId: 'uid-1' };
  enqueue.mockClear(); syncPending.mockClear();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('детектор полного просмотра: 70 % непрерывно сыгранного времени', () => {
  it('порог — 0,7 длительности', () => {
    expect(VIDEO_FULL_WATCH_RATIO).toBe(0.7);
    expect(videoFullTarget(600)).toBeCloseTo(420, 5);
  });

  it('69 % — награды нет, 70 % — награда ровно один раз', () => {
    const dur = 100; // цель 70 с
    const start = createVideoFullState('vid', dur);
    const under = play(start, 0, 69, 1_000_000); // 69 шагов ≈ 69 с (первый тик — «старт», не считается)
    expect(under.reachedAtSec).toBeNull();
    expect(under.state.reached).toBe(false);
    const full = play(start, 0, 80, 1_000_000);
    expect(full.reachedAtSec).toBe(70); // тик 0 — старт, на тике 70 накоплено 70 секунд
    expect(full.state.reached).toBe(true);
    // после достижения новых «достиг» нет
    expect(feedVideoFullTick(full.state, 90, full.nowMs).justReached).toBe(false);
  });

  it('перемотка вперёд секунд не добавляет: прыжок через половину ролика награды не даёт', () => {
    let s = createVideoFullState('vid', 100);
    s = play(s, 0, 20, 1_000_000).state; // 20 с честно
    const jump = feedVideoFullTick(s, 90, 1_000_000 + 21_000);
    expect(jump.action).toBe('seek_forward');
    expect(jump.state.accumulatedSec).toBeCloseTo(s.accumulatedSec, 5);
    expect(jump.justReached).toBe(false);
    expect(VIDEO_FULL_MAX_STEP_SEC).toBeLessThan(5);
  });

  it('перемотка назад и дубль тика не копят; позиция быстрее настенных часов — перемотка', () => {
    let s = createVideoFullState('vid', 100);
    s = play(s, 10, 5, 1_000_000).state;
    const back = feedVideoFullTick(s, 3, 1_000_000 + 6_000);
    expect(back.action).toBe('seek_back');
    const dup = feedVideoFullTick(back.state, 4, 1_000_000 + 6_100);
    expect(dup.action).toBe('duplicate');
    expect(dup.state).toBe(back.state);
    // шаг 2 с за 1 с настенных часов — быстрее реального времени (допуск 1 с): перемотка
    const fast = feedVideoFullTick(back.state, 6.5, 1_000_000 + 7_000);
    expect(fast.action).toBe('seek_forward');
  });

  it('повторный просмотр с начала после достижения тоже не награждает (флаг reached остаётся)', () => {
    const done = play(createVideoFullState('vid', 40), 0, 40, 1_000_000).state;
    expect(done.reached).toBe(true);
    expect(feedVideoFullTick(done, 0, 9_000_000).action).toBe('already_reached');
  });

  it('без длительности, лайвы и ролики короче порога не награждаются (с причиной)', () => {
    expect(videoFullEligibility(undefined, false)).toBe('no_duration');
    expect(videoFullEligibility(0, false)).toBe('no_duration');
    expect(videoFullEligibility(NaN, false)).toBe('no_duration');
    expect(videoFullEligibility(600, true)).toBe('live');
    expect(videoFullEligibility(VIDEO_FULL_MIN_DURATION_SEC - 1, false)).toBe('too_short');
    expect(videoFullEligibility(VIDEO_FULL_MIN_DURATION_SEC, false)).toBe('ok');
    expect(videoFullEligibility(600, null)).toBe('ok');
  });
});

describe('награда +500: один раз навсегда на (uid, videoId)', () => {
  it('requestId = videofull_ + sha1(uid|videoId), 40 hex нижний регистр; кошелёк получает stars_500 / base / gameplay', async () => {
    const id = await videoFullRequestId('uid-1', 'abc12345678');
    expect(id).toBe(`videofull_${createHash('sha1').update('uid-1|abc12345678').digest('hex')}`);
    expect(id).toMatch(/^videofull_[0-9a-f]{40}$/);
    expect(await grantVideoFullReward('abc12345678')).toBe('granted');
    expect(enqueue).toHaveBeenCalledTimes(1);
    const [input, opts] = enqueue.mock.calls[0] as [Record<string, unknown>, Record<string, unknown>];
    expect(input).toMatchObject({ requestId: id, lane: 'base', giftId: VIDEO_FULL_GIFT_ID, promotionEligibility: 'gameplay' });
    expect(VIDEO_FULL_GIFT_ID).toBe('stars_500');
    expect(VIDEO_FULL_REWARD_COINS).toBe(500);
    expect(opts).toEqual({ syncNow: false });
    expect(syncPending).toHaveBeenCalledTimes(1);
  });

  it('повтор того же ролика, двойной вызов и новый заход — награды нет', async () => {
    const [a, b] = await Promise.all([grantVideoFullReward('v1'), grantVideoFullReward('v1')]);
    expect([a, b].sort()).toEqual(['granted', 'repeat']);
    expect(await grantVideoFullReward('v1')).toBe('repeat');
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(await grantVideoFullReward('v2')).toBe('granted'); // другой ролик — своя награда
    expect(enqueue).toHaveBeenCalledTimes(2);
  });

  it('отметка переживает перезапуск (читается с диска) и показывается плашкам', async () => {
    await grantVideoFullReward('v1');
    expect(JSON.parse(store[videoFullRewardedKey('uid-1')]!)).toEqual(['v1']);
    __resetVideoFullRewardForTests();
    expect(peekVideoFullRewarded('uid-1').has('v1')).toBe(false); // память пуста, пока не прочитали
    expect((await readVideoFullRewarded('uid-1')).has('v1')).toBe(true);
    enqueue.mockClear();
    expect(await grantVideoFullReward('v1')).toBe('repeat');
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('ошибка журнала кошелька — откат отметки, награда не потеряна: следующая попытка пробует снова', async () => {
    enqueue.mockRejectedValueOnce(new Error('level_spin_star_identity_changed'));
    expect(await grantVideoFullReward('v1')).toBe('failed');
    expect((await readVideoFullRewarded('uid-1')).has('v1')).toBe(false);
    expect(await grantVideoFullReward('v1')).toBe('granted');
  });

  it('нет активного аккаунта — не награждаем и не записываем', async () => {
    account = { phase: 'signed_out', stableId: null };
    expect(await grantVideoFullReward('v1')).toBe('skipped');
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('событие награды приходит сразу после записи в журнал (иконка/история), один раз на ролик', async () => {
    const seen: string[] = [];
    subscribeVideoFullRewardEvents((e) => seen.push(`${e.videoId}:${e.amount}`));
    await grantVideoFullReward('v1');
    await grantVideoFullReward('v1');
    expect(seen).toEqual(['v1:500']);
  });

  it('смена аккаунта сбрасывает память отметок (чужие ролики не видны)', async () => {
    await grantVideoFullReward('v1');
    accountListener?.();
    expect(peekVideoFullRewarded('uid-1').size).toBe(0);
  });
});
