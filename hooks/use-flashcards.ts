import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerifiedPremiumStatus } from '../app/premium_guard';
import { isFeatureFreeForEveryone } from '../app/feature_gates';
import {
  flashcardsSavedKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from '../app/target_storage_keys';
import type { StudyTarget } from '../app/study_target';

export interface Flashcard {
  id: string;
  en: string;
  ru: string;
  uk: string;
  es?: string;
  sourceLocales?: Record<string, string | undefined>;
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
  studyTarget?: StudyTarget;
}

export const FLASHCARDS_KEY = 'flashcards_v1';

/** In-memory list after first read or any save — avoids 50× AsyncStorage on vocabulary screen. */
let cardsInMemoryByTarget: Partial<Record<StudyTarget, Flashcard[]>> = {};
let loadInFlightByTarget: Partial<Record<StudyTarget, Promise<Flashcard[]>>> = {};

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

const SAVED_FLASHCARD_CONTENT_REPAIRS: Record<string, Partial<Pick<Flashcard, 'ru' | 'uk' | 'es'>>> = {
  shower: {
    ru: 'Душ',
    uk: 'Душ',
    es: 'ducha',
  },
  'they cleaned their room last sunday': {
    ru: 'Они убрали свою комнату в прошлое воскресенье',
    uk: 'Вони прибрали свою кімнату минулої неділі',
    es: 'Limpiaron su habitación el domingo pasado.',
  },
  'we cleaned up rooms yesterday': {
    ru: 'Мы убрали комнаты вчера',
    uk: 'Ми прибрали кімнати вчора',
    es: 'Ayer limpiamos las habitaciones.',
  },
};

export function repairSavedFlashcardContent(card: Flashcard): Flashcard {
  const repair = SAVED_FLASHCARD_CONTENT_REPAIRS[normalizeEn(card.en)];
  if (!repair) return card;
  return {
    ...card,
    ru: repair.ru ?? card.ru,
    uk: repair.uk ?? card.uk,
    es: repair.es ?? card.es,
  };
}

export const loadFlashcards = async (studyTarget?: RuntimeStudyTarget): Promise<Flashcard[]> => {
  const target = cacheTarget(studyTarget);
  const cached = cardsInMemoryByTarget[target];
  if (cached !== undefined) {
    return cached.map(c => ({ ...repairSavedFlashcardContent(c) }));
  }
  if (!loadInFlightByTarget[target]) {
    loadInFlightByTarget[target] = (async () => {
      try {
        const raw = await AsyncStorage.getItem(flashcardsSavedKey(target));
        const parsed = parseStored(raw);
        let dirty = false;
        const repaired = parsed.map(card => {
          const fixed = repairSavedFlashcardContent(card);
          if (fixed !== card) dirty = true;
          return fixed;
        });
        cardsInMemoryByTarget[target] = repaired;
        if (dirty) {
          await AsyncStorage.setItem(flashcardsSavedKey(target), JSON.stringify(repaired));
        }
        return cardsInMemoryByTarget[target] ?? [];
      } catch {
        cardsInMemoryByTarget[target] = [];
        return cardsInMemoryByTarget[target] ?? [];
      } finally {
        delete loadInFlightByTarget[target];
      }
    })();
  }
  const base = await loadInFlightByTarget[target]!;
  return base.map(c => ({ ...repairSavedFlashcardContent(c) }));
};

export const peekFlashcardsCache = (studyTarget?: RuntimeStudyTarget): Flashcard[] | null => {
  const target = cacheTarget(studyTarget);
  const cached = cardsInMemoryByTarget[target];
  if (cached === undefined) return null;
  return cached.map(c => ({ ...repairSavedFlashcardContent(c) }));
};

async function persistFlashcards(cards: Flashcard[], studyTarget?: RuntimeStudyTarget): Promise<void> {
  const target = cacheTarget(studyTarget);
  const snapshot = cards.map(c => ({ ...c }));
  cardsInMemoryByTarget[target] = snapshot;
  try {
    await AsyncStorage.setItem(flashcardsSavedKey(target), JSON.stringify(snapshot));
  } catch {
    // silently fail
  }
}

export const saveFlashcards = async (
  cards: Flashcard[],
  studyTarget?: RuntimeStudyTarget,
): Promise<void> => {
  return withWriteLock(() => persistFlashcards(cards, studyTarget));
};

export const FREE_FLASHCARD_LIMIT = 20;

export type AddFlashcardResult = 'added' | 'duplicate' | 'limit_reached';

function cacheTarget(studyTarget?: RuntimeStudyTarget): StudyTarget {
  return storageStudyTarget(studyTarget);
}

export const addFlashcard = async (
  card: Omit<Flashcard, 'id' | 'addedAt'>,
  studyTarget?: RuntimeStudyTarget,
): Promise<AddFlashcardResult> => {
  return withWriteLock(async () => {
    const target = cacheTarget(studyTarget);
    const cards = await loadFlashcards(target);
    const normalizedEn = card.en.trim().toLowerCase();
    const duplicate = cards.some(c => c.en.trim().toLowerCase() === normalizedEn);
    if (duplicate) return 'duplicate';

    // «Пульт»: если карточки переведены в «Фри» — лимит снят, замок не показываем.
    const isPremium = await getVerifiedPremiumStatus();
    if (!isPremium && !isFeatureFreeForEveryone('flashcards') && cards.length >= FREE_FLASHCARD_LIMIT) {
      return 'limit_reached';
    }

    const id = `${card.source}_${normalizedEn.replace(/\s+/g, '_').slice(0, 40)}_${Date.now()}`;
    const newCard: Flashcard = { ...card, id, addedAt: Date.now(), studyTarget: target };
    await persistFlashcards([...cards, newCard], target);
    return 'added';
  });
};

export const removeFlashcard = async (id: string, studyTarget?: RuntimeStudyTarget): Promise<void> => {
  return withWriteLock(async () => {
    const target = cacheTarget(studyTarget);
    const cards = await loadFlashcards(target);
    await persistFlashcards(cards.filter(c => c.id !== id), target);
  });
};

export const removeFlashcardByEnglish = async (
  en: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> => {
  return withWriteLock(async () => {
    const target = cacheTarget(studyTarget);
    const cards = await loadFlashcards(target);
    const normalizedEn = en.trim().toLowerCase();
    const card = cards.find(c => c.en.trim().toLowerCase() === normalizedEn);
    if (!card) return false;
    await persistFlashcards(cards.filter(c => c.id !== card.id), target);
    return true;
  });
};

/** Sync — only correct after the cache is loaded. Before load, returns false. */
export const isEnSavedInCacheSync = (en: string, studyTarget?: RuntimeStudyTarget): boolean => {
  const target = cacheTarget(studyTarget);
  const cached = cardsInMemoryByTarget[target];
  if (cached === undefined) return false;
  return hasEnInCards(en, cached);
};

export const isFlashcardSaved = async (
  en: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> => {
  const target = cacheTarget(studyTarget);
  const cached = cardsInMemoryByTarget[target];
  if (cached !== undefined) {
    return hasEnInCards(en, cached);
  }
  const cards = await loadFlashcards(target);
  return hasEnInCards(en, cards);
};

export const clearAllFlashcards = async (studyTarget?: RuntimeStudyTarget): Promise<void> => {
  return withWriteLock(async () => {
    const target = cacheTarget(studyTarget);
    cardsInMemoryByTarget[target] = [];
    try {
      await AsyncStorage.removeItem(flashcardsSavedKey(target));
    } catch {
      // fail-soft
    }
  });
};
