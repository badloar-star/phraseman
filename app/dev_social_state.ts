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
import type { DailyPoll, DailyPollVote } from './daily_poll/daily_poll_model';

/** Результаты промокода. `off` — глобальный рубильник «промокоды выключены» (promo_disabled), `none` — снять фикстуру. */
export const DEV_PROMO_RESULTS = [
  'off', 'ok', 'lifetime', 'used', 'expired', 'disabled', 'limit', 'not_found', 'rate_limited', 'error', 'hold', 'none',
  // зачем (Авторизация 12.10, overlays-campaigns-013): «неверный формат» для кода макета WELC0ME (формат верный — ответ сервера подменяется)
  'bad_code',
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

// зачем (Авторизация 12.10, съёмка R1 community-008): `search` — поиск друга держится в загрузке (скелетон), ответа нет.
export const DEV_FRIENDS_HOLDS = ['add_request', 'search'] as const;
export type DevFriendsHold = (typeof DEV_FRIENDS_HOLDS)[number];
// зачем (Авторизация 12.10, съёмка R1): `search_offline` — поиск без сети, «Связь пропала» (community-015); `list` — список друзей
// не обновился, пустое состояние «Связь пропала» без подписок Firestore (community-021).
export const DEV_FRIENDS_FAILS = ['add', 'search', 'search_offline', 'list'] as const;
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
/** Служебный код «это твой код» (community-013): настоящий код меняется от аккаунта к аккаунту, робот его не знает. */
export const DEV_SELF_FRIEND_CODE = 'DEVSLF';
/** Опрос дня из памяти (community-023): `dailypoll=demo` — опрос без чтения daily_polls, `voted` — с уже отданным голосом. */
export const DEV_DAILY_POLLS = ['demo', 'voted'] as const;
export type DevDailyPoll = (typeof DEV_DAILY_POLLS)[number];

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
  /** settings-gap-012: «телефон не разрешает уведомления» — разрешение отклонено системой (только память, `notifperm=denied`). */
  notifPermDenied: boolean;
  dailyPoll: DevDailyPoll | null;
  /** Голос в «опросе» из памяти: сервер dailyPollVote не вызывается. */
  dailyPollVote: DailyPollVote | null;
};
const EMPTY: State = { referralOff: false, promo: null, refcode: null, friendsHolds: new Set(), friendsFails: new Set(), friendEvent: null, settingsFails: new Set(), supportSent: false, startedLanguages: null, notifPermDenied: false, dailyPoll: null, dailyPollVote: null };
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
  notifPermDenied: boolean;
  dailyPoll: DevDailyPoll | null;
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
    notifPermDenied: patch.notifPermDenied ?? state.notifPermDenied,
    dailyPoll: patch.dailyPoll === undefined ? state.dailyPoll : patch.dailyPoll,
    dailyPollVote: patch.dailyPoll === undefined ? state.dailyPollVote : null,
  };
  console.log(`${LOG} social: ${JSON.stringify({ referralOff: state.referralOff, promo: state.promo, refcode: state.refcode, holds: [...state.friendsHolds], fails: [...state.friendsFails], friendEvent: state.friendEvent, settingsFails: [...state.settingsFails], supportSent: state.supportSent, startedLanguages: state.startedLanguages, dailyPoll: state.dailyPoll })}`); // guard-ok: единичный лог на ссылку
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
/** `notifperm=denied`: системное разрешение на уведомления считается отклонённым без возможности спросить снова. */
export function isDevNotifPermDenied(): boolean {
  return devSocialAvailable() && state.notifPermDenied;
}

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
    case 'bad_code': return { status: 'bad_code' };
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

/** Служебный код «свой профиль» — только в dev. */
export function isDevSelfFriendCode(code: string): boolean {
  return devSocialAvailable() && code.trim().toUpperCase() === DEV_SELF_FRIEND_CODE;
}

const DEV_POLL_OPTIONS = [
  { id: 'short', text: { ru: 'Короткие занятия', uk: 'Короткі заняття', en: 'Short sessions' }, count: 64 },
  { id: 'friends', text: { ru: 'Занятия с друзьями', uk: 'Заняття з друзями', en: 'Studying with friends' }, count: 36 },
] as const;

/** Опрос дня из памяти (вне dev или без `dailypoll` — null): тексты — как в макете community.html «Активность и опрос дня». */
export function getDevDailyPoll(dateKey: string): { poll: DailyPoll; vote: DailyPollVote | null } | null {
  if (!devSocialAvailable() || state.dailyPoll === null) return null;
  const counts = Object.fromEntries(DEV_POLL_OPTIONS.map((o) => [o.id, o.count]));
  const poll: DailyPoll = {
    dateKey,
    question: { ru: 'Что помогает заниматься регулярно?', uk: 'Що допомагає займатися регулярно?', en: 'What helps you study regularly?' },
    options: DEV_POLL_OPTIONS.map((o) => ({ id: o.id, text: o.text })),
    counts,
  };
  const vote = state.dailyPollVote ?? (state.dailyPoll === 'voted' ? { optionId: 'short', counts } : null);
  return { poll, vote };
}

