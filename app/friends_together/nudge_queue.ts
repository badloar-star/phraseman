/**
 * «Позвать» без сети — очередь зовов (идея 1 «Серия вдвоём»).
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html «Нет сети»): без сети кнопка становится «В очереди»,
 * тост «Позовём Марка, как только будет сеть», и зов уходит сам, когда связь вернётся. Очередь живёт на телефоне
 * (AsyncStorage): до отправки Firestore не трогаем, а каждый зов несёт свой requestId — сервер не пошлёт его дважды.
 * Отправку ведёт nudge_client.flushNudgeQueue; здесь только хранение и сеть.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const NUDGE_QUEUE_KEY = 'friends_nudge_queue_v1';
/** Сервер пускает не больше 5 зовов в день от одного человека — копить больше незачем. */
export const NUDGE_QUEUE_MAX = 5;
const NET_CHECK_TIMEOUT_MS = 600;

export type QueuedNudge = Readonly<{ friendUid: string; requestId: string; dayKey: string; queuedAt: number }>;

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function isQueuedNudge(value: unknown): value is QueuedNudge {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.friendUid === 'string' && v.friendUid.length > 0
    && typeof v.requestId === 'string' && v.requestId.length > 0
    && typeof v.dayKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.dayKey)
    && typeof v.queuedAt === 'number' && Number.isFinite(v.queuedAt);
}

let memoryQueue: readonly QueuedNudge[] | null = null;

/** Очередь с телефона (один раз за запуск, дальше — из памяти). */
export async function readNudgeQueue(): Promise<readonly QueuedNudge[]> {
  if (memoryQueue) return memoryQueue;
  try {
    const raw = await AsyncStorage.getItem(NUDGE_QUEUE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    memoryQueue = Array.isArray(parsed) ? parsed.filter(isQueuedNudge) : [];
  } catch (e) {
    console.warn(`[FRIENDS-1] nudge:queue read failed → пусто: ${errText(e)}`); // guard-ok: catch называет причину
    memoryQueue = [];
  }
  return memoryQueue;
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
  console.log(`[FRIENDS-1] nudge:queued friend=${entry.friendUid} requestId=${entry.requestId} day=${entry.dayKey} size=${next.length}`); // guard-ok: одна строка на зов
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

/** Только для тестов: сбросить память очереди между сценариями. */
export function __resetNudgeQueueMemoryForTests(): void {
  memoryQueue = null;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
