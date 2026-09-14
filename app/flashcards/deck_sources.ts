/**
 * cards-2.0 (E8): источники карточек для «Тренировать эту колоду» (§3.7 мастер-плана).
 *
 * Words-сессия тренера умеет принимать параметр ?deck= и брать карточки не из
 * очереди ошибок, а из выбранной колоды:
 *  - 'saved'     — сохранённые (flashcards_v1, hooks/use-flashcards);
 *  - 'custom'    — «Мои карточки» (custom_flashcards_v2, очередь custom_cards_store);
 *  - 'pack:<id>' — купленный набор маркета (bundled-паки + кэш built-cards).
 *
 * cards-2.1 (§6 SPEC_2_1): параметр ?deck= принимает СПИСОК колод через запятую —
 * `?deck=saved,custom,pack:abc`. Одиночное значение (`?deck=saved`) работает как
 * раньше. Карточки нескольких колод объединяются, дубликаты по стабильному id
 * убираются, порядок перемешивается (`loadDeckCardsMulti`).
 *
 * Прогресс deck-сессии локален, а реальные ошибки уходят в единый журнал —
 * так кастомные карточки попадают в очередь review (замена удалённого practice).
 *
 * Чистые билдеры вынесены отдельно от загрузчика — юнит-тесты в node
 * (tests/fc_deck_sources.test.ts) мокают только AsyncStorage.
 */
import { type Flashcard } from '../../hooks/use-flashcards';
import { loadSelectedSavedContour } from './saved_language_contour';
import { listCustomCards } from './custom_cards_store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveFlashcardBackText, type CardItem, type FlashcardContentLang } from './types';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { splitDeckParam } from './deck_selection';
export type MistakeSource = 'lesson' | 'quiz' | 'arena' | 'diagnostic' | 'exam' | 'custom' | 'pack';

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

/** Источник записи ошибки для deck-сессии. */
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
 * локали, что показ (единый контракт карточек FIX(cards-2.0)).
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

/** Карточки пака: bundled-паки маркета; community-паки читаем из Firestore, кэш — офлайн-фолбэк. */
async function loadPackDeckCards(
  packId: string,
  lang: FlashcardContentLang,
  studyTarget?: RuntimeStudyTarget,
): Promise<DeckCard[]> {
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

  /**
   * Community-наборы не входят в bundled marketplace manifest. Раньше для них
   * здесь был только built-cards cache, который не заполняется при «Добавить
   * себе» из каталога: ID появлялся в выборе колод, но сам набор был пустым.
   * Берём опубликованные карточки напрямую; кэш ниже остаётся офлайн-фолбэком.
   */
  /**
   * зачем (владелец 2026-09-14, «наборы не загружаются — "Загружаем наборы" и
   * ничего»; лог: `sources:done` есть, `build:done` — ни разу): запрос карточек
   * набора сообщества шёл в Firestore БЕЗ таймаута и первым. При плохой сети
   * `.get()` висит сколько угодно, и весь список наборов висел вместе с ним.
   * Теперь: 1) локальная копия последнего успешного ответа отдаётся сразу;
   * 2) сеть ограничена по времени и ДОГОНЯЕТ фоном, обновляя копию;
   * 3) без копии — сеть с таймаутом, затем офлайн-кэш маркета.
   */
  const { fetchCommunityPackCards } = await import('../community_packs/communityFirestore');
  const persisted = await readPersistedCommunityPackCards(packId);
  if (persisted && persisted.length > 0) {
    console.log(`[FC-DECKS] pack:${packId} из локальной копии (${persisted.length} карт.), сеть догоняет фоном`);
    void refreshPersistedCommunityPackCards(packId, fetchCommunityPackCards);
    return deckCardsFromCardItems(persisted, lang);
  }
  const startedAtMs = Date.now();
  const communityCards = await withTimeout(
    fetchCommunityPackCards(packId),
    COMMUNITY_PACK_FETCH_TIMEOUT_MS,
    (): CardItem[] => {
      console.warn(`[FC-DECKS] pack:${packId} сеть не ответила за ${COMMUNITY_PACK_FETCH_TIMEOUT_MS}мс — идём в офлайн-кэш`);
      return [];
    },
  ).catch((error: unknown): CardItem[] => {
    console.warn(`[FC-DECKS] pack:${packId} сеть отказала за ${Date.now() - startedAtMs}мс —`, error instanceof Error ? error.message : String(error));
    return [];
  });
  if (communityCards.length > 0) {
    console.log(`[FC-DECKS] pack:${packId} из сети за ${Date.now() - startedAtMs}мс (${communityCards.length} карт.)`);
    void persistCommunityPackCards(packId, communityCards);
    return deckCardsFromCardItems(communityCards, lang);
  }

  const cache = await loadBuiltMarketplaceCardsCache(studyTarget, lang).catch(() => null);
  if (cache) {
    const packCards = cache.cards.filter((c) => c.sourceId === `DEV:${packId}`);
    return deckCardsFromCardItems(packCards, lang);
  }
  return [];
}

