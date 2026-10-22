/**
 * «Позвать» без сети — очередь зовов (идея 1 «Серия вдвоём»).
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html «Нет сети»): без сети кнопка становится «В очереди»,
 * тост «Позовём Марка, как только будет сеть», и зов уходит сам, когда связь вернётся. Очередь живёт на телефоне
 * (AsyncStorage): до отправки Firestore не трогаем, а каждый зов несёт свой requestId — сервер не пошлёт его дважды.
 * Отправку ведёт nudge_client.flushNudgeQueue; здесь только хранение и сеть.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { maskUid } from '../diagnostic_mask';

export const NUDGE_QUEUE_KEY = 'friends_nudge_queue_v1';
/** Сервер пускает не больше 5 зовов в день от одного человека — копить больше незачем. */
export const NUDGE_QUEUE_MAX = 5;
const NET_CHECK_TIMEOUT_MS = 600;

/**
 * Зов в очереди. ownerStableId — аккаунт, который нажал «Позвать».
 * зачем (Ревизор 22.10, 🔴): очередь живёт на телефоне дольше сессии — без владельца зов A ушёл бы от имени B после смены аккаунта.
 */
export type QueuedNudge = Readonly<{ friendUid: string; requestId: string; dayKey: string; queuedAt: number; ownerStableId: string }>;

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function isQueuedNudge(value: unknown): value is QueuedNudge {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.friendUid === 'string' && v.friendUid.length > 0
    && typeof v.requestId === 'string' && v.requestId.length > 0
    && typeof v.dayKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.dayKey)
    && typeof v.queuedAt === 'number' && Number.isFinite(v.queuedAt)
    && typeof v.ownerStableId === 'string' && v.ownerStableId.length > 0;
}

let memoryQueue: readonly QueuedNudge[] | null = null;

