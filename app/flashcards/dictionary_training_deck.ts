// Колоды «слова словаря» для тренировок «Карточек» (Блиц / Устно / Правда-ложь / Напиши) — только чтение.
//
// зачем: словарь удалённого курса занятий клал выбранные слова в колоду и открывал тренировку «Карточек» по токену
// `?deck=lv2:<id>`; копии последних колод лежат на телефонах пользователей выпущенных версий. Курс и его словарь убраны,
// новые колоды никто не создаёт, но ранее сохранённые обязаны открываться («Ещё раз», возврат после перезапуска) —
// поэтому чтение сохранено здесь. Формат хранения (ключ, схема, префикс токена) — как его писали выпущенные версии;
// менять нельзя. Сеть и Firebase не нужны: слова уже на телефоне.
// Журнал [DICT-DECK]: нашли в памяти / подняли с телефона / не нашли — с причиной.
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { DeckCard } from "./deck_sources";
import type { FlashcardContentLang } from "./types";

const LOG = "[DICT-DECK]";
/** Ключ и схема выпущенных версий — совместимость с уже сохранёнными колодами. */
const STORAGE_KEY = "learning_v2_dictionary_training_decks_v1";
const SCHEMA = "learning-v2-dictionary-training-deck.v1";
/** Префикс токена колоды в `?deck=` (как его писали выпущенные версии). */
export const DICTIONARY_DECK_TOKEN_PREFIX = "lv2:";
const ID_RE = /^[a-z0-9]{6,32}$/u;

export type DictionaryTrainingWord = Readonly<{
  /** Стабильный id слова — по нему «Карточки» считают повторы. */
  lexicalItemId: string;
  /** Слово на изучаемом языке (лицо карточки). */
  target: string;
  /** Точный перевод по языкам интерфейса (оборот карточки). */
  meaningByLocale: Readonly<Partial<Record<string, string>>>;
}>;

type StoredDeck = Readonly<{
  schema: typeof SCHEMA;
  id: string;
  createdAtMs: number;
  words: readonly DictionaryTrainingWord[];
}>;

/** Монеты практики за тренировку по колоде словаря не начислялись (решение осталось прежним). */
const DICTIONARY_TRAINING_COINS_ENABLED = false;

/** Можно ли начислять монеты практики за тренировку по этим колодам (`?deck=`): колоды словаря — нет. */
export function practiceCoinsAllowedForDeckKeys(deckKeys: readonly string[]): boolean {
  const hasDictionaryDeck = deckKeys.some((key) => key.startsWith(DICTIONARY_DECK_TOKEN_PREFIX));
  if (!hasDictionaryDeck) return true;
  if (!DICTIONARY_TRAINING_COINS_ENABLED) {
    console.log(`${LOG} coins_off`, JSON.stringify({ deckKeys, reason: "dictionary_deck_has_no_practice_coins" })); // guard-ok: почему монеты не начисляются
  }
  return DICTIONARY_TRAINING_COINS_ENABLED;
}

const memory = new Map<string, StoredDeck>();

const clean = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

function isStoredDeck(value: unknown): value is StoredDeck {
  if (!value || typeof value !== "object") return false;
  const deck = value as Partial<StoredDeck>;
  return deck.schema === SCHEMA && typeof deck.id === "string" && ID_RE.test(deck.id) && Array.isArray(deck.words);
}

async function readStoredDecks(): Promise<StoredDeck[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStoredDeck) : [];
  } catch (error) {
    console.warn(`${LOG} deck_storage_read_failed`, JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch с причиной
    return [];
  }
}

function toDeckCards(deck: StoredDeck, lang: FlashcardContentLang): DeckCard[] {
  const out: DeckCard[] = [];
  for (const word of deck.words) {
    const en = clean(word.target);
    const ru = clean(word.meaningByLocale.ru);
    // Перевод в языке показа; если его нет — русский (как в остальных колодах «Карточек»).
    const translation = clean(word.meaningByLocale[lang]) || ru || clean(word.meaningByLocale.en);
    if (!en || !translation) continue;
    out.push({
      // id карточки — как у выпущенных версий: по нему уже посчитаны повторы.
      id: `lv2-word:${word.lexicalItemId}`,
      en,
      translation,
      ru: ru || translation,
      uk: clean(word.meaningByLocale.uk) || undefined,
      es: clean(word.meaningByLocale.es) || undefined,
    });
  }
  return out;
}

/** Карточки ранее сохранённой колоды по id (без префикса токена). Нет такой колоды — пустой список и строка в журнале. */
export async function loadDictionaryTrainingDeck(deckId: string, lang: FlashcardContentLang): Promise<DeckCard[]> {
  const fromMemory = memory.get(deckId);
  if (fromMemory) {
    const cards = toDeckCards(fromMemory, lang);
    console.log(`${LOG} deck_load`, JSON.stringify({ deckId, from: "memory", cards: cards.length, lang })); // guard-ok: итог загрузки
    return cards;
  }
  const stored = (await readStoredDecks()).find((deck) => deck.id === deckId);
  if (!stored) {
    console.warn(`${LOG} deck_load_missing`, JSON.stringify({ deckId, lang })); // guard-ok: ранний выход с причиной
    return [];
  }
  memory.set(stored.id, stored);
  const cards = toDeckCards(stored, lang);
  console.log(`${LOG} deck_load`, JSON.stringify({ deckId, from: "phone", cards: cards.length, lang })); // guard-ok: итог загрузки
  return cards;
}

/** Только для тестов. */
export function __resetDictionaryTrainingDecksForTests(): void {
  memory.clear();
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __DictionaryTrainingDeckRouteShim() {
  return null;
}
