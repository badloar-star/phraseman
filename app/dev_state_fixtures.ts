/**
 * DEV-фикстуры состояний для робот-съёмки (Maestro, сессия «Эмулятор»).
 *
 * зачем (координатор 11.10, план выпуска 20.10): робот снимает каждое состояние макета сам. Ему нужен способ одной
 * ссылкой выставить энергию, Plus, режим энергии, Шпиль, онбординг — без тапов по Dev Hub.
 *   phraseman://dev_state?energy=0&plus=off&mode=b&spire=open&onboarding=done&free=on&next=/(tabs)/home
 * Дополнительно (12.10, список съёмки R1): `cards=demo_lessons|custom50`, `catalog=empty|demo`, `quota=N|exhausted|reset` (30 тренировок/мес),
 * `dquota=N|reset` (осталось N реплик диалога из 30), `vip=promo|promo_lifetime|referral|survey|idea|tester|admin|admin_lifetime|off`
 * (плашка Plus в Настройках; после неё перезапустить приложение: force-stop → start), `plus=inherit` (снять локальный override).
 * Только dev-сборка: в стор-сборке маршрут вырезан router.ctx.js, а функция ничего не делает. В Firestore не пишет —
 * только локальные ключи устройства и dev-переопределения.
 * Логи: [DEV-STATE].
 */
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_STORE_RELEASE } from './config';
import { ONBOARDING_COMPLETED_AT_KEY } from './fresh_install_gate';
import { requestDevOverlayRecheck, setDevOverlaysOff } from './dev_overlays_off';
import { emitAppEvent } from './events';
import { parseDevStreakJump, runDevStreakRestoreJump } from './dev_streak_restore_jump';
import { devSetEnergy, setDevEnergyModeOverride } from './dev_energy_tools';
import { getDevLocalPlusStorageKey, setDevLocalPlusOverride } from './dev_plus_controls';
import { setDevAsFreeFlag } from './dev_as_free_flag';
import { getStableId } from './stable_id';
import { setSpireTabDevOverride } from './spire_tab_flag';
import { forceRefreshSpireGatesNow } from './spire_gate_refresh';
import { DEV_LOGOUT_MODES, DEV_NAME_CHECKS, type DevNameCheck, DEV_SWITCH_MODES, setDevAccountState, type DevLogoutMode, type DevSwitchMode } from './dev_account_state';
import { DEV_FRIEND_EVENTS, isDevSettingsFail, type DevSettingsFail, DEV_FRIENDS_FAILS, DEV_FRIENDS_HOLDS, DEV_PROMO_RESULTS, DEV_REFCODE_RESULTS, setDevSocialState, type DevFriendEvent, type DevFriendsFail, type DevFriendsHold, type DevPromoResult, type DevRefcodeResult } from './dev_social_state';
import { setDevPaywallLinkState, type DevPaywallState } from './dev_paywall_state';
import { ONBOARDING_STEP_CATALOG } from './onboarding_flow';
import { DEV_CARDS_FAILS, DEV_CARDS_HOLDS, DEV_SPEECH_MODES, DEV_TRAIN_GATES, setDevCardsState, type DevCardsFail, type DevCardsHold, type DevSpeechMode, type DevTrainGate } from './dev_cards_state';
import { DEV_DIALOG_FAILS, DEV_DIALOG_MOODS, setDevDialogState, type DevDialogFail, type DevDialogMood } from './dev_dialog_state';
import { DEV_DIALOG_SENDS, type DevDialogSendMode } from './dev_dialog_send';

export type DevVipKind = 'promo' | 'promo_lifetime' | 'referral' | 'survey' | 'idea' | 'tester' | 'admin' | 'admin_lifetime' | 'off';
const VIP_KINDS = ['promo', 'promo_lifetime', 'referral', 'survey', 'idea', 'tester', 'admin', 'admin_lifetime', 'off'] as const;

/**
 * Значения локального снимка VIP (app/premium_vip_storage.ts) для плашки выдачи в группе Plus Настроек. Чистая функция.
 * Названия планов — те, что разбирает settings.tsx (vipAccessTitle): promo, promo_lifetime, referral, survey_vip, idea_reward, telegram_tester, admin_vip.
 * *_lifetime — без срока окончания (vip_until = 0). off — отозвано (vip_active = false).
 */
export function vipSnapshotValuesFor(kind: DevVipKind, nowMs: number): Record<'vip_active' | 'vip_plan' | 'vip_from' | 'vip_until' | 'vip_admin_override' | 'vip_admin_grant_at', string> {
  if (kind === 'off') {
    return { vip_active: 'false', vip_plan: '', vip_from: '0', vip_until: '0', vip_admin_override: 'false', vip_admin_grant_at: '' };
  }
  const plan = { promo: 'promo', promo_lifetime: 'promo_lifetime', referral: 'referral', survey: 'survey_vip', idea: 'idea_reward', tester: 'telegram_tester', admin: 'admin_vip', admin_lifetime: 'admin_vip' }[kind];
  const lifetime = kind === 'promo_lifetime' || kind === 'admin_lifetime';
  const admin = kind === 'admin' || kind === 'admin_lifetime';
  return {
    vip_active: 'true',
    vip_plan: plan,
    vip_from: String(nowMs - 60_000),
    vip_until: lifetime ? '0' : String(nowMs + 14 * 24 * 60 * 60 * 1000),
    // зачем: 'false' в override = «отозвано» (getVipProgressState), поэтому у не-админских видов поле пустое
    vip_admin_override: admin ? 'true' : '',
    vip_admin_grant_at: admin ? new Date(nowMs).toISOString() : '',
  };
}

