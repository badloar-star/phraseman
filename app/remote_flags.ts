// ═══════════════════════════════════════════════════════════════════════════
// remote_flags.ts — Remote Config layer (admin-tunable runtime knobs)
//
// Single source of truth for release-independent subscription/content/update
// controls. Core gameplay economy stays local and is not remotely tunable.
// split. Resolution order (highest priority first):
//
//   1. Firestore override   (admin/v2/legacy.html → remote_config/* → cached foreground polling)
//   2. Build-time env        (EXPO_PUBLIC_* — useful for QA builds)
//   3. Hardcoded default     (DEFAULT_NUMBERS / DEFAULT_FLAGS below)
//
// The Firestore layer is filled by loadRemoteConfig()/subscribeRemoteConfig()
// (see remote_config_client.ts). Until that runs, defaults/env apply, so the
// app always works offline and on first launch.
// ═══════════════════════════════════════════════════════════════════════════

import {
  ONBOARDING_ENABLED_STEPS_TEXT_KEY,
  parseEnabledOnboardingSteps,
  type OnboardingStepId,
} from './onboarding_flow';
import type { SoftUpsellTrigger } from './soft_upsell_core';

export type RemoteNumberKey =
  | 'onboarding_ab_welcome_pct'
  | 'onboarding_ab_builder_pct'
  | 'paywall_v2_pct'
  | 'auth_link_cache_ttl_ms'
  | 'phone_state_cutover_percent'
  // зачем (владелец 22.10, вопрос 27 «сначала безопасные»): версии общих данных — клиент тянет их из сети, только когда
  // версия выросла. 0 / нет поля = сервер версию ещё не пишет → прежнее поведение. Пишет только сервер (1 · Ядро).
  | 'app_messages_feed_rev'
  | 'global_broadcast_rev'
  | 'home_survey_rev'
  ;

