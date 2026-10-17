/**
 * Трассировка цепочки «найти друга → заявка → принять → в списке у обоих».
 *
 * зачем (владелец 17.10 через координатора: «функция добавления друзей должна быть проверена!!! И друзья должны находиться
 * мгновенно, а не через полчаса»): сперва логи, потом починка. Единый префикс [FRIEND-ADD] — вся цепочка одним grep.
 * Без имён, кодов и полных uid: только 8 знаков, длины, счётчики, мс, источник (память / кэш SDK / сервер).
 */
export function friendTag(uid: string | null | undefined): string | null {
  const clean = String(uid ?? '').trim();
  return clean ? clean.slice(0, 8) : null;
}

export function logFriendAdd(step: string, payload: Record<string, unknown> = {}): void {
  console.log('[FRIEND-ADD]', JSON.stringify({ step, ...payload })); // guard-ok: без имён и полных uid
}
