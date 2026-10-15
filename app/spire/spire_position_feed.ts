// spire_position_feed.ts — позиция в комнате Пика для окон m05 (хранилище в памяти процесса, без диска и сети).
//
// зачем (Дизайн 15.10: useSpirePositionMoments() вызывается БЕЗ аргументов из ленивого SpireMomentsLayer; экран Пика упирается в
// лимит 400 строк): useSpireGame уже строит отсортированные строки комнаты — он одной строкой публикует их сюда, а хук окон читает
// через useSyncExternalStore. 0 чтений сети, ничего не хранится между запусками. Логов нет (общий префикс Пика — '[SPIRE]').
import type { SpireRoomRow } from '../../modules/spire/room_rows';

export type SpirePositionFeed = Readonly<{
  uid: string;
  lang: string;
  weekId: string;
  roomFetchedAtMs: number;
  rows: readonly SpireRoomRow[];
  rankBy: 'steps' | 'coins';
}>;

let current: SpirePositionFeed | null = null;
const listeners = new Set<() => void>();

export function publishSpirePositionFeed(next: SpirePositionFeed | null): void {
  if (next === current) return;
  if (next && current && next.rows === current.rows && next.rankBy === current.rankBy && next.roomFetchedAtMs === current.roomFetchedAtMs
    && next.weekId === current.weekId && next.uid === current.uid && next.lang === current.lang) return;
  current = next;
  for (const listener of listeners) listener();
}

export function peekSpirePositionFeed(): SpirePositionFeed | null {
  return current;
}

export function subscribeSpirePositionFeed(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