export type DevStateRequest = Readonly<{
  energy?: number;
  mode?: 'a' | 'b' | 'server';
  plus?: 'on' | 'off' | 'inherit';
  /** Плашка доступа в группе Plus Настроек: вид выдачи (локальный снимок VIP; после неё — перезапуск приложения). */
  vip?: DevVipKind;
  /** Счётчик «N из 30 тренировок в месяц» (Free): использовано N, exhausted = 30, reset — стереть. */
  quota?: number | 'exhausted' | 'reset';
  /** Лимит реплик диалогов: осталось N из 30 (0 — «На этот месяц всё»), reset — стереть. */
  dquota?: number | 'reset';
  /** Пройденные диалоги в хабе (dialogs-003): первые N сценариев каталога отмечены пройденными (локальная запись устройства, только одноразовый гость), reset — стереть. */
  dialogsDone?: number | 'reset';
  /** Кэш каталога сообщества: пустой (живая сеть, «Здесь появятся наборы…») или демо-наборы. */
  catalog?: 'empty' | 'demo';
  spire?: 'open' | 'closed';
  onboarding?: 'done' | 'pending';
  free?: 'on' | 'off';
  /** Карточки 2.0: наполненный аккаунт как на кадрах макета (dev_state_cards_demo.ts); demo_lessons — те же 64 с источниками для фильтра; custom50 — 50 своих карточек (лимит Free). */
  cards?: 'demo' | 'demo_lessons' | 'custom50' | 'demo_published' | 'notranslation' | 'empty';
  /** Слот сообщений Настроек (R1 settings-gap-007…009, 029): dev-кампания — опрос / опрос с голосом / сообщение внизу / сообщение вверху / убрать. */
  /** Гипотеза падения qemu (координатор 14.10): off — все boxShadow стиля «Тень» выключены в памяти процесса, on — вернуть. */
  shadows?: 'on' | 'off';
  slot?: 'poll' | 'poll_voted' | 'message' | 'top' | 'off';
  /** Диалоги (R1 dialogs-*): отказ сервера, настроение, рубильник, удержание загрузки свободного разговора, отказ энергии. off — снять. */
  dialogFail?: DevDialogFail | 'off';
  dialogMood?: DevDialogMood | 'off';
  /** Подставной ход Диалога без ИИ и без Firestore (координатор 12.10, «N/30»): ok / отказы; off — снять. */
  dialogSend?: DevDialogSendMode | 'off';
  dialogsPaused?: 'on' | 'off';
  energyFail?: 'on' | 'off';
  /** Тост результата проверки статуса/восстановления покупок (R1 paywall-gap-011…013): показывается через ~0,9 с после ссылки. */
  toast?: 'purchase_confirmed' | 'restored' | 'status_not_found' | 'no_active_subscriptions' | 'status_check_failed' | 'restore_failed' | 'store_unreachable';
  /** Карточки (R1 «нет пути», Н-1): удержание загрузок через запятую или `off`. */
  hold?: readonly (DevCardsHold | 'freeform_loading' | 'dialog_language_gate')[] | 'off';
  /** Карточки (Н-2, Н-4, Н-6): искусственные сбои чтения/записи через запятую или `off`. */
  fail?: readonly DevCardsFail[] | 'off';
  /** «Устно» (Н-9): что подставить вместо микрофона. */
  speech?: DevSpeechMode | 'off';
  /** Отказ слоя отложенной выдачи тренировки (Н-10). */
  trainGate?: DevTrainGate | 'off';
  /** Окно решения модерации набора (Н-12): локальная постановка, без чтения почтового ящика продавца. */
  moderation?: 'approved' | 'rejected' | 'revision' | 'removed';
  /** Цена на пейволе без своего `_dev_state` (онбординг): loading|live|reference|failed, off снимает. */
  paywall?: 'loading' | 'live' | 'reference' | 'failed' | 'off';
  /** Онбординг: открыть с указанного шага (id из каталога, напр. onboardingPaywall для кадров «Цена: загрузка / настоящая цена»). Подразумевает onboarding=pending. Только dev. */
  onbStep?: string;
  /** Рубильник приглашений: off — выключен (settings-gap-030, overlays-campaigns-025), on — снять. */
  referral?: 'off' | 'on';
  /** Ответ промокода фикстурой, без сети: off=«промокоды выключены», ok, lifetime, used, expired, disabled, limit, not_found, rate_limited, error, none=снять. */
  promo?: DevPromoResult;
  /** Ответ шита «Код от друга» без сети (overlays-campaigns-016…026): hold, applied, already, invalid, unknown_code, self, too_old, disabled, error, needs_link, none=снять. */
  refcode?: DevRefcodeResult;
  /** Вход недоступен (onboarding-006): none — Google и Apple выключены, ok — снять. */
  auth?: 'none' | 'ok';
  /** Отказы смены аккаунта (R1 auth-gap-004/005/013/014/015/017/018) без реального стирания; ok снимает. */
  switch?: DevSwitchMode | 'ok';
  /** «Не удалось выйти» (profile-029): fail — после записи маркера, precommit — до него; ok снимает. */
  logout?: DevLogoutMode | 'ok';
  /** Ответ проверки имени без сети (settings-gap-024/025/026/031): checking, available, taken, error, none=снять. */
  namecheck?: DevNameCheck | 'none';
  /** «Удаление не завершилось» (auth-gap-011): имитация отказа, удаление не вызывается. */
  delete?: 'fail' | 'ok';
  /** `identity_retired` при входе (auth-gap-008). */
  restore?: 'retired' | 'ok';
  /** Имя на экране приветствия (onboarding-010): произвольная строка до 24 символов, пустая снимает. */
  greet?: string;
  /** Строка про перенос Plus в окне смены аккаунта (auth-gap-012). */
  plustransfer?: 'on' | 'off';
  /** Конфетти онбординга замирает на кадре пика (onboarding-019/020/021): hold — заморозить, off — как обычно. */
  confetti?: 'hold' | 'off';
  /** План подписки только в памяти (экран «Управление подпиской», значение «Год» в Настройках): yearly|monthly|lifetime, off снимает. */
  plan?: 'yearly' | 'monthly' | 'lifetime' | 'off';
  /** Сбой смены языка изучения (settings-gap-021). */
  studyfail?: 'on' | 'off';
  /** «Не отправилось» у обращения в поддержку (settings-gap-036). */
  support?: 'fail' | 'ok';
  /** «Не удалось» при очистке кеша (settings-gap-009). */
  cache?: 'failed' | 'ok';
  /** Друзья: удержание «отправки заявки» (add_request) или off. */
  friendsHold?: readonly DevFriendsHold[] | 'off';
  /** Друзья: отказ отправки заявки (add) / поиска (search) или off. */
  friendsFail?: readonly DevFriendsFail[] | 'off';
  /** Друзья: окно приглашения на занятие (study_invite), один раз. */
  friendEvent?: DevFriendEvent;
  /** Окна знакомства с разделами («Позже»): seen — пометить все показанными (не закрывать вручную на каждом кадре), reset — показать снова. */
  intros?: 'seen' | 'reset';
  /** Ранг монеты для ПОКАЗА (0..19): подмена значения хука useMyCoinRank в памяти процесса — монеты и ранг в хранилище/облако НЕ пишутся (dev_coin_rank.ts). off — снять. */
  coinRank?: number | 'off';
  /** Разовая подсказка «Зажми карточку…» (dev_state_cards_demo.ts): show — вернуть (cards-033), seen — пометить увиденной; фикстуры карточек сами помечают её увиденной. Только анонимный гость. */
  hint?: 'show' | 'seen';
  /** Подмена ответа гейта согласия на AI-диалоги (dev_ai_consent.ts): только память, запись согласия и облако НЕ вызываются. off — снять. */
  aiConsent?: 'granted' | 'off';
  /** Окна рассылок/объявлений/личных сообщений корневого экрана (dev_overlays_off.ts): off — погасить (только память), on — как обычно. */
  overlays?: 'on' | 'off';
  /** Серия «до:после восстановления» (например 5:12) — проверка [HOME-RESTORE-JUMP]: после кадра Главной + 3 с «приходит облако». */
  streakJump?: string;
  next?: string;
}>;

