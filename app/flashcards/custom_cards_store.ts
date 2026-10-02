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
import { captureAccountsV2OwnerUid, produceAccountsV2ChangeIfEnabled } from '../accounts_v2_client_flag';
import { CUSTOM_CARD_OWNER_ALERT_MILESTONE } from './custom_card_access';
import {
  captureCustomCardMilestoneOwner,
  observeCustomCardMilestone,
  type CustomCardMilestoneOwner,
} from './custom_card_milestone';
import { forgetCardDeletions, recordCardDeletions } from './card_deletion_journal';
import { noteSwallowedAs } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export {
  CUSTOM_CARD_OWNER_ALERT_MILESTONE,
  FREE_CUSTOM_CARD_LIMIT,
  PLUS_CUSTOM_CARD_LIMIT,
} from './custom_card_access';

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

async function commit(
  previous: CardItem[],
  cards: CardItem[],
  target: StudyTarget,
  milestoneOwner: CustomCardMilestoneOwner,
  v2Owner: string | null,
): Promise<void> {
  // Encrypted local state commits first; AsyncStorage is a compatibility mirror.
  // If the new store is locally unavailable, the existing durable mirror keeps
  // the user's action and the next opening import retries silently.
  await commitPhoneStateCustomCards(previous, cards).catch(noteSwallowedAs('custom_cards_store:promise_1', undefined));
  await AsyncStorage.setItem(customFlashcardsKey(target), JSON.stringify(cards));
  cacheByTarget[target] = cards;
  // зачем (Account V2, 6F, dual-write): снимок своих карточек → операции V2. Фоном, за флагом.
  produceAccountsV2ChangeIfEnabled(v2Owner, () => ({ kind: 'card_snapshot', target, list: 'custom', cards }));
  // Saving is already durable. Owner telemetry is deliberately detached and
  // fail-open: offline/auth/Telegram failures can never become a card error.
  if (cards.length >= CUSTOM_CARD_OWNER_ALERT_MILESTONE && cards.length >= previous.length) {
    void observeCustomCardMilestone(cards.length, target, milestoneOwner).catch(noteSwallowedAs('custom_cards_store:promise_2', undefined));
  }
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
  // Capture before any awaited disk work: if an account switch happens during
  // the save, the old library count must never be attributed to the new owner.
  const milestoneOwner = captureCustomCardMilestoneOwner();
  // зачем (6F ремонт №1, P2): владелец V2-операции — аккаунт в момент записи, не в момент постановки.
  const v2Owner = captureAccountsV2OwnerUid();
  return withWriteLock(target, async () => {
    const current = await loadFromDisk(target);
    const next = mutator(current);
    if (next !== current) {
      await commit(current, next, target, milestoneOwner, v2Owner);
    }
    return next;
  });
}

/** Список кастомных карточек (копия массива). Идёт через очередь — видит все начатые записи. */
export function listCustomCards(studyTarget?: RuntimeStudyTarget): Promise<CardItem[]> {
  const target = storageStudyTarget(studyTarget);
  const milestoneOwner = captureCustomCardMilestoneOwner();
  return withWriteLock(target, async () => {
    const cards = await loadFromDisk(target);
    // Also covers eligible libraries restored from cloud or created by an
    // older build: opening/reading the library schedules the same idempotent
    // account+language milestone without blocking the read.
    if (cards.length >= CUSTOM_CARD_OWNER_ALERT_MILESTONE) {
      void observeCustomCardMilestone(cards.length, target, milestoneOwner).catch(noteSwallowedAs('custom_cards_store:promise_3', undefined));
    }
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
      // зачем (Account V2, 7E): время правки человеком — удаление с другого устройства
      // уберёт карточку при гидрации, только если оно свежее этой правки.
      next[idx] = { ...card, updatedAt: Date.now() };
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
  }, studyTarget).then(() => {
    // зачем (Account V2, 7D): факт явного удаления — в журнал (после успешной записи),
    // чтобы перенос/restore/гидрация не вернули карточку. Фоном, UI не ждёт.
    const gone = removed as { card: CardItem; index: number } | null;
    if (gone !== null) void recordCardDeletions(storageStudyTarget(studyTarget), 'custom', [gone.card.id]);
    return removed;
  });
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
  }, studyTarget).then(() => {
    // зачем (Account V2, 7D): «Вернуть» отменяет удаление — снимаем запись журнала
    // (7E: и когда карточка уже была на месте — мутатор вернул тот же массив).
    forgetRestoredCustomCardDeletion(card.id, studyTarget);
  });
}

/**
 * 7E: запись журнала не снялась (сбой хранилища) — освежаем время правки своей
 * карточки (updatedAt), чтобы гидрация не убрала возвращённую карточку. Фоном:
 * «Вернуть» не ждёт хранилище журнала.
 */
function forgetRestoredCustomCardDeletion(id: string, studyTarget?: RuntimeStudyTarget): void {
  const target = storageStudyTarget(studyTarget);
  void forgetCardDeletions(target, 'custom', [id]).then(async (forgotten) => {
    if (forgotten) return;
    console.warn('[ACCOUNT-V2] journal restore_forget_failed -> touch list=custom');
    let touched = false;
    await updateCustomCards((cards) => {
      if (!cards.some((c) => c.id === id)) return cards;
      touched = true;
      const now = Date.now();
      return cards.map((c) => (c.id === id ? { ...c, updatedAt: now } : c));
    }, target);
    if (!touched) console.warn('[ACCOUNT-V2] journal restore_touch_skip reason=card_absent list=custom');
  }).catch((error: unknown) => {
    console.warn(`[ACCOUNT-V2] journal restore_touch_failed kind=${error instanceof Error ? error.name : typeof error} list=custom`);
  });
}

/** Только для юнит-тестов: сброс модульного состояния. */
export function __resetCustomCardsStoreForTests(): void {
  cacheByTarget = {};
  writeQueueByTarget = {};
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
