import React, { Suspense, lazy, useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
// зачем: allowFontScaling={false} отключал системный размер шрифта — заголовки
// обрезались при крупном шрифте и на длинных языках. FlowText переносит.
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, Dimensions, Modal, AppState, DeviceEventEmitter, InteractionManager, Easing, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useGuardedNav } from '../../hooks/use-guarded-nav';
import { usePremium } from '../../components/PremiumContext';
import { useTabFocusTick, useTabNav } from '../TabContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { isLearnTabVisibleForTarget, isLearningSurfaceReady } from '../learning_language_surface_readiness';
import { useSpireTabEnabled } from '../spire_tab_flag';
import { filterTodayTasksForTarget } from '../today_task_surface_filter';
import { homeVideoRailUsesCatalog, loadHomeVideoRailForTarget, peekHomeVideoRailForTarget } from '../home_video_rail_source';
import ScreenGradient from '../../components/ScreenGradient';
import BouncyScrollView from '../../components/BouncyScrollView';
import { useTopFadeScroll } from '../../components/TopFadeScrollContext';
import { DebugLogger } from '../debug-logger';
import { checkStreakLossPending } from '../hall_of_fame_utils';
import { getLocalDayKey } from '../local_date';
import { applyMonthlyPremiumFreezeAllowance } from '../premium_freeze_allowance';
import { consumeCelebration, getPendingCelebrationMarker, getPendingCelebrationVariant, isCelebrationPending, type PremiumCelebrationVariant, } from '../premium_celebration_state';
import { consumeVipCelebration, getPendingVipCelebrationMarker, isVipCelebrationPending } from '../vip_celebration_state';
import { isLightThemeMode } from '../../constants/theme';
import { GOLD_RICH } from '../../constants/goldTheme';
import { noAndroidOutline } from '../../constants/androidGlow';
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
import { useRuntimeActiveSettled } from '../../hooks/use_runtime_active_settled';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { useDialogueV2Warmup } from '../../hooks/use_dialogue_v2_warmup';
import { isValidCoinRank } from '../coin_rank_table_v1';
import { coinRankDisplaySource } from '../../components/coins/coin_rank_display';
import { STORY_RING_SLOT } from '../../components/stories/story_ring_constants';
import StoryAvatarSlotBase from '../../components/stories/StoryAvatarSlot';
import DailyPhraseCard from '../../components/DailyPhraseCard';
import HomePollV2Card from '../../components/home/HomePollV2Card';
import { useHomePollV2 } from '../../hooks/use_home_poll_v2';
import { usePerfR1Probe } from '../perf_r1_probe';
import { useRenderCause } from '../render_cause_probe';
import { sameSnapshotSection } from '../home_snapshot_equal';
import { noteScrollContentHeight, noteScrollDrag, noteScrollEvent, noteScrollOffset } from '../scroll_restore_probe';
import { useHomeFocusCostBegin, useHomeFocusCostEnd, withHomeChildCost } from '../home_focus_cost_probe';
import { noteBackArrived } from '../back_tap_probe';
import { memHomeSummary, useMemHomeRegisterSources } from '../mem_home_probe';
import { decideHomeVideoRailByInterfaceLang, logHomeVideoLang } from '../home_video_language_gate';
import { HomeBellStateContext } from '../../components/home/v2/home_bell_state';
import { glassTone } from '../../components/dialogs/glass/glassTone';
import HybridSheetShell from '../../components/modal_fx/HybridSheetShell';
import { isDailyPhraseCardHalfVisible } from '../daily_phrase_pulse';
import { useOverlayActiveKey, useOverlayVisible } from '../../components/OverlayArbiter';
import { useSpireWeekMoment } from '../spire/use_spire_week_moment';
import { useHomeSurveyEntry } from '../../hooks/use_home_survey_entry';
import { useWelcomeBackMoment } from '../../hooks/use_welcome_back_moment';
import { useCoinRankEnoughMoment } from '../use_coin_rank_enough_moment';
import { peekEnergy } from '../energy_peek_cache';
import { SheetSwipeRoot } from '../../components/modal_fx/SheetSwipeClose';
import {
  homeArrivalEffect,
  markHomeArrivalPlayed,
  readSavedCardsFirstRun,
} from '../saved_cards_first_run';
import { getRunesBalance, peekRunes } from '../runes_system';
import { buildLastLessonFromHydration, peekHomeScreenHydration, rememberHomeScreenHydration, resolveHomeProfileVisuals, shouldApplyHomeSnapshotToStats } from '../home_screen_hydration';
import { captureAccountGeneration, isCurrentAccountGeneration, subscribeAccountGeneration, type AccountGenerationToken } from '../account_generation';
// зачем (PM-037, владелец 2026-09-24): плавающая кнопка спина на карточке
// уровня удалена из хедера Главной — peekLevelSpinBalance/readLocalLevelSpinBalance/
// иконка билета спина/animateNextLayoutTransition жили только ради неё и удалены вместе с ней.
// 30.09: animateNextLayoutTransition вернулся — поздняя вставка карточки «Продолжить обучение».
import { animateNextLayoutTransition } from '../smooth_layout';
import { getAppSnapshot, patchAppSnapshot, resolveHydratedProfileName, subscribeAppSnapshot, useAppSnapshotSelector } from '../app_snapshot_store';
import { takeOnboardingDonePeek } from '../onboarding_done_peek';
import { createHomeVideoLoadPipeline } from '../home_video_load_pipeline';
import { getPersonalProgressSnapshot, hydratePersonalProgress } from '../personal_progress_store';
// зачем (PM-052, D75, 02.10): сбор наград на Главной (очередь + частицы в счётчик) удалён —
// монеты летят там, где заработаны (CoinRewardFlight), без копилки «на потом».
import HomeV2HeaderBase from '../../components/home/v2/HomeV2Header';
import { useCloudProfileRefreshing } from '../cloud_profile_refresh_state';
import HomeV2ContinueCardBase from '../../components/home/v2/HomeV2ContinueCard';
import HomeV2FeatureTilesBase from '../../components/home/v2/HomeV2FeatureTiles';
import HomeV2VideoRailBase from '../../components/home/v2/HomeV2VideoRail';
import HomeV2TodayCardBase from '../../components/home/v2/HomeV2TodayCard';
import { ofLine as todayOfLine } from '../../components/home/v2/today_scene/today_scene_copy';
// зачем (владелец 21.10 ~23:40, Главная A «Сцена»): шапка и «Продолжить» сведены в сцену — components/home/v2/scene
import HomeScene, { HOME_SCENE_V2_ENABLED } from '../../components/home/v2/scene/HomeScene';
import HomeSceneEnergy from '../../components/home/v2/scene/HomeSceneEnergy';
import { resolveThemedArt } from '../../components/theme/themed_art_registry';
import { useTodayTasks } from '../../hooks/use_today_tasks';
import type { HomeFeatureTile } from '../../components/home/v2/home_v2_types';
import { getV2Palette, V2 } from '../../constants/v2Style';
// зачем отдельное имя: в этом файле `Animated` — из react-native и им пользуются
// сотни мест. Пульс счётчиков живёт на Reanimated (UI-поток), поэтому его
// компонент импортируется как Reanimated, а не подменяет существующий.
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import NotificationCenterButtonBase from '../../components/NotificationCenterButton';
import type { PlayerInfo } from '../../components/PlayerProfileModal';
import { logFeatureOpened } from '../firebase';
import { trackFeatureOpened } from '../user_stats';
import { perfMark, perfSteps, perfScreenMount, perfNavStart } from '../perf-monitor';
import { emitAppEvent, onAppEvent } from '../events';
import { FOREGROUND_CLOUD_REFRESH_DELAY_MS, FOREGROUND_LIGHT_REFRESH_DELAY_MS, getForegroundRefreshKind } from '../app_resume_policy';
import { getHomeLastLessonImage } from '../home_last_lesson_assets';
import { getMistakePracticeHomeCounts } from '../mistake_practice_insights';
import { isMistakeStudyTargetValue } from '../../modules/mistake-practice/contracts';
// зачем (владелец 2026-09-21): HomeSectionPulseButton больше не импортируется —
// ряд из двух пилюль у «Сегодня» удалён. Сам компонент оставлен в проекте: он
// пригодится следующему разделу, которому понадобится такая же кнопка.
// зачем (владелец 2026-09-21): HomeMistakesLockedSheet больше не импортируется —
// порог открытия раздела снят, шторка «ошибок мало» стала недостижимой.
// homeMistakesButtonState остаётся: по нему решаются плитка «Мои ошибки» и прогрев подсказки хаба.
import { homeMistakesButtonState } from '../home_mistakes_pulse_model';
import type { LingmanYoutubeVideo } from '../lingman_youtube';
import { isVideoButtonEnabled } from '../remote_flags';
import { readRawCachedLingmanFeed } from '../lingman_youtube_feed_disk';
import { trackMistakePracticeEvent } from '../mistake_practice_analytics';
import {
    readCurrentStreakWeekMarkers,
    type StreakWeekDayMarkerKind,
} from '../streak_week_markers';
import { lessonNamesForStudyTarget } from '../lesson_titles_for_study_target';
import { lastOpenedLessonKey, lessonProgressKey } from '../target_storage_keys';
import { homeContinuePlaceBadge, homeContinueStartTitle, homeContinueV2Title, logHomeContinueChoice, pickHomeContinue, resolveHomeContinuePlaces, useHomeContinueMarks } from '../home_continue_mark';
import { HOME_CONTINUE_V2_ENABLED, launchHomeContinueV2, useHomeContinueV2Launching, useHomeContinueV2Progress } from '../learning_v2_home_continue_route';
import { ENABLE_DEV_TOOLS } from '../config';
import { isLearningV2Hidden, isLearningV2OpenForUiLangV1 } from '../learning_v2_visibility_switch';
import { markHomeFirstPaint } from '../home_paint_marker';
import { peekStreakDayState, subscribeStreakDayState } from '../streak_day_signal';

// зачем (§137): строка, а не объект — peekStreakDayState при смене дня отдаёт новый объект, а
// useSyncExternalStore требует устойчивого снимка. null (сверки ещё не было) → 'unknown': молчим.
function streakTodaySnapshot(): 'unknown' | 'counted' | 'pending' {
  const state = peekStreakDayState();
  if (state === null) return 'unknown';
  return state.counted ? 'counted' : 'pending';
}
import { runAfterHomeFirstFrame } from '../first_frame_deferred_warmups';
import { nestedBoxShadow, plateBoxShadow, raisedBoxShadow, RAISED_LIFT, useShadowGlass } from '../../components/v2/ShadowSurface';
import { gcDelta, gcSnapshot } from '../mem_probe';
import { noteSwallowedAs, noteSwallowedHandler } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

// зачем (координатор 05.10, пакет 05:26: [JS-STALL] 1,5 с — вычисление чанка Главной до первого кадра; план
// 11eeb7b56): закрытые окна и редкие модули не нужны первому кадру — их модули больше не вычисляются вместе с чанком.
// Окна — ленивые компоненты с прежними именами, монтируются только после первого открытия (и остаются, чтобы
// проиграть закрытие); их модули прогреваются после первого кадра (prewarmHomeDeferredModules), поэтому первое
// открытие не ждёт загрузки. Вид первого кадра не меняется: эти окна на нём закрыты.
// зачем (D191, владелец 14.10): окно итога недели (m01–m03) тяжёлое (башня, SVG, фейерверк) и нужно раз в неделю — грузится лениво и только когда хук Ядра дал слот
const SpireWeekMomentHost = lazy(() => import('../../components/spire/moments/SpireWeekMomentHost'));
// зачем (D193, владелец 14.10): «С возвращением» (m21) — раз после долгой отлучки; грузится лениво, когда хук Авторизации дал слот
const WelcomeBackMoment = lazy(() => import('../../components/moments/WelcomeBackMoment'));
// зачем (Ядро 15.10, D195, окно «Встречайте PhraseMan 2.0»): хост — крошечная обёртка (ждёт первый кадр Главной); клиент начисления и шторка с анимациями грузятся лениво внутри него
import LegacyBonusWelcomeHost from '../../components/legacy_bonus/LegacyBonusWelcomeHost';
// зачем ([HOME-CHILD-COST] 18.10, журнал Сверки: рендер детей Главной 76–142 мс на возврате): dev-измерение каждого крупного ребёнка React Profiler; в релизе withHomeChildCost возвращает тот же компонент
const HomeV2Header = withHomeChildCost('header', HomeV2HeaderBase);
const HomeV2ContinueCard = withHomeChildCost('continue_card', HomeV2ContinueCardBase);
const HomeV2FeatureTiles = withHomeChildCost('feature_tiles', HomeV2FeatureTilesBase);
const HomeV2VideoRail = withHomeChildCost('video_rail', HomeV2VideoRailBase);
const HomeV2TodayCard = withHomeChildCost('today_card', HomeV2TodayCardBase);
// шапка и видеорейка уже memo по данным — их «nested-update» (8–16 мс) значит обновление ВНУТРИ; разбивка по вложенным детям
const StoryAvatarSlot = withHomeChildCost('avatar_slot', StoryAvatarSlotBase);
const NotificationCenterButton = withHomeChildCost('bell', NotificationCenterButtonBase);
// зачем (m14A, Ядро 14.10): «Хватает на ранг N» — когда монет впервые хватает на следующий ранг; слот в той же очереди окон (после «С возвращением»), грузится лениво
const CoinRankEnoughDialog = lazy(() => import('../../components/coin_rank_moments/CoinRankEnoughDialog'));
const loadPremiumCelebrationModal = () => import('../../components/PremiumCelebrationModal');
const loadVipCelebrationModal = () => import('../../components/VipCelebrationModal');
const loadSurveySheetModal = () => import('../../components/survey/SurveySheetModal');
const loadSavedCardsFlight = () => import('../../components/SavedCardsFlight');
const loadPlayerProfileModal = () => import('../../components/PlayerProfileModal');
const loadFeatureIntroEntry = () => import('../../components/feature_intro/FeatureIntroEntry');
const PremiumCelebrationModal = lazy(loadPremiumCelebrationModal);
const VipCelebrationModal = lazy(loadVipCelebrationModal);
const SurveySheetModal = lazy(loadSurveySheetModal);
const SavedCardsFlight = lazy(loadSavedCardsFlight);
const PlayerProfileModal = lazy(loadPlayerProfileModal);
const FeatureIntroEntry = lazy(loadFeatureIntroEntry);
// Защёлка «окно уже открывалось»: до первого открытия ленивое окно не монтируется вовсе, после — остаётся
// смонтированным, чтобы доиграть анимацию закрытия и не грузиться заново.
function useMountedAfterFirstOpen(open: boolean): boolean {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return open || opened;
}
function prewarmHomeDeferredModules(): void {
  const started = Date.now();
  void Promise.all([
    loadPremiumCelebrationModal(), loadVipCelebrationModal(), loadSurveySheetModal(),
    loadSavedCardsFlight(), loadPlayerProfileModal(), loadFeatureIntroEntry(),
  ]).then(() => {
    console.log(`[HOME-LAZY] prewarm:done ${Date.now() - started}мс`);
  }).catch((error: unknown) => {
    console.warn('[HOME-LAZY] prewarm:failed — окно загрузится при первом открытии', error instanceof Error ? error.message : String(error));
  });
}
const { height: SCREEN_H } = Dimensions.get('window');
/** Значок действия в шапке (спин, подарок) — соразмерен соседям хедера. */
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
/** Дебаунс обновления Главной после восстановления из облака (событие приходит пачкой). */
const HOME_RESTORE_REFRESH_DEBOUNCE_MS = 400;
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
/**
 * Единая высота карточки статистики на главной.
 *
 * зачем: было `minHeight: homeStatsReady ? 184 : 196` — пока данные не готовы, панель на
 * 12px ВЫШЕ, а при готовности сжимается, и весь контент под ней подскакивает вверх. Ровно
 * то «подпрыгивание при открытии/возврате на главную», на которое жаловался владелец
 * (ориентир — Bevel: открыл и статично). Держим одну высоту в обоих состояниях: берём
 * бОльшую из двух, чтобы готовое содержимое гарантированно влезало без обрезки.
 */
