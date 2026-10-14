// m14A «Хватает на ранг N» (координатор 14.10): окно, когда монет впервые хватает на следующий ранг; 1 раз на ранг.
import { decideRankEnough, markRankOffered, readOfferedRanks } from '../app/coin_rank_enough_gate';
import { nextCoinRankRow } from '../app/coin_rank_table_v1';

let mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: async (key: string, value: string) => { mockStore[key] = value; },
    getItem: async (key: string) => (key in mockStore ? mockStore[key] : null),
  },
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/remote_config_client', () => ({ readRemoteConfigCacheRaw: async () => null }));

const price1 = nextCoinRankRow(0)!.priceToReach;

describe('decideRankEnough', () => {
  beforeEach(() => { mockStore = {}; });

  it('порог: меньше цены — нет, ровно цена — да', () => {
    expect(decideRankEnough({ rank: 0, balance: price1 - 1, offeredRanks: [] })).toEqual({ show: false, reason: 'not_enough' });
    expect(decideRankEnough({ rank: 0, balance: price1, offeredRanks: [] })).toEqual({ show: true, rank: 0, nextRank: 1, price: price1, balance: price1 });
  });

  it('тот же ранг второй раз — нет; баланс упал и снова вырос — всё равно нет', async () => {
    await markRankOffered('owner-a', 1);
    const offered = await readOfferedRanks('owner-a');
    expect(decideRankEnough({ rank: 0, balance: price1 + 500, offeredRanks: offered })).toEqual({ show: false, reason: 'already_offered' });
    expect(decideRankEnough({ rank: 0, balance: price1 - 100, offeredRanks: offered })).toMatchObject({ show: false });
    expect(decideRankEnough({ rank: 0, balance: price1 * 2, offeredRanks: offered })).toEqual({ show: false, reason: 'already_offered' });
  });

  it('после покупки ранга следующий ранг — снова можно предложить', async () => {
    await markRankOffered('owner-a', 1);
    const price2 = nextCoinRankRow(1)!.priceToReach;
    expect(decideRankEnough({ rank: 1, balance: price2, offeredRanks: await readOfferedRanks('owner-a') })).toMatchObject({ show: true, nextRank: 2 });
  });

  it('последний ранг и неизвестное состояние — нет', () => {
    expect(decideRankEnough({ rank: 19, balance: 10_000_000, offeredRanks: [] })).toEqual({ show: false, reason: 'max_rank' });
    expect(decideRankEnough({ rank: null, balance: 5000, offeredRanks: [] })).toEqual({ show: false, reason: 'unknown_state' });
    expect(decideRankEnough({ rank: 0, balance: null, offeredRanks: [] })).toEqual({ show: false, reason: 'unknown_state' });
  });

  it('отметки раздельны по аккаунтам и не дублируются', async () => {
    await markRankOffered('owner-a', 1);
    await markRankOffered('owner-a', 1);
    expect(await readOfferedRanks('owner-a')).toEqual([1]);
    expect(await readOfferedRanks('owner-b')).toEqual([]);
  });
});
