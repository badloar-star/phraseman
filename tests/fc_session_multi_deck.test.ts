/**
 * Cards 2.1 §6 — «Тренировка: несколько наборов сразу».
 *
 * Поведенческая часть (объединение/дедуп/перемешивание) покрыта в
 * fc_deck_sources.test.ts. Здесь — то, что экраны сессий действительно
 * подключены к мультиколоде:
 *  - words-сессия и блиц читают ?deck= как СПИСОК (parseDeckParams) и грузят
 *    объединённый пул (loadDeckCardsMulti), а не одну колоду;
 *  - words-сессия пишет ошибку с источником КОНКРЕТНОЙ карточки (DeckCard.source),
 *    иначе при «saved + pack» ошибка из пака уехала бы в чужую очередь повторения;
 *  - блиц собирает дефолт «сохранённые + свои» тем же загрузчиком;
 *  - режим БЕЗ ?deck= в words-сессии остаётся обычной due-очередью тренера;
 *  - удалённой звёздной механики раздела (§3) в сессиях нет.
 */
import { readFileSync } from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveFlashcards } from '../hooks/use-flashcards';
import { __resetCustomCardsStoreForTests, upsertCustomCard } from '../app/flashcards/custom_cards_store';
import {
  loadDeckCardsMulti,
  parseDeckParams,
  mistakeSourceForDecks,
} from '../app/flashcards/deck_sources';

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

const src = (rel: string) => readFileSync(path.join(__dirname, '..', rel), 'utf8');

const WORDS = src('app/trainer_words_session.tsx');
const BLITZ = src('app/flashcards_blitz_session.tsx');

describe('words-сессия: мультиколода (§6)', () => {
  it('параметр ?deck= читается как список, пул грузится объединённым', () => {
    expect(WORDS).toMatch(/parseDeckParams\(/);
    expect(WORDS).toMatch(/loadDeckCardsMulti\(deckRefs, cardContentLang\)/);
    // Старое одиночное API больше не используется
    expect(WORDS).not.toMatch(/parseDeckParam\(/);
    expect(WORDS).not.toMatch(/\bloadDeckCards\(/);
  });

  it('лишнего перемешивания нет — только срез по размеру сессии', () => {
    expect(WORDS).toMatch(/pool\.slice\(0, sessionSize\)/);
    expect(WORDS).not.toMatch(/shuffleArr/);
  });

  it('ошибка пишется с источником конкретной карточки', () => {
    expect(WORDS).toMatch(/c\.source \?\? fallbackSource/);
    expect(WORDS).toMatch(/mistakeSourceForDecks\(/);
    expect(WORDS).not.toMatch(/mistakeSourceForDeck\(/);
  });

  it('без ?deck= сессия остаётся обычной due-очередью тренера', () => {
    // Пустой список колод -> ветка getDueItems + markTrainerResult (SRS тренера)
    expect(parseDeckParams(undefined)).toEqual([]);
    expect(WORDS).toMatch(/deckRefs\.length === 0/);
    expect(WORDS).toMatch(/deckRefs\.length > 0/);
    expect(WORDS).toMatch(/getDueItems\('words', /);
    expect(WORDS).toMatch(/markTrainerResult\(card\.item\.key, 'words', answeredCorrectly/);
  });
});

describe('блиц: мультиколода (§6)', () => {
  it('список колод + объединённый пул одним загрузчиком', () => {
    expect(BLITZ).toMatch(/parseDeckParams\(/);
    expect(BLITZ).toMatch(/loadDeckCardsMulti\(refs, contentLang\)/);
    expect(BLITZ).not.toMatch(/parseDeckParam\(/);
    expect(BLITZ).not.toMatch(/\bloadDeckCards\(/);
  });

  it("дефолт без ?deck= — 'сохранённые + свои' через тот же загрузчик", () => {
    expect(BLITZ).toMatch(/\[\{ kind: 'saved' \}, \{ kind: 'custom' \}\]/);
  });
});

describe('звёздной механики раздела в сессиях нет (§3)', () => {
  it.each([
    ['app/trainer_words_session.tsx', WORDS],
    ['app/flashcards_blitz_session.tsx', BLITZ],
  ])('%s', (_file, code) => {
    expect(code).not.toMatch(/stars_system|stars_config|awardSessionStars|recordDeckBest/);
  });
});

describe('объединение колод сессии: состав пула', () => {
  it('пул мультиколоды даёт карточки обеих колод с их источниками', async () => {
    (AsyncStorage as unknown as { __reset?: () => void }).__reset?.();
    __resetCustomCardsStoreForTests();
    await saveFlashcards([
      { id: 's1', en: 'sun', ru: 'солнце', uk: 'сонце', source: 'lesson', addedAt: 1 },
    ]);
    await upsertCustomCard({ id: 'c1', en: 'moon', ru: 'луна', uk: 'місяць', categoryId: 'custom', isSystem: false });

    const refs = parseDeckParams('saved,custom');
    expect(refs).toHaveLength(2);

    const pool = await loadDeckCardsMulti(refs, 'ru');
    expect(pool.map((c) => c.id).sort()).toEqual(['c1', 's1']);
    // Смесь saved+custom -> общий фолбэк 'custom', на карточках он же
    expect(mistakeSourceForDecks(refs)).toBe('custom');
    expect(pool.every((c) => c.source === 'custom')).toBe(true);

    // Срез по размеру сессии не требует дополнительного перемешивания
    expect(pool.slice(0, 1)).toHaveLength(1);
  });
});
