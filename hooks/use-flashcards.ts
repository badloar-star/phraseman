import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerifiedPremiumStatus } from '../app/premium_guard';
import { isFeatureFreeForEveryone } from '../app/feature_gates';
import {
  flashcardsSavedKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from '../app/target_storage_keys';
import type { StudyTarget } from '../app/study_target';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from '../app/account_generation';
import { accountScopeKey } from '../app/account_scope_key';

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
let cardsInMemoryByScope = new Map<string, Flashcard[]>();
let loadInFlightByScope = new Map<string, {
  promise: Promise<Flashcard[]>;
  accountToken: AccountGenerationToken;
}>();

/** All read-modify-write must run one at a time, or rapid taps drop cards (last save overwrote previous). */
let writeQueueByAccount = new Map<string, {
  tail: Promise<unknown>;
  accountToken: AccountGenerationToken;
}>();
const FLASHCARD_CACHE_MAX_SCOPES = 8;
const FLASHCARD_PENDING_MAX_SCOPES = 8;

function setBoundedCache(key: string, cards: Flashcard[]): void {
  cardsInMemoryByScope.delete(key);
  cardsInMemoryByScope.set(key, cards);
  while (cardsInMemoryByScope.size > FLASHCARD_CACHE_MAX_SCOPES) {
    const oldest = cardsInMemoryByScope.keys().next().value as string | undefined;
    if (!oldest) break;
    cardsInMemoryByScope.delete(oldest);
  }
}

function accountOperationKey(token: AccountGenerationToken): string | null {
  return token.stableId ? accountScopeKey(token) : null;
}

function isAccountOperationCurrent(token: AccountGenerationToken): boolean {
  return isCurrentAccountGeneration(token);
}

function scopedTargetKey(token: AccountGenerationToken, target: StudyTarget): string | null {
  const accountKey = accountOperationKey(token);
  return accountKey ? `${accountKey}|target:${target}` : null;
}

function pruneStalePendingRegistries(): void {
  for (const [key, entry] of loadInFlightByScope) {
    if (!isAccountOperationCurrent(entry.accountToken)) loadInFlightByScope.delete(key);
  }
  for (const [key, entry] of writeQueueByAccount) {
    if (!isAccountOperationCurrent(entry.accountToken)) writeQueueByAccount.delete(key);
  }
}

function withWriteLock<T>(
  token: AccountGenerationToken,
  fn: () => Promise<T>,
  capacityFallback: T,
): Promise<T> {
  const accountKey = accountOperationKey(token);
  if (!accountKey) return Promise.resolve(capacityFallback);
  pruneStalePendingRegistries();
  const existing = writeQueueByAccount.get(accountKey);
  if (!existing && writeQueueByAccount.size >= FLASHCARD_PENDING_MAX_SCOPES) {
    return Promise.resolve(capacityFallback);
  }
  const previous = existing?.tail ?? Promise.resolve();
  const result = previous.then(() => fn());
  const tail = result.finally(() => {
    if (writeQueueByAccount.get(accountKey)?.tail === tail) writeQueueByAccount.delete(accountKey);
  });
  writeQueueByAccount.set(accountKey, { tail, accountToken: token });
  return result;
}

/**
 * Test-only: drop the module-level caches so a fresh AsyncStorage read happens next.
 * The in-memory caches above intentionally persist for the app lifetime; unit tests that
 * swap the AsyncStorage mock between cases must reset them so each case reads its own fixture.
 */
export function __resetFlashcardCacheForTests(): void {
  cardsInMemoryByScope = new Map();
  loadInFlightByScope = new Map();
  writeQueueByAccount = new Map();
}

function parseStored(raw: string | null): Flashcard[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c: Flashcard) => ({ ...c, uk: c.uk || c.ru }));
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
  const normalizedCard = card.uk ? card : { ...card, uk: card.ru };
  const repair = SAVED_FLASHCARD_CONTENT_REPAIRS[normalizeEn(normalizedCard.en)];
  if (!repair) return normalizedCard;
  return {
    ...normalizedCard,
    ru: repair.ru ?? normalizedCard.ru,
    uk: repair.uk ?? normalizedCard.uk,
    es: repair.es ?? normalizedCard.es,
  };
}

