// Стор-сборка: заглушка app/dev_ui_lang.ts. Подмена английского интерфейса недоступна.
export function subscribeDevUiLang(): () => void { return () => undefined; }
export function setDevUiLang(): boolean { return false; }
export function isDevUiLangEnOn(): boolean { return false; }
// зачем (координатор 15.10): подмена на любой из 9 языков — в стор-сборке недоступна, имена те же, что у app/dev_ui_lang.ts
export const DEV_UI_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
export function isDevUiLangOn(): boolean { return false; }
export function peekDevUiLang(): null { return null; }
