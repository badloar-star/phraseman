// Стор-сборка: заглушка app/dev_ui_lang.ts. Подмена английского интерфейса недоступна.
export function subscribeDevUiLang(): () => void { return () => undefined; }
export function setDevUiLang(): boolean { return false; }
export function isDevUiLangEnOn(): boolean { return false; }
// зачем (EN-проход R1): выключение автоперехода на выбор языка изучения в стор-сборке недоступно
export function setDevEnStudyPromptOff(): boolean { return false; }
export function isDevEnStudyPromptOff(): boolean { return false; }