export type DevStateResult = Readonly<{ applied: Record<string, string>; skipped: Record<string, string>; next: string | null }>;

const one = (value: unknown): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' && raw.trim() ? raw.trim().toLowerCase() : undefined;
};

/** Разбор параметров ссылки. Неизвестные значения отбрасываются (и попадают в skipped с причиной). Чистая функция. */
export function parseDevStateParams(params: Readonly<Record<string, unknown>>): { request: DevStateRequest; rejected: Record<string, string> } {
  const rejected: Record<string, string> = {};
  const request: { -readonly [K in keyof DevStateRequest]: DevStateRequest[K] } = {};
  const energy = one(params.energy);
  if (energy !== undefined) {
    const n = Number(energy);
    if (Number.isInteger(n) && n >= 0 && n <= 5) request.energy = n;
    else rejected.energy = `ожидалось 0..5, пришло ${energy}`;
  }
  const pick = <T extends string>(key: string, allowed: readonly T[]): T | undefined => {
    const value = one(params[key]);
    if (value === undefined) return undefined;
    if ((allowed as readonly string[]).includes(value)) return value as T;
    rejected[key] = `ожидалось ${allowed.join('|')}, пришло ${value}`;
    return undefined;
  };
  request.mode = pick('mode', ['a', 'b', 'server'] as const);
  request.plus = pick('plus', ['on', 'off', 'inherit'] as const);
  request.vip = pick('vip', VIP_KINDS);
  request.catalog = pick('catalog', ['empty', 'demo'] as const);
  const intOrWord = <W extends string>(key: string, word: readonly W[], max: number): number | W | undefined => {
    const value = one(params[key]);
    if (value === undefined) return undefined;
    if ((word as readonly string[]).includes(value)) return value as W;
    const n = Number(value);
    if (Number.isInteger(n) && n >= 0 && n <= max) return n;
    rejected[key] = `ожидалось 0..${max} или ${word.join('|')}, пришло ${value}`;
    return undefined;
  };
  request.quota = intOrWord('quota', ['exhausted', 'reset'] as const, 30);
  request.dquota = intOrWord('dquota', ['reset'] as const, 30);
  request.dialogsDone = intOrWord('dialogsDone', ['reset'] as const, 76);
  request.spire = pick('spire', ['open', 'closed'] as const);
  request.onboarding = pick('onboarding', ['done', 'pending'] as const);
  // зачем (R1_PENDING_COVERAGE 2б, onboarding-025 / onboarding-paywall-001): дорога к экрану цены онбординга без прохода всех шагов. Допустимы только id каталога шагов.
  const onbStepRaw = one(params.onbstep);
  if (onbStepRaw !== undefined) {
    const ids = ONBOARDING_STEP_CATALOG.map((entry) => entry.id as string);
    const found = ids.find((id) => id.toLowerCase() === onbStepRaw.toLowerCase());
    if (found) {
      request.onbStep = found;
      request.onboarding = 'pending';
    } else {
      rejected.onbstep = `ожидался один из ${ids.join('|')}, пришло ${onbStepRaw}`;
    }
  }
  request.free = pick('free', ['on', 'off'] as const);
  request.cards = pick('cards', ['demo', 'demo_lessons', 'custom50', 'demo_published', 'notranslation', 'empty'] as const);
  request.slot = pick('slot', ['poll', 'poll_voted', 'message', 'top', 'off'] as const);
  request.dialogFail = pick('dev_dialog_fail', [...DEV_DIALOG_FAILS, 'off'] as const);
  request.dialogMood = pick('dev_dialog_mood', [...DEV_DIALOG_MOODS, 'off'] as const);
  request.dialogSend = pick('dev_dialog_send', [...DEV_DIALOG_SENDS, 'off'] as const);
  const onOff = (key: string): 'on' | 'off' | undefined => {
    const value = pick(key, ['1', 'on', 'true', '0', 'off', 'false'] as const);
    if (value === undefined) return undefined;
    return value === '1' || value === 'on' || value === 'true' ? 'on' : 'off';
  };
  request.dialogsPaused = onOff('dialogs_paused');
  request.shadows = onOff('shadows');
  request.intros = pick('intros', ['seen', 'reset'] as const);
  request.aiConsent = pick('aiConsent', ['granted', 'off'] as const);
  request.overlays = pick('overlays', ['on', 'off'] as const);
  request.hint = pick('hint', ['show', 'seen'] as const);
  const coinRankRaw = one(params.coinRank);
  if (coinRankRaw !== undefined) {
    const rankN = Number(coinRankRaw);
    if (coinRankRaw === 'off') request.coinRank = 'off';
    else if (Number.isInteger(rankN) && rankN >= 0 && rankN <= 19) request.coinRank = rankN;
    else rejected.coinRank = `ожидалось 0..19 или off, пришло ${coinRankRaw}`;
  }
  request.energyFail = onOff('dev_energy_fail');
  request.toast = pick('toast', ['purchase_confirmed', 'restored', 'status_not_found', 'no_active_subscriptions', 'status_check_failed', 'restore_failed', 'store_unreachable'] as const);
  // зачем (R1 «нет пути», Карточки): списки через запятую; любое неизвестное имя отбрасывается с причиной, остальные применяются.
  const list = <T extends string>(key: string, allowed: readonly T[]): readonly T[] | 'off' | undefined => {
    const raw = one(params[key]);
    if (raw === undefined) return undefined;
    if (raw === 'off') return 'off';
    const items = raw.split(',').map((item) => item.trim()).filter(Boolean);
    const ok = items.filter((item): item is T => (allowed as readonly string[]).includes(item));
    const bad = items.filter((item) => !(allowed as readonly string[]).includes(item));
    if (bad.length > 0) rejected[key] = `неизвестно ${bad.join(',')}; допустимо ${allowed.join('|')}|off`;
    return ok;
  };
  // зачем: `hold=` общий для Карточек и Диалогов (freeform_loading — «готовим разговор»), список через запятую или `off`.
  request.hold = list('hold', [...DEV_CARDS_HOLDS, 'freeform_loading', 'dialog_language_gate'] as const);
  request.fail = list('fail', DEV_CARDS_FAILS);
  request.speech = pick('speech', [...DEV_SPEECH_MODES, 'off'] as const);
  request.trainGate = pick('train_gate', [...DEV_TRAIN_GATES, 'off'] as const);
  request.moderation = pick('moderation', ['approved', 'rejected', 'revision', 'removed'] as const);
  request.paywall = pick('paywall', ['loading', 'live', 'reference', 'failed', 'off'] as const);
  request.referral = pick('referral', ['off', 'on'] as const);
  request.auth = pick('auth', ['none', 'ok'] as const);
  request.switch = pick('switch', [...DEV_SWITCH_MODES, 'ok'] as const);
  request.logout = pick('logout', [...DEV_LOGOUT_MODES, 'ok'] as const);
  request.namecheck = pick('namecheck', [...DEV_NAME_CHECKS, 'none'] as const);
  request.delete = pick('delete', ['fail', 'ok'] as const);
  request.restore = pick('restore', ['retired', 'ok'] as const);
  request.plustransfer = pick('plustransfer', ['on', 'off'] as const);
  request.confetti = pick('confetti', ['hold', 'off'] as const);
  // зачем: регистр имени важен — берём сырую строку (one() приводит к нижнему), обрезаем до 24 как настоящее первое слово имени.
  const greetRaw = Array.isArray(params.greet) ? params.greet[0] : params.greet;
  if (typeof greetRaw === 'string') request.greet = greetRaw.trim().slice(0, 24);
  request.plan = pick('plan', ['yearly', 'monthly', 'lifetime', 'off'] as const);
  request.studyfail = pick('studyfail', ['on', 'off'] as const);
  request.support = pick('support', ['fail', 'ok'] as const);
  request.cache = pick('cache', ['failed', 'ok'] as const);
  request.promo = pick('promo', DEV_PROMO_RESULTS);
  request.refcode = pick('refcode', DEV_REFCODE_RESULTS);
  request.friendsHold = list('dev_friends_hold', DEV_FRIENDS_HOLDS);
  request.friendsFail = list('dev_friends_fail', DEV_FRIENDS_FAILS);
  request.friendEvent = pick('friend_event', DEV_FRIEND_EVENTS);
  const streakJumpRaw = Array.isArray(params.streakJump) ? params.streakJump[0] : params.streakJump;
  if (streakJumpRaw !== undefined) {
    if (parseDevStreakJump(streakJumpRaw)) request.streakJump = String(streakJumpRaw).trim();
    else rejected.streakJump = `формат «до:после», например 5:12; пришло ${String(streakJumpRaw)}`;
  }
  const next = Array.isArray(params.next) ? params.next[0] : params.next;
  if (typeof next === 'string' && next.startsWith('/')) request.next = next;
  else if (next !== undefined) rejected.next = `маршрут должен начинаться с «/», пришло ${String(next)}`;
  return { request, rejected };
}

