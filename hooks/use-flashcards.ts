import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerifiedPremiumStatus } from '../app/premium_guard';

export interface Flashcard {
  id: string;
  en: string;
  ru: string;
  uk: string;
  es?: string;
  transcription?: string;
  source: 'lesson' | 'word' | 'verb' | 'dialog' | 'daily_phrase';
  sourceId?: string;
  addedAt: number;
  // Rich detail fields — populated when saving from enriched sources (daily phrase, marketplace packs)
  literalRu?: string;
  literalUk?: string;
  literalEs?: string;
  explanationRu?: string;
  explanationUk?: string;
  explanationEs?: string;
  exampleEn?: string;
  exampleRu?: string;
  exampleUk?: string;
  exampleEs?: string;
  usageNoteRu?: string;
  usageNoteUk?: string;
  usageNoteEs?: string;
  register?: string;
  level?: string;
}

export const FLASHCARDS_KEY = 'flashcards_v1';

/** In-memory list after first read or any save — avoids 50× AsyncStorage on vocabulary screen. */
let cardsInMemory: Flashcard[] | null = null;
let loadInFlight: Promise<Flashcard[]> | null = null;

/** All read-modify-write must run one at a time, or rapid taps drop cards (last save overwrote previous). */
let writeQueue: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(() => fn());
  writeQueue = result.finally(() => {});
  return result;
}

function parseStored(raw: string | null): Flashcard[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c: Flashcard) => ({ ...c }));
  } catch {
    return [];
  }
}

function normalizeEn(en: string) {
  return en.trim().toLowerCase();
}

function hasEnInCards(en: string, cards: Flashcard[]) {
  const n = normalizeEn(en);
  return cards.some(c => normalizeEn(c.en) === n);
}

export const loadFlashcards = async (): Promise<Flashcard[]> => {
  if (cardsInMemory !== null) {
    return cardsInMemory.map(c => ({ ...c }));
  }
  if (!loadInFlight) {
    loadInFlight = (async () => {
      try {
        const raw = await AsyncStorage.getItem(FLASHCARDS_KEY);
        cardsInMemory = parseStored(raw);
        return cardsInMemory;
      } catch {
        cardsInMemory = [];
        return cardsInMemory;
      } finally {
        loadInFlight = null;
      }
    })();
  }
  const base = await loadInFlight;
  return base.map(c => ({ ...c }));
};

async function persistFlashcards(cards: Flashcard[]): Promise<void> {
  const snapshot = cards.map(c => ({ ...c }));
  cardsInMemory = snapshot;
  try {
    await AsyncStorage.setItem(FLASHCARDS_KEY, JSON.stringify(snapshot));
  } catch {
    // silently fail
  }
}

export const saveFlashcards = async (cards: Flashcard[]): Promise<void> => {
  return withWriteLock(() => persistFlashcards(cards));
};

export const FREE_FLASHCARD_LIMIT = 20;

export type AddFlashcardResult = 'added' | 'duplicate' | 'limit_reached';

export const addFlashcard = async (
  card: Omit<Flashcard, 'id' | 'addedAt'>,
): Promise<AddFlashcardResult> => {
  return withWriteLock(async () => {
    const cards = await loadFlashcards();
    const normalizedEn = card.en.trim().toLowerCase();
    const duplicate = cards.some(c => c.en.trim().toLowerCase() === normalizedEn);
    if (duplicate) return 'duplicate';

    const isPremium = await getVerifiedPremiumStatus();
    if (!isPremium && cards.length >= FREE_FLASHCARD_LIMIT) return 'limit_reached';

    const id = `${card.source}_${normalizedEn.replace(/\s+/g, '_').slice(0, 40)}_${Date.now()}`;
    const newCard: Flashcard = { ...card, id, addedAt: Date.now() };
    await persistFlashcards([...cards, newCard]);
    return 'added';
  });
};

export const removeFlashcard = async (id: string): Promise<void> => {
  return withWriteLock(async () => {
    const cards = await loadFlashcards();
    await persistFlashcards(cards.filter(c => c.id !== id));
  });
};

export const removeFlashcardByEnglish = async (en: string): Promise<boolean> => {
  return withWriteLock(async () => {
    const cards = await loadFlashcards();
    const normalizedEn = en.trim().toLowerCase();
    const card = cards.find(c => c.en.trim().toLowerCase() === normalizedEn);
    if (!card) return false;
    await persistFlashcards(cards.filter(c => c.id !== card.id));
    return true;
  });
};

/** Sync — only correct after the cache is loaded. Before load, returns false. */
export const isEnSavedInCacheSync = (en: string): boolean => {
  if (cardsInMemory === null) return false;
  return hasEnInCards(en, cardsInMemory);
};

export const isFlashcardSaved = async (en: string): Promise<boolean> => {
  if (cardsInMemory !== null) {
    return hasEnInCards(en, cardsInMemory);
  }
  const cards = await loadFlashcards();
  return hasEnInCards(en, cards);
};

export const clearAllFlashcards = async (): Promise<void> => {
  return withWriteLock(async () => {
    cardsInMemory = [];
    try {
      await AsyncStorage.removeItem(FLASHCARDS_KEY);
    } catch {
      // fail-soft
    }
  });
};
