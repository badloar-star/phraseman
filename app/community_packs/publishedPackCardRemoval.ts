/**
 * Удаление карточки из СВОЕГО опубликованного набора: 5 с на «Вернуть», затем один вызов сервера.
 *
 * зачем (сессия 3 «Карточки» через координатора 04.10): у раскрытой карточки своего набора есть
 * «Удалить» с тостом «Вернуть». Для опубликованного набора (cloudPackId) правка возможна только через
 * сервер. Схема дешёвая: «Вернуть» отменяет всё на устройстве и в сеть ничего не уходит; через 5 с —
 * ОДИН вызов communityAuthorRemoveCard. Запись в очереди кладётся на диск СРАЗУ (со временем отправки),
 * поэтому удаление не теряется, если приложение закрыли посреди окна или до ответа сервера.
 *
 * Экран (сессия 3, deletePackCard) прячет карточку сам и подписывается на итог через onSettled /
 * subscribePublishedPackCardRemoval: отказ → вернуть карточку и показать причину.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { captureAccountGeneration } from '../account_generation';
import { invalidateCommunityPackCatalog } from './communityFirestore';
import { callCommunityAuthorRemoveCard, type CommunityAuthorRemoveCardResult } from './functionsClient';
import { loadLocalAuthorPacks, saveLocalAuthorPack, type LocalAuthorPack } from './localAuthorPacks';
import type { CommunityPackCardPayload, CommunityPackSubmissionPayload } from './schema';

const LOG = '[PACK-CARD-REMOVE]';
export const PUBLISHED_PACK_CARD_REMOVE_OUTBOX_KEY = 'published_pack_card_remove_outbox_v1';
/** Окно «Вернуть». */
export const PUBLISHED_PACK_CARD_REMOVE_UNDO_MS = 5_000;
/** Сколько раз повторяем сетевой сбой, прежде чем снять запись и вернуть карточку. */
const MAX_NETWORK_ATTEMPTS = 6;

export type PublishedPackCardRemovalEntry = Readonly<{
  key: string;
  cloudPackId: string;
  cardId: string;
  stableId: string;
  sendAfter: number;
  attempts: number;
}>;

export type PublishedPackCardRemovalOutcome =
  | Readonly<{ kind: 'removed'; key: string; cloudPackId: string; cardId: string; cardCount: number }>
  | Readonly<{
    kind: 'refused';
    key: string;
    cloudPackId: string;
    cardId: string;
    reason: Extract<CommunityAuthorRemoveCardResult, { ok: false }>['reason'] | 'network';
    cardCount?: number;
  }>;

type Listener = (outcome: PublishedPackCardRemovalOutcome) => void;

const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let outboxWrites: Promise<unknown> = Promise.resolve();
let flushInFlight: Promise<void> | null = null;

/** Сырой id карточки в документе набора: в приложении карточка живёт как `<packId>_<id>`. */
export function rawPackCardId(cloudPackId: string, cardId: string): string {
  const prefix = `${cloudPackId}_`;
  return cardId.startsWith(prefix) ? cardId.slice(prefix.length) : cardId;
}

function entryKey(cloudPackId: string, cardId: string): string {
  return `${cloudPackId}::${cardId}`;
}

