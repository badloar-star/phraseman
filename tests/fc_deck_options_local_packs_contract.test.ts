/**
 * Сторож: СВОИ наборы (созданные в редакторе карточек) обязаны быть в списке
 * наборов для тренировки.
 *
 * Жалоба пользователя 2026-09-21 (Premium, 32 дня в приложении, стрик 15):
 * «В "Карточках" я создала себе набор, но не вижу его в выборе наборов, когда
 * выхожу в "Начать тренировку" и выбираю способ тренировки».
 *
 * Причина была в `deck_options.loadFcDeckOptions`: список наборов собирался из
 * ДВУХ источников — купленные (`loadAccessiblePackIds`) и добавленные из каталога
 * (`loadCommunityOwnedPackIds`). Свои наборы живут в ТРЕТЬЕМ хранилище
 * (`community_local_author_packs_v1`) и не попадали в список НИКОГДА — при том что
 * загрузчик их карточек давно написан и работает (`deck_sources` умеет
 * `local_pack_*`). Механизм был цел, его просто не звали.
 *
 * Тот же пропуск сидел в `loadAllFcDeckRefs` — источниках пула Блица без явного
 * выбора набора: у человека с карточками ТОЛЬКО в своём наборе Блиц не стартовал.
 *
 * Почему сторож нужен. Три других экрана (коллекция, «Мои наборы», каталог)
 * склеивают те же три источника КАЖДЫЙ своим кодом — общего помощника нет,
 * поэтому четвёртое место отстало и дожило до жалобы. Ни один существующий тест
 * этот класс не ловил: `fc_deck_options.test.ts` вообще не создаёт локальных
 * наборов.
 *
 * Сломался этот тест — возвращать свои наборы в список, а не удалять проверку.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveLocalAuthorPack } from '../app/community_packs/localAuthorPacks';
import { addCommunityOwnedPackId } from '../app/community_packs/communityOwnedStorage';
import {
  __resetDeckOptionsWarmCacheForTests,
  loadAllFcDeckRefs,
  loadFcDeckOptions,
} from '../app/flashcards/deck_options';
import type { CommunityPackSubmissionPayload } from '../app/community_packs/schema';

/** Хранилище карточек скоуплено по аккаунту — мокаем как в `fc_deck_options.test.ts`. */
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
  // зачем (04.10): каталог сообщества при загрузке подписывается на смену поколения аккаунта (очистка памяти авторских наборов), заглушке нужна подписка
  subscribeAccountGeneration: () => ({ remove: () => undefined }),
}));

/** Каталог сообщества в этом стороже не нужен: свой набор обязан жить без сети. */
jest.mock('../app/community_packs/communityFirestore', () => ({
  fetchCommunityPackCards: jest.fn(async () => []),
  loadPublishedCommunityMarketPacks: jest.fn(async () => []),
  peekPublishedCommunityMarketPacks: jest.fn(() => []),
  peekVideoMarketPacks: jest.fn(() => []),
  communityPackCardsToCardItems: jest.requireActual(
    '../app/community_packs/communityFirestore',
  ).communityPackCardsToCardItems,
}));

const packPayload = (title: string, cardIds: readonly string[]): CommunityPackSubmissionPayload => ({
  title,
  description: `описание ${title}`,
  publishToCommunity: false,
  cards: cardIds.map((id) => ({ id, en: `en ${id}`, ru: `ru ${id}`, uk: `uk ${id}` })),
});

beforeEach(async () => {
  await AsyncStorage.clear();
  // Тёплый снимок списка наборов живёт в памяти модуля и переживает clear():
  // без сброса следующий тест получает список предыдущего (окно пересборки 3 с).
  __resetDeckOptionsWarmCacheForTests();
});

describe('свой набор в списке наборов для тренировки', () => {
  it('набор, сохранённый в редакторе, виден в выборе наборов — с названием и счётчиком', async () => {
    const packId = await saveLocalAuthorPack(packPayload('Мой набор', ['a1', 'a2', 'a3']));

    const decks = await loadFcDeckOptions('trainer', 'ru');
    const mine = decks.find((d) => d.deckId === `pack:${packId}`);

    expect(mine).toBeDefined();
    expect(mine?.title).toBe('Мой набор');
    expect(mine?.count).toBe(3);
    expect(mine?.sourceKind).toBe('pack');
  });

  it('свой набор входит в источники Блица (пул без явного выбора набора)', async () => {
    const packId = await saveLocalAuthorPack(packPayload('Набор для блица', ['b1', 'b2']));

    const refs = await loadAllFcDeckRefs();

    expect(refs).toContainEqual({ kind: 'pack', packId });
  });

  it('опубликованный свой набор показан ОДНОЙ строкой, а не двумя', async () => {
    /**
     * Локальная копия НЕ удаляется после публикации — она получает `cloudPackId`.
     * Облачный близнец приходит вторым путём (добавлен себе / подарен), и без
     * дедупликации один набор занял бы две строки. Побеждает локальная копия:
     * в ней свежие правки автора, ещё не прошедшие модерацию.
     */
    const cloudId = 'CLOUD_TWIN_ID';
    const packId = await saveLocalAuthorPack(packPayload('Опубликованный', ['p1', 'p2']));
    const { updateLocalPackPublication } = await import('../app/community_packs/localAuthorPacks');
    await updateLocalPackPublication(packId, {
      cloudPackId: cloudId,
      publicationState: 'submitted',
      publicationKey: `${packId}_key`,
      isPublic: true,
    });
    await addCommunityOwnedPackId(cloudId, undefined, {
      titleRu: 'Опубликованный', titleUk: '', titleEs: '',
    });

    const decks = await loadFcDeckOptions('trainer', 'ru');
    const packRows = decks.filter((d) => d.sourceKind === 'pack');

    expect(packRows).toHaveLength(1);
    expect(packRows[0]?.deckId).toBe(`pack:${packId}`);

    const refs = await loadAllFcDeckRefs();
    expect(refs).toContainEqual({ kind: 'pack', packId });
    expect(refs).not.toContainEqual({ kind: 'pack', packId: cloudId });
  });

  it('набор чужой цели изучения не протекает в список', async () => {
    /**
     * `loadLocalAuthorPacks` читает ОБЕ цели (en + fr) и склеивает их. Без фильтра
     * французский режим показывал бы английские наборы — класс бага 2026-09-05.
     */
    const frPackId = await saveLocalAuthorPack(
      { ...packPayload('Французский набор', ['f1', 'f2']), studyTarget: 'fr' },
      { studyTarget: 'fr' },
    );

    const enDecks = await loadFcDeckOptions('trainer', 'ru', 'en');
    expect(enDecks.some((d) => d.deckId === `pack:${frPackId}`)).toBe(false);

    const enRefs = await loadAllFcDeckRefs('en');
    expect(enRefs).not.toContainEqual({ kind: 'pack', packId: frPackId });

    const frDecks = await loadFcDeckOptions('trainer', 'ru', 'fr');
    expect(frDecks.some((d) => d.deckId === `pack:${frPackId}`)).toBe(true);
  });
});
