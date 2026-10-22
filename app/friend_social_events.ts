// зачем (идея 3): duel_challenge / duel_result — «Дуэль на 5 фраз»; duel_invite — старая дуэль удалённой Арены (D83), не путать
export type FriendSocialMarkerKind = 'high_five' | 'study_invite' | 'duel_invite' | 'lesson_invite' | 'duel_challenge' | 'duel_result';

/** «Урок вместе» (идея 2): занятие из приглашения — номера в СВОЁМ курсе друга и факты отправителя. */
export type FriendLessonInviteInfo = Readonly<{ lessonOrdinal: number; sessionOrdinal: number; lessonKey?: string; minutes?: number; stars?: number }>;

/** Вызов на «Дуэль на 5 фраз»: номер дуэли и id пяти фраз (тексты — из курса на телефоне). */
export type FriendDuelChallengeInfo = Readonly<{ duelId: string; phraseIds: readonly string[] }>;

/** Итог дуэли у вызвавшего — всё для экрана итога без чтений сервера. */
export type FriendDuelResultInfo = Readonly<{
  duelId: string;
  outcome: 'win' | 'loss' | 'draw';
  mine: Readonly<{ correct: number; elapsedMs: number; results: readonly boolean[] | null }>;
  theirs: Readonly<{ correct: number; elapsedMs: number; results: readonly boolean[] }>;
  phraseIds: readonly string[] | null;
}>;

export type FriendSocialEvent = Readonly<{
  id: string;
  actorStableUid: string;
  kind: FriendSocialMarkerKind;
  createdAtMs: number;
  expiresAtMs?: number;
  inviteId?: string;
  notificationId?: string;
  lesson?: FriendLessonInviteInfo;
  duel?: FriendDuelChallengeInfo;
  duelResult?: FriendDuelResultInfo;
}>;

type NotificationLike = Readonly<{
  id: string;
  type: string;
  fromUid: string;
  createdAt: number;
  read?: boolean;
  nav?: {
    kind?: string;
    actorStableUid?: string;
    eventId?: string;
    action?: string;
    inviteId?: string;
    lesson?: Readonly<{ lessonOrdinal?: number; sessionOrdinal?: number; lessonKey?: string; expiresAtMs?: number; minutes?: number; stars?: number }> | null;
    duelChallenge?: Readonly<{ duelId?: string; expiresAtMs?: number; phraseIds?: readonly string[] }> | null;
    duelResult?: FriendDuelResultInfo | null;
    duelId?: string;
  } | null;
}>;

/** Вызов без номера, срока или пяти фраз маркер не даёт — сыграть нечего (строку уже проверил parseUserNotificationNav). */
function duelFromNav(duel: NonNullable<NotificationLike['nav']>['duelChallenge']): (FriendDuelChallengeInfo & { expiresAtMs: number }) | null {
  if (!duel || typeof duel.duelId !== 'string' || !duel.duelId || typeof duel.expiresAtMs !== 'number') return null;
  if (!Array.isArray(duel.phraseIds) || duel.phraseIds.length !== 5) return null;
  return { duelId: duel.duelId, phraseIds: [...duel.phraseIds], expiresAtMs: duel.expiresAtMs };
}

/** Занятие приглашения: без номеров урока и занятия маркер не создаём — открыть нечего. */
function lessonFromNav(lesson: NonNullable<NotificationLike['nav']>['lesson']): FriendLessonInviteInfo | null {
  if (!lesson || !Number.isInteger(lesson.lessonOrdinal) || !Number.isInteger(lesson.sessionOrdinal)) return null;
  return {
    lessonOrdinal: lesson.lessonOrdinal as number,
    sessionOrdinal: lesson.sessionOrdinal as number,
    ...(lesson.lessonKey ? { lessonKey: lesson.lessonKey } : {}),
    ...(typeof lesson.minutes === 'number' ? { minutes: lesson.minutes } : {}),
    ...(typeof lesson.stars === 'number' ? { stars: lesson.stars } : {}),
  };
}

