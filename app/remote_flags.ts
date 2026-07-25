// ═══════════════════════════════════════════════════════════════════════════
// remote_flags.ts — Remote Config layer (admin-tunable runtime knobs)
//
// Single source of truth for every value we want to change WITHOUT a release:
// free-tier limits, energy economy, trainer A/B split, and the paywall variant
// split. Resolution order (highest priority first):
//
//   1. Firestore override   (admin/index.html → remote_config/* → onSnapshot)
//   2. Build-time env        (EXPO_PUBLIC_* — useful for QA builds)
//   3. Hardcoded default     (DEFAULT_NUMBERS / DEFAULT_FLAGS below)
//
// The Firestore layer is filled by loadRemoteConfig()/subscribeRemoteConfig()
// (see remote_config_client.ts). Until that runs, defaults/env apply, so the
// app always works offline and on first launch.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ONBOARDING_ENABLED_STEPS_TEXT_KEY,
  parseEnabledOnboardingSteps,
  type OnboardingStepId,
} from './onboarding_flow';
import type { SoftUpsellTrigger } from './soft_upsell_core';

export type RemoteNumberKey =
  | 'free_lesson_limit'
  | 'free_daily_quiz_limit'
  | 'arena_daily_max'
  | 'arena_shard_refill_cost'
  | 'arena_shard_refill_slots'
  | 'max_energy'
  | 'energy_recovery_interval_ms'
  | 'free_trainer_sessions_per_day'
  | 'trainer_ab_a_pct'
  | 'trainer_ab_b_pct'
  | 'trainer_ab_c_pct'
  | 'onboarding_ab_welcome_pct'
  | 'onboarding_ab_builder_pct'
  | 'onboarding_ab_quiz_pct'
  | 'paywall_v2_pct'
  | 'league_xp_promotion_threshold'
  | 'league_sync_min_delta'
  | 'league_sync_min_interval_ms'
  | 'league_sync_force_interval_ms'
  | 'league_startup_registration_interval_ms'
  | 'auth_link_cache_ttl_ms'
  | 'arena_sr_win'
  | 'arena_sr_loss'
  | 'arena_sr_bot_win'
  | 'arena_season_rollback_steps'
  // Экономика (вынесено из хардкодов для крутки баланса без релиза):
  // стоимость заморозки серии в осколках (было FREEZE_COST_SHARDS=10 в home.tsx).
  | 'streak_freeze_cost_shards';

export type RemoteBoolKey =
  | 'weekly_review_ai_v2_enabled'
  | 'soft_upsell_first_lesson_enabled'
  | 'soft_upsell_free_lessons_complete_enabled'
  | 'soft_upsell_weekly_review_enabled'
  | 'soft_upsell_second_ai_dialogue_enabled'
  | 'soft_upsell_streak_enabled'
  | 'soft_upsell_repeated_training_enabled'
  | 'referral_enabled'
  // Мастер-флаг «Рулетка Plus + реферальная программа». Живёт в numbers
  // (remote_config/app.numbers.referral_roulette_enabled) — туда его пишут
  // adminSetReferralRouletteEnabled и скрипты; сервер читает тот же ключ.
  // Дефолт true (kill-switch). Подхватывается из numbers в applyRemoteConfigSnapshot.
  | 'referral_roulette_enabled'
  | 'referral_roulette_emergency_stop'
  | 'speaking_enabled'
  | 'collectibles_enabled'
  | 'league_xp_promotion_enabled'
  | 'league_startup_registration_enabled'
  | 'lifetime_button_enabled'
  | 'explain_enabled'
  | 'ideas_enabled'
  | 'ai_global_disable'
  | 'compass_enabled'
  | 'compass_deep_dive_enabled'
  | 'compass_lesson_invite_enabled'
  | 'compass_economy_enabled'
  | 'compass_retention_enabled'
  | 'compass_topic_map_enabled'
  | 'maintenance_banner'
  | 'maintenance_block'
  // Legacy remote flag kept for compatibility with already-published configs.
  // The active onboarding is now always the clean midnight plan-first flow;
  // this flag must not re-enable any old two-button or skip-app path.
  | 'onboarding_plan_only_enabled'
  // Боты-соперники в Арене (бот-фолбэк при пустой очереди). Дефолт TRUE =
  // kill-switch: боты работают как сейчас, админ может выключить их в «Пульте»
  // живьём — тогда матчатся только реальные игроки друг с другом, а при пустой
  // очереди соперник не подставляется. Включение возвращает ботов обратно.
  | 'arena_bots_enabled'
  // Таймеры «срочности» (анонс повышения цены) на всех пейволах A/B/C. Дефолт
  // TRUE = kill-switch: блок urgency (обратный отсчёт + «Сейчас X / скоро ~2X»
  // и grace-плашка «цена сохранена») показывается как сейчас. Админ ставит false
  // в «Пульте» → весь блок прячется у всех живьём (onSnapshot), без релиза. Гейт
  // стоит в app/paywall_purchase.ts (urgency форсится в неактивное пустое
  // состояние), сам PaywallPriceUrgency тогда возвращает null во всех режимах.
  | 'paywall_timers_enabled'
  // Отзывы на пейволах («что говорят ученики»). Дефолт TRUE. Рубильник в Пульте:
  // выкл → секция отзывов просто пропадает (передаём пустой массив), ничего не
  // ломается; вкл → возвращается. Без обновления приложения.
  | 'paywall_reviews_enabled'
  // Принудительное обновление (force-update). Дефолт FALSE = выключено (страховка
  // от случайной блокировки всех). Когда true И версия приложения < min_app_version
  // — ForceUpdateGate показывает полноэкранный блок «обнови приложение». Версия и
  // ссылки на сторы — в текстовых ключах ниже. Управляется из «Пульта» живьём.
  | 'force_update_enabled'
  | 'manual_update_enabled'
  // Промо-баннер (акция). Дефолт FALSE. true → в приложении показывается
  // управляемый из «Пульта» баннер акции (текст/ссылка/срок в текстовых ключах).
  // Сама скидка на подписку настраивается в сторах отдельно — баннер только зовёт.
  | 'promo_banner_enabled'
  // Раздел «Промокод» в настройках + серверная активация promoCodeRedeem.
  // Дефолт FALSE = sell-switch: промокоды видны и активируются только когда
  // админ включил их в «Пульте».
  | 'promo_codes_enabled'
  // Кнопка «Видео PHRASEMAN» на главной (иконка-плей в шапке) + сам экран видео.
  // Дефолт TRUE = kill-switch: кнопка показывается как сейчас. Админ ставит false
  // в «Пульте» → кнопка прячется у всех живьём (onSnapshot), без релиза. Экран
  // /lingman_videos при этом всё равно существует, просто на него нет входа из
  // шапки. Какой канал показывать — отдельные текстовые ключи youtube_channel_*.
  | 'video_button_enabled'
  // ── Премиум-гейты фич (управляются из «Пульта» → раздел «Премиум/Фри») ──────
  // Семантика: true = фича за ПРЕМИУМ-замком (как сейчас), false = фича БЕСПЛАТНА
  // для всех (замок снимается живьём, без релиза). Дефолт TRUE у каждого, чтобы
  // поведение по умолчанию не менялось — пейволы остаются ровно там, где были.
  // Списки фич держим в синхроне с FEATURE_GATE_KEYS (app/feature_gates.ts) и
  // с разделом «Премиум/Фри» в admin/index.html.
  | 'gate_lessons_premium'
  | 'gate_speaking_premium'
  | 'gate_ai_dialog_premium'
  | 'gate_smart_trainer_premium'
  | 'gate_trainer_modes_premium'
  | 'gate_diagnosis_training_premium'
  | 'gate_personal_plan_premium'
  | 'gate_stats_premium'
  | 'gate_flashcards_premium'
  | 'gate_themes_premium'
  | 'gate_avatar_auras_premium'
  | 'gate_mastery_premium'
  | 'gate_quizzes_premium'
  | 'gate_arena_premium'
  | 'gate_energy_premium'
  // Гейт добавления второго и последующих языков обучения (1 язык — фри).
  | 'gate_extra_languages_premium'
  // «Разговорный клуб»: true = free получает 1 миссию в день, безлимит за Plus;
  // false = аварийное «фри для всех» (premium-капы сервера применяются и к free).
  | 'gate_speaking_club_premium'
  // Раздел «Топ хелперов» (борд топ-репортёров багов) в настройках. Дефолт TRUE =
  // kill-switch: борд показывается, админ может выключить его в «Пульте» живьём
  // (onSnapshot), без релиза — тогда пункт в настройках прячется и сам экран отдаёт
  // заглушку. Данные борда — публичная проекция top_helpers/{uid}.
  | 'top_helpers_enabled'
  // Приветственный подарок «3 дня полного доступа» для НОВЫХ юзеров (72ч intro).
  // Дефолт TRUE = kill-switch: новые получают подарок и приветственный модал как
  // сейчас. Админ ставит false в «Пульте» → НОВЫЕ юзеры больше не получают ни
  // подарок, ни модал (startIntroFullAccessAfterOnboarding раньше выходит). Уже
  // выданный подарок НЕ отбирается — активные докатывают свои 72ч, их модалы не
  // трогаются (гейт стоит только в точке ВЫДАЧИ). Включение возвращает подарок
  // будущим новичкам. Гейт в app/intro_full_access.ts.
  | 'intro_full_access_enabled';