export type RemoteBoolKey =
  // Онбординг: kill-switch кнопки «Пропустить» (владелец может выключить без
  // релиза, если увидит просадку показов пейвола) и приветственной шторки.
  | 'onboarding_skip_enabled'
  | 'weekly_review_ai_v2_enabled'
  | 'soft_upsell_first_lesson_enabled'
  | 'soft_upsell_free_lessons_complete_enabled'
  | 'soft_upsell_weekly_review_enabled'
  | 'soft_upsell_second_ai_dialogue_enabled'
  | 'soft_upsell_streak_enabled'
  | 'referral_enabled'
  | 'phone_state_shadow_enabled'
  | 'phone_state_sync_enabled'
  | 'phone_state_emergency_stop'
  | 'support_diagnostics_enabled'
  | 'lifetime_button_enabled'
  | 'maintenance_banner'
  | 'maintenance_block'
  // Боты-соперники в Арене (бот-фолбэк при пустой очереди). Дефолт TRUE =
  // kill-switch: боты работают как сейчас, админ может выключить их в «Пульте»
  // живьём — тогда матчатся только реальные игроки друг с другом, а при пустой
  // очереди соперник не подставляется. Включение возвращает ботов обратно.
  | 'paywall_reviews_enabled'
  // Принудительное обновление (force-update). Дефолт FALSE = выключено (страховка
  // от случайной блокировки всех). Когда true И версия приложения < min_app_version
  // — ForceUpdateGate показывает полноэкранный блок «обнови приложение». Версия и
  // ссылки на сторы — в текстовых ключах ниже. Управляется из «Пульта» живьём.
  | 'force_update_enabled'
  | 'manual_update_enabled'
  // Режим энергии (владелец 11.10, ENERGY_MODES_OWNER_BRIEF): false = А (1 энергия за старт, сердечки за ошибки),
  // true = Б (старт бесплатный, 1 энергия за ошибку, остановка на последней). Переключатель — в админке.
  | 'energy_mistake_charge'
  // Промо-баннер (акция). Дефолт FALSE. true → в приложении показывается
  // управляемый из «Пульта» баннер акции (текст/ссылка/срок в текстовых ключах).
  // Сама скидка на подписку настраивается в сторах отдельно — баннер только зовёт.
  | 'promo_banner_enabled'
  // зачем (владелец 15.10, «проверка речи принимает всё»): аварийный выключатель строгой проверки слов.
  // Дефолт true; false в remote_config/app.bools вернёт прежнее мягкое правило без релиза.
  | 'speaking_strict_check_enabled'
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
  // Фразы из видео: sell-switch. Включается после первой проверенной публикации.
  | 'video_phrases_enabled'
  // ── Премиум-гейты фич (управляются из «Пульта» → раздел «Премиум/Фри») ──────
  // Семантика: true = фича за ПРЕМИУМ-замком (как сейчас), false = фича БЕСПЛАТНА
  // для всех (замок снимается живьём, без релиза). Дефолт TRUE у каждого, чтобы
  // поведение по умолчанию не менялось — пейволы остаются ровно там, где были.
  // Списки фич держим в синхроне с FEATURE_GATE_KEYS (app/feature_gates.ts) и
  // с разделом «Премиум/Фри» в admin/index.html.
  | 'gate_lessons_premium'
  | 'gate_speaking_premium'
  | 'gate_ai_dialog_premium'
  | 'gate_stats_premium'
  | 'gate_flashcards_premium'
  | 'gate_themes_premium'
  | 'gate_avatar_auras_premium'
  | 'gate_mastery_premium'
  | 'gate_energy_premium'
  // Дневной лимит матчей Арены (1/сутки у обычного аккаунта). false в «Пульте»
  // снимает лимит у всех живьём — как у любой другой фичи.
  | 'gate_arena_premium'
  // Дневной лимит сессий «Работы над ошибками» (1/сутки у обычного аккаунта).
  | 'gate_mistake_practice_premium'
  // Гейт добавления второго и последующих языков обучения (1 язык — фри).
  | 'gate_extra_languages_premium'
  // Скидочная акция (-50% через offer в сторах, см. document 2026-09-17). Дефолт
  // FALSE. true → в хедере Главной (между колокольчиком и профилем) появляется
  // бейдж со скидкой, текст берётся из discount_offer_badge_percent (ниже, в
  // RemoteTextKey); сама цена на пейволе считается из pricingPhases пакета
  // (getStorePromoPricing) — здесь только вкл/выкл видимости бейджа.
  // Реальную скидку даёт offer, настроенный в Google Play/App Store Connect —
  // выключение этого флага НЕ трогает уже купивших по акции (их цена держится
  // магазином, а не этим флагом).
  | 'discount_offer_banner_enabled'
  // зачем (Account V2, Пакет 6B, TG-F76EA3701B55): клиентская синхронизация V2
  // (outbox → accountsV2SyncApply) и ключ удаления V2. Дефолт FALSE = sell-switch:
  // пока выключен — ни чтений, ни записей, ни сети, модули V2 даже не грузятся.
  // Включает только владелец (Firestore remote_config, «Пульт»), и только вместе
  // с серверным config/accounts_v2.syncEnabled.
  | 'accounts_v2_client_enabled'
  // зачем (Account V2, Пакет 7A, OD19): выключатель СТАРОЙ синхронизации для
  // доменов V2 (карточки, память свайпов, библиотека наборов сообщества). Дефолт
  // FALSE: старая синхронизация работает ровно как раньше. Включает только
  // владелец («Пульт») после проверки на 3 аккаунтах (OD24); действует только
  // вместе с accounts_v2_client_enabled и открытой областью V2.
  | 'accounts_v2_legacy_sync_disabled'
  // Приветственный подарок «3 дня полного доступа» для НОВЫХ юзеров (72ч intro).
  // Дефолт TRUE = kill-switch: новые получают подарок и приветственный модал как
  // сейчас. Админ ставит false в «Пульте» → НОВЫЕ юзеры больше не получают ни
  // подарок, ни модал (startIntroFullAccessAfterOnboarding раньше выходит). Уже
  // выданный подарок НЕ отбирается — активные докатывают свои 72ч, их модалы не
  // трогаются (гейт стоит только в точке ВЫДАЧИ). Включение возвращает подарок
  // будущим новичкам. Гейт в app/intro_full_access.ts.
;

