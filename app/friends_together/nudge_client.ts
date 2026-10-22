/**
 * «Вместе» — «Позвать» друга. Optimistic: локальная отметка ставится ДО ответа
 * сервера. Окончательная ошибка (лимит, тихие часы, дружба) — откат. Сбой сети —
 * один повтор тем же requestId, затем откат к «Позвать» и запомненный requestId:
 * «Повторить» шлёт его же, и сервер узнаёт повтор (nudge:replay) — второго пуша нет.
 * Сети нет ещё до отправки — зов встаёт в очередь (nudge_queue) и уходит сам.
 *
 * Источник: docs/plans/2026-08-16-friends-together-implementation.ru.md §1.3, §4;
 * макет docs/design/v2-app/friends-full.html «Состояния кнопки» (владелец 21.10, идея 1).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { getLocalDayKey } from '../local_date';
import { prepareTogetherSender, type TogetherSenderIdentity } from './sender_identity';
import { getStableId } from '../stable_id';
import {
  clearNudgeQueue,
  enqueueNudge,
  isNudgeQueued,
  isOfflineNow,
  readNudgeQueue,
  removeQueuedNudge,
  splitNudgeQueue,
  subscribeNetworkBack,
} from './nudge_queue';
import { maskUid } from '../diagnostic_mask'; // зачем (координатор 21.10): в журнале метка друга, а не uid целиком
import { noteSwallowedHandler } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const REGION = 'us-central1';
const NUDGED_TODAY_KEY_PREFIX = 'friends_nudged_today_v1';

export type NudgeErrorReason =
  | 'disabled'
  | 'quiet_hours'
  | 'daily_limit'
  | 'sender_limit'
  | 'receiver_limit'
  | 'not_friends'
  | 'network';

/** `queued` — сети нет, зов в очереди (кнопка «В очереди»); уйдёт сам, исход придёт в subscribeQueuedNudgeOutcomes. */
export type NudgeResult =
  | { ok: true; queued?: true }
  | { ok: false; reason: NudgeErrorReason };

/** Исход зова из очереди — экран меняет «В очереди» на «Позвал» / «Уже звал» / «Тихие часы» и показывает тост. */
export type QueuedNudgeOutcome = Readonly<{ friendUid: string; result: NudgeResult }>;

type NudgedTodayMap = Record<string, number>; // friendUid -> ts ms

const log = (line: string): void => { console.log(`[FRIENDS-1] ${line}`); }; // guard-ok: журнал зова, одна строка на шаг

/** зачем (Ревизор 22.10): отметки «позвал сегодня» свои у каждого аккаунта на телефоне — ключ с владельцем (stableId). */
function nudgedTodayKey(owner: string, dayKey: string): string {
  return `${NUDGED_TODAY_KEY_PREFIX}::${owner}::${dayKey}`;
}

async function readNudgedToday(owner: string, dayKey: string): Promise<NudgedTodayMap> {
  try {
    const raw = await AsyncStorage.getItem(nudgedTodayKey(owner, dayKey));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: NudgedTodayMap = {};
    for (const [uid, ts] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof uid === 'string' && Number.isFinite(ts)) out[uid] = Number(ts);
    }
    return out;
  } catch (e) {
    console.warn(`[NUDGE] отметки «позвал сегодня» не прочитаны → пусто: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch называет причину
    return {};
  }
}

async function writeNudgedToday(owner: string, dayKey: string, map: NudgedTodayMap): Promise<void> {
  await AsyncStorage.setItem(nudgedTodayKey(owner, dayKey), JSON.stringify(map)).catch(noteSwallowedHandler('nudge_client:promise_1'));
}

/** Синхронная проверка после prime — последний прочитанный снимок в памяти (владелец + день). */
let _memoryOwner: string | null = null;
let _memoryDayKey = '';
let _memoryMap: NudgedTodayMap = {};

/** Владелец — stableId аккаунта на телефоне (читается без сети). Сбой чтения — пустой владелец: такой зов в очередь не встанет. */
async function readOwner(): Promise<string> {
  try {
    return await getStableId();
  } catch (e) {
    console.warn(`[FRIENDS-NUDGE-QUEUE] owner read failed → без владельца: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch называет причину
    return '';
  }
}