/** Строковые ключи (тексты), управляемые из админки. Сейчас — режим обслуживания. */
export type RemoteTextKey =
  | 'maintenance_ru'
  | 'maintenance_uk'
  | 'maintenance_es'
  // Поурочные исключения поверх порога free_lesson_limit (управляются из «Пульта»).
  // JSON-массивы id уроков (1..32). free_lessons_extra — уроки, открытые БЕСПЛАТНО
  // сверх порога; premium_lessons_extra — уроки, ЗАКРЫТЫЕ под премиум, даже если они
  // ниже порога. Пусто/невалидно = только порог. premium_* имеет приоритет над free_*.
  | 'free_lessons_extra'
  | 'premium_lessons_extra'
  // Weekly Boons: расписание «бонусов дня недели» и их вкл/выкл. JSON-объект
  // { schedule: {weekday: BoonId | BoonId[]}, enabled: {...}, modifiersEnabled: {...} }.
  // Пусто/невалидно = встроенный дефолт (см. boons/boon_config.ts). Парсится
  // защищённо: мусор тихо отбрасывается, приложение не падает.
  | 'weekly_boons_config'
  // Force-update: минимальная допустимая версия приложения (semver "1.2.3"). Когда
  // force_update_enabled=true и текущая версия < этой — показываем блок. Пусто =
  // блок не показывается даже при включённом флаге (защита от пустого значения).
  | 'min_app_version'
  // Ссылки на сторы для кнопки «Обновить» в блоке force-update (по платформе).
  | 'store_url_ios'
  | 'store_url_android'
  | 'manual_update_campaign_id'
  | 'manual_update_mode'
  | 'manual_update_target_build'
  | 'manual_update_platform'
  | 'manual_update_title_ru'
  | 'manual_update_title_uk'
  | 'manual_update_title_es'
  | 'manual_update_body_ru'
  | 'manual_update_body_uk'
  | 'manual_update_body_es'
  | 'manual_update_cta_ru'
  | 'manual_update_cta_uk'
  | 'manual_update_cta_es'
  // Промо-баннер (акция): локализованный текст (ru/uk/es), необяз. ссылка по тапу
  // и срок окончания (ISO-дата "2026-07-01" или ms). Пусто = текст по умолчанию /
  // без ссылки / бессрочно. Баннер виден только при promo_banner_enabled=true.
  | 'promo_banner_text_ru'
  | 'promo_banner_text_uk'
  | 'promo_banner_text_es'
  | 'promo_banner_url'
  | 'promo_banner_until'
  | 'promo_banner_campaign_id'
  // Таргетинг промо-баннера: кому показывать. 'all' (или пусто) = всем,
  // 'free' = только не-премиум, 'premium' = только премиум. Опц. фильтр платформы:
  // 'ios'|'android' (пусто = обе). Применяется в shouldShowPromoBanner вместе с флагом.
  | 'promo_banner_audience'
  | 'promo_banner_platform'
  | 'maintenance_campaign_id'
  // ── YouTube-канал для экрана «Видео» и кнопки на главной ────────────────────
  // Управляется из «Пульта» → можно подключить ЛЮБОЙ канал без релиза. Пусто =
  // встроенный дефлот PHRASEMAN (LINGMAN_CHANNEL_* в app/lingman_youtube.ts).
  // youtube_channel_id — обязателен для смены канала: ровно YouTube channelId
  // вида "UCxxxx…" (фид строится по channel_id). Если пусто/мусор → весь канал
  // остаётся дефолтным PHRASEMAN (handle/name/url ниже тоже игнорируются).
  | 'youtube_channel_id'
  // @handle канала (с @ или без) — для подписи и ссылки на канал. Пусто →
  // выводится из id как заглушка. Чисто косметический.
  | 'youtube_channel_handle'
  // Отображаемое имя канала в шапке экрана видео и на кнопке. Пусто → 'PHRASEMAN'.
  | 'youtube_channel_name'
  // Пришпиленные («ручные») видео — JSON-массив объектов { id, title?, url? }.
  // Появляются В НАЧАЛЕ ленты как «новые», поверх RSS-фида канала, и могут быть
  // с ЛЮБОГО канала. Управляются из «Пульта» (список с превью + удалить). Пусто/
  // мусор = нет пиннов. id обязателен (11-симв. videoId); title/url необязательны
  // (обложка и watch-url строятся из id, если не заданы).
  | 'youtube_pinned_videos'
  // Прямая ссылка на канал (кнопка «открыть в YouTube» в шапке). Пусто →
  // строится из handle: https://www.youtube.com/@handle/videos. Должна быть
  // https и на youtube.com, иначе приложение её отбросит и построит из handle.
  | 'youtube_channel_url'
  | 'onboarding_enabled_steps_v1';

/**
 * Default free trainer sessions per day. Exported for call sites that need the
 * baseline without resolving Remote Config (e.g. trainer_session.ts fallback).
 * Kept in sync with DEFAULT_NUMBERS.free_trainer_sessions_per_day below.
 */
export const FREE_TRAINER_SESSIONS_PER_DAY_DEFAULT = 1;

const DEFAULT_NUMBERS: Record<RemoteNumberKey, number> = {
  free_lesson_limit: 3,
  free_daily_quiz_limit: 1,
  arena_daily_max: 1,
  arena_shard_refill_cost: 5,
  arena_shard_refill_slots: 5,
  max_energy: 5,
  energy_recovery_interval_ms: 10 * 60 * 1000,
  free_trainer_sessions_per_day: 1,
  trainer_ab_a_pct: 0,
  trainer_ab_b_pct: 0,
  trainer_ab_c_pct: 0,
  onboarding_ab_welcome_pct: 0,
  onboarding_ab_builder_pct: 0,
  onboarding_ab_quiz_pct: 0,
  paywall_v2_pct: 100,
  league_xp_promotion_threshold: 1000,
  league_sync_min_delta: 75,
  league_sync_min_interval_ms: 15 * 60 * 1000,
  league_sync_force_interval_ms: 6 * 60 * 60 * 1000,
  league_startup_registration_interval_ms: 24 * 60 * 60 * 1000,
  auth_link_cache_ttl_ms: 7 * 24 * 60 * 60 * 1000,
  arena_sr_win: 25,
  arena_sr_loss: 20,
  arena_sr_bot_win: 12,
  arena_season_rollback_steps: 3,
  streak_freeze_cost_shards: 10,
};

