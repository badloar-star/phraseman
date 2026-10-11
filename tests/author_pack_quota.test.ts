/**
 * Счётчик своих наборов и флаг лимита Free (координатор 11.10, Карточки 2.0): экран «Новый набор» проверяет 3/3
 * на входе, без Firestore. Плюс уровень набора, выбранный автором, переживает сохранение и пересохранение.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  authorPackQuotaFor,
  FREE_AUTHOR_PACK_LIMIT_ERROR,
  loadAuthorPackQuota,
  loadLocalAuthorPacks,
  peekAuthorPackCount,
  saveLocalAuthorPack,
} from '../app/community_packs/localAuthorPacks';
import type { CommunityPackSubmissionPayload } from '../app/community_packs/schema';

jest.mock('../app/account_scope_key', () => ({
  accountScopeKey: () => 'test-user',
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ stableId: 'test-user', generation: 1 }),
  isCurrentAccountGeneration: () => true,
  isAccountOperationCurrent: () => true,
  withAccountTransitionLock: async (fn: () => unknown) => fn(),
  withRestoreApplicationLock: async (fn: () => unknown) => fn(),
  beginInitialAccountGeneration: () => {},
  invalidateAccountGeneration: () => {},
  subscribeAccountGeneration: () => ({ remove: () => {} }),
}));

const payload = (title: string, extra: Partial<CommunityPackSubmissionPayload> = {}): CommunityPackSubmissionPayload => ({
  title,
  description: `описание ${title}`,
  cards: [{ id: 'c1', en: 'en c1', ru: 'ru c1', uk: 'uk c1' }],
  ...extra,
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('лимит своих наборов', () => {
  it('чистая функция: Free 3 — предел, Plus без лимита', () => {
    expect(authorPackQuotaFor(2, false)).toEqual({ count: 2, limit: 3, limitReached: false });
    expect(authorPackQuotaFor(3, false)).toEqual({ count: 3, limit: 3, limitReached: true });
    expect(authorPackQuotaFor(7, true)).toEqual({ count: 7, limit: null, limitReached: false });
  });

  it('счётчик с устройства, флаг на 3/3, четвёртый у Free отклоняется кодом ошибки', async () => {
    for (const title of ['A', 'B', 'C']) await saveLocalAuthorPack(payload(title));
    expect(peekAuthorPackCount()).toBe(3);
    expect(await loadAuthorPackQuota(false)).toEqual({ count: 3, limit: 3, limitReached: true });
    expect(await loadAuthorPackQuota(true)).toMatchObject({ count: 3, limitReached: false });
    await expect(saveLocalAuthorPack(payload('D'))).rejects.toThrow(FREE_AUTHOR_PACK_LIMIT_ERROR);
    await expect(saveLocalAuthorPack(payload('D'), { isPremium: true })).resolves.toEqual(expect.any(String));
  });

  it('уровень набора сохраняется и не стирается пересохранением без уровня', async () => {
    const id = await saveLocalAuthorPack(payload('L', { level: 'A2' }));
    expect((await loadLocalAuthorPacks()).find((p) => p.id === id)?.level).toBe('A2');
    await saveLocalAuthorPack(payload('L'), { packId: id });
    expect((await loadLocalAuthorPacks()).find((p) => p.id === id)?.level).toBe('A2');
  });
});
