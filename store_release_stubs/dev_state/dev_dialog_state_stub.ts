// Стор-сборка: заглушка app/dev_dialog_state.ts. Отказов диалогов, настроения, удержания загрузки и отказа энергии нет.
export const DEV_DIALOG_FAILS = [] as const;
export const DEV_DIALOG_MOODS = [] as const;
export function setDevDialogState(): boolean { return false; }
export function getDevDialogFail(): null { return null; }
export function getDevDialogMood(): null { return null; }
export function isDevFreeformLoadingHeld(): boolean { return false; }
export function isDevDialogEnergyFail(): boolean { return false; }
// зачем (12.10, dialogs-005): удержание карточки «язык ещё проверяется» в стор-сборке всегда выключено
export function isDevDialogLanguageGateHeld(): boolean { return false; }
export function resetDevDialogState(): void {}
// зачем (12.10, ревизия паритета заглушек): подставной ход Диалога (dev_dialog_send, Ядро) в стор-сборке всегда выключен
export function getDevDialogSend(): null { return null; }
// зачем (Макеты 12.10, съёмка R1): конец диалога, «Лучше так» и итог без сервера в стор-сборке всегда выключены
export const DEV_DIALOG_COMPLETIONS = [] as const;
export function isDevDialogEnd(): boolean { return false; }
export function isDevDialogBetter(): boolean { return false; }
export function isDevDialogCoinsAward(): boolean { return false; }
export function getDevDialogCompletion(): null { return null; }
export const DEV_DIALOG_MEMORY = [] as const;
export function getDevDialogMemory(): null { return null; }
// зачем (владелец 12.10, п.81, dialogs-028): подмена «голосовые попытки исчерпаны» в стор-сборке всегда выключена
export function isDevDialogVoiceSpent(): boolean { return false; }
// зачем (Ядро 12.10, dialogs-020): подмена «разборы на сегодня закончились» в стор-сборке выключена
export function isDevDialogWhySpent(): boolean { return false; }
