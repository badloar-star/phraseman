/* eslint-disable @typescript-eslint/no-require-imports -- resetModules needs fresh module-scoped staging state */
type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function loadHarness() {
  jest.resetModules();
  jest.doMock('../app/community_packs/communityFirestore', () => ({
    fetchCommunityPackCards: jest.fn(),
  }));
  jest.doMock('../app/community_packs/localAuthorPacks', () => ({
    isLocalAuthorPackId: jest.fn((id: string) => id.startsWith('local_pack_')),
    loadLocalAuthorPacks: jest.fn(async () => []),
    localAuthorPackCardItems: jest.fn(() => []),
  }));

  const firestore = require('../app/community_packs/communityFirestore') as {
    fetchCommunityPackCards: jest.Mock;
  };
  const local = require('../app/community_packs/localAuthorPacks') as {
    loadLocalAuthorPacks: jest.Mock;
    localAuthorPackCardItems: jest.Mock;
  };
  const staging = require('../app/community_packs/staging') as typeof import('../app/community_packs/staging');
  return { firestore, local, staging };
}

const card = {
  id: 'card-1', en: 'hello', ru: 'привет', uk: 'привіт', es: 'hola',
  categoryId: 'custom', isSystem: false, sourceId: 'DEV:pack-1',
} as any;

const pack = {
  id: 'pack-1', codeName: 'Pack', titleRu: 'Набор', titleUk: 'Набір', titleEs: 'Pack',
  descriptionRu: '', descriptionUk: '', descriptionEs: '', category: 'slang', cardCount: 1,
  priceShards: 0, salesCount: 0, authorName: '', isOfficial: false, isCommunityUgc: true,
  updatedAt: '2026-08-21T00:00:00.000Z',
} as any;

describe('community pack navigation staging', () => {
  test('cold cloud pack exposes a complete card + metadata snapshot only after fetch resolves', async () => {
    const { firestore, staging } = loadHarness();
    const request = deferred<any[]>();
    firestore.fetchCommunityPackCards.mockReturnValue(request.promise);

    const ready = staging.stageCommunityPackCardsForNavigation(pack.id, 'en', pack);
    expect(staging.peekStagedCommunityPackMeta(pack.id)).toBe(pack);
    expect(staging.getStagedNavigationPackId()).toBe(pack.id);

    request.resolve([card]);
    await expect(ready).resolves.toEqual([card]);
    expect(staging.consumeStagedCommunityPackMarketCards(pack.id, 'en')).toEqual([card]);
  });

  test('local authored packs are read from device storage without Firestore', async () => {
    const { firestore, local, staging } = loadHarness();
    const localPack = { id: 'local_pack_1' };
    local.loadLocalAuthorPacks.mockResolvedValue([localPack]);
    local.localAuthorPackCardItems.mockReturnValue([card]);

    await expect(
      staging.stageCommunityPackCardsForNavigation(localPack.id, 'en', { ...pack, id: localPack.id }),
    ).resolves.toEqual([card]);
    expect(firestore.fetchCommunityPackCards).not.toHaveBeenCalled();
  });

  test('failed preload clears the staged navigation grant', async () => {
    const { firestore, staging } = loadHarness();
    firestore.fetchCommunityPackCards.mockResolvedValue([]);

    await expect(staging.stageCommunityPackCardsForNavigation(pack.id, 'en', pack)).resolves.toEqual([]);
    expect(staging.getStagedNavigationPackId()).toBeNull();
    expect(staging.peekStagedCommunityPackMeta(pack.id)).toBeNull();
  });

  test('memoized cards never cross study-target boundaries', async () => {
    const { firestore, staging } = loadHarness();
    const english = { ...card, en: 'hello' };
    const french = { ...card, en: 'bonjour' };
    firestore.fetchCommunityPackCards
      .mockResolvedValueOnce([english])
      .mockResolvedValueOnce([french]);

    await staging.stageCommunityPackCardsForNavigation(pack.id, 'en', pack);
    await expect(staging.stageCommunityPackCardsForNavigation(pack.id, 'fr', pack)).resolves.toEqual([french]);
    expect(firestore.fetchCommunityPackCards).toHaveBeenCalledTimes(2);
    expect(staging.peekStagedCommunityPackCards(pack.id, 'en')).toEqual([english]);
    expect(staging.peekStagedCommunityPackCards(pack.id, 'fr')).toEqual([french]);
  });
});
