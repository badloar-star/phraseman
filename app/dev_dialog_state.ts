/**
 * DEV-состояния Диалогов для робот-съёмки: ссылка `dev_state?dev_dialog_fail=…&dev_dialog_mood=…&dialogs_paused=1&hold=freeform_loading&dev_energy_fail=1`
 * (R1_SHOT_LIST «нет пути»: dialogs-023/032/033, dialogs-gap-009/012/016/017).
 *
 * зачем (координатор 12.10): эти кадры определяет сервер (настроение собеседника, отказ сервиса, потолок Plus, рубильник раздела)
 * или гонка загрузки; в dev их не получить. Здесь — флаги В ПАМЯТИ процесса (не диск, не Firestore): отказ подставляется ДО сети
 * в sendDialogueV2CoachedTextTurn, настроение — поверх настоящего ответа, отказ энергии — до списания. Перезапуск приложения сбрасывает всё.
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттеры всегда «выключено», а установка отклоняется. Логи: [DEV-STATE].
 */
import { IS_STORE_RELEASE } from './config';
import type { DevDialogSendMode } from './dev_dialog_send';

export type DevDialogFail = 'service' | 'rate_limited' | 'plus_daily_cap' | 'paused';
export type DevDialogMood = 'happy' | 'smile' | 'neutral' | 'sad' | 'angry';

export const DEV_DIALOG_FAILS = ['service', 'rate_limited', 'plus_daily_cap', 'paused'] as const;
export const DEV_DIALOG_MOODS = ['happy', 'smile', 'neutral', 'sad', 'angry'] as const;
/**
 * Итог диалога без сервера (Макеты 12.10: dialogs-037/040/042/044, dialogs-gap-007/008): clean — все цели, без исправлений;
 * errors — одна цель не выполнена и два исправления; loading — итог готовится вечно; unavailable — «итог недоступен».
 */
export const DEV_DIALOG_COMPLETIONS = ['clean', 'errors', 'loading', 'unavailable'] as const;
export type DevDialogCompletion = (typeof DEV_DIALOG_COMPLETIONS)[number];

const LOG = '[DEV-STATE]';

// зачем (координатор 12.10): send — подставной ход без ИИ и без Firestore (dev_dialog_send), см. dev_dialog_send.ts.
// зачем (координатор 12.10, dialogs-005): holdLanguageGate — хаб рисует карточку «Диалоги на этом языке ещё проверяются», хотя язык поддержан (таблицу готовности правит только владелец, D129/D130).
// зачем (Макеты 12.10, съёмка R1): end — подставной ход завершает диалог (dialogs-037); better — в разборе хода «Лучше так» (dialogs-021);
// completion — итог без сервера. Всё только в памяти, работает в паре с подставным ходом dev_dialog_send.
type State = {
  fail: DevDialogFail | null; mood: DevDialogMood | null; holdFreeformLoading: boolean; holdLanguageGate: boolean; energyFail: boolean;
  send: DevDialogSendMode | null; end: boolean; better: boolean; completion: DevDialogCompletion | null;
};
const EMPTY: State = {
  fail: null, mood: null, holdFreeformLoading: false, holdLanguageGate: false, energyFail: false, send: null, end: false, better: false, completion: null,
};
let state: State = EMPTY;

function devDialogAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Выставить флаги. `null` — снять. В стор-сборке — отказ с логом, ничего не меняется. */
export function setDevDialogState(patch: Partial<State>): boolean {
  if (!devDialogAvailable()) {
    console.warn(`${LOG} dialogs: отклонено — не dev-сборка`, { keys: Object.keys(patch) }); // guard-ok: ранний выход логируется
    return false;
  }
  state = { ...state, ...patch };
  console.log(`${LOG} dialogs: ${JSON.stringify(state)}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function getDevDialogFail(): DevDialogFail | null {
  return devDialogAvailable() ? state.fail : null;
}

export function getDevDialogMood(): DevDialogMood | null {
  return devDialogAvailable() ? state.mood : null;
}

export function isDevFreeformLoadingHeld(): boolean {
  return devDialogAvailable() && state.holdFreeformLoading;
}

/** true — хаб «Диалоги» показывает карточку «язык ещё проверяется» (dev_state?hold=dialog_language_gate). В стор-сборке всегда false. */
export function isDevDialogLanguageGateHeld(): boolean {
  return devDialogAvailable() && state.holdLanguageGate;
}

export function isDevDialogEnergyFail(): boolean {
  return devDialogAvailable() && state.energyFail;
}

/** Подставной ход (dev_dialog_send): старт сессии и ход без сети. В стор-сборке — всегда null. */
export function getDevDialogSend(): DevDialogSendMode | null {
  return devDialogAvailable() ? state.send : null;
}

/** Подставной ход завершает диалог (`dev_dialog_end=on`). В стор-сборке всегда false. */
export function isDevDialogEnd(): boolean {
  return devDialogAvailable() && state.end;
}

/** В разборе подставного хода есть «Лучше так» (`dev_dialog_better=on`). В стор-сборке всегда false. */
export function isDevDialogBetter(): boolean {
  return devDialogAvailable() && state.better;
}

/** Итог диалога без сервера (`dev_dialog_completion=…`). В стор-сборке — всегда null. */
export function getDevDialogCompletion(): DevDialogCompletion | null {
  return devDialogAvailable() ? state.completion : null;
}

/** Только для тестов. */
export function resetDevDialogState(): void {
  state = EMPTY;
}
