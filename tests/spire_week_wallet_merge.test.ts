// Итог недели Пика → баланс шапки (координатор 15.10, аудит Optimistic UI).
// зачем: окно m01 говорило «+100 за повышение», а шапка не менялась до следующего урока — клиент не принимал серверный баланс
// после выплаты крона. Теперь итог несёт снимок кошелька, загрузчик вливает его через mergeLevelSpinServerStars (guard по starsSeq),
// а «+N монет» показывается только при rewardStatus 'paid'. Сработал — чини логику, а не сторожа.
let mockStore: Record<string, string> = {};
let mockDoc: Record<string, unknown> | null = null;
let mockToken: { stableId: string | null; generation: number; phase: string } = { stableId: 'u1', generation: 1, phase: 'active' };
const mockMerge = jest.fn(async () => ({ balance: 990, earnedTotal: 1 }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: async (k: string, v: string) => { mockStore[k] = v; },
    getItem: async (k: string) => (k in mockStore ? mockStore[k] : null),
  },
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/account_generation', () => ({ captureAccountGeneration: () => mockToken }));
jest.mock('../app/level_spin_star_grants', () => ({ mergeLevelSpinServerStars: (...a: unknown[]) => mockMerge(...(a as [])) }));
jest.mock('../modules/story_events/story_event_sources', () => ({ recordSpireWeekStory: () => undefined }));
let mockWeeks: string[] = [];
jest.mock('../app/spire/spire_room_client', () => ({ spireReadParticipation: async () => mockWeeks }));
jest.mock('../app/spire/spire_net', () => ({
  spireErrorText: (e: unknown) => String(e),
  spireFirestore: () => ({
    collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: mockDoc !== null, data: () => mockDoc }) }) }) }) }),
  }),
}));

import { spireDecodeWeekResult, spireLoadWeekResult, spirePreviousWeekKey } from '../app/spire/spire_week_result_client';

const base = { schema: 'spire-week-result.v1', steps: 40, roomRank: 3, roomTotal: 30, promoted: true, demoted: false, prevTier: 1, newTier: 2, rewardCoins: { place: 150, promotion: 100 } };
const paidDoc = { ...base, rewardStatus: 'paid', rewardPaidCoins: 250, starsBalanceAfter: 890, starsEarnedTotalAfter: 12_000, starsSeq: 41 };
const flush = () => new Promise((r) => setTimeout(r, 0));
const gate = {} as never;

describe('«+N монет» итога недели — только при rewardStatus paid', () => {
  it('paid → монеты места и повышения + снимок кошелька', () => {
    const v = spireDecodeWeekResult(paidDoc, '2026-W41', 'en');
    expect(v).toMatchObject({ placeCoins: 150, promotionCoins: 100, rewardStatus: 'paid' });
    expect(v?.walletAfter).toEqual({ stars: 890, earnedTotal: 12_000, seq: 41, paidCoins: 250 });
  });
  it('pending_wallet / нет статуса → строк «+N» нет и снимка нет', () => {
    for (const doc of [{ ...base, rewardStatus: 'pending_wallet' }, base]) {
      const v = spireDecodeWeekResult(doc, '2026-W41', 'en');
      expect(v).toMatchObject({ placeCoins: 0, promotionCoins: 0 });
      expect(v).not.toHaveProperty('walletAfter');
    }
  });
  it('paid, но старый итог без снимка (до выкладки 17.10) → монеты есть, вливать нечего', () => {
    const v = spireDecodeWeekResult({ ...base, rewardStatus: 'paid', rewardPaidCoins: 250 }, '2026-W41', 'en');
    expect(v).toMatchObject({ promotionCoins: 100 });
    expect(v).not.toHaveProperty('walletAfter');
  });
});

describe('загрузчик итога вливает снимок кошелька в баланс', () => {
  beforeEach(() => {
    mockStore = {};
    mockMerge.mockClear();
    mockToken = { stableId: 'u1', generation: 1, phase: 'active' };
    mockWeeks = [spirePreviousWeekKey(Date.now())];
  });

  it('итог с сервера → mergeLevelSpinServerStars со снимком и суммой выплаты; повторный заход того же процесса — не вливает', async () => {
    mockDoc = paidDoc;
    await spireLoadWeekResult(gate, { uid: 'u1', lang: 'en' }, { markShown: false, where: 't1' });
    await flush();
    expect(mockMerge).toHaveBeenCalledTimes(1);
    expect(mockMerge).toHaveBeenCalledWith(mockToken, { stars: 890, starsEarnedTotal: 12_000, starsSeq: 41, serverCreditedDelta: 250 });
    await spireLoadWeekResult(gate, { uid: 'u1', lang: 'en' }, { markShown: false, where: 't1' }); // теперь из кэша 'found'
    await flush();
    expect(mockMerge).toHaveBeenCalledTimes(1);
  });

  it('итог без снимка (pending_wallet) → баланс не трогаем', async () => {
    mockDoc = { ...base, rewardStatus: 'pending_wallet' };
    mockToken = { stableId: 'u2', generation: 1, phase: 'active' };
    await spireLoadWeekResult(gate, { uid: 'u2', lang: 'en' }, { markShown: false });
    await flush();
    expect(mockMerge).not.toHaveBeenCalled();
  });

  it('аккаунт не совпал с uid итога → чужой снимок не вливаем', async () => {
    mockDoc = { ...paidDoc, starsSeq: 77 };
    mockToken = { stableId: 'other', generation: 2, phase: 'active' };
    await spireLoadWeekResult(gate, { uid: 'u3', lang: 'en' }, { markShown: false });
    await flush();
    expect(mockMerge).not.toHaveBeenCalled();
  });

  it('сбой слияния → следующий заход пробует снова (метка «влито» снимается)', async () => {
    mockDoc = { ...paidDoc, starsSeq: 88 };
    mockToken = { stableId: 'u4', generation: 3, phase: 'active' };
    mockMerge.mockRejectedValueOnce(new Error('level_spin_star_identity_changed') as never);
    await spireLoadWeekResult(gate, { uid: 'u4', lang: 'en' }, { markShown: false });
    await flush();
    await spireLoadWeekResult(gate, { uid: 'u4', lang: 'en' }, { markShown: false });
    await flush();
    expect(mockMerge).toHaveBeenCalledTimes(2);
  });
});
