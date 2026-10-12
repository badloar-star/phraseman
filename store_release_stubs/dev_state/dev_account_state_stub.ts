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
// зачем (12.10, ревизия паритета заглушек): удержание конфетти онбординга (Авторизация) в стор-сборке всегда выключено
export function isDevConfettiHold(): boolean { return false; }
// зачем (12.10, сторож паритета заглушек): окно проверки имени (namecheck, 85812a2a3) в стор-сборке не подменяется — тот же набор экспортов, значения «нет подмены»
export const DEV_NAME_CHECKS = [] as const;
export function getDevNameCheck(): null { return null; }
// зачем (координатор 12.10, auth-gap-006/007): подмена окна восстановления аккаунта в стор-сборке недоступна — всегда «нет подмены».
export const DEV_RESTORE_MODES = [] as const;
export function getDevAccountRestoreMode(): null { return null; }
// зачем (координатор 12.10, onboarding-003/004/008): подмена результата входа в стор-сборке недоступна — всегда «нет подмены».
export const DEV_SIGNIN_MODES = [] as const;
export function getDevSignInStub(): null { return null; }
// зачем (координатор 12.10, auth-gap-011): в стор-сборке удаление не подменяется и ввод «УДАЛИТЬ» обязателен ВСЕГДА.
export function isDevDeleteThrow(): boolean { return false; }
export function isDevDeleteConfirmBypass(): boolean { return false; }
