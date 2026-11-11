type Token = Readonly<{ generation: number; stableId: string | null; phase: 'active' | 'transitioning' }>;

const tokenA: Token = Object.freeze({ generation: 1, stableId: 'stable-a', phase: 'active' });
let mockCurrentToken: Token = tokenA;
let mockGetItem: (key: string) => Promise<string | null> = async () => null;
const mockSetItem = jest.fn(async () => undefined);
const mockStory = jest.fn(async () => ({ recorded: true }));
const mockMerge = jest.fn(async () => ({ balance: 100, earnedTotal: 100 }));
const mockGetDoc = jest.fn<Promise<Record<string, unknown>>, []>();
let mockParticipation: string[] = [];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
  },
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => mockCurrentToken,
  isCurrentAccountGeneration: (token: Token, expected?: string | null) => (
    token.generation === mockCurrentToken.generation
    && token.stableId === mockCurrentToken.stableId
    && token.phase === 'active'
    && mockCurrentToken.phase === 'active'
    && (expected === undefined || expected === mockCurrentToken.stableId)
  ),
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/spire/spire_room_client', () => ({
  spireReadParticipation: async () => mockParticipation,
}));
jest.mock('../modules/story_events/story_event_sources', () => ({ recordSpireWeekStory: (...args: unknown[]) => mockStory(...args) }));
jest.mock('../app/level_spin_star_grants', () => ({ mergeLevelSpinServerStars: (...args: unknown[]) => mockMerge(...args) }));
jest.mock('../app/spire/spire_net', () => ({
  spireErrorText: (error: unknown) => String(error),
  spireFirestore: () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({ doc: () => ({ get: () => mockGetDoc() }) }),
      }),
    }),
  }),
}));

import { spireLoadWeekResult, spirePreviousWeekKey } from '../app/spire/spire_week_result_client';

const gate = {} as never;
const result = {
  weekId: spirePreviousWeekKey(Date.now()), lang: 'en', steps: 40, roomRank: 3, roomTotal: 30,
  promoted: true, demoted: false, prevTier: 1, newTier: 2,
  placeCoins: 100, promotionCoins: 100, rewardStatus: 'paid',
  walletAfter: { stars: 900, earnedTotal: 12_000, seq: 41, paidCoins: 200 },
};
const rawDoc = {
  schema: 'spire-week-result.v1', steps: 40, roomRank: 3, roomTotal: 30,
  promoted: true, demoted: false, prevTier: 1, newTier: 2,
  rewardCoins: { place: 100, promotion: 100 }, rewardStatus: 'paid',
  rewardPaidCoins: 200, starsBalanceAfter: 900, starsEarnedTotalAfter: 12_000, starsSeq: 41,
};

describe('spireLoadWeekResult account isolation', () => {
  beforeEach(() => {
    mockCurrentToken = tokenA;
    mockGetItem = async () => null;
    mockSetItem.mockClear();
    mockStory.mockClear();
    mockMerge.mockClear();
    mockGetDoc.mockReset();
    mockParticipation = [spirePreviousWeekKey(Date.now())];
  });

  it('cached A result resolving after A→B returns null and publishes no A side effect', async () => {
    const cacheRead = deferred<string | null>();
    mockGetItem = () => cacheRead.promise;
    const pending = spireLoadWeekResult(gate, { uid: 'stable-a', lang: 'en' }, { markShown: true, where: 'account_race_cache' });

    mockCurrentToken = Object.freeze({ generation: 2, stableId: 'stable-b', phase: 'active' });
    cacheRead.resolve(JSON.stringify({ weekId: result.weekId, state: 'found', checkedAtMs: Date.now(), result }));

    await expect(pending).resolves.toBeNull();
    expect(mockStory).not.toHaveBeenCalled();
    expect(mockMerge).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('network A result resolving after A→B returns null and writes no cache, story, wallet, or shown state', async () => {
    const networkRead = deferred<Record<string, unknown>>();
    mockGetDoc.mockReturnValueOnce(networkRead.promise);
    const pending = spireLoadWeekResult(gate, { uid: 'stable-a', lang: 'en' }, { markShown: true, where: 'account_race_network' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockGetDoc).toHaveBeenCalledTimes(1);

    mockCurrentToken = Object.freeze({ generation: 2, stableId: 'stable-b', phase: 'active' });
    networkRead.resolve({ exists: true, data: () => rawDoc });

    await expect(pending).resolves.toBeNull();
    expect(mockStory).not.toHaveBeenCalled();
    expect(mockMerge).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});
