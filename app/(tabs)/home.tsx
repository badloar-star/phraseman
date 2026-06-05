import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabSwipeLock } from '../tabSwipeLock';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, Dimensions, Modal, AppState, DeviceEventEmitter, InteractionManager, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewStyle, } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { useRouter } from 'expo-router';
import { usePremium } from '../../components/PremiumContext';
import { useTabNav } from '../TabContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import ScreenGradient from '../../components/ScreenGradient';
import { checkLeagueOnAppOpen, clearPendingResult, loadPendingResult, LEAGUES, LeagueResult, GroupMember, clubTierShortName } from '../league_engine';
import LeagueResultModal from '../LeagueResultModal';
import { DebugLogger } from '../debug-logger';
import { getMyWeekPoints, checkStreakLossPending, getWeekKey } from '../hall_of_fame_utils';
import { isRepairEligible, getRepairProgress } from '../streak_repair';
import { getReviveOffer, type StreakReviveOffer } from '../streak_revive';
import { enqueueThemedBlockingInfoAlert } from '../themed_blocking_alert_queue';
import StreakReviveModal from '../../components/StreakReviveModal';
import { consumeCelebration, getPendingCelebrationMarker, isCelebrationPending, } from '../premium_celebration_state';
import { consumeVipCelebration, getPendingVipCelebrationMarker, isVipCelebrationPending } from '../vip_celebration_state';
import PremiumCelebrationModal from '../../components/PremiumCelebrationModal';
import VipCelebrationModal from '../../components/VipCelebrationModal';
import { getTodayTasksSafe, loadTodayProgress, TaskProgress } from '../daily_tasks';
import { getXPProgress, getLevelFromXP, getNextEnergyUnlockLevel, type ThemeMode } from '../../constants/theme';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../../constants/goldTheme';
import { getLeagueBonusPalette } from '../../constants/leagueBonusPalette';
import { getLeagueBonusGiftImage } from '../../constants/leagueBonusGiftImages';
import { HELPFUL_REPORTS_CONFIRMED_KEY, SPECIAL_TITLES, TITLES, getEarnedSpecialTitles, getTitleString } from '../../constants/titles';
import { GREETINGS_ES } from '../../constants/greetings_es';
import { triLang, type Lang } from '../../constants/i18n';
import { BRAND_SHARDS_ES } from '../../constants/terms_es';
import PremiumCard from '../../components/PremiumCard';
import VipGreenUserName from '../../components/VipGreenUserName';
import { hapticTap } from '../../hooks/use-haptics';
import CircularProgress from '../../components/CircularProgress';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../../constants/avatars';
import AvatarView from '../../components/AvatarView';
import { isCustomAvatarValue } from '../../constants/custom_avatars';
import { checkAchievements, loadAchievementStates } from '../achievements';
import { USER_AVATAR_AURA_KEY, getEffectiveAvatarAuraId, normalizeAvatarAuraId } from '../../constants/avatar_auras';
import EnergyIcon from '../../components/EnergyIcon';
import { getAdaptiveEnergyIconLayout } from '../../components/energyIconLayout';
import { StreakChainIcon } from '../../components/StreakChainIcon';
import { loadAllMedals, countMedals } from '../medal_utils';
import { getTrainerTotalDue } from '../trainer_store';
import { getCurrentMultiplier } from '../xp_manager';
import DailyPhraseCard from '../../components/DailyPhraseCard';
import PersonalPlanHomeRouteCard from '../../components/PersonalPlanHomeRouteCard';
import { readPersonalPlanSnapshot, readPersonalPlanState, type PersonalPlanHomeSnapshot } from '../personal_plan_state';
import ReportErrorButton from '../../components/ReportErrorButton';
import SaveProgressBanner from '../../components/SaveProgressBanner';
import PremiumGoldUserName from '../../components/PremiumGoldUserName';
import LeagueCrownName from '../../components/LeagueCrownName';
import GoldBevel from '../../components/GoldBevel';
import CompassBevel from '../../components/CompassBevel';
import { useOverlayVisible } from '../../components/OverlayArbiter';
import { useEnergy } from '../../components/EnergyContext';
import { computeAllPercentiles } from '../leaderboard_stats';
import { getShardsBalance, peekLastKnownShardsBalance, spendShards, onStreakUpdated } from '../shards_system';
import { oskolokImageForPackShards } from '../oskolok';
import { buildLastLessonFromHydration, peekHomeScreenHydration, rememberHomeScreenHydration } from '../home_screen_hydration';
import AppMessagesInbox from '../../components/AppMessagesInbox';
import LingmanVideosButton from '../../components/LingmanVideosButton';
import { getForegroundUsageMs } from '../foreground_usage_ms';
import { logFeatureOpened } from '../firebase';
import { trackFeatureOpened } from '../user_stats';
import { perfMark, perfScreenMount, perfNavStart } from '../perf-monitor';
import { emitAppEvent, onAppEvent } from '../events';
import { ensureAnonUser } from '../cloud_sync';
import { FOREGROUND_CLOUD_REFRESH_DELAY_MS, FOREGROUND_LIGHT_REFRESH_DELAY_MS, getForegroundRefreshKind } from '../app_resume_policy';
import { fetchActiveLeagueCrowns, getLeagueChestGoal } from '../services/league_chest_rewards';
import { shouldShowLeagueRace } from '../league_race_visibility';
import { getHomeMenuImages } from '../home_menu_icons';
import { isStreakFreezeActiveToday } from '../streak_freeze';
import {
    addDaysToDateKey,
    readCurrentStreakWeekMarkers,
    recordStreakWeekMarker,
    type StreakWeekDayMarkerKind,
} from '../streak_week_markers';
import { lessonNameForStudyTarget, lessonNamesForStudyTarget } from '../lesson_titles_for_study_target';
import { dailyTasksAchievementAllDoneStreakKey, lastOpenedLessonKey, lessonProgressKey } from '../target_storage_keys';
import { formatLeagueChatUnreadBadge } from '../league_chat_unread';
import { useLeagueChatUnread } from '../use_league_chat_unread';
import { getStreakFireIconVariant, getStreakFreezeIconVariant } from '../../constants/streakIconAssets';
import { COMPASS_GRADIENTS, COMPASS_RICH, COMPASS_SURFACE_LOCATIONS, compassShadow } from '../../constants/compassTheme';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
/** Ширина всплывающей подсказки энергии (clamp по экрану, стрелка привязана к иконкам). */
const ENERGY_TOOLTIP_W = 220;
const CONTENT_W = Math.min(SCREEN_W, 640);
const CARD_W = (CONTENT_W - 32 - 10) / 2;
const USE_ELITE_HOME_STATUS = true;
// Rollback: set false to return to the previous elite home status card.
const HOME_STATUS_DENSE_PROGRESS_EXPERIMENT = true;
// Android Fabric/Yoga can abort when NativeAnimated mutates Home view props during startup.
const HOME_ANIMATION_USE_NATIVE_DRIVER = false;
const HOME_SELECTED_TITLE_KEY = 'home_selected_title_key_v1';
const FREE_HOME_PLAN_CTA_MODE_KEY = 'free_home_plan_cta_mode_v1';
type FreeHomePlanCtaMode = 'choosePlan' | 'continueLesson';
const STREAK_WEEK_FREEZE_ICE = require('../../assets/images/streak_overlays/streak-freeze-ice.png');
/** Сесійний прапор: після першого успішного loadData дочірні mounts не показують «рівень 1» кадр. */
let homeStatsLoadedOnce = false;
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
    dailyAllDoneStreak: number;
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
    catch { }
    const idx = Math.floor(Math.random() * pool.length);
    try {
        await AsyncStorage.setItem(HOME_DAILY_GREETING_KEY, JSON.stringify({ day: today, lang, idx } satisfies DailyGreetingStored));
    }
    catch { }
    return pool[idx]!;
}
function parseStoredCount(raw: string | null): number {
    const n = parseInt(raw ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}
function parseStoredStreak(raw: string | null): number {
    if (!raw)
        return 0;
    const direct = parseStoredCount(raw);
    if (direct > 0)
        return direct;
    try {
        const parsed = JSON.parse(raw) as { streak?: unknown };
        const streak = typeof parsed?.streak === 'number' ? parsed.streak : parseInt(String(parsed?.streak ?? ''), 10);
        return Number.isFinite(streak) && streak > 0 ? streak : 0;
    }
    catch {
        return 0;
    }
}
type HomeMenuIconAlign = {
    x: number;
    y: number;
};
type HomeMenuIconAlignKey = 'lesson' | 'quizes' | 'cards' | 'dayTasks' | 'league' | 'test' | 'practice';
const HOME_MENU_ICON_ALIGNMENT: Partial<Record<ThemeMode, Partial<Record<HomeMenuIconAlignKey, HomeMenuIconAlign>>>> = {
    compass: {
        lesson: { x: -8.5 / 256, y: -8.5 / 256 },
        quizes: { x: 1.5 / 256, y: -6 / 256 },
        cards: { x: 9 / 256, y: -11.5 / 256 },
        dayTasks: { x: -0.5 / 256, y: 4 / 256 },
        league: { x: -0.5 / 256, y: -1.5 / 256 },
        test: { x: 0, y: 0.5 / 256 },
        practice: { x: 0, y: 3.5 / 256 },
    },
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
function buildHomeLeagueChest(group: GroupMember[], leagueName: string, leagueId: number): {
    leagueName: string;
    progress: number;
    goal: number;
    myContribution: number;
    leaderName: string;
    leaderPoints: number;
} | null {
    if (!group.length)
        return null;
    const sorted = [...group].sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0));
    const goal = getLeagueChestGoal(leagueId);
    const total = sorted.reduce((sum, p) => sum + Math.max(0, Math.floor(Number(p.points) || 0)), 0);
    const leader = sorted[0];
    return {
        leagueName,
        progress: Math.min(goal, total),
        goal,
        myContribution: Math.max(0, Math.floor(Number(sorted.find((p) => p.isMe)?.points) || 0)),
        leaderName: leader?.name || 'Player',
        leaderPoints: Math.max(0, Math.floor(Number(leader?.points) || 0)),
    };
}
function buildFallbackHomeLeagueChest(lang: Lang) {
    return {
        leagueName: triLang(lang, {
            ru: 'Лига недели',
            uk: 'Ліга тижня',
            es: 'Liga semanal',
            'pt-BR': "Liga semanal",
            vi: "Giải đấu tuần",
            id: "Liga mingguan",
            tr: "Haftalık lig",
            pl: "Liga tygodnia",
        }),
        progress: 0,
        goal: getLeagueChestGoal(0),
        myContribution: 0,
        leaderName: 'Player',
        leaderPoints: 0,
    };
}
export default function HomeScreen() {
    const router = useRouter();
    const { theme: t, isDark, f, themeMode } = useTheme();
    const { s, lang } = useLang();
    const { studyTarget } = useStudyTarget();
    const insets = useSafeAreaInsets();
    const { goToTab, activeIdx, focusTick } = useTabNav();
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
    const hh = homeStatsLoadedOnce ? peekHomeScreenHydration(studyTarget) : null;
    const [userName, setUserName] = useState(() => hh?.userName ?? '');
    const [streak, setStreak] = useState(() => hh?.streak ?? 0);
    const [displayStreak, setDisplayStreak] = useState(() => hh?.displayStreak ?? hh?.streak ?? 0);
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
        : s.home.streakDays;
    const streakScaleAnim = useRef(new Animated.Value(1)).current;
    const [totalXP, setTotalXP] = useState(() => hh?.totalXP ?? 0);
    const [homeStatsReady, setHomeStatsReady] = useState(() => !!(homeStatsLoadedOnce && hh));
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
    const [freeHomePlanCtaMode, setFreeHomePlanCtaMode] = useState<FreeHomePlanCtaMode>('choosePlan');
    const freeHomePlanCtaStartXRef = useRef<number | null>(null);
    const freeHomePlanCtaDxRef = useRef(0);
    const freeHomePlanCtaSwipedRef = useRef(false);
    // Початкове значення підбираємо за поточною мовою інтерфейсу,
    // щоб юзер з UK не бачив миготливе російське «Привет,» до завантаження `loadData`.
    const [greeting, setGreeting] = useState(() => triLang(lang, {
        ru: 'Привет,',
        uk: 'Привіт,',
        es: 'Hola,',
        'pt-BR': "Olá,",
        vi: "Xin chào,",
        id: "Halo,",
        tr: "Merhaba,",
        pl: "Cześć,",
    }));
    const [taskProgress, setTaskProgress] = useState<TaskProgress[]>([]);
    const [tasksCompleted, setTasksCompleted] = useState(0);
    /** Сколько сегментов на плитке «Задания» — как на экране заданий (тот же getTodayTasksSafe). */
    const [dailyTaskBarCount, setDailyTaskBarCount] = useState(3);
    const [engineLeague, setEngineLeague] = useState<typeof LEAGUES[0] | null>(null);
    const { isPremium, isVip, hasPremiumAccess } = usePremium();
    // [SRS] Количество фраз, готовых к повторению сегодня.
    // Временно: только __DEV__ (в стор-сборках карточка скрыта, запрос не делаем).
    // >0 = карточка над «Тест/Экзамен», ведёт на /trainer.
    const [dueCount, setDueCount] = useState(0);
    const [userAvatar, setUserAvatar] = useState(() => hh?.userAvatar ?? '🐣');
    const [userAvatarAura, setUserAvatarAura] = useState<string | null>(null);
    const effectiveUserAvatarAura = getEffectiveAvatarAuraId(userAvatarAura, isPremium, isVip);
    const [userFrame, setUserFrame] = useState(() => hh?.userFrame ?? 'plain');
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
    const [titleModalVisible, setTitleModalVisible] = useState(false);
    const [titleModalTab, setTitleModalTab] = useState<'earned' | 'all'>('earned');
    const [selectedTitleKey, setSelectedTitleKey] = useState<string | null>(null);
    const selectedTitleHydratedRef = useRef(false);
    const [specialTitleStats, setSpecialTitleStats] = useState<HomeSpecialTitleStats>({
        helpfulReportsConfirmed: 0,
        dailyAllDoneStreak: 0,
        earnedAchievementIds: new Set<string>(),
    });
    // Premium celebration: после IAP-покупки или admin-grant с timestamp новее last seen.
    const [celebrationVisible, setCelebrationVisible] = useState(false);
    const [celebrationMarker, setCelebrationMarker] = useState<string | null>(null);
    const celebrationOverlayVisible = useOverlayVisible('premiumCelebration', celebrationVisible);
    const [vipCelebrationVisible, setVipCelebrationVisible] = useState(false);
    const [vipCelebrationMarker, setVipCelebrationMarker] = useState<string | null>(null);
    const vipCelebrationQueuedMarkerRef = useRef<string | null>(null);
    const vipCelebrationOverlayVisible = useOverlayVisible('vipCelebration', vipCelebrationVisible);
    const [premiumFreezeUsed, setPremiumFreezeUsed] = useState(() => hh?.premiumFreezeUsed ?? false);
    const [pageScrollEnabled, setPageScrollEnabled] = useState(true);
    const [medalCounts, setMedalCounts] = useState({ bronze: 0, silver: 0, gold: 0 });
    const [totalXPMulti, setTotalXPMulti] = useState(() => hh?.totalXPMulti ?? 1);
    const { energy: energyCount, bonusEnergy: energyBonus, maxEnergy: energyMax, recoveryIntervalMs: energyRecoveryIntervalMs, formattedTime: timeUntilNextEnergy, isUnlimited: energyUnlimited } = useEnergy();
    const showHomeEnergy = !hasPremiumAccess;
    const energyRecoveryMinutes = Math.max(1, Math.round(energyRecoveryIntervalMs / 60000));
    const isSketchLightTheme = themeMode === 'minimalLight';
    const isLightTheme = isSketchLightTheme;
    const isGoldTheme = themeMode === 'gold';
    const isCompassTheme = themeMode === 'compass';
    const goldMetal = GOLD_RICH.metalGold;
    const goldBright = GOLD_RICH.champagne;
    const goldHairline = GOLD_RICH.hairline;
    const goldSoftBg = 'rgba(214,179,90,0.055)';
    const goldIconPlateBg = 'rgba(246,227,161,0.026)';
    const goldPanelBg = 'rgba(10,10,10,0.72)';
    const compassPanel = COMPASS_GRADIENTS.premiumPanel;
    const compassTile = COMPASS_GRADIENTS.raisedTile;
    const compassHairline = COMPASS_RICH.hairline;
    const compassHairlineStrong = COMPASS_RICH.hairlineStrong;
    const compassPanelBg = 'rgba(24,24,25,0.92)';
    const compassIconPlateBg = 'rgba(255,230,181,0.08)';
    const compassSubtleTrack = 'rgba(255,230,181,0.10)';
    const compassHomeRadius = 10;
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
    const isPaperHomeTheme = themeMode === 'minimalLight';
    const lightPanelBg = isSketchLightTheme ? 'rgba(255,252,246,0.94)' : 'rgba(255,255,255,0.50)';
    const lightPanelBorder = isSketchLightTheme ? 'rgba(52,45,35,0.28)' : 'rgba(255,255,255,0.48)';
    const lightPanelIconBg = isSketchLightTheme ? 'rgba(63,55,44,0.13)' : 'rgba(255,255,255,0.28)';
    const lightPanelChevronBg = isSketchLightTheme ? 'rgba(63,55,44,0.14)' : 'rgba(255,255,255,0.58)';
    const sketchHomePanelGradient = ['rgba(255,253,246,0.98)', 'rgba(237,227,210,0.94)'] as [string, string];
    const homeThemePanelGradient = isGoldTheme
        ? goldPremiumPanel
        : isCompassTheme
            ? compassPanel
            : isPaperHomeTheme
                ? sketchHomePanelGradient
                : t.cardGradient;
    const homeThemePanelBorder = isGoldTheme
        ? GOLD_RICH.hairlineStrong
        : isCompassTheme
            ? compassHairlineStrong
            : isPaperHomeTheme
                ? lightPanelBorder
                : 'rgba(103,153,229,0.26)';
    const homeThemePanelText = isPaperHomeTheme ? '#171615' : t.textPrimary;
    const homeThemePanelMuted = isPaperHomeTheme ? '#48443C' : t.textMuted;
    const homeThemePanelAccent = isPaperHomeTheme ? t.accent : (isLightTheme ? t.textSecond : t.gold);
    const homeThemeIconPlateBg = isGoldTheme
        ? 'rgba(18,14,8,0.92)'
        : isCompassTheme
            ? '#10100C'
            : isPaperHomeTheme
                ? lightPanelIconBg
                : 'rgba(40,47,58,0.96)';
    const homeThemeChevronBg = isGoldTheme ? goldSoftBg : isPaperHomeTheme ? lightPanelChevronBg : 'rgba(255,255,255,0.09)';
    const homeThemeTrackBg = isPaperHomeTheme ? 'rgba(56,52,44,0.18)' : 'rgba(83,96,116,0.72)';
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
            elevation: 6,
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
    const [personalPlanSnapshot, setPersonalPlanSnapshot] = useState<PersonalPlanHomeSnapshot | null>(() => hh?.personalPlanSnapshot ?? null);
    const [hasActivePersonalPlanState, setHasActivePersonalPlanState] = useState(() => !!hh?.personalPlanSnapshot);
    const refreshDailyTaskSummary = useCallback(async () => {
        try {
            const taskList = await getTodayTasksSafe(studyTarget);
            const progress = await loadTodayProgress(taskList, studyTarget);
            if (!mountedRef.current)
                return;
            setTaskProgress(progress);
            setDailyTaskBarCount(taskList.length > 0 ? taskList.length : 3);
            const progressById = new Map(progress.map((row) => [row.taskId, row]));
            setTasksCompleted(taskList.filter((task) => progressById.get(task.id)?.completed === true).length);
        }
        catch {
            /* keep previous summary */
        }
    }, [studyTarget]);
    const [shardsBalance, setShardsBalance] = useState(() => peekLastKnownShardsBalance() ?? hh?.shardsBalance ?? 0);
    const [homeXpPercentile, setHomeXpPercentile] = useState<number | null>(null);
    const [homeLeagueCrownExpiresAt, setHomeLeagueCrownExpiresAt] = useState(() => hh?.homeLeagueCrownExpiresAt ?? 0);
    const [homeLeagueRaceVisible, setHomeLeagueRaceVisible] = useState(() => hh?.homeLeagueRaceVisible ?? false);
    const [homeLeagueChest, setHomeLeagueChest] = useState<{
        leagueName: string;
        progress: number;
        goal: number;
        myContribution: number;
        leaderName: string;
        leaderPoints: number;
    } | null>(() => hh?.homeLeagueChest ?? buildFallbackHomeLeagueChest(lang));
    const homeLeagueChatUnreadCount = useLeagueChatUnread({ active: false });
    const shardsAnim = useRef(new Animated.Value(1)).current;
    const shardsBonusAnim = useRef(new Animated.Value(0)).current;
    const [shardsBonusText, setShardsBonusText] = useState('');
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
    const eliteStatusShimmer = useRef(new Animated.Value(0)).current;
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
        loadData();
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER }).start();
    }, [lang, studyTarget]);
    useEffect(() => {
        if (!USE_ELITE_HOME_STATUS)
            return;
        eliteStatusEntrance.setValue(1);
        eliteQuickTileEntrance.forEach((anim) => anim.setValue(1));
        eliteActivityTileEntrance.forEach((anim) => anim.setValue(1));
        const shimmerLoop = Animated.loop(Animated.sequence([
            Animated.timing(eliteStatusShimmer, { toValue: 1, duration: 2800, useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER }),
            Animated.delay(1100),
            Animated.timing(eliteStatusShimmer, { toValue: 0, duration: 0, useNativeDriver: HOME_ANIMATION_USE_NATIVE_DRIVER }),
        ]));
        shimmerLoop.start();
        return () => {
            shimmerLoop.stop();
        };
    }, [eliteActivityTileEntrance, eliteQuickTileEntrance, eliteStatusEntrance, eliteStatusShimmer, lang]);
    // Миграция v2: пороги XP удвоены — умножаем сохранённый XP на 2 (один раз).
    // Новые пользователи помечаются как "мигрированные" в handleOnboardingDone (_layout.tsx),
    // поэтому сюда попадают только старые пользователи со старой формулой XP.
    // Legacy marker only. Real XP restore runs in xp_manager.migrateXPFormulaV2().
    useEffect(() => {
        (async () => {
            const migrated = await AsyncStorage.getItem('xp_migration_v2');
            if (migrated)
                return;
            await AsyncStorage.setItem('xp_migration_v2', '1');
        })();
    }, [studyTarget]);
    useEffect(() => {
        mountedRef.current = true;
        perfScreenMount('home');
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
                        if (refreshKind === 'cloud')
                            loadData();
                        else
                            void refreshDailyTaskSummary();
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
        const xpSub = DeviceEventEmitter.addListener('xp_changed', () => { loadData(); });
        const dailyTaskCompletedSub = onAppEvent('daily_task_completed', () => { void refreshDailyTaskSummary(); });
        const dailyTaskClaimedSub = onAppEvent('daily_task_reward_claimed', () => { void refreshDailyTaskSummary(); });
        const dailyTaskRerolledSub = onAppEvent('daily_task_rerolled', () => { void refreshDailyTaskSummary(); });
        const personalPlanSub = onAppEvent('personal_plan_updated', (payload) => {
            if (payload?.snapshot) {
                setHasActivePersonalPlanState(true);
                setPersonalPlanSnapshot(payload.snapshot);
            }
            else if (payload?.planId) {
                setHasActivePersonalPlanState(true);
            }
            loadData();
        });
        const leagueStateSub = onAppEvent('league_local_state_updated', () => { loadData(); });
        const crownSub = onAppEvent('league_crown_updated', ({ expiresAt }) => {
            setHomeLeagueCrownExpiresAt(expiresAt);
        });
        // Слушаем событие начисления осколков
        const shardsSub = DeviceEventEmitter.addListener('shards_earned', (payload: {
            amount: number;
        }) => {
            getShardsBalance().then(bal => {
                setShardsBalance(bal);
                setShardsBonusText(`+${payload.amount} 💎`);
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
            void getReviveOffer().then((o) => {
                if (!mountedRef.current || !o)
                    return;
                setReviveOffer(o);
                setReviveModalVisible(true);
            });
        });
        const refreshWeekMarkers = () => {
            void readCurrentStreakWeekMarkers().then((markers) => {
                if (mountedRef.current) setWeekMarkers(markers);
            }).catch(() => {});
        };
        const freezeUpdatedSub = onAppEvent('streak_freeze_updated', refreshWeekMarkers);
        const revivedSub = onAppEvent('streak_revived', () => {
            refreshWeekMarkers();
            loadData();
        });
        return () => {
            mountedRef.current = false;
            sub.remove();
            if (resumeTimer)
                clearTimeout(resumeTimer);
            resumeTask?.cancel?.();
            xpSub.remove();
            dailyTaskCompletedSub.remove();
            dailyTaskClaimedSub.remove();
            dailyTaskRerolledSub.remove();
            personalPlanSub.remove();
            leagueStateSub.remove();
            crownSub.remove();
            shardsSub.remove();
            reviveOfferSub.remove();
            freezeUpdatedSub.remove();
            revivedSub.remove();
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
    // Debounce-флаг: если loadData уже выполняется — не запускаем повторно.
    // Устраняет 3 одновременных вызова (focusTick + activeIdx + AppState) при возврате на главную.
    // needsReloadRef: если вызов был пропущен во время загрузки — повторим после завершения.
    useEffect(() => {
        let cancelled = false;
        AsyncStorage.getItem(FREE_HOME_PLAN_CTA_MODE_KEY)
            .then((value) => {
                if (cancelled) return;
                setFreeHomePlanCtaMode(value === 'continueLesson' ? 'continueLesson' : 'choosePlan');
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);
    const setFreeHomePlanCtaModePersisted = useCallback((mode: FreeHomePlanCtaMode) => {
        setFreeHomePlanCtaMode(mode);
        AsyncStorage.setItem(FREE_HOME_PLAN_CTA_MODE_KEY, mode).catch(() => {});
    }, []);
    const handleFreeHomePlanCtaTouchStart = useCallback((event: any) => {
        if (hasPremiumAccess) return;
        freeHomePlanCtaStartXRef.current = event?.nativeEvent?.touches?.[0]?.pageX ?? null;
        freeHomePlanCtaDxRef.current = 0;
        freeHomePlanCtaSwipedRef.current = false;
    }, [hasPremiumAccess]);
    const handleFreeHomePlanCtaTouchMove = useCallback((event: any) => {
        if (hasPremiumAccess || freeHomePlanCtaStartXRef.current == null) return;
        const pageX = event?.nativeEvent?.touches?.[0]?.pageX;
        if (typeof pageX !== 'number') return;
        freeHomePlanCtaDxRef.current = pageX - freeHomePlanCtaStartXRef.current;
    }, [hasPremiumAccess]);
    const handleFreeHomePlanCtaTouchEnd = useCallback(() => {
        if (hasPremiumAccess) return;
        const dx = freeHomePlanCtaDxRef.current;
        freeHomePlanCtaStartXRef.current = null;
        freeHomePlanCtaDxRef.current = 0;
        if (Math.abs(dx) < 44) return;
        if (dx < 0 && lastLesson != null) {
            freeHomePlanCtaSwipedRef.current = true;
            setFreeHomePlanCtaModePersisted('continueLesson');
            hapticTap();
        }
        else if (dx > 0) {
            freeHomePlanCtaSwipedRef.current = true;
            setFreeHomePlanCtaModePersisted('choosePlan');
            hapticTap();
        }
        if (freeHomePlanCtaSwipedRef.current) {
            setTimeout(() => {
                freeHomePlanCtaSwipedRef.current = false;
            }, 220);
        }
    }, [hasPremiumAccess, lastLesson, setFreeHomePlanCtaModePersisted]);
    const handleFreeHomeChoosePlanPress = useCallback(() => {
        if (freeHomePlanCtaSwipedRef.current) return;
        hapticTap();
        router.push('/personal_plan_setup' as any);
    }, [router]);
    const handleFreeHomeContinueLessonPress = useCallback(() => {
        if (freeHomePlanCtaSwipedRef.current || lastLesson == null) return;
        hapticTap();
        router.push({ pathname: '/lesson_menu', params: { id: lastLesson.id } });
    }, [lastLesson, router]);
    const loadingRef = useRef(false);
    const needsReloadRef = useRef(false);
    const deferredReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const deferredReloadTaskRef = useRef<{ cancel?: () => void } | null>(null);
    const deferredReadyTaskRef = useRef<{ cancel?: () => void } | null>(null);
    const markHomeStatsReady = useCallback(() => {
        deferredReadyTaskRef.current?.cancel?.();
        deferredReadyTaskRef.current = InteractionManager.runAfterInteractions(() => {
            deferredReadyTaskRef.current = null;
            if (mountedRef.current)
                setHomeStatsReady(true);
        });
    }, []);
    useEffect(() => {
        void refreshDailyTaskSummary();
        loadData();
    }, [focusTick, studyTarget, refreshDailyTaskSummary]);
    useEffect(() => {
        if (activeIdx === 0) {
            void refreshDailyTaskSummary();
            loadData();
        }
    }, [activeIdx, studyTarget, refreshDailyTaskSummary]);
    useEffect(() => {
        let cancelled = false;
        void ensureAnonUser()
            .then((uid) => {
            if (!uid)
                return null;
            return fetchActiveLeagueCrowns([uid]).then((crowns) => crowns[uid]?.expiresAt ?? 0);
        })
            .then((expiresAt) => {
            if (!cancelled && typeof expiresAt === 'number')
                setHomeLeagueCrownExpiresAt(expiresAt);
        })
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, [focusTick]);
    /** Подсказка по блоку статистики: один раз после 3 ч в приложении, пульс 10 с, затем скрыть навсегда. */
    useEffect(() => {
        if (!homeStatsReady || activeIdx !== 0)
            return;
        let cancelled = false;
        let pollId: ReturnType<typeof setInterval> | null = null;
        let hideTimer: ReturnType<typeof setTimeout> | null = null;
        let pulseLoop: Animated.CompositeAnimation | null = null;
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
                    if (pollId) {
                        clearInterval(pollId);
                        pollId = null;
                    }
                }
            }
            catch { /* */ }
        };
        void check();
        pollId = setInterval(() => { void check(); }, 30000);
        return () => {
            cancelled = true;
            if (pollId)
                clearInterval(pollId);
            if (hideTimer)
                clearTimeout(hideTimer);
            pulseLoop?.stop();
            statsHintPulseAnim.setValue(1);
            statsPulseSessionRef.current = false;
            setShowStatsPulseHint(false);
        };
    }, [homeStatsReady, activeIdx, focusTick, statsHintPulseAnim]);
    useEffect(() => {
        if (homeStatsReady && activeIdx === 0) {
            emitAppEvent('app_first_content_ready');
        }
    }, [homeStatsReady, activeIdx]);
    const loadData = async () => {
        if (loadingRef.current) {
            needsReloadRef.current = true;
            return;
        }
        loadingRef.current = true;
        needsReloadRef.current = false;
        if (streakTimerRef.current) {
            clearTimeout(streakTimerRef.current);
            streakTimerRef.current = null;
        }
        streakScaleAnim.stopAnimation();
        streakScaleAnim.setValue(1);
        const endPerf = perfMark('home:loadData');
        try {
            const [name, streakVal, weekData, currentWeekMarkers, weekPts, xpStored, shardsBal, storedTitleKey, activePlanState, planSnapshot] = await Promise.all([
                AsyncStorage.getItem('user_name'),
                AsyncStorage.getItem('streak_count'),
                AsyncStorage.getItem('week_days_done'),
                readCurrentStreakWeekMarkers(),
                getMyWeekPoints(),
                AsyncStorage.getItem('user_total_xp'),
                getShardsBalance(),
                AsyncStorage.getItem(HOME_SELECTED_TITLE_KEY),
                readPersonalPlanState(),
                getTrainerTotalDue(studyTarget)
                    .then((dueCount) => readPersonalPlanSnapshot({
                    duePracticeCount: dueCount,
                    dueTrainerCount: dueCount,
                }))
                    .catch(() => readPersonalPlanSnapshot()),
            ]);
            setWeekMarkers(currentWeekMarkers);
            setShardsBalance(shardsBal);
            if (mountedRef.current) {
                const nextHasActivePersonalPlan = activePlanState != null || planSnapshot != null;
                setHasActivePersonalPlanState(nextHasActivePersonalPlan);
                setPersonalPlanSnapshot((previous) => planSnapshot ?? (nextHasActivePersonalPlan ? previous : null));
            }
            if (!selectedTitleHydratedRef.current) {
                selectedTitleHydratedRef.current = true;
                setSelectedTitleKey(storedTitleKey || null);
            }
            if (name)
                setUserName(name);
            const currentStreakNum = parseInt(streakVal || '0') || 0;
            if (streakVal)
                setStreak(currentStreakNum);
            const lastStreakShown = parseInt(await AsyncStorage.getItem('streak_last_shown') || '0') || 0;
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
            if (xpStored) {
                const newXP = parseInt(xpStored) || 0;
                setTotalXP(newXP);
                const curLvl = getLevelFromXP(newXP);
                // Обновляем UI аватара/рамки по текущему уровню
                // (запись в AsyncStorage и детект level-up делает xp_manager.ts)
                const [[, savedAv], [, savedFr], [, savedAura]] = await AsyncStorage.multiGet(['user_avatar', 'user_frame', USER_AVATAR_AURA_KEY]);
                setUserAvatar(isCustomAvatarValue(savedAv) ? savedAv! : getBestAvatarForLevel(curLvl));
                setUserAvatarAura(normalizeAvatarAuraId(savedAura) ?? null);
                setUserFrame(savedFr || getBestFrameForLevel(curLvl).id);
                // Мини-бейдж перцентиля — глобальные пороги из leaderboard_stats/global
                if (newXP > 0) {
                    computeAllPercentiles({ myXp: newXP, myStreak: 0, myWeekXp: 0, myDaily7xp: 0, myDaily7timeMs: 0, myArenaXp: 0 }).then((p) => {
                        if (mountedRef.current)
                            setHomeXpPercentile(p.xp !== null && p.xp >= 50 ? p.xp : null);
                    }).catch(() => { });
                }
            }
            const xpSnap = parseInt(xpStored || '0', 10) || 0;
            const curLvlSnap = getLevelFromXP(xpSnap);
            const [[, savedAvSnap], [, savedFrSnap]] = await AsyncStorage.multiGet(['user_avatar', 'user_frame']);
            const avatarSnap = isCustomAvatarValue(savedAvSnap) ? savedAvSnap! : getBestAvatarForLevel(curLvlSnap);
            const frameSnap = savedFrSnap || getBestFrameForLevel(curLvlSnap).id;
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
            const [helpfulReportsRaw, dailyAllDoneRaw, achievementStates] = await Promise.all([
                AsyncStorage.getItem(HELPFUL_REPORTS_CONFIRMED_KEY),
                AsyncStorage.getItem(dailyTasksAchievementAllDoneStreakKey(studyTarget)),
                loadAchievementStates().catch(() => []),
            ]);
            if (mountedRef.current) {
                setSpecialTitleStats({
                    helpfulReportsConfirmed: parseStoredCount(helpfulReportsRaw),
                    dailyAllDoneStreak: parseStoredStreak(dailyAllDoneRaw),
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
            const lessonKeys = Array.from({ length: 32 }, (_, i) => lessonProgressKey(i + 1, studyTarget));
            const lessonEntries = await AsyncStorage.multiGet(lessonKeys);
            for (const [, saved] of lessonEntries) {
                if (saved) {
                    const p: string[] = JSON.parse(saved);
                    const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
                    if (correct >= 45)
                        done++;
                }
            }
            let snapLastLessonId: number | null = null;
            let snapLastLessonProgress = 0;
            let snapLastLessonScore = '0.0';
            const lastLessonIdKey = await AsyncStorage.getItem(lastOpenedLessonKey(studyTarget));
            const lastId = lastLessonIdKey ? parseInt(lastLessonIdKey, 10) : null;
            if (lastId && lastId >= 1 && lastId <= 32) {
                const lessonNames = lessonNamesForStudyTarget(lang, studyTarget);
                const saved = await AsyncStorage.getItem(lessonProgressKey(lastId, studyTarget));
                snapLastLessonId = lastId;
                if (saved) {
                    const p: string[] = JSON.parse(saved);
                    const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
                    const scoreStr = (correct / 50 * 5).toFixed(1);
                    snapLastLessonProgress = correct;
                    snapLastLessonScore = scoreStr;
                    setLastLesson({ id: lastId, name: lessonNames[lastId - 1], progress: correct, score: scoreStr });
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
            const [freezeRaw, freeFreezeRaw, baseMulti] = await Promise.all([
                AsyncStorage.getItem('streak_freeze'),
                AsyncStorage.getItem('premium_free_freeze_used'),
                getCurrentMultiplier(),
            ]);
            const parsedFreeze = freezeRaw ? JSON.parse(freezeRaw) : null;
            const freezeIsActive = isStreakFreezeActiveToday(parsedFreeze);
            setFreezeActive(freezeIsActive);
            setPremiumFreezeUsed(freeFreezeRaw === 'true');
            setTotalXPMulti(baseMulti);
            rememberHomeScreenHydration({
                userName: name ?? '',
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
                userFrame: frameSnap,
                lastLessonId: snapLastLessonId,
                lastLessonProgress: snapLastLessonProgress,
                lastLessonScore: snapLastLessonScore,
                homeLeagueRaceVisible,
                homeLeagueCrownExpiresAt,
                homeLeagueChest,
                personalPlanSnapshot: planSnapshot ?? (activePlanState ? personalPlanSnapshot : null),
            }, studyTarget);
            if (mountedRef.current)
                markHomeStatsReady();
            const taskList = await getTodayTasksSafe(studyTarget);
            // Имя для лиги: либо настоящее, либо анонимная подстановка на основе уровня (как в club_screen.tsx),
            // чтобы checkLeagueOnAppOpen не записал в Firestore "пустого" пользователя.
            const leagueName = (name && name.trim())
                || (() => {
                    const xpNum = parseInt(xpStored || '0', 10) || 0;
                    const lvl = getXPProgress(xpNum).level;
                    return `${getTitleString(lvl, lang ?? 'ru')} #${Math.floor(1000 + Math.random() * 9000)}`;
                })();
            const [tp, leagueOpenResult, dueItems, allMedals, repairEligible, bonusRaw, comebackRaw, pbRaw] = await Promise.all([
                loadTodayProgress(taskList, studyTarget),
                // Полный расчёт: при смене ISO-недели создаст pending и сохранит state.
                // Если remote недоступен — функция сама перейдет на локальный state.
                checkLeagueOnAppOpen(leagueName, weekPts).catch(() => null),
                __DEV__ ? getTrainerTotalDue(studyTarget).then(n => Array(n).fill(null)) : Promise.resolve([]),
                loadAllMedals(studyTarget),
                isRepairEligible(),
                AsyncStorage.getItem('login_bonus_pending'),
                AsyncStorage.getItem('comeback_pending'),
                AsyncStorage.getItem('weekly_pb_v1'),
            ]);
            const leagueState = leagueOpenResult?.state ?? null;
            // Если checkLeagueOnAppOpen упал/таймаутнул — читаем pending напрямую,
            // чтобы при следующем открытии (когда state уже сохранён) модалка всё равно вылезла.
            const leaguePending: LeagueResult | null = leagueOpenResult?.needShowResult
                ? leagueOpenResult.result
                : await loadPendingResult().catch(() => null);
            setTaskProgress(tp);
            const nSlots = taskList.length > 0 ? taskList.length : 3;
            setDailyTaskBarCount(nSlots);
            const taskProgressById = new Map(tp.map((row) => [row.taskId, row]));
            setTasksCompleted(taskList.filter((task) => taskProgressById.get(task.id)?.completed).length);
            if (leagueState) {
                const league = LEAGUES.find(l => l.id === leagueState.leagueId) ?? null;
                const showLeagueRace = shouldShowLeagueRace(leagueState.group?.length ?? 0, name);
                const nextHomeLeagueChest = showLeagueRace
                    ? buildHomeLeagueChest(leagueState.group ?? [], league ? clubTierShortName(league, lang) : triLang(lang, {
                        ru: 'Лига недели',
                        uk: 'Ліга тижня',
                        es: 'Liga semanal',
                        'pt-BR': "Liga semanal",
                        vi: "Giải đấu tuần",
                        id: "Liga mingguan",
                        tr: "Haftalık lig",
                        pl: "Liga tygodnia",
                    }), leagueState.leagueId)
                    : buildFallbackHomeLeagueChest(lang);
                setHomeLeagueRaceVisible(showLeagueRace);
                setEngineLeague(league);
                setHomeLeagueChest(nextHomeLeagueChest);
            }
            else {
                setHomeLeagueRaceVisible(false);
                setHomeLeagueChest((prev) => prev ?? buildFallbackHomeLeagueChest(lang));
            }
            if (leaguePending && mountedRef.current) {
                const pendingSig = JSON.stringify({
                    prevLeagueId: leaguePending.prevLeagueId,
                    newLeagueId: leaguePending.newLeagueId,
                    myRank: leaguePending.myRank,
                    totalInGroup: leaguePending.totalInGroup,
                    promoted: leaguePending.promoted,
                    demoted: leaguePending.demoted,
                });
                // Если пользователь уже закрыл модалку в этой сессии — больше не показываем,
                // даже если состав группы (totalInGroup/myRank) поменялся после refetch.
                if (dismissedLeagueResultThisSessionRef.current || dismissedLeagueResultRef.current === pendingSig) {
                    await clearPendingResult();
                }
                else {
                    void checkAchievements({
                        type: 'league_result',
                        myRank: leaguePending.myRank,
                        totalInGroup: leaguePending.totalInGroup,
                        promoted: leaguePending.promoted,
                        newLeagueId: leaguePending.newLeagueId,
                    });
                    setPendingLeagueResult(leaguePending);
                }
            }
            setDueCount(dueItems.length);
            setMedalCounts(countMedals(allMedals));
            // [BANNERS] Login bonus, comeback, personal best, streak repair
            if (bonusRaw) {
                setLoginBonus(JSON.parse(bonusRaw));
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
                    const today = new Date().toISOString().split('T')[0];
                    const shownToday = await AsyncStorage.getItem('streak_paywall_shown');
                    if (shownToday !== today) {
                        await AsyncStorage.setItem('streak_paywall_shown', today);
                        router.push({ pathname: '/premium_modal', params: { context: 'streak', streak: String(streakBefore) } } as any);
                    }
                }
            }
            // Streak Revive: если цепочка уже обнулена в updateStreakOnActivity (≤24ч назад) —
            // оффер активен, показываем модалку. Не пересекается с willLose (там 1 пропущенный
            // день и freeze ещё может помочь).
            const offer = await getReviveOffer();
            if (offer && mountedRef.current) {
                setReviveOffer(offer);
                setReviveModalVisible(true);
            }
            // Premium celebration: pending выставлен в premium_modal (IAP) или cloud_sync (admin grant).
            const pending = await isCelebrationPending();
            if (pending && mountedRef.current) {
                const marker = await getPendingCelebrationMarker();
                setCelebrationMarker(marker);
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
        }
        finally {
            endPerf();
            homeStatsLoadedOnce = true;
            if (mountedRef.current)
                markHomeStatsReady();
            loadingRef.current = false;
            // Если во время загрузки пришёл ещё один запрос — выполняем его сейчас
            if (needsReloadRef.current) {
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
                        if (mountedRef.current)
                            loadData();
                    });
                }, 120);
            }
        }
    };
    const FREEZE_COST_SHARDS = 10;
    const handleFreezeStreak = async () => {
        hapticTap();
        const today = new Date().toISOString().split('T')[0];
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
            const ok = await spendShards(FREEZE_COST_SHARDS, 'streak_freeze');
            if (!ok) {
                await enqueueThemedBlockingInfoAlert(triLang(lang, {
                    ru: 'Недостаточно осколков',
                    uk: 'Недостатньо осколків',
                    es: `No tienes suficientes ${BRAND_SHARDS_ES}`,
                    'pt-BR': "Você não tem fragmentos suficientes",
                    vi: "Bạn không có đủ mảnh",
                    id: "Fragmen kamu tidak cukup",
                    tr: "Yeterli parçan yok",
                    pl: "Nie masz wystarczająco odłamków",
                }), triLang(lang, {
                    ru: `Заморозка стоит ${FREEZE_COST_SHARDS} 💎. У тебя ${shardsBalance} 💎.`,
                    uk: `Заморозка коштує ${FREEZE_COST_SHARDS} 💎. У тебе ${shardsBalance} 💎.`,
                    es: `Congelar la racha cuesta ${FREEZE_COST_SHARDS} 💎 · Tienes ${shardsBalance} 💎`,
                    'pt-BR': `Congelar a sequência custa ${FREEZE_COST_SHARDS} 💎 · Você tem ${shardsBalance} 💎`,
                    vi: `Đóng băng chuỗi tốn ${FREEZE_COST_SHARDS} 💎 · Bạn có ${shardsBalance} 💎`,
                    id: `Bekukan rangkaian seharga ${FREEZE_COST_SHARDS} 💎 · Kamu punya ${shardsBalance} 💎`,
                    tr: `Seriyi dondurmak ${FREEZE_COST_SHARDS} 💎 · Sende ${shardsBalance} 💎 var`,
                    pl: `Zamrożenie serii kosztuje ${FREEZE_COST_SHARDS} 💎 · Masz ${shardsBalance} 💎`,
                }), 'OK');
                return;
            }
            setShardsBalance(prev => Math.max(0, prev - FREEZE_COST_SHARDS));
        }
        await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: today }));
        const lastActive = await AsyncStorage.getItem('last_active_date').catch(() => null);
        const frozenDate = lastActive && lastActive < today ? addDaysToDateKey(lastActive, 1) : today;
        await recordStreakWeekMarker(frozenDate, 'freeze').catch(() => {});
        setWeekMarkers(await readCurrentStreakWeekMarkers().catch(() => weekMarkers));
        setFreezeActive(true);
        emitAppEvent('streak_freeze_updated', { active: true });
        setStreakAtRisk(false);
        void checkAchievements({ type: 'streak_freeze_used' });
    };
    const weekDays = HOME_WEEK_DAYS[lang] ?? HOME_WEEK_DAYS.ru;
    const todayIdx = (new Date().getDay() + 6) % 7;
    /** Индексы табов: 0 home, 1 lessons, 2 arena, 3 friends, 4 settings — см. app/(tabs)/_layout.tsx */
    const TAB_IDX: Record<string, number> = {
        '/(tabs)/lessons': 1,
        lessons: 1,
        '/(tabs)/arena': 2,
        arena: 2,
        '/(tabs)/friends': 3,
        friends: 3,
        '/(tabs)/settings': 4,
        settings: 4,
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
    const dotActive = t.textSecond;
    const dotToday = t.textPrimary;
    const dotEmpty = t.bgSurface2;
    const dayLblColor = t.textMuted;
    const markerForWeekDay = (index: number): StreakWeekDayMarkerKind | null => weekMarkers[index] ?? null;
    const isWeekDayMarked = (index: number): boolean => weekDone[index] || markerForWeekDay(index) !== null;
    const weekDotFill = (index: number, marker: StreakWeekDayMarkerKind | null, fallback: string) => {
        if (marker === 'freeze') return 'rgba(196,239,255,0.24)';
        if (marker === 'revive' || marker === 'repair' || weekDone[index]) return t.correct;
        return fallback;
    };
    const weekDotBorder = (index: number, marker: StreakWeekDayMarkerKind | null, fallback: string) => {
        if (marker === 'freeze') return 'rgba(190,240,255,0.78)';
        if (marker === 'revive' || marker === 'repair' || weekDone[index]) return t.correct;
        return fallback;
    };
    const renderWeekMarkerContent = (
        marker: StreakWeekDayMarkerKind | null,
        size: number,
        checkSize: number,
        checkColor: string,
    ) => {
        if (marker === 'freeze') {
            const iceSize = Math.round(size * 1.34);
            return <Image source={STREAK_WEEK_FREEZE_ICE} style={{ width: iceSize, height: iceSize }} contentFit="contain"/>;
        }
        if (marker === 'revive' || marker === 'repair') {
            return <Ionicons name="checkmark" size={checkSize} color={checkColor}/>;
        }
        return null;
    };
    if (!diagChecked)
        return <ScreenGradient><View /></ScreenGradient>;
    // ── Общие баннеры (используются в обоих стилях) ──────────────────────────
    const bannersJSX = (<>
      {loginBonus && (<View style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: t.bgCard, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: t.textSecond + '66' }}>
          <Text style={{ fontSize: 28 }}>{loginBonus.cycle === 7 ? '🎁' : '🎉'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{triLang(lang, {
                ru: 'Бонус за вход!',
                uk: 'Бонус за вхід!',
                es: '¡Bono por entrar!',
                'pt-BR': "Bônus por entrar!",
                vi: "Thưởng đăng nhập!",
                id: "Bonus masuk!",
                tr: "Giriş bonusu!",
                pl: "Bonus za wejście!",
            })}{loginBonus.cycle === 7 ? triLang(lang, {
                ru: ' День 7 🔥',
                uk: ' День 7 🔥',
                es: ' · Día 7 🔥',
                'pt-BR': " · Dia 7 🔥",
                vi: " · Ngày 7 🔥",
                id: " · Hari 7 🔥",
                tr: " · 7. gün 🔥",
                pl: " · Dzień 7 🔥",
            }) : ''}</Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>+{loginBonus.xp} XP · {triLang(lang, {
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
          <TouchableOpacity onPress={() => setLoginBonus(null)} style={{ padding: 4 }}><Ionicons name="close" size={18} color={t.textMuted}/></TouchableOpacity>
        </View>)}
      {showComebackBanner && (<View style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: t.bgCard, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#FF9500' + '88' }}>
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
          <TouchableOpacity onPress={() => setComebackBanner(false)} style={{ padding: 4 }}><Ionicons name="close" size={18} color={t.textMuted}/></TouchableOpacity>
        </View>)}
      {showRepairCard && (<View style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: t.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#FF9500' + '99' }}>
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
            <TouchableOpacity onPress={() => setShowRepairCard(false)} style={{ padding: 4 }}><Ionicons name="close" size={18} color={t.textMuted}/></TouchableOpacity>
          </View>
          <View style={{ height: 6, backgroundColor: t.bgSurface2, borderRadius: 3 }}>
            <View style={{ height: 6, width: `${repairProgress / 2 * 100}%` as any, backgroundColor: '#FF9500', borderRadius: 3 }}/>
          </View>
        </View>)}
    </>);
    // ── Новый стиль главного экрана ──────────────────────────────────────────
    const renderNewHome = () => {
        const { level, xpInLevel, xpNeeded, progress } = getXPProgress(totalXP);
        const menuImages = getHomeMenuImages(themeMode);
        const homeQuickRowPad = HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? 8 : 16;
        const homeQuickRowGap = HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? 14 : 10;
        const homeQuickTileWidth = Math.floor((SCREEN_W - homeQuickRowPad * 2 - homeQuickRowGap * 2) / 3);
        const homeQuickIconPlateSize = isCompassTheme ? 88 : Math.min(118, Math.max(88, homeQuickTileWidth - 20));
        const homeQuickIconImageSize = isCompassTheme ? 160 : Math.max(96, homeQuickIconPlateSize + 18);
        const homeQuickIconLegacySize = isCompassTheme ? 152 : Math.max(96, homeQuickIconPlateSize + 14);
        const homeQuickIconRadius = isGoldTheme ? 26 : 30;
        const homePracticeIconSize = 64;
        const homePracticeIconImageSize = isCompassTheme ? 96 : homePracticeIconSize;
        const homeTodayIconSize = 96;
        const homeTodayIconImageSize = isCompassTheme ? 118 : homeTodayIconSize;
        const quickItems = [
            { key: 'lessons', iconKey: 'lesson' as const, testID: 'home-quick-lessons', img: menuImages.lesson, label: s.tabs.lessons, sub: triLang(lang, {
                    ru: '32 урока',
                    uk: '32 уроки',
                    es: '32 lecciones',
                    'pt-BR': "32 lições",
                    vi: "32 bài học",
                    id: "32 pelajaran",
                    tr: "32 ders",
                    pl: "32 lekcje",
                }), path: 'lessons' },
            { key: 'quizzes', iconKey: 'quizes' as const, testID: 'home-quick-quizzes', img: menuImages.quizes, label: s.tabs.quizzes, sub: triLang(lang, {
                    ru: '3 уровня',
                    uk: '3 рівні',
                    es: '3 niveles de dificultad',
                    'pt-BR': "3 níveis de dificuldade",
                    vi: "3 mức độ khó",
                    id: "3 tingkat kesulitan",
                    tr: "3 zorluk seviyesi",
                    pl: "3 poziomy trudności",
                }), path: '/quizzes_screen' },
            { key: 'flashcards', iconKey: 'cards' as const, testID: 'home-quick-flashcards', img: menuImages.cards, label: s.tabs.flashcards, sub: triLang(lang, {
                    ru: 'Свои фразы',
                    uk: 'Свої фрази',
                    es: 'Tus tarjetas',
                    'pt-BR': "Seus cartões",
                    vi: "Thẻ của bạn",
                    id: "Kartumu",
                    tr: "Kartların",
                    pl: "Twoje fiszki",
                }), path: '/flashcards' },
        ];
        const visibleQuickItems = studyTarget === 'fr'
            ? quickItems.filter((item) => item.key !== 'quizzes')
            : quickItems;
        const themedClubIcon = menuImages.league;
        /** Второй ряд быстрых плиток — тот же визуал, что «Уроки / Квизы / Карточки». */
        const activityQuickItems = [
            {
                key: 'daily',
                kind: 'tasks' as const,
                iconKey: 'dayTasks' as const,
                label: triLang(lang, {
                    ru: 'Задания дня',
                    uk: 'Завдання дня',
                    es: 'Tareas del día',
                    'pt-BR': "Tarefas do dia",
                    vi: "Nhiệm vụ hôm nay",
                    id: "Tugas harian",
                    tr: "Günün görevleri",
                    pl: "Zadania dnia",
                }),
                path: '/daily_tasks_screen' as const,
                img: menuImages.dayTasks,
            },
            {
                key: 'league',
                kind: 'league' as const,
                iconKey: 'league' as const,
                label: triLang(lang, {
                    ru: 'Лига недели',
                    uk: 'Ліга тижня',
                    es: 'Liga de la semana',
                    'pt-BR': "Liga da semana",
                    vi: "Giải đấu trong tuần",
                    id: "Liga minggu ini",
                    tr: "Haftanın ligi",
                    pl: "Liga tygodnia",
                }),
                path: '/league_screen' as const,
            },
            {
                key: 'attest',
                kind: 'image' as const,
                iconKey: 'test' as const,
                label: s.home.attestTile,
                path: '/diagnostic_test' as const,
                img: menuImages.test,
            },
        ];
        const visibleActivityQuickItems = studyTarget === 'fr'
            ? activityQuickItems.filter((item) => item.key !== 'attest')
            : activityQuickItems;
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
        const titleModalButtonBorderColor = isGoldTheme ? GOLD_RICH.hairlineStrong : isCompassTheme ? compassHairlineStrong : (isLightTheme ? 'rgba(202,138,4,0.32)' : 'rgba(252,211,77,0.42)');
        const titleModalButtonBg = isGoldTheme ? 'rgba(246,227,161,0.13)' : isCompassTheme ? 'rgba(242,196,141,0.12)' : (isLightTheme ? 'rgba(202,138,4,0.12)' : 'rgba(252,211,77,0.13)');
        const titleButtonShadowColor = isGoldTheme ? GOLD_RICH.champagne : isCompassTheme ? '#F2C48D' : (isLightTheme ? '#CA8A04' : '#FCD34D');
        const eliteCardY = eliteStatusEntrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
        const eliteCardScale = eliteStatusEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });
        const eliteShimmerX = eliteStatusShimmer.interpolate({ inputRange: [0, 1], outputRange: [-90, Math.max(320, CONTENT_W)] });
        const homeHeaderShardIconSource = oskolokImageForPackShards(Math.max(1, shardsBalance), themeMode);
        const homeHeaderShardIconSize = 38;
        const homeHeaderShardIconWidth = isCompassTheme ? 48 : homeHeaderShardIconSize;
        const homeHeaderAccessLayout = !showHomeEnergy;
        const homeHeaderAccessTitleShiftY = homeHeaderAccessLayout ? 46 : 0;
        const homeHeaderAccessTitleRightReserve = homeHeaderAccessLayout ? 132 : 0;
        const homeHeaderEnergyClusterMaxWidth = Math.max(112, CONTENT_W - 184);
        const homeHeaderEnergySlots = Math.max(1, energyMax + Math.max(0, energyBonus));
        const homeEnergyLayout = getAdaptiveEnergyIconLayout({
            slotCount: homeHeaderEnergySlots,
            iconSize: energyMax > 6 ? 34 : 38,
            maxWidth: homeHeaderEnergyClusterMaxWidth,
            minIconSize: 22,
        });
        const homeEnergyIconSize = homeEnergyLayout.iconSize;
        const homeEnergyIconOverlap = homeEnergyLayout.marginLeft;
        const homeEnergyIconsWidth = homeEnergyLayout.width;
        const homeEnergyTimerInlineReserve = !energyUnlimited && energyCount < energyMax && timeUntilNextEnergy ? 96 : 0;
        const homeEnergyHeaderStacked = homeEnergyIconsWidth + homeEnergyTimerInlineReserve > homeHeaderEnergyClusterMaxWidth;
        const homeLeagueChestPct = homeLeagueChest
            ? Math.min(100, Math.round((homeLeagueChest.progress / Math.max(1, homeLeagueChest.goal)) * 100))
            : 0;
        const homeLeagueChestReady = homeLeagueChestPct >= 100;
        const homeLeagueChestAccent = homeLeagueChestReady ? leagueBonusPalette.readyAccent : leagueBonusPalette.accent;
        const homeLeagueChestFill = homeLeagueChestReady ? leagueBonusPalette.readyFill : leagueBonusPalette.fill;
        const hasActivePersonalPlan = personalPlanSnapshot != null || hasActivePersonalPlanState;
        const experimentalStatusStreakWidth = eliteStatsCompact ? 74 : 86;
        const experimentalStatusTopRowHeight = eliteStatsCompact ? 72 : 86;
        const experimentalStatusWeekDotSize = eliteStatsCompact ? 28 : 31;
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
        const experimentalStatusTitleLabel = currentHomeTitle?.titleEN ?? getTitleString(level, lang);
        const renderExperimentalHomeStatus = () => (<Animated.View style={{
                opacity: eliteStatusEntrance,
                transform: [{ translateY: eliteCardY }, { scale: eliteCardScale }],
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: eliteStatsCompact ? 10 : 14 }}>
                <TouchableOpacity activeOpacity={0.78} onPress={(event) => {
                    event.stopPropagation?.();
                    hapticTap();
                    router.push('/avatar_select');
                }} accessibilityRole="button" accessibilityLabel="Avatar" style={{ flexShrink: 0 }}>
                  <AvatarView avatar={userAvatar} level={level} size={eliteAvatarSize} auraId={effectiveUserAvatarAura}/>
                </TouchableOpacity>

                <View style={{ flex: 1, minWidth: 0, paddingRight: eliteStatsCompact ? 0 : 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                    <View style={{
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    backgroundColor: isPaperHomeTheme ? 'rgba(64,102,190,0.12)' : 'rgba(125,174,255,0.16)',
                    borderWidth: 1,
                    borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : (isPaperHomeTheme ? 'rgba(64,102,190,0.22)' : 'rgba(125,174,255,0.26)'),
                }}>
                      <Text allowFontScaling={false} style={{ color: homeThemePanelText, fontSize: eliteStatsCompact ? 13 : 15, fontWeight: '900', lineHeight: eliteStatsCompact ? 17 : 19 }} numberOfLines={1}>
                        {experimentalStatusLevelLabel} {level}
                      </Text>
                    </View>
                    <TouchableOpacity activeOpacity={0.82} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }} onPress={(event) => {
                    event.stopPropagation?.();
                    hapticTap();
                    setTitleModalTab('earned');
                    setTitleModalVisible(true);
                }} accessibilityRole="button" accessibilityLabel={triLang(lang, {
                    ru: 'Титулы',
                    uk: 'Титули',
                    es: 'Titulos',
                    'pt-BR': "Titulos",
                    vi: "Danh hieu",
                    id: "Gelar",
                    tr: "Unvanlar",
                    pl: "Tytuly",
                })} style={{
                    minHeight: 30,
                    maxWidth: eliteStatsCompact ? 94 : 122,
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: titleModalButtonBg,
                    borderWidth: 1,
                    borderColor: titleModalButtonBorderColor,
                    shadowColor: titleButtonShadowColor,
                    shadowOpacity: 0.14,
                    shadowRadius: 5,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                }}>
                      <Text allowFontScaling={false} style={{ color: homeThemePanelAccent, fontSize: eliteStatsCompact ? 13 : 15, fontWeight: '900', lineHeight: eliteStatsCompact ? 17 : 19 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                        {experimentalStatusTitleLabel}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
                    <Text style={{ color: homeThemePanelText, fontSize: eliteStatsCompact ? 14 : 16, fontWeight: '900', lineHeight: eliteStatsCompact ? 18 : 20 }} numberOfLines={1}>
                      {xpInLevel} / {xpNeeded} XP
                    </Text>
                    <Text style={{ color: homeThemePanelAccent, fontSize: eliteStatsCompact ? 13 : 15, fontWeight: '900', lineHeight: eliteStatsCompact ? 17 : 19 }} numberOfLines={1}>
                      {xpPct}%
                    </Text>
                  </View>

                  <View style={{
                    height: 12,
                    borderRadius: 999,
                    overflow: 'hidden',
                    backgroundColor: isPaperHomeTheme ? homeThemeTrackBg : isGoldTheme ? 'rgba(0,0,0,0.36)' : 'rgba(255,255,255,0.09)',
                    borderWidth: isGoldTheme ? StyleSheet.hairlineWidth : 0,
                    borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : 'transparent',
                }}>
                    <LinearGradient colors={isPaperHomeTheme ? [t.accent, t.correct] : isGoldTheme ? GOLD_GRADIENTS.progressMetal : [t.gold, '#FFF2B0', t.accent]} locations={isGoldTheme ? [0, 0.48, 1] : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${xpPct}%` as any, height: '100%', borderRadius: 999, overflow: 'hidden' }}>
                      <Animated.View style={{ width: 72, height: '100%', transform: [{ translateX: eliteShimmerX }] }}>
                        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.72)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }}/>
                      </Animated.View>
                    </LinearGradient>
                  </View>
                </View>

                <TouchableOpacity activeOpacity={0.82} onPress={(event) => {
                    event.stopPropagation?.();
                    hapticTap();
                    router.push('/streak_stats');
                }} accessibilityRole="button" accessibilityLabel={`${displayStreak} ${homeStreakDaysLabel}`} style={{
                    width: experimentalStatusStreakWidth,
                    minHeight: experimentalStatusTopRowHeight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    borderRadius: 18,
                }}>
                  <Animated.Text allowFontScaling={false} style={{ color: homeThemePanelText, fontSize: eliteStatsCompact ? 34 : 42, fontWeight: '900', lineHeight: eliteStatsCompact ? 38 : 46, transform: [{ scale: streakScaleAnim }], includeFontPadding: false }} numberOfLines={1}>
                    {displayStreak}
                  </Animated.Text>
                  <Text allowFontScaling={false} style={{ color: homeThemePanelAccent, fontSize: eliteStatsCompact ? 12 : 14, fontWeight: '900', lineHeight: eliteStatsCompact ? 13 : 15, textAlign: 'center', textTransform: 'lowercase' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                    {homeStreakDaysLabel}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 1, backgroundColor: isPaperHomeTheme ? 'rgba(50,72,110,0.12)' : 'rgba(255,255,255,0.10)', marginTop: 19, marginBottom: 18 }}/>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: eliteStatsCompact ? 2 : 5 }}>
                {weekDays.map((d, i) => {
                  const marker = markerForWeekDay(i);
                  const marked = isWeekDayMarked(i);
                  return (<View key={i} style={{ alignItems: 'center', gap: 6, width: experimentalStatusWeekDotSize + 5 }}>
                    <View style={{
                    width: experimentalStatusWeekDotSize,
                    height: experimentalStatusWeekDotSize,
                    borderRadius: experimentalStatusWeekDotSize / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    backgroundColor: weekDotFill(i, marker, isPaperHomeTheme
                        ? (i === todayIdx ? 'rgba(52,56,66,0.14)' : 'rgba(60,54,44,0.10)')
                        : (i === todayIdx ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)')),
                    borderWidth: marker === 'freeze' ? 1 : marked ? 0 : 1,
                    borderColor: weekDotBorder(i, marker, i === todayIdx ? homeThemePanelAccent : (isPaperHomeTheme ? 'rgba(60,54,44,0.30)' : 'rgba(255,255,255,0.11)')),
                }}>
                      {renderWeekMarkerContent(marker, experimentalStatusWeekDotSize, eliteStatsCompact ? 16 : 18, isSketchLightTheme ? t.correctText : '#101214') ?? (weekDone[i] && <Ionicons name="checkmark" size={eliteStatsCompact ? 16 : 18} color={isSketchLightTheme ? t.correctText : '#101214'}/>)}
                    </View>
                    <Text style={{ color: marked || i === todayIdx ? homeThemePanelText : homeThemePanelMuted, fontSize: eliteStatsCompact ? 11 : 13, fontWeight: '900', lineHeight: eliteStatsCompact ? 14 : 16 }} numberOfLines={1}>
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
        return (<ScrollView scrollEnabled={pageScrollEnabled} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32, paddingTop: 6 }}>

          {/* ХЕДЕР */}
          <Animated.View style={sectionStyle(0)}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 20, paddingBottom: 12, gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View pointerEvents="box-none" style={[{ paddingRight: homeHeaderAccessTitleRightReserve }, homeHeaderAccessLayout ? { transform: [{ translateY: homeHeaderAccessTitleShiftY }] } : null]}>
                <Text style={{ color: t.heroTextMuted, fontSize: f.caption }}>{greeting}</Text>
                {homeLeagueRaceVisible && homeLeagueCrownExpiresAt > Date.now() ? (<View style={{ marginTop: 2, alignSelf: 'flex-start', maxWidth: '100%' }}>
                    <LeagueCrownName text={userName || 'Phraseman'} fontSize={f.h1}/>
                  </View>) : isPremium ? (<PremiumGoldUserName text={userName || 'Phraseman'} fontSize={f.h1} onGradient/>) : isVip ? (<VipGreenUserName text={userName || 'Phraseman'} fontSize={f.h1}/>) : (<Text style={{ color: t.heroTextPrimary, fontSize: f.h1, fontWeight: '700', marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>{userName || 'Phraseman'}</Text>)}
              </View>
              {/* Анимация начисления осколков */}
              <Animated.Text style={{
                position: 'absolute', top: -18, right: 0,
                color: isGoldTheme ? GOLD_RICH.paleGold : sketchShardAccent, fontSize: 13, fontWeight: '700',
                opacity: shardsBonusAnim,
                transform: [{ translateY: shardsBonusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }],
            }}>{shardsBonusText}</Animated.Text>
              {/* Energy + shards — в одной строке */}
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 8 }}>
                {showHomeEnergy && (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, minWidth: 0, maxWidth: homeHeaderEnergyClusterMaxWidth }}>
                  <View ref={energyIconRef} collapsable={false} style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, minWidth: 0, maxWidth: homeHeaderEnergyClusterMaxWidth }}>
                <TouchableOpacity activeOpacity={0.7} onPress={showEnergyTooltip} style={{ flexDirection: homeEnergyHeaderStacked ? 'column' : 'row', alignItems: homeEnergyHeaderStacked ? 'flex-end' : 'center', gap: homeEnergyHeaderStacked ? 2 : 4, flexShrink: 1, minWidth: 0, maxWidth: homeHeaderEnergyClusterMaxWidth }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0, width: homeEnergyIconsWidth, maxWidth: '100%' }}>
                    {Array.from({ length: energyMax }).map((_, i) => (<View key={i} style={{ marginLeft: i > 0 ? homeEnergyIconOverlap : 0 }}>
                        <EnergyIcon filled={i < energyCount} themeColor={i < energyCount ? energyFilledColor : (isLightTheme ? energyEmptyTint : t.textGhost)} size={homeEnergyIconSize} animateChange={true} shouldShake={false} themeMode={themeMode}/>
                      </View>))}
                    {energyBonus > 0 && Array.from({ length: energyBonus }).map((_, i) => (<View key={`bonus_${i}`} style={{ marginLeft: homeEnergyIconOverlap }}>
                        <EnergyIcon filled={true} themeColor={BONUS_ENERGY_COLOR} size={homeEnergyIconSize} animateChange={false} shouldShake={false} themeMode={themeMode} tintColor={BONUS_ENERGY_COLOR}/>
                      </View>))}
                  </View>
                  {!energyUnlimited && energyCount < energyMax && timeUntilNextEnergy && (<Text style={{ fontSize: homeEnergyHeaderStacked ? Math.max(10, f.label - 1) : f.label, color: t.heroTextMuted, fontWeight: '500', marginLeft: homeEnergyHeaderStacked ? 0 : 6, flexShrink: 1, maxWidth: '100%', textAlign: 'right' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                      {`+1 ${triLang(lang, {
                    ru: 'через',
                    uk: 'через',
                    es: 'en',
                    'pt-BR': "em",
                    vi: "trong",
                    id: "di",
                    tr: "içinde",
                    pl: "w",
                })} ${timeUntilNextEnergy}`}
                    </Text>)}
                </TouchableOpacity>
                  </View>
                </View>)}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <TouchableOpacity activeOpacity={0.75} onPress={() => {
                hapticTap();
                router.push('/shards_shop');
            }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Animated.View style={{ transform: [{ scale: shardsAnim }], flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Image source={homeHeaderShardIconSource} style={{ width: homeHeaderShardIconWidth, height: homeHeaderShardIconSize }} contentFit="contain" contentPosition="center"/>
                      <Text style={{ color: isGoldTheme ? GOLD_RICH.paleGold : sketchShardAccent, fontSize: 15, fontWeight: '900' }}>{shardsBalance}</Text>
                    </Animated.View>
                  </TouchableOpacity>
                  <LingmanVideosButton />
                  <AppMessagesInbox />
                </View>
              </View>

            </View>
          </View>

          {bannersJSX}
          </Animated.View>

          {/* ── ГЕРОЙ: Уровень + Цепочка ── */}
          <Animated.View style={sectionStyle(1)}>
          <TouchableOpacity testID="home-stats-card" activeOpacity={0.88} onPress={() => { hapticTap(); router.push('/streak_stats'); }} style={[{ marginHorizontal: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? 8 : 16, marginBottom: 12 }, isGoldTheme ? goldShadow(3) : null, null]} accessibilityRole="button" accessibilityLabel={s.home.statsCardTitle} accessibilityHint={s.home.statsPulseHint}>
            <LinearGradient colors={homeThemePanelGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: isGoldTheme ? 18 : isCompassTheme ? compassHomeRadius : 24, borderWidth: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? 1 : (isGoldTheme ? 1 : 0.5), borderColor: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? homeThemePanelBorder : t.border, padding: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? 18 : 20, minHeight: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? (homeStatsReady ? 196 : 210) : (homeStatsReady ? undefined : 200), overflow: 'hidden' }}>
              {isGoldTheme && <GoldBevel radius={18} intensity="strong"/>}
              {isCompassTheme && <CompassBevel radius={compassHomeRadius} intensity="strong"/>}
              {/* Декоративные круги — в отдельном контейнере чтобы не обрезать текст */}
              {!USE_ELITE_HOME_STATUS && (<View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: isGoldTheme ? 18 : 24, overflow: 'hidden' }} pointerEvents="none">
                  <View style={{ position: 'absolute', top: -30, right: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: t.textSecond + '12' }}/>
                  <View style={{ position: 'absolute', bottom: -20, left: -10, width: 70, height: 70, borderRadius: 35, backgroundColor: t.correct + '10' }}/>
                </View>)}

              {USE_ELITE_HOME_STATUS ? (HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? renderExperimentalHomeStatus() : (<Animated.View style={{
                    opacity: eliteStatusEntrance,
                    transform: [{ translateY: eliteCardY }, { scale: eliteCardScale }],
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: eliteStatsCompact ? 8 : 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <TouchableOpacity activeOpacity={0.78} onPress={(event) => {
                    event.stopPropagation?.();
                    hapticTap();
                    router.push('/avatar_select');
                }} accessibilityRole="button" accessibilityLabel="Avatar" style={{ marginRight: eliteStatsCompact ? 10 : 12 }}>
                        <AvatarView avatar={userAvatar} level={level} size={eliteAvatarSize} auraId={effectiveUserAvatarAura}/>
                      </TouchableOpacity>
                      <View style={{ flex: 1, minWidth: eliteStatsCompact ? 74 : 112 }}>
                        <View style={{
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: 999,
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                    marginBottom: 4,
                    backgroundColor: isGoldTheme ? 'rgba(246, 201, 92, 0.16)' : (isLightTheme ? 'rgba(64, 102, 190, 0.10)' : 'rgba(125, 174, 255, 0.14)'),
                    borderWidth: 1,
                    borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : (isLightTheme ? 'rgba(64, 102, 190, 0.22)' : 'rgba(125, 174, 255, 0.24)'),
                }}>
                          <Text allowFontScaling={false} style={{ color: isGoldTheme ? GOLD_RICH.paleGold : t.textPrimary, fontSize: eliteLevelBadgeFontSize, fontWeight: '900', lineHeight: eliteLevelBadgeFontSize + 4, letterSpacing: 0 }} numberOfLines={1}>
                            {triLang(lang, {
                    ru: 'Уровень',
                    uk: 'Рівень',
                    es: 'Nivel',
                    'pt-BR': "Nível",
                    vi: "Cấp",
                    id: "Level",
                    tr: "Seviye",
                    pl: "Poziom",
                })} {level}
                          </Text>
                        </View>
                        <TouchableOpacity activeOpacity={0.82} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }} onPress={(event) => {
                    event.stopPropagation?.();
                    hapticTap();
                    setTitleModalTab('earned');
                    setTitleModalVisible(true);
                }} accessibilityRole="button" accessibilityLabel={triLang(lang, {
                    ru: 'Титулы',
                    uk: 'Титули',
                    es: 'Titulos',
                    'pt-BR': "Titulos",
                    vi: "Danh hieu",
                    id: "Gelar",
                    tr: "Unvanlar",
                    pl: "Tytuly",
                })} style={{
                    alignSelf: 'flex-start',
                    maxWidth: '100%',
                    borderRadius: 999,
                    paddingLeft: 9,
                    paddingRight: 7,
                    paddingVertical: 3,
                    marginTop: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: titleModalButtonBg,
                    borderWidth: 1,
                    borderColor: titleModalButtonBorderColor,
                    shadowColor: titleButtonShadowColor,
                    shadowOpacity: 0.14,
                    shadowRadius: 5,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                }}>
                          <Text allowFontScaling={false} style={{ color: isLightTheme ? t.textSecond : t.gold, fontSize: eliteLevelBadgeFontSize, fontWeight: '900', lineHeight: eliteLevelBadgeFontSize + 4, maxWidth: eliteStatsCompact ? 96 : 150, includeFontPadding: false }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                            {currentHomeTitle?.titleEN ?? getTitleString(level, lang)}
                          </Text>
                          <Ionicons name="chevron-forward" size={13} color={isLightTheme ? t.textSecond : t.gold}/>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end', width: eliteStreakColumnWidth, flexShrink: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, width: '100%' }}>
                        <Animated.Text allowFontScaling={false} style={{ color: t.textPrimary, fontSize: eliteStreakValueSize, fontWeight: '900', lineHeight: eliteStreakValueSize + 5, transform: [{ scale: streakScaleAnim }], minWidth: eliteStreakColumnWidth - eliteStreakIconBox - 7, textAlign: 'right', includeFontPadding: false }} numberOfLines={1}>
                          {displayStreak}
                        </Animated.Text>
                        <View style={[{
                    width: eliteStreakIconBox,
                    height: eliteStreakIconBox,
                    alignItems: 'center',
                    justifyContent: 'center',
                }, homeStreakIconFrameStyle]}>
                          <StreakChainIcon themeMode={themeMode} frozen={freezeActive} streakDays={streak} inactive={streakIconInactive} size={eliteStreakIconSize}/>
                        </View>
                      </View>
                      <Text allowFontScaling={false} style={{ color: t.textSecond, fontSize: eliteMetaFontSize, fontWeight: '700', textAlign: 'right', width: '100%', lineHeight: eliteMetaFontSize + 4 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                        {homeStreakDaysLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={{ marginBottom: 15 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                      <Text style={{ color: t.textMuted, fontSize: eliteMetaFontSize, fontWeight: '800' }}>{xpInLevel} / {xpNeeded} XP</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {totalXPMulti > 1.0 && (<View style={{ backgroundColor: t.gold, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ color: t.textOnGold, fontSize: eliteXpBadgeFontSize, fontWeight: '800' }}>+{Math.round((totalXPMulti - 1) * 100)}% XP</Text>
                          </View>)}
                        <Text style={{ color: isLightTheme ? t.textSecond : t.gold, fontSize: eliteMetaFontSize, fontWeight: '800' }}>{xpPct}%</Text>
                      </View>
                    </View>
                    <View style={{
                    height: 12,
                    borderRadius: 8,
                    overflow: 'hidden',
                    backgroundColor: isSketchLightTheme ? 'rgba(56,52,44,0.56)' : isLightTheme ? 'rgba(255,255,255,0.35)' : isGoldTheme ? 'rgba(0,0,0,0.36)' : 'rgba(255,255,255,0.08)',
                    borderWidth: isGoldTheme ? StyleSheet.hairlineWidth : 0,
                    borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : 'transparent',
                }}>
                      <LinearGradient colors={isSketchLightTheme ? [t.accent, t.correct] : isLightTheme ? [t.accent, '#FFFFFFAA'] : isGoldTheme ? GOLD_GRADIENTS.progressMetal : [t.gold, '#FFF2B0', t.accent]} locations={isGoldTheme ? [0, 0.48, 1] : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${xpPct}%` as any, height: '100%', borderRadius: 8, overflow: 'hidden' }}>
                        {(isGoldTheme) && (<>
                            <LinearGradient colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.055)', 'rgba(0,0,0,0.14)']} locations={[0, 0.46, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill}/>
                            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.26)' }}/>
                          </>)}
                        <Animated.View style={{ width: 72, height: '100%', transform: [{ translateX: eliteShimmerX }] }}>
                          <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.72)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }}/>
                        </Animated.View>
                      </LinearGradient>
                    </View>
                  </View>

                  {hasPremiumAccess && homeXpPercentile !== null && (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 13 }}>
                      <LinearGradient colors={isGoldTheme ? GOLD_GRADIENTS.metallicFill : [t.gold, '#FFF2B0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="trophy" size={14} color={t.textOnGold}/>
                        <Text style={{ color: t.textOnGold, fontSize: eliteXpBadgeFontSize, fontWeight: '800' }}>
                          {triLang(lang, {
                        ru: `Обошёл ${homeXpPercentile}% по XP`,
                        uk: `Обійшов ${homeXpPercentile}% за XP`,
                        es: `Por delante del ${homeXpPercentile}% en XP`,
                        'pt-BR': `À frente de ${homeXpPercentile}% em XP`,
                        vi: `Vượt ${homeXpPercentile}% về XP`,
                        id: `Lebih unggul dari ${homeXpPercentile}% dalam XP`,
                        tr: `XP’de %${homeXpPercentile} öndesin`,
                        pl: `Przed ${homeXpPercentile}% w XP`,
                    })}
                        </Text>
                      </LinearGradient>
                    </View>)}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
                    {weekDays.map((d, i) => {
                      const marker = markerForWeekDay(i);
                      const marked = isWeekDayMarked(i);
                      return (<View key={i} style={{ alignItems: 'center', gap: 6, width: 34 }}>
                        <View style={{
                        width: eliteWeekDotSize, height: eliteWeekDotSize, borderRadius: eliteWeekDotSize / 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        backgroundColor: marker === 'freeze' ? weekDotFill(i, marker, 'rgba(196,239,255,0.24)') : isGoldTheme && !marker ? 'transparent' : weekDotFill(i, marker, isLightTheme
                            ? (i === todayIdx ? 'rgba(52,56,66,0.14)' : 'rgba(60,54,44,0.10)')
                            : (i === todayIdx ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)')),
                        borderWidth: marker === 'freeze' ? 1 : marked && !isGoldTheme ? 0 : 1,
                        borderColor: isGoldTheme
                            ? weekDotBorder(i, marker, i === todayIdx ? GOLD_RICH.hairlineStrong : GOLD_RICH.hairlineQuiet)
                            : weekDotBorder(i, marker, i === todayIdx ? (isLightTheme ? t.textSecond : t.gold) : (isLightTheme ? 'rgba(60,54,44,0.30)' : 'rgba(255,255,255,0.10)')),
                    }}>
                          {isGoldTheme && !marker && (<>
                              <LinearGradient colors={weekDone[i] ? GOLD_GRADIENTS.metallicFill : ['rgba(23,23,23,0.66)', 'rgba(10,10,10,0.58)', 'rgba(7,7,7,0.50)']} locations={[0, 0.48, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}/>
                              <GoldBevel radius={eliteWeekDotSize / 2} intensity={marked ? 'normal' : 'quiet'}/>
                            </>)}
                          {renderWeekMarkerContent(marker, eliteWeekDotSize, eliteStatsCompact ? 15 : 16, isGoldTheme ? t.textOnGold : isSketchLightTheme ? t.correctText : t.textPrimary) ?? (weekDone[i] && <Ionicons name="checkmark" size={eliteStatsCompact ? 15 : 16} color={isGoldTheme ? t.textOnGold : isSketchLightTheme ? t.correctText : t.textPrimary}/>)}
                        </View>
                        <Text style={{ color: marked || i === todayIdx ? t.textPrimary : t.textMuted, fontSize: eliteWeekDayFontSize, fontWeight: '800' }}>{d}</Text>
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
                </Animated.View>)) : (<>
              {/* Верхняя строка: Уровень + Цепочка */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{triLang(lang, {
                    ru: 'Уровень',
                    uk: 'Рівень',
                    es: 'Nivel',
                    'pt-BR': "Nível",
                    vi: "Cấp độ",
                    id: "Level",
                    tr: "Seviye",
                    pl: "Poziom",
                })}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity activeOpacity={0.78} onPress={(event) => {
                    event.stopPropagation?.();
                    hapticTap();
                    router.push('/avatar_select');
                }} accessibilityRole="button" accessibilityLabel="Avatar">
                      <AvatarView avatar={userAvatar} level={level} size={44} auraId={effectiveUserAvatarAura}/>
                    </TouchableOpacity>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800', lineHeight: 24 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                        {triLang(lang, {
                    ru: 'Ур.',
                    uk: 'Рів.',
                    es: 'Nv.',
                    'pt-BR': "Nv.",
                    vi: "Cấp",
                    id: "Lv.",
                    tr: "Sv.",
                    pl: "Poz.",
                })} {level}
                      </Text>
                      <TouchableOpacity activeOpacity={0.82} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }} onPress={(event) => {
                    event.stopPropagation?.();
                    hapticTap();
                    setTitleModalTab('earned');
                    setTitleModalVisible(true);
                }} accessibilityRole="button" accessibilityLabel={triLang(lang, {
                    ru: 'Титулы',
                    uk: 'Титули',
                    es: 'Titulos',
                    'pt-BR': "Titulos",
                    vi: "Danh hieu",
                    id: "Gelar",
                    tr: "Unvanlar",
                    pl: "Tytuly",
                })} style={{
                    alignSelf: 'flex-start',
                    maxWidth: '100%',
                    borderRadius: 999,
                    paddingLeft: 9,
                    paddingRight: 7,
                    paddingVertical: 3,
                    marginTop: 3,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: titleModalButtonBg,
                    borderWidth: 1,
                    borderColor: titleModalButtonBorderColor,
                    shadowColor: titleButtonShadowColor,
                    shadowOpacity: 0.14,
                    shadowRadius: 5,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                }}>
                        <Text style={{ color: isLightTheme ? t.textSecond : t.gold, fontSize: 12, fontWeight: '900', lineHeight: 16, maxWidth: 120 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                          {currentHomeTitle?.titleEN ?? getTitleString(level, lang)}
                        </Text>
                        <Ionicons name="chevron-forward" size={13} color={isLightTheme ? t.textSecond : t.gold}/>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Animated.Text style={{ color: t.textPrimary, fontSize: 34, fontWeight: '800', lineHeight: 38, transform: [{ scale: streakScaleAnim }] }}>{displayStreak}</Animated.Text>
                    <View style={[{
                        width: homeLargeStreakIconBox,
                        height: homeLargeStreakIconBox,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }, homeStreakIconFrameStyle]}>
                      <StreakChainIcon themeMode={themeMode} frozen={freezeActive} streakDays={streak} inactive={streakIconInactive} size={homeLargeStreakIconSize}/>
                    </View>
                  </View>
                  <Text style={{ color: t.textSecond, fontSize: 13 }} numberOfLines={1}>{homeStreakDaysLabel}</Text>
                </View>
              </View>

              {/* Прогресс XP — толще */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ height: 9, backgroundColor: t.bgSurface, borderRadius: 5, overflow: 'hidden' }}>
                  <LinearGradient colors={isGoldTheme ? GOLD_GRADIENTS.progressMetal : [isLightTheme ? t.accent : t.gold, isLightTheme ? t.accent : t.gold]} locations={undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.min(100, Math.round(progress * 100))}%` as any, height: '100%', borderRadius: 5 }}/>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
                  <Text style={{ color: t.textMuted, fontSize: f.label }}>{xpInLevel} / {xpNeeded} XP</Text>
                  {totalXPMulti > 1.0 && (<View style={{ backgroundColor: t.gold, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: t.textOnGold, fontSize: 11, fontWeight: '700' }}>+{Math.round((totalXPMulti - 1) * 100)}% XP</Text>
                    </View>)}
                </View>
              </View>

              {/* МИНИ-БЕЙДЖ XP-ПЕРЦЕНТИЛЯ */}
              {hasPremiumAccess && homeXpPercentile !== null && (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <View style={{ backgroundColor: t.gold, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 12 }}>🏆</Text>
                    <Text style={{ color: t.textOnGold, fontSize: 11, fontWeight: '700' }}>
                      {triLang(lang, {
                        ru: `Обошёл ${homeXpPercentile}% по XP`,
                        uk: `Обійшов ${homeXpPercentile}% за XP`,
                        es: `Por delante del ${homeXpPercentile}% en XP`,
                        'pt-BR': `À frente de ${homeXpPercentile}% em XP`,
                        vi: `Vượt ${homeXpPercentile}% về XP`,
                        id: `Lebih unggul dari ${homeXpPercentile}% dalam XP`,
                        tr: `XP’de %${homeXpPercentile} öndesin`,
                        pl: `Przed ${homeXpPercentile}% w XP`,
                    })}
                    </Text>
                  </View>
                </View>)}

              {/* Точки недели — крупнее */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                {weekDays.map((d, i) => {
                  const marker = markerForWeekDay(i);
                  const marked = isWeekDayMarked(i);
                  return (<View key={i} style={{ alignItems: 'center', gap: 6 }}>
                    <View style={{
                        width: 22, height: 22, borderRadius: 11,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: weekDotFill(i, marker, isLightTheme
                            ? (i === todayIdx ? 'rgba(52,56,66,0.14)' : 'rgba(60,54,44,0.10)')
                            : (i === todayIdx ? t.textPrimary + '66' : t.bgSurface2)),
                        borderWidth: marker === 'freeze' ? 1 : marked ? 0 : (isLightTheme ? (i === todayIdx && !weekDone[i] ? 2 : 1) : (i === todayIdx && !weekDone[i] ? 2 : 0)),
                        borderColor: weekDotBorder(i, marker, isGoldTheme ? goldHairline : isLightTheme ? t.textMuted : t.textPrimary),
                    }}>
                      {renderWeekMarkerContent(marker, 22, 14, isSketchLightTheme ? t.correctText : '#101214') ?? (weekDone[i] && <Ionicons name="checkmark" size={14} color={isSketchLightTheme ? t.correctText : '#101214'}/>)}
                    </View>
                    <Text style={{ color: marked ? t.textPrimary : t.textMuted, fontSize: 12, fontWeight: '600' }}>{d}</Text>
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
              </>)}
            </LinearGradient>
          </TouchableOpacity>
          </Animated.View>

          {/* ПРОДОЛЖИТЬ УРОК + ЗАМОРОЗКА (карточка урока — только после первого захода в любой урок / last_opened_lesson) */}
          {(<Animated.View style={sectionStyle(2)}>
          {/* ЗАМОРОЗКА ЦЕПОЧКИ — для всех когда цепочка под угрозой */}
          {streakAtRisk && !freezeActive && (<TouchableOpacity activeOpacity={0.88} onPress={handleFreezeStreak} style={{
                        marginHorizontal: 16,
                        marginBottom: 12,
                        borderRadius: isGoldTheme ? 14 : isCompassTheme ? compassHomeRadius : 16,
                        backgroundColor: isGoldTheme ? goldPanelBg : isCompassTheme ? compassPanelBg : '#1A3A5C',
                        borderWidth: 1,
                        borderColor: isGoldTheme ? goldHairline : isCompassTheme ? compassHairlineStrong : '#4FC3F7',
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        ...({}),
                    }}>
              <View style={{ width: 42, height: 42, borderRadius: isCompassTheme ? compassHomeRadius : 21, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? goldIconPlateBg : isCompassTheme ? compassIconPlateBg : 'rgba(79,195,247,0.14)', borderWidth: 1, borderColor: isGoldTheme ? goldHairline : isCompassTheme ? compassHairline : 'rgba(79,195,247,0.36)' }}>
                <Ionicons name="snow-outline" size={24} color={isGoldTheme ? GOLD_RICH.champagne : isCompassTheme ? '#F2C48D' : '#4FC3F7'}/>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: isGoldTheme ? GOLD_RICH.champagne : isCompassTheme ? '#F2C48D' : '#4FC3F7', fontSize: 13, fontWeight: '700' }}>
                  {triLang(lang, {
                        ru: `Цепочка ${streak} дней под угрозой`,
                        uk: `Ланцюжок ${streak} днів під загрозою`,
                        es: `Llevas ${streak} días de racha: no la pierdas hoy`,
                        'pt-BR': `Você está há ${streak} dias em sequência: não perca hoje`,
                        vi: `Bạn đã giữ chuỗi ${streak} ngày: đừng để mất hôm nay`,
                        id: `Rangkaianmu sudah ${streak} hari: jangan hilang hari ini`,
                        tr: `${streak} günlük serin var: bugün kaybetme`,
                        pl: `Masz serię ${streak} dni: nie strać jej dziś`,
                    })}
                </Text>
                <Text style={{ color: isGoldTheme ? t.textMuted : '#90CAF9', fontSize: 12, marginTop: 2 }}>
                  {!hasPremiumAccess
                        ? triLang(lang, {
                            ru: 'Доступно только для Premium',
                            uk: 'Доступно лише для Premium',
                            es: 'Solo disponible con Premium',
                            'pt-BR': "Disponível apenas com Premium",
                            vi: "Chỉ có với Premium",
                            id: "Hanya tersedia dengan Premium",
                            tr: "Yalnızca Premium ile kullanılabilir",
                            pl: "Dostępne tylko z Premium",
                        })
                        : !premiumFreezeUsed
                            ? triLang(lang, {
                                ru: 'Заморозить бесплатно — бонус Premium',
                                uk: 'Заморозити безкоштовно — бонус Premium',
                                es: 'Primera congelación gratis con Premium',
                                'pt-BR': "Primeiro congelamento grátis com Premium",
                                vi: "Lần đóng băng đầu miễn phí với Premium",
                                id: "Pembekuan pertama gratis dengan Premium",
                                tr: "Premium ile ilk dondurma ücretsiz",
                                pl: "Pierwsze zamrożenie gratis z Premium",
                            })
                            : triLang(lang, {
                                ru: `Заморозить за ${FREEZE_COST_SHARDS} 💎`,
                                uk: `Заморозити за ${FREEZE_COST_SHARDS} 💎`,
                                es: `Congela tu racha por ${FREEZE_COST_SHARDS} 💎`,
                                'pt-BR': `Congele sua sequência por ${FREEZE_COST_SHARDS} 💎`,
                                vi: `Đóng băng chuỗi với ${FREEZE_COST_SHARDS} 💎`,
                                id: `Bekukan rangkaianmu seharga ${FREEZE_COST_SHARDS} 💎`,
                                tr: `Serini ${FREEZE_COST_SHARDS} 💎 karşılığında dondur`,
                                pl: `Zamroź serię za ${FREEZE_COST_SHARDS} 💎`,
                            })}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                {!hasPremiumAccess
                        ? <Text style={{ color: isGoldTheme ? GOLD_RICH.champagne : '#FFB74D', fontSize: 11, fontWeight: '700' }}>Premium</Text>
                        : hasPremiumAccess && !premiumFreezeUsed
                            ? <Text style={{ color: isGoldTheme ? GOLD_RICH.paleGold : isCompassTheme ? '#F2C48D' : '#4FC3F7', fontSize: 12, fontWeight: '700' }}>
                        {triLang(lang, {
                                    ru: 'Бесплатно',
                                    uk: 'Безкоштовно',
                                    es: 'Gratis',
                                    'pt-BR': "Grátis",
                                    vi: "Miễn phí",
                                    id: "Gratis",
                                    tr: "Ücretsiz",
                                    pl: "Gratis",
                                })}
                      </Text>
                            : <Text style={{ color: shardsBalance >= FREEZE_COST_SHARDS ? (isGoldTheme ? GOLD_RICH.paleGold : isCompassTheme ? '#F2C48D' : '#4FC3F7') : t.textGhost, fontSize: 12, fontWeight: '700' }}>
                        {FREEZE_COST_SHARDS} 💎
                      </Text>}
                <Ionicons name="chevron-forward" size={16} color={isGoldTheme ? GOLD_RICH.champagne : isCompassTheme ? '#F2C48D' : '#4FC3F7'}/>
              </View>
            </TouchableOpacity>)}

          {/* ПРОДОЛЖИТЬ УРОК */}
          {personalPlanSnapshot ? (
            <PersonalPlanHomeRouteCard snapshot={personalPlanSnapshot} compactMargin={HOME_STATUS_DENSE_PROGRESS_EXPERIMENT} />
          ) : hasActivePersonalPlan ? (USE_ELITE_HOME_STATUS ? (<TouchableOpacity testID="home-personal-plan-card" activeOpacity={0.88} onPress={() => { hapticTap(); router.push('/personal_plan' as any); }} style={{
                        marginHorizontal: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? 8 : 16,
                        marginBottom: 12,
                        borderRadius: isGoldTheme ? 18 : 24,
                        overflow: 'hidden',
                        ...({}),
                    }}>
                <LinearGradient colors={homeThemePanelGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{
                        minHeight: 124,
                        borderRadius: isGoldTheme ? 18 : isCompassTheme ? compassHomeRadius : 24,
                        borderWidth: 1,
                        borderColor: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? homeThemePanelBorder : (isLightTheme ? lightPanelBorder : 'rgba(255,255,255,0.10)'),
                        paddingHorizontal: 20,
                        paddingVertical: 18,
                        overflow: 'hidden',
                    }}>
                  {isGoldTheme && <GoldBevel radius={18} intensity="strong"/>}
                  {isCompassTheme && <CompassBevel radius={compassHomeRadius} intensity="strong"/>}
                  <View style={[StyleSheet.absoluteFillObject, { opacity: isGoldTheme ? 0.16 : 0.12, backgroundColor: isGoldTheme ? GOLD_RICH.champagne : t.accent }]} pointerEvents="none"/>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                    <View style={{ width: 70, height: 70, borderRadius: isCompassTheme ? compassHomeRadius : 35, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: homeThemeIconPlateBg, borderWidth: 1, borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : isCompassTheme ? compassHairline : lightPanelBorder }}>
                      <Ionicons name="map-outline" size={32} color={isGoldTheme ? GOLD_RICH.champagne : t.accent}/>
                    </View>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                      <Text style={{ color: homeThemePanelMuted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7, lineHeight: 15 }} numberOfLines={1}>
                        {s.home.continueBtn}
                      </Text>
                      <Text style={{ color: homeThemePanelText, fontSize: Math.max(25, f.h2), fontWeight: '900', lineHeight: Math.max(29, f.h2 + 4), marginTop: 3 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                        {triLang(lang, {
                        ru: 'Твой персональный план',
                        uk: 'Твій персональний план',
                        es: 'Tu plan personal',
                        'pt-BR': "Seu plano pessoal",
                        vi: "Kế hoạch cá nhân của bạn",
                        id: "Rencana personalmu",
                        tr: "Kişisel planın",
                        pl: "Twój osobisty plan",
                    })}
                      </Text>
                      <Text style={{ color: homeThemePanelMuted, fontSize: Math.max(13, f.label), fontWeight: '800', lineHeight: Math.max(17, f.label + 4), marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                        {triLang(lang, {
                        ru: 'Открыть маршрут на сегодня',
                        uk: 'Відкрити маршрут на сьогодні',
                        es: 'Abrir la ruta de hoy',
                        'pt-BR': "Abrir a rota de hoje",
                        vi: "Mở lộ trình hôm nay",
                        id: "Buka rute hari ini",
                        tr: "Bugünkü rotayı aç",
                        pl: "Otwórz dzisiejszą trasę",
                    })}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>) : (<PremiumCard testID="home-personal-plan-card" level={3} onPress={() => { hapticTap(); router.push('/personal_plan' as any); }} style={{ marginHorizontal: 16, marginBottom: 12 }} innerStyle={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? 'rgba(18,14,8,0.92)' : t.bgSurface2, borderWidth: 1, borderColor: t.border }}>
                  <Ionicons name="map-outline" size={25} color={isGoldTheme ? GOLD_RICH.champagne : t.accent}/>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {s.home.continueBtn}
                  </Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700', marginTop: 3 }}>
                    {triLang(lang, {
                        ru: 'Твой персональный план',
                        uk: 'Твій персональний план',
                        es: 'Tu plan personal',
                        'pt-BR': "Seu plano pessoal",
                        vi: "Kế hoạch cá nhân của bạn",
                        id: "Rencana personalmu",
                        tr: "Kişisel planın",
                        pl: "Twój osobisty plan",
                    })}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>
                    {triLang(lang, {
                        ru: 'Открыть маршрут на сегодня',
                        uk: 'Відкрити маршрут на сьогодні',
                        es: 'Abrir la ruta de hoy',
                        'pt-BR': "Abrir a rota de hoje",
                        vi: "Mở lộ trình hôm nay",
                        id: "Buka rute hari ini",
                        tr: "Bugünkü rotayı aç",
                        pl: "Otwórz dzisiejszą trasę",
                    })}
                  </Text>
                </View>
              </PremiumCard>))
          : (hasPremiumAccess || freeHomePlanCtaMode === 'choosePlan' || lastLesson == null) ? (USE_ELITE_HOME_STATUS ? (<TouchableOpacity testID="home-choose-personal-plan" activeOpacity={0.88} onPress={hasPremiumAccess ? () => { hapticTap(); router.push('/personal_plan_setup' as any); } : handleFreeHomeChoosePlanPress} onTouchStart={hasPremiumAccess ? undefined : handleFreeHomePlanCtaTouchStart} onTouchMove={hasPremiumAccess ? undefined : handleFreeHomePlanCtaTouchMove} onTouchEnd={hasPremiumAccess ? undefined : handleFreeHomePlanCtaTouchEnd} onTouchCancel={hasPremiumAccess ? undefined : handleFreeHomePlanCtaTouchEnd} style={{
                        marginHorizontal: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? 8 : 16,
                        marginBottom: 12,
                        borderRadius: isGoldTheme ? 18 : isCompassTheme ? compassHomeRadius : 24,
                        overflow: 'hidden',
                        ...({}),
                    }}>
                <LinearGradient colors={homeThemePanelGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{
                        minHeight: 124,
                        borderRadius: isGoldTheme ? 18 : isCompassTheme ? compassHomeRadius : 24,
                        borderWidth: 1,
                        borderColor: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? homeThemePanelBorder : (isLightTheme ? lightPanelBorder : 'rgba(255,255,255,0.10)'),
                        paddingHorizontal: 20,
                        paddingVertical: 18,
                        overflow: 'hidden',
                    }}>
                  {isGoldTheme && <GoldBevel radius={18} intensity="strong"/>}
                  {isCompassTheme && <CompassBevel radius={compassHomeRadius} intensity="strong"/>}
                  <View style={[StyleSheet.absoluteFillObject, { opacity: isGoldTheme ? 0.14 : 0.11, backgroundColor: isGoldTheme ? GOLD_RICH.champagne : t.accent }]} pointerEvents="none"/>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                    <View style={{ width: 70, height: 70, borderRadius: isCompassTheme ? compassHomeRadius : 35, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: homeThemeIconPlateBg, borderWidth: 1, borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : isCompassTheme ? compassHairline : lightPanelBorder }}>
                      <Ionicons name="sparkles-outline" size={32} color={isGoldTheme ? GOLD_RICH.champagne : t.accent}/>
                    </View>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                      <Text style={{ color: homeThemePanelMuted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0, lineHeight: 15 }} numberOfLines={1}>
                        {hasPremiumAccess ? 'Premium' : triLang(lang, {
                        ru: 'Мой план',
                        uk: 'Мій план',
                        es: 'Mi plan',
                        'pt-BR': "Meu plano",
                        vi: "Kế hoạch của tôi",
                        id: "Rencanaku",
                        tr: "Planım",
                        pl: "Mój plan",
                    })}
                      </Text>
                      <Text style={{ color: homeThemePanelText, fontSize: Math.max(25, f.h2), fontWeight: '900', lineHeight: Math.max(29, f.h2 + 4), marginTop: 3 }} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78}>
                        {triLang(lang, {
                        ru: 'Выбрать свой план обучения',
                        uk: 'Вибрати свій план навчання',
                        es: 'Elegir mi plan de estudio',
                        'pt-BR': "Escolher meu plano de estudo",
                        vi: "Chọn kế hoạch học của tôi",
                        id: "Pilih rencana belajarku",
                        tr: "Kendi öğrenme planımı seç",
                        pl: "Wybierz mój plan nauki",
                    })}
                      </Text>
                      <Text style={{ color: homeThemePanelMuted, fontSize: Math.max(13, f.label), fontWeight: '800', lineHeight: Math.max(17, f.label + 4), marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                        {triLang(lang, {
                        ru: '3 вопроса — и маршрут готов',
                        uk: '3 питання — і маршрут готовий',
                        es: '3 preguntas y la ruta está lista',
                        'pt-BR': "3 perguntas e a rota fica pronta",
                        vi: "3 câu hỏi là có lộ trình",
                        id: "3 pertanyaan, rute siap",
                        tr: "3 soru, rota hazır",
                        pl: "3 pytania i trasa gotowa",
                    })}
                      </Text>
                    </View>
                    <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: homeThemeChevronBg }}>
                      <Ionicons name="chevron-forward" size={24} color={homeThemePanelAccent}/>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>) : (<PremiumCard testID="home-choose-personal-plan" level={3} onPress={hasPremiumAccess ? () => { hapticTap(); router.push('/personal_plan_setup' as any); } : handleFreeHomeChoosePlanPress} style={{ marginHorizontal: 16, marginBottom: 12 }} innerStyle={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? 'rgba(18,14,8,0.92)' : t.bgSurface2, borderWidth: 1, borderColor: t.border }}>
                  <Ionicons name="sparkles-outline" size={25} color={isGoldTheme ? GOLD_RICH.champagne : t.accent}/>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0 }}>
                    {hasPremiumAccess ? 'Premium' : triLang(lang, {
                        ru: 'Мой план',
                        uk: 'Мій план',
                        es: 'Mi plan',
                        'pt-BR': "Meu plano",
                        vi: "Kế hoạch của tôi",
                        id: "Rencanaku",
                        tr: "Planım",
                        pl: "Mój plan",
                    })}
                  </Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700', marginTop: 3 }}>
                    {triLang(lang, {
                        ru: 'Выбрать свой план обучения',
                        uk: 'Вибрати свій план навчання',
                        es: 'Elegir mi plan de estudio',
                        'pt-BR': "Escolher meu plano de estudo",
                        vi: "Chọn kế hoạch học của tôi",
                        id: "Pilih rencana belajarku",
                        tr: "Kendi öğrenme planımı seç",
                        pl: "Wybierz mój plan nauki",
                    })}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>
                    {triLang(lang, {
                        ru: '3 вопроса — и маршрут готов',
                        uk: '3 питання — і маршрут готовий',
                        es: '3 preguntas y la ruta está lista',
                        'pt-BR': "3 perguntas e a rota fica pronta",
                        vi: "3 câu hỏi là có lộ trình",
                        id: "3 pertanyaan, rute siap",
                        tr: "3 soru, rota hazır",
                        pl: "3 pytania i trasa gotowa",
                    })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={t.textGhost}/>
              </PremiumCard>))
          : lastLesson != null ? (USE_ELITE_HOME_STATUS ? (<TouchableOpacity testID="home-continue-lesson" activeOpacity={0.88} onPress={handleFreeHomeContinueLessonPress} onTouchStart={handleFreeHomePlanCtaTouchStart} onTouchMove={handleFreeHomePlanCtaTouchMove} onTouchEnd={handleFreeHomePlanCtaTouchEnd} onTouchCancel={handleFreeHomePlanCtaTouchEnd} style={{
                        marginHorizontal: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? 8 : 16,
                        marginBottom: 12,
                        borderRadius: isGoldTheme ? 18 : 24,
                        overflow: 'hidden',
                        ...({}),
                    }}>
                <LinearGradient colors={homeThemePanelGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{
                        minHeight: 124,
                        borderRadius: isGoldTheme ? 18 : isCompassTheme ? compassHomeRadius : 24,
                        borderWidth: 1,
                        borderColor: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? homeThemePanelBorder : (isLightTheme ? lightPanelBorder : 'rgba(255,255,255,0.10)'),
                        paddingHorizontal: 20,
                        paddingVertical: 18,
                        overflow: 'hidden',
                    }}>
                  {isGoldTheme && <GoldBevel radius={18} intensity="strong"/>}
                  {isCompassTheme && <CompassBevel radius={compassHomeRadius} intensity="strong"/>}
                  <Image source={menuImages.lesson} style={{ position: 'absolute', right: 72, bottom: -20, width: 132, height: 132, opacity: isLightTheme ? 0.08 : 0.12 }} resizeMode="contain" pointerEvents="none"/>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                    <View style={{ width: 70, height: 70, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CircularProgress pct={Math.round(lastLesson.progress / 50 * 100)} size={70} sw={8} color={isGoldTheme ? GOLD_RICH.champagne : t.accent} bg={isCompassTheme ? compassSubtleTrack : homeThemeTrackBg} innerBg={homeThemeIconPlateBg} textColor={isPaperHomeTheme ? homeThemePanelText : '#FFFFFF'} fontSize={12}/>
                    </View>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                      <Text style={{ color: homeThemePanelMuted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7, lineHeight: 15 }} numberOfLines={1}>
                        {s.home.continueBtn}
                      </Text>
                      <Text style={{ color: homeThemePanelText, fontSize: Math.max(25, f.h2), fontWeight: '900', lineHeight: Math.max(29, f.h2 + 4), marginTop: 3 }} numberOfLines={1}>
                        {`${triLang(lang, {
                        ru: 'Урок',
                        uk: 'Урок',
                        es: 'Lección',
                        'pt-BR': "Lição",
                        vi: "Bài học",
                        id: "Pelajaran",
                        tr: "Ders",
                        pl: "Lekcja",
                    })} ${lastLesson.id}`}
                      </Text>
                      <Text style={{ color: homeThemePanelMuted, fontSize: Math.max(13, f.label), fontWeight: '800', lineHeight: Math.max(17, f.label + 4), marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                        {lessonNameForStudyTarget(lang, studyTarget, lastLesson.id) ?? lastLesson.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 }}>
                        <Text style={{ color: isLightTheme ? t.textSecond : t.gold, fontSize: 14, fontWeight: '900', lineHeight: 18 }}>★ {lastLesson.score}</Text>
                        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: t.textGhost }}/>
                        <Text style={{ color: isLightTheme ? t.textSecond : t.gold, fontSize: 14, fontWeight: '900', lineHeight: 18 }}>{lastLesson.progress}/50</Text>
                      </View>
                    </View>
                    <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: homeThemeChevronBg }}>
                      <Ionicons name="chevron-forward" size={24} color={homeThemePanelAccent}/>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>) : (<PremiumCard testID="home-continue-lesson" level={3} onPress={handleFreeHomeContinueLessonPress} style={{ marginHorizontal: 16, marginBottom: 12 }} innerStyle={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <CircularProgress pct={Math.round(lastLesson.progress / 50 * 100)} size={52} sw={5} color={isGoldTheme ? GOLD_RICH.champagne : t.accent} bg={isSketchLightTheme ? 'rgba(56,52,44,0.56)' : t.bgSurface} textColor={t.textPrimary} fontSize={10}/>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {s.home.continueBtn}
                  </Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700', marginTop: 3 }}>
                    {`${triLang(lang, {
                        ru: 'Урок',
                        uk: 'Урок',
                        es: 'Lección',
                        'pt-BR': "Lição",
                        vi: "Bài học",
                        id: "Pelajaran",
                        tr: "Ders",
                        pl: "Lekcja",
                    })} ${lastLesson.id} — ${lessonNameForStudyTarget(lang, studyTarget, lastLesson.id) ?? lastLesson.name}`}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>★ {lastLesson.score} · {lastLesson.progress}/50</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={t.textGhost}/>
              </PremiumCard>)) : null}
          </Animated.View>)}

          {/* Persistent баннер "Сохрани прогресс" — для незалогиненных юзеров с XP ≥ 1000.
                Сам решает показываться или нет (см. SaveProgressBanner.tsx). */}
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <SaveProgressBanner />
          </View>

          {/* БЫСТРЫЙ ДОСТУП: уроки + квизы + карточки */}
          <Animated.View style={sectionStyle(3)}>
          <View onTouchStart={() => { tabSwipeLock.blocked = true; }} onTouchEnd={() => { tabSwipeLock.blocked = false; }} onTouchCancel={() => { tabSwipeLock.blocked = false; }}>
          {USE_ELITE_HOME_STATUS && (<View style={{ marginHorizontal: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? 8 : 16, marginBottom: 10 }}>
              <Text style={{ color: t.textPrimary, fontSize: Math.max(13, f.label), fontWeight: '900', letterSpacing: 0, textTransform: 'uppercase' }} numberOfLines={1}>
                {triLang(lang, {
                    ru: 'Быстрый старт',
                    uk: 'Швидкий старт',
                    es: 'Inicio rapido',
                    'pt-BR': "Inicio rapido",
                    vi: "Bat dau nhanh",
                    id: "Mulai cepat",
                    tr: "Hizli baslangic",
                    pl: "Szybki start",
                })}
              </Text>
            </View>)}
          <View style={{ marginBottom: 12, paddingHorizontal: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? 8 : 16, gap: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? 14 : 10, flexDirection: 'row' }}>
              {visibleQuickItems.map((item, index) => {
                const tileOpacity = eliteQuickTileEntrance[index] ?? eliteStatusEntrance;
                const tileY = tileOpacity.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
                const tileBorderColor = isGoldTheme ? goldHairline : isCompassTheme ? compassHairline : isPaperHomeTheme ? lightPanelBorder : 'rgba(255,255,255,0.10)';
                const tilePanelBg = isGoldTheme ? goldPanelBg : isCompassTheme ? compassPanelBg : isPaperHomeTheme ? lightPanelBg : 'rgba(255,255,255,0.055)';
                const tileIconBg = isGoldTheme ? goldIconPlateBg : isCompassTheme ? compassIconPlateBg : isPaperHomeTheme ? lightPanelIconBg : 'rgba(255,255,255,0.045)';
                return (<Animated.View key={item.label} style={{
                        flex: 1,
                        opacity: USE_ELITE_HOME_STATUS ? tileOpacity : 1,
                        transform: USE_ELITE_HOME_STATUS ? [{ translateY: tileY }] : [],
                    }}>
                <TouchableOpacity testID={item.testID} accessibilityLabel={`qa-${item.testID}`} accessible={true} activeOpacity={0.78} onPress={() => {
                        go(item.path);
                    }} style={{
                        flex: 1,
                        borderRadius: isGoldTheme ? 14 : isCompassTheme ? compassHomeRadius : 18,
                        borderWidth: USE_ELITE_HOME_STATUS ? 1 : 0.5,
                        borderColor: USE_ELITE_HOME_STATUS ? tileBorderColor : t.border,
                        overflow: 'hidden',
                        backgroundColor: USE_ELITE_HOME_STATUS ? tilePanelBg : 'transparent',
                        ...(isGoldTheme ? goldShadow(1) : isCompassTheme ? compassShadow(1) : {}),
                        ...({}),
                    }}>
              {USE_ELITE_HOME_STATUS ? (<View style={{ flex: 1, minHeight: homeQuickIconPlateSize + 52, borderRadius: isGoldTheme ? 14 : isCompassTheme ? compassHomeRadius : 18, paddingHorizontal: 10, paddingVertical: 13, alignItems: 'center', gap: 6 }}>
                      {isGoldTheme && <GoldBevel radius={14} intensity="quiet"/>}
                      {isCompassTheme && <CompassBevel radius={compassHomeRadius} intensity="quiet"/>}
                      <View style={{
                            width: homeQuickIconPlateSize,
                            height: homeQuickIconPlateSize,
                            borderRadius: homeQuickIconRadius,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: tileIconBg,
                        }}>
                        {item.img
                            ? (<LightSketchMenuImage source={item.img} width={homeQuickIconImageSize} height={homeQuickIconImageSize} lighten={themeMode === 'minimalLight'} align={getHomeMenuIconAlignment(themeMode, item.iconKey)} contentFit="contain" cachePolicy="memory-disk"/>)
                            : <View style={{ width: homeQuickIconImageSize, height: homeQuickIconImageSize, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: f.numLg + 4 }}>...</Text></View>}
                      </View>
                      <Text style={{ color: isPaperHomeTheme ? homeThemePanelText : t.textPrimary, fontSize: Math.max(12, f.label - 1), fontWeight: '800', textAlign: 'center' }} numberOfLines={1}>{item.label}</Text>
                    </View>) : (<LinearGradient colors={isGoldTheme ? goldRaisedTile : isSketchLightTheme ? sketchHomePanelGradient : t.cardGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: isGoldTheme ? 14 : 18, paddingHorizontal: 10, paddingVertical: 14, alignItems: 'center', gap: 5 }}>
                  {isGoldTheme && <GoldBevel radius={14} intensity="normal"/>}
                  <View style={{ position: 'relative' }}>
                    {item.img
                            ? (<LightSketchMenuImage source={item.img} width={homeQuickIconLegacySize} height={homeQuickIconLegacySize} lighten={themeMode === 'minimalLight'} align={getHomeMenuIconAlignment(themeMode, item.iconKey)} contentFit="contain" cachePolicy="memory-disk"/>)
                            : <View style={{ width: homeQuickIconLegacySize, height: homeQuickIconLegacySize, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: f.numLg + 4 }}>🗺️</Text></View>}
                  </View>
                  <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>{item.label}</Text>
                  </LinearGradient>)}
                </TouchableOpacity>
                </Animated.View>);
            })}
          </View>
          </View>
          </Animated.View>

          {/* SRS ПОВТОРЕНИЕ + ряд «Задания дня / Лига / Аттестация» */}
          <Animated.View style={sectionStyle(4)}>
          {HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? (<>
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
          <View style={{ marginHorizontal: 8, marginBottom: 12, gap: 10 }}>
            <TouchableOpacity activeOpacity={0.85} testID="home-open-trainer" onPress={() => { hapticTap(); router.push('/trainer'); }} style={{ borderRadius: isCompassTheme ? compassHomeRadius : 24, overflow: 'hidden', ...(isCompassTheme ? compassShadow(2) : {}) }}>
              <LinearGradient colors={homeThemePanelGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 128, borderRadius: isCompassTheme ? compassHomeRadius : 24, borderWidth: 1, borderColor: homeThemePanelBorder, paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 18, overflow: 'hidden' }}>
                {isGoldTheme && <GoldBevel radius={18} intensity="quiet"/>}
                {isCompassTheme && <CompassBevel radius={compassHomeRadius} intensity="normal"/>}
                <View style={{ width: homeTodayIconSize, height: homeTodayIconSize, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <LightSketchMenuImage source={menuImages.practice} width={homeTodayIconImageSize} height={homeTodayIconImageSize} lighten={themeMode === 'minimalLight'} align={getHomeMenuIconAlignment(themeMode, 'practice')} contentFit="contain" cachePolicy="memory-disk"/>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: homeThemePanelText, fontSize: Math.max(22, f.bodyLg), fontWeight: '900', lineHeight: Math.max(26, f.bodyLg + 5) }} numberOfLines={1}>
                    {triLang(lang, {
                    ru: 'Моя практика',
                    uk: 'Моя практика',
                    es: 'Mi práctica',
                    'pt-BR': "Minha prática",
                    vi: "Luyện tập của tôi",
                    id: "Latihan saya",
                    tr: "Pratiğim",
                    pl: "Moje ćwiczenie",
                })}
                  </Text>
                  <Text style={{ color: homeThemePanelAccent, fontSize: Math.max(14, f.label), fontWeight: '800', lineHeight: Math.max(18, f.label + 4), marginTop: 2 }} numberOfLines={1}>
                    {dueCount > 0
                        ? triLang(lang, {
                            ru: `${dueCount} ждут сегодня`,
                            uk: `${dueCount} чекають сьогодні`,
                            es: `${dueCount} esperan hoy`,
                            'pt-BR': `${dueCount} esperam hoje`,
                            vi: `${dueCount} đang chờ hôm nay`,
                            id: `${dueCount} menunggu hari ini`,
                            tr: `${dueCount} bugün bekliyor`,
                            pl: `${dueCount} czeka dziś`,
                        })
                        : triLang(lang, {
                            ru: 'Ошибки под контролем',
                            uk: 'Помилки під контролем',
                            es: 'Errores bajo control',
                            'pt-BR': "Erros sob controle",
                            vi: "Lỗi trong tầm kiểm soát",
                            id: "Kesalahan terkendali",
                            tr: "Hatalar kontrol altında",
                            pl: "Błędy pod kontrolą",
                        })}
                  </Text>
                </View>
                {dueCount > 0 ? (<View style={{ minWidth: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, backgroundColor: isGoldTheme ? GOLD_RICH.paleGold : '#E05050', marginRight: 2 }}>
                    <Text style={{ color: isGoldTheme ? t.textOnGold : '#fff', fontSize: 13, fontWeight: '900' }}>{dueCount}</Text>
                  </View>) : null}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} testID="home-activity-daily" onPress={() => { go('/daily_tasks_screen'); }} style={{ borderRadius: isCompassTheme ? compassHomeRadius : 24, overflow: 'hidden', ...(isCompassTheme ? compassShadow(2) : {}) }}>
              <LinearGradient colors={homeThemePanelGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 128, borderRadius: isCompassTheme ? compassHomeRadius : 24, borderWidth: 1, borderColor: homeThemePanelBorder, paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 18, overflow: 'hidden' }}>
                {isGoldTheme && <GoldBevel radius={18} intensity="quiet"/>}
                {isCompassTheme && <CompassBevel radius={compassHomeRadius} intensity="normal"/>}
                <View style={{ width: homeTodayIconSize, height: homeTodayIconSize, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <LightSketchMenuImage source={menuImages.dayTasks} width={homeTodayIconImageSize} height={homeTodayIconImageSize} lighten={themeMode === 'minimalLight'} align={getHomeMenuIconAlignment(themeMode, 'dayTasks')} contentFit="contain" cachePolicy="memory-disk"/>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: homeThemePanelText, fontSize: Math.max(22, f.bodyLg), fontWeight: '900', lineHeight: Math.max(26, f.bodyLg + 5) }} numberOfLines={1}>
                    {triLang(lang, {
                    ru: 'Задания дня',
                    uk: 'Завдання дня',
                    es: 'Tareas del día',
                    'pt-BR': "Tarefas do dia",
                    vi: "Nhiệm vụ hôm nay",
                    id: "Tugas harian",
                    tr: "Günün görevleri",
                    pl: "Zadania dnia",
                })}
                  </Text>
                  <View style={{ marginTop: 12, flexDirection: 'row', gap: 7, width: 138 }}>
                    {Array.from({ length: dailyTaskBarCount }, (_, ti) => {
                        const done = ti < tasksCompleted;
                        const fillStart = isGoldTheme
                            ? GOLD_RICH.agedGold
                            : themeMode === 'coral'
                                ? '#FF5C6C'
                                : themeMode === 'neon'
                                    ? '#7CFF00'
                                    : '#438CFF';
                        const fillMid = isGoldTheme
                            ? GOLD_RICH.champagne
                            : themeMode === 'coral'
                                ? '#FF9270'
                                : themeMode === 'neon'
                                    ? '#B7FF00'
                                    : '#76B5FF';
                        const fillEnd = isGoldTheme
                            ? GOLD_RICH.paleGold
                            : themeMode === 'coral'
                                ? '#FFD06A'
                                : themeMode === 'neon'
                                    ? '#E5FF67'
                                    : '#62F2B0';
                        return (<View key={ti} style={{
                            flex: 1,
                            height: 11,
                            borderRadius: 999,
                            padding: 1,
                            overflow: 'hidden',
                            backgroundColor: done
                                ? (isGoldTheme ? 'rgba(255,232,168,0.24)' : 'rgba(122,181,255,0.24)')
                                : (isLightTheme ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)'),
                            borderWidth: 1,
                            borderColor: done
                                ? (isGoldTheme ? 'rgba(255,232,168,0.60)' : themeMode === 'coral' ? 'rgba(255,146,112,0.62)' : themeMode === 'neon' ? 'rgba(183,255,0,0.58)' : 'rgba(118,181,255,0.58)')
                                : (isLightTheme ? 'rgba(0,0,0,0.13)' : 'rgba(255,255,255,0.13)'),
                            shadowColor: done ? fillMid : '#000',
                            shadowOpacity: done ? 0.35 : 0.16,
                            shadowRadius: done ? 6 : 3,
                            shadowOffset: { width: 0, height: 2 },
                            elevation: done ? 3 : 1,
                        }}>
                          <LinearGradient
                            colors={done
                                ? [fillStart, fillMid, fillEnd]
                                : (isLightTheme ? ['rgba(255,255,255,0.22)', 'rgba(0,0,0,0.07)', 'rgba(0,0,0,0.12)'] : ['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.055)', 'rgba(0,0,0,0.18)'])}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ flex: 1, borderRadius: 999, overflow: 'hidden' }}
                          >
                            <View pointerEvents="none" style={{ position: 'absolute', left: 3, right: 3, top: 1, height: 3, borderRadius: 999, backgroundColor: done ? 'rgba(255,255,255,0.46)' : 'rgba(255,255,255,0.10)', opacity: done ? 0.9 : 0.55 }}/>
                            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.16)', opacity: done ? 0.28 : 0.38 }}/>
                          </LinearGradient>
                        </View>);
                    })}
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {homeLeagueChest && (<TouchableOpacity testID="home-league-open" activeOpacity={0.88} onPress={() => {
                    hapticTap();
                    router.push('/league_screen');
                }} style={{ borderRadius: 24, overflow: 'hidden' }} accessibilityRole="button" accessibilityLabel={triLang(lang, {
                    ru: 'Цель лиги',
                    uk: 'Ціль ліги',
                    es: 'Meta de liga',
                    'pt-BR': "Meta da liga",
                    vi: "Mục tiêu giải đấu",
                    id: "Target liga",
                    tr: "Lig hedefi",
                    pl: "Cel ligi",
                })}>
              <LinearGradient colors={leagueBonusPalette.card} locations={leagueBonusPalette.cardLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 132, borderRadius: 24, borderWidth: 1, borderColor: leagueBonusPalette.border, backgroundColor: leagueBonusPalette.innerBg, paddingHorizontal: 18, paddingVertical: 16, overflow: 'hidden' }}>
                <Image pointerEvents="none" source={leagueBonusGiftImage} style={{ position: 'absolute', right: -2, top: -18, width: 142, height: 142, opacity: homeLeagueChestReady ? 0.22 : 0.15, transform: [{ rotate: '-8deg' }] }} contentFit="contain"/>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 14 }}>
                  <View style={{ width: homeTodayIconSize, height: homeTodayIconSize, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Image source={leagueBonusGiftImage} style={{ width: homeTodayIconSize, height: homeTodayIconSize, opacity: homeLeagueChestReady ? 1 : 0.94 }} contentFit="contain"/>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textPrimary, fontSize: Math.max(22, f.bodyLg), fontWeight: '900', lineHeight: Math.max(26, f.bodyLg + 5) }} numberOfLines={1}>
                      {triLang(lang, {
                    ru: 'Цель лиги',
                    uk: 'Ціль ліги',
                    es: 'Meta de liga',
                    'pt-BR': "Meta da liga",
                    vi: "Mục tiêu giải đấu",
                    id: "Target liga",
                    tr: "Lig hedefi",
                    pl: "Cel ligi",
                })}
                    </Text>
                    <Text style={{ color: leagueBonusPalette.textMuted, fontSize: Math.max(14, f.label), fontWeight: '800', lineHeight: Math.max(18, f.label + 4), marginTop: 2 }} numberOfLines={1}>
                      {homeLeagueChest.leagueName}
                    </Text>
                  </View>
                  <Text style={{ color: homeLeagueChestAccent, fontSize: Math.max(27, f.h2 + 2), fontWeight: '900' }}>
                    {homeLeagueChestPct}%
                  </Text>
                </View>
                <View style={{ height: 10, borderRadius: 6, overflow: 'hidden', backgroundColor: leagueBonusPalette.track, borderWidth: 0.5, borderColor: leagueBonusPalette.trackBorder }}>
                  <LinearGradient colors={homeLeagueChestFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${homeLeagueChestPct}%` as any, borderRadius: 6 }}/>
                </View>
              </LinearGradient>
            </TouchableOpacity>)}
          </View>
          </>) : (<>

          {/* ТРЕНЕР — стационарная кнопка, всегда видна */}
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <TouchableOpacity activeOpacity={0.85} testID="home-open-trainer" onPress={() => { hapticTap(); router.push('/trainer'); }} style={{
                borderRadius: isGoldTheme ? 14 : 16,
                borderWidth: USE_ELITE_HOME_STATUS ? 1 : 0.5,
                borderColor: USE_ELITE_HOME_STATUS
                    ? (isGoldTheme ? goldHairline : isCompassTheme ? compassHairline : isLightTheme ? lightPanelBorder : 'rgba(255,255,255,0.10)')
                    : t.border,
                overflow: 'hidden',
                backgroundColor: USE_ELITE_HOME_STATUS
                    ? (isGoldTheme ? goldPanelBg : isCompassTheme ? compassPanelBg : isLightTheme ? lightPanelBg : 'rgba(255,255,255,0.055)')
                    : 'transparent',
                ...(isGoldTheme ? goldShadow(1) : {}),
                ...({}),
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: isGoldTheme ? 14 : 16, padding: 14 }}>
              {isGoldTheme && <GoldBevel radius={14} intensity="quiet"/>}
              <View style={{ width: homePracticeIconSize, height: homePracticeIconSize, borderRadius: 12, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                <LightSketchMenuImage source={menuImages.practice} width={homePracticeIconImageSize} height={homePracticeIconImageSize} lighten={themeMode === 'minimalLight'} align={getHomeMenuIconAlignment(themeMode, 'practice')} contentFit="contain" cachePolicy="memory-disk"/>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                  {triLang(lang, {
                ru: 'Моя практика',
                uk: 'Моя практика',
                es: 'Mi práctica',
                'pt-BR': "Minha prática",
                vi: "Luyện tập của tôi",
                id: "Latihan saya",
                tr: "Pratiğim",
                pl: "Moje ćwiczenie",
            })}
                </Text>
                <Text style={{ display: 'none', color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                  {triLang(lang, {
                ru: '🧠 Моя практика',
                uk: '🧠 Моя практика',
                es: '🧠 Mi práctica',
                'pt-BR': "🧠 Minha prática",
                vi: "🧠 Luyện tập của tôi",
                id: "🧠 Latihan saya",
                tr: "🧠 Pratiğim",
                pl: "🧠 Moje ćwiczenie",
            })}
                </Text>
                <Text style={{ color: t.textSecond, fontSize: f.label, marginTop: 1 }} numberOfLines={1}>
                  {dueCount > 0
                ? triLang(lang, {
                    ru: `${dueCount} ждут сегодня`,
                    uk: `${dueCount} чекають сьогодні`,
                    es: `${dueCount} esperan hoy`,
                    'pt-BR': `${dueCount} esperam hoje`,
                    vi: `${dueCount} đang chờ hôm nay`,
                    id: `${dueCount} menunggu hari ini`,
                    tr: `${dueCount} bugün bekliyor`,
                    pl: `${dueCount} czeka dziś`,
                })
                : triLang(lang, {
                    ru: 'Ошибки под контролем',
                    uk: 'Помилки під контролем',
                    es: 'Errores bajo control',
                    'pt-BR': "Erros sob controle",
                    vi: "Lỗi trong tầm kiểm soát",
                    id: "Kesalahan terkendali",
                    tr: "Hatalar kontrol altında",
                    pl: "Błędy pod kontrolą",
                })}
                </Text>
                <Text style={{ display: 'none', color: t.textSecond, fontSize: f.label, marginTop: 1 }} numberOfLines={1}>
                  {dueCount > 0
                ? triLang(lang, {
                    ru: `${dueCount} ждут сегодня`,
                    uk: `${dueCount} чекають сьогодні`,
                    es: `${dueCount} esperan hoy`,
                    'pt-BR': `${dueCount} esperam hoje`,
                    vi: `${dueCount} đang chờ hôm nay`,
                    id: `${dueCount} menunggu hari ini`,
                    tr: `${dueCount} bugün bekliyor`,
                    pl: `${dueCount} czeka dziś`,
                })
                : triLang(lang, {
                    ru: 'Повторение ошибок',
                    uk: 'Повторення помилок',
                    es: 'Repaso de errores',
                    'pt-BR': "Revisão de erros",
                    vi: "Ôn lỗi sai",
                    id: "Tinjauan kesalahan",
                    tr: "Hata tekrarı",
                    pl: "Powtórka błędów",
                })}
                </Text>
              </View>
              {dueCount > 0 && (<View style={{ backgroundColor: isGoldTheme ? GOLD_RICH.paleGold : '#E05050', borderRadius: 11, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                  <Text style={{ color: isGoldTheme ? t.textOnGold : '#fff', fontSize: 11, fontWeight: '900' }}>{dueCount}</Text>
                </View>)}
              <Ionicons name="chevron-forward" size={18} color={t.textGhost}/>
              </View>
            </TouchableOpacity>
          </View>

          <View onTouchStart={() => { tabSwipeLock.blocked = true; }} onTouchEnd={() => { tabSwipeLock.blocked = false; }} onTouchCancel={() => { tabSwipeLock.blocked = false; }}>
            <View style={{ marginBottom: 12, paddingHorizontal: 16, gap: 10, flexDirection: 'row' }}>
              {visibleActivityQuickItems.map((item, index) => {
                const tileOpacity = eliteActivityTileEntrance[index] ?? eliteStatusEntrance;
                const tileY = tileOpacity.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
                const tileBorderColor = isGoldTheme ? goldHairline : isCompassTheme ? compassHairline : isPaperHomeTheme ? lightPanelBorder : 'rgba(255,255,255,0.10)';
                const tilePanelBg = isGoldTheme ? goldPanelBg : isCompassTheme ? compassPanelBg : isPaperHomeTheme ? lightPanelBg : 'rgba(255,255,255,0.055)';
                const tileIconBg = isGoldTheme ? goldIconPlateBg : isCompassTheme ? compassIconPlateBg : isPaperHomeTheme ? lightPanelIconBg : 'rgba(255,255,255,0.045)';
                return (<Animated.View key={item.key} style={{
                        flex: 1,
                        opacity: USE_ELITE_HOME_STATUS ? tileOpacity : 1,
                        transform: USE_ELITE_HOME_STATUS ? [{ translateY: tileY }] : [],
                    }}>
                  <TouchableOpacity testID={`home-activity-${item.key}`} activeOpacity={0.78} onPress={() => { go(item.path); }} style={{
                        flex: 1,
                        borderRadius: isGoldTheme ? 14 : isCompassTheme ? compassHomeRadius : 18,
                        borderWidth: USE_ELITE_HOME_STATUS ? 1 : 0.5,
                        borderColor: USE_ELITE_HOME_STATUS ? tileBorderColor : t.border,
                        overflow: 'hidden',
                        backgroundColor: USE_ELITE_HOME_STATUS ? tilePanelBg : 'transparent',
                        ...(isGoldTheme ? goldShadow(1) : isCompassTheme ? compassShadow(1) : {}),
                        ...({}),
                    }}>
                    {USE_ELITE_HOME_STATUS ? (<View style={{ flex: 1, borderRadius: isGoldTheme ? 14 : isCompassTheme ? compassHomeRadius : 18, paddingHorizontal: 10, paddingVertical: 13, alignItems: 'center', gap: 6 }}>
                    {isGoldTheme && <GoldBevel radius={14} intensity="quiet"/>}
                    {isCompassTheme && <CompassBevel radius={compassHomeRadius} intensity="quiet"/>}
                    <View style={{
                            position: 'relative',
                            width: homeQuickIconPlateSize,
                            height: homeQuickIconPlateSize,
                            borderRadius: homeQuickIconRadius,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: tileIconBg,
                        }}>
                      {item.kind === 'tasks' ? (<LightSketchMenuImage source={item.img} width={homeQuickIconImageSize} height={homeQuickIconImageSize} lighten={themeMode === 'minimalLight'} align={getHomeMenuIconAlignment(themeMode, item.iconKey)} contentFit="contain" cachePolicy="memory-disk"/>) : item.kind === 'league' ? (<LightSketchMenuImage source={themedClubIcon} width={homeQuickIconImageSize} height={homeQuickIconImageSize} lighten={themeMode === 'minimalLight'} align={getHomeMenuIconAlignment(themeMode, item.iconKey)} contentFit="contain" cachePolicy="memory-disk"/>) : (<LightSketchMenuImage source={item.img} width={homeQuickIconImageSize} height={homeQuickIconImageSize} lighten={themeMode === 'minimalLight'} align={getHomeMenuIconAlignment(themeMode, item.iconKey)} contentFit="contain" cachePolicy="memory-disk"/>)}
                      {item.kind === 'league' && homeLeagueChatUnreadCount > 0 ? (<View
                        testID="home-league-chat-unread-badge"
                        style={{
                            position: 'absolute',
                            top: -7,
                            right: -7,
                            minWidth: 21,
                            height: 21,
                            paddingHorizontal: 6,
                            borderRadius: 11,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#E9505F',
                            borderWidth: 1.5,
                            borderColor: tileIconBg,
                        }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>
                          {formatLeagueChatUnreadBadge(homeLeagueChatUnreadCount)}
                        </Text>
                      </View>) : null}
                    </View>
                    <Text style={{ color: t.textPrimary, fontSize: Math.max(12, f.label - 1), fontWeight: '800', textAlign: 'center' }} numberOfLines={2}>
                      {item.label}
                    </Text>
                    {item.kind === 'tasks' ? (<View style={{ width: '100%', marginTop: 1 }}>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          {Array.from({ length: dailyTaskBarCount }, (_, ti) => {
                                const done = ti < tasksCompleted;
                                return (<View key={ti} style={{ flex: 1, height: 3, backgroundColor: isLightTheme ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)', borderRadius: 2, overflow: 'hidden' }}>
                                {done ? <View style={{ width: '100%', height: '100%', backgroundColor: t.correct, borderRadius: 2 }}/> : null}
                              </View>);
                            })}
                        </View>
                      </View>) : null}
                  </View>) : (<LinearGradient colors={isGoldTheme ? goldRaisedTile : isSketchLightTheme ? sketchHomePanelGradient : t.cardGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: isGoldTheme ? 14 : 18, paddingHorizontal: 10, paddingVertical: 14, alignItems: 'center', gap: 5 }}>
                      {isGoldTheme && <GoldBevel radius={14} intensity="normal"/>}
                      <View style={{ position: 'relative', height: homeQuickIconLegacySize, justifyContent: 'center', alignItems: 'center' }}>
                        {item.kind === 'tasks' ? (<LightSketchMenuImage source={item.img} width={homeQuickIconLegacySize} height={homeQuickIconLegacySize} lighten={themeMode === 'minimalLight'} align={getHomeMenuIconAlignment(themeMode, item.iconKey)} contentFit="contain" cachePolicy="memory-disk"/>) : item.kind === 'league' ? (<LightSketchMenuImage source={themedClubIcon} width={homeQuickIconLegacySize} height={homeQuickIconLegacySize} lighten={themeMode === 'minimalLight'} align={getHomeMenuIconAlignment(themeMode, item.iconKey)} contentFit="contain" cachePolicy="memory-disk"/>) : (<LightSketchMenuImage source={item.img} width={homeQuickIconLegacySize} height={homeQuickIconLegacySize} lighten={themeMode === 'minimalLight'} align={getHomeMenuIconAlignment(themeMode, item.iconKey)} contentFit="contain" cachePolicy="memory-disk"/>)}
                        {item.kind === 'league' && homeLeagueChatUnreadCount > 0 ? (<View
                          testID="home-league-chat-unread-badge"
                          style={{
                              position: 'absolute',
                              top: -7,
                              right: -7,
                              minWidth: 21,
                              height: 21,
                              paddingHorizontal: 6,
                              borderRadius: 11,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#E9505F',
                              borderWidth: 1.5,
                              borderColor: t.bgCard,
                          }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>
                            {formatLeagueChatUnreadBadge(homeLeagueChatUnreadCount)}
                          </Text>
                        </View>) : null}
                      </View>
                      <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '700', textAlign: 'center' }} numberOfLines={2}>
                        {item.label}
                      </Text>
                      {item.kind === 'tasks' ? (<View style={{ width: '100%', marginTop: 2 }}>
                          <View style={{ flexDirection: 'row', gap: 4 }}>
                            {Array.from({ length: dailyTaskBarCount }, (_, ti) => {
                                const done = ti < tasksCompleted;
                                return (<View key={ti} style={{ flex: 1, height: 4, backgroundColor: t.bgSurface2, borderRadius: 2, overflow: 'hidden' }}>
                                  {done ? <View style={{ width: '100%', height: '100%', backgroundColor: t.correct, borderRadius: 2 }}/> : null}
                                </View>);
                            })}
                          </View>
                        </View>) : null}
                  </LinearGradient>)}
                </TouchableOpacity>
                </Animated.View>);
            })}
            </View>
          </View>

          {homeLeagueChest && (<TouchableOpacity testID="home-league-open" activeOpacity={0.88} onPress={() => {
                    hapticTap();
                    router.push('/league_screen');
                }} style={{ marginHorizontal: 16, marginBottom: 12 }} accessibilityRole="button" accessibilityLabel={triLang(lang, {
                    ru: 'Цель лиги',
                    uk: 'Ціль ліги',
                    es: 'Meta de liga',
                    'pt-BR': "Meta da liga",
                    vi: "Mục tiêu giải đấu",
                    id: "Target liga",
                    tr: "Lig hedefi",
                    pl: "Cel ligi",
                })}>
              <LinearGradient colors={leagueBonusPalette.card} locations={leagueBonusPalette.cardLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: isGoldTheme ? 14 : 18, borderWidth: isGoldTheme ? 1 : 0.5, borderColor: leagueBonusPalette.border, backgroundColor: leagueBonusPalette.innerBg, padding: 14, overflow: 'hidden', ...({}) }}>
                <Image
                  pointerEvents="none"
                  source={leagueBonusGiftImage}
                  style={{
                    position: 'absolute',
                    right: -8,
                    top: -16,
                    width: 120,
                    height: 120,
                    opacity: homeLeagueChestReady ? 0.22 : 0.14,
                    transform: [{ rotate: '-8deg' }],
                  }}
                  contentFit="contain"
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                    <View style={{ width: homeTodayIconSize, height: homeTodayIconSize, borderRadius: isCompassTheme ? compassHomeRadius : Math.round(homeTodayIconSize / 2), backgroundColor: leagueBonusPalette.iconBg, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: leagueBonusPalette.iconBorder, shadowColor: homeLeagueChestAccent, shadowOpacity: homeLeagueChestReady ? 0.42 : 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 7, overflow: 'visible' }}>
                      <Image source={leagueBonusGiftImage} style={{ width: homeTodayIconSize, height: homeTodayIconSize, opacity: homeLeagueChestReady ? 1 : 0.94 }} contentFit="contain"/>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }} numberOfLines={1}>
                        {triLang(lang, {
                    ru: 'Цель лиги',
                    uk: 'Ціль ліги',
                    es: 'Meta de liga',
                    'pt-BR': "Meta da liga",
                    vi: "Mục tiêu giải đấu",
                    id: "Target liga",
                    tr: "Lig hedefi",
                    pl: "Cel ligi",
                })}
                      </Text>
                      <Text style={{ color: leagueBonusPalette.textMuted, fontSize: Math.max(10, f.caption - 1), fontWeight: '800' }} numberOfLines={1}>
                        {homeLeagueChest.leagueName}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: homeLeagueChestAccent, fontSize: f.h2, fontWeight: '900' }}>
                    {homeLeagueChestPct}%
                  </Text>
                </View>
                <View style={{ height: 10, borderRadius: 6, overflow: 'hidden', backgroundColor: leagueBonusPalette.track, borderWidth: 0.5, borderColor: leagueBonusPalette.trackBorder }}>
                  <LinearGradient colors={homeLeagueChestFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${homeLeagueChestPct}%` as any, borderRadius: 6 }}/>
                </View>
              </LinearGradient>
            </TouchableOpacity>)}
          </>)}

          </Animated.View>

          {/* ── ФРАЗА ДНЯ + ПОДВАЛ ── */}
          <Animated.View style={sectionStyle(5)}>
          {HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? (<>
          <View style={{ marginHorizontal: 8, marginBottom: 10 }}>
            <Text style={{ color: t.textPrimary, fontSize: Math.max(13, f.label), fontWeight: '900', letterSpacing: 0, textTransform: 'uppercase' }} numberOfLines={1}>
              {triLang(lang, {
                    ru: 'Дополнительно',
                    uk: 'Додатково',
                    es: 'Adicional',
                    'pt-BR': "Adicional",
                    vi: "Thêm nữa",
                    id: "Tambahan",
                    tr: "Ekstra",
                    pl: "Dodatkowo",
                })}
            </Text>
          </View>
          {studyTarget !== 'fr' && <DailyPhraseCard variant="homeAdditional" />}
          </>) : studyTarget !== 'fr' ? <DailyPhraseCard /> : null}

          {/* Подвал */}
          <View style={{ alignItems: 'center', paddingVertical: 24, marginTop: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? 0 : 12, borderTopWidth: HOME_STATUS_DENSE_PROGRESS_EXPERIMENT ? 0 : 0.5, borderTopColor: t.border }}>
            <ReportErrorButton screen="home" dataId="home_main" dataText={triLang(lang, {
                ru: 'Главный экран',
                uk: 'Головний екран',
                es: 'Pantalla de inicio',
                'pt-BR': "Tela inicial",
                vi: "Màn hình chính",
                id: "Layar beranda",
                tr: "Ana ekran",
                pl: "Ekran główny",
            })}/>
          </View>
          </Animated.View>

      </ScrollView>);
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
    const titleModalButtonBorderColor = isGoldTheme ? GOLD_RICH.hairlineStrong : isCompassTheme ? compassHairlineStrong : (isLightTheme ? 'rgba(202,138,4,0.32)' : 'rgba(252,211,77,0.42)');
    const titleModalButtonBg = isGoldTheme ? 'rgba(246,227,161,0.13)' : isCompassTheme ? 'rgba(242,196,141,0.12)' : (isLightTheme ? 'rgba(202,138,4,0.12)' : 'rgba(252,211,77,0.13)');
    const earnedSpecialTitles = getEarnedSpecialTitles({
        level,
        totalXP,
        streak,
        helpfulReportsConfirmed: specialTitleStats.helpfulReportsConfirmed,
        dailyAllDoneStreak: specialTitleStats.dailyAllDoneStreak,
        earnedAchievementIds: specialTitleStats.earnedAchievementIds,
    });
    const earnedSpecialTitleIds = new Set(earnedSpecialTitles.map((title) => title.id));
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
    const selectedTitleRow = selectedTitleKey
        ? allTitleRows.find((title) => title.key === selectedTitleKey && title.unlocked) ?? null
        : null;
    const currentTitleKey = selectedTitleRow?.key ?? fallbackTitleKey;
    const allTitles = allTitleRows.map((title) => ({
        ...title,
        current: title.key === currentTitleKey,
    }));
    const earnedTitles = [
        ...allTitles.filter((title) => title.unlocked),
    ];
    const visibleTitles = titleModalTab === 'earned' ? earnedTitles : allTitles;
    const currentHomeTitle = allTitles.find((title) => title.current) ?? allTitles[0];
    const selectHomeTitle = (item: TitleModalRow) => {
        if (!item.unlocked)
            return;
        hapticTap();
        setSelectedTitleKey(item.key);
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
    const titleModalAllLabel = triLang(lang, {
        ru: 'Все титулы',
        uk: 'Усі титули',
        es: 'Todos',
        'pt-BR': "Todos",
        vi: "Tat ca",
        id: "Semua",
        tr: "Tumu",
        pl: "Wszystkie",
    });
    const titleModalSubtitle = titleModalTab === 'earned'
        ? triLang(lang, {
            ru: `${earnedTitles.length} из ${allTitles.length} уже открыто`,
            uk: `${earnedTitles.length} з ${allTitles.length} вже відкрито`,
            es: `${earnedTitles.length} de ${allTitles.length} desbloqueados`,
            'pt-BR': `${earnedTitles.length} de ${allTitles.length} desbloqueados`,
            vi: `${earnedTitles.length}/${allTitles.length} da mo`,
            id: `${earnedTitles.length} dari ${allTitles.length} terbuka`,
            tr: `${earnedTitles.length}/${allTitles.length} acildi`,
            pl: `${earnedTitles.length} z ${allTitles.length} odblokowane`,
        })
        : triLang(lang, {
            ru: 'Полная лестница титулов',
            uk: 'Повна драбина титулів',
            es: 'Escalera completa de titulos',
            'pt-BR': "Lista completa de titulos",
            vi: "Day du cac danh hieu",
            id: "Daftar lengkap gelar",
            tr: "Tum unvan sirasi",
            pl: "Pelna lista tytulow",
        });
    return (<View testID="screen-home" style={{ flex: 1 }} onLayout={notifyFirstHomeFrameReady}>
      <ScreenGradient>
      <View style={{ flex: 1 }}>
      {renderNewHome()}

      </View>

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
            borderWidth: 1,
            borderColor: t.gold + '66',
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

      <Modal visible={titleModalVisible} transparent animationType="fade" onRequestClose={() => setTitleModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.56)' }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setTitleModalVisible(false)} />
          <View style={{ maxHeight: Math.min(SCREEN_H * 0.82, 660), paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 14) + 10 }}>
            <LinearGradient colors={isGoldTheme ? goldPremiumPanel : t.cardGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, borderWidth: 1, borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : t.border, overflow: 'hidden', padding: 16 }}>
              {isGoldTheme && <GoldBevel radius={22} intensity="strong"/>}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', lineHeight: f.h2 + 5 }} numberOfLines={1}>
                    {titleModalHeading}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                    {titleModalSubtitle}
                  </Text>
                </View>
                <TouchableOpacity activeOpacity={0.75} onPress={() => setTitleModalVisible(false)} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 44, height: 44, borderRadius: isCompassTheme ? compassHomeRadius : 22, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? 'rgba(246,227,161,0.10)' : isCompassTheme ? COMPASS_RICH.wash : 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : isCompassTheme ? compassHairline : t.border }}>
                  <Ionicons name="close" size={22} color={t.textPrimary}/>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {([
                    ['earned', titleModalEarnedLabel],
                    ['all', titleModalAllLabel],
                ] as const).map(([tab, label]) => {
                    const active = titleModalTab === tab;
                    return (<TouchableOpacity key={tab} activeOpacity={0.8} onPress={() => {
                            hapticTap();
                            setTitleModalTab(tab);
                        }} accessibilityRole="button" style={{ flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? (isGoldTheme ? 'rgba(246,227,161,0.18)' : titleModalButtonBg) : (isGoldTheme ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.06)'), borderWidth: 1, borderColor: active ? titleModalButtonBorderColor : (isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border) }}>
                        <Text style={{ color: active ? (isLightTheme ? t.textSecond : t.gold) : t.textMuted, fontSize: f.label, fontWeight: '900' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                          {label}
                        </Text>
                      </TouchableOpacity>);
                })}
              </View>

              <ScrollView style={{ maxHeight: Math.min(SCREEN_H * 0.58, 480) }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 8 }}>
                {visibleTitles.map((item) => {
                    const titleColor = isLightTheme ? item.colorLight : item.colorDark;
                    return (<TouchableOpacity key={item.key} activeOpacity={item.unlocked ? 0.82 : 1} disabled={!item.unlocked} onPress={() => selectHomeTitle(item)} accessibilityRole="button" accessibilityState={{ disabled: !item.unlocked, selected: item.current }} style={{ minHeight: 64, borderRadius: 16, padding: 12, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: item.current ? titleModalButtonBg : (isGoldTheme ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.055)'), borderWidth: 1, borderColor: item.current ? titleModalButtonBorderColor : (item.unlocked ? titleColor + '55' : (isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border)) }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: item.unlocked ? titleColor + '22' : 'rgba(142,142,147,0.13)', borderWidth: 1, borderColor: item.unlocked ? titleColor + '66' : 'rgba(142,142,147,0.26)' }}>
                          <Ionicons name={item.unlocked ? (item.current ? 'ribbon' : 'checkmark-circle') : 'lock-closed'} size={20} color={item.unlocked ? titleColor : t.textMuted}/>
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
            </LinearGradient>
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
      <PremiumCelebrationModal visible={celebrationOverlayVisible} onClose={() => {
            setCelebrationVisible(false);
            // Consume the exact event marker so the same admin grant does not re-open on next sync.
            const marker = celebrationMarker;
            setCelebrationMarker(null);
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
                const sig = JSON.stringify({
                    prevLeagueId: pendingLeagueResult.prevLeagueId,
                    newLeagueId: pendingLeagueResult.newLeagueId,
                    myRank: pendingLeagueResult.myRank,
                    totalInGroup: pendingLeagueResult.totalInGroup,
                    promoted: pendingLeagueResult.promoted,
                    demoted: pendingLeagueResult.demoted,
                });
                // Сначала ставим оба гарда СИНХРОННО (до любого await), чтобы
                // параллельно стартующий loadData не успел показать модалку заново.
                dismissedLeagueResultRef.current = sig;
                dismissedLeagueResultThisSessionRef.current = true;
                setPendingLeagueResult(null);
                // Очистку AsyncStorage делаем фоном — её результат на UI не влияет.
                void clearPendingResult();
            }}/>)}
    </View>);
}