const DEFAULT_FLAGS: Record<RemoteBoolKey, boolean> = {
  // Global client kill-switch only. Server owns percentage rollout by canonical stableUid.
  weekly_review_ai_v2_enabled: true,
  // Verified lesson-completion soft upsells ship enabled; Remote Config remains the kill switch.
  soft_upsell_first_lesson_enabled: true,
  soft_upsell_free_lessons_complete_enabled: true,
  soft_upsell_weekly_review_enabled: false,
  soft_upsell_second_ai_dialogue_enabled: false,
  soft_upsell_streak_enabled: false,
  soft_upsell_repeated_training_enabled: false,
  // Дефолт true = kill-switch семантика (фича едет с релизом, админка может
  // экстренно выключить). ВНИМАНИЕ: для рабочих ссылок-приглашений нужна
  // задеплоенная invite-страница — иначе ссылки будут битыми.
  referral_enabled: true,
  // Рулетка+рефералка: дефолт true (kill-switch). Ключ лежит в numbers
  // (boolean), подхват — спец-веткой в applyRemoteConfigSnapshot ниже.
  referral_roulette_enabled: true,
  // Отдельный hard stop. Отсутствие ключа безопасно сохраняет рабочее состояние.
  referral_roulette_emergency_stop: false,
  speaking_enabled: true,
  // «Сокровищница»: дефолт true = kill-switch семантика (фича едет с релизом,
  // админка может экстренно выключить).
  collectibles_enabled: true,
  league_xp_promotion_enabled: false,
  league_startup_registration_enabled: true,
  // Кнопка Phraseman Pro (lifetime) на пейволах. Дефолт TRUE с 2026-06-21: продукт
  // phraseman_premium_lifetime_v1 заведён в App Store + Google Play и привязан в
  // RevenueCat (entitlement premium, пакет $rc_lifetime в default offering), т.е.
  // условие «sell-switch» выполнено. Кнопка всё равно скрывается, если RevenueCat
  // не вернёт пакет (см. lifetimeAvailable = флаг && !!packages.lifetime), так что
  // в проде до одобрения Apple-продукта она не сломается. Выключение (Firestore-
  // override «Пульт») прячет кнопку у всех без релиза/OTA — уже купившие сохраняют
  // доступ (премиум держится на entitlement RevenueCat, а не на видимости кнопки).
  lifetime_button_enabled: true,
  // «Объясни как для 5-летнего»: дефолт TRUE = kill-switch семантика (фича едет
  // с релизом во ВСЕХ сборках, не завязана на env-профиль EAS — раньше дефолт был
  // FALSE и фича пропадала в dev/preview-сборках без EXPO_PUBLIC_EXPLAIN_ENABLED).
  // Firestore-override (админ «Пульт») может экстренно выключить её у всех живьём.
  explain_enabled: true,
  // Раздел «Идеи» (пользователь присылает идею → год полного доступа при одобрении).
  // Дефолт FALSE = sell-switch: это акция с дорогой наградой (год премиума), поэтому
  // раздел скрыт, пока админ намеренно не включит его в «Пульте». Выключение прячет
  // раздел у всех живьём (onSnapshot), без релиза — уже поданные идеи в админ-очереди
  // остаются, и адмін может их закрыть.
  ideas_enabled: false,
  // ai_global_disable — ГЛАВНЫЙ рубильник ВСЕГО ИИ (Компас, «объясни», разбор
  // ошибок, диалоги, разговорный клуб, комментарий дня). Дефолт FALSE = ИИ
  // работает как сейчас. Админ ставит TRUE в «Пульте» → у всех живьём (onSnapshot):
  //  • ручные вызовы ИИ показывают забавную плашку/экран-заглушку (Компас «отдыхает»);
  //  • фоновые/авто-вызовы просто не запускаются — юзер ничего не видит.
  // Это НАД-флаг: перекрывает compass_enabled/explain_enabled и т.д. Сервер тоже
  // уважает его (aiGloballyDisabled в functions) — клиентский гейт нельзя обойти.
  ai_global_disable: false,
  // ── Компас (глобальный обучающий оркестратор) ──────────────────────────────
  // compass_enabled — ГЛАВНЫЙ выключатель всей фичи. Дефолт TRUE = kill-switch:
  // Компас включён из коробки; админ-тумблер в «Пульте» может мгновенно выключить
  // его у всех без релиза (onSnapshot), и НИЧЕГО в основном приложении не страдает
  // — весь код Компаса изолирован в app/compass/ и за этим флагом. Под-флаги ниже
  // — точечные рычаги отдельных крыльев (работают только при главном compass_enabled).
  compass_enabled: true,
  compass_deep_dive_enabled: true,
  compass_lesson_invite_enabled: true,
  compass_economy_enabled: true,
  compass_retention_enabled: true,
  compass_topic_map_enabled: true,
  // Режим обслуживания (управляется из «Пульта»). Дефолт FALSE — приложение
  // работает. banner = мягкая плашка сверху; block = жёсткий полноэкранный
  // блок-экран. Включается у всех живьём (onSnapshot), без релиза.
  maintenance_banner: false,
  maintenance_block: false,
  // Боты в Арене: дефолт TRUE = kill-switch (боты включены как сейчас). Админ
  // ставит false в «Пульте» → бот-фолбэк отключается у всех живьём (onSnapshot),
  // остаётся только реальный матчмейкинг; true возвращает ботов.
  arena_bots_enabled: true,
  // Таймеры срочности на пейволах: дефолт TRUE = kill-switch (показываются как
  // сейчас). Админ ставит false в «Пульте» → блок urgency прячется у всех живьём.
  paywall_timers_enabled: true,
  // Отзывы на пейволах: дефолт TRUE. Админ ставит false в «Пульте» → секция
  // отзывов пропадает у всех живьём (пустой массив), true → возвращается.
  paywall_reviews_enabled: true,
  // Force-update: дефолт FALSE = выключено (страховка). true + версия < min →
  // полноэкранный блок «обнови приложение». Включается из «Пульта» живьём.
  force_update_enabled: false,
  manual_update_enabled: false,
  // Промо-баннер (акция): дефолт FALSE. Включается из «Пульта» на время акции.
  promo_banner_enabled: false,
  // Промокоды: дефолт FALSE = скрыто в настройках и заблокировано на callable.
  promo_codes_enabled: false,
  // Кнопка «Видео PHRASEMAN» на главной: дефолт TRUE = kill-switch (показывается
  // как сейчас). Админ ставит false в «Пульте» → кнопка прячется у всех живьём.
  video_button_enabled: true,
  // Первый экран онбординга «только план»: дефолт FALSE = старый экран с двумя
  // кнопками. true → одна кнопка «Составить мой план» + иной текст (см. описание
  // ключа выше). Меняется у всех живьём из «Пульта».
  onboarding_plan_only_enabled: false,
  // Премиум-гейты: дефолт TRUE = фича за премиум-замком (текущее поведение).
  // Админ ставит false в «Пульте» → фича становится бесплатной у всех живьём.
  gate_lessons_premium: true,
  gate_speaking_premium: true,
  gate_ai_dialog_premium: true,
  gate_smart_trainer_premium: true,
  gate_trainer_modes_premium: true,
  gate_diagnosis_training_premium: true,
  gate_personal_plan_premium: true,
  gate_stats_premium: true,
  gate_flashcards_premium: true,
  gate_themes_premium: true,
  gate_avatar_auras_premium: true,
  gate_mastery_premium: true,
  gate_quizzes_premium: true,
  gate_arena_premium: true,
  gate_energy_premium: true,
  gate_extra_languages_premium: true,
  gate_speaking_club_premium: true,
  // Борд «Топ хелперов»: дефолт true = kill-switch (показывается как сейчас). Админ
  // ставит false в «Пульте» → раздел прячется у всех живьём (onSnapshot), без релиза.
  top_helpers_enabled: true,
  // Подарок «3 дня полного доступа» новым юзерам: безопасный дефолт false.
  // Админ может явно включить его в «Пульте»; при false
  // новые юзеры больше НЕ получают подарок/модал живьём (onSnapshot), без релиза.
  // Уже выданные подарки не отбираются (гейт только в точке выдачи).
  intro_full_access_enabled: false,
};

