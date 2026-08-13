/**
 * cards-2.1 (§6 SPEC_2_1): список колод для шита мультивыбора (`deck_options`).
 *
 * Регрессия: после переработки навигации (§4/§5) плитки режимов с хаба исчезли,
 * и вместе с ними — единственное место, где собирался список колод. Шит
 * `DeckPickerSheet` остался в репозитории, но его больше никто не открывал:
 * мультивыбор наборов был недостижим из UI. Эти тесты держат сборку списка.
 */
import { saveFlashcards, type Flashcard } from '../hooks/use-flashcards';
import { __resetCustomCardsStoreForTests, upsertCustomCard } from '../app/flashcards/custom_cards_store';
import { loadFcDeckOptions } from '../app/flashcards/deck_options';
import type { CardItem } from '../app/flashcards/types';

/**
 * В этом проекте хранилище карточек скоуплено по аккаунту (`account_generation` /
 * `account_scope_key`) — без активного скоупа `loadFlashcards` честно отдаёт [].
 * Мокаем так же, как в `fc_deck_sources.test.ts`.
 */
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
}));

const savedCard = (id: string): Flashcard => ({
  id,
  en: `en ${id}`,
  ru: `ru ${id}`,
  uk: `uk ${id}`,
  source: 'lesson',
  addedAt: 1,
});

const customCard = (id: string): CardItem => ({
  id,
  en: `en ${id}`,
  ru: `ru ${id}`,
  uk: `uk ${id}`,
  categoryId: 'custom',
  isSystem: false,
});

describe('loadFcDeckOptions', () => {
  beforeEach(async () => {
    __resetCustomCardsStoreForTests();
    await saveFlashcards([savedCard('s1'), savedCard('s2'), savedCard('s3')]);
    await upsertCustomCard(customCard('c1'));
    await upsertCustomCard(customCard('c2'));
  });

  it('у тренера есть псевдо-колода «Слабые», у слушания и блица — нет', async () => {
    const trainer = await loadFcDeckOptions('trainer', 'ru');
    const listening = await loadFcDeckOptions('listening', 'ru');
    const blitz = await loadFcDeckOptions('blitz', 'ru');

    expect(trainer.map((d) => d.deckId)).toContain('weak');
    expect(listening.map((d) => d.deckId)).not.toContain('weak');
    expect(blitz.map((d) => d.deckId)).not.toContain('weak');
  });

  it('сохранённые и свои карточки попадают в список со счётчиком и id', async () => {
    const decks = await loadFcDeckOptions('listening', 'ru');
    const saved = decks.find((d) => d.deckId === 'saved');
    const custom = decks.find((d) => d.deckId === 'custom');

    expect(saved?.count).toBe(3);
    expect(saved?.cardIds).toEqual(['s1', 's2', 's3']);
    expect(custom?.count).toBe(2);
    /** cardIds нужны счётчику «Выбрано N · M карточек» для дедупликации (§6). */
    expect(custom?.cardIds).toHaveLength(2);
  });

  it('колоды не дублируются и переживают пустое хранилище', async () => {
    await saveFlashcards([]);
    __resetCustomCardsStoreForTests();
    const decks = await loadFcDeckOptions('trainer', 'ru');
    const ids = decks.map((d) => d.deckId);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['saved', 'custom']));
    expect(decks.find((d) => d.deckId === 'saved')?.count).toBe(0);
  });
});
