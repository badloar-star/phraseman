// Распознавание общей кнопки «назад» / «закрыть» для scripts/back_button_audit.ts (только чтение исходников).
// зачем (Макеты e9d51db21, координатор 26.10): сканер знал один экспорт — <ScreenBackButton> — и писал «НЕТ «назад»» у экранов,
// которые рисуют тот же общий компонент другим экспортом модуля components/v2/ScreenBackButton.tsx (SafeTopBackButton) или
// через обёртку (ExamHeader → SafeTopBackButton). Здесь перечислены ВСЕ экспорты-кнопки модуля; тест сверяет список с файлом.

/** Экспорты components/v2/ScreenBackButton.tsx, которые рисуют «назад». */
export const SHARED_BACK_EXPORTS = Object.freeze(['ScreenBackButton', 'SafeTopBackButton']);
/** Экспорты того же модуля, которые рисуют «закрыть». */
export const SHARED_CLOSE_EXPORTS = Object.freeze(['ScreenCloseButton', 'SafeTopCloseButton']);

const SHARED_MODULE_IMPORT = /from\s+['"][^'"]*\/ScreenBackButton['"]/;
const tagRe = (names) => new RegExp(`<(${names.join('|')})\\b`);
const BACK_TAG = tagRe(SHARED_BACK_EXPORTS);
const CLOSE_TAG = tagRe(SHARED_CLOSE_EXPORTS);

/** Имя общего «назад», которое файл рисует сам; null — не рисует. В самом модуле кнопки — тоже null. */
export function sharedBackTag(src) {
  if (!SHARED_MODULE_IMPORT.test(src)) return null;
  return BACK_TAG.exec(src)?.[1] ?? null;
}

/** Имя общего «закрыть», которое файл рисует сам; null — не рисует. */
export function sharedCloseTag(src) {
  if (!SHARED_MODULE_IMPORT.test(src)) return null;
  return CLOSE_TAG.exec(src)?.[1] ?? null;
}
