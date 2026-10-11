// зачем (Сверка 11.10, [HUB-TOPCARD] language=null, enLen=64 → заглушка «Boarding pass»): быстрая проверка
// сохранённых берёт тот же запасной язык, что и полная загрузка; заглушка — только при пустом кэше.
let mockStoredLanguage: string | null = null;
let mockEn: Array<{ id: string; en: string; packLanguage?: string }> | null = null;
let mockFr: Array<{ id: string; en: string; packLanguage?: string }> | null = null;

jest.mock('../hooks/use-flashcards', () => ({
  loadAllSavedFlashcards: jest.fn(async () => []),
  peekFlashcardsCache: (target: string) => (target === 'fr' ? mockFr : mockEn),
}));
jest.mock('../app/flashcards/pack_language_preferences', () => ({
  getStoredPackLanguage: jest.fn(async () => null),
  peekStoredPackLanguage: () => mockStoredLanguage,
}));

/* eslint-disable import/first */
import {
  peekFirstSavedCardAnyLanguage,
  peekSelectedSavedContour,
  peekSelectedSavedContourDiagnostics,
} from '../app/flashcards/saved_language_contour';

const cards = (n: number, packLanguage?: string) =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i}`, en: `word${i}`, ...(packLanguage ? { packLanguage } : {}) }));

beforeEach(() => {
  mockStoredLanguage = null;
  mockEn = null;
  mockFr = null;
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('peekSelectedSavedContour', () => {
  test('язык не прочитан, 64 карточки в кэше → карточки по языку изучения, а не null', () => {
    mockEn = cards(64);
    const result = peekSelectedSavedContour('en');
    expect(result).toHaveLength(64);
    expect(result?.[0]?.en).toBe('word0');
    expect(peekSelectedSavedContourDiagnostics()).toMatchObject({ result: 'ok', languageSource: 'study_target', language: 'en', enLen: 64 });
  });

  test('без аргумента — английский по умолчанию', () => {
    mockEn = cards(3);
    expect(peekSelectedSavedContour()).toHaveLength(3);
    expect(peekSelectedSavedContourDiagnostics()).toMatchObject({ languageSource: 'default_en' });
  });

  test('сохранённый язык набора главнее запасного', () => {
    mockStoredLanguage = 'fr';
    mockEn = cards(2);
    mockFr = cards(1, 'fr');
    expect(peekSelectedSavedContour('en')).toHaveLength(1);
    expect(peekSelectedSavedContourDiagnostics()).toMatchObject({ languageSource: 'stored_peek', language: 'fr' });
  });

  test('кэша нет совсем → null и no_cache (только тогда заглушка)', () => {
    expect(peekSelectedSavedContour('en')).toBeNull();
    expect(peekSelectedSavedContourDiagnostics()).toMatchObject({ result: 'no_cache' });
    expect(peekFirstSavedCardAnyLanguage()).toBeNull();
  });

  test('в выбранном языке пусто, но кэш есть → первая сохранённая карточка для обложки', () => {
    mockStoredLanguage = 'fr';
    mockEn = cards(5);
    expect(peekSelectedSavedContour('en')).toEqual([]);
    expect(peekSelectedSavedContourDiagnostics()).toMatchObject({ result: 'empty_after_filter' });
    expect(peekFirstSavedCardAnyLanguage()?.en).toBe('word0');
  });
});
