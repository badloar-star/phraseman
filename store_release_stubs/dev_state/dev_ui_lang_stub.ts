// Стор-сборка: заглушка app/dev_ui_lang.ts. Подмена английского интерфейса недоступна.
export function subscribeDevUiLang(): () => void { return () => undefined; }
export function setDevUiLang(): boolean { return false; }
export function isDevUiLangEnOn(): boolean { return false; }
