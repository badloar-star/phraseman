// Стор-сборка: заглушка app/dev_social_state.ts. Фикстур промокода, рубильника приглашений, друзей и сбоев Настроек нет.
export const DEV_PROMO_RESULTS = [] as const;
export const DEV_FRIENDS_HOLDS = [] as const;
export const DEV_FRIENDS_FAILS = [] as const;
export const DEV_SETTINGS_FAILS = [] as const;
export const DEV_FRIEND_EVENTS = [] as const;
export const DEV_UNSYNCED_FRIEND_CODE = 'DEVUNSYNCED';
export function setDevSocialState(): boolean { return false; }
export function isDevSettingsFail(): boolean { return false; }
export function isDevReferralOff(): boolean { return false; }
export function getDevPromoResult(): null { return null; }
export function isDevFriendsHeld(): boolean { return false; }
export function isDevFriendsFail(): boolean { return false; }
export function isDevUnsyncedFriendCode(): boolean { return false; }
export function consumeDevFriendEvent(): null { return null; }
export function resetDevSocialStateForTests(): void {}
export default function __RouteShim() { return null; }
