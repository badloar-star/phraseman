/**
 * Связь «список фраз ↔ плеер» без протаскивания пропсов через экраны.
 *
 * зачем (владелец 2026-09-25): тап по фразе перематывает видео к моменту, где
 * она звучит, а текущая фраза подсвечивается. Плеер и список живут в разных
 * ветках дерева (карточка ролика, герой, Главная), поэтому общаются через этот
 * крошечный канал, привязанный к videoId. Никакой сети, никакого хранилища.
 *
 * Одновременно играет максимум один плеер (родители держат ровно один
 * activeVideoId), поэтому на videoId — один обработчик перемотки.
 */

type SeekHandler = (seconds: number) => void;
type PositionListener = (positionSec: number) => void;

const seekHandlers = new Map<string, SeekHandler>();
const positionListeners = new Map<string, Set<PositionListener>>();
/** Перемотка, запрошенная до того, как плеер этого ролика появился на экране. */
let pendingSeek: { videoId: string; seconds: number; atMs: number } | null = null;
/** Отложенная перемотка живёт недолго: иначе старый тап сработал бы через минуты. */
const PENDING_TTL_MS = 15_000;

export function registerYoutubeSeekHandler(videoId: string, handler: SeekHandler): () => void {
  seekHandlers.set(videoId, handler);
  return () => {
    if (seekHandlers.get(videoId) === handler) seekHandlers.delete(videoId);
  };
}

/** true — плеер этого ролика открыт и получил команду; false — плеера нет. */
export function requestYoutubeSeek(videoId: string, seconds: number): boolean {
  const handler = seekHandlers.get(videoId);
  if (handler) {
    pendingSeek = null;
    handler(seconds);
    return true;
  }
  pendingSeek = { videoId, seconds, atMs: Date.now() };
  if (__DEV__) console.log(`[VIDEO-SEEK] плеера ${videoId} нет — перемотка на ${seconds}s отложена до его открытия`);
  return false;
}

/** Плеер забирает отложенную перемотку, когда YouTube внутри него готов. */
export function takePendingYoutubeSeek(videoId: string): number | null {
  const pending = pendingSeek;
  if (!pending || pending.videoId !== videoId) return null;
  pendingSeek = null;
  if (Date.now() - pending.atMs > PENDING_TTL_MS) {
    if (__DEV__) console.log(`[VIDEO-SEEK] отложенная перемотка ${videoId} устарела — пропущена`);
    return null;
  }
  return pending.seconds;
}

export function publishYoutubePosition(videoId: string, positionSec: number): void {
  positionListeners.get(videoId)?.forEach((listener) => listener(positionSec));
}

export function subscribeYoutubePosition(videoId: string, listener: PositionListener): () => void {
  const set = positionListeners.get(videoId) ?? new Set<PositionListener>();
  set.add(listener);
  positionListeners.set(videoId, set);
  return () => {
    set.delete(listener);
    if (!set.size) positionListeners.delete(videoId);
  };
}

/** Индекс фразы, которая звучит сейчас: последняя, чьё время уже наступило. */
export function activePhraseIndex(startSecs: readonly (number | undefined)[], positionSec: number): number {
  let active = -1;
  for (let index = 0; index < startSecs.length; index += 1) {
    const start = startSecs[index];
    if (typeof start === 'number' && start <= positionSec + 0.25 && (active === -1 || start >= (startSecs[active] ?? -1))) active = index;
  }
  return active;
}
