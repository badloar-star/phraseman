/**
 * PM-108-A3: свой набор НЕ становится публичным по умолчанию.
 *
 * До правки `saveLocalAuthorPack` писал `isPublic: publishToCommunity !== false`,
 * то есть набор без явного флага (undefined) считался публичным и получал
 * publicationState 'pending'. Публичность — только по явному `true`.
 * Сломался тест — возвращать «приватно по умолчанию», а не ослаблять проверку.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadLocalAuthorPacks, saveLocalAuthorPack } from '../app/community_packs/localAuthorPacks';
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
  // зачем (10.10): community_packs чистит кэш авторских наборов при смене аккаунта — модуль подписывается при загрузке.
  subscribeAccountGeneration: () => ({ remove: () => {} }),
}));

const payload = (title: string, publish?: boolean): CommunityPackSubmissionPayload => ({
  title,
  description: `описание ${title}`,
  ...(publish === undefined ? {} : { publishToCommunity: publish }),
  cards: [{ id: 'c1', en: 'en c1', ru: 'ru c1', uk: 'uk c1' }],
});

const find = async (id: string) => (await loadLocalAuthorPacks()).find((p) => p.id === id);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('свой набор приватный по умолчанию (PM-108-A3)', () => {
  it('без флага публикации набор приватный', async () => {
    const id = await saveLocalAuthorPack(payload('Без флага'));
    expect(await find(id)).toMatchObject({ isPublic: false, publicationState: 'private' });
  });

  it('явный false — приватный, явный true — заявка на публикацию', async () => {
    const privateId = await saveLocalAuthorPack(payload('Приватный', false));
    expect(await find(privateId)).toMatchObject({ isPublic: false, publicationState: 'private' });
    const publicId = await saveLocalAuthorPack(payload('Публичный', true));
    expect(await find(publicId)).toMatchObject({ isPublic: true, publicationState: 'pending' });
  });

  it('пересохранение без флага не меняет уже выбранную публичность', async () => {
    const id = await saveLocalAuthorPack(payload('Был публичным', true));
    await saveLocalAuthorPack(payload('Был публичным'), { packId: id });
    expect(await find(id)).toMatchObject({ isPublic: true, publicationState: 'pending' });

    const privId = await saveLocalAuthorPack(payload('Был приватным', false));
    await saveLocalAuthorPack(payload('Был приватным'), { packId: privId });
    expect(await find(privId)).toMatchObject({ isPublic: false, publicationState: 'private' });
  });
});
