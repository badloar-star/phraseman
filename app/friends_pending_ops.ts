// ═════════════════════════════════════════════════════════════════════
// friends_pending_ops.ts — заявки «в пути»: принять / отклонить, пока сервер ещё не ответил.
//
// зачем (аудит Optimistic UI «Шпиль и Сообщество», координатор 12.10): тап «Принять» сразу убирает заявку
// и добавляет друга на экране, но подписки списков (друзья, входящие) приносят снимок сервера, снятый ДО
// записи, — заявка возвращалась, друг пропадал, потом снова появлялся (прыжок). Пока операция идёт и
// ещё несколько секунд после успеха, снимки подправляются по локальному решению человека.
// Тот же приём для УДАЛЕНИЯ и БЛОКИРОВКИ друга (kind 'remove', 26.10, аудит Optimistic UI «Друзья»): человек подтвердил — друг исчезает сразу, а запоздавший снимок списка,
// снятый до записи, не должен на секунду вернуть его обратно. Откат (отказ сервера) снимает запись — друг возвращается из снимка сам.
// Чистый модуль без React и сети — поведение проверяется юнит-тестом.
// ═════════════════════════════════════════════════════════════════════

export type PendingFriendOpKind = 'accept' | 'decline' | 'remove';

type Entry<F> = { kind: PendingFriendOpKind; friend: F | null; until: number };

/** Сколько после УСПЕХА ещё прикрываем запоздавший снимок (сервер → подписка доезжает за 1–3 с). */
export const PENDING_FRIEND_OP_GRACE_MS = 6000;

export type PendingFriendOps<F extends { uid: string }, R extends { fromUid: string }> = Readonly<{
  begin: (uid: string, kind: PendingFriendOpKind, friend?: F) => void;
  settle: (uid: string, ok: boolean, nowMs: number) => void;
  has: (uid: string, nowMs: number) => boolean;
  /** Входящие заявки без тех, что человек уже принял/отклонил. */
  filterRequests: (rows: readonly R[], nowMs: number) => R[];
  /** Друзья плюс только что принятые, которых в снимке ещё нет, минус только что удалённые/заблокированные, которые снимок ещё держит. */
  mergeFriends: (rows: readonly F[], nowMs: number) => F[];
}>;

export function createPendingFriendOps<F extends { uid: string }, R extends { fromUid: string }>(): PendingFriendOps<F, R> {
  const entries = new Map<string, Entry<F>>();
  const live = (uid: string, nowMs: number): Entry<F> | null => {
    const entry = entries.get(uid);
    if (!entry) return null;
    if (entry.until <= nowMs) {
      entries.delete(uid);
      return null;
    }
    return entry;
  };
  return {
    begin: (uid, kind, friend) => {
      entries.set(uid, { kind, friend: friend ?? null, until: Number.POSITIVE_INFINITY });
    },
    settle: (uid, ok, nowMs) => {
      if (!ok) {
        entries.delete(uid); // откат: снимок сервера снова главный, заявка вернётся сама
        return;
      }
      const entry = entries.get(uid);
      if (entry) entries.set(uid, { ...entry, until: nowMs + PENDING_FRIEND_OP_GRACE_MS });
    },
    has: (uid, nowMs) => live(uid, nowMs) !== null,
    filterRequests: (rows, nowMs) => rows.filter((row) => live(row.fromUid, nowMs) === null),
    mergeFriends: (rows, nowMs) => {
      const kept = rows.filter((row) => live(row.uid, nowMs)?.kind !== 'remove');
      const have = new Set(kept.map((row) => row.uid));
      const extra: F[] = [];
      for (const uid of [...entries.keys()]) {
        const entry = live(uid, nowMs);
        if (entry && entry.kind === 'accept' && entry.friend && !have.has(uid)) extra.push(entry.friend);
      }
      return extra.length > 0 ? [...kept, ...extra] : kept;
    },
  };
}