function parseOutbox(raw: string | null): PublishedPackCardRemovalEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(LOG, 'outbox:not_array', typeof parsed);
      return [];
    }
    return parsed.filter((item): item is PublishedPackCardRemovalEntry => Boolean(
      item && typeof item === 'object'
      && typeof (item as PublishedPackCardRemovalEntry).key === 'string'
      && typeof (item as PublishedPackCardRemovalEntry).cloudPackId === 'string'
      && typeof (item as PublishedPackCardRemovalEntry).cardId === 'string',
    ));
  } catch (error) {
    console.warn(LOG, 'outbox:parse_failed', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/** Все изменения очереди — последовательно, чтобы два быстрых удаления не затёрли друг друга. */
function mutateOutbox<T>(change: (entries: PublishedPackCardRemovalEntry[]) => { next: PublishedPackCardRemovalEntry[]; result: T }): Promise<T> {
  const run = outboxWrites.then(async () => {
    const entries = parseOutbox(await AsyncStorage.getItem(PUBLISHED_PACK_CARD_REMOVE_OUTBOX_KEY));
    const { next, result } = change(entries);
    await AsyncStorage.setItem(PUBLISHED_PACK_CARD_REMOVE_OUTBOX_KEY, JSON.stringify(next));
    return result;
  });
  outboxWrites = run.catch((error: unknown) => {
    console.warn(LOG, 'outbox:write_failed', error instanceof Error ? error.message : String(error));
  });
  return run;
}

function emit(outcome: PublishedPackCardRemovalOutcome): void {
  console.log(LOG, 'outcome', JSON.stringify(outcome));
  for (const listener of listeners) {
    try {
      listener(outcome);
    } catch (error) {
      console.warn(LOG, 'listener_failed', error instanceof Error ? error.message : String(error));
    }
  }
}

/** Итоги удалений, в т.ч. отправленных после перезапуска (экран откатывает отказ). */
export function subscribePublishedPackCardRemoval(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function packPayload(pack: LocalAuthorPack, cards: CommunityPackCardPayload[]): CommunityPackSubmissionPayload {
  return {
    title: pack.title,
    description: pack.description,
    cardThemeKey: (pack.cardThemeKey || undefined) as CommunityPackSubmissionPayload['cardThemeKey'],
    cards,
    packLanguage: pack.packLanguage,
    priceRunes: pack.priceRunes,
    studyTarget: pack.studyTarget,
  };
}

/** После ответа сервера локальная копия набора (по cloudPackId) повторяет его — без «прыжка» карточки обратно. */
async function applyRemovalToLocalPack(cloudPackId: string, rawCardId: string): Promise<void> {
  const pack = (await loadLocalAuthorPacks()).find((item) => item.cloudPackId === cloudPackId);
  if (!pack) {
    console.log(LOG, 'local:no_copy', JSON.stringify({ cloudPackId }));
    return;
  }
  const cards = pack.cards.filter((card) => card.id !== rawCardId);
  if (cards.length === pack.cards.length) {
    console.log(LOG, 'local:card_absent', JSON.stringify({ cloudPackId, rawCardId, cards: pack.cards.length }));
    return;
  }
  await saveLocalAuthorPack(packPayload(pack, cards), {
    packId: pack.id,
    studyTarget: pack.studyTarget,
    cloudPackId: pack.cloudPackId,
    authorStableId: pack.authorStableId,
    isPremium: true, // набор уже существует — лимит новых наборов не применяется
  });
  console.log(LOG, 'local:applied', JSON.stringify({ cloudPackId, rawCardId, left: cards.length }));
}

async function sendEntry(entry: PublishedPackCardRemovalEntry): Promise<void> {
  const startedAt = Date.now();
  let response: CommunityAuthorRemoveCardResult;
  try {
    response = await callCommunityAuthorRemoveCard({ packId: entry.cloudPackId, cardId: entry.cardId });
  } catch (error) {
    const attempts = entry.attempts + 1;
    console.warn(LOG, 'send:network_failed', JSON.stringify({
      key: entry.key, attempts, ms: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error),
    }));
    if (attempts >= MAX_NETWORK_ATTEMPTS) {
      await mutateOutbox((entries) => ({ next: entries.filter((item) => item.key !== entry.key), result: undefined }));
      emit({ kind: 'refused', key: entry.key, cloudPackId: entry.cloudPackId, cardId: entry.cardId, reason: 'network' });
      return;
    }
    // Остаётся в очереди: повтор при следующем flush (вход в приложение / следующее удаление).
    await mutateOutbox((entries) => ({
      next: entries.map((item) => (item.key === entry.key ? { ...item, attempts } : item)),
      result: undefined,
    }));
    return;
  }
  console.log(LOG, 'send:response', JSON.stringify({ key: entry.key, ms: Date.now() - startedAt, ...response }));
  await mutateOutbox((entries) => ({ next: entries.filter((item) => item.key !== entry.key), result: undefined }));
  if (response.ok) {
    await applyRemovalToLocalPack(entry.cloudPackId, rawPackCardId(entry.cloudPackId, entry.cardId))
      .catch((error: unknown) => console.warn(LOG, 'local:apply_failed', error instanceof Error ? error.message : String(error)));
    invalidateCommunityPackCatalog();
    emit({ kind: 'removed', key: entry.key, cloudPackId: entry.cloudPackId, cardId: entry.cardId, cardCount: response.cardCount });
    return;
  }
  emit({
    kind: 'refused', key: entry.key, cloudPackId: entry.cloudPackId, cardId: entry.cardId,
    reason: response.reason, ...(response.cardCount === undefined ? {} : { cardCount: response.cardCount }),
  });
}

/**
 * Отправить созревшие записи. Зовётся по таймеру окна и при входе в приложение/раздел (одно чтение
 * диска; сети нет, если очередь пуста). Записи другого аккаунта не отправляются.
 */
export function flushPublishedPackCardRemovals(now: number = Date.now()): Promise<void> {
  if (flushInFlight) return flushInFlight;
  flushInFlight = (async () => {
    const stableId = captureAccountGeneration().stableId;
    const entries = parseOutbox(await AsyncStorage.getItem(PUBLISHED_PACK_CARD_REMOVE_OUTBOX_KEY));
    const due = entries.filter((entry) => entry.sendAfter <= now && !timers.has(entry.key));
    if (!due.length) return;
    console.log(LOG, 'flush', JSON.stringify({ queued: entries.length, due: due.length }));
    for (const entry of due) {
      if (!stableId || entry.stableId !== stableId) {
        console.log(LOG, 'flush:skip_other_account', JSON.stringify({ key: entry.key, hasAccount: Boolean(stableId) }));
        continue;
      }
      await sendEntry(entry);
    }
  })()
    .catch((error: unknown) => console.warn(LOG, 'flush:failed', error instanceof Error ? error.message : String(error)))
    .finally(() => { flushInFlight = null; });
  return flushInFlight;
}

export type PublishedPackCardRemovalHandle = Readonly<{
  key: string;
  /** «Вернуть»: true — удаление отменено до отправки; false — окно уже закрыто. */
  undo: () => Promise<boolean>;
}>;

/**
 * Поставить удаление карточки. Экран прячет карточку САМ и сразу; здесь — только очередь и отправка.
 * `cardId` — id карточки в приложении (`<cloudPackId>_<id>`) или сырой id из документа набора.
 */
export async function schedulePublishedPackCardRemoval(params: {
  cloudPackId: string;
  cardId: string;
  onSettled?: Listener;
  undoMs?: number;
}): Promise<PublishedPackCardRemovalHandle> {
  const { cloudPackId, cardId } = params;
  const key = entryKey(cloudPackId, cardId);
  const stableId = captureAccountGeneration().stableId ?? '';
  const undoMs = params.undoMs ?? PUBLISHED_PACK_CARD_REMOVE_UNDO_MS;
  const sendAfter = Date.now() + undoMs;
  console.log(LOG, 'schedule', JSON.stringify({ cloudPackId, cardId, undoMs, hasAccount: Boolean(stableId) }));
  await mutateOutbox((entries) => ({
    // Повторный тап по той же карточке не плодит вторую запись.
    next: [...entries.filter((item) => item.key !== key), { key, cloudPackId, cardId, stableId, sendAfter, attempts: 0 }],
    result: undefined,
  }));
  let unsubscribe: (() => void) | null = null;
  if (params.onSettled) {
    const onSettled = params.onSettled;
    unsubscribe = subscribePublishedPackCardRemoval((outcome) => {
      if (outcome.key !== key) return;
      unsubscribe?.();
      onSettled(outcome);
    });
  }
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    void flushPublishedPackCardRemovals();
  }, undoMs));
  return {
    key,
    undo: async () => {
      const timer = timers.get(key);
      if (!timer) {
        console.log(LOG, 'undo:too_late', JSON.stringify({ key }));
        return false;
      }
      clearTimeout(timer);
      timers.delete(key);
      unsubscribe?.();
      await mutateOutbox((entries) => ({ next: entries.filter((item) => item.key !== key), result: undefined }));
      console.log(LOG, 'undo:cancelled_locally', JSON.stringify({ key }));
      return true;
    },
  };
}

export default function __PublishedPackCardRemovalRouteShim() {
  return null;
}
