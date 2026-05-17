jest.mock('../app/config', () => {
  const actual = jest.requireActual('../app/config') as Record<string, unknown>;
  return {
    ...actual,
    ENABLE_DEV_STUDY_TARGET_LANG: true,
  };
});

import { flashcardContentLang } from '../app/spanish_content_gate';
import { HEISENBERG_BATCH_SOURCE_LOCALES } from '../app/source_locales';
import { resolveFlashcardBackText, type CardItem } from '../app/flashcards/types';
import { SYSTEM_CARDS } from '../app/flashcards/system-cards';

describe('flashcardContentLang', () => {
  it('uses es column for Spanish UI while study target remains English', () => {
    expect(flashcardContentLang('es', 'en')).toBe('es');
  });

  it('uses uk when UI is Ukrainian and studying English', () => {
    expect(flashcardContentLang('uk', 'en')).toBe('uk');
  });

  it('uses ru when UI is Russian and studying English', () => {
    expect(flashcardContentLang('ru', 'en')).toBe('ru');
  });

  it('uses es when UI is Spanish and studying Spanish (dev)', () => {
    expect(flashcardContentLang('es', 'es')).toBe('es');
  });

  it('uses ru/uk when studying Spanish but not Spanish UI', () => {
    expect(flashcardContentLang('ru', 'es')).toBe('ru');
    expect(flashcardContentLang('uk', 'es')).toBe('uk');
  });

  it('resolves Spanish card backs from es first and falls back safely', () => {
    const card: CardItem = {
      id: 'card_1',
      en: 'I am ready',
      ru: 'Я готов',
      uk: 'Я готовий',
      es: 'Estoy listo',
      categoryId: 'custom',
      isSystem: false,
    };

    expect(resolveFlashcardBackText(card, flashcardContentLang('es', 'en'))).toBe('Estoy listo');

    const missingEs = { ...card, es: '' };
    expect(resolveFlashcardBackText(missingEs, flashcardContentLang('es', 'en'))).toBe('Я готов');
  });

  it('has an isolated sourceLocales slot for future flashcard interface languages', () => {
    const card: CardItem = {
      id: 'card_2',
      en: 'I am ready',
      ru: 'Я готов',
      uk: 'Я готовий',
      es: 'Estoy listo',
      sourceLocales: {
        'pt-BR': 'Estou pronto',
        vi: 'Tôi đã sẵn sàng',
        id: 'Saya siap',
        tr: 'Hazırım',
        pl: 'Jestem gotowy',
      },
      categoryId: 'custom',
      isSystem: false,
    };

    expect(resolveFlashcardBackText(card, 'pt-BR')).toBe('Estou pronto');
    expect(resolveFlashcardBackText(card, 'vi')).toBe('Tôi đã sẵn sàng');
    expect(resolveFlashcardBackText(card, 'id')).toBe('Saya siap');
    expect(resolveFlashcardBackText(card, 'tr')).toBe('Hazırım');
    expect(resolveFlashcardBackText(card, 'pl')).toBe('Jestem gotowy');
  });

  it('keeps every predefined system flashcard covered for Spanish UI', () => {
    const missingEs = SYSTEM_CARDS.filter((card) => !card.es?.trim()).map((card) => card.id);
    const missingSourceEs = SYSTEM_CARDS.filter((card) => !card.sourceLocales?.es?.trim()).map((card) => card.id);
    const cyrillicEs = SYSTEM_CARDS
      .filter((card) => /[\u0400-\u04FF]/.test(`${card.es ?? ''}${card.sourceLocales?.es ?? ''}`))
      .map((card) => card.id);

    expect(missingEs).toEqual([]);
    expect(missingSourceEs).toEqual([]);
    expect(cyrillicEs).toEqual([]);
  });

  it('covers locked predefined system flashcard categories for every Heisenberg batch source locale', () => {
    const lockedCards = SYSTEM_CARDS.filter((card) =>
      ['emotions', 'fillers', 'reactions', 'traps', 'phrasal', 'situations', 'connectors'].includes(
        card.categoryId,
      ),
    );
    const missing = lockedCards.flatMap((card) =>
      HEISENBERG_BATCH_SOURCE_LOCALES
        .filter((locale) => !card.sourceLocales?.[locale]?.trim())
        .map((locale) => `${card.id}:${locale}`),
    );
    const cyrillic = lockedCards.flatMap((card) =>
      HEISENBERG_BATCH_SOURCE_LOCALES
        .filter((locale) => /[\u0400-\u04FF]/.test(card.sourceLocales?.[locale] ?? ''))
        .map((locale) => `${card.id}:${locale}`),
    );

    expect(lockedCards).toHaveLength(155);
    expect(missing).toEqual([]);
    expect(cyrillic).toEqual([]);
  });
});