const DEFAULT_TEXTS: Record<RemoteTextKey, string> = {
  maintenance_ru: '',
  maintenance_uk: '',
  maintenance_es: '',
  free_lessons_extra: '',
  premium_lessons_extra: '',
  weekly_boons_config: '',
  min_app_version: '',
  store_url_ios: '',
  store_url_android: '',
  manual_update_campaign_id: '',
  manual_update_mode: 'optional',
  manual_update_target_build: '',
  manual_update_platform: '',
  manual_update_title_ru: '',
  manual_update_title_uk: '',
  manual_update_title_es: '',
  manual_update_body_ru: '',
  manual_update_body_uk: '',
  manual_update_body_es: '',
  manual_update_cta_ru: '',
  manual_update_cta_uk: '',
  manual_update_cta_es: '',
  promo_banner_text_ru: '',
  promo_banner_text_uk: '',
  promo_banner_text_es: '',
  promo_banner_url: '',
  promo_banner_until: '',
  promo_banner_campaign_id: '',
  promo_banner_audience: '',
  promo_banner_platform: '',
  maintenance_campaign_id: '',
  youtube_channel_id: '',
  youtube_channel_handle: '',
  youtube_channel_name: '',
  youtube_channel_url: '',
  youtube_pinned_videos: '',
  onboarding_enabled_steps_v1: '',
};

// Reasonable guard rails so a fat-fingered admin value can't brick the app.
const NUMBER_BOUNDS: Record<RemoteNumberKey, { min: number; max: number }> = {
  free_lesson_limit: { min: 1, max: 32 },
  free_daily_quiz_limit: { min: 0, max: 999 },
  arena_daily_max: { min: 0, max: 999 },
  arena_shard_refill_cost: { min: 0, max: 9999 },
  arena_shard_refill_slots: { min: 0, max: 999 },
  // Product invariant: base capacity is exactly 5; level 50 adds the sixth slot.
  max_energy: { min: 5, max: 5 },
  energy_recovery_interval_ms: { min: 10_000, max: 24 * 60 * 60 * 1000 },
  free_trainer_sessions_per_day: { min: 0, max: 99 },
  trainer_ab_a_pct: { min: 0, max: 100 },
  trainer_ab_b_pct: { min: 0, max: 100 },
  trainer_ab_c_pct: { min: 0, max: 100 },
  onboarding_ab_welcome_pct: { min: 0, max: 100 },
  onboarding_ab_builder_pct: { min: 0, max: 100 },
  onboarding_ab_quiz_pct: { min: 0, max: 100 },
  paywall_v2_pct: { min: 0, max: 100 },
  league_xp_promotion_threshold: { min: 1, max: 1000000 },
  league_sync_min_delta: { min: 0, max: 1000000 },
  league_sync_min_interval_ms: { min: 10_000, max: 24 * 60 * 60 * 1000 },
  league_sync_force_interval_ms: { min: 60_000, max: 7 * 24 * 60 * 60 * 1000 },
  league_startup_registration_interval_ms: { min: 60_000, max: 7 * 24 * 60 * 60 * 1000 },
  auth_link_cache_ttl_ms: { min: 60_000, max: 30 * 24 * 60 * 60 * 1000 },
  arena_sr_win: { min: 0, max: 999 },
  arena_sr_loss: { min: 0, max: 999 },
  arena_sr_bot_win: { min: 0, max: 999 },
  arena_season_rollback_steps: { min: 0, max: 23 },
  streak_freeze_cost_shards: { min: 0, max: 9999 },
};

const ENV_NUMBER_KEYS: Partial<Record<RemoteNumberKey, string | undefined>> = {
  free_trainer_sessions_per_day: process.env.EXPO_PUBLIC_FREE_TRAINER_SESSIONS,
  trainer_ab_a_pct: process.env.EXPO_PUBLIC_TRAINER_AB_A,
  trainer_ab_b_pct: process.env.EXPO_PUBLIC_TRAINER_AB_B,
  trainer_ab_c_pct: process.env.EXPO_PUBLIC_TRAINER_AB_C,
  onboarding_ab_welcome_pct: process.env.EXPO_PUBLIC_ONBOARDING_AB_WELCOME,
  onboarding_ab_builder_pct: process.env.EXPO_PUBLIC_ONBOARDING_AB_BUILDER,
  onboarding_ab_quiz_pct: process.env.EXPO_PUBLIC_ONBOARDING_AB_QUIZ,
  paywall_v2_pct: process.env.EXPO_PUBLIC_PAYWALL_V2_PCT,
};

// Firestore-fed overrides. Filled by remote_config_client; empty until then.
let _numberOverrides: Partial<Record<RemoteNumberKey, number>> = {};
let _boolOverrides: Partial<Record<RemoteBoolKey, boolean>> = {};
let _textOverrides: Partial<Record<RemoteTextKey, string>> = {};
// Rollout-проценты поэтапного выката: динамические ключи "<flag>_rollout_pct" в
// numbers. Не объявляем каждый в RemoteNumberKey (их было бы ~30) — храним сырыми
// здесь, заполняются из снапшота. Отсутствие ключа = 100% (флаг как обычный bool).
let _rolloutOverrides: Record<string, number> = {};
let _configSignature = 'defaults';
let _remoteConfigSnapshotApplied = false;

const ROLLOUT_SUFFIX = '_rollout_pct';

function clampNumber(key: RemoteNumberKey, value: number): number {
  const { min, max } = NUMBER_BOUNDS[key];
  if (!Number.isFinite(value)) return DEFAULT_NUMBERS[key];
  return Math.max(min, Math.min(max, value));
}

function parseEnvNumber(raw: string | undefined): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** Resolve a numeric flag (override → env → default), always clamped. */
export function getRemoteNumber(key: RemoteNumberKey): number {
  const override = _numberOverrides[key];
  if (typeof override === 'number') return clampNumber(key, override);
  const env = parseEnvNumber(ENV_NUMBER_KEYS[key]);
  if (typeof env === 'number') return clampNumber(key, env);
  return DEFAULT_NUMBERS[key];
}

/** Resolve a boolean flag (override → default). */
export function getRemoteBool(key: RemoteBoolKey): boolean {
  const override = _boolOverrides[key];
  if (typeof override === 'boolean') return override;
  return DEFAULT_FLAGS[key];
}

/** Resolve a text value (override → default ''). */
export function getRemoteText(key: RemoteTextKey): string {
  const override = _textOverrides[key];
  if (typeof override === 'string') return override;
  return DEFAULT_TEXTS[key];
}

export function getEnabledOnboardingSteps(): OnboardingStepId[] {
  return parseEnabledOnboardingSteps(getRemoteText(ONBOARDING_ENABLED_STEPS_TEXT_KEY));
}

/**
 * Apply a fresh config snapshot from Firestore. Unknown keys are ignored;
 * out-of-type values are dropped. Returns the new signature (changes when any
 * resolved value changes) so callers can invalidate cached A/B groups.
 */
