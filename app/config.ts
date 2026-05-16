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

export const DEV_MODE = false;

// true  = премиум включён для всех по умолчанию (тестовая сборка для тестеров)
// false = обычный флоу RevenueCat
export const FORCE_PREMIUM = false;

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
 * EAS profile `production` в eas.json: EXPO_PUBLIC_STORE_RELEASE=1.
 * Метка публичной стор-сборки: флаги вроде DEV_MODE не отключают настоящий IAP.
 */
export const IS_STORE_RELEASE = process.env.EXPO_PUBLIC_STORE_RELEASE === '1';

/**
 * Single switch for visible/internal dev tooling.
 * Keep this tied to Metro's literal __DEV__ so buttons and routes cannot be
 * enabled by DEV_MODE in production or preview runtimes.
 */
export const ENABLE_DEV_TOOLS =
  typeof __DEV__ !== 'undefined' && __DEV__ && !IS_STORE_RELEASE;

/**
 * Ставка осколками на следующий рейтинг-матч арены (очередь «Найти матч»).
 * Включено во всех сборках, включая стор.
 */
export const ENABLE_ARENA_RANKED_WAGER = true;

/**
 * Мгновенный «премиум» / dev-осколки без Google Play (см. premium_modal, shards_shop).
 * false в EAS production при EXPO_PUBLIC_STORE_RELEASE=1, даже если в коде DEV_MODE=true.
 */
export const DEV_IAP_BYPASS = DEV_MODE && !IS_STORE_RELEASE;

/** Испанский UI (`es`): только development; в прод-сборках выключен до готовности. */
export const ENABLE_SPANISH_LOCALE =
  typeof __DEV__ !== 'undefined' && __DEV__;

/**
 * DEV-only: в настройках можно выбрать язык, который учишь (EN / ES).
 * В production-бандле `__DEV__ === false` — код не активен. Не синкается в облако.
 */
export const ENABLE_DEV_STUDY_TARGET_LANG =
  typeof __DEV__ !== 'undefined' && __DEV__;

// ── Store links ───────────────────────────────────────────────────────────────
export const STORE_URL_IOS     = 'https://apps.apple.com/app/id6764800879';
export const STORE_URL_ANDROID = 'https://play.google.com/store/apps/details?id=app.phraseman';
export const STORE_URL = Platform.OS === 'ios' ? STORE_URL_IOS : STORE_URL_ANDROID;

/** Публичные юридические страницы на сайте студии (вне приложения). */
export const KNOWLY_LEGAL_PRIVACY_URL = 'https://knowlyapps.com/legal/privacy/';
export const KNOWLY_LEGAL_TERMS_URL = 'https://knowlyapps.com/legal/terms/';

// ── Update check ──────────────────────────────────────────────────────────────
// version.json: { "versionCode": N, "message": "…" }. Пустая строка = проверка отключена.
export const UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/badloar-star/phraseman-version/main/version.json';

// ── Разовый бонус осколков за волну релиза — ОТКЛЮЧЁН (0 = никогда не показывать).
// android.versionCode / ios.buildNumber для справки синхронизировали с волнами, когда фича была активна.
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
