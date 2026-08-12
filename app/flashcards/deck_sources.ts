/**
 * cards-2.0 (E8): источники карточек для «Тренировать эту колоду» (§3.7 мастер-плана).
 *
 * Words-сессия тренера умеет принимать параметр ?deck= и брать карточки не из
 * trainer_store, а из выбранной колоды:
 *  - 'saved'     — сохранённые (flashcards_v1, hooks/use-flashcards);
 *  - 'custom'    — «Мои карточки» (custom_flashcards_v2, очередь custom_cards_store);
 *  - 'pack:<id>' — купленный набор маркета (bundled-паки + кэш built-cards).
 *
 * SRS-запись в trainer_store для deck-сессий НЕ делается (§3.7): прогресс сессии
 * локален, а ошибки уходят в active_recall_items с source 'custom'/'pack' —
 * так кастомные карточки попадают в очередь review (замена удалённого practice).
 *
 * Чистые билдеры вынесены отдельно от загрузчика — юнит-тесты в node
 * (tests/fc_deck_sources.test.ts) мокают только AsyncStorage.
 */
import { loadFlashcards, type Flashcard } from '../../hooks/use-flashcards';
import { listCustomCards } from './custom_cards_store';
import { resolveFlashcardBackText, type CardItem, type FlashcardContentLang } from './types';
import type { MistakeSource } from '../active_recall';

/** Карточка deck-сессии: EN + перевод локали показа + все переводы для recall-записи. */
export type DeckCard = {
  /** Стабильный id карточки — анти-фарм customTrainedToday считает по нему. */
  id: string;
  en: string;
  /** Перевод в локали показа (uk с фолбеком на ru — правило FLASHCARDS_RULES). */
  translation: string;
  ru: string;
  uk?: string;
  es?: string;
};

/** Разобранный параметр ?deck= words-сессии. */
export type DeckRef =
  | { kind: 'saved' }
  | { kind: 'custom' }
  | { kind: 'pack'; packId: string };

// ── Чистые функции ───────────────────────────────────────────────────────────

/**
 * Парсинг параметра ?deck= (deckId из fc_mode_prefs_v1 / кнопки коллекции).
 * 'weak' / пусто / мусор → null: сессия работает как обычный тренер (due-очередь).
 */
export function parseDeckParam(raw: string | string[] | undefined | null): DeckRef | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || typeof v !== 'string') return null;
  if (v === 'saved') return { kind: 'saved' };
  if (v === 'custom') return { kind: 'custom' };
  if (v.startsWith('pack:')) {
    const packId = v.slice(5).trim();
    return packId ? { kind: 'pack', packId } : null;
  }
  return null;
}

/** Источник записи ошибки в active_recall_items для deck-сессии (§3.7). */
export function mistakeSourceForDeck(deck: DeckRef): MistakeSource {
  return deck.kind === 'pack' ? 'pack' : 'custom';
}

const cleanText = (s: unknown): string => (typeof s === 'string' ? s.trim() : '');

/** Сохранённые карточки (flashcards_v1) → карточки deck-сессии. Пустой EN/перевод отсеиваются. */
export function deckCardsFromSaved(cards: readonly Flashcard[], lang: FlashcardContentLang): DeckCard[] {
  const out: DeckCard[] = [];
  for (const c of cards) {
    const en = cleanText(c.en);
    if (!en || !c.id) continue;
    const translation = resolveFlashcardBackText(
      { id: c.id, en, ru: c.ru ?? '', uk: c.uk ?? '', es: c.es, categoryId: 'saved', isSystem: false },
      lang,
    );
    if (!translation) continue;
    out.push({ id: c.id, en, translation, ru: cleanText(c.ru), uk: cleanText(c.uk) || undefined, es: cleanText(c.es) || undefined });
  }
  return out;
}

/** CardItem-колода (custom_flashcards_v2 / карточки пака) → карточки deck-сессии. */
export function deckCardsFromCardItems(cards: readonly CardItem[], lang: FlashcardContentLang): DeckCard[] {
  const out: DeckCard[] = [];
  for (const c of cards) {
    const en = cleanText(c.en);
    if (!en || !c.id) continue;
    const translation = resolveFlashcardBackText(c, lang);
    if (!translation) continue;
    out.push({ id: c.id, en, translation, ru: cleanText(c.ru), uk: cleanText(c.uk) || undefined, es: cleanText(c.es) || undefined });
  }
  return out;
}

/**
 * Ложный перевод для механики «перевод верный?» — из ЭТОЙ ЖЕ колоды и в той же
 * локали, что показ (паттерн trainer_words_session FIX(cards-2.0)).
 */
export function pickDeckDecoy(
  correctShown: string,
  all: readonly DeckCard[],
  rnd: () => number = Math.random,
): string {
  const pool = all.map((c) => c.translation).filter((tr) => tr && tr !== correctShown);
  if (pool.length === 0) return correctShown; // колода из одной карточки — показываем правильный
  return pool[Math.floor(rnd() * pool.length)];
}

// ── Загрузчик ────────────────────────────────────────────────────────────────

/** Карточки пака: bundled-паки маркета; фолбэк — кэш built-cards (community/Firestore-паки). */
async function loadPackDeckCards(packId: string, lang: FlashcardContentLang): Promise<DeckCard[]> {
  // Динамический импорт: marketplace тянет бандлы паков — не грузим их для saved/custom.
  const {
    bundledPacksForOwned,
    buildMarketplaceOwnedCards,
    loadBuiltMarketplaceCardsCache,
  } = await import('./marketplace');
  const bundled = bundledPacksForOwned([packId]);
  if (bundled.length > 0) {
    return deckCardsFromCardItems(buildMarketplaceOwnedCards(bundled), lang);
  }
  const cache = await loadBuiltMarketplaceCardsCache().catch(() => null);
  if (cache) {
    const packCards = cache.cards.filter((c) => c.sourceId === `DEV:${packId}`);
    return deckCardsFromCardItems(packCards, lang);
  }
  return [];
}

/**
 * Карточки выбранной колоды в порядке хранения (перемешивание и лимит размера —
 * на стороне сессии). Пустой результат — колода пуста или недоступна.
 */
export async function loadDeckCards(deck: DeckRef, lang: FlashcardContentLang): Promise<DeckCard[]> {
  if (deck.kind === 'saved') {
    const saved = await loadFlashcards().catch((): Flashcard[] => []);
    return deckCardsFromSaved(saved, lang);
  }
  if (deck.kind === 'custom') {
    const custom = await listCustomCards().catch((): CardItem[] => []);
    return deckCardsFromCardItems(custom, lang);
  }
  return loadPackDeckCards(deck.packId, lang).catch((): DeckCard[] => []);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
