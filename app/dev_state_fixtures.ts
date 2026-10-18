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
import { devSeenResetKeys, parseDevSeenRequest, type DevSeenRequest } from './dev_seen_reset';
import { ONBOARDING_COMPLETED_AT_KEY } from './fresh_install_gate';
import { requestDevOverlayRecheck, setDevOverlaysOff } from './dev_overlays_off';
import { setDevAnimationsOff } from './dev_animations_off';
import { setDevRobotNoCloud } from './dev_robot_no_cloud';
import { setDevSaveOfferOpen, setDevSaveOfferProgress } from './dev_save_offer_progress';
import { DEV_UI_LANGS, setDevUiLang, type DevUiLangRequest } from './dev_ui_lang';
import { setDevMistakesDemo, setDevMistakesFinale } from './dev_mistakes_demo';
import { setDevFriendsDemo } from './dev_friends_demo';
import { emitAppEvent } from './events';
import { parseDevStreakJump, runDevStreakRestoreJump } from './dev_streak_restore_jump';
import { parseDevStreakMilestone } from './dev_streak_milestone';
import { devSetEnergy, devSetEnergyRestoringIn, setDevEnergyModeOverride } from './dev_energy_tools';
import { getDevLocalPlusStorageKey, setDevLocalPlusOverride } from './dev_plus_controls';
import { setDevAsFreeFlag } from './dev_as_free_flag';
import { getStableId } from './stable_id';
import { setSpireTabDevOverride } from './spire_tab_flag';
import { setSoundV2DevOverride } from '../modules/sound_v2/sound_v2_flag';
import { getDevThemeChoice, setDevAppearance, setDevThemeChoice } from './dev_appearance_override';
import { LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { forceRefreshSpireGatesNow } from './spire_gate_refresh';
import { DEV_LOGOUT_MODES, DEV_NAME_CHECKS, type DevNameCheck, DEV_RESTORE_MODES, DEV_SIGNIN_MODES, DEV_SWITCH_MODES, setDevAccountState, type DevLogoutMode, type DevSignInMode, type DevSwitchMode } from './dev_account_state';
import { DEV_FRIEND_EVENTS, isDevSettingsFail, type DevSettingsFail, DEV_FRIENDS_FAILS, DEV_FRIENDS_HOLDS, DEV_PROMO_RESULTS, DEV_REFCODE_RESULTS, setDevSocialState, type DevFriendEvent, type DevFriendsFail, type DevFriendsHold, type DevPromoResult, type DevRefcodeResult } from './dev_social_state';
import { setDevEnergyStopPlusGranted } from './dev_energy_stop_flag';
import { DEV_LESSON_UPSELLS, setDevAiExplainDemo, setDevAiExplainLimit, setDevLessonUpsell, setDevManageLoadingHold, setDevPaywallLinkState, setDevRestorePurchaseEmpty, type DevLessonUpsell, type DevPaywallState } from './dev_paywall_state';
import { ONBOARDING_STEP_CATALOG } from './onboarding_flow';
import { DEV_BLITZ_ANSWERS, DEV_CARDS_FAILS, DEV_CARDS_HOLDS, DEV_CARDS_VOICES, DEV_COMMUNITY_COMMENTS, DEV_SPEECH_MODES, DEV_TRAIN_GATES, DEV_PACK_DRAFTS, setDevCardsState, setDevCommunityState, setDevLessonIntroSkip, setDevPackDraft, setDevPublishOk, type DevCardsFail, type DevCardsHold, type DevCommunityComments, type DevSpeechMode, type DevTrainGate } from './dev_cards_state';
import { DEV_DIALOG_COMPLETIONS, DEV_DIALOG_FAILS, DEV_DIALOG_MEMORY, DEV_DIALOG_MOODS, setDevDialogState, type DevDialogCompletion, type DevDialogFail, type DevDialogMemory, type DevDialogMood } from './dev_dialog_state';
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

/** Бета-тест Б16: типы пушей для dev-имитации тапа — по одному на каждую ветку разбора в notification_tap_handler. */
const DEV_NOTIF_TAP_TYPES = [
  'reminder', 'streak_at_risk', 'upsell_d4', 'youtube_premiere', 'activity_like',
  'premium_expiry_reminder', 'premium_expiry_vip', 'spire_week_result', 'arena_friend_invite', 'unknown_type',
] as const;

export type DevStateRequest = Readonly<{
  energy?: number;
  /** `energy=restoring&restore_in=N`: энергия 0, следующая единица через N с (energy-modes-008). */
  energyRestoreInSec?: number;
  /** Шторка остановки: «Продолжить с Plus» выдаёт Plus в памяти вместо пейвола (energy-modes-006). */
  energyStop?: 'plus_granted' | 'off';
  /** Вступление урока считается показанным (только память). */
  lessonIntro?: 'skip' | 'off';
  /** Уведомления: системное разрешение отклонено (settings-gap-012), только память. */
  notifPerm?: 'denied' | 'off';
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
  /** Звуки V2 (modules/sound_v2): on — включить на устройстве (dev-переключатель вместо удалённого флага sound_v2), off — выключить. */
  soundv2?: 'on' | 'off';
  /** Моменты вовлечения v3: v3 — включить на устройстве (вместо удалённого флага moments_v3), off — выключить, inherit — как в удалённом конфиге. */
  moments?: 'v3' | 'off' | 'inherit';
  /** Оформление light/dark ТОЛЬКО в памяти (хранилище не тронуто); clear — снять оверрайд. Для съёмки светлых образцов ссылкой. */
  appearance?: 'light' | 'dark' | 'clear';
  /** Тема Liquid Glass ТОЛЬКО в памяти (id из LIQUID_GLASS_THEME_IDS); clear — снять. Образец макетов — grad_aurora (Сверка chain7, 12.10). */
  theme?: string;
  /** Оттенок ползунка 0..1 ТОЛЬКО в памяти; clear — снять. Образец макетов — 1 (полная насыщенность). */
  level?: number | 'clear';
  onboarding?: 'done' | 'pending';
  free?: 'on' | 'off';
  /** Карточки 2.0: наполненный аккаунт как на кадрах макета (dev_state_cards_demo.ts); demo_lessons — те же 64 с источниками для фильтра; custom50 — 50 своих карточек (лимит Free). */
  cards?: 'demo' | 'demo_lessons' | 'demo_nopacks' | 'demo_few' | 'custom50' | 'demo_published' | 'notranslation' | 'empty';
  /** Слот сообщений Настроек (R1 settings-gap-007…009, 029): dev-кампания — опрос / опрос с голосом / сообщение внизу / сообщение вверху / убрать. */
  /** Гипотеза падения qemu (координатор 14.10): off — все boxShadow стиля «Тень» выключены в памяти процесса, on — вернуть. */
  shadows?: 'on' | 'off';
  slot?: 'poll' | 'poll_voted' | 'message' | 'top' | 'off';
  /** Диалоги (R1 dialogs-*): отказ сервера, настроение, рубильник, удержание загрузки свободного разговора, отказ энергии. off — снять. */
  dialogFail?: DevDialogFail | 'off';
  dialogMood?: DevDialogMood | 'off';
  /** Подставной ход завершает диалог (dialogs-037) / даёт «Лучше так» (dialogs-021); итог без сервера (dialogs-040/042/044, gap-007/008). */
  dialogEnd?: 'on' | 'off';
  dialogBetter?: 'on' | 'off';
  dialogCompletion?: DevDialogCompletion | 'off';
  /** Память диалогов без сервера (dialogs-gap-001/004/005/006). */
  dialogMemory?: DevDialogMemory | 'off';
  dialogVoice?: 'spent' | 'off';
  /** Карточка отзыва итога диалога — «Отзыв отправлен» без реальной отправки (dialogs-044); off — снять. */
  dialogFeedback?: 'sent' | 'off';
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
  /** «Скажи вслух» (R11): точный текст вместо микрофона, до 200 знаков; без `speech=` включает `speech=correct`. */
  speakTranscript?: string | 'off';
  /** Отказ слоя отложенной выдачи тренировки (Н-10). */
  trainGate?: DevTrainGate | 'off';
  /** Блиц: пометить верный (`correct`) или неверный (`wrong`) вариант testID `fc-blitz-opt-target` для робота (app/dev_cards_state.ts). Только память. */
  blitzAnswer?: 'correct' | 'wrong' | 'off';
  /** «Правда/ложь» и «Напиши» (Авторизация 12.10, cards-v2-038/039): какой ответ дать роботу. */
  answer?: 'correct' | 'wrong' | 'off';
  /** Опрос дня из памяти на вкладке «Друзья» (Авторизация 12.10, community-023). */
  dailypoll?: 'demo' | 'voted' | 'off';
  /** Сообщество без сети (съёмка R1 Карточек): демо-наборы с карточками в памяти (on) или режим без карточек (off). */
  packcards?: 'on' | 'meta' | 'off';
  /** Список голосов озвучки (cards-gap-036/038): demo — образцовый, none — пусто. */
  voices?: 'demo' | 'none' | 'off';
  /** Готовый черновик нового набора из памяти: on — 12 в сообщество (cards-072), few — 4 (069), full — 50 (071), private — без публикации (073). */
  packdraft?: (typeof DEV_PACK_DRAFTS)[number] | 'off';
  /** filled — редактор новой карточки (create=1) открывается с заполненными полями «Layover / пересадка» без клавиатуры (cards-061, образец cards-v2 №24); off — снять. */
  cardsdraft?: 'filled' | 'off';
  /** Ветка откликов демо-набора: три отклика (demo) или пусто (empty). */
  comments?: DevCommunityComments | 'off';
  /** reset — забыть «добавленное»/лайки/отправленное; added — «добавлены» демо-наборы 2, 1, 3 (cards-044); off — выключить режим. */
  community?: 'reset' | 'added' | 'off';
  /** «Мои ошибки» с данными (app/dev_mistakes_demo.ts): demo — хаб рисует шесть демо-ошибок, off — выключить. Только память, только одноразовый гость. */
  mistakes?: 'demo' | 'off';
  /** Финал тренировки «Ошибок» с потраченной попыткой дня (app/dev_mistakes_demo.ts): число неверных (wrong=, 1..20, по умолчанию 2) или off. Тратит настоящую попытку одноразового гостя. */
  mistakesFinale?: number | 'off';
  /** Друзья со входящей заявкой (app/dev_friends_demo.ts): demo — одна заявка и один друг, off — выключить. Только память, только одноразовый гость, без подписок Firestore. */
  friends?: 'demo' | 'off';
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
  /** fail — отказ локальной фазы; throw — исключение «Удаление не завершилось» (auth-gap-011); ok — снять. */
  delete?: 'fail' | 'throw' | 'ok';
  /** `identity_retired` при входе (auth-gap-008); offer|restored — окно «Восстановить аккаунт?» без сервера (auth-gap-007/006). */
  restore?: 'retired' | 'offer' | 'restored' | 'ok';
  /** Результат входа без сети (onboarding-003/004/008): hold — 60 с и «отменено», offline — «нет связи», generic — общая ошибка; off — снять. */
  signin?: DevSignInMode | 'off';
  /** Имя на экране приветствия (onboarding-010): произвольная строка до 24 символов, пустая снимает. */
  greet?: string;
  /** Строка про перенос Plus в окне смены аккаунта (auth-gap-012). */
  plustransfer?: 'on' | 'off';
  /** Конфетти онбординга замирает на кадре пика (onboarding-019/020/021): hold — заморозить, off — как обычно. */
  confetti?: 'hold' | 'off';
  /** План подписки только в памяти (экран «Управление подпиской», значение «Год» в Настройках): yearly|monthly|lifetime, off снимает. */
  plan?: 'yearly' | 'monthly' | 'lifetime' | 'off';
  /** зачем (бэклог №18, profile-024 / paywalls-022): дата следующего списания dev-плана, как в образце, «YYYY-MM-DD» (UTC-полдень). */
  planUntilMs?: number;
  /** Сбой смены языка изучения (settings-gap-021). */
  studyfail?: 'on' | 'off';
  /** «Не отправилось» у обращения в поддержку (settings-gap-036); sent — «Обращение отправлено» без сети (settings-gap-023). */
  support?: 'fail' | 'ok' | 'sent';
  /** «Управление подпиской»: скелетон загрузки магазина держится (paywalls-020 = profile-019). */
  manage?: 'loading' | 'off';
  /** empty — «Восстановить покупки» в «Управлении Plus» сразу «Покупок не нашлось», магазин не вызывается (dev_paywall_state.ts). */
  restorePurchase?: 'empty' | 'off';
  /** Начатые языки изучения поверх хранилища, только память (settings-gap-020/021). */
  started?: readonly ('en' | 'es' | 'de' | 'fr' | 'it')[] | 'off';
  /** Мягкое предложение Plus на итоге урока без кулдаунов (paywalls-009/010). */
  upsell?: DevLessonUpsell | 'off';
  /** Карточка ИИ-разбора ошибки сразу «лимит дня» (paywalls-008). */
  aiExplain?: 'limit' | 'off' | 'demo';
  /** learn-007…013 (Ядро 12.10): первые N уроков пройдены на 5 звёзд — только память, хранилище не трогается. */
  lessonsDone?: number | 'off';
  /** learn-007/008 (Ядро 12.10): результат экзамена A1 в памяти — «почти» (61%) или «сдан». */
  examA1?: 'almost' | 'passed' | 'off';
  /** learn-012/013 (Ядро 13.10): ворота уроков как в релизе (без DEV_CONTENT_UNLOCK) — окна A11/A12 вместо экрана зачёта. */
  lessonGates?: 'real' | 'off';
  /** settings-gap-005 (Ядро 13.10): пробный доступ «3 дня» активен — только память, окна приветствия не всплывают. */
  introAccess?: 'active' | 'off';
  /** learn-013 (Ядро 13.10): сохранённый бесплатный потолок старого аккаунта (D122) при plus=off — только память. */
  legacyCap?: number | 'off';
  /** dialogs-020 (Ядро 12.10): бесплатные «Почему так» на сегодня исчерпаны — только память. */
  dialogWhy?: 'spent' | 'off';
  /** Итог диалога: награда «начислена» без настоящего начисления (координатор 13.10) — только память. */
  dialogCoins?: 'award' | 'off';
  /** «Не удалось» при очистке кеша (settings-gap-009). */
  cache?: 'failed' | 'ok' | 'hold';
  /** Друзья: удержание «отправки заявки» (add_request) или off. */
  friendsHold?: readonly DevFriendsHold[] | 'off';
  /** Друзья: отказ отправки заявки (add) / поиска (search) или off. */
  friendsFail?: readonly DevFriendsFail[] | 'off';
  /** Друзья: окно приглашения на занятие (study_invite), один раз. */
  friendEvent?: DevFriendEvent;
  /** Окна знакомства с разделами («Позже»): seen — пометить все показанными (не закрывать вручную на каждом кадре), reset — показать снова. */
  intros?: 'seen' | 'reset';
  /** Сброс «уже показано» окон «один раз на аккаунт»: reset — все; energy | welcome | plus | referral | stories | team — одно (dev_seen_reset.ts). */
  seen?: DevSeenRequest;
  /** Ранг монеты для ПОКАЗА (0..19): подмена значения хука useMyCoinRank в памяти процесса — монеты и ранг в хранилище/облако НЕ пишутся (dev_coin_rank.ts). off — снять. */
  coinRank?: number | 'off';
  /** m08 «Молния»: монета держится ×N (1..10) — поймать «выглядывание» и «радость» на кадре; off — снять (combo_moment_gate.ts). */
  m08Hold?: number | 'off';
  /** Лига башни Шпиля для ПОКАЗА (0..11, Гранит…Алмаз): подмена выбора наряда башни в памяти процесса — неделя, комната и облако не меняются (dev_spire_tier.ts). off — снять. */
  spireTier?: number | 'off';
  /** Короткий урок 1.0 для честной проверки итога: N заданий (1..10) вместо 50, начисление — боевой код (dev_short_lesson). */
  shortLesson?: number | 'off';
  /** Исход карточки «Итог недели» Шпиля для ПОКАЗА (макет «Итог недели»): up — повышение в Базальт, stay — остаёшься в Граните, down — понижение, top — высшая лига Алмаз, marble — Мрамор, obsidian — остаёшься в Обсидиане; off — снять (dev_spire_tier.ts). */
  spireWeek?: 'up' | 'stay' | 'down' | 'top' | 'marble' | 'obsidian' | 'off';
  /** Прокрутка окна башни Пика для ПОКАЗА: top — к началу сцены (конус и навершие в кадре), off — снять (координатор 13.10, №25б). */
  spireScroll?: 'top' | 'off';
  /** D162: рубильник комнаты Пика для ПОКАЗА — coins (по монетам недели), steps (по ступеням), off — снять (решает config/spire_v1.rankBy). */
  spireRankBy?: 'coins' | 'steps' | 'off';
  /** Баланс монет для ПОКАЗА (0..10 000 000) на «Монетах» и «Повысить ранг»; при подмене настоящее повышение отказывает до сервера (dev_coin_rank.ts). off — снять. */
  coins?: number | 'off';
  /** hold — тап «Повысить» держит «Проверяем повышение…», сервер не вызывается. */
  coinUpgrade?: 'hold' | 'off';
  /** on — корневой ErrorBoundary показывает экран ошибки без исключения и отчётов (dev_social_state.ts). */
  errorScreen?: 'on' | 'off';
  /** announcement — демо-сообщение в окно «сообщение команды» из памяти, без сети. */
  appMessage?: 'announcement' | 'off';
  /** show — окно «включить напоминания» (notifNudge) тем же событием, что в релизе; нужен overlays=on (умное напоминание, 13.10). */
  notifNudge?: 'show';
  /** Разовая подсказка «Зажми карточку…» (dev_state_cards_demo.ts): show — вернуть (cards-033), seen — пометить увиденной; фикстуры карточек сами помечают её увиденной. Только анонимный гость. */
  hint?: 'show' | 'seen';
  /** п.83 (cards-027): наборы ДРУГИХ языков для кнопки языка на настройке тренировки — только память (dev_fc_lang_state.ts); off — снять. */
  cardsLangs?: 'on' | 'off';
  /** п.85(2) («Из видео — Пока пусто»): empty — каталог роликов пуст (пустой ответ в памяти и локальном кэше, Firestore не трогается), demo — 5 демо-роликов; catalog / catalog_upcoming — демо-каталог YouTube («Видео»: ролики, плейлисты, премьера «сейчас» / «скоро», фразы с таймкодами) + те же 5 наборов, только память (app/dev_youtube_demo.ts). */
  videoPacks?: 'empty' | 'demo' | 'catalog' | 'catalog_upcoming';
  /** Подмена ответа гейта согласия на AI-диалоги (dev_ai_consent.ts): только память, запись согласия и облако НЕ вызываются. denied — экран «AI-диалоги выключены» (dialogs-010). off — снять. */
  aiConsent?: 'granted' | 'denied' | 'off';
  /** system-015: empty — входящие пусты (только показ, dismiss в облако не уходит); off — снять (dev_robot_display.ts). */
  inbox?: 'empty' | 'off';
  /** settings-gap-028: HH:MM — время напоминания на экране настроек уведомлений (только показ); off — снять. */
  reminderTime?: string;
  /** results-009: demo — «Активность за год» с заполненной сеткой и итогами образца (только память, dev_year_activity.ts); off — снять. */
  yearActivity?: 'demo' | 'off';
  /** Окна рассылок/объявлений/личных сообщений корневого экрана (dev_overlays_off.ts): off — погасить (только память), on — как обычно. */
  overlays?: 'on' | 'off';
  /** Бесконечные декоративные анимации (dev_animations_off.ts): off — не запускать «парение» стопки хаба (только память), on — как в продукте. Нужно роботу: uiautomator не доходит до покоя на вечной анимации. */
  animations?: 'on' | 'off';
  /** `robot_no_cloud=1`: тумблеры Уведомлений и Приватности меняют только экран — без сохранения и облака (только память). */
  robotNoCloud?: '1' | '0';
  /** `guest=required`: ссылка не применяет НИЧЕГО и не переходит на next, если на устройстве не анонимный гость (№1/№2/№3, Google/Apple). */
  guest?: 'required';
  /** `account=support_only`: ссылка не применяет НИЧЕГО и не переходит на next, если на устройстве не аккаунт №3 «Phraseman Support» (Google). */
  account?: 'support_only' | 'linked';
  /** Публикация набора «отправлено» без сети и записи (Авторизация 12.10, cards-gap-025). */
  publish?: 'ok' | 'off';
  /** Прогресс для шага удержания в отмене подписки (dev_save_offer_progress.ts): on — 12 дней подряд и 38 уроков (только память), чтобы шаг робота не ушёл в браузер магазина. */
  offerProgress?: 'on' | 'off';
  /** Экран подписки сразу на шаге удержания (dev_save_offer_progress.ts): progress / support, off — выключить (только память). */
  saveOffer?: 'progress' | 'support' | 'off';
  /** Английский интерфейс без глобального флага (dev_ui_lang.ts): en — открыть ворота en и переключить язык, off — вернуть сохранённый. Только память, в сторе отклоняется. */
  uiLang?: DevUiLangRequest;
  /** Путь вызовов входа (auth_callable_fetch.ts): on — fetch, off — нативный, мимо флага auth_callables_fetch_v1. Только память, только dev. */
  authFetch?: 'on' | 'off';
  /** «Сегодня» на Главной с заданием Пика (координатор 13.10, «Шпиль → Пик»): только показ, хранилище не трогается. */
  todaytask?: 'spire' | 'off';
  lv2progress?: number | 'off';
  lv2save?: 'fail' | 'off';
  legacybonus?: 'demo' | 'pearls' | 'nothing' | 'off';
  /** D192: флаг stories_v1 в памяти — on/off/inherit (без пересборки с EXPO_PUBLIC_STORIES_DEV). */
  stories?: 'on' | 'off' | 'inherit';
  /** D192: засев историй в памяти — all (4 непросмотренные), seen (4 просмотренные), none (пусто), off. */
  storyseed?: 'all' | 'seen' | 'none' | 'off';
  /** Бета-тест Б16: имитация тапа по пушу этого типа тем же разбором, что настоящий тап (через 1,2 с после шагов). */
  notif?: (typeof DEV_NOTIF_TAP_TYPES)[number];
  lv2voice?: number | 'off';
  /** [WINBACK-FREEZE]: гейт winback считает, что человек не заходил N дней (3 / 8 / 30) или снять. Только память. */
  winbackaway?: '3' | '8' | '30' | 'off';
  /** D193 (полная проверка 15.10): окно «С возвращением» — «не заходил N дней» для гейта окна (нужен moments=v3). Только память. */
  welcomeback?: '3' | '8' | '30' | 'off';
  /** settings-gap-034: показ «Обучения» с «Автопроверка вкл, 1,0x» как в образце. Только память. */
  edu?: 'parity' | 'off';
  /** Язык изучения гостя (dev_state_study_target.ts): только dev, только одноразовый гость, локально и без выгрузки в облако. Нужен кадру «Нет карточек» (у en всегда есть «Первые 50»). */
  studyTarget?: 'en' | 'es' | 'de' | 'fr' | 'it';
  /** Серия «до:после восстановления» (например 5:12) — проверка [HOME-RESTORE-JUMP]: после кадра Главной + 3 с «приходит облако». */
  streakJump?: string;
  /** Серия N (только __DEV__): «сегодня засчитан день, серия стала N»; рубеж покажет следующий итог урока/разговора/карточек/ошибок при moments=v3. */
  streakMilestone?: number;
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
    else if (energy === 'restoring') {
      // зачем (координатор 12.10, energy-modes-008): таймер «Нужна энергия» доходит до нуля за restore_in секунд (по умолчанию 3).
      const restoreIn = Number(one(params.restore_in) ?? 3);
      if (Number.isInteger(restoreIn) && restoreIn >= 1 && restoreIn <= 600) request.energyRestoreInSec = restoreIn;
      else rejected.restore_in = `ожидалось 1..600 секунд, пришло ${String(one(params.restore_in))}`;
    } else rejected.energy = `ожидалось 0..5 или restoring, пришло ${energy}`;
  }
  // зачем (координатор 18.10, Сверка d1cdb9ac5): one() опускает регистр, а допустимые коды бывают со смешанным регистром
  // (uiLang 'pt-BR') — «pt-br» не совпадало и ссылка отклонялась. Сравниваем без учёта регистра и возвращаем КАНОНИЧНЫЙ код.
  // Только dev-ссылка (parseDevStateParams); прод этот разбор не использует.
  const pick = <T extends string>(key: string, allowed: readonly T[]): T | undefined => {
    const value = one(params[key]);
    if (value === undefined) return undefined;
    const canonical = allowed.find((a) => a.toLowerCase() === value);
    if (key === 'uiLang') {
      const raw = Array.isArray(params[key]) ? (params[key] as unknown[])[0] : params[key];
      console.log('[DEV-UILANG] pick', JSON.stringify({ raw, normalized: value, allowed, decision: canonical ?? 'rejected' })); // guard-ok: dev-ссылка, раз на разбор
    }
    if (canonical !== undefined) return canonical;
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
  request.soundv2 = pick('soundv2', ['on', 'off'] as const);
  request.moments = pick('moments', ['v3', 'off', 'inherit'] as const);
  request.appearance = pick('appearance', ['light', 'dark', 'clear'] as const);
  // зачем (Сверка chain7 12.10): тема и оттенок образца (Аврора, полная насыщенность) выставляются ссылкой, а не руками в настройках
  const themeRaw = one(params.theme);
  if (themeRaw !== undefined) {
    if (themeRaw === 'clear' || (LIQUID_GLASS_THEME_IDS as readonly string[]).includes(themeRaw)) request.theme = themeRaw;
    else rejected.theme = `ожидалось clear или id темы (${LIQUID_GLASS_THEME_IDS.join('|')}), пришло ${themeRaw}`;
  }
  const levelRaw = one(params.level);
  if (levelRaw !== undefined) {
    const n = Number(levelRaw);
    if (levelRaw === 'clear') request.level = 'clear';
    else if (levelRaw.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 1) request.level = n;
    else rejected.level = `ожидалось 0..1 или clear, пришло ${levelRaw}`;
  }
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
  request.cards = pick('cards', ['demo', 'demo_lessons', 'demo_nopacks', 'demo_few', 'custom50', 'demo_published', 'notranslation', 'empty'] as const);
  request.slot = pick('slot', ['poll', 'poll_voted', 'message', 'top', 'off'] as const);
  request.dialogFail = pick('dev_dialog_fail', [...DEV_DIALOG_FAILS, 'off'] as const);
  request.dialogMood = pick('dev_dialog_mood', [...DEV_DIALOG_MOODS, 'off'] as const);
  request.dialogEnd = pick('dev_dialog_end', ['on', 'off'] as const);
  request.dialogBetter = pick('dev_dialog_better', ['on', 'off'] as const);
  request.dialogCompletion = pick('dev_dialog_completion', [...DEV_DIALOG_COMPLETIONS, 'off'] as const);
  request.dialogMemory = pick('dev_dialog_memory', [...DEV_DIALOG_MEMORY, 'off'] as const);
  request.dialogVoice = pick('dev_dialog_voice', ['spent', 'off'] as const);
  request.dialogFeedback = pick('dev_dialog_feedback', ['sent', 'off'] as const);
  request.dialogSend = pick('dev_dialog_send', [...DEV_DIALOG_SENDS, 'off'] as const);
  const onOff = (key: string): 'on' | 'off' | undefined => {
    const value = pick(key, ['1', 'on', 'true', '0', 'off', 'false'] as const);
    if (value === undefined) return undefined;
    return value === '1' || value === 'on' || value === 'true' ? 'on' : 'off';
  };
  request.dialogsPaused = onOff('dialogs_paused');
  request.shadows = onOff('shadows');
  request.intros = pick('intros', ['seen', 'reset'] as const);
  if (params.seen !== undefined) {
    const seen = parseDevSeenRequest(one(params.seen));
    if (seen) request.seen = seen;
    else rejected.seen = `ожидалось reset | energy | welcome | plus | referral | stories | team, пришло ${String(one(params.seen))}`;
  }
  request.aiConsent = pick('aiConsent', ['granted', 'denied', 'off'] as const);
  // зачем (координатор 18.10): короткая ссылка для Сверки — consent=on|off = aiConsent=granted|off (та же подмена в памяти, только dev).
  if (request.aiConsent === undefined) {
    const consentShort = pick('consent', ['on', 'off'] as const);
    if (consentShort !== undefined) request.aiConsent = consentShort === 'on' ? 'granted' : 'off';
  }
  request.inbox = pick('inbox', ['empty', 'off'] as const);
  {
    const rawTime = one(params.reminderTime);
    if (rawTime !== undefined) {
      if (rawTime === 'off') request.reminderTime = 'off';
      else if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(rawTime)) request.reminderTime = rawTime;
      else rejected.reminderTime = `ожидалось HH:MM или off, пришло ${rawTime}`;
    }
  }
  request.yearActivity = pick('yearActivity', ['demo', 'off'] as const);
  request.overlays = pick('overlays', ['on', 'off'] as const);
  request.animations = pick('animations', ['on', 'off'] as const);
  request.robotNoCloud = pick('robot_no_cloud', ['1', '0'] as const);
  request.guest = pick('guest', ['required'] as const);
  request.account = pick('account', ['support_only', 'linked'] as const);
  request.publish = pick('publish', ['ok', 'off'] as const);
  request.offerProgress = pick('offerProgress', ['on', 'off'] as const);
  request.saveOffer = pick('saveOffer', ['progress', 'support', 'off'] as const);
  // зачем (координатор 15.10, утренняя съёмка): любой из 9 языков интерфейса по ссылке, не только en
  request.uiLang = pick('uiLang', [...DEV_UI_LANGS, 'off'] as const);
  request.authFetch = pick('authFetch', ['on', 'off'] as const);
  request.todaytask = pick('todaytask', ['spire', 'off'] as const);
  // зачем (Макеты 15.10, съёмка курса V2): «пройдено N первых занятий» — только память
  request.lv2progress = intOrWord('lv2progress', ['off'] as const, 56);
  request.lv2save = pick('lv2save', ['fail', 'off'] as const);
  // зачем (D195, Дизайн 15.10): окно «Встречайте PhraseMan 2.0» с примерными цифрами — только память
  request.legacybonus = pick('legacybonus', ['demo', 'pearls', 'nothing', 'off'] as const);
  // зачем (координатор + Макеты 15.10, съёмка D192 stories-s1…s3): кольцо и просмотр сторис без удалённого конфига и настоящих фактов — только память
  request.stories = pick('stories', ['on', 'off', 'inherit'] as const);
  request.storyseed = pick('storyseed', ['all', 'seen', 'none', 'off'] as const);
  // зачем (бета-тест 15.10, Б16): проверить, что тап по каждому типу пуша открывает нужный экран, без настоящей рассылки
  request.notif = pick('notif', DEV_NOTIF_TAP_TYPES);
  // зачем (координатор 15.10, съёмка D194 voice-limit-001…006): остаток голоса на сегодня в курсе — только память
  request.lv2voice = intOrWord('lv2voice', ['off'] as const, 3);
  request.winbackaway = pick('winbackaway', ['3', '8', '30', 'off'] as const);
  request.welcomeback = pick('welcomeback', ['3', '8', '30', 'off'] as const);
  request.edu = pick('edu', ['parity', 'off'] as const);
  request.studyTarget = pick('studyTarget', ['en', 'es', 'de', 'fr', 'it'] as const);
  request.hint = pick('hint', ['show', 'seen'] as const);
  request.cardsLangs = pick('cardslangs', ['on', 'off'] as const);
  request.videoPacks = pick('videopacks', ['empty', 'demo', 'catalog', 'catalog_upcoming'] as const);
  // зачем (координатор 13.10, наряды башен лиг): у гостя лиги нет — Сверке нужны кадры всех 12 лиг; подмена ТОЛЬКО выбора наряда башни
  // зачем (координатор 15.10): Сверка проходит урок до итога за N заданий — «серия / сегодня засчитан», монеты и звёзды тем же кодом, что в бою
  const shortLessonRaw = one(params.shortLesson);
  if (shortLessonRaw !== undefined) {
    const shortN = Number(shortLessonRaw);
    if (shortLessonRaw === 'off') request.shortLesson = 'off';
    else if (Number.isInteger(shortN) && shortN >= 1 && shortN <= 10) request.shortLesson = shortN;
    else rejected.shortLesson = `ожидалось 1..10 или off, пришло ${shortLessonRaw}`;
  }
  const spireTierRaw = one(params.spireTier);
  if (spireTierRaw !== undefined) {
    const tierN = Number(spireTierRaw);
    if (spireTierRaw === 'off') request.spireTier = 'off';
    else if (Number.isInteger(tierN) && tierN >= 0 && tierN <= 11) request.spireTier = tierN;
    else rejected.spireTier = `ожидалось 0..11 или off, пришло ${spireTierRaw}`;
  }
  request.spireWeek = pick('spireWeek', ['up', 'stay', 'down', 'top', 'marble', 'obsidian', 'off'] as const);
  request.spireScroll = pick('spireScroll', ['top', 'off'] as const);
  request.spireRankBy = pick('spireRankBy', ['coins', 'steps', 'off'] as const);
  const coinRankRaw = one(params.coinRank);
  if (coinRankRaw !== undefined) {
    const rankN = Number(coinRankRaw);
    if (coinRankRaw === 'off') request.coinRank = 'off';
    else if (Number.isInteger(rankN) && rankN >= 0 && rankN <= 19) request.coinRank = rankN;
    else rejected.coinRank = `ожидалось 0..19 или off, пришло ${coinRankRaw}`;
  }
  // зачем (координатор 18.10): Сверке задержать монету m08 для кадра; только память процесса, в сторе отклоняется
  const m08HoldRaw = one(params.m08hold);
  if (m08HoldRaw !== undefined) {
    const holdN = Number(m08HoldRaw);
    if (m08HoldRaw === 'off') request.m08Hold = 'off';
    else if (Number.isInteger(holdN) && holdN >= 1 && holdN <= 10) request.m08Hold = holdN;
    else rejected.m08Hold = `ожидалось 1..10 или off, пришло ${m08HoldRaw}`;
  }
  // зачем (Авторизация 12.10, coins-001/003/004, system-010/012): показ баланса, удержание повышения, экран ошибки, окно объявления — только память
  const coinsRaw = one(params.coins);
  if (coinsRaw !== undefined) {
    const coinsN = Number(coinsRaw);
    if (coinsRaw === 'off') request.coins = 'off';
    else if (Number.isInteger(coinsN) && coinsN >= 0 && coinsN <= 10_000_000) request.coins = coinsN;
    else rejected.coins = `ожидалось 0..10000000 или off, пришло ${coinsRaw}`;
  }
  request.coinUpgrade = pick('coinupgrade', ['hold', 'off'] as const);
  request.errorScreen = pick('errorscreen', ['on', 'off'] as const);
  request.appMessage = pick('appmessage', ['announcement', 'off'] as const);
  request.notifNudge = pick('notifnudge', ['show'] as const);
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
  // не через one(): тот приводит к нижнему регистру, а текст попадает в кадр как есть
  const speakTranscriptRaw = Array.isArray(params.speak_transcript) ? params.speak_transcript[0] : params.speak_transcript;
  if (speakTranscriptRaw !== undefined) {
    const text = String(speakTranscriptRaw).trim();
    if (text.toLowerCase() === 'off') request.speakTranscript = 'off';
    else if (text.length >= 1 && text.length <= 200) request.speakTranscript = text;
    else rejected.speak_transcript = `ожидалось 1..200 знаков или off, пришло ${text.length}`;
  }
  request.trainGate = pick('train_gate', [...DEV_TRAIN_GATES, 'off'] as const);
  request.blitzAnswer = pick('blitz_answer', [...DEV_BLITZ_ANSWERS, 'off'] as const);
  request.answer = pick('answer', [...DEV_BLITZ_ANSWERS, 'off'] as const);
  request.dailypoll = pick('dailypoll', ['demo', 'voted', 'off'] as const);
  request.packcards = pick('packcards', ['on', 'meta', 'off'] as const);
  request.voices = pick('voices', [...DEV_CARDS_VOICES, 'off'] as const);
  request.packdraft = pick('packdraft', [...DEV_PACK_DRAFTS, 'off'] as const);
  request.cardsdraft = pick('cardsdraft', ['filled', 'off'] as const);
  request.comments = pick('comments', [...DEV_COMMUNITY_COMMENTS, 'off'] as const);
  request.community = pick('community', ['reset', 'added', 'off'] as const);
  request.mistakes = pick('mistakes', ['demo', 'off'] as const);
  // зачем (Сверка 15.10, evidence/more_n2_1015): mistakesFinale=1&wrong=N — финал тренировки с «Ещё N» за меткой Plus
  const mistakesFinale = pick('mistakesFinale', ['1', 'off'] as const);
  if (mistakesFinale === 'off') request.mistakesFinale = 'off';
  else if (mistakesFinale === '1') {
    const wrongRaw = one(params.wrong);
    const wrong = wrongRaw === undefined ? 2 : Number(wrongRaw);
    if (Number.isInteger(wrong) && wrong >= 1 && wrong <= 20) request.mistakesFinale = wrong;
    else rejected.wrong = `ожидалось 1..20, пришло ${String(wrongRaw)}`;
  }
  request.friends = pick('friends', ['demo', 'off'] as const);
  request.moderation = pick('moderation', ['approved', 'rejected', 'revision', 'removed'] as const);
  request.paywall = pick('paywall', ['loading', 'live', 'reference', 'failed', 'off'] as const);
  request.referral = pick('referral', ['off', 'on'] as const);
  request.auth = pick('auth', ['none', 'ok'] as const);
  request.switch = pick('switch', [...DEV_SWITCH_MODES, 'ok'] as const);
  request.logout = pick('logout', [...DEV_LOGOUT_MODES, 'ok'] as const);
  request.namecheck = pick('namecheck', [...DEV_NAME_CHECKS, 'none'] as const);
  request.delete = pick('delete', ['fail', 'throw', 'ok'] as const);
  request.restore = pick('restore', ['retired', ...DEV_RESTORE_MODES, 'ok'] as const);
  request.signin = pick('signin', [...DEV_SIGNIN_MODES, 'off'] as const);
  request.plustransfer = pick('plustransfer', ['on', 'off'] as const);
  request.confetti = pick('confetti', ['hold', 'off'] as const);
  // зачем: регистр имени важен — берём сырую строку (one() приводит к нижнему), обрезаем до 24 как настоящее первое слово имени.
  const greetRaw = Array.isArray(params.greet) ? params.greet[0] : params.greet;
  if (typeof greetRaw === 'string') request.greet = greetRaw.trim().slice(0, 24);
  request.plan = pick('plan', ['yearly', 'monthly', 'lifetime', 'off'] as const);
  const rawPlanUntil = one(params.planUntil);
  if (rawPlanUntil !== undefined) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawPlanUntil);
    if (m) request.planUntilMs = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
    else rejected.planUntil = `ожидалось YYYY-MM-DD, пришло ${rawPlanUntil}`;
  }
  request.studyfail = pick('studyfail', ['on', 'off'] as const);
  request.support = pick('support', ['fail', 'ok', 'sent'] as const);
  // зачем (Авторизация 12.10, съёмка R1): подмены только в памяти — manage/started/upsell/ai_explain.
  request.manage = pick('manage', ['loading', 'off'] as const);
  // зачем (Авторизация 13.10, profile-024/paywalls-022): «Восстановить — пусто» без магазина
  request.restorePurchase = pick('restorepurchase', ['empty', 'off'] as const);
  request.started = list('started', ['en', 'es', 'de', 'fr', 'it'] as const);
  request.upsell = pick('upsell', [...DEV_LESSON_UPSELLS, 'off'] as const);
  request.aiExplain = pick('ai_explain', ['limit', 'off', 'demo'] as const);
  // зачем (координатор 12.10, разбор Авторизации d5888041c): состояния списка уроков и «Почему так» без настоящего прогресса и лимита
  const lessonsDoneRaw = one(params.lessonsDone);
  if (lessonsDoneRaw !== undefined) {
    const lessonsDoneN = Number(lessonsDoneRaw);
    if (lessonsDoneRaw === 'off') request.lessonsDone = 'off';
    else if (Number.isInteger(lessonsDoneN) && lessonsDoneN >= 0 && lessonsDoneN <= 32) request.lessonsDone = lessonsDoneN;
    else rejected.lessonsDone = `ожидалось 0..32 или off, пришло ${lessonsDoneRaw}`;
  }
  request.examA1 = pick('examA1', ['almost', 'passed', 'off'] as const);
  request.lessonGates = pick('lessonGates', ['real', 'off'] as const);
  request.introAccess = pick('introAccess', ['active', 'off'] as const);
  const legacyCapRaw = one(params.legacyCap);
  if (legacyCapRaw !== undefined) {
    const legacyCapN = Number(legacyCapRaw);
    if (legacyCapRaw === 'off') request.legacyCap = 'off';
    else if (Number.isInteger(legacyCapN) && legacyCapN >= 1 && legacyCapN <= 32) request.legacyCap = legacyCapN;
    else rejected.legacyCap = `ожидалось 1..32 или off, пришло ${legacyCapRaw}`;
  }
  request.dialogWhy = pick('dev_dialog_why', ['spent', 'off'] as const);
  request.dialogCoins = pick('dev_dialog_coins', ['award', 'off'] as const);
  request.energyStop = pick('energy_stop', ['plus_granted', 'off'] as const);
  request.lessonIntro = pick('lessonintro', ['skip', 'off'] as const);
  request.notifPerm = pick('notifperm', ['denied', 'off'] as const);
  request.cache = pick('cache', ['failed', 'ok', 'hold'] as const);
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
  // зачем (координатор 15.10, кадры Сверки d1…d1000): вызвать окно рубежа серии одной ссылкой ?streak=N, без набора настоящей серии
  const streakMilestoneRaw = Array.isArray(params.streak) ? params.streak[0] : params.streak;
  if (streakMilestoneRaw !== undefined) {
    const streakDays = parseDevStreakMilestone(streakMilestoneRaw);
    if (streakDays !== null) request.streakMilestone = streakDays;
    else rejected.streakMilestone = `целое 1…5000, например 100; пришло ${String(streakMilestoneRaw)}`;
  }
  const next = Array.isArray(params.next) ? params.next[0] : params.next;
  if (typeof next === 'string' && next.startsWith('/')) request.next = next;
  else if (next !== undefined) rejected.next = `маршрут должен начинаться с «/», пришло ${String(next)}`;
  // финал «Ошибок» без next — сразу экран тренировки (он и рисует dev-финал)
  if (typeof request.mistakesFinale === 'number' && request.next === undefined) request.next = '/mistake_practice_session';
  return { request, rejected };
}

