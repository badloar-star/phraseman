import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Flashcard {
  id: string;
  en: string;
  ru: string;
  uk: string;
  source: 'lesson' | 'word' | 'verb' | 'dialog';
  sourceId?: string;
  addedAt: number;
}

export const FLASHCARDS_KEY = 'flashcards_v1';

export const loadFlashcards = async (): Promise<Flashcard[]> => {
  try {
    const raw = await AsyncStorage.getItem(FLASHCARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveFlashcards = async (cards: Flashcard[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(FLASHCARDS_KEY, JSON.stringify(cards));
  } catch {
    // silently fail
  }
};

export const addFlashcard = async (
  card: Omit<Flashcard, 'id' | 'addedAt'>,
): Promise<boolean> => {
  const cards = await loadFlashcards();
  const normalizedEn = card.en.trim().toLowerCase();
  const duplicate = cards.some(c => c.en.trim().toLowerCase() === normalizedEn);
  if (duplicate) return false;

  const id = `${card.source}_${normalizedEn.replace(/\s+/g, '_').slice(0, 40)}_${Date.now()}`;
  const newCard: Flashcard = { ...card, id, addedAt: Date.now() };
  await saveFlashcards([...cards, newCard]);
  return true;
};

export const removeFlashcard = async (id: string): Promise<void> => {
  const cards = await loadFlashcards();
  await saveFlashcards(cards.filter(c => c.id !== id));
};

export const isFlashcardSaved = async (en: string): Promise<boolean> => {
  const cards = await loadFlashcards();
  const normalizedEn = en.trim().toLowerCase();
  return cards.some(c => c.en.trim().toLowerCase() === normalizedEn);
};

export const clearAllFlashcards = async (): Promise<void> => {
  await AsyncStorage.removeItem(FLASHCARDS_KEY);
};
