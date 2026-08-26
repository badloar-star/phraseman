import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSpinCustomAvatarGiftWeight,
  loadSpinCustomAvatarGiftCandidates,
  listSpinCustomAvatarGiftCandidates,
  SPIN_CUSTOM_AVATAR_GIFT_POOL,
} from '../app/spin_avatar_gift_pool';
import { exhaustedSpinRewardIdsForCandidates, loadThemeGiftCandidates } from '../app/theme_gift_pool';

jest.mock('@react-native-async-storage/async-storage');

describe('Level Spin all-custom-avatar gift pool', () => {
  beforeEach(() => jest.clearAllMocks());

  test('contains exactly custom-gen-01 through custom-gen-125 and no legacy custom ids', () => {
    expect(SPIN_CUSTOM_AVATAR_GIFT_POOL.map(({ id }) => id)).toEqual(
      Array.from({ length: 125 }, (_, index) => `custom-gen-${String(index + 1).padStart(2, '0')}`),
    );
    expect(SPIN_CUSTOM_AVATAR_GIFT_POOL.some(({ id }) => /^custom-\d/.test(id))).toBe(false);
  });

  test('excludes owned avatars without mutating the source pool', () => {
    const candidates = listSpinCustomAvatarGiftCandidates({
      'custom-gen-01': 'default:black',
      'custom-gen-125': 'default:white',
    });
    expect(candidates).toHaveLength(123);
    expect(candidates.map(({ id }) => id)).not.toContain('custom-gen-01');
    expect(candidates.map(({ id }) => id)).not.toContain('custom-gen-125');
    expect(SPIN_CUSTOM_AVATAR_GIFT_POOL).toHaveLength(125);
  });

  test('removes the avatar prize before the roll only after all 125 are owned', () => {
    const allOwned = Object.fromEntries(
      SPIN_CUSTOM_AVATAR_GIFT_POOL.map(({ id }) => [id, 'default:black']),
    );
    expect(listSpinCustomAvatarGiftCandidates(allOwned)).toEqual([]);
    expect(exhaustedSpinRewardIdsForCandidates(
      ['theme-midnight'], { status: 'available', candidates: [] },
    )).toEqual(['cosmetic_avatar_common']);
    expect(exhaustedSpinRewardIdsForCandidates(
      [], { status: 'available', candidates: SPIN_CUSTOM_AVATAR_GIFT_POOL },
    )).toEqual(['cosmetic_theme']);
    expect(exhaustedSpinRewardIdsForCandidates([], { status: 'available', candidates: [] })).toEqual([
      'cosmetic_theme',
      'cosmetic_avatar_common',
    ]);
  });

  test('malformed ownership fails closed for avatar without hiding an available theme', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('{malformed');
    const avatarPool = await loadSpinCustomAvatarGiftCandidates();
    expect(avatarPool).toEqual({ status: 'unavailable', reason: 'malformed' });
    expect(exhaustedSpinRewardIdsForCandidates(['theme-midnight'], avatarPool))
      .toEqual(['cosmetic_avatar_common']);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('ownership read rejection fails closed for avatar without hiding an available theme', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));
    const avatarPool = await loadSpinCustomAvatarGiftCandidates();
    expect(avatarPool).toEqual({ status: 'unavailable', reason: 'read_failed' });
    expect(exhaustedSpinRewardIdsForCandidates(['theme-midnight'], avatarPool))
      .toEqual(['cosmetic_avatar_common']);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test.each(['{bad', '{}', '["unknown-theme"]'])
  ('malformed theme ownership excludes new theme rolls without overwriting evidence: %s', async (ownedRaw) => {
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['owned_theme_modes_v1', ownedRaw],
      ['grandfathered_theme_modes_v1', null],
    ]);
    await expect(loadThemeGiftCandidates()).resolves.toEqual({ status: 'unavailable', reason: 'malformed' });
    expect(exhaustedSpinRewardIdsForCandidates(null, { status: 'available', candidates: SPIN_CUSTOM_AVATAR_GIFT_POOL }))
      .toEqual(['cosmetic_theme']);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('transient theme ownership read failure excludes the new roll and remains retryable', async () => {
    (AsyncStorage.multiGet as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(loadThemeGiftCandidates()).resolves.toEqual({ status: 'unavailable', reason: 'read_failed' });
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test.each([
    '{"custom-gen-01":false}',
    '{"custom-gen-01":null}',
    '{"custom-gen-01":[]}',
    '{"custom-gen-01":""}',
    '{"":"default:black"}',
    '[]',
  ])('schema-invalid ownership fails closed without writes: %s', async (raw) => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(raw);
    const avatarPool = await loadSpinCustomAvatarGiftCandidates();
    expect(avatarPool).toEqual({ status: 'unavailable', reason: 'malformed' });
    expect(exhaustedSpinRewardIdsForCandidates(['theme-midnight'], avatarPool))
      .toEqual(['cosmetic_avatar_common']);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('valid encoded ownership stays available and excludes the owned generated avatar', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({
      'custom-gen-01': 'default:black',
      'custom-77': 'legacy-gradient:white',
    }));
    const avatarPool = await loadSpinCustomAvatarGiftCandidates();
    expect(avatarPool.status).toBe('available');
    if (avatarPool.status !== 'available') throw new Error('expected available avatar pool');
    expect(avatarPool.candidates).toHaveLength(124);
    expect(avatarPool.candidates.map(({ id }) => id)).not.toContain('custom-gen-01');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('keeps expensive and old gift-only avatars possible but noticeably rarer', () => {
    expect(getSpinCustomAvatarGiftWeight({ id: 'custom-gen-01', price: 90 })).toBe(100);
    expect(getSpinCustomAvatarGiftWeight({ id: 'custom-gen-31', price: 90 })).toBe(35);
    expect(getSpinCustomAvatarGiftWeight({ id: 'custom-gen-103', price: 300 })).toBe(35);
    expect(getSpinCustomAvatarGiftWeight({ id: 'custom-gen-113', price: 500 })).toBe(15);
    expect(getSpinCustomAvatarGiftWeight({ id: 'custom-gen-123', price: 1000 })).toBe(5);
  });
});