/**
 * Владелец памяти зова. Сменился (выход, вход другим аккаунтом) — память, номера повторов и очередь прежнего владельца
 * сбрасываются, отметки его ждавших зовов снимаются: зов A никогда не уйдёт от имени B, а у A после возврата кнопка снова «Позвать».
 */
async function ensureOwner(): Promise<string> {
  const owner = await readOwner();
  if (_memoryOwner !== null && _memoryOwner !== owner) {
    console.log(`[FRIENDS-NUDGE-QUEUE] reason=owner_changed prev=${maskUid(_memoryOwner)} next=${owner ? maskUid(owner) : '-'} → память и очередь сброшены`); // guard-ok: одна строка на смену владельца
    _memoryDayKey = '';
    _memoryMap = {};
    retryRequestIds = {};
    _memoryOwner = owner;
    const dropped = await clearNudgeQueue('owner_changed');
    for (const entry of dropped) await removeStoredMark(entry.ownerStableId, entry.dayKey, entry.friendUid);
    return owner;
  }
  _memoryOwner = owner;
  return owner;
}

async function ensureMemoryFresh(): Promise<string> {
  const owner = await ensureOwner();
  const dayKey = getLocalDayKey();
  if (_memoryDayKey === dayKey) return owner;
  _memoryDayKey = dayKey;
  _memoryMap = await readNudgedToday(owner, dayKey);
  return owner;
}

async function markNudged(dayKey: string, uid: string): Promise<void> {
  if (_memoryDayKey !== dayKey || _memoryOwner === null) return;
  _memoryMap = { ..._memoryMap, [uid]: Date.now() };
  await writeNudgedToday(_memoryOwner, dayKey, _memoryMap);
}

/** Откат ТОЛЬКО этого друга: соседний зов, отмеченный за время ожидания, не стирается. */
async function unmarkNudged(dayKey: string, uid: string): Promise<void> {
  if (_memoryDayKey !== dayKey || _memoryOwner === null || !_memoryMap[uid]) return;
  const { [uid]: _removed, ...rest } = _memoryMap;
  _memoryMap = rest;
  await writeNudgedToday(_memoryOwner, dayKey, _memoryMap);
}

/** Снять отметку зова у его владельца (зов не ушёл) — в памяти, если это текущий владелец и день, иначе прямо на телефоне. */
async function removeStoredMark(owner: string, dayKey: string, uid: string): Promise<void> {
  if (owner === _memoryOwner && dayKey === _memoryDayKey) {
    await unmarkNudged(dayKey, uid);
    return;
  }
  const stored = await readNudgedToday(owner, dayKey);
  if (!stored[uid]) return;
  const { [uid]: _removed, ...rest } = stored;
  await writeNudgedToday(owner, dayKey, rest);
}

/** Уже позвали этого друга сегодня? (после первого refresh синхронно верно для текущего дня) */
export function isNudgedToday(friendUid: string): boolean {
  const dayKey = getLocalDayKey();
  if (_memoryDayKey !== dayKey) return false; // ещё не прогрето — вызывающий должен был await prime
  return !!_memoryMap[friendUid];
}

/** Зов этому другу сегодня ждёт сети? (кнопка «В очереди») */
export function isNudgeQueuedToday(friendUid: string): boolean {
  return isNudgeQueued(friendUid, getLocalDayKey());
}

/** Прогреть кэш «уже позвал сегодня» и очередь — вызывать перед первым рендером списка друзей. */
export async function primeNudgedTodayCache(): Promise<void> {
  await ensureMemoryFresh();
  const queue = await readNudgeQueue();
  if (queue.length > 0) {
    // зачем: зов, поставленный без сети в прошлый запуск, уходит при следующем открытии списка
    ensureQueueFlusher();
    void flushNudgeQueue('prime');
  }
}