/** Очередь с телефона (один раз за запуск, дальше — из памяти). Записи без владельца или битые — выбрасываются. */
export async function readNudgeQueue(): Promise<readonly QueuedNudge[]> {
  if (memoryQueue) return memoryQueue;
  try {
    const raw = await AsyncStorage.getItem(NUDGE_QUEUE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    const valid = list.filter(isQueuedNudge);
    memoryQueue = valid;
    if (valid.length !== list.length) {
      // зачем: запись без владельца нельзя отправить ни от чьего имени — убираем и с телефона, чтобы не читать её снова
      console.warn(`[FRIENDS-NUDGE-QUEUE] drop reason=invalid_entry count=${list.length - valid.length}`); // guard-ok: ранний отсев называет причину
      await writeNudgeQueue(valid);
    }
  } catch (e) {
    console.warn(`[FRIENDS-NUDGE-QUEUE] read failed → пусто: ${errText(e)}`); // guard-ok: catch называет причину
    memoryQueue = [];
  }
  return memoryQueue;
}

/** Очистить очередь целиком (смена аккаунта). Возвращает выброшенные зовы — вызывающий снимает их отметки «позвал сегодня». */
export async function clearNudgeQueue(reason: string): Promise<readonly QueuedNudge[]> {
  const queue = await readNudgeQueue();
  if (queue.length === 0) return queue;
  await writeNudgeQueue([]);
  console.log(`[FRIENDS-NUDGE-QUEUE] clear reason=${reason} size=${queue.length}`); // guard-ok: одна строка на очистку
  return queue;
}

async function writeNudgeQueue(next: readonly QueuedNudge[]): Promise<void> {
  memoryQueue = next;
  try {
    if (next.length === 0) await AsyncStorage.removeItem(NUDGE_QUEUE_KEY);
    else await AsyncStorage.setItem(NUDGE_QUEUE_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn(`[FRIENDS-1] nudge:queue write failed size=${next.length}: ${errText(e)}`); // guard-ok: catch называет причину
  }
}

/** Поставить зов в очередь; повторный зов того же друга заменяет прежний. */
export async function enqueueNudge(entry: QueuedNudge): Promise<void> {
  const queue = await readNudgeQueue();
  const next = [...queue.filter((e) => e.friendUid !== entry.friendUid), entry].slice(-NUDGE_QUEUE_MAX);
  await writeNudgeQueue(next);
  console.log(`[FRIENDS-NUDGE-QUEUE] queued friend=${maskUid(entry.friendUid)} owner=${maskUid(entry.ownerStableId)} requestId=${entry.requestId} day=${entry.dayKey} size=${next.length}`); // guard-ok: одна строка на зов
}

export async function removeQueuedNudge(friendUid: string): Promise<void> {
  const queue = await readNudgeQueue();
  if (!queue.some((e) => e.friendUid === friendUid)) return;
  await writeNudgeQueue(queue.filter((e) => e.friendUid !== friendUid));
}

/** Стоит ли зов в очереди на этот день (синхронно — верно после первого readNudgeQueue). */
export function isNudgeQueued(friendUid: string, dayKey: string): boolean {
  return Boolean(memoryQueue?.some((e) => e.friendUid === friendUid && e.dayKey === dayKey));
}

/** Сегодняшние зовы — к отправке; зовы прошлых дней просрочены: сервер считает лимиты по дню, а друг уже живёт «завтра». */
export function splitNudgeQueue(queue: readonly QueuedNudge[], todayKey: string): Readonly<{ due: readonly QueuedNudge[]; stale: readonly QueuedNudge[] }> {
  return { due: queue.filter((e) => e.dayKey === todayKey), stale: queue.filter((e) => e.dayKey !== todayKey) };
}

/* ---------------------------------- сеть ---------------------------------- */

type NetState = Readonly<{ isConnected: boolean | null; isInternetReachable: boolean | null }>;
type NetInfoLike = Readonly<{
  fetch?: () => Promise<NetState>;
  addEventListener?: (listener: (state: NetState) => void) => () => void;
}>;

function loadNetInfo(): NetInfoLike | null {
  try {
    // зачем: ленивая загрузка, как в phone_state_sync_lifecycle — старый dev-клиент без модуля не падает при старте
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require('@react-native-community/netinfo') as (NetInfoLike & { default?: NetInfoLike }) | null;
    return loaded?.default ?? loaded ?? null;
  } catch (e) {
    console.warn(`[FRIENDS-1] netinfo unavailable → считаем, что сеть есть: ${errText(e)}`); // guard-ok: catch называет причину
    return null;
  }
}

/** Сети точно нет прямо сейчас? Неизвестно (нет модуля, таймаут) → false: пробуем отправить, сбой покажет «Повторить». */
export async function isOfflineNow(): Promise<boolean> {
  const netInfo = loadNetInfo();
  if (!netInfo?.fetch) return false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), NET_CHECK_TIMEOUT_MS); });
    const state = await Promise.race([netInfo.fetch(), timeout]);
    if (!state) {
      console.warn(`[FRIENDS-1] netinfo:fetch timeout ${NET_CHECK_TIMEOUT_MS}ms → считаем, что сеть есть`);
      return false;
    }
    return state.isConnected === false || state.isInternetReachable === false;
  } catch (e) {
    console.warn(`[FRIENDS-1] netinfo:fetch failed → считаем, что сеть есть: ${errText(e)}`); // guard-ok: catch называет причину
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** «Сеть вернулась» (NetInfo вызывает слушателя и сразу после подписки — очередь уйдёт, если сеть уже есть). */
export function subscribeNetworkBack(listener: () => void): () => void {
  const netInfo = loadNetInfo();
  if (!netInfo?.addEventListener) {
    console.warn('[FRIENDS-1] netinfo: подписки нет → очередь уйдёт при следующем открытии приложения'); // guard-ok: лог очереди зовов, баланса тут нет
    return () => undefined;
  }
  return netInfo.addEventListener((state) => {
    if (state.isConnected === true && state.isInternetReachable !== false) listener();
  });
}

/**
 * Сеть есть / нет — тот же признак, что у очереди зовов (isOfflineNow). NetInfo зовёт слушателя и сразу после подписки.
 * зачем (идея 1, полоса «Нет сети · список сохранён»): полоса и тост «В очереди» не должны спорить, есть ли сеть.
 */
export function subscribeOffline(listener: (offline: boolean) => void): () => void {
  const netInfo = loadNetInfo();
  if (!netInfo?.addEventListener) {
    console.warn('[FRIENDS-1] netinfo: подписки нет → полосы «Нет сети» не будет'); // guard-ok: ранний выход называет причину
    return () => undefined;
  }
  return netInfo.addEventListener((state) => {
    listener(state.isConnected === false || state.isInternetReachable === false);
  });
}

/** Только для тестов: сбросить память очереди между сценариями. */
export function __resetNudgeQueueMemoryForTests(): void {
  memoryQueue = null;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
