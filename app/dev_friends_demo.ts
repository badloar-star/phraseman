/**
 * DEV-подмена «друзья со входящей заявкой»: `dev_state?friends=demo|off` (координатор 12.10, community-006; R1_ROBOT_LINKS_GAPS.md).
 *
 * зачем: кадр «заявка в друзья» (строка `friend-request-row-<uid>`) требует второго аккаунта, а робот в аккаунт не входит. Подмена кладёт во вкладку «Друзья» одну входящую заявку и одного друга —
 * только в памяти: подписки Firestore на этот заход НЕ создаются (ни одного чтения/записи), локальный кэш вкладки не пишется, принять/отклонить заявку меняет только экран. Перезапуск стирает.
 * Только `__DEV__ && !IS_STORE_RELEASE`; включение — только на одноразовом госте (assertDisposableGuest, на настоящем аккаунте отказ). Лог: [DEV-STATE] friends.
 */
import { IS_STORE_RELEASE } from './config';

export type DevFriendRequest = Readonly<{ fromUid: string; fromName: string; status: 'pending'; createdAt: number }>;
export type DevFriend = Readonly<{ uid: string; displayName: string; createdAt: number }>;

let demoOn = false;

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Включить/выключить демо-друзей. Включение — только на одноразовом госте. В стор-сборке — отказ с логом. */
export async function setDevFriendsDemo(on: boolean): Promise<boolean> {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] friends: отклонено — не dev-сборка', { on }); // guard-ok: ранний выход логируется
    return false;
  }
  if (on) {
    const { assertDisposableGuest } = await import('./dev_state_account_guard');
    assertDisposableGuest('friends=demo');
  }
  demoOn = on;
  console.log(`[DEV-STATE] friends: ${on ? 'демо-друзья включены (1 заявка, 1 друг; подписок и записей нет)' : 'демо-друзья выключены'}`); // guard-ok: единичный лог на ссылку
  return true;
}

/** true — вкладка «Друзья» рисует демо-данные. В стор-сборке всегда false. */
export function isDevFriendsDemoOn(): boolean {
  return devAvailable() && demoOn;
}

/** Данные демо: заявка от «Alex» и друг «Maria». */
export function devFriendsDemoData(nowMs: number = Date.now()): Readonly<{ requests: readonly DevFriendRequest[]; friends: readonly DevFriend[] }> {
  return Object.freeze({
    requests: Object.freeze([Object.freeze({ fromUid: 'dev-demo-friend-request-1', fromName: 'Alex', status: 'pending' as const, createdAt: nowMs - 3_600_000 })]),
    friends: Object.freeze([Object.freeze({ uid: 'dev-demo-friend-1', displayName: 'Maria', createdAt: nowMs - 86_400_000 })]),
  });
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() { return null; }
