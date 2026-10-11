/**
 * Сквозной поиск Карточек 2.0 (хаб): «Карточки» · «Наборы» · «Из видео» — локальный индекс.
 *
 * зачем (координатор 11.10, макет cards-v2.html `hubSearch`, экономия Firebase обязательна): поиск по каждой букве
 * не ходит в сеть. Индекс строится один раз из того, что уже есть на устройстве (сохранённые и свои карточки,
 * свои наборы, прогретые снимки каталога и роликов), и дальше ищет в памяти за доли миллисекунды.
 * Модуль чистый — без React и платформы; источники собирает `cards_search_sources.ts`.
 *
 * Ранжирование: строка начинается с запроса → слово начинается с запроса → вхождение (с 3 букв), затем короче.
 * Нормализация: регистр, диакритика (é → e), пунктуация, лишние пробелы — «Lay over» находится по «layo» нет, по «lay» да.
 */

export type SearchCardInput = Readonly<{
  id: string;
  /** Слово/фраза на изучаемом языке. */
  text: string;
  /** Перевод на язык интерфейса. */
  translation: string;
  sourceKind: 'saved' | 'custom';
}>;

export type SearchPackInput = Readonly<{
  id: string;
  title: string;
  authorName?: string;
  cardCount: number;
  level?: string;
  previewWords?: readonly string[];
  /** Набор фраз ролика («Из видео»). */
  isVideo: boolean;
  videoId?: string;
  videoDurationSec?: number;
}>;

type Indexed<T> = Readonly<{ item: T; fields: readonly string[] }>;

export type CardsSearchIndex = Readonly<{
  cards: readonly Indexed<SearchCardInput>[];
  packs: readonly Indexed<SearchPackInput>[];
  videos: readonly Indexed<SearchPackInput>[];
}>;

export type CardsSearchGroup<T> = Readonly<{ items: readonly T[]; total: number }>;
export type CardsSearchResult = Readonly<{
  query: string;
  cards: CardsSearchGroup<SearchCardInput>;
  packs: CardsSearchGroup<SearchPackInput>;
  videos: CardsSearchGroup<SearchPackInput>;
}>;

export const CARDS_SEARCH_LIMITS = Object.freeze({ cards: 30, packs: 20, videos: 20 });
/** Вхождение в середину слова — только с этой длины запроса: «a» не должно находить всё подряд. */
const SUBSTRING_MIN_QUERY = 3;

export function normalizeSearchText(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function indexed<T>(item: T, raw: readonly (string | undefined)[]): Indexed<T> {
  const fields = raw.map(normalizeSearchText).filter(Boolean);
  return { item, fields };
}

export function buildCardsSearchIndex(input: Readonly<{
  cards: readonly SearchCardInput[];
  packs: readonly SearchPackInput[];
}>): CardsSearchIndex {
  const seenCards = new Set<string>();
  const cards: Indexed<SearchCardInput>[] = [];
  for (const card of input.cards) {
    // Одна и та же фраза в сохранённых и своих — одна строка результата.
    const key = `${normalizeSearchText(card.text)}|${normalizeSearchText(card.translation)}`;
    if (!card.id || !card.text || seenCards.has(key)) continue;
    seenCards.add(key);
    cards.push(indexed(card, [card.text, card.translation]));
  }
  const seenPacks = new Set<string>();
  const packs: Indexed<SearchPackInput>[] = [];
  const videos: Indexed<SearchPackInput>[] = [];
  for (const pack of input.packs) {
    if (!pack.id || seenPacks.has(pack.id)) continue;
    seenPacks.add(pack.id);
    const entry = indexed(pack, [pack.title, ...(pack.previewWords ?? []), pack.authorName]);
    (pack.isVideo ? videos : packs).push(entry);
  }
  return { cards, packs, videos };
}

/** 3 — поле начинается с запроса, 2 — слово начинается, 1 — вхождение, 0 — нет. */
function scoreFields(fields: readonly string[], query: string): number {
  let best = 0;
  for (const field of fields) {
    if (field.startsWith(query)) return 3;
    if (best < 2 && (` ${field}`).includes(` ${query}`)) best = 2;
    else if (best < 1 && query.length >= SUBSTRING_MIN_QUERY && field.includes(query)) best = 1;
  }
  return best;
}

function searchGroup<T>(entries: readonly Indexed<T>[], query: string, limit: number): CardsSearchGroup<T> {
  const hits: { item: T; score: number; len: number; order: number }[] = [];
  entries.forEach((entry, order) => {
    const score = scoreFields(entry.fields, query);
    if (score > 0) hits.push({ item: entry.item, score, len: entry.fields[0]?.length ?? 0, order });
  });
  hits.sort((a, b) => b.score - a.score || a.len - b.len || a.order - b.order);
  return { items: hits.slice(0, limit).map((h) => h.item), total: hits.length };
}

const EMPTY_GROUP = Object.freeze({ items: Object.freeze([]), total: 0 });

export function searchCardsIndex(
  index: CardsSearchIndex,
  rawQuery: string,
  limits: Readonly<{ cards: number; packs: number; videos: number }> = CARDS_SEARCH_LIMITS,
): CardsSearchResult {
  const query = normalizeSearchText(rawQuery);
  if (!query) return { query, cards: EMPTY_GROUP, packs: EMPTY_GROUP, videos: EMPTY_GROUP };
  return {
    query,
    cards: searchGroup(index.cards, query, limits.cards),
    packs: searchGroup(index.packs, query, limits.packs),
    videos: searchGroup(index.videos, query, limits.videos),
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
