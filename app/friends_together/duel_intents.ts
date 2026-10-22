/**
 * «Дуэль на 5 фраз» (идея 3) — «Реванш» с экрана итога: просьба к вкладке «Друзья» открыть шторку вызова этому другу.
 *
 * зачем (решение координатора 22.10: реванш — новый вызов от нажавшего, он ходит первым): экран итога закрывается назад,
 * вкладка при возврате фокуса (focusTick) забирает просьбу и открывает вызов — без адресов с параметрами поверх стека.
 * Просьба живёт 30 с: человек не дошёл до «Друзей» — забываем, шторка сама потом не всплывёт.
 */
const REMATCH_TTL_MS = 30_000;

let pending: Readonly<{ friendUid: string; atMs: number }> | null = null;

export function requestDuelRematch(friendUid: string, nowMs: number = Date.now()): void {
  pending = friendUid ? { friendUid, atMs: nowMs } : null;
  console.log(`[FRIENDS-DUEL] rematch:requested ${friendUid ? 'ok' : 'skip reason=no_friend'}`); // guard-ok: одна строка на просьбу
}

/** Забрать просьбу (один раз). Старше 30 с — нет. */
export function takeDuelRematch(nowMs: number = Date.now()): string | null {
  const current = pending;
  pending = null;
  if (!current) return null;
  if (nowMs - current.atMs > REMATCH_TTL_MS) {
    console.log(`[FRIENDS-DUEL] rematch:expired age_ms=${nowMs - current.atMs}`); // guard-ok: ранний выход называет причину
    return null;
  }
  return current.friendUid;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