/** Строковые ключи (тексты), управляемые из админки. Сейчас — режим обслуживания. */
export type RemoteTextKey =
  // Справочные цены Plus (владелец 11.10: «ЦЕНЫ ДОЛЖНЫ ПОКАЗЫВАТЬСЯ ВСЕ РАВНО!!! ВЕЗДЕ») — JSON
  // {"yearly","monthly","yearlyPerMonth"}; пусто → зашитая страховка (app/paywall_reference_prices.ts).
  | 'paywall_reference_prices'
  | 'maintenance_ru'
  | 'maintenance_uk'
  | 'maintenance_es'
  // Компас: переопределяемый из «Пульта» fallback-комментарий дня (когда ИИ-голос
  // выключен или бюджет исчёрпан). Пусто = берётся встроенный текст по Библии.
  | 'compass_voice_fallback_ru'
  | 'compass_voice_fallback_uk'
  | 'compass_voice_fallback_es'
  // ниже порога. Пусто/невалидно = только порог. premium_* имеет приоритет над free_*.
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
  // Процент на бейдже скидки Главной, например "50" → бейдж покажет «−50%».
  // Ставится владельцем ВРУЧНУЮ в «Пульте» и должен совпадать с реальным
  // offer'ом в сторе — это только текст на кнопке, реальную скидку и цену
  // задаёт store (см. discount_offer_banner_enabled выше). Пусто/невалидно =
  // бейдж не рендерится совсем, даже если enabled=true — лучше не показать
  // акцию, чем показать неверный процент.
  | 'discount_offer_badge_percent'
  | 'maintenance_campaign_id'
  | 'compass_copy_overrides'
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

const DEFAULT_NUMBERS: Record<RemoteNumberKey, number> = {
  // зачем (PM-081, D06): запас энергии ровно 5, пульт его не меняет.
  // PM-083 (BIBLE «+1 за 10 минут»; D06): 0→5 занимает 50 минут.
  onboarding_ab_welcome_pct: 0,
  onboarding_ab_builder_pct: 0,
  paywall_v2_pct: 100,
  auth_link_cache_ttl_ms: 7 * 24 * 60 * 60 * 1000,
  phone_state_cutover_percent: 0,
  app_messages_feed_rev: 0,
  global_broadcast_rev: 0,
  home_survey_rev: 0,
};