export function applyRemoteConfigSnapshot(snapshot: {
  numbers?: Partial<Record<string, unknown>>;
  bools?: Partial<Record<string, unknown>>;
  texts?: Partial<Record<string, unknown>>;
}): string {
  const nextNumbers: Partial<Record<RemoteNumberKey, number>> = {};
  const nextBools: Partial<Record<RemoteBoolKey, boolean>> = {};
  const nextTexts: Partial<Record<RemoteTextKey, string>> = {};

  for (const key of Object.keys(DEFAULT_NUMBERS) as RemoteNumberKey[]) {
    const raw = snapshot.numbers?.[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      nextNumbers[key] = clampNumber(key, raw);
    }
  }
  for (const key of Object.keys(DEFAULT_FLAGS) as RemoteBoolKey[]) {
    const raw = snapshot.bools?.[key];
    if (typeof raw === 'boolean') nextBools[key] = raw;
  }
  // Мастер-флаг рулетки живёт в numbers (boolean) — подхватываем отдельно,
  // чтобы сервер и админка писали один и тот же ключ.
  const rouletteRaw = snapshot.numbers?.referral_roulette_enabled;
  if (typeof rouletteRaw === 'boolean') nextBools.referral_roulette_enabled = rouletteRaw;
  const rouletteEmergencyRaw = snapshot.numbers?.referral_roulette_emergency_stop;
  if (typeof rouletteEmergencyRaw === 'boolean') nextBools.referral_roulette_emergency_stop = rouletteEmergencyRaw;
  for (const key of Object.keys(DEFAULT_TEXTS) as RemoteTextKey[]) {
    const raw = snapshot.texts?.[key];
    if (typeof raw === 'string') nextTexts[key] = raw;
  }

  // Rollout-проценты: динамические ключи "<flag>_rollout_pct" из numbers, не
  // входящие в DEFAULT_NUMBERS (иначе цикл выше их бы уже подобрал). Клампим 0..100.
  const nextRollouts: Record<string, number> = {};
  if (snapshot.numbers) {
    for (const [k, raw] of Object.entries(snapshot.numbers)) {
      if (!k.endsWith(ROLLOUT_SUFFIX)) continue;
      if (k in DEFAULT_NUMBERS) continue; // обычный числовой ключ — не rollout
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        nextRollouts[k] = Math.max(0, Math.min(100, raw));
      }
    }
  }

  _numberOverrides = nextNumbers;
  _boolOverrides = nextBools;
  _textOverrides = nextTexts;
  _rolloutOverrides = nextRollouts;
  _remoteConfigSnapshotApplied = true;
  _configSignature = buildSignature();
  return _configSignature;
}

function buildSignature(): string {
  const parts: string[] = [];
  for (const key of Object.keys(DEFAULT_NUMBERS) as RemoteNumberKey[]) {
    parts.push(`${key}=${getRemoteNumber(key)}`);
  }
  for (const key of Object.keys(DEFAULT_FLAGS) as RemoteBoolKey[]) {
    parts.push(`${key}=${getRemoteBool(key)}`);
  }
  // Rollout-проценты тоже в сигнатуру: их смена должна сбросить кэш A/B-групп.
  for (const k of Object.keys(_rolloutOverrides).sort()) {
    parts.push(`${k}=${_rolloutOverrides[k]}`);
  }
  return parts.join('|');
}

/**
 * Rollout-процент для флага (ключ "<flag>_rollout_pct" в numbers). Отсутствие → 100
 * (полный выкат = флаг ведёт себя как обычный bool). Клампится 0..100.
 */
export function getFlagRolloutPct(flagKey: RemoteBoolKey): number {
  const v = _rolloutOverrides[`${flagKey}${ROLLOUT_SUFFIX}`];
  return typeof v === 'number' ? Math.max(0, Math.min(100, v)) : 100;
}

/**
 * Поэтапный выкат: включён ли флаг для КОНКРЕТНОГО юзера с учётом rollout-процента.
 *  - флаг выключен (getRemoteBool=false) → false для всех;
 *  - флаг включён + rollout>=100 (или не задан) → true для всех;
 *  - флаг включён + rollout<100 → детерминированный бакет по userId (стабилен между
 *    запусками, пока не меняется процент). Без userId → консервативно false при <100
 *    (аноним до идентификации не попадает в частичный выкат, чтобы не «мигало»).
 * Чистый бакетинг вынесен в isInRolloutBucket для тестируемости.
 */
export function isFlagEnabledForUser(flagKey: RemoteBoolKey, userId: string | null): boolean {
  if (!getRemoteBool(flagKey)) return false;
  const pct = getFlagRolloutPct(flagKey);
  if (pct >= 100) return true;
  if (pct <= 0) return false;
  if (!userId) return false;
  return isInRolloutBucket(userId, flagKey, pct);
}

/** Чистый детерминированный бакет: true, если юзер попадает в первые pct% выката. */
export function isInRolloutBucket(userId: string, salt: string, pct: number): boolean {
  if (pct >= 100) return true;
  if (pct <= 0) return false;
  return hashToUnit(`${userId}:rollout:${salt}`) * 100 < pct;
}

export function getRemoteConfigSignature(): string {
  return _configSignature;
}

export function hasRemoteConfigSnapshotApplied(): boolean {
  return _remoteConfigSnapshotApplied;
}

// ── Convenience accessors (typed, self-documenting call sites) ──────────────

export const getFreeLessonLimit = () => getRemoteNumber('free_lesson_limit');
export const getFreeDailyQuizLimit = () => getRemoteNumber('free_daily_quiz_limit');
export const getArenaDailyMax = () => getRemoteNumber('arena_daily_max');
export const getArenaShardRefillCost = () => getRemoteNumber('arena_shard_refill_cost');
export const getArenaShardRefillSlots = () => getRemoteNumber('arena_shard_refill_slots');
export const getMaxEnergy = () => getRemoteNumber('max_energy');
export const getEnergyRecoveryIntervalMs = () => getRemoteNumber('energy_recovery_interval_ms');
export const getFreeTrainerSessionsPerDay = () => getRemoteNumber('free_trainer_sessions_per_day');
export const getPaywallV2Pct = () => getRemoteNumber('paywall_v2_pct');
export const getLeagueXpPromotionThreshold = () => getRemoteNumber('league_xp_promotion_threshold');
export const getLeagueSyncMinDelta = () => getRemoteNumber('league_sync_min_delta');
export const getLeagueSyncMinIntervalMs = () => getRemoteNumber('league_sync_min_interval_ms');
export const getLeagueSyncForceIntervalMs = () => getRemoteNumber('league_sync_force_interval_ms');
export const getLeagueStartupRegistrationIntervalMs = () => getRemoteNumber('league_startup_registration_interval_ms');
export const getAuthLinkCacheTtlMs = () => getRemoteNumber('auth_link_cache_ttl_ms');
export const getArenaSrWin = () => getRemoteNumber('arena_sr_win');
export const getArenaSrLoss = () => getRemoteNumber('arena_sr_loss');
export const getArenaSrBotWin = () => getRemoteNumber('arena_sr_bot_win');
export const getArenaSeasonRollbackSteps = () => getRemoteNumber('arena_season_rollback_steps');
/** Стоимость заморозки серии в осколках (было FREEZE_COST_SHARDS=10). Дефолт 10. */
export const getStreakFreezeCostShards = () => getRemoteNumber('streak_freeze_cost_shards');
export const isReferralEnabled = () => getRemoteBool('referral_enabled');
export const isReferralRouletteEnabled = () => getRemoteBool('referral_roulette_enabled');
export const isReferralRouletteEmergencyStopped = () => getRemoteBool('referral_roulette_emergency_stop');

