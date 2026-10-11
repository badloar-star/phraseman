/**
 * DEV-состояния «социального» слоя для робот-съёмки: промокоды, рубильник приглашений, друзья.
 * Ссылка `dev_state?referral=off&promo=used&dev_friends_hold=add_request&dev_friends_fail=search&friend_event=study_invite`
 * (R1_SHOT_LIST «нет пути»: settings-gap-030, overlays-campaigns-007…014/025, community-010/011/014/016/022).
 *
 * зачем (координатор 12.10): все эти кадры определяет сервер (ответ promoCodeRedeem, рубильник из Пульта, ответ поиска друга, событие от друга)
 * или они живут доли секунды. Здесь — флаги В ПАМЯТИ процесса (не диск, не Firestore, без сети): точки внедрения читают геттеры.
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттеры всегда «выключено», а установка отклоняется. Логи: [DEV-STATE].
 */
import { IS_STORE_RELEASE } from './config';
import type { PromoRedeemResult } from './promo_code_client';

/** Результаты промокода. `off` — глобальный рубильник «промокоды выключены» (promo_disabled), `none` — снять фикстуру. */
export const DEV_PROMO_RESULTS = [
  'off', 'ok', 'lifetime', 'used', 'expired', 'disabled', 'limit', 'not_found', 'rate_limited', 'error', 'none',
] as const;
export type DevPromoResult = (typeof DEV_PROMO_RESULTS)[number];

export const DEV_FRIENDS_HOLDS = ['add_request'] as const;
export type DevFriendsHold = (typeof DEV_FRIENDS_HOLDS)[number];
export const DEV_FRIENDS_FAILS = ['add', 'search'] as const;
export type DevFriendsFail = (typeof DEV_FRIENDS_FAILS)[number];
export const DEV_SETTINGS_FAILS = ['study_language', 'support_send', 'cache_clear'] as const;
export type DevSettingsFail = (typeof DEV_SETTINGS_FAILS)[number];
export const DEV_FRIEND_EVENTS = ['study_invite'] as const;
export type DevFriendEvent = (typeof DEV_FRIEND_EVENTS)[number];

/** Служебный код друга: «профиль найден, но не синхронизирован» (community-014) без обращения к серверу. */
export const DEV_UNSYNCED_FRIEND_CODE = 'DEVUNSYNCED';

const LOG = '[DEV-STATE]';

type State = {
  referralOff: boolean;
  promo: Exclude<DevPromoResult, 'none'> | null;
  friendsHolds: ReadonlySet<DevFriendsHold>;
  friendsFails: ReadonlySet<DevFriendsFail>;
  friendEvent: DevFriendEvent | null;
  /** Сбои Настроек (R1 settings-gap-009/021/036): смена языка изучения, отправка обращения, очистка кеша. */
  settingsFails: ReadonlySet<DevSettingsFail>;
};
const EMPTY: State = { referralOff: false, promo: null, friendsHolds: new Set(), friendsFails: new Set(), friendEvent: null, settingsFails: new Set() };
let state: State = EMPTY;

function devSocialAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Выставить флаги. Не переданное не меняется. В стор-сборке — отказ с логом. */
export function setDevSocialState(patch: Partial<{
  referralOff: boolean;
  promo: DevPromoResult | null;
  friendsHolds: readonly DevFriendsHold[];
  friendsFails: readonly DevFriendsFail[];
  friendEvent: DevFriendEvent | null;
  settingsFails: readonly DevSettingsFail[];
}>): boolean {
  if (!devSocialAvailable()) {
    console.warn(`${LOG} social: отклонено — не dev-сборка`, { keys: Object.keys(patch) }); // guard-ok: ранний выход логируется
    return false;
  }
  state = {
    referralOff: patch.referralOff ?? state.referralOff,
    promo: patch.promo === undefined ? state.promo : patch.promo === 'none' || patch.promo === null ? null : patch.promo,
    friendsHolds: patch.friendsHolds ? new Set(patch.friendsHolds) : state.friendsHolds,
    friendsFails: patch.friendsFails ? new Set(patch.friendsFails) : state.friendsFails,
    friendEvent: patch.friendEvent === undefined ? state.friendEvent : patch.friendEvent,
    settingsFails: patch.settingsFails ? new Set(patch.settingsFails) : state.settingsFails,
  };
  console.log(`${LOG} social: ${JSON.stringify({ referralOff: state.referralOff, promo: state.promo, holds: [...state.friendsHolds], fails: [...state.friendsFails], friendEvent: state.friendEvent, settingsFails: [...state.settingsFails] })}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function isDevSettingsFail(fail: DevSettingsFail): boolean {
  return devSocialAvailable() && state.settingsFails.has(fail);
}

export function isDevReferralOff(): boolean {
  return devSocialAvailable() && state.referralOff;
}

/** Подменённый ответ промокода или null (вне dev — всегда null). Время считается в момент ответа. */
export function getDevPromoResult(nowMs: number = Date.now()): PromoRedeemResult | null {
  if (!devSocialAvailable() || state.promo === null) return null;
  switch (state.promo) {
    case 'ok':
      return { status: 'redeemed', rewardDays: 30, rewardKind: 'days', vipUntilMs: nowMs + 30 * 24 * 60 * 60 * 1000, grantAtMs: nowMs };
    case 'lifetime':
      return { status: 'redeemed', rewardKind: 'lifetime', vipUntilMs: 0, grantAtMs: nowMs };
    case 'off': return { status: 'promo_disabled' };
    case 'used': return { status: 'already_redeemed' };
    case 'expired': return { status: 'expired' };
    case 'disabled': return { status: 'disabled' };
    case 'limit': return { status: 'limit_reached' };
    case 'not_found': return { status: 'not_found' };
    case 'rate_limited': return { status: 'rate_limited' };
    case 'error': return { status: 'error' };
  }
}

export function isDevFriendsHeld(hold: DevFriendsHold): boolean {
  return devSocialAvailable() && state.friendsHolds.has(hold);
}

export function isDevFriendsFail(fail: DevFriendsFail): boolean {
  return devSocialAvailable() && state.friendsFails.has(fail);
}

/** Служебный код «профиль не синхронизирован» — только в dev. */
export function isDevUnsyncedFriendCode(code: string): boolean {
  return devSocialAvailable() && code.trim().toUpperCase() === DEV_UNSYNCED_FRIEND_CODE;
}

/** Событие друга для экрана «Друзья»: отдаётся ОДИН раз (иначе окно всплывало бы на каждом фокусе). */
export function consumeDevFriendEvent(): DevFriendEvent | null {
  if (!devSocialAvailable() || state.friendEvent === null) return null;
  const event = state.friendEvent;
  state = { ...state, friendEvent: null };
  console.log(`${LOG} social: событие друга выдано один раз (${event})`); // guard-ok: единичный лог
  return event;
}

/** Только для тестов. */
export function resetDevSocialStateForTests(): void {
  state = EMPTY;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
