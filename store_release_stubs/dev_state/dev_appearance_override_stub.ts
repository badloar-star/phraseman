// Стор-сборка: заглушка app/dev_appearance_override.ts. Подмена оформления light/dark ссылкой недоступна.
export function getDevAppearance(): null { return null; }
export function setDevAppearance(): void { /* нет подмены */ }
export function subscribeDevAppearance(): () => void { return () => undefined; }
