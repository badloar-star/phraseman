// ═══════════════════════════════════════════════════════════════════════════
// friend_hello_policy.ts — когда «Привет» (пятюня, friendLikeActivity) доходит
// до получателя строкой в «Активности» и push-уведомлением (PM-164, SOCIAL.md).
//
// зачем (владелец: «Привет — небольшой социальный сигнал»; D22/PM-165 — без
// награды): сам привет — дешёвый тумблер, а значит им легко спамить:
//   • снял и снова поставил → прежде строка в колокольчике переписывалась
//     заново (read сбрасывался) и уходил новый push — получатель видел одно и то
//     же событие много раз;
//   • поставил пятюню на десять событий друга подряд → десять push.
// Правило: (1) одно событие (отправитель × получатель × событие) доставляется
// ОДИН раз за всю жизнь — повтор после «снять» тих; (2) от одного отправителя
// одному получателю — не чаще раза в FRIEND_HELLO_NOTIFY_COOLDOWN_MS; лайки в
// этом окне засчитываются (счётчики честные), но без строки и без push.
// Повтор того же вызова (сеть, двойной тап) гасится раньше — sentLike уже есть.
// Модуль чистый: решение по уже прочитанным в транзакции данным, без сети.
// ═══════════════════════════════════════════════════════════════════════════

/** Окно тишины между двумя «Привет» от одного человека одному получателю. */
export const FRIEND_HELLO_NOTIFY_COOLDOWN_MS = 6 * 60 * 60 * 1_000;

export const FRIEND_HELLO_COOLDOWN_COLLECTION = 'friend_hello_cooldowns';

export type FriendHelloNotifyReason = 'first_delivery' | 'already_delivered' | 'cooldown';

export type FriendHelloNotifyDecision = Readonly<{
  /** Писать строку в «Активность» (колокольчик) и слать push. */
  notify: boolean;
  /** Писать запись истории получателя (activity_likes_received). */
  writeReceipt: boolean;
  reason: FriendHelloNotifyReason;
}>;

export function friendHelloNotifyDecision(input: Readonly<{
  /** Запись истории получателя для этого события уже есть (было доставлено раньше). */
  receiptExists: boolean;
  /** Когда этот отправитель последний раз дошёл до этого получателя; null — никогда. */
  lastNotifiedAtMs: number | null;
  nowMs: number;
}>): FriendHelloNotifyDecision {
  if (input.receiptExists) return { notify: false, writeReceipt: false, reason: 'already_delivered' };
  const last = input.lastNotifiedAtMs;
  if (typeof last === 'number' && Number.isFinite(last) && input.nowMs - last < FRIEND_HELLO_NOTIFY_COOLDOWN_MS) {
    return { notify: false, writeReceipt: true, reason: 'cooldown' };
  }
  return { notify: true, writeReceipt: true, reason: 'first_delivery' };
}