const SOFT_UPSELL_FLAG_BY_TRIGGER: Record<SoftUpsellTrigger, RemoteBoolKey> = {
  first_lesson: 'soft_upsell_first_lesson_enabled',
  free_lessons_complete: 'soft_upsell_free_lessons_complete_enabled',
  weekly_review: 'soft_upsell_weekly_review_enabled',
  second_ai_dialogue: 'soft_upsell_second_ai_dialogue_enabled',
  streak_milestone: 'soft_upsell_streak_enabled',
  repeated_training: 'soft_upsell_repeated_training_enabled',
};

export function getSoftUpsellEnabledByTrigger(): Record<SoftUpsellTrigger, boolean> {
  return Object.fromEntries(
    Object.entries(SOFT_UPSELL_FLAG_BY_TRIGGER).map(([trigger, flag]) => [trigger, getRemoteBool(flag)]),
  ) as Record<SoftUpsellTrigger, boolean>;
}
export const isSpeakingEnabled = () => getRemoteBool('speaking_enabled');
export const isCollectiblesEnabled = () => getRemoteBool('collectibles_enabled');
/** Боты-соперники в Арене (бот-фолбэк при пустой очереди). Дефолт true. */
export const isArenaBotsEnabled = () => getRemoteBool('arena_bots_enabled');
/**
 * Таймеры «срочности» (анонс повышения цены) на пейволах A/B/C. Дефолт true =
 * показываются как сейчас. false (из «Пульта») → блок urgency скрыт у всех живьём.
 * Гейт применяется в app/paywall_purchase.ts.
 */
export const isPaywallTimersEnabled = () => getRemoteBool('paywall_timers_enabled');
export const isPaywallReviewsEnabled = () => getRemoteBool('paywall_reviews_enabled');

// ── Force-update (минимальная версия) ───────────────────────────────────────
/** Включён ли force-update. Дефолт false. */
export const isForceUpdateEnabled = () => getRemoteBool('force_update_enabled');
/** Минимальная допустимая версия (semver "1.2.3"). Пусто = блок не показывать. */
export const getMinAppVersion = () => getRemoteText('min_app_version');
/** Ссылка на App Store для кнопки «Обновить». */
export const getStoreUrlIos = () => getRemoteText('store_url_ios');
/** Ссылка на Google Play для кнопки «Обновить». */
export const getStoreUrlAndroid = () => getRemoteText('store_url_android');

export type ManualUpdateMode = 'force' | 'optional';
export type ManualUpdatePlatform = '' | 'ios' | 'android';

export const isManualUpdateEnabled = () => getRemoteBool('manual_update_enabled');
export const getManualUpdateCampaignId = () => getRemoteText('manual_update_campaign_id');
export const getManualUpdateTargetBuild = () => getRemoteText('manual_update_target_build');

export function normalizeManualUpdateMode(raw: string): ManualUpdateMode {
  return String(raw || '').trim().toLowerCase() === 'force' ? 'force' : 'optional';
}

export function normalizeManualUpdatePlatform(raw: string): ManualUpdatePlatform {
  const value = String(raw || '').trim().toLowerCase();
  return value === 'ios' || value === 'android' ? value : '';
}

export const getManualUpdateMode = (): ManualUpdateMode => normalizeManualUpdateMode(getRemoteText('manual_update_mode'));
export const getManualUpdatePlatform = (): ManualUpdatePlatform =>
  normalizeManualUpdatePlatform(getRemoteText('manual_update_platform'));

export function matchesManualUpdatePlatform(params: {
  platformFilter?: string;
  platform?: string;
}): boolean {
  const filter = normalizeManualUpdatePlatform(params.platformFilter || '');
  if (!filter) return true;
  return normalizeManualUpdatePlatform(params.platform || '') === filter;
}

export function getManualUpdateTitle(lang: string): string {
  const l = String(lang || '').toLowerCase();
  if (l.startsWith('uk')) return getRemoteText('manual_update_title_uk');
  if (l.startsWith('es')) return getRemoteText('manual_update_title_es');
  return getRemoteText('manual_update_title_ru');
}

export function getManualUpdateBody(lang: string): string {
  const l = String(lang || '').toLowerCase();
  if (l.startsWith('uk')) return getRemoteText('manual_update_body_uk');
  if (l.startsWith('es')) return getRemoteText('manual_update_body_es');
  return getRemoteText('manual_update_body_ru');
}

export function getManualUpdateCta(lang: string): string {
  const l = String(lang || '').toLowerCase();
  if (l.startsWith('uk')) return getRemoteText('manual_update_cta_uk');
  if (l.startsWith('es')) return getRemoteText('manual_update_cta_es');
  return getRemoteText('manual_update_cta_ru');
}

/**
 * Сравнение semver: true, если `current` строго НИЖЕ `minimum`. Сравнивает по
 * числовым сегментам (мажор.минор.патч…), недостающие сегменты = 0. Любой пустой/
 * нечисловой ввод → false (НЕ блокируем при мусоре — force-update это страховка,
 * а не способ случайно запереть всех). Чистая функция, экспортируется для тестов.
 */
export function isVersionBelow(current: string, minimum: string): boolean {
  const parse = (v: string): number[] | null => {
    const s = String(v || '').trim();
    if (!s) return null;
    const segments = s.split('.');
    const parts: number[] = [];
    for (const seg of segments) {
      const digits = seg.replace(/[^0-9].*$/, ''); // обрезаем хвост от первого не-цифрового символа
      if (digits === '') return null;               // сегмент без ведущей цифры ("abc") = невалидно
      const n = Math.trunc(Number(digits));
      if (!Number.isFinite(n)) return null;
      parts.push(n);
    }
    return parts.length ? parts : null;
  };
  const a = parse(current);
  const b = parse(minimum);
  if (!a || !b) return false;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    if (ai < bi) return true;
    if (ai > bi) return false;
  }
  return false; // равны
}

/**
 * Решение force-update: показывать ли блок «обнови приложение». Чистая функция —
 * принимает флаг/версии явно, чтобы тестировать без Firestore. Блокируем только
 * когда флаг включён, min задана и текущая версия строго ниже min.
 */
export function shouldForceUpdate(params: {
  enabled: boolean;
  currentVersion: string;
  minVersion: string;
}): boolean {
  const { enabled, currentVersion, minVersion } = params;
  if (!enabled) return false;
  if (!String(minVersion || '').trim()) return false;
  return isVersionBelow(currentVersion, minVersion);
}

export function shouldShowManualUpdate(params: {
  enabled: boolean;
  campaignId: string;
  mode: string;
  currentBuild: string;
  targetBuild: string;
  platformFilter?: string;
  platform?: string;
  seenCampaignIds?: readonly string[];
}): boolean {
  if (!params.enabled) return false;
  const campaignId = String(params.campaignId || '').trim();
  if (!campaignId) return false;
  if (!matchesManualUpdatePlatform({ platformFilter: params.platformFilter, platform: params.platform })) return false;
  const targetBuild = String(params.targetBuild || '').trim();
  if (targetBuild && !isVersionBelow(params.currentBuild, targetBuild)) return false;
  const mode = normalizeManualUpdateMode(params.mode);
  if (mode === 'optional' && (params.seenCampaignIds || []).includes(campaignId)) return false;
  return true;
}

// ── Кнопка «Видео» + YouTube-канал ───────────────────────────────────────────
/** Кнопка «Видео PHRASEMAN» на главной. Дефолт true = показывается как сейчас. */
export const isVideoButtonEnabled = () => getRemoteBool('video_button_enabled');
/** Сырой channelId канала из «Пульта» (UC…). Пусто = встроенный дефолт. */
export const getYoutubeChannelIdOverride = () => getRemoteText('youtube_channel_id');
/** Сырой @handle канала из «Пульта». Пусто = вывести из дефолта/id. */
export const getYoutubeChannelHandleOverride = () => getRemoteText('youtube_channel_handle');
/** Сырое отображаемое имя канала из «Пульта». Пусто = дефолт PHRASEMAN. */
export const getYoutubeChannelNameOverride = () => getRemoteText('youtube_channel_name');
/** Сырая ссылка на канал из «Пульта». Пусто = построить из handle. */
export const getYoutubeChannelUrlOverride = () => getRemoteText('youtube_channel_url');
/** Сырой JSON пришпиленных видео из «Пульта» (парсится в lingman_youtube.ts). */
export const getYoutubePinnedVideosRaw = () => getRemoteText('youtube_pinned_videos');

