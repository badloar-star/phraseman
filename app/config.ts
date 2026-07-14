// ════════════════════════════════════════════════════════════════════════════
// config.ts — Глобальные константы приложения
// Перед релизом: DEV_MODE = false
// ════════════════════════════════════════════════════════════════════════════

// ── ИДЕИ ДЛЯ БУДУЩИХ ВЕРСИЙ ─────────────────────────────────────────────────
//
// [ЛИЧНЫЙ ПЛАН] — onboarding при первом запуске
//   Спросить: цель (туризм/работа/эмиграция), текущий уровень, минут в день.
//   Показать план: "15 мин/день → B1 через 60 дней". Повышает retention.
//   Сложность: средняя. Приоритет: высокий (делать до/после релиза).
//
// [БУСТЕРЫ] — x2 XP на 30 минут
//   Пользователь смотрит рекламу или тратит монеты — получает буст XP.
//   Показывать предложение после завершения урока или в экране статистики.
//   Сложность: средняя. Приоритет: высокий (монетизация).
//
// [МОНЕТЫ] — отдельная валюта вместо трат XP
//   Сейчас XP используется в пари — конфликт роста и траты.
//   Монеты фармятся отдельно (за уроки, серии), тратятся на бустеры/страховку цепочки.
//   XP только растёт, монеты — расходуемые.
//   Сложность: большой рефакторинг экономики. Делать после релиза.
//
// [ЖИЗНИ] — 5 ошибок → пауза или платишь
//   Дуолинго-механика, хорошо монетизируется.
//   НЕ делать на раннем этапе — убивает retention до появления платящей аудитории.
//   Делать когда DAU > 1000.
//
// [СЕЗОНЫ] — 30-дневные сезоны с отдельным рейтингом и наградами
//   Каждый месяц новая тема (бизнес / путешествия / повседневная жизнь).
//   Все стартуют с нуля — мотивирует вернувшихся.
//   Эффективно только при активном комьюнити. Делать когда есть конкуренция в лидерборде.
//
// [ДЕРЕВО НАВЫКОВ] — карта английского по темам вместо линейного списка уроков
//   Большой редизайн навигации. Визуально привлекательно, но огромный объём работы.
//   Делать в версии 2.0.
//
// ─────────────────────────────────────────────────────────────────────────────

// true  = всё открыто (для проверки Google Play)
// false = premium gates активны (включить в следующем обновлении)
// ── Expo Go detection ─────────────────────────────────────────────────────────
// ВАЖНО: executionEnvironment === 'storeClient' возвращает true и для Expo Go,
// и для EAS Development Builds в Expo SDK 50+. Корректное определение Expo Go:
// appOwnership === 'expo'. Development builds имеют appOwnership === null.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const DEV_MODE = true;

/**
 * EAS profile `production` в eas.json: EXPO_PUBLIC_STORE_RELEASE=1.
 * Метка публичной стор-сборки: dev-флаги (DEV_MODE, FORCE_PREMIUM…) не должны
 * влиять на настоящий IAP. Объявлено РАНО — другие предохранители ниже на него
 * опираются.
 */
export const IS_STORE_RELEASE = process.env.EXPO_PUBLIC_STORE_RELEASE === '1';
export const TESTFLIGHT_DEV_TOOLS = process.env.EXPO_PUBLIC_TESTFLIGHT_DEV_TOOLS === '1';

/** true только в реальном dev-рантайме Metro (не preview, не стор). */
const IS_DEV_RUNTIME = typeof __DEV__ !== 'undefined' && __DEV__;

// true  = премиум включён для всех по умолчанию (тестовая сборка для тестеров)
// false = обычный флоу RevenueCat
//
// ⚠️ ПРЕДОХРАНИТЕЛЬ: даже если кто-то впишет здесь «голый» true, итог
// принудительно гасится в стор-сборке (&& !IS_STORE_RELEASE). Поэтому Premium
// НИКОГДА не раздаётся всем бесплатно в проде, что бы ни оставила dev-сессия.
// История: 1d659478 (08.06) случайно увёз сюда `= true` («TEMP dev-check») в
// большом cleanup-коммите. Тест tests/force_premium_prod_guard.test.ts держит
// этот инвариант. Для локального теста премиума меняй ТОЛЬКО левый операнд.
const FORCE_PREMIUM_DEV_INTENT = true;
export const FORCE_PREMIUM = FORCE_PREMIUM_DEV_INTENT && IS_DEV_RUNTIME && !IS_STORE_RELEASE;

// ── Синхронизация прогресса с Firebase ───────────────────────────────────────
// false = синхронизация отключена (AsyncStorage only, текущее состояние)
// true  = включить ПОСЛЕ установки пакетов:
//         npm install @react-native-firebase/auth @react-native-firebase/firestore
export const CLOUD_SYNC_ENABLED = true;

// true  = показывать бета-экран с инструкциями для тестеров
// false = продакшн, бета-экран пропускается
export const IS_BETA_TESTER = false;
export const IS_EXPO_GO = Constants.appOwnership === 'expo';

