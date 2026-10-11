// Стор-сборка: заглушка app/dev_dialog_state.ts. Отказов диалогов, настроения, удержания загрузки и отказа энергии нет.
export const DEV_DIALOG_FAILS = [] as const;
export const DEV_DIALOG_MOODS = [] as const;
export function setDevDialogState(): boolean { return false; }
export function getDevDialogFail(): null { return null; }
export function getDevDialogMood(): null { return null; }
export function isDevFreeformLoadingHeld(): boolean { return false; }
export function isDevDialogEnergyFail(): boolean { return false; }
export function resetDevDialogState(): void {}