// ── Промо-баннер (акция) ─────────────────────────────────────────────────────
/** Включён ли промо-баннер. Дефолт false. */
export const isPromoBannerEnabled = () => getRemoteBool('promo_banner_enabled');
/** Раздел «Промокод» в настройках + серверная активация. Дефолт false. */
export const isPromoCodesEnabled = () => getRemoteBool('promo_codes_enabled');
/** Ссылка по тапу на баннер (необяз.). */
export const getPromoBannerUrl = () => getRemoteText('promo_banner_url');
/** Срок окончания акции: ISO-дата "2026-07-01" или ms-таймстамп. Пусто = бессрочно. */
export const getPromoBannerUntil = () => getRemoteText('promo_banner_until');
export const getPromoBannerCampaignId = () => getRemoteText('promo_banner_campaign_id');
/** Аудитория баннера: 'all'|'free'|'premium' (пусто = all). */
export const getPromoBannerAudience = () => getRemoteText('promo_banner_audience');
/** Фильтр платформы баннера: 'ios'|'android' (пусто = обе). */
export const getPromoBannerPlatform = () => getRemoteText('promo_banner_platform');
/**
 * Кастомный текст баннера для языка. Поля задаются только для ru/uk/es. Для прочих
 * языков (pt-BR/vi/id/tr/pl) возвращаем '' — НЕ русский: тогда PromoBanner покажет
 * свой локализованный defaultText на нужном языке, а не кириллицу. Для ru/uk/es
 * пустое поле тоже даёт '' → тот же локализованный дефолт.
 */
export function getPromoBannerText(lang: string): string {
  const l = String(lang || '').toLowerCase();
  if (l.startsWith('uk')) return getRemoteText('promo_banner_text_uk');
  if (l.startsWith('es')) return getRemoteText('promo_banner_text_es');
  if (l.startsWith('ru')) return getRemoteText('promo_banner_text_ru');
  return ''; // прочие языки → локализованный defaultText в компоненте
}

/**
 * Парсит срок акции в ms. Поддерживает ISO-дату ("2026-07-01") и числовой ms.
 * Пусто/мусор → null (бессрочно). Чистая, экспортируется для тестов.
 */
export function parsePromoUntilMs(raw: string): number | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^\d{10,}$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

/**
 * Чистый матчер таргета баннера: подходит ли текущий юзер/платформа под аудиторию.
 * audience: 'all'|''(=all)|'free'|'premium'; platform-фильтр: 'ios'|'android'|''(=обе).
 * Неизвестные значения трактуются мягко как «без ограничения» (показать), чтобы
 * опечатка админа не спрятала акцию молча. Экспортируется для тестов.
 */
export function matchesPromoSegment(params: {
  audience: string;
  isPremium: boolean;
  platformFilter: string;
  platform: string; // текущая платформа: 'ios'|'android'
}): boolean {
  const aud = String(params.audience || '').trim().toLowerCase();
  if (aud === 'free' && params.isPremium) return false;
  if (aud === 'premium' && !params.isPremium) return false;
  const pf = String(params.platformFilter || '').trim().toLowerCase();
  if ((pf === 'ios' || pf === 'android') && pf !== String(params.platform || '').toLowerCase()) {
    return false;
  }
  return true;
}

/**
 * Решение: показывать ли промо-баннер. Чистая функция (всё явно — для тестов без
 * Firestore). Показываем при включённом флаге, не истёкшем сроке И совпадении
 * таргета (аудитория/платформа). Поля сегмента опциональны — если не переданы,
 * таргет считается «всем» (обратная совместимость старых вызовов/тестов).
 */
export function shouldShowPromoBanner(params: {
  enabled: boolean;
  untilRaw: string;
  nowMs: number;
  audience?: string;
  isPremium?: boolean;
  platformFilter?: string;
  platform?: string;
}): boolean {
  const { enabled, untilRaw, nowMs } = params;
  if (!enabled) return false;
  const until = parsePromoUntilMs(untilRaw);
  if (until != null && nowMs >= until) return false; // срок истёк
  // Таргет проверяем только если заданы сегмент-параметры (иначе — всем).
  if (params.audience !== undefined || params.platformFilter !== undefined) {
    if (!matchesPromoSegment({
      audience: params.audience || '',
      isPremium: !!params.isPremium,
      platformFilter: params.platformFilter || '',
      platform: params.platform || '',
    })) return false;
  }
  return true;
}

/**
 * Первый экран онбординга «только план»: дефолт false = экран с двумя кнопками
 * (план / просто посмотреть). true → одна кнопка «Составить мой план» в поток
 * плана + иной текст. Управляется из «Пульта» (remote_config/app.bools).
 */
export const isOnboardingPlanOnly = () => getRemoteBool('onboarding_plan_only_enabled');
export const isLeagueXpPromotionEnabled = () => getRemoteBool('league_xp_promotion_enabled');
export const isLeagueStartupRegistrationEnabled = () => getRemoteBool('league_startup_registration_enabled');
// зачем: league_realtime_members_enabled удалён целиком (тип+дефолт+хелпер) —
// realtime-подписка на участников лиги снесена (subscribeToLeagueGroupMembers,
// 2026-07-25), мёртвый kill-switch в «Пульте» лишь вводил бы в заблуждение.
// Старый ключ в Firestore-доке безопасно игнорируется циклом по DEFAULT_FLAGS.
/** Phraseman Pro показывается как раскрываемая разовая покупка. Дефолт true. */
export const isLifetimeButtonEnabled = () => getRemoteBool('lifetime_button_enabled');
/** Раздел «Идеи» в настройках (год премиума за идею). Дефолт false — sell-switch. */
export const isIdeasEnabled = () => getRemoteBool('ideas_enabled');
/** Борд «Топ хелперов» в настройках (топ-репортёры багов). Дефолт true — kill-switch. */
export const isTopHelpersEnabled = () => getRemoteBool('top_helpers_enabled');
/**
 * Подарок «3 дня полного доступа» новым юзерам (72ч intro). Дефолт false:
 * новые юзеры не получают ни подарок, ни приветственный модал. Включение из
 * «Пульта» действует только на будущие выдачи; уже выданные подарки не отбираются.
 * Гейт применяется в app/intro_full_access.ts (точка выдачи).
 */
export const isIntroFullAccessEnabled = () => getRemoteBool('intro_full_access_enabled');

/**
 * Компас — ГЛАВНЫЙ выключатель всей фичи. Дефолт false (sell-switch). Если false —
 * весь Компас отсутствует, основное приложение работает как раньше. Под-флаги ниже
 * имеют силу ТОЛЬКО когда главный включён (см. app/compass/compass_flags.ts).
 */
/**
 * Глобальный рубильник всего ИИ. TRUE = весь ИИ выключен (ручные вызовы → забавная
 * заглушка, фоновые → тихо no-op). Это НАД-флаг: все ИИ-геттеры ниже уважают его.
 */