/**
 * Single switch for visible/internal dev tooling.
 * Store builds stay hard-gated by EXPO_PUBLIC_STORE_RELEASE=1; local QA builds
 * can also opt in through DEV_MODE when Metro's literal __DEV__ is unavailable.
 */
export const ENABLE_DEV_TOOLS =
  ((typeof __DEV__ !== 'undefined' && __DEV__) || DEV_MODE || TESTFLIGHT_DEV_TOOLS) && !IS_STORE_RELEASE;

/**
 * Ставка осколками на следующий рейтинг-матч арены (очередь «Найти матч»).
 * Включено во всех сборках, включая стор.
 */
export const ENABLE_ARENA_RANKED_WAGER = true;

/**
 * One-shot Arena matchmaking control deadlines with foreground reconciliation.
 */
export const ENABLE_ARENA_MATCHMAKING_CONTROL_CLOCK = true;

/**
 * Карточка профиля — лестница из 5 уровней за осколки (публичный статус: бейдж уровня
 * у имени в списках, прокачанная карточка в профиле, новые блоки статистики по уровням).
 *
 * РЕШЕНИЕ 2026-07-05 (владелец): фича В РЕЛИЗЕ. Старый холд 2026-06-21 («превью уровней
 * визуально мало отличаются») закрыт редизайном: у каждого уровня свой визуал, свой
 * живой эффект и свой новый блок информации (см. app/profile_card_system.ts).
 *
 * Выключать — только осознанным решением владельца: менять на false вместе с
 * tests/profile_card_upgrade_dev_gate.test.ts (контракт фиксирует `= true`). Улучшение
 * выполняется внутри PlayerProfileModal; отдельного маршрута для карточки больше нет.
 */
export const ENABLE_PROFILE_CARD = true;

/**
 * Мгновенный «премиум» / dev-осколки без Google Play (см. premium_modal, shards_shop).
 * false в EAS production при EXPO_PUBLIC_STORE_RELEASE=1, даже если в коде DEV_MODE=true.
 */
export const DEV_IAP_BYPASS = DEV_MODE && !IS_STORE_RELEASE;

/**
 * Production-safe замена «голому» DEV_MODE в КОНТЕНТ-гейтах (уроки, квизы, экзамен,
 * темы оформления, dev-маркет карточек, лидерборды).
 *
 * История: эти гейты читали голый `DEV_MODE` (всегда =true в коде) БЕЗ `!IS_STORE_RELEASE`,
 * поэтому «всё открыто для проверки Google Play» физически уезжало в стор-сборку и
 * раздавало платный контент бесплатно. Этот флаг гасится в стор-сборке так же, как
 * FORCE_PREMIUM / DEV_IAP_BYPASS / ENABLE_DEV_TOOLS — что бы ни оставила dev-сессия в
 * DEV_MODE, в проде (EXPO_PUBLIC_STORE_RELEASE=1) пейволы остаются закрытыми.
 *
 * В dev-сборке поведение идентично прежнему DEV_MODE (всё открыто для удобства QA).
 * Инвариант держит tests/dev_content_unlock_prod_guard.test.ts.
 */
export const DEV_CONTENT_UNLOCK = DEV_MODE && !IS_STORE_RELEASE;

/**
 * Анимации переходов между экранами (slide/fade вместо мгновенного появления).
 *
 * ПО УМОЛЧАНИЮ ВЫКЛЮЧЕНО. Причина: native-stack transitions ранее роняли
 * Android/Fabric на открытии вложенных экранов и Back (см. _layout.tsx screenOptions).
 * Включается ТОЛЬКО осознанно через EXPO_PUBLIC_SCREEN_TRANSITIONS=1 ПОСЛЕ
 * проверки на реальном Android-устройстве (открытие/закрытие/Back на всех табах
 * и вложенных экранах). При выключенном флаге поведение идентично текущему.
 */
export const ENABLE_SCREEN_TRANSITIONS = process.env.EXPO_PUBLIC_SCREEN_TRANSITIONS === '1';

/**
 * Мягкий fade (~140мс) между экранами стека ВМЕСТО мгновенного 'none'.
 *
 * Зачем: при animation:'none' native-stack переключает контейнер мгновенно,
 * до того как JS дорендерил тяжёлый экран — в зазоре виден голый фон
 * контейнера («чёрный кадр»). Fade маскирует этот зазор.
 *
 * Применяется ТОЛЬКО на iOS (гейт по Platform в _layout.tsx): исторические
 * краши Android/Fabric были на native-stack transitions, поэтому Android
 * остаётся на 'none' + константный фон стека (см. contentStyle в _layout),
 * пока fade не проверен вручную на реальном Android-устройстве.
 * Kill-switch: EXPO_PUBLIC_SCREEN_FADE=0. Не влияет на ENABLE_SCREEN_TRANSITIONS
 * (это отдельный «полный» slide-режим, приоритетнее fade).
 */
export const SCREEN_FADE_TRANSITIONS = process.env.EXPO_PUBLIC_SCREEN_FADE !== '0';