async function loadFlashcardsForAccount(
  studyTarget: RuntimeStudyTarget | undefined,
  accountToken: AccountGenerationToken,
): Promise<Flashcard[]> {
  const target = cacheTarget(studyTarget);
  const scopeKey = scopedTargetKey(accountToken, target);
  if (!scopeKey || !isAccountOperationCurrent(accountToken)) return [];
  const cached = cardsInMemoryByScope.get(scopeKey);
  if (cached !== undefined) {
    return cached.map(c => ({ ...repairSavedFlashcardContent(c) }));
  }
  pruneStalePendingRegistries();
  if (!loadInFlightByScope.has(scopeKey)) {
    if (loadInFlightByScope.size >= FLASHCARD_PENDING_MAX_SCOPES) return [];
    const request = (async () => {
      try {
        const raw = await AsyncStorage.getItem(flashcardsSavedKey(target));
        if (!isAccountOperationCurrent(accountToken)) return [];
        const parsed = parseStored(raw);
        let dirty = false;
        const repaired = parsed.map(card => {
          const fixed = repairSavedFlashcardContent(card);
          if (fixed !== card) dirty = true;
          return fixed;
        });
        setBoundedCache(scopeKey, repaired);
        if (dirty) {
          if (!isAccountOperationCurrent(accountToken)) return [];
          const committed = await withAccountTransitionLock(async () => {
            if (!isAccountOperationCurrent(accountToken)) return false;
            await AsyncStorage.setItem(flashcardsSavedKey(target), JSON.stringify(repaired));
            return isAccountOperationCurrent(accountToken);
          });
          if (!committed) return [];
        }
        return cardsInMemoryByScope.get(scopeKey) ?? [];
      } catch {
        if (!isAccountOperationCurrent(accountToken)) return [];
        setBoundedCache(scopeKey, []);
        return [];
      } finally {
        loadInFlightByScope.delete(scopeKey);
      }
    })();
    loadInFlightByScope.set(scopeKey, { promise: request, accountToken });
  }
  const base = await loadInFlightByScope.get(scopeKey)!.promise;
  if (!isAccountOperationCurrent(accountToken)) return [];
  return base.map(c => ({ ...repairSavedFlashcardContent(c) }));
}

export function __getFlashcardPendingRegistrySizesForTests(): { loads: number; writes: number } {
  return { loads: loadInFlightByScope.size, writes: writeQueueByAccount.size };
}

export const loadFlashcards = async (studyTarget?: RuntimeStudyTarget): Promise<Flashcard[]> => {
  return loadFlashcardsForAccount(studyTarget, captureAccountGeneration());
};

export const peekFlashcardsCache = (studyTarget?: RuntimeStudyTarget): Flashcard[] | null => {
  const target = cacheTarget(studyTarget);
  const scopeKey = scopedTargetKey(captureAccountGeneration(), target);
  if (!scopeKey) return null;
  const cached = cardsInMemoryByScope.get(scopeKey);
  if (cached === undefined) return null;
  return cached.map(c => ({ ...repairSavedFlashcardContent(c) }));
};

async function persistFlashcards(
  cards: Flashcard[],
  studyTarget: RuntimeStudyTarget | undefined,
  accountToken: AccountGenerationToken,
): Promise<boolean> {
  const target = cacheTarget(studyTarget);
  const snapshot = cards.map(c => ({ ...c }));
  if (!isAccountOperationCurrent(accountToken)) return false;
  const scopeKey = scopedTargetKey(accountToken, target);
  if (!scopeKey) return false;
  try {
    if (!isAccountOperationCurrent(accountToken)) return false;
    const committed = await withAccountTransitionLock(async () => {
      if (!isAccountOperationCurrent(accountToken)) return false;
      await AsyncStorage.setItem(flashcardsSavedKey(target), JSON.stringify(snapshot));
      return isAccountOperationCurrent(accountToken);
    });
    if (!committed) return false;
    setBoundedCache(scopeKey, snapshot);
    return true;
  } catch {
    return false;
  }
}

export const saveFlashcards = async (
  cards: Flashcard[],
  studyTarget?: RuntimeStudyTarget,
): Promise<void> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return;
  await withWriteLock(accountToken, () => persistFlashcards(cards, studyTarget, accountToken), false);
};

export const FREE_FLASHCARD_LIMIT = 20;

export type AddFlashcardResult = 'added' | 'duplicate' | 'limit_reached' | 'stale';

function cacheTarget(studyTarget?: RuntimeStudyTarget): StudyTarget {
  return storageStudyTarget(studyTarget);
}

export const addFlashcard = async (
  card: Omit<Flashcard, 'id' | 'addedAt'>,
  studyTarget?: RuntimeStudyTarget,
): Promise<AddFlashcardResult> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return 'stale';
  return withWriteLock<AddFlashcardResult>(accountToken, async () => {
    const target = cacheTarget(studyTarget);
    const cards = await loadFlashcardsForAccount(target, accountToken);
    if (!isAccountOperationCurrent(accountToken)) return 'stale';
    const normalizedEn = card.en.trim().toLowerCase();
    const duplicate = cards.some(c => c.en.trim().toLowerCase() === normalizedEn);
    if (duplicate) return 'duplicate';

    // «Пульт»: если карточки переведены в «Фри» — лимит снят, замок не показываем.
    const isPremium = await getVerifiedPremiumStatus();
    if (!isAccountOperationCurrent(accountToken)) return 'stale';
    if (!isPremium && !isFeatureFreeForEveryone('flashcards') && cards.length >= FREE_FLASHCARD_LIMIT) {
      return 'limit_reached';
    }

    const id = `${card.source}_${normalizedEn.replace(/\s+/g, '_').slice(0, 40)}_${Date.now()}`;
    const newCard: Flashcard = { ...card, id, addedAt: Date.now(), studyTarget: target };
    const committed = await persistFlashcards([...cards, newCard], target, accountToken);
    return committed ? 'added' : 'stale';
  }, 'stale');
};