function makeRequestId(): string {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `ftn_${now}_${rand}`;
}

function classifyNudgeError(error: unknown): NudgeErrorReason {
  const err = error as { code?: unknown; message?: unknown };
  const text = `${String(err?.code ?? '')} ${String(err?.message ?? error ?? '')}`.toLowerCase();
  if (text.includes('disabled')) return 'disabled';
  if (text.includes('quiet_hours')) return 'quiet_hours';
  if (text.includes('daily_limit')) return 'daily_limit';
  if (text.includes('sender_limit')) return 'sender_limit';
  if (text.includes('receiver_limit')) return 'receiver_limit';
  if (text.includes('not_friends')) return 'not_friends';
  return 'network';
}

function isRetryableNudgeError(reason: NudgeErrorReason): boolean {
  return reason === 'network';
}

const inFlight = new Set<string>();
/** requestId последней попытки, упавшей по сети, — ключ `${день}::${друг}`. «Повторить» шлёт его же. */
let retryRequestIds: Readonly<Record<string, string>> = {};
const retryKey = (dayKey: string, uid: string): string => `${dayKey}::${uid}`;

async function sendOnce(sender: TogetherSenderIdentity, uid: string, requestId: string): Promise<NudgeResult> {
  try {
    // зачем: сервер требует stableId и берёт имя зовущего из senderDisplayName —
    // иначе пуш уйдёт как «Friend» (аудит 2026-08-17).
    const fn = httpsCallable<
      { stableId: string; friendUid: string; requestId: string; senderDisplayName?: string },
      { ok: boolean }
    >(getFunctions(getApp(), REGION), 'friendsNudge');
    await fn({
      stableId: sender.stableId,
      friendUid: uid,
      requestId,
      ...(sender.displayName ? { senderDisplayName: sender.displayName } : {}),
    });
    return { ok: true };
  } catch (error) {
    const reason = classifyNudgeError(error);
    log(`nudge:callable_error friend=${maskUid(uid)} requestId=${requestId} reason=${reason} raw="${String((error as { message?: unknown })?.message ?? error).slice(0, 160)}"`);
    return { ok: false, reason };
  }
}

/** Попытка + один повтор тем же requestId при сбое сети — сервер идемпотентен по нему. */
async function sendWithRetry(sender: TogetherSenderIdentity, uid: string, requestId: string): Promise<NudgeResult> {
  const first = await sendOnce(sender, uid, requestId);
  if (first.ok || !isRetryableNudgeError(first.reason)) return first;
  return sendOnce(sender, uid, requestId);
}

/**
 * Позвать друга. Optimistic-порядок: отметка → callable. Двойной тап на того же
 * друга, пока предыдущий вызов не завершился, игнорируется (защита от гонки).
 */