/** Предел ожидания сети для карточек набора сообщества: дольше — офлайн-кэш. */
const COMMUNITY_PACK_FETCH_TIMEOUT_MS = 1500;
const COMMUNITY_PACK_CARDS_KEY_PREFIX = 'fc_community_pack_cards_v1:';

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => resolve(onTimeout()), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}

async function readPersistedCommunityPackCards(packId: string): Promise<CardItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`${COMMUNITY_PACK_CARDS_KEY_PREFIX}${packId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CardItem[]) : null;
  } catch (error: unknown) {
    // Немой catch запрещён: битая копия объясняется, а не молча пропускается.
    console.warn(`[FC-DECKS] pack:${packId} локальная копия не прочиталась —`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function persistCommunityPackCards(packId: string, cards: CardItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${COMMUNITY_PACK_CARDS_KEY_PREFIX}${packId}`, JSON.stringify(cards));
  } catch (error: unknown) {
    console.warn(`[FC-DECKS] pack:${packId} локальная копия не записалась —`, error instanceof Error ? error.message : String(error));
  }
}

/** Фоновое обновление копии: экран его не ждёт, следующий заход получит свежие карточки. */
async function refreshPersistedCommunityPackCards(
  packId: string,
  fetch: (id: string) => Promise<CardItem[]>,
): Promise<void> {
  try {
    const fresh = await fetch(packId);
    if (fresh.length > 0) await persistCommunityPackCards(packId, fresh);
  } catch (error: unknown) {
    console.warn(`[FC-DECKS] pack:${packId} фоновое обновление копии не удалось —`, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Карточки выбранной колоды в порядке хранения (перемешивание и лимит размера —
 * на стороне сессии). Пустой результат — колода пуста или недоступна.
 */
export async function loadDeckCards(
  deck: DeckRef,
  lang: FlashcardContentLang,
  // зачем: без языка все три источника молча падали в английское хранилище —
  // во французском режиме колоды показывали английские карточки (2026-09-05).
  studyTarget?: RuntimeStudyTarget,
): Promise<DeckCard[]> {
  if (deck.kind === 'saved') {
    const saved = await loadSelectedSavedContour(studyTarget).catch((): Flashcard[] => []);
    return deckCardsFromSaved(saved, lang);
  }
  if (deck.kind === 'custom') {
    const custom = await listCustomCards(studyTarget).catch((): CardItem[] => []);
    return deckCardsFromCardItems(custom, lang);
  }
  return loadPackDeckCards(deck.packId, lang, studyTarget).catch((): DeckCard[] => []);
}

/**
 * cards-2.1 (§6): карточки НЕСКОЛЬКИХ колод одной объединённой колодой.
 * Колоды грузятся параллельно, каждая карточка помечается источником
 * ('pack' / 'custom' — для идентичности ошибки), дубликаты по
 * стабильному id убираются, результат перемешивается (лимит размера — на
 * стороне сессии). Ошибка отдельной колоды не роняет остальные.
 */
export async function loadDeckCardsMulti(
  decks: readonly DeckRef[],
  lang: FlashcardContentLang,
  opts: { shuffle?: boolean; rnd?: () => number; studyTarget?: RuntimeStudyTarget } = {},
): Promise<DeckCard[]> {
  if (decks.length === 0) return [];
  const lists = await Promise.all(
    decks.map(async (deck) => {
      const cards = await loadDeckCards(deck, lang, opts.studyTarget).catch((): DeckCard[] => []);
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
