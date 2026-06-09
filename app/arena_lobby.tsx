import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import TapScale from '../components/TapScale';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, ScrollView, Modal, InteractionManager, } from 'react-native';
import { Image } from 'expo-image';
const AnimatedImage = Animated.createAnimatedComponent(Image);
import { LinearGradient } from '../components/SafeLinearGradient';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useEnergy } from '../components/EnergyContext';
import ScreenGradient from '../components/ScreenGradient';
import { SessionSize } from './types/arena';
import { ensureArenaAuthUid } from './user_id_policy';
import { ensureAnonUser } from './cloud_sync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useArenaRank } from '../hooks/use-arena-rank';
import { ARENA_MATCHMAKING_SEARCH_MS, useMatchmakingContext } from '../contexts/MatchmakingContext';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import ArenaLimitModal, { ArenaLimitMode } from '../components/ArenaLimitModal';
import NoEnergyModal from '../components/NoEnergyModal';
import { ARENA_DAILY_MAX, ARENA_MATCHES_SHARD_REFILL_COST, ARENA_MATCHES_SHARD_REFILL_SLOTS, getDailyArenaCount, getDailyArenaMaxToday, } from './arena_daily_limit';
import { canStartArenaMatch, chargeArenaEntry, reserveArenaGameEntry } from './arena_access_gate';
import { actionToastTri, emitAppEvent, onAppEvent } from './events';
import { logEvent } from './firebase';
import { useTabNav } from './TabContext';
import { useScreen } from '../hooks/use-screen';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { arenaToasts } from '../constants/arena_i18n';
import { arenaActionIconSource } from './arena_action_icons';
import { ARENA_LOBBY_ACCEPT_MS, ARENA_PLAY_AGAIN_BOT_MAX_MS, ARENA_PLAY_AGAIN_BOT_MIN_MS, CLOUD_SYNC_ENABLED, ENABLE_ARENA_RANKED_WAGER, IS_EXPO_GO, } from './config';
import { useEffectivePlatformOS } from './platform_ui_preview';
import type { ArenaSession, LobbyChoice } from './types/arena';
import { saveExpoPushTokenToUser, setSessionLobbyChoice, subscribeMatchmakingSearchingTotal, subscribeSession, subscribeSessionPlayers, } from './services/arena_db';
import { ARENA_RANKED_WAGER_STAKES, clearPendingArenaRankedWager, getPendingArenaRankedWager, setPendingArenaRankedWager, winPayoutForStake, type ArenaRankedPendingWager, type ArenaRankedWagerStake, } from './arena_match_wager';
import { getShardsBalance } from './shards_system';
import { oskolokImageForPackShards } from './oskolok';
import { subscribeToFriends, type FriendEntry } from './firestore_friend_requests';
import { peekProfilesCache, startFriendsTabSwrPrime } from './friends_tab_swr_warm';
import { sendArenaInvite, setArenaInviteStatus, subscribeArenaInviteStatus, subscribeIncomingArenaInvites, type ArenaInviteRow } from './services/arena_invites';
import { joinArenaFriendRoomAsGuest } from './arena_friend_room_guest';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import ReportErrorButton from '../components/ReportErrorButton';
import AvatarView from '../components/AvatarView';
import PlayerProfileModal, { type PlayerInfo } from '../components/PlayerProfileModal';
import GoldBevel from '../components/GoldBevel';
import {
    backgroundTransitionKey,
    FABRIC_BACKGROUND_TRANSITIONS_ENABLED,
    usePersistentBackgroundLayers,
} from '../components/backgroundTransition';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';
import { getTodayArenaHillTop, subscribeTodayArenaHillThrone, type ArenaHillThrone, type ArenaHillTopEntry } from './services/arena_hill';
import { subscribeArenaFeatureFlags, type ArenaFeatureFlags, } from './services/arena_feature_flags';
import { safeRouterBack } from './navigation_back';
import { USER_AVATAR_AURA_KEY } from '../constants/avatar_auras';
import {
    getOrRefreshIdleQueueHintCount,
    IDLE_QUEUE_HINT_TTL_MS,
    sanitizeArenaIdleQueueHintCount,
} from './arena_queue_hint';
const USE_ELITE_ARENA_LOBBY = true;
const ARENA_HERO_BACKGROUND_FADE_MS = 980;
const ARENA_HERO_BACKGROUND_FADE_OUT_DELAY_MS = 80;
const ARENA_STAGE_BACKDROP_SCALE = 1.20;
const ARENA_STAGE_BACKDROP_SHIFT_X = 26;
const ARENA_STAGE_BACKDROPS = {
    dark: require('../assets/images/arena/knowledge-arena-dark.webp'),
    neon: require('../assets/images/arena/knowledge-arena-neon.webp'),
    gold: require('../assets/images/arena/knowledge-arena-gold.webp'),
    coral: require('../assets/images/arena/knowledge-arena-coral.webp'),
    minimalLight: require('../assets/images/arena/knowledge-arena-minimal-light.webp'),
    minimalDark: require('../assets/images/arena/knowledge-arena-minimal-dark.webp'),
    compass: require('../assets/images/arena/knowledge-arena-compass-premium-session.webp'),
} as const;
const ARENA_TICKET_ICONS = {
    dark: require('../assets/images/arena_tickets/ticket-dark.webp'),
    neon: require('../assets/images/arena_tickets/ticket-neon.webp'),
    gold: require('../assets/images/arena_tickets/ticket-gold.webp'),
    coral: require('../assets/images/arena_tickets/ticket-coral.webp'),
    minimalLight: require('../assets/images/arena_tickets/ticket-minimal-light.webp'),
    minimalDark: require('../assets/images/arena_tickets/ticket-minimal-dark.webp'),
    compass: require('../assets/images/arena_tickets/ticket-compass-premium-session.webp'),
} as const;
function alphaColor(color: string, alpha: number, defaultRgb = '255,255,255'): string {
    if (/^#[0-9a-f]{6}$/i.test(color)) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
    return `rgba(${defaultRgb},${alpha})`;
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
        vi: "Người chơi",
        id: "Pemain",
        tr: "Oyuncu",
        pl: "Gracz",
    }), [lang]);
    const { spendOne, isUnlimited, energy, bonusEnergy } = useEnergy();
    const size: SessionSize = 2;
    const [userId, setUserId] = useState<string>('');
    const [stableUserId, setStableUserId] = useState<string>('');
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
    const idleQueueHintCount = sanitizeArenaIdleQueueHintCount(idleQueueHintDisplayCount);
    /** Ставка осколками на следующий рейтинг-матч (только «Найти матч» / бот из очереди). */
    const [rankedWagerPending, setRankedWagerPending] = useState<ArenaRankedPendingWager | null>(null);
    /** Пока false — не показываем строку «при выигрыше +…» до чтения AsyncStorage. */
    const [rankedWagerUiReady, setRankedWagerUiReady] = useState(true);
    const [shardsBalanceUi, setShardsBalanceUi] = useState<number | null>(null);
    const [arenaFriends, setArenaFriends] = useState<FriendEntry[]>([]);
    const [incomingArenaInvites, setIncomingArenaInvites] = useState<ArenaInviteRow[]>([]);
    const [incomingArenaInviteBusyId, setIncomingArenaInviteBusyId] = useState<string | null>(null);
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
    const [throneTopVisible, setThroneTopVisible] = useState(false);
    const [throneTopLoading, setThroneTopLoading] = useState(false);
    const [throneTopEntries, setThroneTopEntries] = useState<ArenaHillTopEntry[]>([]);
    const [throneRewardShards, setThroneRewardShards] = useState(10);
    const [throneProfilePlayer, setThroneProfilePlayer] = useState<PlayerInfo | null>(null);
    const [myProfileInfo, setMyProfileInfo] = useState({
        name: defaultPlayerName,
        avatar: '',
        frame: '',
        aura: '',
        totalXP: 0,
        leagueId: undefined as number | undefined,
        streak: null as number | null,
    });
    const [arenaFeatureFlags, setArenaFeatureFlags] = useState<ArenaFeatureFlags>({ rankedWagerEnabled: false });
    const arenaRankedWagerEnabled = ENABLE_ARENA_RANKED_WAGER && arenaFeatureFlags.rankedWagerEnabled === true;
    const [lobbyAcceptDeadlineAt, setLobbyAcceptDeadlineAt] = useState<number | null>(null);
    const lobbyAcceptBarAnim = useRef(new Animated.Value(1)).current;
    const lobbyAcceptBarAnimRunRef = useRef<Animated.CompositeAnimation | null>(null);
    const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
    const bouncyStyle = useBouncyStyle(bouncyStretch);
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
                    if (tokenData.data) {
                        await updateQueueWithPushToken(tokenData.data);
                        // Дублируем токен в постоянный профиль users/{id}, чтобы серверные
                        // функции (подарок от друга, завершение матча) могли слать push —
                        // в очереди матчмейкинга токен живёт только во время поиска.
                        if (userId) await saveExpoPushTokenToUser(userId, tokenData.data);
                    }
                }
                catch {
                    emitAppEvent('action_toast', actionToastTri('info', {
                        ru: 'Уведомления не работают, но поиск матча идёт — всё ок.',
                        uk: 'Сповіщення недоступні. Пошук матчу працює без них.',
                        es: 'Las notificaciones no están disponibles. Puedes buscar partida sin ellas.',
                        'pt-BR': 'As notificações não estão disponíveis. Você ainda pode buscar uma partida.',
                        vi: 'Thông báo không khả dụng. Bạn vẫn có thể tìm trận đấu.',
                        id: 'Notifikasi tidak tersedia. Pencarian pertandingan tetap berjalan.',
                        tr: 'Bildirimler kullanılamıyor. Yine de maç arayabilirsin.',
                        pl: 'Powiadomienia są niedostępne. Nadal możesz szukać meczu.',
                    }));
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
        let cancelled = false;
        (async () => {
            const map = new Map(await AsyncStorage.multiGet([
                'user_name',
                'user_total_xp',
                'user_avatar',
                'user_frame',
                USER_AVATAR_AURA_KEY,
            ]));
            if (cancelled)
                return;
            setMyProfileInfo({
                name: (map.get('user_name') || '').trim() || defaultPlayerName,
                avatar: map.get('user_avatar') || '',
                frame: map.get('user_frame') || '',
                aura: map.get(USER_AVATAR_AURA_KEY) || '',
                totalXP: Math.max(0, parseInt(map.get('user_total_xp') || '0', 10) || 0),
                leagueId: undefined,
                streak: null,
            });
        })().catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [defaultPlayerName]);
    const fallbackThroneTop = useCallback((): ArenaHillTopEntry[] => {
        if (!hillThrone)
            return [];
        return [{
                place: 1,
                uid: hillThrone.championUid,
                name: hillThrone.championName,
                wins: hillThrone.score,
                totalXp: 0,
            }];
    }, [hillThrone]);
    const openThroneTop = useCallback(async () => {
        hapticTap();
        setThroneTopVisible(true);
        setThroneTopLoading(true);
        try {
            const top = await getTodayArenaHillTop();
            setThroneRewardShards(top.rewardShards || 10);
            setThroneTopEntries(top.entries.length > 0 ? top.entries : fallbackThroneTop());
        }
        catch {
            setThroneTopEntries(fallbackThroneTop());
        }
        finally {
            setThroneTopLoading(false);
        }
    }, [fallbackThroneTop]);
    const openThronePlayerProfile = useCallback((entry: ArenaHillTopEntry) => {
        hapticTap();
        setThroneTopVisible(false);
        const level = getLevelFromXP(entry.totalXp || 0);
        setThroneProfilePlayer({
            name: entry.name,
            points: entry.totalXp || 0,
            totalXp: entry.totalXp || 0,
            isMe: !!userId && entry.uid === userId,
            avatar: entry.avatar || String(getBestAvatarForLevel(level)),
            frame: entry.frame,
            aura: entry.aura,
            streak: null,
            leagueId: undefined,
            uid: entry.uid,
            friendUid: entry.uid,
            isPremium: entry.isPremium,
            isVip: entry.isVip,
            profileCardLevel: entry.profileCardLevel,
            profileCardTheme: entry.profileCardTheme,
            profileCardMotion: entry.profileCardMotion,
            profileCardPublicFocus: entry.profileCardPublicFocus,
        });
    }, [userId]);
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
        const task = InteractionManager.runAfterInteractions(() => {
            ensureArenaAuthUid().then((uid) => {
                if (uid) {
                    setUserId(uid);
                    if (autoSearch === '1')
                        void handleFindMatch(uid, { playAgain: true });
                }
            });
            ensureAnonUser().then((uid) => {
                if (uid)
                    setStableUserId(uid);
            }).catch(() => { });
            (async () => {
                setDailyCount(await getDailyArenaCount());
                setDailyMax(await getDailyArenaMaxToday());
            })();
        });
        return () => task.cancel();
    }, [autoSearch, playAgainTs, handleFindMatch]);
    useEffect(() => {
        if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED || !stableUserId) {
            setIncomingArenaInvites([]);
            return;
        }
        return subscribeIncomingArenaInvites(
            stableUserId,
            setIncomingArenaInvites,
            () => setIncomingArenaInvites([]),
        );
    }, [stableUserId]);
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
                    emitAppEvent('action_toast', actionToastTri('info', {
                        ru: 'Матч отменён (соперник отказался или вышел).',
                        uk: 'Матч скасовано (суперник відмовився або вийшов).',
                        es: 'Partida cancelada: tu rival rechazó o salió.',
                        'pt-BR': 'Partida cancelada: o rival recusou ou saiu.',
                        vi: 'Trận đấu đã hủy: đối thủ từ chối hoặc đã rời đi.',
                        id: 'Pertandingan dibatalkan: lawan menolak atau keluar.',
                        tr: 'Maç iptal edildi: rakip reddetti veya çıktı.',
                        pl: 'Mecz anulowany: rywal odmówił albo wyszedł.',
                    }));
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
                    emitAppEvent('action_toast', actionToastTri('error', {
                        ru: 'Матч не загрузился. Проверь соединение и попробуй снова.',
                        uk: 'Не вдалося підтвердити матч. Перевір мережу і спробуй знову.',
                        es: 'No se ha podido confirmar la partida. Revisa la conexión e inténtalo de nuevo.',
                        'pt-BR': 'Não foi possível confirmar a partida. Verifique a conexão e tente novamente.',
                        vi: 'Không thể xác nhận trận đấu. Kiểm tra kết nối rồi thử lại.',
                        id: 'Tidak dapat mengonfirmasi pertandingan. Periksa koneksi dan coba lagi.',
                        tr: 'Maç onaylanamadı. Bağlantını kontrol edip tekrar dene.',
                        pl: 'Nie udało się potwierdzić meczu. Sprawdź połączenie i spróbuj ponownie.',
                    }));
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
                    emitAppEvent('action_toast', actionToastTri('error', {
                        ru: 'Синхронизация выключена. Включи её — иначе друг не сможет зайти.',
                        uk: 'Хмара недоступна (синхронізація вимкнена). Друг не зможе зайти в кімнату.',
                        es: 'La nube no está disponible (sincronización desactivada). Tu amigo no podrá entrar en la sala.',
                        'pt-BR': 'A nuvem está indisponível (sincronização desligada). Seu amigo não poderá entrar na sala.',
                        vi: 'Đám mây không khả dụng (đồng bộ hóa đang tắt). Bạn của bạn sẽ không thể vào phòng.',
                        id: 'Cloud tidak tersedia (sinkronisasi mati). Temanmu tidak bisa masuk ke room.',
                        tr: 'Bulut kullanılamıyor (senkronizasyon kapalı). Arkadaşın odaya giremeyecek.',
                        pl: 'Chmura jest niedostępna (synchronizacja wyłączona). Znajomy nie będzie mógł wejść do pokoju.',
                    }));
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
                                emitAppEvent('action_toast', actionToastTri('error', {
                                    ru: 'Недостаточно энергии для старта матча.',
                                    uk: 'Недостатньо енергії для старту матчу.',
                                    es: 'No tienes suficiente energía para empezar la partida.',
                                    'pt-BR': 'Energia insuficiente para iniciar a partida.',
                                    vi: 'Không đủ năng lượng để bắt đầu trận đấu.',
                                    id: 'Energi tidak cukup untuk memulai pertandingan.',
                                    tr: 'Maçı başlatmak için yeterli enerji yok.',
                                    pl: 'Za mało energii, aby rozpocząć mecz.',
                                }));
                                return;
                            }
                            emitAppEvent('action_toast', actionToastTri('success', {
                                ru: 'Друг подключился. Начинаем матч!',
                                uk: 'Друг підключився. Починаємо матч!',
                                es: 'Tu amigo se ha unido. ¡Empezamos el duelo!',
                                'pt-BR': 'Seu amigo entrou. Vamos começar a partida!',
                                vi: 'Bạn của bạn đã tham gia. Bắt đầu trận đấu!',
                                id: 'Temanmu bergabung. Pertandingan dimulai!',
                                tr: 'Arkadaşın katıldı. Maçı başlatıyoruz!',
                                pl: 'Znajomy dołączył. Zaczynamy mecz!',
                            }));
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
                emitAppEvent('action_toast', actionToastTri('error', {
                    ru: 'Комната не создалась в облаке. Проверь сеть — если друг не заходит, пригласи ещё раз.',
                    uk: 'Не вдалося створити кімнату в хмарі. Перевірте мережу — якщо друг не заходить, запросіть ще раз.',
                    es: 'No se pudo crear la sala en la nube. Revisa la conexión: si tu amigo no puede entrar, vuelve a invitarlo.',
                    'pt-BR': 'Não foi possível criar a sala na nuvem. Verifique a conexão; se seu amigo não entrar, envie outro convite.',
                    vi: 'Không thể tạo phòng trên đám mây. Kiểm tra kết nối; nếu bạn của bạn không vào được, hãy mời lại.',
                    id: 'Tidak dapat membuat room di cloud. Periksa koneksi; jika temanmu tidak bisa masuk, undang lagi.',
                    tr: 'Bulutta oda oluşturulamadı. Bağlantını kontrol et; arkadaşın giremezse yeniden davet et.',
                    pl: 'Nie udało się utworzyć pokoju w chmurze. Sprawdź połączenie; jeśli znajomy nie wejdzie, zaproś ponownie.',
                }));
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
                vi: "Người chơi",
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
                        ru: effectiveOs === 'ios'
                            ? 'У друга нет активной сессии. Пусть откроет приложение или выберите его в списке ниже.'
                            : 'У друга нет активной сессии в облаке. Пусть откроет приложение и попробуйте ещё раз.',
                        uk: effectiveOs === 'ios'
                            ? 'У друга немає активної сесії. Нехай відкриє застосунок або обери його в списку нижче.'
                            : 'У друга немає активної сесії в хмарі. Нехай відкриє застосунок і спробуйте ще раз.',
                        es: effectiveOs === 'ios'
                            ? 'Tu amigo no tiene sesión activa. Pídele que abra la app o elígelo en la lista de abajo.'
                            : 'Tu amigo no tiene sesión en la nube. Pídele que abra la app e inténtalo otra vez.',
                        'pt-BR': effectiveOs === 'ios'
                            ? 'Seu amigo não tem sessão ativa. Peça para abrir o app ou escolha na lista abaixo.'
                            : 'Seu amigo não tem sessão na nuvem. Peça para abrir o app e tente outra vez.',
                        vi: effectiveOs === 'ios'
                            ? 'Bạn của bạn chưa có phiên hoạt động. Hãy nhờ họ mở ứng dụng hoặc chọn trong danh sách bên dưới.'
                            : 'Bạn của bạn chưa có phiên trên đám mây. Hãy nhờ họ mở ứng dụng rồi thử lại.',
                        id: effectiveOs === 'ios'
                            ? 'Temanmu tidak punya sesi aktif. Minta mereka membuka app atau pilih dari daftar di bawah.'
                            : 'Temanmu tidak punya sesi cloud. Minta mereka membuka app lalu coba lagi.',
                        tr: effectiveOs === 'ios'
                            ? 'Arkadaşının aktif oturumu yok. Uygulamayı açmasını iste veya aşağıdaki listeden seç.'
                            : 'Arkadaşının bulut oturumu yok. Uygulamayı açmasını iste ve tekrar dene.',
                        pl: effectiveOs === 'ios'
                            ? 'Znajomy nie ma aktywnej sesji. Poproś o otwarcie aplikacji albo wybierz go z listy poniżej.'
                            : 'Znajomy nie ma sesji w chmurze. Poproś o otwarcie aplikacji i spróbuj ponownie.',
                    }
                    : res.reason === 'not_friend'
                        ? {
                            ru: 'Этот пользователь не в списке друзей.',
                            uk: 'Цей користувач не у списку друзів.',
                            es: 'Este usuario no está en tu lista de amigos.',
                            'pt-BR': 'Este usuário não está na sua lista de amigos.',
                            vi: 'Người dùng này không có trong danh sách bạn bè của bạn.',
                            id: 'Pengguna ini tidak ada di daftar temanmu.',
                            tr: 'Bu kullanıcı arkadaş listende değil.',
                            pl: 'Tego użytkownika nie ma na liście znajomych.',
                        }
                        : {
                            ru: effectiveOs === 'ios'
                                ? 'Пригласить не получилось. Проверь сеть или выбери друга из списка ниже.'
                                : 'Пригласить не получилось. Проверь сеть и попробуй ещё раз.',
                            uk: effectiveOs === 'ios'
                                ? 'Не вдалося запросити. Перевір мережу або обери друга зі списку нижче.'
                                : 'Не вдалося запросити. Перевір мережу і спробуй ще раз.',
                            es: effectiveOs === 'ios'
                                ? 'No se pudo enviar la invitación. Revisa la conexión o elige a un amigo en la lista.'
                                : 'No se pudo enviar la invitación. Revisa la conexión e inténtalo otra vez.',
                            'pt-BR': effectiveOs === 'ios'
                                ? 'Não foi possível convidar. Verifique a conexão ou escolha um amigo na lista.'
                                : 'Não foi possível convidar. Verifique a conexão e tente novamente.',
                            vi: effectiveOs === 'ios'
                                ? 'Không thể gửi lời mời. Kiểm tra kết nối hoặc chọn một người bạn trong danh sách.'
                                : 'Không thể gửi lời mời. Kiểm tra kết nối rồi thử lại.',
                            id: effectiveOs === 'ios'
                                ? 'Tidak dapat mengundang. Periksa koneksi atau pilih teman dari daftar.'
                                : 'Tidak dapat mengundang. Periksa koneksi dan coba lagi.',
                            tr: effectiveOs === 'ios'
                                ? 'Davet gönderilemedi. Bağlantını kontrol et veya listeden bir arkadaş seç.'
                                : 'Davet gönderilemedi. Bağlantını kontrol edip tekrar dene.',
                            pl: effectiveOs === 'ios'
                                ? 'Nie udało się zaprosić. Sprawdź połączenie albo wybierz znajomego z listy.'
                                : 'Nie udało się zaprosić. Sprawdź połączenie i spróbuj ponownie.',
                        };
                emitAppEvent('action_toast', actionToastTri('error', msg));
                return;
            }
            emitAppEvent('action_toast', actionToastTri('success', {
                ru: 'Приглашение отправлено.',
                uk: 'Запрошення надіслано.',
                es: 'Invitación enviada.',
                'pt-BR': 'Convite enviado.',
                vi: 'Đã gửi lời mời.',
                id: 'Undangan terkirim.',
                tr: 'Davet gönderildi.',
                pl: 'Zaproszenie wysłane.',
            }));
            setArenaFriendPickUid(null);
            // Subscribe to invite status changes so we can notify sender when declined
            sentInviteUnsubRef.current?.();
            sentInviteUnsubRef.current = subscribeArenaInviteStatus(res.inviteId, (status) => {
                if (status === 'declined') {
                    sentInviteUnsubRef.current?.();
                    sentInviteUnsubRef.current = null;
                    const friendName = arenaFriendProfiles[friendStableUid]?.name;
                    emitAppEvent('action_toast', actionToastTri('info', {
                        ru: friendName
                            ? `${friendName} отклонил вызов.`
                            : 'Друг отклонил вызов.',
                        uk: friendName
                            ? `${friendName} відхилив виклик.`
                            : 'Друг відхилив виклик.',
                        es: friendName
                            ? `${friendName} rechazó el reto.`
                            : 'Tu amigo rechazó el reto.',
                        'pt-BR': friendName
                            ? `${friendName} recusou o desafio.`
                            : 'Seu amigo recusou o desafio.',
                        vi: friendName
                            ? `${friendName} đã từ chối lời thách đấu.`
                            : 'Bạn của bạn đã từ chối lời thách đấu.',
                        id: friendName
                            ? `${friendName} menolak tantangan.`
                            : 'Temanmu menolak tantangan.',
                        tr: friendName
                            ? `${friendName} meydan okumayı reddetti.`
                            : 'Arkadaşın meydan okumayı reddetti.',
                        pl: friendName
                            ? `${friendName} odrzucił wyzwanie.`
                            : 'Znajomy odrzucił wyzwanie.',
                    }));
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
    const handleIncomingArenaInviteAccept = useCallback(async (invite: ArenaInviteRow) => {
        hapticTap();
        if (!invite?.id || !invite.roomId || incomingArenaInviteBusyId)
            return;
        const access = await canStartArenaMatch({
            isUnlimited,
            availableEnergy: energy + bonusEnergy,
            countDaily: false,
        });
        if (!access.ok) {
            setNoEnergyModal(true);
            return;
        }
        setIncomingArenaInviteBusyId(invite.id);
        try {
            const res = await joinArenaFriendRoomAsGuest(invite.roomId, {
                defaultPlayerName,
                spendOne,
                isUnlimited,
            });
            if (!res.ok) {
                emitAppEvent('action_toast', actionToastTri('error', {
                    ru: 'Вызов не загрузился. Попроси друга отправить его снова.',
                    uk: 'Не вдалося прийняти виклик. Попроси друга надіслати його ще раз.',
                    es: 'No se pudo aceptar el reto. Pide a tu amigo que lo envíe de nuevo.',
                    'pt-BR': 'Não foi possível aceitar o desafio. Peça ao seu amigo para enviar novamente.',
                    vi: 'Không thể chấp nhận lời thách đấu. Hãy nhờ bạn gửi lại.',
                    id: 'Tidak dapat menerima tantangan. Minta temanmu mengirim ulang.',
                    tr: 'Meydan okuma kabul edilemedi. Arkadaşından tekrar göndermesini iste.',
                    pl: 'Nie udało się przyjąć wyzwania. Poproś znajomego o ponowne wysłanie.',
                }));
                return;
            }
            await setArenaInviteStatus(invite.id, 'accepted');
            setIncomingArenaInvites((items) => items.filter((item) => item.id !== invite.id));
            router.replace({ pathname: '/arena_game' as any, params: { sessionId: res.sessionId, userId: res.uid } });
        }
        finally {
            setIncomingArenaInviteBusyId(null);
        }
    }, [bonusEnergy, defaultPlayerName, energy, incomingArenaInviteBusyId, isUnlimited, router, spendOne]);
    const handleIncomingArenaInviteDecline = useCallback(async (invite: ArenaInviteRow) => {
        hapticTap();
        if (!invite?.id || incomingArenaInviteBusyId)
            return;
        setIncomingArenaInviteBusyId(invite.id);
        try {
            await setArenaInviteStatus(invite.id, 'declined');
            setIncomingArenaInvites((items) => items.filter((item) => item.id !== invite.id));
        }
        finally {
            setIncomingArenaInviteBusyId(null);
        }
    }, [incomingArenaInviteBusyId]);
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
    const incomingArenaInvite = incomingArenaInvites[0] ?? null;
    const incomingArenaInviteBusy = incomingArenaInviteBusyId != null;
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
            vi: `Nếu thắng, +${payout} mảnh.`,
            id: `Jika menang, +${payout} pecahan.`,
            tr: `Kazanırsan +${payout} parça.`,
            pl: `Jeśli wygrasz, +${payout} odłamków.`,
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
            vi: "Cược trận đấu",
            id: "Taruhan pertandingan",
            tr: "Maç bahsi",
            pl: "Stawka meczu",
        })}
          </Text>
          {shardsBalanceUi != null && (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Image source={oskolokImageForPackShards(Math.min(99, shardsBalanceUi))} style={{ width: 18, height: 18 }} contentFit="contain"/>
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
                  <Image source={oskolokImageForPackShards(st)} style={{ width: 20, height: 20, opacity: chipDisabled ? 0.7 : 1 }} contentFit="contain"/>
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
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                return require('@react-native-firebase/firestore').default();
            }
            catch {
                return null;
            }
        })();
        if (!db)
            return;
        let cancelled = false;
        void (async () => {
            await startFriendsTabSwrPrime();
            const results = await Promise.all(arenaFriends.map(async (f) => {
            try {
                const cachedProfile = peekProfilesCache()[f.uid]?.profile;
                if (cachedProfile) {
                    return {
                        uid: f.uid,
                        name: cachedProfile.name,
                        totalXp: cachedProfile.totalXp,
                        avatar: cachedProfile.avatar,
                        aura: cachedProfile.aura,
                    };
                }
                const snap = await db.collection('users').doc(f.uid).get();
                let data = snap.exists ? (snap.data() ?? {}) : {};
                const readNum = (value: unknown): number => typeof value === 'number'
                    ? Math.max(0, Math.floor(value))
                    : parseInt(String(value ?? '0'), 10) || 0;
                const readStr = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
                let totalXp = readNum(data.progress?.user_total_xp ?? data.progress?.totalXp ?? data.totalXp);
                let avatarRaw = readStr(data.progress?.user_avatar ?? data.avatar);
                let auraRaw = readStr(data.progress?.user_avatar_aura ?? data.aura);
                let name = readStr(data.displayName) || readStr(data.name) || readStr(data.progress?.displayName) || readStr(data.progress?.user_name);
                if (!name && totalXp <= 0 && !avatarRaw && !auraRaw) {
                    const leaderboardSnap = await db.collection('leaderboard').doc(f.uid).get();
                    if (leaderboardSnap.exists) {
                        data = leaderboardSnap.data() ?? {};
                        totalXp = readNum(data.points);
                        avatarRaw = readStr(data.avatar);
                        auraRaw = readStr(data.aura);
                        name = readStr(data.name) || readStr(data.displayName);
                    }
                }
                if (!name && totalXp <= 0 && !avatarRaw && !auraRaw) {
                    const arenaByStableSnap = await db.collection('arena_profiles').where('mirrorStableId', '==', f.uid).limit(1).get();
                    const arenaDoc = arenaByStableSnap.docs?.[0];
                    if (arenaDoc) {
                        data = arenaDoc.data() ?? {};
                        totalXp = readNum(data.courseTotalXp);
                        avatarRaw = readStr(data.courseAvatar);
                        auraRaw = readStr(data.courseAura);
                        name = readStr(data.displayName) || readStr(data.name);
                    }
                }
                return {
                    uid: f.uid,
                    name: (data.displayName as string) || (data.name as string) || (data.progress?.displayName as string) || (data.progress?.user_name as string) || 'Игрок',
                    totalXp,
                    avatar: avatarRaw || undefined,
                    aura: auraRaw || undefined,
                };
            }
            catch {
                return null;
            }
            }));
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
        })();
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
            vi: `Đang tìm trận: ${queueOthersCount}`,
            id: `Sedang mencari pertandingan: ${queueOthersCount}`,
            tr: `Şu an maç arayanlar: ${queueOthersCount}`,
            pl: `Szukają meczu: ${queueOthersCount}`,
        })}>
        <Ionicons name="people" size={18} color={t.accent}/>
        <Text style={[styles.queueActivityBadgeText, { color: t.textPrimary }]}>
          {triLang(lang, {
            uk: 'Шукають матч: ',
            ru: 'Ищут матч: ',
            es: 'Buscan partida: ',
            'pt-BR': "Procurando partida: ",
            vi: "Đang tìm trận: ",
            id: "Mencari pertandingan: ",
            tr: "Maç arayanlar: ",
            pl: "Szukają meczu: ",
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
    const arenaTicketIconSource = ARENA_TICKET_ICONS[themeMode] ?? ARENA_TICKET_ICONS.dark;
    const arenaMatchIconSource = arenaActionIconSource('match', themeMode);
    const arenaFriendIconSource = arenaActionIconSource('friend', themeMode);
    const arenaThroneIconSource = arenaActionIconSource('throne', themeMode);
    const arenaActionLogoChrome = useMemo(() => {
        const dark = {
            match: { bg: 'rgba(8,42,30,0.72)', border: 'rgba(57,242,122,0.58)', shadow: '#39F27A' },
            friend: { bg: 'rgba(10,38,36,0.72)', border: 'rgba(91,226,205,0.46)', shadow: '#5BE2CD' },
            throne: { bg: 'rgba(54,43,14,0.72)', border: 'rgba(245,217,122,0.48)', shadow: '#F5D97A' },
        };
        const neon = {
            match: { bg: 'rgba(8,34,38,0.78)', border: 'rgba(182,255,0,0.72)', shadow: '#B6FF00' },
            friend: { bg: 'rgba(38,8,62,0.78)', border: 'rgba(217,70,239,0.64)', shadow: '#D946EF' },
            throne: { bg: 'rgba(44,18,65,0.78)', border: 'rgba(255,202,40,0.62)', shadow: '#FFCA28' },
        };
        const gold = {
            match: { bg: 'rgba(24,19,9,0.82)', border: GOLD_RICH.hairlineStrong, shadow: GOLD_RICH.champagne },
            friend: { bg: 'rgba(35,22,18,0.82)', border: 'rgba(244,196,154,0.56)', shadow: '#F4C49A' },
            throne: { bg: 'rgba(38,26,8,0.86)', border: 'rgba(255,214,122,0.70)', shadow: '#FFD67A' },
        };
        const coral = {
            match: { bg: 'rgba(58,25,18,0.76)', border: 'rgba(255,112,88,0.66)', shadow: '#FF7058' },
            friend: { bg: 'rgba(58,21,40,0.76)', border: 'rgba(255,145,170,0.62)', shadow: '#FF91AA' },
            throne: { bg: 'rgba(63,24,22,0.80)', border: 'rgba(255,184,77,0.62)', shadow: '#FFB84D' },
        };
        const minimalLight = {
            match: { bg: 'rgba(255,252,246,0.92)', border: 'rgba(86,96,86,0.42)', shadow: '#7C8A7E' },
            friend: { bg: 'rgba(255,252,246,0.92)', border: 'rgba(117,112,147,0.40)', shadow: '#757093' },
            throne: { bg: 'rgba(255,252,246,0.94)', border: 'rgba(185,137,37,0.44)', shadow: '#B98925' },
        };
        const minimalDark = {
            match: { bg: 'rgba(14,18,23,0.86)', border: 'rgba(116,168,214,0.42)', shadow: '#74A8D6' },
            friend: { bg: 'rgba(16,18,25,0.86)', border: 'rgba(133,151,196,0.42)', shadow: '#8597C4' },
            throne: { bg: 'rgba(20,19,17,0.88)', border: 'rgba(179,149,91,0.44)', shadow: '#B3955B' },
        };
        const compass = {
            match: { bg: 'rgba(10,30,28,0.86)', border: 'rgba(242,196,141,0.44)', shadow: '#F2C48D' },
            friend: { bg: 'rgba(8,24,23,0.86)', border: 'rgba(242,196,141,0.34)', shadow: '#8FEFE1' },
            throne: { bg: 'rgba(18,16,10,0.88)', border: 'rgba(242,196,141,0.32)', shadow: '#F2C48D' },
        };
        const byTheme = { dark, neon, gold, coral, minimalLight, minimalDark, compass } as const;
        return byTheme[themeMode] ?? dark;
    }, [themeMode]);
    const arenaGlass = useMemo(() => {
        const light = themeMode === 'minimalLight';
        const neon = themeMode === 'neon';
        const gold = themeMode === 'gold';
        const compass = themeMode === 'compass';
        const accent = t.accent;
        const warm = compass ? '#F2C48D' : gold || light ? '#B98925' : '#F5D97A';
        const ctaBase = gold ? t.textSecond : light ? '#3B4A6B' : t.accent;
        return {
            cardColors: light
                ? ['rgba(255,252,246,0.78)', 'rgba(239,232,219,0.56)', 'rgba(223,211,191,0.36)']
                : gold
                    ? GOLD_GRADIENTS.premiumPanel
                    : compass
                        ? ['rgba(17,16,13,0.96)', 'rgba(9,8,7,0.96)', 'rgba(3,3,4,0.98)']
                    :
                        [
                            alphaColor(t.bgSurface, 0.58, '255,255,255'),
                            alphaColor(t.bgCard, 0.42, '255,255,255'),
                            'rgba(255,255,255,0.055)',
                        ],
            cardBorder: gold ? GOLD_RICH.hairlineStrong : compass ? 'rgba(242,196,141,0.42)' : light ? 'rgba(52,45,35,0.28)' : alphaColor(accent, 0.24),
            cardHighlight: gold ? GOLD_RICH.edgeLight : compass ? 'rgba(255,230,181,0.20)' : light ? 'rgba(255,252,246,0.70)' : 'rgba(255,255,255,0.14)',
            innerBg: gold ? GOLD_RICH.bronzeWash : compass ? 'rgba(10,9,8,0.76)' : light ? 'rgba(255,252,246,0.48)' : 'rgba(255,255,255,0.07)',
            innerBgSoft: gold ? GOLD_RICH.wash : compass ? 'rgba(8,7,6,0.68)' : light ? 'rgba(63,55,44,0.10)' : 'rgba(255,255,255,0.045)',
            innerBorder: gold ? GOLD_RICH.hairline : compass ? 'rgba(242,196,141,0.24)' : light ? 'rgba(52,45,35,0.24)' : alphaColor(accent, 0.18),
            accent: accent,
            accentSoft: alphaColor(accent, light ? 0.10 : 0.15),
            solidAccent: accent,
            live: light ? '#2E9E62' : '#58E58B',
            liveText: light ? '#1F7A45' : '#BDF9D0',
            liveBg: light ? 'rgba(46,158,98,0.10)' : 'rgba(88,229,139,0.11)',
            liveBorder: light ? 'rgba(46,158,98,0.22)' : 'rgba(88,229,139,0.28)',
            warm,
            warmBg: alphaColor(warm, compass ? 0.12 : light ? 0.10 : 0.14, '245,217,122'),
            warmBorder: alphaColor(warm, compass ? 0.34 : light ? 0.20 : 0.28, '245,217,122'),
            ctaColors: gold ? GOLD_GRADIENTS.primaryButton : [alphaColor(ctaBase, 0.95), alphaColor(ctaBase, 0.78), alphaColor(ctaBase, 0.62)],
            ctaText: t.correctText,
            ctaSubText: alphaColor(t.correctText, 0.66, '7,17,31'),
            ctaIcon: t.correctText,
            ctaIconBg: alphaColor(t.correctText, 0.12, '7,17,31'),
            ctaBorder: 'transparent',
            ctaBorderWidth: 0,
            heroOpacity: light ? 0.15 : gold ? 0.42 : compass ? 0.22 : neon ? 0.26 : 0.32,
            heroScrimColors: light
                ? ['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.46)', 'rgba(255,255,255,0.74)']
                : gold
                    ? ['rgba(0,0,0,0.18)', 'rgba(3,3,3,0.16)', 'rgba(0,0,0,0.74)']
                    : compass
                        ? ['rgba(2,3,4,0.54)', 'rgba(2,3,4,0.68)', 'rgba(0,0,0,0.88)']
                    : ['rgba(0,0,0,0.16)', 'rgba(0,0,0,0.24)', 'rgba(0,0,0,0.72)'],
        };
    }, [t, themeMode]);
    const arenaHeroOpacity = arenaHeroEntrance.interpolate({
        inputRange: [0, 1],
        outputRange: [0, arenaGlass.heroOpacity],
    });
    const arenaHeroScale = arenaHeroEntrance.interpolate({
        inputRange: [0, 1],
        outputRange: [ARENA_STAGE_BACKDROP_SCALE + 0.08, ARENA_STAGE_BACKDROP_SCALE],
    });
    const arenaHeroTranslateY = arenaHeroEntrance.interpolate({
        inputRange: [0, 1],
        outputRange: [8, 0],
    });
    const arenaBackdropSource = ARENA_STAGE_BACKDROPS[themeMode] ?? ARENA_STAGE_BACKDROPS.dark;
    const { layers: arenaBackdropLayers } = usePersistentBackgroundLayers({
        value: arenaBackdropSource,
        transitionKey: `${themeMode}:${backgroundTransitionKey(arenaBackdropSource)}`,
        fadeInDuration: ARENA_HERO_BACKGROUND_FADE_MS,
        fadeOutDuration: ARENA_HERO_BACKGROUND_FADE_MS,
        fadeOutDelay: ARENA_HERO_BACKGROUND_FADE_OUT_DELAY_MS,
        maxLayers: 1,
    });
    return (<ScreenGradient>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}
    /* В режиме таба верхний inset уже даёт (tabs)/_layout (paddingTop: insets.top). */
    edges={isTab ? [] : ['top', 'bottom']}>
      {/* Шапка */}
      <View style={styles.header}>
        <TapScale testID="arena-header-back" accessibilityLabel="qa-arena-header-back" accessible onPress={() => {
            hapticTap();
            if (isTab) {
                goHome();
            }
            else {
                safeRouterBack(router, '/(tabs)/home' as any);
            }
        }} style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.075)', borderColor: 'rgba(255,255,255,0.14)' }]}>
          <Ionicons name="chevron-back" size={20} color={t.textPrimary}/>
        </TapScale>
        <View style={styles.titleWrap}>
          <Text testID="screen-arena-lobby" accessibilityLabel="qa-screen-arena-lobby" style={[styles.titleText, { color: screenTitleColor, fontSize: f.h2 + 5 }]} adjustsFontSizeToFit minimumFontScale={0.75}>
            {triLang(lang, {
            ru: 'Арена',
            uk: 'Арена',
            es: 'Arena',
            'pt-BR': "Arena",
            vi: "Đấu trường",
            id: "Arena",
            tr: "Arena",
            pl: "Arena",
        })}
          </Text>
          <TouchableOpacity testID="arena-rating-button" onPress={() => { hapticTap(); router.push('/arena_rating' as any); }} style={styles.headerRankLine} activeOpacity={0.78}>
            {myRank.isHydrated ? (<Image source={myRank.image} style={styles.headerRankIcon} contentFit="contain"/>) : (<Ionicons name="shield-outline" size={16} color={screenMuted} style={styles.headerRankIcon}/>)}
            <Text style={[styles.headerRankText, { color: screenMuted, fontSize: f.caption }]}>
              {myRank.isHydrated ? myRank.labelShort : '—'}
            </Text>
            <Text style={[styles.headerRankMode, { color: screenMuted, fontSize: f.caption }]}>
              · {triLang(lang, {
            ru: 'рейтинг',
            uk: 'рейтинг',
            es: 'ranked',
            'pt-BR': "ranqueado",
            vi: "xếp hạng",
            id: "peringkat",
            tr: "sıralamalı",
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
            vi: `Vé đấu trường: ${arenaTicketsText}`,
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
            <Image
              source={arenaTicketIconSource}
              contentFit="contain"
              style={[
                styles.arenaTicketIcon,
                { opacity: !isUnlimited && arenaTicketsLeft <= 0 ? 0.72 : 1 },
              ]}
            />
            <Text style={[styles.arenaTicketText, { color: arenaTicketsColor, fontSize: f.label }]}>
              {arenaTicketsText}
            </Text>
          </View>
        </View>
      </View>

      <BouncyWrap style={bouncyStyle}>
      <ScrollView decelerationRate="normal" style={styles.bodyScroll} contentContainerStyle={styles.bodyScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} nestedScrollEnabled onScroll={onBouncyScroll} scrollEventThrottle={16}>
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
                vi: "Đang tìm đối thủ",
                id: "Mencari lawan",
                tr: "Rakip aranıyor",
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
                vi: `Trong hàng chờ: ${formatElapsed(displayElapsed)}`,
                id: `Dalam antrean: ${formatElapsed(displayElapsed)}`,
                tr: `Sırada: ${formatElapsed(displayElapsed)}`,
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
                    vi: "Đã tìm thấy đối thủ!",
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
                    vi: "CHẤP NHẬN",
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
                    vi: "Từ chối",
                    id: "Tolak",
                    tr: "Reddet",
                    pl: "Odrzuć",
                })
                : triLang(lang, {
                    uk: 'Скасувати',
                    ru: 'Отмена',
                    es: 'Cancelar',
                    'pt-BR': "Cancelar",
                    vi: "Hủy",
                    id: "Batal",
                    tr: "İptal",
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
                    vi: "Từ chối",
                    id: "Tolak",
                    tr: "Reddet",
                    pl: "Odrzuć",
                })
                : triLang(lang, {
                    uk: 'Скасувати',
                    ru: 'Отмена',
                    es: 'Cancelar',
                    'pt-BR': "Cancelar",
                    vi: "Hủy",
                    id: "Batal",
                    tr: "İptal",
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
                {arenaBackdropLayers.map(layer => (FABRIC_BACKGROUND_TRANSITIONS_ENABLED ? (<Animated.View key={`card-hero-${layer.id}`} pointerEvents="none" style={[styles.arenaHeroImage, { opacity: layer.opacity }]}>
                  <AnimatedImage source={layer.value as any} contentFit="cover" style={[
                      styles.arenaHeroImage,
                      {
                          opacity: arenaHeroOpacity,
                          transform: [
                              { scale: arenaHeroScale },
                              { translateX: ARENA_STAGE_BACKDROP_SHIFT_X },
                              { translateY: arenaHeroTranslateY },
                          ],
                      },
                  ]}/>
                </Animated.View>) : (<Image key={`card-hero-${layer.id}`} source={layer.value as any} contentFit="cover" fadeDuration={0} style={[
                    styles.arenaHeroImage,
                    {
                        opacity: arenaGlass.heroOpacity,
                        transform: [
                            { scale: ARENA_STAGE_BACKDROP_SCALE },
                            { translateX: ARENA_STAGE_BACKDROP_SHIFT_X },
                        ],
                    },
                ]}/>)))}
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
                ru: `${idleQueueHintCount} в поиске`,
                uk: `${idleQueueHintCount} у пошуку`,
                es: `${idleQueueHintCount} buscando`,
                'pt-BR': `${idleQueueHintCount} procurando`,
                vi: `${idleQueueHintCount} đang tìm`,
                id: `${idleQueueHintCount} mencari`,
                tr: `${idleQueueHintCount} arıyor`,
                pl: `${idleQueueHintCount} szuka`,
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
                vi: "Chọn định dạng trận đấu",
                id: "Pilih format pertandingan",
                tr: "Maç formatını seç",
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
                    <Image
                      source={arenaMatchIconSource}
                      contentFit="contain"
                      style={styles.arenaLaunchActionIcon}
                    />
                    <View style={styles.arenaLaunchTextWrap}>
                      <Text style={[styles.arenaLaunchTitle, { color: arenaGlass.ctaText, fontSize: f.h2 + 3 }]}>
                        {triLang(lang, {
                ru: 'Найти матч',
                uk: 'Знайти матч',
                es: 'Buscar partida',
                'pt-BR': "Encontrar partida",
                vi: "Tìm trận",
                id: "Cari pertandingan",
                tr: "Maç bul",
                pl: "Znajdź mecz",
            })}
                      </Text>
                      <Text style={[styles.arenaLaunchSub, { color: arenaGlass.ctaSubText, fontSize: f.caption }]}>
                        {triLang(lang, {
                ru: 'подбор соперника',
                uk: 'підбір суперника',
                es: 'matchmaking',
                'pt-BR': "pareamento",
                vi: "ghép trận",
                id: "matchmaking",
                tr: "eşleştirme",
                pl: "dobieranie rywala",
            })}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={34} color={arenaGlass.ctaIcon}/>
                  </LinearGradient>
                </TouchableOpacity>

                {!isUnlimited ? (<View style={styles.arenaCostRow}>
                      <View style={[styles.arenaCostChip, { backgroundColor: arenaGlass.innerBg, borderColor: arenaGlass.innerBorder }]}>
                        <Ionicons name="flash" size={14} color={arenaGlass.warm}/>
                        <Text style={[styles.arenaCostText, { color: screenMuted, fontSize: f.caption }]}>
                          {triLang(lang, {
                    ru: '1 энергия',
                    uk: '1 енергія',
                    es: '1 energía',
                    'pt-BR': "1 energia",
                    vi: "1 năng lượng",
                    id: "1 energi",
                    tr: "1 enerji",
                    pl: "1 energia",
                })}
                        </Text>
                      </View>
                      <View style={[styles.arenaCostChip, { backgroundColor: `${arenaTicketsColor}12`, borderColor: `${arenaTicketsColor}33` }]}>
                        <Image
                          source={arenaTicketIconSource}
                          contentFit="contain"
                          style={[
                            styles.arenaCostTicketIcon,
                            { opacity: arenaTicketsLeft <= 0 ? 0.72 : 1 },
                          ]}
                        />
                        <Text style={[styles.arenaCostText, { color: screenMuted, fontSize: f.caption }]}>
                          {triLang(lang, {
                    ru: '1 билет',
                    uk: '1 квиток',
                    es: '1 entrada',
                    'pt-BR': "1 ingresso",
                    vi: "1 vé",
                    id: "1 tiket",
                    tr: "1 bilet",
                    pl: "1 bilet",
                })}
                        </Text>
                      </View>
                </View>) : null}

                {incomingArenaInvite ? (<View testID="arena-incoming-invite" style={[styles.arenaIncomingInviteCard, { borderColor: arenaGlass.innerBorder, backgroundColor: arenaGlass.innerBgSoft }]}>
                  <View style={[styles.arenaIncomingInviteIcon, { backgroundColor: arenaGlass.accentSoft }]}>
                    <Ionicons name="mail-unread" size={18} color={arenaGlass.accent}/>
                  </View>
                  <View style={styles.arenaIncomingInviteCopy}>
                    <Text style={[styles.arenaIncomingInviteTitle, { color: screenTitleColor, fontSize: f.sub }]}>
                      {triLang(lang, {
                ru: `${incomingArenaInvite.fromName || 'Друг'} вызывает на арену`,
                uk: `${incomingArenaInvite.fromName || 'Друг'} викликає на арену`,
                es: `${incomingArenaInvite.fromName || 'Un amigo'} te reta`,
                'pt-BR': `${incomingArenaInvite.fromName || 'Um amigo'} te desafiou`,
                vi: `${incomingArenaInvite.fromName || 'Bạn bè'} thách đấu bạn`,
                id: `${incomingArenaInvite.fromName || 'Teman'} menantangmu`,
                tr: `${incomingArenaInvite.fromName || 'Arkadaşın'} meydan okuyor`,
                pl: `${incomingArenaInvite.fromName || 'Znajomy'} rzuca wyzwanie`,
            })}
                    </Text>
                    <View style={styles.arenaIncomingInviteActions}>
                      <TouchableOpacity testID="arena-incoming-invite-accept" accessibilityLabel="qa-arena-incoming-invite-accept" accessibilityRole="button" accessibilityState={{ disabled: incomingArenaInviteBusy, busy: incomingArenaInviteBusy }} disabled={incomingArenaInviteBusy} activeOpacity={0.86} onPress={() => void handleIncomingArenaInviteAccept(incomingArenaInvite)} style={[styles.arenaIncomingInviteButton, { backgroundColor: arenaGlass.solidAccent, opacity: incomingArenaInviteBusy ? 0.58 : 1 }]}>
                        <Ionicons name="checkmark" size={17} color={t.correctText}/>
                        <Text style={[styles.arenaIncomingInviteButtonText, { color: t.correctText, fontSize: f.caption }]}>
                          {triLang(lang, {
                    ru: 'Принять',
                    uk: 'Прийняти',
                    es: 'Aceptar',
                    'pt-BR': 'Aceitar',
                    vi: 'Chấp nhận',
                    id: 'Terima',
                    tr: 'Kabul et',
                    pl: 'Przyjmij',
                })}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity testID="arena-incoming-invite-decline" accessibilityLabel="qa-arena-incoming-invite-decline" accessibilityRole="button" accessibilityState={{ disabled: incomingArenaInviteBusy }} disabled={incomingArenaInviteBusy} activeOpacity={0.78} onPress={() => void handleIncomingArenaInviteDecline(incomingArenaInvite)} style={[styles.arenaIncomingInviteButton, styles.arenaIncomingInviteDecline, { borderColor: arenaGlass.innerBorder, opacity: incomingArenaInviteBusy ? 0.58 : 1 }]}>
                        <Ionicons name="close" size={17} color={screenMuted}/>
                        <Text style={[styles.arenaIncomingInviteButtonText, { color: screenMuted, fontSize: f.caption }]}>
                          {triLang(lang, {
                    ru: 'Отклонить',
                    uk: 'Відхилити',
                    es: 'Rechazar',
                    'pt-BR': 'Recusar',
                    vi: 'Từ chối',
                    id: 'Tolak',
                    tr: 'Reddet',
                    pl: 'Odrzuć',
                })}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>) : null}

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
                    <View style={[styles.arenaCommandIcon, {
                        backgroundColor: 'transparent',
                        borderColor: 'transparent',
                        shadowColor: arenaActionLogoChrome.friend.shadow,
                    }]}>
                      <Image
                        source={arenaFriendIconSource}
                        contentFit="contain"
                        style={styles.arenaCommandActionIcon}
                      />
                    </View>
                    <View style={styles.arenaCommandCopy}>
                      <Text style={[styles.arenaCommandTitle, { color: screenTitleColor, fontSize: f.sub }]}>
                        {triLang(lang, {
                ru: 'Вызов другу',
                uk: 'Виклик другу',
                es: 'Reto a un amigo',
                'pt-BR': "Desafio a amigo",
                vi: "Thách đấu bạn bè",
                id: "Tantang teman",
                tr: "Arkadaşa meydan oku",
                pl: "Wyzwanie dla znajomego",
            })}
                      </Text>
                      <Text style={[styles.arenaCommandSub, { color: screenMuted, fontSize: f.caption }]}>
                        {triLang(lang, {
                ru: 'Матч по приглашению',
                uk: 'Матч за запрошенням',
                es: 'Partida privada por invitación',
                'pt-BR': "Partida privada por convite",
                vi: "Phiên chơi riêng qua lời mời",
                id: "Pertandingan pribadi lewat undangan",
                tr: "Davetli özel maç",
                pl: "Prywatny mecz z zaproszenia",
            })}
                      </Text>
                    </View>
                    <Ionicons name={friendRoomId ? 'chevron-up' : 'chevron-down'} size={18} color={screenMuted}/>
                  </TouchableOpacity>

                  {friendRoomId && (<View testID="arena-friend-panel" style={[styles.arenaFriendsPanel, { borderColor: arenaGlass.innerBorder, backgroundColor: arenaGlass.innerBgSoft }]}>
                      {arenaFriends.length > 0 ? (<>
                          <ScrollView testID="arena-friends-scroll" decelerationRate="normal" horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.arenaFriendsScrollContent}>
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
                                vi: "Đấu trường",
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
                                    vi: "Đang gửi",
                                    id: "Mengirim",
                                    tr: "Gönderiliyor",
                                    pl: "Wysyłanie",
                                })
                                : triLang(lang, {
                                    ru: 'Бросить вызов',
                                    uk: 'Кинути виклик',
                                    es: 'Lanzar reto',
                                    'pt-BR': "Lançar desafio",
                                    vi: "Gửi thách đấu",
                                    id: "Kirim tantangan",
                                    tr: "Meydan oku",
                                    pl: "Rzuć wyzwanie",
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
                        'pt-BR': "Ainda não há amigos para desafiar.",
                        vi: "Chưa có bạn bè để thách đấu.",
                        id: "Belum ada teman untuk ditantang.",
                        tr: "Meydan okuyacak arkadaş yok.",
                        pl: "Nie masz jeszcze znajomych do wyzwania.",
                    })}
                          </Text>
                        </View>)}
                    </View>)}

                  <TouchableOpacity testID="arena-throne-info" accessible accessibilityRole="button" accessibilityLabel={triLang(lang, {
                ru: 'Трон дня. Открыть топ игроков за день',
                uk: 'Трон дня. Відкрити топ гравців за день',
                es: 'Trono del día. Abrir el top de jugadores del día',
                'pt-BR': 'Trono do dia. Abrir o top de jogadores do dia',
                vi: 'Ngai vàng hôm nay. Mở top người chơi trong ngày',
                id: 'Takhta hari ini. Buka pemain terbaik hari ini',
                tr: 'Günün tahtı. Günün en iyi oyuncularını aç',
                pl: 'Tron dnia. Otwórz top graczy dnia',
            })} onPress={openThroneTop} activeOpacity={0.78} style={[styles.arenaInfoRow, { borderColor: arenaGlass.innerBorder, backgroundColor: arenaGlass.innerBgSoft }]}>
                    <View style={[styles.arenaCommandIcon, {
                        backgroundColor: 'transparent',
                        borderColor: 'transparent',
                        shadowColor: arenaActionLogoChrome.throne.shadow,
                    }]}>
                      <Image
                        source={arenaThroneIconSource}
                        contentFit="contain"
                        style={styles.arenaCommandActionIcon}
                      />
                    </View>
                    <View style={styles.arenaCommandCopy}>
                      <Text style={[styles.arenaCommandTitle, { color: screenTitleColor, fontSize: f.sub }]}>
                        {hillThrone
                ? triLang(lang, {
                    ru: 'Трон дня',
                    uk: 'Трон дня',
                    es: 'Trono del día',
                    'pt-BR': "Trono do dia",
                    vi: "Ngai vàng hôm nay",
                    id: "Takhta hari ini",
                    tr: "Günün tahtı",
                    pl: "Tron dnia",
                })
                : triLang(lang, {
                    ru: 'Трон свободен',
                    uk: 'Трон вільний',
                    es: 'Trono libre',
                    'pt-BR': "Trono livre",
                    vi: "Ngai vàng còn trống",
                    id: "Takhta kosong",
                    tr: "Taht boş",
                    pl: "Tron wolny",
                })}
                      </Text>
                      <Text style={[styles.arenaCommandSub, { color: screenMuted, fontSize: f.caption }]}>
                        {hillThrone
                ? triLang(lang, {
                    ru: `${hillThrone.championName} · ${hillThrone.score} побед`,
                    uk: `${hillThrone.championName} · ${hillThrone.score} перемог`,
                    es: `${hillThrone.championName} · ${hillThrone.score} victorias`,
                    'pt-BR': `${hillThrone.championName} · ${hillThrone.score} vitórias`,
                    vi: `${hillThrone.championName} · ${hillThrone.score} trận thắng`,
                    id: `${hillThrone.championName} · ${hillThrone.score} kemenangan`,
                    tr: `${hillThrone.championName} · ${hillThrone.score} galibiyet`,
                    pl: `${hillThrone.championName} · ${hillThrone.score} zwycięstw`,
                })
                : triLang(lang, {
                    ru: 'Пока никто не занял трон',
                    uk: 'Поки ніхто не зайняв трон',
                    es: 'Nadie ocupa el trono aún',
                    'pt-BR': "Ninguém ocupou o trono ainda",
                    vi: "Chưa ai chiếm ngai vàng",
                    id: "Belum ada yang menduduki takhta",
                    tr: "Tahtı henüz kimse almadı",
                    pl: "Nikt jeszcze nie zajął tronu",
                })}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={screenMuted}/>
                  </TouchableOpacity>
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
            vi: "Sảnh đấu trường",
            id: "Lobi arena",
            tr: "Arena lobisi",
            pl: "Lobby areny",
        })}/>
        </View>
      </ScrollView>
      </BouncyWrap>
      </SafeAreaView>

      <Modal visible={throneTopVisible} transparent animationType="fade" onRequestClose={() => setThroneTopVisible(false)}>
        <View style={styles.throneModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setThroneTopVisible(false)}/>
          <View style={[
            styles.throneModalCard,
            {
                borderColor: arenaGlass.warmBorder,
                backgroundColor: themeMode === 'minimalLight' ? 'rgba(255,252,246,0.98)' : 'rgba(13,14,18,0.98)',
                shadowColor: arenaGlass.warm,
            },
        ]}>
            <View style={styles.throneModalHeader}>
              <View style={[styles.throneModalIcon, { backgroundColor: arenaGlass.warmBg, borderColor: arenaGlass.warmBorder }]}>
                <Image source={arenaThroneIconSource} contentFit="contain" style={styles.throneModalIconImage}/>
              </View>
              <View style={styles.throneModalTitleWrap}>
                <Text style={[styles.throneModalTitle, { color: screenTitleColor, fontSize: f.h2 }]}>
                  {triLang(lang, {
                ru: 'Трон дня',
                uk: 'Трон дня',
                es: 'Trono del día',
                'pt-BR': 'Trono do dia',
                vi: 'Ngai vàng hôm nay',
                id: 'Takhta hari ini',
                tr: 'Günün tahtı',
                pl: 'Tron dnia',
            })}
                </Text>
                <Text style={[styles.throneModalSub, { color: screenMuted, fontSize: f.caption }]}>
                  {triLang(lang, {
                ru: 'Текущий чемпион за сегодня',
                uk: 'Поточний чемпіон за сьогодні',
                es: 'El campeón actual de hoy',
                'pt-BR': 'O campeão atual de hoje',
                vi: 'Nhà vô địch hiện tại hôm nay',
                id: 'Juara saat ini hari ini',
                tr: 'Bugünün mevcut şampiyonu',
                pl: 'Aktualny mistrz dnia',
            })}
                </Text>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => {
            hapticTap();
            setThroneTopVisible(false);
        }} style={styles.throneModalClose} activeOpacity={0.76}>
                <Ionicons name="close" size={20} color={screenMuted}/>
              </TouchableOpacity>
            </View>

            <View style={[styles.throneRewardInfo, { borderColor: arenaGlass.warmBorder, backgroundColor: arenaGlass.warmBg }]}>
              <Ionicons name="diamond" size={18} color={arenaGlass.warm}/>
              <Text style={[styles.throneRewardText, { color: screenTitleColor, fontSize: f.caption }]}>
                {triLang(lang, {
                ru: `Останешься на троне до полуночи — заберёшь ${throneRewardShards} осколков.`,
                uk: `Залишишся на троні до півночі — забереш ${throneRewardShards} осколків.`,
                es: `Quédate en el trono hasta medianoche y llévate ${throneRewardShards} fragmentos.`,
                'pt-BR': `Fique no trono até meia-noite e leve ${throneRewardShards} fragmentos.`,
                vi: `Giữ ngai đến nửa đêm để nhận ${throneRewardShards} mảnh.`,
                id: `Bertahan di takhta sampai tengah malam untuk membawa pulang ${throneRewardShards} pecahan.`,
                tr: `Gece yarısına kadar tahtta kal, ${throneRewardShards} parça senin olsun.`,
                pl: `Zostań na tronie do północy i zgarnij ${throneRewardShards} odłamków.`,
            })}
              </Text>
            </View>

            <View style={styles.throneTopList}>
              {throneTopLoading ? (
                <View style={[styles.throneTopEmpty, { borderColor: arenaGlass.innerBorder, backgroundColor: arenaGlass.innerBgSoft }]}>
                  <Text style={[styles.throneTopEmptyText, { color: screenMuted, fontSize: f.caption }]}>
                    {triLang(lang, {
                ru: 'Загружаем топ...',
                uk: 'Завантажуємо топ...',
                es: 'Cargando top...',
                'pt-BR': 'Carregando top...',
                vi: 'Đang tải top...',
                id: 'Memuat top...',
                tr: 'Top yükleniyor...',
                pl: 'Wczytywanie topu...',
            })}
                  </Text>
                </View>
              ) : throneTopEntries.length > 0 ? throneTopEntries.map((entry) => {
                const level = getLevelFromXP(entry.totalXp || 0);
                const avatar = entry.avatar || String(getBestAvatarForLevel(level));
                const medalColor = entry.place === 1 ? '#FACC15' : entry.place === 2 ? '#D6DEE8' : '#D69E65';
                return (
                  <TouchableOpacity key={`${entry.place}-${entry.uid}`} accessibilityRole="button" onPress={() => openThronePlayerProfile(entry)} activeOpacity={0.78} style={[styles.throneTopRow, { borderColor: arenaGlass.innerBorder, backgroundColor: arenaGlass.innerBgSoft }]}>
                    <View style={[styles.throneTopPlace, { borderColor: `${medalColor}88`, backgroundColor: `${medalColor}1F` }]}>
                      <Text style={[styles.throneTopPlaceText, { color: medalColor }]}>{entry.place}</Text>
                    </View>
                    <AvatarView avatar={avatar} size={44} auraId={entry.aura}/>
                    <View style={styles.throneTopCopy}>
                      <Text style={[styles.throneTopName, { color: screenTitleColor, fontSize: f.sub }]} numberOfLines={1}>
                        {entry.name}
                      </Text>
                      <Text style={[styles.throneTopMeta, { color: screenMuted, fontSize: f.caption }]}>
                        Lv {level}
                      </Text>
                    </View>
                    <View style={styles.throneTopWins}>
                      <Text style={[styles.throneTopWinsNum, { color: arenaGlass.warm, fontSize: f.sub }]}>{entry.wins}</Text>
                      <Text style={[styles.throneTopWinsLabel, { color: screenMuted, fontSize: f.caption - 1 }]}>
                        {triLang(lang, {
                    ru: 'побед',
                    uk: 'пер.',
                    es: 'victorias',
                    'pt-BR': 'vitórias',
                    vi: 'thắng',
                    id: 'menang',
                    tr: 'galibiyet',
                    pl: 'wygr.',
                })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
            }) : (
                <View style={[styles.throneTopEmpty, { borderColor: arenaGlass.innerBorder, backgroundColor: arenaGlass.innerBgSoft }]}>
                  <Ionicons name="flag-outline" size={22} color={arenaGlass.warm}/>
                  <Text style={[styles.throneTopEmptyText, { color: screenMuted, fontSize: f.caption }]}>
                    {triLang(lang, {
                ru: 'Сегодня трон ещё ждёт первого победителя.',
                uk: 'Сьогодні трон ще чекає першого переможця.',
                es: 'Hoy el trono todavía espera al primer ganador.',
                'pt-BR': 'Hoje o trono ainda espera o primeiro vencedor.',
                vi: 'Hôm nay ngai vàng vẫn chờ người thắng đầu tiên.',
                id: 'Hari ini takhta masih menunggu pemenang pertama.',
                tr: 'Bugün taht ilk kazananı bekliyor.',
                pl: 'Dziś tron nadal czeka na pierwszego zwycięzcę.',
            })}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
      <PlayerProfileModal player={throneProfilePlayer} myInfo={myProfileInfo} onClose={() => setThroneProfilePlayer(null)}/>
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
    arenaTicketIcon: {
        width: 23,
        height: 17,
        flexShrink: 0,
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
        overflow: 'visible',
    },
    arenaLaunchGradient: {
        height: 76,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 8,
        paddingRight: 16,
        gap: 12,
        overflow: 'visible',
    },
    arenaLaunchIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 0,
        borderWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        overflow: 'hidden',
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
        marginBottom: 8,
    },
    arenaLaunchActionIcon: {
        width: 52,
        height: 52,
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
    arenaCostTicketIcon: {
        width: 19,
        height: 14,
        flexShrink: 0,
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
        width: 52,
        height: 52,
        borderRadius: 0,
        borderWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        backgroundColor: 'transparent',
        overflow: 'visible',
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
    },
    arenaCommandActionIcon: {
        width: 58,
        height: 58,
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
    arenaIncomingInviteCard: {
        minHeight: 92,
        borderRadius: 18,
        borderWidth: 1,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    arenaIncomingInviteIcon: {
        width: 38,
        height: 38,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    arenaIncomingInviteCopy: {
        flex: 1,
        minWidth: 0,
        gap: 9,
    },
    arenaIncomingInviteTitle: {
        fontWeight: '900',
        letterSpacing: 0,
    },
    arenaIncomingInviteActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    arenaIncomingInviteButton: {
        minHeight: 36,
        borderRadius: 14,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        flexShrink: 1,
    },
    arenaIncomingInviteDecline: {
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    arenaIncomingInviteButtonText: {
        fontWeight: '900',
        letterSpacing: 0,
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
    throneModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.68)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 18,
    },
    throneModalCard: {
        width: '100%',
        maxWidth: 430,
        borderRadius: 22,
        borderWidth: 1,
        padding: 16,
        shadowOpacity: 0.34,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 18,
    },
    throneModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    throneModalIcon: {
        width: 58,
        height: 58,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    throneModalIconImage: {
        width: 48,
        height: 48,
    },
    throneModalTitleWrap: {
        flex: 1,
        minWidth: 0,
    },
    throneModalTitle: {
        fontWeight: '900',
        letterSpacing: 0,
    },
    throneModalSub: {
        fontWeight: '600',
        lineHeight: 18,
        marginTop: 2,
    },
    throneModalClose: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        flexShrink: 0,
    },
    throneRewardInfo: {
        marginTop: 14,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
    },
    throneRewardText: {
        flex: 1,
        fontWeight: '800',
        lineHeight: 18,
    },
    throneTopList: {
        marginTop: 14,
        gap: 10,
    },
    throneTopRow: {
        minHeight: 72,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    throneTopPlace: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    throneTopPlaceText: {
        fontWeight: '900',
        fontSize: 14,
        fontVariant: ['tabular-nums'],
    },
    throneTopCopy: {
        flex: 1,
        minWidth: 0,
    },
    throneTopName: {
        fontWeight: '900',
        letterSpacing: 0,
    },
    throneTopMeta: {
        marginTop: 2,
        fontWeight: '700',
    },
    throneTopWins: {
        minWidth: 88,
        marginRight: 4,
        alignItems: 'flex-end',
        flexShrink: 0,
    },
    throneTopWinsNum: {
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
        letterSpacing: 0,
    },
    throneTopWinsLabel: {
        fontWeight: '700',
        marginTop: -1,
    },
    throneTopEmpty: {
        minHeight: 86,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 8,
    },
    throneTopEmptyText: {
        textAlign: 'center',
        fontWeight: '700',
        lineHeight: 18,
    },
});