export function isDevStateAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

// зачем (бэклог №18, paywall-gap-011…013): тост, испущенный через фиксированные 900 мс после шага, гас раньше, чем открывался экран `next`
// (переход ждёт перечитывание энергии ~4 с) — робот снимал пейвол без тоста. Действия «после перехода» копятся здесь и выполняются экраном
// dev_state сразу после router.replace (или с причиной, если перехода нет), чтобы не копиться в памяти процесса.
const afterRouteActions: { label: string; run: () => void }[] = [];
export function queueAfterDevStateRoute(label: string, run: () => void): void {
  afterRouteActions.push({ label, run });
  console.log(`[DEV-STATE] after_route: в очереди ${label} (всего ${afterRouteActions.length})`); // guard-ok: dev-ветка
}
export function runAfterDevStateRouteActions(reason: string): void {
  const actions = afterRouteActions.splice(0, afterRouteActions.length);
  console.log(`[DEV-STATE] after_route: выполняю ${actions.length} причина=${reason}`); // guard-ok: dev-ветка
  for (const action of actions) {
    try {
      action.run();
    } catch (error) {
      console.warn(`[DEV-STATE] after_route: ${action.label} упал`, String(error)); // guard-ok: catch пишет причину
    }
  }
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
  // зачем (владелец 12.10 через координатора: настоящие «Выйти», смена аккаунта, код приглашения, тумблеры роботом — ТОЛЬКО на анонимном
  // госте): упавший шаг не прерывает ссылку, поэтому проверка стоит ДО всех шагов и обрывает её целиком — без флагов и без перехода на next
  // робот остаётся на экране DEV-STATE и дальше не находит элементов. Проверка чистая (без пометки «не выгружать» у гостя).
  if (request.guest === 'required') {
    const { checkDisposableGuestNow } = await import('./dev_state_account_guard');
    const verdict = checkDisposableGuestNow();
    if (verdict.ok === false) {
      console.warn(`[DEV-STATE] refused guest_required uid=${verdict.uidMasked} isAnonymous=${String(verdict.isAnonymous)} reason=${verdict.reason} — ссылка не применена, шаги и переход отменены`); // guard-ok: ранний выход логируется
      return { applied, skipped: { all: `guest_required_refused:${verdict.reason}` }, next: null };
    }
    console.log(`[DEV-STATE] guest_required ok uid=${verdict.uidMasked} isAnonymous=${String(verdict.isAnonymous)}`); // guard-ok: единичный лог на ссылку
    applied.guest = 'required';
  }
  // зачем (координатор 12.10, п.A): настоящий «Выйти» роботом — ТОЛЬКО на №3 «Phraseman Support»; иначе ссылка обрывается целиком, до шагов.
  if (request.account === 'support_only') {
    const { checkSupportAccountNow } = await import('./dev_state_account_guard');
    const support = checkSupportAccountNow();
    if (!support.ok) {
      console.warn(`[DEV-STATE] refused account_support_only reason=${support.reason} email=${support.emailMasked} providers=${support.providers} — ссылка не применена, шаги и переход отменены`); // guard-ok: ранний выход логируется
      return { applied, skipped: { all: `account_support_only_refused:${support.reason}` }, next: null };
    }
    console.log(`[DEV-STATE] account_support_only ok email=${support.emailMasked} providers=${support.providers}`); // guard-ok: единичный лог на ссылку
    applied.account = 'support_only';
  }
  // зачем (Авторизация 12.10, settings-gap-001): подставная привязка — только на одноразовом госте, иначе ссылка обрывается целиком (как guest=required).
  if (request.account === 'linked') {
    const { checkDisposableGuestNow } = await import('./dev_state_account_guard');
    const verdict = checkDisposableGuestNow();
    if (!verdict.ok) {
      console.warn(`[DEV-STATE] refused account_linked uid=${verdict.uidMasked} isAnonymous=${String(verdict.isAnonymous)} reason=${verdict.reason} — ссылка не применена, шаги и переход отменены`); // guard-ok: ранний выход логируется
      return { applied, skipped: { all: `account_linked_refused:${verdict.reason}` }, next: null };
    }
    const { setDevAccountState } = await import('./dev_account_state');
    setDevAccountState({ linkedDemo: true });
    console.log(`[DEV-STATE] account_linked ok uid=${verdict.uidMasked} — привязка для показа, действия аккаунта отказывают`); // guard-ok: единичный лог на ссылку
    applied.account = 'linked';
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
  if (request.energyRestoreInSec !== undefined) await step('energy', `restoring:${request.energyRestoreInSec}s`, () => devSetEnergyRestoringIn(request.energyRestoreInSec!));
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
  if (request.appearance) {
    // зачем (Макеты 15.10): светлая/тёмная Главная ссылкой, только память
    await step('appearance', request.appearance, async () => {
      setDevAppearance(request.appearance === 'clear' ? null : request.appearance === 'light' ? 'light' : 'dark');
      return true;
    });
  }
  if (request.theme !== undefined || request.level !== undefined) {
    // зачем (Сверка chain7 12.10): только память; clear снимает соответствующую половину подмены, вторая остаётся
    await step('theme', `${request.theme ?? '-'}/${String(request.level ?? '-')}`, async () => {
      const before = getDevThemeChoice();
      const themeId = request.theme === undefined ? before?.themeId ?? null : request.theme === 'clear' ? null : request.theme;
      const intensity = request.level === undefined ? before?.intensity ?? null : request.level === 'clear' ? null : request.level;
      setDevThemeChoice({ themeId, intensity });
      return true;
    });
  }
  if (request.moments) {
    // зачем (координатор 15.10, кадры Сверки m04/m08/m10/m18): включить моменты v3 одной ссылкой, без удалённого конфига
    await step('moments', request.moments, async () => {
      const { setMomentsV3DevOverride } = await import('../components/streak/moments/use_moments_v3_flag');
      await setMomentsV3DevOverride(request.moments === 'inherit' ? null : request.moments === 'v3');
    });
  }
  if (request.soundv2) {
    await step('soundv2', request.soundv2, async () => {
      await setSoundV2DevOverride(request.soundv2 === 'on');
    });
  }
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
        // зачем (EN_EXTRA2 13.10, en-home-001/paywalls-023): онбординг, открытый предыдущей ссылкой (onbstep), живёт в памяти
        // _layout — без этого события он оставался поверх next= до холодного старта.
        emitAppEvent('dev_onboarding_done');
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
  if (request.studyTarget !== undefined) {
    // зачем (координатор 12.10, cards-v2-029): до карточных фикстур — они и экран читают язык изучения из этого ключа
    await step('studyTarget', request.studyTarget, async () => {
      const { applyDevStudyTarget } = await import('./dev_state_study_target');
      await applyDevStudyTarget(request.studyTarget!);
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
  // зачем (cards-gap-019): сохранённые карточки без своих наборов — сперва очистка как у cards=empty (убирает наборы прошлых кадров).
  // зачем (Авторизация 12.10, cards-026): 3 сохранённые карточки без своих наборов — сперва очистка (убирает наборы прошлых кадров).
  if (request.cards === 'demo_few') {
    await step('cards', 'demo_few', async () => {
      const { applyCardsDemo, applyCardsEmpty } = await import('./dev_state_cards_demo');
      const empty = await applyCardsEmpty();
      const demo = await applyCardsDemo({ few: true });
      for (const [key, reason] of Object.entries({ ...empty.skipped, ...demo.skipped })) skipped[`cards.${key}`] = reason;
      return Object.keys(empty.skipped).length === 0 && Object.keys(demo.skipped).length === 0;
    });
  }
  if (request.cards === 'demo_nopacks') {
    await step('cards', 'demo_nopacks', async () => {
      const { applyCardsDemo, applyCardsEmpty } = await import('./dev_state_cards_demo');
      const empty = await applyCardsEmpty();
      const demo = await applyCardsDemo({ noPacks: true });
      for (const [key, reason] of Object.entries({ ...empty.skipped, ...demo.skipped })) skipped[`cards.${key}`] = reason;
      return Object.keys(empty.skipped).length === 0 && Object.keys(demo.skipped).length === 0;
    });
  }
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
  if (request.dialogEnd !== undefined) {
    await step('dialogEnd', request.dialogEnd, async () => setDevDialogState({ end: request.dialogEnd === 'on' }));
  }
  if (request.dialogBetter !== undefined) {
    await step('dialogBetter', request.dialogBetter, async () => setDevDialogState({ better: request.dialogBetter === 'on' }));
  }
  if (request.dialogCompletion !== undefined) {
    await step('dialogCompletion', request.dialogCompletion, async () => setDevDialogState({ completion: request.dialogCompletion === 'off' ? null : request.dialogCompletion! }));
  }
  if (request.dialogMemory !== undefined) {
    await step('dialogMemory', request.dialogMemory, async () => setDevDialogState({ memory: request.dialogMemory === 'off' ? null : request.dialogMemory! }));
  }
  if (request.dialogVoice !== undefined) {
    // зачем (владелец 12.10, п.81, dialogs-028): бейдж PLUS на микрофоне без трёх настоящих записей; только память
    await step('dialogVoice', request.dialogVoice, async () => setDevDialogState({ voiceSpent: request.dialogVoice === 'spent' }));
  }
  if (request.dialogFeedback !== undefined) {
    // зачем (координатор 14.10, dialogs-044): экран «Отзыв отправлен» без настоящей отправки отзыва; только память
    await step('dialogFeedback', request.dialogFeedback, async () => setDevDialogState({ feedbackSent: request.dialogFeedback === 'sent' }));
  }
  if (request.energyFail !== undefined) {
    await step('energyFail', request.energyFail, async () => setDevDialogState({ energyFail: request.energyFail === 'on' }));
  }
  if (request.overlays !== undefined) {
    // зачем (координатор 12.10): для кадров, где окна не нужны, гасим все очередные окна корня (память, без записи и без отметок «прочитано»)
    await step('overlays', request.overlays, async () => setDevOverlaysOff(request.overlays === 'off'));
  }
  if (request.animations !== undefined) {
    await step('animations', request.animations, async () => setDevAnimationsOff(request.animations === 'off'));
  }
  // зачем (координатор 12.10: «записи в облако с робота — НЕТ»): флаг в памяти (app/dev_robot_no_cloud.ts); тумблеры не пишут ни на устройство, ни в облако.
  if (request.robotNoCloud !== undefined) {
    await step('robot_no_cloud', request.robotNoCloud, async () => setDevRobotNoCloud(request.robotNoCloud === '1'));
  }
  if (request.uiLang !== undefined) {
    // зачем (координатор 12.10, п.76): проход разделов в английском до включения флага; только память
    await step('uiLang', request.uiLang, async () => setDevUiLang(request.uiLang!, 'link'));
  }
  if (request.authFetch !== undefined) {
    // зачем (координатор 15.10): замер входа fetch против нативного пути без прод-флага; только память
    await step('authFetch', request.authFetch, async () => {
      const { setDevAuthCallablesFetch } = await import('./auth_callable_fetch');
      return setDevAuthCallablesFetch(request.authFetch!);
    });
  }
  if (request.lv2progress !== undefined) {
    // зачем (Макеты 15.10, learning-v2-012/011/071/074, словарь): прогресс курса в памяти, диск не меняется; перезапуск снимает
    await step('lv2progress', String(request.lv2progress), async () => {
      const { setLearningV2DevProgressOverrideV1 } = await import('../modules/learning-v2/progress/dev_progress_override_v1');
      return setLearningV2DevProgressOverrideV1(request.lv2progress === 'off' ? null : request.lv2progress as number);
    });
  }
  if (request.lv2voice !== undefined) {
    await step('lv2voice', String(request.lv2voice), async () => {
      const { setDevVoiceRemaining } = await import('./voice_daily_allowance');
      return setDevVoiceRemaining(request.lv2voice === 'off' ? null : request.lv2voice as number);
    });
  }
  if (request.notif !== undefined) {
    const type = request.notif === 'premium_expiry_vip' ? 'premium_expiry_reminder' : request.notif;
    const data: Record<string, unknown> = { type, ...(request.notif === 'premium_expiry_vip' ? { kind: 'vip' } : {}), ...(type === 'youtube_premiere' ? { videoId: 'dev', channelId: 'dev' } : {}) };
    await step('notif', request.notif, async () => {
      const { simulateNotificationTapForDev } = await import('./notification_tap_handler');
      // зачем (Сверка Б16 15.10): таймер 1200 мс от шага срабатывал ДО router.replace(next) (переход ждёт перечитывание энергии),
      // и replace закрывал уже открытый пейвол/страницу — на снимке оставалась Главная. Теперь тап имитируется после перехода.
      queueAfterDevStateRoute(`notif=${request.notif}`, () => {
        setTimeout(() => {
          const ok = simulateNotificationTapForDev(data);
          console.warn('[PUSH-TAP-DEV] after_route simulate', JSON.stringify({ notif: request.notif, ok })); // guard-ok: dev-трассировка
        }, 600);
      });
      return true;
    });
  }
  if (request.stories !== undefined || request.storyseed !== undefined) {
    const flag = request.stories;
    const seed = request.storyseed;
    await step('stories', `flag=${flag ?? '-'} seed=${seed ?? '-'}`, async () => {
      const store = await import('../modules/story_events/story_events_store');
      const flagOk = flag === undefined || store.setDevStoriesFlag(flag);
      const seedOk = seed === undefined || store.setDevStoriesSeed(seed);
      return flagOk && seedOk;
    });
  }
  if (request.legacybonus !== undefined) {
    await step('legacybonus', request.legacybonus, async () => {
      const { setDevLegacyBonusDemo } = await import('./legacy_bonus_client');
      return setDevLegacyBonusDemo(request.legacybonus!);
    });
  }
  if (request.lv2save !== undefined) {
    // зачем (Макеты 15.10, learning-v2-062): «Не сохранилось» у нового слова курса — только память
    await step('lv2save', request.lv2save, async () => {
      const { setLearningV2DevWordSaveFailV1 } = await import('../modules/learning-v2/progress/dev_progress_override_v1');
      return setLearningV2DevWordSaveFailV1(request.lv2save === 'fail');
    });
  }
  if (request.todaytask !== undefined) {
    // зачем (координатор 13.10, «Шпиль → Пик» 95d30d485): «Пройти ступени Пика» в «Сегодня» выпадает только при живом конфиге Пика — подмена показа, только память
    await step('todaytask', request.todaytask, async () => {
      const { setDevTodayTaskSpire } = await import('./dev_today_tasks');
      return setDevTodayTaskSpire(request.todaytask === 'spire');
    });
  }
  if (request.winbackaway !== undefined) {
    // зачем (координатор 14.10, 🔴 зависание после пейвола): пройти НАСТОЯЩИЙ путь winback (гейт → push из _layout) без недели ожидания
    await step('winbackaway', request.winbackaway, async () => {
      const { setDevWinbackAwayDays } = await import('./winback_offer');
      return setDevWinbackAwayDays(request.winbackaway === 'off' ? null : Number(request.winbackaway));
    });
  }
  if (request.welcomeback !== undefined) {
    // зачем (координатор 15.10, полная проверка: dev-ссылка на каждое окно моментов): подмена окна «С возвращением» была
    // (setDevWelcomeBackAwayDays), но к ссылке не подключена — Сверка не могла снять окно без недели ожидания.
    await step('welcomeback', request.welcomeback, async () => {
      const { setDevWelcomeBackAwayDays } = await import('../modules/welcome_back/welcome_back_signal');
      return setDevWelcomeBackAwayDays(request.welcomeback === 'off' ? null : Number(request.welcomeback));
    });
  }
  if (request.edu !== undefined) {
    // зачем (координатор 14.10, settings-gap-034): кадр «Обучения» расходился с образцом данными эмулятора, а не вёрсткой
    await step('edu', request.edu, async () => {
      const { setDevEduSettingsParity } = await import('./dev_edu_settings');
      return setDevEduSettingsParity(request.edu === 'parity');
    });
  }
  if (request.offerProgress !== undefined) {
    await step('offerProgress', request.offerProgress, async () => setDevSaveOfferProgress(request.offerProgress === 'on'));
  }
  if (request.saveOffer !== undefined) {
    // зачем (координатор 13.10, paywalls-024 / profile-022): шаг удержания без тапов — иначе кадр недостижим.
    await step('saveOffer', request.saveOffer, async () => setDevSaveOfferOpen(request.saveOffer === 'off' ? null : request.saveOffer ?? null));
  }
  if (request.aiConsent !== undefined) {
    // зачем (координатор 12.10): у гостя нет согласия на ИИ — «Начать» открывает шторку согласия вместо сессии; подменяем ТОЛЬКО ответ гейта (память), recordAiDialogConsent не вызывается
    await step('aiConsent', request.aiConsent, async () => {
      const { setDevAiConsentOverride } = await import('./dev_ai_consent');
      return setDevAiConsentOverride(request.aiConsent === 'off' ? null : request.aiConsent!);
    });
  }
  if (request.inbox !== undefined) {
    await step('inbox', request.inbox, async () => {
      const { setDevInboxEmpty } = await import('./dev_robot_display');
      return setDevInboxEmpty(request.inbox === 'empty');
    });
  }
  if (request.reminderTime !== undefined) {
    await step('reminderTime', request.reminderTime, async () => {
      const { parseDevReminderTime, setDevReminderTime } = await import('./dev_robot_display');
      return setDevReminderTime(request.reminderTime === 'off' ? null : parseDevReminderTime(request.reminderTime!));
    });
  }
  if (request.yearActivity !== undefined) {
    // зачем (координатор 13.10): у тестового аккаунта нет статистики за год — Сверке нужна заполненная сетка как в results.html#9
    await step('yearActivity', request.yearActivity, async () => {
      const { setDevYearActivityDemo } = await import('./dev_year_activity');
      return setDevYearActivityDemo(request.yearActivity === 'demo');
    });
  }
  if (request.spireTier !== undefined) {
    await step('spireTier', String(request.spireTier), async () => {
      const { setDevSpireTierOverride } = await import('./dev_spire_tier');
      return setDevSpireTierOverride(request.spireTier === 'off' ? null : (request.spireTier as number));
    });
  }
  if (request.shortLesson !== undefined) {
    await step('shortLesson', String(request.shortLesson), async () => {
      const { setDevShortLessonCells } = await import('./dev_short_lesson');
      return setDevShortLessonCells(request.shortLesson === 'off' ? null : (request.shortLesson as number));
    });
  }
  if (request.spireWeek !== undefined) {
    await step('spireWeek', request.spireWeek, async () => {
      const { setDevSpireWeekResultOverride } = await import('./dev_spire_tier');
      return setDevSpireWeekResultOverride(request.spireWeek === 'off' ? null : request.spireWeek!);
    });
  }
  if (request.spireScroll !== undefined) {
    await step('spireScroll', request.spireScroll, async () => {
      const { setDevSpireScrollOverride } = await import('./dev_spire_tier');
      return setDevSpireScrollOverride(request.spireScroll === 'off' ? null : 'top');
    });
  }
  if (request.spireRankBy !== undefined) {
    await step('spireRankBy', request.spireRankBy, async () => {
      const { setDevSpireRankByOverride } = await import('./dev_spire_tier');
      return setDevSpireRankByOverride(request.spireRankBy === 'off' ? null : request.spireRankBy!);
    });
  }
  if (request.coinRank !== undefined) {
    // зачем (координатор 12.10): у гостя ранг 0 — все диалоги «Откроется на ранге 1…6»; подмена ТОЛЬКО значения хука, без записи монет и ранга (ранг синхронизируемый)
    await step('coinRank', String(request.coinRank), async () => {
      const { setDevCoinRankOverride } = await import('./dev_coin_rank');
      return setDevCoinRankOverride(request.coinRank === 'off' ? null : (request.coinRank as number));
    });
  }
  if (request.m08Hold !== undefined) {
    await step('m08hold', String(request.m08Hold), async () => {
      const { setDevComboCoinHold } = await import('../components/feedback/combo_moment_gate');
      return setDevComboCoinHold(request.m08Hold === 'off' ? null : (request.m08Hold as number));
    });
  }
  if (request.coins !== undefined) {
    // зачем (Авторизация 12.10, coins-001/003): баланс только для показа; кошелёк в хранилище и облаке не меняется, повышение при подмене отказывает
    await step('coins', String(request.coins), async () => {
      const { setDevCoinBalanceOverride } = await import('./dev_coin_rank');
      return setDevCoinBalanceOverride(request.coins === 'off' ? null : (request.coins as number));
    });
  }
  if (request.coinUpgrade !== undefined) {
    await step('coinupgrade', request.coinUpgrade, async () => {
      const { setDevCoinUpgradeHold } = await import('./dev_coin_rank');
      return setDevCoinUpgradeHold(request.coinUpgrade === 'hold');
    });
  }
  if (request.errorScreen !== undefined) {
    await step('errorscreen', request.errorScreen, async () => {
      const { setDevErrorScreen } = await import('./dev_social_state');
      return setDevErrorScreen(request.errorScreen === 'on');
    });
  }
  if (request.appMessage !== undefined) {
    await step('appmessage', request.appMessage, async () => {
      const { setDevAppMessage } = await import('./dev_social_state');
      return setDevAppMessage(request.appMessage === 'off' ? null : request.appMessage!);
    });
  }
  if (request.notifNudge === 'show') {
    await step('notifnudge', 'show', async () => {
      // зачем (координатор 13.10, проверка умного напоминания Сверкой): окно показывается раз в день — стираем отметку и шлём
      // то же событие, что и реальный путь (пропущенные дни). Дальше окно и расписание работают кодом релиза. Окно идёт
      // через арбитр окон — ссылке нужен overlays=on. Разрешение ОС уже дано или напоминания включены → окно не покажется (как в релизе).
      await AsyncStorage.removeItem('notif_permission_nudge_last_day');
      setTimeout(() => {
        console.log('[DEV-STATE] notifnudge: событие notif_permission_nudge missedDays=3'); // guard-ok: трассировка подмены
        emitAppEvent('notif_permission_nudge', { missedDays: 3 });
      }, 2500);
      return true;
    });
  }
  // зачем (координатор 18.10, блокер Сверки): окна «один раз на аккаунт» снимаются повторно без pm clear. Шаг стоит
  // после гейта isDevStateAvailable в начале applyDevState — в стор-сборке ссылка сюда не доходит.
  if (request.seen) {
    await step('seen', request.seen, async () => {
      const { captureAccountGeneration } = await import('./account_generation');
      const stableId = captureAccountGeneration().stableId ?? null;
      const storedKeys = await AsyncStorage.getAllKeys();
      const keys = devSeenResetKeys(request.seen!, stableId, storedKeys);
      const present = keys.filter((key) => storedKeys.includes(key));
      if (keys.length > 0) await AsyncStorage.multiRemove(keys);
      const teamNote = request.seen === 'team' || request.seen === 'reset' ? ' team=server_ack_not_local' : '';
      console.log(`[DEV-STATE] seen reset ${JSON.stringify({ window: request.seen, keys, removed: present.length })}${teamNote}`); // guard-ok: итог фикстуры
      return true;
    });
  }
  if (request.intros) {
    await step('intros', request.intros, async () => {
      const registry = await import('./feature_intro_registry');
      if (request.intros === 'seen') {
        const count = await registry.markAllFeatureIntrosSeen();
        console.log(`[DEV-STATE] intros: помечено показанными ${count} окон знакомства`); // guard-ok: итог фикстуры
        // зачем (Авторизация 13.10, community-001): тур Шпиля хранит свой флаг вне реестра окон знакомства — без этого кадр «Сообщества» закрывал тур
        const { spireMarkTourSeen } = await import('./spire/spire_local_store');
        await spireMarkTourSeen();
        console.log('[DEV-STATE] intros: тур Шпиля помечен показанным'); // guard-ok: итог фикстуры
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
      // зачем (№18): тост — после перехода на экран `next` (очередь after_route), а не через фиксированные 900 мс от шага.
      queueAfterDevStateRoute(`toast=${kind}`, () => {
        const payload = paywallRestoreToast(kind);
        // зачем (координатор 12.10, «сперва логи»): что пришло, какой тост выбран и сколько хостов тостов подписано (0 = хост не смонтирован)
        console.log(`[DEV-STATE] toast: ${kind} → type=${payload.type} текст="${payload.messageRu.slice(0, 60)}" хостовПодписано=${DeviceEventEmitter.listenerCount('action_toast')}`); // guard-ok: dev-ветка
        emitAppEvent('action_toast', payload);
      });
    });
  }
  // зачем (R1 «нет пути», Карточки): флаги в памяти процесса (app/dev_cards_state.ts); `off` снимает.
  if (request.cardsLangs !== undefined) {
    // зачем (координатор 12.10, п.83): у гостя наборы только на одном языке — подменяем СПИСКИ других языков в памяти; хранилище и Firestore не затрагиваются
    await step('cardsLangs', request.cardsLangs, async () => {
      const { setDevFcLangs } = await import('./dev_fc_lang_state');
      return setDevFcLangs(request.cardsLangs === 'on');
    });
  }
  if (request.videoPacks !== undefined) {
    // зачем (координатор 12.10, п.85(2)): «Из видео» при пустом каталоге; seed кладёт ответ в память модуля и локальный кэш устройства, сеть и Firestore не вызываются
    await step('videoPacks', request.videoPacks, async () => {
      const { seedVideoPhraseSetPacksForDev } = await import('./video_phrase_set_packs');
      const { demoVideoPacks } = await import('./dev_state_cards_demo');
      const { setDevYoutubeDemo } = await import('./dev_youtube_demo');
      // зачем (video-001/004/008/009/011): catalog* включает каталог YouTube из памяти; empty/demo его СНИМАЮТ — кадр не наследует прошлую подмену
      const youtubeOn = request.videoPacks === 'catalog' || request.videoPacks === 'catalog_upcoming';
      const youtubeOk = setDevYoutubeDemo(youtubeOn ? request.videoPacks as 'catalog' | 'catalog_upcoming' : null);
      const seeded = await seedVideoPhraseSetPacksForDev(request.videoPacks === 'empty' ? [] : demoVideoPacks());
      return youtubeOk && seeded;
    });
  }
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
  if (request.speakTranscript !== undefined) {
    const text = request.speakTranscript;
    await step('speak_transcript', text, async () => setDevCardsState(text === 'off'
      ? { speechText: null }
      : { speechText: text, ...(request.speech === undefined ? { speech: 'correct' as const } : {}) }));
  }
  if (request.blitzAnswer !== undefined) {
    await step('blitz_answer', request.blitzAnswer, async () => setDevCardsState({ blitzAnswer: request.blitzAnswer === 'off' ? null : request.blitzAnswer! }));
  }
  if (request.publish !== undefined) {
    await step('publish', request.publish, async () => setDevPublishOk(request.publish === 'ok'));
  }
  if (request.answer !== undefined) {
    await step('answer', request.answer, async () => setDevCardsState({ answer: request.answer === 'off' ? null : request.answer! }));
  }
  if (request.cardsdraft !== undefined) {
    await step('cardsdraft', request.cardsdraft, async () => {
      const { setDevCardDraft } = await import('./dev_cards_state');
      return setDevCardDraft(request.cardsdraft === 'off' ? null : 'filled');
    });
  }
  if (request.packdraft !== undefined) {
    await step('packdraft', request.packdraft, async () => setDevPackDraft(request.packdraft === 'off' ? null : request.packdraft!));
  }
  if (request.voices !== undefined) {
    await step('voices', request.voices, async () => setDevCardsState({ voices: request.voices === 'off' ? null : request.voices! }));
  }
  if (request.mistakes !== undefined) {
    await step('mistakes', request.mistakes, async () => setDevMistakesDemo(request.mistakes === 'demo'));
  }
  if (request.mistakesFinale !== undefined) {
    await step('mistakesFinale', String(request.mistakesFinale), async () =>
      setDevMistakesFinale(request.mistakesFinale === 'off' ? null : request.mistakesFinale as number));
  }
  if (request.friends !== undefined) {
    await step('friends', request.friends, async () => setDevFriendsDemo(request.friends === 'demo'));
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
  if (request.delete !== undefined) await step('delete', request.delete, async () => setDevAccountState({ deleteFail: request.delete === 'fail', deleteThrow: request.delete === 'throw' }));
  if (request.restore !== undefined) await step('restore', request.restore, async () => setDevAccountState({
    restoreRetired: request.restore === 'retired',
    restoreMode: request.restore === 'offer' || request.restore === 'restored' ? request.restore : null,
  }));
  // зачем (координатор 12.10, onboarding-003/004/008): результат входа без сети и авиарежима; off — снять.
  if (request.signin !== undefined) await step('signin', request.signin, async () => setDevAccountState({ signIn: request.signin === 'off' ? null : request.signin! }));
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
  if (request.streakMilestone !== undefined) {
    await step('streakMilestone', String(request.streakMilestone), async () => {
      const { runDevStreakMilestone } = await import('./dev_streak_milestone');
      return runDevStreakMilestone(request.streakMilestone ?? 0);
    });
  }
  if (request.greet !== undefined) await step('greet', request.greet || 'off', async () => setDevAccountState({ greetName: request.greet || null }));
  if (request.plustransfer !== undefined) await step('plustransfer', request.plustransfer, async () => setDevAccountState({ plusTransfer: request.plustransfer === 'on' }));
  if (request.confetti !== undefined) await step('confetti', request.confetti, async () => setDevAccountState({ confettiHold: request.confetti === 'hold' }));
  if (request.plan !== undefined) {
    await step('plan', request.plan, async () => {
      const { setDevPlanOverride } = await import('./dev_vip_override');
      return setDevPlanOverride(request.plan === 'off' ? null : request.plan!, Date.now(), request.planUntilMs ?? null);
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
      return setDevSocialState({ settingsFails: [...kept, ...fails], ...(request.support !== undefined ? { supportSent: request.support === 'sent' } : {}) });
    });
  }
  if (request.cache !== undefined) {
    // зачем (Авторизация 13.10, settings-gap-007): hold — «чистим…» без настоящей чистки; ok/failed снимают удержание
    await step('cache_hold', request.cache, async () => {
      const { setDevCacheClearHold } = await import('./dev_social_state');
      return setDevCacheClearHold(request.cache === 'hold');
    });
  }
  if (request.manage !== undefined) {
    await step('manage', request.manage, async () => setDevManageLoadingHold(request.manage === 'loading'));
  }
  if (request.restorePurchase !== undefined) {
    await step('restorepurchase', request.restorePurchase, async () => setDevRestorePurchaseEmpty(request.restorePurchase === 'empty'));
  }
  if (request.started !== undefined) {
    await step('started', request.started === 'off' ? 'off' : request.started.join(','), async () => setDevSocialState({ startedLanguages: request.started === 'off' ? null : request.started! }));
  }
  if (request.upsell !== undefined) {
    await step('upsell', request.upsell, async () => setDevLessonUpsell(request.upsell === 'off' ? null : request.upsell!));
  }
  if (request.lessonsDone !== undefined || request.examA1 !== undefined) {
    // зачем (learn-007…013): прогресс уроков и экзамен A1 подменяются в памяти поверх снимка списка (lessons_tab_state), диск не трогается
    await step('lessonsProgress', `${String(request.lessonsDone ?? '-')}/${request.examA1 ?? '-'}`, async () => {
      const { setDevLessonsProgress } = await import('./dev_paywall_state');
      const off = request.lessonsDone === 'off' && (request.examA1 === undefined || request.examA1 === 'off');
      return setDevLessonsProgress(off ? null : {
        done: typeof request.lessonsDone === 'number' ? request.lessonsDone : 0,
        examA1: request.examA1 === 'almost' || request.examA1 === 'passed' ? request.examA1 : null,
      });
    });
  }
  if (request.introAccess !== undefined) {
    // зачем (settings-gap-005): плашка «Полный доступ на 3 дня» в Настройках — PremiumContext перечитывает пробный доступ по событию
    await step('introAccess', request.introAccess, async () => {
      const { setDevIntroFullAccess } = await import('./dev_paywall_state');
      const ok = setDevIntroFullAccess(request.introAccess === 'active');
      if (ok) emitAppEvent('intro_full_access_changed');
      return ok;
    });
  }
  if (request.lessonGates !== undefined || request.legacyCap !== undefined) {
    // зачем (Макеты f5564eafa, learn-012/013): в dev-сборке весь курс открыт — тап по экзамену вёл на экран зачёта, а не в окно A11/A12
    await step('lessonGates', `${request.lessonGates ?? '-'}/${String(request.legacyCap ?? '-')}`, async () => {
      const { setDevLessonGates } = await import('./dev_paywall_state');
      const real = request.lessonGates === 'real';
      const legacyCap = typeof request.legacyCap === 'number' ? request.legacyCap : null;
      return setDevLessonGates(!real && legacyCap === null ? null : { real, legacyCap });
    });
  }
  if (request.dialogCoins !== undefined) {
    // зачем (координатор 13.10, итог D1): экран итога рисует «+N монет» и пилюлю баланса без начисления и без сети
    await step('dialogCoins', request.dialogCoins, async () => setDevDialogState({ coinsAward: request.dialogCoins === 'award' }));
  }
  if (request.dialogWhy !== undefined) {
    // зачем (dialogs-020): «Почему так» — разборы на сегодня закончились, без трёх настоящих раскрытий
    await step('dialogWhy', request.dialogWhy, async () => setDevDialogState({ whySpent: request.dialogWhy === 'spent' }));
  }
  if (request.aiExplain !== undefined) {
    // зачем (координатор 13.10, mistakes-panel-016): demo — готовое объяснение образца без сервера; limit и demo взаимоисключающие.
    await step('ai_explain', request.aiExplain, async () => setDevAiExplainLimit(request.aiExplain === 'limit') && setDevAiExplainDemo(request.aiExplain === 'demo'));
  }
  if (request.notifPerm !== undefined) {
    await step('notifperm', request.notifPerm, async () => setDevSocialState({ notifPermDenied: request.notifPerm === 'denied' }));
  }
  if (request.dailypoll !== undefined) {
    await step('dailypoll', request.dailypoll, async () => setDevSocialState({ dailyPoll: request.dailypoll === 'off' ? null : request.dailypoll! }));
  }
  if (request.lessonIntro !== undefined) {
    await step('lessonintro', request.lessonIntro, async () => setDevLessonIntroSkip(request.lessonIntro === 'skip'));
  }
  if (request.energyStop !== undefined) {
    await step('energy_stop', request.energyStop, async () => setDevEnergyStopPlusGranted(request.energyStop === 'plus_granted'));
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
  // зачем (координатор + Макеты 12.10, съёмка R1 Карточек): чужой/свой опубликованный набор, ролик, лайк, отклики и жалобы —
  // демо-наборы в памяти, сеть для dev_demo_* / video_devDemo* запрещена (dev_cards_state). Идёт ПОСЛЕ cards=/catalog=, чтобы
  // его каталог (с мета-счётчиками и роликом) не затёрся.
  if (request.packcards !== undefined || request.comments !== undefined || request.community !== undefined) {
    await step('community', [request.packcards, request.comments, request.community].filter(Boolean).join(','), async () => {
      if (request.community === 'off') return setDevCommunityState({ active: false, packs: new Map(), comments: null, reset: true });
      if (request.packcards === 'on' || request.packcards === 'meta') {
        const { demoCommunityPackData } = await import('./dev_state_cards_demo');
        const data = demoCommunityPackData(await getStableId());
        const { seedCommunityCatalogForDev } = await import('./community_packs/communityFirestore');
        if (!seedCommunityCatalogForDev('en', data.catalog)) throw new Error('seed_refused');
        // зачем (cards-044 «Набор ещё не скачан»): meta — мета наборов есть, карточек нет (как набор, не докачанный без сети).
        const packs = request.packcards === 'meta'
          ? new Map([...data.packs].map(([id, pack]) => [id, { meta: pack.meta, cards: [] }] as const))
          : data.packs;
        if (!setDevCommunityState({ active: true, packs })) return false;
      } else if (request.packcards === 'off' && !setDevCommunityState({ active: true, packs: new Map() })) return false;
      if (request.comments !== undefined && !setDevCommunityState({ active: true, comments: request.comments === 'off' ? null : request.comments })) return false;
      if (request.community === 'reset' && !setDevCommunityState({ reset: true })) return false;
      if (request.community === 'added') return setDevCommunityState({ active: true, owned: ['dev_demo_community_2', 'dev_demo_community_1', 'dev_demo_community_3'] });
      return true;
    });
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