export const removeFlashcard = async (id: string, studyTarget?: RuntimeStudyTarget): Promise<void> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return;
  return withWriteLock(accountToken, async () => {
    const target = cacheTarget(studyTarget);
    const cards = await loadFlashcardsForAccount(target, accountToken);
    if (!isAccountOperationCurrent(accountToken)) return;
    await persistFlashcards(cards.filter(c => c.id !== id), target, accountToken);
  }, undefined);
};

/**
 * cards-2.0 (E7): удаление со снапшотом — для undo-снекбара.
 * Возвращает удалённую карточку и её индекс (для восстановления на место)
 * или null, если карточки уже нет.
 */
export const removeFlashcardWithSnapshot = async (
  id: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<{ card: Flashcard; index: number } | null> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return null;
  return withWriteLock<{ card: Flashcard; index: number } | null>(accountToken, async () => {
    const target = cacheTarget(studyTarget);
    const cards = await loadFlashcardsForAccount(target, accountToken);
    if (!isAccountOperationCurrent(accountToken)) return null;
    const index = cards.findIndex(c => c.id === id);
    if (index < 0) return null;
    const card = cards[index];
    const next = [...cards];
    next.splice(index, 1);
    await persistFlashcards(next, target, accountToken);
    return { card, index };
  }, null);
};

/**
 * cards-2.0 (E7): undo удаления — вернуть карточку на прежнее место.
 * Идемпотентно: если id уже есть (двойной тап «Вернуть»), ничего не делает.
 * Лимит-20 намеренно НЕ проверяется: restore возвращает то, что юзер уже имел.
 */
export const restoreFlashcard = async (
  card: Flashcard,
  index?: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return;
  return withWriteLock(accountToken, async () => {
    const target = cacheTarget(studyTarget);
    const cards = await loadFlashcardsForAccount(target, accountToken);
    if (!isAccountOperationCurrent(accountToken)) return;
    if (cards.some(c => c.id === card.id)) return;
    const next = [...cards];
    const at = index == null ? next.length : Math.max(0, Math.min(index, next.length));
    next.splice(at, 0, card);
    await persistFlashcards(next, target, accountToken);
  }, undefined);
};

export const removeFlashcardByEnglish = async (
  en: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return false;
  return withWriteLock(accountToken, async () => {
    const target = cacheTarget(studyTarget);
    const cards = await loadFlashcardsForAccount(target, accountToken);
    if (!isAccountOperationCurrent(accountToken)) return false;
    const normalizedEn = en.trim().toLowerCase();
    const card = cards.find(c => c.en.trim().toLowerCase() === normalizedEn);
    if (!card) return false;
    await persistFlashcards(cards.filter(c => c.id !== card.id), target, accountToken);
    return true;
  }, false);
};

/** Sync — only correct after the cache is loaded. Before load, returns false. */
export const isEnSavedInCacheSync = (en: string, studyTarget?: RuntimeStudyTarget): boolean => {
  const target = cacheTarget(studyTarget);
  const scopeKey = scopedTargetKey(captureAccountGeneration(), target);
  if (!scopeKey) return false;
  const cached = cardsInMemoryByScope.get(scopeKey);
  if (cached === undefined) return false;
  return hasEnInCards(en, cached);
};

export const isFlashcardSaved = async (
  en: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> => {
  const target = cacheTarget(studyTarget);
  const scopeKey = scopedTargetKey(captureAccountGeneration(), target);
  if (!scopeKey) return false;
  const cached = cardsInMemoryByScope.get(scopeKey);
  if (cached !== undefined) {
    return hasEnInCards(en, cached);
  }
  const cards = await loadFlashcards(target);
  return hasEnInCards(en, cards);
};

export const clearAllFlashcards = async (studyTarget?: RuntimeStudyTarget): Promise<void> => {
  const accountToken = captureAccountGeneration();
  if (!isAccountOperationCurrent(accountToken)) return;
  return withWriteLock(accountToken, async () => {
    const target = cacheTarget(studyTarget);
    if (!isAccountOperationCurrent(accountToken)) return;
    const scopeKey = scopedTargetKey(accountToken, target);
    if (!scopeKey) return;
    setBoundedCache(scopeKey, []);
    try {
      await withAccountTransitionLock(async () => {
        if (!isAccountOperationCurrent(accountToken)) return;
        await AsyncStorage.removeItem(flashcardsSavedKey(target));
      });
    } catch {
      // fail-soft
    }
  }, undefined);
};
