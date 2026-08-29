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

/**
 * Real App Attest / Play Integrity mode is independent from store UI/revenue gates.
 * Store-installed QA builds can keep dev tools while still requiring real attestation.
 */
export const APP_CHECK_REAL_ATTESTATION_ENABLED =
  IS_STORE_RELEASE || process.env.EXPO_PUBLIC_APP_CHECK_REAL_ATTESTATION === '1';

/** true только в реальном dev-рантайме Metro (не preview, не стор). */
const IS_DEV_RUNTIME = typeof __DEV__ !== 'undefined' && __DEV__;

// true  = явный локальный UI-preview Premium (серверные AI-функции его не принимают)
// false = обычный флоу RevenueCat, в том числе в стандартной dev-сборке
//
// ⚠️ ПРЕДОХРАНИТЕЛЬ: даже если кто-то впишет здесь «голый» true, итог
// принудительно гасится в стор-сборке (&& !IS_STORE_RELEASE). Поэтому Premium
// НИКОГДА не раздаётся всем бесплатно в проде, что бы ни оставила dev-сессия.
// История: 1d659478 (08.06) случайно увёз сюда `= true` («TEMP dev-check») в
// большом cleanup-коммите. Тест tests/force_premium_prod_guard.test.ts держит
// этот инвариант. Для локального теста премиума меняй ТОЛЬКО левый операнд.
const FORCE_PREMIUM_DEV_INTENT = false;
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
 * OWNER LOCK (2026-08-10): турниры законсервированы и не являются частью
 * приложения. Ни Remote Config, ни dev-сборка, ни админское расписание не могут
 * включить их. Возврат требует прямого решения владельца и изменения исходника.
 */
export const ENABLE_TOURNAMENTS: false = false;

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
 * Dev-preview paywall / dev-осколки без Google Play (см. paywall_purchase, shards_shop).
 * Для Premium этот флаг только отключает реальный магазин: entitlement он не выдаёт.
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
 * DEV-ONLY, ВРЕМЕННО (владелец, 2026-08-28): пока авторы Learning V2 пишут
 * испанские сессии быстрее, чем для них генерируется bundled-озвучка,
 * звуковые задания (listen_choose/listen_build_dictation/scripted_repeat_
 * compare) внутри написанной, но ещё не озвученной сессии показываются БЕЗ
 * звука — задание остаётся текстовым/интерактивным, а его audioTargetIds
 * обнуляются ДО прохождения аудио-гейта. Это не обход крипто-контракта
 * (course_session_audio_child_v1.ts): для сессии без единого audioTargetId
 * гейт `needsAudio` сам по себе не срабатывает, значит подписанные mp3
 * по-прежнему не подделываются — их просто не требуют.
 *
 * зачем именно так, а не заглушки в аудио-чайлде: schema там жёстко
 * фиксирует count/fingerprint для каждого interactionId с audioTargetIds —
 * пустая заглушка проваливает validate() (см. комментарий в
 * bundledLearningV2CourseSessionMaterialV3, инцидент с испанской сессией 2).
 *
 * ⚠️ ВЛАДЕЛЕЦ ЛИЧНО СКАЖЕТ «конец периода разработки» — тогда этот флаг
 * убрать целиком (не просто выключить), а сессии либо получат настоящую
 * озвучку и попадут в ES_BUNDLED_AUDIO_SESSIONS, либо останутся закрытыми
 * потолком, как раньше. До этого момента флаг живёт только в dev-сборке
 * (`!IS_STORE_RELEASE` гасит его в сторе так же, как ENABLE_DEV_TOOLS).
 */
export const DEV_LEARNING_V2_AUDIOLESS_SESSIONS_INTENT = true;
export const DEV_LEARNING_V2_AUDIOLESS_SESSIONS =
  DEV_LEARNING_V2_AUDIOLESS_SESSIONS_INTENT && DEV_MODE && !IS_STORE_RELEASE;

