// Стор-сборка: заглушка app/dev_account_state.ts (конфиг сборщика подменяет модуль при EXPO_PUBLIC_STORE_RELEASE=1). «Нет подмены» во всех геттерах.
export const DEV_SWITCH_MODES = [] as const;
export const DEV_LOGOUT_MODES = [] as const;
export function setDevAccountState(): boolean { return false; }
export function isDevAuthNone(): boolean { return false; }
export function getDevSignOutOutcome(): null { return null; }
export function getDevSignInError(): null { return null; }
export function isDevUnsavedCardsPrompt(): boolean { return false; }
export function isDevDeleteFail(): boolean { return false; }
export function isDevPlusTransferNotice(): boolean { return false; }
export function getDevGreetName(): null { return null; }
export function resetDevAccountStateForTests(): void {}
export default function __RouteShim() { return null; }
