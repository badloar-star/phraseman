// Стор-сборка: заглушка app/dev_mistakes_demo.ts. Демо-ошибок нет.
export async function setDevMistakesDemo(): Promise<boolean> { return false; }
export function isDevMistakesDemoOn(): boolean { return false; }
export async function setDevMistakesFinale(): Promise<boolean> { return false; }
export function peekDevMistakesFinale(): number | null { return null; }
export function buildDevMistakesDemoSnapshot(): never { throw new Error('dev_mistakes_demo: not available in store build'); }
export default function __RouteShim() { return null; }
