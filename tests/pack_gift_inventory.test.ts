import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  bindPackGiftVoucherSelection,
  consumePackGiftTrial,
  getPackGiftTrial,
  getPackGiftTrials,
  reconcilePackGiftTrials,
  setPackGiftTrial48hOnce,
  setRandomPackGiftTrial48h,
} from '../app/flashcards/pack_trial_gift';
import { flashcardsPackTrialGiftKey } from '../app/target_storage_keys';
import { beginAccountGeneration, __resetAccountGenerationForTests } from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const data = new Map<string, string>();

beforeEach(() => {
  data.clear();
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
  __resetAccountGenerationForTests();
  beginAccountGeneration('account-a');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => data.get(key) ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { data.set(key, value); });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => { data.delete(key); });
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) => keys.map((key) => [key, data.get(key) ?? null]));
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: Array<[string, string]>) => {
    pairs.forEach(([key, value]) => data.set(key, value));
  });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => keys.forEach((key) => data.delete(key)));
});

afterEach(() => jest.restoreAllMocks());

describe('global flashcard pack gift inventory', () => {
  it('migrates both legacy target slots and exposes either voucher from French', async () => {
    data.set(flashcardsPackTrialGiftKey('en'), JSON.stringify({ packId: 'en-preview', voucherId: 'en-voucher', expiresAt: 1_800_100_000_000 }));
    data.set(flashcardsPackTrialGiftKey('fr'), JSON.stringify({ packId: 'fr-preview', voucherId: 'fr-voucher', expiresAt: 1_800_200_000_000 }));

    await expect(getPackGiftTrials()).resolves.toHaveLength(2);
    await expect(getPackGiftTrial('fr')).resolves.toMatchObject({ localVoucherId: expect.any(String) });
    expect(data.has(flashcardsPackTrialGiftKey('en'))).toBe(false);
    expect(data.has(flashcardsPackTrialGiftKey('fr'))).toBe(false);
  });

  it('keeps overlapping vouchers and consumes only the selected voucher', async () => {
    const first = await setRandomPackGiftTrial48h('en', 'grant-one', 1_800_100_000_000);
    const second = await setRandomPackGiftTrial48h('fr', 'grant-two', 1_800_200_000_000);

    expect(first?.localVoucherId).not.toBe(second?.localVoucherId);
    await expect(getPackGiftTrials()).resolves.toHaveLength(2);
    await consumePackGiftTrial(first!.localVoucherId);
    await expect(getPackGiftTrials()).resolves.toEqual([expect.objectContaining({ voucherId: 'grant-two' })]);
  });

  it('replays each idempotency marker to its own voucher even after a newer grant', async () => {
    const first = await setPackGiftTrial48hOnce('en', 'occurrence-one', 1_800_100_000_000, 'grant-one');
    const second = await setPackGiftTrial48hOnce('fr', 'occurrence-two', 1_800_200_000_000, 'grant-two');
    const replay = await setPackGiftTrial48hOnce('fr', 'occurrence-one', 1_800_100_000_000, 'grant-one');

    expect(replay?.localVoucherId).toBe(first?.localVoucherId);
    expect(replay?.localVoucherId).not.toBe(second?.localVoucherId);
  });

  it('keeps an expired voucher with a confirmed selection binding for exact server replay', async () => {
    const voucher = await setRandomPackGiftTrial48h('en', 'grant-one', 1_800_000_010_000);
    await bindPackGiftVoucherSelection(voucher!.localVoucherId, {
      packId: 'official_prep_in_en', packType: 'official', studyTarget: 'en', confirmedAt: 1_800_000_001_000,
    });
    (Date.now as jest.Mock).mockReturnValue(1_800_000_020_000);

    await expect(getPackGiftTrials()).resolves.toEqual([
      expect.objectContaining({ localVoucherId: voucher!.localVoucherId, claimBinding: expect.objectContaining({ packId: 'official_prep_in_en' }) }),
    ]);
  });

  it('authoritatively removes omitted unbound server vouchers while preserving local-only vouchers', async () => {
    await setRandomPackGiftTrial48h('en', 'server-A', 1_800_100_000_000, 'server-A', 'league_chest');
    await setRandomPackGiftTrial48h('en', 'server-B', 1_800_100_000_000, 'server-B', 'league_chest');
    await setRandomPackGiftTrial48h('en', undefined, 1_800_100_000_000, undefined, 'local_bonus');

    await reconcilePackGiftTrials([
      { voucherId: 'server-A', occurrenceId: 'server-A', expiresAt: 1_800_100_000_000, source: 'league_chest' },
    ]);

    const inventory = await getPackGiftTrials();
    expect(inventory).toEqual(expect.arrayContaining([
      expect.objectContaining({ voucherId: 'server-A' }),
      expect.objectContaining({ source: 'local_bonus' }),
    ]));
    expect(inventory).not.toEqual(expect.arrayContaining([expect.objectContaining({ voucherId: 'server-B' })]));
  });

  it('keeps a recoverable claim binding until its entitlement is materialized, then cleans it', async () => {
    const recovery = await setRandomPackGiftTrial48h('en', 'server-recovery', 1_800_100_000_000, 'server-recovery', 'level_gift');
    await bindPackGiftVoucherSelection(recovery!.localVoucherId, {
      packId: 'official_prep_in_en', packType: 'official', studyTarget: 'en', confirmedAt: 1_800_000_001_000,
    });

    await reconcilePackGiftTrials([]);
    await expect(getPackGiftTrials()).resolves.toEqual([
      expect.objectContaining({ voucherId: 'server-recovery', claimBinding: expect.objectContaining({ packId: 'official_prep_in_en' }) }),
    ]);

    await reconcilePackGiftTrials([], [
      { packId: 'official_prep_in_en', packType: 'official', studyTarget: 'en' },
    ]);
    await expect(getPackGiftTrials()).resolves.toEqual([]);
  });

  it('models two-device reconciliation by pruning the claimed unbound voucher and retaining the other grant', async () => {
    await setRandomPackGiftTrial48h('en', 'device-A', 1_800_100_000_000, 'device-A', 'league_chest');
    await setRandomPackGiftTrial48h('en', 'device-B', 1_800_100_000_000, 'device-B', 'league_chest');

    await reconcilePackGiftTrials([
      { voucherId: 'device-A', occurrenceId: 'device-A', expiresAt: 1_800_100_000_000, source: 'league_chest' },
    ], [
      { packId: 'official_prep_in_en', packType: 'official', studyTarget: 'en' },
    ]);

    await expect(getPackGiftTrials()).resolves.toEqual([
      expect.objectContaining({ voucherId: 'device-A' }),
    ]);
  });

  it('prefers the matching recovery receipt over a newer unbound voucher', async () => {
    const recovery = await setRandomPackGiftTrial48h('en', 'old-grant', 1_800_000_010_000);
    await bindPackGiftVoucherSelection(recovery!.localVoucherId, {
      packId: 'official_prep_in_en', packType: 'official', studyTarget: 'en', confirmedAt: 1_800_000_001_000,
    });
    await setRandomPackGiftTrial48h('fr', 'new-grant', 1_800_200_000_000);
    (Date.now as jest.Mock).mockReturnValue(1_800_000_020_000);

    await expect(getPackGiftTrial('en', {
      packId: 'official_prep_in_en', packType: 'official', studyTarget: 'en',
    })).resolves.toMatchObject({ localVoucherId: recovery!.localVoucherId });
  });

  it('keeps persistent vouchers and once markers with stable UID across A to B to A', async () => {
    const firstA = await setPackGiftTrial48hOnce(
      'en', 'shared-occurrence', 1_800_100_000_000, 'grant-a', 'shared-occurrence', 'level_gift',
    );
    expect(firstA).not.toBeNull();

    beginAccountGeneration('account-b');
    await expect(getPackGiftTrials()).resolves.toEqual([]);
    const firstB = await setPackGiftTrial48hOnce(
      'en', 'shared-occurrence', 1_800_100_000_000, 'grant-b', 'shared-occurrence', 'level_gift',
    );
    expect(firstB?.voucherId).toBe('grant-b');

    beginAccountGeneration('account-a');
    await expect(getPackGiftTrials()).resolves.toEqual([
      expect.objectContaining({ voucherId: 'grant-a', localVoucherId: firstA!.localVoucherId }),
    ]);
    const persistentKeys = [...data.keys()].filter((key) => key.includes('flashcard_pack_'));
    expect(persistentKeys).toEqual(expect.arrayContaining([
      expect.stringContaining('uid:account-a'),
      expect.stringContaining('uid:account-b'),
    ]));
    expect(persistentKeys.every((key) => !key.includes('generation:'))).toBe(true);
  });

  it('migrates global inventory only into the currently active UID and can recover after a clean wipe', async () => {
    data.set('flashcard_pack_gift_inventory_v2', JSON.stringify([{
      localVoucherId: 'server_legacy-a', packId: 'legacy-pack', voucherId: 'legacy-a', expiresAt: 1_800_100_000_000,
    }]));

    await expect(getPackGiftTrials()).resolves.toEqual([expect.objectContaining({ voucherId: 'legacy-a' })]);
    beginAccountGeneration('account-b');
    await expect(getPackGiftTrials()).resolves.toEqual([]);

    data.clear();
    beginAccountGeneration('account-a');
    await expect(getPackGiftTrials()).resolves.toEqual([]);
    await reconcilePackGiftTrials([{
      voucherId: 'server-restored', occurrenceId: 'restore-a', expiresAt: 1_800_200_000_000, source: 'level_gift',
    }]);
    await expect(getPackGiftTrials()).resolves.toEqual([expect.objectContaining({ voucherId: 'server-restored' })]);
  });
});
