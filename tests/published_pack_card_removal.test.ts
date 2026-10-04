const storage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => storage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { storage.set(key, value); }),
  },
}));
jest.mock('../app/account_generation', () => ({ captureAccountGeneration: () => ({ generation: 1, stableId: 'author_1' }) }));
const invalidateCommunityPackCatalog = jest.fn();
jest.mock('../app/community_packs/communityFirestore', () => ({ invalidateCommunityPackCatalog: () => invalidateCommunityPackCatalog() }));
const callCommunityAuthorRemoveCard = jest.fn();
jest.mock('../app/community_packs/functionsClient', () => ({
  callCommunityAuthorRemoveCard: (data: unknown) => callCommunityAuthorRemoveCard(data),
}));
const saveLocalAuthorPack = jest.fn(async () => 'local_pack_1');
jest.mock('../app/community_packs/localAuthorPacks', () => ({
  loadLocalAuthorPacks: jest.fn(async () => [{
    v: 1, id: 'local_pack_1', title: 't', description: '', cardThemeKey: '', cloudPackId: 'cloud_1',
    cards: Array.from({ length: 12 }, (_, i) => ({ id: `c${i + 1}`, en: `w${i + 1}` })), createdAt: 1, updatedAt: 1,
  }]),
  saveLocalAuthorPack: (...args: unknown[]) => saveLocalAuthorPack(...(args as [])),
}));

import {
  PUBLISHED_PACK_CARD_REMOVE_OUTBOX_KEY,
  flushPublishedPackCardRemovals,
  schedulePublishedPackCardRemoval,
  type PublishedPackCardRemovalOutcome,
} from '../app/community_packs/publishedPackCardRemoval';

const outbox = () => JSON.parse(storage.get(PUBLISHED_PACK_CARD_REMOVE_OUTBOX_KEY) ?? '[]') as { key: string }[];
const settle = async () => { for (let i = 0; i < 20; i += 1) await Promise.resolve(); };

beforeEach(() => {
  storage.clear();
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('удаление карточки из опубликованного набора: окно «Вернуть» и очередь', () => {
  test('«Вернуть» в окне — в сеть ничего не уходит, очередь пуста', async () => {
    const handle = await schedulePublishedPackCardRemoval({ cloudPackId: 'cloud_1', cardId: 'cloud_1_c3', undoMs: 50 });
    expect(outbox()).toHaveLength(1); // лежит на диске сразу — переживёт закрытие приложения
    expect(await handle.undo()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 80));
    await settle();
    expect(callCommunityAuthorRemoveCard).not.toHaveBeenCalled();
    expect(outbox()).toHaveLength(0);
  });

  test('после окна — ОДИН вызов, локальный набор и каталог обновлены, итог removed', async () => {
    callCommunityAuthorRemoveCard.mockResolvedValue({ ok: true, status: 'removed', cardCount: 11 });
    const outcomes: PublishedPackCardRemovalOutcome[] = [];
    const handle = await schedulePublishedPackCardRemoval({
      cloudPackId: 'cloud_1', cardId: 'cloud_1_c3', undoMs: 20, onSettled: (o) => outcomes.push(o),
    });
    await new Promise((resolve) => setTimeout(resolve, 60));
    await flushPublishedPackCardRemovals();
    await settle();
    expect(callCommunityAuthorRemoveCard).toHaveBeenCalledTimes(1);
    expect(callCommunityAuthorRemoveCard).toHaveBeenCalledWith({ packId: 'cloud_1', cardId: 'cloud_1_c3' });
    expect(saveLocalAuthorPack).toHaveBeenCalledTimes(1);
    const savedPayload = (saveLocalAuthorPack.mock.calls[0] as unknown[])[0] as { cards: { id: string }[] };
    expect(savedPayload.cards.map((card) => card.id)).not.toContain('c3');
    expect(invalidateCommunityPackCatalog).toHaveBeenCalledTimes(1);
    expect(outcomes).toEqual([expect.objectContaining({ kind: 'removed', cardCount: 11 })]);
    expect(await handle.undo()).toBe(false);
    expect(outbox()).toHaveLength(0);
  });

  test('отказ сервера card_count — итог refused с причиной, локальный набор не трогаем', async () => {
    callCommunityAuthorRemoveCard.mockResolvedValue({ ok: false, reason: 'card_count', cardCount: 10 });
    const outcomes: PublishedPackCardRemovalOutcome[] = [];
    await schedulePublishedPackCardRemoval({ cloudPackId: 'cloud_1', cardId: 'c1', undoMs: 10, onSettled: (o) => outcomes.push(o) });
    await new Promise((resolve) => setTimeout(resolve, 40));
    await flushPublishedPackCardRemovals();
    await settle();
    expect(outcomes).toEqual([expect.objectContaining({ kind: 'refused', reason: 'card_count' })]);
    expect(saveLocalAuthorPack).not.toHaveBeenCalled();
    expect(outbox()).toHaveLength(0);
  });

  test('сбой сети — запись остаётся в очереди для повтора при следующем входе', async () => {
    callCommunityAuthorRemoveCard.mockRejectedValue(new Error('unavailable'));
    await schedulePublishedPackCardRemoval({ cloudPackId: 'cloud_1', cardId: 'c2', undoMs: 10 });
    // Отправку запускает сам таймер окна; второй ручной flush здесь дал бы вторую попытку.
    await new Promise((resolve) => setTimeout(resolve, 40));
    await settle();
    expect(outbox()).toEqual([expect.objectContaining({ key: 'cloud_1::c2', attempts: 1 })]);
  });
});
