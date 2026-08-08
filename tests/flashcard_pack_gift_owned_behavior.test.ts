import { purchaseCardPackWithShards, redeemPackGiftVoucher } from '../app/flashcards/cardPackShardPurchase';
import { callFlashcardPackGiftRedeem } from '../app/community_packs/functionsClient';
import { loadOwnedPackIds } from '../app/flashcards/marketplace';
import { consumePackGiftTrial, getPackGiftTrial } from '../app/flashcards/pack_trial_gift';
import { flashcardsOfficialPacksAvailableForTarget } from '../app/flashcards_target_gate';

jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/firebase', () => ({ logCardPackPurchasedShards: jest.fn() }));
jest.mock('../app/shards_system', () => ({ addShardsRaw: jest.fn(), getShardsBalance: jest.fn(), spendShards: jest.fn() }));
jest.mock('../app/user_stats', () => ({ trackCardPackPurchase: jest.fn() }));
jest.mock('../app/flashcards/marketplace', () => ({
  addOwnedPackId: jest.fn(),
  loadOwnedPackIds: jest.fn(),
  primeMarketplaceBuiltCardsCacheFromOwnedStorage: jest.fn(),
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
jest.mock('../app/flashcards/packAchievementTracking', () => ({ trackCardPackAcquiredAchievement: jest.fn() }));
jest.mock('../app/flashcards_target_gate', () => ({ flashcardsOfficialPacksAvailableForTarget: jest.fn(() => true) }));
jest.mock('../app/community_packs/functionsClient', () => ({ callFlashcardPackGiftRedeem: jest.fn() }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn() }));
jest.mock('../app/target_storage_keys', () => ({ storageStudyTarget: jest.fn(() => 'en') }));

beforeEach(() => {
  jest.clearAllMocks();
  (loadOwnedPackIds as jest.Mock).mockResolvedValue(['official_prep_in_en']);
  (getPackGiftTrial as jest.Mock).mockResolvedValue({
    localVoucherId: 'server-grant', voucherId: 'grant', occurrenceId: 'grant', expiresAt: Date.now() + 60_000,
  });
});

it('returns already_owned before reading or sending a voucher for a locally owned official pack', async () => {
  const pack = { id: 'official_prep_in_en', isCommunityUgc: false } as never;

  await expect(redeemPackGiftVoucher(pack, 'en')).resolves.toBe('already_owned');
  expect(loadOwnedPackIds).toHaveBeenCalledWith('en');
  expect(getPackGiftTrial).not.toHaveBeenCalled();
  expect(callFlashcardPackGiftRedeem).not.toHaveBeenCalled();
  expect(consumePackGiftTrial).not.toHaveBeenCalled();
});

it('uses the visible source locale when rechecking an official French pack', async () => {
  const pack = { id: 'official_prep_in_en', isCommunityUgc: false } as never;

  await expect(purchaseCardPackWithShards(pack, 'fr', 'uk')).resolves.toBe('already_owned');
  expect(flashcardsOfficialPacksAvailableForTarget).toHaveBeenCalledWith('fr', 'uk');
});
