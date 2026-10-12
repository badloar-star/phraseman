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

// зачем (координатор 12.10, EN-проход R1, шаг 6): при паре «интерфейс en + изучаю en» (D164) через 1,2 с после старта вкладок
// приложение само открывает выбор языка изучения — и перекрывает кадр робота. Карточным кадрам нужны английские демо-данные
// (studyTarget=en), поэтому только для них — `enStudyPrompt=off`: автопереход не открывается. Только память, только dev.
let enStudyPromptOff = false;

/** `dev_state?enStudyPrompt=off|on`. В стор-сборке — отказ с логом. */
export function setDevEnStudyPromptOff(off: boolean): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] enStudyPrompt: отклонено — не dev-сборка', { off }); // guard-ok: ранний выход логируется
    return false;
  }
  enStudyPromptOff = off;
  console.log(`[DEV-STATE] enStudyPrompt=${off ? 'off' : 'on'} (автопереход на выбор языка изучения при паре en+en ${off ? 'выключен' : 'включён'}, только память)`);
  return true;
}

/** true — автопереход на выбор языка изучения при паре en+en выключен dev-подменой. В стор-сборке всегда false. */
export function isDevEnStudyPromptOff(): boolean {
  return devAvailable() && enStudyPromptOff;
}
