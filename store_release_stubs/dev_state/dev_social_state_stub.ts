// Стор-сборка: заглушка app/dev_social_state.ts. Фикстур промокода, рубильника приглашений, друзей и сбоев Настроек нет.
export const DEV_PROMO_RESULTS = [] as const;
export const DEV_FRIENDS_HOLDS = [] as const;
export const DEV_FRIENDS_FAILS = [] as const;
export const DEV_SETTINGS_FAILS = [] as const;
export const DEV_FRIEND_EVENTS = [] as const;
export const DEV_UNSYNCED_FRIEND_CODE = 'DEVUNS';
export const DEV_FOUND_FRIEND_CODE = 'DEVFND';
export const DEV_FOUND_FRIEND_UID = 'dev_found_friend';
export function setDevSocialState(): boolean { return false; }
export function isDevSettingsFail(): boolean { return false; }
export function isDevSupportFakeSent(): boolean { return false; }
export function getDevStartedLanguages(): null { return null; }
export function isDevReferralOff(): boolean { return false; }
export function getDevPromoResult(): null { return null; }
export function isDevPromoHold(): boolean { return false; }
export function isDevFriendsHeld(): boolean { return false; }
export function isDevFriendsFail(): boolean { return false; }
export function isDevUnsyncedFriendCode(): boolean { return false; }
export function isDevFoundFriendCode(): boolean { return false; }
export function isDevFoundFriendUid(): boolean { return false; }
export function consumeDevFriendEvent(): null { return null; }
export function resetDevSocialStateForTests(): void {}
export default function __RouteShim() { return null; }
// зачем (12.10, ревизия паритета заглушек): результаты кода друга (Авторизация) в стор-сборке не подменяются
export const DEV_REFCODE_RESULTS = [] as const;
export function getDevReferralApplyResult(): null { return null; }
export function isDevNotifPermDenied(): boolean { return false; }
// зачем (Авторизация 12.10, подмены съёмки community-013/023): служебный код «свой профиль» и опрос дня из памяти — в стор-сборке выключены
export const DEV_SELF_FRIEND_CODE = 'DEVSLF';
export const DEV_DAILY_POLLS = [] as const;
export function isDevSelfFriendCode(): boolean { return false; }
export function getDevDailyPoll(): null { return null; }
export function devDailyPollVote(): null { return null; }
// зачем (Авторизация 12.10, system-010/012): экран ошибки и окно объявления в стор-сборке не подменяются
export const DEV_APP_MESSAGES = [] as const;
export function setDevErrorScreen(): boolean { return false; }
export function isDevErrorScreen(): boolean { return false; }
export function subscribeDevErrorScreen(): () => void { return () => undefined; }
export function setDevAppMessage(): boolean { return false; }
export function getDevAppMessage(): null { return null; }
export function subscribeDevAppMessage(): () => void { return () => undefined; }
// зачем (Авторизация 13.10, settings-gap-007): удержание чистки кеша в стор-сборке не подменяется
export function setDevCacheClearHold(): boolean { return false; }
export function isDevCacheClearHold(): boolean { return false; }
