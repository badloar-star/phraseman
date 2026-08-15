import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';

const emitAppEvent = jest.fn();
const commitShardCompositeOperation = jest.fn();
const getShardsBalance = jest.fn(async () => 95);
const primeOwnedPackIdsCache = jest.fn();
const primeMarketplaceBuiltCardsCacheFromOwnedStorage = jest.fn(async () => undefined);
const logCardPackPurchasedShards = jest.fn();
const trackCardPackPurchase = jest.fn();
const trackCardPackAcquiredAchievement = jest.fn();

jest.mock('../app/events', () => ({ emitAppEvent: (...args: unknown[]) => emitAppEvent(...args) }));
jest.mock('../app/shards_system', () => ({
  commitShardCompositeOperation: (...args: unknown[]) => commitShardCompositeOperation(...args),
  getShardsBalance: () => getShardsBalance(),
}));
jest.mock('../app/economy/client_shard_semantic_id', () => ({
  semanticShardOperationId: jest.fn(async () => 'semantic_pack_race_0001'),
}));
jest.mock('../app/firebase', () => ({
  logCardPackPurchasedShards: (...args: unknown[]) => logCardPackPurchasedShards(...args),
}));
jest.mock('../app/user_stats', () => ({
  trackCardPackPurchase: (...args: unknown[]) => trackCardPackPurchase(...args),
}));
jest.mock('../app/flashcards/packAchievementTracking', () => ({
  trackCardPackAcquiredAchievement: (...args: unknown[]) => trackCardPackAcquiredAchievement(...args),
}));
jest.mock('../app/flashcards/marketplace', () => ({
  loadOwnedPackIds: jest.fn(async () => []),
  primeOwnedPackIdsCache: (...args: unknown[]) => primeOwnedPackIdsCache(...args),
  primeMarketplaceBuiltCardsCacheFromOwnedStorage: (...args: unknown[]) => (
    primeMarketplaceBuiltCardsCacheFromOwnedStorage.apply(null, args)
  ),
  addOwnedPackId: jest.fn(),
}));
jest.mock('../app/flashcards/pack_trial_gift', () => ({
  bindPackGiftVoucherSelection: jest.fn(),
  consumePackGiftTrial: jest.fn(),
  getPackGiftTrial: jest.fn(),
}));
jest.mock('../app/community_packs/purchaseCommunityPack', () => ({
  ensureFirebaseUserSignedInForCallable: jest.fn(),
  purchaseCommunityPackWithShards: jest.fn(),
  redeemCommunityPackGiftVoucher: jest.fn(),
}));
jest.mock('../app/community_packs/functionsClient', () => ({ callFlashcardPackGiftRedeem: jest.fn() }));
jest.mock('../app/flashcards_target_gate', () => ({
  flashcardsOfficialPacksAvailableForTarget: jest.fn(() => true),
}));

import { purchaseCardPackWithShards } from '../app/flashcards/cardPackShardPurchase';

beforeEach(() => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  beginAccountGeneration('pack-owner');
});

it('does not prime caches, analytics, or UI for an old-owner pack result', async () => {
  let release!: (value: unknown) => void;
  commitShardCompositeOperation.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
  const pending = purchaseCardPackWithShards({
    id: 'pack-race',
    priceShards: 5,
    titleRu: 'Пак',
    titleUk: 'Пак',
    titleEs: 'Pack',
    isCommunityUgc: false,
  } as any, 'en');
  for (let i = 0; i < 10 && !commitShardCompositeOperation.mock.calls.length; i += 1) await Promise.resolve();
  beginAccountGeneration('other-owner');
  release({
    status: 'applied',
    balanceBefore: 100,
    balanceAfter: 95,
    operation: { ownerStableId: 'pack-owner' },
  });

  await expect(pending).resolves.toBe('spend_failed');
  expect(primeOwnedPackIdsCache).not.toHaveBeenCalled();
  expect(primeMarketplaceBuiltCardsCacheFromOwnedStorage).not.toHaveBeenCalled();
  expect(logCardPackPurchasedShards).not.toHaveBeenCalled();
  expect(trackCardPackPurchase).not.toHaveBeenCalled();
  expect(trackCardPackAcquiredAchievement).not.toHaveBeenCalled();
  expect(getShardsBalance).not.toHaveBeenCalled();
  expect(emitAppEvent).not.toHaveBeenCalled();
});