/**
 * Анимации переходов между экранами (slide вместо мгновенного появления/fade).
 *
 * OWNER UPDATE (2026-08-25): production-навигация обязана реагировать мгновенно.
 * Переходы разрешены только как явный локальный dev-preview и никогда не могут
 * быть включены переменной окружения в store-сборке.
 *
 * История риска (сохранена намеренно): режим годами стоял выключенным, потому что
 * card-push slide ронял Android/Fabric на вложенных экранах и Back. С тех пор
 * фактура изменилась — modal-анимации того же нативного стека (slide_from_bottom)
 * годами едут на ОБЕИХ платформах у пейволов (paywallShared.tsx) и шторок разделов
 * (section_sheet_navigation.ts) без крашей, и туда же уехал fade на Android.
 * То есть проблема была не в «любой анимации», а в конкретной старой связке.
 *
 * DEV OPT-IN: EXPO_PUBLIC_SCREEN_TRANSITIONS=1. Без явной единицы — `none`.
 */
export const ENABLE_SCREEN_TRANSITIONS = !IS_STORE_RELEASE && process.env.EXPO_PUBLIC_SCREEN_TRANSITIONS === '1';

/**
 * Мягкий fade (~140мс) между экранами стека ВМЕСТО мгновенного 'none'.
 *
 * Зачем: при animation:'none' native-stack переключает контейнер мгновенно,
 * до того как JS дорендерил тяжёлый экран — в зазоре виден голый фон
 * контейнера («чёрный кадр»). Fade маскирует этот зазор.
 *
 * Только явный local dev-preview: EXPO_PUBLIC_SCREEN_FADE=1. Production hard-off.
 */
export const SCREEN_FADE_TRANSITIONS = !IS_STORE_RELEASE && process.env.EXPO_PUBLIC_SCREEN_FADE === '1';

/**
 * Legacy dev-preview intent для совместимости конфигурации. Production hard-off;
 * текущий section-sheet policy дополнительно фиксирует `none` независимо от флага.
 */
export const SECTION_SHEET_TRANSITIONS = !IS_STORE_RELEASE && process.env.EXPO_PUBLIC_SECTION_SHEET_TRANSITIONS === '1';

/**
 * Spanish interface/explanation locale.
 *
 * This is a source/UI language for learning English. It is intentionally
 * separate from the dev-only "study Spanish" experiment below.
 *
 * Включено: испанский интерфейс прошёл релизный аудит вместе с остальными
 * зарегистрированными языками интерфейса. Флаг сохранён для обратной
 * совместимости старых импортов; готовность всех языков задаётся единым
 * списком в constants/i18n.ts.
 */
export const SPANISH_UI_LOCALE_ENABLED = true;

/**
 * English interface locale — pure UI language, deliberately NOT part of
 * SourceLocale/source_locales.ts (see app/source_locales.ts comment: that
 * list gates CONTENT locales — quizzes, exam packs, idiom/verb data — and
 * none of those have English source content yet). English as an interface
 * language only translates UI chrome; lesson/quiz content stays on whatever
 * source language the learner already has (ru/uk/etc.).
 *
 * зачем: ОТКАЧЕНО ОБРАТНО 2026-08-27 — включение уронило прод (Студия
 * аватаров крашилась: `STUDIO_COPY[lang]` и другие Record<Lang,...>-словари
 * без `en`-ключа давали undefined). `triLang()` был безопасен (фолбэк), но
 * ~16+ мест читают словари напрямую по индексу без фолбэка — их ещё не
 * починили. НЕ включать снова, пока все прямые Record<Lang,...>-словари не
 * получат ключ `en` и это не будет реально проверено (не только tsc — он
 * падал по памяти на полном прогоне и давал ложное "0 ошибок").
 */
export const ENGLISH_UI_LOCALE_ENABLED = false;

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
// version.json: { "versionCode": N, "message": "…" }.
// This remote manifest lets already installed builds discover a newer store release.
export const UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/badloar-star/phraseman-version/main/version.json';

// ── Разовый бонус осколков за волну релиза — ОТКЛЮЧЁН (0 = никогда не показывать).
// android.versionCode / ios.buildNumber для справки синхронизировали с волнами, когда фича была активна.
// ВНИМАНИЕ перед повторным включением (VERSION>0, SHARDS>0): production-хоста
// на cold-start сейчас НЕТ. Без подключения
// модалки к арбитру (слот в OVERLAY_PRIORITY + useOverlayVisible) бонус начислится «втихую»
// или не покажется. Сначала верни хост, потом поднимай версию (аудит #11).
export const RELEASE_WAVE_BONUS_VERSION = 0;
export const RELEASE_WAVE_BONUS_SHARDS = 0;

// Минимальный балл для разблокировки следующего урока
export const MIN_LESSON_SCORE = 4.5;

// Максимум XP за один диалог
export const MAX_DIALOG_XP = 10;

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