const DEFAULT_FLAGS: Record<RemoteBoolKey, boolean> = {
  // Дефолт true = kill-switch семантика: фича едет с релизом, админка может
  // выключить её мгновенно (кнопка «Пропустить» бьёт по показам пейвола).
  onboarding_skip_enabled: true,
  // Строгая проверка речи: значимые слова фразы обязаны прозвучать (kill-switch, дефолт ВКЛ).
  speaking_strict_check_enabled: true,
  // Global client kill-switch only. Server owns percentage rollout by canonical stableUid.
  weekly_review_ai_v2_enabled: true,
  // Verified lesson-completion soft upsells ship enabled; Remote Config remains the kill switch.
  soft_upsell_first_lesson_enabled: true,
  soft_upsell_free_lessons_complete_enabled: true,
  soft_upsell_weekly_review_enabled: false,
  soft_upsell_second_ai_dialogue_enabled: false,
  soft_upsell_streak_enabled: false,
  // Дефолт true = kill-switch семантика (фича едет с релизом, админка может
  // экстренно выключить). ВНИМАНИЕ: для рабочих ссылок-приглашений нужна
  // задеплоенная invite-страница — иначе ссылки будут битыми.
  referral_enabled: true,
  // Безопасный sell-switch: новый редактор невидим до явного включения и
  // отдельного поэтапного процента. Старый экран Студии при этом не меняется.
  // PhoneState remains fully dormant until each capability is explicitly
  // enabled after shadow verification. These are sell-switches, never defaults.
  phone_state_shadow_enabled: false,
  phone_state_sync_enabled: false,
  // Fail-safe rollout brake. The owner must deliberately disable it only
  // after internal/shadow evidence is green.
  phone_state_emergency_stop: true,
  // Account V2 (Пакет 6B): выключено до явного решения владельца.
  accounts_v2_client_enabled: false,
  // Account V2 (Пакет 7A): старая синхронизация V2-доменов включена, пока владелец не решит.
  accounts_v2_legacy_sync_disabled: false,
  // Рулетка+рефералка: дефолт true (kill-switch). Ключ лежит в numbers
  // (boolean), подхват — спец-веткой в applyRemoteConfigSnapshot ниже.
  // Отдельный hard stop. Отсутствие ключа безопасно сохраняет рабочее состояние.
  // «Сокровищница»: дефолт true = kill-switch семантика (фича едет с релизом,
  // админка может экстренно выключить).
  // Privacy-safe local breadcrumbs. false disables recording and report attachment.
  support_diagnostics_enabled: true,
  // Кнопка Phraseman Pro (lifetime) на пейволах. Это скрытие продажи, а не
  // отзыв доступа:
  // уже купившие Pro сохраняют полный доступ навсегда, потому что премиум держится
  // на entitlement RevenueCat, а не на видимости этой кнопки (см. premium_guard).
  // Код покупки lifetime намеренно оставлен рабочим — Pro можно вернуть одним
  // Firestore-override в «Пульте», без релиза/OTA.
  // Дополнительный жёсткий гейт стоит в paywall_purchase → lifetimeAvailable
  // (LIFETIME_SALE_RETIRED), чтобы случайный override в «Пульте» не вернул Pro
  // на витрину незаметно для владельца.
  lifetime_button_enabled: false,
  // «Объясни как для 5-летнего»: дефолт TRUE = kill-switch семантика (фича едет
  // с релизом во ВСЕХ сборках, не завязана на env-профиль EAS — раньше дефолт был
  // FALSE и фича пропадала в dev/preview-сборках без EXPO_PUBLIC_EXPLAIN_ENABLED).
  // Firestore-override (админ «Пульт») может экстренно выключить её у всех живьём.
  // Раздел «Идеи» (пользователь присылает идею → год полного доступа при одобрении).
  // Дефолт FALSE = sell-switch: это акция с дорогой наградой (год премиума), поэтому
  // раздел скрыт, пока админ намеренно не включит его в «Пульте». Выключение прячет
  // раздел у всех живьём (onSnapshot), без релиза — уже поданные идеи в админ-очереди
  // остаются, и адмін может их закрыть.
  // ai_global_disable — ГЛАВНЫЙ рубильник ВСЕГО ИИ (Компас, «объясни», разбор
  // ошибок, диалоги, комментарий дня). Дефолт FALSE = ИИ
  // работает как сейчас. Админ ставит TRUE в «Пульте» → у всех живьём (onSnapshot):
  //  • ручные вызовы ИИ показывают забавную плашку/экран-заглушку (Компас «отдыхает»);
  //  • фоновые/авто-вызовы просто не запускаются — юзер ничего не видит.
  // Это НАД-флаг: перекрывает compass_enabled/explain_enabled и т.д. Сервер тоже
  // уважает его (aiGloballyDisabled в functions) — клиентский гейт нельзя обойти.
  // Режим обслуживания (управляется из «Пульта»). Дефолт FALSE — приложение
  // работает. banner = мягкая плашка сверху; block = жёсткий полноэкранный
  // блок-экран. Включается у всех живьём (onSnapshot), без релиза.
  maintenance_banner: false,
  maintenance_block: false,
  // Боты в Арене: дефолт TRUE = kill-switch (боты включены как сейчас). Админ
  // ставит false в «Пульте» → бот-фолбэк отключается у всех живьём (onSnapshot),
  // остаётся только реальный матчмейкинг; true возвращает ботов.
  paywall_reviews_enabled: true,
  // Force-update: дефолт FALSE = выключено (страховка). true + версия < min →
  // полноэкранный блок «обнови приложение». Включается из «Пульта» живьём.
  force_update_enabled: false,
  manual_update_enabled: false,
  // По умолчанию режим А: Б включается только явным действием в админке.
  energy_mistake_charge: false,
  // Промо-баннер (акция): дефолт FALSE. Включается из «Пульта» на время акции.
  promo_banner_enabled: false,
  // Промокоды: дефолт FALSE = скрыто в настройках и заблокировано на callable.
  promo_codes_enabled: false,
  // Кнопка «Видео PHRASEMAN» на главной: дефолт TRUE = kill-switch (показывается
  // как сейчас). Админ ставит false в «Пульте» → кнопка прячется у всех живьём.
  video_button_enabled: true,
  video_phrases_enabled: true,
  // Премиум-гейты: дефолт TRUE = фича за премиум-замком (текущее поведение).
  // Админ ставит false в «Пульте» → фича становится бесплатной у всех живьём.
  gate_lessons_premium: true,
  gate_speaking_premium: true,
  gate_ai_dialog_premium: true,
  gate_stats_premium: true,
  gate_flashcards_premium: true,
  gate_themes_premium: true,
  gate_avatar_auras_premium: true,
  gate_mastery_premium: true,
  gate_energy_premium: true,
  gate_arena_premium: true,
  gate_mistake_practice_premium: true,
  gate_extra_languages_premium: true,
  // Бейдж скидки в хедере Главной: дефолт FALSE — виден только когда владелец
  // явно включит его в «Пульте» на время акции.
  discount_offer_banner_enabled: false,
  // Подарок «3 дня полного доступа» новым юзерам: безопасный дефолт false.
  // Админ может явно включить его в «Пульте»; при false
  // новые юзеры больше НЕ получают подарок/модал живьём (onSnapshot), без релиза.
  // Уже выданные подарки не отбираются (гейт только в точке выдачи).
};

