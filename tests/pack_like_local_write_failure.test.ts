// зачем (аудит Optimistic UI, координатор 15.10, дыра №5): сбой записи лайка на диск раньше молча возвращал true (writeIds глотал ошибку) — сердце на экране оставалось, а лайка не было.
// Теперь setCommunityPackLikedLocally бросает, а toggleCommunityPackLike пробрасывает ошибку: CommunityPackSocialBar в catch откатывает сердце и цифру и показывает тост. Лог [PACK-LIKE].
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/community_packs/packSocialFirestore', () => ({
  setCommunityPackLikeRemote: jest.fn(async () => ({ changed: true, delta: 1 })),
  registerCommunityPackAddRemote: jest.fn(async () => ({ changed: true, delta: 1 })),
}));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'stable-user-1'),
}));

import { toggleCommunityPackLike } from '../app/community_packs/communityPackActions';
import { loadLikedCommunityPackIds, setCommunityPackLikedLocally } from '../app/community_packs/packSocialStorage';
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';

const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

describe('лайк набора: сбой локальной записи не глотается', () => {
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    storage.__reset?.();
    __resetAccountGenerationForTests();
    beginAccountGeneration('stable-user-1');
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('успешная запись: true, лайк виден', async () => {
    await expect(setCommunityPackLikedLocally('p1', true)).resolves.toBe(true);
    await expect(loadLikedCommunityPackIds()).resolves.toEqual(['p1']);
  });

  it('сбой диска: бросает pack_like_local_write_failed и пишет [PACK-LIKE]', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await expect(setCommunityPackLikedLocally('p1', true)).rejects.toThrow('pack_like_local_write_failed');
    expect(warnSpy.mock.calls.some((c) => String(c[0]).includes('[PACK-LIKE] p1: локальная запись лайка не удалась liked=true'))).toBe(true);
    await expect(loadLikedCommunityPackIds()).resolves.toEqual([]);
  });

  it('toggleCommunityPackLike пробрасывает ошибку наружу (экран откатит), сервер не зовётся', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    const { setCommunityPackLikeRemote } = jest.requireMock('../app/community_packs/packSocialFirestore') as { setCommunityPackLikeRemote: jest.Mock };
    setCommunityPackLikeRemote.mockClear();
    await expect(toggleCommunityPackLike('p2')).rejects.toThrow('pack_like_local_write_failed');
    expect(setCommunityPackLikeRemote).not.toHaveBeenCalled();
  });
});
