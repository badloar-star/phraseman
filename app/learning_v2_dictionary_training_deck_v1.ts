// Колода «слова словаря Learning V2» для тренировок «Карточек» (Блиц / Устно / Правда-ложь / Напиши).
//
// зачем (владелец 21.10 через координатора, макет dictionary-v2.html, вариант A): тренировать слова прямо из словаря
// теми же режимами, что в «Карточках», без копий экранов. Экраны тренировок берут колоду из `?deck=`; словарь кладёт
// выбранные слова сюда и передаёт токен `lv2:<id>`. Слова уже есть на телефоне (бандл курса) — сеть и Firebase не нужны.
// Копия последних колод лежит на телефоне, чтобы «Ещё раз» и возврат после перезапуска не давали пустую тренировку.
// Журнал [V2-DICT]: положили / нашли в памяти / подняли с телефона / не нашли — с причиной.
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { DeckCard } from "./flashcards/deck_sources";
import type { FlashcardContentLang } from "./flashcards/types";

const LOG = "[V2-DICT]";
const STORAGE_KEY = "learning_v2_dictionary_training_decks_v1";
const SCHEMA = "learning-v2-dictionary-training-deck.v1";
/** Сколько последних колод держим на телефоне (каждая — до нескольких сотен коротких слов). */
const KEEP_DECKS = 3;
const ID_RE = /^[a-z0-9]{6,32}$/u;

export type LearningV2DictionaryTrainingWordV1 = Readonly<{
  /** Стабильный id слова курса — по нему «Карточки» считают повторы. */
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
  words: readonly LearningV2DictionaryTrainingWordV1[];
}>;

// зачем (координатор 22.10 ночью): монеты за тренировку слов словаря — вопрос владельцу на утро. До ответа выключено;
// «как в Карточках» включается заменой false → true, без нового кода (экраны тренировок читают это значение).
export const LEARNING_V2_DICTIONARY_TRAINING_COINS_ENABLED = false;

/** Можно ли начислять монеты практики за тренировку по этой колоде (`?deck=`): колоды словаря — только по флагу. */
export function practiceCoinsAllowedForDeckKeysV1(deckKeys: readonly string[]): boolean {
  const hasDictionaryDeck = deckKeys.some((key) => key.startsWith("lv2:"));
  if (!hasDictionaryDeck) return true;
  if (!LEARNING_V2_DICTIONARY_TRAINING_COINS_ENABLED) {
    console.log(`${LOG} coins_off`, JSON.stringify({ deckKeys, reason: "flag_off_until_owner_decides" })); // guard-ok: почему монеты не начисляются
  }
  return LEARNING_V2_DICTIONARY_TRAINING_COINS_ENABLED;
}

const memory = new Map<string, StoredDeck>();
let counter = 0;

const clean = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

function newDeckId(nowMs: number): string {
  counter = (counter + 1) % 1296;
  return `${nowMs.toString(36)}${counter.toString(36).padStart(2, "0")}`;
}

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

/** Положить выбранные слова и получить токен колоды для `?deck=` (`lv2:<id>`). */
export function putLearningV2DictionaryTrainingDeckV1(
  words: readonly LearningV2DictionaryTrainingWordV1[],
  nowMs: number = Date.now(),
): string | null {
  const usable = words.filter((word) => clean(word.lexicalItemId) && clean(word.target));
  if (usable.length === 0) {
    console.warn(`${LOG} deck_put_empty`, JSON.stringify({ given: words.length })); // guard-ok: ранний выход с причиной
    return null;
  }
  const deck: StoredDeck = Object.freeze({ schema: SCHEMA, id: newDeckId(nowMs), createdAtMs: nowMs, words: Object.freeze([...usable]) });
  memory.set(deck.id, deck);
  console.log(`${LOG} deck_put`, JSON.stringify({ deckId: deck.id, words: usable.length, dropped: words.length - usable.length })); // guard-ok: строка на колоду
  void readStoredDecks()
    .then((stored) => {
      const next = [deck, ...stored.filter((item) => item.id !== deck.id)].slice(0, KEEP_DECKS);
      return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    })
    .catch((error: unknown) => {
      console.warn(`${LOG} deck_persist_failed`, JSON.stringify({ deckId: deck.id, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch с причиной
    });
  return `lv2:${deck.id}`;
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

/** Карточки колоды по id (без `lv2:`). Нет такой колоды — пустой список и строка в журнале. */
export async function loadLearningV2DictionaryTrainingDeckV1(deckId: string, lang: FlashcardContentLang): Promise<DeckCard[]> {
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
export function __resetLearningV2DictionaryTrainingDecksForTests(): void {
  memory.clear();
  counter = 0;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __LearningV2DictionaryTrainingDeckRouteShim() {
  return null;
}
