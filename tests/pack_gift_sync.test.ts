import { syncFlashcardPackGiftState } from '../app/flashcards/pack_gift_sync';
import { callFlashcardPackGiftSyncState, isCommunityPacksCloudEnabled } from '../app/community_packs/functionsClient';
import { addCommunityOwnedPackId } from '../app/community_packs/communityOwnedStorage';
import { getCanonicalUserId } from '../app/user_id_policy';
import { addOwnedPackId } from '../app/flashcards/marketplace';
import { reconcilePackGiftTrials } from '../app/flashcards/pack_trial_gift';

jest.mock('../app/community_packs/functionsClient');
jest.mock('../app/community_packs/communityOwnedStorage');
jest.mock('../app/user_id_policy');
jest.mock('../app/flashcards/marketplace');
jest.mock('../app/flashcards/pack_trial_gift');

beforeEach(() => {
  jest.clearAllMocks();
  (isCommunityPacksCloudEnabled as jest.Mock).mockReturnValue(true);
  (getCanonicalUserId as jest.Mock).mockResolvedValue('stable-1');
  (callFlashcardPackGiftSyncState as jest.Mock).mockResolvedValue({
    vouchers: [{ voucherId: 'grant-1', occurrenceId: 'grant-1', expiresAt: 1_900_000_000_000, source: 'league_chest' }],
    entitlements: [
      { packId: 'official_prep_in_en', packType: 'official', studyTarget: 'en' },
      { packId: 'community-fr', packType: 'community', studyTarget: 'fr' },
    ],
  });
  (reconcilePackGiftTrials as jest.Mock).mockResolvedValue(undefined);
  (addOwnedPackId as jest.Mock).mockResolvedValue(undefined);
  (addCommunityOwnedPackId as jest.Mock).mockResolvedValue(undefined);
});

it('restores official/community ownership before authoritative voucher reconciliation', async () => {
  await expect(syncFlashcardPackGiftState()).resolves.toBe(true);
  expect(addOwnedPackId).toHaveBeenCalledWith('official_prep_in_en', 'en');
  expect(addCommunityOwnedPackId).toHaveBeenCalledWith('community-fr', 'fr');
  expect(reconcilePackGiftTrials).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ voucherId: 'grant-1' })]),
    expect.arrayContaining([
      expect.objectContaining({ packId: 'official_prep_in_en' }),
      expect.objectContaining({ packId: 'community-fr' }),
    ]),
  );
  expect((addOwnedPackId as jest.Mock).mock.invocationCallOrder[0])
    .toBeLessThan((reconcilePackGiftTrials as jest.Mock).mock.invocationCallOrder[0]);
});

it('restores a durable entitlement even when the claimed voucher is omitted or already expired locally', async () => {
  (callFlashcardPackGiftSyncState as jest.Mock).mockResolvedValue({
    vouchers: [],
    entitlements: [{ packId: 'official_prep_on_en', packType: 'official', studyTarget: 'en' }],
  });

  await expect(syncFlashcardPackGiftState()).resolves.toBe(true);
  expect(addOwnedPackId).toHaveBeenCalledWith('official_prep_on_en', 'en');
  expect(reconcilePackGiftTrials).toHaveBeenCalledWith([], [
    expect.objectContaining({ packId: 'official_prep_on_en' }),
  ]);
});

it('keeps local state usable when server discovery is offline', async () => {
  (callFlashcardPackGiftSyncState as jest.Mock).mockRejectedValue(new Error('offline'));
  await expect(syncFlashcardPackGiftState()).resolves.toBe(false);
  expect(reconcilePackGiftTrials).not.toHaveBeenCalled();
});