/** Голос в опросе из памяти (вне dev — null): счётчик выбранного варианта +1, сервер не вызывается. */
export function devDailyPollVote(optionId: string): DailyPollVote | null {
  const current = getDevDailyPoll('');
  if (!current) return null;
  const counts = { ...current.poll.counts, [optionId]: (current.poll.counts[optionId] ?? 0) + 1 };
  state = { ...state, dailyPollVote: { optionId, counts } };
  console.log(`${LOG} social: голос в опросе из памяти option=${optionId}`); // guard-ok: единичный лог на действие
  return state.dailyPollVote;
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
  errorScreen = false;
  appMessage = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

// ───────────────────── Экран ошибки и окно объявления (Авторизация 12.10, system-010 / system-012) ─────────────────────
// зачем: настоящий сбой рендера пишет отчёт о падении и журнал ошибок в Firestore (ErrorBoundary.componentDidCatch) — для кадра нельзя.
// `errorscreen=on` показывает экран корневого ErrorBoundary из памяти, без исключения и записей; снять — `errorscreen=off` или перезапуск
// («Повторить» сбрасывает только состояние границы — так требует сторож error_boundary_graphite_source_contract).
// Окно «сообщение команды» наполняется только после сети и скрыто у новичка < суток — `appmessage=announcement` кладёт демо-сообщение
// в очередь окна из памяти (app/_layout.tsx), подтверждение закрытия для него не отправляется.
export const DEV_APP_MESSAGES = ['announcement'] as const;
export type DevAppMessage = (typeof DEV_APP_MESSAGES)[number];
let errorScreen = false;
let appMessage: DevAppMessage | null = null;
const errorScreenListeners = new Set<() => void>();
const appMessageListeners = new Set<(kind: DevAppMessage | null) => void>();

export function setDevErrorScreen(on: boolean): boolean {
  if (!devSocialAvailable()) {
    console.warn(`${LOG} errorscreen: отклонено — не dev-сборка`); // guard-ok: ранний выход логируется
    return false;
  }
  errorScreen = on;
  console.log(`${LOG} errorscreen=${on ? 'on' : 'off'} (экран ошибки без исключения и отчётов)`); // guard-ok: единичный лог на ссылку
  errorScreenListeners.forEach((listener) => listener());
  return true;
}

export function isDevErrorScreen(): boolean {
  return devSocialAvailable() && errorScreen;
}

export function subscribeDevErrorScreen(listener: () => void): () => void {
  errorScreenListeners.add(listener);
  return () => { errorScreenListeners.delete(listener); };
}

export function setDevAppMessage(kind: DevAppMessage | null): boolean {
  if (!devSocialAvailable()) {
    console.warn(`${LOG} appmessage: отклонено — не dev-сборка`); // guard-ok: ранний выход логируется
    return false;
  }
  appMessage = kind;
  console.log(`${LOG} appmessage=${kind ?? 'off'} (демо-сообщение в окно объявления, без сети)`); // guard-ok: единичный лог на ссылку
  appMessageListeners.forEach((listener) => listener(kind));
  return true;
}

export function getDevAppMessage(): DevAppMessage | null {
  return devSocialAvailable() ? appMessage : null;
}

/** Подписка на подмену окна объявления; если флаг уже стоит — слушатель вызывается сразу. */
export function subscribeDevAppMessage(listener: (kind: DevAppMessage | null) => void): () => void {
  appMessageListeners.add(listener);
  const current = getDevAppMessage();
  if (current) listener(current);
  return () => { appMessageListeners.delete(listener); };
}

// ───────────────────── Удержание чистки кеша (Авторизация 13.10, settings-gap-007) ─────────────────────
// зачем: «чистим…» живёт доли секунды, а настоящая чистка стирает кеши тестового устройства. `cache=hold` держит строку в «чистим…»:
// clearAppCaches не возвращается и ничего не стирает. Снять — `cache=ok|failed` или перезапуск. В сторе геттер выключен.
let cacheClearHold = false;

export function setDevCacheClearHold(on: boolean): boolean {
  if (!devSocialAvailable()) {
    console.warn(`${LOG} cache=hold: отклонено — не dev-сборка`); // guard-ok: ранний выход логируется
    return false;
  }
  cacheClearHold = on;
  console.log(`${LOG} cache_clear_hold=${on ? 'on' : 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function isDevCacheClearHold(): boolean {
  return devSocialAvailable() && cacheClearHold;
}
