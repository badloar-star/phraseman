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
import type { ReferralApplyStatus } from './referral_bootstrap';

/** Результаты промокода. `off` — глобальный рубильник «промокоды выключены» (promo_disabled), `none` — снять фикстуру. */
export const DEV_PROMO_RESULTS = [
  'off', 'ok', 'lifetime', 'used', 'expired', 'disabled', 'limit', 'not_found', 'rate_limited', 'error', 'hold', 'none',
] as const;
export type DevPromoResult = (typeof DEV_PROMO_RESULTS)[number];

/**
 * Ответ шита «Код от друга» (overlays-campaigns-016…026, макет referral-code-states.html): `hold` — держать «Применяем…»,
 * остальное — статус применения кода. При подмене шит не зовёт ни сервер, ни поиск владельца кода, ни заявку в друзья.
 */
export const DEV_REFCODE_RESULTS = [
  'hold', 'applied', 'already', 'invalid', 'unknown_code', 'self', 'too_old', 'disabled', 'error', 'needs_link', 'none',
] as const;
export type DevRefcodeResult = (typeof DEV_REFCODE_RESULTS)[number];

export const DEV_FRIENDS_HOLDS = ['add_request'] as const;
export type DevFriendsHold = (typeof DEV_FRIENDS_HOLDS)[number];
export const DEV_FRIENDS_FAILS = ['add', 'search'] as const;
export type DevFriendsFail = (typeof DEV_FRIENDS_FAILS)[number];
export const DEV_SETTINGS_FAILS = ['study_language', 'support_send', 'cache_clear'] as const;
export type DevSettingsFail = (typeof DEV_SETTINGS_FAILS)[number];
export const DEV_FRIEND_EVENTS = ['study_invite'] as const;
export type DevFriendEvent = (typeof DEV_FRIEND_EVENTS)[number];

/**
 * Служебный код друга: «профиль найден, но не синхронизирован» (community-014) без обращения к серверу.
 * зачем (Ядро 12.10): поле кода режет ввод до 6 знаков (normalizeInviteCodeInput), а экран считает кодом ровно 6 знаков —
 * прежний «DEVUNSYNCED» поэтому не срабатывал никогда. Сравниваем по первым шести: и «DEVUNS», и набранный «DEVUNSYNCED».
 */
export const DEV_UNSYNCED_FRIEND_CODE = 'DEVUNS';
/** Служебный код «найден друг» (community-009/010/011/017…019): карточка найденного профиля без сервера, заявка — без отправки. */
export const DEV_FOUND_FRIEND_CODE = 'DEVFND';
export const DEV_FOUND_FRIEND_UID = 'dev_found_friend';

const LOG = '[DEV-STATE]';

type State = {
  referralOff: boolean;
  promo: Exclude<DevPromoResult, 'none'> | null;
  refcode: Exclude<DevRefcodeResult, 'none'> | null;
  friendsHolds: ReadonlySet<DevFriendsHold>;
  friendsFails: ReadonlySet<DevFriendsFail>;
  friendEvent: DevFriendEvent | null;
  /** Сбои Настроек (R1 settings-gap-009/021/036): смена языка изучения, отправка обращения, очистка кеша. */
  settingsFails: ReadonlySet<DevSettingsFail>;
  /** settings-gap-023: «Обращение отправлено» без настоящей отправки и очереди (Авторизация 12.10, `support=sent`). */
  supportSent: boolean;
  /** settings-gap-020/021: «начатые» языки изучения поверх хранилища (Авторизация 12.10, `started=en,es`) — шторка языка без мини-онбординга. */
  startedLanguages: readonly string[] | null;
};
const EMPTY: State = { referralOff: false, promo: null, refcode: null, friendsHolds: new Set(), friendsFails: new Set(), friendEvent: null, settingsFails: new Set(), supportSent: false, startedLanguages: null };
let state: State = EMPTY;

function devSocialAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Выставить флаги. Не переданное не меняется. В стор-сборке — отказ с логом. */
export function setDevSocialState(patch: Partial<{
  referralOff: boolean;
  promo: DevPromoResult | null;
  refcode: DevRefcodeResult | null;
  friendsHolds: readonly DevFriendsHold[];
  friendsFails: readonly DevFriendsFail[];
  friendEvent: DevFriendEvent | null;
  settingsFails: readonly DevSettingsFail[];
  supportSent: boolean;
  startedLanguages: readonly string[] | null;
}>): boolean {
  if (!devSocialAvailable()) {
    console.warn(`${LOG} social: отклонено — не dev-сборка`, { keys: Object.keys(patch) }); // guard-ok: ранний выход логируется
    return false;
  }
  state = {
    referralOff: patch.referralOff ?? state.referralOff,
    promo: patch.promo === undefined ? state.promo : patch.promo === 'none' || patch.promo === null ? null : patch.promo,
    refcode: patch.refcode === undefined ? state.refcode : patch.refcode === 'none' || patch.refcode === null ? null : patch.refcode,
    friendsHolds: patch.friendsHolds ? new Set(patch.friendsHolds) : state.friendsHolds,
    friendsFails: patch.friendsFails ? new Set(patch.friendsFails) : state.friendsFails,
    friendEvent: patch.friendEvent === undefined ? state.friendEvent : patch.friendEvent,
    settingsFails: patch.settingsFails ? new Set(patch.settingsFails) : state.settingsFails,
    supportSent: patch.supportSent ?? state.supportSent,
    startedLanguages: patch.startedLanguages === undefined ? state.startedLanguages : patch.startedLanguages,
  };
  console.log(`${LOG} social: ${JSON.stringify({ referralOff: state.referralOff, promo: state.promo, refcode: state.refcode, holds: [...state.friendsHolds], fails: [...state.friendsFails], friendEvent: state.friendEvent, settingsFails: [...state.settingsFails], supportSent: state.supportSent, startedLanguages: state.startedLanguages })}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function isDevSettingsFail(fail: DevSettingsFail): boolean {
  return devSocialAvailable() && state.settingsFails.has(fail);
}

/** `support=sent`: отправка обращения подменяется успехом без сети и очереди (вне dev — всегда false). */
export function isDevSupportFakeSent(): boolean {
  return devSocialAvailable() && state.supportSent;
}

/** `started=en,es`: коды начатых языков, которые добавляются к сохранённому списку (вне dev — всегда null). */
export function getDevStartedLanguages(): readonly string[] | null {
  return devSocialAvailable() ? state.startedLanguages : null;
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
    // `hold` — не ответ, а удержание «Активируем…» (см. isDevPromoHold).
    case 'hold': return null;
  }
}

/** `promo=hold` (overlays-campaigns-006): активация промокода висит, кнопка остаётся «Активируем…»; сеть не используется. */
export function isDevPromoHold(): boolean {
  return devSocialAvailable() && state.promo === 'hold';
}

/** Подменённый ответ шита «Код от друга» или null (вне dev — всегда null). */
export function getDevReferralApplyResult(): 'hold' | ReferralApplyStatus | null {
  if (!devSocialAvailable()) return null;
  return state.refcode;
}

export function isDevFriendsHeld(hold: DevFriendsHold): boolean {
  return devSocialAvailable() && state.friendsHolds.has(hold);
}

export function isDevFriendsFail(fail: DevFriendsFail): boolean {
  return devSocialAvailable() && state.friendsFails.has(fail);
}

/** Служебный код «профиль не синхронизирован» — только в dev. */
export function isDevUnsyncedFriendCode(code: string): boolean {
  return devSocialAvailable() && code.trim().toUpperCase().startsWith(DEV_UNSYNCED_FRIEND_CODE);
}

/** Служебный код «найден друг» — только в dev. */
export function isDevFoundFriendCode(code: string): boolean {
  return devSocialAvailable() && code.trim().toUpperCase() === DEV_FOUND_FRIEND_CODE;
}

/** Подставной найденный друг: заявка ему не уходит на сервер (вне dev — всегда false). */
export function isDevFoundFriendUid(uid: string): boolean {
  return devSocialAvailable() && uid === DEV_FOUND_FRIEND_UID;
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
