/**
 * DEV-подмена «английский интерфейс включён»: `dev_state?uiLang=en` / `uiLang=off`.
 *
 * зачем (координатор 12.10, решение владельца п.76 «английский интерфейс входит в R1»): глобальный флаг `ENGLISH_UI_LOCALE_ENABLED` включает только владелец, а пройти все разделы
 * в английском нужно ДО этого. Подмена открывает `en` в воротах интерфейсных языков (`isInterfaceLangEnabled`) и переключает язык приложения — только память: на диск
 * (app_lang), в облако и в уведомления ничего не уходит. Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттер всегда false, а установка отклоняется (заглушка с логом).
 * Журнал: [DEV-STATE] uiLang.
 */
import { IS_STORE_RELEASE } from './config';

export type DevUiLangRequest = 'en' | 'off';

let enOn = false;
const listeners = new Set<(request: DevUiLangRequest) => void>();

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Подписка LangContext: вызывается при каждом применении подмены. */
export function subscribeDevUiLang(listener: (request: DevUiLangRequest) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Включить/выключить английский интерфейс в dev. В стор-сборке — отказ с логом. Возвращает true, если применено. */
export function setDevUiLang(request: DevUiLangRequest): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] uiLang: отклонено — не dev-сборка', { request }); // guard-ok: ранний выход логируется
    return false;
  }
  enOn = request === 'en';
  console.log(`[DEV-STATE] uiLang=${request} (ворота en ${enOn ? 'открыты' : 'закрыты'}, подписчиков ${listeners.size}, только память)`);
  listeners.forEach((listener) => listener(request));
  return true;
}

/** true — английский интерфейс открыт dev-подменой. В стор-сборке всегда false. */
export function isDevUiLangEnOn(): boolean {
  return devAvailable() && enOn;
}

// зачем (D188, координатор 14.10): dev-параметр `enStudyPrompt` снят вместе с автопереходом на выбор языка изучения при паре
// en+en — пара разрешена, автоперехода нет. Старые ссылки с `enStudyPrompt=off` работают: неизвестный параметр парсер не читает.
