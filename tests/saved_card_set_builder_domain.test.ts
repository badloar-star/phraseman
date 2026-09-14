import { buildSourceLabel } from '../app/flashcards/source_labels';
import { filterCardsByPackLanguage } from '../app/flashcards/pack_languages';
import {
  canCreatePackFromSelection,
  clearSelectionForLanguageChange,
  remainingCardsToMinimum,
  stageSelectedCardIds,
  toggleSelectedCardId,
} from '../app/flashcards/saved_card_selection';

describe('saved card set builder domain', () => {
  it('maps a lesson source to a human label without exposing a technical id', () => {
    const label = buildSourceLabel({ source: 'lesson', sourceId: '12' }, 'ru');

    expect(label).toBe('Источник: Урок 12');
    expect(label).not.toContain('DEV:');
  });

  it('uses a video title and hides the raw video id', () => {
    const label = buildSourceLabel({
      source: 'video',
      sourceId: 'yt-123',
      sourceTitle: 'Airport English',
    }, 'ru');

    expect(label).toBe('Источник: Видео · Airport English');
    expect(label).not.toContain('yt-123');
  });

  it.each([
    ['daily_phrase', 'Источник: Фраза дня'],
    ['community', 'Источник: Набор сообщества'],
    ['video_phrase', 'Источник: Видео'],
    ['word', 'Источник: Слова'],
    ['verb', 'Источник: Глаголы'],
    ['dialog', 'Источник: Диалоги'],
    ['unknown', 'Источник: Другое'],
  ])('maps %s to a safe fallback', (source, expected) => {
    expect(buildSourceLabel({ source, sourceId: 'DEV:internal' }, 'ru')).toBe(expected);
  });

  it('toggles ids idempotently and never duplicates a selected card', () => {
    expect(toggleSelectedCardId([], 'card-1')).toEqual(['card-1']);
    expect(toggleSelectedCardId(['card-1'], 'card-1')).toEqual([]);
    expect(toggleSelectedCardId(['card-1', 'card-1'], 'card-2')).toEqual(['card-1', 'card-2']);
  });

  it('enforces the 10–50 create window and reports the remaining minimum', () => {
    expect(canCreatePackFromSelection([])).toBe(false);
    expect(canCreatePackFromSelection(Array.from({ length: 9 }, (_, i) => `c-${i}`))).toBe(false);
    expect(canCreatePackFromSelection(Array.from({ length: 10 }, (_, i) => `c-${i}`))).toBe(true);
    expect(canCreatePackFromSelection(Array.from({ length: 50 }, (_, i) => `c-${i}`))).toBe(true);
    expect(canCreatePackFromSelection(Array.from({ length: 51 }, (_, i) => `c-${i}`))).toBe(false);
    expect(remainingCardsToMinimum(Array.from({ length: 7 }, (_, i) => `c-${i}`))).toBe(3);
    expect(remainingCardsToMinimum(Array.from({ length: 10 }, (_, i) => `c-${i}`))).toBe(0);
  });

  it('stages stable ids only and clears selection when language changes', () => {
    const selected = ['card-2', 'card-1', 'card-2'];

    expect(stageSelectedCardIds(selected)).toEqual(['card-2', 'card-1']);
    expect(clearSelectionForLanguageChange(selected, 'en', 'fr')).toEqual([]);
    expect(clearSelectionForLanguageChange(selected, 'en', 'en')).toEqual(selected);
  });

  it('keeps saved cards in independent language contours', () => {
    const cards = [
      { id: 'en-1', packLanguage: 'en' },
      { id: 'fr-1', packLanguage: 'fr' },
      { id: 'legacy-en' },
    ];

    expect(filterCardsByPackLanguage(cards, 'fr')).toEqual([{ id: 'fr-1', packLanguage: 'fr' }]);
    expect(filterCardsByPackLanguage(cards, 'en')).toEqual([
      { id: 'en-1', packLanguage: 'en' },
      { id: 'legacy-en' },
    ]);
  });
});
