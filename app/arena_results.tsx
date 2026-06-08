import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, ScrollView, Modal, Pressable } from 'react-native';
import { Image } from 'expo-image';
import TapScale from '../components/TapScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from '../components/SafeLinearGradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import XpGainBadge from '../components/XpGainBadge';
import { subscribeSessionPlayers, subscribeSession, createRematchOffer, setRematchStatus } from './services/arena_db';
import { ArenaSession, RematchOffer, REMATCH_TTL_MS, SessionPlayer, type RankTier } from './types/arena';
import { updateMultipleTaskProgress } from './daily_tasks';
import AvatarView from '../components/AvatarView';
import { getLevelFromXP, screenTextOnGradient } from '../constants/theme';
import { onArenaWin, addShards, loadShardsFromCloud } from './shards_system';
import { checkAchievements } from './achievements';
import { resolveRankedArenaWagerForMatchOutcome } from './arena_match_wager';
import { canShowReview, markReviewPrompted, markReviewRated, requestNativeReview, getReviewVariant, ReviewVariant } from './review_utils';
import { logEvent } from './firebase';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  persistBotArenaMatchWithRetries,
  flushPendingBotArenaMatch,
  buildBotMatchDisplayResult,
  startSilentArenaPersistLoop,
} from './arena_bot_profile_write';
import { emitAppEvent } from './events';
import { bumpStatsDaily } from './stats_daily_breakdown';
import { oskolokImageForPackShards } from './oskolok';
import { getRankImage, getRankImageDisplayScale } from '../hooks/use-arena-rank';
import { RankChangeModal, TIER_COLORS } from './components/RankChangeModal';
import { triLang, type Lang } from '../constants/i18n';
import { arenaBilingualFirst } from '../constants/arena_i18n';
import { pickRandomBotNameForLang } from './constants/bot_names';
import ReportErrorButton from '../components/ReportErrorButton';
import { writeFriendEvent } from './firestore_friend_activity';
import { recordArenaHillAttempt, type ArenaHillAttemptResult } from './services/arena_hill';
import { reserveArenaGameEntry } from './arena_access_gate';
import { recordArenaClubWarContribution, type ArenaClubWarContributionResult } from './services/arena_club_wars';
import { recordArenaRoomRun, subscribeArenaRoomRuns, type ArenaRoomRun } from './services/arena_rooms_live';
import { publishArenaPulseEvent } from './services/arena_pulse';
import { safeRouterBack } from './navigation_back';

type ArenaReviewItem = {
  question: string;
  options: string[];
  correct: string;
  myAnswer: string | null;
  rule: string;
  questionId?: string;
  level?: string;
  type?: string;
  timeMs?: number;
  points?: number;
};

