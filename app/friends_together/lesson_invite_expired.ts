/**
 * «Урок вместе» (идея 2, макет friends-full.html «Сообщения» утром): «Ирина: приглашение закончилось в полночь» — у пригласившего.
 *
 * зачем (координатор 22.10): отправленные приглашения телефон помнит сам (lesson_invite_client, 36 ч после срока), а «друг прошёл»
 * приходит уведомлением lesson_together с тем же inviteId. Истёкшее без такого уведомления — тихая строка: без сети, без чтений,
 * без планировщика. Чистая функция — её проверяет tests/friends_lesson_together_finish.test.ts.
 */
import type { UserNotification } from '../user_notifications';
import type { SentLessonInvite } from './lesson_invite_client';

export type ExpiredLessonInvite = Readonly<{ inviteId: string; friendUid: string; name: string; expiresAtMs: number }>;

export function expiredLessonInvites(
  sent: readonly SentLessonInvite[],
  rows: readonly UserNotification[],
  names: Readonly<Record<string, string | undefined>>,
  nowMs: number,
): ExpiredLessonInvite[] {
  const done = new Set<string>();
  for (const row of rows) {
    const nav = row.nav;
    if (nav?.kind === 'friend_event' && nav.action === 'lesson_together' && nav.inviteId) done.add(nav.inviteId);
  }
  return sent
    .filter((invite) => invite.expiresAtMs <= nowMs && !done.has(invite.inviteId))
    .flatMap((invite) => {
      const name = (names[invite.friendUid] ?? '').trim();
      // без имени строку «кто не успел» не собрать — не показываем, а не пишем «·»
      return name ? [{ inviteId: invite.inviteId, friendUid: invite.friendUid, name, expiresAtMs: invite.expiresAtMs }] : [];
    })
    .sort((a, b) => b.expiresAtMs - a.expiresAtMs);
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