const DEFAULT_TEXTS: Record<RemoteTextKey, string> = {
  paywall_reference_prices: '',
  maintenance_ru: '',
  maintenance_uk: '',
  maintenance_es: '',
  compass_voice_fallback_ru: '',
  compass_voice_fallback_uk: '',
  compass_voice_fallback_es: '',
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
  discount_offer_badge_percent: '',
  maintenance_campaign_id: '',
  compass_copy_overrides: '',
  youtube_channel_id: '',
  youtube_channel_handle: '',
  youtube_channel_name: '',
  youtube_channel_url: '',
  youtube_pinned_videos: '',
  onboarding_enabled_steps_v1: '',
};

// Reasonable guard rails so a fat-fingered admin value can't brick the app.
const NUMBER_BOUNDS: Record<RemoteNumberKey, { min: number; max: number }> = {
  // Product invariant (PM-081, D06/D07): capacity is exactly 5, no bonuses.
  // PM-083 (D06): интервал фиксирован — пульт не ускоряет и не замедляет.
  onboarding_ab_welcome_pct: { min: 0, max: 100 },
  onboarding_ab_builder_pct: { min: 0, max: 100 },
  paywall_v2_pct: { min: 0, max: 100 },
  auth_link_cache_ttl_ms: { min: 60_000, max: 30 * 24 * 60 * 60 * 1000 },
  phone_state_cutover_percent: { min: 0, max: 100 },
  app_messages_feed_rev: { min: 0, max: Number.MAX_SAFE_INTEGER },
  global_broadcast_rev: { min: 0, max: Number.MAX_SAFE_INTEGER },
  home_survey_rev: { min: 0, max: Number.MAX_SAFE_INTEGER },
};

