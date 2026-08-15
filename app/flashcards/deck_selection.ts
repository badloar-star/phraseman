/**
 * cards-2.1 (§6 SPEC_2_1): мультивыбор наборов для тренировки/слушания/блица.
 *
 * Чистые функции общего слоя между DeckPickerSheet (UI выбора), mode_prefs
 * (сохранение последнего выбора) и deck_sources (загрузка карточек):
 *  - формат параметра `?deck=` — СПИСОК через запятую: `saved,custom,pack:abc`;
 *    одиночное значение (`saved` / `pack:abc`) продолжает работать как раньше;
 *  - валидация/нормализация списка (дедупликация, порядок первого вхождения);
 *  - «Слабые» (`weak`) — не набор, а due-очередь тренера, поэтому выбирается
 *    ТОЛЬКО в одиночку (смешивать с наборами нечего: карточек у неё нет);
 *  - подсчёт «Выбрано N · M карточек» с дедупликацией карточек по стабильному id.
 *
 * Модуль без сайд-эффектов и без нативных зависимостей — юнит-тесты в node
 * (tests/fc_deck_selection.test.ts).
 */
import { legacyRuUk, type Lang } from '../../constants/i18n';

/**
 * Идентификатор набора тренировки (раньше жил в mode_prefs, реэкспортируется оттуда):
 *  - 'weak'      — «Слабые»: due-очередь тренера (trainer_store, дефолтное поведение);
 *  - 'saved'     — «Все сохранённые» (flashcards_v1);
 *  - 'custom'    — «Мои карточки» (custom_flashcards_v2);
 *  - 'pack:<id>' — добавленный набор.
 */
export type FcDeckId = 'weak' | 'saved' | 'custom' | `pack:${string}`;

/** Разделитель списка наборов в параметре `?deck=`. */
export const DECK_PARAM_SEPARATOR = ',';

/** Псевдо-набор due-очереди: выбирается только в одиночку. */
export const SOLO_DECK_ID: FcDeckId = 'weak';

export function isValidDeckId(v: unknown): v is FcDeckId {
  if (typeof v !== 'string') return false;
  if (v === 'weak' || v === 'saved' || v === 'custom') return true;
  return v.startsWith('pack:') && v.length > 'pack:'.length;
}

/**
 * Сырое разбиение параметра `?deck=` на токены. Массив (expo-router может отдать
 * повторяющийся query-параметр) склеивается в один список.
 */
export function splitDeckParam(raw: string | readonly string[] | undefined | null): string[] {
  const parts: string[] = [];
  const push = (v: unknown) => {
    if (typeof v !== 'string') return;
    for (const token of v.split(DECK_PARAM_SEPARATOR)) {
      const trimmed = token.trim();
      if (trimmed) parts.push(trimmed);
    }
  };
  if (Array.isArray(raw)) raw.forEach(push);
  else push(raw);
  return parts;
}

/**
 * Валидация + дедупликация списка наборов (порядок первого вхождения).
 * 'weak' исключителен: если он есть в списке — результат ровно ['weak'].
 * Мусор молча отбрасывается.
 */