/** Один и тот же durable bell row питает маркер карточки — отдельного listener нет. */
export function friendSocialEventsFromNotifications(rows: readonly NotificationLike[]): FriendSocialEvent[] {
  return dedupeFriendEvents(rows.flatMap((row): FriendSocialEvent[] => {
    if (row.read === true) return [];
    const nav = row.nav;
    if (nav?.kind !== 'friend_event') return [];
    const actorStableUid = String(nav.actorStableUid || row.fromUid || '').trim();
    if (!actorStableUid) return [];
    const kind: FriendSocialMarkerKind | null = nav.action === 'high_five'
      ? 'high_five'
      : nav.action === 'study_invite'
        ? 'study_invite'
        : nav.action === 'duel_invite'
          ? 'duel_invite'
          : nav.action === 'lesson_invite'
            ? 'lesson_invite'
            : nav.action === 'duel_challenge'
              ? 'duel_challenge'
              : nav.action === 'duel_result'
                ? 'duel_result'
                : null;
    if (!kind) return [];
    const lesson = kind === 'lesson_invite' ? lessonFromNav(nav.lesson) : null;
    if (kind === 'lesson_invite' && !lesson) return [];
    const duel = kind === 'duel_challenge' ? duelFromNav(nav.duelChallenge) : null;
    if (kind === 'duel_challenge' && !duel) return [];
    const duelResult = kind === 'duel_result' ? nav.duelResult ?? null : null;
    if (kind === 'duel_result' && !duelResult) return [];
    const createdAtMs = Math.max(0, Number(row.createdAt) || 0);
    // зачем (идея 2): приглашение на занятие живёт до полуночи друга (срок из nav), дуэль — 10 минут
    const lessonExpiresAtMs = kind === 'lesson_invite' && typeof nav.lesson?.expiresAtMs === 'number' ? nav.lesson.expiresAtMs : null;
    return [{
      id: String(nav.eventId || row.id),
      actorStableUid,
      kind,
      createdAtMs,
      ...(kind === 'duel_invite' ? { expiresAtMs: createdAtMs + 10 * 60 * 1_000 } : {}),
      ...(lessonExpiresAtMs !== null ? { expiresAtMs: lessonExpiresAtMs } : {}),
      // зачем (идея 3): вызов на «Дуэль на 5 фраз» живёт сутки — срок из сервера
      ...(duel ? { expiresAtMs: duel.expiresAtMs, duel: { duelId: duel.duelId, phraseIds: duel.phraseIds } } : {}),
      ...(duelResult ? { duelResult } : {}),
      ...(nav.inviteId ? { inviteId: String(nav.inviteId) } : {}),
      ...(lesson ? { lesson } : {}),
      notificationId: row.id,
    }];
  }));
}

const MARKER_PRIORITY: Readonly<Record<FriendSocialMarkerKind, number>> = {
  high_five: 1,
  study_invite: 2,
  lesson_invite: 2,
  duel_result: 2,
  duel_invite: 3,
  duel_challenge: 3,
};

/** Маркеры со сроком: дуэль, вызов на «Дуэль на 5 фраз» и приглашение на занятие. */
const expires = (event: FriendSocialEvent): boolean => event.kind === 'duel_invite' || event.kind === 'lesson_invite' || event.kind === 'duel_challenge';

/**
 * Итог или отказ по «Дуэли на 5 фраз» с этим другом — дуэль закрыта: журнал своих вызовов снимет «дуэль уже идёт»
 * (вызов, отправленный до строки). Читаем и прочитанные строки: закрытость не зависит от того, открыл ли человек итог.
 */
export function duelClosuresFromNotifications(rows: readonly NotificationLike[]): Array<Readonly<{ friendUid: string; atMs: number }>> {
  return rows.flatMap((row) => {
    const nav = row.nav;
    if (nav?.kind !== 'friend_event' || (nav.action !== 'duel_result' && nav.action !== 'duel_declined')) return [];
    const friendUid = String(nav.actorStableUid || row.fromUid || '').trim();
    return friendUid ? [{ friendUid, atMs: Math.max(0, Number(row.createdAt) || 0) }] : [];
  });
}

/** Сколько осталось до конца вызова на дуэль: «23 ч» / «45 мин» на маркере. */
export function remainingDuelChallengeMs(event: FriendSocialEvent, nowMs: number = Date.now()): number {
  if (event.kind !== 'duel_challenge' || typeof event.expiresAtMs !== 'number') return 0;
  return Math.max(0, event.expiresAtMs - nowMs);
}

export function dedupeFriendEvents(events: readonly FriendSocialEvent[]): FriendSocialEvent[] {
  const byId = new Map<string, FriendSocialEvent>();
  for (const event of events) {
    const current = byId.get(event.id);
    if (!current || event.createdAtMs >= current.createdAtMs) byId.set(event.id, event);
  }
  return [...byId.values()];
}

function isMarkerActive(event: FriendSocialEvent, nowMs: number): boolean {
  return !expires(event)
    || typeof event.expiresAtMs !== 'number'
    || event.expiresAtMs > nowMs;
}

export function selectFriendMarker(
  events: readonly FriendSocialEvent[],
  nowMs: number = Date.now(),
): FriendSocialEvent | null {
  return dedupeFriendEvents(events)
    .filter((event) => isMarkerActive(event, nowMs))
    .sort((left, right) =>
      MARKER_PRIORITY[right.kind] - MARKER_PRIORITY[left.kind]
      || right.createdAtMs - left.createdAtMs
      || left.id.localeCompare(right.id))[0] ?? null;
}

export function acknowledgeMarker(
  events: readonly FriendSocialEvent[],
  eventId: string,
): FriendSocialEvent[] {
  return events.filter((event) => event.id !== eventId);
}

export function remainingDuelSeconds(event: FriendSocialEvent, nowMs: number = Date.now()): number {
  if (event.kind !== 'duel_invite' || typeof event.expiresAtMs !== 'number') return 0;
  return Math.max(0, Math.ceil((event.expiresAtMs - nowMs) / 1_000));
}

export function nextFriendMarkerExpiryMs(
  events: readonly FriendSocialEvent[],
  nowMs: number = Date.now(),
): number | null {
  let nearest: number | null = null;
  for (const event of events) {
    if (!expires(event) || typeof event.expiresAtMs !== 'number' || event.expiresAtMs <= nowMs) continue;
    nearest = nearest === null ? event.expiresAtMs : Math.min(nearest, event.expiresAtMs);
  }
  return nearest;
}

export default function __RouteShim() {
  return null;
}
