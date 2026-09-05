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
import { customFlashcardsKey, storageStudyTarget, type RuntimeStudyTarget } from '../target_storage_keys';
import type { StudyTarget } from '../study_target';
import {
  commitPhoneStateCustomCards,
  readPhoneStateCustomCards,
} from '../phone_state_cards_bridge';

// зачем: ключ считаем НА КАЖДОМ вызове, а не один раз на загрузке модуля —
// иначе смена языка в рантайме не подхватывается и всё уходит в английское
// хранилище (протечка языков, найдено 2026-09-05).
import type { CardItem } from './types';

/** In-memory кэш последнего закоммиченного состояния, отдельно на каждый язык. */
let cacheByTarget: Partial<Record<StudyTarget, CardItem[]>> = {};

/**
 * Очередь: все read-modify-write строго по одному — СВОЯ на каждый язык.
 * Общая очередь на два хранилища только сериализовала бы независимые записи.
 */
let writeQueueByTarget: Partial<Record<StudyTarget, Promise<unknown>>> = {};
function withWriteLock<T>(target: StudyTarget, fn: () => Promise<T>): Promise<T> {
  const prev = writeQueueByTarget[target] ?? Promise.resolve();
  const result = prev.then(() => fn());
  // `finally(() => {})` — очередь не рвётся на reject предыдущей операции.
  writeQueueByTarget[target] = result.then(
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
async function loadFromDisk(target: StudyTarget): Promise<CardItem[]> {
  const raw = await AsyncStorage.getItem(customFlashcardsKey(target));
  const cards = await readPhoneStateCustomCards(parseStored(raw));
  cacheByTarget[target] = cards;
  return cards;
}

async function commit(previous: CardItem[], cards: CardItem[], target: StudyTarget): Promise<void> {
  // Encrypted local state commits first; AsyncStorage is a compatibility mirror.
  // If the new store is locally unavailable, the existing durable mirror keeps
  // the user's action and the next opening import retries silently.
  await commitPhoneStateCustomCards(previous, cards).catch(() => undefined);
  await AsyncStorage.setItem(customFlashcardsKey(target), JSON.stringify(cards));
  cacheByTarget[target] = cards;
}

/**
 * Базовый functional-update: mutator получает свежий массив и возвращает новый.
 * Вернуть тот же массив (===) — «без изменений», записи на диск не будет.
 */
export function updateCustomCards(
  mutator: (cards: CardItem[]) => CardItem[],
  studyTarget?: RuntimeStudyTarget,
): Promise<CardItem[]> {
  const target = storageStudyTarget(studyTarget);
  return withWriteLock(target, async () => {
    const current = await loadFromDisk(target);
    const next = mutator(current);
    if (next !== current) {
      await commit(current, next, target);
    }
    return next;
  });
}

/** Список кастомных карточек (копия массива). Идёт через очередь — видит все начатые записи. */
export function listCustomCards(studyTarget?: RuntimeStudyTarget): Promise<CardItem[]> {
  const target = storageStudyTarget(studyTarget);
  return withWriteLock(target, async () => {
    const cards = await loadFromDisk(target);
    return [...cards];
  });
}

/** Синхронный снапшот кэша (может быть null до первого чтения). Только для отображения. */
export function peekCustomCardsSync(studyTarget?: RuntimeStudyTarget): CardItem[] | null {
  const cached = cacheByTarget[storageStudyTarget(studyTarget)];
  return cached ? [...cached] : null;
}

/** Создать или обновить карточку (по id). Новая — в конец списка. */
export function upsertCustomCard(card: CardItem, studyTarget?: RuntimeStudyTarget): Promise<void> {
  return updateCustomCards((cards) => {
    const idx = cards.findIndex((c) => c.id === card.id);
    if (idx >= 0) {
      const next = [...cards];
      next[idx] = card;
      return next;
    }
    return [...cards, card];
  }, studyTarget).then(() => undefined);
}

/**
 * Удалить карточку. Возвращает снапшот удалённой карточки и её индекс —
 * для undo-восстановления (`restoreCustomCard`). null — карточки уже нет.
 */
export function deleteCustomCard(
  id: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<{ card: CardItem; index: number } | null> {
  let removed: { card: CardItem; index: number } | null = null;
  return updateCustomCards((cards) => {
    const idx = cards.findIndex((c) => c.id === id);
    if (idx < 0) return cards;
    removed = { card: cards[idx], index: idx };
    const next = [...cards];
    next.splice(idx, 1);
    return next;
  }, studyTarget).then(() => removed);
}

/**
 * Undo удаления: вернуть карточку на прежнее место (index клампится в границы).
 * Идемпотентно — если карточка с таким id уже есть (двойной тап «Вернуть»,
 * гонка с облачным restore), ничего не делает.
 */
export function restoreCustomCard(
  card: CardItem,
  index?: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  return updateCustomCards((cards) => {
    if (cards.some((c) => c.id === card.id)) return cards;
    const next = [...cards];
    const at = index == null ? next.length : Math.max(0, Math.min(index, next.length));
    next.splice(at, 0, card);
    return next;
  }, studyTarget).then(() => undefined);
}

/** Только для юнит-тестов: сброс модульного состояния. */
export function __resetCustomCardsStoreForTests(): void {
  cacheByTarget = {};
  writeQueueByTarget = {};
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