export async function nudgeFriend(friendUid: string): Promise<NudgeResult> {
  const uid = String(friendUid || '').trim();
  if (!uid) {
    log('nudge:skip reason=empty_uid');
    return { ok: false, reason: 'not_friends' };
  }
  if (inFlight.has(uid)) {
    log(`nudge:skip reason=in_flight friend=${maskUid(uid)}`);
    return { ok: false, reason: 'network' }; // тап уже в полёте — тихо игнорируем повтор
  }
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    log(`nudge:skip reason=cloud_off expoGo=${IS_EXPO_GO} cloudSync=${CLOUD_SYNC_ENABLED} friend=${maskUid(uid)}`);
    return { ok: false, reason: 'network' };
  }

  inFlight.add(uid);
  try {
    const owner = await ensureMemoryFresh();
    const dayKey = _memoryDayKey;
    if (_memoryMap[uid]) {
      const queued = isNudgeQueued(uid, dayKey);
      log(`nudge:skip reason=already_today friend=${maskUid(uid)} queued=${queued}`);
      return queued ? { ok: true, queued: true } : { ok: true }; // уже позвали сегодня — идемпотентно ok
    }
    const key = retryKey(dayKey, uid);
    const requestId = retryRequestIds[key] ?? makeRequestId();

    // 0) Сети нет — в очередь (макет «Нет сети»): отметка + очередь; отправителя готовим уже при отправке,
    //    офлайн он не собирается (нужна связка аккаунта).
    if (await isOfflineNow()) {
      if (!owner) {
        // зачем (Ревизор 22.10): зов без владельца нельзя отправить потом ни от чьего имени — в очередь не ставим
        console.warn(`[FRIENDS-NUDGE-QUEUE] skip reason=no_owner friend=${maskUid(uid)}`); // guard-ok: ранний выход называет причину
        return { ok: false, reason: 'network' };
      }
      await markNudged(dayKey, uid);
      await enqueueNudge({ friendUid: uid, requestId, dayKey, queuedAt: Date.now(), ownerStableId: owner });
      ensureQueueFlusher();
      return { ok: true, queued: true };
    }

    // 1) Идентичность отправителя — ДО оптимистичной отметки: если её нет, вызов не уйдёт,
    //    и отмечать нечего (аудит 2026-08-17: сервер требует stableId и имя для пуша).
    const sender = await prepareTogetherSender();
    if (!sender) {
      log(`nudge:skip reason=no_sender_identity friend=${maskUid(uid)}`);
      return { ok: false, reason: 'network' };
    }

    // 2) Optimistic: отмечаем ДО ответа сервера.
    await markNudged(dayKey, uid);
    const result = await sendWithRetry(sender, uid, requestId);

    if (!result.ok) await unmarkNudged(dayKey, uid);
    // зачем (макет «Нет сети — попробуй ещё раз» + «Повторить»): после сбоя сети кнопка снова «Позвать», а requestId запомнен —
    // если сервер всё же принял зов, повтор вернёт прежний ответ без второго пуша; лимит «раз в день» сервер держит сам.
    // Успех или окончательный ответ сервера — номер израсходован, следующий зов получит новый.
    const { [key]: _spent, ...restIds } = retryRequestIds;
    retryRequestIds = !result.ok && isRetryableNudgeError(result.reason) ? { ...restIds, [key]: requestId } : restIds;
    log(`nudge:result friend=${maskUid(uid)} requestId=${requestId} ok=${result.ok}${result.ok ? '' : ` reason=${result.reason}`}`);
    return result;
  } finally {
    inFlight.delete(uid);
  }
}

/* ------------------------------ очередь без сети ------------------------------ */

const outcomeListeners = new Set<(outcome: QueuedNudgeOutcome) => void>();

/** Подписка экрана на исходы зовов из очереди. */
export function subscribeQueuedNudgeOutcomes(listener: (outcome: QueuedNudgeOutcome) => void): () => void {
  outcomeListeners.add(listener); // guard-ok: слушатель в памяти, не запись данных
  return () => { outcomeListeners.delete(listener); };
}