const ENV_NUMBER_KEYS: Partial<Record<RemoteNumberKey, string | undefined>> = {
  onboarding_ab_welcome_pct: process.env.EXPO_PUBLIC_ONBOARDING_AB_WELCOME,
  onboarding_ab_builder_pct: process.env.EXPO_PUBLIC_ONBOARDING_AB_BUILDER,
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
  const bounded = Math.max(min, Math.min(max, value));
  return key === 'phone_state_cutover_percent' ? Math.round(bounded) : bounded;
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
  // Server authority is intentionally limited to sync, updates, video,
  // promo/payment, and premium entitlement. All other product decisions stay
  // local even if legacy keys are still present in an old Firestore document.
  const allowedNumbers = new Set<RemoteNumberKey>([
    'auth_link_cache_ttl_ms', 'phone_state_cutover_percent', 'paywall_v2_pct',
    'app_messages_feed_rev', 'global_broadcast_rev', 'home_survey_rev',
  ]);
  const allowedBools = new Set<RemoteBoolKey>([
    'phone_state_shadow_enabled', 'phone_state_sync_enabled', 'phone_state_emergency_stop',
    'force_update_enabled', 'manual_update_enabled', 'video_button_enabled', 'video_phrases_enabled',
    'energy_mistake_charge', 'speaking_strict_check_enabled',
    'promo_banner_enabled', 'promo_codes_enabled', 'discount_offer_banner_enabled',
    'lifetime_button_enabled', 'paywall_reviews_enabled', 'accounts_v2_client_enabled',
    'accounts_v2_legacy_sync_disabled',
    'gate_lessons_premium', 'gate_speaking_premium', 'gate_ai_dialog_premium', 'gate_stats_premium',
    'gate_flashcards_premium', 'gate_themes_premium', 'gate_avatar_auras_premium', 'gate_mastery_premium',
    'gate_energy_premium', 'gate_arena_premium', 'gate_mistake_practice_premium', 'gate_extra_languages_premium',
  ]);
  const allowedTexts = new Set<RemoteTextKey>([
    'min_app_version', 'store_url_ios', 'store_url_android', 'manual_update_campaign_id',
    'paywall_reference_prices',
    'manual_update_mode', 'manual_update_target_build', 'manual_update_platform',
    'manual_update_title_ru', 'manual_update_title_uk', 'manual_update_title_es',
    'manual_update_body_ru', 'manual_update_body_uk', 'manual_update_body_es',
    'manual_update_cta_ru', 'manual_update_cta_uk', 'manual_update_cta_es',
    'promo_banner_text_ru', 'promo_banner_text_uk', 'promo_banner_text_es', 'promo_banner_url',
    'promo_banner_until', 'promo_banner_campaign_id', 'promo_banner_audience', 'promo_banner_platform',
    'discount_offer_badge_percent', 'youtube_channel_id', 'youtube_channel_handle',
    'youtube_channel_name', 'youtube_channel_url', 'youtube_pinned_videos',
  ]);
  const nextNumbers: Partial<Record<RemoteNumberKey, number>> = {};
  const nextBools: Partial<Record<RemoteBoolKey, boolean>> = {};
  const nextTexts: Partial<Record<RemoteTextKey, string>> = {};

  for (const key of Object.keys(DEFAULT_NUMBERS) as RemoteNumberKey[]) {
    if (!allowedNumbers.has(key)) continue;
    const raw = snapshot.numbers?.[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      nextNumbers[key] = clampNumber(key, raw);
    }
  }
  for (const key of Object.keys(DEFAULT_FLAGS) as RemoteBoolKey[]) {
    if (!allowedBools.has(key)) continue;
    const raw = snapshot.bools?.[key];
    if (typeof raw === 'boolean') nextBools[key] = raw;
  }
  for (const key of Object.keys(DEFAULT_TEXTS) as RemoteTextKey[]) {
    if (!allowedTexts.has(key)) continue;
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
      const baseFlag = k.slice(0, -ROLLOUT_SUFFIX.length) as RemoteBoolKey;
      if (!allowedBools.has(baseFlag)) continue;
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

export function assignPhoneStateCohort(stableUid: string, configuredPercent: number): boolean {
  const percent = Math.round(Math.max(0, Math.min(100, Number.isFinite(configuredPercent)
    ? configuredPercent
    : 0)));
  return isInRolloutBucket(stableUid, 'phone-state-cutover-v1', percent);
}

export function getRemoteConfigSignature(): string {
  return _configSignature;
}

export function hasRemoteConfigSnapshotApplied(): boolean {
  return _remoteConfigSnapshotApplied;
}

// ── Convenience accessors (typed, self-documenting call sites) ──────────────

export const getPaywallV2Pct = () => 100;
export const getAuthLinkCacheTtlMs = () => getRemoteNumber('auth_link_cache_ttl_ms');
/** Стоимость заморозки серии в осколках (было FREEZE_COST_SHARDS=10). Дефолт 10. */
export const isReferralEnabled = () => true;
export const isReferralRouletteEnabled = () => true;
export const isReferralRouletteEmergencyStopped = () => false;

export function getSoftUpsellEnabledByTrigger(): Record<SoftUpsellTrigger, boolean> {
  return {
    first_lesson: true,
    free_lessons_complete: true,
    weekly_review: false,
    second_ai_dialogue: false,
    streak_milestone: false,
  };
}
// зачем (решение владельца 12.10, журнал п.81(14)): журнал диагностики в обращении в поддержку включён в R1 — пишется на устройстве (24 ч, ≤200 записей),
// уходит только вместе с явно отправленным обращением; политика описывает это (legal/privacy_policy_en*.json).
export const isSupportDiagnosticsEnabled = () => true;
/** Боты-соперники в Арене (бот-фолбэк при пустой очереди). Дефолт true. */
export const isPaywallReviewsEnabled = () => true;
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
export const isVideoPhrasesEnabled = () => getRemoteBool('video_phrases_enabled');
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
export const isPromoBannerEnabled = () => false;
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

// ── Угловой/хедерный бейдж скидки (Главная) ─────────────────────────────────
/** Включён ли бейдж скидки в хедере Главной. Дефолт false. */
export const isDiscountOfferBadgeEnabled = () => false;
/**
 * Готовая подпись бейджа, например "−50%". Парсит только целое число 1..99 из
 * discount_offer_badge_percent; любой мусор/пусто/диапазон вне 1..99 → ''
 * (бейдж тогда не рендерится, см. HomeDiscountBadge — лучше молчать, чем
 * показать неверный процент).
 */
export function getDiscountOfferBadgeLabel(): string {
  const raw = getRemoteText('discount_offer_badge_percent').trim();
  if (!raw) return '';
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n) || n < 1 || n > 99) return '';
  return `−${n}%`;
}
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

