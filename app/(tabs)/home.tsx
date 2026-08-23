import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
// зачем: allowFontScaling={false} отключал системный размер шрифта — заголовки
// обрезались при крупном шрифте и на длинных языках. FlowText переносит.
import { FlowText } from '../../components/text-integrity';
import { getStreakFreezeCostShards } from '../remote_flags';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, Dimensions, Modal, AppState, DeviceEventEmitter, InteractionManager, Easing, Platform, type GestureResponderEvent, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewStyle, } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from '../../components/SafeLinearGradient';
import TapScale from '../../components/TapScale';
import { useRouter } from 'expo-router';
import { useGuardedNav } from '../../hooks/use-guarded-nav';
import { usePremium } from '../../components/PremiumContext';
import { useTabNav } from '../TabContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import ScreenGradient from '../../components/ScreenGradient';
import { glassFill } from '../../components/GlassSurface';
import BouncyScrollView from '../../components/BouncyScrollView';
import { useTopFadeScroll } from '../../components/TopFadeScrollContext';
import { checkLeagueOnAppOpen, clearPendingResult, loadPendingResult, LEAGUES, LeagueResult, GroupMember, clubTierShortName, getLeagueResultSignature, tryAcquireLeagueResultModal, markLeagueResultShown } from '../league_engine';
import LeagueResultModal from '../LeagueResultModal';
import { DebugLogger } from '../debug-logger';
import { getMyWeekPoints, checkStreakLossPending } from '../hall_of_fame_utils';
import { getLocalDayKey, getUtcDayKey, isSameLocalOrUtcDay } from '../local_date';
import { isRepairEligible, getRepairProgress } from '../streak_repair';
import { applyTodaysBoonsOnAppOpen } from '../boons/boon_bootstrap';
import { getReviveOffer, type StreakReviveOffer } from '../streak_revive';
import { enqueueThemedBlockingInfoAlert } from '../themed_blocking_alert_queue';
import StreakReviveModal from '../../components/StreakReviveModal';
import { consumeCelebration, getPendingCelebrationMarker, getPendingCelebrationVariant, isCelebrationPending, type PremiumCelebrationVariant, } from '../premium_celebration_state';
import { consumeVipCelebration, getPendingVipCelebrationMarker, isVipCelebrationPending } from '../vip_celebration_state';
import PremiumCelebrationModal from '../../components/PremiumCelebrationModal';
import VipCelebrationModal from '../../components/VipCelebrationModal';
import { getXPProgress, getLevelFromXP, getNextEnergyUnlockLevel, type ThemeMode } from '../../constants/theme';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../../constants/goldTheme';
import { OLIVE_GRADIENTS, OLIVE_RICH, oliveShadow } from '../../constants/oliveTheme';
import { configureAccordionLayout } from '../../constants/layoutAnimation';
import { MOTION_DURATION } from '../../constants/motion';
import { getLeagueBonusPalette } from '../../constants/leagueBonusPalette';
import { getLeagueBonusGiftImage } from '../../constants/leagueBonusGiftImages';
import { HELPFUL_REPORTS_CONFIRMED_KEY, SPECIAL_TITLES, TITLES, getEarnedSpecialTitles, getTitleString } from '../../constants/titles';
import { GREETINGS_ES } from '../../constants/greetings_es';
import { triLang, type Lang } from '../../constants/i18n';
import {
    buildHomeFeatureTips,
    clampHomeFeatureTipIndex,
    clampHomeFeatureTipReplayCount,
    HOME_FEATURE_TIPS_DONE_KEY,
    HOME_FEATURE_TIPS_INDEX_KEY,
    HOME_FEATURE_TIPS_REPLAY_COUNT_KEY,
    HOME_FEATURE_TIPS_RESET_EVENT,
} from '../home_feature_tips';
import { BRAND_SHARDS_ES } from '../../constants/terms_es';
import { hapticTap } from '../../hooks/use-haptics';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../../constants/avatars';
import AvatarView from '../../components/AvatarView';
import { isCustomAvatarValue } from '../../constants/custom_avatars';
import { checkAchievements, loadAchievementStates } from '../achievements';
import { USER_AVATAR_AURA_KEY, getEffectiveAvatarAuraId, normalizeAvatarAuraId } from '../../constants/avatar_auras';
import EnergyIcon from '../../components/EnergyIcon';
import { StreakChainIcon } from '../../components/StreakChainIcon';
import { loadAllMedals, countMedals } from '../medal_utils';
import { getCurrentMultiplier } from '../xp_manager';
import DailyPhraseCard from '../../components/DailyPhraseCard';
import SurveyTaskCard from '../../components/SurveyTaskCard';
import { isDailyPhraseCardHalfVisible } from '../daily_phrase_pulse';
import { fetchActiveSurveyWithRetry } from '../survey_client';
import { buildActiveSurveyOffer, type SurveyOfferSnapshot } from '../survey_offer_model';
import { primeSurvey } from '../survey_handoff';
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
import { computeAllPercentiles } from '../leaderboard_stats';
import { getShardsBalance, peekLastKnownShardsBalance, onStreakUpdated } from '../shards_system';
import { purchaseStreakFreeze } from '../streak_freeze_purchase';
import { coinIconForBalance } from '../coin_icons';
import { buildLastLessonFromHydration, patchHomeScreenHydration, peekHomeScreenHydration, rememberHomeScreenHydration, resolveHomeProfileVisuals, shouldApplyHomeSnapshotToStats } from '../home_screen_hydration';
import { captureAccountGeneration } from '../account_generation';
import { patchAppSnapshot, resolveHydratedProfileName, useAppSnapshotSelector } from '../app_snapshot_store';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import LingmanVideosButton from '../../components/LingmanVideosButton';
import HomeYoutubeFeatureCard from '../../components/home/HomeYoutubeFeatureCard';
import NotificationCenterButton from '../../components/NotificationCenterButton';
import PlayerProfileModal, { type PlayerInfo } from '../../components/PlayerProfileModal';
import { getForegroundUsageMs } from '../foreground_usage_ms';
import { logFeatureOpened } from '../firebase';
import { trackFeatureOpened } from '../user_stats';
import { perfMark, perfScreenMount, perfNavStart } from '../perf-monitor';
import { emitAppEvent, onAppEvent } from '../events';
import { soundDirector } from '../../modules/audio/sound_director';
import { ensureAnonUser } from '../cloud_sync';
import { FOREGROUND_CLOUD_REFRESH_DELAY_MS, FOREGROUND_LIGHT_REFRESH_DELAY_MS, getForegroundRefreshKind } from '../app_resume_policy';
import { fetchActiveLeagueCrowns, fetchLeagueBonusProgressSnapshot, getLeagueChestGoal } from '../services/league_chest_rewards';
import { getCachedLeagueStateSync } from '../league_open_cache_policy';
import { getHomeMenuImages } from '../home_menu_icons';
import { getHomeLastLessonImage } from '../home_last_lesson_assets';
import { isStreakFreezeActiveToday } from '../streak_freeze';
import { isStudyTargetSourceUiLang } from '../study_target_lang_dev';
import {
    addDaysToDateKey,
    readCurrentStreakWeekMarkers,
    recordStreakWeekMarker,
    type StreakWeekDayMarkerKind,
} from '../streak_week_markers';
import { lessonNamesForStudyTarget } from '../lesson_titles_for_study_target';
import { lastOpenedLessonKey, lessonProgressKey } from '../target_storage_keys';
import { getStreakFireIconVariant, getStreakFreezeIconVariant } from '../../constants/streakIconAssets';
import { themedToastChrome } from '../../constants/themedToastChrome';
import { themedWeekDot } from '../../constants/weekDotTheme';
import { noAndroidOutline } from '../../constants/androidGlow';
import { ENABLE_DEV_TOOLS } from '../config';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
/** Ширина всплывающей подсказки энергии (clamp по экрану, стрелка привязана к иконкам). */
const ENERGY_TOOLTIP_W = 220;
const CONTENT_W = Math.min(SCREEN_W, 640);
// Rollback: set false to return to the previous elite home status card.
// Android Fabric/Yoga can abort when NativeAnimated mutates Home view props during startup.
const HOME_ANIMATION_USE_NATIVE_DRIVER = true;
const HOME_SELECTED_TITLE_KEY = 'home_selected_title_key_v1';
const STREAK_WEEK_FREEZE_ICE = require('../../assets/images/streak_overlays/streak-freeze-ice.webp');
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
const HOME_STATS_CARD_MIN_HEIGHT = 196;
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
    es: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
    'pt-BR': ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    vi: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    id: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    tr: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
    pl: ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'],
};
const HOME_DAILY_GREETING_KEY = 'home_daily_greeting_v1';
const STATS_PULSE_HINT_DONE_KEY = 'phraseman_home_stats_pulse_hint_done_v1';
const STATS_PULSE_MIN_USAGE_MS = 3 * 60 * 60 * 1000;
const STATS_PULSE_RECHECK_MIN_MS = 30_000;
const HOME_ONBOARDING_DONE_KEY = 'onboarding_done';
// Контент карточек-подсказок и ключи хранения — app/home_feature_tips.ts
// (общие с settings.tsx; повторные показы переключают юмористические наборы).
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
type EnergyTooltipAnchor = {
    x: number;
    y: number;
    w: number;
    h: number;
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
    kind: 'level' | 'special';
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
    catch { /* ignore */ }
    const idx = Math.floor(Math.random() * pool.length);
    try {
        await AsyncStorage.setItem(HOME_DAILY_GREETING_KEY, JSON.stringify({ day: today, lang, idx } satisfies DailyGreetingStored));
    }
    catch { /* ignore */ }
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
type HomeMenuIconAlignKey = 'lesson' | 'cards' | 'league' | 'test' | 'practice' | 'dialogs';
const HOME_MENU_ICON_ALIGNMENT: Partial<Record<ThemeMode, Partial<Record<HomeMenuIconAlignKey, HomeMenuIconAlign>>>> = {
};
type LightSketchMenuImageProps = Omit<React.ComponentProps<typeof Image>, 'style'> & {
    width: number;
    height: number;
    lighten: boolean;
    align?: HomeMenuIconAlign;
};
type StableTouchableOpacityProps = Omit<PressableProps, 'style'> & {
    activeOpacity?: number;
    style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};
function TouchableOpacity({ activeOpacity = 0.2, disabled, style, ...props }: StableTouchableOpacityProps) {
    return (<Pressable
      {...props}
      disabled={disabled}
      style={(state) => [
          typeof style === 'function' ? style(state) : style,
          state.pressed && !disabled ? { opacity: activeOpacity } : null,
      ]}/>);
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
function buildHomeLeagueChest(group: GroupMember[], leagueName: string, leagueId: number, totalOverride?: number): {
    leagueName: string;
    progress: number;
    goal: number;
    myContribution: number;
    leaderName: string;
    leaderPoints: number;
} {
    const sorted = [...group].sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0));
    const goal = getLeagueChestGoal(leagueId);
    const total = sorted.reduce((sum, p) => sum + Math.max(0, Math.floor(Number(p.points) || 0)), 0);
    const leader = sorted[0];
    return {
        leagueName,
        progress: Math.min(goal, totalOverride == null ? total : Math.max(0, totalOverride)),
        goal,
        myContribution: Math.max(0, Math.floor(Number(sorted.find((p) => p.isMe)?.points) || 0)),
        leaderName: leader?.name || 'Player',
        leaderPoints: Math.max(0, Math.floor(Number(leader?.points) || 0)),
    };
}
// ── Титулы: кэш вне рендера ──────────────────────────────────────────────────
// Главная — самый часто перерисовываемый экран (энергия/XP/фокус). Раньше на
// КАЖДЫЙ рендер строились ~60 объектов титулов + локализация, хотя модалка
// титулов закрыта. Одноэлементный кэш по входам убирает эту работу; hook в
// середину 4000-строчного рендера ставить нельзя (порядок хуков).
type HomeTitlesArgs = {
    level: number;
    totalXP: number;
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
        args.level, args.totalXP, args.streak, args.helpfulReportsConfirmed,
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
        level: args.level,
        totalXP: args.totalXP,
        streak: args.streak,
        helpfulReportsConfirmed: args.helpfulReportsConfirmed,
        earnedAchievementIds: args.earnedAchievementIds as never,
    });
    const earnedSpecialTitleIds = new Set(earnedSpecialTitles.map((title) => title.id));
    const lang = args.lang;
    const level = args.level;
    const levelTitleRows: TitleModalRow[] = TITLES.map((item) => ({
        key: `level:${item.minLevel}-${item.maxLevel}`,
        titleEN: item.titleEN,
        subtitle: item.minLevel === item.maxLevel
            ? triLang(lang, {
                ru: `Уровень ${item.minLevel}`,
                uk: `Рівень ${item.minLevel}`,
                es: `Nivel ${item.minLevel}`,
                'pt-BR': `Nivel ${item.minLevel}`,
                vi: `Cap ${item.minLevel}`,
                id: `Level ${item.minLevel}`,
                tr: `Seviye ${item.minLevel}`,
                pl: `Poziom ${item.minLevel}`,
            })
            : triLang(lang, {
                ru: `Уровни ${item.minLevel}-${item.maxLevel}`,
                uk: `Рівні ${item.minLevel}-${item.maxLevel}`,
                es: `Niveles ${item.minLevel}-${item.maxLevel}`,
                'pt-BR': `Niveis ${item.minLevel}-${item.maxLevel}`,
                vi: `Cap ${item.minLevel}-${item.maxLevel}`,
                id: `Level ${item.minLevel}-${item.maxLevel}`,
                tr: `Seviye ${item.minLevel}-${item.maxLevel}`,
                pl: `Poziomy ${item.minLevel}-${item.maxLevel}`,
            }),
        colorLight: item.colorLight,
        colorDark: item.colorDark,
        unlocked: level >= item.minLevel,
        current: false,
        kind: 'level',
    }));
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
    const allTitleRows = [...levelTitleRows, ...specialTitleRows];
    const fallbackLevelTitle = TITLES.find((item) => level >= item.minLevel && level <= item.maxLevel) ?? (level < TITLES[0].minLevel ? TITLES[0] : TITLES[TITLES.length - 1]);
    const fallbackTitleKey = fallbackLevelTitle ? `level:${fallbackLevelTitle.minLevel}-${fallbackLevelTitle.maxLevel}` : levelTitleRows[0]?.key ?? '';
    const selectedTitleRow = args.selectedTitleKey
        ? allTitleRows.find((title) => title.key === args.selectedTitleKey && title.unlocked) ?? null
        : null;
    const currentTitleKey = selectedTitleRow?.key ?? fallbackTitleKey;
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
  const tabContentBottomPad = useTabContentBottomPad();
    const router = useRouter();
    // Навигация к отдельным экранам — через guard от двойного тапа (дубли в стеке).
    const nav = useGuardedNav();
    const { theme: t, isDark, f, themeMode } = useTheme();
    const { s, lang } = useLang();
    const { studyTarget } = useStudyTarget();
    const insets = useStableSafeAreaInsets();
    const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
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
    const [surveyOffer, setSurveyOffer] = useState<{
        challenge: SurveyOfferSnapshot;
        stableId: string;
        dayKey: string;
    } | null>(null);
    const refreshDailyPhraseVisibility = useCallback(() => {
        const next = isDailyPhraseCardHalfVisible({
            cardTop: dailyPhraseLayoutRef.current.top,
            cardHeight: dailyPhraseLayoutRef.current.height,
            scrollY: homeScrollYRef.current,
            viewportHeight: homeViewportHeightRef.current,
        });
        setDailyPhraseCardVisible((current) => current === next ? current : next);
    }, []);
    const handleHomeScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        topFadeScroll?.onScroll?.(event);
        homeScrollYRef.current = event.nativeEvent.contentOffset.y;
        refreshDailyPhraseVisibility();
    }, [refreshDailyPhraseVisibility, topFadeScroll]);
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
    const reviveOfferDirtyRef = useRef(false);
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
    const snapshotTotalXp = appSnapshot.profile?.totalXp ?? 0;
    const snapshotShards = appSnapshot.progress?.shards ?? 0;
    const initialTotalXP = hh?.totalXP ?? snapshotTotalXp;
    const initialVisuals = resolveHomeProfileVisuals({ hydration: hh, snapshot: appSnapshot.profile });
    const [userName, setUserName] = useState(() => hh?.userName ?? snapshotName);
    const [streak, setStreak] = useState(() => hh?.streak ?? snapshotStreak);
    const [displayStreak, setDisplayStreak] = useState(() => hh?.displayStreak ?? hh?.streak ?? snapshotStreak);
    const homeStreakDaysLabel = displayStreak === 1
        ? triLang(lang, {
            ru: 'день',
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
            uk: s.home.streakDays,
            es: s.home.streakDays,
            'pt-BR': s.home.streakDays,
            vi: s.home.streakDays,
            id: s.home.streakDays,
            tr: s.home.streakDays,
            pl: s.home.streakDays,
        });
    const streakScaleAnim = useRef(new Animated.Value(1)).current;
    const [totalXP, setTotalXP] = useState(() => initialTotalXP);
    const [homeStatsReady, setHomeStatsReady] = useState(() => !!((homeStatsLoadedOnce && hh) || appSnapshot.profile || appSnapshot.progress));
    // true только когда загрузка ОБОРВАЛАСЬ и показывать нечего (первый запуск + оффлайн).
    // Если есть кэш/hydration — баннер НЕ показываем: экран деградирует до кэша молча.
    const [loadFailedNoData, setLoadFailedNoData] = useState(false);
    const level = getLevelFromXP(totalXP);
    const [weekDone, setWeekDone] = useState<boolean[]>(() => {
        const w = hh?.weekDone;
        return w && w.length === 7 ? [...w] : new Array(7).fill(false);
    });
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
        uk: 'Привіт,',
        es: 'Hola,',
        'pt-BR': "Olá,",
        vi: "Xin chào,",
        id: "Halo,",
        tr: "Merhaba,",
        pl: "Cześć,",
    }));
    const [engineLeague, setEngineLeague] = useState<typeof LEAGUES[0] | null>(null);
    const { isPremium, isVip, isPro, hasPremiumAccess } = usePremium();
    // [SRS] Количество фраз, готовых к повторению сегодня (из локального стора).
    // Показывается в подписи «Моя практика»: >0 → «N ждут сегодня», иначе
    // «Ошибки под контролем». Считается и в проде (запрос локальный, без сети).
    // зачем: гидрируем синхронно из снапшота — раньше стартовал с 0 и подпись «ждут
    // сегодня» прыгала на реальное число вторым проходом при каждом повторном открытии
    // Home; холодный первый-в-жизни запуск (hh=null) честно остаётся 0.
    const [dueCount, setDueCount] = useState(() => hh?.dueCount ?? 0);
    const [userAvatar, setUserAvatar] = useState(() => initialVisuals.avatar);
    const [userAvatarAura, setUserAvatarAura] = useState<string | null>(() => initialVisuals.aura);
    const effectiveUserAvatarAura = getEffectiveAvatarAuraId(userAvatarAura, isPremium, isVip, isPro);
    const [userFrame, setUserFrame] = useState(() => initialVisuals.frame);
    // Бонусные баннеры
    const [loginBonus, setLoginBonus] = useState<{
        xp: number;
        cycle: number;
    } | null>(null);
    const [showComebackBanner, setComebackBanner] = useState(false);
    const [showRepairCard, setShowRepairCard] = useState(false);
    const [repairProgress, setRepairProgress] = useState(0);
    const [freezeActive, setFreezeActive] = useState(() => hh?.freezeActive ?? false);
    const [streakAtRisk, setStreakAtRisk] = useState(false);
    const [reviveOffer, setReviveOffer] = useState<StreakReviveOffer | null>(null);
    const [reviveModalVisible, setReviveModalVisible] = useState(false);
    const reviveOverlayVisible = useOverlayVisible('streakRevive', reviveModalVisible);
    const [homeProfilePlayer, setHomeProfilePlayer] = useState<PlayerInfo | null>(null);
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
    const celebrationOverlayVisible = useOverlayVisible('premiumCelebration', celebrationVisible);
    const [vipCelebrationVisible, setVipCelebrationVisible] = useState(false);
    const [vipCelebrationMarker, setVipCelebrationMarker] = useState<string | null>(null);
    const vipCelebrationQueuedMarkerRef = useRef<string | null>(null);
    const vipCelebrationOverlayVisible = useOverlayVisible('vipCelebration', vipCelebrationVisible);
    const [premiumFreezeUsed, setPremiumFreezeUsed] = useState(() => hh?.premiumFreezeUsed ?? false);
    const [lessonsCompleted, setLessonsCompleted] = useState(() => hh?.lessonsCompleted ?? 0);
    const [pageScrollEnabled, setPageScrollEnabled] = useState(true);
    const [medalCounts, setMedalCounts] = useState({ bronze: 0, silver: 0, gold: 0 });
    const [totalXPMulti, setTotalXPMulti] = useState(() => hh?.totalXPMulti ?? 1);
    const { energy: energyCount, bonusEnergy: energyBonus, maxEnergy: energyMax, recoveryIntervalMs: energyRecoveryIntervalMs, formattedTime: timeUntilNextEnergy, isUnlimited: energyUnlimited } = useEnergy();
    const showHomeEnergy = !hasPremiumAccess;
    const energyRecoveryMinutes = Math.max(1, Math.round(energyRecoveryIntervalMs / 60000));
    const isSketchLightTheme = themeMode === 'sagePorcelain';
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
    const leagueBonusPalette = getLeagueBonusPalette(t, themeMode);
    const leagueBonusGiftImage = getLeagueBonusGiftImage(themeMode);
    const BONUS_ENERGY_COLOR = isGoldTheme ? goldBright : '#FFD700';
    const isPaperHomeTheme = themeMode === 'sagePorcelain';
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
    const homeThemeTrackBg = isOliveTheme ? 'rgba(244,236,216,0.14)' : isPaperHomeTheme ? t.bgSurface2 : 'rgba(83,96,116,0.72)';
    const energyEmptyTint = isSketchLightTheme
        ? 'rgba(47,49,59,0.42)'
        : 'rgba(255,245,252,0.38)';
    const energyFilledColor = t.gold;
    const sketchShardAccent = isSketchLightTheme ? '#6245B2' : '#A78BFA';
    const streakFireIconVariant = getStreakFireIconVariant(themeMode, streak);
    const streakFreezeIconVariant = getStreakFreezeIconVariant(themeMode);
    const streakIconVariant = freezeActive ? streakFreezeIconVariant : streakFireIconVariant;
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
    const energyAnchorCacheRef = useRef<EnergyTooltipAnchor | null>(null);
    const [energyTooltip, setEnergyTooltip] = useState<{
        visible: boolean;
        anchor: EnergyTooltipAnchor | null;
    }>({
        visible: false,
        anchor: null,
    });
    const energyTooltipAnim = useRef(new Animated.Value(0)).current;
    const energyTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const energyIconRef = useRef<View>(null);
    const mountedRef = useRef(true);
    // зачем: last_opened_lesson_changed летит из onAppEvent-подписки внутри useEffect с
    // deps=[] (регистрируется один раз при маунте) — без рефов замыкание держало бы
    // studyTarget/lang ПЕРВОГО рендера и путало бы уроки/язык названия при смене на лету.
    const studyTargetRef = useRef(studyTarget);
    useEffect(() => { studyTargetRef.current = studyTarget; }, [studyTarget]);
    const langRef = useRef(lang);
    useEffect(() => { langRef.current = lang; }, [lang]);
    const [shardsBalance, setShardsBalance] = useState(() => peekLastKnownShardsBalance() ?? hh?.shardsBalance ?? snapshotShards);
    const [homeXpPercentile, setHomeXpPercentile] = useState<number | null>(null);
    const [homeLeagueCrownExpiresAt, setHomeLeagueCrownExpiresAt] = useState(() => hh?.homeLeagueCrownExpiresAt ?? 0);
    const [homeLeagueCrownCount, setHomeLeagueCrownCount] = useState(() => hh?.homeLeagueCrownCount ?? 0);
    const [homeLeagueChest, setHomeLeagueChest] = useState<{
        leagueName: string;
        progress: number;
        goal: number;
        myContribution: number;
        leaderName: string;
        leaderPoints: number;
    }>(() => {
        const cachedLeagueState = getCachedLeagueStateSync();
        const cachedLeague = cachedLeagueState
            ? LEAGUES.find((league) => league.id === cachedLeagueState.leagueId) ?? null
            : null;
        return cachedLeagueState
            ? buildHomeLeagueChest(cachedLeagueState.group, cachedLeague ? clubTierShortName(cachedLeague, lang) : 'Лига недели', cachedLeagueState.leagueId)
            : hh?.homeLeagueChest ?? buildHomeLeagueChest([], clubTierShortName(LEAGUES[0], lang), LEAGUES[0].id);
    });
    const shardsAnim = useRef(new Animated.Value(1)).current;
    const shardsBonusAnim = useRef(new Animated.Value(0)).current;
    const [shardsBonusText, setShardsBonusText] = useState('');

    useEffect(() => {
        const profile = appSnapshot.profile;
        const progress = appSnapshot.progress;
        if (!shouldApplyHomeSnapshotToStats(homeStatsLoadedOnce, profile?.source, progress?.source)) return;
        if (!profile && !progress) return;
        setHomeStatsReady(true);
        if (profile?.name) setUserName((current) => current || profile.name);
        if (profile) {
            if (profile.source === 'live' || (totalXP === 0 && profile.totalXp > 0)) setTotalXP(profile.totalXp);
            const visuals = resolveHomeProfileVisuals({ snapshot: profile });
            setUserAvatar((current) => current === visuals.avatar ? current : visuals.avatar);
            setUserFrame((current) => current === visuals.frame ? current : visuals.frame);
            setUserAvatarAura((current) => current === visuals.aura ? current : visuals.aura);
        }
        if (progress && (progress.source === 'live' || (streak === 0 && progress.streak > 0))) {
            setStreak(progress.streak);
            setDisplayStreak((current) => progress.source === 'live' ? progress.streak : current || progress.streak);
        }
        if (progress && shardsBalance === 0 && progress.shards > 0) setShardsBalance(progress.shards);
    }, [appSnapshot.profile, appSnapshot.progress, shardsBalance, streak, totalXP]);

    const streakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [pendingLeagueResult, setPendingLeagueResult] = useState<LeagueResult | null>(null);
    const leagueResultVisible = useOverlayVisible('leagueResult', pendingLeagueResult != null);
    const dismissedLeagueResultRef = useRef<string | null>(null);
    // Доп. гард: если пользователь уже закрыл модалку результатов недели в этой
    // сессии — не показываем её снова, даже если подпись (totalInGroup/myRank)
    // поменялась после нового Firestore-фетча группы. Сбрасывается на cold-start.
    const dismissedLeagueResultThisSessionRef = useRef<boolean>(false);
    const statsHintPulseAnim = useRef(new Animated.Value(1)).current;
    const statsPulseSessionRef = useRef(false);
    const [showStatsPulseHint, setShowStatsPulseHint] = useState(false);
    const eliteStatusEntrance = useRef(new Animated.Value(1)).current;
    const eliteQuickTileEntrance = useRef(Array.from({ length: 3 }, () => new Animated.Value(1))).current;
    const eliteActivityTileEntrance = useRef(Array.from({ length: 3 }, () => new Animated.Value(1))).current;
    const showEnergyTooltip = () => {
        if (!showHomeEnergy) return;
        hapticTap();
        const scheduleHide = () => {
            energyTooltipAnim.setValue(0);
            Animated.spring(energyTooltipAnim, { toValue: 1, useNativeDriver: false, tension: 120, friction: 8 }).start();
            if (energyTooltipTimer.current)
                clearTimeout(energyTooltipTimer.current);
            energyTooltipTimer.current = setTimeout(() => {
                Animated.timing(energyTooltipAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start(() => {
                    setEnergyTooltip((p) => ({ ...p, visible: false }));
                });
            }, 3000);
        };
        const openWithAnchor = (measured: EnergyTooltipAnchor | null) => {
            const fresh = measured && measured.w > 0 && measured.h >= 0
                ? measured
                : energyAnchorCacheRef.current;
            if (measured && measured.w > 0 && measured.h >= 0) {
                energyAnchorCacheRef.current = measured;
            }
            setEnergyTooltip({ visible: true, anchor: fresh });
            scheduleHide();
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
    };
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
        // пару секунд, убрать». Это был бегущий блик по XP-полосе героя: цикл на
        // 2.8 c + пауза, глушился таймером на 7.6 c — отсюда и ощущение затухания.
        // Вместе с ним ушли таймер, AppState-подписка и вечный кадр анимации.
    }, [eliteActivityTileEntrance, eliteQuickTileEntrance, eliteStatusEntrance, homeRuntimeActive, lang]);
    // Миграция xp_migration_v2 переехала из экрана в xp_manager.migrateXPFormulaV2()
    // (вызывается на старте из _layout.tsx) — one-shot миграциям не место в маунте таба (D4).
    // D4: секции ниже первого экрана (подсказки, быстрый доступ, SRS-ряд, тренер,
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
        // Слушаем событие изменения XP (от тестеров и других экранов)
        const xpSub = DeviceEventEmitter.addListener('xp_changed', requestHomeDataRefresh);
        const leagueStateSub = onAppEvent('league_local_state_updated', requestHomeDataRefresh);
        const crownSub = onAppEvent('league_crown_updated', ({ expiresAt, crownCount }) => {
            setHomeLeagueCrownExpiresAt(expiresAt);
            setHomeLeagueCrownCount(Math.max(1, Math.floor(Number(crownCount) || 1)));
        });
        // Слушаем событие начисления осколков
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
        // Цепочка только что обнулена (или markStreakLost вызван из любого места) — подтянуть
        // оффер и поднять модалку, не дожидаясь следующего loadData.
        const reviveOfferSub = onAppEvent('streak_revive_offer', () => {
            if (!homeRuntimeActiveRef.current) {
                reviveOfferDirtyRef.current = true;
                return;
            }
            void getReviveOffer().then((o) => {
                if (!mountedRef.current)
                    return;
                if (!homeRuntimeActiveRef.current) {
                    reviveOfferDirtyRef.current = true;
                    return;
                }
                if (!o)
                    return;
                setReviveOffer(o);
                setReviveModalVisible(true);
            });
        });
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
        const revivedSub = onAppEvent('streak_revived', () => {
            soundDirector.request('pm.streak.saved', {
                scope: 'streak-revive',
                dedupeKey: 'restored',
            });
            refreshWeekMarkers();
            requestHomeDataRefresh();
        });
        // зачем: владелец — «зашёл в урок, а карточка "Продолжить урок" на Главной ещё
        // старая, пока не перезайду в приложение». lesson1.tsx эмитит это СРАЗУ при входе
        // в урок (см. lesson1.tsx рядом с correctCount/score). Патчим state напрямую —
        // не requestHomeDataRefresh: полный loadData() дороже (XP/streak/лига/etc.) и не
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
        });
        return () => {
            mountedRef.current = false;
            sub.remove();
            if (resumeTimer)
                clearTimeout(resumeTimer);
            resumeTask?.cancel?.();
            xpSub.remove();
            leagueStateSub.remove();
            crownSub.remove();
            shardsSub.remove();
            reviveOfferSub.remove();
            freezeUpdatedSub.remove();
            revivedSub.remove();
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
            if (energyTooltipTimer.current)
                clearTimeout(energyTooltipTimer.current);
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
        const shouldPulse = homeFeatureTipsHydrated && homeOnboardingDone && !homeFeatureTipsDone && homeFeatureTipIndex === 0;
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
    const homeFeatureTipCardVisible = homeFeatureTipsHydrated && homeOnboardingDone && !homeFeatureTipsDone && homeFeatureTips.length > 0;
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
    const homeLeagueCrownLoadedRef = useRef(false);
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
        if (!homeRuntimeActive || homeLeagueCrownLoadedRef.current) return;
        homeLeagueCrownLoadedRef.current = true;
        let cancelled = false;
        void ensureAnonUser()
            .then((uid) => {
            if (!uid)
                return null;
            return fetchActiveLeagueCrowns([uid]).then((crowns) => {
                const crown = crowns[uid];
                return {
                    expiresAt: crown?.expiresAt ?? 0,
                    crownCount: Math.max(0, Math.floor(Number(crown?.crownCount) || 0)),
                };
            });
        })
            .then((crown) => {
            if (!cancelled && crown) {
                setHomeLeagueCrownExpiresAt(crown.expiresAt);
                setHomeLeagueCrownCount(crown.crownCount);
            }
        })
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, [homeRuntimeActive]);
    /** Подсказка по блоку статистики: один раз после 3 ч в приложении, пульс 10 с, затем скрыть навсегда. */
    useEffect(() => {
        if (!homeStatsReady || !homeRuntimeActive)
            return;
        let cancelled = false;
        let recheckTimer: ReturnType<typeof setTimeout> | null = null;
        let hideTimer: ReturnType<typeof setTimeout> | null = null;
        let pulseLoop: Animated.CompositeAnimation | null = null;
        const scheduleRecheck = (total: number, retryDelayMs?: number) => {
            if (cancelled || recheckTimer)
                return;
            const remaining = Math.max(0, STATS_PULSE_MIN_USAGE_MS - total);
            const delay = retryDelayMs ?? Math.max(STATS_PULSE_RECHECK_MIN_MS, remaining);
            recheckTimer = setTimeout(() => {
                recheckTimer = null;
                void check();
            }, delay);
        };
        const startPulse = () => {
            if (statsPulseSessionRef.current || cancelled)
                return;
            statsPulseSessionRef.current = true;
            setShowStatsPulseHint(true);
            pulseLoop = Animated.loop(Animated.sequence([
                Animated.timing(statsHintPulseAnim, { toValue: 1.07, duration: 650, useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER }),
                Animated.timing(statsHintPulseAnim, { toValue: 1, duration: 650, useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER }),
            ]));
            pulseLoop.start();
            hideTimer = setTimeout(() => {
                pulseLoop?.stop();
                statsHintPulseAnim.setValue(1);
                if (!cancelled)
                    setShowStatsPulseHint(false);
                AsyncStorage.setItem(STATS_PULSE_HINT_DONE_KEY, '1').catch(() => { });
                statsPulseSessionRef.current = false;
                hideTimer = null;
            }, 10000);
        };
        const check = async () => {
            try {
                const [total, done] = await Promise.all([
                    getForegroundUsageMs(),
                    AsyncStorage.getItem(STATS_PULSE_HINT_DONE_KEY),
                ]);
                if (cancelled || done === '1')
                    return;
                if (total >= STATS_PULSE_MIN_USAGE_MS) {
                    startPulse();
                    return;
                }
                scheduleRecheck(total);
            }
            catch {
                scheduleRecheck(0, STATS_PULSE_RECHECK_MIN_MS);
            }
        };
        void check();
        return () => {
            cancelled = true;
            if (recheckTimer)
                clearTimeout(recheckTimer);
            if (hideTimer)
                clearTimeout(hideTimer);
            pulseLoop?.stop();
            statsHintPulseAnim.setValue(1);
            statsPulseSessionRef.current = false;
            setShowStatsPulseHint(false);
        };
    }, [homeStatsReady, focusTick, homeRuntimeActive, statsHintPulseAnim]);
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
        let streakPaywallOpenedThisLoad = false;
        if (streakTimerRef.current) {
            clearTimeout(streakTimerRef.current);
            streakTimerRef.current = null;
        }
        streakScaleAnim.stopAnimation();
        streakScaleAnim.setValue(1);
        const endPerf = perfMark('home:loadData');
        try {
            const [homeStoragePairs, currentWeekMarkers, weekPts, shardsBal, premiumSignalPairs] = await Promise.all([
                AsyncStorage.multiGet([
                    'user_name',
                    'streak_count',
                    'week_days_done',
                    'user_total_xp',
                    HOME_SELECTED_TITLE_KEY,
                    'streak_last_shown',
                ]),
                readCurrentStreakWeekMarkers(),
                getMyWeekPoints(),
                getShardsBalance(),
                AsyncStorage.multiGet(['premium_active']),
            ]);
            const homeStorage = new Map(homeStoragePairs);
            const name = homeStorage.get('user_name') ?? null;
            const streakVal = homeStorage.get('streak_count') ?? null;
            const weekData = homeStorage.get('week_days_done') ?? null;
            const xpStored = homeStorage.get('user_total_xp') ?? null;
            const storedTitleKey = homeStorage.get(HOME_SELECTED_TITLE_KEY) ?? null;
            const lastStreakShownRaw = homeStorage.get('streak_last_shown') ?? null;
            const premiumSignals = new Map(premiumSignalPairs);
            // Данные успешно прочитаны — снимаем баннер ошибки, если он был после прошлого сбоя.
            if (mountedRef.current && loadFailedNoData) setLoadFailedNoData(false);
            setWeekMarkers(currentWeekMarkers);
            setShardsBalance(shardsBal);
            if (!selectedTitleHydratedRef.current) {
                selectedTitleHydratedRef.current = true;
                setSelectedTitleKey(storedTitleKey || null);
            }
            const hydratedName = resolveHydratedProfileName(homeHydrationStartedAt, name);
            if (hydratedName)
                setUserName(hydratedName);
            const currentStreakNum = parseInt(streakVal || '0') || 0;
            if (streakVal)
                setStreak(currentStreakNum);
            const lastStreakShown = parseInt(lastStreakShownRaw || '0') || 0;
            if (currentStreakNum > 0 && currentStreakNum !== lastStreakShown) {
                await AsyncStorage.setItem('streak_last_shown', String(currentStreakNum));
                if (lastStreakShown > 0 && currentStreakNum > lastStreakShown) {
                    setDisplayStreak(lastStreakShown);
                    streakTimerRef.current = setTimeout(() => {
                        setDisplayStreak(currentStreakNum);
                        Animated.sequence([
                            Animated.spring(streakScaleAnim, { toValue: 1.6, useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER, friction: 3, tension: 200 }),
                            Animated.spring(streakScaleAnim, { toValue: 1, useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER, friction: 5, tension: 150 }),
                        ]).start();
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
            const xpSnap = parseInt(xpStored || '0', 10) || 0;
            const curLvlSnap = getLevelFromXP(xpSnap);
            const [[, savedAvSnap], [, savedFrSnap], [, savedAuraSnap]] = await AsyncStorage.multiGet(['user_avatar', 'user_frame', USER_AVATAR_AURA_KEY]);
            const avatarSnap = isCustomAvatarValue(savedAvSnap) ? savedAvSnap! : getBestAvatarForLevel(curLvlSnap);
            const frameSnap = savedFrSnap || getBestFrameForLevel(curLvlSnap).id;
            if (xpStored) {
                const newXP = xpSnap;
                setTotalXP(newXP);
                // Обновляем UI аватара/рамки по текущему уровню
                // (запись в AsyncStorage и детект level-up делает xp_manager.ts)
                setUserAvatar(avatarSnap);
                setUserAvatarAura(normalizeAvatarAuraId(savedAuraSnap) ?? null);
                setUserFrame(frameSnap);
                // Мини-бейдж перцентиля — глобальные пороги из leaderboard_stats/global
                if (newXP > 0) {
                    computeAllPercentiles({ myXp: newXP, myStreak: 0, myWeekXp: 0, myDaily7xp: 0, myDaily7timeMs: 0 }).then((p) => {
                        if (mountedRef.current)
                            setHomeXpPercentile(p.xp !== null && p.xp >= 50 ? p.xp : null);
                    }).catch(() => { });
                }
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
            setWeekPoints(weekPts);
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
            const lessonEntriesWithLastOpened = await AsyncStorage.multiGet([...lessonKeys, lastOpenedKey]);
            const lessonEntries = lessonEntriesWithLastOpened.slice(0, lessonKeys.length);
            const lastLessonIdKey = lessonEntriesWithLastOpened[lessonKeys.length]?.[1] ?? null;
            for (const [, saved] of lessonEntries) {
                if (saved) {
                    // Inner try/catch: одна порченная запись прогресса (битый JSON в AsyncStorage)
                    // не должна валить весь loadData → баннер «Обновить» вместо Главной.
                    try {
                        const p: unknown = JSON.parse(saved);
                        if (Array.isArray(p)) {
                            const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
                            if (correct >= 45) done++;
                        }
                    } catch {
                        // битая запись — пропускаем, не считаем как завершённый
                    }
                }
            }
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
                    const { isLessonUnlockedByEarnedProgress } = await import('../lesson_lock_system');
                    while (lastId > 1 && !(await isLessonUnlockedByEarnedProgress(lastId, studyTarget))) {
                        lastId -= 1;
                    }
                } catch {
                    // не смогли проверить — оставляем как есть, экран урока сам покажет гейт
                }
            }
            if (lastId && lastId >= 1 && lastId <= 32) {
                const lessonNames = lessonNamesForStudyTarget(lang, studyTarget);
                const saved = lessonEntries[lastId - 1]?.[1] ?? null;
                snapLastLessonId = lastId;
                if (saved) {
                    // Inner try/catch (см. цикл выше): битый JSON одного урока не
                    // должен валить загрузку «последнего урока» на Главной.
                    try {
                        const p: unknown = JSON.parse(saved);
                        if (Array.isArray(p)) {
                            const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
                            const scoreStr = (correct / 50 * 5).toFixed(1);
                            snapLastLessonProgress = correct;
                            snapLastLessonScore = scoreStr;
                            setLastLesson({ id: lastId, name: lessonNames[lastId - 1], progress: correct, score: scoreStr });
                        } else {
                            snapLastLessonProgress = 0;
                            snapLastLessonScore = '0.0';
                            setLastLesson({ id: lastId, name: lessonNames[lastId - 1], progress: 0, score: '0.0' });
                        }
                    } catch {
                        snapLastLessonProgress = 0;
                        snapLastLessonScore = '0.0';
                        setLastLesson({ id: lastId, name: lessonNames[lastId - 1], progress: 0, score: '0.0' });
                    }
                }
                else {
                    snapLastLessonProgress = 0;
                    snapLastLessonScore = '0.0';
                    setLastLesson({ id: lastId, name: lessonNames[lastId - 1], progress: 0, score: '0.0' });
                }
            }
            else if (mountedRef.current) {
                setLastLesson(null);
            }
            // Крупная карта «Рівень / Ланцюжок»: не ждём лігу, медалі, SRS — щоб не ловити вічний спінер.
            const [freezeStoragePairs, baseMulti] = await Promise.all([
                AsyncStorage.multiGet(['streak_freeze', 'premium_free_freeze_used']),
                getCurrentMultiplier(),
            ]);
            const freezeStorage = new Map(freezeStoragePairs);
            const freezeRaw = freezeStorage.get('streak_freeze') ?? null;
            const freeFreezeRaw = freezeStorage.get('premium_free_freeze_used') ?? null;
            const parsedFreeze = freezeRaw ? JSON.parse(freezeRaw) : null;
            const freezeIsActive = isStreakFreezeActiveToday(parsedFreeze);
            setFreezeActive(freezeIsActive);
            setPremiumFreezeUsed(freeFreezeRaw === 'true');
            setTotalXPMulti(baseMulti);
            rememberHomeScreenHydration({
                userName: hydratedName,
                totalXP: xpSnap,
                streak: currentStreakNum,
                displayStreak: currentStreakNum,
                weekDone: weekParsedForSnap,
                weekMarkers: currentWeekMarkers,
                weekPoints: weekPts,
                shardsBalance: shardsBal,
                lessonsCompleted: done,
                freezeActive: freezeIsActive,
                premiumFreezeUsed: freeFreezeRaw === 'true',
                totalXPMulti: baseMulti,
                userAvatar: avatarSnap,
                userAvatarAura: normalizeAvatarAuraId(savedAuraSnap) ?? null,
                userFrame: frameSnap,
                lastLessonId: snapLastLessonId,
                lastLessonProgress: snapLastLessonProgress,
                lastLessonScore: snapLastLessonScore,
                dueCount: hh?.dueCount,
                homeLeagueCrownExpiresAt,
                homeLeagueCrownCount,
                // The long-lived event subscriptions call the first loadData closure,
                // which can still have a null React value. Preserve the newest cache
                // rather than letting that stale closure erase the league row.
                homeLeagueChest: homeLeagueChest ?? peekHomeScreenHydration(studyTarget)?.homeLeagueChest ?? null,
            }, studyTarget, homeHydrationAccount);
            patchAppSnapshot({
                profile: {
                    source: 'storage',
                    updatedAt: homeHydrationStartedAt,
                    name: hydratedName,
                    avatar: avatarSnap,
                    frame: frameSnap,
                    aura: normalizeAvatarAuraId(savedAuraSnap) ?? undefined,
                    totalXp: xpSnap,
                    level: getLevelFromXP(xpSnap),
                    premiumActive: premiumSignals.get('premium_active') === 'true',
                    vipActive: isVip,
                },
                progress: {
                    source: 'local',
                    updatedAt: Date.now(),
                    streak: currentStreakNum,
                    shards: shardsBal,
                    studyTarget: String(studyTarget ?? 'en'),
                },
            });
            if (mountedRef.current)
                markHomeStatsReady();
            // Имя для лиги: либо настоящее, либо анонимная подстановка на основе уровня (как в club_screen.tsx),
            // чтобы checkLeagueOnAppOpen не записал в Firestore "пустого" пользователя.
            const leagueName = (name && name.trim())
                || (() => {
                    const xpNum = parseInt(xpStored || '0', 10) || 0;
                    const lvl = getXPProgress(xpNum).level;
                    return `${getTitleString(lvl, lang ?? 'ru')} #${Math.floor(1000 + Math.random() * 9000)}`;
                })();
            // Префетч лиги стартует до прочих локальных чтений, чтобы ранний вход
            // в раздел уже получил тёплый кэш.
            // Firestore-чтений это не добавляет: вызов ровно один, просто раньше.
            const leagueOpenPromise = checkLeagueOnAppOpen(leagueName, weekPts).catch(() => null);
            const [leagueOpenResult, dueItems, allMedals, repairEligible, bannerStoragePairs] = await Promise.all([
                // Полный расчёт: при смене ISO-недели создаст pending и сохранит state.
                // Если remote недоступен — функция сама перейдет на локальный state.
                leagueOpenPromise,
                loadAllMedals(studyTarget),
                isRepairEligible(),
                AsyncStorage.multiGet(['login_bonus_pending', 'comeback_pending', 'weekly_pb_v1']),
            ]);
            const bannerStorage = new Map(bannerStoragePairs);
            const bonusRaw = bannerStorage.get('login_bonus_pending') ?? null;
            const comebackRaw = bannerStorage.get('comeback_pending') ?? null;
            const pbRaw = bannerStorage.get('weekly_pb_v1') ?? null;
            const leagueState = leagueOpenResult?.state ?? null;
            // Если checkLeagueOnAppOpen упал/таймаутнул — читаем pending напрямую,
            // чтобы при следующем открытии (когда state уже сохранён) модалка всё равно вылезла.
            const leaguePending: LeagueResult | null = leagueOpenResult?.needShowResult
                ? leagueOpenResult.result
                : await loadPendingResult().catch(() => null);
            if (leagueState) {
                const league = LEAGUES.find(l => l.id === leagueState.leagueId) ?? null;
                const freshLeagueBonus = await fetchLeagueBonusProgressSnapshot().catch(() => null);
                const matchingFreshBonus = freshLeagueBonus
                    && freshLeagueBonus.weekId === leagueState.weekId
                    && freshLeagueBonus.leagueId === leagueState.leagueId
                    ? freshLeagueBonus
                    : null;
                const nextHomeLeagueChest = buildHomeLeagueChest(leagueState.group ?? [], league ? clubTierShortName(league, lang) : triLang(lang, {
                        ru: 'Лига недели',
                        uk: 'Ліга тижня',
                        es: 'Liga semanal',
                        'pt-BR': "Liga semanal",
                        vi: "Giải đấu tuần",
                        id: "Liga mingguan",
                        tr: "Haftalık lig",
                        pl: "Liga tygodnia",
                    }), leagueState.leagueId, matchingFreshBonus?.leaguePoints);
                setEngineLeague(league);
                setHomeLeagueChest((prev) => nextHomeLeagueChest ?? prev);
                patchHomeScreenHydration({
                    ...(nextHomeLeagueChest ? { homeLeagueChest: nextHomeLeagueChest } : {}), // null не затирает кэш — иначе карточка Лиги «пропадает» с главной
                }, studyTarget);
            }
            else {
                setHomeLeagueChest((prev) => prev);
            }
            if (leaguePending && mountedRef.current) {
                const pendingSig = getLeagueResultSignature(leaguePending);
                // Если пользователь уже закрыл модалку в этой сессии — больше не показываем,
                // даже если состав группы (totalInGroup/myRank) поменялся после refetch.
                if (dismissedLeagueResultThisSessionRef.current || dismissedLeagueResultRef.current === pendingSig) {
                    await clearPendingResult();
                }
                // Межхостовый guard (league_engine, module-level): та же сигнатура могла уже
                // быть забронирована club_screen.tsx (или этим же хостом ранее) — не показываем
                // второй раз. Источник правды — league_engine; локальные рефы выше остаются
                // как быстрая защита внутри этого хоста.
                else if (!tryAcquireLeagueResultModal(pendingSig)) {
                    // ничего не делаем — показ уже произошёл (или произойдёт) на другом хосте
                }
                else {
                    void checkAchievements({
                        type: 'league_result',
                        myRank: leaguePending.myRank,
                        totalInGroup: leaguePending.totalInGroup,
                        promoted: leaguePending.promoted,
                        newLeagueId: leaguePending.newLeagueId,
                    });
                    // Персистим «показано» СРАЗУ (await, не фоном) — kill приложения сразу
                    // после показа не должен приводить к повторному показу при следующем запуске.
                    await markLeagueResultShown(leaguePending);
                    setPendingLeagueResult(leaguePending);
                }
            }
            setDueCount(dueItems.length);
            // зачем: обновляем снапшот сразу после свежих данных — при следующем открытии
            // Home подпись «Моя практика» стартует с этого числа, а не с 0 (см. dueCount выше).
            patchHomeScreenHydration({ dueCount: dueItems.length }, studyTarget);
            setMedalCounts(countMedals(allMedals));
            // [BANNERS] Login bonus, comeback, personal best, streak repair
            if (bonusRaw) {
                // Inner try/catch: битый login_bonus_pending не должен ронять loadData.
                try {
                    setLoginBonus(JSON.parse(bonusRaw));
                } catch {
                    // битая запись — игнорируем, чистим ниже
                }
                await AsyncStorage.removeItem('login_bonus_pending');
            }
            if (comebackRaw) {
                setComebackBanner(true);
                await AsyncStorage.removeItem('comeback_pending');
            }
            // Personal best: обновляем рекорд без показа баннера (баннер убран — слишком часто срабатывал)
            const pb = pbRaw ? JSON.parse(pbRaw) : { bestXP: 0 };
            if (weekPts > pb.bestXP) {
                await AsyncStorage.setItem('weekly_pb_v1', JSON.stringify({ bestXP: weekPts }));
            }
            if (repairEligible) {
                setShowRepairCard(true);
                const progress = await getRepairProgress();
                setRepairProgress(progress.lessons);
            }
            // [WEEKLY BOONS] Применяем write-эффект бонуса дня (заморозка/арена/триал/
            // турбо-энергия). Идемпотентно за сутки, не роняет открытие при сбое.
            void applyTodaysBoonsOnAppOpen(studyTarget);
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
                        streakPaywallOpenedThisLoad = true;
                    }
                }
            }
            // Streak Revive: если цепочка уже обнулена в updateStreakOnActivity (≤24ч назад) —
            // оффер активен, показываем модалку. Не пересекается с willLose (там 1 пропущенный
            // день и freeze ещё может помочь).
            const offer = await getReviveOffer();
            if (offer && mountedRef.current) {
                setReviveOffer(offer);
                if (streakPaywallOpenedThisLoad) {
                    reviveOfferDirtyRef.current = true;
                } else {
                    setReviveModalVisible(true);
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
                // Не показываем одновременно с revive-модалкой — celebration важнее, revive отложится до закрытия.
                if (!offer)
                    setCelebrationVisible(true);
                else {
                    // Если есть и то и то — после закрытия revive подхватим celebration.
                    setTimeout(() => setCelebrationVisible(true), 600);
                }
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
                    if (!offer && !pending)
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
        if (reviveOfferDirtyRef.current) {
            reviveOfferDirtyRef.current = false;
            void getReviveOffer().then((offer) => {
                if (homeRuntimeActiveRef.current && offer) {
                    setReviveOffer(offer);
                    setReviveModalVisible(true);
                } else if (!homeRuntimeActiveRef.current) reviveOfferDirtyRef.current = true;
            });
        }
    }, [focusTick, homeRuntimeActive, shardsAnim, shardsBonusAnim]);
    const FREEZE_COST_SHARDS = getStreakFreezeCostShards();
    const handleFreezeStreak = async () => {
        hapticTap();
        const today = getLocalDayKey();
        const freeAvailable = hasPremiumAccess && !premiumFreezeUsed;
        if (!hasPremiumAccess) {
            router.push({ pathname: '/premium_modal', params: { context: 'streak', streak: String(streak) } } as any);
            return;
        }
        if (freeAvailable) {
            await AsyncStorage.setItem('premium_free_freeze_used', 'true');
            setPremiumFreezeUsed(true);
        }
        else {
            const purchase = await purchaseStreakFreeze(FREEZE_COST_SHARDS, today);
            if (purchase !== 'ok') {
                await enqueueThemedBlockingInfoAlert(triLang(lang, {
                    ru: 'Недостаточно жемчужин',
                    uk: 'Недостатньо перлин',
                    es: `No tienes suficientes ${BRAND_SHARDS_ES}`,
                    'pt-BR': "Você não tem pérolas suficientes",
                    vi: "Bạn không có đủ xu",
                    id: "Mutiara kamu tidak cukup",
                    tr: "Yeterli incin yok",
                    pl: "Nie masz wystarczająco monet",
                // зачем: системный алерт принимает только текст — валюту называем
                // словом («жемчужин»), как в магазине, а не эмодзи-алмазом 💎.
                }), triLang(lang, {
                    ru: `Заморозка стоит ${FREEZE_COST_SHARDS} жемчужин. У тебя ${shardsBalance}.`,
                    uk: `Заморозка коштує ${FREEZE_COST_SHARDS} перлин. У тебе ${shardsBalance}.`,
                    es: `Congelar la racha cuesta ${FREEZE_COST_SHARDS} perlas · Tienes ${shardsBalance}`,
                    'pt-BR': `Congelar a sequência custa ${FREEZE_COST_SHARDS} pérolas · Você tem ${shardsBalance}`,
                    vi: `Đóng băng chuỗi tốn ${FREEZE_COST_SHARDS} ngọc trai · Bạn có ${shardsBalance}`,
                    id: `Bekukan rangkaian seharga ${FREEZE_COST_SHARDS} mutiara · Kamu punya ${shardsBalance}`,
                    tr: `Seriyi dondurmak ${FREEZE_COST_SHARDS} inci · Sende ${shardsBalance} var`,
                    pl: `Zamrożenie serii kosztuje ${FREEZE_COST_SHARDS} pereł · Masz ${shardsBalance}`,
                }), 'OK');
                return;
            }
            setShardsBalance(prev => Math.max(0, prev - FREEZE_COST_SHARDS));
        }
        if (freeAvailable) {
            await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: today }));
        }
        const lastActive = await AsyncStorage.getItem('last_active_date').catch(() => null);
        const frozenDate = lastActive && !isSameLocalOrUtcDay(lastActive) ? addDaysToDateKey(lastActive, 1) : today;
        await recordStreakWeekMarker(frozenDate, 'freeze').catch(() => {});
        setWeekMarkers(await readCurrentStreakWeekMarkers().catch(() => weekMarkers));
        setFreezeActive(true);
        emitAppEvent('streak_freeze_updated', { active: true });
        setStreakAtRisk(false);
        void checkAchievements({ type: 'streak_freeze_used' });
    };
    const weekDays = HOME_WEEK_DAYS[lang] ?? HOME_WEEK_DAYS.ru;
    const todayIdx = (new Date().getDay() + 6) % 7;
    /** Индексы табов: 0 home, 1 lessons, 2 friends, 3 settings —
     *  см. app/(tabs)/_layout.tsx. Плитка «Уроки» по-прежнему открывает push-маршрут
     *  /lessons_list, чтобы сохранить привычную историю возврата с главной.
     *  зачем: карта дублирует _layout.tsx, поэтому при любом изменении набора
     *  вкладок её обязательно править вместе с ним — иначе переходы отсюда
     *  уводят не на тот экран. */
    const TAB_IDX: Record<string, number> = {
        '/(tabs)/friends': 2,
        friends: 2,
        '/(tabs)/settings': 3,
        settings: 3,
    };
    const go = (path: string) => {
        hapticTap();
        const tabIdx = TAB_IDX[path];
        if (tabIdx !== undefined) {
            goToTab(tabIdx);
            return;
        }
        const screenName = path.replace(/^\//, '').split('?')[0];
        logFeatureOpened(screenName);
        trackFeatureOpened(screenName).catch(() => { });
        perfNavStart(screenName);
        router.push(path as any);
    };
    const markerForWeekDay = (index: number): StreakWeekDayMarkerKind | null => weekMarkers[index] ?? null;
    const isWeekDayMarked = (index: number): boolean => weekDone[index] || markerForWeekDay(index) !== null;
    const weekDotTheme = themedWeekDot(themeMode, t);
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
            return <Image source={STREAK_WEEK_FREEZE_ICE} style={{ width: iceSize, height: iceSize }} contentFit="contain" accessibilityLabel={triLang(lang, { ru: 'Заморозка серии', uk: 'Заморозка серії', es: 'Congelación de racha', 'pt-BR': 'Congelamento da sequência', vi: 'Đóng băng chuỗi', id: 'Pembekuan rentetan', tr: 'Seri dondurma', pl: 'Zamrożenie serii' })} />;
        }
        if (marker === 'revive' || marker === 'repair') {
            return <Ionicons name="checkmark" size={checkSize} color={checkColor}/>;
        }
        return null;
    };
    if (!diagChecked)
        return <ScreenGradient><View /></ScreenGradient>;
    const loginBonusChrome = themedToastChrome(themeMode, t);
    const loginBonusAccent = loginBonusChrome.accent;
    const loginBonusAccentSoft = loginBonusChrome.accentSoft;
    const loginBonusBorder = loginBonusChrome.border;
    const loginBonusCardGradient = loginBonusChrome.cardColors;
    const loginBonusIcon = loginBonus?.cycle === 7 ? 'gift-outline' : 'flash-outline';
    const loginBonusCloseLabel = triLang(lang, {
        ru: 'Закрыть бонус за вход',
        uk: 'Закрити бонус за вхід',
        es: 'Cerrar bono por entrar',
        'pt-BR': 'Fechar bônus por entrar',
        vi: 'Đóng thưởng đăng nhập',
        id: 'Tutup bonus masuk',
        tr: 'Giriş bonusunu kapat',
        pl: 'Zamknij bonus za wejście',
    });
    // ── Общие баннеры (используются в обоих стилях) ──────────────────────────
    const bannersJSX = (<>
      {loginBonus && (<View style={{ marginHorizontal: 16, marginBottom: 10, borderRadius: loginBonusChrome.radius, overflow: 'hidden', ...(isGoldTheme ? goldShadow(1) : { shadowColor: loginBonusChrome.shadowColor, shadowOpacity: isLightTheme ? 0.10 : 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 7 }) }}>
          <LinearGradient colors={loginBonusCardGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 74, borderRadius: loginBonusChrome.radius, paddingVertical: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 0, borderColor: loginBonusBorder, overflow: 'hidden' }}>
            {isGoldTheme && <GoldBevel radius={18} intensity="quiet"/>}
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: loginBonusAccent, opacity: isLightTheme ? 0.72 : 0.90 }}/>
            <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: loginBonusAccentSoft, borderWidth: 1, borderColor: loginBonusBorder }}>
              <Ionicons name={loginBonusIcon} size={22} color={loginBonusAccent}/>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: f.body + 4, fontWeight: '800', letterSpacing: 0 }} numberOfLines={1}>{triLang(lang, {
                ru: 'Бонус за вход!',
                uk: 'Бонус за вхід!',
                es: '¡Bono por entrar!',
                'pt-BR': "Bônus por entrar!",
                vi: "Thưởng đăng nhập!",
                id: "Bonus masuk!",
                tr: "Giriş bonusu!",
                pl: "Bonus za wejście!",
              })}{loginBonus.cycle === 7 ? triLang(lang, {
                ru: ' День 7',
                uk: ' День 7',
                es: ' · Día 7',
                'pt-BR': " · Dia 7",
                vi: " · Ngày 7",
                id: " · Hari 7",
                tr: " · 7. gün",
                pl: " · Dzień 7",
            }) : ''}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: f.sub + 4, marginTop: 2, fontWeight: '700' }} numberOfLines={1}>+{loginBonus.xp} XP · {triLang(lang, {
                ru: `день ${loginBonus.cycle}`,
                uk: `день ${loginBonus.cycle}`,
                es: `Día ${loginBonus.cycle}`,
                'pt-BR': `Dia ${loginBonus.cycle}`,
                vi: `Ngày ${loginBonus.cycle}`,
                id: `Hari ${loginBonus.cycle}`,
                tr: `${loginBonus.cycle}. gün`,
                pl: `Dzień ${loginBonus.cycle}`,
            })}</Text>
            </View>
            <TapScale onPress={() => setLoginBonus(null)} accessibilityLabel={loginBonusCloseLabel} style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: loginBonusChrome.closeBg }}><Ionicons name="close" size={18} color={t.textMuted}/></TapScale>
          </LinearGradient>
        </View>)}
      {showComebackBanner && (<View style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: glassFill(t.bgCard, 0.5), borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#FF9500' + '88' }}>
          <Text style={{ fontSize: 28 }}>🚀</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{triLang(lang, {
                ru: 'С возвращением!',
                uk: 'З поверненням!',
                es: '¡Qué bien verte de nuevo!',
                'pt-BR': "Que bom ver você de novo!",
                vi: "Rất vui được gặp lại bạn!",
                id: "Senang melihatmu lagi!",
                tr: "Seni tekrar görmek güzel!",
                pl: "Miło cię znów widzieć!",
            })}</Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>{triLang(lang, {
                ru: 'Весь день — +100% XP за каждый правильный ответ',
                uk: 'Весь день — +100% XP за кожну правильну відповідь',
                es: 'Todo el día: +100 % de XP por cada acierto',
                'pt-BR': "O dia todo: +100% de XP por cada acerto",
                vi: "Cả ngày: +100% XP cho mỗi câu đúng",
                id: "Sepanjang hari: +100% XP untuk tiap jawaban benar",
                tr: "Tüm gün: her doğru cevap için +%100 XP",
                pl: "Cały dzień: +100% XP za każdą dobrą odpowiedź",
            })}</Text>
          </View>
          <TapScale onPress={() => setComebackBanner(false)} style={{ padding: 4 }}><Ionicons name="close" size={18} color={t.textMuted}/></TapScale>
        </View>)}
      {showRepairCard && (<View style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: glassFill(t.bgCard, 0.5), borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#FF9500' + '99' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Text style={{ fontSize: 26 }}>🛠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{triLang(lang, {
                ru: 'Почини цепочку!',
                uk: 'Полагодь стрік!',
                es: '¡Recupera tu racha!',
                'pt-BR': "Recupere sua sequência!",
                vi: "Khôi phục chuỗi của bạn!",
                id: "Pulihkan rangkaianmu!",
                tr: "Serini geri al!",
                pl: "Odzyskaj swoją serię!",
            })}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>{triLang(lang, {
                ru: `Пройди 1 урок сегодня, чтобы сохранить цепочку · ${repairProgress}/1`,
                uk: `Пройди 1 урок сьогодні, щоб зберегти стрік · ${repairProgress}/1`,
                es: `Hoy completa 1 lección para no romper tu racha · ${repairProgress}/1`,
                'pt-BR': `Hoje complete 1 lição para não quebrar sua sequência · ${repairProgress}/1`,
                vi: `Hôm nay hoàn thành 1 bài học để không đứt chuỗi · ${repairProgress}/1`,
                id: `Hari ini selesaikan 1 pelajaran agar rangkaian tidak putus · ${repairProgress}/1`,
                tr: `Bugün serini bozmamak için 1 ders tamamla · ${repairProgress}/1`,
                pl: `Dziś ukończ 1 lekcję, żeby nie przerwać serii · ${repairProgress}/1`,
            })}</Text>
            </View>
            <TapScale onPress={() => setShowRepairCard(false)} style={{ padding: 4 }}><Ionicons name="close" size={18} color={t.textMuted}/></TapScale>
          </View>
          <View style={{ height: 6, backgroundColor: t.bgSurface2, borderRadius: 3 }}>
            <View style={{ height: 6, width: `${Math.min(1, repairProgress) * 100}%` as any, backgroundColor: '#FF9500', borderRadius: 3 }}/>
          </View>
        </View>)}
    </>);
    // ── Новый стиль главного экрана ──────────────────────────────────────────
    const renderNewHome = () => {
        const { level, progress } = getXPProgress(totalXP);
        const menuImages = getHomeMenuImages(themeMode);
        const lastLessonImage = getHomeLastLessonImage(themeMode);
        // зачем: имя урока раньше «запекалось» в состояние lastLesson при монтировании
        // и после смены языка интерфейса оставалось на старом языке (укр. экран —
        // русское название). Резолвим по текущему lang в рендере, как lessons.tsx.
        const lastLessonName = lastLesson == null
            ? ''
            : (lessonNamesForStudyTarget(lang, studyTarget)[lastLesson.id - 1] ?? lastLesson.name);
        const homeQuickRowPad = 8;
        const homeQuickRowGap = 14;
        const homeQuickTileWidth = Math.floor((SCREEN_W - homeQuickRowPad * 2 - homeQuickRowGap * 2) / 3);
        const homeQuickIconPlateSize = Math.min(118, Math.max(88, homeQuickTileWidth - 20));
        const homeQuickIconImageSize = Math.max(96, homeQuickIconPlateSize + 18);
        const homeQuickIconLegacySize = Math.max(96, homeQuickIconPlateSize + 14);
        const homeQuickIconRadius = isGoldTheme ? 26 : 30;
        const homePracticeIconSize = 64;
        const homePracticeIconImageSize = homePracticeIconSize;
        const homeTodayIconSize = 84;
        const homeTodayLeagueCardMinHeight = 120;
        const homeTodayCardPadX = 16;
        const homeTodayCardPadY = 12;
        // Плитка «Уроки» сохраняет push-презентацию /lessons_list, а вкладка с
        // книжкой открывает тот же раздел как retained-tab. Продолжение последнего
        // урока остаётся на отдельной плашке ниже.
        const quickItems = [
            {
                key: 'lesson',
                iconKey: 'lesson' as const,
                testID: 'home-quick-lesson',
                img: menuImages.lesson,
                label: triLang(lang, {
                    ru: 'Уроки', uk: 'Уроки', es: 'Lecciones', 'pt-BR': 'Lições',
                    vi: 'Bài học', id: 'Pelajaran', tr: 'Dersler', pl: 'Lekcje',
                }),
                onPress: () => { go('/lessons_list'); },
            },
            {
                key: 'practice',
                iconKey: 'practice' as const,
                testID: 'home-quick-practice',
                img: menuImages.practice,
                label: triLang(lang, {
                    ru: 'Практика', uk: 'Практика', es: 'Práctica', 'pt-BR': 'Prática',
                    vi: 'Luyện tập', id: 'Latihan', tr: 'Pratik', pl: 'Praktyka',
                }),
                onPress: () => {
                    hapticTap();
                    nav.push({
                            pathname: '/max_call_prestart',
                        params: { format: 'tutor', cefr: guessLearnerCefr() },
                    } as never);
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
        const visibleQuickItems = quickItems;
        // зачем: удалён мёртвый второй ряд плиток (activityQuickItems /
        // visibleActivityQuickItems / themedClubIcon) — он объявлялся, но никогда
        // не рендерился, поэтому «Аттестация» числилась в
        // коде как разделы главной, которых пользователь не видит. Реальный ряд —
        // visibleQuickItems (Урок / Практика / Карточки), см. рендер ниже.
        const xpPct = Math.min(100, Math.max(0, Math.round(progress * 100)));
        const eliteStatsCompact = CONTENT_W < 370;
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
        const eliteXpBadgeFontSize = Math.max(12, f.label - 1);
        const eliteWeekDotSize = eliteStatsCompact ? 25 : 27;
        const eliteWeekDayFontSize = Math.max(12, f.label - 1);
        const eliteCardY = eliteStatusEntrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
        const eliteCardScale = eliteStatusEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });
        const homeHeaderShardIconSource = coinIconForBalance(shardsBalance, themeMode);
        const homeHeaderShardIconSize = 34;
        const homeHeaderShardIconWidth = homeHeaderShardIconSize;
        // Компактная энергия: ОДНА иконка + «3/5» цифрами (вместо ряда иконок) —
        // освобождает место, вся шапка помещается в один ряд.
        const homeEnergyIconSize = 30;
        const homeEnergyCountLabel = `${Math.max(0, energyCount)}/${Math.max(1, energyMax)}`;
        const homeLeagueChestPct = homeLeagueChest
            ? Math.min(100, Math.round((homeLeagueChest.progress / Math.max(1, homeLeagueChest.goal)) * 100))
            : 0;
        const homeLeagueChestReady = homeLeagueChestPct >= 100;
        const homeLeagueChestAccent = homeLeagueChestReady ? leagueBonusPalette.readyAccent : leagueBonusPalette.accent;
        const homeLeagueChestFill = homeLeagueChestReady ? leagueBonusPalette.readyFill : leagueBonusPalette.fill;
        const openHomeProfile = () => {
            hapticTap();
            setHomeProfilePlayer({
                name: userName || 'Phraseman',
                points: Math.max(0, totalXP),
                totalXp: Math.max(0, totalXP),
                isMe: true,
                avatar: userAvatar,
                frame: userFrame,
                aura: userAvatarAura ?? undefined,
                streak,
                leagueId: engineLeague?.id ?? 0,
                isPremium,
                isVip,
                leagueCrownExpiresAt: homeLeagueCrownExpiresAt,
                leagueCrownCount: homeLeagueCrownCount,
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
        const showHomeFeatureTipCard = homeFeatureTipsHydrated && homeOnboardingDone && !homeFeatureTipsDone && homeFeatureTips.length > 0;
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
        const experimentalStatusLevelLabel = triLang(lang, {
            ru: 'Уровень',
            uk: 'Рівень',
            es: 'Nivel',
            'pt-BR': "Nível",
            vi: "Cấp",
            id: "Level",
            tr: "Seviye",
            pl: "Poziom",
        });
        // зачем: владелец вернул герой-модуль (серия+уровень+XP+неделя) как был.
        // Аватар слева занимает место бывшей стрик-колонки, поэтому кружки недели
        // получают больше ширины и не жмутся (24 → 28 в компактном режиме).
        const experimentalStatusWeekDotSize = eliteStatsCompact ? 26 : 30;
        const homeHeroAvatarSize = eliteStatsCompact ? 68 : 76;
        const homeHeroStreakIconSize = eliteStatsCompact ? 30 : 34;
        // Единица («дней») уступает место, когда ряд и так плотный: узкий экран
        // со щитом заморозки, либо трёхзначная серия.
        const homeHeroShowStreakUnit = !(eliteStatsCompact && (streakAtRisk && !freezeActive)) && displayStreak < 100;
        const renderHomeHeroStatus = () => (<Animated.View style={{
                opacity: eliteStatusEntrance,
                transform: [{ translateY: eliteCardY }, { scale: eliteCardScale }],
            }}>
              {/* зачем: владелец вернул раскладку «как было раньше» — слева аватарка,
                  а серия (иконка + число дней) уехала в правый верхний угол карточки.
                  Освободившиеся ~86px ширины забирает полоса XP и ряд дней недели. */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: eliteStatsCompact ? 12 : 14 }}>
                <TouchableOpacity
                  testID="home-hero-avatar-button"
                  activeOpacity={0.82}
                  // зачем: аватар в карточке ведёт в кастомизацию внешнего вида.
                  // Карточка профиля осталась за бюстом в верхнем хедере — две
                  // разные цели не должны дублировать друг друга.
                  onPress={(event) => {
                    event.stopPropagation?.();
                    hapticTap();
                    nav.push('/avatar_select');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={triLang(lang, {
                    ru: 'Изменить внешний вид',
                    uk: 'Змінити зовнішній вигляд',
                    es: 'Cambiar apariencia',
                    'pt-BR': 'Alterar aparência',
                    vi: 'Đổi diện mạo',
                    id: 'Ubah tampilan',
                    tr: 'Görünümü değiştir',
                    pl: 'Zmień wygląd',
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
                    level={level}
                    size={homeHeroAvatarSize}
                    auraId={effectiveUserAvatarAura}
                    ownerActive={homeRuntimeActive}
                  />
                </TouchableOpacity>

                <View testID="home-level-progress-panel" style={{ flex: 1, minWidth: 0, gap: eliteStatsCompact ? 10 : 12 }}>
                  {/* Ряд «Уровень N» + серия справа: серия больше не занимает
                      отдельную колонку, поэтому полоса XP тянется во всю ширину. */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <FlowText testID="home-level-title" provenance="authored" maxFontSizeMultiplier={1} style={{ flexShrink: 1, color: homeThemePanelText, fontSize: eliteStatsCompact ? 20 : 24, fontWeight: '800', lineHeight: eliteStatsCompact ? 24 : 29 }}>
                      {experimentalStatusLevelLabel} {level}
                    </FlowText>

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
                      <StreakChainIcon themeMode={themeMode} frozen={freezeActive} streakDays={streak} inactive={streakIconInactive} size={homeHeroStreakIconSize}/>
                      <Animated.Text maxFontSizeMultiplier={1} style={{ color: homeThemePanelText, fontSize: eliteStatsCompact ? 20 : 23, fontWeight: '800', lineHeight: eliteStatsCompact ? 24 : 27, transform: [{ scale: streakScaleAnim }], includeFontPadding: false }}>
                        {displayStreak}
                      </Animated.Text>
                      {/* зачем: на узком экране со щитом и трёхзначной серией ряд
                          переполнялся и «Уровень N» уходил в многоточие. Слово-единица
                          — наименее ценная часть (иконка + число читаются сами), поэтому
                          жертвуем им, а не заголовком. Для озвучки полная формулировка
                          остаётся в accessibilityLabel кнопки. */}
                      {homeHeroShowStreakUnit ? (
                        <Text maxFontSizeMultiplier={1} style={{ color: homeThemePanelMuted, fontSize: eliteStatsCompact ? 12 : 13, fontWeight: '700', lineHeight: eliteStatsCompact ? 15 : 16, includeFontPadding: false }}>
                          {homeStreakDaysLabel}
                        </Text>
                      ) : null}
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
                            transform: [{ scale: pressed ? 0.96 : 1 }],
                          })}
                        >
                          <LinearGradient colors={homeThemePanelGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                            <StreakChainIcon themeMode={themeMode} frozen streakDays={streak} size={24}/>
                          </LinearGradient>
                        </Pressable>
                      ) : null}
                    </TouchableOpacity>
                  </View>

                  <View style={{
                    height: 18,
                    borderRadius: 999,
                    overflow: 'hidden',
                    backgroundColor: isPaperHomeTheme ? homeThemeTrackBg : isGoldTheme ? 'rgba(0,0,0,0.36)' : 'rgba(255,255,255,0.09)',
                    borderWidth: 0,
                  }}>
                    <LinearGradient colors={isPaperHomeTheme ? [t.accent, t.accent] : isGoldTheme ? GOLD_GRADIENTS.progressMetal : [t.gold, '#FFF2B0', t.accent]} locations={isGoldTheme ? [0, 0.48, 1] : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${xpPct}%` as any, height: '100%', borderRadius: 999, overflow: 'hidden' }}>
                    </LinearGradient>
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
                    {/* Метка дня («Пн», «Ср»…) не обрезается в многоточие: ширина по
                        содержимому + разрешаем не сжимать (numberOfLines убран). */}
                    <Text maxFontSizeMultiplier={1} style={{ color: weekDayLabelColor(i, i === todayIdx ? t.accent : homeThemePanelText, homeThemePanelMuted), fontSize: eliteStatsCompact ? 10 : 11, fontWeight: '900', lineHeight: eliteStatsCompact ? 12 : 14, textAlign: 'center' }}>
                      {d}
                    </Text>
                  </View>);
                })}
              </View>
              {showStatsPulseHint && (<Animated.Text accessibilityLiveRegion="polite" style={{
                    color: t.accent,
                    fontSize: 13,
                    fontWeight: '700',
                    marginTop: 14,
                    textAlign: 'center',
                    lineHeight: 18,
                    transform: [{ scale: statsHintPulseAnim }],
                }}>
                  {s.home.statsPulseHint}
                </Animated.Text>)}
            </Animated.View>);
        return (<BouncyScrollView ref={homeScrollRef} scrollEnabled={pageScrollEnabled} showsVerticalScrollIndicator={false} decelerationRate="normal" onScroll={handleHomeScroll} onLayout={(event: LayoutChangeEvent) => {
            homeViewportHeightRef.current = event.nativeEvent.layout.height;
            refreshDailyPhraseVisibility();
        }} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: tabContentBottomPad, marginTop: -4 }}>

          {/* ХЕДЕР: один ряд. Слева — осколки + бюст (карточка профиля).
              Справа — энергия (1 иконка + цифры), видео, чаты, колокольчик (единый центр событий и сообщений команды).
              Имя убрано с главной: оно есть в карточке профиля по тапу на бюст. */}
          <Animated.View style={sectionStyle(0)}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 20, paddingBottom: 12, gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
                <TouchableOpacity activeOpacity={0.75} onPress={() => {
                    hapticTap();
                    nav.push('/shards_shop');
                  }} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 46, paddingHorizontal: 2 }}>
                  <Animated.View style={{ transform: [{ scale: shardsAnim }], flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Image source={homeHeaderShardIconSource} style={{ width: homeHeaderShardIconWidth, height: homeHeaderShardIconSize }} contentFit="contain" contentPosition="center" accessibilityLabel={triLang(lang, { ru: `Баланс: ${shardsBalance} жемчужин`, uk: `Баланс: ${shardsBalance} перлин`, es: `Saldo: ${shardsBalance} perlas`, 'pt-BR': `Saldo: ${shardsBalance} pérolas`, vi: `Số dư: ${shardsBalance} ngọc trai`, id: `Saldo: ${shardsBalance} mutiara`, tr: `Bakiye: ${shardsBalance} inci`, pl: `Saldo: ${shardsBalance} pereł` })} />
                    <Text style={{ color: isGoldTheme ? GOLD_RICH.paleGold : sketchShardAccent, fontSize: 14, fontWeight: '900' }}>{shardsBalance}</Text>
                  </Animated.View>
                </TouchableOpacity>
                {/* зачем: владелец попросил поменять местами бюст/профиль и колокольчик —
                    теперь колокольчик (с бейджем непрочитанных) идёт сразу после осколков,
                    а аватар/бюст профиля уходит на дальний правый край, где раньше был
                    колокольчик. onPress/бейдж каждой кнопки не тронуты. */}
                <NotificationCenterButton isHomeTabActive={homeRuntimeActive} homeFocusTick={focusTick} />
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
                <View style={{ flex: 1, minWidth: 0 }} />
                {/* зачем: хедер сжат с 5 целей до 3 (осколки/профиль/колокольчик) —
                {/* зачем: хедер — осколки/профиль/видео/колокольчик: владелец вернул
                    видео-иконку; энергия живёт чипом у CTA (не пугает на входе). */}
                {showHomeEnergy && (
                  <View ref={energyIconRef} collapsable={false} style={{ flexShrink: 0 }}>
                    <TouchableOpacity activeOpacity={0.7} accessibilityLabel={`qa-home-energy ${homeEnergyCountLabel}`} onPress={showEnergyTooltip} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 46, paddingHorizontal: 2 }}>
                      <EnergyIcon filled={energyCount > 0} themeColor={energyCount > 0 ? energyFilledColor : (isLightTheme ? energyEmptyTint : t.textGhost)} size={homeEnergyIconSize} animateChange={true} shouldShake={false} themeMode={themeMode}/>
                      <Text style={{ color: t.heroTextPrimary, fontSize: 14, fontWeight: '900' }} numberOfLines={1}>
                        {homeEnergyCountLabel}
                      </Text>
                      {energyBonus > 0 && (
                        <Text style={{ color: BONUS_ENERGY_COLOR, fontSize: 13, fontWeight: '900' }} numberOfLines={1}>
                          {`+${energyBonus}`}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                <LingmanVideosButton ownerActive={homeRuntimeActive} />
                {renderHomeProfileButton()}
              </View>
              {/* Анимация начисления осколков */}
              <Animated.Text style={{
                position: 'absolute', top: -18, right: 0,
                color: isGoldTheme ? GOLD_RICH.paleGold : sketchShardAccent, fontSize: 13, fontWeight: '700',
                opacity: shardsBonusAnim,
                transform: [{ translateY: shardsBonusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }],
            }}>{shardsBonusText}</Animated.Text>
            </View>
          </View>
          </Animated.View>

          {/* ── ФОКУС ДНЯ: три кольца + один CTA (Bevel-подход) ── */}
          {/* зачем: владелец заменил витрину статистики на one-glance статус дня —
              кольца Урок/Практика/Карточки, единственная акцентная кнопка и строка
              Компаса. Полная статистика — по тапу на статус-строку (/streak_stats). */}
          <Animated.View style={sectionStyle(1)}>
          {/* Герой: серия + уровень + XP + неделя (вернул владелец) — тап открывает статистику */}
          <TouchableOpacity testID="home-stats-card" activeOpacity={0.88} onPress={() => { hapticTap(); nav.push('/streak_stats'); }} style={[{ marginHorizontal: 8, marginBottom: 12 }, isGoldTheme ? goldShadow(3) : isOliveTheme ? oliveShadow(2) : null]} accessibilityRole="button" accessibilityLabel={s.home.statsCardTitle} accessibilityHint={s.home.statsPulseHint}>
            <LinearGradient colors={homeThemePanelGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 1, y: 1 }} end={{ x: 0, y: 0 }} style={{ borderRadius: isGoldTheme ? 18 : 24, borderWidth: 0, borderColor: 'transparent', padding: 18, minHeight: HOME_STATS_CARD_MIN_HEIGHT, overflow: 'hidden' }}>
              {isGoldTheme && <GoldBevel radius={18} intensity="strong"/>}
              {renderHomeHeroStatus()}
            </LinearGradient>
          </TouchableOpacity>

          {/* БЫСТРЫЙ СТАРТ: Уроки (полный список) / Практика / Карточки.
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
            <View style={{ marginHorizontal: 8, marginBottom: 10 }}>
              <FlowText testID="home-quickstart-title" provenance="authored" style={{ color: t.textPrimary, fontSize: Math.max(13, f.label), fontWeight: '900', letterSpacing: 0, textTransform: 'uppercase' }}>
                {triLang(lang, {
                  ru: 'Быстрый старт', uk: 'Швидкий старт', es: 'Inicio rápido', 'pt-BR': 'Início rápido',
                  vi: 'Bắt đầu nhanh', id: 'Mulai cepat', tr: 'Hızlı başlangıç', pl: 'Szybki start',
                })}
              </FlowText>
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
                          <LightSketchMenuImage source={item.img} width={homeQuickIconImageSize} height={homeQuickIconImageSize} lighten={false} align={getHomeMenuIconAlignment(themeMode, item.iconKey)} contentFit="contain" cachePolicy="memory-disk"/>
                        </View>
                        {/* зачем: подпись плитки быстрого старта — короткие лейблы («Уроки»,
                            «Практика», «Карточки») в реальных локалях умещаются в одну строку;
                            FlowText переносит целиком вместо обрезания на случай длинных переводов. */}
                        <FlowText testID="home-quick-tile-label" provenance="authored" style={{ color: isPaperHomeTheme ? homeThemePanelText : t.textPrimary, fontSize: Math.max(12, f.label - 1), fontWeight: '800', textAlign: 'center' }}>{item.label}</FlowText>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </View>




          {/* Очередь баннеров (лимит 1) — ПОД фокус-блоком: уведомление никогда
              не важнее первого учебного действия дня. */}
          {bannersJSX}
          </Animated.View>

          {/* ПРОДОЛЖИТЬ УРОК (карточка — только после первого захода в любой урок / last_opened_lesson) */}
          {(<Animated.View style={sectionStyle(2)}>

          {/* зачем: владелец (2026-08-02) — плашка плана заменена плашкой последнего
              открытого урока: один тап продолжает учёбу ровно там, где остановился.
              Форма — как у рядов «Сегодня» (вызовы дня): иконка 64, название,
              тонкий прогресс, счётчик справа. */}
          {lastLesson == null ? null : (
            <TouchableOpacity
              testID="home-continue-lesson"
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${s.home.continueBtn}: ${lastLessonName}`}
              activeOpacity={0.82}
              onPress={() => {
                hapticTap();
                logFeatureOpened('lesson_menu');
                trackFeatureOpened('lesson_menu').catch(() => { });
                perfNavStart('lesson_menu');
                router.push({ pathname: '/lesson_menu', params: { id: lastLesson.id } } as any);
              }}
              style={[{ marginHorizontal: 8, marginBottom: 12, borderRadius: 20, overflow: 'hidden' }, isGoldTheme ? goldShadow(1) : isOliveTheme ? oliveShadow(1) : null]}
            >
              <LinearGradient colors={homeThemePanelGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, paddingHorizontal: 16, overflow: 'hidden' }}>
                {isGoldTheme && <GoldBevel radius={20} intensity="quiet"/>}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 72 }}>
                  <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <LightSketchMenuImage source={lastLessonImage} width={64} height={64} lighten={false} contentFit="contain" cachePolicy="memory-disk"/>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <FlowText testID="home-continue-lesson-title" provenance="authored" style={{ color: homeThemePanelText, fontSize: Math.max(15, f.body), fontWeight: '700' }}>
                      {lastLessonName}
                    </FlowText>
                  </View>
                  <View style={{ minWidth: 30, alignItems: 'flex-end', flexShrink: 0 }}>
                    <Text style={{ color: homeThemePanelMuted, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] /* guard-ok: правый счётчик прогресса */ }}>
                      {Math.max(0, Math.min(50, lastLesson.progress))}/50
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

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
              accessibilityHint={triLang(lang, { ru: 'Коснись, чтобы перейти дальше. Смахни вправо или влево, чтобы листать подсказки.', uk: 'Торкнися, щоб перейти далі. Проведи вправо або вліво, щоб гортати підказки.', es: 'Toca para avanzar. Desliza a la derecha o a la izquierda para cambiar de consejo.', 'pt-BR': 'Toque para avançar. Deslize para a direita ou esquerda para trocar a dica.', vi: 'Chạm để tiếp tục. Vuốt sang phải hoặc trái để đổi mẹo.', id: 'Ketuk untuk lanjut. Geser kanan atau kiri untuk mengganti tips.', tr: 'İlerlemek için dokun. İpuçları arasında sağa veya sola kaydır.', pl: 'Dotknij, aby przejść dalej. Przesuń w prawo lub w lewo, aby zmieniać wskazówki.' })}
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
                          {triLang(lang, { ru: 'нажми на подсказку', uk: 'торкнися підказки', es: 'toca la pista', 'pt-BR': 'toque na dica', vi: 'chạm vào gợi ý', id: 'ketuk petunjuk', tr: 'ipucuna dokun', pl: 'dotknij podpowiedzi' })}
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

          {/* Persistent баннер "Сохрани прогресс" — для незалогиненных юзеров с XP ≥ 1000.
                Сам решает показываться или нет (см. SaveProgressBanner.tsx). */}
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <SaveProgressBanner ownerActive={homeRuntimeActive} />
          </View>

          {/* D4: секции ниже первого экрана (быстрый доступ, SRS-ряд, тренер, фраза дня,
              подвал) монтируются вторым проходом — belowFoldReady/InteractionManager. */}
          {belowFoldReady && (<>

          {/* СЕГОДНЯ: лига одним полотном */}
          <Animated.View style={sectionStyle(4)}>
          <>
          <View style={{ marginHorizontal: 8, marginBottom: 10 }}>
            <Text style={{ color: t.textPrimary, fontSize: Math.max(13, f.label), fontWeight: '900', letterSpacing: 0, textTransform: 'uppercase' }} numberOfLines={1}>
              {triLang(lang, {
                    ru: 'Сегодня',
                    uk: 'Сьогодні',
                    es: 'Hoy',
                    'pt-BR': "Hoje",
                    vi: "Hôm nay",
                    id: "Hari ini",
                    tr: "Bugün",
                    pl: "Dzisiaj",
                })}
            </Text>
          </View>
          {/* зачем: владелец попросил низ «не плашками» — одно полотно тоном,
              строки внутри разделены hairline (не рамка контейнера). Практика
              отсюда ушла: её вход — кольцо и Компас. Уроки ушли следом
              (2026-07-26): их вход — таббар и плитки быстрого доступа. */}
          <View style={{ marginHorizontal: 8, marginBottom: 12, gap: 10 }}>
            {homeLeagueChest ? (
              <TouchableOpacity
                testID="home-league-open"
                activeOpacity={0.88}
                onPress={() => { hapticTap(); nav.push('/league_screen'); }}
                style={{ borderRadius: 24, overflow: 'hidden' }}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, { ru: 'Цель лиги', uk: 'Ціль ліги', es: 'Meta de liga', 'pt-BR': 'Meta da liga', vi: 'Mục tiêu giải đấu', id: 'Target liga', tr: 'Lig hedefi', pl: 'Cel ligi' })}
              >
                <LinearGradient colors={leagueBonusPalette.card} locations={leagueBonusPalette.cardLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: homeTodayLeagueCardMinHeight, borderRadius: 24, borderWidth: 0, borderColor: leagueBonusPalette.border, backgroundColor: leagueBonusPalette.innerBg, paddingHorizontal: homeTodayCardPadX, paddingVertical: homeTodayCardPadY, overflow: 'hidden' }}>
                  <Image pointerEvents="none" source={leagueBonusGiftImage} style={{ position: 'absolute', right: -2, top: -16, width: 126, height: 126, opacity: homeLeagueChestReady ? 0.22 : 0.15, transform: [{ rotate: '-8deg' }] }} contentFit="contain" accessible={false}/>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <View style={{ width: homeTodayIconSize, height: homeTodayIconSize, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Image source={leagueBonusGiftImage} style={{ width: homeTodayIconSize, height: homeTodayIconSize, opacity: homeLeagueChestReady ? 1 : 0.94 }} contentFit="contain" accessibilityLabel={triLang(lang, { ru: 'Подарок лиги', uk: 'Подарунок ліги', es: 'Regalo de liga', 'pt-BR': 'Presente da liga', vi: 'Quà tặng của giải đấu', id: 'Hadiah liga', tr: 'Lig hediyesi', pl: 'Prezent ligi' })}/>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <FlowText testID="home-league-goal-title" provenance="authored" style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', lineHeight: f.bodyLg + 5 }}>
                        {triLang(lang, { ru: 'Цель лиги', uk: 'Ціль ліги', es: 'Meta de liga', 'pt-BR': 'Meta da liga', vi: 'Mục tiêu giải đấu', id: 'Target liga', tr: 'Lig hedefi', pl: 'Cel ligi' })}
                      </FlowText>
                      <Text style={{ color: leagueBonusPalette.textMuted, fontSize: f.label, fontWeight: '800', lineHeight: f.label + 4, marginTop: 2 }}>
                        {homeLeagueChest.leagueName}
                      </Text>
                    </View>
                    <Text style={{ color: homeLeagueChestAccent, fontSize: f.h2 + 2, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
                      {homeLeagueChestPct}%
                    </Text>
                  </View>
                  <View testID="home-league-progress" style={{ height: 9, borderRadius: 6, overflow: 'hidden', backgroundColor: leagueBonusPalette.track, borderWidth: 0, borderColor: leagueBonusPalette.trackBorder }}>
                    <LinearGradient colors={homeLeagueChestFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${homeLeagueChestPct}%` as any, borderRadius: 6 }}/>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}
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
          {surveyOffer ? (
            <View style={{ marginBottom: 14 }}>
              <SurveyTaskCard
                challenge={surveyOffer.challenge}
                onOpen={(challenge) => {
                  if (!challenge.survey) return;
                  hapticTap();
                  primeSurvey({ survey: challenge.survey, stableId: surveyOffer.stableId, dayKey: surveyOffer.dayKey, lang });
                  router.push({
                    pathname: '/survey_screen',
                    params: { surveyId: challenge.survey.surveyId, stableId: surveyOffer.stableId, dayKey: surveyOffer.dayKey, lang },
                  } as any);
                }}
              />
            </View>
          ) : null}
          <DailyPhraseCard variant="homeAdditional" homeCardVisible={dailyPhraseCardVisible} />
          </Animated.View>
          <HomeYoutubeFeatureCard ownerActive={homeRuntimeActive} studyTarget={studyTarget} />
          </>)}

      </BouncyScrollView>);
    };
    const energyTTAnchor = energyTooltip.anchor;
    const energyFallbackTop = insets.top +
        20 +
        Math.round(f.caption * 2.2) +
        f.h1 +
        6 +
        24 +
        12;
    const energyTooltipTop = energyTTAnchor && energyTTAnchor.w > 0
        ? energyTTAnchor.y + Math.max(energyTTAnchor.h, 24) + 8
        : energyFallbackTop;
    const energyTooltipLeftRaw = energyTTAnchor && energyTTAnchor.w > 0 ? energyTTAnchor.x : 16;
    const energyTooltipLeftClamped = Math.min(SCREEN_W - ENERGY_TOOLTIP_W - 8, Math.max(8, energyTooltipLeftRaw));
    const energyIconCenterX = energyTTAnchor && energyTTAnchor.w > 0
        ? energyTTAnchor.x + energyTTAnchor.w / 2
        : energyTooltipLeftClamped + 28;
    const energyArrowLeft = Math.min(ENERGY_TOOLTIP_W - 26, Math.max(12, Math.round(energyIconCenterX - energyTooltipLeftClamped - 7)));
    const titleModalButtonBorderColor = isGoldTheme ? GOLD_RICH.hairlineStrong : (isLightTheme ? 'rgba(202,138,4,0.32)' : 'rgba(252,211,77,0.42)');
    const titleModalButtonBg = isGoldTheme ? 'rgba(246,227,161,0.13)' : (isLightTheme ? 'rgba(202,138,4,0.12)' : 'rgba(252,211,77,0.13)');
    // Кэш вне рендера (см. computeHomeTitles): при неизменных входах — ноль работы.
    const { allTitles, earnedTitles, currentTitleKey } = computeHomeTitles({
        level,
        totalXP,
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
              accessibilityLabel={triLang(lang, { ru: 'Обновить', uk: 'Оновити', es: 'Actualizar', 'pt-BR': 'Atualizar', vi: 'Tải lại', id: 'Muat ulang', tr: 'Yenile', pl: 'Odśwież' })}
              activeOpacity={0.82}
              onPress={() => { setLoadFailedNoData(false); void loadData(); }}
              style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: t.accent + '22' }}
            >
              <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700' }}>
                {triLang(lang, { ru: 'Обновить', uk: 'Оновити', es: 'Actualizar', 'pt-BR': 'Atualizar', vi: 'Tải lại', id: 'Muat ulang', tr: 'Yenile', pl: 'Odśwież' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Energy Tooltip — Modal чтобы не обрезался */}
      <Modal visible={showHomeEnergy && energyTooltip.visible} transparent animationType="none" onRequestClose={() => setEnergyTooltip((p) => ({ ...p, visible: false }))}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setEnergyTooltip((p) => ({ ...p, visible: false }))}>
          <Animated.View pointerEvents="none" style={{
            position: 'absolute',
            top: energyTooltipTop,
            left: energyTooltipLeftClamped,
            opacity: energyTooltipAnim,
            transform: [
                { translateY: energyTooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
                { scale: energyTooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
            ],
        }}>
            <View style={{
            backgroundColor: '#1C1C1E',
            borderRadius: 16,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderWidth: 0,
            borderColor: 'transparent',
            width: ENERGY_TOOLTIP_W,
            shadowColor: '#000',
            shadowOpacity: 0.6,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 20,
        }}>
              <View style={{ position: 'absolute', top: -7, left: energyArrowLeft, width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: t.gold + '66' }}/>
              <View style={{ position: 'absolute', top: -5.5, left: energyArrowLeft + 1, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#1C1C1E' }}/>

              {/* Для премиум-пользователей показываем сообщение о безлимитной энергии */}
              {energyUnlimited ? (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>♾️</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', flex: 1 }}>
                    {triLang(lang, {
                ru: 'Энергия безлимитная',
                uk: 'Енергія безлімітна',
                es: 'Energía ilimitada',
                'pt-BR': "Energia ilimitada",
                vi: "Năng lượng không giới hạn",
                id: "Energi tak terbatas",
                tr: "Sınırsız enerji",
                pl: "Nieograniczona energia",
            })}
                  </Text>
                </View>) : (<>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: energyCount < energyMax ? 10 : 0 }}>
                    <Text style={{ fontSize: 16 }}>⚡</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', flex: 1 }}>
                      {`${energyCount}/${energyMax} · `}{triLang(lang, {
                ru: `1 энергия каждые ${energyRecoveryMinutes} мин`,
                uk: `1 енергія кожні ${energyRecoveryMinutes} хв`,
                es: `+1 punto de energía cada ${energyRecoveryMinutes} min`,
                'pt-BR': `+1 ponto de energia a cada ${energyRecoveryMinutes} min`,
                vi: `+1 điểm năng lượng mỗi ${energyRecoveryMinutes} phút`,
                id: `+1 poin energi setiap ${energyRecoveryMinutes} mnt`,
                tr: `Her ${energyRecoveryMinutes} dakikada +1 enerji puanı`,
                pl: `+1 punkt energii co ${energyRecoveryMinutes} min`,
            })}
                    </Text>
                  </View>
                  {energyCount < energyMax && timeUntilNextEnergy ? (<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2C2C2E', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginBottom: getNextEnergyUnlockLevel(level) !== null ? 8 : 0 }}>
                      <Text style={{ color: '#8E8E93', fontSize: 12 }}>
                        {triLang(lang, {
                    ru: 'Через',
                    uk: 'Через',
                    es: 'En',
                    'pt-BR': "Em",
                    vi: "Trong",
                    id: "Dalam",
                    tr: "Seviye",
                    pl: "Na",
                })}
                      </Text>
                      <Text style={{ color: t.gold, fontSize: 16, fontWeight: '800' }}>
                        {timeUntilNextEnergy}
                      </Text>
                    </View>) : null}
                  {getNextEnergyUnlockLevel(level) !== null && (<Text style={{ color: '#8E8E93', fontSize: 11, textAlign: 'center', marginTop: energyCount >= energyMax ? 4 : 0 }}>
                      {triLang(lang, {
                    ru: `Следующий слот энергии на уровне ${getNextEnergyUnlockLevel(level)}`,
                    uk: `Наступний слот енергії на рівні ${getNextEnergyUnlockLevel(level)}`,
                    es: `Al alcanzar el nivel ${getNextEnergyUnlockLevel(level)}, tu energía máxima subirá`,
                    'pt-BR': `Ao alcançar o nível ${getNextEnergyUnlockLevel(level)}, sua energia máxima vai aumentar`,
                    vi: `Khi đạt cấp ${getNextEnergyUnlockLevel(level)}, năng lượng tối đa của bạn sẽ tăng`,
                    id: `Saat mencapai level ${getNextEnergyUnlockLevel(level)}, energi maksimummu akan naik`,
                    tr: `${getNextEnergyUnlockLevel(level)}. seviyeye ulaşınca maksimum enerjin artacak`,
                    pl: `Po osiągnięciu poziomu ${getNextEnergyUnlockLevel(level)} twoja maksymalna energia wzrośnie`,
                })}
                    </Text>)}
                </>)}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <PlayerProfileModal
        player={homeProfilePlayer}
        myInfo={{
            name: userName || 'Phraseman',
            avatar: userAvatar,
            frame: userFrame,
            aura: userAvatarAura ?? undefined,
            totalXP,
            leagueId: engineLeague?.id ?? 0,
            streak,
        }}
        onClose={() => setHomeProfilePlayer(null)}
      />

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

              <ScrollView decelerationRate="normal" style={{ maxHeight: Math.min(SCREEN_H * 0.52, 430) }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 2 }}>
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
      {/* Streak Revive — окно 24ч после потери цепочки */}
      <StreakReviveModal visible={reviveOverlayVisible} offer={reviveOffer} onClose={() => {
            setReviveModalVisible(false);
        }} onRevived={(restored) => {
            setStreak(restored);
            setDisplayStreak(restored);
            setReviveOffer(null);
            // shardsBalance обновится через 'shards_balance_updated' слушатель ниже / следующий loadData.
            getShardsBalance().then(setShardsBalance).catch(() => { });
        }}/>

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
      {pendingLeagueResult && (<LeagueResultModal visible={leagueResultVisible} result={pendingLeagueResult} onClose={() => {
                const sig = getLeagueResultSignature(pendingLeagueResult);
                // Сначала ставим оба гарда СИНХРОННО (до любого await), чтобы
                // параллельно стартующий loadData не успел показать модалку заново.
                // consumed_sig в AsyncStorage уже записан markLeagueResultShown в момент
                // показа (см. ветку setPendingLeagueResult выше) — здесь только локальные рефы.
                dismissedLeagueResultRef.current = sig;
                dismissedLeagueResultThisSessionRef.current = true;
                setPendingLeagueResult(null);
                // Очистку AsyncStorage делаем фоном — её результат на UI не влияет.
                void clearPendingResult();
            }}/>)}
      {/* Приветствие-знакомство со спотлайт-подсветкой блоков — один раз при первом входе. */}
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