function buildArenaReviewReportText(item: ArenaReviewItem, idx: number): string {
  const myLine =
    item.myAnswer == null || item.myAnswer === ''
      ? '(нет ответа / не успел)'
      : item.myAnswer;
  return [
    item.questionId ? `id: ${item.questionId}` : `вопрос в матче: ${idx + 1}`,
    item.level ? `уровень: ${item.level}` : '',
    item.type ? `тип: ${item.type}` : '',
    `вопрос: ${item.question}`,
    `варианты: ${item.options.join(' | ')}`,
    `верно: ${item.correct}`,
    `мой ответ: ${myLine}`,
    item.rule ? `правило: ${item.rule}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// ── Одна звезда (слот) ─────────────────────────────────────────────────────────
function StarSlot({ filled, animateIn, animateOut, delay, accentColor }: {
  filled: boolean;
  animateIn: boolean;
  animateOut: boolean;
  delay: number;
  accentColor: string;
}) {
  const scale = useRef(new Animated.Value(filled && !animateIn ? 1 : 0)).current;
  const opacity = useRef(new Animated.Value(filled && !animateIn ? 1 : 0.25)).current;

  useEffect(() => {
    if (animateIn) {
      Animated.sequence([
        Animated.delay(400 + delay),
        Animated.parallel([
          Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, friction: 3, tension: 80 }),
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.delay(100),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }),
      ]).start();
    } else if (animateOut) {
      Animated.sequence([
        Animated.delay(400 + delay),
        Animated.parallel([
          Animated.spring(scale, { toValue: 1.2, useNativeDriver: true, friction: 3, tension: 80 }),
          Animated.timing(opacity, { toValue: 0.25, duration: 400, useNativeDriver: true }),
        ]),
        Animated.delay(100),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }),
      ]).start();
    }
  }, [animateIn, animateOut, delay, opacity, scale]);

  return (
    <Animated.Text style={{
      fontSize: 32,
      transform: [{ scale }],
      opacity,
      color: filled ? accentColor : '#555',
    }}>
      ★
    </Animated.Text>
  );
}

// ── Блок из 3 звёздочек ────────────────────────────────────────────────────────
function StarDisplay({ oldStars, newStars, accentColor, ready, rankChanged = false }: {
  oldStars: number;
  newStars: number;
  accentColor: string;
  ready: boolean;
  rankChanged?: boolean;
}) {
  // При ранг-апе newStars сбрасывается в 0 (earned 3rd → rank up).
  // Показываем промежуточный «заполненный» слот (oldStars+1=3), чтобы
  // 3-я звезда анимировалась ДО того как экран покажет новый ранг с 0 звёзд.
  // При демоуне (0→2 нижнего ранга) rankChanged=true, promoted=false — shows loss.
  const isRankUp = rankChanged && newStars < oldStars;
  const displayNewStars = isRankUp ? Math.min(3, oldStars + 1) : newStars;

  const gained = displayNewStars > oldStars;
  const lost = !isRankUp && newStars < oldStars && !rankChanged;
  const changedIdx = gained ? oldStars : (lost ? oldStars - 1 : -1);

  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 }}>
      {[0, 1, 2].map(i => {
        const isFilled = ready ? i < displayNewStars : i < oldStars;
        const animIn = ready && gained && i === changedIdx;
        const animOut = ready && lost && i === changedIdx;
        return (
          <StarSlot
            key={i}
            filled={isFilled}
            animateIn={animIn}
            animateOut={animOut}
            delay={0}
            accentColor={accentColor}
          />
        );
      })}
    </View>
  );
}


// ── Главный экран ──────────────────────────────────────────────────────────────
export default function DuelResultsScreen() {
  const {
    sessionId,
    userId,
    rankedArena: rankedArenaParam,
    forfeited,
    opponentForfeited,
    mockMyScore,
    mockOppScore,
    mockOppName,
    mockMyCorrect,
    mockMyTotal,
    mockBonusSpeed,
    mockBonusStreak,
    mockBonusFirst,
    mockBonusOutspeed,
    mockReviewData,
    ghostChallengeId,
    hillMode,
    roomCode,
  } = useLocalSearchParams<{
    sessionId: string; userId: string;
    /** «1» = рейтинг из лобби (Найти матч / бот из очереди); ставка осколками только здесь */
    rankedArena?: string;
    forfeited?: string; opponentForfeited?: string;
    mockMyScore?: string; mockOppScore?: string; mockOppName?: string;
    mockMyCorrect?: string; mockMyTotal?: string;
    mockBonusSpeed?: string; mockBonusStreak?: string;
    mockBonusFirst?: string; mockBonusOutspeed?: string;
    mockReviewData?: string;
    ghostChallengeId?: string;
    hillMode?: string;
    roomCode?: string;
  }>();
  const isGhostChallenge = !!ghostChallengeId || sessionId?.startsWith('ghost_');
  const isHillMode = hillMode === '1' || sessionId?.startsWith('bot_hill_');
  const cleanRoomCode = String(roomCode || (sessionId?.startsWith('room_') ? sessionId.slice('room_'.length) : '')).trim().toUpperCase();
  const isRoomRun = !!cleanRoomCode;
  const isSpecialChallenge = isGhostChallenge || isHillMode || isRoomRun;
  // isRoomRun намеренно исключён: у комнаты реальные участники из Firestore, а не бот
  const isMockSession = sessionId?.startsWith('bot_') || isGhostChallenge;
  const isRankedArenaSession = (rankedArenaParam ?? '0') === '1';
  // Дружеский матч (type=private) — без звёзд рейтинга и без осколков за победу
  const isFriendMatch = !isMockSession && !isRankedArenaSession;
  const isForfeited = forfeited === '1';
  const isOpponentForfeited = opponentForfeited === '1';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const arenaShardAccent = '#A78BFA';
  const arenaLossAccent = '#F87171';
  const arenaFastAccent = '#38BDF8';
  const arenaStreakAccent = '#F97316';
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();

  const [players, setPlayers] = React.useState<SessionPlayer[]>([]);
  const [resultSaved, setResultSaved] = useState(false);
  const [starInfo, setStarInfo] = useState<{
    oldStars: number; newStars: number;
    oldTier: string; oldLevel: string;
    newTier: string; newLevel: string;
    rankChanged?: boolean;
  } | null>(null);
  const [starsReady, setStarsReady] = useState(false);
  const [rankCinematic, setRankCinematic] = useState<{
    promoted: boolean;
    oldTier: string;
    oldLevel: string;
    newTier: string;
    newLevel: string;
  } | null>(null);
  const [shardsEarned, setShardsEarned] = useState(0);
  /** Проигрыш со ставкой: списание уже в resolveRankedArenaWager — только UI/анимация. */
  const [shardsLostWager, setShardsLostWager] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingVariant, setRatingVariant] = useState<ReviewVariant | null>(null);
  const [hillResult, setHillResult] = useState<ArenaHillAttemptResult | null>(null);
  const [clubWarResult, setClubWarResult] = useState<ArenaClubWarContributionResult | null>(null);
  const [xpGainedServer, setXpGainedServer] = useState<number | null>(null);
  const [isDrawServer, setIsDrawServer] = useState<boolean>(false);
  const [resultCardW, setResultCardW] = useState(0);
  const [resultCardH, setResultCardH] = useState(0);
  // Координаты строки-контейнера наград относительно resultCard. Нужны чтобы
  // перевести onLayout-координаты rewardItem (относительно `rewards` View) в
  // resultCard-координаты — именно в них работает translateX/translateY полётной анимации.
  const [rewardsOffset, setRewardsOffset] = useState<{ x: number; y: number } | null>(null);
  const [xpRewardTarget, setXpRewardTarget] = useState<{ x: number; y: number } | null>(null);
  const [shardRewardTarget, setShardRewardTarget] = useState<{ x: number; y: number } | null>(null);
  const [shardLossRewardTarget, setShardLossRewardTarget] = useState<{ x: number; y: number } | null>(null);
  const [showXpReward, setShowXpReward] = useState(false);
  const [showShardReward, setShowShardReward] = useState(false);
  const [showShardLoss, setShowShardLoss] = useState(false);
  const [flyKind, setFlyKind] = useState<'xp' | 'shard' | 'shard_loss' | null>(null);
  const [session, setSession] = useState<ArenaSession | null>(null);
  const [rematchSecsLeft, setRematchSecsLeft] = useState<number | null>(null);
  const rematchTimeoutToastRef = useRef(false);
  const rematchDeclineToastRef = useRef(false);
  const rematchNavigateRef = useRef(false);
  const rewardsHandledRef = useRef(false);
  const taskProgressHandledRef = useRef(false);
  const arenaWinAchievementHandledRef = useRef(false);
  const serverResultAppliedRef = useRef(false);
  const mockArenaRewardsRef = useRef(false);
  const hillAttemptRecordedRef = useRef(false);
  const clubWarContributionRef = useRef(false);
  const roomRunRecordedRef = useRef(false);
  /** Стабильный ник бота, если в URL не передали mockOppName (старые билды / крайние случаи). */
  const mockOppNameBackupRef = useRef<string | null>(null);
  const [roomLeaderboard, setRoomLeaderboard] = React.useState<ArenaRoomRun[]>([]);
  const DRAW_XP = 30;

  const arenaDailyOutcomeRecordedRef = useRef(false);

  useEffect(() => {
    arenaDailyOutcomeRecordedRef.current = false;
    arenaWinAchievementHandledRef.current = false;
    clubWarContributionRef.current = false;
    setClubWarResult(null);
  }, [sessionId]);

  const recordArenaWinAchievementOnce = useCallback(() => {
    if (arenaWinAchievementHandledRef.current) return;
    arenaWinAchievementHandledRef.current = true;
    checkAchievements({ type: 'arena_win' }).catch(() => {});
  }, []);

  const maybeShowArenaReviewPrompt = useCallback(async () => {
    const eligible = await canShowReview();
    if (!eligible) return;
    const variant = await getReviewVariant('arena_win', lang);
    setRatingVariant(variant);
    setTimeout(() => setShowRatingModal(true), 2000);
  }, [lang]);

  const recordArenaDailyOutcome = useCallback((isDraw: boolean, won: boolean) => {
    if (arenaDailyOutcomeRecordedRef.current) return;
    arenaDailyOutcomeRecordedRef.current = true;
    if (isDraw) return;
    if (won) void bumpStatsDaily('arena_wins', 1);
    else void bumpStatsDaily('arena_losses', 1);
  }, []);

  const applyTaskProgressOnce = useCallback((won: boolean, opts?: { rankPromoted?: boolean }) => {
    if (taskProgressHandledRef.current) return;
    taskProgressHandledRef.current = true;
    // Ежедневные задания «в Арене» считают все обычные матчи Арены, включая ботов; дружеские матчи не считаются.
    if (isFriendMatch) return;
    const updates: { type: import('./daily_tasks').TaskType; increment?: number }[] = [{ type: 'arena_play', increment: 1 }];
    if (won) updates.push({ type: 'arena_win', increment: 1 });
    if (opts?.rankPromoted) updates.push({ type: 'arena_rank_promoted', increment: 1 });
    updateMultipleTaskProgress(updates, {
      pvpArenaMatchFinished: { won },
      studyTarget,
    }).catch(() => {});
  }, [isFriendMatch, studyTarget]);

  const reviewItems: ArenaReviewItem[] = (() => {
    try { return mockReviewData ? JSON.parse(mockReviewData) : []; } catch {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Разбор не загрузился. Попробуй позже.',
        messageUk: 'Не вдалося завантажити розбір питань.',
        messageEs: 'No se ha podido cargar la revisión de las preguntas.',
      });
      return [];
    }
  })();

  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const topFadeScrollY = useRef(new Animated.Value(0)).current;
  const flyX = useRef(new Animated.Value(0)).current;
  const flyY = useRef(new Animated.Value(0)).current;
  const flyScale = useRef(new Animated.Value(0.2)).current;
  const flyOpacity = useRef(new Animated.Value(0)).current;
  const rewardsAnimPlayedRef = useRef(false);
  /** Осколки приходят после onArenaWin(); без этого XP-анимация «занимает» слот и шард не показывают. */
  const shardFlyStartedRef = useRef(false);
  /** Полёт осколка при проигрыше со ставкой. */
  const lossShardFlyStartedRef = useRef(false);
  const lossShardAnimPlayedRef = useRef(false);

  useEffect(() => {
    if (isRoomRun) {
      // Для режима комнаты: только свой результат — лидерборд отдельно через subscribeArenaRoomRuns
      setPlayers([
        { sessionId, playerId: userId, score: Number(mockMyScore ?? 0), answers: [], displayName: triLang(lang, {
          uk: 'Ти',
          ru: 'Ты',
          es: 'Tú',
          'pt-BR': "Você",
          vi: "Bạn",
          id: "Kamu",
          tr: "Sen",
          pl: "Ty",
        }) },
      ]);
      return;
    }
    if (isMockSession) {
      const trimmed = mockOppName && String(mockOppName).trim();
      if (trimmed) mockOppNameBackupRef.current = trimmed;
      else if (!mockOppNameBackupRef.current) {
        mockOppNameBackupRef.current = pickRandomBotNameForLang(lang);
      }
      const oppDisplay = trimmed || mockOppNameBackupRef.current || pickRandomBotNameForLang(lang);
      setPlayers([
        { sessionId, playerId: userId, score: Number(mockMyScore ?? 0), answers: [], displayName: triLang(lang, {
          uk: 'Ти',
          ru: 'Ты',
          es: 'Tú',
          'pt-BR': "Você",
          vi: "Bạn",
          id: "Kamu",
          tr: "Sen",
          pl: "Ty",
        }) },
        { sessionId, playerId: 'bot1', score: Number(mockOppScore ?? 0), answers: [], displayName: oppDisplay },
      ]);
      return;
    }
    const unsub = subscribeSessionPlayers(sessionId, setPlayers);
    return unsub;
  }, [isRoomRun, isMockSession, mockMyScore, mockOppName, mockOppScore, sessionId, userId, lang]);

  useEffect(() => {
    if (!userId || !isMockSession) return;
    void flushPendingBotArenaMatch(userId);
  }, [userId, isMockSession]);

  // Лидерборд комнаты — реальные результаты всех сыгравших участников
  useEffect(() => {
    if (!isRoomRun || !cleanRoomCode) return;
    return subscribeArenaRoomRuns(cleanRoomCode, setRoomLeaderboard);
  }, [isRoomRun, cleanRoomCode]);

  // Подписка на саму сессию — нужна для rematchOffer
  useEffect(() => {
    if (isMockSession || isRoomRun || !sessionId) return;
    const unsub = subscribeSession(sessionId, setSession);
    return unsub;
  }, [isMockSession, isRoomRun, sessionId]);

  // ── Rematch: реакция на изменения rematchOffer ─────────────────────────────
  const rematchOffer: RematchOffer | undefined = session?.rematchOffer;
  const isRematchInitiator = !!rematchOffer && rematchOffer.byUid === userId;
  const isRematchTarget = !!rematchOffer && rematchOffer.byUid !== userId;
  const rematchPending = rematchOffer?.status === 'pending' && (rematchOffer.ttlAt ?? 0) > Date.now();

  // Локальный отсчёт секунд для pending offer
  useEffect(() => {
    if (!rematchPending) {
      setRematchSecsLeft(null);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil(((rematchOffer?.ttlAt ?? 0) - Date.now()) / 1000));
      setRematchSecsLeft(left);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [rematchPending, rematchOffer?.ttlAt]);

  // Локальный таймаут — инициатор отмечает offer expired
  useEffect(() => {
    if (!rematchPending || !isRematchInitiator) return;
    const ttlAt = rematchOffer?.ttlAt ?? 0;
    const wait = Math.max(0, ttlAt - Date.now());
    const t = setTimeout(() => {
      setRematchStatus(sessionId, 'expired').catch(() => {});
      if (!rematchTimeoutToastRef.current) {
        rematchTimeoutToastRef.current = true;
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Соперник не ответил на реванш',
          messageUk: 'Суперник не відповів на реванш',
          messageEs: 'El rival no respondió a la revancha a tiempo.',
        });
      }
    }, wait + 100);
    return () => clearTimeout(t);
  }, [rematchPending, isRematchInitiator, rematchOffer?.ttlAt, sessionId]);

  // Тост на отказ соперника
  useEffect(() => {
    if (rematchOffer?.status === 'declined' && isRematchInitiator && !rematchDeclineToastRef.current) {
      rematchDeclineToastRef.current = true;
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: 'Соперник отказался от реванша',
        messageUk: 'Суперник відмовився від реваншу',
        messageEs: 'El rival rechazó la revancha.',
      });
    }
  }, [rematchOffer?.status, isRematchInitiator]);

  // Создан newSessionId — оба клиента переходят в новый матч
  useEffect(() => {
    const newSessionId = rematchOffer?.newSessionId;
    if (!newSessionId) return;
    if (rematchNavigateRef.current) return;
    rematchNavigateRef.current = true;
    void (async () => {
      await reserveArenaGameEntry(newSessionId, 'rematch');
      router.replace({
        pathname: '/arena_game' as any,
        params: { sessionId: newSessionId, userId, fromLobby: '0' },
      });
    })();
  }, [rematchOffer?.newSessionId, router, userId]);

  const handleRematchOffer = useCallback(async () => {
    if (isMockSession || !sessionId || !userId) return;
    rematchTimeoutToastRef.current = false;
    rematchDeclineToastRef.current = false;
    const myName = players.find((p) => p.playerId === userId)?.displayName ?? triLang(lang, {
      ru: 'Игрок',
      uk: 'Гравець',
      es: 'Jugador',
      'pt-BR': "Jogador",
      vi: "Người chơi",
      id: "Pemain",
      tr: "Oyuncu",
      pl: "Gracz",
    });
    try {
      const ok = await createRematchOffer(sessionId, userId, myName);
      if (!ok) {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Реванш уже отправлен.',
          messageUk: 'Реванш уже надіслано.',
          messageEs: 'Revancha ya enviada.',
        });
      } else {
        logEvent('arena_rematch_offer_sent', {});
      }
    } catch {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Реванш не отправился. Попробуй ещё раз.',
        messageUk: 'Не вдалося надіслати реванш',
        messageEs: 'No se ha podido enviar la revancha.',
      });
    }
  }, [isMockSession, players, sessionId, userId, lang]);

  const handleRematchAccept = useCallback(async () => {
    if (isMockSession || !sessionId) return;
    try {
      await setRematchStatus(sessionId, 'accepted');
      logEvent('arena_rematch_accepted', {});
    } catch {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Реванш не принялся. Попробуй снова.',
        messageUk: 'Не вдалося прийняти реванш',
        messageEs: 'No se ha podido aceptar la solicitud de revancha.',
      });
    }
  }, [isMockSession, sessionId]);

  const handleRematchDecline = useCallback(async () => {
    if (isMockSession || !sessionId) return;
    try {
      await setRematchStatus(sessionId, 'declined');
      logEvent('arena_rematch_declined', {});
    } catch {
      // ignore
    }
  }, [isMockSession, sessionId]);

  // При выходе «В Арену» — отменяем мой pending, чтобы не оставлять висеть
  const cancelMyPendingIfAny = useCallback(async () => {
    if (rematchPending && isRematchInitiator) {
      try { await setRematchStatus(sessionId, 'cancelled'); } catch { /* ignore */ }
    }
  }, [rematchPending, isRematchInitiator, sessionId]);

  useEffect(() => {
    if (players.length > 0) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [opacityAnim, players.length, scaleAnim]);

  useEffect(() => {
    if (isMockSession || !sessionId || !userId) return;
    const resultRef = firestore().collection('arena_session_results').doc(`${sessionId}_${userId}`);
    return resultRef.onSnapshot(async (snap) => {
      try {
        if (!snap?.exists) return;
        if (serverResultAppliedRef.current) return;
        serverResultAppliedRef.current = true;
        const data = snap.data() as {
          won?: boolean;
          isDraw?: boolean;
          xpGained?: number;
          oldStars?: number;
          newStars?: number;
          oldTier?: string;
          oldLevel?: string;
          newTier?: string;
          newLevel?: string;
          rankChanged?: boolean;
          /** Повышение ранга (лига вверх или уровень вверх в той же лиге), не понижение */
          promoted?: boolean;
          rankUpStreakShardAwarded?: boolean;
        };
        setXpGainedServer(data.xpGained ?? 0);
        setIsDrawServer(!!data.isDraw);
        setStarInfo({
          oldStars: data.oldStars ?? 0,
          newStars: data.newStars ?? 0,
          oldTier: data.oldTier ?? 'bronze',
          oldLevel: data.oldLevel ?? 'I',
          newTier: data.newTier ?? 'bronze',
          newLevel: data.newLevel ?? 'I',
          rankChanged: !!data.rankChanged,
        });
        // 200ms (было 900ms) — server-path тоже не должен заставлять пользователя ждать
        // секунду перед анимацией звёзд. Сама StarSlot.animateIn уже имеет внутренний
        // delay 400ms, чего достаточно для визуальной паузы.
        setTimeout(() => {
          setStarsReady(true);
          if (data.rankChanged) {
            setTimeout(() => setRankCinematic({
              promoted: !!data.promoted,
              oldTier: data.oldTier ?? 'bronze',
              oldLevel: data.oldLevel ?? 'I',
              newTier: data.newTier ?? 'bronze',
              newLevel: data.newLevel ?? 'I',
            }), 700);
          }
        }, 200);

        // Дружеский матч: без осколков за победу, без ставок, без изменения рейтинговых звёзд
        const wagerOpts = isFriendMatch
          ? { wagerLossStake: 0, baseWinShardsOverride: 0 }
          : await resolveRankedArenaWagerForMatchOutcome({
              rankedArenaParam: isRankedArenaSession,
              sessionId,
              won: !!data.won,
              isDraw: !!data.isDraw,
            });

        if (!isFriendMatch && !data.isDraw && !data.won && wagerOpts.wagerLossStake) {
          setShardsLostWager(wagerOpts.wagerLossStake);
        }

        if (!isFriendMatch && !rewardsHandledRef.current && data.won && !data.isDraw) {
          rewardsHandledRef.current = true;
          recordArenaWinAchievementOnce();
          // Streak wins achievement
          void (async () => {
            const key = 'achievement_arena_win_streak';
            const prev = parseInt((await AsyncStorage.getItem(key)) ?? '0', 10) || 0;
            const next = prev + 1;
            await AsyncStorage.setItem(key, String(next));
            checkAchievements({ type: 'arena_win_streak', streak: next }).catch(() => {});
          })();
          // Wager win achievement
          if (wagerOpts.baseWinShardsOverride != null && wagerOpts.baseWinShardsOverride > 0) {
            void (async () => {
              const wKey = 'achievement_arena_wager_win_count';
              const wPrev = parseInt((await AsyncStorage.getItem(wKey)) ?? '0', 10) || 0;
              const wNext = wPrev + 1;
              await AsyncStorage.setItem(wKey, String(wNext));
              checkAchievements({ type: 'arena_wager_win', count: wNext }).catch(() => {});
              checkAchievements({ type: 'wager_win_streak', count: wNext }).catch(() => {});
            })();
          }
          const { shards, milestoneBonus } = await onArenaWin(
            wagerOpts.baseWinShardsOverride != null && wagerOpts.baseWinShardsOverride > 0
              ? { baseWinShardsOverride: wagerOpts.baseWinShardsOverride }
              : undefined,
          );
          let total = shards + milestoneBonus;
          if (wagerOpts.baseWinShardsOverride == null) {
            total = Math.max(1, total);
          }
          let rankBonus = 0;
          if (data.rankUpStreakShardAwarded) {
            rankBonus = await addShards('arena_rank_up_streak', { suppressEarnEvent: true });
            total += rankBonus;
          }
          if (total > 0) {
            setShardsEarned(total);
          }
          await maybeShowArenaReviewPrompt();
}

        // Reset win streak on loss/draw
        if (!isFriendMatch && (data.isDraw || !data.won)) {
          AsyncStorage.removeItem('achievement_arena_win_streak').catch(() => {});
        }

        const drawSrv = !!data.isDraw;
        if (typeof data.won === 'boolean' || drawSrv) {
          recordArenaDailyOutcome(drawSrv, !!data.won);
        }

        applyTaskProgressOnce(!!data.won, { rankPromoted: !!data.promoted });

        if (data.rankChanged && data.newTier) {
          const eventType = data.promoted ? 'arena_rank_up' : 'arena_rank_down';
          writeFriendEvent(eventType, { rank: String(data.newTier) }).catch(() => {});
        }

        setResultSaved(true);
        logEvent('arena_result_loaded_from_server', { won: data.won ? 1 : 0 });

        // Дуэль из приглашения: сервер начисляет/возвращает ставку осколков — подтягиваем баланс в UI.
        if (sessionId.startsWith('invite_')) {
          loadShardsFromCloud().catch(() => {});
        }
      } catch {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Результат матча не загрузился. Попробуй открыть снова.',
          messageUk: 'Не вдалося завантажити результат матчу.',
          messageEs: 'No se ha podido cargar el resultado del duelo.',
        });
      }
    });
  }, [applyTaskProgressOnce, isMockSession, isRankedArenaSession, recordArenaDailyOutcome, recordArenaWinAchievementOnce, sessionId, userId, lang]);

  const saveMatchResult = useCallback(async (uid: string, won: boolean, isLast: boolean, total: number, isDraw: boolean = false) => {
    if (!isMockSession || isSpecialChallenge) return;
    const xpDelta = isDraw ? DRAW_XP : (won ? 50 : 15);
    const myScore = players.find(p => p.playerId === uid)?.score ?? 0;
    const oppPlayer = players.find(p => p.playerId !== uid);
    const oppScore = oppPlayer?.score ?? 0;
    const oppName = oppPlayer?.displayName?.trim()
      || pickRandomBotNameForLang(lang);

    // Транзакция в arena_profiles: см. arena_bot_profile_write (ретраи + очередь при сбое).
    let oldStars = 0;
    let newStars = 0;
    let oldTier = 'bronze';
    let newTier = 'bronze';
    let oldLevel = 'I';
    let newLevel = 'I';
    let rankChanged = false;
    let promoted = false;

    // Тянем ник из AsyncStorage (источник истины для арены — см. arena_lobby.tsx);
    // если пусто — оставим undefined, сервер тогда не перетрёт уже сохранённое имя.
    let myName: string | undefined;
    try {
      const stored = await AsyncStorage.getItem('user_name');
      if (stored && stored.trim()) myName = stored.trim();
    } catch { /* ignore */ }

    const botArgs = {
      sessionId,
      uid,
      won,
      isLast,
      isDraw,
      myScore,
      oppScore,
      oppName,
      ...(myName ? { myName } : {}),
    };
    const { ok, result } = await persistBotArenaMatchWithRetries(botArgs);
    let profileRank: { stars?: number; tier?: string; level?: string } | undefined;
    if (result) {
      ({
        oldStars,
        newStars,
        oldTier,
        newTier,
        oldLevel,
        newLevel,
        rankChanged,
        promoted,
      } = result);
      setXpGainedServer(result.xpDelta);
    } else {
      setXpGainedServer(xpDelta);
      try {
        const snap = await firestore().collection('arena_profiles').doc(uid).get();
        const d = snap.exists ? (snap.data() as { rank?: { stars?: number; tier?: string; level?: string } }) : undefined;
        profileRank = d?.rank;
      } catch { /* empty */ }
      const display = buildBotMatchDisplayResult(botArgs, profileRank);
      ({
        oldStars,
        newStars,
        oldTier,
        newTier,
        oldLevel,
        newLevel,
        rankChanged,
        promoted,
      } = display);
    }
    if (!ok) {
      startSilentArenaPersistLoop(botArgs);
    }

    setIsDrawServer(isDraw);
    setStarInfo({
      oldStars,
      newStars,
      oldTier,
      oldLevel,
      newTier,
      newLevel,
      rankChanged,
    });
    // 150ms — минимум, чтобы успел отрендериться initial state (filled=oldStars), и
    // дальше StarSlot подхватит animateIn. Раньше было 400ms — суммарно с retry-loop
    // транзакции звёздочки появлялись с большой задержкой, теперь намного быстрее.
    setTimeout(() => {
      setStarsReady(true);
      if (rankChanged) {
        setTimeout(() => setRankCinematic({
          promoted,
          oldTier,
          oldLevel,
          newTier,
          newLevel,
        }), 700);
      }
    }, 150);
    logEvent('arena_match_bot_result', {
      won: won ? 1 : 0,
      rank_changed: rankChanged ? 1 : 0,
      is_draw: isDraw ? 1 : 0,
      stars_change: newStars - oldStars,
      xp_gained: result?.xpDelta ?? xpDelta,
    });
  }, [isMockSession, isSpecialChallenge, lang, players, sessionId]);

  useEffect(() => {
    if (!isForfeited || resultSaved || !userId || !isMockSession || isSpecialChallenge) return;
    saveMatchResult(userId, false, true, 2);
    applyTaskProgressOnce(false);
    recordArenaDailyOutcome(false, false);
    setResultSaved(true);
  }, [applyTaskProgressOnce, isForfeited, isMockSession, isSpecialChallenge, recordArenaDailyOutcome, resultSaved, saveMatchResult, userId]);

  useEffect(() => {
    if (isForfeited || players.length === 0 || resultSaved || !userId || !isMockSession || isSpecialChallenge) return;
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const topScore = sorted[0]?.score ?? 0;
    const lastScore = sorted[sorted.length - 1]?.score ?? 0;
    const tiedAtTop = sorted.filter(p => (p.score ?? 0) === topScore).length;
    const isDrawAtTop = !isOpponentForfeited && players.length > 1 && tiedAtTop > 1;
    const me = players.find(p => p.playerId === userId);
    const myScore = me?.score ?? 0;
    const isDraw = isDrawAtTop && myScore === topScore;
    const isWin = !isDraw && (isOpponentForfeited || myScore === topScore);
    const isLast = !isDraw && !isOpponentForfeited && myScore === lastScore && myScore !== topScore;
    saveMatchResult(userId, isWin, isLast, players.length, isDraw);
    applyTaskProgressOnce(isWin);
    recordArenaDailyOutcome(isDraw, isWin);
    setResultSaved(true);
  }, [applyTaskProgressOnce, isForfeited, isMockSession, isOpponentForfeited, isSpecialChallenge, players, recordArenaDailyOutcome, resultSaved, saveMatchResult, userId]);

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const me = players.find(p => p.playerId === userId);
  const myRank = isForfeited ? 99 : sorted.findIndex(p => p.playerId === userId) + 1;
  /** Сдача соперника может прийти во 2-м snapshot сессии — не опираться только на params с arena_game. */
  const opponentSurrendered =
    isOpponentForfeited
    || (!!session?.forfeitedBy && session.forfeitedBy !== userId && !isForfeited);
  // Ничья = на топе ≥2 игроков с тем же счётом, и я среди них.
  const topScoreLocal = sorted[0]?.score ?? 0;
  const tiedAtTopLocal = sorted.filter(p => (p.score ?? 0) === topScoreLocal).length;
  const localDraw = !isForfeited && !opponentSurrendered && players.length > 1
    && tiedAtTopLocal > 1 && (me?.score ?? 0) === topScoreLocal;
  const isDrawRaw = isDrawServer || localDraw;
  const isDraw = !opponentSurrendered && !isForfeited && isDrawRaw;
  const isWinner = !isForfeited && !isDraw && (opponentSurrendered || myRank === 1);
  const xpGained = isSpecialChallenge
    ? 0
    : isMockSession
    ? (isForfeited ? 0 : (isDraw ? DRAW_XP : (isWinner ? 50 : 15)))
    : (xpGainedServer ?? 0);

  // При ничьей звёзды не меняются — анимация не нужна. Дружеский матч — звёзды не меняются.
  const showStars = !isFriendMatch && !isDraw && starInfo !== null && (starInfo.newStars !== starInfo.oldStars || starsReady);
  // Если проигрыш и 0 звёзд было — нет анимации; ничья — тоже без анимации.
  const noStarAnim = isSpecialChallenge || isDraw || (starInfo && !isWinner && starInfo.oldStars === 0);

  const headlineResult = isForfeited
    ? triLang(lang, {
      ru: 'Сдался',
      uk: 'Здався',
      es: 'Me rendí',
      'pt-BR': "Desisti",
      vi: "Tôi đã bỏ cuộc",
      id: "Saya menyerah",
      tr: "Vazgeçtim",
      pl: "Poddałem się",
    })
    : isDraw
      ? triLang(lang, {
        ru: 'Ничья!',
        uk: 'Нічия!',
        es: '¡Empate!',
        'pt-BR': "Empate!",
        vi: "Hòa!",
        id: "Seri!",
        tr: "Berabere!",
        pl: "Remis!",
      })
      : opponentSurrendered || isWinner
        ? triLang(lang, {
          ru: 'Победа!',
          uk: 'Перемога!',
          es: '¡Victoria!',
          'pt-BR': "Vitória!",
          vi: "Chiến thắng!",
          id: "Menang!",
          tr: "Zafer!",
          pl: "Zwycięstwo!",
        })
        : myRank === sorted.length && sorted.length > 0
          ? triLang(lang, {
            ru: 'В следующий раз!',
            uk: 'Наступного разу!',
            es: '¡Otra vez será!',
            'pt-BR': "Fica para a próxima!",
            vi: "Lần sau nhé!",
            id: "Mungkin lain kali!",
            tr: "Bir dahaki sefere!",
            pl: "Następnym razem!",
          })
          : triLang(lang, {
            ru: `${myRank}-е место`,
            uk: `${myRank}-е місце`,
            es: `${myRank}º puesto`,
            'pt-BR': `${myRank}º lugar`,
            vi: `Hạng ${myRank}`,
            id: `Peringkat ${myRank}`,
            tr: `${myRank}. sıra`,
            pl: `${myRank}. miejsce`,
          });

  useEffect(() => {
    if (hillAttemptRecordedRef.current || isForfeited || !userId || !me || isRoomRun) return;
    hillAttemptRecordedRef.current = true;
    void (async () => {
      const storedName = await AsyncStorage.getItem('user_name').catch(() => null);
      const res = await recordArenaHillAttempt({
        sessionId: String(sessionId || ''),
        userId,
        userName: storedName || me.displayName || 'Phraseman',
        isWin: isWinner,
      });
      setHillResult(res);
      logEvent('arena_hill_attempt_result', {
        is_win: isWinner ? 1 : 0,
        my_wins: res.myWins ?? 0,
        new_champion: res.isNewChampion ? 1 : 0,
        previous_score: res.previousScore ?? 0,
        source: isHillMode ? 'hill' : 'regular',
      });
      if (res.isNewChampion) {
        void publishArenaPulseEvent({
          kind: 'hill',
          title: 'Новый король Арены',
          subtitle: `${storedName || me.displayName || 'Phraseman'} занял трон`,
          actorName: storedName || me.displayName || 'Phraseman',
          score: res.myWins ?? 0,
        }).catch(() => {});
        emitAppEvent('action_toast', {
          type: 'success',
          messageRu: `Ты занял трон Арены! ${res.myWins} побед${(res.myWins ?? 0) >= 5 ? '!' : ''}`,
          messageUk: `Ти зайняв трон Арени! ${res.myWins} перемог`,
          messageEs: `¡Has tomado el trono! ${res.myWins} victorias`,
        });
      }
    })().catch(() => {
      hillAttemptRecordedRef.current = false;
    });
  }, [isForfeited, isHillMode, isRoomRun, me, sessionId, userId]);

  useEffect(() => {
    if (!isRoomRun || roomRunRecordedRef.current || isForfeited || !userId || !me) return;
    roomRunRecordedRef.current = true;
    void (async () => {
      const storedName = await AsyncStorage.getItem('user_name').catch(() => null);
      const total = reviewItems.length || Number(mockMyTotal ?? 0) || me.answers?.length || 0;
      const correct =
        Number(mockMyCorrect ?? 0)
        || reviewItems.filter((item) => item.myAnswer === item.correct).length
        || (me.answers ?? []).filter((a) => !!a.isCorrect).length;
      const totalTime = reviewItems.reduce((sum, item) => sum + Math.max(0, Number(item.timeMs) || 0), 0);
      await recordArenaRoomRun({
        code: cleanRoomCode,
        userId,
        userName: storedName || me.displayName || 'Phraseman',
        score: me.score ?? 0,
        correct,
        total,
        timeMs: totalTime,
      });
      if (isWinner) {
        checkAchievements({ type: 'arena_duel_friend_win' }).catch(() => {});
      }
      logEvent('arena_room_run_finished', {
        code: cleanRoomCode,
        score: me.score ?? 0,
        correct,
        total,
      });
    })().catch(() => {
      roomRunRecordedRef.current = false;
    });
  }, [cleanRoomCode, isForfeited, isRoomRun, me, mockMyCorrect, mockMyTotal, reviewItems, userId]);

  useEffect(() => {
    if (clubWarContributionRef.current) return;
    if (isSpecialChallenge || isForfeited || !userId || !sessionId || !me) return;
    clubWarContributionRef.current = true;
    void (async () => {
      const storedName = await AsyncStorage.getItem('user_name').catch(() => null);
      const answerRows = me.answers ?? [];
      const totalFromReview = reviewItems.length || Number(mockMyTotal ?? 0) || answerRows.length || session?.questions?.length || 0;
      const correctFromReview =
        Number(mockMyCorrect ?? 0)
        || reviewItems.filter((item) => item.myAnswer === item.correct).length
        || answerRows.filter((a) => !!a.isCorrect).length;
      const res = await recordArenaClubWarContribution({
        sessionId,
        arenaUid: userId,
        userName: storedName || me.displayName || 'Phraseman',
        score: me.score ?? 0,
        won: isWinner,
        correctAnswers: correctFromReview,
        totalQuestions: totalFromReview,
      });
      setClubWarResult(res);
      if (res.ok && !res.duplicate && (res.addedPoints ?? 0) > 0) {
        logEvent('arena_club_war_contribution', {
          points: res.addedPoints ?? 0,
          won: isWinner ? 1 : 0,
          league_id: res.leagueId ?? 0,
        });
        void publishArenaPulseEvent({
          kind: 'league',
          title: 'Лига получила очки Арены',
          subtitle: `${storedName || me.displayName || 'Phraseman'} добавил ${res.addedPoints} к бонусу лиги`,
          actorName: storedName || me.displayName || 'Phraseman',
          points: res.addedPoints ?? 0,
        }).catch(() => {});
      }
    })().catch(() => {
      clubWarContributionRef.current = false;
    });
  }, [isForfeited, isSpecialChallenge, isWinner, me, mockMyCorrect, mockMyTotal, reviewItems, session?.questions, sessionId, userId]);

  useEffect(() => {
    if (!isMockSession || isSpecialChallenge || !resultSaved) return;
    if (mockArenaRewardsRef.current) return;
    mockArenaRewardsRef.current = true;
    void (async () => {
      const won = !isForfeited && !isDraw && isWinner;
      const drawOutcome = !isForfeited && isDraw;
      const wagerOpts = await resolveRankedArenaWagerForMatchOutcome({
        rankedArenaParam: isRankedArenaSession,
        sessionId,
        won,
        isDraw: drawOutcome,
      });
      if (!drawOutcome && !won && wagerOpts.wagerLossStake) {
        setShardsLostWager(wagerOpts.wagerLossStake);
      }
      if (!won) {
        await AsyncStorage.removeItem('achievement_arena_win_streak');
        return;
      }
      recordArenaWinAchievementOnce();
      // Streak wins tracking for mock sessions
      void (async () => {
        const key = 'achievement_arena_win_streak';
        const prev = parseInt((await AsyncStorage.getItem(key)) ?? '0', 10) || 0;
        const next = prev + 1;
        await AsyncStorage.setItem(key, String(next));
        checkAchievements({ type: 'arena_win_streak', streak: next }).catch(() => {});
      })();
      if (wagerOpts.baseWinShardsOverride != null && wagerOpts.baseWinShardsOverride > 0) {
        void (async () => {
          const wKey = 'achievement_arena_wager_win_count';
          const wPrev = parseInt((await AsyncStorage.getItem(wKey)) ?? '0', 10) || 0;
          const wNext = wPrev + 1;
          await AsyncStorage.setItem(wKey, String(wNext));
          checkAchievements({ type: 'arena_wager_win', count: wNext }).catch(() => {});
          checkAchievements({ type: 'wager_win_streak', count: wNext }).catch(() => {});
        })();
      }
      const { shards, milestoneBonus } = await onArenaWin(
        wagerOpts.baseWinShardsOverride != null
          ? { baseWinShardsOverride: wagerOpts.baseWinShardsOverride }
          : undefined,
      );
      let total = shards + milestoneBonus;
      if (wagerOpts.baseWinShardsOverride == null) {
        total = Math.max(1, total);
      }
      if (total > 0) {
        setShardsEarned(total);
      }
      await maybeShowArenaReviewPrompt();
    })().catch(() => {});
  }, [isDraw, isForfeited, isMockSession, isRankedArenaSession, isSpecialChallenge, isWinner, recordArenaWinAchievementOnce, resultSaved, sessionId]);

  useEffect(() => {
    rewardsAnimPlayedRef.current = false;
    shardFlyStartedRef.current = false;
    lossShardAnimPlayedRef.current = false;
    lossShardFlyStartedRef.current = false;
    setShowXpReward(false);
    setShowShardReward(false);
    setShowShardLoss(false);
    setFlyKind(null);
    setShardsLostWager(0);
    setShardsEarned(0);
  }, [sessionId]);


  useEffect(() => {
    if (!isWinner) return;
    if (!resultCardW || !resultCardH || !xpRewardTarget) return;
    if (shardsEarned > 0 && !shardRewardTarget) return;
    if (!rewardsOffset) return;

    const tokenHalf = 38;
    // Старт — прямо над целевым слотом (на 70px выше). Чип летит ВНИЗ в свой слот —
    // визуально читается как «появилась награда». Раньше startX/Y были по центру
    // карточки на ~38% высоты — это приходилось на «Победа/740» и улетало вверх,
    // потому что target.y (rewardItem onLayout) — относительно `rewards` View, без
    // прибавки rewardsOffset.y он становился ~13 → translateY от 122 до -25 (вверх).
    const FLY_START_OFFSET_ABOVE_SLOT = 70;

    // Цель в координатах resultCard. onLayout у rewardItem отдаёт координаты ОТНОСИТЕЛЬНО
    // родителя `rewards` — обязательно прибавить rewardsOffset.
    const toCardCoords = (target: { x: number; y: number }) => ({
      x: rewardsOffset.x + target.x,
      y: rewardsOffset.y + target.y,
    });

    const runFly = (kind: 'xp' | 'shard', target: { x: number; y: number }, done: () => void) => {
      const t = toCardCoords(target);
      const startX = t.x - tokenHalf;
      const startY = t.y - tokenHalf - FLY_START_OFFSET_ABOVE_SLOT;
      flyX.setValue(startX);
      flyY.setValue(startY);
      flyScale.setValue(0.25);
      flyOpacity.setValue(0);
      setFlyKind(kind);
      Animated.sequence([
        // 1 кадр (~16 мс) ожидания: гарантирует что flyOpacity.setValue(0) и flyX/flyY.setValue(...)
        // применились на нативном потоке ДО того как элемент станет виден. Без этого
        // setValue и React-ре-рендер могут прийти в разном порядке → flash на стартовой позиции.
        Animated.delay(16),
        Animated.parallel([
          Animated.timing(flyOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(flyScale, {
            toValue: 1,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(90),
        Animated.parallel([
          Animated.timing(flyX, { toValue: t.x - tokenHalf, duration: 520, useNativeDriver: true }),
          Animated.timing(flyY, { toValue: t.y - tokenHalf, duration: 520, useNativeDriver: true }),
          Animated.timing(flyScale, { toValue: 0.34, duration: 520, useNativeDriver: true }),
          Animated.timing(flyOpacity, { toValue: 0.1, duration: 520, useNativeDriver: true }),
        ]),
      ]).start(done);
    };

    // Осколки приходят после onArenaWin(); XP уже отыграл — дорисовываем только полёт осколка.
    if (
      rewardsAnimPlayedRef.current
      && shardsEarned > 0
      && shardRewardTarget
      && showXpReward
      && !showShardReward
      && !shardFlyStartedRef.current
    ) {
      shardFlyStartedRef.current = true;
      runFly('shard', shardRewardTarget, () => {
        setShowShardReward(true);
        setFlyKind(null);
      });
      return;
    }

    if (rewardsAnimPlayedRef.current) return;

    rewardsAnimPlayedRef.current = true;
    runFly('xp', xpRewardTarget, () => {
      setShowXpReward(true);
      if (shardsEarned > 0 && shardRewardTarget && !shardFlyStartedRef.current) {
        shardFlyStartedRef.current = true;
        runFly('shard', shardRewardTarget, () => {
          setShowShardReward(true);
          setFlyKind(null);
        });
        return;
      }
      setFlyKind(null);
    });
  }, [
    flyOpacity, flyScale, flyX, flyY, isWinner, resultCardH, resultCardW,
    rewardsOffset, shardRewardTarget, shardsEarned, showShardReward, showXpReward, xpRewardTarget,
  ]);

  /** Полёт осколка при проигрыше со ставкой (знак «−»). */
  useEffect(() => {
    if (isWinner || isDraw || isForfeited) return;
    if (shardsLostWager <= 0 || !resultSaved) return;
    if (!resultCardW || !resultCardH || !rewardsOffset || !shardLossRewardTarget) return;
    if (lossShardAnimPlayedRef.current) return;

    const tokenHalf = 38;
    const FLY_START_OFFSET_ABOVE_SLOT = 70;
    const toCardCoords = (target: { x: number; y: number }) => ({
      x: rewardsOffset.x + target.x,
      y: rewardsOffset.y + target.y,
    });

    const runLossFly = (target: { x: number; y: number }, done: () => void) => {
      const t = toCardCoords(target);
      const startX = t.x - tokenHalf;
      const startY = t.y - tokenHalf - FLY_START_OFFSET_ABOVE_SLOT;
      flyX.setValue(startX);
      flyY.setValue(startY);
      flyScale.setValue(0.25);
      flyOpacity.setValue(0);
      setFlyKind('shard_loss');
      Animated.sequence([
        Animated.delay(16),
        Animated.parallel([
          Animated.timing(flyOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(flyScale, {
            toValue: 1,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(90),
        Animated.parallel([
          Animated.timing(flyX, { toValue: t.x - tokenHalf, duration: 520, useNativeDriver: true }),
          Animated.timing(flyY, { toValue: t.y - tokenHalf, duration: 520, useNativeDriver: true }),
          Animated.timing(flyScale, { toValue: 0.34, duration: 520, useNativeDriver: true }),
          Animated.timing(flyOpacity, { toValue: 0.1, duration: 520, useNativeDriver: true }),
        ]),
      ]).start(done);
    };

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (lossShardAnimPlayedRef.current) return;
      lossShardAnimPlayedRef.current = true;
      lossShardFlyStartedRef.current = true;
      runLossFly(shardLossRewardTarget, () => {
        setShowShardLoss(true);
        setFlyKind(null);
        lossShardFlyStartedRef.current = false;
      });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    flyOpacity, flyScale, flyX, flyY,
    isWinner, isDraw, isForfeited, shardsLostWager, resultSaved,
    resultCardH, resultCardW, rewardsOffset, shardLossRewardTarget,
  ]);

  /** Если полёт осколка сорвался — не оставляем награду с opacity 0 при ненулевом shardsEarned. */
  useEffect(() => {
    if (!isWinner || shardsEarned <= 0 || showShardReward) return;
    const id = setTimeout(() => setShowShardReward(true), 2800);
    return () => clearTimeout(id);
  }, [isWinner, shardsEarned, showShardReward]);

  useEffect(() => {
    if (isWinner || isDraw || isForfeited) return;
    if (shardsLostWager <= 0 || showShardLoss) return;
    const id = setTimeout(() => setShowShardLoss(true), 3200);
    return () => clearTimeout(id);
  }, [isWinner, isDraw, isForfeited, shardsLostWager, showShardLoss]);

  useEffect(() => {
    // Real matches should use server-computed result, but this keeps UX resilient
    // when arena_session_results arrives late or cannot be read.
    if (isMockSession) return;
    if (serverResultAppliedRef.current) return;
    if (players.length === 0) return;
    if (starInfo !== null) return;
    if (isForfeited) return;

    const fallbackTimer = setTimeout(() => {
      if (serverResultAppliedRef.current || starInfo !== null) return;

      const fallbackXp = isDraw ? DRAW_XP : (isWinner ? 50 : 15);
      setXpGainedServer(fallbackXp);
      setIsDrawServer(isDraw);
      applyTaskProgressOnce(isWinner);
      recordArenaDailyOutcome(isDraw, isWinner);
      setResultSaved(true);

      if (!isDraw) {
        const fallbackOldStars = 0;
        const fallbackNewStars = isWinner ? 1 : 0;
        setStarInfo({
          oldStars: fallbackOldStars,
          newStars: fallbackNewStars,
          oldTier: 'bronze',
          oldLevel: 'I',
          newTier: 'bronze',
          newLevel: 'I',
          rankChanged: false,
        });
        setTimeout(() => setStarsReady(true), 250);
      }

      if (isWinner && !rewardsHandledRef.current) {
        rewardsHandledRef.current = true;
        recordArenaWinAchievementOnce();
        (async () => {
          const wagerOpts = await resolveRankedArenaWagerForMatchOutcome({
            rankedArenaParam: isRankedArenaSession,
            sessionId,
            won: true,
            isDraw: false,
          });
          const { shards, milestoneBonus } = await onArenaWin(
            wagerOpts.baseWinShardsOverride != null
              ? { baseWinShardsOverride: wagerOpts.baseWinShardsOverride }
              : undefined,
          );
          let total = shards + milestoneBonus;
          if (wagerOpts.baseWinShardsOverride == null) {
            total = Math.max(1, total);
          }
          if (total > 0) {
            setShardsEarned(total);
          }
          await maybeShowArenaReviewPrompt();
        })().catch(() => {});
      }

      if (!isWinner && !isDraw) {
        void (async () => {
          const wo = await resolveRankedArenaWagerForMatchOutcome({
            rankedArenaParam: isRankedArenaSession,
            sessionId,
            won: false,
            isDraw: false,
          });
          if (wo.wagerLossStake) setShardsLostWager(wo.wagerLossStake);
        })().catch(() => {});
      }
      if (isDraw && !rewardsHandledRef.current) {
        void resolveRankedArenaWagerForMatchOutcome({
          rankedArenaParam: isRankedArenaSession,
          sessionId,
          won: false,
          isDraw: true,
        });
      }

      logEvent('arena_result_fallback_applied', {
        won: isWinner ? 1 : 0,
        is_draw: isDraw ? 1 : 0,
      });
    }, 2200);

    return () => clearTimeout(fallbackTimer);
  }, [
    applyTaskProgressOnce,
    isDraw,
    isForfeited,
    isMockSession,
    isRankedArenaSession,
    isWinner,
    lang,
    players.length,
    recordArenaDailyOutcome,
    recordArenaWinAchievementOnce,
    sessionId,
    starInfo,
  ]);

  const goBackFromResults = useCallback(async () => {
    await cancelMyPendingIfAny();
    safeRouterBack(router, '/(tabs)/arena' as any);
  }, [cancelMyPendingIfAny, router]);

  return (
    <ScreenGradient topFade={{ scrollY: topFadeScrollY }}>
      <ScrollView
        decelerationRate="normal"
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: topFadeScrollY } } }], { useNativeDriver: true })}
      >
        <TapScale
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            ru: 'Назад',
            uk: 'Назад',
            es: 'Volver',
            'pt-BR': "Voltar",
            vi: "Quay lại",
            id: "Kembali",
            tr: "Geri dön",
            pl: "Wróć",
          })}
          onPress={() => { void goBackFromResults(); }}
          style={[styles.topBackBtn, { backgroundColor: t.bgCard, borderColor: t.border }]}
        >
          <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
        </TapScale>
        <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
          <LinearGradient
            colors={isWinner ? [t.correctBg, t.bgCard] : [t.bgSurface, t.bgCard]}
            style={[styles.resultCard, { borderColor: isWinner ? t.correct : isDraw ? t.gold : t.border }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            onLayout={(e) => {
              setResultCardW(e.nativeEvent.layout.width);
              setResultCardH(e.nativeEvent.layout.height);
            }}
          >
            <Text style={styles.resultEmoji} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.7}>
              {isForfeited ? '🏳️' : isDraw ? '🤝' : opponentSurrendered ? '🏆' : isWinner ? '🏆' : myRank === 2 ? '🥈' : '💪'}
            </Text>
            <Text style={[styles.resultTitle, { color: t.textPrimary, fontSize: f.h1 }]}>
              {headlineResult}
            </Text>
            {opponentSurrendered && (
              <Text style={[{ color: t.textMuted, fontSize: f.body, fontWeight: '500', marginTop: -2 }]}>
                {triLang(lang, {
                  ru: '🏳️ Оппонент сдался',
                  uk: '🏳️ Опонент здався',
                  es: '🏳️ El rival se rindió',
                  'pt-BR': "🏳️ O rival desistiu",
                  vi: "🏳️ Đối thủ đã bỏ cuộc",
                  id: "🏳️ Lawan menyerah",
                  tr: "🏳️ Rakip vazgeçti",
                  pl: "🏳️ Rywal się poddał",
                })}
              </Text>
            )}
            <Text style={[styles.myScore, { color: t.accent, fontSize: 44 }]} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.7}>
              {me?.score ?? 0}
            </Text>
            <Text style={[styles.myScoreLabel, { color: t.textMuted, fontSize: f.caption }]}>
              {triLang(lang, {
                ru: 'очков',
                uk: 'очок',
                es: 'puntos',
                'pt-BR': "pontos",
                vi: "điểm",
                id: "poin",
                tr: "puan",
                pl: "punktów",
              })}
            </Text>

            {isHillMode && (
              <View style={[styles.hillResultBadge, { borderColor: hillResult?.isNewChampion ? t.correct : t.border, backgroundColor: t.bgSurface }]}>
                <Ionicons
                  name={hillResult?.isNewChampion ? 'flag' : 'shield-checkmark-outline'}
                  size={16}
                  color={hillResult?.isNewChampion ? t.correct : t.textMuted}
                />
                <Text style={[styles.hillResultText, { color: t.textPrimary, fontSize: f.caption }]} numberOfLines={2}>
                  {!hillResult
                    ? triLang(lang, {
                      ru: 'Проверяем трон...',
                      uk: 'Перевіряємо трон...',
                      es: 'Comprobando el trono...',
                      'pt-BR': "Verificando o trono...",
                      vi: "Đang kiểm tra ngai...",
                      id: "Memeriksa takhta...",
                      tr: "Taht kontrol ediliyor...",
                      pl: "Sprawdzanie tronu...",
                    })
                    : hillResult.isNewChampion
                      ? triLang(lang, {
                        ru: 'Ты новый король Арены сегодня',
                        uk: 'Ти новий король Арени сьогодні',
                        es: 'Eres el rey de la Arena de hoy',
                        'pt-BR': "Você é o rei da Arena hoje",
                        vi: "Bạn là vua Đấu trường hôm nay",
                        id: "Kamu raja Arena hari ini",
                        tr: "Bugünün Arena kralı sensin",
                        pl: "Jesteś dziś królem Areny",
                      })
                      : triLang(lang, {
                        ru: `Трон держит ${hillResult.previousChampionName ?? 'чемпион'}: ${hillResult.previousScore ?? 0}`,
                        uk: `Трон тримає ${hillResult.previousChampionName ?? 'чемпіон'}: ${hillResult.previousScore ?? 0}`,
                        es: `${hillResult.previousChampionName ?? 'El campeón'} mantiene el trono: ${hillResult.previousScore ?? 0}`,
                        'pt-BR': `${hillResult.previousChampionName ?? 'O campeão'} mantém o trono: ${hillResult.previousScore ?? 0}`,
                        vi: `${hillResult.previousChampionName ?? 'Nhà vô địch'} giữ ngai: ${hillResult.previousScore ?? 0}`,
                        id: `${hillResult.previousChampionName ?? 'Juara'} mempertahankan takhta: ${hillResult.previousScore ?? 0}`,
                        tr: `${hillResult.previousChampionName ?? 'Şampiyon'} tahtı koruyor: ${hillResult.previousScore ?? 0}`,
                        pl: `${hillResult.previousChampionName ?? 'Mistrz'} utrzymuje tron: ${hillResult.previousScore ?? 0}`,
                      })}
                </Text>
              </View>
            )}
            {!isSpecialChallenge && clubWarResult?.ok && !clubWarResult.duplicate && (clubWarResult.addedPoints ?? 0) > 0 && (
              <View style={[styles.clubWarBadge, { borderColor: t.border, backgroundColor: t.bgSurface }]}>
                <Ionicons name="people-circle-outline" size={16} color={t.accent} />
                <Text style={[styles.clubWarText, { color: t.textPrimary, fontSize: f.caption }]} numberOfLines={1}>
                  {triLang(lang, {
                    ru: `+${clubWarResult.addedPoints} к бонусу лиги`,
                    uk: `+${clubWarResult.addedPoints} до бонусу ліги`,
                    es: `+${clubWarResult.addedPoints} para el bono de liga`,
                    'pt-BR': `+${clubWarResult.addedPoints} para o bônus da liga`,
                    vi: `+${clubWarResult.addedPoints} cho thưởng giải đấu`,
                    id: `+${clubWarResult.addedPoints} untuk bonus liga`,
                    tr: `Lig bonusu için +${clubWarResult.addedPoints}`,
                    pl: `+${clubWarResult.addedPoints} do bonusu ligi`,
                  })}
                </Text>
              </View>
            )}
            {isRoomRun && (
              <View style={[styles.clubWarBadge, { borderColor: t.border, backgroundColor: t.bgSurface }]}>
                <Ionicons name="people-outline" size={16} color={t.accent} />
                <Text style={[styles.clubWarText, { color: t.textPrimary, fontSize: f.caption }]} numberOfLines={1}>
                  {triLang(lang, {
                    ru: `Результат отправлен в комнату ${cleanRoomCode}`,
                    uk: `Результат надіслано в кімнату ${cleanRoomCode}`,
                    es: `Resultado enviado a la sala ${cleanRoomCode}`,
                    'pt-BR': `Resultado enviado para a sala ${cleanRoomCode}`,
                    vi: `Đã gửi kết quả đến phòng ${cleanRoomCode}`,
                    id: `Hasil dikirim ke room ${cleanRoomCode}`,
                    tr: `Sonuç ${cleanRoomCode} odasına gönderildi`,
                    pl: `Wynik wysłany do pokoju ${cleanRoomCode}`,
                  })}
                </Text>
              </View>
            )}

            <View
              style={[styles.rewards, { borderTopColor: t.border }]}
              onLayout={(e) => {
                const { x, y } = e.nativeEvent.layout;
                setRewardsOffset({ x, y });
              }}
            >
              {(isWinner || (resultSaved && !isForfeited)) && (
                <View
                  style={[styles.rewardItem, { opacity: isWinner ? (showXpReward ? 1 : 0) : 1 }]}
                  onLayout={(e) => {
                    const { x, y, width, height } = e.nativeEvent.layout;
                    setXpRewardTarget({
                      x: x + width / 2,
                      y: y + height / 2,
                    });
                  }}
                >
                  <Ionicons name="flash" size={20} color={t.gold} />
                  <XpGainBadge amount={xpGained} visible={true} style={{ color: t.gold, fontSize: f.body, fontWeight: '700' }} />
                </View>
              )}
              {shardsEarned > 0 && (
                <View
                  style={[styles.rewardItem, { opacity: showShardReward ? 1 : 0 }]}
                  onLayout={(e) => {
                    const { x, y, width, height } = e.nativeEvent.layout;
                    setShardRewardTarget({
                      x: x + width / 2,
                      y: y + height / 2,
                    });
                  }}
                >
                  <Image source={oskolokImageForPackShards(shardsEarned)} style={{ width: 22, height: 22 }} contentFit="contain" />
                  <Text style={[{ color: arenaShardAccent, fontSize: f.body, fontWeight: '700' }]}>
                    +{shardsEarned}{' '}
                    {lang === 'es'
                      ? (shardsEarned === 1 ? 'fragmento' : 'fragmentos')
                      : lang === 'uk'
                        ? (shardsEarned === 1 ? 'осколок' : shardsEarned < 5 ? 'осколки' : 'осколків')
                        : (shardsEarned === 1 ? 'осколок' : shardsEarned < 5 ? 'осколка' : 'осколков')}
                  </Text>
                </View>
              )}
              {shardsLostWager > 0 && resultSaved && (
                <View
                  style={[styles.rewardItem, { opacity: showShardLoss ? 1 : 0 }]}
                  onLayout={(e) => {
                    const { x, y, width, height } = e.nativeEvent.layout;
                    setShardLossRewardTarget({
                      x: x + width / 2,
                      y: y + height / 2,
                    });
                  }}
                >
                  <Image source={oskolokImageForPackShards(shardsLostWager)} style={{ width: 22, height: 22 }} contentFit="contain" />
                  <Text style={[{ color: arenaLossAccent, fontSize: f.body, fontWeight: '700' }]}>
                    −{shardsLostWager}{' '}
                    {lang === 'es'
                      ? (shardsLostWager === 1 ? 'fragmento' : 'fragmentos')
                      : lang === 'uk'
                        ? (shardsLostWager === 1 ? 'осколок' : shardsLostWager < 5 ? 'осколки' : 'осколків')
                        : (shardsLostWager === 1 ? 'осколок' : shardsLostWager < 5 ? 'осколка' : 'осколков')}
                  </Text>
                </View>
              )}

              {/* Звёзды */}
              {!noStarAnim && showStars && (
                <StarDisplay
                  oldStars={starInfo!.oldStars}
                  newStars={starInfo!.newStars}
                  accentColor={t.gold}
                  ready={starsReady}
                  rankChanged={starInfo!.rankChanged}
                />
              )}
              {!noStarAnim && !showStars && !isForfeited && (
                // Заглушка пока грузится (3 пустых слота)
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[0, 1, 2].map(i => (
                    <Text key={i} style={{ fontSize: 32, color: '#555', opacity: 0.4 }}>★</Text>
                  ))}
                </View>
              )}
            </View>

            {flyKind && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.shardFlyOverlay,
                  {
                    transform: [
                      { translateX: flyX },
                      { translateY: flyY },
                    ],
                  },
                ]}
              >
                <Animated.View
                  style={{
                    opacity: flyOpacity,
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: [{ scale: flyScale }],
                  }}
                >
                  {flyKind === 'xp' ? (
                    <View style={styles.flyXpChip}>
                      <Ionicons name="flash" size={30} color="#FACC15" />
                      <Text style={styles.flyXpText}>+{xpGained} XP</Text>
                    </View>
                  ) : flyKind === 'shard_loss' ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                      <Image source={oskolokImageForPackShards(shardsLostWager)} style={{ width: 76, height: 76 }} contentFit="contain" />
                      <Text style={{ color: arenaLossAccent, fontWeight: '900', fontSize: 22, marginTop: 6 }}>−{shardsLostWager}</Text>
                    </View>
                  ) : (
                    <Image source={oskolokImageForPackShards(shardsEarned)} style={{ width: 76, height: 76 }} contentFit="contain" />
                  )}
                </Animated.View>
              </Animated.View>
            )}

            {!!starInfo && (
              <View style={[styles.rankDock, { overflow: 'hidden' }]}>
                <Image
                  source={getRankImage((starInfo.newTier as RankTier), starInfo.newLevel)}
                  style={[
                    styles.rankDockImage,
                    {
                      transform: [{ scale: getRankImageDisplayScale((starInfo.newTier as RankTier), starInfo.newLevel) }],
                    },
                  ]}
                  contentFit="contain"
                />
              </View>
            )}

          </LinearGradient>
        </Animated.View>

        {isRoomRun ? (
          <View style={[styles.leaderboard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <Text style={[styles.leaderboardTitle, { color: t.textMuted, fontSize: f.caption }]}>
              {triLang(lang, {
                ru: `Таблица комнаты ${cleanRoomCode}`,
                uk: `Таблиця кімнати ${cleanRoomCode}`,
                es: `Clasificación sala ${cleanRoomCode}`,
                'pt-BR': `Classificação da sala ${cleanRoomCode}`,
                vi: `Xếp hạng phòng ${cleanRoomCode}`,
                id: `Peringkat room ${cleanRoomCode}`,
                tr: `${cleanRoomCode} oda sıralaması`,
                pl: `Ranking pokoju ${cleanRoomCode}`,
              })}
            </Text>
            {roomLeaderboard.length === 0 ? (
              <Text style={[styles.playerName, { color: t.textGhost, padding: 16, textAlign: 'center', fontSize: f.sub }]}>
                {triLang(lang, {
                  ru: 'Результат сохраняется…',
                  uk: 'Результат зберігається…',
                  es: 'Guardando resultado…',
                  'pt-BR': "Salvando resultado…",
                  vi: "Đang lưu kết quả…",
                  id: "Menyimpan hasil…",
                  tr: "Sonuç kaydediliyor…",
                  pl: "Zapisywanie wyniku…",
                })}
              </Text>
            ) : roomLeaderboard.map((run, idx) => {
              const isMe = run.userId === userId;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
              return (
                <View
                  key={run.id}
                  style={[styles.leaderboardRow, { borderTopColor: t.border }, isMe && { backgroundColor: t.accentBg }]}
                >
                  <Text style={styles.medal}>{medal}</Text>
                  <Text style={[styles.playerName, { color: isMe ? t.accent : t.textPrimary, fontSize: f.body }]} numberOfLines={1}>
                    {run.userName}
                  </Text>
                  <View style={styles.leaderboardScoreCol}>
                    <Text style={[styles.playerFinalScore, { color: t.textPrimary, fontSize: f.body }]}>{run.score}</Text>
                    {run.total > 0 && (
                      <Text style={[{ color: t.textMuted, fontSize: f.caption, textAlign: 'right' }]} numberOfLines={1}>
                        {run.correct}/{run.total} ✓
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.leaderboard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <Text style={[styles.leaderboardTitle, { color: t.textMuted, fontSize: f.caption }]}>
              {triLang(lang, {
                ru: 'Результаты матча',
                uk: 'Результати матчу',
                es: 'Resultados del duelo',
                'pt-BR': "Resultados do duelo",
                vi: "Kết quả đấu",
                id: "Hasil duel",
                tr: "Düello sonuçları",
                pl: "Wyniki pojedynku",
              })}
            </Text>
            {sorted.map((p, idx) => {
              const isMe = p.playerId === userId;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
              return (
                <View
                  key={p.playerId}
                  style={[
                    styles.leaderboardRow,
                    { borderTopColor: t.border },
                    isMe && { backgroundColor: t.accentBg },
                  ]}
                >
                  <Text style={styles.medal}>{medal}</Text>
                  <AvatarView avatar={p.avatar ?? String(p.avatarLevel ?? 1)} size={28} auraId={p.aura} />
                  <Text style={[styles.playerName, {
                    color: isMe ? t.accent : t.textPrimary,
                    fontSize: f.body,
                  }]} numberOfLines={1}>
                    {p.displayName ?? (isMe ? triLang(lang, {
                      ru: 'Я',
                      uk: 'Я',
                      es: 'Yo',
                      'pt-BR': "Eu",
                      vi: "Tôi",
                      id: "Saya",
                      tr: "Ben",
                      pl: "Ja",
                    }) : triLang(lang, {
                      ru: `Игрок ${idx + 1}`,
                      uk: `Гравець ${idx + 1}`,
                      es: `Jugador ${idx + 1}`,
                      'pt-BR': `Jogador ${idx + 1}`,
                      vi: `Người chơi ${idx + 1}`,
                      id: `Pemain ${idx + 1}`,
                      tr: `Oyuncu ${idx + 1}`,
                      pl: `Gracz ${idx + 1}`,
                    }))}
                  </Text>
                  <View style={styles.leaderboardScoreCol}>
                    <Text style={[styles.playerFinalScore, { color: t.textPrimary, fontSize: f.body }]}>
                      {p.score}
                    </Text>
                    {(() => {
                      const correct = isMe && isMockSession
                        ? Number(mockMyCorrect ?? 0)
                        : p.answers.filter((a: { isCorrect: boolean }) => a.isCorrect).length;
                      const total = isMe && isMockSession
                        ? Number(mockMyTotal ?? 0)
                        : p.answers.length;
                      if (total === 0) return null;
                      return (
                        <Text
                          style={[{ color: t.textMuted, fontSize: f.caption, textAlign: 'right' }]}
                          numberOfLines={1}
                        >
                          {correct}/{total} ✓
                        </Text>
                      );
                    })()}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Разбивка очков — работает и для мока (через query-параметры),
            и для реального матча (агрегируем из me.answers[].bonus, который пишет сервер) */}
        {(() => {
          const myCorrect = isMockSession
            ? Number(mockMyCorrect ?? 0)
            : (me?.answers ?? []).filter((a) => a.isCorrect).length;
          const myTotal = isMockSession
            ? Number(mockMyTotal ?? 0)
            : (me?.answers ?? []).length;
          if (myTotal <= 0) return null;
          let bSpeed = 0, bStreak = 0, bFirst = 0, bOutspeed = 0;
          if (isMockSession) {
            bSpeed = Number(mockBonusSpeed ?? 0);
            bStreak = Number(mockBonusStreak ?? 0);
            bFirst = Number(mockBonusFirst ?? 0);
            bOutspeed = Number(mockBonusOutspeed ?? 0);
          } else {
            for (const a of me?.answers ?? []) {
              const b = a.bonus;
              if (!b) continue;
              bSpeed += b.speed ?? 0;
              bStreak += b.streak ?? 0;
              bFirst += b.first ?? 0;
              bOutspeed += b.outspeed ?? 0;
            }
          }
          return (
            <View style={[styles.leaderboard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
              <Text style={[styles.leaderboardTitle, { color: t.textMuted, fontSize: f.caption }]}>
                {triLang(lang, {
                  ru: 'Твои очки',
                  uk: 'Твої очки',
                  es: 'Tus puntos',
                  'pt-BR': "Seus pontos",
                  vi: "Điểm của bạn",
                  id: "Poinmu",
                  tr: "Puanların",
                  pl: "Twoje punkty",
                })}
              </Text>
              <View style={styles.breakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={[{ color: t.textMuted, fontSize: f.caption, flex: 1, minWidth: 0 }]} numberOfLines={2}>
                    {triLang(lang, {
                      ru: '✓ Правильных ответов',
                      uk: '✓ Правильних відповідей',
                      es: '✓ Respuestas correctas',
                      'pt-BR': "✓ Respostas corretas",
                      vi: "✓ Câu trả lời đúng",
                      id: "✓ Jawaban benar",
                      tr: "✓ Doğru cevaplar",
                      pl: "✓ Poprawne odpowiedzi",
                    })}
                  </Text>
                  <Text style={[{ color: t.correct, fontSize: f.caption, fontWeight: '700', flexShrink: 0 }]}>+{myCorrect * 100}</Text>
                </View>
                {bSpeed > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[{ color: t.textMuted, fontSize: f.caption, flex: 1, minWidth: 0 }]} numberOfLines={2}>
                      {triLang(lang, {
                        ru: '⚡ Бонус за скорость',
                        uk: '⚡ Бонус за швидкість',
                        es: '⚡ Bonificación por velocidad',
                        'pt-BR': "⚡ Bônus por velocidade",
                        vi: "⚡ Thưởng tốc độ",
                        id: "⚡ Bonus kecepatan",
                        tr: "⚡ Hız bonusu",
                        pl: "⚡ Bonus za szybkość",
                      })}
                    </Text>
                    <Text style={[{ color: t.gold, fontSize: f.caption, fontWeight: '700', flexShrink: 0 }]}>+{bSpeed}</Text>
                  </View>
                )}
                {bFirst > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[{ color: t.textMuted, fontSize: f.caption, flex: 1, minWidth: 0 }]} numberOfLines={2}>
                      {triLang(lang, {
                        ru: '🎯 Первый правильный',
                        uk: '🎯 Перша правильна',
                        es: '🎯 Primer acierto',
                        'pt-BR': "🎯 Primeiro acerto",
                        vi: "🎯 Câu đúng đầu tiên",
                        id: "🎯 Jawaban benar pertama",
                        tr: "🎯 İlk doğru",
                        pl: "🎯 Pierwsza dobra odpowiedź",
                      })}
                    </Text>
                    <Text style={[{ color: arenaShardAccent, fontSize: f.caption, fontWeight: '700', flexShrink: 0 }]}>+{bFirst}</Text>
                  </View>
                )}
                {bStreak > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[{ color: t.textMuted, fontSize: f.caption, flex: 1, minWidth: 0 }]} numberOfLines={2}>
                      {triLang(lang, {
                        ru: '🔥 Серия подряд',
                        uk: '🔥 Серія поспіль',
                        es: '🔥 Racha de aciertos',
                        'pt-BR': "🔥 Sequência de acertos",
                        vi: "🔥 Chuỗi đúng",
                        id: "🔥 Rangkaian benar",
                        tr: "🔥 Doğru serisi",
                        pl: "🔥 Seria trafień",
                      })}
                    </Text>
                    <Text style={[{ color: arenaStreakAccent, fontSize: f.caption, fontWeight: '700', flexShrink: 0 }]}>+{bStreak}</Text>
                  </View>
                )}
                {bOutspeed > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[{ color: t.textMuted, fontSize: f.caption, flex: 1, minWidth: 0 }]} numberOfLines={2}>
                      {triLang(lang, {
                        ru: '💥 Быстрый ответ (≤10с)',
                        uk: '💥 Швидка відповідь (≤10 с)',
                        es: '💥 Respuesta muy rápida (≤10 s)',
                        'pt-BR': "💥 Resposta muito rápida (≤10 s)",
                        vi: "💥 Trả lời rất nhanh (≤10 giây)",
                        id: "💥 Jawaban sangat cepat (≤10 dtk)",
                        tr: "💥 Çok hızlı cevap (≤10 sn)",
                        pl: "💥 Bardzo szybka odpowiedź (≤10 s)",
                      })}
                    </Text>
                    <Text style={[{ color: arenaFastAccent, fontSize: f.caption, fontWeight: '700', flexShrink: 0 }]}>+{bOutspeed}</Text>
                  </View>
                )}
                <View style={[styles.breakdownRow, { borderTopWidth: 1, borderTopColor: t.border, marginTop: 4, paddingTop: 8 }]}>
                  <Text style={[{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', flexShrink: 0 }]}>
                    {triLang(lang, {
                      ru: 'Итого',
                      uk: 'Разом',
                      es: 'Total',
                      'pt-BR': "Total",
                      vi: "Tổng",
                      id: "Total",
                      tr: "Toplam",
                      pl: "Razem",
                    })}
                  </Text>
                  <Text style={[{ color: t.accent, fontSize: f.body, fontWeight: '900', flexShrink: 0 }]}>{me?.score ?? 0}</Text>
                </View>
              </View>
            </View>
          );
        })()}

        <View style={styles.actions}>
          {/* Реванш — приоритет UI: входящий offer → баннер с принять/отказаться;
              исходящий pending → плашка ожидания; иначе — кнопка «Реванш». */}
          {!isMockSession && !isForfeited && !opponentSurrendered && rematchPending && isRematchTarget && (
            <View style={[styles.rematchBanner, { backgroundColor: t.bgCard, borderColor: t.gold }]}>
              <Text style={[{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginBottom: 8 }]}>
                🥊 {rematchOffer?.byName ?? triLang(lang, {
                  ru: 'Соперник',
                  uk: 'Суперник',
                  es: 'Rival',
                  'pt-BR': "Rival",
                  vi: "Đối thủ",
                  id: "Lawan",
                  tr: "Rakip",
                  pl: "Rywal",
                })}{' '}
                {triLang(lang, {
                  ru: 'хочет реванш',
                  uk: 'хоче реванш',
                  es: 'pide revancha',
                  'pt-BR': "pede revanche",
                  vi: "muốn tái đấu",
                  id: "meminta rematch",
                  tr: "rövanş istiyor",
                  pl: "prosi o rewanż",
                })}
              </Text>
              {rematchSecsLeft != null && (
                <Text style={[{ color: t.textMuted, fontSize: f.caption, marginBottom: 10 }]}>
                  {triLang(lang, {
                    ru: `Осталось ${rematchSecsLeft}с`,
                    uk: `Залишилось ${rematchSecsLeft} с`,
                    es:
                      rematchSecsLeft === 1
                        ? `Te queda ${rematchSecsLeft} s`
                        : `Te quedan ${rematchSecsLeft} s`,
                    'pt-BR': rematchSecsLeft === 1 ? `Resta ${rematchSecsLeft} s` : `Restam ${rematchSecsLeft} s`,
                    vi: `Còn ${rematchSecsLeft} giây`,
                    id: `Tersisa ${rematchSecsLeft} dtk`,
                    tr: `${rematchSecsLeft} sn kaldı`,
                    pl: `Zostało ${rematchSecsLeft} s`,
                  })}
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={handleRematchAccept} activeOpacity={0.85} style={{ flex: 1 }}>
                  <LinearGradient
                    colors={[t.correct, t.correct + 'BB']}
                    style={styles.rematchBtn}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <Text style={[styles.rematchText, { color: t.correctText, fontSize: f.body }]}>
                      {triLang(lang, {
                        uk: '⚔️ Прийняти',
                        ru: '⚔️ Принять',
                        es: '⚔️ Aceptar',
                        'pt-BR': "⚔️ Aceitar",
                        vi: "⚔️ Chấp nhận",
                        id: "⚔️ Terima",
                        tr: "⚔️ Kabul et",
                        pl: "⚔️ Akceptuj",
                      })}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.homeBtn, { flex: 1, borderColor: t.border, height: 60 }]}
                  onPress={handleRematchDecline}
                  activeOpacity={0.8}
                >
                  <Text style={[{ color: t.textMuted, fontSize: f.body, fontWeight: '600' }]}>
                    {triLang(lang, {
                      ru: 'Отказаться',
                      uk: 'Відмовитися',
                      es: 'Rechazar',
                      'pt-BR': "Recusar",
                      vi: "Từ chối",
                      id: "Tolak",
                      tr: "Reddet",
                      pl: "Odrzuć",
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!isMockSession && !isForfeited && !opponentSurrendered && rematchPending && isRematchInitiator && (
            <View style={[styles.rematchBtn, { backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.border }]}>
              <Ionicons name="time-outline" size={20} color={t.textMuted} />
              <Text style={[styles.rematchText, { color: t.textMuted, fontSize: f.h2 }]}>
                {triLang(lang, {
                  ru: 'Реванш отправлен',
                  uk: 'Реванш надіслано',
                  es: 'Revancha enviada',
                  'pt-BR': "Revanche enviada",
                  vi: "Đã gửi lời tái đấu",
                  id: "Rematch dikirim",
                  tr: "Rövanş gönderildi",
                  pl: "Rewanż wysłany",
                })}
                {rematchSecsLeft != null ? ` ${rematchSecsLeft}${triLang(lang, {
                  ru: 'с',
                  uk: ' с',
                  es: ' s',
                  'pt-BR': " s",
                  vi: " giây",
                  id: " dtk",
                  tr: " sn",
                  pl: " s",
                })}` : ''}
              </Text>
            </View>
          )}

          {!rematchPending && (
            isMockSession ? (
              <TouchableOpacity onPress={() => router.replace({ pathname: '/(tabs)/arena' as any, params: { autoSearch: '1', playAgainTs: String(Date.now()) } })} activeOpacity={0.85}>
                <LinearGradient
                  colors={[t.accent, t.accent + 'BB']}
                  style={styles.rematchBtn}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="flash" size={20} color={t.correctText} />
                  <Text style={[styles.rematchText, { color: t.correctText, fontSize: f.h2 }]}>
                    {triLang(lang, {
                      uk: 'Ще раз!',
                      ru: 'Ещё раз!',
                      es: '¡Otra vez!',
                      'pt-BR': "Mais uma!",
                      vi: "Lại lần nữa!",
                      id: "Sekali lagi!",
                      tr: "Bir daha!",
                      pl: "Jeszcze raz!",
                    })}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : !isForfeited && !opponentSurrendered ? (
              <TouchableOpacity onPress={handleRematchOffer} activeOpacity={0.85}>
                <LinearGradient
                  colors={[t.accent, t.accent + 'BB']}
                  style={styles.rematchBtn}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="flash" size={20} color={t.correctText} />
                  <Text style={[styles.rematchText, { color: t.correctText, fontSize: f.h2 }]}>
                    {triLang(lang, {
                      ru: '🥊 Реванш',
                      uk: '🥊 Реванш',
                      es: '🥊 Revancha',
                      'pt-BR': "🥊 Revanche",
                      vi: "🥊 Tái đấu",
                      id: "🥊 Rematch",
                      tr: "🥊 Rövanş",
                      pl: "🥊 Rewanż",
                    })}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => router.replace({ pathname: '/(tabs)/arena' as any, params: { autoSearch: '1', playAgainTs: String(Date.now()) } })} activeOpacity={0.85}>
                <LinearGradient
                  colors={[t.accent, t.accent + 'BB']}
                  style={styles.rematchBtn}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="flash" size={20} color={t.correctText} />
                  <Text style={[styles.rematchText, { color: t.correctText, fontSize: f.h2 }]}>
                    {triLang(lang, {
                      ru: 'Ещё раз!',
                      uk: 'Ще раз!',
                      es: '¡Otra vez!',
                      'pt-BR': "Mais uma!",
                      vi: "Lại lần nữa!",
                      id: "Sekali lagi!",
                      tr: "Bir daha!",
                      pl: "Jeszcze raz!",
                    })}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )
          )}

          {isRoomRun && (
            <TouchableOpacity
              style={[styles.homeBtn, { borderColor: t.accent, backgroundColor: t.accentBg }]}
              onPress={() => router.replace({ pathname: '/arena_room' as any, params: { code: cleanRoomCode } })}
              activeOpacity={0.8}
            >
              <Text style={[{ color: t.accent, fontSize: f.body, fontWeight: '700' }]}>
                {triLang(lang, {
                  ru: `Назад в комнату ${cleanRoomCode}`,
                  uk: `Назад у кімнату ${cleanRoomCode}`,
                  es: `Volver a la sala ${cleanRoomCode}`,
                  'pt-BR': `Voltar para a sala ${cleanRoomCode}`,
                  vi: `Quay lại phòng ${cleanRoomCode}`,
                  id: `Kembali ke room ${cleanRoomCode}`,
                  tr: `${cleanRoomCode} odasına dön`,
                  pl: `Wróć do pokoju ${cleanRoomCode}`,
                })}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.homeBtn, { borderColor: t.border }]}
            onPress={async () => { await cancelMyPendingIfAny(); router.replace('/(tabs)/arena' as any); }}
            activeOpacity={0.8}
          >
            <Text style={[{ color: t.textMuted, fontSize: f.body, fontWeight: '600' }]}>
              {triLang(lang, {
                ru: 'В Арену',
                uk: 'На Арену',
                es: 'Ir a la Arena',
                'pt-BR': "Ir para a Arena",
                vi: "Vào Đấu trường",
                id: "Ke Arena",
                tr: "Arenaya git",
                pl: "Idź na Arenę",
              })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.homeBtn, { borderColor: t.border, marginTop: 4 }]}
            onPress={async () => { await cancelMyPendingIfAny(); router.replace('/(tabs)/home' as any); }}
            activeOpacity={0.8}
          >
            <Text style={[{ color: t.textMuted, fontSize: f.body, fontWeight: '600' }]}>
              {triLang(lang, {
                ru: '🏠 На главную',
                uk: '🏠 На головну',
                es: '🏠 Volver al inicio',
                'pt-BR': "🏠 Voltar ao início",
                vi: "🏠 Về trang chính",
                id: "🏠 Kembali ke beranda",
                tr: "🏠 Ana ekrana dön",
                pl: "🏠 Wróć na start",
              })}
            </Text>
          </TouchableOpacity>

          {reviewItems.length > 0 && (
            <TouchableOpacity
              style={[styles.homeBtn, { borderColor: t.border, marginTop: 4 }]}
              onPress={() => setShowReview(true)}
              activeOpacity={0.8}
            >
              <Text style={[{ color: t.textMuted, fontSize: f.body, fontWeight: '600' }]}>
                {triLang(lang, {
                  ru: '📖 Разбор вопросов',
                  uk: '📖 Розбір питань',
                  es: '📖 Repaso de preguntas',
                  'pt-BR': "📖 Revisão de perguntas",
                  vi: "📖 Ôn lại câu hỏi",
                  id: "📖 Tinjauan pertanyaan",
                  tr: "📖 Soru tekrarı",
                  pl: "📖 Powtórka pytań",
                })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Модалка разбора вопросов */}
      <Modal
        visible={showReview}
        animationType="slide"
        onRequestClose={() => setShowReview(false)}
        statusBarTranslucent
        transparent
      >
        <ScreenGradient forceFullBleed style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 12, gap: 12 }}>
            <TouchableOpacity activeOpacity={0.75} onPress={() => setShowReview(false)}>
              <Ionicons name="close" size={24} color={sx.primary} />
            </TouchableOpacity>
            <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '700' }}>
              {triLang(lang, {
                uk: 'Розбір питань',
                ru: 'Разбор вопросов',
                es: 'Repaso de preguntas',
                'pt-BR': "Revisão de perguntas",
                vi: "Ôn lại câu hỏi",
                id: "Tinjauan pertanyaan",
                tr: "Soru tekrarı",
                pl: "Powtórka pytań",
              })}
            </Text>
          </View>
          <ScrollView decelerationRate="normal" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
            {reviewItems.map((item, idx) => {
              const isRight = item.myAnswer === item.correct;
              return (
                <View key={idx} style={[styles.reviewCard, { backgroundColor: t.bgCard, borderColor: isRight ? t.correct : t.wrong }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', flex: 1 }}>
                      {idx + 1}. {item.question}
                    </Text>
                    <ReportErrorButton
                      variant="icon-flag"
                      screen="arena_results_review"
                      dataId={item.questionId ? `arena_q_${item.questionId}` : `arena_q_slot_${idx}`}
                      dataText={buildArenaReviewReportText(item, idx)}
                      accessibilityLabel={triLang(lang, {
                        ru: 'Сообщить об ошибке в этом вопросе Арены',
                        uk: 'Повідомити про помилку в цьому питанні Арени',
                        es: 'Informar de un fallo en esta pregunta de la Arena',
                        'pt-BR': "Informar um erro nesta pergunta da Arena",
                        vi: "Báo lỗi trong câu hỏi Đấu trường này",
                        id: "Laporkan kesalahan pada pertanyaan Arena ini",
                        tr: "Bu Arena sorusunda hata bildir",
                        pl: "Zgłoś błąd w tym pytaniu Areny",
                      })}
                    />
                  </View>
                  {item.options.map((opt, oi) => {
                    const isCorrectOpt = opt === item.correct;
                    const isMyWrong = opt === item.myAnswer && !isCorrectOpt;
                    return (
                      <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text style={{ fontSize: 14, color: isCorrectOpt ? t.correct : isMyWrong ? t.wrong : t.textMuted }}>
                          {isCorrectOpt ? '✓' : isMyWrong ? '✗' : '·'}
                        </Text>
                        <Text style={{ color: isCorrectOpt ? t.correct : isMyWrong ? t.wrong : t.textMuted, fontSize: f.caption, flex: 1 }}>
                          {arenaBilingualFirst(opt, lang)}
                        </Text>
                      </View>
                    );
                  })}
                  {item.rule ? (
                    <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 8, fontStyle: 'italic' }}>
                      {arenaBilingualFirst(item.rule, lang)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        </ScreenGradient>
      </Modal>

      {showRatingModal && ratingVariant && (
        <ArenaRatingModal
          variant={ratingVariant}
          t={t}
          f={f}
          lang={lang}
          onClose={() => setShowRatingModal(false)}
        />
      )}

      {!!rankCinematic && (
        <RankChangeModal
          visible={true}
          promoted={rankCinematic.promoted}
          tier={rankCinematic.newTier}
          level={rankCinematic.newLevel}
          accentColor={TIER_COLORS[rankCinematic.newTier] ?? t.accent}
          onClose={() => setRankCinematic(null)}
        />
      )}
    </ScreenGradient>
  );
}

function ArenaRatingModal({ variant, t, f, lang, onClose }: {
  variant: ReviewVariant; t: any; f: any; lang: Lang; onClose: () => void;
}) {
  const [step, setStep] = useState<'ask' | 'thanks'>('ask');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(60)).current;
  const { bottom } = useSafeAreaInsets();

  useEffect(() => {
    const intro = Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(sheetY, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }),
    ]);
    intro.start();
    return () => intro.stop();
  }, [fadeAnim, sheetY]);

  const handleYes = async () => {
    try {
      await markReviewRated();
      setStep('thanks');
      await requestNativeReview();
      setTimeout(onClose, 1500);
    } catch {
      onClose();
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Окно оценки не открывается. Попробуй снова.',
        messageUk: 'Не вдалося відкрити вікно оцінки.',
        messageEs: 'No se ha podido abrir la valoración.',
      });
    }
  };

  const handleNo = async () => {
    try {
      await markReviewPrompted();
    } finally {
      onClose();
    }
  };

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent onRequestClose={handleNo}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', opacity: fadeAnim }}>
        <Pressable style={{ flex: 1 }} onPress={handleNo} />
        <Animated.View
          style={{
            backgroundColor: t.bgCard,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            padding: 28,
            paddingBottom: Math.max(40, bottom + 20),
            borderTopWidth: 0.5,
            borderColor: t.border,
            alignItems: 'center',
            transform: [{ translateY: sheetY }],
          }}
        >
          {step === 'ask' ? (
            <>
              <Text style={{ fontSize: 48, marginBottom: 12 }} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.7}>{variant.emoji}</Text>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
                {variant.title}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginBottom: 28, lineHeight: f.body * 1.5 }}>
                {variant.subtitle}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12, width: '100%' }}>
                <TouchableOpacity
                  style={{ flex: 1, minHeight: 52, backgroundColor: t.bgSurface, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: t.border }}
                  onPress={handleNo}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '600', textAlign: 'center' }}>{variant.btnNo}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, minHeight: 52, backgroundColor: t.correct, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' }}
                  onPress={handleYes}
                  activeOpacity={0.88}
                >
                  <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800', textAlign: 'center' }} numberOfLines={2}>
                    {variant.btnYes} ?
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 52, marginBottom: 12 }} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.7}>??</Text>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center' }}>
                {triLang(lang, {
                  ru: 'Спасибо!',
                  uk: 'Дякуємо!',
                  es: '¡Gracias!',
                  'pt-BR': "Obrigado!",
                  vi: "Cảm ơn!",
                  id: "Terima kasih!",
                  tr: "Teşekkürler!",
                  pl: "Dziękujemy!",
                })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 8 }}>
                {triLang(lang, {
                  ru: 'Для нас это очень важно.',
                  uk: 'Це для нас дуже важливо.',
                  es: 'Para nosotros significa muchísimo.',
                  'pt-BR': "Isso significa muito para nós.",
                  vi: "Điều đó có ý nghĩa rất lớn với chúng tôi.",
                  id: "Itu sangat berarti bagi kami.",
                  tr: "Bu bizim için çok değerli.",
                  pl: "To dla nas bardzo dużo znaczy.",
                })}
              </Text>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 16, paddingTop: 60, paddingBottom: 40 },
  topBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -4,
  },

  resultCard: {
    borderRadius: 24, borderWidth: 1.5,
    padding: 28, alignItems: 'center', gap: 4,
    overflow: 'hidden',
  },
  shardFlyOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  flyXpChip: {
    minWidth: 140,
    height: 76,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(22,22,22,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,214,102,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  flyXpText: {
    color: '#FFD666',
    fontSize: 24,
    fontWeight: '900',
  },
  resultEmoji: { fontSize: 56, marginBottom: 4 },
  resultTitle: { fontWeight: '800' },
  myScore: { fontWeight: '900', lineHeight: 52 },
  myScoreLabel: { marginTop: -4 },
  hillResultBadge: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
  },
  hillResultText: {
    flex: 1,
    minWidth: 0,
    fontWeight: '800',
    textAlign: 'center',
  },
  clubWarBadge: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
  },
  clubWarText: {
    flex: 1,
    minWidth: 0,
    fontWeight: '800',
    textAlign: 'center',
  },
  rewards: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 16, rowGap: 12, marginTop: 16,
    paddingTop: 16, paddingHorizontal: 8, paddingBottom: 4, borderTopWidth: 1, width: '100%',
    justifyContent: 'center', alignItems: 'center',
  },
  rewardItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  rankDock: {
    position: 'absolute',
    right: 14,
    top: 12,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(14,14,14,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankDockImage: {
    width: 46,
    height: 46,
  },
  leaderboard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  leaderboardTitle: {
    paddingHorizontal: 16, paddingVertical: 10, fontWeight: '600', textTransform: 'uppercase',
  },
  leaderboardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1,
    minWidth: 0,
  },
  breakdown: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },
  breakdownRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    gap: 8, minWidth: 0,
  },
  reviewCard: { borderRadius: 16, borderWidth: 1.5, padding: 14 },
  medal: { fontSize: 18, width: 28, textAlign: 'center' },
  playerName: { fontWeight: '600', flex: 1, flexShrink: 1, minWidth: 0 },
  playerFinalScore: { fontWeight: '800' },
  leaderboardScoreCol: { alignItems: 'flex-end', flexShrink: 0, marginLeft: 4 },

  actions: { gap: 10 },
  rematchBtn: {
    borderRadius: 18, height: 60,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  rematchText: { fontWeight: '800' },
  rematchBanner: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 6,
  },
  homeBtn: {
    borderRadius: 18, height: 52, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
