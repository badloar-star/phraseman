import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
// зачем: allowFontScaling={false} отключал системный размер шрифта — заголовки
// обрезались при крупном шрифте и на длинных языках. FlowText переносит.
import { FlowText } from '../../components/text-integrity';
import { isPromoBannerEnabled, isDiscountOfferBadgeEnabled, getDiscountOfferBadgeLabel } from '../remote_flags';
import { openPremiumPaywall } from '../paywall_navigation';
import HomeDiscountBadge from '../../components/HomeDiscountBadge';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, Dimensions, Modal, AppState, DeviceEventEmitter, InteractionManager, Easing, Platform, type GestureResponderEvent, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type PressableProps, type PressableStateCallbackType, type StyleProp, type TextStyle, type ViewStyle, } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from '../../components/SafeLinearGradient';
import TapScale from '../../components/TapScale';
import { useRouter } from 'expo-router';
import { useGuardedNav } from '../../hooks/use-guarded-nav';
import { usePremium } from '../../components/PremiumContext';
import { useTabNav } from '../TabContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { isLearnTabVisibleForTarget, isLearningSurfaceReady } from '../learning_language_surface_readiness';
import { filterTodayTasksForTarget } from '../today_task_surface_filter';
import { homeVideoRailUsesCatalog, loadHomeVideoRailForTarget, peekHomeVideoRailForTarget } from '../home_video_rail_source';
import ScreenGradient from '../../components/ScreenGradient';
import { glassFill } from '../../components/GlassSurface';
import BouncyScrollView from '../../components/BouncyScrollView';
import { useTopFadeScroll } from '../../components/TopFadeScrollContext';
import { DebugLogger } from '../debug-logger';
import { checkStreakLossPending } from '../hall_of_fame_utils';
import { getLocalDayKey, getUtcDayKey, isSameLocalOrUtcDay } from '../local_date';
import { applyMonthlyPremiumFreezeAllowance } from '../premium_freeze_allowance';
import { consumeCelebration, getPendingCelebrationMarker, getPendingCelebrationVariant, isCelebrationPending, type PremiumCelebrationVariant, } from '../premium_celebration_state';
import { consumeVipCelebration, getPendingVipCelebrationMarker, isVipCelebrationPending } from '../vip_celebration_state';
import PremiumCelebrationModal from '../../components/PremiumCelebrationModal';
import VipCelebrationModal from '../../components/VipCelebrationModal';
import { isLightThemeMode, type ThemeMode } from '../../constants/theme';
import { GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../../constants/goldTheme';
import { OLIVE_GRADIENTS, OLIVE_RICH, oliveShadow } from '../../constants/oliveTheme';
import { configureAccordionLayout } from '../../constants/layoutAnimation';
import { MOTION_DURATION } from '../../constants/motion';
import { HELPFUL_REPORTS_CONFIRMED_KEY, SPECIAL_TITLES, getEarnedSpecialTitles } from '../../constants/titles';
import { GREETINGS_ES } from '../../constants/greetings_es';
import { triLang, type Lang } from '../../constants/i18n';
import {
    buildHomeFeatureTips,
    clampHomeFeatureTipIndex,
    clampHomeFeatureTipReplayCount,
    HOME_FEATURE_TIPS_DONE_KEY,
    HOME_FEATURE_TIPS_INDEX_KEY,
    HOME_FEATURE_TIPS_ON_HOME,
    HOME_FEATURE_TIPS_REPLAY_COUNT_KEY,
    HOME_FEATURE_TIPS_RESET_EVENT,
} from '../home_feature_tips';
import { hapticTap } from '../../hooks/use-haptics';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { coinRankRowForDisplay, isValidCoinRank } from '../coin_rank_table_v1';
import AvatarView from '../../components/AvatarView';
import { checkAchievements, loadAchievementStates } from '../achievements';
import EnergyIcon from '../../components/EnergyIcon';
import {
    createEnergyPopoverRequestGate,
    EnergyInfoPopover,
    type EnergyInfoPopoverAnchor,
} from '../../components/energy/EnergyInfoPopover';
import { StreakChainIcon } from '../../components/StreakChainIcon';
import { loadAllMedals, countMedals } from '../medal_utils';
import DailyPhraseCard from '../../components/DailyPhraseCard';
import SurveyTaskCard from '../../components/SurveyTaskCard';
import SurveySheetModal from '../../components/survey/SurveySheetModal';
import { isDailyPhraseCardHalfVisible } from '../daily_phrase_pulse';
import { fetchActiveSurveyWithRetry } from '../survey_client';
import { buildActiveSurveyOffer, type SurveyOfferSnapshot } from '../survey_offer_model';
import {
    sameSurveyDurableScope,
    type SurveyDurableScope,
    type SurveyLaunch,
} from '../survey_flow_controller';
import { getCanonicalUserId } from '../user_id_policy';
import SaveProgressBanner from '../../components/SaveProgressBanner';
import GoldBevel from '../../components/GoldBevel';
import { useOverlayVisible } from '../../components/OverlayArbiter';
import SavedCardsFlight from '../../components/SavedCardsFlight';
import {
  homeArrivalEffect,
  markHomeArrivalPlayed,
  readSavedCardsFirstRun,
} from '../saved_cards_first_run';
import { useEnergy } from '../../components/EnergyContext';
import { getShardsBalance, peekLastKnownShardsBalance, onStreakUpdated } from '../shards_system';
import { getRunesBalance, peekRunes } from '../runes_system';
import { commitPremiumFreeFreeze } from '../economy/premium_free_freeze';
import { coinIconForBalance } from '../coin_icons';
import { buildLastLessonFromHydration, patchHomeScreenHydration, peekHomeScreenHydration, rememberHomeScreenHydration, resolveHomeProfileVisuals, shouldApplyHomeSnapshotToStats } from '../home_screen_hydration';
import { captureAccountGeneration, isCurrentAccountGeneration, subscribeAccountGeneration, type AccountGenerationToken } from '../account_generation';
// зачем (PM-037, владелец 2026-09-24): плавающая кнопка спина на карточке
// уровня удалена из хедера Главной — peekLevelSpinBalance/readLocalLevelSpinBalance/
// иконка билета спина/animateNextLayoutTransition жили только ради неё и удалены вместе с ней.
// 30.09: animateNextLayoutTransition вернулся — поздняя вставка карточки «Продолжить обучение».
import { animateNextLayoutTransition } from '../smooth_layout';
import { getAppSnapshot, patchAppSnapshot, resolveHydratedProfileName, subscribeAppSnapshot, useAppSnapshotSelector } from '../app_snapshot_store';
import { getPersonalProgressSnapshot, hydratePersonalProgress } from '../personal_progress_store';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import HomeYoutubeFeatureCard from '../../components/home/HomeYoutubeFeatureCard';
import HomeRuneBalance, { HOME_RUNE_ICON_SOURCE } from '../../components/home/HomeRuneBalance';
// зачем (владелец, 2026-09-01): заработанные в любом месте руны и жемчужины при
// возврате на Главную слетаются со всех сторон в свои счётчики. Материал копит
// app/reward_flight_queue.ts, оркестрацию держит хук — home.tsx и так огромен.
import HomeRewardCollectFlight from '../../components/home/HomeRewardCollectFlight';
import { useHomeRewardCollect } from '../../components/home/use_home_reward_collect';
import HomeV2Header from '../../components/home/v2/HomeV2Header';
import HomeV2ContinueCard from '../../components/home/v2/HomeV2ContinueCard';
import HomeV2FeatureTiles from '../../components/home/v2/HomeV2FeatureTiles';
import HomeV2VideoRail from '../../components/home/v2/HomeV2VideoRail';
import HomeV2TodayCard from '../../components/home/v2/HomeV2TodayCard';
import { buildTodayTasksPlaceholder } from '../../components/home/v2/today_tasks_placeholder';
import type { HomeFeatureTile } from '../../components/home/v2/home_v2_types';
import { getV2Palette, V2 } from '../../constants/v2Style';
import { HOME_REWARD_DEMO_MODES } from '../reward_flight_particles';
// зачем отдельное имя: в этом файле `Animated` — из react-native и им пользуются
// сотни мест. Пульс счётчиков живёт на Reanimated (UI-поток), поэтому его
// компонент импортируется как Reanimated, а не подменяет существующий.
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { runeAmount } from '../../constants/runes';
import { ruKnowledgeShardsAfterNumber, ukKnowledgeShardsAfterNumber } from '../../constants/shard_plurals';
import NotificationCenterButton from '../../components/NotificationCenterButton';
import ReportReplyHomeBanner from '../../components/ReportReplyHomeBanner';
import type { UserNotification } from '../user_notifications';
import PlayerProfileModal, { type PlayerInfo } from '../../components/PlayerProfileModal';
import FeatureIntroEntry from '../../components/feature_intro/FeatureIntroEntry';
import { logFeatureOpened } from '../firebase';
import { trackFeatureOpened } from '../user_stats';
import { perfMark, perfSteps, perfScreenMount, perfNavStart } from '../perf-monitor';
import { emitAppEvent, onAppEvent } from '../events';
import { registerDailyJourneyRevealTargetMeasurer } from '../../components/daily_journey/dailyJourneyRevealTargetBridge';
import DailyJourneyRewardPreviewModal from '../../components/dev/DailyJourneyRewardPreviewModal';
import { commitDailyJourneyGift, readDailyJourneyGiftProjection } from '../daily_journey_gift_inbox';
import {
  createDailyJourneyHomeDeliveryController,
  createDailyJourneyHomeGrantController,
      createDailyJourneyHomeProjectionController,
      measureDailyJourneyHomeTarget,
      type DailyJourneyHomePresentedDelivery,
      type DailyJourneyHomeTargetRect,
    } from '../daily_journey_home_orchestration';
import { FOREGROUND_CLOUD_REFRESH_DELAY_MS, FOREGROUND_LIGHT_REFRESH_DELAY_MS, getForegroundRefreshKind } from '../app_resume_policy';
import { getHomeMenuImages } from '../home_menu_icons';
import { getHomeLastLessonImage } from '../home_last_lesson_assets';
import { getMistakePracticeHomeCounts } from '../mistake_practice_insights';
import { isMistakeStudyTargetValue } from '../../modules/mistake-practice/contracts';
// зачем (владелец 2026-09-21): HomeSectionPulseButton больше не импортируется —
// ряд из двух пилюль у «Сегодня» удалён. Сам компонент оставлен в проекте: он
// пригодится следующему разделу, которому понадобится такая же кнопка.
// зачем (владелец 2026-09-21): HomeMistakesLockedSheet больше не импортируется —
// порог открытия раздела снят, шторка «ошибок мало» стала недостижимой.
// homeMistakesButtonState остаётся: по нему карточка решает, захватывать ли слот.
import { homeMistakesButtonState, homeMistakesCounterLabel } from '../home_mistakes_pulse_model';
import { getHomeMistakesImage } from '../home_mistakes_assets';
import { getLingmanYoutubeSnapshot, markLingmanYoutubeCatalogSeen, type LingmanYoutubeVideo } from '../lingman_youtube';
import { isVideoButtonEnabled } from '../remote_flags';
import { prewarmMistakeHubAdvice } from '../mistake_hub_advice';
import { trackMistakePracticeEvent } from '../mistake_practice_analytics';
import { isStreakFreezeActiveToday } from '../streak_freeze';
import {
    addDaysToDateKey,
    readCurrentStreakWeekMarkers,
    recordStreakWeekMarker,
    type StreakWeekDayMarkerKind,
} from '../streak_week_markers';
import { lessonNamesForStudyTarget } from '../lesson_titles_for_study_target';
import { lastOpenedLessonKey, lessonProgressKey } from '../target_storage_keys';
import { getStreakFeatherIconVariant, getStreakFreezeIconVariant } from '../../constants/streakIconAssets';
import { themeUiAsset } from '../theme_ui_assets';
import { themedWeekDot } from '../../constants/weekDotTheme';
import { noAndroidOutline } from '../../constants/androidGlow';
import { ENABLE_DEV_TOOLS } from '../config';
import {
  DEV_HOME_HINT_FIXTURES,
  pickRandomHomeHint,
  resolveHomeHintText,
  type PublishedHomeHints,
} from '../home_hints';
import { loadPublishedHomeHints as loadPublishedHomeHintsSnapshot } from '../home_hints_client';
import { SELECTED_HOME_HINTS_SNAPSHOT } from '../home_hints_selected';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
/** Значок действия в шапке (спин, подарок) — соразмерен соседям хедера. */
const HOME_HEADER_ACTION_ICON = 26;
const CONTENT_W = Math.min(SCREEN_W, 640);
/**
 * DEV-заглушка числа ошибок: границы случайного значения.
 *
 * зачем (владелец 2026-09-21): «пусть даёт рандомное кол-во ошибок (от 10),
 * чтобы отследить что всё работает». Фиксированная десятка проверяла ровно
 * один случай; со случайным числом видно и длину зарубки, и перелив за край
 * уровня, и трёхзначный счётчик на карточке.
 *
 * Нижняя граница — порог открытия раздела (HOME_MISTAKES_UNLOCK_AT = 10):
 * ниже него карточка ошибок не захватывает слот, и проверять было бы нечего.
 */
const DEV_HOME_MISTAKES_MIN_COUNT = 10;
const DEV_HOME_MISTAKES_MAX_COUNT = 140;
const HOME_PRIORITY_CARD_HOLD_SCALE = 1.035;
const HOME_PRIORITY_CARD_PRESS_IN_MS = 150;
// зачем (владелец 2026-09-22, дизайн «Цифра-гигант»): геометрия приоритетной
// плашки. Арт 84 при высоте 100 даёт по 8 px воздуха сверху и снизу. Брать
// больше нельзя: на 96 остаётся 2 px и картинка упирается в края — ровно та
// претензия владельца, из-за которой правился макет. Числа целые намеренно:
// дробный размер даёт нецелые пиксели и мыло на картинке.
//
// Живут на уровне МОДУЛЯ рядом с соседями по плашке, а не внутри
// renderNewHome: 2026-09-22 объявление внутри функции дало на боевом телефоне
// `ReferenceError: Property 'HOME_PRIORITY_CARD_HEIGHT' doesn't exist` —
// значения-константы не должны зависеть от порядка выполнения рендера.
const HOME_PRIORITY_CARD_HEIGHT = 100;
const HOME_PRIORITY_CARD_ART = 84;
/** Единый едва заметный press-feedback для крупных действий Главной. */
const HOME_BUTTON_PRESS_SCALE = 1.02;
// Rollback: set false to return to the previous elite home status card.
// Android Fabric/Yoga can abort when NativeAnimated mutates Home view props during startup.
const HOME_ANIMATION_USE_NATIVE_DRIVER = true;
const HOME_SELECTED_TITLE_KEY = 'home_selected_title_key_v1';
const HOME_WEEK_DOT_ANIMATION_KEY = 'home_week_dot_animation_last_shown_v1';
/** Сесійний прапор: після першого успішного loadData дочірні mounts не показують «рівень 1» кадр. */
let homeStatsLoadedOnce = false;
/**
 * Сессионный флаг: нижняя часть главной («Цель лиги», фраза дня, подвал)
 * уже проходила отложенный второй проход.
 *
 * зачем: второй проход через InteractionManager экономит бюджет ХОЛОДНОГО СТАРТА, но
 * useState(false) выполнялся заново на каждом маунте таба. Возврат с любого раздела
 * размораживает главную → флаг снова false → блоки исчезали и вставлялись кадром позже,
 * толкая верстку («элементы появляются с задержкой»). Флаг в module-scope переживает
 * маунты/ремаунты в рамках процесса, поэтому отложенный проход бывает ровно один раз —
 * так же, как homeStatsLoadedOnce выше. Сбрасывать при смене аккаунта НЕ нужно: флаг
 * говорит только «можно ли рендерить эти блоки», а сами цифры внутри берутся из
 * account-scoped состояния и кэшей, поэтому чужие данные он показать не может.
 */
let homeBelowFoldReadyOnce = false;
/** Подсказка главной показывается один раз за вход в приложение, а не за каждый возврат на вкладку. */
let homeHintShownThisAppSession = false;
/**
 * Единая высота карточки статистики на главной.
 *
 * зачем: было `minHeight: homeStatsReady ? 184 : 196` — пока данные не готовы, панель на
 * 12px ВЫШЕ, а при готовности сжимается, и весь контент под ней подскакивает вверх. Ровно
 * то «подпрыгивание при открытии/возврате на главную», на которое жаловался владелец
 * (ориентир — Bevel: открыл и статично). Держим одну высоту в обоих состояниях: берём
 * бОльшую из двух, чтобы готовое содержимое гарантированно влезало без обрезки.
 */
const HOME_STATS_CARD_MIN_HEIGHT = 196;
// Старый gift-button art не подключается к Home: хедер использует только
// актуальные локальные иконки и daily-journey projection.
const GREETINGS_RU = [
    'Твой лингвистический дзен', 'Время покорять вершины', 'Зарядись знаниями', 'Твой мозг скажет «спасибо»',
    'Готов к новым инсайтам?', 'Мир ждет твоего слова', 'На шаг ближе к цели', 'Твой интеллект в тонусе',
    'Вдохновение начинается здесь', 'Стань лучшей версией себя', 'Твой путь к мастерству', 'Время открывать горизонты',
    'Дай мыслям взлететь', 'Твой пропуск в мир английского', 'Прокачай свой потенциал', 'Сегодня — лучший день для старта',
    'Будь на волне прогресса', 'Энергия твоего разума', 'Сделай шаг к успеху', 'Твое будущее начинается сейчас',
    'Твой интеллектуальный апгрейд', 'Время расширять границы', 'Зарядись на успех', 'Твой мозг в отличной форме',
    'Готов к новым свершениям?', 'Слова станут твоей силой', 'На шаг впереди всех', 'Твоя ежедневная порция знаний',
    'Вдохновение в каждом слове', 'Стань мастером своего дела', 'Твой персональный прорыв', 'Время блистать знаниями',
    'Заряди разум на максимум', 'Твой мозг жаждет открытий', 'Готов удивить весь мир?', 'Мир открыт для тебя',
    'На шаг ближе к мечте', 'Твой интеллект без границ', 'Вдохновение в каждом шаге', 'Стань легендой сегодня',
    'Твой интеллектуальный драйв', 'Время менять реальность', 'Зарядись на победу', 'Твой мозг в фокусе',
    'Готов к новым высотам?', 'Ты говоришь увереннее', 'На шаг дальше, чем вчера', 'Твой безграничный потенциал',
    'Вдохновение внутри тебя', 'Стань лучшим в своем деле', 'Твой интеллектуальный триумф', 'Время ярких открытий',
    'Зарядись на результат', 'Твой разум — твоя сила', 'Готов к новому вызову?', 'Мир слышит тебя',
    'На шаг ближе к идеалу', 'Твой путь к совершенству', 'Вдохновение в деталях', 'Стань тем, кем хочешь быть',
    'Смелость мыслить шире', 'Время мыслить шире', 'Зарядись на максимум', 'Твой разум — твой капитал',
    'Готов к новым задачам?', 'Мир заиграет красками', 'На шаг ближе к мечте', 'Свободнее с каждым словом',
    'Прогресс вдохновляет', 'Слова сближают людей',
];
const GREETINGS_UK = [
    'Твій лінгвістичний дзен', 'Час підкорювати вершини', 'Зарядись знаннями', 'Твій мозок скаже «дякую»',
    'Готовий до нових інсайтів?', 'Світ чекає твого слова', 'На крок ближче до мети', 'Твій інтелект у тонусі',
    'Натхнення починається тут', 'Стань кращою версією себе', 'Твій шлях до майстерства', 'Час відкривати горизонти',
    'Дай думкам злетіти', 'Твій пропуск у світ англійської', 'Розкрий свій потенціал', 'Сьогодні — найкращий день для старту',
    'Будь на хвилі прогресу', 'Енергія твого розуму', 'Зроби крок до успіху', 'Твоє майбутнє починається зараз',
    'Твій інтелектуальний апгрейд', 'Час розширювати межі', 'Зарядись на успіх', 'Твій мозок у відмінній формі',
    'Готовий до нових звершень?', 'Слова стануть твоєю силою', 'На крок попереду всіх', 'Твоя щоденна порція знань',
    'Натхнення у кожному слові', 'Стань майстром своєї справи', 'Твій персональний прорив', 'Час сяяти знаннями',
    'Зарядь розум на максимум', 'Твій мозок прагне відкриттів', 'Готовий здивувати весь світ?', 'Світ відкритий для тебе',
    'На крок ближче до мрії', 'Твій інтелект без меж', 'Натхнення у кожному кроці', 'Стань легендою сьогодні',
    'Твій інтелектуальний драйв', 'Час змінювати реальність', 'Зарядись на перемогу', 'Твій мозок у фокусі',
    'Готовий до нових висот?', 'Ти говориш упевненіше', 'На крок далі, ніж учора', 'Твій безмежний потенціал',
    'Натхнення всередині тебе', 'Стань кращим у своїй справі', 'Твій інтелектуальний тріумф', 'Час яскравих відкриттів',
    'Зарядись на результат', 'Твій розум — твоя сила', 'Готовий до нового виклику?', 'Світ чує тебе',
    'На крок ближче до ідеалу', 'Твій шлях до досконалості', 'Натхнення у деталях', 'Стань тим, ким мрієш бути',
    'Сміливість мислити ширше', 'Час думати ширше', 'Зарядись на максимум', 'Твій розум — твій капітал',
    'Готовий до нових завдань?', 'Світ заграє барвами', 'На крок ближче до мрії', 'Вільніше з кожним словом',
    'Прогрес надихає', 'Слова зближують людей',
];
const GREETINGS_EN = [
    'Your English gets stronger today', 'One step closer to fluency', 'Learn a phrase, open a door',
    'Small habits build big progress', 'More confidence with every word', 'Today is a day to move forward',
    'Small drills, big leaps', 'Your progress is alive', 'Speak with more ease',
    'The next insight is here', 'Your brain loves consistency', 'Clearer than yesterday',
];
const GREETINGS_PT_BR = [
    'Seu inglês ganha força hoje', 'Um passo mais perto da fluência', 'Aprenda uma frase, abra uma porta',
    'Sua rotina também ensina', 'Mais confiança a cada palavra', 'Hoje é dia de avançar',
    'Pequenos treinos, grandes saltos', 'Seu progresso está vivo', 'Fale com mais leveza',
    'O próximo insight está aqui', 'Seu cérebro adora constância', 'Mais claro do que ontem',
];
const GREETINGS_VI = [
    'Tiếng Anh của bạn mạnh hơn hôm nay', 'Gần sự tự tin hơn một bước', 'Một câu mới, một cánh cửa mới',
    'Thói quen nhỏ cũng tạo tiến bộ', 'Tự tin hơn qua từng từ', 'Hôm nay là ngày để tiến lên',
    'Luyện tập nhỏ, bước nhảy lớn', 'Tiến bộ của bạn đang sống động', 'Nói nhẹ nhàng và rõ hơn',
    'Gợi ý tiếp theo ở ngay đây', 'Não bạn thích sự đều đặn', 'Rõ hơn hôm qua',
];
const GREETINGS_ID = [
    'Bahasa Inggrismu makin kuat hari ini', 'Selangkah lebih dekat ke percaya diri', 'Satu frasa baru, satu pintu baru',
    'Rutinitas kecil juga membangun kemajuan', 'Lebih yakin di setiap kata', 'Hari ini waktunya maju',
    'Latihan kecil, lompatan besar', 'Progresmu tetap bergerak', 'Bicara lebih ringan dan jelas',
    'Insight berikutnya ada di sini', 'Otakmu suka konsistensi', 'Lebih jelas daripada kemarin',
];
const GREETINGS_TR = [
    'İngilizcen bugün güçleniyor', 'Özgüvene bir adım daha yakın', 'Yeni bir ifade, yeni bir kapı',
    'Küçük alışkanlıklar da ilerleme getirir', 'Her kelimeyle daha emin', 'Bugün ilerleme günü',
    'Küçük pratikler, büyük sıçramalar', 'İlerlemen canlı kalıyor', 'Daha rahat ve net konuş',
    'Sıradaki içgörü burada', 'Beynin sürekliliği sever', 'Dünden daha net',
];
const GREETINGS_PL = [
    'Twój angielski dziś rośnie w siłę', 'O krok bliżej pewności', 'Nowa fraza, nowe drzwi',
    'Małe nawyki też budują postęp', 'Więcej pewności z każdym słowem', 'Dziś jest dobry dzień na ruch',
    'Małe ćwiczenia, duże skoki', 'Twój postęp żyje', 'Mów swobodniej i jaśniej',
    'Następny wgląd jest tutaj', 'Twój mózg lubi regularność', 'Jaśniej niż wczoraj',
];
const HOME_GREETING_POOLS: Record<Lang, readonly string[]> = {
    ru: GREETINGS_RU,
    uk: GREETINGS_UK,
    en: GREETINGS_EN,
    es: GREETINGS_ES,
    'pt-BR': GREETINGS_PT_BR,
    vi: GREETINGS_VI,
    id: GREETINGS_ID,
    tr: GREETINGS_TR,
    pl: GREETINGS_PL,
};
const HOME_WEEK_DAYS: Record<Lang, readonly string[]> = {
    ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    uk: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
    en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    es: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
    'pt-BR': ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    vi: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    id: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    tr: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
    pl: ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'],
};
const HOME_DAILY_GREETING_KEY = 'home_daily_greeting_v1';
const HOME_ONBOARDING_DONE_KEY = 'onboarding_done';
// Контент карточек-подсказок и ключи хранения — app/home_feature_tips.ts
// (общие с settings.tsx; повторные показы переключают юмористические наборы).
/** Новая Главная 2.0 по референсу владельца 24.09. false — прежняя разметка (откат одной строкой). */
const HOME_V2_LAYOUT = true;

function getHomeFeatureTipTouchPoint(event: GestureResponderEvent): { x: number; y: number } | null {
    const nativeEvent = event.nativeEvent as typeof event.nativeEvent & {
        changedTouches?: Array<{ pageX?: number; pageY?: number }>;
        touches?: Array<{ pageX?: number; pageY?: number }>;
    };
    const touch = nativeEvent.changedTouches?.[0] ?? nativeEvent.touches?.[0] ?? nativeEvent;
    const x = typeof touch.pageX === 'number' ? touch.pageX : null;
    const y = typeof touch.pageY === 'number' ? touch.pageY : null;
    return x == null || y == null ? null : { x, y };
}
function localCalendarDay(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
type DailyGreetingStored = {
    day: string;
    lang: Lang;
    idx: number;
};
type HomeSpecialTitleStats = {
    helpfulReportsConfirmed: number;
    earnedAchievementIds: Set<string>;
};
type TitleModalRow = {
    key: string;
    titleEN: string;
    subtitle: string;
    colorLight: string;
    colorDark: string;
    unlocked: boolean;
    current: boolean;
    kind: 'special';
};
/** Одна случайная фраза на календарный день для данного языка (без мигания при каждом loadData). */
async function resolveDailyGreeting(pool: readonly string[], lang: Lang): Promise<string> {
    if (pool.length === 0)
        return '';
    const today = localCalendarDay();
    try {
        const raw = await AsyncStorage.getItem(HOME_DAILY_GREETING_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as Partial<DailyGreetingStored>;
            if (parsed.day === today && parsed.lang === lang && typeof parsed.idx === 'number') {
                return pool[parsed.idx % pool.length]!;
            }
        }

    }
    catch (e) {
      // ignore
      DebugLogger.error('home:parsed', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    const idx = Math.floor(Math.random() * pool.length);
    try {
        await AsyncStorage.setItem(HOME_DAILY_GREETING_KEY, JSON.stringify({ day: today, lang, idx } satisfies DailyGreetingStored));
    }
    catch (e) {
      // ignore
      DebugLogger.error('home:idx', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    return pool[idx]!;
}
function parseStoredCount(raw: string | null): number {
    const n = parseInt(raw ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}
type HomeMenuIconAlign = {
    x: number;
    y: number;
};
type HomeMenuIconAlignKey = 'lesson' | 'cards' | 'test' | 'practice' | 'dialogs';
const HOME_MENU_ICON_ALIGNMENT: Partial<Record<ThemeMode, Partial<Record<HomeMenuIconAlignKey, HomeMenuIconAlign>>>> = {
};
type LightSketchMenuImageProps = Omit<React.ComponentProps<typeof Image>, 'style'> & {
    width: number;
    height: number;
    lighten: boolean;
    align?: HomeMenuIconAlign;
};
type StableTouchableOpacityProps = Omit<PressableProps, 'style' | 'children'> & {
    activeOpacity?: number;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};
function TouchableOpacity({ activeOpacity = 0.2, disabled, style, onPress, onLongPress, onPressIn, onPressOut, children, ...props }: StableTouchableOpacityProps) {
    return (<Pressable
      {...props}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={(state) => [
          typeof style === 'function' ? style(state) : style,
          // Масштаб живёт на самом Pressable: содержимое не оборачивается и
          // поэтому не меняет flex-раскладку (энергия/серия остаются inline).
          state.pressed && !disabled
            ? { opacity: activeOpacity, transform: [{ scale: HOME_BUTTON_PRESS_SCALE }] }
            : null,
      ]}
    >
      {children}
    </Pressable>);
}
function getHomeMenuIconAlignment(themeMode: ThemeMode, key: HomeMenuIconAlignKey): HomeMenuIconAlign | undefined {
    return HOME_MENU_ICON_ALIGNMENT[themeMode]?.[key];
}
function LightSketchMenuImage({ width, height, lighten, align, ...props }: LightSketchMenuImageProps) {
    const boxStyle = { width, height };
    const imageStyle = align
        ? [boxStyle, { transform: [{ translateX: width * align.x }, { translateY: height * align.y }] }]
        : boxStyle;
    void lighten;
    return <Image {...props} style={imageStyle as any}/>;
}
// ── Титулы: кэш вне рендера ──────────────────────────────────────────────────
// Главная — самый часто перерисовываемый экран (энергия/фокус). Раньше на
// КАЖДЫЙ рендер строились ~60 объектов титулов + локализация, хотя модалка
// титулов закрыта. Одноэлементный кэш по входам убирает эту работу; hook в
// середину 4000-строчного рендера ставить нельзя (порядок хуков).
type HomeTitlesArgs = {
    streak: number;
    helpfulReportsConfirmed: number;
    earnedAchievementIds: unknown;
    lang: Lang;
    selectedTitleKey: string | null;
};
type HomeTitlesComputation = {
    allTitles: TitleModalRow[];
    earnedTitles: TitleModalRow[];
    currentTitleKey: string;
};
let homeTitlesCacheKey = '';
let homeTitlesCacheAchievementsRef: unknown = null;
let homeTitlesCacheValue: HomeTitlesComputation | null = null;

function computeHomeTitles(args: HomeTitlesArgs): HomeTitlesComputation {
    const cacheKey = [
        args.streak, args.helpfulReportsConfirmed,
        args.lang, args.selectedTitleKey ?? '',
    ].join('|');
    if (
        homeTitlesCacheValue &&
        homeTitlesCacheKey === cacheKey &&
        homeTitlesCacheAchievementsRef === args.earnedAchievementIds
    ) {
        return homeTitlesCacheValue;
    }

    const earnedSpecialTitles = getEarnedSpecialTitles({
        streak: args.streak,
        helpfulReportsConfirmed: args.helpfulReportsConfirmed,
        earnedAchievementIds: args.earnedAchievementIds as never,
    });
    const earnedSpecialTitleIds = new Set(earnedSpecialTitles.map((title) => title.id));
    const specialTitleRows: TitleModalRow[] = SPECIAL_TITLES.map((item) => ({
        key: `special:${item.id}`,
        titleEN: item.titleEN,
        subtitle: item.unlockText,
        colorLight: item.colorLight,
        colorDark: item.colorDark,
        unlocked: earnedSpecialTitleIds.has(item.id),
        current: false,
        kind: 'special',
    }));
    const allTitleRows = specialTitleRows;
    const selectedTitleRow = args.selectedTitleKey
        ? allTitleRows.find((title) => title.key === args.selectedTitleKey && title.unlocked) ?? null
        : null;
    const currentTitleKey = selectedTitleRow?.key
        ?? (earnedSpecialTitles[0] ? `special:${earnedSpecialTitles[0].id}` : '');
    const allTitles = allTitleRows.map((title) => ({
        ...title,
        current: title.key === currentTitleKey,
    }));
    const earnedTitles = allTitles.filter((title) => title.unlocked);

    homeTitlesCacheKey = cacheKey;
    homeTitlesCacheAchievementsRef = args.earnedAchievementIds;
    homeTitlesCacheValue = { allTitles, earnedTitles, currentTitleKey };
    return homeTitlesCacheValue;
}

/**
 * Потолок ожидания для СЕТЕВЫХ данных Главной.
 *
 * зачем: владелец 21.09 — «нажала 20 раз, открылось просто тёмный экран на 20
 * секунд». Замер [PERF-STEPS] показал шаг lessons+unlockLoop = 26 154 мс из
 * 28 186, а тот же код в соседних заходах занимал 1 мс, 34 мс и 194 мс.
 * Так ведёт себя не вычисление, а ожидание сети: у старого удалённого состояния и
 * старое удалённое состояние было только с `.catch` на кэш, но без таймаута —
 * при слабой связи await висел сколько угодно и держал весь экран.
 *
 * Это тот же класс бага, что в Диалогах 17.09: любому await нужен таймаут.
 * 2,5 секунды — потолок, после которого показываем кэш. Удалённые вторичные
 * данные не настолько срочны, чтобы ради них держать человека перед тёмным экраном.
 */
const HOME_REMOTE_STEP_TIMEOUT_MS = 2500;

/**
 * Отдаёт запасное значение, если обещание не уложилось в срок.
 *
 * Сам вызов НЕ отменяется — он просто перестаёт нас держать; если ответ придёт
 * позже, он осядет в кэше и попадёт в следующее открытие экрана.
 */
function withHomeRemoteTimeout<T>(
  promise: Promise<T>,
  fallback: () => T,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const guard = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      // Ранний выход обязан называть причину (правило «сперва логи»).
      // DebugLogger, а не console: баг ловится в TestFlight, где console молчит.
      DebugLogger.warn('[HOME-SLOW]', `timeout ${label} ${HOME_REMOTE_STEP_TIMEOUT_MS}ms`);
      resolve(fallback());
    }, HOME_REMOTE_STEP_TIMEOUT_MS);
  });
  return Promise.race([
    promise.then((value) => {
      if (timer) clearTimeout(timer);
      return value;
    }).catch((error) => {
      if (timer) clearTimeout(timer);
      // Немой catch запрещён: причина отказа обязана попасть в журнал.
      DebugLogger.warn('[HOME-SLOW]', `failed ${label}: ${String(error)}`);
      return fallback();
    }),
    guard,
  ]);
}

export default function HomeScreen({ onOpenDevHub }: { onOpenDevHub?: () => void } = {}) {
  // зачем (владелец 2026-09-22, «удалить все замеры»): здесь в ТЕЛЕ компонента
  // стоял countScreenRender('home') — работа на КАЖДЫЙ рендер Главной. Тело
  // самого горячего экрана обязано быть чистым.
  const tabContentBottomPad = useTabContentBottomPad();
    const router = useRouter();
    // Навигация к отдельным экранам — через guard от двойного тапа (дубли в стеке).
    const nav = useGuardedNav();
    const { theme: t, isDark, f, themeMode } = useTheme();
    const myCoinRank = useMyCoinRank();
    const { s, lang } = useLang();
    const { studyTarget } = useStudyTarget();
    // зачем D129/D130: какие разделы видны для языка обучения — только из таблицы
    // готовности. studyTarget синхронный (peek), поэтому первый кадр уже финальный.
    const homeLearnVisible = isLearnTabVisibleForTarget(studyTarget);
    const homeDialoguesVisible = isLearningSurfaceReady(studyTarget, 'dialogues');
    const homeFlashcardsVisible = isLearningSurfaceReady(studyTarget, 'flashcards');
    const homeVideosVisible = isLearningSurfaceReady(studyTarget, 'videos');
    const homeDailyPhraseVisible = isLearningSurfaceReady(studyTarget, 'daily_phrase');
    const insets = useStableSafeAreaInsets();
    const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
    const topFadeScroll = useTopFadeScroll();
    // зачем: бейдж скидки в хедере — «Пульт»-флаг с живым обновлением (без
    // релиза), тем же паттерном, что PromoBanner (onAppEvent). Не показываем
    // бейдж одновременно с полноширинным PromoBanner (см. аудит 2026-09-17) —
    // два одновременных промо-приглашения спорили бы за внимание на одном
    // экране; полноширинный баннер приоритетнее (он виден и с других экранов).
    // Пустой label (процент не задан/невалиден в «Пульте») тоже гасит бейдж.
    const resolveDiscountBadgeLabel = () => (
        isDiscountOfferBadgeEnabled() && !isPromoBannerEnabled() ? getDiscountOfferBadgeLabel() : ''
    );
    const [discountBadgeLabel, setDiscountBadgeLabel] = useState(resolveDiscountBadgeLabel);
    useEffect(() => {
        const refreshDiscountBadge = () => setDiscountBadgeLabel(resolveDiscountBadgeLabel());
        refreshDiscountBadge();
        const sub = onAppEvent('remote_config_changed', refreshDiscountBadge);
        return () => sub.remove();
    }, []);
    // Скролл-реф для приветствия: подвести нужный блок в кадр перед подсветкой.
    const homeScrollRef = useRef<ScrollView | null>(null);
    // зачем: владелец попросил, чтобы сохранённые карточки на главной собирались
    // в кучку и улетали в раздел «Карточки». Держим здесь только координату плитки
    // и число прилетевших — сама анимация живёт оверлеем и вёрстку не двигает.
    const [cardsTileCenter, setCardsTileCenter] = useState<{ x: number; y: number } | null>(null);
    const [cardArrivals, setCardArrivals] = useState(0);
    const cardArrivalEffectRef = useRef<'pulse' | 'flight' | null>(null);
    const dailyPhraseLayoutRef = useRef({ top: 0, height: 0 });
    const homeViewportHeightRef = useRef(0);
    const homeScrollYRef = useRef(0);
    const [dailyPhraseCardVisible, setDailyPhraseCardVisible] = useState(false);
    const dailyPhraseCardVisibleRef = useRef(false);
    const [surveyOffer, setSurveyOffer] = useState<{
        challenge: SurveyOfferSnapshot;
        stableId: string;
        dayKey: string;
    } | null>(null);
    const [openSurveyLaunch, setOpenSurveyLaunch] = useState<SurveyLaunch | null>(null);
    const openSurveyAccountGenerationRef = useRef<AccountGenerationToken | null>(null);
    const closeSurveySheet = useCallback(() => {
        openSurveyAccountGenerationRef.current = null;
        setOpenSurveyLaunch(null);
    }, []);
    const handleSurveyDurablyReconciled = useCallback((completed: SurveyDurableScope) => {
        setSurveyOffer((current) => {
            if (!current) return current;
            const currentScope = {
                stableId: current.stableId,
                dayKey: current.dayKey,
                surveyId: current.challenge.surveyId,
            };
            return sameSurveyDurableScope(currentScope, completed) ? null : current;
        });
    }, []);
    // зачем (аудит скорости 2026-08-22): раньше пересчитывался на КАЖДОМ кадре
    // скролла (scrollEventThrottle=16 ≈ 60/с) — сам расчёт дешёвый, но лишняя
    // работа на JS-потоке во время активного скролла. Троттлим по времени: при
    // Дешёвую геометрию считаем прямо из refs, а в React заходим только при
    // реальном пересечении порога видимости — без таймеров, Date.now и пустых
    // state-dispatch во время жеста.
    const refreshDailyPhraseVisibility = useCallback(() => {
        const next = isDailyPhraseCardHalfVisible({
            cardTop: dailyPhraseLayoutRef.current.top,
            cardHeight: dailyPhraseLayoutRef.current.height,
            scrollY: homeScrollYRef.current,
            viewportHeight: homeViewportHeightRef.current,
        });
        if (dailyPhraseCardVisibleRef.current === next) return;
        dailyPhraseCardVisibleRef.current = next;
        setDailyPhraseCardVisible(next);
    }, []);
    // зачем (владелец 2026-09-21, «ещё лагает»): скролл Главной шёл через
    // JS-поток — handleHomeScroll дёргался 60 раз в секунду, и каждый кадр
    // updateScrollMetrics писал три SharedValue из JS, то есть ~180 переходов
    // через мост в секунду. При Новой Архитектуре это дорого.
    // Теперь замер offset живёт на UI-потоке, а JS будим ТОЛЬКО на пересечении
    // порога: верхняя маска (6px, как в TopFadeScrollContext) и порог видимости
    // Пороги: маска сверху (6px, как в TopFadeScrollContext) и сворачивание
    // таббара (8px по модулю, как в его reportOffset). Оба — «да/нет», поэтому
    // решение принимается на UI-потоке, а JS будится только на переключении.
    //
    // Карточка дня СОЗНАТЕЛЬНО осталась на JS-пути: её видимость зависит от
    // положения карточки и высоты экрана (isDailyPhraseCardHalfVisible), а не от
    // порога по offset. Грубый порог в worklet сломал бы её появление — проверено
    // до правки, поэтому она обновляется на onScrollEndDrag/onMomentumScrollEnd,
    // где и была точна, а не 60 раз в секунду.
    const homeTopFadeShown = useSharedValue(false);
    const homeTabBarLastY = useSharedValue(0);
    const notifyHomeScrollY = useCallback((y: number) => {
        homeScrollYRef.current = y;
        topFadeScroll?.reportTabBarOffset?.(y);
        refreshDailyPhraseVisibility();
    }, [refreshDailyPhraseVisibility, topFadeScroll]);
    const homeScrollWorklet = useCallback((y: number) => {
        'worklet';
        const clamped = Math.max(0, y);
        const fadeShown = clamped > 6;
        // Тот же шаг 8px, что в TopFadeScrollContext.reportOffset — таббар и так
        // не реагировал на более мелкие сдвиги, просто теперь их отсекает
        // UI-поток, а не JS.
        const tabBarMoved = clamped <= 6 || Math.abs(clamped - homeTabBarLastY.value) >= 8;
        if (fadeShown !== homeTopFadeShown.value || tabBarMoved) {
            homeTopFadeShown.value = fadeShown;
            homeTabBarLastY.value = clamped;
            runOnJS(notifyHomeScrollY)(clamped);
        }
    }, [homeTabBarLastY, homeTopFadeShown, notifyHomeScrollY]);
    const handleHomeScrollSettled = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        homeScrollYRef.current = event.nativeEvent.contentOffset.y;
        refreshDailyPhraseVisibility();
    }, [refreshDailyPhraseVisibility]);
    const { goToTab, activeIdx, focusTick, runtimeOwnerId } = useTabNav();
    const [homeOnboardingDone, setHomeOnboardingDone] = useState(false);
    const isHomeOwner = runtimeOwnerId === 'home';
    // Root Stack монтирует Home под полноэкранным CleanOnboarding. Владение табом
    // само по себе ещё не означает, что экран видим: до onboarding_done запрещаем
    // тяжёлые загрузки, Firestore, префетчи и циклы анимаций.
    const homeRuntimeActive = useRuntimeActive(isHomeOwner && homeOnboardingDone);
    const homeRuntimeActiveRef = useRef(homeRuntimeActive);
    // Home may mount while another retained tab owns runtime work.
    const homeDataDirtyRef = useRef(true);
    const shardsDirtyRef = useRef(false);
    const streakMarkersDirtyRef = useRef(false);
    useEffect(() => {
        homeRuntimeActiveRef.current = homeRuntimeActive;
    }, [homeRuntimeActive]);
    useEffect(() => {
        if (!homeRuntimeActive) return undefined;
        let cancelled = false;
        void (async () => {
            try {
                const stableId = await getCanonicalUserId();
                if (!stableId || cancelled) return;
                const result = await fetchActiveSurveyWithRetry({ stableId, platform: Platform.OS, lang });
                if (cancelled) return;
                if (!result.survey || result.completion) {
                    setSurveyOffer(null);
                    return;
                }
                setSurveyOffer({
                    challenge: buildActiveSurveyOffer({ survey: result.survey, lang }),
                    stableId,
                    dayKey: getUtcDayKey(),
                });
            } catch {
                if (!cancelled) setSurveyOffer(null);
            }
        })();
        return () => { cancelled = true; };
    }, [focusTick, homeRuntimeActive, lang]);
    useEffect(() => {
        if (!openSurveyLaunch) return undefined;
        const openedAccount = openSurveyAccountGenerationRef.current;
        if (!openedAccount) {
            closeSurveySheet();
            return undefined;
        }
        const closeIfSurveyScopeChanged = (account = captureAccountGeneration()) => {
            const accountMismatch = account.phase !== 'active'
                || account.generation !== openedAccount.generation
                || account.stableId !== openSurveyLaunch.stableId;
            const offerMismatch = Boolean(surveyOffer && (
                surveyOffer.stableId !== openSurveyLaunch.stableId
                || surveyOffer.dayKey !== openSurveyLaunch.dayKey
            ));
            const dayMismatch = getUtcDayKey() !== openSurveyLaunch.dayKey;
            if (accountMismatch || offerMismatch || dayMismatch || openSurveyLaunch.lang !== lang) {
                closeSurveySheet();
            }
        };
        closeIfSurveyScopeChanged();
        const subscription = subscribeAccountGeneration(closeIfSurveyScopeChanged);
        const now = new Date();
        const nextUtcDayMs = Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1,
        );
        const utcDayBoundaryTimeout = setTimeout(() => {
            if (getUtcDayKey() !== openSurveyLaunch.dayKey) closeSurveySheet();
        }, Math.max(1, nextUtcDayMs - Date.now() + 25));
        return () => {
            subscription.remove();
            clearTimeout(utcDayBoundaryTimeout);
        };
    }, [closeSurveySheet, lang, openSurveyLaunch, surveyOffer]);
    const firstHomeFrameEmittedRef = useRef(false);
    const notifyFirstHomeFrameReady = useCallback(() => {
        if (firstHomeFrameEmittedRef.current)
            return;
        firstHomeFrameEmittedRef.current = true;
        const emitFirstHomeFrameReady = () => emitAppEvent('app_first_content_ready');
        requestAnimationFrame(() => {
            emitFirstHomeFrameReady();
            setTimeout(emitFirstHomeFrameReady, 32);
            setTimeout(emitFirstHomeFrameReady, 120);
        });
    }, []);
    useEffect(() => {
        notifyFirstHomeFrameReady();
    }, [notifyFirstHomeFrameReady]);
    const appSnapshot = useAppSnapshotSelector((snapshot) => ({
        profile: snapshot.profile,
        progress: snapshot.progress,
    }), (a, b) => a.profile === b.profile && a.progress === b.progress);
    const hh = homeStatsLoadedOnce ? peekHomeScreenHydration(studyTarget) : null;
    const snapshotName = appSnapshot.profile?.name ?? '';
    const snapshotStreak = appSnapshot.progress?.streak ?? 0;
    const snapshotShards = appSnapshot.progress?.shards ?? 0;
    const initialVisuals = resolveHomeProfileVisuals({ hydration: hh, snapshot: appSnapshot.profile });
    const [userName, setUserName] = useState(() => hh?.userName ?? snapshotName);
    const [streak, setStreak] = useState(() => hh?.streak ?? snapshotStreak);
    const [displayStreak, setDisplayStreak] = useState(() => hh?.displayStreak ?? hh?.streak ?? snapshotStreak);
    const homeStreakDaysLabel = displayStreak === 1
        ? triLang(lang, {
            ru: 'день',
            en: 'day',
            uk: 'день',
            es: 'día',
            'pt-BR': 'dia',
            vi: 'ngày',
            id: 'hari',
            tr: 'gün',
            pl: 'dzień',
        })
        : triLang(lang, {
            ru: (() => {
                const remainder100 = Math.abs(displayStreak) % 100;
                const remainder10 = Math.abs(displayStreak) % 10;
                return remainder100 >= 11 && remainder100 <= 14
                    ? 'дней'
                    : remainder10 >= 2 && remainder10 <= 4
                        ? 'дня'
                        : 'дней';
            })(),
            en: 'days',
            uk: s.home.streakDays,
            es: s.home.streakDays,
            'pt-BR': s.home.streakDays,
            vi: s.home.streakDays,
            id: s.home.streakDays,
            tr: s.home.streakDays,
            pl: s.home.streakDays,
        });
    const streakRingAnim = useRef(new Animated.Value(0)).current;
    const homeMotionReduceMotion = useReduceMotion();
    const [homeStatsReady, setHomeStatsReady] = useState(() => !!((homeStatsLoadedOnce && hh) || appSnapshot.profile || appSnapshot.progress));
    // true только когда загрузка ОБОРВАЛАСЬ и показывать нечего (первый запуск + оффлайн).
    // Если есть кэш/hydration — баннер НЕ показываем: экран деградирует до кэша молча.
    const [loadFailedNoData, setLoadFailedNoData] = useState(false);
    const [weekDone, setWeekDone] = useState<boolean[]>(() => {
        const w = hh?.weekDone;
        return w && w.length === 7 ? [...w] : new Array(7).fill(false);
    });
    const [weekDotAnimationToken, setWeekDotAnimationToken] = useState<string | null>(null);
    const weekDotPulseAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!weekDotAnimationToken || !homeRuntimeActive || homeMotionReduceMotion) {
            weekDotPulseAnim.stopAnimation();
            weekDotPulseAnim.setValue(1);
            return;
        }
        weekDotPulseAnim.stopAnimation();
        weekDotPulseAnim.setValue(0);
        const animation = Animated.sequence([
            Animated.timing(weekDotPulseAnim, {
                toValue: 1,
                duration: 520,
                easing: Easing.inOut(Easing.quad),
                useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER,
            }),
            Animated.timing(weekDotPulseAnim, {
                toValue: 0,
                duration: 520,
                easing: Easing.inOut(Easing.quad),
                useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER,
            }),
        ]);
        animation.start();
        return () => animation.stop();
    }, [homeMotionReduceMotion, homeRuntimeActive, weekDotAnimationToken, weekDotPulseAnim]);
    const [weekMarkers, setWeekMarkers] = useState<Array<StreakWeekDayMarkerKind | null>>(() => {
        const w = hh?.weekMarkers;
        return w && w.length === 7 ? [...w] : new Array(7).fill(null);
    });
    const [weekPoints, setWeekPoints] = useState(() => hh?.weekPoints ?? 0);
    const [lastLesson, setLastLesson] = useState<{
        id: number;
        name: string;
        progress: number;
        score: string;
    } | null>(() => buildLastLessonFromHydration(lang, studyTarget) ?? null);
    // зачем (эмулятор 30.09, лог [HOME-FIRST-FRAME]): на холодном старте снимок урока
    // живёт только в памяти — карточка «Продолжить обучение» приходила после loadData
    // и рывком сдвигала всю Главную. Ref помнит, была ли карточка, чтобы вставку анимировать.
    const lastLessonShownRef = useRef(lastLesson !== null);
    useEffect(() => { lastLessonShownRef.current = lastLesson !== null; }, [lastLesson]);
    // зачем (22.09): null означал «раздела ошибок нет» — на Главной у
    // испанского и немецкого карточка «Мои ошибки» не показывалась вовсе.
    const mistakeStudyTarget = isMistakeStudyTargetValue(studyTarget) ? studyTarget : null;
    const [mistakeAccountGeneration, setMistakeAccountGeneration] = useState(captureAccountGeneration);
    const mistakeAccountGenerationKey = `${mistakeAccountGeneration.generation}:${mistakeAccountGeneration.phase}:${mistakeAccountGeneration.stableId ?? ''}`;
    const [mistakeReadySnapshot, setMistakeReadySnapshot] = useState<{
        target: string;
        ownerKey: string;
        /** Готовы к отработке сейчас. */
        count: number;
        /** Все неисправленные - счётчик и пульс кнопки у «Сегодня». */
        active: number;
    } | null>(null);
    // Счётчик непросмотренных видео переехал из кнопки в шапке в этот же ряд.
    const [videoUnreadCount, setVideoUnreadCount] = useState(0);
    // зачем D130: для языка с лентой из каталога (итальянский) первый кадр берёт кэш процесса.
    const [homeV2Videos, setHomeV2Videos] = useState<readonly LingmanYoutubeVideo[]>(() => (
        homeVideoRailUsesCatalog(studyTarget) ? peekHomeVideoRailForTarget(studyTarget)?.videos ?? [] : []
    ));
    const [homeV2VideoStatus, setHomeV2VideoStatus] = useState<'loading' | 'ready' | 'error'>(() => (
        homeVideoRailUsesCatalog(studyTarget) && peekHomeVideoRailForTarget(studyTarget) ? 'ready' : 'loading'
    ));
    // зачем D132: канала на языке изучения нет → лента скрыта целиком (кэш процесса
    // даёт ответ уже на первом кадре при повторном заходе).
    const [homeV2VideoNoChannel, setHomeV2VideoNoChannel] = useState(() => (
        homeVideoRailUsesCatalog(studyTarget) && peekHomeVideoRailForTarget(studyTarget)?.source === 'no_channel_for_target'
    ));
    const latestVideoIdRef = useRef<string | null>(null);
    // зачем (владелец 2026-09-14/15): плитка «Мои ошибки» больше не подменяет
    // «Продолжить урок» — вход в раздел живёт кнопкой у заголовка «Сегодня».
    // DEV-переключатель оставлен: им проверяют порог открытия раздела без
    // реальных ошибок в журнале.
    const [devMistakesCardOverride, setDevMistakesCardOverride] = useState<'mistakes' | 'last_lesson' | null>(null);
    /**
     * Сколько «ошибок» показывает DEV-заглушка сейчас.
     *
     * зачем (владелец 2026-09-21): кнопка в шапке выдаёт СЛУЧАЙНОЕ число от 10,
     * чтобы одним тапом проверить всю цепочку: длину зарубки на progress-strip,
     * перелив за край уровня, счётчик на карточке и захват слота карточкой.
     * Живёт только в памяти экрана: это заглушка показа, в журнал ошибок она
     * ничего не пишет и на реальные данные не влияет.
     */
    const [devMistakesCount, setDevMistakesCount] = useState(DEV_HOME_MISTAKES_MIN_COUNT);
    const devMistakesCardEnabled = devMistakesCardOverride === 'mistakes';
    const mistakeSnapshotCurrent = mistakeReadySnapshot?.target === String(studyTarget)
        && mistakeReadySnapshot.ownerKey === mistakeAccountGenerationKey;
    const mistakeReadyCount = mistakeSnapshotCurrent ? mistakeReadySnapshot.count : 0;
    // зачем (владелец 2026-09-14): кнопка «Ошибки · N» у заголовка «Сегодня»
    // показывает ВСЕ неисправленные ошибки и скрыта при нуле.
    const mistakeActiveCount = ENABLE_DEV_TOOLS && devMistakesCardOverride === 'mistakes'
        ? devMistakesCount
        : mistakeSnapshotCurrent ? mistakeReadySnapshot.active : 0;
    const effectiveMistakeReadyCount = ENABLE_DEV_TOOLS && devMistakesCardOverride === 'mistakes'
        ? devMistakesCount
        : ENABLE_DEV_TOOLS && devMistakesCardOverride === 'last_lesson'
            ? 0
            : mistakeReadyCount;
    const homePriorityCardReduceMotion = useReduceMotion();
    const homePriorityCardScale = useSharedValue(1);
    const homePriorityCardLongPressHandledRef = useRef(false);
    const homePriorityCardScaleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: homePriorityCardScale.value }],
    }));
    /**
     * Какое «лицо» карточки выбрал человек долгим нажатием: урок или ошибки.
     *
     * null — человек ещё не трогал карточку, решает автозахват (при 10+
     * ошибках она сама показывает ошибки). Любое зажатие фиксирует выбор и
     * перебивает автозахват: владелец требует, чтобы жест работал ВСЕГДА.
     *
     * зачем (владелец 2026-09-21): «плашка последнего урока при зажатии
     * менялась анимированно на плашку раздела мои ошибки». Состояние живёт
     * только в памяти экрана и НЕ сохраняется на диск: это выбор показа, а не
     * награда. Durable-очередь показа — прямой запрет владельца (см. правило
     * «празднование не ставится в durable-очередь»): непоказанная запись
     * однажды всплыла бы не вовремя.
     */
    const [homePriorityCardFace, setHomePriorityCardFace] = useState<'lesson' | 'mistakes' | null>(null);
    /** Переворот карточки: 0 — покой, 1 — середина оборота (содержимое скрыто). */
    const homePriorityCardFlip = useSharedValue(0);
    /** Замок на время переворота — см. handleHomeLearningPriorityCardLongPress. */
    const homePriorityCardFlipBusyRef = useRef(false);
    const releaseHomePriorityCardFlip = useCallback(() => {
        homePriorityCardFlipBusyRef.current = false;
    }, []);
    // Страховка на размонтирование: экран живёт под freeze-on-blur, и прерванный
    // переворот иначе пережил бы уход с вкладки схлопнутой гранью.
    useEffect(() => () => {
        homePriorityCardFlip.value = 0;
        homePriorityCardFlipBusyRef.current = false;
    }, [homePriorityCardFlip]);
    const homePriorityCardFlipStyle = useAnimatedStyle(() => ({
        // Сжатие по вертикали вместо rotateX: RN-тень и градиент при настоящем
        // 3D-повороте на Android мерцают, а результат читается так же — грань
        // схлопывается и раскрывается обратно.
        transform: [{ scaleY: 1 - homePriorityCardFlip.value }],
        opacity: 1 - homePriorityCardFlip.value * 0.85,
    }));
    useEffect(() => {
        if (homePriorityCardReduceMotion) homePriorityCardScale.value = 1;
    }, [homePriorityCardReduceMotion, homePriorityCardScale]);
    /**
     * Ошибок не осталось — ручной выбор лица забываем.
     *
     * зачем (аудит 2026-09-21): без сброса старый выбор оживал. Человек
     * переключал карточку на ошибки, разбирал их все, а при появлении ОДНОЙ
     * новой карточка снова показывала ошибки — хотя порог автозахвата 10 и он
     * этого не просил. Это ровно правило фундамента «поздравляем ФАКТОМ, а не
     * записью»: сохранённый выбор описывал уже закрытую пачку ошибок.
     */
    useEffect(() => {
        if (mistakeActiveCount >= 1 || homePriorityCardFace === null) return;
        console.warn('[MISTAKES-CARD] face:reset', JSON.stringify({ // guard-ok: сброс состояния обязан быть виден в логе
            reason: 'no_active_mistakes',
            was: homePriorityCardFace,
        }));
        setHomePriorityCardFace(null);
    }, [homePriorityCardFace, mistakeActiveCount]);
    const handleHomeLearningPriorityCardPressIn = useCallback(() => {
        homePriorityCardLongPressHandledRef.current = false;
        if (homePriorityCardReduceMotion) return;
        homePriorityCardScale.value = withTiming(HOME_PRIORITY_CARD_HOLD_SCALE, { duration: HOME_PRIORITY_CARD_PRESS_IN_MS });
    }, [homePriorityCardReduceMotion, homePriorityCardScale]);
    const handleHomeLearningPriorityCardPressOut = useCallback(() => {
        homePriorityCardScale.value = homePriorityCardReduceMotion
            ? 1
            : withSpring(1, { damping: 18, stiffness: 260, mass: 0.7 });
    }, [homePriorityCardReduceMotion, homePriorityCardScale]);
    /**
     * DEV: выдать случайное число ошибок (от 10) и включить заглушку.
     *
     * зачем (владелец 2026-09-21): одним тапом проверить всю цепочку зарубки.
     * Каждый тап даёт НОВОЕ число, поэтому кнопку можно жать подряд и смотреть,
     * как меняются длина зарубки и счётчик; выключение — долгим нажатием.
     *
     * Лог печатает и само число, и то, что из него следует (ширина зарубки,
     * перелив за уровень), чтобы по одному grep `[MISTAKES-DEV]` была видна
     * вся картина, а не только «нажали кнопку».
     */
    const handleDevRandomMistakes = useCallback(() => {
        const span = DEV_HOME_MISTAKES_MAX_COUNT - DEV_HOME_MISTAKES_MIN_COUNT + 1;
        const next = DEV_HOME_MISTAKES_MIN_COUNT + Math.floor(Math.random() * span);
        console.warn('[MISTAKES-DEV] random', JSON.stringify({ // guard-ok: дев-инструмент обязан печатать, что именно подставил
            count: next,
            previousCount: devMistakesCount,
            overrideWas: devMistakesCardOverride,
            cardTakesOver: homeMistakesButtonState(next) === 'ready',
        }));
        setDevMistakesCount(next);
        setDevMistakesCardOverride('mistakes');
        // Лицо возвращаем к автозахвату (null), а не к «уроку»: иначе после
        // ручного переворота новая заглушка выглядела бы неприменившейся.
        setHomePriorityCardFace(null);
    }, [devMistakesCardOverride, devMistakesCount]);
    /** DEV: вернуть настоящие данные — долгое нажатие по той же кнопке. */
    const handleDevRandomMistakesReset = useCallback(() => {
        console.warn('[MISTAKES-DEV] reset → real data', JSON.stringify({ // guard-ok: дев-инструмент логирует выход из заглушки
            wasCount: devMistakesCount,
            overrideWas: devMistakesCardOverride,
        }));
        setDevMistakesCardOverride('last_lesson');
        setHomePriorityCardFace(null);
    }, [devMistakesCardOverride, devMistakesCount]);
    /**
     * Долгое нажатие переворачивает карточку «урок ↔ мои ошибки».
     *
     * зачем (владелец 2026-09-21): это ускоритель для того, кто уже понял, а не
     * единственная дверь — при 10+ ошибках карточка переключается сама, и жест
     * искать не нужно. Поэтому обучающего экрана здесь нет.
     *
     * Optimistic UI: лицо меняется в том же кадре, что и нажатие. Сети тут нет
     * вообще — ни запроса, ни отката: mistakeActiveCount уже лежит локально.
     */
    const handleHomeLearningPriorityCardLongPress = useCallback(() => {
        // зачем (владелец 2026-09-21): «и зажатие работало» — жест переключает
        // карточку ВСЕГДА, в том числе при 10+ ошибках. Прежний запрет возврата
        // урока снят: держать человека на одной стороне карточки нельзя, он
        // хочет видеть и урок тоже. Автозахват при 10+ при этом остаётся —
        // карточка сама встаёт на ошибки при входе на экран, а жест даёт
        // временно посмотреть урок.
        if (mistakeActiveCount < 1) {
            console.warn('[MISTAKES-CARD] longPress:ignored', JSON.stringify({ // guard-ok: ранний выход логирует причину
                reason: 'no_active_mistakes',
                activeCount: mistakeActiveCount,
                face: homePriorityCardFace,
            }));
            return;
        }
        homePriorityCardLongPressHandledRef.current = true;
        hapticTap();
        // Считаем от ВИДИМОГО лица, а не от состояния: при face === null и 10+
        // ошибках на экране уже «Мои ошибки», и переключение от null дало бы
        // снова «mistakes» — первое зажатие выглядело бы сломанным.
        const shownFace = homePriorityCardFace
            ?? (homeMistakesButtonState(mistakeActiveCount) === 'ready' ? 'mistakes' : 'lesson');
        const nextFace = shownFace === 'mistakes' ? 'lesson' : 'mistakes';
        console.warn('[MISTAKES-CARD] longPress:flip', JSON.stringify({ // guard-ok: жест обязан быть виден в логе целиком
            activeCount: mistakeActiveCount,
            faceState: homePriorityCardFace,
            shownFace,
            nextFace,
            reduceMotion: homePriorityCardReduceMotion,
        }));
        if (homePriorityCardReduceMotion) {
            setHomePriorityCardFace(nextFace);
            return;
        }
        // зачем (аудит 2026-09-21): замок от повторного входа. Без него второе
        // зажатие внутри 360 мс отменяло идущую анимацию, её колбэк приходил с
        // finished === false и прежний код просто выходил — обратное раскрытие
        // не планировалось НИКОГДА, и карточка оставалась схлопнутой полоской в
        // 15% непрозрачности. Shared value, управляющий ВИДИМОСТЬЮ, не должен
        // уметь застревать в скрытом состоянии.
        if (homePriorityCardFlipBusyRef.current) {
            console.warn('[MISTAKES-CARD] longPress:busy', JSON.stringify({ // guard-ok: ранний выход логирует причину
                reason: 'flip_in_progress',
                faceState: homePriorityCardFace,
            }));
            return;
        }
        homePriorityCardFlipBusyRef.current = true;
        // Схлопнули грань → подменили содержимое на середине → раскрыли обратно.
        homePriorityCardFlip.value = withTiming(1, { duration: 150 }, (finished) => {
            runOnJS(setHomePriorityCardFace)(nextFace);
            if (!finished) {
                // Анимацию оборвали — грань раскрываем немедленно, иначе
                // карточка останется невидимой.
                homePriorityCardFlip.value = 0;
                runOnJS(releaseHomePriorityCardFlip)();
                return;
            }
            homePriorityCardFlip.value = withTiming(0, { duration: 210 }, () => {
                runOnJS(releaseHomePriorityCardFlip)();
            });
        });
    }, [
        homePriorityCardFace,
        homePriorityCardFlip,
        homePriorityCardReduceMotion,
        mistakeActiveCount,
        releaseHomePriorityCardFlip,
    ]);
    const [requestedReportReply, setRequestedReportReply] = useState<UserNotification | null>(null);
    const handleReportReplyBannerOpen = useCallback((notification: UserNotification) => {
        setRequestedReportReply(notification);
    }, []);
    const handleRequestedReportReplyHandled = useCallback(() => {
        setRequestedReportReply(null);
    }, []);
    // Сколько раз юзер запрашивал повторный показ подсказок (0 = первый показ,
    // 1..5 = юмористические наборы №2..№6). Двигается кнопкой в настройках.
    const [homeFeatureTipsReplayCount, setHomeFeatureTipsReplayCount] = useState(0);
    const homeFeatureTips = useMemo(
        () => buildHomeFeatureTips(lang, homeFeatureTipsReplayCount),
        [lang, homeFeatureTipsReplayCount],
    );
    const [homeFeatureTipIndex, setHomeFeatureTipIndex] = useState(0);
    const [homeFeatureTipsDone, setHomeFeatureTipsDone] = useState(false);
    const [homeFeatureTipsHydrated, setHomeFeatureTipsHydrated] = useState(false);
    const homeFeatureTipTouchStartRef = useRef<{ x: number; y: number } | null>(null);
    const homeFeatureTipSwipeHandledRef = useRef(false);
    const homeFeatureTipHintPulse = useRef(new Animated.Value(0)).current;
    // Кросс-фейд содержимого карточки при смене подсказки (1 = видно, 0 = скрыто на миг перехода).
    // 0 = карточка на месте (видна), -1 = уехала (старая), 1 = ещё не приехала (новая).
    const homeFeatureTipContentAnim = useRef(new Animated.Value(0)).current;
    // зачем: владелец попросил, чтобы подсказка не подменялась мгновенно, а «уезжала»
    // и уступала место следующей из стопки. Направление задаёт знак сдвига: вперёд
    // (тап / свайп влево) — старая уходит влево, новая приходит справа; назад — наоборот.
    const homeFeatureTipDirectionRef = useRef(1);
    // Системное «Уменьшение движения» — переезд заменяем мягким фейдом (DESIGN.md: ветка обязательна).
    const homeFeatureTipReduceMotion = useReduceMotion();
    // Подложка-стопка: на миг перехода приподнимается и подаётся вперёд, будто нижняя
    // карточка выходит на место верхней. 0 = покой, 1 = пик подмены.
    const homeFeatureTipStackAnim = useRef(new Animated.Value(0)).current;
    // Ключ текущей подсказки — источник для проигрывания кросс-фейда при её смене.
    const homeFeatureTipContentKey = `${homeFeatureTipsReplayCount}:${homeFeatureTipIndex}`;
    const homeFeatureTipContentKeyRef = useRef(homeFeatureTipContentKey);
    // Отслеживаем предыдущую видимость карточки, чтобы анимировать сдвиг контента ниже
    // только на реальном появлении/исчезновении (а не на каждом ре-рендере).
    const homeFeatureTipCardWasVisibleRef = useRef(false);
    // Початкове значення підбираємо за поточною мовою інтерфейсу,
    // щоб юзер з UK не бачив миготливе російське «Привет,» до завантаження `loadData`.
    const [, setGreeting] = useState(() => triLang(lang, {
        ru: 'Привет,',
        en: 'Hi,',
        uk: 'Привіт,',
        es: 'Hola,',
        'pt-BR': "Olá,",
        vi: "Xin chào,",
        id: "Halo,",
        tr: "Merhaba,",
        pl: "Cześć,",
    }));
    const { isPremium, isVip, isPro, hasPremiumAccess } = usePremium();
    useEffect(() => {
        const applyMistakeAccountGeneration = (token: AccountGenerationToken) => {
            setMistakeAccountGeneration(token);
            setMistakeReadySnapshot(null);
            setDevMistakesCardOverride(null);
        };
        // Subscribe first, then reconcile the current snapshot: account activation
        // may happen between render and this passive effect, and that notification
        // must not be lost or the Home counter can stay on a stale generation.
        const subscription = subscribeAccountGeneration(applyMistakeAccountGeneration);
        applyMistakeAccountGeneration(captureAccountGeneration());
        return () => subscription.remove();
    }, []);
    useEffect(() => {
        if (!homeRuntimeActive) return undefined;
        if (!mistakeStudyTarget || mistakeAccountGeneration.phase !== 'active') {
            setMistakeReadySnapshot(null);
            return undefined;
        }

        let cancelled = false;
        const requestOwner = mistakeAccountGeneration;
        const requestOwnerKey = mistakeAccountGenerationKey;
        void getMistakePracticeHomeCounts(mistakeStudyTarget)
            .then((counts) => {
                if (cancelled || !isCurrentAccountGeneration(requestOwner, requestOwner.stableId)) return;
                setMistakeReadySnapshot({
                    target: String(studyTarget),
                    ownerKey: requestOwnerKey,
                    count: counts.ready,
                    active: counts.active,
                });
                // зачем (владелец 2026-09-14): подсказка хаба должна быть готова ДО
                // открытия раздела - греем раз в сутки фоном, пока человек на Главной.
                // Греем только у открытого раздела: ниже порога подсказку не увидят.
                if (homeMistakesButtonState(counts.active) === 'ready') void prewarmMistakeHubAdvice({ studyTarget: mistakeStudyTarget, lang });
                // зачем (владелец 2026-09-15): раздел ошибок открывается только от
                // порога — греть подсказку раньше незачем, она всё равно не видна.
            })
            .catch((error: unknown) => {
                // зачем: раньше catch молчал - счётчик обнулялся без следа.
                console.warn('[MISTAKES-HUB] home:counts:catch → 0', error instanceof Error ? error.message : String(error)); // guard-ok: лог в catch обязателен (правило владельца «сперва логи»)
                if (cancelled || !isCurrentAccountGeneration(requestOwner, requestOwner.stableId)) return;
                setMistakeReadySnapshot({
                    target: String(studyTarget),
                    ownerKey: requestOwnerKey,
                    count: 0,
                    active: 0,
                });
            });
        return () => {
            cancelled = true;
        };
    }, [focusTick, homeRuntimeActive, mistakeAccountGeneration, mistakeAccountGenerationKey, mistakeStudyTarget, studyTarget]);
    // зачем (владелец 2026-09-15): вход в видео переехал из шапки в ряд «Сегодня»,
    // поэтому счётчик непросмотренных читается здесь. Локальный снапшот, без сети.
    useEffect(() => {
        if (!homeRuntimeActive || !isVideoButtonEnabled()) return undefined;
        let alive = true;
        void getLingmanYoutubeSnapshot()
            .then((snapshot) => {
                if (!alive) return;
                latestVideoIdRef.current = snapshot.latestVideoId ?? snapshot.videos[0]?.id ?? null;
                setVideoUnreadCount(snapshot.unreadCount);
                // зачем D130: язык с лентой из каталога берёт видео своего канала (эффект ниже),
                // английская RSS-лента для него только считает непросмотренные.
                if (homeVideoRailUsesCatalog(studyTarget)) return;
                setHomeV2Videos(snapshot.videos);
                setHomeV2VideoStatus(snapshot.error && snapshot.videos.length === 0 ? 'error' : 'ready');
            })
            .catch((error: unknown) => {
                console.warn('[HOME-VIDEO] snapshot:catch → 0', error instanceof Error ? error.message : String(error)); // guard-ok: лог в catch обязателен
                if (alive) {
                    setVideoUnreadCount(0);
                    setHomeV2VideoStatus('error');
                }
            });
        return () => { alive = false; };
    }, [focusTick, homeRuntimeActive, studyTarget]);
    // зачем D130: при смене языка лента не показывает видео прежнего языка, пока грузится новая.
    const homeRailTargetRef = useRef(studyTarget);
    useEffect(() => {
        if (homeRailTargetRef.current === studyTarget) return;
        homeRailTargetRef.current = studyTarget;
        const peek = homeVideoRailUsesCatalog(studyTarget) ? peekHomeVideoRailForTarget(studyTarget) : null;
        setHomeV2Videos(peek?.videos ?? []);
        setHomeV2VideoStatus(peek ? 'ready' : 'loading');
        setHomeV2VideoNoChannel(peek?.source === 'no_channel_for_target');
    }, [studyTarget]);
    // зачем D130/D132: лента Главной для es/fr/de/it — канал каталога с тегом языка.
    useEffect(() => {
        if (!homeRuntimeActive || !isVideoButtonEnabled()) return undefined;
        if (!homeVideoRailUsesCatalog(studyTarget) || !homeVideosVisible) return undefined;
        let alive = true;
        void loadHomeVideoRailForTarget(studyTarget)
            .then((rail) => {
                if (!alive) return;
                setHomeV2Videos(rail.videos);
                setHomeV2VideoStatus('ready');
                setHomeV2VideoNoChannel(rail.source === 'no_channel_for_target');
            })
            .catch((error: unknown) => {
                console.warn('[LANG-SURFACE] home_rail:catch → error', { studyTarget, error: error instanceof Error ? error.message : String(error) }); // guard-ok: лог в catch обязателен
                if (alive) setHomeV2VideoStatus('error');
            });
        return () => { alive = false; };
    }, [focusTick, homeRuntimeActive, homeVideosVisible, studyTarget]);
    const [userAvatar, setUserAvatar] = useState(() => initialVisuals.avatar);
    // зачем: владелец (2026-08-27) — новичок не догадывается, что аватарка
    // кликабельна. Пока он ни разу не открыл раздел внешнего вида, она раз в
    // 20 сек качает головой и носит точку «новое». Состояние локальное
    // (AsyncStorage), Firestore не трогаем; сессия засчитывается один раз за
    // вход на Главную — бюджет 5 сессий, дальше намёк молчит сам.
    // зачем: дев-кнопка «проиграть покачивание» (владелец, 2026-08-27) — смотреть
    // анимацию по требованию, не выжидая 20 секунд и не сбрасывая бюджет сессий.
    // Счётчик, а не boolean: каждое нажатие даёт новое значение, поэтому повтор
    // срабатывает подряд сколько угодно раз. В стор-сборку не попадает.
    // зачем (D108, владелец 2026-09-30): ауры и купленные аватары удалены —
    // на Главной только монета-аватар ранга, состояния ауры больше нет.
    const [userFrame, setUserFrame] = useState(() => initialVisuals.frame);
    const [freezeActive, setFreezeActive] = useState(() => hh?.freezeActive ?? false);
    // зачем (аудит 2026-08-26): у заморозки не было защиты от повторного тапа.
    // Списание идемпотентно по ключу дня, поэтому деньги не терялись, но второй
    // тап запускал лишний круг запросов. Ref, а не state — главная не должна
    // перерисовываться из-за служебного флага.
    const freezeBusyRef = useRef(false);
    const [streakAtRisk, setStreakAtRisk] = useState(false);
    const [homeProfilePlayer, setHomeProfilePlayer] = useState<PlayerInfo | null>(null);
    const [profileIntroRequested, setProfileIntroRequested] = useState(false);
    const [titleModalVisible, setTitleModalVisible] = useState(false);
    const [selectedTitleKey, setSelectedTitleKey] = useState<string | null>(null);
    const selectedTitleHydratedRef = useRef(false);
    const [specialTitleStats, setSpecialTitleStats] = useState<HomeSpecialTitleStats>({
        helpfulReportsConfirmed: 0,
        earnedAchievementIds: new Set<string>(),
    });
    // Premium celebration: после IAP-покупки или admin-grant с timestamp новее last seen.
    const [celebrationVisible, setCelebrationVisible] = useState(false);
    const [celebrationMarker, setCelebrationMarker] = useState<string | null>(null);
    // Какую анимацию покупки показать: 'premium' (жёлтый Plus, подписка) или 'pro' (синий Phraseman Pro).
    const [celebrationVariant, setCelebrationVariant] = useState<PremiumCelebrationVariant>('premium');
    // Гард сессии: pending теперь гасится только в onClose, поэтому isCelebrationPending()
    // остаётся true до показа. Этот ref не даёт повторно ставить модалку/таймер на каждом
    // прогоне loadData до закрытия (раньше эту роль играл преждевременный consume).
    const celebrationQueuedRef = useRef(false);
    const celebrationOverlayVisible = useOverlayVisible('premiumCelebration', homeRuntimeActive && celebrationVisible);
    const [vipCelebrationVisible, setVipCelebrationVisible] = useState(false);
    const [vipCelebrationMarker, setVipCelebrationMarker] = useState<string | null>(null);
    const vipCelebrationQueuedMarkerRef = useRef<string | null>(null);
    const vipCelebrationOverlayVisible = useOverlayVisible('vipCelebration', homeRuntimeActive && vipCelebrationVisible);
    const [premiumFreezeUsed, setPremiumFreezeUsed] = useState(() => hh?.premiumFreezeUsed ?? false);
    const [lessonsCompleted, setLessonsCompleted] = useState(() => hh?.lessonsCompleted ?? 0);
    const [pageScrollEnabled, setPageScrollEnabled] = useState(true);
    const [medalCounts, setMedalCounts] = useState({ bronze: 0, silver: 0, gold: 0 });
    const { energy: energyCount, bonusEnergy: energyBonus, bonusEnergyCapacity: energyBonusCapacity = 0, maxEnergy: energyMax, recoveryIntervalMs: energyRecoveryIntervalMs, formattedTime: timeUntilNextEnergy, isUnlimited: energyUnlimited } = useEnergy();
    // зачем: раньше считался внутри renderNewHome() и был недоступен тултипу
    // энергии, который рендерится в внешнем scope — падал с ReferenceError.
    const homeEnergyTotal = Math.max(0, energyCount + energyBonus);
    const homeEnergyMax = Math.max(1, energyMax + energyBonusCapacity);
    const showHomeEnergy = !hasPremiumAccess;
    const isSketchLightTheme = isLightThemeMode(themeMode);
    const isLightTheme = isSketchLightTheme;
    const isGoldTheme = themeMode === 'gold';
    const isOliveTheme = themeMode === 'olive';
    const goldMetal = GOLD_RICH.metalGold;
    const goldBright = GOLD_RICH.champagne;
    const goldHairline = GOLD_RICH.hairline;
    const goldSoftBg = 'rgba(214,179,90,0.055)';
    const goldIconPlateBg = 'rgba(246,227,161,0.026)';
    const goldPanelBg = 'rgba(10,10,10,0.72)';
    const goldPanelRaisedBg = 'rgba(17,17,17,0.68)';
    const goldPremiumPanel = ['rgba(29,26,18,0.74)', 'rgba(13,12,10,0.64)', 'rgba(4,4,3,0.52)'] as [
        string,
        string,
        string
    ];
    const goldRaisedTile = ['rgba(32,28,18,0.72)', 'rgba(13,12,10,0.62)', 'rgba(20,16,8,0.52)'] as [
        string,
        string,
        string
    ];
    const isPaperHomeTheme = isLightThemeMode(themeMode);
    const lightPanelBg = t.bgCard;
    const lightPanelBorder = t.border;
    const lightPanelIconBg = t.accentBg;
    const lightPanelChevronBg = t.bgSurface2;
    const sketchHomePanelGradient = [t.bgCard, t.bgSurface] as [string, string];
    const homeThemePanelGradient = isGoldTheme
        ? goldPremiumPanel
        : isOliveTheme
            ? OLIVE_GRADIENTS.quietPanel
        : isPaperHomeTheme
            ? sketchHomePanelGradient
            : t.cardGradient;
    const homeThemePanelBorder = isGoldTheme
        ? GOLD_RICH.hairlineStrong
        : isOliveTheme
            ? 'transparent'
        : isPaperHomeTheme
            ? lightPanelBorder
            : 'rgba(103,153,229,0.26)';
    const homeThemePanelText = isPaperHomeTheme ? '#171615' : t.textPrimary;
    const homeThemePanelMuted = isPaperHomeTheme ? '#48443C' : t.textMuted;
    const homeThemePanelAccent = isOliveTheme ? OLIVE_RICH.champagne : isPaperHomeTheme ? t.accent : (isLightTheme ? t.textSecond : t.gold);
    const homeThemeIconPlateBg = isGoldTheme
        ? 'rgba(18,14,8,0.92)'
        : isOliveTheme ? 'rgba(13,15,11,0.96)'
        : isPaperHomeTheme
            ? lightPanelIconBg
            : 'rgba(40,47,58,0.96)';
    const homeThemeChevronBg = isGoldTheme ? goldSoftBg : isOliveTheme ? 'rgba(201,168,76,0.12)' : isPaperHomeTheme ? lightPanelChevronBg : 'rgba(255,255,255,0.09)';
    const energyEmptyTint = isSketchLightTheme
        ? 'rgba(47,49,59,0.42)'
        : 'rgba(255,245,252,0.38)';
    const energyFilledColor = t.gold;
    const sketchShardAccent = isSketchLightTheme ? '#6245B2' : '#A78BFA';
    const streakFeatherIconVariant = getStreakFeatherIconVariant(themeMode, streak);
    const streakFreezeIconVariant = getStreakFreezeIconVariant(themeMode);
    const streakIconVariant = freezeActive ? streakFreezeIconVariant : streakFeatherIconVariant;
    const streakIconInactive = !freezeActive && streak <= 0;
    const streakIconGlowStyle = streakIconInactive
        ? null
        : {
            shadowColor: streakIconVariant.accentColor,
            shadowOpacity: 0.16 + streakIconVariant.intensity * 0.10,
            shadowRadius: 4 + streakIconVariant.intensity * 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
        };
    const homeFrozenStreakIconFrameStyle = freezeActive
        ? {
            borderRadius: 14,
            backgroundColor: isGoldTheme ? 'rgba(246,227,161,0.20)' : 'rgba(100,210,255,0.24)',
            borderWidth: 1,
            borderColor: streakFreezeIconVariant.borderColor,
            shadowColor: streakFreezeIconVariant.accentColor,
            shadowOpacity: 0.36,
            shadowRadius: 9,
            shadowOffset: { width: 0, height: 2 },
            ...noAndroidOutline,
        }
        : null;
    const homeStreakIconFrameStyle = homeFrozenStreakIconFrameStyle ?? streakIconGlowStyle;
    /** Последний валидный measureInWindow — если очередное измерение вернёт 0 (Android/Fabric). */
    const energyAnchorCacheRef = useRef<EnergyInfoPopoverAnchor | null>(null);
    const [energyTooltip, setEnergyTooltip] = useState<{
        visible: boolean;
        anchor: EnergyInfoPopoverAnchor | null;
    }>({
        visible: false,
        anchor: null,
    });
    const energyIconRef = useRef<View>(null);
    const energyTooltipRequestGateRef = useRef(createEnergyPopoverRequestGate());
    const energyTooltipRequestGate = energyTooltipRequestGateRef.current;
    const energyTooltipEligible = showHomeEnergy && homeRuntimeActive;
    const energyTooltipEligibleRef = useRef(energyTooltipEligible);
    useLayoutEffect(() => {
        const lostEligibility = energyTooltipEligibleRef.current && !energyTooltipEligible;
        energyTooltipEligibleRef.current = energyTooltipEligible;
        if (lostEligibility) energyTooltipRequestGate.invalidate();
    }, [energyTooltipEligible, energyTooltipRequestGate]);
    const homeEnergyPopoverVisible = showHomeEnergy && homeRuntimeActive && energyTooltip.visible;
    const mountedRef = useRef(true);
    // зачем: last_opened_lesson_changed летит из onAppEvent-подписки внутри useEffect с
    // deps=[] (регистрируется один раз при маунте) — без рефов замыкание держало бы
    // studyTarget/lang ПЕРВОГО рендера и путало бы уроки/язык названия при смене на лету.
    const studyTargetRef = useRef(studyTarget);
    useEffect(() => { studyTargetRef.current = studyTarget; }, [studyTarget]);
    const langRef = useRef(lang);
    useEffect(() => { langRef.current = lang; }, [lang]);
    const [shardsBalance, setShardsBalance] = useState(() => peekLastKnownShardsBalance() ?? hh?.shardsBalance ?? snapshotShards);
    const [runesBalance, setRunesBalance] = useState(() => peekRunes());
    // зачем: помним, ЧЕЙ баланс сейчас на экране, чтобы отличить смену аккаунта
    // (обнулять обязательно) от инициализации того же аккаунта на старте (нельзя).
    const runesOwnerRef = useRef<string | null>(captureAccountGeneration().stableId?.trim() || null);
    const reconcileHomeRunes = useCallback((token = captureAccountGeneration()) => {
        const stableId = token.stableId?.trim();
        if (!stableId || !isCurrentAccountGeneration(token, stableId)) return;
        void getRunesBalance().then(({ balance }) => {
            if (mountedRef.current && isCurrentAccountGeneration(token, stableId)) {
                setRunesBalance(balance);
            }
        }).catch(() => {
            // Первый кадр уже взят из snapshot; durable-сверка может безопасно повториться на focus.
        });
    }, []);
    useEffect(() => {
        const unsubscribeRunesSnapshot = subscribeAppSnapshot(() => {
            setRunesBalance(peekRunes());
        });
        const runesAccountSubscription = subscribeAccountGeneration((token) => {
            // Никогда не показываем retained-значение предыдущего аккаунта.
            //
            // зачем (владелец, 2026-08-24: «счёт рун на секунду показал неправду»):
            // раньше здесь стоял БЕЗУСЛОВНЫЙ ноль. Но это событие летит не только
            // при смене аккаунта — cloud_sync зовёт beginInitialAccountGeneration(uid)
            // на обычном старте, уже ПОСЛЕ первого кадра Главной. Правильный баланс
            // успевал отрисоваться, затем падал в 0 и через сеть возвращался обратно.
            // Обнуляем только когда владелец баланса на экране реально сменился.
            const previousOwner = runesOwnerRef.current;
            const nextOwner = token.stableId?.trim() || null;
            const ownerChanged = previousOwner !== null && previousOwner !== nextOwner;
            runesOwnerRef.current = nextOwner;
            if (ownerChanged) setRunesBalance(0);
            if (homeRuntimeActiveRef.current && token.phase === 'active') {
                reconcileHomeRunes(token);
            }
        });
        return () => {
            unsubscribeRunesSnapshot();
            runesAccountSubscription.remove();
        };
    }, [reconcileHomeRunes]);
    useEffect(() => {
        if (homeRuntimeActive) reconcileHomeRunes();
    }, [focusTick, homeRuntimeActive, reconcileHomeRunes]);
    const shardsAnim = useRef(new Animated.Value(1)).current;
    const shardsBonusAnim = useRef(new Animated.Value(0)).current;
    const [shardsBonusText, setShardsBonusText] = useState('');
    // Сбор наград: частицы со всех сторон экрана в счётчики валют.
    //
    // Гейт homeRuntimeActive — тот же, что у остальных эффектов Главной: на
    // премаунте таба анимация не запускается и первый кадр не делит поток.
    const homeRewardCollectReduceMotion = useReduceMotion();
    const rewardCollect = useHomeRewardCollect(
        homeRuntimeActive,
        homeRewardCollectReduceMotion,
        // Балансы — точка отсчёта для докрутки числа: к моменту волны они уже
        // новые, поэтому счётчик крутится от «минус прилетевшее» к текущему.
        { runes: runesBalance, shards: shardsBalance },
    );
    // Иконки валют объявлены на ВЕРХНЕМ уровне компонента, а не внутри
    // renderNewHome.
    //
    // зачем: их читает не только шапка, но и оверлей полёта частиц, который
    // рендерится в главном return — за пределами renderNewHome. Когда они жили
    // внутри той функции, экран падал «Property 'homeHeaderRuneIconSource'
    // doesn't exist» на первом же кадре.
    const homeHeaderShardIconSource = coinIconForBalance(shardsBalance, themeMode);
    // Ассет руны для летящих частиц — ТОТ ЖЕ файл, что рисует HomeRuneBalance
    // в шапке. Одна валюта обязана выглядеть одинаково: частица другой
    // картинкой читалась бы как другая награда.
    const homeHeaderRuneIconSource = HOME_RUNE_ICON_SOURCE;
    const homeCoinRankSource = isValidCoinRank(myCoinRank) ? coinRankRowForDisplay(myCoinRank).source : null;

    // Дев-кнопка «показать анимацию»: шесть режимов по кругу (владелец,
    // 2026-09-01). Смотреть анимацию нужно по требованию, а не выжидая реальное
    // начисление, и по отдельности — иначе не видно, что именно сломалось.
    //
    // Очередь наград НЕ расходуется: демо получает суммы напрямую, поэтому
    // настоящая награда, ждущая показа, не «съедается» просмотром.
    const [homeDemoStep, setHomeDemoStep] = useState(0);
    const homeDemoModes = HOME_REWARD_DEMO_MODES;
    const homeDemoMode = homeDemoModes[homeDemoStep % homeDemoModes.length];
    const runHomeRewardDemo = useCallback(() => {
        const mode = homeDemoModes[homeDemoStep % homeDemoModes.length];
        setHomeDemoStep((step) => (step + 1) % homeDemoModes.length);
        if (mode.runes > 0 || mode.shards > 0) {
            rewardCollect.playDemo(mode.runes, mode.shards);
        }
    }, [homeDemoModes, homeDemoStep, rewardCollect]);
    useEffect(() => {
        const profile = appSnapshot.profile;
        const progress = appSnapshot.progress;
        if (!shouldApplyHomeSnapshotToStats(homeStatsLoadedOnce, profile?.source, progress?.source)) return;
        if (!profile && !progress) return;
        setHomeStatsReady(true);
        if (profile?.name) setUserName((current) => current || profile.name);
        if (profile) {
            const visuals = resolveHomeProfileVisuals({ snapshot: profile });
            setUserAvatar((current) => current === visuals.avatar ? current : visuals.avatar);
            setUserFrame((current) => current === visuals.frame ? current : visuals.frame);
        }
        if (progress && (progress.source === 'live' || (streak === 0 && progress.streak > 0))) {
            setStreak(progress.streak);
            setDisplayStreak((current) => progress.source === 'live' ? progress.streak : current || progress.streak);
        }
        if (progress && shardsBalance === 0 && progress.shards > 0) setShardsBalance(progress.shards);
    }, [appSnapshot.profile, appSnapshot.progress, shardsBalance, streak]);

    const streakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const statsHintPulseAnim = useRef(new Animated.Value(1)).current;
    const [showStatsPulseHint, setShowStatsPulseHint] = useState(false);
    const [homeHintText, setHomeHintText] = useState<string | null>(null);
    const homeHintSnapshotRef = useRef<PublishedHomeHints | null>(null);
    // зачем (владелец 2026-09-22, «что в фоне тормозит»): пульс подсказки над
    // блоком статистики запускался БЕЗ ссылки на цикл и без гарда активности —
    // в отличие от двух соседних циклов в этом же файле, у которых гард есть.
    // Цикл продолжал крутиться после ухода с Главной и в свёрнутом приложении,
    // потому что остановить его было нечем: hideHomeHint зовётся не всегда.
    // Теперь ссылка живёт в ref и гасится при потере активности экрана.
    const statsHintLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    const showHomeHint = useCallback((text: string) => {
        statsHintLoopRef.current?.stop();
        statsHintLoopRef.current = null;
        statsHintPulseAnim.stopAnimation();
        statsHintPulseAnim.setValue(1);
        setHomeHintText(text);
        setShowStatsPulseHint(true);
        if (homeMotionReduceMotion) return;
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(statsHintPulseAnim, { toValue: 0.52, duration: 2200, useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER }),
            Animated.timing(statsHintPulseAnim, { toValue: 1, duration: 2200, useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER }),
        ]));
        statsHintLoopRef.current = loop;
        loop.start();
    }, [homeMotionReduceMotion, statsHintPulseAnim]);
    const hideHomeHint = useCallback(() => {
        statsHintLoopRef.current?.stop();
        statsHintLoopRef.current = null;
        statsHintPulseAnim.stopAnimation();
        statsHintPulseAnim.setValue(1);
        setShowStatsPulseHint(false);
    }, [statsHintPulseAnim]);
    // зачем: экран ушёл из фокуса или приложение свернули — пульс обязан встать.
    // Без этого он крутился в фоне и грел процессор впустую (см. showHomeHint).
    useEffect(() => {
        if (homeRuntimeActive) return undefined;
        statsHintLoopRef.current?.stop();
        statsHintLoopRef.current = null;
        statsHintPulseAnim.stopAnimation();
        return undefined;
    }, [homeRuntimeActive, statsHintPulseAnim]);
    useEffect(() => {
        if (!homeRuntimeActive) return undefined;
        if (homeHintShownThisAppSession) return undefined;
        homeHintShownThisAppSession = true;
        let cancelled = false;
        const audience = hasPremiumAccess || isPremium || isVip || isPro ? 'plus' : 'free';
        const showRandomFromSnapshot = (snapshot: PublishedHomeHints, source: string) => {
            const selected = pickRandomHomeHint(snapshot.items.filter((item) => item.audience === 'all' || item.audience === audience));
            if (__DEV__) console.log('[HOME-HINT] показываю подсказку', {
                source,
                audience,
                snapshotVersion: snapshot.version,
                hintId: selected?.id ?? null,
                usedFallback: !selected,
            });
            showHomeHint(selected
                ? resolveHomeHintText(selected, lang, s.home.statsPulseHint)
                : s.home.statsPulseHint);
        };
        if (!homeHintSnapshotRef.current) homeHintSnapshotRef.current = SELECTED_HOME_HINTS_SNAPSHOT;
        const localSnapshot = homeHintSnapshotRef.current;
        // Показываем локально сразу, не дожидаясь динамического Firestore-модуля.
        // Сеть затем может заменить снапшот, но первый кадр главной уже содержит hint.
        showRandomFromSnapshot(localSnapshot, 'local-snapshot');
        void loadPublishedHomeHintsSnapshot()
            .then((snapshot) => {
                if (cancelled || !snapshot || snapshot.version === homeHintSnapshotRef.current?.version) return;
                homeHintSnapshotRef.current = snapshot;
                showRandomFromSnapshot(snapshot, 'published-snapshot');
            })
            .catch((error) => {
                console.warn('[HOME-HINT] загрузка опубликованного снапшота упала', { reason: String(error) });
            });
        return () => {
            cancelled = true;
            hideHomeHint();
        };
    }, [homeRuntimeActive]);
    const handleDevHomeHintDemo = useCallback(() => {
        if (!ENABLE_DEV_TOOLS) return;
        const hint = pickRandomHomeHint(homeHintSnapshotRef.current?.items ?? DEV_HOME_HINT_FIXTURES);
        if (!hint) return;
        showHomeHint(resolveHomeHintText(hint, lang, hint.textRu));
    }, [lang, showHomeHint]);
    // зачем (спека Daily Journey 2026-08-30, пп. 5.9 и 6): подтверждение
    // доставки — один сдержанный пульс карточки «Статистика» (1→1.035→1) и
    // вход «Подарок» в независимом правом слоте, пока есть непрочитанные.
    const dailyJourneyPulseAnim = useRef(new Animated.Value(1)).current;
    const dailyJourneyPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
    const homeStatsCardRef = useRef<View | null>(null);
    const homeGiftEntryTargetRef = useRef<View | null>(null);
    const dailyJourneyReduceMotion = useReduceMotion();
    const dailyJourneyReduceMotionRef = useRef(dailyJourneyReduceMotion);
    dailyJourneyReduceMotionRef.current = dailyJourneyReduceMotion;
    const dailyJourneyRuntimeRef = useRef({ active: false, epoch: 0 });
    const [dailyJourneyUnreadCount, setDailyJourneyUnreadCount] = useState(0);
    const [dailyJourneyDelivery, setDailyJourneyDelivery] = useState<DailyJourneyHomePresentedDelivery | null>(null);
    const dailyJourneyDeliveryRef = useRef<DailyJourneyHomePresentedDelivery | null>(null);
    dailyJourneyDeliveryRef.current = dailyJourneyDelivery;
    const dailyJourneyDeferredPulseRef = useRef(false);
    const dailyJourneyOverlayVisible = useOverlayVisible('dailyJourneyDev', dailyJourneyDelivery != null);

    const reportDailyJourneyHomeError = useCallback((scope: string, error: unknown, showFeedback = false) => {
        DebugLogger.error(`home:daily_journey:${scope}`, error instanceof Error ? error : new Error(String(error)), 'warning');
        if (!showFeedback) return;
        emitAppEvent('action_toast', {
            type: 'error',
            messageRu: 'Подарок не сохранён. Попробуй ещё раз.',
            messageUk: 'Подарунок не збережено. Спробуй ще раз.',
            messageEn: 'The gift was not saved. Try again.',
            messageEs: 'No se guardó el regalo. Inténtalo de nuevo.',
            messagePtBr: 'O presente não foi salvo. Tente novamente.',
            messageVi: 'Chưa lưu được quà. Hãy thử lại.',
            messageId: 'Hadiah belum tersimpan. Coba lagi.',
            messageTr: 'Hediye kaydedilemedi. Tekrar dene.',
            messagePl: 'Nie zapisano prezentu. Spróbuj ponownie.',
        });
    }, []);

    const dailyJourneyProjectionController = useMemo(() => createDailyJourneyHomeProjectionController<AccountGenerationToken>({
        captureToken: captureAccountGeneration,
        isTokenCurrent: isCurrentAccountGeneration,
        readProjection: (token) => readDailyJourneyGiftProjection(token),
        displayUnreadCount: setDailyJourneyUnreadCount,
        reportError: (scope, error) => reportDailyJourneyHomeError(scope, error),
    }), [reportDailyJourneyHomeError]);

    const stopDailyJourneyPulse = useCallback(() => {
        dailyJourneyPulseAnimationRef.current?.stop();
        dailyJourneyPulseAnimationRef.current = null;
        dailyJourneyPulseAnim.stopAnimation();
        dailyJourneyPulseAnim.setValue(1);
    }, [dailyJourneyPulseAnim]);

    const startDailyJourneyPulse = useCallback(() => {
        stopDailyJourneyPulse();
        const animation = Animated.sequence([
            Animated.timing(dailyJourneyPulseAnim, { toValue: 1.035, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER }), // guard-ok: native transform only
            Animated.timing(dailyJourneyPulseAnim, { toValue: 1, duration: 240, easing: Easing.inOut(Easing.quad), useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER }), // guard-ok: native transform only
        ]);
        dailyJourneyPulseAnimationRef.current = animation;
        animation.start(() => {
            if (dailyJourneyPulseAnimationRef.current === animation) dailyJourneyPulseAnimationRef.current = null;
        });
    }, [dailyJourneyPulseAnim, stopDailyJourneyPulse]);

    const measureDailyJourneyGiftTarget = useCallback((runtimeEpoch = dailyJourneyRuntimeRef.current.epoch): Promise<DailyJourneyHomeTargetRect | null> => {
        const node = homeGiftEntryTargetRef.current;
        if (!node || typeof node.measureInWindow !== 'function') {
            return Promise.resolve(null);
        }
        return measureDailyJourneyHomeTarget({
            measure: (callback) => node.measureInWindow(callback),
            isCurrent: () => dailyJourneyRuntimeRef.current.active
                && dailyJourneyRuntimeRef.current.epoch === runtimeEpoch,
            windowHeight: Dimensions.get('window').height,
        });
    }, []);
    const measureDailyJourneyGiftTargetRef = useRef(measureDailyJourneyGiftTarget);
    measureDailyJourneyGiftTargetRef.current = measureDailyJourneyGiftTarget;

    const dailyJourneyDeliveryController = useMemo(() => createDailyJourneyHomeDeliveryController<AccountGenerationToken>({
        isTokenCurrent: isCurrentAccountGeneration,
        displayDelivery: setDailyJourneyDelivery,
        startPulse: startDailyJourneyPulse,
        stopPulse: stopDailyJourneyPulse,
        shouldReduceMotion: () => dailyJourneyReduceMotionRef.current,
    }), [startDailyJourneyPulse, stopDailyJourneyPulse]);

    const completeDailyJourneyDelivery = useCallback(() => {
        dailyJourneyDeliveryController.complete();
    }, [dailyJourneyDeliveryController]);

    const handleDailyJourneyLanded = useCallback((occurrenceId: string | null) => {
        dailyJourneyDeliveryController.landed(occurrenceId);
    }, [dailyJourneyDeliveryController]);

    const dailyJourneyGrantController = useMemo(() => createDailyJourneyHomeGrantController<AccountGenerationToken>({
        createOperationId: () => Crypto.randomUUID(),
        captureToken: captureAccountGeneration,
        isTokenCurrent: isCurrentAccountGeneration,
        captureRuntimeEpoch: () => dailyJourneyRuntimeRef.current.epoch,
        isRuntimeActive: (epoch) => dailyJourneyRuntimeRef.current.active
            && dailyJourneyRuntimeRef.current.epoch === epoch,
        commit: (input, token: AccountGenerationToken) => commitDailyJourneyGift(input, token),
        measureTarget: (epoch) => measureDailyJourneyGiftTargetRef.current(epoch),
        enqueueModal: (delivery, token) => { dailyJourneyDeliveryController.offer(delivery, token); },
        deferModal: (delivery, token) => { dailyJourneyDeliveryController.offer(delivery, token); },
        reportError: (scope, error) => reportDailyJourneyHomeError(scope, error, scope !== 'measure'),
    }), [dailyJourneyDeliveryController, reportDailyJourneyHomeError]);

    useEffect(() => {
        const deliveredSub = onAppEvent('daily_journey_delivered', ({ occurrenceId }) => {
            // Home's own dev delivery has an explicit onLanded callback below.
            if (dailyJourneyDeliveryRef.current) return;
            if (!dailyJourneyRuntimeRef.current.active) {
                dailyJourneyDeferredPulseRef.current = occurrenceId !== null;
                return;
            }
            if (occurrenceId !== null && !dailyJourneyReduceMotionRef.current) startDailyJourneyPulse();
        });
        return () => deliveredSub.remove();
    }, [startDailyJourneyPulse]);

    useEffect(() => {
        dailyJourneyRuntimeRef.current = {
            active: homeRuntimeActive,
            epoch: dailyJourneyRuntimeRef.current.epoch + 1,
        };
        dailyJourneyDeliveryController.setActive(homeRuntimeActive);
        if (homeRuntimeActive) {
            void dailyJourneyProjectionController.activate().catch((error) => reportDailyJourneyHomeError('projection_activate', error));
            if (dailyJourneyDeferredPulseRef.current) {
                dailyJourneyDeferredPulseRef.current = false;
                if (!dailyJourneyReduceMotionRef.current) startDailyJourneyPulse();
            }
        } else {
            dailyJourneyProjectionController.deactivate();
        }
    }, [dailyJourneyDeliveryController, dailyJourneyProjectionController, focusTick, homeRuntimeActive, reportDailyJourneyHomeError, startDailyJourneyPulse]);

    useEffect(() => {
        if (!homeRuntimeActive) return undefined;
        const changedSub = onAppEvent('daily_journey_gifts_changed', () => {
            void dailyJourneyProjectionController.reload().catch((error) => reportDailyJourneyHomeError('projection_event', error));
        });
        return () => {
            changedSub.remove();
        };
    }, [dailyJourneyProjectionController, homeRuntimeActive, reportDailyJourneyHomeError]);

    useEffect(() => {
        const accountSub = subscribeAccountGeneration((token) => {
            dailyJourneyRuntimeRef.current = {
                ...dailyJourneyRuntimeRef.current,
                epoch: dailyJourneyRuntimeRef.current.epoch + 1,
            };
            dailyJourneyDeliveryController.resetForAccount();
            dailyJourneyGrantController.resetForAccount();
            void dailyJourneyProjectionController.resetForAccount().catch((error) => reportDailyJourneyHomeError('projection_account', error));
        });
        return () => accountSub.remove();
    }, [dailyJourneyDeliveryController, dailyJourneyGrantController, dailyJourneyProjectionController, reportDailyJourneyHomeError]);

    useEffect(() => {
        // DevHub preview compatibility: it has no direct Home target prop, so
        // this bridge returns the center of the stable Gift-button slot.
        const unregister = registerDailyJourneyRevealTargetMeasurer(async () => {
            const rect = await measureDailyJourneyGiftTargetRef.current();
            return rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null;
        });
        return unregister;
    }, []);

    useEffect(() => {
        if (dailyJourneyReduceMotion) stopDailyJourneyPulse();
    }, [dailyJourneyReduceMotion, stopDailyJourneyPulse]);

    useEffect(() => () => {
        dailyJourneyRuntimeRef.current = {
            active: false,
            epoch: dailyJourneyRuntimeRef.current.epoch + 1,
        };
        dailyJourneyDeliveryController.dispose();
        dailyJourneyProjectionController.dispose();
    }, [dailyJourneyDeliveryController, dailyJourneyProjectionController]);
    const eliteStatusEntrance = useRef(new Animated.Value(1)).current;
    const eliteQuickTileEntrance = useRef(Array.from({ length: 3 }, () => new Animated.Value(1))).current;
    const eliteActivityTileEntrance = useRef(Array.from({ length: 3 }, () => new Animated.Value(1))).current;
    const closeEnergyTooltip = useCallback(() => {
        energyTooltipRequestGate.invalidate();
        setEnergyTooltip((previous) => previous.visible
            ? { ...previous, visible: false }
            : previous);
    }, [energyTooltipRequestGate]);
    useEffect(() => {
        if ((!showHomeEnergy || !homeRuntimeActive) && energyTooltip.visible) closeEnergyTooltip();
    }, [closeEnergyTooltip, energyTooltip.visible, homeRuntimeActive, showHomeEnergy]);
    const showEnergyTooltip = useCallback(() => {
        if (!showHomeEnergy || !homeRuntimeActive) return;
        const requestGeneration = energyTooltipRequestGate.begin();
        hapticTap();
        const openWithAnchor = (measured: EnergyInfoPopoverAnchor | null) => {
            if (!energyTooltipEligibleRef.current
                || !energyTooltipRequestGate.isCurrent(requestGeneration)) return;
            const fresh = measured && measured.w > 0 && measured.h >= 0
                ? measured
                : energyAnchorCacheRef.current;
            if (measured && measured.w > 0 && measured.h >= 0) {
                energyAnchorCacheRef.current = measured;
            }
            setEnergyTooltip({ visible: true, anchor: fresh });
        };
        const node = energyIconRef.current;
        if (node && typeof node.measureInWindow === 'function') {
            node.measureInWindow((px, py, width, height) => {
                openWithAnchor(width > 0 && height > 0
                    ? { x: px, y: py, w: width, h: Math.max(height, 24) }
                    : null);
            });
            return;
        }
        openWithAnchor(null);
    }, [energyTooltipRequestGate, homeRuntimeActive, showHomeEnergy]);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const diagChecked = true;
    // Секции главной: без entrance-анимации при открытии таба / возврате в приложение (сразу видимы).
    const S_COUNT = 6;
    const sectionOpacity = useRef(Array.from({ length: S_COUNT }, () => new Animated.Value(1))).current;
    const sectionSlide = useRef(Array.from({ length: S_COUNT }, () => new Animated.Value(0))).current;
    const sectionStyle = (i: number) => ({
        opacity: sectionOpacity[i],
        transform: [{ translateY: sectionSlide[i] }],
    });
    useEffect(() => {
        if (!homeRuntimeActive) return undefined;
        fadeAnim.setValue(0);
        const animation = Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER });
        animation.start();
        return () => animation.stop();
    }, [fadeAnim, homeRuntimeActive, lang, studyTarget]);
    useEffect(() => {
        if (!homeRuntimeActive)
            return;
        eliteStatusEntrance.setValue(1);
        eliteQuickTileEntrance.forEach((anim) => anim.setValue(1));
        eliteActivityTileEntrance.forEach((anim) => anim.setValue(1));
        // зачем: владелец (2026-07-27) — «свечение на главной, которое стихает за
        // пару секунд, убрать». Это был бегущий блик по старому hero-strip: цикл на
        // 2.8 c + пауза, глушился таймером на 7.6 c — отсюда и ощущение затухания.
        // Вместе с ним ушли таймер, AppState-подписка и вечный кадр анимации.
    }, [eliteActivityTileEntrance, eliteQuickTileEntrance, eliteStatusEntrance, homeRuntimeActive, lang]);
    // Историческая migration-логика больше не выполняется на экране.
    // (вызывается на старте из _layout.tsx) — one-shot миграциям не место в маунте таба (D4).
    // D4: секции ниже первого экрана (подсказки, быстрый доступ, ошибки,
    // фраза дня, подвал) монтируются вторым проходом после первого кадра.
    // зачем: флаг стартовал с false на КАЖДОМ маунте главной. При возврате с любого
    // раздела таб размораживается заново, флаг опять false — и «Цель лиги»,
    // фраза дня, подвал пропадали, а через кадр (runAfterInteractions) вставлялись в поток,
    // толкая верстку. Владелец: «возврат на главную — элементы появляются с задержкой,
    // хочу как в Bevel: сразу видно всю страницу». Второй проход нужен ТОЛЬКО первому
    // маунту в сессии (бюджет холодного старта): дальше отдаём готовую страницу сразу.
    const [belowFoldReady, setBelowFoldReady] = useState(homeBelowFoldReadyOnce);
    useEffect(() => {
        if (!homeRuntimeActive) return undefined;
        if (homeBelowFoldReadyOnce) return undefined;
        const task = InteractionManager.runAfterInteractions(() => {
            homeBelowFoldReadyOnce = true;
            setBelowFoldReady(true);
        });
        return () => { task?.cancel?.(); };
    }, [homeRuntimeActive]);
    useEffect(() => {
        mountedRef.current = true;
        perfScreenMount('home');
        const requestHomeDataRefresh = () => {
            if (!homeRuntimeActiveRef.current) {
                homeDataDirtyRef.current = true;
                return;
            }
            loadData();
        };
        let resumeTimer: ReturnType<typeof setTimeout> | null = null;
        let resumeTask: {
            cancel?: () => void;
        } | null = null;
        let backgroundedAt: number | null = null;
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                const backgroundDurationMs = backgroundedAt == null ? null : Date.now() - backgroundedAt;
                backgroundedAt = null;
                const refreshKind = backgroundDurationMs == null ? 'none' : getForegroundRefreshKind(backgroundDurationMs);
                if (resumeTimer)
                    clearTimeout(resumeTimer);
                resumeTask?.cancel?.();
                if (refreshKind === 'none')
                    return;
                resumeTimer = setTimeout(() => {
                    resumeTimer = null;
                    resumeTask = InteractionManager.runAfterInteractions(() => {
                        if (refreshKind === 'cloud') requestHomeDataRefresh();
                    });
                }, refreshKind === 'cloud' ? FOREGROUND_CLOUD_REFRESH_DELAY_MS : FOREGROUND_LIGHT_REFRESH_DELAY_MS);
            }
            else {
                if (state === 'background') homeHintShownThisAppSession = false;
                if (backgroundedAt == null)
                    backgroundedAt = Date.now();
                if (resumeTimer) {
                    clearTimeout(resumeTimer);
                    resumeTimer = null;
                }
                resumeTask?.cancel?.();
            }
        });
        // Точный локальный баланс уже зафиксирован клиентским журналом до события.
        // Подарочные credit-операции могут не эмитить shards_earned, поэтому главная
        // обновляет цифру напрямую и не ждёт ни AsyncStorage, ни фоновой записи сервера.
        const shardsBalanceSub = onAppEvent('shards_balance_updated', (payload) => {
            if (!homeRuntimeActiveRef.current) {
                shardsDirtyRef.current = true;
                return;
            }
            setShardsBalance(payload.balance);
        });
        // Слушаем событие начисления осколков для анимации награды.
        const shardsSub = DeviceEventEmitter.addListener('shards_earned', (payload: {
            amount: number;
        }) => {
            if (!homeRuntimeActiveRef.current) {
                shardsDirtyRef.current = true;
                return;
            }
            getShardsBalance().then(bal => {
                if (!homeRuntimeActiveRef.current) {
                    shardsDirtyRef.current = true;
                    return;
                }
                setShardsBalance(bal);
                // зачем: надпись всплывает прямо над иконкой баланса жемчужин —
                // эмодзи-алмаз 💎 дублировал бы ассет, который уже на экране.
                setShardsBonusText(`+${payload.amount}`);
                shardsBonusAnim.setValue(0);
                Animated.sequence([
                    Animated.timing(shardsBonusAnim, { toValue: 1, duration: 300, useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER }),
                    Animated.delay(900),
                    Animated.timing(shardsBonusAnim, { toValue: 0, duration: 400, useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER }),
                ]).start();
                Animated.sequence([
                    Animated.spring(shardsAnim, { toValue: 1.35, useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER, friction: 3 }),
                    Animated.spring(shardsAnim, { toValue: 1, useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER, friction: 5 }),
                ]).start();
            });
        });
        // зачем (D107, владелец 30.09): платное восстановление серии удалено целиком —
        // подписки streak_revive_offer/streak_revived и модалка оффера убраны.
        const refreshWeekMarkers = () => {
            if (!homeRuntimeActiveRef.current) {
                streakMarkersDirtyRef.current = true;
                return;
            }
            void readCurrentStreakWeekMarkers().then((markers) => {
                if (!mountedRef.current) return;
                if (!homeRuntimeActiveRef.current) {
                    streakMarkersDirtyRef.current = true;
                    return;
                }
                setWeekMarkers(markers);
            }).catch(() => {});
        };
        const freezeUpdatedSub = onAppEvent('streak_freeze_updated', refreshWeekMarkers);
        // зачем: владелец — «зашёл в урок, а карточка "Продолжить урок" на Главной ещё
        // старая, пока не перезайду в приложение». lesson1.tsx эмитит это СРАЗУ при входе
        // в урок (см. lesson1.tsx рядом с correctCount/score). Патчим state напрямую —
        // не requestHomeDataRefresh: полный loadData() дороже (streak/legacy state) и не
        // нужен ради одной карточки, к тому же дешёвый путь работает и когда home сейчас
        // не активна (homeRuntimeActiveRef), в отличие от dirty-флагов выше.
        const lastOpenedLessonSub = onAppEvent('last_opened_lesson_changed', (payload) => {
            if (!payload || !mountedRef.current) return;
            if ((payload.studyTarget ?? undefined) !== studyTargetRef.current) return;
            const lessonNames = lessonNamesForStudyTarget(langRef.current, studyTargetRef.current);
            const name = lessonNames[payload.lessonId - 1];
            if (!name) return;
            setLastLesson({ id: payload.lessonId, name, progress: payload.progress, score: payload.score });
        });
        const onboardingCompletedSub = onAppEvent('onboarding_completed', () => {
            setHomeOnboardingDone(true);
            // зачем: купил Plus прямо в онбординге → markCelebrationPending() уже
            // записан (paywall_purchase.ts), но Home был смонтирован ПОД онбордингом
            // ещё до покупки и его первый loadData() проверил celebration раньше, чем
            // флаг появился — второй проверки не было никогда, экран после покупки
            // просто исчезал. requestHomeDataRefresh() либо перезагрузит сразу (если
            // homeRuntimeActive уже true), либо взведёт homeDataDirtyRef — эффект на
            // [homeRuntimeActive, focusTick] подхватит его тем же тиком, когда
            // homeOnboardingDone включит homeRuntimeActive.
            requestHomeDataRefresh();
        });
        return () => {
            mountedRef.current = false;
            sub.remove();
            if (resumeTimer)
                clearTimeout(resumeTimer);
            resumeTask?.cancel?.();
            shardsBalanceSub.remove();
            shardsSub.remove();
            freezeUpdatedSub.remove();
            lastOpenedLessonSub.remove();
            onboardingCompletedSub.remove();
            deferredReadyTaskRef.current?.cancel?.();
            deferredReadyTaskRef.current = null;
            deferredReloadTaskRef.current?.cancel?.();
            deferredReloadTaskRef.current = null;
            if (deferredReloadTimerRef.current) {
                clearTimeout(deferredReloadTimerRef.current);
                deferredReloadTimerRef.current = null;
            }
            if (streakTimerRef.current)
                clearTimeout(streakTimerRef.current);
        };
    }, []);
    // Домашние подсказки: finite-серия карточек вместо старого CTA плана.
    useEffect(() => {
        let cancelled = false;
        AsyncStorage.multiGet([HOME_FEATURE_TIPS_INDEX_KEY, HOME_FEATURE_TIPS_DONE_KEY, HOME_FEATURE_TIPS_REPLAY_COUNT_KEY, HOME_ONBOARDING_DONE_KEY])
            .then((pairs) => {
                if (cancelled) return;
                const stored = new Map(pairs);
                const nextIndex = clampHomeFeatureTipIndex(Number(stored.get(HOME_FEATURE_TIPS_INDEX_KEY) ?? 0), homeFeatureTips.length);
                setHomeFeatureTipIndex(nextIndex);
                setHomeFeatureTipsDone(stored.get(HOME_FEATURE_TIPS_DONE_KEY) === '1');
                setHomeFeatureTipsReplayCount(clampHomeFeatureTipReplayCount(Number(stored.get(HOME_FEATURE_TIPS_REPLAY_COUNT_KEY) ?? 0)));
                setHomeOnboardingDone(stored.get(HOME_ONBOARDING_DONE_KEY) === '1');
                setHomeFeatureTipsHydrated(true);
            })
            .catch(() => {
                if (cancelled) return;
                setHomeFeatureTipsHydrated(true);
            });
        return () => {
            cancelled = true;
        };
    }, [homeFeatureTips.length]);
    const persistHomeFeatureTipIndex = useCallback((nextIndex: number) => {
        const clamped = clampHomeFeatureTipIndex(nextIndex, homeFeatureTips.length);
        setHomeFeatureTipIndex(clamped);
        AsyncStorage.setItem(HOME_FEATURE_TIPS_INDEX_KEY, String(clamped)).catch(() => {});
    }, [homeFeatureTips.length]);
    const completeHomeFeatureTips = useCallback(() => {
        // Последняя карточка исчезает → блоки ниже плавно возвращаются вверх.
        configureAccordionLayout();
        setHomeFeatureTipsDone(true);
        AsyncStorage.multiSet([
            [HOME_FEATURE_TIPS_DONE_KEY, '1'],
            [HOME_FEATURE_TIPS_INDEX_KEY, String(Math.max(0, homeFeatureTips.length - 1))],
        ]).catch(() => {});
    }, [homeFeatureTips.length]);
    const advanceHomeFeatureTip = useCallback(() => {
        if (homeFeatureTipsDone) return;
        const nextIndex = homeFeatureTipIndex + 1;
        if (nextIndex >= homeFeatureTips.length) {
            completeHomeFeatureTips();
            return;
        }
        // Направление подмены фиксируем ДО setState — эффект анимации читает его уже по новому ключу.
        homeFeatureTipDirectionRef.current = 1;
        persistHomeFeatureTipIndex(nextIndex);
    }, [completeHomeFeatureTips, homeFeatureTipIndex, homeFeatureTips.length, homeFeatureTipsDone, persistHomeFeatureTipIndex]);
    const previousHomeFeatureTip = useCallback(() => {
        if (homeFeatureTipsDone) return;
        if (homeFeatureTipIndex <= 0) return;
        homeFeatureTipDirectionRef.current = -1;
        persistHomeFeatureTipIndex(homeFeatureTipIndex - 1);
    }, [homeFeatureTipIndex, homeFeatureTipsDone, persistHomeFeatureTipIndex]);
    const handleHomeFeatureTipNext = useCallback(() => {
        hapticTap();
        advanceHomeFeatureTip();
    }, [advanceHomeFeatureTip]);
    const handleHomeFeatureTipPrevious = useCallback(() => {
        hapticTap();
        previousHomeFeatureTip();
    }, [previousHomeFeatureTip]);
    const handleHomeFeatureTipPress = useCallback(() => {
        if (homeFeatureTipSwipeHandledRef.current) {
            homeFeatureTipSwipeHandledRef.current = false;
            return;
        }
        handleHomeFeatureTipNext();
    }, [handleHomeFeatureTipNext]);
    const handleHomeFeatureTipTouchStart = useCallback((event: GestureResponderEvent) => {
        homeFeatureTipSwipeHandledRef.current = false;
        homeFeatureTipTouchStartRef.current = getHomeFeatureTipTouchPoint(event);
    }, []);
    const handleHomeFeatureTipTouchCancel = useCallback(() => {
        homeFeatureTipTouchStartRef.current = null;
    }, []);
    const handleHomeFeatureTipTouchEnd = useCallback((event: GestureResponderEvent) => {
        const start = homeFeatureTipTouchStartRef.current;
        const end = getHomeFeatureTipTouchPoint(event);
        homeFeatureTipTouchStartRef.current = null;
        if (!start || !end) return;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (absX >= 42 && absX > absY * 1.2) {
            homeFeatureTipSwipeHandledRef.current = true;
            if (dx < 0) {
                handleHomeFeatureTipNext();
            } else {
                handleHomeFeatureTipPrevious();
            }
            return;
        }
        if (absX <= 12 && absY <= 12) {
            homeFeatureTipSwipeHandledRef.current = true;
            handleHomeFeatureTipNext();
            return;
        }
        if (absX > 12 || absY > 12) {
            homeFeatureTipSwipeHandledRef.current = true;
        }
    }, [handleHomeFeatureTipNext, handleHomeFeatureTipPrevious]);
    const resetHomeFeatureTipsFromHome = useCallback(() => {
        hapticTap();
        // Карточки снова включили → блоки ниже плавно уезжают вниз, освобождая место.
        configureAccordionLayout();
        setHomeFeatureTipIndex(0);
        setHomeFeatureTipsDone(false);
        setHomeFeatureTipsHydrated(true);
        setHomeOnboardingDone(true);
        AsyncStorage.multiSet([
            [HOME_FEATURE_TIPS_INDEX_KEY, '0'],
            [HOME_FEATURE_TIPS_DONE_KEY, '0'],
            [HOME_ONBOARDING_DONE_KEY, '1'],
        ]).catch(() => {});
    }, []);
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener(HOME_FEATURE_TIPS_RESET_EVENT, (nextReplayCount?: number) => {
            // Повторное включение подсказок из настроек → плавный сдвиг контента ниже.
            configureAccordionLayout();
            if (typeof nextReplayCount === 'number') {
                setHomeFeatureTipsReplayCount(clampHomeFeatureTipReplayCount(nextReplayCount));
            }
            setHomeFeatureTipIndex(0);
            setHomeFeatureTipsDone(false);
            setHomeFeatureTipsHydrated(true);
            setHomeOnboardingDone(true);
        });
        return () => sub.remove();
    }, []);
    useEffect(() => {
        // зачем (владелец 08.09, возвращено 30.09): флаг снят снимком 0217c4a21 — подсказки на Главной не анимируем и не рисуем.
        const shouldPulse = HOME_FEATURE_TIPS_ON_HOME && homeFeatureTipsHydrated && homeOnboardingDone && !homeFeatureTipsDone && homeFeatureTipIndex === 0;
        if (!homeRuntimeActive || !shouldPulse) {
            homeFeatureTipHintPulse.stopAnimation();
            homeFeatureTipHintPulse.setValue(0);
            return;
        }
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(homeFeatureTipHintPulse, { toValue: 1, duration: 1250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(homeFeatureTipHintPulse, { toValue: 0, duration: 1250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]));
        loop.start();
        return () => {
            loop.stop();
        };
    }, [homeFeatureTipHintPulse, homeFeatureTipIndex, homeFeatureTipsDone, homeFeatureTipsHydrated, homeOnboardingDone, homeRuntimeActive]);
    // Кросс-фейд содержимого при листании подсказок: контент плавно уходит и возвращается,
    // а не «прыгает». useNativeDriver — не грузит JS-поток (Performance Bible).
    const homeFeatureTipCardVisible = HOME_FEATURE_TIPS_ON_HOME && homeFeatureTipsHydrated && homeOnboardingDone && !homeFeatureTipsDone && homeFeatureTips.length > 0;
    useEffect(() => {
        if (!homeFeatureTipCardVisible) {
            homeFeatureTipContentKeyRef.current = homeFeatureTipContentKey;
            homeFeatureTipContentAnim.setValue(0);
            homeFeatureTipStackAnim.setValue(0);
            return;
        }
        // Первое появление карточки: контент уже въезжает вместе с самим блоком (LayoutAnimation),
        // отдельный кросс-фейд не запускаем — только фиксируем текущий ключ.
        if (!homeFeatureTipCardWasVisibleRef.current || homeFeatureTipContentKeyRef.current === homeFeatureTipContentKey) {
            homeFeatureTipContentKeyRef.current = homeFeatureTipContentKey;
            homeFeatureTipContentAnim.setValue(0);
            homeFeatureTipStackAnim.setValue(0);
            return;
        }
        homeFeatureTipContentKeyRef.current = homeFeatureTipContentKey;
        // При reduce-motion — только мягкий фейд без горизонтального переезда (движение укачивает).
        if (homeFeatureTipReduceMotion) {
            homeFeatureTipStackAnim.setValue(0);
            homeFeatureTipContentAnim.setValue(1);
            const fade = Animated.timing(homeFeatureTipContentAnim, {
                toValue: 0,
                duration: MOTION_DURATION.fast,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            });
            fade.start();
            return () => {
                fade.stop();
            };
        }
        // Подмена карточки: новая приезжает со своей стороны (1 → 0) — текст к этому моменту
        // уже сменился состоянием, поэтому «уход» старой играет подложка-стопка под карточкой.
        homeFeatureTipContentAnim.setValue(1);
        homeFeatureTipStackAnim.setValue(0);
        const anim = Animated.parallel([
            Animated.timing(homeFeatureTipContentAnim, {
                toValue: 0,
                duration: MOTION_DURATION.normal,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            // Стопка «подаёт» следующую карточку и возвращается — конечная длительность, без цикла.
            Animated.sequence([
                Animated.timing(homeFeatureTipStackAnim, {
                    toValue: 1,
                    duration: MOTION_DURATION.fast,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(homeFeatureTipStackAnim, {
                    toValue: 0,
                    duration: MOTION_DURATION.normal,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]),
        ]);
        anim.start();
        return () => {
            anim.stop();
        };
    }, [homeFeatureTipCardVisible, homeFeatureTipContentAnim, homeFeatureTipContentKey, homeFeatureTipReduceMotion, homeFeatureTipStackAnim]);
    // Синхронизируем «была ли видна карточка» для ветки первого появления в кросс-фейде.
    // Появление/исчезновение карточки со сдвигом контента ниже анимируется через
    // configureAccordionLayout(), вызываемый в call-site'ах ПЕРЕД setState (LayoutAnimation
    // применяется к следующей мутации разметки, поэтому в useEffect после коммита — поздно).
    useEffect(() => {
        homeFeatureTipCardWasVisibleRef.current = homeFeatureTipCardVisible;
    }, [homeFeatureTipCardVisible]);
    // Debounce-флаг: если loadData уже выполняется — не запускаем повторно.
    // Устраняет 3 одновременных вызова (focusTick + activeIdx + AppState) при возврате на главную.
    // needsReloadRef: если вызов был пропущен во время загрузки — повторим после завершения.
    const loadingRef = useRef(false);
    const needsReloadRef = useRef(false);
    const deferredReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const deferredReloadTaskRef = useRef<{ cancel?: () => void } | null>(null);
    const deferredReadyTaskRef = useRef<{ cancel?: () => void } | null>(null);
    const homeRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastHomeRefreshRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });
    const homeRefreshKeyRef = useRef<string | null>(null);
    const markHomeStatsReady = useCallback(() => {
        deferredReadyTaskRef.current?.cancel?.();
        deferredReadyTaskRef.current = InteractionManager.runAfterInteractions(() => {
            deferredReadyTaskRef.current = null;
            if (mountedRef.current)
                setHomeStatsReady(true);
        });
    }, []);
    useEffect(() => {
        if (!homeRuntimeActive) return;
        const homeRefreshKey = `${studyTarget}:${lang}`;
        // Returning from a section must reveal the preserved Home tree, not
        // restart its data pipeline. A real study-target/UI-language change is
        // the only reason this effect performs a fresh full load.
        if (homeRefreshKeyRef.current === homeRefreshKey) return;
        homeRefreshKeyRef.current = homeRefreshKey;
        if (homeRefreshTimerRef.current) {
            clearTimeout(homeRefreshTimerRef.current);
            homeRefreshTimerRef.current = null;
        }
        homeRefreshTimerRef.current = setTimeout(() => {
            homeRefreshTimerRef.current = null;
            const now = Date.now();
            if (lastHomeRefreshRef.current.key === homeRefreshKey && now - lastHomeRefreshRef.current.at < 750) {
                return;
            }
            lastHomeRefreshRef.current = { key: homeRefreshKey, at: now };
            if (!homeRuntimeActiveRef.current) {
                homeDataDirtyRef.current = true;
                return;
            }
            // Full loading includes the daily summary. Running both creates a
            // race in which the light refresh may overwrite the full result.
            void loadData();
        }, 80);
        return () => {
            if (homeRefreshTimerRef.current) {
                clearTimeout(homeRefreshTimerRef.current);
                homeRefreshTimerRef.current = null;
                // The key was latched before the delayed work ran.  Re-open it
                // through the normal dirty path when ownership returns.
                homeRefreshKeyRef.current = null;
                homeDataDirtyRef.current = true;
            }
        };
    }, [homeRuntimeActive, studyTarget, lang]);
    useEffect(() => {
        if (homeStatsReady && isHomeOwner) {
            emitAppEvent('app_first_content_ready');
        }
    }, [homeStatsReady, isHomeOwner]);
    const loadData = async () => {
        if (loadingRef.current) {
            needsReloadRef.current = true;
            return;
        }
        loadingRef.current = true;
        needsReloadRef.current = false;
        const homeHydrationAccount = captureAccountGeneration();
        const homeHydrationStartedAt = Date.now();
        if (streakTimerRef.current) {
            clearTimeout(streakTimerRef.current);
            streakTimerRef.current = null;
        }
        streakRingAnim.stopAnimation();
        streakRingAnim.setValue(0);
        const endPerf = perfMark('home:loadData');
        // зачем (владелец 2026-09-02): загрузка Главной ~1 с при пороге 300 мс.
        // Отсечки показывают, КАКОЙ шаг её съедает, чтобы не чинить наугад.
        // Снять вместе с диагностикой после починки.
        // зачем (владелец 2026-09-22, «удалить все замеры»): здесь к дев-замеру
        // была подклеена релизная копия measureRelease, писавшая в журнал на
        // устройстве. Осталась только дев-версия — в релизе она молчит.
        const step = perfSteps('home:loadData');
        try {
            const [homeStoragePairs, currentWeekMarkers, weekPts, shardsBal, premiumSignalPairs, personalProgress] = await Promise.all([
                AsyncStorage.multiGet([
                    'user_name',
                    'week_days_done',
                    HOME_SELECTED_TITLE_KEY,
                    'streak_last_shown',
                    HOME_WEEK_DOT_ANIMATION_KEY,
                ]),
                readCurrentStreakWeekMarkers(),
                Promise.resolve(0),
                getShardsBalance(),
                AsyncStorage.multiGet(['premium_active']),
                hydratePersonalProgress().catch(() => getPersonalProgressSnapshot()),
            ]);
            step('parallel6');
            const homeStorage = new Map(homeStoragePairs);
            const name = homeStorage.get('user_name') ?? null;
            const streakVal = String(personalProgress.streakCount);
            const weekData = homeStorage.get('week_days_done') ?? null;
            const storedTitleKey = homeStorage.get(HOME_SELECTED_TITLE_KEY) ?? null;
            const lastStreakShownRaw = homeStorage.get('streak_last_shown') ?? null;
            const lastWeekDotAnimationRaw = homeStorage.get(HOME_WEEK_DOT_ANIMATION_KEY) ?? null;
            const premiumSignals = new Map(premiumSignalPairs);
            // Данные успешно прочитаны — снимаем баннер ошибки, если он был после прошлого сбоя.
            if (mountedRef.current && loadFailedNoData) setLoadFailedNoData(false);
            setWeekMarkers(currentWeekMarkers);
            // зачем (владелец, 2026-08-24: «счёт жемчужин на секунду показал неправду»):
            // getShardsBalance() отдаёт 0 не только как настоящий ноль, но и как
            // «не знаю» — когда генерация аккаунта устарела прямо во время чтения
            // (её зовёт cloud_sync уже после первого кадра Главной). Раньше этот
            // ноль писался безусловно и стирал правильную цифру до следующей сверки.
            // Ноль принимаем только от аккаунта, который к концу чтения всё ещё свой.
            const shardsReadIsTrustworthy = shardsBal > 0
                || isCurrentAccountGeneration(homeHydrationAccount, homeHydrationAccount.stableId);
            if (shardsReadIsTrustworthy) setShardsBalance(shardsBal);
            if (!selectedTitleHydratedRef.current) {
                selectedTitleHydratedRef.current = true;
                setSelectedTitleKey(storedTitleKey || null);
            }
            const hydratedName = resolveHydratedProfileName(homeHydrationStartedAt, name);
            if (hydratedName)
                setUserName(hydratedName);
            const sharedSnapshotAtHydration = getAppSnapshot();
            const currentStreakNum = Math.max(
                0,
                personalProgress.streakCount,
                sharedSnapshotAtHydration.progress?.streak ?? 0,
            );
            if (streakVal !== null || sharedSnapshotAtHydration.progress?.source === 'live')
                setStreak(currentStreakNum);
            const lastStreakShown = parseInt(lastStreakShownRaw || '0') || 0;
            if (currentStreakNum > 0 && currentStreakNum !== lastStreakShown) {
                await AsyncStorage.setItem('streak_last_shown', String(currentStreakNum));
                if (lastStreakShown > 0 && currentStreakNum > lastStreakShown) {
                    setDisplayStreak(lastStreakShown);
                    streakTimerRef.current = setTimeout(() => {
                        setDisplayStreak(currentStreakNum);
                        streakRingAnim.stopAnimation();
                        if (homeMotionReduceMotion || !homeRuntimeActiveRef.current) {
                            streakRingAnim.setValue(0);
                        } else {
                            streakRingAnim.setValue(0);
                            Animated.sequence([
                                Animated.timing(streakRingAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER }),
                                Animated.timing(streakRingAnim, { toValue: 0, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER }),
                            ]).start();
                        }
                    }, 800);
                    onStreakUpdated(currentStreakNum).then((earned) => {
                        const earnedAmount = typeof earned === 'number' ? earned : (earned?.amount ?? 0);
                        const rk = typeof earned === 'object' && earned && 'reasonKey' in earned ? earned.reasonKey : undefined;
                        if (earnedAmount > 0) {
                            emitAppEvent('shards_earned', rk ? { amount: earnedAmount, reasonKey: rk } : { amount: earnedAmount });
                        }
                    }).catch(() => { });
                }
                else {
                    setDisplayStreak(currentStreakNum);
                }
            }
            else {
                setDisplayStreak(currentStreakNum);
            }
            step('streak');
            const [[, savedFrSnap]] = await AsyncStorage.multiGet(['user_frame']);
            const liveProfileVisuals = sharedSnapshotAtHydration.profile?.source === 'live'
                ? resolveHomeProfileVisuals({ snapshot: sharedSnapshotAtHydration.profile })
                : null;
            // зачем (D108): купленных аватаров больше нет — живой профиль или базовый '1'.
            const avatarSnap = liveProfileVisuals?.avatar || '1';
            const frameSnap = liveProfileVisuals?.frame || savedFrSnap || '';
            if (mountedRef.current) {
                setUserAvatar(avatarSnap);
                setUserFrame(frameSnap);
            }
            let weekParsedForSnap: boolean[] = new Array(7).fill(false);
            if (weekData) {
                try {
                    const arr = JSON.parse(weekData) as boolean[];
                    if (Array.isArray(arr) && arr.length === 7) {
                        weekParsedForSnap = arr;
                        setWeekDone(arr);
                    }
                    else {
                        setWeekDone(new Array(7).fill(false));
                    }
                }
                catch {
                    setWeekDone(new Array(7).fill(false));
                }
            }
            const todayWeekIndex = (new Date().getDay() + 6) % 7;
            const todayWeekDone = weekParsedForSnap[todayWeekIndex] || Boolean(currentWeekMarkers[todayWeekIndex]);
            const todayWeekKey = getLocalDayKey();
            if (todayWeekDone && lastWeekDotAnimationRaw !== todayWeekKey) {
                void AsyncStorage.setItem(HOME_WEEK_DOT_ANIMATION_KEY, todayWeekKey);
                if (mountedRef.current) setWeekDotAnimationToken(todayWeekKey);
            }
            setWeekPoints(weekPts);
            step('avatar');
            const [specialTitleStoragePairs, achievementStates] = await Promise.all([
                AsyncStorage.multiGet([HELPFUL_REPORTS_CONFIRMED_KEY]),
                loadAchievementStates().catch(() => []),
            ]);
            const specialTitleStorage = new Map(specialTitleStoragePairs);
            const helpfulReportsRaw = specialTitleStorage.get(HELPFUL_REPORTS_CONFIRMED_KEY) ?? null;
            if (mountedRef.current) {
                setSpecialTitleStats({
                    helpfulReportsConfirmed: parseStoredCount(helpfulReportsRaw),
                    earnedAchievementIds: new Set(achievementStates.filter((state) => state.unlockedAt !== null).map((state) => state.id)),
                });
            }
            const pool = HOME_GREETING_POOLS[lang] ?? HOME_GREETING_POOLS.ru;
            if (pool.length > 0) {
                const phrase = await resolveDailyGreeting(pool, lang);
                if (mountedRef.current)
                    setGreeting(phrase);
            }
            let done = 0;
            const lastOpenedKey = lastOpenedLessonKey(studyTarget);
            const lessonKeys = Array.from({ length: 32 }, (_, i) => lessonProgressKey(i + 1, studyTarget));
            step('titles+achievements+greeting');
            step('titles+achievements');
            const lessonEntriesWithLastOpened = await AsyncStorage.multiGet([...lessonKeys, lastOpenedKey]);
            const lessonEntries = lessonEntriesWithLastOpened.slice(0, lessonKeys.length);
            const lastLessonIdKey = lessonEntriesWithLastOpened[lessonKeys.length]?.[1] ?? null;
            // зачем: контракт tests/home_lesson_progress_single_pass — каждый сохранённый
            // урок парсится ОДИН раз, а число верных считается циклом без filter-массивов;
            // результат переиспользует блок «последний урок» ниже (раньше парсил заново).
            const correctByLesson: number[] = new Array(lessonEntries.length).fill(0);
            lessonEntries.forEach(([, saved], index) => {
                if (!saved) return;
                // Inner try/catch: одна порченная запись прогресса (битый JSON в AsyncStorage)
                // не должна валить весь loadData → баннер «Обновить» вместо Главной.
                try {
                    const p: unknown = JSON.parse(saved);
                    if (Array.isArray(p)) {
                        let correct = 0;
                        for (let i = 0; i < p.length; i += 1) {
                            const x = p[i];
                            if (x === 'correct' || x === 'replay_correct') correct += 1;
                        }
                        correctByLesson[index] = correct;
                        if (correct >= 45) done++;
                    }
                } catch (e) {
                    // битая запись — пропускаем, не считаем как завершённый
                    DebugLogger.error('home:correct', e instanceof Error ? e : new Error(String(e)), 'warning');
                }
            });
            if (mountedRef.current)
                setLessonsCompleted(done);
            let snapLastLessonId: number | null = null;
            let snapLastLessonProgress = 0;
            let snapLastLessonScore = '0.0';
            let lastId = lastLessonIdKey ? parseInt(lastLessonIdKey, 10) : null;
            // зачем: у пользователей, успевших заглянуть в заблокированный урок до
            // фикса в lesson_menu, в сторе остался его id — кнопка «Урок» вела на
            // экран «Урок заблокирован» каждый раз и выглядела как поломка. Если
            // запомненный урок недоступен — откатываемся к ближайшему доступному
            // ниже по списку, чтобы кнопка всегда открывала то, что можно учить.
            if (lastId && lastId >= 1 && lastId <= 32) {
                try {
                    // зачем (владелец 2026-09-02): здесь стоял цикл
                    // `while (await isLessonUnlockedByEarnedProgress(...))` — до 31
                    // итерации, каждая с 2+ чтениями диска. Замер [PERF-STEPS]:
                    // 8 346 мс из 9 247 всей загрузки Главной. Пакетная версия
                    // читает всё одним multiGet и решает в памяти; логика доступа
                    // та же.
                    const { resolveLastAvailableLessonId } = await import('../lesson_lock_system');
                    lastId = await resolveLastAvailableLessonId(lastId, studyTarget, isPremium);
                } catch (e) {
      // не смогли проверить — оставляем как есть, экран урока сам покажет гейт
      DebugLogger.error('home:lastId', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
            }
            if (lastId && lastId >= 1 && lastId <= 32) {
                const lessonNames = lessonNamesForStudyTarget(lang, studyTarget);
                snapLastLessonId = lastId;
                // зачем: берём уже посчитанное выше число верных (0 для пустой/битой записи) —
                // второго JSON.parse и filter здесь нет.
                const correct = correctByLesson[lastId - 1] ?? 0;
                const scoreStr = (correct / 50 * 5).toFixed(1);
                snapLastLessonProgress = correct;
                snapLastLessonScore = scoreStr;
                if (!lastLessonShownRef.current) {
                    // Performance Bible: вставка в поток после первого кадра — только плавно.
                    if (__DEV__) console.log('[HOME-FIRST-FRAME] continue_card:late_insert', JSON.stringify({ lastId, correct }));
                    animateNextLayoutTransition();
                }
                setLastLesson({ id: lastId, name: lessonNames[lastId - 1], progress: correct, score: scoreStr });
            }
            else if (mountedRef.current) {
                setLastLesson(null);
            }
            // Крупная карта «Рівень / Ланцюжок»: не ждём лігу, медалі и ошибки — щоб не ловити вічний спінер.
            step('lessons+unlockLoop');
            const freezeStoragePairs = await AsyncStorage.multiGet(['streak_freeze', 'premium_free_freeze_used']);
            const freezeStorage = new Map(freezeStoragePairs);
            const freezeRaw = freezeStorage.get('streak_freeze') ?? null;
            const freeFreezeRaw = freezeStorage.get('premium_free_freeze_used') ?? null;
            const parsedFreeze = freezeRaw ? JSON.parse(freezeRaw) : null;
            const freezeIsActive = isStreakFreezeActiveToday(parsedFreeze);
            setFreezeActive(freezeIsActive);
            setPremiumFreezeUsed(freeFreezeRaw === 'true');
            rememberHomeScreenHydration({
                userName: hydratedName,
                streak: currentStreakNum,
                displayStreak: currentStreakNum,
                weekDone: weekParsedForSnap,
                weekMarkers: currentWeekMarkers,
                weekPoints: weekPts,
                shardsBalance: shardsBal,
                lessonsCompleted: done,
                freezeActive: freezeIsActive,
                premiumFreezeUsed: freeFreezeRaw === 'true',
                userAvatar: avatarSnap,
                userFrame: frameSnap,
                lastLessonId: snapLastLessonId,
                lastLessonProgress: snapLastLessonProgress,
                lastLessonScore: snapLastLessonScore,
            }, studyTarget, homeHydrationAccount);
            // Функциональная форма: секцию progress собираем ЗАНОВО, и руны надо
            // взять из состояния на момент применения патча, а не из более раннего
            // кадра — иначе между вычислением и записью может проскочить начисление.
            patchAppSnapshot((currentSnapshot) => ({
                profile: {
                    source: 'storage',
                    updatedAt: homeHydrationStartedAt,
                    name: hydratedName,
                    avatar: avatarSnap,
                    frame: frameSnap,
                    level: 1,
                    premiumActive: premiumSignals.get('premium_active') === 'true',
                    vipActive: isVip,
                },
                progress: {
                    source: 'storage',
                    updatedAt: Date.now(),
                    streak: currentStreakNum,
                    shards: shardsBal,
                    studyTarget: String(studyTarget ?? 'en'),
                    // зачем (владелец, 2026-08-24): «цифра рун постоянно прыгает».
                    // Гидратация Главной собирает progress ЗАНОВО и раньше роняла
                    // stars — счётчик рун падал в ноль до следующей публикации
                    // проекции. Руны сюда не приходят, переносим текущее значение.
                    stars: currentSnapshot.progress?.stars ?? 0,
                    starsEarnedTotal: currentSnapshot.progress?.starsEarnedTotal ?? 0,
                },
            }));
            if (mountedRef.current)
                markHomeStatsReady();
            const allMedals = await loadAllMedals(studyTarget);
            setMedalCounts(countMedals(allMedals));
            // зачем (D107): карточка «Почини цепочку» удалена — серию спасает только заморозка Plus.
            // Месячный Plus-лимит заморозок остаётся без старого bootstrap бонусов.
            void applyMonthlyPremiumFreezeAllowance().catch(() => {});
            // [STREAK PAYWALL / FREEZE] Проверяем угрозу цепочке для всех пользователей.
            // Для не-премиум — показываем paywall (один раз в день).
            // Для премиум — показываем кнопку заморозки.
            const { willLose, streakBefore } = await checkStreakLossPending();
            if (willLose) {
                const freezeRaw2 = await AsyncStorage.getItem('streak_freeze');
                const freeze2 = freezeRaw2 ? JSON.parse(freezeRaw2) : null;
                const alreadyFrozen = isStreakFreezeActiveToday(freeze2);
                if (!alreadyFrozen) {
                    setStreakAtRisk(true);
                }
                if (!hasPremiumAccess) {
                    const today = getLocalDayKey();
                    const shownToday = await AsyncStorage.getItem('streak_paywall_shown');
                    if (shownToday !== today) {
                        await AsyncStorage.setItem('streak_paywall_shown', today);
                        router.push({ pathname: '/premium_modal', params: { context: 'streak', streak: String(streakBefore) } } as any);
                    }
                }
            }
            // Premium celebration: pending выставлен в premium_modal (IAP) или cloud_sync (admin grant).
            const pending = await isCelebrationPending();
            if (pending && mountedRef.current && !celebrationQueuedRef.current) {
                celebrationQueuedRef.current = true;
                const marker = await getPendingCelebrationMarker();
                const variant = await getPendingCelebrationVariant();
                // Marker запоминаем для показа, но pending НЕ гасим здесь: модалка идёт
                // через OverlayArbiter и может быть отложена за нативной модалкой. Если
                // погасить сейчас, а юзер уйдёт до показа — celebration пропадёт навсегда.
                // consumeCelebration вызывается в onClose, когда юзер реально увидел и закрыл.
                setCelebrationMarker(marker);
                setCelebrationVariant(variant);
                // зачем (D107): revive-модалки больше нет — конкурировать не с кем, показываем сразу.
                setCelebrationVisible(true);
            }
            const vipPending = await isVipCelebrationPending();
            if (vipPending && mountedRef.current) {
                const marker = await getPendingVipCelebrationMarker();
                const queueKey = marker ?? 'vip_pending';
                if (vipCelebrationQueuedMarkerRef.current !== queueKey) {
                    vipCelebrationQueuedMarkerRef.current = queueKey;
                    setVipCelebrationMarker(marker);
                    // pending НЕ гасим здесь — см. комментарий в premium-ветке выше.
                    // consumeVipCelebration вызывается в onClose, после реального показа.
                    if (!pending)
                        setVipCelebrationVisible(true);
                    else {
                        setTimeout(() => {
                            if (vipCelebrationQueuedMarkerRef.current === queueKey)
                                setVipCelebrationVisible(true);
                        }, pending ? 1200 : 600);
                    }
                }
            }
        }
        catch (error) {
            DebugLogger.error('home.tsx:checkDailyReward', error, 'warning');
            // Если это ПЕРВАЯ загрузка (ещё ни разу не было успешной) и она упала —
            // показывать нечего (нет кэша/hydration). Включаем баннер «Обновить».
            // Когда кэш уже есть (homeStatsLoadedOnce) — молча остаёмся на нём.
            if (mountedRef.current && !homeStatsLoadedOnce) setLoadFailedNoData(true);
        }
        finally {
            endPerf();
            // Раскладка по шагам печатается в finally — она нужна и когда загрузка
            // упала на середине: видно, на каком именно шаге оборвалось.
            step.end();
            homeStatsLoadedOnce = true;
            if (mountedRef.current)
                markHomeStatsReady();
            loadingRef.current = false;
            // Если во время загрузки пришёл ещё один запрос — выполняем его сейчас
            if (needsReloadRef.current) {
                if (!homeRuntimeActiveRef.current) {
                    needsReloadRef.current = false;
                    homeDataDirtyRef.current = true;
                    return;
                }
                needsReloadRef.current = false;
                if (deferredReloadTimerRef.current)
                    clearTimeout(deferredReloadTimerRef.current);
                deferredReloadTaskRef.current?.cancel?.();
            deferredReloadTimerRef.current = setTimeout(() => {
                    deferredReloadTimerRef.current = null;
                    if (!mountedRef.current)
                        return;
                    deferredReloadTaskRef.current = InteractionManager.runAfterInteractions(() => {
                        deferredReloadTaskRef.current = null;
                        if (mountedRef.current && homeRuntimeActiveRef.current)
                            loadData();
                        else if (mountedRef.current)
                            homeDataDirtyRef.current = true;
                    });
                }, 120);
            }
        }
    };
    useEffect(() => {
        if (!homeRuntimeActive) return;
        if (homeDataDirtyRef.current) {
            homeDataDirtyRef.current = false;
            loadData();
            return;
        }
    }, [homeRuntimeActive, focusTick]);
    // зачем: карточки «прилетают» только если человек что-то сохранил с прошлого
    // захода. Локальный флаг, ноль обращений к сети; повторный вход без новых
    // сохранений анимацию не крутит.
    useEffect(() => {
        if (!homeRuntimeActive) return;
        let cancelled = false;
        void readSavedCardsFirstRun().then((state) => {
            if (cancelled) return;
            const effect = homeArrivalEffect(state);
            if (effect === 'none') return;
            cardArrivalEffectRef.current = effect;
            setCardArrivals(state.pendingArrivals);
        });
        return () => { cancelled = true; };
    }, [homeRuntimeActive, focusTick]);
    useEffect(() => {
        if (!homeRuntimeActive) {
            shardsAnim.stopAnimation();
            shardsBonusAnim.stopAnimation();
            shardsAnim.setValue(1);
            shardsBonusAnim.setValue(0);
            return;
        }
        if (shardsDirtyRef.current) {
            shardsDirtyRef.current = false;
            void getShardsBalance().then((balance) => {
                if (homeRuntimeActiveRef.current) setShardsBalance(balance);
                else shardsDirtyRef.current = true;
            });
        }
        if (streakMarkersDirtyRef.current) {
            streakMarkersDirtyRef.current = false;
            void readCurrentStreakWeekMarkers().then((markers) => {
                if (homeRuntimeActiveRef.current) setWeekMarkers(markers);
                else streakMarkersDirtyRef.current = true;
            }).catch(() => {});
        }
    }, [focusTick, homeRuntimeActive, shardsAnim, shardsBonusAnim]);
    const handleFreezeStreak = async () => {
        // зачем (аудит 2026-08-26): раньше не было ни защиты от двойного тапа, ни
        // try/catch — при исключении (обрыв сети) экран молчал, а повторный тап
        // запускал второй круг запросов.
        if (freezeBusyRef.current) return;
        freezeBusyRef.current = true;
        try {
        hapticTap();
        const today = getLocalDayKey();
        const freeAvailable = hasPremiumAccess && !premiumFreezeUsed;
        if (!hasPremiumAccess) {
            router.push({ pathname: '/premium_modal', params: { context: 'streak', streak: String(streak) } } as any);
            return;
        }
        // зачем (D107, владелец 30.09): платная заморозка за жемчуг удалена, осталась
        // только бесплатная заморозка Plus. Использована — честно говорим и не списываем.
        if (!freeAvailable) {
            DebugLogger.info('[STREAK-FREEZE]', 'бесплатная заморозка Plus уже использована — платной больше нет (D107)');
            emitAppEvent('action_toast', {
                type: 'info',
                messageRu: 'Заморозка на этой неделе уже использована.',
                messageUk: 'Заморозку цього тижня вже використано.',
                messageEn: 'You have already used this week’s freeze.',
                messageEs: 'Ya usaste la congelación de esta semana.',
                messagePtBr: 'Você já usou o congelamento desta semana.',
                messageVi: 'Bạn đã dùng lượt đóng băng của tuần này.',
                messageId: 'Pembekuan minggu ini sudah dipakai.',
                messageTr: 'Bu haftanın dondurma hakkını kullandın.',
                messagePl: 'Zamrożenie w tym tygodniu zostało już użyte.',
            });
            return;
        }
        await commitPremiumFreeFreeze(today);
        setPremiumFreezeUsed(true);
        const lastActive = await AsyncStorage.getItem('last_active_date').catch(() => null);
        const frozenDate = lastActive && !isSameLocalOrUtcDay(lastActive) ? addDaysToDateKey(lastActive, 1) : today;
        await recordStreakWeekMarker(frozenDate, 'freeze').catch(() => {});
        setWeekMarkers(await readCurrentStreakWeekMarkers().catch(() => weekMarkers));
        setFreezeActive(true);
        emitAppEvent('streak_freeze_updated', { active: true });
        setStreakAtRisk(false);
        void checkAchievements({ type: 'streak_freeze_used' });
        } catch (error) {
            void import('../debug-logger')
                .then(({ DebugLogger }) => DebugLogger.error('home.tsx:handleFreezeStreak', error, 'warning'))
                .catch(() => {});
            emitAppEvent('action_toast', {
                type: 'error',
                messageRu: 'Не удалось заморозить серию. Проверь связь и попробуй ещё раз.',
                messageUk: 'Не вдалося заморозити серію. Перевір зв’язок і спробуй ще раз.',
                messageEs: 'No se pudo congelar la racha. Revisa la conexión e inténtalo de nuevo.',
                messagePtBr: 'Não foi possível congelar a sequência. Verifique a conexão e tente de novo.',
                messageVi: 'Không đóng băng được chuỗi. Hãy kiểm tra kết nối và thử lại.',
                messageId: 'Gagal membekukan rangkaian. Periksa koneksi dan coba lagi.',
                messageTr: 'Seri dondurulamadı. Bağlantını kontrol et ve tekrar dene.',
                messagePl: 'Nie udało się zamrozić serii. Sprawdź połączenie i spróbuj ponownie.',
            });
        } finally {
            freezeBusyRef.current = false;
        }
    };
    const weekDays = HOME_WEEK_DAYS[lang] ?? HOME_WEEK_DAYS.ru;
    const todayIdx = (new Date().getDay() + 6) % 7;
    /** Индексы табов: 0 home, 1 lessons, 2 friends, 3 settings —
     *  см. app/(tabs)/_layout.tsx. Плитка «Уроки» по-прежнему открывает push-маршрут
     *  /lessons_list, чтобы сохранить привычную историю возврата с главной.
     *  зачем: карта дублирует _layout.tsx, поэтому при любом изменении набора
     *  вкладок её обязательно править вместе с ним — иначе переходы отсюда
     *  уводят не на тот экран. */
    // зачем (2.0, D39): таббар «Главная · Обучение · Видео · Сообщество ·
    // Настройки». Друзья — раздел «Сообщества» (индекс 3). Прежняя карта
    // (друзья 2, настройки 3) устарела ещё с появления Арены и вела не туда.
    const TAB_IDX: Record<string, number> = {
        '/(tabs)/video': 2,
        video: 2,
        '/(tabs)/community': 3,
        community: 3,
        '/(tabs)/friends': 3,
        friends: 3,
        '/(tabs)/settings': 4,
        settings: 4,
    };
    // зачем (владелец 2026-09-22: «нажал 25 раз, даже анимации нет при
    // нажатии»): отсутствие анимации означает, что JS-поток занят и не успевает
    // отрисовать нажатое состояние. Поэтому переход обязан уходить ПЕРВЫМ, а
    // всё необязательное — после него, уже не мешая кадру.
    //
    // Порядок был обратный: вибрация и две записи аналитики выполнялись ДО
    // router.push, то есть перед самым узким местом. Сам hooks/use-haptics.ts
    // в комментарии прямо предписывает звать вибрацию из onPressIn, а не
    // внутри onPress вместе с действием — здесь делалось именно запрещённое.
    const go = (path: string) => {
        const tabIdx = TAB_IDX[path];
        if (tabIdx !== undefined) {
            goToTab(tabIdx);
            void hapticTap();
            return;
        }
        const screenName = path.replace(/^\//, '').split('?')[0];
        // Навигация — первым делом: человек ждёт именно её.
        perfNavStart(screenName);
        router.push(path as any);
        // Вибрация и учёт открытия никого не держат и едут следом.
        void hapticTap();
        logFeatureOpened(screenName);
        trackFeatureOpened(screenName).catch((error: unknown) => {
            // Немой catch запрещён: молча пропавший счётчик открытий читается
            // как «аналитика врёт», и причину потом не найти.
            if (__DEV__) {
                console.warn('[HOME-NAV] track_feature_failed', // guard-ok
                    error instanceof Error ? `${error.name}: ${error.message}` : String(error));
            }
        });
    };
    const markerForWeekDay = (index: number): StreakWeekDayMarkerKind | null => weekMarkers[index] ?? null;
    const isWeekDayMarked = (index: number): boolean => weekDone[index] || markerForWeekDay(index) !== null;
    const weekDotTheme = themedWeekDot(themeMode, t);
    const streakRingOpacity = streakRingAnim.interpolate({
        inputRange: [0, 0.28, 0.72, 1],
        outputRange: [0, 0.82, 0.42, 0],
    });
    const streakRingScale = streakRingAnim.interpolate({
        inputRange: [0, 0.28, 0.72, 1],
        outputRange: [0.82, 1, 1.08, 1.14],
    });
    const weekDotPulseScale = weekDotPulseAnim.interpolate({
        inputRange: [0, 0.55, 1],
        outputRange: [1, 1.12, 1],
    });
    const weekDotFill = (index: number, marker: StreakWeekDayMarkerKind | null, fallback: string) => {
        if (marker === 'freeze') return weekDotTheme.freezeBg;
        if (marker === 'revive' || marker === 'repair' || weekDone[index]) return weekDotTheme.completeBg;
        return fallback;
    };
    const weekDotBorder = (index: number, marker: StreakWeekDayMarkerKind | null, fallback: string) => {
        if (marker === 'freeze') return weekDotTheme.freezeBorder;
        if (marker === 'revive' || marker === 'repair' || weekDone[index]) return weekDotTheme.completeBorder;
        return fallback;
    };
    // Подсветка текущего дня в полосе: явное кольцо (толще рамка) у незавершённого
    // «сегодня» + акцентная подпись. Делает текущий день заметным во всех вариантах.
    const isToday = (index: number) => index === todayIdx;
    const weekDayLabelColor = (index: number, activeColor: string, mutedColor: string) =>
        isWeekDayMarked(index) || isToday(index) ? activeColor : mutedColor;
    const todayRingWidth = (index: number, marker: StreakWeekDayMarkerKind | null) =>
        isToday(index) && marker == null && !weekDone[index] ? 2 : null;
    const renderWeekMarkerContent = (
        marker: StreakWeekDayMarkerKind | null,
        size: number,
        checkSize: number,
        checkColor: string,
    ) => {
        if (marker === 'freeze') {
            const iceSize = Math.round(size * 1.34);
            return <Image source={themeUiAsset(themeMode, 'streakIce')} style={{ width: iceSize, height: iceSize }} contentFit="contain" accessibilityLabel={triLang(lang, { ru: 'Заморозка серии', en: 'Streak freeze', uk: 'Заморозка серії', es: 'Congelación de racha', 'pt-BR': 'Congelamento da sequência', vi: 'Đóng băng chuỗi', id: 'Pembekuan rentetan', tr: 'Seri dondurma', pl: 'Zamrożenie serii' })} />;
        }
        if (marker === 'revive' || marker === 'repair') {
            return <Ionicons name="checkmark" size={checkSize} color={checkColor}/>;
        }
        return null;
    };
    if (!diagChecked)
        return <ScreenGradient><View /></ScreenGradient>;
    // ── Новый стиль главного экрана ──────────────────────────────────────────
    const renderNewHome = () => {
        const menuImages = getHomeMenuImages(themeMode);
        const lastLessonImage = getHomeLastLessonImage(themeMode);
        // зачем: имя урока раньше «запекалось» в состояние lastLesson при монтировании
        // и после смены языка интерфейса оставалось на старом языке (укр. экран —
        // русское название). Резолвим по текущему lang в рендере, как lessons.tsx.
        const lastLessonName = lastLesson == null
            ? ''
            : (lessonNamesForStudyTarget(lang, studyTarget)[lastLesson.id - 1] ?? lastLesson.name);
        // зачем (владелец 2026-09-21): отдельной кнопки «Ошибки» у «Сегодня»
        // больше нет — её заменили зарубка прогресса и ЭТА карточка.
        // Правила владельца (уточнены 2026-09-21 — жест работает ВЕЗДЕ):
        //   · ошибок 10+ → карточка САМА встаёт на ошибки (автозахват);
        //   · ошибок 1..9 → по умолчанию урок;
        //   · в обоих случаях долгое нажатие переключает лицо и перебивает
        //     автозахват: держать человека на одной стороне нельзя;
        //   · ошибок нет → всегда урок, ручной выбор забывается (см. эффект
        //     сброса homePriorityCardFace).
        const mistakesTakeOverPriorityCard = homeMistakesButtonState(mistakeActiveCount) === 'ready';
        // зачем (владелец 2026-09-21): ручной выбор СИЛЬНЕЕ автозахвата — жест
        // обязан работать всегда, в том числе при 10+ ошибках. Пока человек не
        // трогал карточку (face === null), решает автозахват; как только он
        // зажал — показываем выбранное им, пока он не сменит снова.
        const priorityCardShowsMistakes = mistakeActiveCount < 1
            ? false
            : homePriorityCardFace === null
                ? mistakesTakeOverPriorityCard
                : homePriorityCardFace === 'mistakes';
        // Карточка ошибок живёт и без последнего урока: разбирать есть что даже
        // тому, кто ни одного урока не открыл (ошибки копятся и в карточках).
        // зачем D129: «Продолжить урок» — это курс; без курса для языка плашку урока не рисуем.
        // зачем D134: плашка «Мои ошибки» — для любого языка, если ошибки есть (без условия курса).
        const priorityCardVisible = (lastLesson !== null && homeLearnVisible) || priorityCardShowsMistakes;
        const priorityCardTitle = priorityCardShowsMistakes
            ? triLang(lang, {
                ru: 'Мои ошибки', uk: 'Мої помилки', en: 'My mistakes', es: 'Mis errores',
                'pt-BR': 'Meus erros', vi: 'Lỗi của tôi', id: 'Kesalahan saya',
                tr: 'Hatalarım', pl: 'Moje błędy',
            })
            : lastLessonName;
        const priorityCardImage = priorityCardShowsMistakes
            ? getHomeMistakesImage(themeMode)
            : lastLessonImage;
        const priorityCardCounter = priorityCardShowsMistakes
            ? homeMistakesCounterLabel(mistakeActiveCount)
            : `${Math.max(0, Math.min(50, lastLesson?.progress ?? 0))}/50`;
        // зачем (владелец 2026-09-22, дизайн «Цифра-гигант»): число стало главным
        // героем плашки и рисуется крупно ОТДЕЛЬНО от «/50», поэтому нужны обе
        // части по отдельности. priorityCardCounter выше не трогаем — он уходит
        // в accessibilityLabel цельной строкой, как читает его озвучка экрана.
        const priorityCardBigValue = priorityCardShowsMistakes
            ? homeMistakesCounterLabel(mistakeActiveCount)
            : String(Math.max(0, Math.min(50, lastLesson?.progress ?? 0)));
        const priorityCardTotalLabel = priorityCardShowsMistakes ? null : '/50';
        // зачем (владелец 2026-09-21): жест работает при ЛЮБОМ числе ошибок от
        // одной — прежнее ограничение «только 1..9» снято. Переворачивать не на
        // что лишь когда ошибок нет совсем.
        const priorityCardLongPressEnabled = mistakeActiveCount > 0;
        /**
         * Единственный вход в «Мои ошибки» с Главной.
         *
         * зачем: раньше защита жила в кнопке-пилюле у «Сегодня». Кнопки больше
         * нет, а входов стало два (карточка и зарубка на полосе) — значит
         * защита обязана быть общей, иначе один из входов однажды поведёт в
         * закрытый раздел.
         *
         * зачем (владелец 2026-09-21): «я хочу чтобы даже если меньше 10 чтобы
         * хаб открывался». Порог HOME_MISTAKES_UNLOCK_AT больше НЕ закрывает
         * вход — это прямая отмена решения от 2026-09-15 («пока там нет 10
         * ошибок, пусть этот раздел нельзя будет открыть»). Шторка
         * HomeMistakesLockedSheet вместе с порогом ушла из этого пути.
         *
         * Правило репорта #9 (Ion, 2026-09-20) при этом только усилилось:
         * раньше непрогруженный счётчик мог увести в шторку «ошибок мало»,
         * теперь недостижима и она — вход открыт всегда.
         */
        const openHomeMistakesHub = (entrySource: string) => {
            console.warn('[MISTAKES-HUB] home:open', JSON.stringify({ // guard-ok: единая точка входа логирует, с чем открылась
                entrySource,
                activeCount: mistakeActiveCount,
                readyCount: effectiveMistakeReadyCount,
                snapshotCurrent: mistakeSnapshotCurrent,
                snapshotTarget: mistakeReadySnapshot?.target ?? null,
                studyTarget: String(studyTarget),
                accountPhase: mistakeAccountGeneration.phase,
            }));
            trackMistakePracticeEvent('mistake_practice_menu_opened', {
                study_target: mistakeStudyTarget ?? studyTarget,
                entry_source: entrySource,
                ready_count: effectiveMistakeReadyCount,
                active_count: mistakeActiveCount,
                plus_access: hasPremiumAccess,
            });
            nav.push('/mistakes_hub' as never);
        };
        // зачем (владелец 2026-09-21): «напиши её видео уроки» — кнопка в хедере
        // называется именно так, а не просто «Видео».
        const homeVideoLessonsLabel = triLang(lang, {
            ru: 'Видеоуроки', uk: 'Відеоуроки', en: 'Video lessons', es: 'Videolecciones',
            'pt-BR': 'Videoaulas', vi: 'Bài học video', id: 'Video pelajaran',
            tr: 'Video dersler', pl: 'Wideolekcje',
        });
        const homeQuickRowPad = 8;
        const homeQuickRowGap = 14;
        // Ряд содержит три плитки (Уроки / Диалоги / Карточки), поэтому ширина
        // делится на 3 безусловно.
        const homeQuickTileWidth = Math.floor((SCREEN_W - homeQuickRowPad * 2 - homeQuickRowGap * 2) / 3);
        const homeQuickIconPlateSize = Math.min(118, Math.max(88, homeQuickTileWidth - 20));
        const homeQuickIconImageSize = Math.max(96, homeQuickIconPlateSize + 18);
        const homeQuickThemeArtSize = Math.max(112, homeQuickIconPlateSize + 36);
        const homeQuickIconLegacySize = Math.max(96, homeQuickIconPlateSize + 14);
        const homeQuickIconRadius = isGoldTheme ? 26 : 30;
        // Геометрия плашки (HOME_PRIORITY_CARD_HEIGHT / _ART) живёт на уровне
        // модуля — см. комментарий у объявления.
        // Цифра-герой берёт цвет смысла: зелёный прогресс / красные ошибки.
        // Красный НЕ берём из t.wrong (#F05454): на светлом крае зелёного
        // градиента он даёт контраст 2.87 при норме 3.0 для крупного текста
        // (замерено). #FF6B6B даёт 3.56 и остаётся насыщенным, не розовеет.
        // В золотой теме — металл и приглушённая терракота: яркий красный
        // на чёрном золоте выглядит инородно.
        const priorityCardBigColor = priorityCardShowsMistakes
            ? (isGoldTheme ? '#E08A72' : '#FF6B6B')
            : (isGoldTheme ? GOLD_RICH.metalGold : t.accent);
        // Свечение-подложка под артом: мягкая глубина вместо запрещённой обводки.
        const priorityCardGlowColor = priorityCardShowsMistakes
            ? (isGoldTheme ? 'rgba(182,90,74,0.20)' : 'rgba(240,84,84,0.16)')
            : (isGoldTheme ? 'rgba(214,179,90,0.20)' : 'rgba(71,200,112,0.16)');
        // Плитка «Уроки» сохраняет push-презентацию /lessons_list, а вкладка с
        // книжкой открывает тот же раздел как retained-tab. Продолжение последнего
        // урока остаётся на отдельной плашке ниже.
        // Плитка «Диалоги» самодостаточна и озвучивается своим label.
        const quickItems = [
            {
                key: 'lesson',
                iconKey: 'lesson' as const,
                testID: 'home-quick-lesson',
                img: menuImages.lesson,
                label: triLang(lang, {
                    ru: 'Уроки', uk: 'Уроки', en: 'Lessons', es: 'Lecciones', 'pt-BR': 'Lições',
                    vi: 'Bài học', id: 'Pelajaran', tr: 'Dersler', pl: 'Lekcje',
                }),
                onPress: () => { go('/lessons_list'); },
            },
            {
                key: 'dialogs',
                iconKey: 'dialogs' as const,
                testID: 'home-quick-dialogs',
                img: menuImages.dialogs,
                label: triLang(lang, {
                    ru: 'Диалоги', uk: 'Діалоги', en: 'Dialogues', es: 'Diálogos', 'pt-BR': 'Diálogos',
                    vi: 'Đối thoại', id: 'Dialog', tr: 'Diyaloglar', pl: 'Dialogi',
                }),
                onPress: () => {
                    hapticTap();
                    nav.push('/ai_dialog_home' as never);
                },
            },
            {
                key: 'flashcards',
                iconKey: 'cards' as const,
                testID: 'home-quick-flashcards',
                img: menuImages.cards,
                label: s.tabs.flashcards,
                onPress: () => { go('/flashcards'); },
            },
        ];
        // зачем (владелец 2026-09-14): ряд снова постоянный — Уроки / Диалоги /
        // Карточки. Фильтр по устаревшему флагу убран вместе с плиткой:
        // теперь нечего, а лишнее условие сделало бы ряд то двух-, то трёхместным.
        const visibleQuickItems = quickItems;
        // зачем: удалён мёртвый второй ряд плиток (activityQuickItems /
        // visibleActivityQuickItems / themedClubIcon) — он объявлялся, но никогда
        // не рендерился, поэтому «Аттестация» числилась в
        // коде как разделы главной, которых пользователь не видит. Реальный ряд —
        // visibleQuickItems (Уроки / Диалоги / Карточки), см. рендер ниже.
        const eliteStatsCompact = CONTENT_W < 370;
        // зачем (владелец 2026-09-14): вычисления ширины/тесноты широких пилюль
        // «Спин» и «Подарок» удалены вместе с самими пилюлями — действия уехали
        // в хедер маленькой иконкой со счётчиком. Держать мёртвый расчёт нельзя:
        // он переживёт нас и собьёт следующего, кто станет искать эту раскладку.
        const eliteAvatarSize = eliteStatsCompact ? 54 : 60;
        const eliteStreakColumnWidth = eliteStatsCompact ? 102 : 116;
        const eliteStreakIconBox = freezeActive
            ? (eliteStatsCompact ? 36 : 40)
            : (eliteStatsCompact ? 30 : 34);
        const eliteStreakIconSize = freezeActive
            ? (eliteStatsCompact ? 31 : 34)
            : (eliteStatsCompact ? 28 : 31);
        const homeLargeStreakIconBox = freezeActive ? 42 : 38;
        const homeLargeStreakIconSize = freezeActive ? 37 : 36;
        const eliteStreakValueSize = displayStreak >= 1000
            ? (eliteStatsCompact ? 29 : 31)
            : (eliteStatsCompact ? 33 : 36);
        const eliteLabelFontSize = Math.max(11, f.label - 1);
        const eliteLevelBadgeFontSize = Math.max(14, f.body);
        const eliteTitleFontSize = Math.max(17, f.sub + 1);
        const eliteMetaFontSize = Math.max(13, f.label);
        const eliteWeekDotSize = eliteStatsCompact ? 25 : 27;
        const eliteWeekDayFontSize = Math.max(12, f.label - 1);
        const eliteCardY = eliteStatusEntrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
        const eliteCardScale = eliteStatusEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });
        // зачем (аудит 2026-08-24): валюты переехали в строку заголовка «Быстрый
        // старт», где текст 13px. Прежние 34px (жемчужина) и 30px (руна по
        // умолчанию) там и спорили между собой, и подавляли заголовок втрое.
        // Один размер на обе валюты, соразмерный строке.
        const homeQuickCurrencyIconSize = 22;
        // зачем (владелец 2026-09-14): спин и подарок живут в хедере маленькой
        // иконкой со счётчиком новых. Значок соразмерен соседям шапки (видео,
        // профиль), а счётчик — компактный бейдж в углу, как у непрочитанного.
        const homeHeaderBadgeStyle = {
            position: 'absolute' as const,
            top: 4,
            right: -2,
            minWidth: 17,
            height: 17,
            borderRadius: 9,
            paddingHorizontal: 4,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            backgroundColor: t.gold,
        };
        // зачем (2026-09-21): `fontVariant: [...] as const` давал readonly-массив,
        // который RN не принимает (TS2769 на всех трёх бейджах хедера). Тип
        // ставим явно, без as const — массив остаётся изменяемым, как ждёт RN.
        const homeHeaderBadgeTextStyle: TextStyle = {
            color: '#211500',
            fontSize: 11,
            fontWeight: '900',
            fontVariant: ['tabular-nums'], // guard-ok: счётчик бейджа, не баланс
        };
        // Метка одна на кнопку и на чип: чип свою группу доступности отдаёт.
        const homeRunesA11yLabel = `${triLang(lang, {
            ru: 'Баланс', uk: 'Баланс', en: 'Balance', es: 'Saldo', 'pt-BR': 'Saldo',
            vi: 'Số dư', id: 'Saldo', tr: 'Bakiye', pl: 'Saldo',
        })}: ${runeAmount(lang, runesBalance)}`;
        const homeHeaderCompact = CONTENT_W < 370;
        // Компактная энергия: ОДНА иконка + «3/5» цифрами (вместо ряда иконок) —
        // освобождает место, вся шапка помещается в один ряд.
        const homeEnergyIconSize = 30;
        // Подарок до полуночи создаёт временные слоты: 2/5 +3 становится 5/8,
        // а после траты одной временной единицы остаётся 4/8 до истечения срока.
        const homeEnergyCountLabel = `${homeEnergyTotal}/${homeEnergyMax}`;
        const homeEnergyA11yLabel = triLang(lang, {
            ru: energyBonusCapacity > 0
                ? `Энергия: ${homeEnergyCountLabel}, временный максимум плюс ${energyBonusCapacity} до полуночи`
                : `Энергия: ${homeEnergyCountLabel}`,
            uk: energyBonusCapacity > 0
                ? `Енергія: ${homeEnergyCountLabel}, тимчасовий максимум плюс ${energyBonusCapacity} до опівночі`
                : `Енергія: ${homeEnergyCountLabel}`,
            en: energyBonusCapacity > 0
                ? `Energy: ${homeEnergyCountLabel}, temporary maximum plus ${energyBonusCapacity} until midnight`
                : `Energy: ${homeEnergyCountLabel}`,
            es: energyBonusCapacity > 0
                ? `Energía: ${homeEnergyCountLabel}, máximo temporal más ${energyBonusCapacity} hasta medianoche`
                : `Energía: ${homeEnergyCountLabel}`,
            'pt-BR': energyBonusCapacity > 0
                ? `Energia: ${homeEnergyCountLabel}, máximo temporário mais ${energyBonusCapacity} até meia-noite`
                : `Energia: ${homeEnergyCountLabel}`,
            vi: energyBonusCapacity > 0
                ? `Năng lượng: ${homeEnergyCountLabel}, giới hạn tạm thời tăng ${energyBonusCapacity} đến nửa đêm`
                : `Năng lượng: ${homeEnergyCountLabel}`,
            id: energyBonusCapacity > 0
                ? `Energi: ${homeEnergyCountLabel}, batas sementara bertambah ${energyBonusCapacity} hingga tengah malam`
                : `Energi: ${homeEnergyCountLabel}`,
            tr: energyBonusCapacity > 0
                ? `Enerji: ${homeEnergyCountLabel}, geçici sınır gece yarısına kadar artı ${energyBonusCapacity}`
                : `Enerji: ${homeEnergyCountLabel}`,
            pl: energyBonusCapacity > 0
                ? `Energia: ${homeEnergyCountLabel}, tymczasowy limit plus ${energyBonusCapacity} do północy`
                : `Energia: ${homeEnergyCountLabel}`,
        });
        const openHomeProfile = () => {
            hapticTap();
            setProfileIntroRequested(true);
            setHomeProfilePlayer({
                name: userName || 'Phraseman',
                points: 0,
                isMe: true,
                avatar: userAvatar,
                frame: userFrame,
                streak,
                isPremium,
                isVip,
            });
        };
        const renderHomeProfileButton = () => (
            <TouchableOpacity
                testID="home-profile-card-button"
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, {
                    ru: 'Моя карточка профиля',
                    uk: 'Моя картка профілю',
                    en: 'My profile card',
                    es: 'Mi tarjeta de perfil',
                    'pt-BR': 'Meu cartão de perfil',
                    vi: 'Thẻ hồ sơ của tôi',
                    id: 'Kartu profil saya',
                    tr: 'Profil kartım',
                    pl: 'Moja karta profilu',
                })}
                onPress={openHomeProfile}
                style={{ width: 48, height: 46, alignItems: 'center', justifyContent: 'center' }}
            >
                <View style={{ width: 44, height: 38, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person-circle-outline" size={30} color={isGoldTheme ? GOLD_RICH.paleGold : t.accent} />
                </View>
            </TouchableOpacity>
        );
        const showHomeFeatureTipCard = HOME_FEATURE_TIPS_ON_HOME && homeFeatureTipsHydrated && homeOnboardingDone && !homeFeatureTipsDone && homeFeatureTips.length > 0;
        const currentHomeFeatureTip = homeFeatureTips[clampHomeFeatureTipIndex(homeFeatureTipIndex, homeFeatureTips.length)] ?? homeFeatureTips[0];
        const homeFeatureTipAccent = isGoldTheme ? GOLD_RICH.champagne : t.accent;
        const showHomeFeatureTipTapHint = homeFeatureTipIndex === 0;
        const homeFeatureTipHintOpacity = homeFeatureTipHintPulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 0.98] });
        const homeFeatureTipHintScale = homeFeatureTipHintPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
        const homeFeatureTipA11y = currentHomeFeatureTip
            ? `${currentHomeFeatureTip.title}. ${currentHomeFeatureTip.body}`
            : '';
        // -1 = позиция «ушедшей» карточки, 0 = покой, 1 = позиция «пришедшей».
        // Знак сдвига берём из направления листания: вперёд новая приезжает справа, назад — слева.
        const homeFeatureTipSwapOffset = 26 * homeFeatureTipDirectionRef.current;
        const homeFeatureTipContentTranslate = homeFeatureTipReduceMotion
            ? 0
            : homeFeatureTipContentAnim.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [-homeFeatureTipSwapOffset, 0, homeFeatureTipSwapOffset],
            });
        // Гаснет на обоих краях — и когда уходит, и когда приходит; в покое (0) полностью видна.
        const homeFeatureTipContentOpacity = homeFeatureTipContentAnim.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [0, 1, 0],
        });
        // Подложка-стопка на миг подмены подтягивается вверх и «раскрывается» ближе к верхней карточке.
        const homeFeatureTipStackTranslate = homeFeatureTipStackAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -5],
        });
        const homeFeatureTipStackOpacity = homeFeatureTipStackAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.55, 0.82],
        });
        // Сама плашка на миг подмены слегка «садится» — читается как замена карточки целиком,
        // а не как подмена одного текста внутри неподвижной панели. Не ниже 0.97 (правило пресса).
        const homeFeatureTipCardScale = homeFeatureTipReduceMotion
            ? 1
            : homeFeatureTipStackAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.975],
            });
        // Герой-модуль оставляет серию и ряд дней недели без старого уровня.
        // Аватар слева занимает место бывшей стрик-колонки, поэтому кружки недели
        // получают больше ширины и не жмутся (24 → 28 в компактном режиме).
        const experimentalStatusWeekDotSize = eliteStatsCompact ? 26 : 30;
        const homeHeroAvatarSize = eliteStatsCompact ? 68 : 76;
        const homeHeroStreakIconSize = eliteStatsCompact ? 30 : 34;
        // зачем (PM-039, владелец 2026-09-24): homeHeroShowStreakUnit удалён —
        // он решал, показывать ли слово «день/дней», которого теперь нет вовсе.
        const renderHomeHeroStatus = () => (<Animated.View style={{
                opacity: eliteStatusEntrance,
                transform: [{ translateY: eliteCardY }, { scale: eliteCardScale }],
            }}>
              {/* зачем: владелец вернул раскладку «как было раньше» — слева аватарка,
                  а серия (иконка + число дней) уехала в правый верхний угол карточки.
                  Освободившуюся ширину забирает ряд дней недели. */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: eliteStatsCompact ? 12 : 14 }}>
                <TouchableOpacity
                  testID="home-hero-avatar-button"
                  activeOpacity={0.82}
                    // Ранг монеты — единственный актуальный путь изменения внешнего вида.
                  onPress={(event) => {
                    event.stopPropagation?.();
                    hapticTap();
                    nav.push('/coin_rank');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={triLang(lang, {
                    ru: 'Открыть ранг монеты',
                    uk: 'Відкрити ранг монети',
                    en: 'Open coin rank',
                    es: 'Abrir rango de moneda',
                    'pt-BR': 'Abrir patente da moeda',
                    vi: 'Mở hạng xu',
                    id: 'Buka peringkat koin',
                    tr: 'Madeni para rütbesini aç',
                    pl: 'Otwórz rangę monety',
                  })}
                  hitSlop={6}
                  style={{
                    width: homeHeroAvatarSize,
                    flexShrink: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AvatarView
                      avatar={userAvatar}
                      size={homeHeroAvatarSize}
                      ownerActive={homeRuntimeActive}
                  />
                </TouchableOpacity>

                <View testID="home-streak-progress-panel" style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <TouchableOpacity
                      testID="home-streak-status-panel"
                      activeOpacity={0.82}
                      onPress={(event) => {
                        event.stopPropagation?.();
                        hapticTap();
                        nav.push('/streak_stats');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${displayStreak} ${homeStreakDaysLabel}`}
                      hitSlop={6}
                      style={{
                        flexShrink: 0,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: eliteStatsCompact ? 4 : 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: eliteStatsCompact ? 4 : 6 }}>
                        <StreakChainIcon themeMode={themeMode} breathing={homeRuntimeActive} frozen={freezeActive} streakDays={streak} inactive={streakIconInactive} size={homeHeroStreakIconSize}/>
                        <View style={{ position: 'relative', minWidth: eliteStatsCompact ? 26 : 30, alignItems: 'center', justifyContent: 'center' }}>
                          <Animated.View
                            pointerEvents="none"
                            style={{
                              position: 'absolute',
                              width: eliteStatsCompact ? 34 : 38,
                              height: eliteStatsCompact ? 34 : 38,
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: homeThemePanelAccent,
                              opacity: streakRingOpacity,
                              transform: [{ scale: streakRingScale }],
                            }}
                          />
                          <Animated.Text maxFontSizeMultiplier={1} style={{ color: homeThemePanelText, fontSize: eliteStatsCompact ? 20 : 23, fontWeight: '800', lineHeight: eliteStatsCompact ? 24 : 27, includeFontPadding: false }}>
                            {displayStreak}
                          </Animated.Text>
                        </View>
                        {/* зачем (PM-039, владелец 2026-09-24): подпись «день/дня/дней»
                            под серией убрана — остаётся только число. Полная
                            формулировка не потеряна: она в accessibilityLabel
                            кнопки home-streak-status-panel (строка выше). */}
                        {/* Щит «защитить серию» — отдельная кнопка рядом с числом, а не
                            наложение поверх иконки: в компактном ряду перекрытие давало
                            промахи по тапу. */}
                        {streakAtRisk && !freezeActive ? (
                          <Pressable
                          testID="home-streak-freeze-shield"
                          accessibilityRole="button"
                          accessibilityLabel={triLang(lang, {
                            ru: 'Защитить серию',
                            uk: 'Захистити серію',
                            en: 'Protect streak',
                            es: 'Proteger la racha',
                            'pt-BR': 'Proteger a sequência',
                            vi: 'Bảo vệ chuỗi',
                            id: 'Lindungi rangkaian',
                            tr: 'Seriyi koru',
                            pl: 'Chroń serię',
                          })}
                          hitSlop={10}
                          onPress={(event) => {
                            event.stopPropagation?.();
                            hapticTap();
                            void handleFreezeStreak();
                          }}
                          style={({ pressed }) => ({
                            marginLeft: 2,
                            width: 34,
                            height: 34,
                            borderRadius: 12,
                            overflow: 'hidden',
                            borderWidth: 0,
                            opacity: pressed ? 0.82 : 1,
                            transform: [{ scale: pressed ? HOME_BUTTON_PRESS_SCALE : 1 }],
                          })}
                          >
                            <LinearGradient colors={homeThemePanelGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                              <StreakChainIcon themeMode={themeMode} frozen streakDays={streak} size={24}/>
                            </LinearGradient>
                          </Pressable>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  </View>

                </View>
              </View>

              {/* зачем: владелец выбрал вариант B — дни недели вынесены из правой
                  колонки на всю ширину карточки, чтобы ряд был отцентрован, а не
                  прижат вправо под аватаром. */}
              <View testID="home-week-days-row" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: eliteStatsCompact ? 14 : 16, paddingHorizontal: eliteStatsCompact ? 0 : 2 }}>
                {weekDays.map((d, i) => {
                  const marker = markerForWeekDay(i);
                  const marked = isWeekDayMarked(i);
                      return (<View key={i} style={{ width: experimentalStatusWeekDotSize, flexShrink: 1, alignItems: 'center', gap: 4 }}>
                    <Animated.View style={i === todayIdx && marked && weekDotAnimationToken ? { transform: [{ scale: weekDotPulseScale }] } : undefined}>
                      <View style={{
                      width: experimentalStatusWeekDotSize,
                      height: experimentalStatusWeekDotSize,
                      borderRadius: experimentalStatusWeekDotSize / 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      backgroundColor: weekDotFill(i, marker, i === todayIdx ? weekDotTheme.todayBg : weekDotTheme.emptyBg),
                      borderWidth: marker === 'freeze' ? 1 : todayRingWidth(i, marker) ?? (marked ? 0 : 1),
                      borderColor: weekDotBorder(i, marker, i === todayIdx ? weekDotTheme.todayBorder : weekDotTheme.emptyBorder),
                  }}>
                            {renderWeekMarkerContent(marker, experimentalStatusWeekDotSize, eliteStatsCompact ? 14 : 16, weekDotTheme.checkColor) ?? (weekDone[i] && <Ionicons name="checkmark" size={eliteStatsCompact ? 14 : 16} color={weekDotTheme.checkColor}/>)}
                      </View>
                    </Animated.View>
                    {/* Метка дня («Пн», «Ср»…) не обрезается в многоточие: ширина по
                        содержимому + разрешаем не сжимать (numberOfLines убран). */}
                    <Text maxFontSizeMultiplier={1} style={{ color: weekDayLabelColor(i, i === todayIdx ? t.accent : homeThemePanelText, homeThemePanelMuted), fontSize: eliteStatsCompact ? 10 : 11, fontWeight: '900', lineHeight: eliteStatsCompact ? 12 : 14, textAlign: 'center' }}>
                      {d}
                    </Text>
                  </View>);
                })}
              </View>
              {/* Кнопка «Спин» — точь-в-точь как на экране подарков (золотая
                  пилюля со словом и счётчиком). Появляется, только когда спин
                  реально заработан.
                  зачем (владелец 2026-08-23): один и тот же элемент во всём
                  приложении выглядит одинаково — своя круглая иконка тут была
                  лишней сущностью. Сидит по центру внизу карточки. Кнопка стоит
                  В ПОТОКЕ под рядом дней
                  недели, а не абсолютом поверх: пилюля 44px перекрывала бы
                  подпись «Вс» в правом углу. */}
              {/* зачем (владелец 2026-09-14): «спин и подарок маленькой иконкой
                  в хедер». Широкие пилюли отсюда убраны — их место заняли иконки
                  со счётчиками в шапке. Здесь остаётся ТОЛЬКО невидимая цель
                  полёта награды: её терять нельзя, к ней летят подарки. */}
              <View
                testID="home-gift-entry-target"
                ref={homeGiftEntryTargetRef as React.Ref<View>}
                collapsable={false}
                pointerEvents="none"
                style={{ position: 'absolute', right: 0, bottom: 0, width: 104, height: 44 }}
              />
              {showStatsPulseHint && (<Animated.Text accessibilityLiveRegion="polite" style={{
                    color: t.accent,
                    fontSize: 13,
                    fontWeight: '700',
                    marginTop: 14,
                    textAlign: 'center',
                    lineHeight: 18,
                    opacity: statsHintPulseAnim,
                }}>
                  {homeHintText ?? s.home.statsPulseHint}
                </Animated.Text>)}
            </Animated.View>);
        const homeV2Days = Math.max(0, displayStreak);
        const homeV2DaysRuForm = homeV2Days % 10 === 1 && homeV2Days % 100 !== 11
            ? 0
            : homeV2Days % 10 >= 2 && homeV2Days % 10 <= 4 && (homeV2Days % 100 < 12 || homeV2Days % 100 > 14) ? 1 : 2;
        const homeV2DaysLabel = triLang(lang, {
            ru: `${homeV2Days} ${['день', 'дня', 'дней'][homeV2DaysRuForm]}`,
            uk: `${homeV2Days} ${['день', 'дні', 'днів'][homeV2DaysRuForm]}`,
            en: `${homeV2Days} ${homeV2Days === 1 ? 'day' : 'days'}`,
            es: `${homeV2Days} ${homeV2Days === 1 ? 'día' : 'días'}`,
            'pt-BR': `${homeV2Days} ${homeV2Days === 1 ? 'dia' : 'dias'}`,
            vi: `${homeV2Days} ngày`, id: `${homeV2Days} hari`, tr: `${homeV2Days} gün`,
            pl: `${homeV2Days} ${homeV2Days === 1 ? 'dzień' : 'dni'}`,
        });
        const homeV2StreakWord = triLang(lang, { ru: 'Серия', uk: 'Серія', en: 'Streak', es: 'Racha', 'pt-BR': 'Sequência', vi: 'Chuỗi', id: 'Runtunan', tr: 'Seri', pl: 'Seria' });
        // зачем D129/D130: плитка показывается, только если её раздел готов для языка обучения.
        const homeV2AllTiles: HomeFeatureTile[] = [
            {
                key: 'lessons',
                title: quickItems[0]!.label,
                subtitle: triLang(lang, { ru: 'Грамматика шаг за шагом', uk: 'Граматика крок за кроком', en: 'Grammar step by step', es: 'Gramática paso a paso', 'pt-BR': 'Gramática passo a passo', vi: 'Ngữ pháp từng bước', id: 'Tata bahasa langkah demi langkah', tr: 'Adım adım dilbilgisi', pl: 'Gramatyka krok po kroku' }),
                onPress: quickItems[0]!.onPress,
                art: require('../../assets/images/v2/book_stack.png'),
            },
            {
                key: 'dialogs',
                title: quickItems[1]!.label,
                subtitle: triLang(lang, { ru: 'Реальные ситуации', uk: 'Реальні ситуації', en: 'Real-life situations', es: 'Situaciones reales', 'pt-BR': 'Situações reais', vi: 'Tình huống thực tế', id: 'Situasi nyata', tr: 'Gerçek durumlar', pl: 'Prawdziwe sytuacje' }),
                onPress: quickItems[1]!.onPress,
                art: require('../../assets/images/v2/chat_bubbles.png'),
            },
            {
                key: 'cards',
                title: quickItems[2]!.label,
                subtitle: triLang(lang, { ru: 'Слова, фразы и выражения', uk: 'Слова, фрази й вирази', en: 'Words, phrases and idioms', es: 'Palabras, frases y expresiones', 'pt-BR': 'Palavras, frases e expressões', vi: 'Từ, cụm từ và thành ngữ', id: 'Kata, frasa, dan ungkapan', tr: 'Kelimeler, ifadeler, deyimler', pl: 'Słowa, zwroty i wyrażenia' }),
                onPress: quickItems[2]!.onPress,
                art: require('../../assets/images/v2/notecard_stack.png'),
            },
        ];
        const homeV2TileVisible: Record<string, boolean> = {
            lessons: homeLearnVisible,
            dialogs: homeDialoguesVisible,
            cards: homeFlashcardsVisible,
        };
        const homeV2Tiles = homeV2AllTiles.filter((tile) => homeV2TileVisible[tile.key] === true);
        // TODO(PM-259): заменить заглушку на useTodayTasks() программы 2.0.
        // зачем D129: задания только из разделов, видимых для языка обучения.
        const homeV2Tasks = filterTodayTasksForTarget(buildTodayTasksPlaceholder(lang, lastLesson ? lastLessonName : null), studyTarget);
        const homeV2CoinsLabel = triLang(lang, { ru: 'Монеты', uk: 'Монети', en: 'Coins', es: 'Monedas', 'pt-BR': 'Moedas', vi: 'Xu', id: 'Koin', tr: 'Jeton', pl: 'Monety' });
        const homeV2Palette = getV2Palette(t, themeMode);
        const renderHomeV2 = () => (
          <BouncyScrollView ref={homeScrollRef} scrollEnabled={pageScrollEnabled} showsVerticalScrollIndicator={false} decelerationRate="fast" onScrollWorklet={homeScrollWorklet} onScrollEndDrag={handleHomeScrollSettled} onMomentumScrollEnd={handleHomeScrollSettled} onLayout={(event: LayoutChangeEvent) => {
            homeViewportHeightRef.current = event.nativeEvent.layout.height;
            refreshDailyPhraseVisibility();
          }} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: tabContentBottomPad, paddingHorizontal: V2.homePad, gap: V2.gap }}>
            <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
              <HomeV2Header
                bellSlot={(
                  <NotificationCenterButton
                    isHomeTabActive={homeRuntimeActive}
                    homeFocusTick={focusTick}
                    requestedReportReply={requestedReportReply}
                    onRequestedReportReplyHandled={handleRequestedReportReplyHandled}
                  />
                )}
                avatarSlot={(
                  <TouchableOpacity
                    testID="home-hero-avatar-button"
                    activeOpacity={0.82}
                    onPress={openHomeProfile}
                    accessibilityRole="button"
                    accessibilityLabel={triLang(lang, { ru: 'Мой профиль', uk: 'Мій профіль', en: 'My profile', es: 'Mi perfil', 'pt-BR': 'Meu perfil', vi: 'Hồ sơ của tôi', id: 'Profil saya', tr: 'Profilim', pl: 'Mój profil' })}
                    hitSlop={6}
                  >
                    {homeCoinRankSource ? (
                      <Image testID="home-avatar-coin-rank" source={homeCoinRankSource} style={{ width: 48, height: 48 }} contentFit="contain" />
                    ) : (
                      <View testID="home-avatar-coin-loading" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.bgSurface2 }} />
                    )}
                  </TouchableOpacity>
                )}
                stats={[
                  {
                    testID: 'home-v2-streak',
                    icon: <Ionicons name="flame" size={20} color={homeV2Palette.iconTint} />,
                    value: homeV2DaysLabel,
                    label: homeV2StreakWord,
                    accessibilityLabel: `${homeV2StreakWord}: ${homeV2DaysLabel}`,
                    onPress: () => { nav.push('/streak_stats'); },
                  },
                  {
                    testID: 'home-v2-coins',
                    icon: homeCoinRankSource ? (
                      <Image source={homeCoinRankSource} style={{ width: 20, height: 20 }} contentFit="contain" />
                    ) : (
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: t.bgSurface2 }} />
                    ),
                    value: String(rewardCollect.displayRunes(runesBalance)),
                    label: homeV2CoinsLabel,
                    accessibilityLabel: `${homeV2CoinsLabel}: ${rewardCollect.displayRunes(runesBalance)}`,
                    onPress: () => { nav.push('/coin_rank'); },
                  },
                ]}
              />
            </View>
            {priorityCardVisible ? (
              <HomeV2ContinueCard
                overline={triLang(lang, { ru: 'Продолжить обучение', uk: 'Продовжити навчання', en: 'Continue learning', es: 'Seguir aprendiendo', 'pt-BR': 'Continuar aprendendo', vi: 'Tiếp tục học', id: 'Lanjutkan belajar', tr: 'Öğrenmeye devam et', pl: 'Kontynuuj naukę' }).toUpperCase()}
                title={priorityCardTitle}
                done={priorityCardShowsMistakes ? 0 : Math.max(0, Math.min(50, lastLesson?.progress ?? 0))}
                total={priorityCardShowsMistakes ? Math.max(1, mistakeActiveCount) : 50}
                art={priorityCardImage}
                badge={!priorityCardShowsMistakes && lastLesson ? triLang(lang, { ru: `Урок ${lastLesson.id}`, uk: `Урок ${lastLesson.id}`, en: `Lesson ${lastLesson.id}`, es: `Lección ${lastLesson.id}`, 'pt-BR': `Lição ${lastLesson.id}`, vi: `Bài ${lastLesson.id}`, id: `Pelajaran ${lastLesson.id}`, tr: `Ders ${lastLesson.id}`, pl: `Lekcja ${lastLesson.id}` }) : undefined}
                accessibilityLabel={priorityCardShowsMistakes ? `${priorityCardTitle}: ${homeMistakesCounterLabel(mistakeActiveCount)}` : `${s.home.continueBtn}: ${lastLessonName}`}
                onLongPress={priorityCardLongPressEnabled ? handleHomeLearningPriorityCardLongPress : undefined}
                onPress={() => {
                  if (homePriorityCardLongPressHandledRef.current) return;
                  if (priorityCardShowsMistakes) { openHomeMistakesHub('home_priority_card'); return; }
                  if (!lastLesson) return;
                  logFeatureOpened('lesson_menu');
                  trackFeatureOpened('lesson_menu').catch((error: unknown) => {
                    if (__DEV__) console.warn('[HOME-NAV] track_feature_failed', error instanceof Error ? error.message : String(error)); // guard-ok
                  });
                  perfNavStart('lesson_menu');
                  router.push({ pathname: '/lesson_menu', params: { id: String(lastLesson.id) } } as never);
                }}
              />
            ) : null}
            <View style={{ gap: 4 }}>
              {homeV2Tiles.length > 0 ? <HomeV2FeatureTiles tiles={homeV2Tiles} /> : null}
              {isVideoButtonEnabled() && homeVideosVisible && !homeV2VideoNoChannel ? (
                <HomeV2VideoRail
                  videos={homeV2Videos}
                  status={homeV2VideoStatus}
                  ownerActive={homeRuntimeActive}
                  onSeeAll={() => go('/(tabs)/video')}
                />
              ) : null}
            </View>
            <HomeV2TodayCard
              title={triLang(lang, { ru: 'Сегодня', uk: 'Сьогодні', en: 'Today', es: 'Hoy', 'pt-BR': 'Hoje', vi: 'Hôm nay', id: 'Hari ini', tr: 'Bugün', pl: 'Dziś' }).toUpperCase()}
              tasks={homeV2Tasks}
              onOpenTask={(task) => go(task.route)}
            />
            {/* зачем D129: «Фраза дня» только там, где есть банк фраз для языка (en, fr). */}
            {homeDailyPhraseVisible ? (
            <View onLayout={(event: LayoutChangeEvent) => {
                dailyPhraseLayoutRef.current = { top: event.nativeEvent.layout.y, height: event.nativeEvent.layout.height };
                refreshDailyPhraseVisibility();
            }}>
              <DailyPhraseCard variant="homeV2" homeCardVisible={dailyPhraseCardVisible} />
            </View>
            ) : null}
          </BouncyScrollView>
        );
        // зачем (владелец 24.09, 2.0): Главная ровно как на референсе — шапка,
        // «Продолжить обучение», три плитки, горизонтальное Видео, «Сегодня»,
        // «Фраза дня». Блок Видео возвращён по последнему решению владельца;
        // устаревшие социальные и экспериментальные блоки остаются вне Главной. Старая разметка ниже
        // больше не рисуется; её осиротевшую логику дочищает программа 2.0.
        if (HOME_V2_LAYOUT) return renderHomeV2();
        return (<BouncyScrollView ref={homeScrollRef} scrollEnabled={pageScrollEnabled} showsVerticalScrollIndicator={false} decelerationRate="fast" onScrollWorklet={homeScrollWorklet} onScrollEndDrag={handleHomeScrollSettled} onMomentumScrollEnd={handleHomeScrollSettled} onLayout={(event: LayoutChangeEvent) => {
            homeViewportHeightRef.current = event.nativeEvent.layout.height;
            refreshDailyPhraseVisibility();
        }} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: tabContentBottomPad, marginTop: -4 }}>

          {/* ХЕДЕР: один ряд на обычном экране, два устойчивых ряда на узком.
              Слева — жемчужины, руны + бюст (карточка профиля).
              Справа — энергия (1 иконка + цифры), видео, чаты, колокольчик (единый центр событий и сообщений команды).
              Имя убрано с главной: оно есть в карточке профиля по тапу на бюст. */}
          <Animated.View style={sectionStyle(0)}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 20, paddingBottom: 12, gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: homeHeaderCompact ? 'column' : 'row', alignItems: homeHeaderCompact ? 'stretch' : 'center', gap: 0 }}>
                {/* зачем: жемчужины и руны уехали в строку заголовка «Быстрый
                    старт» (см. home-quickstart-currency-row). Контейнер остался
                    ради колокольчика на широком экране и Dev Hub; на узком там
                    пусто, поэтому ряд не рендерим совсем — иначе в колонке
                    висит пустой блок. */}
                {(!homeHeaderCompact || ENABLE_DEV_TOOLS) ? (
                <View testID="home-header-currency-actions" style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
                {/* зачем: владелец попросил поменять местами бюст/профиль и колокольчик —
                    теперь колокольчик (с бейджем непрочитанных) идёт сразу после осколков,
                    а аватар/бюст профиля уходит на дальний правый край, где раньше был
                    колокольчик. onPress/бейдж каждой кнопки не тронуты. */}
                {/* зачем (PM-038 ОТМЕНЁН владельцем 2026-09-24, см. коммит PM-037/039/040):
                    колокольчик возвращён в хедер как было — попытка убрать его отменена. */}
                {!homeHeaderCompact ? (
                  <NotificationCenterButton
                    isHomeTabActive={homeRuntimeActive}
                    homeFocusTick={focusTick}
                    requestedReportReply={requestedReportReply}
                    onRequestedReportReplyHandled={handleRequestedReportReplyHandled}
                  />
                ) : null}
                {/* зачем (владелец, 2026-09-01): из хедера убраны дев-кнопки
                    «подарок путешествия» и «намёк на аватарке». Колба остаётся:
                    это ЕДИНСТВЕННЫЙ вход в Dev Hub, без неё вся дев-панель
                    становится недоступна. */}
                {ENABLE_DEV_TOOLS && (
                  <TouchableOpacity
                    testID="home-dev-hub-button"
                    accessibilityRole="button"
                    accessibilityLabel="Открыть Dev Hub"
                    activeOpacity={0.72}
                    onPress={() => {
                      hapticTap();
                      onOpenDevHub?.();
                    }}
                    style={{ width: 40, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="flask-outline" size={21} color={t.heroTextPrimary} />
                  </TouchableOpacity>
                )}
                {ENABLE_DEV_TOOLS && (
                  <TouchableOpacity
                    testID="home-dev-hint-demo"
                    accessibilityRole="button"
                    accessibilityLabel="Показать случайную подсказку"
                    accessibilityHint="Показывает случайную подсказку и запускает тот же пульс"
                    activeOpacity={0.72}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    onPress={() => {
                      hapticTap();
                      handleDevHomeHintDemo();
                    }}
                    style={{ width: 44, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="bulb-outline" size={20} color={t.heroTextPrimary} />
                    <Text style={{ color: t.heroTextPrimary, fontSize: 8, fontWeight: '900', marginTop: 1 }}>HINT</Text>
                  </TouchableOpacity>
                )}
                {/* зачем (владелец, 2026-09-01): кнопка проигрывает анимацию
                    по требованию. Каждое нажатие — следующий режим по кругу:
                    всё → руны+жемчуг → руны → жемчуг → прогресс → прогресс+руны →
                    повышение ранга → цепочка из трёх уровней. Подпись показывает, что
                    проиграет СЕЙЧАС, чтобы не считать нажатия в уме.
                    Ни очередь наград, ни очередь праздников не расходуются:
                    демо двигает только картинку, реальные значения профиля не
                    меняются. */}
                {ENABLE_DEV_TOOLS && (
                  <TouchableOpacity
                    testID="home-dev-reward-demo"
                    accessibilityRole="button"
                    accessibilityLabel={`DEV: проиграть анимацию — ${homeDemoMode.label}`}
                    accessibilityHint="Каждое нажатие переключает набор анимаций"
                    activeOpacity={0.72}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    onPress={() => {
                      hapticTap();
                      runHomeRewardDemo();
                    }}
                    style={{ width: 44, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="sparkles-outline" size={20} color={t.heroTextPrimary} />
                    <Text
                      maxFontSizeMultiplier={1}
                      style={{ color: t.heroTextPrimary, fontSize: 9, fontWeight: '900', lineHeight: 10 }}
                    >
                      {homeDemoMode.label}
                    </Text>
                  </TouchableOpacity>
                )}
                {/* DEV-only fixture: switches the shared priority slot between
                    the real last lesson and 10 in-memory practice mistakes.
                    It never writes fake learning events into the user journal. */}
                {ENABLE_DEV_TOOLS && (
                  <TouchableOpacity
                    testID="home-dev-mistakes-toggle"
                    accessibilityRole="button"
                    accessibilityLabel="DEV: случайное число ошибок"
                    accessibilityHint="Тап — новое случайное число от десяти. Удерживай, чтобы вернуть настоящие данные"
                    accessibilityState={{ selected: devMistakesCardEnabled }}
                    activeOpacity={0.72}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    onPress={() => {
                      hapticTap();
                      handleDevRandomMistakes();
                    }}
                    onLongPress={() => {
                      hapticTap();
                      handleDevRandomMistakesReset();
                    }}
                    delayLongPress={420}
                    style={{
                      width: 44,
                      minHeight: 46,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: devMistakesCardEnabled ? t.wrongBg : 'transparent',
                    }}
                  >
                    <Ionicons
                      name={devMistakesCardEnabled ? 'alert-circle' : 'dice-outline'}
                      size={20}
                      color={devMistakesCardEnabled ? t.wrong : t.heroTextPrimary}
                    />
                    {/* Показываем ДЕЙСТВУЮЩЕЕ число, а не «10»: иначе не видно,
                        что именно сейчас подставлено, и проверять нечего. */}
                    <Text
                      maxFontSizeMultiplier={1}
                      style={{ color: devMistakesCardEnabled ? t.wrong : t.heroTextPrimary, fontSize: 9, fontWeight: '900', lineHeight: 10 }}
                    >
                      {devMistakesCardEnabled ? devMistakesCount : '?'}
                    </Text>
                  </TouchableOpacity>
                )}
                </View>
                ) : null}
                {!homeHeaderCompact ? (
                  <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
                    {discountBadgeLabel ? (
                      <HomeDiscountBadge
                        percentLabel={discountBadgeLabel}
                        onPress={() => openPremiumPaywall(router, { context: 'home_discount_badge', source: 'home_header_center' })}
                      />
                    ) : null}
                  </View>
                ) : null}
                <View testID="home-header-secondary-actions" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: homeHeaderCompact ? 'flex-end' : 'flex-start', gap: 0 }}>
                {/* зачем (PM-038 ОТМЕНЁН владельцем 2026-09-24): колокольчик
                    возвращён и в компактный ряд как было. */}
                {homeHeaderCompact ? (
                  <NotificationCenterButton
                    isHomeTabActive={homeRuntimeActive}
                    homeFocusTick={focusTick}
                    requestedReportReply={requestedReportReply}
                    onRequestedReportReplyHandled={handleRequestedReportReplyHandled}
                  />
                ) : null}
                {/* зачем (владелец 2026-09-21): вход в видео вернулся в хедер и
                    называется «Видеоуроки» — из ряда «Сегодня» кнопка убрана
                    вместе с соседней «Ошибки» (её заменили зарубка прогресса
                    и переключаемая карточка урока). Счётчик показывает
                    непросмотренные ролики и гаснет сразу по тапу. */}
                {isVideoButtonEnabled() ? (
                  <TouchableOpacity
                    testID="home-header-videos"
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={videoUnreadCount > 0
                      ? `${homeVideoLessonsLabel}: ${homeMistakesCounterLabel(videoUnreadCount)}`
                      : homeVideoLessonsLabel}
                    onPress={() => {
                      hapticTap();
                      // Optimistic: значок гаснет в этом же кадре, отметка
                      // «просмотрено» уходит фоном (сети не ждём).
                      setVideoUnreadCount(0);
                      void markLingmanYoutubeCatalogSeen(latestVideoIdRef.current);
                      nav.push('/lingman_videos' as never);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    style={{ minHeight: 46, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="play-circle-outline" size={HOME_HEADER_ACTION_ICON} color={t.heroTextPrimary} />
                    {videoUnreadCount > 0 ? (
                      <View testID="home-header-videos-count" style={homeHeaderBadgeStyle}>
                        <Text maxFontSizeMultiplier={1} style={homeHeaderBadgeTextStyle}>{homeMistakesCounterLabel(videoUnreadCount)}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ) : null}
                {renderHomeProfileButton()}
                </View>
              </View>
              {/* зачем (аудит 2026-08-24): всплывающее «+N» переехало отсюда к самой
                  иконке жемчужин в строке «Быстрый старт». Иконка уехала туда, а
                  надпись осталась в хедере и всплывала над пустым местом — награда
                  визуально отрывалась от счётчика, который она увеличивает. */}
            </View>
          </View>
          </Animated.View>

          {/* ── ФОКУС ДНЯ: три кольца + один CTA (Bevel-подход) ── */}
          {/* зачем: владелец заменил витрину статистики на one-glance статус дня —
              кольца Урок/Практика/Карточки, единственная акцентная кнопка и строка
              Компаса. Полная статистика — по тапу на статус-строку (/streak_stats). */}
          <Animated.View style={sectionStyle(1)}>
          {/* Герой: серия + неделя — тап открывает статистику */}
          {/* зачем (спека Daily Journey, п. 5.9): обёртка несёт пульс доставки
              (1→1.035→1); отдельный стабильный слот внутри карточки является
              точной целью полёта награды. */}
          <Animated.View ref={homeStatsCardRef as React.Ref<View>} collapsable={false} style={{ marginHorizontal: 8, marginBottom: 12, transform: [{ scale: dailyJourneyPulseAnim }] }}>
          <TouchableOpacity testID="home-stats-card" activeOpacity={0.88} onPress={() => { hapticTap(); nav.push('/streak_stats'); }} style={isGoldTheme ? goldShadow(3) : isOliveTheme ? oliveShadow(2) : null} accessibilityRole="button" accessibilityLabel={s.home.statsCardTitle} accessibilityHint={s.home.statsPulseHint}>
            <LinearGradient colors={homeThemePanelGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 1, y: 1 }} end={{ x: 0, y: 0 }} style={{ borderRadius: isGoldTheme ? 18 : 24, borderWidth: 0, borderColor: 'transparent', padding: 18, minHeight: HOME_STATS_CARD_MIN_HEIGHT, overflow: 'hidden' }}>
              {isGoldTheme && <GoldBevel radius={18} intensity="strong"/>}
              {renderHomeHeroStatus()}
            </LinearGradient>
          </TouchableOpacity>
          </Animated.View>

          {/* БЫСТРЫЙ СТАРТ: Уроки / Карточки.
              зачем: владелец вернул ряд плиток вместо трёх колец — иконка сама
              называет действие, подпись под ней короткая (запрет на подписи-
              расшифровки соблюдён: это label плитки, а не описание). */}
          {/* зачем (аудит свайпов 2026-08-16): раньше блок был горизонтальным скроллером
              и держал tabSwipeLock, чтобы TabSlider не крал жест. Плитки — статичный
              ряд, скроллить нечего, а замок глушил свайп по табам, начатый с этой зоны:
              палец на плитке → tabSwipeLocked=true → onUpdate/onEnd слайдера выходят,
              страница не едет. Замок снят; обёртка оставлена как нейтральный контейнер. */}
          <View>
            {/* Заголовок секции — тот же кегль/вес, что у «Сегодня» ниже: одна
                типографическая ступень для всех разделов главного экрана. */}
            {/* зачем (владелец 2026-08-24): жемчужины и руны ушли из хедера и с
                карточки уровня сюда — в правый край строки заголовка «Быстрый
                старт». Ряд общий с заголовком, поэтому валюты не занимают
                отдельную высоту и не двигают плитки вниз. Энергия осталась
                в хедере — у неё своя подсказка по тапу. */}
            <View style={{ marginHorizontal: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FlowText testID="home-quickstart-title" provenance="authored" style={{ flexShrink: 1, color: t.textPrimary, fontSize: Math.max(13, f.label), fontWeight: '900', letterSpacing: 0, textTransform: 'uppercase' }}>
                {triLang(lang, {
                  ru: 'Практика', uk: 'Практика', en: 'Practice', es: 'Práctica', 'pt-BR': 'Prática',
                  vi: 'Luyện tập', id: 'Latihan', tr: 'Pratik', pl: 'Praktyka',
                })}
              </FlowText>

              <View style={{ flex: 1, minWidth: 0 }} />

              <View testID="home-quickstart-currency-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {/* зачем (владелец 2026-09-14): «энергию на уровень с жемчугом и
                    рунами, размер такой же». Иконка берёт homeQuickCurrencyIconSize
                    и кегль 15 — ровно как соседи, а не прежние 30/14 из хедера.
                    energyIconRef остаётся якорем подсказки: она просто открывается
                    теперь под этим рядом. */}
                {showHomeEnergy && (
                  <View ref={energyIconRef} collapsable={false} style={{ flexShrink: 0 }}>
                    <TouchableOpacity
                      testID="home-quickstart-energy"
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={homeEnergyA11yLabel}
                      onPress={showEnergyTooltip}
                      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <EnergyIcon filled={homeEnergyTotal > 0} themeColor={homeEnergyTotal > 0 ? energyFilledColor : (isLightTheme ? energyEmptyTint : t.textGhost)} size={homeQuickCurrencyIconSize} animateChange={true} animateLoop={homeRuntimeActive} shouldShake={false} themeMode={themeMode}/>
                        {/* зачем (владелец 2026-09-14): «только сколько сейчас» —
                            в ряду валют жемчуг и руны показывают одно число, и
                            энергия обязана читаться так же. Дробь «сейчас/максимум»
                            выбивалась из ряда; максимум остаётся в подсказке по тапу. */}
                        <Text maxFontSizeMultiplier={1} style={{ color: t.textPrimary, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
                          {homeEnergyTotal}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
                {/* зачем: владелец 2026-08-24 — тап по счётчику рун открывает раздел «Руны».
                    Обёртка снаружи (как у жемчужин выше), сам HomeRuneBalance не трогаем —
                    его параллельно правит другая сессия. Сторож: runes_wallet_no_shop_contract. */}
                <TouchableOpacity
                  testID="home-quickstart-runes"
                  accessibilityRole="button"
                  // зачем (аудит 2026-08-24): метка живёт на кнопке, а чип внутри
                  // отдаёт свою группу доступности (standaloneA11y={false}) —
                  // иначе скринридер видел два фокуса на одном чипе и читал
                  // баланс дважды. Тот же приём, что в RuneBalanceChip.
                  accessibilityLabel={homeRunesA11yLabel}
                  activeOpacity={0.75}
                  hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
                  onPress={() => {
                    hapticTap();
                    nav.push('/runes_wallet');
                  }}
                >
                  {/* Обёртка нужна ровно для двух вещей: замер цели полёта
                      (центр счётчика в координатах окна) и вспышка приземления.
                      Сам HomeRuneBalance не трогаем — он общий для Главной,
                      Арены, Лиги и карточки цели. */}
                  <Reanimated.View
                    ref={rewardCollect.measureRunesTarget}
                    collapsable={false}
                    style={rewardCollect.runesPulseStyle}
                  >
                  <HomeRuneBalance
                    balance={rewardCollect.displayRunes(runesBalance)}
                    color={isGoldTheme ? GOLD_RICH.paleGold : t.gold}
                    iconSize={homeQuickCurrencyIconSize}
                    valueSize={15}
                    // Строка заголовка плотная: резерв 46px под тап-цель шапки
                    // раздувал её и толкал плитки вниз. Зону нажатия даёт hitSlop.
                    reserveTapHeight={false}
                    standaloneA11y={false}
                    accessibilityLabel={homeRunesA11yLabel}
                  />
                  </Reanimated.View>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ marginBottom: 12, paddingHorizontal: 8, gap: 14, flexDirection: 'row' }}>
              {visibleQuickItems.map((item, index) => {
                const tileOpacity = eliteQuickTileEntrance[index] ?? eliteStatusEntrance;
                const tileY = tileOpacity.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
                const tilePanelBg = isGoldTheme ? goldPanelBg : isPaperHomeTheme ? lightPanelBg : 'rgba(255,255,255,0.055)';
                const tileIconBg = isGoldTheme ? goldIconPlateBg : isPaperHomeTheme ? lightPanelIconBg : 'rgba(255,255,255,0.045)';
                return (
                  <Animated.View
                    key={item.key}
                    style={{ flex: 1, opacity: tileOpacity, transform: [{ translateY: tileY }] }}
                    // зачем: полёт карточек должен приземляться точно в плитку
                    // «Карточки». Меряем её центр в координатах окна; замер
                    // пассивный и вёрстку не двигает.
                    onLayout={item.key === 'flashcards' ? (event) => {
                      const { x, y, width, height } = event.nativeEvent.layout;
                      setCardsTileCenter({ x: x + width / 2, y: y + height / 2 });
                    } : undefined}
                  >
                    <TouchableOpacity
                      testID={item.testID}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                      activeOpacity={0.78}
                      onPress={item.onPress}
                      style={{
                        flex: 1,
                        borderRadius: isGoldTheme ? 14 : 18,
                        overflow: 'hidden',
                        backgroundColor: tilePanelBg,
                        borderWidth: isPaperHomeTheme ? 1 : 0,
                        borderColor: isPaperHomeTheme ? homeThemePanelBorder : 'transparent',
                        ...(isGoldTheme ? goldShadow(1) : isOliveTheme ? oliveShadow(1) : {}),
                      }}>
                      <View style={{ flex: 1, minHeight: homeQuickIconPlateSize + 52, borderRadius: isGoldTheme ? 14 : 18, paddingHorizontal: 10, paddingVertical: 13, alignItems: 'center', gap: 6 }}>
                        {isGoldTheme && <GoldBevel radius={14} intensity="quiet"/>}
                        <View style={{
                          width: homeQuickIconPlateSize,
                          height: homeQuickIconPlateSize,
                          borderRadius: homeQuickIconRadius,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: tileIconBg,
                        }}>
                          <LightSketchMenuImage source={item.img} width={homeQuickThemeArtSize} height={homeQuickThemeArtSize} lighten={false} align={getHomeMenuIconAlignment(themeMode, item.iconKey)} contentFit="contain" cachePolicy="memory-disk"/>
                        </View>
                        {/* зачем: подпись плитки быстрого старта — короткие лейблы
                            умещаются в одну строку;
                            FlowText переносит целиком вместо обрезания на случай длинных переводов. */}
                        <FlowText testID="home-quick-tile-label" provenance="authored" style={{ color: isPaperHomeTheme ? homeThemePanelText : t.textPrimary, fontSize: Math.max(12, f.label - 1), fontWeight: '800', textAlign: 'center' }}>{item.label}</FlowText>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </View>




          </Animated.View>

          {/* Единый приоритетный слот: при 10+ активных ошибках «Мои ошибки»
              занимает ровно место «Продолжить урок»; ниже порога остаётся урок. */}
          {(<Animated.View style={sectionStyle(2)}>

          {priorityCardVisible ? (
            <Reanimated.View style={homePriorityCardScaleStyle}>
              <TouchableOpacity
                testID="home-continue-lesson"
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={priorityCardShowsMistakes
                  ? `${priorityCardTitle}: ${homeMistakesCounterLabel(mistakeActiveCount)}`
                  : `${s.home.continueBtn}: ${lastLessonName}`}
                // Жест не самоочевиден, поэтому его называет подсказка — но
                // только когда он реально работает (есть хотя бы одна ошибка).
                accessibilityHint={priorityCardLongPressEnabled
                  ? triLang(lang, {
                      ru: 'Удерживай, чтобы переключить на мои ошибки и обратно',
                      uk: 'Утримуй, щоб перемкнути на мої помилки та назад',
                      en: 'Hold to switch between the lesson and your mistakes',
                      es: 'Mantén pulsado para cambiar entre la lección y tus errores',
                      'pt-BR': 'Segure para alternar entre a lição e seus erros',
                      vi: 'Giữ để chuyển giữa bài học và lỗi của bạn',
                      id: 'Tahan untuk beralih antara pelajaran dan kesalahan',
                      tr: 'Ders ile hataların arasında geçmek için basılı tut',
                      pl: 'Przytrzymaj, aby przełączyć między lekcją a błędami',
                    })
                  : undefined}
                activeOpacity={0.82}
                onPressIn={handleHomeLearningPriorityCardPressIn}
                onPressOut={handleHomeLearningPriorityCardPressOut}
                onLongPress={handleHomeLearningPriorityCardLongPress}
                delayLongPress={380}
                onPress={() => {
                  if (homePriorityCardLongPressHandledRef.current) return;
                  hapticTap();
                  // зачем: карточка ведёт туда, что на ней нарисовано. Иначе
                  // человек, увидевший «Мои ошибки», попал бы в меню урока.
                  if (priorityCardShowsMistakes) {
                    openHomeMistakesHub('home_priority_card');
                    return;
                  }
                  if (!lastLesson) return;
                  logFeatureOpened('lesson_menu');
                  trackFeatureOpened('lesson_menu').catch(() => { });
                  perfNavStart('lesson_menu');
                  router.push({ pathname: '/lesson_menu', params: { id: lastLesson.id } } as any);
                }}
                style={[{ marginHorizontal: 8, marginBottom: 12, borderRadius: 20, overflow: 'hidden' }, isGoldTheme ? goldShadow(1) : isOliveTheme ? oliveShadow(1) : null]}
              >
                <LinearGradient colors={homeThemePanelGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, paddingHorizontal: 16, overflow: 'hidden' }}>
                  {isGoldTheme && <GoldBevel radius={20} intensity="quiet"/>}
                  {/* Переворот живёт на внутреннем слое: сама карточка держит
                      размер, поэтому соседи не дёргаются (layout stability). */}
                  {/* зачем (владелец 2026-09-22): дизайн «Цифра-гигант» — число
                      стало главным героем слева, название рядом, картинка ушла
                      вправо отдельным слоем. Выбран из 10 макетов. Прежняя
                      раскладка (арт слева / имя по центру / мелкий счётчик
                      справа) читалась как строка списка и терялась на экране. */}
                  <Reanimated.View style={[{ flexDirection: 'row', alignItems: 'center', minHeight: HOME_PRIORITY_CARD_HEIGHT }, homePriorityCardFlipStyle]}>
                    {/* Картинка абсолютным слоем: она НЕ участвует в flex-строке,
                        поэтому её размер не влияет на место под название и не
                        может на него наехать (этот наезд был в прежней версии). */}
                    {/* right: -10 гасит paddingHorizontal:16 родителя, оставляя
                        арту 6 px поля от края плашки. Больше отводить нельзя:
                        родитель с overflow:hidden срежет вылет. */}
                    <View pointerEvents="none" style={{ position: 'absolute', right: -10, top: 0, bottom: 0, width: HOME_PRIORITY_CARD_ART, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ position: 'absolute', width: HOME_PRIORITY_CARD_ART - 8, height: HOME_PRIORITY_CARD_ART - 8, borderRadius: (HOME_PRIORITY_CARD_ART - 8) / 2, backgroundColor: priorityCardGlowColor }}/>
                      <LightSketchMenuImage source={priorityCardImage} width={HOME_PRIORITY_CARD_ART} height={HOME_PRIORITY_CARD_ART} lighten={false} contentFit="contain" cachePolicy="memory-disk"/>
                    </View>
                    {/* Цифра-герой. tabular-nums обязателен: при 12 → 13 ширина
                        не меняется и название не дёргается. */}
                    <Text
                      maxFontSizeMultiplier={1.1}
                      style={{ color: priorityCardBigColor, fontSize: 46, lineHeight: 50, fontWeight: '900', letterSpacing: -2, flexShrink: 0, fontVariant: ['tabular-nums'] /* guard-ok: счётчик прогресса плашки */ }}
                    >
                      {priorityCardBigValue}
                    </Text>
                    {priorityCardTotalLabel ? (
                      <Text
                        maxFontSizeMultiplier={1.1}
                        style={{ color: homeThemePanelMuted, fontSize: 15, lineHeight: 18, fontWeight: '800', marginLeft: 2, alignSelf: 'flex-end', marginBottom: 12, flexShrink: 0, fontVariant: ['tabular-nums'] /* guard-ok: знаменатель счётчика */ }}
                      >
                        {priorityCardTotalLabel}
                      </Text>
                    ) : null}
                    <View style={{ flex: 1, minWidth: 0, paddingLeft: 13, paddingRight: HOME_PRIORITY_CARD_ART - 16 }}>
                      <FlowText testID="home-continue-lesson-title" provenance="authored" style={{ color: homeThemePanelText, fontSize: Math.max(16, f.body + 1), fontWeight: '800' }}>
                        {priorityCardTitle}
                      </FlowText>
                    </View>
                  </Reanimated.View>
                </LinearGradient>
              </TouchableOpacity>
            </Reanimated.View>
          ) : null}

          <ReportReplyHomeBanner
            active={homeRuntimeActive}
            refreshTick={focusTick}
            onOpen={handleReportReplyBannerOpen}
          />

          {/* Домашние подсказки: конечная серия карточек вместо домашнего CTA плана. */}
          {showHomeFeatureTipCard && currentHomeFeatureTip ? (
            <View style={{ marginHorizontal: 8, marginBottom: 18 }}>
              {/* стопка как у Bevel: под текущей подсказкой виден край следующей */}
              {clampHomeFeatureTipIndex(homeFeatureTipIndex, homeFeatureTips.length) < homeFeatureTips.length - 1 && (
                <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 14, right: 14, top: 12, bottom: -8, borderRadius: isGoldTheme ? 18 : 24, overflow: 'hidden', opacity: homeFeatureTipStackOpacity, transform: [{ translateY: homeFeatureTipStackTranslate }] }}>
                  <LinearGradient colors={homeThemePanelGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}/>
                </Animated.View>
              )}
            <Animated.View style={{ transform: [{ scale: homeFeatureTipCardScale }] }}>
            <TouchableOpacity
              testID="home-feature-tip-card"
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={homeFeatureTipA11y}
              accessibilityHint={triLang(lang, { ru: 'Коснись, чтобы перейти дальше. Смахни вправо или влево, чтобы листать подсказки.', uk: 'Торкнися, щоб перейти далі. Проведи вправо або вліво, щоб гортати підказки.', en: 'Tap to move on. Swipe right or left to browse tips.', es: 'Toca para avanzar. Desliza a la derecha o a la izquierda para cambiar de consejo.', 'pt-BR': 'Toque para avançar. Deslize para a direita ou esquerda para trocar a dica.', vi: 'Chạm để tiếp tục. Vuốt sang phải hoặc trái để đổi mẹo.', id: 'Ketuk untuk lanjut. Geser kanan atau kiri untuk mengganti tips.', tr: 'İlerlemek için dokun. İpuçları arasında sağa veya sola kaydır.', pl: 'Dotknij, aby przejść dalej. Przesuń w prawo lub w lewo, aby zmieniać wskazówki.' })}
              activeOpacity={0.86}
              onPress={handleHomeFeatureTipPress}
              onTouchStart={handleHomeFeatureTipTouchStart}
              onTouchEnd={handleHomeFeatureTipTouchEnd}
              onTouchCancel={handleHomeFeatureTipTouchCancel}
              style={{
                borderRadius: isGoldTheme ? 18 : 24,
                overflow: 'hidden',
                ...(isGoldTheme ? goldShadow(1) : isOliveTheme ? oliveShadow(1) : {}),
              }}
            >
              <LinearGradient
                colors={homeThemePanelGradient}
                locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  minHeight: 124,
                  borderRadius: isGoldTheme ? 18 : 24,
                  borderWidth: 0,
                  borderColor: 'transparent',
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  overflow: 'hidden',
                }}
              >
                {isGoldTheme && <GoldBevel radius={18} intensity="strong"/>}
                <View style={[StyleSheet.absoluteFillObject, { opacity: isGoldTheme ? 0.11 : 0.08, backgroundColor: homeFeatureTipAccent }]} pointerEvents="none"/>
                <TapScale onPress={() => { hapticTap(); completeHomeFeatureTips(); }} accessibilityLabel="qa-home-tips-close" style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)', zIndex: 5 }}>
                  <Ionicons name="close" size={16} color={homeThemePanelMuted}/>
                </TapScale>
                <Animated.View style={{
                  gap: 9,
                  justifyContent: 'center',
                  minHeight: 92,
                  opacity: homeFeatureTipContentOpacity,
                  transform: [{ translateX: homeFeatureTipContentTranslate }],
                }}>
                  <FlowText testID="home-feature-tip-title" provenance="authored" style={{ color: homeThemePanelText, fontSize: Math.max(22, f.bodyLg + 4), fontWeight: '900', lineHeight: Math.max(27, f.bodyLg + 9) }}>
                    {currentHomeFeatureTip.title}
                  </FlowText>
                  <FlowText testID="home-feature-tip-body" provenance="authored" style={{ color: homeThemePanelMuted, fontSize: Math.max(14, f.body), fontWeight: '800', lineHeight: Math.max(20, f.body + 6) }}>
                    {currentHomeFeatureTip.body}
                  </FlowText>
                  {(showHomeFeatureTipTapHint || currentHomeFeatureTip.icon) ? (
                    <View style={{ minHeight: 18, justifyContent: 'center' }}>
                      {showHomeFeatureTipTapHint ? (
                        <Animated.Text
                          style={{
                            color: homeThemePanelMuted,
                            fontSize: 10, // guard-ok: подсказка-хинт «тапни», не подпись-расшифровка под заголовком
                            fontWeight: '800',
                            lineHeight: 12,
                            opacity: homeFeatureTipHintOpacity,
                            textAlign: 'center',
                            transform: [{ scale: homeFeatureTipHintScale }],
                          }}
                        >
                          {triLang(lang, { ru: 'нажми на подсказку', uk: 'торкнися підказки', en: 'tap the hint', es: 'toca la pista', 'pt-BR': 'toque na dica', vi: 'chạm vào gợi ý', id: 'ketuk petunjuk', tr: 'ipucuna dokun', pl: 'dotknij podpowiedzi' })}
                        </Animated.Text>
                      ) : null}
                      {currentHomeFeatureTip.icon ? (
                        <Ionicons
                          name={currentHomeFeatureTip.icon}
                          size={17}
                          color={homeFeatureTipAccent}
                          style={{ position: 'absolute', right: 0, bottom: 0, opacity: 0.62 }}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </Animated.View>
              </LinearGradient>
            </TouchableOpacity>
            </Animated.View>
            </View>
          ) : null}
          </Animated.View>)}

          {/* Persistent баннер "Сохрани прогресс" — после первого завершённого урока.
                Сам решает показываться или нет (см. SaveProgressBanner.tsx). */}
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <SaveProgressBanner ownerActive={homeRuntimeActive} hasSavedLearningProgress={lessonsCompleted > 0} />
          </View>

          {/* D4: секции ниже первого экрана (быстрый доступ, ошибки, фраза дня,
              подвал) монтируются вторым проходом — belowFoldReady/InteractionManager. */}
          {belowFoldReady && (<>

          {/* СЕГОДНЯ: единый блок текущих задач */}
          <Animated.View style={sectionStyle(4)}>
          <>
          {/* зачем (владелец 2026-09-21): ряд из двух пилюль («Видео» и
              «Ошибки») убран целиком — он был главным источником «наляпистости»
              на Главной. Видео уехало в хедер отдельной кнопкой «Видеоуроки»,
              ошибки — на зарубку прогресса и переключаемую карточку урока.
              Заголовок остался один, без спутников. */}
          <View style={{ marginHorizontal: 8, marginBottom: 10, minHeight: 30, justifyContent: 'center' }}>
            <Text style={{ color: t.textPrimary, fontSize: Math.max(13, f.label), fontWeight: '900', letterSpacing: 0, textTransform: 'uppercase' }} numberOfLines={1}>
              {triLang(lang, {
                    ru: 'Сегодня',
                    uk: 'Сьогодні',
                    en: 'Today',
                    es: 'Hoy',
                    'pt-BR': "Hoje",
                    vi: "Hôm nay",
                    id: "Hari ini",
                    tr: "Bugün",
                    pl: "Dzisiaj",
                })}
            </Text>
          </View>

          </>

          </Animated.View>

          {/* ── ФРАЗА ДНЯ ── */}
          {/* зачем: владелец (2026-08-03) — убрана кнопка «Нашёл ошибку?» с
              главного экрана; репорт с этого экрана был низкой ценности, а
              визуально это лишний пункт в подвале. Другие экраны кнопку не
              теряют — правка точечная, только home. */}
          <Animated.View style={sectionStyle(5)} onLayout={(event: LayoutChangeEvent) => {
              dailyPhraseLayoutRef.current = {
                  top: event.nativeEvent.layout.y,
                  height: event.nativeEvent.layout.height,
              };
              refreshDailyPhraseVisibility();
          }}>
          <DailyPhraseCard variant="homeAdditional" homeCardVisible={dailyPhraseCardVisible} />
          </Animated.View>
          <HomeYoutubeFeatureCard ownerActive={homeRuntimeActive} studyTarget={studyTarget} />
          {/* зачем: владелец (2026-09-20) — опрос опущен в самый низ Главной,
              под карточку видео. Он больше не разрывает связку «Фраза дня»
              и не сдвигает её замер видимости (onLayout секции 5). */}
          {surveyOffer ? (
            <View style={{ marginTop: 6 }}>
              <SurveyTaskCard
                challenge={surveyOffer.challenge}
                onOpen={(challenge) => {
                  if (!challenge.survey) return;
                  const openedAccount = captureAccountGeneration();
                  if (openedAccount.phase !== 'active' || openedAccount.stableId !== surveyOffer.stableId) return;
                  openSurveyAccountGenerationRef.current = openedAccount;
                  setOpenSurveyLaunch({
                    survey: challenge.survey,
                    stableId: surveyOffer.stableId,
                    dayKey: surveyOffer.dayKey,
                    lang,
                  });
                }}
              />
            </View>
          ) : null}
          </>)}

      </BouncyScrollView>);
    };
    const titleModalButtonBorderColor = isGoldTheme ? GOLD_RICH.hairlineStrong : (isLightTheme ? 'rgba(202,138,4,0.32)' : 'rgba(252,211,77,0.42)');
    const titleModalButtonBg = isGoldTheme ? 'rgba(246,227,161,0.13)' : (isLightTheme ? 'rgba(202,138,4,0.12)' : 'rgba(252,211,77,0.13)');
    // Кэш вне рендера (см. computeHomeTitles): при неизменных входах — ноль работы.
    const { allTitles, earnedTitles, currentTitleKey } = computeHomeTitles({
        streak,
        helpfulReportsConfirmed: specialTitleStats.helpfulReportsConfirmed,
        earnedAchievementIds: specialTitleStats.earnedAchievementIds,
        lang,
        selectedTitleKey,
    });
    const visibleTitles = earnedTitles;
    const selectHomeTitle = (item: TitleModalRow) => {
        if (!item.unlocked)
            return;
        hapticTap();
        setSelectedTitleKey(item.key);
        setTitleModalVisible(false);
        void AsyncStorage.setItem(HOME_SELECTED_TITLE_KEY, item.key);
    };
    const titleModalHeading = triLang(lang, {
        ru: 'Титулы',
        uk: 'Титули',
        en: 'Titles',
        es: 'Titulos',
        'pt-BR': "Titulos",
        vi: "Danh hieu",
        id: "Gelar",
        tr: "Unvanlar",
        pl: "Tytuly",
    });
    const titleModalEarnedLabel = triLang(lang, {
        ru: 'Заработанные',
        uk: 'Зароблені',
        en: 'Earned',
        es: 'Ganados',
        'pt-BR': "Conquistados",
        vi: "Da nhan",
        id: "Didapat",
        tr: "Kazanilan",
        pl: "Zdobyte",
    });
    const titleModalSubtitle = triLang(lang, {
            ru: `${earnedTitles.length} из ${allTitles.length} уже открыто`,
            uk: `${earnedTitles.length} з ${allTitles.length} вже відкрито`,
            en: `${earnedTitles.length} of ${allTitles.length} unlocked`,
            es: `${earnedTitles.length} de ${allTitles.length} desbloqueados`,
            'pt-BR': `${earnedTitles.length} de ${allTitles.length} desbloqueados`,
            vi: `${earnedTitles.length}/${allTitles.length} da mo`,
            id: `${earnedTitles.length} dari ${allTitles.length} terbuka`,
            tr: `${earnedTitles.length}/${allTitles.length} acildi`,
            pl: `${earnedTitles.length} z ${allTitles.length} odblokowane`,
        });
    return (<View testID="screen-home" style={{ flex: 1 }} onLayout={notifyFirstHomeFrameReady}>
      <ScreenGradient>
      <View style={{ flex: 1 }}>
      {renderNewHome()}

      </View>

      {/* Баннер сбоя — только когда грузить было нечего (первый запуск + оффлайн). */}
      {loadFailedNoData ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: 24 + bottomInset, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: 420, backgroundColor: glassFill(t.bgCard, 0.46), borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 0, borderColor: 'transparent' }}>
            <Ionicons name="cloud-offline-outline" size={22} color={t.textMuted} />
            <Text style={{ flex: 1, color: t.textPrimary, fontSize: 13, fontWeight: '600' }}>
              {triLang(lang, {
                ru: 'Не удалось загрузить данные. Проверь соединение.',
                uk: 'Не вдалося завантажити дані. Перевір з’єднання.',
                en: 'Couldn’t load data. Check your connection.',
                es: 'No se pudieron cargar los datos. Revisa tu conexión.',
                'pt-BR': 'Não foi possível carregar os dados. Verifique sua conexão.',
                vi: 'Không tải được dữ liệu. Kiểm tra kết nối của bạn.',
                id: 'Gagal memuat data. Periksa koneksimu.',
                tr: 'Veriler yüklenemedi. Bağlantını kontrol et.',
                pl: 'Nie udało się wczytać danych. Sprawdź połączenie.',
              })}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, { ru: 'Обновить', uk: 'Оновити', en: 'Refresh', es: 'Actualizar', 'pt-BR': 'Atualizar', vi: 'Tải lại', id: 'Muat ulang', tr: 'Yenile', pl: 'Odśwież' })}
              activeOpacity={0.82}
              onPress={() => { setLoadFailedNoData(false); void loadData(); }}
              style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: t.accent + '22' }}
            >
              <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700' }}>
                {triLang(lang, { ru: 'Обновить', uk: 'Оновити', en: 'Refresh', es: 'Actualizar', 'pt-BR': 'Atualizar', vi: 'Tải lại', id: 'Muat ulang', tr: 'Yenile', pl: 'Odśwież' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Сбор наград: частицы валюты слетаются со всех сторон в свой счётчик.
          Монтируется ТОЛЬКО на время волны — в покое на экране нет ни одного
          лишнего узла и ни одной живой анимации (Performance Bible). */}
      {rewardCollect.state.wave !== null && rewardCollect.state.target !== null ? (
        <HomeRewardCollectFlight
          // key по волне — ОБЯЗАТЕЛЕН.
          //
          // зачем (владелец, 2026-09-01: «анимация полёта жемчугов то есть, то
          // её нет»): вторая волна (жемчужины) идёт через 220мс после рун, и
          // без key React переиспользует ТОТ ЖЕ смонтированный оверлей. Его
          // useEffect'ы с полётом частиц уже отработали и заново не
          // запускаются, а useMemo с траекториями возвращает прежний массив,
          // когда число частиц совпало. Отсюда и «то есть, то нет»: волна
          // играла только если сумма жемчужин давала ДРУГОЕ число частиц, чем
          // руны. С key оверлей монтируется заново на каждую волну.
          key={rewardCollect.state.waveId}
          amount={rewardCollect.state.amount}
          target={rewardCollect.state.target}
          source={rewardCollect.state.wave === 'runes'
            ? homeHeaderRuneIconSource
            : homeHeaderShardIconSource}
          // Звук отрыва даёт только первая волна: вторая (жемчужины) идёт через
          // 220 мс, и второй вдох прозвучал бы как эхо, а не как новая награда.
          playStartSound={rewardCollect.state.wave === 'runes'}
          // Пульс той валюты, что летит: по нему бьёт каждая долетевшая частица.
          impact={rewardCollect.state.wave === 'runes'
            ? rewardCollect.runesImpact
            : rewardCollect.shardsImpact}
          onDone={rewardCollect.onWaveDone}
        />
      ) : null}

      {/* зачем (PM-046, владелец): плашка «+1 СПИН» после повышения уровня
          удалена вместе с homeLevelUpSpinReceipt и её setTimeout — спин
          убран как механика, показывать было бы нечего. */}

      <EnergyInfoPopover
        anchor={energyTooltip.anchor}
        visible={homeEnergyPopoverVisible}
        onClose={closeEnergyTooltip}
        current={homeEnergyTotal}
        capacity={homeEnergyMax}
        recoveryIntervalMs={energyRecoveryIntervalMs}
        formattedTime={timeUntilNextEnergy}
        isUnlimited={energyUnlimited}
      />

      <PlayerProfileModal
        player={homeProfilePlayer}
        myInfo={{
            name: userName || 'Phraseman',
            avatar: userAvatar,
            frame: userFrame,
            streak,
        }}
        onClose={() => setHomeProfilePlayer(null)}
      />
      <FeatureIntroEntry id="profile_card_first_visit" enabled={profileIntroRequested && homeRuntimeActive && homeProfilePlayer !== null} />

      {openSurveyLaunch ? (
        <SurveySheetModal
          visible={openSurveyLaunch !== null}
          launch={openSurveyLaunch}
          onClose={closeSurveySheet}
          onDurablyReconciled={handleSurveyDurablyReconciled}
        />
      ) : null}

      <Modal visible={titleModalVisible} transparent animationType="fade" onRequestClose={() => setTitleModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.62)', paddingHorizontal: 18 }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setTitleModalVisible(false)} />
          <View style={{ maxHeight: Math.min(SCREEN_H * 0.74, 620), width: '100%', maxWidth: 560, alignSelf: 'center' }}>
            <View style={{ borderRadius: 22, padding: 16, backgroundColor: t.bgCard, shadowColor: '#000', shadowOpacity: 0.34, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, ...noAndroidOutline,}}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', lineHeight: f.h2 + 5 }} numberOfLines={1}>
                    {titleModalHeading}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                    {titleModalSubtitle}
                  </Text>
                </View>
                <TouchableOpacity activeOpacity={0.75} onPress={() => setTitleModalVisible(false)} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? 'rgba(246,227,161,0.10)' : t.bgSurface2, borderWidth: 0, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border }}>
                  <Ionicons name="close" size={22} color={t.textPrimary}/>
                </TouchableOpacity>
              </View>

              <View style={{ borderRadius: 16, backgroundColor: isGoldTheme ? 'rgba(246,227,161,0.08)' : t.bgSurface2, borderWidth: 0, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}>
                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }} numberOfLines={2}>
                  {titleModalEarnedLabel}
                </Text>
              </View>

              <ScrollView decelerationRate="fast" style={{ maxHeight: Math.min(SCREEN_H * 0.52, 430) }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 2 }}>
                {visibleTitles.map((item) => {
                    const titleColor = isLightTheme ? item.colorLight : item.colorDark;
                    return (<TouchableOpacity key={item.key} activeOpacity={0.84} onPress={() => selectHomeTitle(item)} accessibilityRole="button" accessibilityState={{ disabled: !item.unlocked, selected: item.current }} style={{ minHeight: 62, borderRadius: 15, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: item.current ? titleModalButtonBg : (isGoldTheme ? 'rgba(255,255,255,0.045)' : t.bgSurface), borderWidth: 1, borderColor: item.current ? titleModalButtonBorderColor : (isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border) }}>
                        <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: titleColor + '20', borderWidth: 1, borderColor: titleColor + '55' }}>
                          <Ionicons name={item.current ? 'ribbon' : 'checkmark-circle'} size={20} color={titleColor}/>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text allowFontScaling={false} style={{ color: item.unlocked ? titleColor : t.textSecond, fontSize: Math.max(15, f.body), fontWeight: '900', lineHeight: Math.max(15, f.body) + 5, letterSpacing: 0 }} numberOfLines={1} ellipsizeMode="tail">
                            {item.titleEN}
                          </Text>
                          <Text allowFontScaling={false} style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', lineHeight: f.caption + 4, marginTop: 1, letterSpacing: 0 }} numberOfLines={2}>
                            {item.subtitle}
                          </Text>
                        </View>
                        {item.current && (<View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: isLightTheme ? 'rgba(202,138,4,0.14)' : 'rgba(252,211,77,0.16)' }}>
                            <Text style={{ color: isLightTheme ? t.textSecond : t.gold, fontSize: f.caption, fontWeight: '900' }} numberOfLines={1}>
                              {triLang(lang, {
                                    ru: 'Сейчас',
                                    uk: 'Зараз',
                                    en: 'Now',
                                    es: 'Actual',
                                    'pt-BR': "Atual",
                                    vi: "Hien tai",
                                    id: "Aktif",
                                    tr: "Aktif",
                                    pl: "Teraz",
                                })}
                            </Text>
                          </View>)}
                      </TouchableOpacity>);
                })}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>


      </ScreenGradient>

      {/* Premium celebration: запускается после IAP / admin-grant. Pending консумируется на close. */}
      <PremiumCelebrationModal visible={celebrationOverlayVisible} variant={celebrationVariant} onClose={() => {
            setCelebrationVisible(false);
            // Consume the exact event marker so the same admin grant does not re-open on next sync.
            const marker = celebrationMarker;
            setCelebrationMarker(null);
            // Сброс гарда сессии: после закрытия новый grant (новый pending) снова сможет встать в очередь.
            celebrationQueuedRef.current = false;
            void consumeCelebration(marker);
            void isVipCelebrationPending().then((pending) => {
                if (!pending)
                    return;
                return getPendingVipCelebrationMarker().then((vipMarker) => {
                    const queueKey = vipMarker ?? 'vip_pending';
                    if (vipCelebrationQueuedMarkerRef.current !== queueKey)
                        vipCelebrationQueuedMarkerRef.current = queueKey;
                    setVipCelebrationMarker(vipMarker);
                    setVipCelebrationVisible(true);
                });
            });
        }}/>
      <VipCelebrationModal visible={vipCelebrationOverlayVisible} onClose={() => {
            setVipCelebrationVisible(false);
            const marker = vipCelebrationMarker;
            setVipCelebrationMarker(null);
            vipCelebrationQueuedMarkerRef.current = null;
            void consumeVipCelebration(marker);
        }}/>
      {/* Приветствие-знакомство со спотлайт-подсветкой блоков — один раз при первом входе. */}
      {/* зачем (владелец 2026-09-21): шторка «тут пока нечего разбирать» убрана
          вместе с порогом открытия — хаб теперь открывается при любом числе
          ошибок. Оставлять её нельзя: она стала недостижимой, а мёртвый показ
          однажды всплыл бы не вовремя. Сам компонент в проекте сохранён. */}
      {dailyJourneyDelivery ? (
        <DailyJourneyRewardPreviewModal
          visible={dailyJourneyOverlayVisible}
          day={dailyJourneyDelivery.occurrence.day}
          run={dailyJourneyDelivery.run}
          occurrence={dailyJourneyDelivery.occurrence}
          targetRect={dailyJourneyDelivery.targetRect}
          onLanded={handleDailyJourneyLanded}
          onDeliveryComplete={completeDailyJourneyDelivery}
        />
      ) : null}
      {/* Сохранённые карточки слетаются в плитку «Карточки». Оверлей поверх всего:
          места не занимает, поэтому первый кадр главной остаётся стабильным. */}
      <SavedCardsFlight
        count={cardArrivals}
        target={cardsTileCenter}
        origin={{ x: Dimensions.get('window').width / 2, y: Dimensions.get('window').height * 0.32 }}
        color={t.accent}
        onDone={() => {
          const effect = cardArrivalEffectRef.current ?? 'flight';
          cardArrivalEffectRef.current = null;
          setCardArrivals(0);
          // Отмечаем показ только после анимации — иначе повторный вход
          // проиграет её заново или, наоборот, съест непоказанный прилёт.
          void markHomeArrivalPlayed(effect);
        }}
      />
    </View>);
}