// Старый gift-button art не подключается к Home: хедер использует только
// актуальные локальные иконки и daily-journey projection.
// зачем (D188-следствие, 14.10): изучаемый язык — любой из пяти, поэтому приветствия не называют английский.
const GREETINGS_RU = [
    'Твой лингвистический дзен', 'Время покорять вершины', 'Зарядись знаниями', 'Твой мозг скажет «спасибо»',
    'Готов к новым инсайтам?', 'Мир ждет твоего слова', 'На шаг ближе к цели', 'Твой интеллект в тонусе',
    'Вдохновение начинается здесь', 'Стань лучшей версией себя', 'Твой путь к мастерству', 'Время открывать горизонты',
    'Дай мыслям взлететь', 'Твой пропуск в новый язык', 'Прокачай свой потенциал', 'Сегодня — лучший день для старта',
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
    'Дай думкам злетіти', 'Твій пропуск у нову мову', 'Розкрий свій потенціал', 'Сьогодні — найкращий день для старту',
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
    'Your new language gets stronger today', 'One step closer to fluency', 'Learn a phrase, open a door',
    'Small habits build big progress', 'More confidence with every word', 'Today is a day to move forward',
    'Small drills, big leaps', 'Your progress is alive', 'Speak with more ease',
    'The next insight is here', 'Your brain loves consistency', 'Clearer than yesterday',
];
const GREETINGS_PT_BR = [
    'Seu novo idioma ganha força hoje', 'Um passo mais perto da fluência', 'Aprenda uma frase, abra uma porta',
    'Sua rotina também ensina', 'Mais confiança a cada palavra', 'Hoje é dia de avançar',
    'Pequenos treinos, grandes saltos', 'Seu progresso está vivo', 'Fale com mais leveza',
    'O próximo insight está aqui', 'Seu cérebro adora constância', 'Mais claro do que ontem',
];
const GREETINGS_VI = [
    'Ngôn ngữ mới của bạn mạnh hơn hôm nay', 'Gần sự tự tin hơn một bước', 'Một câu mới, một cánh cửa mới',
    'Thói quen nhỏ cũng tạo tiến bộ', 'Tự tin hơn qua từng từ', 'Hôm nay là ngày để tiến lên',
    'Luyện tập nhỏ, bước nhảy lớn', 'Tiến bộ của bạn đang sống động', 'Nói nhẹ nhàng và rõ hơn',
    'Gợi ý tiếp theo ở ngay đây', 'Não bạn thích sự đều đặn', 'Rõ hơn hôm qua',
];
const GREETINGS_ID = [
    'Bahasa barumu makin kuat hari ini', 'Selangkah lebih dekat ke percaya diri', 'Satu frasa baru, satu pintu baru',
    'Rutinitas kecil juga membangun kemajuan', 'Lebih yakin di setiap kata', 'Hari ini waktunya maju',
    'Latihan kecil, lompatan besar', 'Progresmu tetap bergerak', 'Bicara lebih ringan dan jelas',
    'Insight berikutnya ada di sini', 'Otakmu suka konsistensi', 'Lebih jelas daripada kemarin',
];
const GREETINGS_TR = [
    'Yeni dilin bugün güçleniyor', 'Özgüvene bir adım daha yakın', 'Yeni bir ifade, yeni bir kapı',
    'Küçük alışkanlıklar da ilerleme getirir', 'Her kelimeyle daha emin', 'Bugün ilerleme günü',
    'Küçük pratikler, büyük sıçramalar', 'İlerlemen canlı kalıyor', 'Daha rahat ve net konuş',
    'Sıradaki içgörü burada', 'Beynin sürekliliği sever', 'Dünden daha net',
];
const GREETINGS_PL = [
    'Twój nowy język dziś rośnie w siłę', 'O krok bliżej pewności', 'Nowa fraza, nowe drzwi',
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
const HOME_DAILY_GREETING_KEY = 'home_daily_greeting_v1';
const HOME_ONBOARDING_DONE_KEY = 'onboarding_done';
// Контент карточек-подсказок и ключи хранения — app/home_feature_tips.ts
// (общие с settings.tsx; повторные показы переключают юмористические наборы).

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


// ── [HOME-RENDER]: разбивка окна первого кадра (только лог, один раз за запуск) ──
// Модуль home.tsx (со всеми статическими зависимостями) вычислен к моменту этой строки.
const homeModuleEvaluatedAt = Date.now();
let homeFirstRenderStartedAt = 0;
let homeFirstRenderLogged = false;
let homeColdFirstFrameLogged = false;
// [HOME-EFFECTS] (в): окно после фиксации первого монтирования — эффекты детей + планирование, затем свои эффекты Главной.
let homeFirstCommittedAt = 0;
let homeFirstPassiveStartedAt = 0;
let homeEffectsLogged = false;
function logHomeFirstMountEffectsTiming(): void {
  if (homeEffectsLogged || homeFirstPassiveStartedAt === 0) return;
  homeEffectsLogged = true;
  const doneAt = Date.now();
  console.warn('[HOME-EFFECTS] first_mount', JSON.stringify({
    sinceCommitMs: homeFirstCommittedAt ? homeFirstPassiveStartedAt - homeFirstCommittedAt : null,
    ownPassiveMs: doneAt - homeFirstPassiveStartedAt,
    doneEpochMs: doneAt,
  })); // guard-ok: одна строка за запуск, временная трассировка старта
}
// зачем (пакет 07:26 [HOME-COLD]: videos=0 на первом кадре, сеть до 10 с): последний показанный снимок ленты (RSS-путь) —
// повторный вход на Главную берёт его в первом кадре; сеть ходит один раз за запуск, флаг ставится только при успехе.
let homeVideoSnapshotMemo: Readonly<{ videos: readonly LingmanYoutubeVideo[]; latestVideoId: string | null; error: boolean }> | null = null;
let homeVideoNetworkOkThisLaunch = false;
type HomeVideoLoadSnapshot = Readonly<{ videos: readonly LingmanYoutubeVideo[]; latestVideoId: string | null; error?: string }>;
// зачем (Сверка 02:15, HOME-COLD_cold3: video:start ×2): одна цепочка загрузки ленты на время её выполнения.
const homeVideoLoadPipeline = createHomeVideoLoadPipeline<HomeVideoLoadSnapshot>();
function logHomeFirstRenderTiming(): void {
  if (homeFirstRenderLogged) return;
  homeFirstRenderLogged = true;
  const committedAt = Date.now();
  homeFirstCommittedAt = committedAt;
  console.warn('[HOME-RENDER] first', JSON.stringify({
    moduleToRenderMs: homeFirstRenderStartedAt - homeModuleEvaluatedAt,
    renderToCommitMs: committedAt - homeFirstRenderStartedAt,
    committedEpochMs: committedAt,
  })); // guard-ok: одна release-строка за запуск, как [HOME-PAINT] (release вырезает log/info, warn остаётся)
}

export default function HomeScreen({ onOpenDevHub }: { onOpenDevHub?: () => void } = {}) {
  // зачем (владелец 2026-09-22, «удалить все замеры»): здесь в ТЕЛЕ компонента
  // стоял countScreenRender('home') — работа на КАЖДЫЙ рендер Главной. Тело
  // самого горячего экрана обязано быть чистым. Исключение — одна проверка числа ниже: после первого рендера
  // она ничего не делает (координатор 05.10, [HOME-RENDER]).
  if (homeFirstRenderStartedAt === 0) homeFirstRenderStartedAt = Date.now();
  usePerfR1Probe('home'); // зачем (координатор 12.10, R1_PERF_FIRST_FRAME): первый кадр и число коммитов корня за 3 с; в релизе — пустая функция
  // зачем ((в), пакет 07:26: фиксация +5,6 с → кадр +8,1 с): ПЕРВЫЙ объявленный пассивный эффект Главной. Пассивные
  // эффекты идут по порядку объявления, дочерние — раньше родителя; пара с последним эффектом ниже делит окно.
  useEffect(() => { if (homeFirstPassiveStartedAt === 0) homeFirstPassiveStartedAt = Date.now(); }, []);
  useMemHomeRegisterSources('home_instance'); // зачем ([MEM-HOME] 18.10, R129): живые экземпляры Главной — после замены экрана больше одного значит утечка дерева; dev, в релизе пусто
  const homeFocusCost = useHomeFocusCostBegin(); // зачем ([HOME-FOCUS-COST] 18.10, [BACK-BTN] «Сегодня»: JS занят 200–650 мс после возврата): сколько стоит рендер корня с детьми и собственные эффекты корня; dev, в релизе пусто
  const tabContentBottomPad = useTabContentBottomPad();
    const router = useRouter();
    // Навигация к отдельным экранам — через guard от двойного тапа (дубли в стеке).
    const nav = useGuardedNav();
    const { theme: t, f, themeMode, liquidGlassAppearance } = useTheme();
    const shadowGlass = useShadowGlass(); // зачем («Тень» 12.10): строки окна званий — плашки с тенью, выбранная приподнята; обводок нет
    // зачем (владелец 04.10, «первые ассеты готовы, вшивай»): предметы 2.0 — светлый комплект у светлых тем, тёмный у тёмных и градиентных.
    const homeArtTone = liquidGlassAppearance === 'light' ? 'light' : 'dark';
    const myCoinRank = useMyCoinRank();
    const { s, lang } = useLang();
    const { studyTarget } = useStudyTarget();
    // зачем (§137): «сегодня ещё не засчитано» на плашке серии — синхронно из сигнала Ядра, без чтений хранилища.
    const streakToday = useSyncExternalStore(subscribeStreakDayState, streakTodaySnapshot);
    // зачем (релизный пол 10.10): спиннер в шапке, пока после входа догружаются серия и монеты.
    const cloudProfileRefreshing = useCloudProfileRefreshing();
    // зачем (D49, PM-259): живые задания дня вместо заглушки — прогресс, done и монеты
    // считает modules/today-tasks; хук стоит до раннего return (правила хуков).
    const todayTasks = useTodayTasks(lang, studyTarget);
    // зачем (владелец 11.10): плитка «Шпиль» — за тем же замком, что и вкладка (флаг + интерфейс ru/uk).
    const spireTabEnabled = useSpireTabEnabled();
    // зачем D129/D130: какие разделы видны для языка обучения — только из таблицы
    // готовности. studyTarget синхронный (peek), поэтому первый кадр уже финальный.
    const homeLearnVisible = isLearnTabVisibleForTarget(studyTarget);
    const homeDialoguesVisible = isLearningSurfaceReady(studyTarget, 'dialogues');
    // зачем (владелец 01.10: диалоги «ДОЛЖНЫ» прогреваться): плитка «Диалоги» видна —
    // греем функции старта/хода после первого кадра, не чаще раза в 10 минут.
    // зачем (расходы, координатор 17.10): прогрев Диалогов с Главной выключен — греем только при переходе в Диалоги (DialogsTabContent), не чаще раза в 30 мин
    useDialogueV2Warmup(false, 'home_tile');
    const homeFlashcardsVisible = isLearningSurfaceReady(studyTarget, 'flashcards');
    const homeVideosVisible = isLearningSurfaceReady(studyTarget, 'videos');
    const homeDailyPhraseVisible = isLearningSurfaceReady(studyTarget, 'daily_phrase');
    const topFadeScroll = useTopFadeScroll();
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
    // зачем (§78): одна release-строка [HOME-PAINT] после первого кадра — точный замер Главной
    // вместо опроса uiautomator (±1 с). Один раз за запуск, без setState.
    useEffect(() => { markHomeFirstPaint(); }, []);
    // зачем (координатор 05.10, пакеты 05:26/06:26: стоянка 1,5–2,5 с в окне монтирования Главной, [JS-STALL] стека не
    // пишет): делим окно на «модуль вычислен → первый рендер начат → зафиксирован». Кадр уже есть в [HOME-PAINT].
    // Один раз за запуск, без setState; в теле рендера — одна проверка числа.
    useLayoutEffect(() => { logHomeFirstRenderTiming(); }, []);
    const dailyPhraseCardVisibleRef = useRef(false);
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
    // зачем ([SCROLL-RESTORE] 18.10, журнал Сверки ru → es: после lang_change y=0, высота 945 → 975 за 430 мс, и экран сам уезжает на y=81 — шапка срезана): в окне 2,5 с после РЕАЛЬНОЙ смены языка, пока человек не прокручивал пальцем,
    // возвращаем верх один раз. Жест пальцем отключает коррекцию; вне окна и без смены языка ничего не делает.
    const homeLangChangedAtRef = useRef(0);
    const homeDraggedAfterLangRef = useRef(false);
    const homeLangCorrectedRef = useRef(false);
    const homePrevLangRef = useRef(lang);
    const correctHomeScrollAfterLang = useCallback((source: string) => {
        const changedAt = homeLangChangedAtRef.current;
        const sinceLangMs = Date.now() - changedAt;
        if (changedAt === 0 || sinceLangMs > 2500) return;
        if (homeDraggedAfterLangRef.current || homeLangCorrectedRef.current) return;
        const y = homeScrollYRef.current;
        if (y <= 0) return;
        homeLangCorrectedRef.current = true;
        console.log('[SCROLL-RESTORE] home:correct_to_top', JSON.stringify({ source, y: Math.round(y), sinceLangMs })); // guard-ok: одна строка на коррекцию после смены языка
        homeScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []);
    const notifyHomeScrollY = useCallback((y: number) => {
        homeScrollYRef.current = y;
        noteScrollOffset('home', y);
        correctHomeScrollAfterLang('scroll_y'); // зачем ([SCROLL-RESTORE] 18.10): рывок положения без пальца вскоре после смены языка или фокуса
        topFadeScroll?.reportTabBarOffset?.(y);
        refreshDailyPhraseVisibility();
    }, [correctHomeScrollAfterLang, refreshDailyPhraseVisibility, topFadeScroll]);
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
        noteScrollDrag('home', false);
        noteScrollOffset('home', homeScrollYRef.current);
        refreshDailyPhraseVisibility();
    }, [refreshDailyPhraseVisibility]);
    const { goToTab, activeIdx, runtimeOwnerId } = useTabNav();
    const focusTick = useTabFocusTick(); // зачем (каскад [TABS-RENDER]): focusTick — свой контекст, см. app/TabContext.tsx
    // зачем ([SCROLL-RESTORE] 18.10, находка Сверки: Главная открывается прокрученной вниз): у Главной нет своего scrollTo, поэтому пишем события, после которых положение могло смениться, и размер содержимого
    useEffect(() => {
        if (homePrevLangRef.current !== lang) {
            homePrevLangRef.current = lang;
            homeLangChangedAtRef.current = Date.now();
            homeDraggedAfterLangRef.current = false;
            homeLangCorrectedRef.current = false;
        }
        noteScrollEvent('home', 'lang_change', { lang, y: Math.round(homeScrollYRef.current), setBy: 'none_no_scrollTo_on_home' });
    }, [lang]);
    useEffect(() => {
        noteScrollEvent('home', 'focus', { focusTick, y: Math.round(homeScrollYRef.current), setBy: 'none_no_scrollTo_on_home' });
        memHomeSummary('home_focus', { focusTick }); // зачем ([MEM-HOME] 18.10): сводка живых картинок/экземпляров и JS-куча на каждом фокусе Главной
        noteBackArrived('home', 'focus_tick'); // зачем ([BACK-BTN] 18.10): возврат с «Сегодня» — «прибыли» на Главной; без нажатия «назад» проба молчит
    }, [focusTick]);
    // зачем (HOME-COLD_cold1: video:start через 5 998 мс, homeOnboardingDone:false): флаг, уже прочитанный корнем,
    // включает homeRuntimeActive на первом кадре; multiGet ниже остаётся источником правды.
    const [homeOnboardingDone, setHomeOnboardingDone] = useState(() => takeOnboardingDonePeek() === true);
    const isHomeOwner = runtimeOwnerId === 'home';
    // Root Stack монтирует Home под полноэкранным CleanOnboarding. Владение табом
    // само по себе ещё не означает, что экран видим: до onboarding_done запрещаем
    // тяжёлые загрузки, Firestore, префетчи и циклы анимаций.
    // зачем (R137 18.10, журнал Сверки back_after3): после возврата с экрана стека («Сегодня» → «назад») активность ждёт конца перехода (focusTick) — два рендера Главной (≈110 и ≈75 мс)
    // сливаются в один и не идут внутри анимации; Главная при этом уже нарисована из кэша. Вкладки внутри группы и холодный старт не откладываются (hooks/use_runtime_active_settled.ts).
    const homeRuntimeActive = useRuntimeActiveSettled(isHomeOwner && homeOnboardingDone);
    const homeRuntimeActiveRef = useRef(homeRuntimeActive);
    // Home may mount while another retained tab owns runtime work.
    const homeDataDirtyRef = useRef(true);
    const streakMarkersDirtyRef = useRef(false);
    useEffect(() => {
        homeRuntimeActiveRef.current = homeRuntimeActive;
    }, [homeRuntimeActive]);
    // Опрос V2 живёт в строке «Сегодня»: сам хук остаётся владельцем снимка и
    // отправки, а шторка только показывает уже загруженную модель.
    const homePollV2 = useHomePollV2({ lang, active: homeRuntimeActive });
    const [homePollV2Open, setHomePollV2Open] = useState(false);
    const closeHomePollV2 = useCallback(() => setHomePollV2Open(false), []);
    useEffect(() => {
        if (homePollV2.phase === 'hidden') closeHomePollV2();
    }, [closeHomePollV2, homePollV2.phase]);
    // зачем (D191, Ядро 14.10): окно итога недели берёт слот в общей очереди окон, «показано» отмечает хук; здесь только точка монтирования
    // зачем (владелец 22.10, «вернуть анкеты»): анкета-кампания из админки — строка в «Сегодня»; загрузка раз при входе с кэшем 6 ч,
    // шторка монтируется только пока открыта (hooks/use_home_survey_entry.ts). Делит строку с Poll V2 — анкета первой.
    const homeSurvey = useHomeSurveyEntry(lang, homeRuntimeActive);
    // Одна строка «Сегодня» на два источника (владелец 22.10): анкета-кампания из админки первой, иначе Poll V2.
    const homeTodayRowSource: 'survey' | 'poll_v2' | 'none' = homeSurvey.row ? 'survey' : homePollV2.phase !== 'hidden' ? 'poll_v2' : 'none';
    useEffect(() => {
      console.log('[SURVEY-ROW]', JSON.stringify({ source: homeTodayRowSource, surveyOffered: homeSurvey.row !== null, pollPhase: homePollV2.phase, reason: homeTodayRowSource === 'survey' ? 'active_survey_campaign' : homeTodayRowSource === 'poll_v2' ? 'no_survey_poll_active' : 'nothing_active' })); // guard-ok: одна строка на смену выбора
    }, [homeTodayRowSource, homeSurvey.row, homePollV2.phase]);
    const weekMoment = useSpireWeekMoment({ uiLang: lang, studyTarget: String(studyTarget), tabEnabled: spireTabEnabled, active: homeRuntimeActive });
    // зачем (координатор 14.10; эталон v3-all: Играть ведёт в игру): после синхронного закрытия окна — в раздел Пика; Пик недоступен этому языку / вкладка выключена → кнопка только закрывает окно
    const weekMomentPlay = useMemo(() => (spireTabEnabled && isLearningSurfaceReady(studyTarget, 'spire') ? () => { nav.push('/(tabs)/community?section=spire' as never); } : undefined), [nav, spireTabEnabled, studyTarget]);
    // зачем (координатор 14.10): авто-пейвол «серия» шёл мимо очереди окон и мог въехать поверх окна недели / «С возвращением» — перед push ждём свободный слот, показываем один раз после ([PAYWALL-AUTO])
    // зачем (D193, Авторизация 14.10): «С возвращением» стоит в той же очереди окон сразу после итога недели; энергия — из памяти (peek), без чтений
    const energyPeekNow = peekEnergy();
    const welcomeBack = useWelcomeBackMoment({
        studyTarget: String(studyTarget),
        coinRank: isValidCoinRank(myCoinRank) ? myCoinRank : null,
        energy: energyPeekNow ? { current: energyPeekNow.energy, max: energyPeekNow.maxEnergy } : null,
        active: homeRuntimeActive,
    });
    const rankEnough = useCoinRankEnoughMoment({ active: homeRuntimeActive });
    const overlayActiveKey = useOverlayActiveKey();
    const overlayActiveKeyRef = useRef(overlayActiveKey);
    overlayActiveKeyRef.current = overlayActiveKey;
    const pendingStreakPaywallRef = useRef<Readonly<{ streak: number; day: string }> | null>(null);
    const pushStreakPaywall = useCallback(async (streak: number, day: string): Promise<void> => {
        // зачем: отметка «показан сегодня» ставится В МОМЕНТ реального показа, а не при решении — отложенный пейвол не теряется
        await AsyncStorage.setItem('streak_paywall_shown', day);
        DebugLogger.info('[PAYWALL-AUTO]', `push: слот свободен, серия=${streak} день=${day}`);
        router.push({ pathname: '/premium_modal', params: { context: 'streak', streak: String(streak) } } as any);
    }, [router]);
    useEffect(() => {
        const pending = pendingStreakPaywallRef.current;
        if (overlayActiveKey !== null || !pending || !homeRuntimeActive) return;
        pendingStreakPaywallRef.current = null;
        DebugLogger.info('[PAYWALL-AUTO]', `слот освободился (был занят), показываем отложенный пейвол: серия=${pending.streak}`);
        void pushStreakPaywall(pending.streak, pending.day).catch(noteSwallowedHandler('home:streakPaywall.deferredPush'));
    }, [homeRuntimeActive, overlayActiveKey, pushStreakPaywall]);
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
    // зачем ([HOME-SETSTATE] 18.10, координатор; замер: appSnapshot менялся 9 из 23 рендеров окна возврата): писатели снимка пересобирают секции с новым updatedAt — по ссылке это «новое»,
    // хотя имя, серия и монеты те же. Сравниваем по содержимому без updatedAt (его Главная не читает): та же ссылка → без перерисовки; вид не меняется.
    const appSnapshot = useAppSnapshotSelector((snapshot) => ({
        profile: snapshot.profile,
        progress: snapshot.progress,
    }), (a, b) => sameSnapshotSection(a.profile, b.profile) && sameSnapshotSection(a.progress, b.progress));
    const hh = homeStatsLoadedOnce ? peekHomeScreenHydration(studyTarget) : null;
    const snapshotName = appSnapshot.profile?.name ?? '';
    const snapshotStreak = appSnapshot.progress?.streak ?? 0;
    const initialVisuals = resolveHomeProfileVisuals({ hydration: hh, snapshot: appSnapshot.profile });
    const [userName, setUserName] = useState(() => hh?.userName ?? snapshotName);
    // зачем (аудит Авторизации 057dfb6ac, координатор 13.10): `userName` задавался один раз при монтировании, а дальше — только загрузкой данных или «заполнить, если пусто» (ниже), поэтому после смены ника в профиле Главная держала старое имя до перезапуска.
    // Эффект зависит ТОЛЬКО от имени в слепке профиля: срабатывает при его смене; пустое имя не затирает показанное; `setUserName` возвращает то же значение, если имя уже совпало (лишнего рендера нет). Имя в журнал не пишем (персональные данные) — только длины.
    const snapshotNameSeenRef = useRef(snapshotName);
    useEffect(() => {
        const previous = snapshotNameSeenRef.current;
        if (previous === snapshotName)
            return;
        snapshotNameSeenRef.current = snapshotName;
        if (!snapshotName) {
            console.log('[HOME-NAME] snapshot_changed → пустое имя, показанное не трогаем', JSON.stringify({ fromLen: previous.length, toLen: 0 })); // guard-ok: ранний выход логируется
            return;
        }
        console.log('[HOME-NAME] snapshot_changed → обновляем имя на Главной', JSON.stringify({ fromLen: previous.length, toLen: snapshotName.length })); // guard-ok: смена имени из слепка профиля
        setUserName((current) => (current === snapshotName ? current : snapshotName));
    }, [snapshotName]);
    const [streak, setStreak] = useState(() => hh?.streak ?? snapshotStreak);
    const [displayStreak, setDisplayStreak] = useState(() => hh?.displayStreak ?? hh?.streak ?? snapshotStreak);
    const streakRingAnim = useRef(new Animated.Value(0)).current;
    const homeMotionReduceMotion = useReduceMotion();
    const [homeStatsReady, setHomeStatsReady] = useState(() => !!((homeStatsLoadedOnce && hh) || appSnapshot.profile || appSnapshot.progress));
    // true только когда загрузка ОБОРВАЛАСЬ и показывать нечего (первый запуск + оффлайн).
    // Если есть кэш/hydration — баннер НЕ показываем: экран деградирует до кэша молча.
    // зачем (владелец 01.10: «никаких не загрузилось»): первая загрузка Главной упала и показать
    // нечего — вместо плашки «Проверь соединение» тихо повторяем загрузку в фоне (до 5 раз по 20 с).
    const homeSilentRetryRef = useRef(0);
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
    // зачем (координатор 01.10, эмулятор: карточка «Продолжить» приходила через loadData и
    // сдвигала Главную на ~290 px): пока урок не прочитан, место держит заготовка той же формы.
    const [continueResolved, setContinueResolved] = useState(() => lastLesson !== null);
    const continueResolvedRef = useRef(continueResolved);
    // зачем (владелец 04.10): карточка «Продолжить обучение» = последний урок. Лог показывает, какой урок
    // и почему карточка скрыта (нет урока / раздел уроков не виден для языка / урок ещё не прочитан).
    useEffect(() => {
        const visible = lastLesson !== null && homeLearnVisible;
        const reason = visible ? 'shown'
            : !homeLearnVisible ? 'learn_surface_hidden_for_target'
                : !continueResolved ? 'last_lesson_pending'
                    : 'no_last_lesson';
        console.log('[HOME-CONTINUE] card', JSON.stringify({
            visible, reason, lessonId: lastLesson?.id ?? null, progress: lastLesson?.progress ?? null,
            studyTarget: String(studyTarget), source: 'hydration_or_loadData',
        }));
    }, [continueResolved, homeLearnVisible, lastLesson?.id, lastLesson?.progress, studyTarget]);
    // зачем (Ревизор P23, координатор 15.10): «Продолжить» показывает то, что СВЕЖЕЕ — старый урок или занятие курса V2 (метки в home_continue_mark,
    // только локально). Раньше карточка знала только старые уроки: у тех, кто занимался V2, её не было или она вела в старый урок.
    const continueMarks = useHomeContinueMarks(studyTarget);
    // зачем (слово владельца 17.10, координатор): «последнее место» — не только урок, но и диалог или набор карточек; метки проверены на устаревание (раздел закрыт для языка,
    // сценарий удалён) до выбора — устаревшая тихо отпадает, причина в [HOME-CONTINUE] stale. Считается один раз на смену меток/языка, не на каждый рендер.
    const continuePlaces = useMemo(
        () => resolveHomeContinuePlaces({ marks: continueMarks, dialoguesVisible: homeDialoguesVisible, flashcardsVisible: homeFlashcardsVisible, lang }),
        [continueMarks.dialog, continueMarks.cards, homeDialoguesVisible, homeFlashcardsVisible, lang], // eslint-disable-line react-hooks/exhaustive-deps -- зачем: нужны только эти две метки
    );
    // зачем (R92): карточка «Продолжить» не ведёт в курс V2, если у курса нет пояснений на языке интерфейса (есть только ru/uk)
    const continueInput = { hasLegacyLesson: lastLesson !== null, legacyAtMs: continueMarks.legacyAtMs, v2: homeLearnVisible && HOME_CONTINUE_V2_ENABLED && isLearningV2OpenForUiLangV1(lang, 'home_continue') ? continueMarks.v2 : null, dialog: continuePlaces.dialog, cards: continuePlaces.cards };
    const continueChoice = pickHomeContinue(continueInput);
    const continueV2 = continueChoice.kind === 'v2' ? continueInput.v2 : null;
    const continuePlace = continueChoice.kind === 'dialog' ? continuePlaces.dialog : continueChoice.kind === 'cards' ? continuePlaces.cards : null;
    // зачем: ни урока, ни занятия V2, ни диалога, ни карточек (первый запуск) — вместо пустого места «Начать урок 1»; пока урок читается, стоит прежняя заготовка той же формы
    const continueStart = continueChoice.kind === 'none' && continueResolved && homeLearnVisible;
    // зачем (координатор 15.10, поправка 1): «пройдено / выпущено» считается при показе из локального прогресса курса и
    // перечитывается на каждый возврат на Главную (focusTick) — после пройденного занятия число свежее, а не из метки
    const continueV2Progress = useHomeContinueV2Progress(continueV2?.lessonOrdinal ?? null, focusTick, homeRuntimeActive);
    const continueV2Launching = useHomeContinueV2Launching(); // зачем (Ревизор по R09, 🟡): занятие готовится до 12 с — карточка «Продолжить» показывает занятость вместо молчания
    useEffect(() => {
        logHomeContinueChoice(continueChoice, continueInput, String(studyTarget));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: журнал пишется на смену решения или меток, а не на каждый рендер
    }, [continueChoice.kind, continueChoice.reason, continueMarks.v2?.atMs, continueMarks.v2?.sessionId, continueMarks.legacyAtMs, continuePlaces.dialog?.atMs, continuePlaces.cards?.atMs, lastLesson?.id, studyTarget]);
    useEffect(() => {
        continueResolvedRef.current = continueResolved;
        if (continueResolved) return undefined;
        // Решение приносит loadData (урок или «нет урока», а при сбое — finally). Потолок —
        // только страховка от зависшей загрузки: заготовку не держим вечно.
        const timer = setTimeout(() => {
            if (continueResolvedRef.current) return;
            console.warn('[HOME-FIRST-FRAME] continue_card:ceiling — урок не прочитан за 20 с, заготовка снята');
            animateNextLayoutTransition();
            setContinueResolved(true);
        }, 20_000);
        return () => clearTimeout(timer);
    }, [continueResolved]);
    const lastLessonShownRef = useRef(lastLesson !== null);
    useEffect(() => { lastLessonShownRef.current = lastLesson !== null; }, [lastLesson]);
    // зачем (бета-тест Б1, 15.10, 🔴 «прыжок Главной у нового гостя»): заготовка «Продолжить» держалась, пока не доработает ТЯЖЁЛАЯ loadData (на холодном старте — секунды), и у человека без последнего урока
    // исчезала рывком, сдвигая весь контент вверх на ~235 px (тап по «Уроки» попал в видео). Здесь — узкое раннее чтение ОДНОГО ключа «последний открытый урок» (то же значение, что берёт loadData):
    // нет записи → урока нет, заготовка снимается сразу (плавно); есть запись — оставляем loadData (ему нужен прогресс для карточки). Лог [HOME-CONTINUE] называет значение ключа и решение.
    useEffect(() => {
        if (continueResolvedRef.current) return undefined;
        let cancelled = false;
        const token = captureAccountGeneration();
        const startedAt = Date.now();
        void AsyncStorage.getItem(lastOpenedLessonKey(studyTarget))
            .then((raw) => {
                if (cancelled || continueResolvedRef.current || !isCurrentAccountGeneration(token)) {
                    console.log(`[HOME-CONTINUE] early: пропуск cancelled=${cancelled} resolved=${continueResolvedRef.current} accountCurrent=${isCurrentAccountGeneration(token)} raw=${String(raw)}`); // guard-ok: ранний выход называет причину
                    return;
                }
                const id = raw ? parseInt(raw, 10) : NaN;
                const hasLesson = Number.isFinite(id) && id >= 1 && id <= 32;
                console.log(`[HOME-CONTINUE] early: ключ «последний урок» raw=${String(raw)} → ${hasLesson ? 'есть, ждём loadData (нужен прогресс)' : 'урока нет — заготовка снимается сразу'} за ${Date.now() - startedAt} мс studyTarget=${String(studyTarget)}`); // guard-ok: ветка решения называет значения
                if (hasLesson) return;
                animateNextLayoutTransition();
                setLastLesson(null);
                setContinueResolved(true);
            })
            .catch((error: unknown) => {
                console.warn(`[HOME-CONTINUE] early: чтение ключа не удалось — ${error instanceof Error ? error.message : String(error)} (заготовку решит loadData)`); // guard-ok: причина отказа в catch
            });
        return () => { cancelled = true; };
    }, [studyTarget]);
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
    // зачем D130: для языка с лентой из каталога (итальянский) первый кадр берёт кэш процесса.
    const [homeV2Videos, setHomeV2Videos] = useState<readonly LingmanYoutubeVideo[]>(() => (
        homeVideoRailUsesCatalog(studyTarget)
            ? peekHomeVideoRailForTarget(studyTarget)?.videos ?? []
            : homeVideoSnapshotMemo?.videos ?? []
    ));
    const [homeV2VideoStatus, setHomeV2VideoStatus] = useState<'loading' | 'ready' | 'error'>(() => (
        homeVideoRailUsesCatalog(studyTarget)
            ? (peekHomeVideoRailForTarget(studyTarget) ? 'ready' : 'loading')
            : (homeVideoSnapshotMemo && homeVideoSnapshotMemo.videos.length > 0 ? 'ready' : 'loading')
    ));
    // зачем D132: канала на языке изучения нет → лента скрыта целиком (кэш процесса
    // даёт ответ уже на первом кадре при повторном заходе).
    const [homeV2VideoNoChannel, setHomeV2VideoNoChannel] = useState(() => (
        homeVideoRailUsesCatalog(studyTarget) && peekHomeVideoRailForTarget(studyTarget)?.source === 'no_channel_for_target'
    ));
    // зачем ([HOME-VIDEO-LANG] 18.10, находка Макетов: испанский интерфейс видит русские ролики): лента выбирается по языку ИЗУЧЕНИЯ, фильтра по языку интерфейса нет. Условие «лента только для интерфейсов, на языке
    // которых есть ролики» подготовлено, но ВЫКЛЮЧЕНО (HOME_VIDEO_RAIL_LANG_FILTER_ENABLED = false, решение за владельцем): пока флаг выключен, hidden всегда false и поведение не меняется.
    // зачем (координатор 18.10, [HOME-CHILD-COST]): значение для колокольчика (контекст вокруг шапки) — новое только когда реально сменились активность вкладки или счётчик фокусов
    const homeBellState = useMemo(() => ({ active: homeRuntimeActive, focusTick }), [focusTick, homeRuntimeActive]);
    const homeVideoLang = useMemo(() => decideHomeVideoRailByInterfaceLang({ lang, videos: homeV2Videos }), [lang, homeV2Videos]);
    useEffect(() => {
        const buttonEnabled = isVideoButtonEnabled();
        const shownReason = !buttonEnabled ? 'video_button_disabled'
            : !homeVideosVisible ? 'surface_not_ready'
            : homeV2VideoNoChannel ? 'no_channel_for_target'
            : homeVideoLang.hidden ? homeVideoLang.reason
            : 'shown';
        const catalogRail = homeVideoRailUsesCatalog(studyTarget);
        logHomeVideoLang({
            lang,
            studyTarget: String(studyTarget),
            shown: shownReason === 'shown',
            shownReason,
            catalogRail,
            noChannel: homeV2VideoNoChannel,
            videoStatus: homeV2VideoStatus,
            channelNote: catalogRail ? `catalog:${peekHomeVideoRailForTarget(studyTarget)?.channelId ?? 'none'}` : 'lingman_rss_ru_channel',
            decision: homeVideoLang,
        });
    }, [homeV2VideoNoChannel, homeV2VideoStatus, homeVideoLang, homeVideosVisible, lang, studyTarget]);
    // зачем (Сверка 06:01: на холодном старте карточка урока — заглушки, превью видео — серые блоки): что было на первом
    // кадре и откуда. Один раз за запуск (флаг модуля), без setState.
    useLayoutEffect(() => {
        if (homeColdFirstFrameLogged) return;
        homeColdFirstFrameLogged = true;
        console.warn('[HOME-COLD] first_frame', JSON.stringify({
            lessonCard: lastLesson ? (peekHomeScreenHydration(studyTarget) ? 'memory' : 'boot_snapshot') : 'empty',
            lessonId: lastLesson?.id ?? null,
            hydrationInMemory: peekHomeScreenHydration(studyTarget) !== null,
            videos: homeV2Videos.length,
            videoStatus: homeV2VideoStatus,
            catalogRail: homeVideoRailUsesCatalog(studyTarget),
        })); // guard-ok: одна строка за запуск
    }, []);
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
    // зачем (владелец 04.10, скриншот: «ТУТ НЕ ДОЛЖНО БЫТЬ МОИ ОШИБКИ! ТУТ ПОСЛЕДНИЙ УРОК ОТКРЫТЫЙ, А НЕ ОШИБКИ!
    // ОШИБКИ В БЛОКЕ СЕГОДНЯ»): карточка «Продолжить обучение» — всегда только последний открытый урок.
    // Автозахват ошибками (10+) и переворот долгим нажатием «урок ↔ ошибки» удалены вместе с состоянием лица;
    // вход в «Мои ошибки» на Главной — строка «Сегодня» (D144).
    useEffect(() => {
        if (homePriorityCardReduceMotion) homePriorityCardScale.value = 1;
    }, [homePriorityCardReduceMotion, homePriorityCardScale]);
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
    const homeFeatureTipHintPulse = useRef(new Animated.Value(0)).current;
    // Кросс-фейд содержимого карточки при смене подсказки (1 = видно, 0 = скрыто на миг перехода).
    // 0 = карточка на месте (видна), -1 = уехала (старая), 1 = ещё не приехала (новая).
    const homeFeatureTipContentAnim = useRef(new Animated.Value(0)).current;
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
        // зачем (аудит скорости R1, 12.10): captureAccountGeneration() каждый раз отдаёт НОВЫЙ объект, поэтому вызов в эффекте ниже на монтировании
        // менял state (тот же поколение/аккаунт/фаза, другая идентичность) → полный лишний рендер всей Главной и перезапуск эффекта счётчика ошибок
        // (второй getMistakePracticeHomeCounts). Прежний объект остаётся, пока поколение, аккаунт и фаза те же.
        const applyMistakeAccountGeneration = (token: AccountGenerationToken) => {
            setMistakeAccountGeneration((prev) => (
                prev.generation === token.generation && prev.stableId === token.stableId && prev.phase === token.phase ? prev : token
            ));
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
                // зачем ([HOME-SETSTATE] 18.10, замер home_renders.txt: mistakeReadySnapshot давал рендер на каждом втором возврате): те же числа — прежняя ссылка, Главная не перерисовывается
                setMistakeReadySnapshot((prev) => (prev && prev.target === String(studyTarget) && prev.ownerKey === requestOwnerKey && prev.count === counts.ready && prev.active === counts.active ? prev : {
                    target: String(studyTarget),
                    ownerKey: requestOwnerKey,
                    count: counts.ready,
                    active: counts.active,
                }));
                // зачем (владелец 2026-09-14): подсказка хаба должна быть готова ДО
                // открытия раздела - греем раз в сутки фоном, пока человек на Главной.
                // Греем только у открытого раздела: ниже порога подсказку не увидят.
                if (homeMistakesButtonState(counts.active) === 'ready') {
                    void import('../mistake_hub_advice')
                        .then((m) => m.prewarmMistakeHubAdvice({ studyTarget: mistakeStudyTarget, lang }))
                        .catch(noteSwallowedHandler('home:prewarmMistakeHubAdvice'));
                }
                // зачем (владелец 2026-09-15): раздел ошибок открывается только от
                // порога — греть подсказку раньше незачем, она всё равно не видна.
            })
            .catch((error: unknown) => {
                // зачем: раньше catch молчал - счётчик обнулялся без следа.
                console.warn('[MISTAKES-HUB] home:counts:catch → 0', error instanceof Error ? error.message : String(error)); // guard-ok: лог в catch обязателен (правило владельца «сперва логи»)
                if (cancelled || !isCurrentAccountGeneration(requestOwner, requestOwner.stableId)) return;
                setMistakeReadySnapshot((prev) => (prev && prev.target === String(studyTarget) && prev.ownerKey === requestOwnerKey && prev.count === 0 && prev.active === 0 ? prev : {
                    target: String(studyTarget),
                    ownerKey: requestOwnerKey,
                    count: 0,
                    active: 0,
                }));
            });
        return () => {
            cancelled = true;
        };
    }, [focusTick, homeRuntimeActive, mistakeAccountGeneration, mistakeAccountGenerationKey, mistakeStudyTarget, studyTarget]);
    // зачем (пакет 10:26: кэш ленты читался 3,9 с — ~2,9 с уходило на ленивый импорт модуля ленты, и ещё ждали
    // homeRuntimeActive): сохранённый список канала читаем лёгким модулем сразу при монтировании; модуль ленты
    // потом обновит из сети и подмешает пины. Один раз за запуск (homeVideoSnapshotMemo).
    useEffect(() => {
        if (homeVideoSnapshotMemo || !isVideoButtonEnabled() || homeVideoRailUsesCatalog(studyTarget)) return undefined;
        let alive = true;
        const startedAt = Date.now();
        void readRawCachedLingmanFeed().then((videos) => {
            console.warn('[HOME-COLD] video:raw_cache', JSON.stringify({ ms: Date.now() - startedAt, videos: videos?.length ?? 0, alive, memo: !!homeVideoSnapshotMemo })); // guard-ok: временная трассировка холодного старта
            if (!alive || !videos || homeVideoSnapshotMemo) return;
            homeVideoSnapshotMemo = { videos, latestVideoId: videos[0]?.id ?? null, error: false };
            latestVideoIdRef.current = homeVideoSnapshotMemo.latestVideoId;
            setHomeV2Videos(videos);
            setHomeV2VideoStatus('ready');
        });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- один раз при монтировании
    }, []);
    // зачем (владелец 2026-09-15): вход в видео переехал из шапки в ряд «Сегодня»,
    // поэтому счётчик непросмотренных читается здесь. Локальный снапшот, без сети.
    useEffect(() => {
        if (!homeRuntimeActive || !isVideoButtonEnabled()) {
            // зачем (Сверка 06:01, серые превью видео на холодном старте): ранний выход обязан говорить причину.
            console.warn('[HOME-COLD] video:skip', JSON.stringify({
                homeRuntimeActive, videoButtonEnabled: isVideoButtonEnabled(), runtimeOwnerId, homeOnboardingDone,
                sinceFirstRenderMs: Date.now() - homeFirstRenderStartedAt,
            })); // guard-ok: ранний выход логируется (пакет 08:26: почему runtime неактивен первые 6–8 с)
            return undefined;
        }
        let alive = true;
        const videoLoadStartedAt = Date.now();
        // Какая зависимость перезапустила эффект — видно по значениям (Сверка 02:15: второй старт через 1,9 с).
        console.warn('[HOME-COLD] video:start', JSON.stringify({
            sinceFirstRenderMs: videoLoadStartedAt - homeFirstRenderStartedAt, catalogRail: homeVideoRailUsesCatalog(studyTarget),
            focusTick, homeRuntimeActive, studyTarget: String(studyTarget), pipelineRunning: homeVideoLoadPipeline.isRunning(),
        })); // guard-ok: временная трассировка холодного старта
        // зачем (пакет 07:26 [HOME-COLD], правило «мгновенно из кэша»): сначала сохранённый список (локально, мс), сеть —
        // фоном и один раз за запуск. Раньше сеть шла на каждый фокус Главной и до неё лента стояла серой.
        const applySnapshot = (
            snapshot: HomeVideoLoadSnapshot,
            source: 'cache' | 'network',
        ) => {
            console.warn('[HOME-COLD] video:resolved', JSON.stringify({
                source, alive, ms: Date.now() - videoLoadStartedAt, sinceFirstRenderMs: Date.now() - homeFirstRenderStartedAt,
                videos: snapshot.videos.length, error: snapshot.error ?? null,
            })); // guard-ok: трассировка холодного старта
            if (!alive) return;
            latestVideoIdRef.current = snapshot.latestVideoId ?? snapshot.videos[0]?.id ?? null;
            // зачем D130: язык с лентой из каталога берёт видео своего канала (эффект ниже),
            // английская RSS-лента для него только считает непросмотренные.
            if (homeVideoRailUsesCatalog(studyTarget)) return;
            // Сбой сети без своих видео не стирает уже показанный кэш.
            if (source === 'network' && snapshot.error && snapshot.videos.length === 0 && homeVideoSnapshotMemo?.videos.length) return;
            homeVideoSnapshotMemo = { videos: snapshot.videos, latestVideoId: snapshot.latestVideoId, error: !!snapshot.error };
            setHomeV2Videos(snapshot.videos);
            setHomeV2VideoStatus(snapshot.error && snapshot.videos.length === 0 ? 'error' : 'ready');
        };
        if (homeVideoSnapshotMemo) latestVideoIdRef.current = homeVideoSnapshotMemo.latestVideoId;
        // Повторный запуск, пока цепочка идёт, только подписывается на её результат — вторая цепочка не стартует.
        const { joined, unsubscribe } = homeVideoLoadPipeline.run(applySnapshot, async (emit) => {
            try {
                const m = await import('../lingman_youtube');
                // зачем (пакет 08:26: после video:start ни одной строки — ни resolved, ни cache_miss): дошёл ли ленивый
                // импорт ленты и сколько шло чтение кэша.
                console.warn('[HOME-COLD] video:import_done', JSON.stringify({ ms: Date.now() - videoLoadStartedAt, memo: !!homeVideoSnapshotMemo })); // guard-ok: временная трассировка
                if (!homeVideoSnapshotMemo) {
                    const cached = await m.readCachedLingmanYoutubeSnapshot();
                    console.warn('[HOME-COLD] video:cache_read', JSON.stringify({ ms: Date.now() - videoLoadStartedAt, hit: !!cached })); // guard-ok: временная трассировка
                    if (cached) emit(cached, 'cache');
                    else console.warn('[HOME-COLD] video:cache_miss', JSON.stringify({ ms: Date.now() - videoLoadStartedAt })); // guard-ok: ветка логируется
                }
                if (homeVideoNetworkOkThisLaunch) {
                    console.warn('[HOME-COLD] video:network_skip', JSON.stringify({ reason: 'already_refreshed_this_launch' })); // guard-ok: ветка логируется
                    return;
                }
                const snapshot = await m.getLingmanYoutubeSnapshot();
                // зачем (§CORE-0170): «сеть уже обновила ленту» — только живой RSS; запасной источник (кэш/каталог) идёт без
                // ошибки, но следующий фокус должен снова попробовать RSS.
                if (!snapshot.error && (snapshot.source ?? 'rss') === 'rss') homeVideoNetworkOkThisLaunch = true;
                emit(snapshot, 'network');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                console.warn('[HOME-VIDEO] snapshot:catch → 0', message); // guard-ok: лог в catch обязателен
                // Как сбой сети: при показанном кэше он остаётся, без кэша — статус ошибки (applySnapshot).
                emit({ videos: [], latestVideoId: null, error: message }, 'network');
            }
        });
        if (joined) console.warn('[HOME-COLD] video:joined_in_flight', JSON.stringify({ sinceFirstRenderMs: Date.now() - homeFirstRenderStartedAt })); // guard-ok: временная трассировка
        return () => {
            alive = false;
            unsubscribe();
        };
    }, [focusTick, homeRuntimeActive, studyTarget]);
    // зачем D130: при смене языка лента не показывает видео прежнего языка, пока грузится новая.
    const homeRailTargetRef = useRef(studyTarget);
    useEffect(() => {
        if (homeRailTargetRef.current === studyTarget) return;
        homeRailTargetRef.current = studyTarget;
        // зачем (Ядро 13.10, аудит языка Авторизации; сценарий en → es → en в одном запуске: лента стояла скелетонами до перезапуска): для не-каталожной цели (en) peek всегда null, а эффект ленты en
        // при возврате ничего не эмитит — кэш в homeVideoSnapshotMemo уже заполнен (не читается), сеть уже обновляла ленту в этом запуске (video:network_skip). Снимок из памяти в стейт клал только эффект при монтировании.
        // Поэтому для не-каталожной цели берём memo сами; пустой memo не в счёт.
        const catalog = homeVideoRailUsesCatalog(studyTarget);
        const peek = catalog ? peekHomeVideoRailForTarget(studyTarget) : null;
        const memo = !catalog && homeVideoSnapshotMemo && homeVideoSnapshotMemo.videos.length > 0 ? homeVideoSnapshotMemo : null;
        console.warn('[LANG-SURFACE] home_rail:reset', JSON.stringify({ target: String(studyTarget), catalog, source: peek ? 'catalog' : memo ? 'memo' : 'none', videos: peek?.videos.length ?? memo?.videos.length ?? 0 })); // guard-ok: ветка сброса ленты логируется со значениями
        setHomeV2Videos(peek?.videos ?? memo?.videos ?? []);
        setHomeV2VideoStatus(peek || memo ? 'ready' : 'loading');
        setHomeV2VideoNoChannel(peek?.source === 'no_channel_for_target');
    }, [studyTarget]);
    // зачем (владелец 01.10: «никаких недоступно»): сбой ленты — тихий повтор (до 5 раз по 20 с), плитки-скелетоны держат место.
    const [homeRailRetryTick, setHomeRailRetryTick] = useState(0);
    // зачем D130/D132: лента Главной для es/fr/de/it — канал каталога с тегом языка.
    useEffect(() => {
        if (!homeRuntimeActive || !isVideoButtonEnabled()) return undefined;
        if (!homeVideoRailUsesCatalog(studyTarget) || !homeVideosVisible) return undefined;
        let alive = true;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        void loadHomeVideoRailForTarget(studyTarget)
            .then((rail) => {
                if (!alive) return;
                setHomeV2Videos(rail.videos);
                setHomeV2VideoStatus('ready');
                setHomeV2VideoNoChannel(rail.source === 'no_channel_for_target');
            })
            .catch((error: unknown) => {
                console.warn('[LANG-SURFACE] home_rail:catch → error', { studyTarget, error: error instanceof Error ? error.message : String(error) }); // guard-ok: лог в catch обязателен
                if (!alive) return;
                setHomeV2VideoStatus('error');
                if (homeRailRetryTick >= 5) {
                    console.warn('[LANG-SURFACE] home_rail: silent retries exhausted', { studyTarget, homeRailRetryTick });
                    return;
                }
                retryTimer = setTimeout(() => { if (alive) setHomeRailRetryTick((n) => n + 1); }, 20_000);
            });
        return () => { alive = false; if (retryTimer) clearTimeout(retryTimer); };
    }, [focusTick, homeRailRetryTick, homeRuntimeActive, homeVideosVisible, studyTarget]);
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
    const premiumCelebrationMounted = useMountedAfterFirstOpen(celebrationOverlayVisible);
    const vipCelebrationMounted = useMountedAfterFirstOpen(vipCelebrationOverlayVisible);
    const profileModalMounted = useMountedAfterFirstOpen(homeProfilePlayer !== null);
    const profileIntroEnabled = profileIntroRequested && homeRuntimeActive && homeProfilePlayer !== null;
    const profileIntroMounted = useMountedAfterFirstOpen(profileIntroEnabled);
    const savedCardsFlightMounted = useMountedAfterFirstOpen(cardArrivals > 0);
    useEffect(() => runAfterHomeFirstFrame('home_lazy_modals_prewarm', prewarmHomeDeferredModules), []);
    // зачем (PM-214, координатор 13.10): первый заход в Пик за запуск рисует экран из памяти, а не скелет — конфиг прогревается из дискового кэша после первого кадра Главной и после онбординга (сети нет)
    useEffect(() => runAfterHomeFirstFrame('spire_config_warm', () => import('../spire_config_client').then((m) => m.warmSpireConfigFromDisk()), { holdDuringOnboarding: true }), []);
    // зачем (замер 17.10 [SPIRE-LOAD]: комната с диска 1,3 с на входе в Пик): та же копия читается в память, пока человек на Главной — Пик открывается с людьми и «Играть» сразу
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: прогрев один раз за запуск, язык на момент первого кадра
    // зачем (координатор 17.10, скорость Главной): StoryAvatarSlot уже memo, но onOpenProfile был новой функцией на каждый рендер Главной —
    // слот (подписка на сторис) перерисовывался всегда. Стабильная обёртка зовёт самый свежий обработчик (ref обновляется в рендере ниже).
    const openHomeProfileRef = useRef<() => void>(() => undefined);
    const stableOpenHomeProfile = useCallback(() => openHomeProfileRef.current(), []);
    useEffect(() => runAfterHomeFirstFrame('spire_room_warm', () => import('../spire/spire_load_trace').then((m) => m.warmSpireRoomFromDisk(studyTarget)), { holdDuringOnboarding: true }), []);
    // зачем (координатор 15.10, 🔴 №7: 358 из 440 ключей — страницы аварийных копий): одна копия на владельца, страницы без
    // корня долой — после первого кадра, под замком смены аккаунта, не чаще раза в 6 ч ([ACC-SWITCH-BACKUP]).
    useEffect(() => runAfterHomeFirstFrame('account_switch_backup_gc', () => import('../account_switch_backup_gc').then((m) => m.runAccountSwitchBackupGc('cold_start'))), []);
    // зачем (D195, владелец 15.10): старые бонусы → монеты — один ленивый вызов сервера после первого кадра (раз на владельца, дальше локальная метка)
    useEffect(() => runAfterHomeFirstFrame('legacy_bonus_convert', () => import('../legacy_bonus_client').then((m) => m.runLegacyBonusConvertOnce('home_first_frame')), { holdDuringOnboarding: true }), []);
    // зачем (владелец 15.10, «Онбординг · уровень»): ответ экрана уровня, не ушедший в онбординге без сети, — отправить при следующем запуске
    useEffect(() => runAfterHomeFirstFrame('onboarding_level_flush', () => import('../onboarding_level_stats').then((m) => m.flushPendingOnboardingLevelAnswer()), { holdDuringOnboarding: true }), []);
    // зачем (D191, координатор 14.10): окно итога недели будет «как штык» при первом открытии после закрытия недели; в сборку 16.10 —
    // только проба после первого кадра и журнал [SPIRE-WEEK-MODAL] «когда показали бы», без показа и без арбитра (≤1 чтение в неделю).
    useEffect(() => runAfterHomeFirstFrame('spire_week_modal_probe', () => import('../spire/spire_week_modal_probe').then((m) => m.spireProbeWeekModal({ uiLang: lang, studyTarget, tabEnabled: spireTabEnabled })), { holdDuringOnboarding: true }), [lang, studyTarget, spireTabEnabled]);
    const [lessonsCompleted, setLessonsCompleted] = useState(() => hh?.lessonsCompleted ?? 0);
    const [pageScrollEnabled, setPageScrollEnabled] = useState(true);
    const isSketchLightTheme = isLightThemeMode(themeMode);
    const isLightTheme = isSketchLightTheme;
    const isGoldTheme = themeMode === 'gold';
    const mountedRef = useRef(true);
    // зачем: last_opened_lesson_changed летит из onAppEvent-подписки внутри useEffect с
    // deps=[] (регистрируется один раз при маунте) — без рефов замыкание держало бы
    // studyTarget/lang ПЕРВОГО рендера и путало бы уроки/язык названия при смене на лету.
    const studyTargetRef = useRef(studyTarget);
    useEffect(() => { studyTargetRef.current = studyTarget; }, [studyTarget]);
    const langRef = useRef(lang);
    useEffect(() => { langRef.current = lang; }, [lang]);
    const [runesBalance, setRunesBalance] = useState(() => peekRunes());
    // зачем (эмулятор 01.10, лог [HOME-COINS]): сплеш снимается по потолку 1 с, а снимок прогресса
    // может ещё читаться с диска — peekRunes() отдаёт 0, и Главная показывала «0 монет», потом
    // прыжок на реальное число (Performance Bible: без zero-then-jump). Пока прогресса нет — «—».
    // зачем (эмулятор 01.10): «прогресс есть» ≠ «монеты известны» — секция progress
    // появлялась раньше чтения монет с диска. Знаем баланс, только когда stars задан.
    const [runesKnown, setRunesKnown] = useState(() => getAppSnapshot().progress?.stars !== undefined);
    // зачем: помним, ЧЕЙ баланс сейчас на экране, чтобы отличить смену аккаунта
    // (обнулять обязательно) от инициализации того же аккаунта на старте (нельзя).
    const runesOwnerRef = useRef<string | null>(captureAccountGeneration().stableId?.trim() || null);
    // зачем (координатор 15.10, «Обучение» 0 при Главной 53): что плашка монет Главной показывает сейчас и знает ли баланс — одна строка на смену
    useEffect(() => {
        const t = captureAccountGeneration();
        console.log('[COIN-PILL]', JSON.stringify({ screen: 'home', source: 'snapshot', shown: runesKnown ? runesBalance : '—', value: runesBalance, hydrated: runesKnown, hasAccount: Boolean(t.stableId?.trim()), generation: t.generation })); // зачем (координатор 15.10): без идентификатора аккаунта — журнал может уйти в отчёты // guard-ok: временная трассировка
    }, [runesBalance, runesKnown]);
    const reconcileHomeRunes = useCallback((token = captureAccountGeneration()) => {
        const stableId = token.stableId?.trim();
        if (!stableId || !isCurrentAccountGeneration(token, stableId)) {
            console.warn('[HOME-COINS] reconcile:skip', JSON.stringify({ hasStableId: !!stableId, phase: token.phase }));
            return;
        }
        void getRunesBalance().then(({ balance }) => {
            const current = mountedRef.current && isCurrentAccountGeneration(token, stableId);
            if (current) {
                setRunesBalance(balance);
                setRunesKnown(true);
            }
            console.log('[COIN-PILL]', JSON.stringify({ screen: 'home', source: 'wallet_cache', value: balance, applied: current, hasAccount: stableId.length > 0, generation: token.generation })); // guard-ok: временная трассировка расхождения плашек (координатор 15.10)
        }).catch((error: unknown) => {
            // Первый кадр уже взят из snapshot; durable-сверка может безопасно повториться на focus.
            console.warn('[HOME-COINS] reconcile:failed', error instanceof Error ? error.message : String(error));
        });
    }, []);
    useEffect(() => {
        const unsubscribeRunesSnapshot = subscribeAppSnapshot(() => {
            setRunesBalance(peekRunes());
            if (getAppSnapshot().progress?.stars !== undefined) setRunesKnown(true);
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
            if (ownerChanged) { setRunesBalance(0); setRunesKnown(getAppSnapshot().progress?.stars !== undefined); }
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
    // зачем (Ревизор 3.120): аватар 48 dp и значок 20 dp — копия 192² вместо исходника 768² (холодный старт Главной).
    const homeCoinRankSource = isValidCoinRank(myCoinRank) ? coinRankDisplaySource(myCoinRank, STORY_RING_SLOT) : null;

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
            // зачем (баг 01.10: чип «1 день» при серии 6): временная трассировка источника числа.
            console.log(`[STREAK] home:snapshot_apply source=${progress.source} snapshot=${progress.streak} prev=${streak}`);
            setStreak(progress.streak);
            setDisplayStreak((current) => progress.source === 'live' ? progress.streak : current || progress.streak);
        }
    }, [appSnapshot.profile, appSnapshot.progress, streak]);

    const streakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const eliteStatusEntrance = useRef(new Animated.Value(1)).current;
    const eliteQuickTileEntrance = useRef(Array.from({ length: 3 }, () => new Animated.Value(1))).current;
    const eliteActivityTileEntrance = useRef(Array.from({ length: 3 }, () => new Animated.Value(1))).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const diagChecked = true;
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
    // зачем (аудит R58 #6, координатор 15.10): эффект ниже с [] и отложенные таймеры звали loadData ПЕРВОГО рендера — со старыми
    // studyTarget/lang/isPremium: после покупки Plus и возврата из фона «Продолжить» откатывалась на урок 3, всплывал лишний
    // автопейвол. Последняя версия функции живёт в ref (присваивается каждый рендер ниже, после объявления loadData).
    const loadDataRef = useRef<(() => Promise<void>) | null>(null);
    useEffect(() => {
        mountedRef.current = true;
        perfScreenMount('home');
        const requestHomeDataRefresh = () => {
            if (!homeRuntimeActiveRef.current) {
                homeDataDirtyRef.current = true;
                return;
            }
            void loadDataRef.current?.();
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
                if (backgroundedAt == null)
                    backgroundedAt = Date.now();
                if (resumeTimer) {
                    clearTimeout(resumeTimer);
                    resumeTimer = null;
                }
                resumeTask?.cancel?.();
            }
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
            }).catch(noteSwallowedHandler('home:refreshWeekMarkers.readCurrentStreakWeekMarkers'));
        };
        const freezeUpdatedSub = onAppEvent('streak_freeze_updated', refreshWeekMarkers);
        // зачем (R36, Ревизор F02 15.10): после занятия число серии и точки недели на Главной ждали следующего loadData —
        // человек возвращался с итога урока и видел вчерашнюю серию. Сигнал «день засчитан» несёт новое число: ставим его
        // сразу (локально, без сети), точки недели перечитываем с диска (неактивная Главная — dirty-флаг).
        const dayCountedSub = onAppEvent('streak_day_counted', (payload) => {
            console.log(`[STREAK] home:day_counted ${JSON.stringify({ days: payload?.days ?? null, source: payload?.source ?? null, active: homeRuntimeActiveRef.current })}`); // guard-ok: одна строка на первое занятие дня
            if (!mountedRef.current || !payload) return;
            if (typeof payload.days === 'number' && payload.days >= 0) {
                setStreak(payload.days);
                setDisplayStreak(payload.days);
            }
            refreshWeekMarkers();
        });
        // зачем (координатор 12.10, план (а) п.5, СПЕРВА ЛОГИ): «серия и монеты не прыгают после восстановления».
        // Главная на конец восстановления не подписана — серия обновится только при следующем loadData. Лог: что лежит
        // после восстановления; сравнить с последней строкой «[STREAK] home:hydration … -> X» (то, что сейчас на экране).
        // зачем (координатор 12.10, этап 2 «ДА», Сверка streakJump: Главная держала «5 дней» при сохранённых 12): после
        // восстановления — один лёгкий requestHomeDataRefresh (loadData читает только диск, без сети). Дебаунс: событие
        // приходит пачкой; неактивная Главная просто взводит dirty-флаг и перечитает при возврате.
        let restoreRefreshTimer: ReturnType<typeof setTimeout> | null = null;
        const restoreJumpSub = onAppEvent('cloud_profile_hydrated', () => {
            if (restoreRefreshTimer) clearTimeout(restoreRefreshTimer);
            restoreRefreshTimer = setTimeout(() => {
                restoreRefreshTimer = null;
                if (!mountedRef.current) {
                    console.log('[HOME-RESTORE-JUMP] refresh: skipped reason=unmounted');
                    return;
                }
                console.log(`[HOME-RESTORE-JUMP] refresh: requested active=${String(homeRuntimeActiveRef.current)} → ${homeRuntimeActiveRef.current ? 'loadData сейчас' : 'dirty, перечитаем при возврате'}`);
                requestHomeDataRefresh();
            }, HOME_RESTORE_REFRESH_DEBOUNCE_MS);
            const memoryStreak = getPersonalProgressSnapshot().streakCount;
            const snapshot = getAppSnapshot().progress;
            void hydratePersonalProgress().then((fresh) => {
                console.log('[HOME-RESTORE-JUMP]', JSON.stringify({
                    memoryStreak,
                    storedStreak: fresh.streakCount,
                    snapshotStreak: snapshot?.streak ?? null,
                    snapshotSource: snapshot?.source ?? null,
                    runes: peekRunes(),
                    homeActive: homeRuntimeActiveRef.current,
                    willReload: `debounced_refresh_${HOME_RESTORE_REFRESH_DEBOUNCE_MS}ms`,
                }));
            }).catch((error: unknown) => console.warn('[HOME-RESTORE-JUMP] чтение прогресса не удалось', error instanceof Error ? error.message : String(error)));
        });
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
            freezeUpdatedSub.remove();
            dayCountedSub.remove();
            restoreJumpSub.remove();
            if (restoreRefreshTimer) clearTimeout(restoreRefreshTimer);
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
            .catch((error: unknown) => {
                // зачем (правило «немой catch запрещён»): отсюда же поднимается флаг онбординга, от которого зависит
                // homeRuntimeActive, — сбой чтения обязан оставлять причину. Поведение прежнее: подсказки считаются загруженными.
                noteSwallowedHandler('home:featureTips.multiGet')(error);
                if (cancelled) return;
                setHomeFeatureTipsHydrated(true);
            });
        return () => {
            cancelled = true;
        };
    }, [homeFeatureTips.length]);
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
        ]), { iterations: 3 }); /* зачем (владелец 01.10): анимации на Главной короткие — 3 раза и покой */
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
            // зачем (координатор, [PERF-STEPS] home:loadData 3,9 с на прогретой сборке: parallel6 1,1 с → avatar →
            // titles+achievements+greeting 1,0 с → lessons — всё строго по очереди): независимые чтения стартуют СРАЗУ,
            // параллельно с первым блоком; ждём их там же, где раньше, — порядок обновления экрана прежний.
            // Отказ раннего чтения не теряется: тот же промис ждётся ниже и бросает в общий catch, лог — сразу.
            const helpfulReportsPromise = AsyncStorage.multiGet([HELPFUL_REPORTS_CONFIRMED_KEY]);
            helpfulReportsPromise.catch(noteSwallowedHandler('home:loadData.prestart_helpful'));
            const achievementStatesPromise = import('../achievements').then((m) => m.loadAchievementStates()).catch(noteSwallowedAs('home:loadData.loadAchievementStates', []));
            const pool = HOME_GREETING_POOLS[lang] ?? HOME_GREETING_POOLS.ru;
            const greetingPromise = pool.length > 0 ? resolveDailyGreeting(pool, lang) : null;
            greetingPromise?.catch(noteSwallowedHandler('home:loadData.prestart_greeting'));
            // зачем (координатор 11.10, «сперва логи»): parallel6 стоил 2,8–27,9 с, а пять чтений внутри мерились одним
            // числом. Каждая часть отмечает своё время — видно, какая держит первый кадр данных Главной.
            const partsStartedAt = Date.now();
            const partsGcAt = gcSnapshot();
            const parts: Record<string, number> = {};
            const timed = <T,>(label: string, promise: Promise<T>): Promise<T> => promise.then(
              (value) => { parts[label] = Date.now() - partsStartedAt; return value; },
              (error: unknown) => { parts[`${label}:failed`] = Date.now() - partsStartedAt; throw error; },
            );
            const [homeStoragePairs, currentWeekMarkers, weekPts, premiumSignalPairs, personalProgress] = await Promise.all([
                timed('home_keys', AsyncStorage.multiGet([
                    'user_name',
                    'week_days_done',
                    HOME_SELECTED_TITLE_KEY,
                    'streak_last_shown',
                    HOME_WEEK_DOT_ANIMATION_KEY,
                    // зачем: рамка аватара читалась отдельным походом в хранилище после блока — теперь вместе с ним.
                    'user_frame',
                ])),
                timed('streak_week_markers', readCurrentStreakWeekMarkers()),
                Promise.resolve(0),
                timed('premium_active', AsyncStorage.multiGet(['premium_active'])),
                // зачем (немой catch запрещён): сбой гидрации прогресса пишет причину; значение — прежний снимок.
                timed('personal_progress', hydratePersonalProgress().catch((error: unknown) => {
                    noteSwallowedHandler('home:loadData.hydratePersonalProgress')(error);
                    return getPersonalProgressSnapshot();
                })),
            ]);
            console.log('[HOME-LOADDATA-PARTS] parallel6', JSON.stringify({ totalMs: Date.now() - partsStartedAt, parts, gc: gcDelta(partsGcAt, gcSnapshot()) }));
            step('parallel6');
            const homeStorage = new Map(homeStoragePairs);
            const name = homeStorage.get('user_name') ?? null;
            const streakVal = String(personalProgress.streakCount);
            const weekData = homeStorage.get('week_days_done') ?? null;
            const storedTitleKey = homeStorage.get(HOME_SELECTED_TITLE_KEY) ?? null;
            const lastStreakShownRaw = homeStorage.get('streak_last_shown') ?? null;
            const lastWeekDotAnimationRaw = homeStorage.get(HOME_WEEK_DOT_ANIMATION_KEY) ?? null;
            const premiumSignals = new Map(premiumSignalPairs);
            homeSilentRetryRef.current = 0;
            setWeekMarkers(currentWeekMarkers);
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
            console.log(`[STREAK] home:hydration personal=${personalProgress.streakCount} snapshot=${String(sharedSnapshotAtHydration.progress?.streak)}@${String(sharedSnapshotAtHydration.progress?.source)} streakVal=${String(streakVal)} -> ${currentStreakNum}`);
            if (streakVal !== null || sharedSnapshotAtHydration.progress?.source === 'live')
                setStreak(currentStreakNum);
            const lastStreakShown = parseInt(lastStreakShownRaw || '0') || 0;
            if (currentStreakNum > 0 && currentStreakNum !== lastStreakShown) {
                // зачем ([PERF-STEPS]): метка «серию уже показали» — запись для следующего захода, ждать её незачем.
                void AsyncStorage.setItem('streak_last_shown', String(currentStreakNum)).catch(noteSwallowedHandler('home:loadData.streakLastShown'));
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
                    // зачем (PM-289, D70): начисление жемчуга за серию 7/30 удалено вместе с жемчугом.
                }
                else {
                    setDisplayStreak(currentStreakNum);
                }
            }
            else {
                setDisplayStreak(currentStreakNum);
            }
            step('streak');
            const savedFrSnap = homeStorage.get('user_frame') ?? null;
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
                catch (error) {
                    // зачем (немой catch запрещён): битая запись недели — причина в журнале, точки недели пустые, как раньше.
                    noteSwallowedHandler('home:loadData.weekDoneParse')(error);
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
            const specialTitleStorage = new Map(await helpfulReportsPromise);
            const helpfulReportsRaw = specialTitleStorage.get(HELPFUL_REPORTS_CONFIRMED_KEY) ?? null;
            // зачем (координатор: холодный старт 30 с, queue_wait 22 с у ACH-CHECK): чтение достижений стоит в ОБЩЕЙ
            // очереди проверок аккаунта (enqueueAchievementOperation) — Главная ждала её до 22 с, прежде чем посчитать
            // уроки. Титулы из достижений подставляются, когда очередь дойдёт; уроки, серия и приветствие её не ждут.
            const achievementsQueuedAt = Date.now();
            void achievementStatesPromise.then((achievementStates) => {
                const waitedMs = Date.now() - achievementsQueuedAt;
                if (waitedMs > 1_000) console.log('[HOME-COLD] achievements:late', JSON.stringify({ waitedMs, states: achievementStates.length })); // guard-ok: диагностика очереди достижений
                if (!mountedRef.current || !isCurrentAccountGeneration(homeHydrationAccount)) return;
                setSpecialTitleStats({
                    helpfulReportsConfirmed: parseStoredCount(helpfulReportsRaw),
                    earnedAchievementIds: new Set(achievementStates.filter((state) => state.unlockedAt !== null).map((state) => state.id)),
                });
            });
            if (greetingPromise) {
                const phrase = await greetingPromise;
                if (mountedRef.current)
                    setGreeting(phrase);
            }
            let done = 0;
            const lastOpenedKey = lastOpenedLessonKey(studyTarget);
            const lessonKeys = Array.from({ length: 32 }, (_, i) => lessonProgressKey(i + 1, studyTarget));
            step('titles+achievements+greeting');
            step('titles+achievements');
            const lessonsReadStartedAt = Date.now();
            const lessonsReadGcAt = gcSnapshot();
            const lessonEntriesWithLastOpened = await AsyncStorage.multiGet([...lessonKeys, lastOpenedKey]);
            console.log('[HOME-LOADDATA-PARTS] lessons_read', JSON.stringify({ ms: Date.now() - lessonsReadStartedAt, keys: lessonKeys.length + 1, gc: gcDelta(lessonsReadGcAt, gcSnapshot()) }));
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
                    const unlockStartedAt = Date.now();
                    const { resolveLastAvailableLessonId } = await import('../lesson_lock_system');
                    lastId = await resolveLastAvailableLessonId(lastId, studyTarget, isPremium);
                    console.log('[HOME-LOADDATA-PARTS] unlock_loop', JSON.stringify({ ms: Date.now() - unlockStartedAt, lastId }));
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
                    // зачем (Сверка 06:01, пустая карточка урока на холодном старте): когда карточка получила данные и
                    // что было на первом кадре — данных в памяти процесса не было, пришли из loadData.
                    console.warn('[HOME-COLD] lesson_card:late', JSON.stringify({ source: 'loadData', lastId, atEpochMs: Date.now() })); // guard-ok: временная трассировка холодного старта (сравнивать с [HOME-RENDER] committedEpochMs; ссылаться на переменные модуля тут нельзя — блок loadData исполняет сторож home_lesson_progress_single_pass)
                    animateNextLayoutTransition();
                }
                setLastLesson({ id: lastId, name: lessonNames[lastId - 1], progress: correct, score: scoreStr });
                setContinueResolved(true);
            }
            else if (mountedRef.current) {
                // Урока нет — заготовка уходит плавно, а не рывком.
                if (!continueResolvedRef.current) {
                    if (__DEV__) console.log('[HOME-FIRST-FRAME] continue_card:none — заготовка снята');
                    console.warn('[HOME-COLD] lesson_card:none', JSON.stringify({ lastId: lastId ?? null, atEpochMs: Date.now() })); // guard-ok: временная трассировка холодного старта
                    animateNextLayoutTransition();
                }
                setLastLesson(null);
                setContinueResolved(true);
            }
            // Крупная карта «Рівень / Ланцюжок»: не ждём лігу, медалі и ошибки — щоб не ловити вічний спінер.
            step('lessons+unlockLoop');
            rememberHomeScreenHydration({
                userName: hydratedName,
                streak: currentStreakNum,
                displayStreak: currentStreakNum,
                weekDone: weekParsedForSnap,
                weekMarkers: currentWeekMarkers,
                weekPoints: weekPts,
                lessonsCompleted: done,
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
                    studyTarget: String(studyTarget ?? 'en'),
                    // зачем (владелец, 2026-08-24): «цифра рун постоянно прыгает».
                    // Гидратация Главной собирает progress ЗАНОВО и раньше роняла
                    // stars — счётчик рун падал в ноль до следующей публикации
                    // проекции. Руны сюда не приходят, переносим текущее значение.
                    // зачем (эмулятор 01.10, лог [HOME-COINS]): неизвестные монеты — undefined, не 0; иначе Главная 22 с показывала «0».
                    stars: currentSnapshot.progress?.stars,
                    starsEarnedTotal: currentSnapshot.progress?.starsEarnedTotal,
                },
            }));
            if (mountedRef.current)
                markHomeStatsReady();
            // зачем (D107): карточка «Почини цепочку» удалена — серию спасает только заморозка Plus.
            // Месячный Plus-лимит заморозок остаётся без старого bootstrap бонусов.
            void applyMonthlyPremiumFreezeAllowance().catch(noteSwallowedHandler('home:loadData.applyMonthlyPremiumFreezeAllowance'));
            // [STREAK PAYWALL / FREEZE] Проверяем угрозу цепочке для всех пользователей.
            // Для не-премиум — показываем paywall (один раз в день).
            // Для премиум — показываем кнопку заморозки.
            const { willLose, streakBefore } = await checkStreakLossPending();
            // зачем (Q91, координатор 01.10): щит заморозки с Главной удалён (вход в заморозку — экран streak_stats);
            // здесь остался только paywall для не-Plus. Логика заморозки и месячный лимит Plus не тронуты (D107).
            if (willLose) {
                if (!hasPremiumAccess) {
                    const today = getLocalDayKey();
                    const shownToday = await AsyncStorage.getItem('streak_paywall_shown');
                    if (shownToday !== today) {
                        if (overlayActiveKeyRef.current !== null) {
                            pendingStreakPaywallRef.current = { streak: streakBefore, day: today };
                            DebugLogger.info('[PAYWALL-AUTO]', `слот окон занят (${String(overlayActiveKeyRef.current)}) — пейвол откладываем до освобождения, серия=${streakBefore}`);
                        } else {
                            await pushStreakPaywall(streakBefore, today);
                        }
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
            // ПЕРВАЯ загрузка упала (кэша нет) — тихий повтор в фоне; кэш есть — молча остаёмся на нём.
            if (mountedRef.current && !homeStatsLoadedOnce) {
                if (homeSilentRetryRef.current < 5) {
                    homeSilentRetryRef.current += 1;
                    console.warn('[HOME] first load failed, silent retry', { attempt: homeSilentRetryRef.current });
                    setTimeout(() => { if (mountedRef.current) void loadDataRef.current?.(); }, 20_000);
                } else {
                    console.warn('[HOME] first load failed, silent retries exhausted', { attempts: homeSilentRetryRef.current });
                }
            }
        }
        finally {
            endPerf();
            // Раскладка по шагам печатается в finally — она нужна и когда загрузка
            // упала на середине: видно, на каком именно шаге оборвалось.
            step.end();
            homeStatsLoadedOnce = true;
            if (mountedRef.current)
                markHomeStatsReady();
            // Загрузка закончилась (или упала) — заготовке карточки «Продолжить» больше нечего ждать.
            if (mountedRef.current && !continueResolvedRef.current) {
                if (__DEV__) console.log('[HOME-FIRST-FRAME] continue_card:resolved_in_finally');
                animateNextLayoutTransition();
                setContinueResolved(true);
            }
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
                            void loadDataRef.current?.();
                        else if (mountedRef.current)
                            homeDataDirtyRef.current = true;
                    });
                }, 120);
            }
        }
    };
    loadDataRef.current = loadData;
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
            return;
        }
        if (streakMarkersDirtyRef.current) {
            streakMarkersDirtyRef.current = false;
            void readCurrentStreakWeekMarkers().then((markers) => {
                if (homeRuntimeActiveRef.current) setWeekMarkers(markers);
                else streakMarkersDirtyRef.current = true;
            }).catch(noteSwallowedHandler('home:useEffect.readCurrentStreakWeekMarkers'));
        }
    }, [focusTick, homeRuntimeActive]);
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
        // зачем (координатор 12.10, аудит Optimistic UI): прямой router.push не защищён от двойного тапа — экран открывался дважды; nav.push (useGuardedNav) пропускает повтор в окне 600 мс.
        nav.push(path as any);
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
    if (!diagChecked)
        return <ScreenGradient><View /></ScreenGradient>;
    // ── Новый стиль главного экрана ──────────────────────────────────────────
    const renderNewHome = () => {
        const lastLessonImage = getHomeLastLessonImage(themeMode);
        // зачем: имя урока раньше «запекалось» в состояние lastLesson при монтировании
        // и после смены языка интерфейса оставалось на старом языке (укр. экран —
        // русское название). Резолвим по текущему lang в рендере, как lessons.tsx.
        const lastLessonName = lastLesson == null
            ? ''
            : (lessonNamesForStudyTarget(lang, studyTarget)[lastLesson.id - 1] ?? lastLesson.name);
        // зачем (владелец 04.10): «Продолжить обучение» = последний открытый урок, ошибки — только в «Сегодня».
        // D129: без курса для языка плашку урока не рисуем.
        // зачем (P23): карточка V2 появляется сразу с верными числами — пока прогресс курса читается, стоит та же заглушка, что при загрузке
        const priorityCardVisible = (continueV2 ? continueV2Progress !== null : lastLesson !== null) && homeLearnVisible;
        const continueCardPending = (!continueResolved || continueV2 !== null) && homeLearnVisible && !priorityCardVisible;
        const priorityCardTitle = continueV2 ? homeContinueV2Title(lang, continueV2.lessonOrdinal, continueV2.sessionOrdinal) : lastLessonName;
        // зачем (ассеты 2.0, 04.10): реестр отдаёт новый предмет, а пока его нет — прежнюю картинку этого места.
        // Владелец 04.10 про today.webp: «ЭТО ДЛЯ ПОСЛЕДНЕГО УРОКА» — блокнот с галочкой, когда последний урок пройден
        // (тот же порог 45 верных, что у счётчика пройденных уроков выше); урок в процессе — блокнот с ручкой (continue).
        const lastLessonCompleted = continueV2Progress ? continueV2Progress.total > 0 && continueV2Progress.done >= continueV2Progress.total : (lastLesson?.progress ?? 0) >= 45;
        // зачем (координатор 15.10): основа и слой .accent плитки — из ОДНОГО resolveThemedArt (кэш реестра), второго разрешения нет
        const tileArt = (name: Parameters<typeof resolveThemedArt>[0], fallback: number) => { const r = resolveThemedArt(name, homeArtTone); return { art: (r.base ?? fallback) as number, artAccent: r.accent }; };
        const priorityCardArt = resolveThemedArt(lastLessonCompleted ? 'today' : 'continue', homeArtTone);
        const priorityCardImage = priorityCardArt.base ?? lastLessonImage;
        // зачем (слово владельца 17.10): у диалога и набора карточек на карточке «последнее место» арт их плитки (тот же resolveThemedArt, что у плиток ниже)
        const continuePlaceArt = continuePlace === null ? null : continueChoice.kind === 'dialog'
            ? tileArt('dialogs', require('../../assets/images/v2/chat_bubbles.png'))
            : tileArt('cards', require('../../assets/images/v2/notecard_stack.png'));
        const continuePlaceTitle = continuePlace ? continuePlace.title : homeContinueStartTitle(lang);
        /**
         * Единственный вход в «Мои ошибки» с Главной.
         *
         * зачем: раньше защита жила в кнопке-пилюле у «Сегодня». Кнопки больше
         * нет; 04.10 карточка «Продолжить» перестала вести в ошибки (владелец) — вход здесь для плитки, значит
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
        // Плитка «Уроки» — push-презентация, вкладка «Обучение» — retained-tab; обе открывают карту V2 (новые уроки).
        // зачем (владелец 17.10: «Обучение открывает новые уроки»): раньше плитка вела в старый список /lessons_list. Он остался только при рубильнике «V2 скрыт»
        // (маршрут курса в этом случае уводит на Главную) и как выход из старых уроков; без выпущенных занятий маршрут курса сам открывает старый список.
        // Продолжение последнего урока остаётся на отдельной плашке ниже.
        // Плитка «Диалоги» самодостаточна и озвучивается своим label.
        const quickItems = [
            {
                key: 'lesson',
                iconKey: 'lesson' as const,
                testID: 'home-quick-lesson',
                label: triLang(lang, {
                    ru: 'Уроки', uk: 'Уроки', en: 'Lessons', es: 'Lecciones', 'pt-BR': 'Lições',
                    vi: 'Bài học', id: 'Pelajaran', tr: 'Dersler', pl: 'Lekcje',
                }),
                onPress: () => { go(isLearningV2Hidden() ? '/lessons_list' : '/learning-v2/course'); },
            },
            {
                key: 'dialogs',
                iconKey: 'dialogs' as const,
                testID: 'home-quick-dialogs',
                label: triLang(lang, {
                    ru: 'Диалоги', uk: 'Діалоги', en: 'Dialogues', es: 'Diálogos', 'pt-BR': 'Diálogos',
                    vi: 'Hội thoại', id: 'Dialog', tr: 'Diyaloglar', pl: 'Dialogi',
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
                label: s.tabs.flashcards,
                onPress: () => { go('/flashcards'); },
            },
        ];
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
        openHomeProfileRef.current = openHomeProfile;
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
        const homeV2StreakPendingA11y = triLang(lang, { ru: 'Сегодня день ещё не засчитан — заверши любое упражнение.', uk: 'Сьогодні день ще не зараховано — заверши будь-яку вправу.', en: 'Today hasn’t counted yet — finish any exercise.', es: 'Hoy aún no cuenta: termina cualquier ejercicio.', 'pt-BR': 'Hoje ainda não contou — termine qualquer exercício.', vi: 'Hôm nay chưa được tính — hãy hoàn thành một bài tập.', id: 'Hari ini belum dihitung — selesaikan latihan apa pun.', tr: 'Bugün henüz sayılmadı — herhangi bir alıştırmayı bitir.', pl: 'Dziś dzień jeszcze się nie liczy — ukończ dowolne ćwiczenie.' });
        const homeV2StreakWord = triLang(lang, { ru: 'Серия', uk: 'Серія', en: 'Streak', es: 'Racha', 'pt-BR': 'Sequência', vi: 'Chuỗi', id: 'Runtunan', tr: 'Seri', pl: 'Seria' });
        // зачем D129/D130: плитка показывается, только если её раздел готов для языка обучения.
        const homeV2AllTiles: HomeFeatureTile[] = [
            {
                key: 'lessons',
                title: quickItems[0]!.label,
                subtitle: triLang(lang, { ru: 'Грамматика шаг за шагом', uk: 'Граматика крок за кроком', en: 'Grammar step by step', es: 'Gramática paso a paso', 'pt-BR': 'Gramática passo a passo', vi: 'Ngữ pháp từng bước', id: 'Tata bahasa langkah demi langkah', tr: 'Adım adım dilbilgisi', pl: 'Gramatyka krok po kroku' }),
                onPress: quickItems[0]!.onPress,
                ...tileArt('lessons', require('../../assets/images/v2/book_stack.png')),
            },
            {
                key: 'dialogs',
                title: quickItems[1]!.label,
                subtitle: triLang(lang, { ru: 'Реальные ситуации', uk: 'Реальні ситуації', en: 'Real-life situations', es: 'Situaciones reales', 'pt-BR': 'Situações reais', vi: 'Tình huống thực tế', id: 'Situasi nyata', tr: 'Gerçek durumlar', pl: 'Prawdziwe sytuacje' }),
                onPress: quickItems[1]!.onPress,
                ...tileArt('dialogs', require('../../assets/images/v2/chat_bubbles.png')),
            },
            {
                key: 'cards',
                title: quickItems[2]!.label,
                subtitle: triLang(lang, { ru: 'Слова, фразы и выражения', uk: 'Слова, вислови й вирази', en: 'Words, phrases and idioms', es: 'Palabras, frases y expresiones', 'pt-BR': 'Palavras, frases e expressões', vi: 'Từ, cụm từ và thành ngữ', id: 'Kata, frasa, dan ungkapan', tr: 'Kelimeler, ifadeler, deyimler', pl: 'Słowa, zwroty i wyrażenia' }),
                onPress: quickItems[2]!.onPress,
                ...tileArt('cards', require('../../assets/images/v2/notecard_stack.png')),
            },
        ];
        const homeV2TileVisible: Record<string, boolean> = {
            lessons: homeLearnVisible,
            dialogs: homeDialoguesVisible,
            cards: homeFlashcardsVisible,
        };
        const homeV2BaseTiles = homeV2AllTiles.filter((tile) => homeV2TileVisible[tile.key] === true);
        // зачем (D143, владелец 01.10): ряд из трёх плиток утверждён и не меняется. Раздела у языка нет —
        // его место занимает другой готовый раздел в той же плитке: нет Уроков → «Шпиль» (es/de/fr);
        // итальянский → «Наборы из видео», «Мои ошибки», запасной «Сохранённые» (порядок приоритета).
        // Картинки временные — владелец пришлёт свои (D143).
        const homeV2FillerTiles: (HomeFeatureTile & { available: boolean })[] = [
            {
                key: 'spire',
                available: isLearningSurfaceReady(studyTarget, 'spire') && spireTabEnabled,
                title: triLang(lang, { ru: 'Пик', uk: 'Пік', en: 'Peak', es: 'Pico', 'pt-BR': 'Pico', vi: 'Đỉnh', id: 'Puncak', tr: 'Zirve', pl: 'Szczyt' }),
                subtitle: triLang(lang, { ru: 'Поднимайся выше всех', uk: 'Піднімайся вище за всіх', en: 'Climb above everyone', es: 'Sube más alto que nadie', 'pt-BR': 'Suba mais alto que todos', vi: 'Leo cao hơn mọi người', id: 'Naik lebih tinggi dari semua', tr: 'Herkesten yükseğe çık', pl: 'Wspinaj się najwyżej' }),
                onPress: () => { nav.push('/(tabs)/community?section=spire' as never); },
                // зачем (приказ владельца 15.10: «старые удалены»): вместо щита с Тауэрским мостом (1.0) — арт 2.0 «башня с флагом» (intro_arena, ASSETS_V2_BRIEF п.54), тёмный/светлый по тону Главной
                // зачем (координатор 15.10): порядок spire_tile (арт Codex, встанет сам после сдачи файла) → intro_arena → запасной
                ...tileArt(resolveThemedArt('spire_tile', homeArtTone).base ? 'spire_tile' : 'intro_arena', require('../../assets/images/v2/cards_hub_saved.webp')),
            },
            {
                key: 'video_packs',
                available: isLearningSurfaceReady(studyTarget, 'videos') && homeFlashcardsVisible,
                title: triLang(lang, { ru: 'Наборы из видео', uk: 'Набори з відео', en: 'Video packs', es: 'Packs de vídeos', 'pt-BR': 'Pacotes de vídeos', vi: 'Bộ từ video', id: 'Paket video', tr: 'Video paketleri', pl: 'Zestawy z filmów' }),
                subtitle: triLang(lang, { ru: 'Фразы из роликов', uk: 'Вислови з роликів', en: 'Phrases from videos', es: 'Frases de vídeos', 'pt-BR': 'Frases dos vídeos', vi: 'Cụm từ từ video', id: 'Frasa dari video', tr: 'Videolardan ifadeler', pl: 'Zwroty z filmów' }),
                onPress: () => { nav.push('/flashcards_video_packs' as never); },
                ...tileArt('cards_from_video', require('../../assets/images/v2/spiral_notepad.png')), // зачем: новый арт Codex встаёт сам, нынешняя картинка — запасная
            },
            {
                key: 'mistakes',
                available: homeMistakesButtonState(mistakeActiveCount) === 'ready',
                title: triLang(lang, { ru: 'Мои ошибки', uk: 'Мої помилки', en: 'My mistakes', es: 'Mis errores', 'pt-BR': 'Meus erros', vi: 'Lỗi của tôi', id: 'Kesalahanku', tr: 'Hatalarım', pl: 'Moje błędy' }),
                subtitle: triLang(lang, { ru: 'Разбор и повтор', uk: 'Розбір і повтор', en: 'Review and retry', es: 'Repasa y repite', 'pt-BR': 'Revise e repita', vi: 'Xem lại và làm lại', id: 'Tinjau dan ulangi', tr: 'Gözden geçir, tekrarla', pl: 'Przegląd i powtórka' }),
                // зачем: единая точка входа в «Мои ошибки» (лог + аналитика) — карточка «Продолжить» больше не ведёт в ошибки.
                onPress: () => { openHomeMistakesHub('home_tile'); },
                ...tileArt('mistakes_entry', require('../../assets/images/v2/notecard_stack.png')), // зачем (координатор 15.10): арт 2.0 в обеих яркостях вместо home_mistakes 1.0
            },
            {
                key: 'saved',
                available: homeFlashcardsVisible,
                title: triLang(lang, { ru: 'Сохранённые', uk: 'Збережені', en: 'Saved', es: 'Guardados', 'pt-BR': 'Salvos', vi: 'Đã lưu', id: 'Tersimpan', tr: 'Kaydedilenler', pl: 'Zapisane' }),
                subtitle: triLang(lang, { ru: 'Твои карточки', uk: 'Твої картки', en: 'Your cards', es: 'Tus tarjetas', 'pt-BR': 'Seus cartões', vi: 'Thẻ của bạn', id: 'Kartumu', tr: 'Kartların', pl: 'Twoje karty' }),
                onPress: () => { nav.push({ pathname: '/flashcards_collection', params: { cat: 'saved', from: 'home' } } as never); },
                ...tileArt('cards_empty_saved', require('../../assets/images/v2/cards_hub_saved.webp')), // зачем: новый арт Codex встаёт сам, нынешняя картинка — запасная
            },
        ];
        // зачем (владелец 17.10: «На Главной должен быть Пик тоже — кнопка-иконка… 4: Уроки, Диалоги, Карточки и Пик»; эталон #four-tiles вариант (а)):
        // все три раздела есть и Пик открыт для языка → четвёртая плитка «Пик»; иначе прежний ряд из трёх (D143). Без сети: только флаги готовности.
        const homeV2SpireTile = homeV2FillerTiles[0]!;
        const homeV2WithSpire = homeV2BaseTiles.length === 3 && homeV2SpireTile.available;
        const homeV2Tiles: HomeFeatureTile[] = homeV2WithSpire
            ? [...homeV2BaseTiles, (({ available: _available, ...tile }) => tile)(homeV2SpireTile)]
            : homeV2BaseTiles.length >= 3 || homeV2BaseTiles.length === 0
            ? homeV2BaseTiles
            : [...homeV2BaseTiles, ...homeV2FillerTiles.filter((tile) => tile.available).map(({ available: _available, ...tile }) => tile)].slice(0, 3);
        const homeV2TilesReason = homeV2WithSpire ? 'four:all_sections_and_spire'
            : homeV2BaseTiles.length === 3 ? `three:spire_off(surface=${isLearningSurfaceReady(studyTarget, 'spire')},tab=${spireTabEnabled})`
            : `fill:base=${homeV2BaseTiles.map((tile) => tile.key).join('+') || 'none'}`;
        // зачем (владелец 22.10, scenes-compact в.2; снимок Сверки home3): ряд плиток со «Сценой» — Уроки, Карточки, Диалоги, Пик (порядок макета); без «Сцены» порядок прежний
        const homeV2TileOrder = ['lessons', 'cards', 'dialogs', 'spire'];
        const homeV2TilesInOrder: HomeFeatureTile[] = HOME_SCENE_V2_ENABLED
            ? [...homeV2Tiles].sort((a, b) => (homeV2TileOrder.indexOf(a.key) + 1 || 99) - (homeV2TileOrder.indexOf(b.key) + 1 || 99))
            : homeV2Tiles;
        // зачем D129: задания только из разделов, видимых для языка обучения
        // (хук уже строит набор из доступных типов; фильтр — страховка при смене языка днём).
        // Подпись урока — название последнего урока, как было в заглушке.
        const homeV2Tasks = filterTodayTasksForTarget(
          todayTasks.tasks.map((task) => (task.kind === 'lesson' && lastLesson ? { ...task, subtitle: lastLessonName } : task)),
          studyTarget,
        );
        // зачем (владелец 22.10, scenes-compact в.2; снимок Сверки home3): со «Сценой» в карточке «Сегодня» три строки без «Посмотреть видео»; анкета — 4-й строкой только при активной кампании из админки (Poll V2 на Главной не показываем)
        const homeTodayCardTasks = HOME_SCENE_V2_ENABLED ? homeV2Tasks.filter((task) => task.kind !== 'video') : homeV2Tasks;
        const homeTodayTitle = triLang(lang, { ru: 'Сегодня', uk: 'Сьогодні', en: 'Today', es: 'Hoy', 'pt-BR': 'Hoje', vi: 'Hôm nay', id: 'Hari ini', tr: 'Bugün', pl: 'Dziś' });
        const homeV2CoinsLabel = triLang(lang, { ru: 'Монеты', uk: 'Монети', en: 'Coins', es: 'Monedas', 'pt-BR': 'Moedas', vi: 'Xu', id: 'Koin', tr: 'Jeton', pl: 'Monety' });
        const homeV2Palette = getV2Palette(t, themeMode);
        // зачем (Главная A «Сцена»): тот же переход «Продолжить», что у карточки, — одной функцией для карточки и сцены (не две копии логики)
        const openHomeContinuePriority = () => {
          if (continueV2) {
            // зачем (P23): тап ведёт в то же занятие V2 тем же маршрутом, что вкладка «Уроки» (без одноразовой подготовки — экран занятия готовит сам)
            console.log('[HOME-CONTINUE] open', JSON.stringify({ kind: 'v2', sessionId: continueV2.sessionId, done: continueV2Progress?.done ?? null, total: continueV2Progress?.total ?? null }));
            // зачем (R09): тот же запуск, что на вкладке «Уроки» — подготовка и передача «готово» плееру, иначе в релизе карта
            void launchHomeContinueV2(continueV2.route, { lang, studyTarget: String(studyTarget), push: (href) => nav.push(href as never) });
            return;
          }
          if (!lastLesson) {
            console.warn('[HOME-CONTINUE] press:ignored', JSON.stringify({ reason: 'no_last_lesson' })); // guard-ok: ранний выход логирует причину
            return;
          }
          console.log('[HOME-CONTINUE] open', JSON.stringify({ lessonId: lastLesson.id, progress: lastLesson.progress ?? 0 }));
          logFeatureOpened('lesson_menu');
          trackFeatureOpened('lesson_menu').catch((error: unknown) => {
            if (__DEV__) console.warn('[HOME-NAV] track_feature_failed', error instanceof Error ? error.message : String(error)); // guard-ok
          });
          perfNavStart('lesson_menu');
          // зачем (аудит Optimistic UI): тот же гвард двойного тапа, что у плиток (раньше «Продолжить» открывал меню урока дважды при быстром втором тапе).
          nav.push({ pathname: '/lesson_menu', params: { id: String(lastLesson.id) } } as never);
        };
        const openHomeContinuePlace = () => {
          if (continuePlace) {
            // зачем: тап — сразу в то место; маршрут ведёт на экран-вход раздела со своими проверками доступа (диалог — брифинг, карточки — настройка тренировки с проверкой квоты)
            console.log('[HOME-CONTINUE] open', JSON.stringify({ kind: continueChoice.kind, id: continuePlace.id, pathname: continuePlace.route.pathname }));
            nav.push({ pathname: continuePlace.route.pathname, params: continuePlace.route.params } as never);
            return;
          }
          // зачем: меток нет вовсе — «Начать урок 1» ведёт в новые уроки (карта V2); при рубильнике «V2 скрыт» — в меню урока 1 старого курса
          console.log('[HOME-CONTINUE] open', JSON.stringify({ kind: 'start_lesson_1', v2Hidden: isLearningV2Hidden() }));
          if (isLearningV2Hidden()) {
            nav.push({ pathname: '/lesson_menu', params: { id: '1' } } as never);
            return;
          }
          go('/learning-v2/course');
        };
        const renderHomeV2Header = (tone: 'default' | 'scene', surface?: string) => (
              <HomeBellStateContext.Provider value={homeBellState}>
              <HomeV2Header
                tone={tone}
                // зачем (координатор 22.10: кольцо Plus на Главной — в эталоне A): свой статус Plus, вводный доступ кольца не даёт (как useIsPlus)
                avatarPlus={tone === 'scene' ? { plus: isPremium || isVip || isPro, surface: surface ?? homeV2Palette.bg } : undefined}
                refreshing={cloudProfileRefreshing}
                // зачем (координатор 18.10, [HOME-CHILD-COST]): активность и счётчик фокусов уходят колокольчику через контекст (HomeBellStateContext, провайдер ниже) — элемент не меняется, шапка не перерисовывается на возврате
                bellSlot={<NotificationCenterButton />}
                // зачем (D192, владелец 14.10): кнопка аватара переехала в StoryAvatarSlot без изменений вида; при stories_v1 выкл или без событий это ровно прежняя кнопка профиля, с событиями — кольцо сторис и просмотр
                avatarSlot={(
                  <StoryAvatarSlot
                    lang={lang}
                    coinRank={isValidCoinRank(myCoinRank) ? myCoinRank : null}
                    coinSource={homeCoinRankSource}
                    placeholderColor={t.bgSurface2}
                    onOpenProfile={stableOpenHomeProfile}
                    profileLabel={triLang(lang, { ru: 'Мой профиль', uk: 'Мій профіль', en: 'My profile', es: 'Mi perfil', 'pt-BR': 'Meu perfil', vi: 'Hồ sơ của tôi', id: 'Profil saya', tr: 'Profilim', pl: 'Mój profil' })}
                  />
                )}
                stats={[
                  {
                    testID: 'home-v2-streak',
                    // зачем (§137): пока за сегодня ничего не сделано — контурный огонь; после первого упражнения дня — обычный огонь (сигнал streak_day_counted).
                    // зачем: 22.10 владелец — без текста «Сегодня ещё нет», огонёк пустой/зажжён; подпись всегда «Серия», «ещё не сегодня» остаётся только для незрячих (accessibilityLabel).
                    icon: <Ionicons name={streakToday === 'pending' ? 'flame-outline' : 'flame'} size={20} color={homeV2Palette.iconTint} />,
                    value: homeV2DaysLabel,
                    label: homeV2StreakWord,
                    accessibilityLabel: streakToday === 'pending' ? `${homeV2StreakWord}: ${homeV2DaysLabel}. ${homeV2StreakPendingA11y}` : `${homeV2StreakWord}: ${homeV2DaysLabel}`,
                    onPress: () => { nav.push('/streak_stats'); },
                  },
                  {
                    testID: 'home-v2-coins',
                    icon: homeCoinRankSource ? (
                      <Image source={homeCoinRankSource} style={{ width: 20, height: 20 }} contentFit="contain" />
                    ) : (
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: t.bgSurface2 }} />
                    ),
                    value: runesKnown ? String(runesBalance) : '—',
                    label: homeV2CoinsLabel,
                    accessibilityLabel: `${homeV2CoinsLabel}: ${runesKnown ? runesBalance : '—'}`,
                    onPress: () => { nav.push('/coin_rank'); },
                    // зачем (эталон «Сцены»: «монеты | ⚡ энергия» в одной плашке): энергия — свой крошечный подписчик, шапку не перерисовывает
                    trailing: tone === 'scene' ? <HomeSceneEnergy /> : undefined,
                  },
                ]}
              />
              </HomeBellStateContext.Provider>
        );
        // зачем (владелец 21.10 ~23:40, эталон home-new-concepts.html раздел A): «Сцена» — те же данные, что у шапки и «Продолжить»; новых чтений нет
        const homeSceneOnPlace = continuePlace !== null || continueStart;
        const homeSceneLessonNo = continueV2 ? continueV2.lessonOrdinal : lastLesson ? lastLesson.id : continueStart ? 1 : null;
        const renderHomeScene = () => (
          <HomeScene
            lang={lang}
            header={(surface) => renderHomeV2Header('scene', surface)}
            artTone={homeArtTone}
            accent={homeV2Palette.accent}
            streakDays={displayStreak}
            streakToday={streakToday}
            plus={hasPremiumAccess}
            energy={energyPeekNow ? energyPeekNow.energy : null}
            hasProgress={continueStart ? false : continueResolved ? true : null}
            place={{
              badge: continuePlace ? homeContinuePlaceBadge(lang, continueChoice.kind === 'dialog' ? 'dialog' : 'cards')
                : homeSceneLessonNo !== null ? triLang(lang, { ru: `Урок ${homeSceneLessonNo}`, uk: `Урок ${homeSceneLessonNo}`, en: `Lesson ${homeSceneLessonNo}`, es: `Lección ${homeSceneLessonNo}`, 'pt-BR': `Lição ${homeSceneLessonNo}`, vi: `Bài ${homeSceneLessonNo}`, id: `Pelajaran ${homeSceneLessonNo}`, tr: `Ders ${homeSceneLessonNo}`, pl: `Lekcja ${homeSceneLessonNo}` }) : null,
              episode: continueV2 && !homeSceneOnPlace ? continueV2.sessionOrdinal : null,
              title: homeSceneOnPlace ? continuePlaceTitle : priorityCardTitle,
              done: homeSceneOnPlace ? null : continueV2 && continueV2Progress ? continueV2Progress.done : lastLesson ? Math.max(0, Math.min(50, lastLesson.progress ?? 0)) : null,
              total: homeSceneOnPlace ? null : continueV2 && continueV2Progress ? Math.max(1, continueV2Progress.total) : lastLesson ? 50 : null,
              theoryLessonId: continueV2 && !homeSceneOnPlace ? continueV2.lessonOrdinal : null,
            }}
            courseProgress={continueV2Progress}
            pending={!homeSceneOnPlace && !priorityCardVisible && continueCardPending}
            busy={continueV2 !== null && continueV2Launching}
            active={homeRuntimeActive}
            onContinue={homeSceneOnPlace ? openHomeContinuePlace : openHomeContinuePriority}
            onChip={(kind) => {
              if (kind === 'words') { console.warn('[HOME-SCENE] chip:ignored', JSON.stringify({ kind, reason: 'dictionary_not_connected' })); return; } // guard-ok: ранний выход называет причину
              if (kind === 'theory') {
                const lessonId = continueV2 ? continueV2.lessonOrdinal : null;
                if (lessonId === null) { console.warn('[HOME-SCENE] chip:ignored', JSON.stringify({ kind, reason: 'no_v2_lesson' })); return; } // guard-ok: ранний выход называет причину
                nav.push({ pathname: '/lesson_theory_v2', params: { id: String(lessonId) } } as never);
                return;
              }
              if (kind === 'cards' || kind === 'review') { quickItems[2]!.onPress(); return; }
              if (kind === 'video') { go('/(tabs)/video'); return; }
              // «Фраза дня» — та же карточка ниже на Главной: прокрутка к ней
              const phraseTop = dailyPhraseLayoutRef.current.top;
              if (phraseTop <= 0) { console.warn('[HOME-SCENE] chip:ignored', JSON.stringify({ kind, reason: 'phrase_card_not_laid_out' })); return; } // guard-ok
              homeScrollRef.current?.scrollTo({ y: Math.max(0, phraseTop - 12), animated: true });
            }}
          />
        );
        const renderHomeV2 = () => (
          <BouncyScrollView ref={homeScrollRef} scrollEnabled={pageScrollEnabled} showsVerticalScrollIndicator={false} decelerationRate="fast" onScrollWorklet={homeScrollWorklet} onScrollBeginDrag={() => { homeDraggedAfterLangRef.current = true; noteScrollDrag('home', true); }} onContentSizeChange={(_w: number, h: number) => { noteScrollContentHeight('home', h); correctHomeScrollAfterLang('content_height'); }} onScrollEndDrag={handleHomeScrollSettled} onMomentumScrollEnd={handleHomeScrollSettled} onLayout={(event: LayoutChangeEvent) => {
            homeViewportHeightRef.current = event.nativeEvent.layout.height;
            refreshDailyPhraseVisibility();
          }} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: tabContentBottomPad, paddingHorizontal: V2.homePad, gap: V2.gap }}>
            {HOME_SCENE_V2_ENABLED ? renderHomeScene() : (
            <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
              {renderHomeV2Header('default')}
            </View>
            )}
            {/* зачем (Главная A «Сцена»): со сценой место продолжения показывает сцена — прежние карточки, пока HOME_SCENE_V2_ENABLED выключен (релиз до показа владельцу) */}
            {HOME_SCENE_V2_ENABLED ? null : (<>
            {/* зачем (слово владельца 17.10): диалог / набор карточек / «Начать урок 1» рисует блок ниже; прежняя карточка урока и V2 со своей заготовкой — без изменений */}
            {continuePlace === null && !continueStart ? (
            <>
            {priorityCardVisible || continueCardPending ? (
              <HomeV2ContinueCard
                pending={!priorityCardVisible && continueCardPending}
                busy={continueV2 !== null && continueV2Launching}
                title={priorityCardTitle}
                done={continueV2 && continueV2Progress ? Math.max(0, Math.min(continueV2Progress.total, continueV2Progress.done)) : Math.max(0, Math.min(50, lastLesson?.progress ?? 0))}
                total={continueV2 && continueV2Progress ? Math.max(1, continueV2Progress.total) : 50}
                art={priorityCardImage}
                artAccent={priorityCardArt.accent}
                artWide={!lastLessonCompleted}
                badge={continueV2 ? triLang(lang, { ru: `Урок ${continueV2.lessonOrdinal}`, uk: `Урок ${continueV2.lessonOrdinal}`, en: `Lesson ${continueV2.lessonOrdinal}`, es: `Lección ${continueV2.lessonOrdinal}`, 'pt-BR': `Lição ${continueV2.lessonOrdinal}`, vi: `Bài ${continueV2.lessonOrdinal}`, id: `Pelajaran ${continueV2.lessonOrdinal}`, tr: `Ders ${continueV2.lessonOrdinal}`, pl: `Lekcja ${continueV2.lessonOrdinal}` }) : lastLesson ? triLang(lang, { ru: `Урок ${lastLesson.id}`, uk: `Урок ${lastLesson.id}`, en: `Lesson ${lastLesson.id}`, es: `Lección ${lastLesson.id}`, 'pt-BR': `Lição ${lastLesson.id}`, vi: `Bài ${lastLesson.id}`, id: `Pelajaran ${lastLesson.id}`, tr: `Ders ${lastLesson.id}`, pl: `Lekcja ${lastLesson.id}` }) : undefined}
                accessibilityLabel={`${s.home.continueBtn}: ${priorityCardTitle}`}
                onPress={openHomeContinuePriority}
              />
            ) : null}
            </>
            ) : null}
            {continuePlace !== null || continueStart ? (
              <HomeV2ContinueCard
                title={continuePlaceTitle}
                done={0}
                total={1}
                hideProgress
                art={continuePlaceArt ? continuePlaceArt.art : priorityCardImage}
                artAccent={continuePlaceArt ? continuePlaceArt.artAccent : priorityCardArt.accent}
                artWide={false}
                badge={continuePlace ? homeContinuePlaceBadge(lang, continueChoice.kind === 'dialog' ? 'dialog' : 'cards') : undefined}
                accessibilityLabel={`${s.home.continueBtn}: ${continuePlaceTitle}`}
                onPress={openHomeContinuePlace}
              />
            ) : null}
            </>)}
            {/* зачем (владелец 22.10, вариант 2: «нет блока видео, иконки Уроки, Карточки — без скролла, и внизу под блоком Сегодня»): со «Сценой»
                плитки идут под «Сегодня» одним рядом (ниже), ленты видео на Главной нет; без «Сцены» — прежний порядок */}
            {HOME_SCENE_V2_ENABLED ? null : (
            <View style={{ gap: 4 }}>
              {homeV2Tiles.length > 0 ? <HomeV2FeatureTiles tiles={homeV2Tiles} reason={`${homeV2TilesReason};lang=${studyTarget}`} spireLang={String(studyTarget)} uiLang={lang} /> : null}
              {isVideoButtonEnabled() && homeVideosVisible && !homeV2VideoNoChannel && !homeVideoLang.hidden ? (
                <HomeV2VideoRail
                  videos={homeV2Videos}
                  status={homeV2VideoStatus}
                  ownerActive={homeRuntimeActive}
                />
              ) : null}
            </View>
            )}
            <HomeV2TodayCard
              title={HOME_SCENE_V2_ENABLED ? homeTodayTitle : homeTodayTitle.toUpperCase()}
              scene={HOME_SCENE_V2_ENABLED ? { count: todayOfLine(lang, homeTodayCardTasks.filter((task) => task.done).length, homeTodayCardTasks.length) } : null}
              tasks={homeTodayCardTasks}
              onOpenTask={(task) => go(task.route)}
              surveyRow={homeTodayRowSource === 'survey' && homeSurvey.row ? { ...homeSurvey.row, onPress: homeSurvey.openSurvey } : homeTodayRowSource === 'poll_v2' && !HOME_SCENE_V2_ENABLED ? {
                title: triLang(lang, { ru: 'Опрос', uk: 'Опитування', en: 'Poll', es: 'Encuesta', 'pt-BR': 'Enquete', vi: 'Khảo sát', id: 'Jajak pendapat', tr: 'Anket', pl: 'Ankieta' }),
                subtitle: triLang(lang, { ru: `${homePollV2.total} вопроса`, uk: `${homePollV2.total} питання`, en: `${homePollV2.total} questions`, es: `${homePollV2.total} preguntas`, 'pt-BR': `${homePollV2.total} perguntas`, vi: `${homePollV2.total} câu hỏi`, id: `${homePollV2.total} pertanyaan`, tr: `${homePollV2.total} soru`, pl: `${homePollV2.total} pytania` }),
                onPress: () => setHomePollV2Open(true),
              } : null}
              // зачем (владелец 17.10): кольца дня живут на экране «Сегодня» (/today_tasks); ссылку карточка показывает сама только за флагом moments_v3
              seeAll={{
                label: triLang(lang, { ru: 'Смотреть все', uk: 'Дивитися всі', en: 'See all', es: 'Ver todos', 'pt-BR': 'Ver todos', vi: 'Xem tất cả', id: 'Lihat semua', tr: 'Tümünü gör', pl: 'Zobacz wszystkie' }),
                onPress: () => {
                  console.log('[TODAY-RING] open', JSON.stringify({ from: 'home_see_all', tasks: homeV2Tasks.map((task) => `${task.kind}:${task.progress}/${task.target}`) })); // guard-ok: одна строка на тап
                  go('/today_tasks');
                },
              }}
            />
            {HOME_SCENE_V2_ENABLED && homeV2Tiles.length > 0 ? <HomeV2FeatureTiles tiles={homeV2TilesInOrder} reason={`${homeV2TilesReason};lang=${studyTarget};row`} spireLang={String(studyTarget)} uiLang={lang} row /> : null}
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
        // устаревшие социальные и экспериментальные блоки остаются вне Главной. Старая разметка V1
        // Старая разметка V1 и флаг раскладки удалены 01.10.
        return renderHomeV2();
    };
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
    // зачем ((в)): ПОСЛЕДНИЙ объявленный пассивный эффект Главной — к нему все её эффекты первого монтирования уже отработали.
    useEffect(() => { logHomeFirstMountEffectsTiming(); }, []);
    // зачем ([HOME-SETSTATE] 18.10): опрос, окно недели и «С возвращением» отдают НОВЫЙ объект на каждый рендер, и в журнале они значились «изменившимися» всегда — настоящую причину не было видно (14 из 23 рендеров окна). Теперь в снимке их значимые поля.
    // зачем (координатор 15.10, «перерисовки Главной»): [HOME-RENDERS] — сколько раз и ПОЧЕМУ рендерится Главная за 10 с после холодного старта и после возврата на вкладку (окно открывает смена homeRuntimeActive).
    // Перечислены состояния и контексты корня; рендер без изменений в списке пишется как parent_or_unlisted (родитель или хук, которого здесь нет). В релизе — пустая функция, снимок не строится.
    useRenderCause('home', () => ({
        t, f, themeMode, liquidGlassAppearance, myCoinRank, lang, studyTarget, streakToday, cloudProfileRefreshing, todayTasks, homeRuntimeActive, tabContentBottomPad, nav, router,
        cardsTileCenter, cardArrivals, dailyPhraseCardVisible, homeOnboardingDone, userName, streak, displayStreak, homeStatsReady, weekDone, weekDotAnimationToken, weekMarkers, weekPoints,
        lastLesson, continueResolved, mistakeAccountGeneration, mistakeReadySnapshot, homeV2Videos, homeV2VideoStatus, homeV2VideoNoChannel, homeFeatureTipsReplayCount, homeFeatureTipIndex,
        homeFeatureTipsDone, homeFeatureTipsHydrated, homeRailRetryTick, userAvatar, userFrame, homeProfilePlayer, profileIntroRequested, titleModalVisible, selectedTitleKey, specialTitleStats,
        celebrationVisible, celebrationMarker, celebrationVariant, vipCelebrationVisible, vipCelebrationMarker, lessonsCompleted, pageScrollEnabled, runesBalance, runesKnown, belowFoldReady,
        overlayActiveKey, rankEnoughVisible: rankEnough.visible, rankEnoughOffer: rankEnough.offer, rankEnoughClose: rankEnough.close,
        goToTab, activeIdx, runtimeOwnerId, focusTick, spireTabEnabled, homePollV2Phase: homePollV2.phase, homePollV2Open, homeSurveyOffered: homeSurvey.row !== null, homeSurveyLaunch: homeSurvey.launch,weekMomentVisible: weekMoment.visible, weekMomentDecision: weekMoment.decision, welcomeBackVisible: welcomeBack.visible, welcomeBackDecision: welcomeBack.decision, appSnapshot, isPremium, isVip, isPro, hasPremiumAccess,
        celebrationOverlayVisible, vipCelebrationOverlayVisible, shadowGlass, topFadeScroll, homeFeatureTips,
        // зачем ([HOME-SETSTATE] 18.10): значения, которых не было в снимке — «parent_or_unlisted» на возврате (~0,3 с и ~1,2 с) не имел названной причины; onOpenDevHub — признак «перерисовал родитель»
        continueMarks, continueV2Progress, continueV2Launching, devMistakesCardOverride, devMistakesCount, homeMotionReduceMotion, homePriorityCardReduceMotion, homeFeatureTipReduceMotion, onOpenDevHub,
    }), homeRuntimeActive, true);
    useHomeFocusCostEnd(homeFocusCost, 'home'); // зачем ([HOME-FOCUS-COST]): ПОСЛЕДНИЙ эффект корня — парой к useHomeFocusCostBegin
    return (<View testID="screen-home" style={{ flex: 1 }} onLayout={notifyFirstHomeFrameReady}>
      <ScreenGradient>
      <View style={{ flex: 1 }}>
      {renderNewHome()}

      </View>



      {/* зачем (PM-046, владелец): плашка «+1 СПИН» после повышения уровня
          удалена вместе с homeLevelUpSpinReceipt и её setTimeout — спин
          убран как механика, показывать было бы нечего. */}

      {/* Каждое ленивое окно — в своей границе Suspense: приостановка не поднимается выше и не гасит Главную. */}
      {profileModalMounted ? (<Suspense fallback={null}><PlayerProfileModal
        player={homeProfilePlayer}
        myInfo={{
            name: userName || 'Phraseman',
            avatar: userAvatar,
            frame: userFrame,
            streak,
        }}
        onClose={() => setHomeProfilePlayer(null)}
      /></Suspense>) : null}
      {profileIntroMounted ? (<Suspense fallback={null}><FeatureIntroEntry id="profile_card_first_visit" enabled={profileIntroEnabled} /></Suspense>) : null}

      {homeSurvey.launch ? (<Suspense fallback={null}>
        <SurveySheetModal
          visible
          launch={homeSurvey.launch}
          onClose={homeSurvey.closeSurvey}
          onDurablyReconciled={homeSurvey.onDurablyReconciled}
        />
      </Suspense>) : null}

      <HybridSheetShell
        visible={homePollV2Open}
        onClose={closeHomePollV2}
        closeLabel={triLang(lang, { ru: 'Закрыть опрос', uk: 'Закрити опитування', en: 'Close poll', es: 'Cerrar encuesta', 'pt-BR': 'Fechar enquete', vi: 'Đóng khảo sát', id: 'Tutup jajak pendapat', tr: 'Anketi kapat', pl: 'Zamknij ankietę' })}
        backdropAccessible={false}
        material="liquid-glass-opaque"
        sheetHeight="74%"
        testID="home-poll-v2-sheet"
      >
        <HomePollV2Card model={homePollV2} lang={lang} onFinished={closeHomePollV2} />
      </HybridSheetShell>

      <Modal visible={titleModalVisible} transparent animationType="fade" onRequestClose={() => setTitleModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.62)' /* theme-exempt: скрим затемнения под модалкой — одинаков в обоих оформлениях */, paddingHorizontal: 18 }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setTitleModalVisible(false)} />
          <View style={{ maxHeight: Math.min(SCREEN_H * 0.74, 620), width: '100%', maxWidth: 560, alignSelf: 'center' }}>
            <View style={{ borderRadius: 22, padding: 16, backgroundColor: t.bgCard, shadowColor: '#000' /* theme-exempt: тень карточки модалки */, shadowOpacity: 0.34, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, ...noAndroidOutline,}}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', lineHeight: f.h2 + 5 }} numberOfLines={1}>
                    {titleModalHeading}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                    {titleModalSubtitle}
                  </Text>
                </View>
                <TouchableOpacity activeOpacity={0.75} onPress={() => setTitleModalVisible(false)} accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? 'rgba(246,227,161,0.10)' : t.bgSurface2, boxShadow: nestedBoxShadow(shadowGlass) }}>
                  <Ionicons name="close" size={22} color={t.textPrimary}/>
                </TouchableOpacity>
              </View>

              <View style={{ borderRadius: 16, backgroundColor: isGoldTheme ? 'rgba(246,227,161,0.08)' : t.bgSurface2, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}>
                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }} numberOfLines={2}>
                  {titleModalEarnedLabel}
                </Text>
              </View>

              <ScrollView decelerationRate="fast" style={{ maxHeight: Math.min(SCREEN_H * 0.52, 430) }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 2 }}>
                {visibleTitles.map((item) => {
                    const titleColor = isLightTheme ? item.colorLight : item.colorDark;
                    return (<TouchableOpacity key={item.key} activeOpacity={0.84} onPress={() => selectHomeTitle(item)} accessibilityRole="button" accessibilityState={{ disabled: !item.unlocked, selected: item.current }} style={{ minHeight: 62, borderRadius: 15, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: item.current ? titleModalButtonBg : (isGoldTheme ? glassTone(t.textPrimary, 0.05) /* зачем (Темы, R1_LIGHT_THEME_LITERALS): белая дымка 4,5 % была невидима на светлом оформлении; дымка цвета ТЕКСТА темы светлеет в тёмной и темнеет в светлой */ : t.bgSurface), boxShadow: item.current ? raisedBoxShadow(shadowGlass) : plateBoxShadow(shadowGlass), transform: item.current ? [{ translateY: RAISED_LIFT }] : [] }}>
                        <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: titleColor + '20' }}>
                          <Ionicons name={item.current ? 'ribbon' : 'checkmark-circle'} size={20} color={titleColor}/>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text allowFontScaling={false} style={{ color: item.unlocked ? titleColor : t.accentText, fontSize: Math.max(15, f.body), fontWeight: '900', lineHeight: Math.max(15, f.body) + 5, letterSpacing: 0 }} numberOfLines={1} ellipsizeMode="tail">
                            {item.titleEN}
                          </Text>
                          <Text allowFontScaling={false} style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', lineHeight: f.caption + 4, marginTop: 1, letterSpacing: 0 }} numberOfLines={2}>
                            {item.subtitle}
                          </Text>
                        </View>
                        {item.current && (<View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: isLightTheme ? 'rgba(202,138,4,0.14)' : 'rgba(252,211,77,0.16)' }}>
                            <Text style={{ color: isLightTheme ? t.accentText : t.accentText, fontSize: f.caption, fontWeight: '900' }} numberOfLines={1}>
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
      {premiumCelebrationMounted ? (<Suspense fallback={null}><PremiumCelebrationModal visible={celebrationOverlayVisible} variant={celebrationVariant} onClose={() => {
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
        }}/></Suspense>) : null}
      {weekMoment.visible && weekMoment.decision ? (<Suspense fallback={null}><SpireWeekMomentHost lang={lang} decision={weekMoment.decision} coinRank={isValidCoinRank(myCoinRank) ? myCoinRank : null} onClose={weekMoment.close} onPlay={weekMomentPlay} onRemind={weekMoment.remind.available ? weekMoment.remind.schedule : undefined} /></Suspense>) : null}
      {welcomeBack.visible && welcomeBack.decision ? (
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={welcomeBack.close}>
          <SheetSwipeRoot>
            <Suspense fallback={null}>
              <WelcomeBackMoment
                lang={lang}
                coinRank={isValidCoinRank(myCoinRank) ? myCoinRank : null}
                decision={welcomeBack.decision}
                onCards={() => { welcomeBack.close(); nav.push({ pathname: '/flashcards_collection', params: { cat: 'saved', from: 'welcome_back' } } as never); }} /* зачем: тот же путь, что у плитки «Сохранённые» на Главной */
                onHome={welcomeBack.close}
              />
            </Suspense>
          </SheetSwipeRoot>
        </Modal>
      ) : null}
      <LegacyBonusWelcomeHost lang={lang} coinRank={isValidCoinRank(myCoinRank) ? myCoinRank : null} active={homeRuntimeActive} />
      {rankEnough.visible && rankEnough.offer ? (
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={rankEnough.close}>
          <SheetSwipeRoot>
            <Suspense fallback={null}>
              <CoinRankEnoughDialog
                lang={lang}
                coinRank={rankEnough.offer.rank}
                coins={rankEnough.offer.balance}
                onUpgrade={() => { rankEnough.close(); nav.push('/coin_rank'); }} /* зачем: покупка — на своём экране ранга (церемония чеканки), окно только сообщает */
                onLater={rankEnough.close}
              />
            </Suspense>
          </SheetSwipeRoot>
        </Modal>
      ) : null}
      {vipCelebrationMounted ? (<Suspense fallback={null}><VipCelebrationModal visible={vipCelebrationOverlayVisible} onClose={() => {
            setVipCelebrationVisible(false);
            const marker = vipCelebrationMarker;
            setVipCelebrationMarker(null);
            vipCelebrationQueuedMarkerRef.current = null;
            void consumeVipCelebration(marker);
        }}/></Suspense>) : null}
      {/* Приветствие-знакомство со спотлайт-подсветкой блоков — один раз при первом входе. */}
      {/* зачем (владелец 2026-09-21): шторка «тут пока нечего разбирать» убрана
          вместе с порогом открытия — хаб теперь открывается при любом числе
          ошибок. Оставлять её нельзя: она стала недостижимой, а мёртвый показ
          однажды всплыл бы не вовремя. Сам компонент в проекте сохранён. */}
      {/* Сохранённые карточки слетаются в плитку «Карточки». Оверлей поверх всего:
          места не занимает, поэтому первый кадр главной остаётся стабильным. */}
      {savedCardsFlightMounted ? (<Suspense fallback={null}><SavedCardsFlight
        count={cardArrivals}
        target={cardsTileCenter}
        origin={{ x: Dimensions.get('window').width / 2, y: Dimensions.get('window').height * 0.32 }}
        color={t.accentText}
        onDone={() => {
          const effect = cardArrivalEffectRef.current ?? 'flight';
          cardArrivalEffectRef.current = null;
          setCardArrivals(0);
          // Отмечаем показ только после анимации — иначе повторный вход
          // проиграет её заново или, наоборот, съест непоказанный прилёт.
          void markHomeArrivalPlayed(effect);
        }}
      /></Suspense>) : null}
    </View>);
}