export function isDevStateAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Выставить состояния. Каждое — независимо: сбой одного не мешает остальным (и пишет причину). */
/** Потолок одного шага фикстуры, мс: зависший шаг снимается и пишется в skipped, а не держит экран «DEV-STATE…» вечно. */
const DEV_STATE_STEP_CEILING_MS = 15_000;

export async function applyDevState(request: DevStateRequest): Promise<DevStateResult> {
  const applied: Record<string, string> = {};
  const skipped: Record<string, string> = {};
  if (!isDevStateAvailable()) {
    console.warn('[DEV-STATE] refused: not a dev build'); // guard-ok: ранний выход логируется
    return { applied, skipped: { all: 'not_dev_build' }, next: null };
  }
  // зачем (первый прогон робота 12.10: cards-002/008/009/013 — 40 с на «DEV-STATE…» без перехода): шаг фикстуры мог зависнуть (замок записи карточек, переход
  // аккаунта) и держать ВЕСЬ экран; логов по шагам не было. Теперь каждый шаг пишет старт/итог с длительностью, а зависший снимается потолком
  // и попадает в skipped — переход на next не ждёт его вечно. Потолок короткий: следующие шаги, берущие тот же замок, тоже упрутся в свой потолок.
  const step = async (key: string, value: string, run: () => Promise<boolean | void>) => {
    const startedAt = Date.now();
    console.log(`[DEV-STATE] step ${key}=${value}: старт`); // guard-ok: трассировка шага
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const raced = await Promise.race([
        run(),
        new Promise<'__ceiling'>((resolve) => { timer = setTimeout(() => resolve('__ceiling'), DEV_STATE_STEP_CEILING_MS); }),
      ]);
      if (raced === '__ceiling') {
        skipped[key] = `${value}: потолок ${DEV_STATE_STEP_CEILING_MS} мс — шаг завис`;
        console.warn(`[DEV-STATE] step ${key}=${value}: ПОТОЛОК ${DEV_STATE_STEP_CEILING_MS} мс, идём дальше (шаг продолжает работать в фоне)`); // guard-ok: причина пропуска
        return;
      }
      if (raced === false) skipped[key] = `${value}: отказ`;
      else applied[key] = value;
      console.log(`[DEV-STATE] step ${key}=${value}: ${raced === false ? 'отказ' : 'ок'} за ${Date.now() - startedAt} мс`); // guard-ok: итог шага
    } catch (error) {
      skipped[key] = `${value}: ${error instanceof Error ? error.message : String(error)}`;
      console.warn(`[DEV-STATE] step ${key}=${value}: ОШИБКА за ${Date.now() - startedAt} мс`, skipped[key]); // guard-ok: причина ошибки шага
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  if (request.mode) {
    const mode = request.mode === 'a' ? 'start_charge' : request.mode === 'b' ? 'mistake_charge' : null;
    await step('mode', request.mode, () => setDevEnergyModeOverride(mode));
  }
  if (request.energy !== undefined) await step('energy', String(request.energy), () => devSetEnergy(request.energy!));
  if (request.plus) {
    await step('plus', request.plus, async () => {
      const stableId = await getStableId();
      if (request.plus === 'inherit') {
        // зачем: убрать локальный override — иначе projectDevLocalPlusOverride всегда гасит isVip/isPro и плашки выдачи не видны. Применится после перезапуска.
        await AsyncStorage.removeItem(getDevLocalPlusStorageKey(stableId));
        console.log('[DEV-STATE] plus override cleared (inherit) — перезапусти приложение'); // guard-ok: единичный лог на ссылку
        return;
      }
      await setDevLocalPlusOverride(stableId, request.plus === 'on' ? 'granted' : 'removed');
    });
  }
  if (request.vip) {
    await step('vip', request.vip, async () => {
      const stableId = await getStableId();
      // зачем (координатор 12.10): VIP-снимок входит в облачную синхронизацию — подмена только В ПАМЯТИ (app/dev_vip_override.ts), в хранилище не пишем.
      // Плашка выдачи видна только без dev-override Plus (см. plus=inherit) — снимаем его (это отдельный dev-ключ, в синхронизацию не входит).
      await AsyncStorage.removeItem(getDevLocalPlusStorageKey(stableId));
      const { setDevVipOverride } = await import('./dev_vip_override');
      if (!setDevVipOverride(stableId, vipSnapshotValuesFor(request.vip!, Date.now()), 'vip')) throw new Error('vip_override_refused');
      emitAppEvent('vip_activated');
      emitAppEvent('premium_access_changed', { active: request.vip !== 'off', source: 'vip' });
      console.log('[DEV-STATE] vip memory_only', JSON.stringify({ kind: request.vip })); // guard-ok: единичный лог на ссылку
    });
  }
  if (request.free) await step('free', request.free, () => setDevAsFreeFlag(request.free === 'on'));
  if (request.spire) {
    await step('spire', request.spire, async () => {
      await setSpireTabDevOverride(request.spire === 'open');
      if (request.spire === 'open') await forceRefreshSpireGatesNow();
    });
  }
  if (request.onboarding) {
    await step('onboarding', request.onboarding, async () => {
      if (request.onboarding === 'done') {
        await AsyncStorage.setItem('onboarding_done', '1');
        // зачем (координатор 12.10, cards-009/010): настоящий онбординг пишет ещё и время завершения (CleanOnboarding), по нему ворота «свежая установка» прячут рассылку у новичка;
        // без отметки тестовый гость считался старым пользователем, и «Замочки ушли в отпуск!» всплывало поверх кадра. Только dev: этот модуль вырезан из стор-сборки.
        await AsyncStorage.setItem(ONBOARDING_COMPLETED_AT_KEY, String(Date.now()));
        requestDevOverlayRecheck('onboarding_done');
      } else {
        await AsyncStorage.multiRemove(['onboarding_done', 'onboarding_step', 'onboarding_flow_version_v1']);
        if (request.onbStep) {
          // зачем: CleanOnboarding восстанавливает шаг из этих двух ключей (версия потока + шаг); только локальные ключи прогресса онбординга, в облако не уходят.
          const { CLEAN_ONBOARDING_FLOW_VERSION } = await import('../components/CleanOnboarding');
          await AsyncStorage.multiSet([['onboarding_flow_version_v1', CLEAN_ONBOARDING_FLOW_VERSION], ['onboarding_step', request.onbStep]]);
          console.log('[DEV-STATE] onbstep', request.onbStep, '— онбординг откроется с этого шага'); // guard-ok: единичный лог на ссылку
        }
        emitAppEvent('dev_onboarding_restart');
      }
    });
  }
  if (request.cards === 'demo' || request.cards === 'demo_lessons') {
    await step('cards', request.cards, async () => {
      const { applyCardsDemo } = await import('./dev_state_cards_demo');
      const demo = await applyCardsDemo({ lessons: request.cards === 'demo_lessons' });
      for (const [key, reason] of Object.entries(demo.skipped)) skipped[`cards.${key}`] = reason;
      return Object.keys(demo.skipped).length === 0;
    });
  }
  // зачем (R1_SHOT_LIST «нет пути»): локальные состояния Карточек, лимитов и каталога — только ключи устройства, без записи в Firestore.
  if (request.cards === 'empty') {
    await step('cards', 'empty', async () => {
      const { applyCardsEmpty } = await import('./dev_state_cards_demo');
      const empty = await applyCardsEmpty();
      for (const [key, reason] of Object.entries(empty.skipped)) skipped[`cards.${key}`] = reason;
      return Object.keys(empty.skipped).length === 0;
    });
  }
  if (request.cards === 'custom50') {
    await step('cards', 'custom50', async () => {
      const { applyCustomCards } = await import('./dev_state_cards_demo');
      await applyCustomCards();
    });
  }
  if (request.cards === 'demo_published') {
    await step('cards', 'demo_published', async () => {
      const { applyDemoPublished } = await import('./dev_state_cards_demo');
      return applyDemoPublished(await getStableId()).then(() => undefined);
    });
  }
  if (request.cards === 'notranslation') {
    await step('cards', 'notranslation', async () => {
      const { applyNoTranslationCards } = await import('./dev_state_cards_demo');
      await applyNoTranslationCards();
    });
  }
  if (request.catalog) {
    await step('catalog', request.catalog, async () => {
      const { applyCatalog } = await import('./dev_state_cards_demo');
      await applyCatalog(request.catalog!);
    });
  }
  if (request.quota !== undefined) {
    await step('quota', String(request.quota), async () => {
      const { applyTrainingQuota } = await import('./dev_state_cards_demo');
      await applyTrainingQuota(await getStableId(), request.quota!);
    });
  }
  if (request.dquota !== undefined) {
    await step('dquota', String(request.dquota), async () => {
      const { applyDialogQuota } = await import('./dev_state_cards_demo');
      await applyDialogQuota(await getStableId(), request.dquota!);
    });
  }
  if (request.dialogsDone !== undefined) {
    // зачем (координатор 12.10, dialogs-003): кадр хаба с «пройдено ✓» и счётчиком; запись локальная (в облако не уходит), но пишем только на одноразовом госте, как остальные фикстуры прогресса
    await step('dialogsDone', String(request.dialogsDone), async () => {
      const { assertDisposableGuest } = await import('./dev_state_account_guard');
      assertDisposableGuest('dialogsDone');
      const done = await import('./dialogue_v2_done_store');
      const { DIALOGUE_V2_CATALOGUE_INDEX } = await import('../shared/dialogue_v2_catalogue_index');
      const { peekStudyTargetRaw } = await import('./app_snapshot_bootstrap');
      await done.clearAllDialogueV2DoneStore();
      if (request.dialogsDone === 'reset') return true;
      const target = peekStudyTargetRaw() ?? 'en';
      const ids = DIALOGUE_V2_CATALOGUE_INDEX.slice(0, request.dialogsDone as number).map((entry) => entry.id);
      console.log(`[DIALOG-DONE] fixture dialogsDone target=${target} ids=${ids.join(',')}`); // guard-ok: единичный лог на ссылку
      return ids.every((id) => done.markDialogueV2Done(target, id));
    });
  }
  if (request.shadows) {
    await step('shadows', request.shadows, async () => {
      const { setDevShadowsOff } = await import('../constants/liquidGlassShadowStyle');
      return setDevShadowsOff(request.shadows === 'off');
    });
  }
  if (request.slot) {
    await step('slot', request.slot, async () => {
      const { devSeedSettingsMessageSlot } = await import('./app_messages');
      const seeded = await devSeedSettingsMessageSlot(request.slot!, await getStableId());
      if (!seeded.ok) throw new Error(seeded.reason);
    });
  }
  // зачем (R1 «нет пути», Диалоги): флаги в памяти процесса; dialogs_paused=1 — тот же отказ 'paused', что отдаёт сервер при рубильнике раздела.
  if (request.dialogFail !== undefined || request.dialogsPaused !== undefined) {
    await step('dialogFail', String(request.dialogFail ?? (request.dialogsPaused === 'on' ? 'paused' : 'off')), async () => {
      const fail = request.dialogFail !== undefined
        ? (request.dialogFail === 'off' ? null : request.dialogFail)
        : (request.dialogsPaused === 'on' ? 'paused' : null);
      return setDevDialogState({ fail });
    });
  }
  if (request.dialogSend !== undefined) {
    // зачем (координатор 12.10): старт сессии и ход Диалога без сети — Сверка снимает «N/30» без ИИ на проде.
    await step('dialogSend', request.dialogSend, async () => setDevDialogState({ send: request.dialogSend === 'off' ? null : request.dialogSend! }));
  }
  if (request.dialogMood !== undefined) {
    await step('dialogMood', request.dialogMood, async () => setDevDialogState({ mood: request.dialogMood === 'off' ? null : request.dialogMood! }));
  }
  if (request.energyFail !== undefined) {
    await step('energyFail', request.energyFail, async () => setDevDialogState({ energyFail: request.energyFail === 'on' }));
  }
  if (request.overlays !== undefined) {
    // зачем (координатор 12.10): для кадров, где окна не нужны, гасим все очередные окна корня (память, без записи и без отметок «прочитано»)
    await step('overlays', request.overlays, async () => setDevOverlaysOff(request.overlays === 'off'));
  }
  if (request.aiConsent !== undefined) {
    // зачем (координатор 12.10): у гостя нет согласия на ИИ — «Начать» открывает шторку согласия вместо сессии; подменяем ТОЛЬКО ответ гейта (память), recordAiDialogConsent не вызывается
    await step('aiConsent', request.aiConsent, async () => {
      const { setDevAiConsentGranted } = await import('./dev_ai_consent');
      return setDevAiConsentGranted(request.aiConsent === 'granted');
    });
  }
  if (request.coinRank !== undefined) {
    // зачем (координатор 12.10): у гостя ранг 0 — все диалоги «Откроется на ранге 1…6»; подмена ТОЛЬКО значения хука, без записи монет и ранга (ранг синхронизируемый)
    await step('coinRank', String(request.coinRank), async () => {
      const { setDevCoinRankOverride } = await import('./dev_coin_rank');
      return setDevCoinRankOverride(request.coinRank === 'off' ? null : (request.coinRank as number));
    });
  }
  if (request.intros) {
    await step('intros', request.intros, async () => {
      const registry = await import('./feature_intro_registry');
      if (request.intros === 'seen') {
        const count = await registry.markAllFeatureIntrosSeen();
        console.log(`[DEV-STATE] intros: помечено показанными ${count} окон знакомства`); // guard-ok: итог фикстуры
      } else {
        await registry.resetAllFeatureIntrosSeen();
        console.log('[DEV-STATE] intros: «показано» сброшено — окна знакомства появятся снова'); // guard-ok: итог фикстуры
      }
    });
  }
  if (request.toast) {
    await step('toast', request.toast, async () => {
      // зачем (R1 paywall-gap-011…013): те же тексты, что у покупателя (paywallRestoreToast); задержка — чтобы маршрут `next` успел открыться.
      const { paywallRestoreToast } = await import('./paywall_purchase');
      const kind = request.toast!;
      setTimeout(() => {
        const payload = paywallRestoreToast(kind);
        // зачем (координатор 12.10, «сперва логи»): что пришло, какой тост выбран и сколько хостов тостов подписано (0 = хост не смонтирован)
        console.log(`[DEV-STATE] toast: ${kind} → type=${payload.type} текст="${payload.messageRu.slice(0, 60)}" хостовПодписано=${DeviceEventEmitter.listenerCount('action_toast')}`); // guard-ok: dev-ветка
        emitAppEvent('action_toast', payload);
      }, 900);
    });
  }
  // зачем (R1 «нет пути», Карточки): флаги в памяти процесса (app/dev_cards_state.ts); `off` снимает.
  if (request.hint !== undefined) {
    await step('hint', request.hint, async () => {
      const { applyDeleteHintState } = await import('./dev_state_cards_demo');
      await applyDeleteHintState(request.hint!);
    });
  }
  if (request.hold !== undefined) {
    await step('hold', request.hold === 'off' ? 'off' : request.hold.join(','), async () => {
      const holds = request.hold === 'off' ? [] : request.hold!;
      const cardHolds = holds.filter((item): item is DevCardsHold => item !== 'freeform_loading' && item !== 'dialog_language_gate');
      setDevDialogState({ holdFreeformLoading: holds.includes('freeform_loading'), holdLanguageGate: holds.includes('dialog_language_gate') });
      return setDevCardsState({ holds: cardHolds });
    });
  }
  if (request.fail !== undefined) {
    await step('fail', request.fail === 'off' ? 'off' : request.fail.join(','), async () => setDevCardsState({ fails: request.fail === 'off' ? [] : request.fail }));
  }
  if (request.speech !== undefined) {
    await step('speech', request.speech, async () => setDevCardsState({ speech: request.speech === 'off' ? null : request.speech! }));
  }
  if (request.trainGate !== undefined) {
    await step('train_gate', request.trainGate, async () => setDevCardsState({ trainGate: request.trainGate === 'off' ? null : request.trainGate! }));
  }
  // зачем (R1 «нет пути», аккаунт/друзья): флаги в памяти процесса (app/dev_social_state.ts, app/dev_paywall_state.ts); без сети.
  if (request.paywall !== undefined) {
    await step('paywall', request.paywall, async () => {
      const map: Record<NonNullable<DevStateRequest['paywall']>, DevPaywallState | null> = { loading: 'loading', live: 'live', reference: 'reference', failed: 'error_no_prices', off: null };
      return setDevPaywallLinkState(map[request.paywall!]);
    });
  }
  // зачем (R1 «нет пути», аккаунт): флаги в памяти (app/dev_account_state.ts); хуки отказывают ДО побочных эффектов — стирание/удаление/вход недостижимы.
  if (request.auth !== undefined) await step('auth', request.auth, async () => setDevAccountState({ authNone: request.auth === 'none' }));
  if (request.switch !== undefined) await step('switch', request.switch, async () => setDevAccountState({ switchMode: request.switch === 'ok' ? null : request.switch! }));
  if (request.logout !== undefined) await step('logout', request.logout, async () => setDevAccountState({ logoutMode: request.logout === 'ok' ? null : request.logout! }));
  if (request.namecheck !== undefined) await step('namecheck', request.namecheck, async () => setDevAccountState({ nameCheck: request.namecheck === 'none' ? null : request.namecheck! }));
  if (request.delete !== undefined) await step('delete', request.delete, async () => setDevAccountState({ deleteFail: request.delete === 'fail' }));
  if (request.restore !== undefined) await step('restore', request.restore, async () => setDevAccountState({ restoreRetired: request.restore === 'retired' }));
  if (request.streakJump !== undefined) {
    // зачем (координатор 12.10): у тестовых аккаунтов серия 0 — моделируем «облако принесло другую серию» (только dev).
    await step('streakJump', request.streakJump, async () => {
      const jump = parseDevStreakJump(request.streakJump);
      if (!jump) return false;
      const { whenHomePainted } = await import('./home_paint_marker');
      await runDevStreakRestoreJump(jump, { whenHomePainted, wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) });
      return true;
    });
  }
  if (request.greet !== undefined) await step('greet', request.greet || 'off', async () => setDevAccountState({ greetName: request.greet || null }));
  if (request.plustransfer !== undefined) await step('plustransfer', request.plustransfer, async () => setDevAccountState({ plusTransfer: request.plustransfer === 'on' }));
  if (request.confetti !== undefined) await step('confetti', request.confetti, async () => setDevAccountState({ confettiHold: request.confetti === 'hold' }));
  if (request.plan !== undefined) {
    await step('plan', request.plan, async () => {
      const { setDevPlanOverride } = await import('./dev_vip_override');
      return setDevPlanOverride(request.plan === 'off' ? null : request.plan!);
    });
  }
  if (request.studyfail !== undefined || request.support !== undefined || request.cache !== undefined) {
    await step('settings_fail', [request.studyfail, request.support, request.cache].filter(Boolean).join(','), async () => {
      const fails: DevSettingsFail[] = [];
      if (request.studyfail === 'on') fails.push('study_language');
      if (request.support === 'fail') fails.push('support_send');
      if (request.cache === 'failed') fails.push('cache_clear');
      // зачем: параметры независимы — явный «выключатель» (off/ok) снимает только свой сбой, остальные сохраняются.
      const kept = (['study_language', 'support_send', 'cache_clear'] as const).filter((fail) => {
        const touched = (fail === 'study_language' && request.studyfail !== undefined) || (fail === 'support_send' && request.support !== undefined) || (fail === 'cache_clear' && request.cache !== undefined);
        return !touched && isDevSettingsFail(fail);
      });
      return setDevSocialState({ settingsFails: [...kept, ...fails] });
    });
  }
  if (request.referral !== undefined) {
    await step('referral', request.referral, async () => setDevSocialState({ referralOff: request.referral === 'off' }));
  }
  if (request.promo !== undefined) {
    await step('promo', request.promo, async () => setDevSocialState({ promo: request.promo }));
  }
  if (request.refcode !== undefined) {
    await step('refcode', request.refcode, async () => setDevSocialState({ refcode: request.refcode }));
  }
  if (request.friendsHold !== undefined) {
    await step('dev_friends_hold', request.friendsHold === 'off' ? 'off' : request.friendsHold.join(','), async () => setDevSocialState({ friendsHolds: request.friendsHold === 'off' ? [] : request.friendsHold }));
  }
  if (request.friendsFail !== undefined) {
    await step('dev_friends_fail', request.friendsFail === 'off' ? 'off' : request.friendsFail.join(','), async () => setDevSocialState({ friendsFails: request.friendsFail === 'off' ? [] : request.friendsFail }));
  }
  if (request.friendEvent !== undefined) {
    await step('friend_event', request.friendEvent, async () => setDevSocialState({ friendEvent: request.friendEvent }));
  }
  if (request.moderation) {
    await step('moderation', request.moderation, async () => {
      // зачем (cards-gap-014…017): то же окно, что у автора после решения модерации; задержка — чтобы маршрут `next` успел открыться.
      const { devShowModerationAlert } = await import('./community_packs/communityModerationAlerts');
      const result = request.moderation === 'revision' ? 'revision_requested' : request.moderation === 'removed' ? 'pack_removed' : request.moderation!;
      setTimeout(() => {
        console.log(`[DEV-STATE] moderation: ${result}`); // guard-ok: dev-ветка
        void devShowModerationAlert(result);
      }, 900);
    });
  }
  const result = { applied, skipped, next: request.next ?? null };
  console.log('[DEV-STATE] applied', JSON.stringify(result));
  return result;
}
