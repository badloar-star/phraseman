import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabSwipeLock } from '../tabSwipeLock';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Modal, AppState, DeviceEventEmitter, InteractionManager, } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { usePremium } from '../../components/PremiumContext';
import { useTabNav } from '../TabContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
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
import PremiumCelebrationModal from '../../components/PremiumCelebrationModal';
import { getTodayTasksSafe, loadTodayProgress, TaskProgress } from '../daily_tasks';
import { getXPProgress, getLevelFromXP, getNextEnergyUnlockLevel } from '../../constants/theme';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../../constants/goldTheme';
import { getLeagueBonusPalette } from '../../constants/leagueBonusPalette';
import { getTitleString } from '../../constants/titles';
import { lessonNamesForLang } from '../../constants/lessons';
import { GREETINGS_ES } from '../../constants/greetings_es';
import { triLang, type Lang } from '../../constants/i18n';
import { BRAND_SHARDS_ES } from '../../constants/terms_es';
import PremiumCard from '../../components/PremiumCard';
import { hapticTap } from '../../hooks/use-haptics';
import CircularProgress from '../../components/CircularProgress';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../../constants/avatars';
import AvatarView from '../../components/AvatarView';
import { isCustomAvatarValue } from '../../constants/custom_avatars';
import { checkAchievements } from '../achievements';
import { USER_AVATAR_AURA_KEY, getEffectiveAvatarAuraId, normalizeAvatarAuraId } from '../../constants/avatar_auras';
import EnergyIcon from '../../components/EnergyIcon';
import { loadAllMedals, countMedals } from '../medal_utils';
import { getTrainerTotalDue } from '../trainer_store';
import { getCurrentMultiplier } from '../xp_manager';
import DailyPhraseCard from '../../components/DailyPhraseCard';
import ReportErrorButton from '../../components/ReportErrorButton';
import SaveProgressBanner from '../../components/SaveProgressBanner';
import PremiumGoldUserName from '../../components/PremiumGoldUserName';
import LeagueCrownName from '../../components/LeagueCrownName';
import GoldBevel from '../../components/GoldBevel';
import { useOverlayVisible } from '../../components/OverlayArbiter';
import { useEnergy } from '../../components/EnergyContext';
import { computeAllPercentiles } from '../leaderboard_stats';
import { getShardsBalance, peekLastKnownShardsBalance, spendShards, onStreakUpdated } from '../shards_system';
import { oskolokImageForPackShards } from '../oskolok';
import { buildLastLessonFromHydration, peekHomeScreenHydration, rememberHomeScreenHydration } from '../home_screen_hydration';
import AppMessagesInbox from '../../components/AppMessagesInbox';
import { getForegroundUsageMs } from '../foreground_usage_ms';
import { logFeatureOpened } from '../firebase';
import { trackFeatureOpened } from '../user_stats';
import { perfMark, perfScreenMount, perfNavStart } from '../perf-monitor';
import { emitAppEvent, onAppEvent } from '../events';
import { ensureAnonUser } from '../cloud_sync';
import { fetchActiveLeagueCrowns, getLeagueChestGoal } from '../services/league_chest_rewards';
import { shouldShowLeagueRace } from '../league_race_visibility';
import { getHomeMenuImages } from '../home_menu_icons';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
/** Ширина всплывающей подсказки энергии (clamp по экрану, стрелка привязана к иконкам). */
const ENERGY_TOOLTIP_W = 220;
const CONTENT_W = Math.min(SCREEN_W, 640);
const CARD_W = (CONTENT_W - 32 - 10) / 2;
const USE_ELITE_HOME_STATUS = true;
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
/** Тема «Скетч» (minimalLight): лёгкое смягчение теней grafit без «заблокированного» вида (сильная альфа = плоский серый). */
const SKETCH_MENU_ICON_LIGHTEN_OVERLAY = 'rgba(255, 252, 247, 0.2)';
type LightSketchMenuImageProps = Omit<React.ComponentProps<typeof Image>, 'style'> & {
    width: number;
    height: number;
    lighten: boolean;
};
function LightSketchMenuImage({ width, height, lighten, ...props }: LightSketchMenuImageProps) {
    const boxStyle = { width, height };
    if (!lighten) {
        return <Image {...props} style={boxStyle}/>;
    }
    return (<View style={boxStyle}>
      <Image {...props} style={boxStyle}/>
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: SKETCH_MENU_ICON_LIGHTEN_OVERLAY }]}/>
    </View>);
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
    const insets = useSafeAreaInsets();
    const { goToTab, activeIdx, focusTick } = useTabNav();
    const hh = homeStatsLoadedOnce ? peekHomeScreenHydration() : null;
    const [userName, setUserName] = useState(() => hh?.userName ?? '');
    const [streak, setStreak] = useState(() => hh?.streak ?? 0);
    const [displayStreak, setDisplayStreak] = useState(() => hh?.displayStreak ?? hh?.streak ?? 0);
    const streakScaleAnim = useRef(new Animated.Value(1)).current;
    const [totalXP, setTotalXP] = useState(() => hh?.totalXP ?? 0);
    const [homeStatsReady, setHomeStatsReady] = useState(() => !!(homeStatsLoadedOnce && hh));
    const level = getLevelFromXP(totalXP);
    const [weekDone, setWeekDone] = useState<boolean[]>(() => {
        const w = hh?.weekDone;
        return w && w.length === 7 ? [...w] : new Array(7).fill(false);
    });
    const [weekPoints, setWeekPoints] = useState(() => hh?.weekPoints ?? 0);
    const [lastLesson, setLastLesson] = useState<{
        id: number;
        name: string;
        progress: number;
        score: string;
    } | null>(() => buildLastLessonFromHydration(lang) ?? null);
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
    const { isPremium } = usePremium();
    // [SRS] Количество фраз, готовых к повторению сегодня.
    // Временно: только __DEV__ (в стор-сборках карточка скрыта, запрос не делаем).
    // >0 = карточка над «Тест/Экзамен», ведёт на /trainer.
    const [dueCount, setDueCount] = useState(0);
    const [userAvatar, setUserAvatar] = useState(() => hh?.userAvatar ?? '🐣');
    const [userAvatarAura, setUserAvatarAura] = useState<string | null>(null);
    const effectiveUserAvatarAura = getEffectiveAvatarAuraId(userAvatarAura, isPremium);
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
    // Premium celebration: после IAP-покупки или admin-grant с timestamp новее last seen.
    const [celebrationVisible, setCelebrationVisible] = useState(false);
    const [celebrationMarker, setCelebrationMarker] = useState<string | null>(null);
    const celebrationOverlayVisible = useOverlayVisible('premiumCelebration', celebrationVisible);
    const [premiumFreezeUsed, setPremiumFreezeUsed] = useState(() => hh?.premiumFreezeUsed ?? false);
    const [pageScrollEnabled, setPageScrollEnabled] = useState(true);
    const [medalCounts, setMedalCounts] = useState({ bronze: 0, silver: 0, gold: 0 });
    const [totalXPMulti, setTotalXPMulti] = useState(() => hh?.totalXPMulti ?? 1);
    const { energy: energyCount, bonusEnergy: energyBonus, maxEnergy: energyMax, recoveryIntervalMs: energyRecoveryIntervalMs, formattedTime: timeUntilNextEnergy, isUnlimited: energyUnlimited } = useEnergy();
    const energyRecoveryMinutes = Math.max(1, Math.round(energyRecoveryIntervalMs / 60000));
    const isSketchLightTheme = themeMode === 'minimalLight';
    const isLightTheme = isSketchLightTheme;
    const isGoldTheme = themeMode === 'gold';
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
    const BONUS_ENERGY_COLOR = isGoldTheme ? goldBright : '#FFD700';
    const PREMIUM_BLUE = isGoldTheme ? goldMetal : '#4FC3F7';
    const lightPanelBg = isSketchLightTheme ? 'rgba(255,253,248,0.82)' : 'rgba(255,255,255,0.50)';
    const lightPanelBorder = isSketchLightTheme ? 'rgba(40,37,32,0.16)' : 'rgba(255,255,255,0.48)';
    const lightPanelIconBg = isSketchLightTheme ? 'rgba(63,63,70,0.08)' : 'rgba(255,255,255,0.28)';
    const lightPanelChevronBg = isSketchLightTheme ? 'rgba(63,63,70,0.08)' : 'rgba(255,255,255,0.58)';
    const energyEmptyTint = isSketchLightTheme
        ? 'rgba(63,63,70,0.22)'
        : 'rgba(255,245,252,0.38)';
    const premiumEnergyTint = energyUnlimited ? (isLightTheme ? '#004F8C' : PREMIUM_BLUE) : undefined;
    const energyFilledTint = premiumEnergyTint;
    const energyFilledColor = energyUnlimited ? (isLightTheme ? '#004F8C' : PREMIUM_BLUE) : t.gold;
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
        Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }).start();
    }, [lang]);
    useEffect(() => {
        if (!USE_ELITE_HOME_STATUS)
            return;
        eliteStatusEntrance.setValue(1);
        eliteQuickTileEntrance.forEach((anim) => anim.setValue(1));
        eliteActivityTileEntrance.forEach((anim) => anim.setValue(1));
        const shimmerLoop = Animated.loop(Animated.sequence([
            Animated.timing(eliteStatusShimmer, { toValue: 1, duration: 2800, useNativeDriver: true }),
            Animated.delay(1100),
            Animated.timing(eliteStatusShimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]));
        shimmerLoop.start();
        return () => {
            shimmerLoop.stop();
        };
    }, [eliteActivityTileEntrance, eliteQuickTileEntrance, eliteStatusEntrance, eliteStatusShimmer, lang]);
    // Миграция v2: пороги XP удвоены — умножаем сохранённый XP на 2 (один раз).
    // Новые пользователи помечаются как "мигрированные" в handleOnboardingDone (_layout.tsx),
    // поэтому сюда попадают только старые пользователи со старой формулой XP.
    useEffect(() => {
        (async () => {
            const migrated = await AsyncStorage.getItem('xp_migration_v2');
            if (migrated)
                return;
            const raw = await AsyncStorage.getItem('user_total_xp');
            const xp = parseInt(raw || '0') || 0;
            if (xp > 0) {
                await AsyncStorage.setItem('user_total_xp', String(xp * 2));
            }
            await AsyncStorage.setItem('xp_migration_v2', '1');
        })();
    }, []);
    useEffect(() => {
        mountedRef.current = true;
        perfScreenMount('home');
        let resumeTimer: ReturnType<typeof setTimeout> | null = null;
        let resumeTask: {
            cancel?: () => void;
        } | null = null;
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                if (resumeTimer)
                    clearTimeout(resumeTimer);
                resumeTask?.cancel?.();
                resumeTimer = setTimeout(() => {
                    resumeTimer = null;
                    resumeTask = InteractionManager.runAfterInteractions(() => {
                        loadData();
                    });
                }, 350);
            }
            else if (resumeTimer) {
                clearTimeout(resumeTimer);
                resumeTimer = null;
                resumeTask?.cancel?.();
            }
        });
        // Слушаем событие изменения XP (от тестеров и других экранов)
        const xpSub = DeviceEventEmitter.addListener('xp_changed', () => { loadData(); });
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
                    Animated.timing(shardsBonusAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.delay(900),
                    Animated.timing(shardsBonusAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
                ]).start();
                Animated.sequence([
                    Animated.spring(shardsAnim, { toValue: 1.35, useNativeDriver: true, friction: 3 }),
                    Animated.spring(shardsAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
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
            if (streakTimerRef.current)
                clearTimeout(streakTimerRef.current);
            if (energyTooltipTimer.current)
                clearTimeout(energyTooltipTimer.current);
        };
    }, []);
    // Debounce-флаг: если loadData уже выполняется — не запускаем повторно.
    // Устраняет 3 одновременных вызова (focusTick + activeIdx + AppState) при возврате на главную.
    // needsReloadRef: если вызов был пропущен во время загрузки — повторим после завершения.
    const loadingRef = useRef(false);
    const needsReloadRef = useRef(false);
    useEffect(() => { loadData(); }, [focusTick]);
    useEffect(() => { if (activeIdx === 0)
        loadData(); }, [activeIdx]);
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
                Animated.timing(statsHintPulseAnim, { toValue: 1.07, duration: 650, useNativeDriver: true }),
                Animated.timing(statsHintPulseAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
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
            const [name, streakVal, weekData, weekPts, xpStored, shardsBal] = await Promise.all([
                AsyncStorage.getItem('user_name'),
                AsyncStorage.getItem('streak_count'),
                AsyncStorage.getItem('week_days_done'),
                getMyWeekPoints(),
                AsyncStorage.getItem('user_total_xp'),
                getShardsBalance(),
            ]);
            setShardsBalance(shardsBal);
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
                            Animated.spring(streakScaleAnim, { toValue: 1.6, useNativeDriver: true, friction: 3, tension: 200 }),
                            Animated.spring(streakScaleAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 150 }),
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
            const pool = lang === 'uk' ? GREETINGS_UK : lang === 'es' ? GREETINGS_ES : GREETINGS_RU;
            if (pool.length > 0) {
                const phrase = await resolveDailyGreeting(pool, lang);
                if (mountedRef.current)
                    setGreeting(phrase);
            }
            let done = 0;
            const lessonKeys = Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_progress`);
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
            const lastLessonIdKey = await AsyncStorage.getItem('last_opened_lesson');
            const lastId = lastLessonIdKey ? parseInt(lastLessonIdKey, 10) : null;
            if (lastId && lastId >= 1 && lastId <= 32) {
                const lessonNames = lessonNamesForLang(lang);
                const saved = await AsyncStorage.getItem(`lesson${lastId}_progress`);
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
            setFreezeActive(!!(parsedFreeze?.active));
            setPremiumFreezeUsed(freeFreezeRaw === 'true');
            setTotalXPMulti(baseMulti);
            rememberHomeScreenHydration({
                userName: name ?? '',
                totalXP: xpSnap,
                streak: currentStreakNum,
                displayStreak: currentStreakNum,
                weekDone: weekParsedForSnap,
                weekPoints: weekPts,
                shardsBalance: shardsBal,
                lessonsCompleted: done,
                freezeActive: !!(parsedFreeze?.active),
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
            });
            if (mountedRef.current)
                setHomeStatsReady(true);
            const taskList = await getTodayTasksSafe();
            // Имя для лиги: либо настоящее, либо аноним-fallback на основе уровня (как в club_screen.tsx),
            // чтобы checkLeagueOnAppOpen не записал в Firestore "пустого" пользователя.
            const leagueName = (name && name.trim())
                || (() => {
                    const xpNum = parseInt(xpStored || '0', 10) || 0;
                    const lvl = getXPProgress(xpNum).level;
                    return `${getTitleString(lvl, lang ?? 'ru')} #${Math.floor(1000 + Math.random() * 9000)}`;
                })();
            const [tp, leagueOpenResult, dueItems, allMedals, repairEligible, bonusRaw, comebackRaw, pbRaw] = await Promise.all([
                loadTodayProgress(taskList),
                // Полный расчёт: при смене ISO-недели создаст pending и сохранит state.
                // Если remote недоступен — функция сама фолбэкнется на локальный state.
                checkLeagueOnAppOpen(leagueName, weekPts).catch(() => null),
                __DEV__ ? getTrainerTotalDue().then(n => Array(n).fill(null)) : Promise.resolve([]),
                loadAllMedals(),
                isRepairEligible(),
                AsyncStorage.getItem('login_bonus_pending'),
                AsyncStorage.getItem('comeback_pending'),
                AsyncStorage.getItem('weekly_pb_v1'),
            ]);
            const leagueState = leagueOpenResult?.state ?? null;
            // Если checkLeagueOnAppOpen упал/таймаутнул — fallback на чтение pending напрямую,
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
                const alreadyFrozen = !!(freeze2?.active);
                if (!alreadyFrozen) {
                    setStreakAtRisk(true);
                }
                if (!isPremium) {
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
        }
        catch (error) {
            DebugLogger.error('home.tsx:checkDailyReward', error, 'warning');
        }
        finally {
            endPerf();
            homeStatsLoadedOnce = true;
            if (mountedRef.current)
                setHomeStatsReady(true);
            loadingRef.current = false;
            // Если во время загрузки пришёл ещё один запрос — выполняем его сейчас
            if (needsReloadRef.current) {
                needsReloadRef.current = false;
                loadData();
            }
        }
    };
    const FREEZE_COST_SHARDS = 1;
    const handleFreezeStreak = async () => {
        hapticTap();
        const today = new Date().toISOString().split('T')[0];
        const freeAvailable = isPremium && !premiumFreezeUsed;
        if (!isPremium) {
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
        setFreezeActive(true);
        setStreakAtRisk(false);
        void checkAchievements({ type: 'streak_freeze_used' });
    };
    const weekDays = lang === 'uk'
        ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
        : lang === 'es'
            ? ['L', 'M', 'X', 'J', 'V', 'S', 'D']
            : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
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
        const homeQuickIconPlateSize = 88;
        const homeQuickIconImageSize = 82;
        const homeQuickIconLegacySize = 84;
        const homeQuickIconRadius = isGoldTheme ? 18 : 22;
        const homePracticeIconSize = 64;
        const quickItems = [
            { key: 'lessons', testID: 'home-quick-lessons', img: menuImages.lesson, label: s.tabs.lessons, sub: triLang(lang, {
                    ru: '32 урока',
                    uk: '32 уроки',
                    es: '32 lecciones',
                    'pt-BR': "32 lições",
                    vi: "32 bài học",
                    id: "32 pelajaran",
                    tr: "32 ders",
                    pl: "32 lekcje",
                }), path: 'lessons' },
            { key: 'quizzes', testID: 'home-quick-quizzes', img: menuImages.quizes, label: s.tabs.quizzes, sub: triLang(lang, {
                    ru: '3 уровня',
                    uk: '3 рівні',
                    es: '3 niveles de dificultad',
                    'pt-BR': "3 níveis de dificuldade",
                    vi: "3 mức độ khó",
                    id: "3 tingkat kesulitan",
                    tr: "3 zorluk seviyesi",
                    pl: "3 poziomy trudności",
                }), path: '/quizzes_screen' },
            { key: 'flashcards', testID: 'home-quick-flashcards', img: menuImages.cards, label: s.tabs.flashcards, sub: triLang(lang, {
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
        const themedClubIcon = menuImages.league;
        /** Второй ряд быстрых плиток — тот же визуал, что «Уроки / Квизы / Карточки». */
        const activityQuickItems = [
            {
                key: 'daily',
                kind: 'tasks' as const,
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
                label: s.home.attestTile,
                path: '/diagnostic_test' as const,
                img: menuImages.test,
            },
        ];
        const xpPct = Math.min(100, Math.max(0, Math.round(progress * 100)));
        const eliteStatsCompact = CONTENT_W < 370;
        const eliteAvatarSize = eliteStatsCompact ? 54 : 60;
        const eliteStreakColumnWidth = eliteStatsCompact ? 102 : 116;
        const eliteStreakIconBox = eliteStatsCompact ? 30 : 34;
        const eliteStreakValueSize = displayStreak >= 1000
            ? (eliteStatsCompact ? 29 : 31)
            : (eliteStatsCompact ? 33 : 36);
        const eliteLabelFontSize = Math.max(11, f.label - 1);
        const eliteLevelValueSize = Math.max(eliteStatsCompact ? 24 : 26, f.h2 + (eliteStatsCompact ? 2 : 3));
        const eliteTitleFontSize = Math.max(16, f.sub);
        const eliteMetaFontSize = Math.max(13, f.label);
        const eliteXpBadgeFontSize = Math.max(12, f.label - 1);
        const eliteWeekDotSize = eliteStatsCompact ? 25 : 27;
        const eliteWeekDayFontSize = Math.max(12, f.label - 1);
        const eliteCardY = eliteStatusEntrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
        const eliteCardScale = eliteStatusEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });
        const eliteShimmerX = eliteStatusShimmer.interpolate({ inputRange: [0, 1], outputRange: [-90, Math.max(320, CONTENT_W)] });
        const homeHeaderShardIconSource = oskolokImageForPackShards(Math.max(1, shardsBalance));
        const homeHeaderShardIconSize = 38;
        const homeEnergyIconSize = energyMax > 6 ? 34 : 38;
        const homeEnergyIconOverlap = -Math.round(homeEnergyIconSize * 0.45);
        const homeLeagueChestPct = homeLeagueChest
            ? Math.min(100, Math.round((homeLeagueChest.progress / Math.max(1, homeLeagueChest.goal)) * 100))
            : 0;
        const homeLeagueChestReady = homeLeagueChestPct >= 100;
        const homeLeagueChestAccent = homeLeagueChestReady ? leagueBonusPalette.readyAccent : leagueBonusPalette.accent;
        const homeLeagueChestFill = homeLeagueChestReady ? leagueBonusPalette.readyFill : leagueBonusPalette.fill;
        return (<ScrollView scrollEnabled={pageScrollEnabled} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32, paddingTop: 6 }}>

          {/* ХЕДЕР */}
          <Animated.View style={sectionStyle(0)}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 20, paddingBottom: 12, gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.heroTextMuted, fontSize: f.caption }}>{greeting}</Text>
              {homeLeagueRaceVisible && homeLeagueCrownExpiresAt > Date.now() ? (<View style={{ marginTop: 2, alignSelf: 'flex-start', maxWidth: '100%' }}>
                  <LeagueCrownName text={userName || 'Phraseman'} fontSize={f.h1}/>
                </View>) : isPremium ? (<PremiumGoldUserName text={userName || 'Phraseman'} fontSize={f.h1} onGradient/>) : (<Text style={{ color: t.heroTextPrimary, fontSize: f.h1, fontWeight: '700', marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>{userName || 'Phraseman'}</Text>)}
              {/* Анимация начисления осколков */}
              <Animated.Text style={{
                position: 'absolute', top: -18, right: 0,
                color: isGoldTheme ? GOLD_RICH.paleGold : '#A78BFA', fontSize: 13, fontWeight: '700',
                opacity: shardsBonusAnim,
                transform: [{ translateY: shardsBonusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }],
            }}>{shardsBonusText}</Animated.Text>
              {/* Energy + shards — в одной строке */}
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
                  <View ref={energyIconRef} collapsable={false} style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                <TouchableOpacity activeOpacity={0.7} onPress={showEnergyTooltip} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {Array.from({ length: energyMax }).map((_, i) => (<View key={i} style={{ marginLeft: i > 0 ? homeEnergyIconOverlap : 0 }}>
                        <EnergyIcon filled={i < energyCount} themeColor={i < energyCount ? energyFilledColor : (isLightTheme ? energyEmptyTint : t.textGhost)} size={homeEnergyIconSize} animateChange={true} shouldShake={false} themeMode={themeMode} tintColor={i < energyCount ? energyFilledTint : undefined} isPremium={energyUnlimited} variant={freezeActive ? 'frozen' : 'normal'}/>
                      </View>))}
                    {energyBonus > 0 && Array.from({ length: energyBonus }).map((_, i) => (<View key={`bonus_${i}`} style={{ marginLeft: homeEnergyIconOverlap }}>
                        <EnergyIcon filled={true} themeColor={BONUS_ENERGY_COLOR} size={homeEnergyIconSize} animateChange={false} shouldShake={false} themeMode={themeMode} tintColor={BONUS_ENERGY_COLOR} variant={freezeActive ? 'frozen' : 'normal'}/>
                      </View>))}
                  </View>
                  {!energyUnlimited && energyCount < energyMax && timeUntilNextEnergy && (<Text style={{ fontSize: f.label, color: t.heroTextMuted, fontWeight: '500', marginLeft: 6 }}>
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
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <TouchableOpacity activeOpacity={0.75} onPress={() => {
                hapticTap();
                router.push('/shards_shop');
            }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Animated.View style={{ transform: [{ scale: shardsAnim }], flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Image source={homeHeaderShardIconSource} style={{ width: homeHeaderShardIconSize, height: homeHeaderShardIconSize }} resizeMode="contain"/>
                      <Text style={{ color: isGoldTheme ? GOLD_RICH.paleGold : '#A78BFA', fontSize: 15, fontWeight: '900' }}>{shardsBalance}</Text>
                    </Animated.View>
                  </TouchableOpacity>
                  <AppMessagesInbox />
                </View>
              </View>

            </View>
          </View>

          {bannersJSX}
          </Animated.View>

          {/* ── ГЕРОЙ: Уровень + Цепочка ── */}
          <Animated.View style={sectionStyle(1)}>
          <TouchableOpacity testID="home-stats-card" activeOpacity={0.88} onPress={() => { hapticTap(); router.push('/streak_stats'); }} style={[{ marginHorizontal: 16, marginBottom: 12 }, isGoldTheme ? goldShadow(3) : null, null]} accessibilityRole="button" accessibilityLabel={s.home.statsCardTitle} accessibilityHint={s.home.statsPulseHint}>
            <LinearGradient colors={isGoldTheme ? goldPremiumPanel : t.cardGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: isGoldTheme ? 18 : 24, borderWidth: isGoldTheme ? 1 : 0.5, borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : t.border, padding: 20, minHeight: homeStatsReady ? undefined : 200 }}>
              {isGoldTheme && <GoldBevel radius={18} intensity="strong"/>}
              {/* Декоративные круги — в отдельном контейнере чтобы не обрезать текст */}
              {!USE_ELITE_HOME_STATUS && (<View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: isGoldTheme ? 18 : 24, overflow: 'hidden' }} pointerEvents="none">
                  <View style={{ position: 'absolute', top: -30, right: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: t.textSecond + '12' }}/>
                  <View style={{ position: 'absolute', bottom: -20, left: -10, width: 70, height: 70, borderRadius: 35, backgroundColor: t.correct + '10' }}/>
                </View>)}

              {USE_ELITE_HOME_STATUS ? (<Animated.View style={{
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
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text allowFontScaling={false} style={{ color: t.textMuted, fontSize: eliteLabelFontSize, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                          {triLang(lang, {
                    ru: 'Статус игрока',
                    uk: 'Статус гравця',
                    es: 'Estado del jugador',
                    'pt-BR': "Status do jogador",
                    vi: "Trạng thái người chơi",
                    id: "Status pemain",
                    tr: "Oyuncu durumu",
                    pl: "Status gracza",
                })}
                        </Text>
                        <Text allowFontScaling={false} style={{ color: t.textPrimary, fontSize: eliteLevelValueSize, fontWeight: '900', lineHeight: eliteLevelValueSize + 5 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.88}>
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
                        <Text allowFontScaling={false} style={{ color: isLightTheme ? t.textSecond : t.gold, fontSize: eliteTitleFontSize, fontWeight: '800', lineHeight: eliteTitleFontSize + 4, marginTop: 1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>
                          {getTitleString(level, lang)}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end', width: eliteStreakColumnWidth, flexShrink: 0 }}>
                      <Text allowFontScaling={false} style={{ color: t.textMuted, fontSize: eliteLabelFontSize, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3, textAlign: 'right', width: '100%' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                        {s.home.streakLabel}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, width: '100%' }}>
                        <Animated.Text allowFontScaling={false} style={{ color: t.textPrimary, fontSize: eliteStreakValueSize, fontWeight: '900', lineHeight: eliteStreakValueSize + 5, transform: [{ scale: streakScaleAnim }], minWidth: eliteStreakColumnWidth - eliteStreakIconBox - 7, textAlign: 'right', includeFontPadding: false }} numberOfLines={1}>
                          {displayStreak}
                        </Animated.Text>
                        <View style={{
                    width: eliteStreakIconBox,
                    height: eliteStreakIconBox,
                    borderRadius: eliteStreakIconBox / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: freezeActive
                        ? (isGoldTheme ? goldSoftBg : 'rgba(100,180,255,0.16)')
                        : (isGoldTheme ? goldSoftBg : 'rgba(255,107,53,0.16)'),
                    borderWidth: 1,
                    borderColor: freezeActive
                        ? (isGoldTheme ? goldHairline : 'rgba(100,180,255,0.52)')
                        : (isGoldTheme ? goldHairline : 'rgba(255,138,61,0.46)'),
                }}>
                          <Ionicons name={freezeActive ? 'snow-outline' : 'flame'} size={eliteStatsCompact ? 20 : 23} color={freezeActive ? (isGoldTheme ? GOLD_RICH.champagne : '#64B4FF') : (streak > 0 ? (isGoldTheme ? GOLD_RICH.metalGold : '#FF8A3D') : t.textGhost)}/>
                        </View>
                      </View>
                      <Text allowFontScaling={false} style={{ color: t.textSecond, fontSize: eliteMetaFontSize, fontWeight: '700', textAlign: 'right', width: '100%', lineHeight: eliteMetaFontSize + 4 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                        {s.home.streakDays}
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
                    backgroundColor: isLightTheme ? 'rgba(255,255,255,0.35)' : isGoldTheme ? 'rgba(0,0,0,0.36)' : 'rgba(255,255,255,0.08)',
                    borderWidth: isGoldTheme ? StyleSheet.hairlineWidth : 0,
                    borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : 'transparent',
                }}>
                      <LinearGradient colors={isLightTheme ? [t.accent, '#FFFFFFAA'] : isGoldTheme ? GOLD_GRADIENTS.progressMetal : [t.gold, '#FFF2B0', t.accent]} locations={isGoldTheme ? [0, 0.48, 1] : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${xpPct}%` as any, height: '100%', borderRadius: 8, overflow: 'hidden' }}>
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

                  {isPremium && homeXpPercentile !== null && (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 13 }}>
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
                    {weekDays.map((d, i) => (<View key={i} style={{ alignItems: 'center', gap: 6, width: 34 }}>
                        <View style={{
                        width: eliteWeekDotSize, height: eliteWeekDotSize, borderRadius: eliteWeekDotSize / 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        backgroundColor: isGoldTheme ? 'transparent' : weekDone[i] ? t.correct : (isLightTheme
                            ? (i === todayIdx ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.34)')
                            : (i === todayIdx ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)')),
                        borderWidth: weekDone[i] ? 0 : 1,
                        borderColor: isGoldTheme
                            ? (i === todayIdx ? GOLD_RICH.hairlineStrong : GOLD_RICH.hairlineQuiet)
                            : i === todayIdx ? (isLightTheme ? t.textSecond : t.gold) : (isLightTheme ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.10)'),
                    }}>
                          {isGoldTheme && (<>
                              <LinearGradient colors={weekDone[i] ? GOLD_GRADIENTS.metallicFill : ['rgba(23,23,23,0.66)', 'rgba(10,10,10,0.58)', 'rgba(7,7,7,0.50)']} locations={[0, 0.48, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}/>
                              <GoldBevel radius={eliteWeekDotSize / 2} intensity={weekDone[i] ? 'normal' : 'quiet'}/>
                            </>)}
                          {weekDone[i] && <Ionicons name="checkmark" size={eliteStatsCompact ? 15 : 16} color={isGoldTheme ? t.textOnGold : t.textPrimary}/>}
                        </View>
                        <Text style={{ color: weekDone[i] || i === todayIdx ? t.textPrimary : t.textMuted, fontSize: eliteWeekDayFontSize, fontWeight: '800' }}>{d}</Text>
                      </View>))}
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
                </Animated.View>) : (<>
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
                      <Text style={{ color: isLightTheme ? t.textSecond : t.gold, fontSize: 12, fontWeight: '600', marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {getTitleString(level, lang)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                  <Text style={{ color: t.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{s.home.streakLabel}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Animated.Text style={{ color: t.textPrimary, fontSize: 34, fontWeight: '800', lineHeight: 38, transform: [{ scale: streakScaleAnim }] }}>{displayStreak}</Animated.Text>
                    <Ionicons name={freezeActive ? 'snow-outline' : 'flame'} size={30} color={freezeActive ? (isGoldTheme ? GOLD_RICH.champagne : '#64B4FF') : (streak > 0 ? (isGoldTheme ? GOLD_RICH.metalGold : '#FF6B35') : t.textGhost)}/>
                  </View>
                  <Text style={{ color: t.textSecond, fontSize: 13 }} numberOfLines={1}>{s.home.streakDays}</Text>
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
              {isPremium && homeXpPercentile !== null && (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
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
                {weekDays.map((d, i) => (<View key={i} style={{ alignItems: 'center', gap: 6 }}>
                    <View style={{
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: weekDone[i] ? t.correct : (isLightTheme
                            ? (i === todayIdx ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.38)')
                            : (i === todayIdx ? t.textPrimary + '66' : t.bgSurface2)),
                        borderWidth: weekDone[i] ? 0 : (isLightTheme ? (i === todayIdx && !weekDone[i] ? 2 : 1) : (i === todayIdx && !weekDone[i] ? 2 : 0)),
                        borderColor: isGoldTheme ? goldHairline : isLightTheme ? t.textMuted : t.textPrimary,
                    }}/>
                    <Text style={{ color: weekDone[i] ? t.textPrimary : t.textMuted, fontSize: 12, fontWeight: '600' }}>{d}</Text>
                  </View>))}
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
          {(streakAtRisk && !freezeActive || lastLesson != null) && (<Animated.View style={sectionStyle(2)}>
          {/* ЗАМОРОЗКА ЦЕПОЧКИ — для всех когда цепочка под угрозой */}
          {streakAtRisk && !freezeActive && (<TouchableOpacity activeOpacity={0.88} onPress={handleFreezeStreak} style={{
                        marginHorizontal: 16,
                        marginBottom: 12,
                        borderRadius: isGoldTheme ? 14 : 16,
                        backgroundColor: isGoldTheme ? goldPanelBg : '#1A3A5C',
                        borderWidth: 1,
                        borderColor: isGoldTheme ? goldHairline : '#4FC3F7',
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        ...({}),
                    }}>
              <Text style={{ fontSize: 28 }}>🧊</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: isGoldTheme ? GOLD_RICH.champagne : '#4FC3F7', fontSize: 13, fontWeight: '700' }}>
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
                  {!isPremium
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
                {!isPremium
                        ? <Text style={{ color: isGoldTheme ? GOLD_RICH.champagne : '#FFB74D', fontSize: 11, fontWeight: '700' }}>Premium</Text>
                        : isPremium && !premiumFreezeUsed
                            ? <Text style={{ color: isGoldTheme ? GOLD_RICH.paleGold : '#4FC3F7', fontSize: 12, fontWeight: '700' }}>
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
                            : <Text style={{ color: shardsBalance >= FREEZE_COST_SHARDS ? (isGoldTheme ? GOLD_RICH.paleGold : '#4FC3F7') : t.textGhost, fontSize: 12, fontWeight: '700' }}>
                        {FREEZE_COST_SHARDS} 💎
                      </Text>}
                <Ionicons name="chevron-forward" size={16} color={isGoldTheme ? GOLD_RICH.champagne : '#4FC3F7'}/>
              </View>
            </TouchableOpacity>)}

          {/* ПРОДОЛЖИТЬ УРОК */}
          {lastLesson != null && (USE_ELITE_HOME_STATUS ? (<TouchableOpacity testID="home-continue-lesson" activeOpacity={0.88} onPress={() => { hapticTap(); router.push({ pathname: '/lesson_menu', params: { id: lastLesson.id } }); }} style={{
                        marginHorizontal: 16,
                        marginBottom: 12,
                        borderRadius: isGoldTheme ? 14 : 18,
                        borderWidth: 1,
                        borderColor: isGoldTheme ? goldHairline : isLightTheme ? lightPanelBorder : 'rgba(255,255,255,0.10)',
                        backgroundColor: isGoldTheme ? goldPanelRaisedBg : isLightTheme ? lightPanelBg : 'rgba(255,255,255,0.07)',
                        padding: 15,
                        overflow: 'hidden',
                        ...({}),
                    }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress pct={Math.round(lastLesson.progress / 50 * 100)} size={52} sw={5} color={isGoldTheme ? GOLD_RICH.champagne : t.accent} bg={t.bgSurface} textColor={t.textPrimary} fontSize={10}/>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                        {s.home.continueBtn}
                      </Text>
                      <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', marginTop: 4 }} numberOfLines={1}>
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
                      <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }} numberOfLines={1}>
                        {lessonNamesForLang(lang)[lastLesson.id - 1] ?? lastLesson.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 }}>
                        <Text style={{ color: isLightTheme ? t.textSecond : t.gold, fontSize: 12, fontWeight: '800' }}>★ {lastLesson.score}</Text>
                        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: t.textGhost }}/>
                        <Text style={{ color: t.textSecond, fontSize: 12, fontWeight: '700' }}>{lastLesson.progress}/50</Text>
                      </View>
                    </View>
                    <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? goldSoftBg : isLightTheme ? lightPanelChevronBg : 'rgba(255,255,255,0.08)' }}>
                      <Ionicons name="chevron-forward" size={19} color={isLightTheme ? t.textSecond : t.gold}/>
                    </View>
                  </View>
              </TouchableOpacity>) : (<PremiumCard testID="home-continue-lesson" level={3} onPress={() => router.push({ pathname: '/lesson_menu', params: { id: lastLesson.id } })} style={{ marginHorizontal: 16, marginBottom: 12 }} innerStyle={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <CircularProgress pct={Math.round(lastLesson.progress / 50 * 100)} size={52} sw={5} color={isGoldTheme ? GOLD_RICH.champagne : t.accent} bg={t.bgSurface} textColor={t.textPrimary} fontSize={10}/>
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
                    })} ${lastLesson.id} — ${lessonNamesForLang(lang)[lastLesson.id - 1] ?? lastLesson.name}`}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>★ {lastLesson.score} · {lastLesson.progress}/50</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={t.textGhost}/>
              </PremiumCard>))}
          </Animated.View>)}

          {/* Persistent баннер "Сохрани прогресс" — для незалогиненных юзеров с XP ≥ 1000.
                Сам решает показываться или нет (см. SaveProgressBanner.tsx). */}
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <SaveProgressBanner />
          </View>

          {/* БЫСТРЫЙ ДОСТУП: уроки + квизы + карточки */}
          <Animated.View style={sectionStyle(3)}>
          <View onTouchStart={() => { tabSwipeLock.blocked = true; }} onTouchEnd={() => { tabSwipeLock.blocked = false; }} onTouchCancel={() => { tabSwipeLock.blocked = false; }}>
          <View style={{ marginBottom: 12, paddingHorizontal: 16, gap: 10, flexDirection: 'row' }}>
              {quickItems.map((item, index) => {
                const tileOpacity = eliteQuickTileEntrance[index] ?? eliteStatusEntrance;
                const tileY = tileOpacity.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
                const tileBorderColor = isGoldTheme ? goldHairline : isLightTheme ? lightPanelBorder : 'rgba(255,255,255,0.10)';
                const tileIconBg = isGoldTheme ? goldIconPlateBg : isLightTheme ? lightPanelIconBg : 'rgba(255,255,255,0.045)';
                return (<Animated.View key={item.label} style={{
                        flex: 1,
                        opacity: USE_ELITE_HOME_STATUS ? tileOpacity : 1,
                        transform: USE_ELITE_HOME_STATUS ? [{ translateY: tileY }] : [],
                    }}>
                <TouchableOpacity testID={item.testID} accessibilityLabel={`qa-${item.testID}`} accessible={true} activeOpacity={0.78} onPress={() => {
                        go(item.path);
                    }} style={{
                        flex: 1,
                        borderRadius: isGoldTheme ? 14 : 18,
                        borderWidth: USE_ELITE_HOME_STATUS ? 1 : 0.5,
                        borderColor: USE_ELITE_HOME_STATUS ? tileBorderColor : t.border,
                        overflow: 'hidden',
                        backgroundColor: USE_ELITE_HOME_STATUS
                            ? (isGoldTheme ? goldPanelBg : isLightTheme ? lightPanelBg : 'rgba(255,255,255,0.055)')
                            : 'transparent',
                        ...(isGoldTheme ? goldShadow(1) : {}),
                        ...({}),
                    }}>
              {USE_ELITE_HOME_STATUS ? (<View style={{ flex: 1, borderRadius: isGoldTheme ? 14 : 18, paddingHorizontal: 10, paddingVertical: 13, alignItems: 'center', gap: 6 }}>
                      {isGoldTheme && <GoldBevel radius={14} intensity="quiet"/>}
                      <View style={{
                            width: homeQuickIconPlateSize,
                            height: homeQuickIconPlateSize,
                            borderRadius: homeQuickIconRadius,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: tileIconBg,
                        }}>
                        {item.img
                            ? (<LightSketchMenuImage source={item.img} width={homeQuickIconImageSize} height={homeQuickIconImageSize} lighten={themeMode === 'minimalLight'} contentFit="contain" cachePolicy="memory-disk"/>)
                            : <View style={{ width: homeQuickIconImageSize, height: homeQuickIconImageSize, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: f.numLg + 4 }}>...</Text></View>}
                      </View>
                      <Text style={{ color: t.textPrimary, fontSize: Math.max(12, f.label - 1), fontWeight: '800', textAlign: 'center' }} numberOfLines={1}>{item.label}</Text>
                    </View>) : (<LinearGradient colors={isGoldTheme ? goldRaisedTile : t.cardGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: isGoldTheme ? 14 : 18, paddingHorizontal: 10, paddingVertical: 14, alignItems: 'center', gap: 5 }}>
                  {isGoldTheme && <GoldBevel radius={14} intensity="normal"/>}
                  <View style={{ position: 'relative' }}>
                    {item.img
                            ? (<LightSketchMenuImage source={item.img} width={homeQuickIconLegacySize} height={homeQuickIconLegacySize} lighten={themeMode === 'minimalLight'} contentFit="contain" cachePolicy="memory-disk"/>)
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

          {/* ТРЕНЕР — стационарная кнопка, всегда видна */}
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <TouchableOpacity activeOpacity={0.85} testID="home-open-trainer" onPress={() => { hapticTap(); router.push('/trainer'); }} style={{
                borderRadius: isGoldTheme ? 14 : 16,
                borderWidth: USE_ELITE_HOME_STATUS ? 1 : 0.5,
                borderColor: USE_ELITE_HOME_STATUS
                    ? (isGoldTheme ? goldHairline : isLightTheme ? lightPanelBorder : 'rgba(255,255,255,0.10)')
                    : t.border,
                overflow: 'hidden',
                backgroundColor: USE_ELITE_HOME_STATUS
                    ? (isGoldTheme ? goldPanelBg : isLightTheme ? lightPanelBg : 'rgba(255,255,255,0.055)')
                    : 'transparent',
                ...(isGoldTheme ? goldShadow(1) : {}),
                ...({}),
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: isGoldTheme ? 14 : 16, padding: 14 }}>
              {isGoldTheme && <GoldBevel radius={14} intensity="quiet"/>}
              <View style={{ width: homePracticeIconSize, height: homePracticeIconSize, borderRadius: 12, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                <LightSketchMenuImage source={menuImages.practice} width={homePracticeIconSize} height={homePracticeIconSize} lighten={themeMode === 'minimalLight'} contentFit="contain" cachePolicy="memory-disk"/>
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
              {activityQuickItems.map((item, index) => {
                const tileOpacity = eliteActivityTileEntrance[index] ?? eliteStatusEntrance;
                const tileY = tileOpacity.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
                const tileBorderColor = isGoldTheme ? goldHairline : isLightTheme ? lightPanelBorder : 'rgba(255,255,255,0.10)';
                const tileIconBg = isGoldTheme ? goldIconPlateBg : isLightTheme ? lightPanelIconBg : 'rgba(255,255,255,0.045)';
                return (<Animated.View key={item.key} style={{
                        flex: 1,
                        opacity: USE_ELITE_HOME_STATUS ? tileOpacity : 1,
                        transform: USE_ELITE_HOME_STATUS ? [{ translateY: tileY }] : [],
                    }}>
                  <TouchableOpacity testID={`home-activity-${item.key}`} activeOpacity={0.78} onPress={() => { go(item.path); }} style={{
                        flex: 1,
                        borderRadius: isGoldTheme ? 14 : 18,
                        borderWidth: USE_ELITE_HOME_STATUS ? 1 : 0.5,
                        borderColor: USE_ELITE_HOME_STATUS ? tileBorderColor : t.border,
                        overflow: 'hidden',
                        backgroundColor: USE_ELITE_HOME_STATUS
                            ? (isGoldTheme ? goldPanelBg : isLightTheme ? lightPanelBg : 'rgba(255,255,255,0.055)')
                            : 'transparent',
                        ...(isGoldTheme ? goldShadow(1) : {}),
                        ...({}),
                    }}>
                    {USE_ELITE_HOME_STATUS ? (<View style={{ flex: 1, borderRadius: isGoldTheme ? 14 : 18, paddingHorizontal: 10, paddingVertical: 13, alignItems: 'center', gap: 6 }}>
                    {isGoldTheme && <GoldBevel radius={14} intensity="quiet"/>}
                    <View style={{
                            position: 'relative',
                            width: homeQuickIconPlateSize,
                            height: homeQuickIconPlateSize,
                            borderRadius: homeQuickIconRadius,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: tileIconBg,
                        }}>
                      {item.kind === 'tasks' ? (<LightSketchMenuImage source={item.img} width={homeQuickIconImageSize} height={homeQuickIconImageSize} lighten={themeMode === 'minimalLight'} contentFit="contain" cachePolicy="memory-disk"/>) : item.kind === 'league' ? (<LightSketchMenuImage source={themedClubIcon} width={homeQuickIconImageSize} height={homeQuickIconImageSize} lighten={themeMode === 'minimalLight'} contentFit="contain" cachePolicy="memory-disk"/>) : (<LightSketchMenuImage source={item.img} width={homeQuickIconImageSize} height={homeQuickIconImageSize} lighten={themeMode === 'minimalLight'} contentFit="contain" cachePolicy="memory-disk"/>)}
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
                    </View>) : (<LinearGradient colors={isGoldTheme ? goldRaisedTile : t.cardGradient} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: isGoldTheme ? 14 : 18, paddingHorizontal: 10, paddingVertical: 14, alignItems: 'center', gap: 5 }}>
                      {isGoldTheme && <GoldBevel radius={14} intensity="normal"/>}
                      <View style={{ position: 'relative', height: homeQuickIconLegacySize, justifyContent: 'center', alignItems: 'center' }}>
                        {item.kind === 'tasks' ? (<LightSketchMenuImage source={item.img} width={homeQuickIconLegacySize} height={homeQuickIconLegacySize} lighten={themeMode === 'minimalLight'} contentFit="contain" cachePolicy="memory-disk"/>) : item.kind === 'league' ? (<LightSketchMenuImage source={themedClubIcon} width={homeQuickIconLegacySize} height={homeQuickIconLegacySize} lighten={themeMode === 'minimalLight'} contentFit="contain" cachePolicy="memory-disk"/>) : (<LightSketchMenuImage source={item.img} width={homeQuickIconLegacySize} height={homeQuickIconLegacySize} lighten={themeMode === 'minimalLight'} contentFit="contain" cachePolicy="memory-disk"/>)}
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
                    ru: 'Бонус лиги',
                    uk: 'Бонус ліги',
                    es: 'Bono de liga',
                    'pt-BR': "Bônus de liga",
                    vi: "Thưởng giải đấu",
                    id: "Bonus liga",
                    tr: "Lig bonusu",
                    pl: "Bonus ligi",
                })}>
              <LinearGradient colors={leagueBonusPalette.card} locations={leagueBonusPalette.cardLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: isGoldTheme ? 14 : 18, borderWidth: isGoldTheme ? 1 : 0.5, borderColor: leagueBonusPalette.border, padding: 14, overflow: 'hidden', ...({}) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: leagueBonusPalette.iconBg, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: leagueBonusPalette.iconBorder }}>
                      <Ionicons name="gift-outline" size={19} color={homeLeagueChestAccent}/>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }} numberOfLines={1}>
                        {triLang(lang, {
                    ru: 'Бонус лиги',
                    uk: 'Бонус ліги',
                    es: 'Bono de liga',
                    'pt-BR': "Bônus de liga",
                    vi: "Thưởng giải đấu",
                    id: "Bonus liga",
                    tr: "Lig bonusu",
                    pl: "Bonus ligi",
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

          </Animated.View>

          {/* ── ФРАЗА ДНЯ + ПОДВАЛ ── */}
          <Animated.View style={sectionStyle(5)}>
          <DailyPhraseCard />

          {/* Подвал */}
          <View style={{ alignItems: 'center', paddingVertical: 24, marginTop: 12, borderTopWidth: 0.5, borderTopColor: t.border }}>
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
    return (<View testID="screen-home" style={{ flex: 1 }}>
      <ScreenGradient>
      <View style={{ flex: 1 }}>
      {renderNewHome()}

      </View>

      {/* Energy Tooltip — Modal чтобы не обрезался */}
      <Modal visible={energyTooltip.visible} transparent animationType="none" onRequestClose={() => setEnergyTooltip((p) => ({ ...p, visible: false }))}>
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
