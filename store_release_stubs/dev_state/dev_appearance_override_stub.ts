// Стор-сборка: заглушка app/dev_appearance_override.ts. Подмена оформления light/dark ссылкой недоступна.
export function getDevAppearance(): null { return null; }
export function setDevAppearance(): void { /* нет подмены */ }
export function subscribeDevAppearance(): () => void { return () => undefined; }
export function getDevThemeChoice(): null { return null; }
export function setDevThemeChoice(): void { /* нет подмены темы и оттенка */ }
export function subscribeDevThemeChoice(): () => void { return () => undefined; }
