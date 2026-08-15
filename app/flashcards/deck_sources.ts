/**
 * cards-2.0 (E8): источники карточек для «Тренировать эту колоду» (§3.7 мастер-плана).
 *
 * Words-сессия тренера умеет принимать параметр ?deck= и брать карточки не из
 * trainer_store, а из выбранной колоды:
 *  - 'saved'     — сохранённые (flashcards_v1, hooks/use-flashcards);
 *  - 'custom'    — «Мои карточки» (custom_flashcards_v2, очередь custom_cards_store);
 *  - 'pack:<id>' — купленный набор маркета (bundled-паки + кэш built-cards).
 *
 * cards-2.1 (§6 SPEC_2_1): параметр ?deck= принимает СПИСОК колод через запятую —
 * `?deck=saved,custom,pack:abc`. Одиночное значение (`?deck=saved`) работает как
 * раньше. Карточки нескольких колод объединяются, дубликаты по стабильному id
 * убираются, порядок перемешивается (`loadDeckCardsMulti`).
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
import { splitDeckParam } from './deck_selection';
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
  /** cards-2.1: из какой колоды пришла карточка (мультивыбор — источник ошибки на карточку). */
  source?: MistakeSource;
};

/** Разобранный параметр ?deck= words-сессии. */
export type DeckRef =
  | { kind: 'saved' }
  | { kind: 'custom' }
  | { kind: 'pack'; packId: string };

// ── Чистые функции ───────────────────────────────────────────────────────────

/** Один токен параметра ?deck= → ссылка на источник ('weak'/мусор → null). */
function deckRefFromToken(token: string): DeckRef | null {
  const v = token.trim();
  if (!v) return null;
  if (v === 'saved') return { kind: 'saved' };
  if (v === 'custom') return { kind: 'custom' };
  if (v.startsWith('pack:')) {
    const packId = v.slice(5).trim();
    return packId ? { kind: 'pack', packId } : null;
  }
  return null;
}

/** Ключ дедупликации ссылки на колоду. */
export function deckRefKey(deck: DeckRef): string {
  return deck.kind === 'pack' ? `pack:${deck.packId}` : deck.kind;
}

/**
 * cards-2.1: разбор параметра ?deck= как СПИСКА колод (`saved,custom,pack:abc`).
 * Одиночное значение → список из одного. Дубликаты схлопываются, 'weak'/мусор
 * отбрасываются. Пустой список — сессия работает как раньше (due-очередь тренера).
 */
export function parseDeckParams(raw: string | readonly string[] | undefined | null): DeckRef[] {
  const seen = new Set<string>();
  const out: DeckRef[] = [];
  for (const token of splitDeckParam(raw)) {
    const ref = deckRefFromToken(token);
    if (!ref) continue;
    const key = deckRefKey(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

/**
 * Парсинг параметра ?deck= — ПЕРВАЯ колода списка (обратная совместимость с
 * вызывающими экранами, которые ещё умеют только одну колоду).
 * 'weak' / пусто / мусор → null: сессия работает как обычный тренер (due-очередь).
 */
export function parseDeckParam(raw: string | readonly string[] | undefined | null): DeckRef | null {
  return parseDeckParams(raw)[0] ?? null;
}

/** Источник записи ошибки в active_recall_items для deck-сессии (§3.7). */
export function mistakeSourceForDeck(deck: DeckRef): MistakeSource {
  return deck.kind === 'pack' ? 'pack' : 'custom';
}

/**
 * Источник ошибок для мультиколоды: 'pack' только когда ВСЕ выбранные колоды —
 * наборы; иначе 'custom' (смесь уходит в review как кастомные).
 * Точнее — по карточке: `DeckCard.source`, его проставляет `loadDeckCardsMulti`.
 */
export function mistakeSourceForDecks(decks: readonly DeckRef[]): MistakeSource {
  if (decks.length === 0) return 'custom';
  return decks.every((d) => d.kind === 'pack') ? 'pack' : 'custom';
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
 * cards-2.1: объединение карточек нескольких колод. Дубликаты по стабильному id
 * убираются — побеждает первое вхождение (порядок колод = порядок выбора).
 */
export function mergeDeckCards(lists: readonly (readonly DeckCard[])[]): DeckCard[] {
  const seen = new Set<string>();
  const out: DeckCard[] = [];
  for (const list of lists) {
    for (const card of list) {
      if (!card || !card.id || seen.has(card.id)) continue;
      seen.add(card.id);
      out.push(card);
    }
  }
  return out;
}

/** Перемешивание объединённой колоды (Fisher–Yates, инъекция rnd для тестов). */
export function shuffleDeckCards(cards: readonly DeckCard[], rnd: () => number = Math.random): DeckCard[] {
  const out = cards.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
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

/** Дублируем префикс из community_packs/localAuthorPacks — чтобы не импортировать модуль ради строки. */
const LOCAL_AUTHOR_PACK_ID_PREFIX = 'local_pack_';

// ── Загрузчик ────────────────────────────────────────────────────────────────

/** Карточки пака: bundled-паки маркета; фолбэк — кэш built-cards (community/Firestore-паки). */
async function loadPackDeckCards(packId: string, lang: FlashcardContentLang): Promise<DeckCard[]> {
  /**
   * Свой набор с устройства (сохранён в редакторе) — карточки лежат локально.
   * Проверка по префиксу до импорта: обычные паки не тянут лишний модуль.
   */
  if (packId.startsWith(LOCAL_AUTHOR_PACK_ID_PREFIX)) {
    const { loadLocalAuthorPacks, localAuthorPackCardItems } = await import(
      '../community_packs/localAuthorPacks'
    );
    const local = (await loadLocalAuthorPacks().catch(() => [])).find((p) => p.id === packId);
    return local ? deckCardsFromCardItems(localAuthorPackCardItems(local), lang) : [];
  }
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

/**
 * cards-2.1 (§6): карточки НЕСКОЛЬКИХ колод одной объединённой колодой.
 * Колоды грузятся параллельно, каждая карточка помечается источником
 * ('pack' / 'custom' — для записи ошибок в active_recall), дубликаты по
 * стабильному id убираются, результат перемешивается (лимит размера — на
 * стороне сессии). Ошибка отдельной колоды не роняет остальные.
 */
export async function loadDeckCardsMulti(
  decks: readonly DeckRef[],
  lang: FlashcardContentLang,
  opts: { shuffle?: boolean; rnd?: () => number } = {},
): Promise<DeckCard[]> {
  if (decks.length === 0) return [];
  const lists = await Promise.all(
    decks.map(async (deck) => {
      const cards = await loadDeckCards(deck, lang).catch((): DeckCard[] => []);
      const source = mistakeSourceForDeck(deck);
      return cards.map((c) => (c.source === source ? c : { ...c, source }));
    }),
  );
  const merged = mergeDeckCards(lists);
  if (opts.shuffle === false) return merged;
  return shuffleDeckCards(merged, opts.rnd);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
