// cards-2.0 (E7): единая очередь записи `custom_flashcards_v2`.
//
// ВСЕ записи юзерской библиотеки карточек идут через одну mutex-очередь
// (functional-update, по образцу `hooks/use-flashcards.ts`) —
// иначе параллельные операции (undo-восстановление + создание карточки,
// быстрые свайпы удаления) теряют данные: последний setItem перетирает предыдущий.
//
// Формат данных сохраняется 1:1 (CardItem с categoryId 'custom', isSystem false;
// незнакомые поля элементов не отбрасываются). Ключ существующий — новых не вводим.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { customFlashcardsKey } from '../target_storage_keys';
import {
  commitPhoneStateCustomCards,
  readPhoneStateCustomCards,
} from '../phone_state_cards_bridge';

/** Ключ сохранённых custom-карточек текущей цели обучения (см. target_storage_keys). */
const FLASHCARDS_CUSTOM_KEY = customFlashcardsKey();
import type { CardItem } from './types';

/** In-memory кэш последнего закоммиченного состояния (для быстрых повторных чтений). */
let cache: CardItem[] | null = null;

/** Очередь: все read-modify-write строго по одному. */
let writeQueue: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(() => fn());
  // `finally(() => {})` — очередь не рвётся на reject предыдущей операции.
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function parseStored(raw: string | null): CardItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CardItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Чтение с диска ВНУТРИ замка. Кэш не используется как источник правды при
 * мутациях: `custom_flashcards_v2` входит в SYNC_KEYS (`cloud_sync.ts`) и может
 * быть перезаписан облачным restore вне этой очереди — читаем актуальный диск.
 */
async function loadFromDisk(): Promise<CardItem[]> {
  const raw = await AsyncStorage.getItem(FLASHCARDS_CUSTOM_KEY);
  const cards = await readPhoneStateCustomCards(parseStored(raw));
  cache = cards;
  return cards;
}

async function commit(previous: CardItem[], cards: CardItem[]): Promise<void> {
  // Encrypted local state commits first; AsyncStorage is a compatibility mirror.
  // If the new store is locally unavailable, the existing durable mirror keeps
  // the user's action and the next opening import retries silently.
  await commitPhoneStateCustomCards(previous, cards).catch(() => undefined);
  await AsyncStorage.setItem(FLASHCARDS_CUSTOM_KEY, JSON.stringify(cards));
  cache = cards;
}

/**
 * Базовый functional-update: mutator получает свежий массив и возвращает новый.
 * Вернуть тот же массив (===) — «без изменений», записи на диск не будет.
 */
export function updateCustomCards(
  mutator: (cards: CardItem[]) => CardItem[],
): Promise<CardItem[]> {
  return withWriteLock(async () => {
    const current = await loadFromDisk();
    const next = mutator(current);
    if (next !== current) {
      await commit(current, next);
    }
    return next;
  });
}

/** Список кастомных карточек (копия массива). Идёт через очередь — видит все начатые записи. */
export function listCustomCards(): Promise<CardItem[]> {
  return withWriteLock(async () => {
    const cards = await loadFromDisk();
    return [...cards];
  });
}

/** Синхронный снапшот кэша (может быть null до первого чтения). Только для отображения. */
export function peekCustomCardsSync(): CardItem[] | null {
  return cache ? [...cache] : null;
}

/** Создать или обновить карточку (по id). Новая — в конец списка. */
export function upsertCustomCard(card: CardItem): Promise<void> {
  return updateCustomCards((cards) => {
    const idx = cards.findIndex((c) => c.id === card.id);
    if (idx >= 0) {
      const next = [...cards];
      next[idx] = card;
      return next;
    }
    return [...cards, card];
  }).then(() => undefined);
}

/**
 * Удалить карточку. Возвращает снапшот удалённой карточки и её индекс —
 * для undo-восстановления (`restoreCustomCard`). null — карточки уже нет.
 */
export function deleteCustomCard(
  id: string,
): Promise<{ card: CardItem; index: number } | null> {
  let removed: { card: CardItem; index: number } | null = null;
  return updateCustomCards((cards) => {
    const idx = cards.findIndex((c) => c.id === id);
    if (idx < 0) return cards;
    removed = { card: cards[idx], index: idx };
    const next = [...cards];
    next.splice(idx, 1);
    return next;
  }).then(() => removed);
}

/**
 * Undo удаления: вернуть карточку на прежнее место (index клампится в границы).
 * Идемпотентно — если карточка с таким id уже есть (двойной тап «Вернуть»,
 * гонка с облачным restore), ничего не делает.
 */
export function restoreCustomCard(card: CardItem, index?: number): Promise<void> {
  return updateCustomCards((cards) => {
    if (cards.some((c) => c.id === card.id)) return cards;
    const next = [...cards];
    const at = index == null ? next.length : Math.max(0, Math.min(index, next.length));
    next.splice(at, 0, card);
    return next;
  }).then(() => undefined);
}

/** Только для юнит-тестов: сброс модульного состояния. */
export function __resetCustomCardsStoreForTests(): void {
  cache = null;
  writeQueue = Promise.resolve();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
