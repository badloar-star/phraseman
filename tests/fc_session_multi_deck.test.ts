/**
 * Cards 2.1 §6 — «Тренировка: несколько наборов сразу».
 *
 * Поведенческая часть (объединение/дедуп/перемешивание) покрыта в
 * fc_deck_sources.test.ts. Здесь — то, что экраны сессий действительно
 * подключены к мультиколоде:
 *  - блиц читает ?deck= как СПИСОК (parseDeckParams) и грузит объединённый пул
 *    (loadDeckCardsMulti), а не одну колоду;
 *  - блиц собирает дефолт «сохранённые + свои» тем же загрузчиком;
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

const BLITZ = src('app/flashcards_blitz_session.tsx');

describe('блиц: несколько наборов (§6)', () => {
  it('список наборов + объединённый пул одним загрузчиком', () => {
    expect(BLITZ).toMatch(/parseDeckParams\(/);
    expect(BLITZ).toMatch(/loadDeckCardsMulti\(refs, contentLang\)/);
    expect(BLITZ).not.toMatch(/parseDeckParam\(/);
    expect(BLITZ).not.toMatch(/\bloadDeckCards\(/);
  });

  /**
   * FIX владельца (2026-08-13): «карточки из наборов должны считаться».
   * Дефолт «сохранённые + свои» был багом — у человека с карточками ТОЛЬКО в
   * наборах пул оказывался пустым и блиц не запускался. Контракт обновлён:
   * без `?deck=` берём ВСЕ доступные источники (`loadAllFcDeckRefs`), включая
   * каждый добавленный набор.
   */
  it('дефолт без ?deck= — ВСЕ доступные источники, включая наборы', () => {
    expect(BLITZ).toMatch(/loadAllFcDeckRefs\(\)/);
    expect(BLITZ).toMatch(/deckRefs\.length > 0 \? deckRefs : allRefs/);
  });

  it('пустой/устаревший выбор наборов не показывает тупик, а добирает пул', () => {
    expect(BLITZ).toMatch(/canStartBlitz\(cards\.length\)/);
    expect(BLITZ).toMatch(/loadDeckCardsMulti\(allRefs, contentLang\)/);
  });

  it('экрана с текстом «нужно N карточек» больше нет', () => {
    expect(BLITZ).not.toMatch(/потрібно|нужно минимум|necesita al menos/i);
    expect(BLITZ).not.toMatch(/BLITZ_MIN_CARDS\}/);
  });
});

describe('звёздной механики раздела в сессиях нет (§3)', () => {
  it('не возвращает её в блиц', () => {
    expect(BLITZ).not.toMatch(/stars_system|stars_config|awardSessionStars|recordDeckBest/);
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
