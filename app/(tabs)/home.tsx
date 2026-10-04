import React, { useState, useRef, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
// зачем: allowFontScaling={false} отключал системный размер шрифта — заголовки
// обрезались при крупном шрифте и на длинных языках. FlowText переносит.
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, Dimensions, Modal, AppState, DeviceEventEmitter, InteractionManager, Easing, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useGuardedNav } from '../../hooks/use-guarded-nav';
import { usePremium } from '../../components/PremiumContext';
import { useTabNav } from '../TabContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { isLearnTabVisibleForTarget, isLearningSurfaceReady } from '../learning_language_surface_readiness';
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
import PremiumCelebrationModal from '../../components/PremiumCelebrationModal';
import VipCelebrationModal from '../../components/VipCelebrationModal';
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
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { useDialogueV2Warmup } from '../../hooks/use_dialogue_v2_warmup';
import { coinRankRowForDisplay, isValidCoinRank } from '../coin_rank_table_v1';
import { loadAchievementStates } from '../achievements';
import DailyPhraseCard from '../../components/DailyPhraseCard';
import SurveySheetModal from '../../components/survey/SurveySheetModal';
import { useHomeSurveyEntry } from '../../hooks/use_home_survey_entry';
import { isDailyPhraseCardHalfVisible } from '../daily_phrase_pulse';
import { useOverlayVisible } from '../../components/OverlayArbiter';
import SavedCardsFlight from '../../components/SavedCardsFlight';
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
import { getPersonalProgressSnapshot, hydratePersonalProgress } from '../personal_progress_store';
// зачем (PM-052, D75, 02.10): сбор наград на Главной (очередь + частицы в счётчик) удалён —
// монеты летят там, где заработаны (CoinRewardFlight), без копилки «на потом».
import HomeV2Header from '../../components/home/v2/HomeV2Header';
import HomeV2ContinueCard from '../../components/home/v2/HomeV2ContinueCard';
import HomeV2FeatureTiles from '../../components/home/v2/HomeV2FeatureTiles';
import HomeV2VideoRail from '../../components/home/v2/HomeV2VideoRail';
import HomeV2TodayCard from '../../components/home/v2/HomeV2TodayCard';
import { resolveThemedArt } from '../theme/themed_art_registry';
import { useTodayTasks } from '../../hooks/use_today_tasks';
import type { HomeFeatureTile } from '../../components/home/v2/home_v2_types';
import { getV2Palette, V2 } from '../../constants/v2Style';
// зачем отдельное имя: в этом файле `Animated` — из react-native и им пользуются
// сотни мест. Пульс счётчиков живёт на Reanimated (UI-поток), поэтому его
// компонент импортируется как Reanimated, а не подменяет существующий.
import { runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';
import NotificationCenterButton from '../../components/NotificationCenterButton';
import PlayerProfileModal, { type PlayerInfo } from '../../components/PlayerProfileModal';
import FeatureIntroEntry from '../../components/feature_intro/FeatureIntroEntry';
import { logFeatureOpened } from '../firebase';
import { trackFeatureOpened } from '../user_stats';
import { perfMark, perfSteps, perfScreenMount, perfNavStart } from '../perf-monitor';
import { emitAppEvent, onAppEvent } from '../events';
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
import { getLingmanYoutubeSnapshot, type LingmanYoutubeVideo } from '../lingman_youtube';
import { isVideoButtonEnabled } from '../remote_flags';
import { prewarmMistakeHubAdvice } from '../mistake_hub_advice';
import { trackMistakePracticeEvent } from '../mistake_practice_analytics';
import {
    readCurrentStreakWeekMarkers,
    type StreakWeekDayMarkerKind,
} from '../streak_week_markers';
import { lessonNamesForStudyTarget } from '../lesson_titles_for_study_target';
import { lastOpenedLessonKey, lessonProgressKey } from '../target_storage_keys';
import { ENABLE_DEV_TOOLS } from '../config';
import { markHomeFirstPaint } from '../home_paint_marker';
import { peekStreakDayState, subscribeStreakDayState } from '../streak_day_signal';

// зачем (§137): строка, а не объект — peekStreakDayState при смене дня отдаёт новый объект, а
// useSyncExternalStore требует устойчивого снимка. null (сверки ещё не было) → 'unknown': молчим.
function streakTodaySnapshot(): 'unknown' | 'counted' | 'pending' {
  const state = peekStreakDayState();
  if (state === null) return 'unknown';
  return state.counted ? 'counted' : 'pending';
}
import { noteSwallowedAs, noteSwallowedHandler } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
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


export default function HomeScreen({ onOpenDevHub }: { onOpenDevHub?: () => void } = {}) {
  // зачем (владелец 2026-09-22, «удалить все замеры»): здесь в ТЕЛЕ компонента
  // стоял countScreenRender('home') — работа на КАЖДЫЙ рендер Главной. Тело
  // самого горячего экрана обязано быть чистым.
  const tabContentBottomPad = useTabContentBottomPad();
    const router = useRouter();
    // Навигация к отдельным экранам — через guard от двойного тапа (дубли в стеке).
    const nav = useGuardedNav();
    const { theme: t, f, themeMode, liquidGlassAppearance } = useTheme();
    // зачем (владелец 04.10, «первые ассеты готовы, вшивай»): предметы 2.0 — светлый комплект у светлых тем, тёмный у тёмных и градиентных.
    const homeArtTone = liquidGlassAppearance === 'light' ? 'light' : 'dark';
    const myCoinRank = useMyCoinRank();
    const { s, lang } = useLang();
    const { studyTarget } = useStudyTarget();
    // зачем (§137): «сегодня ещё не засчитано» на плашке серии — синхронно из сигнала Ядра, без чтений хранилища.
    const streakToday = useSyncExternalStore(subscribeStreakDayState, streakTodaySnapshot);
    // зачем (D49, PM-259): живые задания дня вместо заглушки — прогресс, done и монеты
    // считает modules/today-tasks; хук стоит до раннего return (правила хуков).
    const todayTasks = useTodayTasks(lang, studyTarget);
    // зачем D129/D130: какие разделы видны для языка обучения — только из таблицы
    // готовности. studyTarget синхронный (peek), поэтому первый кадр уже финальный.
    const homeLearnVisible = isLearnTabVisibleForTarget(studyTarget);
    const homeDialoguesVisible = isLearningSurfaceReady(studyTarget, 'dialogues');
    // зачем (владелец 01.10: диалоги «ДОЛЖНЫ» прогреваться): плитка «Диалоги» видна —
    // греем функции старта/хода после первого кадра, не чаще раза в 10 минут.
    useDialogueV2Warmup(homeDialoguesVisible, 'home_tile');
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
    const streakMarkersDirtyRef = useRef(false);
    useEffect(() => {
        homeRuntimeActiveRef.current = homeRuntimeActive;
    }, [homeRuntimeActive]);
    // зачем (Q90, координатор 01.10): опрос — строка в «Сегодня»; загрузка раз при входе с кэшем 6 ч,
    // шторка монтируется только пока открыта (hooks/use_home_survey_entry.ts). Прежняя цепочка на
    // каждый фокус Главной удалена.
    const homeSurvey = useHomeSurveyEntry(lang, homeRuntimeActive);
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
    const initialVisuals = resolveHomeProfileVisuals({ hydration: hh, snapshot: appSnapshot.profile });
    const [userName, setUserName] = useState(() => hh?.userName ?? snapshotName);
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
    /** DEV: вернуть настоящие данные — долгое нажатие по той же кнопке. */
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
                // зачем D130: язык с лентой из каталога берёт видео своего канала (эффект ниже),
                // английская RSS-лента для него только считает непросмотренные.
                if (homeVideoRailUsesCatalog(studyTarget)) return;
                setHomeV2Videos(snapshot.videos);
                setHomeV2VideoStatus(snapshot.error && snapshot.videos.length === 0 ? 'error' : 'ready');
            })
            .catch((error: unknown) => {
                console.warn('[HOME-VIDEO] snapshot:catch → 0', error instanceof Error ? error.message : String(error)); // guard-ok: лог в catch обязателен
                if (alive) {
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
    const homeCoinRankSource = isValidCoinRank(myCoinRank) ? coinRankRowForDisplay(myCoinRank).source : null;

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
            const [homeStoragePairs, currentWeekMarkers, weekPts, premiumSignalPairs, personalProgress] = await Promise.all([
                AsyncStorage.multiGet([
                    'user_name',
                    'week_days_done',
                    HOME_SELECTED_TITLE_KEY,
                    'streak_last_shown',
                    HOME_WEEK_DOT_ANIMATION_KEY,
                ]),
                readCurrentStreakWeekMarkers(),
                Promise.resolve(0),
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
                loadAchievementStates().catch(noteSwallowedAs('home:loadData.loadAchievementStates', [])),
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
                setContinueResolved(true);
            }
            else if (mountedRef.current) {
                // Урока нет — заготовка уходит плавно, а не рывком.
                if (!continueResolvedRef.current) {
                    if (__DEV__) console.log('[HOME-FIRST-FRAME] continue_card:none — заготовка снята');
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
            // ПЕРВАЯ загрузка упала (кэша нет) — тихий повтор в фоне; кэш есть — молча остаёмся на нём.
            if (mountedRef.current && !homeStatsLoadedOnce) {
                if (homeSilentRetryRef.current < 5) {
                    homeSilentRetryRef.current += 1;
                    console.warn('[HOME] first load failed, silent retry', { attempt: homeSilentRetryRef.current });
                    setTimeout(() => { if (mountedRef.current) void loadData(); }, 20_000);
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
        const continueCardPending = !continueResolved && homeLearnVisible && !priorityCardVisible;
        const priorityCardTitle = priorityCardShowsMistakes
            ? triLang(lang, {
                ru: 'Мои ошибки', uk: 'Мої помилки', en: 'My mistakes', es: 'Mis errores',
                'pt-BR': 'Meus erros', vi: 'Lỗi của tôi', id: 'Kesalahan saya',
                tr: 'Hatalarım', pl: 'Moje błędy',
            })
            : lastLessonName;
        // зачем (ассеты 2.0, 04.10): реестр отдаёт новый предмет, а пока его нет — прежнюю картинку этого места.
        const priorityCardImage = priorityCardShowsMistakes
            ? (resolveThemedArt('mistakes_entry', homeArtTone).base ?? getHomeMistakesImage(themeMode))
            : (resolveThemedArt('continue', homeArtTone).base ?? lastLessonImage);
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
        const homeV2StreakPendingWord = triLang(lang, { ru: 'Сегодня ещё нет', uk: 'Сьогодні ще ні', en: 'Not yet today', es: 'Hoy aún no', 'pt-BR': 'Hoje ainda não', vi: 'Hôm nay chưa có', id: 'Hari ini belum', tr: 'Bugün henüz yok', pl: 'Dziś jeszcze nie' });
        const homeV2StreakPendingA11y = triLang(lang, { ru: 'Сегодня день ещё не засчитан — заверши любое упражнение.', uk: 'Сьогодні день ще не зараховано — заверши будь-яку вправу.', en: 'Today hasn’t counted yet — finish any exercise.', es: 'Hoy aún no cuenta: termina cualquier ejercicio.', 'pt-BR': 'Hoje ainda não contou — termine qualquer exercício.', vi: 'Hôm nay chưa được tính — hãy hoàn thành một bài tập.', id: 'Hari ini belum dihitung — selesaikan latihan apa pun.', tr: 'Bugün henüz sayılmadı — herhangi bir alıştırmayı bitir.', pl: 'Dziś dzień jeszcze się nie liczy — ukończ dowolne ćwiczenie.' });
        const homeV2StreakWord = triLang(lang, { ru: 'Серия', uk: 'Серія', en: 'Streak', es: 'Racha', 'pt-BR': 'Sequência', vi: 'Chuỗi', id: 'Runtunan', tr: 'Seri', pl: 'Seria' });
        // зачем D129/D130: плитка показывается, только если её раздел готов для языка обучения.
        const homeV2AllTiles: HomeFeatureTile[] = [
            {
                key: 'lessons',
                title: quickItems[0]!.label,
                subtitle: triLang(lang, { ru: 'Грамматика шаг за шагом', uk: 'Граматика крок за кроком', en: 'Grammar step by step', es: 'Gramática paso a paso', 'pt-BR': 'Gramática passo a passo', vi: 'Ngữ pháp từng bước', id: 'Tata bahasa langkah demi langkah', tr: 'Adım adım dilbilgisi', pl: 'Gramatyka krok po kroku' }),
                onPress: quickItems[0]!.onPress,
                art: resolveThemedArt('lessons', homeArtTone).base ?? require('../../assets/images/v2/book_stack.png'),
            },
            {
                key: 'dialogs',
                title: quickItems[1]!.label,
                subtitle: triLang(lang, { ru: 'Реальные ситуации', uk: 'Реальні ситуації', en: 'Real-life situations', es: 'Situaciones reales', 'pt-BR': 'Situações reais', vi: 'Tình huống thực tế', id: 'Situasi nyata', tr: 'Gerçek durumlar', pl: 'Prawdziwe sytuacje' }),
                onPress: quickItems[1]!.onPress,
                art: resolveThemedArt('dialogs', homeArtTone).base ?? require('../../assets/images/v2/chat_bubbles.png'),
            },
            {
                key: 'cards',
                title: quickItems[2]!.label,
                subtitle: triLang(lang, { ru: 'Слова, фразы и выражения', uk: 'Слова, фрази й вирази', en: 'Words, phrases and idioms', es: 'Palabras, frases y expresiones', 'pt-BR': 'Palavras, frases e expressões', vi: 'Từ, cụm từ và thành ngữ', id: 'Kata, frasa, dan ungkapan', tr: 'Kelimeler, ifadeler, deyimler', pl: 'Słowa, zwroty i wyrażenia' }),
                onPress: quickItems[2]!.onPress,
                art: resolveThemedArt('cards', homeArtTone).base ?? require('../../assets/images/v2/notecard_stack.png'),
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
                available: isLearningSurfaceReady(studyTarget, 'spire'),
                title: triLang(lang, { ru: 'Шпиль', uk: 'Шпиль', en: 'Spire', es: 'Aguja', 'pt-BR': 'Torre', vi: 'Ngọn tháp', id: 'Menara', tr: 'Kule', pl: 'Iglica' }),
                subtitle: triLang(lang, { ru: 'Поднимайся выше всех', uk: 'Піднімайся вище за всіх', en: 'Climb above everyone', es: 'Sube más alto que nadie', 'pt-BR': 'Suba mais alto que todos', vi: 'Leo cao hơn mọi người', id: 'Naik lebih tinggi dari semua', tr: 'Herkesten yükseğe çık', pl: 'Wspinaj się najwyżej' }),
                onPress: () => { nav.push('/(tabs)/community?section=spire' as never); },
                art: require('../../assets/images/home_menu/home-forest-league.webp'),
            },
            {
                key: 'video_packs',
                available: isLearningSurfaceReady(studyTarget, 'videos') && homeFlashcardsVisible,
                title: triLang(lang, { ru: 'Наборы из видео', uk: 'Набори з відео', en: 'Video packs', es: 'Packs de vídeos', 'pt-BR': 'Pacotes de vídeos', vi: 'Bộ từ video', id: 'Paket video', tr: 'Video paketleri', pl: 'Zestawy z filmów' }),
                subtitle: triLang(lang, { ru: 'Фразы из роликов', uk: 'Фрази з роликів', en: 'Phrases from videos', es: 'Frases de vídeos', 'pt-BR': 'Frases dos vídeos', vi: 'Cụm từ từ video', id: 'Frasa dari video', tr: 'Videolardan ifadeler', pl: 'Zwroty z filmów' }),
                onPress: () => { nav.push('/flashcards_video_packs' as never); },
                art: require('../../assets/images/v2/spiral_notepad.png'),
            },
            {
                key: 'mistakes',
                available: homeMistakesButtonState(mistakeActiveCount) === 'ready',
                title: triLang(lang, { ru: 'Мои ошибки', uk: 'Мої помилки', en: 'My mistakes', es: 'Mis errores', 'pt-BR': 'Meus erros', vi: 'Lỗi của tôi', id: 'Kesalahanku', tr: 'Hatalarım', pl: 'Moje błędy' }),
                subtitle: triLang(lang, { ru: 'Разбор и повтор', uk: 'Розбір і повтор', en: 'Review and retry', es: 'Repasa y repite', 'pt-BR': 'Revise e repita', vi: 'Xem lại và làm lại', id: 'Tinjau dan ulangi', tr: 'Gözden geçir, tekrarla', pl: 'Przegląd i powtórka' }),
                onPress: () => { nav.push('/mistakes_hub' as never); },
                art: require('../../assets/images/home_mistakes/home-mistakes-dark.webp'),
            },
            {
                key: 'saved',
                available: homeFlashcardsVisible,
                title: triLang(lang, { ru: 'Сохранённые', uk: 'Збережені', en: 'Saved', es: 'Guardados', 'pt-BR': 'Salvos', vi: 'Đã lưu', id: 'Tersimpan', tr: 'Kaydedilenler', pl: 'Zapisane' }),
                subtitle: triLang(lang, { ru: 'Твои карточки', uk: 'Твої картки', en: 'Your cards', es: 'Tus tarjetas', 'pt-BR': 'Seus cartões', vi: 'Thẻ của bạn', id: 'Kartumu', tr: 'Kartların', pl: 'Twoje karty' }),
                onPress: () => { nav.push({ pathname: '/flashcards_collection', params: { cat: 'saved', from: 'home' } } as never); },
                art: require('../../assets/images/v2/cards_hub_saved.webp'),
            },
        ];
        const homeV2Tiles: HomeFeatureTile[] = homeV2BaseTiles.length >= 3 || homeV2BaseTiles.length === 0
            ? homeV2BaseTiles
            : [...homeV2BaseTiles, ...homeV2FillerTiles.filter((tile) => tile.available).map(({ available: _available, ...tile }) => tile)].slice(0, 3);
        // зачем D129: задания только из разделов, видимых для языка обучения
        // (хук уже строит набор из доступных типов; фильтр — страховка при смене языка днём).
        // Подпись урока — название последнего урока, как было в заглушке.
        const homeV2Tasks = filterTodayTasksForTarget(
          todayTasks.tasks.map((task) => (task.kind === 'lesson' && lastLesson ? { ...task, subtitle: lastLessonName } : task)),
          studyTarget,
        );
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
                    // зачем (§137): пока за сегодня ничего не сделано — контурный огонь и «Сегодня ещё нет»;
                    // после первого упражнения дня — обычный огонь и «Серия» (сигнал streak_day_counted).
                    icon: <Ionicons name={streakToday === 'pending' ? 'flame-outline' : 'flame'} size={20} color={homeV2Palette.iconTint} />,
                    value: homeV2DaysLabel,
                    label: streakToday === 'pending' ? homeV2StreakPendingWord : homeV2StreakWord,
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
                  },
                ]}
              />
            </View>
            {priorityCardVisible || continueCardPending ? (
              <HomeV2ContinueCard
                pending={!priorityCardVisible && continueCardPending}
                overline={triLang(lang, { ru: 'Продолжить обучение', uk: 'Продовжити навчання', en: 'Continue learning', es: 'Seguir aprendiendo', 'pt-BR': 'Continuar aprendendo', vi: 'Tiếp tục học', id: 'Lanjutkan belajar', tr: 'Öğrenmeye devam et', pl: 'Kontynuuj naukę' }).toUpperCase()}
                title={priorityCardTitle}
                done={priorityCardShowsMistakes ? 0 : Math.max(0, Math.min(50, lastLesson?.progress ?? 0))}
                total={priorityCardShowsMistakes ? Math.max(1, mistakeActiveCount) : 50}
                art={priorityCardImage}
                artWide={!priorityCardShowsMistakes}
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
              surveyRow={homeSurvey.row ? { ...homeSurvey.row, onPress: homeSurvey.openSurvey } : null}
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
        // устаревшие социальные и экспериментальные блоки остаются вне Главной. Старая разметка V1
        // Старая разметка V1 и флаг раскладки удалены 01.10.
        return renderHomeV2();
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



      {/* зачем (PM-046, владелец): плашка «+1 СПИН» после повышения уровня
          удалена вместе с homeLevelUpSpinReceipt и её setTimeout — спин
          убран как механика, показывать было бы нечего. */}

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

      {homeSurvey.launch ? (
        <SurveySheetModal
          visible
          launch={homeSurvey.launch}
          onClose={homeSurvey.closeSurvey}
          onDurablyReconciled={homeSurvey.onDurablyReconciled}
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