/**
 * Spanish interface/explanation locale.
 *
 * This is a source/UI language for learning English. It is intentionally
 * separate from the dev-only "study Spanish" experiment below.
 *
 * Выключено: ES (как и весь Heisenberg batch) пока недопереведён и падает в
 * русский фолбэк. В проде показываем только готовые ru/uk. Включить обратно
 * вместе с переносом 'es' в ACTIVE_INTERFACE_SOURCE_LOCALES, когда перевод готов.
 */
export const SPANISH_UI_LOCALE_ENABLED = false;

/**
 * DEV-only: в настройках RU/UK можно выбрать язык, который учишь.
 * ES оставлен как существующая dev-кнопка, FR добавляется отдельным target.
 * В production-бандле `__DEV__ === false` — код не активен. Не синкается в облако.
 */
export const ENABLE_DEV_STUDY_TARGET_LANG =
  ((typeof __DEV__ !== 'undefined' && __DEV__) || DEV_MODE || TESTFLIGHT_DEV_TOOLS) && !IS_STORE_RELEASE;

// ── Store links ───────────────────────────────────────────────────────────────
export const STORE_URL_IOS     = 'https://apps.apple.com/app/id6764800879';
export const STORE_URL_ANDROID = 'https://play.google.com/store/apps/details?id=app.phraseman';
export const STORE_URL = Platform.OS === 'ios' ? STORE_URL_IOS : STORE_URL_ANDROID;

/** Публичные юридические страницы на сайте студии (вне приложения). */
export const KNOWLY_LEGAL_PRIVACY_URL = 'https://knowlyapps.com/legal/privacy/';
export const KNOWLY_LEGAL_TERMS_URL = 'https://knowlyapps.com/legal/terms/';

// ── Update check ──────────────────────────────────────────────────────────────
// version.json: { "versionCode": N, "message": "…" }. Пустая строка = проверка отключена.
// ОТКЛЮЧЕНО: модал «Это Компас. У меня кое-что новое» (UpdateModal) больше не показываем.
// Пустой URL → checkForUpdate() сразу возвращает null, модал не рендерится (см. app/update_check.ts).
// Чтобы вернуть проверку — впиши URL обратно и подними versionCode в репо phraseman-version.
export const UPDATE_CHECK_URL = '';

// ── Разовый бонус осколков за волну релиза — ОТКЛЮЧЁН (0 = никогда не показывать).
// android.versionCode / ios.buildNumber для справки синхронизировали с волнами, когда фича была активна.
// ВНИМАНИЕ перед повторным включением (VERSION>0, SHARDS>0): ReleaseWaveBonusModal сейчас
// смонтирован ТОЛЬКО в admin-превью, в проде хоста на cold-start НЕТ. Без подключения
// модалки к арбитру (слот в OVERLAY_PRIORITY + useOverlayVisible) бонус начислится «втихую»
// или не покажется. Сначала верни хост, потом поднимай версию (аудит #11).
export const RELEASE_WAVE_BONUS_VERSION = 0;
export const RELEASE_WAVE_BONUS_SHARDS = 0;

/** Окно принятия матча в лобби / тосте «соперник найден» (мс). Должно совпадать с Cloud Function `acceptDeadlineAt`. */
export const ARENA_LOBBY_ACCEPT_MS = 15_000;
// ── Арена: бот-фолбэк при пустой очереди (ранний этап, мало DAU) ─────────────
// Если за окно [BOT_FALLBACK_MIN_MS, BOT_FALLBACK_MAX_MS] не нашёлся реальный
// соперник — клиент создаёт локальную бот-сессию (sessionId="bot_..."). Бот
// идёт в рейтинг как обычный матч (см. arena_results.tsx isMockSession ветка).
// Серверные коллекции (arena_sessions, match_history) для бот-матчей не
// создаются — только клиентский write в arena_profiles.
// Живой соперник из CF всегда перебивает по подписке; пока в очереди есть другие
// игроки — клиент может отложить бота (см. MatchmakingContext).
// Чтобы выключить: BOT_FALLBACK_ENABLED = false (ребилд не нужен в дев-сборке,
// но в production — релиз).
export const BOT_FALLBACK_ENABLED = true;
/** Случайная задержка до бота при «Найти матч» (не «Ещё раз»): в первые ~40 с; живой соперник и отложка при других в очереди — как раньше. */
export const BOT_FALLBACK_MIN_MS = 8_000;
export const BOT_FALLBACK_MAX_MS = 40_000;
/**
 * «Ещё раз»: случайная задержка до бота от min до max (мс, включительно),
 * внутри этого окна живой соперник всё ещё может перебить. Не «ровно через 10 с».
 */
export const ARENA_PLAY_AGAIN_BOT_MIN_MS = 1;
export const ARENA_PLAY_AGAIN_BOT_MAX_MS = 10_000;

// Минимальный балл для разблокировки следующего урока
export const MIN_LESSON_SCORE = 4.5;

// Максимум XP за один диалог
export const MAX_DIALOG_XP = 10;

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
