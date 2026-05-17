import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated, Easing, ScrollView, } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useEnergy } from '../components/EnergyContext';
import ScreenGradient from '../components/ScreenGradient';
import { SessionSize } from './types/arena';
import { ensureArenaAuthUid } from './user_id_policy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useArenaRank } from '../hooks/use-arena-rank';
import { ARENA_MATCHMAKING_SEARCH_MS, useMatchmakingContext } from '../contexts/MatchmakingContext';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import ArenaLimitModal, { ArenaLimitMode } from '../components/ArenaLimitModal';
import NoEnergyModal from '../components/NoEnergyModal';
import { ARENA_DAILY_MAX, ARENA_MATCHES_SHARD_REFILL_COST, ARENA_MATCHES_SHARD_REFILL_SLOTS, getDailyArenaCount, getDailyArenaMaxToday, } from './arena_daily_limit';
import { canStartArenaMatch, chargeArenaEntry, reserveArenaGameEntry } from './arena_access_gate';
import { emitAppEvent, onAppEvent } from './events';
import { logEvent } from './firebase';
import { useTabNav } from './TabContext';
import { useScreen } from '../hooks/use-screen';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { arenaToasts } from '../constants/arena_i18n';
import { ARENA_LOBBY_ACCEPT_MS, ARENA_PLAY_AGAIN_BOT_MAX_MS, ARENA_PLAY_AGAIN_BOT_MIN_MS, CLOUD_SYNC_ENABLED, ENABLE_ARENA_RANKED_WAGER, IS_EXPO_GO, } from './config';
import { useEffectivePlatformOS } from './platform_ui_preview';
import type { ArenaSession, LobbyChoice } from './types/arena';
import { setSessionLobbyChoice, subscribeMatchmakingSearchingTotal, subscribeSession, subscribeSessionPlayers, } from './services/arena_db';
import { ARENA_RANKED_WAGER_STAKES, clearPendingArenaRankedWager, getPendingArenaRankedWager, setPendingArenaRankedWager, winPayoutForStake, type ArenaRankedPendingWager, type ArenaRankedWagerStake, } from './arena_match_wager';
import { getShardsBalance } from './shards_system';
import { oskolokImageForPackShards } from './oskolok';
import { subscribeToFriends, type FriendEntry } from './firestore_friend_requests';
import { sendArenaInvite, subscribeArenaInviteStatus } from './services/arena_invites';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import ReportErrorButton from '../components/ReportErrorButton';
import AvatarView from '../components/AvatarView';
import GoldBevel from '../components/GoldBevel';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';
import { subscribeTodayArenaHillThrone, type ArenaHillThrone } from './services/arena_hill';
import { subscribeArenaFeatureFlags, type ArenaFeatureFlags, } from './services/arena_feature_flags';
/** Підказка idle «скільки шукають у мережі» (день 1–7, ніч 1–2): спільний кеш, оновлення ~1 хв. */
const IDLE_QUEUE_HINT_TTL_MS = 60 * 1000;
const USE_ELITE_ARENA_LOBBY = true;
const ARENA_THEME_BACKDROPS = {
    dark: require('../assets/images/arena/knowledge-arena-dark.webp'),
    neon: require('../assets/images/arena/knowledge-arena-neon.webp'),
    gold: require('../assets/images/arena/knowledge-arena-gold.webp'),
    coral: require('../assets/images/arena/knowledge-arena-coral.webp'),
    minimalLight: require('../assets/images/arena/knowledge-arena-minimal-light.webp'),
    minimalDark: require('../assets/images/arena/knowledge-arena-minimal-dark.webp'),
} as const;
type IdleQueueHintCache = {
    value: number;
    at: number;
    night: boolean;
};
let idleQueueHintCache: IdleQueueHintCache | null = null;
function alphaColor(color: string, alpha: number, fallback = '255,255,255'): string {
    if (/^#[0-9a-f]{6}$/i.test(color)) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
    return `rgba(${fallback},${alpha})`;
}
/** 20:00–08:00 за локальним часом пристрою — показуємо не більше 2 «у пошуку». */
function isNightArenaIdleQueueHint(): boolean {
    const h = new Date().getHours();
    return h >= 20 || h < 8;
}
/** Склонение для «+N осколк…» в подсказке ставки (RU). */
function ruWinShardsPhrase(count: number): string {
    const n = Math.floor(Math.abs(count));
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11)
        return `${n} осколок`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
        return `${n} осколка`;
    return `${n} осколков`;
}
function getOrRefreshIdleQueueHintCount(): number {
    const now = Date.now();
    const night = isNightArenaIdleQueueHint();
    const staleByTime = !idleQueueHintCache || now - idleQueueHintCache.at >= IDLE_QUEUE_HINT_TTL_MS;
    const staleByDaySegment = !!idleQueueHintCache && idleQueueHintCache.night !== night;
    if (!idleQueueHintCache || staleByTime || staleByDaySegment) {
        idleQueueHintCache = {
            value: night ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 7) + 1,
            at: now,
            night,
        };
    }
    return idleQueueHintCache.value;
}
function formatElapsed(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
}
/** Обратный отсчёт до конца окна поиска (10 мин). */
function formatRemainSearch(ms: number): string {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
}
type LobbyPhase = 'idle' | 'searching' | 'match_found';
function genRoomId() {
    // При Math.random() === 0 toString(36) = "0", substring(2,9) = "" — тогда !friendRoomId
    // вечно «Создаём комнату...». Гарантируем непустой id.
    let s = '';
    while (s.length < 5) {
        s = Math.random().toString(36).replace(/^0\./, '').replace(/\./g, '');
    }
    return s.substring(0, 12).toUpperCase();
}
function isBotSession(sid: string | null | undefined): boolean {
    return !!sid && String(sid).startsWith('bot_');
}
async function createRoom(hostId: string, hostName: string, roomId: string) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const db = require('@react-native-firebase/firestore').default();
    await db.collection('arena_rooms').doc(roomId).set({
        hostId, hostName, roomId,
        status: 'waiting',
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000,
    });
}
// ── Главный экран ─────────────────────────────────────────────────────────────
export default function DuelLobbyScreen({ isTab = false }: {
    isTab?: boolean;
} = {}) {
    const { width: windowW, contentMaxW } = useScreen();
    const router = useRouter();
    const { goHome, activeIdx } = useTabNav();
    const { autoSearch, playAgainTs } = useLocalSearchParams<{
        autoSearch?: string;
        playAgainTs?: string;
    }>();
    const { theme: t, f, themeMode } = useTheme();
    const screenTitleColor = t.textPrimary;
    const screenMuted = t.textMuted;
    const { lang } = useLang();
    const effectiveOs = useEffectivePlatformOS();
    const defaultPlayerName = useMemo(() => triLang(lang, {
        ru: 'Игрок',
        uk: 'Гравець',
        es: 'Jugador',
        'pt-BR': "Jogador",
        vi: "Ng??i ch?i",
        id: "Pemain",
        tr: "Oyuncu",
        pl: "Gracz",
    }), [lang]);
    const { spendOne, isUnlimited, energy, bonusEnergy } = useEnergy();
    const size: SessionSize = 2;
    const [userId, setUserId] = useState<string>('');
    const [phase, setPhase] = useState<LobbyPhase>('idle');
    const myRank = useArenaRank();
    const { status, sessionId, elapsedMs, searchStartedAt, startSearching, cancelSearching, stopSearchTimer, updateQueueWithPushToken, setLobbyActive, markMatchHandled, clearFoundMatch, resumeSearchAfterLobbyAbort, forgetSearchResumeSnapshot, } = useMatchmakingContext();
    const [arenaLimitModal, setArenaLimitModal] = useState<ArenaLimitMode | null>(null);
    const [noEnergyModal, setNoEnergyModal] = useState(false);
    const [dailyCount, setDailyCount] = useState(0);
    const [dailyMax, setDailyMax] = useState(ARENA_DAILY_MAX);
    /** non-null = открыт inline-блок вызова другу. */
    const [friendRoomId, setFriendRoomId] = useState<string | null>(null);
    const [friendRoomReady, setFriendRoomReady] = useState(false);
    /** Скільки в пошуку зараз (агрегат app_meta, оновлює Cloud Function; не скануємо matchmaking_queue). */
    const [rawSearchingTotal, setRawSearchingTotal] = useState(0);
    /** Підказка «скільки шукають матч» у idle: день 1–7, ніч 20:00–08:00 — 1–2; не частіше ніж раз на хвилину. */
    const [idleQueueHintDisplayCount, setIdleQueueHintDisplayCount] = useState(getOrRefreshIdleQueueHintCount);
    /** Ставка осколками на следующий рейтинг-матч (только «Найти матч» / бот из очереди). */
    const [rankedWagerPending, setRankedWagerPending] = useState<ArenaRankedPendingWager | null>(null);
    /** Пока false — не показываем строку «при выигрыше +…» до чтения AsyncStorage. */
    const [rankedWagerUiReady, setRankedWagerUiReady] = useState(true);
    const [shardsBalanceUi, setShardsBalanceUi] = useState<number | null>(null);
    const [arenaFriends, setArenaFriends] = useState<FriendEntry[]>([]);
    const [arenaFriendProfiles, setArenaFriendProfiles] = useState<Record<string, {
        name: string;
        totalXp: number;
        avatar?: string;
        aura?: string;
    }>>({});
    const [arenaInviteSendingUid, setArenaInviteSendingUid] = useState<string | null>(null);
    /** Выбранный друг перед отправкой вызова (кнопка «Бросить вызов»). */
    const [arenaFriendPickUid, setArenaFriendPickUid] = useState<string | null>(null);
    const [hillThrone, setHillThrone] = useState<ArenaHillThrone | null>(null);
    const [arenaFeatureFlags, setArenaFeatureFlags] = useState<ArenaFeatureFlags>({ rankedWagerEnabled: false });
    const arenaRankedWagerEnabled = ENABLE_ARENA_RANKED_WAGER && arenaFeatureFlags.rankedWagerEnabled === true;
    const [lobbyAcceptDeadlineAt, setLobbyAcceptDeadlineAt] = useState<number | null>(null);
    const lobbyAcceptBarAnim = useRef(new Animated.Value(1)).current;
    const lobbyAcceptBarAnimRunRef = useRef<Animated.CompositeAnimation | null>(null);
    const eliteCtaPulse = useRef(new Animated.Value(0)).current;
    const eliteRadarPulse = useRef(new Animated.Value(0)).current;
    const eliteRadarSweep = useRef(new Animated.Value(0)).current;
    const arenaHeroEntrance = useRef(new Animated.Value(0)).current;
    const friendUnsubRef = useRef<(() => void) | null>(null);
    /** id последнего отправленного инвайта — для подписки на статус (declined/accepted). */
    const sentInviteUnsubRef = useRef<(() => void) | null>(null);
    const friendMatchNavRef = useRef(false);
    const pendingMatchChargeRef = useRef(false);
    const chargeInFlightRef = useRef(false);
    const findMatchInFlightRef = useRef(false);
    /** Идемпотентность тоста/cancel при abort одной и той же ranked-сессии из лобби */
    const matchLobbyAbortHandledRef = useRef<string | null>(null);
    const refreshRankedWagerUi = useCallback(async () => {
        if (!arenaRankedWagerEnabled) {
            setRankedWagerPending(null);
            setShardsBalanceUi(null);
            setRankedWagerUiReady(true);
            return;
        }
        try {
            const [w, bal] = await Promise.all([getPendingArenaRankedWager(), getShardsBalance()]);
            setRankedWagerPending(w);
            setShardsBalanceUi(bal);
        }
        catch {
            setShardsBalanceUi(null);
        }
        finally {
            setRankedWagerUiReady(true);
        }
    }, [arenaRankedWagerEnabled]);
    const handleFindMatch = useCallback(async (uidOverride?: string, opts?: {
        playAgain?: boolean;
    }) => {
        if (findMatchInFlightRef.current)
            return;
        if (!myRank.isHydrated)
            return;
        findMatchInFlightRef.current = true;
        try {
            const access = await canStartArenaMatch({
                isUnlimited,
                availableEnergy: energy + bonusEnergy,
                countDaily: true,
            });
            if (!access.ok && access.reason === 'daily_limit') {
                setArenaLimitModal('matchmaking');
                return;
            }
            if (!access.ok && access.reason === 'no_energy') {
                setNoEnergyModal(true);
                return;
            }
            let uid = (uidOverride || userId).trim();
            if (!uid) {
                uid = (await ensureArenaAuthUid()) ?? '';
            }
            if (!uid) {
                emitAppEvent('action_toast', { type: 'error', ...arenaToasts.queueJoinFailAuth });
                return;
            }
            pendingMatchChargeRef.current = !isUnlimited;
            logEvent('arena_search_started', {
                rank_idx: myRank.rankIndex,
                is_unlimited: isUnlimited ? 1 : 0,
                play_again_flow: opts?.playAgain ? 1 : 0,
            });
            setPhase('searching');
            const myName = (await AsyncStorage.getItem('user_name')) ?? defaultPlayerName;
            // Счётчик поиска считается в MatchmakingContext — startSearching() должен вызваться сразу;
            // expo-notifications (разрешения + getExpoPushTokenAsync) может отвечать долго или зависать, из‑за этого
            // раньше phase был «searching», а таймер не стартовал (0:00). Токен — фоновым дозапросом.
            const span = ARENA_PLAY_AGAIN_BOT_MAX_MS - ARENA_PLAY_AGAIN_BOT_MIN_MS;
            const playAgainMs = ARENA_PLAY_AGAIN_BOT_MIN_MS + Math.floor(Math.random() * (span + 1));
            const searchOpts = opts?.playAgain
                ? { humanSearchWindowMs: playAgainMs }
                : undefined;
            const joined = await startSearching(uid, myRank.tier, myRank.level, size, undefined, myName, searchOpts);
            if (!joined) {
                pendingMatchChargeRef.current = false;
                setPhase('idle');
            }
            void (async () => {
                try {
                    const { getExpoPushTokenAsync, getPermissionsAsync } = await import('expo-notifications');
                    const { status } = await getPermissionsAsync();
                    if (status !== 'granted')
                        return;
                    const easProjectId = (Constants.expoConfig?.extra as {
                        eas?: {
                            projectId?: string;
                        };
                    } | undefined)?.eas?.projectId;
                    const tokenData = await getExpoPushTokenAsync(easProjectId ? { projectId: easProjectId } : undefined);
                    if (tokenData.data)
                        await updateQueueWithPushToken(tokenData.data);
                }
                catch {
                    emitAppEvent('action_toast', {
                        type: 'info',
                        messageRu: 'Уведомления недоступны. Поиск матча работает без них.',
                        messageUk: 'Сповіщення недоступні. Пошук матчу працює без них.',
                        messageEs: 'Las notificaciones no están disponibles. Puedes buscar partida sin ellas.',
                    });
                }
            })();
        }
        finally {
            findMatchInFlightRef.current = false;
        }
    }, [bonusEnergy, defaultPlayerName, energy, isUnlimited, myRank.isHydrated, myRank.level, myRank.rankIndex, myRank.tier, size, startSearching, updateQueueWithPushToken, userId]);
    useEffect(() => subscribeTodayArenaHillThrone(setHillThrone), []);
    useEffect(() => subscribeArenaFeatureFlags(setArenaFeatureFlags), []);
    useEffect(() => {
        if (!arenaRankedWagerEnabled) {
            void clearPendingArenaRankedWager();
            setRankedWagerPending(null);
            setShardsBalanceUi(null);
            setRankedWagerUiReady(true);
        }
        else {
            void refreshRankedWagerUi();
        }
    }, [arenaRankedWagerEnabled, refreshRankedWagerUi]);
    /** Стековый /arena_lobby — без таббара; редиректим после маунта, чтобы не падать до RootLayout. */
    useEffect(() => {
        if (isTab)
            return;
        const timer = setTimeout(() => {
            if (autoSearch === '1') {
                router.replace({
                    pathname: '/(tabs)/arena' as any,
                    params: { autoSearch: '1', ...(playAgainTs ? { playAgainTs } : {}) },
                });
            }
            else {
                router.replace('/(tabs)/arena' as any);
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [isTab, autoSearch, playAgainTs, router]);
    useEffect(() => {
        ensureArenaAuthUid().then((uid) => {
            if (uid) {
                setUserId(uid);
                if (autoSearch === '1')
                    void handleFindMatch(uid, { playAgain: true });
            }
        });
        (async () => {
            setDailyCount(await getDailyArenaCount());
            setDailyMax(await getDailyArenaMaxToday());
        })();
    }, [autoSearch, playAgainTs, handleFindMatch]);
    useEffect(() => {
        void refreshRankedWagerUi();
    }, [refreshRankedWagerUi]);
    useFocusEffect(useCallback(() => {
        setIdleQueueHintDisplayCount(getOrRefreshIdleQueueHintCount());
        void refreshRankedWagerUi();
        (async () => {
            setDailyCount(await getDailyArenaCount());
            setDailyMax(await getDailyArenaMaxToday());
        })();
    }, [refreshRankedWagerUi]));
    useEffect(() => {
        if (!arenaRankedWagerEnabled)
            return undefined;
        const sub = onAppEvent('shards_balance_updated', () => {
            void refreshRankedWagerUi();
        });
        return () => sub.remove();
    }, [arenaRankedWagerEnabled, refreshRankedWagerUi]);
    useEffect(() => {
        if (phase !== 'idle')
            return;
        const id = setInterval(() => {
            setIdleQueueHintDisplayCount(getOrRefreshIdleQueueHintCount());
        }, IDLE_QUEUE_HINT_TTL_MS);
        return () => clearInterval(id);
    }, [phase]);
    useEffect(() => {
        const inQueue = phase === 'searching' || phase === 'match_found' || status === 'searching' || status === 'found';
        if (!USE_ELITE_ARENA_LOBBY || inQueue) {
            eliteCtaPulse.setValue(0);
            return;
        }
        const ctaLoop = Animated.loop(Animated.sequence([
            Animated.timing(eliteCtaPulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
            Animated.timing(eliteCtaPulse, { toValue: 0, duration: 1600, useNativeDriver: true }),
        ]));
        ctaLoop.start();
        return () => ctaLoop.stop();
    }, [eliteCtaPulse, phase, status]);
    useEffect(() => {
        const visible = !isTab || activeIdx === 2;
        if (!visible || phase !== 'idle') {
            return;
        }
        arenaHeroEntrance.stopAnimation();
        arenaHeroEntrance.setValue(0);
        const intro = Animated.timing(arenaHeroEntrance, {
            toValue: 1,
            duration: 540,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        });
        intro.start();
        return () => intro.stop();
    }, [activeIdx, arenaHeroEntrance, isTab, phase]);
    useEffect(() => {
        const queueVisible = phase === 'searching' || phase === 'match_found' || status === 'searching' || status === 'found';
        if (!USE_ELITE_ARENA_LOBBY || !queueVisible) {
            eliteRadarPulse.setValue(0);
            eliteRadarSweep.setValue(0);
            return;
        }
        const radarLoop = Animated.loop(Animated.sequence([
            Animated.timing(eliteRadarPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
            Animated.timing(eliteRadarPulse, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]));
        const sweepLoop = Animated.loop(Animated.timing(eliteRadarSweep, {
            toValue: 1,
            duration: 2400,
            useNativeDriver: true,
        }));
        radarLoop.start();
        sweepLoop.start();
        return () => {
            radarLoop.stop();
            sweepLoop.stop();
        };
    }, [eliteRadarPulse, eliteRadarSweep, phase, status]);
    // Лобби в табе смонтировано постоянно (TabSlider). Тост «матч найден» душился на всіх екранах,
    // бо isLobbyActive лишався true після перходу на інші вкладки — тримаємо active лише коли видно таб «Арена» (2).
    useEffect(() => {
        if (!isTab) {
            setLobbyActive(true);
            return () => setLobbyActive(false);
        }
        setLobbyActive(activeIdx === 2);
        return () => setLobbyActive(false);
    }, [isTab, activeIdx, setLobbyActive]);
    useEffect(() => {
        matchLobbyAbortHandledRef.current = null;
    }, [sessionId]);
    useEffect(() => () => {
        friendUnsubRef.current?.();
        friendUnsubRef.current = null;
        sentInviteUnsubRef.current?.();
        sentInviteUnsubRef.current = null;
    }, []);
    /** Глобальный статус поиска (в т.ч. после перезапуска) → локальная фаза лобби. */
    useEffect(() => {
        if (status === 'searching')
            setPhase('searching');
        // Ошибка join / сеть: контекст уже idle, а phase залипал в «searching» (без sessionId).
        if (status === 'idle' && phase === 'searching' && !sessionId) {
            if (arenaRankedWagerEnabled) {
                void (async () => {
                    await clearPendingArenaRankedWager();
                    await refreshRankedWagerUi();
                })();
            }
            setPhase('idle');
        }
    }, [status, phase, sessionId, arenaRankedWagerEnabled, refreshRankedWagerUi]);
    // Тикер UI: `Date.now()-t0` не даёт ререндер сам; пока ищем — крутим, даже если searchStartedAt ещё 0
    const [, setSearchUiTick] = useState(0);
    useEffect(() => {
        if (phase !== 'searching' && status !== 'searching')
            return;
        // 1000ms достаточно — таймер показывает целые секунды, 200ms = лишние 4 ререндера/сек
        const id = setInterval(() => { setSearchUiTick((n) => n + 1); }, 1000);
        return () => { clearInterval(id); };
    }, [phase, status]);
    const displayElapsed = searchStartedAt > 0 ? (Date.now() - searchStartedAt) : elapsedMs;
    const remainSearchMs = Math.max(0, ARENA_MATCHMAKING_SEARCH_MS - displayElapsed);
    // refs to avoid stale closures in animation callbacks
    const sessionIdRef = useRef<string | null>(null);
    const userIdRef = useRef<string>('');
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
    useEffect(() => { userIdRef.current = userId; }, [userId]);
    // Матч найден — остаёмся в лобби, пока игрок не нажмёт «Принять» (см. блок match found + handlers ниже).
    useEffect(() => {
        if (status === 'found' && sessionId)
            setPhase('match_found');
        if (status === 'idle' && phase === 'match_found')
            setPhase('idle');
    }, [status, sessionId, phase]);
    /**
     * Бот-матч без документа arena_sessions: те же 15 с на «Принять», полоска и авто-выход из очереди.
     */
    useEffect(() => {
        if (status !== 'found' || !sessionId || !isBotSession(sessionId))
            return;
        const sid = sessionId;
        setLobbyAcceptDeadlineAt(Date.now() + ARENA_LOBBY_ACCEPT_MS);
        const t = setTimeout(() => {
            if (sessionIdRef.current !== sid)
                return;
            pendingMatchChargeRef.current = false;
            setLobbyAcceptDeadlineAt(null);
            void (async () => {
                await cancelSearching();
                setPhase('idle');
                logEvent('arena_match_lobby_abort', { reason: 'accept_timeout' });
                await resumeSearchAfterLobbyAbort();
            })();
        }, ARENA_LOBBY_ACCEPT_MS + 80);
        return () => {
            clearTimeout(t);
            if (sessionIdRef.current === sid)
                setLobbyAcceptDeadlineAt(null);
        };
    }, [status, sessionId, cancelSearching, resumeSearchAfterLobbyAbort]);
    /**
     * В лобби «соперник найден» раньше не слушали arena_sessions: при accept_timeout / decline
     * на сервере клиент оставался в status=found. Подписка + авто-decline по дедлайну (как в use-arena-session).
     */
    useEffect(() => {
        if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED)
            return;
        const sid = sessionId;
        const uid = userId;
        if (status !== 'found' || !sid || isBotSession(sid) || !uid)
            return;
        let declineTimer: ReturnType<typeof setTimeout> | null = null;
        const sessionRef: {
            current: ArenaSession | null;
        } = { current: null };
        const choiceRef: {
            current: LobbyChoice | undefined;
        } = { current: 'none' };
        const clearDeclineTimer = () => {
            if (declineTimer) {
                clearTimeout(declineTimer);
                declineTimer = null;
            }
        };
        const scheduleLobbyAcceptDeadline = () => {
            clearDeclineTimer();
            const s = sessionRef.current;
            if (!s || s.state !== 'acceptance')
                return;
            const ch = choiceRef.current ?? 'none';
            if (ch === 'accept' || ch === 'decline')
                return;
            const deadline = s.acceptDeadlineAt;
            if (typeof deadline !== 'number')
                return;
            const delay = Math.max(0, deadline - Date.now()) + 80;
            declineTimer = setTimeout(() => {
                declineTimer = null;
                setSessionLobbyChoice(sid, uid, 'decline').catch(() => { });
            }, delay);
        };
        const finishAbortedMatch = (reason: ArenaSession['abortReason']) => {
            if (matchLobbyAbortHandledRef.current === sid) {
                matchLobbyAbortHandledRef.current = null;
                return;
            }
            if (sessionIdRef.current !== sid)
                return;
            matchLobbyAbortHandledRef.current = sid;
            clearDeclineTimer();
            void (async () => {
                pendingMatchChargeRef.current = false;
                await cancelSearching();
                setPhase('idle');
                setLobbyAcceptDeadlineAt(null);
                if (reason !== 'accept_timeout' && reason !== 'stale_cleanup') {
                    emitAppEvent('action_toast', {
                        type: 'info',
                        messageRu: 'Матч отменён (соперник отказался или вышел).',
                        messageUk: 'Матч скасовано (суперник відмовився або вийшов).',
                        messageEs: 'Partida cancelada: tu rival rechazó o salió.',
                    });
                }
                logEvent('arena_match_lobby_abort', { reason: reason ?? 'unknown' });
                await resumeSearchAfterLobbyAbort();
            })();
        };
        const unSubPlayers = subscribeSessionPlayers(sid, (players) => {
            const me = players.find((p) => p.playerId === uid);
            choiceRef.current = me?.lobbyChoice ?? 'none';
            scheduleLobbyAcceptDeadline();
        });
        const unSubSession = subscribeSession(sid, (session) => {
            sessionRef.current = session;
            if (session.state === 'acceptance' && typeof session.acceptDeadlineAt === 'number') {
                setLobbyAcceptDeadlineAt(session.acceptDeadlineAt);
            }
            else {
                setLobbyAcceptDeadlineAt(null);
            }
            if (session.state === 'aborted') {
                finishAbortedMatch(session.abortReason);
                return;
            }
            scheduleLobbyAcceptDeadline();
        });
        return () => {
            clearDeclineTimer();
            setLobbyAcceptDeadlineAt(null);
            unSubPlayers();
            unSubSession();
        };
    }, [status, sessionId, userId, cancelSearching, resumeSearchAfterLobbyAbort]);
    const goToGameAfterAccept = useCallback(() => {
        markMatchHandled();
        hapticSuccess();
        stopSearchTimer();
        clearFoundMatch();
        setPhase('idle');
        const sid = sessionIdRef.current ?? sessionId ?? '';
        const uid = userIdRef.current || userId;
        void (async () => {
            await reserveArenaGameEntry(sid, 'ranked');
            router.replace({
                pathname: '/arena_game' as any,
                params: { sessionId: sid, userId: uid, fromLobby: '1' },
            });
        })();
    }, [markMatchHandled, stopSearchTimer, clearFoundMatch, router, sessionId, userId]);
    const handleMatchFoundDecline = useCallback(async () => {
        hapticTap();
        if (sessionId)
            matchLobbyAbortHandledRef.current = sessionId;
        pendingMatchChargeRef.current = false;
        setLobbyAcceptDeadlineAt(null);
        if (sessionId && !isBotSession(sessionId) && CLOUD_SYNC_ENABLED && userId) {
            await setSessionLobbyChoice(sessionId, userId, 'decline').catch(() => { });
        }
        await cancelSearching();
        setPhase('idle');
        logEvent('arena_match_declined', {});
        void resumeSearchAfterLobbyAbort();
    }, [sessionId, userId, cancelSearching, resumeSearchAfterLobbyAbort]);
    const handleMatchFoundAccept = useCallback(async () => {
        if (!sessionId || !userId)
            return;
        hapticSuccess();
        const doNavigate = async () => {
            if (sessionId && !isBotSession(sessionId) && CLOUD_SYNC_ENABLED) {
                try {
                    await setSessionLobbyChoice(sessionId, userId, 'accept');
                }
                catch {
                    emitAppEvent('action_toast', {
                        type: 'error',
                        messageRu: 'Не удалось подтвердить матч. Проверь сеть и попробуй снова.',
                        messageUk: 'Не вдалося підтвердити матч. Перевір мережу і спробуй знову.',
                        messageEs: 'No se ha podido confirmar la partida. Revisa la conexión e inténtalo de nuevo.',
                    });
                    return;
                }
            }
            goToGameAfterAccept();
        };
        if (isUnlimited || !pendingMatchChargeRef.current) {
            await doNavigate();
            return;
        }
        if (chargeInFlightRef.current)
            return;
        chargeInFlightRef.current = true;
        try {
            const charge = await chargeArenaEntry({
                isUnlimited,
                spendOne,
                countDaily: true,
                mode: 'ranked',
            });
            if (!charge.ok) {
                pendingMatchChargeRef.current = false;
                await cancelSearching();
                setPhase('idle');
                setNoEnergyModal(true);
                return;
            }
            if (charge.dailyCount !== undefined)
                setDailyCount(charge.dailyCount);
            pendingMatchChargeRef.current = false;
            await doNavigate();
        }
        finally {
            chargeInFlightRef.current = false;
        }
    }, [sessionId, userId, isUnlimited, goToGameAfterAccept, spendOne, cancelSearching]);
    const handlePlayWithFriend = async () => {
        hapticTap();
        const access = await canStartArenaMatch({
            isUnlimited,
            availableEnergy: energy + bonusEnergy,
            countDaily: false,
        });
        if (!access.ok) {
            setNoEnergyModal(true);
            return;
        }
        const id = genRoomId();
        friendMatchNavRef.current = false;
        friendUnsubRef.current?.();
        sentInviteUnsubRef.current?.();
        sentInviteUnsubRef.current = null;
        setFriendRoomId(id);
        setFriendRoomReady(false);
        setArenaFriendPickUid(null);
        const runFirestore = async () => {
            try {
                const uid = await ensureArenaAuthUid();
                const name = (await AsyncStorage.getItem('user_name')) ?? defaultPlayerName;
                if (!uid) {
                    setFriendRoomId(null);
                    setFriendRoomReady(false);
                    setArenaFriendPickUid(null);
                    friendMatchNavRef.current = false;
                    emitAppEvent('action_toast', {
                        type: 'error',
                        messageRu: 'Облако недоступно (синхронизация выключена). Друг не сможет войти в комнату.',
                        messageUk: 'Хмара недоступна (синхронізація вимкнена). Друг не зможе зайти в кімнату.',
                        messageEs: 'La nube no está disponible (sincronización desactivada). Tu amigo no podrá entrar en la sala.',
                    });
                    return;
                }
                await createRoom(uid, name, id);
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const db = require('@react-native-firebase/firestore').default();
                friendUnsubRef.current?.();
                friendUnsubRef.current = db.collection('arena_rooms').doc(id).onSnapshot((snap: any) => {
                    if (!snap || !snap.exists)
                        return;
                    const data = snap.data();
                    if (data.status === 'matched' && data.guestId) {
                        if (friendMatchNavRef.current)
                            return;
                        friendMatchNavRef.current = true;
                        void (async () => {
                            const charge = await chargeArenaEntry({
                                isUnlimited,
                                spendOne,
                                countDaily: false,
                                mode: 'friend',
                                extraLogParams: { role: 'host' },
                            });
                            if (!charge.ok) {
                                friendMatchNavRef.current = false;
                                emitAppEvent('action_toast', {
                                    type: 'error',
                                    messageRu: 'Недостаточно энергии для старта матча.',
                                    messageUk: 'Недостатньо енергії для старту матчу.',
                                    messageEs: 'No tienes suficiente energía para empezar la partida.',
                                });
                                return;
                            }
                            emitAppEvent('action_toast', {
                                type: 'success',
                                messageRu: 'Друг подключился. Начинаем матч!',
                                messageUk: 'Друг підключився. Починаємо матч!',
                                messageEs: 'Tu amigo se ha unido. ¡Empezamos el duelo!',
                            });
                            friendUnsubRef.current?.();
                            friendUnsubRef.current = null;
                            setFriendRoomId(null);
                            setFriendRoomReady(false);
                            await reserveArenaGameEntry(id, 'friend_host');
                            router.replace({ pathname: '/arena_game' as any, params: { sessionId: id, userId: uid } });
                        })();
                    }
                });
                setFriendRoomReady(true);
            }
            catch {
                setFriendRoomId(null);
                setFriendRoomReady(false);
                setArenaFriendPickUid(null);
                friendMatchNavRef.current = false;
                emitAppEvent('action_toast', {
                    type: 'error',
                    messageRu: 'Не удалось создать комнату в облаке. Проверьте сеть — если друг не заходит, пригласите ещё раз.',
                    messageUk: 'Не вдалося створити кімнату в хмарі. Перевірте мережу — якщо друг не заходить, запросіть ще раз.',
                    messageEs: 'No se pudo crear la sala en la nube. Revisa la conexión: si tu amigo no puede entrar, vuelve a invitarlo.',
                });
            }
        };
        void runFirestore();
    };
    const handleSendInAppInviteToFriend = async (friendStableUid: string) => {
        hapticTap();
        const roomId = friendRoomId;
        if (!roomId || !friendRoomReady)
            return;
        const dn = (await AsyncStorage.getItem('user_name'))?.trim()
            || triLang(lang, {
                ru: 'Игрок',
                uk: 'Гравець',
                es: 'Jugador',
                'pt-BR': "Jogador",
                vi: "Ng??i ch?i",
                id: "Pemain",
                tr: "Oyuncu",
                pl: "Gracz",
            });
        setArenaInviteSendingUid(friendStableUid);
        try {
            const res = await sendArenaInvite({
                toFriendStableUid: friendStableUid,
                roomId,
                fromName: dn,
            });
            if (!res.ok) {
                const msg = res.reason === 'friend_no_session'
                    ? {
                        messageRu: effectiveOs === 'ios'
                            ? 'У друга нет активной сессии. Пусть откроет приложение или выберите его в списке ниже.'
                            : 'У друга нет активной сессии в облаке. Пусть откроет приложение и попробуйте ещё раз.',
                        messageUk: effectiveOs === 'ios'
                            ? 'У друга немає активної сесії. Нехай відкриє застосунок або обери його в списку нижче.'
                            : 'У друга немає активної сесії в хмарі. Нехай відкриє застосунок і спробуйте ще раз.',
                        messageEs: effectiveOs === 'ios'
                            ? 'Tu amigo no tiene sesión activa. Pídele que abra la app o elígelo en la lista de abajo.'
                            : 'Tu amigo no tiene sesión en la nube. Pídele que abra la app e inténtalo otra vez.',
                    }
                    : res.reason === 'not_friend'
                        ? {
                            messageRu: 'Этот пользователь не в списке друзей.',
                            messageUk: 'Цей користувач не у списку друзів.',
                            messageEs: 'Este usuario no está en tu lista de amigos.',
                        }
                        : {
                            messageRu: effectiveOs === 'ios'
                                ? 'Пригласить не получилось. Проверь сеть или выбери друга из списка ниже.'
                                : 'Пригласить не получилось. Проверь сеть и попробуй ещё раз.',
                            messageUk: effectiveOs === 'ios'
                                ? 'Не вдалося запросити. Перевір мережу або обери друга зі списку нижче.'
                                : 'Не вдалося запросити. Перевір мережу і спробуй ще раз.',
                            messageEs: effectiveOs === 'ios'
                                ? 'No se pudo enviar la invitación. Revisa la conexión o elige a un amigo en la lista.'
                                : 'No se pudo enviar la invitación. Revisa la conexión e inténtalo otra vez.',
                        };
                emitAppEvent('action_toast', { type: 'error', ...msg });
                return;
            }
            emitAppEvent('action_toast', {
                type: 'success',
                messageRu: 'Приглашение отправлено.',
                messageUk: 'Запрошення надіслано.',
                messageEs: 'Invitación enviada.',
            });
            setArenaFriendPickUid(null);
            // Subscribe to invite status changes so we can notify sender when declined
            sentInviteUnsubRef.current?.();
            sentInviteUnsubRef.current = subscribeArenaInviteStatus(res.inviteId, (status) => {
                if (status === 'declined') {
                    sentInviteUnsubRef.current?.();
                    sentInviteUnsubRef.current = null;
                    const friendName = arenaFriendProfiles[friendStableUid]?.name;
                    emitAppEvent('action_toast', {
                        type: 'info',
                        messageRu: friendName
                            ? `${friendName} отклонил вызов.`
                            : 'Друг отклонил вызов.',
                        messageUk: friendName
                            ? `${friendName} відхилив виклик.`
                            : 'Друг відхилив виклик.',
                        messageEs: friendName
                            ? `${friendName} rechazó el reto.`
                            : 'Tu amigo rechazó el reto.',
                    });
                }
                else if (status === 'accepted') {
                    sentInviteUnsubRef.current?.();
                    sentInviteUnsubRef.current = null;
                }
            });
        }
        finally {
            setArenaInviteSendingUid(null);
        }
    };
    const handleCancelSearch = async () => {
        hapticTap();
        forgetSearchResumeSnapshot();
        pendingMatchChargeRef.current = false;
        const cancelledMs = searchStartedAt > 0 ? (Date.now() - searchStartedAt) : elapsedMs;
        await cancelSearching();
        if (arenaRankedWagerEnabled) {
            await clearPendingArenaRankedWager();
            await refreshRankedWagerUi();
        }
        logEvent('arena_search_cancelled', { elapsed_ms: cancelledMs });
        setPhase('idle');
    };
    /**
     * Лише `phase === 'searching'` — хто **реально** у пошуку в цьому екрані.
     * Не змішувати з `status === 'searching' && phase === 'idle'`: тоді зритель у лобі «вираховує» себе з
     * глобального лічильника, якщо status залип searching (покаже 0, хоча в мережі шукають).
     */
    const countsAsInQueue = phase === 'searching' || phase === 'match_found';
    const handleRankedWagerSelect = useCallback(async (stake: ArenaRankedWagerStake) => {
        if (!arenaRankedWagerEnabled)
            return;
        hapticTap();
        const cur = await getPendingArenaRankedWager();
        if (cur?.stake === stake) {
            await clearPendingArenaRankedWager();
            setRankedWagerPending(null);
            logEvent('arena_ranked_wager_cleared', { stake });
            return;
        }
        const bal = await getShardsBalance();
        if (bal < stake)
            return;
        await setPendingArenaRankedWager(stake);
        await refreshRankedWagerUi();
        const payout = winPayoutForStake(stake);
        logEvent('arena_ranked_wager_set', { stake, payout });
    }, [arenaRankedWagerEnabled, refreshRankedWagerUi]);
    const showMatchFound = status === 'found' && !!sessionId;
    const showQueuePanel = (status === 'searching' && (phase === 'searching' || phase === 'idle'))
        || (showMatchFound && (phase === 'searching' || phase === 'match_found'));
    /** Ширина ряда кнопок очереди: как у `body` (padding 20+20). На планшете таб обёрнут в `min(width, contentMaxW)` — иначе слот «Отмена» был шире колонки и зрительно «уезжал». */
    const layoutW = Math.max(1, (isTab ? Math.min(windowW, contentMaxW) : windowW) - 40);
    const slotHalf = (layoutW - 10) / 2;
    const rankedWagerDynamicHint = useMemo(() => {
        if (!rankedWagerUiReady || !rankedWagerPending)
            return null;
        const payout = rankedWagerPending.winPayout;
        return triLang(lang, {
            ru: `В случае выигрыша +${ruWinShardsPhrase(payout)}.`,
            uk: `У разі перемоги +${payout} осколків.`,
            es: `Si ganas +${payout} fragmentos.`,
            'pt-BR': `Se vencer, +${payout} fragmentos.`,
            vi: `N?u th?ng, +${payout} m?nh.`,
            id: `Jika menang, +${payout} pecahan.`,
            tr: `Kazan?rsan +${payout} par?a.`,
            pl: `Je?li wygrasz, +${payout} od?amk?w.`,
        });
    }, [lang, rankedWagerPending, rankedWagerUiReady]);
    const rankedWagerCardEl = arenaRankedWagerEnabled && !friendRoomId ? (<View style={[
            styles.rankedWagerCard,
            {
                width: layoutW,
                alignSelf: 'center',
                borderColor: `${t.border}99`,
                backgroundColor: 'rgba(255,255,255,0.07)',
            },
        ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={[styles.rankedWagerTitle, { color: screenTitleColor, fontSize: f.sub }]}>
            {triLang(lang, {
            ru: 'Ставка на матч',
            uk: 'Ставка на матч',
            es: 'Apuesta del encuentro',
            'pt-BR': "Aposta da partida",
            vi: "C??c tr?n ??u",
            id: "Taruhan pertandingan",
            tr: "Ma? bahsi",
            pl: "Stawka meczu",
        })}
          </Text>
          {shardsBalanceUi != null && (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Image source={oskolokImageForPackShards(Math.min(99, shardsBalanceUi))} style={{ width: 18, height: 18 }} resizeMode="contain"/>
              <Text style={{ color: screenMuted, fontSize: f.caption, fontWeight: '700' }}>{shardsBalanceUi}</Text>
            </View>)}
        </View>
        {rankedWagerDynamicHint ? (<Text style={[styles.rankedWagerHint, { color: screenMuted, fontSize: f.caption - 1 }]}>
            {rankedWagerDynamicHint}
          </Text>) : null}
        <View style={styles.rankedWagerChipsRow}>
          {ARENA_RANKED_WAGER_STAKES.map((st) => {
            const selected = rankedWagerPending?.stake === st;
            const balanceKnown = shardsBalanceUi !== null;
            const cannotAfford = balanceKnown && shardsBalanceUi < st;
            const chipDisabled = cannotAfford && !selected;
            return (<TouchableOpacity key={st} activeOpacity={chipDisabled ? 1 : 0.85} disabled={chipDisabled} onPress={() => void handleRankedWagerSelect(st)} style={[
                    styles.rankedWagerChip,
                    chipDisabled
                        ? {
                            borderColor: `${t.border}66`,
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            opacity: 0.45,
                        }
                        : {
                            borderColor: selected ? t.accent : t.border,
                            backgroundColor: selected ? `${t.accent}28` : 'rgba(255,255,255,0.04)',
                        },
                ]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Image source={oskolokImageForPackShards(st)} style={{ width: 20, height: 20, opacity: chipDisabled ? 0.7 : 1 }} resizeMode="contain"/>
                  <Text style={{
                    color: chipDisabled ? screenMuted : screenTitleColor,
                    fontWeight: '800',
                    fontSize: f.body,
                }}>
                    {st}
                  </Text>
                </View>
              </TouchableOpacity>);
        })}
        </View>
      </View>) : null;
    const morph = useRef(new Animated.Value(0)).current;
    const { leftW, rightW, leftOp, spacerW } = useMemo(() => ({
        leftW: morph.interpolate({ inputRange: [0, 1], outputRange: [0, slotHalf] }),
        rightW: morph.interpolate({ inputRange: [0, 1], outputRange: [layoutW, slotHalf] }),
        leftOp: morph.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.9, 1] }),
        spacerW: morph.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }),
    }), [morph, layoutW, slotHalf]);
    useEffect(() => {
        if (!showMatchFound) {
            morph.setValue(0);
            return;
        }
        morph.setValue(0);
        const run = () => {
            Animated.spring(morph, {
                toValue: 1,
                useNativeDriver: false,
                tension: 100,
                friction: 8.2,
                overshootClamping: true,
                restDisplacementThreshold: 0.1,
                restSpeedThreshold: 0.1,
            }).start();
        };
        const t0 = setTimeout(run, 24);
        return () => { clearTimeout(t0); };
    }, [showMatchFound, sessionId, morph]);
    useEffect(() => {
        lobbyAcceptBarAnimRunRef.current?.stop?.();
        lobbyAcceptBarAnimRunRef.current = null;
        if (!showMatchFound || !lobbyAcceptDeadlineAt) {
            lobbyAcceptBarAnim.setValue(1);
            return;
        }
        const msLeft = Math.max(0, lobbyAcceptDeadlineAt - Date.now());
        const startFrac = Math.max(0, Math.min(1, msLeft / ARENA_LOBBY_ACCEPT_MS));
        lobbyAcceptBarAnim.setValue(startFrac);
        if (msLeft <= 0)
            return;
        const anim = Animated.timing(lobbyAcceptBarAnim, {
            toValue: 0,
            duration: msLeft,
            easing: Easing.linear,
            useNativeDriver: true,
        });
        lobbyAcceptBarAnimRunRef.current = anim;
        anim.start(() => {
            lobbyAcceptBarAnimRunRef.current = null;
        });
        return () => {
            anim.stop();
            lobbyAcceptBarAnimRunRef.current = null;
        };
    }, [showMatchFound, lobbyAcceptDeadlineAt, sessionId, lobbyAcceptBarAnim]);
    const queueOthersCount = useMemo(() => {
        const total = Math.max(0, rawSearchingTotal);
        if (countsAsInQueue && userId)
            return Math.max(0, total - 1);
        return total;
    }, [rawSearchingTotal, countsAsInQueue, userId]);
    useEffect(() => {
        if (!userId || IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
            setRawSearchingTotal(0);
            return;
        }
        return subscribeMatchmakingSearchingTotal(setRawSearchingTotal);
    }, [userId]);
    useEffect(() => {
        const unsub = subscribeToFriends(setArenaFriends, () => setArenaFriends([]));
        return () => unsub();
    }, []);
    useEffect(() => {
        if (!friendRoomId) {
            setArenaFriendPickUid(null);
            setFriendRoomReady(false);
        }
    }, [friendRoomId]);
    useEffect(() => {
        if (arenaFriendPickUid && !arenaFriends.some(f => f.uid === arenaFriendPickUid)) {
            setArenaFriendPickUid(null);
        }
    }, [arenaFriends, arenaFriendPickUid]);
    useEffect(() => {
        if (arenaFriends.length === 0)
            return;
        const db = (() => {
            if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED)
                return null;
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            try {
                return require('@react-native-firebase/firestore').default();
            }
            catch {
                return null;
            }
        })();
        if (!db)
            return;
        let cancelled = false;
        void Promise.all(arenaFriends.map(async (f) => {
            try {
                const snap = await db.collection('users').doc(f.uid).get();
                if (!snap.exists)
                    return null;
                const data = snap.data() ?? {};
                const avatarRaw = typeof data.progress?.user_avatar === 'string'
                    ? data.progress.user_avatar.trim()
                    : '';
                const auraRaw = typeof data.progress?.user_avatar_aura === 'string'
                    ? data.progress.user_avatar_aura.trim()
                    : '';
                return {
                    uid: f.uid,
                    name: (data.displayName as string) || (data.name as string) || (data.progress?.displayName as string) || (data.progress?.user_name as string) || 'Игрок',
                    totalXp: parseInt((data.progress?.user_total_xp as string) ?? '0') || 0,
                    avatar: avatarRaw || undefined,
                    aura: auraRaw || undefined,
                };
            }
            catch {
                return null;
            }
        })).then(results => {
            if (cancelled)
                return;
            const map: Record<string, {
                name: string;
                totalXp: number;
                avatar?: string;
                aura?: string;
            }> = {};
            for (const r of results)
                if (r)
                    map[r.uid] = r;
            setArenaFriendProfiles(map);
        });
        return () => { cancelled = true; };
    }, [arenaFriends]);
    const othersInQueueBadge = queueOthersCount > 0 ? (<View style={[
            styles.queueActivityBadge,
            {
                borderColor: `${t.accent}55`,
                backgroundColor: `${t.accent}14`,
            },
        ]} accessibilityRole="text" accessibilityLabel={triLang(lang, {
            uk: `Зараз шукають матч: ${queueOthersCount}`,
            ru: `Сейчас ищут матч: ${queueOthersCount}`,
            es: `Jugadores buscando partida: ${queueOthersCount}`,
            'pt-BR': `Procurando partida agora: ${queueOthersCount}`,
            vi: `?ang t?m tr?n: ${queueOthersCount}`,
            id: `Sedang mencari pertandingan: ${queueOthersCount}`,
            tr: `?u an ma? arayanlar: ${queueOthersCount}`,
            pl: `Szukaj? meczu: ${queueOthersCount}`,
        })}>
        <Ionicons name="people" size={18} color={t.accent}/>
        <Text style={[styles.queueActivityBadgeText, { color: t.textPrimary }]}>
          {triLang(lang, {
            uk: 'Шукають матч: ',
            ru: 'Ищут матч: ',
            es: 'Buscan partida: ',
            'pt-BR': "Procurando partida: ",
            vi: "?ang t?m tr?n: ",
            id: "Mencari pertandingan: ",
            tr: "Ma? arayanlar: ",
            pl: "Szukaj? meczu: ",
        })}
          <Text style={{ fontWeight: '900', color: t.accent }}>{queueOthersCount}</Text>
        </Text>
      </View>) : null;
    const arenaTicketsLeft = Math.max(0, dailyMax - dailyCount);
    const arenaTicketsColor = isUnlimited
        ? ('#F5D97A')
        : arenaTicketsLeft <= 0
            ? ('#FF6B6B')
            : arenaTicketsLeft <= 1
                ? ('#F59E0B')
                : ('#58E58B');
    const arenaTicketsText = isUnlimited ? '∞' : `${arenaTicketsLeft}/${dailyMax}`;
    const arenaGlass = useMemo(() => {
        const light = themeMode === 'minimalLight';
        const neon = themeMode === 'neon';
        const gold = themeMode === 'gold';
        const accent = t.accent;
        const warm = gold || light ? '#B98925' : '#F5D97A';
        const ctaBase = neon ? t.accent : gold ? t.textSecond : light ? '#3B4A6B' : t.correct;
        return {
            cardColors: light
                ? ['rgba(255,255,255,0.62)', 'rgba(255,253,248,0.34)', 'rgba(255,255,255,0.20)']
                : gold
                    ? GOLD_GRADIENTS.premiumPanel
                    :
                        [
                            alphaColor(t.bgSurface, 0.58, '255,255,255'),
                            alphaColor(t.bgCard, 0.42, '255,255,255'),
                            'rgba(255,255,255,0.055)',
                        ],
            cardBorder: gold ? GOLD_RICH.hairlineStrong : light ? 'rgba(40,37,32,0.18)' : alphaColor(accent, 0.24),
            cardHighlight: gold ? GOLD_RICH.edgeLight : light ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.14)',
            innerBg: gold ? GOLD_RICH.bronzeWash : light ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.07)',
            innerBgSoft: gold ? GOLD_RICH.wash : light ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.045)',
            innerBorder: gold ? GOLD_RICH.hairline : light ? 'rgba(40,37,32,0.13)' : alphaColor(accent, 0.18),
            accent: accent,
            accentSoft: alphaColor(accent, light ? 0.10 : 0.15),
            solidAccent: accent,
            live: light ? '#2E9E62' : '#58E58B',
            liveText: light ? '#1F7A45' : '#BDF9D0',
            liveBg: light ? 'rgba(46,158,98,0.10)' : 'rgba(88,229,139,0.11)',
            liveBorder: light ? 'rgba(46,158,98,0.22)' : 'rgba(88,229,139,0.28)',
            warm,
            warmBg: alphaColor(warm, light ? 0.10 : 0.14, '245,217,122'),
            warmBorder: alphaColor(warm, light ? 0.20 : 0.28, '245,217,122'),
            ctaColors: gold ? GOLD_GRADIENTS.primaryButton : [alphaColor(ctaBase, 0.95), alphaColor(ctaBase, 0.78), alphaColor(t.correct, 0.62)],
            ctaText: t.correctText,
            ctaSubText: alphaColor(t.correctText, 0.66, '7,17,31'),
            ctaIcon: t.correctText,
            ctaIconBg: alphaColor(t.correctText, 0.12, '7,17,31'),
            ctaBorder: 'transparent',
            ctaBorderWidth: 0,
            heroOpacity: light ? 0.15 : gold ? 0.42 : neon ? 0.26 : 0.32,
            heroScrimColors: light
                ? ['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.46)', 'rgba(255,255,255,0.74)']
                : gold
                    ? ['rgba(0,0,0,0.18)', 'rgba(3,3,3,0.16)', 'rgba(0,0,0,0.74)']
                    : ['rgba(0,0,0,0.16)', 'rgba(0,0,0,0.24)', 'rgba(0,0,0,0.72)'],
            screenHeroOpacity: light ? 0.06 : gold ? 0.19 : neon ? 0.10 : 0.14,
            screenHeroScrimColors: light
                ? ['rgba(255,255,255,0.72)', 'rgba(255,255,255,0.58)', 'rgba(255,255,255,0.86)']
                : gold
                    ? ['rgba(0,0,0,0.60)', 'rgba(0,0,0,0.38)', 'rgba(0,0,0,0.92)']
                    : ['rgba(0,0,0,0.64)', 'rgba(0,0,0,0.44)', 'rgba(0,0,0,0.90)'],
        };
    }, [t, themeMode]);
    const arenaScreenHeroOpacity = arenaHeroEntrance.interpolate({
        inputRange: [0, 1],
        outputRange: [0, arenaGlass.screenHeroOpacity],
    });
    const arenaScreenHeroScale = arenaHeroEntrance.interpolate({
        inputRange: [0, 1],
        outputRange: [1.28, 1.18],
    });
    const arenaHeroOpacity = arenaHeroEntrance.interpolate({
        inputRange: [0, 1],
        outputRange: [0, arenaGlass.heroOpacity],
    });
    const arenaHeroScale = arenaHeroEntrance.interpolate({
        inputRange: [0, 1],
        outputRange: [1.12, 1],
    });
    const arenaHeroTranslateY = arenaHeroEntrance.interpolate({
        inputRange: [0, 1],
        outputRange: [8, 0],
    });
    const arenaBackdropSource = ARENA_THEME_BACKDROPS[themeMode] ?? ARENA_THEME_BACKDROPS.dark;
    return (<ScreenGradient>
      {!isTab && <View pointerEvents="none" style={styles.arenaScreenHeroLayer}>
        <Animated.Image source={arenaBackdropSource} resizeMode="cover" style={[
            styles.arenaScreenHeroImage,
            {
                opacity: arenaScreenHeroOpacity,
                transform: [{ scale: arenaScreenHeroScale }],
            },
        ]}/>
        <LinearGradient colors={arenaGlass.screenHeroScrimColors as [
            string,
            string,
            string
        ]} locations={[0, 0.48, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.arenaScreenHeroScrim}/>
      </View>}
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}
    /* В режиме таба верхний inset уже даёт (tabs)/_layout (paddingTop: insets.top). */
    edges={isTab ? [] : ['top', 'bottom']}>
      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity testID="arena-header-back" accessibilityLabel="qa-arena-header-back" accessible onPress={() => {
            hapticTap();
            if (isTab) {
                goHome();
            }
            else if (router.canGoBack()) {
                router.back();
            }
            else {
                router.replace('/(tabs)/home' as any);
            }
        }} style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.075)', borderColor: 'rgba(255,255,255,0.14)' }]}>
          <Ionicons name="chevron-back" size={20} color={t.textPrimary}/>
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text testID="screen-arena-lobby" accessibilityLabel="qa-screen-arena-lobby" style={[styles.titleText, { color: screenTitleColor, fontSize: f.h2 + 5 }]} adjustsFontSizeToFit minimumFontScale={0.75}>
            {triLang(lang, {
            ru: 'Арена',
            uk: 'Арена',
            es: 'Arena',
            'pt-BR': "Arena",
            vi: "??u tr??ng",
            id: "Arena",
            tr: "Arena",
            pl: "Arena",
        })}
          </Text>
          <TouchableOpacity testID="arena-rating-button" onPress={() => { hapticTap(); router.push('/arena_rating' as any); }} style={styles.headerRankLine} activeOpacity={0.78}>
            {myRank.isHydrated ? (<Image source={myRank.image} style={styles.headerRankIcon} resizeMode="contain"/>) : (<Ionicons name="shield-outline" size={16} color={screenMuted} style={styles.headerRankIcon}/>)}
            <Text style={[styles.headerRankText, { color: screenMuted, fontSize: f.caption }]}>
              {myRank.isHydrated ? myRank.labelShort : '—'}
            </Text>
            <Text style={[styles.headerRankMode, { color: screenMuted, fontSize: f.caption }]}>
              · {triLang(lang, {
            ru: 'рейтинг',
            uk: 'рейтинг',
            es: 'ranked',
            'pt-BR': "ranqueado",
            vi: "x?p h?ng",
            id: "peringkat",
            tr: "s?ralamal?",
            pl: "rankingowy",
        })}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          <View testID="arena-ticket-pill" accessibilityLabel={triLang(lang, {
            ru: `Билеты арены: ${arenaTicketsText}`,
            uk: `Квитки арени: ${arenaTicketsText}`,
            es: `Entradas de arena: ${arenaTicketsText}`,
            'pt-BR': `Ingressos da arena: ${arenaTicketsText}`,
            vi: `V? ??u tr??ng: ${arenaTicketsText}`,
            id: `Tiket arena: ${arenaTicketsText}`,
            tr: `Arena biletleri: ${arenaTicketsText}`,
            pl: `Bilety areny: ${arenaTicketsText}`,
        })} style={[
            styles.arenaTicketPill,
            {
                borderColor: `${arenaTicketsColor}66`,
                backgroundColor: `${arenaTicketsColor}18`,
            },
        ]}>
            <Ionicons name="ticket" size={16} color={arenaTicketsColor}/>
            <Text style={[styles.arenaTicketText, { color: arenaTicketsColor, fontSize: f.label }]}>
              {arenaTicketsText}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {/* INFO-зона — фиксированная высота над actions. Любая поздняя
            подгрузка контекста (isUnlimited, queueOthersCount) НЕ должна
            смещать кнопки в actions — поэтому держим всё, что асинхронно,
            в отдельном слоте с зарезервированным minHeight. */}
        {/* infoZone — минимальный слот, резервирует место под async-контент */}
        <View style={styles.infoZone} pointerEvents="none"/>

        <View style={styles.actions}>
          {showQueuePanel ? (<>
              <View style={[
                styles.queuePanel,
                USE_ELITE_ARENA_LOBBY && styles.eliteQueuePanel,
                { borderColor: `${t.accent}40`, backgroundColor: 'rgba(255,255,255,0.04)' },
            ]}>
                {USE_ELITE_ARENA_LOBBY && (<View style={styles.eliteRadarWrap} pointerEvents="none">
                    {/* Статичные кольца радара */}
                    {[1, 0.68, 0.38].map((scale, i) => (<View key={i} style={[
                        styles.eliteRadarRingStatic,
                        {
                            borderColor: t.accent,
                            opacity: 0.35 + i * 0.18,
                            transform: [{ scale }],
                        },
                    ]}/>))}
                    {/* Пульсирующее кольцо */}
                    <Animated.View style={[
                    styles.eliteRadarRingStatic,
                    {
                        borderColor: t.accent,
                        borderWidth: 1.5,
                        opacity: eliteRadarPulse.interpolate({
                            inputRange: [0, 0.3, 0.7, 1],
                            outputRange: [0.55, 0.25, 0, 0],
                        }),
                        transform: [{
                                scale: eliteRadarPulse.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.36, 1.05],
                                }),
                            }],
                    },
                ]}/>
                    {/* Крестовина */}
                    <View style={[styles.eliteRadarCross, { backgroundColor: t.accent, width: '100%', height: 1 }]}/>
                    <View style={[styles.eliteRadarCross, { backgroundColor: t.accent, width: 1, height: '100%' }]}/>
                    {/* Луч радара с градиентным следом */}
                    <Animated.View style={[
                    styles.eliteRadarSweepWrap,
                    {
                        transform: [{
                                rotate: eliteRadarSweep.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '360deg'],
                                }),
                            }],
                    },
                ]}>
                      {/* Градиентный конус-след (60° дуга, fade к прозрачному) */}
                      <LinearGradient colors={[t.accent + '00', t.accent + '55', t.accent + 'BB']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.eliteRadarSweepGradient}/>
                      {/* Главная линия луча */}
                      <View style={[styles.eliteRadarBeam, { backgroundColor: t.accent }]}/>
                    </Animated.View>
                    {/* Центральная точка */}
                    <View style={[styles.eliteRadarDot, { backgroundColor: t.accent }]}/>
                  </View>)}
                {othersInQueueBadge}
                <Text style={[styles.queueTitle, { color: t.textPrimary, fontSize: f.body }]}>
                  {triLang(lang, {
                uk: 'Шукаємо суперника',
                ru: 'Ищем соперника',
                es: 'Buscando rival',
                'pt-BR': "Procurando rival",
                vi: "?ang t?m ??i th?",
                id: "Mencari lawan",
                tr: "Rakip aran?yor",
                pl: "Szukamy rywala",
            })}
                </Text>
                <Text style={[styles.queueCountdown, { color: t.accent }]} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatRemainSearch(remainSearchMs)}
                </Text>
                <Text style={[styles.searchingLabel, { color: screenMuted, fontSize: f.sub, marginTop: 4 }]}>
                  {triLang(lang, {
                uk: `У черзі: ${formatElapsed(displayElapsed)}`,
                ru: `В очереди: ${formatElapsed(displayElapsed)}`,
                es: `En cola: ${formatElapsed(displayElapsed)}`,
                'pt-BR': `Na fila: ${formatElapsed(displayElapsed)}`,
                vi: `Trong h?ng ch?: ${formatElapsed(displayElapsed)}`,
                id: `Dalam antrean: ${formatElapsed(displayElapsed)}`,
                tr: `S?rada: ${formatElapsed(displayElapsed)}`,
                pl: `W kolejce: ${formatElapsed(displayElapsed)}`,
            })}
                </Text>
                {showMatchFound && (<View style={[styles.matchFoundBadge, { backgroundColor: `${t.accent}22`, borderColor: `${t.accent}66` }]}>
                    <Ionicons name="checkmark-circle" size={16} color={t.accent}/>
                    <Text style={[{ color: t.accent, fontSize: f.caption, fontWeight: '900' }]}>
                      {triLang(lang, {
                    uk: 'Суперника знайдено!',
                    ru: 'Соперник найден!',
                    es: '¡Rival encontrado!',
                    'pt-BR': "Rival encontrado!",
                    vi: "?? t?m th?y ??i th?!",
                    id: "Lawan ditemukan!",
                    tr: "Rakip bulundu!",
                    pl: "Znaleziono rywala!",
                })}
                    </Text>
                  </View>)}
              </View>

              {rankedWagerCardEl && phase === 'searching' ? (<View style={{ marginTop: 10, alignSelf: 'center', width: layoutW }}>{rankedWagerCardEl}</View>) : null}

              {showMatchFound && sessionId && lobbyAcceptDeadlineAt != null && (<View style={{ width: layoutW, alignSelf: 'center', marginBottom: 8, marginTop: 2 }} accessibilityRole="timer">
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: `${t.border}99`, overflow: 'hidden' }}>
                    <Animated.View style={{
                    height: '100%',
                    width: '100%',
                    backgroundColor: t.accent,
                    borderRadius: 2,
                    transform: [{ scaleX: lobbyAcceptBarAnim }],
                    transformOrigin: 'left',
                }}/>
                  </View>
                </View>)}

              <View style={styles.queueActionMorphRow}>
                <Animated.View style={[styles.queueBtnSlot, { width: leftW, overflow: 'hidden' }]}>
                  {showMatchFound && (<Animated.View style={{ width: '100%', opacity: leftOp }}>
                      <TouchableOpacity testID="arena-accept-match" activeOpacity={0.9} onPress={handleMatchFoundAccept} style={[styles.queueAcceptBtn, { backgroundColor: t.accent, borderColor: t.accent }]}>
                        <Ionicons name="checkmark-circle" size={20} color={t.correctText}/>
                        <Text style={{ color: t.correctText, fontWeight: '900', fontSize: f.sub }}>
                          {triLang(lang, {
                    uk: 'ПРИЙНЯТИ',
                    ru: 'ПРИНЯТЬ',
                    es: 'ACEPTAR',
                    'pt-BR': "ACEITAR",
                    vi: "CH?P NH?N",
                    id: "TERIMA",
                    tr: "KABUL ET",
                    pl: "AKCEPTUJ",
                })}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>)}
                </Animated.View>
                <Animated.View style={{ width: spacerW, flexShrink: 0 }}/>
                <Animated.View style={[styles.queueBtnSlot, { width: rightW }]}>
                  <TouchableOpacity testID="arena-queue-cancel" style={[styles.cancelBtn, { borderColor: t.border, width: '100%' }]} onPress={showMatchFound ? handleMatchFoundDecline : handleCancelSearch} activeOpacity={0.9} accessibilityLabel={showMatchFound
                ? triLang(lang, {
                    uk: 'Відмовитись',
                    ru: 'Отклонить',
                    es: 'Rechazar',
                    'pt-BR': "Recusar",
                    vi: "T? ch?i",
                    id: "Tolak",
                    tr: "Reddet",
                    pl: "Odrzu?",
                })
                : triLang(lang, {
                    uk: 'Скасувати',
                    ru: 'Отмена',
                    es: 'Cancelar',
                    'pt-BR': "Cancelar",
                    vi: "H?y",
                    id: "Batal",
                    tr: "?ptal",
                    pl: "Anuluj",
                })}>
                    <Text style={[
                {
                    color: showMatchFound ? t.textPrimary : screenMuted,
                    fontSize: f.body,
                    fontWeight: showMatchFound ? '800' : '400',
                    textAlign: 'center',
                    lineHeight: f.body + 2,
                },
                effectiveOs === 'android' && { includeFontPadding: false, textAlignVertical: 'center' as const },
            ]}>
                      {showMatchFound
                ? triLang(lang, {
                    uk: 'Відмовити',
                    ru: 'Отклонить',
                    es: 'Rechazar',
                    'pt-BR': "Recusar",
                    vi: "T? ch?i",
                    id: "Tolak",
                    tr: "Reddet",
                    pl: "Odrzu?",
                })
                : triLang(lang, {
                    uk: 'Скасувати',
                    ru: 'Отмена',
                    es: 'Cancelar',
                    'pt-BR': "Cancelar",
                    vi: "H?y",
                    id: "Batal",
                    tr: "?ptal",
                    pl: "Anuluj",
                })}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </>) : (<>
              <LinearGradient colors={arenaGlass.cardColors as [
            string,
            string,
            string
        ]} locations={themeMode === 'gold' ? GOLD_SURFACE_LOCATIONS : [0, 0.58, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} testID="arena-action-container" style={[
                styles.arenaStageCard,
                {
                    borderColor: arenaGlass.cardBorder,
                    shadowColor: t.shadowDark,
                },
                themeMode === 'gold' ? goldShadow(3) : null,
                null,
            ]}>
                <Animated.Image source={arenaBackdropSource} resizeMode="cover" style={[
                styles.arenaHeroImage,
                {
                    opacity: arenaHeroOpacity,
                    transform: [{ scale: arenaHeroScale }, { translateY: arenaHeroTranslateY }],
                },
            ]}/>
                <LinearGradient pointerEvents="none" colors={arenaGlass.heroScrimColors as [
            string,
            string,
            string
        ]} locations={[0, 0.48, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.arenaHeroScrim}/>
                {themeMode === 'gold' && <GoldBevel radius={24} intensity="strong"/>}
                <View style={[styles.arenaGlassHighlight, { borderColor: arenaGlass.cardHighlight }]} pointerEvents="none"/>
                <View style={styles.arenaStageTop}>
                  <View style={[styles.arenaStatusPill, { backgroundColor: arenaGlass.liveBg, borderColor: arenaGlass.liveBorder }]}>
                    <View style={[styles.arenaStatusDot, { backgroundColor: arenaGlass.live }]}/>
                    <Text style={[styles.arenaStatusText, { color: arenaGlass.liveText, fontSize: f.caption }]}>
                      {triLang(lang, {
                ru: `${idleQueueHintDisplayCount} в поиске`,
                uk: `${idleQueueHintDisplayCount} у пошуку`,
                es: `${idleQueueHintDisplayCount} buscando`,
                'pt-BR': `${idleQueueHintDisplayCount} procurando`,
                vi: `${idleQueueHintDisplayCount} ?ang t?m`,
                id: `${idleQueueHintDisplayCount} mencari`,
                tr: `${idleQueueHintDisplayCount} ar?yor`,
                pl: `${idleQueueHintDisplayCount} szuka`,
            })}
                    </Text>
                  </View>
                  <View style={[styles.arenaModePill, { borderColor: arenaGlass.innerBorder, backgroundColor: arenaGlass.innerBgSoft }]}>
                    <Ionicons name="trophy-outline" size={14} color={arenaGlass.warm}/>
                    <Text style={[styles.arenaModeText, { color: arenaGlass.warm, fontSize: f.caption }]}>
                      {triLang(lang, {
                ru: 'Ranked',
                uk: 'Ranked',
                es: 'Ranked',
                'pt-BR': "Ranqueado",
                vi: "X?p h?ng",
                id: "Ranked",
                tr: "S?ralamal?",
                pl: "Rankingowy",
            })}
                    </Text>
                  </View>
                </View>

                <View style={styles.arenaStageCopy}>
                  <Text style={[styles.arenaStageSub, { color: screenMuted, fontSize: f.caption }]}>
                    {triLang(lang, {
                ru: 'Выбери формат матча',
                uk: 'Обери формат матчу',
                es: 'Elige formato de partida',
                'pt-BR': "Escolha o formato da partida",
                vi: "Ch?n ??nh d?ng tr?n ??u",
                id: "Pilih format pertandingan",
                tr: "Ma? format?n? se?",
                pl: "Wybierz format meczu",
            })}
                  </Text>
                </View>

                <TouchableOpacity testID="arena-find-match" accessibilityLabel="qa-arena-find-match" accessible={true} disabled={!myRank.isHydrated} onPress={() => { hapticTap(); handleFindMatch(); }} activeOpacity={0.9} style={[styles.arenaLaunchTouch, !myRank.isHydrated && styles.eliteDisabled]}>
                  <LinearGradient colors={arenaGlass.ctaColors as [
            string,
            string,
            string
        ]} locations={themeMode === 'gold' ? [0, 0.36, 1] : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[
                styles.arenaLaunchGradient,
                { borderColor: arenaGlass.ctaBorder, borderWidth: arenaGlass.ctaBorderWidth },
            ]}>
                    {themeMode === 'gold' && <GoldBevel radius={20} intensity="strong"/>}
                    {false}
                    <View style={[styles.arenaLaunchIconWrap, { backgroundColor: arenaGlass.ctaIconBg }]}>
                      <Ionicons name="flash" size={25} color={arenaGlass.ctaIcon}/>
                    </View>
                    <View style={styles.arenaLaunchTextWrap}>
                      <Text style={[styles.arenaLaunchTitle, { color: arenaGlass.ctaText, fontSize: f.h2 + 3 }]}>
                        {triLang(lang, {
                ru: 'Найти матч',
                uk: 'Знайти матч',
                es: 'Buscar partida',
                'pt-BR': "Encontrar partida",
                vi: "T?m tr?n",
                id: "Cari pertandingan",
                tr: "Ma? bul",
                pl: "Znajd? mecz",
            })}
                      </Text>
                      <Text style={[styles.arenaLaunchSub, { color: arenaGlass.ctaSubText, fontSize: f.caption }]}>
                        {triLang(lang, {
                ru: 'подбор соперника',
                uk: 'підбір суперника',
                es: 'matchmaking',
                'pt-BR': "pareamento",
                vi: "gh?p tr?n",
                id: "matchmaking",
                tr: "e?le?tirme",
                pl: "dobieranie rywala",
            })}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={34} color={arenaGlass.ctaIcon}/>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.arenaCostRow}>
                  {isUnlimited ? (<View style={[styles.arenaCostChip, { backgroundColor: arenaGlass.warmBg, borderColor: arenaGlass.warmBorder }]}>
                      <Ionicons name="sparkles" size={14} color={arenaGlass.warm}/>
                      <Text style={[styles.arenaCostText, { color: arenaGlass.warm, fontSize: f.caption }]}>
                        {triLang(lang, {
                    ru: 'Premium без лимита',
                    uk: 'Premium без ліміту',
                    es: 'Premium ilimitado',
                    'pt-BR': "Premium sem limite",
                    vi: "Premium kh?ng gi?i h?n",
                    id: "Premium tanpa batas",
                    tr: "S?n?rs?z Premium",
                    pl: "Premium bez limitu",
                })}
                      </Text>
                    </View>) : (<>
                      <View style={[styles.arenaCostChip, { backgroundColor: arenaGlass.innerBg, borderColor: arenaGlass.innerBorder }]}>
                        <Ionicons name="flash" size={14} color={arenaGlass.warm}/>
                        <Text style={[styles.arenaCostText, { color: screenMuted, fontSize: f.caption }]}>
                          {triLang(lang, {
                    ru: '1 энергия',
                    uk: '1 енергія',
                    es: '1 energía',
                    'pt-BR': "1 energia",
                    vi: "1 n?ng l??ng",
                    id: "1 energi",
                    tr: "1 enerji",
                    pl: "1 energia",
                })}
                        </Text>
                      </View>
                      <View style={[styles.arenaCostChip, { backgroundColor: `${arenaTicketsColor}12`, borderColor: `${arenaTicketsColor}33` }]}>
                        <Ionicons name="ticket" size={14} color={arenaTicketsColor}/>
                        <Text style={[styles.arenaCostText, { color: screenMuted, fontSize: f.caption }]}>
                          {triLang(lang, {
                    ru: '1 билет',
                    uk: '1 квиток',
                    es: '1 entrada',
                    'pt-BR': "1 ingresso",
                    vi: "1 v?",
                    id: "1 tiket",
                    tr: "1 bilet",
                    pl: "1 bilet",
                })}
                        </Text>
                      </View>
                    </>)}
                </View>

                <View style={styles.arenaActionList}>
                  <TouchableOpacity testID="arena-play-with-friend" accessibilityLabel="qa-arena-play-with-friend" accessible={true} accessibilityRole="button" accessibilityState={{ expanded: friendRoomId != null }} onPress={() => {
                if (friendRoomId) {
                    hapticTap();
                    friendUnsubRef.current?.();
                    sentInviteUnsubRef.current?.();
                    friendUnsubRef.current = null;
                    sentInviteUnsubRef.current = null;
                    setFriendRoomId(null);
                    setFriendRoomReady(false);
                    setArenaFriendPickUid(null);
                    return;
                }
                void handlePlayWithFriend();
            }} activeOpacity={0.78} style={[styles.arenaCommandButton, { borderColor: arenaGlass.innerBorder, backgroundColor: arenaGlass.innerBg }]}>
                    <View style={[styles.arenaCommandIcon, { backgroundColor: arenaGlass.accentSoft }]}>
                      <Ionicons name="people-outline" size={20} color={arenaGlass.accent}/>
                    </View>
                    <View style={styles.arenaCommandCopy}>
                      <Text style={[styles.arenaCommandTitle, { color: screenTitleColor, fontSize: f.sub }]}>
                        {triLang(lang, {
                ru: 'Вызов другу',
                uk: 'Виклик другу',
                es: 'Reto a un amigo',
                'pt-BR': "Desafio a amigo",
                vi: "Th?ch ??u b?n b?",
                id: "Tantang teman",
                tr: "Arkada?a meydan oku",
                pl: "Wyzwanie dla znajomego",
            })}
                      </Text>
                      <Text style={[styles.arenaCommandSub, { color: screenMuted, fontSize: f.caption }]}>
                        {triLang(lang, {
                ru: 'Личный бой по приглашению',
                uk: 'Особистий бій за запрошенням',
                es: 'Duelo privado por invitación',
                'pt-BR': "Duelo privado por convite",
                vi: "??u ri?ng b?ng l?i m?i",
                id: "Duel pribadi lewat undangan",
                tr: "Davetli ?zel d?ello",
                pl: "Prywatny pojedynek z zaproszenia",
            })}
                      </Text>
                    </View>
                    <Ionicons name={friendRoomId ? 'chevron-up' : 'chevron-down'} size={18} color={screenMuted}/>
                  </TouchableOpacity>

                  {friendRoomId && (<View testID="arena-friend-panel" style={[styles.arenaFriendsPanel, { borderColor: arenaGlass.innerBorder, backgroundColor: arenaGlass.innerBgSoft }]}>
                      {arenaFriends.length > 0 ? (<>
                          <ScrollView testID="arena-friends-scroll" horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.arenaFriendsScrollContent}>
                            {arenaFriends.map(friend => {
                        const profile = arenaFriendProfiles[friend.uid];
                        const totalXp = profile?.totalXp ?? 0;
                        const level = getLevelFromXP(totalXp);
                        const avatarId = profile?.avatar || String(getBestAvatarForLevel(level));
                        const name = profile?.name ?? '—';
                        const sending = arenaInviteSendingUid === friend.uid;
                        const selected = arenaFriendPickUid === friend.uid;
                        return (<TouchableOpacity testID={`arena-friend-pick-${friend.uid}`} accessibilityLabel={`qa-arena-friend-pick-${friend.uid}`} accessibilityRole="button" accessibilityState={{ selected, disabled: sending }} key={friend.uid} onPress={() => {
                                if (sending)
                                    return;
                                hapticTap();
                                setArenaFriendPickUid(friend.uid);
                            }} activeOpacity={0.75} style={[
                                styles.arenaFriendChip,
                                {
                                    borderColor: selected ? arenaGlass.accent : 'rgba(255,255,255,0.12)',
                                    backgroundColor: selected ? arenaGlass.accentSoft : arenaGlass.innerBgSoft,
                                    opacity: sending ? 0.55 : 1,
                                },
                            ]}>
                                  <View style={{ position: 'relative' }}>
                                    <AvatarView avatar={avatarId} size={36} auraId={profile?.aura}/>
                                    {sending ? (<View style={styles.arenaFriendSendingOverlay}>
                                        <Ionicons name="paper-plane" size={15} color={t.accent}/>
                                      </View>) : null}
                                  </View>
                                  <Text style={[styles.arenaFriendName, { color: screenTitleColor, fontSize: f.caption }]}>
                                    {name}
                                  </Text>
                                  <Text style={[styles.arenaFriendLevel, { color: screenMuted, fontSize: f.caption - 1 }]}>
                                    Lv {level}
                                  </Text>
                                </TouchableOpacity>);
                    })}
                          </ScrollView>
                          {arenaFriendPickUid != null && (<TouchableOpacity testID={`arena-send-friend-invite-${arenaFriendPickUid}`} accessibilityLabel="qa-arena-send-friend-invite" accessibilityRole="button" accessibilityState={{
                            disabled: arenaInviteSendingUid != null || !friendRoomReady,
                            busy: arenaInviteSendingUid != null || !friendRoomReady,
                        }} activeOpacity={0.86} disabled={arenaInviteSendingUid != null || !friendRoomReady} onPress={() => void handleSendInAppInviteToFriend(arenaFriendPickUid)} style={[
                            styles.arenaInviteButton,
                            {
                                backgroundColor: arenaGlass.solidAccent,
                                opacity: arenaInviteSendingUid != null || !friendRoomReady ? 0.55 : 1,
                            },
                        ]}>
                          <Ionicons name="flash" size={18} color={t.correctText}/>
                          <Text style={[styles.arenaInviteButtonText, { color: t.correctText, fontSize: f.sub }]}>
                            {!friendRoomReady
                            ? triLang(lang, {
                                ru: 'Arena',
                                uk: 'Arena',
                                es: 'Arena',
                                'pt-BR': "Arena",
                                vi: "??u tr??ng",
                                id: "Arena",
                                tr: "Arena",
                                pl: "Arena",
                            })
                            : arenaInviteSendingUid != null
                                ? triLang(lang, {
                                    ru: 'Отправляем',
                                    uk: 'Надсилаємо',
                                    es: 'Enviando',
                                    'pt-BR': "Enviando",
                                    vi: "?ang g?i",
                                    id: "Mengirim",
                                    tr: "G?nderiliyor",
                                    pl: "Wysy?anie",
                                })
                                : triLang(lang, {
                                    ru: 'Бросить вызов',
                                    uk: 'Кинути виклик',
                                    es: 'Lanzar reto',
                                    'pt-BR': "Lan?ar desafio",
                                    vi: "G?i th?ch ??u",
                                    id: "Kirim tantangan",
                                    tr: "Meydan oku",
                                    pl: "Rzu? wyzwanie",
                                })}
                              </Text>
                            </TouchableOpacity>)}
                        </>) : (<View testID="arena-friend-empty" style={styles.arenaFriendEmpty}>
                          <Ionicons name="person-add-outline" size={20} color={arenaGlass.accent}/>
                          <Text style={[styles.arenaFriendEmptyText, { color: screenMuted, fontSize: f.caption }]}>
                            {triLang(lang, {
                        ru: 'Пока нет друзей для вызова.',
                        uk: 'Поки немає друзів для виклику.',
                        es: 'Aún no hay amigos para retar.',
                        'pt-BR': "Ainda n?o h? amigos para desafiar.",
                        vi: "Ch?a c? b?n b? ?? th?ch ??u.",
                        id: "Belum ada teman untuk ditantang.",
                        tr: "Meydan okuyacak arkada? yok.",
                        pl: "Nie masz jeszcze znajomych do wyzwania.",
                    })}
                          </Text>
                        </View>)}
                    </View>)}

                  <View testID="arena-throne-info" accessible accessibilityRole="text" style={[styles.arenaInfoRow, { borderColor: arenaGlass.innerBorder, backgroundColor: arenaGlass.innerBgSoft }]}>
                    <View style={[styles.arenaCommandIcon, { backgroundColor: arenaGlass.warmBg }]}>
                      <Ionicons name="trophy-outline" size={20} color={arenaGlass.warm}/>
                    </View>
                    <View style={styles.arenaCommandCopy}>
                      <Text style={[styles.arenaCommandTitle, { color: screenTitleColor, fontSize: f.sub }]}>
                        {hillThrone
                ? triLang(lang, {
                    ru: 'Трон дня',
                    uk: 'Трон дня',
                    es: 'Trono del día',
                    'pt-BR': "Trono do dia",
                    vi: "Ngai v?ng h?m nay",
                    id: "Takhta hari ini",
                    tr: "G?n?n taht?",
                    pl: "Tron dnia",
                })
                : triLang(lang, {
                    ru: 'Трон свободен',
                    uk: 'Трон вільний',
                    es: 'Trono libre',
                    'pt-BR': "Trono livre",
                    vi: "Ngai v?ng c?n tr?ng",
                    id: "Takhta kosong",
                    tr: "Taht bo?",
                    pl: "Tron wolny",
                })}
                      </Text>
                      <Text style={[styles.arenaCommandSub, { color: screenMuted, fontSize: f.caption }]}>
                        {hillThrone
                ? triLang(lang, {
                    ru: `${hillThrone.championName} · ${hillThrone.score} побед`,
                    uk: `${hillThrone.championName} · ${hillThrone.score} перемог`,
                    es: `${hillThrone.championName} · ${hillThrone.score} victorias`,
                    'pt-BR': `${hillThrone.championName} ? ${hillThrone.score} vit?rias`,
                    vi: `${hillThrone.championName} ? ${hillThrone.score} tr?n th?ng`,
                    id: `${hillThrone.championName} ? ${hillThrone.score} kemenangan`,
                    tr: `${hillThrone.championName} ? ${hillThrone.score} galibiyet`,
                    pl: `${hillThrone.championName} ? ${hillThrone.score} zwyci?stw`,
                })
                : triLang(lang, {
                    ru: 'Пока никто не занял трон',
                    uk: 'Поки ніхто не зайняв трон',
                    es: 'Nadie ocupa el trono aún',
                    'pt-BR': "Ningu?m ocupou o trono ainda",
                    vi: "Ch?a ai chi?m ngai v?ng",
                    id: "Belum ada yang menduduki takhta",
                    tr: "Taht? hen?z kimse almad?",
                    pl: "Nikt jeszcze nie zaj?? tronu",
                })}
                      </Text>
                    </View>
                    <Text style={[styles.arenaInfoBadge, { color: arenaGlass.warm, fontSize: f.caption, backgroundColor: arenaGlass.warmBg }]}>
                      {triLang(lang, {
                ru: 'Инфо',
                uk: 'Інфо',
                es: 'Info',
                'pt-BR': "Info",
                vi: "Th?ng tin",
                id: "Info",
                tr: "Bilgi",
                pl: "Info",
            })}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

            </>)}
        </View>


        {/* Слот всегда занят, чтобы поздний приход isUnlimited / phase
            не сдвигал кнопки в actions (иначе при заходе ловим «прыжок» интерфейса). */}
        <View style={styles.dailyLimitRow} pointerEvents="none"/>
        <View style={{ alignItems: 'center', paddingTop: 8 }}>
          <ReportErrorButton screen="arena_lobby" dataId="arena_lobby" textColor={undefined} dataText={triLang(lang, {
            ru: 'Лобби арены',
            uk: 'Лобі арени',
            es: 'Lobby de la arena',
            'pt-BR': "Lobby da arena",
            vi: "S?nh ??u tr??ng",
            id: "Lobi arena",
            tr: "Arena lobisi",
            pl: "Lobby areny",
        })}/>
        </View>
      </ScrollView>
      </SafeAreaView>

      <ArenaLimitModal visible={arenaLimitModal !== null} mode={arenaLimitModal ?? 'matchmaking'} playsUsed={dailyCount} dailyMax={dailyMax} isUnlimited={isUnlimited} onRefillSuccess={async () => {
            setDailyCount(await getDailyArenaCount());
            setDailyMax(await getDailyArenaMaxToday());
            logEvent('arena_plays_refill_shards', {
                cost: ARENA_MATCHES_SHARD_REFILL_COST,
                slots: ARENA_MATCHES_SHARD_REFILL_SLOTS,
            });
        }} onClose={() => setArenaLimitModal(null)}/>
      <NoEnergyModal visible={noEnergyModal} onClose={() => setNoEnergyModal(false)} paywallContext="arena"/>
    </ScreenGradient>);
}
const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        paddingHorizontal: 14,
        paddingBottom: 10,
        minHeight: 74,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    titleWrap: { flex: 1, minWidth: 0, justifyContent: 'center', alignItems: 'flex-start' },
    titleText: { textAlign: 'left', width: '100%', fontWeight: '900', letterSpacing: 0 },
    headerRankLine: {
        minHeight: 22,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        maxWidth: '100%',
    },
    headerRankIcon: { width: 16, height: 16, flexShrink: 0 },
    headerRankText: { fontWeight: '800', maxWidth: 92 },
    headerRankMode: { fontWeight: '600', opacity: 0.82 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
    arenaTicketPill: {
        minWidth: 66,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 11,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    arenaTicketText: { fontWeight: '900', fontVariant: ['tabular-nums'] },
    rankBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5,
    },
    rankEmoji: { fontSize: 16 },
    rankText: { fontWeight: '600' },
    bodyScroll: { flex: 1 },
    /** Stable top rhythm for the lobby controls; low screens still scroll normally. */
    bodyScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 88,
        gap: 22,
    },
    infoZone: {
        minHeight: 0,
    },
    arenaScreenHeroLayer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    arenaScreenHeroImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    arenaScreenHeroScrim: {
        ...StyleSheet.absoluteFillObject,
    },
    card: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 14 },
    cardLabel: { fontWeight: '500' },
    sizeButtons: { flexDirection: 'row', gap: 10 },
    sizeBtn: {
        flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5,
        alignItems: 'center', justifyContent: 'center',
    },
    sizeBtnText: { fontWeight: '700' },
    actions: { width: '100%', gap: 10, alignSelf: 'center' },
    arenaStageCard: {
        width: '100%',
        alignSelf: 'center',
        borderRadius: 28,
        borderWidth: 1,
        padding: 20,
        overflow: 'hidden',
        gap: 16,
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.22,
        shadowRadius: 28,
        elevation: 8,
    },
    arenaHeroImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    arenaHeroScrim: {
        ...StyleSheet.absoluteFillObject,
    },
    arenaGlassHighlight: {
        position: 'absolute',
        left: 1,
        right: 1,
        top: 1,
        height: '46%',
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopLeftRadius: 27,
        borderTopRightRadius: 27,
        opacity: 0.85,
    },
    arenaStageRail: {
        position: 'absolute',
        top: -70,
        right: 34,
        width: 88,
        height: 430,
        opacity: 0.42,
        transform: [{ rotate: '31deg' }],
    },
    arenaStageRailAlt: {
        position: 'absolute',
        bottom: -88,
        left: 28,
        width: 64,
        height: 330,
        opacity: 0.5,
        transform: [{ rotate: '31deg' }],
    },
    arenaStageTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    arenaStatusPill: {
        minHeight: 34,
        borderRadius: 17,
        borderWidth: 1,
        paddingHorizontal: 11,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    arenaStatusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#58E58B',
    },
    arenaStatusText: { fontWeight: '900' },
    arenaModePill: {
        minHeight: 34,
        borderRadius: 17,
        borderWidth: 1,
        paddingHorizontal: 11,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.055)',
    },
    arenaModeText: { fontWeight: '900' },
    arenaStageCopy: {
        gap: 2,
    },
    arenaStageKicker: {
        fontWeight: '900',
        letterSpacing: 1.2,
    },
    arenaStageTitle: {
        fontWeight: '900',
        letterSpacing: 0,
    },
    arenaStageSub: {
        lineHeight: 18,
        fontWeight: '600',
        maxWidth: 300,
    },
    arenaLaunchTouch: {
        width: '100%',
        borderRadius: 22,
    },
    arenaLaunchGradient: {
        height: 76,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 12,
    },
    arenaLaunchIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(7,17,31,0.12)',
    },
    arenaLaunchTextWrap: { flex: 1, minWidth: 0 },
    arenaLaunchTitle: { fontWeight: '900', letterSpacing: 0 },
    arenaLaunchSub: { fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, flexWrap: 'wrap' },
    arenaCostRow: {
        minHeight: 32,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    arenaCostChip: {
        minHeight: 30,
        borderRadius: 15,
        borderWidth: 1,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    arenaCostText: { fontWeight: '800' },
    arenaActionList: {
        gap: 12,
        marginTop: 4,
    },
    arenaCommandButton: {
        minHeight: 76,
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    arenaCommandIcon: {
        width: 42,
        height: 42,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    arenaCommandCopy: { flex: 1, minWidth: 0, gap: 2 },
    arenaCommandTitle: { fontWeight: '900', letterSpacing: 0 },
    arenaCommandSub: { fontWeight: '600', lineHeight: 18, flexWrap: 'wrap' },
    arenaInfoRow: {
        minHeight: 82,
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    arenaInfoBadge: {
        fontWeight: '900',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        overflow: 'hidden',
    },
    arenaCommandActionText: { fontWeight: '900', flexShrink: 0 },
    arenaFriendsPanel: {
        borderRadius: 20,
        borderWidth: 1,
        paddingVertical: 12,
        gap: 12,
    },
    arenaFriendsScrollContent: {
        paddingHorizontal: 12,
        gap: 10,
    },
    arenaFriendChip: {
        width: 86,
        minHeight: 96,
        borderRadius: 18,
        borderWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    arenaFriendSendingOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.22)',
        borderRadius: 999,
    },
    arenaFriendName: {
        fontWeight: '800',
        maxWidth: 72,
        textAlign: 'center',
    },
    arenaFriendLevel: { fontWeight: '700' },
    arenaFriendEmpty: {
        minHeight: 76,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        gap: 8,
    },
    arenaFriendEmptyText: {
        textAlign: 'center',
        fontWeight: '700',
        lineHeight: 18,
    },
    arenaInviteButton: {
        height: 48,
        borderRadius: 18,
        marginHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    arenaInviteButtonText: {
        fontWeight: '900',
    },
    arenaEventStrip: {
        minHeight: 88,
        borderRadius: 22,
        borderWidth: 1,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        overflow: 'hidden',
    },
    arenaEventAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: '#F5D97A',
        opacity: 0.75,
    },
    arenaEventIcon: {
        width: 46,
        height: 46,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    arenaEventCopy: { flex: 1, minWidth: 0, gap: 2 },
    arenaEventKicker: { fontWeight: '900', letterSpacing: 1.2 },
    arenaEventTitle: { fontWeight: '900', letterSpacing: 0 },
    arenaEventSub: { fontWeight: '700', lineHeight: 17 },
    arenaEventAction: {
        minHeight: 34,
        borderRadius: 17,
        borderWidth: 1,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.18)',
    },
    arenaEventActionText: { fontWeight: '900' },
    /* ─── ELITE CARD ─── */
    eliteCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.13)',
        backgroundColor: 'rgba(255,255,255,0.055)',
        padding: 14,
        gap: 12,
        overflow: 'hidden',
    },
    eliteCornerTL: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 28,
        height: 28,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderTopLeftRadius: 22,
    },
    eliteCornerBR: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderBottomWidth: 2,
        borderRightWidth: 2,
        borderBottomRightRadius: 22,
    },
    eliteLiveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 24,
    },
    eliteLiveDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#4ADE80',
    },
    eliteLiveText: {
        fontWeight: '700',
    },
    eliteFindBtn: {
        height: 64,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 12,
    },
    eliteFindBtnTouch: {
        width: '100%',
        borderRadius: 14,
    },
    eliteDisabled: {
        opacity: 0.5,
    },
    eliteFindBtnTitle: {
        color: '#fff',
        fontWeight: '900',
        letterSpacing: 0,
    },
    eliteFindBtnSub: {
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '500',
        marginTop: 1,
    },
    eliteFindBtnArrow: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    eliteMainBtnGlow: {
        position: 'absolute',
        left: -6,
        right: -6,
        top: -6,
        bottom: -6,
        borderRadius: 22,
    },
    eliteDivider: {
        height: 1,
        marginHorizontal: 0,
    },
    eliteSecondaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 50,
    },
    eliteSecondaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
    },
    eliteSecondaryBtnIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    eliteSecondaryBtnText: { fontWeight: '800', letterSpacing: 0 },
    eliteSecondaryDivider: {
        width: 1,
        height: 28,
        flexShrink: 0,
    },
    mainBtn: {
        borderRadius: 18, height: 62,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingHorizontal: 18,
    },
    eliteMainBtn: { height: 70, borderRadius: 16, overflow: 'hidden' },
    mainBtnText: { fontWeight: '900', letterSpacing: 0 },
    energyCost: { marginLeft: 4, fontWeight: '600' },
    /* ─── THRONE CARD ─── */
    throneCard: {
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
        minHeight: 82,
    },
    throneTopAccent: {
        height: 2,
        opacity: 0.6,
    },
    throneInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 16,
        gap: 12,
    },
    throneBadgeLabel: {
        fontWeight: '800',
        letterSpacing: 1.4,
    },
    throneIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        backgroundColor: 'rgba(201,168,76,0.12)',
    },
    throneTitle: { fontWeight: '900', letterSpacing: 0 },
    throneSub: { fontWeight: '500', lineHeight: 17 },
    secondaryBtn: {
        borderRadius: 18, height: 56, borderWidth: 1,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    secondaryBtnText: { fontWeight: '600' },
    queueHintIdle: {
        marginBottom: 4,
        paddingHorizontal: 8,
    },
    queueActivityBadge: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 8,
    },
    queueActivityBadgeText: {
        fontSize: 14,
        fontWeight: '600',
    },
    premiumUnlimitedCard: {
        minHeight: 48,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 9,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    premiumUnlimitedIcon: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(245,217,122,0.12)',
    },
    premiumUnlimitedText: {
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 0,
    },
    rankedWagerCard: {
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 8,
    },
    rankedWagerTitle: { fontWeight: '800' },
    rankedWagerHint: { lineHeight: 18 },
    rankedWagerChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
        justifyContent: 'space-between',
    },
    rankedWagerChip: {
        flexGrow: 1,
        flexBasis: '20%',
        minWidth: 64,
        borderRadius: 12,
        borderWidth: 1.5,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchingLabel: { fontWeight: '500' },
    cancelBtn: {
        borderWidth: 1,
        borderRadius: 12,
        minHeight: 48,
        paddingHorizontal: 20,
        paddingVertical: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    queuePanel: {
        width: '100%',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 16,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: 1,
    },
    eliteQueuePanel: {
        minHeight: 194,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    eliteRadarWrap: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.18)',
        backgroundColor: 'rgba(0,0,0,0.32)',
    },
    eliteRadarRingStatic: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 1,
    },
    eliteRadarCross: {
        position: 'absolute',
        opacity: 0.28,
    },
    eliteRadarSweepWrap: {
        position: 'absolute',
        width: 60,
        height: 60,
        top: 0,
        left: 60,
        transformOrigin: '0% 100%',
        overflow: 'hidden',
    },
    eliteRadarSweepGradient: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderBottomLeftRadius: 60,
    },
    eliteRadarBeam: {
        position: 'absolute',
        width: 1.5,
        height: 60,
        bottom: 0,
        left: -0.75,
        opacity: 0.95,
        borderRadius: 1,
    },
    eliteRadarDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        opacity: 0.9,
    },
    matchFoundBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 7,
        marginTop: 4,
    },
    queueTitle: { fontWeight: '900', textAlign: 'center', letterSpacing: 0.2 },
    queueSub: { textAlign: 'center', lineHeight: 20 },
    queueCountdown: {
        fontSize: 44,
        fontVariant: ['tabular-nums'],
        fontWeight: '900',
        letterSpacing: 1,
        marginTop: 6,
    },
    energyInfo: { textAlign: 'center', marginTop: 0 },
    ticketCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 11,
        paddingHorizontal: 14,
        width: '100%',
    },
    ticketLeft: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    ticketTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ticketLabel: { fontWeight: '600', letterSpacing: 0.1 },
    ticketCount: { fontWeight: '800', letterSpacing: 0 },
    ticketBarBg: {
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    ticketBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    dailyLimitRow: { minHeight: 0 },
    queueActionMorphRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    queueBtnSlot: { minHeight: 48, justifyContent: 'center' },
    queueAcceptBtn: {
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 10,
    },
});
