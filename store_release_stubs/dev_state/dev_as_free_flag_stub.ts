// Стор-сборка: заглушка app/dev_as_free_flag.ts. «Как Free» нет: доступ к урокам — как пришёл.
export function isDevAsFreeActive(): boolean { return false; }
export async function loadDevAsFreeFlag(): Promise<void> { return undefined; }
export async function setDevAsFreeFlag(): Promise<boolean> { return false; }
export function applyDevAsFreeToLessonAccess<T>(input: T): T { return input; }
export function __resetDevAsFreeForTests(): void { return undefined; }
export default function __RouteShim() { return null; }