/** Phraseman Pro показывается как раскрываемая разовая покупка. Дефолт true. */
export const isLifetimeButtonEnabled = () => getRemoteBool('lifetime_button_enabled');
/** Раздел «Идеи» в настройках (год премиума за идею). Дефолт false — sell-switch. */
/**
 * Подарок «3 дня полного доступа» новым юзерам (72ч intro). Дефолт false:
 * новые юзеры не получают ни подарок, ни приветственный модал. Включение из
 * «Пульта» действует только на будущие выдачи; уже выданные подарки не отбираются.
 * Гейт применяется в app/intro_full_access.ts (точка выдачи).
 */
/**
 * Глобальный рубильник всего ИИ. TRUE = весь ИИ выключен (ручные вызовы → забавная
 * заглушка, фоновые → тихо no-op). Это НАД-флаг: все ИИ-геттеры ниже уважают его.
 */
/** Режим обслуживания: мягкий баннер / жёсткий блок-экран. */
export const isMaintenanceBanner = () => false;
export const isMaintenanceBlock = () => false;
export const getMaintenanceCampaignId = () => getRemoteText('maintenance_campaign_id');

// ── Премиум-гейты фич ───────────────────────────────────────────────────────
// true = фича за премиум-замком (дефолт), false = бесплатна для всех. Используются
// через app/feature_gates.ts (isFeatureFreeForEveryone). Прямые геттеры на случай
// точечной проверки.
export const isLessonsPremiumGated = () => getRemoteBool('gate_lessons_premium');
export const isSpeakingPremiumGated = () => getRemoteBool('gate_speaking_premium');
export const isAiDialogPremiumGated = () => getRemoteBool('gate_ai_dialog_premium');
export const isStatsPremiumGated = () => getRemoteBool('gate_stats_premium');
export const isFlashcardsPremiumGated = () => getRemoteBool('gate_flashcards_premium');
export const isThemesPremiumGated = () => getRemoteBool('gate_themes_premium');
export const isMasteryPremiumGated = () => getRemoteBool('gate_mastery_premium');
export const isEnergyPremiumGated = () => getRemoteBool('gate_energy_premium');

/** Локализованный текст режима обслуживания (ru/uk/es; пусто = дефолт компонента). */
export function getMaintenanceText(lang: string): string {
  const l = String(lang || '').toLowerCase();
  if (l.startsWith('uk')) return getRemoteText('maintenance_uk');
  if (l.startsWith('es')) return getRemoteText('maintenance_es');
  return getRemoteText('maintenance_ru');
}

export type OnboardingAbVariant = 'current';

/**
 * Deprecated onboarding A/B compatibility helper. The old branches
 * branches are retired; all users enter the current onboarding.
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