function notifyOutcome(outcome: QueuedNudgeOutcome): void {
  outcomeListeners.forEach((listener) => {
    try {
      listener(outcome);
    } catch (e) {
      console.warn(`[FRIENDS-1] nudge:outcome listener failed friend=${maskUid(outcome.friendUid)}: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch называет причину
    }
  });
}

let stopFlusher: (() => void) | null = null;

/** Слушать «сеть вернулась» и возврат в приложение, пока в очереди есть зовы. */
function ensureQueueFlusher(): void {
  if (stopFlusher) return;
  const unsubscribeNet = subscribeNetworkBack(() => { void flushNudgeQueue('network_back'); });
  const appStateSub = AppState.addEventListener('change', (state) => {
    if (state === 'active') void flushNudgeQueue('foreground');
  });
  stopFlusher = () => {
    unsubscribeNet();
    appStateSub.remove();
  };
}

function stopQueueFlusher(): void {
  stopFlusher?.();
  stopFlusher = null;
}

let flushing: Promise<void> | null = null;

/** Отправить зовы из очереди. Повторный вызов во время отправки ждёт ту же отправку. */
export function flushNudgeQueue(trigger: string): Promise<void> {
  if (flushing) {
    log(`nudge:flush skip reason=already_flushing trigger=${trigger}`);
    return flushing;
  }
  flushing = runFlush(trigger).finally(() => { flushing = null; });
  return flushing;
}

async function runFlush(trigger: string): Promise<void> {
  // зачем (Ревизор 22.10, 🔴): владелец — ПЕРВЫМ. Сменился — очередь прежнего уже сброшена, читаем то, что осталось
  const owner = await ensureMemoryFresh();
  const queue = await readNudgeQueue();
  if (queue.length === 0) {
    log(`nudge:flush skip reason=empty trigger=${trigger}`);
    stopQueueFlusher();
    return;
  }
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    log(`nudge:flush skip reason=cloud_off trigger=${trigger} size=${queue.length}`);
    return;
  }
  if (await isOfflineNow()) {
    log(`nudge:flush skip reason=offline trigger=${trigger} size=${queue.length}`);
    return;
  }
  const { due, stale } = splitNudgeQueue(queue, _memoryDayKey);
  for (const entry of stale) {
    await removeQueuedNudge(entry.friendUid);
    log(`nudge:flush drop reason=stale_day friend=${maskUid(entry.friendUid)} day=${entry.dayKey} today=${_memoryDayKey}`);
  }
  // Запуск уже под другим аккаунтом (память прежнего владельца не дожила): зов чужого владельца выбрасывается, его отметка снимается
  const own = due.filter((entry) => owner !== '' && entry.ownerStableId === owner);
  for (const entry of due.filter((e) => !own.includes(e))) {
    await removeQueuedNudge(entry.friendUid);
    await removeStoredMark(entry.ownerStableId, entry.dayKey, entry.friendUid);
    console.warn(`[FRIENDS-NUDGE-QUEUE] drop reason=owner_changed friend=${maskUid(entry.friendUid)} owner=${maskUid(entry.ownerStableId)} current=${owner ? maskUid(owner) : '-'}`); // guard-ok: выброшенный зов называет причину
  }
  if (own.length === 0) {
    stopQueueFlusher();
    return;
  }
  const sender = await prepareTogetherSender();
  if (!sender) {
    log(`nudge:flush skip reason=no_sender_identity trigger=${trigger} size=${own.length}`);
    return;
  }
  if (sender.stableId !== owner) {
    // зачем: отправитель — не тот, чьи зовы в очереди (гонка смены аккаунта) — не шлём ни одного, следующая проверка владельца их уберёт
    console.warn(`[FRIENDS-NUDGE-QUEUE] skip reason=sender_mismatch owner=${maskUid(owner)} sender=${maskUid(sender.stableId)} size=${own.length}`); // guard-ok: ранний выход называет причину
    return;
  }
  log(`nudge:flush start trigger=${trigger} due=${own.length}`);
  for (const entry of own) {
    await flushEntry(sender, entry.friendUid, entry.requestId, entry.dayKey);
  }
  if ((await readNudgeQueue()).length === 0) stopQueueFlusher();
}

async function flushEntry(sender: TogetherSenderIdentity, uid: string, requestId: string, dayKey: string): Promise<void> {
  if (inFlight.has(uid)) {
    log(`nudge:flush skip reason=in_flight friend=${maskUid(uid)}`);
    return;
  }
  inFlight.add(uid);
  try {
    const result = await sendWithRetry(sender, uid, requestId);
    if (!result.ok && isRetryableNudgeError(result.reason)) {
      log(`nudge:flush keep reason=network friend=${maskUid(uid)} requestId=${requestId}`);
      return;
    }
    await removeQueuedNudge(uid);
    if (!result.ok) await unmarkNudged(dayKey, uid);
    log(`nudge:flush sent friend=${maskUid(uid)} requestId=${requestId} ok=${result.ok}${result.ok ? '' : ` reason=${result.reason}`}`);
    notifyOutcome({ friendUid: uid, result });
  } finally {
    inFlight.delete(uid);
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