export const isAiGloballyDisabled = () => getRemoteBool('ai_global_disable');
export const isCompassEnabled = () => getRemoteBool('compass_enabled') && !isAiGloballyDisabled();
export const isCompassDeepDiveEnabled = () => getRemoteBool('compass_deep_dive_enabled');
export const isCompassLessonInviteEnabled = () => getRemoteBool('compass_lesson_invite_enabled');
export const isCompassEconomyEnabled = () => getRemoteBool('compass_economy_enabled');
export const isCompassRetentionEnabled = () => getRemoteBool('compass_retention_enabled');
export const isCompassTopicMapEnabled = () => getRemoteBool('compass_topic_map_enabled');
/** Режим обслуживания: мягкий баннер / жёсткий блок-экран. */
export const isMaintenanceBanner = () => getRemoteBool('maintenance_banner');
export const isMaintenanceBlock = () => getRemoteBool('maintenance_block');
export const getMaintenanceCampaignId = () => getRemoteText('maintenance_campaign_id');

// ── Премиум-гейты фич ───────────────────────────────────────────────────────
// true = фича за премиум-замком (дефолт), false = бесплатна для всех. Используются
// через app/feature_gates.ts (isFeatureFreeForEveryone). Прямые геттеры на случай
// точечной проверки.
export const isLessonsPremiumGated = () => getRemoteBool('gate_lessons_premium');
export const isSpeakingPremiumGated = () => getRemoteBool('gate_speaking_premium');
export const isAiDialogPremiumGated = () => getRemoteBool('gate_ai_dialog_premium');
export const isSmartTrainerPremiumGated = () => getRemoteBool('gate_smart_trainer_premium');
export const isTrainerModesPremiumGated = () => getRemoteBool('gate_trainer_modes_premium');
export const isDiagnosisTrainingPremiumGated = () => getRemoteBool('gate_diagnosis_training_premium');
export const isPersonalPlanPremiumGated = () => getRemoteBool('gate_personal_plan_premium');
export const isStatsPremiumGated = () => getRemoteBool('gate_stats_premium');
export const isFlashcardsPremiumGated = () => getRemoteBool('gate_flashcards_premium');
export const isThemesPremiumGated = () => getRemoteBool('gate_themes_premium');
export const isAvatarAurasPremiumGated = () => getRemoteBool('gate_avatar_auras_premium');
export const isMasteryPremiumGated = () => getRemoteBool('gate_mastery_premium');
export const isQuizzesPremiumGated = () => getRemoteBool('gate_quizzes_premium');
export const isArenaPremiumGated = () => getRemoteBool('gate_arena_premium');
export const isEnergyPremiumGated = () => getRemoteBool('gate_energy_premium');

/** Поурочные исключения: набор id уроков, открытых бесплатно сверх порога. */
export const getFreeLessonsExtra = () => parseLessonIdList(getRemoteText('free_lessons_extra'));
/** Поурочные исключения: набор id уроков, закрытых под премиум вопреки порогу. */
export const getPremiumLessonsExtra = () => parseLessonIdList(getRemoteText('premium_lessons_extra'));

/** Сырой JSON-конфиг недельных бонусов из «Пульта» (парсится в boons/boon_config.ts). */
export const getWeeklyBoonsConfigRaw = (): string => getRemoteText('weekly_boons_config');

/**
 * Парсит JSON-строку вида "[3,5,9]" в Set валидных id уроков (1..32). Любой мусор
 * (не-массив, не-числа, вне диапазона, дубли) тихо отбрасывается — конфиг от админа
 * не должен ронять приложение.
 */
function parseLessonIdList(raw: string): ReadonlySet<number> {
  const out = new Set<number>();
  if (!raw) return out;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return out;
    for (const v of arr) {
      const n = Math.trunc(Number(v));
      if (Number.isFinite(n) && n >= 1 && n <= 32) out.add(n);
    }
  } catch {
    // невалидный JSON — порог без исключений
  }
  return out;
}
/** Локализованный текст режима обслуживания (ru/uk/es; пусто = дефолт компонента). */
export function getMaintenanceText(lang: string): string {
  const l = String(lang || '').toLowerCase();
  if (l.startsWith('uk')) return getRemoteText('maintenance_uk');
  if (l.startsWith('es')) return getRemoteText('maintenance_es');
  return getRemoteText('maintenance_ru');
}

/**
 * Deterministic A/B group for a user (stable across launches unless the split
 * config changes). djb2 hash of `${userId}:${salt}` → bucket by cumulative pct.
 * Groups: 'A' | 'B' | 'C'. Defaults to 'B' (2 sessions) if all pcts are zero.
 */
export type TrainerAbGroup = 'A' | 'B' | 'C';
export type OnboardingAbVariant = 'current';

export function getTrainerAbGroup(userId: string): TrainerAbGroup {
  const a = getRemoteNumber('trainer_ab_a_pct');
  const b = getRemoteNumber('trainer_ab_b_pct');
  const c = getRemoteNumber('trainer_ab_c_pct');
  const total = a + b + c;
  if (total <= 0) return 'B';
  const bucket = hashToUnit(`${userId}:trainer_sessions_ab`) * total;
  if (bucket < a) return 'A';
  if (bucket < a + b) return 'B';
  return 'C';
}

/**
 * Deprecated onboarding A/B compatibility helper. The old welcome/builder/quiz
 * branches are retired; all users enter the new plan-first onboarding.
 */
export function getOnboardingAbVariant(_userId: string): OnboardingAbVariant {
  return 'current';
}

/**
 * Legacy helper kept only for old imports/tests. The old v1 paywall is retired,
 * so this must never route traffic back to it.
 */
export function getPaywallVariant(_userId: string): 'v2' {
  return 'v2';
}

function hashToUnit(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return (h % 100000) / 100000;
}

// ── Trainer A/B effective sessions (cached per user) ────────────────────────
// Merged from the env-based remote_flags during branch integration: builds on
// the Remote Config getters above (getTrainerAbGroup / getFreeTrainerSessionsPerDay)
// instead of duplicating the resolution logic.

const TRAINER_AB_CACHE_KEY = 'trainer_sessions_ab_group_v1';

/** Sessions/day for a given A/B group. A=1, B=2, C=3. */
export function trainerSessionsForGroup(group: TrainerAbGroup): number {
  switch (group) {
    case 'A': return 1;
    case 'B': return 2;
    case 'C': return 3;
  }
}

/**
 * Effective free trainer sessions/day for a user: if an A/B split is configured,
 * resolve a stable group by userId; otherwise fall back to the flat per-day value.
 * The chosen group is cached in AsyncStorage and invalidated when the Remote
 * Config signature changes, so the group never sticks across experiment changes.
 */
export async function getEffectiveFreeTrainerSessions(userId: string | null): Promise<number> {
  const hasAbSplit =
    getRemoteNumber('trainer_ab_a_pct') +
      getRemoteNumber('trainer_ab_b_pct') +
      getRemoteNumber('trainer_ab_c_pct') >
    0;

  if (!hasAbSplit || !userId) return getFreeTrainerSessionsPerDay();

  const sig = getRemoteConfigSignature();
  let group: TrainerAbGroup | null = null;
  const cached = await AsyncStorage.getItem(TRAINER_AB_CACHE_KEY).catch(() => null);
  if (cached) {
    const [cachedSig, cachedGroup] = cached.split('|');
    if (cachedSig === sig && (cachedGroup === 'A' || cachedGroup === 'B' || cachedGroup === 'C')) {
      group = cachedGroup;
    }
  }
  if (!group) {
    group = getTrainerAbGroup(userId);
    await AsyncStorage.setItem(TRAINER_AB_CACHE_KEY, `${sig}|${group}`).catch(() => {});
  }
  return trainerSessionsForGroup(group);
}

/** Test-only reset. */
export function __resetRemoteFlagsForTest(): void {
  _numberOverrides = {};
  _boolOverrides = {};
  _textOverrides = {};
  _rolloutOverrides = {};
  _remoteConfigSnapshotApplied = false;
  _configSignature = 'defaults';
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}