export function normalizeDeckIds(ids: readonly unknown[] | undefined | null): FcDeckId[] {
  if (!ids || !Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const out: FcDeckId[] = [];
  for (const id of ids) {
    if (!isValidDeckId(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  if (out.includes(SOLO_DECK_ID)) return [SOLO_DECK_ID];
  return out;
}

/** Разбор параметра `?deck=` в нормализованный список наборов (пусто — список пуст). */
export function parseDeckIdList(raw: string | readonly string[] | undefined | null): FcDeckId[] {
  return normalizeDeckIds(splitDeckParam(raw));
}

/** Сборка параметра `?deck=` из списка наборов ('' — нечего передавать). */
export function joinDeckIds(ids: readonly FcDeckId[]): string {
  return normalizeDeckIds(ids).join(DECK_PARAM_SEPARATOR);
}

/**
 * Значение `?deck=` для роутера: как joinDeckIds, но 'weak' (due-очередь тренера)
 * параметром не передаётся — сессия стартует в дефолтном режиме. '' — не передавать.
 */
export function deckRouteParam(ids: readonly FcDeckId[]): string {
  return joinDeckIds(normalizeDeckIds(ids).filter((id) => id !== SOLO_DECK_ID));
}

/**
 * Тап по чекбоксу: добавить/снять набор. 'weak' исключителен в обе стороны —
 * выбор 'weak' сбрасывает наборы, выбор набора сбрасывает 'weak'.
 */
export function toggleDeckSelection(current: readonly FcDeckId[], id: FcDeckId): FcDeckId[] {
  const list = normalizeDeckIds(current);
  if (!isValidDeckId(id)) return list;
  if (list.includes(id)) return list.filter((d) => d !== id);
  if (id === SOLO_DECK_ID) return [SOLO_DECK_ID];
  return normalizeDeckIds([...list.filter((d) => d !== SOLO_DECK_ID), id]);
}

// ── Счётчик «Выбрано N · M карточек» ─────────────────────────────────────────

/** Набор в списке шита: счётчик карточек и (опционально) их стабильные id. */
export type DeckCountable = {
  deckId: FcDeckId;
  /** Кол-во карточек в наборе (бейдж). */
  count: number;
  /** Стабильные id карточек — если переданы, суммарный счётчик дедуплицируется. */
  cardIds?: readonly string[];
};

export type DeckSelectionSummary = {
  /** Сколько наборов из списка реально выбрано. */
  deckCount: number;
  /** Суммарно карточек с дедупликацией по стабильному id (там, где id известны). */
  cardCount: number;
};

const normalizeCount = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);

/**
 * Сводка выбора: сколько наборов и сколько карточек суммарно.
 * Дедупликация: у наборов с известными `cardIds` считается объединение множеств;
 * наборы без `cardIds` (счётчик пришёл агрегатом) складываются как есть.
 * Выбранные id, которых нет в списке наборов, игнорируются.
 */
export function summarizeDeckSelection(
  decks: readonly DeckCountable[],
  selected: readonly FcDeckId[],
): DeckSelectionSummary {
  const wanted = new Set(normalizeDeckIds(selected));
  const seenDecks = new Set<string>();
  const cardIds = new Set<string>();
  let plainCards = 0;
  for (const deck of decks) {
    if (!wanted.has(deck.deckId) || seenDecks.has(deck.deckId)) continue;
    seenDecks.add(deck.deckId);
    if (deck.cardIds) {
      for (const id of deck.cardIds) if (id) cardIds.add(id);
    } else {
      plainCards += normalizeCount(deck.count);
    }
  }
  return { deckCount: seenDecks.size, cardCount: cardIds.size + plainCards };
}

/** «84 карточки» с правильной формой слова (образец hub_hero.phrasesCountLabel). */
export function cardsCountLabel(lang: Lang, count: number): string {
  const n = normalizeCount(count);
  const l = legacyRuUk(lang);
  if (l === 'es') return `${n} ${n === 1 ? 'tarjeta' : 'tarjetas'}`;
  const mod10 = n % 10;
  const mod100 = n % 100;
  const isOne = mod10 === 1 && mod100 !== 11;
  const isFew = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14);
  if (l === 'uk') return `${n} ${isOne ? 'картка' : isFew ? 'картки' : 'карток'}`;
  return `${n} ${isOne ? 'карточка' : isFew ? 'карточки' : 'карточек'}`;
}

/**
 * «2 набора» / «5 наборов» — заголовок сессии по нескольким наборам (§6).
 * Слово «колода» запрещено владельцем (2026-08-13) — везде «набор».
 * Отдельно от `cardsCountLabel`: у слова другие формы.
 */
export function decksCountLabel(lang: Lang, count: number): string {
  const n = normalizeCount(count);
  const l = legacyRuUk(lang);
  if (l === 'es') return `${n} ${n === 1 ? 'pack' : 'packs'}`;
  const mod10 = n % 10;
  const mod100 = n % 100;
  const isOne = mod10 === 1 && mod100 !== 11;
  const isFew = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14);
  if (l === 'uk') return `${n} ${isOne ? 'набір' : isFew ? 'набори' : 'наборів'}`;
  return `${n} ${isOne ? 'набор' : isFew ? 'набора' : 'наборов'}`;
}

/** Подпись счётчика в шите: «Выбрано 3 · 84 карточки» / '' когда ничего не выбрано. */
export function deckSelectionLabel(lang: Lang, summary: DeckSelectionSummary): string {
  if (summary.deckCount <= 0) return '';
  const l = legacyRuUk(lang);
  const cards = cardsCountLabel(lang, summary.cardCount);
  if (l === 'es') return `${summary.deckCount} seleccionados · ${cards}`;
  if (l === 'uk') return `Обрано ${summary.deckCount} · ${cards}`;
  return `Выбрано ${summary.deckCount} · ${cards}`;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
