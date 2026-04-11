/**
 * tests/unit/use-flashcards.test.ts
 * Unit tests for hooks/use-flashcards.ts — CRUD operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadFlashcards,
  saveFlashcards,
  addFlashcard,
  removeFlashcard,
  isFlashcardSaved,
  clearAllFlashcards,
  FREE_FLASHCARD_LIMIT,
  FLASHCARDS_KEY,
  Flashcard,
} from '../../hooks/use-flashcards';

jest.mock('@react-native-async-storage/async-storage');

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const makeCard = (en: string, overrides: Partial<Omit<Flashcard, 'id' | 'addedAt'>> = {}): Omit<Flashcard, 'id' | 'addedAt'> => ({
  en,
  ru: `рус_${en}`,
  uk: `укр_${en}`,
  source: 'lesson',
  ...overrides,
});

const makeFullCard = (en: string): Flashcard => ({
  id: `lesson_${en}_123`,
  en,
  ru: `рус_${en}`,
  uk: `укр_${en}`,
  source: 'lesson',
  addedAt: Date.now(),
});

describe('use-flashcards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── loadFlashcards ─────────────────────────────────────────────────────────

  describe('loadFlashcards', () => {
    it('returns empty array when storage is empty', async () => {
      mockStorage.getItem.mockResolvedValue(null);
      const cards = await loadFlashcards();
      expect(cards).toEqual([]);
    });

    it('returns parsed cards from storage', async () => {
      const saved = [makeFullCard('go out'), makeFullCard('pick up')];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(saved));
      const cards = await loadFlashcards();
      expect(cards).toHaveLength(2);
      expect(cards[0].en).toBe('go out');
    });

    it('returns empty array when stored value is not an array', async () => {
      mockStorage.getItem.mockResolvedValue(JSON.stringify({ en: 'go' }));
      const cards = await loadFlashcards();
      expect(cards).toEqual([]);
    });

    it('returns empty array on parse error', async () => {
      mockStorage.getItem.mockResolvedValue('invalid json{{{');
      const cards = await loadFlashcards();
      expect(cards).toEqual([]);
    });

    it('migrates old cards without uk field using ru as fallback', async () => {
      const oldCard = { id: 'x', en: 'go out', ru: 'выходить', source: 'lesson', addedAt: 1 } as any;
      mockStorage.getItem.mockResolvedValue(JSON.stringify([oldCard]));
      const cards = await loadFlashcards();
      expect(cards[0].uk).toBe('выходить');
    });
  });

  // ── saveFlashcards ────────────────────────────────────────────────────────

  describe('saveFlashcards', () => {
    it('saves cards array to AsyncStorage', async () => {
      mockStorage.setItem.mockResolvedValue(undefined);
      const cards = [makeFullCard('go out')];
      await saveFlashcards(cards);
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        FLASHCARDS_KEY,
        JSON.stringify(cards)
      );
    });

    it('silently handles storage errors', async () => {
      mockStorage.setItem.mockRejectedValue(new Error('Storage full'));
      await expect(saveFlashcards([makeFullCard('go out')])).resolves.not.toThrow();
    });
  });

  // ── addFlashcard ──────────────────────────────────────────────────────────

  describe('addFlashcard', () => {
    beforeEach(() => {
      // No premium, no tester flags by default
      mockStorage.getItem.mockResolvedValue(null);
    });

    it('adds a new card and returns "added"', async () => {
      // loadFlashcards → null (empty), then premium_active, tester_no_premium, tester_no_limits
      mockStorage.getItem
        .mockResolvedValueOnce(null)    // FLASHCARDS_KEY
        .mockResolvedValueOnce(null)    // premium_active
        .mockResolvedValueOnce(null)    // tester_no_premium
        .mockResolvedValueOnce(null);   // tester_no_limits
      mockStorage.setItem.mockResolvedValue(undefined);

      const result = await addFlashcard(makeCard('go out'));
      expect(result).toBe('added');
    });

    it('returns "duplicate" when card with same en already exists', async () => {
      const existing = [makeFullCard('go out')];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));

      const result = await addFlashcard(makeCard('go out'));
      expect(result).toBe('duplicate');
    });

    it('duplicate detection is case-insensitive', async () => {
      const existing = [makeFullCard('Go Out')];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));

      const result = await addFlashcard(makeCard('go out'));
      expect(result).toBe('duplicate');
    });

    it('returns "limit_reached" for free user at 20 cards', async () => {
      const cards: Flashcard[] = Array.from({ length: FREE_FLASHCARD_LIMIT }, (_, i) =>
        makeFullCard(`phrase ${i}`)
      );
      mockStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(cards))  // FLASHCARDS_KEY
        .mockResolvedValueOnce(null)                   // premium_active
        .mockResolvedValueOnce(null)                   // tester_no_premium
        .mockResolvedValueOnce(null);                  // tester_no_limits

      const result = await addFlashcard(makeCard('new phrase'));
      expect(result).toBe('limit_reached');
    });

    it('premium user can exceed 20 cards limit', async () => {
      const cards: Flashcard[] = Array.from({ length: FREE_FLASHCARD_LIMIT }, (_, i) =>
        makeFullCard(`phrase ${i}`)
      );
      mockStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(cards))  // FLASHCARDS_KEY
        .mockResolvedValueOnce('true')                 // premium_active
        .mockResolvedValueOnce(null)                   // tester_no_premium
        .mockResolvedValueOnce(null);                  // tester_no_limits
      mockStorage.setItem.mockResolvedValue(undefined);

      const result = await addFlashcard(makeCard('phrase beyond limit'));
      expect(result).toBe('added');
    });

    it('tester_no_premium forces free tier even if premium_active=true', async () => {
      const cards: Flashcard[] = Array.from({ length: FREE_FLASHCARD_LIMIT }, (_, i) =>
        makeFullCard(`phrase ${i}`)
      );
      mockStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(cards))  // FLASHCARDS_KEY
        .mockResolvedValueOnce('true')                 // premium_active
        .mockResolvedValueOnce('true')                 // tester_no_premium
        .mockResolvedValueOnce(null);                  // tester_no_limits

      const result = await addFlashcard(makeCard('phrase beyond limit'));
      expect(result).toBe('limit_reached');
    });
  });

  // ── removeFlashcard ───────────────────────────────────────────────────────

  describe('removeFlashcard', () => {
    it('removes card by id', async () => {
      const cards = [makeFullCard('go out'), makeFullCard('pick up')];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(cards));
      mockStorage.setItem.mockResolvedValue(undefined);

      await removeFlashcard(cards[0].id);

      const saved = JSON.parse(mockStorage.setItem.mock.calls[0][1] as string) as Flashcard[];
      expect(saved).toHaveLength(1);
      expect(saved[0].en).toBe('pick up');
    });

    it('does nothing when id does not exist', async () => {
      const cards = [makeFullCard('go out')];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(cards));
      mockStorage.setItem.mockResolvedValue(undefined);

      await removeFlashcard('nonexistent_id');

      const saved = JSON.parse(mockStorage.setItem.mock.calls[0][1] as string) as Flashcard[];
      expect(saved).toHaveLength(1);
    });
  });

  // ── isFlashcardSaved ──────────────────────────────────────────────────────

  describe('isFlashcardSaved', () => {
    it('returns true when card with matching en exists', async () => {
      const cards = [makeFullCard('go out')];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(cards));
      expect(await isFlashcardSaved('go out')).toBe(true);
    });

    it('returns false when card does not exist', async () => {
      mockStorage.getItem.mockResolvedValue(JSON.stringify([]));
      expect(await isFlashcardSaved('go out')).toBe(false);
    });

    it('is case-insensitive', async () => {
      const cards = [makeFullCard('Go Out')];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(cards));
      expect(await isFlashcardSaved('go out')).toBe(true);
    });

    it('returns false for empty storage', async () => {
      mockStorage.getItem.mockResolvedValue(null);
      expect(await isFlashcardSaved('anything')).toBe(false);
    });
  });

  // ── clearAllFlashcards ────────────────────────────────────────────────────

  describe('clearAllFlashcards', () => {
    it('calls AsyncStorage.removeItem with the correct key', async () => {
      mockStorage.removeItem.mockResolvedValue(undefined);
      await clearAllFlashcards();
      expect(mockStorage.removeItem).toHaveBeenCalledWith(FLASHCARDS_KEY);
    });
  });
});
