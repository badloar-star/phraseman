// Стор-сборка: заглушка app/dev_friends_demo.ts. Демо-друзей нет.
export async function setDevFriendsDemo(): Promise<boolean> { return false; }
export function isDevFriendsDemoOn(): boolean { return false; }
export function devFriendsDemoData(): { requests: never[]; friends: never[] } { return { requests: [], friends: [] }; }
export default function __RouteShim() { return null; }
